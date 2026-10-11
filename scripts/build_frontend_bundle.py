#!/usr/bin/env python3
"""
ARK Router: Frontend Source Bundler
Assembles modular source files from src/ into the production LuCI view file
root/www/luci-static/resources/view/equipe-dashboard/overview.js
"""

import os
import sys
import argparse
import subprocess
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
SRC_DIR = os.path.join(REPO_DIR, "src")
OUTPUT_FILE = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.js")

CORE_FILES = [
    "header.js",
    "rpc.js",
    "i18n/loader.js",
    "constants.js",
    "notifications.js",
    "formatters.js",
    "helpers.js"
]

MODULE_FILES = [
    ("lifecycle.js", "lifecycleMethods"),
    ("devices.js", "devicesMethods"),
    ("network.js", "networkMethods"),
    ("wifi.js", "wifiMethods"),
    ("vpn.js", "vpnMethods"),
    ("adblock.js", "adblockMethods"),
    ("speedify.js", "speedifyMethods"),
    ("starlink.js", "starlinkMethods"),
    ("speedtest.js", "speedtestMethods"),
    ("system.js", "systemMethods"),
    ("render.js", "renderMethods"),
]

def find_node():
    for cmd in ["node", "node.exe", "/mnt/c/Program Files/nodejs/node.exe"]:
        if shutil.which(cmd):
            return cmd
    return None

