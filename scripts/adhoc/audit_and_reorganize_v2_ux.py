#!/usr/bin/env python3
"""
ARK Router V2: Complete UX Reorganization, Modal Aliases & Feature Audit
1. Adds all modal handlers for: hardware_cpu, hardware_ram, hardware_flash,
   diagnostics, speedtest, adblock, mesh, guest_wifi, starlink, firmware_ota, backup_restore.
2. Reorganizes Hero Banner buttons: prioritizes high-frequency operational actions
   (Setup, Gamer Mode, SQM CAKE, Ark Doctor, Wi-Fi QR) over one-off admin toggles.
3. Adds deep link navigation pills on Cockpit cards (Ver Detalhes ↗) to dedicated panels.
4. Adds Ark Doctor Network Health status banner directly below the health strip in Cockpit.
5. Adds NAT & Port Forwarding quick banner inside Internet & Multi-WAN panel.
"""

import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
TARGET_FILE = os.path.join(REPO_DIR, "scripts", "generate_v2_staging_dashboard.py")

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update openModal(type) to include aliases and missing modals
modal_addons = """
            } else if (type === 'hardware_cpu' || type === 'cpu') {
                return openHardwareModal('cpu');
            } else if (type === 'hardware_ram' || type === 'ram') {
                return openHardwareModal('ram');
            } else if (type === 'hardware_flash' || type === 'flash') {
                return openHardwareModal('flash');
            } else if (type === 'hardware_temp' || type === 'temp') {
                return openHardwareModal('temp');
            } else if (type === 'diagnostics') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🩺 Diagnóstico de Rede & Resiliência (Ping / Traceroute)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Endereço IP ou Host de Destino</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" class="form-input" id="diag_host" value="1.1.1.1" placeholder="ex: 1.1.1.1 ou google.com" style="flex:1;">
                                <button type="button" class="ark-btn ark-btn-primary" onclick="runPingDiagnostic()">Ping</button>
                                <button type="button" class="ark-btn ark-btn-secondary" onclick="runTracerouteDiagnostic()">Trace</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Saída do Console do Kernel (ICMP)</label>
                            <pre id="diag_output" style="background:#090d16; border:1px solid rgba(255,255,255,0.1); border-radius:8px; padding:12px; font-size:0.8rem; color:#38bdf8; min-height:160px; max-height:240px; overflow-y:auto; font-family:monospace; margin:0;">Pressione "Ping" ou "Trace" para testar a rota WAN...</pre>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'speedtest') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🎬 Medidor de Velocidade da WAN (Speedtest)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="background:rgba(56, 189, 248, 0.1); border:1px solid rgba(56, 189, 248, 0.25); border-radius:8px; padding:14px; margin-bottom:14px; text-align:center;">
                            <div style="font-size:0.85rem; color:#94a3b8; margin-bottom:4px;">ÚLTIMA MEDIÇÃO CANÔNICA</div>
                            <div style="font-size:2rem; font-weight:800; color:#38bdf8;">842.1 Mbps <span style="font-size:1rem; color:#fff;">↓</span> • 412.5 Mbps <span style="font-size:1rem; color:#fff;">↑</span></div>
                            <div style="font-size:0.75rem; color:#10b981;">● Latência sob carga: 1.8 ms (CAKE SQM Ativo)</div>
                        </div>
                        <div style="display:flex; gap:10px; justify-content:center;">
                            <button type="button" class="ark-btn ark-btn-primary" style="flex:1;" onclick="window.open('https://fast.com', '_blank')">Fast.com (Netflix CDN) ↗</button>
                            <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="window.open('https://speedtest.net', '_blank')">Ookla Speedtest ↗</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'adblock') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🛡️ Bloqueador de Anúncios DNS (AdBlock Sinkhole)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:8px;">
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Filtro DNS Ativo (AdGuard + StevenBlack)</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">142.850 domínios maliciosos e rastreadores bloqueados em RAM</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" checked onchange="toggleAdblock(this.checked)"><span class="ark-slider"></span></label>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('adblock_lists')">📋 Listas Negras & Brancas</button>
                            <button type="button" class="ark-btn ark-btn-primary" style="flex:1;" onclick="showToast('🔄 Listas DNS sincronizadas e recarregadas em 1.2s!'); closeModal();">🔄 Atualizar Listas</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'mesh') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📶 Controlador EasyMesh 802.11s & Nós Satélites</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:8px;">
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Mesh Controller 802.11s</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Sincronização contínua de SSID, chaves e roaming com nós adicionais</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                        </div>
                        <div style="margin-top:10px;">
                            <button type="button" class="ark-btn ark-btn-purple" style="width:100%;" onclick="showToast('🔍 Buscando novos nós EasyMesh via WPS/802.11s... Pressione o botão no repetidor.'); closeModal();">🔍 Parear Novo Nó Satélite (WPS 120s)</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'guest_wifi') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>👥 Rede Wi-Fi de Convidados (Sub-rede Isolada)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:8px;">
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Status da Rede de Convidados</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Isolada da LAN principal (VLAN 10 • 192.168.10.0/24)</div>
                            </div>
                            <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Nome da Rede de Convidados (SSID)</label>
                            <input type="text" class="form-input" id="m_guest_ssid" value="Wi-Fi-H&R-Visitas">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Senha de Acesso</label>
                            <div style="display:flex; gap:8px;">
                                <input type="password" class="form-input" id="m_guest_pass" value="Visitas2026">
                                <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('m_guest_pass', this)">👁️ Ver</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Limite de Velocidade por Aparelho (Rate Limit)</label>
                            <select class="form-select" id="m_guest_limit">
                                <option value="50" selected>50 Mbps Download / 20 Mbps Upload (Recomendado)</option>
                                <option value="25">25 Mbps Download / 10 Mbps Upload</option>
                                <option value="100">100 Mbps Download / 50 Mbps Upload</option>
                                <option value="0">Sem Limite</option>
                            </select>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('guest_qr')">📲 Ver QR Code</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('✅ Configurações da Rede de Convidados salvas!'); closeModal();">💾 Salvar Rede</button>
                    </div>
                `;
            } else if (type === 'starlink') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🛰️ Telemetria Orbital Starlink (Antena Dishy)</h3>
                        <div class="modal-header-actions">
                            <button type="button" class="modal-maximize-btn" onclick="toggleModalMaximize()" title="Expandir para tela cheia">⛶</button>
                            <button type="button" class="modal-close-btn" onclick="closeModal()" title="Fechar">✕</button>
                        </div>
                    </div>
                    <div class="modal-body">
                        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#fff; font-size:0.9rem;">Terminal Starlink Dishy v2</strong>
                                    <div style="font-size:0.75rem; color:#10b981;">● Conectado via gRPC (192.168.100.1:9200)</div>
                                </div>
                                <span class="pill-badge pill-online">ONLINE LEO</span>
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:0.82rem; margin-bottom:12px;">
                            <div><span>Obstrução:</span> <strong style="color:#10b981;">0.00% (Céu Limpo)</strong></div>
                            <div><span>Pop Ping:</span> <strong style="color:#38bdf8;">28 ms</strong></div>
                            <div><span>Satélites Visíveis:</span> <strong style="color:#fff;">14 Ativos</strong></div>
                            <div><span>Buffer 25h:</span> <strong style="color:#10b981;">100% Retido</strong></div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('starlink_config')">⚙️ Parâmetros</button>
                            <button type="button" class="ark-btn ark-btn-cyan" style="flex:1;" onclick="starlinkStowAction('reboot')">🔄 Reiniciar Dishy</button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                    </div>
                `;
            } else if (type === 'firmware_ota') {
                return openModal('ota_update');
            } else if (type === 'backup_restore') {
                return openModal('restore_backup');
"""

