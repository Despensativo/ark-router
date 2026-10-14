import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def main():
    artifact_dir = "/Users/user/.gemini/antigravity/brain/2d380b29-adff-4112-a2e7-f616760a3608"
    os.makedirs(artifact_dir, exist_ok=True)
    
    screenshot_overview = os.path.join(artifact_dir, "live_cudy_dashboard_overview.png")
    screenshot_features = os.path.join(artifact_dir, "live_cudy_zram_features_modal.png")
    screenshot_doctor = os.path.join(artifact_dir, "live_cudy_ark_doctor_modal.png")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 950})
        page = await context.new_page()

        print("Navegando para o login do roteador...")
        await page.goto("http://192.168.21.1/cgi-bin/luci/admin/equipe-dashboard", timeout=20000)
        await page.wait_for_load_state("networkidle")

        # Verifica se caiu no login
        password_input = await page.query_selector('input[name="luci_password"]')
        if password_input:
            print("Efetuando login no LuCI...")
            await password_input.fill(os.environ.get("ARK_ROUTER_TEST_PASSWORD", ""))
            await page.keyboard.press("Enter")
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)

        # Garante que está no equipe-dashboard
        if "equipe-dashboard" not in page.url:
            await page.goto("http://192.168.21.1/cgi-bin/luci/admin/equipe-dashboard", timeout=20000)
            await page.wait_for_load_state("networkidle")

        # Aguarda carregar o view do dashboard
        print("Aguardando renderização do dashboard...")
        await page.wait_for_timeout(4000)

        # Captura screenshot da visão geral
        print("Capturando visão geral do dashboard...")
        await page.screenshot(path=screenshot_overview, full_page=False)
        print(f"[OK] Overview salvo: {screenshot_overview}")

        # Abre o modal de Recursos e Compatibilidade
        print("Abrindo Central de Recursos...")
        await page.evaluate("""() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Recursos');
            if (btn) {
                btn.click();
            } else {
                // Tenta via classe
                const fBtn = document.querySelector('.ex-hero-feature-button:not(.ex-hero-setup-button)');
                if (fBtn) fBtn.click();
            }
        }""")
        await page.wait_for_timeout(2000)

        # Rola o modal até o ZRAM e UPnP
        await page.evaluate("""() => {
            const list = document.querySelector('.ex-feature-list');
            if (list) {
                const rows = Array.from(list.querySelectorAll('.ex-feature-row'));
                const zramRow = rows.find(r => r.textContent.includes('ZRAM') || r.textContent.includes('Compressão'));
                if (zramRow) {
                    zramRow.scrollIntoView({ behavior: 'instant', block: 'center' });
                }
            }
        }""")
        await page.wait_for_timeout(1000)

        print("Capturando modal de Recursos com ZRAM ativo...")
        await page.screenshot(path=screenshot_features, full_page=False)
        print(f"[OK] Features modal salvo: {screenshot_features}")

        # Fecha o modal
        await page.evaluate("""() => {
            const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Fechar');
            if (closeBtn) closeBtn.click();
        }""")
        await page.wait_for_timeout(1000)

        # Abre o modal do Ark Doctor
        print("Abrindo modal do Ark Doctor...")
        await page.evaluate("""() => {
            const docBtn = Array.from(document.querySelectorAll('button, a')).find(b => b.textContent.includes('Diagnóstico') || b.textContent.includes('Ark Doctor') || b.textContent.includes('Doctor'));
            if (docBtn) {
                docBtn.click();
            }
        }""")
        await page.wait_for_timeout(2500)

        print("Capturando modal do Ark Doctor...")
        await page.screenshot(path=screenshot_doctor, full_page=False)
        print(f"[OK] Ark Doctor modal salvo: {screenshot_doctor}")

        await browser.close()
        print("\nTodos os prints foram capturados com sucesso ao vivo do roteador Cudy 192.168.21.1!")

if __name__ == "__main__":
    asyncio.run(main())