def assemble_bundle(src_base_dir=None):
    parts = []
    base_dir = src_base_dir if src_base_dir else SRC_DIR
    
    version_file = os.path.join(REPO_DIR, "root", "usr", "share", "ark-router", "VERSION")
    version_val = "1.5.6"
    if os.path.isfile(version_file):
        with open(version_file, "r", encoding="utf-8") as vf:
            version_val = vf.read().strip()

    # 1. Append Core files
    for f_name in CORE_FILES:
        path = os.path.join(base_dir, "core", f_name)
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Missing core file: {path}")
        with open(path, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if f_name == "header.js":
                import re
                content = re.sub(r"const ARK_BUILD_VERSION = '[^']+';", f"const ARK_BUILD_VERSION = '{version_val}';", content)
            parts.append(content)

    # 2. Append Modules
    for f_name, _ in MODULE_FILES:
        path = os.path.join(base_dir, "modules", f_name)
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Missing module file: {path}")
        with open(path, "r", encoding="utf-8") as f:
            parts.append(f.read().strip())

    # 3. Assemble view.extend with Object.assign
    method_vars = [var_name for _, var_name in MODULE_FILES]
    extend_block = (
        "\nreturn view.extend(Object.assign(\n"
        "\t{},\n"
        + ",\n".join(f"\t{v}" for v in method_vars)
        + "\n));\n"
    )
    parts.append(extend_block)

    return "\n\n".join(parts) + "\n"

def validate_syntax(file_path):
    node = find_node()
    if not node:
        return True
    
    check_path = file_path
    if sys.platform != "win32" and node.endswith(".exe"):
        wslpath = subprocess.run(["wslpath", "-w", file_path], capture_output=True, text=True)
        if wslpath.returncode == 0:
            check_path = wslpath.stdout.strip()
            
    res = subprocess.run([node, "--check", check_path], capture_output=True, text=True)
    if res.returncode != 0:
        print(f"ERRO de sintaxe JavaScript em {file_path}:\n{res.stderr}", file=sys.stderr)
        return False
    return True

def build_i18n_assets(version_val):
    po_dir = os.path.join(REPO_DIR, "po")
    out_dir = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard")
    os.makedirs(out_dir, exist_ok=True)
    generated = []
    
    import json
    for lang in ["en", "es", "pt-br"]:
        src_p = os.path.join(po_dir, lang, "ark.po")
        dst_p = os.path.join(out_dir, f"i18n.{lang}.js")
        
        if os.path.isfile(src_p):
            with open(src_p, "r", encoding="utf-8") as sf:
                lines = sf.readlines()
                
            entries = {}
            current_id = None
            for line in lines:
                line = line.strip()
                if line.startswith('msgid "'):
                    current_id = line[7:-1].replace('\\"', '"').replace('\\n', '\n')
                elif line.startswith('msgstr "') and current_id is not None:
                    current_str = line[8:-1].replace('\\"', '"').replace('\\n', '\n')
                    if current_id and current_str: # ignore header
                        entries[current_id] = current_str
                    current_id = None
                    
            json_str = json.dumps(entries, ensure_ascii=False, indent=2)
            c = f"// ARK Router i18n {lang.upper()} Dictionary (Auto-generated from .po)\n(function(){{\n\tconst ARK_I18N_VERSION = '{version_val}';\n\tif (typeof window.ARK_BUILD_VERSION !== 'undefined' && window.ARK_BUILD_VERSION !== ARK_I18N_VERSION) {{\n\t\tconsole.warn('[ARK Router] i18n.{lang}.js version mismatch (' + ARK_I18N_VERSION + ' vs ' + window.ARK_BUILD_VERSION + ')');\n\t}}\n\twindow.ARK_I18N_{lang.upper().replace('-', '_')} = {json_str};\n}})();\n"
            
            with open(dst_p, "w", encoding="utf-8") as df:
                df.write(c)
            validate_syntax(dst_p)
            generated.append(dst_p)
    return generated

def main():
    parser = argparse.ArgumentParser(description="ARK Router Frontend Bundler")
    parser.add_argument("--v2", action="store_true", help="Build V2 staging bundle from src/v2/ into overview_v2.js")
    parser.add_argument("--check", action="store_true", help="Verify if target overview.js matches src/ bundle")
    parser.add_argument("--quiet", action="store_true", help="Quiet output")
    args = parser.parse_args()

    version_file = os.path.join(REPO_DIR, "root", "usr", "share", "ark-router", "VERSION")
    version_val = "1.5.6"
    if os.path.isfile(version_file):
        with open(version_file, "r", encoding="utf-8") as vf:
            version_val = vf.read().strip()

    target_src = os.path.join(SRC_DIR, "v2") if args.v2 else SRC_DIR
    target_output = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview_v2.js" if args.v2 else "overview.js")

    bundle_content = assemble_bundle(target_src)

    if args.check:
        if not os.path.isfile(target_output):
            print(f"ERRO: Arquivo alvo {target_output} não existe!", file=sys.stderr)
            sys.exit(1)
        with open(target_output, "r", encoding="utf-8") as f:
            current_content = f.read()
        if current_content != bundle_content:
            label = "root/.../overview_v2.js está desatualizado em relação a src/v2/!" if args.v2 else "root/.../overview.js está desatualizado em relação a src/!"
            print(f"ERRO: O arquivo {label}", file=sys.stderr)
            flag = " --v2" if args.v2 else ""
            print(f"Execute: python3 scripts/build_frontend_bundle.py{flag}", file=sys.stderr)
            sys.exit(1)
        if not args.quiet:
            prefix = "[OK] Bundle V2 (staging)" if args.v2 else "[OK] Bundle frontend"
            print(f"{prefix} em sincronia perfeita com as fontes!")
        return

    os.makedirs(os.path.dirname(target_output), exist_ok=True)
    with open(target_output, "w", encoding="utf-8") as f:
        f.write(bundle_content)

    if not args.v2:
        build_i18n_assets(version_val)

    if not validate_syntax(target_output):
        sys.exit(1)

    if not args.quiet:
        label = "Bundle V2 (Staging)" if args.v2 else "Bundle frontend oficial"
        print(f"[OK] {label} gerado com sucesso em: {target_output}")
        print(f"     Tamanho: {len(bundle_content)/1024:.1f} KB ({bundle_content.count(chr(10))} linhas)")

if __name__ == "__main__":
    main()
