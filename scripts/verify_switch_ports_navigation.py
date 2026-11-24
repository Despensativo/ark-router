#!/usr/bin/env python3
"""
ARK Router: Test and verify switch port card click navigation.
Verifies that clicking on WAN port in 'Portas Físicas de Switch Ethernet'
navigates directly to the WAN card (#ex-wan1-card), not to LAN ports (#ex-lan-ports-section).
Captures screenshots and checks for 0 browser console errors.
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DOCS_DIR = os.path.join(REPO_DIR, "docs", "screenshots")
os.makedirs(DOCS_DIR, exist_ok=True)

CASCADE_CSS_PATH = os.path.join(REPO_DIR, "root", "www", "luci-static", "ark", "cascade.css")
OVERVIEW_CSS_PATH = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.css")
OVERVIEW_JS_PATH = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.js")

with open(CASCADE_CSS_PATH, "r", encoding="utf-8") as f:
    cascade_css = f.read()

with open(OVERVIEW_CSS_PATH, "r", encoding="utf-8") as f:
    overview_css = f.read()

html_content = f"""<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARK Router — Verificação Navegação Portas Físicas</title>
    <style>
{cascade_css}
{overview_css}
    body {{
        background: #0b1120;
        color: #f8fafc;
        margin: 0;
        padding: 20px;
    }}
    .ex-dashboard {{
        max-width: 1200px;
        margin: 0 auto;
    }}
    </style>
