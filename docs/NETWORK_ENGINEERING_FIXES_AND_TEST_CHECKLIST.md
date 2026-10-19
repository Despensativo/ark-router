# ARK Router — Relatório de Correções de Engenharia de Redes & Checklist de Validação (Pendências de Teste)

> **Data**: Outubro de 2026
> **Versão Base**: `1.5.17`
> **Escopo**: 9 Correções Estruturais de Redes/Kernel/Firewall/SQM/MTU + Preservação Integral da Blindagem Wi-Fi Mobile/Snapdragon (`[AL-ARK-007]`).

---

## 1. Resumo das 9 Correções Aplicadas (e 1 Ponto Preservado Intacto)

| ID | Subsistema / Arquivo | O que foi corrigido | Fundamentação Técnica (RFC / Manual OpenWrt) |
| :--- | :--- | :--- | :--- |
| **#1** | **Limite de Banda por Dispositivo** (`root/usr/lib/ark/modules/devices.sh`) | Adicionado `burst` proporcional (250 ms da taxa, mín. `64 kbytes`) em todas as regras `nft limit rate over` + cobertura Dual-Stack IPv6 (`ip6 daddr` / `ether saddr ... meta nfproto ipv6`). | Sem `burst`, o `nft_limit.c` usa 5 pacotes de tolerância, derrubando a janela TCP CUBIC/BBR em rajadas Wi-Fi 6 (A-MPDU) e GRO. |
| **#2** | **SQM DiffServ4 & DSCP Wash** (`root/usr/lib/ark/modules/sqm.sh`, `ezsetup.sh`, `doctor.sh`) | Substituído `piece_of_cake.qos` (fila única) por `layer_cake.qos` (4 filas DiffServ4), ativado `squash_dscp=1` / `squash_ingress=1` e adicionado `wash` em `eqdisc_opts` (Upload). | Manual Oficial do OpenWrt (*SQM Details*) + RFC 8290: `layer_cake.qos` ativa as 4 filas de prioridade, e `wash` limpa o `CS6`/`EF` na saída da WAN para evitar descarte pelo provedor. |
| **#3** | **Motor Inteligente Auto-MTU & Baby Jumbo PPPoE / VLAN / Multi-WAN / IPv6 / DHCP / IP Fixo** (`common.sh`, `05-ark-pppoe-babyjumbo`, `network.sh`, `doctor.sh`) | 1. Garante `mtu 1508` tanto na porta física pai (`ethX`) quanto na VLAN `8021q` (`ethX.Y`).<br>2. Sondagem real na fibra (`1500` $\rightarrow$ `1492` $\rightarrow$ `1480` $\rightarrow$ `1460` $\rightarrow$ `1420`) respeitando o teto LCP negociado pelo `pppd` com o BRAS.<br>3. Isolamento estrito: limpa `1508` residual ao mudar para **DHCP (IPoE)** ou **IP Fixo**, restaurando `1500B`.<br>4. Garante `mtu_fix=1` (`rt mtu` TCP MSS) na zona WAN e sincroniza `dhcp.lan.ra_mtu` (IPv6 RA MTU) com o menor MTU real das WANs ativas, mantendo a LAN/Wi-Fi local em `1500B`. | RFC 4638 (Baby Jumbo PPPoE), RFC 4861 (`ra_mtu` IPv6 para QUIC/HTTP3 sem *Packet Too Big*) e Manual Oficial do `netifd` do OpenWrt (`1508` em `device` físico + VLAN). |
| **#4** | **Fim do *Split-Brain* de `sysctl`** (`root/usr/lib/ark/modules/system.sh`) | Impede que `99-ark-memory.conf` sobrescreva `net.core.rmem_max` para `1 MB` quando `99-ark-hardware-tune.conf` ou `99-ark-performance.conf` já alocou buffers maiores (`4 MB` a `32 MB`). | Arquitetura `/etc/sysctl.d/` do OpenWrt: evita degradação silenciosa de janela TCP BBR/CUBIC em links Gigabit. |
| **#5** | **Conntrack TCP Established Timeout** (`root/usr/lib/ark/modules/system.sh`) | Ajustado de `3600s` (1h) para **`7440s` (2h04min)** no modo Single-WAN (mantendo `1200s` apenas quando `mwan3` Multi-WAN estiver ativo). | **RFC 5382 REQ-5** e padrão clássico do `10-default.conf` do OpenWrt: reduz o padrão de 5 dias (`432000s`) em **98,2%** sem cortar o keepalive de 2 horas (`7200s`) do Push da Apple (APNs), Google (FCM) e sessões SSH. |
| **#6** | **Remoção do Cron Periódico `drop_caches=3`** (`root/usr/lib/ark/modules/system.sh`) | Removido o agendamento automático de `echo 3 > /proc/sys/vm/drop_caches` em `/etc/crontabs/root` (mantendo a limpeza apenas no botão manual `ram-purge-now`). | Em roteadores OpenWrt com rootfs **SquashFS** comprimido em Flash, despejar o page cache periodicamente força releitura e descompressão LZMA/XZ repetida da Flash. |
| **#7** | **`fq_codel` + `txqueuelen=1000` com Hardware Offload** (`root/etc/init.d/ark-hardware-tune`) | Mantém `fq_codel` ativo nas filas de CPU mesmo quando `flow_offloading_hw=1` (MediaTek PPE) está ligado e normaliza `txqueuelen` em `1000`. | Pacotes de handshake TCP, DNS, ARP, ICMP e primeiros pacotes de cada fluxo passam pela CPU antes do bind no PPE e precisam de `fq_codel` com fila enxuta. |
| **#8** | **Blindagem Wi-Fi Mobile/Snapdragon & IoT** (`doctor.sh`, `wifi.sh`) | **PRESERVADO 100% INTACTO (`[AL-ARK-007]`)**: `wpa_group_rekey=0`, `disassoc_low_ack=0`, `skip_inactivity_poll=0`, `max_inactivity=86400` e `usteer` consultivo (`min_snr=0`). | Evita desconexões autônomas em *Doze Mode* em smartphones Qualcomm Snapdragon (Galaxy S23/S24, etc.) e disparo do `WifiBlocklistMonitor` do Android. |
| **#9** | **Bloqueio de DNS-over-TLS (DoT Porta 853) na Interceptação DNS** (`root/usr/lib/ark/modules/adblock.sh`) | Adicionada regra companheira `firewall.ark_dot_reject` (`REJECT` TCP/UDP porta `853` na zona `lan -> wan`) quando a interceptação de DNS (porta 53) está ativa. | Manual Oficial do OpenWrt (*DNS Hijacking*): o `REJECT` imediato na porta 853 faz o *Private DNS* oportunista do Android fazer fallback instantâneo (< 1 ms) para a porta 53 local. |
| **#10** | **QoS da Rede de Convidados (Baixa Latência + IPv6)** (`root/usr/lib/ark/modules/sqm.sh`) | Reduzida a latência da fila `tbf` de `400ms` para **`50ms`** no download e adicionado filtro `protocol ipv6 u32` no upload. | Evita *bufferbloat* de 400 ms na rede de visitantes e impede bypass de limite de upload via IPv6. |

