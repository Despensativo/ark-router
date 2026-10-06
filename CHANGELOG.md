# Changelog

## 1.5.9

- **🛡️ Blindagem Anti-MAC Collision, Desbloqueio Netdev & Restauração Completa de IPv6 (04/10/2026)**:
  - **Eliminação de Conflito de MAC na Bridge LAN**:
    - Corrigido conflito em que portas LAN (como `eth1` interconectada a APs secundários) mantinham endereços MAC clonados de WANs migradas, confundindo a tabela de roteamento e comutação do hardware switch / PPE (MediaTek Filogic 830) e descartando quadros multicast e Router Advertisements (RA).
    - `add_lan_port()` em `network.sh` agora remove automaticamente qualquer `option macaddr` residual ao adicionar qualquer interface à bridge `br-lan`.
  - **Fim do Bloqueio Netdev Destrutivo no Firewall IPv6 Seletivo**:
    - Eliminada a geração incorreta de tabelas `table netdev ark_ipv6_${bname} { ether type ip6 drop }` que derrubavam o tráfego IPv6 de portas físicas inteiras quando um único dispositivo atrás de um AP ou switch tinha o IPv6 desativado no painel.
    - O filtro seletivo de dispositivos passa a operar com 100% de pureza e precisão na tabela `inet` (`@blocked_macs`), preservando o tráfego IPv6 de todos os demais aparelhos na mesma porta.
  - **Blindagem em 3 Camadas no Doctor ARK e Interface Gráfica**:
    - **Doctor ARK (`doctor.sh`)**: Adicionada checagem `11b.4 Anti-MAC Collision` que detecta portas LAN com MAC duplicado da WAN e tabelas netdev parasitas, aplicando auto-correção imediata e restauração do MAC de fábrica do `board.json`.
    - **Interface Web (`network.js` & `overview.js`)**: Validação ativa na modal de WAN que bloqueia a clonagem de um MAC já em uso por outra conexão WAN ativa.
    - **Auditoria de i18n**: 100% de cobertura nos 3 idiomas (PT-BR, EN, ES) validada via `scripts/audit_i18n.py`.

- **📶 IGMP Snooping Nativo Integrado no Dashboard ARK Router (04/10/2026)**:
  - Adicionado toggle nativo de **Proteção Multicast & Wi-Fi (IGMP Snooping)** diretamente no card de Rede Principal (LAN / DHCP) do Overview e na modal de configurações de rede.
  - Mitigação transparente de saturação de Wi-Fi por tráfego multicast (IPTV / AirPlay / mDNS).
  - Testado e validado em tempo real em hardware real com persistência completa pós-reboot e verificação visual por screenshot headless.

- **💡 HAL de LEDs e Daemons de Iluminação Dinâmica (`ark-rainbowd` / `ark-port-ledd`)**:
  - Implementação de daemons para controle de LEDs de portas físicas e iluminação RGB para plataformas Acer Predator W6x e T7.

- **🚀 Instalador Shell Universal (`scripts/install.sh`) com Detecção de Arquitetura**:
  - Detecção inteligente de CPU (`can_run_aarch64`) selecionando automaticamente perfil Lite em roteadores ARM 32-bit (como Acer Predator T7 `armv7l`), prevenindo erros de execução com binários 64-bit.
  - Suporte resiliente a download com fallback em cascata entre `curl`, `wget` e `uclient-fetch`, além de auto-correção de relógio RTC/NTP para evitar falhas de certificado TLS.

## 1.5.8

