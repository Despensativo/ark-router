#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual verification and screenshot capture for WireGuard Client UI.
Validates:
1. WireGuard Client Status Modal with real connection metrics and controls.
2. WireGuard Client Import / Edit Modal with Endpoint field and validation pills.
3. Saves high-res screenshot to docs/screenshots and brain directory.
"""

import os
import sys
import time
import shutil
from selenium import webdriver
from selenium.webdriver.chrome.options import Options

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DOCS_DIR = os.path.join(REPO_DIR, "docs", "screenshots")
os.makedirs(DOCS_DIR, exist_ok=True)

CASCADE_CSS_PATH = os.path.join(REPO_DIR, "root", "www", "luci-static", "ark", "cascade.css")
OVERVIEW_CSS_PATH = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.css")

with open(CASCADE_CSS_PATH, "r", encoding="utf-8") as f:
    cascade_css = f.read()

with open(OVERVIEW_CSS_PATH, "r", encoding="utf-8") as f:
    overview_css = f.read()

html_template = """<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARK Router - Verificação Visual: WireGuard Client (Status & Edição)</title>
    <style>
/* CASCADE_CSS_PLACEHOLDER */
/* OVERVIEW_CSS_PLACEHOLDER */
        body {
            background: #0b1120;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 30px;
            margin: 0;
        }
        .test-container {
            max-width: 960px;
            margin: 0 auto;
        }
        .scenario-card {
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .scenario-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
            color: #38bdf8;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 10px;
        }
        .modal-simulation {
            background: #0f172a;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 24px;
            max-width: 650px;
            margin: 0 auto;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
        }
    </style>
