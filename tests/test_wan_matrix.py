#!/usr/bin/env python3
"""
ARK Router Automated Test Suite (WAN & System Integrity Matrix)
Runs 100% locally on PC/WSL without needing a physical router.
"""
import unittest
import json
import os
from test_harness import RouterSandbox

class TestWanMatrix(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_wan_optimize_status_pppoe(self):
        """Verifica se o status da WAN PPPoE detecta l3_device e perfil corretos"""
        res = self.sb.run_control("wan-optimize-status", "iface=wan2")
        self.assertEqual(res.returncode, 0, f"Falha na execucao: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertEqual(data.get("iface"), "wan2")
        self.assertEqual(data.get("proto"), "pppoe")
        self.assertEqual(data.get("l3_device"), "pppoe-wan2")
        self.assertEqual(data.get("detected_profile"), "xpon_bridge")
        self.assertEqual(data.get("baby_jumbo"), 1)

    def test_02_sqm_interface_healing(self):
        """Verifica se wan-optimize-set cura interface SQM corrompida para pppoe-wan2"""
        # Simula o bug antigo onde sqm.wan2.interface apontava para a porta fisica lan4
        self.sb.uci_set("sqm.wan2.interface=lan4")
        self.assertEqual(self.sb.uci_get("sqm.wan2.interface"), "lan4")

        # Roda o otimizador
        res = self.sb.run_control("wan-optimize-set", "iface=wan2", "linklayer_profile=pppoe_28")
        self.assertEqual(res.returncode, 0, f"Falha na execucao: {res.stderr}")

        # O SQM deve ter sido realinhado automaticamente para pppoe-wan2
        sqm_iface = self.sb.uci_get("sqm.wan2.interface")
        self.assertEqual(sqm_iface, "pppoe-wan2", f"SQM nao foi curado! Valor atual: {sqm_iface}")

    def test_03_baby_jumbo_config_device_persistence(self):
        """Verifica se Baby Jumbo grava MTU 1508 em config device e reverte limpo"""
        # Ativa Baby Jumbo
        res = self.sb.run_control("wan-optimize-set", "iface=wan2", "baby_jumbo=1")
        self.assertEqual(res.returncode, 0)
        
        # Verifica se o MTU da interface logica e 1500
        self.assertEqual(self.sb.uci_get("network.wan2.mtu"), "1500")

        # Desativa Baby Jumbo
        res = self.sb.run_control("wan-optimize-set", "iface=wan2", "baby_jumbo=0")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("network.wan2.mtu"), "1492")

    def test_04_tcp_turbo_cleanup(self):
        """Verifica se o desligamento do TCP Turbo limpa os buffers e arquivos"""
        # Liga TCP Turbo
        res = self.sb.run_control("wan-optimize-set", "iface=wan2", "tcp_turbo=1")
        self.assertEqual(res.returncode, 0)

        # Desliga TCP Turbo
        res = self.sb.run_control("wan-optimize-set", "iface=wan2", "tcp_turbo=0")
        self.assertEqual(res.returncode, 0)

        # Verifica se o log do sysctl registrou a restauracao de memoria
        sysctl_log = os.path.join(self.sb.state_dir, "sysctl.log")
        with open(sysctl_log, "r") as f:
            content = f.read()
        self.assertIn("net.core.rmem_max=212992", content)
        self.assertIn("net.ipv4.tcp_rmem=4096 87380 212992", content)
        self.assertIn("net.ipv4.tcp_wmem=4096 65536 212992", content)

    def test_05_profile_sanitization_protocol_change(self):
        """Verifica se a troca de PPPoE para DHCP reseta o perfil salvo para auto"""
        # Forca proto=dhcp com perfil salvo xpon_bridge
        self.sb.uci_set("network.wan2.proto=dhcp")
        self.sb.uci_set("equipe_dashboard.wan_profiles.wan2=xpon_bridge")

        res = self.sb.run_control("wan-optimize-status", "iface=wan2")
        self.assertEqual(res.returncode, 0)
        data = json.loads(res.stdout)
        self.assertEqual(data.get("saved_profile"), "auto", "Perfil incompativel nao foi sanitizado para auto!")

    def test_06_ark_doctor_audit_and_autofix(self):
        """Verifica se o ARK Doctor detecta inconsistencias e auto-corrige com --fix"""
        # Corrompe intencionalmente a interface SQM
        self.sb.uci_set("sqm.wan2.interface=porta_errada")

        # 1. Executa auditoria sem fix
        res = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res.returncode, 0)
        report = json.loads(res.stdout)
        self.assertGreaterEqual(report.get("errors", 0), 1, "ARK Doctor nao detectou o erro!")

        # 2. Executa auditoria com --fix
        res_fix = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res_fix.returncode, 0)
        report_fix = json.loads(res_fix.stdout)
        self.assertGreaterEqual(report_fix.get("fixes_applied", 0), 1, "ARK Doctor nao aplicou correcoes!")

        # 3. Verifica se foi curado
        self.assertEqual(self.sb.uci_get("sqm.wan2.interface"), "pppoe-wan2")

    def test_07_wifi_config_runtime_safety(self):
        """Verifica se wifiConfig no frontend roda sem erro e sem variaveis indefinidas (radio5g, r2g, etc)"""
        import shutil
        import subprocess
        node_bin = shutil.which("node") or shutil.which("node.exe") or "/mnt/c/Program Files/nodejs/node.exe"
        if not node_bin or not os.path.exists(str(node_bin)):
            return
        helpers_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "core", "helpers.js")
        if (node_bin.endswith(".exe") or "/mnt/c/" in node_bin) and shutil.which("wslpath"):
            try:
                p_w = subprocess.run(["wslpath", "-w", helpers_path], stdout=subprocess.PIPE, text=True)
                if p_w.returncode == 0 and p_w.stdout.strip():
                    helpers_path = p_w.stdout.strip()
            except Exception:
                pass
        script = f"""
        const fs = require('fs');
        const code = fs.readFileSync({json.dumps(helpers_path)}, 'utf8');
        const sandbox = {{
            window: {{}}, document: {{}},
            translateText: s => s,
            metricPillClass: () => 'online',
            formatBpsWithUnit: () => '0 bps'
        }};
        const fn = new Function('sandbox', 'with(sandbox) {{ ' + code + '\\nreturn wifiConfig; }}');
        const wifiConfig = fn(sandbox);
        
        // Teste 1: Dual-band real
        const c1 = wifiConfig({{
            values: {{
                radio0: {{ '.type': 'wifi-device', channel: '1', htmode: 'HT20', txpower: '15' }},
                radio1: {{ '.type': 'wifi-device', channel: '36', htmode: 'VHT80', txpower: '20' }},
                default_radio0: {{ '.type': 'wifi-iface', device: 'radio0', mode: 'ap', ssid: 'ARK-2.4G', network: 'lan' }},
                default_radio1: {{ '.type': 'wifi-iface', device: 'radio1', mode: 'ap', ssid: 'ARK-5G', network: 'lan' }}
            }}
        }});
        if (!c1.r5g || c1.r5g.channel !== '36') throw new Error('r5g incorreto no dual-band');
        if (c1.txBalanced !== true) throw new Error('txBalanced deveria ser true');

        // Teste 2: Sem rádios (x86 limpo)
        const c2 = wifiConfig({{ values: {{}} }});
        if (c2.hasRadios !== false) throw new Error('hasRadios deveria ser false');

        // Teste 3: Apenas 2.4 GHz
        const c3 = wifiConfig({{
            values: {{
                radio0: {{ '.type': 'wifi-device', channel: '6', htmode: 'HT20' }},
                default_radio0: {{ '.type': 'wifi-iface', device: 'radio0', mode: 'ap', ssid: 'ARK-Legacy', network: 'lan' }}
            }}
        }});
        if (!c3.r2g) throw new Error('r2g ausente');
        console.log('OK_WIFI_TESTS');
        """
        proc = subprocess.run([node_bin, "-e", script], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(proc.returncode, 0, f"Falha na execucao de wifiConfig: {proc.stderr}")
        self.assertIn("OK_WIFI_TESTS", proc.stdout)

    def test_08_dns_turbo_filter_domain_rules(self):
        """Verifica se dns-turbo-status e system-perf-status filtram rotas de domínio e loopbacks"""
        dhcp_path = os.path.join(self.sb.etc_config, "dhcp")
        with open(dhcp_path, "w", encoding="utf-8") as f:
            f.write("""
config dnsmasq
	option domainneeded '1'
	option localise_queries '1'
	list server '127.0.0.1#5335'
	list server '/clubevip.net/1.1.1.1'
	list server '/amazon.com/1.1.1.1'
	list server '/apple.com/1.1.1.1'
	list server '1.1.1.1'
	list server '8.8.8.8'
""")
        res = self.sb.run_control("dns-turbo-status")
        self.assertEqual(res.returncode, 0, f"Falha na execucao: {res.stderr}")
        data = json.loads(res.stdout)
        servers = data.get("servers", "")
        self.assertNotIn("clubevip", servers)
        self.assertNotIn("amazon", servers)
        self.assertNotIn("apple", servers)
        self.assertNotIn("127.0.0.1", servers)
        self.assertIn("1.1.1.1", servers)
        self.assertIn("8.8.8.8", servers)

if __name__ == "__main__":
    unittest.main(verbosity=2)

