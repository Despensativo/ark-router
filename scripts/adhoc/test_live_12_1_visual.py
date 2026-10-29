import os
import sys
from playwright.sync_api import sync_playwright

def main():
    print("[1] Iniciando Playwright...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-dev-shm-usage"]
        )
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            ignore_https_errors=True
        )
        page = context.new_page()

        console_msgs = []
        page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))

        print("[2] Efetuando login no DGL-5500 (192.168.12.1)...")
        page.goto("http://192.168.12.1/cgi-bin/luci", wait_until="domcontentloaded")
        page.wait_for_selector("input[name='luci_username']")
        page.fill("input[name='luci_username']", "root")
        page.fill("input[name='luci_password']", "admin0100")
        
        # Clica em entrar e aguarda a navegação do form submit
        with page.expect_navigation(wait_until="domcontentloaded"):
            page.click("input[type='submit']")

        print("[3] Autenticado com sucesso! Navegando para equipe-dashboard...")
        page.goto("http://192.168.12.1/cgi-bin/luci/admin/equipe-dashboard", wait_until="domcontentloaded")

        print("[4] Aguardando renderização dos cards do ARK Dashboard (.ex-card)...")
        page.wait_for_selector(".ex-card, #ex-hero-panel, #ex-lan-dhcp", timeout=30000)
        print("  ✅ Cards do ARK Dashboard renderizados com sucesso!")

        page.wait_for_timeout(3000)

        screenshot_path = "/Users/user/.gemini/antigravity/brain/c153d342-617a-468f-9d1c-3ff51183f705/dgl5500_12_1_dashboard.png"
        page.screenshot(path=screenshot_path, full_page=False)
        print(f"[5] Screenshot salvo em: {screenshot_path}")

        errs = [m for m in console_msgs if "[error]" in m]
        print(f"[6] Total de erros de console: {len(errs)}")
        for e in errs:
            print(f"  ❌ {e}")

        browser.close()

if __name__ == "__main__":
    main()
