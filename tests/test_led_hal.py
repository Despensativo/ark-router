#!/usr/bin/env python3
"""
ARK Router Automated Test Suite - Smart LED HAL & Port Monitor
Validates topology detection, silicon curve calibration, universal effect engine,
UCI preset governance, and ark-port-ledd NIC emulation without bus flooding.
"""
import unittest
import json
import os
import shutil
import subprocess
from test_harness import RouterSandbox, REPO_DIR

class TestLedHal(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()
        self.led_sys = os.path.join(self.sb.temp_dir, "sys", "class", "leds")
        os.makedirs(self.led_sys, exist_ok=True)

    def tearDown(self):
        self.sb.cleanup()

    def _get_sh_bin(self):
        for candidate in [r"C:\Program Files\Git\bin\sh.exe", r"C:\Program Files\Git\bin\bash.exe", "sh", "bash"]:
            if os.path.isabs(candidate) and os.path.isfile(candidate):
                return candidate
            elif shutil.which(candidate):
                return candidate
        return "sh"

    def test_01_topology_detection_matrix(self):
        """Verifica detecção da topologia I2C Matrix (AW21018)"""
        aw_dir = os.path.join(self.led_sys, "aw21018_led")
        os.makedirs(aw_dir, exist_ok=True)
        with open(os.path.join(aw_dir, "led"), "w") as f:
            f.write("")

        res = self.sb.run_control("led-detect-topology")
        self.assertEqual(res.returncode, 0, f"Falha ao executar led-detect-topology: {res.stderr}")
        self.assertEqual(res.stdout.strip(), "TOPOLOGY_I2C_MATRIX")

        # Verifica também get-led-hardware-info incluindo a topologia
        res_info = self.sb.run_control("get-led-hardware-info")
        self.assertEqual(res_info.returncode, 0)
        data = json.loads(res_info.stdout)
        self.assertEqual(data.get("topology"), "TOPOLOGY_I2C_MATRIX")
        self.assertTrue(data.get("has_rgb"))
        self.assertEqual(data.get("rgb_multi_node"), "aw21018_led")

    def test_02_topology_detection_direct_phy(self):
        """Verifica detecção da topologia Direct PHY (sem portas RJ45 no sysfs)"""
        # LED frontal multicolor sem LEDs de portas (estilo Acer Predator W6x)
        w6_dir = os.path.join(self.led_sys, "rgb_status")
        os.makedirs(w6_dir, exist_ok=True)
        with open(os.path.join(w6_dir, "multi_intensity"), "w") as f:
            f.write("0 255 0\n")

        res = self.sb.run_control("led-detect-topology")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(res.stdout.strip(), "TOPOLOGY_DIRECT_PHY")

    def test_03_topology_detection_gpio(self):
        """Verifica detecção da topologia GPIO (LEDs de portas expostos no sysfs)"""
        # Cria nós de portas LAN
        for p in ["lan1", "lan2", "wan_led"]:
            p_dir = os.path.join(self.led_sys, p)
            os.makedirs(p_dir, exist_ok=True)

        res = self.sb.run_control("led-detect-topology")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(res.stdout.strip(), "TOPOLOGY_GPIO")

    def test_04_curve_calibration_and_collision_prevention(self):
        """Verifica calibração senoidal (50 50), blink (100 100) e desligamento de trigger broadcast"""
        aw_dir = os.path.join(self.led_sys, "aw21018_led")
        os.makedirs(aw_dir, exist_ok=True)
        trigger_file = os.path.join(aw_dir, "trigger")
        breath_file = os.path.join(aw_dir, "breath_time")
        blink_file = os.path.join(aw_dir, "blink_time")

        with open(trigger_file, "w") as f:
            f.write("netdev")
        with open(breath_file, "w") as f:
            f.write("0 0")
        with open(blink_file, "w") as f:
            f.write("0 0")

        res = self.sb.run_control("led-calibrate-curves")
        self.assertEqual(res.returncode, 0, f"Falha na calibração: {res.stderr}")

        with open(trigger_file, "r") as f:
            self.assertEqual(f.read().strip(), "none", "Trigger global não foi desativado (risco de colisão)!")
        with open(breath_file, "r") as f:
            self.assertEqual(f.read().strip(), "50 50", "Curva de respiração senoidal por hardware incorreta!")
        with open(blink_file, "r") as f:
            self.assertEqual(f.read().strip(), "100 100", "Timer de blink por hardware incorreto!")

    def test_05_set_effect_matrix_translation(self):
        """Verifica tradução correta de efeitos em modos do silício (Modo 1=solid, 2=blink, 3=breathe)"""
        aw_dir = os.path.join(self.led_sys, "aw21018_led")
        os.makedirs(aw_dir, exist_ok=True)
        led_writes_file = os.path.join(aw_dir, "led")

        # 1. Top respirando (modo 3 - hardware silicon breathing)
        with open(led_writes_file, "w") as f: f.write("")
        res = self.sb.run_control("set-led-effect", "top", "00ff00", "breathe")
        self.assertEqual(res.returncode, 0)
        with open(led_writes_file, "r") as f:
            content = f.read()
            self.assertIn("0 00ff00 3", content, "Top não configurado no Modo 3 (Hardware breathing)!")

        # 2. Front fixo (modo 1 - solid ON)
        with open(led_writes_file, "w") as f: f.write("")
        res = self.sb.run_control("set-led-effect", "front", "00e5ff", "solid")
        self.assertEqual(res.returncode, 0)
        with open(led_writes_file, "r") as f:
            content = f.read()
            self.assertIn("1 00e5ff 1", content, "Front não configurado no Modo 1 (Solid ON)!")

        # 3. All desligado (off)
        with open(led_writes_file, "w") as f: f.write("")
        res = self.sb.run_control("set-led-effect", "all", "000000", "off")
        self.assertEqual(res.returncode, 0)
        with open(led_writes_file, "r") as f:
            content = f.read()
            self.assertIn("1 0 1", content, "Front não desligado no modo all off!")
            self.assertIn("0 0 1", content, "Top não desligado no modo all off!")
            self.assertIn("7 0 1", content, "Portas não desligadas no modo all off!")

    def test_06_presets_governance(self):
        """Valida preset smart, night, alert e custom via governança UCI"""
        aw_dir = os.path.join(self.led_sys, "aw21018_led")
        os.makedirs(aw_dir, exist_ok=True)
        with open(os.path.join(aw_dir, "led"), "w") as f:
            f.write("")

        # Preset Smart
        res = self.sb.run_control("set-led-preset", "smart")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("system.led_status.enabled"), "1")
        self.assertEqual(self.sb.uci_get("system.led_status.preset"), "smart")
        self.assertEqual(self.sb.uci_get("system.led_status.hex_color"), "#00FF00")

        # Preset Night (Modo Noturno)
        res = self.sb.run_control("set-led-preset", "night")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("system.led_status.enabled"), "0")
        self.assertEqual(self.sb.uci_get("system.led_status.preset"), "night")

        # Preset Alert (Alerta Vermelho)
        res = self.sb.run_control("set-led-preset", "alert")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("system.led_status.preset"), "alert")
        self.assertEqual(self.sb.uci_get("system.led_status.hex_color"), "#FF0000")

        # Custom RGB - Breathing
        res = self.sb.run_control("set-led-rgb-color", "#8B5CF6", "breathe")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("system.led_status.hex_color"), "#8B5CF6")
        self.assertEqual(self.sb.uci_get("system.led_status.effect"), "breathe")
        with open(os.path.join(aw_dir, "led"), "r") as f:
            content = f.read()
            self.assertIn("0 8b5cf6 3", content)

        # Custom RGB - Estático / Fixo (Solid)
        with open(os.path.join(aw_dir, "led"), "w") as f: f.write("")
        res = self.sb.run_control("set-led-rgb-color", "#00E5FF", "solid")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("system.led_status.hex_color"), "#00E5FF")
        self.assertEqual(self.sb.uci_get("system.led_status.effect"), "solid")
        with open(os.path.join(aw_dir, "led"), "r") as f:
            content = f.read()
            self.assertIn("0 00e5ff 1", content, "LED não foi configurado em Modo 1 (Estático / Solid)!")

    def test_07_port_daemon_nic_emulation(self):
        """Testa o daemon ark-port-ledd monitorando link e aplicando emulação de NIC"""
        aw_dir = os.path.join(self.led_sys, "aw21018_led")
        os.makedirs(aw_dir, exist_ok=True)
        led_file = os.path.join(aw_dir, "led")
        with open(led_file, "w") as f:
            f.write("")

        # Simula WAN link UP via sysfs
        wan_net = os.path.join(self.sb.temp_dir, "sys", "class", "net", "wan")
        os.makedirs(wan_net, exist_ok=True)
        carrier_file = os.path.join(wan_net, "carrier")
        with open(carrier_file, "w") as f:
            f.write("1\n")

        # Executa uma iteração do daemon ark-port-ledd
        env = os.environ.copy()
        env["ARK_ROOT"] = self.sb.temp_dir
        env["ARK_TEST_SINGLE_PASS"] = "1"
        env["UCI_CONFIG_DIR"] = self.sb.etc_config
        env["PATH"] = f"{self.sb.bin_dir};{env.get('PATH', '')}"

        daemon_bin = os.path.join(REPO_DIR, "root", "usr", "sbin", "ark-port-ledd").replace("\\", "/")
        sh_bin = self._get_sh_bin()
        p = subprocess.run([sh_bin, daemon_bin], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(p.returncode, 0, f"ark-port-ledd falhou: {p.stderr}")

        with open(led_file, "r") as f:
            content = f.read()
            # Link UP: Target 6 deve ser '6 ff 1' (Solid ON) e Target 7 deve ser '7 ff 2' (Kernel activity blink)
            self.assertIn("6 ff 1", content, "Target 6 (WAN Link) não acendeu com link UP!")
            self.assertIn("7 ff 2", content, "Target 7 (WAN Activity) não ativou modo blink com link UP!")

        # Simula WAN link DOWN
        with open(carrier_file, "w") as f:
            f.write("0\n")

        with open(led_file, "w") as f:
            f.write("")

        p = subprocess.run([sh_bin, daemon_bin], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(p.returncode, 0)

        with open(led_file, "r") as f:
            content = f.read()
            # Link DOWN: Portas devem ser apagadas 100% ('6 0 1' e '7 0 1')
            self.assertIn("6 0 1", content, "Target 6 não apagou com link DOWN!")
            self.assertIn("7 0 1", content, "Target 7 não apagou com link DOWN!")

    def test_08_speed_calibration_and_governance(self):
        """Verifica ajuste dinâmico de velocidades (slow, normal, fast) e persistência UCI"""
        aw_dir = os.path.join(self.led_sys, "aw21018_led")
        os.makedirs(aw_dir, exist_ok=True)
        breath_file = os.path.join(aw_dir, "breath_time")
        blink_file = os.path.join(aw_dir, "blink_time")

        # 1. Velocidade Lenta (slow / zen)
        res = self.sb.run_control("set-led-speed", "slow")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("system.led_status.speed"), "slow")
        with open(breath_file, "r") as f:
            self.assertEqual(f.read().strip(), "80 80", "Curva de respiração para velocidade slow incorreta!")
        with open(blink_file, "r") as f:
            self.assertEqual(f.read().strip(), "200 200", "Timer de blink para velocidade slow incorreto!")

        # 2. Velocidade Rápida (fast / dinâmica)
        res = self.sb.run_control("set-led-speed", "fast")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("system.led_status.speed"), "fast")
        with open(breath_file, "r") as f:
            self.assertEqual(f.read().strip(), "20 20", "Curva de respiração para velocidade fast incorreta!")
        with open(blink_file, "r") as f:
            self.assertEqual(f.read().strip(), "50 50", "Timer de blink para velocidade fast incorreto!")

        # 3. Velocidade Normal
        res = self.sb.run_control("set-led-speed", "normal")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("system.led_status.speed"), "normal")
        with open(breath_file, "r") as f:
            self.assertEqual(f.read().strip(), "50 50", "Curva de respiração para velocidade normal incorreta!")
        with open(blink_file, "r") as f:
            self.assertEqual(f.read().strip(), "100 100", "Timer de blink para velocidade normal incorreto!")

        # 4. Verifica get-led-hardware-info reportando current_speed
        res_info = self.sb.run_control("get-led-hardware-info")
        self.assertEqual(res_info.returncode, 0)
        data = json.loads(res_info.stdout)
        self.assertEqual(data.get("current_speed"), "normal")

    def test_09_rainbow_effect_and_daemon(self):
        """Verifica acionamento do efeito Arco-Íris Fluido (Rainbow) e micro-daemon ark-rainbowd"""
        aw_dir = os.path.join(self.led_sys, "aw21018_led")
        os.makedirs(aw_dir, exist_ok=True)
        led_file = os.path.join(aw_dir, "led")
        with open(led_file, "w") as f:
            f.write("")

        # 1. Ativa efeito rainbow via set-led-rgb-color
        res = self.sb.run_control("set-led-rgb-color", "#00FF00", "rainbow", "fast")
        self.assertEqual(res.returncode, 0)
        self.assertEqual(self.sb.uci_get("system.led_status.effect"), "rainbow")
        self.assertEqual(self.sb.uci_get("system.led_status.speed"), "fast")

        # 2. Executa um ciclo do daemon ark-rainbowd via sandbox
        env = os.environ.copy()
        env["ARK_ROOT"] = self.sb.temp_dir
        env["ARK_TEST_SINGLE_PASS"] = "1"
        env["UCI_CONFIG_DIR"] = self.sb.etc_config
        env["PATH"] = f"{self.sb.bin_dir};{env.get('PATH', '')}"

        daemon_bin = os.path.join(REPO_DIR, "root", "usr", "sbin", "ark-rainbowd").replace("\\", "/")
        sh_bin = self._get_sh_bin()
        p = subprocess.run([sh_bin, daemon_bin], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(p.returncode, 0, f"ark-rainbowd falhou: {p.stderr}")

        # 3. Verifica se o daemon escreveu cores do espectro RGB (Modo 1: solid)
        with open(led_file, "r") as f:
            content = f.read()
            self.assertIn("ff0000 1", content, "Vermelho do espectro rainbow não foi emitido!")
            self.assertIn("00ff00 1", content, "Verde do espectro rainbow não foi emitido!")
            self.assertIn("0000ff 1", content, "Azul do espectro rainbow não foi emitido!")

    def test_10_w6x_single_rgb_status_multi_index(self):
        """Verifica compatibilidade com 1 LED RGB (Acer W6x rgb:status / multi_intensity) e ordem multi_index"""
        # Remove nó matricial para forçar topologia DIRECT_PHY / W6x
        aw_dir = os.path.join(self.led_sys, "aw21018_led")
        if os.path.exists(aw_dir):
            shutil.rmtree(aw_dir)

        # No Windows NTFS dois-pontos (:) é reservado para Alternate Data Streams; em Linux é caractere comum
        node_name = "rgb_status" if os.name == "nt" else "rgb:status"
        rgb_dir = os.path.join(self.led_sys, node_name)
        os.makedirs(rgb_dir, exist_ok=True)
        with open(os.path.join(rgb_dir, "multi_index"), "w") as f:
            f.write("red green blue\n")
        with open(os.path.join(rgb_dir, "multi_intensity"), "w") as f:
            f.write("0 0 0\n")
        with open(os.path.join(rgb_dir, "trigger"), "w") as f:
            f.write("none\n")
        with open(os.path.join(rgb_dir, "brightness"), "w") as f:
            f.write("0\n")

        # 1. Verifica detecção de topologia DIRECT_PHY
        res_top = self.sb.run_control("led-detect-topology")
        self.assertEqual(res_top.returncode, 0)
        self.assertEqual(res_top.stdout.strip(), "TOPOLOGY_DIRECT_PHY")

        # 2. Verifica get-led-hardware-info identificando nó multi_intensity
        res_info = self.sb.run_control("get-led-hardware-info")
        self.assertEqual(res_info.returncode, 0)
        info = json.loads(res_info.stdout)
        self.assertTrue(info.get("has_rgb"))
        self.assertEqual(info.get("rgb_multi_node"), node_name)

        # 3. Aplica cor direta sólida Ciano (#00E5FF -> R=0, G=229, B=255)
        res_set = self.sb.run_control("set-led-effect", "front", "00e5ff", "solid")
        self.assertEqual(res_set.returncode, 0)
        with open(os.path.join(rgb_dir, "multi_intensity"), "r") as f:
            mi = f.read().strip()
            self.assertEqual(mi, "0 229 255", f"Ordem multi_index (RGB) incorreta: {mi}")

        # 4. Executa ciclo único do daemon ark-rainbowd no nó rgb:status
        env = os.environ.copy()
        env["ARK_ROOT"] = self.sb.temp_dir
        env["ARK_TEST_SINGLE_PASS"] = "1"
        env["UCI_CONFIG_DIR"] = self.sb.etc_config
        env["PATH"] = f"{self.sb.bin_dir};{env.get('PATH', '')}"

        daemon_bin = os.path.join(REPO_DIR, "root", "usr", "sbin", "ark-rainbowd").replace("\\", "/")
        sh_bin = self._get_sh_bin()
        p = subprocess.run([sh_bin, daemon_bin], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(p.returncode, 0, f"ark-rainbowd em rgb:status falhou: {p.stderr}")

        with open(os.path.join(rgb_dir, "multi_intensity"), "r") as f:
            mi = f.read().strip()
            # Último passo da tabela é ff000d -> R=255 G=0 B=13
            self.assertEqual(mi, "255 0 13", f"Rainbow no nó rgb:status não escreveu espectro: {mi}")

if __name__ == "__main__":
    unittest.main()
