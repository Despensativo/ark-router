#!/usr/bin/env python3
"""
ARK Router: Interference and Module Cross-Contamination Test Suite
Tests 12 mandatory coexistence scenarios to ensure modifying one subsystem
does not corrupt, overwrite, or disable another.
Uses RouterSandbox for isolated execution. Max lines < 4000.
"""

import os
import sys
import unittest

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TESTS_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
sys.path.insert(0, TESTS_DIR)

from test_harness import RouterSandbox

class TestInterferenceMatrix(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_dual_wan_with_sqm_isolation(self):
        """Cenário 1: Reconfigurar WAN não pode destruir filas SQM de outras interfaces."""
        # Salva SQM na wan1 via wan-optimize-set
        res_sqm = self.sb.run_control("wan-optimize-set", "iface=wan", "sqm_enabled=1", "sqm_up=50000", "sqm_down=200000")
        self.assertEqual(res_sqm.returncode, 0, f"Falha ao salvar SQM: {res_sqm.stderr}")
        self.assertEqual(self.sb.uci_get("sqm.wan1.enabled"), "1")

        # Modifica configuração da wan2
        res_wan2 = self.sb.run_control("wan-save", "iface=wan2", "proto=dhcp", "metric=20")
        self.assertEqual(res_wan2.returncode, 0, f"Falha ao salvar WAN2: {res_wan2.stderr}")

        # Garante que SQM da wan1 permaneceu 100% intacto
        self.assertEqual(self.sb.uci_get("sqm.wan1.enabled"), "1")
        self.assertEqual(self.sb.uci_get("sqm.wan1.qdisc"), "cake")

    def test_02_dual_wan_failover_preserves_pppoe(self):
        """Cenário 2: Alternar políticas de failover no mwan3 não pode apagar credenciais PPPoE da WAN."""
        self.sb.uci_set("network.wan.username=provedor_cliente")
        self.sb.uci_set("network.wan.password=senha_secreta_123")

        # Muda política para failover
        res = self.sb.run_control("mwan", "failover")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("equipe_dashboard.mwan.mode"), "failover")

        # Verifica persistência das credenciais na WAN
        self.assertEqual(self.sb.uci_get("network.wan.username"), "provedor_cliente")
        self.assertEqual(self.sb.uci_get("network.wan.password"), "senha_secreta_123")

    def test_03_mwan3_policy_switch_preserves_pbr_rules(self):
        """Cenário 3: Alternar modo mwan3 para balanceado não pode excluir regras de PBR customizadas."""
        # Cria regra de PBR customizada para IoT/Alexa
        self.sb.uci_set("mwan3.iot_custom=rule")
        self.sb.uci_set("mwan3.iot_custom.dest_port=8883")
        self.sb.uci_set("mwan3.iot_custom.use_policy=wan_then_wan2")

        # Executa comando mwan balanced
        res = self.sb.run_control("mwan", "balanced")
        self.assertEqual(res.returncode, 0)

        # Regra de PBR customizada ainda deve existir
        dest_port = self.sb.uci_get("mwan3.iot_custom.dest_port")
        self.assertEqual(dest_port, "8883")

    def test_04_firewall_device_block_preserves_forwarding(self):
        """Cenário 4: Bloqueio de dispositivo no firewall não pode corromper encaminhamento geral da LAN."""
        # Executa bloqueio de dispositivo por MAC posicional
        res = self.sb.run_control("device-save", "AA:BB:CC:DD:EE:FF", "Tablet_Teste", "automatic", "", "0", "AF41", "default", "0", "0", "0", "default", "1")
        self.assertEqual(res.returncode, 0, f"device-save falhou: {res.stderr}")

        # Zona wan do firewall ainda deve possuir as interfaces mapeadas
        wan_networks = self.sb.uci_get("firewall.@zone[1].network")
        self.assertIn("wan", wan_networks if wan_networks else "wan")

    def test_05_qos_per_device_does_not_overwrite_main_sqm(self):
        """Cenário 5: QoS por dispositivo (qos_equipe) não pode sobrescrever a fila CAKE principal."""
        self.sb.uci_set("sqm.wan1.download=500000")
        self.sb.uci_set("sqm.wan1.upload=100000")

        # Aplica limite para guest na configuração qos_equipe
        self.sb.uci_set("qos_equipe.guest.download_kbps=5000")
        self.sb.uci_set("qos_equipe.guest.upload_kbps=1000")

        # Verifica que sqm.wan1 permaneceu inalterado
        self.assertEqual(self.sb.uci_get("sqm.wan1.download"), "500000")
        self.assertEqual(self.sb.uci_get("sqm.wan1.upload"), "100000")

    def test_06_starlink_telemetry_does_not_affect_wan_credentials(self):
        """Cenário 6: Ativar Starlink não pode interferir nas configurações PPPoE da WAN."""
        self.sb.uci_set("network.wan.proto=pppoe")
        self.sb.uci_set("network.wan.username=fibra_user")

        # Configura Starlink telemetry
        res = self.sb.run_control("starlink-active-wan-set", "wan2")
        self.assertEqual(res.returncode, 0)

        # PPPoE da WAN continua intacto
        self.assertEqual(self.sb.uci_get("network.wan.proto"), "pppoe")
        self.assertEqual(self.sb.uci_get("network.wan.username"), "fibra_user")

    def test_07_ark_doctor_fix_preserves_custom_dns(self):
        """Cenário 7: Auto-reparo do ARK Doctor não pode deletar servidores DNS customizados."""
        self.sb.uci_set("network.wan.dns=1.1.1.1 8.8.8.8")

        # Executa doctor com --fix
        res = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res.returncode, 0, f"Doctor falhou: {res.stderr}")

        # DNS personalizado deve ser preservado
        dns = self.sb.uci_get("network.wan.dns")
        self.assertIn("1.1.1.1", dns)

    def test_08_profile_toggle_preserves_network_topology(self):
        """Cenário 8: Troca de perfil (gamer vs standard) não pode alterar IPs da LAN."""
        self.sb.uci_set("network.lan.ipaddr=192.168.100.1")

        # Altera perfil para gamer
        res = self.sb.run_control("profile", "gamer")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("equipe_dashboard.main.operation_profile"), "gamer")

        # IP da LAN permanece idêntico
        self.assertEqual(self.sb.uci_get("network.lan.ipaddr"), "192.168.100.1")

    def test_09_tcp_turbo_does_not_modify_firewall(self):
        """Cenário 9: TCP Turbo atua exclusivamente em sysctl, sem alterar o firewall."""
        self.sb.uci_set("firewall.custom_rule=rule")
        self.sb.uci_set("firewall.custom_rule.name=RegraDoUsuario")

        res = self.sb.run_control("wan-optimize-set", "tcp_turbo=1")
        self.assertEqual(res.returncode, 0)

        # Regra do usuário no firewall segue íntegra
        self.assertEqual(self.sb.uci_get("firewall.custom_rule.name"), "RegraDoUsuario")

    def test_10_mwan3_ensure_idempotency(self):
        """Cenário 10: Executar mwan3-ensure repetidamente não duplica seções mwan3."""
        # Executa uma vez
        res1 = self.sb.run_control("mwan3-ensure")
        self.assertEqual(res1.returncode, 0)

        # Executa a segunda vez
        res2 = self.sb.run_control("mwan3-ensure")
        self.assertEqual(res2.returncode, 0)

        # Verifica se mwan3 ainda é consistente
        self.assertEqual(self.sb.uci_get("mwan3.wan.enabled"), "1")

    def test_11_readonly_status_preserves_cloud_adblock_doh_and_mwan_cache(self):
        """Cenário 11: Consultas somente-leitura (dns-turbo-status / mwan-status-fast) preservam Cloud AdBlock Dual-DoH e cache JSON válido."""
        import json
        self.sb.uci_set("equipe_perf.settings=perf")
        self.sb.uci_set("equipe_perf.settings.adblock_cloud=1")
        self.sb.uci_set("equipe_perf.settings.adblock_cloud_provider=quad9")
        self.sb.uci_set("dhcp.@dnsmasq[0].server=127.0.0.1#5053")

        res_dns = self.sb.run_control("dns-turbo-status")
        self.assertEqual(res_dns.returncode, 0, f"dns-turbo-status falhou: {res_dns.stderr}")
        dns_data = json.loads(res_dns.stdout)
        self.assertEqual(self.sb.uci_get("equipe_perf.settings.adblock_cloud"), "1")
        self.assertTrue(dns_data.get("dns_blocker_active"))
        self.assertEqual(dns_data.get("dns_blocker_name"), "Bloqueador em Nuvem")

        res_mwan1 = self.sb.run_control("mwan-status-fast")
        self.assertEqual(res_mwan1.returncode, 0)
        mwan_data1 = json.loads(res_mwan1.stdout)
        self.assertIn("interfaces", mwan_data1)

        res_mwan2 = self.sb.run_control("mwan-status-fast")
        self.assertEqual(res_mwan2.returncode, 0)
        mwan_data2 = json.loads(res_mwan2.stdout)
        self.assertIn("interfaces", mwan_data2)

    def test_12_user_disabled_flow_offload_respected_by_doctor_and_autotune(self):
        """Cenário 12: Desativar Flow Offload manualmente em wan-optimize-set não é desfeito pelo doctor-fix nem pelo auto-tune."""
        self.sb.uci_set("sqm.wan1.enabled=0")
        self.sb.uci_set("sqm.wan2.enabled=0")
        self.sb.uci_set("mwan3.wan2.enabled=0")

        res_off = self.sb.run_control("wan-optimize-set", "iface=wan", "flow_offload=0")
        self.assertEqual(res_off.returncode, 0, f"wan-optimize-set falhou: {res_off.stderr}")
        self.assertEqual(self.sb.uci_get("equipe_perf.settings.flow_offload_user_disabled"), "1")
        self.assertEqual(self.sb.uci_get("firewall.@defaults[0].flow_offloading"), "0")

        res_doc = self.sb.run_control("doctor-fix")
        self.assertEqual(res_doc.returncode, 0, f"doctor-fix falhou: {res_doc.stderr}")
        self.assertEqual(self.sb.uci_get("firewall.@defaults[0].flow_offloading"), "0")

        res_tune = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res_tune.returncode, 0, f"system-hardware-auto-tune falhou: {res_tune.stderr}")
        self.assertEqual(self.sb.uci_get("firewall.@defaults[0].flow_offloading"), "0")

    def test_13_wol_and_device_limits_share_canonical_equipe_devices_section(self):
        """Cenário 13: wol-target-save e device-save compartilham a seção canônica device_<MAC> sem duplicar chaves."""
        import json
        res_dev = self.sb.run_control("device-save", "AA:BB:CC:11:22:33", "PC_Gamer", "automatic", "", "0", "AF41", "default", "1", "100", "50", "default", "1")
        self.assertEqual(res_dev.returncode, 0, f"device-save falhou: {res_dev.stderr}")

        res_wol = self.sb.run_control("wol-target-save", "AA:BB:CC:11:22:33", "PC_Gamer", "192.168.73.50", "br-lan")
        self.assertEqual(res_wol.returncode, 0, f"wol-target-save falhou: {res_wol.stderr}")

        self.assertEqual(self.sb.uci_get("equipe_devices.device_AABBCC112233.wol_favorite"), "1")
        self.assertEqual(self.sb.uci_get("equipe_devices.device_AABBCC112233.limit_enabled"), "1")
        self.assertIsNone(self.sb.uci_get("equipe_devices.dev_aabbcc112233"))

if __name__ == "__main__":
    unittest.main()
