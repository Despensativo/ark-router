# Changelog

## 0.9.82

- **🛡️ Dual-Editor Integrado de Lista Negra e Lista Branca com Sincronização 1-Clique (AdGuard Home + Dnsmasq)**:
  - **Visualização e Edição Direta no Painel (Zero Dependência da Porta 3000)**:
    - O modal do Bloqueador de Anúncios agora conta com dois editores completos em formato de textarea estilizados em modo escuro: um para **🚫 Bloquear Sites Específicos (Lista Negra)** e outro para **✅ Lista Branca de Serviços Essenciais (Exceções)**.
    - O usuário pode visualizar, adicionar, alterar ou remover domínios diretamente pelo ARK Router, sem precisar abrir a porta 3000 ou painéis externos.
  - **Sincronização 1-Clique de Bets, Cassinos e Golpes BR (`adblock-blacklist-sync`)**:
    - Novo botão dedicado **`🔄 Sincronizar Bets & Ameaças`** na Lista Negra.
    - Catálogo curado nacional com mais de 40 domínios críticos: casas de apostas (Bet365, Blaze, Betano, Sportingbet, Betfair, Pixbet, EstrelaBet, KTO, F12, Novibet, etc.), cassinos/jogos de azar (Tigrinho, Fortune Tiger/Ox, Stake, BC.Game) e sites de phishing/golpes frequentes no Brasil (falsos Correios, consulta de CPF fraudulenta, resgate de valores).
    - **Algoritmo Idempotente**: Adiciona apenas os novos domínios sem apagar as regras personalizadas do usuário e sem criar duplicatas.
    - **Bloqueio Local em 0ms**: Todos os domínios da lista negra são espelhados imediatamente no Dnsmasq (`dhcp.@dnsmasq[0].address=/$dom/0.0.0.0`), garantindo resposta nula local instantânea antes mesmo da consulta sair do roteador.
  - **Sincronização de Lista Branca Atualizada em Tempo Real (`adblock-whitelist-sync`)**:
    - Botão **`🔄 Sincronizar Regras de Exceção`** atualizado para refletir as novas regras no textarea na hora em que o usuário clica, acompanhado de toast informativo.
  - **Performance Turbinada com `uci batch` e Reload Atômico**:
    - Transição de loops shell unitários para execução atômica via `uci batch`, reduzindo o tempo de sincronização e aplicação de 6,6 segundos para **0,9 segundo**.
    - Recarregamento leve com sinalização SIGHUP (`dnsmasq reload` e `adguardhome reload`) sem derrubar conexões de rede ativas.

## 0.9.81

- **🔄 Sincronização Inteligente de Lista Branca de Serviços Essenciais (AdGuard Home)**:
  - **Exceções Nativas de Serviços Críticos (Brasil & Mundial)**: Integrada lista de exceções recomendadas no AdGuard Home (`user_rules`) para eliminar falso-positivos em ecossistemas sensíveis:
    - **Apple & Lojas**: App Store, TestFlight, iTunes, iCloud, CDNs Akamai/Fastly (`apple.com`, `itunes.com`, `mzstatic.com`, `aaplimg.com`, `icloud.com`).
    - **Google & Android**: Play Store, Play Services, Firebase (`play.google.com`, `android.clients.google.com`, `gvt1.com`, `gstatic.com`).
    - **GitHub & Ferramentas Dev**: Web UI, APIs, assets, raw e repositórios (`github.com`, `githubassets.com`, `githubusercontent.com`, `github.io`).
    - **Governo Federal & Cidadania BR**: Autenticação unificada, Receita Federal, Dataprev, Serpro, Conectividade Social e FGTS (`gov.br`, `acesso.gov.br`, `serpro.gov.br`, `dataprev.gov.br`, `fazenda.gov.br`, `caixa.gov.br`).
    - **Bancos Brasileiros & PIX**: Prevenção de bloqueio em APIs bancárias (`bb.com.br`, `itau.com.br`, `bradesco.com.br`, `santander.com.br`, `nubank.com.br`, `inter.co`, `c6bank.com.br`, `mercadopago.com.br`, `pagseguro.uol.com.br`, `picpay.com`).
    - **Mensageria e Mídia**: WhatsApp (`whatsapp.com`, `whatsapp.net`, `fbcdn.net`), Globoplay, iFood, Mercado Livre, Steam e Netflix.
  - **Botão de Sincronização 1-Clique no Painel**:
    - Novo botão **`🔄 Sincronizar Regras de Exceção`** diretamente no modal do Bloqueador de Anúncios.
    - **Algoritmo 100% Seguro e Idempotente**: Compara as regras atuais com o catálogo oficial, inserindo apenas o que for novo. NUNCA remove ou altera regras personalizadas do usuário e impede duplicações.
    - Notificação toast instantânea com o resultado da sincronização (`X novas regras adicionadas sem duplicatas`).

- **⚡ Resiliência e Afinidade Multi-WAN (MWAN3) com Fim de Quedas no GitHub, WhatsApp e Bancos**:
  - **Limpeza Imediata de Sessões Mortas (`flush_conntrack`)**: Adicionado `list flush_conntrack 'ifdown'` e `'disconnected'` nas interfaces de WAN. Se uma WAN cair, o kernel limpa instantaneamente a tabela de conexões, migrando o tráfego para o link reserva em poucos segundos sem congelar o tráfego por minutos.
  - **Afinidade para SSH e Git Push/Clone (Porta 22)**: Criada regra dedicada `mwan3.ssh` (`dest_port 22`, `proto tcp`, `sticky 1`, `timeout 3600`) que mantém conexões SSH do GitHub, servidores e terminais na mesma WAN, eliminando desconexões (`Broken pipe` / `Connection reset by peer`) durante push/clone de repositórios pesados.
  - **Isolamento de Mensageria e Chamadas WhatsApp/VoIP**: Criadas regras dedicadas `mwan3.whatsapp_tcp` (portas 5222, 5228, 5242) e `mwan3.whatsapp_udp` (porta 3478 STUN/TURN) com `sticky 1`, impedindo que chamadas de áudio/vídeo sofram re-roteamento e congelamento ao falar.
  - **Consistência QUIC / HTTP/3 (UDP 443) e HTTPS (TCP 443)**: Sincronizadas as regras de porta 443 para operarem com a mesma marcação de sticky e política unificada, impedindo divisão de tráfego entre lojas de apps e navegadores.

## 0.9.80

- **📶 Centro de Comando Wi-Fi Totalmente Dinâmico e Fim das Strings Obsoletas (QCA9880 / QCA9558)**:
  - **Eliminação de Dados Hardcoded Antigos**: Removidas as descrições estáticas herdadas do roteador antigo D-Link DGL-5500 (`Qualcomm Atheros QCA9880 • 802.11ac/an • Até 1300 Mbps` e `Qualcomm Atheros QCA9558 • 802.11bgn • Até 450 Mbps`).
  - **Detecção Real do Hardware Wi-Fi 6**: O painel agora lê dinamicamente a arquitetura dos rádios em tempo real. No Acer Predator Connect W6x, exibe com precisão:
    - **5 GHz**: `MediaTek MT7986 (Filogic 830) • Wi-Fi 6 (802.11ax/ac/n) • Até 2402 Mbps`
    - **2.4 GHz**: `MediaTek MT7986 (Filogic 830) • Wi-Fi 6 (802.11ax/b/g/n) • Até 574 Mbps`
  - **Correção Crítica na Detecção de Bandas 802.11ax**: Corrigido o erro que classificava a banda de 2.4 GHz como 5 GHz devido à presença de `802.11ax` (padrão que opera em ambas as frequências no Wi-Fi 6), o que causava a transferência indevida de SSIDs de 2.4 GHz para o card de 5 GHz e deixava o card de 2.4 GHz vazio.
  - **Separação Precisa de Redes Transmitidas**: As redes Wi-Fi agora são alocadas perfeitamente em suas respectivas frequências (`CASA_ARK_5G` e `Tv` no rádio 5 GHz; `CASA_ARK` no rádio 2.4 GHz), exibindo o modo de operação correto, protocolo de criptografia (`WPA2/WPA3`) e nível de sinal (dBm).
  - **Badges Dinâmicos em Tempo Real**: Chips atualizados automaticamente a cada ciclo com Canal ativo (`Canal 44 (5.220 GHz)`), taxa física de bitrate real (`⚡ 2401.9 Mbit/s` no 5G e `⚡ 51.5 Mbit/s` no 2.4G) e status operacional (`🟢 Rádio Ativo`).
  - **Ocultação da Tabela Bruta Duplicada**: Em modo Básico, a tabela nativa repetida do LuCI é ocultada de forma limpa e contínua via CSS, mantendo apenas os cartões visuais modernos da ARK sem conflitos ao atualizar a cada 3 segundos.

- **📶 Proteção Inteligente contra Queda do Wi-Fi 5 GHz (Ajuste Automático Canal vs. Largura)**:
  - **Diagnóstico e Prevenção de Falhas no Hostapd**: Corrigido o erro que desativava o rádio 5 GHz (`AP-DISABLED` / Canal 0) quando canais da faixa UNII-3 (como o Canal `149`) eram selecionados com largura de banda de 160 MHz (`HE160`). No Brasil e na maioria dos países, a faixa UNII-3 opera em até 80 MHz porque canais centrais de extensão superiores a 165 são bloqueados por regulamentação e rejeitados pelo driver de rádio (`extension channel is disabled`).
  - **Rebaixamento Automático de Largura (80 MHz)**: Ao selecionar qualquer canal >= 132 (ex: 149, 153, 157, 161, 165) via backend (`equipe-dashboard-control`) ou interface web, o sistema ajusta automaticamente o `htmode` para `HE80`/`VHT80`, impedindo que o hostapd aborte a inicialização.
  - **Comutação Segura para Canal 160 MHz**: Se o usuário alternar a largura para 160 MHz enquanto estiver em um canal UNII-3, o roteador comuta automaticamente o canal para o Canal 36 (faixa UNII-1 contígua compatível com 160 MHz), garantindo que o Wi-Fi suba sem interrupções.
  - **Feedback Dinâmico na Interface**: O modal de escolha manual de canais agora exibe alertas em tempo real informando que o canal selecionado opera em até 80 MHz e que o ajuste é feito de forma transparente. A análise de canais respeita a largura ativa (priorizando blocos de 160 MHz quando o modo 160 MHz estiver ativado).
  - **Watchdog de Auto-Recuperação Pós-Reload**: Implementado monitoramento ativo em segundo plano que detecta se qualquer rádio cair em estado de falha (Canal 0) após a troca e aplica recuperação imediata para `HE80` e seleção automática.

- **🔍 Detecção Inteligente e Visualização Completa de Hardware (CPU, Múltiplos Sensores, RAM, Flash e Portas 2.5G/1G)**:
  - **Frequência Real de Clock e Uso da CPU**: Detecção dinâmica da frequência real do processador (ex: `2.0 GHz` no Filogic 830 / Cortex-A53, `720 MHz` no QCA9558 MIPS), quantidade de núcleos físicos (`4c`), arquitetura precisa (`ARMv8 64-bit`, `MIPS 74Kc`, `x86_64`) e medição instantânea do percentual de uso via delta de `/proc/stat`.
  - **Detecção Abrangente de Sensores Térmicos**: Mapeamento dinâmico de todos os sensores físicos do equipamento em `/sys/class/thermal/` e `/sys/class/hwmon/` (CPU, Switch Ethernet MDIO, Wi-Fi 2.4 GHz e Wi-Fi 5 GHz). Roteadores sem sensor exposto (ex: MIPS legados) exibem aviso elegante sem poluir a interface nem quebrar o layout.
  - **Identificação da Mídia Flash e Partição Overlay**: Reconhecimento automático do tipo de armazenamento persistente (`NAND Flash (UBI)`, `SPI NOR Flash`, `eMMC`, `SSD`) e separação clara entre espaço livre persistente (Overlay) e memória volátil em RAM (`/tmp`).
  - **Memória RAM Dinâmica e Universal**: Coleta adaptativa para OpenWrt moderno (`MemAvailable`) e legado (`MemFree + Cached + Buffers`), eliminando qualquer número ou capacidade pré-fixada.
  - **Badges de Velocidade Máxima de Portas Físicas (WAN e LAN)**: Detecção automática da capacidade física do link via DSA e swconfig, renderizando badges destacados nos cards de conexão (ex: badge azul `2.5G` na porta WAN 2.5 Gbps `eth1` do Acer Predator W6x e badges verdes `1G` nas portas LAN Gigabit).
  - **Faixa de Saúde de 5 Itens e Modais Técnicos Completos**:
    - Nova faixa de saúde do roteador contendo 5 cartões interativos e responsivos: **Processador**, **Temperatura**, **Memória**, **Armazenamento** e **Carga**.
    - Novo botão **🔍 Especificações** na barra de saúde que abre o modal abrangente de diagnóstico com todos os detalhes de Identificação, CPU, Sensores Térmicos, RAM, Armazenamento, Portas Ethernet e Wi-Fi (padrões ax/ac/n e largura 160 MHz).
    - Modal interativo de **Sensores Térmicos do Hardware** acessível com 1 clique no card de Temperatura, exibindo o status térmico de cada componente físico individual.
  - **Fim dos Textos e Métricas Hardcoded no Tema LuCI (`ark-theme.js`)**:
    - O tema visual do LuCI agora consome dinamicamente os dados reais do hardware, eliminando todas as strings antigas pré-fixadas (como "1 Núcleo MIPS", "124 MB", "16 MB SPI Flash" e "No DGL-5500").
    - O banner do LuCI agora exibe a CPU real, a memória RAM livre exata, a tecnologia correta da Flash, a temperatura do processador e um atalho direto `📊 Painel ARK` para o dashboard principal.


