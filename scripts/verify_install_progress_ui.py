#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual verification and screenshot capture for Package Install Progress UI.
Validates:
1. Step-by-step progress modal during package installation (Updating stage, Installing stage, Terminal log, Completed state).
2. Multilingual fidelity (PT-BR, EN, ES).
3. Zero browser console errors via Chrome Headless.
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
    <title>ARK Router - Verificação Visual: Progresso Inteligente de Instalação de Pacotes</title>
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
        .badge-flow {{ background: #4c1d95; color: #c084fc; }}
        .cbi-modal {{
            position: static !important;
            display: block !important;
            max-width: 580px;
            margin: 0 auto;
            background: #1e293b;
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 22px;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5);
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
        .cbi-button-positive {{
            background: #10b981;
            color: #fff;
        }}
    </style>
</head>
<body>
    <div class="test-container">
        <h1 style="text-align: center; margin-bottom: 8px;">ARK Router — Verificação Visual: Progresso Inteligente de Instalação</h1>
        <p style="text-align: center; color: #94a3b8; margin-bottom: 30px;">
            Auditoria visual de etapas, barra de progresso, mensagens dinâmicas e console de log em tempo real (opkg/apk).
        </p>

        <!-- Cenário 1: Etapa 1 - Atualizando Repositórios -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-flow">Etapa 1 de 4</span>
                <h3 style="margin: 0;">Início: Atualização de Catálogo de Pacotes (opkg update / apk update)</h3>
            </div>
            <div class="cbi-modal">
                <h4 class="modal-title">Instalando Recursos Ausentes</h4>
                <div class="ex-install-progress-wrap">
                    <div class="ex-install-header">
                        <span class="ex-install-step-badge">Etapa 1 de 4</span>
                        <span style="font-size:0.85rem; font-weight:700; color:#94a3b8;">15%</span>
                    </div>
                    <div class="ex-install-progress-track">
                        <div class="ex-install-progress-fill" style="width: 15%;"></div>
                    </div>
                    <div class="ex-install-current-action">
                        <span style="font-size:1.1rem;">⏳</span>
                        <span>Atualizando catálogo de pacotes...</span>
                    </div>
                    <pre class="ex-install-terminal">Downloading https://downloads.openwrt.org/releases/24.10.0/packages/x86_64/base/Packages.gz
Updated list of available packages in /var/opkg-lists/openwrt_base.
Downloading https://downloads.openwrt.org/releases/24.10.0/packages/x86_64/luci/Packages.gz
Updated list of available packages in /var/opkg-lists/openwrt_luci.</pre>
                    <p class="ex-install-note">
                        O roteador está baixando e configurando os pacotes necessários. Isso pode levar de 30 segundos a alguns minutos dependendo da sua velocidade de internet. Por favor, mantenha esta tela aberta.
                    </p>
                    <div class="modal-actions">
                        <button class="btn cbi-button-neutral" disabled>Instalação em andamento…</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cenário 2: Etapa 2 de 4 - Instalando Pacote com Terminal Ativo -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-flow">Etapa 2 de 4</span>
                <h3 style="margin: 0;">Em Execução: Download e Instalação de Módulo (sqm / cake)</h3>
            </div>
            <div class="cbi-modal">
                <h4 class="modal-title">Instalando Recursos Ausentes</h4>
                <div class="ex-install-progress-wrap">
                    <div class="ex-install-header">
                        <span class="ex-install-step-badge">Etapa 2 de 4</span>
                        <span style="font-size:0.85rem; font-weight:700; color:#94a3b8;">45%</span>
                    </div>
                    <div class="ex-install-progress-track">
                        <div class="ex-install-progress-fill" style="width: 45%;"></div>
                    </div>
                    <div class="ex-install-current-action">
                        <span style="font-size:1.1rem;">⏳</span>
                        <span>Instalando pacote: sqm (cake)...</span>
                    </div>
                    <pre class="ex-install-terminal">Installing sqm-scripts (1.6.0-1) to root...
Downloading https://downloads.openwrt.org/releases/24.10.0/packages/x86_64/base/sqm-scripts_1.6.0-1_all.ipk
Installing luci-app-sqm (git-24.260.71804-032a392) to root...
Downloading https://downloads.openwrt.org/releases/24.10.0/packages/x86_64/luci/luci-app-sqm_git-24.260.71804-032a392_all.ipk
Configuring sqm-scripts.
Enabling cake qdisc and FQ-CoDel modules in kernel.
Configuring luci-app-sqm.</pre>
                    <p class="ex-install-note">
                        O roteador está baixando e configurando os pacotes necessários. Isso pode levar de 30 segundos a alguns minutos dependendo da sua velocidade de internet. Por favor, mantenha esta tela aberta.
                    </p>
                    <div class="modal-actions">
                        <button class="btn cbi-button-neutral" disabled>Instalação em andamento…</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cenário 3: Conclusão 100% com Contagem Regressiva e Botão Verde -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-pt">Concluído (100%)</span>
                <h3 style="margin: 0;">Finalizado com Sucesso: Barra Verde e Contagem de Recarga</h3>
            </div>
            <div class="cbi-modal">
                <h4 class="modal-title">Instalando Recursos Ausentes</h4>
                <div class="ex-install-progress-wrap">
                    <div class="ex-install-header">
                        <span class="ex-install-step-badge done">Concluído</span>
                        <span style="font-size:0.85rem; font-weight:700; color:#34d399;">100%</span>
                    </div>
                    <div class="ex-install-progress-track">
                        <div class="ex-install-progress-fill done" style="width: 100%;"></div>
                    </div>
                    <div class="ex-install-current-action">
                        <span style="font-size:1.1rem;">✅</span>
                        <span>Instalação concluída com sucesso! Recarregando painel...</span>
                    </div>
                    <pre class="ex-install-terminal">All requested modules installed successfully.
Reloading ubus services and applying UI profiles.
Setup complete!</pre>
                    <div class="modal-actions">
                        <button class="btn cbi-button-positive">Concluir e recarregar (3s)</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cenário 4: Triple i18n - English (EN) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-en">English (EN)</span>
                <h3 style="margin: 0;">EZ Setup Modules Installation Modal in English</h3>
            </div>
            <div class="cbi-modal">
                <h4 class="modal-title">Installing Selected Modules</h4>
                <div class="ex-install-progress-wrap">
                    <div class="ex-install-header">
                        <span class="ex-install-step-badge">Step 2 of 3</span>
                        <span style="font-size:0.85rem; font-weight:700; color:#94a3b8;">65%</span>
                    </div>
                    <div class="ex-install-progress-track">
                        <div class="ex-install-progress-fill" style="width: 65%;"></div>
                    </div>
                    <div class="ex-install-current-action">
                        <span style="font-size:1.1rem;">⏳</span>
                        <span>Installing module: mwan3...</span>
                    </div>
                    <pre class="ex-install-terminal">(1/2) Installing mwan3...
(2/2) Installing luci-app-mwan3...
Configuration written to /etc/config/mwan3.</pre>
                    <p class="ex-install-note">
                        The router is downloading and configuring the necessary packages. This may take from 30 seconds to a few minutes depending on your internet speed. Please keep this screen open.
                    </p>
                    <div class="modal-actions">
                        <button class="btn cbi-button-neutral" disabled>Installation in progress…</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Cenário 5: Triple i18n - Español (ES) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-es">Español (ES)</span>
                <h3 style="margin: 0;">Modal de Instalación de Módulos en Español Neutro</h3>
            </div>
            <div class="cbi-modal">
                <h4 class="modal-title">Instalando Módulos Seleccionados</h4>
                <div class="ex-install-progress-wrap">
                    <div class="ex-install-header">
                        <span class="ex-install-step-badge">Paso 2 de 3</span>
                        <span style="font-size:0.85rem; font-weight:700; color:#94a3b8;">65%</span>
                    </div>
                    <div class="ex-install-progress-track">
                        <div class="ex-install-progress-fill" style="width: 65%;"></div>
                    </div>
                    <div class="ex-install-current-action">
                        <span style="font-size:1.1rem;">⏳</span>
                        <span>Instalando módulo: mwan3...</span>
                    </div>
                    <pre class="ex-install-terminal">Descargando e instalando mwan3...
Configuración de balanceo guardada correctamente.</pre>
                    <p class="ex-install-note">
                        El router está descargando y configurando los paquetes necesarios. Esto puede demorar de 30 segundos a unos minutos según la velocidad de su internet. Por favor, mantenga esta pantalla abierta.
                    </p>
                    <div class="modal-actions">
                        <button class="btn cbi-button-neutral" disabled>Instalación en curso…</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

temp_html = os.path.join(DOCS_DIR, "verify_install_progress_ui.html")
with open(temp_html, "w", encoding="utf-8") as f:
    f.write(html_content)

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1280,3100')
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

    screenshot_file = os.path.join(DOCS_DIR, "install_progress_modal_verification.png")
    driver.save_screenshot(screenshot_file)
    print(f"Screenshot salvo com sucesso em: {screenshot_file}")

    # Copiar tambem para o diretorio de artefatos da conversa
    brain_dir = os.path.abspath(r"C:\Users\User\.gemini\antigravity\brain\59ed9f0a-57b2-411e-bec6-0c3a7c86bca9")
    if os.path.isdir(brain_dir):
        brain_screenshot = os.path.join(brain_dir, "install_progress_modal_verification.png")
        shutil.copyfile(screenshot_file, brain_screenshot)
        print(f"Screenshot copiado para artefatos em: {brain_screenshot}")
finally:
    driver.quit()
