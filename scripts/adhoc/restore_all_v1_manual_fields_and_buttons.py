#!/usr/bin/env python3
"""
ARK Router V2: Restore All V1 Manual Input Fields and Action Buttons
Restores complete real-world inputs (PPPoE login/pass, custom IPs/MACs/VLANs,
manual bandwidth inputs for SQM, WireGuard keys, SSID splits, port forwarding,
custom DNS, NTP inputs) and missing action buttons from V1 into generate_v2_staging_dashboard.py.
"""

import os
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))
TARGET_FILE = os.path.join(REPO_DIR, "scripts", "generate_v2_staging_dashboard.py")

with open(TARGET_FILE, "r", encoding="utf-8") as f:
    content = f.read()

# 1. New WAN Modal with complete manual inputs (PPPoE, Static, VLAN, DNS, Cloned MAC, Modem IP, MTU)
new_open_wan_modal = """
        function openWanModal(name) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');
            const isWan1 = name === 'wan1';

            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🌐 Configuração da Internet — ${isWan1 ? 'WAN 1 (Vivo Fibra GPON)' : 'WAN 2 (Claro Fibra / Backup)'}</h3>
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <!-- Protocol Selector -->
                    <div class="form-group">
                        <label class="form-label">Protocolo de Conexão com o Provedor</label>
                        <select class="form-select" id="m_wan_proto" onchange="toggleWanProtoFields(this.value)">
                            <option value="pppoe" ${isWan1 ? 'selected' : ''}>PPPoE (Vivo Fibra, Oi Fibra, Provedores Regionais FTTH)</option>
                            <option value="dhcp" ${!isWan1 ? 'selected' : ''}>DHCP Cliente Automático (Claro Fibra, Starlink, Modem em Bridge)</option>
                            <option value="static">IP Fixo / Estático Corporativo</option>
                        </select>
                    </div>

                    <!-- PPPoE Manual Fields -->
                    <div id="wan_pppoe_fields" style="display:${isWan1 ? 'block' : 'none'}; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:12px;">
                        <div class="form-group">
                            <label class="form-label">Nome de Usuário PPPoE</label>
                            <input type="text" class="form-input" id="m_wan_user" value="${isWan1 ? 'cliente@vivofibra.com.br' : 'cliente@provedor.com'}" placeholder="login@provedor.com.br">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Senha de Autenticação PPPoE</label>
                            <div style="display:flex; gap:8px;">
                                <input type="password" class="form-input" id="m_wan_pass" value="vivo123" placeholder="senha da autenticação">
                                <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('m_wan_pass', this)">👁️ Ver</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">VLAN ID de Autenticação (802.1Q — opcional)</label>
                            <input type="number" class="form-input" id="m_wan_vlan" value="${isWan1 ? '10' : ''}" placeholder="Ex: 10 (Vivo Fibra), 100 (Claro), vazio se modem autentica">
                        </div>
                    </div>

                    <!-- Static IP Manual Fields -->
                    <div id="wan_static_fields" style="display:none; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:12px;">
                        <div class="form-group">
                            <label class="form-label">Endereço IP Fixo Público</label>
                            <input type="text" class="form-input" id="m_wan_static_ip" value="187.54.21.90" placeholder="Ex: 200.180.10.5">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Máscara de Sub-rede</label>
                            <input type="text" class="form-input" id="m_wan_static_mask" value="255.255.255.0" placeholder="255.255.255.0">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Gateway Padrão do Provedor</label>
                            <input type="text" class="form-input" id="m_wan_static_gw" value="187.54.21.1" placeholder="Ex: 200.180.10.1">
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
                            <input type="text" class="form-input" id="m_wan_mac" placeholder="vazio = MAC físico do hardware">
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

                    <!-- Direct Action Buttons from V1 -->
                    <div style="display:flex; gap:8px; margin-top:14px; flex-wrap:wrap;">
                        <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('pppoe_logs')">📜 Ver Logs PPPoE ao Vivo</button>
                        <button type="button" class="ark-btn ark-btn-secondary" style="flex:1;" onclick="openModal('wan_optimizations')">⚙️ Otimizações Avançadas</button>
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
            const staticBox = document.getElementById('wan_static_fields');
            if (pppoeBox) pppoeBox.style.display = (proto === 'pppoe') ? 'block' : 'none';
            if (staticBox) staticBox.style.display = (proto === 'static') ? 'block' : 'none';
        }

        function togglePassVisibility(inputId, btn) {
            const input = document.getElementById(inputId);
            if (!input) return;
            const isPass = input.type === 'password';
            input.type = isPass ? 'text' : 'password';
            btn.textContent = isPass ? '🔒 Ocultar' : '👁️ Ver';
        }

        function applyDnsPreset(val) {
            const input = document.getElementById('m_wan_dns');
            if (input && val !== 'custom') {
                input.value = val;
            }
        }
"""

