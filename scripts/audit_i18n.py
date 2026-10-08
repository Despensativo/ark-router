#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router: i18n Coverage Auditor & Extraction Pipeline
Ensures all critical user-facing UI strings defined in src/ have corresponding
translations in both English (EN) and Spanish (ES) in src/core/i18n/.
Includes pre-release extraction to prevent token waste during development.
"""

import os
import sys
import re
import json
import argparse

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
I18N_FILE = os.path.join(REPO_DIR, "src", "core", "i18n.js")
MODULES_DIR = os.path.join(REPO_DIR, "src", "modules")
CORE_DIR = os.path.join(REPO_DIR, "src", "core")

PATTERNS = [
    (r"_t\(\s*[\"']([^\"']{2,140})[\"']", "translation_call"),
    (r"ui\.showModal\(\s*[\"']([^\"']{3,100})[\"']", "modal_title"),
    (r"title:\s*[\"']([^\"']{3,100})[\"']", "title_attr"),
    (r"[\"']aria-label[\"']:\s*[\"']([^\"']{3,100})[\"']", "aria_label"),
    (r"placeholder:\s*[\"']([^\"']{3,100})[\"']", "placeholder"),
    (r"confirmText:\s*[\"']([^\"']{2,80})[\"']", "confirm_text"),
    (r"cancelText:\s*[\"']([^\"']{2,80})[\"']", "cancel_text"),
    (r"class:\s*[\"'][^\"']*ex-kicker[^\"']*[\"']\s*\}\s*,\s*\[\s*[\"']([^\"']+)[\"']", "kicker"),
    (r"E\(\s*[\"'](?:button|span|label|h[1-6]|p|strong|small|em|div|a)[\"']\s*,\s*\{[^}]*\}\s*,\s*\[\s*[\"']([^\"']{3,120})[\"']", "dom_with_props"),
    (r"E\(\s*[\"'][a-z0-9-]+[\"']\s*,\s*\{\}\s*,\s*\[\s*[\"']([^\"']{3,120})[\"']", "dom_empty_props"),
    (r"ui\.addNotification\(\s*\{[^}]*message:\s*[\"']([^\"']{3,120})[\"']", "notification")
]

PT_REGEX = re.compile(
    r'[\u00C0-\u00FF]|(?:conectar|desconectar|dispositivo|roteador|configur|ativ|ligad|desligad|recolh|'
    r'expand|limp|otimiz|servidor|saúde|memória|armazen|velocidade|carreg|salv|cancel|reinici|bloque|liber|'
    r'atenção|padrão|segundo|minuto|hora|dia|semana|mês|ano|automático|manual|abrir|fechar|voltar|avançar|'
    r'excluir|remover|aplicar|ajust|taxa|rede|porta|canal|segurança|senha|usuário|cliente|conex|histórico|'
    r'tráfego|gráfico|painel|detalhe|ajuda|aviso|erro|sucesso|falha|instal|recurso|modo|início|gerenc|'
    r'atualiz|opç|estatística|endereço|filtro|prioridade)',
    re.IGNORECASE
)

def load_dictionaries():
    po_dir = os.path.join(REPO_DIR, "po")
    en_file = os.path.join(po_dir, "en", "ark.po")
    es_file = os.path.join(po_dir, "es", "ark.po")

    def read_po_keys(path):
        keys = set()
        if not os.path.isfile(path):
            return keys
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith('msgid "') and len(line) > 8:
                    key = line[7:-1].replace('\\"', '"').replace('\\n', '\n')
                    if key:
                        keys.add(key)
        return keys

    en_keys = read_po_keys(en_file)
    es_keys = read_po_keys(es_file)
    
    if not en_keys or not es_keys:
        print(f"ERRO: Arquivos .po não encontrados ou vazios em {po_dir}", file=sys.stderr)
        sys.exit(1)
        
    return en_keys, es_keys

def scan_module_strings():
    ui_map = {}
    files_to_scan = []

    for d in [MODULES_DIR, CORE_DIR]:
        if os.path.exists(d):
            for f in sorted(os.listdir(d)):
                if f.endswith(".js") and not f.startswith(".") and f not in ["en.js", "es.js", "i18n.js"]:
                    files_to_scan.append(os.path.join(d, f))

    for p in files_to_scan:
        with open(p, "r", encoding="utf-8") as fh:
            code = fh.read()
        rel = os.path.relpath(p, REPO_DIR)
        for pat, cat in PATTERNS:
            for match in re.findall(pat, code):
                cleaned = match.strip()
                if (cleaned and not cleaned.startswith("/") and not cleaned.startswith("http")
                        and not cleaned.startswith("cbi-") and not cleaned.startswith("ark-")
                        and not cleaned.startswith("ex-")):
                    if (PT_REGEX.search(cleaned) or cat in ["translation_call", "modal_title",
                                                            "kicker", "notification",
                                                            "confirm_text", "cancel_text"]):
                        if cleaned not in ui_map:
                            ui_map[cleaned] = {"category": cat, "files": set()}
                        ui_map[cleaned]["files"].add(rel)

    return ui_map

def export_missing_json(missing_items, output_path):
    export_data = {
        "description": "ARK Router - Lote de Traduções Pendentes para Pré-Release",
        "pending_count": len(missing_items),
        "strings": {}
    }
    for text, info in sorted(missing_items.items()):
        export_data["strings"][text] = {
            "en": "",
            "es": "",
            "category": info["category"],
            "files": sorted(list(info["files"]))
        }

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)

    print(f"\n[OK] {len(missing_items)} strings pendentes exportadas para: {output_path}")
    print("Preencha os valores de 'en' e 'es' no lote e integre em src/core/i18n/.")

def generate_catalog_markdown(ui_map, en_keys, es_keys, output_path):
    categories = {}
    for text, info in ui_map.items():
        cat = info["category"]
        if cat not in categories:
            categories[cat] = []
        categories[cat].append((text, info))

    lines = [
        "# Catálogo Automatizado de Strings Visíveis de Interface (ARK Router)",
        "",
        f"- **Total de strings rastreadas na UI**: {len(ui_map)}",
        f"- **Chaves cadastradas em Inglês (EN)**: {len(en_keys)}",
        f"- **Chaves cadastradas em Espanhol (ES)**: {len(es_keys)}",
        "",
        "## Distribuição por Categoria de Componente",
        "",
        "| Categoria | Descrição | Ocorrências | Cobertura EN | Cobertura ES |",
        "|---|---|---|---|---|"
    ]

    cat_desc = {
        "translation_call": "Chamadas diretas `_t(...)`",
        "modal_title": "Títulos de Janelas Modais",
        "kicker": "Subtítulos Explicativos (`ex-kicker`)",
        "title_attr": "Atributos de Dica / Hover (`title`)",
        "aria_label": "Acessibilidade (`aria-label`)",
        "placeholder": "Textos de Entrada (`placeholder`)",
        "confirm_text": "Botões de Confirmação",
        "cancel_text": "Botões de Cancelamento",
        "dom_with_props": "Elementos DOM com Estilo (`E(...)`)",
        "dom_empty_props": "Elementos DOM Simples (`E(...)`)",
        "notification": "Notificações Flutuantes (`ui.addNotification`)"
    }

    for cat, items in sorted(categories.items()):
        desc = cat_desc.get(cat, cat)
        cov_en = sum(1 for t, _ in items if t in en_keys)
        cov_es = sum(1 for t, _ in items if t in es_keys)
        pct_en = (cov_en / len(items)) * 100 if items else 100
        pct_es = (cov_es / len(items)) * 100 if items else 100
        lines.append(f"| `{cat}` | {desc} | {len(items)} | {cov_en}/{len(items)} ({pct_en:.1f}%) | {cov_es}/{len(items)} ({pct_es:.1f}%) |")

    lines.append("")
    lines.append("---")
    lines.append("*Gerado automaticamente por `scripts/audit_i18n.py --catalog`.*")

    content = "\n".join(lines) + "\n"
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)

    print(f"\n[OK] Catálogo de i18n gerado em: {output_path}")

def main():
    parser = argparse.ArgumentParser(description="ARK Router i18n Auditor & Pre-Release Pipeline")
    parser.add_argument("--strict", action="store_true", help="Falha também em caso de assimetria entre dicionários EN e ES")
    parser.add_argument("--extract", nargs="?", const="docs/missing_i18n.json", default=None,
                        help="Exporta strings pendentes para JSON pronto para tradução em lote")
    parser.add_argument("--catalog", nargs="?", const="docs/I18N_CATALOG_SUMMARY.md", default=None,
                        help="Gera relatório Markdown com o catálogo de strings de UI")
    args = parser.parse_args()

    en_keys, es_keys = load_dictionaries()
    ui_map = scan_module_strings()
    ui_strings = set(ui_map.keys())

    print("=" * 60)
    print("ARK ROUTER: AUDITORIA DE INTERNACIONALIZAÇÃO (i18n)")
    print("=" * 60)
    print(f"  Chaves cadastradas: EN={len(en_keys)} | ES={len(es_keys)}")
    print(f"  Strings visíveis rastreadas no código: {len(ui_strings)}")

    missing_en = {}
    missing_es = {}

    for s, info in ui_map.items():
        if s not in en_keys:
            missing_en[s] = info
        if s not in es_keys:
            missing_es[s] = info

    diff_en_es = en_keys.symmetric_difference(es_keys)

    if args.catalog:
        cat_file = os.path.join(REPO_DIR, args.catalog) if not os.path.isabs(args.catalog) else args.catalog
        generate_catalog_markdown(ui_map, en_keys, es_keys, cat_file)

    if args.extract:
        missing_all = {**missing_en, **missing_es}
        ext_file = os.path.join(REPO_DIR, args.extract) if not os.path.isabs(args.extract) else args.extract
        export_missing_json(missing_all, ext_file)

    errors = 0
    if missing_en:
        print(f"\n[FALHA] {len(missing_en)} strings visíveis sem tradução para Inglês (EN):", file=sys.stderr)
        for s in list(missing_en.keys())[:10]:
            print(f"  - '{s}' ({missing_en[s]['category']})", file=sys.stderr)
        if len(missing_en) > 10:
            print(f"  ... e mais {len(missing_en) - 10} strings.", file=sys.stderr)
        errors += len(missing_en)

    if missing_es:
        print(f"\n[FALHA] {len(missing_es)} strings visíveis sem tradução para Espanhol (ES):", file=sys.stderr)
        for s in list(missing_es.keys())[:10]:
            print(f"  - '{s}' ({missing_es[s]['category']})", file=sys.stderr)
        if len(missing_es) > 10:
            print(f"  ... e mais {len(missing_es) - 10} strings.", file=sys.stderr)
        errors += len(missing_es)

    if diff_en_es:
        print(f"\n[AVISO] {len(diff_en_es)} chaves presentes em apenas um dos dicionários (assimetria EN/ES):", file=sys.stderr)
        for s in list(diff_en_es)[:5]:
            print(f"  - '{s}'", file=sys.stderr)
        if args.strict:
            errors += len(diff_en_es)

    if errors > 0:
        print(f"\nERRO: Auditoria de i18n reprovada com {errors} pendências!", file=sys.stderr)
        print("Dica Token-Efficient: execute 'python scripts/audit_i18n.py --extract' para gerar o lote JSON", file=sys.stderr)
        print("e traduzir todas as strings pendentes de uma só vez antes do release.", file=sys.stderr)
        sys.exit(1)

    print("\n✓ Auditoria i18n: 100% de cobertura nos 3 idiomas (PT-BR, EN, ES) aprovada!")
    sys.exit(0)

if __name__ == "__main__":
    main()
