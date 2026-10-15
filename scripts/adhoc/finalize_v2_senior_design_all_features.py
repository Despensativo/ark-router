#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ARK Router V2: Finalize Master Senior Design & Incorporate 100% of V1 Features.
Surgically enhances generate_v2_staging_dashboard.py to include:
1. Ethernet Physical Switch Ports Status Bar (2.5G/1G with LEDs) in Cockpit & Overview (T-036 / ARK-LAN-002)
2. Cockpit Quick Indicators Strip (AdBlock, Starlink, WireGuard, CAKE, RAM 0ms)
3. IPv6 & NPTv6 RFC 6296 Configuration with ULA & Relay in Multi-WAN (ARK-IPV6-001/002/003, ARK-WAN-011)
4. ONU Bridge Web GUI Access Helper (ARK-WAN-008) & Baby Jumbo Frames MTU 1508 (ARK-WAN-003)
5. Auto-WAN dynamic port conversion (ARK-WAN-004)
6. Guest Wi-Fi (Rede de Visitantes) with AP Isolation and Rate Limit (ARK-WIFI-001, ARK-QOS-001)
7. EasyMesh 802.11s Topology & Satellite Discovery (ARK-WIFI-007)
8. Hardware DNS Cache 0ms RAM selector (ARK-PERF-006)
9. Flush Stale DHCP Leases (ARK-LAN-005) & Parental Control MAC blocking (ARK-FW-002)
10. Hardware Flow Offloading (MediaTek PPE), TCP Turbo (BBR) & ZRAM LZ4 (ARK-HW-001, ARK-WAN-009, ARK-HW-004)
11. AdBlock & DNS Sinkhole with Whitelist/Blacklist management (ARK-BLOCK-001, ARK-BLOCK-002)
12. UPnP / NAT-PMP active dynamic table with individual delete (ARK-FW-005)
13. DMZ Host Zone with discrete device select (ARK-FW-003)
14. ZeroTier SD-WAN (ARK-VPN-006) & Speedify Multi-Path Bonding (ARK-VPN-007)
15. Starlink Dishy Stow/Unstow/Reboot buttons & 12-wedge obstacle visual (ARK-STAR-001 a 004)
16. RAM Purge (ram-purge) & Flash NAND cleanup (ARK-HW-004, ARK-HW-005)
17. OTA Firmware Update Checker modal (ARK-SYS-005)
18. Guest QR Code modal & AdBlock modal
"""

import os
import sys
import re

GEN_SCRIPT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "generate_v2_staging_dashboard.py"))

print(f"Reading {GEN_SCRIPT}...")
with open(GEN_SCRIPT, "r", encoding="utf-8") as f:
    content = f.read()

# -------------------------------------------------------------------------
# 1. ADD CSS STYLES FOR SWITCH PORTS AND PILL BARS
# -------------------------------------------------------------------------
css_needle = "        /* Content Area & Modular Panels (SPA Switcher) */"
new_css = """        /* Physical Switch Port Status Panel (T-036 / ARK-LAN-002) */
        .switch-ports-panel {
            background: var(--ark-surface-2);
            border: 1px solid var(--ark-border);
            border-radius: var(--ark-radius-md);
            padding: 16px;
            margin-top: 18px;
        }
        .switch-ports-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 10px;
            margin-top: 12px;
        }
        .switch-port-box {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: var(--ark-radius-sm);
            padding: 10px 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            position: relative;
            transition: all 0.2s ease;
        }
        .switch-port-box:hover {
            border-color: var(--ark-border-hover);
            transform: translateY(-2px);
        }
        .switch-port-box.port-up {
            border-top: 3px solid #10b981;
        }
        .switch-port-box.port-down {
            border-top: 3px solid #64748b;
            opacity: 0.65;
        }
        .switch-port-icon {
            width: 44px;
            height: 38px;
            background: #090e1a;
            border: 2px solid #334155;
            border-radius: 6px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 6px 0;
            position: relative;
        }
        .switch-port-leds {
            display: flex;
            gap: 10px;
            margin-bottom: 2px;
        }
        .switch-led {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #475569;
        }
        .switch-led.led-green {
            background: #10b981;
            box-shadow: 0 0 6px #10b981;
        }
        .switch-led.led-amber {
            background: #f59e0b;
            box-shadow: 0 0 6px #f59e0b;
        }
        .switch-port-jack {
            width: 22px;
            height: 12px;
            background: #1e293b;
            border-radius: 2px 2px 4px 4px;
            border: 1px solid #475569;
        }
        .switch-port-name {
            font-size: 0.78rem;
            font-weight: 800;
            color: #fff;
        }
        .switch-port-speed {
            font-size: 0.72rem;
            font-weight: 700;
            margin-top: 2px;
        }
        .switch-port-target {
            font-size: 0.68rem;
            color: #94a3b8;
            margin-top: 2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }

        /* Quick Cockpit Indicators Bar */
        .cockpit-pills-bar {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 14px;
        }
        .cockpit-pill-item {
            background: rgba(0, 0, 0, 0.35);
            border: 1px solid var(--ark-border);
            border-radius: 20px;
            padding: 6px 12px;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.78rem;
            color: #cbd5e1;
            cursor: pointer;
            transition: all 0.2s ease;
        }
        .cockpit-pill-item:hover {
            border-color: #38bdf8;
            background: rgba(56, 189, 248, 0.12);
            color: #fff;
            transform: translateY(-1px);
        }

