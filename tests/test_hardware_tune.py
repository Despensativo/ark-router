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
        self.assertIn("services_detected", data)

    def test_03_hardware_auto_tune_with_mwan3(self):
        """Verifica se mwan3 com 2 interfaces e detectado e reduz timeouts de conntrack"""
        mwan3_file = os.path.join(self.sb.etc_config, "mwan3")
        with open(mwan3_file, "w") as f:
            f.write("config interface 'wan1'\n\toption enabled '1'\nconfig interface 'wan2'\n\toption enabled '1'\n")

        res = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res.returncode, 0, f"Falha: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertIn("mwan3", data.get("services_detected", []))

        # Inspeciona o arquivo sysctl gerado
        sysctl_file = os.path.join(self.sb.temp_dir, "etc", "sysctl.d", "99-ark-hardware-tune.conf")
        self.assertTrue(os.path.isfile(sysctl_file), "sysctl conf nao gerado")
        with open(sysctl_file, "r") as f:
            content = f.read()
        self.assertIn("net.netfilter.nf_conntrack_tcp_timeout_established=1200", content)
        self.assertIn("net.netfilter.nf_conntrack_udp_timeout=30", content)

    def test_04_hardware_auto_tune_with_vpn_and_sqm(self):
        """Verifica se VPN e SQM ativos ativam mtu_probing e priorizam Software Flowtable"""
        # Configura SQM ativo
        sqm_file = os.path.join(self.sb.etc_config, "sqm")
        with open(sqm_file, "w") as f:
            f.write("config queue 'wan_q'\n\toption enabled '1'\n\toption interface 'pppoe-wan'\n")

        # Configura interface WireGuard simulada na sysfs
        wg_dev = os.path.join(self.sb.sys_net, "wg0")
        os.makedirs(wg_dev, exist_ok=True)

        res = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res.returncode, 0, f"Falha: {res.stderr}")
        data = json.loads(res.stdout)
        svcs = data.get("services_detected", [])
        self.assertIn("sqm", svcs)
        self.assertIn("vpn", svcs)
        self.assertIn("SQM/CAKE ativo", data.get("offload_reason", ""))

        # Inspeciona se tcp_mtu_probing foi ativado
        sysctl_file = os.path.join(self.sb.temp_dir, "etc", "sysctl.d", "99-ark-hardware-tune.conf")
        with open(sysctl_file, "r") as f:
            content = f.read()
        self.assertIn("net.ipv4.tcp_mtu_probing=1", content)
        self.assertIn("net.ipv4.ip_forward=1", content)

    def test_05_hardware_auto_tune_nlbwmon_protection(self):
        """Verifica se nlbwmon ativo garante rmem_max >= 1MB contra netlink overrun"""
        nlbwmon_file = os.path.join(self.sb.etc_config, "nlbwmon")
        with open(nlbwmon_file, "w") as f:
            f.write("config nlbwmon\n\toption refresh_interval '2s'\n")

        res = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res.returncode, 0, f"Falha: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertIn("nlbwmon", data.get("services_detected", []))
        self.assertGreaterEqual(data.get("rmem_max", 0), 1048576)

if __name__ == "__main__":
    unittest.main()
