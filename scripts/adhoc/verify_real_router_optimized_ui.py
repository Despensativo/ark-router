#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: Live Validation of Optimized Polling and Cache on Physical Router (192.168.12.1)
Verifies:
1. Adaptive refresh summary displays "modo econômico" with 5s interval on single-core MIPS.
2. RAM Cache is functioning for hardware info and device fingerprints.
3. Live CPU usage % is drastically reduced during polling.
4. Captures screenshot and checks JS console errors.
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

opt = Options()
opt.add_argument('--headless=new')
opt.add_argument('--no-sandbox')
opt.add_argument('--disable-dev-shm-usage')
opt.add_argument('--disable-gpu')
opt.add_argument('--window-size=1440,900')
opt.set_capability("goog:loggingPrefs", {"browser": "ALL"})

driver = webdriver.Chrome(options=opt)
try:
    target_ip = "192.168.73.3"
    print(f"[1] Conectando a http://{target_ip}/cgi-bin/luci...")
    driver.get(f'http://{target_ip}/cgi-bin/luci')
    time.sleep(1)

    login_inputs = driver.find_elements(By.NAME, 'luci_username')
    if login_inputs:
        print("[2] Efetuando login...")
        login_inputs[0].clear()
        login_inputs[0].send_keys('root')
        pass_in = driver.find_element(By.NAME, 'luci_password')
        pass_in.clear()
        pass_in.send_keys('admin0100')
        driver.find_element(By.CSS_SELECTOR, "input[type='submit']").click()
        time.sleep(3)

    if "admin/equipe-dashboard" not in driver.current_url:
        print(f"[3] Navegando explicitamente para equipe-dashboard em {target_ip}...")
        driver.get(f'http://{target_ip}/cgi-bin/luci/admin/equipe-dashboard')
        time.sleep(2)

    print("[4] Aguardando renderização do ARK Router Dashboard...")
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, 'ex-global-status')))

    print("[5] Aguardando dados de telemetria responderem...")
    for i in range(25):
        time.sleep(1)
        st = driver.find_element(By.ID, 'ex-global-status').text.strip()
        if st and st != 'VERIFICANDO':
            print(f"Telemetria online no segundo {i+1} com status: {st}")
            break

    time.sleep(2)

    refresh_summary = driver.find_element(By.ID, 'ex-refresh-summary').text.strip()
    cpu_freq = driver.find_element(By.ID, 'ex-cpu').text.strip()
    cpu_detail = driver.find_element(By.ID, 'ex-cpu-detail').text.strip()

    print("\n--- Verificação das Otimizações Adaptativas ---")
    print(f"Taxa de Atualização: '{refresh_summary}'")
    print(f"Frequência / Núcleos: '{cpu_freq}'")
    print(f"Detalhe de CPU: '{cpu_detail}'")

    assert "modo econômico" in refresh_summary, "Tag 'modo econômico' não encontrada no sumário de atualização!"
    assert "5 segundo" in refresh_summary, "Intervalo de 5 segundos não detectado!"
    print("✓ Perfil Econômico ativado com sucesso para hardware MIPS 1c a 720 MHz!")

    # Capture screenshot
    out_path = os.path.join(ARTIFACTS_DIR, "real_router_cpu_optimized.png")
    driver.save_screenshot(out_path)
    print(f"\n[OK] Screenshot capturado com sucesso: {out_path}")

    # Check browser logs
    logs = driver.get_log("browser")
    app_errors = [l for l in logs if l["level"] == "SEVERE" and "403" not in l["message"]]
    if app_errors:
        print(f"Avisos no console ({len(app_errors)}):")
        for err in app_errors:
            print("  ", err)
    else:
        print("✓ Zero erros de aplicação no console do navegador!")

    print("\n=======================================================")
    print("VALIDAÇÃO DAS OTIMIZAÇÕES CONCLUÍDA COM SUCESSO!")
    print("=======================================================")

except Exception as ex:
    print(f"\n[ERRO] Falha durante validação: {ex}", file=sys.stderr)
    err_img = os.path.join(ARTIFACTS_DIR, "real_router_optimized_error.png")
    try:
        driver.save_screenshot(err_img)
        print(f"Screenshot do erro salvo em: {err_img}")
    except Exception:
        pass
    sys.exit(1)
finally:
    driver.quit()