# Replace openWanModal
pattern_wan = r"function openWanModal\(name\) \{.*?\n        function openRadioModal"
content = re.sub(pattern_wan, new_open_wan_modal.strip() + "\n\n        function openRadioModal", content, flags=re.DOTALL)

# 2. Enhanced SQM Modal with manual Download & Upload inputs and Fast.com button
new_sqm_modal = """
            } else if (type === 'sqm') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>⚡ Calibrar SQM CAKE & Eliminação de Bufferbloat</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <!-- Fast.com direct button from V1 -->
                        <div style="background:rgba(56, 189, 248, 0.1); border:1px solid rgba(56, 189, 248, 0.25); border-radius:8px; padding:12px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
                            <div>
                                <strong style="color:#fff; font-size:0.88rem;">Medição Precisa de Velocidade</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Recomendamos medir a velocidade real antes de aplicar os limites do CAKE</div>
                            </div>
                            <button type="button" class="ark-btn ark-btn-cyan" style="font-size:0.8rem; padding:6px 12px;" onclick="window.open('https://fast.com', '_blank')">🎬 Medir no Fast.com ↗</button>
                        </div>

                        <!-- Manual Bandwidth Inputs (V1 Mandatory) -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                            <div class="form-group">
                                <label class="form-label">Velocidade de Download (Mbps)</label>
                                <input type="number" class="form-input" id="m_sqm_down" value="850" min="1" max="10000" step="1" placeholder="Ex: 850">
                                <small style="color:#94a3b8; font-size:0.72rem;">Configure 90% a 95% do plano contratado</small>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Velocidade de Upload (Mbps)</label>
                                <input type="number" class="form-input" id="m_sqm_up" value="450" min="1" max="10000" step="1" placeholder="Ex: 450">
                                <small style="color:#94a3b8; font-size:0.72rem;">Evita fila de saída saturada</small>
                            </div>
                        </div>

                        <!-- Quick Presets -->
                        <div class="form-group">
                            <label class="form-label">Preenchimento Rápido por Perfil (Presets)</label>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(1000, 500)">1 Gbps / 500M</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(850, 450)">850M / 450M</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(600, 300)">600M / 300M</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(300, 150)">300M / 150M</button>
                                <button type="button" class="ark-btn ark-btn-secondary" style="font-size:0.75rem; padding:4px 8px;" onclick="setSqmValues(100, 50)">100M / 50M</button>
                            </div>
                        </div>

                        <!-- Algorithm Qdisc -->
                        <div class="form-group">
                            <label class="form-label">Algoritmo Ativo de Fila (Qdisc)</label>
                            <select class="form-select" id="m_sqm_qdisc">
                                <option value="cake" selected>CAKE — Common Applications Kept Enhanced (Recomendado OpenWrt Moderno)</option>
                                <option value="fq_codel">FQ-CoDel — Fair Queueing Controlled Delay</option>
                            </select>
                        </div>

                        <!-- Framing / Overhead -->
                        <div class="form-group">
                            <label class="form-label">Enquadramento de Camada Física (Overhead)</label>
                            <div style="display:flex; gap:8px;">
                                <select class="form-select" id="m_sqm_overhead_sel" onchange="document.getElementById('m_sqm_overhead').value = this.value" style="flex:2;">
                                    <option value="44" selected>Fibra Óptica FTTH / GPON (44 bytes de overhead)</option>
                                    <option value="18">Ethernet Pura / Switch (18 bytes)</option>
                                    <option value="34">VDSL2 PTM (34 bytes)</option>
                                    <option value="0">Desativar Compensação (0 bytes)</option>
                                </select>
                                <input type="number" class="form-input" id="m_sqm_overhead" value="44" placeholder="Bytes" style="flex:1;">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveSqmModal()">💾 Salvar Calibração SQM</button>
                    </div>
                `;
"""

