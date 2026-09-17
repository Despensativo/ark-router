#!/usr/bin/env python3
"""
ARK Router Automated Test Suite - Universal Hardware Profile & Auto-Tune Matrix
Validates silicon family classification, RAM tier detection, and dynamic sysctl / firewall auto-tuning.
"""
import unittest
import json
import os
from test_harness import RouterSandbox

class TestHardwareTune(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_hardware_info_silicon_structure(self):
        """Verifica se get_system_hardware_info retorna o objeto silicon com todos os atributos obrigatorios"""
        res = self.sb.run_control("system-hardware-info")
        self.assertEqual(res.returncode, 0, f"Falha ao executar system-hardware-info: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertIn("silicon", data, "Chave 'silicon' ausente no JSON de hardware")
        silicon = data["silicon"]
        self.assertIn("class", silicon)
        self.assertIn("name", silicon)
        self.assertIn("hw_offload_capable", silicon)
        self.assertIn("wed_capable", silicon)
        self.assertIn("multicore", silicon)
        self.assertIn("ram_tier", silicon)
        self.assertIn("tuning_profile", silicon)

    def test_02_hardware_auto_tune_execution(self):
        """Verifica se system-hardware-auto-tune executa com sucesso e aplica regras no firewall e sysctl"""
        res = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res.returncode, 0, f"Falha ao executar system-hardware-auto-tune: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertTrue(data.get("ok"), "Retorno do auto-tune nao indicou ok: true")
        self.assertIn("silicon_class", data)
        self.assertIn("tuning_profile", data)
        self.assertIn("ram_tier", data)
        self.assertIn("offload_reason", data)
        self.assertIn("irq_action", data)
        self.assertIn("conntrack_max", data)
        self.assertIn("rmem_max", data)

        # Verifica se flow_offloading foi ativado no firewall
        flow_offload = self.sb.uci_get("firewall.@defaults[0].flow_offloading")
        self.assertEqual(flow_offload, "1", "flow_offloading nao foi ativado no firewall")

        # Verifica se equipe_perf registrou o perfil de hardware
        hw_prof = self.sb.uci_get("equipe_perf.settings.hardware_profile")
        self.assertIsNotNone(hw_prof, "hardware_profile nao gravado em equipe_perf")

if __name__ == "__main__":
    unittest.main()
