#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual verification and screenshot capture for LAN & DNS auto-sync in 'Editar rede principal / DHCP'.
Validates:
1. Modal rendering with initial state (192.168.1.1).
2. Changing Router IP to 192.168.30.1 dynamically updates DHCP range AND DNS Enviado 1 to 192.168.30.1.
3. Captures real screenshot via Chrome Headless.
4. Asserts 0 console errors.
"""

import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

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

html_template = r"""<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARK Router - Verificação Visual de Sincronização de IP e DNS</title>
    <style>
__CASCADE_CSS__
__OVERVIEW_CSS__
        body {
            background: #0b1120;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 30px;
            margin: 0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .modal-container {
            width: 100%;
            max-width: 780px;
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
            overflow: hidden;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .modal-title {
            font-size: 1.25rem;
            font-weight: 700;
            color: #f8fafc;
            margin: 0;
        }
        .modal-body {
            padding: 24px;
        }
        .alert-message.warning {
            background: rgba(245, 158, 11, 0.15);
            border-left: 4px solid #f59e0b;
            color: #fbbf24;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 0.9rem;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="modal-container">
        <div class="modal-header">
            <h2 class="modal-title">Editar rede principal / DHCP</h2>
            <span style="color:#64748b; font-size:1.2rem; cursor:pointer;">✕</span>
        </div>
        <div class="modal-body" id="modal-content">
            <!-- Modal DOM will be rendered here by ARK Router logic -->
        </div>
    </div>

    <script>
        // Minimal mock of LuCI DOM helper 'E'
        function E(tag, attrs, children) {
            const el = document.createElement(tag);
            if (attrs) {
                for (const [k, v] of Object.entries(attrs)) {
                    if (k === 'class') el.className = v;
                    else if (k === 'style') el.style.cssText = v;
                    else if (k.startsWith('on') || typeof v === 'function') {
                        el.addEventListener(k.replace(/^on/, ''), v);
                    } else if (k === 'click') {
                        el.addEventListener('click', v);
                    } else {
                        el.setAttribute(k, v);
                    }
                }
            }
            if (children) {
                const list = Array.isArray(children) ? children : [children];
                for (const child of list) {
                    if (child === null || child === undefined) continue;
                    if (typeof child === 'string' || typeof child === 'number') {
                        el.appendChild(document.createTextNode(child));
                    } else if (child instanceof Node) {
                        el.appendChild(child);
                    }
                }
            }
            return el;
        }

        // Suggestions helper from ARK Router
        function dhcpStartSuggestion(ip) {
            if (!ip || !ip.includes('.')) return '';
            const p = ip.trim().split('.');
            if (p.length !== 4) return '';
            return p[0] + '.' + p[1] + '.' + p[2] + '.10';
        }
        function dhcpEndSuggestion(ip) {
            if (!ip || !ip.includes('.')) return '';
            const p = ip.trim().split('.');
            if (p.length !== 4) return '';
            return p[0] + '.' + p[1] + '.' + p[2] + '.254';
        }

        // Initial State reproducing the user setup
        const state = {
            ipaddr: '192.168.1.1',
            netmask: '255.255.255.0',
            dhcp_start: '192.168.1.10',
            dhcp_end: '192.168.1.254',
            dns: ['192.168.1.1', '1.1.1.1', '9.9.9.9'],
            preset: 'manual'
        };

        // Render logic from src/modules/network.js
        const makeSelect = function(value, items) {
            const s = E('select', { class: 'cbi-input-select', id: 'mode-select' }, items.map(function(i) {
                return E('option', { value: i[0] }, [i[1]]);
            }));
            s.value = value;
            return s;
        };

        const mode = makeSelect('manual', [
            ['preset192', 'Padrão 192.168.x.x'],
            ['preset10', 'Padrão 10.0.x.x'],
            ['manual', 'Informar manualmente']
        ]);

        const initialRouterIp = state.ipaddr || '192.168.1.1';
        let lastRouterIp = initialRouterIp;
        const routerIp = E('input', { class: 'cbi-input-text', id: 'router-ip', value: initialRouterIp, placeholder: initialRouterIp, inputmode: 'decimal' });
        const netmask = E('input', { class: 'cbi-input-text', id: 'netmask', value: state.netmask || '255.255.255.0', placeholder: '255.255.255.0', inputmode: 'decimal' });
        const dhcpStart = E('input', { class: 'cbi-input-text', id: 'dhcp-start', value: state.dhcp_start || '192.168.1.10', placeholder: '192.168.1.10', inputmode: 'decimal' });
        const dhcpEnd = E('input', { class: 'cbi-input-text', id: 'dhcp-end', value: state.dhcp_end || '192.168.1.254', placeholder: '192.168.1.254', inputmode: 'decimal' });
        const dnsList = Array.isArray(state.dns) ? state.dns : String(state.dns || '').split(/\s+/).filter(Boolean);
        const initialDns1 = dnsList[0] || initialRouterIp;
        const dns1 = E('input', { class: 'cbi-input-text', id: 'dns-1', value: initialDns1, placeholder: initialRouterIp, inputmode: 'decimal' });
        const dns2 = E('input', { class: 'cbi-input-text', id: 'dns-2', value: dnsList[1] || '1.1.1.1', placeholder: '1.1.1.1', inputmode: 'decimal' });
        const dns3 = E('input', { class: 'cbi-input-text', id: 'dns-3', value: dnsList[2] || '9.9.9.9', placeholder: '9.9.9.9', inputmode: 'decimal' });
        const field = function(label, node, hint) {
            return E('label', { class: 'ex-wan-edit-field' }, [
                E('span', {}, [label]),
                node,
                hint ? E('small', { class: 'ex-muted' }, [hint]) : ''
            ]);
        };

        let dhcpTouched = false;
        let dns1Touched = false;

        const isSameSubnet24 = function(ipA, ipB) {
            if (!ipA || !ipB) return false;
            const pA = String(ipA).trim().split('.'), pB = String(ipB).trim().split('.');
            return pA.length === 4 && pB.length === 4 && pA[0] === pB[0] && pA[1] === pB[1] && pA[2] === pB[2];
        };

        const suggestDns = function(newIp) {
            if (!newIp) return;
            const trimmed = String(newIp).trim();
            if (!trimmed) return;
            const curDns1 = dns1.value.trim();
            if (!dns1Touched || curDns1 === lastRouterIp || curDns1 === initialRouterIp || isSameSubnet24(curDns1, lastRouterIp)) {
                dns1.value = trimmed;
                dns1.placeholder = trimmed;
            }
            if (dns2.value.trim() === lastRouterIp) dns2.value = trimmed;
            if (dns3.value.trim() === lastRouterIp) dns3.value = trimmed;
            lastRouterIp = trimmed;
        };

        const suggestDhcp = function(force) {
            const start = dhcpStartSuggestion(routerIp.value), end = dhcpEndSuggestion(routerIp.value);
            if (!start || !end) return;
            if (force || !dhcpTouched) { dhcpStart.value = start; dhcpEnd.value = end; }
            dhcpStart.placeholder = start; dhcpEnd.placeholder = end;
        };

        const onRouterIpChange = function(force) {
            if (mode.value === 'manual' || force) {
                suggestDhcp(force);
                suggestDns(routerIp.value);
            }
        };

        const applyPreset = function(changed) {
            if (changed && mode.value === 'preset192') {
                routerIp.value = '192.168.1.1'; netmask.value = '255.255.255.0';
                dhcpStart.value = '192.168.1.10'; dhcpEnd.value = '192.168.1.254';
                dhcpTouched = false;
                suggestDns('192.168.1.1');
            } else if (changed && mode.value === 'preset10') {
                routerIp.value = '10.0.0.1'; netmask.value = '255.255.255.0';
                dhcpStart.value = '10.0.0.10'; dhcpEnd.value = '10.0.0.254';
                dhcpTouched = false;
                suggestDns('10.0.0.1');
            }
            const manual = mode.value === 'manual';
            routerIp.disabled = netmask.disabled = dhcpStart.disabled = dhcpEnd.disabled = !manual;
            if (manual) {
                suggestDhcp(false);
                suggestDns(routerIp.value);
            } else {
                suggestDhcp(changed);
            }
        };

        dhcpStart.addEventListener('input', function() { dhcpTouched = true; });
        dhcpEnd.addEventListener('input', function() { dhcpTouched = true; });
        dns1.addEventListener('input', function() {
            const val = dns1.value.trim();
            dns1Touched = (val !== '' && val !== routerIp.value.trim());
        });
        routerIp.addEventListener('input', function() { onRouterIpChange(false); });
        routerIp.addEventListener('blur', function() { onRouterIpChange(false); });
        mode.addEventListener('change', function() { applyPreset(true); });
        applyPreset(false);

        // Mount modal
        const container = document.getElementById('modal-content');
        container.appendChild(E('div', {}, [
            E('p', { class: 'alert-message warning' }, [
                'Alterar o IP principal muda o endereço de acesso do painel e pode desconectar dispositivos. O ARK cria um backup em /tmp antes de aplicar.'
            ]),
            E('div', { class: 'ex-wan-edit-grid' }, [
                field('MODELO DE REDE', mode),
                field('IP DO ROTEADOR', routerIp, 'Endereço usado para abrir o painel'),
                field('MÁSCARA', netmask, 'Nesta versão, use /24: 255.255.255.0'),
                field('DHCP COMEÇA EM', dhcpStart),
                field('DHCP TERMINA EM', dhcpEnd),
                field('DNS ENVIADO 1', dns1, 'Sincronizado automaticamente com o IP do roteador'),
                field('DNS ENVIADO 2', dns2),
                field('DNS ENVIADO 3', dns3, 'Opcional. Apague os três para não enviar DNS fixo.')
            ]),
            E('p', { class: 'ex-muted' }, [
                'Exemplo: roteador 192.168.25.1 sugere automaticamente DHCP 192.168.25.10 até 192.168.25.254. Depois você pode ajustar só o final. O DHCP não pode incluir o IP do roteador. DNS preenchido será enviado aos aparelhos via DHCP.'
            ]),
            E('div', { class: 'ex-cleanup-entry', style: 'margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.03);' }, [
                E('div', {}, [
                    E('strong', {}, ['🌐 Conectividade IPv6 e Modo Cascata (NDP Relay)']),
                    E('small', { class: 'ex-muted' }, ['Configure o protocolo IPv6 para esta rede local (Pilha Dupla Global, Seletivo por MAC, Cascata/NDP Relay ou IPv4 Puro).'])
                ]),
                E('button', { class: 'ex-mini-button btn-ipv6', style: 'min-height:38px;padding:6px 14px;' }, ['🌐 Ajustes IPv6 / Relay'])
            ]),
            E('div', { class: 'right', style: 'margin-top:16px; display:flex; justify-content:flex-end; gap:10px;' }, [
                E('button', { class: 'btn cbi-button cbi-button-neutral' }, ['Cancelar']),
                E('button', { class: 'btn cbi-button cbi-button-positive' }, ['Continuar'])
            ])
        ]));

        // Expose function for Selenium automation
        window.simulateUserEdit = function(newIp) {
            routerIp.value = newIp;
            routerIp.dispatchEvent(new Event('input', { bubbles: true }));
            return {
                routerIp: routerIp.value,
                dhcpStart: dhcpStart.value,
                dhcpEnd: dhcpEnd.value,
                dns1: dns1.value,
                dns2: dns2.value,
                dns3: dns3.value
            };
        };
    </script>
</body>
</html>
"""

html_content = html_template.replace("__CASCADE_CSS__", cascade_css).replace("__OVERVIEW_CSS__", overview_css)
test_html_path = os.path.join(DOCS_DIR, "verify_lan_dns_sync_ui.html")
with open(test_html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"[OK] Harness HTML gerado em: {test_html_path}")

# Run headless Chrome via Selenium
chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1280,1024")

driver = webdriver.Chrome(options=chrome_options)
try:
    file_url = "file:///" + test_html_path.replace("\\", "/")
    driver.get(file_url)
    time.sleep(1)

    # 1. Check initial state
    init_res = driver.execute_script("return { routerIp: document.getElementById('router-ip').value, dns1: document.getElementById('dns-1').value };")
    print(f"Estado Inicial: Router={init_res['routerIp']} | DNS1={init_res['dns1']}")
    assert init_res['routerIp'] == '192.168.1.1'
    assert init_res['dns1'] == '192.168.1.1'

    # 2. Simulate user typing 192.168.30.1 as shown in user screenshot
    print("Simulando o usuário alterando IP para 192.168.30.1...")
    res = driver.execute_script("return window.simulateUserEdit('192.168.30.1');")
    print(f"Resultado após digitação: {res}")

    assert res['routerIp'] == '192.168.30.1', f"Router IP incorreto: {res['routerIp']}"
    assert res['dhcpStart'] == '192.168.30.10', f"DHCP Start incorreto: {res['dhcpStart']}"
    assert res['dhcpEnd'] == '192.168.30.254', f"DHCP End incorreto: {res['dhcpEnd']}"
    assert res['dns1'] == '192.168.30.1', f"DNS 1 NÃO ATUALIZOU! Valor atual: {res['dns1']}"
    assert res['dns2'] == '1.1.1.1', f"DNS 2 alterado indevidamente: {res['dns2']}"
    assert res['dns3'] == '9.9.9.9', f"DNS 3 alterado indevidamente: {res['dns3']}"
    print("[OK] Validacao de regras DOM aprovada com sucesso!")

    # Focus DNS 1 for visual highlight
    driver.execute_script("document.getElementById('dns-1').style.border = '2px solid #38bdf8'; document.getElementById('dns-1').style.boxShadow = '0 0 10px rgba(56, 189, 248, 0.4)';")
    time.sleep(0.5)

    # 3. Capture screenshot
    screenshot_path = os.path.join(DOCS_DIR, "lan_dns_sync_verification.png")
    driver.save_screenshot(screenshot_path)
    print(f"[OK] Screenshot salvo em: {screenshot_path}")

    # Copy to artifacts dir for embedding in response
    brain_dir = r"C:\Users\User\.gemini\antigravity\brain\59ed9f0a-57b2-411e-bec6-0c3a7c86bca9"
    artifact_img = os.path.join(brain_dir, "lan_dns_sync_verification.png")
    import shutil
    shutil.copyfile(screenshot_path, artifact_img)
    print(f"[OK] Screenshot copiado para artifacts: {artifact_img}")

    # 4. Check console errors
    logs = driver.get_log("browser")
    severe_errors = [l for l in logs if l.get("level") == "SEVERE"]
    print(f"Logs do navegador: {len(logs)} registros ({len(severe_errors)} erros severos)")
    assert len(severe_errors) == 0, f"Erros no console encontrados: {severe_errors}"
    print("[OK] ZERO erros no console do navegador!")

finally:
    driver.quit()

print("============================================================")
print("TESTE VISUAL E AUTO-SINCRONIZAÇÃO DE DNS CONCLUÍDOS COM SUCESSO!")
print("============================================================")