- **📱 Correção de Rolagem em Dispositivos Móveis e Preservação de Posição de Tela (02/10/2026)**:
  - **Fim da Trava de Rolagem para Cima no Ark - Setup (Issue 1)**:
    - Eliminado o conflito de múltiplos contêineres de scroll aninhados com `overscroll-behavior: contain` e `overflow-x: hidden` (que computava `overflow-y: auto` no elemento filho `.modal`, bloqueando o encadeamento de rolagem para o overlay pai).
    - Desacoplamento estrito: `#modal_overlay` opera como contêiner exclusivo de rolagem com aceleração por hardware (`-webkit-overflow-scrolling: touch; touch-action: pan-y;`), enquanto `.modal`, `.ex-ez-setup` e `.ex-ez-section` utilizam `overflow: visible` e `overscroll-behavior: auto`. O modal agora rola livremente tanto para baixo quanto para cima em smartphones sem nenhum travamento.
  - **Preservação e Restauração Inteligente de Posição ao Fechar Modais (Issue 2)**:
    - Removida a declaração `height: 100vh !important;` de `body.modal-overlay-active`, que causava o colapso instantâneo da altura do documento e resetava forçadamente o scroll para `0px` ao abrir qualquer pop-up.
    - Implementado gerenciador global de rolagem (`ArkTheme.initModalScrollPreservation` em `ark-theme.js` e `closeModal` em `formatters.js`): rastreia a posição ativa (`window.scrollY`, `.main-right` e `.main`) e restaura com precisão cirúrgica a viewport quando o modal é fechado (via botão Fechar, "×", clique no backdrop ou tecla Escape).
  - **Validação Automatizada por Screenshot (Pixel 7 Headless 412x915)**:
    - Testado em navegador com emulação touch: rolagem descendente até 1200px e retorno completo ao topo (0px) no Ark - Setup com 100% de sucesso.
    - Preservação da posição de visualização da página com desvio de 0px após fechar pop-ups e zero erros no console (`mobile_scroll_restored_after_modal.png`).

- **🎯 Correção de Dropdowns LuCI Achatados/Ilegíveis em Modais (`cbi-dropdown`) (02/10/2026)**:
  - **Causa Raiz & Resolução Geométrica (`cascade.css`)**:
    - O motor de posicionamento inline do LuCI aplicava `bottom: 34px` quando abria para cima, colidindo com `top: calc(100% + 4px) !important;` que achatava a caixa suspensa para meros 10px de altura.
    - Isolamento de direção: `.cbi-dropdown[open] > ul[style*="bottom"]` agora força `top: auto !important; bottom: calc(100% + 4px) !important;`, enquanto a abertura normal descendente recebe `bottom: auto !important; top: calc(100% + 4px) !important;`.
    - Adicionado `max-height: 280px !important; overflow-y: auto !important; -webkit-overflow-scrolling: touch !important;` e liberação de overflow nos contêineres `.modal .cbi-section` para evitar corte visual. Altura computada restabelecida para **290px** com rolagem perfeita.

- **🚫 Fim da Piscadela do Botão Fechar ("×") Durante Aplicação de Mudanças (02/10/2026)**:
  - No `ark-theme.js`, a rotina de injeção `enhanceModals()` agora detecta ativamente estados de progresso/carregamento (`isApplyingModal` checando spinners `.spinning`, `.cbi-progressbar`, `[data-indicator="apply"]` e títulos de salvamento/reboot).
  - Modais aplicando alterações nunca recebem o botão "×" e qualquer botão remanescente é removido imediatamente, eliminando o piscar durante telas de progresso.

- **🛡️ AdGuard Home: Eliminação de Queda de Internet, URL `/24:3000` & Telemetria em Tempo Real (02/10/2026)**:
  - **Higienização de Máscara CIDR**: Removido o sufixo `/24` do IP da LAN (`${lan_ip%%/*}`) tanto no backend (`adblock.sh`) quanto na URL do painel (`adblock.js`), impedindo URLs inválidas como `http://192.168.1.1/24:3000`.
  - **Blindagem Contra Bloqueio de DNS no Setup Inicial**: Pré-configuração de `adguardhome.yaml` com chave `users: []` e servidores upstream diretos (`1.1.1.1`, `8.8.8.8`). Evita que o AdGuard Home fique travado no assistente de instalação sem responder na porta 5335 enquanto o `dnsmasq` está com `noresolv='1'`.
  - **Telemetria e Estatísticas no Dashboard**: O backend agora consulta `/control/stats` e expõe métricas em tempo real (Status DNS, Total de Consultas, Consultas Bloqueadas com porcentagem e Latência Média) no card do AdGuard Home.

