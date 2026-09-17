---
name: openwrt-imagebuilder
description: OpenWrt ImageBuilder compilation specialist. Calculates exact SquashFS sizing for 16MB SPI flash, manages package manifests, profiles, and sysupgrade integrity.
---

# OpenWrt ImageBuilder & Firmware Engineering (ARK Router)

## Objetivo
Orientar a geração, compilação e validação de imagens de firmware OpenWrt personalizadas utilizando o OpenWrt ImageBuilder (em ambiente WSL ou Linux), garantindo conformidade com o orçamento estrito de memória Flash (16 MB SPI Flash).

---

## 1. Geometria de Flash por Família de Placa

A geometria de partição varia drasticamente conforme o hardware alvo:

### A. Roteadores com Flash SPI-NOR Restrita (16 MB — ex.: Cudy WR3000 v1, D-Link DGL-5500)
- **Particionamento:**
  - `u-boot` + `env` + `factory`: ~1 MB
  - `kernel`: ~3 MB a 4 MB
  - `rootfs` (SquashFS comprimido): deve ficar entre **8 MB e 10.5 MB**
  - `rootfs_data` (`/overlay` gravável): DEVE manter **> 2.0 MB livres** no primeiro boot.
- **Tamanho Máximo do Binário Sysupgrade:**
  - O binário `*-sysupgrade.bin` NUNCA deve ultrapassar a partição de firmware do DTS (~14.5 MB; no Cudy WR3000 alvo seguro é ~12.5 MB a 13.0 MB).
- **Atenção a Revisões de Hardware:**
  - O Cudy WR3000 v1 padrão utiliza SPI-NOR padrão (`filogic / cudy_wr3000-v1`).
  - Lotes ou variantes (ex: WR3000E/WR3000H) podem utilizar chips ou tamanhos de flash distintos; sempre consulte o DTS específico do target.

### B. Roteadores com Flash NAND ou eMMC (128 MB a 1 GB+ — ex.: Acer Predator W6x, Filogic 830/880)
- **Particionamento:**
  - `kernel`: 6 MB a 10 MB.
  - `rootfs`: 30 MB a 60 MB+ em partição UBI/SquashFS.
  - `rootfs_data` (`/overlay`): dezenas a centenas de megabytes livres.
- **Limites:** O binário sysupgrade pode ter 30 MB a 40 MB+ sem risco de esgotar o chip. Módulos opcionais pesados (ZeroTier, AdGuard Home em RAM, Python) podem ser integrados diretamente na imagem.

---

## 2. Operação do ImageBuilder (Linha de Comando)

### Sintaxe Canônica
```bash
make image \
    PROFILE="cudy_wr3000-v1" \
    PACKAGES="luci luci-ssl \
              kmod-mt7981-firmware mt7981-wo-firmware \
              -dnsmasq dnsmasq-full \
              adguardhome nlbwmon \
              -ppp-mod-pppoe ppp-mod-pppoe" \
    FILES="files" \
    BIN_DIR="bin/targets/mediatek/filogic"
```

### Regras de Ouro para o Pacote de Imagem:
1. **Substituição Limpa de Pacotes:**
   - Para substituir um pacote padrão, use `-pacote-antigo +pacote-novo` (ex: `-dnsmasq dnsmasq-full` ou `-wpad-basic-mbedtls wpad-mbedtls`).
2. **Inclusão de Configurações Nativas (`FILES="files"`):**
   - Arquivos colocados em `files/` são incorporados diretamente na partição SquashFS (ROM somente leitura), consumindo zero bytes no `/overlay`!
   - Ideal para: temas pré-instalados (`files/www/...`), scripts de inicialização (`files/etc/uci-defaults/...`) e configurações base de rede.
3. **Zero-Waste no `/etc/sysupgrade.conf`:**
   - Nunca adicione caminhos em `/usr` ou `/www` no `/etc/sysupgrade.conf`. O sysupgrade deve preservar apenas configurações de `/etc/config` para manter o `/overlay` livre.

---

## 3. Validação de Integridade e Flashing

1. **Checagem de Hash SHA-256 Obrigatória:**
   - Sempre gere e confira a soma de verificação antes de qualquer upload via SCP:
     ```bash
     sha256sum openwrt-*-sysupgrade.bin
     ```
2. **Teste de Compatibilidade do Sysupgrade (`-T`):**
   - No roteador via SSH antes do flash real:
     ```sh
     sysupgrade -T /tmp/firmware.bin
     ```
   - O teste valida as assinaturas de metadata do dispositivo (`board_name`), tamanho máximo da imagem e integridade do tar/squashfs.
3. **Flashing Seguro:**
   - Preservando configurações: `sysupgrade -v /tmp/firmware.bin`
   - Limpeza de fábrica (Clean Flash): `sysupgrade -v -n /tmp/firmware.bin`
