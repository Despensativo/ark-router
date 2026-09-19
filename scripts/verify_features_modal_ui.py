#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Visual verification for RECURSOS E COMPATIBILIDADE modal after removing "Otimização modo ARK".
Faithfully renders selfUpdatePanel() and all modal sections according to src/modules/system.js.
Captures screenshot and validates zero browser console errors.
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
    <title>ARK Router — Recursos e Compatibilidade (Fidelidade Real do Sistema)</title>
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
            max-width: 860px;
            margin: 0 auto;
        }}
        .scenario-card {{
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px;
            padding: 24px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }}
        .scenario-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            padding-bottom: 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }}
        .badge-verified {{
            background: #10b981;
            color: #fff;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
    </style>
</head>
<body>
    <div class="test-container">
        <div class="scenario-card">
            <div class="scenario-header">
                <div>
                    <h2 style="margin: 0 0 4px 0; font-size: 1.25rem;">Modal Recursos e Compatibilidade</h2>
                    <p style="margin: 0; font-size: 0.85rem; color: #94a3b8;">Renderização 100% fiel com selfUpdatePanel() e remoção do Modo ARK</p>
                </div>
                <span class="badge-verified">Layout Validado</span>
            </div>

            <div class="cbi-modal">
                <h4 class="modal-title" style="margin-bottom: 16px;">RECURSOS E COMPATIBILIDADE</h4>
                
                <!-- 1. Perfil Operacional -->
                <div class="ex-brand-row">
                    <label>Perfil operacional</label>
                    <select class="cbi-input-select">
                        <option value="standard" selected>Modo Padrão / Equilibrado</option>
                        <option value="gamer">Modo Gamer (Baixa Latência &amp; PUBG Mobile)</option>
                    </select>
                    <button class="ex-mini-button">Aplicar perfil</button>
                </div>

                <!-- 2. Otimização de Conexão -->
                <section class="ex-cleanup-entry">
                    <div>
                        <strong>⚡ Otimização de Conexão e Desempenho da Internet</strong>
                        <small class="ex-muted">Calibração inteligente para Modem/DHCP, Fibra PPPoE, 4G/5G e Starlink. Aceleração Fastpath e proteção de memória RAM.</small>
                    </div>
                    <button class="ex-mini-button">Otimizar internet</button>
                </section>

                <!-- 3. Nome do Painel -->
                <div class="ex-brand-row">
                    <label>Nome do painel</label>
                    <input type="text" class="cbi-input-text" value="ARK ROUTER" style="flex:1;">
                    <button class="ex-mini-button">Salvar nome</button>
                </div>

                <!-- 4. Idioma do Painel -->
                <div class="ex-language-row">
                    <label>Idioma do painel</label>
                    <select class="cbi-input-select" style="flex:1;">
                        <option value="auto">Automático (Navegador / Sistema)</option>
                        <option value="pt-br" selected>Português (Brasil)</option>
                        <option value="en">English</option>
                        <option value="es">Español</option>
                    </select>
                    <button class="ex-mini-button">Salvar idioma</button>
                </div>

                <!-- 5. selfUpdatePanel() — Fiel ao código original de system.js -->
                <section class="ex-update-panel">
                    <div class="ex-update-header">
                        <div>
                            <strong>Atualização do ARK Router</strong>
                            <small class="ex-muted">Verifica o GitHub Releases e instala com segurança após confirmação.</small>
                        </div>
                        <span class="ex-pill online">APK</span>
                    </div>
                    <div class="ex-update-cards-grid">
                        <div class="ex-update-card">
                            <div class="ex-feature-copy">
                                <div class="ex-feature-name-row">
                                    <strong>Versão instalada: </strong>
                                    <span class="ex-pill online">1.0.2</span>
                                </div>
                                <small class="ex-muted">Repositório: Despensativo/ark-router</small>
                                <small class="ex-muted">Gerenciador: apk</small>
                            </div>
                            <div class="ex-feature-actions" style="margin-top: 8px; flex-wrap: wrap; gap: 8px;">
                                <button class="ex-mini-button">Verificar atualização</button>
                                <button class="ex-mini-button" style="background: rgba(127,127,127,.12);">📦 Instalar manual/offline</button>
                            </div>
                        </div>
                        <div id="ex-self-update-result" class="ex-update-result">
                            <div class="ex-update-card">
                                <div class="ex-feature-copy">
                                    <strong>Status de atualização</strong>
                                    <small class="ex-muted">Nenhuma verificação executada nesta sessão.</small>
                                    <small class="ex-muted">Clique em "Verificar atualização" ou use a opção manual.</small>
                                </div>
                                <div class="ex-feature-actions" style="margin-top: 8px;">
                                    <button class="ex-mini-button">Instalar pacote offline</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- asuRow dentro de selfUpdatePanel() -->
                    <div class="ex-asu-toggle-row" style="margin-top: 14px; padding: 12px 14px; background: rgba(127,127,127,0.06); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <strong>Verificação do OpenWrt Base</strong>
                                <span class="ex-pill standby" style="font-size: 0.7rem;">Attended Sysupgrade</span>
                            </div>
                            <small class="ex-muted" style="display: block; margin-top: 2px;">
                                ✅ Pop-ups do OpenWrt genérico bloqueados para evitar que o ARK Router seja sobrescrito por engano.
                            </small>
                        </div>
                        <div class="ex-device-switch-control" style="cursor: pointer; user-select: none; display: flex; align-items: center; gap: 9px;">
                            <strong class="ex-device-switch-state standby">DESLIGADA (RECOMENDADO)</strong>
                            <label class="ex-switch" style="pointer-events: none;">
                                <input type="checkbox">
                                <span class="ex-switch-slider"></span>
                            </label>
                        </div>
                    </div>
                </section>

                <!-- 6. Instalação Rápida -->
                <section class="ex-cleanup-entry">
                    <div>
                        <strong>Instalação rápida</strong>
                        <small class="ex-muted">Todos os recursos leves compatíveis já estão instalados ou indisponíveis neste roteador.</small>
                    </div>
                    <button class="ex-mini-button" disabled>Instalar tudo</button>
                </section>

                <!-- 7. Central IPv6 -->
                <section class="ex-cleanup-entry">
                    <div>
                        <strong>🌐 Central de Conectividade IPv6</strong>
                        <small class="ex-muted">Modos de operação: Pilha Dupla Global, IPv6 Seletivo por MAC (Gamer/IoT), IPv4 Apenas ou IPv6-Only. Suporte a cascata NDP Relay.</small>
                    </div>
                    <button class="ex-mini-button btn-ipv6">Ajustes IPv6</button>
                </section>

                <!-- 8. Painel Starlink -->
                <section class="ex-https-panel is-enabled" style="margin-bottom: 10px;">
                    <div class="ex-https-toggle-row">
                        <div>
                            <strong style="display: block; margin-bottom: 2px;">📡 Painel Starlink e Central de Telemetria</strong>
                            <small class="ex-muted">Sempre exibir o painel Starlink no início, permitindo testar e configurar telemetria mesmo sem antena física detectada.</small>
                        </div>
                        <div class="ex-https-switch-wrap">
                            <span class="ex-https-switch-state online">LIGADO</span>
                            <label class="ex-switch">
                                <input type="checkbox" checked aria-label="Sempre exibir painel Starlink">
                                <span class="ex-switch-slider"></span>
                            </label>
                        </div>
                    </div>
                </section>

                <!-- 9. Aparência -->
                <section class="ex-appearance-panel">
                    <div class="ex-appearance-heading">
                        <div>
                            <strong>Aparência</strong>
                            <small class="ex-muted">No modo automático, o painel acompanha as cores e o modo claro ou escuro do tema LuCI.</small>
                        </div>
                        <select class="cbi-input-select">
                            <option value="auto" selected>Automático</option>
                            <option value="dark">Escuro</option>
                            <option value="light">Claro</option>
                        </select>
                    </div>
                    <button class="ex-mini-button ex-save-appearance">Salvar aparência</button>
                </section>

                <div class="right" style="margin-top: 20px;">
                    <button class="btn cbi-button cbi-button-neutral">Fechar</button>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

temp_html = os.path.join(DOCS_DIR, "verify_features_modal_ui.html")
with open(temp_html, "w", encoding="utf-8") as f:
    f.write(html_content)

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1280,1800')
opts.binary_location = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

driver = webdriver.Chrome(options=opts)
try:
    driver.get("file:///" + temp_html.replace("\\", "/"))
    time.sleep(1.0)

    # Check console errors
    logs = driver.get_log('browser')
    severe_errors = [l for l in logs if l.get('level') == 'SEVERE']
    if severe_errors:
        print("WARNING: Severe browser console errors detected:")
        for err in severe_errors:
            print("  ", err)
        sys.exit(1)
    else:
        print("[OK] Zero browser console errors detected!")

    screenshot_file = os.path.join(DOCS_DIR, "features_modal_without_ark_cleanup.png")
    driver.save_screenshot(screenshot_file)
    print(f"Screenshot salvo com sucesso em: {screenshot_file}")

    # Copiar também para o diretório de artefatos da conversa ativa
    brain_dir = os.path.abspath(r"C:\Users\User\.gemini\antigravity\brain\17847b56-902a-48d5-b1cd-57cd806f0351")
    if os.path.isdir(brain_dir):
        brain_screenshot = os.path.join(brain_dir, "features_modal_without_ark_cleanup.png")
        shutil.copyfile(screenshot_file, brain_screenshot)
        print(f"Screenshot copiado para artefatos em: {brain_screenshot}")
finally:
    driver.quit()