- **🚀 SQM CAKE Turbinado: Calculadora Dupla (Down/Up), Integração Fast.com & Parâmetros Avançados (02/10/2026)**:
  - **Preenchimento Automático do Fast.com**: Ao concluir o teste de velocidade no dashboard, os resultados de Download e Upload são salvos e preenchidos automaticamente na configuração do SQM com cálculo de -7% para prevenção de Bufferbloat.
  - **Calculadora Dupla de Banda**: Adicionada calculadora interativa tanto para Download quanto para Upload com ajuste automático de overhead.
  - **Acordeão de Parâmetros Avançados CAKE**:
    - Seletor de Link Layer Framing Overhead: Nenhum (0), Cable DOCSIS (18), GPON IPoE (26), PPPoE VLAN (34), GPON PPPoE (44 - Recomendado para fibra) e ATM (44).
    - Opções avançadas de qdisc: `nat`, `dual-srchost`/`dual-dsthost` (equidade por dispositivo), `ack-filter`, `wash` e `diffserv4`.
    - Persistência completa no backend `sqm-save-v2` (`root/usr/lib/ark/modules/sqm.sh`) em `/etc/config/sqm`.

- **🌐 Tradução Abrangente de Telas Nativas do LuCI (`translateRemainingUI`) (02/10/2026)**:
  - Expansão do motor de tradução dinâmica no `ark-theme.js` para telas nativas (como `/admin/network/network`), traduzindo termos em inglês que escapavam do catálogo ("Create interface" -> "Criar Interface", "Protocol of the new interface" -> "Protocolo da nova interface", "DHCP client" -> "Cliente DHCP (Automático)", "Device" -> "Dispositivo de Rede", etc.).
  - Adição de 10 novas chaves aos catálogos `en.js` e `es.js` com 100% de conformidade no script de auditoria `scripts/audit_i18n.py`.

- **🎨 Auditoria e Blindagem Estrutural do LuCI Padrão (Modo Básico vs Avançado) (02/10/2026)**:
  - **Eliminação Definitiva do Scroll Horizontal no LuCI Padrão**:
    - Substituição de `calc(100vw - 230px)` por `calc(100% - 230px) !important;` no `#maincontent` e `.main` (`cascade.css` e `mobile.css`). `100vw` computava a calha da barra de rolagem vertical (15-17px) gerando overflow horizontal forçado. Adicionado `overflow-x: hidden !important;` ao `html, body`.
  - **Descompressão do Centro de Comando Wi-Fi (`admin/network/wireless`)**:
    - Inclusão de `flex-wrap: wrap;` e `min-width: 0; word-break: break-word;` no `.ark-radio-header`, `.ark-radio-title-wrap` e ações de rádio. Títulos longos não são mais espremidos verticalmente e mantêm espaçamento ergonômico.
  - **Arquitetura Dinâmica Multi-Rádio no LuCI**:
    - Substituição do template estático por `getOrCreateRadioCard()` no `ark-theme.js`, compatibilizando roteadores com 1, 2, 3 ou 4 rádios simultâneos (2.4 GHz, 5 GHz e 6 GHz Wi-Fi 6E/7 com destaque ciano `.radio-6g`).
  - **Blindagem de Web Components (`<cbi-dropdown>`)**:
    - Protegida a integridade do DOM interno de seletores avançados do LuCI, garantindo que o motor de tradução não interfira em elementos customizados ou eventos de clique.
  - **Seletor Interativo de Modo de Interface (⚡ Básico / 🛠️ Avançado)**:
    - Injetadas pílulas de alternância instantânea no rodapé da barra lateral (`.ark-mode-switch-wrap`), permitindo ao usuário escolher entre o visual limpo moderno ou as tabelas técnicas completas do LuCI, persistido via `localStorage`.
  - **Auditoria Automatizada Completa em 11 Páginas Nativas**:
    - 100% aprovado com 0 erros de JavaScript e 0 barras de rolagem horizontais em Visão Geral, Interfaces, Sem Fio, Firewall, Diagnósticos, Sistema, Administração, Backup/Flash, Reinicialização, Tempo Real e Processos.