- **📂 Menu Lateral em Acordeão com Indicador '+' e Expansão por Clique**:
  - **Fim do Fechamento Acidental (Fim dos Submenus Flutuantes)**: Removidas as regras de sobrevoo de mouse (`:hover`) que abriam menus flutuantes à direita e fechavam abruptamente ao mover o mouse na diagonal. O menu agora é 100% estável e não fecha ao mover o cursor.
  - **Sinal Visual de '+' em Menus Expansíveis**: Todas as categorias com submenus (`Status`, `System`, `Services`, `Network`) exibem um indicador `+` claro e destacado no canto direito, que se transforma em `−` quando o menu é expandido. Itens de link direto (`ARK Router`, `Speedify`, `Log out`) não exibem o sinal.
  - **Regra de Acordeão Inteligente**: Ao clicar em uma categoria para expandir, qualquer outro submenu aberto é automaticamente fechado ("ao clicar no próximo fecha o anterior"). Clicar novamente na mesma categoria recolhe o menu.
  - **Expansão Automática da Tela Atual**: Ao carregar qualquer página interna (ex: `/admin/system/leds`), a categoria mãe correspondente (`System`) já abre automaticamente com a página ativa destacada e indentada.
  - **Rolagem Suave da Barra Lateral**: Adicionado `overflow-y: auto` com barra de rolagem fina estilizada para navegação fluida em telas de qualquer resolução.

- **💡 Detecção Inteligente e Isolamento de LEDs por Hardware (Fim da Mistura de Modelos)**:
  - **Identificação Dinâmica do Roteador**: O painel de LEDs (`/admin/system/leds`) agora detecta dinamicamente a placa e modelo do equipamento (ex: `Acer Predator Connect W6x (Stock Layout)` vs. `D-Link DGL-5500` vs. genéricos) e exibe apenas os LEDs físicos que realmente existem em `/sys/class/leds/`.
  - **Limpeza Automática de LEDs Órfãos e Fantasmas**: Criada rotina `cleanup_orphan_leds` no backend (`equipe-dashboard-control`) que remove do `/etc/config/system` e da tabela do LuCI seções de hardware de outros roteadores (ex: `d-link:green:power`, `d-link:green:planet`, `ath10k-phy0`, `ath9k-phy1`) e deduplica entradas redundantes.
  - **Suporte Nativo ao LED RGB e Wi-Fi 6 do Acer Predator Connect W6x**: Mapeamento do LED frontal multi-estado `rgb:status` (com animação CSS RGB suave) e dos canais Wi-Fi 6 MediaTek MT7986 (`mt76-phy0` 5 GHz e `mt76-phy1` 2.4 GHz).
  - **Perfis Rápidos de Iluminação Otimizados (1 Clique)**:
    - `🟢 Internet Conectada (Verde Fixo)`: Mantém o LED frontal verde contínuo e estável (`mode=link`) enquanto a WAN estiver conectada, **sem piscar com pacotes de dados RX/TX**; Wi-Fi em luz contínua suave (`default-on`).
    - `🌙 Modo Noturno (Tudo Desligado)`: Apaga 100% dos LEDs frontais (`trigger=none`, `brightness=0`) para quem dorme no mesmo ambiente.
    - `🛡️ Alerta de Queda Silencioso`: LEDs completamente **apagados** durante o funcionamento normal com internet; aciona o LED frontal piscando em alerta (vermelho no RGB ou laranja) **apenas se a conexão cair** (perda de link ou IP WAN via hotplug reativo).
    - `↺ Restaurar Padrão de Fábrica`: Substitui o antigo card de tráfego por um botão de restauração instantânea, purga configurações incorretas e restabelece a iluminação de fábrica do modelo detectado com 1 clique.
  - **🎨 Seletor Visual e Manual de Cores RGB para o LED Frontal**:
    - **Diagnóstico da Inversão de Cores do Chip WS2812B**: Identificada a causa raiz física pela qual comandos de "verde" acendiam o LED frontal em vermelho no Acer Predator Connect W6x. O chip de LED frontal é um **WorldSemi WS2812B** controlado via SPI pelo kernel `leds-ws2812b.ko`. O protocolo WS2812B utiliza a ordem nativa de bytes **GRB** (Byte 0 = Verde, Byte 1 = Vermelho, Byte 2 = Azul). O OpenWrt enviava `multi_index` como `red green blue`, fazendo com que `color_green=255` fosse escrito no Byte 1 (Vermelho físico). A função `set_led_rgb_color` agora transpõe automaticamente qualquer valor RGB para a matriz física GRB (`hw_byte0 = G`, `hw_byte1 = R`, `hw_byte2 = B`), garantindo fidelidade cromática perfeita.
    - **Seletor de Cores Visual Nativo**: Adicionado seletor gráfico de espectro total (`<input type="color">`) que permite escolher qualquer tom antes de aplicar.
    - **Entrada Manual de Código (HEX / RGB)**: Campo de texto direto para digitação de códigos hexadecimais (ex: `#00FF00`, `#00E5FF`, `#3B82F6`, `#8B5CF6`) ou nomes de cores, com formatação automática e persistência em UCI (`system.led_status.hex_color`).
    - **Paleta de Cores Rápidas (1 Clique)**: Botões de acesso rápido com 8 tonalidades vibrantes: **Verde**, **Ciano (Predador)**, **Azul**, **Roxo**, **Rosa**, **Âmbar**, **Vermelho** e **Branco**.
    - **Prévia Dinâmica em Tempo Real**: Badge luminoso que simula a luz e o brilho do LED frontal na tela instantaneamente conforme o usuário seleciona ou digita uma nova cor.
    - **Aplicação e Feedback Imediato**: Botão `✨ Aplicar Cor no LED` com comunicação via RPC ubus (`equipe-dashboard-control set-led-rgb-color`), atualizando o LED físico do roteador, o registro UCI persistente e o card de status do hardware na interface web.

- **⚡ Bypass de Rede Local Configurável com Toggle e Aviso Dinâmico (Limite de Banda Individual)**:
  - **Toggle Interativo no Modal**: Substituída a nota estática informativa por um interruptor interativo com status em tempo real no bloco de `Limite de Banda Individual`.
  - **Padrão Ativo (Rede Local Livre / Recomendado)**: Por padrão, o bypass vem ligado com destaque azul e pill `✓ Rede Local Liberada (Recomendado)`. O tráfego interno entre computadores, celulares, impressoras e NAS flui em velocidade Gigabit / Wi-Fi máxima, restringindo unicamente o consumo de Internet externa.
  - **Opção de Limitar Intranet**: Ao desativar o toggle, o bloco se adapta dinamicamente para tom âmbar com pill `⚠️ Intranet Limitada` e aviso explicando que backups para NAS, streaming local e transferências entre PCs da casa também serão limitados à velocidade configurada.
  - **Isolamento Seguro no nftables**: Regras de drop por taxa na tabela `inet ark_device_limits` filtram por sub-redes privadas RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) por aparelho quando o bypass está ativo, e aplicam limitação global no dispositivo quando desativado.
  - **Tooltips Informativos nos Badges**: Os badges de dispositivo limitado (`🛑 50M↓ / 5M↑`) agora indicam no tooltip se o limite é exclusivo para a Internet (`Rede Local Livre`) ou total (`Intranet Limitada`).

- **📺 Visibilidade Total de Dispositivos Cabeados e com IP Estático (Tabela de Conectados)**:
  - **Fusão de ARP e Host Hints**: A tabela de "Quem está conectado" em `overview.js` agora cruza as concessões dinâmicas do DHCP com a tabela ARP do kernel (`/proc/net/arp`) e as reservas estáticas de `dhcpConfig` e `getHostHints()`.
  - **Reconhecimento de Dispositivos de Cabo (LAN)**: Dispositivos cabeados e aparelhos com IP fixo (como `TV SALA PLACA DE REDE` no IP `192.168.73.30`) passam a ser listados imediatamente com o rótulo `Cabo / LAN`, badges visuais de limites de banda (`🛑 50M↓ / 5M↑`), IP reservado e consumo individual medido pelo `nlbwmon`.

- **🔒 Ocultação Completa da Barra Lateral na Tela de Login (`sysauth`)**:
  - **Remoção de Elementos Fantasmas**: A barra lateral vazia (`aside.ark-sidebar`), o backdrop escuro e a topbar mobile foram completamente desativados e removidos na tela de autenticação do LuCI (`header.ut`, `header.htm`, `cascade.css`, `mobile.css`, `ark-theme.js`).
  - **Alinhamento e Centralização Perfeitos**: O formulário de login passa a ocupar o centro exato da tela tanto no Desktop quanto no Mobile, eliminando o deslocamento e a faixa escura vazia à esquerda.
  - **Identidade Visual no Card**: Incorporado o logotipo estilizado `⚡ ARK Router` com degradê vibrante no topo do cartão de login.

- **⚠️ Alerta Crítico e Confirmação de Segurança ao Converter LAN em WAN**:
  - **Banner de Atenção no Modal de Configuração**: Ao clicar para usar uma porta LAN como WAN (ex: LAN1, LAN2, LAN3), um alerta em destaque avisa imediatamente que a porta deixará de ser uma rede local.
  - **Modal Dedicado de Confirmação de Segurança**: Ao clicar em "Confirmar alteração", o sistema abre um diálogo de segurança obrigatório alertando o administrador a verificar em qual porta seu computador está conectado (recomendando usar Wi-Fi ou outra LAN livre) para evitar perda inadvertida de acesso ao roteador.

- **📡 Multi-Starlink: Separação Automática por Portas e Alinhamento Simultâneo Lado a Lado**:
  - **Portas Dedicadas por Antena via Policy Routing**:
    - **Porta 9201**: Encaminhada diretamente para a **Starlink 1 (WAN1)** via Tabela 5101 e `fwmark 0x5101`.
    - **Porta 9202**: Encaminhada diretamente para a **Starlink 2 (WAN2)** via Tabela 5102 e `fwmark 0x5102`.
    - **Porta 9200**: Mantida para a **Antena Principal Ativa**, garantindo compatibilidade total com o aplicativo oficial da Starlink no celular.
  - **Fim dos Locks Globais e das Pausas**: Eliminação da substituição temporária da rota global e do arquivo de trava `/tmp/ark-starlink-telemetry.lock`. Agora as antenas são consultadas em portas isoladas de forma 100% paralela e concorrente.
  - **Nova Interface de Alinhamento Duplo Simultâneo (`/starlink/`)**:
    - Modo Split-View com dois cards completos lado a lado: Starlink 1 e Starlink 2.
    - Cada antena possui mostradores visuais independentes: Bússola 360° de Rotação Horizontal (Azimute) e Inclinômetro de Inclinação Vertical (Elevação), além de métricas ao vivo de obstrução, latência e GPS.
    - Botão *⚡ Ajuste ao Vivo (1 s)* dispara consultas paralelas contínuas para ambas as antenas, permitindo que o instalador aponte e calibre as duas Starlinks no mastro em tempo real na mesma tela sem pausar nenhuma conexão.
  - **Detecção Universal de Starlink (Modo Ponte + Modo Roteador)**:
    - Reconhecimento automático da Starlink tanto em modo Bypass puro (CGNAT `100.64.0.0/10`) quanto em modo roteador normal com NAT (sub-rede `192.168.1.x` com gateway `192.168.1.1`).

## 0.9.79
- **⚡ Ocultação Contextual de Otimização em Portas LAN**: O botão de otimização de velocidade de WAN foi removido do modal de conversão de portas LAN para WANs novas, evitando confusão visual e erros de interface inexistente.

## 0.9.78

