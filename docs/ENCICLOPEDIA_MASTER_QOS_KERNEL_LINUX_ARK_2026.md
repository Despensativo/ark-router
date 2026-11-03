# Enciclopédia Master de Engenharia QoS, AQM, L2/L3 e Wi-Fi Airtime no Kernel Linux 6.12 (ARK Router)

> **Escopo deste Documento**: Mapeamento exaustivo de **100% dos parâmetros existentes de QoS, Traffic Control (`tc`), Active Queue Management (`AQM`), `nftables` DiffServ, Conntrack, NAPI/GRO/GSO e Wi-Fi 6 (`mac80211`/`mt76` AQL)** no Kernel Linux 6.x / OpenWrt 24.10–25.x, explicando a matemática interna do código-fonte do kernel (`net/sched/sch_hfsc.c`, `sch_fq_codel.c`, `sch_cake.c`, `sch_api.c`, `act_ctinfo.c`, `net/core/dev.c`, `net/mac80211/tx.c`), a calibração dinâmica por perfil da WAN e as otimizações exclusivas implementadas no **ARK Router**.

---

## 1. Visão Geral da Pilha de Latência Fim a Fim (As 6 Camadas do QoS)

Para atingir **Nota A+ (`+0 a +2 ms` de Bufferbloat)** mantendo **100% da velocidade contratada** tanto no cabo quanto no Wi-Fi, não basta configurar apenas um `qdisc` na WAN. O pacote atravessa **6 filas distintas** dentro do roteador; se **qualquer uma** delas acumular `5 ms`, o teste de bufferbloat registrará atraso:

```
[Cliente Wi-Fi/LAN]
   │  1. Camada Wi-Fi MAC80211 (fq_codel por TID: fq_quantum, fq_limit) + MT76 Hardware FIFO (aql_txq_limit, aql_threshold)
   ▼
[Ponte LAN e Switch DSA (br-lan / phy*-ap* / lan1..4 / eth0)]
   │  2. Camada de Segmentação/Coalescência (gro_max_size, gso_max_size, gro_flush_timeout, napi_defer_hard_irqs)
   │  3. Sub-filas Hardware MQ da Porta Ethernet (eth0/eth1 mq -> fq_codel quantum, target, interval, BQL limit_max)
   ▼
[Motor de Classificação L3/L4 (nftables inet fw4 + Conntrack + tc u32 + act_ctinfo + act_skbedit)]
   │  4. Marcação DSCP Zero-Drop (CS6/CS5/CS4/AF41/CS0/CS1), ct mark 0x80|DSCP e Blindagem Ingress contra DSCP do ISP
   ▼
[Modelador WAN Egress (pppoe-wan / eth1) & Ingress (ifb4pppoe-wan / ifb4eth1)]
   │  5. Motor 2 (HFSC + FQ-CoDel Turbo: rt/ls/ul m1-d-m2 + fq_codel) OU Motor 1 (CAKE Diffserv4 + COBALT)
   │  6. Enquadramento Físico L1/L2 (tc-stab / overhead 44B PPPoE GPON / 34B VLAN / 18B Ethernet, mpu 64, txqueuelen 128)
   ▼
[ONT / OLT da Operadora / Internet]
```

---

## 2. Catálogo Completo de Parâmetros: Motor 2 — `HFSC + FQ-CoDel Turbo` (`ark_hfsc_fqcodel.qos`)

### 2.1. Parâmetros do Escalonador Hierárquico `sch_hfsc` (`net/sched/sch_hfsc.c`)

O **HFSC (Hierarchical Fair Service Curve)** é o único escalonador do kernel Linux capaz de **desacoplar matematicamente a garantia de atraso (latência em milissegundos) da alocação de largura de banda**, mantendo 3 árvores Rubro-Negras internas (`eltree` para tempo real, `vttree` para compartilhamento justo e `cftree` para teto máximo).

