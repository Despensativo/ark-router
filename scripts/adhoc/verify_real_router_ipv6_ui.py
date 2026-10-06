#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Live Validation of IPv6 Modal on Physical Router (192.168.12.1)
Logs into LuCI, navigates to the dashboard, opens the IPv6 Connectivity modal,
verifies that the Cascaded Router / NDP Relay card has the updated title and description,
captures a screenshot, and checks browser console errors.
"""

import os
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

ARTIFACTS_DIR = r"C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907"
os.makedirs(ARTIFACTS_DIR, exist_ok=True)

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1440,1080")

# Enable logging of browser errors
chrome_options.set_capability("goog:loggingPrefs", {"browser": "ALL"})

driver = webdriver.Chrome(options=chrome_options)
try:
    print("[1] Conectando a http://192.168.12.1/cgi-bin/luci...")
    driver.get("http://192.168.12.1/cgi-bin/luci")
    time.sleep(1)

    # Login
    print("[2] Efetuando login como root...")
    user_input = driver.find_element(By.NAME, "luci_username")
    pass_input = driver.find_element(By.NAME, "luci_password")
    user_input.clear()
    user_input.send_keys("root")
    pass_input.clear()
    pass_input.send_keys("admin0100")
    submit_btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit']")
    submit_btn.click()
    time.sleep(3)

    if "admin/equipe-dashboard" not in driver.current_url:
        print("[3] Navegando explicitamente para equipe-dashboard...")
        driver.get("http://192.168.12.1/cgi-bin/luci/admin/equipe-dashboard")
        time.sleep(2)

    # Wait for dashboard to render
    print("[4] Aguardando renderização do ARK Router Dashboard...")
    WebDriverWait(driver, 15).until(
        EC.presence_of_element_located((By.ID, "ex-lan-dhcp"))
    )
    time.sleep(2)

    # Scroll to LAN card and click "Editar IP & DHCP"
    print("[5] Abrindo modal 'Editar IP & DHCP'...")
    edit_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Editar IP & DHCP')]")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_btn)
    time.sleep(1)
    edit_btn.click()
    time.sleep(1.5)

    # Click "Ajustes IPv6 / Relay"
    print("[6] Abrindo 'Central de Conectividade IPv6'...")
    ipv6_btn = WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "button.btn-ipv6"))
    )
    driver.execute_script("arguments[0].click();", ipv6_btn)
    time.sleep(2)

    # Wait for IPv6 modal title
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//h4[contains(text(), 'Central de Conectividade IPv6')]"))
    )
    time.sleep(1)

    # Get modal element
    modal_el = driver.find_element(By.CLASS_NAME, "modal")
    modal_text = modal_el.text

    print("\n--- Verificando textos do Card de Cascata / NDP Relay ---")
    expected_title = "🔗 Roteador em Cascata (Repasse IPv6 / NDP Relay)"
    assert expected_title in modal_text, f"Título esperado não encontrado! Encontrado:\n{modal_text}"
    print(f"✓ Título confirmado: '{expected_title}'")

    badge_found = ("RELAY IPV6 ATIVO" in modal_text) or ("SERVIDOR IPV6 DIRETO" in modal_text)
    assert badge_found, "Badge de status IPv6 não encontrado no card!"
    active_badge = "RELAY IPV6 ATIVO" if "RELAY IPV6 ATIVO" in modal_text else "SERVIDOR IPV6 DIRETO"
    print(f"✓ Badge de status confirmado: '{active_badge}'")

    expected_desc_snippet = "modem da operadora (ou outro roteador) e seus aparelhos não estiverem recebendo IPv6"
    assert expected_desc_snippet in modal_text, "Descrição atualizada com menção ao IPv6 não encontrada!"
    print("✓ Descrição detalhada confirmada com contextualização sobre IPv6 e operadora!")

    # Scroll modal to show cascade card
    cascade_section = driver.find_element(By.XPATH, f"//strong[contains(text(), '{expected_title}')]/ancestor::section")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", cascade_section)
    time.sleep(1)

    # Capture screenshot
    screenshot_path = os.path.join(ARTIFACTS_DIR, "real_router_ipv6_modal.png")
    driver.save_screenshot(screenshot_path)
    print(f"\n[OK] Screenshot capturado com sucesso: {screenshot_path}")

    # Check console errors
    print("\n--- Verificando logs do console JavaScript ---")
    logs = driver.get_log("browser")
    errors = [log for log in logs if log["level"] == "SEVERE"]
    if errors:
        print(f"Avisos/Erros no console ({len(errors)}):")
        for err in errors:
            print("  ", err)
    else:
        print("✓ Zero erros SEVERE encontrados no console do navegador!")

    print("\n=======================================================")
    print("VALIDAÇÃO VISUAL E TEXTUAL NO ROTEADOR REAL CONCLUÍDA COM SUCESSO!")
    print("=======================================================")

except Exception as ex:
    print(f"\n[ERRO] Falha durante validação: {ex}", file=sys.stderr)
    err_img = os.path.join(ARTIFACTS_DIR, "real_router_ipv6_error.png")
    try:
        driver.save_screenshot(err_img)
        print(f"Screenshot do erro salvo em: {err_img}")
    except Exception:
        pass
    sys.exit(1)
finally:
    driver.quit()
