# ARK Router — Runbook de Firmware & ImageBuilder

Manual de compilação, verificação de integridade e atualização de ROMs SquashFS para o ARK Router.

---

## 1. Imagens de ROM Pré-Compiladas

| Dispositivo | Arquivo | SHA-256 | Tamanho |
| :--- | :--- | :--- | :--- |
| **Cudy WR3000 v1** (MediaTek MT7981) | `Firmware/openwrt-25.12.5-cudy-wr3000-v1-ark-router-squashfs-sysupgrade.bin` | `01b2381cba129983049326be06c15285fe3110d128cfafc70abe2173438df957` | 12.58 MB |
| **Acer Predator W6x** (MT7986) | `Firmware/openwrt-25.12.5-acer-predator-w6x-stock-ark-router-squashfs-sysupgrade.bin` | Ver `Firmware/sha256sums` | 33.5 MB |

---

## 2. Atualização Segura via Sysupgrade

O comando padrão `sysupgrade` preserva `/etc/sysupgrade.tgz`:
- IP da LAN e configurações de rede (`/etc/config/network`).
- Redes Wi-Fi (`/etc/config/wireless`).
- Senha administrativa de root (`/etc/shadow`).
- Chaves SSH do Dropbear (`/etc/dropbear/`).

### Procedimento de Instalação:
```sh
# 1. Enviar para a RAM temporária do roteador
scp firmware.bin root@192.168.1.1:/tmp/

# 2. Validar hash SHA-256 no roteador
sha256sum /tmp/firmware.bin

# 3. Executar o sysupgrade preservando configurações
sysupgrade /tmp/firmware.bin
```

---

## 3. Diretriz de Overlay Zero-Waste
Ao compilar o ARK Router nativamente no SquashFS via ImageBuilder:
- Mantenha o arquivo `/etc/sysupgrade.conf` livre de caminhos sob `/usr` ou `/www`.
- Como o código do ARK Router fica embutido na partição somente-leitura `/rom`, nenhuma alteração grava arquivos no `/overlay`, deixando **> 2.8 MB livres** para configurações dinâmicas do usuário.

Para instruções completas e scripts Python automatizados de flash, consulte:
`GUIA-INSTALACAO-ROM-CUDY-WR3000-OUTRA-IA.md`.
