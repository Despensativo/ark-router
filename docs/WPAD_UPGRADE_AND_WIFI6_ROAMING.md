# ARK Router — Engenharia Wi-Fi 6/6E: WPA3, Roaming 802.11k/v/r e Upgrade de WPAD

## 1. Contexto e Diagnóstico Real em Campo
Em auditoria realizada no roteador mestre da frota (**Acer Predator Connect W6x**, IP `10.203.73.5` / `192.168.73.1`, SoC MediaTek Filogic 830 MT7986AV, 1 GB RAM, OpenWrt 25.12.5), foi investigado o motivo de um dispositivo móvel com suporte a Wi-Fi 6E ser rejeitado pelo rádio de 5 GHz (`phy1-ap0`), mesmo digitando a senha correta.

### Causa Raiz Identificada (A Armadilha do FT-SAE)
O rádio de 5 GHz estava configurado com:
- `encryption='sae-mixed'` (WPA2/WPA3 Transição)
- `ieee80211r='1'` (Fast BSS Transition)
- `ft_psk_generate_local='1'`

**Mecanismo da Falha**:
1. No padrão IEEE 802.11r, a opção `ft_psk_generate_local=1` do `hostapd` gera chaves de mobilidade locais exclusivamente para **FT-PSK** (redes legadas WPA2 baseadas em chave pré-compartilhada).
2. Quando um cliente moderno Wi-Fi 6, 6E ou 7 conecta a um SSID `sae` ou `sae-mixed`, ele tenta negociar **FT-SAE** (Fast Transition com Simultaneous Authentication of Equals / WPA3).
3. O `hostapd` do OpenWrt não possui infraestrutura local de derivação de chaves PMK-R0/PMK-R1 para FT-SAE sem um servidor de chaves R0KH/R1KH externo.
4. Como consequência, o handshake criptográfico falha imediatamente e o daemon emite a desconexão forçada no kernel:
   ```
   daemon.notice hostapd: phy1-ap0: STA 8a:a0:6c:42:95:a7 IEEE 802.11: deauthenticated due to local deauth request
   ```
5. O usuário recebe no celular a mensagem enganosa de "Senha incorreta" ou "Falha ao conectar à rede", mesmo que a senha esteja 100% correta.

---

## 2. A Solução Moderna e Segura para Wi-Fi 6/6E/7
Ao contrário de redes legadas de escritório onde o 802.11r era necessário para evitar atrasos no handshake WPA2 Enterprise (RADIUS), em ambientes residenciais ou Mesh modernos:
- **802.11r é dispensável** em nós individuais e desaconselhado em WPA3 pessoal.
- O roaming suave e a troca de frequências (Band Steering) são governados pela tríade:
  1. **802.11k (Radio Resource Management - RRM)**: O roteador fornece uma tabela de vizinhos conhecidos (*Neighbor Reports* / `rrm_neighbor_report=1` e `rnr=1`). O cliente não precisa varrer todos os 40 canais do espectro, economizando bateria.
  2. **802.11v (Wireless Network Management - WNM)**: O roteador envia quadros BTM (*BSS Transition Management Request* / `bss_transition=1`). O celular recebe a recomendação de migrar para o rádio de 5 GHz com parâmetros específicos e realiza a transição suavemente em menos de 30 milissegundos.
  3. **RNR (Reduced Neighbor Report)**: No Wi-Fi 6 e 6E/7, a frequência de 2.4 GHz avisa nos beacons a existência e os parâmetros dos canais de 5 GHz e 6 GHz, acelerando a detecção imediata.

---

## 3. A Limitação do Pacote `wpad-basic` vs `wpad-mbedtls`
O OpenWrt empacota diferentes variações do daemon `hostapd` / `wpa_supplicant`:

| Pacote | Tamanho Flash | Suporte WPA3 (SAE) | Suporte 802.11k (RRM) | Suporte 802.11v (WNM / BTM) | Adequado Para |
|---|---|---|---|---|---|
| `wpad-basic-mbedtls` | ~580 KB | Sim | Sim | **Não** (`CONFIG_WNM` desligado) | Roteadores compactos (16MB Flash, 128MB RAM) |
| `wpad-mbedtls` | ~820 KB | Sim | Sim | **Sim** (`CONFIG_WNM=y` nativo) | Roteadores médios/altos (>= 256MB RAM) |
| `wpad-openssl` | ~1.400 KB | Sim | Sim | **Sim** (`CONFIG_WNM=y` nativo) | Roteadores com crypto engine avançado |

