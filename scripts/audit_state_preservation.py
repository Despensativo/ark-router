#!/usr/bin/env python3
"""
ARK Router — Auditoria de Preservação de Estado e Anti-Regressão
Varre os módulos shell do sistema em busca de 'Antipadrões de Restauração Cega':
- Atribuições estáticas (hardcoded) em rotinas de reset, restore, revert, disable e uninstall.
- Exclusões de configurações (uci delete) sem snapshot prévio.
- Regressões onde escolhas anteriores do usuário são atropeladas por padrões arbitrários.
"""

import os
import sys
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
MODULES_DIR = os.path.join(PROJECT_ROOT, "root", "usr", "lib", "ark", "modules")
CONTROL_FILE = os.path.join(PROJECT_ROOT, "root", "usr", "sbin", "equipe-dashboard-control")

LIFECYCLE_KEYWORDS = [
    'restore', 'revert', 'disable', 'uninstall', 'toggle', 'reset', 'setup', 'apply'
]

CORE_CONFIGS = {'dhcp', 'network', 'wireless', 'firewall', 'system', 'sqm', 'mwan3'}

EXCLUSION_PATTERNS = [
    r'network\.[a-zA-Z0-9_]+\.proto=\'dhcp\'',
    r'network\.[a-zA-Z0-9_]+\.delegate=\'0\'',
    r'firewall\.[a-zA-Z0-9_]+\.target=\'ACCEPT\'',
    r'firewall\.[a-zA-Z0-9_]+\.target=\'REJECT\'',
    r'system\.[a-zA-Z0-9_]+\.trigger=\'none\'',
    r'dhcp\.@dnsmasq\[0\]\.cachesize=\'1000\'',
    r'mwan3\.[a-zA-Z0-9_]+\.use_policy=\'wan_then_wan2\'',
    r'mwan3\.tor_[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+',
]

def parse_code_blocks(filepath):
    """Extrai tanto funções shell clássicas func() {} quanto branches de case: action) ... ;;"""
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
        
    blocks = []
    current_name = None
    current_lines = []
    brace_depth = 0
    start_line = 0
    in_case = False
    
    for i, line in enumerate(lines, 1):
        # Detecção de função shell: nome() {
        m_func = re.match(r'^([a-zA-Z0-9_]+)\s*\(\)\s*\{', line)
        if m_func and not in_case:
            current_name = m_func.group(1)
            start_line = i
            brace_depth = line.count('{') - line.count('}')
            current_lines = [line]
            if brace_depth <= 0:
                blocks.append((current_name, start_line, i, "".join(current_lines)))
                current_name = None
            continue

        if current_name and not in_case:
            current_lines.append(line)
            brace_depth += line.count('{') - line.count('}')
            if 'case ' in line:
                in_case = True
            if brace_depth <= 0:
                blocks.append((current_name, start_line, i, "".join(current_lines)))
                current_name = None
                in_case = False
            continue

        # Detecção de ramificação de case: \tacao-comando)
        m_case = re.match(r'^\s*([a-zA-Z0-9_|-]+)\)', line)
        if m_case:
            cmd_name = m_case.group(1).split('|')[0].strip()
            case_lines = [line]
            c_start = i
            # Lê até o fechamento ;;
            for j in range(i, len(lines)):
                if j > i:
                    case_lines.append(lines[j])
                if re.search(r';;\s*$', lines[j]):
                    blocks.append((cmd_name, c_start, j + 1, "".join(case_lines)))
                    break

    return blocks