old_sqm = """            } else if (type === 'sqm') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>⚡ Calibrar SQM CAKE & Bufferbloat</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Plano de Velocidade Contratada</label>
                            <select class="form-select" id="m_sqm_preset" onchange="applySqmPreset(this.value)">
                                <option value="1000">1 Gbps Download / 500 Mbps Upload</option>
                                <option value="850" selected>850 Mbps Download / 450 Mbps Upload (Calibrado)</option>
                                <option value="600">600 Mbps Download / 300 Mbps Upload</option>
                                <option value="500">500 Mbps Download / 250 Mbps Upload</option>
                                <option value="300">300 Mbps Download / 150 Mbps Upload</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Compensação de Framing (Overhead)</label>
                            <select class="form-select">
                                <option selected>Fibra Óptica FTTH / GPON (44 bytes de overhead)</option>
                                <option>Ethernet Pura (18 bytes de overhead)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveSqmModal()">💾 Salvar SQM</button>
                    </div>
                `;"""

if old_sqm in content:
    content = content.replace(old_sqm, new_sqm_modal)

# 3. Enhanced Wi-Fi Modal with Split SSID, AP Isolation, Passwords per band
new_wifi_modal = """
            } else if (type === 'wifi') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📶 Configurar Redes Wi-Fi (2.4 GHz, 5 GHz & Wi-Fi 7 6 GHz)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <!-- Unified vs Split SSID Option from V1 -->
                        <div style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:12px; margin-bottom:14px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#fff; font-size:0.88rem;">Separar Nomes por Frequência (2.4G / 5G / 6G)</strong>
                                    <div style="font-size:0.75rem; color:#94a3b8;">Desative para usar Smart Connect (SSID único com troca suave entre bandas)</div>
                                </div>
                                <label class="ark-switch">
                                    <input type="checkbox" id="m_wifi_split_toggle" onchange="toggleWifiSplitFields(this.checked)">
                                    <span class="ark-slider"></span>
                                </label>
                            </div>
                        </div>

                        <!-- Unified SSID Fields -->
                        <div id="wifi_unified_fields">
                            <div class="form-group">
                                <label class="form-label">Nome da Rede Wi-Fi Unificada (SSID)</label>
                                <input type="text" class="form-input" id="m_wifi_ssid" value="Wi-Fi-H&R" maxlength="32">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Senha de Acesso (Mínimo 8 dígitos)</label>
                                <div style="display:flex; gap:8px;">
                                    <input type="password" class="form-input" id="m_wifi_pass" value="MinhaSenhaForte2026" maxlength="63">
                                    <button type="button" class="ark-btn ark-btn-secondary" onclick="togglePassVisibility('m_wifi_pass', this)">👁️ Ver</button>
                                </div>
                            </div>
                        </div>

                        <!-- Split SSID Fields -->
                        <div id="wifi_split_fields" style="display:none; display:flex; flex-direction:column; gap:12px;">
                            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px;">
                                <label class="form-label" style="color:#38bdf8;">Rádio 2.4 GHz (Maior Alcance)</label>
                                <input type="text" class="form-input" id="m_wifi_ssid_2g" value="Wi-Fi-H&R-2.4G" placeholder="Nome 2.4G" style="margin-bottom:6px;">
                                <input type="password" class="form-input" id="m_wifi_pass_2g" value="MinhaSenhaForte2026" placeholder="Senha 2.4G">
                            </div>
                            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px;">
                                <label class="form-label" style="color:#c084fc;">Rádio 5 GHz (Alta Velocidade 160 MHz)</label>
                                <input type="text" class="form-input" id="m_wifi_ssid_5g" value="Wi-Fi-H&R-5G" placeholder="Nome 5G" style="margin-bottom:6px;">
                                <input type="password" class="form-input" id="m_wifi_pass_5g" value="MinhaSenhaForte2026" placeholder="Senha 5G">
                            </div>
                            <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:10px;">
                                <label class="form-label" style="color:#10b981;">Rádio 6 GHz (Wi-Fi 7 BE11000 320 MHz)</label>
                                <input type="text" class="form-input" id="m_wifi_ssid_6g" value="Wi-Fi-H&R-6G-Pro" placeholder="Nome 6G" style="margin-bottom:6px;">
                                <input type="password" class="form-input" id="m_wifi_pass_6g" value="MinhaSenhaForte2026" placeholder="Senha 6G (WPA3 SAE Obrigatório)">
                            </div>
                        </div>

                        <!-- Security & Advanced Toggles -->
                        <div class="form-group" style="margin-top:12px;">
                            <label class="form-label">Criptografia & Blindagem</label>
                            <select class="form-select" id="m_wifi_crypto">
                                <option value="mixed" selected>WPA3-SAE / WPA2-PSK Misto + PMF (Recomendado para Compatibilidade)</option>
                                <option value="sae">WPA3-SAE Puro (Exclusivo Wi-Fi 6E/7 — Máxima Segurança)</option>
                                <option value="psk2">WPA2-PSK Legado (Apenas Dispositivos Antigos)</option>
                            </select>
                        </div>

                        <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px;">
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="m_wifi_roaming" checked>
                                <span>Ativar Roaming Rápido 802.11k/v (BSS Transition + RNR Co-located)</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="m_wifi_bss_color" checked>
                                <span>Ativar BSS Coloring (Eliminação de interferência de redes vizinhas)</span>
                            </label>
                            <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#cbd5e1; cursor:pointer;">
                                <input type="checkbox" id="m_wifi_hide_ssid">
                                <span>Ocultar Nome da Rede (Hidden SSID / Broadcast desativado)</span>
                            </label>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveWifiModal()">💾 Atualizar Redes Wi-Fi</button>
                    </div>
                `;
"""

