#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Visual verification for the Attended Sysupgrade (OpenWrt Base Update Check) toggle.
Captures both states (OFF/Safe and ON/Active) and ensures zero browser console errors.
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

html_content = f"""<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARK Router — Verificação Visual: Atualização do OpenWrt Base</title>
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
            max-width: 960px;
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
        .badge-safe {{ background: #065f46; color: #34d399; }}
        .badge-warn {{ background: #7c2d12; color: #fb923c; }}
        .badge-lang {{ background: #1e3a8a; color: #60a5fa; }}
    </style>
</head>
<body>
    <div class="test-container">
        <h1 style="text-align: center; margin-bottom: 8px;">ARK Router — Card de Verificação do OpenWrt Base</h1>
        <p style="text-align: center; color: #94a3b8; margin-bottom: 30px;">
            Auditoria visual de clareza dos estados Seguro (Desligada / Bloqueada) vs. Ativo (Ligada / Alerta de Sobrescrita).
        </p>

        <!-- Cenário 1: Estado DESLIGADA (Padrão e Recomendado) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-safe">Estado Seguro / Recomendado</span>
                <h3 style="margin: 0;">Padrão: Pop-ups do OpenWrt Genérico Silenciados (Protegido)</h3>
            </div>
            <div class="ex-asu-toggle-row" style="padding: 14px 16px; background: rgba(127,127,127,0.08); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 1px solid rgba(16, 185, 129, 0.2);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong style="font-size: 1rem; color: #fff;">Verificação do OpenWrt Base</strong>
                        <span class="ex-pill standby" style="font-size: 0.72rem;">Attended Sysupgrade</span>
                    </div>
                    <small class="ex-muted" style="display: block; font-size: 0.85rem; color: #94a3b8; line-height: 1.4;">
                        ✅ Pop-ups do OpenWrt genérico bloqueados para evitar que o ARK Router seja sobrescrito por engano.
                    </small>
                </div>
                <div class="ex-device-switch-control" style="display: flex; align-items: center; gap: 10px;">
                    <strong class="ex-device-switch-state standby" style="font-size: 0.82rem; letter-spacing: 0.03em;">DESLIGADA (RECOMENDADO)</strong>
                    <label class="ex-switch" style="pointer-events: none;">
                        <input type="checkbox">
                        <span class="ex-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Cenário 2: Estado LIGADA (Avisos Ativos) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-warn">Estado Ativo / Alerta</span>
                <h3 style="margin: 0;">Ativado: Busca nos Servidores da OpenWrt.org Liberada</h3>
            </div>
            <div class="ex-asu-toggle-row" style="padding: 14px 16px; background: rgba(127,127,127,0.08); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 14px; border: 1px solid rgba(245, 158, 11, 0.3);">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong style="font-size: 1rem; color: #fff;">Verificação do OpenWrt Base</strong>
                        <span class="ex-pill standby" style="font-size: 0.72rem;">Attended Sysupgrade</span>
                    </div>
                    <small class="ex-muted" style="display: block; font-size: 0.85rem; color: #fcd34d; line-height: 1.4;">
                        ⚠️ O painel buscará atualizações do OpenWrt genérico a cada login. Atenção: atualizar por lá remove o ARK Router.
                    </small>
                </div>
                <div class="ex-device-switch-control" style="display: flex; align-items: center; gap: 10px;">
                    <strong class="ex-device-switch-state online" style="font-size: 0.82rem; letter-spacing: 0.03em; color: #38bdf8;">LIGADA (AVISOS ATIVOS)</strong>
                    <label class="ex-switch" style="pointer-events: none;">
                        <input type="checkbox" checked>
                        <span class="ex-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Cenário 3: Versão em Inglês (EN) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-lang">English (EN)</span>
                <h3 style="margin: 0;">Base OpenWrt Upgrade Checking (Recommended Disabled)</h3>
            </div>
            <div class="ex-asu-toggle-row" style="padding: 14px 16px; background: rgba(127,127,127,0.08); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 14px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong style="font-size: 1rem; color: #fff;">Base OpenWrt Upgrade Checking</strong>
                        <span class="ex-pill standby" style="font-size: 0.72rem;">Attended Sysupgrade</span>
                    </div>
                    <small class="ex-muted" style="display: block; font-size: 0.85rem; color: #94a3b8; line-height: 1.4;">
                        ✅ Generic OpenWrt pop-ups blocked to prevent accidental overwriting of the ARK Router.
                    </small>
                </div>
                <div class="ex-device-switch-control" style="display: flex; align-items: center; gap: 10px;">
                    <strong class="ex-device-switch-state standby" style="font-size: 0.82rem; letter-spacing: 0.03em;">DISABLED (RECOMMENDED)</strong>
                    <label class="ex-switch" style="pointer-events: none;">
                        <input type="checkbox">
                        <span class="ex-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>

        <!-- Cenário 4: Versão em Espanhol (ES) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="badge badge-lang">Español (ES)</span>
                <h3 style="margin: 0;">Comprobación de OpenWrt Base (Recomendado Desactivado)</h3>
            </div>
            <div class="ex-asu-toggle-row" style="padding: 14px 16px; background: rgba(127,127,127,0.08); border-radius: 10px; display: flex; align-items: center; justify-content: space-between; gap: 14px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <strong style="font-size: 1rem; color: #fff;">Comprobación de OpenWrt Base</strong>
                        <span class="ex-pill standby" style="font-size: 0.72rem;">Attended Sysupgrade</span>
                    </div>
                    <small class="ex-muted" style="display: block; font-size: 0.85rem; color: #94a3b8; line-height: 1.4;">
                        ✅ Ventanas emergentes de OpenWrt genérico bloqueadas para evitar la sobrescritura accidental del ARK Router.
                    </small>
                </div>
                <div class="ex-device-switch-control" style="display: flex; align-items: center; gap: 10px;">
                    <strong class="ex-device-switch-state standby" style="font-size: 0.82rem; letter-spacing: 0.03em;">DESACTIVADA (RECOMENDADO)</strong>
                    <label class="ex-switch" style="pointer-events: none;">
                        <input type="checkbox">
                        <span class="ex-switch-slider"></span>
                    </label>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

temp_html = os.path.join(DOCS_DIR, "verify_asu_toggle_ui.html")
with open(temp_html, "w", encoding="utf-8") as f:
    f.write(html_content)

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1100,1600')
opts.binary_location = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

driver = webdriver.Chrome(options=opts)
try:
    driver.get("file:///" + temp_html.replace("\\", "/"))
    time.sleep(1.5)

    logs = driver.get_log('browser')
    severe_errors = [l for l in logs if l.get('level') == 'SEVERE']
    if severe_errors:
        print("WARNING: Severe browser console errors detected:")
        for err in severe_errors:
            print("  ", err)
        sys.exit(1)
    else:
        print("[OK] Zero browser console errors detected!")

    screenshot_file = os.path.join(DOCS_DIR, "asu_toggle_clarity_verification.png")
    driver.save_screenshot(screenshot_file)
    print(f"Screenshot salvo com sucesso em: {screenshot_file}")

    brain_dir = os.path.abspath(r"C:\Users\User\.gemini\antigravity\brain\59ed9f0a-57b2-411e-bec6-0c3a7c86bca9")
    if os.path.isdir(brain_dir):
        brain_screenshot = os.path.join(brain_dir, "asu_toggle_clarity_verification.png")
        shutil.copyfile(screenshot_file, brain_screenshot)
        print(f"Screenshot copiado para artefatos em: {brain_screenshot}")
finally:
    driver.quit()
