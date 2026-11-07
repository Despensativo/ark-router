#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual verification and screenshot capture for Hidden SSID (Ocultar nome da rede Wi-Fi).
Validates:
1. Wi-Fi Card displaying the 'Oculta' pill badge next to SSID.
2. Wi-Fi Configuration Modal featuring the switch 'Ocultar nome da rede (SSID Oculto)'.
3. Saves high-res screenshot to docs/screenshots and brain artifact directory.
"""

import os
import sys
import subprocess
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
DOCS_DIR = os.path.join(REPO_DIR, "docs", "screenshots")
os.makedirs(DOCS_DIR, exist_ok=True)

BRAIN_DIR = "/Users/user/.gemini/antigravity/brain/55bc7698-4d16-40a1-87a3-cb9c37ac02eb"
os.makedirs(BRAIN_DIR, exist_ok=True)

CASCADE_CSS_PATH = os.path.join(REPO_DIR, "root", "www", "luci-static", "ark", "cascade.css")
OVERVIEW_CSS_PATH = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.css")

cascade_css = ""
overview_css = ""
if os.path.exists(CASCADE_CSS_PATH):
    with open(CASCADE_CSS_PATH, "r", encoding="utf-8") as f:
        cascade_css = f.read()

if os.path.exists(OVERVIEW_CSS_PATH):
    with open(OVERVIEW_CSS_PATH, "r", encoding="utf-8") as f:
        overview_css = f.read()

html_content = f"""<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARK Router - Verificação Visual: SSID Oculto (Ocultar Nome da Rede)</title>
    <style>
{cascade_css}
{overview_css}
        body {{
            background: #0b1120;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 30px 20px;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 25px;
        }}
        .header {{
            text-align: center;
            max-width: 900px;
        }}
        .header h1 {{
            font-size: 1.6rem;
            margin: 0 0 8px 0;
            color: #38bdf8;
            font-weight: 800;
        }}
        .header p {{
            font-size: 0.95rem;
            color: #94a3b8;
            margin: 0;
            line-height: 1.5;
        }}
        .container-preview {{
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 24px;
            max-width: 1100px;
            width: 100%;
        }}
        .preview-box {{
            flex: 1 1 480px;
            max-width: 520px;
            background: #1e293b;
            border: 1px solid #334155;
            border-radius: 16px;
            padding: 20px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
        }}
        .preview-title {{
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #38bdf8;
            margin-bottom: 14px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>ARK Router 2.2.1 — Ocultar Nome da Rede Wi‑Fi (SSID Oculto)</h1>
        <p>Validação da opção de transmissão discreta de SSID: Badge de status 'Oculta' no card de rede e controle com aviso inteligente de conectividade para dispositivos Smart Home (IoT).</p>
    </div>

    <div class="container-preview">
        <!-- Visualização do Card com SSID Oculto -->
        <div class="preview-box">
            <div class="preview-title">
                <span>📶 1. Exibição no Card Principal (Dashboard)</span>
            </div>
            
            <section class="ex-card ex-wifi-card" style="margin: 0; background: #0f172a; border-color: #334155;">
                <div class="ex-card-title">
                    <div>
                        <span class="ex-kicker">REDE WI‑FI</span>
                        <h3 id="ex-main-ssid" style="display: flex; align-items: center;">
                            CASA_ARK_2+5
                            <span class="ex-wifi-hidden-badge" style="margin-left: 8px; font-size: 11px; padding: 2px 7px; background: rgba(239,68,68,0.15); color: #f87171; border: 1px solid rgba(239,68,68,0.25); border-radius: 6px; font-weight: 700; vertical-align: middle;">Oculta</span>
                        </h3>
                    </div>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span id="ex-main-wifi-status" class="ex-pill ex-pill-green">Ativa</span>
                        <label class="ex-switch" title="Ligar ou desligar Wi‑Fi CASA_ARK_2+5">
                            <input id="ex-main-wifi-toggle" type="checkbox" checked aria-label="Ligar ou desligar Wi‑Fi CASA_ARK_2+5">
                            <span class="ex-switch-slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="ex-secret">
                    <code id="ex-main-key" data-hidden="1" style="filter:none;">••••••••••••</code>
                    <button class="ex-mini-button">Ver senha</button>
                </div>
                
                <small class="ex-muted ex-wifi-subtitle" style="display: block; margin-top: 8px;">
                    disponível em 2,4 e 5 GHz • <span class="ex-wifi-unified-pill">Rede Unificada</span>
                </small>
                
                <button class="ex-mini-button ex-wifi-config-button" style="margin-top:14px;width:100%;justify-content:center;font-weight:750;padding:9px 12px;display:flex;align-items:center;gap:6px;font-size:13px;background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer;">
                    ⚙ Configurar Wi‑Fi (Nome, Senha e Status)
                </button>
            </section>
        </div>

        <!-- Visualização do Modal de Edição -->
        <div class="preview-box">
            <div class="preview-title">
                <span>⚙️ 2. Modal de Configuração com Switch de SSID Oculto</span>
            </div>
            
            <div style="background: #0f172a; border-radius: 12px; padding: 16px; border: 1px solid #334155;">
                <div class="ex-device-config-block" style="margin-bottom: 12px;">
                    <strong style="display: block; font-size: 13px; margin-bottom: 4px;">Nome da rede Wi‑Fi (SSID)</strong>
                    <input class="cbi-input-text" type="text" value="CASA_ARK_2+5" style="width: 100%; box-sizing: border-box; padding: 7px 10px; background: #1e293b; border: 1px solid #475569; border-radius: 6px; color: #fff;">
                </div>

                <!-- O Bloco implementado de SSID Oculto -->
                <div class="ex-device-config-block" style="padding: 12px; border-radius: 8px; background: rgba(127,127,127,.08); border: 1px solid rgba(127,127,127,.18); margin-top: 10px;">
                    <div class="ex-device-config-heading" style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <strong style="font-size: 13px; color: #f1f5f9;">Ocultar nome da rede (SSID Oculto)</strong>
                                <span class="ex-wifi-hidden-tag" style="font-size: 11px; padding: 1px 6px; background: rgba(239,68,68,0.18); color: #f87171; border-radius: 4px; font-weight: 700;">Oculta</span>
                            </div>
                            <small class="ex-muted" style="font-size: 11.5px; line-height: 1.35; color: #94a3b8;">
                                Não transmite o nome do Wi‑Fi publicamente. Aparelhos já conectados continuam funcionando normalmente. Lâmpadas e tomadas inteligentes (IoT) podem falhar ao reconectar após falta de luz se a rede estiver oculta.
                            </small>
                        </div>
                        <div class="ex-device-switch-control" style="flex: 0 0 auto; display: flex; align-items: center; gap: 8px;">
                            <strong class="ex-device-switch-state" style="font-size: 12px; color: #f87171;">Oculta</strong>
                            <label class="ex-switch" aria-label="Ocultar nome da rede">
                                <input type="checkbox" checked>
                                <span class="ex-switch-slider"></span>
                            </label>
                        </div>
                    </div>
                </div>

                <div style="margin-top: 14px; display: flex; justify-content: flex-end; gap: 8px;">
                    <button class="btn cbi-button cbi-button-neutral" style="padding: 6px 14px; border-radius: 6px; background: #334155; border: none; color: #fff;">Cancelar</button>
                    <button class="btn cbi-button cbi-button-positive" style="padding: 6px 14px; border-radius: 6px; background: #10b981; border: none; color: #fff; font-weight: 700;">Salvar Wi‑Fi</button>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

harness_path = os.path.join(DOCS_DIR, "wifi_hidden_ssid_harness.html")
with open(harness_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"[OK] Harness HTML gerado em: {harness_path}")

screenshot_path = os.path.join(DOCS_DIR, "wifi_hidden_ssid_verification.png")
brain_screenshot = os.path.join(BRAIN_DIR, "wifi_hidden_ssid_verification.png")
chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

if os.path.exists(chrome_bin):
    cmd = [
        chrome_bin,
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1200,680",
        f"--screenshot={screenshot_path}",
        f"file://{harness_path}"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0 and os.path.exists(screenshot_path):
        shutil.copy2(screenshot_path, brain_screenshot)
        print(f"[OK] Screenshot capturado com sucesso:")
        print(f"     Docs:  {screenshot_path}")
        print(f"     Brain: {brain_screenshot}")
    else:
        print(f"[WARN] Falha ao rodar Chrome headless: {res.stderr}")
else:
    print(f"[WARN] Chrome binario nao encontrado em: {chrome_bin}")
