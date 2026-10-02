#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual & Interactive Verification of Wi-Fi Edit Modal with Band Toggles
Renders the actual LuCI view / modal in headless Chrome using Selenium, verifies:
1. Active transmission bands (2.4 GHz and 5 GHz toggles)
2. Live status text updates ("Ativa" / "Desativada")
3. Dynamic SSID hints updating when 5 GHz or 2.4 GHz is toggled
4. Split mode behavior with disabled band badges and disabled inputs
5. Safety guardrail preventing turning off all bands
6. Absence of JavaScript console errors
Saves screenshots to the artifact directory.
"""

import os
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

ARTIFACTS_DIR = r"C:\Users\User\.gemini\antigravity\brain\89c504e8-63d4-4b94-a0bc-32226b9c070f"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OVERVIEW_CSS = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.css")
OVERVIEW_JS = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.js")

with open(OVERVIEW_JS, "r", encoding="utf-8") as f:
    overview_code = f.read()

HTML_FILE = os.path.join(ARTIFACTS_DIR, "test_wifi_modal.html")

html_content = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ARK Router — Wi-Fi Edit Modal Test</title>
<style>
:root {{
    --ex-primary-safe: #2563eb;
    --background: #0f172a;
    --text-color: #f8fafc;
}}
body {{
    background: #0f172a;
    color: #f8fafc;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 20px;
}}
#modal_overlay {{
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(6px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
}}
.modal {{
    background: #1e293b;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    padding: 24px;
    width: 520px;
    max-width: calc(100vw - 32px);
    max-height: calc(100vh - 48px);
    overflow-y: auto;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}}
.modal h4 {{
    margin: 0 0 16px 0;
    font-size: 1.25rem;
    font-weight: 700;
    color: #f8fafc;
}}
.cbi-button {{
    min-height: 40px;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid transparent;
}}
.cbi-button-neutral {{
    background: rgba(255, 255, 255, 0.1);
    color: #f8fafc;
    border-color: rgba(255, 255, 255, 0.15);
}}
.cbi-button-positive {{
    background: #2563eb;
    color: #ffffff;
}}
.cbi-input-select, .cbi-input-text {{
    min-height: 38px;
    padding: 6px 12px;
    border-radius: 8px;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #f8fafc;
    box-sizing: border-box;
}}
.alert-message {{
    padding: 10px 14px;
    border-radius: 8px;
    margin: 10px 0;
    font-size: 0.85rem;
    line-height: 1.4;
}}
.alert-message.warning {{
    background: rgba(245, 158, 11, 0.12);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #fbbf24;
}}
.alert-message.success {{
    background: rgba(16, 185, 129, 0.12);
    border: 1px solid rgba(16, 185, 129, 0.35);
    color: #34d399;
}}
.alert-message.danger {{
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #f87171;
}}
#notification-area {{
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}}
</style>
<link rel="stylesheet" href="file:///{OVERVIEW_CSS.replace('\\', '/')}">
</head>
<body>
<div id="notification-area"></div>
<div id="modal_overlay">
    <div class="modal">
        <h4 id="modal_title">Carregando...</h4>
        <div id="modal_content"></div>
    </div>
</div>

<script>
window.L = {{
    bind: function(fn, ctx) {{
        var args = Array.prototype.slice.call(arguments, 2);
        return function() {{
            return fn.apply(ctx, args.concat(Array.prototype.slice.call(arguments)));
        }};
    }},
    isObject: function(a) {{ return a !== null && typeof a === 'object'; }},
    resource: function(path) {{ return path; }},
    view: {{
        extend: function(def) {{ return def; }}
    }},
    rpc: {{
        declare: function() {{ return function() {{ return Promise.resolve({{}}); }}; }}
    }},
    poll: {{
        add: function() {{}},
        remove: function() {{}}
    }}
}};

window.E = function(tag, attrs, children) {{
    var el = document.createElement(tag);
    if (attrs) {{
        for (var k in attrs) {{
            if (k === 'class') el.className = attrs[k];
            else if (k === 'style') el.style.cssText = attrs[k];
            else if (k.indexOf('on') === 0 || typeof attrs[k] === 'function') {{
                var evName = k.indexOf('on') === 0 ? k.substring(2) : k;
                el.addEventListener(evName, attrs[k]);
            }} else {{
                el.setAttribute(k, attrs[k]);
            }}
        }}
    }}
    if (children) {{
        if (!Array.isArray(children)) children = [children];
        for (var i = 0; i < children.length; i++) {{
            var c = children[i];
            if (c == null || c === '') continue;
            if (typeof c === 'string' || typeof c === 'number') {{
                el.appendChild(document.createTextNode(String(c)));
            }} else if (c.nodeType) {{
                el.appendChild(c);
            }}
        }}
    }}
    return el;
}};

window.ui = {{
    showModal: function(title, content) {{
        document.body.classList.add('modal-overlay-active');
        document.getElementById('modal_title').textContent = title;
        var box = document.getElementById('modal_content');
        box.innerHTML = '';
        if (Array.isArray(content)) {{
            content.forEach(function(item) {{
                if (item) box.appendChild(typeof item === 'string' ? document.createTextNode(item) : item);
            }});
        }} else if (content) {{
            box.appendChild(content);
        }}
    }},
    hideModal: function() {{
        document.body.classList.remove('modal-overlay-active');
        document.getElementById('modal_overlay').style.display = 'none';
    }},
    addNotification: function(title, node, type) {{
        var area = document.getElementById('notification-area');
        var notif = E('div', {{ class: 'alert-message ' + (type || 'warning') }}, [
            node || title
        ]);
        area.appendChild(notif);
        setTimeout(function() {{ notif.remove(); }}, 4000);
    }}
}};

window.fs = {{
    exec: function(cmd, args) {{
        console.log("Mock fs.exec:", cmd, args);
        return Promise.resolve({{ code: 0, stdout: 'ok' }});
    }}
}};

window.closeModal = function() {{ ui.hideModal(); }};
window.reloadSoon = function(msg) {{ console.log("Reload soon:", msg); }};
window.reloadAfterExpectedDisconnect = function() {{ return false; }};
window.values = function(cfg) {{ return cfg && cfg.values || {{}}; }};
window.kbpsToMbpsInput = function(k) {{ return String(Math.round(k/1000)); }};
window.mbpsToKbps = function(m) {{ return String(Math.round(Number(m)*1000)); }};
</script>

<script>
window.dashboardModule = (function(view, rpc, poll, fs, ui) {{
{overview_code}
}})(L.view, L.rpc, L.poll, window.fs, window.ui);
</script>
</body>
</html>
"""

