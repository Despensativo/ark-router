import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1440,1080')
opts.add_argument('--ignore-certificate-errors')

artifact_dir = r"C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907"

driver = webdriver.Chrome(options=opts)
try:
    print("=" * 60)
    print("VALIDAÇÃO VISUAL LIVE: 192.168.73.1 (ACER PREDATOR W6X)")
    print("=" * 60)
    driver.get('http://192.168.73.1/cgi-bin/luci/')
    time.sleep(1.5)
    
    user_inputs = driver.find_elements(By.NAME, "luci_username")
    if user_inputs:
        print("Realizando login no 73.1...")
        user_inputs[0].clear()
        user_inputs[0].send_keys("root")
        pass_input = driver.find_element(By.NAME, "luci_password")
        pass_input.clear()
        pass_input.send_keys("admin0100")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
        submit_btn.click()
        time.sleep(3)
    
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/equipe-dashboard/overview')
    print("Aguardando montagem do painel v1.5.8...")
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "ex-clock")))
    time.sleep(3)
    
    logs_73_1 = driver.get_log('browser')
    errs_73_1 = [l for l in logs_73_1 if l['level'] == 'SEVERE']
    print(f"Erros SEVERE no console do 73.1: {len(errs_73_1)}")
    for e in errs_73_1:
        print(f"  [CONSOLE ERR]: {e['message']}")
        
    shot_73_1_overview = os.path.join(artifact_dir, "real_73_1_overview_v158.png")
    driver.save_screenshot(shot_73_1_overview)
    print(f"Screenshot salvo: {shot_73_1_overview}")
    
    # Navegar para página padrão LuCI (ex: interfaces)
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/network/network')
    time.sleep(3)
    shot_73_1_luci = os.path.join(artifact_dir, "real_73_1_standard_luci_network_v158.png")
    driver.save_screenshot(shot_73_1_luci)
    print(f"Screenshot salvo: {shot_73_1_luci}")
    
    print("\n" + "=" * 60)
    print("VALIDAÇÃO VISUAL LIVE: 192.168.73.3 (D-LINK DGL-5500)")
    print("=" * 60)
    driver.get('http://192.168.73.3/cgi-bin/luci/')
    time.sleep(1.5)
    
    user_inputs = driver.find_elements(By.NAME, "luci_username")
    if user_inputs:
        print("Realizando login no 73.3...")
        user_inputs[0].clear()
        user_inputs[0].send_keys("root")
        pass_input = driver.find_element(By.NAME, "luci_password")
        pass_input.clear()
        pass_input.send_keys("admin0100")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
        submit_btn.click()
        time.sleep(3)
    
    driver.get('http://192.168.73.3/cgi-bin/luci/admin/equipe-dashboard/overview')
    print("Aguardando montagem do painel v1.5.8 no DGL-5500...")
    WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "ex-clock")))
    time.sleep(3)
    
    logs_73_3 = driver.get_log('browser')
    errs_73_3 = [l for l in logs_73_3 if l['level'] == 'SEVERE']
    print(f"Erros SEVERE no console do 73.3: {len(errs_73_3)}")
    for e in errs_73_3:
        print(f"  [CONSOLE ERR]: {e['message']}")
        
    shot_73_3_overview = os.path.join(artifact_dir, "real_73_3_overview_v158.png")
    driver.save_screenshot(shot_73_3_overview)
    print(f"Screenshot salvo: {shot_73_3_overview}")

finally:
    driver.quit()

print("\n[OK] VALIDAÇÃO VISUAL CONCLUÍDA EM AMBOS OS ROTEADORES!")
