### Novidades e Destaques do ARK Router v2.0.0

• **🚀 Nova Arquitetura V2: Cockpit Executivo Status-Only & Central de Recursos**:
  - **Separação Estrutural Cockpit vs. Central de Recursos**: O **Cockpit** (`panel === 'cockpit'`) agora é 100% focado em telemetria operacional e leitura rápida (WANs, LAN, Wi-Fi, Top Clientes, Saúde e Processos), sem cartões de configuração pesados nem controles de instalação na tela inicial.
  - **Central de Recursos Unificada (`features`)**: Catálogo executivo para gerenciamento de **Serviços Nativos** (com interruptor rápido Ativar/Desativar) e **Plugins Opcionais de Sistema** (Ciclo de Vida Completo: Instalar, Ativar, Desativar com confirmação cautelosa e Remover pacote).
  - **Modo Desenvolvedor (`ark_dev_mode`)**: Oculta da barra lateral e das abas de domínio os plugins opcionais ainda não instalados no roteador por padrão; quando ativado na Central de Recursos, exibe todos os módulos com barra de ciclo de vida inline (`.ex-inline-plugin-lifecycle-bar`).
  - **Navegação Responsiva Desktop, Tablet e Mobile**: Barra superior mobile com gaveta deslizante (`ex-v2-mobile-bar`), pílulas de status compactas no topo sem sobreposição e modais 100% contidos na viewport (360px a 1440px+).

• **🔒 DNS Privado Inteligente: Dual-DoH (`https-dns-proxy`) 1-Clique + HTTP/3 QUIC (`h3://`) & Escudo Portas 53/853**:
  - **Ativação 1-Clique de Dual-DoH (`dns-turbo-doh`)**: Novo botão interativo no modal **DNS Turbo & Cache** (Ark Doctor) que instala automaticamente `https-dns-proxy` via `apk`/`opkg` e configura redundância dupla HTTPS em `127.0.0.1#5053` (Cloudflare) + `127.0.0.1#5054` (Google) integrada ao `dnsmasq`.
  - **Suporte Nativo a HTTP/3 QUIC (`h3://`) no AdGuard Home**: Ao provisionar o motor AdGuard Home, o ARK Router configura nativamente os upstreams `h3://1.1.1.1/dns-query`, `h3://8.8.8.8/dns-query` e `https://dns.quad9.net/dns-query` com `enable_http3: true` (UDP 443 zero head-of-line blocking).
  - **Escudo DNS Forçado Completo (Portas 53 + DoT 853)**: Interceptação transparente (`DNAT`) de DNS legado TCP/UDP 53 combinada ao bloqueio `REJECT` de DNS-over-TLS (`TCP/UDP 853` — RFC 7858), forçando Smart TVs, Chromecasts e celulares Android com *Private DNS* a utilizarem o resolvedor seguro e filtrado da LAN sem lentidão de timeout.

• **🌐 Auto-MTU Inteligente & Baby Jumbo Frames (RFC 4638 — PPPoE 1500 Puro)**:
  - **Sondagem ICMP Real sem Fragmentação**: Teste automático de descoberta de PMTU (`1472` bytes payload / `1500` bytes IP) e verificação de suporte a Baby Jumbo Frames (`1508` bytes na porta física Ethernet para PPPoE `1500` puro sem overhead de 8 bytes).
  - **Feedback Visual Persistente no Card e no Modal**: Exibição imediata do diagnóstico ativo (ex.: `1500 B • RFC 4638 Baby Jumbo elegível` ou `1500 B • Ótimo`) tanto na pílula do card **Auto-MTU & MSS Clamping** quanto dentro do modal interativo, com persistência automática em `/etc/config/ark`.

• **🍎 Inteligência Wi-Fi 6/6E/7: Apple MacBook (`awdl0` 160 MHz) & Fast Roaming 802.11k/v Puro**:
  - **Diagnóstico Cirúrgico para Linha MacBook (M1 a M5)**: Quando o rádio 5 GHz opera em **160 MHz** fora dos canais preferenciais da Apple (`44` ou `149`), o painel exibe um alerta contextual exclusivo explicando a limitação do driver `awdl0` (AirDrop/Sidecar/Handoff travando a largura em 80 MHz / ~660–720 Mbps) e como destravar `160 MHz` (`2400 Mbps` PHY / `1.4+ Gbps` reais). O aviso permanece oculto em `20/40/80/240/320 MHz`.
  - **802.11v (`bss_transition=1`) Sem `wnm_sleep_mode`**: O guardião `ark-wifi-roam-guard` mantém `bss_transition=1`, `ieee80211k=1` e `rnr=1` ativos, mas remove explicitamente `wnm_sleep_mode` para eliminar atrasos de entrega multicast/GTK e quedas silenciosas em smartphones em repouso.

• **⚡ Servidor SMB 3.1.1 em Kernel (`ksmbd`), Central Wake-on-LAN & IPv6 ULA/WAN Isolation**:
  - **Servidor de Arquivos USB (`ksmbd`)**: Substituição do Samba4 pesado em espaço de usuário pelo módulo de kernel `ksmbd` (`kmod-fs-ksmbd` + `ksmbd-server`), entregando transferências SMB 3.1.1 de alta velocidade com consumo mínimo de RAM e Flash.
  - **Central Wake-on-LAN (WoL)**: Despertar remoto via Magic Packet (`etherwake`) com lista de dispositivos favoritos, seleção de interface (`br-lan`) e disparo em 1 clique.
  - **Detecção Universal de Prefixo IPv6 ULA (`fdXX:`) & Isolamento Multi-WAN**: Reconhecimento preciso de qualquer prefixo RFC 4193 (`fd00:` a `fdff:`, incluindo `fd73:192:168::/64`) e isolamento estrito de anúncios RA (`ra='disabled'`) nas interfaces WAN para impedir vazamento de prefixo LAN para modems upstream.

• **🌍 Internacionalização Tripla Completa (PT-BR, EN, ES — 4.423 Chaves)**:
  - Cobertura 100% auditada (`audit_i18n.py --strict`) em Português (Brasil), Inglês e Espanhol neutro para todos os novos painéis, modais, avisos de hardware e diagnósticos da versão `2.0.0`.

