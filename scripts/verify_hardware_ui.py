import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

URL = "https://192.168.73.1/cgi-bin/luci/admin/equipe-dashboard"
SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--disable-gpu")
opts.add_argument("--no-sandbox")
opts.add_argument("--ignore-certificate-errors")
opts.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

print("Iniciando Chrome Headless...")
driver = webdriver.Chrome(options=opts)
driver.set_window_size(1400, 1100)

try:
    print(f"Navegando para {URL}...")
    driver.get(URL)
    time.sleep(2)

    # Login se necessário
    pw_inputs = driver.find_elements(By.NAME, "luci_password")
    if pw_inputs:
        print("Realizando login...")
        pw_inputs[0].send_keys("admin0100")
        submit_btn = driver.find_elements(By.CSS_SELECTOR, "form button[type='submit'], form input[type='submit'], .cbi-button-apply")
        if submit_btn:
            driver.execute_script("arguments[0].click();", submit_btn[0])
        else:
            driver.find_element(By.TAG_NAME, "form").submit()
        time.sleep(4)

    if "/admin/equipe-dashboard" not in driver.current_url:
        print(f"Redirecionando para {URL}...")
        driver.get(URL)
        time.sleep(4)

    print(f"URL Atual: {driver.current_url}")

    # Aguardar carregamento dos dados de hardware no overview
    for attempt in range(15):
        cpu_val = driver.find_elements(By.ID, "ex-cpu")
        if cpu_val and cpu_val[0].text and cpu_val[0].text != "—" and cpu_val[0].text != "-":
            print(f"Dados carregados na tentativa {attempt + 1}!")
            break
        print(f"Aguardando dados da visão geral... (tentativa {attempt + 1})")
        time.sleep(1)

    # Coleta dos dados exibidos na barra de Saúde
    def get_text(elem_id):
        el = driver.find_elements(By.ID, elem_id)
        return el[0].text if el else "N/A"

    print("\n" + "="*50)
    print("  MÉTRICAS DETECTADAS NA FAIXA DE SAÚDE")
    print("="*50)
    print(f"CPU: {get_text('ex-cpu')} | {get_text('ex-cpu-detail')}")
    print(f"Temperatura: {get_text('ex-temperature')} | {get_text('ex-temperature-detail')}")
    print(f"Memória: {get_text('ex-memory')} | {get_text('ex-memory-detail')}")
    print(f"Armazenamento: {get_text('ex-storage')} | {get_text('ex-storage-detail')}")
    print(f"Carga: {get_text('ex-load')} | {get_text('ex-load-detail')}")
    print(f"Uptime: {get_text('ex-uptime')}")

    # Verificar badges de portas
    badges = driver.find_elements(By.CSS_SELECTOR, ".ex-port-badge")
    print(f"\nBadges de velocidade detectados ({len(badges)}):")
    for b in badges:
        print(f"  -> Badge: '{b.text}' (class: {b.get_attribute('class')})")

    # Screenshot 1: Overview com a faixa de saúde de 5 itens e badges de portas
    ss1_path = os.path.join(SCREENSHOT_DIR, "hardware_specs_health.png")
    driver.save_screenshot(ss1_path)
    print(f"\n[OK] Screenshot da faixa de saúde salvo em: {ss1_path}")

    # Clicar no botão "Especificações"
    specs_btn = driver.find_elements(By.CSS_SELECTOR, ".ex-health-specs-btn")
    if specs_btn:
        print("\nClicando em 'Especificacoes'...")
        driver.execute_script("arguments[0].click();", specs_btn[0])
        time.sleep(2)

        # Screenshot 2: Modal de Especificações Técnicas
        ss2_path = os.path.join(SCREENSHOT_DIR, "hardware_specs_modal.png")
        driver.save_screenshot(ss2_path)
        print(f"[OK] Screenshot do Modal de Especificacoes Tecnicas salvo em: {ss2_path}")

        # Fechar modal
        close_btn = driver.find_elements(By.CSS_SELECTOR, ".modal button, .cbi-button-neutral")
        if close_btn:
            driver.execute_script("arguments[0].click();", close_btn[-1])
            time.sleep(1)

    # Clicar no card de temperatura para abrir o modal de sensores térmicos
    temp_card = driver.find_elements(By.ID, "ex-temperature")
    if temp_card:
        print("\nClicando no card de Temperatura para abrir sensores termicos...")
        parent_card = driver.execute_script("return arguments[0].closest('.ex-health-item');", temp_card[0])
        if parent_card:
            driver.execute_script("arguments[0].click();", parent_card)
            time.sleep(2)

            # Screenshot 3: Modal de Sensores Térmicos
            ss3_path = os.path.join(SCREENSHOT_DIR, "hardware_thermal_modal.png")
            driver.save_screenshot(ss3_path)
            print(f"[OK] Screenshot do Modal Termico salvo em: {ss3_path}")

    print("\nTodos os testes de interface foram concluidos com sucesso!")

except Exception as e:
    print(f"Erro durante execução do teste: {e}", file=sys.stderr)
    driver.save_screenshot(os.path.join(SCREENSHOT_DIR, "hardware_error.png"))
    sys.exit(1)
finally:
    driver.quit()
