import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=412,915')
opts.add_argument('--ignore-certificate-errors')
# Emulate mobile touch device
mobile_emulation = {"deviceMetrics": {"width": 412, "height": 915, "pixelRatio": 2.625, "touch": True}}
opts.add_experimental_option("mobileEmulation", mobile_emulation)

driver = webdriver.Chrome(options=opts)
try:
    print('1. Conectando ao roteador 192.168.73.1 com viewport Mobile (412x915)...')
    driver.get('http://192.168.73.1/cgi-bin/luci/')
    time.sleep(1.5)
    
    # Login se necessario
    user_inputs = driver.find_elements(By.NAME, "luci_username")
    if user_inputs:
        print('Efetuando login...')
        user_inputs[0].clear()
        user_inputs[0].send_keys("root")
        pass_input = driver.find_element(By.NAME, "luci_password")
        pass_input.clear()
        pass_input.send_keys("admin0100")
        submit_btn = driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']")
        submit_btn.click()
        time.sleep(3)
        
    print('2. Navegando para o overview do ARK Router...')
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/equipe-dashboard/overview')
    time.sleep(4)
    
    # ISSUE 2: Scroll down, open modal, close modal, check scroll position
    print('\n--- TESTE ISSUE 2: Preservacao de Scroll ao Fechar Pop-up ---')
    driver.execute_script("window.scrollTo(0, 850);")
    time.sleep(0.5)
    scroll_before = driver.execute_script("return window.scrollY || document.documentElement.scrollTop || (document.querySelector('.main-right') ? document.querySelector('.main-right').scrollTop : 0);")
    print(f'Scroll position ANTES de abrir modal: {scroll_before}px')
    
    # Encontrar botao "Ark - Setup" ou "Recursos"
    setup_btn = driver.find_element(By.CSS_SELECTOR, ".ex-hero-setup-button")
    setup_btn.click()
    time.sleep(1.5)
    
    modal_active = driver.execute_script("return document.body.classList.contains('modal-overlay-active');")
    print(f'Modal aberto? {modal_active}')
    
    scroll_during = driver.execute_script("return window.scrollY || document.documentElement.scrollTop;")
    print(f'Scroll position DURANTE modal aberto: {scroll_during}px')
    
    # Fechar modal via botao "Fechar"
    close_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Fechar')]")
    close_btn.click()
    time.sleep(1.0)
    
    scroll_after = driver.execute_script("return window.scrollY || document.documentElement.scrollTop || (document.querySelector('.main-right') ? document.querySelector('.main-right').scrollTop : 0);")
    print(f'Scroll position DEPOIS de fechar modal: {scroll_after}px')
    if scroll_after == 0 and scroll_before > 0:
        print('>>> CONFIRMADO BUG ISSUE 2: O usuario foi jogado para o topo (0px)!')
    else:
        print(f'>>> Scroll preservado em: {scroll_after}px')

    # ISSUE 1: Ark Setup Mobile Scrolling
    print('\n--- TESTE ISSUE 1: Rolagem do Ark - Setup no Mobile ---')
    setup_btn = driver.find_element(By.CSS_SELECTOR, ".ex-hero-setup-button")
    setup_btn.click()
    time.sleep(1.5)
    
    overlay_styles = driver.execute_script("""
        var ov = document.getElementById('modal_overlay');
        var m = document.querySelector('.modal');
        var ez = document.querySelector('.ex-ez-setup');
        var cs_ov = window.getComputedStyle(ov);
        var cs_m = window.getComputedStyle(m);
        var cs_ez = window.getComputedStyle(ez);
        return {
            overlay_overflow_y: cs_ov.overflowY,
            overlay_overscroll: cs_ov.overscrollBehavior,
            modal_overflow_x: cs_m.overflowX,
            modal_overflow_y: cs_m.overflowY,
            modal_overscroll: cs_m.overscrollBehavior,
            ez_overflow: cs_ez.overflow,
            overlay_scrollHeight: ov.scrollHeight,
            overlay_clientHeight: ov.clientHeight,
            modal_scrollHeight: m.scrollHeight,
            modal_clientHeight: m.clientHeight
        };
    """)
    print('Computed styles do Modal no Mobile:')
    for k, v in overlay_styles.items():
        print(f'  {k}: {v}')
        
finally:
    driver.quit()