- **🛡️ Redesenho e Clareza Total da Telemetria do Firewall (`Condição Geral ➔ Firewall` / `/status/iptables`)**:
  - **Eliminação de Caixas de Busca "no Meio do Nada"**: Excluídas as tabelas do iptables do injetor genérico de filtros, removendo os grandes campos de busca individuais que apareciam de forma desajeitada entre o cabeçalho e as regras de cada corrente.
  - **Barra de Busca Unificada no Topo**: Integrado um campo de busca moderno e limpo na barra superior (`ark-iptables-bar`) que filtra em tempo real todas as regras ativas por endereço IP, número de porta, protocolo ou ação executada.
  - **Ocultação Automática de Correntes Vazias por Padrão**: As mais de 80 correntes vazias do sistema agora são recolhidas automaticamente na abertura da página, deixando a tela focada exclusivamente nas regras ativas (`INPUT`, `FORWARD`, `OUTPUT`, etc.). O botão superior permite alternar para *👁️ Mostrar Correntes Vazias* com 1 clique.
  - **Subtítulos Didáticos e Explicativos em Cada Corrente**:
    - `INPUT`: Explicação clara sobre tráfego direto para os serviços do roteador (Web LuCI, SSH, DNS).
    - `FORWARD`: Explicação de barreira de proteção de passagem entre internet e computadores/celulares com política `DROP`.
    - `OUTPUT`: Explicação sobre pacotes emitidos pelo próprio ARK OS para a rede e internet.
    - `zone_lan_*` e `zone_wan_*`: Identificação didática de entradas/saídas locais e da operadora externa.
    - `syn_flood`: Explicação de proteção ativa contra ataques de negação de serviço (DoS).
  - **Fim da Ambiguidade de Colunas Duplicadas ("Destino")**:
    - Diferenciação clara entre a coluna de **AÇÃO (ALVO)** (ACCEPT, DROP, REJECT) e a coluna de **IP DESTINO**, além de tooltips didáticos de auxílio em todas as 10 colunas da tabela.
  - **Badges Semânticos e Chips Coloridos**:
    - Destaque visual com chips `✅ ACCEPT` (verde), `🛑 DROP` (vermelho), `⚠️ REJECT` (laranja) e `🛡️ syn_flood` (azul).
    - Destaque visual da política padrão no título de cada corrente (`ACCEPT (Permitir)` e `DROP (Bloquear)`).
  - **Cards Estruturados e Limpeza de Tooltips**: Correntes agora utilizam cards com bordas arredondadas e sombra suave, e os badges de referência (`references`) foram harmonizados.

## 0.9.77

- **🔘 Correção e Estilização Global de Dropdowns e Ações de Página (`.cbi-dropdown` e `.cbi-page-actions`)**:
  - **Fim dos Marcadores de Lista (`•`)**: Implementadas regras completas para componentes `.cbi-dropdown`, ocultando os itens não selecionados e exibindo apenas a opção ativa com ícone discreto (`▾`), eliminando o bug visual onde todas as opções apareciam em listas com marcadores simultaneamente.
  - **Menu Flutuante Moderno**: Quando aberto, o menu de opções aparece em painel flutuante escuro com bordas arredondadas e sombra suave (`z-index: 1100`).
  - **Barra de Ações Compacta e Elegante**: A barra inferior de salvar/aplicar (`.cbi-page-actions`) foi compactada com alinhamento à direita, botões de 36px e visual escuro harmonizado.
  - **Botões de Diagnóstico**: Botões de Ping e Traceroute agora exibem seletores IPv4/IPv6 de forma limpa e compacta.

- **💡 Central Intuitiva de LEDs (`/admin/system/leds`)**:
  - **Perfis Rápidos de 1 Clique**:
    - 🌐 **Internet Inteligente**: Power verde fixo; LED Internet (Planet) verde monitorando link WAN (pisca em alerta caso a conexão caia); Wi-Fi piscando com tráfego de dados.
    - 🌙 **Modo Noturno (Quarto)**: Desliga todos os LEDs frontais para uso em dormitórios, deixando o equipamento 100% escuro.
    - 🚨 **Alerta Visual de Queda**: LED Planet em Laranja intermitente para sinalizar visualmente à distância que a internet da operadora caiu.
    - ⚡ **Desempenho Total**: Pulsação de alta frequência em todos os LEDs conforme tráfego Wi-Fi 2.4 GHz e 5 GHz.
  - **Painel Frontal Visual (D-Link DGL-5500)**: Cards dedicados com indicadores luminosos brilhantes representando os LEDs reais do hardware: *Power* (verde/laranja), *Internet* (verde/laranja), *Wi-Fi 5 GHz* (QCA9880) e *Wi-Fi 2.4 GHz* (QCA9558).
  - **Aplicação Instantânea sem Reload**: Integração com rpcd (`equipe-dashboard-control set-led-preset`) aplicando as configurações de UCI e reiniciando o driver em milissegundos com feedback visual.

- **🧹 Fim da Duplicação de Seções em Backup / Firmware (`/admin/system/flash`)**:
  - **Ocultação dos Formulários Redundantes**: Removidas as seções brutas duplicadas (*Cópia de Segurança*, *Restauração*, *Gravar nova imagem*) que apareciam abaixo dos 4 cards de ação do ARK Router, deixando a tela limpa e focada.

- **🛡️ Confinamento Estrito de Tabelas e Fim de "Janelas Vazando" (`cascade.css`)**:
  - **Overflow Horizontal Confinado**: Todas as tabelas e seções agora possuem `max-width: 100%` e `overflow-x: auto` com rolagem suave ao toque.
  - **Correção no UPnP ACL**: Redimensionamento proporcional das caixas de texto na tabela de ACL em `/admin/services/upnp`, impedindo que a tabela transborde a tela em desktops e telas compactas.

- **✏️ Correção do Botão "Editar" em Interfaces de Rede (`/admin/network/network`)**:
  - **Navegação Direta e Estável**: Substituído o gatilho de clique clonado (que gerava o erro `TypeError: dlg is null`) por um link nativo direto para a tela de edição da interface (`/cgi-bin/luci/admin/network/network/<sid>`).
  - **Remoção da Tabela Crua Repetida**: Ocultada a tabela repetida abaixo dos cards modernos de rede.

- **🔄 Recarregar e Ordenação Dinâmica de Processos (`/admin/status/processes`)**:
  - **Ajuste de Nomenclatura**: Renomeado o botão "Suspender" para "**🔄 Recarregar**" com tooltip didático explicando que se trata de SIGHUP (recarrega configurações sem encerrar o serviço).
  - **Ordenação Interativa nos Cabeçalhos**: Ao clicar em `CPU (%)`, `MEMÓRIA (%)`, `COMANDO` ou `PID`, a tabela é reordenada instantaneamente com indicadores visuais de direção (`▲` / `▼`).

- **📘 Novos Guias Didáticos Educacionais**:
  - **Switch e VLANs (`/admin/network/switch`)**: Explicação clara sobre portas físicas, tráfego untagged/tagged e alerta de proteção para nunca desmarcar a porta de CPU (eth0).
  - **Monitor de Largura de Banda Netlink (`/admin/nlbw/display`)**: Explicação de como identificar aparelhos consumidores de banda e estilização dark cyberpunk da paleta de gráficos de rosca (donut) via hook de Chart.js Canvas.


- **🔘 Otimização e Ativação dos Botões de Iniciação (`Sistema ➔ Iniciação`)**:
  - **Invalidação Automática de Cache HTTP (`?v=0.9.76`)**: Atualizados os cabeçalhos de importação em `header.htm` e `header.ut` de `?v=ark-1.0` para a versão atual. Isso força navegadores (Chrome, Edge, Safari) a baixar os novos arquivos CSS/JS imediatamente, eliminando o problema de estilos antigos armazenados em cache que mantinham os botões com aparência desativada.
  - **Identificação Visual Clara com Ícones**:
    - `⚙️ Scripts de Iniciação`: Indicador da lista de serviços do sistema com tooltip descritivo.
    - `📜 Iniciação Local (/etc/rc.local)`: Atalho direto para comandos personalizados com tooltip descritivo.
  - **Destaque Visual e Feedback Tátil**: O botão ativo brilha no gradiente Electric Blue com sombra suave; caso o usuário clique no botão já selecionado, ele recebe uma leve animação de pulso tátil confirmando que já está naquela visão.
  - **Alternador Delegado de Fallback (`enhanceTabs`)**: Adicionado controle em `ark-theme.js` que garante a exibição do painel correspondente e ocultação do painel inativo mesmo em condições atípicas de renderização do LuCI.

## 0.9.75

- **📝 Redimensionamento Proporcional do Campo de Anotações (`Sistema ➔ Propriedades do Sistema`)**:
  - **Fim do Bloco Desproporcional**: O campo de texto `<textarea>` de *Anotações* (`notes`), que estava esticado desnecessariamente em 480px de altura e 1044px de largura ocupando quase a tela inteira, foi readequado para dimensões proporcionais (`height: 80px`, `max-height: 220px`, `max-width: 480px`).
  - **Harmonização do Formulário**: O campo agora se integra de forma equilibrada aos inputs vizinhos (*Nome do equipamento*, *Descrição* e *Fuso horário*), permitindo visualizar todo o conteúdo da aba e os botões de ação sem rolagem excessiva.
  - **Redimensionamento Vertical Flexível**: Mantido o controle `resize: vertical`, permitindo expandir manualmente a caixa caso o usuário queira colar anotações ou documentações mais longas.
  - **Isolamento de Terminais e Logs**: Removido o seletor genérico `#view textarea.cbi-input-textarea` da regra de terminais de log, garantindo que apenas visualizadores de logs reais (`#syslog`, `dmesg`, crontab, firewall rules) utilizem a exibição em tela cheia com tipografia monospace, mantendo formulários padrão limpos e compactos.

## 0.9.74

- **🔘 Correção Crítica do Sistema de Abas CBI (`Sistema ➔ Propriedades do Sistema` e afins)**:
  - **Destaque Visual da Aba Ativa**: Corrigido o seletor CSS de abas ativas para `.cbi-tab:not(.cbi-tab-disabled)`. A aba selecionada agora brilha com o gradiente elétrico (Electric Blue / Cyber Violet), eliminando a impressão de botões inativos.
  - **Ocultação de Painéis Inativos (`[data-tab-title]`)**: Implementada a regra estrita de contenção que oculta os conteúdos das abas inativas (`display: none !important`), exibindo apenas os campos correspondentes à aba clicada com animação suave de transição (`arkTabFade`).
  - **Navegação Funcional Completa**: Todas as abas de formulários CBI (*Configurações gerais*, *Registrando os eventos*, *Sincronização de horário*, *Idioma e Estilo*) agora alternam seus respectivos campos instantaneamente ao clique.

- **📈 Dark Theme Nativo para Gráficos em Tempo Real (`admin/status/realtime/*`)**:
  - **Eliminação do Fundo Branco**: Removido o canvas branco ofuscante (`#ffffff`) dos gráficos SVG em todas as 4 abas de telemetria em tempo real: *Carga*, *Tráfego*, *Rede sem fio* e *Conexões*.
  - **Canvas Obsidian e Linhas Suaves**: O fundo foi unificado à paleta escura do ARK Router (`#111c35`), com grade sutil (`rgba(255, 255, 255, 0.08)`) e marcações de tempo e valores em tipografia legível (`#94a3b8`).
  - **Curvas Neon de Alta Visibilidade**:
    - Conexões UDP: Azul ciano elétrico (`#38bdf8`) com preenchimento translúcido.
    - Conexões TCP / Download (TX): Verde esmeralda neon (`#34d399`).
    - Upload (RX) / Sinal Wi-Fi (RSSI): Azul cobalto vibrante (`#60a5fa`).
    - Picos de Carga / Ruído (Noise): Coral avermelhado / Crimson (`#fb7185`).
  - **Cartões de Legenda e Métricas**: Tabelas de resumo de pico/média estilizadas em cartões escuros com cores coordenadas com as curvas dos gráficos.
  - **Guia Educacional de Telemetria**: Adicionado bloco explicativo orientando o diagnóstico de gargalos de rede, perda de pacotes e uso do SQM Cake.

- **⚡ Redesign e Otimização da Tabela de Processos (`admin/status/processes`)**:
  - **Alinhamento e Hierarquia dos Botões de Ação**: Substituído o empilhamento desordenado dos botões por um grupo horizontal inline (`.ark-proc-actions-group`) com cores semânticas distintas e ícones intuitivos:
    - `🔄 Suspender` (SIGHUP): Azul ciano (`#38bdf8`), recarrega configurações sem encerrar o processo.
    - `⚠️ Terminar` (SIGTERM): Âmbar/Aviso (`#fbbf24`), encerramento suave e seguro.
    - `🛑 Matar` (SIGKILL): Vermelho perigo (`#fca5a5`), encerramento forçado imediato pelo kernel.
  - **Indicador de Status em Tempo Real**: Adicionado chip de status visual em cada linha de processo:
    - `🟢 Ativo`: Identifica daemons e serviços do sistema operacional em execução na memória RAM.
    - `⚡ Kernel`: Identifica threads e workers internos do Kernel Linux (processos entre colchetes como `[kthreadd]`, `[ksoftirqd/0]`).
  - **Barra de Navegação Rápida para Serviços**: Inserido banner de ação no topo da página conectando diretamente ao gerenciador de inicialização (`admin/system/startup`) com o botão `⚙️ Gerenciar Serviços (Iniciar / Parar / Reiniciar)`.
  - **Guia Educacional Integrado**: Adicionado bloco explicativo esclarecendo a diferença entre processos em RAM (`ps` onde todos já estão executando) e o ciclo de vida de serviços do sistema (iniciar/parar/reiniciar/boot).
- **📦 Contenção e Responsividade de Tabelas CBI (`admin/services/upnp` e afins)**:
  - Corrigido o transbordamento horizontal da tabela de regras/ACLs que quebrava as bordas dos cards no MiniUPnP e seções CBI. Adicionado `overflow-x: auto` e agrupamento horizontal para os botões de ação de linha (`Acima`, `Abaixo`, `Apagar`).
  - Adicionado Guia Educacional em Português para Plug & Play Universal (UPnP / NAT-PMP) com orientações específicas para jogos online e consoles.

## 0.9.71

