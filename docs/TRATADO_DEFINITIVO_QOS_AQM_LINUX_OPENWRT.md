# Tratado Científico Definitivo de QoS, AQM e Engenharia de Tráfego no Linux Kernel & OpenWrt

> **Autoridade Técnica**: Engenharia de Redes de Baixo Nível, Pilha de Rede do Kernel Linux (`net/sched`), RFC 8290, RFC 8289, RFC 9332 (L4S) e Arquitetura OpenWrt.

---

## 1. Mapa Completo de Todos os Comandos e Parâmetros de QoS no Linux

### 1.1 `tc qdisc ... fq_codel` (RFC 8290)
O **FQ-CoDel** (*Fair Queueing with Controlled Delay*) unifica o isolamento estocástico de fluxos por rodízio deficitário (*Deficit Round Robin* — DRR) com o algoritmo de gerenciamento ativo de fila CoDel (*Controlled Delay*, RFC 8289).

```sh
tc qdisc add dev <iface> root fq_codel \
    [limit <pkts>] [flows <num>] [quantum <bytes>] \
    [target <time>] [interval <time>] [ecn | noecn] \
    [ce_threshold <time>] [ce_threshold_selector <val/mask>] \
    [memory_limit <bytes>] [drop_batch <pkts>]
```

#### Anatomia dos Parâmetros no Kernel (`net/sched/sch_fq_codel.c`):
- **`limit` (padrão: 10240 pacotes)**: Limite estrito de segurança (*hard ceiling*) para a quantidade total de pacotes retidos na memória do qdisc somando todas as sub-filas. Ao atingir `limit`, o kernel realiza descarte de cauda (*tail drop*) no fluxo com maior número de bytes acumulados.
- **`flows` (padrão: 1024 baldes)**: Número de baldes (*buckets*) da tabela hash alocada dinamicamente. Cada fluxo IP é classificado pela 5-tupla (IP Origem, IP Destino, Porta Origem, Porta Destino, Protocolo de Transporte):
  $$\text{bucket} = \text{SipHash}(\text{5-tuple}) \pmod{\text{flows}}$$
- **`quantum` (padrão: MTU da interface, tipicamente 1514 bytes)**: Saldo de crédito de bytes concedido por rodada DRR. Fluxos com pacotes menores que `quantum` acumulam saldo e cedem a CPU, priorizando tráfego interativo esparso (DNS, SSH, VoIP, ACKs, jogos online).
- **`target` (padrão: 5.0ms)**: Limiar mínimo de atraso aceitável de permanência (*standing queue delay*). O algoritmo CoDel não reage a rajadas transitórias normais; apenas se o atraso mínimo observado ao longo de uma janela de monitoramento superar `target`, a fila é tratada como congestionada.
- **`interval` (padrão: 100.0ms)**: Janela temporal deslizante de monitoramento do atraso mínimo. Dimensionado com base no pior RTT (*Round Trip Time*) de ponta a ponta na Internet aberta para permitir que os remetentes TCP reajam antes do próximo ciclo de descarte.
- **`ecn | noecn` (padrão: `ecn`)**: Marcação explícita de congestionamento (RFC 3168). Caso ativado e o cabeçalho IP contiver os bits `ECT(0)` (`0b10`) ou `ECT(1)` (`0b01`), o CoDel substitui o descarte de pacotes pela marcação `CE` (*Congestion Experienced*, bits `0b11`).
- **`ce_threshold` (padrão: desativado / $0\mu\text{s}$)**: Limiar de atraso raso para marcação ECN instantânea no instante do dequeue. Criado para permitir latências ultra-baixas com algoritmos estilo DCTCP / L4S (RFC 9332).
- **`ce_threshold_selector <VAL>/<MASK>` (ex: `0x01/0x03`)**: Filtro binário aplicado ao byte ToS / DiffServ do IP. Aplica o `ce_threshold` estritamente se:
  $$(\text{ip\_tos} \ \& \ \text{MASK}) == \text{VAL}$$
- **`memory_limit` (padrão x86: 32 MB; patch OpenWrt: 4 MB)**: Teto de bytes alocados em buffers de socket (`sk_buff`), prevenindo esgotamento de memória RAM por rajadas com MTU elevado.
- **`drop_batch` (padrão: 64 pacotes)**: Quantidade máxima de pacotes expurgados em lote contínuo quando o qdisc atinge saturação, mitigando interrupções excessivas de CPU (*softirq*).

