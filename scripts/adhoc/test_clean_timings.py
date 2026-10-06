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
    print(f"[1] Acessando tela de login de {target_ip}...")
    driver.get(f"http://{target_ip}/cgi-bin/luci")
    time.sleep(1)

    login_inputs = driver.find_elements(By.NAME, "luci_username")
    if login_inputs:
        login_inputs[0].clear()
        login_inputs[0].send_keys("root")
        pass_in = driver.find_element(By.NAME, "luci_password")
        pass_in.clear()
        pass_in.send_keys("admin0100")
        
        print("[2] Clicando em Entrar (Login direto -> Dashboard)...")
        t0 = time.time()
        driver.find_element(By.CSS_SELECTOR, "input[type='submit']").click()

    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "ex-global-status")))
    t_login_to_dashboard = time.time() - t0
    print(f"  -> Tempo total (Login -> Autenticação -> Carregando visualização -> Tela Pronta): {t_login_to_dashboard:.2f} s")

    time.sleep(2)

    print("\n[3] Testando 2º acesso (Recarregamento F5 com Cache ativo)...")
    t0 = time.time()
    driver.refresh()
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "ex-global-status")))
    t_f5 = time.time() - t0
    print(f"  -> Tempo do 2º acesso (F5 com Cache do Navegador e sessionStorage): {t_f5:.2f} s")

    time.sleep(2)

    print("\n[4] Testando 3º acesso (Navegação interna no menu)...")
    t0 = time.time()
    driver.execute_script("location.href = '/cgi-bin/luci/admin/equipe-dashboard';")
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "ex-global-status")))
    t_nav = time.time() - t0
    print(f"  -> Tempo do 3º acesso (Navegação SPA): {t_nav:.2f} s")

    print("\n=======================================================")
    print(f"1º Acesso (Login + Cold Load): {t_login_to_dashboard:.2f} s")
    print(f"2º Acesso (F5 com Cache):       {t_f5:.2f} s")
    print(f"3º Acesso (Navegação no Menu):  {t_nav:.2f} s")
    print("=======================================================")

finally:
    driver.quit()