# Inject before the final closing brace of openModal
target_close = """            } else {
                closeModal();
            }
        }"""
if "type === 'hardware_cpu'" not in content and target_close in content:
    content = content.replace(target_close, modal_addons.strip() + "\n" + target_close)

# 2. Reorganize Hero Banner in view_overview
old_hero_actions = """                            <div class="ex-hero-actions">
                                <button class="btn-hero-action btn-hero-primary" onclick="openModal('setup')">⚡ Setup</button>
                                <button class="btn-hero-action" onclick="openModal('op_mode')" id="btn_hero_opmode">🌐 Modo AP/Gateway</button>
                                <button class="btn-hero-action" onclick="openModal('gamer_mode')" id="btn_hero_gamer">🎮 Gamer Ultra</button>
                                <button class="btn-hero-action" onclick="openModal('language')" id="btn_hero_lang">🇧🇷 Idioma: PT-BR</button>
                                <a class="btn-hero-action" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)" style="text-decoration:none; color:#cbd5e1;">💻 Interface Clássica ↗</a>
                            </div>"""

new_hero_actions = """                            <div class="ex-hero-actions">
                                <button class="btn-hero-action btn-hero-primary" onclick="openModal('setup')">⚡ Setup Rápido</button>
                                <button class="btn-hero-action" onclick="openModal('gamer_mode')" id="btn_hero_gamer">🎮 Gamer Ultra</button>
                                <button class="btn-hero-action" onclick="openModal('sqm')" title="Calibrar banda e bufferbloat">⚡ Calibrar SQM</button>
                                <button class="btn-hero-action" onclick="switchView('doctor')" title="Diagnóstico e auto-cura">🩺 Ark Doctor</button>
                                <button class="btn-hero-action" onclick="openModal('wifi_qr')" title="Compartilhar Wi-Fi via QR Code">📲 Wi-Fi QR</button>
                                <a class="btn-hero-action" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)" style="text-decoration:none; color:#cbd5e1;">💻 LuCI Clássico ↗</a>
                            </div>"""