---

## 2. Checklist de Pendências para Teste e Validação

### Fase A — Validação Automatizada Local & Sandbox (Executada no Ambiente de Desenvolvimento)
- [x] **A1. Suíte de Testes Unitários e Matriz WAN (`tests/test_wan_matrix.py` — 31/31 testes OK)**:
  - Verificar persistência de Baby Jumbo (`1508`/`1500`) e reversão limpa (`1500`/`1492`).
  - Verificar saneamento de seções `config device` duplicadas pelo ARK Doctor (`test_15`).
  - Verificar limpeza de resíduos `1508` ao alternar protocolo WAN de `pppoe` para `dhcp` ou `static` (`test_26` e `test_31`).
  - Verificar imutabilidade da blindagem de sono Wi-Fi (`test_25`: `skip_inactivity_poll=0`, `max_inactivity=86400`, `wpa_group_rekey=0`, `disassoc_low_ack=0`).
- [x] **A2. Suíte de Auto-Tune de Hardware (`tests/test_hardware_tune.py` — 4/4 testes OK)**:
  - Verificar geração de `/etc/sysctl.d/99-ark-hardware-tune.conf` com `nf_conntrack_tcp_timeout_established=7440` em Single-WAN e `1200` com `mwan3` ativo.
  - Verificar proteção de `rmem_max >= 1048576` com `nlbwmon` e não-sobrescrita pelo `99-ark-memory.conf`.
- [x] **A3. Auditoria de Contratos, Shell/JS/CSS e Documentação (`audit_shell_scripts.py`, `verify_feature_contracts.py` & `audit_docs.py --strict`)**:
  - Confirmar 8/8 checagens de Shell/JS/RPC/CSS, 74/74 contratos funcionais e 8/8 travas de documentação.

---