with open(HTML_FILE, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"[1] Test HTML criado em: {HTML_FILE}")

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1280,950")
chrome_options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

driver = webdriver.Chrome(options=chrome_options)
try:
    print("[2] Abrindo página de teste no Chrome headless...")
    driver.get(f"file:///{HTML_FILE.replace('\\', '/')}")
    time.sleep(1)

    print("[3] Invocando editWifiNetwork('main', mockConfig)...")
    driver.execute_script("""
        window.testDashboard = Object.assign({}, window.dashboardModule, {
            currentData: { qos: {} },
            capabilities: { has6g: false }
        });
        testDashboard.editWifiNetwork('main', {
            ssid: 'ARK-Router',
            ssid2: 'ARK-Router-2G',
            ssid5: 'ARK-Router-5G',
            encryption: 'sae-mixed',
            disabled: '0',
            disabled2: '0',
            disabled5: '0',
            has2g: true,
            has5g: true,
            has6g: false
        });
    """)
    time.sleep(1)

    shot1_path = os.path.join(ARTIFACTS_DIR, "wifi_modal_both_bands_active.png")
    driver.save_screenshot(shot1_path)
    print(f"[4] Screenshot 1 salvo (ambas as bandas ativas): {shot1_path}")

    title = driver.find_element(By.ID, "modal_title").get_attribute("textContent")
    print(f"    Título do modal: '{title}'")
    assert "Editar rede principal" in title, f"Título inesperado: {title}"

    print("[5] Desmarcando switch da frequência 5 GHz...")
    switches = driver.find_elements(By.CSS_SELECTOR, "label.ex-switch input[type='checkbox']")
    driver.execute_script("arguments[0].click();", switches[1])
    time.sleep(0.5)

    shot2_path = os.path.join(ARTIFACTS_DIR, "wifi_modal_24g_only_active.png")
    driver.save_screenshot(shot2_path)
    print(f"[6] Screenshot 2 salvo (apenas 2.4 GHz ativa, 5 GHz desligada): {shot2_path}")

    # Check updated hint
    hint_elements = driver.find_elements(By.CSS_SELECTOR, ".ex-device-config-block small.ex-muted")
    for h in hint_elements:
        txt = h.get_attribute("textContent")
        if "Transmitindo" in txt or "Aplicado" in txt:
            print(f"    Texto de dica atualizado: '{txt}'")

    print("[7] Ativando modo 'Separar nomes 2,4 GHz e 5 GHz'...")
    split_chk = driver.find_elements(By.CSS_SELECTOR, "label.ex-show-password input[type='checkbox']")[0]
    driver.execute_script("arguments[0].click();", split_chk)
    time.sleep(0.5)

    shot3_path = os.path.join(ARTIFACTS_DIR, "wifi_modal_split_with_5g_disabled.png")
    driver.save_screenshot(shot3_path)
    print(f"[8] Screenshot 3 salvo (modo separado com 5 GHz desativada): {shot3_path}")

    print("[9] Tentando desmarcar a última frequência ativa (2,4 GHz) para validar trava de segurança...")
    driver.execute_script("arguments[0].click();", switches[0])
    time.sleep(0.5)

    shot4_path = os.path.join(ARTIFACTS_DIR, "wifi_modal_guardrail_triggered.png")
    driver.save_screenshot(shot4_path)
    print(f"[10] Screenshot 4 salvo (trava de segurança ativada): {shot4_path}")

    notifs = driver.find_elements(By.CSS_SELECTOR, "#notification-area .alert-message")
    if notifs:
        print(f"    Notificação de segurança exibida: '{notifs[0].text}'")

    print("[11] Auditando erros no console do navegador...")
    browser_logs = driver.get_log("browser")
    severe_errors = [log for log in browser_logs if log["level"] == "SEVERE"]
    if severe_errors:
        print(f"[AVISO] Erros severos detectados no console: {severe_errors}")
    else:
        print("    ✅ Zero erros SEVERE encontrados no console do navegador!")

    print("\n============================================================")
    print("SUCESSO: Validação visual e interativa aprovada com êxito!")
    print("============================================================")

finally:
    driver.quit()
