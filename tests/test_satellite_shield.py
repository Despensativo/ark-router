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

    def test_04_hub_mode_activation_and_wifi_policy(self):
        """Verifica se system-network-mode-set hub aplica otimizacoes L2 puras, resgate e politica de Wi-Fi"""
        self.sb.uci_set("wireless.radio0=wifi-device")
        self.sb.uci_set("wireless.radio0.disabled=0")
        self.sb.uci_set("wireless.default_radio0=wifi-iface")
        self.sb.uci_set("wireless.default_radio0.device=radio0")
        self.sb.uci_set("wireless.default_radio0.disabled=0")

        res = self.sb.run_control(
            "system-network-mode-set", "hub", "static",
            "192.168.73.2", "255.255.255.0", "192.168.73.1", "1.1.1.1", "off"
        )
        self.assertEqual(res.returncode, 0, f"Falha ao ativar modo HUB: {res.stderr}")
        self.assertIn("hub_enabled", res.stdout)

        # Valida estado salvo no UCI
        self.assertEqual(self.sb.uci_get("equipe_dashboard.main.network_mode"), "hub")
        self.assertEqual(self.sb.uci_get("equipe_dashboard.general.role"), "hub")
        self.assertEqual(self.sb.uci_get("dhcp.lan.ignore"), "1")
        self.assertEqual(self.sb.uci_get("network.lan.igmp_snooping"), "1")
        self.assertEqual(self.sb.uci_get("network.lan.stp"), "0")
        self.assertEqual(self.sb.uci_get("network.lan.forward_delay"), "0")
        self.assertEqual(self.sb.uci_get("network.lan.ipaddr"), "192.168.73.2")
        self.assertEqual(self.sb.uci_get("network.lan.gateway"), "192.168.73.1")
        self.assertTrue(bool(self.sb.uci_get("network.rescue.ipaddr")), "Interface de resgate deve estar configurada")

        # Valida que radios Wi-Fi foram desligados conforme politica 'off'
        get_res = self.sb.run_control("system-network-mode-get")
        self.assertEqual(get_res.returncode, 0)
        state = json.loads(get_res.stdout.strip())
        self.assertEqual(state["mode"], "hub")
        self.assertEqual(state["role"], "hub")
        self.assertFalse(state["wifi_enabled"], "Wi-Fi deveria estar desligado quando wifi_policy='off'")

        # Valida reativacao do Wi-Fi no modo HUB (wifi_policy='on')
        res_on = self.sb.run_control("system-network-mode-set", "hub", "dhcp", "on")
        self.assertEqual(res_on.returncode, 0)
        get_res_on = self.sb.run_control("system-network-mode-get")
        state_on = json.loads(get_res_on.stdout.strip())
        self.assertEqual(state_on["mode"], "hub")
        self.assertTrue(state_on["wifi_enabled"], "Wi-Fi deveria estar ativo quando wifi_policy='on'")

        # Valida retorno ao modo Roteador Principal
        res_router = self.sb.run_control("system-network-mode-set", "router", "1")
        self.assertEqual(res_router.returncode, 0)
        self.assertIn("router_enabled", res_router.stdout)
        self.assertEqual(self.sb.uci_get("equipe_dashboard.main.network_mode"), "router")
        self.assertEqual(self.sb.uci_get("equipe_dashboard.general.role"), "master")

if __name__ == "__main__":
    unittest.main()
