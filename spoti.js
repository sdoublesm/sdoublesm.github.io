/**
 * Spotify Now / Recently Played Widget
 * Fetches real-time Spotify status from your secure serverless proxy.
 */

// Sostituisci questo URL con l'endpoint del tuo Cloudflare Worker o Vercel Function
// Esempio: 'https://spotify-proxy.tuonome.workers.dev' oppure 'https://tuo-progetto.vercel.app/api/spotify'
const SPOTIFY_API_URL = 'https://misty-silence-22e4.tenoremirko.workers.dev';

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(isoString) {
    if (!isoString) return '';
    try {
        const d = new Date(isoString);
        if (isNaN(d.getTime())) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[d.getMonth()];
        const day = d.getDate();
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${month} ${day}, ${year} at ${hours}:${minutes}`;
    } catch {
        return '';
    }
}

async function updateSpotifyStatus() {
    const output = document.getElementById('output');
    if (!output) return;

    // Se l'URL non è ancora configurato, mostra solo i puntini
    if (!SPOTIFY_API_URL) {
        output.innerHTML = `<span class="spoti_loading">...</span>`;
        return;
    }

    try {
        const response = await fetch(SPOTIFY_API_URL, {
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('[Spotify widget] data ricevuta:', data);

        if (data.error || !data.title) {
            output.innerHTML = `<span class="spoti_loading">...</span>`;
            return;
        }

        const titleEscaped = escapeHtml(data.title);
        const artistEscaped = escapeHtml(data.artist || 'Unknown Artist');
        const trackLink = data.url
            ? `<a href="${data.url}" target="_blank" rel="noopener noreferrer" class="spoti_track">'${titleEscaped}'</a>`
            : `'${titleEscaped}'`;

        if (data.isPlaying) {
            output.innerHTML = `${trackLink} <br>by ${artistEscaped}<br><span class="spoti_live">• playing now on spotify</span>`;
        } else {
            const timeString = formatDate(data.playedAt);
            const dateHtml = timeString ? `<br>on ${timeString}` : '';
            console.log(timeString)
            output.innerHTML = `listened ${trackLink} <br>by ${artistEscaped}${dateHtml}`;
        }

    } catch (err) {
        console.warn('Spotify fetch error:', err);
        output.innerHTML = `<span class="spoti_loading">...</span>`;
    }
}

// Avvia il caricamento quando il DOM è pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateSpotifyStatus);
} else {
    updateSpotifyStatus();
}
