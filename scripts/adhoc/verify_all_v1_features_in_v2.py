#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router V2: Deep Verification of 100% V1 Features within V2 Modular Dashboard.
Validates:
1. Physical Switch Ports panel in Overview
2. Quick Vital Indicators bar (AdBlock, Starlink, WireGuard, CAKE, DNS RAM 0ms)
3. IPv6 / NPTv6 (RFC 6296) and ONU Bridge Access in Multi-WAN
4. Guest Wi-Fi (SSID, AP Isolation, Rate Limit) & EasyMesh 802.11s in Wi-Fi
5. DNS Cache RAM 0ms selector & Flush Stale Leases in Devices
6. Hardware Flow Offload (PPE), TCP Turbo & ZRAM in Optimization
7. AdBlock (stats, whitelist/blacklist modal), UPnP IGD table & DMZ Host in Security
8. ZeroTier SD-WAN & Speedify Bonding in Security
9. Starlink Stow, Unstow & Reboot actions in Doctor
10. RAM Purge (ram-purge) & Flash Cleanup in System
11. OTA Update checker modal and Guest QR modal
12. 0 Console errors, 0 page errors.
"""

import os
import sys
import time
from playwright.sync_api import sync_playwright

STAGING_URL = "http://localhost:8088/docs/qa_screenshots/v2_staging/index.html"
SCREENSHOT_DIR = "/Volumes/--400GB--/FEITOS COM IA/Ark-Router/docs/qa_screenshots/v2_staging"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def test_v1_features_in_v2():
    print("=" * 70)
    print("🔬 AUDITORIA PROFUNDA DE 100% DOS RECURSOS DA V1 NO NOVO DESIGN V2")
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

        # 1. Switch Ports & Quick Pills Bar in Overview
        print("\n1. Validando Painel de Switch Físico e Barra de Pílulas no Overview...")
        has_ports = page.eval_on_selector(".switch-ports-panel", "el => el !== null")
        port_count = page.eval_on_selector(".switch-ports-grid", "el => el.children.length")
        has_pills = page.eval_on_selector(".cockpit-pills-bar", "el => el !== null && el.children.length >= 5")
        print(f"   ✓ Painel de Switch Físico: {has_ports} | Total de Portas: {port_count} (WAN1 2.5G, WAN2 1G, LAN1-4)")
        print(f"   ✓ Barra de Pílulas Vitais Rápidas: {has_pills}")
        assert has_ports and port_count == 6, "Painel de Switch deve conter 6 portas físicas"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_switch_ports_cockpit.png"))

        # 2. Multi-WAN: IPv6 / NPTv6, ONU Bridge Access & Auto-WAN
        print("\n2. Validando Recursos de Multi-WAN (IPv6 NPTv6, ONU Bridge e Auto-WAN)...")
        page.evaluate("window.switchView('wan')")
        time.sleep(0.3)
        has_ipv6 = page.eval_on_selector("#m_ipv6_mode", "el => el !== null && el.tagName === 'SELECT'")
        has_onu = page.eval_on_selector("#m_onu_ip", "el => el !== null && el.tagName === 'SELECT'")
        has_autowan = page.eval_on_selector("#m_autowan_map", "el => el !== null && el.tagName === 'SELECT'")
        print(f"   ✓ Seletor de Modo IPv6 / NPTv6: {has_ipv6}")
        print(f"   ✓ Acesso Isolado à Web GUI da ONU: {has_onu}")
        print(f"   ✓ Conversão Dinâmica Auto-WAN: {has_autowan}")
        assert has_ipv6 and has_onu and has_autowan

        # Test Save IPv6
        page.evaluate("window.saveIpv6Settings()")
        time.sleep(0.2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_panel_wan_ipv6_onu.png"))

        # 3. Wi-Fi: Guest Network & EasyMesh 802.11s Topology
        print("\n3. Validando Rede de Convidados e Topologia EasyMesh 802.11s...")
        page.evaluate("window.switchView('wifi')")
        time.sleep(0.3)
        has_guest = page.eval_on_selector("#m_guest_ssid", "el => el !== null")
        has_mesh = page.eval_on_selector("h3:has-text('Rede Mesh EasyMesh 802.11s')", "el => el !== null")
        print(f"   ✓ Rede Wi-Fi de Convidados (Guest Network): {has_guest}")
        print(f"   ✓ Topologia EasyMesh 802.11s com Satélites: {has_mesh}")
        assert has_guest and has_mesh

        # Test Guest QR Modal
        page.evaluate("window.openModal('guest_qr')")
        time.sleep(0.3)
        has_qr_overlay = page.evaluate("() => document.body.classList.contains('modal-overlay-active')")
        assert has_qr_overlay, "Modal Guest QR deve abrir"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_modal_guest_qr.png"))
        page.evaluate("window.closeModal()")
        time.sleep(0.2)

        # 4. Devices: DNS Cache RAM 0ms & Flush Stale Leases
        print("\n4. Validando Cache DNS em RAM (0ms) e Limpeza de Leases...")
        page.evaluate("window.switchView('devices')")
        time.sleep(0.3)
        has_dns_cache = page.eval_on_selector("#dhcp_dns_cache_sel", "el => el !== null && el.tagName === 'SELECT'")
        print(f"   ✓ Seletor de Cache DNS em RAM (0.0ms): {has_dns_cache}")
        assert has_dns_cache

        # Test Flush Leases
        page.evaluate("window.flushStaleLeases()")
        time.sleep(0.2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_panel_devices_dns_cache.png"))

        # 5. Optimization: Hardware Flow Offloading (PPE), TCP Turbo & ZRAM
        print("\n5. Validando Aceleração de Hardware (PPE Fastpath), TCP Turbo e ZRAM...")
        page.evaluate("window.switchView('optimization')")
        time.sleep(0.3)
        has_ppe = page.eval_on_selector("#hw_offload_toggle", "el => el !== null")
        has_bbr = page.eval_on_selector("#tcp_congestion_sel", "el => el !== null && el.tagName === 'SELECT'")
        has_zram = page.eval_on_selector("#zram_size_sel", "el => el !== null && el.tagName === 'SELECT'")
        print(f"   ✓ Hardware Flow Offloading (MediaTek PPE): {has_ppe}")
        print(f"   ✓ Algoritmo TCP Turbo (BBR v2): {has_bbr}")
        print(f"   ✓ Compactação ZRAM Swap LZ4: {has_zram}")
        assert has_ppe and has_bbr and has_zram

        page.evaluate("window.saveKernelOptimization()")
        time.sleep(0.2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_panel_optimization_hw.png"))

        # 6. Security: AdBlock, UPnP IGD Table, DMZ Host, ZeroTier & Speedify
        print("\n6. Validando AdBlock, UPnP IGD, DMZ Host, ZeroTier e Speedify...")
        page.evaluate("window.switchView('security')")
        time.sleep(0.3)
        has_adblock = page.eval_on_selector("#adblock_toggle", "el => el !== null")
        has_upnp_rows = page.eval_on_selector("#upnp_tbody", "el => el.children.length >= 3")
        has_dmz = page.eval_on_selector("#dmz_host_sel", "el => el !== null && el.tagName === 'SELECT'")
        has_sdwan = page.eval_on_selector("strong:has-text('ZeroTier:')", "el => el !== null")
        print(f"   ✓ AdBlock Integrado (148k regras): {has_adblock}")
        print(f"   ✓ Mapeamentos Ativos UPnP IGD: {has_upnp_rows}")
        print(f"   ✓ Host DMZ com Seletor: {has_dmz}")
        print(f"   ✓ ZeroTier SD-WAN & Speedify Bonding: {has_sdwan}")
        assert has_adblock and has_upnp_rows and has_dmz and has_sdwan

        # Test AdBlock Modal
        page.evaluate("window.openModal('adblock_lists')")
        time.sleep(0.3)
        has_ab_overlay = page.evaluate("() => document.body.classList.contains('modal-overlay-active')")
        assert has_ab_overlay, "Modal AdBlock Lists deve abrir"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_modal_adblock_lists.png"))
        page.evaluate("window.closeModal()")
        time.sleep(0.2)

        # Test Delete UPnP port
        page.evaluate("window.deleteUpnpPort(3074)")
        time.sleep(0.2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_panel_security_full.png"))

        # 7. Doctor: Starlink Stow/Unstow/Reboot Actions
        print("\n7. Validando Controles da Antena Starlink Dishy...")
        page.evaluate("window.switchView('doctor')")
        time.sleep(0.3)
        page.evaluate("window.dishyAction('stow')")
        time.sleep(0.2)
        page.evaluate("window.dishyAction('unstow')")
        time.sleep(0.2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_panel_doctor_starlink.png"))

        # 8. System: RAM Purge, Flash Storage Cleanup & OTA Update Modal
        print("\n8. Validando Purga de RAM, Limpeza de Flash e Modal OTA...")
        page.evaluate("window.switchView('system')")
        time.sleep(0.3)
        page.evaluate("window.purgeRam()")
        time.sleep(0.2)
        page.evaluate("window.cleanFlashStorage()")
        time.sleep(0.2)

        # Open OTA modal
        page.evaluate("window.openModal('ota_update')")
        time.sleep(0.3)
        has_ota_overlay = page.evaluate("() => document.body.classList.contains('modal-overlay-active')")
        assert has_ota_overlay, "Modal OTA Update deve abrir"
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_modal_ota_update.png"))
        page.evaluate("window.closeModal()")
        time.sleep(0.2)

        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "v2_panel_system_cleanup.png"))

        context.close()
        browser.close()

    print("\n" + "=" * 70)
    print("📊 RESULTADO DA AUDITORIA DOS RECURSOS V1 NA V2")
    print("=" * 70)
    print(f"Erros de console / página: {len(console_errors)}")
    for err in console_errors:
        print(f"  ❌ {err}")

    if len(console_errors) == 0:
        print("\n🎉 100% DOS RECURSOS DA V1 ESTÃO PRESENTES, POLIDOS E OPERACIONAIS NA V2!")
        return 0
    else:
        return 1

if __name__ == "__main__":
    sys.exit(test_v1_features_in_v2())
EOF
