#!/usr/bin/env python3
"""
ARK Router - Attended Sysupgrade Check Toggle Test Suite
Validates backend asu-check-status and asu-check-toggle commands,
along with UCI configuration persistence and defaults.
"""
import unittest
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_harness import RouterSandbox

class TestAsuToggle(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()

    def tearDown(self):
        self.sb.cleanup()

    def test_01_asu_check_status_default(self):
        """Verifica se asu-check-status reporta desativado por padrao quando nao configurado"""
        res = self.sb.run_control("asu-check-status")
        self.assertEqual(res.returncode, 0, f"Falha ao executar asu-check-status: {res.stderr}")
        data = json.loads(res.stdout)
        self.assertFalse(data.get("enabled"), "Por padrao o status deveria ser false")
        self.assertEqual(data.get("status"), "disabled")

    def test_02_asu_check_toggle_enable_and_disable(self):
        """Verifica se asu-check-toggle 1 ativa e asu-check-toggle 0 desativa a checagem"""
        # Ativar
        res_enable = self.sb.run_control("asu-check-toggle", "1")
        self.assertEqual(res_enable.returncode, 0, f"Falha ao ativar: {res_enable.stderr}")
        self.assertEqual(res_enable.stdout.strip(), "ok")

        res_stat1 = self.sb.run_control("asu-check-status")
        self.assertEqual(res_stat1.returncode, 0)
        data1 = json.loads(res_stat1.stdout)
        self.assertTrue(data1.get("enabled"), "Deveria estar ativado apos toggle 1")
        self.assertEqual(data1.get("status"), "enabled")

        # Desativar
        res_disable = self.sb.run_control("asu-check-toggle", "0")
        self.assertEqual(res_disable.returncode, 0, f"Falha ao desativar: {res_disable.stderr}")
        self.assertEqual(res_disable.stdout.strip(), "ok")

        res_stat0 = self.sb.run_control("asu-check-status")
        self.assertEqual(res_stat0.returncode, 0)
        data0 = json.loads(res_stat0.stdout)
        self.assertFalse(data0.get("enabled"), "Deveria estar desativado apos toggle 0")
        self.assertEqual(data0.get("status"), "disabled")

    def test_03_asu_check_toggle_invalid_input(self):
        """Valida que entradas invalidas sao rejeitadas com codigo de erro 2"""
        res = self.sb.run_control("asu-check-toggle", "invalid")
        self.assertNotEqual(res.returncode, 0, "Deveria falhar para entrada invalida")
        self.assertEqual(res.returncode, 2)

    def test_04_frontend_asu_toggle_rendering(self):
        """Verifica se selfUpdatePanel renderiza o toggle de verificacao do OpenWrt corretamente"""
        import shutil
        import subprocess

        node_bin = shutil.which("node") or shutil.which("node.exe") or "/mnt/c/Program Files/nodejs/node.exe"
        if not node_bin or not os.path.exists(str(node_bin)):
            self.skipTest("Node.js não disponível")

        repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        bundle_path = os.path.join(repo_dir, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.js")
        if not os.path.exists(bundle_path):
            self.skipTest(f"Bundle {bundle_path} não encontrado")

        with open(bundle_path, "r", encoding="utf-8") as f:
            bundle_content = f.read()

        test_js = f"""
        const fs = require('fs');
        let code = fs.readFileSync(0, 'utf8');

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

        const headMock = createEl('head', {{}}, []);
        const bodyMock = createEl('body', {{}}, []);
        const documentMock = {{
            head: headMock,
            body: bodyMock,
            getElementById: () => null,
            querySelector: (sel) => sel === 'head' ? headMock : createEl('div', {{}}, []),
            querySelectorAll: () => []
        }};

        const sandbox = {{
            window: {{ ARK_VERSION: '1.0.2', addEventListener: () => {{}} }},
            document: documentMock,
            E: createEl,
            L: {{ bind: (fn, ctx, ...args) => fn.bind(ctx, ...args), resource: (p) => '/' + p, url: (p) => '/' + p }},
            rpc: {{ declare: () => () => Promise.resolve({{}}) }},
            ui: {{ showModal: () => {{}}, addNotification: () => {{}} }},
            fs: {{ exec: () => Promise.resolve({{ code: 0 }}) }},
            view: {{ extend: function(obj) {{ return function() {{ Object.assign(this, obj); }}; }} }},
            baseclass: {{ extend: function(obj) {{ return function() {{ Object.assign(this, obj); }}; }} }}
        }};

        const fn = new Function('sandbox', 'with(sandbox) {{ ' + code + '\\n }}');
        const ViewClass = fn(sandbox);
        const v = new ViewClass();

        // 1. Teste com asu_check = false
        v.capabilities = {{ update: {{ asu_check: false, manager: 'apk', current: '1.0.2' }} }};
        const htmlOff = v.selfUpdatePanel().toString();
        if (!htmlOff.includes('Verificação do OpenWrt Base')) throw new Error('Não encontrou título do toggle');
        if (!htmlOff.includes('Attended Sysupgrade')) throw new Error('Não encontrou badge do Attended Sysupgrade');
        if (!htmlOff.includes('DESLIGADA')) throw new Error('Deveria reportar DESLIGADA');

        // 2. Teste com asu_check = true
        v.capabilities = {{ update: {{ asu_check: true, manager: 'apk', current: '1.0.2' }} }};
        const htmlOn = v.selfUpdatePanel().toString();
        if (!htmlOn.includes('LIGADA')) throw new Error('Deveria reportar LIGADA');

        console.log('OK_ASU_TOGGLE_RENDER');
        """

        proc = subprocess.run([node_bin, "-e", test_js], input=bundle_content, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8")
        self.assertEqual(proc.returncode, 0, f"Falha na renderizacao do frontend: {proc.stderr}")
        self.assertIn("OK_ASU_TOGGLE_RENDER", proc.stdout)

if __name__ == "__main__":
    unittest.main(verbosity=2)
