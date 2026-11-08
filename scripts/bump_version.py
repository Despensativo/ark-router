#!/usr/bin/env python3
"""
ARK Router — Incremento Automático de Versão SemVer & Sincronização de CHANGELOG
Soma automaticamente o patch version a cada nova compilação (ex: 2.2.1 -> 2.2.2 -> 2.2.3),
sincroniza todos os arquivos do ecossistema e atualiza o CHANGELOG.md.
"""
import os
import sys
import re
import subprocess
from datetime import datetime

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
WORKSPACE_DIR = os.path.abspath(os.path.join(REPO_DIR, ".."))

def get_current_version() -> str:
    ver_file = os.path.join(REPO_DIR, "VERSION")
    if not os.path.isfile(ver_file):
        raise FileNotFoundError(f"Arquivo de versão não encontrado: {ver_file}")
    with open(ver_file, "r", encoding="utf-8") as f:
        return f.read().strip()

def compute_next_patch_version(ver_str: str) -> str:
    # Remove qualquer sufixo prévio como -rX se existir
    base_ver = ver_str.split("-")[0].strip()
    parts = base_ver.split(".")
    if len(parts) != 3 or not all(p.isdigit() for p in parts):
        raise ValueError(f"Formato de versão inválido (esperado MAJOR.MINOR.PATCH): {ver_str}")
    major, minor, patch = int(parts[0]), int(parts[1]), int(parts[2])
    return f"{major}.{minor}.{patch + 1}"

def update_version_in_all_files(new_version: str, old_version: str, changelog_note: str = None) -> list:
    updated_files = []
    today = datetime.now().strftime("%d/%m/%Y")

    # 1. VERSION
    ver_file = os.path.join(REPO_DIR, "VERSION")
    with open(ver_file, "w", encoding="utf-8") as f:
        f.write(f"{new_version}\n")
    updated_files.append("VERSION")

    # 2. root/usr/share/ark-router/VERSION
    share_ver = os.path.join(REPO_DIR, "root", "usr", "share", "ark-router", "VERSION")
    os.makedirs(os.path.dirname(share_ver), exist_ok=True)
    with open(share_ver, "w", encoding="utf-8") as f:
        f.write(f"{new_version}\n")
    updated_files.append("root/usr/share/ark-router/VERSION")

    # 3. Makefile (PKG_VERSION e reset PKG_RELEASE:=1)
    makefile = os.path.join(REPO_DIR, "Makefile")
    if os.path.exists(makefile):
        with open(makefile, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"PKG_VERSION\s*:=\s*[0-9\.]+", f"PKG_VERSION:={new_version}", content)
        content = re.sub(r"PKG_RELEASE\s*:=\s*[0-9]+", "PKG_RELEASE:=1", content)
        with open(makefile, "w", encoding="utf-8") as f:
            f.write(content)
        updated_files.append("Makefile")

    # 4. root/usr/lib/ark/common.sh
    common_sh = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "common.sh")
    if os.path.exists(common_sh):
        with open(common_sh, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r'ARK_ROUTER_VERSION\s*=\s*["\'][^"\']+["\']', f'ARK_ROUTER_VERSION="{new_version}"', content)
        with open(common_sh, "w", encoding="utf-8") as f:
            f.write(content)
        updated_files.append("root/usr/lib/ark/common.sh")

    # 5. src/core/header.js
    header_js = os.path.join(REPO_DIR, "src", "core", "header.js")
    if os.path.exists(header_js):
        with open(header_js, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"const ARK_BUILD_VERSION = '[^']+';", f"const ARK_BUILD_VERSION = '{new_version}';", content)
        with open(header_js, "w", encoding="utf-8") as f:
            f.write(content)
        updated_files.append("src/core/header.js")

    # 5b. src/core/i18n/loader.js
    i18n_loader = os.path.join(REPO_DIR, "src", "core", "i18n", "loader.js")
    if os.path.exists(i18n_loader):
        with open(i18n_loader, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"window\.ARK_BUILD_VERSION\s*\|\|\s*'[^']+'", f"window.ARK_BUILD_VERSION || '{new_version}'", content)
        with open(i18n_loader, "w", encoding="utf-8") as f:
            f.write(content)
        updated_files.append("src/core/i18n/loader.js")

    # 5c. root/usr/share/ucode/luci/template/themes/ark/header.ut & header.htm
    header_ut = os.path.join(REPO_DIR, "root", "usr", "share", "ucode", "luci", "template", "themes", "ark", "header.ut")
    if os.path.exists(header_ut):
        with open(header_ut, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"(VERSION'\)\s*\?\?\s*')[^']+(\')", rf"\g<1>{new_version}\2", content)
        with open(header_ut, "w", encoding="utf-8") as f:
            f.write(content)
        updated_files.append("root/usr/share/ucode/luci/template/themes/ark/header.ut")

    header_htm = os.path.join(REPO_DIR, "root", "usr", "lib", "lua", "luci", "view", "themes", "ark", "header.htm")
    if os.path.exists(header_htm):
        with open(header_htm, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r'(VERSION"\)\s*or\s*")[^"]+(")', rf'\g<1>{new_version}\2', content)
        with open(header_htm, "w", encoding="utf-8") as f:
            f.write(content)
        updated_files.append("root/usr/lib/lua/luci/view/themes/ark/header.htm")

    # 6. tests/feature_contracts.yaml (linha 2: version: X.Y.Z)
    contracts_file = os.path.join(REPO_DIR, "tests", "feature_contracts.yaml")
    if os.path.exists(contracts_file):
        with open(contracts_file, "r", encoding="utf-8") as f:
            lines = f.readlines()
        if len(lines) > 1 and lines[1].strip().startswith("version:"):
            lines[1] = f"  version: {new_version}\n"
            with open(contracts_file, "w", encoding="utf-8") as f:
                f.writelines(lines)
            updated_files.append("tests/feature_contracts.yaml")

    # 7. CHANGELOG.md (insere ## {new_version} no topo)
    changelog_file = os.path.join(REPO_DIR, "CHANGELOG.md")
    if os.path.exists(changelog_file):
        with open(changelog_file, "r", encoding="utf-8") as f:
            c_content = f.read()
        if f"## {new_version}" not in c_content:
            note_text = changelog_note or "Compilação e atualização incremental de pacote."
            new_entry = f"## {new_version}\n\n- **Atualização Incremental v{new_version} ({today})**:\n  - {note_text}\n\n"
            m = re.search(r"^# Changelog\s*\n+", c_content)
            if m:
                idx = m.end()
                c_content = c_content[:idx] + new_entry + c_content[idx:]
            else:
                c_content = new_entry + c_content
            with open(changelog_file, "w", encoding="utf-8") as f:
                f.write(c_content)
            updated_files.append("CHANGELOG.md")

    # 8. AGENTS.md (root e repo)
    for agents_path in [
        os.path.join(WORKSPACE_DIR, "AGENTS.md"),
        os.path.join(REPO_DIR, "AGENTS.md"),
    ]:
        if os.path.exists(agents_path):
            with open(agents_path, "r", encoding="utf-8") as f:
                content = f.read()
            content = content.replace(f"versão ativa `{old_version}`", f"versão ativa `{new_version}`")
            content = content.replace(f"versão ativa {old_version}", f"versão ativa {new_version}")
            content = content.replace(f"`PKG_VERSION:={old_version}`", f"`PKG_VERSION:={new_version}`")
            with open(agents_path, "w", encoding="utf-8") as f:
                f.write(content)
            updated_files.append(os.path.relpath(agents_path, WORKSPACE_DIR))

    # 9. docs/README.md
    docs_readme = os.path.join(REPO_DIR, "docs", "README.md")
    if os.path.exists(docs_readme):
        with open(docs_readme, "r", encoding="utf-8") as f:
            content = f.read()
        content = re.sub(r"> \*\*Versão Homologada\*\*: \[`[^`]+`\]", f"> **Versão Homologada**: [`{new_version}`]", content)
        with open(docs_readme, "w", encoding="utf-8") as f:
            f.write(content)
        updated_files.append("docs/README.md")

    return updated_files

