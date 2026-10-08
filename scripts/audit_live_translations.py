#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auditoria em tempo real de traduções e erros de console no roteador real via Playwright.
"""
import sys
import time
from playwright.sync_api import sync_playwright

ROUTER_URL = "http://10.203.73.5/cgi-bin/luci"
USER = "root"
PASS = "admin0100"

def audit():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))
        page.on("pageerror", lambda err: console_logs.append(f"[ERROR] {err}"))

        print(f"[1] Acessando {ROUTER_URL}...")
        page.goto(ROUTER_URL, timeout=15000)

        # Login
        if page.locator("input[name='luci_username']").is_visible():
            print("[2] Fazendo login...")
            page.fill("input[name='luci_username']", USER)
            page.fill("input[name='luci_password']", PASS)
            page.click("input[type='submit'], .cbi-button-apply")
            page.wait_for_load_state("networkidle")

        print("[3] Acessando equipe-dashboard...")
        page.goto(f"{ROUTER_URL}/admin/equipe-dashboard", timeout=15000)
        page.wait_for_selector("#ex-global-status", timeout=15000)
        time.sleep(2)

        # Verificar idioma atual
        current_lang = page.evaluate("() => window.dashboardLanguage || 'unknown'")
        print(f"Idioma atual do painel: {current_lang}")

        # Testar mudança para inglês
        print("[4] Mudando idioma para 'en' via API...")
        page.evaluate("""async () => {
            if (typeof loadDashboardLanguage === 'function') {
                dashboardLanguage = 'en';
                await loadDashboardLanguage('en');
                if (typeof enableTranslation === 'function') enableTranslation();
                if (typeof translateTree === 'function') translateTree(document.body);
            }
        }""")
        time.sleep(2)

        # Tirar screenshot em inglês
        screenshot_path = "docs/screenshots/live_translation_en_audit.png"
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"[5] Screenshot salvo em {screenshot_path}")

        # Varrer textos visíveis procurando resíduos em português
        pt_words = [
            "Configurações", "Configuração", "Rede", "Dispositivos", "Aparelhos", "Avançado",
            "Ativo", "Ativa", "Ativado", "Desativado", "Desativada", "Velocidade", "Memória",
            "Armazenamento", "Conexão", "Conectado", "Conectados", "Roteador", "Segurança",
            "Senha", "Visitantes", "Operadora", "Provedor", "Ponto", "Mestre", "Secundário",
            "Recursos", "Otimização", "Otimizações", "Limpar", "Inativos", "Reiniciar",
            "Salvar", "Aplicar", "Verificando", "Apenas", "Modo", "Padrão", "Automático"
        ]

        text_nodes = page.evaluate("""() => {
            const results = [];
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
            let n;
            while (n = walker.nextNode()) {
                if (n.parentNode && /^(SCRIPT|STYLE|CODE)$/.test(n.parentNode.nodeName)) continue;
                const txt = (n.nodeValue || '').trim();
                if (txt.length > 2 && n.parentElement && n.parentElement.offsetParent !== null) {
                    results.push({ text: txt, tag: n.parentElement.tagName, cls: n.parentElement.className });
                }
            }
            return results;
        }""")

        untranslated = []
        for item in text_nodes:
            t = item["text"]
            for w in pt_words:
                if w.lower() in t.lower() and not any(skip in t for skip in ["Português", "pt-br"]):
                    untranslated.append((w, item["text"], item["tag"], item["cls"]))
                    break

        print(f"\n[6] Resumo de textos ainda em Português na interface em Inglês ({len(untranslated)} encontrados):")
        for word, full_text, tag, cls in untranslated[:30]:
            print(f"  ❌ [{tag}.{cls[:20]}] '{full_text}' (detectado: '{word}')")

        print(f"\n[7] Logs do Console ({len(console_logs)} eventos):")
        for log in console_logs[:20]:
            print(f"  {log}")

        browser.close()

if __name__ == "__main__":
    audit()
