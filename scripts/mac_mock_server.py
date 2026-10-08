import os
import json
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8080
REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WWW_DIR = os.path.join(REPO_DIR, "root", "www")

class MockLuciHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WWW_DIR, **kwargs)

    def do_POST(self):
        if self.path == '/cgi-bin/luci/rpc/ubus':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            req = json.loads(post_data)
            
            # Very basic mock response for ubus
            res = {
                "jsonrpc": "2.0",
                "id": req.get("id", 1),
                "result": [0, {"features": {"language": "pt-br"}}]
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(res).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=HTTPServer, handler_class=MockLuciHandler):
    server_address = ('', PORT)
    httpd = server_class(server_address, handler_class)
    print(f"✅ Mac Local Mock Server rodando na porta {PORT}...")
    print(f"Abra no navegador: http://localhost:{PORT}/luci-static/resources/view/equipe-dashboard/overview.js")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print("Servidor encerrado.")

if __name__ == '__main__':
    run()
