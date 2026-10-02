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
        
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/network/network')
    time.sleep(2)
    
    res = driver.execute_script("""
        var addBtn = document.querySelector('.cbi-section-create, .cbi-button-add, input[value*="Adicionar"], button[name*="add"]');
        var allBtns = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]')).map(function(b) {
            return {
                tag: b.tagName,
                text: b.textContent.trim() || b.value,
                visible: b.offsetParent !== null,
                cls: b.className
            };
        });
        return {
            hasAddBtn: !!addBtn,
            addBtnVisible: addBtn ? addBtn.offsetParent !== null : false,
            addBtnHtml: addBtn ? addBtn.outerHTML : null,
            buttons: allBtns.filter(function(b) { return b.visible; })
        };
    """)
    pprint.pprint(res)
finally:
    driver.quit()
