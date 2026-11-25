#!/usr/bin/env python3
"""Suite de regressao para as correcoes P0 e P1 do Super Manual ARK Panel."""
import json
import os
import subprocess
import unittest
from pathlib import Path

from test_harness import RouterSandbox

REPO = Path(__file__).resolve().parents[1]


class TestSuperManualP0Fixes(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()
        self.root = Path(self.sb.temp_dir)

    def tearDown(self):
        self.sb.cleanup()

    def spy(self, name, body):
        path = Path(self.sb.bin_dir) / name
        path.unlink(missing_ok=True)
        path.write_text("#!/bin/sh\n" + body + "\n", encoding="utf-8")
        path.chmod(0o755)

    def test_01_starlink_cgi_blocks_unauth_mutation_and_wan_injection(self):
        cgi = REPO / "root/www/cgi-bin/ark-starlink-telemetry"
        self.sb.uci_set("equipe_dashboard.starlink=starlink")
        self.sb.uci_set("equipe_dashboard.starlink.public_view=1")

        res = self.sb.run_sh(
            f'REMOTE_ADDR=127.0.0.1 REQUEST_METHOD=GET QUERY_STRING="action=set_active&wan=wan1" /bin/sh "{cgi}"'
        )
        self.assertEqual(res.returncode, 0, res.stderr)
        body = res.stdout.split("\r\n\r\n", 1)[-1].split("\n\n", 1)[-1].strip()
        data = json.loads(body)
        self.assertFalse(data.get("ok", True))
        self.assertIn("somente leitura", data.get("error", "").lower())

        # Tentativa de injecao JSON via sufixo em wan= na acao query -> rejeitada com WAN invalida
        res_inj = self.sb.run_sh(
            f'REMOTE_ADDR=127.0.0.1 REQUEST_METHOD=GET QUERY_STRING=\'action=query&wan=wan1","injected":true,"a":"b\' /bin/sh "{cgi}"'
        )
        self.assertEqual(res_inj.returncode, 0, res_inj.stderr)
        body_inj = res_inj.stdout.split("\r\n\r\n", 1)[-1].split("\n\n", 1)[-1].strip()
        data_inj = json.loads(body_inj)
        self.assertFalse(data_inj.get("ok", True))
        self.assertNotIn("injected", data_inj)
        self.assertIn("wan inválida", data_inj.get("error", "").lower())

    def test_02_starlink_libexec_no_insecure_tls_and_elf_check(self):
        src = (REPO / "root/usr/libexec/ark-starlink-telemetry").read_text(encoding="utf-8")
        self.assertNotIn("--no-check-certificate", src)
        self.assertIn("ARK_STARLINK_DISH_SHA256", src)
        self.assertIn("ELF", src)

    def test_03_starlink_dnat_scoped_to_local_and_fw4_include(self):
        src = (REPO / "root/usr/lib/ark/modules/starlink.sh").read_text(encoding="utf-8")
        self.assertIn("fib daddr type local", src)
        self.assertIn("ip daddr 127.0.0.1", src)
        self.assertIn("firewall.ark_starlink=include", src)
        self.assertIn("firewall.ark_starlink.fw4_compatible='1'", src)

    def test_04_ksmbd_blocks_wan_guest_or_empty_users_and_no_fake_64gb(self):
        src = (REPO / "root/usr/lib/ark/modules/storage_wol.sh").read_text(encoding="utf-8")
        self.assertNotIn('"64 GB"', src)
        self.assertNotIn('"4.2 GB"', src)
        self.assertNotIn('"59.8 GB"', src)
        self.assertIn("fsck.exfat", src)
        self.assertIn("fsck.fat", src)

        # Guest ativo -> bloqueia abrir WAN
        self.sb.uci_set("ksmbd.@globals[0]=globals")
        self.sb.uci_set("ksmbd.@globals[0].guest_ok=1")
        r1 = self.sb.run_control("ksmbd-interface-access", "wan", "1")
        self.assertNotEqual(r1.returncode, 0)
        self.assertIn("BLOQUEIO DE SEGURANCA", r1.stderr)

        # guest_ok=0 porem sem ksmbdpwd.db -> ainda bloqueia
        self.sb.uci_set("ksmbd.@globals[0].guest_ok=0")
        r2 = self.sb.run_control("ksmbd-interface-access", "wan", "1")
        self.assertNotEqual(r2.returncode, 0)
        self.assertIn("BLOQUEIO DE SEGURANCA", r2.stderr)

        # Com usuario autenticado e guest_ok=0 -> permite WAN; tentar reativar guest_ok=1 bloqueia
        ksmbd_dir = self.root / "etc/ksmbd"
        ksmbd_dir.mkdir(parents=True, exist_ok=True)
        (ksmbd_dir / "ksmbdpwd.db").write_text("admin:hashed\n", encoding="utf-8")
        r3 = self.sb.run_control("ksmbd-interface-access", "wan", "1")
        self.assertEqual(r3.returncode, 0, r3.stderr)
        r4 = self.sb.run_control("ksmbd-config-save", "WORKGROUP", "ARK NAS", "1", "0")
        self.assertNotEqual(r4.returncode, 0)
        self.assertIn("BLOQUEIO DE SEGURANCA", r4.stderr)

    def test_05_probe_disconnect_rejects_injection_and_uses_argv(self):
        script = REPO / "root/usr/sbin/ark-probe-disconnect"
        src = script.read_text(encoding="utf-8")
        self.assertIn("sys.argv[1]", src)
        self.assertNotIn('"""${TARGET}"""', src)

        marker = self.root / "pwned_marker"
        res = subprocess.run(
            ["/bin/sh", str(script), "probe", f"1.1.1.1');open('{marker}','w').write('x')#", "80", "100"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        self.assertNotEqual(res.returncode, 0)
        self.assertFalse(marker.exists())

    def test_06_ipv6_only_to_ipv4_only_clears_dhcp_lan_ignore(self):
        self.sb.uci_set("equipe_dashboard.ipv6=ipv6")
        self.sb.uci_set("equipe_dashboard.ipv6.mode=ipv6_only")
        self.sb.uci_set("dhcp.lan=dhcp")
        self.sb.uci_set("dhcp.lan.ignore=1")
        self.sb.uci_set("dhcp.lan.ra=server")

        res = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/network_ipv6_mwan.sh"\n'
            'set_ipv6_mode ipv4_only\n'
        )
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertNotEqual(self.sb.uci_get("dhcp.lan.ignore"), "1")

        # Ao ativar ipv6_only, deve limpar relay e manter ra/dhcpv6 server
        self.sb.uci_set("equipe_dashboard.ipv6.relay=1")
        res2 = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/network_ipv6_mwan.sh"\n'
            'set_ipv6_mode ipv6_only\n'
        )
        self.assertEqual(res2.returncode, 0, res2.stderr)
        self.assertEqual(self.sb.uci_get("equipe_dashboard.ipv6.relay"), "0")
        self.assertEqual(self.sb.uci_get("dhcp.lan.ra"), "server")
        self.assertEqual(self.sb.uci_get("dhcp.lan.dhcpv6"), "server")
        self.assertEqual(self.sb.uci_get("dhcp.lan.ndp"), "disabled")

    def test_07_ipv6_expand_prefix64_normalizes_compressed_gua(self):
        res = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            'printf "%s\\n" "2001:db8::1/64" "2001:0db8:0:0::1" "2001:db8:0:0::/64" "fe80::1" "fd12:3456::1" | ark_ipv6_expand_prefix64\n'
        )
        self.assertEqual(res.returncode, 0, res.stderr)
        lines = [line.strip() for line in res.stdout.splitlines() if line.strip()]
        self.assertEqual(
            lines,
            ["2001:0db8:0000:0000", "2001:0db8:0000:0000", "2001:0db8:0000:0000"],
        )

    def test_08_device_limits_offload_snapshot_restore_and_doctor_guard(self):
        self.spy("nft", "exit 0")
        # Desativa SQM e 2a WAN (mwan3) padrao do sandbox para validar restauracao Single-WAN de Flow Offloading
        self.sb.uci_set("sqm.wan1.enabled=0")
        self.sb.uci_set("sqm.wan2.enabled=0")
        self.sb.uci_set("mwan3.wan2.enabled=0")
        self.sb.uci_set("firewall.@defaults[0].flow_offloading=1")
        self.sb.uci_set("firewall.@defaults[0].flow_offloading_hw=1")
        self.sb.uci_set("equipe_devices.dev1=device")
        self.sb.uci_set("equipe_devices.dev1.mac=AA:BB:CC:DD:EE:01")
        self.sb.uci_set("equipe_devices.dev1.limit_enabled=1")
        self.sb.uci_set("equipe_devices.dev1.limit_down=20")
        self.sb.uci_set("equipe_devices.dev1.limit_up=10")
        self.sb.uci_set("dhcp.h1=host")
        self.sb.uci_set("dhcp.h1.mac=aa:bb:cc:dd:ee:01")
        self.sb.uci_set("dhcp.h1.ip=192.168.1.50")

        # Helper deve detectar limite ativo
        r_chk = self.sb.run_sh('. "$ARK_LIB_DIR/common.sh"; ark_has_active_device_limits')
        self.assertEqual(r_chk.returncode, 0)

        # Aplicar limites -> snapshot e desativa Flow Offloading
        r_on = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/devices.sh"\n'
            'apply_device_bandwidth_limits\n'
        )
        self.assertEqual(r_on.returncode, 0, r_on.stderr)
        self.assertEqual(self.sb.uci_get("firewall.@defaults[0].flow_offloading"), "0")
        self.assertEqual(self.sb.uci_get("firewall.@defaults[0].flow_offloading_hw"), "0")
        self.assertEqual(self.sb.uci_get("equipe_devices.ark_offload_snapshot.saved_flow_offloading"), "1")
        self.assertEqual(self.sb.uci_get("equipe_devices.ark_offload_snapshot.saved_flow_offloading_hw"), "1")

        # Desativar limites sem SQM -> restaura Flow Offloading a partir do snapshot
        self.sb.uci_set("equipe_devices.dev1.limit_enabled=0")
        r_off = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/devices.sh"\n'
            'apply_device_bandwidth_limits\n'
        )
        self.assertEqual(r_off.returncode, 0, r_off.stderr)
        self.assertEqual(self.sb.uci_get("firewall.@defaults[0].flow_offloading"), "1")
        self.assertEqual(self.sb.uci_get("firewall.@defaults[0].flow_offloading_hw"), "1")
        self.assertIsNone(self.sb.uci_get("equipe_devices.ark_offload_snapshot.saved_flow_offloading"))

        # Com SQM ativo, desativar limites NAO pode religar Flow Offloading
        self.sb.uci_set("equipe_devices.dev1.limit_enabled=1")
        self.sb.run_sh('. "$ARK_LIB_DIR/common.sh"; . "$ARK_LIB_DIR/modules/devices.sh"; apply_device_bandwidth_limits')
        self.sb.uci_set("sqm.wan1.enabled=1")
        self.sb.uci_set("equipe_devices.dev1.limit_enabled=0")
        self.sb.run_sh('. "$ARK_LIB_DIR/common.sh"; . "$ARK_LIB_DIR/modules/devices.sh"; apply_device_bandwidth_limits')
        self.assertEqual(self.sb.uci_get("firewall.@defaults[0].flow_offloading"), "0")

        # Doctor guarda offload contra limites ativos e AP/HUB
        doc_src = (REPO / "root/usr/lib/ark/modules/doctor.sh").read_text(encoding="utf-8")
        self.assertIn("ark_has_active_device_limits", doc_src)
        self.assertIn("is_ap_or_hub", doc_src)

    def test_09_dscp_nft_and_sqm_cap_udp_512b_and_exclude_vpn_cone_nat(self):
        nft_src = (REPO / "root/etc/nftables.d/15-ark-dscp-priority.nft").read_text(encoding="utf-8")
        self.assertIn("meta length <= 512 ip dscp set cs4", nft_src)
        self.assertIn('"wg*"', nft_src)
        self.assertIn('"zt*"', nft_src)
        self.assertIn('"tailscale*"', nft_src)

        sqm_src = (REPO / "root/usr/lib/ark/modules/sqm.sh").read_text(encoding="utf-8")
        self.assertIn("echo 0 > \"$bql_f\"", sqm_src)
        self.assertIn("/etc/init.d/ark-hardware-tune reload", sqm_src)
        self.assertIn("ARK_IN_HARDWARE_TUNE", sqm_src)
        self.assertIn('[ -f "$bql_state" ]', sqm_src)
        self.assertIn("target 5ms interval 100ms ecn", sqm_src)
        self.assertEqual(sqm_src.count("meta length <= 512 ip dscp set cs4"), 3)
        self.assertEqual(sqm_src.count("meta length <= 512 ip6 dscp set cs4"), 3)

        aht_src = (REPO / "root/etc/init.d/ark-hardware-tune").read_text(encoding="utf-8")
        self.assertIn("ARK_IN_HARDWARE_TUNE=1 ark_sync_gaming_ports_and_bql", aht_src)

    def test_10_babyjumbo_lock_safety_and_manual_mtu_preserved(self):
        bj_src = (REPO / "root/etc/hotplug.d/iface/05-ark-pppoe-babyjumbo").read_text(encoding="utf-8")
        self.assertIn("ARK_MUTATION_LOCK_HELD", bj_src)
        self.assertIn("_ark_has_mut_lock", bj_src)
        self.assertIn("-M 'do'", bj_src)
        self.assertIn("traceroute -4 -n -m 3 -q 1 -w 1 -F", bj_src)

        ipup_src = (REPO / "root/etc/ppp/ip-up.d/99-ark-mtu").read_text(encoding="utf-8")
        self.assertIn("mtu_mode", ipup_src)
        self.assertIn("req_mtu + 8", ipup_src)

    def test_11_sqm_memlimit_k_regex_and_gigabit_sanitize_guard(self):
        doc_src = (REPO / "root/usr/lib/ark/modules/doctor.sh").read_text(encoding="utf-8")
        san_src = (REPO / "root/etc/uci-defaults/99-ark-router-dhcp-sanitize").read_text(encoding="utf-8")
        self.assertNotIn("memlimit [0-9]*[Mm][Bb]*", doc_src)
        self.assertNotIn("memlimit [0-9]*[Mm][Bb]*", san_src)
        self.assertIn("memlimit [0-9]*[kKmMgGbB]*", doc_src)
        self.assertIn("memlimit [0-9]*[kKmMgGbB]*", san_src)
        self.assertIn("_sq_is_gigabit", san_src)

        # Validacao real da regex sed com 512K
        r = self.sb.run_sh("printf 'diffserv4 memlimit 512K ingress' | sed 's/memlimit [0-9]*[kKmMgGbB]*/memlimit 4M/g'")
        self.assertEqual(r.stdout.strip(), "diffserv4 memlimit 4M ingress")

    def test_12_wifi_enhancer_roaming_toggle_and_doctor_inverted_radios(self):
        wifi_src = (REPO / "root/usr/lib/ark/modules/wifi.sh").read_text(encoding="utf-8")
        self.assertNotIn("wifi-roaming-sync", wifi_src)
        self.assertIn('handle_wifi "wifi-roaming-toggle" "1"', wifi_src)

        doc_src = (REPO / "root/usr/lib/ark/modules/doctor.sh").read_text(encoding="utf-8")
        self.assertEqual(doc_src.count("wifi reload; rm -f"), 1)

        # Cenario real de radios invertidos: radio0=5g, radio1=2g
        self.sb.uci_set("wireless.radio0=wifi-device")
        self.sb.uci_set("wireless.radio0.band=5g")
        self.sb.uci_set("wireless.radio0.channel=36")
        self.sb.uci_set("wireless.radio1=wifi-device")
        self.sb.uci_set("wireless.radio1.band=2g")
        self.sb.uci_set("wireless.radio1.channel=6")
        self.sb.uci_set("wireless.default_radio0=wifi-iface")
        self.sb.uci_set("wireless.default_radio0.device=radio0")
        self.sb.uci_set("wireless.default_radio0.mode=ap")
        self.sb.uci_set("wireless.default_radio0.ssid=ARK-5G")
        self.sb.uci_set("wireless.default_radio1=wifi-iface")
        self.sb.uci_set("wireless.default_radio1.device=radio1")
        self.sb.uci_set("wireless.default_radio1.mode=ap")
        self.sb.uci_set("wireless.default_radio1.ssid=ARK-2G")

        res = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res.returncode, 0, res.stderr)
        # radio0 e 5 GHz -> multicast_to_unicast=1 e NAO deve receber dtim_period=1
        self.assertEqual(self.sb.uci_get("wireless.default_radio0.multicast_to_unicast"), "1")
        self.assertNotEqual(self.sb.uci_get("wireless.default_radio0.dtim_period"), "1")
        # radio1 e 2.4 GHz -> multicast_to_unicast=0 e dtim_period=1
        self.assertEqual(self.sb.uci_get("wireless.default_radio1.multicast_to_unicast"), "0")
        self.assertEqual(self.sb.uci_get("wireless.default_radio1.dtim_period"), "1")

    def test_13_sqm_preserves_adblock_cloud_and_restore_respects_doh_pref(self):
        # AdBlock Cloud ativo -> ark_sync_sqm_gaming_dns NAO pode destruir 127.0.0.1#5053
        self.sb.uci_set("equipe_perf.settings=performance")
        self.sb.uci_set("equipe_perf.settings.adblock_cloud=adguard_dns")
        self.sb.uci_set("equipe_perf.settings.dns_doh_enabled=1")
        self.sb.uci_set("dhcp.@dnsmasq[0].server=127.0.0.1#5053")

        r1 = self.sb.run_sh('. "$ARK_LIB_DIR/common.sh"; . "$ARK_LIB_DIR/modules/sqm.sh"; ark_sync_sqm_gaming_dns')
        self.assertEqual(r1.returncode, 0, r1.stderr)
        self.assertEqual(self.sb.uci_get("equipe_perf.settings.dns_doh_enabled"), "1")
        self.assertIn("127.0.0.1#5053", self.sb.uci_get("dhcp.@dnsmasq[0].server") or "")

        # adblock_restore_dns com dns_doh_enabled=0 -> restaura DNS direto, sem ativar DoH
        self.sb.uci_set("equipe_perf.settings.dns_doh_enabled=0")
        self.sb.uci_set("equipe_perf.settings.saved_dns_servers=1.1.1.1 9.9.9.9")
        r2 = self.sb.run_sh('. "$ARK_LIB_DIR/common.sh"; . "$ARK_LIB_DIR/modules/adblock.sh"; adblock_restore_dns')
        self.assertEqual(r2.returncode, 0, r2.stderr)
        srvs = self.sb.uci_get("dhcp.@dnsmasq[0].server") or ""
        self.assertIn("1.1.1.1", srvs)
        self.assertIn("9.9.9.9", srvs)
        self.assertNotIn("5053", srvs)

    def test_14_adblock_yaml_sanitization_important_readback_and_rollback(self):
        ad_src = (REPO / "root/usr/lib/ark/modules/adblock.sh").read_text(encoding="utf-8")
        self.assertNotIn("ztxoohdno4", ad_src)

        agh_dir = self.root / "etc/adguardhome"
        agh_dir.mkdir(parents=True, exist_ok=True)
        agh_yaml = agh_dir / "adguardhome.yaml"
        agh_yaml.write_text("dns:\n  port: 5335\nuser_rules: []\nfilters: []\n", encoding="utf-8")

        # Injecao em blacklist e URL suja em whitelist -> YAML deve receber apenas dominios validos
        r1 = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/adblock.sh"\n'
            'adblock_apply_rules "bad.com,\';evil:true" "good.com,https://ok.org/path"\n'
        )
        self.assertEqual(r1.returncode, 0, r1.stderr)
        yaml_txt = agh_yaml.read_text(encoding="utf-8")
        self.assertIn("@@||good.com^$important", yaml_txt)
        self.assertIn("@@||ok.org^$important", yaml_txt)
        self.assertIn("||bad.com^", yaml_txt)
        self.assertNotIn("evil", yaml_txt)

        # Releitura via adblock_status_json deve ler whitelist mesmo com $important
        r_st = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/adblock.sh"\n'
            'adblock_status_json\n'
        )
        self.assertEqual(r_st.returncode, 0, r_st.stderr)
        st_data = json.loads(r_st.stdout)
        self.assertIn("good.com", st_data.get("custom_whitelist", ""))
        self.assertIn("ok.org", st_data.get("custom_whitelist", ""))
        self.assertIn("bad.com", st_data.get("custom_blacklist", ""))

        # Se AdGuardHome --check-config falhar, deve restaurar backup anterior intacto
        self.spy("AdGuardHome", "exit 1")
        r_fail = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/adblock.sh"\n'
            'adblock_apply_rules "broken.example" "__KEEP_EXISTING__"\n'
        )
        self.assertEqual(r_fail.returncode, 0, r_fail.stderr)
        yaml_after = agh_yaml.read_text(encoding="utf-8")
        self.assertNotIn("broken.example", yaml_after)
        self.assertIn("||bad.com^", yaml_after)

    def test_15_p1_hygiene_starlink_schema_wgclient_shutdown_locks(self):
        # Nenhuma referencia restante a starlink_telemetry.main.enabled
        for rel in (
            "root/usr/lib/ark/common.sh",
            "root/usr/lib/ark/modules/sqm.sh",
            "root/usr/lib/sqm/ark_hfsc_fqcodel.qos",
        ):
            txt = (REPO / rel).read_text(encoding="utf-8")
            self.assertNotIn("starlink_telemetry.main.enabled", txt)
            self.assertIn("starlink_telemetry.global.enabled", txt)

        # Daemon Starlink sem du -sb
        daemon_txt = (REPO / "root/usr/sbin/starlink-telemetry-daemon").read_text(encoding="utf-8")
        self.assertNotIn("du -sb", daemon_txt)
        self.assertIn("du -sk", daemon_txt)

        # wgclient nao configurado -> configured=false
        r_wg = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/vpn.sh"\n'
            'wireguard_client_status_json\n'
        )
        self.assertEqual(r_wg.returncode, 0, r_wg.stderr)
        wg_data = json.loads(r_wg.stdout)
        self.assertFalse(wg_data.get("configured", True))

        # Safe shutdown STOP=05 + ksmbd/starlink-telemetry + AmneziaWG + lock dir fast-path
        sd_txt = (REPO / "root/etc/init.d/ark-safe-shutdown").read_text(encoding="utf-8")
        self.assertIn("STOP=05", sd_txt)
        common_txt = (REPO / "root/usr/lib/ark/common.sh").read_text(encoding="utf-8")
        self.assertIn("ksmbd smbd", common_txt)
        self.assertIn("starlink-telemetry", common_txt)
        vpn_txt = (REPO / "root/usr/lib/ark/modules/vpn.sh").read_text(encoding="utf-8")
        self.assertIn("(wireguard|amneziawg)_wgclient", vpn_txt)
        wgs_txt = (REPO / "root/usr/sbin/ark-wireguard-wan-sync").read_text(encoding="utf-8")
        self.assertIn("amneziawg", wgs_txt)
        self.assertIn('wg_cmd="awg"', wgs_txt)
        ctrl_txt = (REPO / "root/usr/sbin/equipe-dashboard-control").read_text(encoding="utf-8")
        self.assertIn("/var/lock", ctrl_txt)


if __name__ == "__main__":
    unittest.main()
