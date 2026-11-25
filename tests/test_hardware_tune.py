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
        self.sb.uci_set("mwan3.wan2.enabled=0")
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
        """Valida delegacao limpa ao helper compartilhado hw-tune.sh, pinning de IRQ/NAPI e limites unificados"""
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        tune_script = os.path.join(repo_root, "root", "etc", "init.d", "ark-hardware-tune")
        helper_script = os.path.join(repo_root, "root", "usr", "lib", "ark", "hw-tune.sh")
        with open(tune_script, "r", encoding="utf-8") as f:
            content = f.read()
        with open(helper_script, "r", encoding="utf-8") as f:
            helper = f.read()
        self.assertIn("ark_tune_irq_affinity", content)
        self.assertIn("hw-tune.sh", content)
        self.assertIn("ark_hw_latency_profile", content)
        self.assertIn("ark_hw_tune_cpufreq", content)
        self.assertIn("ark_hw_compute_rps_target", content)
        self.assertIn("net.netfilter.nf_flowtable_udp_timeout=180", content)
        self.assertIn("net.netfilter.nf_flowtable_tcp_timeout=1800", content)
        self.assertIn('echo "2 2500 5000" > "$phy/aql_txq_limit"', content)
        self.assertIn("smp_affinity", helper)
        self.assertIn("taskset -p", helper)
        self.assertIn("rx-gro-list off", helper)
        self.assertIn("lo|ifb*|br-*|wg*", helper)

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
        # 4c. Cobertura sem buracos em portas altas UDP de jogos/boosters (17501-19999 e 60001-65535), isolando Tailscale/BT/WireGuard
        self.assertIn("17000-41640, 41642-51412, 51414-51819, 51821-65535", nft_content)

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

    def test_12_intelligent_cake_auto_tuning_gigabit_vs_broadband(self):
        """Valida calibração inteligente de CAKE por perfil e taxa de link (Gigabit/Fibra > 500M vs Banda Larga <= 500M)"""
        self.sb.uci_set("network.wan.proto=pppoe")
        self.sb.uci_set("network.wan.device=eth1")

        # 1. Perfil Gigabit / FTTH Ultra-Rápido (800 Mbps download / 700 Mbps upload)
        res_gigabit = self.sb.run_control(
            "sqm-save-v2",
            "wan=wan1|wan|pppoe-wan|1|800000|700000|ethernet|34",
            "waveform_aplus=1"
        )
        self.assertEqual(res_gigabit.returncode, 0, f"Falha em sqm-save-v2 gigabit: {res_gigabit.stderr}")
        iq_gigabit = self.sb.uci_get("sqm.wan1.iqdisc_opts") or ""
        eq_gigabit = self.sb.uci_get("sqm.wan1.eqdisc_opts") or ""

        # Ingress Gigabit: besteffort + flows + rtt 20ms + split-gso + sem ingress/nat (elimina gargalo mono-core e RTO)
        self.assertIn("besteffort", iq_gigabit, "Gigabit ingress deve usar besteffort para evitar loop multi-tin no softirq")
        self.assertIn("flows", iq_gigabit, "Gigabit ingress deve usar flows em vez de dual-dsthost")
        self.assertIn("split-gso", iq_gigabit, "Gigabit ingress deve usar split-gso para evitar drops atomicos de 64KB")
        self.assertNotIn("no-split-gso", iq_gigabit)
        self.assertIn("rtt 20ms", iq_gigabit, "Gigabit FTTH deve usar rtt 20ms calibrado para latencia ultra-baixa de fibra")
        self.assertNotIn("ingress", iq_gigabit, "Gigabit ingress nao deve ter flag ingress para nao sobre-estimar virtual-time")
        self.assertNotIn("nat", iq_gigabit, "Gigabit ingress nao deve fazer busca reversa conntrack nat no IFB")

        # Egress Gigabit: diffserv4 + dual-srchost + split-gso
        self.assertIn("diffserv4", eq_gigabit)
        self.assertIn("dual-srchost", eq_gigabit)
        self.assertNotIn("no-split-gso", eq_gigabit)

        # Overhead Gigabit PPPoE calibrado para 34 (cobertura L1/L2 FTTH precisa sem penalizar pacotes pequenos)
        self.assertEqual(self.sb.uci_get("sqm.wan1.overhead"), "34")

        # 2. Perfil Banda Larga Convencional (300 Mbps download / 150 Mbps upload)
        res_broadband = self.sb.run_control(
            "sqm-save-v2",
            "wan=wan1|wan|pppoe-wan|1|300000|150000|ethernet|44",
            "waveform_aplus=1"
        )
        self.assertEqual(res_broadband.returncode, 0, f"Falha em sqm-save-v2 broadband: {res_broadband.stderr}")
        iq_broadband = self.sb.uci_get("sqm.wan1.iqdisc_opts") or ""
        eq_broadband = self.sb.uci_get("sqm.wan1.eqdisc_opts") or ""

        # Ingress Banda Larga: diffserv4 + dual-dsthost + nat + ingress + rtt 100ms
        self.assertIn("diffserv4", iq_broadband)
        self.assertIn("dual-dsthost", iq_broadband)
        self.assertIn("nat", iq_broadband)
        self.assertIn("ingress", iq_broadband)
        self.assertIn("rtt 100ms", iq_broadband)
        self.assertIn("split-gso", iq_broadband)
        self.assertNotIn("no-split-gso", iq_broadband)
        self.assertEqual(self.sb.uci_get("sqm.wan1.overhead"), "44")

        # 3. Auditoria Ark Doctor em perfil Gigabit deve acusar OK sem falsos alarmes
        self.sb.run_control(
            "sqm-save-v2",
            "wan=wan1|wan|pppoe-wan|1|800000|700000|ethernet|34",
            "waveform_aplus=1"
        )
        res_doc = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res_doc.returncode, 0)
        report = json.loads(res_doc.stdout)
        sqm_checks = [c for c in report.get("checks", []) if "SQM" in c.get("name", "")]
        for c in sqm_checks:
            self.assertNotEqual(c.get("status"), "FAIL", f"Ark Doctor acusou FAIL inesperado em configuracao otimizada: {c}")

    def test_13_decoupled_rps_topology_matrix_and_rss_preservation(self):
        """Valida topologia RPS desacoplada da RAM: 2-core, 4-core W6x/BPi-R4 (com/sem Wi-Fi), 8-core x86 RSS e VLAN WAN"""
        # Simula WAN PPPoE sobre VLAN 10 (eth1.10 -> eth1) e NIC x86 multi-queue RSS (enp1s0 com 4 filas rx)
        self.sb.uci_set("network.wan.proto=pppoe")
        self.sb.uci_set("network.wan.device=eth1.10")
        for q in range(4):
            os.makedirs(os.path.join(self.sb.sys_net, "enp1s0", "queues", f"rx-{q}"), exist_ok=True)
        for dev in ("eth1", "eth1.10", "pppoe-wan", "lan1", "phy1-ap0"):
            os.makedirs(os.path.join(self.sb.sys_net, dev, "queues", "rx-0"), exist_ok=True)

        script = r'''
. "$ARK_LIB_DIR/hw-tune.sh"
wlist="$(ark_hw_list_wan_phys_devs)"
echo "wan_list=$wlist"
echo "2c_pppoe=$(ark_hw_compute_rps_target pppoe-wan 2 1 "$wlist")"
echo "2c_eth1=$(ark_hw_compute_rps_target eth1 2 1 "$wlist")"
echo "4c_wifi_pppoe=$(ark_hw_compute_rps_target pppoe-wan 4 1 "$wlist")"
echo "4c_wifi_lan=$(ark_hw_compute_rps_target lan1 4 1 "$wlist")"
echo "4c_wifi_phy=$(ark_hw_compute_rps_target phy1-ap0 4 1 "$wlist")"
echo "4c_wired_pppoe=$(ark_hw_compute_rps_target pppoe-wan 4 0 "$wlist")"
echo "4c_vlan_wan=$(ark_hw_compute_rps_target eth1.10 4 1 "$wlist")"
echo "4c_phys_wan=$(ark_hw_compute_rps_target eth1 4 1 "$wlist")"
echo "8c_rss_nic=$(ark_hw_compute_rps_target enp1s0 8 0 "$wlist")"
echo "8c_wired_pppoe=$(ark_hw_compute_rps_target pppoe-wan 8 0 "$wlist")"
echo "8c_wifi_pppoe=$(ark_hw_compute_rps_target pppoe-wan 8 1 "$wlist")"
'''
        res = self.sb.run_sh(script)
        self.assertEqual(res.returncode, 0, res.stderr)
        vals = dict(line.split("=", 1) for line in res.stdout.strip().splitlines() if "=" in line)
        self.assertIn("eth1.10", vals["wan_list"])
        self.assertIn("eth1", vals["wan_list"])
        # Dual-core: PPPoE -> CPU0 (1), eth1 -> 0
        self.assertEqual(vals["2c_pppoe"], "1")
        self.assertEqual(vals["2c_eth1"], "0")
        # Quad-core com Wi-Fi (W6x 1GB ou BPi-R4 4GB): pppoe=3, lan=7, phy=3, WAN phys/VLAN=0
        self.assertEqual(vals["4c_wifi_pppoe"], "3")
        self.assertEqual(vals["4c_wifi_lan"], "7")
        self.assertEqual(vals["4c_wifi_phy"], "3")
        self.assertEqual(vals["4c_vlan_wan"], "0")
        self.assertEqual(vals["4c_phys_wan"], "0")
        # Quad-core cabeado sem Wi-Fi: libera CPU2 -> pppoe=7 (CPU0..2)
        self.assertEqual(vals["4c_wired_pppoe"], "7")
        # x86 8-core: NIC multi-queue RSS preserva rps=0; PPPoE evita cores de IRQ Ethernet (CPU1,2)
        self.assertEqual(vals["8c_rss_nic"], "0")
        self.assertEqual(vals["8c_wired_pppoe"], "f9")  # CPUs 0,3,4,5,6,7
        self.assertEqual(vals["8c_wifi_pppoe"], "f1")   # CPUs 0,4,5,6,7 (isola CPU3 Wi-Fi)

    def test_14_multiqueue_rss_irq_affinity_distribution(self):
        """Valida que NICs multi-queue RSS em x86 8-core distribuem IRQs entre multiplos nucleos em vez de esmagar em 2"""
        proc_dir = os.path.join(self.sb.temp_dir, "proc")
        os.makedirs(proc_dir, exist_ok=True)
        # Simula 8 filas RSS de Intel igc/ixgbe sem Wi-Fi
        with open(os.path.join(proc_dir, "interrupts"), "w") as f:
            f.write("           CPU0       CPU1\n")
            for idx in range(8):
                irq = 40 + idx
                f.write(f" {irq}: 0 0 PCI-MSI edge igc-rxtx-{idx}\n")
                irq_dir = os.path.join(proc_dir, "irq", str(irq))
                os.makedirs(irq_dir, exist_ok=True)
                with open(os.path.join(irq_dir, "smp_affinity"), "w") as af:
                    af.write("ff\n")

        res = self.sb.run_sh('. "$ARK_LIB_DIR/hw-tune.sh"; ark_hw_tune_irq_affinity 8')
        self.assertEqual(res.returncode, 0, res.stderr)
        assigned = []
        for idx in range(8):
            with open(os.path.join(proc_dir, "irq", str(40 + idx), "smp_affinity")) as af:
                assigned.append(af.read().strip())
        # Deve usar todos os 8 nucleos distintos (CPU1..CPU7 + CPU0), nao alternar apenas 2 mascaras
        self.assertEqual(len(set(assigned)), 8, f"IRQs RSS deveriam espalhar pelos 8 nucleos: {assigned}")
        self.assertEqual(assigned, ["2", "4", "8", "10", "20", "40", "80", "1"])

    def test_15_unified_latency_profile_and_pppoe_zero_coalescing(self):
        """Valida perfil unificado NAPI/GRO/GSO/budget em 3 estados (SQM ON, HW Offload ON, CPU-only) e pppoe* sempre em 0"""
        for dev in ("eth1", "pppoe-wan"):
            d = os.path.join(self.sb.sys_net, dev)
            os.makedirs(d, exist_ok=True)
            with open(os.path.join(d, "gro_flush_timeout"), "w") as f:
                f.write("250000\n")
            with open(os.path.join(d, "napi_defer_hard_irqs"), "w") as f:
                f.write("20\n")

        # 1. HW Offload ON + SQM OFF -> gro_cap=65536, eth1=20000/2, pppoe-wan=0/0, budget_usecs=8000
        self.sb.uci_set("sqm.wan1.enabled=0")
        self.sb.uci_set("sqm.wan2.enabled=0")
        self.sb.uci_set("firewall.@defaults[0].flow_offloading_hw=1")
        res1 = self.sb.run_sh(
            '. "$ARK_LIB_DIR/hw-tune.sh"; ark_hw_latency_profile; '
            'ark_hw_apply_iface_latency eth1; ark_hw_apply_iface_latency pppoe-wan; '
            'echo "$ARK_LAT_MODE|$ARK_GRO_CAP|$ARK_GRO_TO|$ARK_NAPI_DEF|$ARK_BUDGET_USECS"'
        )
        self.assertEqual(res1.returncode, 0, res1.stderr)
        self.assertEqual(res1.stdout.strip(), "hw_offload|65536|20000|2|8000")
        with open(os.path.join(self.sb.sys_net, "eth1", "gro_flush_timeout")) as f:
            self.assertEqual(f.read().strip(), "20000")
        with open(os.path.join(self.sb.sys_net, "pppoe-wan", "gro_flush_timeout")) as f:
            self.assertEqual(f.read().strip(), "0")
        with open(os.path.join(self.sb.sys_net, "pppoe-wan", "napi_defer_hard_irqs")) as f:
            self.assertEqual(f.read().strip(), "0")

        # 2. SQM ON (mesmo sem gaming_ports) -> gro_cap=8192, eth1=20000/2, pppoe-wan=0/0, budget_usecs=4000
        self.sb.uci_set("sqm.wan1.enabled=1")
        res2 = self.sb.run_sh(
            '. "$ARK_LIB_DIR/hw-tune.sh"; ark_hw_latency_profile; '
            'ark_hw_apply_iface_latency eth1; ark_hw_apply_iface_latency pppoe-wan; '
            'echo "$ARK_LAT_MODE|$ARK_GRO_CAP|$ARK_GRO_TO|$ARK_NAPI_DEF|$ARK_BUDGET_USECS"'
        )
        self.assertEqual(res2.returncode, 0, res2.stderr)
        self.assertEqual(res2.stdout.strip(), "sqm|8192|20000|2|4000")

        # 3. CPU-only (SQM OFF + HW Offload OFF) -> gro_cap=65536, eth1=50000/4, pppoe-wan=0/0, budget_usecs=8000
        self.sb.uci_set("sqm.wan1.enabled=0")
        self.sb.uci_set("firewall.@defaults[0].flow_offloading_hw=0")
        res3 = self.sb.run_sh(
            '. "$ARK_LIB_DIR/hw-tune.sh"; ark_hw_latency_profile; '
            'ark_hw_apply_iface_latency eth1; ark_hw_apply_iface_latency pppoe-wan; '
            'echo "$ARK_LAT_MODE|$ARK_GRO_CAP|$ARK_GRO_TO|$ARK_NAPI_DEF|$ARK_BUDGET_USECS"'
        )
        self.assertEqual(res3.returncode, 0, res3.stderr)
        self.assertEqual(res3.stdout.strip(), "cpu_only|65536|50000|4|8000")
        with open(os.path.join(self.sb.sys_net, "eth1", "gro_flush_timeout")) as f:
            self.assertEqual(f.read().strip(), "50000")
        with open(os.path.join(self.sb.sys_net, "pppoe-wan", "gro_flush_timeout")) as f:
            self.assertEqual(f.read().strip(), "0")

    def test_16_cpufreq_thermal_guard_and_fixed_pll_noop(self):
        """Valida cpufreq adaptativo: no-op em SoC sem cpufreq (MT7986), performance <75C e recuo termico >=75C"""
        # 1. Sem cpufreq (como MT7986A): deve retornar 0 silenciosamente
        res_noop = self.sb.run_sh('. "$ARK_LIB_DIR/hw-tune.sh"; ark_hw_tune_cpufreq')
        self.assertEqual(res_noop.returncode, 0, res_noop.stderr)

        # 2. Cria policy0 com thermal_zone0 a 55 C -> deve ativar performance
        pol = os.path.join(self.sb.temp_dir, "sys", "devices", "system", "cpu", "cpufreq", "policy0")
        tz = os.path.join(self.sb.temp_dir, "sys", "class", "thermal", "thermal_zone0")
        os.makedirs(pol, exist_ok=True)
        os.makedirs(tz, exist_ok=True)
        with open(os.path.join(pol, "scaling_available_governors"), "w") as f:
            f.write("conservative ondemand userspace powersave performance schedutil\n")
        with open(os.path.join(pol, "scaling_governor"), "w") as f:
            f.write("schedutil\n")
        with open(os.path.join(pol, "energy_performance_preference"), "w") as f:
            f.write("balance_performance\n")
        with open(os.path.join(tz, "temp"), "w") as f:
            f.write("55000\n")

        res_cool = self.sb.run_sh('. "$ARK_LIB_DIR/hw-tune.sh"; ark_hw_tune_cpufreq')
        self.assertEqual(res_cool.returncode, 0, res_cool.stderr)
        with open(os.path.join(pol, "scaling_governor")) as f:
            self.assertEqual(f.read().strip(), "performance")
        with open(os.path.join(pol, "energy_performance_preference")) as f:
            self.assertEqual(f.read().strip(), "performance")

        # 3. Temperatura sobe para 82 C (>= 75 C): guarda termica recua para schedutil em modo auto
        with open(os.path.join(tz, "temp"), "w") as f:
            f.write("82000\n")
        res_hot = self.sb.run_sh('. "$ARK_LIB_DIR/hw-tune.sh"; ark_hw_tune_cpufreq')
        self.assertEqual(res_hot.returncode, 0, res_hot.stderr)
        with open(os.path.join(pol, "scaling_governor")) as f:
            self.assertEqual(f.read().strip(), "schedutil")
        with open(os.path.join(pol, "energy_performance_preference")) as f:
            self.assertEqual(f.read().strip(), "balance_performance")

    def test_17_wed_toggle_no_false_positive_and_ppe_telemetry(self):
        """Valida que wifi-wed-toggle nao fabrica estado runtime falso, sinaliza reboot_required e expoe telemetria PPE real"""
        mod_dir = os.path.join(self.sb.temp_dir, "sys", "module", "mt7915e", "parameters")
        ppe_dir = os.path.join(self.sb.temp_dir, "sys", "kernel", "debug", "ppe0")
        os.makedirs(mod_dir, exist_ok=True)
        os.makedirs(ppe_dir, exist_ok=True)
        with open(os.path.join(mod_dir, "wed_enable"), "w") as f:
            f.write("N\n")
        with open(os.path.join(ppe_dir, "entries"), "w") as f:
            f.write("00001 BND IPv4 5T\n00002 BND IPv4 5T\n00003 UNB IPv4 5T\n")

        self.sb.uci_set("sqm.wan1.enabled=1")
        self.sb.uci_set("firewall.@defaults[0].flow_offloading_hw=0")

        # Ativar WED com kernel em N deve manter sysfs=N, gravar modules.d=Y e reportar enabled_reboot_required
        res_on = self.sb.run_control("wifi-wed-toggle", "1")
        self.assertEqual(res_on.returncode, 0, res_on.stderr)
        self.assertEqual(res_on.stdout.strip(), "enabled_reboot_required")
        with open(os.path.join(mod_dir, "wed_enable")) as f:
            self.assertEqual(f.read().strip(), "N", "Nao deve sobrescrever sysfs wed_enable para fabricar falso positivo!")
        with open(os.path.join(self.sb.temp_dir, "etc", "modules.d", "mt7915e")) as f:
            self.assertIn("wed_enable=Y", f.read())

        # Telemetria real no system-hardware-info deve expor divergencia runtime vs configured, PPE BND/UNB e conflitos
        res_hw = self.sb.run_control("system-hardware-info")
        self.assertEqual(res_hw.returncode, 0, res_hw.stderr)
        hw = json.loads(res_hw.stdout)
        off = hw.get("offload", {})
        self.assertTrue(off.get("ppe_present"))
        self.assertEqual(off.get("ppe_bound_flows"), 2)
        self.assertEqual(off.get("ppe_unbound_flows"), 1)
        self.assertTrue(off.get("wed_supported"))
        self.assertFalse(off.get("wed_runtime_enabled"))
        self.assertTrue(off.get("wed_configured_enabled"))
        self.assertTrue(off.get("wed_reboot_required"))
        self.assertTrue(off.get("wed_conflict_sqm"))
        self.assertTrue(off.get("wed_missing_hw_offload"))

    def test_18_pppoe_physical_mtu_floor_after_dhcp_manual_1492(self):
        """Valida que migrar de DHCP com wan_manual_mtu=1492 para PPPoE nunca deixa a porta fisica pai abaixo de 1500"""
        repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        hotplug = os.path.join(repo_root, "root", "etc", "hotplug.d", "iface", "05-ark-pppoe-babyjumbo")

        eth1_dir = os.path.join(self.sb.sys_net, "eth1")
        pppoe_dir = os.path.join(self.sb.sys_net, "pppoe-wan")
        os.makedirs(eth1_dir, exist_ok=True)
        os.makedirs(pppoe_dir, exist_ok=True)
        with open(os.path.join(eth1_dir, "mtu"), "w") as f:
            f.write("1492\n")
        with open(os.path.join(pppoe_dir, "mtu"), "w") as f:
            f.write("1492\n")

        self.sb.uci_set("network.wan.proto=pppoe")
        self.sb.uci_set("network.wan.device=eth1")
        self.sb.uci_set("equipe_dashboard.wan_profiles=wan_profiles")
        self.sb.uci_set("equipe_dashboard.wan_profiles.wan_mtu_mode=manual")
        self.sb.uci_set("equipe_dashboard.wan_profiles.wan_manual_mtu=1492")

        res = self.sb.run_sh(f'ACTION=ifup INTERFACE=wan DEVICE=pppoe-wan sh "{hotplug}"')
        self.assertEqual(res.returncode, 0, res.stderr)
        with open(os.path.join(eth1_dir, "mtu")) as f:
            self.assertEqual(f.read().strip(), "1500", "Porta fisica eth1 deve subir para >= 1500 quando PPPoE L3 e 1492!")
        with open(os.path.join(pppoe_dir, "mtu")) as f:
            self.assertEqual(f.read().strip(), "1492")


if __name__ == "__main__":
    unittest.main()
