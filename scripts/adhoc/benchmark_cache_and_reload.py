#!/usr/bin/env python3
import os
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

opt = Options()
opt.add_argument('--headless=new')
opt.add_argument('--no-sandbox')
opt.add_argument('--disable-dev-shm-usage')
opt.add_argument('--disable-gpu')
opt.add_argument('--window-size=1440,900')

driver = webdriver.Chrome(options=opt)
try:
    target_ip = "192.168.73.3"
    print(f"Conectando ao roteador {target_ip}...")
    driver.get(f"http://{target_ip}/cgi-bin/luci")
    time.sleep(1)

    login_inputs = driver.find_elements(By.NAME, "luci_username")
    if login_inputs:
        login_inputs[0].clear()
        login_inputs[0].send_keys("root")
        pass_in = driver.find_element(By.NAME, "luci_password")
        pass_in.clear()
        pass_in.send_keys("admin0100")
        driver.find_element(By.CSS_SELECTOR, "input[type='submit']").click()
        time.sleep(2)

    # 1. COLD LOAD (Primeiro acesso sem cache)
    print("\n--- TESTE 1: PRIMEIRO ACESSO (Cold - Sem Cache) ---")
    t0 = time.time()
    driver.get(f"http://{target_ip}/cgi-bin/luci/admin/equipe-dashboard")
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "ex-global-status")))
    t_dom = time.time() - t0
    
    # Aguarda telemetria responder
    for i in range(25):
        time.sleep(0.2)
        st = driver.find_element(By.ID, "ex-global-status").text.strip()
        if st and st != "VERIFICANDO":
            break
    t_full = time.time() - t0
    print(f"  -> Tempo até 'Carregando a visualização' sumir (DOM montado): {t_dom:.2f} s")
    print(f"  -> Tempo total até Telemetria online: {t_full:.2f} s (Status: {st})")

    time.sleep(3)

    # 2. WARM LOAD (Segundo acesso com Cache do Navegador ativo na mesma sessão)
    print("\n--- TESTE 2: SEGUNDO ACESSO (Warm - Com Cache do Navegador / F5) ---")
    t0 = time.time()
    driver.refresh()
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "ex-global-status")))
    t_dom_warm = time.time() - t0
    
    for i in range(25):
        time.sleep(0.2)
        st_warm = driver.find_element(By.ID, "ex-global-status").text.strip()
        if st_warm and st_warm != "VERIFICANDO":
            break
    t_full_warm = time.time() - t0
    print(f"  -> Tempo até 'Carregando a visualização' sumir (DOM com cache): {t_dom_warm:.2f} s")
    print(f"  -> Tempo total até Telemetria online: {t_full_warm:.2f} s (Status: {st_warm})")

    # 3. NAVEGAÇÃO INTERNA ENTRE ABAS / RE-CLIQUE NO MENU (0ms de recarga de página)
    print("\n--- TESTE 3: NAVEGAÇÃO INTERNA ENTRE MENUS / ABAS ---")
    t0 = time.time()
    driver.get(f"http://{target_ip}/cgi-bin/luci/admin/equipe-dashboard")
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "ex-global-status")))
    t_dom_spa = time.time() - t0
    print(f"  -> Tempo de re-abertura via navegação: {t_dom_spa:.2f} s")

    # Ganho de velocidade
    ganho_pct = ((t_dom - t_dom_warm) / t_dom) * 100 if t_dom > 0 else 0
    print(f"\n=======================================================")
    print(f"RESULTADO: O 2º acesso com cache foi {ganho_pct:.1f}% mais rápido que o 1º!")
    print(f"Tempo de saída do 'Carregando': {t_dom:.2f}s (1º) -> {t_dom_warm:.2f}s (2º)")
    print(f"=======================================================")
finally:
    driver.quit()
