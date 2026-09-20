# ARK Router — Diagnósticos de Rede & Dual OpenWrt

Diretrizes de compatibilidade com múltiplas gerações do OpenWrt, mitigação de bufferbloat e auditoria do sistema.

---

## 1. Dual OpenWrt Architecture (Legado vs. Moderno)
O ARK Router deve manter compatibilidade entre as duas famílias:

| Recurso | OpenWrt 19.07 a 23.05 (Legado) | OpenWrt 24.x a 25.x (Moderno) |
| :--- | :--- | :--- |
| **Gerenciador de Pacotes** | `opkg` (`/etc/opkg.conf`) | `apk` (`/etc/apk/`) |
| **Mecanismo de Firewall** | `iptables` / `firewall3` | `nftables` / `firewall4` |
| **Renderização LuCI** | Tabelas HTML tradicionais | Views JavaScript (`L.view.extend`) |
| **Regra Obrigatória** | Detectar dinamicamente (`which apk opkg`) | Detectar dinamicamente (`nft` vs `iptables`) |

---

## 2. SQM, Baby Jumbo Frames & Conflitos de Aceleração
1. **SQM em Conexões PPPoE**:
   - Em conexões PPPoE, o SQM **deve ser associado à interface lógica L3** (`pppoe-wan`), nunca à interface física (`eth1`).
   - Se for associado à interface física, a modelagem de tráfego falha e gera latência oculta.
2. **Baby Jumbo Frames (MTU 1508)**:
   - Para conexões PPPoE com MTU 1500, a interface física pai precisa operar com MTU 1508 (`config device 'wan_dev'`).
   - Deve ser configurada de forma atômica e persistente no `/etc/config/network`.
3. **Conflito Flow Offloading vs SQM**:
   - Software/Hardware Flow Offloading bypassa as filas do Linux e impede o controle de bufferbloat do SQM (CAKE / FQ-CoDel). O ARK Router deve priorizar ou conciliar de forma segura.

---

## 3. Utilitário ARK Doctor (Auditoria e Auto-Cura)
- **Comando CLI**: `/usr/sbin/ark-doctor`
- **Comando Backend RPC**: `/usr/sbin/equipe-dashboard-control audit-system [--fix]`
- **Itens Auditados**:
  - Memória RAM livre (> 128 MB / > 256 MB).
  - Espaço livre no `/overlay` (> 2 MB).
  - Associação correta do SQM com L3 em PPPoE.
  - Persistência de MTU 1508 em Baby Jumbo Frames.
  - Conflitos de Flow Offload vs SQM.
- **Auto-Cura (`--fix`)**:
  - Corrige automaticamente interfaces SQM órfãs e recarrega os serviços.

---

## 4. Latência Interna Zero-Drop & Calibração de Hardware (`ark-hardware-tune`)

### A. Diagnóstico de Gargalos Físicos de Switch LAN (`eth0`)
Em SoCs modernos (como MediaTek Filogic MT7986 / MT7981), o hardware do switch LAN expõe frequentemente múltiplas filas de transmissão (ex: 16 TX queues), mas **apenas 1 fila física de recepção (`numrxqueues 1`)**:
1. **Sobrecarga de Núcleo Único**: Sem RPS configurado adequadamente, todas as interrupções de recepção de LAN caem em uma única CPU, gerando fila e elevando a latência de ICMP/DNS de 0ms para 5-15ms durante rajadas de download/torrent.
2. **Requeues no Driver (`NETDEV_TX_BUSY`)**: `txqueuelen` padrão (1000) gera centenas de milhares de requeues sob conexões maciças com janelas TCP ampliadas (Baby Jumbo MSS 1460).

### B. Solução Zero-Drop com DSCP
O ARK Router aplica regras de priorização em nível de kernel (`15-ark-dscp-priority.nft`):
- **ICMP / ICMPv6 Ping Echo & Reply**: `CS6` (Network Control / Latência Mínima).
- **DNS (portas 53, 853, 5353)**: `CS6`.
- **TCP Connection Control (SYN, RST, FIN)**: `CS5`.

O agendador **CAKE** (`diffserv4`) despacha pacotes marcados no tin **Voice** em < 10 µs, sem necessidade de limitar ou dropar conexões pesadas de dados (`Zero-Drop`).

### C. Calibração Adaptativa Multi-Tier
O serviço `/etc/init.d/ark-hardware-tune` escala dinamicamente:
- **Low-Spec ($\le$ 192 MB RAM / 1 Core)**: `rmem/wmem 1MB`, `fq_codel 2Mb limit 1024`, zero RPS (sem sobrecarga de interrupções mono-core), regras `iptables / fw3` nativas.
- **Mid-Spec (192 MB - 512 MB RAM / 2 Cores)**: `rmem/wmem 4MB`, `txqueuelen 1500`, RPS em 2 núcleos (máscara 3), RFS 16k fluxos.
- **High-Spec (512 MB - 1.5 GB RAM / 4 a 6 Cores)**: `rmem/wmem 8MB`, `txqueuelen 2048`, RPS em todos os 4 a 6 núcleos (máscara dinâmica `f` ou `3f`), RFS com 32.768 fluxos (`rps_sock_flow_entries = 32768`, `rps_flow_cnt = 4096`), `netdev_budget = 600`.
- **Ultra-Spec / Enterprise (RAM > 1.5 GB ou $\ge$ 8 Cores - x86/ARM64 10GbE)**:
  - Máscara RPS calculada matematicamente para qualquer quantidade $N$ de núcleos (`ff` para 8 cores, `fff` para 12, `ffff` para 16, `ffffffff` para 32, até 64 cores).
  - Buffers TCP escalados até 32 MB para conexões de 2.5 Gbps / 10 Gbps / 25 Gbps.
  - `txqueuelen` ampliado para 4096 a 8192.
  - RFS com 65.536 a 131.072 entradas de fluxo (`rps_flow_cnt = 8192..16384`) e `netdev_max_backlog` até 50.000.

