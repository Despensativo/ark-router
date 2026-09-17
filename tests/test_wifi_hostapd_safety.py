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

if __name__ == "__main__":
    unittest.main()
