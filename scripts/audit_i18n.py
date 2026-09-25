#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: i18n Coverage Auditor
Ensures all critical user-facing UI strings defined in src/ have corresponding
translations in both English (EN) and Spanish (ES) in src/core/i18n.js.
Fails with exit code 1 if any string is missing, preventing incomplete PRs/deploys.
"""

import os
import sys
import re

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
I18N_FILE = os.path.join(REPO_DIR, "src", "core", "i18n.js")
MODULES_DIR = os.path.join(REPO_DIR, "src", "modules")

def load_dictionaries():
    if not os.path.isfile(I18N_FILE):
        print(f"ERRO: Arquivo i18n não encontrado em {I18N_FILE}", file=sys.stderr)
        sys.exit(1)

    content = open(I18N_FILE, "r", encoding="utf-8").read()
    
    # Extract EN
    en_match = re.search(r'const\s+EN\s*=\s*(\{[\s\S]*?\n\};)', content)
    # Extract ES
    es_match = re.search(r'const\s+ES\s*=\s*(\{[\s\S]*?\n\};)', content)

    if not en_match or not es_match:
        print("ERRO: Dicionários EN ou ES não encontrados em src/core/i18n.js", file=sys.stderr)
        sys.exit(1)

    en_keys = set(re.findall(r'["\']([^"\']+)["\']\s*:\s*["\']', en_match.group(1)))
    es_keys = set(re.findall(r'["\']([^"\']+)["\']\s*:\s*["\']', es_match.group(1)))
    return en_keys, es_keys

def scan_module_strings():
    ui_strings = set()
    patterns = [
        r"_t\(\s*['\"]([^'\"]{2,100})['\"]",
        r"ui\.showModal\(\s*['\"]([^'\"]{3,80})['\"]",
        r"title:\s*['\"]([^'\"]{3,100})['\"]",
        r"['\"]aria-label['\"]:\s*['\"]([^'\"]{3,100})['\"]",
        r"placeholder:\s*['\"]([^'\"]{3,100})['\"]",
        r"class:\s*['\"]ex-kicker['\"]\s*\}\s*,\s*\[\s*['\"]([^'\"]+)['\"]",
        r"E\(\s*['\"][a-z0-9-]+['\"]\s*,\s*\{[^}]*\}\s*,\s*\[\s*['\"]([^'\"]{3,100})['\"]",
        r"E\(\s*['\"][a-z0-9-]+['\"]\s*,\s*\{\}\s*,\s*\[\s*['\"]([^'\"]{3,100})['\"]"
    ]
    
    pt_pattern = re.compile(r'[\u00C0-\u00FF]|(?:conectar|desconectar|dispositivo|roteador|configur|ativ|ligad|desligad|recolh|expand|limp|otimiz|servidor|saúde|memória|armazen|velocidade|carreg|salv|cancel|reinici|bloque|liber|atenção|padrão|segundo|minuto|hora|dia|semana|mês|ano|automático|manual|abrir|fechar|voltar|avançar|excluir|remover|aplicar|ajust|taxa|rede|porta|canal|segurança|senha|usuário|cliente|conex|histórico|tráfego|gráfico|painel|detalhe|ajuda|aviso|erro|sucesso|falha|instal|recurso|modo|início|gerenc|atualiz|opç|estatística|endereço|filtro|prioridade)', re.IGNORECASE)

    for fname in os.listdir(MODULES_DIR):
        if not fname.endswith(".js") or fname.startswith("."):
            continue
        filepath = os.path.join(MODULES_DIR, fname)
        with open(filepath, "r", encoding="utf-8") as f:
            code = f.read()
            for pat in patterns:
                for match in re.findall(pat, code):
                    cleaned = match.strip()
                    if cleaned and not cleaned.startswith("/") and not cleaned.startswith("http") and not cleaned.startswith("ex-") and not cleaned.startswith("cbi-") and not cleaned.startswith("ark-"):
                        if pt_pattern.search(cleaned) or "_t(" in pat or "ex-kicker" in pat or "ui.showModal" in pat:
                            ui_strings.add(cleaned)
                        
    return ui_strings

def main():
    en_keys, es_keys = load_dictionaries()
    ui_strings = scan_module_strings()

    print(f"ARK Router i18n Auditor:")
    print(f"  Chaves cadastradas: EN={len(en_keys)} | ES={len(es_keys)}")
    print(f"  Strings críticas rastreadas nos módulos: {len(ui_strings)}")

    missing_en = []
    missing_es = []

    for s in ui_strings:
        if s not in en_keys:
            missing_en.append(s)
        if s not in es_keys:
            missing_es.append(s)

    # Check symmetry between EN and ES
    diff_en_es = en_keys.symmetric_difference(es_keys)

    errors = 0
    if missing_en:
        print(f"\n[FALHA] {len(missing_en)} strings críticas sem tradução para Inglês (EN):", file=sys.stderr)
        for s in missing_en[:10]:
            print(f"  - '{s}'", file=sys.stderr)
        errors += len(missing_en)

    if missing_es:
        print(f"\n[FALHA] {len(missing_es)} strings críticas sem tradução para Espanhol (ES):", file=sys.stderr)
        for s in missing_es[:10]:
            print(f"  - '{s}'", file=sys.stderr)
        errors += len(missing_es)

    if diff_en_es:
        print(f"\n[AVISO] {len(diff_en_es)} chaves presentes em apenas um dos dicionários (assimetria EN/ES):", file=sys.stderr)
        for s in list(diff_en_es)[:5]:
            print(f"  - '{s}'", file=sys.stderr)

    if errors > 0:
        print(f"\nERRO: Auditoria de i18n reprovada com {errors} pendências!", file=sys.stderr)
        sys.exit(1)

    print("\n✓ Auditoria i18n: 100% de cobertura nos 3 idiomas (PT-BR, EN, ES) aprovada!")
    sys.exit(0)

if __name__ == "__main__":
    main()
