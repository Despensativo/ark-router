---
name: openwrt-network-firewall
description: Specialist in OpenWrt networking, routing, DSA switch, wireless, and dual-generation firewall (fw3/iptables vs fw4/nftables). Enforces anti-lockout safety, BusyBox ash compatibility, and zero-waste flash/RAM operations.
---

# OpenWrt Network & Firewall Specialist (ARK Router)

## Visão Geral e Arquitetura Dual
Esta skill orienta o assistente no desenvolvimento, auditoria e configuração de redes e firewall para o ecossistema ARK Router (OpenWrt).
O ambiente suporta duas gerações com motores e características distintas:

- **Geração Antiga (OpenWrt 19.07 - 22.03)**:
  - Hardware de referência: D-Link DGL-5500 (Atheros QCA9558, 128 MB RAM, 16 MB Flash).
  - Firewall: `firewall3` (`fw3`) baseado em `iptables`.
  - Switch: `swconfig` legado (`switch0`, `eth0.1`).
  - Regras customizadas: `/etc/firewall.user`.
- **Geração Nova (OpenWrt 23.05 - 25.x / master)**:
  - Hardware de referência: Cudy WR3000 v1 (MediaTek MT7981 Filogic 820, 256 MB RAM, 16 MB Flash).
  - Firewall: `firewall4` (`fw4`) baseado em `nftables`.
  - Switch: **DSA** (*Distributed Switch Architecture*, `br-lan`, `br-lan.1`, `ports lan1 lan2 lan3`).
  - Regras customizadas: scripts em `/etc/nftables.d/`.

---

## 1. Regras do Motor de Firewall (fw3 vs fw4)

### Detecção Dinâmica Obrigatória
Sempre detecte o motor ativo no roteador antes de sugerir comandos de depuração de firewall:
```sh
if command -v nft >/dev/null 2>&1 && nft list tables 2>/dev/null | grep -q 'inet fw4'; then
    FW_ENGINE="fw4"
else
    FW_ENGINE="fw3"
fi
```

### Sintaxe e Comandos de Inspeção
- **No fw4 (nftables):**
  - Listar regras ativas: `nft list ruleset` ou `nft list chain inet fw4 srcnat_wan`.
  - Validar sintaxe sem aplicar: `nft -c -f /arquivo/teste.nft`.
  - Tabelas nativas: tabela `inet fw4` com chains `input`, `output`, `forward`, `dstnat`, `srcnat`.
- **No fw3 (iptables):**
  - Listar regras ativas: `iptables -vnL` e `iptables -t nat -vnL`.
  - Validar sintaxe: `iptables-save -t filter`.

### Configuração Declarativa via UCI (`/etc/config/firewall`)
Ambas as gerações consomem o UCI. Priorize SEMPRE o UCI em vez de comandos manuais no terminal:
- **Redirecionamento de Portas (Port Forwarding / DNAT):**
  ```sh
  uci -q batch <<EOF
  add firewall redirect
  set firewall.@redirect[-1].name='Web-Server-Forward'
  set firewall.@redirect[-1].src='wan'
  set firewall.@redirect[-1].src_dport='8080'
  set firewall.@redirect[-1].dest='lan'
  set firewall.@redirect[-1].dest_ip='192.168.1.50'
  set firewall.@redirect[-1].dest_port='80'
  set firewall.@redirect[-1].proto='tcp'
  set firewall.@redirect[-1].target='DNAT'
  EOF
  ```
- **Regras de Tráfego (Filtro / Drop / Accept):**
  ```sh
  uci -q batch <<EOF
  add firewall rule
  set firewall.@rule[-1].name='Block-IoT-WAN'
  set firewall.@rule[-1].src='lan'
  set firewall.@rule[-1].src_mac='AA:BB:CC:DD:EE:FF'
  set firewall.@rule[-1].dest='wan'
  set firewall.@rule[-1].target='REJECT'
  EOF
  ```

---

## 2. Configuração de Rede e DSA Switch (`/etc/config/network`)

### Padrão DSA Moderno (Cudy WR3000 / Filogic)
Em kernels modernos (OpenWrt 21+), as interfaces de rede são portas individuais expostas pelo driver DSA:
- A ponte LAN é declarada como dispositivo do tipo `bridge`:
  ```uci
  config device
      option name 'br-lan'
      option type 'bridge'
      list ports 'lan1'
      list ports 'lan2'
      list ports 'lan3'

  config interface 'lan'
      option device 'br-lan'
      option proto 'static'
      option ipaddr '192.168.1.1'
      option netmask '255.255.255.0'
  ```
- **VLAN Filtering no DSA:** Para separar redes (ex: IoT ou Guest), utilize `bridge-vlan`:
  ```uci
  config bridge-vlan
      option device 'br-lan'
      option vlan '10'
      list ports 'lan1:u*'
      list ports 'lan2:t'
  ```

---

## 3. Wireless e Rádio (`/etc/config/wireless`)

### Recomendações e Exemplos de Configuração Wi-Fi
Os parâmetros de rádio dependem do ambiente, da regulamentação local e das capacidades do hardware. Utilize estas diretrizes como referência adaptável:
1. **Exemplos de Estabilidade para Clientes Legados e IoT (2.4 GHz):**
   - Caso dispositivos simples apresentem desconexões frequentes por oscilação de sinal, avaliar o ajuste `disassoc_low_ack='0'`.
   - `dtim_period`: valores entre `1` e `3` equilibram economia de bateria e latência de entrega de multicast.
2. **Largura de Canal e Canais Operacionais:**
   - 2.4 GHz: `HT20` oferece maior resistência a interferência em ambientes densos; `HT40` permite maior vazão em ambientes limpos. Priorizar canais sem sobreposição (ex.: 1, 6 ou 11) de acordo com o espectro local.
   - 5 GHz: `VHT80` ou `HE80`/`HE160` dependem do chip Wi-Fi (ex.: MT7981). Canais DFS (52 a 144) exigem conformidade com NOP (Network Operations Protocol / Radar Detection) e podem atrasar a subida da interface.

---

## 4. Diagnóstico Avançado com `ubus` (Evite Parsing de Texto)
Prefira sempre consultas estruturadas via `ubus` em vez de `ifconfig` ou `grep`:
- **Status de Interfaces:** `ubus call network.interface dump`
- **Status da WAN:** `ubus call network.interface.wan status`
- **Dispositivos Físicos:** `ubus call network.device status '{"name":"br-lan"}'`
- **Clientes Wi-Fi Conectados:** `ubus call hostapd.ra0 get_clients` (ou nome do rádio correspondente)
- **Qualidade de Rádio:** `iwinfo ra0 info`

---

## 5. Protocolo Anti-Lockout (Regras Invioláveis)

1. **Preservação de Portas de Gerência:**
   - NUNCA altere a política da zona `lan` para `DROP` ou `REJECT` sem regras prévias explícitas liberando as portas `22` (SSH), `80` (HTTP) e `443` (HTTPS).
2. **Aviso de Desconexão ao Mudar IP:**
   - Ao alterar `network.lan.ipaddr`, SEMPRE avise o usuário explicitamente que a sessão SSH/LuCI atual será desconectada e qual será o novo IP de acesso.
3. **Escrita em Lote no UCI (Proteção da Flash):**
   - Agrupe comandos e utilize `uci commit` apenas uma vez no final da operação. Evite commits repetidos em loops para poupar os blocos da Flash SPI (16 MB).
4. **Reinicialização Segura:**
   - Prefira `/etc/init.d/firewall reload` em vez de `restart`.
   - Utilize `/etc/init.d/network reload` em vez de comandos destrutivos como `ifdown -a`.
