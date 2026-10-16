#!/usr/bin/env python3
"""
Test and audit script for Plugin Dropdowns & Individual Dedicated Pages in ARK Router V2.
Verifies Sidebar Accordion Dropdown, Top Header Dropdown, In-Page Dropdown Selectors,
and captures screenshots of all individual pages in desktop and mobile.
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

        print("Navigating to http://localhost:8088/ ...")
        page.goto("http://localhost:8088/", wait_until="networkidle")
        time.sleep(1)

        # Test Sidebar Accordion Dropdown
        print("Testing Sidebar Accordion Dropdown...")
        page.click("#nav_plugins_dropdown .nav-dropdown-toggle")
        time.sleep(0.3)
        assert page.locator("#nav_plugins_dropdown").evaluate("el => el.classList.contains('open')"), "Sidebar dropdown should be open!"
        subnav_count = page.locator("#plugins_subnav .subnav-item").count()
        assert subnav_count == 13, f"Expected 13 subnav items, got {subnav_count}"
        print(f"✓ Sidebar dropdown verified with {subnav_count} items.")

        page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_dropdown_sidebar_open.png"))
        print("✓ Captured v2_dropdown_sidebar_open.png")

        # Test Top Header Dropdown
        print("Testing Top Header Dropdown...")
        page.click(".header-dropdown-wrap button")
        time.sleep(0.3)
        assert page.is_visible("#header_plugins_drop"), "Header dropdown should be visible!"
        header_items = page.locator("#header_plugins_drop a").count()
        assert header_items == 13, f"Expected 13 header drop items, got {header_items}"
        print(f"✓ Top header dropdown verified with {header_items} items.")

        page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_dropdown_header_open.png"))
        print("✓ Captured v2_dropdown_header_open.png")

        # Navigate to Individual Plugin Pages from Dropdown
        plugins_to_test = [
            ("plugin_upnp", "UPnP IGD & NAT-PMP", "v2_page_plugin_upnp_desktop.png"),
            ("plugin_mwan3", "Multi-WAN & Failover", "v2_page_plugin_mwan3_desktop.png"),
            ("plugin_zerotier", "ZeroTier SD-WAN", "v2_page_plugin_zerotier_desktop.png"),
            ("plugin_speedify", "Speedify Bonding", "v2_page_plugin_speedify_desktop.png"),
            ("plugin_sqm", "SQM CAKE", "v2_page_plugin_sqm_desktop.png"),
            ("plugin_adblock", "AdBlock Fast", "v2_page_plugin_adblock_desktop.png"),
            ("plugin_wireguard", "WireGuard VPN", "v2_page_plugin_wireguard_desktop.png"),
            ("plugin_nlbwmon", "nlbwmon", "v2_page_plugin_nlbwmon_desktop.png"),
            ("plugin_usteer", "usteer", "v2_page_plugin_usteer_desktop.png"),
            ("plugin_zram", "ZRAM LZ4", "v2_page_plugin_zram_desktop.png"),
            ("plugin_irqbalance", "irqbalance", "v2_page_plugin_irqbalance_desktop.png"),
            ("plugin_htop", "htop", "v2_page_plugin_htop_desktop.png"),
            ("plugins", "Central de Plugins", "v2_page_plugins_catalog_desktop.png")
        ]

        for view_id, name, filename in plugins_to_test:
            print(f"Navigating to individual page: {name} (view_{view_id})...")
            page.evaluate(f"switchView('{view_id}')")
            time.sleep(0.4)
            assert page.is_visible(f"#view_{view_id}"), f"Page view_{view_id} should be visible!"
            
            # Check drop selector on page matches
            if view_id != 'plugins':
                selected_val = page.locator(f"#view_{view_id} .plugin-drop-select").input_value()
                assert selected_val == view_id, f"In-page drop selector should be '{view_id}', got '{selected_val}'"

            # Capture screenshot
            page.screenshot(path=os.path.join(OUTPUT_DIR, filename))
            print(f"✓ Captured {filename}")

        # Test Switching Plugin directly via in-page Dropdown Selector
        print("Testing In-Page Dropdown Selector switching...")
        page.evaluate("switchView('plugin_upnp')")
        time.sleep(0.3)
        page.select_option("#view_plugin_upnp .plugin-drop-select", "plugin_zerotier")
        time.sleep(0.3)
        assert page.is_visible("#view_plugin_zerotier"), "Should have switched to ZeroTier via in-page drop!"
        print("✓ In-page drop selector successfully switched pages directly.")

        page.close()

        # -------------------------------------------------------------
        # 2. Mobile Tests (390x844 - iPhone 14/15/16)
        # -------------------------------------------------------------
        print("\nTesting Mobile Responsiveness on 390x844 viewport...")
        m_page = browser.new_page(viewport={"width": 390, "height": 844})
        m_page.goto("http://localhost:8088/", wait_until="networkidle")
        time.sleep(1)

        # Open sidebar on mobile
        m_page.click(".btn-hamburger")
        time.sleep(0.3)
        m_page.click("#nav_plugins_dropdown .nav-dropdown-toggle")
        time.sleep(0.3)
        m_page.screenshot(path=os.path.join(OUTPUT_DIR, "v2_dropdown_sidebar_mobile_390.png"))
        print("✓ Captured v2_dropdown_sidebar_mobile_390.png")

        # Open individual pages on mobile and test overflow
        mobile_pages = [
            ("plugin_upnp", "v2_page_plugin_upnp_mobile_390.png"),
            ("plugin_mwan3", "v2_page_plugin_mwan3_mobile_390.png"),
            ("plugin_speedify", "v2_page_plugin_speedify_mobile_390.png"),
            ("plugins", "v2_page_plugins_catalog_mobile_390.png")
        ]

        for view_id, filename in mobile_pages:
            m_page.evaluate(f"switchView('{view_id}')")
            time.sleep(0.4)
            scroll_width = m_page.evaluate("document.documentElement.scrollWidth")
            inner_width = m_page.evaluate("window.innerWidth")
            assert scroll_width <= inner_width, f"Horizontal overflow on {view_id}: {scroll_width} > {inner_width}"
            m_page.screenshot(path=os.path.join(OUTPUT_DIR, filename))
            print(f"✓ Zero overflow and captured {filename}")

        m_page.close()
        browser.close()

        print("\nAll dropdown and individual page tests completed successfully!")
        if console_errors:
            print(f"⚠️ Console errors: {console_errors}")
        else:
            print("🎉 ZERO console errors detected across all dropdown and individual page navigations!")

if __name__ == "__main__":
    run_audit()
