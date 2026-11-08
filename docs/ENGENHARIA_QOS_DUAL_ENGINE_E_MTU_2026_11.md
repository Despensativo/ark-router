# Engenharia de QoS Dual-Engine (`HFSC + FQ-CoDel Turbo` vs `CAKE`), Portas Gamer e Otimização Inteligente de MTU por Perfil da WAN

**Data:** 03 de Novembro de 2026  
**Dispositivo de Homologação ao Vivo:** Acer Predator Connect W6x (`MediaTek Filogic 830 / MT7986A`, 4 Cores @ 2.0 GHz, 1 GB RAM, OpenWrt `25.12.6`, Fibra Simétrica PPPoE `xpon_bridge` `1492B`)  
**Versão do Ecossistema:** `luci-app-ark-router v2.2.1` (introduzido em `v2.1.8-r1`, ativo e canônico em `v2.2.1`)

---

## 1. Visão Geral Arquitetural

Esta documentação consolida de forma canônica todas as implementações, calibrações de kernel, benchmarks A/B ao vivo e lições aprendidas (`✅ [ATIVO]` vs `⛔ [PROIBIDO / ARMADILHA]`) durante a evolução do subsistema de controle de fila (SQM/QoS) e de engenharia de MTU do **ARK Router**.

---

## 2. O Que Deu Certo (`✅ [ATIVO]`) e os Motivos Técnicos no Kernel

### `[AL-ARK-090]` ✅ [ATIVO] — Seletor Inteligente de 2 Motores de QoS (`layer_cake.qos` vs `ark_hfsc_fqcodel.qos`) Calibrado pelo Perfil da WAN
1. **Comportamento no Kernel**:
   - **Motor 1 (`CAKE — Layer Cake Diffserv4`)**: Excelente isolamento automático por host (`dual-srchost` / `dual-dsthost`) e simplicidade em links de até ~500 Mbps, mas concentra todo o escalonamento de pacotes em um único `qdisc` monolítico por direção (`sch_cake`), sofrendo maior contenção de spinlock de CPU acima de `650+ Mbps` em PPPoE.
   - **Motor 2 (`HFSC + FQ-CoDel Turbo — ark_hfsc_fqcodel.qos`)**: Combina curvas de serviço em tempo real determinísticas (`sch_hfsc`) em 3 classes elásticas com escalonamento `sch_fq_codel` independente por classe:
     - **Classe `1:10` (Tempo Real / Jogos / VoIP / DNS / Ping / L4S)**: Curva `rt m1 25% d 1ms m2 8%` + `fq_codel target 2.5ms interval 50ms quantum 300 noecn`. Garante despacho sub-milissegundo (`< 1 ms`) para pacotes interativos sem roubar banda de downloads quando não há jogo ativo.
     - **Classe `1:20` (Interativo & Gigabit Turbo)**: Curva `ls m2 82% ul m2 100%` + `fq_codel target 5ms (egress) / 3.5ms (ingress) quantum 1514 ecn ce_threshold 2.5ms (L4S)`. Permite usar `100%` da banda contratada (`780 Mbps`) quando as filas `1:10` e `1:30` estão ociosas.
     - **Classe `1:30` (Bulk Scavenger — Torrents / P2P / Backups `CS1`)**: Curva `ls m2 10% ul m2 100%` + `fq_codel target 10ms interval 150ms quantum 1514 ecn`.
2. **Calibração Automática por Perfil da WAN**:
   - O script `ark_hfsc_fqcodel.qos` e o módulo `sqm.sh` leem automaticamente `equipe_dashboard.wan_profiles.<wan>` e ajustam `overhead`, `mpu`, `rt_d`, `rt_target` e `turbo_target`:
     - `xpon_vlan` (Fibra GPON/EPON c/ VLAN 802.1Q + PPPoE): `overhead 40 mpu 84`, `rt_d=1ms`, `rt_target=2.5ms`.
     - `xpon_bridge` (Fibra GPON/EPON PPPoE s/ VLAN): `overhead 34 mpu 68`, `rt_d=1ms`, `rt_target=2.5ms`.
     - `dhcp_cable` / `dedicated_static` (Cabo DOCSIS / IPoE): `overhead 22 mpu 64`, `rt_d=2ms`, `rt_target=3ms`.
     - `mobile_starlink` (Starlink / 4G / 5G CGNAT): `overhead 18 mpu 64`, `rt_d=4ms`, `rt_target=5ms/100ms`, `turbo_target=8ms/150ms` (absorve jitter de handover de satélite de 15s sem drops falsos).