#### Dinâmica Matemática do CoDel:
O tempo de permanência de cada pacote individual é registrado na saída:
$$\text{sojourn\_time} = t_{\text{dequeue}} - t_{\text{enqueue}}$$
A cada ciclo `interval`, o algoritmo monitora o menor tempo de permanência:
$$\text{min\_sojourn} = \min_{t \in [t_0, t_0 + \text{interval}]} (\text{sojourn\_time})$$

```
                   ┌─────────────────────────────┐
                   │     Estado NORMAL (OK)      │
                   │    min_sojourn <= target    │
                   └──────────────┬──────────────┘
                                  │ min_sojourn > target
                                  │ sustentado por >= interval
                                  ▼
                   ┌─────────────────────────────┐
        ┌─────────►│       Estado DROPPING       │◄────────┐
        │          │    Descarta ou Marca CE     │         │
        │          └──────────────┬──────────────┘         │
        │                         │                        │
        │ t_next = now +          │ min_sojourn continua   │
        │ interval / sqrt(count)  │ > target               │
        └─────────────────────────┴────────────────────────┘
                                  │
                                  │ min_sojourn <= target
                                  ▼
                   ┌─────────────────────────────┐
                   │    Retorno a NORMAL (OK)    │
                   └─────────────────────────────┘
```

A lei de controle do CoDel segue a física de janelas do TCP:
$$t_{\text{next}} = t_{\text{drop}} + \frac{\text{interval}}{\sqrt{\text{count}}}$$
onde `count` é o total de eventos consecutivos de descarte/marcação. A dependência em $1/\sqrt{n}$ contrabalança a proporcionalidade inversa da equação de taxa de transferência de Mathis para congestionamento TCP ($B \propto \frac{1}{\text{RTT} \sqrt{p}}$).

---

### 1.2 `tc qdisc ... cake` (Common Applications Kept Enhanced)
O **CAKE** foi concebido especificamente para substituir a combinação de `htb + fq_codel + ingress + iptables`. Implementa o algoritmo **COBALT** (*CoDel + BLUE with Alternating Loss and Thresholds*), escalonador deficitário, hash associativo de 8 vias e compensação de enquadramento L1/L2.

```sh
tc qdisc add dev <iface> root cake \
    bandwidth <RATE> [autorate-ingress] \
    [rtt <TIME> | datacentre | lan | metro | regional | internet | oceanic | satellite] \
    [besteffort | diffserv3 | diffserv4 | diffserv8] \
    [flowblind | srchost | dsthost | hosts | flows | dual-srchost | dual-dsthost | triple-isolate] \
    [nat | nonat] [wash | nowash] [split-gso | no-split-gso] \
    [ack-filter | ack-filter-aggressive | no-ack-filter] \
    [overhead <N> | raw | conservative | docsis | ethernet | ether-vlan | pppoe-ptm | pppoe-vcmux] \
    [mpu <N>] [atm | ptm | noatm] [memlimit <N>] [ingress | egress]
```

#### Parâmetros Operacionais:
- **`bandwidth <RATE>`**: Velocidade do modelador deficitário (*deficit shaper*). Ao contrário de algoritmos de balde de fichas (*token buckets* como HTB/TBF), opera em modo deficitário, eliminando rajadas acumuladas (*burst spikes*) após períodos de silêncio na linha.
- **`autorate-ingress`**: Estimador em tempo real de capacidade de descida com base na taxa de chegada de pacotes e no RTT mínimo. Utilizado em links celulares elásticos (4G/5G).
- **Presets de RTT**:
  - `datacentre`: RTT 100µs (target 5µs, interval 100µs).
  - `lan`: RTT 1ms (target 50µs, interval 1ms).
  - `metro`: RTT 10ms (target 500µs, interval 10ms).
  - `regional`: RTT 30ms (target 1.5ms, interval 30ms).
  - `internet` *(padrão)*: RTT 100ms (target 5.0ms, interval 100ms).
  - `oceanic`: RTT 300ms (target 15ms, interval 300ms).
  - `satellite`: RTT 1000ms (target 50ms, interval 1000ms).
