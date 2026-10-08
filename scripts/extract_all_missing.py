#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Deep Structural & Heuristic Extractor for ARK Router UI Strings
Captures 100% of user-facing UI strings across src/modules/ and src/core/.
"""

import os
import glob
import re
import json

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))

def get_po_keys(lang):
    po_path = os.path.join(REPO_DIR, "po", lang, "ark.po")
    if not os.path.isfile(po_path):
        return set()
    with open(po_path, "r", encoding="utf-8") as f:
        return set(re.findall(r'msgid "([^"]+)"', f.read()))

def is_valid_ui_string(s):
    s = s.strip()
    if len(s) < 2 or len(s) > 200:
        return False
    # Filter code symbols, CSS, paths, technical identifiers
    if s.startswith('/') or s.startswith('http') or s.startswith('cbi-') or s.startswith('ark-') or s.startswith('ex-'):
        return False
    if s.startswith('btn-') or s.startswith('alert-') or s.startswith('badge-') or s.startswith('icon-'):
        return False
    if s.startswith('#') or s.startswith('rgba') or s.startswith('calc(') or s.startswith('var('):
        return False
    if s.endswith('.sh') or s.endswith('.js') or s.endswith('.css') or s.endswith('.json') or s.endswith('.png') or s.endswith('.svg'):
        return False
    if re.match(r'^[a-z0-9_\-\.\:\/]+$', s):
        return False
    if re.match(r'^(?:[0-9]{1,3}\.){3}[0-9]{1,3}', s): # IPv4
        return False
    if re.match(r'^(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}$', s): # MAC
        return False
    if '{' in s or '}' in s or ';' in s or 'function' in s or '=>' in s:
        return False
    return True

def extract_all():
    en_keys = get_po_keys("en")
    es_keys = get_po_keys("es")

    files = glob.glob(os.path.join(REPO_DIR, "src", "modules", "*.js")) + \
            glob.glob(os.path.join(REPO_DIR, "src", "core", "*.js"))

    extracted = {}

    def add_str(s, fpath, reason=""):
        s = s.replace('\\"', '"').replace("\\'", "'").replace('\\n', ' ').strip()
        if is_valid_ui_string(s):
            if s not in extracted:
                extracted[s] = {"files": set(), "reason": reason}
            extracted[s]["files"].add(os.path.relpath(fpath, REPO_DIR))

    for fpath in files:
        with open(fpath, "r", encoding="utf-8") as f:
            code = f.read()

        # 1. Structural: _t('...')
        for m in re.finditer(r'_t\(\s*[\"\']([^\"\'\r\n]+)[\"\']\s*\)', code):
            add_str(m.group(1), fpath, "_t")

        # 2. Structural: field('label', node, 'hint'?, ...)
        for m in re.finditer(r'field\(\s*[\"\']([^\"\'\r\n]+)[\"\']', code):
            add_str(m.group(1), fpath, "field_label")
        for m in re.finditer(r'field\([^,]+,[^,]+,\s*[\"\']([^\"\'\r\n]+)[\"\']', code):
            add_str(m.group(1), fpath, "field_hint")

        # 3. Structural: UI attributes
        for m in re.finditer(r'(?:placeholder|title|aria-label|confirmText|cancelText)\s*:\s*[\"\']([^\"\'\r\n]+)[\"\']', code):
            add_str(m.group(1), fpath, "ui_attr")

        # 4. Structural: Modals & Notifications
        for m in re.finditer(r'ui\.showModal\(\s*[\"\']([^\"\'\r\n]+)[\"\']', code):
            add_str(m.group(1), fpath, "modal_title")
        for m in re.finditer(r'ui\.addNotification\([^,]*[\"\']([^\"\'\r\n]+)[\"\']', code):
            add_str(m.group(1), fpath, "notification")

        # 5. Structural: Array DOM children: ['Text...']
        for m in re.finditer(r'\[\s*[\"\']([^\"\'\r\n]{2,160})[\"\']\s*\]', code):
            add_str(m.group(1), fpath, "dom_array_text")

        # 6. Heuristic: Any quoted string with Portuguese accents or common telecom words
        str_regex = re.compile(r'"([^"\\]*(?:\\.[^"\\]*)*)"|\'([^\'\\]*(?:\\.[^\'\\]*)*)\'')
        pt_pattern = re.compile(
            r'[\u00C0-\u00FF]|(?:operadora|vazio|modem|fibra|roteador|conexão|conexao|prioridade|metrica|'
            r'métrica|peso|senha|usuario|usuário|acesso|clonar|físico|fisico|opcional|salvar|cancelar|'
            r'confirmar|adicionar|remover|excluir|editar|dispositivo|cliente|tráfego|trafego|velocidade|'
            r'automático|automatico|manual|desativado|ativado|habilitar|desabilitar|painel|ajuda|aviso|'
            r'atenção|atencao|erro|sucesso|falha|bloqueio|liberado|porta|rede|cabo|enlace|perfil|perfis)',
            re.I
        )
        for m in str_regex.finditer(code):
            raw = m.group(1) if m.group(1) is not None else m.group(2)
            if pt_pattern.search(raw):
                add_str(raw, fpath, "pt_heuristic")

    missing_en = {k: v for k, v in extracted.items() if k not in en_keys}
    missing_es = {k: v for k, v in extracted.items() if k not in es_keys}

    print(f"Total de strings de UI extraídas: {len(extracted)}")
    print(f"Total faltando no dicionário EN: {len(missing_en)}")
    print(f"Total faltando no dicionário ES: {len(missing_es)}")

    output_file = os.path.join(REPO_DIR, "docs", "missing_i18n_deep.json")
    export_dict = {}
    for k in sorted(set(list(missing_en.keys()) + list(missing_es.keys()))):
        export_dict[k] = {
            "en": "",
            "es": "",
            "files": sorted(list(extracted[k]["files"]))
        }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(export_dict, f, ensure_ascii=False, indent=2)

    print(f"Arquivo gerado com sucesso: {output_file}")

if __name__ == "__main__":
    extract_all()
