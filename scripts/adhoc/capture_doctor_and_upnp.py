import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    artifact_dir = "/Users/user/.gemini/antigravity/brain/2d380b29-adff-4112-a2e7-f616760a3608"
    screenshot_doctor = os.path.join(artifact_dir, "live_cudy_ark_doctor_modal.png")
    screenshot_upnp = os.path.join(artifact_dir, "live_cudy_upnp_features_modal.png")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 950})
        page = await context.new_page()

        await page.goto("http://192.168.21.1/cgi-bin/luci/admin/equipe-dashboard", timeout=20000)
        await page.wait_for_load_state("networkidle")

        pw = await page.query_selector('input[name="luci_password"]')
        if pw:
            await pw.fill("admin0100")
            await page.keyboard.press("Enter")
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)

        # 1. Abre o modal do Ark Doctor clicando no botão 'Ark Doctor: Saudável'
        print("Abrindo modal do Ark Doctor via botão no card de Saúde...")
        await page.evaluate("""() => {
            const btn = Array.from(document.querySelectorAll('button, a, span')).find(el => el.textContent.includes('Ark Doctor: Saudável'));
            if (btn) btn.click();
        }""")
        await page.wait_for_timeout(2000)
        await page.screenshot(path=screenshot_doctor, full_page=False)
        print(f"[OK] Ark Doctor modal salvo: {screenshot_doctor}")

        # Fecha modal do doctor
        await page.evaluate("""() => {
            const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Fechar');
            if (closeBtn) closeBtn.click();
        }""")
        await page.wait_for_timeout(1000)

        # 2. Abre Central de Recursos e rola até UPnP
        print("Abrindo Central de Recursos para UPnP...")
        await page.evaluate("""() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Recursos');
            if (btn) btn.click();
        }""")
        await page.wait_for_timeout(2000)
        await page.evaluate("""() => {
            const list = document.querySelector('.ex-feature-list');
            if (list) {
                const rows = Array.from(list.querySelectorAll('.ex-feature-row'));
                const upnpRow = rows.find(r => r.textContent.includes('UPnP'));
                if (upnpRow) upnpRow.scrollIntoView({ behavior: 'instant', block: 'center' });
            }
        }""")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=screenshot_upnp, full_page=False)
        print(f"[OK] UPnP modal salvo: {screenshot_upnp}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
