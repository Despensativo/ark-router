# Matriz de Módulos e Perfis de Hardware — ARK Router

Este documento detalha todos os módulos ativos do ARK Router, suas dependências, requisitos de hardware (CPU, RAM, Flash e Arquitetura), regras de visibilidade na interface web (LuCI SPA) e matriz de compatibilidade por categoria de dispositivo.

---

## 1. Visão Geral da Arquitetura Modular

O ARK Router adota uma arquitetura em camadas otimizada para sistemas embarcados rodando OpenWrt (BusyBox ash + LuCI JavaScript SPA):

1. **Módulos Core (Integrados)**:
   - Dashboard unificado (`/www/luci-static/resources/view/equipe-dashboard/overview.js`).
   - Monitor de status, interfaces de rede, firewall e Wi-Fi básico.
   - Diagnósticos integrados (Ping, Traceroute, MTR, DNS Benchmark).
   - Starlink Orchestration (diagnóstico e alinhamento via API gRPC local).
   - Hot-Refresh sem recarregamento destrutivo de página.

2. **Módulos Opcionais / Pacotes de Sistema**:
   - Instaláveis via APK/OPKG sob demanda ou pré-integrados na imagem da ROM.
   - Suportam detecção dinâmica: a interface verifica a presença do pacote e só ativa o painel correspondente quando o backend está operacional.

3. **Módulos Temporários em RAM (`/tmp`)**:
   - Binários auxiliares que não desgastam a memória flash (NAND/SPI NOR), como `speedtest-go` ou o cliente de telemetria `starlink-dish` na versão Lite.

---

## 2. Matriz Completa de Módulos