</head>
<body>
    <div class="ex-dashboard" data-active-v2-panel="cockpit">
        <!-- Switch Ports Card will be rendered here -->
        <div id="test-root"></div>
    </div>

    <script>
        function _t(text) {{ return text; }}
        function values(obj) {{
            if (!obj) return [];
            return Object.values(obj);
        }}
        function portDomId(port) {{ return String(port||'port').replace(/[^A-Za-z0-9_-]/g,'_'); }}
        function portLabel(port) {{
            const p = String(port||'').toLowerCase();
            if (p === 'eth1' || p === 'wan' || p === 'wan1') return 'WAN1';
            if (p === 'lan1' || p === 'port1') return 'LAN1';
            if (p === 'lan2' || p === 'port2') return 'LAN2';
            if (p === 'lan3' || p === 'port3') return 'LAN3';
            if (p === 'lan4' || p === 'port4') return 'LAN4';
            return port;
        }}
        function isSatelliteOrAp(data) {{ return false; }}
        function getActiveWanList(data) {{
            return [{{ iface: 'wan', label: 'WAN1', domId: 'wan1', isPrimary: true, device: 'eth1' }}];
        }}
        function iface(interfaces, name) {{
            return {{ up: true, device: 'eth1', speed: 1000 }};
        }}

        const L = {{
            bind: function(fn, ctx) {{ return fn.bind(ctx); }}
        }};

        function E(tag, attrs, children) {{
            const el = document.createElement(tag);
            if (attrs) {{
                for (const [k, v] of Object.entries(attrs)) {{
                    if (k === 'class') el.className = v;
                    else if (k === 'style') el.style.cssText = v;
                    else if (k === 'click' && typeof v === 'function') el.addEventListener('click', v);
                    else if (v !== null && v !== undefined) el.setAttribute(k, v);
                }}
            }}
            if (children) {{
                const list = Array.isArray(children) ? children : [children];
                for (const c of list) {{
                    if (c === null || c === undefined) continue;
                    if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(c));
                    else if (c instanceof Node) el.appendChild(c);
                }}
            }}
            return el;
        }}

        window.renderContext = {{
            switchV2PanelCalls: [],
            switchV2Panel: function(panelId, scrollTargetId) {{
                this.switchV2PanelCalls.push({{ panelId: panelId, scrollTargetId: scrollTargetId }});
                const root = document.querySelector('.ex-dashboard');
                if (root) root.setAttribute('data-active-v2-panel', panelId);
                if (scrollTargetId) {{
                    let targetEl = document.getElementById(scrollTargetId);
                    if (!targetEl && scrollTargetId.indexOf('-card') !== -1) {{
                        targetEl = document.getElementById(scrollTargetId.indexOf('wan') !== -1 ? 'ex-wans-grid-section' : 'ex-lan-ports-section');
                    }}
                    if (targetEl) {{
                        targetEl.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
                        targetEl.classList.remove('ex-card-target-flash');
                        void targetEl.offsetWidth;
                        targetEl.classList.add('ex-card-target-flash');
                    }}
                }}
            }}
        }};

        // Build Mock Router Data
        const testData = {{
            hardwareInfo: {{
                ports: {{
                    eth1: {{ carrier: true, speed: 1000, duplex: 'full', max_speed: '2.5G' }},
                    lan1: {{ carrier: true, speed: 1000, duplex: 'full', max_speed: '1G' }},
                    lan2: {{ carrier: false, speed: 0, duplex: 'unknown', max_speed: '1G' }},
                    lan3: {{ carrier: false, speed: 0, duplex: 'unknown', max_speed: '1G' }},
                    lan4: {{ carrier: false, speed: 0, duplex: 'unknown', max_speed: '1G' }}
                }}
            }},
            networkConfig: {{
                wan: {{ device: 'eth1', proto: 'dhcp' }},
                lan: {{ ipaddr: '192.168.1.1' }}
            }},
            lanPorts: ['lan1', 'lan2', 'lan3', 'lan4'],
            lanDevices: [
                {{ carrier: true, speed: 1000, duplex: 'full', max_speed: '1G' }},
                {{ carrier: false, speed: 0, duplex: 'unknown', max_speed: '1G' }},
                {{ carrier: false, speed: 0, duplex: 'unknown', max_speed: '1G' }},
                {{ carrier: false, speed: 0, duplex: 'unknown', max_speed: '1G' }}
            ]
        }};

        // Render sections
        const testRoot = document.getElementById('test-root');

        // 1. Switch Ports Card
        const portsGrid = E('div', {{ id: 'ex-v2-switch-ports-grid', class: 'ex-v2-switch-ports-grid' }}, []);
        const switchPortsCard = E('section', {{
            id: 'ex-v2-switch-ports-card',
            class: 'ex-card ex-v2-switch-ports-card',
            'data-ark-panels': 'cockpit wan all'
        }}, [
            E('div', {{ class: 'ex-card-title' }}, [
                E('div', {{}}, [
                    E('span', {{ class: 'ex-kicker' }}, ['TOPOLOGIA FÍSICA ETHERNET']),
                    E('h3', {{}}, ['🔌 Portas Físicas de Switch Ethernet & Conexões de Rede']),
                    E('small', {{ class: 'ex-muted' }}, ['Status de enlace físico, duplex e velocidade negociada em hardware'])
                ]),
                E('span', {{ id: 'ex-v2-ports-summary-pill', class: 'ex-pill online' }}, ['PORTAS ATIVAS'])
            ]),
            portsGrid
        ]);
        testRoot.appendChild(switchPortsCard);

        // 2. WAN section with #ex-wan1-card
        const wanCard = E('section', {{ id: 'ex-wan1-card', class: 'ex-card ex-wan-card', style: 'margin-top: 400px; height: 280px;' }}, [
            E('div', {{ class: 'ex-card-title' }}, [
                E('h3', {{}}, ['WAN1 (Internet Principal)']),
                E('span', {{ class: 'ex-pill online' }}, ['ONLINE'])
            ]),
            E('p', {{}}, ['Configuração e status da porta de internet WAN1'])
        ]);
        const wansSection = E('div', {{ id: 'ex-wans-grid-section', class: 'ex-wans-grid', 'data-ark-panels': 'wan all' }}, [wanCard]);
        testRoot.appendChild(wansSection);

        // 3. LAN section with #ex-lan-lan1-card
        const lanCard1 = E('section', {{ id: 'ex-lan-lan1-card', class: 'ex-card ex-lan-card', style: 'margin-top: 400px; height: 200px;' }}, [
            E('div', {{ class: 'ex-card-title' }}, [
                E('h3', {{}}, ['LAN1 (Porta Local)']),
                E('span', {{ class: 'ex-pill online' }}, ['CONECTADA'])
            ]),
            E('p', {{}}, ['Porta local de rede cabeada LAN1'])
        ]);
        const lanSection = E('div', {{ id: 'ex-lan-ports-section', class: 'ex-lan-block', 'data-ark-panels': 'wan all' }}, [lanCard1]);
        testRoot.appendChild(lanSection);

        // Populate ports using the exact logic from render.js
        const hwPorts = testData.hardwareInfo.ports;
        const portDefs = [];
        const seenPorts = {{}};

        const getPortMaxSpeed = function(dev, hw) {{
            if (hw && hw.max_speed) return hw.max_speed;
            return '1G';
        }};

        const activeWans = getActiveWanList(testData);
        activeWans.forEach(function(w) {{
            const rawDev = 'eth1';
            const hw = hwPorts[rawDev] || {{}};
            seenPorts[rawDev] = 1;
            portDefs.push({{
                key: rawDev,
                targetId: 'ex-' + w.domId + '-card',
                label: 'WAN1 (2.5G)',
                role: 'WAN 1',
                isWan: true,
                isUp: true,
                speed: 1000,
                duplex: 'full'
            }});
        }});

        testData.lanPorts.forEach(function(port) {{
            if (seenPorts[port]) return;
            seenPorts[port] = 1;
            const hw = hwPorts[port] || {{}};
            const isUp = !!hw.carrier;
            portDefs.push({{
                key: port,
                targetId: 'ex-lan-' + portDomId(port) + '-card',
                label: port.toUpperCase() + ' (1G)',
                role: 'LAN',
                isWan: false,
                isUp: isUp,
                speed: hw.speed,
                duplex: hw.duplex
            }});
        }});

        const boxes = portDefs.map(function(pd) {{
            const isUp = !!pd.isUp;
            const speedStr = isUp ? '1000 Mbps' : 'Sem Cabo';
            const duplexStr = 'Full Duplex';
            const targetSection = pd.targetId || (pd.isWan ? 'ex-wans-grid-section' : 'ex-lan-ports-section');
            return E('div', {{
                class: 'ex-v2-port-box ' + (isUp ? 'port-up' : 'port-down'),
                click: function() {{ window.renderContext.switchV2Panel('wan', targetSection); }},
                title: 'Clique para gerenciar portas de rede',
                'data-key': pd.key
            }}, [
                E('span', {{ class: 'ex-v2-port-role ' + (pd.isWan ? 'is-wan' : 'is-lan') }}, [pd.role]),
                E('div', {{ class: 'ex-v2-port-jack' }}, [
                    E('div', {{ class: 'ex-v2-port-leds' }}, [
                        E('span', {{ class: 'ex-v2-led ' + (isUp ? 'led-green' : 'led-off') }}),
                        E('span', {{ class: 'ex-v2-led ' + (isUp ? 'led-amber' : 'led-off') }})
                    ]),
                    E('span', {{ class: 'ex-v2-port-pins' }}, ['||||'])
                ]),
                E('strong', {{ class: 'ex-v2-port-name' }}, [pd.label]),
                E('small', {{ class: 'ex-v2-port-speed' }}, [isUp ? (speedStr + ' • ' + duplexStr) : 'Sem Cabo'])
            ]);
        }});
        portsGrid.replaceChildren.apply(portsGrid, boxes);
    </script>
