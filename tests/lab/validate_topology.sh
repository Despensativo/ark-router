#!/bin/sh
# tests/lab/validate_topology.sh
# ARK Router - Script de Auditoria da Topologia de Rede no Laboratório Virtual
# Executado dentro da VM OpenWrt para validar interfaces, rotas, firewall e daemons.
# 100% POSIX BusyBox ash compliant.

set -u

ERRORS=0
WARNINGS=0

log_ok() {
	printf '\033[1;32m[OK]\033[0m %s\n' "$1"
}

log_fail() {
	printf '\033[1;31m[FAIL]\033[0m %s\n' "$1"
	ERRORS=$((ERRORS + 1))
}

log_warn() {
	printf '\033[1;33m[WARN]\033[0m %s\n' "$1"
	WARNINGS=$((WARNINGS + 1))
}

printf '============================================================\n'
printf '     ARK ROUTER: AUDITORIA DE TOPOLOGIA DA VM (LAB)         \n'
printf '============================================================\n'

# 1. Auditoria de Interfaces Ethernet Físicas
printf '\n[1/6] Verificando Interfaces de Rede...\n'
for iface in eth0 eth1 eth2 eth3; do
	if [ -d "/sys/class/net/$iface" ]; then
		state="$(cat "/sys/class/net/$iface/operstate" 2>/dev/null || echo "unknown")"
		mtu="$(cat "/sys/class/net/$iface/mtu" 2>/dev/null || echo "unknown")"
		log_ok "Interface $iface presente (estado: $state, MTU: $mtu)"
	else
		log_warn "Interface $iface não detectada no sysfs (pode exigir ativação no VirtualBox)"
	fi
done

# 2. Auditoria de Bridge LAN e IP de Gerência
printf '\n[2/6] Verificando Bridge LAN e Acesso Local...\n'
lan_ip="$(uci -q get network.lan.ipaddr || echo "")"
if [ -n "$lan_ip" ]; then
	log_ok "IP da LAN configurado no UCI: $lan_ip"
else
	log_fail "IP da interface LAN ausente no UCI"
fi

if [ -d "/sys/class/net/br-lan" ] || ip link show br-lan >/dev/null 2>&1; then
	log_ok "Bridge br-lan ativa no kernel"
else
	log_warn "Bridge br-lan inativa ou com nomenclatura alternativa"
fi

# 3. Auditoria do Firewall (fw4 / nftables vs fw3 / iptables)
printf '\n[3/6] Verificando Mecanismo de Firewall...\n'
if command -v nft >/dev/null 2>&1; then
	if nft list table inet fw4 >/dev/null 2>&1; then
		log_ok "Firewall fw4 (nftables) ativo: tabela inet fw4 carregada com integridade"
	else
		log_fail "Firewall fw4 presente mas tabela inet fw4 NÃO está carregada!"
	fi
elif command -v iptables >/dev/null 2>&1; then
	if iptables -n -L FORWARD >/dev/null 2>&1; then
		log_ok "Firewall fw3 (iptables) ativo e cadeias íntegras"
	else
		log_fail "Firewall fw3 com falha nas tabelas iptables"
	fi
else
	log_fail "Nenhum mecanismo de firewall detectado (nem nftables nem iptables)"
fi

# 4. Auditoria de Multi-WAN e mwan3
printf '\n[4/6] Verificando Subsistema Multi-WAN (mwan3)...\n'
if [ -x /usr/sbin/mwan3 ]; then
	mwan_status="$(mwan3 status 2>/dev/null || true)"
	if printf '%s\n' "$mwan_status" | grep -qi "interface"; then
		log_ok "mwan3 operacional com interfaces monitoradas"
	else
		log_warn "mwan3 instalado mas sem interfaces ativas no momento"
	fi
else
	log_warn "mwan3 não instalado nesta imagem da VM"
fi

# 5. Auditoria de Rádios Virtuais Wi-Fi (mac80211_hwsim)
printf '\n[5/6] Verificando Rádios Virtuais Wi-Fi (Simulação)...\n'
if command -v iw >/dev/null 2>&1; then
	phy_count="$(iw list 2>/dev/null | grep -c "Wiphy" || echo 0)"
	if [ "$phy_count" -ge 2 ]; then
		log_ok "Rádios simulados detectados via iw: $phy_count interfaces wiphy ativas"
	elif [ "$phy_count" -ge 1 ]; then
		log_ok "1 rádio virtual detectado via iw"
	else
		log_warn "Nenhum rádio físico ou simulado detectado. Carregue mac80211_hwsim para simular Wi-Fi."
	fi
else
	log_warn "Utilitário iw não disponível para checagem de rádio"
fi

# 6. Auditoria do Daemon ARK e Endpoint LuCI
printf '\n[6/6] Verificando Controladores e Servidor Web...\n'
if [ -x /usr/sbin/equipe-dashboard-control ]; then
	log_ok "Controlador /usr/sbin/equipe-dashboard-control presente e executável"
else
	log_fail "/usr/sbin/equipe-dashboard-control não encontrado ou sem permissão de execução"
fi

if pgrep -f 'uhttpd|nginx' >/dev/null 2>&1; then
	log_ok "Servidor web ativo ouvindo requisições HTTP/HTTPS"
else
	log_fail "Nenhum servidor web ativo (uhttpd ou nginx)!"
fi

printf '\n============================================================\n'
if [ "$ERRORS" -eq 0 ]; then
	printf '\033[1;32mRESULTADO: TOPOLOGIA DA VM VALIDADA COM SUCESSO! (%s avisos)\033[0m\n' "$WARNINGS"
	exit 0
else
	printf '\033[1;31mRESULTADO: %s FALHA(S) IDENTIFICADA(S) NA VM!\033[0m\n' "$ERRORS"
	exit 1
fi
