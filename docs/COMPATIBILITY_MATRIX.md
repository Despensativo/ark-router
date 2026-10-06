# Matriz de Compatibilidade Oficial — OpenWrt, Firewall e Pacotes

> **Fonte Canônica de Verdade Arquitetural do ARK Router**
> Última Auditoria: 2026-10-04 | Status: Oficial

Esta matriz documenta com rigor técnico e embasamento nas fontes oficiais do projeto OpenWrt as fronteiras entre motores de firewall e gerenciadores de pacotes.

---

## 1. Princípio Fundamental de Arquitetura

O código do ARK Router **NUNCA** infere capacidades do sistema baseando-se em números de versão arbitrários em tempo de execução. O sistema utiliza detecção dinâmica pura por inspeção de ambiente em `/usr/lib/ark/common.sh`:

1. **Firewall**: Detecção estrita via `ark_firewall_engine()`, `is_fw4()` e `is_fw3()`.
2. **Gerenciador de Pacotes**: Detecção estrita via `command -v apk` / `command -v opkg`.

---

## 2. Matriz Oficial de Gerações do OpenWrt

| Geração OpenWrt | Faixa de Versões | Firewall Padrão | Pacotes Padrão | Arquitetura de Rede | Suporte ARK Router |
|---|---|---|---|---|---|
| **Legado (fw3)** | 19.07 a 21.02 | `firewall3` (`iptables`) | `opkg` | `swconfig` / bridge legada | Suporte retrocompatível (perfis compactos 16MB/128MB) |
| **Moderno Inicial** | 22.03 a 23.05 | `firewall4` (`nftables`) | `opkg` | DSA (`Distributed Switch Architecture`) | Suporte pleno (fw4 nativo puro) |
| **Moderno Estável** | 24.10 | `firewall4` (`nftables`) | `opkg` | DSA nativo | Suporte pleno (plataforma alvo VirtualBox e hardware) |
| **Próxima Geração** | 25.12+ / Snapshots | `firewall4` (`nftables`) | `apk` | DSA nativo | Suporte pleno (pacotes `.apk` gerados nativamente) |

---

## 3. Embasamento Técnico e Fontes Oficiais

### A. Firewall: Transição de `fw3` (iptables) para `fw4` (nftables)
- **Marco Oficial**: O `firewall4` tornou-se a implementação de firewall padrão a partir do **OpenWrt 22.03.0** ([OpenWrt 22.03.0 Release Notes](https://openwrt.org/releases/22.03/notes-22.03.0)).
- **Substituição de Binários**: No OpenWrt 22.03+, o pacote `iptables` legado foi removido das imagens padrão, sendo mantidos apenas wrappers de compatibilidade (`iptables-nft`, `ip6tables-nft`).
- **Regra de Ouro ARK**: Invocar comandos `iptables` em sistemas com `fw4` força o kernel a instanciar tabelas legadas do Netfilter, gerando o alerta indesejado no LuCI (*"Legacy rules detected"*). Por isso, no OpenWrt 22.03+, o ARK Router opera **100% puro em nftables e UCI firewall**.

### B. Gerenciador de Pacotes: Transição de `opkg` para `apk`
- **Marco Oficial**: O projeto OpenWrt adotou oficialmente o **`apk` (Alpine Package Keeper)** substituindo o `opkg` a partir do **OpenWrt 25.12** ([OpenWrt Package Management](https://openwrt.org/docs/guide-user/additional-software/managing_packages)).
- **Razão da Transição**: O fork do `opkg` utilizado pelo OpenWrt foi descontinuado pelo upstream. O `apk` oferece resolução moderna de dependências e menor consumo de metadados.
- **Sistemas 24.10 e Anteriores**: Continuam utilizando `opkg` como padrão oficial estável.

---

## 4. Matriz de Validação em Hardware e Laboratório

| Alvo / Dispositivo | Versão do Sistema | Firewall Detectado | Gerenciador Detectado | Validação ARK Doctor | Status |
|---|---|---|---|---|---|
| **VM OpenWrt-ARK-Dev** | OpenWrt 24.10 (x86_64) | `fw4` (`nftables`) | `opkg` | 100% Saudável | Validado em Laboratório |
| **Cudy WR3000 v1** | OpenWrt 25.x / Snapshot (ARM64 MT7981) | `fw4` (`nftables`) | `apk` | 100% Saudável | Validado em Hardware Real |
| **Acer Predator W6x** | OpenWrt MT7986 (ARM64) | `fw4` (`nftables`) | `apk` | 100% Saudável | Validado em Hardware Real |
| **Acer Predator T7** | OpenWrt IPQ5332 (ARM64) | `fw4` (`nftables`) | `opkg` | 100% Saudável | Validado em Hardware Real |
| **D-Link DGL-5500** | OpenWrt 19.07/21.02 (MIPS 16MB Flash) | `fw3` (`iptables`) | `opkg` | 100% Saudável | Validado em Hardware Real |