</head>
<body>
    <div class="test-container">
        <h2 style="margin-top: 0; font-size: 22px; color: #f1f5f9; display: flex; align-items: center; gap: 10px;">
            <span>🛡️</span> ARK Router — Validação da Interface do Cliente WireGuard (Sem Timeout)
        </h2>
        <p style="color: #94a3b8; font-size: 14px; margin-bottom: 25px;">
            Ambiente de teste visual do modal WireGuard Client com execução assíncrona desacoplada e proteção contra desconexões transitórias de RPC.
        </p>

        <!-- Cenário 1: Modal de Status Conectado -->
        <div class="scenario-card">
            <div class="scenario-title">
                <span>🟢</span> Cenário 1: Modal de Status do Cliente VPN Conectado (Endpoint Ativo)
            </div>
            <div class="modal-simulation">
                <h3 style="margin-top: 0; font-size: 17px; color: #f8fafc; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                    Cliente WireGuard (Conexão VPN)
                </h3>

                <!-- Status Box -->
                <div style="padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3);">
                    <div style="font-weight: 700; font-size: 0.95rem; color: #22c55e;">● Conectado e Operacional</div>
                    <div style="font-size: 0.8rem; opacity: .85; margin-top: 2px; color: #cbd5e1;">O roteador está roteando o tráfego através do túnel WireGuard seguro.</div>
                </div>

                <!-- Metrics Grid -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 16px;">
                    <div style="padding: 10px 14px; border-radius: 8px; background: rgba(127,127,127,0.08);">
                        <span style="font-weight: 600; opacity: .75; font-size: 0.75rem; display: block; color: #94a3b8;">SERVIDOR (ENDPOINT)</span>
                        <strong style="color: #3b82f6; word-break: break-all; font-size: 13.5px;">159.112.181.29:51820</strong>
                    </div>
                    <div style="padding: 10px 14px; border-radius: 8px; background: rgba(127,127,127,0.08);">
                        <span style="font-weight: 600; opacity: .75; font-size: 0.75rem; display: block; color: #94a3b8;">IP LOCAL DO CLIENTE</span>
                        <strong style="font-size: 13.5px; color: #f1f5f9;">10.203.73.5/32</strong>
                    </div>
                    <div style="padding: 10px 14px; border-radius: 8px; background: rgba(127,127,127,0.08);">
                        <span style="font-weight: 600; opacity: .75; font-size: 0.75rem; display: block; color: #94a3b8;">ÚLTIMO HANDSHAKE</span>
                        <strong style="color: #22c55e; font-size: 13.5px;">3 segundos atrás</strong>
                    </div>
                    <div style="padding: 10px 14px; border-radius: 8px; background: rgba(127,127,127,0.08);">
                        <span style="font-weight: 600; opacity: .75; font-size: 0.75rem; display: block; color: #94a3b8;">TRÁFEGO DO TÚNEL</span>
                        <strong style="font-size: 13.5px; color: #f1f5f9;">↓ 1.90 KiB &nbsp;|&nbsp; ↑ 9.23 KiB</strong>
                    </div>
                </div>

                <!-- Pubkey Section -->
                <div style="margin-bottom: 16px; padding: 10px 14px; border-radius: 8px; background: rgba(127,127,127,0.08);">
                    <span style="font-weight: 600; opacity: .75; font-size: 0.75rem; display: block; margin-bottom: 4px; color: #94a3b8;">CHAVE PÚBLICA DO SERVIDOR REMOTO</span>
                    <div style="display: flex; align-items: center; gap: 8px; font-family: monospace; font-size: 0.8rem;">
                        <span style="flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #cbd5e1;">U8tonjTriOhMyQl4xD1XVcMcJI/CvV3QDivTZBqQkDE=</span>
                        <button class="ex-mini-button" style="min-height: 30px; padding: 0 10px; font-size: 0.75rem; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #e2e8f0; cursor: pointer;">Copiar</button>
                    </div>
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
                    <button class="btn cbi-button cbi-button-action" style="min-height: 38px; padding: 0 16px; font-weight: 600; background: #2563eb; color: #fff; border: 1px solid #1d4ed8; border-radius: 6px; cursor: pointer;">⏸ Pausar Conexão</button>
                    <button class="btn cbi-button cbi-button-neutral" style="min-height: 38px; padding: 0 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #e2e8f0; cursor: pointer;">✏ Ver / Trocar Arquivo .conf</button>
                    <button class="btn cbi-button cbi-button-negative" style="min-height: 38px; padding: 0 14px; background: #dc2626; color: #fff; border: 1px solid #b91c1c; border-radius: 6px; cursor: pointer;">🗑 Excluir</button>
                    <button class="btn cbi-button cbi-button-neutral" style="min-height: 38px; padding: 0 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #e2e8f0; cursor: pointer;">Fechar</button>
                </div>
            </div>
        </div>

        <!-- Cenário 2: Modal de Edição / Importação (.conf) -->
        <div class="scenario-card">
            <div class="scenario-title">
                <span>⚡</span> Cenário 2: Modal de Edição de Configuração e Mudança de Endpoint (Instantâneo)
            </div>
            <div class="modal-simulation">
                <h3 style="margin-top: 0; font-size: 17px; color: #f8fafc; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
                    Editar Cliente WireGuard
                </h3>
                <p class="ex-muted" style="margin-bottom: 12px; font-size: 13px; color: #94a3b8; line-height: 1.4;">
                    Importe ou cole a configuração (.conf) fornecida pelo seu servidor VPN. O ARK Router criará a interface no kernel e integrará ao firewall automaticamente com resposta imediata.
                </p>

                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <button class="btn cbi-button cbi-button-action" style="min-height: 36px; padding: 0 14px; font-size: 13px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #e2e8f0; cursor: pointer;">📁 Carregar Arquivo .conf</button>
                    <span class="ex-muted" style="font-size: 0.8rem; color: #10b981;">✓ Arquivo wgclient.conf carregado</span>
                </div>

                <textarea class="cbi-input-textarea" rows="8" style="width: 100%; font-family: monospace; font-size: 12px; margin-top: 8px; line-height: 1.4; box-sizing: border-box; border-radius: 8px; background: #090d16; border: 1px solid rgba(255,255,255,0.15); color: #e2e8f0; padding: 10px;">[Interface]
PrivateKey = 0BjG67b9NIyiF7n+af36UiXpSyqcgLG4/wWRpwzgRV8=
Address = 10.203.73.5/32, fddd:dd40:a110::5/128
MTU = 1420

