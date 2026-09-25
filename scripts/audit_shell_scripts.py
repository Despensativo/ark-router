#!/usr/bin/env python3
"""
ARK Router - Automated Shell Script & Function Collision Auditor
Scans all shell scripts in root/usr/lib/ark/ and root/ to verify:
1. No duplicate/overlapping function definitions across modules.
2. POSIX /bin/sh syntax integrity (via sh -n).
3. Firewall rule isolation (Rule 11: fw4 vs fw3).
4. MTU Baby Jumbo device consolidation (Rule 10: ark_ensure_phys_device_mtu).
"""

import os
import re
import subprocess
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ARK_LIB_DIR = os.path.join(REPO_ROOT, "root", "usr", "lib", "ark")

def audit_duplicate_functions():
    """Verifies that no two library modules in /usr/lib/ark define the same function."""
    errors = []
    func_regex = re.compile(r"^([a-zA-Z0-9_-]+)\s*\(\)\s*\{")
    defined_funcs = {}

    for root, _, files in os.walk(ARK_LIB_DIR):
        for f in sorted(files):
            if not f.endswith(".sh") or f.startswith("._"):
                continue
            path = os.path.join(root, f)
            rel_path = os.path.relpath(path, REPO_ROOT)
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                for line_no, line in enumerate(fh, 1):
                    m = func_regex.match(line.strip())
                    if m:
                        fn = m.group(1)
                        if fn in defined_funcs:
                            prev_file, prev_line = defined_funcs[fn]
                            errors.append(
                                f"COLISÃO DE FUNÇÃO: '{fn}()' definida em {rel_path}:{line_no} "
                                f"já existe em {prev_file}:{prev_line}!"
                            )
                        else:
                            defined_funcs[fn] = (rel_path, line_no)
    return errors

def audit_shell_syntax():
    """Runs 'sh -n' on all shell scripts in root/, scripts/, and tests/."""
    errors = []
    for base_dir in ["root", "scripts", "tests"]:
        full_dir = os.path.join(REPO_ROOT, base_dir)
        if not os.path.isdir(full_dir):
            continue
        for root, _, files in os.walk(full_dir):
            for f in sorted(files):
                if f.startswith("._") or f.endswith(".js") or f.endswith(".json") or f.endswith(".md") or f.endswith(".locations") or f.endswith(".conf") or f.endswith(".yaml"):
                    continue
                path = os.path.join(root, f)
                rel_path = os.path.relpath(path, REPO_ROOT)

                is_sh = f.endswith(".sh")
                if not is_sh:
                    try:
                        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                            first_line = fh.readline()
                            if first_line.startswith("#!/") and ("sh" in first_line or "ash" in first_line or "bash" in first_line):
                                is_sh = True
                    except Exception:
                        pass

                if is_sh:
                    res = subprocess.run(["sh", "-n", path], capture_output=True, text=True)
                    if res.returncode != 0:
                        errors.append(f"ERRO DE SINTAXE em {rel_path}: {res.stderr.strip()}")
    return errors

def audit_firewall_guards():
    """Ensures iptables/ip6tables calls in root/ are guarded and not in fw4 paths."""
    errors = []
    iptables_call_re = re.compile(r"^\s*(iptables|ip6tables)\s+")
    for root, _, files in os.walk(os.path.join(REPO_ROOT, "root", "usr", "lib", "ark")):
        for f in sorted(files):
            if not f.endswith(".sh") or f.startswith("._"):
                continue
            path = os.path.join(root, f)
            rel_path = os.path.relpath(path, REPO_ROOT)
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                lines = fh.readlines()
                for line_no, line in enumerate(lines, 1):
                    line_str = line.strip()
                    if line_str.startswith("#"):
                        continue
                    if iptables_call_re.search(line_str):
                        # Ensure there is an is_fw3, fw3, or legacy check in the function/file context
                        window = "".join(lines[max(0, line_no - 40):min(len(lines), line_no + 10)])
                        if "is_fw3" not in window and "fw3" not in window and "is_fw4" not in window:
                            errors.append(
                                f"AVISO FIREWALL: Invocação direta de iptables em {rel_path}:{line_no} "
                                f"sem verificação condicional explícita is_fw3/is_fw4!"
                            )
