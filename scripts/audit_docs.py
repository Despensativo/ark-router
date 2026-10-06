#!/usr/bin/env python3
"""
audit_docs.py — Auditoria Preventiva Contínua de Documentação e Regras

Executa verificações estritas contra divergências de versão, vazamento de recursos
descontinuados, inconsistência de limites do OpenWrt e inchaço do TASK.md.

Uso:
  python scripts/audit_docs.py [--strict]
"""

import os
import sys
import re
from pathlib import Path

def main():
    strict = "--strict" in sys.argv
    repo_dir = Path(__file__).resolve().parent.parent
    workspace_dir = repo_dir.parent.parent
    
    errors = []
    warnings = []
    
    # 1. Checagem de Versão Canônica
    version_file = repo_dir / "VERSION"
    if not version_file.exists():
        errors.append("Arquivo VERSION não encontrado.")
        return 1
    
    version = version_file.read_text(encoding="utf-8").strip()
    
    # Makefile
    makefile = repo_dir / "Makefile"
    if makefile.exists():
        m_txt = makefile.read_text(encoding="utf-8")
        if f"PKG_VERSION:={version}" not in m_txt:
            errors.append(f"Makefile PKG_VERSION não coincide com VERSION ({version}).")
            
    # root/usr/share/ark-router/VERSION
    root_ver = repo_dir / "root" / "usr" / "share" / "ark-router" / "VERSION"
    if root_ver.exists():
        if root_ver.read_text(encoding="utf-8").strip() != version:
            errors.append(f"root VERSION não coincide com VERSION ({version}).")
            
    # common.sh
    common_sh = repo_dir / "root" / "usr" / "lib" / "ark" / "common.sh"
    if common_sh.exists():
        c_txt = common_sh.read_text(encoding="utf-8")
        if f'ARK_ROUTER_VERSION="{version}"' not in c_txt:
            errors.append(f"common.sh ARK_ROUTER_VERSION não coincide com VERSION ({version}).")
            
    # CHANGELOG.md top version
    changelog = repo_dir / "CHANGELOG.md"
    if changelog.exists():
        c_lines = changelog.read_text(encoding="utf-8").splitlines()
        has_ver = any(line.strip().startswith(f"## {version}") for line in c_lines[:20])
        if not has_ver:
            errors.append(f"CHANGELOG.md não possui seção de release para a versão {version} no topo.")

    # 2. Checagem de Recursos Descontinuados em Documentos Ativos
    disallowed_terms = [
        ("tailscale", ["docs/INSTALL.md", "docs/PACKAGE_PROFILES.md"], "Tailscale foi removido na v1.5.9 em favor de ZeroTier/WireGuard"),
        ("luci-theme-argon", ["Makefile"], "Tema Argon foi removido na v1.5.9"),
    ]
    for term, files, reason in disallowed_terms:
        for rel_path in files:
            target = repo_dir / rel_path
            if target.exists():
                txt = target.read_text(encoding="utf-8").lower()
                if term in txt:
                    # Permite se for menção explícita de remoção histórica
                    if "removido" not in txt and "removed" not in txt:
                        errors.append(f"Termo descontinuado '{term}' encontrado em {rel_path}: {reason}")

    # 3. Matriz de Compatibilidade OpenWrt
    matrix_file = repo_dir / "docs" / "COMPATIBILITY_MATRIX.md"
    if not matrix_file.exists():
        errors.append("docs/COMPATIBILITY_MATRIX.md não encontrado.")
    else:
        agents_repo = repo_dir / "AGENTS.md"
        if agents_repo.exists():
            a_txt = agents_repo.read_text(encoding="utf-8")
            if "COMPATIBILITY_MATRIX.md" not in a_txt:
                warnings.append("AGENTS.md do repositório deve referenciar docs/COMPATIBILITY_MATRIX.md.")

    # 4. Sincronismo de Contratos Funcionais e Auditoria
    yaml_file = repo_dir / "tests" / "feature_contracts.yaml"
    audit_file = repo_dir / "docs" / "FEATURE_AUDIT_AND_REBOOT.md"
    if yaml_file.exists() and audit_file.exists():
        y_txt = yaml_file.read_text(encoding="utf-8")
        contract_count = len(re.findall(r"^\s*-\s*id:\s*ARK-", y_txt, re.MULTILINE))
        a_txt = audit_file.read_text(encoding="utf-8")
        m = re.search(r"Total de Funcionalidades:\s*`(\d+)`", a_txt)
        if m:
            audit_count = int(m.group(1))
            if contract_count != audit_count:
                errors.append(f"Divergência de contratos: {contract_count} em YAML vs {audit_count} em FEATURE_AUDIT_AND_REBOOT.md.")

    # 5. Orçamento de Linhas do TASK.md (Prevenção de Inchaço)
    task_file = workspace_dir / "TASK.md"
    if task_file.exists():
        task_lines = len(task_file.read_text(encoding="utf-8").splitlines())
        if task_lines > 150:
            warnings.append(f"TASK.md possui {task_lines} linhas (limite recomendado <= 100 linhas). Considere arquivar tarefas em tasks/done/.")

    # Relatório
    print("=" * 60)
    print("      ARK ROUTER: AUDITORIA PREVENTIVA DE DOCUMENTAÇÃO      ")
    print("=" * 60)
    print(f"Versão Canônica Auditada: {version}")
    
    if warnings:
        print("\n[AVISOS]:")
        for w in warnings:
            print(f"  ⚠ {w}")
            
    if errors:
        print("\n[FALHAS]:")
        for e in errors:
            print(f"  ❌ {e}")
        print("\nResultado: REPROVADO. Corrija as divergências documentais.")
        return 1
        
    print("\nResultado: APROVADO! Todos os documentos, versões e limites estão em 100% de conformidade.")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())