| Parâmetro HFSC | O que faz no Kernel (`sch_hfsc.c`) | Fórmula / Curva Matemática | Valor Otimizado no ARK Router |
| :--- | :--- | :--- | :--- |
| **`default <classid>`** | Define a classe folha padrão para pacotes não capturados por filtros `tc filter` (`CS0` / Best Effort). | Redirecionamento direto sem custo de CPU extra. | **`default 20`** (Classe `1:20` — `FQ-CoDel Turbo`). |
| **`sc` (Service Curve)** | Define simultaneamente `rt` e `ls` com a mesma curva na classe raiz `1:1`. | $S(t) = r \cdot t$ | **`sc rate ${rate}kbit`** na classe `1:1` (100% da velocidade configurada). |
| **`rt` (Real-Time Criterion)** | Árvore de Elegibilidade (`eltree`). Garante por contrato matemático que os pacotes da classe `1:10` sejam transmitidos com atraso máximo $d$, independentemente da carga nas classes `1:20` e `1:30`. | Curva côncava de 2 segmentos: inclinação inicial $m_1$ durante o tempo de explosão $d$, seguida da taxa sustentável $m_2$. | Na classe **`1:10`** (Tempo Real):<br>• **$m_1 = 2 \times m_2$** (`40%` da banda total)<br>• **$d = 1\text{ ms}$** (Fibra), **$2\text{ ms}$** (DOCSIS), **$4\text{ ms}$** (Starlink)<br>• **$m_2 = 20\%$** da banda (`25%` Starlink, `30%` Cabo Assimétrico). |
| **`ls` (Link-Sharing Criterion)** | Árvore de Tempo Virtual (`vttree`). Distribui de forma elástica (Work-Conserving) toda a banda ociosa entre as classes ativas na proporção exata de suas inclinações $m_2$. | Se `1:10` e `1:30` estiverem ociosas, **`1:20` recebe 100% da banda da classe pai `1:1`** instantaneamente. | • **`1:10`**: `ls m2 20%`<br>• **`1:20`**: `ls m2 70%` (absorve 100% quando `1:10`/`1:30` ociosas)<br>• **`1:30`**: `ls m2 10%` (absorve até 100% apenas se a rede estiver ociosa). |
| **`ul` (Upper-Limit Criterion)** | Árvore de Limite Superior (`cftree`). Impede que uma classe ultrapasse a velocidade física do link (`rate`), forçando o enfileiramento a ocorrer dentro do `fq_codel` do roteador e nunca no modem/ONT. | Teto rígido $U(t) = R_{\text{max}} \cdot t$. | **`ul rate ${rate}kbit`** (`100%` da taxa configurada em `1:1`, `1:10`, `1:20` e `1:30`). |

---

### 2.2. Parâmetros do AQM `sch_fq_codel` (`net/sched/sch_fq_codel.c` & `include/net/codel_impl.h`)

Cada classe folha do HFSC (`1:10`, `1:20`, `1:30`) utiliza uma instância dedicada do **`fq_codel`**, que combina **1.024 filas de hash estocástico (DRR — Deficit Round Robin)** com **prioridade automática para fluxos esparsos (`new_flows` vs `old_flows`)** e controle de atraso por **tempo de permanência na fila (*sojourn time*)**.

