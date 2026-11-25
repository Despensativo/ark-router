#!/usr/bin/env python3
"""Regression tests for AUDIT_REPORT Wave 1 & Wave 2 fixes (sandbox, not VM)."""
from concurrent.futures import ThreadPoolExecutor
import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
MESH_EXPORT = REPO / "root" / "www" / "cgi-bin" / "ark-mesh-export"
ADBLOCK_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "adblock.sh"
DEVICES_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "devices.sh"
NETWORK_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "network.sh"
EZSETUP_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "ezsetup.sh"
LEDS_MOD_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "system_hardware_leds.sh"
DOCTOR_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "doctor.sh"
LED_SH = REPO / "root" / "usr" / "lib" / "ark" / "led.sh"
COMMON_SH = REPO / "root" / "usr" / "lib" / "ark" / "common.sh"


def _collect_root_shell_files():
    sh_files = []
    for root_dir, _, files in os.walk(REPO / "root"):
        for fname in sorted(files):
            if fname.startswith("._"):
                continue
            path = Path(root_dir) / fname
            if fname.endswith((".sh", ".qos")):
                sh_files.append(str(path))
                continue
            if fname.endswith((".js", ".css", ".py", ".md", ".json", ".ut", ".htm", ".lua", ".html", ".png", ".svg", ".nft")):
                continue
            try:
                with open(path, "rb") as fh:
                    first = fh.readline(128)
                if first.startswith(b"#!/") and b"sh" in first:
                    sh_files.append(str(path))
            except OSError:
                pass
    return sh_files


