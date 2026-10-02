import time
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

driver = webdriver.Chrome(options=opts)
try:
    print('Conectando a 192.168.73.3...')
    driver.get('http://192.168.73.3/cgi-bin/luci/')
    time.sleep(1)
    
    user_inputs = driver.find_elements(By.NAME, "luci_username")
    if user_inputs:
        print('Efetuando login no 192.168.73.3...')
        user_inputs[0].clear()
        user_inputs[0].send_keys("root")
        pass_input = driver.find_element(By.NAME, "luci_password")
        pass_input.clear()
        pass_input.send_keys("admin0100")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
        submit_btn.click()
        
    print('Aguardando montagem do dashboard v1.5.7 no DGL-5500...')
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "ex-clock")))
    time.sleep(3)
    
    shot_path = r'C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907\real_router_73_3_v157_ready.png'
    driver.save_screenshot(shot_path)
    print(f'Screenshot salvo com sucesso em: {shot_path}')
finally:
    driver.quit()