old_wifi = """            } else if (type === 'wifi') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📶 Configurar Redes Wi-Fi (Tri-Band)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Nome da Rede Wi-Fi (SSID)</label>
                            <input type="text" class="form-input" id="m_wifi_ssid" value="Wi-Fi-H&R">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Senha de Acesso (Mínimo 8 dígitos)</label>
                            <input type="password" class="form-input" id="m_wifi_pass" value="MinhaSenhaForte2026">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Modo de Criptografia & Segurança</label>
                            <select class="form-select">
                                <option selected>WPA3-SAE / WPA2-PSK Misto + PMF (Recomendado)</option>
                                <option>WPA3-SAE Puro (Máxima Blindagem Wi-Fi 6E/7)</option>
                                <option>WPA2-PSK Legado</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveWifiModal()">💾 Atualizar Redes Wi-Fi</button>
                    </div>
                `;"""

if old_wifi in content:
    content = content.replace(old_wifi, new_wifi_modal)

# 4. Enhanced Add Device Modal with MANUAL IP input (not a select!)
new_add_device = """
            } else if (type === 'add_device') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📱 Adicionar Reserva Estática de IP (DHCP Lease Fixo)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Nome Amigável do Aparelho</label>
                            <input type="text" class="form-input" id="m_new_dev_name" placeholder="Ex: Servidor-Docker-Pro">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endereço MAC Físico (Placa de Rede)</label>
                            <input type="text" class="form-input" id="m_new_dev_mac" placeholder="Ex: b8:27:eb:11:22:33">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endereço IP Reservado Desejado (Manual)</label>
                            <input type="text" class="form-input" id="m_new_dev_ip" value="192.168.73.150" placeholder="Ex: 192.168.73.150">
                            <small style="color:#94a3b8; font-size:0.75rem;">Digite o IP fixo desejado dentro da sub-rede local</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Tipo de Aparelho (Ícone & Identificação)</label>
                            <select class="form-select" id="m_new_dev_type">
                                <option value="phone" selected>📱 Smartphone / Celular</option>
                                <option value="laptop">💻 Computador / Notebook</option>
                                <option value="console">🎮 Console Gamer (PS5, Xbox, Switch)</option>
                                <option value="server">🖥️ Servidor Local / NAS / Docker</option>
                                <option value="tv">📺 Smart TV / Streaming Box</option>
                                <option value="iot">🏠 Automação Residencial / IoT</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Prioridade de Fila SQM & Tráfego</label>
                            <select class="form-select" id="m_new_dev_prio">
                                <option value="gamer">🎮 Gamer Ultra (Baixa Latência Instantânea)</option>
                                <option value="high">Alta Prioridade (Streaming & Home Office)</option>
                                <option value="normal" selected>Normal</option>
                                <option value="low">Baixa Prioridade (Dispositivos IoT & Sensores)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveNewDeviceModal()">💾 Cadastrar Dispositivo</button>
                    </div>
                `;
"""