| Parâmetro `fq_codel` | Mecânica Interna no Kernel (`sch_fq_codel.c`) | Armadilha Comum (❌) | Calibração Master no ARK Router (✅) |
| :--- | :--- | :--- | :--- |
| **`limit <PACKETS>`** | Número máximo absoluto de pacotes em todas as sub-filas. | Deixar baixo (`1000`) em links Gigabit causa `tail drop` em rajadas antes do CoDel atuar. | • `110:` (Real-Time): **`2048p`**<br>• `120:` (Turbo): **`10240p`**<br>• `130:` (Bulk): **`4096p`** |
| **`flows <NUMBER>`** | Número de buckets de hash 5-tupla (`src/dst IP, src/dst port, proto`) com sal aleatório (`perturbation`). | Usar poucos fluxos (`128`) aumenta colisões de hash entre downloads e sondas de ping. | • `110:`: **`512` fluxos**<br>• `120:`: **`1024` fluxos**<br>• `130:`: **`512` fluxos** |
| **`quantum <BYTES>`** | Quantidade de bytes que um fluxo pode transmitir na lista prioritária `new_flows` antes de ser rebaixado para `old_flows`, e crédito DRR por rodada em `old_flows`. | 1. Usar `quantum 300` em Gigabit (`120:`) exige 54 rodadas para drenar um pacote GRO de `16 KB` (`+20 ms`).<br>2. Usar `quantum > 1514` (ex: `12288` ou `15140`) permite que fluxos de download pesados fiquem presos dentro de `new_flows` por 8 a 10 pacotes seguidos, bloqueando sondas de ping! | • **`110:` (Real-Time)**: **`500B`** (`300B` se `<50 Mbps`)<br>• **`120:` (Turbo)**: **`1514B`** exatos (`>=50 Mbps`) — 1 pacote cheio de download zera o crédito (`1514 - 1514 = 0`) e move o fluxo de download imediatamente para `old_flows`, deixando `new_flows` 100% livre para sondas de ping!<br>• `eth0`/`eth1`/`phy*`: **`1514B`**! |
| **`target <TIME>`** | Atraso de fila estacionária (*standing queue*) tolerado antes que o CoDel inicie o estado de marcação ECN / descarte. | Deixar o padrão de `5ms` (criado na RFC 8289 para links de `3–10 Mbps`) em Fibra Óptica Gigabit permite `5 ms` de fila no Download + `5 ms` no Upload (`+6 a +10 ms` = Nota A em vez de A+). | **Dinâmico por Perfil da WAN**:<br>• **Fibra XPON (`>=80 Mbps`)**: `110:` **`2ms`** / `120:` **`3ms`** (simétrico em Ingress e Egress!)<br>• **Cabo DOCSIS**: `110:` **`2.5ms`** / `120:` **`4ms`**<br>• **Starlink / 4G / 5G**: `110:` **`5ms`** / `120:` **`7.5ms`**<br>• **Bulk `130:`**: **`10ms`** |
| **`interval <TIME>`** | Janela de tempo correspondente ao RTT típico na qual `sojourn_time > target` deve persistir para confirmar congestionamento real (regra RFC 8289: `target ≈ 5% de interval`). | Usar `interval < 30ms` corta a janela TCP (`cwnd`) em servidores internacionais; usar `interval 100ms` em Fibra regional (`20ms` RTT) demora 5 RTTs para reagir. | • **Fibra XPON**: `110:` **`40ms`** / `120:` **`60ms`** (3x o RTT regional de `20 ms`, razão exata `3ms / 60ms = 5%`)<br>• **Cabo DOCSIS**: **`80ms`**<br>• **Starlink / 4G / 5G**: **`150ms`** |
| **`ecn` / `noecn`** | Ativa marcação Explicit Congestion Notification (RFC 3168) no cabeçalho IP em vez de descartar o pacote quando `sojourn_time > target`. | Ativar `ecn` indiscriminadamente em links de upload muito lentos onde um único pacote grande ocupa `>10 ms`. | • `110:`: **`ecn`** sempre ativo<br>• `120:`/`130:` Ingress: **`ecn`** ativo<br>• `120:`/`130:` Egress: respeita `EECN` (`NOECN` por padrão para corte cirúrgico instantâneo no upload). |
| **`ce_threshold <TIME>`** + **`ce_threshold_selector 0x01/0x03`** | **Suporte Nativo L4S (RFC 9332 / TCP Prague / Apple FaceTime / Cloud Gaming)**: Marca `CE` imediatamente quando o atraso na fila excede `ce_threshold`, **mas exclusivamente para pacotes marcados com `ECT(1)` (`TOS & 0x03 == 0x01`)**, sem afetar o TCP clássico (`ECT(0)` = `0x02`). | Usar `ce_threshold` sem `ce_threshold_selector 0x01/0x03` marca `CE` prematuramente em conexões TCP BBR/CUBIC clássicas (`ECT(0)`). | • **Fibra XPON**: **`1.5ms` (`0x01/0x03`)**<br>• **Cabo DOCSIS**: **`2ms` (`0x01/0x03`)**<br>• **Starlink**: **`4ms` (`0x01/0x03`)** |
| **`memory_limit <BYTES>`** | Teto de RAM em bytes por instância `fq_codel` (protege roteadores de 128 MB contra OOM). | Deixar o padrão de `32 MB` por fila em roteadores MIPS de 128 MB de RAM. | Escalonado pela RAM física:<br>• `<160 MB RAM`: `2 MB` (`110:`) / `4 MB` (`120:`)<br>• `256–512 MB RAM`: `8 MB` / `16 MB`<br>• `>=1 GB RAM`: `16 MB` / `32 MB` |
| **`drop_batch <SIZE>`** | Número máximo de pacotes descartados de uma vez do fluxo mais pesado (*fat flow*) em caso de estouro de `limit`/`memory_limit`. | Descartar 1 por 1 sob ataque/inundação UDP gasta CPU em lock. | **`64`** pacotes por batch. |

---

## 3. Catálogo Completo de Parâmetros: Motor 1 — `CAKE` (`sch_cake.c` / `layer_cake.qos`)

O **CAKE (Common Applications Kept Enhanced)** integra shaper em modo deficit, isolamento triplo de host/fluxo (8-way set-associative hash) e o AQM **COBALT (CoDel + BLUE)**.

