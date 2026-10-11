import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def main():
    repo_dir = "/Volumes/--400GB--/FEITOS COM IA/Ark-Router/GitHub/luci-app-ark-router"
    artifact_dir = "/Users/user/.gemini/antigravity/brain/2d380b29-adff-4112-a2e7-f616760a3608"
    os.makedirs(artifact_dir, exist_ok=True)
    screenshot_path = os.path.join(artifact_dir, "zram_intelligent_toggle_visual.png")

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
    <title>ARK Router — Toggle Inteligente ZRAM & Trava de Alta Capacidade</title>
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
            max-width: 900px;
            width: 100%;
        }}
        .scenario-card {{
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 14px;
            padding: 22px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
            margin-bottom: 24px;
        }}
        .scenario-header {{
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 14px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            padding-bottom: 10px;
        }}
        .scenario-title {{
            font-size: 1.1rem;
            font-weight: 700;
            color: #38bdf8;
            display: flex;
            align-items: center;
            gap: 8px;
        }}
        .mock-modal {{
            background: #1e293b;
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
            padding: 20px;
            margin-top: 14px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.6);
        }}
        .mock-modal-title {{
            font-size: 1.05rem;
            font-weight: 700;
            color: #f1f5f9;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
        }}
    </style>
</head>
<body>
    <div class="test-container">
        <!-- CENÁRIO 1: ROTEADOR DE ENTRADA MODERNO (CUDY WR3000 - 256MB DUAL-CORE) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="scenario-title">🚀 Cenário 1: Roteador Moderno Dual-Core ≤ 256 MB (Cudy WR3000)</span>
                <span class="ex-pill online">RECOMENDADO ATIVO</span>
            </div>
            <div class="ex-feature-row">
                <div class="ex-feature-copy">
                    <div class="ex-feature-name-row">
                        <strong>Compressão de Memória (ZRAM)</strong>
                        <span class="ex-recommended-badge">RECOMENDADO</span>
                    </div>
                    <small class="ex-muted">Compacta a memória RAM em tempo real com LZ4, multiplicando a capacidade útil em roteadores com 256 MB ou menos.</small>
                    <code>kmod-zram</code>
                    <small class="ex-feature-reason" style="color:#10b981;font-weight:600;display:block;margin-top:4px;">
                        🛡️ Proteção Ativa: Memória comprimida em tempo real (128 MB ZRAM). Evita falhas por memória cheia (OOM).
                    </small>
                </div>
                <div class="ex-feature-state">
                    <span class="ex-pill online">Ativo (128 MB)</span>
                    <div class="ex-feature-actions">
                        <button class="ex-mini-button">Desativar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- CENÁRIO 2: ROTEADOR LEGADO CPU FRACA (D-LINK DGL-5500 - 128MB MIPS SINGLE-CORE) -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="scenario-title">⚡ Cenário 2: Hardware Compacto / MIPS Mononúcleo (D-Link DGL-5500)</span>
                <span class="ex-pill standby" style="color:#f59e0b; border-color:#f59e0b;">MODO PROTEGIDO (32 MB)</span>
            </div>
            <div class="ex-feature-row">
                <div class="ex-feature-copy">
                    <div class="ex-feature-name-row">
                        <strong>Compressão de Memória (ZRAM)</strong>
                    </div>
                    <small class="ex-muted">Compacta a memória RAM em tempo real com LZ4, multiplicando a capacidade útil em roteadores com 256 MB ou menos.</small>
                    <code>kmod-zram</code>
                    <small class="ex-feature-reason" style="color:#f59e0b;font-weight:600;display:block;margin-top:4px;">
                        ⚡ Modo Protegido (CPU Mononúcleo): Ativo com swappiness=15 e limite de 32 MB para poupar a CPU.
                    </small>
                </div>
                <div class="ex-feature-state">
                    <span class="ex-pill online">Ativo (32 MB)</span>
                    <div class="ex-feature-actions">
                        <button class="ex-mini-button">Desativar</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- CENÁRIO 3: ROTEADOR TOP DE LINHA (PREDATOR T7/W6X - 1GB RAM) COM MODAL DE TRAVA 5s -->
        <div class="scenario-card">
            <div class="scenario-header">
                <span class="scenario-title">👑 Cenário 3: Roteador de Alto Desempenho (Predator W6X / 1024 MB)</span>
                <span class="ex-pill standby" style="color:#38bdf8; border-color:#38bdf8;">DESNECESSÁRIO</span>
            </div>
            <div class="ex-feature-row">
                <div class="ex-feature-copy">
                    <div class="ex-feature-name-row">
                        <strong>Compressão de Memória (ZRAM)</strong>
                    </div>
                    <small class="ex-muted">Compacta a memória RAM em tempo real com LZ4, multiplicando a capacidade útil em roteadores com 256 MB ou menos.</small>
                    <code>kmod-zram</code>
                    <small class="ex-feature-reason" style="color:#3b82f6;font-weight:600;display:block;margin-top:4px;">
                        ✨ Recomendado Desativado: Memória abundante (1024 MB). Manter desativado economiza 100% de CPU.
                    </small>
                </div>
                <div class="ex-feature-state">
                    <span class="ex-pill standby">Desativado</span>
                    <div class="ex-feature-actions">
                        <button class="ex-mini-button" style="background:#0284c7;color:#fff;font-weight:600;">Ativar</button>
                    </div>
                </div>
            </div>

            <!-- MODAL COM TRAVA DE 5 SEGUNDOS (EXIBIDA QUANDO CLICA EM ATIVAR NO CENÁRIO 3) -->
            <div class="mock-modal">
                <div class="mock-modal-title">
                    ⚠️ Confirmação: Compressão ZRAM em Alta Capacidade
                </div>
                <p class="alert-message warning" style="margin-top:0;">
                    Memória RAM física abundante detectada: este roteador possui <strong>1024 MB de RAM</strong>. A memória é mais do que suficiente para o OpenWrt e todos os serviços sem qualquer risco de esgotamento.
                </p>
                <p style="font-size:0.9rem; line-height:1.45; color:#cbd5e1; margin:10px 0;">
                    A compressão ZRAM forçará o processador a gastar ciclos contínuos de CPU comprimindo dados em tempo real desnecessariamente. Isso eleva o consumo elétrico e pode reduzir o rendimento máximo de banda (throughput).
                </p>
                <p class="alert-message info" style="margin-top:8px; font-size:0.85rem;">
                    Trava de segurança de 5 segundos: projetada para evitar ativação acidental em equipamentos de ponta. Se você realmente deseja ativar para experimentos ou laboratório, aguarde a contagem.
                </p>
                <div class="right" style="margin-top:16px; display:flex; justify-content:flex-end; gap:8px;">
                    <button class="btn cbi-button cbi-button-neutral">Cancelar</button>
                    <button class="btn cbi-button cbi-button-negative" disabled style="opacity:0.6; cursor:not-allowed;">Aguarde 5 s</button>
                </div>
            </div>
        </div>
    </div>
</body>
</html>
"""

    preview_html_path = os.path.join(artifact_dir, "zram_toggle_preview.html")
    with open(preview_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1024, "height": 1180})
        await page.goto(f"file://{preview_html_path}")
        await page.wait_for_load_state("networkidle")
        await page.screenshot(path=screenshot_path, full_page=True)
        await browser.close()

    print(f"[OK] Screenshot salvo com sucesso em: {screenshot_path}")

if __name__ == "__main__":
    asyncio.run(main())
