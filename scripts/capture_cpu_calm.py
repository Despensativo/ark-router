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
opt.add_argument('--window-size=1440,900')
driver = webdriver.Chrome(options=opt)
try:
    print("1. Acessando login...")
    driver.get('http://192.168.12.1/cgi-bin/luci')
    time.sleep(2)
    
    login_inputs = driver.find_elements(By.NAME, 'luci_username')
    if login_inputs:
        print("2. Efetuando login...")
        login_inputs[0].clear()
        login_inputs[0].send_keys('root')
        pass_in = driver.find_element(By.NAME, 'luci_password')
        pass_in.clear()
        pass_in.send_keys('admin0100')
        driver.find_element(By.CSS_SELECTOR, "input[type='submit']").click()
        time.sleep(3)
        
    if "admin/equipe-dashboard" not in driver.current_url:
        print("3. Navegando para equipe-dashboard...")
        driver.get('http://192.168.12.1/cgi-bin/luci/admin/equipe-dashboard')
        time.sleep(3)

    print("4. Aguardando ex-global-status...")
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, 'ex-global-status')))
    
    print("5. Aguardando ciclo de telemetria responder...")
    for i in range(25):
        time.sleep(1)
        st = driver.find_element(By.ID, 'ex-global-status').text.strip()
        if st and st != 'VERIFICANDO':
            print(f"Status atualizou para: {st} no segundo {i+1}")
            break
            
    time.sleep(1)
    cpu_freq = driver.find_element(By.ID, 'ex-cpu').text
    cpu_detail = driver.find_element(By.ID, 'ex-cpu-detail').text
    print(f"Resultado no Painel: CPU={cpu_freq} | Detalhe={cpu_detail}")
    
    out_path = r'C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907\real_router_cpu_calm.png'
    driver.save_screenshot(out_path)
    print(f"Screenshot salvo em: {out_path}")
finally:
    driver.quit()
