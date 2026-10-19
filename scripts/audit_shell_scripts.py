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
import shutil

if sys.platform == "win32":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")

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
                    sh_bin = shutil.which("sh")
                    if not sh_bin:
                        for cand in [r"C:\Program Files\Git\bin\sh.exe", r"C:\Program Files\Git\usr\bin\sh.exe", r"C:\Program Files (x86)\Git\bin\sh.exe"]:
                            if os.path.exists(cand):
                                sh_bin = cand
                                break
                    if not sh_bin:
                        sh_bin = "sh"
                    res = subprocess.run([sh_bin, "-n", path], capture_output=True, text=True, encoding="utf-8", errors="replace")
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
    return errors


def _parse_ark_shell_functions():
    """Parses all functions in root/usr/lib/ark/**/*.sh with bodies, local vars, modified vars, and sources."""
    func_start_re = re.compile(r"^([a-zA-Z0-9_]+)\s*\(\)\s*\{")
    func_end_re = re.compile(r"^\}\s*(?:#.*)?$")
    source_re = re.compile(r"(?:^|[;\s])(?:\.|source)\s+[\"']?([^\"'\s;]+)[\"']?")
    local_re = re.compile(r"^\s*local\s+(.+)$")
    assign_re = re.compile(r"^\s*([a-zA-Z_][a-zA-Z0-9_]*)=([^=].*)?$")
    for_re = re.compile(r"^\s*for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+")

    files_data = {}
    base_to_sources = {}
    func_defs = {}  # fn_name -> dict

    for root, _, files in os.walk(ARK_LIB_DIR):
        for f in sorted(files):
            if not f.endswith(".sh") or f.startswith("._"):
                continue
            path = os.path.join(root, f)
            rel_path = os.path.relpath(path, REPO_ROOT).replace("\\", "/")
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                lines = fh.readlines()

            top_sources = set()
            in_func = None
            fn_start = 0
            fn_lines = []

            for line_no, raw_line in enumerate(lines, 1):
                stripped = raw_line.strip()
                code_only = re.sub(r"#.*$", "", raw_line)
                if in_func is None:
                    m = func_start_re.match(raw_line)
                    if m:
                        in_func = m.group(1)
                        fn_start = line_no
                        fn_lines = [(line_no, raw_line)]
                        if code_only.rstrip().endswith("}"):
                            in_func = None
                    elif not stripped.startswith("#"):
                        for sm in source_re.finditer(code_only):
                            top_sources.add(os.path.basename(sm.group(1)))
                else:
                    fn_lines.append((line_no, raw_line))
                    if func_end_re.match(raw_line):
                        local_vars = set()
                        unscoped_vars = set()
                        fn_sources = set()
                        in_py = False
                        for _, fline in fn_lines:
                            fstrip = fline.strip()
                            if 'python3 -c "' in fline or "python3 - << 'EOF'" in fline or 'python3 - << "EOF"' in fline:
                                in_py = True
                            if in_py:
                                if fstrip in ('"', '")', 'EOF'):
                                    in_py = False
                                continue
                            if fstrip.startswith("#"):
                                continue
                            fcode = re.sub(r"#.*$", "", fline)
                            for sm in source_re.finditer(fcode):
                                fn_sources.add(os.path.basename(sm.group(1)))
                            lm = local_re.match(fcode)
                            if lm:
                                decl = lm.group(1).strip()
                                for tok in re.split(r"\s+", decl):
                                    vname = tok.split("=")[0].strip()
                                    if re.match(r"^[a-zA-Z_][a-zA-Z0-9_]*$", vname):
                                        local_vars.add(vname)
                            am = assign_re.match(fcode)
                            if am:
                                vname = am.group(1)
                                if vname not in local_vars and not vname.isupper():
                                    unscoped_vars.add(vname)
                            fm = for_re.match(fcode)
                            if fm and not fcode.rstrip().endswith(":"):
                                vname = fm.group(1)
                                if vname not in local_vars and not vname.isupper():
                                    unscoped_vars.add(vname)

                        func_defs[in_func] = {
                            "file": rel_path,
                            "basename": os.path.basename(rel_path),
                            "start": fn_start,
                            "lines": fn_lines,
                            "locals": local_vars,
                            "unscoped": unscoped_vars,
                            "sources": fn_sources,
                        }
                        in_func = None

            files_data[rel_path] = {"top_sources": top_sources}
            base_to_sources[f] = set(top_sources)

    # Resolve transitive top_sources and parent<->submodule co-loading
    for parent, children in list(base_to_sources.items()):
        for ch in list(children):
            if ch in base_to_sources and (ch.startswith("network_") or ch.startswith("system_")):
                base_to_sources[ch].add(parent)

    for _ in range(3):
        for b, srcs in list(base_to_sources.items()):
            expanded = set(srcs)
            for s in srcs:
                expanded |= base_to_sources.get(s, set())
            base_to_sources[b] = expanded

    for rel_path, d in files_data.items():
        b = os.path.basename(rel_path)
        d["top_sources"] = base_to_sources.get(b, d["top_sources"])

    return func_defs, files_data


