### Novidades e Destaques do ARK Router v1.5.16

• **🌐 Isolamento Canônico de IPv6 & Fim do Sequestro de Socket na WAN**:
  - **Vinculação Estrita de Interfaces DHCPv6**: Pareamento canônico de interfaces IPv6 com seus respectivos dispositivos de WAN pai (`wan` ➔ `wan6` em `@wan`, `wan2` ➔ `wan2_6` em `@wan2`).
  - **Expurgo Automático de Interfaces Órfãs**: Ao converter uma porta WAN secundária para LAN, suas interfaces de IPv6 e registros de firewall são cirurgicamente removidos, prevenindo loops de recarga no `netifd` e erros de `Invalid argument`.
  - **Exclusividade Mútua na Delegação de Prefixo**: Em cenários Multi-WAN, a WAN primária delega o prefixo para a LAN (`delegate=1`), enquanto as WANs secundárias operam com `delegate=0`, eliminando colisões de roteamento e *blackholes* de tráfego.

• **🛡️ Blindagem de Modo Ponto de Acesso / Ponte (AP / Bridge Mode)**:
  - **Passagem L2 Transparente**: Reconhecimento automático do tráfego IPv6 fluindo via switch bridge de Camada 2 a partir do roteador mestre upstream.
  - **Bypass no Ark Doctor e Sanitizadores**: Sanitizadores e auditorias ignoram a exigência de `wan6` local quando o roteador opera como satélite/ponte/AP, reportando status verde sem alertas indevidos.

• **🔥 Pureza de Firewall fw4 no Multi-WAN (mwan3)**:
  - **Contador Preciso de WANs Ativas**: O ciclo de vida do `mwan3` agora ignora interfaces companheiras de IPv6 (`wan6`, `*_6`, proto `dhcpv6`), identificando corretamente cenários com apenas 1 WAN física.
  - **Standby Automático & Eliminação de Regras Legadas**: Em Single-WAN, o `mwan3` entra em standby imediato e o `fw4` é recarregado, eliminando 100% das regras legadas de `iptables` e operando com `nftables` puro.