- **Tins DiffServ**:
  - `besteffort`: Fila única desprovida de priorização por DSCP.
  - `diffserv3` *(padrão)*: 3 classes/tins:
    - *Bulk* (CS1, LE): threshold 6.25%.
    - *Best Effort*: threshold 100%.
    - *Voice* (CS7, CS6, EF, VA): threshold 25%, com intervalo CoDel encurtado.
  - `diffserv4`: 4 classes/tins:
    - *Bulk*: 6.25%.
    - *Best Effort*: 100%.
    - *Video* (AF4x, AF3x, CS3, AF2x, CS2): 50%.
    - *Voice*: 25%.
- **Isolamento de Fluxos e Hosts (8-way Set-Associative Hash)**:
  Emprega 1024 baldes dispostos em uma matriz de 8 vias (cada linha possui 8 baldes possíveis). Ocorrências de colisão de hash deslocam o fluxo para uma via livre na mesma linha antes de forçar compartilhamento de fila.
  - `flows`: Isolamento clássico pela 5-tupla.
  - `hosts`: Isolamento estrito por pares IP Origem + IP Destino.
  - `dual-srchost`: Garante equidade primeiro entre os IPs locais de origem (LAN) e subdivide a cota entre seus fluxos.
  - `dual-dsthost`: Garante equidade primeiro entre os IPs locais de destino (LAN) na descida.
  - `triple-isolate` *(padrão)*: Combina equidade por host de origem, host de destino e fluxos individuais simultaneamente. Um cliente abrindo centenas de conexões P2P recebe a mesma fatia de banda que um cliente assistindo a um vídeo em conexão única.
- **`nat`**: Consulta em tempo real a tabela `nf_conntrack` do kernel para recuperar o IP interno do host antes do SNAT/Masquerade, tornando `triple-isolate` e `dual-srchost` eficazes na interface WAN.
- **`wash`**: Limpa bits espúrios de DSCP inseridos na rota externa (preservando ECN intacto), prevenindo privilégios indevidos forjados na Internet.
- **`split-gso` *(padrão ativo)* vs `no-split-gso`**: Fraciona super-pacotes GSO/GRO de até 64 KB no dequeue em fatias do tamanho de MTU. Impede que rajadas gigantes de pacotes agregados causem bloqueio de cabeça de linha (*Head-of-Line Blocking*) para fluxos de baixa latência concorrentes.
- **`ack-filter` / `ack-filter-aggressive`**: Identifica e descarta reconhecimentos TCP puros (*pure ACKs*) redundantes em canais de subida assimétricos. Como o número de reconhecimento TCP é cumulativo, se um pacote ACK mais novo já estiver na fila, ACKs anteriores redundantes do mesmo fluxo são eliminados, poupando até 80% da banda de upload sem perda de vazão de download.
- **`ingress`**: Sinaliza que o qdisc atua no tráfego de entrada (geralmente em interface IFB). Contabiliza pacotes descartados como banda consumida do link e mantém uma cota mínima de 2 pacotes por fluxo para proteger a janela TCP contra colapsos prematuros por retransmissão cara.

---

### 1.3 `tc qdisc/class ... hfsc` (Hierarchical Fair Service Curve)
O **HFSC** foi introduzido no SIGCOMM 1997 e é o único escalonador do Linux capaz de **desacoplar completamente a garantia de atraso (*delay*) da garantia de vazão (*bandwidth*)**.

```sh
tc qdisc add dev <iface> root handle 1: hfsc default <classid>

tc class add dev <iface> parent 1: classid 1:1 hfsc \
    [rt <SC>] [ls <SC>] [sc <SC>] [ul <SC>]
```

#### Parâmetros da Curva de Serviço $S(t)$:
Uma curva de serviço de dois segmentos é parametrizada como:
$$\text{SC} = [m1 \ \text{bps} \quad d \ \text{sec} \quad m2 \ \text{bps}]$$
- $m1$: Taxa de serviço inicial (inclinação do primeiro segmento).
- $d$: Duração temporal da fase inicial (ponto de inflexão no eixo do tempo).
- $m2$: Taxa sustentada contínua após $d$.

Alternativamente: `umax <BYTES> dmax <SEC> rate <BPS>`, onde $m1 = \frac{\text{umax}}{\text{dmax}}$ e $m2 = \text{rate}$.

