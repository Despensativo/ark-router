#!/usr/bin/env python3
"""
ARK Router Automated Test Suite - Intelligent Post-Upgrade Safeguards
Validates self-healing of package upgrade side effects (apk upgrade / opkg upgrade):
1. Saved feature policy drift enforcement (idempotent, zero flash writes when clean).
2. Orphan Lua controller cleanup on pure ucode systems.
3. AdGuardHome Circuit Breaker restoration.
4. Selective ARK-managed .apk-new / -opkg residue cleanup without touching user files.
5. Preservation of active services and user configurations.
"""
import json
import os
import unittest
from test_harness import RouterSandbox

class TestPostUpgradeSafeguards(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()
        self.root = self.sb.temp_dir

    def tearDown(self):
        self.sb.cleanup()

    def test_01_baseline_clean_system_reports_ok(self):
        """Verifica se em um sistema saudável o Ark Doctor reporta OK para higiene pós-upgrade"""
        res = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res.returncode, 0, f"Falha ao executar ark-doctor: {res.stderr}")
        data = json.loads(res.stdout)
        check = next((c for c in data["checks"] if "Higiene Pós-Upgrade" in c["name"]), None)
        self.assertIsNotNone(check, "Check 'Higiene Pós-Upgrade e Pacotes' ausente no ark-doctor")
        self.assertEqual(check["status"], "OK")

        # feature-enforce-policies deve rodar sem erros
        res_enf = self.sb.run_control("feature-enforce-policies")
        self.assertEqual(res_enf.returncode, 0)
        self.assertIn("ok", res_enf.stdout)

        # post-upgrade-hygiene deve rodar sem erros
        res_hyg = self.sb.run_control("post-upgrade-hygiene")
        self.assertEqual(res_hyg.returncode, 0)
        self.assertIn("ok", res_hyg.stdout)

    def test_02_saved_feature_policy_drift_detection_and_healing(self):
        """Verifica detecção e autocura quando atualização de pacote reativa serviço desativado pelo usuário"""
        # Configura mwan3 e nlbwmon como explicitamente desativados pelo usuário
        self.sb.uci_set("equipe_dashboard.mwan3=feature")
        self.sb.uci_set("equipe_dashboard.mwan3.user_disabled=1")
        self.sb.uci_set("equipe_dashboard.mwan3.enabled=0")
        self.sb.uci_set("equipe_dashboard.nlbwmon=feature")
        self.sb.uci_set("equipe_dashboard.nlbwmon.user_disabled=1")
        self.sb.uci_set("equipe_dashboard.nlbwmon.enabled=0")

        # Simula efeito colateral de 'apk upgrade': cria symlink em /etc/rc.d reativando o serviço
        rc_dir = os.path.join(self.root, "etc", "rc.d")
        os.makedirs(rc_dir, exist_ok=True)
        mwan3_rc = os.path.join(rc_dir, "S99mwan3")
        with open(mwan3_rc, "w") as f:
            f.write("#!/bin/sh\nexit 0\n")

        # 1. Auditoria sem fix deve reportar WARN mencionando o serviço reativado
        res_audit = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res_audit.returncode, 0)
        data_audit = json.loads(res_audit.stdout)
        check_audit = next(c for c in data_audit["checks"] if "Higiene Pós-Upgrade" in c["name"])
        self.assertEqual(check_audit["status"], "WARN")
        self.assertIn("mwan3", check_audit["message"])

        # 2. Executa auto-reparo com doctor-fix
        res_fix = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res_fix.returncode, 0)
        data_fix = json.loads(res_fix.stdout)
        check_fix = next(c for c in data_fix["checks"] if "Higiene Pós-Upgrade" in c["name"])
        self.assertEqual(check_fix["status"], "FIXED")

        # 3. Segunda rodada deve estar 100% limpa (idempotência)
        res_clean = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res_clean.returncode, 0)
        data_clean = json.loads(res_clean.stdout)
        check_clean = next(c for c in data_clean["checks"] if "Higiene Pós-Upgrade" in c["name"])
        self.assertEqual(check_clean["status"], "OK")

    def test_03_orphan_lua_controller_cleanup_on_pure_ucode(self):
        """Valida que controller Lua órfão em sistema sem runtime Lua é detectado e removido"""
        # Garante que /usr/bin/lua NÃO existe no sandbox
        lua_bin = os.path.join(self.root, "usr", "bin", "lua")
        if os.path.exists(lua_bin):
            os.remove(lua_bin)

        # Simula criação de controller Lua órfão por upgrade de pacote luci-app-mwan3
        controller_dir = os.path.join(self.root, "usr", "lib", "lua", "luci", "controller")
        os.makedirs(controller_dir, exist_ok=True)
        mwan3_lua = os.path.join(controller_dir, "mwan3.lua")
        with open(mwan3_lua, "w") as f:
            f.write("module('luci.controller.mwan3', package.seeall)\n")

        # Simula cache de módulo LuCI
        tmp_dir = os.path.join(self.root, "tmp")
        os.makedirs(tmp_dir, exist_ok=True)
        idx_cache = os.path.join(tmp_dir, "luci-indexcache")
        with open(idx_cache, "w") as f:
            f.write("stale_cache\n")

        # 1. Auditoria deve emitir WARN
        res_audit = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res_audit.returncode, 0)
        data_audit = json.loads(res_audit.stdout)
        check_audit = next(c for c in data_audit["checks"] if "Higiene Pós-Upgrade" in c["name"])
        self.assertEqual(check_audit["status"], "WARN")
        self.assertIn("mwan3.lua", check_audit["message"])

        # 2. Execução com --fix deve remover o controller e invalidar caches
        res_fix = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res_fix.returncode, 0)
        data_fix = json.loads(res_fix.stdout)
        check_fix = next(c for c in data_fix["checks"] if "Higiene Pós-Upgrade" in c["name"])
        self.assertEqual(check_fix["status"], "FIXED")

        # Verifica se o arquivo mwan3.lua e o indexcache foram eliminados
        self.assertFalse(os.path.exists(mwan3_lua), "mwan3.lua órfão deveria ter sido removido")
        self.assertFalse(os.path.exists(idx_cache), "luci-indexcache deveria ter sido invalidado")

    def test_04_adguardhome_circuit_breaker_restoration(self):
        """Valida que /etc/init.d/adguardhome sobrescrito por pacote recupera o Circuit Breaker do ARK"""
        init_dir = os.path.join(self.root, "etc", "init.d")
        os.makedirs(init_dir, exist_ok=True)
        adg_init = os.path.join(init_dir, "adguardhome")
        with open(adg_init, "w") as f:
            f.write("""#!/bin/sh /etc/rc.common
USE_PROCD=1
START=90

start_service() {
	procd_open_instance
	procd_set_param command /usr/bin/AdGuardHome
	procd_close_instance
}

boot() {
	start
}
""")
        os.chmod(adg_init, 0o755)

        # 1. Auditoria deve acusar WARN para ausência de Circuit Breaker
        res_audit = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res_audit.returncode, 0)
        data_audit = json.loads(res_audit.stdout)
        check_audit = next(c for c in data_audit["checks"] if "Higiene Pós-Upgrade" in c["name"])
        self.assertEqual(check_audit["status"], "WARN")
        self.assertIn("Circuit Breaker", check_audit["message"])

        # 2. Executa fix
        res_fix = self.sb.run_control("ark-doctor", "--fix", "--json")
        self.assertEqual(res_fix.returncode, 0)
        data_fix = json.loads(res_fix.stdout)
        check_fix = next(c for c in data_fix["checks"] if "Higiene Pós-Upgrade" in c["name"])
        self.assertEqual(check_fix["status"], "FIXED")

        # 3. Verifica se o script agora contém o Circuit Breaker
        with open(adg_init, "r") as f:
            content = f.read()
        self.assertIn("ARK Router Circuit Breaker", content)
        self.assertIn("equipe_perf.settings.adblock_enabled", content)

    def test_05_selective_apk_new_and_opkg_residue_cleanup(self):
        """Valida que resíduos .apk-new de configs ARK são saneados, mas configs de terceiros/usuário são preservadas"""
        etc_cfg = self.sb.etc_config
        init_dir = os.path.join(self.root, "etc", "init.d")
        os.makedirs(init_dir, exist_ok=True)

        # Garante configs ativas do ARK
        luci_cfg = os.path.join(etc_cfg, "luci")
        with open(luci_cfg, "w") as f:
            f.write("config core 'main'\n\toption mediaurlbase '/luci-static/ark'\nconfig themes 'themes'\n\toption ARK '/luci-static/ark'\n")

        uhttpd_cfg = os.path.join(etc_cfg, "uhttpd")
        with open(uhttpd_cfg, "w") as f:
            f.write("config uhttpd 'main'\n\tlist listen_http '0.0.0.0:80'\n")

        # Cria arquivos residuais do gerenciador de pacotes para configs ARK
        luci_res = os.path.join(etc_cfg, "luci.apk-new")
        with open(luci_res, "w") as f:
            f.write("# upstream default luci\n")

        uhttpd_res = os.path.join(etc_cfg, "uhttpd.apk-new")
        with open(uhttpd_res, "w") as f:
            f.write("# upstream default uhttpd\n")

        # CRÍTICO: Cria arquivo residual de configuração de TERCEIROS / USUÁRIO
        custom_res = os.path.join(etc_cfg, "custom_service.apk-new")
        with open(custom_res, "w") as f:
            f.write("# custom user package\n")

        network_res = os.path.join(etc_cfg, "network.apk-new")
        with open(network_res, "w") as f:
            f.write("# upstream network\n")

        # 1. Auditoria deve reportar WARN listando o resíduo detectado
        res_audit = self.sb.run_control("ark-doctor", "--json")
        self.assertEqual(res_audit.returncode, 0)
        data_audit = json.loads(res_audit.stdout)
        check_audit = next(c for c in data_audit["checks"] if "Higiene Pós-Upgrade" in c["name"])
        self.assertEqual(check_audit["status"], "WARN")
        self.assertIn("luci.apk-new", check_audit["message"])

        # 2. Executa fix
        res_fix = self.sb.run_control("post-upgrade-hygiene")
        self.assertEqual(res_fix.returncode, 0)

        # 3. Resíduos ARK devem ter sido excluídos
        self.assertFalse(os.path.exists(luci_res), "luci.apk-new deveria ter sido removido")
        self.assertFalse(os.path.exists(uhttpd_res), "uhttpd.apk-new deveria ter sido removido")

        # 4. Resíduos de terceiros/usuário DEVEM ter sido estritamente PRESERVADOS!
        self.assertTrue(os.path.exists(custom_res), "custom_service.apk-new NÃO pode ser apagado!")
        self.assertTrue(os.path.exists(network_res), "network.apk-new NÃO pode ser apagado!")

    def test_06_active_services_are_not_disabled(self):
        """Garante que serviços legitimamente ativados pelo usuário NUNCA são desativados pela higiene"""
        # Usuário configurou SQM como ativo (user_disabled=0)
        self.sb.uci_set("equipe_dashboard.sqm=feature")
        self.sb.uci_set("equipe_dashboard.sqm.user_disabled=0")
        self.sb.uci_set("equipe_dashboard.sqm.enabled=1")

        # Executa higiene pós-upgrade
        res = self.sb.run_control("post-upgrade-hygiene")
        self.assertEqual(res.returncode, 0)

        # SQM deve permanecer intacto
        self.assertEqual(self.sb.uci_get("equipe_dashboard.sqm.user_disabled"), "0")
        self.assertEqual(self.sb.uci_get("equipe_dashboard.sqm.enabled"), "1")

if __name__ == "__main__":
    unittest.main()
