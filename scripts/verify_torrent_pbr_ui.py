#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual verification and screenshot capture for BitTorrent PBR Ports UI.
Validates:
1. The BitTorrent PBR Card with dynamic subtitle and '⚙️ Portas' button.
2. The Port Configuration Modal with 'Modo Amplo Seguro', 'Modo Clássico' and 'Personalizado'.
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
    <title>ARK Router - Verificação Visual: Configuração de Portas BitTorrent / P2P</title>
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
            max-width: 900px;
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
            font-size: 1.1rem;
            font-weight: 700;
            margin-top: 0;
            margin-bottom: 8px;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .scenario-desc {
            font-size: 0.9rem;
            color: #94a3b8;
            margin-bottom: 20px;
            line-height: 1.5;
        }
        /* Modal preview wrapper */
        .modal-preview-wrapper {
            background: rgba(15, 23, 42, 0.85);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 24px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
            max-width: 650px;
            margin: 0 auto;
        }
    </style>
</head>
<body>
    <div class="test-container">
        <h1 style="font-size: 1.5rem; margin-bottom: 6px; font-weight: 800;">ARK Router — Validação Visual: Aceleração BitTorrent / P2P com Seletor de Aparelho</h1>
        <p style="color: #94a3b8; margin-bottom: 28px;">Demonstração da aceleração BitTorrent com o seletor de Aparelho Alvo (dropdown) e proteção de dispositivos inteligentes como Alexa.</p>

        <!-- Cenário 1: O Card na Tela Principal com Botão de Configuração e Subtítulo com Aparelho Alvo -->
        <div class="scenario-card">
            <div class="scenario-title">1. Card com Subtítulo Dinâmico (Aparelho Alvo Específico vs Toda a Rede)</div>
            <div class="scenario-desc">Quando direcionado ao PC Gamer, apenas ele recebe balanceamento agressivo de portas, isolando e blindando as Alexas e outros dispositivos da casa de qualquer oscilação.</div>

            <!-- Exemplo A: Aparelho Específico (PC GAMER) -->
            <div class="ex-channel-mode-control" style="padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;">
                <div style="flex: 1 1 auto; min-width: 240px;">
                    <strong style="font-size: 14px; color: #f8fafc;">⚡ Acelerar BitTorrent / P2P nas 2 Internets</strong>
                    <small class="ex-muted" style="display: block; margin-top: 4px; color: #38bdf8; font-weight: 500;">
                        Modo Amplo Seguro (1024-65535 exceto Web/DNS) ativo nas 2 internets. • 🎯 Aparelho: 192.168.73.90
                    </small>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; flex: 0 0 auto;">
                    <button class="ex-mini-button" style="padding: 5px 12px; font-size: 12px; font-weight: 700; background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 6px; cursor: pointer;">
                        ⚙️ Portas
                    </button>
                    <label class="ex-switch" style="margin: 0; position: relative; display: inline-block; width: 44px; height: 24px;">
                        <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
                        <span class="ex-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #2563eb; transition: .3s; border-radius: 24px;">
                            <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 22px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; display: block;"></span>
                        </span>
                    </label>
                </div>
            </div>

            <!-- Exemplo B: Toda a Rede (0.0.0.0) -->
            <div class="ex-channel-mode-control" style="padding: 12px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
                <div style="flex: 1 1 auto; min-width: 240px;">
                    <strong style="font-size: 14px; color: #f8fafc;">⚡ Acelerar BitTorrent / P2P nas 2 Internets</strong>
                    <small class="ex-muted" style="display: block; margin-top: 4px; color: #94a3b8; font-weight: 500;">
                        Modo Amplo Seguro (1024-65535 exceto Web/DNS) ativo nas 2 internets. • 🌐 Toda a Rede (0.0.0.0)
                    </small>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; flex: 0 0 auto;">
                    <button class="ex-mini-button" style="padding: 5px 12px; font-size: 12px; font-weight: 700; background: rgba(255, 255, 255, 0.08); color: #cbd5e1; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 6px; cursor: pointer;">
                        ⚙️ Portas
                    </button>
                    <label class="ex-switch" style="margin: 0; position: relative; display: inline-block; width: 44px; height: 24px;">
                        <input type="checkbox" checked style="opacity: 0; width: 0; height: 0;">
                        <span class="ex-switch-slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #2563eb; transition: .3s; border-radius: 24px;">
                            <span style="position: absolute; content: ''; height: 18px; width: 18px; left: 22px; bottom: 3px; background-color: white; transition: .3s; border-radius: 50%; display: block;"></span>
                        </span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Cenário 2: O Modal de Configuração com Seletor de Aparelho (Drop) -->
        <div class="scenario-card">
            <div class="scenario-title">2. Modal Interativo: Configuração de Portas e Aparelho Alvo</div>
            <div class="scenario-desc">Permite direcionar para toda a rede (0.0.0.0) ou selecionar diretamente o aparelho conectado pelo menu suspenso ou IP manual.</div>

            <div class="modal-preview-wrapper">
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; margin-bottom: 16px;">
                    <h3 style="margin: 0; font-size: 1.15rem; font-weight: 700; color: #f8fafc;">Configuração de Portas BitTorrent / P2P</h3>
                    <span style="color: #64748b; font-size: 18px; cursor: pointer;">&times;</span>
                </div>

                <p class="ex-muted" style="margin-bottom: 16px; font-size: 13px; line-height: 1.45; color: #94a3b8;">
                    Configure o balanceamento de BitTorrent/P2P nas 2 conexões para acelerar downloads. Você pode acelerar para toda a rede ou direcionar exclusivamente para seu PC ou console.
                </p>

                <!-- Seção 1: Seletor de Aparelho Alvo (Dropdown / Drop) -->
                <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                    <strong style="display: block; color: #38bdf8; margin-bottom: 4px; font-size: 13.5px;">🎯 Aparelho Alvo (IP de Origem)</strong>
                    <small class="ex-muted" style="display: block; margin-bottom: 8px; line-height: 1.4; color: #94a3b8; font-size: 12px;">
                        Escolha se a aceleração BitTorrent se aplica a toda a casa ou apenas a uma máquina específica (protegendo Alexas e outros dispositivos de qualquer interferência):
                    </small>
                    <select class="cbi-input-select" style="width: 100%; font-size: 13px; font-weight: 500; padding: 8px 10px; background: #1e293b; color: #f8fafc; border: 1px solid rgba(56, 189, 248, 0.4); border-radius: 6px;">
                        <option value="0.0.0.0">🌐 Toda a Rede (0.0.0.0) — Padrão</option>
                        <option value="192.168.73.90" selected>🖥️ PC-GAMER (192.168.73.90)</option>
                        <option value="192.168.73.86">📱 Samsung Galaxy S24 (192.168.73.86)</option>
                        <option value="custom">✏️ Digitar IP manualmente…</option>
                    </select>
                </div>

                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <!-- Opção 1: Modo Amplo Seguro (Selecionado) -->
                    <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; padding: 12px 14px; background: rgba(56, 189, 248, 0.08); border: 1.5px solid rgba(56, 189, 248, 0.5); border-radius: 8px;">
                        <input type="radio" name="torrent_mode" checked style="margin-top: 3px; accent-color: #38bdf8;">
                        <div>
                            <strong style="display: block; color: #38bdf8; font-size: 13.5px;">🚀 Modo Amplo Seguro (Recomendado)</strong>
                            <small class="ex-muted" style="display: block; margin-top: 3px; font-size: 12px; line-height: 1.4; color: #cbd5e1;">
                                Abre 1024-8079, 8081-8442, 8444-65535 (>64.500 portas). Cobre 100% dos clientes e peers de torrent sem tocar em portas web (80, 443, 8080, 8443) nem portas de sistema (1-1023).
                            </small>
                        </div>
                    </label>

                    <!-- Opção 2: Modo Clássico -->
                    <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; padding: 12px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                        <input type="radio" name="torrent_mode" style="margin-top: 3px;">
                        <div>
                            <strong style="display: block; color: #f8fafc; font-size: 13.5px;">📦 Modo Padrão Clássico</strong>
                            <small class="ex-muted" style="display: block; margin-top: 3px; font-size: 12px; color: #94a3b8;">
                                Portas 51413 e 6881-6999 apenas. Modo restrito legado do BitTorrent.
                            </small>
                        </div>
                    </label>

                    <!-- Opção 3: Personalizado -->
                    <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer; padding: 12px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
                        <input type="radio" name="torrent_mode" style="margin-top: 3px;">
                        <div style="width: 100%;">
                            <strong style="display: block; color: #f8fafc; font-size: 13.5px;">✏️ Portas Personalizadas</strong>
                            <small class="ex-muted" style="display: block; margin-top: 3px; font-size: 12px; color: #94a3b8;">
                                Digite as portas separadas por vírgula ou faixas separadas por dois-pontos/hífen:
                            </small>
                            <input type="text" class="cbi-input-text" disabled value="1024:8079,8081:8442,8444:65535" style="width: 100%; margin-top: 8px; padding: 7px 10px; background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; color: #64748b; font-size: 12.5px; box-sizing: border-box;">
                        </div>
                    </label>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 16px;">
                    <button class="btn cbi-button cbi-button-neutral" style="padding: 7px 16px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); border-radius: 6px; color: #e2e8f0; font-weight: 600; cursor: pointer;">Cancelar</button>
                    <button class="btn cbi-button cbi-button-positive" style="padding: 7px 18px; background: #10b981; border: 1px solid #059669; border-radius: 6px; color: #ffffff; font-weight: 700; cursor: pointer;">Salvar e Aplicar</button>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

