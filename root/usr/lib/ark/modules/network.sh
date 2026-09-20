#!/bin/sh
# /usr/lib/ark/modules/network.sh - ARK Router Unified Networking Module
# Strict POSIX BusyBox ash compliant module for WAN, LAN, Multi-WAN (mwan3),
# AutoWAN, PPPoE profiles, MTU 1508 Baby Jumbo, TCP Turbo and IPv6 dual-stack.

[ -z "${_ARK_NETWORK_SH_LOADED:-}" ] || return 0
_ARK_NETWORK_SH_LOADED=1

[ -n "${ARK_LIB_DIR}" ] || ARK_LIB_DIR="/usr/lib/ark"
[ -f "${ARK_LIB_DIR}/common.sh" ] && . "${ARK_LIB_DIR}/common.sh"
[ -f "${ARK_LIB_DIR}/logging.sh" ] && . "${ARK_LIB_DIR}/logging.sh"
[ -f "${ARK_LIB_DIR}/validation.sh" ] && . "${ARK_LIB_DIR}/validation.sh"
[ -f "${ARK_LIB_DIR}/modules/sqm.sh" ] && . "${ARK_LIB_DIR}/modules/sqm.sh"
[ -f "${ARK_LIB_DIR}/modules/starlink.sh" ] && . "${ARK_LIB_DIR}/modules/starlink.sh"

lan_dhcp_dns_values() {
	for opt in $(uci -q get dhcp.lan.dhcp_option 2>/dev/null); do
		case "$opt" in
			6,*) printf '%s\n' "$opt" | cut -d, -f2- | tr ',' '\n' ;;
		esac
	done
}

validate_dns_list() {
	count=0
	for server in $1; do
		valid_ipv4 "$server" || return 1
		count=$((count + 1))
		[ "$count" -le 3 ] || return 1
	done
	return 0
}

apply_lan_dhcp_dns() {
	dns="$1"
	old_options="$(uci -q get dhcp.lan.dhcp_option 2>/dev/null || true)"
	uci -q delete dhcp.lan.dhcp_option
	for opt in $old_options; do
		[ -n "$opt" ] || continue
		case "$opt" in
			6,*) ;;
			*) uci -q add_list dhcp.lan.dhcp_option="$opt" ;;
		esac
	done
	[ -n "$dns" ] && uci -q add_list dhcp.lan.dhcp_option="6,$(printf '%s' "$dns" | tr ' ' ',')"
}

autowan_can_convert() {
	local port="$1"
	# Porta 1 / lan1 eh sagrada como porta mestre de resgate/administracao local
	[ "$port" != "1" ] && [ "$port" != "lan1" ] && [ "$port" != "port1" ] || return 1

	# 1. Se ha Wi-Fi ativo (disabled=0), e 100% seguro converter qualquer porta física secundária
	if uci -q show wireless | grep -q "\.disabled='0'"; then
		return 0
	fi

	# 2. Se Wi-Fi desligado, checa se há outra porta LAN com cabo ativo
	# Suporte a swconfig (ex: D-Link DGL-5500 12.1)
	if command -v swconfig >/dev/null 2>&1 && swconfig dev switch0 show >/dev/null 2>&1; then
		local lan_links=0
		for p in 1 2 3 4; do
			if [ "$p" != "$port" ] && swconfig dev switch0 port "$p" get link 2>/dev/null | grep -q "link:up"; then
				lan_links=$((lan_links + 1))
			fi
		done
		[ "$lan_links" -ge 1 ] && return 0
	fi

	# Suporte a DSA (ex: Predator W6X 73.1)
	local dsa_lan_links=0
	for iface in lan1 lan2 lan3 lan4; do
		if [ "$iface" != "$port" ] && [ -f "/sys/class/net/$iface/operstate" ]; then
			[ "$(cat "/sys/class/net/$iface/operstate")" = "up" ] && dsa_lan_links=$((dsa_lan_links + 1))
		fi
	done
	[ "$dsa_lan_links" -ge 1 ] && return 0

	# Sem Wi-Fi e sem outra porta LAN: protege contra lockout
	return 1
}

get_physical_wan_dev() {
	if is_swconfig; then
		echo "5"
	else
		local d="$(uci -q get network.wan.ark_phys_port || uci -q get network.wan.device || uci -q get network.wan.ifname || echo eth1)"
		echo "$d"
	fi
}

autowan_can_convert_wan_json() {
	local wan_dev="$(get_physical_wan_dev)"
	local carrier="false"
	local has_other_wan="false"
	local has_lan_access="false"

	# Checa se a porta WAN fisica tem link/cabo conectado
	if is_swconfig; then
		if swconfig dev switch0 port 5 get link 2>/dev/null | grep -q "link:up"; then
			carrier="true"
		fi
	else
		if [ -f "/sys/class/net/$wan_dev/operstate" ] && [ "$(cat "/sys/class/net/$wan_dev/operstate" 2>/dev/null)" = "up" ]; then
			carrier="true"
		elif [ -f "/sys/class/net/$wan_dev/carrier" ] && [ "$(cat "/sys/class/net/$wan_dev/carrier" 2>/dev/null)" = "1" ]; then
			carrier="true"
		fi
	fi

	# Checa se ha outra WAN alem da WAN fisica principal
	for w in $(uci -q show network | grep '=interface' | cut -d. -f2 | cut -d= -f1 | grep -E '^wan[2-9]$'); do
		local p="$(uci -q get "network.$w.proto" || echo "")"
		local d="$(uci -q get "network.$w.device" || uci -q get "network.$w.ifname" || echo "")"
		if [ -n "$p" ] && [ "$p" != "none" ] && [ -n "$d" ]; then
			has_other_wan="true"
			break
		fi
	done

	# Checa se ha acesso LAN garantido (Wi-Fi ativo ou outra LAN cabeada conectada)
	if uci -q show wireless | grep -q "\.disabled='0'"; then
		has_lan_access="true"
	else
		if is_swconfig; then
			for p in 1 2 3 4; do
				if swconfig dev switch0 port "$p" get link 2>/dev/null | grep -q "link:up"; then
					has_lan_access="true"
					break
				fi
			done
		else
			for iface in lan1 lan2 lan3 lan4; do
				if [ -f "/sys/class/net/$iface/operstate" ] && [ "$(cat "/sys/class/net/$iface/operstate")" = "up" ]; then
					has_lan_access="true"
					break
				fi
			done
		fi
	fi

	local wan_as_lan="false"
	[ "$(uci -q get network.autowan.wan_to_lan || echo 0)" = "1" ] && wan_as_lan="true"

	printf '{"wan_dev":"%s","carrier":%s,"has_other_wan":%s,"has_lan_access":%s,"wan_to_lan":%s}\n' \
		"$wan_dev" "$carrier" "$has_other_wan" "$has_lan_access" "$wan_as_lan"
}

system_network_mode_get() {
	local role="$(uci -q get equipe_dashboard.general.role || uci -q get equipe_dashboard.main.role || echo '')"
	local mode="$(uci -q get equipe_dashboard.main.network_mode || echo '')"
	local lan_proto="$(uci -q get network.lan.proto || echo 'static')"
	local lan_ip="$(uci -q get network.lan.ipaddr || echo '')"
	local lan_mask="$(uci -q get network.lan.netmask || echo '255.255.255.0')"
	local lan_gw="$(uci -q get network.lan.gateway || echo '')"
	local lan_dns="$(uci -q get network.lan.dns || echo '')"
	local rescue_ip="$(uci -q get network.rescue.ipaddr || echo '')"
	local dhcp_disabled="$(uci -q get dhcp.lan.ignore || echo '0')"

	if [ -z "$mode" ]; then
		if [ "$role" = "secondary" ] || [ "$role" = "satellite" ]; then
			mode="ap"
		elif [ "$dhcp_disabled" = "1" ] && [ -n "$lan_gw" ]; then
			mode="ap"
		else
			mode="router"
		fi
	fi

	local current_ip="$(ip -4 addr show br-lan 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 | head -n 1)"
	[ -n "$current_ip" ] || current_ip="$lan_ip"
	local current_gw="$(ip route show default 2>/dev/null | awk '{print $3; exit}')"
	[ -n "$current_gw" ] || current_gw="$lan_gw"

	local mesh_disabled="$(uci -q get wireless.extra_mesh_r1.disabled || echo '1')"
	local cur_mesh_id="$(uci -q get wireless.extra_mesh_r1.mesh_id || echo '')"
	local backhaul="cable"
	if [ "$mesh_disabled" = "0" ] && [ -n "$cur_mesh_id" ]; then
		backhaul="air"
	fi
	local master_ip="$(uci -q get equipe_dashboard.general.master_ip || echo "$lan_gw")"

	printf '{"mode":"%s","role":"%s","backhaul":"%s","mesh_id":"%s","master_ip":"%s","lan_proto":"%s","lan_ip":"%s","current_ip":"%s","netmask":"%s","gateway":"%s","current_gw":"%s","dns":"%s","rescue_ip":"%s","dhcp_disabled":%s}\n' \
		"$mode" "$role" "$backhaul" "$cur_mesh_id" "$master_ip" "$lan_proto" "$lan_ip" "$current_ip" "$lan_mask" "$lan_gw" "$current_gw" "$lan_dns" "$rescue_ip" "$([ "$dhcp_disabled" = "1" ] && echo true || echo false)"
}

system_network_mode_set() {
	local target_mode="$1"
	local ap_ip_proto="${2:-dhcp}"
	local ap_ip="${3:-}"
	local ap_mask="${4:-255.255.255.0}"
	local ap_gw="${5:-}"
	local ap_dns="${6:-}"

	local default_rescue_ip="192.168.12.1"
	if [ -f /tmp/sysinfo/board_name ] && grep -qi "predator" /tmp/sysinfo/board_name 2>/dev/null; then
		default_rescue_ip="192.168.73.1"
	elif [ "$(uci -q get network.lan.proto)" = "static" ] && [ -n "$(uci -q get network.lan.ipaddr)" ]; then
		default_rescue_ip="$(uci -q get network.lan.ipaddr)"
	fi
	local saved_rescue="$(uci -q get network.rescue.ipaddr || echo "")"
	[ -n "$saved_rescue" ] && default_rescue_ip="$saved_rescue"

	if [ "$target_mode" = "ap" ]; then
		# Evita colisao caso o IP estatico do AP seja igual ao IP de resgate na mesma bridge
		if [ "$ap_ip_proto" = "static" ] && [ -n "$ap_ip" ] && [ "$ap_ip" = "$default_rescue_ip" ]; then
			if [ "$default_rescue_ip" != "192.168.12.1" ]; then
				default_rescue_ip="192.168.12.1"
			else
				default_rescue_ip="192.168.13.1"
			fi
		fi

		# 1. Configura interface de Resgate no switch/bridge
		uci -q set network.rescue=interface
		uci -q set network.rescue.proto='static'
		uci -q set network.rescue.ipaddr="$default_rescue_ip"
		uci -q set network.rescue.netmask='255.255.255.0'
		if is_swconfig; then
			uci -q set network.rescue.ifname='eth0.1'
		else
			uci -q set network.rescue.device='br-lan'
		fi

		# Adiciona rescue na zona de firewall lan
		for z in $(uci -q show firewall | grep '=zone' | cut -d. -f2 | cut -d= -f1); do
			if [ "$(uci -q get "firewall.$z.name")" = "lan" ]; then
				uci -q add_list "firewall.$z.network=rescue"
				break
			fi
		done

		# 2. Configura a interface LAN principal
		if [ "$ap_ip_proto" = "static" ] && [ -n "$ap_ip" ]; then
			uci -q set network.lan.proto='static'
			uci -q set network.lan.ipaddr="$ap_ip"
			uci -q set network.lan.netmask="$ap_mask"
			[ -z "$ap_gw" ] || uci -q set network.lan.gateway="$ap_gw"
			[ -z "$ap_dns" ] || uci -q set network.lan.dns="$ap_dns"
		else
			uci -q set network.lan.proto='dhcp'
			uci -q delete network.lan.ipaddr
			uci -q delete network.lan.netmask
			uci -q delete network.lan.gateway
			uci -q delete network.lan.dns
		fi

		# 3. Desativa servidor DHCP local
		uci -q set dhcp.lan.ignore='1'
		uci -q delete dhcp.lan.dhcpv4
		uci -q delete dhcp.lan.dhcpv6
		uci -q delete dhcp.lan.ra
		uci -q delete dhcp.lan.ndp

		# 4. Agrega porta WAN fisica no switch local (LAN / br-lan)
		local wan_dev="$(get_physical_wan_dev)"
		if is_swconfig; then
			swconfig_add_port_to_vlan 5 1
			swconfig_remove_port_from_vlan 5 2
			swconfig dev switch0 port 5 set pvid 1 >/dev/null 2>&1 || true
			v1_ports="$(swconfig dev switch0 vlan 1 get ports 2>/dev/null | sed 's/VLAN 1: //')"
			has_5=0
			for item in $v1_ports; do [ "$item" = "5" ] && has_5=1; done
			[ "$has_5" = 1 ] || v1_ports="$v1_ports 5"
			swconfig dev switch0 vlan 1 set ports "$v1_ports" >/dev/null 2>&1 || true
			swconfig dev switch0 vlan 2 set ports "0t" >/dev/null 2>&1 || true
			swconfig dev switch0 set apply >/dev/null 2>&1 || true
		else
			add_lan_port "$wan_dev"
			ip link set "$wan_dev" up >/dev/null 2>&1 || true
			brctl addif br-lan "$wan_dev" >/dev/null 2>&1 || ip link set "$wan_dev" master br-lan >/dev/null 2>&1 || true
		fi

		# 5. Desativa a WAN padrao no netifd
		uci -q set network.wan.auto='0'
		[ -z "$(uci -q get network.wan_modem)" ] || uci -q set network.wan_modem.auto='0'
		[ -z "$(uci -q get network.wan_mgmt)" ] || uci -q set network.wan_mgmt.auto='0'

		# 6. Desativa servicos irrelevantes em modo AP (Multi-WAN, Auto-WAN)
		/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
		/etc/init.d/mwan3 disable >/dev/null 2>&1 || true
		pkill -f ark-autowan-daemon 2>/dev/null || true
		uci -q set network.autowan.enabled='0'

		# 7. Salva modo
		uci -q set equipe_dashboard.main.network_mode='ap'
		uci commit network
		uci commit dhcp
		uci commit firewall
		uci commit equipe_dashboard
		rm -f /tmp/ark-features.cache 2>/dev/null || true

		/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
		/etc/init.d/network reload >/dev/null 2>&1 || true
		/etc/init.d/firewall reload >/dev/null 2>&1 || true

		echo "ap_enabled"
	else
		# Volta para Modo Roteador / Gateway Principal
		# 1. Restaura porta WAN física
		local wan_dev="$(get_physical_wan_dev)"
		if is_swconfig; then
			swconfig_remove_port_from_vlan 5 1
			swconfig_add_port_to_vlan 5 2
			swconfig dev switch0 port 5 set pvid 2 >/dev/null 2>&1 || true
			v1_ports="$(swconfig dev switch0 vlan 1 get ports 2>/dev/null | sed 's/VLAN 1: //')"
			new_v1=""
			for item in $v1_ports; do
				[ "$item" != "5" ] && [ "$item" != "5t" ] && new_v1="$new_v1 $item"
			done
			swconfig dev switch0 vlan 1 set ports "$new_v1" >/dev/null 2>&1 || true
			swconfig dev switch0 vlan 2 set ports "5 0t" >/dev/null 2>&1 || true
			swconfig dev switch0 set apply >/dev/null 2>&1 || true
		else
			remove_lan_port "$wan_dev"
			brctl delif br-lan "$wan_dev" >/dev/null 2>&1 || ip link set "$wan_dev" nomaster >/dev/null 2>&1 || true
		fi

		# 2. Restaura interface LAN estática com IP padrão
		uci -q set network.lan.proto='static'
		uci -q set network.lan.ipaddr="$default_rescue_ip"
		uci -q set network.lan.netmask='255.255.255.0'
		uci -q delete network.lan.gateway
		uci -q delete network.lan.dns

		# 3. Remove interface de resgate
		uci -q delete network.rescue
		for z in $(uci -q show firewall | grep '=zone' | cut -d. -f2 | cut -d= -f1); do
			if [ "$(uci -q get "firewall.$z.name")" = "lan" ]; then
				uci -q del_list "firewall.$z.network=rescue"
				break
			fi
		done

		# 4. Restaura WAN padrão
		uci -q set network.wan.auto='1'
		[ -z "$(uci -q get network.wan_modem)" ] || uci -q set network.wan_modem.auto='1'
		[ -z "$(uci -q get network.wan_mgmt)" ] || uci -q set network.wan_mgmt.auto='1'

		# 5. Reativa DHCP local na LAN
		uci -q delete dhcp.lan.ignore
		uci -q set dhcp.lan.force='1'

		# 6. Salva modo
		uci -q set equipe_dashboard.main.network_mode='router'
		uci commit network
		uci commit dhcp
		uci commit firewall
		uci commit equipe_dashboard
		rm -f /tmp/ark-features.cache 2>/dev/null || true

		/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
		/etc/init.d/network reload >/dev/null 2>&1 || true
		/etc/init.d/firewall reload >/dev/null 2>&1 || true
		(sleep 1; ifup wan >/dev/null 2>&1) &

		echo "router_enabled"
	fi
}

same_managed_subnet() {
	candidate="$1"
	for managed in lan guest; do
		managed_ip="$(ubus call "network.interface.$managed" status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address')"
		prefix="$(ubus call "network.interface.$managed" status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].mask')"
		[ -n "$managed_ip" ] && [ -n "$prefix" ] || continue
		[ "$candidate" != "$managed_ip" ] || return 1
		command -v ipcalc.sh >/dev/null 2>&1 || return 0
		network="$(ipcalc.sh "$managed_ip/$prefix" 2>/dev/null | sed -n 's/^NETWORK=//p')"
		candidate_network="$(ipcalc.sh "$candidate/$prefix" 2>/dev/null | sed -n 's/^NETWORK=//p')"
		[ -n "$network" ] && [ "$network" = "$candidate_network" ] && return 0
	done
	return 1
}