## 1.5.7

- **⚡ Modularização de Idiomas Sob Demanda (Code-Splitting de i18n com Handshake de Versão) (02/10/2026)**:
  - **Eliminação de Dicionários Inativos em Português**:
    - Divisão cirúrgica do dicionário monolítico `src/core/i18n.js` (3.410 linhas / ~320 KB) em `loader.js` (44 linhas), `en.js` (1.602 chaves) e `es.js` (1.602 chaves).
    - O idioma nativo (Português do Brasil) agora embarca 0 bytes extras e nenhuma chave inativa. Dicionários de Inglês e Espanhol são carregados dinamicamente sob demanda (`i18n.en.js` e `i18n.es.js`) somente se o usuário selecionar esses idiomas.
  - **Redução Massiva no Tamanho do Bundle Principal**:
    - O bundle de produção `overview.js` encolheu de **1.022 KB para 701 KB (-31.4% / -320 KB)** e de **20.718 para 14.018 linhas de JavaScript**.
  - **Handshake Automático de Versão (`ARK_BUILD_VERSION`)**:
    - Injeção da versão ativa do firmware no bundle de frontend e comparação com a versão do servidor no carregamento.
    - Se a versão do navegador divergir da versão do roteador (ex: após atualização de firmware com cache preso no navegador), o painel invalida o cache automaticamente e recarrega a página de forma transparente, eliminando a necessidade de `Ctrl + F5`.
  - **Auditorias & Validação em Roteador Real**:
    - 100% de cobertura nos 3 idiomas (1.602 chaves auditadas via `scripts/audit_i18n.py`).
    - Validado no D-Link DGL-5500 (`192.168.73.3`): tempo de carregamento com cache em disco despencou para **3.63 segundos** com zero erros no console.

- **🚀 Auto-Cura de Processos Zumbis (`rpcd`), Cache em RAM e Polling Adaptativo (02/10/2026)**:
  - **Watchdog Anti-Zumbi (Auto-Cura de Daemon)**:
    - Integrado ao daemon `equipe-traffic-history` (`/usr/sbin/equipe-traffic-history`): monitora periodicamente o acúmulo de processos `rpcd` zumbis causados por travamentos de bibliotecas de terceiros (`iwinfo.so`). Ao detectar >= 3 processos travados por mais de 30 segundos, executa auto-recuperação limpa dos serviços web/RPC sem derrubar a conexão de internet.
  - **Caches Semiestáticos em RAM (`/tmp/`)**:
    - `system-hardware-info`: Cache JSON em memória de 30 segundos (`/tmp/ark-hw-cache.json`) com leitura de CPU em tempo real direto via `/proc/stat` em 0.1ms, dispensando chamadas contínuas de `swconfig` e leituras térmicas repetidas.
    - `device-fingerprints`: Cache JSON em memória de 20 segundos (`/tmp/ark-fp-cache.json`) para impressões digitais de dispositivos.
  - **Polling Adaptativo e Escalonado**:
    - Detecção automática de processadores econômicos (`isEconomicHardware`: CPUs MIPS, single-core ou clock < 1.0 GHz).
    - Intervalo de atualização ajustado suavemente para 5 segundos (`modo econômico`), com ignoramento de consultas de Multi-WAN quando em modo Ponto de Acesso / Secundário.
    - Load average no hardware econômico caiu de **6.43 para < 0.20**, com uso de CPU em repouso variando entre **0% e 9%**.