---

### `[AL-ARK-091]` ✅ [ATIVO] — Guarda Estrita de Tamanho `<= 511 Bytes` na Via `1:10` (Tempo Real) e no Conntrack `CS4`
1. **Comportamento Oculto**:
   - No pipeline Gigabit do ARK Router, o Plain GRO (`gro_max_size 16384`) agrega pacotes em super-pacotes de até `16 KB` (`15.820 bytes`) para atingir `700+ Mbps` no Wi-Fi 5 GHz (`A-MSDU`).
   - Se qualquer fluxo de teste de velocidade (WebRTC/QUIC) ou download massivo receber marcação `CS4`/`CS5`/`EF` no `ct mark` (por exemplo, porque começou com um pacote de sinalização pequeno `<= 256B`), super-pacotes de `15.820 bytes` entram na fila de Tempo Real `1:10` (cujo teto garantido é `8%` da banda e `quantum 300`), destruindo a fila de voz/jogos e causando `+148 ms` de bufferbloat.
2. **Solução Canônica (✅)**:
   - Em `root/usr/lib/sqm/ark_hfsc_fqcodel.qos`, todos os filtros `tc filter u32` que direcionam tráfego para `1:10` exigem obrigatoriamente comprimento total IP `<= 511 bytes`:
     - IPv4 (`ip_totlen` no offset `2`): `match u16 0x0000 0xfe00 at 2`
     - IPv6 (`ip6_plen` no offset `4`): `match u16 0x0000 0xfe00 at 4`
   - Em `root/etc/nftables.d/15-ark-dscp-priority.nft`:
     - A regra `Restore Conntrack CS4` exige `meta l4proto udp meta length <= 512`.
     - A gravação `Save CS4 to ct mark` roda **antes** da heurística genérica de pacotes UDP pequenos (`<= 256B`), garantindo que apenas portas explícitas de jogos/VoIP persistam `CS4` no Conntrack.

---

### `[AL-ARK-092]` ✅ [ATIVO] — Restrição do Filtro `CS1` (`1:30` Bulk Scavenger) Exclusivamente ao Egress (`pppoe-wan`)
1. **Comportamento Oculto**:
   - No Ingress (`ifb4pppoe-wan`), o redirecionamento `tc mirred` ocorre na entrada da interface WAN, **antes** do hook `prerouting` do `nftables` conseguir lavar (`wash`) marcações DSCP não confiáveis vindas da internet.
   - Diversas CDNs e operadoras entregam fluxos HTTP/3 e testes de velocidade (`bufferspeed.com`, Akamai, Cloudflare) marcados na origem com `DSCP CS1` (`0x20` — Scavenger).
2. **Armadilha (❌)**:
   - Se o `ark_hfsc_fqcodel.qos` aplicar o filtro `u32` de `CS1 -> 1:30` no Ingress (`ifb4pppoe-wan`), downloads legítimos e testes de velocidade são jogados na classe `1:30` (`10%` de peso e `target 10ms`), reduzindo a velocidade de download (ex.: de `679 Mbps` para `505 Mbps`) e elevando a latência carregada em `+15 ms`.
3. **Solução Canônica (✅)**:
   - Em `ark_hfsc_fqcodel.qos`, o filtro `CS1 -> 1:30` só é instanciado quando `[ "$dir_mode" != "ingress" ]` (ou seja, apenas no Upload `pppoe-wan`, depois que o `nftables` classificou explicitamente P2P/BitTorrent local nas portas `6881-6889`/`51413` como `CS1`).

---