""" + css_needle

if "switch-ports-panel" not in content and css_needle in content:
    content = content.replace(css_needle, new_css, 1)
    print("✓ Added CSS styles for switch ports and cockpit pill bars.")

# -------------------------------------------------------------------------
# 2. ENHANCE VIEW_OVERVIEW WITH PHYSICAL SWITCH PORTS & PILLS BAR
# -------------------------------------------------------------------------
overview_needle = """                    <!-- Cockpit Panoramic Summary Cards (Click to navigate to dedicated views) -->
                    <div class="cockpit-summary-grid">"""

overview_switch_html = """                    <!-- Quick Vital Indicators Strip (1-Click Access) -->
                    <div class="cockpit-pills-bar">
                        <div class="cockpit-pill-item" onclick="switchView('security')">
                            <span>🛡️</span> <strong>AdBlock:</strong> 148k Bloqueados (34.2%)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('doctor')">
                            <span>🛰️</span> <strong>Starlink LEO:</strong> ONLINE (28ms • 0% Obstrução)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('security')">
                            <span>🔒</span> <strong>WireGuard:</strong> wg0 Ativo (SP 4ms)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('optimization')">
                            <span>⚡</span> <strong>CAKE SQM:</strong> Nota A+ (0.4ms Jitter)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('devices')">
                            <span>🧠</span> <strong>Cache DNS:</strong> RAM 0.0ms (99.4% Hit)
                        </div>
                        <div class="cockpit-pill-item" onclick="switchView('optimization')">
                            <span>🚀</span> <strong>Aceleração PPE:</strong> Flow Offload Ativo
                        </div>
                    </div>

                    <!-- Status das Portas Físicas de Switch Ethernet (T-036 / ARK-LAN-002) -->
                    <div class="switch-ports-panel">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                            <div>
                                <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0;">🔌 Portas Físicas de Switch Ethernet & Conexões de Rede</h3>
                                <span style="font-size:0.75rem; color:#94a3b8;">Status de enlace físico, duplex e velocidade negociada em hardware</span>
                            </div>
                            <span class="pill-badge pill-online">4 / 6 PORTAS ATIVAS</span>
                        </div>

                        <div class="switch-ports-grid">
                            <!-- WAN 1: 2.5 Gbps -->
                            <div class="switch-port-box port-up" title="Porta WAN 1 (2.5 Gbps / Full-Duplex) - Uplink Vivo Fibra GPON">
                                <span class="switch-port-name" style="color:#38bdf8;">WAN 1 (2.5G)</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led led-green" title="Link UP 2.5G"></div>
                                        <div class="switch-led led-green" title="Atividade RX/TX"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#10b981;">2.5 Gbps</span>
                                <span class="switch-port-target">Vivo Fibra GPON</span>
                            </div>

                            <!-- WAN 2: 1.0 Gbps -->
                            <div class="switch-port-box port-up" title="Porta WAN 2 (1.0 Gbps / Full-Duplex) - Uplink Claro Fibra / Cabo">
                                <span class="switch-port-name" style="color:#06b6d4;">WAN 2 (1.0G)</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led led-green" title="Link UP 1.0G"></div>
                                        <div class="switch-led led-green" title="Atividade RX/TX"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#10b981;">1.0 Gbps</span>
                                <span class="switch-port-target">Claro Fibra / Cabo</span>
                            </div>

                            <!-- LAN 1: 1.0 Gbps -->
                            <div class="switch-port-box port-up" title="Porta LAN 1 (1.0 Gbps / Full-Duplex) - PC Gamer Desktop">
                                <span class="switch-port-name">LAN 1</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led led-green" title="Link UP 1.0G"></div>
                                        <div class="switch-led led-green" title="Atividade RX/TX"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#10b981;">1.0 Gbps</span>
                                <span class="switch-port-target">PC-Gamer-Desktop</span>
                            </div>

                            <!-- LAN 2: Down -->
                            <div class="switch-port-box port-down" title="Porta LAN 2 (Desconectada / Cabo Livre)">
                                <span class="switch-port-name" style="color:#94a3b8;">LAN 2</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led"></div>
                                        <div class="switch-led"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#64748b;">DOWN</span>
                                <span class="switch-port-target">Livre</span>
                            </div>

                            <!-- LAN 3: 1.0 Gbps -->
                            <div class="switch-port-box port-up" title="Porta LAN 3 (1.0 Gbps / Full-Duplex) - Smart TV Sala">
                                <span class="switch-port-name">LAN 3</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led led-green" title="Link UP 1.0G"></div>
                                        <div class="switch-led led-green" title="Atividade RX/TX"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#10b981;">1.0 Gbps</span>
                                <span class="switch-port-target">Smart-TV-4K</span>
                            </div>

                            <!-- LAN 4: Down -->
                            <div class="switch-port-box port-down" title="Porta LAN 4 (Desconectada / Cabo Livre)">
                                <span class="switch-port-name" style="color:#94a3b8;">LAN 4</span>
                                <div class="switch-port-icon">
                                    <div class="switch-port-leds">
                                        <div class="switch-led"></div>
                                        <div class="switch-led"></div>
                                    </div>
                                    <div class="switch-port-jack"></div>
                                </div>
                                <span class="switch-port-speed" style="color:#64748b;">DOWN</span>
                                <span class="switch-port-target">Livre</span>
                            </div>
                        </div>
                    </div>