- **📋 Melhorias na Visualização de Logs e Firewall**:
  - Implementado fallback de cópia com `document.execCommand` para ambientes HTTP sem SSL em `/admin/status/syslog` e `/admin/status/dmesg`.
  - Adicionado botão nativo `📥 Baixar (.txt)` com geração automática de arquivo nomeado por timestamp.
  - Otimizados badges de interface (`.ifacebadge`) e corrigido espaçamento de abas em `/admin/status/iptables`.

- **✨ Redesign Completo do Sistema ARK Router & OpenWrt LuCI**:
  - **Motor Client-Side (`ark-theme.js`)**:
    - **Dualidade de Públicos (Modo Básico vs Modo Avançado)**: Alternador no topo de formulários e seções. O *Modo Básico* oculta opções técnicas criptográficas e parâmetros obscuros de socket/MTU, enquanto o *Modo Avançado* expõe controles granulares e chaves UCI.
    - **Visualizador de Senha (`👁️`) & Medidor de Força**: Adicionado toggle para mostrar/ocultar senha em todos os campos de senha e medidor visual interativo de complexidade (Fraca, Média, Boa, Excelente ARK Shield) na tela de administração.
    - **Filtro de Busca em Tempo Real**: Adicionado campo de busca instantânea em tabelas longas (Processos, Logs do Sistema, Rotas, Leases DHCP) e no log pré-formatado do kernel com botão de cópia com 1 clique (`📋 Copiar Log`).
    - **Modais de Confirmação Segura**: Diálogos pré-ação para eventos críticos (Reinicialização, Restauração de Fábrica e Sysupgrade), com impacto no serviço, tempo estimado e tela com contagem regressiva e barra de progresso.
  - **Design System Global (`cascade.css`)**:
    - Padronização em paleta Obsidian Space (`#0b1120`), Electric Blue (`#3b82f6`) e Cyber Violet (`#8b5cf6`).
    - Suporte nativo completo para tabelas em grid do LuCI moderno (`.table`, `.tr`, `.th`, `.td`) e tabelas clássicas HTML.
    - Modernização de abas CBI (`ul.cbi-tabmenu`) em botões pill interativos com iluminação ativa.
    - Modernização de badges de interface de rede (`.ifacebadge`), substituindo bitmaps de 1995 por cartões limpos e ícones modernos.
  - **Responsividade Total Mobile (`mobile.css`)**:
    - Alvos de toque acessíveis de no mínimo 42px.
    - Eliminação completa de transbordamento horizontal (`overflow-x: hidden` e `max-width: 100vw`).
    - Adaptação vertical automática de tabelas, menus e modais de confirmação.

## 0.9.69

- **📡 Correção da Inversão de Frequências Wi-Fi (2.4 GHz vs 5 GHz)**:
  - Implementada detecção dinâmica robusta de banda por rádio no backend e frontend (`overview.js` e `equipe-dashboard-control`), inspecionando `hwmode`, `htmode` e `band` em vez de presumir ordem numérica de dispositivo (`radio0`/`radio1`).
  - Corrigida a inversão onde roteadores Qualcomm/Atheros (ex: D-Link DGL-5500) exibiam Canal 36 VHT80 em 2,4 GHz e Canal 11 HT20 em 5 GHz. Agora ambos exibem canais, modos de largura e status corretos.
- **📶 Otimização e Agrupamento da Seleção Manual de Canais Wi-Fi**:
  - Removidos os canais 12 e 13 da listagem de 2,4 GHz em conformidade com o domínio regulatório e capacidade física do hardware.
  - Agrupados os canais de 5 GHz em categorias claras no menu seletor: *Padrão / Doméstico (UNII-1)*, *Potência Alta (UNII-3)* e *Canais DFS / Radar*.
  - Corrigido o modal de canais manuais para iniciar com os canais atualmente ativos pré-selecionados em vez de campos em branco.
- **🔘 Aprimoramento Visual dos Botões de Ação (Wi-Fi e AdBlock)**:
  - O link textual discreto "Configurar nome, senha e status →" foi transformado em um botão de ação destacado (`⚙ Configurar Wi‑Fi (Nome, Senha e Status)`), facilitando a identificação imediata como elemento clicável.
  - O link discreto de opções do AdBlock foi convertido no botão estilizado `⚙️ Configurar Bloqueio`.
- **⌨️ Suporte Global ao Fechamento de Modais com a Tecla `Esc` (Escape)**:
  - Adicionado listener global de teclado (`Escape` / keycode 27) no dashboard e nos footers de tema do LuCI (`footer.htm` e `footer.ut`), permitindo fechar subjanelas, modais CBI e diálogos de confirmação instantaneamente sem necessidade de clicar no botão "Fechar" ou fora da janela.
- **🌐 Esclarecimento e Ajuste do Modal de Otimização de WAN**:
  - Inserido banner explicativo destacando que a calibração de MTU e filas de pacotes não altera credenciais de operadora, discagem PPPoE nem causa perda de conexão.
  - Corrigida a colisão e quebra de texto dos perfis predefinidos.
  - Ocultada a opção de *IRQ Balance* em processadores single-core (1 CPU) para evitar confusão.
  - Clarificada a recomendação de desativar os *Buffers TCP Turbo* em roteadores com 128 MB de RAM para máxima estabilidade operacional.

## 0.9.68

- **🧪 Suíte Automatizada de QA Visual Multi-Navegador e Multi-Resolução**:
  - Implementado test runner automatizado (`scripts/qa_visual_matrix.py`) executando 8 ambientes emulados e nativos em paralelo:
    1. Google Chrome Desktop Full HD (1920×1080);
    2. Google Chrome Laptop (1366×768);
    3. Mozilla Firefox Desktop Full HD (1920×1080 - Motor Gecko);
    4. Microsoft Edge Desktop Full HD (1920×1080 - Motor Chromium);
    5. Chrome Mobile iPhone 14/15/16 (390×844 - Viewport WebKit iOS com touch);
    6. Chrome Mobile Android Galaxy (412×915 - Viewport High-DPI Android com touch);
    7. Chrome Mobile Compact (360×740 - Smartphones de Entrada);
    8. Chrome Tablet / iPad (768×1024 - Modo Tablet).
  - Verificação automatizada de ausência de vazamento horizontal (`hasDocOverflow == false` e `hasMrOverflow == false`), contenção de caixas/cartões, fluidez de rolagem e auditoria com capturas de tela salvas em `docs/qa_screenshots/`.
- **📐 Diretrizes Oficiais de Design System e Prevenção de Falhas de Layout (`docs/UI_DESIGN_SYSTEM_AND_QA.md`)**:
  - Documentado o padrão arquitetural de rolagem do LuCI (Tema Argon/Bootstrap com `.main-right`), contenção estrita de submenus e modais, alvos de toque mínimos de 40px no mobile e regras contra transbordamento em Flex/Grid (`min-width: 0`).
  - Isolamento definitivo do `#modal_overlay` condicionado a `body.modal-overlay-active`, garantindo que o overlay permaneça inativo e fora da tela quando fechado.

## 0.9.67

- **📱 Eliminação de Scroll de Fundo e Travamento no iPhone / iOS Safari (Modal & Submenus)**:
  - **Correção da Geometria do Overlay de Modais (`#modal_overlay`)**:
    - O `#modal_overlay` foi desacoplado do seletor que forçava margens e larguras estreitas no mobile. Agora cobre 100% da tela física (`position: fixed; inset: 0; width: 100vw; height: 100dvh`), eliminando frestas laterais onde o toque caía diretamente no fundo da página.
    - Habilitada rolagem fluida e isolada no overlay com `-webkit-overflow-scrolling: touch` e `overscroll-behavior: contain`.
  - **Trava Ativa de Rolagem do Fundo (`MutationObserver` + Touch Isolation)**:
    - Implementada trava reativa em JavaScript que detecta instantaneamente quando qualquer modal ou submenu LuCI é aberto (`modal-overlay-active`).
    - Fixa a página de fundo (`position: fixed; top: -scrollY`) enquanto o modal está ativo, impedindo fisicamente que o Safari encadeie gestos (rubber-banding / scroll chaining) para a página subjacente.
    - Restaura a posição exata da tela com 0ms de atraso ao fechar o modal.
    - Intercepta e cancela eventos `touchmove` no backdrop escuro, impedindo congelamento de toques ou perda de resposta no iOS.

## 0.9.66

- **⚡ Bypass Expresso de Rede Local (LAN) no Limitador de Banda de Dispositivos**:
  - **Isolamento entre Tráfego Internet e Tráfego Interno**:
    - Adicionadas regras automáticas no topo da tabela `nftables` (`ark_device_limits`) para conceder `accept` instantâneo em qualquer pacote onde tanto a origem quanto o destino sejam endereços IP privados (`192.168.0.0/16`, `10.0.0.0/8`, `172.16.0.0/12` e IPv6 local).
    - Garante que transferências para NAS, servidores locais (Plex/Emby), impressoras, computadores e Smart TVs na LAN mantenham a **velocidade máxima nativa (Gigabit / Wi-Fi 6)**, sem sofrer qualquer corte.
    - O limitador de download e upload atua com precisão cirúrgica **apenas quando o tráfego se comunica com a Internet pública**.
  - **Transparência e Feedback Visual no Modal**:
    - O bloco de configuração de limite de velocidade em `overview.js` agora exibe uma nota explicativa com selo `⚡ Bypass de Rede Local`, esclarecendo que a restrição afeta apenas links externos de internet.

## 0.9.65

- **🌐 Provedores de DNS em Nuvem Especializados (Modo Nuvem / Anycast Brasil)**:
  - **Expansão de Provedores com Foco Específico**:
    - **Cloudflare 1.1.1.3 Família**: Malware + Pornografia/Conteúdo Adulto (~6ms Anycast BR).
    - **Quad9 9.9.9.9 Segurança**: Proteção contra malware, phishing, ransomware e golpes com feeds de +20 órgãos de cibersegurança global (~8ms).
    - **OpenDNS FamilyShield (Cisco)**: Bloqueio mundial pioneiro de conteúdo adulto e phishing sem necessidade de conta (~12ms).
    - **CleanBrowsing Adult Filter**: Bloqueio estrito de pornografia e conteúdo explícito (~18ms).
    - **CleanBrowsing Family Filter**: Pornografia + Casas de Apostas/Bets + SafeSearch forçado (~18ms).
    - **Control D Full Blocker**: Anúncios + Rastreadores + Pornografia + Apostas/Cassinos (~15ms).
    - **NextDNS Personalizado**: Integração dinâmica com perfil próprio via ID de configuração com servidores Anycast de baixíssima latência no Brasil (~12ms em SP, RJ, Fortaleza e Curitiba).
- **🚫 Bloqueio Universal de Sites Específicos (Lista Negra da Rede)**:
  - **Campo Prático no Modal AdBlock**: Permite digitar domínios específicos (ex: `bet365.com, blaze.com, tigrinho.vip, site.com`) separados por vírgula, espaço ou nova linha.
  - **Bloqueio em 0ms com 0 Bytes de RAM Extra**: Configura regras nativas no `dnsmasq` (`address=/dominio/0.0.0.0`) e regras no AdGuard Home (`||dominio^`), derrubando o domínio e todos os seus subdomínios instantaneamente para toda a residência em ambos os perfis (Full e Lite).
  - **Sanitização Automática**: Limpa URLs completas (`https://...`), barras e portas, mantendo apenas domínios válidos e persistidos com segurança no UCI.

## 0.9.64

- **🎨 Feedback Visual Inconfundível no Bloqueio de Apps e Serviços**:
  - **Identificação Imediata de Estado (Ativo / Bloqueado vs Liberado)**:
    - O estado bloqueado agora exibe gradiente vibrante vermelho (`#ef4444` → `#dc2626`), borda em vermelho brilhante, brilho de sombra avermelhada (`box-shadow`), ícone `🚫` e selo de status em caixa alta `BLOQUEADO`.
    - O estado liberado (inativo) mantém aspecto sutil e discreto em cinza-ardósia (`rgba(148,163,184,.08)`).
    - Diferenciação visual 100% clara, impossível de confundir à primeira vista.
  - **Propagação Global de Variáveis de Tema para Modais (`overview.css`)**:
    - As variáveis de cores do tema (`--ex-primary-safe`, `--ex-secondary-safe`) foram movidas para o escopo global (`:root, body, .modal, .cbi-modal, #modal_overlay`), garantindo que todos os botões e gradientes dentro de qualquer pop-up ou modal recebam as cores corretas com fallbacks sólidos.

## 0.9.63

- **📱 Responsividade Mobile Perfeita & Eliminação de Quebras Visuais**:
  - **Correção no Seletor de Ordenação de Dispositivos**: O botão `[ Maior primeiro ]` não transborda mais a tela em smartphones (~360px a 414px). O rótulo "Ordenar" é recolhido em telas estreitas, permitindo que o `<select>` e o botão de direção ocupem 100% da largura útil sem transbordar 1 pixel sequer.
  - **Alinhamento e Layout Perfeito da Tabela de Dispositivos**:
    - Corrigido desalinhamento de colunas onde o cabeçalho `TOTAL` era exibido enquanto a célula de dados estava oculta, o que empurrava o botão de engrenagem `⚙️` para baixo da coluna de Total e provocava corte lateral no mobile.
    - Implementado layout responsivo elegante de 3 colunas no mobile (`Dispositivo`, `Tráfego`, `Ações`), exibindo tanto a velocidade instantânea (download/upload) quanto o total acumulado (`Σ 1.2 GB`) no mesmo espaço, com o botão `⚙️` perfeitamente alinhado na extremidade direita.
    - Aplicação de `table-layout: fixed; width: 100%;` eliminando qualquer barra de rolagem horizontal ou corte nos cartões.
  - **Otimização de Espaçamento nos Cards Mobile**: Redução sutil do padding lateral dos cards para 12px em telas `<= 480px`, oferecendo mais área de toque e visualização confortável.