def bump_and_sync(changelog_note: str = None) -> tuple:
    old_version = get_current_version()
    new_version = compute_next_patch_version(old_version)
    updated_files = update_version_in_all_files(new_version, old_version, changelog_note)

    # Recompila bundle frontend para atualizar ARK_BUILD_VERSION no JS em overview.js
    py_bin = sys.executable
    bundle_script = os.path.join(REPO_DIR, "scripts", "build_frontend_bundle.py")
    if os.path.exists(bundle_script):
        subprocess.run([py_bin, bundle_script], check=True, capture_output=True)

    # Minifica assets para dist/minified
    minify_script = os.path.join(REPO_DIR, "scripts", "build_minified_assets.py")
    if os.path.exists(minify_script):
        subprocess.run([py_bin, minify_script], check=True, capture_output=True)

    # Regenera CODE_MAP.md
    codemap_script = os.path.join(REPO_DIR, "scripts", "generate_code_map.py")
    if os.path.exists(codemap_script):
        subprocess.run([py_bin, codemap_script], check=True, capture_output=True)

    return new_version, old_version, updated_files

def main():
    if "--current" in sys.argv:
        print(get_current_version())
        return

    note = None
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if args:
        note = " ".join(args)

    new_ver, old_ver, files = bump_and_sync(note)
    print(f"Versão promovida com sucesso: v{old_ver} -> v{new_ver}")
    print(f"Arquivos atualizados em sincronia ({len(files)}):")
    for f in files:
        print(f"  ✓ {f}")

if __name__ == "__main__":
    main()
