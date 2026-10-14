---
name: openwrt-wifi-mesh
description: OpenWrt wireless roaming, 802.11k/v + RNR fast transition, WPA3/SAE FT pitfalls, mesh 802.11s, and band steering (usteer/DAWN) specialist.
---

# OpenWrt Wi-Fi Roaming, 802.11k/v/r & Mesh (ARK Router)

## Objetivo
Configurar transição rápida e roaming contínuo entre pontos de acesso (APs) e bandas (2.4 GHz, 5 GHz e 6 GHz), além de redes Mesh 802.11s e direcionamento inteligente de banda (*band steering*), com foco em estabilidade máxima em clientes Wi-Fi 6/6E/7 (Apple iOS/macOS, Android, Intel AX/BE) e compatibilidade com IoT.

---

## 🛑 0. Regra de Ouro Crítica: Proibição de `802.11r` Local em `sae` / `sae-mixed` (`T-039`)

> **ARMADILHA FATAL (`DO-NOT-REPEAT`)**:
> NUNCA combine `option encryption 'sae-mixed'` (ou `'sae'`) com `option ieee80211r '1'` e `option ft_psk_generate_local '1'`.
> - **Por que falha**: A derivação local de chaves de Fast Transition (`ft_psk_generate_local=1`) funciona exclusivamente para WPA2-PSK puro (`psk2`). No WPA3-SAE (`sae` / `sae-mixed`), o PMK é derivado por sessão via curva elíptica (Dragonfly), exigindo `FT-SAE` (`FT-OVER-SAE`) com comunicação de chaves entre APs (`r0kh`/`r1kh`) ou controlador central. Quando ativado com `ft_psk_generate_local=1`, o `hostapd` gera quadros de reautenticação inválidos e **derruba smartphones Wi-Fi 6/6E/7 na troca de banda/AP**.
> - **Pacote Obrigatório no OpenWrt**: O pacote padrão `wpad-basic-mbedtls` não implementa a pilha completa de roaming e Mesh; exija sempre **`wpad-mbedtls`** (completo). Referência canônica: `docs/WPAD_UPGRADE_AND_WIFI6_ROAMING.md`.

---

## 1. Configuração Canônica de Roaming Contínuo (802.11k + 802.11v + RNR)

### A. Redes WPA3 / WPA2-WPA3 Misto (`sae` ou `sae-mixed` — Padrão Recomendado Wi-Fi 6/6E/7)
Usa **802.11k** (Neighbor Reports), **802.11v** (BSS Transition Management) e **RNR** (Reduced Neighbor Report para descoberta rápida de 6 GHz), mantendo **`ieee80211r '0'`**:

```uci
config wifi-iface 'default_radio0'
    option device 'radio0'
    option network 'lan'
    option mode 'ap'
    option ssid 'ARK_Router'
    option encryption 'sae-mixed'
    option key 'SuaSenhaSegura123'
    option ocv '0'

    # 802.11r DESATIVADO em SAE/SAE-Mixed sem controlador R0KH/R1KH dedicado
    option ieee80211r '0'

    # 802.11k (Radio Resource Measurement) & Descoberta 6 GHz
    option ieee80211k '1'
    option rrm_neighbor_report '1'
    option rrm_beacon_report '1'
    option rnr '1'

    # 802.11v (BSS Transition Management — hostapd.sh lê bss_transition e wnm_sleep_mode; não use ieee80211v)
    option bss_transition '1'
    option wnm_sleep_mode '1'
    option time_advertisement '2'
    option time_zone 'UTC0'
```

### B. Redes Exclusivamente WPA2-PSK (`psk2+ccmp` — Quando `802.11r` Local é Desejado)
Somente quando a criptografia for **estritamente WPA2-PSK (`psk2+ccmp`)**, `ft_psk_generate_local '1'` pode ser habilitado com segurança:

```uci
    option encryption 'psk2+ccmp'
    option ieee80211r '1'
    option ft_over_ds '0'
    option ft_psk_generate_local '1'
    option mobility_domain '4f57'
```

---

## 2. Band Steering Leve com `usteer`

> **⚠️ Exceção Crítica para QSDK / Vendor BSP (ex: Acer Predator Connect T7)**: NUNCA instale ou ative `usteer` em firmwares baseados em QSDK da Qualcomm que carregam `hyfi-bridging.ko` e `hyd`, pois gera conflito direto de desconexões em loop com o daemon SON nativo.

O **`usteer`** coordena a transição entre bandas (2.4 GHz vs 5/6 GHz) sem derrubar conexões ativas:
- Estimular clientes 5/6 GHz a subirem de banda quando o RSSI for forte.
- Avaliar transição para 2.4 GHz quando o sinal em 5 GHz cair abaixo de ~`-75 dBm`.
- Desconectar clientes estagnados apenas em sinal crítico (abaixo de ~`-84 dBm`).

### Configuração UCI (`/etc/config/usteer`):
```uci
config usteer
    option network 'lan'
    option syslog '1'
    option local_mode '0'
    option ipv6 '1'
    option debug_level '2'
    option roam_kick_delay '10000'
    option roam_scan_tries '3'
    option roam_scan_SNR '-75'
    option signal_diff_threshold '8'
    option min_connect_snr '-82'
    option min_snr '-84'
    option band_steering_interval '120000'
    option band_steering_min_snr '-70'
    option kick_threshold '-78'
    option load_balancing_threshold '3'
    option band_steering_threshold '5'
    option load_kick_enabled '0'
```

---

## 3. Redes Mesh 802.11s (Backhaul Sem Fio entre Nós OpenWrt)

Requer obrigatoriamente `wpad-mbedtls` (ou `wpad-mesh-mbedtls`) instalado em todos os nós:

```uci
config wifi-iface 'mesh0'
    option device 'radio1'
    option network 'lan'
    option mode 'mesh'
    option mesh_id 'ARK_Mesh_Backhaul'
    option encryption 'sae'
    option key 'ChaveForteBackhaulMesh'
    option mesh_fwding '1'
    option mesh_rssi_threshold '-80'
```

---

## 4. Checklist de Verificação e Diagnóstico no Roteador

1. **Confirmar pacote `wpad` instalado**:
   ```sh
   opkg list-installed | grep wpad || apk info -e wpad-mbedtls
   ```
2. **Confirmar que `802.11r` não está ativo em interfaces `sae`/`sae-mixed`**:
   ```sh
   uci show wireless | grep -E "encryption|ieee80211r|bss_transition|rnr"
   ```
3. **Verificar vizinhos RRM/802.11k no `ubus`**:
   ```sh
   ubus call hostapd.wlan0 rrm_nr_list
   ```