```
      Trabalho
      (Bytes) ^
              |               / m2 (Taxa sustentada)
              |              /
              |             /
              |            /
              |    m1     /
              |  (Burst) /
              |         /
              |        /
              |       + (Ponto de inflexão d)
              |      /
              |     /
              |    /
              |   /
              +--+------------------------> Tempo
                 0    d
```

#### Critérios e Funcionamento Interno no Kernel (`net/sched/sch_hfsc.c`):
1. **Critério Real-Time (RT)**:
   - Aplicado **exclusivamente a classes-folha** (onde residem os pacotes reais). Ignora a hierarquia da árvore.
   - Cada pacote $k$ de tamanho $l_k$ na classe $i$ tem um Tempo de Elegibilidade $E_i^k$ e um Prazo Fatal (*Deadline*) $D_i^k$ definidos pela curva inversa $S_{i, \text{rt}}^{-1}$:
     $$E_i^k = S_{i, \text{rt}}^{-1}(w_i^k - l_k)$$
     $$D_i^k = S_{i, \text{rt}}^{-1}(w_i^k)$$
   - O kernel busca na árvore rubro-negra `eltree` classes com $E_i \le \text{cur\_time}$. Entre as elegíveis, atende a de **menor prazo fatal $D_i$**.
2. **Critério Link-Sharing (LS)**:
   - Se nenhuma classe estiver elegível para tempo real, a capacidade ociosa é distribuída respeitando a árvore de classes com base no Tempo Virtual $V_i$:
     $$V_i(t) = \int_0^t \frac{R_{\text{total}}}{\sum_{j \in \text{ativas}} w_j} \, d\tau$$
   - A classe com o menor tempo virtual na `vtree` é selecionada.
3. **Critério Upper-Limit (UL)**:
   - Clamping estrito. Nenhuma classe pode ultrapassar a taxa estipulada em $ul$, garantindo contenção de banda.

#### Curvas Côncavas vs Convexas:
- **Curva Côncava ($m1 > m2$)**: Essencial para tráfego sensível a atraso (VoIP, DNS, ACK, Games). Garante vazão inicial agressiva $m1$ durante $d$ milissegundos para esvaziar pacotes instantaneamente sem fila, assegurando um prazo fatal ($D_i$) antecipado.
- **Curva Convexa ($m1 < m2$)**: Aplicável a tráfego volumoso em segundo plano (*Bulk*). Concede taxa modesta $m1$ nos primeiros $d$ milissegundos para liberar passagem para pacotes interativos, liberando a velocidade máxima $m2$ somente após a ocupação contínua da fila.

---

### 1.4 `tc stab` (Tabela de Compensação de Overhead de Enquadramento)
O subsistema de enfileiramento do Linux opera sobre o comprimento de rede IP (`skb->len`). No meio físico real, encapsulamentos adicionais de camada 2 e camada 1 consomem largura de banda invisível ao kernel.

```sh
tc qdisc add dev <iface> root stab \
    [mtu <bytes>] [tsize <slots>] [mpu <bytes>] \
    [overhead <bytes>] [linklayer {ethernet | atm | adsl}] ...
```

#### Mecânica de Cálculo no Kernel (`qdisc_size_table`):
O utilitário `tc` constrói uma tabela mapeando comprimentos de pacotes para o custo real em bytes na linha:
1. **Enquadramento Ethernet (`linklayer ethernet`)**:
   $$L_{\text{ajustado}} = \max(L + \text{overhead}, \ \text{mpu})$$
2. **Enquadramento ATM (`linklayer atm` / `adsl`)**:
   O padrão ATM divide o fluxo em células de 53 bytes (**48 bytes de dados úteis** + **5 bytes de cabeçalho**):
   $$\text{Células} = \left\lceil \frac{\max(L + \text{overhead}, \ \text{mpu})}{48} \right\rceil$$
   $$L_{\text{ajustado}} = \text{Células} \times 53$$

---

## 2. Matriz Definitiva por Tipo e Formato de Internet

