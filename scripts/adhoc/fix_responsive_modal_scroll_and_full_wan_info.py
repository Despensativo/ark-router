#!/usr/bin/env python3
"""
ARK Router V2: Fix Responsive Modal Scroll, Add Maximize/Resize Controls,
and Restore Full WAN / PPPoE Information & Profile Management
"""

import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
TARGET_FILE = os.path.join(REPO_DIR, "scripts", "generate_v2_staging_dashboard.py")

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace base modal CSS
old_modal_css_pattern = r"/\* Modals & Backdrop \*/.*?\.modal-footer\s*\{.*?\}"

new_modal_css = """/* Modals & Backdrop (Responsive Bottom Sheet & Fullscreen Support) */
        #modal_overlay {
            position: fixed;
            inset: 0;
            width: 100vw;
            height: 100dvh;
            background: rgba(0, 0, 0, 0.82);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 2000;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
            box-sizing: border-box;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        body.modal-overlay-active #modal_overlay {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
        }

        .modal-box {
            background: #0f192d;
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: var(--ark-radius-lg);
            width: 100%;
            max-width: 640px;
            box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85);
            max-height: calc(100dvh - 36px);
            display: flex;
            flex-direction: column;
            position: relative;
            margin: auto;
            box-sizing: border-box;
            overflow: hidden;
            transition: max-width 0.2s ease, max-height 0.2s ease, border-radius 0.2s ease;
        }

        .modal-box.modal-fullscreen {
            max-width: 100vw !important;
            width: 100vw !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
            border-radius: 0 !important;
            margin: 0 !important;
            border: none !important;
            inset: 0 !important;
            position: fixed !important;
            z-index: 2005 !important;
        }

        #modal_content_holder {
            display: flex;
            flex-direction: column;
            width: 100%;
            height: 100%;
            max-height: 100%;
            min-height: 0;
            overflow: hidden;
            flex: 1 1 auto;
            box-sizing: border-box;
        }

        .modal-header {
            padding: 16px 20px;
            border-bottom: 1px solid var(--ark-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #0f192d;
            flex-shrink: 0;
            position: sticky;
            top: 0;
            z-index: 20;
            box-sizing: border-box;
        }

        .modal-header h3 {
            font-size: 1.12rem;
            font-weight: 800;
            color: #fff;
            display: flex;
            align-items: center;
            gap: 8px;
            margin: 0;
            line-height: 1.3;
        }

        .modal-header-actions {
            display: flex;
            align-items: center;
            gap: 6px;
            flex-shrink: 0;
        }

        .modal-maximize-btn, .modal-close-btn {
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #94a3b8;
            font-size: 1.1rem;
            cursor: pointer;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            transition: all 0.15s ease;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }

        .modal-maximize-btn:hover, .modal-close-btn:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.25);
        }

        .modal-body {
            padding: 20px 22px;
            overflow-y: auto !important;
            -webkit-overflow-scrolling: touch !important;
            overscroll-behavior: contain;
            display: flex;
            flex-direction: column;
            gap: 16px;
            flex: 1 1 auto;
            min-height: 0;
            box-sizing: border-box;
            scrollbar-width: thin;
            scrollbar-color: #38bdf8 rgba(255, 255, 255, 0.1);
        }

        .modal-body::-webkit-scrollbar {
            width: 6px;
        }
        .modal-body::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }
        .modal-body::-webkit-scrollbar-thumb {
            background: #38bdf8;
            border-radius: 3px;
        }

        .modal-footer {
            padding: 14px 22px;
            border-top: 1px solid var(--ark-border);
            display: flex;
            justify-content: flex-end;
            align-items: center;
            gap: 10px;
            background: #0b1323;
            flex-shrink: 0;
            position: sticky;
            bottom: 0;
            z-index: 20;
            box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.4);
            box-sizing: border-box;
        }"""

content = re.sub(old_modal_css_pattern, new_modal_css, content, flags=re.DOTALL)

