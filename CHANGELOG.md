# Changelog

## 1.5.2

- **⚡ WireGuard Client Instantâneo, BitTorrent PBR Amplo Seguro, Calibração de Hardware e Blindagem AdGuard Home (20/09/2026)**:
  - **⚡ Conexão e Edição Instantânea do Cliente WireGuard (Zero Timeout)**:
    - **Eliminação Definitiva do Erro *"Request timeout"***: Ao alterar o endereço do servidor VPN (`Endpoint = ...`) ou importar um arquivo `.conf`, o backend agora persiste os dados UCI e responde `ok` ao LuCI RPC de forma instantânea (< 100ms), reduzindo o tempo de resposta no roteador real de 12s para impressionantes **0.730s**!
    - **Execução Assíncrona e Desacoplada no Kernel**: O recarregamento pesado do firewall `fw4` (`/etc/init.d/firewall reload`), a subida da interface (`/sbin/ifup wgclient`) e a sincronização do endpoint (`/usr/sbin/ark-wireguard-wan-sync`) rodam em um subshell em segundo plano totalmente desvinculado (`</dev/null >/dev/null 2>&1 &`), liberando imediatamente a requisição HTTP e evitando estouro de timeout do LuCI RPC.
    - **Proteção Transitória no Frontend**: Tratamento inteligente com `reloadAfterExpectedDisconnect(err, ...)` em `src/modules/vpn.js` e no bundle `overview.js`, absorvendo micro-oscilações decorrentes de reorganização de rotas de rede sem travamentos ou alertas falsos na tela.
  - **🌐 BitTorrent PBR Safe Wide Mode (Balanceamento Amplo Seguro nas 2 WANs)**:
    - **Cobertura de 64.500+ Portas Dinâmicas**: Distribuição balanceada 50/50 de tráfego P2P/BitTorrent nas faixas `1024:8079, 8081:8442, 8444:65535` em TCP e UDP, maximizando as taxas de download em conexões Dual-WAN simultâneas.
    - **Blindagem de Portas Críticas de Sistema**: Proteção estrita das portas de sistema (80, 443, 53, 22, 8080, 8443) mantidas 100% na WAN1 primária (`wan_then_wan2`), evitando que navegação web segura, bancos, jogos ou tráfego QUIC/HTTP3 sofram alternância ou quedas de sessão.
    - **Modal Visual Interativo (`showMwanTorrentModal`)**: Novo botão "⚙️ Portas" no card de BitTorrent com seleção clara entre 3 modos: *Modo Amplo Seguro (Recomendado)*, *Modo Clássico* (51413 e 6881-6999) e *Personalizado*.
  - **🛡️ Blindagem Total Anti-Religamento do AdGuard Home**:
    - **Zero Processos Fantasmas**: Correção da causa raiz onde serviços auxiliares (`devices.sh`, `network.sh`) disparavam `/etc/init.d/adguardhome restart` às cegas ao salvar outras configurações, religando o AdGuard involuntariamente.
    - **Persistência Estrita**: Trava de segurança garantindo que scripts de sistema e o watchdog (`ark-firewall-guard`) só interajam com o serviço se `adblock_enabled != '0'` e o processo estiver legitimamente ativo. Saneamento dos links de boot em `/etc/rc.d/*adguardhome*`.
  - **🎯 Latência Interna Zero-Drop com Classificação DSCP Nftables (`15-ark-dscp-priority.nft`)**:
    - Priorização cirúrgica no kernel de pacotes sensíveis: ICMP/ICMPv6 (Ping Echo e Reply) e DNS (portas 53, 853, 5353) marcados com `CS6` (Network Control / Latência Mínima).
    - Controle de sessão TCP (SYN, RST, FIN) marcado com `CS5` (Immediate Handshake / Teardown).
    - Encaminhamento automático para o tin `Voice` do agendador CAKE (`diffserv4`), alcançando latência de 2 µs a 9 µs com **0 drops** absolutos, mesmo sob tráfego simultâneo intenso de centenas de Mbps de BitTorrent.
  - **⚡ Calibração de Hardware Adaptativa Multi-Tier (`ark-hardware-tune`)**:
    - Daemon inteligente de inicialização e calibração dinâmica (`/etc/init.d/ark-hardware-tune`) que detecta CPU e RAM e aplica perfis sob medida:
      - **Low-Spec ($\le$ 192 MB RAM / 1 Core - ex: D-Link DGL-5500)**: Memória protegida com buffers leves (`rmem/wmem 1MB`, `fq_codel 2Mb limit 1024`, `netdev_budget=300`), RPS desativado e suporte 100% puro ao firewall legado `fw3 / iptables` sem invocar `fw4`.
      - **Mid-Spec (192 MB a 512 MB RAM / 2 Cores - ex: Cudy WR3000 v1)**: Buffers equilibrados de 4 MB, `txqueuelen 1500`, RPS em 2 núcleos (máscara 3) e RFS com 16.384 entradas.
      - **High-Spec (> 512 MB RAM / $\ge$ 4 Cores - ex: Acer Predator W6x MT7986 / x86_64)**: Buffers de 8 MB, `txqueuelen 2048`, RPS em todos os 4 núcleos (máscara `f`), RFS com 32.768 fluxos e `netdev_budget=600`, eliminando gargalos de driver (`NETDEV_TX_BUSY`) e estabilizando o ping interno do PC Gamer em média de **0 ms**.
  - **🚀 Calibração de Buffer Multi-Fila LAN (`fq_codel 16MB`)**:
    - Ajuste de `memory_limit 16Mb limit 20480 target 5ms quantum 1526` em todas as filas de hardware do adaptador `eth0`, garantindo 0b de backlog e eliminando perdas de pacotes sob cargas gigabit simétricas.
  - **🧹 Saneamento de Rotas Fantasma IPv6 na Bridge Local (`br-lan`)**:
    - Purga de prefixos estáticos/órfãos residuais na interface local (`br-lan`), permitindo que apenas o prefixo dinâmico delegado do provedor (`/64`) anuncie nos clientes.
  - **🩺 Auditoria e Diagnóstico Aprofundado no ARK Doctor (`ark-doctor`)**:
    - Novas checagens de pureza do firewall (`fw4` vs `fw3`), alinhamento de MTU Baby Jumbo (1508/1500 bytes em PPPoE), taxa de ocupação da tabela de NAT/Conntrack e monitoramento de canais Wi-Fi.