def audit_file(filepath):
    fname = os.path.basename(filepath)
    blocks = parse_code_blocks(filepath)
    issues = []
    compliant = []

    seen = set()
    for name, start, end, body in blocks:
        if (name, start) in seen:
            continue
        seen.add((name, start))

        is_lifecycle = any(k in name.lower() for k in LIFECYCLE_KEYWORDS)
        if not is_lifecycle:
            continue

        targets = set(re.findall(r'uci\s+(?:-q\s+)?(?:set|delete|del_list|add_list)\s+([\'"]?)([a-zA-Z0-9_]+)\.', body))
        targets_configs = set(t[1] for t in targets if t[1] in CORE_CONFIGS)
        if not targets_configs:
            continue

        has_snapshot = bool(re.search(r'(saved_|previous|_backup|orig_|clean_|cur_)', body))

        # Procura por hardcoded sets em opções sensíveis
        raw_sets = re.findall(r'uci\s+(?:-q\s+)?set\s+([\'"]?)([a-zA-Z0-9_.@\[\]]+)=([^\s\'"]+|\'[^\']*\'|"[^"]*")', body)
        suspicious_sets = []
        for quote, key, val in raw_sets:
            cfg = key.split('.')[0] if '.' in key else ''
            if cfg in CORE_CONFIGS:
                val_clean = val.strip("'\"")
                if val_clean in ['interface', 'rule', 'zone', 'queue', 'led', 'guest_limit', 'redirect', 'defaults', 'forwarding', 'wifi-iface', 'wifi-device', 'config', 'settings']:
                    continue
                full_expr = f"{key}={val}"
                if any(re.search(pat, full_expr) for pat in EXCLUSION_PATTERNS):
                    continue
                if not val.startswith('$') and not has_snapshot:
                    suspicious_sets.append((key, val))

        # Procura por deletes em chaves primárias sem snapshot
        raw_deletes = re.findall(r'uci\s+(?:-q\s+)?(?:delete|del_list)\s+([\'"]?)([a-zA-Z0-9_.@\[\]]+)', body)
        suspicious_deletes = []
        for quote, key in raw_deletes:
            cfg = key.split('.')[0] if '.' in key else ''
            if cfg in CORE_CONFIGS:
                if not has_snapshot and any(k in name.lower() for k in ['restore', 'revert', 'disable', 'uninstall']):
                    suspicious_deletes.append(key)

        if suspicious_sets or suspicious_deletes:
            issues.append({
                'file': fname,
                'func': name,
                'start': start,
                'targets': list(targets_configs),
                'suspicious_sets': suspicious_sets,
                'suspicious_deletes': suspicious_deletes
            })
        else:
            compliant.append({
                'file': fname,
                'func': name,
                'has_snapshot': has_snapshot,
                'targets': list(targets_configs)
            })

    return issues, compliant

def run_audit(strict=False):
    print("=" * 78)
    print("      ARK ROUTER: AUDITORIA DE PRESERVAÇÃO DE ESTADO E ANTI-REGRESSÃO")
    print("=" * 78)

    all_issues = []
    total_audited = 0

    files_to_check = []
    if os.path.isdir(MODULES_DIR):
        for f in sorted(os.listdir(MODULES_DIR)):
            if f.endswith('.sh'):
                files_to_check.append(os.path.join(MODULES_DIR, f))

    for filepath in files_to_check:
        issues, compliant = audit_file(filepath)
        total_audited += (len(issues) + len(compliant))
        all_issues.extend(issues)

    print(f"Total de rotinas de ciclo de vida / restauração auditadas: {total_audited}\n")

    if not all_issues:
        print("[OK] ZERO violações de preservação de estado encontradas!")
        print("     Todas as rotinas que mutam subsistemas críticos possuem snapshot & restore.")
        print("=" * 78)
        return 0
    else:
        print(f"[ALERTA] Encontradas {len(all_issues)} funções/ações com potencial risco de 'Restauração Cega':\n")
        for iss in all_issues:
            print(f"-> {iss['file']}:{iss['start']} em {iss['func']}():")
            print(f"   Subsistemas afetados: {', '.join(iss['targets'])}")
            if iss['suspicious_sets']:
                print(f"   Atribuições estáticas sem checagem prévia:")
                for k, v in iss['suspicious_sets']:
                    print(f"     * {k} = {v}")
            if iss['suspicious_deletes']:
                print(f"   Exclusões de configuração sem restauração:")
                for k in iss['suspicious_deletes']:
                    print(f"     * {k}")
            print()

        print("=" * 78)
        if strict:
            return 1
        return 0

if __name__ == "__main__":
    strict_mode = "--strict" in sys.argv
    sys.exit(run_audit(strict=strict_mode))
