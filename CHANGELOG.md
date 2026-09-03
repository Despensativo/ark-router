# Changelog

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