| Tecnologia de Acesso | Meio Físico & Protocolo | MTU Típico | Overhead L1/L2 Recomendado | RTT Base | Algoritmo Recomendado | Parâmetros Mandatórios |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Fibra FTTH (IPoE / DHCP)** | Ethernet sobre GPON/XGS-PON | 1500 | `overhead 38 mpu 84 noatm` | 2 – 15 ms | CAKE | `bandwidth 95-97% diffserv4 triple-isolate nat wash split-gso` |
| **Fibra FTTH (PPPoE)** | PPPoE sobre VLAN 802.1Q | 1492 (ou 1500 RFC 4638) | `overhead 46 mpu 84 noatm` (ou `42` s/ VLAN) | 3 – 25 ms | CAKE | `bandwidth 93-95% diffserv4 triple-isolate nat wash split-gso` |
| **Cabo Coaxial (DOCSIS 3.0 / 3.1)** | HFC / EuroDOCSIS | 1500 | `docsis` (`overhead 18 mpu 64 noatm`) | 12 – 40 ms | CAKE | Upload: `bandwidth 88-92% ack-filter diffserv4 nat wash`<br>Download: `bandwidth 92-95% ingress` |
| **Satélite LEO (Starlink)** | Órbita Baixa (Ku/Ka-band) | 1500 | `overhead 0 raw` (ou `overhead 18`) | 25 – 85 ms | CAKE (ou HFSC + FQ-CoDel) | `rtt 100ms bandwidth 80-85% diffserv3 triple-isolate split-gso` |
| **Móvel Celular (4G LTE / 5G)** | Modens QMI / MBIM / NCM (Raw-IP) | 1420 – 1500 | `overhead 0 raw` | 20 – 120 ms | CAKE | `autorate-ingress bandwidth <base> rtt 100ms besteffort` |
| **VDSL2 (FTTC / Cabo Telefônico)** | PTM (Packet Transfer Mode 64b/65b) | 1492 (PPPoE) | `pppoe-ptm` (`overhead 30 ptm`) | 15 – 35 ms | CAKE | `bandwidth 90-93% pppoe-ptm diffserv4 ack-filter nat` |
| **ADSL2+ Legado** | ATM (Células de 53 bytes) | 1492 (PPPoE LLC-SNAP) | `pppoe-llcsnap` (`overhead 40 atm`) | 25 – 60 ms | CAKE | `bandwidth 85-90% pppoe-llcsnap diffserv4 ack-filter nat` |

---

## 3. A Resposta Crucial: "Por Que Sempre Estamos Sofrendo Nessa Parte?"

### 3.1 A Armadilha do `ce_threshold` (O Colapso de 700 Mbps para 0.7 Mbps)

A especificação clássica de ECN (**RFC 3168**) estabelece que, ao receber um pacote com o bit `CE`, o destino ecoa o sinal ativando o bit `ECE` (*ECN-Echo*) no cabeçalho TCP de volta ao transmissor.
Ao receber o ECE, o algoritmo de congestionamento (TCP CUBIC ou Reno) reage **exatamente como se houvesse perda de pacote**:
- **TCP Reno**: $\text{CWND} \leftarrow \frac{\text{CWND}}{2}$
- **TCP CUBIC**: $\text{CWND} \leftarrow 0.7 \times \text{CWND}$

Já o padrão **RFC 9332 (L4S)** adota algoritmos como o **TCP Prague**, nos quais a janela é reduzida apenas na proporção exata da fração $\alpha$ de pacotes marcados:
$$\text{CWND} \leftarrow \text{CWND} \times \left(1 - \frac{\alpha}{2}\right)$$

#### A Causa do Estrangulamento:
No Linux, o parâmetro `ce_threshold` do `fq_codel` marca pacotes com o bit CE de forma **instantânea** sempre que o atraso individual de fila superar o limiar estipulado.

Em enlaces de 700 Mbps:
1. O transmissor emite rajadas normais agrupadas por TSO de 64 KB.
2. Drenar um único bloco de 64 KB em uma linha de 500 Mbps consome fisicamente:
   $$t = \frac{65536 \times 8}{500 \times 10^6} \approx 1.05 \text{ ms}$$
