import time
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
    time.sleep(2)
    user_inputs = driver.find_elements(By.NAME, 'luci_username')
    if user_inputs:
        user_inputs[0].clear()
        user_inputs[0].send_keys('root')
        pass_input = driver.find_element(By.NAME, 'luci_password')
        pass_input.clear()
        pass_input.send_keys('admin0100')
        btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit'], .cbi-button-apply")
        btn.click()
        time.sleep(4)
        
    print("Cookies after login:", driver.get_cookies())
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/status/overview')
    time.sleep(3)
    
    js = """
        return {
            url: window.location.href,
            bodyClass: document.body.className,
            hasPw: !!document.querySelector('input[name="luci_password"]'),
            pwInput: document.querySelector('input[name="luci_password"]') ? document.querySelector('input[name="luci_password"]').outerHTML : null,
            hasSidebar: !!document.getElementById('ark-sidebar'),
            cookies: document.cookie
        };
    """
    res = driver.execute_script(js)
    import pprint
    pprint.pprint(res)
finally:
    driver.quit()