Quando `bss_transition='1'` é configurado no `/etc/config/wireless` em um roteador com `wpad-basic-mbedtls`, o `hostapd` rejeita a configuração:
```
Line 85: unknown configuration item 'bss_transition'
1 errors found in configuration file '/var/run/hostapd-phy1.conf'
```

---

## 4. Metodologia de Upgrade Atômico Validada em Produção
No roteador Acer W6x (OpenWrt 25.12.5 com gerenciador de pacotes `apk 3.0.x`), o pacote `wpad-basic-mbedtls` foi substituído com sucesso por `wpad-mbedtls`.

### Descoberta Operacional do `apk` (OpenWrt 25.x+)
No `apk`, ambos os pacotes fornecem o mesmo provedor virtual (`wpad`). Se `wpad-basic-mbedtls` estiver registrado em `/etc/apk/world`, o comando `apk add wpad-mbedtls` falha com conflito de pacotes.

**Procedimento Canônico Validado**:
```sh
# 1. Remover a restrição do wpad-basic do catálogo world
sed -i -E '/^wpad-basic/d' /etc/apk/world

# 2. Instalar o pacote completo wpad-mbedtls
apk add wpad-mbedtls

# 3. Reiniciar o serviço wpad com proteção procd/ujail
/etc/init.d/wpad restart

# 4. Sincronizar as opções bss_transition e wnm_sleep_mode no wireless
uci -q set wireless.default_radio0.bss_transition='1'
uci -q set wireless.default_radio0.wnm_sleep_mode='1'
uci -q set wireless.default_radio1.bss_transition='1'
uci -q set wireless.default_radio1.wnm_sleep_mode='1'
uci commit wireless
wifi reload
```

### Evidências da Validação no Dispositivo Real
- **Status Hostapd (`ubus call hostapd.phy1-ap0 get_status`)**:
  ```json
  {
    "status": "ENABLED",
    "wnm": {
      "bss_transition_query_rx": 0,
      "bss_transition_request_tx": 0,
      "bss_transition_response_rx": 0
    },
    "rrm": { "neighbor_report_tx": 0 },
    "dfs": { "cac_seconds": 60, "cac_active": false }
  }
  ```
- **Clientes Móveis com Roaming BTM Ativo (`ubus call usteer connected_clients`)**:
  ```json
  "beacon-measurement-modes": ["PASSIVE", "ACTIVE", "TABLE"],
  "link-measurement": true,
  "bss-transition-management": true
  ```
- **Impacto em Recursos**:
  - Memória RAM livre: 715 MB de 986 MB (consumo adicional imperceptível, ~5 MB).
  - Espaço Flash `/overlay`: 10.3 MB livres.
  - Zero instabilidades, zero quedas, reconexão imediata de todos os dispositivos.

---

## 5. Especificação do Novo Recurso ARK: "Smart Wi-Fi Package Enhancer"

### Objetivo
Detectar automaticamente se o roteador possui hardware qualificado e oferecer ou aplicar a promoção de `wpad-basic` para `wpad-mbedtls`, habilitando 802.11v BSS Transition nativo sem risco de quebra ou falta de espaço.

### Regras de Elegibilidade (Guardrails)
1. **Memória RAM**: `>= 256 MB` total (recomendado `>= 512 MB`). Roteadores com 128 MB permanecem em `wpad-basic`.
2. **Armazenamento Flash Gravável (`/overlay`)**: Espaço livre `>= 5.120 KB` (5 MB).
3. **Conectividade WAN Ativa**: Teste de conectividade HTTP/DNS antes de iniciar o download.
4. **Reserva Anti-Lockout**: O daemon `wpad` existente só é recarregado após a validação do novo binário `/usr/sbin/hostapd`. Se a instalação falhar, o sistema mantém o `wpad-basic` intacto.

### Integração no Ark Doctor
- Nova verificação em `root/usr/lib/ark/modules/doctor.sh`:
  - **Identificador**: `12d. Suporte Avançado de Roaming (wpad-mbedtls vs wpad-basic)`
  - Se `wpad-basic` for detectado em hardware qualificado:
    - Modo Auditoria: Emite alerta informativo `WARN` explicando que o hardware suporta upgrade para roaming BTM completo.
    - Modo Autocura (`--fix`): Executa a migração automática segura e ativa `bss_transition` nas interfaces unificadas.