### `[AL-ARK-093]` ✅ [ATIVO] — Motor Inteligente de MTU por Perfil da WAN (`br-lan=1500` Fixo + `ra_mtu` + `ark_optimal_wg_mtu` + `RFC 4821 PLPMTUD`)
1. **Princípio de Arquitetura L2 vs L3**:
   - O MTU de camada 2 da `br-lan` e dos rádios Wi-Fi (`phy*-ap*`) permanece estritamente em **`1500 bytes`** (clientes Wi-Fi 802.11ax/be já agregam até `65 KB` via `A-MPDU`/`A-MSDU` no ar sem alterar o MTU Ethernet, e subir `br-lan` para `2000+` causa descartes silenciosos em Smart TVs, celulares e IoT).
   - O ajuste inteligente ocorre **apenas para rotas de Internet e túneis WAN/VPN**:
     - **IPv6 RA MTU (`dhcp.lan.ra_mtu`)**: Sincronizado automaticamente com `ark_get_min_wan_mtu()` (`1492` em PPPoE padrão, `1500` em IPoE/DHCP ou PPPoE Baby Jumbo, ou `< 1500` se um modem 4G/5G reduzir `/sys/class/net/<dev>/mtu`), permitindo que clientes LAN dimensionem pacotes UDP/QUIC (HTTP/3) sem sofrer perda na WAN.
     - **WireGuard (`ark_optimal_wg_mtu`)**: Calcula e sincroniza automaticamente `wg0`, `wgclient` e arquivos `.conf`/QR Code de acordo com o perfil da WAN:
       - `1412 bytes` em Fibra PPPoE `1492B` (`1492 - 80B` de cabeçalho IPv6+UDP+WireGuard, eliminando o estouro de 8 bytes do padrão `1420`).
       - `1420 bytes` em IPoE/Cabo `1500B` ou PPPoE c/ Baby Jumbo `1500B`.
       - `1380 bytes` em `mobile_starlink` / 4G / 5G (`<= 1460B`).
     - **RFC 4821 PLPMTUD (`net.ipv4.tcp_mtu_probing=1` + `net.ipv4.tcp_base_mss=1024`)**: Sempre ativo no kernel para detectar e contornar *PMTU Black Holes* em CGNATs que bloqueiam ICMP *Fragmentation Needed*.
     - **TCP MSS Clamping Dinâmico (`mtu_fix=1`)**: Ativo em todas as zonas `wan*`, `wireguard`, `zerotier` e `tailscale`.

---

## 3. O Que NÃO Deu Certo (`⛔ [PROIBIDO / ARMADILHA]`) e os Motivos no Kernel

### `[AL-ARK-094]` ⛔ [PROIBIDO / ARMADILHA] — Baixar `byte_queue_limits/limit_max` (BQL) para `65536` (64 KB) em MACs MediaTek `mtk_soc_eth` com GSO Ativo
1. **Comportamento Oculto**:
   - Com GSO/TSO e Plain GRO ativos no pipeline Gigabit, o kernel despacha super-pacotes GSO de até **`68.310 bytes`** (`maxpacket 68310` visível em `tc -s qdisc show dev eth0`).
2. **Armadilha (❌)**:
   - Forçar `echo 65536 > /sys/class/net/eth0/queues/tx-0/byte_queue_limits/limit_max` (ou em `eth1`).
3. **Sintoma (Observado no Teste das 12:15 PM)**:
   - Como um único super-pacote GSO (`68.310 B`) é maior que `limit_max` (`65.536 B`), o algoritmo DQL/BQL do kernel trava a fila TX (`netif_tx_stop_queue`) a cada único pacote GSO até que o anel DMA esvazie completamente (micro-stalls de TX).
   - O download despencou de **`679 Mbps` para `126 Mbps`** e o jitter subiu de **`2.1 ms` para `21.2 ms`**.
4. **Solução Canônica (✅)**:
   - Manter `limit_max` no padrão do driver (`1879048192`) em `eth0`/`eth1` e controlar a latência exclusivamente na camada `qdisc` (`sch_hfsc` / `sch_fq_codel` / `sch_cake`) e no `txqueuelen=128` da interface lógica `pppoe-wan`.

---

