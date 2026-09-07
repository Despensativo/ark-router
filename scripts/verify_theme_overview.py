import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

from selenium.webdriver.common.keys import Keys

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--ignore-certificate-errors')
opts.binary_location = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
d = webdriver.Chrome(options=opts)
d.set_window_size(1400, 1100)
d.get('https://192.168.73.1/cgi-bin/luci/admin/status/overview')
time.sleep(2)
pw = d.find_elements(By.NAME, 'luci_password')
if pw:
    pw[0].send_keys('admin0100')
    pw[0].send_keys(Keys.ENTER)
    time.sleep(4)

if '/admin/status/overview' not in d.current_url and '/admin/status' not in d.current_url:
    d.get('https://192.168.73.1/cgi-bin/luci/admin/status/overview')
    time.sleep(4)

print('URL:', d.current_url)
time.sleep(4)
out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', 'screenshots', 'luci_overview_dynamic.png')
d.save_screenshot(out_path)
print('Screenshot saved to', out_path)
d.quit()
