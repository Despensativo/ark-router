#!/usr/bin/env python3
"""
ARK Router: Teste Visual e Validação do Seletor de Potência no Assistente de Roteador Secundário.
"""

import os
import sys
import time
import json
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

ARTIFACT_DIR = "/Users/user/.gemini/antigravity/brain/c153d342-617a-468f-9d1c-3ff51183f705"
os.makedirs(ARTIFACT_DIR, exist_ok=True)
SCREENSHOT_PATH = os.path.join(ARTIFACT_DIR, "satellite_wizard_txpower.png")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

class MockHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.join(REPO_DIR, "root", "www"), **kwargs)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        res = {"jsonrpc": "2.0", "id": 1, "result": [0, {}]}
        res_bytes = json.dumps(res).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(res_bytes)))
        self.end_headers()
        self.wfile.write(res_bytes)

def run_test():
    port = 8765
    server = HTTPServer(('', port), MockHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    print(f"Mock server running on port {port}")

    console_errors = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 960})
        page = context.new_page()

        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(f"[pageerror] {exc}"))

        # Cria uma página HTML mínima que carrega os estilos e o bundle do ARK
        test_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="http://localhost:{port}/luci-static/ark/cascade.css">
    <style>
        body {{ background: #0b1120; color: #f8fafc; font-family: system-ui, sans-serif; padding: 20px; }}
        #modal-container {{ max-width: 780px; margin: 0 auto; }}
    </style>
</head>
<body>
    <div id="modal-container"></div>
    <script>
        window.L = {{
            bind: function(fn, ctx) {{ return fn.bind(ctx); }}
        }};
        window._t = function(s) {{ return s; }};
        window.E = function(tag, attrs, children) {{
            var el = document.createElement(tag);
            if (attrs) {{
                for (var k in attrs) {{
                    if (k === 'class') el.className = attrs[k];
                    else if (k.startsWith('on') || typeof attrs[k] === 'function') el.addEventListener(k.replace(/^on/, ''), attrs[k]);
                    else if (k === 'click') el.addEventListener('click', attrs[k]);
                    else el.setAttribute(k, attrs[k]);
                }}
            }}
            if (children) {{
                if (!Array.isArray(children)) children = [children];
                children.forEach(function(c) {{
                    if (c === null || c === undefined) return;
                    if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(c));
                    else if (c.nodeType) el.appendChild(c);
                }});
            }}
            return el;
        }};
        window.ui = {{
            showModal: function(title, body) {{
                var container = document.getElementById('modal-container');
                container.innerHTML = '<div class="cbi-modal" style="background: #1e293b; border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.1);"><h3 style="margin-top:0; color:#38bdf8; font-size: 17px;">' + title + '</h3><div id="modal-body"></div></div>';
                var mb = document.getElementById('modal-body');
                if (Array.isArray(body)) {{
                    body.forEach(function(el) {{ if (el && el.nodeType) mb.appendChild(el); }});
                }} else if (body && body.nodeType) {{
                    mb.appendChild(body);
                }}
            }},
            hideModal: function() {{}},
            addNotification: function() {{}}
        }};
        window.fs = {{
            exec: function(cmd, args) {{
                if (args && args[0] === 'wifi-mesh-satellite-discover') {{
                    return Promise.resolve({{
                        code: 0,
                        stdout: JSON.stringify({{
                            ok: true,
                            gateway: "192.168.73.1",
                            reachable: true,
                            current_lan_ip: "192.168.73.2",
                            suggested_sat_ip: "192.168.73.2",
                            local_mac: "70:5A:6F:50:61:77",
                            current_role: "master",
                            ssid_2g: "CASA_ARK",
                            key_2g: "senha123",
                            ssid_5g: "CASA_ARK",
                            key_5g: "senha123",
                            mobility_domain: "a1b2",
                            backhaul: "cable",
                            mesh_id: "ark-mesh",
                            mesh_key: "arkmeshkey123",
                            channel_5g: "44",
                            channel_2g: "11",
                            ip_mode: "static",
                            netmask: "255.255.255.0",
                            dns: "192.168.73.1",
                            txpower_mode: "balanced"
                        }})
                    }});
                }}
                return Promise.resolve({{ code: 0, stdout: '{{}}' }});
            }}
        }};
    </script>
</body>
</html>
"""
        page.set_content(test_html, wait_until="domcontentloaded")

        # Injetar wifiMethods e abrir o wizard
        with open(os.path.join(REPO_DIR, "src", "modules", "wifi.js"), "r", encoding="utf-8") as f:
            wifi_code = f.read()

        page.evaluate(f"""() => {{
            {wifi_code}
            window.wifiMethods = wifiMethods;
            wifiMethods.showSatelliteWizardModal();
        }}""")

        # Aguardar modal renderizar
        page.wait_for_selector("#ex-sat-section-5", timeout=5000)
        time.sleep(1)

        # Rolar a página para focar na seção 5
        page.evaluate("""() => {
            const sec5 = document.getElementById('ex-sat-section-5');
            if (sec5) {
                sec5.scrollIntoView({ behavior: 'instant', block: 'center' });
                sec5.style.outline = '2px solid #38bdf8';
                sec5.style.boxShadow = '0 0 15px rgba(56, 189, 248, 0.4)';
            }
        }""")
        time.sleep(0.5)

        # Capturar screenshot
        page.screenshot(path=SCREENSHOT_PATH, full_page=False)
        print(f"Screenshot salvo em: {SCREENSHOT_PATH}")

        # Validações dos elementos
        sec5_text = page.inner_text("#ex-sat-section-5")
        assert "5. Potência e Alcance das Antenas (Anti-Sobreposição)" in sec5_text, "Título da seção 5 não encontrado!"
        assert "ANTI-STICKY" in sec5_text, "Badge ANTI-STICKY não encontrado!"
        assert "Baixa" in sec5_text, "Texto explicativo não encontrado!"

        options = page.eval_on_selector_all("#ex-sat-section-5 select option", "opts => opts.map(o => ({ value: o.value, text: o.text }))")
        print(f"Opções disponíveis no seletor: {json.dumps(options, ensure_ascii=False, indent=2)}")

        assert len(options) == 3, f"Esperado 3 opções, encontrado {len(options)}"
        assert options[0]["value"] == "low", "Primeira opção deve ser 'low'"
        assert options[1]["value"] == "balanced", "Segunda opção deve ser 'balanced'"
        assert options[2]["value"] == "max", "Terceira opção deve ser 'max'"

        # Testar seleção de "low"
        page.select_option("#ex-sat-section-5 select", "low")
        val = page.eval_on_selector("#ex-sat-section-5 select", "el => el.value")
        assert val == "low", "Valor 'low' não foi selecionado corretamente"

        print("=== TODAS AS VALIDAÇÕES VISUAIS E DE INTERAÇÃO PASSARAM COM 100% DE SUCESSO! ===")
        browser.close()

    server.shutdown()
    if console_errors:
        print(f"Avisos de console: {console_errors}")
    else:
        print("Zero erros no console JavaScript!")

if __name__ == '__main__':
    run_test()