### Fase B — Validação de Regras e Transições (Validada no `RouterSandbox` — `test_28` a `test_31`; pronta para smoke-test na VM `OpenWrt-ARK-Dev`)
- [x] **B1. Teste de Sintaxe `nftables` dos Limites por Dispositivo (`devices.sh` — validado em `test_28`)**:
  - Criar limite de Download (`100 Mbps` $\rightarrow$ `12500 kbytes/second burst 3125 kbytes`) e Upload (`50 Mbps` $\rightarrow$ `6250 kbytes/second burst 1562 kbytes`) para cliente com IPv4 + IPv6.
  - Confirmar geração de `/etc/ark/ark_device_limits.nft` com `burst <N> kbytes` e regras `ip daddr` + `ip6 daddr` (filtrando `fe80::`) / `ether saddr`.
- [x] **B2. Teste de `layer_cake.qos` e `wash` no SQM (`sqm.sh` — validado em `test_29`)**:
  - Ativar SQM via `sqm-save` e confirmar que o CAKE configura **4 tins (`layer_cake.qos`)**, `squash_dscp=1`, `squash_ingress=1` e flag `wash` ativa em `eqdisc_opts`.
- [x] **B3. Teste de Rejeição DoT Porta 853 com Interceptação DNS (`adblock.sh` — validado em `test_30`)**:
  - Ativar AdBlock com Interceptação DNS (`dns_intercept=1`) e confirmar criação de `firewall.ark_dot_reject` (`tcp udp` dport `853` `REJECT` de `lan` para `wan`).
  - Desativar `dns_intercept=0` e confirmar remoção limpa de `dns_intercept_udp`, `dns_intercept_tcp` e `ark_dot_reject`.
- [x] **B4. Teste de Transição de Protocolos WAN (`PPPoE` $\leftrightarrow$ `DHCP` $\leftrightarrow$ `Static` — validado em `test_31`)**:
  - Configurar `wan` como `pppoe` com Baby Jumbo (`device_mtu=1508`) e VLAN `eth1.10`. Confirmado que tanto `eth1` (porta física pai) quanto `eth1.10` (VLAN 802.1Q) recebem `mtu '1508'`.
  - Mudar `wan` e `wan2` para `dhcp` (IPoE). Confirmado que `device_mtu` foi limpo, `eth1`/`eth1.10` voltaram para `1500`, e `dhcp.lan.ra_mtu` sincronizou para `1500`.

---

### Fase C — Validação em Hardware Real & Links de Operadoras (Depende de Autorização Explícita `SIM`)
> **⚠️ IMPORTANTE**: Nenhum teste desta Fase C deve ser aplicado nos roteadores físicos sem autorização explícita do usuário.

- [ ] **C1. Acer Predator W6x (`192.168.73.1`) — Dual-WAN PPPoE GPON + Smartphones Snapdragon**:
  - Validar que, ao discar PPPoE em `wan` e `wan2`, o hotplug `05-ark-pppoe-babyjumbo` detecta automaticamente o teto real de cada operadora (`1500` se o BRAS aceitar RFC 4638, ou `1492` se o BRAS limitar no LCP), gravando `/tmp/ark-mtu-probed-wan*`.
  - Confirmar em `uci get dhcp.lan.ra_mtu` que o anúncio IPv6 RA para a LAN/Wi-Fi reflete o MTU real da fibra (`1492` ou `1500`), eliminando descartes de primeiro pacote QUIC/HTTP3 em IPv6.
  - Confirmar que a `br-lan` e todos os rádios Wi-Fi permanecem em `MTU 1500` para tráfego local.
  - Monitorar o Galaxy S24 (Snapdragon) em repouso noturno para confirmar manutenção de 0 quedas de Wi-Fi e notificações Push instantâneas com `nf_conntrack_tcp_timeout_established=7440`.
- [ ] **C2. Cudy WR3000 v1 (`192.168.21.1`) — Starlink Mini em DHCP (IPoE Bypass) + Filogic 820 PPE**:
  - Confirmar que em modo DHCP (Starlink) a WAN opera limpa em `MTU 1500` sem interferência do hotplug PPPoE.
  - Confirmar que com `flow_offloading_hw=1` (MediaTek PPE ativo), as filas `fq_codel` permanecem ativas nas interfaces `eth*`/`lan*` com `txqueuelen 1000` para proteger handshakes TCP e DNS.
- [ ] **C3. Acer Predator Connect T7 (`192.168.76.1`) — OpenWrt 19.07 (`fw3`) + QSDK Wi-Fi 7**:
  - Validar compatibilidade da regra `ark_dot_reject` e `mtu_fix=1` no motor `fw3` (`iptables`).
