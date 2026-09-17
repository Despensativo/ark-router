---
name: openwrt-storage-failsafe
description: OpenWrt Flash partition geometry, MTD, overlayfs recovery, Failsafe mode (Telnet), and U-Boot TFTP rescue specialist.
---

# OpenWrt Storage, MTD & Failsafe Recovery (ARK Router)

## Objetivo
Dominar o mapa de partições MTD da memória Flash SPI, proteger blocos críticos de calibração de rádio (ART/EEPROM) e executar recuperação de emergência sem abrir o gabinete do roteador (sem adaptador serial TTL).

---

## 1. Mapa de Partições MTD (`/proc/mtd`)

> [!CAUTION]
> **PROIBIÇÃO DE COMANDOS GENÉRICOS DE MTD OU FLASH:**
> É terminantemente PROIBIDO executar ou sugerir comandos de escrita em partição (`mtd write`, `dd`, `flash_erase`) ou procedimentos genéricos de botão de reset/TFTP sem antes verificar:
> 1. O modelo exato da placa: `cat /tmp/sysinfo/model` ou `cat /proc/cpuinfo`.
> 2. A tabela real de partições do dispositivo ativo: `cat /proc/mtd`.
> O número das partições MTD (`mtd0`, `mtd2`, etc.) varia entre modelos e targets (ex.: Filogic vs Atheros vs Mediatek MT7621), e gravar no offset errado causará brick permanente no roteador.

Em roteadores de referência com 16 MB SPI Flash (como exemplo ilustrativo), a tabela típica pode se dividir em:
```
dev:    size   erasesize  name
mtd0: 00040000 00010000 "u-boot"          (Bootloader - NUNCA SOBRESCREVER)
mtd1: 00010000 00010000 "u-boot-env"      (Variáveis de ambiente do boot)
mtd2: 00040000 00010000 "factory"         (DADOS DE CALIBRAÇÃO ART / MAC ADDRESS)
mtd3: 00f00000 00010000 "firmware"        (Kernel + SquashFS + Overlay)
mtd4: 00ac0000 00010000 "rootfs"          (SquashFS somente leitura)
mtd5: 00400000 00010000 "rootfs_data"     (Partição JFFS2 / Overlay gravável)
```

> [!CAUTION]
> **A Partição Sagrada (`factory` / ART):**
> A partição `factory` contém as tabelas de ganho de antena, potências de transmissão de RF e endereços MAC gravados na fábrica.
> **SEMPRE faça backup antes de mexer no MTD:**
> ```sh
> dd if=/dev/mtd2 of=/tmp/factory_backup.bin
> ```

---

## 2. Modo Failsafe (Acesso de Emergência sem SSH)

Se um script quebrar a rede ou a senha de root for perdida:

### Como Entrar no Modo Failsafe:
1. Desligue o roteador da tomada.
2. Ligue e observe o LED de Status/Power.
3. Quando o LED começar a piscar rapidamente (2 a 3 segundos após ligar), pressione o botão **RESET** ou **WPS** 3 vezes seguidas.
4. O LED começará a piscar em ritmo ultra-rápido (indicando modo Failsafe ativo).

### Como Conectar:
- Conecte o cabo Ethernet no PC e configure o IP estático:
  - **IP:** `192.168.1.2`
  - **Máscara:** `255.255.255.0`
  - **Gateway:** `192.168.1.1`
- Abra o terminal e conecte via **Telnet**:
  ```sh
  telnet 192.168.1.1
  ```
  *(O modo Failsafe não exige senha e não roda SSH).*

### Comandos de Recuperação no Failsafe:
- **Montar a partição gravável para consertar arquivos:**
  ```sh
  mount_root
  ```
- **Redefinir senha de root:**
  ```sh
  passwd
  ```
- **Reset de Fábrica Completo (Limpa o Overlay):**
  ```sh
  firstboot -y && reboot
  ```

---

## 3. Recuperação Via U-Boot TFTP (Unbrick)

Se a imagem estiver corrompida e o roteador não inicializar:
1. Mantenha o botão **RESET** pressionado enquanto liga a fonte de energia por **5 a 7 segundos**.
2. O U-Boot entrará no modo cliente/servidor TFTP.
3. Configure o PC para o IP de recuperação padrão do fabricante (no Cudy WR3000: `192.168.1.254` ou `192.168.1.2`).
4. Sirva a imagem limpa `openwrt-*-sysupgrade.bin` via servidor TFTP (ex: Tftpd64 no Windows).
5. O bootloader puxará a imagem automaticamente e regravará o Flash SPI.