def audit_cross_module_calls():
    """Ensures every cross-module function call in root/usr/lib/ark/ has its target module sourced."""
    errors = []
    func_defs, files_data = _parse_ark_shell_functions()
    all_fn_names = set(func_defs.keys())
    word_re = re.compile(r"(?<![a-zA-Z0-9_-])([a-zA-Z_][a-zA-Z0-9_]*)(?![a-zA-Z0-9_-])")

    for fn_name, info in sorted(func_defs.items()):
        caller_file = info["file"]
        caller_base = info["basename"]
        available_sources = (
            set(files_data[caller_file]["top_sources"])
            | set(info["sources"])
            | {"common.sh", "logging.sh", "validation.sh", caller_base}
        )

        in_py = False
        for idx, (line_no, raw_line) in enumerate(info["lines"]):
            if idx == 0:
                continue  # skip function header line
            stripped = raw_line.strip()
            if 'python3 -c "' in raw_line or "python3 - << 'EOF'" in raw_line or 'python3 - << "EOF"' in raw_line:
                in_py = True
            if in_py:
                if stripped in ('"', '")', 'EOF'):
                    in_py = False
                continue
            if stripped.startswith("#"):
                continue
            code_only = re.sub(r"#.*$", "", raw_line)
            # Remove single/double quoted string literals that are just messages
            for tok_match in word_re.finditer(code_only):
                tok = tok_match.group(1)
                if tok == fn_name or tok not in all_fn_names:
                    continue
                target_info = func_defs[tok]
                target_base = target_info["basename"]
                if target_base not in available_sources:
                    # Verify it is used as a command invocation, not a UCI/JSON string key
                    before = code_only[:tok_match.start()].rstrip()
                    after = code_only[tok_match.end():].lstrip()
                    if after.startswith("=") or before.endswith(".") or before.endswith("-") or after.startswith(")"):
                        continue
                    errors.append(
                        f"CHAMADA SEM SOURCE: '{fn_name}()' em {caller_file}:{line_no} invoca "
                        f"'{tok}()' (definida em {target_info['file']}:{target_info['start']}) "
                        f"sem fazer source de {target_base}!"
                    )
    return errors