""" + overview_needle

if "switch-ports-panel" not in content and overview_needle in content:
    content = content.replace(overview_needle, overview_switch_html, 1)
    print("✓ Added Physical Switch Ports & Quick Pills Bar to view_overview.")

# -------------------------------------------------------------------------
# 3. ENHANCE VIEW_WAN WITH IPV6, NPTV6, ONU BRIDGE ACCESS & AUTO-WAN
# -------------------------------------------------------------------------
wan_end_needle = """                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 3: WI-FI 6E & WI-FI 7 DEDICADO                     -->"""

wan_extra_html = """                        </div>

                        <!-- LuCI Native: Configuração Global IPv6 & NPTv6 RFC 6296 (ARK-IPV6-001/002/003, ARK-WAN-011) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">🌐 Configuração Global IPv6 & NPTv6 (RFC 6296)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Nativo Dual-Stack com Delegação de Prefixo /56 e proteção exclusiva contra vazamentos</span>
                                </div>
                                <button class="ark-btn ark-btn-primary" onclick="saveIpv6Settings()">
                                    💾 Salvar Configurações IPv6
                                </button>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:12px;">
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Modo Operacional IPv6</label>
                                    <select class="form-select" id="m_ipv6_mode">
                                        <option value="dual_stack" selected>Nativo Dual-Stack (DHCPv6-PD /56 com SLAAC)</option>
                                        <option value="nptv6">NPTv6 Inteligente (RFC 6296 com Prefixo ULA Dinâmico)</option>
                                        <option value="relay">Modo Relay / Híbrido (NDP Proxy para ONUs sem PD)</option>
                                        <option value="disabled">Desativado (Modo IPv4 Estrito)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Endereço IPv6 Global Delegado</label>
                                    <input type="text" class="form-input" id="m_ipv6_delegated" value="2804:3d90:8241:ac00::1/64" readonly style="color:#10b981;">
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Prefixo ULA Local Dinâmico</label>
                                    <input type="text" class="form-input" id="m_ipv6_ula" value="fd42:ark:0:1::/64" readonly style="color:#38bdf8;">
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Servidores DNS IPv6</label>
                                    <select class="form-select" id="m_ipv6_dns">
                                        <option value="cloudflare" selected>2606:4700:4700::1111 (Cloudflare IPv6)</option>
                                        <option value="google">2001:4860:4860::8888 (Google IPv6)</option>
                                        <option value="isp">Automático do Provedor de Internet (ISP)</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Acesso à Interface Web de ONUs/Modems em Bridge (ARK-WAN-008) & Auto-WAN (ARK-WAN-004) -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:16px;" class="traffic-grid">
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0 0 6px;">🔗 Acesso à Web GUI de ONUs / Modems em Bridge</h3>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4; margin-bottom:10px;">
                                    Acesse o painel do modem ou ONU de fibra óptica diretamente sem derrubar a conexão PPPoE da WAN.
                                </p>
                                <div class="form-group">
                                    <label class="form-label">IP de Gerenciamento da ONU</label>
                                    <select class="form-select" id="m_onu_ip">
                                        <option value="192.168.1.1" selected>192.168.1.1 (ZTE / FiberHome / Huawei GPON Padrão)</option>
                                        <option value="192.168.18.1">192.168.18.1 (Askey / Mitrastar Vivo Fibra)</option>
                                        <option value="192.168.100.1">192.168.100.1 (Huawei HG8245 / Claro DOCSIS)</option>
                                        <option value="192.168.0.1">192.168.0.1 (D-Link / Cudy / TP-Link)</option>
                                    </select>
                                </div>
                                <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="openOnuPanel()">
                                    🔗 Abrir Painel da ONU em Bridge ↗
                                </button>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0 0 6px;">🔄 Conversão Dinâmica Auto-WAN (Port Mapping)</h3>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4; margin-bottom:10px;">
                                    Alterne a porta física LAN 1 entre uma segunda interface WAN dedicada ou porta LAN local comum.
                                </p>
                                <div class="form-group">
                                    <label class="form-label">Atribuição da Porta Física LAN 1</label>
                                    <select class="form-select" id="m_autowan_map" onchange="saveAutoWan(this.value)">
                                        <option value="dual_wan" selected>Dual-WAN Ativo (LAN 1 convertida na 2ª Porta WAN Claro)</option>
                                        <option value="single_wan">Single-WAN Puro (LAN 1 liberada para rede local de computadores)</option>
                                    </select>
                                </div>
                                <div style="font-size:0.75rem; color:#10b981;">
                                    ● Política mwan3: Balanceamento ponderado 50% / 50% ativo com failover de sub-segundo.
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 3: WI-FI 6E & WI-FI 7 DEDICADO                     -->"""

if "Configuração Global IPv6 & NPTv6" not in content and wan_end_needle in content:
    content = content.replace(wan_end_needle, wan_extra_html, 1)
    print("✓ Added IPv6/NPTv6, ONU Bridge Access & Auto-WAN to view_wan.")

# -------------------------------------------------------------------------
# 4. ENHANCE VIEW_WIFI WITH GUEST WI-FI & EASYMESH 802.11S TOPOLOGY
# -------------------------------------------------------------------------
wifi_enhancer_needle = """                        <!-- Wi-Fi Enhancer Section inside Wi-Fi Panel -->"""

wifi_extra_html = """                        <!-- LuCI Native: Rede Wi-Fi de Convidados / Visitantes (Guest Network / ARK-WIFI-001, ARK-QOS-001) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">👥 Rede Wi-Fi de Convidados (Guest Network Isolada)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Rede sem fio segregada com limitação de banda e isolamento de clientes (AP Isolation)</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <label class="ark-switch">
                                        <input type="checkbox" id="guest_wifi_toggle" checked onchange="toggleGuestWifi(this)">
                                        <span class="ark-slider"></span>
                                    </label>
                                    <button class="ark-btn ark-btn-secondary" onclick="openModal('guest_qr')">📲 QR Code Convidados</button>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:12px;">
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Nome da Rede de Convidados (SSID)</label>
                                    <input type="text" class="form-input" id="m_guest_ssid" value="Wi-Fi-H&R-Visitantes">
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Senha de Acesso dos Convidados</label>
                                    <input type="text" class="form-input" id="m_guest_pass" value="Visita2026Segura">
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Isolamento de Clientes (AP Isolation)</label>
                                    <select class="form-select" id="m_guest_isolate">
                                        <option value="1" selected>Ativado (Convidados não acessam PCs da casa)</option>
                                        <option value="0">Desativado</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Limite de Banda por Convidado</label>
                                    <select class="form-select" id="m_guest_rate">
                                        <option value="10" selected>10 Mbps Download / 5 Mbps Upload</option>
                                        <option value="25">25 Mbps Download / 10 Mbps Upload</option>
                                        <option value="50">50 Mbps Download / 25 Mbps Upload</option>
                                        <option value="0">Sem Limite de Banda</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Rede Mesh EasyMesh 802.11s & Descoberta de Satélites (ARK-WIFI-007) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">📶 Rede Mesh EasyMesh 802.11s & Topologia de Satélites</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Gerenciamento de nós satélites sem fio e transição rápida 802.11k/v/r</span>
                                </div>
                                <button class="ark-btn ark-btn-secondary" onclick="scanMeshSatellites()">
                                    🔍 Sincronizar Novos Nós Mesh
                                </button>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Nome do Nó Mesh</th>
                                            <th>Papel na Rede</th>
                                            <th>Canal & Enlace de Backhaul</th>
                                            <th>Sinal dBm</th>
                                            <th>Aparelhos Conectados</th>
                                            <th style="text-align:right;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>Predator-W6x-Master</strong></td>
                                            <td><span class="pill-badge pill-online">Controlador Raiz (Root AP)</span></td>
                                            <td>Ethernet Local (Switch 2.5G)</td>
                                            <td><strong style="color:#10b981;">0 dBm</strong></td>
                                            <td>17 aparelhos</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">ATIVO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Predator-Node-Sala</strong></td>
                                            <td><span class="pill-badge pill-purple">Satélite Wi-Fi 6E</span></td>
                                            <td>6 GHz PSC 37 (160 MHz Backhaul)</td>
                                            <td><strong style="color:#10b981;">-58 dBm</strong></td>
                                            <td>8 aparelhos</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">SINCRONIZADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Predator-Node-Escritório</strong></td>
                                            <td><span class="pill-badge pill-cyan">Satélite Ethernet</span></td>
                                            <td>Cabo LAN Cat6 (1.0 Gbps Backhaul)</td>
                                            <td><strong style="color:#10b981;">0 dBm</strong></td>
                                            <td>6 aparelhos</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">SINCRONIZADO</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

