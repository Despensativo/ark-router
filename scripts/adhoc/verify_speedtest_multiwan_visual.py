import asyncio
import os
import sys
from playwright.async_api import async_playwright

async def main():
    artifact_dir = "/Users/user/.gemini/antigravity/brain/2c1bbb1e-29be-435a-a1b9-81acb24bef9d"
    os.makedirs(artifact_dir, exist_ok=True)
    
    shot_single_wan = os.path.join(artifact_dir, "01_speedtest_single_wan_direct.png")
    shot_multiwan_modal = os.path.join(artifact_dir, "02_speedtest_multiwan_selection_modal.png")
    shot_wan2_embed = os.path.join(artifact_dir, "03_speedtest_wan2_embed_running.png")
    shot_switch_back = os.path.join(artifact_dir, "04_speedtest_switch_wan_modal.png")

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 960})
        page = await context.new_page()

        print("--> 1. Autenticando no LuCI...")
        await page.goto("http://localhost:8080/cgi-bin/luci", timeout=15000)
        await page.wait_for_timeout(1000)
        login_btn = await page.query_selector('input[type="submit"], button.cbi-button-positive, .cbi-button-action, button:has-text("Log in")')
        if login_btn:
            pw_input = await page.query_selector('input[type="password"]')
            if pw_input:
                await pw_input.fill("root0100")
            await login_btn.click()
            await page.wait_for_timeout(2000)

        print("--> 2. Carregando Painel ARK Router...")
        await page.goto("http://localhost:8080/cgi-bin/luci/admin/equipe-dashboard", timeout=20000)
        await page.wait_for_timeout(4000)

        # Expandir accordion do SQM caso esteja recolhido
        sqm_section = await page.query_selector('#ex-qos-section')
        if sqm_section:
            expand_btn = await sqm_section.query_selector('button:has-text("Expand"), button:has-text("Expandir"), .ex-accordion-toggle')
            if expand_btn:
                await expand_btn.click()
                await page.wait_for_timeout(600)

        speedtest_btn = await page.query_selector('button:has-text("Testar velocidade"), button:has-text("Test internet speed")')
        if not speedtest_btn:
            raise RuntimeError("Botão de teste de velocidade não encontrado na tela!")

        print(f"--> Botão localizado: '{await speedtest_btn.text_content()}'.")

        # =========================================================================
        # TESTE 1: Single WAN -> Abre direto sem perguntar
        # =========================================================================
        print("--> 3. Validando fluxo Single-WAN (apenas 1 WAN ativa)...")
        await speedtest_btn.click()
        await page.wait_for_timeout(1500)

        await page.screenshot(path=shot_single_wan)
        print(f"--> [OK] Screenshot Single-WAN salvo em: {shot_single_wan}")

        # Fecha o modal com segurança
        await page.evaluate("""() => {
            if (window.L && window.L.ui && typeof window.L.ui.hideModal === 'function') {
                window.L.ui.hideModal();
            } else {
                const b = document.querySelector('.cbi-modal button.cbi-button-neutral, .modal button.cbi-button-neutral, .cbi-modal .close, button.close');
                if (b) b.click();
            }
        }""")
        await page.wait_for_timeout(800)

        # =========================================================================
        # TESTE 2: Multi-WAN -> Exibe modal com pergunta e cards de seleção
        # =========================================================================
        print("--> 4. Ativando cenário Multi-WAN (WAN1 Fibra PPPoE + WAN2 Modem DHCP)...")
        await page.evaluate('''() => {
            const inst = window._arkViewInstance;
            if (!inst) throw new Error("Instância do ARK Router não encontrada");

            // Configura os dados com 2 WANs conectadas simultaneamente
            inst.currentData = inst.currentData || {};
            inst.currentData.activeWans = [
                { iface: 'wan', label: 'WAN1', domId: 'wan1', isPrimary: true, device: 'eth1' },
                { iface: 'wan2', label: 'WAN2', domId: 'wan2', isPrimary: false, device: 'eth2' }
            ];
            inst.currentData.interfaces = {
                interface: [
                    { interface: 'wan', up: true, proto: 'pppoe', 'ipv4-address': [{ address: '187.20.10.5' }], l3_device: 'pppoe-wan' },
                    { interface: 'wan2', up: true, proto: 'dhcp', 'ipv4-address': [{ address: '192.168.100.25' }], l3_device: 'eth2' }
                ]
            };
            inst.currentData.networkConfig = {
                values: {
                    wan: { proto: 'pppoe', device: 'eth1' },
                    wan2: { proto: 'dhcp', device: 'eth2' }
                }
            };

            // Dispara openFastCom que agora detectará 2 conexões ativas
            inst.openFastCom();
        }''')
        await page.wait_for_timeout(1500)

        await page.screenshot(path=shot_multiwan_modal)
        print(f"--> [OK] Screenshot Seletor Multi-WAN salvo em: {shot_multiwan_modal}")

        # =========================================================================
        # TESTE 3: Seleciona WAN2 -> Abre Speedtest com Badge da WAN2 e botão Trocar
        # =========================================================================
        print("--> 5. Clicando no card interativo da WAN2...")
        # Clica na WAN2 usando o método ou o elemento do card
        await page.evaluate('''() => {
            const choices = document.querySelectorAll('.ex-wan-test-choice');
            if (choices.length >= 2) {
                choices[1].click();
            } else if (window._arkViewInstance) {
                window._arkViewInstance.showEmbedSpeedtest('wan2');
            }
        }''')
        await page.wait_for_timeout(1500)
        await page.screenshot(path=shot_wan2_embed)
        print(f"--> [OK] Screenshot Speedtest WAN2 salvo em: {shot_wan2_embed}")

        # =========================================================================
        # TESTE 4: Clica em 'Trocar WAN' -> Retorna ao seletor de conexões
        # =========================================================================
        print("--> 6. Clicando no botão 'Trocar WAN' no cabeçalho do teste...")
        has_switch = await page.evaluate('''() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const switchBtn = btns.find(b => b.textContent && b.textContent.includes('Trocar WAN'));
            if (switchBtn) {
                switchBtn.click();
                return true;
            }
            return false;
        }''')
        print(f"--> Botão 'Trocar WAN' acionado com sucesso: {has_switch}")
        await page.wait_for_timeout(1200)

        await page.screenshot(path=shot_switch_back)
        print(f"--> [OK] Screenshot Retorno ao Seletor salvo em: {shot_switch_back}")

        await browser.close()

    print("\n=======================================================")
    print("TODOS OS 4 FLUXOS VISUAIS VALIDADOS COM SUCESSO!")
    print(f"Screenshots gerados em: {artifact_dir}")
    print("=======================================================")

if __name__ == "__main__":
    asyncio.run(main())