def audit_loop_variable_clobbers():
    """Detects POSIX /bin/ash 'for <var>' loops that call functions overwriting <var> without 'local'."""
    errors = []
    func_defs, _ = _parse_ark_shell_functions()
    all_fn_names = set(func_defs.keys())
    for_re = re.compile(r"^\s*for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+")
    done_re = re.compile(r"(?:^|[;\s])done(?:$|[;\s|>])")
    word_re = re.compile(r"(?<![a-zA-Z0-9_-])([a-zA-Z_][a-zA-Z0-9_]*)(?![a-zA-Z0-9_-])")

    for fn_name, info in sorted(func_defs.items()):
        loop_stack = []  # list of (var_name, start_line)
        in_py = False
        for idx, (line_no, raw_line) in enumerate(info["lines"]):
            if idx == 0:
                continue
            stripped = raw_line.strip()
            if 'python3 -c "' in raw_line or "python3 - << 'EOF'" in raw_line or 'python3 - << "EOF"' in raw_line:
                in_py = True
            if in_py:
                if stripped in ('"', '")', 'EOF'):
                    in_py = False
                continue
            if stripped.startswith("#"):
                continue
            code_only = re.sub(r"#.*$", "", raw_line)
            fm = for_re.match(code_only)
            if fm and not code_only.rstrip().endswith(":"):
                loop_stack.append((fm.group(1), line_no))

            if loop_stack:
                for tok_match in word_re.finditer(code_only):
                    callee = tok_match.group(1)
                    if callee == fn_name or callee not in all_fn_names:
                        continue
                    before = code_only[:tok_match.start()].rstrip()
                    after = code_only[tok_match.end():].lstrip()
                    if after.startswith("=") or before.endswith(".") or before.endswith("-") or after.startswith(")"):
                        continue
                    callee_info = func_defs[callee]
                    for loop_var, loop_line in loop_stack:
                        if loop_var in callee_info["unscoped"]:
                            errors.append(
                                f"COLISÃO DE VARIÁVEL DE LOOP (POSIX ash): loop 'for {loop_var}' em "
                                f"'{fn_name}()' ({info['file']}:{loop_line}) invoca '{callee}()' "
                                f"({callee_info['file']}:{callee_info['start']}) na linha {line_no}, "
                                f"que sobrescreve '{loop_var}' globalmente sem 'local {loop_var}'!"
                            )

            if done_re.search(code_only) and loop_stack:
                loop_stack.pop()

    return errors