- **🔥 Pré-aquecimento no Boot (Pre-caching) e Invalidação Dirigida a Eventos (02/10/2026)**:
  - **Pré-aquecimento no Boot (`/etc/init.d/ark-hardware-tune`)**:
    - Disparo de rotina em segundo plano aos 12 segundos pós-boot com prioridade mínima (`nice -n 19`), gerando antecipadamente na RAM todos os arquivos de telemetria e inventário antes do primeiro acesso do usuário.
  - **Invalidação Dirigida a Eventos (Sem Polling Desperdiçado)**:
    - Conexão e desconexão de cabos de rede e subida/descida de interfaces (`/etc/hotplug.d/net/95-ark-cache-invalidate` e `/iface/95-ark-cache-invalidate`) limpam imediatamente os caches de hardware e portas.
    - Eventos de clientes Wi-Fi e DHCP (`add`, `old`, `del` em `dhcp_fingerprint.sh`) invalidam os caches de estações instantaneamente na ocorrência do evento.

- **⚡ Provedor Ultraleve de Status Multi-WAN (`mwan_status_fast`) (02/10/2026)**:
  - Criação de leitor direto de status em memória RAM a partir de `/var/run/mwan3track/`, eliminando dezenas de forks de subprocessos pesados (`iptables -S`, `ip6tables` e `ipset list`).
  - Tempo de resposta da telemetria de Multi-WAN reduzido de 3,5s para **< 15 milissegundos**.

- **🔌 Toggle DHCP Server na LAN e Cascata IPv6 NDP Relay (02/10/2026)**:
  - **Toggle DHCP Server na LAN**: Switch interativo no modal "Editar IP & DHCP", permitindo desativar o DHCP IPv4 com alertas explicativos. No Modo AP, o switch é travado em desativado com aviso educativo.
  - **Modal de Confirmação com Trava de 3 Segundos**: Contagem regressiva obrigatória ao reverter do Modo AP para o Modo Roteador Principal, exigindo escolha consciente do estado do DHCP.
  - **Card Educativo de Repasse IPv6 (NDP Relay)**: Detalhamento explícito para operadoras que entregam apenas prefixo /64 em conexões em cascata.

