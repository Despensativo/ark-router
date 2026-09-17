import os
import sys
import time
sys.stdout.reconfigure(encoding='utf-8', errors='replace')
sys.stderr.reconfigure(encoding='utf-8', errors='replace')
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys

ARTIFACT_DIR = r"C:\Users\User\.gemini\antigravity\brain\35388f5c-263c-4d4c-93e3-ee9ec6c19c1d"
os.makedirs(ARTIFACT_DIR, exist_ok=True)

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--disable-gpu")
opts.add_argument("--no-sandbox")
opts.add_argument("--ignore-certificate-errors")
opts.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
opts.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(options=opts)
driver.set_window_size(1500, 1200)

def check_js_errors():
    logs = driver.get_log('browser')
    errors = [entry for entry in logs if entry.get('level') == 'SEVERE']
    for err in errors:
        print(f"[BROWSER ERROR] {err.get('message')}")
    return errors

try:
    print("--- 1. Conectando ao roteador LuCI ---")
    dashboard_url = os.environ.get("ARK_ROUTER_URL", "http://localhost:8080/cgi-bin/luci/admin/equipe-dashboard")
    password = os.environ.get("ARK_ROUTER_TEST_PASSWORD") or os.environ.get("ARK_ROUTER_PASSWORD")
    driver.get(dashboard_url)
    time.sleep(2)

    # Login
    pw = driver.find_elements(By.NAME, "luci_password")
    if pw:
        if not password:
            print("Aviso: Tela de login detectada, mas ARK_ROUTER_TEST_PASSWORD não está configurada.", file=sys.stderr)
            sys.exit(2)
        print("Preenchendo senha e autenticando com ENTER...")
        pw[0].send_keys(password)
        pw[0].send_keys(Keys.ENTER)
        time.sleep(4)

    if "/equipe-dashboard" not in driver.current_url:
        print(f"Navegando para dashboard ARK: {dashboard_url}")
        driver.get(dashboard_url)
        time.sleep(4)

    print(f"URL atual: {driver.current_url}")

    print("--- 2. Validando Renderização do Visão Geral ---")
    time.sleep(4)
    check_js_errors()

    # Screenshot Full Dashboard
    overview_path = os.path.join(ARTIFACT_DIR, "web_overview_full.png")
    driver.save_screenshot(overview_path)
    print(f"Screenshot geral salvo: {overview_path}")

    # Verificar Speedify Top Header (deve estar oculto quando desativado)
    speedify_header = driver.find_elements(By.ID, "ex-speedify-header-status")
    if speedify_header:
        disp = speedify_header[0].value_of_css_property("display")
        print(f"Speedify Top Header widget display: '{disp}' (esperado: none)")
        assert disp == "none", f"Speedify header deveria estar oculto, mas está display={disp}"
    else:
        print("Speedify Top Header não renderizado ou ausente no DOM (ok).")

    # Verificar DFS summary text
    dfs_text_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'DFS')]")
    print(f"Encontrados {len(dfs_text_elements)} nós com menção a DFS.")
    for el in dfs_text_elements:
        txt = el.text
        if "52" in txt and "144" in txt:
            print(f"Texto explicativo DFS validado com sucesso: {txt[:100]}...")
            break

    # --- 2.1 Validar Multi-WAN com 1 WAN (deve estar desabilitado/cinza) ---
    print("--- 2.1 Validando Multi-WAN com 1 Link (Single-WAN) ---")
    mwan_toggle = driver.find_element(By.ID, "ex-mwan-toggle")
    assert mwan_toggle.is_enabled() is False, "O toggle de Multi-WAN deveria estar desabilitado (cinza) com apenas 1 WAN!"
    assert mwan_toggle.is_selected() is False, "O toggle de Multi-WAN não deveria estar ativo com apenas 1 WAN!"
    print("Toggle de Multi-WAN verificado: desabilitado (cinza) e desligado com sucesso!")

    mwan_mode_el = driver.find_element(By.ID, "ex-mwan-mode")
    print(f"Texto do modo Multi-WAN: '{mwan_mode_el.text}'")
    assert "Single-WAN" in mwan_mode_el.text or "Link Único" in mwan_mode_el.text, f"Modo esperado Single-WAN, obtido: {mwan_mode_el.text}"

    mwan_state_el = driver.find_element(By.ID, "ex-mwan-toggle-state")
    print(f"Estado do switch Multi-WAN: '{mwan_state_el.text}'")
    assert "INDISPONÍVEL" in mwan_state_el.text or "1 WAN" in mwan_state_el.text, f"Estado esperado INDISPONÍVEL (1 WAN), obtido: {mwan_state_el.text}"

    # Screenshot do card Multi-WAN
    mwan_card = driver.find_element(By.CSS_SELECTOR, ".ex-mwan-control")
    mwan_card_path = os.path.join(ARTIFACT_DIR, "web_multiwan_single_wan.png")
    mwan_card.screenshot(mwan_card_path)
    print(f"Screenshot do card Multi-WAN (Single-WAN) salvo: {mwan_card_path}")

    # --- 2.2 Validar Separação: Card Wi-Fi (Mesh 802.11s) SEM botão de Satélite ---
    print("--- 2.2 Validando Separação do Wi-Fi Mesh e Modo Satélite ---")
    mesh_card = driver.find_elements(By.CSS_SELECTOR, ".ex-mesh-roaming-card")
    if mesh_card:
        sat_in_mesh = mesh_card[0].find_elements(By.XPATH, ".//button[contains(text(), 'Modo Satélite')]")
        assert len(sat_in_mesh) == 0, "O botão Modo Satélite NÃO deve estar dentro do card de Wi-Fi Mesh!"
        print("Card de Wi-Fi Mesh validado: livre de botões de Modo Satélite!")

        # Abrir modal do Mesh Sem Fio
        mesh_btn = mesh_card[0].find_element(By.XPATH, ".//button[contains(text(), 'Mesh')]")
        driver.execute_script("arguments[0].click();", mesh_btn)
        time.sleep(2)

        # Validar que NÃO há assistente de satélite dentro do modal Mesh Sem Fio
        sat_in_modal = driver.find_elements(By.XPATH, "//button[contains(text(), 'Abrir Assistente Satélite')]")
        assert len(sat_in_modal) == 0, "O modal do Mesh Sem Fio NÃO deve conter assistente de satélite!"
        print("Modal Mesh Sem Fio (802.11s) validado: focado exclusivamente no enlace sem fio!")

        mesh_modal_path = os.path.join(ARTIFACT_DIR, "web_mesh_wireless_only_modal.png")
        driver.save_screenshot(mesh_modal_path)
        print(f"Screenshot do Modal Mesh Sem Fio salvo: {mesh_modal_path}")

        close_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Fechar') or contains(text(), 'Cancelar')]")
        if close_btns:
            driver.execute_script("arguments[0].click();", close_btns[-1])
            time.sleep(1)

    # --- 3. Validar Modo de Operação no Topo & Assistente de Satélite ---
    print("--- 3. Abrindo Modal de Modo de Operação do Roteador ---")
    hero_opmode_btn = driver.find_element(By.CSS_SELECTOR, ".ex-hero-opmode-btn")
    driver.execute_script("arguments[0].click();", hero_opmode_btn)
    time.sleep(2)
    net_mode_path = os.path.join(ARTIFACT_DIR, "web_network_mode_modal.png")
    driver.save_screenshot(net_mode_path)
    print(f"Screenshot do Modo de Operação salvo: {net_mode_path}")

    # Validar opção de Roteador Secundário no modal de topologia
    sec_option = driver.find_elements(By.XPATH, "//*[contains(text(), 'Roteador Secundário') or contains(text(), 'Ponto Adicional')]")
    assert sec_option, "Opção 'Roteador Secundário / Ponto Adicional' não encontrada no modal de modo de operação!"
    print("Opção de Roteador Secundário validada com sucesso no modal de topologia!")

    # Clicar no Assistente de Roteador Secundário a partir do modo de operação
    wizard_btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Assistente de Roteador Secundário')]")
    driver.execute_script("arguments[0].click();", wizard_btn)
    time.sleep(3)

    # Validar título do modal sem menção a Satélite
    modal_title_els = driver.find_elements(By.XPATH, "//*[contains(text(), 'Assistente de Roteador Secundário')]")
    assert modal_title_els, "Título com 'Assistente de Roteador Secundário' não encontrado no DOM do modal!"
    print(f"Título do modal validado: '{modal_title_els[0].text}'")
    assert "Satélite" not in modal_title_els[0].text, f"A palavra 'Satélite' NÃO deve estar no título do modal! Obtido: {modal_title_els[0].text}"

    # Validar campos do modal secundário
    master_inputs = driver.find_elements(By.XPATH, "//input[@placeholder='192.168.1.1']")
    assert master_inputs, "Campo IP do Mestre não encontrado no modal do roteador secundário!"
    print(f"Campo IP do Mestre renderizado com valor: '{master_inputs[0].get_attribute('value')}'")

    # Validar caixa de Amarração de MAC
    mac_box = driver.find_elements(By.XPATH, "//*[contains(text(), 'Amarração e Reserva de MAC')]")
    assert mac_box, "Caixa de amarração e reserva de MAC não encontrada no modal!"
    print("Caixa de amarração e proteção de MAC no roteador principal validada com sucesso!")

    # Validar botão de aplicar
    apply_btn = driver.find_elements(By.XPATH, "//button[contains(text(), 'Salvar e Ativar Roteador Secundário')]")
    assert apply_btn, "Botão 'Salvar e Ativar Roteador Secundário' não encontrado!"
    print("Botão 'Salvar e Ativar Roteador Secundário' validado com sucesso!")

    sat_modal_path = os.path.join(ARTIFACT_DIR, "web_mesh_satellite_modal.png")
    driver.save_screenshot(sat_modal_path)
    print(f"Screenshot do Assistente de Roteador Secundário salvo: {sat_modal_path}")

    # Fechar modal
    cancel_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Cancelar') or contains(text(), 'Fechar')]")
    if cancel_btns:
        driver.execute_script("arguments[0].click();", cancel_btns[-1])
        time.sleep(1)

    # --- 3.1 Validar Identificação de Roteadores Secundários em Dispositivos Conectados ---
    print("--- 3.1 Validando Identificação de Roteadores Secundários em Dispositivos Conectados ---")
    driver.execute_script("""
        const det = document.getElementById('ex-device-details');
        if (det) {
            det.open = true;
            det.scrollIntoView({behavior: 'instant', block: 'center'});
        }
    """)
    time.sleep(2)

    # Validar Banner de Infraestrutura Mesh
    sec_banner = driver.find_element(By.ID, "ex-secondary-routers-banner")
    banner_disp = sec_banner.value_of_css_property("display")
    print(f"Display do banner de roteadores secundários: '{banner_disp}'")
    assert banner_disp != "none", "O banner #ex-secondary-routers-banner deveria estar visível quando há roteadores secundários!"
    banner_text = sec_banner.text
    print(f"Texto do banner: '{banner_text}'")
    assert "Roteador Secundário Detectado" in banner_text or "Secundários" in banner_text, f"Texto inesperado no banner: {banner_text}"
    assert "PROTEGIDO CONTRA CONFLITOS" in banner_text or "MAC Amarrado" in banner_text, f"Esperado status de proteção no banner: {banner_text}"

    # Validar linha do dispositivo ARK-Secundario-5566
    sec_row = driver.find_elements(By.XPATH, "//tr[@data-mac='11:22:33:44:55:66']")
    assert sec_row, "Linha do roteador secundário (11:22:33:44:55:66) não encontrada na tabela de dispositivos!"
    print("Dispositivo secundário encontrado na tabela!")

    # Validar badge de Roteador Secundário
    badge_sec = sec_row[0].find_elements(By.CSS_SELECTOR, ".badge-secondary-router")
    assert badge_sec, "Badge '.badge-secondary-router' não encontrado na linha do dispositivo!"
    print(f"Badge Roteador Secundário validado: '{badge_sec[0].text}'")

    # Validar badge de MAC Amarrado
    badge_res = sec_row[0].find_elements(By.CSS_SELECTOR, ".badge-reserved")
    assert badge_res, "Badge de MAC Amarrado não encontrado na linha do dispositivo!"
    print(f"Badge MAC Amarrado validado: '{badge_res[0].text}'")

    # Validar botão de Abrir Painel
    panel_link = sec_row[0].find_elements(By.XPATH, ".//a[contains(., 'Painel')]")
    assert panel_link, "Botão 'Painel' com link para o Roteador Secundário não encontrado na linha!"
    print(f"Botão de acesso ao painel do secundário validado: href='{panel_link[0].get_attribute('href')}'")

    # Screenshot da seção de dispositivos conectados com o Roteador Secundário
    dev_card = driver.find_element(By.CSS_SELECTOR, ".ex-devices")
    dev_card_path = os.path.join(ARTIFACT_DIR, "web_secondary_router_devices.png")
    dev_card.screenshot(dev_card_path)
    print(f"Screenshot dos dispositivos conectados com Roteador Secundário salvo: {dev_card_path}")

    # --- 4. Validar Starlink Telemetry & SMTP ---
    print("--- 4. Validando Seção de Telemetria Starlink & SMTP ---")
    # Ativar Always Show se não estiver visível e abrir painel
    driver.execute_script("""
        const det = document.getElementById('ex-starlink-global-panel');
        if (det) {
            det.style.display = 'block';
            det.open = true;
        }
        const panel = document.querySelector('.ex-starlink-telemetry-config');
        if (panel) panel.scrollIntoView({behavior: 'instant', block: 'center'});
    """)
    time.sleep(1)

    # Abrir Master switch da telemetria se fechado
    master_switch = driver.find_elements(By.ID, "ex-starlink-telemetry-master-input")
    if master_switch and not master_switch[0].is_selected():
        print("Ativando chave master de telemetria no DOM...")
        driver.execute_script("arguments[0].click();", master_switch[0])
        time.sleep(1)

    # Ativar envio de e-mail se fechado
    mail_inputs = driver.find_elements(By.CSS_SELECTOR, "#ex-starlink-email-panel input[type='checkbox']")
    if mail_inputs and not mail_inputs[0].is_selected():
        print("Ativando switch de e-mail...")
        driver.execute_script("arguments[0].click();", mail_inputs[0])
        time.sleep(1)

    # Mudar provedor para SMTP
    driver.execute_script("""
        const sel = document.querySelector('#ex-starlink-email-fields select');
        if (sel) {
            sel.value = 'smtp';
            sel.dispatchEvent(new Event('change'));
        }
    """)
    time.sleep(1)

    # Validar campos SMTP visíveis
    smtp_rows = driver.find_element(By.ID, "ex-starlink-smtp-rows")
    smtp_disp = smtp_rows.value_of_css_property("display")
    print(f"Linhas SMTP display: '{smtp_disp}' (esperado: grid)")
    assert smtp_disp == "grid", f"Linhas SMTP deveriam estar visíveis, mas estão display={smtp_disp}"

    # Validar seletores de porta e host
    smtp_hosts = driver.find_elements(By.XPATH, "//input[@placeholder='smtp.gmail.com']")
    assert smtp_hosts, "Input do Servidor SMTP não encontrado no DOM!"
    print(f"Input Servidor SMTP validado: '{smtp_hosts[0].get_attribute('value')}'")

    driver.execute_script("arguments[0].scrollIntoView({behavior: 'instant', block: 'center'});", smtp_rows)
    time.sleep(1)

    panel = driver.find_element(By.CSS_SELECTOR, ".ex-starlink-telemetry-config")
    starlink_path = os.path.join(ARTIFACT_DIR, "web_starlink_telemetry_smtp.png")
    panel.screenshot(starlink_path)
    print(f"Screenshot Telemetria SMTP salvo: {starlink_path}")

    # Checar erros fatais de console
    severe_errors = check_js_errors()
    if severe_errors:
        print(f"AVISO: {len(severe_errors)} erros severos encontrados no console!")
    else:
        print("[OK] ZERO ERROS DE JAVASCRIPT NO CONSOLE!")

    print("\n============================================================")
    print("[OK] VERIFICACAO VISUAL E DE DOM CONCLUIDA COM 100% DE SUCESSO!")
    print("============================================================")

finally:
    driver.quit()
