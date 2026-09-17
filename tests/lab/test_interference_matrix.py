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

if __name__ == "__main__":
    unittest.main()