- **🔍 Correção Lógica e Auditoria de Código**:
  - **Correção nos Badges de Prioridade SQM (Gamer vs Vídeo)**: Corrigida correspondência de códigos DSCP (`AF41` e `EF` agora identificam corretamente a `Fila Gamer`, enquanto `AF31` e `AF42` identificam a `Fila de Vídeo`). Anteriormente, aparelhos configurados como Gamer salvavam `AF41` mas recebiam o selo de Vídeo na lista.
  - **Passagem Segura de Argumentos no Backend**: Substituída interpolação direta em strings Python por argumentos posicionais (`sys.argv`), protegendo completamente contra nomes de aparelhos com aspas, apóstrofos ou caracteres especiais.
  - **Detecção Precisa de AdGuard Home**: A verificação `adguard_installed` agora checa se o modo Nuvem não está forçado, garantindo consistência com o perfil ativo.

## 0.9.62

- **🛡️ Controle Parental e Filtros Individuais por Dispositivo**:
  - **Proteção Sob Medida no Modal do Aparelho**: Adicionada a seção *"Controle Parental & Filtros Deste Aparelho"* no modal de configuração individual de cada dispositivo (`overview.js`).
  - **Opção "Padrão da Rede" vs "Filtro Individual"**: O dispositivo pode herdar a proteção geral da rede ou receber regras personalizadas exclusivas.
  - **Filtros Granulares**: Alternadores para *Bloquear Conteúdo Adulto / Pornografia* e *Forçar Busca Segura (SafeSearch)* diretamente para o aparelho escolhido.
  - **Bloqueio de Apps e Jogos (Perfil Full / AdGuard Home)**: Seleção rápida em chips para bloquear TikTok, Instagram, YouTube, Discord e Roblox individualmente.
  - **Isolamento e Segurança Multi-Modelo**:
    - Em roteadores com AdGuard Home local (Perfil Full), as regras são sincronizadas nativamente na lista de clientes persistentes (`clients.persistent`) do AdGuard Home.
    - Em roteadores Lite ou sem AdGuard Home, as regras utilizam redirecionamento DNAT nativo no firewall OpenWrt para Anycast Familiar, com zero consumo de RAM e sem dependência de binários externos.
    - Se o usuário escolher "Padrão da Rede", nenhuma regra residual é mantida.

## 0.9.61

- **🛡️ Blindagem de DNS e Eliminação de Bypass no Bloqueio Adulto / SafeSearch**:
  - Removido upstream de bypass `1.1.1.1` do dnsmasq no modo local, garantindo que 100% das consultas de todos os dispositivos passem estritamente pelo AdGuard Home.
  - Flush e reinício imediato do cache do dnsmasq ao alterar configurações de proteção, impedindo que respostas sem bloqueio fiquem retidas em cache.

## 0.9.60

- **✨ Simplificação e Clareza no Controle do Bloqueador**:
  - Removido botão redundante `[Desligar]`, unificando todo o controle de ligar e desligar no interruptor visual `LIGADA / DESLIGADA`.
  - Exibição de atalho dinâmico para o painel via IP ZeroTier quando a permissão remota e o serviço estiverem ativos.

## 0.9.59

- **🔌 Porta Personalizada e Acesso ZeroTier para o AdGuard Home (Exclusivo Perfil Full)**:
  - **Porta Web Customizável**: Permite alterar a porta local do painel administrativo do AdGuard Home (padrão: `3000`).
  - **Acesso Remoto via ZeroTier**: Interruptor para liberar ou bloquear no firewall as conexões vindas da rede virtual ZeroTier na porta do AdGuard.
  - **Botão Direto com IP ZeroTier**: Quando ativo e conectado à rede virtual, o card exibe o botão `[Abrir via ZeroTier ↗]` apontando diretamente para o IP virtual do roteador.
  - **Isolamento Completo**: Opções exclusivas do Perfil Full; o Perfil Lite permanece 100% leve e sem poluição visual.

## 0.9.58

- **🎯 Correção de Seleção do Modo Atual no Modal do Bloqueador**:
  - Corrigido problema em que atributos booleanos de rádio causavam a seleção incorreta do modo Nuvem ao abrir as opções em roteadores rodando o AdGuard Home local.
  - Adicionada badge visual clara `[ATIVO NO ROTEADOR]` na opção que estiver atualmente em execução para eliminar qualquer ambiguidade.
  - Atribuição direta da propriedade `.checked` e proteção contra cliques acidentais em campos de seleção e switches.

- **🛡️ Ajuste Dinâmico de RAM de Cache e Opções Essenciais do Bloqueador (AdGuard Home)**:
  - **Quebras Inteligentes por Hardware**: Seletor de memória RAM para cache com presets (8MB, 16MB, 32MB, 64MB e 128MB) e recomendação automática calculada para o roteador (256MB/300MB, 512MB ou 1GB+).
  - **Proteções Essenciais Integradas no ARK Router**: Toggles visuais modernos para:
    - 🛡️ **Navegação Segura (Anti-Malware & Phishing)**
    - 👨‍👩‍👧 **Controle Parental (Bloqueio Adulto na Rede Toda)**
    - 🔍 **Busca Segura Forçada (SafeSearch Google, Bing, YouTube e DuckDuckGo)**
  - **Métricas Expandidas no Card**: Exibição da memória em RAM alocada e resumo das proteções ativas na rede.

## 0.9.56

- **⚡ Correção na Atualização em Tempo Real de Limites de Banda e Badges de Dispositivos**:
  - **Atualização Instantânea**: Corrigido o fluxo do renderizador in-place da lista de dispositivos para atualizar imediatamente as badges de limites (`🛑 100M↓ / 100M↑`), IP fixo, prioridade e nome ao salvar ou quando valores forem alterados manualmente nos campos.
  - **Reordenação e Rebuild Forçado**: Adicionado `forceDeviceReorder` ao confirmar o modal de configuração do dispositivo para garantir rebuild visual imediato no DOM sem necessidade de recarregar a página (F5).
  - **Sincronização de Eventos**: Suporte a eventos de `change` e `input` nos controles numéricos do modal de limites individuais.

## 0.9.55

- **🛡️ Novo Card Opcional: Bloqueador de Anúncios & Rastreadores (AdBlock)**:
  - **100% Opcional**: Desativado por padrão de fábrica; exige sempre a ação explícita do administrador para ativar pela primeira vez.
  - **Arquitetura Híbrida Inteligente**:
    - **Perfil FULL (Roteadores Potentes com >= 256MB RAM)**: Integração com motor local AdGuard Home operando em RAM com 64 MB de super-cache, mais de 100.000 regras ativas e link direto para o painel avançado na porta 3000.
    - **Perfil LITE (Roteadores Compactos / 16MB/32MB flash)**: Não sobrecarrega a memória flash; ativa filtragem Anycast no Brasil com super-cache dnsmasq de 25.000 domínios na RAM (resposta em 0ms).
  - **Comutação e Opções no Painel**: Interface intuitiva com interruptor Liga/Desliga, contador de regras e modal para troca dinâmica entre modo local e nuvem.

## 0.9.54

- **🛡️ Detecção Inteligente de Bloqueadores de DNS e Proteção de All-Servers**:
  - **Prevenção de Vazamento de Anúncios**: Quando o sistema detecta um bloqueador de DNS ativo (como AdGuard Home, Pi-hole ou Adblock), a opção "Consulta Paralela All-Servers" é automaticamente desativada e bloqueada no painel.
  - **Aviso Explicativo Visual**: Modais do DNS Turbo e de Desempenho exibem aviso informando que a consulta paralela anularia o bloqueio de anúncios ao consultar servidores públicos simultaneamente.
  - **Preservação de Upstream Seguro**: Ao salvar novos servidores no DNS Turbo, o endereço do bloqueador local (`127.0.0.1#5335`) é mantido automaticamente no topo da lista.

## 0.9.53

- **⚡ Ordenação Instantânea sem Bloqueio de Hover (Nome e Total)**:
  - **Reordenação Imediata em 0ms**: Corrigido bloqueio indevido de `:hover` que impedia o DOM de atualizar ao trocar as opções no menu suspenso de ordenação.
  - **Ordenação Inteligente A → Z**: Ao selecionar "Nome do aparelho", a ordenação padrão passa a ser alfabética direta (A → Z) e o botão passa a exibir dinamicamente `[A → Z]` / `[Z → A]`.
  - **Preservação de Métricas**: Ao alternar a ordenação manualmente, os dados mais recentes de tráfego são mantidos sem reiniciar artificialmente a contagem de tempo.

## 0.9.52

- **📊 Monitoramento de Tráfego por Dispositivo - Tempo Real, Estabilidade e Coluna Total**:
  - **Coluna "Total" Consumido Implementada**: Adicionada célula da coluna Total acumulado por dispositivo (`ex-total-cell`) alinhando os cabeçalhos e exibindo o consumo total em GB/MB.
  - **Fim da Lista Dançante / Anti-Jitter**: A ordenação padrão agora é por **Total Consumido** (maior consumidor primeiro, estável e sólido). Em atualizações em tempo real, as velocidades são atualizadas *in-place* no DOM sem destruir ou reordenar os elementos quando o usuário estiver com o mouse na tabela ou lendo.
  - **Taxa "Agora" Ultrarrápida e Sem Ficar em 0**: Integrados os contadores de hardware Wi-Fi (`iwinfo.assoclist`) para leitura instantânea pacote a pacote e aplicado filtro de decaimento suave (EMA) para impedir que a velocidade desabe seco para 0 bps entre rajadas.
  - **Otimização do Daemon nlbwmon**: Intervalo de atualização reduzido de 30s de fábrica para 2s via UCI defaults e painel de desempenho.

## 0.9.51

- **🌐 Acesso Remoto ZeroTier - Chave Seletora de Boot & Suporte Híbrido**:
  - **Chave Seletora de Auto-Início no Boot**: Adicionado switch interativo (`.ex-switch`) no card do ZeroTier para ligar ou desligar o início automático ao ligar o roteador.
  - **Diferenciação Inteligente de Hardware (Roteadores Fortes vs Fracos)**:
    - **Roteadores Fortes (Muita Flash)**: Detecta binário real em flash (`! -L`) e inicia nativamente via procd sem qualquer extração em RAM ou overhead.
    - **Roteadores Fracos (Pouca Flash)**: Auto-extrai pacote compactado em `/tmp` (RAM) em 0.3s através de `start_service()` e gancho com auto-recuperação no `/etc/init.d/zerotier`.
  - **Correção Crítica no Boot do OpenWrt 25.x**: Adequação do ciclo de vida em `ark-zerotier-ram` para respeitar chamadas `boot()` e `start_service()` do gerenciador procd.

## 0.9.50

- **📱 Otimização e Refinamento Responsivo Mobile**:
  - **Ajuste Fino de Layouts Flex e Modais**: Adicionadas proteções contra esmagamento de switches e quebras de linha responsivas (`gap: 12px`, `flex: 1 1 auto`, `min-width: 0`) nos modais de limite de banda e de DNS Turbo.
  - **Distribuição Touch em Telas Estreitas**: No Painel de Desempenho, a barra de ações (`.ex-perf-item-actions`) agora expande ocupando 100% da largura em smartphones, separando o botão de configuração e o toggle liga/desliga com alinhamento equilibrado.
  - **Botão de Teste de Latência DNS**: Otimizado com classe `.ex-dns-test-btn`, passando a ocupar largura completa em telas menores que 480px para toque facilitado.
  - **Grid de Predefinições Rápidas**: Padronizado com `.ex-priority-button-grid` para renderização perfeita em 2 colunas ou 1 coluna adaptável em qualquer tamanho de tela mobile.

## 0.9.49

- **🛡️ Auditoria Geral de Resiliência e Blindagem de Sistema**:
  - **Auto-Cura Global de Hostnames DHCP (`sanitize_dhcp_hostnames`)**: Script de inicialização (`99-ark-router-dhcp-sanitize`) e sanitização automática antes de recarregar o `dnsmasq`, garantindo que nenhum nome de host (mesmo criado manualmente no OpenWrt) cause travamento de DNS.
  - **Correção da Regra HTTPS / HTTP/3 QUIC no MWAN3**: Separadas as regras de porta 443 em TCP (`https`) e UDP (`https_quic`), eliminando o aviso do OpenWrt que ignorava a porta 443 ao usar `proto=all`.
  - **Blindagem de Limites por Dispositivo (NFTables)**: Correção na recriação da tabela `ark_device_limits`, evitando acúmulo de regras duplicadas a cada salvamento de dispositivo.
  - **Opção de Redundância Fallback no DHCP (1.1.1.1)**: Adicionada chave no modal de DNS Turbo permitindo enviar `1.1.1.1` como DNS secundário no DHCP caso o usuário deseje tolerância a falhas na rede.
  - **Tratamento de Exceções no Painel**: Protegidas rotinas de parse JSON em modais para evitar falhas silenciosas na interface.

