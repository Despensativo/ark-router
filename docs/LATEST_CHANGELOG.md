## 2.2.1-r6

- **⚡ Sincronização Dinâmica de UI sem Recarga, Matriz dos 23 Recursos & Validação Destrutiva em VM (07/11/2026)**:
  - **Sincronização de Estado LuCI sem Recarga de Página (`src/core/formatters.js`, `src/modules/lifecycle.js`, `adblock.js`, `storage_wol.js`)**:
    - Reconciliação atômica de capacidades (`features` RPC) e DOM: alternância, pausa e remoção confirmam o estado esperado antes de atualizar badges e switches sem necessitar de recarga completa da interface.
    - Manutenção de foco e rolagem suave na linha modificada da Central de Desempenho.
  - **Matriz Canônica de 23 Recursos do Sistema & AdBlock JSON**:
    - Padronização dos 5 campos de estado (`installed`, `active`, `user_removed`, `user_disabled`, `mode`) em todos os 23 recursos do sistema (`19 alternáveis`, `14 removíveis`).
    - AdBlock estruturado para alternar dinamicamente entre Local (:5335), NextDNS, AdGuard DNS e Turbo (`allservers=1`).
  - **Desinstalação Destrutiva Real & Rollback Homologados em VM Isolada (Lote 034)**:
    - 226/226 asserções aprovadas em ambiente volátil QEMU OpenWrt: remoção real dos 14 pacotes, expurgo de arquivos e status opkg, gravação de `user_removed=1` no UCI e rollback automático com restauração de snapshot em caso de erro.
    - Idempotência de desligamento de SQM sem daemon (`ezsetup.sh`) e roteamento de ações CLI em `speedify.sh`.
  - **Organização da Documentação Técnica em 5 Camadas**:
    - Criação de `docs/DEVELOPMENT_GUIDE.md` e reorganização de `docs/README.md` em 5 camadas estritas para economia de contexto.

## 2.2.1-r5

- **🛡️ Protocolo AmneziaWG (Anti-DPI WireGuard) & Wi-Fi 7 MLO (Multi-Link Operation) com EHT Puncturing (07/11/2026)**:
  - **Manipulador de Protocolo Netifd AmneziaWG (`root/lib/netifd/proto/amneziawg.sh`)**:
    - Suporte canônico nativo ao protocolo `proto 'amneziawg'` no OpenWrt com estratégia dual-tier resiliente (`kmod-amneziawg` em kernel space ➔ `amneziawg-go` em user space ➔ fallback `wireguard`).
    - Integração dos 9 parâmetros avançados de ofuscação e camuflagem anti-DPI: `Jc` (junk packets), `Jmin`/`Jmax` (faixa de bytes aleatórios de ruído), `S1`/`S2` (tamanhos de handshake inicial e resposta), e `H1..H4` (assinaturas de cabeçalho de transporte personalizadas).
  - **Importação Transparente & Telemetria RPC de VPN (`vpn.sh`, `vpn.js`, `ezsetup.sh`)**:
    - Parser de arquivos `.conf` no backend `vpn.sh` com decodificação resiliente e identificação atômica de campos de ofuscação AmneziaWG (`is_amneziawg`).
    - Interface LuCI com detecção automática no upload do arquivo, exibição do banner de segurança `🛡️ AmneziaWG Anti-DPI` e card de telemetria em tempo real com indicador `Bypassing DPI`.
    - Guia técnico aprofundado de engenharia em `docs/AMNEZIAWG_FEASIBILITY_AND_COMPILATION_GUIDE.md` cobrindo compatibilidade com kernels 6.1, 6.6 e 6.12 e contorno de vermagic.
  - **Wi-Fi 7: Multi-Link Operation (MLO) & Preamble Puncturing (`wifi.sh`, `wifi.js`, `render.js`)**:
    - Gestão declarativa de enlaces MLD em `/etc/config/wireless` (`config wifi-mld 'mld0'`), com negociação T2LM (`eht_t2lmnegosupport '1'`) e criptografia obrigatória WPA3-SAE (`encryption 'sae'`).
    - Habilitação automática de `eht_puncturing '1'` ao operar em Wi-Fi 7, garantindo imunidade a quedas de largura de banda de 160/320 MHz diante de interferências parciais de 20 MHz.
    - Toggle e telemetria de MLO adicionados à interface móvel e desktop LuCI.
  - **Validação Local & Testes Automatizados**:
    - Novo teste canônico `tests/test_amneziawg_and_mlo.py` validado e incorporado ao `run_local_tests.sh` (37/37 testes aprovados).
    - Pacotes locais gerados e testados: `luci-app-ark-router-full-2.2.1-r5.apk` e `.ipk`.

