#!/usr/bin/env python3
"""
ARK Router V2: Interactive Local Staging Server (macOS)
Serves the live emulated V2 dashboard with real Canvas 2D charts and mobile-first responsiveness.
"""

import os
import sys
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8088
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# REPO_DIR = /Volumes/--400GB--/FEITOS COM IA/Ark-Router/GitHub/luci-app-ark-router
# WORKSPACE_ROOT = /Volumes/--400GB--/FEITOS COM IA/Ark-Router
WORKSPACE_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))

class V2StagingHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WORKSPACE_ROOT, **kwargs)

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        if self.path in ['/', '/index.html', '/v2', '/v2/']:
            self.send_response(302)
            self.send_header('Location', '/docs/qa_screenshots/v2_staging/index.html')
            self.end_headers()
            return
        super().do_GET()

def run(port=PORT):
    server_address = ('', port)
    httpd = HTTPServer(server_address, V2StagingHandler)
    print("=" * 65)
    print(f"🚀 ARK Router V2 — Servidor de Staging Emulado Ativo na Porta {port}")
    print(f"👉 Acesse no seu navegador: http://localhost:{port}/")
    print("=" * 65)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print("Servidor encerrado.")

if __name__ == '__main__':
    p = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run(p)
