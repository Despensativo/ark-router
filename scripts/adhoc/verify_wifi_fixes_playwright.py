import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def main():
    artifact_dir = "/Users/user/.gemini/antigravity/brain/4046d44f-ab77-4a64-a7dd-784d2471339b"
    os.makedirs(artifact_dir, exist_ok=True)
    screenshot_path = os.path.join(artifact_dir, "wifi_fixes_verified.png")

    errors = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"BROWSER CONSOLE: [{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: errors.append(str(err)))

        print("Navigating to http://localhost:8080/cgi-bin/luci ...")
        await page.goto("http://localhost:8080/cgi-bin/luci", timeout=15000)
        await page.wait_for_timeout(2000)

        # Login if login form appears
        login_btn = await page.query_selector('input[type="submit"], button[type="submit"], .cbi-button-action')
        if login_btn:
            pw_input = await page.query_selector('input[type="password"]')
            if pw_input:
                await pw_input.fill("root0100")
                await page.wait_for_timeout(500)
                await login_btn.click()
                await page.wait_for_timeout(3000)

        # Go to equipe dashboard / ark router
        await page.goto("http://localhost:8080/cgi-bin/luci/admin/equipe-dashboard", timeout=15000)
        await page.wait_for_timeout(4000)

        # Capture overview screenshot
        await page.screenshot(path=screenshot_path, full_page=False)
        print(f"Screenshot saved to {screenshot_path}")

        await browser.close()

    if errors:
        print(f"ERRORS DETECTED: {errors}")
        sys.exit(1)
    else:
        print("SUCCESS: Zero page errors detected!")

if __name__ == "__main__":
    asyncio.run(main())
