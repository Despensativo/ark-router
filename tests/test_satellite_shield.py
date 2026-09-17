#!/usr/bin/env python3
"""
ARK Router Automated Test Suite - Satellite Node Shielding & Guardrails
Validates protection against activating WAN SQM, Multi-WAN, Rogue DHCP, and Speedify on Satellite / AP nodes.
"""
import unittest
import json
import os
from test_harness import RouterSandbox

class TestSatelliteShield(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_wan_optimize_set_sqm_blocked_on_satellite(self):
        """Verifica se wan-optimize-set enable_sqm=1 e rejeitado em modo Satelite"""
        self.sb.uci_set("equipe_dashboard.general=general")
        self.sb.uci_set("equipe_dashboard.general.role=satellite")

        res = self.sb.run_control("wan-optimize-set", "iface=wan", "enable_sqm=1")
        self.assertEqual(res.returncode, 2, f"Deveria retornar exit code 2 em modo Satelite, obteve {res.returncode}: {res.stdout} / {res.stderr}")
        self.assertIn("Roteador Mestre", res.stderr)

    def test_02_speedify_power_blocked_on_satellite(self):
        """Verifica se speedify-power 1 e rejeitado em modo Satelite"""
        self.sb.uci_set("equipe_dashboard.general=general")
        self.sb.uci_set("equipe_dashboard.general.role=secondary")

        res = self.sb.run_control("speedify-power", "1")
        self.assertEqual(res.returncode, 2, f"Deveria retornar exit code 2 para speedify em modo Satelite, obteve {res.returncode}: {res.stdout} / {res.stderr}")
        self.assertIn("Roteador Mestre", res.stderr)

    def test_03_doctor_auto_heals_satellite_dhcp_and_sqm(self):
        """Verifica se ark-doctor detecta e cura servidor DHCP indevido e filas SQM em no Satelite"""
        # Simula no satelite com configuracao defeituosa (DHCP ligado e SQM ativo)
        self.sb.uci_set("equipe_dashboard.general=general")
        self.sb.uci_set("equipe_dashboard.general.role=satellite")

        # Configura DHCP lan ativo (ignore=0)
        self.sb.uci_set("dhcp.lan=dhcp")
        self.sb.uci_set("dhcp.lan.ignore=0")

        # Configura SQM ativo
        self.sb.uci_set("sqm.wan1=queue")
        self.sb.uci_set("sqm.wan1.enabled=1")

        # Executa doctor com --fix
        res = self.sb.run_control("ark-doctor", "--fix")
        self.assertEqual(res.returncode, 0, f"Doctor falhou ao executar: {res.stderr}")

        # Verifica se o doctor corrigiu o DHCP (ignore='1')
        dhcp_ignore = self.sb.uci_get("dhcp.lan.ignore")
        self.assertEqual(dhcp_ignore, "1", "Doctor nao curou o DHCP rogue no Satelite")

        # Verifica se o doctor desativou a fila SQM (enabled='0')
        sqm_enabled = self.sb.uci_get("sqm.wan1.enabled")
        self.assertEqual(sqm_enabled, "0", "Doctor nao desativou o SQM residual no Satelite")

if __name__ == "__main__":
    unittest.main()
