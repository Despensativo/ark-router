#!/usr/bin/env python3
"""Suite de regressao para os 10 blocos P1 (#16-#25) do Super Manual ARK Panel."""
import unittest
from pathlib import Path

from test_harness import RouterSandbox

REPO = Path(__file__).resolve().parents[1]


class TestSuperManualP1Fixes(unittest.TestCase):
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

    def test_01_postinst_aligned_and_mutation_lock_pid_guard(self):
        mk = (REPO / "Makefile").read_text(encoding="utf-8")
        apk = (REPO / "scripts/build-apk-mac.py").read_text(encoding="utf-8")
        for token in (
            "99-ark-router-theme",
            "99-ark-router-leds",
            "99-ark-router-uhttpd",
            "99-ark-router-dhcp-sanitize",
            "ark-safe-shutdown",
            "ark-zerotier-ram",
            "ark-firewall-guard",
            "ark-hardware-tune",
            "equipe-traffic-history",
            "/etc/init.d/rpcd reload",
        ):
            self.assertIn(token, mk, f"Makefile postinst faltando {token}")
            self.assertIn(token, apk, f"build-apk-mac.py postinst faltando {token}")

        # Lock herdado de processo pai VIVO -> held (exit 0)
        r_live = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            'ARK_MUTATION_LOCK_HELD=1 ARK_MUTATION_LOCK_PID="$$" ark_mutation_lock_is_held\n'
        )
        self.assertEqual(r_live.returncode, 0)

        # Lock herdado de processo pai MORTO (ex: subshell BG orfa) -> NOT held (exit 1)
        r_dead = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            'ARK_MUTATION_LOCK_HELD=1 ARK_MUTATION_LOCK_PID="999999" ark_mutation_lock_is_held\n'
        )
        self.assertNotEqual(r_dead.returncode, 0)

    def test_02_safe_shutdown_remount_ro_and_firewall_guard_start99(self):
        common_txt = (REPO / "root/usr/lib/ark/common.sh").read_text(encoding="utf-8")
        self.assertIn("starlink-telemetry-daemon flush", common_txt)
        self.assertIn("mount -o remount,ro", common_txt)

        fwg_txt = (REPO / "root/etc/init.d/ark-firewall-guard").read_text(encoding="utf-8")
        self.assertIn("START=99", fwg_txt)

    def test_03_speedtest_fallback_zero_on_failure_and_traffic_history_fixes(self):
        self.spy("curl", "exit 1")
        self.spy("wget", "exit 1")
        r_dl = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/devices.sh"\n'
            'speedtest_download_fallback_mbps "192.0.2.10"\n'
        )
        self.assertNotEqual(r_dl.returncode, 0)
        self.assertEqual(r_dl.stdout.strip(), "0")

        r_ul = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/devices.sh"\n'
            'speedtest_upload_fallback_mbps "192.0.2.10"\n'
        )
        self.assertNotEqual(r_ul.returncode, 0)
        self.assertEqual(r_ul.stdout.strip(), "0")

        th_txt = (REPO / "root/usr/sbin/equipe-traffic-history").read_text(encoding="utf-8")
        self.assertIn("wan6|*_6", th_txt)
        self.assertIn('grep -v "^$today," "$wan_daily"', th_txt)
        self.assertNotIn("pgrep -c", th_txt)

    def test_04_wan_save_order_active_wan_and_tcp_turbo_snapshot(self):
        net_txt = (REPO / "root/usr/lib/ark/modules/network.sh").read_text(encoding="utf-8")
        self.assertIn("for ifc in $(active_wan_networks); do", net_txt)
        idx_proto = net_txt.index('apply_wan_proto "$iface"')
        idx_sqm = net_txt.index("Atualiza SQM apenas apos validacao bem-sucedida")
        self.assertLess(idx_proto, idx_sqm)
        self.assertIn("equipe_perf.tcp_turbo_snapshot.saved_rmem_max", net_txt)
        self.assertIn("ark_board_switch_wan_port", net_txt)

    def test_05_ipv6_doh_fastfail_cleanup_and_toggle_device_syncs_nat64(self):
        self.sb.uci_set("equipe_dashboard.ipv6=ipv6")
        self.sb.uci_set("equipe_dashboard.ipv6.mode=dual_stack")
        self.sb.uci_set("equipe_perf.settings=performance")
        self.sb.uci_set("equipe_perf.settings.dns_doh_enabled=0")

        r1 = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/network_ipv6_mwan.sh"\n'
            'ark_sync_ipv6_doh_fastfail\n'
        )
        self.assertEqual(r1.returncode, 0, r1.stderr)
        self.assertEqual(self.sb.uci_get("firewall.ark_doh_v6_fix.target"), "REJECT")

        # Ao ativar DoH, regra fast-fail deve ser removida
        self.sb.uci_set("equipe_perf.settings.dns_doh_enabled=1")
        r2 = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/network_ipv6_mwan.sh"\n'
            'ark_sync_ipv6_doh_fastfail\n'
        )
        self.assertEqual(r2.returncode, 0, r2.stderr)
        self.assertIsNone(self.sb.uci_get("firewall.ark_doh_v6_fix.target"))

        v6_txt = (REPO / "root/usr/lib/ark/modules/network_ipv6_mwan.sh").read_text(encoding="utf-8")
        idx_tog = v6_txt.index("toggle_ipv6_device()")
        self.assertIn("ark_sync_nat64_jool", v6_txt[idx_tog : idx_tog + 900])

    def test_06_parental_ucode_fallback_and_mac_only_firewall_redirect(self):
        dev_txt = (REPO / "root/usr/lib/ark/modules/devices.sh").read_text(encoding="utf-8")
        self.assertIn("command -v ucode", dev_txt)
        self.assertIn("AdGuardHome --check-config", dev_txt)

        # Sem AdGuard YAML -> fallback firewall deve vincular apenas src_mac (sem fixar src_ip stale)
        r = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/devices.sh"\n'
            'device_apply_parental "AA:BB:CC:DD:EE:11" "192.168.1.99" "Kids" "custom" "1" "1" ""\n'
        )
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.sb.uci_get("firewall.ark_par_aabbccddee11.src_mac"), "AA:BB:CC:DD:EE:11")
        self.assertIsNone(self.sb.uci_get("firewall.ark_par_aabbccddee11.src_ip"))

    def test_07_rps_unified_conntrack_rfc5382_and_ap_m2u(self):
        sqm_txt = (REPO / "root/usr/lib/ark/modules/sqm.sh").read_text(encoding="utf-8")
        hw_txt = (REPO / "root/usr/lib/ark/modules/system_hardware_leds.sh").read_text(encoding="utf-8")
        ct_txt = (REPO / "root/etc/sysctl.d/99-ark-conntrack.conf").read_text(encoding="utf-8")

        self.assertIn("ark_hw_compute_rps_target", sqm_txt)
        self.assertIn("ark_hw_compute_rps_target", hw_txt)
        self.assertIn("nf_conntrack_tcp_timeout_established=7440", ct_txt)
        self.assertIn('_w_m2u="0"', hw_txt)

    def test_08_wifi_aql_respects_wifi6_accel_0_and_mlo_filters_eht(self):
        aht_txt = (REPO / "root/etc/init.d/ark-hardware-tune").read_text(encoding="utf-8")
        self.assertIn('[ "$accel_en" = "0" ] && return 0', aht_txt)

        self.sb.uci_set("wireless.radio0=wifi-device")
        self.sb.uci_set("wireless.radio0.band=2g")
        self.sb.uci_set("wireless.radio0.htmode=HE40")
        self.sb.uci_set("wireless.radio1=wifi-device")
        self.sb.uci_set("wireless.radio1.band=5g")
        self.sb.uci_set("wireless.radio1.htmode=EHT160")
        self.sb.uci_set("wireless.ap_he=wifi-iface")
        self.sb.uci_set("wireless.ap_he.device=radio0")
        self.sb.uci_set("wireless.ap_he.mode=ap")
        self.sb.uci_set("wireless.ap_he.encryption=psk2")
        self.sb.uci_set("wireless.ap_eht=wifi-iface")
        self.sb.uci_set("wireless.ap_eht.device=radio1")
        self.sb.uci_set("wireless.ap_eht.mode=ap")
        self.sb.uci_set("wireless.ap_eht.encryption=psk2")

        res = self.sb.run_control("wifi-mlo-toggle", "1")
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertEqual(self.sb.uci_get("wireless.ap_eht.mld"), "mld0")
        self.assertEqual(self.sb.uci_get("wireless.ap_eht.encryption"), "sae")
        self.assertEqual(self.sb.uci_get("wireless.ap_eht.ieee80211w"), "2")
        self.assertIsNone(self.sb.uci_get("wireless.ap_he.mld"))

    def test_09_adblock_no_plaintext_wl_bypass_and_capacity_preserves_cachesize0(self):
        self.sb.uci_set("equipe_perf.settings=performance")
        self.sb.uci_set("equipe_perf.settings.adblock_enabled=1")
        self.sb.uci_set("equipe_perf.settings.adguard_enabled=1")
        self.sb.uci_set("dhcp.@dnsmasq[0].server=127.0.0.1#5335")

        r1 = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/adblock.sh"\n'
            'adblock_apply_rules "" "bank.com"\n'
        )
        self.assertEqual(r1.returncode, 0, r1.stderr)
        srvs = self.sb.uci_get("dhcp.@dnsmasq[0].server") or ""
        self.assertNotIn("/bank.com/1.1.1.1", srvs)

        r2 = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/system.sh"\n'
            'network_capacity_save 16384 500 5000 12h 7440\n'
        )
        self.assertEqual(r2.returncode, 0, r2.stderr)
        self.assertEqual(self.sb.uci_get("dhcp.@dnsmasq[0].cachesize"), "0")
        self.assertEqual(self.sb.uci_get("equipe_perf.settings.saved_dns_cachesize"), "5000")
        self.assertIsNone(self.sb.uci_get("dhcp.@dnsmasq[0].dns_forward_max"))
        ct_file = self.root / "etc/sysctl.d/99-ark-conntrack.conf"
        self.assertTrue(ct_file.is_file())
        ct_body = ct_file.read_text(encoding="utf-8")
        self.assertIn("nf_conntrack_udp_timeout=30", ct_body)
        self.assertIn("nf_conntrack_udp_timeout_stream=120", ct_body)

    def test_10_starlink_mailer_speedify_zerotier_and_amneziawg_hygiene(self):
        daemon_txt = (REPO / "root/usr/sbin/starlink-telemetry-daemon").read_text(encoding="utf-8")
        self.assertIn("v > 0 && v <= 1.0", daemon_txt)

        mailer_txt = (REPO / "root/usr/sbin/starlink-telemetry-mailer").read_text(encoding="utf-8")
        self.assertIn("^timestamp(_epoch)?,", mailer_txt)
        self.assertIn("Quedas WAN 1 salvas pela WAN 2</td><td class=\"highlight\">$saved_w2 s</td>", mailer_txt)
        self.assertIn("Quedas WAN 2 salvas pela WAN 1</td><td class=\"highlight\">$saved_w1 s</td>", mailer_txt)

        sp_txt = (REPO / "root/usr/lib/ark/modules/speedify.sh").read_text(encoding="utf-8")
        self.assertNotIn("pkill -9 -f 'speedify'", sp_txt)
        self.assertIn("pkill -9 -x speedify", sp_txt)
        self.assertIn("saved_${iface}_delegate", sp_txt)

        common_txt = (REPO / "root/usr/lib/ark/common.sh").read_text(encoding="utf-8")
        zt_ram = (REPO / "root/etc/init.d/ark-zerotier-ram").read_text(encoding="utf-8")
        vpn_txt = (REPO / "root/usr/lib/ark/modules/vpn.sh").read_text(encoding="utf-8")
        self.assertNotIn("libstdc++.so.6.0.33", common_txt)
        self.assertNotIn("libstdc++.so.6.0.33", zt_ram)
        self.assertNotIn('uci -q delete "zerotier.$sec.join"', vpn_txt)

        awg_txt = (REPO / "root/lib/netifd/proto/amneziawg.sh").read_text(encoding="utf-8")
        self.assertNotIn("IFS=$'", awg_txt)


if __name__ == "__main__":
    unittest.main()
