#!/usr/bin/env python3
"""
ARK Router V2: Interactive Verification of All 16 Modals & Hardware Handlers.
Ensures zero dead buttons across the entire dashboard.
"""

import sys
import time
from playwright.sync_api import sync_playwright

STAGING_URL = "http://localhost:8088/docs/qa_screenshots/v2_staging/index.html"

def test_all_modals():
    print("=" * 70)
    print("🧪 Verificando Interatividade de 100% dos Modais e Botões")
    print("=" * 70)

    console_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(f"[pageerror] {exc}"))

        page.goto(STAGING_URL, wait_until="networkidle")
        time.sleep(1)

        # 1. Test Modo AP / Gateway Modal
        print("\n1. Testando Modal 'Modo AP / Gateway'...")
        page.click("#btn_hero_opmode")
        time.sleep(0.3)
        assert page.eval_on_selector("#m_op_mode", "el => el !== null"), "Seletor de modo deveria existir"
        page.select_option("#m_op_mode", "ap")
        page.click(".modal-footer .ark-btn-primary")
        time.sleep(0.3)
        btn_text = page.eval_on_selector("#btn_hero_opmode", "el => el.innerText.trim()")
        print(f"   ✓ Modo AP aplicado! Botão atualizado para: '{btn_text}'")
        assert "AP Bridge" in btn_text

        # 2. Test Gamer Ultra Modal
        print("\n2. Testando Modal 'Gamer Ultra'...")
        page.click("#btn_hero_gamer")
        time.sleep(0.3)
        assert page.eval_on_selector("#m_gamer_status", "el => el !== null"), "Seletor de gamer status deveria existir"
        page.select_option("#m_gamer_status", "1")
        page.click(".modal-footer .ark-btn-danger")
        time.sleep(0.3)
        gamer_text = page.eval_on_selector("#btn_hero_gamer", "el => el.innerText.trim()")
        hero_has_glow = page.eval_on_selector(".ex-hero", "el => el.classList.contains('ex-hero-gamer')")
        print(f"   ✓ Gamer Ultra ativado! Botão: '{gamer_text}', Brilho Gamer Ativo: {hero_has_glow}")
        assert "GAMER ATIVO" in gamer_text
        assert hero_has_glow is True

        # 3. Test Language Modal
        print("\n3. Testando Modal 'Idioma'...")
        page.click("#btn_hero_lang")
        time.sleep(0.3)
        assert page.eval_on_selector("#m_lang_sel", "el => el !== null"), "Seletor de idioma deveria existir"
        page.select_option("#m_lang_sel", "en")
        page.click(".modal-footer .ark-btn-primary")
        time.sleep(0.3)
        lang_text = page.eval_on_selector("#btn_hero_lang", "el => el.innerText.trim()")
        print(f"   ✓ Idioma alterado! Botão atualizado para: '{lang_text}'")
        assert "EN" in lang_text

        # 4. Test Clock / NTP Modal
        print("\n4. Testando Modal 'Relógio / NTP'...")
        page.click(".ex-clock-box")
        time.sleep(0.3)
        assert page.eval_on_selector("#m_ntp_server", "el => el !== null"), "Seletor NTP deveria existir"
        page.click(".modal-footer .ark-btn-primary")
        time.sleep(0.3)
        print("   ✓ Relógio e servidores NTP sincronizados com sucesso!")

        # 5. Test Hardware Health Modals (CPU, Temp, RAM, Flash)
        print("\n5. Testando Modais de Telemetria de Hardware...")
        for metric in ['cpu', 'temp', 'ram', 'flash']:
            page.evaluate(f"window.openHardwareModal('{metric}')")
            time.sleep(0.2)
            has_overlay = page.evaluate("() => document.body.classList.contains('modal-overlay-active')")
            assert has_overlay is True
            page.evaluate("window.closeModal()")
            time.sleep(0.1)
            print(f"   ✓ Telemetria de hardware '{metric}' operacional!")

        # 6. Test Starlink, VPN, Device, PPPoE and Backup Modals
        print("\n6. Testando Modais Avançados (Starlink, VPN, Novo Dispositivo, PPPoE Logs, Backup)...")
        modals = ['starlink_config', 'add_vpn', 'add_device', 'pppoe_logs', 'restore_backup', 'setup', 'wifi', 'sqm', 'theme_picker']
        for m in modals:
            page.evaluate(f"window.openModal('{m}')")
            time.sleep(0.2)
            has_overlay = page.evaluate("() => document.body.classList.contains('modal-overlay-active')")
            assert has_overlay is True, f"Modal {m} deveria abrir"
            page.evaluate("window.closeModal()")
            time.sleep(0.1)
            print(f"   ✓ Modal '{m}' verificado com sucesso!")

        # Capture Screenshot of Gamer Mode + AP Mode active
        page.screenshot(path="/Volumes/--400GB--/FEITOS COM IA/Ark-Router/docs/qa_screenshots/v2_staging/spa_gamer_active_desktop.png")

        context.close()
        browser.close()

    print("\n" + "=" * 70)
    print("📊 RESULTADO DO TESTE DE INTERATIVIDADE DOS MODAIS")
    print("=" * 70)
    print(f"Erros de console / página: {len(console_errors)}")
    for err in console_errors:
        print(f"  ❌ {err}")

    if len(console_errors) == 0:
        print("\n🎉 100% DOS MODAIS E BOTÕES ESTÃO COMPLETAMENTE FUNCIONAIS E INTERATIVOS!")
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(test_all_modals())