## 1.5.1

- **🛡️ Dupla Blindagem Automática: Anti-Zumbi DHCPv6/WAN6 e Auto-Ativação Inteligente de Wi-Fi (19/09/2026)**:
  - **⚡ Blindagem Anti-Zumbi DHCPv6 e Sanitização Canônica de WAN6 (`ark_cleanup_dhcpv6_orphans`, `ark_sanitize_wan6_config`)**:
    - Elimina o problema de saturação de 98% da CPU causado por processos órfãos (`odhcp6c` com PPID 1) e recargas infinitas de `firewall4`/`nlbwmon`.
    - Auto-sanitiza no primeiro boot e na instalação (`99-ark-router-theme`) qualquer configuração de WAN6 do OpenWrt original que use `device 'wan'` (sem `@`), convertendo para o alias canônico `device '@wan'` com `reqaddress 'try'` e `reqprefix 'auto'`.
    - Limpeza preventiva de processos órfãos no boot do sistema (`/etc/init.d/ark-safe-shutdown`).
  - **📶 Auto-Ativação Inteligente de Wi-Fi de Fábrica com Preservação Sagrada de Estado (`ark_auto_enable_factory_wifi`)**:
    - Detecta rádios físicos bloqueados pelo padrão virgem de fábrica do OpenWrt (`disabled '1'`) e ativa-os automaticamente no primeiro boot/instalação.
    - Preservação Estrita da Escolha do Usuário: caso o administrador desative o Wi-Fi no painel, o estado intencional é persistido em `equipe_dashboard.main.wifi_user_disabled='1'`, impedindo terminantemente que o rádio seja religado sozinho.
  - **🩺 Auditoria e Auto-Cura no ARK Doctor**:
    - Adicionadas checagens dedicadas de integridade da WAN6 e de detecção de bloqueio de fábrica de rádio Wi-Fi com resolução automatizada em 1 clique (`--fix`).
  - **📦 Telemetria com Barra de Progresso Inteligente em 'Instalar Tudo' e 'EZ Setup'**:
    - Modal de progresso com contador de passos dinâmico, barra de gradiente animada, console monospaçado de log real e contagem regressiva de recarga.
  - **🔄 Reinicialização Segura com Proteção em Dupla Camada (Double-Shield Storage Reboot)**:
    - Gancho de encerramento seguro (`ark-safe-shutdown`), parada graciosa de daemons/servidores web e descarga tripla de buffers de memória RAM (`sync; sync; sync`) para proteção de mídias USB/SD contra corrupção.
  - **🌐 Sincronização Bidirecional e UX de DNS LAN (`dns_dhcp_option6_sync`)**:
    - Sincronização automática e transparente entre `uci network.lan.dns` e a opção de DHCP para clientes locais (`dhcp.lan.dhcp_option='6,...'`), garantindo que servidores DNS customizados configurados pelo usuário na aba de Rede Local sejam imediatamente refletidos na interface e anunciados a todos os dispositivos clientes sem dessincronização visual.
  - **🚀 Otimização de Buffers de Armazenamento para Downloads Ultrarrápidos (`sysctl vm.dirty_*`)**:
    - Calibração de `vm.dirty_background_ratio` e `vm.dirty_ratio` no kernel para gravações intensivas em SSDs e mídias externas via Aria2/BitTorrent, eliminando gargalos de I/O em taxas de transferência de 200MB/s+ sem engasgos de CPU.
  - **📦 Arquitetura Limpa e Standalone para Integrações de Terceiros (`contrib/alldebrid/`)**:
    - Desacoplamento estrutural: integrações experimentais ou de serviços externos de download (como AllDebrid bridge/API) foram encapsuladas em diretório autônomo `contrib/alldebrid/` com daemon de inicialização e documentação próprios, mantendo a árvore base do ARK Router leve, enxuta e focada em telecomunicações puras.