# 2. Replace mobile modal CSS rules in @media (max-width: 854px)
old_mobile_modal_css = r"\.modal-box\s*\{\s*max-width:\s*95vw\s*!important;\s*margin:\s*8px\s*!important;\s*\}\s*\.modal-footer\s*\{.*?\}"

new_mobile_modal_css = """/* Mobile Bottom Sheet Modal Optimization */
            #modal_overlay {
                padding: 0 !important;
                align-items: flex-end !important;
                overflow: hidden !important;
            }
            .modal-box {
                max-width: 100vw !important;
                width: 100vw !important;
                max-height: 92dvh !important;
                height: 92dvh !important;
                margin: 0 !important;
                border-bottom-left-radius: 0 !important;
                border-bottom-right-radius: 0 !important;
                border-top-left-radius: 22px !important;
                border-top-right-radius: 22px !important;
                border-left: none !important;
                border-right: none !important;
                border-bottom: none !important;
                border-top: 2px solid rgba(56, 189, 248, 0.45) !important;
                box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.9) !important;
            }
            .modal-box.modal-fullscreen {
                max-height: 100dvh !important;
                height: 100dvh !important;
                border-top-left-radius: 0 !important;
                border-top-right-radius: 0 !important;
                border-top: none !important;
            }
            .modal-header {
                padding: 12px 16px !important;
            }
            .modal-header h3 {
                font-size: 1.05rem !important;
            }
            .modal-body {
                padding: 14px 16px 20px 16px !important;
                gap: 12px !important;
                max-height: calc(92dvh - 125px) !important;
                -webkit-overflow-scrolling: touch !important;
            }
            .modal-footer {
                padding: 12px 16px 16px 16px !important;
                flex-direction: column-reverse !important;
                gap: 8px !important;
                background: #09101c !important;
            }
            .modal-footer .ark-btn {
                width: 100% !important;
                min-height: 44px !important;
                font-size: 0.95rem !important;
                font-weight: 700 !important;
                justify-content: center !important;
            }"""

content = re.sub(old_mobile_modal_css, new_mobile_modal_css, content, flags=re.DOTALL)