sync_adguard_ipv6() {
	enable_ipv6="${1:-}"
	if [ -z "$enable_ipv6" ]; then
		cur_mode="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"
		[ "$cur_mode" != "ipv4_only" ] && enable_ipv6=1 || enable_ipv6=0
	fi

	yaml="/etc/adguardhome/adguardhome.yaml"
	[ -f "$yaml" ] || return 0

	cp -f "$yaml" "${yaml}.bak_ipv6" 2>/dev/null || true

	if [ "$enable_ipv6" = "1" ] || [ "$enable_ipv6" = "true" ]; then
		# 1. Liberar resolucao de registros AAAA (IPv6)
		sed -i 's/^[[:space:]]*aaaa_disabled:.*/  aaaa_disabled: false/' "$yaml"

		# 2. Adicionar upstreams IPv6 ultrarrapidos caso nao existam
		if ! grep -q "2606:4700:4700::1111" "$yaml"; then
			sed -i '/^[[:space:]]*upstream_dns:/a \    - 2606:4700:4700::1111\n    - 2001:4860:4860::8888' "$yaml"
		fi

		# 3. Adicionar bootstrap IPv6 caso nao exista
		if ! sed -n '/^[[:space:]]*bootstrap_dns:/,/^[a-z_]/p' "$yaml" | grep -q "2606:4700:4700::1111"; then
			sed -i '/^[[:space:]]*bootstrap_dns:/a \    - 2606:4700:4700::1111\n    - 2001:4860:4860::8888' "$yaml"
		fi
	else
		# Modo IPv4 Puro: desativar consultas AAAA para economia de latencia
		sed -i 's/^[[:space:]]*aaaa_disabled:.*/  aaaa_disabled: true/' "$yaml"
		sed -i '/2606:4700:4700::1111/d; /2001:4860:4860::8888/d' "$yaml"
	fi

	chown -R adguardhome:adguardhome /etc/adguardhome /var/lib/adguardhome 2>/dev/null || true
	chmod 644 "$yaml" 2>/dev/null || true

	if [ -x /usr/bin/AdGuardHome ] && pgrep -f 'AdGuardHome' >/dev/null 2>&1 && [ "$(uci -q get equipe_perf.settings.adblock_enabled || echo 0)" = "1" ] && [ "$(uci -q get equipe_perf.settings.adguard_enabled || echo 0)" = "1" ]; then
		if /usr/bin/AdGuardHome --config "$yaml" --check-config >/dev/null 2>&1; then
			/etc/init.d/adguardhome reload >/dev/null 2>&1 || /etc/init.d/adguardhome restart >/dev/null 2>&1 || true
		else
			logger -t ark-adguard "Configuracao YAML do AdGuard corrompida ao sincronizar IPv6. Revertendo."
			cp -f "${yaml}.bak_ipv6" "$yaml" 2>/dev/null || true
			chown -R adguardhome:adguardhome /etc/adguardhome /var/lib/adguardhome 2>/dev/null || true
			chmod 644 "$yaml" 2>/dev/null || true
		fi
	fi
}

restore_ipv6_firewall_rules() {
	zone="$(firewall_wan_zone_section)"
	if [ -n "$zone" ]; then
		firewall_zone_has_network "$zone" wan6 || uci -q add_list "firewall.$zone.network=wan6"
	fi

	if ! uci -q get firewall.Allow_ICMPv6_Input >/dev/null 2>&1; then
		uci -q set firewall.Allow_ICMPv6_Input=rule
		uci -q set firewall.Allow_ICMPv6_Input.name='Allow-ICMPv6-Input'
		uci -q set firewall.Allow_ICMPv6_Input.src='wan'
		uci -q set firewall.Allow_ICMPv6_Input.proto='icmp'
		for itype in echo-request echo-reply destination-unreachable packet-too-big time-exceeded bad-header unknown-header-type router-solicitation neighbour-solicitation router-advertisement neighbour-advertisement; do
			uci -q add_list "firewall.Allow_ICMPv6_Input.icmp_type=$itype"
		done
		uci -q set firewall.Allow_ICMPv6_Input.limit='1000/sec'
		uci -q set firewall.Allow_ICMPv6_Input.family='ipv6'
		uci -q set firewall.Allow_ICMPv6_Input.target='ACCEPT'
	fi

	if ! uci -q get firewall.Allow_ICMPv6_Forward >/dev/null 2>&1; then
		uci -q set firewall.Allow_ICMPv6_Forward=rule
		uci -q set firewall.Allow_ICMPv6_Forward.name='Allow-ICMPv6-Forward'
		uci -q set firewall.Allow_ICMPv6_Forward.src='wan'
		uci -q set firewall.Allow_ICMPv6_Forward.dest='*'
		uci -q set firewall.Allow_ICMPv6_Forward.proto='icmp'
		for itype in echo-request echo-reply destination-unreachable packet-too-big time-exceeded bad-header unknown-header-type; do
			uci -q add_list "firewall.Allow_ICMPv6_Forward.icmp_type=$itype"
		done
		uci -q set firewall.Allow_ICMPv6_Forward.limit='1000/sec'
		uci -q set firewall.Allow_ICMPv6_Forward.family='ipv6'
		uci -q set firewall.Allow_ICMPv6_Forward.target='ACCEPT'
	fi

	if ! uci -q get firewall.Allow_DHCPv6 >/dev/null 2>&1; then
		uci -q set firewall.Allow_DHCPv6=rule
		uci -q set firewall.Allow_DHCPv6.name='Allow-DHCPv6'
		uci -q set firewall.Allow_DHCPv6.src='wan'
		uci -q set firewall.Allow_DHCPv6.proto='udp'
		uci -q set firewall.Allow_DHCPv6.src_ip='fc00::/6'
		uci -q set firewall.Allow_DHCPv6.dest_ip='fc00::/6'
		uci -q set firewall.Allow_DHCPv6.dest_port='546'
		uci -q set firewall.Allow_DHCPv6.family='ipv6'
		uci -q set firewall.Allow_DHCPv6.target='ACCEPT'
	fi
}

enable_ipv6_dual_stack() {
	sysctl_ipv6_conf="/etc/sysctl.d/99-ark-router-disable-ipv6.conf"
	[ -n "${ARK_ROOT}" ] && sysctl_ipv6_conf="${ARK_ROOT}/etc/sysctl.d/99-ark-router-disable-ipv6.conf"
	rm -f "$sysctl_ipv6_conf" 2>/dev/null || true
	sysctl -w net.ipv6.conf.all.disable_ipv6=0 >/dev/null 2>&1 || true
	sysctl -w net.ipv6.conf.default.disable_ipv6=0 >/dev/null 2>&1 || true
	sysctl -w net.ipv6.conf.lo.disable_ipv6=0 >/dev/null 2>&1 || true

	if [ -n "$(uci -q get network.wan.proto)" ]; then
		uci -q set network.wan.ipv6=1
		uci -q set network.wan.delegate=1
	fi
	for iface in wan2 wan3 wan4; do
		if [ -n "$(uci -q get "network.$iface.proto")" ]; then
			cur_v6="$(uci -q get "network.$iface.ipv6")"
			[ "$cur_v6" = "1" ] || uci -q set "network.$iface.ipv6=0"
		fi
	done

	uci -q delete network.wan6
	uci -q set network.wan6=interface
	uci -q set network.wan6.proto='dhcpv6'
	uci -q set network.wan6.device='@wan'
	uci -q set network.wan6.reqprefix='auto'
	uci -q set network.wan6.reqaddress='try'

	ula="$(uci -q get network.globals.ula_prefix)"
	if [ -z "$ula" ]; then
		saved_ula="$(uci -q get equipe_dashboard.ipv6.saved_ula)"
		if [ -n "$saved_ula" ] && [ "$saved_ula" != "none" ]; then
			ula="$saved_ula"
		else
			ula="fd73:0192:0168::/48"
		fi
		uci -q set "network.globals.ula_prefix=$ula"
	fi
	uci -q set network.lan.ip6assign='64'
	uci -q delete network.lan.delegate

	uci -q delete dhcp.@dnsmasq[0].filter_aaaa
	relay="$(uci -q get equipe_dashboard.ipv6.relay || echo 0)"
	if [ "$relay" = "1" ]; then
		uci -q set dhcp.lan.dhcpv6='relay'
		uci -q set dhcp.lan.ra='relay'
		uci -q set dhcp.lan.ndp='relay'
		uci -q set dhcp.wan.dhcpv6='relay'
		uci -q set dhcp.wan.ra='relay'
		uci -q set dhcp.wan.ndp='relay'
		uci -q set dhcp.wan.master='1'
	else
		uci -q set dhcp.lan.dhcpv6='server'
		uci -q set dhcp.lan.ra='server'
		uci -q set dhcp.lan.ndp='disabled'
		uci -q delete dhcp.wan.dhcpv6
		uci -q delete dhcp.wan.ra
		uci -q delete dhcp.wan.ndp
		uci -q delete dhcp.wan.master
	fi

	restore_ipv6_firewall_rules

	uci commit network
	uci commit dhcp
	uci commit firewall

	[ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd enable >/dev/null 2>&1 || true
	[ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd restart >/dev/null 2>&1 || true
	sync_adguard_ipv6 true
}

clean_ipv6_selective_firewall() {
	if is_fw4; then
		if command -v nft >/dev/null 2>&1; then
			nft delete table inet ark_ipv6_selective 2>/dev/null || true
			for t in $(nft list tables 2>/dev/null | grep 'table netdev ark_ipv6_' | awk '{print $3}'); do
				nft delete table netdev "$t" 2>/dev/null || true
			done
		fi
	elif is_fw3; then
		if command -v ip6tables >/dev/null 2>&1; then
			lan_dev="$(uci -q get network.lan.device || uci -q get network.lan.ifname || echo br-lan)"
			ip6tables -D FORWARD -i "$lan_dev" -j ARK_IPV6_SEL 2>/dev/null || true
			ip6tables -F ARK_IPV6_SEL 2>/dev/null || true
			ip6tables -X ARK_IPV6_SEL 2>/dev/null || true
		fi
	fi
	rm -f /etc/ark/ark_ipv6_selective.* 2>/dev/null || true
	uci -q delete firewall.ark_ipv6_selective
	uci commit firewall
}

sync_ipv6_selective_firewall() {
	mkdir -p /etc/ark
	lan_dev="$(uci -q get network.lan.device || uci -q get network.lan.ifname || echo br-lan)"
	cur_mode="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"

	allowed_macs=""
	blocked_macs=""
	if [ -f /etc/config/equipe_devices ]; then
		sections="$(uci -q show equipe_devices 2>/dev/null | grep '=device$' | cut -d. -f2 | cut -d= -f1)"
		for s in $sections; do
			val="$(uci -q get "equipe_devices.$s.ipv6_allowed")"
			m="$(uci -q get "equipe_devices.$s.mac" | tr 'A-F' 'a-f')"
			[ -n "$m" ] || continue
			if [ "$val" = "1" ]; then
				allowed_macs="$allowed_macs $m"
			elif [ "$val" = "0" ]; then
				blocked_macs="$blocked_macs $m"
			fi
		done
	fi

	if [ "$cur_mode" = "ipv4_only" ] || [ "$cur_mode" = "ipv6_only" ]; then
		clean_ipv6_selective_firewall
		return 0
	fi

	if is_fw4; then
		tmp_nft="/tmp/ark_ipv6_selective.nft"
		nft_file="/etc/ark/ark_ipv6_selective.nft"
		apply_sh="/etc/ark/ark_ipv6_selective.sh"

		if [ "$cur_mode" = "selective" ]; then
			elements_str=""
			for m in $allowed_macs; do
				[ -z "$elements_str" ] && elements_str="$m" || elements_str="$elements_str, $m"
			done
			elements_line=""
			[ -n "$elements_str" ] && elements_line="		elements = { $elements_str }"

			cat << EOF > "$tmp_nft"
table inet ark_ipv6_selective
delete table inet ark_ipv6_selective
table inet ark_ipv6_selective {
	set allowed_macs {
		type ether_addr
$elements_line
	}
	chain forward_ipv6_selective {
		type filter hook forward priority filter - 4; policy accept;
		meta nfproto ipv6 iifname "$lan_dev" ether saddr != @allowed_macs reject with icmpv6 type admin-prohibited
	}
	chain input_ipv6_selective {
		type filter hook input priority filter - 4; policy accept;
		meta nfproto ipv6 iifname "$lan_dev" ether saddr != @allowed_macs udp dport 53 reject with icmpv6 type admin-prohibited
		meta nfproto ipv6 iifname "$lan_dev" ether saddr != @allowed_macs tcp dport 53 reject with icmpv6 type admin-prohibited
		meta nfproto ipv6 iifname "$lan_dev" ether saddr != @allowed_macs icmpv6 type nd-router-solicit drop
		meta nfproto ipv6 iifname "$lan_dev" ether saddr != @allowed_macs udp dport 547 drop
	}
}
EOF
		else
			# Modo 2 (dual_stack): Pilha Dupla com Bloqueio Direto Individual para dispositivos desativados
			if [ -z "$blocked_macs" ]; then
				clean_ipv6_selective_firewall
				return 0
			fi
			elements_str=""
			for m in $blocked_macs; do
				[ -z "$elements_str" ] && elements_str="$m" || elements_str="$elements_str, $m"
			done
			elements_line="		elements = { $elements_str }"

			cat << EOF > "$tmp_nft"
table inet ark_ipv6_selective
delete table inet ark_ipv6_selective
table inet ark_ipv6_selective {
	set blocked_macs {
		type ether_addr
$elements_line
	}
	chain forward_ipv6_selective {
		type filter hook forward priority filter - 4; policy accept;
		meta nfproto ipv6 iifname "$lan_dev" ether saddr @blocked_macs reject with icmpv6 type admin-prohibited
	}
	chain input_ipv6_selective {
		type filter hook input priority filter - 4; policy accept;
		meta nfproto ipv6 iifname "$lan_dev" ether saddr @blocked_macs udp dport 53 reject with icmpv6 type admin-prohibited
		meta nfproto ipv6 iifname "$lan_dev" ether saddr @blocked_macs tcp dport 53 reject with icmpv6 type admin-prohibited
		meta nfproto ipv6 iifname "$lan_dev" ether saddr @blocked_macs icmpv6 type nd-router-solicit drop
		meta nfproto ipv6 iifname "$lan_dev" ether saddr @blocked_macs udp dport 547 drop
	}
}
EOF
		fi

		blocked_netdev_ports=""
		for bm in $blocked_macs; do
			pnum="$(brctl showmacs "$lan_dev" 2>/dev/null | grep -i "$bm" | awk '{print $1}' | head -n 1)"
			[ -n "$pnum" ] || continue
			for bp in "/sys/class/net/$lan_dev/brif"/*; do
				[ -f "$bp/port_no" ] || continue
				ifp="$(cat "$bp/port_no" 2>/dev/null)"
				if [ "$((ifp))" -eq "$pnum" ] 2>/dev/null; then
					bname="$(basename "$bp")"
					case " $blocked_netdev_ports " in
						*" $bname "*) ;;
						*) blocked_netdev_ports="$blocked_netdev_ports $bname" ;;
					esac
				fi
			done
		done

		for bname in $blocked_netdev_ports; do
			case "$bname" in
				lan*|eth*)
					cat << NETDEV_EOF >> "$tmp_nft"
table netdev ark_ipv6_${bname}
delete table netdev ark_ipv6_${bname}
table netdev ark_ipv6_${bname} {
	chain egress {
		type filter hook egress device "${bname}" priority 0;
		ether type ip6 drop
	}
	chain ingress {
		type filter hook ingress device "${bname}" priority 0;
		ether type ip6 drop
	}
}
NETDEV_EOF
					;;
			esac
		done

		if ! /usr/sbin/nft -c -f "$tmp_nft" 2>/dev/null; then
			rm -f "$tmp_nft"
			echo "Erro de sintaxe nftables no filtro IPv6" >&2
			return 1
		fi
		mv -f "$tmp_nft" "$nft_file"
		cat << 'EOF' > "$apply_sh"
#!/bin/sh
[ -f /etc/ark/ark_ipv6_selective.nft ] && /usr/sbin/nft -f /etc/ark/ark_ipv6_selective.nft 2>/dev/null || true
EOF
		chmod +x "$apply_sh"
		nft delete table inet ark_ipv6_selective 2>/dev/null || true
		for t in $(nft list tables 2>/dev/null | grep 'table netdev ark_ipv6_' | awk '{print $3}'); do
			nft delete table netdev "$t" 2>/dev/null || true
		done
		nft -f "$nft_file" 2>/dev/null || true
		uci -q set firewall.ark_ipv6_selective=include
		uci -q set firewall.ark_ipv6_selective.type=script
		uci -q set "firewall.ark_ipv6_selective.path=$apply_sh"
		uci -q set firewall.ark_ipv6_selective.fw4_compatible='1'
		uci commit firewall

	elif is_fw3 && command -v ip6tables >/dev/null 2>&1; then
		apply_sh="/etc/ark/ark_ipv6_selective.sh"
		if [ "$cur_mode" = "selective" ]; then
			cat << EOF > "$apply_sh"
#!/bin/sh
lan_dev="\$(uci -q get network.lan.device || uci -q get network.lan.ifname || echo br-lan)"
ip6tables -F ARK_IPV6_SEL 2>/dev/null || ip6tables -N ARK_IPV6_SEL 2>/dev/null
ip6tables -D FORWARD -i "\$lan_dev" -j ARK_IPV6_SEL 2>/dev/null || true
ip6tables -I FORWARD 1 -i "\$lan_dev" -j ARK_IPV6_SEL
EOF
			for m in $allowed_macs; do
				printf 'ip6tables -A ARK_IPV6_SEL -m mac --mac-source %s -j RETURN\n' "$m" >> "$apply_sh"
			done
			cat << 'EOF' >> "$apply_sh"
ip6tables -A ARK_IPV6_SEL -j REJECT --reject-with icmp6-adm-prohibited
EOF
		else
			if [ -z "$blocked_macs" ]; then
				clean_ipv6_selective_firewall
				return 0
			fi
			cat << EOF > "$apply_sh"
#!/bin/sh
lan_dev="\$(uci -q get network.lan.device || uci -q get network.lan.ifname || echo br-lan)"
ip6tables -F ARK_IPV6_SEL 2>/dev/null || ip6tables -N ARK_IPV6_SEL 2>/dev/null
ip6tables -D FORWARD -i "\$lan_dev" -j ARK_IPV6_SEL 2>/dev/null || true
ip6tables -I FORWARD 1 -i "\$lan_dev" -j ARK_IPV6_SEL
EOF
			for m in $blocked_macs; do
				printf 'ip6tables -A ARK_IPV6_SEL -m mac --mac-source %s -j REJECT --reject-with icmp6-adm-prohibited\n' "$m" >> "$apply_sh"
			done
		fi
		chmod +x "$apply_sh"
		/bin/sh "$apply_sh" 2>/dev/null || true
		uci -q set firewall.ark_ipv6_selective=include
		uci -q set firewall.ark_ipv6_selective.type=script
		uci -q set "firewall.ark_ipv6_selective.path=$apply_sh"
		uci commit firewall
	fi
}

set_ipv6_mode() {
	mode="$1"
	case "$mode" in
		ipv4_only)
			disable_ipv6_full
			clean_ipv6_selective_firewall
			uci -q set equipe_dashboard.ipv6=ipv6
			uci -q set equipe_dashboard.ipv6.mode='ipv4_only'
			uci commit equipe_dashboard
			(sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/rpcd restart >/dev/null 2>&1 || true) &
			echo ok
			;;
		dual_stack)
			enable_ipv6_dual_stack
			sync_ipv6_selective_firewall
			uci -q delete dhcp.lan.ignore
			uci commit dhcp
			uci -q set equipe_dashboard.ipv6=ipv6
			uci -q set equipe_dashboard.ipv6.mode='dual_stack'
			uci commit equipe_dashboard
			(sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/rpcd restart >/dev/null 2>&1 || true) &
			echo ok
			;;
		selective)
			enable_ipv6_dual_stack
			sync_ipv6_selective_firewall
			uci -q delete dhcp.lan.ignore
			uci commit dhcp
			uci -q set equipe_dashboard.ipv6=ipv6
			uci -q set equipe_dashboard.ipv6.mode='selective'
			uci commit equipe_dashboard
			(sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/rpcd restart >/dev/null 2>&1 || true) &
			echo ok
			;;
		ipv6_only)
			enable_ipv6_dual_stack
			clean_ipv6_selective_firewall
			uci -q set dhcp.lan.ignore='1'
			uci commit dhcp
			uci -q set equipe_dashboard.ipv6=ipv6
			uci -q set equipe_dashboard.ipv6.mode='ipv6_only'
			uci commit equipe_dashboard
			(sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/rpcd restart >/dev/null 2>&1 || true) &
			echo ok
			;;
		*)
			echo "Modo invalido: $mode (use: ipv4_only, dual_stack, selective, ipv6_only)" >&2
			exit 2
			;;
	esac
}

set_ipv6_relay() {
	state="$1"
	case "$state" in 1|true) state=1 ;; *) state=0 ;; esac
	uci -q set equipe_dashboard.ipv6=ipv6
	uci -q set "equipe_dashboard.ipv6.relay=$state"
	uci commit equipe_dashboard

	mode="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"
	if [ "$mode" != "ipv4_only" ]; then
		if [ "$state" = 1 ]; then
			uci -q set dhcp.lan.dhcpv6='relay'
			uci -q set dhcp.lan.ra='relay'
			uci -q set dhcp.lan.ndp='relay'
			uci -q set dhcp.wan.dhcpv6='relay'
			uci -q set dhcp.wan.ra='relay'
			uci -q set dhcp.wan.ndp='relay'
			uci -q set dhcp.wan.master='1'
		else
			uci -q set dhcp.lan.dhcpv6='server'
			uci -q set dhcp.lan.ra='server'
			uci -q set dhcp.lan.ndp='disabled'
			uci -q delete dhcp.wan.dhcpv6
			uci -q delete dhcp.wan.ra
			uci -q delete dhcp.wan.ndp
			uci -q delete dhcp.wan.master
		fi
		uci commit dhcp
		[ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd restart >/dev/null 2>&1 || true
	fi
	echo ok
}

toggle_ipv6_device() {
	mac="$(printf '%s' "$1" | tr '-' ':' | tr 'a-f' 'A-F' | tr -d ' ')"
	valid_mac "$mac" || { echo 'MAC invalido' >&2; exit 2; }
	case "$2" in 1|true) state=1 ;; *) state=0 ;; esac
	name_section="device_$(printf '%s' "$mac" | tr -d ':')"
	uci -q set "equipe_devices.$name_section=device"
	uci -q set "equipe_devices.$name_section.mac=$mac"
	uci -q set "equipe_devices.$name_section.ipv6_allowed=$state"
	uci commit equipe_devices

	mode="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"
	if [ "$mode" = "selective" ]; then
		sync_ipv6_selective_firewall
	fi
	echo ok
}

get_ipv6_status() {
	mode="$(uci -q get equipe_dashboard.ipv6.mode || echo 'dual_stack')"
	relay="$(uci -q get equipe_dashboard.ipv6.relay || echo '0')"
	wan6_proto="$(uci -q get network.wan6.proto || echo 'none')"
	wan6_dev="$(uci -q get network.wan6.device || echo '')"
	
	lan_dev="$(uci -q get network.lan.device || uci -q get network.lan.ifname || echo br-lan)"
	prefix_delegated="$(ip -6 route show 2>/dev/null | grep -E 'proto (kernel|ra|static)' | grep -v 'fe80::' | grep -v 'fd00:' | head -n 1 | awk '{print $1}')"
	lan_ip6="$(ip -6 addr show dev "$lan_dev" scope global 2>/dev/null | grep -v 'fd00:' | grep 'inet6' | head -n 1 | awk '{print $2}')"
	ula_ip6="$(ip -6 addr show dev "$lan_dev" scope global 2>/dev/null | grep 'fd00:' | grep 'inet6' | head -n 1 | awk '{print $2}')"
	ula_prefix="$(uci -q get network.globals.ula_prefix || echo '')"
	filter_aaaa="$(uci -q get dhcp.@dnsmasq[0].filter_aaaa || echo '0')"
	odhcpd_active="$(pidof odhcpd >/dev/null && echo 'true' || echo 'false')"

	allowed_macs=""
	first=1
	if [ -f /etc/config/equipe_devices ]; then
		sections="$(uci -q show equipe_devices 2>/dev/null | grep '=device$' | cut -d. -f2 | cut -d= -f1)"
		for s in $sections; do
			if [ "$(uci -q get "equipe_devices.$s.ipv6_allowed")" = "1" ]; then
				mac="$(uci -q get "equipe_devices.$s.mac")"
				if [ -n "$mac" ]; then
					[ "$first" = 1 ] && first=0 || allowed_macs="$allowed_macs,"
					allowed_macs="$allowed_macs\"$mac\""
				fi
			fi
		done
	fi

	cat <<EOF
{
  "mode": "$mode",
  "relay": $([ "$relay" = "1" ] && echo true || echo false),
  "wan6_proto": "$wan6_proto",
  "wan6_dev": "$wan6_dev",
  "prefix_delegated": "${prefix_delegated:-none}",
  "lan_ip6": "${lan_ip6:-none}",
  "ula_ip6": "${ula_ip6:-none}",
  "ula_prefix": "${ula_prefix:-none}",
  "filter_aaaa": $([ "$filter_aaaa" = "1" ] && echo true || echo false),
  "odhcpd_active": $odhcpd_active,
  "selective_allowed_macs": [$allowed_macs]
}
EOF
}

disable_ipv6_full() {
	ula="$(uci -q get network.globals.ula_prefix)"
	[ -n "$ula" ] && uci -q set "equipe_dashboard.ipv6.saved_ula=$ula"
	uci -q delete network.globals.ula_prefix
	uci -q delete network.lan.ip6assign
	uci -q delete network.lan.ip6hint
	uci -q delete network.lan.ip6ifaceid
	uci -q delete network.lan.delegate
	for iface in wan wan2 wan3 wan4; do
		uci -q set "network.$iface.delegate=0"
		uci -q set "network.$iface.ipv6=0"
	done
	uci -q delete network.wan6
	uci -q delete network.wan_6
	uci -q delete network.wan2_6
	uci -q set dhcp.lan.dhcpv6=disabled
	uci -q set dhcp.lan.ra=disabled
	uci -q set dhcp.lan.ndp=disabled
	uci -q set dhcp.@dnsmasq[0].filter_aaaa=1
	uci -q delete dhcp.lan.ra_slaac
	uci -q delete dhcp.lan.ra_flags
	uci -q delete dhcp.lan.ra_management
	uci -q show dhcp 2>/dev/null | sed -n "s/^\(dhcp\.[^.]*\)\.\(dhcpv6\|ra\|ndp\|ra_slaac\|ra_flags\|ra_management\)=.*/\1.\2/p" | while read -r opt; do
		case "$opt" in
			*.dhcpv6|*.ra|*.ndp) uci -q set "$opt=disabled" ;;
			*) uci -q delete "$opt" ;;
		esac
	done
	zone="$(firewall_wan_zone_section)"
	[ -n "$zone" ] && uci -q del_list "firewall.$zone.network=wan6" 2>/dev/null || true
	while :; do
		sec="$(uci -q show firewall 2>/dev/null | awk -F= '/\.family='\''ipv6'\''/ { s=$1; sub(/^firewall\./, "", s); sub(/\.family$/, "", s); print s; exit } /\.name=.*ICMPv6/ { s=$1; sub(/^firewall\./, "", s); sub(/\.name$/, "", s); print s; exit }')"
		[ -n "$sec" ] || break
		uci -q delete "firewall.$sec"
	done
	uci commit network
	uci commit dhcp
	uci commit firewall
	[ -x /etc/init.d/odhcp6c ] && /etc/init.d/odhcp6c disable >/dev/null 2>&1 || true
	[ -x /etc/init.d/odhcp6c ] && /etc/init.d/odhcp6c stop >/dev/null 2>&1 || true
	[ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd disable >/dev/null 2>&1 || true
	[ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd stop >/dev/null 2>&1 || true
	killall odhcp6c >/dev/null 2>&1 || true
	sysctl_ipv6_conf="/etc/sysctl.d/99-ark-router-disable-ipv6.conf"
	[ -n "${ARK_ROOT}" ] && sysctl_ipv6_conf="${ARK_ROOT}/etc/sysctl.d/99-ark-router-disable-ipv6.conf"
	mkdir -p "$(dirname "$sysctl_ipv6_conf")"
	cat >"$sysctl_ipv6_conf" <<'EOF'
net.ipv6.conf.all.disable_ipv6=1
net.ipv6.conf.default.disable_ipv6=1
net.ipv6.conf.lo.disable_ipv6=1
EOF
	sysctl -w net.ipv6.conf.all.disable_ipv6=1 >/dev/null 2>&1 || true
	sysctl -w net.ipv6.conf.default.disable_ipv6=1 >/dev/null 2>&1 || true
	sysctl -w net.ipv6.conf.lo.disable_ipv6=1 >/dev/null 2>&1 || true
	lan_dev="$(uci -q get network.lan.device || uci -q get network.lan.ifname || echo br-lan)"
	ip -6 addr flush dev "$lan_dev" scope global >/dev/null 2>&1 || true
	ip -6 route flush dev "$lan_dev" >/dev/null 2>&1 || true
	sync_adguard_ipv6 false
}

firewall_wan_zone_section() {
	uci -q show firewall 2>/dev/null | awk -F= '
		/\.name='\''wan'\''$/ { s=$1; sub(/^firewall\./, "", s); sub(/\.name$/, "", s); print s; exit }
	'
}

firewall_zone_has_network() {
	section="$1"; network="$2"
	uci -q get "firewall.$section.network" 2>/dev/null | tr ' ' '\n' | grep -qx "$network"
}

lan_bridge_port_count() {
	br="$(lan_bridge_section)"
	[ -n "$br" ] || { printf 0; return 0; }
	uci -q get "network.$br.ports" 2>/dev/null | wc -w
}

active_wan_networks() {
	uci -q show network 2>/dev/null | sed -n 's/^network\.\(wan[0-9]*\)=interface$/\1/p' | while IFS= read -r network_section; do
		proto="$(uci -q get "network.$network_section.proto")"
		case "$proto" in dhcp|pppoe|static) printf '%s\n' "$network_section" ;; esac
	done
}

sqm_section_for_network() {
	case "$1" in wan) printf wan1 ;; wan[0-9]*) printf '%s' "$1" ;; *) return 1 ;; esac
}