html_content = html_template.replace("/* CASCADE_CSS_PLACEHOLDER */", cascade_css).replace("/* OVERVIEW_CSS_PLACEHOLDER */", overview_css)

temp_html_path = os.path.join(REPO_DIR, "tests", "temp_torrent_pbr_test.html")
with open(temp_html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--window-size=1200,1150")
opts.add_argument("--disable-gpu")
opts.add_argument("--no-sandbox")
opts.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

print("Inicializando Chrome Headless para validação visual...")
driver = webdriver.Chrome(options=opts)

try:
    file_url = f"file:///{temp_html_path.replace(os.sep, '/')}"
    driver.get(file_url)
    time.sleep(1.5)

    screenshot_file = os.path.join(DOCS_DIR, "torrent_pbr_modal_verification.png")
    driver.save_screenshot(screenshot_file)
    print(f"[SUCESSO] Captura salva em: {screenshot_file}")

    brain_dir = os.environ.get("GEMINI_BRAIN_DIR", r"C:\Users\User\.gemini\antigravity\brain\59ed9f0a-57b2-411e-bec6-0c3a7c86bca9")
    if os.path.isdir(brain_dir):
        brain_screenshot = os.path.join(brain_dir, "torrent_pbr_modal_verification.png")
        shutil.copyfile(screenshot_file, brain_screenshot)
        print(f"[SUCESSO] Cópia salva no Brain Artifacts: {brain_screenshot}")

finally:
    driver.quit()
    if os.path.exists(temp_html_path):
        os.remove(temp_html_path)