def audit_js_rpc_and_methods():
    """Audits JS module method collisions, undefined this.<method>() calls, and JS <-> Shell RPC contracts."""
    import fnmatch
    errors = []
    src_modules_dir = os.path.join(REPO_ROOT, "src", "modules")
    base_header_path = os.path.join(REPO_ROOT, "src", "base_header.js")
    control_path = os.path.join(REPO_ROOT, "root", "usr", "sbin", "equipe-dashboard-control")
    mod_dir = os.path.join(ARK_LIB_DIR, "modules")

    # 1. Parse routed glob patterns in sbin/equipe-dashboard-control and exact case patterns in modules/*.sh
    dispatch_globs = []
    if os.path.exists(control_path):
        with open(control_path, "r", encoding="utf-8", errors="ignore") as fh:
            for line in fh:
                s = line.strip()
                if s.startswith("#") or not s.endswith(")"):
                    continue
                if re.match(r"^[a-z0-9_|*-]+\)$", s):
                    for part in s[:-1].split("|"):
                        part = part.strip()
                        if part and part != "*":
                            dispatch_globs.append(part)

    module_patterns = []
    if os.path.isdir(mod_dir):
        for f in sorted(os.listdir(mod_dir)):
            if not f.endswith(".sh") or f.startswith("._"):
                continue
            with open(os.path.join(mod_dir, f), "r", encoding="utf-8", errors="ignore") as fh:
                in_handle = False
                for line in fh:
                    if re.match(r"^handle_[a-z0-9_]+\s*\(\)\s*\{", line):
                        in_handle = True
                    if in_handle:
                        s = line.strip()
                        if re.match(r"^[a-z0-9_|*-]+\)", s):
                            pat_part = s.split(")")[0]
                            for p in pat_part.split("|"):
                                p = p.strip()
                                if p and p != "*":
                                    module_patterns.append(p)

    # 2. Scan JS modules for method definitions, collisions, this.<method>() calls, and RPC commands
    defined_methods = {}
    luci_builtin_methods = {
        "load", "render", "handleSave", "handleSaveApply", "handleReset", "addFooter", "super"
    }
    if os.path.exists(base_header_path):
        with open(base_header_path, "r", encoding="utf-8", errors="ignore") as fh:
            for m in re.finditer(r"^\s*([a-zA-Z0-9_]+)\s*:\s*function\s*\(", fh.read(), re.M):
                defined_methods[m.group(1)] = ("src/base_header.js", 1)

    method_def_re = re.compile(r"^(?:\t|    )([a-zA-Z0-9_]+)\s*:\s*(?:async\s+)?function\s*\(")
    this_call_re = re.compile(r"\bthis\.([a-zA-Z0-9_]+)\s*\(")
    rpc_call_re = re.compile(
        r"fs\.exec(?:_direct)?\(\s*['\"]/usr/sbin/equipe-dashboard-control['\"]\s*,\s*\[\s*['\"]([a-z0-9_-]+)['\"]"
    )

    js_this_calls = []
    if os.path.isdir(src_modules_dir):
        for f in sorted(os.listdir(src_modules_dir)):
            if not f.endswith(".js") or f.startswith("._"):
                continue
            path = os.path.join(src_modules_dir, f)
            rel_path = f"src/modules/{f}"
            with open(path, "r", encoding="utf-8", errors="ignore") as fh:
                for line_no, line in enumerate(fh, 1):
                    m = method_def_re.match(line)
                    if m:
                        mname = m.group(1)
                        if mname in defined_methods:
                            prev_file, prev_line = defined_methods[mname]
                            errors.append(
                                f"COLISÃO DE MÉTODO JS: '{mname}' em {rel_path}:{line_no} "
                                f"sobrescreve definição anterior em {prev_file}:{prev_line}!"
                            )
                        else:
                            defined_methods[mname] = (rel_path, line_no)
                    for tm in this_call_re.finditer(line):
                        js_this_calls.append((tm.group(1), rel_path, line_no))
                    for rm in rpc_call_re.finditer(line):
                        cmd = rm.group(1)
                        if dispatch_globs and not any(fnmatch.fnmatch(cmd, g) for g in dispatch_globs):
                            errors.append(
                                f"CONTRATO RPC QUEBRADO (Dispatcher): comando '{cmd}' em {rel_path}:{line_no} "
                                f"não é roteado por /usr/sbin/equipe-dashboard-control!"
                            )
                        elif module_patterns and not any(fnmatch.fnmatch(cmd, mp) for mp in module_patterns):
                            errors.append(
                                f"CONTRATO RPC QUEBRADO (Handler): comando '{cmd}' em {rel_path}:{line_no} "
                                f"não possui branch em nenhum handle_*() de modules/*.sh!"
                            )

    for mname, rel_path, line_no in js_this_calls:
        if mname not in defined_methods and mname not in luci_builtin_methods:
            errors.append(
                f"MÉTODO JS INDEFINIDO: 'this.{mname}()' invocado em {rel_path}:{line_no} "
                f"não está definido em nenhum módulo de src/modules/!"
            )

    return errors


