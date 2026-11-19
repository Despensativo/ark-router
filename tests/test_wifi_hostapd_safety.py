#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Suite: Hostapd Syntax Safety & Mesh Cleanup Anti-Regression
Ensures that no legacy incompatible hostapd directives (bss_transition, wnm_sleep_mode)
are ever written to UCI, and verifies the existence of active kernel mesh cleanup.
"""

import os
import unittest

class TestWifiHostapdSafety(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        cls.wifi_sh = os.path.join(cls.repo_dir, "root", "usr", "lib", "ark", "modules", "wifi.sh")
        cls.doctor_sh = os.path.join(cls.repo_dir, "root", "usr", "lib", "ark", "modules", "doctor.sh")

    def setUp(self):
        self.repo_dir = getattr(self.__class__, "repo_dir", os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
        self.wifi_sh = getattr(self.__class__, "wifi_sh", os.path.join(self.repo_dir, "root", "usr", "lib", "ark", "modules", "wifi.sh"))
        self.doctor_sh = getattr(self.__class__, "doctor_sh", os.path.join(self.repo_dir, "root", "usr", "lib", "ark", "modules", "doctor.sh"))

    def test_01_no_forbidden_hostapd_set_directives(self):
        """Verifies that bss_transition and wnm_sleep_mode are never set unconditionally in wifi.sh (must be guarded by ark_hostapd_has_wnm or QCA QSDK)."""
        import re
        self.assertTrue(os.path.isfile(self.wifi_sh), "wifi.sh must exist")
        with open(self.wifi_sh, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        # Remove wifi_qca_apply_roaming_tuning body (QCA QSDK qca-hostapd-11be natively supports WNM)
        non_qca = re.sub(r"wifi_qca_apply_roaming_tuning\(\)\s*\{[\s\S]*?\n\}", "", content)
        # Remove guarded 'if ark_hostapd_has_wnm; then ... fi' blocks
        unguarded = re.sub(r"if\s+ark_hostapd_has_wnm;\s*then[\s\S]*?fi", "", non_qca)
        # Strip comment lines
        unguarded = re.sub(r"(?m)^\s*#.*$", "", unguarded)

        self.assertNotIn("bss_transition=1", unguarded, "Unconditional bss_transition=1 breaks wpad-basic-mbedtls!")
        self.assertNotIn("bss_transition='1'", unguarded, "Unconditional bss_transition='1' breaks wpad-basic-mbedtls!")
        self.assertNotIn("ieee80211v=1", unguarded, "Unconditional ieee80211v=1 breaks wpad-basic-mbedtls!")
        self.assertNotIn("ieee80211v='1'", unguarded, "Unconditional ieee80211v='1' breaks wpad-basic-mbedtls!")
        self.assertNotIn("wnm_sleep_mode=1", unguarded, "Unconditional wnm_sleep_mode=1 breaks wpad-basic-mbedtls!")
        self.assertNotIn("wnm_sleep_mode='1'", unguarded, "Unconditional wnm_sleep_mode='1' breaks wpad-basic-mbedtls!")

    def test_02_mesh_cleanup_function_exists(self):
        """Verifies that wifi_cleanup_mesh_interfaces performs kernel-level destruction and unbridging."""
        with open(self.wifi_sh, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        self.assertIn("wifi_cleanup_mesh_interfaces()", content, "wifi_cleanup_mesh_interfaces must be defined in wifi.sh")
        self.assertIn("nomaster", content, "Mesh cleanup must detach interface from bridge (nomaster)")
        self.assertIn("iw dev", content, "Mesh cleanup must query and delete interfaces via iw dev")
        self.assertIn("type mesh point", content, "Mesh cleanup must dynamically query kernel for 'type mesh point'")

    def test_03_doctor_audits_orphan_mesh(self):
        """Verifies that doctor.sh has Check #9 for orphan mesh interfaces and auto-fixes them."""
        with open(self.doctor_sh, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        self.assertIn("Interfaces Mesh Orfas", content, "doctor.sh must have an orphan mesh check")
        self.assertIn("type mesh point", content, "doctor.sh must inspect kernel mesh point interfaces")
        self.assertIn("nomaster", content, "doctor.sh auto-fix must remove orphan mesh from bridge")

    def test_04_wifi_radio_band_detection_all_architectures(self):
        """Verifies that wifi_radio_by_band correctly identifies 2.4G, 5G, and 6G radios across architectures."""
        import subprocess
        import re

        with open(self.wifi_sh, "r", encoding="utf-8", errors="replace") as f:
            code = f.read()

        # Extract awk script from wifi_radio_by_band
        m = re.search(r"wifi_radio_by_band\(\)\s*\{[\s\S]*?awk\s+-F=\s+-v\s+wanted=\"\$wanted\"\s+'([\s\S]*?)'\s*\}", code)
        self.assertIsNotNone(m, "wifi_radio_by_band awk script must be present")
        awk_script = m.group(1)

        awk_cmd = "awk"
        # On Windows host, find available awk
        for candidate in ["awk", r"C:\Program Files\Git\usr\bin\awk.exe"]:
            try:
                subprocess.run([candidate, "--version"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                awk_cmd = candidate
                break
            except Exception:
                pass

        test_matrices = [
            ("Qualcomm Wi-Fi 7 (Predator T7)", """
wireless.wifi0=wifi-device
wireless.wifi0.type='qcawificfg80211'
wireless.wifi0.hwmode='11beg'
wireless.wifi0.htmode='HT40'
wireless.wifi1=wifi-device
wireless.wifi1.type='qcawificfg80211'
wireless.wifi1.hwmode='11bea'
wireless.wifi1.htmode='HT80'
wireless.wifi2=wifi-device
wireless.wifi2.type='qcawificfg80211'
wireless.wifi2.hwmode='11bea'
wireless.wifi2.band='3'
wireless.wifi2.htmode='HT320'
""", {"2g": "wifi0", "5g": "wifi1", "6g": "wifi2"}),
            ("MediaTek Wi-Fi 7 / Modern OpenWrt (radio0/1/2)", """
wireless.radio0=wifi-device
wireless.radio0.type='mac80211'
wireless.radio0.band='2g'
wireless.radio0.htmode='HE40'
wireless.radio1=wifi-device
wireless.radio1.type='mac80211'
wireless.radio1.band='5g'
wireless.radio1.htmode='HE160'
wireless.radio2=wifi-device
wireless.radio2.type='mac80211'
wireless.radio2.band='6g'
wireless.radio2.htmode='EHT320'
""", {"2g": "radio0", "5g": "radio1", "6g": "radio2"}),
            ("Dual-Band Wi-Fi 6 (Predator W6x)", """
wireless.radio0=wifi-device
wireless.radio0.band='2g'
wireless.radio0.htmode='HE20'
wireless.radio1=wifi-device
wireless.radio1.band='5g'
wireless.radio1.htmode='HE160'
""", {"2g": "radio0", "5g": "radio1", "6g": ""})
        ]

        for name, config_data, expected in test_matrices:
            for band, exp_dev in expected.items():
                p = subprocess.Popen([awk_cmd, "-F=", "-v", f"wanted={band}", awk_script],
                                     stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
                out, _ = p.communicate(input=config_data)
                self.assertEqual(out.strip(), exp_dev, f"{name}: Band {band} expected '{exp_dev}', got '{out.strip()}'")

    def test_05_standalone_6g_validation(self):
        """Verifies that wifi.sh allows standalone 6 GHz when radio6 is present."""
        with open(self.wifi_sh, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        # Must check radio6 before denying if 2g and 5g are disabled
        self.assertIn('[ "$enable_2g" = 0 ] && [ "$enable_5g" = 0 ]', content)
        self.assertIn('[ -z "$radio6" ] || [ "$enable_6g" = 0 ]', content)

    def _setup_usteer_sandbox(self):
        import json
        from pathlib import Path
        from test_harness import RouterSandbox
        sb = RouterSandbox()
        root = Path(sb.temp_dir)
        for cmd_name, body in [("sleep", "exit 0"), ("wifi", "exit 0")]:
            p = Path(sb.bin_dir) / cmd_name
            p.unlink(missing_ok=True)
            p.write_text(f"#!/bin/sh\n{body}\n", encoding="utf-8")
            p.chmod(0o755)
        init_usteer = root / "etc/init.d/usteer"
        init_usteer.parent.mkdir(parents=True, exist_ok=True)
        init_usteer.write_text(
            '#!/bin/sh\n'
            'if [ "$1" = "enabled" ]; then exit 0; fi\n'
            'echo "$1" >> "$ARK_ROOT/state/usteer_init.log"\n'
            'exit 0\n',
            encoding="utf-8"
        )
        init_usteer.chmod(0o755)
        return sb, root, json

    def test_06_doctor_detects_and_fixes_stale_usteer_ssid_list(self):
        """Verifies doctor-run warns on stale usteer.ssid_list and doctor-fix resyncs it with auth_cache=1."""
        sb, root, json = self._setup_usteer_sandbox()
        try:
            with open(os.path.join(sb.etc_config, "wireless"), "w", encoding="utf-8") as f:
                f.write("""
config wifi-device 'radio0'
\toption type 'mac80211'
\toption band '2g'
\toption he_twt_required '0'
\toption legacy_rates '0'

config wifi-device 'radio1'
\toption type 'mac80211'
\toption band '5g'
\toption he_twt_required '0'

config wifi-iface 'default_radio0'
\toption device 'radio0'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'CASA_ARK'
\toption encryption 'psk2'
\toption key 'SenhaForte123'
\toption disassoc_low_ack '0'
\toption wpa_group_rekey '0'
\toption skip_inactivity_poll '0'
\toption max_inactivity '600'
\toption multicast_to_unicast '0'
\toption dtim_period '1'
\toption ieee80211k '1'
\toption bss_transition '1'
\toption rnr '1'

config wifi-iface 'default_radio1'
\toption device 'radio1'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'CASA_ARK'
\toption encryption 'psk2'
\toption key 'SenhaForte123'
\toption disassoc_low_ack '0'
\toption wpa_group_rekey '0'
\toption skip_inactivity_poll '0'
\toption max_inactivity '600'
\toption multicast_to_unicast '1'
\toption ieee80211k '1'
\toption bss_transition '1'
\toption rnr '1'

config wifi-iface 'pessoal_radio0'
\toption device 'radio0'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'Casa_Ark_6G'
\toption encryption 'psk2'
\toption key 'SenhaForte123'
\toption disassoc_low_ack '0'
\toption wpa_group_rekey '0'
\toption skip_inactivity_poll '0'
\toption max_inactivity '600'
\toption multicast_to_unicast '0'
\toption dtim_period '1'
\toption ieee80211k '1'
\toption bss_transition '1'
\toption rnr '1'

config wifi-iface 'pessoal_radio1'
\toption device 'radio1'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'Casa_Ark_6G'
\toption encryption 'psk2'
\toption key 'SenhaForte123'
\toption disassoc_low_ack '0'
\toption wpa_group_rekey '0'
\toption skip_inactivity_poll '0'
\toption max_inactivity '600'
\toption multicast_to_unicast '1'
\toption ieee80211k '1'
\toption bss_transition '1'
\toption rnr '1'
""")
            with open(os.path.join(sb.etc_config, "usteer"), "w", encoding="utf-8") as f:
                f.write("""
config usteer
\toption network 'lan'
\toption syslog '1'
\toption local_mode '1'
\toption ipv6 '0'
\toption min_snr '0'
\toption band_steering_min_snr '-70'
\toption roam_scan_snr '-74'
\toption roam_trigger_snr '-78'
\toption load_kick_enabled '0'
\toption link_measurement_interval '0'
\tlist ssid_list 'CASA_ARK_2+5'
""")
            sb.uci_set("equipe_dashboard.wifi=settings")
            sb.uci_set("equipe_dashboard.wifi.usteer_enabled=1")

            res_run = sb.run_control("doctor-run")
            self.assertEqual(res_run.returncode, 0, res_run.stderr)
            checks = json.loads(res_run.stdout).get("checks", [])
            u_chk = next((c for c in checks if c.get("name") == "Band Steering (usteer)"), None)
            self.assertIsNotNone(u_chk)
            self.assertEqual(u_chk["status"], "WARN")
            self.assertIn("ssid_list", u_chk["message"])
            self.assertEqual(sb.uci_get("usteer.@usteer[0].ssid_list"), "CASA_ARK_2+5")

            res_fix = sb.run_control("doctor-fix")
            self.assertEqual(res_fix.returncode, 0, res_fix.stderr)
            checks_fix = json.loads(res_fix.stdout).get("checks", [])
            u_fix = next((c for c in checks_fix if c.get("name") == "Band Steering (usteer)"), None)
            self.assertIsNotNone(u_fix)
            self.assertEqual(u_fix["status"], "FIXED")
            self.assertEqual(sorted(sb.uci_get("usteer.@usteer[0].ssid_list").split()), ["CASA_ARK", "Casa_Ark_6G"])
            for sec in ("default_radio0", "default_radio1", "pessoal_radio0", "pessoal_radio1"):
                self.assertEqual(sb.uci_get(f"wireless.{sec}.auth_cache"), "1")
            self.assertIn("restart", (root / "state/usteer_init.log").read_text(encoding="utf-8"))

            res_ok = sb.run_control("doctor-run")
            self.assertEqual(res_ok.returncode, 0, res_ok.stderr)
            checks_ok = json.loads(res_ok.stdout).get("checks", [])
            u_ok = next((c for c in checks_ok if c.get("name") == "Band Steering (usteer)"), None)
            self.assertIsNotNone(u_ok)
            self.assertEqual(u_ok["status"], "OK")
        finally:
            sb.cleanup()

    def test_07_wifi_mutations_keep_usteer_ssid_list_synced(self):
        """Verifies wifi-settings, wifi-add (including SSIDs with spaces), and wifi-delete keep usteer.ssid_list updated."""
        sb, _, _ = self._setup_usteer_sandbox()
        try:
            with open(os.path.join(sb.etc_config, "wireless"), "w", encoding="utf-8") as f:
                f.write("""
config wifi-device 'radio0'
\toption type 'mac80211'
\toption band '2g'

config wifi-device 'radio1'
\toption type 'mac80211'
\toption band '5g'

config wifi-iface 'default_radio0'
\toption device 'radio0'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'CASA_ARK'
\toption encryption 'psk2'
\toption key 'SenhaForte123'

config wifi-iface 'default_radio1'
\toption device 'radio1'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'CASA_ARK'
\toption encryption 'psk2'
\toption key 'SenhaForte123'
""")
            with open(os.path.join(sb.etc_config, "usteer"), "w", encoding="utf-8") as f:
                f.write("""
config usteer
\toption network 'lan'
\toption local_mode '1'
\tlist ssid_list 'CASA_ARK'
""")
            sb.uci_set("equipe_dashboard.wifi=settings")
            sb.uci_set("equipe_dashboard.wifi.usteer_enabled=1")

            r_set = sb.run_control("wifi-settings", "main", "ssid=CasaNova")
            self.assertEqual(r_set.returncode, 0, r_set.stderr)
            self.assertEqual(sb.uci_get("usteer.@usteer[0].ssid_list"), "CasaNova")

            r_add = sb.run_control("wifi-add", "Casa Extra", "SenhaForte123", "lan", "both", "psk2", "0")
            self.assertEqual(r_add.returncode, 0, r_add.stderr)
            usteer_txt = (sb.etc_config + "/usteer")
            with open(usteer_txt, "r", encoding="utf-8") as f:
                raw_usteer = f.read()
            self.assertIn("list ssid_list 'Casa Extra'", raw_usteer)
            self.assertIn("list ssid_list 'CasaNova'", raw_usteer)

            r_del = sb.run_control("wifi-delete", "extra_casaextr")
            self.assertEqual(r_del.returncode, 0, r_del.stderr)
            self.assertEqual(sb.uci_get("usteer.@usteer[0].ssid_list"), "CasaNova")
        finally:
            sb.cleanup()

    def test_08_single_band_5g_ssid_excluded_in_local_mode_preserving_external_rrm_nr(self):
        """Verifies local_mode=1 excludes single-band SSIDs (e.g. pure 5G AP) so usteer does not wipe external 802.11k rrm_nr."""
        sb, _, json = self._setup_usteer_sandbox()
        try:
            with open(os.path.join(sb.etc_config, "wireless"), "w", encoding="utf-8") as f:
                f.write("""
config wifi-device 'radio0'
\toption type 'mac80211'
\toption band '2g'

config wifi-device 'radio1'
\toption type 'mac80211'
\toption band '5g'

config wifi-iface 'default_radio0'
\toption device 'radio0'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'CASA_ARK'
\toption encryption 'psk2'
\toption key 'SenhaForte123'

config wifi-iface 'default_radio1'
\toption device 'radio1'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'CASA_ARK'
\toption encryption 'psk2'
\toption key 'SenhaForte123'

config wifi-iface 'pessoal_radio0'
\toption device 'radio0'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'Casa_Ark_6G'
\toption encryption 'psk2'
\toption key 'SenhaForte123'
\toption disabled '1'

config wifi-iface 'pessoal_radio1'
\toption device 'radio1'
\toption network 'lan'
\toption mode 'ap'
\toption ssid 'Casa_Ark_6G'
\toption encryption 'psk2'
\toption key 'SenhaForte123'
\toption disabled '0'
""")
            with open(os.path.join(sb.etc_config, "usteer"), "w", encoding="utf-8") as f:
                f.write("""
config usteer
\toption network 'lan'
\toption local_mode '1'
\tlist ssid_list 'CASA_ARK'
\tlist ssid_list 'Casa_Ark_6G'
""")
            sb.uci_set("equipe_dashboard.wifi=settings")
            sb.uci_set("equipe_dashboard.wifi.usteer_enabled=1")

            r_fix = sb.run_control("doctor-fix")
            self.assertEqual(r_fix.returncode, 0, r_fix.stderr)
            self.assertEqual(sb.uci_get("usteer.@usteer[0].ssid_list"), "CASA_ARK")
        finally:
            sb.cleanup()

if __name__ == "__main__":
    unittest.main()

