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
    print("=== Conectando ao 192.168.73.1 ===")
    driver.get('http://192.168.73.1/cgi-bin/luci/')
    time.sleep(1.5)
    user_inputs = driver.find_elements(By.NAME, "luci_username")
    if user_inputs:
        user_inputs[0].clear()
        user_inputs[0].send_keys("root")
        pass_input = driver.find_element(By.NAME, "luci_password")
        pass_input.clear()
        pass_input.send_keys("admin0100")
        driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']").click()
        time.sleep(3)
    
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/equipe-dashboard/overview')
    WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "ex-clock")))
    time.sleep(2)
    shot_73_1 = os.path.join(artifact_dir, "real_73_1_clean_overview.png")
    driver.save_screenshot(shot_73_1)
    print("Salvo:", shot_73_1)
    
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/network/network')
    time.sleep(2)
    shot_73_1_net = os.path.join(artifact_dir, "real_73_1_clean_network.png")
    driver.save_screenshot(shot_73_1_net)
    print("Salvo:", shot_73_1_net)

    print("\n=== Conectando ao 192.168.73.3 ===")
    driver.get('http://192.168.73.3/cgi-bin/luci/')
    time.sleep(1.5)
    user_inputs = driver.find_elements(By.NAME, "luci_username")
    if user_inputs:
        user_inputs[0].clear()
        user_inputs[0].send_keys("root")
        pass_input = driver.find_element(By.NAME, "luci_password")
        pass_input.clear()
        pass_input.send_keys("admin0100")
        driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']").click()
        time.sleep(3)

    driver.get('http://192.168.73.3/cgi-bin/luci/admin/network/wireless')
    time.sleep(2)
    shot_73_3_wifi = os.path.join(artifact_dir, "real_73_3_clean_wireless.png")
    driver.save_screenshot(shot_73_3_wifi)
    print("Salvo:", shot_73_3_wifi)

finally:
    driver.quit()

print("\n[OK] SCREENSHOTS CAPTURADOS COM SUCESSO!")