### `[AL-ARK-095]` ⛔ [PROIBIDO / ARMADILHA] — Incluir Portas STUN (`3478-3480`, `19302-19309`) em `ark_gaming_ports`
1. **Comportamento Oculto**:
   - Medidores modernos de bufferbloat no navegador (`bufferspeed.com`, Waveform WebRTC) utilizam canais de dados WebRTC negociados via STUN nas portas UDP `3478-3480` e `19302-19309`.
2. **Armadilha (❌)**:
   - Classificar `3478-3480` e `19302-19309` como portas de jogos `CS4` e persistir `ct mark 0xa0` sem guarda de tamanho (`<= 512B`).
3. **Sintoma (Observado no Teste das 12:09 PM)**:
   - O fluxo de download/upload de alta velocidade do `bufferspeed.com` herdou `CS4` via Conntrack e foi inteiro despejado na fila de Tempo Real (`1:10`), gerando **`+148 ms` de bufferbloat (Nota C)**.
4. **Solução Canônica (✅)**:
   - Excluir `3478-3480` e `19302-19309` de `ark_gaming_ports` (mantendo-as na regra dedicada de Vídeo `AF41` -> `1:20` / `Video Tin`) e impor `meta length <= 512` e `match u16 0x0000 0xfe00` na via `1:10`.

---

### `[AL-ARK-096]` ⛔ [PROIBIDO / ARMADILHA] — Reduzir `quantum` do `fq_codel` para `300` na Classe `1:20` em Links Gigabit (`>= 200 Mbps`)
1. **Comportamento Oculto**:
   - O escalonador DRR (Deficit Round Robin) do `sch_fq_codel` soma `quantum` créditos por rodada para cada fluxo ativo.
2. **Armadilha (❌)**:
   - Usar `quantum 300` na classe principal de dados (`1:20`) em links Gigabit onde o GRO entrega pacotes de até `16.384 bytes`.
3. **Sintoma (Observado no Teste das 12:45 PM)**:
   - Um pacote GRO de `16 KB` consome `54 rodadas` de crédito (`16384 / 300`), atrasando a alternância DRR entre fluxos concorrentes e elevando o bufferbloat de `+0..2 ms` para `+20 ms`.
4. **Solução Canônica (✅)**:
   - Usar `turbo_quantum=1514` (1 MTU Ethernet completo por rodada) para links `>= 200 Mbps`, reservando `quantum 300` apenas para a fila `1:10` (onde todos os pacotes têm `<= 511 bytes`) ou links lentos (`< 100 Mbps`).

---

### `[AL-ARK-097]` ✅ [ATIVO] — Blindagem do CAKE Ingress (`ifb4*`) contra Envenenamento DSCP do Provedor (`pref 1 skbedit priority ${cake_handle}2` + Guarda `<= 511B`)
1. **Comportamento Oculto no `sch_cake.c` (`diffserv4` + `wash`)**:
   - No kernel Linux (`net/sched/sch_cake.c`), a função `cake_classify()` verifica primeiro `skb->priority`. Se `skb->priority == 0`, ela chama `cake_handle_diffserv(skb, wash)`, que **lê o cabeçalho DSCP vindo da internet para escolher a Tin (`Bulk`, `Best Effort`, `Video`, `Voice`) ANTES de lavar (`wash`) o DSCP para `CS0`**.
   - Quando a operadora ou CDN (Cloudflare, Akamai, `bufferspeed.com`) entrega downloads marcados com `AF3x`/`AF4x`/`CS3` ou `CS1`, o CAKE no `ifb4pppoe-wan` joga até **81% do tráfego de download (`247 MB`) dentro da `Video` Tin (teto de 50% = `390 Mbit`)** causando `1.258+ drops`, além de permitir que `act_ctinfo` sem filtro de tamanho empurre super-pacotes GRO de `16.548 bytes` para a `Voice` Tin (`max_len 16548`).
