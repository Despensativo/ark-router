import time
import os
import sys
import json

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.add_argument('--headless=new')
opts.add_argument('--no-sandbox')
opts.add_argument('--disable-gpu')
opts.add_argument('--window-size=1280,1000')
opts.add_argument('--ignore-certificate-errors')
# Enable browser logging
opts.set_capability('goog:loggingPrefs', {'browser': 'ALL'})

driver = webdriver.Chrome(options=opts)

script_dir = os.path.dirname(os.path.abspath(__file__))
repo_dir = os.path.abspath(os.path.join(script_dir, ".."))
out_dir = r"C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907"

with open(os.path.join(repo_dir, "root", "www", "luci-static", "ark", "cascade.css"), "r", encoding="utf-8") as f:
    local_cascade_css = f.read()

with open(os.path.join(repo_dir, "root", "www", "luci-static", "ark", "ark-theme.js"), "r", encoding="utf-8") as f:
    local_theme_js = f.read()

pages_to_test = [
    ("Status Overview", "admin/status/overview"),
    ("Network Interfaces", "admin/network/network"),
    ("Network Wireless", "admin/network/wireless"),
    ("Network Firewall", "admin/network/firewall"),
    ("Network Diagnostics", "admin/network/diagnostics"),
    ("System System", "admin/system/system"),
    ("System Administration", "admin/system/admin"),
    ("System Flash", "admin/system/flash"),
    ("System Reboot", "admin/system/reboot"),
    ("Status Realtime", "admin/status/realtime"),
    ("Status Processes", "admin/status/processes"),
]

def inject_latest_assets(drv):
    drv.execute_script("""
        var oldS = document.getElementById('ark-local-cascade');
        if (oldS) oldS.remove();
        var s = document.createElement('style');
        s.id = 'ark-local-cascade';
        s.textContent = arguments[0];
        document.head.appendChild(s);
        
        try {
            eval(arguments[1]);
            if (window.ArkTheme && window.ArkTheme.init) {
                window.ArkTheme.init();
            }
        } catch(e) {
            console.error('ArkTheme reinit error:', e);
        }
    """, local_cascade_css, local_theme_js)

try:
    print("=== Conectando e autenticando no roteador 192.168.73.1 ===")
    driver.get('http://192.168.73.1/cgi-bin/luci/')
    time.sleep(2)
    user_inputs = driver.find_elements(By.NAME, "luci_username")
    if user_inputs:
        user_inputs[0].clear()
        user_inputs[0].send_keys("root")
        pass_input = driver.find_element(By.NAME, "luci_password")
        pass_input.clear()
        pass_input.send_keys("admin0100")
        driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit'], .cbi-button-apply").click()
        time.sleep(4)
        
    print("Autenticação realizada com sucesso!")
    
    results = []
    
    for name, path in pages_to_test:
        url = f"http://192.168.73.1/cgi-bin/luci/{path}"
        print(f"\n--- Testando página: {name} ({url}) ---")
        driver.get(url)
        time.sleep(2.5)
        
        # Clear existing logs
        driver.get_log('browser')
        
        # Inject our current assets
        inject_latest_assets(driver)
        time.sleep(1.5)
        
        # Capture browser logs after injection and execution
        logs = driver.get_log('browser')
        errors = [l for l in logs if l['level'] in ['SEVERE', 'ERROR']]
        warnings = [l for l in logs if l['level'] == 'WARNING']
        
        # Gather page stats
        stats = driver.execute_script("""
            var docW = document.documentElement.clientWidth;
            var docScrollW = document.documentElement.scrollWidth;
            var bodyScrollW = document.body.scrollWidth;
            return {
                title: document.title,
                url: window.location.href,
                hasHScroll: (docScrollW > docW + 1) || (bodyScrollW > docW + 1),
                docW: docW,
                scrollW: Math.max(docScrollW, bodyScrollW),
                cbiSections: document.querySelectorAll('.cbi-section').length,
                cbiTables: document.querySelectorAll('.cbi-section-table, table.table').length,
                cbiButtons: document.querySelectorAll('.cbi-button, .btn').length,
                dropdownsPresent: document.querySelectorAll('.cbi-dropdown').length,
                hasModeSwitch: !!document.getElementById('ark-mode-switch'),
                currentMode: localStorage.getItem('ark_interface_mode') || 'basic'
            };
        """)
        
        # Save screenshot
        safe_name = name.lower().replace(" ", "_")
        ss_path = os.path.join(out_dir, f"standard_luci_{safe_name}.png")
        driver.save_screenshot(ss_path)
        
        print(f"Stats: {stats['cbiSections']} seções, {stats['cbiTables']} tabelas, {stats['cbiButtons']} botões, scroll-H={stats['hasHScroll']} (W:{stats['docW']}/SW:{stats['scrollW']}), modeSwitch={stats['hasModeSwitch']}")
        if errors:
            print(f"❌ {len(errors)} ERRO(S) JS DETECTADOS:")
            for err in errors:
                print(f"   [{err['level']}] {err['message']}")
        else:
            print(f"✅ Zero erros JS!")
            
        results.append({
            "name": name,
            "path": path,
            "stats": stats,
            "errors": errors,
            "warnings_count": len(warnings),
            "screenshot": ss_path
        })
        
    print("\n" + "="*60)
    print("RESUMO DO DIAGNÓSTICO DAS TELAS DO MODO BÁSICO:")
    print("="*60)
    all_clean = True
    for r in results:
        status_icon = "❌ ERRO" if r["errors"] else "✅ OK"
        if r["errors"]:
            all_clean = False
        print(f"{status_icon} | {r['name']:<25} | Erros: {len(r['errors']):<2} | Warnings: {r['warnings_count']:<2}")
        
    print(f"\nResultado Geral: {'TUDO 100% LIMPO' if all_clean else 'FORAM ENCONTRADOS PROBLEMAS'}")

finally:
    driver.quit()