## 0.9.48

- **🛡️ Sanitização Automática de Nomes de Dispositivos para o DNS (RFC 1123)**:
  - **Correção de Crash do `dnsmasq`**: Nomes com espaços (ex: `"TV SALA PLACA DE REDE"`) agora são sanitizados automaticamente como `"TV-SALA-PLACA-DE-REDE"` no backend do `dnsmasq`, impedindo que o serviço DNS caia ao salvar limites de velocidade ou reservas de IP.
  - **Preservação do Nome Visual no Painel**: O painel LuCI continua exibindo o nome original com espaços e emojis normalmente via `equipe_devices`.

## 0.9.47

- **⚡ DNS Turbo Paralelo (`all-servers`) com Seleção Flexível de 2 a 4 Servidores**:
  - **Modo Paralelo com Latência Mínima (0ms)**: Envia requisições DNS simultaneamente para todos os servidores cadastrados; quem responder primeiro entrega a página instantaneamente.
  - **Painel Interativo de Configuração de Servidores**: Permite preencher de 1 a 4 servidores DNS customizados com suporte a presets rápidos (🚀 Cloudflare + Google, ⚡ Apenas 2 Principais, 🛡️ Segurança, 🚫 Bloqueio de Anúncios).
  - **Teste de Latência em Tempo Real**: Botão integrado `[ 🧪 Testar Latência dos Servidores ]` para medir o tempo de resposta em milissegundos ($ms$) de cada IP antes de salvar.
  - **Chave de Liga/Desliga no Painel de Desempenho**: Permite alternar entre o modo sequencial e o modo paralelo com 1 clique.

## 0.9.46

- **🎮 Otimização de Prioridade Gamer & Compatibilidade com Apple Store / CDNs**:
  - **Classificação DSCP Segura (`AF41` / `AF31`)**: Atualização do Modo Gamer de `EF` para `AF41` (Classe 4 - Interativo/Jogos) e Fila de Vídeo para `AF31`. Elimina o descarte de pacotes por CDNs (Akamai, Fastly, Apple) e serviços bancários enquanto mantém latência ultra-baixa no SQM (Cake).
  - **Persistência de Sessão no Multi-WAN (MWAN3)**: Regra HTTPS atualizada para cobrir todos os protocolos (`proto='all'`) com `sticky='1'`, garantindo que requisições HTTP/3 (QUIC / UDP 443) da App Store e navegadores permaneçam sincronizadas na mesma WAN.
  - **Prevenção de Buraco Negro IPv6**: Validação para não entregar respostas AAAA quando a WAN não possui rota IPv6 ativa, eliminando esperas de conexão no iOS e navegadores.
  - **Suporte a STUN no UPnP (`miniupnpd`)**: Resolução de NAT Estrito/Fechado em conexões com CGNAT (100.64.0.0/10) para consoles e jogos de PC.
- **🎛️ Controle Total de Acesso Remoto ZeroTier**:
  - **Botões de Ligar e Desligar no Painel**: Adicionado botão `[ ▶ Ativar ZeroTier ]` e `[ ⏹ Desligar ]` no card de Acesso Remoto.
  - **Zero CPU e RAM em Standby**: Ao desligar, o daemon `zerotier-one` é completamente finalizado e a inicialização no boot é suspensa até reativação.

## 0.9.45

- **🚀 Sistema de Auto-Atualização Inteligente com Barra de Progresso em Tempo Real**:
  - **Barra de Progresso Dinâmica com Porcentagem**: Acompanhamento visual de todas as etapas (1/4 Backup do sistema, 2/4 Download do GitHub Releases, 3/4 Instalação pelo gerenciador APK/OPKG, 4/4 Limpeza de cache e reinicialização de serviços).
  - **Contagem Regressiva de Recarregamento**: Ao concluir com sucesso, exibe uma contagem regressiva suave (3.. 2.. 1..) antes de recarregar a página sem travar o navegador.
  - **Relatórios Detalhados em Caso de Falha**: Exibição dos logs de erro amigáveis direto no painel caso o download ou a instalação falhem.
- **🛡️ Blindagem de Flash do Speedify & Tipografia Aprimorada**:
  - Redirecionamento permanente das cópias temporárias `.lastGood*` do Speedify para a RAM (`/tmp`), mantendo a partição Flash permanentemente desobstruída.
  - Ajuste de tipografia em rótulos de métricas (`.ex-label`) eliminando overflow de texto em qualquer resolução de tela.

## 0.9.44

- **⚡ Otimização do Speedify em RAM para Roteadores Compactos ($\le 16\text{MB}$ Flash / $\le 256\text{MB}$ RAM)**:
  - **Eliminação Imediata do APK da RAM**: O instalador em RAM (`speedify_install_ram`) agora remove o arquivo bruto `.apk` imediatamente após a extração, liberando **14 MB de RAM instantaneamente**.
  - **Poda de Componentes Desnecessários em RAM**: Remoção automática de manuais, documentações e locales (`doc`, `man`, `locale`) do runtime em RAM, economizando mais **3 a 5 MB de RAM**.
  - **Limpeza de Logs e Caches**: Remoção automática de arquivos redundantes de debug `.lastGood*` do Speedify.
- **🧹 Limpeza e Otimização de Flash Atualizada**:
  - `[ 💾 Otimizar Espaço Flash ]`: Integra limpeza profunda e segura para roteadores compactos mantendo as credenciais de login do Speedify descompactadas e acessíveis de forma transparente.

## 0.9.43

- **⚡ Painel de Desempenho & Blindagem de Memória**:
  - Nova central retrátil no topo do painel com 5 controles de otimização de kernel e memória para eventos e roteadores com 256MB/512MB de RAM:
    - **Reciclador de Conexões Conntrack**: Reduz tempo de conexões inativas de 5 dias para 30 minutos, impedindo acúmulo de conexões mortas de redes sociais na RAM.
    - **Auto-Purge de Memória RAM & Caches**: Calibração contínua de `vfs_cache_pressure=150` e margem de segurança de RAM livre no kernel.
    - **Modo Turbo Speedify**: Desativa criptografia interna para cortar consumo de CPU e RAM pela metade em CPUs Dual-Core / Quad-Core.
    - **Trava de Logs do Speedify (2MB)**: Rotação e capping automático de logs para não esgotar a partição `/tmp` (RAM).
    - **Modo Leve do Monitor de Tráfego (nlbwmon Lite)**: Agrupamento de métricas apenas por dispositivo local (MAC), economizando banco de dados em RAM durante eventos públicos.
  - **Ações Imediatas no Painel**:
    - Botão `[ 🧹 Liberar Memória RAM Agora ]`: Descarte instantâneo de buffers inativos e arquivos temporários órfãos em `/tmp`.
    - Botão `[ 💾 Otimizar Espaço Flash ]`: Compactação automática de pacotes grandes (ZeroTier) na Flash com descompressão em RAM no boot, limpeza de caches do APK e remoção de redundâncias em roteadores compactos ($\le 16\text{MB}$).
  - Persistência total e automática via `/etc/config/equipe_perf` e `/etc/sysctl.d/` carregada na inicialização do roteador.
- **🛠️ Refatoração de Switches & Compatibilidade Total com Firefox**:
  - Conversão da estrutura do card para `<section>` padrão LuCI, eliminando conflitos de renderização e propagação de eventos causados pelo Shadow DOM de `<details>/<summary>` no Firefox.
  - Correção da emissão indevida do atributo `disabled` gerado pelo helper `E()` do LuCI que desabilitava o clique de mouse nos navegadores.
  - Feedback visual imediato com badges de estado `[ LIGADA ]` / `[ DESLIGADA ]`, animação de slider e atualização reativa do contador `[ X ATIVAS ]`.
  - Cache-busting automático de folhas de estilo e recursos JavaScript.
- **🚀 Otimização do Tempo de Inicialização do Painel ("Loading view…")**:
  - Carregamento até 40x mais rápido (redução de 5.650 ms para ~140 ms) eliminando chamadas síncronas bloqueantes de socket do Speedify quando o serviço estiver parado.
  - Otimização da checagem de pacotes instalados e fast-path de renderização inicial no `load()`.
- **🛰️ Seletor Interativo de Rota de Telemetria Starlink (/starlink/)**:
  - Seletor dinâmico para definir qual antena Starlink conectada (WAN1, WAN2, etc.) é a ativa na rota estática `192.168.100.1` tanto no painel autenticado quanto na página `/starlink/`.
  - Tratamento defensivo garantindo carregamento limpo quando nenhuma antena Starlink estiver conectada.
- **🎯 Policy Routing por Dispositivo (Rota de Saída Dedicada)**:
  - Adicionado seletor de rota de internet no modal de configuração de cada aparelho (WAN1, WAN2 ou Balanceamento padrão).
  - Regras com prioridade dinâmica no MWAN3 (`mwan3.ark_dev_*=0`) para aplicação imediata sem necessidade de reboot.

## 0.9.42

- **Gerenciador de Perfis PPPoE (PPPoE Vault)**: Adicionada central de perfis PPPoE salvos no modal de edição de qualquer WAN. Permite salvar e carregar Usuário, Senha e MAC Clonado em 1 clique.
- **Armazenamento e Gestão no UCI**: Suporte a salvamento, listagem e exclusão de perfis PPPoE personalizados com preenchimento automático e instantâneo dos formulários.
- **Correção da Latência na WAN2**: Bind da sonda ICMP ping direcionado ao endereço IPv4 próprio de cada interface WAN, garantindo medição precisa de latência em cenários Multi-WAN / DHCP.

## 0.9.41

- **Failover Direcional (WAN1 ou WAN2 Principal)**: O controle Multi-WAN agora permite escolher diretamente qual link é o principal (`Failover WAN1 → WAN2` ou `Failover WAN2 → WAN1`), gerando as métricas de membro e rotas do mwan3 em tempo real sem necessidade de reboot.
- **Identificação Visual de Prioridade Multi-WAN**: Status dinâmico da rota ativa exibindo no card `Failover (WAN1 principal)` ou `Failover (WAN2 principal)` e botões dedicados de troca rápida com 1 clique.

## 0.9.40

- **Seleção Dinâmica de Porta WAN2 no Ark - Setup**: O assistente inicial agora permite escolher qualquer porta LAN disponível no equipamento (ex: LAN1, LAN2, LAN3) para operar como a segunda interface de internet (WAN2 DHCP), com isolamento dinâmico de `br-lan` e associação correta ao firewall e ao SQM.
- **Aviso Informativo de Portas Físicas**: Adicionada dica visual clara no Ark - Setup orientando o usuário a conferir a numeração impressa na carcaça do roteador para plugar o cabo do segundo modem/Starlink na porta correta.
- **Badge Inteligente de Status do Speedify**: O badge do Speedify no topo do painel agora é exibido apenas quando o serviço estiver ativo/em execução (`CONNECTING`, `CONNECTED`, `STARTING`), permanecendo 100% oculto quando o serviço estiver parado (`STOPPED`).
- **Validação e Sincronização em Tempo Real**: Bloqueio/desbloqueio automático dos controles de porta física de acordo com o perfil de internet selecionado (1 ou 2 conexões).

## 0.9.39

- Added per-WAN optimization profiles: automatic detection of PPPoE, PPPoE+VLAN, DHCP/IPoE, mobile/Starlink and static links, with changes scoped to the selected WAN.
- SQM/CAKE editing and summaries now follow every active IPv4 WAN dynamically; guest download/upload policing remains independent.
- Fastpath/Flow Offloading is clearly blocked while any SQM queue is active, avoiding accidental bypass of CAKE; global TCP and IRQ controls are separated from per-WAN settings.
- Improved WAN editor readability for PPPoE password reveal and MAC cloning, plus dynamic WAN/LAN port handling.
- Added current-day per-WAN traffic totals and more faithful 24-hour rate history, including Gbps formatting and adaptive chart axis labels.
- Updated Lite/Full packaging metadata and documentation for persistent Starlink telemetry in Full, on-demand RAM telemetry in Lite, optional modules and configuration preservation.

## 0.9.38

- **Central Modular de Otimizações de Desempenho WAN & Fibra**: Nova central didática acessível via Recursos e no modal de edição de qualquer WAN com Presets de 1 Clique (`[ FIBRA BRIDGE PURA ]`, `[ VIVO / OI / CLARO ]`, `[ CLARO CABO / DMZ ]`, `[ MÓVEL / SATÉLITE ]`, `[ PLANOS 1G A 2.5 Gbps ]`).
- **Acelerações de Kernel e Rede**:
  - **Buffers TCP Turbo (BDP 8 MB)**: Otimização automática de `rmem_max`, `wmem_max` e `netdev_max_backlog` em `/etc/sysctl.d/99-ark-performance.conf` para máxima taxa em downloads pesados.
  - **Baby Jumbo Frames (MTU 1500)**: Configuração de MTU 1508 na porta física WAN (`eth1`) para suporte nativo a RFC 4638 sem fragmentação em conexões PPPoE.
  - **Software Flow Offloading (Fastpath)**: Fastpath via `fw4` reduzindo o consumo de CPU em planos acima de 1 Gbps (de ~25% para ~3% em conexões de 1.1G a 2.5 Gbps).
  - **Overhead CAKE Calibrado**: Mapeamento preciso de overhead de linha física (`pppoe_28`, `vlan_34`, `vdsl_44`, `none`) para latência zero e estabilidade máxima de jitter.