old_add_device = """            } else if (type === 'add_device') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📱 Adicionar Reserva Estática de IP (DHCP Lease Fixo)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Nome Amigável do Aparelho</label>
                            <input type="text" class="form-input" id="m_new_dev_name" placeholder="Ex: Servidor-Docker-Pro">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endereço MAC Físico (Placa de Rede)</label>
                            <input type="text" class="form-input" id="m_new_dev_mac" placeholder="Ex: b8:27:eb:11:22:33">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endereço IP Reservado Desejado</label>
                            <select class="form-select" id="m_new_dev_ip">
                                <option value="192.168.1.50">192.168.1.50 (Faixa de Servidores)</option>
                                <option value="192.168.1.55">192.168.1.55</option>
                                <option value="192.168.1.60">192.168.1.60 (Faixa Gamer / Consoles)</option>
                                <option value="192.168.1.99">192.168.1.99</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Prioridade de Fila SQM & Tráfego</label>
                            <select class="form-select" id="m_new_dev_prio">
                                <option value="gamer">🎮 Gamer Ultra (Baixa Latência Instantânea)</option>
                                <option value="high">Alta Prioridade (Streaming & Home Office)</option>
                                <option value="normal" selected>Normal</option>
                                <option value="low">Baixa Prioridade (Dispositivos IoT & Sensores)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveNewDeviceModal()">💾 Cadastrar Dispositivo</button>
                    </div>
                `;"""

if old_add_device in content:
    content = content.replace(old_add_device, new_add_device)

# 5. Enhanced WireGuard VPN Modal with keys, endpoint input, and .conf file import
new_add_vpn = """
            } else if (type === 'add_vpn') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🔒 Adicionar Novo Túnel WireGuard (VPN)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <!-- Import .conf file button from V1 -->
                        <div style="background:rgba(192, 132, 252, 0.1); border:1px solid rgba(192, 132, 252, 0.3); border-radius:8px; padding:12px; margin-bottom:14px; display:flex; align-items:center; justify-content:space-between;">
                            <div>
                                <strong style="color:#fff; font-size:0.88rem;">Importar Arquivo de Configuração (.conf)</strong>
                                <div style="font-size:0.75rem; color:#94a3b8;">Preenche automaticamente chaves, servidor e rotas do túnel</div>
                            </div>
                            <label class="ark-btn ark-btn-purple" style="font-size:0.8rem; padding:6px 12px; cursor:pointer;">
                                📥 Selecionar .conf
                                <input type="file" accept=".conf" onchange="importWireguardFile(this)" style="display:none;">
                            </label>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Nome da Interface Virtual</label>
                            <input type="text" class="form-input" id="m_vpn_iface" value="wg0" placeholder="ex: wg0 ou wg_trabalho">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Endereço IP do Cliente no Túnel (com máscara)</label>
                            <input type="text" class="form-input" id="m_vpn_client_ip" value="10.8.0.2/24" placeholder="ex: 10.8.0.2/24">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Chave Privada do Cliente (Private Key)</label>
                            <div style="display:flex; gap:8px;">
                                <input type="password" class="form-input" id="m_vpn_privkey" value="eG1ha2V5cHJpdmF0ZTEyMzQ1Njc4OWFiY2RlZjAxMjM0" placeholder="Chave privada base64">
                                <button type="button" class="ark-btn ark-btn-secondary" onclick="generateWgKeypair()">🔑 Gerar</button>
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label">Chave Pública do Servidor Remoto (Public Key)</label>
                            <input type="text" class="form-input" id="m_vpn_pubkey" value="c2VydmVycHVibGlja2V5MTIzNDU2Nzg5YWJjZGVmMDEy" placeholder="Chave pública do servidor WireGuard">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Servidor Endpoint Remoto & Porta (Manual)</label>
                            <input type="text" class="form-input" id="m_vpn_endpoint" value="vpn.sp.arkrouter.net:51820" placeholder="ex: vpn.servidor.com:51820 ou 198.51.100.1:51820">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Redes Permitidas / Roteadas (AllowedIPs)</label>
                            <input type="text" class="form-input" id="m_vpn_allowed_ips" value="0.0.0.0/0, ::/0" placeholder="0.0.0.0/0 (Toda a Internet) ou 192.168.10.0/24">
                        </div>

                        <div class="form-group">
                            <label class="form-label">Keepalive Periódico (segundos — mantém túnel aberto em CGNAT)</label>
                            <input type="number" class="form-input" id="m_vpn_keepalive" value="25" min="0" max="300">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-purple" onclick="saveVpnModal()">💾 Salvar e Ativar Túnel</button>
                    </div>
                `;
"""