""" + wifi_enhancer_needle

if "Rede Wi-Fi de Convidados" not in content and wifi_enhancer_needle in content:
    content = content.replace(wifi_enhancer_needle, wifi_extra_html, 1)
    print("✓ Added Guest Wi-Fi & EasyMesh 802.11s Topology to view_wifi.")

# -------------------------------------------------------------------------
# 5. ENHANCE VIEW_DEVICES WITH DNS CACHE SELECTOR & FLUSH STALE LEASES
# -------------------------------------------------------------------------
devices_btn_needle = """                            <button class="ark-btn ark-btn-secondary" onclick="openModal('add_device')">➕ Adicionar Reserva IP Fixo</button>"""
new_devices_btns = """                            <div style="display:flex; gap:8px;">
                                <button class="ark-btn ark-btn-secondary" onclick="flushStaleLeases()">🧹 Limpar Leases Inativos</button>
                                <button class="ark-btn ark-btn-primary" onclick="openModal('add_device')">➕ Adicionar Reserva IP Fixo</button>
                            </div>"""

if devices_btn_needle in content:
    content = content.replace(devices_btn_needle, new_devices_btns, 1)
    print("✓ Added Flush Stale Leases button to view_devices header.")

# Fix device-table-container unclosed div and add DNS Cache 0ms RAM selector
dhcp_grid_needle = """                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Sufixo de Domínio Local</label>"""

dhcp_dns_cache_html = """                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Cache DNS em RAM (0.0ms Latência)</label>
                                    <select class="form-select" id="dhcp_dns_cache_sel">
                                        <option value="150000" selected>🧠 150.000 entradas em RAM (Modo Ultra 0ms)</option>
                                        <option value="50000">⚡ 50.000 entradas em RAM (Modo Equilibrado)</option>
                                        <option value="10000">🍃 10.000 entradas (Modo Econômico)</option>
                                        <option value="150">⚙️ Padrão OpenWrt (150 entradas)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Sufixo de Domínio Local</label>"""

if "Cache DNS em RAM" not in content and dhcp_grid_needle in content:
    content = content.replace(dhcp_grid_needle, dhcp_dns_cache_html, 1)
    print("✓ Added Hardware DNS Cache 0ms RAM selector to view_devices.")

# Fix table tag closing in devices
bad_table_close = """                                </tbody>
                            </table>
                                                <!-- LuCI Native: Servidor DHCP & Domínio Local (network/dhcp) -->"""
good_table_close = """                                </tbody>
                            </table>
                        </div>

                        <!-- LuCI Native: Servidor DHCP & Domínio Local (network/dhcp) -->"""
if bad_table_close in content:
    content = content.replace(bad_table_close, good_table_close, 1)
    print("✓ Fixed unclosed device-table-container div.")

# -------------------------------------------------------------------------
# 6. ENHANCE VIEW_OPTIMIZATION WITH HARDWARE FLOW OFFLOAD, TCP TURBO & ZRAM
# -------------------------------------------------------------------------
opt_speedtest_needle = """                    <!-- Speedtest Multi-WAN -->"""

opt_hw_accel_html = """                    <!-- LuCI Native: Aceleração de Hardware & Otimizações do Kernel (ARK-HW-001, ARK-WAN-009, ARK-HW-004) -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>🚀 Aceleração de Hardware & Otimizações do Kernel</h2>
                                <span class="badge pill-online">Packet Processing Engine Ativo</span>
                            </div>
                            <button class="ark-btn ark-btn-primary" onclick="saveKernelOptimization()">💾 Salvar Parâmetros de Kernel</button>
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:14px; margin-bottom:14px;">
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <strong style="font-size:0.9rem; color:#fff;">Hardware Flow Offloading</strong>
                                    <label class="ark-switch"><input type="checkbox" id="hw_offload_toggle" checked><span class="ark-slider"></span></label>
                                </div>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4;">
                                    Aceleração MediaTek PPE / Qualcomm NSS em silício. Encaminhamento NAT de 2.5 Gbps sem consumir CPU.
                                </p>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <strong style="font-size:0.9rem; color:#fff;">Software Flow Offloading</strong>
                                    <label class="ark-switch"><input type="checkbox" id="sw_offload_toggle" checked><span class="ark-slider"></span></label>
                                </div>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4;">
                                    Tabela de fluxo rápido no kernel (fastpath) para pacotes roteados e conexões TCP/UDP de alta taxa.
                                </p>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <strong style="font-size:0.9rem; color:#fff; display:block; margin-bottom:6px;">TCP Turbo (Congestão)</strong>
                                <select class="form-select" id="tcp_congestion_sel">
                                    <option value="bbr" selected>BBR v2 (Google Acelerado - Baixa Latência)</option>
                                    <option value="cubic">Cubic (Padrão Linux)</option>
                                    <option value="bbr1">BBR v1</option>
                                </select>
                                <p style="font-size:0.75rem; color:#94a3b8; margin-top:6px; line-height:1.3;">
                                    Acelera downloads de alta latência e streaming 4K.
                                </p>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <strong style="font-size:0.9rem; color:#fff; display:block; margin-bottom:6px;">Compactação ZRAM Swap</strong>
                                <select class="form-select" id="zram_size_sel">
                                    <option value="512" selected>512 MB Compactado LZ4 (Recomendado)</option>
                                    <option value="256">256 MB Compactado</option>
                                    <option value="1024">1024 MB (Alta Densidade de Tarefas)</option>
                                    <option value="0">Desativado (Apenas RAM física)</option>
                                </select>
                                <p style="font-size:0.75rem; color:#94a3b8; margin-top:6px; line-height:1.3;">
                                    Multiplica a capacidade de memória RAM em 2.5x com compressão LZ4 ultra-rápida.
                                </p>
                            </div>
                        </div>
                    </div>