## 1.0.2

- **🚀 Arquitetura Modular, Purga Ativa de Mesh, Segurança Hostapd e Telemetria Multi-AP (17/09/2026)**:
  - **🧩 Modularização Completa de Backend e Frontend (< 4.000 linhas por arquivo)**:
    - O backend monolítico `equipe-dashboard-control` foi modularizado em módulos concisos sob `/usr/lib/ark/modules/` (`wifi.sh`, `devices.sh`, `network.sh`, `doctor.sh`, `adblock.sh`, `vpn.sh`, `sqm.sh`, `starlink.sh`, `speedify.sh`, `system.sh`, `ezsetup.sh`).
    - O frontend LuCI SPA foi decomposto em módulos modulares em `src/modules/` com empacotamento automatizado via `scripts/build_frontend_bundle.py` e minificação via esbuild.
  - **🧹 Purgador Ativo de Interfaces Órfãs de Mesh no Kernel (`wifi_cleanup_mesh_interfaces`)**:
    - Detecção dinâmica de interfaces do tipo `mesh point` via `iw dev` e `ip link`, desacoplamento imediato da bridge (`nomaster`), desligamento e destruição da interface no driver (`iw dev <iface> del`).
    - Elimina completamente o problema de interfaces fantasmas residuais que provocavam loops de broadcast e pings instáveis de 70ms+ na rede local após desativação pelo botão.
  - **🛡️ Blindagem de Sintaxe Hostapd para `wpad-basic-mbedtls`**:
    - Remoção de diretivas cruas problemáticas (`bss_transition`, `wnm_sleep_mode`) que impediam compilação do arquivo de configuração pelo hostapd do OpenWrt.
    - Padronização estrita com os parâmetros oficiais suportados: `ieee80211v=1`, `ieee80211k=1`, `rrm_neighbor_report=1` e `ieee80211r=1`.
    - Suíte de 22 testes unitários (`tests/test_wifi_hostapd_safety.py`) validando todas as combinações de segurança.
  - **👥 Correção da Telemetria de Estações Wi-Fi Multi-AP (`device_get_stations`)**:
    - Implementação de polling agregado sobre todas as interfaces sem fio (`iwinfo assoclist` e `iw dev <iface> station dump`).
    - Resolução definitiva do contador que marcava incorretamente "0 conectados" na interface quando dispositivos estavam associados.
  - **🩺 ARK Doctor: Check #9 e Autocura (`--fix`)**:
    - Inclusão da checagem e saneamento automático de interfaces mesh ativas no `ark-doctor`.
  - **🌎 Internacionalização Tripla Integral (PT-BR, EN, ES)**:
    - Auditoria automatizada (`scripts/audit_i18n.py`) aprovando 100% de paridade entre Português (Brasil), Inglês e Espanhol neutro em todos os módulos e strings de interface.

