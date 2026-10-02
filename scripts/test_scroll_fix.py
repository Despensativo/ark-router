import time
import pprint
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1280,1000')
opts.add_argument('--ignore-certificate-errors')
driver = webdriver.Chrome(options=opts)

try:
    driver.get('http://192.168.73.1/cgi-bin/luci/')
    time.sleep(1)
    user_inputs = driver.find_elements(By.NAME, 'luci_username')
    if user_inputs:
        user_inputs[0].clear()
        user_inputs[0].send_keys('root')
        pass_input = driver.find_element(By.NAME, 'luci_password')
        pass_input.clear()
        pass_input.send_keys('admin0100')
        btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit'], .cbi-button-apply")
        btn.click()
        time.sleep(3)
        
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/status/overview')
    time.sleep(2)
    
    res = driver.execute_script("""
        var el = document.getElementById('maincontent');
        el.style.setProperty('max-width', 'calc(100% - 230px)', 'important');
        el.style.setProperty('width', 'calc(100% - 230px)', 'important');
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.overflowX = 'hidden';
        
        var docW = document.documentElement.clientWidth;
        var scrollW = document.documentElement.scrollWidth;
        var r = el.getBoundingClientRect();
        return {
            docW: docW,
            scrollW: scrollW,
            hasHScroll: scrollW > docW,
            mainRight: r.right
        };
    """)
    pprint.pprint(res)
finally:
    driver.quit()
