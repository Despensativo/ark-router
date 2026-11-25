#!/usr/bin/env python3
"""Regression tests for AUDIT_REPORT Wave 3 fixes (AUD-003, AUD-007, AUD-010, AUD-011)."""
import gzip
import os
import re
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
COMMON_SH = REPO / "root" / "usr" / "lib" / "ark" / "common.sh"
EZSETUP_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "ezsetup.sh"
SPEEDIFY_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "speedify.sh"
DEVICES_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "devices.sh"
SYSTEM_SH = REPO / "root" / "usr" / "lib" / "ark" / "modules" / "system.sh"
STARLINK_TELEMETRY = REPO / "root" / "usr" / "libexec" / "ark-starlink-telemetry"
STARLINK_MAILER = REPO / "root" / "usr" / "sbin" / "starlink-telemetry-mailer"

DOCTOR_PERF_JS = REPO / "src" / "modules" / "doctor_perf.js"
OVERVIEW_JS = REPO / "root" / "www" / "luci-static" / "resources" / "view" / "equipe-dashboard" / "overview.js"
OVERVIEW_V2_JS = REPO / "root" / "www" / "luci-static" / "resources" / "view" / "equipe-dashboard" / "overview_v2.js"
OVERVIEW_V2_CSS = REPO / "root" / "www" / "luci-static" / "resources" / "view" / "equipe-dashboard" / "overview_v2.css"
BUILD_BUNDLE_PY = REPO / "scripts" / "build_frontend_bundle.py"
MAKEFILE = REPO / "Makefile"

ARK_THEME_JS = REPO / "root" / "www" / "luci-static" / "ark" / "ark-theme.js"
ARK_GUIDES_JS = REPO / "root" / "www" / "luci-static" / "ark" / "ark-guides.js"
CASCADE_CSS = REPO / "root" / "www" / "luci-static" / "ark" / "cascade.css"
MOBILE_CSS = REPO / "root" / "www" / "luci-static" / "ark" / "mobile.css"
FOOTER_UT = REPO / "root" / "usr" / "share" / "ucode" / "luci" / "template" / "themes" / "ark" / "footer.ut"
FOOTER_HTM = REPO / "root" / "usr" / "lib" / "lua" / "luci" / "view" / "themes" / "ark" / "footer.htm"

CORE_THEME_GZIP_LIMIT = 60 * 1024  # 61,440 bytes (< 60 KiB)