# 3. Add JS helper functions for Modal Maximize, PPPoE Profile management & WAN reconnection
modal_helpers = """
        // Modal Maximize & Fullscreen State
        function toggleModalMaximize() {
            const box = document.querySelector('.modal-box');
            const btns = document.querySelectorAll('.modal-maximize-btn');
            if (!box) return;
            const isFull = box.classList.toggle('modal-fullscreen');
            btns.forEach(b => {
                b.textContent = isFull ? '🗗' : '⛶';
                b.title = isFull ? 'Restaurar tamanho padrão' : 'Expandir para tela cheia';
            });
            showToast(isFull ? '⛶ Janela expandida para tela cheia!' : '🗗 Tamanho padrão restaurado.');
        }

        // PPPoE Saved Profiles Database
        let PPPOE_PROFILES = [
            { id: 'vivo', name: 'Vivo Fibra GPON', user: 'cliente@vivofibra.com.br', pass: 'vivo123', vlan: '10', mtu: '1492', mac: '00:1A:2B:3C:4D:5E', modem: '192.168.1.1' },
            { id: 'claro', name: 'Claro Fibra FTTH', user: 'cliente@clarofibra.com.br', pass: 'claro2026', vlan: '100', mtu: '1500', mac: '', modem: '192.168.0.1' },
            { id: 'oi', name: 'Oi Fibra Telecom', user: 'cliente@oifibra.com.br', pass: 'oi12345', vlan: '10', mtu: '1492', mac: '', modem: '192.168.1.254' }
        ];

        function loadPppoeProfile(profId) {
            if (!profId) return;
            const p = PPPOE_PROFILES.find(x => x.id === profId);
            if (!p) return;
            const u = document.getElementById('m_wan_user');
            const pw = document.getElementById('m_wan_pass');
            const v = document.getElementById('m_wan_vlan');
            const m = document.getElementById('m_wan_mtu');
            const mc = document.getElementById('m_wan_mac');
            const md = document.getElementById('m_wan_modem_ip');
            if (u) u.value = p.user;
            if (pw) pw.value = p.pass;
            if (v) v.value = p.vlan || '';
            if (m) m.value = p.mtu || '1492';
            if (mc) mc.value = p.mac || '';
            if (md) md.value = p.modem || '';
            const status = document.getElementById('pppoe_profile_status');
            if (status) {
                status.textContent = `✓ Perfil "${p.name}" aplicado!`;
                status.style.display = 'inline-block';
            }
            showToast(`✅ Perfil PPPoE "${p.name}" carregado nos campos!`);
        }

        function toggleSaveProfilePrompt() {
            const box = document.getElementById('pppoe_save_prompt_box');
            if (box) box.style.display = (box.style.display === 'none' || !box.style.display) ? 'block' : 'none';
        }

        function doSavePppoeProfile() {
            const nameInput = document.getElementById('pppoe_new_prof_name');
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                alert('Informe um nome para o perfil (ex: Fibra Vivo, Provedor X).');
                return;
            }
            const user = document.getElementById('m_wan_user') ? document.getElementById('m_wan_user').value.trim() : '';
            const pass = document.getElementById('m_wan_pass') ? document.getElementById('m_wan_pass').value : '';
            const vlan = document.getElementById('m_wan_vlan') ? document.getElementById('m_wan_vlan').value.trim() : '';
            const mtu = document.getElementById('m_wan_mtu') ? document.getElementById('m_wan_mtu').value.trim() : '1492';
            const mac = document.getElementById('m_wan_mac') ? document.getElementById('m_wan_mac').value.trim() : '';
            const modem = document.getElementById('m_wan_modem_ip') ? document.getElementById('m_wan_modem_ip').value.trim() : '';

            const id = 'prof_' + Date.now();
            PPPOE_PROFILES.push({ id, name, user, pass, vlan, mtu, mac, modem });

            // Refresh select
            const sel = document.getElementById('m_wan_pppoe_profiles');
            if (sel) {
                const opt = document.createElement('option');
                opt.value = id;
                opt.textContent = `${name} (${user || 'sem usuário'})`;
                opt.selected = true;
                sel.appendChild(opt);
            }
            const box = document.getElementById('pppoe_save_prompt_box');
            if (box) box.style.display = 'none';
            if (nameInput) nameInput.value = '';
            showToast(`💾 Perfil PPPoE "${name}" salvo com sucesso!`);
        }

        function deleteSelectedPppoeProfile() {
            const sel = document.getElementById('m_wan_pppoe_profiles');
            if (!sel || !sel.value) {
                alert('Selecione um perfil salvo na lista para excluir.');
                return;
            }
            const profId = sel.value;
            const idx = PPPOE_PROFILES.findIndex(x => x.id === profId);
            if (idx >= 0) {
                const deletedName = PPPOE_PROFILES[idx].name;
                PPPOE_PROFILES.splice(idx, 1);
                sel.remove(sel.selectedIndex);
                sel.value = '';
                const status = document.getElementById('pppoe_profile_status');
                if (status) status.style.display = 'none';
                showToast(`🗑️ Perfil "${deletedName}" excluído.`);
            }
        }

        function reconnectWan(name) {
            showToast(`🔄 Reiniciando conexão ${name.toUpperCase()}…`);
            setTimeout(() => {
                showToast(`✅ ${name.toUpperCase()} reconectada com sucesso! IP renovado.`);
            }, 1200);
        }

        function toggleIpv6Delegate(isChecked) {
            const delSwitch = document.getElementById('m_wan_delegate');
            const hint = document.getElementById('m_wan_pd_hint');
            if (delSwitch) {
                delSwitch.disabled = !isChecked;
                if (!isChecked) delSwitch.checked = false;
            }
            if (hint) {
                hint.textContent = isChecked ? 
                    'Distribui bloco /56 ou /64 público desta operadora para os clientes da LAN' : 
                    'Requer conectividade IPv6 ativa nesta WAN.';
            }
        }
"""

