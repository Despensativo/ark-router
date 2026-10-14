#!/usr/bin/env python3
"""
ARK Router V2: Injects all 9 missing interactive modals and openHardwareModal handler
into generate_v2_staging_dashboard.py so that 100% of buttons in the Hero, Cockpit,
Health Strip and dedicated views are completely functional and clickable.
"""

import os
import re

GEN_SCRIPT = "/Volumes/--400GB--/FEITOS COM IA/Ark-Router/GitHub/luci-app-ark-router/scripts/generate_v2_staging_dashboard.py"

with open(GEN_SCRIPT, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add IDs to Hero buttons for dynamic visual updates
old_hero_actions = """                            <div class="ex-hero-actions">
                                <button class="btn-hero-action btn-hero-primary" onclick="openModal('setup')">⚡ Setup</button>
                                <button class="btn-hero-action" onclick="openModal('op_mode')">🌐 Modo AP/Gateway</button>
                                <button class="btn-hero-action" onclick="openModal('gamer_mode')">🎮 Gamer Ultra</button>
                                <button class="btn-hero-action" onclick="openModal('language')">🇧🇷 Idioma: PT-BR</button>
                                <a class="btn-hero-action" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)" style="text-decoration:none; color:#cbd5e1;">💻 Interface Clássica ↗</a>
                            </div>"""

new_hero_actions = """                            <div class="ex-hero-actions">
                                <button class="btn-hero-action btn-hero-primary" onclick="openModal('setup')">⚡ Setup</button>
                                <button class="btn-hero-action" onclick="openModal('op_mode')" id="btn_hero_opmode">🌐 Modo AP/Gateway</button>
                                <button class="btn-hero-action" onclick="openModal('gamer_mode')" id="btn_hero_gamer">🎮 Gamer Ultra</button>
                                <button class="btn-hero-action" onclick="openModal('language')" id="btn_hero_lang">🇧🇷 Idioma: PT-BR</button>
                                <a class="btn-hero-action" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)" style="text-decoration:none; color:#cbd5e1;">💻 Interface Clássica ↗</a>
                            </div>"""

if old_hero_actions in code:
    code = code.replace(old_hero_actions, new_hero_actions)
    print("✓ Hero action buttons updated with dynamic IDs.")

# 2. Add all missing modal branches before "} else {" in openModal(type)
target_modal_else = "            } else {\n                closeModal();\n            }\n        }"

new_modal_branches = """            } else if (type === 'op_mode') {
                const currentOp = window.currentOperationMode || 'gateway';
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🌐 Modo de Operação do Roteador</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Perfil de Topologia de Rede</label>
                            <select class="form-select" id="m_op_mode" onchange="onOpModeChange(this.value)">
                                <option value="gateway" ${currentOp === 'gateway' ? 'selected' : ''}>🌐 Roteador Gateway Principal (NAT + Firewall + Dual-WAN + DHCP)</option>
                                <option value="ap" ${currentOp === 'ap' ? 'selected' : ''}>📡 Ponto de Acesso / AP Secundário (Ponte Transparente sem Duplo NAT)</option>
                                <option value="mesh" ${currentOp === 'mesh' ? 'selected' : ''}>📶 Nó Repetidor Mesh 802.11s (Extensor Wi-Fi Sincronizado)</option>
                            </select>
                        </div>
                        <div id="ap_extra_settings" style="display:${currentOp === 'ap' ? 'block' : 'none'}; background:rgba(0,0,0,0.25); border-radius:8px; padding:12px; margin-bottom:12px;">
                            <div class="form-group">
                                <label class="form-label">Atribuição de Endereço IP do AP na LAN</label>
                                <select class="form-select" id="m_ap_ip_mode">
                                    <option value="dhcp" selected>Cliente DHCP Automático (Recomendado)</option>
                                    <option value="static">IP Estático Fixo (192.168.1.2)</option>
                                </select>
                            </div>
                            <div style="font-size:0.8rem; color:#f59e0b; line-height:1.4;">
                                ⚠️ No modo Ponto de Acesso (AP), o servidor DHCP local e o Firewall NAT são desativados para evitar Duplo NAT (Double NAT). As portas WAN passam a funcionar como portas LAN adicionais.
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Isolamento de Clientes Wi-Fi (AP Isolation)</label>
                            <select class="form-select" id="m_ap_isolate">
                                <option value="0" selected>Desativado (Dispositivos na rede enxergam uns aos outros, AirPlay/Chromecast OK)</option>
                                <option value="1">Ativado (Isolamento total entre aparelhos sem fio - Máxima Privacidade)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveOpModeModal()">💾 Aplicar Modo de Operação</button>
                    </div>
                `;
            } else if (type === 'gamer_mode') {
                const isGamer = window.isGamerActive || false;
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3 style="color:#f43f5e;">🎮 Modo Gamer Ultra — Otimização de Baixa Latência</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size:0.85rem; color:#cbd5e1; line-height:1.5; margin-bottom:14px;">
                            O Modo Gamer programa o escalonador SQM CAKE com marcação <strong>DSCP Expedited Forwarding (EF / CS4)</strong>, priorizando pacotes de jogos multiplayer (PUBG, Valorant, Warzone, CS2, FIFA) antes de qualquer tráfego pesado de streaming ou download.
                        </p>
                        <div class="form-group">
                            <label class="form-label">Status do Perfil Gamer</label>
                            <select class="form-select" id="m_gamer_status">
                                <option value="1" ${isGamer ? 'selected' : ''}>🎮 ATIVADO — Modo Gamer Ultra (0.2 ms Latência de Fila)</option>
                                <option value="0" ${!isGamer ? 'selected' : ''}>Desativado — Modo Padrão Equilibrado</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Host ou Console Principal Prioritário</label>
                            <select class="form-select" id="m_gamer_host">
                                <option value="ps5" selected>PlayStation-5-Pro (192.168.1.189 - Cabo LAN 2.5G)</option>
                                <option value="xbox">Xbox-Series-X (192.168.1.188 - Wi-Fi 5G)</option>
                                <option value="dell">Notebook-Dell-XPS (192.168.1.144 - PC Gamer)</option>
                                <option value="switch">Nintendo-Switch-OLED (192.168.1.192)</option>
                                <option value="all">Priorizar Qualquer Aparelho com Tráfego UDP de Jogos</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Compensação de Jitter e Bufferbloat</label>
                            <select class="form-select" id="m_gamer_queue">
                                <option value="diffserv4" selected>CAKE DiffServ4 (Voz/Jogos > Vídeo > Best Effort > Background)</option>
                                <option value="fq_codel">FQ-CoDel com ECN Ativo</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Reserva Mínima de Banda para Jogos</label>
                            <select class="form-select" id="m_gamer_bw">
                                <option value="30" selected>30% de Banda Exclusiva Garantida (Zero Oscilação)</option>
                                <option value="50">50% de Banda Exclusiva (Competitivo / Torneios)</option>
                                <option value="15">15% de Banda (Uso Moderado)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-danger" onclick="saveGamerModeModal()">💾 Salvar Perfil Gamer</button>
                    </div>
                `;
            } else if (type === 'language') {
                const currentLang = window.currentLang || 'pt-br';
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🌐 Selecionar Idioma da Interface (Language)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Idioma da Interface LuCI e ARK OS</label>
                            <select class="form-select" id="m_lang_sel">
                                <option value="pt-br" ${currentLang === 'pt-br' ? 'selected' : ''}>🇧🇷 Português do Brasil (PT-BR) — Padrão Oficial</option>
                                <option value="en" ${currentLang === 'en' ? 'selected' : ''}>🇺🇸 English (EN) — International Standard</option>
                                <option value="es" ${currentLang === 'es' ? 'selected' : ''}>🇪🇸 Español (ES) — Neutro</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fuso Horário Regional (Timezone)</label>
                            <select class="form-select" id="m_lang_tz">
                                <option value="America/Sao_Paulo" selected>América / São Paulo (Horário de Brasília - UTC-3)</option>
                                <option value="America/Manaus">América / Manaus (Amazonas - UTC-4)</option>
                                <option value="America/New_York">América / New York (Eastern Time - UTC-5)</option>
                                <option value="Europe/Madrid">Europa / Madrid (UTC+1)</option>
                            </select>
                        </div>
                        <p style="font-size:0.8rem; color:#94a3b8; line-height:1.4;">
                            O ARK Router compila os catálogos GNU gettext (.po / .mo) diretamente na ROM. A troca de idioma não reinicia os serviços de internet.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveLanguageModal()">💾 Salvar Preferência</button>
                    </div>
                `;
            } else if (type === 'clock') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>⏰ Configuração de Relógio, Fuso & Servidores NTP</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Servidor NTP de Sincronização Principal</label>
                            <select class="form-select" id="m_ntp_server">
                                <option value="pool.ntp.br" selected>pool.ntp.br (a.ntp.br / b.ntp.br - Observatório Nacional NIC.br)</option>
                                <option value="time.cloudflare.com">time.cloudflare.com (Cloudflare NTS Anycast SP)</option>
                                <option value="time.google.com">time.google.com (Google Public Time)</option>
                                <option value="time.apple.com">time.apple.com (Apple Network Time)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Fuso Horário do Roteador (Timezone)</label>
                            <select class="form-select" id="m_clock_tz">
                                <option value="America/Sao_Paulo" selected>América / São Paulo (UTC-3 - Brasília)</option>
                                <option value="America/Noronha">Fernando de Noronha (UTC-2)</option>
                                <option value="America/Cuiaba">Cuiabá / Campo Grande (UTC-4)</option>
                                <option value="America/Rio_Branco">Rio Branco (Acre - UTC-5)</option>
                            </select>
                        </div>
                        <div style="background:rgba(0,0,0,0.25); border-radius:8px; padding:12px; margin-bottom:12px;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <div>
                                    <strong style="color:#fff; font-size:0.88rem;">Preservador Fake RTC (/etc/fake-rtc)</strong>
                                    <div style="font-size:0.75rem; color:#94a3b8;">Salva timestamp a cada 60s para evitar que o relógio volte para 1970 em quedas de energia</div>
                                </div>
                                <span class="pill-badge pill-online">ATIVO & PROTEGIDO</span>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="saveClockModal()">💾 Sincronizar Agora</button>
                    </div>
                `;
            } else if (type === 'starlink_config') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🛰️ Configurações da Antena Starlink Dishy</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Modo Térmico de Degelo de Neve (Snow Melt)</label>
                            <select class="form-select" id="m_sl_snow">
                                <option value="auto" selected>Automático (Detecta obstrução de sinal e aquece a 40°C)</option>
                                <option value="forced">Aquecimento Forçado Contínuo (45 Watts)</option>
                                <option value="off">Desligado / Standby Econômico (20 Watts)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Modo Bypass (Roteador ARK Gerencia a Rede)</label>
                            <select class="form-select" id="m_sl_bypass">
                                <option value="active" selected>Bypass Ativado (Roteador Starlink em modo Bridge transparente)</option>
                                <option value="disabled">Desativado (Roteador Starlink com Wi-Fi ativo)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Horário de Sleep / Modo Silencioso</label>
                            <select class="form-select" id="m_sl_sleep">
                                <option value="prog" selected>Programado: Desligar rádio das 02:00 às 06:00 (Economia de Bateria)</option>
                                <option value="none">Sempre Ligado (Operação 24 Horas)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">IP de Telemetria gRPC da Antena</label>
                            <select class="form-select">
                                <option selected>192.168.100.1:9200 (Porta Padrão Starlink Dishy)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-cyan" onclick="saveStarlinkModal()">💾 Aplicar na Antena Dishy</button>
                    </div>
                `;
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
                `;
            } else if (type === 'add_vpn') {
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
                                <option value="vpn.fra.arkrouter.net:51820">vpn.fra.arkrouter.net:51820 (Frankfurt - Latência 180 ms)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Endereço IP da Interface Local (/24)</label>
                            <input type="text" class="form-input" id="m_vpn_local_ip" value="10.14.0.3/24">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Chave Pública do Servidor (PublicKey)</label>
                            <input type="text" class="form-input" id="m_vpn_pubkey" value="tZ9q+bX81mN2kLm9...f9aL3=">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Redes Permitidas (AllowedIPs)</label>
                            <select class="form-select" id="m_vpn_allowed">
                                <option value="0.0.0.0/0" selected>0.0.0.0/0, ::/0 (Roteamento Integral de Toda a Conexão)</option>
                                <option value="10.0.0.0/8">10.0.0.0/8 (Apenas Subredes Privadas da Empresa)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-purple" onclick="saveVpnModal()">💾 Salvar e Conectar Túnel</button>
                    </div>
                `;
            } else if (type === 'pppoe_logs') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📜 Registro da Sessão PPPoE (Daemon pppd)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="background:#090d16; border:1px solid #1e293b; border-radius:8px; padding:14px; font-family:monospace; font-size:0.8rem; line-height:1.5; color:#cbd5e1; height:200px; overflow-y:auto;">
                            <div><span style="color:#64748b;">[03:40:12]</span> pppd[1842]: Plugin rp-pppoe.so loaded.</div>
                            <div><span style="color:#64748b;">[03:40:12]</span> pppd[1842]: PPPoE discovery phase initiated on eth0.10...</div>
                            <div><span style="color:#64748b;">[03:40:13]</span> pppd[1842]: PADS packet received from AC: SPO-GPON-BRAS-04</div>
                            <div><span style="color:#64748b;">[03:40:13]</span> pppd[1842]: PPP session 0x4f12 established.</div>
                            <div><span style="color:#64748b;">[03:40:14]</span> pppd[1842]: PAP authentication succeeded for user vivo@cliente</div>
                            <div><span style="color:#64748b;">[03:40:14]</span> pppd[1842]: local  IP address 187.54.21.90 (MTU 1492)</div>
                            <div><span style="color:#64748b;">[03:40:14]</span> pppd[1842]: remote IP address 187.54.21.1</div>
                            <div><span style="color:#64748b;">[03:40:14]</span> pppd[1842]: primary   DNS address 1.1.1.1</div>
                            <div><span style="color:#64748b;">[03:40:15]</span> netifd: Interface 'wan1' is now up (IPv4 + IPv6-PD /56)</div>
                            <div><span style="color:#10b981;">[03:40:15]</span> mwan3: Interface wan1 marked ONLINE. Traffic route established.</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('🔄 Renovando sessão PPPoE...'); closeModal();">🔄 Reconectar PPPoE</button>
                    </div>
                `;
            } else if (type === 'restore_backup') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>⬆ Restaurar Cópia de Segurança do Roteador</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <p style="font-size:0.85rem; color:#cbd5e1; line-height:1.5;">
                            Envie o arquivo compactado <code>.tar.gz</code> com as configurações previamente exportadas. O sistema validará a integridade do arquivo antes de aplicar.
                        </p>
                        <div class="form-group" style="margin-top:12px;">
                            <label class="form-label">Arquivo de Backup (.tar.gz)</label>
                            <input type="file" class="form-input" id="backup_file_input" accept=".tar.gz,.tgz">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Modo de Restauração</label>
                            <select class="form-select" id="restore_policy">
                                <option value="keep" selected>Preservar Senhas de Rede e Chaves SSH se ausentes no arquivo</option>
                                <option value="full">Substituição Completa (Sobrescrever 100% dos Parâmetros)</option>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('✅ Arquivo de backup validado e restaurado com sucesso! Daemons recarregados.'); closeModal();">💾 Restaurar e Reiniciar Serviços</button>
                    </div>
                `;
            } else {
                closeModal();
            }
        }

        // Action Handlers for Modals
        function saveOpModeModal() {
            const mode = document.getElementById('m_op_mode').value;
            window.currentOperationMode = mode;
            const heroBtn = document.getElementById('btn_hero_opmode');
            const heroEyebrow = document.querySelector('.ex-hero-eyebrow');
            if (mode === 'ap') {
                if (heroBtn) heroBtn.textContent = '📡 Modo: AP Bridge';
                if (heroEyebrow) heroEyebrow.textContent = '📡 ROTEADOR SECUNDÁRIO • PONTO DE ACESSO & SWITCH';
                showToast('📡 Modo Ponto de Acesso (AP) aplicado com sucesso! NAT e DHCP desativados para evitar duplo NAT.');
            } else if (mode === 'mesh') {
                if (heroBtn) heroBtn.textContent = '📶 Modo: Mesh Node';
                if (heroEyebrow) heroEyebrow.textContent = '📶 NÓ DE REDE MESH 802.11s • SINCRONIZADO';
                showToast('📶 Modo Mesh Node 802.11s ativado! Roaming 802.11k/v/r ativo.');
            } else {
                if (heroBtn) heroBtn.textContent = '🌐 Modo AP/Gateway';
                if (heroEyebrow) heroEyebrow.textContent = 'COCKPIT NOC • ACER PREDATOR W6X (WI-FI 6E)';
                showToast('🌐 Modo Gateway Principal aplicado! Roteador, Firewall e DHCP 100% ativos.');
            }
            closeModal();
        }

        function onOpModeChange(val) {
            const el = document.getElementById('ap_extra_settings');
            if (el) el.style.display = val === 'ap' ? 'block' : 'none';
        }

        function saveGamerModeModal() {
            const active = document.getElementById('m_gamer_status').value === '1';
            window.isGamerActive = active;
            const hero = document.querySelector('.ex-hero');
            const heroBtn = document.getElementById('btn_hero_gamer');
            const heroEyebrow = document.querySelector('.ex-hero-eyebrow');

            if (active) {
                if (hero) hero.classList.add('ex-hero-gamer');
                if (heroBtn) {
                    heroBtn.innerHTML = '🎮 GAMER ATIVO';
                    heroBtn.style.background = 'linear-gradient(120deg, rgba(239, 68, 68, 0.35), rgba(168, 85, 247, 0.35))';
                    heroBtn.style.borderColor = '#f43f5e';
                    heroBtn.style.color = '#fff';
                }
                if (heroEyebrow) heroEyebrow.textContent = '🎮 MODO GAMER ULTRA • BAIXA LATÊNCIA & CAKE PRIORITÁRIO';
                showToast('🎮 Modo Gamer Ultra ATIVADO com sucesso! Fila DSCP Expedited Forwarding em vigor.');
            } else {
                if (hero) hero.classList.remove('ex-hero-gamer');
                if (heroBtn) {
                    heroBtn.innerHTML = '🎮 Gamer Ultra';
                    heroBtn.style.background = '';
                    heroBtn.style.borderColor = '';
                    heroBtn.style.color = '';
                }
                if (heroEyebrow) heroEyebrow.textContent = 'COCKPIT NOC • ACER PREDATOR W6X (WI-FI 6E)';
                showToast('Modo Gamer desativado. Sistema retornou ao perfil equilibrado.');
            }
            closeModal();
        }

        function saveLanguageModal() {
            const lang = document.getElementById('m_lang_sel').value;
            window.currentLang = lang;
            const heroBtn = document.getElementById('btn_hero_lang');
            if (lang === 'en') {
                if (heroBtn) heroBtn.textContent = '🇺🇸 Language: EN';
                showToast('🇺🇸 English language profile loaded successfully!');
            } else if (lang === 'es') {
                if (heroBtn) heroBtn.textContent = '🇪🇸 Idioma: ES';
                showToast('🇪🇸 ¡Idioma Español aplicado con éxito!');
            } else {
                if (heroBtn) heroBtn.textContent = '🇧🇷 Idioma: PT-BR';
                showToast('🇧🇷 Idioma Português do Brasil aplicado com sucesso!');
            }
            closeModal();
        }

        function saveClockModal() {
            const server = document.getElementById('m_ntp_server').value;
            showToast(`⏰ Relógio sincronizado com ${server}! Kernel NTP atualizado com sucesso.`);
            closeModal();
        }

        function saveStarlinkModal() {
            showToast('🛰️ Parâmetros térmicos e de Bypass enviados para a antena Starlink Dishy!');
            closeModal();
        }

        function saveNewDeviceModal() {
            const name = document.getElementById('m_new_dev_name').value || 'Novo-Dispositivo';
            const mac = document.getElementById('m_new_dev_mac').value || 'aa:bb:cc:dd:ee:ff';
            const ip = document.getElementById('m_new_dev_ip').value;
            const prio = document.getElementById('m_new_dev_prio').value;

            DEVICES.push({
                id: DEVICES.length + 1,
                name: name,
                ip: ip,
                mac: mac,
                band: '5',
                rssi: -55,
                speed: '866 Mbps',
                total: '0 MB',
                type: 'laptop',
                prio: prio
            });
            renderDevicesTable();
            showToast(`📱 Dispositivo "${name}" cadastrado com IP estático ${ip}!`);
            closeModal();
        }

        function saveVpnModal() {
            const iface = document.getElementById('m_vpn_iface').value;
            const endpoint = document.getElementById('m_vpn_endpoint').value;
            showToast(`🔒 Túnel WireGuard ${iface} conectado com sucesso ao endpoint ${endpoint}!`);
            closeModal();
        }

        // Hardware Modal Handler (Health Strip)
        function openHardwareModal(metric) {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');
            if (metric === 'cpu') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>⚡ Telemetria de CPU & Processamento</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="font-size:0.9rem; color:#fff; font-weight:700; margin-bottom:10px;">
                            SoC: MediaTek Filogic 830 (MT7986A 4x ARM Cortex-A53 @ 2.0 GHz)
                        </div>
                        <div style="display:flex; flex-direction:column; gap:8px;">
                            <div><div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;"><span>Núcleo 0 (Sistemas & IRQs)</span><strong>4%</strong></div><div class="health-bar-bg"><div class="health-bar-fill" style="width:4%; background:#10b981;"></div></div></div>
                            <div><div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;"><span>Núcleo 1 (Filas CAKE SQM)</span><strong>14%</strong></div><div class="health-bar-bg"><div class="health-bar-fill" style="width:14%; background:#10b981;"></div></div></div>
                            <div><div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;"><span>Núcleo 2 (Wi-Fi 7 WED Driver)</span><strong>8%</strong></div><div class="health-bar-bg"><div class="health-bar-fill" style="width:8%; background:#10b981;"></div></div></div>
                            <div><div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:2px;"><span>Núcleo 3 (Túnel WireGuard)</span><strong>11%</strong></div><div class="health-bar-bg"><div class="health-bar-fill" style="width:11%; background:#10b981;"></div></div></div>
                        </div>
                        <div style="margin-top:14px; background:rgba(0,0,0,0.25); border-radius:8px; padding:10px; font-size:0.8rem; color:#94a3b8;">
                            • Aceleração PPE (Packet Processing Engine): <strong style="color:#10b981;">Ativa</strong> (0% carga de CPU em NAT)<br>
                            • Escalonamento CAKE Multi-Queue: <strong style="color:#38bdf8;">Ativo</strong>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
            } else if (metric === 'temp') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🌡️ Sensores Térmicos do Hardware</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                <div style="font-size:0.75rem; color:#94a3b8;">SoC MediaTek MT7986A</div>
                                <div style="font-size:1.6rem; font-weight:800; color:#10b981; margin:4px 0;">46°C</div>
                                <div style="font-size:0.72rem; color:#10b981;">● Normal (Limite 105°C)</div>
                            </div>
                            <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                <div style="font-size:0.75rem; color:#94a3b8;">Rádio Wi-Fi 6 GHz (MT7976C)</div>
                                <div style="font-size:1.6rem; font-weight:800; color:#38bdf8; margin:4px 0;">48°C</div>
                                <div style="font-size:0.72rem; color:#38bdf8;">● Dissipador Ativo</div>
                            </div>
                            <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                <div style="font-size:0.75rem; color:#94a3b8;">Rádio Wi-Fi 5 GHz</div>
                                <div style="font-size:1.6rem; font-weight:800; color:#10b981; margin:4px 0;">44°C</div>
                                <div style="font-size:0.72rem; color:#10b981;">● Temperatura Estável</div>
                            </div>
                            <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                <div style="font-size:0.75rem; color:#94a3b8;">Rádio Wi-Fi 2.4 GHz</div>
                                <div style="font-size:1.6rem; font-weight:800; color:#10b981; margin:4px 0;">41°C</div>
                                <div style="font-size:0.72rem; color:#10b981;">● Temperatura Estável</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
            } else if (metric === 'ram') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>▦ Diagnóstico de Memória RAM & ZRAM</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="font-size:1.4rem; font-weight:800; color:#3b82f6; margin-bottom:10px;">
                            188 MB Usados / 512 MB Total (36%)
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
                            <div style="display:flex; justify-content:space-between;"><span>Memória Livre Real:</span><strong>324 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Buffers do Kernel:</span><strong>34 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Cache de Disco / Arquivos:</span><strong>112 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Compactação ZRAM (Algoritmo LZ4):</span><strong style="color:#10b981;">Ativo (64 MB)</strong></div>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
            } else {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>▣ Partições & Armazenamento Flash (NAND)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="font-size:1.4rem; font-weight:800; color:#8b5cf6; margin-bottom:10px;">
                            84.8 MB Livres / 128 MB Total
                        </div>
                        <div style="display:flex; flex-direction:column; gap:6px; font-size:0.85rem;">
                            <div style="display:flex; justify-content:space-between;"><span>Imagem do Sistema (SquashFS - ReadOnly):</span><strong>43.2 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Partição de Configurações (Overlayfs UBIFS):</span><strong>18.4 MB</strong></div>
                            <div style="display:flex; justify-content:space-between;"><span>Espaço Livre para Pacotes e Daemons:</span><strong style="color:#10b981;">84.8 MB (66%)</strong></div>
                        </div>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
            }
        }"""

if target_modal_else in code:
    code = code.replace(target_modal_else, new_modal_branches)
    print("✓ All 9 missing modal branches and openHardwareModal injected successfully.")
else:
    print("! Error: target_modal_else not found.")

with open(GEN_SCRIPT, "w", encoding="utf-8") as f:
    f.write(code)

print("🎉 Arquivo generate_v2_staging_dashboard.py atualizado com todos os modais interativos!")