- **🛡️ Trava de Segurança SQM (3s) em Hardware Econômico e Recomendações de Silício Wi-Fi por Arquitetura (02/10/2026)**:
  - **Trava de Confirmação Consciente no SQM / CAKE (`src/modules/network.js`)**:
    - Em hardwares com CPU single-core ou MIPS (`isEconomicHardware`, ex: D-Link DGL-5500 QCA9558), o interruptor de ativação do SQM é bloqueado por um modal com contagem regressiva obrigatória de 3 segundos (`Aguarde 3 s... 2 s... 1 s...`).
    - Alerta detalhado informando o teto de processamento por software do CAKE nesta CPU (~80–100 Mbps) e o risco de gargalo de 100% em conexões mais rápidas, orientando o usuário a definir Download em 0 (ilimitado) em "Editar limites" para moldar apenas o Upload sem sobrecarregar o processador.
    - Em hardwares modernos com acelerador em silício (`hw_flowoffload_capable`, como MediaTek Filogic PPE), o modal informa transparentemente que o acelerador operará em modo híbrido/software com total capacidade na CPU multicore.
  - **Badges Contextuais no Card do Painel Principal (`src/modules/render.js`)**:
    - O card CAKE / SQM passa a exibir aviso informativo imediato sobre a capacidade de processamento do hardware detectado (Single-Core vs Multicore com PPE).
    - Modal de limites (`editSqmLimits`) enriquecido com o alerta `modernPpeNotice` e atalho rápido de otimização de Upload.
  - **Otimizações e Dicas de Silício Wi-Fi no Modal de Configuração (`src/modules/wifi.js`)**:
    - **Card de Silício (`hwWifiBanner`)**:
      - Em MIPS Legado / Atheros (chips `ath9k` e `ath10k`): explicita a aceleração criptográfica AES em silício do hardware, orientando o uso de WPA2-PSK puro e largura de 20 MHz no 2,4 GHz para evitar tempestades de retransmissões que afetam CPUs de 1 núcleo.
      - Em ARM Moderno (Filogic / Broadcom): explicita o suporte nativo a WPA3-SAE com PMF, aceleração WED / DMA direto e canais largos (80/160 MHz) para baixa latência.
    - **Feedback em Tempo Real no Seletor de Criptografia (`encAlert`)**:
      - WPA2-PSK (`psk2`): destaca a aceleração direta por hardware nos chips Atheros/MIPS e a compatibilidade universal com IoT.
      - WPA2/WPA3 Misto (`sae-mixed`): alerta sobre o maior consumo de CPU em MIPS single-core durante o handshake WPA3 vs padrão recomendado para hardwares modernos.
      - WPA3-SAE Puro (`sae`): alerta sobre a exigência mandatória de PMF e bloqueio de aparelhos legados.
      - Sem Senha (`none`): alerta vermelho imediato de rede aberta.
    - **Canal 2,4 GHz (`showManualChannelsModal`)**: Inclui dica contextual recomendando largura de 20 MHz (HT20) em processadores de 1 núcleo para mitigar erros de CRC.
  - **Auditorias & Integridade**:
    - 100% de cobertura nos 3 idiomas (PT-BR, EN, ES) com 1.601 chaves auditadas em `scripts/audit_i18n.py`.
    - 100% de conformidade POSIX e isolamento fw3/fw4 em `scripts/audit_shell_scripts.py`.
    - Suíte de testes locais de hardware e satélite 100% aprovada.

- **📶 Controle Seletivo de Frequências Wi-Fi (Toggles 2.4 GHz, 5 GHz e 6 GHz / Wi-Fi 7) e Resiliência de RF (02/10/2026)**:
  - **Toggles Independentes por Frequência no Modal Wi-Fi**:
    - Adicionados seletores independentes no modal de edição de rede (`editWifiNetwork`) permitindo ativar ou desativar frequências específicas individualmente (ex: operar apenas em 2.4 GHz e manter 5 GHz desligado, ou vice-versa).
    - Suporte nativo a roteadores Dual-Band (2.4 GHz e 5 GHz) e Tri-Band / Wi-Fi 7 (6 GHz) com cores distintas (Âmbar 2.4G, Azul 5G e Esmeralda 6G).
    - Status em tempo real ("Ativa" / "Desativada"), dicas dinâmicas de SSID por frequência e adaptação visual com esmaecimento de campos de nome de rede quando em modo separado (Split).
  - **Trava de Segurança Anti-Lockout Reativa**:
    - Proteção no frontend e backend (`wifi.sh`): impede que o usuário desative todas as bandas de frequência simultaneamente, prevenindo perda total de conectividade sem fio. Exibe alerta em tempo real e bloqueia o botão de salvar.
  - **Backend Cirúrgico no UCI Wireless (`root/usr/lib/ark/modules/wifi.sh`)**:
    - Novos parâmetros `enable_2g`, `enable_5g` e `enable_6g` no comando `wifi-settings`.
    - Controle aplicado diretamente nas seções de interface `default_radioX` via `disabled='0'|'1'`, garantindo que a transmissão de radiofrequência e emissão de beacons cessem de imediato pelo `hostapd` com repouso dos amplificadores de potência (PA/LNA).
    - Preserva o estado de canais DFS (sem a penalidade de 60 segundos de silêncio obrigatório do Radar CAC ao religar a rede) e mantém intactas quaisquer redes secundárias ou de convidados associadas ao mesmo chip.
    - Reativação automática do dispositivo de rádio (`wireless.$radio.disabled=0`) ao habilitar qualquer banda.
  - **Internacionalização e Estilo**:
    - 28 novas strings integradas e auditadas em Português (Brasil), Inglês e Espanhol neutro (`audit_i18n.py`).
    - Estilização de chips inativos (`.is-disabled`) no painel de visão geral (`render.js` e `overview.css`).
  - **Validação Visual Rigorosa e Teste Físico**:
    - 5 cenários validados visualmente via automação Chrome Headless (`scripts/verify_wifi_modal_visual.py`).