sqm_device_for_network() {
	network_section="$1"
	proto="$(uci -q get "network.$network_section.proto")"
	if [ "$proto" = pppoe ]; then
		printf 'pppoe-%s' "$network_section"
		return 0
	fi
	device="$(ubus call "network.interface.$network_section" status 2>/dev/null | jsonfilter -e '@.l3_device' 2>/dev/null)"
	[ -n "$device" ] || device="$(uci -q get "network.$network_section.device")"
	[ -n "$device" ] || device="$network_section"
	printf '%s' "$device"
}

mwan3_reorder_rules() {
	uci -q reorder "mwan3.bypass_pvt192=0" 2>/dev/null || true
	uci -q reorder "mwan3.bypass_pvt10=1" 2>/dev/null || true
	uci -q reorder "mwan3.bypass_pvt172=2" 2>/dev/null || true
	order_idx=3
	for r in $(uci -q show mwan3 2>/dev/null | grep '=rule$' | cut -d. -f2 | cut -d= -f1 | grep -E '^d_[0-9a-f]{12}$|^ark_dev_'); do
		uci -q reorder "mwan3.$r=$order_idx" 2>/dev/null || true
		order_idx=$((order_idx + 1))
	done
	uci -q reorder "mwan3.dns_udp=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.dns_tcp=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.wireguard_udp=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.dev_pool1=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.dev_pool2=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.ssh=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.whatsapp_tcp=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.whatsapp_udp=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.https=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.https_quic=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	for r in $(uci -q show mwan3 2>/dev/null | grep '=rule$' | cut -d. -f2 | cut -d= -f1 | grep -E '^ark_rule_|^ark_pbr_|^torrent_|^tor_|^pbr_'); do
		uci -q reorder "mwan3.$r=$order_idx" 2>/dev/null || true
		order_idx=$((order_idx + 1))
	done
	uci -q reorder "mwan3.default_rule_v4=99" 2>/dev/null || true
}

get_configured_ping_track_ips() {
	local target="$(uci -q get equipe_dashboard.main.ping_target 2>/dev/null)"
	[ -n "$target" ] || target="registro_br"
	local custom_ip="$(uci -q get equipe_dashboard.main.ping_custom_ip 2>/dev/null)"
	local primary=""
	case "$target" in
		registro_br) primary="200.160.2.3" ;;
		cloudflare)  primary="1.1.1.1" ;;
		google)      primary="8.8.8.8" ;;
		quad9)       primary="9.9.9.9" ;;
		custom)      primary="${custom_ip:-200.160.2.3}" ;;
		isp)
			primary="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"
			[ -n "$primary" ] || primary="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].ptpaddress' 2>/dev/null)"
			[ -n "$primary" ] || primary="$(uci -q get network.wan.gateway || true)"
			;;
		*)           primary="200.160.2.3" ;;
	esac

	local ips=""
	[ -n "$primary" ] && ips="$primary"
	for fallback in 200.160.2.3 1.1.1.1 8.8.8.8 9.9.9.9 208.67.222.222; do
		case " $ips " in
			*" $fallback "*) ;;
			*) ips="${ips:+$ips }$fallback" ;;
		esac
	done
	[ -n "$ips" ] || ips="200.160.2.3 1.1.1.1 8.8.8.8 9.9.9.9 208.67.222.222"
	printf '%s\n' "$ips"
}

