#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual verification and screenshot capture for MWAN Advanced Rules Toggle UI.
Validates:
1. The new high-visibility card-style toggle in both Collapsed and Open states.
2. The icon, title, action badge and animated chevron.
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
    <title>ARK Router - Verificação Visual: Toggle de Regras Avançadas de Roteamento (Portas e IPs)</title>
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
            margin-bottom: 18px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="test-container">
        <h1 style="font-size: 1.5rem; margin-bottom: 6px; font-weight: 800;">ARK Router — Verificação Visual: Toggle de Regras Avançadas de Roteamento</h1>
        <p style="color: #94a3b8; margin-bottom: 28px;">Demonstração do novo cabeçalho de expansão com destaque visual, ícone, badge de ação e indicador de estado.</p>

        <!-- Cenário 1: Toggle Fechado (Recolhido) -->
        <div class="scenario-card">
            <div class="scenario-title">1. Estado Fechado (Recolhido) — Alta Visibilidade e Área de Clique Clara</div>
            <div class="scenario-desc">Em vez de um texto simples quase invisível com triângulo minúsculo, agora é um cartão interativo destacado com ícone 🔀, badge "CONFIGURAR" e seta indicadora.</div>

            <details class="ex-mwan-rules-editor">
                <summary class="ex-mwan-rules-summary">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="ex-mwan-summary-icon">🔀</span>
                        <strong>Regras Avançadas de Roteamento (Portas e IPs)</strong>
                    </div>
                    <span class="ex-mwan-summary-toggle">
                        <span class="ex-mwan-summary-badge">Configurar</span>
                        <span class="ex-mwan-summary-arrow">▾</span>
                    </span>
                </summary>
                <div class="ex-mwan-rules-body">
                    <!-- Conteúdo recolhido -->
                </div>
            </details>
        </div>

        <!-- Cenário 2: Toggle Aberto (Expandido) -->
        <div class="scenario-card">
            <div class="scenario-title">2. Estado Aberto (Expandido) — Linha Divisória e Conteúdo Organizado</div>
            <div class="scenario-desc">Ao abrir, a borda e fundo recebem iluminação suave, a seta gira 180°, e o conteúdo interno (PBR e BitTorrent) é apresentado de forma limpa.</div>

            <details class="ex-mwan-rules-editor" open>
                <summary class="ex-mwan-rules-summary">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="ex-mwan-summary-icon">🔀</span>
                        <strong>Regras Avançadas de Roteamento (Portas e IPs)</strong>
                    </div>
                    <span class="ex-mwan-summary-toggle">
                        <span class="ex-mwan-summary-badge">Configurar</span>
                        <span class="ex-mwan-summary-arrow">▾</span>
                    </span>
                </summary>
                <div class="ex-mwan-rules-body">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
                        <div>
                            <strong style="display:block;font-size:13px;color:#f8fafc;">Roteamento por Política (PBR)</strong>
                            <small class="ex-muted" style="color:#94a3b8;">Direcione portas específicas ou aparelhos para balanceamento ou para um link dedicado.</small>
                        </div>
                        <button class="ex-mini-button" style="font-weight:700;padding:6px 14px;background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);border-radius:6px;cursor:pointer;">+ Nova Regra</button>
                    </div>

                    <!-- BitTorrent Aceleração Card -->
                    <div class="ex-channel-mode-control" style="margin-bottom:10px;padding:12px 14px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                        <div style="flex: 1 1 auto; min-width: 220px;">
                            <strong style="color:#f8fafc;">⚡ Acelerar BitTorrent / P2P nas 2 Internets</strong>
                            <small class="ex-muted" style="display:block;margin-top:2px;color:#94a3b8;">Modo Amplo Seguro (>64.500 portas) ativo nas 2 conexões simultaneamente.</small>
                        </div>
                        <div style="display:flex;align-items:center;gap:10px;flex:0 0 auto;">
                            <button class="ex-mini-button" style="padding: 5px 12px; font-size: 11.5px; font-weight: 700; background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.35); border-radius:6px; cursor:pointer;">
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
            </details>
        </div>
    </div>
</body>
</html>
"""

html_rendered = html_template.replace("/* CASCADE_CSS_PLACEHOLDER */", cascade_css).replace("/* OVERVIEW_CSS_PLACEHOLDER */", overview_css)

temp_html_path = os.path.join(DOCS_DIR, "mwan_toggle_harness.html")
with open(temp_html_path, "w", encoding="utf-8") as f:
    f.write(html_rendered)

print(f"Harness HTML gerado em: {temp_html_path}")

# Selenium execution
options = Options()
options.add_argument("--headless=new")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--window-size=1200,1000")
options.add_argument("--force-device-scale-factor=1")

driver = webdriver.Chrome(options=options)
try:
    driver.get(f"file:///{temp_html_path.replace(os.sep, '/')}")
    time.sleep(1)

    screenshot_path = os.path.join(DOCS_DIR, "mwan_toggle_verification.png")
    driver.save_screenshot(screenshot_path)
    print(f"[OK] Screenshot salvo em: {screenshot_path}")

    # Copy to brain artifact directory
    brain_dir = r"C:\Users\User\.gemini\antigravity\brain\59ed9f0a-57b2-411e-bec6-0c3a7c86bca9"
    if os.path.isdir(brain_dir):
        dest_brain = os.path.join(brain_dir, "mwan_toggle_verification.png")
        shutil.copy2(screenshot_path, dest_brain)
        print(f"[OK] Screenshot copiado para o diretório de artefatos: {dest_brain}")

    logs = driver.get_log("browser")
    errors = [log for log in logs if log["level"] == "SEVERE"]
    if errors:
        print(f"Avisos/Erros no console do navegador: {errors}", file=sys.stderr)
    else:
        print("[OK] Console do navegador 100% limpo, sem erros.")

finally:
    driver.quit()