## 2.2.1-r4

- **🚀 Calibração Definitiva de Bufferbloat A+, NAT Full-Cone / Endpoint-Independent & Tuning Gaming (07/11/2026)**:
  - **NAT Full-Cone / Endpoint-Independent Mapping Dual-Engine (`fw4` & `fw3`)**:
    - Implementação de `ark_optimize_nat_endpoint_independent` em `root/usr/lib/ark/common.sh` e integridade no boot via `/etc/init.d/ark-firewall-guard`.
    - No `fw4` (nftables): injeta `meta nfproto ipv4 masquerade persistent` no template `/usr/share/firewall4/templates/zone-masq.uc`, garantindo mapeamento determinístico 1:1 de portas UDP/TCP externas em múltiplos destinos (STUN / P2P / jogos).
    - No `fw3` (iptables): ativa `fullcone=1` nas zonas WAN em `/etc/config/firewall`.
    - Validado via STUN contra Google, Cloudflare e Nextcloud com mapeamento de porta externa idêntico em todos os servidores.
  - **Calibração Fina de AQM Ingress (5ms Target) & Fila Real-Time Gaming (1514 Quantum)**:
    - No `ark_hfsc_fqcodel.qos`: calibrado `turbo_target="5ms"` e `turbo_interval="100ms"` para bandas >= 200 Mbps no Ingress da classe 1:20 (Best Effort), eliminando a fila parada de 15-18ms e reduzindo a latência sob carga combinada para **19 ms** (inferior à latência de repouso).
    - Classe 1:10 (Gaming / Real-Time): elevado `rt_quantum` para `1514` (alinhado a MTU Gigabit) e adicionado `noecn` em fluxos UDP em tempo real para evitar descarte prematuro de pacotes de telemetria de jogos.
  - **Otimização Conntrack de Alta Frequência (`99-ark-conntrack.conf`)**:
    - Tabela de rastreamento expandida para 65.536 conexões com reciclagem rápida de sessões mortas (`tcp_timeout_time_wait=30`, `tcp_timeout_close_wait=15`, `udp_timeout=30`, `udp_timeout_stream=120`).
  - **Auto-Mount Debugfs para Wi-Fi 6 AQL (`ark-hardware-tune`)**:
    - Garantido ponto de montagem de `/sys/kernel/debug` antes de calibrar limites de fila de camada de enlace (`airtime_queue_limits`).

## 2.2.1-r1 / 2.2.1

