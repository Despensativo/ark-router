<p align="center">
  <img src="docs/screenshots/ark-router-banner.jpg" alt="ARK Router Hero Banner" width="100%">
</p>

# ARK Router

<p align="center">
  <a href="https://openwrt.org/"><img src="https://img.shields.io/badge/OpenWrt-19.07%20a%2025.x-00B5E2?logo=openwrt&logoColor=white" alt="OpenWrt"></a>
  <a href="https://github.com/Despensativo/ark-router/releases/tag/v2.0.0"><img src="https://img.shields.io/badge/release-v2.0.0-blue.svg" alt="Release v2.0.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/UI-PT--BR%20%2F%20EN%20%2F%20ES-blue" alt="Trilingual UI">
  <img src="https://img.shields.io/badge/arch-all%20%2F%20noarch-orange" alt="Architecture: All">
</p>

<p align="center">
  <b>🌐 Idiomas / Languages / Idiomas:</b><br>
  <a href="README.md">🇧🇷 <b>Português (Brasil)</b></a> &nbsp;•&nbsp;
  <a href="README.en.md">🇺🇸 <b>English</b></a> &nbsp;•&nbsp;
  <a href="README.es.md">🇪🇸 <b>Español</b></a>
</p>

---

O **ARK Router** transforma roteadores com **OpenWrt** em verdadeiras centrais de comando profissionais, substituindo a interface estática tradicional do LuCI por um painel executivo moderno, ultrarrápido, modular e 100% responsivo para smartphones e computadores.

Ele não substitui o OpenWrt nem o LuCI: ele opera como uma suíte avançada de controle (`luci-app-ark-router`) com telemetria em tempo real, zero bloatware, salvaguardas anti-lockout e recursos pioneiros de rede e blindagem de memória.

