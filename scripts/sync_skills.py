#!/usr/bin/env python3
"""
sync_skills.py — Sincronizador de Skills Canônicas do ARK Router

Fonte de Verdade Canônica: GitHub/OpenWrt-Skills/skills/
Destinos Sincronizados:
  1. .agents/skills/ (Workspace root)
  2. GitHub/luci-app-ark-router/.agents/skills/

Uso:
  python scripts/sync_skills.py [--check]
"""

import sys
import shutil
import hashlib
from pathlib import Path

def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def main():
    check_only = "--check" in sys.argv
    # __file__ is in GitHub/luci-app-ark-router/scripts/
    base_dir = Path(__file__).resolve().parent.parent.parent.parent # h:\FEITOS COM IA\Ark-Router
    
    source_dir = base_dir / "GitHub" / "OpenWrt-Skills" / "skills"
    targets = [
        base_dir / ".agents" / "skills",
        base_dir / "GitHub" / "luci-app-ark-router" / ".agents" / "skills"
    ]
    
    if not source_dir.exists():
        print(f"ERRO: Diretório fonte não encontrado: {source_dir}", file=sys.stderr)
        sys.exit(1)
        
    skills = [p for p in source_dir.iterdir() if p.is_dir() and (p / "SKILL.md").exists()]
    print(f"[*] Fonte Canônica: {source_dir} ({len(skills)} skills encontradas)")
    
    mismatches = 0
    synced = 0
    
    for skill_path in sorted(skills):
        skill_name = skill_path.name
        source_skill_md = skill_path / "SKILL.md"
        source_h = file_hash(source_skill_md)
        
        for target_base in targets:
            dest_skill_dir = target_base / skill_name
            dest_skill_md = dest_skill_dir / "SKILL.md"
            
            needs_update = False
            if not dest_skill_md.exists():
                needs_update = True
            else:
                dest_h = file_hash(dest_skill_md)
                if dest_h != source_h:
                    needs_update = True
                    
            if needs_update:
                if check_only:
                    print(f"  [!] Desalinhado: {target_base.name}/{skill_name}/SKILL.md")
                    mismatches += 1
                else:
                    dest_skill_dir.mkdir(parents=True, exist_ok=True)
                    # Copy all files from skill dir
                    for src_item in skill_path.glob("**/*"):
                        if src_item.is_file():
                            rel = src_item.relative_to(skill_path)
                            dest_item = dest_skill_dir / rel
                            dest_item.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(src_item, dest_item)
                    print(f"  [+] Sincronizado: {target_base.name}/{skill_name}")
                    synced += 1
                    
    if check_only:
        if mismatches > 0:
            print(f"ERRO: {mismatches} skills desalinhadas. Execute sem --check para sincronizar.", file=sys.stderr)
            sys.exit(1)
        else:
            print("[OK] Todas as skills estão 100% alinhadas com a fonte canônica.")
    else:
        print(f"[OK] Sincronização concluída. {synced} atualizações aplicadas.")

if __name__ == "__main__":
    main()
