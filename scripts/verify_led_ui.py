import os
import sys
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

URL = "https://192.168.73.1/cgi-bin/luci/admin/system/leds"
SCREENSHOT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)
SCREENSHOT_PATH = os.path.join(SCREENSHOT_DIR, "led_hardware_intelligent.png")

opts = Options()
opts.add_argument("--headless=new")
opts.add_argument("--disable-gpu")
opts.add_argument("--no-sandbox")
opts.add_argument("--ignore-certificate-errors")
opts.binary_location = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

print("Iniciando Chrome Headless...")
driver = webdriver.Chrome(options=opts)
driver.set_window_size(1400, 1000)

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
        time.sleep(3)

    # Navegar explicitamente para a URL de LEDs caso tenha caído na Home
    if "/admin/system/leds" not in driver.current_url:
        print(f"Redirecionando para {URL}...")
        driver.get(URL)
        time.sleep(3)

    print(f"URL Atual: {driver.current_url}")

    # Aguarda carregar os cards de hardware e RPC
    for attempt in range(10):
        tiles = driver.find_elements(By.CSS_SELECTOR, "#ark-led-tiles .ark-led-card")
        if len(tiles) > 0:
            break
        print(f"Aguardando cards de LED... (tentativa {attempt + 1})")
        time.sleep(1)

    # Captura título do hardware
    header_el = driver.find_elements(By.ID, "ark-led-hardware-title")
    header_text = header_el[0].text if header_el else "Não encontrado"
    print(f"Título Detectado: '{header_text}'")

    # Lista os cards encontrados
    tiles = driver.find_elements(By.CSS_SELECTOR, "#ark-led-tiles .ark-led-card")
    print(f"Total de cards de LEDs físicos renderizados: {len(tiles)}")
    for t in tiles:
        title = t.find_element(By.CLASS_NAME, "ark-led-title").text
        sub = t.find_element(By.CLASS_NAME, "ark-led-sub").text
        print(f"  - Card: {title} | {sub}")

    # Salva screenshot
    driver.save_screenshot(SCREENSHOT_PATH)
    print(f"\n[OK] Screenshot salvo em: {SCREENSHOT_PATH}")

    # Validações
    assert "Acer Predator Connect W6x" in header_text, f"Header inesperado: {header_text}"
    assert len(tiles) == 3, f"Esperado 3 cards para Acer Predator W6x, encontrado {len(tiles)}"
    print("\nTODAS AS VALIDAÇÕES PASSARAM COM SUCESSO!")

finally:
    driver.quit()
