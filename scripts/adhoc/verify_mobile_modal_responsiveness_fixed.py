#!/usr/bin/env python3
"""
ARK Router V2 - Mobile Modal Responsiveness QA Verification
Validates that:
1. Rigid 92dvh is replaced by natural auto-height (no ~450px dead void on short modals).
2. Modal footer buttons are arranged in a 2-column grid side-by-side (no cutoff at screen bottom).
3. Wi-Fi modal duplicate fields bug is resolved.
4. Full mobile usability verified on 390x844 (iOS) and 360x740 (Android).
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright

STAGING_URL = "http://localhost:8088/docs/qa_screenshots/v2_staging/index.html"
OUTPUT_DIR = "/Volumes/--400GB--/FEITOS COM IA/Ark-Router/docs/qa_screenshots/v2_staging"

def run_modal_responsiveness_tests():
    print("=" * 75)
    print("📱 AUDITORIA VISUAL DE RESPONSIVIDADE MOBILE: MODAIS V2 CORRIGIDOS")
    print("=" * 75)

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # -------------------------------------------------------------
        # TEST 1: Mobile 390x844 (iPhone standard)
        # -------------------------------------------------------------
        print("\n[DISPOSITIVO 1: Mobile 390 x 844 (iOS / iPhone)]")
        ctx_390 = browser.new_context(
            viewport={"width": 390, "height": 844},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True
        )
        page = ctx_390.new_page()
        page.goto(STAGING_URL, wait_until="networkidle")
        time.sleep(1)

        # 1A. Test Short Modal: Configurar Rádio 5 GHz (Recreating user screenshot 1)
        print("\n1A. Verificando Modal 'Configurar Rádio — 5 GHz'...")
        page.evaluate("window.openRadioModal('5')")
        time.sleep(0.5)

        # Measure modal box geometry
        modal_box = page.query_selector(".modal-box")
        box_rect = modal_box.bounding_box()
        footer = page.query_selector(".modal-footer")
        footer_rect = footer.bounding_box()
        cancel_btn = page.query_selector(".modal-footer .ark-btn-secondary")
        cancel_rect = cancel_btn.bounding_box()
        save_btn = page.query_selector(".modal-footer .ark-btn-primary")
        save_rect = save_btn.bounding_box()

        print(f"   -> Modal Box Dimensões: {box_rect['width']:.1f}px x {box_rect['height']:.1f}px (Pos Y: {box_rect['y']:.1f}px)")
        print(f"   -> Altura total da tela: 844px. Altura ocupada pelo modal: {box_rect['height']:.1f}px ({box_rect['height']/844*100:.1f}%)")
        print(f"   -> Botão Cancelar: {cancel_rect['width']:.1f}x{cancel_rect['height']:.1f}px em Y={cancel_rect['y']:.1f}px")
        print(f"   -> Botão Salvar:   {save_rect['width']:.1f}x{save_rect['height']:.1f}px em Y={save_rect['y']:.1f}px")

        # Assertions for Short Modal
        assert box_rect['height'] < 550, f"Modal curto não pode ter 92dvh! Altura atual: {box_rect['height']}px"
        assert abs(cancel_rect['y'] - save_rect['y']) < 5, "Botões devem estar lado a lado na mesma linha (grid 2-col)"
        assert footer_rect['y'] + footer_rect['height'] <= 844, "Footer não pode ser cortado na borda inferior da tela"

        radio_shot_path = os.path.join(OUTPUT_DIR, "v2_fixed_modal_radio_5g_mobile_390.png")
        page.screenshot(path=radio_shot_path)
        print(f"   ✓ Screenshot salvo: {radio_shot_path}")

        # Close modal
        page.evaluate("window.closeModal()")
        time.sleep(0.4)

        # 1B. Test Full/Long Modal: Configurar Redes Wi-Fi (Recreating user screenshot 2)
        print("\n1B. Verificando Modal 'Configurar Redes Wi-Fi'...")
        page.evaluate("window.openModal('wifi')")
        time.sleep(0.5)

        wifi_modal_box = page.query_selector(".modal-box")
        wifi_box_rect = wifi_modal_box.bounding_box()
        wifi_footer = page.query_selector(".modal-footer")
        wifi_footer_rect = wifi_footer.bounding_box()
        wifi_cancel = page.query_selector(".modal-footer .ark-btn-secondary")
        wifi_cancel_rect = wifi_cancel.bounding_box()
        wifi_save = page.query_selector(".modal-footer .ark-btn-primary")
        wifi_save_rect = wifi_save.bounding_box()

        # Check split fields initial state
        split_display = page.eval_on_selector("#wifi_split_fields", "el => window.getComputedStyle(el).display")
        unified_display = page.eval_on_selector("#wifi_unified_fields", "el => window.getComputedStyle(el).display")

        print(f"   -> Split fields display: '{split_display}' (esperado: none)")
        print(f"   -> Unified fields display: '{unified_display}' (esperado: block)")
        assert split_display == "none", "wifi_split_fields DEVE estar oculto por padrão!"
        assert unified_display == "block", "wifi_unified_fields DEVE estar visível por padrão!"

        print(f"   -> Modal Box Dimensões: {wifi_box_rect['width']:.1f}px x {wifi_box_rect['height']:.1f}px")
        print(f"   -> Footer Y inferior: {wifi_footer_rect['y'] + wifi_footer_rect['height']:.1f}px (Viewport max: 844px)")
        print(f"   -> Botão Cancelar: {wifi_cancel_rect['width']:.1f}x{wifi_cancel_rect['height']:.1f}px em Y={wifi_cancel_rect['y']:.1f}px")
        print(f"   -> Botão Atualizar: {wifi_save_rect['width']:.1f}x{wifi_save_rect['height']:.1f}px em Y={wifi_save_rect['y']:.1f}px")

        # Assertions for Wi-Fi Modal
        assert wifi_footer_rect['y'] + wifi_footer_rect['height'] <= 844, "Footer do Wi-Fi cortado na tela!"
        assert abs(wifi_cancel_rect['y'] - wifi_save_rect['y']) < 5, "Botões Cancelar e Atualizar devem estar lado a lado"
        assert wifi_cancel_rect['height'] >= 42, "Botão Cancelar deve ter altura mínima de 42px"
        assert wifi_save_rect['height'] >= 42, "Botão Salvar deve ter altura mínima de 42px"

        wifi_shot_path = os.path.join(OUTPUT_DIR, "v2_fixed_modal_wifi_mobile_390.png")
        page.screenshot(path=wifi_shot_path)
        print(f"   ✓ Screenshot salvo: {wifi_shot_path}")

        # 1C. Test Wi-Fi Split Toggle
        print("\n1C. Testando Switch 'Separar Nomes por Frequência'...")
        page.evaluate("document.getElementById('m_wifi_split_toggle').click()")
        time.sleep(0.4)
        split_display_after = page.eval_on_selector("#wifi_split_fields", "el => window.getComputedStyle(el).display")
        unified_display_after = page.eval_on_selector("#wifi_unified_fields", "el => window.getComputedStyle(el).display")
        print(f"   -> Após toggle: split='{split_display_after}', unified='{unified_display_after}'")
        assert split_display_after == "flex"
        assert unified_display_after == "none"

        # Scroll modal body down
        page.eval_on_selector(".modal-body", "el => el.scrollTop = el.scrollHeight")
        time.sleep(0.3)

        wifi_split_shot = os.path.join(OUTPUT_DIR, "v2_fixed_modal_wifi_split_toggled_390.png")
        page.screenshot(path=wifi_split_shot)
        print(f"   ✓ Screenshot salvo com split ativado: {wifi_split_shot}")

        page.evaluate("window.closeModal()")
        time.sleep(0.4)
        ctx_390.close()

        # -------------------------------------------------------------
        # TEST 2: Compact Android 360x740
        # -------------------------------------------------------------
        print("\n[DISPOSITIVO 2: Mobile Compacto 360 x 740 (Android Padrão)]")
        ctx_360 = browser.new_context(
            viewport={"width": 360, "height": 740},
            device_scale_factor=2,
            is_mobile=True,
            has_touch=True
        )
        page360 = ctx_360.new_page()
        page360.goto(STAGING_URL, wait_until="networkidle")
        time.sleep(1)

        # Test Radio 5G modal on 360x740
        page360.evaluate("window.openRadioModal('5')")
        time.sleep(0.4)

        box360 = page360.query_selector(".modal-box").bounding_box()
        foot360 = page360.query_selector(".modal-footer").bounding_box()
        print(f"   -> 360x740 Radio Box: {box360['width']:.1f}x{box360['height']:.1f}px (Pos Y: {box360['y']:.1f}px)")
        print(f"   -> 360x740 Footer bottom: {foot360['y'] + foot360['height']:.1f}px <= 740px")
        assert foot360['y'] + foot360['height'] <= 740

        radio_360_shot = os.path.join(OUTPUT_DIR, "v2_fixed_modal_radio_5g_mobile_360.png")
        page360.screenshot(path=radio_360_shot)
        print(f"   ✓ Screenshot salvo: {radio_360_shot}")

        page360.evaluate("window.closeModal()")
        time.sleep(0.3)

        # Test Wi-Fi modal on 360x740
        page360.evaluate("window.openModal('wifi')")
        time.sleep(0.4)

        wbox360 = page360.query_selector(".modal-box").bounding_box()
        wfoot360 = page360.query_selector(".modal-footer").bounding_box()
        print(f"   -> 360x740 Wi-Fi Box: {wbox360['width']:.1f}x{wbox360['height']:.1f}px")
        print(f"   -> 360x740 Wi-Fi Footer bottom: {wfoot360['y'] + wfoot360['height']:.1f}px <= 740px")
        assert wfoot360['y'] + wfoot360['height'] <= 740

        wifi_360_shot = os.path.join(OUTPUT_DIR, "v2_fixed_modal_wifi_mobile_360.png")
        page360.screenshot(path=wifi_360_shot)
        print(f"   ✓ Screenshot salvo: {wifi_360_shot}")

        # Also test WAN PPPoE modal on 360x740
        page360.evaluate("window.closeModal()")
        time.sleep(0.3)
        page360.evaluate("window.openWanModal('wan1')")
        time.sleep(0.5)

        wan_360_shot = os.path.join(OUTPUT_DIR, "v2_fixed_modal_wan_mobile_360.png")
        page360.screenshot(path=wan_360_shot)
        print(f"   ✓ Screenshot salvo WAN: {wan_360_shot}")

        ctx_360.close()
        browser.close()

    print("\n" + "=" * 75)
    print("✅ TODAS AS VALIDAÇÕES DE RESPONSIVIDADE MOBILE PASSARAM COM SUCESSO!")
    print("=" * 75)

if __name__ == "__main__":
    run_modal_responsiveness_tests()
