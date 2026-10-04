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

    def test_01_no_forbidden_hostapd_set_directives(self):
        """Verifies that bss_transition and wnm_sleep_mode are never 'set' in wifi.sh."""
        self.assertTrue(os.path.isfile(self.wifi_sh), "wifi.sh must exist")
        with open(self.wifi_sh, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()

        # Disallow setting bss_transition=1 or wnm_sleep_mode=1 which breaks wpad-basic
        self.assertNotIn("bss_transition=1", content, "bss_transition=1 is incompatible with wpad-basic-mbedtls and must not be set!")
        self.assertNotIn("wnm_sleep_mode=1", content, "wnm_sleep_mode=1 is incompatible with wpad-basic-mbedtls and must not be set!")

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

if __name__ == "__main__":
    unittest.main()

