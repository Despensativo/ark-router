---
name: openwrt-hardware-offloading
description: Hardware flow offloading, Packet Processing Engine (PPE), and Wireless Ethernet Dispatch (WED) specialist for MediaTek Filogic and Atheros SoCs in OpenWrt.
---

# OpenWrt Hardware Offloading & Network Acceleration (ARK Router)

## Objetivo
Configurar e auditar os mecanismos de aceleração de encaminhamento de pacotes no kernel do OpenWrt, diferenciando aceleração por silício (Hardware PPE/WED) de aceleração por software (Software Flow Offloading).

---

## 1. Níveis de Aceleração no OpenWrt

1. **Encaminhamento Padrão por Kernel (Sem Offload):**
   - Cada pacote passa por todo o stack do Netfilter (`prerouting`, `forward`, `postrouting`).
   - Limite de throughput: ~300 Mbps a 450 Mbps em CPUs MIPS antigas (100% de CPU).
2. **Software Flow Offloading (`flow_offloading=1`):**
   - Cria um atalho na tabela de conexões (*flowtable*) após o handshake TCP/UDP inicial.
   - Os pacotes seguintes pulam a maior parte do Netfilter diretamente para a camada de saída.
   - Reduz o consumo de CPU pela metade.
3. **Hardware Flow Offloading (`flow_offloading_hw=1`):**
   - Transfere o encaminhamento de fluxos estabelecidos para o acelerador em silício do SoC.
   - No **MediaTek Filogic MT7981 (ex.: Cudy WR3000)**:
     - **PPE (Packet Processing Engine):** Projetado para acelerar tráfego Gigabit IPv4/IPv6 com baixa utilização de CPU, desde que o tráfego não dependa de qdiscs ou inspeções complexas. A carga real e o ganho de vazão devem ser verificados em testes com pacotes pequenos e grandes.
     - **WED (Wireless Ethernet Dispatch):** Faz a ponte direta entre os rádios Wi-Fi MT7976 e a interface ethernet, reduzindo a sobrecarga de interrupções na CPU quando o driver do fabricante e do kernel estiverem habilitados para o modelo.

---

## 2. Configuração por Família de Roteador

### MediaTek Filogic 820 (Cudy WR3000 v1 / MT7981)
Compatível com aceleração total em hardware:
```sh
uci -q batch <<EOF
set firewall.@defaults[0].flow_offloading='1'
set firewall.@defaults[0].flow_offloading_hw='1'
commit firewall
EOF
/etc/init.d/firewall reload
```

### Qualcomm Atheros (D-Link DGL-5500 / QCA9558)
O QCA9558 não possui PPE moderno. O Hardware Offload DEVE ser desligado, mantendo apenas o Software Offload:
```sh
uci -q batch <<EOF
set firewall.@defaults[0].flow_offloading='1'
set firewall.@defaults[0].flow_offloading_hw='0'
commit firewall
EOF
/etc/init.d/firewall reload
```

---

## 3. Conflitos Críticos e Regras de Decisão

> [!WARNING]
> **Incompatibilidade com SQM (Smart Queue Management):**
> O Hardware Offload ignora completamente as filas de controle de banda.
> Se o usuário ativar **SQM / CAKE** para combater Bufferbloat, o `flow_offloading_hw` DEVE ser desativado imediatamente (`flow_offloading_hw='0'`), caso contrário o SQM não conseguirá limitar os pacotes!

- **Regra de Decisão:**
  - Link de Internet > 500 Mbps sem problemas de latência → Ativar **Hardware Offload**.
  - Link de Internet com Bufferbloat ou latência instável em jogos → Desativar Hardware Offload e Ativar **SQM (CAKE)**.
