#!/usr/bin/env python3
"""Behavioral regression suite for Principal/Senior Engineering Audit fixes."""

import base64
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

from test_harness import RouterSandbox

REPO = Path(__file__).resolve().parents[1]


class SeniorAuditFixesTests(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_wgclient_4_granular_access_modes_isolated_from_wg0(self):
        sb = self.sb
        if True:
            sb.uci_set("dropbear.@dropbear[0]=dropbear")
            sb.uci_set("dropbear.@dropbear[0].Port=2222")

            sample_conf = (
                "[Interface]\n"
                "PrivateKey = cHJpdmF0ZWtleXNhbXBsZXRlc3QxMjM0NTY3ODkwMTI=\n"
                "Address = 10.66.66.2/32\n"
                "DNS = 1.1.1.1\n\n"
                "[Peer]\n"
                "PublicKey = cHVibGlja2V5c2FtcGxldGVzdDEyMzQ1Njc4OTAxMjM=\n"
                "Endpoint = 198.51.100.77:51820\n"
                "AllowedIPs = 0.0.0.0/0\n"
            )
            b64_conf = base64.b64encode(sample_conf.encode("utf-8")).decode("ascii")

            # 1. Import with default 'admin' mode (SSH + Web UI only, LAN isolated)
            res_imp = sb.run_control("wireguard-client-import", b64_conf, "admin", "")
            self.assertEqual(res_imp.returncode, 0, res_imp.stderr)

            st_res = sb.run_control("wireguard-client-status")
            self.assertEqual(st_res.returncode, 0, st_res.stderr)
            st = json.loads(st_res.stdout)
            self.assertEqual(st["access_mode"], "admin")
            self.assertNotIn("conf_b64", st, "wireguard-client-status must not leak PrivateKey in conf_b64")
            self.assertNotIn("cHJpdmF0ZWtleXNhbXBsZXRlc3QxMjM0NTY3ODkwMTI=", st_res.stdout)
            self.assertIn("2222", st["admin_ports"])
            self.assertIn("80", st["admin_ports"])
            self.assertIn("443", st["admin_ports"])

            # On-demand conf retrieval works for editing
            conf_res = sb.run_control("wireguard-client-conf-get")
            self.assertEqual(conf_res.returncode, 0)
            decoded_conf = base64.b64decode(json.loads(conf_res.stdout)["conf_b64"]).decode("utf-8")
            self.assertIn("cHJpdmF0ZWtleXNhbXBsZXRlc3QxMjM0NTY3ODkwMTI=", decoded_conf)

            fw_show = sb.run_sh("uci show firewall").stdout
            self.assertIn("name='wgclient_vpn'", fw_show)
            self.assertNotIn("device='wg+'", fw_show)
            self.assertIn("name='Allow-WGClient-Admin-TCP'", fw_show)
            self.assertNotIn(".dest='lan'", [ln for ln in fw_show.splitlines() if "forwarding" in ln or ".dest=" in ln and "Allow-WGClient" not in ln])

            # 2. Switch to 'isolated' (Commercial VPN: no admin rules, REJECT input/forward)
            res_iso = sb.run_control("wireguard-client-access-set", "isolated", "")
            self.assertEqual(res_iso.returncode, 0, res_iso.stderr)
            fw_iso = sb.run_sh("uci show firewall").stdout
            self.assertNotIn("Allow-WGClient-Admin-TCP", fw_iso)
            self.assertNotIn("Allow-WGClient-Range-", fw_iso)

            # 3. Switch to 'ranges' with specific LAN IPs/CIDRs
            res_rng = sb.run_control("wireguard-client-access-set", "ranges", "192.168.73.10, 192.168.73.128/25")
            self.assertEqual(res_rng.returncode, 0, res_rng.stderr)
            fw_rng = sb.run_sh("uci show firewall").stdout
            self.assertIn("Allow-WGClient-Admin-TCP", fw_rng)
            self.assertIn("Allow-WGClient-Range-1", fw_rng)
            self.assertIn("dest_ip='192.168.73.10'", fw_rng)
            self.assertIn("dest_ip='192.168.73.128/25'", fw_rng)

            # Reject invalid CIDR/IP injection
            res_bad = sb.run_control("wireguard-client-access-set", "ranges", "999.999.1.1; rm -rf /")
            self.assertNotEqual(res_bad.returncode, 0)

            # 4. Switch to 'full_lan' (Site-to-Site: full LAN forwarding enabled)
            res_full = sb.run_control("wireguard-client-access-set", "full_lan", "")
            self.assertEqual(res_full.returncode, 0, res_full.stderr)
            fw_full = sb.run_sh("uci show firewall").stdout
            self.assertIn("Allow-WGClient-Admin-TCP", fw_full)
            self.assertIn(".src='wgclient_vpn'", fw_full)
            self.assertIn(".dest='lan'", fw_full)

    def test_02_ark_theme_ro_wrapper_blocks_mutations(self):
        acl = json.loads((REPO / "root/usr/share/rpcd/acl.d/ark-theme.json").read_text(encoding="utf-8"))
        read_files = acl["luci-access"]["read"]["file"]
        self.assertEqual(list(read_files.keys()), ["/usr/libexec/ark-theme-ro"])
        self.assertNotIn("/usr/sbin/equipe-dashboard-control", read_files)

        wrapper = REPO / "root/usr/libexec/ark-theme-ro"
        for forbidden in ("reboot-prepare", "ksmbd-disk-action", "manual-update-start", "wireguard-client-delete", ""):
            p = subprocess.run(["sh", str(wrapper), forbidden], capture_output=True, text=True, timeout=5)
            self.assertNotEqual(p.returncode, 0, f"Wrapper must reject '{forbidden}'")

    def test_03_valid_plain_and_starlink_msmtp_reject_newline_injection(self):
        val_sh = REPO / "root/usr/lib/ark/validation.sh"
        cmd = f'. "{val_sh}"; valid_plain "$(printf "admin\\npasswordeval id")" 128'
        p = subprocess.run(["sh", "-c", cmd], capture_output=True, text=True, timeout=5)
        self.assertNotEqual(p.returncode, 0, "valid_plain MUST reject embedded newlines")

        sb = self.sb
        if True:
            res_nl = sb.run_control("starlink-telemetry-config-set", "smtp_pass=secret\npasswordeval id")
            self.assertNotEqual(res_nl.returncode, 0)
            res_flag = sb.run_control("starlink-telemetry-config-set", "email_to=-C/tmp/evil@example.com")
            self.assertNotEqual(res_flag.returncode, 0)

    def test_04_path_traversal_and_arbitrary_manual_update_blocked(self):
        sb = self.sb
        if True:
            res_qr = sb.run_control("wireguard-peer-qr", "../../etc/passwd")
            self.assertNotEqual(res_qr.returncode, 0)
            res_del = sb.run_control("wireguard-peer-delete", "../wgclient")
            self.assertNotEqual(res_del.returncode, 0)
            res_upd = sb.run_control("manual-update-start", "/mnt/sda1/malicious.tar.gz")
            self.assertNotEqual(res_upd.returncode, 0)

    def test_05_dsa_lan4_as_wan2_and_flow_offload_mwan3_guard(self):
        nft_txt = (REPO / "root/etc/nftables.d/15-ark-dscp-priority.nft").read_text(encoding="utf-8")
        self.assertNotIn('"lan*"', nft_txt, "15-ark-dscp-priority.nft must not treat unbridged DSA lan4 WAN2 as LAN")

        sqm_txt = (REPO / "root/usr/lib/ark/modules/sqm.sh").read_text(encoding="utf-8")
        self.assertIn('[ -e "$br_dev/master" ] || continue', sqm_txt)

        sb = self.sb
        if True:
            sb.uci_set("mwan3.wan=interface")
            sb.uci_set("mwan3.wan.enabled=1")
            sb.uci_set("mwan3.wan2=interface")
            sb.uci_set("mwan3.wan2.enabled=1")
            sb.uci_set("firewall.@defaults[0]=defaults")
            sb.uci_set("firewall.@defaults[0].flow_offloading=1")
            sb.uci_set("firewall.@defaults[0].flow_offloading_hw=1")

            res_tune = sb.run_control("system-hardware-auto-tune")
            self.assertEqual(res_tune.returncode, 0, res_tune.stderr)
            self.assertEqual(sb.uci_get("firewall.@defaults[0].flow_offloading"), "0")
            self.assertEqual(sb.uci_get("firewall.@defaults[0].flow_offloading_hw"), "0")

    def test_06_pid_cmdline_guard_and_overlay_2mb_floor(self):
        ledd = (REPO / "root/usr/sbin/ark-port-ledd").read_text(encoding="utf-8")
        self.assertIn("/proc/$oldpid/cmdline", ledd)
        self.assertNotIn("kill -9", ledd)

        hist = (REPO / "root/usr/sbin/equipe-traffic-history").read_text(encoding="utf-8")
        self.assertIn("/proc/$old_pid/cmdline", hist)
        self.assertIn("-le 2048", hist)

        swol = (REPO / "root/usr/lib/ark/modules/storage_wol.sh").read_text(encoding="utf-8")
        self.assertIn("/proc/mounts", swol)

    def test_07_frontend_xss_escape_and_multilingual_theme_parser(self):
        fmt_js = (REPO / "src/core/formatters.js").read_text(encoding="utf-8")
        self.assertIn("function arkEscapeHtml(", fmt_js)
        node_code = (
            "const fs = require('fs'), vm = require('vm');\n"
            f"const code = fs.readFileSync({json.dumps(str(REPO / 'src/core/formatters.js'))}, 'utf8');\n"
            "const ctx = { dashboardLanguage: 'pt-br', EN: {}, ES: {}, Node: { ELEMENT_NODE: 1 } };\n"
            "vm.runInNewContext(code, ctx);\n"
            "const out = ctx.arkEscapeHtml('<img src=x onerror=\"alert(1)\">');\n"
            "if (out.includes('<') || out.includes('>')) process.exit(1);\n"
        )
        p = subprocess.run(["node", "-e", node_code], capture_output=True, text=True, timeout=5)
        self.assertEqual(p.returncode, 0, p.stderr)

        theme_js = (REPO / "root/www/luci-static/ark/ark-theme.js").read_text(encoding="utf-8")
        self.assertIn("function escHtml(", theme_js)
        self.assertIn("(?:Protocolo|Protocol):", theme_js)
        self.assertIn("^(sim|yes|s[íi])$", theme_js)
        self.assertNotIn("user-scalable=no", theme_js)

    def test_08_packaging_parity_prerm_and_no_tracked_sdk_binaries(self):
        mk = (REPO / "Makefile").read_text(encoding="utf-8")
        self.assertNotIn("+speedtest-go", mk)
        self.assertIn("Package/luci-app-ark-router/prerm", mk)
        self.assertIn("/luci-static/bootstrap", mk)

        apk_py = (REPO / "scripts/build-apk-mac.py").read_text(encoding="utf-8")
        self.assertIn("license:MIT", apk_py)
        self.assertIn("pre-deinstall:", apk_py)

        ipk_py = (REPO / "scripts/build-ipk-mac.py").read_text(encoding="utf-8")
        self.assertIn('name="./prerm"', ipk_py)

        tracked_pkgs = subprocess.run(
            ["git", "-C", str(REPO), "ls-files", "dist/sdk/*.apk", "dist/sdk/*.ipk"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        self.assertEqual(tracked_pkgs, "", "Historical .apk/.ipk binaries must not remain tracked in Git")


if __name__ == "__main__":
    unittest.main()
