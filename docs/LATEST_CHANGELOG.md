### Novidades e Destaques do ARK Router v1.5.17

• **📶 Inteligência Dinâmica Wi-Fi, 802.11v (WNM), RNR e Calibração Band Steering**:
  - **Detecção Universal WNM (`ark_hostapd_has_wnm`)**: Detecta suporte a WNM no daemon `wpad` em tempo de execução, ativando `bss_transition=1` e `wnm_sleep_mode=1` de forma segura apenas quando suportado, sem quebrar compilações padrão do OpenWrt com `wpad-basic`.
  - **Reduced Neighbor Report (RNR) & 802.11k Ativos**: Anúncio proativo de vizinhança entre 2.4GHz, 5GHz e 6GHz, acelerando a descoberta e migração rápida de dispositivos modernos (Samsung Galaxy, Apple iPhone).
  - **Calibração de Alta Velocidade (`usteer`)**: Limiares de steering calibrados dinamicamente (`band_steering_min_snr '-70'`, `kick_threshold '-78'`), forçando os dispositivos a migrarem para as bandas de 5GHz HE160 com vazão de até 2.4 Gbps.
  - **Blindagem Centralizada Qualcomm SON (`ark_has_qualcomm_son`)**: Detecção de drivers proprietários QSDK (`hyd`), prevenindo conflito de kernel e travamento de rede no Acer Predator T7 e SoCs Qualcomm.

• **📱 Padrão Arquitetural Mobile-First: Tabelas, Abas e Ações no LuCI**:
  - **Contenção Estrita de Viewport**: `#view` e `#maincontent` limitados a `max-width: 100% !important; box-sizing: border-box !important;`, eliminando 100% dos estouros laterais em smartphones (360px a 390px).
  - **Desbloqueio de Scroll em Abas Ativas (`network/routes`)**: Remoção de `overflow: visible !important` em abas ativas, garantindo rolagem horizontal suave em tabelas de rotas e firewall.
  - **Encapsulamento Dinâmico de Tabelas Órfãs (`network/wireless`)**: Encapsulamento de `#wifi_assoclist_table` em cartão dedicado `.ark-assoclist-card` com contador ao vivo e indicador tátil de deslize lateral.
  - **Barra de Ações Ergonômica Mobile (`.cbi-page-actions`)**: Botão principal "Salvar e Aplicar" ocupando 100% da largura superior (44px de altura) e botões secundários em 50%/50% na linha inferior.

• **⏱️ Preservador de Horário & Fake-RTC (`ark-clock-preserver`)**:
  - Inicialização segura de relógio via época salva em Flash/RAM (`/etc/ark-clock.epoch`), evitando expiração de certificados TLS e falhas no LuCI antes do sincronismo NTP.
  - Interceptação de tráfego NTP (UDP 123) com servidor local ativo para sincronismo transparente da LAN.

• **🛡️ Auto-Recuperação de Telemetria e Processos (`status/processes`)**:
  - Cooldown e trava de concorrência em `injectRealProcessMemory()`, eliminando loops do `MutationObserver` e exaustão de subprocessos do BusyBox.
