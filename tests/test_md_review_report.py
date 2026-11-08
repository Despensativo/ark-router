#!/usr/bin/env python3
"""Teste de validação do relatório de revisão geral de documentação Markdown."""
import os
import re
import unittest
from pathlib import Path

# Suporta execução tanto a partir da raiz do workspace quanto de GitHub/luci-app-ark-router
CWD = Path.cwd()
if (CWD / "GitHub/luci-app-ark-router").is_dir():
    REPO = CWD / "GitHub/luci-app-ark-router"
elif (CWD / "docs").is_dir() and (CWD / "src").is_dir():
    REPO = CWD
else:
    REPO = Path(__file__).resolve().parents[1]

REPORT_PATH = REPO / "docs/audit/REVISAO_GERAL_DOCUMENTACAO_MD.md"


class TestMdReviewReport(unittest.TestCase):
    def test_report_exists_and_has_substance(self):
        self.assertTrue(REPORT_PATH.exists(), f"Relatório não encontrado em: {REPORT_PATH}")
        content = REPORT_PATH.read_text(encoding="utf-8")
        self.assertGreater(len(content), 3000, "Relatório muito curto (deve ter > 3000 caracteres de análise técnica).")

    def test_report_required_sections(self):
        content = REPORT_PATH.read_text(encoding="utf-8")
        sections = [
            "Diagnóstico de Desatualizações",
            "Recomendações de Arquivamento",
            "Otimização de Estrutura e Modo Operandi",
            "Matriz Geral de Documentos Markdown",
        ]
        for sec in sections:
            self.assertTrue(
                re.search(rf"#+\s+.*{re.escape(sec)}", content, re.IGNORECASE),
                f"Seção obrigatória ausente ou mal formatada: '{sec}'"
            )

    def test_report_covers_key_documents(self):
        content = REPORT_PATH.read_text(encoding="utf-8")
        # Deve avaliar os documentos vitais do ecossistema
        key_docs = [
            "AGENTS.md",
            "PLAYBOOK.md",
            "DEVELOPMENT_GUIDE.md",
            "CODE_MAP.md",
            "TASK.md",
            "FEATURE_AUDIT_AND_REBOOT.md",
        ]
        for doc in key_docs:
            self.assertIn(doc, content, f"Documento essencial '{doc}' não foi analisado no relatório.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