class AuditWave3Tests(unittest.TestCase):
    def _run_tls_probe(self, extra_env):
        with tempfile.TemporaryDirectory(prefix="ark_tls_probe_") as tmp:
            tmp_path = Path(tmp)
            mock_bin = tmp_path / "bin"
            mock_bin.mkdir()
            log_file = tmp_path / "calls.log"

            for tool in ("wget", "curl", "uclient-fetch"):
                tool_sh = mock_bin / tool
                tool_sh.write_text(
                    f"#!/bin/sh\n"
                    f"printf '%s:%s\\n' '{tool}' \"$*\" >> '{log_file}'\n"
                    f"exit 0\n",
                    encoding="utf-8",
                )
                tool_sh.chmod(0o755)

            env = os.environ.copy()
            env["PATH"] = f"{mock_bin}:/usr/bin:/bin"
            env["ARK_LIB_DIR"] = str(REPO / "root" / "usr" / "lib" / "ark")
            env.pop("ARK_TLS_STRICT", None)
            env.pop("ARK_TLS_CA_FILE", None)
            env.pop("ARK_TLS_CLOCK_EPOCH", None)
            env.pop("ARK_ROOT", None)
            env.update(extra_env)

            cmd = (
                f'. "{COMMON_SH}"; '
                'ark_tls_verify_ready; r=$?; printf "READY=%s\\n" "$r"; '
                'ark_wget_tls -q https://example.com/a; '
                'ark_curl_tls -fsSL https://example.com/b; '
                'ark_uclient_tls -T 10 https://example.com/c'
            )
            res = subprocess.run(["sh", "-c", cmd], env=env, capture_output=True, text=True, check=True)
            calls = log_file.read_text(encoding="utf-8") if log_file.exists() else ""
            return res.stdout.strip(), calls

    def test_aud003_no_unconditional_insecure_tls_flags(self):
        for mod in (EZSETUP_SH, SPEEDIFY_SH, DEVICES_SH, SYSTEM_SH):
            text = mod.read_text(encoding="utf-8")
            self.assertNotIn("--no-check-certificate", text, f"{mod.name} still hardcodes --no-check-certificate")
            self.assertNotRegex(text, r"\bcurl\b[^\n]*\s-[A-Za-z]*k", f"{mod.name} still hardcodes curl -k")

        # Executable binary downloader MUST enforce TLS strictly (zero --no-check-certificate)
        telemetry_txt = STARLINK_TELEMETRY.read_text(encoding="utf-8")
        self.assertIn("_ark_tls_verify_ready", telemetry_txt)
        self.assertNotIn("--no-check-certificate", telemetry_txt)

        mailer_txt = STARLINK_MAILER.read_text(encoding="utf-8")
        self.assertIn("ARK_TLS_CLOCK_EPOCH", mailer_txt)
        self.assertEqual(mailer_txt.count("--no-check-certificate"), 1)

    def test_aud003_tls_behavior_with_ca_and_clock(self):
        with tempfile.TemporaryDirectory(prefix="ark_root_tls_") as root_dir:
            root_path = Path(root_dir)
            certs_dir = root_path / "etc" / "ssl" / "certs"
            certs_dir.mkdir(parents=True)
            ca_file = certs_dir / "ca-certificates.crt"
            ca_file.write_text("-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----\n", encoding="utf-8")

            # 1. CA present + valid clock (>= 2024): strict verification by default (NO -k / NO --no-check-certificate)
            out, calls = self._run_tls_probe({"ARK_ROOT": root_dir, "ARK_TLS_CLOCK_EPOCH": "1760000000"})
            self.assertEqual(out, "READY=0")
            self.assertNotIn("--no-check-certificate", calls)
            self.assertNotIn(" -k ", calls)
            self.assertIn("wget:-q https://example.com/a", calls)
            self.assertIn("curl:-fsSL https://example.com/b", calls)
            self.assertIn("uclient-fetch:-T 10 https://example.com/c", calls)

            # 2. CA present + unsynced clock (< 2024): controlled fallback
            out_clk, calls_clk = self._run_tls_probe({"ARK_ROOT": root_dir, "ARK_TLS_CLOCK_EPOCH": "100000"})
            self.assertEqual(out_clk, "READY=1")
            self.assertIn("wget:--no-check-certificate -q https://example.com/a", calls_clk)
            self.assertIn("curl:-k -fsSL https://example.com/b", calls_clk)
            self.assertIn("uclient-fetch:--no-check-certificate -T 10 https://example.com/c", calls_clk)

        with tempfile.TemporaryDirectory(prefix="ark_root_noca_") as no_ca_dir:
            # 3. Missing CA bundle: controlled fallback
            out_noca, calls_noca = self._run_tls_probe({"ARK_ROOT": no_ca_dir, "ARK_TLS_CLOCK_EPOCH": "1760000000"})
            self.assertEqual(out_noca, "READY=1")
            self.assertIn("--no-check-certificate", calls_noca)
            self.assertIn("curl:-k", calls_noca)

            # 4. Strict override rejects insecure fallback even without CA
            out_strict, calls_strict = self._run_tls_probe(
                {"ARK_ROOT": no_ca_dir, "ARK_TLS_CLOCK_EPOCH": "1000", "ARK_TLS_STRICT": "1"}
            )
            self.assertEqual(out_strict, "READY=0")
            self.assertNotIn("--no-check-certificate", calls_strict)
            self.assertNotIn("-k", calls_strict)

    def test_aud007_no_blocking_prompt_in_frontend(self):
        for p in sorted((REPO / "src").rglob("*.js")) + [OVERVIEW_JS, ARK_THEME_JS, ARK_GUIDES_JS]:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            # Ignore shell-safe text labels; check JS dialog function calls prompt(...)
            matches = re.findall(r"(?<![A-Za-z0-9_$.])prompt\s*\(", txt)
            self.assertFalse(matches, f"Found synchronous prompt() call in {p}")

        perf_txt = DOCTOR_PERF_JS.read_text(encoding="utf-8")
        self.assertIn("execCommand('copy')", perf_txt)
        self.assertIn("selectNodeContents(logPreEl)", perf_txt)

    def test_aud010_no_overview_v2_and_makefile_clean(self):
        self.assertFalse(OVERVIEW_V2_JS.exists(), "Residual overview_v2.js still exists in root/")
        self.assertFalse(OVERVIEW_V2_CSS.exists(), "Residual overview_v2.css still exists in root/")

        builder_txt = BUILD_BUNDLE_PY.read_text(encoding="utf-8")
        self.assertIn("if args.v2 and os.path.isfile(css_v1):", builder_txt)

        makefile_txt = MAKEFILE.read_text(encoding="utf-8")
        self.assertEqual(
            makefile_txt.count("rm -f $(1)/www/luci-static/resources/view/equipe-dashboard/overview_v2.*"),
            2,
            "Both Lite and Full Makefile install recipes must clean overview_v2.*",
        )

    def test_aud011_theme_unification_and_budget(self):
        theme_txt = ARK_THEME_JS.read_text(encoding="utf-8")
        self.assertNotIn("mode: 'basic'", theme_txt)
        self.assertIn("#topmenu li.dropdown > a.menu", theme_txt)
        self.assertIn("ARK_THEME_GUIDES", theme_txt)
        self.assertIn("ark-guides.js", theme_txt)

        guides_txt = ARK_GUIDES_JS.read_text(encoding="utf-8")
        self.assertIn("window.ARK_THEME_GUIDES", guides_txt)
        for route in ("/network/wireless", "/network/firewall", "/status/realtime", "/system/leds"):
            self.assertIn(route, guides_txt)

        for tmpl in (FOOTER_UT, FOOTER_HTM):
            t_txt = tmpl.read_text(encoding="utf-8")
            self.assertIn("L.require('menu-bootstrap')", t_txt)
            self.assertNotIn("autoExpandActiveMenu", t_txt, f"Duplicated autoExpandActiveMenu left in {tmpl.name}")
            self.assertNotIn("keydown", t_txt, f"Duplicated Escape handler left in {tmpl.name}")
            self.assertNotIn("#topmenu li.dropdown", t_txt, f"Duplicated dropdown handler left in {tmpl.name}")

        # Verify gzipped theme payload < 60 KiB
        min_dir = REPO / "dist" / "minified" / "www" / "luci-static" / "ark"
        assets = [ARK_THEME_JS, CASCADE_CSS, MOBILE_CSS]
        if all((min_dir / a.name).is_file() for a in assets):
            paths = [min_dir / a.name for a in assets]
            gz_bytes = sum(len(gzip.compress(p.read_bytes(), compresslevel=6)) for p in paths)
            self.assertLess(
                gz_bytes,
                CORE_THEME_GZIP_LIMIT,
                f"Minified theme gzip {gz_bytes} B exceeds <60 KiB ({CORE_THEME_GZIP_LIMIT} B)",
            )
        else:
            # CI without prebuilt dist/minified: either minify with esbuild if local binary exists or verify bounded raw gzip
            esbuild = shutil.which("esbuild")
            if esbuild:
                with tempfile.TemporaryDirectory(prefix="ark_min_ci_") as tmp:
                    total_gz = 0
                    for a in assets:
                        out_p = Path(tmp) / a.name
                        subprocess.run([esbuild, str(a), "--minify", f"--outfile={out_p}"], check=True)
                        total_gz += len(gzip.compress(out_p.read_bytes(), compresslevel=6))
                    self.assertLess(total_gz, CORE_THEME_GZIP_LIMIT)
            else:
                # Even without minification, unminified gzip must stay under a strict upper guard (< 64 KiB)
                raw_gz = sum(len(gzip.compress(a.read_bytes(), compresslevel=6)) for a in assets)
                self.assertLess(raw_gz, 65536, f"Raw theme gzip {raw_gz} B unexpectedly large")


if __name__ == "__main__":
    unittest.main(verbosity=2)
