/**
 * Spotify Proxy - Cloudflare Worker
 * 
 * Secure proxy to fetch currently playing or recently played tracks from Spotify.
 * Keeps your client_id, client_secret and refresh_token safe in Cloudflare environment variables.
 * 
 * Required Environment Variables (set in Cloudflare dashboard or wrangler.toml):
 * - SPOTIFY_CLIENT_ID
 * - SPOTIFY_CLIENT_SECRET
 * - SPOTIFY_REFRESH_TOKEN
 */

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_ENDPOINT = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
  'Content-Type': 'application/json; charset=utf-8'
};

async function getAccessToken(env) {
  const basic = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
  
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: env.SPOTIFY_REFRESH_TOKEN
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Token refresh failed with status ${response.status}: ${errorText}`);
  }

  return response.json();
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET || !env.SPOTIFY_REFRESH_TOKEN) {
      return new Response(JSON.stringify({
        error: 'Missing environment variables: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REFRESH_TOKEN'
      }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }

    try {
      const { access_token } = await getAccessToken(env);

      // 1. Check if user is currently playing a track
      const nowPlayingRes = await fetch(NOW_PLAYING_ENDPOINT, {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      if (nowPlayingRes.status === 200) {
        const item = await nowPlayingRes.json();
        if (item && item.item) {
          return new Response(JSON.stringify({
            isPlaying: item.is_playing ?? true,
            title: item.item.name,
            artist: item.item.artists.map(a => a.name).join(', '),
            url: item.item.external_urls?.spotify || null,
            albumArt: item.item.album?.images?.[0]?.url || null,
            playedAt: null
          }), { headers: CORS_HEADERS });
        }
      }

      // 2. If nothing currently playing, fetch the most recent track
      const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
        headers: { Authorization: `Bearer ${access_token}` }
      });

      if (recentRes.status === 200) {
        const data = await recentRes.json();
        if (data.items && data.items.length > 0) {
          const track = data.items[0].track;
          return new Response(JSON.stringify({
            isPlaying: false,
            title: track.name,
            artist: track.artists.map(a => a.name).join(', '),
            url: track.external_urls?.spotify || null,
            albumArt: track.album?.images?.[0]?.url || null,
            playedAt: data.items[0].played_at
          }), { headers: CORS_HEADERS });
        }
      }

      // No tracks found
      return new Response(JSON.stringify({
        isPlaying: false,
        title: null,
        artist: null,
        url: null,
        playedAt: null
      }), { headers: CORS_HEADERS });

    } catch (err) {
      return new Response(JSON.stringify({
        error: err.message || 'Internal server error'
      }), {
        status: 500,
        headers: CORS_HEADERS
      });
    }
  }
};