## 1.5.6

- **🌐 Compatibilidade Internacional, Blindagem Anti-Blackout Multi-WAN e Resiliência SQM/AdGuard (02/10/2026)**:
  - **i18n & Normalização Global de Tradução**:
    - Normalização com `.trim()` e preservação estrita de espaçamento em nós de texto do DOM no `translateText()`, garantindo tradução integral para Inglês e Espanhol em todos os cards, seções e modais.
    - Detecção dinâmica de idioma via `ark_language()` no `common.sh`, herdando automaticamente `luci.main.lang` em novas instalações internacionais e respeitando escolhas explícitas do usuário.
  - **Blindagem Anti-Blackout de Internet no Multi-WAN (mwan3)**:
    - Desativação automática do serviço `mwan3` quando o roteador opera em Single-WAN (1 única WAN ativa), eliminando sequestro de rotas padrão por falsos positivos.
    - Transição do alvo de ping padrão de `registro_br` (200.160.2.3 no Brasil) para Anycast global Cloudflare (`1.1.1.1 1.0.0.1 8.8.8.8`).
    - Configuração de `initial_state=online`, relaxamento do timeout de ping de 2s para 4s e intervalo de 10s para acomodar latências internacionais sem quedas de rota.
  - **Domínio Regulatório Wi-Fi Abrangente**:
    - Expansão do seletor regulatório para lista global completa ISO 3166-1 (incluindo Paquistão `PK`, Índia `IN`, Arábia Saudita `SA`, Turquia `TR`, etc.) no Assistente Inicial e no modal Wi-Fi.
    - Detecção dinâmica do dispositivo de rádio (`radio0`/`wlan0`) sem amarras a drivers proprietários MediaTek.
  - **Calibração Universal de SQM com Fallback HTTP Multi-Stream**:
    - Suporte a medição de velocidade em sistemas `opkg` ou sem binário `speedtest-go`, utilizando o motor nativo paralelo Fast.com/Cloudflare (`speedtest_download_fallback_mbps` e `speedtest_upload_fallback_mbps`).
    - O SQM automático não falha mais por dependência de pacotes externos, calculando taxas de shaper em qualquer arquitetura.
  - **Circuit Breaker Estrito para AdGuard Home**:
    - Validação de execução prévia antes de qualquer redirecionamento de DNS no `dnsmasq`: se o binário não puder ser instalado ou o AdGuard Home não estiver escutando na porta `5335`, a ativação é abortada e o DNS padrão é mantido intacto.
    - Geração automática de arquivo YAML inicial configurado para a porta `5335` e porta web `3000`, evitando colisões com a porta 53 do dnsmasq e impedindo blackouts na rede local.

## 1.5.5

