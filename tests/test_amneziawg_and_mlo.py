#!/usr/bin/env python3
"""
Unit tests for AmneziaWG (Anti-DPI WireGuard) and Wi-Fi 7 MLO in ARK Router.
"""
import os
import sys
import json
import base64
import unittest
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from test_harness import RouterSandbox


class TestAmneziaWGAndMLO(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_amneziawg_proto_script_syntax(self):
        """Verify that root/lib/netifd/proto/amneziawg.sh is valid POSIX ash syntax."""
        proto_script = os.path.join(REPO_DIR, "root", "lib", "netifd", "proto", "amneziawg.sh")
        self.assertTrue(os.path.isfile(proto_script))
        res = subprocess.run(["sh", "-n", proto_script], capture_output=True, text=True)
        self.assertEqual(res.returncode, 0, f"amneziawg.sh syntax error: {res.stderr}")

    def test_02_amneziawg_client_import_and_status(self):
        """Test importing an AmneziaWG .conf file with Jc, Jmin, Jmax, S1, S2, H1..H4 fields."""
        sample_conf = """[Interface]
PrivateKey = aAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
Address = 10.8.0.2/24
DNS = 1.1.1.1
Jc = 4
Jmin = 40
Jmax = 70
S1 = 15
S2 = 25
H1 = 1284920194
H2 = 918274012
H3 = 391827401
H4 = 827104928

[Peer]
PublicKey = bBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=
Endpoint = 203.0.113.10:51820
AllowedIPs = 0.0.0.0/0
PersistentKeepalive = 25
"""
        b64_conf = base64.b64encode(sample_conf.encode('utf-8')).decode('utf-8')

        # Execute wireguard-client-import via equipe-dashboard-control
        res = self.sb.run_control("wireguard-client-import", b64_conf)
        self.assertEqual(res.returncode, 0, f"wireguard-client-import failed: {res.stderr}")
        self.assertIn("ok", res.stdout)

        # Verify UCI network.wgclient options
        self.assertEqual(self.sb.uci_get("network.wgclient.private_key"), "aAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")
        self.assertEqual(self.sb.uci_get("network.wgclient.awg_jc"), "4")
        self.assertEqual(self.sb.uci_get("network.wgclient.awg_jmin"), "40")
        self.assertEqual(self.sb.uci_get("network.wgclient.awg_jmax"), "70")
        self.assertEqual(self.sb.uci_get("network.wgclient.awg_s1"), "15")
        self.assertEqual(self.sb.uci_get("network.wgclient.awg_s2"), "25")
        self.assertEqual(self.sb.uci_get("network.wgclient.awg_h1"), "1284920194")
        self.assertEqual(self.sb.uci_get("network.wgclient.awg_h4"), "827104928")

        # Query wireguard-client-status JSON
        status_res = self.sb.run_control("wireguard-client-status")
        self.assertEqual(status_res.returncode, 0)
        st = json.loads(status_res.stdout)
        self.assertTrue(st.get("configured"))
        self.assertTrue(st.get("is_amneziawg"))
        self.assertEqual(st.get("awg_jc"), "4")
        self.assertEqual(st.get("awg_h1"), "1284920194")

    def test_03_wifi_mlo_status_and_toggle(self):
        """Test Wi-Fi 7 MLO status and toggle actions."""
        status_res = self.sb.run_control("wifi-mlo-status")
        self.assertEqual(status_res.returncode, 0)
        st = json.loads(status_res.stdout)
        self.assertIn("supported", st)
        self.assertIn("enabled", st)

        # Toggle MLO ON
        on_res = self.sb.run_control("wifi-mlo-toggle", "1")
        self.assertEqual(on_res.returncode, 0)
        self.assertIn("enabled", on_res.stdout)
        self.assertEqual(self.sb.uci_get("wireless.mld0.disabled"), "0")
        self.assertEqual(self.sb.uci_get("wireless.mld0.mode"), "ap")

        # Toggle MLO OFF
        off_res = self.sb.run_control("wifi-mlo-toggle", "0")
        self.assertEqual(off_res.returncode, 0)
        self.assertIn("disabled", off_res.stdout)
        self.assertEqual(self.sb.uci_get("wireless.mld0.disabled"), "1")


if __name__ == "__main__":
    unittest.main()