2. **Solução Canônica (✅)**:
   - Em `ark_apply_ingress_voice_tin_filters()` (`root/usr/lib/ark/modules/sqm.sh`), antes do redirecionamento `prio 10 mirred` para o `ifb4*`:
     1. **`pref 1` (`protocol all`)**: Define `action skbedit priority "${cake_handle}2" continue` (força por padrão todo pacote vindo da WAN para a Tin `Best Effort` de `100%` da banda, neutralizando qualquer DSCP espúrio do provedor).
     2. **`pref 2` (`protocol ip`) e `pref 3` (`protocol ipv6`)**: Promove para `${cake_handle}4` (`Voice` Tin) exclusivamente pacotes interativos de até **`<= 511 bytes`** (`match u16 0x0000 0xfe00`): ICMP, ICMPv6, TCP SYN, TCP PSH `<= 255B`, UDP `<= 255B` e L4S `ECT(1)` `<= 511B`.
     3. **`pref 4` (`protocol ip`) e `pref 5` (`protocol ipv6`)**: Executa `act_ctinfo dscp 0x0000003f 0x00000080` estritamente em pacotes `<= 511 bytes`.
   - **Resultado Medido no Kernel (`ifb4pppoe-wan`)**:
     - `Video` Tin em download pesado caiu de `247,2 MB` (`1.258 drops`) para **`5,1 KB` (`0 drops`)**.
     - `Best Effort` Tin absorveu **`330,0 MB` (`99,95%` do download)** com **`pk_delay` de apenas `10 µs` (`av_delay 2 µs`)**.
     - `Voice` Tin `max_len` caiu de **`16.548 bytes`** para **`300 bytes`** (`0 drops`, `av_delay 12 µs`).

---

### `[AL-ARK-098]` ⛔ [PROIBIDO / ARMADILHA] — Promover `TCP PSH <= 256B` Mid-Stream ou `UDP <= 255B` Genérico (Todas as Portas) para a Fila `1:10` (Real-Time)
1. **Comportamento Oculto (Reordenação Intra-Fluxo TCP e Inundação da Fila `110:`)**:
   - Em conexões TCP de upload/download de alta velocidade (HTTP/2, TLS 1.3, WebSockets), o transmissor envia dezenas de segmentos cheios de `1492 bytes` (que caem na fila `1:20` / `Best Effort`, onde há `2 a 5 ms` de fila sob carga) seguidos do segmento final do registro TLS com a flag `PSH` ativa e tamanho `<= 256 bytes`.
   - Se uma regra promover `TCP PSH <= 256B` para a fila de Tempo Real (`1:10`, que tem `0 ms` de fila), **o último pacote do bloco (`PSH`) ultrapassa os pacotes anteriores (`1492B`) da mesma conexão TCP**! O receptor detecta entrega fora de ordem (*Out-of-Order*), dispara `3x DupACKs (SACK)` e **derruba a janela de congestionamento (`cwnd`) do Upload pela metade**.
   - Simultaneamente, promover `UDP <= 255B` genérico em todas as portas joga **centenas de milhares de pacotes QUIC (`UDP 443`) ACK/controle e fluxos de teste WebRTC** dentro da fila `110:` (`flows 512`).
2. **Armadilha (❌)**:
   - Usar `tcp flags & psh != 0 meta length <= 256 ip dscp set cs5` em `15-ark-dscp-priority.nft` ou `match u8 0x08 0x08 at 33 flowid 1:10` / `match ip protocol 17 0xff match u16 0x0000 0xff00 at 2 flowid 1:10` em `ark_hfsc_fqcodel.qos` e `sqm.sh`.
3. **Sintoma (Observado no Teste das 14:44 PM no `bufferspeed.com`)**:
   - O contador `tc -s qdisc show` revelou **`484.014 pacotes` (`50,8 MB`, `new_flow_count 310.571`) na fila `110:` de Egress** e **`486.848 pacotes` (`52,6 MB`) na fila `110:` de Ingress** durante um único speedtest, elevando o bufferbloat de `+1,2 ms` (`A+`) para `+6,0 ms` (`A`) e limitando o Upload em `145 Mbps` por reordenação TCP.