ensure_mwan3_ark_config() {
	[ -f /etc/config/mwan3 ] || return 0
	for sec in wan6 wanb wanb6 wanb_m1_w2 wanb_m1_w3 wanb_m2_w2 wan6_m1_w3 wan6_m2_w3 wanb6_m1_w2 wanb6_m1_w3 wanb6_m2_w2 wanb_only wan_wanb wanb_wan default_rule_v6 device_wan1_pref device_wan2_pref bypass_private; do
		uci -q delete "mwan3.$sec" 2>/dev/null || true
	done
	active_wans=""
	for w in $(uci -q show network | grep '=interface' | cut -d. -f2 | cut -d= -f1 | grep -E '^wan([0-9]+)?$'); do
		auto="$(uci -q get "network.$w.auto" || printf '1')"
		[ "$auto" != "0" ] || continue
		p="$(uci -q get "network.$w.proto" || printf 'none')"
		d="$(uci -q get "network.$w.device" || uci -q get "network.$w.ifname" || printf '')"
		if [ "$p" != "none" ] && [ "$p" != "dhcpv6" ] && [ "$w" != "wan6" ] && [ -n "$d" ]; then
			active_wans="$active_wans $w"
		fi
	done
	[ -n "$active_wans" ] || active_wans="wan"
	for p in wan_only wan2_only wan3_only wan4_only balanced wan_then_wan2 wan2_then_wan wan1_pref wan2_pref; do
		uci -q delete "mwan3.$p.use_member" 2>/dev/null || true
	done
	wan_idx=1
	track_ips="$(get_configured_ping_track_ips)"
	[ -n "$track_ips" ] || track_ips="200.160.2.3 1.1.1.1 8.8.8.8 9.9.9.9 208.67.222.222"
	for w in $active_wans; do
		uci -q set "mwan3.$w=interface"
		uci -q set "mwan3.$w.enabled=1"
		uci -q set "mwan3.$w.family=ipv4"
		uci -q set "mwan3.$w.initial_state=offline"
		uci -q set "mwan3.$w.reliability=2"
		uci -q set "mwan3.$w.count=1"
		uci -q set "mwan3.$w.timeout=2"
		uci -q set "mwan3.$w.interval=5"
		uci -q set "mwan3.$w.down=3"
		uci -q set "mwan3.$w.up=3"
		uci -q delete "mwan3.$w.track_ip" 2>/dev/null || true
		for ip in $track_ips; do uci -q add_list "mwan3.$w.track_ip=$ip"; done
		# Fim da limpeza global destrutiva de conntrack (preserva sessoes ativas da WAN saudavel)
		uci -q delete "mwan3.$w.flush_conntrack" 2>/dev/null || true

		uci -q set "mwan3.${w}_m1_w3=member"
		uci -q set "mwan3.${w}_m1_w3.interface=$w"
		uci -q set "mwan3.${w}_m1_w3.metric=1"
		uci -q set "mwan3.${w}_m1_w3.weight=3"

		uci -q set "mwan3.${w}_m${wan_idx}_w3=member"
		uci -q set "mwan3.${w}_m${wan_idx}_w3.interface=$w"
		uci -q set "mwan3.${w}_m${wan_idx}_w3.metric=$wan_idx"
		uci -q set "mwan3.${w}_m${wan_idx}_w3.weight=3"

		uci -q set "mwan3.${w}_only=policy"
		uci -q add_list "mwan3.${w}_only.use_member=${w}_m1_w3"

		uci -q set mwan3.balanced=policy
		uci -q add_list "mwan3.balanced.use_member=${w}_m1_w3"

		uci -q set mwan3.wan_then_wan2=policy
		uci -q add_list "mwan3.wan_then_wan2.use_member=${w}_m${wan_idx}_w3"

		wan_idx=$((wan_idx + 1))
	done
	# Politica especifica de Failover com WAN2 como principal e WAN1 como reserva
	uci -q set "mwan3.wan2_m1_w3=member"
	uci -q set "mwan3.wan2_m1_w3.interface=wan2"
	uci -q set "mwan3.wan2_m1_w3.metric=1"
	uci -q set "mwan3.wan2_m1_w3.weight=3"
	uci -q set "mwan3.wan_m2_w3=member"
	uci -q set "mwan3.wan_m2_w3.interface=wan"
	uci -q set "mwan3.wan_m2_w3.metric=2"
	uci -q set "mwan3.wan_m2_w3.weight=3"
	uci -q set mwan3.wan2_then_wan=policy
	uci -q add_list "mwan3.wan2_then_wan.use_member=wan2_m1_w3"
	uci -q add_list "mwan3.wan2_then_wan.use_member=wan_m2_w3"

	# Politicas estaveis por dispositivo (Device Pinning com failover seletivo) - max 15 chars
	uci -q set mwan3.wan1_pref=policy
	uci -q add_list "mwan3.wan1_pref.use_member=wan_m1_w3"
	uci -q add_list "mwan3.wan1_pref.use_member=wan2_m2_w3"

	uci -q set mwan3.wan2_pref=policy
	uci -q add_list "mwan3.wan2_pref.use_member=wan2_m1_w3"
	uci -q add_list "mwan3.wan2_pref.use_member=wan_m2_w3"

	# 1. Regras 0-2: Bypass estrito de redes privadas RFC1918 (LAN, ONUs, Starlink, ZeroTier)
	uci -q set mwan3.bypass_pvt192=rule
	uci -q set mwan3.bypass_pvt192.family=ipv4
	uci -q set mwan3.bypass_pvt192.dest_ip='192.168.0.0/16'
	uci -q set mwan3.bypass_pvt192.use_policy=default

	uci -q set mwan3.bypass_pvt10=rule
	uci -q set mwan3.bypass_pvt10.family=ipv4
	uci -q set mwan3.bypass_pvt10.dest_ip='10.0.0.0/8'
	uci -q set mwan3.bypass_pvt10.use_policy=default

	uci -q set mwan3.bypass_pvt172=rule
	uci -q set mwan3.bypass_pvt172.family=ipv4
	uci -q set mwan3.bypass_pvt172.dest_ip='172.16.0.0/12'
	uci -q set mwan3.bypass_pvt172.use_policy=default

	# 2. Regras de Pools por Dispositivo (apenas se modo balanced_devices estiver explicitamente selecionado e Auto-WAN nao estiver desativado)
	current_mwan_mode="$(uci -q get equipe_dashboard.mwan.mode || printf 'failover')"
	if [ "$current_mwan_mode" = "balanced_devices" ]; then
		lan_net="$(uci -q get "network.lan.ipaddr" || printf '192.168.73.1')"
		lan_prefix="$(printf '%s' "$lan_net" | cut -d. -f1-3)"
		[ -n "$lan_prefix" ] || lan_prefix="192.168.73"
		uci -q set mwan3.dev_pool1=rule
		uci -q set mwan3.dev_pool1.family=ipv4
		uci -q set "mwan3.dev_pool1.src_ip=${lan_prefix}.0/25"
		uci -q set mwan3.dev_pool1.dest_ip='0.0.0.0/0'
		uci -q set mwan3.dev_pool1.use_policy=wan1_pref
		uci -q set mwan3.dev_pool1.enabled=1

		uci -q set mwan3.dev_pool2=rule
		uci -q set mwan3.dev_pool2.family=ipv4
		uci -q set "mwan3.dev_pool2.src_ip=${lan_prefix}.128/25"
		uci -q set mwan3.dev_pool2.dest_ip='0.0.0.0/0'
		uci -q set mwan3.dev_pool2.use_policy=wan2_pref
		uci -q set mwan3.dev_pool2.enabled=1
	else
		uci -q delete mwan3.dev_pool1
		uci -q delete mwan3.dev_pool2
	fi

	# Regras de DNS de Ultra-Baixa Latencia (Sem Sticky / Failover Instantaneo)
	uci -q set mwan3.dns_udp=rule
	uci -q set mwan3.dns_udp.family=ipv4
	uci -q set mwan3.dns_udp.proto=udp
	uci -q set mwan3.dns_udp.dest_port=53
	uci -q set mwan3.dns_udp.sticky=0
	[ -n "$(uci -q get mwan3.dns_udp.use_policy)" ] || uci -q set mwan3.dns_udp.use_policy=wan_then_wan2

	uci -q set mwan3.dns_tcp=rule
	uci -q set mwan3.dns_tcp.family=ipv4
	uci -q set mwan3.dns_tcp.proto=tcp
	uci -q set mwan3.dns_tcp.dest_port='53,853'
	uci -q set mwan3.dns_tcp.sticky=0
	[ -n "$(uci -q get mwan3.dns_tcp.use_policy)" ] || uci -q set mwan3.dns_tcp.use_policy=wan_then_wan2

	# Regra de WireGuard VPN (Resiliente / Sem Sticky / Failover Imediato)
	uci -q set mwan3.wireguard_udp=rule
	uci -q set mwan3.wireguard_udp.family=ipv4
	uci -q set mwan3.wireguard_udp.proto=udp
	uci -q set mwan3.wireguard_udp.dest_port='51820,51821'
	uci -q set mwan3.wireguard_udp.sticky=0
	uci -q set mwan3.wireguard_udp.timeout=60
	[ -n "$(uci -q get mwan3.wireguard_udp.use_policy)" ] || uci -q set mwan3.wireguard_udp.use_policy=wan_then_wan2

	# 3. Regras Criticas Essenciais
	uci -q set mwan3.ssh=rule
	uci -q set mwan3.ssh.dest_port=22
	uci -q set mwan3.ssh.family=ipv4
	uci -q set mwan3.ssh.proto=tcp
	uci -q set mwan3.ssh.sticky=1
	uci -q set mwan3.ssh.timeout=3600
	[ -n "$(uci -q get mwan3.ssh.use_policy)" ] || uci -q set mwan3.ssh.use_policy=wan_then_wan2

	uci -q set mwan3.whatsapp_tcp=rule
	uci -q set mwan3.whatsapp_tcp.dest_port='5222,5228,5242'
	uci -q set mwan3.whatsapp_tcp.family=ipv4
	uci -q set mwan3.whatsapp_tcp.proto=tcp
	uci -q set mwan3.whatsapp_tcp.sticky=1
	uci -q set mwan3.whatsapp_tcp.timeout=3600
	[ -n "$(uci -q get mwan3.whatsapp_tcp.use_policy)" ] || uci -q set mwan3.whatsapp_tcp.use_policy=wan_then_wan2

	uci -q set mwan3.whatsapp_udp=rule
	uci -q set mwan3.whatsapp_udp.dest_port=3478
	uci -q set mwan3.whatsapp_udp.family=ipv4
	uci -q set mwan3.whatsapp_udp.proto=udp
	uci -q set mwan3.whatsapp_udp.sticky=1
	uci -q set mwan3.whatsapp_udp.timeout=3600
	[ -n "$(uci -q get mwan3.whatsapp_udp.use_policy)" ] || uci -q set mwan3.whatsapp_udp.use_policy=wan_then_wan2

	uci -q set mwan3.https=rule
	uci -q set mwan3.https.dest_port=443
	uci -q set mwan3.https.family=ipv4
	uci -q set mwan3.https.proto=tcp
	uci -q set mwan3.https.sticky=1
	uci -q set mwan3.https.timeout=600
	[ -n "$(uci -q get mwan3.https.use_policy)" ] || uci -q set mwan3.https.use_policy=wan_then_wan2

	uci -q set mwan3.https_quic=rule
	uci -q set mwan3.https_quic.dest_port=443
	uci -q set mwan3.https_quic.family=ipv4
	uci -q set mwan3.https_quic.proto=udp
	uci -q set mwan3.https_quic.sticky=1
	uci -q set mwan3.https_quic.timeout=3600
	[ -n "$(uci -q get mwan3.https_quic.use_policy)" ] || uci -q set mwan3.https_quic.use_policy=wan_then_wan2

	# 4. Regra Geral Catch-All (SEMPRE A ULTIMA REGRA)
	uci -q set mwan3.default_rule_v4=rule
	uci -q set mwan3.default_rule_v4.dest_ip='0.0.0.0/0'
	uci -q set mwan3.default_rule_v4.family=ipv4
	uci -q set mwan3.default_rule_v4.sticky=1
	[ -n "$(uci -q get mwan3.default_rule_v4.use_policy)" ] || uci -q set mwan3.default_rule_v4.use_policy=wan_then_wan2

	# Reordenacao estrita de prioridade no UCI
	mwan3_reorder_rules
}

mwan3_sync_lifecycle() {
	[ -x /etc/init.d/mwan3 ] || return 0
	[ -f /etc/config/mwan3 ] || return 0
	local active_cnt=0
	for w in $(uci -q show network | grep '=interface' | cut -d. -f2 | cut -d= -f1 | grep -E '^wan([0-9]+)?$'); do
		local auto="$(uci -q get "network.$w.auto" || echo '1')"
		[ "$auto" != "0" ] || continue
		local p="$(uci -q get "network.$w.proto" || echo 'none')"
		local d="$(uci -q get "network.$w.device" || uci -q get "network.$w.ifname" || echo '')"
		[ "$p" != "none" ] && [ -n "$d" ] && active_cnt=$((active_cnt + 1))
	done
	if [ "$active_cnt" -lt 2 ]; then
		logger -t equipe-mwan "Single-WAN detectado ($active_cnt interface WAN ativa). MWAN3 pausado em standby para economizar CPU/RAM."
		/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
		/etc/init.d/mwan3 disable >/dev/null 2>&1 || true
	else
		if [ "$(uci -q get equipe_dashboard.speedify.desired_state)" != "connected" ]; then
			logger -t equipe-mwan "Multi-WAN detectado ($active_cnt interfaces WAN ativas). Ativando servico MWAN3."
			/etc/init.d/mwan3 enable >/dev/null 2>&1 || true
			/etc/init.d/mwan3 restart >/dev/null 2>&1 || true
		fi
	fi
}

lan_bridge_section() {
	uci -q show network | awk -F= '/\.name=.br-lan./ { key=$1; sub(/^network\./, "", key); sub(/\.name$/, "", key); print key; exit }'
}

find_switch_vlan() {
	local target_vlan="$1"
	local idx=0
	while true; do
		local v="$(uci -q get "network.@switch_vlan[$idx].vlan")"
		[ -z "$v" ] && break
		if [ "$v" = "$target_vlan" ]; then
			echo "@switch_vlan[$idx]"
			return 0
		fi
		idx=$((idx + 1))
	done
	return 1
}

swconfig_remove_port_from_vlan() {
	local p="$1"
	local target_vlan="${2:-1}"
	local sec="$(find_switch_vlan "$target_vlan")"
	[ -n "$sec" ] || return 0
	local cur_ports="$(uci -q get "network.$sec.ports")"
	local new_ports=""
	for item in $cur_ports; do
		case "$item" in
			"$p"|"$p"t) continue ;;
			*) new_ports="$new_ports $item" ;;
		esac
	done
	new_ports="$(printf '%s' "$new_ports" | awk '{$1=$1};1')"
	uci -q set "network.$sec.ports=$new_ports"
}

swconfig_add_port_to_vlan() {
	local p="$1"
	local target_vlan="${2:-1}"
	local sec="$(find_switch_vlan "$target_vlan")"
	[ -n "$sec" ] || return 0
	local cur_ports="$(uci -q get "network.$sec.ports")"
	for item in $cur_ports; do
		if [ "$item" = "$p" ] || [ "$item" = "${p}t" ]; then
			return 0
		fi
	done
	local new_ports=""
	local added=0
	for item in $cur_ports; do
		if [ "$item" = "0t" ] && [ "$added" = 0 ]; then
			new_ports="$new_ports $p $item"
			added=1
		else
			new_ports="$new_ports $item"
		fi
	done
	[ "$added" = 1 ] || new_ports="$new_ports $p"
	new_ports="$(printf '%s' "$new_ports" | awk '{$1=$1};1')"
	uci -q set "network.$sec.ports=$new_ports"
}

bridge_has_port() {
	br="$1"; port="$2"
	uci -q get "network.$br.ports" 2>/dev/null | tr ' ' '\n' | grep -qx "$port"
}

add_lan_port() {
	port="$1"
	if is_swconfig; then
		p="$(printf '%s' "$port" | tr -cd '0-9')"
		[ -n "$p" ] && swconfig_add_port_to_vlan "$p" 1
		return 0
	fi
	br="$(lan_bridge_section)"
	[ -n "$br" ] || return 0
	bridge_has_port "$br" "$port" || uci -q add_list "network.$br.ports=$port"
}

remove_lan_port() {
	port="$1"
	if is_swconfig; then
		p="$(printf '%s' "$port" | tr -cd '0-9')"
		[ -n "$p" ] && swconfig_remove_port_from_vlan "$p" 1
		return 0
	fi
	br="$(lan_bridge_section)"
	[ -n "$br" ] || return 0
	uci -q del_list "network.$br.ports=$port" 2>/dev/null || true
}

apply_wan_proto() {
	iface="$1"; proto="$2"; username="$3"; password="$4"; ipaddr="$5"; netmask="$6"; gateway="$7"; dns="$8"; macaddr="$9"
	case "$proto" in dhcp|pppoe|static) ;; *) echo 'Protocolo WAN invalido' >&2; return 2 ;; esac
	uci -q set "network.$iface=interface"
	uci -q set "network.$iface.proto=$proto"
	uci -q delete "network.$iface.macaddr"
	uci -q delete "network.$iface.username"
	uci -q delete "network.$iface.ipaddr"
	uci -q delete "network.$iface.netmask"
	uci -q delete "network.$iface.gateway"
	if [ "$proto" = pppoe ]; then
		[ -n "$username" ] || { echo 'Usuario PPPoE obrigatorio' >&2; return 2; }
		[ -n "$password" ] || password="$(uci -q get "network.$iface.password" || true)"
		uci -q set "network.$iface.username=$username"
		uci -q delete "network.$iface.password"
		[ -n "$password" ] && uci -q set "network.$iface.password=$password"
	elif [ "$proto" = static ]; then
		valid_ipv4 "$ipaddr" && valid_ipv4 "$netmask" || { echo 'IPv4 estatico invalido' >&2; return 2; }
		[ -z "$gateway" ] || valid_ipv4 "$gateway" || { echo 'Gateway invalido' >&2; return 2; }
		uci -q set "network.$iface.ipaddr=$ipaddr"
		uci -q set "network.$iface.netmask=$netmask"
		[ -z "$gateway" ] || uci -q set "network.$iface.gateway=$gateway"
	fi
	uci -q set "network.$iface.peerdns=0"
	uci -q delete "network.$iface.dns"
	if [ -n "$dns" ]; then
		for server in $dns; do valid_ip "$server" || { echo "DNS WAN invalido: $server" >&2; return 2; }; uci -q add_list "network.$iface.dns=$server"; done
	fi
	if [ -n "$macaddr" ]; then
		uci -q set "network.$iface.macaddr=$macaddr"
	elif [ "$iface" != "wan" ]; then
		local base_mac="$(cat /sys/class/net/eth0/address 2>/dev/null || cat /sys/class/net/br-lan/address 2>/dev/null || echo "")"
		if [ -n "$base_mac" ]; then
			local idx="$(printf '%s' "$iface" | tr -cd '0-9')"
			[ -n "$idx" ] || idx=2
			local prefix="$(printf '%s' "$base_mac" | cut -d: -f1-5)"
			local last_hex="$(printf '%s' "$base_mac" | cut -d: -f6)"
			local last_dec=$(( 0x$last_hex + idx ))
			[ "$last_dec" -le 254 ] || last_dec=$(( 0x$last_hex - idx ))
			local new_hex="$(printf '%02x' "$last_dec")"
			uci -q set "network.$iface.macaddr=${prefix}:${new_hex}"
		fi
	fi
}

apply_wan_modem_access() {
	local iface="$1"
	local proto="$2"
	local modem_ip="$3"
	local effective_dev="$4"
	local zone="$(firewall_wan_zone_section 2>/dev/null || true)"

	if [ "$proto" = pppoe ] && [ -n "$modem_ip" ]; then
		local lan_ip="$(uci -q get network.lan.ipaddr || echo 192.168.73.1)"
		if [ "$(ipv4_prefix24 "$lan_ip")" = "$(ipv4_prefix24 "$modem_ip")" ]; then
			echo "O IP da ONU ($modem_ip) nao pode estar na mesma faixa da rede local LAN ($lan_ip)" >&2
			return 2
		fi
		local p1="$(printf '%s' "$modem_ip" | cut -d. -f1)"
		local p2="$(printf '%s' "$modem_ip" | cut -d. -f2)"
		local p3="$(printf '%s' "$modem_ip" | cut -d. -f3)"
		local p4="$(printf '%s' "$modem_ip" | cut -d. -f4)"
		local router_modem_ip
		if [ "$p4" = 254 ]; then
			router_modem_ip="${p1}.${p2}.${p3}.253"
		else
			router_modem_ip="${p1}.${p2}.${p3}.254"
		fi
		uci -q set "network.$iface.modem_ip=$modem_ip"
		uci -q set "network.${iface}_modem=interface"
		uci -q set "network.${iface}_modem.proto=static"
		uci -q set "network.${iface}_modem.device=$effective_dev"
		uci -q set "network.${iface}_modem.ifname=$effective_dev"
		uci -q set "network.${iface}_modem.ipaddr=$router_modem_ip"
		uci -q set "network.${iface}_modem.netmask=255.255.255.0"
		uci -q set "network.${iface}_modem.defaultroute=0"
		uci -q set "network.${iface}_modem.delegate=0"
		uci -q set "network.${iface}_modem.peerdns=0"
		if [ -n "$zone" ]; then
			firewall_zone_has_network "$zone" "${iface}_modem" || uci -q add_list "firewall.$zone.network=${iface}_modem"
		fi
	else
		uci -q delete "network.$iface.modem_ip"
		if [ "$(uci -q get "network.${iface}_modem")" = interface ]; then
			uci -q delete "network.${iface}_modem"
			[ -n "$zone" ] && uci -q del_list "firewall.$zone.network=${iface}_modem" 2>/dev/null || true
		fi
	fi
}

bind_uhttpd_to_lan_ip() {
	configure_uhttpd_listeners
	return 0
}

mwan3_toggle() {
	case "$1" in 1|on|true|enabled) desired=1 ;; 0|off|false|disabled) desired=0 ;; *) echo 'Estado do Multi-WAN invalido' >&2; return 2 ;; esac
	if [ ! -x /etc/init.d/mwan3 ]; then
		echo 'O pacote Multi-WAN (mwan3) não está instalado neste roteador.' >&2
		return 3
	fi
	if [ "$(uci -q get equipe_dashboard.speedify.desired_state || true)" = connected ]; then
		uci -q set equipe_dashboard.speedify.mwan3_previous="$desired"
		uci -q set equipe_dashboard.speedify.mwan3_state_saved=1
		uci -q commit equipe_dashboard
		/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
		echo paused
		return 0
	fi
	if [ "$desired" = 1 ]; then
		wan_count=0
		for ifc in $(uci show network 2>/dev/null | grep -E '^network\.wan[0-9]*=interface' | cut -d. -f2 | cut -d= -f1); do
			proto="$(uci -q get network.${ifc}.proto || true)"
			if [ -n "$proto" ] && [ "$proto" != "none" ]; then
				wan_count=$((wan_count + 1))
			fi
		done
		if [ "$wan_count" -lt 2 ]; then
			echo 'Multi-WAN requer pelo menos 2 conexões WAN configuradas para operar.' >&2
			return 4
		fi
		ensure_mwan3_ark_config
		uci commit mwan3 >/dev/null 2>&1 || true
		/etc/init.d/mwan3 enable >/dev/null 2>&1
		/etc/init.d/mwan3 restart >/dev/null 2>&1
	else
		/etc/init.d/mwan3 stop >/dev/null 2>&1
		/etc/init.d/mwan3 disable >/dev/null 2>&1
	fi
	echo "$desired"
}

