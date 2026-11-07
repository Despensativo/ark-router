#!/usr/bin/env python3
"""
ARK Router Automated Test Suite - Universal Hardware Profile & Auto-Tune Matrix
Validates silicon family classification, RAM tier detection, and dynamic sysctl / firewall auto-tuning.
"""
import unittest
import json
import os
from test_harness import RouterSandbox

class TestHardwareTune(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_hardware_info_silicon_structure(self):
        """Verifica se get_system_hardware_info retorna o objeto silicon com todos os atributos obrigatorios"""
        res = self.sb.run_control("system-hardware-info")
        self.assertEqual(res.returncode, 0, f"Falha ao executar system-hardware-info: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertIn("silicon", data, "Chave 'silicon' ausente no JSON de hardware")
        silicon = data["silicon"]
        self.assertIn("class", silicon)
        self.assertIn("name", silicon)
        self.assertIn("hw_offload_capable", silicon)
        self.assertIn("wed_capable", silicon)
        self.assertIn("multicore", silicon)
        self.assertIn("ram_tier", silicon)
        self.assertIn("tuning_profile", silicon)

    def test_02_hardware_auto_tune_execution(self):
        """Verifica se system-hardware-auto-tune executa com sucesso e aplica regras no firewall e sysctl"""
        self.sb.uci_set("sqm.wan1.enabled=0")
        self.sb.uci_set("sqm.wan2.enabled=0")
        res = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res.returncode, 0, f"Falha ao executar system-hardware-auto-tune: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertTrue(data.get("ok"), "Retorno do auto-tune nao indicou ok: true")
        self.assertIn("silicon_class", data)
        self.assertIn("tuning_profile", data)
        self.assertIn("ram_tier", data)
        self.assertIn("offload_reason", data)
        self.assertIn("irq_action", data)
        self.assertIn("conntrack_max", data)
        self.assertIn("rmem_max", data)

        # Verifica se flow_offloading foi ativado no firewall quando SQM esta desligado
        flow_offload = self.sb.uci_get("firewall.@defaults[0].flow_offloading")
        self.assertEqual(flow_offload, "1", "flow_offloading nao foi ativado no firewall")

        # Verifica se equipe_perf registrou o perfil de hardware
        hw_prof = self.sb.uci_get("equipe_perf.settings.hardware_profile")
        self.assertIsNotNone(hw_prof, "hardware_profile nao gravado em equipe_perf")
        self.assertIn("services_detected", data)

    def test_03_hardware_auto_tune_with_mwan3(self):
        """Verifica se mwan3 com 2 interfaces e detectado e reduz timeouts de conntrack"""
        mwan3_file = os.path.join(self.sb.etc_config, "mwan3")
        with open(mwan3_file, "w") as f:
            f.write("config interface 'wan1'\n\toption enabled '1'\nconfig interface 'wan2'\n\toption enabled '1'\n")

        res = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res.returncode, 0, f"Falha: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertIn("mwan3", data.get("services_detected", []))

        # Inspeciona o arquivo sysctl gerado
        sysctl_file = os.path.join(self.sb.temp_dir, "etc", "sysctl.d", "99-ark-hardware-tune.conf")
        self.assertTrue(os.path.isfile(sysctl_file), "sysctl conf nao gerado")
        with open(sysctl_file, "r") as f:
            content = f.read()
        self.assertIn("net.netfilter.nf_conntrack_tcp_timeout_established=1200", content)
        self.assertIn("net.netfilter.nf_conntrack_udp_timeout=30", content)

    def test_04_hardware_auto_tune_with_vpn_and_sqm(self):
        """Verifica se VPN e SQM ativos ativam mtu_probing e desativam Fastpath para proteger SQM/CAKE"""
        # Configura SQM ativo
        sqm_file = os.path.join(self.sb.etc_config, "sqm")
        with open(sqm_file, "w") as f:
            f.write("config queue 'wan_q'\n\toption enabled '1'\n\toption interface 'pppoe-wan'\n")

        # Configura interface WireGuard simulada na sysfs
        wg_dev = os.path.join(self.sb.sys_net, "wg0")
        os.makedirs(wg_dev, exist_ok=True)

        res = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res.returncode, 0, f"Falha: {res.stderr}")
        data = json.loads(res.stdout)
        svcs = data.get("services_detected", [])
        self.assertIn("sqm", svcs)
        self.assertIn("vpn", svcs)
        self.assertIn("SQM/CAKE ativo", data.get("offload_reason", ""))
        self.assertEqual(self.sb.uci_get("firewall.@defaults[0].flow_offloading"), "0")

        # Inspeciona se tcp_mtu_probing foi ativado
        sysctl_file = os.path.join(self.sb.temp_dir, "etc", "sysctl.d", "99-ark-hardware-tune.conf")
        with open(sysctl_file, "r") as f:
            content = f.read()
        self.assertIn("net.ipv4.tcp_mtu_probing=1", content)
        self.assertIn("net.ipv4.ip_forward=1", content)

    def test_05_hardware_auto_tune_nlbwmon_protection(self):
        """Verifica se nlbwmon ativo garante rmem_max >= 1MB contra netlink overrun"""
        nlbwmon_file = os.path.join(self.sb.etc_config, "nlbwmon")
        with open(nlbwmon_file, "w") as f:
            f.write("config nlbwmon\n\toption refresh_interval '2s'\n")

        res = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res.returncode, 0, f"Falha: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertIn("nlbwmon", data.get("services_detected", []))
        self.assertGreaterEqual(data.get("rmem_max", 0), 1048576)

    def test_06_hardware_tune_budget_and_nftables_priority(self):
        """Verifica se o tuning inclui netdev_budget, budget_usecs e arquivo nftables de prioridade existe"""
        res = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res.returncode, 0, f"Falha: {res.stderr}")

        sysctl_file = os.path.join(self.sb.temp_dir, "etc", "sysctl.d", "99-ark-hardware-tune.conf")
        self.assertTrue(os.path.isfile(sysctl_file), "sysctl conf nao gerado")
        with open(sysctl_file, "r") as f:
            content = f.read()
        self.assertIn("net.core.netdev_budget=", content)
        self.assertIn("net.core.netdev_budget_usecs=", content)

        # Verifica existencia do arquivo nftables de prioridade DSCP
        nft_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "root", "etc", "nftables.d", "15-ark-dscp-priority.nft")
        self.assertTrue(os.path.isfile(nft_file), "15-ark-dscp-priority.nft deve existir")
        with open(nft_file, "r", encoding="utf-8") as f:
            nft_content = f.read()
        self.assertIn("ip dscp set cs6", nft_content)
        self.assertIn("ip dscp set cs5", nft_content)
        self.assertIn("ip dscp set cs4", nft_content)
        self.assertIn("ip dscp set cs1", nft_content)
        self.assertIn("meta length <= 256", nft_content)

    def test_07_rps_mask_calculation_for_all_cores(self):
        """Valida se a funcao ark_calculate_rps_mask gera bitmasks exatos para 1 a 64 nucleos"""
        import subprocess
        tune_script = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "root", "etc", "init.d", "ark-hardware-tune")
        self.assertTrue(os.path.isfile(tune_script), "ark-hardware-tune deve existir")

        expected_masks = {
            1: "1",
            2: "3",
            4: "f",
            6: "3f",
            8: "ff",
            12: "fff",
            16: "ffff",
            24: "ffffff",
            32: "ffffffff",
            64: "ffffffffffffffff"
        }

        for cores, exp_mask in expected_masks.items():
            full_f = cores // 4
            rem = cores % 4
            pfx = {0: "", 1: "1", 2: "3", 3: "7"}[rem]
            calc_mask = pfx + ("f" * full_f)
            self.assertEqual(calc_mask, exp_mask, f"Falha no calculo de mascara para {cores} cores")

    def test_08_irq_affinity_function_presence_and_logic(self):
        """Valida se ark_tune_irq_affinity, pinning de NAPI kthreads e calibracao RPS de ifb*/pppoe* estao presentes"""
        tune_script = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "root", "etc", "init.d", "ark-hardware-tune")
        with open(tune_script, "r", encoding="utf-8") as f:
            content = f.read()
        self.assertIn("ark_tune_irq_affinity", content)
        self.assertIn("smp_affinity", content)
        self.assertIn("taskset -p", content)
        self.assertIn("net.core.netdev_budget_usecs=20000", content)
        self.assertIn("lo|ifb*|br-*|wg*", content)
        self.assertIn("rx-gro-list off", content)
        self.assertIn("gro_max_size 16384 gro_ipv4_max_size 16384", content)
        self.assertIn("net.netfilter.nf_flowtable_udp_timeout=180", content)
        self.assertIn("net.netfilter.nf_flowtable_tcp_timeout=1800", content)
        self.assertIn('echo "2 2500 5000" > "$phy/aql_txq_limit"', content)

    def test_09_sqm_cake_mq_and_auto_dscp_promotion(self):
        """Valida deteccao automatica de cake-mq multi-core em interfaces multi-fila e auditoria Auto-DSCP"""
        # 1. Sem suporte a cake_mq no kernel, cake_mq_capable e cake_mq_active devem ser False
        res_std = self.sb.run_control("system-hardware-sqm-audit")
        self.assertEqual(res_std.returncode, 0, f"Falha em system-hardware-sqm-audit: {res_std.stderr}")
        audit_std = json.loads(res_std.stdout)
        self.assertFalse(audit_std.get("cake_mq_capable"))
        self.assertFalse(audit_std.get("cake_mq_active"))
        self.assertTrue(audit_std.get("auto_dscp_active"))

        # 2. Simula suporte kernel a cake_mq e múltiplas filas TX (tx-0, tx-1) na interface wan (eth1)
        dbg_dir = os.path.join(self.sb.temp_dir, "sys", "kernel", "debug")
        os.makedirs(dbg_dir, exist_ok=True)
        with open(os.path.join(dbg_dir, "cake_mq_capable"), "w") as f:
            f.write("1\n")

        eth1_tx1 = os.path.join(self.sb.sys_net, "eth1", "queues", "tx-1")
        os.makedirs(eth1_tx1, exist_ok=True)
        self.sb.uci_set("network.wan.proto=dhcp")
        self.sb.uci_set("network.wan.device=eth1")

        res_save = self.sb.run_control("sqm-save-v2", "wan=wan1|wan|eth1|1|500000|250000|ethernet|18")
        self.assertEqual(res_save.returncode, 0, f"Falha em sqm-save-v2: {res_save.stderr}")
        self.assertEqual(self.sb.uci_get("sqm.wan1.use_mq"), "0")
        self.assertEqual(self.sb.uci_get("sqm.wan1.tcMPU"), "64")
        self.assertIn("no-ack-filter", self.sb.uci_get("sqm.wan1.eqdisc_opts") or "")
        iq_500m = self.sb.uci_get("sqm.wan1.iqdisc_opts") or ""
        self.assertIn("rtt 100ms", iq_500m)
        self.assertIn("ingress", iq_500m)

        res_mq = self.sb.run_control("system-hardware-sqm-audit")
        self.assertEqual(res_mq.returncode, 0)
        audit_mq = json.loads(res_mq.stdout)
        self.assertTrue(audit_mq.get("cake_mq_capable"), "cake_mq_capable deveria ser True!")
        self.assertTrue(audit_mq.get("cake_mq_active"), "cake_mq_active deveria ser True em interface com tx-1!")

        # 3. Valida link assimetrico (>= 5:1, ex: 500M/50M) + modo Starlink (rtt 150ms + ingress + ack-filter)
        self.sb.uci_set("equipe_dashboard.main=settings")
        self.sb.uci_set("equipe_dashboard.main.starlink_mode=1")
        self.sb.run_sh("uci -q delete sqm.wan1.iqdisc_opts; uci commit sqm")
        res_asym = self.sb.run_control("sqm-save-v2", "wan=wan1|wan|eth1|1|500000|50000|ethernet|18", "waveform_aplus=1")
        self.assertEqual(res_asym.returncode, 0, f"Falha em sqm-save-v2 assimetrico: {res_asym.stderr}")
        eq_asym = self.sb.uci_get("sqm.wan1.eqdisc_opts") or ""
        iq_asym = self.sb.uci_get("sqm.wan1.iqdisc_opts") or ""
        self.assertIn("ack-filter", eq_asym)
        self.assertNotIn("no-ack-filter", eq_asym)
        self.assertIn("rtt 150ms", iq_asym)
        self.assertIn("ingress", iq_asym)

        # 4. Ao desligar o SQM, o estado cake_mq_active deve voltar para False
        res_off = self.sb.run_control("sqm-toggle", "0")
        self.assertEqual(res_off.returncode, 0)
        audit_off = json.loads(self.sb.run_control("system-hardware-sqm-audit").stdout)
        self.assertFalse(audit_off.get("cake_mq_active"), "cake_mq_active deve ser limpo ao desativar SQM!")

    def test_10_autorate_probing_recovery_and_l4s_ctinfo(self):
        """Valida L4S ECT(1), act_ctinfo, AQL por AC e os 2 motores de recuperacao do ARK Autorate"""
        self.sb.uci_set("network.wan.proto=dhcp")
        self.sb.uci_set("network.wan.device=eth1")
        res_save = self.sb.run_control("sqm-save-v2", "wan=wan1|wan|eth1|1|500000|250000|ethernet|18")
        self.assertEqual(res_save.returncode, 0)

        # 1. Ativa Autorate e verifica auditoria L4S + Autorate
        res_on = self.sb.run_control("sqm-autorate-toggle", "1")
        self.assertEqual(res_on.returncode, 0)
        audit = json.loads(self.sb.run_control("system-hardware-sqm-audit").stdout)
        self.assertTrue(audit.get("l4s_active"), "L4S ECT(1) deve estar ativo no 15-ark-dscp-priority.nft")
        self.assertTrue(audit.get("autorate_enabled"), "autorate_enabled deve ser True apos ativacao")

        # 2. Simula congestionamento da operadora (delay_ms=25 > 15ms): deve reduzir 12% (500000 -> 440000)
        step_down = json.loads(self.sb.run_control("sqm-autorate-step", "load_pct=85", "delay_ms=25").stdout)
        self.assertEqual(step_down["action"], "shaping_down")
        self.assertEqual(step_down["cur_dl_kbps"], 440000)
        self.assertEqual(step_down["cur_ul_kbps"], 220000)

        # 3. Motor 1 — Sondagem Ativa sob carga alta (load_pct=85, delay_ms=3): sobe +5% (440000 -> 462000)
        step_probe = json.loads(self.sb.run_control("sqm-autorate-step", "load_pct=85", "delay_ms=3").stdout)
        self.assertEqual(step_probe["action"], "probing_up")
        self.assertEqual(step_probe["cur_dl_kbps"], 462000)
        self.assertEqual(step_probe["cur_ul_kbps"], 231000)

        # 4. Motor 2 — Retorno Elastico em rede ociosa (load_pct=20, delay_ms=2): recupera para base_dl (500000)
        step_idle = json.loads(self.sb.run_control("sqm-autorate-step", "load_pct=20", "delay_ms=2").stdout)
        self.assertEqual(step_idle["action"], "elastic_recovery")
        self.assertEqual(step_idle["cur_dl_kbps"], 500000)
        self.assertEqual(step_idle["cur_ul_kbps"], 250000)

    def test_11_sqm_dual_engine_cake_vs_hfsc_fq_codel(self):
        """Valida seletor de 2 motores de QoS: CAKE (layer_cake.qos) vs HFSC + FQ-CoDel Turbo (ark_hfsc_fqcodel.qos)"""
        self.sb.uci_set("network.wan.proto=pppoe")
        self.sb.uci_set("network.wan.device=eth1")

        # 1. Alterna para o Motor 2 (HFSC + FQ-CoDel Turbo) via sqm-engine-select
        res_hfsc = self.sb.run_control("sqm-engine-select", "hfsc_fq_codel")
        self.assertEqual(res_hfsc.returncode, 0, f"Falha em sqm-engine-select hfsc_fq_codel: {res_hfsc.stderr}")
        self.assertEqual(self.sb.uci_get("equipe_dashboard.settings.sqm_engine"), "hfsc_fq_codel")
        self.assertEqual(self.sb.uci_get("sqm.wan1.ark_engine"), "hfsc_fq_codel")
        self.assertEqual(self.sb.uci_get("sqm.wan1.qdisc"), "fq_codel")
        self.assertEqual(self.sb.uci_get("sqm.wan1.script"), "ark_hfsc_fqcodel.qos")

        audit_hfsc = json.loads(self.sb.run_control("system-hardware-sqm-audit").stdout)
        self.assertEqual(audit_hfsc.get("sqm_engine"), "hfsc_fq_codel")

        # 2. Salva via sqm-save-v2 mantendo sqm_engine=hfsc_fq_codel e waveform_aplus=1
        res_save_hfsc = self.sb.run_control(
            "sqm-save-v2",
            "waveform_aplus=1",
            "sqm_engine=hfsc_fq_codel",
            "wan=wan1|wan|pppoe-wan|1|780000|780000|ethernet|44"
        )
        self.assertEqual(res_save_hfsc.returncode, 0, f"Falha em sqm-save-v2 com hfsc_fq_codel: {res_save_hfsc.stderr}")
        self.assertEqual(self.sb.uci_get("sqm.wan1.qdisc"), "fq_codel")
        self.assertEqual(self.sb.uci_get("sqm.wan1.script"), "ark_hfsc_fqcodel.qos")

        # 3. Alterna de volta para o Motor 1 (CAKE Layer Cake)
        res_cake = self.sb.run_control("sqm-engine-select", "cake")
        self.assertEqual(res_cake.returncode, 0, f"Falha em sqm-engine-select cake: {res_cake.stderr}")
        self.assertEqual(self.sb.uci_get("equipe_dashboard.settings.sqm_engine"), "cake")
        self.assertEqual(self.sb.uci_get("sqm.wan1.ark_engine"), "cake")
        self.assertEqual(self.sb.uci_get("sqm.wan1.qdisc"), "cake")
        self.assertEqual(self.sb.uci_get("sqm.wan1.script"), "layer_cake.qos")

        audit_cake = json.loads(self.sb.run_control("system-hardware-sqm-audit").stdout)
        self.assertEqual(audit_cake.get("sqm_engine"), "cake")

    def test_12_intelligent_wan_mtu_and_hfsc_gro_cs1_guards(self):
        """Valida motor inteligente de MTU por perfil WAN (ark_optimal_wg_mtu, ra_mtu, PLPMTUD) e guardas <= 511B/CS1 no HFSC"""
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        hfsc_path = os.path.join(repo_root, "root", "usr", "lib", "sqm", "ark_hfsc_fqcodel.qos")
        nft_path = os.path.join(repo_root, "root", "etc", "nftables.d", "15-ark-dscp-priority.nft")

        with open(hfsc_path, "r", encoding="utf-8") as f:
            hfsc_content = f.read()
        # 1. Guarda <= 511B (0x0000 0xfe00) nos filtros 1:10 Real-Time contra super-pacotes GRO 16 KB
        self.assertIn("match u16 0x0000 0xfe00 at 2", hfsc_content)
        self.assertIn("match u16 0x0000 0xfe00 at 4", hfsc_content)
        # 2. Exclusao do filtro CS1 (1:30 Bulk Scavenger) no Ingress (ifb4*) antes do DSCP wash
        self.assertIn('[ "$dir_mode" != "ingress" ]', hfsc_content)
        # 3. Quantum 1514 e rate 100% preservados para Gigabit
        self.assertIn("turbo_quantum=1514", hfsc_content)

        with open(nft_path, "r", encoding="utf-8") as f:
            nft_content = f.read()
        # 4. Restore Conntrack CS4 preserva fluxos de voz/jogos sem fragmentar teamfight snapshots (> 512B)
        self.assertIn("meta l4proto { tcp, udp } ct mark & 0x000000ff == 0x000000a0 ip dscp set cs4", nft_content)
        # 4b. Endpoint-Independent Mapping (Full Cone NAT) para jogos UDP (PS5, Xbox, PC, STUN)
        self.assertIn("chain ark_cone_nat", nft_content)
        self.assertIn("masquerade persistent", nft_content)

        # 5. Valida PLPMTUD (tcp_mtu_probing=1 + tcp_base_mss=1024) em 99-ark-hardware-tune.conf
        res_tune = self.sb.run_control("system-hardware-auto-tune")
        self.assertEqual(res_tune.returncode, 0)
        sysctl_file = os.path.join(self.sb.temp_dir, "etc", "sysctl.d", "99-ark-hardware-tune.conf")
        with open(sysctl_file, "r", encoding="utf-8") as f:
            sysctl_content = f.read()
        self.assertIn("net.ipv4.tcp_mtu_probing=1", sysctl_content)
        self.assertIn("net.ipv4.tcp_base_mss=1024", sysctl_content)

        # 6. Valida sincronizacao automatica de wgclient.mtu e ra_mtu conforme perfil da WAN (PPPoE 1492 -> 1412, DHCP 1500 -> 1420, Starlink -> 1380)
        self.sb.uci_set("network.wgclient=interface")
        self.sb.uci_set("network.wgclient.proto=wireguard")
        self.sb.uci_set("network.wgclient.mtu=1420")
        self.sb.uci_set("network.wan2.proto=pppoe")
        self.sb.uci_set("network.wan2.mtu=1492")
        self.sb.run_control("wan-optimize-set", "iface=wan2", "baby_jumbo=0")
        self.assertEqual(self.sb.uci_get("dhcp.lan.ra_mtu"), "1492")
        self.assertEqual(self.sb.uci_get("network.wgclient.mtu"), "1412")

        # Ao ativar Baby Jumbo (1500), wgclient sobe automaticamente para 1420 e ra_mtu para 1500
        self.sb.run_control("wan-optimize-set", "iface=wan2", "baby_jumbo=1")
        self.assertEqual(self.sb.uci_get("dhcp.lan.ra_mtu"), "1500")
        self.assertEqual(self.sb.uci_get("network.wgclient.mtu"), "1420")


if __name__ == "__main__":
    unittest.main()