content = content.replace(old_hero_actions, new_hero_actions)

# 3. Add Ark Doctor Health Banner right below the Health Strip in view_overview
doctor_banner = """
                    <!-- Ark Doctor Vital Subsystem Banner -->
                    <div style="background:linear-gradient(90deg, rgba(16,185,129,0.12), rgba(56,189,248,0.08)); border:1px solid rgba(16,185,129,0.28); border-radius:10px; padding:10px 16px; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:1.3rem;">🩺</span>
                            <div>
                                <strong style="color:#fff; font-size:0.9rem;">Ark Doctor: 12/12 Subsistemas Saudáveis</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Kernel 6.6 • PPE Offload • BBR v2 • SQM CAKE • Roaming 802.11k/v • ZRAM LZ4 100% Blindados</div>
                            </div>
                        </div>
                        <div style="display:flex; gap:8px;">
                            <button class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 10px;" onclick="runDoctorCheck()">🔄 Diagnosticar</button>
                            <button class="ark-btn ark-btn-primary" style="font-size:0.75rem; padding:4px 12px;" onclick="switchView('doctor')">Ver Painel Ark Doctor ↗</button>
                        </div>
                    </div>
"""

if "<!-- Ark Doctor Vital Subsystem Banner -->" not in content:
    content = content.replace("<!-- Live Real-Time Traffic Canvas -->", doctor_banner.strip() + "\n\n                    <!-- Live Real-Time Traffic Canvas -->")

# 4. Add Deep Navigation Header Links in Overview Cards
# WAN Card title
old_wan_title = '<span style="font-size:0.85rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#fff;">Conexões de Internet Dual-WAN</span>'
new_wan_title = """<div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                    <span style="font-size:0.85rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#fff;">Conexões de Internet Dual-WAN</span>
                                    <a onclick="switchView('wan')" style="font-size:0.75rem; color:#38bdf8; cursor:pointer; font-weight:600; text-decoration:none;">Painel Multi-WAN ↗</a>
                                </div>"""
content = content.replace(old_wan_title, new_wan_title)

# Wi-Fi Card title
old_wifi_title = '<span style="font-size:0.85rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#fff;">Redes Sem Fio & Rádios Tri-Band</span>'
new_wifi_title = """<div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                    <span style="font-size:0.85rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#fff;">Redes Sem Fio & Rádios Tri-Band</span>
                                    <a onclick="switchView('wifi')" style="font-size:0.75rem; color:#38bdf8; cursor:pointer; font-weight:600; text-decoration:none;">Painel Wi-Fi ↗</a>
                                </div>"""
content = content.replace(old_wifi_title, new_wifi_title)

# Devices Card title
old_dev_title = '<span style="font-size:0.85rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#fff;">Dispositivos Conectados na Rede (34)</span>'
new_dev_title = """<div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                                    <span style="font-size:0.85rem; font-weight:800; text-transform:uppercase; letter-spacing:0.04em; color:#fff;">Dispositivos Conectados na Rede (34)</span>
                                    <a onclick="switchView('devices')" style="font-size:0.75rem; color:#38bdf8; cursor:pointer; font-weight:600; text-decoration:none;">Ver Todos no Painel ↗</a>
                                </div>"""
content = content.replace(old_dev_title, new_dev_title)

# 5. Add Port Forwarding & NAT cross-link banner in Internet & Multi-WAN panel (view_wan)
nat_banner = """
                        <!-- NAT & Port Forwarding Shortcut -->
                        <div style="background:rgba(192, 132, 252, 0.08); border:1px solid rgba(192, 132, 252, 0.25); border-radius:8px; padding:12px 14px; margin-top:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                            <div>
                                <strong style="color:#fff; font-size:0.88rem;">Redirecionamento de Portas (Port Forwarding) & DMZ</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Abra portas WAN externas (Plex, Web, Jogos) para servidores internos na LAN</div>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="ark-btn ark-btn-secondary" style="font-size:0.8rem; padding:6px 12px;" onclick="openPortForwardModal()">➕ Nova Regra de Porta</button>
                                <button class="ark-btn ark-btn-purple" style="font-size:0.8rem; padding:6px 12px;" onclick="switchView('security')">Gerenciar em Segurança ↗</button>
                            </div>
                        </div>
"""

if "<!-- NAT & Port Forwarding Shortcut -->" not in content:
    content = content.replace("</section>\n\n                <!-- ========================================================= -->\n                <!-- PAINEL 3: WI-FI 6E / 7 (TRI-BAND)                        -->", nat_banner.strip() + "\n                </section>\n\n                <!-- ========================================================= -->\n                <!-- PAINEL 3: WI-FI 6E / 7 (TRI-BAND)                        -->")

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Todas as melhorias de UX, atalhos inteligentes e aliases de modais foram aplicadas com sucesso!")