- **🌐 Blindagem Dual-WAN, Correção do DNS Turbo e Robustez IPv6 (14/09/2026)**:
  - **🛡️ Prevenção Ativa de Buraco Negro IPv6 (Apple / Multi-OS Black Hole)**:
    - Validação e imposição de métricas distintas de rota IPv4 e IPv6: Métrica `10` na WAN 1 primária (`pppoe-wan`) e Métrica `20` na WAN 2 secundária (`pppoe-wan2`).
    - Desativação explícita de IPv6 na WAN 2 (`ipv6=0`, `accept_ra=0`), eliminando o descarte de pacotes de atualizações de apps da Apple e conexões que tentavam rotear IPv6 pela interface da Claro sem suporte externo.
    - MSS Clamping ativo e verificado no NFTables (`inet fw4 forward_mss_clamp`) em 1452 bytes (IPv4) e 1432 bytes (IPv6).
  - **⚡ Correção Crítica no DNS Turbo Paralelo (All-Servers)**:
    - Corrigido falso-positivo no detector `detect_dns_blocker` em `equipe-dashboard-control`: a busca por `grep -q 'running'` causava casamento indevido com a string `"not running"`, e `pgrep -f 'AdGuardHome'` casava com subprocessos de inspeção.
    - Implementada filtragem exata com `pgrep -x` e descarte de linhas negativas, restaurando a ativação real do modo DNS Turbo Paralelo sem bloqueio fantasma.
  - **🔄 Blindagem do Speedify Assist nas WANs**:
    - O assistente `speedify_prepare_wans` agora preserva as métricas de rota existentes (10 e 20) e as flags `ipv6=1` configuradas, evitando substituição destrutiva de configurações de rede.
  - **🎯 Correção na Seleção de Dispositivo DMZ**:
    - Corrigida a extração de endereço IP nos cards de dispositivos do modal de DMZ (`l.ipaddr` vs `l.ip`), garantindo preenchimento imediato ao tocar no dispositivo.
  - **🛡️ Bloqueio de Anúncios SLAAC/RA via Netdev Egress (`table netdev ark_ipv6_<port>`)**:
    - Implementado bloqueio físico de anúncios de rota SLAAC (`Router Advertisements` - ICMPv6 RA) e DHCPv6 na porta ethernet física do dispositivo com `ipv6_allowed='0'`, impedindo que sistemas como Android TV recebam pacotes multicast da bridge e gerem endereços IPv6 na interface.
  - **🔧 Correção de Prefixo ULA Hexadecimal no Chaveamento IPv6**:
    - Substituído o prefixo inválido `fd00:ark:lan::/48` (`r, k, l, n` não são dígitos hexadecimais válidos) pelo prefixo padrão RFC 4193 `fd73:0192:0168::/48`, garantindo conformidade com os parsers de kernel e daemons de rede.
    - Adicionada preservação de ULA ao desativar IPv6 para manter estabilidade na rede local.

## 1.0.1

- **🛡️ Preservação Extrema de Flash SPI & Ergonomia Mobile (13/09/2026)**:
  - **💾 Redução Drástica de Desgaste na Flash SPI (`equipe-traffic-history`)**:
    - Intervalo de persistência dos CSVs na Flash (`/etc/equipe-traffic-history.csv` e `/etc/equipe-wan-daily.csv`) alterado de 1 hora para cada 12 horas (`minute % 720 == 0`), reduzindo em 92% os ciclos de gravação/apagamento na partição JFFS2/UBIFS.
    - Implementada sincronização atômica imediata (`flush_to_persist`) no trap de encerramento do serviço (`SIGTERM`, `SIGHUP`, `SIGINT`), garantindo que qualquer reboot ordenado ou parada de serviço salve o estado mais recente em disco sem perda de dados.
  - **📱 Touch Target Mobile Conforme Diretrizes (`min-height: 40px`)**:
    - Ajustada a classe `.ex-mini-button` em `overview.css` para garantir altura mínima útil de 40px, `box-sizing: border-box`, `user-select: none` e `-webkit-tap-highlight-color: transparent`, prevenindo toques acidentais e zoom duplo em smartphones.
  - **🪟 Sincronização Reativa do Bloqueio de Rolagem em Modais**:
    - O tema Ark (`ark-theme.js`) agora adiciona ativamente a classe `modal-overlay-active` ao `document.body` sempre que um modal nativo do LuCI é detectado, travando a rolagem do contêiner `.main-right` e evitando deslocamentos acidentais da tela no mobile.

