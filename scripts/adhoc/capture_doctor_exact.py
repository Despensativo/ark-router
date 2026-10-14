import asyncio
import os
from playwright.async_api import async_playwright

async def main():
    artifact_dir = "/Users/user/.gemini/antigravity/brain/2d380b29-adff-4112-a2e7-f616760a3608"
    screenshot_doctor = os.path.join(artifact_dir, "live_cudy_ark_doctor_modal.png")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 950})
        page = await context.new_page()

        await page.goto("http://192.168.21.1/cgi-bin/luci/admin/equipe-dashboard", timeout=20000)
        await page.wait_for_load_state("networkidle")

        pw = await page.query_selector('input[name="luci_password"]')
        if pw:
            await pw.fill(os.environ.get("ARK_ROUTER_TEST_PASSWORD", ""))
            await page.keyboard.press("Enter")
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)

        # Clica diretamente no botão #ex-doctor-pill
        print("Clicando no botão #ex-doctor-pill...")
        await page.click('#ex-doctor-pill')
        await page.wait_for_timeout(2500)

        await page.screenshot(path=screenshot_doctor, full_page=False)
        print(f"[OK] Ark Doctor modal salvo: {screenshot_doctor}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
