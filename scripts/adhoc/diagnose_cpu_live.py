import os
import sys
import time

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
import subprocess

opt = Options()
opt.add_argument('--headless=new')
opt.add_argument('--window-size=1440,900')
driver = webdriver.Chrome(options=opt)
try:
    print("1. Abrindo LuCI e logando...")
    driver.get('http://192.168.12.1/cgi-bin/luci')
    time.sleep(1)
    login_inputs = driver.find_elements(By.NAME, 'luci_username')
    if login_inputs:
        login_inputs[0].clear()
        login_inputs[0].send_keys('root')
        pass_in = driver.find_element(By.NAME, 'luci_password')
        pass_in.clear()
        pass_in.send_keys('admin0100')
        driver.find_element(By.CSS_SELECTOR, "input[type='submit']").click()
        time.sleep(3)
        
    driver.get('http://192.168.12.1/cgi-bin/luci/admin/equipe-dashboard')
    print("2. Dashboard aberto. Aguardando 5 segundos para ciclos de polling...")
    time.sleep(5)
    
    print("3. Executando 'top' no roteador via plink enquanto o painel está aberto...")
    cmd = [
        "plink", "-batch",
        "-hostkey", "SHA256:6vCtAQ/hnLjmz0RrDSFWQ/tlLNnrJ0HIyQ5CNIvG1Dw",
        "-pw", "admin0100",
        "root@192.168.12.1",
        "top -n 1 -b | head -n 30"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    print("--- RESULTADO DO TOP ---")
    print(res.stdout)
    
    time.sleep(3)
    res2 = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    print("--- RESULTADO DO TOP (AMOSTRA 2) ---")
    print(res2.stdout)
finally:
    driver.quit()
