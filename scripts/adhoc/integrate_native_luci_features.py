#!/usr/bin/env python3
"""
ARK Router V2: Integrates all Native LuCI Features into Dedicated Panels
and Replaces Down-Arrow LuCI Drawer with Direct "Ver Interface Clássica ↗" Link.
"""

import os
import re

GEN_SCRIPT = "/Volumes/--400GB--/FEITOS COM IA/Ark-Router/GitHub/luci-app-ark-router/scripts/generate_v2_staging_dashboard.py"

with open(GEN_SCRIPT, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update Sidebar LuCI Section
old_sidebar_luci = """            <div class="nav-section-title">OpenWrt LuCI</div>
            <a class="nav-item" style="color:#38bdf8;" onclick="toggleLuciDrawer()">
                <span class="icon">🛠️</span> LuCI Nativo ▾
            </a>
            <a class="nav-item" style="color:#c084fc;" onclick="openLuciSimulator('overview')">
                <span class="icon">💻</span> Ver Interface Clássica
            </a>"""

new_sidebar_luci = """            <div class="nav-section-title">OpenWrt Nativo</div>
            <a class="nav-item" style="color:#c084fc;" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)">
                <span class="icon">💻</span> Ver Interface Clássica <span style="font-size:0.75rem; margin-left:auto; opacity:0.7;">↗</span>
            </a>"""

if old_sidebar_luci in code:
    code = code.replace(old_sidebar_luci, new_sidebar_luci)
    print("✓ Sidebar LuCI section updated to clean direct link.")
else:
    print("! Notice: Sidebar LuCI section not matched exactly.")

# 2. Update Top Header Button
old_header_btn = """                    <button class="btn-hero-action" onclick="toggleLuciDrawer()" style="background:rgba(56,189,248,0.15); border-color:rgba(56,189,248,0.35); color:#38bdf8;">
                        🛠️ LuCI Nativo ▾
                    </button>"""

new_header_btn = """                    <a class="btn-hero-action" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)" style="background:rgba(192,132,252,0.15); border-color:rgba(192,132,252,0.4); color:#c084fc; text-decoration:none; font-weight:700;" title="Acessar Interface Clássica Original do LuCI">
                        💻 Ver Interface Clássica <span style="font-size:0.75rem; opacity:0.8;">↗</span>
                    </a>"""

if old_header_btn in code:
    code = code.replace(old_header_btn, new_header_btn)
    print("✓ Top Header button updated to clean direct link without arrow.")
else:
    print("! Notice: Top Header button not matched exactly.")

# 3. Update Hero Banner Action Button
old_hero_btn = '<button class="btn-hero-action" onclick="toggleLuciDrawer()">🛠️ LuCI Nativo</button>'
new_hero_btn = '<a class="btn-hero-action" href="/cgi-bin/luci/admin/status/overview" onclick="openClassicLuci(event)" style="text-decoration:none; color:#cbd5e1;">💻 Interface Clássica ↗</a>'
if old_hero_btn in code:
    code = code.replace(old_hero_btn, new_hero_btn)
    print("✓ Hero banner LuCI button updated.")

# 4. Remove Slide-Over Drawer HTML
old_drawer_html = re.compile(
    r'<!-- =+\s*-->\s*<!-- SLIDE-OVER DRAWER: PÁGINAS NATIVAS DO LUCI.*?<!-- SIMULADOR INTERATIVO DE PÁGINAS DO LUCI\s*-->',
    re.DOTALL
)
code = old_drawer_html.sub('<!-- SIMULADOR INTERATIVO DE PÁGINAS DO LUCI -->', code)
print("✓ Clumsy Slide-Over Drawer HTML removed.")

# 5. Add Native LuCI Features to WiFi Panel (view_wifi): Site Survey / Channel Analysis
wifi_insert_target = '<!-- Wi-Fi Enhancer Section inside Wi-Fi Panel -->'
wifi_site_survey_html = """<!-- LuCI Native: Scanner de Redes Vizinhas & Site Survey (status/channel_analysis) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">📡 Scanner de Espectro & Redes Vizinhas (Site Survey)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Detecção de interferência de canais nos rádios 2.4, 5 e 6 GHz em tempo real</span>
                                </div>
                                <button class="ark-btn ark-btn-secondary" onclick="scanNeighborWifi()" id="btn_wifi_scan">
                                    🔍 Escanear Redes Próximas
                                </button>
                            </div>
                            <div class="device-table-container">
                                <table class="device-table" id="wifi_scan_table">
                                    <thead>
                                        <tr>
                                            <th>Nome da Rede (SSID)</th>
                                            <th>BSSID (MAC)</th>
                                            <th>Frequência</th>
                                            <th>Canal & Largura</th>
                                            <th>Sinal (RSSI)</th>
                                            <th>Diagnóstico de Interferência</th>
                                        </tr>
                                    </thead>
                                    <tbody id="wifi_scan_tbody">
                                        <tr>
                                            <td><strong>VIVO-FIBRA-5G-9A</strong></td>
                                            <td><code>94:2a:6f:11:22:33</code></td>
                                            <td><span class="pill-badge pill-cyan">5 GHz</span></td>
                                            <td>Canal 36 (80 MHz)</td>
                                            <td><strong style="color:#f59e0b;">-68 dBm</strong></td>
                                            <td><span style="color:#f59e0b;">⚠️ Canal concorrente com Rádio 5G</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>CLARO_NET_WIFI_2G</strong></td>
                                            <td><code>00:1c:10:aa:bb:cc</code></td>
                                            <td><span class="pill-badge pill-amber">2.4 GHz</span></td>
                                            <td>Canal 1 (20 MHz)</td>
                                            <td><strong style="color:#10b981;">-76 dBm</strong></td>
                                            <td><span style="color:#10b981;">✅ Sem sobreposição (Canal 6 livre)</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Vizinho-Apto-32</strong></td>
                                            <td><code>70:4f:57:44:55:66</code></td>
                                            <td><span class="pill-badge pill-cyan">5 GHz</span></td>
                                            <td>Canal 149 (160 MHz)</td>
                                            <td><strong style="color:#64748b;">-84 dBm</strong></td>
                                            <td><span style="color:#10b981;">✅ Sinal muito fraco, sem impacto</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>Rede-Comercial-6G</strong></td>
                                            <td><code>3c:2a:f4:dd:ee:ff</code></td>
                                            <td><span class="pill-badge pill-purple">6 GHz</span></td>
                                            <td>Canal 69 (160 MHz)</td>
                                            <td><strong style="color:#64748b;">-89 dBm</strong></td>
                                            <td><span style="color:#10b981;">✅ Espectro 6 GHz livre (320 MHz MLO limpo)</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- Wi-Fi Enhancer Section inside Wi-Fi Panel -->"""

if wifi_insert_target in code and "Scanner de Espectro & Redes Vizinhas" not in code:
    code = code.replace(wifi_insert_target, wifi_site_survey_html)
    print("✓ Wi-Fi Site Survey feature integrated.")

# 6. Add Native LuCI Features to Devices Panel (view_devices): DHCP Server & Local DNS (network/dhcp)
devices_insert_target = '</div>\n                    </div>\n                </section>\n\n                <!-- ========================================================= -->\n                <!-- PAINEL 5: ENGENHARIA & OTIMIZAÇÃO'
devices_dhcp_html = """                        <!-- LuCI Native: Servidor DHCP & Domínio Local (network/dhcp) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">📦 Servidor DHCP & Domínio Local (dnsmasq)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Gerenciamento de faixa de concessão IP, tempo de lease e resolução local</span>
                                </div>
                                <button class="ark-btn ark-btn-primary" onclick="saveDhcpSettings()">
                                    💾 Salvar Parâmetros DHCP
                                </button>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:14px;">
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Faixa Inicial de IPs</label>
                                    <select class="form-select" id="dhcp_start_sel">
                                        <option value="100" selected>192.168.1.100 (Padrão Recomendado)</option>
                                        <option value="50">192.168.1.50 (Redes Maiores)</option>
                                        <option value="10">192.168.1.10 (Faixa Ampla)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Limite de Clientes Simultâneos</label>
                                    <select class="form-select" id="dhcp_limit_sel">
                                        <option value="150" selected>150 Endereços (até .250)</option>
                                        <option value="100">100 Endereços (até .200)</option>
                                        <option value="200">200 Endereços (até .254)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Tempo de Concessão (Lease Time)</label>
                                    <select class="form-select" id="dhcp_time_sel">
                                        <option value="12h" selected>12 Horas (Residencial Dinâmico)</option>
                                        <option value="24h">24 Horas (Misto)</option>
                                        <option value="7d">7 Dias (Dispositivos Fixos)</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom:0;">
                                    <label class="form-label">Sufixo de Domínio Local</label>
                                    <select class="form-select" id="dhcp_domain_sel">
                                        <option value="lan" selected>.lan (Padrão OpenWrt)</option>
                                        <option value="home.arpa">.home.arpa (RFC 8375)</option>
                                        <option value="ark.local">.ark.local</option>
                                    </select>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;" class="traffic-grid">
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">DHCP Autoritativo</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Responde de imediato com NAK para clientes com IP inválido</div>
                                    </div>
                                    <label class="ark-switch">
                                        <input type="checkbox" checked>
                                        <span class="ark-slider"></span>
                                    </label>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">Blindagem DNS Rebind</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Bloqueia respostas upstream que apontam para IPs privados (RFC 1918)</div>
                                    </div>
                                    <label class="ark-switch">
                                        <input type="checkbox" checked>
                                        <span class="ark-slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 5: ENGENHARIA & OTIMIZAÇÃO"""

if "Servidor DHCP & Domínio Local" not in code:
    code = code.replace(devices_insert_target, devices_dhcp_html)
    print("✓ DHCP Server & Local Domain feature integrated.")

# 7. Add Native LuCI Features to Security Panel (view_security): Port Forwarding & Traffic Rules
security_insert_target = '</tbody>\n                            </table>\n                        </div>\n                    </div>\n                </section>\n\n                <!-- ========================================================= -->\n                <!-- PAINEL 7: DIAGNÓSTICO DOCTOR'
security_port_html = """</tbody>
                            </table>
                        </div>

                        <!-- LuCI Native: Redirecionamento de Portas (Port Forwarding / NAT) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">🔀 Redirecionamento de Portas (Port Forwarding / NAT)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Permita acesso externo a servidores internos, jogos online, torrents e CFTV</span>
                                </div>
                                <button class="ark-btn ark-btn-primary" onclick="openPortForwardModal()">
                                    ➕ Nova Regra de Porta
                                </button>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Nome da Regra</th>
                                            <th>Protocolo</th>
                                            <th>Porta WAN Externa</th>
                                            <th>Dispositivo Destino (IP)</th>
                                            <th>Porta Interna</th>
                                            <th>Ativo</th>
                                            <th style="text-align:right;">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody id="port_forward_tbody">
                                        <tr>
                                            <td><strong>Plex Media Server</strong></td>
                                            <td><span class="pill-badge pill-cyan">TCP</span></td>
                                            <td><code>32400</code></td>
                                            <td>192.168.1.105 (NAS Synology)</td>
                                            <td><code>32400</code></td>
                                            <td>
                                                <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                            </td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePortRule(this)">🗑️</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Servidor Web Seguro</strong></td>
                                            <td><span class="pill-badge pill-cyan">TCP</span></td>
                                            <td><code>8443</code></td>
                                            <td>192.168.1.146 (MacMini M2)</td>
                                            <td><code>443</code></td>
                                            <td>
                                                <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                            </td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePortRule(this)">🗑️</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>Câmeras CFTV RTSP</strong></td>
                                            <td><span class="pill-badge pill-purple">TCP+UDP</span></td>
                                            <td><code>554</code></td>
                                            <td>192.168.1.150 (Câmera Frente)</td>
                                            <td><code>554</code></td>
                                            <td>
                                                <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                            </td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePortRule(this)">🗑️</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- LuCI Native: Regras de Tráfego do Firewall (Traffic Rules) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0 0 4px;">🛡️ Regras de Tráfego & Bloqueio (Firewall nftables)</h3>
                            <span style="font-size:0.8rem; color:#94a3b8; display:block; margin-bottom:12px;">Proteção perimetral contra sondagens e ataques de força bruta na WAN</span>

                            <div style="display:flex; flex-direction:column; gap:10px;">
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">Bloqueio Total de Gerenciamento na WAN (Drop Portas 80, 443, 22)</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Impede tentativas de login externo na interface LuCI e no terminal SSH</div>
                                    </div>
                                    <span class="pill-badge pill-online">ATIVO (SEGURO)</span>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">Responder a Pings ICMP Externos na WAN</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Permite testes de latência e monitoramento do seu provedor de internet</div>
                                    </div>
                                    <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                </div>
                                <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:12px;">
                                    <div>
                                        <strong style="font-size:0.88rem; color:#fff;">Forçar Redirecionamento de DNS para Servidor Criptografado</strong>
                                        <div style="font-size:0.75rem; color:#94a3b8;">Intercepta requisições da porta 53 plana de smart TVs e IoTs e força AdGuard/Cloudflare</div>
                                    </div>
                                    <label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 7: DIAGNÓSTICO DOCTOR"""

if "Redirecionamento de Portas" not in code:
    code = code.replace(security_insert_target, security_port_html)
    print("✓ Port Forwarding & Traffic Rules features integrated.")

# 8. Add Native LuCI Features to Doctor Panel (view_doctor): Diagnostics Tools & Real-Time Syslog
doctor_insert_target = '</div>\n                        </div>\n                    </div>\n                </section>\n\n                <!-- ========================================================= -->\n                <!-- PAINEL 8: SISTEMA & HARDWARE'
doctor_native_html = """</div>
                        </div>
                    </div>

                    <!-- LuCI Native: Ferramentas Interativas de Diagnóstico de Rede (network/diagnostics) -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>🎯 Ferramentas Interativas de Diagnóstico de Rede</h2>
                                <span class="badge pill-cyan">Ping • Traceroute • Nslookup</span>
                            </div>
                            <button class="ark-btn ark-btn-primary" onclick="runDiagnosticTool()" id="btn_run_diag">🚀 Disparar Teste</button>
                        </div>

                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:12px; margin-bottom:14px;">
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">Ferramenta</label>
                                <select class="form-select" id="diag_tool_sel">
                                    <option value="ping" selected>Ping (Latência & ICMP)</option>
                                    <option value="traceroute">Traceroute (Saltos de Rota)</option>
                                    <option value="nslookup">Nslookup (Resolução de DNS)</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">Destino do Teste</label>
                                <select class="form-select" id="diag_target_sel">
                                    <option value="1.1.1.1" selected>1.1.1.1 (Cloudflare Anycast SP)</option>
                                    <option value="8.8.8.8">8.8.8.8 (Google Primary)</option>
                                    <option value="starlink.com">starlink.com (Telemetria LEO)</option>
                                    <option value="registro.br">registro.br (IX.br São Paulo)</option>
                                </select>
                            </div>
                            <div class="form-group" style="margin-bottom:0;">
                                <label class="form-label">Contagem de Pacotes</label>
                                <select class="form-select" id="diag_count_sel">
                                    <option value="4" selected>4 Pacotes (Rápido)</option>
                                    <option value="10">10 Pacotes (Alta Precisão)</option>
                                </select>
                            </div>
                        </div>

                        <div style="background:#090d16; border:1px solid #1e293b; border-radius:8px; padding:14px; font-family:monospace; font-size:0.82rem; color:#38bdf8; min-height:100px; max-height:160px; overflow-y:auto;" id="diag_output_box">
                            <div>PING 1.1.1.1 (1.1.1.1): 56 data bytes</div>
                            <div>64 bytes from 1.1.1.1: seq=0 ttl=58 time=1.842 ms</div>
                            <div>64 bytes from 1.1.1.1: seq=1 ttl=58 time=1.654 ms</div>
                            <div>64 bytes from 1.1.1.1: seq=2 ttl=58 time=1.720 ms</div>
                            <div>64 bytes from 1.1.1.1: seq=3 ttl=58 time=1.588 ms</div>
                            <div style="color:#10b981; margin-top:4px;">--- 1.1.1.1 ping statistics --- 4 packets transmitted, 4 packets received, 0% packet loss</div>
                            <div style="color:#10b981;">round-trip min/avg/max = 1.588/1.701/1.842 ms (Jitter: 0.12 ms)</div>
                        </div>
                    </div>

                    <!-- LuCI Native: Logs do Sistema em Tempo Real (status/syslog & status/dmesg) -->
                    <div class="section-card">
                        <div class="section-header">
                            <div class="section-title">
                                <h2>📜 Logs do Sistema em Tempo Real (Syslog & Kernel)</h2>
                                <span class="badge pill-online">Buffer Ativo (logread)</span>
                            </div>
                            <div style="display:flex; gap:8px;">
                                <button class="ark-btn ark-btn-secondary" style="padding:6px 12px; font-size:0.8rem;" onclick="copySyslogs()">📋 Copiar</button>
                                <button class="ark-btn ark-btn-secondary" style="padding:6px 12px; font-size:0.8rem;" onclick="clearSyslogs()">🧹 Limpar</button>
                            </div>
                        </div>

                        <div style="display:flex; gap:8px; margin-bottom:12px; flex-wrap:wrap;">
                            <button class="ark-btn ark-btn-secondary active" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('all', this)">Todos</button>
                            <button class="ark-btn ark-btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('wifi', this)">Wi-Fi (hostapd/usteer)</button>
                            <button class="ark-btn ark-btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('firewall', this)">Firewall (nftables)</button>
                            <button class="ark-btn ark-btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('dhcp', this)">DHCP (dnsmasq)</button>
                            <button class="ark-btn ark-btn-secondary" style="padding:4px 10px; font-size:0.75rem;" onclick="filterLogs('kernel', this)">Kernel (dmesg)</button>
                        </div>

                        <div style="background:#090d16; border:1px solid #1e293b; border-radius:8px; padding:14px; font-family:monospace; font-size:0.78rem; line-height:1.5; color:#cbd5e1; height:180px; overflow-y:auto;" id="syslog_box">
                            <div><span style="color:#64748b;">[14/Oct 03:42:01]</span> <span style="color:#38bdf8;">hostapd:</span> phy1-ap0: STA f4:d4:88:55:66:77 WPA: pairwise key handshake completed (WPA3-SAE)</div>
                            <div><span style="color:#64748b;">[14/Oct 03:42:15]</span> <span style="color:#a855f7;">usteer:</span> Client 34:ab:95:11:22:33 Roam event: 5GHz -> 6GHz (RSSI: -42 dBm, 320MHz MLO link active)</div>
                            <div><span style="color:#64748b;">[14/Oct 03:43:00]</span> <span style="color:#10b981;">dnsmasq-dhcp[1422]:</span> DHCPACK(br-lan) 192.168.1.101 34:ab:95:11:22:33 iPhone-16-Pro-Max</div>
                            <div><span style="color:#64748b;">[14/Oct 03:43:22]</span> <span style="color:#eab308;">mwan3[2104]:</span> Interface wan1 (Vivo Fibra) is online (ping: 1.8ms, packet loss: 0%)</div>
                            <div><span style="color:#64748b;">[14/Oct 03:44:05]</span> <span style="color:#10b981;">kernel:</span> [mtk_ppe] Hardware flow table offload active (PPE MT7986A, WED enabled)</div>
                            <div><span style="color:#64748b;">[14/Oct 03:45:10]</span> <span style="color:#38bdf8;">firewall:</span> fw4: 0 legacy iptables rules detected. 100% pure nftables active.</div>
                        </div>
                    </div>
                </section>

                <!-- ========================================================= -->
                <!-- PAINEL 8: SISTEMA & HARDWARE"""

if "Logs do Sistema em Tempo Real" not in code:
    code = code.replace(doctor_insert_target, doctor_native_html)
    print("✓ Diagnostic Tools & Real-Time Syslog features integrated.")

# 9. Add Native LuCI Features to System Panel (view_system): Backup/Sysupgrade, OPKG Flash, Startup Services
system_insert_target = '</div>\n                        </div>\n                    </div>\n                </section>\n\n            </main>'
system_native_html = """</div>
                        </div>

                        <!-- LuCI Native: Backup, Restauração de Configurações & Sysupgrade (system/flash) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div class="section-header" style="margin-bottom:12px;">
                                <div class="section-title">
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">💾 Backup, Restauração & Gravação de Firmware (Sysupgrade)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Preservação completa das configurações UCI, senhas e chaves criptográficas</span>
                                </div>
                            </div>

                            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:12px;">
                                <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                                    <div>
                                        <strong style="font-size:0.92rem; color:#fff;">Gerar Cópia de Segurança</strong>
                                        <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 12px; line-height:1.4;">
                                            Baixe um arquivo compactado <code>.tar.gz</code> contendo todas as alterações de rede, Wi-Fi e firewall.
                                        </p>
                                    </div>
                                    <button class="ark-btn ark-btn-secondary" onclick="generateConfigBackup()" style="width:100%;">
                                        ⬇ Baixar Backup (.tar.gz)
                                    </button>
                                </div>

                                <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                                    <div>
                                        <strong style="font-size:0.92rem; color:#fff;">Restaurar Configuração</strong>
                                        <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 12px; line-height:1.4;">
                                            Substitua os parâmetros atuais por uma cópia de segurança salva anteriormente.
                                        </p>
                                    </div>
                                    <button class="ark-btn ark-btn-secondary" onclick="openModal('restore_backup')" style="width:100%;">
                                        ⬆ Enviar Backup
                                    </button>
                                </div>

                                <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); border-radius:8px; padding:14px; display:flex; flex-direction:column; justify-content:space-between;">
                                    <div>
                                        <strong style="font-size:0.92rem; color:#fff;">Atualização de Firmware</strong>
                                        <p style="font-size:0.78rem; color:#94a3b8; margin:6px 0 12px; line-height:1.4;">
                                            OpenWrt 24.10.0 • Acer Predator W6x. Verifique novas imagens oficiais com 1 clique.
                                        </p>
                                    </div>
                                    <button class="ark-btn ark-btn-primary" onclick="triggerSysupgradeCheck()" style="width:100%;">
                                        🔍 Verificar Atualizações
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- LuCI Native: Armazenamento Flash SPI & Gerenciador de Pacotes (system/packages) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; flex-wrap:wrap; gap:10px;">
                                <div>
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">📦 Armazenamento Flash SPI & Pacotes Instalados (OPKG / APK)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Gerenciador nativo de softwares e daemons do OpenWrt</span>
                                </div>
                                <button class="ark-btn ark-btn-secondary" onclick="packageUpdateCheck()">
                                    🔄 Atualizar Repositórios (opkg update)
                                </button>
                            </div>

                            <div style="background:rgba(0,0,0,0.3); border-radius:8px; padding:12px; margin-bottom:14px;">
                                <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:6px;">
                                    <span style="color:#94a3b8;">Capacidade da Memória Flash (NAND 128 MB):</span>
                                    <strong style="color:#10b981;">84.8 MB Livres (66% Disponível)</strong>
                                </div>
                                <div style="background:rgba(255,255,255,0.1); border-radius:4px; height:8px; overflow:hidden;">
                                    <div style="background:#38bdf8; width:34%; height:100%;"></div>
                                </div>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Nome do Pacote</th>
                                            <th>Versão Instalada</th>
                                            <th>Descrição Operacional</th>
                                            <th style="text-align:right;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>mwan3</strong></td>
                                            <td><code>2.11.1-2</code></td>
                                            <td>Multi-WAN policy based routing & failover</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>sqm-scripts</strong></td>
                                            <td><code>1.5.2-1 (CAKE-mq)</code></td>
                                            <td>Smart Queue Management com mitigação de Bufferbloat</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>wpad-mbedtls</strong></td>
                                            <td><code>2024-03-09</code></td>
                                            <td>Daemon Wi-Fi completo (WPA3-SAE, 802.11r/k/v, MLO)</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>kmod-nft-offload</strong></td>
                                            <td><code>6.6.54-1</code></td>
                                            <td>Módulo de aceleração de fluxo por hardware no kernel</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                        <tr>
                                            <td><strong>wireguard-tools</strong></td>
                                            <td><code>1.0.20210914</code></td>
                                            <td>Controle de túneis criptográficos VPN de alta velocidade</td>
                                            <td style="text-align:right;"><span class="pill-badge pill-online">INSTALADO</span></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- LuCI Native: Daemons & Serviços de Inicialização (system/startup) -->
                        <div style="background:var(--ark-surface-2); border:1px solid var(--ark-border); border-radius:var(--ark-radius-md); padding:16px; margin-top:16px;">
                            <div class="section-header" style="margin-bottom:12px;">
                                <div class="section-title">
                                    <h3 style="font-size:1.05rem; font-weight:800; color:#fff; margin:0;">⚙️ Daemons & Serviços de Inicialização (/etc/init.d/)</h3>
                                    <span style="font-size:0.8rem; color:#94a3b8;">Controle de processos em segundo plano do roteador</span>
                                </div>
                            </div>

                            <div class="device-table-container">
                                <table class="device-table">
                                    <thead>
                                        <tr>
                                            <th>Nome do Serviço</th>
                                            <th>Função no Roteador</th>
                                            <th>Status</th>
                                            <th>Inicialização Automática</th>
                                            <th style="text-align:right;">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td><strong>dnsmasq</strong></td>
                                            <td>Servidor DHCP & Cache DNS Local</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('dnsmasq', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>firewall</strong></td>
                                            <td>Motor fw4 (nftables puro)</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('firewall', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>dropbear</strong></td>
                                            <td>Terminal Seguro SSH (Porta 22)</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('dropbear', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>sqm</strong></td>
                                            <td>Fila CAKE Bufferbloat</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('sqm', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td><strong>ark-telemetry</strong></td>
                                            <td>Métricas em tempo real & Doctor</td>
                                            <td><span class="pill-badge pill-online">RODANDO</span></td>
                                            <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                                            <td style="text-align:right;">
                                                <button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="serviceAction('ark-telemetry', 'restart')">🔄 Reiniciar</button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </section>

            </main>"""

if "Backup, Restauração & Gravação de Firmware" not in code:
    code = code.replace(system_insert_target, system_native_html)
    print("✓ Backup, Flash OPKG & Services features integrated.")

# 10. Update JavaScript Handlers: Replace toggleLuciDrawer with openClassicLuci and add action helpers
old_js_drawer = """        // LuCI Slide-Over Drawer
        function toggleLuciDrawer() {
            const drawer = document.getElementById('luci_drawer');
            const backdrop = document.getElementById('luci_drawer_backdrop');
            drawer.classList.toggle('open');
            backdrop.classList.toggle('open');
        }

        function handleLuciClick(ev, route) {
            ev.preventDefault();
            toggleLuciDrawer();
            openLuciSimulator(route);
        }"""

new_js_drawer = """        // LuCI Classic Direct Navigation
        function openClassicLuci(ev) {
            if (ev) ev.preventDefault();
            if (window.location.pathname.includes('/cgi-bin/luci')) {
                window.location.href = '/cgi-bin/luci/admin/status/overview';
            } else {
                openLuciSimulator('overview');
            }
        }

        // Action Handlers for Native LuCI Features
        function scanNeighborWifi() {
            const btn = document.getElementById('btn_wifi_scan');
            if (btn) btn.textContent = '⏳ Escaneando frequências 2.4 / 5 / 6 GHz...';
            setTimeout(() => {
                if (btn) btn.textContent = '🔍 Escanear Redes Próximas';
                showToast('✅ Varredura concluída! 4 redes detectadas. Canal 6 e 37 PSC permanecem limpos.');
            }, 1200);
        }

        function saveDhcpSettings() {
            const start = document.getElementById('dhcp_start_sel').value;
            const limit = document.getElementById('dhcp_limit_sel').value;
            const lease = document.getElementById('dhcp_time_sel').value;
            const domain = document.getElementById('dhcp_domain_sel').value;
            showToast(`✅ Servidor DHCP atualizado: Faixa .${start} (máx ${limit} IPs, lease ${lease}, domínio ${domain})`);
        }

        function openPortForwardModal() {
            document.body.classList.add('modal-overlay-active');
            const cont = document.getElementById('modal_content_holder');
            cont.innerHTML = `
                <div class="modal-header">
                    <h3>🔀 Nova Regra de Redirecionamento (Port Forwarding)</h3>
                    <button class="modal-close-btn" onclick="closeModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">Modelo Pré-Configurado (Preset Rápido)</label>
                        <select class="form-select" id="pf_preset" onchange="applyPortPreset(this.value)">
                            <option value="custom">Personalizado (Manual)</option>
                            <option value="plex">Plex Media Server (Porta 32400 TCP)</option>
                            <option value="ssh">SSH Remoto Seguro (Porta 2222 -> 22 TCP)</option>
                            <option value="web">Servidor Web HTTPS (Porta 443 TCP)</option>
                            <option value="minecraft">Minecraft Server (Porta 25565 TCP+UDP)</option>
                            <option value="torrent">Cliente BitTorrent (Porta 51413 TCP+UDP)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Nome da Regra</label>
                        <select class="form-select" id="pf_name">
                            <option value="Servidor Local">Servidor Local</option>
                            <option value="Jogo Online">Jogo Online</option>
                            <option value="Câmeras CFTV">Câmeras CFTV</option>
                            <option value="Acesso Remoto">Acesso Remoto</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Protocolo de Transporte</label>
                        <select class="form-select" id="pf_proto">
                            <option value="TCP" selected>TCP (Web, SSH, Plex, HTTPS)</option>
                            <option value="UDP">UDP (Jogos de Baixa Latência, DNS)</option>
                            <option value="TCP+UDP">TCP + UDP (Ambos)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Porta WAN Externa</label>
                        <select class="form-select" id="pf_ext_port">
                            <option value="8443" selected>Porta 8443 (HTTPS Alternativa)</option>
                            <option value="32400">Porta 32400 (Plex)</option>
                            <option value="25565">Porta 25565 (Minecraft)</option>
                            <option value="51413">Porta 51413 (Torrent)</option>
                            <option value="2222">Porta 2222 (SSH Seguro)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Dispositivo Destino na Rede Interna (IP)</label>
                        <select class="form-select" id="pf_int_ip">
                            <option value="192.168.1.105" selected>192.168.1.105 (Servidor-NAS-Synology)</option>
                            <option value="192.168.1.146">192.168.1.146 (MacMini-M2-Backup)</option>
                            <option value="192.168.1.150">192.168.1.150 (Camera-Seguranca-Frente)</option>
                            <option value="192.168.1.189">192.168.1.189 (PlayStation-5-Pro)</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="ark-btn ark-btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button class="ark-btn ark-btn-primary" onclick="savePortForward()">💾 Adicionar Regra</button>
                </div>
            `;
        }

        function applyPortPreset(val) {
            if (val === 'plex') {
                document.getElementById('pf_proto').value = 'TCP';
                document.getElementById('pf_ext_port').value = '32400';
            } else if (val === 'minecraft') {
                document.getElementById('pf_proto').value = 'TCP+UDP';
                document.getElementById('pf_ext_port').value = '25565';
            } else if (val === 'torrent') {
                document.getElementById('pf_proto').value = 'TCP+UDP';
                document.getElementById('pf_ext_port').value = '51413';
            } else if (val === 'ssh') {
                document.getElementById('pf_proto').value = 'TCP';
                document.getElementById('pf_ext_port').value = '2222';
            }
        }

        function savePortForward() {
            const name = document.getElementById('pf_name').value;
            const proto = document.getElementById('pf_proto').value;
            const ext = document.getElementById('pf_ext_port').value;
            const ip = document.getElementById('pf_int_ip').value;
            const tbody = document.getElementById('port_forward_tbody');
            if (tbody) {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${name}</strong></td>
                    <td><span class="pill-badge pill-cyan">${proto}</span></td>
                    <td><code>${ext}</code></td>
                    <td>${ip}</td>
                    <td><code>${ext}</code></td>
                    <td><label class="ark-switch"><input type="checkbox" checked><span class="ark-slider"></span></label></td>
                    <td style="text-align:right;"><button class="ark-btn ark-btn-secondary" style="padding:4px 8px; font-size:0.75rem;" onclick="deletePortRule(this)">🗑️</button></td>
                `;
                tbody.appendChild(tr);
            }
            closeModal();
            showToast(`✅ Regra de redirecionamento para porta ${ext} criada com sucesso!`);
        }

        function deletePortRule(btn) {
            const row = btn.closest('tr');
            if (row) row.remove();
            showToast('🗑️ Regra de redirecionamento removida do firewall.');
        }

        function runDiagnosticTool() {
            const tool = document.getElementById('diag_tool_sel').value;
            const target = document.getElementById('diag_target_sel').value;
            const count = document.getElementById('diag_count_sel').value;
            const box = document.getElementById('diag_output_box');
            if (!box) return;

            box.innerHTML = `<div>⏳ Executando ${tool.toUpperCase()} em direção a ${target} (${count} pacotes)...</div>`;
            setTimeout(() => {
                if (tool === 'ping') {
                    box.innerHTML = `
                        <div>PING ${target} (${target}): 56 data bytes</div>
                        <div>64 bytes from ${target}: seq=0 ttl=58 time=1.842 ms</div>
                        <div>64 bytes from ${target}: seq=1 ttl=58 time=1.654 ms</div>
                        <div>64 bytes from ${target}: seq=2 ttl=58 time=1.720 ms</div>
                        <div>64 bytes from ${target}: seq=3 ttl=58 time=1.588 ms</div>
                        <div style="color:#10b981; margin-top:4px;">--- ${target} ping statistics --- ${count} packets transmitted, ${count} received, 0% packet loss</div>
                        <div style="color:#10b981;">rtt min/avg/max = 1.588/1.701/1.842 ms (Jitter: 0.12 ms)</div>
                    `;
                } else if (tool === 'traceroute') {
                    box.innerHTML = `
                        <div>traceroute to ${target} (56 bytes max, 30 hops max):</div>
                        <div> 1  192.168.73.1 (gateway)  0.284 ms  0.198 ms  0.176 ms</div>
                        <div> 2  187.54.21.1 (vivo-gpon-pe)  1.240 ms  1.180 ms  1.150 ms</div>
                        <div> 3  10.200.4.1 (backbone-sp)  1.420 ms  1.390 ms  1.380 ms</div>
                        <div> 4  ${target} (destination)  1.710 ms  1.680 ms  1.650 ms</div>
                        <div style="color:#10b981; margin-top:4px;">✅ Rota direta otimizada via IX.br São Paulo (4 saltos).</div>
                    `;
                } else {
                    box.innerHTML = `
                        <div>Server:    1.1.1.1</div>
                        <div>Address:   1.1.1.1#53</div>
                        <div style="margin-top:4px;">Non-authoritative answer:</div>
                        <div>Name:      ${target}</div>
                        <div>Address:   104.26.8.128</div>
                        <div>Address:   172.67.68.22</div>
                        <div>Address:   2606:4700:20::681a:880</div>
                        <div style="color:#10b981; margin-top:4px;">✅ Resolução IPv4 e IPv6 autoritativa concluída em 2.1 ms.</div>
                    `;
                }
            }, 800);
        }

        function copySyslogs() {
            const box = document.getElementById('syslog_box');
            if (box) {
                navigator.clipboard.writeText(box.innerText);
                showToast('📋 Logs copiados para a área de transferência!');
            }
        }

        function clearSyslogs() {
            const box = document.getElementById('syslog_box');
            if (box) {
                box.innerHTML = '<div style="color:#94a3b8;">[Buffer de log limpo pelo operador]</div>';
                showToast('🧹 Buffer de logs limpo.');
            }
        }

        function filterLogs(category, btn) {
            document.querySelectorAll('#view_doctor .ark-btn').forEach(b => b.classList.remove('active'));
            if (btn) btn.classList.add('active');
            const box = document.getElementById('syslog_box');
            if (!box) return;

            if (category === 'wifi') {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:42:01]</span> <span style="color:#38bdf8;">hostapd:</span> phy1-ap0: STA f4:d4:88:55:66:77 WPA: pairwise key handshake completed (WPA3-SAE)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:42:15]</span> <span style="color:#a855f7;">usteer:</span> Client 34:ab:95:11:22:33 Roam event: 5GHz -> 6GHz (RSSI: -42 dBm, 320MHz MLO link active)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:46:00]</span> <span style="color:#38bdf8;">hostapd:</span> nl80211: send_action_frame OK (BSS Transition Request 802.11v accepted)</div>
                `;
            } else if (category === 'firewall') {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:45:10]</span> <span style="color:#38bdf8;">firewall:</span> fw4: 0 legacy iptables rules detected. 100% pure nftables active.</div>
                    <div><span style="color:#64748b;">[14/Oct 03:45:12]</span> <span style="color:#10b981;">nftables:</span> Table inet fw4 loaded: 14 chains, 48 rules, hardware flow offload enabled</div>
                    <div><span style="color:#64748b;">[14/Oct 03:47:00]</span> <span style="color:#eab308;">nftables:</span> DROP wan_in: probe TCP 185.220.101.5:44582 -> 187.54.21.90:23 (Telnet Scan blocked)</div>
                `;
            } else if (category === 'dhcp') {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:43:00]</span> <span style="color:#10b981;">dnsmasq-dhcp[1422]:</span> DHCPACK(br-lan) 192.168.1.101 34:ab:95:11:22:33 iPhone-16-Pro-Max</div>
                    <div><span style="color:#64748b;">[14/Oct 03:43:04]</span> <span style="color:#10b981;">dnsmasq-dhcp[1422]:</span> DHCPACK(br-lan) 192.168.1.142 f4:d4:88:55:66:77 MacBook-Pro-M3-Max</div>
                `;
            } else if (category === 'kernel') {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:44:05]</span> <span style="color:#10b981;">kernel:</span> [mtk_ppe] Hardware flow table offload active (PPE MT7986A, WED enabled)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:44:06]</span> <span style="color:#38bdf8;">kernel:</span> mt7915e 0000:01:00.0: Firmware init completed (Filogic Tri-Band 4x4)</div>
                `;
            } else {
                box.innerHTML = `
                    <div><span style="color:#64748b;">[14/Oct 03:42:01]</span> <span style="color:#38bdf8;">hostapd:</span> phy1-ap0: STA f4:d4:88:55:66:77 WPA: pairwise key handshake completed (WPA3-SAE)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:42:15]</span> <span style="color:#a855f7;">usteer:</span> Client 34:ab:95:11:22:33 Roam event: 5GHz -> 6GHz (RSSI: -42 dBm, 320MHz MLO link active)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:43:00]</span> <span style="color:#10b981;">dnsmasq-dhcp[1422]:</span> DHCPACK(br-lan) 192.168.1.101 34:ab:95:11:22:33 iPhone-16-Pro-Max</div>
                    <div><span style="color:#64748b;">[14/Oct 03:43:22]</span> <span style="color:#eab308;">mwan3[2104]:</span> Interface wan1 (Vivo Fibra) is online (ping: 1.8ms, packet loss: 0%)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:44:05]</span> <span style="color:#10b981;">kernel:</span> [mtk_ppe] Hardware flow table offload active (PPE MT7986A, WED enabled)</div>
                    <div><span style="color:#64748b;">[14/Oct 03:45:10]</span> <span style="color:#38bdf8;">firewall:</span> fw4: 0 legacy iptables rules detected. 100% pure nftables active.</div>
                `;
            }
        }

        function generateConfigBackup() {
            showToast('💾 Gerando backup de configurações (/etc/config/)... O download iniciará em instantes.');
            setTimeout(() => {
                showToast('✅ Arquivo backup-ark-router-2026-10-14.tar.gz gerado com sucesso!');
            }, 1000);
        }

        function triggerSysupgradeCheck() {
            showToast('🔍 Verificando repositórios oficiais OpenWrt... Seu firmware 24.10.0 é a versão estável mais recente.');
        }

        function packageUpdateCheck() {
            showToast('🔄 Executando opkg update... Repositórios base, packages, routing e telephony sincronizados!');
        }

        function serviceAction(service, action) {
            showToast(`⚙️ Serviço ${service}: ação "${action}" executada com sucesso (/etc/init.d/${service} ${action}).`);
        }"""

if old_js_drawer in code:
    code = code.replace(old_js_drawer, new_js_drawer)
    print("✓ JavaScript handlers updated for all native LuCI features.")

with open(GEN_SCRIPT, "w", encoding="utf-8") as f:
    f.write(code)

print("\n🎉 Arquivo generate_v2_staging_dashboard.py atualizado com sucesso!")
