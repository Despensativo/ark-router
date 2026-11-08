# Memória Durável do Projeto — ARK Router

> Documento de referência contínua para agentes de IA operando no repositório canônico `GitHub/luci-app-ark-router/`.

---

## 1. Arquitetura e Espectro de Hardware
- **Ecossistema**: Pacote LuCI (`luci-app-ark-router`), tema visual Ark, daemons de telemetria POSIX ash e scripts de controle de rede/hardware no OpenWrt.
- **Versão Ativa**: `2.2.2`.
- **Espectro de Hardware**:
  - **Flagship / Alta Performance**:
    - **Acer Predator Connect W6x** (AX6000, MediaTek Filogic 830 / MT7986 Quad-Core A53, 1GB RAM, 2.5GbE).
    - **Acer Predator Connect T7** (BE11000, Multi-Gigabit, MLO, Filogic de ponta).
  - **Intermediário / Popular**:
    - **Cudy WR3000 v1** (AX3000, MediaTek Filogic 820 / MT7981B Dual-Core A53, 256MB RAM, 128MB SPI-NAND).
  - **Compacto / Legado**:
    - Roteadores com **128 MB RAM e 16 MB Flash** (ex: D-Link DGL-5500, Archer C7). Requer dimensionamento dinâmico de conntrack (16k vs 131k) e suspensão de persistência flash em overlay apertado.

---

## 2. Isolamento Estrito de Firewall (`fw4` vs `fw3`)
- **OpenWrt Moderno (`fw4` / nftables — 22.03 a 25.x+)**:
  - Operação 100% pura em nftables e regras UCI (`/etc/config/firewall`).
  - **PROIBIDO** invocar comandos legados `iptables`/`ip6tables` ou usar `command -v iptables` (que instancia tabelas legadas indesejadas no kernel moderno).
- **OpenWrt Legado (`fw3` / iptables — 19.07 a 21.02)**:
  - Preservar compatibilidade total com `iptables` em hardware compacto.
  - Toda manipulação de firewall deve ramificar explicitamente com `ark_firewall_engine`, `is_fw4` e `is_fw3`.

---

## 3. Protocolo Anti-Amnésia & Arquivos Críticos Monolíticos
Arquivos com densidade extrema não devem ser lidos na íntegra de uma só vez:
- `overview.js` (~23.7k linhas bundle)
- `po/en/ark.po` & `po/es/ark.po` (~4.4k chaves)
- `cascade.css` (~3.8k linhas)
- `ark-theme.js` (~3.6k linhas)
- `src/modules/render.js` (~3.3k linhas) & `src/modules/system.js` (~3.3k linhas)
- `root/usr/lib/ark/modules/network.sh` (~1.9k linhas) & `network_ipv6_mwan.sh` (~1.8k linhas)
- `root/usr/lib/ark/modules/system.sh` (~1.6k linhas) & `system_hardware_leds.sh` (~1.9k linhas)

**Regra Operacional**: Consultar sempre `docs/CODE_MAP.md` e inspecionar intervalos cirúrgicos (máximo 100 linhas ao redor do alvo).

---

## 4. Ambiente Dual-OS e Regras de Armazenamento
- O repositório canônico está montado em partição ExFAT compartilhada:
  - **Proibido** criar sockets Unix (`.sock`) ou FIFOs diretamente no HD externo.
  - Usar `/tmp/` no macOS/Linux local para arquivos de socket e testes virtuais.
- **SFTP Obrigatório**: Garantir sempre `openssh-sftp-server` instalado no ambiente de desenvolvimento/teste para inspeção remota sem travas.
- **Roteadores Físicos**: Nunca instalar ou flashear automaticamente; apenas com solicitação explícita do usuário.