| Parâmetro `tc-cake` | O que faz no Kernel (`net/sched/sch_cake.c`) | Armadilha Descoberta e Corrigida no ARK Router | Configuração no ARK Router |
| :--- | :--- | :--- | :--- |
| **`bandwidth <RATE>`** | Define a taxa do shaper virtual de tempo (`cake_dequeue`). | Em `cake_mq` sobre `ifb4*` (Ingress) no Kernel 6.12, o shaper multi-fila zera `capacity estimate` e causa `9%` de drops prematuros. | Aplicado em `cake` mono-fila no `ifb4*` e `pppoe*`; `cake_mq` restrito a NICs físicas multi-fila no Egress (`tx-1`). |
| **`diffserv4`** | Cria 4 *Tins* (filas de prioridade com diferentes alocações e alvos COBALT):<br>1. `Bulk` (`CS1`): `6.25%` banda, `target 5ms`<br>2. `Best Effort` (`CS0`): `100%` banda, `target 5ms`<br>3. `Video` (`AF4x/AF3x/CS3/CS2`): `50%` banda, `target 2.5ms`<br>4. `Voice` (`CS4/CS5/EF/VA/CS6/CS7`): `25%` banda, `target 1.25ms` | **Envenenamento DSCP no Ingress (`[AL-ARK-097]`)**: No kernel (`cake_classify`), o CAKE lê o DSCP vindo da operadora para escolher a Tin **ANTES** de aplicar o `wash`! Se a CDN marcar downloads com `AF41`/`CS3`, 81% do download cai na `Video` Tin (teto de 50%) e sofre milhares de drops! | No Ingress (`parent ffff:`), o filtro **`pref 1 action skbedit priority ${cake_handle}2 continue`** força por padrão todo pacote vindo da internet para a Tin `Best Effort` (100% da banda), promovendo para `Voice` (`${cake_handle}4`) apenas pacotes `<= 511B` verificados! |
| **`wash`** | Zera os bits DSCP para `CS0` **após** a classificação da Tin no CAKE. | Em modo `besteffort`, `sch_cake.c` pula `cake_handle_diffserv()`, deixando DSCPs sujos da operadora chegarem ao Wi-Fi (`WMM AC_VI`). | Sempre ativo (`wash`) no CAKE + lavagem explícita em `nftables prerouting` (`iifname != lan ip dscp set cs0`). |
| **`nat` + `dual-srchost` / `dual-dsthost`** | Faz lookup na tabela `nf_conntrack` antes do hash para isolar primeiro por IP interno da LAN (`dual-srchost` no Upload, `dual-dsthost` no Download) e depois por fluxo. | Sem `nat`, em IPv4 o Egress enxerga apenas o IP público da WAN após o Masquerade. | **`nat dual-srchost`** no Egress e **`nat dual-dsthost`** no Ingress. |
| **`no-split-gso` vs `split-gso`** | Por padrão (`split-gso`), o CAKE quebra super-pacotes GSO/GRO (`64 KB`) em segmentos de `1500B` na entrada da fila. Com `no-split-gso`, mantém os super-pacotes unidos (economizando até 45% de CPU em Gigabit). | Usar `no-split-gso` com `gro_max_size 65536` (`64 KB`) cria super-pacotes que demoram `3,6 ms` para serializar no Upload! | Combinamos `no-split-gso` com **`gro_max_size 16384` e `gso_max_size 16384` (`16 KB`)** em todas as interfaces (`pppoe*`, `ifb4*`, `br-lan`, `phy*`), reduzindo o tempo de serialização em **4x** enquanto preserva 91% da economia de CPU! |
| **`ack-filter`** | Inspeciona a fila à procura de pacotes TCP ACK puros redundantes da mesma conexão e descarta os ACKs antigos mantendo apenas o mais recente. | Em links simétricos de fibra, filtrar ACKs agressivamente pode atrasar a atualização de RTT/SACK do BBR. | Ativado automaticamente (`ack-filter`) **apenas em links assimétricos (`Download >= 5x Upload`)**; em fibra simétrica/2:1 usa `no-ack-filter`. |
| **`ingress`** | Muda o contabilizador do shaper do CAKE para contar pacotes **descartados** como parte da banda consumida no link de entrada (já que o pacote descartado no `ifb4*` já atravessou o link físico da operadora). | Sem a flag `ingress` no `ifb4*`, durante downloads multi-conexão o tráfego descartado pelo AQM não é descontado do shaper, fazendo a fila da OLT da operadora encher! | Sempre ativo (`ingress`) em `iqdisc_opts`. |
| **`rtt <TIME>`** | Ajusta `interval = rtt` e `target = rtt / 20` no COBALT. | Usar `rtt 50ms` em testes internacionais derruba a vazão de fluxos únicos TCP. | `rtt 100ms` (Fibra/Cabo) e `rtt 150ms` (modo Starlink LEO). |
| **`overhead <N>` + `mpu <N>`** | Adiciona `N` bytes de cabeçalho L1/L2 a cada pacote antes de calcular o tempo no fio e impõe tamanho mínimo `mpu`. | Esquecer os 8 bytes do PPPoE + 4B VLAN + 20B preâmbulo/IFG Ethernet + 4B FCS + GEM GPON faz o shaper superestimar a banda em ~4% em pacotes pequenos. | • **PPPoE Fibra (`xpon_bridge`)**: `overhead 44 mpu 64`<br>• **IPoE c/ VLAN (`xpon_vlan`)**: `overhead 34 mpu 64`<br>• **Ethernet Pura (`dhcp_cable`)**: `overhead 18 mpu 64` |