handle_network() {
	case "$1" in
	wan-save)
		iface='' mode='wan' device='' proto='dhcp' username='' password='' ipaddr='' netmask='' gateway='' dns='' macaddr='' modem_ip='' metric='' ipv6='' delegate=''
		shift
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				delegate) case "$value" in 1|true|yes) delegate=1 ;; 0|false|no) delegate=0 ;; *) echo 'Delegate IPv6 invalido' >&2; exit 2 ;; esac ;;
				ipv6) case "$value" in 1|true|yes) ipv6=1 ;; 0|false|no) ipv6=0 ;; *) echo 'IPv6 WAN invalido' >&2; exit 2 ;; esac ;;
				metric)
					case "$value" in
						[1-9]|[1-9][0-9]|[1-9][0-9][0-9])
							if [ "$value" -ge 1 ] && [ "$value" -le 255 ]; then
								metric="$value"
							else
								echo 'Metrica WAN deve estar entre 1 e 255' >&2
								exit 2
							fi
							;;
						*) echo 'Metrica WAN invalida' >&2; exit 2 ;;
					esac
					;;
				iface) case "$value" in wan|wan[2-9]|wan[1-9][0-9]) iface="$value" ;; *) echo 'WAN invalida' >&2; exit 2 ;; esac ;;
				mode) case "$value" in wan|lan) mode="$value" ;; *) echo 'Modo da porta invalido' >&2; exit 2 ;; esac ;;
				device) valid_net_device "$value" || { echo 'Porta fisica invalida' >&2; exit 2; }; device="$value" ;;
				proto) case "$value" in dhcp|pppoe|static) proto="$value" ;; *) echo 'Protocolo invalido' >&2; exit 2 ;; esac ;;
				username) valid_plain "$value" 96 || { echo 'Usuario PPPoE invalido' >&2; exit 2; }; username="$value" ;;
				password) valid_plain "$value" 128 || { echo 'Senha PPPoE invalida' >&2; exit 2; }; password="$value" ;;
				ipaddr) [ -z "$value" ] || { clean_ip="$(printf '%s' "$value" | tr -d ' ,;\t\r\n')"; valid_ipv4 "$clean_ip" || { echo 'IP estatico invalido' >&2; exit 2; }; ipaddr="$clean_ip"; } ;;
				netmask) [ -z "$value" ] || { clean_nm="$(printf '%s' "$value" | tr -d ' ,;\t\r\n')"; valid_ipv4 "$clean_nm" || { echo 'Mascara invalida' >&2; exit 2; }; netmask="$clean_nm"; } ;;
				gateway) [ -z "$value" ] || { clean_gw="$(printf '%s' "$value" | tr -d ' ,;\t\r\n')"; valid_ipv4 "$clean_gw" || { echo 'Gateway invalido' >&2; exit 2; }; gateway="$clean_gw"; } ;;
				dns)
					val="$(printf '%s' "$value" | tr ',;\t' '  ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"
					valid_plain "$val" 120 || { echo 'DNS invalido' >&2; exit 2; }
					dns="$val"
					for server in $dns; do valid_ipv4 "$server" || { echo "DNS WAN invalido: $server" >&2; exit 2; }; done
					;;
				macaddr)
					if [ -n "$value" ]; then
						clean_mac="$(printf '%s' "$value" | tr '-' ':' | tr 'a-f' 'A-F' | tr -d ' ')"
						valid_mac_anycase "$clean_mac" || { echo 'MAC WAN invalido' >&2; exit 2; }
						macaddr="$clean_mac"
					fi
					;;
				modem_ip)
					if [ -n "$value" ]; then
						clean_mip="$(printf '%s' "$value" | tr -d ' ,;\t\r\n')"
						valid_ipv4 "$clean_mip" || { echo 'IP da ONU/Modem invalido' >&2; exit 2; }
						p4="$(printf '%s' "$clean_mip" | cut -d. -f4)"
						[ "$p4" -ge 1 ] && [ "$p4" -le 254 ] || { echo 'IP da ONU/Modem deve ser um endereco de host valido (1-254)' >&2; exit 2; }
						modem_ip="$clean_mip"
					fi
					;;
				*) echo "Campo WAN invalido: $key" >&2; exit 2 ;;
			esac
		done
		[ -n "$iface" ] || { echo 'WAN ausente' >&2; exit 2; }
		[ -n "$device" ] || device="$(uci -q get "network.$iface.device" || uci -q get "network.$iface.ifname")"
		[ "$iface" != wan ] || [ "$mode" = wan ] || { echo 'A WAN1 fisica nao pode virar LAN por este atalho' >&2; exit 2; }
		ez_backup >/dev/null || { echo 'Falha ao criar backup antes da alteracao WAN' >&2; exit 3; }
		if [ "$iface" != wan ] && [ "$mode" = lan ]; then
			old="$(uci -q get "network.$iface.ark_phys_port" || uci -q get "network.$iface.device" || uci -q get "network.$iface.ifname")"
			[ -n "$old" ] && [ "$old" != wan ] && add_lan_port "$old"
			if is_swconfig; then
				sw_ifname="$(uci -q get "network.$iface.ifname")"
				case "$sw_ifname" in
					eth0.[0-9]*)
						vlan_id="${sw_ifname#eth0.}"
						vsec="$(find_switch_vlan "$vlan_id")"
						[ -n "$vsec" ] && uci -q delete "network.$vsec"
						;;
				esac
			fi
			uci -q delete "network.${iface}_modem" 2>/dev/null || true
			uci -q delete "network.$iface"
			sqm_del_sec="$(sqm_section_for_network "$iface" 2>/dev/null || printf '%s' "$iface")"
			uci -q set "sqm.$sqm_del_sec.enabled=0" 2>/dev/null || true
			uci -q delete "sqm.$sqm_del_sec" 2>/dev/null || true
			zone="$(firewall_wan_zone_section)"
			if [ -n "$zone" ]; then
				uci -q del_list "firewall.$zone.network=$iface" 2>/dev/null || true
				uci -q del_list "firewall.$zone.network=${iface}_modem" 2>/dev/null || true
			fi
			[ -f /etc/config/mwan3 ] && {
				uci -q delete "mwan3.$iface" 2>/dev/null || true
				ensure_mwan3_ark_config
			}
			uci commit network
			uci commit firewall 2>/dev/null || true
			uci commit sqm 2>/dev/null || true
			uci commit mwan3 2>/dev/null || true
			/etc/init.d/network reload >/dev/null 2>&1 || true
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			([ -x /etc/init.d/sqm ] && /etc/init.d/sqm restart >/dev/null 2>&1 &)
			mwan3_sync_lifecycle &
			starlink_setup_policy_routing >/dev/null 2>&1 || true
			echo ok
			exit 0
		fi

		old="$(uci -q get "network.$iface.ark_phys_port" || uci -q get "network.$iface.device" || uci -q get "network.$iface.ifname")"
		[ "$iface" != wan ] && [ -n "$old" ] && [ "$old" != "$device" ] && [ "$old" != wan ] && add_lan_port "$old"
		[ "$device" != wan ] && remove_lan_port "$device"

		effective_dev="$device"
		if is_swconfig; then
			p_num="$(printf '%s' "$device" | tr -cd '0-9')"
			if [ -n "$p_num" ] && [ "$p_num" -ge 1 ] && [ "$p_num" -le 5 ]; then
				if [ "$iface" = wan ]; then
					vlan_id=2
				else
					idx="$(printf '%s' "$iface" | sed 's/[^0-9]//g')"
					[ -n "$idx" ] || idx=2
					vlan_id=$((idx + 1))
				fi
				vsec="$(find_switch_vlan "$vlan_id")"
				if [ -z "$vsec" ]; then
					vsec="$(uci -q add network switch_vlan)"
					uci -q set "network.$vsec.device=switch0"
					uci -q set "network.$vsec.vlan=$vlan_id"
				fi
				uci -q set "network.$vsec.ports=$p_num 0t"
				effective_dev="eth0.$vlan_id"
			fi
		else
			if [ "$effective_dev" = "wan" ] && [ ! -e "/sys/class/net/wan" ]; then
				if [ -e "/sys/class/net/eth1" ]; then
					effective_dev="eth1"
				fi
			fi
		fi

		uci -q set "network.$iface=interface"
		uci -q set "network.$iface.device=$effective_dev"
		uci -q set "network.$iface.ifname=$effective_dev"
		[ -n "$device" ] && uci -q set "network.$iface.ark_phys_port=$device"

		idx="$(printf '%s' "$iface" | sed 's/[^0-9]//g')"
		[ -n "$idx" ] || idx=1
		default_metric=$((idx * 10))
		[ -n "$metric" ] || metric="$default_metric"

		# Validacao de prioridade/metrica duplicada (nao pode existir duas WANs ativas com o mesmo peso)
		for other_wan in $(uci -q show network 2>/dev/null | grep -E '^network\.wan[0-9]*=interface' | cut -d. -f2 | cut -d= -f1); do
			[ "$other_wan" != "$iface" ] && [ "$other_wan" != "wan6" ] || continue
			other_proto="$(uci -q get "network.$other_wan.proto")"
			[ -n "$other_proto" ] && [ "$other_proto" != "none" ] || continue
			other_m="$(uci -q get "network.$other_wan.metric")"
			if [ -n "$other_m" ] && [ "$other_m" -eq "$metric" ] 2>/dev/null; then
				echo "Conflito de prioridade: A interface $other_wan ja utiliza a metrica $metric. Cada WAN deve ter um peso exclusivo para evitar instabilidade de rotas." >&2
				exit 2
			fi
		done

		uci -q set "network.$iface.metric=$metric"
		uci -q set "network.$iface.ip6metric=$metric"
		if [ -n "$ipv6" ]; then
			uci -q set "network.$iface.ipv6=$ipv6"
			if [ "$ipv6" = "1" ]; then
				uci -q delete "network.$iface.accept_ra" 2>/dev/null || true
				uci -q delete "network.$iface.send_rs" 2>/dev/null || true
			else
				uci -q set "network.$iface.accept_ra=0"
				uci -q set "network.$iface.send_rs=0"
			fi
		fi
		if [ -n "$delegate" ]; then
			if [ "$delegate" = "1" ]; then
				uci -q set "network.$iface.delegate=1"
				[ -n "$(uci -q get "network.${iface}6")" ] && uci -q set "network.${iface}6.delegate=1"
				[ -n "$(uci -q get "network.${iface}_6")" ] && uci -q set "network.${iface}_6.delegate=1"
				# Exclusividade mutua: apenas uma WAN distribui bloco IPv6 para a LAN por vez
				for other_w in $(uci -q show network 2>/dev/null | grep -E '^network\.wan[0-9_]*=interface' | cut -d. -f2 | cut -d= -f1); do
					case "$other_w" in
						"$iface"|"${iface}6"|"${iface}_6") ;;
						*)
							uci -q set "network.$other_w.delegate=0"
							;;
					esac
				done
			else
				uci -q set "network.$iface.delegate=0"
				[ -n "$(uci -q get "network.${iface}6")" ] && uci -q set "network.${iface}6.delegate=0"
				[ -n "$(uci -q get "network.${iface}_6")" ] && uci -q set "network.${iface}_6.delegate=0"
			fi
		fi
		sqm_sec="$(sqm_section_for_network "$iface" 2>/dev/null || true)"
		if [ -n "$sqm_sec" ] && uci -q get "sqm.$sqm_sec" >/dev/null 2>&1; then
			if [ "$proto" = pppoe ]; then
				uci -q set "sqm.$sqm_sec.interface=pppoe-$iface"
			else
				uci -q set "sqm.$sqm_sec.interface=$effective_dev"
			fi
		fi
		apply_wan_proto "$iface" "$proto" "$username" "$password" "$ipaddr" "$netmask" "$gateway" "$dns" "$macaddr" || exit $?

		zone="$(firewall_wan_zone_section)"
		apply_wan_modem_access "$iface" "$proto" "$modem_ip" "$effective_dev" || exit $?

		if [ -n "$zone" ]; then
			firewall_zone_has_network "$zone" "$iface" || uci -q add_list "firewall.$zone.network=$iface"
			uci commit firewall
		fi
		[ -f /etc/config/mwan3 ] && {
			ensure_mwan3_ark_config
			uci commit mwan3
		}
		uci commit network
		/etc/init.d/network reload >/dev/null 2>&1 || true
		/etc/init.d/firewall reload >/dev/null 2>&1 || true
		mwan3_sync_lifecycle &
		starlink_setup_policy_routing >/dev/null 2>&1 || true
		echo ok
		;;
	lan-status)
		lan_ip="$(uci -q get network.lan.ipaddr || printf 192.168.1.1)"
		netmask="$(uci -q get network.lan.netmask || printf 255.255.255.0)"
		start="$(uci -q get dhcp.lan.start || printf 100)"
		limit="$(uci -q get dhcp.lan.limit || printf 150)"
		prefix="$(ipv4_prefix24 "$lan_ip")"
		start_host="$start"
		end_host=$((start + limit - 1))
		[ "$end_host" -le 254 ] || end_host=254
		dns_values="$(lan_dhcp_dns_values | tr '\n' ' ' | sed 's/[[:space:]]*$//')"
		ipv6_mode="$(uci -q get equipe_dashboard.ipv6.mode || printf dual_stack)"
		ipv6_relay="$(uci -q get equipe_dashboard.ipv6.relay || printf 0)"
		ipv6_label="Pilha Dupla Global"
		case "$ipv6_mode" in
			ipv4_only) ipv6_label="Desativado (IPv4 Puro)" ;;
			selective) ipv6_label="Seletivo por MAC" ;;
			ipv6_only) ipv6_label="IPv6-Only" ;;
			*)
				if [ "$ipv6_relay" = "1" ] || [ "$(uci -q get dhcp.lan.ndp)" = "relay" ]; then
					ipv6_label="Cascata (NDP Relay)"
				else
					ipv6_label="Pilha Dupla Global"
				fi
				;;
		esac
		printf '{"ipaddr":"%s","netmask":"%s","dhcp_start":"%s.%s","dhcp_end":"%s.%s","start":"%s","limit":"%s","preset":"%s","supported":%s,"ipv6_mode":"%s","ipv6_relay":"%s","ipv6_label":"%s","dns":[' \
			"$(json_escape "$lan_ip")" "$(json_escape "$netmask")" "$prefix" "$start_host" "$prefix" "$end_host" "$start" "$limit" \
			"$(case "$lan_ip" in 192.168.*) printf 192 ;; 10.0.*) printf 10 ;; *) printf manual ;; esac)" \
			"$( [ "$netmask" = 255.255.255.0 ] && printf true || printf false )" \
			"$(json_escape "$ipv6_mode")" "$(json_escape "$ipv6_relay")" "$(json_escape "$ipv6_label")"
		first=1
		for server in $dns_values; do
			[ "$first" = 1 ] || printf ','
			first=0
			printf '"%s"' "$(json_escape "$server")"
		done
		printf ']}\n'
		;;
	lan-save)
		mode='manual'; router_ip=''; start_ip=''; end_ip=''; netmask='255.255.255.0'; dns=''
		shift
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				mode) case "$value" in preset192|preset10|manual) mode="$value" ;; *) echo 'Modo LAN invalido' >&2; exit 2 ;; esac ;;
				router_ip) router_ip="$value" ;;
				start_ip) start_ip="$value" ;;
				end_ip) end_ip="$value" ;;
				netmask) netmask="$value" ;;
				dns) dns="$(printf '%s' "$value" | tr ',' ' ')" ;;
				*) echo "Campo LAN invalido: $key" >&2; exit 2 ;;
			esac
		done
		case "$mode" in
			preset192)
				[ -n "$router_ip" ] || router_ip='192.168.1.1'
				[ -n "$start_ip" ] || start_ip='192.168.1.10'
				[ -n "$end_ip" ] || end_ip='192.168.1.254'
				;;
			preset10)
				[ -n "$router_ip" ] || router_ip='10.0.0.1'
				[ -n "$start_ip" ] || start_ip='10.0.0.10'
				[ -n "$end_ip" ] || end_ip='10.0.0.254'
				;;
		esac
		valid_lan_dhcp_range "$router_ip" "$netmask" "$start_ip" "$end_ip" || { echo 'Use IPs validos na mesma rede /24. O DHCP deve comecar antes de terminar e nao pode incluir o IP do roteador.' >&2; exit 2; }
		validate_dns_list "$dns" || { echo 'DNS DHCP invalido. Use ate 3 enderecos IPv4 validos ou deixe vazio para nao enviar DNS fixo.' >&2; exit 2; }
		if [ -n "$(uci -q get network.guest.ipaddr)" ] && [ "$(ipv4_prefix24 "$(uci -q get network.guest.ipaddr)")" = "$(ipv4_prefix24 "$router_ip")" ]; then
			echo 'A LAN principal nao pode usar a mesma rede da visitante.' >&2
			exit 2
		fi
		for iface_check in wan wan2 wan_modem wan2_modem; do
			other_ip="$(uci -q get "network.$iface_check.ipaddr" || true)"
			if [ -n "$other_ip" ] && [ "$(ipv4_prefix24 "$other_ip")" = "$(ipv4_prefix24 "$router_ip")" ]; then
				echo "A rede LAN ($router_ip) nao pode usar a mesma faixa da interface $iface_check ($other_ip)." >&2
				exit 2
			fi
		done
		ez_backup >/dev/null || { echo 'Falha ao criar backup antes da alteracao da LAN' >&2; exit 3; }
		start_host="$(ipv4_host "$start_ip")"; end_host="$(ipv4_host "$end_ip")"; limit=$((end_host - start_host + 1))
		old_ip="$(uci -q get network.lan.ipaddr || true)"
		if [ -n "$old_ip" ] && [ "$old_ip" != "$router_ip" ]; then
			new_dns=""
			for s in $dns; do
				if [ "$s" = "$old_ip" ]; then
					new_dns="${new_dns:+${new_dns} }$router_ip"
				else
					new_dns="${new_dns:+${new_dns} }$s"
				fi
			done
			dns="$new_dns"
		fi
		uci -q set network.lan.ipaddr="$router_ip"
		uci -q set network.lan.netmask="$netmask"
		uci -q set dhcp.lan=dhcp
		uci -q set dhcp.lan.interface=lan
		uci -q set dhcp.lan.start="$start_host"
		uci -q set dhcp.lan.limit="$limit"
		uci -q set dhcp.lan.leasetime="${DHCP_LEASETIME:-12h}"
		if [ -z "$dns" ] && [ "$(uci -q get dhcp.@dnsmasq[0].allservers)" = 1 ]; then
			apply_lan_dhcp_dns "$router_ip"
		else
			apply_lan_dhcp_dns "$dns"
		fi
		bind_uhttpd_to_lan_ip "$router_ip" || { echo 'Falha ao ajustar uHTTPd para o novo IP LAN' >&2; exit 3; }
		sanitize_dhcp_hostnames
		uci commit network
		uci commit dhcp
		(sleep 2; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/uhttpd restart >/dev/null 2>&1 || true) &
		printf '{"old_ip":"%s","new_ip":"%s","url":"http://%s/cgi-bin/luci/admin/equipe-dashboard"}\n' "$(json_escape "$old_ip")" "$(json_escape "$router_ip")" "$(json_escape "$router_ip")"
		;;
	mwan)
		device_mode=0
		uci -q set equipe_dashboard.mwan=config
		case "$2" in
			balanced_devices|balanced_device|devices)
				policy='wan_then_wan2'
				device_mode=1
				uci -q set equipe_dashboard.mwan.mode=balanced_devices
				;;
			failover|wan_then_wan2)
				policy='wan_then_wan2'
				uci -q set equipe_dashboard.mwan.mode=failover
				;;
			failover_wan2|wan2_then_wan)
				policy='wan2_then_wan'
				uci -q set equipe_dashboard.mwan.mode=failover_wan2
				;;
			balanced)
				policy='balanced'
				uci -q set equipe_dashboard.mwan.mode=balanced
				;;
			wan1|wan)
				policy='wan_only'
				uci -q set equipe_dashboard.mwan.mode=wan1
				;;
			wan2)
				policy='wan2_only'
				uci -q set equipe_dashboard.mwan.mode=wan2
				;;
			wan3)
				policy='wan3_only'
				uci -q set equipe_dashboard.mwan.mode=wan3
				;;
			wan4)
				policy='wan4_only'
				uci -q set equipe_dashboard.mwan.mode=wan4
				;;
			wan[0-9]*)
				policy="${2}_only"
				uci -q set equipe_dashboard.mwan.mode="$2"
				;;
			*) echo 'Modo invalido' >&2; exit 2 ;;
		esac
		uci commit equipe_dashboard
		ensure_mwan3_ark_config
		if [ "$device_mode" = "1" ]; then
			uci -q set mwan3.dev_pool1.enabled=1
			uci -q set mwan3.dev_pool2.enabled=1
		else
			uci -q delete mwan3.dev_pool1
			uci -q delete mwan3.dev_pool2
		fi
		uci -q set mwan3.dns_udp.use_policy="$policy"
		uci -q set mwan3.dns_udp.sticky=0
		uci -q set mwan3.dns_tcp.use_policy="$policy"
		uci -q set mwan3.dns_tcp.sticky=0
		uci -q set mwan3.wireguard_udp.use_policy="$policy"
		uci -q set mwan3.wireguard_udp.sticky=0
		uci -q set mwan3.ssh.use_policy="$policy"
		uci -q set mwan3.whatsapp_tcp.use_policy="$policy"
		uci -q set mwan3.whatsapp_udp.use_policy="$policy"
		uci -q set mwan3.https.use_policy="$policy"
		uci -q set mwan3.https_quic.use_policy="$policy"
		uci -q set mwan3.default_rule_v4.use_policy="$policy"
		mwan3_reorder_rules
		uci commit mwan3
		mwan3_sync_lifecycle &
		echo "$2"
		;;
	mwan-rule-add)
		shift
		r_name=''; r_ip=''; r_proto='tcp udp'; r_pstart=''; r_pend=''; r_policy='balanced'
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				name) r_name="$value" ;;
				src_ip) r_ip="$value" ;;
				proto) r_proto="$value" ;;
				port_start) r_pstart="$value" ;;
				port_end) r_pend="$value" ;;
				policy) r_policy="$value" ;;
			esac
		done
		[ -n "$r_name" ] || { echo 'Nome da regra obrigatorio' >&2; exit 2; }
		raw_slug="$(printf '%s' "$r_name" | tr -c 'a-zA-Z0-9' '_' | tr 'A-Z' 'a-z' | sed 's/^_//; s/_$//' | cut -c1-8)"
		[ -n "$raw_slug" ] || raw_slug="$(date +%s | cut -c5-10)"
		sec_base="pbr_$raw_slug"

		port_spec=""
		if [ -n "$r_pstart" ] && [ -n "$r_pend" ] && [ "$r_pend" -gt "$r_pstart" ] 2>/dev/null; then
			port_spec="$r_pstart:$r_pend"
		elif [ -n "$r_pstart" ]; then
			port_spec="$r_pstart"
		fi

		write_mwan_pbr_rule() {
			local sid="$1"
			local p="$2"
			uci -q set "mwan3.$sid=rule"
			uci -q set "mwan3.$sid.description=$r_name"
			uci -q set "mwan3.$sid.family=ipv4"
			uci -q set "mwan3.$sid.proto=$p"
			uci -q set "mwan3.$sid.use_policy=$r_policy"
			uci -q set "mwan3.$sid.sticky=0"
			uci -q set "mwan3.$sid.enabled=1"
			[ -n "$r_ip" ] && uci -q set "mwan3.$sid.src_ip=$r_ip"
			[ -n "$port_spec" ] && uci -q set "mwan3.$sid.dest_port=$port_spec"
		}

		if [ -n "$port_spec" ]; then
			case "$r_proto" in
				tcp)
					write_mwan_pbr_rule "$sec_base" "tcp"
					;;
				udp)
					write_mwan_pbr_rule "$sec_base" "udp"
					;;
				*)
					write_mwan_pbr_rule "${sec_base}_t" "tcp"
					write_mwan_pbr_rule "${sec_base}_u" "udp"
					;;
			esac
		else
			case "$r_proto" in
				tcp) write_mwan_pbr_rule "$sec_base" "tcp" ;;
				udp) write_mwan_pbr_rule "$sec_base" "udp" ;;
				*) write_mwan_pbr_rule "$sec_base" "all" ;;
			esac
		fi

		mwan3_reorder_rules
		uci commit mwan3
		mwan3_sync_lifecycle &
		printf '{"status":"ok","id":"%s"}\n' "$sec_base"
		;;
	mwan-rule-delete)
		sec_id="$2"
		[ -n "$sec_id" ] || { echo 'ID da regra obrigatorio' >&2; exit 2; }
		base_id="$(printf '%s' "$sec_id" | sed 's/_[tu]$//')"
		uci -q delete "mwan3.$sec_id"
		uci -q delete "mwan3.$base_id"
		uci -q delete "mwan3.${base_id}_t"
		uci -q delete "mwan3.${base_id}_u"
		mwan3_reorder_rules
		uci commit mwan3
		mwan3_sync_lifecycle &
		echo 'ok'
		;;
	mwan-rule-toggle)
		sec_id="$2"
		state="${3:-1}"
		[ -n "$sec_id" ] || { echo 'ID da regra obrigatorio' >&2; exit 2; }
		base_id="$(printf '%s' "$sec_id" | sed 's/_[tu]$//')"
		[ -n "$(uci -q get "mwan3.$sec_id")" ] && uci -q set "mwan3.$sec_id.enabled=$state"
		[ -n "$(uci -q get "mwan3.$base_id")" ] && uci -q set "mwan3.$base_id.enabled=$state"
		[ -n "$(uci -q get "mwan3.${base_id}_t")" ] && uci -q set "mwan3.${base_id}_t.enabled=$state"
		[ -n "$(uci -q get "mwan3.${base_id}_u")" ] && uci -q set "mwan3.${base_id}_u.enabled=$state"
		uci commit mwan3
		mwan3_sync_lifecycle &
		echo 'ok'
		;;
	mwan-torrent-toggle)
		state="${2:-1}"
		ports="${3:-}"
		if [ "$state" = "1" ]; then
			if [ -z "$ports" ]; then
				ports="$(uci -q get mwan3.globals.torrent_ports || uci -q get mwan3.tor_dst_tcp.dest_port || printf '1024:8079,8081:8442,8444:65535')"
			fi
			[ -n "$ports" ] || ports="1024:8079,8081:8442,8444:65535"

			# Sanitizar portas (apenas digitos, virgulas e dois-pontos)
			ports="$(printf '%s' "$ports" | tr -cd '0-9,:-')"
			ports="$(printf '%s' "$ports" | tr '-' ':')"

			[ -n "$(uci -q get mwan3.globals)" ] || uci -q set mwan3.globals=globals
			uci -q set "mwan3.globals.torrent_ports=$ports"

			uci -q set mwan3.tor_src_tcp=rule
			uci -q set mwan3.tor_src_tcp.family=ipv4
			uci -q set mwan3.tor_src_tcp.proto=tcp
			uci -q set "mwan3.tor_src_tcp.src_port=$ports"
			uci -q set mwan3.tor_src_tcp.use_policy=balanced
			uci -q set mwan3.tor_src_tcp.sticky=0
			uci -q set mwan3.tor_src_tcp.enabled=1

			uci -q set mwan3.tor_src_udp=rule
			uci -q set mwan3.tor_src_udp.family=ipv4
			uci -q set mwan3.tor_src_udp.proto=udp
			uci -q set "mwan3.tor_src_udp.src_port=$ports"
			uci -q set mwan3.tor_src_udp.use_policy=balanced
			uci -q set mwan3.tor_src_udp.sticky=0
			uci -q set mwan3.tor_src_udp.enabled=1

			uci -q set mwan3.tor_dst_tcp=rule
			uci -q set mwan3.tor_dst_tcp.family=ipv4
			uci -q set mwan3.tor_dst_tcp.proto=tcp
			uci -q set "mwan3.tor_dst_tcp.dest_port=$ports"
			uci -q set mwan3.tor_dst_tcp.use_policy=balanced
			uci -q set mwan3.tor_dst_tcp.sticky=0
			uci -q set mwan3.tor_dst_tcp.enabled=1

			uci -q set mwan3.tor_dst_udp=rule
			uci -q set mwan3.tor_dst_udp.family=ipv4
			uci -q set mwan3.tor_dst_udp.proto=udp
			uci -q set "mwan3.tor_dst_udp.dest_port=$ports"
			uci -q set mwan3.tor_dst_udp.use_policy=balanced
			uci -q set mwan3.tor_dst_udp.sticky=0
			uci -q set mwan3.tor_dst_udp.enabled=1

			uci -q delete mwan3.torrent_rule
			uci -q delete mwan3.torrent_dest_rule
		else
			uci -q set mwan3.tor_src_tcp.enabled=0
			uci -q set mwan3.tor_src_udp.enabled=0
			uci -q set mwan3.tor_dst_tcp.enabled=0
			uci -q set mwan3.tor_dst_udp.enabled=0
			uci -q delete mwan3.torrent_rule
			uci -q delete mwan3.torrent_dest_rule
		fi
		mwan3_reorder_rules
		uci commit mwan3
		mwan3_sync_lifecycle &
		echo 'ok'
		;;
	mwan3-toggle)
		mwan3_toggle "$2"
		;;
	mwan3-ensure|ensure_mwan3_ark_config)
		ensure_mwan3_ark_config
		echo ok
		;;
	autowan-toggle)
		state="${2:-0}"
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			mkdir -p /etc/ark-router
			if [ ! -f /etc/ark-router/autowan-baseline.uci ]; then
				uci export network > /etc/ark-router/autowan-baseline.uci 2>/dev/null || true
			fi
			if is_swconfig; then
				v1_sec="$(find_switch_vlan 1)"
				if [ -n "$v1_sec" ] && [ -z "$(uci -q get network.autowan.saved_v1_ports)" ]; then
					orig_v1="$(uci -q get "network.$v1_sec.ports" || true)"
					[ -n "$orig_v1" ] && uci -q set "network.autowan.saved_v1_ports=$orig_v1"
				fi
			fi
			cur_policy="$(uci -q get network.autowan.policy || true)"
			[ -n "$cur_policy" ] && [ -z "$(uci -q get network.autowan.saved_policy)" ] && uci -q set "network.autowan.saved_policy=$cur_policy"
			uci -q set network.autowan=config
			uci -q set network.autowan.enabled='1'
			[ -n "$(uci -q get network.autowan.policy)" ] || uci -q set network.autowan.policy='balanced'
			uci commit network
			if [ -x /etc/init.d/ark-autowan ]; then
				/etc/init.d/ark-autowan enable >/dev/null 2>&1 || true
				/etc/init.d/ark-autowan restart >/dev/null 2>&1 || true
			fi
			echo 'enabled'
		else
			if [ -x /etc/init.d/ark-autowan ]; then
				/etc/init.d/ark-autowan stop >/dev/null 2>&1 || true
				/etc/init.d/ark-autowan disable >/dev/null 2>&1 || true
			fi
			pkill -9 -f ark-autowan-daemon 2>/dev/null || true
			rm -f /var/run/ark-autowan.state /var/run/ark-autowan-dynamic.list /var/run/ark-autowan.lock 2>/dev/null || true

			# Se a porta WAN estava operando como LAN, restaura para WAN fisica padrao
			if [ "$(uci -q get network.autowan.wan_to_lan)" = "1" ]; then
				"$0" autowan-wan-to-lan 0 >/dev/null 2>&1 || true
			fi

			# Reverte WANs dinamicas criadas de volta para LAN
			if [ -f /var/run/ark-autowan-dynamic.list ]; then
				for entry in $(cat /var/run/ark-autowan-dynamic.list 2>/dev/null); do
					dyn_wan="${entry#*=}"
					[ -n "$dyn_wan" ] && [ "$dyn_wan" != "wan" ] && "$0" wan-save iface="$dyn_wan" mode=lan >/dev/null 2>&1 || true
				done
				rm -f /var/run/ark-autowan-dynamic.list 2>/dev/null || true
			fi

			# Limpa VLAN de quarentena (99) e restaura portas LAN no swconfig
			if is_swconfig; then
				saved_v1="$(uci -q get network.autowan.saved_v1_ports || echo '1 2 3 4 0t')"
				swconfig dev switch0 vlan 99 set ports "" >/dev/null 2>&1 || true
				swconfig dev switch0 vlan 1 set ports "$saved_v1" >/dev/null 2>&1 || true
				for p in 1 2 3 4; do
					swconfig dev switch0 port "$p" set pvid 1 >/dev/null 2>&1 || true
				done
				swconfig dev switch0 port 5 set pvid 2 >/dev/null 2>&1 || true
				swconfig dev switch0 set apply >/dev/null 2>&1 || true
				v1_sec="$(find_switch_vlan 1)"
				[ -n "$v1_sec" ] && uci -q set "network.$v1_sec.ports=$saved_v1"
				for idx in $(uci -q show network | grep '=switch_vlan' | cut -d. -f2 | cut -d= -f1); do
					v="$(uci -q get "network.$idx.vlan")"
					[ "$v" != "1" ] && [ "$v" != "2" ] && uci -q delete "network.$idx"
				done
			fi

			# Em DSA, garante que portas LAN livres estejam vinculadas a br-lan (NUNCA adicionar portas de WAN/WAN2)
			wan_dev=$(uci -q get network.wan.device)
			wan2_dev=$(uci -q get network.wan2.device)
			if [ -d "/sys/class/net/lan1" ] || [ -d "/sys/class/net/lan2" ]; then
				for p in lan1 lan2 lan3 lan4; do
					[ -d "/sys/class/net/$p" ] || continue
					[ -n "$wan_dev" ] && [ "$p" = "$wan_dev" ] && continue
					[ -n "$wan2_dev" ] && [ "$p" = "$wan2_dev" ] && continue
					brctl addif br-lan "$p" >/dev/null 2>&1 || true
				done
				[ -n "$wan2_dev" ] && ip link set "$wan2_dev" nomaster >/dev/null 2>&1 || true
			fi

			rm -f /etc/ark-router/autowan-baseline.uci 2>/dev/null || true

			saved_policy="$(uci -q get network.autowan.saved_policy || echo 'failover')"
			uci -q set network.autowan=config
			uci -q set network.autowan.enabled='0'
			uci -q set "network.autowan.policy=$saved_policy"
			uci -q delete network.autowan.saved_v1_ports
			uci -q delete network.autowan.saved_policy
			uci commit network

			# GARANTIA ABSOLUTA: Elimina pools de dispositivo e restaura failover puro wan_then_wan2
			uci -q delete mwan3.dev_pool1
			uci -q delete mwan3.dev_pool2
			uci -q set equipe_dashboard.mwan=config
			uci -q set equipe_dashboard.mwan.mode=failover
			uci commit equipe_dashboard
			for r in ssh whatsapp_tcp whatsapp_udp https https_quic default_rule_v4; do
				uci -q set "mwan3.$r.use_policy=wan_then_wan2"
			done
			mwan3_reorder_rules
			uci commit mwan3

			/etc/init.d/network reload >/dev/null 2>&1 || true
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			([ -x /etc/init.d/mwan3 ] && /etc/init.d/mwan3 restart >/dev/null 2>&1 &)

			echo 'disabled'
		fi
		;;
	autowan-policy-get)
		pol="$(uci -q get network.autowan.policy || echo balanced)"
		echo "$pol"
		;;
	autowan-policy-set)
		pol="$2"
		case "$pol" in
			balanced|failover) ;;
			*) echo 'Politica Auto-WAN invalida (use balanced ou failover)' >&2; exit 2 ;;
		esac
		uci -q set network.autowan=config
		uci -q set network.autowan.policy="$pol"
		uci commit network
		# Sincroniza com o mwan3 APENAS se Auto-WAN estiver efetivamente ATIVADO
		if [ "$(uci -q get network.autowan.enabled)" = "1" ]; then
			active_wans_cnt=0
			for w in $(uci -q show network | grep '=interface' | cut -d. -f2 | cut -d= -f1 | grep -E '^wan([0-9]+)?$'); do
				auto="$(uci -q get "network.$w.auto" || printf '1')"
				[ "$auto" != "0" ] || continue
				p="$(uci -q get "network.$w.proto" || printf 'none')"
				d="$(uci -q get "network.$w.device" || uci -q get "network.$w.ifname" || printf '')"
				[ "$p" != "none" ] && [ -n "$d" ] && active_wans_cnt=$((active_wans_cnt + 1))
			done
			if [ "$active_wans_cnt" -ge 2 ]; then
				/usr/sbin/equipe-dashboard-control mwan "$pol" >/dev/null 2>&1 || true
			else
				/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
				/etc/init.d/mwan3 disable >/dev/null 2>&1 || true
			fi
		fi
		echo "$pol"
		;;
	autowan-can-convert)
		port="$2"
		if autowan_can_convert "$port"; then
			echo 'allowed'
			exit 0
		else
			echo 'protected'
			exit 1
		fi
		;;
	autowan-can-convert-wan)
		autowan_can_convert_wan_json
		;;
	autowan-wan-to-lan)
		state="${2:-0}"
		wan_dev="$(get_physical_wan_dev)"
		case "$state" in
			promote)
				# Promocao automatica pelo daemon: cabo upstream com DHCP detectado na porta WAN
				if is_swconfig; then
					swconfig_remove_port_from_vlan 5 1
					swconfig_add_port_to_vlan 5 2
					swconfig dev switch0 port 5 set pvid 2 >/dev/null 2>&1 || true
					v1_ports="$(swconfig dev switch0 vlan 1 get ports 2>/dev/null | sed 's/VLAN 1: //')"
					new_v1=""
					for item in $v1_ports; do
						[ "$item" != "5" ] && [ "$item" != "5t" ] && new_v1="$new_v1 $item"
					done
					swconfig dev switch0 vlan 1 set ports "$new_v1" >/dev/null 2>&1 || true
					swconfig dev switch0 vlan 2 set ports "5 0t" >/dev/null 2>&1 || true
					swconfig dev switch0 set apply >/dev/null 2>&1 || true
				else
					remove_lan_port "$wan_dev"
					brctl delif br-lan "$wan_dev" >/dev/null 2>&1 || ip link set "$wan_dev" nomaster >/dev/null 2>&1 || true
				fi
				cur_wan_auto="$(uci -q get network.wan.auto || echo 0)"
				[ -z "$(uci -q get network.autowan.saved_wan_auto)" ] && uci -q set "network.autowan.saved_wan_auto=$cur_wan_auto"
				uci -q set network.wan.auto='1'
				uci -q set network.autowan.wan_promoted='1'
				uci commit network
				(sleep 1; ifup wan >/dev/null 2>&1) &
				echo 'promoted'
				;;
			revert)
				# Reversao automatica pelo daemon: cabo desconectado da porta WAN, retorna para LAN
				if is_swconfig; then
					swconfig_add_port_to_vlan 5 1
					swconfig_remove_port_from_vlan 5 2
					swconfig dev switch0 port 5 set pvid 1 >/dev/null 2>&1 || true
					v1_ports="$(swconfig dev switch0 vlan 1 get ports 2>/dev/null | sed 's/VLAN 1: //')"
					has_5=0
					for item in $v1_ports; do [ "$item" = "5" ] && has_5=1; done
					[ "$has_5" = 1 ] || v1_ports="$v1_ports 5"
					swconfig dev switch0 vlan 1 set ports "$v1_ports" >/dev/null 2>&1 || true
					swconfig dev switch0 vlan 2 set ports "0t" >/dev/null 2>&1 || true
					swconfig dev switch0 set apply >/dev/null 2>&1 || true
				else
					add_lan_port "$wan_dev"
					ip link set "$wan_dev" up >/dev/null 2>&1 || true
					brctl addif br-lan "$wan_dev" >/dev/null 2>&1 || ip link set "$wan_dev" master br-lan >/dev/null 2>&1 || true
				fi
				ifdown wan >/dev/null 2>&1 || true
				saved_wan_auto="$(uci -q get network.autowan.saved_wan_auto || echo 0)"
				uci -q set "network.wan.auto=$saved_wan_auto"
				uci -q delete network.autowan.saved_wan_auto
				uci -q delete network.autowan.wan_promoted
				uci commit network
				echo 'reverted'
				;;
			1|on|enable)
				[ "$(uci -q get network.autowan.enabled)" = "1" ] || { echo 'Auto-WAN deve estar ativado primeiro' >&2; exit 2; }
				[ "$(uci -q get network.autowan.wan_to_lan)" != "1" ] || { echo 'enabled'; exit 0; }

				# swconfig (D-Link DGL-5500)
				if is_swconfig; then
					swconfig_add_port_to_vlan 5 1
					swconfig_remove_port_from_vlan 5 2
					swconfig dev switch0 port 5 set pvid 1 >/dev/null 2>&1 || true
					v1_ports="$(swconfig dev switch0 vlan 1 get ports 2>/dev/null | sed 's/VLAN 1: //')"
					has_5=0
					for item in $v1_ports; do [ "$item" = "5" ] && has_5=1; done
					[ "$has_5" = 1 ] || v1_ports="$v1_ports 5"
					swconfig dev switch0 vlan 1 set ports "$v1_ports" >/dev/null 2>&1 || true
					swconfig dev switch0 vlan 2 set ports "0t" >/dev/null 2>&1 || true
					swconfig dev switch0 set apply >/dev/null 2>&1 || true
				else
					add_lan_port "$wan_dev"
					ip link set "$wan_dev" up >/dev/null 2>&1 || true
					brctl addif br-lan "$wan_dev" >/dev/null 2>&1 || ip link set "$wan_dev" master br-lan >/dev/null 2>&1 || true
				fi

				uci -q set network.wan.auto='0'
				[ -z "$(uci -q get network.wan_modem)" ] || uci -q set network.wan_modem.auto='0'
				[ -z "$(uci -q get network.wan_mgmt)" ] || uci -q set network.wan_mgmt.auto='0'
				uci -q set network.autowan.wan_to_lan='1'
				uci -q delete network.autowan.wan_promoted
				uci commit network

				ifdown wan >/dev/null 2>&1 || true
				/etc/init.d/network reload >/dev/null 2>&1 || true
				/etc/init.d/firewall reload >/dev/null 2>&1 || true
				rm -f /var/run/ark-autowan-retry-* 2>/dev/null || true
				sed -i "/^port5=/d; /^wan=/d; /^eth1=/d; /^lan[1-4]=/d" /var/run/ark-autowan.state 2>/dev/null || true

				echo 'enabled'
				;;
			*)
				[ "$(uci -q get network.autowan.wan_to_lan)" = "1" ] || { echo 'disabled'; exit 0; }

				# swconfig (D-Link DGL-5500)
				if is_swconfig; then
					swconfig_remove_port_from_vlan 5 1
					swconfig_add_port_to_vlan 5 2
					swconfig dev switch0 port 5 set pvid 2 >/dev/null 2>&1 || true
					v1_ports="$(swconfig dev switch0 vlan 1 get ports 2>/dev/null | sed 's/VLAN 1: //')"
					new_v1=""
					for item in $v1_ports; do
						[ "$item" != "5" ] && [ "$item" != "5t" ] && new_v1="$new_v1 $item"
					done
					swconfig dev switch0 vlan 1 set ports "$new_v1" >/dev/null 2>&1 || true
					swconfig dev switch0 vlan 2 set ports "5 0t" >/dev/null 2>&1 || true
					swconfig dev switch0 set apply >/dev/null 2>&1 || true
				else
					remove_lan_port "$wan_dev"
					brctl delif br-lan "$wan_dev" >/dev/null 2>&1 || ip link set "$wan_dev" nomaster >/dev/null 2>&1 || true
				fi

				uci -q set network.wan.auto='1'
				[ -z "$(uci -q get network.wan_modem)" ] || uci -q set network.wan_modem.auto='1'
				[ -z "$(uci -q get network.wan_mgmt)" ] || uci -q set network.wan_mgmt.auto='1'
				uci -q delete network.autowan.wan_to_lan
				uci -q delete network.autowan.wan_promoted
				uci commit network

				/etc/init.d/network reload >/dev/null 2>&1 || true
				/etc/init.d/firewall reload >/dev/null 2>&1 || true
				(sleep 1; ifup wan >/dev/null 2>&1) &
				rm -f /var/run/ark-autowan-retry-* 2>/dev/null || true
				sed -i "/^port5=/d; /^wan=/d; /^eth1=/d; /^lan[1-4]=/d" /var/run/ark-autowan.state 2>/dev/null || true

				echo 'disabled'
				;;
		esac
		;;
	system-network-mode-get)
		system_network_mode_get
		;;
	system-network-mode-set)
		shift
		system_network_mode_set "$@"
		;;
	wan-optimize-status)
		shift
		iface='wan'
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			[ "$key" = iface ] && iface="$value"
		done
		printf '%s' "$iface" | grep -Eq '^wan([0-9]+)?$' || { echo 'Interface WAN invalida' >&2; exit 2; }
		[ "$(uci -q get "network.$iface")" = interface ] || { echo 'Interface WAN nao encontrada' >&2; exit 3; }
		if [ "$iface" = wan ]; then wan_label='WAN1'; else wan_label="WAN${iface#wan}"; fi
		proto="$(uci -q get "network.$iface.proto")"
		wan_dev="$(uci -q get "network.$iface.device")"
		wan_l3_dev="$(sqm_device_for_network "$iface")"
		[ -n "$wan_dev" ] || wan_dev="$wan_l3_dev"
		status_json="$(ubus call "network.interface.$iface" status 2>/dev/null || true)"
		wan_ip="$(printf '%s' "$status_json" | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null)"
		wan_gateway="$(printf '%s' "$status_json" | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"
		wan_dns="$(printf '%s' "$status_json" | jsonfilter -e '@["dns-server"][@]' 2>/dev/null | tr '\n' ' ')"
		starlink=false
		starlink_cgnat_ipv4 "$wan_ip" && [ "$wan_gateway" = 100.64.0.1 ] && starlink=true
		printf '%s' "$wan_dns" | grep -Eq '(^|[[:space:]])198\.54\.100\.' && starlink=true
		case "$proto" in
			pppoe) case "$wan_dev" in *.*) detected_profile='xpon_vlan' ;; *) detected_profile='xpon_bridge' ;; esac ;;
			dhcp) [ "$starlink" = true ] && detected_profile='mobile_starlink' || detected_profile='dhcp_cable' ;;
			static) detected_profile='dedicated_static' ;;
			*) detected_profile='custom' ;;
		esac
		saved_profile="$(uci -q get "equipe_dashboard.wan_profiles.$iface")"
		case "$saved_profile" in auto|xpon_bridge|xpon_vlan|dhcp_cable|mobile_starlink|dedicated_static|custom) ;; *) saved_profile='auto' ;; esac
		if [ "$proto" != pppoe ] && { [ "$saved_profile" = xpon_bridge ] || [ "$saved_profile" = xpon_vlan ]; }; then
			saved_profile='auto'
		elif [ "$proto" = pppoe ] && [ "$saved_profile" = dhcp_cable ]; then
			saved_profile='auto'
		fi
		mwan_active_wans=0
		if [ -f /etc/config/mwan3 ]; then
			for w in $(active_wan_networks); do
				[ "$(uci -q get "mwan3.$w.enabled")" = 1 ] && mwan_active_wans=$((mwan_active_wans + 1))
			done
		fi
		tcp_turbo=0
		sysctl_perf_conf="/etc/sysctl.d/99-ark-performance.conf"
		[ -n "${ARK_ROOT}" ] && sysctl_perf_conf="${ARK_ROOT}/etc/sysctl.d/99-ark-performance.conf"
		[ -f "$sysctl_perf_conf" ] && [ "$(sysctl -n net.core.rmem_max 2>/dev/null)" -ge 4194304 ] 2>/dev/null && tcp_turbo=1
		flow_offload=0
		[ "$(uci -q get firewall.@defaults[0].flow_offloading)" = "1" ] && flow_offload=1
		sqm_installed=0
		sqm_active=0
		sqm_any_active=0
		sqm_wan_count=0
		sqm_section="$(sqm_section_for_network "$iface")"
		if { [ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ]; } && { [ -x "${ARK_ROOT}/etc/init.d/sqm" ] || [ -x /etc/init.d/sqm ]; }; then
			sqm_installed=1
			for network_section in $(active_wan_networks); do
				check_section="$(sqm_section_for_network "$network_section")" || continue
				sqm_wan_count=$((sqm_wan_count + 1))
				[ "$(uci -q get "sqm.$check_section.enabled")" = 1 ] && sqm_any_active=1
			done
			[ "$(uci -q get "sqm.$sqm_section.enabled")" = 1 ] && sqm_active=1
		fi
		sqm_ll="$(uci -q get "sqm.$sqm_section.linklayer")"
		sqm_ov="$(uci -q get "sqm.$sqm_section.overhead")"
		case "$sqm_ll" in
			ethernet)
				case "$sqm_ov" in
					28) linklayer_profile='pppoe_28' ;;
					34) linklayer_profile='vlan_34' ;;
					44|40) linklayer_profile='vdsl_44' ;;
					*) linklayer_profile="ethernet_${sqm_ov}" ;;
				esac
				;;
			atm) linklayer_profile='atm' ;;
			*) linklayer_profile='none' ;;
		esac
		sqm_download="$(uci -q get "sqm.$sqm_section.download" 2>/dev/null || echo 0)"
		sqm_upload="$(uci -q get "sqm.$sqm_section.upload" 2>/dev/null || echo 0)"
		printf '%s' "$sqm_download" | grep -Eq '^[0-9]+$' || sqm_download=0
		printf '%s' "$sqm_upload" | grep -Eq '^[0-9]+$' || sqm_upload=0
		baby_jumbo=0
		cur_mtu="$(cat "${ARK_ROOT}/sys/class/net/$wan_dev/mtu" 2>/dev/null || cat /sys/class/net/$wan_dev/mtu 2>/dev/null || echo 1500)"
		cur_speed="$(cat "${ARK_ROOT}/sys/class/net/$wan_dev/speed" 2>/dev/null || cat /sys/class/net/$wan_dev/speed 2>/dev/null || echo 0)"
		cur_duplex="$(cat "${ARK_ROOT}/sys/class/net/$wan_dev/duplex" 2>/dev/null || cat /sys/class/net/$wan_dev/duplex 2>/dev/null || true)"
		printf '%s' "$cur_speed" | grep -Eq '^[0-9]+$' || cur_speed=0
		[ "$cur_mtu" -ge 1508 ] 2>/dev/null && baby_jumbo=1
		irq_installed=0; irq_active=0
		{ [ -x "${ARK_ROOT}/etc/init.d/irqbalance" ] || [ -x /etc/init.d/irqbalance ]; } && irq_installed=1
		[ "$irq_installed" = 1 ] && { pidof irqbalance >/dev/null 2>&1 || { [ -x /etc/init.d/irqbalance ] && /etc/init.d/irqbalance enabled >/dev/null 2>&1; }; } && irq_active=1
		printf '{"iface":"%s","label":"%s","proto":"%s","wan_dev":"%s","l3_device":"%s","link_speed_mbps":%s,"duplex":"%s","ip":"%s","gateway":"%s","starlink":%s,"detected_profile":"%s","saved_profile":"%s","tcp_turbo":%s,"flow_offloading":%s,"linklayer_profile":"%s","baby_jumbo":%s,"current_mtu":%s,"sqm_section":"%s","sqm_installed":%s,"sqm_active":%s,"sqm_any_active":%s,"sqm_wan_count":%s,"sqm_download":%s,"sqm_upload":%s,"irqbalance_installed":%s,"irqbalance_active":%s,"mwan_active_wans":%s}\n' \
			"$(json_escape "$iface")" "$(json_escape "$wan_label")" "$(json_escape "$proto")" "$(json_escape "$wan_dev")" "$(json_escape "$wan_l3_dev")" "$cur_speed" "$(json_escape "$cur_duplex")" "$(json_escape "$wan_ip")" "$(json_escape "$wan_gateway")" "$starlink" "$(json_escape "$detected_profile")" "$(json_escape "$saved_profile")" "$tcp_turbo" "$flow_offload" "$linklayer_profile" "$baby_jumbo" "$cur_mtu" "$(json_escape "$sqm_section")" "$sqm_installed" "$sqm_active" "$sqm_any_active" "$sqm_wan_count" "$sqm_download" "$sqm_upload" "$irq_installed" "$irq_active" "$mwan_active_wans"
		;;
	wan-optimize-set)
		shift
		iface='wan' preset='' tcp_turbo='' flow_offload='' linklayer_profile='' baby_jumbo='' enable_sqm='' irqbalance='' sqm_upload='' sqm_download=''
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				iface) iface="$value" ;;
				preset) preset="$value" ;;
				tcp_turbo) tcp_turbo="$value" ;;
				flow_offload) flow_offload="$value" ;;
				linklayer_profile) linklayer_profile="$value" ;;
				baby_jumbo) baby_jumbo="$value" ;;
				enable_sqm) enable_sqm="$value" ;;
				irqbalance) irqbalance="$value" ;;
				sqm_upload) sqm_upload="$value" ;;
				sqm_download) sqm_download="$value" ;;
			esac
		done
		printf '%s' "$iface" | grep -Eq '^wan([0-9]+)?$' || { echo 'Interface WAN invalida' >&2; exit 2; }
		[ "$(uci -q get "network.$iface")" = interface ] || { echo 'Interface WAN nao encontrada' >&2; exit 3; }
		case "$enable_sqm" in ''|0|1) ;; *) echo 'Estado SQM invalido' >&2; exit 2 ;; esac
		case "$irqbalance" in ''|0|1) ;; *) echo 'Estado IRQ Balance invalido' >&2; exit 2 ;; esac
		if [ -n "$preset" ]; then
			if [ "$preset" = auto ]; then
				proto="$(uci -q get "network.$iface.proto")"
				wan_dev="$(uci -q get "network.$iface.device")"
				status_json="$(ubus call "network.interface.$iface" status 2>/dev/null || true)"
				wan_ip="$(printf '%s' "$status_json" | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null)"
				wan_gateway="$(printf '%s' "$status_json" | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"
				wan_dns="$(printf '%s' "$status_json" | jsonfilter -e '@["dns-server"][@]' 2>/dev/null | tr '\n' ' ')"
				starlink=false
				starlink_cgnat_ipv4 "$wan_ip" && [ "$wan_gateway" = 100.64.0.1 ] && starlink=true
				printf '%s' "$wan_dns" | grep -Eq '(^|[[:space:]])198\.54\.100\.' && starlink=true
				case "$proto" in
					pppoe) case "$wan_dev" in *.*) effective_preset='xpon_vlan' ;; *) effective_preset='xpon_bridge' ;; esac ;;
					dhcp) [ "$starlink" = true ] && effective_preset='mobile_starlink' || effective_preset='dhcp_cable' ;;
					static) effective_preset='dedicated_static' ;;
					*) effective_preset='custom' ;;
				esac
			else
				effective_preset="$preset"
			fi
			case "$effective_preset" in
				xpon_bridge) linklayer_profile='pppoe_28'; baby_jumbo=1 ;;
				xpon_vlan) linklayer_profile='vlan_34'; baby_jumbo=1 ;;
				dhcp_cable|mobile_starlink|dedicated_static) linklayer_profile='none'; baby_jumbo=0 ;;
				custom) ;;
				*) echo 'Preset invalido' >&2; exit 2 ;;
			esac
		fi
		case "$linklayer_profile" in
			pppoe_28|vlan_34|vdsl_44|atm)
				{ [ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ]; } && { [ -x "${ARK_ROOT}/etc/init.d/sqm" ] || [ -x /etc/init.d/sqm ]; } || { echo 'SQM / CAKE nao instalado. Instale o recurso antes de aplicar o perfil de overhead.' >&2; exit 3; }
				;;
		esac
		if ark_is_satellite_or_ap && [ "$enable_sqm" = 1 ]; then
			echo 'O controle de Bufferbloat (SQM/CAKE) é exclusivo do Roteador Mestre (Gateway). Desativado em modo Satélite/Ponto de Acesso.' >&2
			exit 2
		fi
		[ "$enable_sqm" != 1 ] || { { [ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ]; } && { [ -x "${ARK_ROOT}/etc/init.d/sqm" ] || [ -x /etc/init.d/sqm ]; }; } || { echo 'SQM / CAKE nao instalado' >&2; exit 3; }
		# Modo Híbrido: Software Flow Offloading (Fastpath) acelera download no kernel;
		# SQM / CAKE gerencia o upload para blindar contra Bufferbloat sem gargalo de CPU.
		if [ "$flow_offload" = 1 ] && [ -z "$sqm_download" ]; then
			sqm_download=0
		fi
		if [ "$tcp_turbo" = 1 ]; then
			sysctl_conf="/etc/sysctl.d/99-ark-performance.conf"
			[ -n "${ARK_ROOT}" ] && sysctl_conf="${ARK_ROOT}/etc/sysctl.d/99-ark-performance.conf"
			mkdir -p "$(dirname "$sysctl_conf")"
			cca="cubic"
			grep -qw bbr /proc/sys/net/ipv4/tcp_available_congestion_control 2>/dev/null && cca="bbr"
			cat <<EOF > "$sysctl_conf"
