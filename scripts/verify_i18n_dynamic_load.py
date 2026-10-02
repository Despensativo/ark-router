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
    time.sleep(3)

    print("[5] Testando carregamento dinâmico de i18n.en.js...")
    res_en = driver.execute_async_script("""
        var done = arguments[arguments.length - 1];
        loadDashboardLanguage('en').then(function() {
            done({
                enLoaded: !!window.ARK_I18N_EN,
                enKeys: Object.keys(window.ARK_I18N_EN || {}).length,
                sample: (window.ARK_I18N_EN && window.ARK_I18N_EN['Segurança / Criptografia']) || 'missing'
            });
        }).catch(function(e) {
            done({ error: e.message });
        });
    """)
    print("Resultado EN:", res_en)
    assert res_en.get('enLoaded') is True, "ARK_I18N_EN não carregou!"
    assert res_en.get('enKeys') > 1000, f"Poucas chaves carregadas ({res_en.get('enKeys')})"
    print(f"✓ Inglês carregado dinamicamente: {res_en.get('enKeys')} chaves! Amostra: '{res_en.get('sample')}'")

    print("\n[6] Testando carregamento dinâmico de i18n.es.js...")
    res_es = driver.execute_async_script("""
        var done = arguments[arguments.length - 1];
        loadDashboardLanguage('es').then(function() {
            done({
                esLoaded: !!window.ARK_I18N_ES,
                esKeys: Object.keys(window.ARK_I18N_ES || {}).length,
                sample: (window.ARK_I18N_ES && window.ARK_I18N_ES['Segurança / Criptografia']) || 'missing'
            });
        }).catch(function(e) {
            done({ error: e.message });
        });
    """)
    print("Resultado ES:", res_es)
    assert res_es.get('esLoaded') is True, "ARK_I18N_ES não carregou!"
    assert res_es.get('esKeys') > 1000, f"Poucas chaves carregadas ({res_es.get('esKeys')})"
    print(f"✓ Espanhol carregado dinamicamente: {res_es.get('enKeys')} chaves! Amostra: '{res_es.get('sample')}'")

    print("\n=======================================================")
    print("✓ TESTE DE IDIOMAS DINÂMICOS 100% APROVADO NO ROTEADOR!")
    print("=======================================================")
finally:
    driver.quit()