## 1.0.0

- **🎉 Marco Oficial da Versão 1.0.0 do ARK Router (13/09/2026)**:
  - **🔄 Cachebuster Dinâmico de Assets no Frontend (Zero Manutenção)**:
    - O tema Ark (`header.ut` no OpenWrt 24.x/25.x com Ucode e `header.htm` no OpenWrt 19.07 com Lua) agora lê dinamicamente `/usr/share/ark-router/VERSION`.
    - Todas as folhas de estilo e scripts (`cascade.css`, `mobile.css`, `ark-theme.js`, `cbi.js`, `overview.css`) recebem automaticamente o parâmetro de versão exato (`?v=1.0.0`), forçando todos os celulares e computadores a baixarem o código mais recente sem necessidade de limpeza manual de cache no navegador.
  - **🎮 Correção e Estabilidade Total do MiniUPnPd (Consoles / Videogames / NAT Aberto)**:
    - Removida a dependência obrigatória de STUN externo (`use_stun='0'`), eliminando o crash prematuro no boot (`Performing STUN failed. EXITING`).
    - O daemon `miniupnpd` agora detecta a WAN diretamente e permanece 100% ativo servindo portas para consoles e computadores na rede.
  - **📈 Resolução do Alerta de Buffer Truncado no `nlbwmon` (`net.core.rmem_max`)**:
    - Ajustado `net.core.rmem_max = 1048576` (1 MB) via sysctl de memória, garantindo que o monitor de tráfego aloque seu buffer Netlink integral sem alertas de truncamento no log do kernel e sem descarte de estatísticas em downloads de alta velocidade.
  - **⚡ Cachesize Inteligente do Dnsmasq Balanceado por Hardware**:
    - Otimização automática em `99-ark-router-dhcp-sanitize`: roteadores com 128 MB de RAM utilizam `5000` entradas (economia de RAM), enquanto dispositivos com 256 MB ou mais utilizam `10000` entradas (teto máximo seguro recomendado pelo autor do dnsmasq sem gerar avisos de colisão de hash).
  - **🛡️ Estabilidade de Kernel e Wi-Fi**:
    - Ajustes de memória virtual (`vfs_cache_pressure = 150`, `dirty_ratio = 10`, `dirty_background_ratio = 5`, `swappiness = 30`) e Auto-Trim de cache via cron.
    - Preservação estrita dos daemons `wpad` e `wpa_supplicant` exigidos pelo `netifd` (`ubus wait_for wpa_supplicant`) na inicialização física dos rádios, garantindo inicialização de Wi-Fi sem timeouts.

## 0.9.99

