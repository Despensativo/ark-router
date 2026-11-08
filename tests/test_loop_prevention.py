#!/usr/bin/env python3
"""
ARK Router — Testes Automatizados de Prevenção de Loops Históricos (Loop-Prevention Guardrails)
Valida rigorosamente os 6 padrões de erros recorrentes identificados no CHANGELOG.md:
1. QoS / CAKE Ingress, DSCP wash & Voice tin filters (preservação de ECN e mirred prio 10).
2. Cache de Navegador & Sincronia de Tokens de Revisão (ark_rev & fallbacks).
3. Bloqueio Seletivo IPv6 sem tabelas netdev destrutivas.
4. AdGuard Home Circuit Breaker & validação de socket na porta 5335.
5. Contagem de WANs no mwan3 excluindo wan6 e dhcpv6.
6. Contenção CSS Mobile (sem overflow: visible em abas) e proteção anti-reabertura de modais.
"""

import os
import re
import unittest

REPO_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class TestLoopPreventionGuardrails(unittest.TestCase):

    def test_01_qos_ingress_ecn_and_mirred_preservation(self):
        """Loop 1: Garante que qos-ingress.sh preserva ECN (retain 0xfc), repara csum e protege prio 10."""
        ingress_sh = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "qos-ingress.sh")
        self.assertTrue(os.path.isfile(ingress_sh), "qos-ingress.sh deve existir")
        with open(ingress_sh, "r", encoding="utf-8") as f:
            content = f.read()

        # ECN preservation: retain 0xfc
        self.assertIn("retain 0xfc", content, "Limpeza DSCP deve preservar ECN usando retain 0xfc")
        # IPv4 checksum repair
        self.assertIn("action csum ip4h", content, "IPv4 munge deve recalcular checksum com action csum ip4h")
        # Preference 10 (mirred) protected: loop de limpeza apenas de 1 a 9
        self.assertIn("for pref in 1 2 3 4 5 6 7 8 9; do", content, "Filtro de Ingress deve limpar apenas prefs 1..9, preservando pref 10 mirred")

    def test_02_browser_cache_and_version_synchronization(self):
        """Loop 2: Garante que ark_rev é calculado por mtime e que fallbacks de versão estão sincronizados."""
        ver_file = os.path.join(REPO_DIR, "VERSION")
        with open(ver_file, "r", encoding="utf-8") as f:
            current_ver = f.read().strip()

        header_ut = os.path.join(REPO_DIR, "root", "usr", "share", "ucode", "luci", "template", "themes", "ark", "header.ut")
        with open(header_ut, "r", encoding="utf-8") as f:
            ut_content = f.read()
        self.assertIn("${ark_v}-${ov_mt}-${th_mt}", ut_content, "header.ut deve derivar ark_rev de versão e mtime de overview + theme")
        self.assertIn(f"?? '{current_ver}'", ut_content, f"header.ut deve ter fallback correspondente à versão ativa ({current_ver})")

        header_htm = os.path.join(REPO_DIR, "root", "usr", "lib", "lua", "luci", "view", "themes", "ark", "header.htm")
        with open(header_htm, "r", encoding="utf-8") as f:
            htm_content = f.read()
        self.assertIn(f'or "{current_ver}"', htm_content, f"header.htm deve ter fallback correspondente à versão ativa ({current_ver})")

        loader_js = os.path.join(REPO_DIR, "src", "core", "i18n", "loader.js")
        with open(loader_js, "r", encoding="utf-8") as f:
            loader_content = f.read()
        self.assertIn(f"window.ARK_BUILD_VERSION || '{current_ver}'", loader_content, f"loader.js deve ter fallback de versão ({current_ver})")

    def test_03_zero_table_netdev_and_ipv6_selective_architecture(self):
        """Loop 3: Garante erradicação total de 'table netdev' e uso de 'table inet' para bloqueio IPv6."""
        # Varredura em root/ e src/ por qualquer criação de table netdev
        for root_dir in [os.path.join(REPO_DIR, "root"), os.path.join(REPO_DIR, "src")]:
            for root, _, files in os.walk(root_dir):
                for file in files:
                    if file.endswith((".sh", ".nft", ".js")):
                        file_path = os.path.join(root, file)
                        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                            lines = f.readlines()
                        for i, line in enumerate(lines, start=1):
                            # Permitir apenas comandos de limpeza preventiva: 'nft delete table netdev' ou grep em list tables
                            if "table netdev" in line:
                                is_cleanup = any(k in line for k in ["delete table netdev", "grep 'table netdev", "grep -E 'table netdev"])
                                self.assertTrue(is_cleanup, f"Criação perigosa de 'table netdev' encontrada em {file_path}:{i}: {line.strip()}")

        # Valida que network_ipv6_mwan.sh usa table inet e descarta Router Solicitations + DHCPv6
        mwan_v6 = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "modules", "network_ipv6_mwan.sh")
        with open(mwan_v6, "r", encoding="utf-8") as f:
            v6_content = f.read()
        self.assertIn("table inet ark_ipv6_selective", v6_content, "Filtro IPv6 seletivo deve usar table inet nativo")
        self.assertIn("icmpv6 type nd-router-solicit drop", v6_content, "Dispositivos IPv6 bloqueados devem ter Router Solicitations descartados")
        self.assertIn("udp dport 547 drop", v6_content, "Dispositivos IPv6 bloqueados devem ter DHCPv6 descartados")

    def test_04_adguard_circuit_breaker_and_socket_guard(self):
        """Loop 4: Garante que AdGuard Home exige porta 5335 acessível antes de redirecionar dnsmasq."""
        system_sh = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "modules", "system.sh")
        with open(system_sh, "r", encoding="utf-8") as f:
            sys_content = f.read()
        self.assertIn("5335", sys_content)
        # system.sh deve verificar socket ou fallback
        self.assertIn("nc -z 127.0.0.1 5335", sys_content, "system.sh deve verificar socket 5335 antes de apontar dnsmasq")

        common_sh = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "common.sh")
        with open(common_sh, "r", encoding="utf-8") as f:
            com_content = f.read()
        self.assertIn("equipe_perf.settings.adguard_enabled", com_content, "detect_dns_blocker deve respeitar configuração UCI do AdGuard")

        adblock_sh = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "modules", "adblock.sh")
        with open(adblock_sh, "r", encoding="utf-8") as f:
            adb_content = f.read()
        self.assertIn("ARK Router Circuit Breaker", adb_content, "adblock.sh deve manter trava de Circuit Breaker")

    def test_05_mwan3_active_wan_counting_excludes_wan6_and_dhcpv6(self):
        """Loop 5: Garante que mwan3 ignora wan6 e interfaces dhcpv6 ao calcular WANs ativas."""
        mwan_v6 = os.path.join(REPO_DIR, "root", "usr", "lib", "ark", "modules", "network_ipv6_mwan.sh")
        with open(mwan_v6, "r", encoding="utf-8") as f:
            v6_content = f.read()

        self.assertIn('grep -E \'^wan([0-9]+)?$\'', v6_content, "Filtro de WANs deve usar regex específico para interfaces WAN físicas")
        self.assertIn('[ "$p" != "dhcpv6" ]', v6_content, "Filtro de WANs deve ignorar proto dhcpv6")
        self.assertIn('[ "$w" != "wan6" ]', v6_content, "Filtro de WANs deve ignorar interface wan6")
        self.assertIn('/etc/init.d/mwan3 stop', v6_content, "Quando active_wan_count < 2, mwan3 deve ser parado para Single-WAN pura")

    def test_06_mobile_css_and_modal_state_machine(self):
        """Loop 6: Garante contenção de CSS mobile e máquina de estados anti-reabertura de modais."""
        cascade_css = os.path.join(REPO_DIR, "root", "www", "luci-static", "ark", "cascade.css")
        with open(cascade_css, "r", encoding="utf-8") as f:
            cascade_content = f.read()
        mobile_css = os.path.join(REPO_DIR, "root", "www", "luci-static", "ark", "mobile.css")
        with open(mobile_css, "r", encoding="utf-8") as f:
            mobile_content = f.read()

        # Proibição de overflow: visible !important em tabs
        for name, css in [("cascade.css", cascade_content), ("mobile.css", mobile_content)]:
            matches = re.findall(r'(\[data-tab-active="true"\][^\{]*\{[^}]*overflow:\s*visible\s*!important[^}]*\})', css, re.IGNORECASE)
            self.assertEqual(len(matches), 0, f"Encontrado overflow: visible !important em aba ativa em {name}")

        # formatters.js deve conter a máquina de estados do modal
        formatters_js = os.path.join(REPO_DIR, "src", "core", "formatters.js")
        with open(formatters_js, "r", encoding="utf-8") as f:
            fmt_content = f.read()
        self.assertIn("modalSeq", fmt_content, "formatters.js deve rastrear modalSeq")
        self.assertIn("staleModalCallbackDepth", fmt_content, "formatters.js deve tratar callbacks obsoletos de modais")

if __name__ == "__main__":
    unittest.main()
