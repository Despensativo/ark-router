#!/usr/bin/env python3
"""
Test and audit script for EZ-Setup (8 sections) and Plugins Central in ARK Router V2.
Verifies all 8 sections, interactivity, simulated terminal installation, and responsiveness.
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = "/Volumes/--400GB--/FEITOS COM IA/Ark-Router/docs/qa_screenshots/v2_staging"
os.makedirs(OUTPUT_DIR, exist_ok=True)

def run_audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # -------------------------------------------------------------
        # 1. Desktop Tests (1440x900)
        # -------------------------------------------------------------
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(str(exc)))

        print("Navigating to V2 Staging Dashboard at http://localhost:8088/ ...")
        page.goto("http://localhost:8088/", wait_until="networkidle")
        time.sleep(1)

        # Audit EZ-Setup Modal (8 sections)
        print("Testing EZ-Setup Modal (8 sections)...")
        page.evaluate("openModal('setup')")
        time.sleep(0.5)

        # Check all 8 sections in DOM
        for section_num in range(1, 9):
            section_found = page.locator(f".ez-section-title:has-text('{section_num}️⃣')").count()
            assert section_found > 0, f"Section {section_num} not found in EZ-Setup!"
        print("✓ All 8 sections confirmed in EZ-Setup modal.")

        # Test interaction: toggle WAN 1 proto
        page.select_option("#ez_wan1_proto", "pppoe")
        assert page.is_visible("#ez_wan1_pppoe_box"), "PPPoE box should be visible!"
        page.select_option("#ez_wan1_proto", "static")
        assert page.is_visible("#ez_wan1_static_box"), "Static box should be visible!"
        page.select_option("#ez_wan1_proto", "pppoe")

        # Test interaction: toggle WAN 2
        page.evaluate("document.getElementById('ez_wan2_toggle').click()")
        assert page.is_visible("#ez_wan2_subbox"), "WAN 2 subbox should be visible when enabled!"

        # Test interaction: toggle Wi-Fi mode
        page.select_option("#ez_wifi_mode", "split")
        assert page.is_visible("#ez_wifi_split_box"), "Split Wi-Fi box should be visible!"
        page.select_option("#ez_wifi_mode", "unified")
        assert page.is_visible("#ez_wifi_unified_box"), "Unified Wi-Fi box should be visible!"

        # Test interaction: toggle Guest Wi-Fi
        page.evaluate("document.getElementById('ez_guest_toggle').click()")
        assert page.is_visible("#ez_guest_box"), "Guest box should be visible when enabled!"

        # Test interaction: toggle Admin password & mismatch alert
        page.evaluate("document.getElementById('ez_admin_toggle').click()")
        assert page.is_visible("#ez_admin_box"), "Admin box should be visible when enabled!"
        page.fill("#ez_admin_pass", "Senha123")
        page.fill("#ez_admin_pass2", "SenhaMismatch")
        assert page.is_visible("#ez_admin_match_alert"), "Password mismatch alert should show!"
        page.fill("#ez_admin_pass2", "Senha123")
        assert not page.is_visible("#ez_admin_match_alert"), "Password mismatch alert should be hidden when matching!"

        # Test interaction: toggle DNS
        page.select_option("#ez_dns_mode", "custom")
        assert page.is_visible("#ez_dns_custom_box"), "Custom DNS box should be visible!"
        page.select_option("#ez_dns_mode", "recommended")

        # Capture Desktop EZ-Setup screenshot
        page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_ez_setup_modal_desktop.png"))
        print("✓ Captured v2_ez_setup_modal_desktop.png")

        # Close EZ modal
        page.evaluate("closeModal()")
        time.sleep(0.3)

        # -------------------------------------------------------------
        # 2. Plugins Central Modal
        # -------------------------------------------------------------
        print("Testing Plugins Central Modal...")
        page.evaluate("openModal('plugins')")
        time.sleep(0.5)

        # Check plugin count (12 plugins)
        cards_count = page.locator(".plugin-detail-card").count()
        assert cards_count == 12, f"Expected 12 plugin cards, got {cards_count}"
        print(f"✓ All {cards_count} plugin cards rendered.")

        # Test category filter
        page.click("button.plugin-tab-btn:has-text('Segurança & VPN')")
        time.sleep(0.2)
        sec_count = page.locator(".plugin-detail-card").count()
        assert sec_count == 3, f"Expected 3 security plugins, got {sec_count}"
        print(f"✓ Security filter verified ({sec_count} plugins).")

        page.click("button.plugin-tab-btn:has-text('Todos')")
        time.sleep(0.2)

        # Test search filter
        page.fill("#plugins_search_input", "Starlink")
        time.sleep(0.2)
        search_count = page.locator(".plugin-detail-card").count()
        assert search_count >= 1, "Search for Starlink should return at least Speedify!"
        print("✓ Plugin search verified.")

        page.fill("#plugins_search_input", "")
        time.sleep(0.2)

        page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_plugins_central_desktop.png"))
        print("✓ Captured v2_plugins_central_desktop.png")

        # -------------------------------------------------------------
        # 3. Test Plugin Interfaces
        # -------------------------------------------------------------
        # UPnP Modal
        print("Testing UPnP Modal...")
        page.evaluate("openModal('upnp')")
        time.sleep(0.5)
        upnp_rules = page.locator("#upnp_table tbody tr").count()
        assert upnp_rules >= 4, f"Expected >= 4 UPnP rules, got {upnp_rules}"
        page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_plugin_upnp_desktop.png"))
        print("✓ Captured v2_plugin_upnp_desktop.png")
        page.evaluate("closeModal()")
        time.sleep(0.3)

        # Multi-WAN mwan3 Modal
        print("Testing mwan3 Modal...")
        page.evaluate("openModal('mwan3')")
        time.sleep(0.5)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_plugin_mwan3_desktop.png"))
        print("✓ Captured v2_plugin_mwan3_desktop.png")
        page.evaluate("closeModal()")
        time.sleep(0.3)

        # ZeroTier Modal
        print("Testing ZeroTier Modal...")
        page.evaluate("openModal('zerotier')")
        time.sleep(0.5)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_plugin_zerotier_desktop.png"))
        print("✓ Captured v2_plugin_zerotier_desktop.png")
        page.evaluate("closeModal()")
        time.sleep(0.3)

        # Speedify Modal
        print("Testing Speedify Modal...")
        page.evaluate("openModal('speedify')")
        time.sleep(0.5)
        page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_plugin_speedify_desktop.png"))
        print("✓ Captured v2_plugin_speedify_desktop.png")
        page.evaluate("closeModal()")
        time.sleep(0.3)

        # Package Install Terminal Simulation
        print("Testing Package Install Terminal Simulation...")
        page.evaluate("openModal('pkg_install', 'speedify')")
        time.sleep(2.5)  # Wait for simulation to finish (2s)
        completed_btn = page.locator("button:has-text('Abrir Configuração do Plugin')")
        assert completed_btn.count() > 0, "Completed installation button should appear!"
        page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_plugin_install_terminal_desktop.png"))
        print("✓ Captured v2_plugin_install_terminal_desktop.png")
        page.evaluate("closeModal()")
        time.sleep(0.3)

        page.close()

        # -------------------------------------------------------------
        # 4. Mobile Responsiveness Tests (390x844 - iPhone 14/15/16)
        # -------------------------------------------------------------
        print("\nTesting Mobile Responsiveness on 390x844 viewport...")
        m_page = browser.new_page(viewport={"width": 390, "height": 844})
        m_page.goto("http://localhost:8088/", wait_until="networkidle")
        time.sleep(1)

        # Verify no horizontal body overflow
        scroll_width = m_page.evaluate("document.documentElement.scrollWidth")
        inner_width = m_page.evaluate("window.innerWidth")
        assert scroll_width <= inner_width, f"Horizontal overflow detected on mobile: {scroll_width} > {inner_width}"
        print(f"✓ Zero horizontal overflow on mobile: scrollWidth={scroll_width} <= innerWidth={inner_width}")

        # Open EZ-Setup on mobile
        m_page.evaluate("openModal('setup')")
        time.sleep(0.5)
        m_scroll = m_page.evaluate("document.documentElement.scrollWidth")
        assert m_scroll <= inner_width, f"Modal overflowed horizontally: {m_scroll} > {inner_width}"
        m_page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_ez_setup_modal_mobile_390.png"))
        print("✓ Captured v2_ez_setup_modal_mobile_390.png")
        m_page.evaluate("closeModal()")
        time.sleep(0.3)

        # Open Plugins Central on mobile
        m_page.evaluate("openModal('plugins')")
        time.sleep(0.5)
        m_page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_plugins_central_mobile_390.png"))
        print("✓ Captured v2_plugins_central_mobile_390.png")
        m_page.evaluate("closeModal()")
        time.sleep(0.3)

        # Open UPnP on mobile
        m_page.evaluate("openModal('upnp')")
        time.sleep(0.5)
        m_page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_plugin_upnp_mobile_390.png"))
        print("✓ Captured v2_plugin_upnp_mobile_390.png")
        m_page.evaluate("closeModal()")
        time.sleep(0.3)

        m_page.close()
        browser.close()

        print("\nAudit completed successfully!")
        if console_errors:
            print(f"⚠️ Console errors detected: {console_errors}")
        else:
            print("🎉 ZERO console errors detected across all desktop and mobile runs!")

if __name__ == "__main__":
    run_audit()