class AuditWave1Wave2Tests(unittest.TestCase):
    def _run_mesh_export(self, remote_addr, route_dev, mesh_key=None, with_valid_token=True, http_host="", query_string=""):
        with tempfile.TemporaryDirectory(prefix="ark_mesh_exp_") as tmp:
            mock_bin = Path(tmp) / "bin"
            mock_bin.mkdir()
            pair_file = Path(tmp) / "ark-mesh-pair.token"
            if with_valid_token:
                pair_file.write_text("PairSecretToken99 4102444800\n", encoding="utf-8")
                pair_file.chmod(0o600)

            ip_sh = mock_bin / "ip"
            ip_sh.write_text(
                f"#!/bin/sh\n"
                f"if [ -n \"{route_dev}\" ]; then\n"
                f"  printf '%s via 10.0.0.1 dev %s src 192.168.73.1\\n' \"{remote_addr}\" \"{route_dev}\"\n"
                f"fi\n",
                encoding="utf-8",
            )
            ip_sh.chmod(0o755)

            key_line = f"wireless.extra_mesh_r1.key={mesh_key}\n" if mesh_key is not None else ""
            get_key_branch = (
                f"    wireless.extra_mesh_r1.key) printf '%s\\n' '{mesh_key}' ;;\n"
                if mesh_key is not None
                else ""
            )

            uci_sh = mock_bin / "uci"
            uci_sh.write_text(
                f"#!/bin/sh\n"
                f"[ \"$1\" = \"-q\" ] && shift\n"
                f"cmd=\"$1\"; shift\n"
                f"case \"$cmd\" in\n"
                f"  show)\n"
                f"    case \"$1\" in\n"
                f"      network)\n"
                f"        printf 'network.lan=interface\\nnetwork.lan.device=br-lan\\nnetwork.wan=interface\\nnetwork.wan.device=eth1\\n'\n"
                f"        ;;\n"
                f"      wireless)\n"
                f"        printf 'wireless.radio0=wifi-device\\nwireless.radio0.band=2g\\nwireless.radio1=wifi-device\\nwireless.radio1.band=5g\\n'\n"
                f"        printf 'wireless.ap2=wifi-iface\\nwireless.ap2.device=radio0\\nwireless.ap2.mode=ap\\nwireless.ap2.network=lan\\n'\n"
                f"        ;;\n"
                f"    esac\n"
                f"    ;;\n"
                f"  get)\n"
                f"    case \"$1\" in\n"
                f"      network.lan.device) printf 'br-lan\\n' ;;\n"
                f"      network.lan.ipaddr) printf '192.168.73.1\\n' ;;\n"
                f"      network.lan.netmask) printf '255.255.255.0\\n' ;;\n"
                f"      network.wan.device) printf 'eth1\\n' ;;\n"
                f"      wireless.ap2.ssid) printf 'TestSSID\\n' ;;\n"
                f"      wireless.ap2.key) printf 'SuperSecretWifiKey\\n' ;;\n"
                f"      wireless.extra_mesh_r1.mesh_id) printf 'ark-mesh\\n' ;;\n"
                f"{get_key_branch}"
                f"      *) exit 1 ;;\n"
                f"    esac\n"
                f"    ;;\n"
                f"esac\n",
                encoding="utf-8",
            )
            uci_sh.chmod(0o755)
            # Silence unused var warning for clarity
            _ = key_line

            # Mask host ubus/jsonfilter so fallback subnet check uses deterministic mock UCI values
            for tool in ("ubus", "jsonfilter"):
                stub = mock_bin / tool
                stub.write_text("#!/bin/sh\nexit 1\n", encoding="utf-8")
                stub.chmod(0o755)

            env = os.environ.copy()
            env["PATH"] = f"{mock_bin}:{env.get('PATH', '')}"
            env["REMOTE_ADDR"] = remote_addr
            env["QUERY_STRING"] = query_string
            env["ARK_MESH_PAIR_FILE"] = str(pair_file)
            if http_host:
                env["HTTP_HOST"] = http_host
            else:
                env.pop("HTTP_HOST", None)
            if with_valid_token:
                env["HTTP_X_ARK_MESH_TOKEN"] = "PairSecretToken99"
            else:
                env.pop("HTTP_X_ARK_MESH_TOKEN", None)

            res = subprocess.run(["sh", str(MESH_EXPORT)], env=env, capture_output=True, text=True, timeout=10)
            self.assertEqual(res.returncode, 0, res.stderr)
            return res.stdout

    def test_ark_mesh_export_blocks_wan_eth1_and_raw_eth0(self):
        for addr, dev in [
            ("203.0.113.10", "eth1"),
            ("198.51.100.20", "eth0"),
            ("203.0.113.99", "pppoe-wan"),
            ("203.0.113.50", ""),
        ]:
            with self.subTest(addr=addr, dev=dev):
                out = self._run_mesh_export(addr, dev, with_valid_token=True)
                self.assertIn("Status: 403 Forbidden", out)
                self.assertNotIn("SuperSecretWifiKey", out)
                self.assertNotIn("arkmeshkey123", out)

        # Unauthenticated LAN request without pairing token MUST be blocked (P0-SEC-01)
        out_no_tok = self._run_mesh_export("192.168.73.50", "br-lan", with_valid_token=False)
        self.assertIn("Status: 403 Forbidden", out_no_tok)
        self.assertNotIn("SuperSecretWifiKey", out_no_tok)

        # DNS Rebinding attack via external Host header MUST be blocked even with token
        out_rebind = self._run_mesh_export("192.168.73.50", "br-lan", with_valid_token=True, http_host="evil-rebind.example.com")
        self.assertIn("Status: 403 Forbidden", out_rebind)
        self.assertNotIn("SuperSecretWifiKey", out_rebind)

        # Leases endpoint remains accessible on LAN without exposing Wi-Fi keys
        out_leases = self._run_mesh_export("192.168.73.50", "br-lan", with_valid_token=False, query_string="action=leases")
        self.assertIn("Status: 200 OK", out_leases)
        self.assertNotIn("SuperSecretWifiKey", out_leases)

        out_lan = self._run_mesh_export("192.168.73.50", "br-lan", mesh_key=None, with_valid_token=True, http_host="192.168.73.1")
        self.assertIn("Status: 200 OK", out_lan)
        payload_lan = json.loads(re.split(r"\r?\n\r?\n", out_lan, maxsplit=1)[1])
        self.assertTrue(payload_lan["ok"])
        self.assertEqual(payload_lan["mesh_key"], "")
        self.assertNotIn("arkmeshkey123", out_lan)

        out_wg = self._run_mesh_export("10.8.0.2", "wg0", mesh_key="MeshCustomSecret99")
        self.assertIn("Status: 200 OK", out_wg)
        payload_wg = json.loads(re.split(r"\r?\n\r?\n", out_wg, maxsplit=1)[1])
        self.assertTrue(payload_wg["ok"])
        self.assertEqual(payload_wg["mesh_key"], "MeshCustomSecret99")

        out_fallback_lan = self._run_mesh_export("192.168.73.55", "", mesh_key=None)
        self.assertIn("Status: 200 OK", out_fallback_lan)

    def test_adblock_whitelist_preserves_important_and_is_idempotent(self):
        txt = ADBLOCK_SH.read_text(encoding="utf-8")
        m = re.search(
            r'# 4\. Sincronizar user_rules no AdGuard Home.*?python3 -c "\n(.*?)\n" "\$py_bl_arg" "\$py_wl_arg" "\$agh_yaml"',
            txt,
            re.DOTALL,
        )
        self.assertIsNotNone(m, "Bloco python3 de sincronização user_rules não encontrado em adblock.sh")
        self.assertIn(r"f'@@||{d_lower}^\$important'", txt)

        with tempfile.TemporaryDirectory(prefix="ark_adblock_wl_") as tmp:
            yaml_path = Path(tmp) / "adguardhome.yaml"
            yaml_path.write_text("http:\n  address: 0.0.0.0:3000\nuser_rules:\n  - '||ads.example^'\n", encoding="utf-8")
            snippet = m.group(1)
            sh_script = (
                'py_bl_arg="__KEEP_EXISTING__"\n'
                'py_wl_arg="bank.com,gov.br"\n'
                f'agh_yaml="{yaml_path}"\n'
                f'python3 -c "\n{snippet}\n" "$py_bl_arg" "$py_wl_arg" "$agh_yaml"\n'
            )

            for _ in range(2):
                res = subprocess.run(["sh", "-c", sh_script], capture_output=True, text=True, timeout=10)
                self.assertEqual(res.returncode, 0, res.stderr)

            final_yaml = yaml_path.read_text(encoding="utf-8")
            self.assertIn("  - '@@||bank.com^$important'", final_yaml)
            self.assertIn("  - '@@||gov.br^$important'", final_yaml)
            self.assertIn("  - '||ads.example^'", final_yaml)
            self.assertEqual(final_yaml.count("bank.com"), 1)
            self.assertEqual(final_yaml.count("gov.br"), 1)

    def test_reboot_prepare_token_without_random_or_urandom(self):
        devices_txt = DEVICES_SH.read_text(encoding="utf-8")
        self.assertNotIn("$RANDOM", devices_txt)
        expr = r'''printf '%08x%08x' "$(date +%s)" "$(printf '%s-%s' "$$" "123.45" | cksum | awk '{print $1}')"'''
        res = subprocess.run(["sh", "-c", expr], capture_output=True, text=True, timeout=5)
        self.assertEqual(res.returncode, 0, res.stderr)
        token = res.stdout.strip()
        self.assertRegex(token, r"^[0-9a-f]{8,64}$")

    def test_shellcheck_zero_errors_on_root_and_no_sc2221_sc2222(self):
        sc_bin = shutil.which("shellcheck")
        self.assertIsNotNone(sc_bin, "shellcheck é obrigatório para auditar scripts POSIX")

        sh_files = _collect_root_shell_files()
        self.assertGreater(len(sh_files), 50)

        workers = min(4, os.cpu_count() or 4)
        sc_timeout = int(os.environ.get("ARK_SHELLCHECK_TIMEOUT", "120"))
        chunks = []
        small_chunk = []
        small_bytes = 0
        for fpath in sorted(sh_files, key=lambda p: os.path.getsize(p), reverse=True):
            fsize = os.path.getsize(fpath)
            if fsize >= 32768:
                chunks.append([fpath])
                continue
            if small_chunk and (len(small_chunk) >= 4 or small_bytes + fsize > 49152):
                chunks.append(small_chunk)
                small_chunk = []
                small_bytes = 0
            small_chunk.append(fpath)
            small_bytes += fsize
        if small_chunk:
            chunks.append(small_chunk)

        aud9_files = [str(LEDS_MOD_SH), str(DOCTOR_SH), str(LED_SH), str(COMMON_SH)]
        cmds = [
            ("err", [sc_bin, "-s", "sh", "-i", "SC1072,SC1073,SC1087,SC2045,SC2144,SC3028", "-f", "gcc"] + c)
            for c in chunks
            if c
        ] + [
            ("case", [sc_bin, "-s", "sh", "-i", "SC2221,SC2222", "-f", "gcc", f])
            for f in aud9_files
        ] + [
            ("undef", [sc_bin, "-s", "sh", "-i", "SC2154", "-f", "gcc", str(ADBLOCK_SH), str(NETWORK_SH)])
        ]

        def _run_sc(item):
            kind, cmd = item
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=sc_timeout)
            return kind, res.returncode, res.stdout, res.stderr

        err_failures = []
        case_failures = []
        undef_failures = []
        with ThreadPoolExecutor(max_workers=workers) as pool:
            for kind, rc, out, err in pool.map(_run_sc, cmds):
                if rc != 0:
                    msg = (out + "\n" + err).strip()
                    if kind == "err":
                        err_failures.append(msg)
                    elif kind == "case":
                        case_failures.append(msg)
                    else:
                        undef_failures.append(msg)
        self.assertEqual(err_failures, [], "Erros shellcheck em root/:\n" + "\n".join(err_failures))
        self.assertEqual(case_failures, [], "Branches case sombreados:\n" + "\n".join(case_failures))
        self.assertEqual(undef_failures, [], "Variáveis indefinidas em adblock/network:\n" + "\n".join(undef_failures))

        net_txt = NETWORK_SH.read_text(encoding="utf-8")
        self.assertNotIn("$uci_cmd", net_txt)
        ez_txt = EZSETUP_SH.read_text(encoding="utf-8")
        self.assertIn("user_theme=\"$(uci -q get equipe_dashboard.main.user_theme", ez_txt)

    def test_white_internet_led_precedes_generic_internet(self):
        leds_txt = LEDS_MOD_SH.read_text(encoding="utf-8")
        idx_white = leds_txt.find("*white:internet*")
        idx_generic = leds_txt.find("*green:wan*|*green:internet*")
        self.assertGreater(idx_white, 0)
        self.assertGreater(idx_generic, idx_white)


if __name__ == "__main__":
    unittest.main(verbosity=2)
