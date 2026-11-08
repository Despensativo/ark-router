<p align="center">
  <img src="docs/screenshots/ark-router-banner.jpg" alt="ARK Router Hero Banner - Suíte de Otimização e Tema LuCI para OpenWrt" width="100%">
</p>

# ARK Router — Otimização de Rede, Controle de Bufferbloat e LuCI Moderno para OpenWrt

<p align="center">
  <a href="https://openwrt.org/"><img src="https://img.shields.io/badge/OpenWrt-19.07%20a%2025.x-00B5E2?logo=openwrt&logoColor=white" alt="OpenWrt 19.07 a 25.x"></a>
  <a href="https://github.com/Despensativo/ark-router/releases/tag/v2.2.4"><img src="https://img.shields.io/badge/release-v2.2.4-blue.svg" alt="Release v2.2.4"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="Licença MIT"></a>
  <img src="https://img.shields.io/badge/UI-PT--BR%20%2F%20EN%20%2F%20ES-blue" alt="Interface Trilingue PT-BR / EN / ES">
  <img src="https://img.shields.io/badge/arch-all%20%2F%20noarch-orange" alt="Arquitetura All / Noarch">
</p>

<p align="center">
  <b>🌐 Idiomas / Languages / Idiomas:</b><br>
  <a href="README.md">🇧🇷 <b>Português (Brasil)</b></a> &nbsp;•&nbsp;
  <a href="README.en.md">🇺🇸 <b>English</b></a> &nbsp;•&nbsp;
  <a href="README.es.md">🇪🇸 <b>Español</b></a>
</p>

---

O **ARK Router** é uma suíte de otimização de rede, mitigação de bufferbloat e um tema LuCI executivo moderno para **OpenWrt** (versões 19.07 a 25.x, com suporte nativo a `fw4`/nftables e `fw3`/iptables). 

Projetado para eliminar atrasos de fila sob tráfego concorrente e transformar roteadores domésticos em equipamentos de alta estabilidade para jogos competitivos, streaming e trabalho remoto, o ARK opera como um aplicativo LuCI oficial (`luci-app-ark-router`). Ele não substitui o kernel do OpenWrt: adiciona telemetria em tempo real, calibrações de rede em baixo nível, bloqueio de anúncios em memória RAM e uma interface 100% responsiva para smartphones e computadores.