---

## 4. Parâmetros de Enquadramento (`tc-stab`), Camada de Rede (`netdev`) e Wi-Fi 6 (`mt76` / `mac80211`)

Esta é a camada onde a maioria dos sistemas QoS falha (porque olham apenas para a WAN e esquecem as filas ocultas entre o `qdisc` e o cliente):

| Subsistema & Arquivo `/sys` ou `sysctl` | O que Controla no Kernel Linux | Problema / Gargalo Antes da Otimização | Valor Master Aplicado no ARK Router |
| :--- | :--- | :--- | :--- |
| **`tc-stab`** (`mtu 2047 tsize 512 mpu 64 overhead 44 linklayer ethernet`) | Tabela de tamanho em `net/sched/sch_api.c` (`__qdisc_calculate_pkt_len`) usada pelo `sch_hfsc` para somar o overhead de camada física (L1/L2) a cada segmento (incluindo segmentos individuais de um super-pacote GSO via `skb_is_gso`). | Sem `tc-stab`, o `sch_hfsc` mede apenas o pacote IP L3, errando a conta em até 40% quando jogos enviam 128 pacotes UDP de `60 bytes`/s. | Configurado automaticamente conforme o perfil da WAN (`44B` em `xpon_bridge`/PPPoE, `34B` em `xpon_vlan`, `18B` em `dhcp_cable`). |
| **`tx_queue_len` (`txqueuelen`)** em `pppoe-wan` | Profundidade da fila de transmissão da interface virtual PPPoE abaixo do `qdisc`. | Interfaces virtuais `pppoe-*` **não possuem BQL (*Byte Queue Limits*) de hardware**. Além disso, `sqm.sh` linha 238 sobrescrevia `txqueuelen` de volta para `1000` após o boot do SQM! | Corrigido em `sqm.sh`, `ark_hfsc_fqcodel.qos` e `ark-hardware-tune` para manter **`txqueuelen 128`** estrito na `pppoe-wan` enquanto o SQM está ativo. |
| **`byte_queue_limits/limit_max` (BQL)** em `eth0`/`eth1` | Limite em bytes do anel DMA TX do driver Ethernet (`mtk_soc_eth`). | Reduzir `limit_max` para `65536` (64 KB) quando o kernel gera super-pacotes TSO/GSO de `68.310 B` faz o DQL travar a fila TX a cada pacote (`126 Mbps` e `21 ms` de jitter — `[AL-ARK-094]`). | Mantido no teto nativo do driver (`1879048192`) em `eth0`/`eth1`, delegando o controle de tamanho aos limites de GSO/GRO (`16 KB`) e ao `fq_codel` (`quantum 1514 target 2ms`). |
| **`gso_max_size` & `gro_max_size`** em `pppoe-wan`, `ifb4*`, `br-lan`, `phy*-ap*` | Tamanho máximo em bytes de um super-pacote GRO (recepção) ou GSO (transmissão) montado pelo kernel. | Embora `gro_max_size` estivesse em `16384` na WAN, **`gso_max_size` na `pppoe-wan` e `gro_max_size`/`gso_max_size` na `br-lan` e `phy1-ap0` estavam em `65536` (`64 KB`)!** No Upload via Wi-Fi, a `br-lan` entregava blocos de `65.480 bytes` para a `pppoe-wan` (`3,6 ms` de bloqueio por pacote!). | Cravado em **`16384` (`16 KB` = 11 segmentos TCP)** tanto para `gro_max_size` quanto para **`gso_max_size`** em `pppoe*`, `ifb4*`, `br-*`, `lan*` e `phy*`! |
| **`gro_flush_timeout` & `napi_defer_hard_irqs`** | Tempo em nanossegundos que o NAPI segura pacotes no GRO aguardando novos pacotes para fundir antes de acordar a softirq. | Estava em `250000` (`250 µs`) e `20` na `pppoe-wan`, `eth0` e `eth1`. A 1 Gbps, um quadro leva `12 µs` no fio; segurar por `250 µs` em 3 interfaces em série adicionava **até `+1,0 ms` de atraso artificial** em pacotes de ping/jogos! | Com SQM ativo:<br>• `pppoe*` e `ifb4*`: **`gro_flush_timeout=0`, `napi_defer_hard_irqs=0`** (zero retenção em interfaces virtuais!)<br>• `eth0`/`eth1`: **`gro_flush_timeout=20000` (`20 µs`), `napi_defer_hard_irqs=2`** (coalesce rajadas reais de `12 µs` cortando 92% da latência de espera!). |
| **`/sys/kernel/debug/ieee80211/phy*/aqm` (`fq_quantum`)** | Quantum DRR da fila `fq_codel` interna do subsistema Wi-Fi `mac80211` (`include/net/fq_impl.h`). | Estava em **`12288` (`12 KB` = 8 pacotes)** no 5 GHz (`phy1`) e `4542` no 2.4 GHz (`phy0`)! Isso permitia que cada fluxo de download pesado transmitisse **8 pacotes seguidos dentro da fila prioritária `new_flows` do Wi-Fi**, bloqueando as sondas de latência do `bufferspeed.com`! | Cravado em **`fq_quantum 1514`** em todos os rádios (`phy0` e `phy1`) e nas sub-filas `mq` de `eth0`/`eth1`! Todo fluxo de download sai de `new_flows` no 1º pacote, mantendo `new_flows` 100% exclusiva para pacotes esparsos (ping/jogos/VoIP)! |
| **`/sys/kernel/debug/ieee80211/phy*/aql_threshold` & `aql_txq_limit`** | Limite de tempo de ar (*Airtime Queue Limit* em microssegundos) que o driver `mt76` permite enfileirar no FIFO de hardware do chip Wi-Fi por estação e Access Category (`VO`, `VI`, `BE`, `BK`). | No `phy1` (5 GHz), `aql_threshold` estava em `24000` (`24 ms`) e `BE` em `2500 / 5000 µs`. Como um único cliente nunca atingia `24 ms`, o chip Wi-Fi enfileirava **`5.000 µs` (`5,0 ms`) de download bruto no FIFO de hardware** (onde o `fq_codel` de software não alcança), gerando `+5 ms` de bufferbloat no Wi-Fi! | Com SQM + Modo Gamer ativos:<br>• **`aql_threshold = 6000` (`6 ms`)**<br>• `VO (0)`: **`1200 / 2500 µs`**<br>• `VI (1)`: **`1800 / 3500 µs`**<br>• `BE (2)`: **`1500 / 3000 µs`** (`1,5 ms` a `3,0 ms` — equivale a `262 KB` em Wi-Fi 6, mantendo 100% da velocidade com metade da latência de ar!)<br>• `BK (3)`: **`1000 / 2000 µs`** |
| **TCP Small Queues (`tcp_limit_output_bytes`, `tcp_notsent_lowat`, `tcp_pacing_ss_ratio`)** | Limita a quantidade de bytes que um socket TCP local do roteador pode despejar no `qdisc` de uma só vez e suaviza a rampa de Slow-Start do BBR. | `tcp_limit_output_bytes` estava no padrão de `1048576` (`1 MB`) e `tcp_pacing_ss_ratio` em `200` (dobro da taxa a cada RTT). | • `tcp_limit_output_bytes = 262144` (`256 KB`)<br>• `tcp_notsent_lowat = 16384` (`16 KB`)<br>• `tcp_pacing_ss_ratio = 150` |

