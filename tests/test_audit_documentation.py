#!/usr/bin/env python3
"""Geradores não podem fabricar homologação nem sobrescrever curadoria."""
import importlib.util
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SCRIPT = REPO / 'scripts/generate_feature_audit_md.py'


class AuditDocumentation(unittest.TestCase):
    def test_generator_requires_explicit_overwrite(self):
        target = REPO / 'docs/FEATURE_AUDIT_AND_REBOOT.md'
        before = target.read_bytes()
        result = subprocess.run([sys.executable, str(SCRIPT)], capture_output=True, timeout=15)
        self.assertEqual(result.returncode, 2)
        self.assertEqual(target.read_bytes(), before)

    def test_generated_contracts_do_not_invent_test_results(self):
        spec = importlib.util.spec_from_file_location('audit_generator', SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory(prefix='ark_doc_test_') as temp:
            module.MD_FILE = str(Path(temp) / 'catalog.md')
            module.generate_doc()
            content = Path(module.MD_FILE).read_text()
        self.assertNotIn('Aprovadas e Funcionais no Lab', content)
        self.assertNotIn('**Falhas Não Resolvidas** | **0**', content)
        self.assertNotIn('**APROVADO**', content)
        self.assertNotIn('escrevendo **SIM**', content)
        self.assertIn('validação operacional pendente', content)


if __name__ == '__main__':
    unittest.main(verbosity=2)