""" + opt_speedtest_needle

if "Aceleração MediaTek PPE" not in content and opt_speedtest_needle in content:
    content = content.replace(opt_speedtest_needle, opt_hw_accel_html, 1)
    print("✓ Added Hardware Flow Offload, TCP Turbo & ZRAM to view_optimization.")

# -------------------------------------------------------------------------
# 7. ENHANCE VIEW_SECURITY WITH ADBLOCK, UPNP, DMZ, ZEROTIER & SPEEDIFY
# -------------------------------------------------------------------------
sec_port_fwd_needle = """                        <!-- LuCI Native: Redirecionamento de Portas (Port Forwarding / NAT) -->"""

sec_adblock_upnp_dmz_html = """                        <!-- LuCI Native: AdBlock & Privacidade DNS (ARK-BLOCK-001, ARK-BLOCK-002) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">🛡️ AdBlock Integrado & Filtro de Rastreamento DNS</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Bloqueio em nível de rede para smart TVs, celulares e computadores</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <label class="ark-switch">
                                        <input type="checkbox" id="adblock_toggle" checked onchange="toggleAdblock(this)">
                                        <span class="ark-slider"></span>
                                    </label>
                                    <button class="ark-btn ark-btn-secondary" onclick="updateAdblockList()">🔄 Atualizar Listas</button>
                                    <button class="ark-btn ark-btn-primary" onclick="openModal('adblock_lists')">📋 Whitelist & Blacklist</button>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
                                <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                    <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase;">Regras Carregadas</span>
                                    <div style="font-size:1.4rem; font-weight:800; color:#10b981; margin:2px 0;">148.291 domínios</div>
                                    <span style="font-size:0.72rem; color:#10b981;">● Listas StevenBlack + OISD</span>
                                </div>
                                <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                    <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase;">Taxa de Bloqueio Hoje</span>
                                    <div style="font-size:1.4rem; font-weight:800; color:#38bdf8; margin:2px 0;">34.2% filtrado</div>
                                    <span style="font-size:0.72rem; color:#38bdf8;">● 14.280 requisições barradas</span>
                                </div>
                                <div style="background:rgba(0,0,0,0.25); padding:12px; border-radius:8px;">
                                    <span style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase;">Memória Alocada</span>
                                    <div style="font-size:1.4rem; font-weight:800; color:#a855f7; margin:2px 0;">4.8 MB RAM</div>
                                    <span style="font-size:0.72rem; color:#a855f7;">● Zero impacto no processamento</span>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Mapeamento Dinâmico de Portas UPnP / NAT-PMP IGD (ARK-FW-005) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">🎮 Redirecionamentos Automáticos UPnP / NAT-PMP IGD</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Portas abertas dinamicamente por consoles de videogame, jogos multiplayer e torrents</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:8px;">
                                    <label class="ark-switch">
                                        <input type="checkbox" id="upnp_toggle" checked onchange="toggleUpnp(this)">
                                        <span class="ark-slider"></span>
                                    </label>
                                </div>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Dispositivo / Cliente</th>
                                            <th>Protocolo</th>
                                            <th>Porta WAN Externa</th>
                                            <th>Porta Interna LAN</th>
                                            <th>Descrição da Aplicação</th>
                                            <th style="text-align:right;">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="upnp_tbody">
                                        <tr>
                                            <td><strong>PlayStation-5-Pro (192.168.1.189)</strong></td>
                                            <td><span class="pill-badge pill-purple">UDP</span></td>
                                            <td><code>3074</code></td>
                                            <td><code>3074</code></td>
                                            <td>Call of Duty: Warzone (NAT Aberto)</td>
                                            <td style="text-align:right;"><button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteUpnpPort(3074)">🗑️</button></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Xbox-Series-X (192.168.1.188)</strong></td>
                                            <td><span class="pill-badge pill-purple">UDP</span></td>
                                            <td><code>88</code></td>
                                            <td><code>88</code></td>
                                            <td>Xbox Live Multiplayer Voice</td>
                                            <td style="text-align:right;"><button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteUpnpPort(88)">🗑️</button></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Transmission-NAS (192.168.1.105)</strong></td>
                                            <td><span class="pill-badge pill-cyan">TCP</span></td>
                                            <td><code>51413</code></td>
                                            <td><code>51413</code></td>
                                            <td>BitTorrent Peer Sync</td>
                                            <td style="text-align:right;"><button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deleteUpnpPort(51413)">🗑️</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- LuCI Native: Host DMZ (Zona Desmilitarizada / ARK-FW-003) & Redes Virtuais SD-WAN (ZeroTier / Speedify) -->
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;" class="traffic-grid">
                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                                    <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0;">🎯 Host DMZ (Zona Desmilitarizada)</h3>
                                    <label class="ark-switch"><input type="checkbox" id="dmz_toggle" onchange="toggleDmz(this)"><span class="ark-slider"></span></label>
                                </div>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4; margin-bottom:10px;">
                                    Redireciona todas as portas não mapeadas diretamente para um único aparelho.
                                </p>
                                <div class="form-group" style="margin-bottom:10px;">
                                    <label class="form-label">Dispositivo Destino na DMZ</label>
                                    <select class="form-select" id="dmz_host_sel">
                                        <option value="none" selected>Nenhum (DMZ Desativada com Segurança)</option>
                                        <option value="192.168.1.189">PlayStation-5-Pro (192.168.1.189)</option>
                                        <option value="192.168.1.188">Xbox-Series-X (192.168.1.188)</option>
                                        <option value="192.168.1.146">MacMini-M2-Server (192.168.1.146)</option>
                                    </select>
                                </div>
                                <button class="ark-btn ark-btn-secondary" style="width:100%;" onclick="saveDmzSettings()">💾 Salvar Host DMZ</button>
                            </div>

                            <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px;">
                                <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0 0 6px;">🌐 SD-WAN: ZeroTier & Speedify Bonding</h3>
                                <p style="font-size:0.78rem; color:#94a3b8; line-height:1.4; margin-bottom:8px;">
                                    Integrações nativas de rede corporativa mesh e agregação multi-link.
                                </p>
                                <div style="display:flex; flex-direction:column; gap:6px; font-size:0.8rem;">
                                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); padding:8px 10px; border-radius:6px;">
                                        <div><strong>ZeroTier:</strong> <code>17d709436cb89a12</code></div>
                                        <span class="pill-badge pill-online">ONLINE (10.147.19.42)</span>
                                    </div>
                                    <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); padding:8px 10px; border-radius:6px;">
                                        <div><strong>Speedify Bonding:</strong> WAN 1 + WAN 2 + Starlink</div>
                                        <span class="pill-badge pill-purple">1.34 Gbps COMBINADO</span>
                                    </div>
                                </div>
                            </div>
                        </div>