> **Versão Oficial Ativa**: **`v2.0.0`** (consulte [`VERSION`](VERSION) e [Releases](https://github.com/Despensativo/ark-router/releases)).

---

## 🌟 Destaques Principais

1. **⚡ Central de Desempenho & Blindagem de Memória**:
   - Card unificado na Visão Geral com switches interativos de primeiro nível, contadores dinâmicos de otimizações ativas e aplicação em tempo de execução sem recarregar serviços desnecessários.
2. **🗜️ Compressão de Memória RAM Inteligente (ZRAM / LZ4)**:
   - Duplica a capacidade efetiva da memória RAM através de um disco de swap ultrarrápido em LZ4 com zero desgaste da memória Flash.
   - **Trava de Segurança de 5 Segundos**: Em roteadores com $\ge 512$ MB de RAM física, o switch exige confirmação temporizada para evitar ciclos desnecessários de CPU.
   - **Modo Protegido para CPUs Mononúcleo (MIPS)**: Detecta processadores modestos e limita o disco a 32 MB com `swappiness=15`, evitando afogamento da CPU.
   - **Ativação Instantânea**: Em roteadores multicore $\le 256$ MB (como o Cudy WR3000), aloca dinamicamente 116 MB para absorver picos de tráfego.
3. **🎮 Abertura Automática de Portas (UPnP / IGD) com Modo Seguro**:
   - Alternância rápida com feedback visual imediato:
     - **Modo Seguro (Desligado - Padrão)**: Nenhuma porta externa na WAN é aberta sem permissão explícita no firewall.
     - **Modo Ativo**: Permite abertura sob demanda para jogos online (Xbox, PlayStation, PC), emitindo alerta de conscientização na tela.
4. **🩺 ARK Doctor (Auditor de Integridade e Autocura)**:
   - Diagnóstico contínuo do sistema em tempo de execução em 10 camadas críticas: rádios Wi-Fi, pontes de rede, DHCP, regras do firewall (fw4/nftables puro), integridade da ZRAM (`Check 1b`), SQM e sintaxe do hostapd, com botão de reparo automático de 1 clique (`ark-doctor --fix`).
5. **🛡️ Bloqueador de Anúncios & Controle Parental Híbrido (Local RAM / Nuvem)**:
   - **Roteadores Full ($\ge 512$ MB RAM)**: AdGuard Home nativo rodando direto na memória temporária (`/tmp/adguardhome`) na porta 3000, com mais de 1 milhão de regras locais, super-cache em RAM, suporte a **HTTP/3 QUIC (`h3://`)** e zero escrita na flash.
   - **Roteadores Lite (128 MB a 256 MB RAM)**: Modo Nuvem ultraleve via `dnsmasq` com 9 provedores Anycast especializados (Cloudflare Família, Quad9 Segurança, CleanBrowsing, Control D, OpenDNS e NextDNS).
6. **🚫 Lista Negra de Sites da Casa em 0ms**:
   - Bloqueio imediato de domínios específicos (apostas, cassinos, sites indesejados) com resposta `0.0.0.0` em 0ms e zero bytes de consumo adicional de memória.
7. **⚡ Limite de Banda Individual com Bypass Automático da LAN (RFC 1918)**:
   - Controle individual de download e upload por dispositivo. O limite se aplica com precisão cirúrgica exclusivamente à Internet — transferências locais para NAS, servidores Plex, impressoras e compartilhamento de arquivos continuam em velocidade nativa (Gigabit / Wi-Fi 6 a 1200+ Mbps).
8. **🛑 Filtro Parental e SafeSearch Individual por Dispositivo**:
   - Bloqueio de conteúdo adulto e imposição de SafeSearch (Google, Bing, YouTube) configurável por dispositivo (ex: tablets e celulares de crianças).
9. **📊 Tráfego por Dispositivo em Tempo Real (Hardware DMA & Anti-Jitter)**:
   - Medição instantânea via contadores diretos do driver Wi-Fi (`iwinfo`), sem atrasos e com filtro de decaimento suave (EMA) que elimina oscilações visuais bruscas.
   - Coluna de **Total Consumido** (MB/GB) e ordenação interativa estável.
10. **🚀 DNS Turbo, Dual-DoH (`https-dns-proxy`) 1-Clique & Escudo Portas 53/853**:
    - Benchmark de latência em tempo real comparando Cloudflare, Google, Quad9, OpenDNS e AdGuard, ativação 1-Clique de **Dual-DoH (`https-dns-proxy`)** (`127.0.0.1#5053` + `#5054`) e escudo completo contra bypass DNS em Smart TVs e Android (*Private DNS* `TCP/UDP 853`).
11. **🌐 Acesso Remoto ZeroTier Inteligente**:
    - Executa nativamente em roteadores com armazenamento amplo e auto-extrai na RAM (`/tmp`) em 0.3s em aparelhos compactos de 16MB SPI flash.
12. **🛰️ Central Multi-Starlink (Telemetria & Alinhamento)**:
    - Diagnóstico de múltiplas antenas Starlink: bússola 3D, obstruções, perda de pacotes, SNR e visualizador público `/starlink/` para a rede local sem necessidade de login.
13. **🔄 Ciclo Perfeito de Fastpath (Flow Offload / PPE) e SQM/CAKE**:
    - Trava de exclusão mútua estrita entre Fastpath e SQM. Ao desligar o SQM no switch rápido do dashboard, o Fastpath de hardware é reativado automaticamente pelo procd.
14. **🛡️ Auto-MTU Inteligente & Baby Jumbo MTU 1500 em PPPoE (RFC 4638)**:
    - Sondagem ICMP real sem fragmentação e configuração automática de MTU 1508/1512 na interface base física para garantir MTU 1500 pura no túnel PPPoE, com status persistente no card e no modal.
15. **📱 Arquitetura V2: Cockpit Status-Only, Central de Recursos & Mobile-First**:
    - Separação executiva entre o **Cockpit** (telemetria pura) e a **Central de Recursos** (ciclo de vida completo de Serviços Nativos e Plugins Opcionais + **Modo Desenvolvedor**), 100% contido em telas de 360px a 1440px+.
16. **🔀 Alternância 1-Click entre Modo Roteador e Modo Ponto de Acesso & Switch (Dumb AP)**:
    - Converte portas em ponte transparente (`br-lan`), desativa DHCP local e protege o acesso administrativo com IP de Resgate anti-lockout permanente (`192.168.12.1` / `192.168.73.1`).
17. **🕸️ Inteligência Wi-Fi 6/6E/7: Fast Roaming 802.11k/v Puro & Diagnóstico MacBook `awdl0`**:
    - Roaming `bss_transition=1` + `rnr=1` sem `wnm_sleep_mode`, aliado ao diagnóstico contextual para linha **Apple MacBook (M1 a M5)** exibido exclusivamente em `160 MHz` para destravar `2400 Mbps` PHY (`1.4+ Gbps` reais).
18. **🌐 Balanceamento PBR BitTorrent em Modo Amplo Seguro (Dual-WAN)**:
    - Distribui conexões P2P em mais de 64.500 portas entre as WANs, preservando portas de sistema (80, 443, 53) prioritárias na WAN primária.
19. **⚡ Servidor SMB 3.1.1 em Kernel (`ksmbd`), Wake-on-LAN & WireGuard Ultrarrápido**:
    - Compartilhamento USB de alta velocidade em kernel (`ksmbd`), despertar remoto via Magic Packet (`etherwake`) e importação instantânea de túneis WireGuard (`.conf`).
20. **🌎 Internacionalização Tripla com 100% de Paridade (i18n Triplo — 4.423 Chaves)**:
    - Cobertura integral, nativa e auditada em Português do Brasil (PT-BR), Inglês (EN) e Espanhol neutro (ES).

---

## 📸 Capturas de Tela

Capturas reais obtidas em ambiente de testes no roteador físico (Cudy WR3000 v1 / OpenWrt 25.12.5):

| Desempenho & Blindagem de Memória (ZRAM / UPnP) | Visão Geral do Dashboard |
| :---: | :---: |
| ![Desempenho e Blindagem de Memoria](docs/screenshots/perf-hardening-card.png) | ![Dashboard Overview](docs/screenshots/dashboard-overview.png) |

| Ark - Setup (Assistente Inicial) | Controle de WAN e Multi-WAN |
| :---: | :---: |
| ![Ark Setup](docs/screenshots/ark-setup.png) | ![WAN Editor](docs/screenshots/wan-editor.png) |

| Otimização de SQM / CAKE | Telemetria Starlink em Tempo Real |
| :---: | :---: |
| ![SQM Editor](docs/screenshots/sqm-editor.png) | ![Starlink Telemetry](docs/screenshots/starlink-telemetry-real.png) |

| Interface Mobile Fluida | Diagnóstico do Ark Doctor |
| :---: | :---: |
| ![Mobile Overview](docs/screenshots/mobile-overview.png) | ![Ark Doctor](docs/screenshots/theme_switched_to_ark.png) |

---

## 🖥️ Roteadores Validados

| Dispositivo | Arquitetura | Memória / Armazenamento | Versão OpenWrt | Perfil ARK |
| :--- | :--- | :--- | :--- | :--- |
| **Cudy WR3000 v1** | MediaTek Filogic 820 (ARM64 Dual-Core) | 256 MB RAM / 16 MB Flash SPI | 25.12.5 / 24.x (`apk`) | Standard / Full |
| **Acer Predator Connect W6x** | MediaTek Filogic 830 (ARM64 Quad-Core) | 1 GB RAM / 512 MB Flash | 25.12.x / 24.x (`apk`) | Full |
| **D-Link DGL-5500** | Qualcomm Atheros QCA9558 (MIPS Single-Core) | 128 MB RAM / 16 MB Flash | 19.07 a 23.05 (`opkg`) | Lite |
| **VirtualBox x86_64 (`OpenWrt-ARK-Dev`)** | Intel/AMD x86_64 Multicore | 512 MB a 2 GB RAM | 24.10 / 25.x | Full / Dev |

---

## 📦 Instalação Rápida

O ARK Router é instalado diretamente sobre qualquer instalação existente do OpenWrt com LuCI. Ele **não sobrescreve o kernel** nem altera suas configurações de rede automaticamente.

### Método 1: Instalador Automático de 1 Linha (Recomendado)

Conecte-se via SSH ao seu roteador e execute:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

O instalador detecta automaticamente se o roteador utiliza `apk` ou `opkg`, analisa a memória RAM livre e o espaço disponível em disco, selecionando o melhor perfil (**Lite**, **Standard** ou **Full**).

### Forçar Perfil Específico:
- **Perfil Lite** (para roteadores com 128 MB a 256 MB de RAM e 16 MB flash):
  ```sh
  wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=lite sh
  ```
- **Perfil Full** (para roteadores com 512 MB ou mais de RAM):
  ```sh
  wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=full sh
  ```

---

### Método 2: Instalação Manual de Pacotes Locais (`.apk` ou `.ipk`)

Baixe os pacotes gerados diretamente na aba de **[Releases](https://github.com/Despensativo/ark-router/releases)**:

- **OpenWrt Moderno (gerenciador APK)**:
  ```sh
  apk add ./luci-app-ark-router-2.0.0-r1.apk
  /etc/init.d/rpcd restart
  ```
- **OpenWrt Tradicional / Legado (gerenciador OPKG)**:
  ```sh
  opkg install ./luci-app-ark-router-2.0.0-r1.ipk
  /etc/init.d/rpcd restart
  ```

---

## 🔄 Atualização Diretamente pelo Painel

Após instalado, você pode verificar novas versões diretamente pelo painel em:
**ARK Router → Recursos → Atualização do ARK Router**.

O atualizador verifica a versão mais recente publicada no GitHub, exibe as notas de lançamento e, após confirmação explícita do administrador, baixa e instala o pacote atualizado criando backup prévio automático das suas configurações em `/tmp`.

---

## 🗑️ Desinstalação Limpa e Segura

Para desinstalar o ARK Router preservando seus nomes amigáveis de dispositivos e preferências:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | sh
```

Para remover completamente, incluindo arquivos de preferências e configurações salvas:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | PURGE=1 sh
```

---

## 📄 Licença

Este projeto é disponibilizado sob a licença de código aberto **MIT License**. Consulte o arquivo [`LICENSE`](LICENSE) para mais detalhes.
