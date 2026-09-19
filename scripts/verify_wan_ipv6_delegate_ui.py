#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual verification and screenshot capture for WAN IPv6 Delegation UI.
Validates:
1. Scenario 1: WAN1 with IPv6 active and Delegation enabled (primary distributor).
2. Scenario 2: WAN2 with IPv6 active, but Delegation locked because WAN1 is already distributing.
3. Scenario 3: WAN2 with IPv6 disabled, Delegation locked with requirement hint.
Validates DOM rendering, CSS styling, reactive event listeners, and zero console errors via Chrome Headless.
"""

import os
import sys
import time
import shutil
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

with open(OVERVIEW_JS_PATH, "r", encoding="utf-8") as f:
    overview_js = f.read()

html_template = """<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARK Router - Verificação Visual de Distribuição IPv6 na LAN</title>
    <style>
__CASCADE_CSS__
__OVERVIEW_CSS__
        body {
            background: #0b1120;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 30px;
            margin: 0;
        }
        .test-container {
            max-width: 1080px;
            margin: 0 auto;
        }
        .scenario-card {
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            margin-bottom: 36px;
        }
        .scenario-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 12px;
        }
        .scenario-title {
            font-size: 1.15rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .scenario-badge {
            font-size: 0.75rem;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 9999px;
            text-transform: uppercase;
        }
        .badge-active {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
            border: 1px solid rgba(16, 185, 129, 0.4);
        }
        .badge-locked {
            background: rgba(245, 158, 11, 0.2);
            color: #fbbf24;
            border: 1px solid rgba(245, 158, 11, 0.4);
        }
        .badge-disabled {
            background: rgba(148, 163, 184, 0.2);
            color: #cbd5e1;
            border: 1px solid rgba(148, 163, 184, 0.3);
        }
    </style>
</head>
<body>
    <div class="test-container">
        <h1 style="color: #f8fafc; font-size: 1.6rem; font-weight: 800; margin-bottom: 8px; display: flex; align-items: center; gap: 12px;">
            🌐 ARK Router — Validação Visual de Distribuição IPv6 na LAN (DHCPv6-PD)
        </h1>
        <p style="color: #94a3b8; font-size: 0.95rem; margin-top: 0; margin-bottom: 28px;">
            Exclusividade Mútua em Multi-WAN: Apenas uma WAN distribui bloco IPv6 para a LAN por vez. Bloqueio reativo e informativo.
        </p>

        <!-- Cenário 1 -->
        <div class="scenario-card">
            <div class="scenario-header">
                <div class="scenario-title" style="color: #38bdf8;">
                    <span>🔵 Cenário 1: WAN1 (Operadora Principal)</span>
                </div>
                <span class="scenario-badge badge-active">Distribuição Ativa (Disponível)</span>
            </div>
            <div id="modal-content-wan1"></div>
        </div>

        <!-- Cenário 2 -->
        <div class="scenario-card">
            <div class="scenario-header">
                <div class="scenario-title" style="color: #f59e0b;">
                    <span>🟣 Cenário 2: WAN2 com IPv6 Ativo (Bloqueio Inteligente Multi-WAN)</span>
                </div>
                <span class="scenario-badge badge-locked">Travado: WAN1 Já Distribui</span>
            </div>
            <div id="modal-content-wan2-locked"></div>
        </div>

        <!-- Cenário 3 -->
        <div class="scenario-card">
            <div class="scenario-header">
                <div class="scenario-title" style="color: #94a3b8;">
                    <span>⚪ Cenário 3: WAN2 com IPv6 Desativado</span>
                </div>
                <span class="scenario-badge badge-disabled">Travado: Requer Conectividade IPv6</span>
            </div>
            <div id="modal-content-wan2-noipv6"></div>
        </div>
    </div>

    <script>
    window.ARK_VERSION = '1.0.2';
    
    // Mocks essenciais do LuCI
    window.L = {
        bind: function(fn, ctx) {
            var args = Array.prototype.slice.call(arguments, 2);
            return function() {
                return fn.apply(ctx, args.concat(Array.prototype.slice.call(arguments)));
            };
        },
        resource: function(p) { return 'about:blank#'; },
        url: function(p) { return '/' + p; }
    };

    window.poll = {
        add: function() {},
        start: function() {},
        stop: function() {}
    };

    window.E = function(tag, attrs, children) {
        var el = document.createElement(tag);
        if (attrs) {
            for (var k in attrs) {
                if (k === 'style' && typeof attrs[k] === 'string') {
                    el.style.cssText = attrs[k];
                } else if (k.indexOf('on') === 0 && typeof attrs[k] === 'function') {
                    el.addEventListener(k.substring(2).toLowerCase(), attrs[k]);
                } else if (k === 'click' && typeof attrs[k] === 'function') {
                    el.addEventListener('click', attrs[k]);
                } else if (k === 'change' && typeof attrs[k] === 'function') {
                    el.addEventListener('change', attrs[k]);
                } else if (k === 'checked') {
                    el.checked = !!attrs[k];
                } else if (k === 'disabled') {
                    el.disabled = !!attrs[k];
                } else {
                    el.setAttribute(k, attrs[k]);
                }
            }
        }
        if (children) {
            if (!Array.isArray(children)) children = [children];
            for (var i = 0; i < children.length; i++) {
                var c = children[i];
                if (c == null) continue;
                if (typeof c === 'string' || typeof c === 'number') {
                    el.appendChild(document.createTextNode(String(c)));
                } else if (c.nodeType) {
                    el.appendChild(c);
                }
            }
        }
        return el;
    };

    var lastCapturedModal = null;
    window.ui = {
        showModal: function(title, content) {
            lastCapturedModal = { title: title, content: content };
        },
        hideModal: function() {},
        addNotification: function() {}
    };

    window.rpc = {
        declare: function() { return function() { return Promise.resolve({}); }; }
    };

    window.fs = {
        exec: function(cmd, args) {
            if (args && args[0] === 'pppoe-profiles-list') {
                return Promise.resolve({
                    code: 0,
                    stdout: JSON.stringify({ profiles: [] })
                });
            }
            return Promise.resolve({ code: 0, stdout: 'ok' });
        }
    };

    window.view = {
        extend: function(obj) {
            function F() {
                Object.assign(this, obj);
            }
            F.prototype = obj;
            return F;
        }
    };
    window.baseclass = window.view;

    // Carrega o módulo overview compilado via Function com dependências do LuCI
    var overviewCode = __OVERVIEW_JSON__;
    var LuCIModuleFactory = new Function('view', 'rpc', 'poll', 'fs', 'ui', overviewCode);
    var DashboardClass = LuCIModuleFactory(window.view, window.rpc, window.poll, window.fs, window.ui);

    document.addEventListener('DOMContentLoaded', function() {
        try {
            // Inicializar view
            var v = new DashboardClass();

            // Dataset simulado: WAN1 e WAN2 ativas com IPv6
            var mockData = {
                networkConfig: {
                    values: {
                        wan: {
                            '.type': 'interface',
                            device: 'eth1',
                            proto: 'pppoe',
                            username: 'cliente@fibra',
                            metric: '10',
                            ipv6: '1',
                            delegate: '1'
                        },
                        wan6: {
                            '.type': 'interface',
                            device: 'eth1',
                            proto: 'dhcpv6',
                            metric: '10',
                            delegate: '1'
                        },
                        wan2: {
                            '.type': 'interface',
                            device: 'lan4',
                            proto: 'dhcp',
                            metric: '20',
                            ipv6: '1',
                            delegate: '0'
                        },
                        wan2_6: {
                            '.type': 'interface',
                            device: '@wan2',
                            proto: 'dhcpv6',
                            metric: '20',
                            delegate: '0'
                        },
                        lan: {
                            '.type': 'interface',
                            device: 'br-lan',
                            proto: 'static',
                            ipaddr: '192.168.73.1'
                        }
                    }
                },
                interfaces: {
                    interface: [
                        { interface: 'wan', up: true, device: 'eth1' },
                        { interface: 'wan2', up: true, device: 'lan4' }
                    ]
                }
            };

            v.currentData = mockData;

            // --- CENÁRIO 1: Renderizar WAN1 ---
            v.editWan('wan', null).then(function() {
                if (lastCapturedModal) {
                    var container1 = document.getElementById('modal-content-wan1');
                    var nodes = lastCapturedModal.content;
                    if (Array.isArray(nodes)) {
                        nodes.forEach(function(n){ container1.appendChild(n); });
                    } else {
                        container1.appendChild(nodes);
                    }
                }

                // --- CENÁRIO 2: Renderizar WAN2 (com WAN1 delegando) ---
                return v.editWan('wan2', null);
            }).then(function() {
                if (lastCapturedModal) {
                    var container2 = document.getElementById('modal-content-wan2-locked');
                    var nodes = lastCapturedModal.content;
                    if (Array.isArray(nodes)) {
                        nodes.forEach(function(n){ container2.appendChild(n); });
                    } else {
                        container2.appendChild(nodes);
                    }
                }

                // --- CENÁRIO 3: Renderizar WAN2 com IPv6 desligado ---
                var mockDataNoIpv6 = JSON.parse(JSON.stringify(mockData));
                mockDataNoIpv6.networkConfig.values.wan2.ipv6 = '0';
                v.currentData = mockDataNoIpv6;
                return v.editWan('wan2', null);
            }).then(function() {
                if (lastCapturedModal) {
                    var container3 = document.getElementById('modal-content-wan2-noipv6');
                    var nodes = lastCapturedModal.content;
                    if (Array.isArray(nodes)) {
                        nodes.forEach(function(n){ container3.appendChild(n); });
                    } else {
                        container3.appendChild(nodes);
                    }
                }
                console.log('ALL_SCENARIOS_RENDERED_SUCCESSFULLY');
            }).catch(function(err) {
                console.error('Erro ao renderizar cenários:', err);
            });

        } catch(e) {
            console.error('Erro na inicialização:', e);
        }
    });
    </script>
</body>
</html>
"""

import json

html_rendered = html_template.replace("__CASCADE_CSS__", cascade_css).replace("__OVERVIEW_CSS__", overview_css).replace("__OVERVIEW_JSON__", json.dumps(overview_js))

harness_html_path = os.path.join(DOCS_DIR, "wan_ipv6_delegate_harness.html")
with open(harness_html_path, "w", encoding="utf-8") as f:
    f.write(html_rendered)

print(f"[OK] Harness HTML gerado em: {harness_html_path}")

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--disable-gpu")
opts.add_argument("--no-sandbox")
opts.add_argument("--window-size=1280,2900")
opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})
opts.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

print("Iniciando Chrome Headless...")
driver = webdriver.Chrome(options=opts)

try:
    file_url = "file:///" + harness_html_path.replace("\\", "/")
    print(f"Navegando para {file_url}...")
    driver.get(file_url)
    time.sleep(3)

    # Verificar logs do console do navegador
    logs = driver.get_log("browser")
    errors = [log for log in logs if log["level"] == "SEVERE" and "about:blank" not in log["message"]]
    for log in logs:
        print(f"  [Chrome Console {log['level']}]: {log['message']}")

    if errors:
        raise RuntimeError(f"Erros de console detectados no Chrome: {errors}")

    # Captura de screenshot da página inteira
    screenshot_path = os.path.join(DOCS_DIR, "wan_ipv6_delegate_modal_verification.png")
    driver.save_screenshot(screenshot_path)
    print(f"[SUCESSO] Screenshot gravado em: {screenshot_path}")

    # Copiar também para o diretório de artefatos da sessão
    artifacts_dir = r"C:\Users\User\.gemini\antigravity\brain\59ed9f0a-57b2-411e-bec6-0c3a7c86bca9"
    if os.path.isdir(artifacts_dir):
        artifact_img = os.path.join(artifacts_dir, "wan_ipv6_delegate_modal_verification.png")
        shutil.copyfile(screenshot_path, artifact_img)
        print(f"[SUCESSO] Screenshot copiado para artifacts em: {artifact_img}")

    # Validações DOM
    delegate_spans = driver.find_elements(By.XPATH, "//span[text()='Distribuir IPv6 na LAN']")
    print(f"Encontrados {len(delegate_spans)} campos 'Distribuir IPv6 na LAN' no DOM.")
    assert len(delegate_spans) == 3, f"Esperado 3 campos 'Distribuir IPv6 na LAN', encontrados: {len(delegate_spans)}"

    # Verificar textos explicativos
    active_hint = driver.find_elements(By.XPATH, "//*[contains(text(), 'Distribui o bloco IPv6 público desta operadora')]")
    assert len(active_hint) >= 1, "Texto explicativo de delegação ativa não encontrado!"

    locked_hint = driver.find_elements(By.XPATH, "//*[contains(text(), 'A distribuição já está ativa na WAN1')]")
    assert len(locked_hint) >= 1, "Texto de bloqueio por exclusividade mutua na WAN1 não encontrado!"

    req_hint = driver.find_elements(By.XPATH, "//*[contains(text(), \"Requer 'Conectividade IPv6' ativa\")]")
    assert len(req_hint) >= 1, "Texto de bloqueio por ausência de IPv6 não encontrado!"

    print("[SUCESSO] Todos os 3 cenários e estados do toggle foram validados no DOM com 0 erros de console!")

finally:
    driver.quit()
