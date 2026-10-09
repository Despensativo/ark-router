#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test Suite: Multi-WAN Intelligent Speedtest Prompt
Verifica se openFastCom detecta conexões ativas:
1. Com 1 WAN ativa: roda direto showEmbedSpeedtest('wan') sem perguntar.
2. Com 2 ou mais WANs ativas: abre promptSelectWanForSpeedtest com opções interativas.
"""

import unittest
import os
import subprocess
import tempfile

class TestMultiWanSpeedtestPrompt(unittest.TestCase):
    def test_openfastcom_single_wan_and_multi_wan_flows(self):
        repo_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        bundle_path = os.path.join(repo_dir, "root", "www", "luci-static", "resources", "view", "equipe-dashboard", "overview.js")
        
        js_template = """
        const fs = require('fs');
        const code = fs.readFileSync('__BUNDLE_PATH__', 'utf8');

        let lastModalTitle = '';
        let lastModalBody = null;
        let lastTestedWan = '';
        let promptCalledWith = null;

        function createEl(tag, attrs, children) {
            return {
                tag,
                attrs: attrs || {},
                children: Array.isArray(children) ? children : (children != null ? [children] : []),
                appendChild(c) { this.children.push(c); return c; },
                addEventListener() {},
                setAttribute(k, v) { this.attrs[k] = v; },
                getAttribute(k) { return this.attrs[k]; },
                style: {},
                click: (attrs && attrs.click) || null
            };
        }

        const windowMock = {
            addEventListener: () => {},
            setTimeout: (fn) => fn(),
            clearTimeout: () => {},
            location: { reload: () => {} },
            matchMedia: () => ({ matches: false, addEventListener: () => {} }),
            localStorage: { getItem: () => null, setItem: () => {} }
        };
        const headMock = createEl('head');
        const bodyMock = createEl('body');
        const documentMock = {
            head: headMock,
            body: bodyMock,
            getElementById: () => null,
            querySelector: () => createEl('div'),
            querySelectorAll: () => []
        };
        const E = createEl;
        const L = {
            bind: (fn, ctx, ...args) => fn.bind(ctx, ...args),
            url: (p) => '/' + p,
            resource: (p) => '/' + p
        };
        const ui = {
            showModal: (title, body) => {
                lastModalTitle = title;
                lastModalBody = body;
            },
            hideModal: () => {}
        };
        const fsMock = {
            exec: (cmd, args) => Promise.resolve({ code: 0, stdout: '{}' })
        };

        const viewExtendClass = function(obj) {
            return function() {
                Object.assign(this, obj);
            };
        };

        const sandbox = {
            window: windowMock,
            document: documentMock,
            E, L, ui, fs: fsMock,
            rpc: { declare: () => () => Promise.resolve({}) },
            view: { extend: viewExtendClass },
            baseclass: { extend: viewExtendClass },
            console, setTimeout, clearTimeout
        };

        const fn = new Function('sandbox', 'with(sandbox) { ' + code + '\\n }');
        const ViewClass = fn(sandbox);
        if (!ViewClass) throw new Error('View class not found in bundle');
        const viewInst = new ViewClass();

        // Test 1: Single WAN active (Only WAN1 connected)
        viewInst.currentData = {
            interfaces: {
                wan: { up: true, proto: 'pppoe', ipv4_address: [{ address: '187.20.10.5' }] },
                wan2: { up: false, proto: 'dhcp' }
            },
            networkConfig: {
                values: {
                    wan: { proto: 'pppoe', device: 'eth1' },
                    wan2: { proto: 'none' }
                }
            }
        };

        let embedRan = false;
        viewInst.showEmbedSpeedtest = function(wan) {
            embedRan = true;
            lastTestedWan = wan;
        };

        viewInst.openFastCom();
        if (!embedRan || lastTestedWan !== 'wan') {
            console.error('FAIL: Single WAN did not run showEmbedSpeedtest directly. Wan:', lastTestedWan);
            process.exit(1);
        }
        console.log('PASS: Single WAN ran directly on: ' + lastTestedWan);

        // Test 2: Multi-WAN active (WAN1 PPPoE and WAN2 DHCP both up)
        embedRan = false;
        lastTestedWan = '';
        viewInst.currentData = {
            interfaces: {
                wan: { up: true, proto: 'pppoe', ipv4_address: [{ address: '187.20.10.5' }], l3_device: 'pppoe-wan' },
                wan2: { up: true, proto: 'dhcp', ipv4_address: [{ address: '192.168.100.25' }], l3_device: 'eth2' }
            },
            networkConfig: {
                values: {
                    wan: { proto: 'pppoe', device: 'eth1' },
                    wan2: { proto: 'dhcp', device: 'eth2' }
                }
            }
        };

        const origPrompt = viewInst.promptSelectWanForSpeedtest;
        viewInst.promptSelectWanForSpeedtest = function(connectedWans) {
            promptCalledWith = connectedWans;
            origPrompt.call(viewInst, connectedWans);
        };

        viewInst.openFastCom();
        if (embedRan) {
            console.error('FAIL: Multi-WAN ran directly instead of asking');
            process.exit(2);
        }
        if (!promptCalledWith || promptCalledWith.length !== 2) {
            console.error('FAIL: promptSelectWanForSpeedtest was not called with 2 WANs');
            process.exit(3);
        }
        if (!lastModalTitle || lastModalTitle.indexOf('Testar Velocidade') === -1) {
            console.error('FAIL: Modal title incorrect:', lastModalTitle);
            process.exit(4);
        }

        console.log('PASS: Multi-WAN prompted modal: ' + lastModalTitle + ' with ' + promptCalledWith.length + ' active WANs');

        // Test 3: Clicking the card triggers showEmbedSpeedtest for selected WAN
        const modalBodyArray = lastModalBody;
        let cardsContainer = modalBodyArray.find(el => el.children && el.children.length === 2);
        if (!cardsContainer || !cardsContainer.children) {
            console.error('FAIL: Cards container not found in modal');
            process.exit(5);
        }
        const wan2Card = cardsContainer.children[1];
        wan2Card.click();
        if (!embedRan || lastTestedWan !== 'wan2') {
            console.error('FAIL: Clicking WAN2 card did not launch test on wan2. Result:', lastTestedWan);
            process.exit(6);
        }
        console.log('PASS: Selecting WAN2 successfully triggered showEmbedSpeedtest for: ' + lastTestedWan);
        """

        js_test = js_template.replace("__BUNDLE_PATH__", bundle_path)

        with tempfile.NamedTemporaryFile(suffix=".js", mode="w", delete=False) as f:
            f.write(js_test)
            temp_path = f.name

        try:
            res = subprocess.run(["node", temp_path], capture_output=True, text=True)
            self.assertEqual(res.returncode, 0, f"Node script failed:\n{res.stdout}\n{res.stderr}")
            self.assertIn("PASS: Single WAN ran directly on: wan", res.stdout)
            self.assertIn("PASS: Multi-WAN prompted modal", res.stdout)
            self.assertIn("PASS: Selecting WAN2 successfully triggered showEmbedSpeedtest for: wan2", res.stdout)
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

if __name__ == '__main__':
    unittest.main()