| Chave Interna | Pacote OpenWrt | Serviço / Daemon | Tipo | Requisito Mínimo | Comportamento / Regra de Visibilidade |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sqm` | `luci-app-sqm` + `sqm-scripts` + `kmod-sched-cake` | `/etc/init.d/sqm` | Opcional | RAM: 128 MB<br>Overlay: ~120 KB | Disponível em todos os perfis. Gerenciador inteligente de fila CAKE para eliminação de Bufferbloat. |
| `mwan3` | `luci-app-mwan3` + `mwan3` | `/etc/init.d/mwan3` | Opcional | RAM: 128 MB<br>Overlay: ~180 KB | Multi-WAN / Failover / Balanceamento. Ao instalar via EZ Setup, o serviço é mantido desligado até configuração explícita. |
| `nlbwmon` | `luci-app-nlbwmon` + `nlbwmon` | `/etc/init.d/nlbwmon` | Opcional | RAM: 128 MB (~1 MB RSS)<br>Overlay: ~80 KB | Estatísticas de tráfego por dispositivo e MAC em tempo real com gráfico de consumo. |
| `upnp` | `luci-app-upnp` + `miniupnpd-nftables` | `/etc/init.d/miniupnpd` | Opcional | RAM: 128 MB (~1.2 MB RSS)<br>Overlay: ~200 KB | Abertura automática de portas para consoles e jogos (UPnP / NAT-PMP). |
| `irqbalance` | `irqbalance` | `/etc/init.d/irqbalance` | Opcional (Dinâmico) | CPU: **> 1 núcleo**<br>RAM: 128 MB<br>Overlay: ~120 KB | **Oculto em CPUs single-core**. Exibido apenas em roteadores com 2 ou mais núcleos para distribuir interrupções de rede entre os núcleos da CPU. |
| `wireguard` | `wireguard-tools` + `kmod-wireguard` | Kernel module | Opcional | RAM: 128 MB<br>Overlay: ~150 KB | Túnel VPN de altíssima performance e baixo consumo de CPU. |
| `tailscale` | `tailscale` | `/etc/init.d/tailscale` | Opcional | RAM: 256 MB<br>Overlay: ~15 MB | Rede mesh WireGuard corporativa/pessoal sem necessidade de IP público. Requer arquitetura suportada (aarch64, x86, mips). |
| `zerotier` | `zerotier` | `/etc/init.d/zerotier` | Opcional | RAM: 256 MB (~8 MB RSS)<br>Overlay: ~1 MB | VPN peer-to-peer leve para acesso remoto. |
| `speedtest` | `speedtest-go` | Executável em `/tmp` | Volátil / RAM | RAM livre em `/tmp`: **>= 25 MB** | O executável é baixado para a RAM temporária ou embutido na ROM (Full). Não desgasta a memória flash. |
| `speedify` | `speedify` | `/usr/share/speedify` | Proprietário | RAM: 256 MB - 512 MB<br>Armazenamento: 80 MB+ | Bonding de múltiplos links de internet (WAN + Wi-Fi + 4G). Suporta instalação em RAM, Overlay interno ou pen drive USB externo. |
| `argon` | `luci-theme-argon` | Tema LuCI | Cosmético | Overlay: ~500 KB | Tema moderno escuro para a interface nativa do LuCI. Opcional. |
| `adblock` | Integrado via `dnsmasq` / `adguardhome` | `dnsmasq` / `/tmp/adguardhome` | Integrado | RAM: 128 MB (Cloud Anycast)<br>RAM: 512 MB+ (AdGuard Home RAM) | Em aparelhos de 128 MB opera em modo Cloud Anycast (zero consumo local de CPU/RAM). Em 512 MB+ permite AdGuard Home em RAM na porta 3000. |
| `hardware-tune` | Integrado no ARK Router | `/etc/init.d/ark-hardware-tune` | Core / Sistema | RAM: Universal<br>Flash: 0 KB (Shell puro) | Calibração adaptativa de rede: escala buffers, RPS (multi-core), RFS, txqueuelen e regras DSCP Zero-Drop de acordo com o hardware. |

> [!NOTE]
> **HTTPS / uHTTPd**: Anteriormente listado como pacote opcional, o `uhttpd` é componente nativo do OpenWrt base. Foi consolidado no núcleo e removido da lista de pacotes dinâmicos do EZ Setup, eliminando falhas de pacote inexistente no instalador.

---

## 3. Perfis de Hardware e Orçamento de Recursos

### Perfil 1: Ultra-Lite (128 MB RAM / 16 MB Flash SPI NOR)
- **Dispositivos Típicos**: D-Link DGL-5500, TP-Link Archer C7 v2/v5, roteadores Atheros/MediaTek de 1ª geração.
- **CPU**: 1 núcleo (MIPS 500-750 MHz).
- **Orçamento de RAM**:
  - RAM Total: 128 MB.
  - Alvo operacional: **> 80 MB de RAM livre** em repouso.
- **Orçamento de Flash**:
  - Flash SPI NOR: 16 MB.
  - Alvo operacional: **> 2 MB livres no `/overlay`**.
- **Módulos Permitidos / Recomendados**:
  - `sqm` (CAKE com `autorate_ingress` econômico).
  - `nlbwmon` (com retenção enxuta em `/tmp`).
  - `upnp` (se houver jogos locais).
  - Bloqueio de anúncios: **Modo Cloud Anycast** (via NextDNS / AdGuard DNS / CleanBrowsing).
- **Módulos Restritos / Desativados**:
  - `irqbalance`: Desativado (CPU de 1 núcleo).
  - `speedtest-go`: Evitar na flash; executar apenas sob demanda na RAM se `/tmp` tiver >= 25 MB livres.
  - `tailscale` e `speedify`: Não recomendados devido ao consumo de RAM (> 25 MB).
  - `AdGuard Home Local`: Bloqueado (causaria Out-Of-Memory).
- **Calibração de Hardware (`ark-hardware-tune`)**:
  - Buffers de rede leves: `netdev_max_backlog=1000`, `netdev_budget=300`, `tcp_rmem/wmem=1MB`.
  - Qdisc econômico: `fq_codel memory_limit 2Mb limit 1024 target 5ms`.
  - RPS desativado (zero overhead em CPU mono-core).
  - Compatibilidade pura com firewall legado `fw3 / iptables` (Regras DSCP CS6/CS5 injetadas nativamente sem invocar `fw4`).

---

### Perfil 2: Balanced / Mainstream (256 MB a 512 MB RAM / 128 MB+ Flash NAND)
- **Dispositivos Típicos**: Cudy WR3000 v1, GL.iNet MT3000 (Beryl AX), TP-Link Archer AX23, roteadores MediaTek MT7981 (Filogic 820) / MT7621.
- **CPU**: 2 a 4 núcleos (Cortex-A53 1.3 GHz ou MIPS 1004Kc dual-core / quad-thread).
- **Orçamento de RAM**:
  - RAM Total: 256 MB a 512 MB.
  - Alvo operacional: **> 60 MB de RAM livre**.
- **Módulos Permitidos / Recomendados**:
  - Todos do perfil Ultra-Lite.
  - `irqbalance`: **Recomendado e Ativo** (distribui interrupções de WAN e Wi-Fi 6 entre os núcleos).
  - `mwan3`: Multi-WAN com balanceamento de carga e failover automático de 2 a 3 provedores.
  - `wireguard`: Servidor ou cliente VPN com throughput de 300-800 Mbps.
  - `zerotier` / `tailscale`: Suportados confortavelmente.
  - `speedtest-go`: Executável volátil em RAM ou instalado na flash.
  - TCP Turbo: Buffers estendidos para conexões Gigabit de baixa latência.
- **Calibração de Hardware (`ark-hardware-tune`)**:
  - Buffers balanceados: `netdev_max_backlog=5000`, `netdev_budget=300`, `tcp_rmem/wmem=4MB`.
  - Qdisc intermediário: `fq_codel memory_limit 8Mb limit 10240 target 5ms` em subfilas `mq`.
  - `txqueuelen = 1500`.
  - RPS distribuído em 2 núcleos (máscara `3`) e RFS com 16.384 entradas de fluxo.

---

### Perfil 3: High Performance / Quad-Core (512 MB a 1.5 GB RAM / 4 a 6 núcleos)
- **Dispositivos Típicos**: Acer Predator W6x (MT7986 Quad-Core 2.0 GHz, 1 GB RAM), Banana Pi BPI-R3, GL.iNet GL-MT6000 (Flint 2).
- **CPU**: 4 a 6 núcleos (Cortex-A53 2.0 GHz).
- **Orçamento de RAM**: 1 GB a 1.5 GB.
- **Calibração de Hardware (`ark-hardware-tune`)**:
  - Buffers de alto desempenho: `netdev_max_backlog=10000`, `netdev_budget=600`, `tcp_rmem/wmem=8MB`.
  - Multi-Queue de 16 subfilas com `fq_codel memory_limit 16Mb limit 20480 target 5ms`.
  - `txqueuelen = 2048` para eliminar requeues sob rajadas pesadas de tráfego.
  - RPS dinâmico distribuído em todos os núcleos da CPU (máscara `f` para 4 cores, `3f` para 6 cores).
  - RFS com 32.768 entradas de fluxo (`rps_sock_flow_entries=32768`, `rps_flow_cnt=4096`).
  - Nftables DSCP Zero-Drop (`15-ark-dscp-priority.nft`) direcionando ICMP/DNS para o tin Voice do CAKE em < 10 µs.

---

### Perfil 4: Ultra-Spec / Enterprise / x86 Multi-Gigabit (RAM > 1.5 GB ou $\ge$ 8 núcleos)
- **Dispositivos Típicos**: Mini PCs x86_64 (Intel N100 / N305, Core i5/i7/i9, AMD Ryzen), Servidores Bare Metal / Proxmox / ESXi, Banana Pi BPI-R4 (MediaTek MT7988A Quad-Core 2.6 GHz, 4 GB RAM, 2x 10GbE SFP+).
- **CPU**: 4 a 64 núcleos de altíssima velocidade.
- **Orçamento de RAM**: 2 GB a 64 GB+.
- **Calibração de Hardware (`ark-hardware-tune`)**:
  - **Cálculo Matemático Dinâmico de Bitmask**: A máscara de CPU para RPS é calculada dinamicamente para qualquer quantidade $N$ de núcleos (`ff` para 8 cores, `fff` para 12, `ffff` para 16, `ffffffff` para 32, até 64 cores).
  - **Buffers Gigantes para Alto BDP (Bandwidth-Delay Product)**:
    - RAM 2 GB a 3.5 GB: `tcp_rmem/wmem = 16MB`, `txqueuelen = 4096`, `netdev_max_backlog = 25000`, `fq_codel memory_limit 32Mb limit 40960`.
    - RAM 4 GB+: `tcp_rmem/wmem = 32MB`, `txqueuelen = 8192`, `netdev_max_backlog = 50000`, `netdev_budget = 1000`, `fq_codel memory_limit 64Mb limit 65536`.
  - **RFS Expandido**: **65.536 a 131.072 fluxos** (`rps_sock_flow_entries=65536..131072`, `rps_flow_cnt=8192..16384`), garantindo saturação real de placas de 2.5 Gbps, 10 Gbps e 25 Gbps com zero latência.
  - Multi-Queue de até 32 subfilas independentes para portas Ethernet de alta velocidade (`eth*`, `lan*`, `en*`, `igb*`, `ixgbe*`, `i40e*`).

---

## 4. Comportamento do EZ Setup (Passo 8: Recursos Opcionais)

O assistente **Ark - Setup (EZ Setup)** foi desenhado para facilitar a primeira configuração de qualquer roteador:

1. **Detecção Automática**:
   - O assistente lê as capacidades do roteador (`sys.capabilities`).
   - Avalia a quantidade de núcleos da CPU: se `cpu_cores > 1`, inclui o módulo `irqbalance` dinamicamente na lista de opções.
2. **Filtragem de Pacotes Já Presentes**:
   - Cada módulo marcado como presente na ROM exibe o badge verde `✓ Já instalado` e tem sua seleção desabilitada.
   - Quando todos os módulos opcionais já estiverem presentes (como em compilações completas ou builds customizadas), o botão *"Instalar módulos selecionados"* é automaticamente ocultado, exibindo a mensagem:
     `✓ Todos os módulos recomendados já estão integrados e prontos para uso.`
3. **Instalação Segura em Segundo Plano**:
   - Ao clicar em *"Instalar módulos selecionados"*, o roteador executa o script `/usr/sbin/equipe-dashboard-control ez-setup-install-modules`.
   - O processo atualiza os índices de pacotes (`apk update` ou `opkg update`) e instala apenas os módulos marcados.
   - **Trava de Segurança Multi-WAN**: Se o pacote `mwan3` for instalado durante este processo, o script executa imediatamente `/etc/init.d/mwan3 stop` e `/etc/init.d/mwan3 disable`. Isso impede que o mwan3 bloqueie o tráfego da internet até que o usuário configure conscientemente suas regras de roteamento.

---

## 5. Matriz de Decisão Rápida para Suporte e Operação

| Situação | Ação Recomendada |
| :--- | :--- |
| Dispositivo com 128 MB RAM (D-Link DGL-5500) | Manter perfil Lite. Não instalar AdGuard Home local. Usar SQM CAKE e Cloud Anycast DNS. |
| CPU com 1 núcleo | O módulo IRQ Balance não deve ser instalado nem exibido no painel. |
| CPU com 2+ núcleos (Cudy WR3000, x86) | Ativar IRQ Balance para otimizar distribuição de pacotes e temperatura da CPU. |
| Flash interna com menos de 2 MB livres | Bloquear novas instalações no overlay. Rodar speedtest apenas em RAM. |
| Conexão Starlink conectada em WAN secundária | Usar módulo nativo Starlink; telemetria AArch64 carrega em RAM na versão Lite. |
| Roteador x86 sem rádio Wi-Fi | Abas de Wi-Fi e Band Steering são ocultadas automaticamente pelo dashboard. |