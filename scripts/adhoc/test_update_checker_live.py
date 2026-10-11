import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def main():
    artifact_dir = "/Users/user/.gemini/antigravity/brain/2d380b29-adff-4112-a2e7-f616760a3608"
    screenshot_banner = os.path.join(artifact_dir, "live_cudy_update_banner.png")
    screenshot_modal_ok = os.path.join(artifact_dir, "live_cudy_update_modal_healthy.png")
    screenshot_modal_blocked = os.path.join(artifact_dir, "live_cudy_update_modal_blocked.png")

    console_errors = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1280, "height": 950})
        page = await context.new_page()

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(str(exc)))

        print("1. Conectando ao roteador Cudy WR3000 v1 (192.168.21.1)...")
        await page.goto("http://192.168.21.1/cgi-bin/luci/admin/equipe-dashboard", timeout=20000)
        await page.wait_for_load_state("networkidle")

        pw = await page.query_selector('input[name="luci_password"]')
        if pw:
            await pw.fill("admin0100")
            await page.keyboard.press("Enter")
            await page.wait_for_load_state("networkidle")
            await page.wait_for_timeout(3000)

        # Espera o dashboard inicializar
        await page.wait_for_selector('.ex-hero', timeout=10000)
        print("Dashboard carregado com sucesso!")

        # 2. Testa e exibe o Banner de Nova Versão
        print("2. Renderizando Banner de Atualização...")
        await page.evaluate("""() => {
            const mockInfo = {
                available: true,
                current: "1.5.14",
                latest: "1.5.15",
                profile: "full",
                actual_profile: "full",
                asset: "luci-app-ark-router_1.5.15_all.apk",
                manager: "apk",
                overlay_free_kb: 1620,
                tmp_free_kb: 115248,
                need_overlay_kb: 650,
                need_tmp_kb: 1500,
                space_ok: true,
                space_warning: false,
                changelog: "### Novidades da versão 1.5.15\\n• Novo checador inteligente de atualização com cache de 12 horas.\\n• Diagnóstico fino de armazenamento com ponto de corte estrito (650 KB).\\n• Suporte estendido a hardware Filogic e aceleração de pacotes."
            };
            window._testMockInfo = mockInfo;
            if (window.arkDashboard && typeof window.arkDashboard.renderUpdateBanner === 'function') {
                window.arkDashboard.renderUpdateBanner(mockInfo);
            }
        }""")
        await page.wait_for_timeout(1000)
        await page.screenshot(path=screenshot_banner, full_page=False)
        print(f"[OK] Screenshot do Banner salva: {screenshot_banner}")

        # 3. Abre Modal de Confirmação com Espaço Saudável (>650KB)
        print("3. Abrindo Modal de Confirmação (Espaço Saudável)...")
        await page.evaluate("""() => {
            if (window.arkDashboard && typeof window.arkDashboard.showUpdateConfirmModal === 'function') {
                window.arkDashboard.showUpdateConfirmModal(window._testMockInfo);
            }
        }""")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=screenshot_modal_ok, full_page=False)
        print(f"[OK] Screenshot da Modal (Espaço Saudável) salva: {screenshot_modal_ok}")

        # Fecha modal
        await page.evaluate("""() => {
            const cancelBtn = Array.from(document.querySelectorAll('.cbi-modal button')).find(b => b.textContent.includes('Cancelar'));
            if (cancelBtn) cancelBtn.click();
        }""")
        await page.wait_for_timeout(800)

        # 4. Abre Modal de Confirmação com Espaço Bloqueado (<650KB)
        print("4. Abrindo Modal com Ponto de Corte Bloqueado (<650KB)...")
        await page.evaluate("""() => {
            const blockedInfo = Object.assign({}, window._testMockInfo, {
                overlay_free_kb: 480, // Abaixo do corte de 650 KB
                space_ok: false,
                space_warning: false
            });
            if (window.arkDashboard && typeof window.arkDashboard.showUpdateConfirmModal === 'function') {
                window.arkDashboard.showUpdateConfirmModal(blockedInfo);
            }
        }""")
        await page.wait_for_timeout(1500)
        await page.screenshot(path=screenshot_modal_blocked, full_page=False)
        print(f"[OK] Screenshot da Modal (Bloqueio por Espaço) salva: {screenshot_modal_blocked}")

        # Fecha modal
        await page.evaluate("""() => {
            const cancelBtn = Array.from(document.querySelectorAll('.cbi-modal button')).find(b => b.textContent.includes('Cancelar'));
            if (cancelBtn) cancelBtn.click();
        }""")
        await page.wait_for_timeout(800)

        # 5. Testa botão Ocultar ✕ do Banner
        print("5. Testando persistência do botão 'Ocultar ✕' do Banner...")
        dismissed_before = await page.evaluate("() => localStorage.getItem('ark_dismissed_update')")
        print(f"localStorage antes: {dismissed_before}")

        dismiss_clicked = await page.evaluate("""() => {
            const btn = Array.from(document.querySelectorAll('.ex-update-banner button')).find(b => b.textContent.includes('Ocultar'));
            if (btn) {
                btn.click();
                return true;
            }
            return false;
        }""")
        print(f"Botão Ocultar clicado: {dismiss_clicked}")
        await page.wait_for_timeout(600)

        dismissed_after = await page.evaluate("() => localStorage.getItem('ark_dismissed_update')")
        print(f"localStorage após 'Ocultar ✕': {dismissed_after}")
        assert dismissed_after == "1.5.15", f"Esperado '1.5.15', obtido '{dismissed_after}'"
        print("Botão Ocultar ✕ funcionou e persistiu com sucesso!")

        if console_errors:
            print("AVISO: Erros detectados no console do navegador:", console_errors)
        else:
            print("Console 100% limpo, zero erros de JavaScript!")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