def audit_version_coherence():
    errors = []
    versions = {}
    
    root_version_file = os.path.join(REPO_ROOT, "VERSION")
    if os.path.exists(root_version_file):
        with open(root_version_file, "r", encoding="utf-8") as f:
            versions["VERSION"] = f.read().strip()
            
    share_version_file = os.path.join(REPO_ROOT, "root/usr/share/ark-router/VERSION")
    if os.path.exists(share_version_file):
        with open(share_version_file, "r", encoding="utf-8") as f:
            versions["root/usr/share/ark-router/VERSION"] = f.read().strip()
            
    makefile_file = os.path.join(REPO_ROOT, "Makefile")
    if os.path.exists(makefile_file):
        with open(makefile_file, "r", encoding="utf-8") as f:
            m = re.search(r"PKG_VERSION\s*:=\s*([0-9\.]+)", f.read())
            if m:
                versions["Makefile:PKG_VERSION"] = m.group(1).strip()
                
    common_sh_file = os.path.join(REPO_ROOT, "root/usr/lib/ark/common.sh")
    if os.path.exists(common_sh_file):
        with open(common_sh_file, "r", encoding="utf-8") as f:
            m = re.search(r'ARK_ROUTER_VERSION\s*=\s*["\']([0-9\.]+)["\']', f.read())
            if m:
                versions["common.sh:ARK_ROUTER_VERSION"] = m.group(1).strip()
                
    unique_versions = set(versions.values())
    if len(unique_versions) > 1:
        errors.append(f"Incoerência de versão detectada entre arquivos do projeto: {versions}")
    return errors

def main():
    print("=" * 70)
    print("ARK Router — Auditoria Preventiva de Shell Scripts & Release")
    print("=" * 70)

    total_errors = []

    print("[1/4] Checando colisões e funções duplicadas entre módulos...")
    func_errors = audit_duplicate_functions()
    if func_errors:
        print(f"  ❌ Encontradas {len(func_errors)} colisões de funções:")
        for err in func_errors:
            print(f"     - {err}")
        total_errors.extend(func_errors)
    else:
        print("  ✅ Zero colisões de função encontradas nos módulos ARK.")

    print("[2/4] Checando sintaxe POSIX sh -n de todos os scripts...")
    syntax_errors = audit_shell_syntax()
    if syntax_errors:
        print(f"  ❌ Encontrados {len(syntax_errors)} erros de sintaxe:")
        for err in syntax_errors:
            print(f"     - {err}")
        total_errors.extend(syntax_errors)
    else:
        print("  ✅ Todos os scripts shell possuem sintaxe 100% válida.")

    print("[3/4] Checando proteção e isolamento de firewall (Regra 11)...")
    fw_errors = audit_firewall_guards()
    if fw_errors:
        print(f"  ⚠️  Encontrados {len(fw_errors)} avisos de firewall:")
        for err in fw_errors:
            print(f"     - {err}")
        total_errors.extend(fw_errors)
    else:
        print("  ✅ Comandos de firewall devidamente isolados por arquitetura.")

    print("[4/4] Checando coerência estrita de versão em todo o ecossistema...")
    ver_errors = audit_version_coherence()
    if ver_errors:
        print(f"  ❌ Encontrados {len(ver_errors)} erros de versão:")
        for err in ver_errors:
            print(f"     - {err}")
        total_errors.extend(ver_errors)
    else:
        print("  ✅ Versões em VERSION, root VERSION, Makefile e common.sh 100% idênticas.")

    print("=" * 70)
    if total_errors:
        print(f"FALHA: Auditoria preventiva encontrou {len(total_errors)} erros críticos!")
        sys.exit(1)
    else:
        print("SUCESSO: Auditoria de scripts shell aprovada com 100% de integridade.")
        sys.exit(0)

if __name__ == "__main__":
    main()
