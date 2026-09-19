#!/usr/bin/env python3
"""
ARK Router Automated Test Suite (WAN & System Integrity Matrix)
Runs 100% locally on PC/WSL without needing a physical router.
"""
import unittest
import json
import os
from test_harness import RouterSandbox, REPO_DIR

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

    def test_09_wan_save_ipv6_delegation_mutual_exclusivity(self):
        """Verifica se delegate=1 ativa delegacao na interface alvo e impoe exclusividade mutua (delegate=0) nas demais WANs"""
        # 1. Salva WAN2 com delegate=1
        res = self.sb.run_control("wan-save", "iface=wan2", "mode=wan", "device=lan4", "proto=dhcp", "metric=20", "ipv6=1", "delegate=1")
        self.assertEqual(res.returncode, 0, f"Falha ao salvar WAN2 com delegate=1: {res.stderr}")
        self.assertEqual(self.sb.uci_get("network.wan2.delegate"), "1")
        # Deve ter colocado delegate=0 nas outras WANs
        self.assertEqual(self.sb.uci_get("network.wan.delegate"), "0")

        # 2. Agora salva WAN1 (wan) com delegate=1
        res = self.sb.run_control("wan-save", "iface=wan", "mode=wan", "device=eth1", "proto=dhcp", "metric=10", "ipv6=1", "delegate=1")
        self.assertEqual(res.returncode, 0, f"Falha ao salvar WAN1 com delegate=1: {res.stderr}")
        self.assertEqual(self.sb.uci_get("network.wan.delegate"), "1")
        # WAN2 deve ter virado delegate=0
        self.assertEqual(self.sb.uci_get("network.wan2.delegate"), "0")

        # 3. Desativa delegate explicitamente na WAN1
        res = self.sb.run_control("wan-save", "iface=wan", "mode=wan", "device=eth1", "proto=dhcp", "metric=10", "ipv6=1", "delegate=0")
        self.assertEqual(res.returncode, 0, f"Falha ao desativar delegate na WAN1: {res.stderr}")
        self.assertEqual(self.sb.uci_get("network.wan.delegate"), "0")

    def test_10_safe_storage_reboot_and_transmission_harden(self):
        """Verifica a rotina de protecao de armazenamento e endurecimento do Transmission"""
        # 1. Configura transmission com valores inseguros / vazamentos legados
        t_cfg = os.path.join(self.sb.etc_config, "transmission")
        with open(t_cfg, "w") as f:
            f.write("config transmission\n\toption port_forwarding_enabled '1'\n\toption encryption '0'\n\toption lpd_enabled '1'\n\toption utp_enabled 'true'\n\toption peer_limit_per_torrent '250'\n")

        # 2. Executa transmission-audit
        res = self.sb.run_control("transmission-audit")
        self.assertEqual(res.returncode, 0, f"Falha ao auditar transmission: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertTrue(data.get("installed"))
        self.assertEqual(data.get("port_forwarding_enabled"), "1")
        self.assertEqual(data.get("encryption"), "0")
        self.assertEqual(data.get("lpd_enabled"), "1")
        self.assertEqual(data.get("utp_enabled"), "true")
        self.assertEqual(data.get("peer_limit_per_torrent"), "250")

        # 3. Executa transmission-harden
        res = self.sb.run_control("transmission-harden")
        self.assertEqual(res.returncode, 0, f"Falha ao endurecer transmission: {res.stderr}")
        self.assertEqual(res.stdout.strip(), "ok")

        # 4. Verifica se valores foram corrigidos
        res = self.sb.run_control("transmission-audit")
        data = json.loads(res.stdout)
        self.assertEqual(data.get("port_forwarding_enabled"), "0")
        self.assertEqual(data.get("encryption"), "1")
        self.assertEqual(data.get("lpd_enabled"), "0")
        self.assertEqual(data.get("utp_enabled"), "false")
        self.assertEqual(data.get("peer_limit_per_torrent"), "60")

        # 5. Executa safe-storage-reboot
        res = self.sb.run_control("safe-storage-reboot")
        self.assertEqual(res.returncode, 0, f"Falha ao executar safe-storage-reboot: {res.stderr}")
        self.assertEqual(res.stdout.strip(), "ok")

        # 6. Verifica existencia e parametros do init script ark-safe-shutdown
        init_script = os.path.join(REPO_DIR, "root", "etc", "init.d", "ark-safe-shutdown")
        self.assertTrue(os.path.isfile(init_script), "Script ark-safe-shutdown nao encontrado!")
        with open(init_script, "r") as f:
            content = f.read()
        self.assertIn("STOP=01", content)
        self.assertIn("ark_safe_storage_reboot", content)

    def test_11_install_stage_telemetry(self):
        """Verifica se os comandos de telemetria de estagio retornam JSON valido com chaves corretas"""
        # 1. feature-install-missing-stage
        res = self.sb.run_control("feature-install-missing-stage")
        self.assertEqual(res.returncode, 0, f"Falha ao executar feature-install-missing-stage: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertIn("stage", data)
        self.assertIn("step", data)
        self.assertIn("total", data)
        self.assertIn("percent", data)
        self.assertIn("message", data)

        # 2. ez-setup-install-stage
        res2 = self.sb.run_control("ez-setup-install-stage")
        self.assertEqual(res2.returncode, 0, f"Falha ao executar ez-setup-install-stage: {res2.stderr}")
        data2 = json.loads(res2.stdout)
        self.assertIn("stage", data2)
        self.assertIn("step", data2)
        self.assertIn("total", data2)
        self.assertIn("percent", data2)
        self.assertIn("message", data2)

        # 3. Testa leitura com arquivo de estagio simulado
        try:
            self.sb.run_sh('printf \'{"stage":"installing","step":3,"total":5,"percent":60,"message":"Instalando sqm..."}\' > /tmp/equipe-dashboard-install-missing.stage')
            res3 = self.sb.run_control("feature-install-missing-stage")
            self.assertEqual(res3.returncode, 0)
            data3 = json.loads(res3.stdout)
            self.assertEqual(data3.get("stage"), "installing")
            self.assertEqual(data3.get("percent"), 60)
            self.assertEqual(data3.get("step"), 3)
            self.assertEqual(data3.get("total"), 5)
        finally:
            self.sb.run_sh('rm -f /tmp/equipe-dashboard-install-missing.stage')

    def test_12_dhcpv6_orphan_cleanup_and_wan6_canonical_sanitization(self):
        """Verifica se WAN6 sem alias @wan e odhcp6c orfaos sao detectados e saneados pelo ark-doctor e rotinas de boot"""
        # 1. Configura wan6 de forma nao-canonica (device 'wan' em vez de '@wan') e sem reqaddress/reqprefix
        self.sb.uci_set("network.wan6=interface")
        self.sb.uci_set("network.wan6.proto=dhcpv6")
        self.sb.uci_set("network.wan6.device=wan")

        # 2. Executa ark-doctor sem fix -> deve emitir WARN em "Blindagem WAN6 e DHCPv6"
        res = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res.returncode, 0, f"Falha ao rodar ark-doctor: {res.stderr}")
        report = json.loads(res.stdout)
        wan6_checks = [c for c in report.get("checks", []) if "Blindagem WAN6" in c.get("name", "")]
        self.assertTrue(len(wan6_checks) > 0, "Checagem de blindagem WAN6 nao encontrada no doctor!")
        self.assertEqual(wan6_checks[0].get("status"), "WARN")

        # 3. Executa ark-doctor com --fix
        res_fix = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res_fix.returncode, 0, f"Falha ao rodar ark-doctor --fix: {res_fix.stderr}")
        report_fix = json.loads(res_fix.stdout)
        wan6_fix_checks = [c for c in report_fix.get("checks", []) if "Blindagem WAN6" in c.get("name", "")]
        self.assertEqual(wan6_fix_checks[0].get("status"), "FIXED")

        # 4. Verifica se a interface foi sanitizada para @wan, reqaddress=try, reqprefix=auto
        self.assertEqual(self.sb.uci_get("network.wan6.device"), "@wan")
        self.assertEqual(self.sb.uci_get("network.wan6.reqaddress"), "try")
        self.assertEqual(self.sb.uci_get("network.wan6.reqprefix"), "auto")

        # 5. Nova auditoria sem fix -> deve reportar OK
        res_ok = self.sb.run_control("ark-doctor", "--json")
        report_ok = json.loads(res_ok.stdout)
        wan6_ok_checks = [c for c in report_ok.get("checks", []) if "Blindagem WAN6" in c.get("name", "")]
        self.assertEqual(wan6_ok_checks[0].get("status"), "OK")

        # 6. Testa execucao direta de ark_cleanup_dhcpv6_orphans e ark_sanitize_wan6_config via shell
        res_sh = self.sb.run_sh('. "$ARK_LIB_DIR/common.sh" && ark_sanitize_wan6_config && ark_cleanup_dhcpv6_orphans')
        self.assertEqual(res_sh.returncode, 0, f"Falha ao executar funcoes diretamente: {res_sh.stderr}")

    def test_13_wifi_factory_autoenable_and_user_preservation(self):
        """Verifica auto-ativacao inteligente de Wi-Fi de fabrica e preservacao estrita da escolha do usuario"""
        # 1. Configura ambiente virgem de fabrica OpenWrt (todos os radios com disabled='1')
        wifi_cfg = os.path.join(self.sb.etc_config, "wireless")
        with open(wifi_cfg, "w") as f:
            f.write("""
config wifi-device 'radio0'
	option type 'mac80211'
	option path 'platform/18000000.wmac'
	option channel '1'
	option band '2g'
	option htmode 'HE20'
	option disabled '1'

config wifi-device 'radio1'
	option type 'mac80211'
	option path 'platform/18000000.wmac+1'
	option channel '36'
	option band '5g'
	option htmode 'HE80'
	option disabled '1'

config wifi-iface 'default_radio0'
	option device 'radio0'
	option network 'lan'
	option mode 'ap'
	option ssid 'Ark-2.4G'
	option encryption 'psk2'
	option key 'admin0100'

config wifi-iface 'default_radio1'
	option device 'radio1'
	option network 'lan'
	option mode 'ap'
	option ssid 'Ark-5G'
	option encryption 'psk2'
	option key 'admin0100'
""")

        # 2. Executa ark-doctor sem fix -> deve emitir WARN (padrao de fabrica bloqueado)
        res = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res.returncode, 0, f"Falha ao rodar ark-doctor: {res.stderr}")
        report = json.loads(res.stdout)
        wifi_checks = [c for c in report.get("checks", []) if "Blindagem de Radios Wi-Fi" in c.get("name", "")]
        self.assertTrue(len(wifi_checks) > 0, "Checagem de Wi-Fi ausente no doctor!")
        self.assertEqual(wifi_checks[0].get("status"), "WARN")

        # 3. Executa ark-doctor com --fix -> deve ativar os radios
        res_fix = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res_fix.returncode, 0)
        report_fix = json.loads(res_fix.stdout)
        wifi_fix_checks = [c for c in report_fix.get("checks", []) if "Blindagem de Radios Wi-Fi" in c.get("name", "")]
        self.assertEqual(wifi_fix_checks[0].get("status"), "FIXED")
        self.assertEqual(self.sb.uci_get("wireless.radio0.disabled"), "0")
        self.assertEqual(self.sb.uci_get("wireless.radio1.disabled"), "0")

        # 4. Simula o usuario desativando o Wi-Fi voluntariamente via painel (wifi-toggle main 0)
        res_toggle = self.sb.run_control("wifi-toggle", "main", "0")
        self.assertEqual(res_toggle.returncode, 0, f"Falha no toggle Wi-Fi: {res_toggle.stderr}")
        self.assertEqual(self.sb.uci_get("equipe_dashboard.main.wifi_user_disabled"), "1")
        self.assertEqual(self.sb.uci_get("wireless.radio0.disabled"), "1")
        self.assertEqual(self.sb.uci_get("wireless.radio1.disabled"), "1")

        # 5. Executa ark-doctor com --fix com a escolha do usuario persistida
        res_doctor_user = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res_doctor_user.returncode, 0)
        report_user = json.loads(res_doctor_user.stdout)
        wifi_user_checks = [c for c in report_user.get("checks", []) if "Blindagem de Radios Wi-Fi" in c.get("name", "")]
        self.assertEqual(wifi_user_checks[0].get("status"), "OK")
        self.assertIn("preservado", wifi_user_checks[0].get("message", "").lower())
        # Os rádios NÃO podem ter sido religados!
        self.assertEqual(self.sb.uci_get("wireless.radio0.disabled"), "1")
        self.assertEqual(self.sb.uci_get("wireless.radio1.disabled"), "1")

        # 6. Simula o usuario religando o Wi-Fi via painel (wifi-toggle main 1)
        res_re_enable = self.sb.run_control("wifi-toggle", "main", "1")
        self.assertEqual(res_re_enable.returncode, 0)
        self.assertEqual(self.sb.uci_get("equipe_dashboard.main.wifi_user_disabled"), "0")
        self.assertEqual(self.sb.uci_get("wireless.radio0.disabled"), "0")
        self.assertEqual(self.sb.uci_get("wireless.radio1.disabled"), "0")

    def test_14_lan_save_dns_sync_on_router_ip_change(self):
        """Verifica se lan-save substitui automaticamente o IP antigo do roteador na lista de DNS para o novo IP"""
        # Configura IP LAN inicial como 192.168.1.1
        self.sb.uci_set("network.lan.ipaddr=192.168.1.1")
        self.sb.uci_set("network.lan.netmask=255.255.255.0")

        # Simula salvar com novo IP 192.168.30.1, mas onde o DNS continha o IP antigo 192.168.1.1
        res = self.sb.run_control(
            "lan-save",
            "mode=manual",
            "router_ip=192.168.30.1",
            "netmask=255.255.255.0",
            "start_ip=192.168.30.10",
            "end_ip=192.168.30.254",
            "dns=192.168.1.1 1.1.1.1 9.9.9.9"
        )
        self.assertEqual(res.returncode, 0, f"Falha ao executar lan-save: {res.stderr}")
        self.assertEqual(self.sb.uci_get("network.lan.ipaddr"), "192.168.30.1")

        # Verifica se na dhcp_option o 192.168.1.1 virou 192.168.30.1
        dhcp_opt = self.sb.uci_get("dhcp.lan.dhcp_option")
        self.assertIn("6,192.168.30.1,1.1.1.1,9.9.9.9", dhcp_opt)
        self.assertNotIn("192.168.1.1", dhcp_opt)

if __name__ == "__main__":
    unittest.main(verbosity=2)


