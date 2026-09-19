#!/usr/bin/env python3
"""
ARK Router Automated Test Suite - Universal Firewall Architecture (fw3 vs fw4)
Validates dynamic firewall engine detection, zero iptables pollution on fw4,
and backward compatibility for fw3 systems.
"""
import unittest
import json
import os
import sys
sys.path.insert(0, os.path.dirname(__file__))
from test_harness import RouterSandbox

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class TestFirewallEngine(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_doctor_firewall_check_fw4(self):
        """Valida se a checagem 10 do ark-doctor reporta OK para pureza de firewall fw4 em sandbox sem regras legadas"""
        res = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res.returncode, 0, f"Falha ao rodar ark-doctor: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertIn("checks", data)
        fw_checks = [c for c in data["checks"] if "Firewall" in c.get("name", "")]
        self.assertTrue(len(fw_checks) > 0, "Checagem de integridade do firewall ausente no ark-doctor")
        fw_check = fw_checks[0]
        self.assertEqual(fw_check.get("status"), "OK")
        self.assertIn("nftables", fw_check.get("message", ""))

    def test_02_doctor_firewall_legacy_detection_and_fix(self):
        """Valida deteccao e auto-cura de comandos legados iptables em /etc/firewall.user"""
        fw_user = os.path.join(self.sb.temp_dir, "etc", "firewall.user")
        with open(fw_user, "w") as f:
            f.write("#!/bin/sh\niptables -t nat -A PREROUTING -p tcp --dport 53 -j REDIRECT --to-ports 53\n")

        # 1. Auditoria sem fix deve reportar WARN
        res = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res.returncode, 0)
        data = json.loads(res.stdout)
        fw_checks = [c for c in data["checks"] if "Firewall" in c.get("name", "")]
        self.assertTrue(len(fw_checks) > 0)
        self.assertEqual(fw_checks[0].get("status"), "WARN")
        self.assertIn("/etc/firewall.user", fw_checks[0].get("message", ""))

        # 2. Execucao com --fix deve isolar o arquivo e reportar FIXED
        res_fix = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res_fix.returncode, 0)
        data_fix = json.loads(res_fix.stdout)
        fw_checks_fix = [c for c in data_fix["checks"] if "Firewall" in c.get("name", "")]
        self.assertEqual(fw_checks_fix[0].get("status"), "FIXED")

        # 3. O arquivo /etc/firewall.user original deve estar limpo (vazio ou sem iptables)
        with open(fw_user, "r") as f:
            content = f.read()
        self.assertNotIn("iptables", content)

    def test_03_clean_ipv6_firewall_no_ip6tables_leak_on_fw4(self):
        """Valida se sync-ipv6-firewall e clean_ipv6_selective_firewall nao poluem o kernel com regras ip6tables"""
        res = self.sb.run_control("sync-ipv6-firewall")
        self.assertEqual(res.returncode, 0)

        # Inspeciona se foi criada tabela nativa nftables (arquivo em /etc/ark ou /tmp)
        # Nao deve criar nenhum arquivo .sh que invoque ip6tables
        ark_dir = os.path.join(self.sb.temp_dir, "etc", "ark")
        if os.path.isdir(ark_dir):
            sh_files = [f for f in os.listdir(ark_dir) if f.endswith(".sh")]
            for sh_file in sh_files:
                with open(os.path.join(ark_dir, sh_file), "r") as f:
                    content = f.read()
                self.assertNotIn("ip6tables", content, f"Chamada ip6tables detectada indevidamente em {sh_file}")

    def test_04_fw3_legacy_fallback(self):
        """Valida que em sistema legado sem fw4, o doctor audita iptables normalmente"""
        if os.path.exists(self.sb.fw4_wrapper):
            os.remove(self.sb.fw4_wrapper)
        if os.path.exists(self.sb.nft_wrapper):
            os.remove(self.sb.nft_wrapper)

        res = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res.returncode, 0)
        data = json.loads(res.stdout)
        fw_checks = [c for c in data["checks"] if "Firewall" in c.get("name", "")]
        self.assertTrue(len(fw_checks) > 0)
        self.assertIn("fw3 iptables", fw_checks[0].get("name", ""))
        self.assertEqual(fw_checks[0].get("status"), "OK")

    def test_05_addon_upnp_install_nftables_on_fw4(self):
        """Valida que instalacao e limpeza de UPnP em fw4 requisitam miniupnpd-nftables e nunca miniupnpd legado"""
        common_sh = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "common.sh").replace("\\", "/")
        ezsetup_sh = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "modules", "ezsetup.sh").replace("\\", "/")
        cmd = f". '{common_sh}' && . '{ezsetup_sh}' && cleanup_packages upnp"
        res = self.sb.run_sh(cmd)
        self.assertEqual(res.returncode, 0, f"Falha ao executar cleanup_packages: {res.stderr}")
        self.assertIn("miniupnpd-nftables", res.stdout)

    def test_06_inverted_upnp_detection_and_auto_migration(self):
        """Valida que pacote miniupnpd-iptables instalado indevidamente em fw4 eh detectado e migrado pelo ark-doctor"""
        opkg_dir = os.path.join(self.sb.temp_dir, "usr", "lib", "opkg", "info")
        os.makedirs(opkg_dir, exist_ok=True)
        with open(os.path.join(opkg_dir, "miniupnpd-iptables.control"), "w") as f:
            f.write("Package: miniupnpd-iptables\nVersion: 2.3.3-2\nDepends: iptables\n")

        # 1. Checagem do ark-doctor deve acusar WARN para o pacote incompativel
        res = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res.returncode, 0)
        data = json.loads(res.stdout)
        fw_checks = [c for c in data["checks"] if "Firewall" in c.get("name", "")]
        self.assertEqual(fw_checks[0].get("status"), "WARN")
        self.assertIn("miniupnpd", fw_checks[0].get("message", ""))

        # 2. feature_missing_installable deve considerar upnp pendente de instalacao/reparo
        common_sh = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "common.sh").replace("\\", "/")
        ezsetup_sh = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "modules", "ezsetup.sh").replace("\\", "/")
        cmd = f". '{common_sh}' && . '{ezsetup_sh}' && feature_missing_installable upnp"
        res_check = self.sb.run_sh(cmd)
        self.assertEqual(res_check.returncode, 0, "UPnP invertido deveria retornar 0 (necessita reparo)")

        # 3. Execucao de auto-fix deve reportar FIXED
        res_fix = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res_fix.returncode, 0)
        data_fix = json.loads(res_fix.stdout)
        fw_checks_fix = [c for c in data_fix["checks"] if "Firewall" in c.get("name", "")]
        self.assertEqual(fw_checks_fix[0].get("status"), "FIXED")

if __name__ == "__main__":
    unittest.main()

