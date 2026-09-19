#!/usr/bin/env python3
"""
ARK Router Asset Minification and Validation Pipeline
Produces minified, production-grade assets from readable development sources.
"""

import os
import sys
import subprocess
import shutil

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BUILD_DIR = os.path.join(REPO_DIR, "dist", "minified")

TARGETS = [
    {
        "src": os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.js"),
        "rel": os.path.join("www", "luci-static", "resources", "view", "equipe-dashboard", "overview.js"),
        "type": "js"
    },
    {
        "src": os.path.join(REPO_DIR, "root", "www", "luci-static", "ark", "ark-theme.js"),
        "rel": os.path.join("www", "luci-static", "ark", "ark-theme.js"),
        "type": "js"
    },
    {
        "src": os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.css"),
        "rel": os.path.join("www", "luci-static", "resources", "view", "equipe-dashboard", "overview.css"),
        "type": "css"
    },
    {
        "src": os.path.join(REPO_DIR, "root", "www", "luci-static", "ark", "cascade.css"),
        "rel": os.path.join("www", "luci-static", "ark", "cascade.css"),
        "type": "css"
    }
]

def find_executable(names):
    for n in names:
        p = shutil.which(n)
        if p:
            return p
    return None

def resolve_tools():
    node_cmd = find_executable(["node", "node.exe", "/mnt/c/Program Files/nodejs/node.exe"])
    npx_cmd = find_executable(["npx", "npx.cmd", "/mnt/c/Program Files/nodejs/npx.cmd"])
    
    if not npx_cmd and shutil.which("cmd.exe"):
        npx_cmd = "cmd.exe"
        if not node_cmd:
            node_cmd = "node.exe"

    if not node_cmd or not npx_cmd:
        print("ERRO: Node.js e npx são obrigatórios para minificação.", file=sys.stderr)
        sys.exit(1)
        
    is_win_tool = (sys.platform == "win32") or npx_cmd.endswith(".cmd") or npx_cmd.endswith(".exe") or "/mnt/c/" in npx_cmd or (node_cmd and ("/mnt/c/" in node_cmd or node_cmd.endswith(".exe")))
    return node_cmd, npx_cmd, is_win_tool

def to_tool_path(p, is_win_tool):
    if is_win_tool and sys.platform != "win32":
        res = subprocess.run(["wslpath", "-w", p], capture_output=True, text=True, errors="replace")
        if res.returncode == 0:
            return res.stdout.strip()
    return p

def build_minified():
    # 1. Build frontend bundle from src/
    bundler_script = os.path.join(SCRIPT_DIR, "build_frontend_bundle.py")
    if os.path.isfile(bundler_script):
        res = subprocess.run([sys.executable, bundler_script], capture_output=True, text=True, errors="replace")
        if res.returncode != 0:
            print(f"ERRO ao gerar bundle frontend:\n{res.stderr}", file=sys.stderr)
            sys.exit(res.returncode)

    node_cmd, npx_cmd, is_win_tool = resolve_tools()
    os.makedirs(BUILD_DIR, exist_ok=True)
    results = {}

    print("=" * 60)
    print("ARK ROUTER: MINIFICANDO ASSETS DE FRONTEND")
    print("=" * 60)

    for item in TARGETS:
        src = item["src"]
        if not os.path.isfile(src):
            print(f"AVISO: Arquivo de origem não encontrado: {src}")
            continue

        out_path = os.path.join(BUILD_DIR, item["rel"])
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        orig_size = os.path.getsize(src)

        tool_src = to_tool_path(src, is_win_tool)
        tool_out = to_tool_path(out_path, is_win_tool)

        # Execute esbuild minification
        if npx_cmd == "cmd.exe":
            cmd = ["cmd.exe", "/c", "npx", "-y", "esbuild", tool_src, "--minify", f"--outfile={tool_out}"]
        else:
            cmd = [npx_cmd, "-y", "esbuild", tool_src, "--minify", f"--outfile={tool_out}"]
            
        if item["type"] == "js":
            cmd.extend(["--legal-comments=none"])

        res = subprocess.run(cmd, capture_output=True, text=True, errors="replace", shell=(sys.platform == "win32"))
        if res.returncode != 0:
            print(f"ERRO ao minificar {os.path.basename(src)}:\n{res.stderr}", file=sys.stderr)
            sys.exit(res.returncode)

        # Node syntax check for JS
        if item["type"] == "js":
            check_path = to_tool_path(out_path, is_win_tool)
            node_check = subprocess.run([node_cmd, "--check", check_path], capture_output=True, text=True, errors="replace")
            if node_check.returncode != 0:
                print(f"ERRO de sintaxe detectado após minificar {os.path.basename(src)}:\n{node_check.stderr}", file=sys.stderr)
                sys.exit(node_check.returncode)

        mini_size = os.path.getsize(out_path)
        saved_bytes = orig_size - mini_size
        pct = (saved_bytes / orig_size) * 100 if orig_size > 0 else 0

        print(f"[OK] {os.path.basename(src):<22} | Original: {orig_size/1024:>6.1f} KB -> Minificado: {mini_size/1024:>6.1f} KB (-{pct:.1f}%)")
        results[src] = out_path

    print("=" * 60)
    print(f"Minificação concluída com sucesso em: {BUILD_DIR}")
    print("=" * 60)
    return results

if __name__ == "__main__":
    build_minified()