""" + sec_port_fwd_needle

if "AdBlock Integrado & Filtro de Rastreamento" not in content and sec_port_fwd_needle in content:
    content = content.replace(sec_port_fwd_needle, sec_adblock_upnp_dmz_html, 1)
    print("✓ Added AdBlock, UPnP, DMZ, ZeroTier & Speedify to view_security.")

# -------------------------------------------------------------------------
# 8. ENHANCE VIEW_DOCTOR WITH STARLINK CONTROLS & 12-WEDGE OBSTACLE RADAR
# -------------------------------------------------------------------------
starlink_btn_needle = """                            <button class="ark-btn ark-btn-secondary" onclick="openModal('starlink_config')">⚙️ Configurações Dishy</button>"""
new_starlink_btns = """                            <div style="display:flex; gap:8px;">
                                <button class="ark-btn ark-btn-secondary" onclick="dishyAction('stow')">📐 Recolher Antena (Stow)</button>
                                <button class="ark-btn ark-btn-secondary" onclick="dishyAction('reboot')">🔄 Reiniciar Dishy</button>
                                <button class="ark-btn ark-btn-cyan" onclick="openModal('starlink_config')">⚙️ Configurações Dishy</button>
                            </div>"""

if starlink_btn_needle in content:
    content = content.replace(starlink_btn_needle, new_starlink_btns, 1)
    print("✓ Added Starlink Stow & Reboot action buttons to view_doctor.")

# -------------------------------------------------------------------------
# 9. ENHANCE VIEW_SYSTEM WITH RAM PURGE & FLASH NAND CLEANUP BUTTONS
# -------------------------------------------------------------------------
system_card_needle = """                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;" class="traffic-grid">"""

system_cleanup_html = """                        <!-- Otimização Imediata de Memória RAM & Armazenamento Flash (ARK-HW-004, ARK-HW-005) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-bottom:14px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:0.95rem; font-weight:800; color:#fff; margin:0;">🧹 Manutenção Operacional Imediata de Memória & Flash</h3>
                                    <span style="font-size:0.75rem; color:#94a3b8;">Despejo de caches estagnados e limpeza de arquivos temporários da partição /overlay</span>
                                </div>
                                <div style="display:flex; gap:8px;">
                                    <button class="ark-btn ark-btn-secondary" onclick="purgeRam()">
                                        🧹 Purgar Memória RAM (Drop Caches)
                                    </button>
                                    <button class="ark-btn ark-btn-secondary" onclick="cleanFlashStorage()">
                                        🗑️ Limpar Temporários da Flash
                                    </button>
                                </div>
                            </div>
                        </div>

""" + system_card_needle

if "Purgar Memória RAM (Drop Caches)" not in content and system_card_needle in content:
    content = content.replace(system_card_needle, system_cleanup_html, 1)
    print("✓ Added RAM Purge & Flash Cleanup buttons to view_system.")

# Update Sysupgrade button in view_system to open OTA modal
old_sysup_btn = '<button class="ark-btn ark-btn-primary" onclick="triggerSysupgradeCheck()" style="width:100%;">'
new_sysup_btn = '<button class="ark-btn ark-btn-primary" onclick="openModal(\'ota_update\')" style="width:100%;">'
if old_sysup_btn in content:
    content = content.replace(old_sysup_btn, new_sysup_btn, 1)
    print("✓ Updated Sysupgrade button to open OTA modal.")

# -------------------------------------------------------------------------
# 10. ADD ALL MISSING MODALS TO openModal(type)
# -------------------------------------------------------------------------
modal_else_needle = """            } else {
                closeModal();
            }
        }"""

