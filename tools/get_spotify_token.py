"""
Spotify Refresh Token Generator
Helper script to generate a valid refresh token with the required scopes:
- user-read-recently-played
- user-read-currently-playing

Usage:
  python tools/get_spotify_token.py
"""

import http.server
import socketserver
import urllib.parse
import urllib.request
import base64
import json
import webbrowser
import sys
import ssl

PORT = 8888
REDIRECT_URI = f"http://127.0.0.1:{PORT}/callback"
SCOPES = "user-read-recently-played user-read-currently-playing"

client_id = ""
client_secret = ""
auth_code = None

class OAuthHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silence standard HTTP access logs
        return

    def do_GET(self):
        global auth_code
        parsed_url = urllib.parse.urlparse(self.path)
        
        if parsed_url.path == "/callback":
            query_params = urllib.parse.parse_qs(parsed_url.query)
            if "code" in query_params:
                auth_code = query_params["code"][0]
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"<h1>Autenticazione completata con successo!</h1><p>Puoi tornare al terminale.</p>")
            else:
                error = query_params.get("error", ["Unknown error"])[0]
                self.send_response(400)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(f"<h1>Errore di autenticazione:</h1><p>{error}</p>".encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

def main():
    global client_id, client_secret
    print("=" * 60)
    print(" Spotify Refresh Token Generator")
    print("=" * 60)
    print("\nAssicurati di aver aggiunto il seguente Redirect URI nella tua app su")
    print("Spotify Developer Dashboard (https://developer.spotify.com/dashboard):")
    print(f"  -> {REDIRECT_URI}\n")

    client_id = input("Inserisci il tuo Client ID Spotify: ").strip()
    if not client_id:
        print("Client ID non puo' essere vuoto.")
        sys.exit(1)

    client_secret = input("Inserisci il tuo Client Secret Spotify: ").strip()
    if not client_secret:
        print("Client Secret non puo' essere vuoto.")
        sys.exit(1)

    auth_url = (
        "https://accounts.spotify.com/authorize?"
        + urllib.parse.urlencode({
            "client_id": client_id,
            "response_type": "code",
            "redirect_uri": REDIRECT_URI,
            "scope": SCOPES,
        })
    )

    print("\nApertura del browser per l'autorizzazione...")
    print(f"Se il browser non si apre, visita questo link:\n{auth_url}\n")
    webbrowser.open(auth_url)

    # Avvia il server temporaneo in attesa della callback
    with socketserver.TCPServer(("", PORT), OAuthHandler) as httpd:
        print(f"In attesa della risposta di Spotify su http://127.0.0.1:{PORT}...")
        while auth_code is None:
            httpd.handle_request()

    print("\nCodice di autorizzazione ricevuto! Richiesta del refresh token in corso...")

    # Scambia il codice per il refresh_token
    token_url = "https://accounts.spotify.com/api/token"
    basic_auth = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode("utf-8")
    
    data = urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "code": auth_code,
        "redirect_uri": REDIRECT_URI,
    }).encode("utf-8")

    req = urllib.request.Request(
        token_url,
        data=data,
        headers={
            "Authorization": f"Basic {basic_auth}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    try:
        # Crea un context SSL permissivo per aggirare certificati mancanti su Windows/MSYS2
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE

        with urllib.request.urlopen(req, context=ctx) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            refresh_token = res_data.get("refresh_token")
            access_token = res_data.get("access_token")

            print("\n" + "=" * 60)
            print(" SUCCESS! REFRESH TOKEN GENERATO:")
            print("=" * 60)
            print(f"\nREFRESH_TOKEN:\n{refresh_token}\n")
            print("=" * 60)
            print("Salva questo refresh_token insieme a CLIENT_ID e CLIENT_SECRET")
            print("nelle variabili d'ambiente del tuo Cloudflare Worker o Vercel Function.")
            print("NON committare MAI questi valori su GitHub!")
            print("=" * 60)
    except urllib.error.HTTPError as e:
        print(f"\nErrore durante lo scambio del token ({e.code}): {e.read().decode('utf-8')}")
        sys.exit(1)

if __name__ == "__main__":
    main()

