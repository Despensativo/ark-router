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
        
    for p in ['admin/status/overview', 'admin/network/network', 'admin/network/wireless', 'admin/network/firewall']:
        driver.get(f'http://192.168.73.1/cgi-bin/luci/{p}')
        time.sleep(2)
        
        res = driver.execute_script("""
            var winW = window.innerWidth;
            var docW = document.documentElement.clientWidth;
            var scrollW = document.documentElement.scrollWidth;
            var bodyScrollW = document.body.scrollWidth;
            var bad = [];
            var all = document.querySelectorAll('*');
            for (var i = 0; i < all.length; i++) {
                var el = all[i];
                var r = el.getBoundingClientRect();
                if (r.right > docW + 1) {
                    bad.push({
                        tag: el.tagName,
                        id: el.id,
                        cls: (typeof el.className === 'string') ? el.className.slice(0, 40) : '',
                        right: Math.round(r.right),
                        docW: docW,
                        diff: Math.round(r.right - docW)
                    });
                }
            }
            return {
                page: window.location.pathname,
                docW: docW,
                scrollW: scrollW,
                bodyScrollW: bodyScrollW,
                hasHScroll: scrollW > docW || bodyScrollW > docW,
                badCount: bad.length,
                badSample: bad.slice(0, 8)
            };
        """)
        print(f"=== {p} ===")
        pprint.pprint(res)
finally:
    driver.quit()