- **Visualização e Pré-carregamento de Senha PPPoE**: O modal de edição da WAN agora carrega a senha salva e inclui botão inline `👁️ Ver senha` / `👁️ Ocultar` com largura total no grid.
- **Gestão Visual de Dispositivos e Eliminação de Popups Nativos**:
  - Badges visuais de `🔒 IP Fixo` e filas de prioridade (`🎮 Gamer`, `📺 Vídeo`) na tabela de clientes conectados.
  - Exclusão de redes Wi-Fi adicionais refatorada com confirmação inline em 2 etapas (eliminando `window.confirm()` que causava congelamento de interface).
  - Blindagem de layout e componentes de switch/toggle em modais.

## 0.9.37

- **Progressive Multi-WAN addition**: LAN ports now dynamically calculate the next available WAN slot (`WAN3`, `WAN4`, etc.) instead of showing a static "Usar como WAN2" label.
- **Dynamic Multi-WAN lifecycle**: Creating a new WAN (`wan3`, `wan4`...) dynamically isolates the physical port from `br-lan`, assigns monotonic routing metrics (`N * 10`), includes the interface in the firewall WAN zone, and registers balancing and failover rules in `mwan3`.
- **Dynamic LAN restoration**: Any secondary WAN can be reverted back to LAN (`mode=lan`), cleanly deleting the interface, restoring the physical port to `br-lan`, and removing entries from firewall and `mwan3`.
- **Dynamic WAN dashboard rendering**: The dashboard now renders real-time metric cards, ping latency, and speedtest triggers for all active WAN interfaces.
- **Strict Starlink detection**: Prevents regular CGNAT or private WAN connections from being falsely recognized as Starlink dishes.
- **RAM-conscious Speedtest & CAKE direct editing**: Added Fast.com browser fallback for low-RAM devices and direct SQM/CAKE limit editing in Mbps.

## 0.9.36

- Added real Starlink diagnostic cards to the authenticated dashboard and the read-only `/starlink/` page: packet loss, current obstruction, uptime, average obstruction duration, SNR state, negotiated Ethernet speed and hardware alerts.
- Added automatic first-WAN telemetry loading and retry so the read-only page no longer opens with empty telemetry fields.
- The Starlink-only viewer now hides non-Starlink WANs, while normal WAN2/Multi-WAN operation remains unchanged.
- Alignment bands now change between green (inside accepted margin) and red (outside margin) in both panels.

## 0.9.35

- Added an optional unauthenticated Starlink viewer at `/starlink/`. It is disabled by default, can be enabled from the Starlink card, accepts GET requests only, exposes telemetry/alignment without configuration controls and enforces the current LAN subnet at the CGI boundary.
- Fixed Starlink telemetry queries through LuCI RPC: the watchdog no longer keeps the response open, and the dashboard accepts both direct JSON and `stdout` response formats.
- Added a visible multi-antenna advisory when two or more Starlink WANs are detected, recommending physical separation and different viewing directions to reduce shared obstructions/interference.
- Made the CAKE/SQM summary and limit editor enumerate every IPv4 interface currently configured with a WAN role. Each detected WAN now has its own visible limits, enable switch and persistent SQM queue instead of the summary being fixed to WAN1.
- Added the dedicated multi-Starlink telemetry module to both Lite and Full profiles. It detects each eligible WAN independently, serializes access to the shared dish address, installs a temporary host route only during the reading and restores the previous route afterward.
- Added one collapsible card per detected Starlink, with isolated telemetry, live one-second alignment mode and a `Finalizar e ir para próxima` workflow for aligning multiple antennas sequentially without changing the Internet default route, MWAN3 or Speedify.
- Added `irqbalance` to the actual Lite and Full APK dependency metadata, matching the documented package profiles.
- Replaced the disabled IRQ Balance switch on routers without the package with an explicit `Não instalado` state and installation button.

## 0.9.34

- Fixed WAN status when `mwan3` is installed but stopped: the dashboard now falls back to the physical OpenWrt interface instead of incorrectly showing `SEM INTERNET ATIVA`.
- WAN1/WAN2 cards now detect the real physical device dynamically for latency tests instead of assuming fixed interface names.
- WAN cards now show connection mode, active gateway, IPv4 netmask, received DNS, latency and individual received/sent totals.
- Fixed active DNS selection so current DNS servers take precedence over inactive historical interface data.
- Lowered the Speedify internal-install safety threshold consistently to 35000 KB and changed installed cards to show the actual storage mode instead of a misleading new-install recommendation.
- Reduced Speedify idle overhead by avoiding CLI calls while its daemon is stopped, while preserving saved configuration and reboot recovery behavior.
- Fixed the local WSL APK builder to compile the current repository checkout by default instead of reusing a stale copy under the WSL home directory.

- Lowered the automatic Full profile overlay threshold from 64000 KB to 35000 KB so routers with enough RAM and moderate free flash can receive the Full package.
- Fixed Lite/Full profile switching so the installer removes the opposite ARK Router package while preserving local UCI configuration files before installing the selected profile.
- Added `irqbalance` to the managed optional resources and Lite profile documentation because it is small enough for multicore routers like the Cudy WR3000 class.
- Split release packaging into Lite and Full profiles. Lite keeps the canonical `luci-app-ark-router` package name for compatibility, while Full publishes `luci-app-ark-router-full`.
- The SSH installer and dashboard self-updater can auto-select Lite or Full from detected RAM and free overlay space, with `ARK_ROUTER_PROFILE=lite|full` available for forced installs.
- Lite now also includes every measured sub-1 MB operational module from the Full profile, including SQM/CAKE, Multi-WAN, UPnP, uHTTPd management, Wi-Fi info, tunnel support, the LuCI package manager, OpenWrt update helpers and supported PT-BR LuCI translations.
- The Full profile pulls SQM/CAKE, Multi-WAN, UPnP, ZeroTier, speed testing, package manager, attended upgrade tooling, tunnel support, Wi-Fi info and supported PT-BR LuCI translations.
- Added package profile documentation with measured flash and service RAM impact from the tested APK firmware.

## 0.9.30

- Added `tc-full` and `kmod-sched-act-police` as default package dependencies so guest/visitor networks can enforce both download and upload limits.
- Fixed guest/visitor DHCP firewall handling and prevented ZeroTier firewall preparation from writing an invalid `device='-'` entry.
- Added runtime application of guest/visitor bandwidth limits through `tc` on the actual guest Wi-Fi interface.

## 0.9.29

- Added optional ZeroTier remote access integration as a lighter alternative for routers with limited flash/RAM.
- ZeroTier support can install/enable the service, join/leave a Network ID, show node/network/IP status and open the ARK Router directly through the ZeroTier IP.
- Fixed ZeroTier firewall/uHTTPd preparation to avoid creating a conflicting OpenWrt network interface and to keep the virtual IP assigned by ZeroTier itself.
- Removed Tailscale from the visible dashboard flow so the lightweight remote-access path focuses on ZeroTier.
- Improved visual spacing and per-section color accents in the dashboard, independent of the active LuCI theme.
- Fixed the Wi-Fi channel-width action button contrast on dark/default themes.
- Self-update now validates the installed version after package installation and reports an explicit error if the release asset does not actually advance the router version.
- Added a local WSL/OpenWrt SDK APK builder that uses `apk mkpkg` to generate the `noarch` LuCI package directly, avoiding full firmware/kernel-module compilation for ARK Router.

## 0.9.28

- Fixed WAN speed test startup on routers where the logical WAN interface uses a different physical device name, such as `wan` using `eth1`.
- Fixed speed test result persistence after appending history, so the dashboard receives the complete latest result instead of only historical data.
- Fixed aggressive speed test average calculation.
- Full IPv6 disable now also enables dnsmasq AAAA filtering, preventing IPv6 DNS answers from being sent to clients in IPv4-only mode.
- Channel analysis now detects when the suggested 2.4/5 GHz channels are already applied and disables the redundant apply action.
- Device list now supports sorting by name, current traffic or accumulated total, with a largest/smallest toggle.
- Apply actions now treat expected XHR/timeout disconnects during service restarts as "command sent" and reload the panel instead of showing a false failure.
- Speed test calibration now limits each `speedtest-go` run and falls back to a real HTTP/HTTPS download when the selected test server returns invalid download values.
- Speed test history averages now ignore invalid zero-download samples while still showing the original historical entries.
- Fixed the built-in 24-hour traffic collector deployment and WAN counter detection, avoiding fixed interface names and ensuring the dashboard history card becomes available after installation.
- WAN/LAN cards are now rendered from the actual bridge ports: when WAN2 is in LAN mode it appears under wired LAN ports, and any available LAN port can be selected as WAN2.
- WAN2 SQM now follows the selected physical port instead of assuming LAN1, and is disabled automatically when WAN2 returns to LAN mode.
- Added Wi-Fi channel-width controls to the dashboard: 2.4 GHz can be switched between 20/40 MHz and 5 GHz between 80/160 MHz.

## 0.9.27

- WAN1/WAN2 cards now show received gateway, IPv4 netmask and DNS servers from the active OpenWrt interface status.
- Improved WAN link wording so an online DHCP interface is not shown as "sem link" just because the physical device probe is unavailable.

## 0.9.26

- Added a confirmed **Disable IPv6 completely** action in Resources.
- The action backs up the router, removes WAN6/ULA/LAN IPv6 assignment, disables RA/DHCPv6/NDP, removes IPv6 firewall rules and persists kernel-level IPv6 disablement with sysctl.
- Ark Setup now uses the same full IPv6 disable routine instead of only partially disabling LAN IPv6.

## 0.9.25

- Hardened Wi-Fi editing on routers where one band-specific SSID section is missing, creating only the missing section before saving.
- Improved Wi-Fi save UX when the browser loses the XHR because the radio reloads during the change.

## 0.9.24

- Added optional WAN MAC clone editing to WAN1/WAN2. Leaving the field empty removes the override and uses the physical router MAC.
- Added Wi-Fi split mode in the network editor so 2.4 GHz and 5 GHz can use either the same SSID or separate SSIDs.
- Wi-Fi cards now show per-band names when the SSIDs are split.

## 0.9.23

- Added a one-click **Install missing features** action in the Resources modal for clean-router setup.
- The bulk installer installs only lightweight supported missing modules: Argon, SQM, Multi-WAN, nlbwmon, UPnP, uHTTPd and speed test when compatible.
- Speedify/BONDING REAL is intentionally excluded from the bulk installer because it requires licensing, architecture checks and storage-mode selection.

## 0.9.22

- Added DHCP DNS editing to the LAN/DHCP modal, allowing up to three IPv4 DNS servers to be sent to clients through DHCP option 6.
- LAN/DHCP status now reports and displays the DNS servers currently being advertised by the router.
- LAN/DHCP save now preserves non-DNS DHCP options while replacing only the DNS option.

## 0.9.21

- Improved the Speedify section wording to show BONDING REAL as the user-facing feature name.
- The BONDING REAL toggle now offers to install Speedify in the recommended mode when it is not installed yet, preparing WAN1/WAN2 before starting the install flow.

## 0.9.20

- Fixed clean-install behavior for guest QoS limits by shipping and preserving `/etc/config/qos_equipe`.
- Hardened `sqm-save` and Ark Setup guest-limit writes so they create `qos_equipe` when missing.
- Validated local clean reinstall on Cudy WR3000 v1 / OpenWrt 25.12.5 without resetting LAN/WAN access.
- Fixed SQM/CAKE advanced option persistence by writing `eqdisc_opts`/`iqdisc_opts`, so CAKE actually starts with `diffserv4`, NAT awareness and `ack-filter`.
- Normalized Multi-WAN setup on clean installs by removing inherited `wanb`/IPv6 defaults and rebuilding ARK policies with proper UCI list values.

## 0.9.19