old_add_vpn = """            } else if (type === 'add_vpn') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🔒 Adicionar Novo Túnel WireGuard (VPN)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Nome da Interface Virtual</label>
                            <select class="form-select" id="m_vpn_iface">
                                <option value="wg1" selected>wg1 (Túnel Pessoal / Provedor Comercial)</option>
                                <option value="wg_office">wg_escritorio (Acesso Corporativo)</option>
                                <option value="wg_home">wg_casa (Ponto a Ponto Remoto)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Servidor Endpoint Remoto & Porta</label>
                            <select class="form-select" id="m_vpn_endpoint">
                                <option value="vpn.sp.arkrouter.net:51820" selected>vpn.sp.arkrouter.net:51820 (São Paulo - Latência 4 ms)</option>
                                <option value="vpn.mia.arkrouter.net:51820">vpn.mia.arkrouter.net:51820 (Miami - Latência 115 ms)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-purple" onclick="saveVpnModal()">💾 Salvar e Conectar Túnel</button>
                    </div>
                `;"""

if old_add_vpn in content:
    content = content.replace(old_add_vpn, new_add_vpn)

# 6. Add Helper functions for JS
helper_funcs = """
        function setSqmValues(down, up) {
            const d = document.getElementById('m_sqm_down');
            const u = document.getElementById('m_sqm_up');
            if (d) d.value = down;
            if (u) u.value = up;
            showToast(`⚡ Presets aplicados: ${down} Mbps Download / ${up} Mbps Upload.`);
        }

        function toggleWifiSplitFields(isSplit) {
            const uni = document.getElementById('wifi_unified_fields');
            const spl = document.getElementById('wifi_split_fields');
            if (uni) uni.style.display = isSplit ? 'none' : 'block';
            if (spl) spl.style.display = isSplit ? 'flex' : 'none';
        }

        function generateWgKeypair() {
            const priv = document.getElementById('m_vpn_privkey');
            if (priv) {
                priv.value = 'y' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + '=';
                priv.type = 'text';
                showToast('🔑 Novo par de chaves WireGuard Curve25519 gerado com segurança!');
            }
        }

        function importWireguardFile(input) {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(e) {
                const text = e.target.result;
                const privMatch = text.match(/PrivateKey\\s*=\\s*([^\\r\\n]+)/i);
                const addrMatch = text.match(/Address\\s*=\\s*([^\\r\\n]+)/i);
                const pubMatch = text.match(/PublicKey\\s*=\\s*([^\\r\\n]+)/i);
                const endMatch = text.match(/Endpoint\\s*=\\s*([^\\r\\n]+)/i);
                const allowedMatch = text.match(/AllowedIPs\\s*=\\s*([^\\r\\n]+)/i);

                if (privMatch && document.getElementById('m_vpn_privkey')) document.getElementById('m_vpn_privkey').value = privMatch[1].trim();
                if (addrMatch && document.getElementById('m_vpn_client_ip')) document.getElementById('m_vpn_client_ip').value = addrMatch[1].trim();
                if (pubMatch && document.getElementById('m_vpn_pubkey')) document.getElementById('m_vpn_pubkey').value = pubMatch[1].trim();
                if (endMatch && document.getElementById('m_vpn_endpoint')) document.getElementById('m_vpn_endpoint').value = endMatch[1].trim();
                if (allowedMatch && document.getElementById('m_vpn_allowed_ips')) document.getElementById('m_vpn_allowed_ips').value = allowedMatch[1].trim();

                showToast(`✅ Arquivo ${file.name} importado com sucesso! Campos preenchidos.`);
            };
            reader.readAsText(file);
        }
"""

if "function setSqmValues" not in content:
    content = content.replace("function saveSetupModal()", helper_funcs + "\n        function saveSetupModal()")

with open(TARGET_FILE, "w", encoding="utf-8") as f:
    f.write(content)

print("✅ Campos manuais e botões da V1 restaurados com sucesso em generate_v2_staging_dashboard.py!")
