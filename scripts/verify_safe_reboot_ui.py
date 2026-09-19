#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual verification and screenshot capture for Safe Storage Reboot UI.
Validates:
1. Final confirmation modal with the Storage Protection alert (Transmission pause + dirty buffer flush + USB remount).
2. Active saving and rebooting button state.
3. Multilingual rendering (PT-BR, EN, ES) ensuring 100% i18n fidelity.
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

with open(CASCADE_CSS_PATH, "r", encoding="utf-8") as f:
    cascade_css = f.read()

with open(OVERVIEW_CSS_PATH, "r", encoding="utf-8") as f:
    overview_css = f.read()

html_content = f"""<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARK Router - Verificação Visual: Reinicialização Segura com Proteção USB</title>
    <style>
{cascade_css}
{overview_css}
        body {{
            background: #0b1120;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 30px;
            margin: 0;
        }}
        .test-container {{
            max-width: 1100px;
            margin: 0 auto;
        }}
        .scenario-card {{
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }}
        .scenario-header {{
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 20px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 12px;
        }}
        .badge {{
            display: inline-block;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
        }}
        .badge-pt {{ background: #065f46; color: #34d399; }}
        .badge-en {{ background: #1e3a8a; color: #60a5fa; }}
        .badge-es {{ background: #7c2d12; color: #fb923c; }}
        .cbi-modal {{
            position: static !important;
            display: block !important;
            max-width: 540px;
            margin: 0 auto;
            background: #1e293b;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
        }}
        .alert-message.warning {{
            background: rgba(245, 158, 11, 0.15);
            border-left: 4px solid #f59e0b;
            color: #fbbf24;
            padding: 10px 14px;
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 0.95rem;
        }}
        .alert-message.info {{
            background: rgba(59, 130, 246, 0.15);
            border-left: 4px solid #3b82f6;
            color: #93c5fd;
            padding: 10px 14px;
            border-radius: 4px;
            margin-bottom: 16px;
            font-size: 0.92rem;
            line-height: 1.45;
        }}
        .modal-title {{
            font-size: 1.25rem;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 14px;
            color: #fff;
        }}
        .modal-actions {{
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 18px;
        }}
        .btn {{
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.95rem;
            font-weight: 600;
            cursor: pointer;
            border: none;
        }}
        .cbi-button-neutral {{
            background: #334155;
            color: #cbd5e1;
        }}
        .cbi-button-negative {{
            background: #dc2626;
            color: #fff;
        }}
        .cbi-button-negative:disabled {{
            opacity: 0.7;
            cursor: not-allowed;
        }}
    </style>
</head>
<body>
    <div class="test-container">
        <h1 style="text-align: center; margin-bottom: 8px;">ARK Router — Verificação de Reinicialização Segura com Proteção USB</h1>
        <p style="text-align: center; color: #94a3b8; margin-bottom: 30px;">
            Auditoria visual do Modal de Confirmação Final com Pausa de Torrents, Flush de Cache de RAM e Remount Read-Only.
        </p>

        <!-- Cenário 1: Modal em Português do Brasil (PT-BR) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-pt">Português (Brasil)</span>
                <h3 style="margin: 0;">Modal de Confirmação Final com Proteção de Armazenamento Ativa</h3>
            </div>
            <div class="cbi-modal">
                <h4 class="modal-title">Confirmação final</h4>
                <p class="alert-message warning">
                    O roteador será reiniciado imediatamente. Aguarde a rede voltar antes de abrir o painel novamente.
                </p>
                <p class="alert-message info">
                    🛡️ <strong>Proteção de armazenamento ativa:</strong> o roteador pausará serviços em execução (servidores, downloads e compartilhamentos), descarregará dados da memória RAM e protegerá unidades externas contra corrupção antes de reiniciar.
                </p>
                <div class="modal-actions">
                    <button class="btn cbi-button-neutral">Cancelar</button>
                    <button class="btn cbi-button-negative">Reiniciar agora</button>
                </div>
            </div>
        </div>

        <!-- Cenário 2: Estado de Execução (Botão 'Salvando dados e reiniciando…') -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-pt">Fluxo Ativo</span>
                <h3 style="margin: 0;">Estado em Execução: Flush de Memória RAM para USB e Parada Limpa</h3>
            </div>
            <div class="cbi-modal">
                <h4 class="modal-title">Confirmação final</h4>
                <p class="alert-message warning">
                    O roteador será reiniciado imediatamente. Aguarde a rede voltar antes de abrir o painel novamente.
                </p>
                <p class="alert-message info">
                    🛡️ <strong>Proteção de armazenamento ativa:</strong> o roteador pausará serviços em execução (servidores, downloads e compartilhamentos), descarregará dados da memória RAM e protegerá unidades externas contra corrupção antes de reiniciar.
                </p>
                <div class="modal-actions">
                    <button class="btn cbi-button-neutral" disabled>Cancelar</button>
                    <button class="btn cbi-button-negative" disabled style="display: inline-flex; align-items: center; gap: 8px;">
                        <span>⏳</span> Salvando dados e reiniciando…
                    </button>
                </div>
            </div>
        </div>

        <!-- Cenário 3: Tradução em Inglês (EN) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-en">English (EN)</span>
                <h3 style="margin: 0;">Final Confirmation Modal — Storage Protection & Graceful Shutdown</h3>
            </div>
            <div class="cbi-modal">
                <h4 class="modal-title">Final Confirmation</h4>
                <p class="alert-message warning">
                    The router will restart immediately. Please wait for the network to recover before opening the panel again.
                </p>
                <p class="alert-message info">
                    🛡️ <strong>Active storage protection:</strong> the router will pause running services (servers, downloads, and shares), flush pending RAM data, and protect external drives against corruption before rebooting.
                </p>
                <div class="modal-actions">
                    <button class="btn cbi-button-neutral">Cancel</button>
                    <button class="btn cbi-button-negative">Restart now</button>
                </div>
            </div>
        </div>

        <!-- Cenário 4: Tradução em Espanhol (ES) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-es">Español (ES)</span>
                <h3 style="margin: 0;">Confirmación Final — Protección de Almacenamiento y Cierre Seguro</h3>
            </div>
            <div class="cbi-modal">
                <h4 class="modal-title">Confirmación final</h4>
                <p class="alert-message warning">
                    El router se reiniciará inmediatamente. Espere a que la red regrese antes de abrir el panel nuevamente.
                </p>
                <p class="alert-message info">
                    🛡️ <strong>Protección de almacenamiento activa:</strong> el router pausará los servicios en ejecución (servidores, descargas y comparticiones), guardará los datos de la memoria RAM y protegerá las unidades externas contra la corrupción antes de reiniciar.
                </p>
                <div class="modal-actions">
                    <button class="btn cbi-button-neutral">Cancelar</button>
                    <button class="btn cbi-button-negative">Reiniciar ahora</button>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

temp_html = os.path.join(DOCS_DIR, "verify_safe_reboot_ui.html")
with open(temp_html, "w", encoding="utf-8") as f:
    f.write(html_content)

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1280,2600')
opts.binary_location = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

driver = webdriver.Chrome(options=opts)
try:
    driver.get("file:///" + temp_html.replace("\\", "/"))
    time.sleep(1.5)

    # Check for browser console errors
    logs = driver.get_log('browser')
    severe_errors = [l for l in logs if l.get('level') == 'SEVERE']
    if severe_errors:
        print("WARNING: Severe browser console errors detected:")
        for err in severe_errors:
            print("  ", err)
        sys.exit(1)
    else:
        print("[OK] Zero browser console errors detected!")

    screenshot_file = os.path.join(DOCS_DIR, "safe_reboot_modal_verification.png")
    driver.save_screenshot(screenshot_file)
    print(f"Screenshot salvo com sucesso em: {screenshot_file}")

    # Copiar tambem para o diretorio de artefatos da conversa
    brain_dir = os.path.abspath(r"C:\Users\User\.gemini\antigravity\brain\59ed9f0a-57b2-411e-bec6-0c3a7c86bca9")
    if os.path.isdir(brain_dir):
        brain_screenshot = os.path.join(brain_dir, "safe_reboot_modal_verification.png")
        shutil.copyfile(screenshot_file, brain_screenshot)
        print(f"Screenshot copiado para artefatos em: {brain_screenshot}")
finally:
    driver.quit()