---

## 5. Regras de Ouro da Classificação DSCP & Filtros `u32` (`[AL-ARK-095]` a `[AL-ARK-099]`)

1. **Jamais dividir pacotes do mesmo fluxo TCP 5-tupla entre filas diferentes (`[AL-ARK-098]`)**:
   - Promover `TCP PSH <= 256B` para `1:10` enquanto os segmentos `1492B` da mesma conexão TCP vão para `1:20` faz o pacote final `PSH` ultrapassar os pacotes de dados anteriores, disparando `3x DupACKs (SACK)` e derrubando o Upload pela metade.
   - Apenas **`TCP SYN/RST <= 128B`** (abertura/fechamento de conexão, antes de existir carga de dados) entram em `1:10`.
2. **Jamais promover `UDP <= 255B` genérico em todas as portas para `1:10` (`[AL-ARK-098]`)**:
   - Fluxos QUIC (`UDP 443`) e testes WebRTC geram centenas de milhares de pacotes UDP pequenos (`486.848 pacotes` em um único teste!), inundando os 512 buckets da fila `110:`.
   - Apenas **`ICMP/ICMPv6 <= 511B`**, **`DNS (53/853) <= 511B`**, **`NTP (123) <= 511B`**, **`L4S ECT(1) <= 511B`**, **`VoIP/Discord (5060-5061, 50000-50100) <= 256B`** e a **matriz explícita de 80+ faixas `ark_gaming_ports` (`<= 512B`)** entram na fila `1:10` / `Voice`.
