#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Live Validation on Physical Router (192.168.12.1)
Logs into LuCI, validates dashboard LAN status, opens LAN modal,
verifies DHCP toggle and warnings, and captures real screenshots.
"""

import os
import sys
import time
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
chrome_options.add_argument("--window-size=1440,900")

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
    time.sleep(3)

    # Capture overview screenshot
    overview_img = os.path.join(ARTIFACTS_DIR, "real_router_overview.png")
    driver.save_screenshot(overview_img)
    print(f"[OK] Screenshot do Dashboard salvo em: {overview_img}")

    # Scroll to LAN card and click "Editar IP & DHCP"
    print("[5] Abrindo modal de edição 'Editar IP & DHCP'...")
    edit_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Editar IP & DHCP')]")
    driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", edit_btn)
    time.sleep(1)
    edit_btn.click()
    time.sleep(1.5)

    # Capture modal initial screenshot
    modal_img1 = os.path.join(ARTIFACTS_DIR, "real_router_lan_modal_initial.png")
    driver.save_screenshot(modal_img1)
    print(f"[OK] Screenshot do Modal LAN inicial salvo em: {modal_img1}")

    # Inspect modal content
    modal_el = driver.find_element(By.CLASS_NAME, "modal")
    modal_text = modal_el.text
    assert "Distribuição de IPs (Servidor DHCP IPv4)" in modal_text, "Título do toggle DHCP não encontrado no modal!"
    is_initially_on = "LIGADO" in modal_text
    initial_state_str = "LIGADO" if is_initially_on else "DESLIGADO"
    print(f"[OK] Toggle detectado no modal com estado inicial: {initial_state_str}!")

    # Find the switch slider and click it
    print(f"[6] Clicando no switch para alternar de {initial_state_str}...")
    switch_slider = driver.find_element(By.CSS_SELECTOR, ".ex-cleanup-entry .ex-switch .ex-switch-slider")
    switch_slider.click()
    time.sleep(1)

    modal_text2 = driver.find_element(By.CLASS_NAME, "modal").text
    expected_after = "DESLIGADO" if is_initially_on else "LIGADO"
    assert expected_after in modal_text2, f"Estado {expected_after} não encontrado após o clique!"
    print(f"[OK] Toggle alternou com sucesso para: {expected_after}!")

    if expected_after == "DESLIGADO":
        assert "Atenção: Com o servidor DHCP desativado" in modal_text2, "Aviso de DHCP desativado não apareceu!"
        print("[OK] Aviso de segurança sobre IP estático exibido com sucesso!")

    # Capture modal toggled screenshot
    modal_img2 = os.path.join(ARTIFACTS_DIR, "real_router_lan_modal_toggled.png")
    driver.save_screenshot(modal_img2)
    print(f"[OK] Screenshot do Modal LAN após alternar toggle salvo em: {modal_img2}")

    # Close modal via Cancelar
    cancel_btn = driver.find_element(By.XPATH, "//div[contains(@class, 'modal')]//button[contains(text(), 'Cancelar')]")
    cancel_btn.click()
    time.sleep(1)

    # Open Modo de Operação Modal
    print("[7] Abrindo modal de Modo de Operação de Rede...")
    driver.execute_script("window.scrollTo(0, 0);")
    time.sleep(0.5)
    mode_btn = driver.find_element(By.CSS_SELECTOR, ".ex-hero-opmode-btn")
    mode_btn.click()
    time.sleep(1.5)

    mode_modal_img = os.path.join(ARTIFACTS_DIR, "real_router_mode_modal.png")
    driver.save_screenshot(mode_modal_img)
    print(f"[OK] Screenshot do Modal de Modo de Rede salvo em: {mode_modal_img}")

    # Check browser logs for errors
    logs = driver.get_log("browser")
    severe_errors = [l for l in logs if l.get("level") == "SEVERE" and "favicon" not in l.get("message", "")]
    print(f"Logs do navegador: {len(logs)} registros ({len(severe_errors)} erros severos)")
    if severe_errors:
        print(f"Avisos/Erros no console: {severe_errors}")
    assert len(severe_errors) == 0, f"Erros graves detectados no console: {severe_errors}"
    print("[OK] ZERO erros severos no console do navegador!")

    print("\n============================================================")
    print("VALIDAÇÃO VISUAL NO ROTEADOR REAL 192.168.12.1 100% APROVADA!")
    print("============================================================")

finally:
    driver.quit()
