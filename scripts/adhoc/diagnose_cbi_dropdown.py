import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1280,900')
opts.add_argument('--ignore-certificate-errors')

driver = webdriver.Chrome(options=opts)
try:
    print('1. Conectando e fazendo login...')
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
        
    print('2. Navegando para admin/network/network...')
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/network/network')
    time.sleep(4)
    
    # Injetar fix de CSS onde top nao tem !important ou top: auto quando bottom estiver setado
    driver.execute_script("""
        var style = document.createElement('style');
        style.id = 'fix-cbi-dropdown';
        style.textContent = `
            .cbi-dropdown[open] > ul.dropdown {
                top: auto !important;
                bottom: calc(100% + 4px) !important;
                max-height: 280px !important;
                min-width: 100% !important;
                width: max-content !important;
                display: block !important;
            }
            .cbi-dropdown[open][display="down"] > ul.dropdown,
            .cbi-dropdown[open]:not([style*="bottom"]) > ul.dropdown {
                top: calc(100% + 4px) !important;
                bottom: auto !important;
            }
        `;
        document.head.appendChild(style);
    """)
    
    # Encontrar botao "Add new interface..."
    add_btn = driver.find_element(By.XPATH, "//button[contains(., 'Nova Interface') or contains(., 'Interface...')]")
    add_btn.click()
    time.sleep(2)
    
    # Encontrar dropdown dentro do modal
    modal_dd = driver.find_element(By.CSS_SELECTOR, "#modal_overlay .cbi-dropdown, .modal .cbi-dropdown")
    print('Dropdown dentro do modal encontrado:', modal_dd.get_attribute('id'))
    
    # Clicar no dropdown
    modal_dd.click()
    time.sleep(1)
    
    shot_open = r'C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907\diagnose_dropdown_modal_fixed.png'
    driver.save_screenshot(shot_open)
    print(f'Screenshot dropdown com fix salvo em: {shot_open}')
    
    info = driver.execute_script("""
        var el = arguments[0];
        var menu = el.querySelector('ul.dropdown');
        var cs_menu = window.getComputedStyle(menu);
        return {
            menu_computed_height: cs_menu.height,
            menu_rect: menu.getBoundingClientRect()
        };
    """, modal_dd)
    print('Novo Rect do Menu:', info)

finally:
    driver.quit()