new_modals_code = """            } else if (type === 'adblock_lists') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🛡️ Gerenciamento de Listas AdBlock (Whitelist & Blacklist)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">Adicionar Domínio à Lista Branca (Sempre Permitir - Whitelist)</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" class="form-input" id="m_adblock_wl_input" placeholder="exemplo: login.banco.com.br">
                                <button class="ark-btn ark-btn-secondary" onclick="addWhitelistDomain()">Adicionar</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Adicionar Domínio à Lista Negra (Sempre Bloquear - Blacklist)</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" class="form-input" id="m_adblock_bl_input" placeholder="exemplo: rastreador.smarttv.com">
                                <button class="ark-btn ark-btn-danger" onclick="addBlacklistDomain()">Bloquear</button>
                            </div>
                        </div>
                        <div style="background:rgba(0,0,0,0.25); border-radius:8px; padding:12px; margin-top:12px;">
                            <strong style="color:#fff; font-size:0.85rem;">Domínios Customizados Ativos (2):</strong>
                            <div style="margin-top:6px; font-size:0.8rem; color:#94a3b8; display:flex; flex-direction:column; gap:4px;">
                                <div>• <span style="color:#10b981;">[WHITELIST]</span> telemetry.playstation.net</div>
                                <div>• <span style="color:#f43f5e;">[BLACKLIST]</span> ads.samsungads.com</div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('✅ Listas AdBlock sincronizadas com o dnsmasq!'); closeModal();">💾 Salvar e Recarregar DNS</button>
                    </div>
                `;
            } else if (type === 'ota_update') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>🔍 Verificador de Atualizações OTA (ARK Router OS)</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div style="text-align:center; padding:12px 0;">
                            <div style="font-size:2.5rem; margin-bottom:8px;">✨</div>
                            <h4 style="color:#fff; font-size:1.15rem; margin-bottom:4px;">Seu Sistema está 100% Atualizado</h4>
                            <span class="pill-badge pill-online">ARK OS v1.5.17 (ESTÁVEL)</span>
                        </div>
                        <div style="background:rgba(0,0,0,0.25); border-radius:8px; padding:14px; margin-top:12px; font-size:0.82rem; color:#cbd5e1; line-height:1.5;">
                            <div>• Versão Instalada: <strong>1.5.17</strong> (Kernel 6.6.54)</div>
                            <div>• Canal de Distribuição: <strong>Oficial Release (GitHub Releases)</strong></div>
                            <div>• Pacote: <code>luci-app-ark-router_1.5.17_all.ipk / .apk</code></div>
                            <div>• Integridade SHA-256: <code>e3b0c44298fc1c149afbf4c8996fb92427ae41e4...</code></div>
                            <div style="margin-top:8px; color:#10b981;">
                                ✅ Todos os 74 contratos de engenharia e regras de firewall estão em conformidade.
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button>
                        <button class="ark-btn ark-btn-primary" onclick="showToast('🔄 Verificando servidores do GitHub... Versão atual v1.5.17 é a mais recente!');">🔍 Checar Novamente</button>
                    </div>
                `;
            } else if (type === 'guest_qr') {
                cont.innerHTML = `
                    <div class="modal-header">
                        <h3>📲 Conexão Wi-Fi de Convidados via QR Code</h3>
                        <button class="modal-close-btn" onclick="closeModal()">✕</button>
                    </div>
                    <div class="modal-body" style="text-align:center;">
                        <div style="display:inline-block; padding:16px; background:#fff; border-radius:12px; margin:10px 0;">
                            <svg width="180" height="180" viewBox="0 0 100 100">
                                <rect width="100" height="100" fill="#fff" />
                                <rect x="10" y="10" width="30" height="30" fill="#000" />
                                <rect x="15" y="15" width="20" height="20" fill="#fff" />
                                <rect x="20" y="20" width="10" height="10" fill="#000" />
                                <rect x="60" y="10" width="30" height="30" fill="#000" />
                                <rect x="65" y="15" width="20" height="20" fill="#fff" />
                                <rect x="70" y="20" width="10" height="10" fill="#000" />
                                <rect x="10" y="60" width="30" height="30" fill="#000" />
                                <rect x="15" y="65" width="20" height="20" fill="#fff" />
                                <rect x="20" y="70" width="10" height="10" fill="#000" />
                                <circle cx="50" cy="50" r="10" fill="#10b981" />
                            </svg>
                        </div>
                        <h4 style="color:#fff;">Wi-Fi-H&R-Visitantes</h4>
                        <p style="font-size:0.8rem; color:#94a3b8;">Aponte a câmera do celular para conectar à rede de convidados sem pedir senha.</p>
                    </div>
                    <div class="modal-footer"><button class="ark-btn ark-btn-secondary" onclick="closeModal()">Fechar</button></div>
                `;
""" + modal_else_needle

if "adblock_lists" not in content and modal_else_needle in content:
    content = content.replace(modal_else_needle, new_modals_code, 1)
    print("✓ Added adblock_lists, ota_update, and guest_qr modals to openModal().")

# -------------------------------------------------------------------------
# 11. ADD BABY JUMBO FRAMES OPTION TO openWanModal
# -------------------------------------------------------------------------
old_mtu_opts = """                        <select class="form-select" id="m_wan_mtu">
                            <option value="1492" ${isWan1 ? 'selected' : ''}>1492 (Padrão Otimizado Fibra PPPoE - Elimina Fragmentação)</option>"""

new_mtu_opts = """                        <select class="form-select" id="m_wan_mtu">
                            <option value="1508">1508 (Baby Jumbo Frames — PPPoE com MTU 1500 Puro sem Fragmentação)</option>
                            <option value="1492" ${isWan1 ? 'selected' : ''}>1492 (Padrão Otimizado Fibra PPPoE - Elimina Fragmentação)</option>"""

if "Baby Jumbo Frames" not in content and old_mtu_opts in content:
    content = content.replace(old_mtu_opts, new_mtu_opts, 1)
    print("✓ Added Baby Jumbo Frames (1508) MTU option to openWanModal.")

# -------------------------------------------------------------------------
# 12. ADD PARENTAL CONTROL TO openDeviceModal
# -------------------------------------------------------------------------
old_dev_modal_group = """                    <div class="form-group">
                        <label class="form-label">Prioridade de Conexão (QoS CAKE)</label>"""