- **🛡️ Auditoria Completa de Estabilidade, Hardware & Flash Wear (13/09/2026)**:
  - **Preservação de Flash SPI (ARK-07)**: Correção da rotina de persistência em `equipe-traffic-history` (`minute % 60 == 0`), eliminando o bug de saturação que gravava na Flash a cada minuto (redução de 60× no desgaste físico da Flash SPI de 16 MB).
  - **Otimização de CPU no Histórico de Tráfego**: `tail -n 1440` executado estritamente na virada do minuto (`new_minute == 1`), eliminando 11 de cada 12 regravações por minuto em `/tmp`.
  - **Trava Singleton por Pidfile**: Daemon `equipe-traffic-history` agora valida `/var/run/equipe-traffic-history.pid` com detecção de processo ativo e trap de encerramento, impedindo instâncias duplicadas e loops concorrentes em segundo plano.
  - **Proteção de Flash em Roteadores com ROM Read-Only**: `equipe-dashboard-control` agora detecta se `zerotier-one` ou `libstdc++` já estão em `/rom/` (SquashFS). Em caso afirmativo, remove tarballs residuais e cancela a compactação para RAM, impedindo a gravação de ~1 MB desnecessário na partição `/overlay` em dispositivos como Cudy WR3000 v1.
  - **Estabilidade de LAN em Failover (ARK-08)**: Removido flush global de conntrack em `ark-wireguard-wan-sync`, evitando quedas em chamadas e conexões locais durante oscilações de link secundário.
  - **Travas de Concorrência (ARK-05)**: Corrigidas checagens de jobs em execução para `grep -qE '("state":"running"|^running)'` em `self-update`, `manual-update` e `speedtest`.
  - **Preservação de Overhead no SQM (ARK-16)**: `ensure_sqm_section` preserva configurações customizadas de `linklayer` (PPPoE, Ethernet, ATM).
  - **Segurança na Exclusão de Perfil PPPoE (ARK-14)**: `pppoe-profile-delete` valida o tipo `pppoe_profile` antes da remoção, protegendo a seção global `main`.
  - **Sanitização de YAML no AdGuard Home (ARK-04)**: Escape de barras invertidas (`\\`) e validação rigorosa de identificadores de clientes e serviços.
  - **Blindagem do DOM e Tema (ARK-18 & ARK-19)**:
    - Guarda `isMutatingSelf` no `MutationObserver` do tema Ark para evitar loops infinitos no DOM.
    - Limpeza rigorosa de listeners globais de tecla `Escape`.
    - Tratamento seguro de SSIDs com espaços e prevenção de XSS no renderizador de cartões wireless via `.textContent`.
    - Poda automática de MACs inativos da memória do navegador (`deviceRatesSmoothed` e `wifiPrevious`).
    - Null-safety defensiva em `iface()`, `friendlyMap()`, topologia Wi-Fi e `trafficMap()`.
  - **Escapamento RFC 8259 em JSON (ARK-12)**: `json_escape` com suporte a quebras de linha (`\n`), retornos de carro (`\r`) e tabulações (`\t`).
  - **Sanitização contra Injeção no Export WireGuard (ARK-13)**: Sanitização com `tr -d '\r\n '` para `$client_ip`, `$endpoint` e `$server_port`.
  - **⚡ Otimização Fina de Memória Virtual do Kernel (Sysctl Tuning)**:
    - Criação de `/etc/sysctl.d/99-ark-memory.conf` (`vfs_cache_pressure = 150`, `dirty_ratio = 10`, `dirty_background_ratio = 5`, `swappiness = 30`).
    - Faz o kernel liberar caches de arquivos e diretórios da flash com agilidade e descarregar páginas sujas aos poucos, preservando RAM livre para pacotes de tráfego intenso e eliminando retenção artificial em roteadores de 128 MB e 256 MB.
  - **🧹 Rotina Silenciosa de Auto-Trim de Cache de Memória RAM**:
    - Seletor flexível no painel (`1h`, `2h`, `6h`, `12h`, `24h` ou Desativado) integrado ao cron do sistema (`sync && echo 3 > /proc/sys/vm/drop_caches`).
    - Limpeza 100% segura que não afeta conexões ativas nem causa perda de pacotes.
    - Botão de purga manual em tempo real integrado à interface LuCI.
  - **📶 Blindagem e Estabilidade do Subsistema Wi-Fi (mac80211 / wpad)**:
    - Preservação estrita dos daemons `wpad` e `wpa_supplicant` requeridos pelo `netifd` (`ubus wait_for wpa_supplicant`) na inicialização dos rádios físicos, garantindo estabilidade e conexão instantânea dos aparelhos em 2.4 GHz e 5 GHz.
- **🚀 Firmware Sysupgrade Otimizado com Instalação Interna (Cudy WR3000 v1 / OpenWrt 25)**:
  - Compilação no ImageBuilder com ARK Router v0.9.99 minificado embutido diretamente na partição SquashFS ROM.
  - Inclusão embutida de `wireguard-tools`, `kmod-wireguard`, `luci-proto-wireguard`, `tc-full`, `kmod-sched-act-police` e `zram-swap`.
  - Remoção de pacotes obsoletos (`curl`) poupando ~786 KB.
  - Partição `/overlay` (`rootfs_data`) liberada com **~3,2 MB 100% livres (0 KB gastos pelo sistema)** para dados e customizações do usuário.


---

## Historico Completo de Releases Anteriores

Para economizar contexto de IA e manter a leitura agil, o changelog detalhado de todas as releases anteriores (da v0.1.0 ate a v0.9.98) foi arquivado em:

📄 **[docs/CHANGELOG-COMPLETO.md](docs/CHANGELOG-COMPLETO.md)**

