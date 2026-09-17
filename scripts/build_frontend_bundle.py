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
    "i18n.js",
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

def assemble_bundle():
    parts = []
    
    # 1. Append Core files
    for f_name in CORE_FILES:
        path = os.path.join(SRC_DIR, "core", f_name)
        if not os.path.isfile(path):
            raise FileNotFoundError(f"Missing core file: {path}")
        with open(path, "r", encoding="utf-8") as f:
            parts.append(f.read().strip())

    # 2. Append Modules
    for f_name, _ in MODULE_FILES:
        path = os.path.join(SRC_DIR, "modules", f_name)
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

def main():
    parser = argparse.ArgumentParser(description="ARK Router Frontend Bundler")
    parser.add_argument("--check", action="store_true", help="Verify if target overview.js matches src/ bundle")
    parser.add_argument("--quiet", action="store_true", help="Quiet output")
    args = parser.parse_args()

    bundle_content = assemble_bundle()

    if args.check:
        if not os.path.isfile(OUTPUT_FILE):
            print(f"ERRO: Arquivo alvo {OUTPUT_FILE} não existe!", file=sys.stderr)
            sys.exit(1)
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            current_content = f.read()
        if current_content != bundle_content:
            print("ERRO: O arquivo root/.../overview.js está desatualizado em relação a src/!", file=sys.stderr)
            print("Execute: python3 scripts/build_frontend_bundle.py", file=sys.stderr)
            sys.exit(1)
        if not args.quiet:
            print("[OK] Bundle frontend em sincronia perfeita com src/!")
        return

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(bundle_content)

    if not validate_syntax(OUTPUT_FILE):
        sys.exit(1)

    if not args.quiet:
        print(f"[OK] Bundle frontend gerado com sucesso em: {OUTPUT_FILE}")
        print(f"     Tamanho: {len(bundle_content)/1024:.1f} KB ({bundle_content.count(chr(10))} linhas)")

if __name__ == "__main__":
    main()
