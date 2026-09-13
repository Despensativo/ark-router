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
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, '..'))
BUILD_DIR = os.path.join(REPO_DIR, 'dist', 'minified')

TARGETS = [
    {
        'src': os.path.join(REPO_DIR, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.js'),
        'rel': os.path.join('www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.js'),
        'type': 'js'
    },
    {
        'src': os.path.join(REPO_DIR, 'root', 'www', 'luci-static', 'ark', 'ark-theme.js'),
        'rel': os.path.join('www', 'luci-static', 'ark', 'ark-theme.js'),
        'type': 'js'
    },
    {
        'src': os.path.join(REPO_DIR, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.css'),
        'rel': os.path.join('www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.css'),
        'type': 'css'
    },
    {
        'src': os.path.join(REPO_DIR, 'root', 'www', 'luci-static', 'ark', 'cascade.css'),
        'rel': os.path.join('www', 'luci-static', 'ark', 'cascade.css'),
        'type': 'css'
    }
]

def check_dependencies():
    for cmd in ['node', 'npx']:
        if not shutil.which(cmd):
            print(f"ERRO: Comando obrigatório '{cmd}' não encontrado no PATH.", file=sys.stderr)
            sys.exit(1)

def build_minified():
    check_dependencies()
    os.makedirs(BUILD_DIR, exist_ok=True)
    results = {}

    print("=" * 60)
    print("ARK ROUTER: MINIFICANDO ASSETS DE FRONTEND")
    print("=" * 60)

    for item in TARGETS:
        src = item['src']
        if not os.path.isfile(src):
            print(f"AVISO: Arquivo de origem não encontrado: {src}")
            continue

        out_path = os.path.join(BUILD_DIR, item['rel'])
        os.makedirs(os.path.dirname(out_path), exist_ok=True)

        orig_size = os.path.getsize(src)

        # Execute esbuild minification
        cmd = ['npx', '-y', 'esbuild', src, '--minify', f'--outfile={out_path}']
        if item['type'] == 'js':
            cmd.extend(['--legal-comments=none'])

        res = subprocess.run(cmd, capture_output=True, text=True, shell=sys.platform == 'win32')
        if res.returncode != 0:
            print(f"ERRO ao minificar {os.path.basename(src)}:\n{res.stderr}", file=sys.stderr)
            sys.exit(res.returncode)

        # Node syntax check for JS
        if item['type'] == 'js':
            node_check = subprocess.run(['node', '--check', out_path], capture_output=True, text=True)
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

if __name__ == '__main__':
    build_minified()