net.core.rmem_max=8388608
net.core.wmem_max=8388608
net.ipv4.tcp_rmem=4096 87380 8388608
net.ipv4.tcp_wmem=4096 65536 8388608
net.core.netdev_max_backlog=5000
net.ipv4.tcp_congestion_control=$cca
net.ipv4.tcp_mtu_probing=1
net.ipv4.tcp_slow_start_after_idle=0
net.ipv4.tcp_fastopen=3
EOF
			sysctl -p "$sysctl_conf" >/dev/null 2>&1 || true
		elif [ "$tcp_turbo" = 0 ]; then
			sysctl_conf="/etc/sysctl.d/99-ark-performance.conf"
			[ -n "${ARK_ROOT}" ] && sysctl_conf="${ARK_ROOT}/etc/sysctl.d/99-ark-performance.conf"
			rm -f "$sysctl_conf"
			sysctl -w net.core.rmem_max=212992 >/dev/null 2>&1 || true
			sysctl -w net.core.wmem_max=212992 >/dev/null 2>&1 || true
			sysctl -w net.ipv4.tcp_rmem="4096 87380 212992" >/dev/null 2>&1 || true
			sysctl -w net.ipv4.tcp_wmem="4096 65536 212992" >/dev/null 2>&1 || true
			sysctl -w net.core.netdev_max_backlog=1000 >/dev/null 2>&1 || true
			sysctl -w net.ipv4.tcp_congestion_control=cubic >/dev/null 2>&1 || true
			sysctl -w net.ipv4.tcp_mtu_probing=0 >/dev/null 2>&1 || true
			sysctl -w net.ipv4.tcp_slow_start_after_idle=1 >/dev/null 2>&1 || true
			sysctl -w net.ipv4.tcp_fastopen=1 >/dev/null 2>&1 || true
		fi
		if [ "$flow_offload" = 1 ]; then
			uci -q set firewall.@defaults[0].flow_offloading=1
			# Detecta aceleracao em silicio MediaTek Filogic PPE / WED ou MT7621 PPE
			has_ppe=0
			if [ -e /sys/kernel/debug/ppe0 ] || [ -e /sys/kernel/debug/ppe1 ] || [ -d /sys/devices/platform/soc/15010000.wed ] || \
			   grep -qiE 'mt7981|mt7986|mt7988|mt7621|mt7622|filogic' /tmp/sysinfo/board_name /tmp/sysinfo/model 2>/dev/null; then
				has_ppe=1
			fi
			if [ "$has_ppe" = 1 ] && [ "$enable_sqm" != 1 ] && ! uci -q show sqm 2>/dev/null | grep -q "\.enabled='1'"; then
				uci -q set firewall.@defaults[0].flow_offloading_hw=1
			else
				uci -q set firewall.@defaults[0].flow_offloading_hw=0
			fi
			uci commit firewall
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
		elif [ "$flow_offload" = 0 ]; then
			uci -q set firewall.@defaults[0].flow_offloading=0
			uci -q set firewall.@defaults[0].flow_offloading_hw=0
			uci commit firewall
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
		fi
		if [ "$irqbalance" = 1 ]; then
			[ -x /etc/init.d/irqbalance ] || { echo 'IRQ Balance nao instalado' >&2; exit 3; }
			/etc/init.d/irqbalance enable >/dev/null 2>&1 || true
			/etc/init.d/irqbalance start >/dev/null 2>&1 || { echo 'Nao foi possivel iniciar IRQ Balance' >&2; exit 3; }
		elif [ "$irqbalance" = 0 ]; then
			[ ! -x /etc/init.d/irqbalance ] || { /etc/init.d/irqbalance stop >/dev/null 2>&1 || true; /etc/init.d/irqbalance disable >/dev/null 2>&1 || true; }
		fi
		sqm_changed=0
		sqm_section="$(sqm_section_for_network "$iface")" || { echo 'Mapeamento SQM invalido' >&2; exit 2; }
		wan_device="$(sqm_device_for_network "$iface")"
		valid_net_device "$wan_device" || { echo "Dispositivo SQM invalido para $iface" >&2; exit 2; }
		if [ "$enable_sqm" = 1 ]; then
			ensure_sqm_section "$sqm_section" "$wan_device"
			uci -q set "sqm.$sqm_section.enabled=1"
			sqm_changed=1
		elif uci -q get "sqm.$sqm_section" >/dev/null 2>&1; then
			cur_sqm_dev="$(uci -q get "sqm.$sqm_section.interface")"
			if [ "$cur_sqm_dev" != "$wan_device" ]; then
				uci -q set "sqm.$sqm_section.interface=$wan_device"
				sqm_changed=1
			fi
		fi
		if [ -n "$sqm_upload" ] && uci -q get "sqm.$sqm_section" >/dev/null 2>&1; then
			ensure_sqm_section "$sqm_section" "$wan_device"
			uci -q set "sqm.$sqm_section.upload=$sqm_upload"
			sqm_changed=1
		fi
		if [ -n "$sqm_download" ] && uci -q get "sqm.$sqm_section" >/dev/null 2>&1; then
			ensure_sqm_section "$sqm_section" "$wan_device"
			uci -q set "sqm.$sqm_section.download=$sqm_download"
			sqm_changed=1
		elif [ "$flow_offload" = 1 ] && uci -q get "sqm.$sqm_section" >/dev/null 2>&1; then
			uci -q set "sqm.$sqm_section.download=0"
			sqm_changed=1
		fi
		if [ "$flow_offload" = 1 ]; then
			for s in $(uci -q show sqm 2>/dev/null | sed -n 's/^sqm\.\([^.]*\)\.enabled=.1.$/\1/p'); do
				cur_dl="$(uci -q get "sqm.$s.download" 2>/dev/null || echo 0)"
				if [ "$cur_dl" != "0" ]; then
					uci -q set "sqm.$s.download=0"
					sqm_changed=1
				fi
			done
		fi
		if [ -n "$linklayer_profile" ]; then
			if uci -q get "sqm.$sqm_section" >/dev/null 2>&1; then
				s="$sqm_section"
				case "$linklayer_profile" in
					none)
						uci -q set "sqm.$s.linklayer=none"
						uci -q delete "sqm.$s.overhead"
						uci -q delete "sqm.$s.mpu"
						;;
					pppoe_28)
						uci -q set "sqm.$s.linklayer=ethernet"
						uci -q set "sqm.$s.overhead=28"
						uci -q set "sqm.$s.mpu=64"
						;;
					vlan_34)
						uci -q set "sqm.$s.linklayer=ethernet"
						uci -q set "sqm.$s.overhead=34"
						uci -q set "sqm.$s.mpu=64"
						;;
					vdsl_44)
						uci -q set "sqm.$s.linklayer=ethernet"
						uci -q set "sqm.$s.overhead=44"
						uci -q set "sqm.$s.mpu=64"
						;;
					atm)
						uci -q set "sqm.$s.linklayer=atm"
						uci -q set "sqm.$s.overhead=44"
						;;
				esac
			fi
			sqm_changed=1
		fi
		if [ "$sqm_changed" = 1 ]; then
			uci commit sqm
			/etc/init.d/sqm restart >/dev/null 2>&1 || true
		fi
		wan_dev="$(uci -q get "network.$iface.device")"
		[ -n "$wan_dev" ] || wan_dev="$(sqm_device_for_network "$iface")"
		valid_net_device "$wan_dev" || { echo "Dispositivo fisico invalido para $iface" >&2; exit 2; }
		dev_sec=""
		for s in $(uci -q show network 2>/dev/null | sed -n 's/^network\.\(@device\[[0-9]*\]\|[a-zA-Z0-9_]*\)=device$/\1/p'); do
			if [ "$(uci -q get "network.$s.name")" = "$wan_dev" ]; then
				dev_sec="$s"
				break
			fi
		done
		if [ -z "$dev_sec" ]; then
			uci add network device >/dev/null 2>&1
			dev_sec="@device[-1]"
			uci -q set "network.$dev_sec.name=$wan_dev"
		fi
		if [ "$baby_jumbo" = 1 ]; then
			ip link set "$wan_dev" mtu 1508 >/dev/null 2>&1 || true
			uci -q set "network.$dev_sec.mtu=1508"
			uci -q set "network.$iface.mtu=1500"
			uci -q set "network.$iface.device_mtu=1508"
			[ "$(uci -q get "network.$iface.proto")" = pppoe ] && ip link set "pppoe-$iface" mtu 1500 >/dev/null 2>&1 || true
			uci commit network
		elif [ "$baby_jumbo" = 0 ]; then
			ip link set "$wan_dev" mtu 1500 >/dev/null 2>&1 || true
			uci -q set "network.$dev_sec.mtu=1500"
			if [ "$(uci -q get "network.$iface.proto")" = pppoe ]; then
				uci -q set "network.$iface.mtu=1492"
				ip link set "pppoe-$iface" mtu 1492 >/dev/null 2>&1 || true
			else
				uci -q delete "network.$iface.mtu"
			fi
			uci -q delete "network.$iface.device_mtu"
			uci commit network
		fi
		uci -q get equipe_dashboard.wan_profiles >/dev/null 2>&1 || uci -q set equipe_dashboard.wan_profiles=wan_profiles
		[ -n "$preset" ] && uci -q set "equipe_dashboard.wan_profiles.$iface=$preset"
		uci commit equipe_dashboard
		echo 'ok'
		;;
	pppoe-profiles-list)
		printf '{"profiles":['
		first=1
		for sec in $(uci -q show equipe_dashboard 2>/dev/null | grep '=pppoe_profile$' | cut -d. -f2 | cut -d= -f1); do
			pname="$(uci -q get "equipe_dashboard.$sec.name" || printf '%s' "$sec")"
			puser="$(uci -q get "equipe_dashboard.$sec.username" || printf '')"
			ppass="$(uci -q get "equipe_dashboard.$sec.password" || printf '')"
			pmac="$(uci -q get "equipe_dashboard.$sec.macaddr" || printf '')"
			pmodem_ip="$(uci -q get "equipe_dashboard.$sec.modem_ip" || printf '')"
			[ "$first" = 1 ] && first=0 || printf ','
			printf '{"id":"%s","name":"%s","username":"%s","password":"%s","macaddr":"%s","modem_ip":"%s"}' \
				"$(json_escape "$sec")" "$(json_escape "$pname")" "$(json_escape "$puser")" "$(json_escape "$ppass")" "$(json_escape "$pmac")" "$(json_escape "$pmodem_ip")"
		done
		printf ']}\n'
		;;
	pppoe-profile-save)
		shift
		pname=""; puser=""; ppass=""; pmac=""; pmodem_ip=""
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				name) pname="$value" ;;
				username) puser="$value" ;;
				password) ppass="$value" ;;
				macaddr) pmac="$value" ;;
				modem_ip) pmodem_ip="$value" ;;
			esac
		done
		[ -n "$pname" ] || { echo 'Nome do perfil obrigatorio' >&2; exit 2; }
		sec_id="$(printf '%s' "$pname" | tr -c 'a-zA-Z0-9_' '_' | tr 'A-Z' 'a-z' | sed 's/^_//; s/_$//')"
		[ -n "$sec_id" ] || sec_id="pppoe_$(date +%s)"
		sec_id="prof_$sec_id"
		uci -q set "equipe_dashboard.$sec_id=pppoe_profile"
		uci -q set "equipe_dashboard.$sec_id.name=$pname"
		uci -q set "equipe_dashboard.$sec_id.username=$puser"
		uci -q set "equipe_dashboard.$sec_id.password=$ppass"
		if [ -n "$pmac" ]; then
			uci -q set "equipe_dashboard.$sec_id.macaddr=$pmac"
		else
			uci -q delete "equipe_dashboard.$sec_id.macaddr"
		fi
		if [ -n "$pmodem_ip" ]; then
			uci -q set "equipe_dashboard.$sec_id.modem_ip=$pmodem_ip"
		else
			uci -q delete "equipe_dashboard.$sec_id.modem_ip"
		fi
		uci commit equipe_dashboard
		printf '{"profiles":['
		first=1
		for sec in $(uci -q show equipe_dashboard 2>/dev/null | grep '=pppoe_profile$' | cut -d. -f2 | cut -d= -f1); do
			pn="$(uci -q get "equipe_dashboard.$sec.name" || printf '%s' "$sec")"
			pu="$(uci -q get "equipe_dashboard.$sec.username" || printf '')"
			pp="$(uci -q get "equipe_dashboard.$sec.password" || printf '')"
			pm="$(uci -q get "equipe_dashboard.$sec.macaddr" || printf '')"
			pmi="$(uci -q get "equipe_dashboard.$sec.modem_ip" || printf '')"
			[ "$first" = 1 ] && first=0 || printf ','
			printf '{"id":"%s","name":"%s","username":"%s","password":"%s","macaddr":"%s","modem_ip":"%s"}' \
				"$(json_escape "$sec")" "$(json_escape "$pn")" "$(json_escape "$pu")" "$(json_escape "$pp")" "$(json_escape "$pm")" "$(json_escape "$pmi")"
		done
		printf ']}\n'
		;;
	pppoe-profile-delete)
		sec_id="$2"
		[ -n "$sec_id" ] || { echo 'ID do perfil obrigatorio' >&2; exit 2; }
		[ "$(uci -q get "equipe_dashboard.$sec_id")" = "pppoe_profile" ] || { echo 'Perfil invalido' >&2; exit 3; }
		uci -q delete "equipe_dashboard.$sec_id"
		uci commit equipe_dashboard
		printf '{"profiles":['
		first=1
		for sec in $(uci -q show equipe_dashboard 2>/dev/null | grep '=pppoe_profile$' | cut -d. -f2 | cut -d= -f1); do
			pn="$(uci -q get "equipe_dashboard.$sec.name" || printf '%s' "$sec")"
			pu="$(uci -q get "equipe_dashboard.$sec.username" || printf '')"
			pp="$(uci -q get "equipe_dashboard.$sec.password" || printf '')"
			pm="$(uci -q get "equipe_dashboard.$sec.macaddr" || printf '')"
			pmi="$(uci -q get "equipe_dashboard.$sec.modem_ip" || printf '')"
			[ "$first" = 1 ] && first=0 || printf ','
			printf '{"id":"%s","name":"%s","username":"%s","password":"%s","macaddr":"%s","modem_ip":"%s"}' \
				"$(json_escape "$sec")" "$(json_escape "$pn")" "$(json_escape "$pu")" "$(json_escape "$pp")" "$(json_escape "$pm")" "$(json_escape "$pmi")"
		done
		printf ']}\n'
		;;
	pppoe-log)
		shift
		count="${1:-150}"
		[ "$count" = "wan" ] || [ "$count" = "wan2" ] || [ "$count" = "all" ] && { shift; count="${1:-150}"; }
		case "$count" in ''|*[!0-9]*) count=150 ;; esac
		[ "$count" -ge 10 ] || count=10
		[ "$count" -le 500 ] || count=500
		out=''
		if command -v logread >/dev/null 2>&1; then
			out="$(logread -e pppd | tail -n "$count")"
		elif [ -f /var/log/messages ]; then
			out="$(grep 'pppd' /var/log/messages | tail -n "$count")"
		else
			out="$(dmesg | grep 'pppd' | tail -n "$count")"
		fi
		if [ -z "$out" ]; then
			if [ -d /sys/class/net/pppoe-wan ] || [ -d /sys/class/net/pppoe-wan2 ]; then
				echo "(Nenhum evento PPPoE recente registrado no log do sistema — Conexão ativa e estável sem erros)"
			else
				echo "(Nenhum evento PPPoE recente registrado no log do sistema)"
			fi
		else
			printf '%s\n' "$out"
		fi
		;;
	ping-target-get)
		target="$(uci -q get equipe_dashboard.main.ping_target || printf 'registro_br')"
		custom_ip="$(uci -q get equipe_dashboard.main.ping_custom_ip || true)"
		case "$target" in
			registro_br) resolved="200.160.2.3"; label="Registro.br / NIC.br (200.160.2.3)" ;;
			cloudflare) resolved="1.1.1.1"; label="Cloudflare (1.1.1.1)" ;;
			google) resolved="8.8.8.8"; label="Google (8.8.8.8)" ;;
			isp)
				resolved="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"
				[ -n "$resolved" ] || resolved="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].ptpaddress' 2>/dev/null)"
				[ -n "$resolved" ] || resolved="$(uci -q get network.wan.gateway || true)"
				[ -n "$resolved" ] || resolved="dinamico"
				label="Gateway da Operadora ($resolved)"
				;;
			*) target="registro_br"; resolved="200.160.2.3"; label="Registro.br / NIC.br (200.160.2.3)" ;;
		esac
		printf '{"target":"%s","custom_ip":"%s","resolved_ip":"%s","label":"%s"}\n' \
			"$(json_escape "$target")" "$(json_escape "$custom_ip")" "$(json_escape "$resolved")" "$(json_escape "$label")"
		;;
	ping-target-set)
		target="$2"
		custom_ip="$3"
		case "$target" in
			registro_br|cloudflare|google|quad9|isp|custom) ;;
			*) target="registro_br" ;;
		esac
		uci -q set equipe_dashboard.main=settings
		uci -q set equipe_dashboard.main.ping_target="$target"
		if [ "$target" = "custom" ] && [ -n "$custom_ip" ]; then
			clean_ip="$(printf '%s' "$custom_ip" | tr -cd 'a-zA-Z0-9.:_-' | cut -c1-64)"
			uci -q set equipe_dashboard.main.ping_custom_ip="$clean_ip"
		else
			uci -q delete equipe_dashboard.main.ping_custom_ip 2>/dev/null || true
		fi
		uci commit equipe_dashboard
		track_ips="$(get_configured_ping_track_ips)"
		if [ -f /etc/config/mwan3 ]; then
			for mw in $(uci -q show mwan3 2>/dev/null | grep '=interface' | cut -d. -f2 | cut -d= -f1); do
				uci -q delete "mwan3.$mw.track_ip" 2>/dev/null || true
				for tip in $track_ips; do
					uci -q add_list "mwan3.$mw.track_ip=$tip"
				done
			done
			uci commit mwan3 2>/dev/null || true
			if [ -x /usr/sbin/mwan3 ] && [ -x /etc/init.d/mwan3 ] && /etc/init.d/mwan3 enabled 2>/dev/null; then
				/usr/sbin/mwan3 restart >/dev/null 2>&1 || true
			fi
		fi
		printf '{"ok":true,"target":"%s","custom_ip":"%s","track_ips":"%s"}\n' \
			"$(json_escape "$target")" "$(json_escape "$custom_ip")" "$(json_escape "$track_ips")"
		;;
	sync-ipv6-firewall)
		sync_ipv6_selective_firewall
		echo ok
		;;
	ipv6-status)
		get_ipv6_status
		;;
	ipv6-mode-set)
		set_ipv6_mode "$2"
		;;
	ipv6-relay-toggle)
		set_ipv6_relay "${2:-0}"
		;;
	ipv6-device-toggle)
		toggle_ipv6_device "$2" "${3:-0}"
		;;
	ipv6-disable-full)
		backup="$(cleanup_backup)" || { echo 'Falha ao criar backup antes de desativar IPv6' >&2; exit 3; }
		set_ipv6_mode "ipv4_only" >/dev/null 2>&1
		printf '{"status":"ok","backup":"%s"}\n' "$(json_escape "$backup")"
		;;
	esac
}