3. **Blindagem Absoluta no Ingress (`ifb4*`) antes do `nftables prerouting` (`[AL-ARK-095]` & `[AL-ARK-097]`)**:
   - Como o redirecionamento `parent ffff: -> ifb4*` ocorre antes do `nftables` lavar o DSCP da operadora:
     - No **HFSC (`ark_hfsc_fqcodel.qos`)**: no `ingress`, ignorar `CS1` (`0x20`, evitando que downloads da CDN caiam na fila Scavenger de 10%) e aceitar apenas `CS4` (`0x80`, gravado pelo `act_ctinfo` a partir de conexões verificadas `0xa0` na LAN) + filtros diretos de cabeçalho (`ICMP`, `TCP SYN`, `DNS 53`, `NTP 123`, `L4S ECT(1)`).
     - No **CAKE (`sqm.sh`)**: aplicar `pref 1 action skbedit priority ${cake_handle}2 continue` para forçar todo tráfego da internet na Tin `Best Effort` (100% da banda) por padrão, promovendo para `${cake_handle}4` (`Voice`) apenas pacotes interativos `<= 511B`.

---

## 6. Engenharia de Carga Combinada (`16 Down + 16 Up`): RPS Multi-Core, BQL PPPoE e macOS USB Ethernet (`[AL-ARK-100]` a `[AL-ARK-102]`)

1. **`✅ [ATIVO] [AL-ARK-100]` — Proibição de RPS Single-Core (`rps_cpus=4`) ou Zero-RPS (`rps_cpus=0`) em Portas DSA `lan1..4` sob Carga Combinada Bidirecional (`16x16`)**:
   - *Comportamento Oculto*: No SoC MediaTek Filogic 830 (`MT7986`, `15100000.ethernet`), `IRQ 122` (`CPU1`) processa conclusão TX (`mtk_napi_tx`) e `IRQ 123` (`CPU3`) processa recepção NAPI RX (`mtk_napi_rx`) tanto para `eth0` (switch DSA `lan1..4`) quanto para `eth1` (WAN 2.5G).
   - *Armadilha (❌)*:
     - Definir `rps_cpus=0` em `lan1..4` força `CPU3` (`IRQ 123`) a executar todo o encaminhamento IPv6/IPv4 + `nftables` + `hfsc` + `fq_codel` do Upload no mesmo núcleo do DMA RX da WAN, causando `20–60%` de perda de pacotes no anel RX e derrubando o Download simultâneo para `80 Mbps`.
     - Definir `rps_cpus=4` (apenas `CPU2`) com `net.core.dev_weight=64` faz `CPU3` despejar `45.000 pps` na fila FIFO `input_pkt_queue` (`net/core/dev.c`) de um único núcleo (`CPU2`), acumulando **`1.285 pacotes` (`0x00000505` na coluna 12 de `/proc/net/softnet_stat` = `1,93 MB`)** antes da `br-lan` e antes do `fq_codel`, gerando **`50 ms a 159 ms` de fila FIFO interna no roteador** (`Rtr_UL_Delay`).
   - *Sintoma*: Download isolado (`0 ms` bloat) e Upload isolado (`0 ms` bloat) perfeitos, mas na fase `Carga combinada` (`16 Down + 16 Up`) a latência salta para `75–155 ms` e `tcpdump -ni br-lan` exibe pacotes com `skb->tstamp` fora de ordem cronológica em até `137 ms`.
   - *Solução Canônica (✅)*: Distribuir o hash 5-tupla RPS de `lan1..4` em **3 núcleos (`rps_cpus=7` = `CPU0 + CPU1 + CPU2`)** e `pppoe-wan`/`phy*` em **2 núcleos (`rps_cpus=3` = `CPU0 + CPU1`)**, mantendo `CPU3` (`0x8`) 100% exclusivo para o DMA RX (`IRQ 123`), além de elevar `net.core.dev_weight=256` e `net.core.netdev_budget=1200`. O backlog em `/proc/net/softnet_stat` cai de `1.285` para **`0 pacotes` (`00000000`)** em todos os núcleos e `Rtr_UL_Delay` cai de `159,09 ms` para **`0,10 ms`**.

