#!/usr/bin/env python3
"""
ARK Router V2: Interactive Local Virtual Server (OpenWrt & LuCI RPC Emulation)
Serves the live V2 dashboard and fully simulates OpenWrt LuCI backend & RPC/ubus calls.
"""

import os
import sys
import json
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8088
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
WORKSPACE_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", ".."))

# Realistic OpenWrt ubus / RPC Mock Database
UBUS_DATA = {
    "system.info": {
        "uptime": 1239842,
        "localtime": int(time.time()),
        "load": [1520, 1180, 840],
        "memory": {
            "total": 536870912,
            "free": 369098752,
            "shared": 16384,
            "buffered": 24576000
        },
        "swap": {
            "total": 134217728,
            "free": 134217728
        }
    },
    "system.board": {
        "kernel": "6.6.54",
        "hostname": "OpenWrt",
        "system": "ARMv8 Cortex-A53",
        "model": "Acer Predator Connect W6x",
        "board_name": "acer,predator-connect-w6x",
        "release": {
            "distribution": "OpenWrt",
            "version": "24.10.0",
            "revision": "r27208-8e6d2bc61e",
            "target": "mediatek/filogic",
            "description": "OpenWrt 24.10.0 r27208-8e6d2bc61e"
        }
    },
    "network.interface.dump": {
        "interface": [
            {
                "interface": "lan",
                "up": True,
                "device": "br-lan",
                "ipv4-address": [{"address": "192.168.73.1", "mask": 24}],
                "ipv6-address": [{"address": "fd73:ark::1", "mask": 64}],
                "uptime": 1239842,
                "data": {"rx_bytes": 84210984, "tx_bytes": 112894012}
            },
            {
                "interface": "wan",
                "up": True,
                "device": "pppoe-wan",
                "proto": "pppoe",
                "ipv4-address": [{"address": "100.64.12.89", "mask": 32}],
                "gateway": "100.64.12.1",
                "dns-server": ["1.1.1.1", "8.8.8.8"],
                "uptime": 1239842,
                "data": {"rx_bytes": 245109840, "tx_bytes": 68402910}
            },
            {
                "interface": "wan6",
                "up": True,
                "device": "pppoe-wan",
                "proto": "dhcpv6",
                "ipv6-address": [{"address": "2804:3d90:8234:5600::1", "mask": 64}],
                "ipv6-prefix": [{"address": "2804:3d90:8234:5600::", "mask": 56}],
                "uptime": 1239840
            },
            {
                "interface": "wan2",
                "up": True,
                "device": "eth1",
                "proto": "dhcp",
                "ipv4-address": [{"address": "192.168.15.50", "mask": 24}],
                "gateway": "192.168.15.1",
                "dns-server": ["192.168.15.1"],
                "uptime": 842100
            }
        ]
    },
    "luci.ark.system": {
        "profile": "full",
        "cpu_usage": 8,
        "temperature": 48.5,
        "ram_used_mb": 146,
        "ram_total_mb": 512,
        "flash_used_mb": 28.4,
        "flash_total_mb": 128.0,
        "dns_cache_size": 150000,
        "dns_cache_entries": 18420
    },
    "luci.ark.doctor": {
        "status": "healthy",
        "total_checks": 24,
        "passed": 24,
        "warnings": 0,
        "errors": 0,
        "fixed": 0,
        "last_audit": "2026-10-15 02:40:00"
    }
}

class V2StagingHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WORKSPACE_ROOT, **kwargs)

    def end_headers(self):
        # Enable CORS for local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Requested-With')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        # Handle Root & V2 aliases
        if self.path in ['/', '/index.html', '/v2', '/v2/']:
            self.send_response(302)
            self.send_header('Location', '/docs/qa_screenshots/v2_staging/index.html')
            self.end_headers()
            return

        # Handle LuCI routes
        if self.path.startswith('/cgi-bin/luci'):
            subpath = self.path[len('/cgi-bin/luci'):].lstrip('/')
            target = f'/docs/qa_screenshots/v2_staging/index.html?route={subpath}' if subpath else '/docs/qa_screenshots/v2_staging/index.html'
            self.send_response(302)
            self.send_header('Location', target)
            self.end_headers()
            return

        super().do_GET()

    def do_POST(self):
        # Handle OpenWrt ubus / JSON-RPC
        if self.path in ['/cgi-bin/luci/rpc/ubus', '/ubus']:
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                req = json.loads(post_data.decode('utf-8'))
            except Exception:
                req = {}

            def process_single(r):
                req_id = r.get("id", 1)
                method = r.get("method", "call")
                params = r.get("params", [])
                
                # Default response
                res_obj = {"jsonrpc": "2.0", "id": req_id, "result": [0, {}]}
                
                if method == "login":
                    res_obj["result"] = [0, {"ubus_rpc_session": "a1b2c3d4e5f60718293a4b5c6d7e8f90", "expires": 3600}]
                elif method == "access":
                    res_obj["result"] = [0, {"access": True}]
                elif method == "call" and len(params) >= 3:
                    obj = params[1]
                    func = params[2]
                    call_key = f"{obj}.{func}" if f"{obj}.{func}" in UBUS_DATA else obj
                    if call_key in UBUS_DATA:
                        res_obj["result"] = [0, UBUS_DATA[call_key]]
                    elif obj in UBUS_DATA:
                        res_obj["result"] = [0, UBUS_DATA[obj]]
                    else:
                        res_obj["result"] = [0, {"status": "ok", "message": f"Simulated call {obj}->{func}"}]
                return res_obj

            if isinstance(req, list):
                res = [process_single(item) for item in req]
            else:
                res = process_single(req)

            res_bytes = json.dumps(res, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(res_bytes)))
            self.end_headers()
            self.wfile.write(res_bytes)
            return

        self.send_response(404)
        self.end_headers()

def run(port=PORT):
    server_address = ('', port)
    httpd = HTTPServer(server_address, V2StagingHandler)
    print("=" * 70)
    print(f"🚀 ARK Router V2 — Servidor Virtual OpenWrt & Staging Ativo na Porta {port}")
    print(f"👉 Acesso Web Dashboard:  http://localhost:{port}/")
    print(f"👉 LuCI RPC ubus endpoint: http://localhost:{port}/cgi-bin/luci/rpc/ubus")
    print("=" * 70)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
    print("Servidor virtual encerrado.")

if __name__ == '__main__':
    p = int(sys.argv[1]) if len(sys.argv) > 1 else PORT
    run(p)
