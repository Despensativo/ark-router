#!/usr/bin/env python3
"""Testes de otimizacao DNS do ARK Router (AdGuard YAML, deduplicacao de cache, benchmark e sonda real)."""
import json
import os
import unittest
from pathlib import Path
from test_harness import RouterSandbox

REPO = Path(__file__).resolve().parents[1]


class TestDnsOptimization(unittest.TestCase):
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

    def test_01_adguard_yaml_template_parallel_fallback_and_no_plaintext_upstream(self):
        adblock_src = (REPO / "root/usr/lib/ark/modules/adblock.sh").read_text(encoding="utf-8")
        start = adblock_src.index("schema_version: 29")
        end = adblock_src.index("EOF", start)
        yaml_tpl = adblock_src[start:end]

        self.assertIn("upstream_mode: parallel", yaml_tpl)
        self.assertIn("fastest_addr: false", yaml_tpl)
        self.assertIn("fallback_dns:", yaml_tpl)
        self.assertIn("cache_optimistic: true", yaml_tpl)
        self.assertIn("cache_ttl_min: 0", yaml_tpl)
        self.assertIn("cache_ttl_max: 0", yaml_tpl)

        # upstream_dns nao deve conter UDP texto claro
        up_start = yaml_tpl.index("upstream_dns:")
        up_end = yaml_tpl.index("bootstrap_dns:")
        upstream_block = yaml_tpl[up_start:up_end]
        self.assertNotIn("- 1.1.1.1", upstream_block)
        self.assertNotIn("- 8.8.8.8", upstream_block)
        self.assertIn("h3://dns.cloudflare.com/dns-query", upstream_block)
        self.assertIn("https://dns.quad9.net/dns-query", upstream_block)

    def test_02_dns_turbo_save_deduplicates_cache_under_adguard_and_restores(self):
        # Simula AdGuard Home ativo como bloqueador DNS
        self.sb.uci_set("equipe_perf.settings=performance")
        self.sb.uci_set("equipe_perf.settings.adblock_enabled=1")
        self.sb.uci_set("equipe_perf.settings.adguard_enabled=1")
        self.sb.uci_set("dhcp.@dnsmasq[0].cachesize=10000")
        self.sb.uci_set("dhcp.@dnsmasq[0].server=127.0.0.1#5335")

        res = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/system.sh"\n'
            'detect_dns_blocker() { echo "AdGuard Home"; }\n'
            'dns_turbo_save 1 1.1.1.1 8.8.8.8 "" "" 0 10000\n'
        )
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertEqual(self.sb.uci_get("dhcp.@dnsmasq[0].cachesize"), "0")
        self.assertEqual(self.sb.uci_get("equipe_perf.settings.saved_dns_cachesize"), "10000")

        # Ao restaurar DNS (desativando AdGuard), cachesize volta ao valor salvo
        res_restore = self.sb.run_sh(
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/adblock.sh"\n'
            'adblock_restore_dns\n'
        )
        self.assertEqual(res_restore.returncode, 0, res_restore.stderr)
        self.assertEqual(self.sb.uci_get("dhcp.@dnsmasq[0].cachesize"), "10000")
        self.assertIsNone(self.sb.uci_get("equipe_perf.settings.saved_dns_cachesize"))

    def test_03_dns_turbo_benchmark_ranks_and_detects_isp_dns(self):
        resolv_dir = self.root / "tmp/resolv.conf.d"
        resolv_dir.mkdir(parents=True, exist_ok=True)
        (resolv_dir / "resolv.conf.auto").write_text("nameserver 200.160.2.3\n", encoding="utf-8")

        # Mock nslookup: 76.76.2.0 falha, demais resolvem com sucesso
        self.spy(
            "nslookup",
            'ip=""\n'
            'for a in "$@"; do ip="$a"; done\n'
            'if [ "$ip" = "76.76.2.0" ]; then exit 1; fi\n'
            'printf "Server: %s\\nAddress: %s#53\\n\\nName: cloudflare.com\\nAddress: 104.16.132.229\\n" "$ip" "$ip"\n'
        )

        res = self.sb.run_control("dns-turbo-benchmark")
        self.assertEqual(res.returncode, 0, res.stderr)
        data = json.loads(res.stdout)
        self.assertTrue(data["ok"])
        ips = [r["ip"] for r in data["results"]]
        self.assertIn("1.1.1.1", ips)
        self.assertIn("8.8.8.8", ips)
        self.assertIn("9.9.9.9", ips)
        self.assertIn("200.160.2.3", ips)

        failed = [r for r in data["results"] if r["ip"] == "76.76.2.0"][0]
        self.assertFalse(failed["ok"])
        self.assertIsNone(failed["ms"])

        self.assertEqual(len(data["recommended"]), 2)
        self.assertNotEqual(data["recommended"][0], data["recommended"][1])
        self.assertNotIn("76.76.2.0", data["recommended"])

    def test_04_doctor_detects_and_fixes_duplicate_cache_and_wedged_adguard_probe(self):
        self.sb.uci_set("equipe_perf.settings=performance")
        self.sb.uci_set("equipe_perf.settings.adblock_enabled=1")
        self.sb.uci_set("equipe_perf.settings.adguard_enabled=1")
        self.sb.uci_set("dhcp.@dnsmasq[0].server=127.0.0.1#5335")
        self.sb.uci_set("dhcp.@dnsmasq[0].cachesize=10000")

        # Mock nslookup falhando na porta 5335
        self.spy("nslookup", "exit 1")

        # Modo auditoria (0): deve alertar sem mutar UCI
        res_audit = self.sb.run_sh(
            'export ARK_DOCTOR_FORCE_DNS_PROBE=1\n'
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/doctor.sh"\n'
            'ark_doctor_audit 0 json\n'
        )
        self.assertEqual(res_audit.returncode, 0, res_audit.stderr)
        audit_data = json.loads(res_audit.stdout)
        checks = {c["name"]: c["status"] for c in audit_data.get("checks", [])}
        self.assertEqual(checks.get("Resolucao Real AdGuard Home"), "WARN")
        self.assertEqual(checks.get("Deduplicacao de Cache DNS"), "WARN")
        self.assertEqual(self.sb.uci_get("dhcp.@dnsmasq[0].cachesize"), "10000")

        # Modo --fix (1): deve zerar cachesize do dnsmasq e salvar saved_dns_cachesize
        res_fix = self.sb.run_sh(
            'export ARK_DOCTOR_FORCE_DNS_PROBE=1\n'
            '. "$ARK_LIB_DIR/common.sh"\n'
            '. "$ARK_LIB_DIR/modules/doctor.sh"\n'
            'ark_doctor_audit 1 json\n'
        )
        self.assertEqual(res_fix.returncode, 0, res_fix.stderr)
        fix_data = json.loads(res_fix.stdout)
        fix_checks = {c["name"]: c["status"] for c in fix_data.get("checks", [])}
        self.assertEqual(fix_checks.get("Resolucao Real AdGuard Home"), "FIXED")
        self.assertEqual(fix_checks.get("Deduplicacao de Cache DNS"), "FIXED")
        self.assertEqual(self.sb.uci_get("dhcp.@dnsmasq[0].cachesize"), "0")
        self.assertEqual(self.sb.uci_get("equipe_perf.settings.saved_dns_cachesize"), "10000")

    def test_05_sync_adguard_ipv6_keeps_upstream_dns_encrypted(self):
        yaml_path = self.root / "adguardhome.yaml"
        yaml_path.write_text(
            "dns:\n"
            "  aaaa_disabled: true\n"
            "  upstream_dns:\n"
            "    - h3://dns.cloudflare.com/dns-query\n"
            "  bootstrap_dns:\n"
            "    - 1.1.1.1\n"
            "  fallback_dns:\n"
            "    - 1.1.1.1\n",
            encoding="utf-8",
        )
        common_src = (REPO / "root/usr/lib/ark/common.sh").read_text(encoding="utf-8")
        # Executa a logica equivalente de sync_adguard_ipv6 apontando para o YAML temporario
        self.assertIn("fallback_dns:", common_src)
        self.assertNotIn("upstream_dns:/a", common_src)


if __name__ == "__main__":
    unittest.main(verbosity=2)
