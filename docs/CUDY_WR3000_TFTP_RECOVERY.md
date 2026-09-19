# Cudy WR3000 v1 — Guia Oficial de Recuperação TFTP e Transição OpenWrt

Este documento descreve o procedimento operacional padrão, testado e validado, para reviver o roteador **Cudy WR3000 v1** (MediaTek Filogic 820 / MT7981BA) de qualquer estado de boot loop, travamento ou corrupção de firmware, bem como a transição correta do firmware de fábrica para o OpenWrt.

---

## 1. Kit de Recuperação no Projeto

O pacote completo e testado está preservado no repositório em:
📁 **`Firmware/cudy_recovery.zip`**
📁 **`Firmware/Cudy-WR3000-Recovery/`**

### Conteúdo do Kit:
1. **`tftpd64/tftpd64.exe`**: Servidor TFTP portátil para Windows (Ph. Jounin).
2. **`tftpd64/recovery.bin`**: Imagem oficial de fábrica da Cudy (versão 2.4.19, hash MD5 validado) exigida pelo U-Boot.
3. **`openwrt-mediatek-filogic-cudy_wr3000-v1-sysupgrade.zip`**: Firmware OpenWrt intermediário **assinado pela Cudy** (`.bin`), necessário para que o painel web de fábrica aceite a instalação do OpenWrt sem dar o erro *"O arquivo está inválido"*.

---

## 2. Procedimento de Recuperação Forçada via TFTP (Unbrick)

Quando o roteador estiver em loop de boot (LED piscando continuamente e sem resposta de rede):

### Passo 1: Configurar a Placa de Rede do PC
1. Conecte o cabo de rede entre o PC e a porta **LAN 1 ou LAN 2** do Cudy WR3000 (portas pretas, nunca na porta azul WAN).
2. No Windows, abra as propriedades do adaptador de rede IPv4:
   * **Endereço IP estático:** `192.168.1.88`
   * **Máscara de sub-rede:** `255.255.255.0`
   * **Gateway padrão:** deixe em branco (ou `192.168.1.112`)
3. Garanta que o Firewall do Windows não bloqueie conexões de entrada do TFTP.

### Passo 2: Preparar o Servidor TFTP
1. Abra o executável `tftpd64.exe` localizado na pasta:
   `Firmware/Cudy-WR3000-Recovery/cudy_recovery/tftpd64/tftpd64.exe`
2. Verifique se o arquivo `recovery.bin` está na mesma pasta.
3. No campo **Current Directory**, aponte para essa pasta.
4. No campo **Server interfaces**, selecione a interface com o IP `192.168.1.88`.

### Passo 3: Acionamento no Roteador Cudy
1. **Desconecte o plugue de energia** do roteador.
2. Com um clipe ou palito, **mantenha o botão RESET pressionado** na parte traseira.
3. Com o RESET **ainda pressionado**, **reconecte o plugue de energia**.
4. Continue segurando o RESET por **6 a 8 segundos**:
   * O bootloader do Cudy buscará o arquivo `recovery.bin` no IP `192.168.1.88`.
   * Na janela do `tftpd64`, surgirá o IP `192.168.1.112` e a barra de progresso da transferência.
5. Assim que a barra de transferência iniciar, **solte o botão RESET**.
6. A transferência levará de 10 a 20 segundos.
7. **NÃO desligue da tomada**: o roteador gravará a memória Flash SPI e reiniciará sozinho em aproximadamente 2 a 3 minutos.
8. Ao terminar, o LED estabilizará e o roteador voltará a funcionar no firmware original da Cudy.

---

## 3. Como Migrar do Firmware de Fábrica para o OpenWrt

O firmware de fábrica da Cudy bloqueia arquivos genéricos do OpenWrt com a mensagem *"O arquivo está inválido"*. Para instalar o OpenWrt corretamente:

### Passo 1: Acessar a Interface Web da Cudy
1. Volte a placa de rede do PC para **Obter IP automaticamente (DHCP)**.
2. O Cudy entregará um IP na faixa `192.168.10.x`.
3. Abra o navegador em: **`http://192.168.10.1`** (ou `http://cudy.net`).
4. Conclua o assistente inicial definindo a senha de administração.

### Passo 2: Enviar o Firmware Intermediário Assinado
1. Extraia o arquivo `openwrt-mediatek-filogic-cudy_wr3000-v1-sysupgrade.zip` do nosso kit.
2. No painel da Cudy, acesse: **Advanced Settings > System > Firmware**.
3. Selecione o arquivo extraído:
   📁 **`openwrt-mediatek-filogic-cudy_wr3000-v1-sysupgrade.bin`**
4. Clique em **Update / Upgrade**.
5. Como este arquivo possui a assinatura digital aceita pela Cudy, a atualização será aceita com sucesso!
6. O roteador reiniciará e subirá direto no **OpenWrt com LuCI** no endereço padrão:
   👉 **`http://192.168.1.1`**

---

## 4. Como Instalar o ARK Router v1.5.1 com Segurança Total

Com o OpenWrt limpo em execução em `192.168.1.1`:

1. **Método Recomendado (Pacote APK sem mexer na Flash)**:
   * Acesse o LuCI em `http://192.168.1.1` ➔ **System > Software**.
   * Faça upload do pacote:
     📦 `dist/sdk/luci-app-ark-router-1.5.1-r1.apk`
   * O ARK Router, temas e telemetria são ativados em segundos, sem risco de corrupção de kernel.

2. **Método Sysupgrade Nativo**:
   * O script canônico `scripts/build_cudy_firmware.py` agora possui o **Portão de Invariantes de Boot** (`audit_bootability_invariants`), que verifica `/bin/busybox`, `/sbin/init` e `/sbin/procd` antes de gerar a ROM, garantindo que qualquer imagem gerada seja 100% bootável.