4. **Solução Canônica (✅)**:
   - Na fila `1:10` (`Voice` / Tempo Real), classificar **exclusivamente**:
     1. **Handshakes TCP de abertura/fechamento (`SYN` / `RST` `<= 128B`)** — nunca `PSH` ou `ACK` mid-stream;
     2. **Sondas de latência `ICMP` / `ICMPv6` (`<= 511B`)**, **`DNS` (`53`/`853`)** e **`NTP` (`123`)**;
     3. **Pacotes `L4S ECT(1)` (`<= 511B`)**, **VoIP/Discord (`50000-50099` `<= 256B`)** e a **matriz explícita de 80+ faixas `ark_gaming_ports` (`<= 512B`)**.
   - Manter `txqueuelen 128` em interfaces virtuais `pppoe*` (que não possuem BQL de hardware) tanto em `sqm.sh` quanto em `ark_hfsc_fqcodel.qos` e `ark-hardware-tune`.
   - **Resultado Medido no Kernel Após Correção**:
     - O volume na fila `110:` durante saturação máxima caiu **99,9%**: de **`486.848 pacotes` (`52,6 MB`)** para apenas **`154 pacotes` (`23 KB` no Ingress) e `358 pacotes` (`43 KB` no Egress)** (`0 drops`, `maxpacket 225B`), e os drops da fila `120:` caíram **96%** (de `969` para `41`).

### `[AL-ARK-099]` ✅ [ATIVO] — Otimização Full-Stack de 6 Camadas (`mac80211 fq_quantum 1514`, `mt76 AQL 6000/1500/3000`, `gso_max_size 16384`, `NAPI 20µs`, `txqueuelen 128` e AQM `3ms/60ms`)
1. **Comportamento Oculto (Filas Fora do `qdisc` WAN que Geravam `+4 a +6 ms` no Wi-Fi)**:
   - Mesmo com o `qdisc` da WAN (`pppoe-wan` / `ifb4pppoe-wan`) mantendo `< 1 ms` de fila, o pacote atravessa outras 5 filas internas no roteador:
     1. **`mac80211` `fq_quantum 12288` (`phy1/aqm`) e `eth0`/`eth1` `quantum 15140`**: Permitia que cada fluxo de download pesado transmitisse 8 a 10 pacotes seguidos dentro da lista prioritária `new_flows` do Wi-Fi e do switch, bloqueando sondas esparsas de ping (`bufferspeed.com` / `waveform.com`).
     2. **`mt76` `aql_threshold=24000` e `BE aql_txq_limit=2500/5000` (`phy1`)**: Como um único cliente Wi-Fi nunca atingia `24 ms` de tempo de ar global, o rádio 5 GHz operava permanentemente no limite alto de **`5.000 µs` (`5,0 ms`) de fila FIFO de hardware** (onde o `fq_codel` de software não alcança).
     3. **`gso_max_size=65536` e `gro_max_size=65536` na `br-lan` e `phy1-ap0`**: Clientes Wi-Fi em upload geravam super-pacotes de `65.480 bytes` (`64 KB`) na ponte LAN, que ao chegar na `pppoe-wan` bloqueavam o link por até `3,6 ms` seguidos.
     4. **`gro_flush_timeout=250000` (`250 µs`) e `napi_defer_hard_irqs=20`** em `pppoe-wan`, `eth0` e `eth1`: Segurava pacotes de baixa latência por `250 µs` por interface (até `+1,0 ms` acumulado).
     5. **Sobrescrita `txqueuelen 1000` em `sqm.sh` (linha 238)**: `ark_sync_gaming_ports_and_bql()` sobrescrevia `txqueuelen 128` da `pppoe-wan` de volta para `1000` ao final do `egress()`.
2. **Solução Canônica (✅)**:
   - **`fq_quantum 1514`** em `/sys/kernel/debug/ieee80211/phy*/aqm` e `quantum 1514 target 2ms interval 50ms` nas sub-filas `mq` de `eth0`/`eth1`.
   - **`aql_threshold=6000` (`6 ms`)** e **`aql_txq_limit` (`VO 1200/2500`, `VI 1800/3500`, `BE 1500/3000`, `BK 1000/2000`)** quando SQM + Modo Gamer estão ativos.
   - **`gso_max_size 16384 gso_ipv4_max_size 16384 gro_max_size 16384 gro_ipv4_max_size 16384`** em `pppoe*`, `ifb4*`, `br-*`, `lan*` e `phy*`.
   - **`gro_flush_timeout=0` / `napi_defer_hard_irqs=0`** em `pppoe*`/`ifb4*` e **`gro_flush_timeout=20000` (`20 µs`) / `napi_defer_hard_irqs=2`** em `eth0`/`eth1` com SQM ativo.
   - **`turbo_target="3ms"` e `turbo_interval="60ms"`** simétricos (Ingress e Egress) para Fibra GPON/XPON (`>= 80 Mbps`), e DNS (`53`) / NTP (`123`) `<= 511B` priorizados diretamente em `u32` bidirecional.
   - Documentação completa de referência: `docs/ENCICLOPEDIA_MASTER_QOS_KERNEL_LINUX_ARK_2026.md`.