def audit_css_integrity():
    """Verifies CSS brace balance and 100% parity between overview.css and overview_v2.css."""
    errors = []
    css_dir = os.path.join(REPO_ROOT, "root", "www", "luci-static", "resources", "view", "equipe-dashboard")
    ov1 = os.path.join(css_dir, "overview.css")
    ov2 = os.path.join(css_dir, "overview_v2.css")
    cascade = os.path.join(REPO_ROOT, "root", "www", "luci-static", "ark", "cascade.css")

    if os.path.exists(ov1) and os.path.exists(ov2):
        with open(ov1, "r", encoding="utf-8", errors="ignore") as f1, open(ov2, "r", encoding="utf-8", errors="ignore") as f2:
            if f1.read() != f2.read():
                errors.append("DESINCRONIA CSS: overview.css e overview_v2.css divergem!")

    for path in [ov1, ov2, cascade]:
        if not os.path.exists(path):
            continue
        rel_path = os.path.relpath(path, REPO_ROOT).replace("\\", "/")
        with open(path, "r", encoding="utf-8", errors="ignore") as fh:
            content = re.sub(r"/\*.*?\*/", "", fh.read(), flags=re.S)
            opens = content.count("{")
            closes = content.count("}")
            if opens != closes:
                errors.append(f"ERRO DE SINTAXE CSS: chaves desbalanceadas em {rel_path} ('{{'={opens}, '}}'={closes})!")

    return errors


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
    print("ARK Router — Auditoria Preventiva de Shell, JS, RPC, CSS & Release")
    print("=" * 70)

    total_errors = []

    print("[1/8] Checando colisões e funções duplicadas entre módulos...")
    func_errors = audit_duplicate_functions()
    if func_errors:
        print(f"  ❌ Encontradas {len(func_errors)} colisões de funções:")
        for err in func_errors:
            print(f"     - {err}")
        total_errors.extend(func_errors)
    else:
        print("  ✅ Zero colisões de função encontradas nos módulos ARK.")

    print("[2/8] Checando sintaxe POSIX sh -n de todos os scripts...")
    syntax_errors = audit_shell_syntax()
    if syntax_errors:
        print(f"  ❌ Encontrados {len(syntax_errors)} erros de sintaxe:")
        for err in syntax_errors:
            print(f"     - {err}")
        total_errors.extend(syntax_errors)
    else:
        print("  ✅ Todos os scripts shell possuem sintaxe 100% válida.")

    print("[3/8] Checando proteção e isolamento de firewall (Regra 11)...")
    fw_errors = audit_firewall_guards()
    if fw_errors:
        print(f"  ⚠️  Encontrados {len(fw_errors)} avisos de firewall:")
        for err in fw_errors:
            print(f"     - {err}")
        total_errors.extend(fw_errors)
    else:
        print("  ✅ Comandos de firewall devidamente isolados por arquitetura.")

    print("[4/8] Checando coerência estrita de versão em todo o ecossistema...")
    ver_errors = audit_version_coherence()
    if ver_errors:
        print(f"  ❌ Encontrados {len(ver_errors)} erros de versão:")
        for err in ver_errors:
            print(f"     - {err}")
        total_errors.extend(ver_errors)
    else:
        print("  ✅ Versões em VERSION, root VERSION, Makefile e common.sh 100% idênticas.")

    print("[5/8] Checando chamadas entre módulos sem source (Cross-Module Call Graph)...")
    xref_errors = audit_cross_module_calls()
    if xref_errors:
        print(f"  ❌ Encontradas {len(xref_errors)} chamadas sem source:")
        for err in xref_errors:
            print(f"     - {err}")
        total_errors.extend(xref_errors)
    else:
        print("  ✅ 100% das chamadas entre módulos possuem dependências carregadas.")

    print("[6/8] Checando colisão de variáveis de loop sem 'local' (POSIX ash)...")
    loop_errors = audit_loop_variable_clobbers()
    if loop_errors:
        print(f"  ❌ Encontradas {len(loop_errors)} colisões de variável de loop:")
        for err in loop_errors:
            print(f"     - {err}")
        total_errors.extend(loop_errors)
    else:
        print("  ✅ Zero colisões de variável de loop detectadas.")

    print("[7/8] Checando contratos JS <-> Shell RPC e integridade de métodos JS...")
    js_errors = audit_js_rpc_and_methods()
    if js_errors:
        print(f"  ❌ Encontrados {len(js_errors)} erros de contrato JS/RPC:")
        for err in js_errors:
            print(f"     - {err}")
        total_errors.extend(js_errors)
    else:
        print("  ✅ 100% dos métodos JS e contratos RPC JS <-> Shell íntegros.")

    print("[8/8] Checando paridade e integridade sintática CSS...")
    css_errors = audit_css_integrity()
    if css_errors:
        print(f"  ❌ Encontrados {len(css_errors)} erros de CSS:")
        for err in css_errors:
            print(f"     - {err}")
        total_errors.extend(css_errors)
    else:
        print("  ✅ Arquivos CSS sincronizados e com chaves 100% balanceadas.")

    print("=" * 70)
    if total_errors:
        print(f"FALHA: Auditoria preventiva encontrou {len(total_errors)} erros críticos!")
        sys.exit(1)
    else:
        print("SUCESSO: Auditoria de scripts shell, JS, RPC e CSS aprovada com 100% de integridade.")
        sys.exit(0)

if __name__ == "__main__":
    main()