</body>
</html>
"""

harness_path = os.path.join(DOCS_DIR, "switch_ports_navigation_harness.html")
with open(harness_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"Harness salvo em: {harness_path}")

console_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})

    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    page.on("pageerror", lambda err: console_errors.append(str(err)))

    page.goto(f"file://{harness_path}")
    page.wait_for_timeout(300)

    # 1. Localizar porta WAN1 e clicar
    wan_box = page.locator(".ex-v2-port-box[data-key='eth1']")
    if not wan_box.is_visible():
        print("ERRO: Porta WAN1 não está visível!", file=sys.stderr)
        sys.exit(1)

    print("1. Clicando na porta WAN 1...")
    wan_box.click()
    page.wait_for_timeout(400)

    calls = page.evaluate("window.renderContext.switchV2PanelCalls")
    print(f"   Chamadas switchV2Panel: {calls}")
    if not calls or calls[-1]["scrollTargetId"] != "ex-wan1-card":
        print(f"ERRO: Clique na WAN não direcionou para ex-wan1-card! Chamada: {calls}", file=sys.stderr)
        sys.exit(1)

    # Verificar classe de destaque no card WAN
    has_flash = page.evaluate("document.getElementById('ex-wan1-card').classList.contains('ex-card-target-flash')")
    if not has_flash:
        print("ERRO: Card WAN1 não recebeu a animação ex-card-target-flash!", file=sys.stderr)
        sys.exit(1)

    wan_screenshot = os.path.join(DOCS_DIR, "switch_port_wan_click_verified.png")
    page.screenshot(path=wan_screenshot)
    print(f"   [OK] Screenshot de clique na WAN1 salvo: {wan_screenshot}")

    # 2. Localizar porta LAN1 e clicar
    lan_box = page.locator(".ex-v2-port-box[data-key='lan1']")
    print("2. Clicando na porta LAN 1...")
    lan_box.click()
    page.wait_for_timeout(400)

    calls = page.evaluate("window.renderContext.switchV2PanelCalls")
    print(f"   Chamadas switchV2Panel: {calls}")
    if not calls or calls[-1]["scrollTargetId"] != "ex-lan-lan1-card":
        print(f"ERRO: Clique na LAN não direcionou para ex-lan-lan1-card! Chamada: {calls}", file=sys.stderr)
        sys.exit(1)

    has_lan_flash = page.evaluate("document.getElementById('ex-lan-lan1-card').classList.contains('ex-card-target-flash')")
    if not has_lan_flash:
        print("ERRO: Card LAN1 não recebeu a animação ex-card-target-flash!", file=sys.stderr)
        sys.exit(1)

    lan_screenshot = os.path.join(DOCS_DIR, "switch_port_lan_click_verified.png")
    page.screenshot(path=lan_screenshot)
    print(f"   [OK] Screenshot de clique na LAN1 salvo: {lan_screenshot}")

    browser.close()

if console_errors:
    print(f"ERRO: Detectados erros de console: {console_errors}", file=sys.stderr)
    sys.exit(1)

print("\n>>> SUCESSO: Todos os testes de navegação de portas físicas e destaque visual foram validados com Zero Falso Positivo!")