- **🎯 Promoção Ingress `u32` para UDP Curto (`<= 256B`) na Fila `Voice` / `1:10` com Guarda Anti-Reordenação `QUIC 443` (`[AL-ARK-103]`) & Blindagem Lógica de Locks, Caches, UI e Ordem de Execução SQM (04/11/2026)**:
  - **Promoção Universal de UDP Curto (`<= 256B`) no Ingress (`sqm.sh` & `ark_hfsc_fqcodel.qos` — `[AL-ARK-103]`)**:
    - No código do `sch_cake.c` (`cake_select_tin()`), quando a regra `pref 1` do Ingress carimba `skbedit priority ${cake_handle}2` (`Best Effort`), o CAKE obedece ao `skb->priority` e **ignora completamente o DSCP do cabeçalho IP** antes do redirecionamento `mirred` para `ifb4*`. Por isso, sondas de latência WebRTC (`bufferspeed.com`), VoIP e pacotes UDP de jogos que chegavam da internet em portas altas efêmeras não casavam nas regras de ICMP/DNS e ficavam presos na fila `Best Effort` (`+76 ms`) atrás dos 16 fluxos pesados de Download TCP.
    - `ark_apply_ingress_voice_tin_filters` (`sqm.sh`) e `ark_hfsc_apply_filters` (`ark_hfsc_fqcodel.qos`) agora promovem todo pacote **UDP curto (`<= 256 bytes`: `match u16 0x0000 0xff00 at 2` no IPv4 e `at 4` no IPv6)** diretamente para a **Tin `Voice` (`${cake_handle}4`, atraso médio de `9 µs` / `0,009 ms`)** no CAKE e para a **Fila `1:10` Real-Time (`prio 7`/`prio 8`)** no HFSC, mantendo guarda explícita para **`UDP sport/dport 443` (`QUIC / HTTP3`)** na fila `Best Effort` / `1:20` (`pref 6`/`pref 7` no CAKE, `prio 5`/`prio 6` no HFSC) para zero reordenação de pacotes.
  - **Idempotência de Locks de Mutação, Invalidação Atômica de Caches & Fechamento de Descritores em Subshells (`common.sh`, `serialized-job.sh`, `equipe-dashboard-control`, `doctor.sh`, `wifi.sh`, `network.sh`, `network_ipv6_mwan.sh`, `devices.sh`, `ezsetup.sh`)**:
    - Posse estrita do lock (`_ark_has_mut_lock=1` vs variável herdada `ARK_MUTATION_LOCK_HELD`), remoção da condição de corrida `[ -z '$owner_pid' ]`, avaliação de `ark_is_mutating_action '$ACTION' '$@'` com todos os argumentos posicionais (`wifi-band-steer set`, `vpn-killswitch toggle`, `feature-toggle`), e invalidação atômica de todos os caches (`ark-hw-cache`, `ark-perf-cache`, `ark-stations-cache`, `ark-mwan-cache`, `ark-features.cache`) **antes** de liberar `/tmp/ark_mutation.lock` (e `fetchCapabilities(true)` no frontend JS).
    - Fechamento explícito de descritores (`</dev/null >/dev/null 2>&1 &`) em 29 subshells assíncronos de segundo plano e recarga `service rpcd reload` em segundo plano no `system-package-op` para nunca derrubar a resposta HTTP/ubus da própria chamada RPC.
  - **Ordem Determinística de Promoção SQM/CAKE & Prevenção de Reabertura Fantasma de Modais (`sqm.sh`, `devices.sh`, `ezsetup.sh`, `doctor.sh`, `lifecycle.js`, `formatters.js`, `network_modals.js`)**:
    - Execução sequencial de `switchProfile` (`profile` ➔ `sqm-toggle`) e garantia de que `/etc/init.d/sqm restart/stop` sempre execute **antes** de `sync_sqm_flow_offload` + `ark_promote_cake_mq` em todas as 10 rotas de mutação SQM.
    - Guarda `_arkModalClosing` em `closeModal` (`src/core/formatters.js`) impedindo que cliques em botões ou no backdrop durante os `180ms` da animação de saída reabram um modal fantasma, e preservação do modal da Central de Desempenho aberto ao alternar switches individuais.
  - **Suíte de Testes Locais `25x` Mais Rápida & Internacionalização Tripla `100%` (`5.005` chaves)**: Execução completa da suíte (`pytest` + auditorias) acelerada para `~3.8s` e cobertura 100% validada em PT-BR, EN e ES (`5.005` chaves).
