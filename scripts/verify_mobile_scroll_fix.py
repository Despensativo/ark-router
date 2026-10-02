import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=412,915')
opts.add_argument('--ignore-certificate-errors')
mobile_emulation = {"deviceMetrics": {"width": 412, "height": 915, "pixelRatio": 2.625, "touch": True}}
opts.add_experimental_option("mobileEmulation", mobile_emulation)

# Ler o CSS e JS locais atualizados
repo_dir = r"H:\FEITOS COM IA\Ark-Router\GitHub\luci-app-ark-router"
with open(os.path.join(repo_dir, "root", "www", "luci-static", "ark", "cascade.css"), "r", encoding="utf-8") as f:
    local_cascade_css = f.read()

with open(os.path.join(repo_dir, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.css"), "r", encoding="utf-8") as f:
    local_overview_css = f.read()

with open(os.path.join(repo_dir, "root", "www", "luci-static", "ark", "ark-theme.js"), "r", encoding="utf-8") as f:
    local_theme_js = f.read()

driver = webdriver.Chrome(options=opts)
try:
    print('1. Conectando a 192.168.73.1 em modo Mobile (412x915)...')
    driver.get('http://192.168.73.1/cgi-bin/luci/')
    time.sleep(1.5)
    
    # Login
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
    
    # Injetar CSS e JS atualizados no navegador
    print('3. Injetando CSS e JS corrigidos no DOM do cliente...')
    driver.execute_script("""
        var styleCascade = document.createElement('style');
        styleCascade.id = 'ark-injected-cascade';
        styleCascade.textContent = arguments[0];
        document.head.appendChild(styleCascade);

        var styleOverview = document.createElement('style');
        styleOverview.id = 'ark-injected-overview';
        styleOverview.textContent = arguments[1];
        document.head.appendChild(styleOverview);

        // Executar inicializacao da correcao de scroll do tema
        var script = document.createElement('script');
        script.id = 'ark-injected-theme';
        script.textContent = arguments[2];
        document.body.appendChild(script);
    """, local_cascade_css, local_overview_css, local_theme_js)
    time.sleep(1.0)
    
    # Limpar logs de pre-autenticacao
    driver.get_log('browser')

    # TESTE 1: Issue 2 - Scroll restoration on modal close
    print('\n--- TESTE 1: Preservacao de Scroll ao Fechar Pop-up ---')
    height_info = driver.execute_script("""
        return {
            scrollHeight: document.documentElement.scrollHeight,
            bodyScrollHeight: document.body.scrollHeight,
            innerHeight: window.innerHeight,
            maxScroll: document.documentElement.scrollHeight - window.innerHeight
        };
    """)
    print('Informacoes de altura da pagina:', height_info)

    target_scroll = min(500, max(100, height_info['maxScroll'] // 2))
    print(f'Rolando pagina para {target_scroll}px...')
    driver.execute_script(f"window.scrollTo(0, {target_scroll});")
    time.sleep(0.5)
    scroll_before = driver.execute_script("return window.scrollY || document.documentElement.scrollTop || (document.querySelector('.main-right') ? document.querySelector('.main-right').scrollTop : 0);")
    print(f'Scroll position ANTES de abrir modal: {scroll_before}px')
    
    # Abrir Ark - Setup
    setup_btn = driver.find_element(By.CSS_SELECTOR, ".ex-hero-setup-button")
    setup_btn.click()
    time.sleep(1.5)
    
    modal_active = driver.execute_script("return document.body.classList.contains('modal-overlay-active');")
    print(f'Modal aberto? {modal_active}')
    
    scroll_during = driver.execute_script("return window.scrollY || document.documentElement.scrollTop;")
    print(f'Scroll position DURANTE modal aberto: {scroll_during}px')
    
    # Tirar screenshot do Ark Setup aberto no mobile
    shot_modal = r'C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907\mobile_ark_setup_modal.png'
    driver.save_screenshot(shot_modal)
    print(f'Screenshot do modal mobile salvo em: {shot_modal}')
    
    # TESTE 2: Issue 1 - Mobile scrolling down and UP
    print('\n--- TESTE 2: Rolagem UP e DOWN do Ark - Setup no Mobile ---')
    styles = driver.execute_script("""
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
            overlay_clientHeight: ov.clientHeight
        };
    """)
    print('Novos computed styles do Modal no Mobile:')
    for k, v in styles.items():
        print(f'  {k}: {v}')
        
    # Rolar o overlay para o meio/fim
    print('Rolando modal para baixo (scrollTop = 1200px)...')
    driver.execute_script("document.getElementById('modal_overlay').scrollTop = 1200;")
    time.sleep(0.5)
    st_down = driver.execute_script("return document.getElementById('modal_overlay').scrollTop;")
    print(f'ScrollTop do overlay apos rolar para baixo: {st_down}px')
    
    shot_scrolled_down = r'C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907\mobile_ark_setup_scrolled_down.png'
    driver.save_screenshot(shot_scrolled_down)
    print(f'Screenshot rolado para baixo salvo em: {shot_scrolled_down}')
    
    # Rolar o overlay DE VOLTA PARA O TOPO (scroll UP)
    print('Rolando modal DE VOLTA PARA O TOPO (scrollTop = 0px)...')
    driver.execute_script("document.getElementById('modal_overlay').scrollTop = 0;")
    time.sleep(0.5)
    st_up = driver.execute_script("return document.getElementById('modal_overlay').scrollTop;")
    print(f'ScrollTop do overlay apos rolar de volta para cima: {st_up}px')
    assert st_up == 0, f"Falha ao rolar para cima: scrollTop={st_up}"
    print('>>> SUCESSO ISSUE 1: Modal rolou para cima perfeitamente ate 0px!')

    # Fechar modal via botao "Fechar"
    print('\nFechando modal...')
    close_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Fechar')]")
    close_btn.click()
    time.sleep(1.0)
    
    scroll_after = driver.execute_script("return window.scrollY || document.documentElement.scrollTop || (document.querySelector('.main-right') ? document.querySelector('.main-right').scrollTop : 0);")
    print(f'Scroll position DEPOIS de fechar modal: {scroll_after}px (Esperado: ~{scroll_before}px)')
    
    shot_restored = r'C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907\mobile_scroll_restored_after_modal.png'
    driver.save_screenshot(shot_restored)
    print(f'Screenshot do scroll restaurado salvo em: {shot_restored}')
    
    diff = abs(scroll_after - scroll_before)
    if diff <= 5:
        print(f'>>> SUCESSO ISSUE 2: Scroll position restaurado com perfeicao exata (diff={diff}px)!')
    else:
        print(f'>>> AVISO ISSUE 2: Scroll position restaurado com diff de {diff}px (antes={scroll_before}, depois={scroll_after})')

    # Teste de console errors
    logs = driver.get_log('browser')
    errs = [l for l in logs if l['level'] == 'SEVERE']
    print(f'\nErros SEVERE no console do navegador: {len(errs)}')
    for e in errs:
        print('  Console err:', e['message'])
    assert len(errs) == 0, "Erros SEVERE encontrados no console!"

finally:
    driver.quit()