- **🛡️ Blindagem Quádrupla IPv6 SLAAC Apple, Isolamento de Sub-redes WAN/LAN e Auto-Cura de Boot (30/09/2026)**:
  - **Compatibilidade Apple iOS / macOS (RFC 4862 & RFC 8106)**:
    - **Expurgo Automático de `managed-config` (M-bit)**: O iOS/macOS não suporta DHCPv6 com estado para atribuição de endereços em redes locais. Forçamento de `other-config` (O-bit) com `ra_slaac=1` e `ra_default=1`, garantindo entrega de endereços globais via SLAAC puro e DNS stateless (RDNSS).
    - **Intervalos de RA Acelerados para APs e Mobile**: Ajuste de `ra_mininterval='20'` e `ra_maxinterval='60'` no `odhcpd`, assegurando recuperação imediata de prefixos globais por celulares e APs satélites (ex: Acer Predator T7).
  - **Isolamento Estrito de Sub-redes WAN na Bridge LAN**:
    - **Detecção e Expurgo de Prefixos de WAN PPPoE na LAN**: Purga automática de qualquer endereço estático pertencente à WAN (`feca:e2a2` etc.) indevidamente adicionado a `network.lan.ip6addr`, eliminando blackholes de tráfego. Suporte simultâneo a opções escalares (`option`) e listas (`list`) no UCI.
  - **Proteção e Preservação de Modos Operacionais**:
    - **Respeito a IPv4 Puro (`ipv4_only`)**: Rotinas de boot e auditoria agora respeitam quando o usuário desativa o IPv6, não ativando flags de RA e não interferindo no `odhcpd`.
    - **Modo IPv6 Full e Seletivo**: Total compatibilidade e coerência garantida em `ipv6_only`, `dual_stack`, `selective` e `relay`.
  - **Auditoria e Auto-Cura Viva (`ark-doctor`)**:
    - Novas checagens `11b.2` (*Compatibilidade SLAAC Apple*) e `11b.3` (*Isolamento de Sub-rede WAN/LAN*) com auto-reparo instantâneo via `ark-doctor --fix`.
  - **Persistência de Boot no Kernel (`ark-safe-shutdown` / `common.sh`)**:
    - Invocação de `ark_sanitize_lan_ipv6` em todo boot do roteador (`START=99`), garantindo que nenhuma alteração manual externa possa reintroduzir as falhas.

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
  - **🛡️ Blindagem Total Anti-Religamento do AdGuard Home (Circuit Breaker no Kernel e Hotplug)**:
    - **Causa Raiz Identificada no Boot (`/etc/mwan3.user`)**: Descoberto e eliminado o gatilho residual em `/etc/mwan3.user` herdado de versões legadas de failover, onde qualquer evento de rede do netifd/mwan3track (`ACTION=connected` ou `ACTION=ifup`) invocava incondicionalmente `/etc/init.d/adguardhome restart &` ao subir as interfaces WAN, religando o daemon à revelia da configuração do usuário.
    - **Hard Circuit Breaker em `/etc/init.d/adguardhome`**: Injeção direta no topo de `start_service()` e `boot()` do script de serviço: se `adblock_enabled='0'` ou `adguard_enabled='0'`, o script aborta imediatamente retornando código 0, sem instanciar `ujail`, sem abrir instâncias no `procd` e sem tocar no binário `/usr/bin/AdGuardHome`.
    - **Sanitização Universal no Boot e Desativação (`99-ark-router-dhcp-sanitize` e `adblock.sh`)**: O instalador e o módulo `adblock_disable()` agora corrigem automaticamente o arquivo `/etc/mwan3.user` e injetam a trava de segurança no `/etc/init.d/adguardhome` com sintaxe pura POSIX `awk`.
    - **Vigilância Ativa no Watchdog (`ark-firewall-guard`)**: No boot do roteador, se o AdGuard estiver configurado como desativado, o watchdog extermina sumariamente qualquer processo fantasma (`killall -9 AdGuardHome adguardhome`), cancela o registro no ubus (`ubus call service delete '{"name":"adguardhome"}'`) e remove links órfãos em `/etc/rc.d/`.
    - **Eliminação do Fallback Permissivo**: Substituição em todo o codebase de `[ "$(uci -q get equipe_perf.settings.adblock_enabled || echo 1)" != "0" ]` por validação explícita afirmativa `[ "$(uci -q get ... || echo 0)" = "1" ]`, prevenindo ativações acidentais quando a chave não existir.
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