3. Se `ce_threshold` estiver fixado em 1ms, o segundo pacote dessa rajada atinge $1.05\text{ms}$ e é **marcado com CE**.
4. Sendo tráfego TCP CUBIC clássico (`ECT(0)`), o servidor recebe o sinal de ECN e **corta a janela em 30%**.
5. No RTT seguinte (~35ms), a próxima rajada excede 1ms e sofre novo corte.
6. A janela de envio é comprimida iterativamente até o piso mínimo:
   $$\text{CWND} = 1 \text{ a } 2 \text{ segmentos MSS (1460 a 2920 bytes)}$$

#### A Dedução Matemática da Velocidade Restante:
$$\text{Vazão Resultante} = \frac{\text{CWND}}{\text{RTT}} = \frac{2 \times 1460 \times 8 \text{ bits}}{0.035 \text{ segundos}} = \frac{23.360 \text{ bits}}{0.035 \text{ s}} \approx 667.428 \text{ bps} \approx \mathbf{0.67 \text{ Mbps}}$$

A linha Gigabit desaba para ridículos **0.7 Mbps**!

#### A Correção:
Nunca use `ce_threshold` sem isolar exclusivamente o codepoint L4S (`ECT(1)`):
```sh
tc qdisc add dev <iface> root fq_codel \
    target 5ms interval 100ms \
    ce_threshold 1ms ce_threshold_selector 0x01/0x03
```

---

### 3.2 A Assimetria Fundamental entre Ingress e Egress

```
Fluxo de Egress (Upload):
[Host LAN] ───> [Linux Router: qdisc local] ──(Controle de transmissão físico direto)──> [Fio WAN / ISP]

Fluxo de Ingress (Download):
[Servidor CDN] ───> [Buffer CMTS / OLT do ISP] ──(Fibra/Cabo saturado)──> [Linux Router: IFB]
                    * O gargalo físico está na operadora; o pacote já cruzou a linha!
```

- **Egress (Upload)**: O transmissor reside na placa de rede do seu roteador. O qdisc dita exatamente o ritmo de envio para o anel de hardware (*TX Ring*) via BQL. O controle sobre a formação de filas é direto, local e preventivo.
- **Ingress (Download)**: O gargalo físico onde a fila se acumula fica a quilômetros de distância, **no equipamento da operadora (CMTS/OLT)**. Quando o pacote chega à interface do roteador, **ele já atravessou a linha física**.
- **Natureza Reativa do Shaper de Ingress**:
  O roteador emula um estrangulamento local em interface virtual IFB a 90% da capacidade. Ao atingir essa taxa, descarta ou marca pacotes com ECN para forçar o servidor remoto a frear o envio, puxando a fila para fora do equipamento da operadora. Se a margem de recuo for insuficiente (ex: 98%), a fila incha na operadora antes do roteador perceber. O parâmetro `ingress` do CAKE contabiliza os descartes como banda transferida e reserva pelo menos 2 pacotes por fluxo para estabilizar a janela TCP.

---

### 3.3 O Choque entre Acelerações de Hardware/Kernel (NAPI / GRO / GSO) e AQM

Para poupar ciclos de CPU em altas velocidades, o Linux agrupa múltiplos pacotes recebidos em uma única estrutura na memória:
- **GRO (*Generic Receive Offload*)**: Costura pacotes recebidos em blocos gigantes de até **64 KB**.

Em uma conexão de 100 Mbps, o tempo para descarregar um único bloco de 64 KB no fio é:
$$T = \frac{65536 \times 8}{100 \times 10^6} = \frac{524.288 \text{ bits}}{100.000.000 \text{ bps}} = \mathbf{5.24 \text{ milissegundos}}$$

Se o operador sintonizar um AQM com `target 2.5ms` ou `target 5.0ms`:
1. Um único super-pacote GRO leva **5.24 ms** para sair da fila.
2. O CoDel detecta atraso superior a 5ms e assume que o enlace está sofrendo de bufferbloat severo.
3. O algoritmo dispara descartes punitivos contínuos, destruindo a velocidade da rede.

**Solução com CAKE `split-gso`**: O CAKE fraciona o bloco de 64 KB de volta em pacotes MTU (1500 bytes) antes do escalonamento, permitindo que pacotes interativos furem a fila e viabilizando medições de latência na escala de microssegundos.

---

### 3.4 A Ilusão das Ferramentas de Medição (Waveform vs Ookla vs Fast)

