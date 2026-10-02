import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1440,1080')
opts.add_argument('--ignore-certificate-errors')
opts.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(options=opts)
try:
    driver.get('http://192.168.73.3/cgi-bin/luci/')
    time.sleep(2)
    user_inputs = driver.find_elements(By.NAME, 'luci_username')
    if user_inputs:
        user_inputs[0].clear()
        user_inputs[0].send_keys('root')
        p = driver.find_element(By.NAME, 'luci_password')
        p.clear()
        p.send_keys('admin0100')
        driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']").click()
        time.sleep(3)
    driver.get('http://192.168.73.3/cgi-bin/luci/admin/equipe-dashboard/overview')
    time.sleep(6)
    logs = driver.get_log('browser')
    print('Console logs on 73.3:')
    for l in logs:
        print(' ', l['level'], l['message'])
    out_path = r'C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907\debug_73_3_screen.png'
    driver.save_screenshot(out_path)
    print('Screenshot saved to:', out_path)
    print('Current URL:', driver.current_url)
    print('Page title:', driver.title)
finally:
    driver.quit()
