import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def main():
    repo_dir = "/Volumes/--400GB--/FEITOS COM IA/Ark-Router/GitHub/luci-app-ark-router"
    artifact_dir = "/Users/user/.gemini/antigravity/brain/2d380b29-adff-4112-a2e7-f616760a3608"
    os.makedirs(artifact_dir, exist_ok=True)
    screenshot_path = os.path.join(artifact_dir, "upnp_toggle_modal_visual.png")

    cascade_css_path = os.path.join(repo_dir, "root", "www", "luci-static", "ark", "cascade.css")
    overview_css_path = os.path.join(repo_dir, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.css")

    with open(cascade_css_path, "r", encoding="utf-8") as f:
        cascade_css = f.read()

    with open(overview_css_path, "r", encoding="utf-8") as f:
        overview_css = f.read()

    html_content = f"""<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ARK Router — Central de Recursos: UPnP / NAT-PMP</title>
    <style>
{cascade_css}
{overview_css}
        body {{
            background: #0b1120;
            color: #f8fafc;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            padding: 30px;
            margin: 0;
            display: flex;
            justify-content: center;
        }}
        .test-container {{
            max-width: 860px;
            width: 100%;
        }}
        .scenario-card {{
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px;
            padding: 24px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
            margin-bottom: 24px;
        }}
        .scenario-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 12px;
        }}
        .scenario-title {{
            font-size: 1.15rem;
            font-weight: 700;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
    </style>
</head>
<body>
    <div class="test-container">
        <!-- CENÁRIO 1: UPnP DESATIVADO (MODO SEGURO / RECOMENDADO) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="scenario-title">🛡️ Central de Recursos: Estado Padrão Recomendado</span>
                <span class="ex-pill standby">MODO SEGURO</span>
            </div>
            <div class="ex-feature-row">
                <div class="ex-feature-copy">
                    <div class="ex-feature-name-row">
                        <strong>UPnP / NAT‑PMP</strong>
                    </div>
                    <small class="ex-muted">Abertura automática de portas para jogos P2P (consoles/PC) e torrents. Permite mapeamento dinâmico sem configuração manual.</small>
                    <code>miniupnpd-nftables</code>
                    <small class="ex-feature-reason" style="color:#10b981;font-weight:600;display:block;margin-top:4px;">
                        🛡️ Modo Seguro: Desativado. Nenhuma porta é aberta automaticamente. Máxima proteção e economia de RAM.
                    </small>
                </div>
                <div class="ex-feature-state">
                    <span class="ex-pill standby">Instalado, mas inativo</span>
                    <div class="ex-feature-actions">
                        <button class="ex-mini-button" style="background:#0284c7;color:#fff;font-weight:600;">Ativar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- CENÁRIO 2: UPnP ATIVADO (ALERTA DE SEGURANÇA VISÍVEL) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="scenario-title">⚠️ Central de Recursos: Estado Ativo pelo Usuário</span>
                <span class="ex-pill online">PORTAS LIVRES</span>
            </div>
            <div class="ex-feature-row">
                <div class="ex-feature-copy">
                    <div class="ex-feature-name-row">
                        <strong>UPnP / NAT‑PMP</strong>
                    </div>
                    <small class="ex-muted">Abertura automática de portas para jogos P2P (consoles/PC) e torrents. Permite mapeamento dinâmico sem configuração manual.</small>
                    <code>miniupnpd-nftables</code>
                    <small class="ex-feature-reason" style="color:#f59e0b;font-weight:600;display:block;margin-top:4px;">
                        ⚠️ Risco de Segurança: Ativo. Qualquer aplicativo na rede pode abrir portas na WAN sem senha. Desative se não usar jogos P2P.
                    </small>
                </div>
                <div class="ex-feature-state">
                    <span class="ex-pill online">Instalado e ativo</span>
                    <div class="ex-feature-actions">
                        <button class="ex-mini-button" style="background:rgba(239,68,68,0.2);color:#ef4444;border:1px solid rgba(239,68,68,0.4);font-weight:600;">Desativar</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>"""

    html_path = os.path.join(artifact_dir, "upnp_toggle_preview.html")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 720})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"CONSOLE: [{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: errors.append(str(err)))

        await page.goto(f"file://{html_path}")
        await page.wait_for_timeout(1000)

        await page.screenshot(path=screenshot_path, full_page=True)
        print(f"Screenshot salvo em: {screenshot_path}")

        await browser.close()

    if errors:
        print(f"Erros detectados: {errors}")
        sys.exit(1)
    print("Sucesso: Validação visual Playwright concluída!")

if __name__ == "__main__":
    asyncio.run(main())