if "function toggleModalMaximize" not in content:
    content = content.replace("function closeModal() {", modal_helpers.strip() + "\n\n        function closeModal() {")

# 4. In closeModal, also reset modal-fullscreen
content = content.replace(
    "function closeModal() { document.body.classList.remove('modal-overlay-active'); }",
    """function closeModal() {
            document.body.classList.remove('modal-overlay-active');
            const box = document.querySelector('.modal-box');
            if (box) box.classList.remove('modal-fullscreen');
            document.querySelectorAll('.modal-maximize-btn').forEach(b => {
                b.textContent = '⛶';
                b.title = 'Expandir para tela cheia';
            });
        }"""
)

# 5. Complete, robust, fully informative openWanModal implementation
new_open_wan_modal = """
        function openWanModal(name) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');
            const isWan1 = name === 'wan1';

            // Generate profile options
            const profOpts = PPPOE_PROFILES.map(p => `<option value="${p.id}" ${p.id === 'vivo' && isWan1 ? 'selected' : ''}>${p.name} (${p.user}${p.mac ? ' • MAC ' + p.mac : ''}${p.modem ? ' • ONU ' + p.modem : ''})</option>`).join('');

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🌐 Configuração da Internet — ${isWan1 ? 'WAN 1 (Vivo Fibra GPON)' : 'WAN 2 (Claro Fibra / Backup)'}</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>
                <div class="modal-body">
                    <!-- Real-Time Hardware & Link Status Bar -->
                    <div style="background:rgba(56, 189, 248, 0.08); border:1px solid rgba(56, 189, 248, 0.25); border-radius:10px; padding:12px 14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                            <div>
                                <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em; font-weight:700;">Porta Física & Interface Lógica</span>
                                <div style="font-weight:800; color:#38bdf8; font-size:0.95rem;">
                                    ${isWan1 ? 'Porta 1 (2.5 Gbps) • eth1 (pppoe-wan)' : 'Porta 2 (LAN1 virando WAN2) • eth2 (dhcp-wan)'}
                                </div>
                            </div>
                            <div style="display:flex; gap:6px; align-items:center;">
                                <span class="pill-badge pill-online">${isWan1 ? '● Conectado (2500M Full Duplex)' : '● Conectado (1000M Full Duplex)'}</span>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="reconnectWan('${name}')" title="Reiniciar interface de rede">🔄 Reconectar</button>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; font-size:0.8rem; border-top:1px solid rgba(255,255,255,0.08); padding-top:8px;">
                            <div><span style="color:#94a3b8;">IP Público:</span> <strong style="color:#fff;">${isWan1 ? '187.54.21.90' : '192.168.0.24'}</strong></div>
                            <div><span style="color:#94a3b8;">Gateway:</span> <strong style="color:#fff;">${isWan1 ? '187.54.21.1' : '192.168.0.1'}</strong></div>
                            <div><span style="color:#94a3b8;">Uptime:</span> <strong style="color:#fff;">14d 08h 34m</strong></div>
                            <div><span style="color:#94a3b8;">Tráfego Total:</span> <strong style="color:#10b981;">↓ 452.8 GB / ↑ 189.4 GB</strong></div>
                        </div>
                    </div>

                    <!-- Protocol Selector -->
                    <div class="form-group">
                        <label class="form-label">Protocolo de Conexão com o Provedor</label>
                        <select class="form-select" id="m_wan_proto" onchange="toggleWanProtoFields(this.value)">
                            <option value="pppoe" ${isWan1 ? 'selected' : ''}>PPPoE (Fibra com Login — Vivo Fibra, Oi Fibra, Provedores FTTH)</option>
                            <option value="dhcp" ${!isWan1 ? 'selected' : ''}>DHCP Cliente Automático (Claro Fibra, Starlink, Modem em Bridge)</option>
                            <option value="static">IP Fixo / Estático Corporativo (Link Dedicado com IP Definido)</option>
                        </select>
                    </div>

                    <!-- PPPoE Profiles Manager Bar (V1 Mandatory Feature) -->
                    <div id="wan_pppoe_profile_bar" style="display:${isWan1 ? 'block' : 'none'}; background:rgba(30,41,59,0.7); border:1px solid rgba(59,130,246,0.25); border-radius:8px; padding:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label class="form-label" style="color:#60a5fa; margin:0;">Perfis PPPoE Salvos no Roteador</label>
                            <span id="pppoe_profile_status" style="font-size:0.75rem; color:#34d399; font-weight:600;">✓ Perfil Vivo Fibra aplicado</span>
                        </div>
                        <div style="display:flex; gap:6px;">
                            <select class="form-select" id="m_wan_pppoe_profiles" style="flex:1;" onchange="loadPppoeProfile(this.value)">
                                <option value="">-- Escolher perfil PPPoE salvo (${PPPOE_PROFILES.length}) --</option>
                                ${profOpts}
                            </select>
                            <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.8rem; padding:6px 10px;" onclick="deleteSelectedPppoeProfile()" title="Excluir perfil selecionado">🗑️</button>
                            <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.8rem; padding:6px 12px; white-space:nowrap;" onclick="toggleSaveProfilePrompt()">💾 Salvar Atual</button>
                        </div>
                        <div id="pppoe_save_prompt_box" style="display:none; margin-top:8px; padding:10px; background:rgba(15,23,42,0.95); border:1px solid rgba(59,130,246,0.4); border-radius:6px;">
                            <small style="color:#94a3b8; display:block; margin-bottom:6px;">Dê um nome para salvar o usuário, senha, VLAN, MAC e IP da ONU atuais:</small>
                            <div style="display:flex; gap:6px;">
                                <input type="text" class="form-input" id="pppoe_new_prof_name" placeholder="Ex: Minha Fibra Vivo 1Gbps" style="flex:1;">
                                <button type="button" class="ark-btn ark-btn-primary" style="padding:6px 14px;" onclick="doSavePppoeProfile()">Salvar</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="padding:6px 10px;" onclick="toggleSaveProfilePrompt()">✕</button>
                            </div>
                        </div>
                    </div>

                    <!-- PPPoE Manual Fields -->
                    <div id="wan_pppoe_fields" style="display:${isWan1 ? 'block' : 'none'}; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
                        <div class="form-group" style="margin-bottom:10px;">
                            <label class="form-label">Nome de Usuário PPPoE</label>
                            <input type="text" class="form-input" id="m_wan_user" value="${isWan1 ? 'cliente@vivofibra.com.br' : 'cliente@provedor.com'}" placeholder="login@provedor.com.br">
                        </div>
                        <div class="form-group" style="margin-bottom:10px;">
                            <label class="form-label">Senha de Autenticação PPPoE</label>
                            <div style="display:flex; gap:8px;">
                                <input type="password" class="form-input" id="m_wan_pass" value="vivo123" placeholder="senha da autenticação">
                                <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('m_wan_pass', this)">👁️ Ver</button>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div class="form-group">
                                <label class="form-label">VLAN ID (802.1Q)</label>
                                <input type="number" class="form-input" id="m_wan_vlan" value="${isWan1 ? '10' : ''}" placeholder="Ex: 10, 100">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Service Name (Opcional)</label>
                                <input type="text" class="form-input" id="m_wan_service" placeholder="Vazio = automático">
                            </div>
                        </div>
                    </div>

                    <!-- DHCP Live Status & Hostname Block -->
                    <div id="wan_dhcp_fields" style="display:${!isWan1 ? 'block' : 'none'}; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
                        <div style="font-size:0.85rem; color:#cbd5e1; margin-bottom:8px;">
                            <strong>Status do Cliente DHCP:</strong> Conectado ao modem da operadora. IP recebido: <code style="color:#38bdf8;">192.168.0.24/24</code>.
                        </div>
                        <div class="form-group">
                            <label class="form-label">Hostname do Roteador para Envio no DHCP</label>
                            <input type="text" class="form-input" id="m_wan_hostname" value="ARK-Router-Master" placeholder="ARK-Router">
                        </div>
                    </div>

                    <!-- Static IP Manual Fields -->
                    <div id="wan_static_fields" style="display:none; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
                        <div class="form-group" style="margin-bottom:10px;">
                            <label class="form-label">Endereço IP Fixo Público</label>
                            <input type="text" class="form-input" id="m_wan_static_ip" value="187.54.21.90" placeholder="Ex: 200.180.10.5">
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div class="form-group">
                                <label class="form-label">Máscara de Sub-rede</label>
                                <input type="text" class="form-input" id="m_wan_static_mask" value="255.255.255.0" placeholder="255.255.255.0">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Gateway Padrão</label>
                                <input type="text" class="form-input" id="m_wan_static_gw" value="187.54.21.1" placeholder="Ex: 200.180.10.1">
                            </div>
                        </div>
                    </div>

                    <!-- MTU with Presets & Manual Value -->
                    <div class="form-group">
                        <label class="form-label">Tamanho Máximo de Pacote (MTU)</label>
                        <div style="display:flex; gap:8px;">
                            <select class="form-select" id="m_wan_mtu_sel" onchange="document.getElementById('m_wan_mtu').value = this.value" style="flex:2;">
                                <option value="1492" ${isWan1 ? 'selected' : ''}>1492 (Padrão Otimizado Fibra PPPoE)</option>
                                <option value="1500" ${!isWan1 ? 'selected' : ''}>1500 (Padrão Ethernet / DOCSIS / Starlink)</option>
                                <option value="1508">1508 (Baby Jumbo Frames — PPPoE com 1500 Puro)</option>
                                <option value="1480">1480 (Túneis Corporativos)</option>
                            </select>
                            <input type="number" class="form-input" id="m_wan_mtu" value="${isWan1 ? '1492' : '1500'}" placeholder="MTU" style="flex:1;">
                        </div>
                    </div>

                    <!-- Custom DNS -->
                    <div class="form-group">
                        <label class="form-label">Servidores DNS de Resolução</label>
                        <select class="form-select" id="m_wan_dns_preset" onchange="applyDnsPreset(this.value)" style="margin-bottom:6px;">
                            <option value="1.1.1.1 1.0.0.1" selected>Cloudflare DNS (1.1.1.1 + 1.0.0.1 - Latência 2ms)</option>
                            <option value="8.8.8.8 8.8.4.4">Google Public DNS (8.8.8.8 + 8.8.4.4)</option>
                            <option value="94.140.14.14 94.140.15.15">AdGuard DNS (Filtro Antispam)</option>
                            <option value="custom">Personalizado (Digitação Manual)</option>
                        </select>
                        <input type="text" class="form-input" id="m_wan_dns" value="1.1.1.1 1.0.0.1" placeholder="Servidores DNS separados por espaço (ex: 1.1.1.1 8.8.8.8)">
                    </div>

                    <!-- Cloned MAC Address Manual -->
                    <div class="form-group">
                        <label class="form-label">Clonagem de Endereço MAC (Bypass de Provedor)</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" class="form-input" id="m_wan_mac" value="${isWan1 ? '00:1A:2B:3C:4D:5E' : ''}" placeholder="vazio = MAC físico do hardware">
                            <button type="button" class="ark-btn ark-btn-secondary" onclick="document.getElementById('m_wan_mac').value = '00:1A:2B:3C:4D:5E'">Copiar MAC Físico</button>
                        </div>
                    </div>

                    <!-- Isolated ONU Bridge IP -->
                    <div class="form-group">
                        <label class="form-label">Acesso Isolado à Web GUI da ONU / Modem Bridge</label>
                        <div style="display:flex; gap:8px;">
                            <input type="text" class="form-input" id="m_wan_modem_ip" value="192.168.1.1" placeholder="ex: 192.168.1.1">
                            <button type="button" class="ark-btn ark-btn-secondary" onclick="window.open('http://' + document.getElementById('m_wan_modem_ip').value, '_blank')">🔗 Testar Acesso</button>
                        </div>
                    </div>

                    <!-- Multi-WAN Metric -->
                    <div class="form-group">
                        <label class="form-label">Métrica de Roteamento Multi-WAN (mwan3)</label>
                        <input type="number" class="form-input" id="m_wan_metric" value="${isWan1 ? '10' : '20'}" min="1" max="255">
                        <small style="color:#94a3b8; font-size:0.75rem;">Métrica menor tem maior prioridade. Métrica igual ativa balanceamento de carga.</small>
                    </div>

                    <!-- IPv6 Connectivity & Prefix Delegation (V1 Canonical) -->
                    <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <div>
                                <strong style="color:#fff; font-size:0.88rem;">Conectividade IPv6 Global nesta WAN</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Obtém endereço IPv6 público da operadora via DHCPv6 ou SLAAC</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" id="m_wan_ipv6" checked onchange="toggleIpv6Delegate(this.checked)"><span class="ark-slider"></span></label>
                        </div>
                        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:10px;">
                            <div>
                                <strong style="color:#fff; font-size:0.88rem;">Distribuição de Prefixo IPv6 (DHCPv6-PD)</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;" id="m_wan_pd_hint">Distribui bloco /56 ou /64 público desta operadora para os dispositivos locais</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" id="m_wan_delegate" ${isWan1 ? 'checked' : ''}><span class="ark-slider"></span></label>
                        </div>
                    </div>

                    <!-- Direct Action Buttons from V1 -->
                    <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                        <button type="button" class="ark-btn ark-btn-secondary" style="flex:1; min-height:42px;" onclick="openModal('pppoe_logs')">📜 Ver Logs PPPoE ao Vivo</button>
                        <button type="button" class="ark-btn ark-btn-secondary" style="flex:1; min-height:42px;" onclick="openModal('wan_optimizations')">⚙️ Otimizações Avançadas</button>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="saveWanModal('${name}')">💾 Salvar e Aplicar Conexão</button>
                </div>
            `;
        }

        function toggleWanProtoFields(proto) {
            const pppoeBox = document.getElementById('wan_pppoe_fields');
            const pppoeProfileBar = document.getElementById('wan_pppoe_profile_bar');
            const dhcpBox = document.getElementById('wan_dhcp_fields');
            const staticBox = document.getElementById('wan_static_fields');
            if (pppoeBox) pppoeBox.style.display = (proto === 'pppoe') ? 'block' : 'none';
            if (pppoeProfileBar) pppoeProfileBar.style.display = (proto === 'pppoe') ? 'block' : 'none';
            if (dhcpBox) dhcpBox.style.display = (proto === 'dhcp') ? 'block' : 'none';
            if (staticBox) staticBox.style.display = (proto === 'static') ? 'block' : 'none';
        }
"""

old_wan_func_pattern = r"function openWanModal\(name\) \{.*?\n        function toggleWanProtoFields\(proto\) \{.*?\n        \}"
content = re.sub(old_wan_func_pattern, new_open_wan_modal.strip(), content, flags=re.DOTALL)

# 6. Ensure ALL modal headers have maximize button ⛶ alongside close button ✕
# Replace pattern <div class="modal-header"><h3>(.*?)</h3><button class="modal-close-btn" onclick="closeModal()">✕</button></div>
def replace_modal_header(m):
    title = m.group(1)
    return f"""<div class="modal-header">
                    <h3>{title}</h3>
                    <div class="modal-header-actions">
                        <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                        <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                    </div>
                </div>"""

content = re.sub(
    r'<div class="modal-header">\s*<h3>(.*?)</h3>\s*<button class="modal-close-btn" onclick="closeModal\(\)">✕</button>\s*</div>',
    replace_modal_header,
    content
)

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ generate_v2_staging_dashboard.py atualizado com sucesso!")
print("✅ Modais responsivos agora possuem rolagem fluida, rodapé fixo, botão de tela cheia (⛶) e todas as informações da WAN!")