> **Versão Oficial Ativa**: **`v2.2.4`** (consulte [`VERSION`](VERSION) e [Releases](https://github.com/Despensativo/ark-router/releases)).

---

## 🏆 Engenharia de Destaque (`v2.2.4`): QoS Dual-Engine & Calibração de Kernel

O ARK Router reúne mecanismos de mitigação de latência sob carga (Bufferbloat) integrados a calibrações de rede no Kernel Linux (`BQL`, `RPS Multi-Core`, `NAPI`, `RFC 4638 Baby Jumbo 1500` e Promoção `Voice` Ingress `u32`):

- **⚙️ Escolha entre 2 Motores de QoS no Painel**:
  - **🛡️ Opção 1 — `CAKE (Layer Cake / DiffServ4)`**: Algoritmo `sch_cake` com isolamento automático de fluxos por host (`dual-srchost` / `dual-dsthost`), `nat`, `wash` e `no-split-gso`. Recomendado para distribuição justa e equitativa de banda entre múltiplos usuários simultâneos.
  - **🚀 Opção 2 — `HFSC + FQ-CoDel Turbo (Gaming & Baixa Latência)`**: Motor `/usr/lib/sqm/ark_hfsc_fqcodel.qos` combinando curvas de serviço hierárquico **HFSC (`Hierarchical Fair Service Curve`)** com **FQ-CoDel (`1024` fluxos)**:
    - **Fila `1:10` Real-Time (`rt` curve `< 1 ms`)**: Curva em duas inclinações (`m1 = 40%` por `8ms`, `m2 = 20%`) dedicada exclusivamente a pacotes curtos (`<= 511 bytes` via filtro `u32`) de jogos online (UDP), chamadas VoIP, WebRTC, ICMP Ping, DNS e pacotes de controle TCP SYN/ACK. Pacotes `UDP 443` (QUIC/HTTP3) permanecem na fila `1:20` (`Best Effort`) para evitar reordenação de fluxos web.
    - **Fila `1:20` Interactive & Throughput**: Taxa elástica de até `100%` da banda (`ul rate 100%`), `quantum 1514` (1 quadro por ciclo DRR) e suporte a ECN/L4S.
    - **Fila `1:30` Bulk Scavenger (`CS1`)**: Isola downloads pesados e backups no upload (`m2 = 5%`), impedindo que saturem a capacidade de transmissão do enlace.
- **📡 Perfis Físicos de Enlace com Overhead Pré-Calculado**:
  - Parâmetros exatos para cada tecnologia de acesso: `overhead 34, mpu 64, atm off` para GPON PPPoE; `overhead 38` para PPPoE sobre VLAN; `overhead 18` para conexões cabo DOCSIS e Starlink.
  - **Baby Jumbo Frames (RFC 4638)**: Configura MTU `1508` na interface física base WAN, viabilizando MTU `1500` integral no túnel PPPoE sem fragmentação TCP (MSS 1460 intacto).
  - **Descoberta de PMTU por Camada de Pacote (RFC 4821)**: Ativação de `tcp_mtu_probing=1` para evitar buracos negros de MTU (Path MTU Black Holes).
- **🎮 Classificação de Tráfego de Jogos & Balanceamento Multi-Core**:
  - Marcação de QoS (`CS4` + `ct mark 0xa0`) para mais de 80 títulos competitivos (Counter-Strike 2, Valorant, Call of Duty, Fortnite, EA FC, League of Legends, Rainbow Six Siege) e ecossistemas de console (PlayStation Network, Xbox Live, Nintendo Switch).
  - **Escalonamento RPS Multi-Core Simétrico**: Divisão de afinidade de interrupções de rede entre os núcleos de processamento do SoC (MediaTek Filogic MT7986/MT7981), eliminando gargalos mono-core em enlaces de 1 Gbps+.
  - **BQL Físico Anti-Drop (512 KB)**: Ajuste de limites mínimos no anel de transmissão DMA do GMAC (`eth0`/`eth1`), eliminando descartes secundários sob PPPoE.
  - **Dimensionamento Dinâmico de Conntrack**: Calibração adaptativa da tabela `nf_conntrack_max` conforme a memória RAM física (de 16.384 conexões em 128 MB até 131.072 conexões em 1 GB+ RAM), protegendo roteadores compactos contra Kernel Panic por OOM.
- **⚡ Fast-Path de Cache em RAM no Dispatcher (`equipe-dashboard-control`)**:
  - Respostas instantâneas para rotas de telemetria contínua (`system-perf-status`, `system-hardware-info`, `mwan-status-fast`) com contadores voláteis lidos diretamente da memória, reduzindo a latência RPC em até 93% sem sobrecarga de CPU.

---

## 🌟 Principais Recursos

1. **⚡ Central de Desempenho e Blindagem de Memória**:
   - Ajustes interativos de baixo nível (TCP BBR, TCP Turbo, aceleração de hardware PPE, conntrack) com aplicação imediata em runtime sem reiniciar a conexão.
2. **🗜️ Compressão de Memória RAM (ZRAM / LZ4)**:
   - Expansão de RAM volátil com swap em memória ultraveloz comprimida via LZ4, com travas de segurança por arquitetura (32 MB em MIPS de 128 MB e 116 MB em roteadores de 256 MB), sem desgaste de armazenamento Flash.
3. **🎮 Gerenciador UPnP / IGD com Modo Seguro**:
   - Controle estrito de portas abertas na WAN para jogos e consoles, com suporte a visualização e revogação instantânea de mapeamentos ativos.
4. **🩺 ARK Doctor (Auditor de Integridade e Autocura)**:
   - Varredura de 28 verificações do sistema (rádios Wi-Fi, pontes de rede, sintaxe hostapd, regras fw4/nftables, integridade de processos e memória), com botão de autocura rápida (`ark-doctor --fix`).
5. **🛡️ Bloqueio de Anúncios e Proteção DNS Híbrida**:
   - **Roteadores Full ($\ge 512$ MB RAM)**: AdGuard Home nativo rodando em memória temporária (`/tmp/adguardhome`) na porta 3000, com suporte a listas customizadas e zero escrita na flash SPI/NAND.
   - **Roteadores Lite (128 MB a 256 MB RAM)**: Modo Nuvem via `dnsmasq` com provedores Anycast de baixa latência (Cloudflare Família, Quad9, CleanBrowsing, Control D).
6. **⚡ Limite de Banda com Bypass Automático da LAN (RFC 1918)**:
   - Limitação de download e upload individual por cliente na Internet. Transferências na rede local (NAS, Plex, impressoras) continuam em velocidade total de hardware (Gigabit / Wi-Fi 6).
7. **📊 Telemetria de Tráfego por Dispositivo em Tempo Real**:
   - Contadores diretos de pacotes e bytes por rádio Wi-Fi e cabo, com suavização matemática anti-jitter e histórico diário de consumo.
8. **🚀 DNS Turbo Paralelo e Dual-DoH (`https-dns-proxy`)**:
   - Resolução paralela de alta velocidade (All-Servers), DoH nativo em 1-clique e bloqueio de sequestro de DNS em Smart TVs e Android (portas 53 e 853).
9. **🌐 Multi-WAN Inteligente & PBR (Policy-Based Routing)**:
   - Failover automático e balanceamento de carga entre múltiplos provedores de Internet, com regras dedicadas para tráfego gamer, streaming e conexões P2P.
10. **🔒 WireGuard VPN de Alta Performance & Servidor SMB 3.1.1 (`ksmbd`)**:
    - Cliente e servidor WireGuard integrados diretamente ao kernel Linux e compartilhamento de arquivos USB de alta velocidade via módulo `ksmbd`.
11. **📱 Interface Web LuCI Mobile-First & Painel Cockpit**:
    - Navegação fluida por cards dobráveis, layout responsivo em telas de 360px a 2560px (smartphones, tablets e monitores ultrawide), com barra de ações tátil.
12. **🌎 Internacionalização Nativa Tripla (i18n)**:
    - 100% das telas traduzidas e validadas nativamente em Português do Brasil (PT-BR), Inglês (EN) e Espanhol (ES).

---

## 📸 Galeria de Capturas de Tela (v2.2.4)

Capturas reais obtidas em hardware físico de produção (**Acer Predator Connect W6x** — MediaTek Filogic 830 Quad-Core 2.0 GHz, 1 GB RAM, OpenWrt 25.x / 24.10):

| Visão Geral do Painel Cockpit | Desempenho & Blindagem de Memória |
| :---: | :---: |
| ![Visão Geral do Painel Cockpit no ARK Router](docs/screenshots/dashboard-overview.png) | ![Central de Desempenho e Ajustes de Kernel no ARK Router](docs/screenshots/perf-hardening-card.png) |

| Assistente Inicial de Configuração (Ark - Setup) | Editor de Conexão WAN e Baby Jumbo |
| :---: | :---: |
| ![Assistente de Configuração Rápida Ark Setup no LuCI](docs/screenshots/ark-setup.png) | ![Editor de Configurações WAN e Baby Jumbo no OpenWrt](docs/screenshots/wan-editor.png) |

| Editor de Filas QoS / SQM (Dual-Engine) | VPN WireGuard Integrada em Kernel |
| :---: | :---: |
| ![Configuração de SQM CAKE e HFSC FQ-CoDel no ARK Router](docs/screenshots/sqm-editor.png) | ![Telemetria de VPN WireGuard de Alta Performance no OpenWrt](docs/screenshots/starlink-telemetry-real.png) |

| Interface Mobile Fluida (390px) | Auditoria e Autocura (Ark Doctor) |
| :---: | :---: |
| ![Interface LuCI Responsiva para Celular no ARK Router](docs/screenshots/mobile-overview.png) | ![Diagnóstico de Integridade e Autocura com Ark Doctor](docs/screenshots/theme_switched_to_ark.png) |

---

## 🖥️ Matriz de Dispositivos e Requisitos

| Dispositivo | SoC / Plataforma | Memória / Flash | Versão OpenWrt | Perfil ARK | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Acer Predator Connect W6x** | MediaTek Filogic 830 (MT7986 Quad-Core A53 2.0 GHz) | 1 GB RAM / 512 MB Flash | 24.10 / 25.x (`apk`) | Full | ✅ Validado em Produção |
| **Acer Predator Connect T7** | Qualcomm / Filogic Wi-Fi 7 BE11000 Multi-Gigabit | 1 GB+ RAM / Multi-Gig | 24.10 / 25.x (`apk`) | Full | ✅ Suportado |
| **Cudy WR3000 v1** | MediaTek Filogic 820 (MT7981B Dual-Core A53 1.3 GHz) | 256 MB RAM / 16 MB Flash SPI | 24.10 / 25.x (`apk` / `opkg`) | Standard / Full | ✅ Validado em Produção |
| **D-Link DGL-5500** | Qualcomm Atheros QCA9558 (MIPS Single-Core 720 MHz) | 128 MB RAM / 16 MB Flash | 19.07 a 23.05 (`opkg`) | Lite | ✅ Validado em Laboratório |
| **Máquinas Virtuais x86_64 (UTM / VirtualBox)** | Intel/AMD x86_64 Multicore (QEMU / KVM) | 512 MB a 2 GB RAM | 19.07 a 25.x | Full / Dev | ✅ Ambiente Canônico de Testes |

### Requisitos Mínimos:
- **Perfil Lite**: 128 MB de memória RAM e 16 MB de memória Flash (OpenWrt com `opkg`, firewall `fw3` ou `fw4`).
- **Perfil Full**: 256 MB a 1 GB+ de memória RAM e 32 MB+ de armazenamento Flash (suporte completo a AdGuard Home em RAM, telemetria e pacotes de análise).

---

## 📦 Instalação Rápida

O ARK Router é instalado diretamente sobre uma instalação existente do OpenWrt com interface LuCI. Ele **não sobrescreve o kernel** e não altera suas configurações de rede ou senhas existentes.

### Método 1: Instalador Automático de 1 Linha (Recomendado)

Conecte-se via SSH ao seu roteador OpenWrt e execute:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

O instalador detecta automaticamente se o sistema utiliza `apk` (OpenWrt 25.x) ou `opkg` (OpenWrt 19.07 a 24.x), avalia a arquitetura e memória RAM disponível, selecionando o pacote adequado (**Lite**, **Standard** ou **Full**).

### Instalação Manual de Perfil Específico:
- **Perfil Lite** (para hardware de 128 MB a 256 MB de RAM):
  ```sh
  wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=lite sh
  ```
- **Perfil Full** (para hardware de 512 MB a 1 GB+ de RAM):
  ```sh
  wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=full sh
  ```

---

### Método 2: Instalação de Pacotes Pré-Compilados (`.apk` ou `.ipk`)

Baixe os pacotes da versão oficial diretamente na página de **[Releases](https://github.com/Despensativo/ark-router/releases)**:

- **OpenWrt Moderno (`apk` — OpenWrt 25.x+)**:
  ```sh
  apk add --allow-untrusted ./luci-app-ark-router-full-2.2.4.apk
  /etc/init.d/rpcd restart
  ```
- **OpenWrt Tradicional (`opkg` — OpenWrt 19.07 a 24.10)**:
  ```sh
  opkg install ./luci-app-ark-router-full-2.2.4.ipk
  /etc/init.d/rpcd restart
  ```

---

## 🔄 Atualização pelo Próprio Painel

Novas versões podem ser verificadas e aplicadas diretamente na interface web em:
**ARK Router → Recursos → Atualização do ARK Router**.

O atualizador compara a versão instalada com o repositório oficial no GitHub, exibe as notas de lançamento e, após confirmação explícita do administrador, realiza o download, instala o pacote atualizado e preserva automaticamente suas configurações.

---

## 🗑️ Desinstalação

Para remover a suíte ARK Router mantendo suas preferências de rede e nomes amigáveis de clientes:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | sh
```

Para remover completamente, incluindo arquivos de histórico e configurações personalizadas:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | PURGE=1 sh
```

---

## 📄 Licença

Distribuído sob a licença de código aberto **MIT License**. Consulte o arquivo [`LICENSE`](LICENSE) para o texto completo.