1. **Ookla Speedtest**:
   Abre de **16 a 32 fluxos TCP paralelos** simultâneos direcionados a servidores locais dentro do próprio datacenter da operadora (RTT de 2 a 5 ms). Com dezenas de conexões concorrentes e RTT insignificante, a janela TCP se recupera instantaneamente de qualquer perda. O teste mascara o bufferbloat sofrido por fluxos individuais em aplicações reais.
2. **Waveform Bufferbloat Test**:
   Gera tráfego sustentado contínuo via HTTP/WebSockets enquanto injeta sondas frequentes de latência (*pings*) direcionadas a servidores a 30-60 ms de distância. Revela com fidelidade a degradação de jogos, chamadas de vídeo e SSH sob carga de rede.
3. **TCP BBR vs TCP CUBIC**:
   - O **BBR** atua medindo capacidade e RTT mínimo (*BtlBw e RTprop*), evitando proativamente a ocupação desnecessária do buffer. A nota de bufferbloat aparenta perfeição mesmo sem nenhum QoS ativo.
   - O **CUBIC** empurra dados até a exaustão do buffer para identificar perda de pacotes, revelando imediatamente a ausência de um shaper.
4. **Armadilhas do Meio Wi-Fi e Economia de Energia dos Aparelhos**:
   - **Economia de Energia 802.11 (WMM-PS / U-APSD)**: Celulares desligam o rádio ciclicamente para estender a bateria. O ponto de acesso retém pacotes por 10 a 80 ms até o próximo frame DTIM. O teste do Waveform rodando no celular registra esse atraso de dormência do rádio e rebaixa a nota, mesmo com a fila do roteador perfeitamente zerada.
   - **AWDL (*Apple Wireless Direct Link*) no macOS/iOS**: O sistema operacional da Apple varre canais Wi-Fi a cada 300 ms em busca de dispositivos AirDrop. O rádio abandona o canal da LAN momentaneamente por 30 a 70 ms, induzindo picos cíclicos de latência que nada têm a ver com bufferbloat no roteador.

---

## 4. As 7 Regras de Ouro Imutáveis do QoS

1. **A Regra do Teto Real Sustentado**:
   Nunca baseie o shaper na velocidade máxima de pico do plano comercial. Meça a velocidade real sustentada em horários de pico. Configure o Egress (Upload) entre **90% e 94%**, e o Ingress (Download) entre **88% e 92%**.
2. **A Escolha do Algoritmo pela Arquitetura de CPU**:
   - CPUs modernas ARMv8 / Cortex-A53 ou x86_64: **CAKE** (`diffserv4`, `triple-isolate`, `nat`, `wash`, `split-gso`).
   - Processadores legados de baixa frequência (MIPS 500–720 MHz): **HFSC + FQ-CoDel** ou **HTB + FQ-CoDel**, poupando ciclos de CPU.
3. **Overhead Preciso de Camada Física**:
   Sempre especifique o overhead exato de enquadramento da tecnologia. Em pacotes pequenos de jogos (60 a 90 bytes), errar o overhead em 40 bytes subestima o consumo físico da linha em mais de **30%**, saturando o buffer da operadora sem o conhecimento do shaper.
4. **Isolamento de Redes Assimétricas via `ack-filter`**:
   Em qualquer conexão com proporção de download para upload superior a 5:1 (DOCSIS Cabo, VDSL2, ADSL), ative obrigatoriamente o `ack-filter` no upload do CAKE.
5. **Nunca Ative `ce_threshold` sem Seletor de Máscara em Tráfego Aberto**:
   O parâmetro `ce_threshold` sem `ce_threshold_selector 0x01/0x03` decapita o TCP CUBIC/Reno em conexões de alta velocidade, estrangulando enlaces Gigabit para frações de megabit por segundo.
6. **Mantenha `split-gso` Ativo em Roteadores de Borda**:
   O fracionamento de super-buffers GRO/GSO de 64 KB é mandatório para permitir que pacotes interativos de voz e jogos não fiquem bloqueados atrás de blocos massivos de download.
7. **Isole o Diagnóstico: Teste Sempre no Cabo**:
   Nunca diagnostique ou sintonize parâmetros de SQM via Wi-Fi. Os modos de economia de bateria dos smartphones e as varreduras de canais do sistema operacional inserem latências artificiais que invalidam qualquer conclusão sobre a fila do roteador.