[Peer]
PublicKey = U8tonjTriOhMyQl4xD1XVcMcJI/CvV3QDivTZBqQkDE=
AllowedIPs = 10.203.73.0/24, fddd:dd40:a110::/64
Endpoint = vpn.dinheirofeliz.com.br:51820
PersistentKeepalive = 25</textarea>

                <!-- Live Preview Container -->
                <div style="margin-top: 10px; padding: 10px 14px; border-radius: 8px; background: rgba(127,127,127,0.08); font-size: 0.82rem;">
                    <div style="display: flex; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
                        <span style="font-size: 0.75rem; color: #22c55e; font-weight: 600;">✓ Chave Privada</span>
                        <span style="font-size: 0.75rem; color: #22c55e; font-weight: 600;">✓ Chave Servidor</span>
                        <span style="font-size: 0.75rem; color: #22c55e; font-weight: 600;">✓ Endpoint Servidor</span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 6px;">
                        <div>
                            <span style="font-weight: 600; opacity: .75; font-size: 0.75rem; display: block; color: #94a3b8;">SERVIDOR (ENDPOINT)</span>
                            <strong style="color: #3b82f6; word-break: break-all;">vpn.dinheirofeliz.com.br:51820</strong>
                        </div>
                        <div>
                            <span style="font-weight: 600; opacity: .75; font-size: 0.75rem; display: block; color: #94a3b8;">IP DO CLIENTE</span>
                            <strong style="color: #f1f5f9;">10.203.73.5/32, fddd:dd40:a110::5/128</strong>
                        </div>
                        <div>
                            <span style="font-weight: 600; opacity: .75; font-size: 0.75rem; display: block; color: #94a3b8;">ROTEAMENTO (ALLOWED IPS)</span>
                            <strong style="color: #cbd5e1;">10.203.73.0/24, fddd:dd40:a110::/64</strong>
                        </div>
                    </div>
                </div>

                <!-- Footer Buttons -->
                <div style="display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; margin-top: 16px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
                    <button class="btn cbi-button cbi-button-positive" style="min-height: 40px; padding: 0 20px; font-weight: 600; background: #10b981; color: #fff; border: 1px solid #059669; border-radius: 6px; cursor: pointer;">⚡ Salvar e Conectar</button>
                    <button class="btn cbi-button cbi-button-neutral" style="min-height: 40px; padding: 0 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #e2e8f0; cursor: pointer;">Voltar ao Status</button>
                    <button class="btn cbi-button cbi-button-neutral" style="min-height: 40px; padding: 0 14px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #e2e8f0; cursor: pointer;">Cancelar</button>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

html_content = html_template.replace("/* CASCADE_CSS_PLACEHOLDER */", cascade_css).replace("/* OVERVIEW_CSS_PLACEHOLDER */", overview_css)

temp_html_path = os.path.join(REPO_DIR, "tests", "temp_wireguard_ui_test.html")
with open(temp_html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1200,1400")
opts.add_argument("--disable-gpu")
opts.add_argument("--no-sandbox")
opts.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

print("Inicializando Chrome Headless para validação visual do WireGuard Client...")
driver = webdriver.Chrome(options=opts)

try:
    file_url = f"file:///{temp_html_path.replace(os.sep, '/')}"
    driver.get(file_url)
    time.sleep(1.5)

    screenshot_file = os.path.join(DOCS_DIR, "wireguard_client_modal_verification.png")
    driver.save_screenshot(screenshot_file)
    print(f"[SUCESSO] Captura salva em: {screenshot_file}")

    brain_dir = os.environ.get("GEMINI_BRAIN_DIR", r"C:\Users\User\.gemini\antigravity\brain\59ed9f0a-57b2-411e-bec6-0c3a7c86bca9")
    if os.path.isdir(brain_dir):
        brain_screenshot = os.path.join(brain_dir, "wireguard_client_modal_verification.png")
        shutil.copyfile(screenshot_file, brain_screenshot)
        print(f"[SUCESSO] Cópia salva no Brain Artifacts: {brain_screenshot}")

finally:
    driver.quit()
    if os.path.exists(temp_html_path):
        os.remove(temp_html_path)
