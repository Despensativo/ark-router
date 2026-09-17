#!/bin/sh
# ==============================================================================
# ARK Router — Script de Provisionamento de Mocks no Ambiente Virtual OpenWrt
# Executa dentro da VM OpenWrt para simular Dual-WAN, Wi-Fi 7 (MLO) e SQM.
# ==============================================================================

set -e

echo "=== [1/4] Configurando Mock de Dual-WAN (WAN2 em eth1) ==="
uci set network.wan2=interface
uci set network.wan2.device='eth1'
uci set network.wan2.proto='static'
uci set network.wan2.ipaddr='192.168.200.2'
uci set network.wan2.netmask='255.255.255.0'
uci set network.wan2.gateway='192.168.200.1'
uci set network.wan2.dns='1.1.1.1 8.8.8.8'

# Adiciona wan2 a zona wan do firewall
if uci get firewall.@zone[1] >/dev/null 2>&1; then
    WAN_NETS=$(uci get firewall.@zone[1].network 2>/dev/null || echo "wan")
    case " $WAN_NETS " in
        *" wan2 "*) ;;
        *) uci add_list firewall.@zone[1].network='wan2' ;;
    esac
fi
uci commit network
uci commit firewall

echo "=== [2/4] Configurando Mocks de Wi-Fi 7 e MLO (/etc/config/wireless) ==="
mkdir -p /etc/config
touch /etc/config/wireless

# Radio 2.4 GHz (802.11ax/be HE40)
uci set wireless.radio0=wifi-device
uci set wireless.radio0.type='mac80211'
uci set wireless.radio0.path='virtual/radio0'
uci set wireless.radio0.channel='6'
uci set wireless.radio0.band='2g'
uci set wireless.radio0.htmode='HE40'
uci set wireless.radio0.country='BR'
uci set wireless.radio0.disabled='0'

uci set wireless.default_radio0=wifi-iface
uci set wireless.default_radio0.device='radio0'
uci set wireless.default_radio0.network='lan'
uci set wireless.default_radio0.mode='ap'
uci set wireless.default_radio0.ssid='ARK_Mesh_2.4G'
uci set wireless.default_radio0.encryption='sae'
uci set wireless.default_radio0.key='ArkRouter2026!'

# Radio 5 GHz (802.11ax/be HE160)
uci set wireless.radio1=wifi-device
uci set wireless.radio1.type='mac80211'
uci set wireless.radio1.path='virtual/radio1'
uci set wireless.radio1.channel='36'
uci set wireless.radio1.band='5g'
uci set wireless.radio1.htmode='HE160'
uci set wireless.radio1.country='BR'
uci set wireless.radio1.disabled='0'

uci set wireless.default_radio1=wifi-iface
uci set wireless.default_radio1.device='radio1'
uci set wireless.default_radio1.network='lan'
uci set wireless.default_radio1.mode='ap'
uci set wireless.default_radio1.ssid='ARK_Mesh_5G'
uci set wireless.default_radio1.encryption='sae'
uci set wireless.default_radio1.key='ArkRouter2026!'

# Radio 6 GHz / Wi-Fi 7 (802.11be EHT320 com MLO)
uci set wireless.radio2=wifi-device
uci set wireless.radio2.type='mac80211'
uci set wireless.radio2.path='virtual/radio2'
uci set wireless.radio2.channel='37'
uci set wireless.radio2.band='6g'
uci set wireless.radio2.htmode='EHT320'
uci set wireless.radio2.country='BR'
uci set wireless.radio2.disabled='0'

uci set wireless.default_radio2=wifi-iface
uci set wireless.default_radio2.device='radio2'
uci set wireless.default_radio2.network='lan'
uci set wireless.default_radio2.mode='ap'
uci set wireless.default_radio2.ssid='ARK_Mesh_6G_MLO'
uci set wireless.default_radio2.encryption='sae'
uci set wireless.default_radio2.key='ArkRouter2026!'
uci set wireless.default_radio2.mlo='1'
uci commit wireless

echo "=== [3/4] Configurando Mock de SQM CAKE ==="
if [ -f /etc/config/sqm ]; then
    uci set sqm.eth0=queue
    uci set sqm.eth0.interface='eth0'
    uci set sqm.eth0.qdisc='cake'
    uci set sqm.eth0.script='piece_of_cake.qos'
    uci set sqm.eth0.upload='100000'
    uci set sqm.eth0.download='300000'
    uci set sqm.eth0.enabled='1'
    uci commit sqm
fi

echo "=== [4/4] Criando Wrapper de Mock do iwinfo para Wi-Fi 7 ==="
if ! command -v iwinfo >/dev/null 2>&1; then
    cat << 'EOF' > /usr/bin/iwinfo
#!/bin/sh
case "$1" in
    "")
        echo "radio0    ESSID: \"ARK_Mesh_2.4G\""
        echo "          Type: nl80211  HW Mode: 802.11ax"
        echo "          Channel: 6 (2.437 GHz)  Tx-Power: 20 dBm"
        echo "radio1    ESSID: \"ARK_Mesh_5G\""
        echo "          Type: nl80211  HW Mode: 802.11ax/be"
        echo "          Channel: 36 (5.180 GHz)  Tx-Power: 23 dBm"
        echo "radio2    ESSID: \"ARK_Mesh_6G_MLO\""
        echo "          Type: nl80211  HW Mode: 802.11be (Wi-Fi 7)"
        echo "          Channel: 37 (6.135 GHz)  Tx-Power: 24 dBm"
        echo "          MLO: Active (320 MHz, 4096-QAM)"
        ;;
    *)
        echo "Interface $1: Mode: Master, Bitrate: 5764.8 MBit/s"
        ;;
esac
EOF
    chmod +x /usr/bin/iwinfo
fi

echo "=== MOCKS DE AMBIENTE VIRTUAL CONFIGURADOS COM SUCESSO ==="