- Made the one-line installer default to `auto`: it tries the Release package first and falls back to source install if the router package database cannot resolve dependencies while offline.
- Removed `iwinfo` as a hard package dependency. ARK Router still uses `iwinfo` when available, but package installation no longer fails on images where the binary exists without an APK database record.
- Kept `kmod-tun` as a Speedify/VPN runtime requirement, but removed it from the mandatory ARK Router package dependency list so the dashboard APK stays lightweight and does not force kernel module builds on every target.
- Added `nlbwmon` as an APK package dependency so ARK Router can expose per-device live and accumulated traffic by default.
- Fixed Speedify RAM/external runtime setup to reuse `/tmp/ark-speedify-cache/speedify.apk` instead of deleting a preloaded package before download.
- Added `kmod-tun`/`/dev/net/tun` verification before starting the reduced Speedify runtime.
- Reinforced the Speedify firewall zone with NAT masquerading and MTU fix every time the runtime network is prepared.
- Made Speedify tunnel preparation re-check the active `connectify*` device after daemon start, reducing the risk of clients losing Internet if the tunnel interface is recreated.
- Added live Speedify power control separate from reboot auto-recovery.
- Added Speedify runtime recovery that can restore the saved mode after reboot without running the heavy official internal installer automatically.
- Added visible Speedify account/connection state, active mode and tunnel IP in the dashboard.
- Added Fast.com/manual speed-test fallback that remains available even when `speedtest-go` is not suitable for weak routers.
- Improved speed-test storage detection with RAM-aware recommendations for small devices.
- Fixed LAN/uHTTPd binding so HTTP/HTTPS follows the selected LAN router IP instead of staying tied to a fixed development address.
- Replaced pilot-specific default Wi-Fi labels with generic ARK Router names while still reading the real SSIDs from each router.
- Sanitized development test/deploy scripts so router passwords are supplied through environment variables instead of being committed.
- Added Operational Profiles system: Standard/Controlled mode vs Gamer Mode with low-latency optimizations.
- Added dynamic Gamer Red visual theme (`#ef4444` / `#dc2626`) activated automatically when Gamer Mode is enabled.
- Added 1-click Gamer Mode toggle button and low-latency status indicator directly in the dashboard Hero section.
- Optimized SQM/CAKE queue parameters with `ack-filter` and `diffserv4` for zero-bufferbloat and minimal jitter in online gaming.
- Added real-time DSCP `EF` (Expedited Forwarding) priority support in device configuration for mobile/PC gaming (PUBG Mobile, Free Fire, etc.).
- Added automatic configuration snapshot backup (`/etc/config/ark_last_profile_backup.tar.gz`) before applying profile changes.
- Added smart storage detection for speedtest-go: installs permanently into flash only when safe; otherwise uses volatile RAM or manual fallback on small-flash devices.
- Preserved standard fair-share traffic policies when returning to Standard Mode.

## 0.9.16

- Improved the SSH installer with `release`, `source` and `auto` modes.
- Added source-based install/update for cases where GitHub Release package assets have not been generated yet.
- The same installer can now be re-run over SSH to update an existing ARK Router installation.
- Added root, `wget`, `tar` and LuCI preflight checks for safer first-time installs.
- Documented simple one-line install/update commands for stable users and development/source installs.
- Added maintainer publishing documentation covering GitHub tags, GitHub Actions, Release assets, self-update and local offline copies.

## 0.9.15

- Added ARK Router self-update support through GitHub Releases.
- The feature center now shows the installed ARK Router version and repository.
- Administrators can check for a newer release and install it only after confirmation.
- Self-update downloads `luci-app-ark-router.apk` or `.ipk` according to the router package manager.
- Before installing an update, ARK Router creates a temporary configuration backup in `/tmp`.
- The update flow restarts LuCI services and reloads the dashboard without changing network, Wi-Fi, firewall, DHCP, SQM or Multi-WAN settings.

## 0.9.14

- Fixed modal cancel/close behavior without removing LuCI's persistent `#modal_overlay`.
- Fixed internal dashboard action buttons after closing a modal, including WAN, LAN/DHCP, Wi-Fi, SQM, channel and reboot controls.
- Fixed LAN/DHCP editor opening on custom `192.168.x.x` networks: it now preserves the current subnet instead of resetting to `192.168.1.1`.
- Validated SQM/CAKE guest download changes through the web interface and confirmed persistence in UCI.
- Validated LAN/DHCP no-op apply flow through the web interface and confirmed persistence in UCI.
- Documented a follow-up: guest bandwidth values are saved and displayed, but the actual per-guest traffic shaper still needs an explicit runtime enforcement layer.

## 0.9.13

- Added a second confirmation step before applying main LAN/DHCP changes.
- The confirmation explains that LAN ports, DHCP and the panel session may restart.
- When the router IP changes, ARK Router now tries to open the dashboard at the new router address automatically.
- Reduced LAN/DHCP post-apply waiting time for range-only changes.

## 0.9.12

- Improved the manual LAN/DHCP editor: changing the router IP now suggests matching DHCP start/end addresses automatically.
- Updated LAN presets to suggest DHCP ranges from `.10` to `.254`.
- Manual DHCP suggestions stop overwriting values after the administrator edits start/end fields.

## 0.9.11

- Reload the dashboard after actions that restart SQM, network or Wi-Fi services.
- Make SQM/CAKE limit changes visibly refresh after saving so WAN and guest download/upload values are not shown stale.
- Reload after applying speed-test SQM suggestions, WAN/LAN edits, Wi-Fi edits, channel changes and country changes.

## 0.9.10

- Added Wi-Fi network settings directly in the dashboard cards.
- Main and guest SSIDs can now be renamed from ARK Router, applied to both 2.4 GHz and 5 GHz.
- Guest Wi-Fi can now be enabled or disabled without deleting its saved configuration.
- Wi-Fi password changes remain optional in the same editor.

## 0.9.9

- Added a dashboard LAN/DHCP editor for the main network.
- Added selectable presets for `192.168.x.x` and `10.0.x.x`, plus a manual mode for router IP and DHCP start/end addresses.
- Added backend validation and an automatic safety backup before changing the main LAN IP or DHCP range.
- Updated device counts and network labeling to follow the configured LAN/guest prefixes instead of fixed pilot subnets.

## 0.9.8

- Fixed Ark - Setup modal overflow on the default OpenWrt/LuCI theme by constraining setup content to the actual modal width.
- Added safer sizing for setup grids, fields, selects and inputs so the layout does not depend on the Argon theme modal behavior.

## 0.9.7

- Fixed Argon optional installation on OpenWrt `apk` builds where `luci-theme-argon` is not present in the official package feed.
- Added a fallback installer that downloads Argon and Argon Config from the upstream Argon GitHub release and enables the theme after installation.

## 0.9.6

- Fixed guest SQM editor reload values so guest download/upload limits are read from the `qos_equipe.guest` section that the dashboard saves.
- Added guest download limit support to Ark - Setup drafts and apply flow.

## 0.9.5

- Fixed release artifact collection so the generic installer asset points to the ARK Router package itself.
- Publish only ARK Router package artifacts and build logs instead of every dependency package.

## 0.9.4

- Fixed the GitHub Actions OpenWrt package build workflow.
- Use the generic `aarch64_cortex-a53` SDK image instead of a firmware-specific SDK tag.
- Prepare a standard OpenWrt feed layout before calling the SDK action.

## 0.9.3

- Added dashboard WAN editors for WAN1 and WAN2.
- WAN1 can edit DHCP, PPPoE, static IPv4 and DNS while keeping the physical WAN port.
- WAN2 can use LAN1/LAN2/LAN3 as a DHCP/PPPoE/static internet port or return the selected port to LAN.
- Added automatic safety backup before WAN/port changes.
- Added guest download-limit editing alongside guest upload-limit editing.
- Cleaned Ark - Setup optional modules so already-installed resources show as installed instead of selectable.
- Added GitHub Actions package build workflow and release documentation.

## 0.9.2

- Improved Ark - Setup visibility with a stronger dashboard button.
- Reworked the first setup screen to start with language, router name and country.
- Replaced unclear scenario profiles with explicit internet modes: single WAN, dual-WAN failover, dual-WAN balancing and custom.
- Changed regulatory country entry from free text to a selectable list.
- Split DNS configuration into separate DNS 1, DNS 2 and DNS 3 fields.
- Improved optional-module cards with installed/optional status to reduce confusion.
- Improved Ark - Setup layout on desktop and mobile.

## 0.9.1

- Replaced the old QoS shortcut with useful SQM controls on the dashboard.
- Added a SQM/CAKE on/off switch with confirmation.
- Added a visual editor for WAN1/WAN2 download and upload limits, where `0` means unlimited/no limit for that direction.
- Added guest upload-limit editing from the same SQM card.

## 0.9.0

- Added `Ark - Setup`, a guided first-configuration assistant for common OpenWrt scenarios.
- Added resumable setup drafts stored in UCI, with applied-step checkpoints.
- Added safe final application flow with an automatic `/tmp/ark-router-ezsetup-backup-*.tar.gz` backup before network changes.
- Added guided choices for router name, regulatory country, unified or split 2.4/5 GHz Wi-Fi, guest network, guest upload limit, WAN2, Multi-WAN mode, SQM strategy, DNS, IPv6, WPS and suggested modules.
- Added confirmed installation of Ark - Setup selected modules with background progress.
- Corrected remaining default ARK Router branding in package configuration and RPC ACL.

## 0.8.6

- Corrected the public brand back to `ARK Router`.
- Updated uninstall backup names from `arc-router-*` to `ark-router-*`.
- Kept legacy `ARC_ROUTER_*` script variables as compatibility fallbacks.
- Clarified first-configuration and SQM behavior in the project documentation.

## 0.8.5

- Added automatic uninstall-time backup for ARK Router preferences and friendly device names.
- Documented how to download and restore the uninstall backup before rebooting the router.

## 0.8.4

- Added a conservative uninstall script with `DRY_RUN=1` preview and `PURGE=1` preference removal mode.
- Documented install, uninstall and optional-package retention behavior.
- Clarified that optional packages installed through or alongside ARK Router are not removed by the uninstaller.

## 0.8.3

- Renamed the public-facing brand to `ARK Router` while keeping the existing package slug for compatibility.
- Added OpenWrt/LuCI/search-oriented keywords to the README for better discovery.
- Added a simple GitHub Releases installer script for future `.apk` and `.ipk` release assets.

## 0.8.2

- Improved the public README with badges, clearer feature grouping and a dedicated note explaining that pilot Wi-Fi names are examples, not requirements.
- Clarified that QoS/SQM and device-priority features are optional and hidden when their modules are unavailable.

## 0.8.1

- Fixed connected-device network labels so Wi-Fi clients are no longer shown as wired clients.
- Main Wi-Fi clients now show the active main SSID, guest Wi-Fi clients show the active guest SSID, DHCP-only clients show `Cabo / LAN`, and unknown main clients show `Rede principal`.

## 0.8.0

- Prepared the project for public GitHub publication.
- Added MIT license, public README, install guide, roadmap, support guide and screenshot guidance.
- Added issue templates, pull request template and GitHub Actions syntax check.
- Documented the tested router, firmware, package manager and LuCI theme without exposing passwords.

## 0.7.4

- Fixed dashboard confirmation toasts using low-contrast text under some LuCI/Argon theme combinations.
- Added explicit toast colors for info, warning and danger states.

## 0.7.3

- Removed `speedtest-go --saving-mode` from calibrated measurements because it under-reports fast fiber links.
- Enabled multi-server, eight-thread tests for better high-bandwidth WAN calibration.

## 0.7.2

- Hardened temporary `speedtest-go` preparation by preferring a direct package download derived from the official APK policy metadata.
- Added install-log retrieval so the dashboard can surface the real reason when an optional feature fails to prepare or install.
- Improved the feature-center flow to distinguish between already-ready, running and newly started optional installs.

## 0.7.1

- Fixed temporary `speedtest-go` preparation after a router reboot.
- Refreshes volatile APK package indexes before fetching the speed-test package.

## 0.7.0

- Added a responsive router restart control at the end of the dashboard.
- Added two separate confirmation steps and a visible two-second safety delay.
- Added a short-lived backend token so the safety delay is enforced by the router, not only by the browser.

## 0.6.0

- Added a unified per-device configuration dialog.
- Added MAC-based DHCP reservation with automatic/manual selection and IPv4 validation against the LAN subnet.
- Added optional per-device upload priority through AF41 DSCP marking for CAKE `diffserv4`.
- Kept the priority control hidden for guest clients and whenever SQM is inactive.

## 0.5.1

- Replaced LuCI/Argon dismiss notifications inside ARK Router with responsive toasts.
- Added a large close button, click-to-dismiss behavior and a seven-second automatic timeout.

## 0.5.0

- Added `luci-app-uhttpd` detection and optional installation.
- Added trusted local CA download and administrator-device installation guidance.
- Added HTTPS certificate state and SHA-256 fingerprint reporting.

## 0.4.0

- Added Argon as the recommended LuCI theme in the feature center.
- Added automatic Argon installation detection and a confirmed theme activation action.
- Avoided reinstalling optional packages that are already present but inactive.

## 0.3.1

- Fixed the HTTPS redirect switch retaining stale state after a successful change.
- Added an explicit active/off label and stronger visual feedback for HTTPS redirect.

## 0.3.0

- Added HTTPS availability and local-certificate information to the feature center.
- Added a confirmed HTTP-to-HTTPS redirect switch without enabling it by default.
- Added an HTTPS shortcut and bilingual warning about local/self-signed certificates.
- Documented flash, overlay and RAM distinctions for constrained routers.

## 0.2.0

- Added per-WAN link testing and SQM upload recommendations.
- Added temporary-RAM loading for `speedtest-go` on routers with limited flash.
- Added one full measurement plus two upload measurements per calibration.
- Added conservative, balanced and aggressive apply choices with confirmation.
- Added automatic restoration of the selected SQM queue before results are published.
- Declared dashboard and device UCI files as preserved package configuration.

## 0.1.0

- Added the ARK Router operational dashboard.
- Added editable branding with `ARK Router` as the default.
- Added Portuguese and English runtime translations.
- Added automatic, ARK Router and custom appearance modes.
- Added modular capability detection and optional package suggestions.
- Added Multi-WAN, SQM, Wi-Fi, device, LAN/WAN and 24-hour traffic views.
- Added safe controls for Wi-Fi channels, country, passwords, device names and Multi-WAN policy.
