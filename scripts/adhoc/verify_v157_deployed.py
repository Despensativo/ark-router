import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1440,1080')
opts.add_argument('--ignore-certificate-errors')

driver = webdriver.Chrome(options=opts)
try:
    print('Conectando a 192.168.73.1...')
    driver.get('http://192.168.73.1/cgi-bin/luci/')
    time.sleep(1.5)
    
    # Login
    user_inputs = driver.find_elements(By.NAME, "luci_username")
    if user_inputs:
        print('Efetuando login como root...')
        user_inputs[0].clear()
        user_inputs[0].send_keys("root")
        pass_input = driver.find_element(By.NAME, "luci_password")
        pass_input.clear()
        pass_input.send_keys("admin0100")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
        submit_btn.click()
        time.sleep(3)
        
    print('Navegando para o overview do ARK Router...')
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/equipe-dashboard/overview')
    time.sleep(4)
    
    logs = driver.get_log('browser')
    errs = [l for l in logs if l['level'] == 'SEVERE']
    print(f'Erros SEVERE no console: {len(errs)}')
    for e in errs:
        print('  Console err:', e['message'])
        
    shot_path = r'C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907\real_router_73_1_v157_installed.png'
    driver.save_screenshot(shot_path)
    print(f'Screenshot salvo com sucesso em: {shot_path}')
finally:
    driver.quit()