2. **`✅ [ATIVO] [AL-ARK-101]` — Descarte Secundário de Quadros PPPoE (`0x8864`) no `fq_codel` de `eth1`/`eth0` quando `limit_min=32768` e `target=10ms`**:
   - *Comportamento Oculto*: Na interface física `eth1` (abaixo da `pppoe-wan`), todos os pacotes de Upload já estão encapsulados em cabeçalho `PPPoE Session` (`ethertype 0x8864`). A função `INET_ECN_set_ce()` do kernel Linux (`sch_fq_codel.c`) só marca ECN em `ETH_P_IP` (`0x0800`) e `ETH_P_IPV6` (`0x86dd`); para `0x8864`, retorna `0` e **descarta o pacote** (`ecn_mark 0`).
   - *Armadilha (❌)*: Definir `byte_queue_limits/limit_min = 32768` (`32 KB` = 21 pacotes) e `fq_codel target 10ms` em `eth1` faz o BQL pausar `tx-1` antes do limiar de coalescência de interrupção TX do QDMA (`requeues 29725`), acumulando `259 KB` (`216 pacotes`) em `eth1 parent 1:2` e descartando `4.293` pacotes PPPoE que já haviam passado pelo shaper da `pppoe-wan` (causando timeouts TCP de `283–2000 ms`).
   - *Solução Canônica (✅)*: Em `eth0` e `eth1` (interfaces mestre cujo tráfego já é moldado por `pppoe-wan` e `lan1..4`), definir `limit_min = 524288` (`512 KB`) e `fq_codel limit 10240 quantum 1514 target 50ms interval 500ms ecn`, zerando o backlog (`0b 0p`) e eliminando 100% dos drops secundários de PPPoE.

3. **`✅ [ATIVO] [AL-ARK-102]` — Bloqueio de Pause Frames IEEE 802.3x (`RxPause: 327.455`) e Diferença de Drivers USB Ethernet no macOS (`AppleUserECM` vs `AppleUSBNCMData`)**:
   - *Comportamento Oculto*: Adaptadores USB Ethernet conectados ao Mac enviam rajadas de quadros `PAUSE` IEEE 802.3x (`RxPause: 327.455` na `lan3`) quando o buffer USB enche sob carga bidirecional, congelando a porta do switch MT7531 em Camada 2. Além disso, no macOS (XNU):
     - **`en6` (Realtek RTL8153 1GbE)**: Usa driver moderno Skywalk `AppleUserECM` (`CHANNEL_DRV`, `hwassist=723000<CSUM_PARTIAL,...,TSO_V4,TSO_V6>`).
     - **`en11` (Realtek RTL8156 2.5GbE)**: Usa driver legado `AppleUSBNCMData` (`CDC-NCM`, `hwassist=20000<VLAN_MTU>`, **sem Checksum Offload, sem TSO e `scheduler: UNKNOWN`**, empacotando quadros em NTB USB via CPU).
     - Jamais ativar `net.inet.tcp.l4s=1` ou `net.inet.tcp.accurate_ecn=1` no macOS (causa drop de `SYN` com bits AccECN e penalidade de `2000.0 ms` no `BufferSpeed.app`).
   - *Solução Canônica (✅)*: Desativar Flow Control IEEE 802.3x em todas as portas `lan*`, `eth*` e `wan*` (`ethtool -A <dev> autoneg off rx off tx off`) no `sqm.sh`, e no macOS limitar o buffer de envio automático (`net.inet.tcp.autosndbufmax=262144`, `net.inet.tcp.sendspace=65536`, `net.link.generic.system.start_delay_disabled=1`) mantendo `tso=1`, `l4s=0` e `accurate_ecn=0`.

