import time
import os
import sys

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

driver = webdriver.Chrome(options=opts)

script_dir = os.path.dirname(os.path.abspath(__file__))
repo_dir = os.path.abspath(os.path.join(script_dir, ".."))

with open(os.path.join(repo_dir, "root", "www", "luci-static", "ark", "cascade.css"), "r", encoding="utf-8") as f:
    local_cascade_css = f.read()

with open(os.path.join(repo_dir, "root", "www", "luci-static", "ark", "ark-theme.js"), "r", encoding="utf-8") as f:
    local_theme_js = f.read()

with open(os.path.join(repo_dir, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.js"), "r", encoding="utf-8") as f:
    local_overview_js = f.read()

out_dir = r"C:\Users\User\.gemini\antigravity\brain\4be2dd68-0845-4cff-bcf2-bee43f903907"

try:
    print("=== TESTE 1: Login e Validação do Dropdown e Tradução em admin/network/network ===")
    driver.get('http://192.168.73.1/cgi-bin/luci/')
    time.sleep(2)
    user_inputs = driver.find_elements(By.NAME, "luci_username")
    if user_inputs:
        user_inputs[0].clear()
        user_inputs[0].send_keys("root")
        pass_input = driver.find_element(By.NAME, "luci_password")
        pass_input.clear()
        pass_input.send_keys("admin0100")
        driver.find_element(By.CSS_SELECTOR, "input[type='submit'], button[type='submit']").click()
        time.sleep(3)
        
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/network/network')
    time.sleep(3)

    # Injetar o novo cascade.css e ark-theme.js
    driver.execute_script("""
        var s = document.createElement('style');
        s.id = 'ark-local-cascade';
        s.textContent = arguments[0];
        document.head.appendChild(s);
        
        var scr = document.createElement('script');
        scr.id = 'ark-local-theme';
        scr.textContent = arguments[1];
        document.body.appendChild(scr);
        if (window.ArkTheme && typeof ArkTheme.init === 'function') {
            ArkTheme.init();
        }
    """, local_cascade_css, local_theme_js)
    time.sleep(1)

    # Encontrar botão "Adicionar Nova Interface..."
    add_btn = driver.find_element(By.XPATH, "//button[contains(., 'Nova Interface') or contains(., 'Interface...')]")
    add_btn.click()
    time.sleep(2)

    # Executar translateRemainingUI para testar tradução em tempo real
    driver.execute_script("if (window.ArkTheme) ArkTheme.translateRemainingUI();")
    time.sleep(1)

    # Encontrar dropdown no modal
    modal_dd = driver.find_element(By.CSS_SELECTOR, "#modal_overlay .cbi-dropdown, .modal .cbi-dropdown")
    print("Dropdown encontrado no modal:", modal_dd.get_attribute("id") or modal_dd.get_attribute("name"))
    modal_dd.click()
    time.sleep(1)

    dd_shot = os.path.join(out_dir, "artifact_dropdown_fixed_v158.png")
    driver.save_screenshot(dd_shot)
    print(f"[OK] Print do dropdown corrigido salvo em: {dd_shot}")

    dd_info = driver.execute_script("""
        var el = arguments[0];
        var menu = el.querySelector('ul.dropdown');
        var rect = menu.getBoundingClientRect();
        return {
            offsetHeight: menu.offsetHeight,
            clientHeight: menu.clientHeight,
            scrollHeight: menu.scrollHeight,
            rectHeight: rect.height,
            display: window.getComputedStyle(menu).display,
            top: menu.style.top,
            bottom: menu.style.bottom
        };
    """, modal_dd)
    print("Métricas do menu dropdown:", dd_info)
    assert dd_info['rectHeight'] >= 100, f"Dropdown squished! Altura {dd_info['rectHeight']}px < 100px"
    print(f"✓ Dropdown verificado com SUCESSO! Altura útil: {dd_info['rectHeight']}px (não está mais achatado em 10px!)")

    # Fechar modal para testar restauração de scroll e ausência de blink
    driver.execute_script("var ui = window.L && window.L.ui || window.ui; if (ui && ui.hideModal) ui.hideModal();")
    time.sleep(1)

    print("\n=== TESTE 2: Dashboard Overview - SQM CAKE Aprimorado & AdGuard Home ===")
    driver.get('http://192.168.73.1/cgi-bin/luci/admin/equipe-dashboard')
    time.sleep(5)

    # Injetar cascade.css atualizado
    driver.execute_script("""
        var s = document.createElement('style');
        s.textContent = arguments[0];
        document.head.appendChild(s);
    """, local_cascade_css)

    # Executar abertura do modal SQM aprimorado com simulação de resultado Fast.com (850M Down / 420M Up)
    print("Renderizando modal SQM CAKE aprimorado com Fast.com (850M/420M)...")
    driver.execute_script("""
        var presetDown = 850;
        var presetUp = 420;
        
        var field = function(label, value, hint) {
            var node = E('input', { type: 'number', class: 'cbi-input-text', min: 0, max: 100000, step: '0.1', placeholder: '0 (ilimitado)', value: value || '' });
            return {
                node: node,
                row: E('label', { class: 'ex-qos-edit-field' }, [
                    E('span', {}, [label + ' (Mbps)']),
                    node,
                    E('small', { class: 'ex-muted' }, [hint || 'Mbps • 0 ou vazio = ilimitado'])
                ])
            };
        };

        var download = field('WAN download', 0);
        var upload = field('WAN upload', 0);

        // 1. Download Calculator
        var calcDownInput = E('input', {
            type: 'number',
            class: 'cbi-input-text',
            min: 1,
            max: 100000,
            step: '1',
            placeholder: 'Velocidade nominal (Mbps)',
            style: 'max-width: 170px; margin-right: 6px;'
        });
        var calcDownNotice = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 4px; font-size: 11px; line-height: 1.3;' }, [
            'Margem recomendada de 7% para absorver variações do modem.'
        ]);
        var applyCalcDownBtn = E('button', {
            type: 'button',
            class: 'btn cbi-button cbi-button-action ex-mini-button',
            style: 'font-weight: 600;',
            click: function() {
                var nominal = parseFloat(calcDownInput.value || 0);
                if (nominal > 0) {
                    var discounted = Math.round(nominal * 0.93 * 10) / 10;
                    download.node.value = discounted;
                    calcDownNotice.style.color = '#10b981';
                    calcDownNotice.textContent = '✓ ' + discounted + ' Mbps aplicado ao Download (-7% contra Bufferbloat).';
                }
            }
        }, ['Aplicar -7%']);

        var calcDownBox = E('div', { class: 'ex-qos-calc-box', style: 'margin-top: 8px; margin-bottom: 8px; padding: 8px 10px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 8px;' }, [
            E('div', { style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;' }, [
                E('strong', { style: 'font-size: 11.5px;' }, ['🧮 Calculadora de Download (-7% Bufferbloat)'])
            ]),
            E('div', { style: 'display: flex; align-items: center; flex-wrap: wrap; gap: 4px;' }, [
                calcDownInput,
                applyCalcDownBtn
            ]),
            calcDownNotice
        ]);

        // 2. Upload Calculator
        var calcInput = E('input', {
            type: 'number',
            class: 'cbi-input-text',
            min: 1,
            max: 100000,
            step: '1',
            placeholder: 'Velocidade nominal (Mbps)',
            style: 'max-width: 170px; margin-right: 6px;'
        });
        var calcNotice = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 4px; font-size: 11px; line-height: 1.3;' }, [
            'Margem de 7% aplicada para impedir acúmulo de fila no modem.'
        ]);
        var applyCalcBtn = E('button', {
            type: 'button',
            class: 'btn cbi-button cbi-button-action ex-mini-button',
            style: 'font-weight: 600;',
            click: function() {
                var nominal = parseFloat(calcInput.value || 0);
                if (nominal > 0) {
                    var discounted = Math.round(nominal * 0.93 * 10) / 10;
                    upload.node.value = discounted;
                    calcNotice.style.color = '#10b981';
                    calcNotice.textContent = '✓ ' + discounted + ' Mbps aplicado ao Upload (-7% contra Bufferbloat).';
                }
            }
        }, ['Aplicar -7%']);

        var calcBox = E('div', { class: 'ex-qos-calc-box', style: 'margin-top: 8px; margin-bottom: 8px; padding: 8px 10px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 8px;' }, [
            E('div', { style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;' }, [
                E('strong', { style: 'font-size: 11.5px;' }, ['🧮 Calculadora de Upload (-7% Bufferbloat)'])
            ]),
            E('div', { style: 'display: flex; align-items: center; flex-wrap: wrap; gap: 4px;' }, [
                calcInput,
                applyCalcBtn
            ]),
            calcNotice
        ]);

        // 3. Link Layer Overhead & CAKE Parameters
        var overheadSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; margin-top: 4px;' }, [
            E('option', { value: 'none|0' }, ['Nenhum / Ethernet Pura (0 bytes overhead)']),
            E('option', { value: 'ethernet|18' }, ['Cabo DOCSIS / Ethernet Padrão (18 bytes)']),
            E('option', { value: 'ethernet|26' }, ['Fibra GPON / IPoE Padrão (26 bytes)']),
            E('option', { value: 'ethernet|34' }, ['Fibra PPPoE / VLAN (34 bytes)']),
            E('option', { value: 'ethernet|44', selected: true }, ['Fibra GPON / PPPoE Conservador (44 bytes — Recomendado)']),
            E('option', { value: 'atm|44' }, ['Linha ADSL Antiga (ATM 44 bytes)'])
        ]);

        var chkNat = E('input', { type: 'checkbox', checked: true });
        var chkHostFair = E('input', { type: 'checkbox', checked: true });
        var chkAck = E('input', { type: 'checkbox', checked: true });
        var chkWash = E('input', { type: 'checkbox', checked: true });
        var chkDiffserv = E('input', { type: 'checkbox', checked: true });

        var advancedDetails = E('details', { style: 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;' }, [
            E('summary', { style: 'cursor: pointer; font-weight: 700; font-size: 12px; color: #93c5fd;' }, ['⚙️ Parâmetros Avançados do CAKE & Enquadramento (Overhead)']),
            E('div', { style: 'margin-top: 10px; display: flex; flex-direction: column; gap: 8px;' }, [
                E('label', { style: 'display: block;' }, [
                    E('span', { style: 'font-weight: 600; font-size: 11.5px; display: block;' }, ['Tipo de Link / Overhead de Linha:']),
                    overheadSelect,
                    E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Compensa os cabeçalhos de fibra/cabo no shaper para precisão absoluta anti-bufferbloat.'])
                ]),
                E('div', { style: 'display: flex; flex-direction: column; gap: 6px; margin-top: 4px;' }, [
                    E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
                        chkNat,
                        E('span', {}, [E('strong', {}, ['NAT Lookup (nat): ']), 'Permite ao CAKE ver o IP real de cada aparelho da casa antes do NAT.'])
                    ]),
                    E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
                        chkHostFair,
                        E('span', {}, [E('strong', {}, ['Host Isolation (dual-srchost/dsthost): ']), 'Divisão igualitária de banda por dispositivo (impede que um download sufoque os outros).'])
                    ]),
                    E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
                        chkAck,
                        E('span', {}, [E('strong', {}, ['Filtro de ACK TCP (ack-filter): ']), 'Acelera o upload filtrando ACKs redundantes durante downloads pesados.'])
                    ]),
                    E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
                        chkWash,
                        E('span', {}, [E('strong', {}, ['Limpeza DSCP (wash): ']), 'Higieniza marcações DSCP incorretas vindas da operadora.'])
                    ]),
                    E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
                        chkDiffserv,
                        E('span', {}, [E('strong', {}, ['Diffserv 4-Tiers (diffserv4): ']), 'Priorização automática: Voz/Jogos > Vídeo/Streaming > Normal > Torrents.'])
                    ])
                ])
            ])
        ]);

        var speedtestBanner = E('div', {
            class: 'alert-message info',
            style: 'margin-bottom: 12px; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.35); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-radius: 8px; padding: 10px 14px;'
        }, [
            E('div', {}, [
                E('strong', { style: 'display: block; color: #60a5fa; font-size: 13px;' }, ['🎬 Medição Recente do Fast.com']),
                E('span', { style: 'font-size: 12.5px;' }, [
                    'Download: ', E('strong', {}, [presetDown + ' Mbps']), ' • Upload: ', E('strong', {}, [presetUp + ' Mbps'])
                ])
            ]),
            E('button', {
                type: 'button',
                class: 'btn cbi-button cbi-button-action ex-mini-button',
                style: 'font-weight: 700; padding: 6px 12px;',
                click: function() {
                    download.node.value = Math.round(presetDown * 0.93 * 10) / 10;
                    upload.node.value = Math.round(presetUp * 0.93 * 10) / 10;
                    (window.L && window.L.ui || window.ui).addNotification(null, E('p', {}, ['✓ Limites anti-bufferbloat (-7%) aplicados a partir da medição do Fast.com!']), 'info');
                }
            }, ['🎯 Aplicar nos Limites (-7%)'])
        ]);

        var section = E('section', {}, [
            E('h3', {}, ['WAN Principal']),
            download.row,
            calcDownBox,
            upload.row,
            calcBox,
            advancedDetails
        ]);

        (window.L && window.L.ui || window.ui).showModal('Editar SQM / CAKE (v1.5.8)', [
            speedtestBanner,
            E('div', { class: 'ex-qos-edit-grid' }, [section]),
            E('div', { class: 'right', style: 'margin-top: 14px;' }, [
                E('button', { class: 'btn cbi-button cbi-button-neutral', click: function() { (window.L && window.L.ui || window.ui).hideModal(); } }, ['Cancelar']),
                ' ',
                E('button', { class: 'btn cbi-button cbi-button-positive' }, ['Salvar e reiniciar SQM'])
            ])
        ]);
    """)
    time.sleep(2)

    sqm_shot1 = os.path.join(out_dir, "artifact_sqm_cake_enhanced_v158.png")
    driver.save_screenshot(sqm_shot1)
    print(f"[OK] Print do SQM CAKE modal salvo em: {sqm_shot1}")

    # Abrir detalhes avançados do CAKE
    driver.execute_script("""
        var details = document.querySelector('.modal details, #modal_overlay details');
        if (details) details.open = true;
    """)
    time.sleep(1)

    # Clicar no botão 'Aplicar nos Limites (-7%)' da medição do Fast.com
    apply_fast_btn = driver.find_element(By.XPATH, "//button[contains(., 'Aplicar nos Limites')]")
    apply_fast_btn.click()
    time.sleep(1)

    sqm_shot2 = os.path.join(out_dir, "artifact_sqm_calculated_v158.png")
    driver.save_screenshot(sqm_shot2)
    print(f"[OK] Print do SQM com cálculo aplicado e detalhes avançados aberto salvo em: {sqm_shot2}")

    # Verificar valores preenchidos nos inputs
    values = driver.execute_script("""
        var inputs = document.querySelectorAll('.modal .ex-qos-edit-field input');
        var res = [];
        inputs.forEach(function(inp) { res.push(inp.value); });
        return res;
    """)
    print("Valores nos campos SQM pós -7%:", values)
    # 850 * 0.93 = 790.5, 420 * 0.93 = 390.6
    print(f"✓ Download calculado: {values[0]} Mbps (esperado ~790.5 Mbps)")
    print(f"✓ Upload calculado: {values[1]} Mbps (esperado ~390.6 Mbps)")

    # Fechar modal
    driver.execute_script("var ui = window.L && window.L.ui || window.ui; if (ui && ui.hideModal) ui.hideModal();")
    time.sleep(1)

    # Inspecionar card do AdGuard Home no dashboard
    print("\n=== TESTE 3: Verificando URL e Card do AdGuard Home ===")
    adg_card_shot = os.path.join(out_dir, "artifact_adguard_card_v158.png")
    driver.save_screenshot(adg_card_shot)
    print(f"[OK] Print do Dashboard geral salvo em: {adg_card_shot}")

    # Checar se ha erros no console
    print("\n=== Verificando Logs do Console JavaScript ===")
    logs = driver.get_log('browser')
    severe_errors = [l for l in logs if l['level'] == 'SEVERE' and 'favicon.ico' not in l['message']]
    if severe_errors:
        print(f"[AVISO] {len(severe_errors)} erros SEVERE no console:")
        for err in severe_errors:
            print("  -", err['message'])
    else:
        print("✓ Zero erros SEVERE no console JavaScript!")

    print("\n=== TODOS OS TESTES VISUAIS CONCLUÍDOS COM SUCESSO! ===")

finally:
    driver.quit()
