#!/usr/bin/env python3
"""
ARK Router - Comprehensive Lite vs Full Profile Scenario Test Suite
Tests backend logic and frontend DOM rendering for both Lite and Full scenarios.
"""
import unittest
import json
import os
import sys
import shutil
import subprocess
from test_harness import RouterSandbox

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
BUNDLE_PATH = os.path.join(REPO_DIR, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.js")

def get_node_and_bundle_path():
    node_bin = shutil.which("node") or shutil.which("node.exe") or "/mnt/c/Program Files/nodejs/node.exe"
    if not node_bin or not os.path.exists(str(node_bin)):
        return None, None
    bpath = BUNDLE_PATH
    if (str(node_bin).endswith(".exe") or "/mnt/c/" in str(node_bin)) and shutil.which("wslpath"):
        try:
            p_w = subprocess.run(["wslpath", "-w", bpath], stdout=subprocess.PIPE, text=True)
            if p_w.returncode == 0 and p_w.stdout.strip():
                bpath = p_w.stdout.strip()
        except Exception:
            pass
    return node_bin, bpath.replace("\\", "/")

class TestLiteVsFullScenarios(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_backend_profile_handling(self):
        """Valida que o comando profile reporta o perfil operacional padrao em formato JSON"""
        res = self.sb.run_control("profile")
        self.assertEqual(res.returncode, 0, f"Falha na execucao: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertEqual(data.get("operation_profile"), "standard")

    def test_02_backend_features_dispatch(self):
        """Valida que o comando features responde com catálogo funcional"""
        res = self.sb.run_control("wan-optimize-status", "iface=wan2")
        self.assertEqual(res.returncode, 0, f"Falha na execucao: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertEqual(data.get("iface"), "wan2")

    def test_03_frontend_full_scenario_rendering(self):
        """Testa a inicialização e renderização do frontend no cenário FULL (1GB RAM, ARM64)"""
        node_bin, bundle_path = get_node_and_bundle_path()
        if not node_bin:
            self.skipTest("Node.js não encontrado no ambiente")

        test_script = f"""
        const fs = require('fs');
        let code = fs.readFileSync('{bundle_path}', 'utf8');

        function createEl(tag, attrs, children) {{
            return {{
                tag,
                attrs: attrs || {{}},
                children: Array.isArray(children) ? children : (children != null ? [children] : []),
                appendChild(c) {{ this.children.push(c); return c; }},
                addEventListener() {{}},
                setAttribute(k, v) {{ this.attrs[k] = v; }},
                getAttribute(k) {{ return this.attrs[k]; }},
                classList: {{ add() {{}}, remove() {{}}, toggle() {{}} }},
                style: {{}},
                toString() {{
                    const childStr = this.children.map(c => typeof c === 'object' ? (c ? c.toString() : '') : String(c)).join(' ');
                    return `<${{tag}}>${{childStr}}</${{tag}}>`;
                }}
            }};
        }}

        const localStorageMock = {{
            getItem: () => null,
            setItem: () => {{}}
        }};

        const windowMock = {{
            addEventListener: () => {{}},
            setTimeout: (fn) => fn(),
            clearTimeout: () => {{}},
            location: {{ reload: () => {{}} }},
            ARK_VERSION: '1.0.2',
            localStorage: localStorageMock,
            matchMedia: () => ({{ matches: false, addEventListener: () => {{}} }})
        }};
        const headMock = createEl('head', {{}}, []);
        const bodyMock = createEl('body', {{}}, []);
        const documentMock = {{
            head: headMock,
            body: bodyMock,
            getElementById: () => null,
            querySelector: (sel) => sel === 'head' ? headMock : createEl('div', {{}}, []),
            querySelectorAll: () => []
        }};
        const E = createEl;
        const L = {{
            bind: (fn, ctx, ...args) => fn.bind(ctx, ...args),
            url: (path) => '/' + path,
            resource: (path) => '/' + path
        }};
        const rpcMock = {{
            declare: () => () => Promise.resolve({{}})
        }};
        const ui = {{
            showModal: (title, body) => {{}},
            hideModal: () => {{}},
            addNotification: () => {{}}
        }};
        const fsMock = {{
            exec: () => Promise.resolve({{ code: 0, stdout: '{{}}' }})
        }};

        const viewExtendClass = function(obj) {{
            return function() {{
                Object.assign(this, obj);
            }};
        }};

        const sandbox = {{
            window: windowMock,
            document: documentMock,
            localStorage: localStorageMock,
            E, L, ui, fs: fsMock, rpc: rpcMock,
            view: {{ extend: viewExtendClass }},
            baseclass: {{ extend: viewExtendClass }}
        }};

        const fn = new Function('sandbox', 'with(sandbox) {{ ' + code + '\\n }}');
        const ViewClass = fn(sandbox);
        if (!ViewClass) throw new Error('Falha ao carregar ViewClass do overview.js');

        const v = new ViewClass();

        // 1. Cenário FULL: 1024 MB RAM, CPU aarch64 (ARM64), Flash de 100 MB
        v.capabilities = {{
            profile: 'full',
            actual_profile: 'full',
            package_manager: 'opkg',
            hardware: {{
                cpu_arch: 'aarch64',
                mem_total_mb: 1024,
                cpu_cores: 4,
                cpu_freq_mhz: 2000
            }},
            features: {{
                speedify: {{
                    installed: true,
                    active: false,
                    runtime_running: false,
                    supported: true,
                    state: 'STOPPED',
                    install_mode: 'internal',
                    bonding_mode: 'speed',
                    luci: false,
                    storage: {{
                        internal_ok: true,
                        overlay_avail_kb: 50000,
                        tmp_avail_kb: 400000,
                        recommended: 'internal'
                    }}
                }},
                speedify_bypass: {{
                    domainWatchlistEnabled: true,
                    services: [
                        {{ title: 'Netflix', enabled: true }},
                        {{ title: 'WhatsApp', enabled: false }}
                    ]
                }},
                adblock: {{
                    installed: true,
                    active: true,
                    mode: 'local',
                    supported_profile: 'full',
                    local_installed: true,
                    mem_total_mb: 1024,
                    overlay_free_mb: 50
                }}
            }}
        }};
        v.feature = (k) => (v.capabilities.features && v.capabilities.features[k]) || {{}};
        v.starlinkResults = {{}};

        // Renderiza Speedify Card no modo FULL (com daemon DESLIGADO)
        const speedifyHtmlStopped = v.speedifyCard({{}}).toString();
        if (speedifyHtmlStopped.includes('neste modo leve')) {{
            throw new Error('Cenário FULL não pode conter o texto legado "neste modo leve"!');
        }}
        if (speedifyHtmlStopped.includes('Bypass leve')) {{
            throw new Error('Cenário FULL não pode conter o texto legado "Bypass leve"!');
        }}
        if (!speedifyHtmlStopped.includes('Bypass de Serviços')) {{
            throw new Error('Cenário FULL deve conter "Bypass de Serviços"!');
        }}
        // Com daemon parado, não deve exibir os botões que precisam do socket ativo
        if (speedifyHtmlStopped.includes('Parear / login') || speedifyHtmlStopped.includes('Verificar conta')) {{
            throw new Error('Com Speedify desligado, botões Parear / login e Verificar conta NÃO devem ser renderizados!');
        }}
        // Com Speedify instalado, deve reportar "Interno" e não "RAM experimental"
        if (!speedifyHtmlStopped.includes('Interno') || speedifyHtmlStopped.includes('RAM experimental')) {{
            throw new Error('Speedify instalado no cenário FULL deve indicar "Interno" e não "RAM experimental"!');
        }}

        // Agora simula daemon LIGADO (runtime_running = true)
        v.capabilities.features.speedify.runtime_running = true;
        v.capabilities.features.speedify.state = 'CONNECTED';
        const speedifyHtmlRunning = v.speedifyCard({{}}).toString();
        if (!speedifyHtmlRunning.includes('Parear / login') || !speedifyHtmlRunning.includes('Verificar conta')) {{
            throw new Error('Com Speedify rodando, botões Parear / login e Verificar conta DEVEM ser renderizados!');
        }}

        // Renderiza Adblock Card no modo FULL
        const adblockHtml = v.adblockCard().toString();
        if (!adblockHtml) throw new Error('Falha ao renderizar Adblock Card no modo FULL');

        console.log('OK_FULL_SCENARIO');
        """
        proc = subprocess.run([node_bin, "-e", test_script], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(proc.returncode, 0, f"Falha no cenário FULL: {proc.stderr}")
        self.assertIn("OK_FULL_SCENARIO", proc.stdout)

    def test_04_frontend_lite_scenario_rendering(self):
        """Testa a inicialização e renderização do frontend no cenário LITE (128MB RAM, MIPS 32-bit)"""
        node_bin, bundle_path = get_node_and_bundle_path()
        if not node_bin:
            self.skipTest("Node.js não encontrado no ambiente")

        test_script = f"""
        const fs = require('fs');
        let code = fs.readFileSync('{bundle_path}', 'utf8');

        function createEl(tag, attrs, children) {{
            return {{
                tag,
                attrs: attrs || {{}},
                children: Array.isArray(children) ? children : (children != null ? [children] : []),
                appendChild(c) {{ this.children.push(c); return c; }},
                addEventListener() {{}},
                setAttribute(k, v) {{ this.attrs[k] = v; }},
                getAttribute(k) {{ return this.attrs[k]; }},
                classList: {{ add() {{}}, remove() {{}}, toggle() {{}} }},
                style: {{}},
                toString() {{
                    const childStr = this.children.map(c => typeof c === 'object' ? (c ? c.toString() : '') : String(c)).join(' ');
                    return `<${{tag}}>${{childStr}}</${{tag}}>`;
                }}
            }};
        }}

        const localStorageMock = {{
            getItem: () => null,
            setItem: () => {{}}
        }};

        const windowMock = {{
            addEventListener: () => {{}},
            setTimeout: (fn) => fn(),
            clearTimeout: () => {{}},
            location: {{ reload: () => {{}} }},
            ARK_VERSION: '1.0.2',
            localStorage: localStorageMock,
            matchMedia: () => ({{ matches: false, addEventListener: () => {{}} }})
        }};
        const headMock = createEl('head', {{}}, []);
        const bodyMock = createEl('body', {{}}, []);
        const documentMock = {{
            head: headMock,
            body: bodyMock,
            getElementById: () => null,
            querySelector: (sel) => sel === 'head' ? headMock : createEl('div', {{}}, []),
            querySelectorAll: () => []
        }};
        const E = createEl;
        const L = {{
            bind: (fn, ctx, ...args) => fn.bind(ctx, ...args),
            url: (path) => '/' + path,
            resource: (path) => '/' + path
        }};
        const rpcMock = {{
            declare: () => () => Promise.resolve({{}})
        }};
        const ui = {{
            showModal: (title, body) => {{}},
            hideModal: () => {{}},
            addNotification: () => {{}}
        }};
        const fsMock = {{
            exec: () => Promise.resolve({{ code: 0, stdout: '{{}}' }})
        }};

        const viewExtendClass = function(obj) {{
            return function() {{
                Object.assign(this, obj);
            }};
        }};

        const sandbox = {{
            window: windowMock,
            document: documentMock,
            localStorage: localStorageMock,
            E, L, ui, fs: fsMock, rpc: rpcMock,
            view: {{ extend: viewExtendClass }},
            baseclass: {{ extend: viewExtendClass }}
        }};

        const fn = new Function('sandbox', 'with(sandbox) {{ ' + code + '\\n }}');
        const ViewClass = fn(sandbox);
        const v = new ViewClass();

        // 2. Cenário LITE: 128 MB RAM, CPU mips_24kc (32-bit), Flash de 16 MB (3 MB livres)
        v.capabilities = {{
            profile: 'lite',
            actual_profile: 'lite',
            package_manager: 'opkg',
            hardware: {{
                cpu_arch: 'mips_24kc',
                mem_total_mb: 128,
                cpu_cores: 1,
                cpu_freq_mhz: 580
            }},
            features: {{
                speedify: {{
                    installed: false,
                    active: false,
                    runtime_running: false,
                    supported: false,
                    state: 'unavailable',
                    install_mode: 'none',
                    luci: false,
                    storage: {{
                        internal_ok: false,
                        overlay_avail_kb: 3000,
                        tmp_avail_kb: 45000,
                        recommended: 'none'
                    }}
                }},
                adblock: {{
                    installed: true,
                    active: true,
                    mode: 'cloud',
                    supported_profile: 'lite',
                    local_installed: false,
                    mem_total_mb: 128,
                    overlay_free_mb: 3
                }}
            }}
        }};
        v.feature = (k) => (v.capabilities.features && v.capabilities.features[k]) || {{}};
        v.starlinkResults = {{}};

        // Renderiza Speedify Card no modo LITE (32-bit MIPS)
        const speedifyHtml = v.speedifyCard({{}}).toString();
        if (!speedifyHtml.includes('Hardware Incompatível') && !speedifyHtml.includes('não atende aos requisitos')) {{
            throw new Error('Cenário LITE em MIPS deve avisar com elegância da incompatibilidade de 64-bit do Speedify!');
        }}
        if (!speedifyHtml.includes('Multi-WAN')) {{
            throw new Error('Cenário LITE deve recomendar o Multi-WAN nativo como alternativa leve!');
        }}

        // Renderiza Adblock Card no modo LITE
        const adblockHtml = v.adblockCard().toString();
        if (!adblockHtml) throw new Error('Falha ao renderizar Adblock Card no modo LITE');

        console.log('OK_LITE_SCENARIO');
        """
        proc = subprocess.run([node_bin, "-e", test_script], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        self.assertEqual(proc.returncode, 0, f"Falha no cenário LITE: {proc.stderr}")
        self.assertIn("OK_LITE_SCENARIO", proc.stdout)

if __name__ == "__main__":
    unittest.main(verbosity=2)