new_dev_parental_html = """                    <div class="form-group">
                        <label class="form-label">Controle Parental & Acesso à Internet (Firewall MAC)</label>
                        <select class="form-select" id="m_dev_parental">
                            <option value="allow" selected>Liberado (Acesso 24 Horas sem Restrições)</option>
                            <option value="block">🚫 Bloquear Acesso à Internet Imediatamente</option>
                            <option value="night">🌙 Bloqueio Noturno Automático (22h00 às 06h00)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Prioridade de Conexão (QoS CAKE)</label>"""

if "Controle Parental & Acesso à Internet" not in content and old_dev_modal_group in content:
    content = content.replace(old_dev_modal_group, new_dev_parental_html, 1)
    print("✓ Added Parental Control MAC blocking selector to openDeviceModal.")

# -------------------------------------------------------------------------
# 13. ADD ACTION HANDLERS IN JAVASCRIPT
# -------------------------------------------------------------------------
handlers_needle = "        // Action Handlers for Modals"

new_handlers_js = """        // Advanced Master Design Handlers (100% of V1 Features)
        function purgeRam() {
            const ramVal = document.getElementById('health_ram');
            const barRam = document.getElementById('bar_ram');
            if (ramVal) ramVal.textContent = '146 / 512 MB';
            if (barRam) barRam.style.width = '28%';
            showToast('🧹 142 MB de buffers e caches de RAM purgados com sucesso! Memória livre aumentada.');
        }

        function cleanFlashStorage() {
            showToast('🗑️ Limpeza concluída: 18.4 MB de caches temporários do LuCI removidos da partição /overlay!');
        }

        function flushStaleLeases() {
            showToast('🧹 Coleta de lixo concluída: 4 leases DHCP inativos estagnados removidos!');
        }

        function toggleAdblock(el) {
            showToast(el.checked ? '🛡️ AdBlock ATIVADO: 148.291 domínios filtrados no dnsmasq.' : '⚠️ AdBlock pausado temporariamente.');
        }

        function updateAdblockList() {
            showToast('🔄 Atualizando listas StevenBlack e OISD... 148.291 regras sincronizadas!');
        }

        function addWhitelistDomain() {
            const inp = document.getElementById('m_adblock_wl_input');
            const val = inp ? inp.value.trim() : '';
            if (!val) return;
            showToast(`✅ Domínio "${val}" adicionado à Whitelist!`);
            if (inp) inp.value = '';
        }

        function addBlacklistDomain() {
            const inp = document.getElementById('m_adblock_bl_input');
            const val = inp ? inp.value.trim() : '';
            if (!val) return;
            showToast(`🚫 Domínio "${val}" bloqueado na Blacklist!`);
            if (inp) inp.value = '';
        }

        function toggleUpnp(el) {
            showToast(el.checked ? '🎮 Serviço UPnP IGD ativado para jogos e consoles.' : '⚠️ UPnP IGD desativado.');
        }

        function deleteUpnpPort(port) {
            showToast(`🗑️ Redirecionamento UPnP da porta ${port} revogado com sucesso!`);
            const row = event && event.target ? event.target.closest('tr') : null;
            if (row) row.remove();
        }

        function toggleDmz(el) {
            showToast(el.checked ? '🎯 Host DMZ ativado! Todas as portas não mapeadas serão encaminhadas.' : 'Host DMZ desativado.');
        }

        function saveDmzSettings() {
            const host = document.getElementById('dmz_host_sel').value;
            showToast(host !== 'none' ? `🎯 Host DMZ configurado para o IP ${host}!` : 'Host DMZ desativado com segurança.');
        }

        function saveIpv6Settings() {
            const mode = document.getElementById('m_ipv6_mode').value;
            showToast(`🌐 Configurações IPv6 salvas! Modo ativo: ${mode.toUpperCase()}. Prefixo ULA dinâmico sincronizado.`);
        }

        function openOnuPanel() {
            const ip = document.getElementById('m_onu_ip').value;
            showToast(`🔗 Abrindo interface web da ONU em http://${ip}...`);
            window.open(`http://${ip}`, '_blank');
        }

        function saveAutoWan(mode) {
            showToast(mode === 'dual_wan' 
                ? '🔄 Auto-WAN: Porta LAN 1 convertida na WAN 2 (Claro Fibra) com balanceamento mwan3!' 
                : 'Single-WAN: Porta LAN 1 liberada para computadores locais.');
        }

        function toggleGuestWifi(el) {
            showToast(el.checked ? '👥 Rede Wi-Fi de Convidados ATIVADA com isolamento de clientes!' : 'Rede Wi-Fi de Convidados desligada.');
        }

        function scanMeshSatellites() {
            showToast('🔍 Varredura EasyMesh iniciada: 2 nós satélites sincronizados com sinal excelente!');
        }

        function saveKernelOptimization() {
            const tcp = document.getElementById('tcp_congestion_sel').value;
            const zram = document.getElementById('zram_size_sel').value;
            showToast(`🚀 Kernel otimizado! TCP ${tcp.toUpperCase()} e ZRAM ${zram} MB LZ4 aplicados.`);
        }

        function dishyAction(action) {
            if (action === 'stow') {
                showToast('📐 Comando STOW enviado! Antena Starlink Dishy recolhendo para posição de transporte.');
            } else if (action === 'reboot') {
                showToast('🔄 Reiniciando terminal orbital Starlink Dishy... Reconexão LEO em 90s.');
            } else {
                showToast('📡 Antena Starlink Dishy despertada! Rastreamento de satélites retomado.');
            }
        }

""" + handlers_needle

if "Advanced Master Design Handlers" not in content and handlers_needle in content:
    content = content.replace(handlers_needle, new_handlers_js, 1)
    print("✓ Added Advanced Master Design Handlers in JavaScript.")

print(f"Writing updated dashboard generator to {GEN_SCRIPT}...")
with open(GEN_SCRIPT, "w", encoding="utf-8") as f:
    f.write(content)

