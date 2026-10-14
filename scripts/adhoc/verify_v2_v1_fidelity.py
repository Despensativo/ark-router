#!/usr/bin/env python3
import asyncio
from playwright.async_api import async_playwright

async def run():
    print("Iniciando auditoria visual e funcional do V2 com fidelidade V1...")
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1440, "height": 900})

        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        await page.goto("http://localhost:8088/")
        await page.wait_for_selector("#sec-overview")
        await asyncio.sleep(1)

        # 1. Capture Main Dashboard (V1 structure)
        await page.screenshot(path="docs/screenshots/v2_fidelity_overview.png", full_page=False)
        print("✅ Screenshot salvo: docs/screenshots/v2_fidelity_overview.png")

        # 2. Test LuCI Drawer and Click on Route
        await page.click("button:has-text('🛠️ LuCI Nativo ▾')")
        await page.wait_for_selector("#luci_drawer.open")
        await page.screenshot(path="docs/screenshots/v2_fidelity_luci_drawer.png")
        print("✅ Screenshot salvo: docs/screenshots/v2_fidelity_luci_drawer.png")

        # Click on a LuCI native link
        await page.click("a.drawer-link:has-text('Visão Geral Original (Status)')")
        await page.wait_for_selector("#luci_native_view_container.active")
        await page.screenshot(path="docs/screenshots/v2_fidelity_luci_simulator.png")
        print("✅ Screenshot salvo: docs/screenshots/v2_fidelity_luci_simulator.png")

        # Return to V2 Dashboard
        await page.click("button:has-text('⬅ Voltar ao Painel ARK Router V2')")
        await asyncio.sleep(0.5)

        # 3. Test Radio Modal (Verify <select> elements)
        await page.click("button:has-text('⚙️ Editar Rádio 5 GHz')")
        await page.wait_for_selector("body.modal-overlay-active")
        
        # Verify selects exist
        ch_select = await page.query_selector("select#m_radio_ch")
        width_select = await page.query_selector("select#m_radio_width")
        tx_select = await page.query_selector("select#m_radio_tx")
        assert ch_select is not None, "m_radio_ch deve ser um <select>!"
        assert width_select is not None, "m_radio_width deve ser um <select>!"
        assert tx_select is not None, "m_radio_tx deve ser um <select>!"

        await page.screenshot(path="docs/screenshots/v2_fidelity_radio_selects.png")
        print("✅ Screenshot salvo: docs/screenshots/v2_fidelity_radio_selects.png (100% Selects)")
        await page.click("button:has-text('💾 Salvar Rádio')")
        await asyncio.sleep(0.5)

        # 4. Test WAN Modal (Verify <select> for protocol, mtu, dns)
        await page.click("#card_wan1 button:has-text('⚙️ Editar Internet')")
        await page.wait_for_selector("body.modal-overlay-active")
        wan_proto = await page.query_selector("select#m_wan_proto")
        wan_mtu = await page.query_selector("select#m_wan_mtu")
        wan_dns = await page.query_selector("select#m_wan_dns")
        assert wan_proto is not None, "m_wan_proto deve ser <select>!"
        assert wan_mtu is not None, "m_wan_mtu deve ser <select>!"
        assert wan_dns is not None, "m_wan_dns deve ser <select>!"

        await page.screenshot(path="docs/screenshots/v2_fidelity_wan_selects.png")
        print("✅ Screenshot salvo: docs/screenshots/v2_fidelity_wan_selects.png (100% Selects)")
        await page.click("button:has-text('💾 Salvar e Aplicar')")
        await asyncio.sleep(0.5)

        # 5. Test Device Modal (Verify <select> for type and prio)
        await page.click("#device_table_body tr:first-child button:has-text('⚙️ Editar')")
        await page.wait_for_selector("body.modal-overlay-active")
        dev_type = await page.query_selector("select#m_dev_type")
        dev_prio = await page.query_selector("select#m_dev_prio")
        assert dev_type is not None, "m_dev_type deve ser <select>!"
        assert dev_prio is not None, "m_dev_prio deve ser <select>!"

        await page.screenshot(path="docs/screenshots/v2_fidelity_device_selects.png")
        print("✅ Screenshot salvo: docs/screenshots/v2_fidelity_device_selects.png (100% Selects)")
        await page.click("button:has-text('💾 Salvar Alterações')")
        await asyncio.sleep(0.5)

        # 6. Test SQM Modal (Verify <select> for preset)
        await page.click("button:has-text('⚙️ Calibrar Banda & Framing')")
        await page.wait_for_selector("body.modal-overlay-active")
        sqm_preset = await page.query_selector("select#m_sqm_preset")
        assert sqm_preset is not None, "m_sqm_preset deve ser <select>!"
        await page.screenshot(path="docs/screenshots/v2_fidelity_sqm_selects.png")
        print("✅ Screenshot salvo: docs/screenshots/v2_fidelity_sqm_selects.png (100% Selects)")
        await page.click("button:has-text('💾 Salvar Calibração SQM')")
        await asyncio.sleep(0.5)

        # Check console errors
        print(f"Erros de console registrados: {len(console_errors)}")
        if console_errors:
            print("Erros:", console_errors)
        assert len(console_errors) == 0, f"Erros encontrados: {console_errors}"

        await browser.close()
        print("🎉 Todos os testes passaram com sucesso e 0 erros de console!")

if __name__ == "__main__":
    asyncio.run(run())
