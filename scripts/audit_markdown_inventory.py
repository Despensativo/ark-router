#!/usr/bin/env python3
"""Inventário reproduzível de Markdown, sem copiar conteúdo ou segredos ao relatório.

Varredura estrutural não substitui revisão semântica nem validação de hardware.
Arquivos históricos protegidos são excluídos, conforme AGENTS.md do workspace.
"""
import argparse
import hashlib
import json
import re
import subprocess
from collections import Counter
from pathlib import Path
from urllib.parse import unquote, urlsplit

REPO = Path(__file__).resolve().parents[1]
WORKSPACE = REPO.parent.parent
EXCLUDED = [
    "**/.git/**", "**/node_modules*/**", "**/.venv*/**", "**/dist/**",
    "**/.pytest_cache/**", "**/._*", "Offline/**", "Backups/**",
    "Router Backups/**", "Documentacao privada/**",
]


def inventory():
    args = ["rg", "--files", "--hidden", "-g", "*.md"]
    for pattern in EXCLUDED:
        args.extend(["-g", "!" + pattern])
    names = subprocess.check_output(args, cwd=WORKSPACE, text=True).splitlines()
    files = []
    for name in sorted(names):
        path = WORKSPACE / name
        raw = path.read_bytes()
        content = raw.decode("utf-8", errors="replace")
        historical = bool(re.search(r"/(?:batches|evidence|tasks/done)/|CHANGELOG|/Evidencias locais/", "/" + name))
        category = "historico" if historical else "referencia"
        if "GitHub/OpenWrt-Skills/" in name or "/skills/" in name:
            category = "skill"
        links, flags = [], []
        fence = False
        for number, line in enumerate(content.splitlines(), 1):
            if re.match(r"\s*(```|~~~)", line):
                fence = not fence
                continue
            if not fence:
                for match in re.finditer(r"\]\((<[^>]+>|[^\s)]+)(?:\s+['\"][^)]*)?\)", line):
                    target = match.group(1).strip("<>")
                    parsed = urlsplit(target)
                    if parsed.scheme or target.startswith(("#", "/")):
                        continue
                    local = unquote(parsed.path)
                    if local:
                        links.append({"line": number, "target": local, "exists": (path.parent / local).exists()})
            # Somente localização/tipo. Nunca exportar a linha de credencial.
            checks = {
                "caminho_de_maquina": r"(?:/Users/|/Volumes/|[A-Z]:\\)",
                "alegacao_absoluta": r"100%|100\\%|zero.drop|0ms|Zero-Drop",
                "confirmacao_SIM": r"(?:confirma|digitar|palavra|ap[oó]s).{0,35}\bSIM\b",
                "doctor_autocura": r"(?:autocura|auto.cura|auto.heal|self.heal)",
                "comando_recuperacao": r"\b(?:mtd|sysupgrade|firstboot|jffs2reset)\b",
            }
            for flag, pattern in checks.items():
                if re.search(pattern, line, re.I):
                    flags.append({"line": number, "kind": flag})
        files.append({
            "path": name, "category": category, "bytes": len(raw),
            "lines": len(content.splitlines()), "sha256": hashlib.sha256(raw).hexdigest(),
            "relative_links": links, "review_candidates": flags,
        })
    return {
        "scope": "Markdown descoberto por rg, incluindo ocultos e respeitando ignore; exclui dependencias, dist e historicos protegidos",
        "excluded": EXCLUDED,
        "evidence_level": "varredura estrutural; candidatos nao sao falhas confirmadas",
        "files_count": len(files),
        "categories": dict(Counter(f["category"] for f in files)),
        "broken_relative_links": sum(not link["exists"] for f in files for link in f["relative_links"]),
        "files": files,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = inventory()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({k: v for k, v in report.items() if k != "files"}, ensure_ascii=False))


if __name__ == "__main__":
    main()
