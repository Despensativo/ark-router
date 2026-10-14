#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Visual Verification of Smart Wi-Fi Package Enhancer UI & Multi-Stage Execution.
Captures high-resolution screenshots of the Roaming Card and the Multi-Stage Modal.
"""

import os
import sys
from playwright.sync_api import sync_playwright

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
    <title>ARK Router - Verificação Visual: Smart Wi-Fi Enhancer</title>
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
            max-width: 900px;
            margin: 0 auto;
        }}
        .scenario-box {{
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }}
        .scenario-header {{
            margin-top: 0;
            margin-bottom: 16px;
            color: #38bdf8;
            font-size: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            padding-bottom: 8px;
        }}
    </style>
</head>
<body>
<div class="test-container">

    <!-- CENÁRIO 1: Card de Roaming com Upgrade Disponível -->
    <div class="scenario-box">
        <h3 class="scenario-header">1. Card na Home: Hardware Potente com wpad-basic (Upgrade Elegível)</h3>
        <div class="ex-channel-mode-control ex-has-action">
            <div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <strong>Motor Avançado Wi-Fi (Daemon Hostapd & 802.11v)</strong>
                    <span class="ex-pill warning">UPGRADE DISPONÍVEL (1 CLIQUE)</span>
                </div>
                <small class="ex-muted">
                    Elegível • Hardware potente (986 MB RAM • 10.3 MB Flash livres). Motor avançado wpad-mbedtls pronto para instalação.
                </small>
                <p class="ex-muted" style="margin: 4px 0 0; line-height: 1.4; font-size: 12px;">
                    Roteadores OpenWrt vêm de fábrica com o pacote básico (wpad-basic) sem 802.11v WNM compilado. O Smart Wi-Fi Enhancer detecta se o seu hardware possui memória RAM e Flash de sobra para promover o sistema para o motor completo wpad-mbedtls com roaming suave.
                </p>
            </div>
            <div class="ex-channel-mode-actions">
                <button class="ex-mini-button cbi-button-positive" style="font-weight: 700; white-space: nowrap;">
                    🚀 Turbinar Motor Wi-Fi
                </button>
            </div>
        </div>
    </div>

    <!-- CENÁRIO 2: Modal em Execução na Etapa 4 (Baixando e Instalando) -->
    <div class="scenario-box">
        <h3 class="scenario-header">2. Modal em Execução: Etapa 4 de 7 (Acompanhamento em Tempo Real)</h3>
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 20px;">
            <h3 style="margin-top:0; font-size: 16px;">Motor Avançado Wi-Fi — Smart Enhancer</h3>

            <!-- Card de Hardware -->
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; background: rgba(15, 23, 42, 0.5); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); font-size: 12px;">
                <div><span class="ex-muted">Memória RAM:</span><br><strong>986 MB</strong></div>
                <div><span class="ex-muted">Flash Livre:</span><br><strong>10.3 MB</strong></div>
                <div><span class="ex-muted">Pacote Atual:</span><br><strong>wpad-basic-mbedtls</strong></div>
                <div><span class="ex-muted">802.11v WNM:</span><br><strong style="color:#f59e0b">Inativo (Basic)</strong></div>
            </div>

            <!-- Progresso e Badge de Etapa -->
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size: 13px;">Progresso de Execução da Migração:</strong>
                <span class="ex-pill warning" style="font-size: 11px;">Etapa 4/7: INSTALLING</span>
            </div>

            <div style="background: rgba(255,255,255,0.08); border-radius: 6px; overflow: hidden; height: 10px; margin: 12px 0 8px;">
                <div style="background: linear-gradient(90deg, #10b981, #06b6d4); height: 100%; width: 65%; transition: width 0.4s ease;"></div>
            </div>

            <p class="ex-muted" style="margin: 6px 0 14px; font-size: 12px; color: #38bdf8;">
                Baixando e instalando pacote completo wpad-mbedtls com suporte nativo a 802.11v WNM...
            </p>

            <!-- Lista Numerada de Etapas com Marcadores Dinâmicos -->
            <ul style="list-style: none; padding-left: 0; margin: 12px 0;">
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;">
                    <span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span>
                    <span>1. Validação de Hardware (RAM e Armazenamento Flash)</span>
                </li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;">
                    <span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span>
                    <span>2. Teste de Conectividade com Repositórios OpenWrt</span>
                </li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;">
                    <span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span>
                    <span>3. Catálogo de Pacotes e Remoção de Restrições</span>
                </li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #38bdf8; font-weight: bold;">
                    <span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">▶</span>
                    <span>4. Download e Instalação do wpad-mbedtls</span>
                </li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #64748b;">
                    <span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">○</span>
                    <span>5. Validação da Integridade do hostapd</span>
                </li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #64748b;">
                    <span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">○</span>
                    <span>6. Sincronização 802.11v BSS Transition & Anti-Queda</span>
                </li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #64748b;">
                    <span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">○</span>
                    <span>7. Conclusão e Reinicialização Suave do Wi-Fi</span>
                </li>
            </ul>

            <div class="right" style="margin-top: 16px; display:flex; justify-content: flex-end; gap: 8px;">
                <button class="btn cbi-button cbi-button-neutral" disabled>Aguarde...</button>
            </div>
        </div>
    </div>

    <!-- CENÁRIO 3: Modal Concluído com Sucesso -->
    <div class="scenario-box">
        <h3 class="scenario-header">3. Modal Concluído: 100% dos Passos Concluídos com Sucesso</h3>
        <div style="background: rgba(30, 41, 59, 0.7); border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; padding: 20px;">
            <h3 style="margin-top:0; font-size: 16px;">Motor Avançado Wi-Fi — Smart Enhancer</h3>

            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; background: rgba(15, 23, 42, 0.5); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08); font-size: 12px;">
                <div><span class="ex-muted">Memória RAM:</span><br><strong>986 MB</strong></div>
                <div><span class="ex-muted">Flash Livre:</span><br><strong>10.3 MB</strong></div>
                <div><span class="ex-muted">Pacote Atual:</span><br><strong>wpad-mbedtls</strong></div>
                <div><span class="ex-muted">802.11v WNM:</span><br><strong style="color:#10b981">Ativo (Pro)</strong></div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong style="font-size: 13px;">Progresso de Execução da Migração:</strong>
                <span class="ex-pill online" style="font-size: 11px;">MOTOR PRO ATIVO (100%)</span>
            </div>

            <div style="background: rgba(255,255,255,0.08); border-radius: 6px; overflow: hidden; height: 10px; margin: 12px 0 8px;">
                <div style="background: #10b981; height: 100%; width: 100%;"></div>
            </div>

            <p class="ex-muted" style="margin: 6px 0 14px; font-size: 12px; color: #10b981;">
                ✓ Upgrade concluído com sucesso! Motor Pro wpad-mbedtls 100% ativo e operacional.
            </p>

            <ul style="list-style: none; padding-left: 0; margin: 12px 0;">
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;"><span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span><span>1. Validação de Hardware (RAM e Armazenamento Flash)</span></li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;"><span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span><span>2. Teste de Conectividade com Repositórios OpenWrt</span></li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;"><span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span><span>3. Catálogo de Pacotes e Remoção de Restrições</span></li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;"><span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span><span>4. Download e Instalação do wpad-mbedtls</span></li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;"><span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span><span>5. Validação da Integridade do hostapd</span></li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;"><span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span><span>6. Sincronização 802.11v BSS Transition & Anti-Queda</span></li>
                <li style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 13px; color: #10b981;"><span style="font-family: monospace; font-weight: bold; width: 18px; text-align: center;">✓</span><span>7. Conclusão e Reinicialização Suave do Wi-Fi</span></li>
            </ul>

            <div class="right" style="margin-top: 16px; display:flex; justify-content: flex-end;">
                <button class="btn cbi-button cbi-button-positive" style="font-weight: 700;">Concluído (Fechar)</button>
            </div>
        </div>
    </div>

    <!-- CENÁRIO 4: Card de Roaming com Motor Pro Ativo -->
    <div class="scenario-box">
        <h3 class="scenario-header">4. Card na Home: Motor Pro Ativo em Produção (Estado Atual no Acer W6x)</h3>
        <div class="ex-channel-mode-control ex-has-action">
            <div>
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <strong>Motor Avançado Wi-Fi (Daemon Hostapd & 802.11v)</strong>
                    <span class="ex-pill online">MOTOR PRO ATIVO (802.11v WNM)</span>
                </div>
                <small class="ex-muted">
                    Ativo • Daemon wpad-mbedtls com 802.11v WNM, BSS Transition e anti-queda (disassoc_low_ack=0).
                </small>
                <p class="ex-muted" style="margin: 4px 0 0; line-height: 1.4; font-size: 12px;">
                    Roteadores OpenWrt vêm de fábrica com o pacote básico (wpad-basic) sem 802.11v WNM compilado. O Smart Wi-Fi Enhancer detecta se o seu hardware possui memória RAM e Flash de sobra para promover o sistema para o motor completo wpad-mbedtls com roaming suave.
                </p>
            </div>
            <div class="ex-channel-mode-actions">
                <button class="ex-mini-button" style="font-weight: 700; white-space: nowrap;">
                    🔍 Diagnóstico do Motor
                </button>
            </div>
        </div>
    </div>

</div>
</body>
</html>
"""

temp_html_path = os.path.join(DOCS_DIR, "wifi_enhancer_preview.html")
with open(temp_html_path, "w", encoding="utf-8") as f:
    f.write(html_content)

print(f"✅ HTML de validação visual gerado em: {temp_html_path}")

screenshot_path = os.path.join(DOCS_DIR, "wifi_enhancer_stages_and_cards.png")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 1900})
    
    console_errors = []
    page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
    
    page.goto(f"file://{temp_html_path}")
    page.wait_for_timeout(1000)
    
    page.screenshot(path=screenshot_path, full_page=True)
    browser.close()

if console_errors:
    print(f"❌ Erros no console do navegador ({len(console_errors)}):")
    for err in console_errors:
        print(f"   - {err}")
    sys.exit(1)
else:
    print("✅ Zero erros de console no navegador.")
    print(f"📸 Screenshot salvo com sucesso em: {screenshot_path}")

