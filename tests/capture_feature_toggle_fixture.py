#!/usr/bin/env python3
"""Captura real de Chromium com método LuCI original e RPC simulado.

Não substitui sessão LuCI/VM: verifica apresentação de erro e preservação do
estado ao receber falha do backend. Requer Playwright no ambiente de testes.
"""
import argparse
import hashlib
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parents[1]
FIXTURE = """<!doctype html><html lang="pt-BR"><meta charset="utf-8">
<style>
*{box-sizing:border-box}body{margin:0;background:#111827;color:#f3f4f6;font:15px/1.5 system-ui;padding:16px}
header{font-size:12px;color:#9ca3af}h1{font-size:23px}h2{font-size:19px;margin-top:0}
#dialog{max-width:600px;border:1px solid #4b5563;background:#1f2937;border-radius:12px;padding:18px;margin:24px auto}
.alert-message{padding:10px;border:1px solid #6b7280;border-radius:8px}.warning{background:#403620}.notice{background:#1e3549}
button{white-space:normal;min-height:44px;border:0;border-radius:8px;padding:10px;font:inherit;color:white;background:#4b5563}
.cbi-button-negative{background:#9f3232}#notifications{max-width:600px;margin:auto;color:#fecaca}
.right{flex-wrap:wrap}code{word-break:break-word}
</style><header>FIXTURE DE TESTE · método original do ARK · RPC simulado</header>
<h1>Central de Recursos — SQM</h1><p>Estado anterior: ativo</p><div id="dialog"></div><div id="notifications"></div>
<script>
window.E = function(tag, attrs, children) {
 const el=document.createElement(tag); attrs=attrs||{};
 for (const [key,value] of Object.entries(attrs)) {
  if (typeof value==='function') el.addEventListener(key,value); else el.setAttribute(key,value);
 }
 function append(c){if(Array.isArray(c))c.forEach(append);else if(c!=null)el.append(c.nodeType?c:document.createTextNode(String(c)));}
 append(children);return el;
};
window.ui={showModal(title,children){const d=document.querySelector('#dialog');d.replaceChildren(E('h2',{},[title]),...children);},
 hideModal(){document.querySelector('#dialog').replaceChildren();},
 addNotification(_,node){document.querySelector('#notifications').append(node);}};
window.FEATURE_META={sqm:{name:'SQM'}};
window.closeModal=()=>ui.hideModal();
window.reloadAfterExpectedDisconnect=()=>false;
window.fs={exec:async()=>({code:1,stderr:'Falha ao parar SQM. A preferência anterior foi preservada.'})};
window.fixtureFeature={active:true,user_disabled:false};
</script></html>"""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    source = (REPO / 'src/modules/system.js').read_text()
    evidence = {'environment': 'Chromium real; DOM/serviços LuCI e RPC simulados; sem VM',
                'source_sha256': hashlib.sha256(source.encode()).hexdigest(), 'cases': []}
    with sync_playwright() as pw:
        browser = pw.chromium.launch(channel='chrome', headless=True)
        for width in [360, 1280]:
            page = browser.new_page(viewport={'width': width, 'height': 900})
            errors = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            page.on('console', lambda msg: errors.append(msg.text) if msg.type == 'error' else None)
            page.set_content(FIXTURE)
            page.add_script_tag(content=source + '\nwindow.fixtureMethods=systemMethods;')
            page.evaluate("fixtureMethods.toggleFeatureState.call({feature:()=>fixtureFeature},'sqm',false)")
            page.get_by_role('button', name='Confirmar Desativação Segura').click()
            page.get_by_text('Falha ao parar SQM. A preferência anterior foi preservada.').wait_for()
            assert page.evaluate('fixtureFeature.active === true && fixtureFeature.user_disabled === false')
            assert page.get_by_role('button', name='Confirmar Desativação Segura').is_enabled()
            assert not errors, errors
            overflow = page.evaluate('document.documentElement.scrollWidth > innerWidth')
            assert not overflow
            page.screenshot(path=str(args.output / f'sqm-stop-failed-{width}.png'), full_page=True)
            evidence['cases'].append({'width': width, 'console_errors': errors,
                                      'state_preserved': True, 'retry_enabled': True, 'horizontal_overflow': overflow})
            page.close()
        browser.close()
    (args.output / 'browser-fixture.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps(evidence, ensure_ascii=False))


if __name__ == '__main__':
    main()