---

## 4. Benchmark Comparativo A/B ao Vivo no `192.168.73.1` (`HFSC + FQ-CoDel Turbo` vs `CAKE`)

Medições reais executadas no Acer Predator Connect W6x (`780 Mbps` configurados no SQM sobre Fibra PPPoE `xpon_bridge`, `MTU 1492`, `ra_mtu 1492`, `wgclient MTU 1412`, `sqm_gaming_ports=1`) sob saturação multi-stream simultânea:

| Métrica Auditada | Motor 2: `HFSC + FQ-CoDel Turbo` (`ark_hfsc_fqcodel.qos`) | Motor 1: `CAKE Diffserv4` (`layer_cake.qos` c/ Fix `pref 1`) | Análise Técnica |
| :--- | :---: | :---: | :--- |
| **Throughput Download (Burst/Wire)** | **`823.9 Mbps`** (`679–693 Mbps` no `bufferspeed.com`) | `754.5 Mbps` | O HFSC usa curva `ul m2 100%` elástica sem overhead de hash `dual-dsthost` por pacote, entregando ~9% mais vazão de pico. |
| **Throughput Upload (Multi-stream)** | **`148.3 Mbps`** | `97.0 Mbps` | Menor contenção de lock em `sch_hfsc` + `sch_fq_codel` no envio multi-conexão. |
| **Ping ICMP Carregado (Download)** | **`4.73 ms` méd** (`P95 5.55 ms`, jitter **`0.27 ms`**, `0%` perda) | **`4.53 ms` méd** (`P95 4.93 ms`, jitter **`0.26 ms`**, `0%` perda) | Empate técnico em excelência (`+0 ms` de bufferbloat real e jitter sub-milissegundo em ambos). |
| **Ping ICMP Carregado (Upload)** | **`5.18 ms` méd** (`P95 6.29 ms`, jitter **`0.67 ms`**, `0%` perda) | **`4.74 ms` méd** (`P95 5.46 ms`, jitter **`0.48 ms`**, `0%` perda) | Ambos mantêm latência cravada em `~5 ms` sob upload pesado. |
| **Sonda Gamer UDP (`<=128B` Porta `27015+`) em Download** | **`11.17 ms` méd** (`+0.86 ms` vs idle `10.31 ms`, `0%` perda) | **`10.84 ms` méd** (`+0.0 ms` vs idle `12.06 ms`, `0%` perda) | Ambos isolam 100% dos pacotes UDP de jogos na fila de Tempo Real / Voice sem perda de pacotes. |
| **Pacotes na Fila Real-Time (`110:`) durante Speedtest** | **`154 pkts` (`23 KB` Ingress) / `358 pkts` (`43 KB` Egress)** | **`Voice` Tin `max_len 300B`** (`0 drops`) | Isolamento cirúrgico: zero vazamento de fluxos de dados ou QUIC/TCP `PSH` na via rápida. |
| **Vazamento `CS1` (Scavenger) no Ingress (`ifb4pppoe-wan`)** | **`0 bytes` / `0 pkts`** | **`0 bytes` / `0 pkts`** | 100% imune a marcações `CS1` espúrias de CDNs/ISPs. |
| **Uso de CPU (`CPU0` / `CPU1` / `CPU2` / `CPU3`)** | `47.4%` / `49.0%` / `9.7%` / `33.6%` | `46.4%` / `52.5%` / `6.5%` / `29.8%` | Mais de **50% de folga de CPU** em todos os 4 núcleos em ambos os motores. |


