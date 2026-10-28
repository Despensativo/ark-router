#!/bin/sh
# /usr/lib/ark/modules/network_ipv6_mwan.sh - ARK Router AutoWAN, IPv6 & Multi-WAN Submodule
# Strict POSIX BusyBox ash compliant submodule sourced by network.sh.

[ -z "${_ARK_NETWORK_IPV6_MWAN_SH_LOADED:-}" ] || return 0
_ARK_NETWORK_IPV6_MWAN_SH_LOADED=1

[ -n "${ARK_LIB_DIR:-}" ] || ARK_LIB_DIR="/usr/lib/ark"
[ -f "${ARK_LIB_DIR}/common.sh" ] && . "${ARK_LIB_DIR}/common.sh"
[ -f "${ARK_LIB_DIR}/logging.sh" ] && . "${ARK_LIB_DIR}/logging.sh"
[ -f "${ARK_LIB_DIR}/validation.sh" ] && . "${ARK_LIB_DIR}/validation.sh"
[ -f "${ARK_LIB_DIR}/modules/sqm.sh" ] && . "${ARK_LIB_DIR}/modules/sqm.sh"
[ -f "${ARK_LIB_DIR}/modules/starlink.sh" ] && . "${ARK_LIB_DIR}/modules/starlink.sh"

autowan_can_convert() {
	local p iface
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
		local board_wan=""
		if [ -f /etc/board.json ] && command -v jsonfilter >/dev/null 2>&1; then
			board_wan="$(jsonfilter -i /etc/board.json -e '@.network.wan.device' 2>/dev/null || jsonfilter -i /etc/board.json -e '@.network.wan.ports[0]' 2>/dev/null || true)"
		fi
		case "$board_wan" in
			''|lan[1-4]) board_wan="" ;;
		esac
		if [ -n "$board_wan" ]; then
			echo "$board_wan"
			return 0
		fi
		local d="$(uci -q get network.wan.ark_phys_port || uci -q get network.wan.device || uci -q get network.wan.ifname || true)"
		case "$d" in
			''|lan[1-4])
				if [ -e /sys/class/net/eth1 ]; then
					echo "eth1"
				elif [ -e /sys/class/net/wan ]; then
					echo "wan"
				elif [ -e /sys/class/net/lan5 ]; then
					echo "lan5"
				elif [ -e /sys/class/net/port5 ]; then
					echo "port5"
				else
					echo "${d:-eth1}"
				fi
				;;
			*)
				echo "$d"
				;;
		esac
	fi
}

autowan_can_convert_wan_json() {
	local w iface
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
	if [ -z "$current_gw" ] || [ "$current_gw" = "$lan_ip" ]; then
		local wan_gw="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"
		[ -n "$wan_gw" ] && current_gw="$wan_gw"
	fi

	local mesh_disabled="$(uci -q get wireless.extra_mesh_r1.disabled || echo '1')"
	local cur_mesh_id="$(uci -q get wireless.extra_mesh_r1.mesh_id || echo '')"
	local backhaul="cable"
	if [ "$mesh_disabled" = "0" ] && [ -n "$cur_mesh_id" ]; then
		backhaul="air"
	fi
	local master_ip="$(uci -q get equipe_dashboard.general.master_ip || echo "$lan_gw")"

	printf '{"mode":"%s","role":"%s","backhaul":"%s","mesh_id":"%s","master_ip":"%s","lan_proto":"%s","lan_ip":"%s","current_ip":"%s","netmask":"%s","gateway":"%s","current_gw":"%s","dns":"%s","rescue_ip":"%s","dhcp_disabled":%s,"dhcp_enabled":%s}\n' \
		"$mode" "$role" "$backhaul" "$cur_mesh_id" "$master_ip" "$lan_proto" "$lan_ip" "$current_ip" "$lan_mask" "$lan_gw" "$current_gw" "$lan_dns" "$rescue_ip" "$([ "$dhcp_disabled" = "1" ] && echo true || echo false)" "$([ "$dhcp_disabled" = "1" ] && echo false || echo true)"
}

system_network_mode_set() {
	local z v1_ports has_5 item new_v1
	local target_mode="$1"
	local ap_ip_proto="${2:-dhcp}"
	local ap_ip="${3:-}"
	local ap_mask="${4:-255.255.255.0}"
	local ap_gw="${5:-}"
	local ap_dns="${6:-}"
	local router_dhcp_enabled="${2:-1}"

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

		# 5. Configura DHCP local na LAN conforme escolha do usuario
		if [ "$router_dhcp_enabled" = "0" ] || [ "$router_dhcp_enabled" = "false" ]; then
			uci -q set dhcp.lan.ignore='1'
			uci -q delete dhcp.lan.force
		else
			uci -q delete dhcp.lan.ignore
			uci -q set dhcp.lan.force='1'
		fi

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

restore_ipv6_firewall_rules() {
	local zone itype cur_icmp_in cur_icmp_fwd cur_dhcpv6
	zone="$(firewall_wan_zone_section)"
	if [ -n "$zone" ]; then
		firewall_zone_has_network "$zone" wan6 || uci -q add_list "firewall.$zone.network=wan6"
	fi

	cur_icmp_in="$(uci -q get firewall.Allow_ICMPv6_Input 2>/dev/null || true)"
	if [ -z "$cur_icmp_in" ]; then
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

	cur_icmp_fwd="$(uci -q get firewall.Allow_ICMPv6_Forward 2>/dev/null || true)"
	if [ -z "$cur_icmp_fwd" ]; then
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

	cur_dhcpv6="$(uci -q get firewall.Allow_DHCPv6 2>/dev/null || true)"
	if [ -z "$cur_dhcpv6" ]; then
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

ark_ensure_ipv6_dhcpv6_client() {
	[ -z "${ARK_ROOT:-}" ] || return 0
	if [ ! -f /lib/netifd/proto/dhcpv6.sh ] || ! command -v odhcp6c >/dev/null 2>&1; then
		if command -v apk >/dev/null 2>&1; then
			apk add odhcp6c >/dev/null 2>&1 || { apk update >/dev/null 2>&1 || true; apk add odhcp6c >/dev/null 2>&1; } || true
		elif command -v opkg >/dev/null 2>&1; then
			opkg install odhcp6c >/dev/null 2>&1 || { opkg update >/dev/null 2>&1 || true; opkg install odhcp6c >/dev/null 2>&1; } || true
		fi
	fi
	if [ ! -x /usr/sbin/odhcpd ] && [ ! -x /etc/init.d/odhcpd ]; then
		if command -v apk >/dev/null 2>&1; then
			apk add odhcpd-ipv6only >/dev/null 2>&1 || apk add odhcpd >/dev/null 2>&1 || { apk update >/dev/null 2>&1 || true; apk add odhcpd-ipv6only >/dev/null 2>&1 || apk add odhcpd >/dev/null 2>&1; } || true
		elif command -v opkg >/dev/null 2>&1; then
			opkg install odhcpd-ipv6only >/dev/null 2>&1 || opkg install odhcpd >/dev/null 2>&1 || { opkg update >/dev/null 2>&1 || true; opkg install odhcpd-ipv6only >/dev/null 2>&1 || opkg install odhcpd >/dev/null 2>&1; } || true
		fi
	fi
	if [ -f /lib/netifd/proto/dhcpv6.sh ] && command -v ubus >/dev/null 2>&1; then
		if ! ubus call network get_proto_handlers 2>/dev/null | grep -q '"dhcpv6"'; then
			(sleep 2; /etc/init.d/network restart >/dev/null 2>&1 || true) >/dev/null 2>&1 </dev/null &
		fi
	fi
}

enable_ipv6_dual_stack() {
	local sysctl_ipv6_conf iface cur_v6 ula saved_ula relay pfx
	ark_ensure_ipv6_dhcpv6_client
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
	uci -q set network.wan6.ifname='@wan'
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
		uci -q set dhcp.lan.ra_prefer_old='0'
		uci -q set dhcp.lan.ra_slaac='1'
		uci -q set dhcp.lan.ra_default='1'
		uci -q set dhcp.lan.ra_mininterval='20'
		uci -q set dhcp.lan.ra_maxinterval='60'
		uci -q del_list dhcp.lan.ra_flags='managed-config'
		uci -q del_list dhcp.lan.ra_flags='other-config'
		uci -q add_list dhcp.lan.ra_flags='other-config'
		# Purga qualquer IP estatico residual que sobreponha prefixos de WAN na LAN
		for pfx in $(uci -q get network.lan.ip6addr || true); do
			case "$pfx" in
				*feca:e2a2*|*FECA:E2A2*)
					uci -q del_list network.lan.ip6addr="$pfx" 2>/dev/null || true
					if [ "$(uci -q get network.lan.ip6addr)" = "$pfx" ]; then
						uci -q delete network.lan.ip6addr 2>/dev/null || true
					fi
					;;
			esac
		done
		uci -q delete dhcp.wan.dhcpv6
		uci -q delete dhcp.wan.ra
		uci -q delete dhcp.wan.ndp
		uci -q delete dhcp.wan.master
	fi

	restore_ipv6_firewall_rules

	uci -q set equipe_dashboard.ipv6=ipv6
	uci -q set equipe_dashboard.ipv6.mode='dual_stack'
	uci commit equipe_dashboard
	uci commit network
	uci commit dhcp
	uci commit firewall

	[ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd enable >/dev/null 2>&1 || true
	[ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd restart >/dev/null 2>&1 || true
	sync_adguard_ipv6 true
}

clean_ipv6_selective_firewall() {
	local t lan_dev
	if is_fw4; then
		if command -v nft >/dev/null 2>&1; then
			nft delete table inet ark_ipv6_selective 2>/dev/null || true
			for t in $(nft list tables 2>/dev/null | grep 'table netdev ark_ipv6_' | awk '{print $3}'); do
				nft delete table netdev "$t" 2>/dev/null || true
			done
		fi
	elif is_fw3; then
		if command -v ip6tables >/dev/null 2>&1; then
			lan_dev="$(uci -q get network.lan.device || echo '')"
			if [ -z "$lan_dev" ]; then
				if [ "$(uci -q get network.lan.type)" = "bridge" ] || [ -d /sys/class/net/br-lan ]; then
					lan_dev="br-lan"
				else
					lan_dev="$(uci -q get network.lan.ifname || echo br-lan)"
				fi
			fi
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
	local lan_dev cur_mode allowed_macs blocked_macs sections s val m tmp_nft nft_file apply_sh elements_str
	local elements_line
	mkdir -p /etc/ark
	lan_dev="$(uci -q get network.lan.device || echo '')"
	if [ -z "$lan_dev" ]; then
		if [ "$(uci -q get network.lan.type)" = "bridge" ] || [ -d /sys/class/net/br-lan ]; then
			lan_dev="br-lan"
		else
			lan_dev="$(uci -q get network.lan.ifname || echo br-lan)"
		fi
	fi
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

		# Limpeza preventiva de tabelas netdev legadas que bloqueavam portas inteiras da bridge
		for t in $(nft list tables 2>/dev/null | grep 'table netdev ark_ipv6_' | awk '{print $3}'); do
			nft delete table netdev "$t" 2>/dev/null || true
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

sync_nptv6_firewall() {
	local zone="$(firewall_wan_zone_section)"
	if [ -n "$zone" ]; then
		uci -q set "firewall.$zone.masq6=1"
		uci commit firewall
	fi
}

clean_nptv6_firewall() {
	local zone="$(firewall_wan_zone_section)"
	if [ -n "$zone" ]; then
		uci -q delete "firewall.$zone.masq6"
		uci commit firewall
	fi
}

set_ipv6_mode() {
	local mode
	mode="$1"
	case "$mode" in
		ipv4_only)
			disable_ipv6_full
			clean_ipv6_selective_firewall
			clean_nptv6_firewall
			if [ "$(uci -q get equipe_dashboard.main.network_mode)" != "ap" ]; then
				local prev_v6="$(uci -q get equipe_dashboard.ipv6.mode || true)"
				[ "$prev_v6" = "ipv6_only" ] && uci -q delete dhcp.lan.ignore && uci commit dhcp
			fi
			uci -q set equipe_dashboard.ipv6=ipv6
			uci -q set equipe_dashboard.ipv6.mode='ipv4_only'
			uci commit equipe_dashboard
			(sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/rpcd restart >/dev/null 2>&1 || true) >/dev/null 2>&1 </dev/null &
			echo ok
			;;
		dual_stack)
			enable_ipv6_dual_stack
			clean_nptv6_firewall
			sync_ipv6_selective_firewall
			uci -q delete dhcp.lan.ignore
			uci commit dhcp
			uci -q set equipe_dashboard.ipv6=ipv6
			uci -q set equipe_dashboard.ipv6.mode='dual_stack'
			uci commit equipe_dashboard
			(sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/rpcd restart >/dev/null 2>&1 || true) >/dev/null 2>&1 </dev/null &
			echo ok
			;;
		selective)
			enable_ipv6_dual_stack
			clean_nptv6_firewall
			sync_ipv6_selective_firewall
			uci -q delete dhcp.lan.ignore
			uci commit dhcp
			uci -q set equipe_dashboard.ipv6=ipv6
			uci -q set equipe_dashboard.ipv6.mode='selective'
			uci commit equipe_dashboard
			(sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/rpcd restart >/dev/null 2>&1 || true) >/dev/null 2>&1 </dev/null &
			echo ok
			;;
		nptv6)
			enable_ipv6_dual_stack
			sync_nptv6_firewall
			clean_ipv6_selective_firewall
			uci -q set equipe_dashboard.ipv6.relay='0'
			uci -q set dhcp.lan.dhcpv6='server'
			uci -q set dhcp.lan.ra='server'
			uci -q set dhcp.lan.ndp='disabled'
			uci -q set dhcp.lan.ra_prefer_old='0'
			uci -q delete dhcp.wan.dhcpv6
			uci -q delete dhcp.wan.ra
			uci -q delete dhcp.wan.ndp
			uci -q delete dhcp.wan.master
			uci -q delete dhcp.lan.ignore
			uci commit dhcp
			uci -q set equipe_dashboard.ipv6=ipv6
			uci -q set equipe_dashboard.ipv6.mode='nptv6'
			uci commit equipe_dashboard
			(sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; /etc/init.d/odhcpd restart >/dev/null 2>&1 || true; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/rpcd restart >/dev/null 2>&1 || true) >/dev/null 2>&1 </dev/null &
			echo ok
			;;
		ipv6_only)
			enable_ipv6_dual_stack
			clean_nptv6_firewall
			clean_ipv6_selective_firewall
			uci -q set dhcp.lan.ignore='1'
			uci commit dhcp
			uci -q set equipe_dashboard.ipv6=ipv6
			uci -q set equipe_dashboard.ipv6.mode='ipv6_only'
			uci commit equipe_dashboard
			(sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true; /etc/init.d/rpcd restart >/dev/null 2>&1 || true) >/dev/null 2>&1 </dev/null &
			echo ok
			;;
		*)
			echo "Modo invalido: $mode (use: ipv4_only, dual_stack, selective, nptv6, ipv6_only)" >&2
			exit 2
			;;
	esac
}

set_ipv6_relay() {
	local state mode
	state="$1"
	case "$state" in 1|true) state=1 ;; *) state=0 ;; esac
	mode="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"
	if [ "$state" = "1" ] && [ "$mode" = "nptv6" ]; then
		echo "O modo NDP Relay e incompativel com NPTv6 (NPTv6 exige Servidor Direto de ULA)" >&2
		exit 2
	fi
	if [ "$state" = "1" ] && [ "$mode" = "ipv4_only" ]; then
		echo "NDP Relay nao pode ser ativado no modo IPv4 Puro" >&2
		exit 2
	fi
	uci -q set equipe_dashboard.ipv6=ipv6
	uci -q set "equipe_dashboard.ipv6.relay=$state"
	uci commit equipe_dashboard

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
			uci -q set dhcp.lan.ra_prefer_old='0'
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
	local mac name_section mode
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
	local mode relay wan6_proto wan6_dev lan_dev prefix_delegated lan_ip6 ula_ip6 ula_prefix filter_aaaa odhcpd_active allowed_macs
	local first sections s mac zone masq6
	mode="$(uci -q get equipe_dashboard.ipv6.mode || echo 'dual_stack')"
	relay="$(uci -q get equipe_dashboard.ipv6.relay || echo '0')"
	wan6_proto="$(uci -q get network.wan6.proto || echo 'none')"
	wan6_dev="$(uci -q get network.wan6.device || echo '')"
	
	lan_dev="$(uci -q get network.lan.device || echo '')"
	if [ -z "$lan_dev" ]; then
		if [ "$(uci -q get network.lan.type)" = "bridge" ] || [ -d /sys/class/net/br-lan ]; then
			lan_dev="br-lan"
		else
			lan_dev="$(uci -q get network.lan.ifname || echo br-lan)"
		fi
	fi
	prefix_delegated="$(ip -6 route show 2>/dev/null | grep -E 'proto (kernel|ra|static)' | grep -v 'fe80::' | grep -vE '^fd[0-9a-fA-F]{2}:' | head -n 1 | awk '{print $1}')"
	lan_ip6="$(ip -6 addr show dev "$lan_dev" scope global 2>/dev/null | grep -vE 'fd[0-9a-fA-F]{2}:' | grep 'inet6' | head -n 1 | awk '{print $2}')"
	ula_ip6="$(ip -6 addr show dev "$lan_dev" scope global 2>/dev/null | grep -E 'fd[0-9a-fA-F]{2}:' | grep 'inet6' | head -n 1 | awk '{print $2}')"
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

	zone="$(firewall_wan_zone_section)"
	masq6="$(uci -q get "firewall.$zone.masq6" || echo 0)"

	cat <<EOF
{
  "mode": "$mode",
  "relay": $([ "$relay" = "1" ] && echo true || echo false),
  "masq6": $([ "$masq6" = "1" ] && echo true || echo false),
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
	local ula iface zone sec sysctl_ipv6_conf lan_dev
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
	uci -q set equipe_dashboard.ipv6=ipv6
	uci -q set equipe_dashboard.ipv6.mode='ipv4_only'
	uci commit equipe_dashboard
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

mwan3_reorder_rules() {
	local order_idx r
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
	uci -q reorder "mwan3.http=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.iot_alexa_mqtt=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.bypass_loopback_v4=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.bypass_loopback_v6=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.bypass_fe80=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	uci -q reorder "mwan3.bypass_fc00=$order_idx" 2>/dev/null || true; order_idx=$((order_idx + 1))
	# Regras de Blindagem de Portas Seguras (Safe Ports Shield - Prioridade WAN 1 com Sticky)
	for r in safe_iot safe_voip_udp safe_voip_tcp safe_gaming_udp safe_gaming_tcp safe_remote_tcp safe_remote_udp; do
		uci -q reorder "mwan3.$r=$order_idx" 2>/dev/null || true
		order_idx=$((order_idx + 1))
	done
	for r in $(uci -q show mwan3 2>/dev/null | grep '=rule$' | cut -d. -f2 | cut -d= -f1 | grep -E '^safe_'); do
		uci -q reorder "mwan3.$r=$order_idx" 2>/dev/null || true
		order_idx=$((order_idx + 1))
	done
	# 1. Regras PBR customizadas do usuario (White/Black especificas tem prioridade sobre BitTorrent amplo)
	for r in $(uci -q show mwan3 2>/dev/null | grep '=rule$' | cut -d. -f2 | cut -d= -f1 | grep -E '^ark_rule_|^ark_pbr_|^pbr_'); do
		uci -q reorder "mwan3.$r=$order_idx" 2>/dev/null || true
		order_idx=$((order_idx + 1))
	done
	# 2. Regras gerais de BitTorrent / P2P
	for r in $(uci -q show mwan3 2>/dev/null | grep '=rule$' | cut -d. -f2 | cut -d= -f1 | grep -E '^torrent_|^tor_'); do
		uci -q reorder "mwan3.$r=$order_idx" 2>/dev/null || true
		order_idx=$((order_idx + 1))
	done
	uci -q reorder "mwan3.default_rule_v4=99" 2>/dev/null || true
}

get_configured_ping_track_ips() {
	local fallback
	local target="$(uci -q get equipe_dashboard.main.ping_target 2>/dev/null)"
	[ -n "$target" ] || target="cloudflare"
	local custom_ip="$(uci -q get equipe_dashboard.main.ping_custom_ip 2>/dev/null)"
	local primary=""
	case "$target" in
		cloudflare)    primary="1.1.1.1" ;;
		google)        primary="8.8.8.8" ;;
		quad9)         primary="9.9.9.9" ;;
		cloudflare_v6) primary="" ;;
		google_v6)     primary="" ;;
		quad9_v6)      primary="" ;;
		registro_br)   primary="1.1.1.1" ;;
		custom)
			case "$custom_ip" in
				*:*) primary="" ;;
				*)   primary="${custom_ip:-1.1.1.1}" ;;
			esac
			;;
		isp)
			primary="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"
			[ -n "$primary" ] || primary="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].ptpaddress' 2>/dev/null)"
			[ -n "$primary" ] || primary="$(uci -q get network.wan.gateway || true)"
			;;
		*)             primary="1.1.1.1" ;;
	esac

	local ips=""
	[ -n "$primary" ] && ips="$primary"
	for fallback in 1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4 9.9.9.9 208.67.222.222; do
		case " $ips " in
			*" $fallback "*) ;;
			*) ips="${ips:+$ips }$fallback" ;;
		esac
	done
	[ -n "$ips" ] || ips="1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4 9.9.9.9"
	printf '%s\n' "$ips"
}

ensure_mwan3_ark_config() {
	local sec active_wans active_wan_count w auto p d m_sec is_active act m_mem m_target
	local wan_idx track_ips has_wan2 current_mwan_mode lan_net lan_prefix primary_policy r_sec r_pol
	{ [ -f "${ARK_ROOT}/etc/config/mwan3" ] || [ -f /etc/config/mwan3 ]; } || return 0
	for sec in wan6 wanb wanb6 wanb_m1_w2 wanb_m1_w3 wanb_m2_w2 wan6_m1_w3 wan6_m2_w3 wanb6_m1_w2 wanb6_m1_w3 wanb6_m2_w2 wanb_only wan_wanb wanb_wan default_rule_v6 device_wan1_pref device_wan2_pref bypass_private; do
		uci -q delete "mwan3.$sec" 2>/dev/null || true
	done
	active_wans=""
	active_wan_count=0
	for w in $(uci -q show network | grep '=interface' | cut -d. -f2 | cut -d= -f1 | grep -E '^wan([0-9]+)?$'); do
		auto="$(uci -q get "network.$w.auto" || printf '1')"
		[ "$auto" != "0" ] || continue
		p="$(uci -q get "network.$w.proto" || printf 'none')"
		d="$(uci -q get "network.$w.device" || uci -q get "network.$w.ifname" || printf '')"
		if [ "$p" != "none" ] && [ "$p" != "dhcpv6" ] && [ "$w" != "wan6" ] && [ -n "$d" ]; then
			active_wans="$active_wans $w"
			active_wan_count=$((active_wan_count + 1))
		fi
	done
	[ -n "$active_wans" ] || active_wans="wan"

	if [ "$active_wan_count" -lt 2 ]; then
		# Roteador com apenas 1 WAN: desativa servico mwan3 para garantir rotas puras do kernel e zero falsos positivos
		if [ -x /etc/init.d/mwan3 ]; then
			/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
			/etc/init.d/mwan3 disable >/dev/null 2>&1 || true
		fi
	else
		if [ -x /etc/init.d/mwan3 ]; then
			/etc/init.d/mwan3 enable >/dev/null 2>&1 || true
		fi
	fi

	# Garbage collector de secoes orfas no mwan3 (interfaces e politicas dedicadas antigas)
	for m_sec in $(uci -q show mwan3 | grep '=interface' | cut -d. -f2 | cut -d= -f1); do
		is_active=0
		for act in $active_wans; do
			if [ "$m_sec" = "$act" ]; then
				is_active=1
				break
			fi
		done
		if [ "$is_active" = "0" ]; then
			uci -q delete "mwan3.$m_sec" 2>/dev/null || true
			uci -q delete "mwan3.${m_sec}_only" 2>/dev/null || true
		fi
	done

	# Purga membros associados a interfaces inativas ou inexistentes
	for m_mem in $(uci -q show mwan3 | grep '=member' | cut -d. -f2 | cut -d= -f1); do
		m_target="$(uci -q get "mwan3.$m_mem.interface" || printf '')"
		if [ -n "$m_target" ]; then
			is_active=0
			for act in $active_wans; do
				if [ "$m_target" = "$act" ]; then
					is_active=1
					break
				fi
			done
			if [ "$is_active" = "0" ]; then
				uci -q delete "mwan3.$m_mem" 2>/dev/null || true
			fi
		fi
	done

	for p in wan_only wan2_only wan3_only wan4_only balanced wan_then_wan2 wan2_then_wan wan1_pref wan2_pref; do
		uci -q delete "mwan3.$p.use_member" 2>/dev/null || true
	done
	wan_idx=1
	track_ips="$(get_configured_ping_track_ips)"
	[ -n "$track_ips" ] || track_ips="1.1.1.1 1.0.0.1 8.8.8.8 8.8.4.4 9.9.9.9"
	for w in $active_wans; do
		uci -q set "mwan3.$w=interface"
		uci -q set "mwan3.$w.enabled=1"
		uci -q set "mwan3.$w.family=ipv4"
		uci -q set "mwan3.$w.initial_state=online"
		uci -q set "mwan3.$w.reliability=1"
		uci -q set "mwan3.$w.count=1"
		uci -q set "mwan3.$w.timeout=4"
		uci -q set "mwan3.$w.interval=10"
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

	has_wan2=0
	for act in $active_wans; do
		[ "$act" = "wan2" ] && has_wan2=1
	done

	if [ "$has_wan2" = "1" ]; then
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
	else
		uci -q delete mwan3.wan2_then_wan 2>/dev/null || true
		uci -q delete mwan3.wan2_pref 2>/dev/null || true
		uci -q delete mwan3.wan1_pref 2>/dev/null || true
		uci -q delete mwan3.wan2_m1_w3 2>/dev/null || true
		uci -q delete mwan3.wan2_m2_w3 2>/dev/null || true
		uci -q delete mwan3.dev_pool1 2>/dev/null || true
		uci -q delete mwan3.dev_pool2 2>/dev/null || true
	fi

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

	# Politica primaria dinamica (identifica automaticamente se a WAN 1 ou WAN 2 e a principal)
	primary_policy="wan_then_wan2"
	case "$current_mwan_mode" in
		failover_wan2|wan2_then_wan) primary_policy="wan2_then_wan" ;;
		wan2|wan2_only) primary_policy="wan2_only" ;;
		wan1|wan|wan_only) primary_policy="wan_only" ;;
		*) primary_policy="wan_then_wan2" ;;
	esac
	if [ "$has_wan2" = "0" ]; then
		primary_policy="wan_only"
	fi

	# Regras de DNS de Ultra-Baixa Latencia (Sem Sticky / Failover Instantaneo)
	uci -q set mwan3.dns_udp=rule
	uci -q set mwan3.dns_udp.family=ipv4
	uci -q set mwan3.dns_udp.proto=udp
	uci -q set mwan3.dns_udp.dest_port=53
	uci -q set mwan3.dns_udp.sticky=0
	[ -n "$(uci -q get mwan3.dns_udp.use_policy)" ] || uci -q set mwan3.dns_udp.use_policy="$primary_policy"

	uci -q set mwan3.dns_tcp=rule
	uci -q set mwan3.dns_tcp.family=ipv4
	uci -q set mwan3.dns_tcp.proto=tcp
	uci -q set mwan3.dns_tcp.dest_port='53,853'
	uci -q set mwan3.dns_tcp.sticky=0
	[ -n "$(uci -q get mwan3.dns_tcp.use_policy)" ] || uci -q set mwan3.dns_tcp.use_policy="$primary_policy"

	# Regra de WireGuard VPN (Resiliente / Sem Sticky / Failover Imediato)
	uci -q set mwan3.wireguard_udp=rule
	uci -q set mwan3.wireguard_udp.family=ipv4
	uci -q set mwan3.wireguard_udp.proto=udp
	uci -q set mwan3.wireguard_udp.dest_port='51820,51821'
	uci -q set mwan3.wireguard_udp.sticky=0
	uci -q set mwan3.wireguard_udp.timeout=60
	[ -n "$(uci -q get mwan3.wireguard_udp.use_policy)" ] || uci -q set mwan3.wireguard_udp.use_policy="$primary_policy"

	# 3. Regras Criticas Essenciais
	uci -q set mwan3.ssh=rule
	uci -q set mwan3.ssh.dest_port=22
	uci -q set mwan3.ssh.family=ipv4
	uci -q set mwan3.ssh.proto=tcp
	uci -q set mwan3.ssh.sticky=1
	uci -q set mwan3.ssh.timeout=3600
	[ -n "$(uci -q get mwan3.ssh.use_policy)" ] || uci -q set mwan3.ssh.use_policy="$primary_policy"

	uci -q set mwan3.whatsapp_tcp=rule
	uci -q set mwan3.whatsapp_tcp.dest_port='5222,5228,5242'
	uci -q set mwan3.whatsapp_tcp.family=ipv4
	uci -q set mwan3.whatsapp_tcp.proto=tcp
	uci -q set mwan3.whatsapp_tcp.sticky=1
	uci -q set mwan3.whatsapp_tcp.timeout=3600
	[ -n "$(uci -q get mwan3.whatsapp_tcp.use_policy)" ] || uci -q set mwan3.whatsapp_tcp.use_policy="$primary_policy"

	uci -q set mwan3.whatsapp_udp=rule
	uci -q set mwan3.whatsapp_udp.dest_port=3478
	uci -q set mwan3.whatsapp_udp.family=ipv4
	uci -q set mwan3.whatsapp_udp.proto=udp
	uci -q set mwan3.whatsapp_udp.sticky=1
	uci -q set mwan3.whatsapp_udp.timeout=3600
	[ -n "$(uci -q get mwan3.whatsapp_udp.use_policy)" ] || uci -q set mwan3.whatsapp_udp.use_policy="$primary_policy"

	uci -q set mwan3.https=rule
	uci -q set mwan3.https.dest_port=443
	uci -q set mwan3.https.family=ipv4
	uci -q set mwan3.https.proto=tcp
	uci -q set mwan3.https.sticky=1
	uci -q set mwan3.https.timeout=600
	[ -n "$(uci -q get mwan3.https.use_policy)" ] || uci -q set mwan3.https.use_policy="$primary_policy"

	uci -q set mwan3.https_quic=rule
	uci -q set mwan3.https_quic.dest_port=443
	uci -q set mwan3.https_quic.family=ipv4
	uci -q set mwan3.https_quic.proto=udp
	uci -q set mwan3.https_quic.sticky=1
	uci -q set mwan3.https_quic.timeout=3600
	[ -n "$(uci -q get mwan3.https_quic.use_policy)" ] || uci -q set mwan3.https_quic.use_policy="$primary_policy"

	uci -q set mwan3.http=rule
	uci -q set mwan3.http.family=ipv4
	uci -q set mwan3.http.proto=tcp
	uci -q set mwan3.http.dest_port='80'
	uci -q set mwan3.http.sticky=1
	uci -q set mwan3.http.timeout=600
	[ -n "$(uci -q get mwan3.http.use_policy)" ] || uci -q set mwan3.http.use_policy="$primary_policy"

	uci -q set mwan3.iot_alexa_mqtt=rule
	uci -q set mwan3.iot_alexa_mqtt.family=ipv4
	uci -q set mwan3.iot_alexa_mqtt.proto=tcp
	uci -q set mwan3.iot_alexa_mqtt.dest_port='8883,8886'
	uci -q set mwan3.iot_alexa_mqtt.sticky=1
	uci -q set mwan3.iot_alexa_mqtt.timeout=3600
	[ -n "$(uci -q get mwan3.iot_alexa_mqtt.use_policy)" ] || uci -q set mwan3.iot_alexa_mqtt.use_policy="$primary_policy"

	# 4. Regras de Blindagem de Portas Seguras (Safe Ports Shield - Prioridade WAN Primaria com Sticky)
	# 4.1 Assistentes de Voz e Smart Home (Alexa, Google Nest/FCM, Apple APNs, MQTT Tuya/Sonoff)
	uci -q set mwan3.safe_iot=rule
	uci -q set mwan3.safe_iot.family=ipv4
	uci -q set mwan3.safe_iot.proto=tcp
	uci -q set mwan3.safe_iot.dest_port='1883,5223,5228:5230,8883,8886'
	uci -q set mwan3.safe_iot.sticky=1
	uci -q set mwan3.safe_iot.timeout=3600
	[ -n "$(uci -q get mwan3.safe_iot.use_policy)" ] || uci -q set mwan3.safe_iot.use_policy="$primary_policy"

	# 4.2 Chamadas de Voz, Videoconferencias e VoIP (SIP, WhatsApp, STUN, Zoom, Google Meet, Teams, Discord)
	uci -q set mwan3.safe_voip_udp=rule
	uci -q set mwan3.safe_voip_udp.family=ipv4
	uci -q set mwan3.safe_voip_udp.proto=udp
	uci -q set mwan3.safe_voip_udp.dest_port='3478:3481,5060:5061,8801:8810,19302:19309,50000:50059,50001:50004,50318'
	uci -q set mwan3.safe_voip_udp.sticky=1
	uci -q set mwan3.safe_voip_udp.timeout=3600
	[ -n "$(uci -q get mwan3.safe_voip_udp.use_policy)" ] || uci -q set mwan3.safe_voip_udp.use_policy="$primary_policy"

	uci -q set mwan3.safe_voip_tcp=rule
	uci -q set mwan3.safe_voip_tcp.family=ipv4
	uci -q set mwan3.safe_voip_tcp.proto=tcp
	uci -q set mwan3.safe_voip_tcp.dest_port='5060,5061'
	uci -q set mwan3.safe_voip_tcp.sticky=1
	uci -q set mwan3.safe_voip_tcp.timeout=3600
	[ -n "$(uci -q get mwan3.safe_voip_tcp.use_policy)" ] || uci -q set mwan3.safe_voip_tcp.use_policy="$primary_policy"

	# 4.3 Consoles e Jogos Online (PlayStation Network, Xbox Live, Steam, Riot, Battle.net, EA Sports)
	uci -q set mwan3.safe_gaming_udp=rule
	uci -q set mwan3.safe_gaming_udp.family=ipv4
	uci -q set mwan3.safe_gaming_udp.proto=udp
	uci -q set mwan3.safe_gaming_udp.dest_port='88,500,1119,3074,3478:3480,3544,3659,4500,5000:5500,8393:8400,27000:27036'
	uci -q set mwan3.safe_gaming_udp.sticky=1
	uci -q set mwan3.safe_gaming_udp.timeout=3600
	[ -n "$(uci -q get mwan3.safe_gaming_udp.use_policy)" ] || uci -q set mwan3.safe_gaming_udp.use_policy="$primary_policy"

	uci -q set mwan3.safe_gaming_tcp=rule
	uci -q set mwan3.safe_gaming_tcp.family=ipv4
	uci -q set mwan3.safe_gaming_tcp.proto=tcp
	uci -q set mwan3.safe_gaming_tcp.dest_port='1119,2099,3074,3724,6112:6114,8393:8400,27015,27036'
	uci -q set mwan3.safe_gaming_tcp.sticky=1
	uci -q set mwan3.safe_gaming_tcp.timeout=3600
	[ -n "$(uci -q get mwan3.safe_gaming_tcp.use_policy)" ] || uci -q set mwan3.safe_gaming_tcp.use_policy="$primary_policy"

	# 4.4 Trabalho Remoto e Streaming de Musica (RDP, TeamViewer, AnyDesk, Spotify Connect)
	uci -q set mwan3.safe_remote_tcp=rule
	uci -q set mwan3.safe_remote_tcp.family=ipv4
	uci -q set mwan3.safe_remote_tcp.proto=tcp
	uci -q set mwan3.safe_remote_tcp.dest_port='3389,4070,5938,6568'
	uci -q set mwan3.safe_remote_tcp.sticky=1
	uci -q set mwan3.safe_remote_tcp.timeout=3600
	[ -n "$(uci -q get mwan3.safe_remote_tcp.use_policy)" ] || uci -q set mwan3.safe_remote_tcp.use_policy="$primary_policy"

	uci -q set mwan3.safe_remote_udp=rule
	uci -q set mwan3.safe_remote_udp.family=ipv4
	uci -q set mwan3.safe_remote_udp.proto=udp
	uci -q set mwan3.safe_remote_udp.dest_port='3389,4070,5938'
	uci -q set mwan3.safe_remote_udp.sticky=1
	uci -q set mwan3.safe_remote_udp.timeout=3600
	[ -n "$(uci -q get mwan3.safe_remote_udp.use_policy)" ] || uci -q set mwan3.safe_remote_udp.use_policy="$primary_policy"

	# 5. Regra Geral Catch-All (SEMPRE A ULTIMA REGRA)
	uci -q set mwan3.default_rule_v4=rule
	uci -q set mwan3.default_rule_v4.dest_ip='0.0.0.0/0'
	uci -q set mwan3.default_rule_v4.family=ipv4
	uci -q set mwan3.default_rule_v4.sticky=1
	[ -n "$(uci -q get mwan3.default_rule_v4.use_policy)" ] || uci -q set mwan3.default_rule_v4.use_policy="$primary_policy"

	# Saneia políticas de regras que apontam para seções deletadas ou inexistentes
	for r_sec in $(uci -q show mwan3 | grep '=rule' | cut -d. -f2 | cut -d= -f1); do
		r_pol="$(uci -q get "mwan3.$r_sec.use_policy" || printf '')"
		if [ -n "$r_pol" ] && [ "$r_pol" != "default" ]; then
			if [ "$(uci -q get "mwan3.$r_pol")" != "policy" ]; then
				uci -q set "mwan3.$r_sec.use_policy=$primary_policy"
			fi
		fi
	done

	# Reordenacao estrita de prioridade no UCI
	mwan3_reorder_rules
}

mwan3_sync_lifecycle() {
	local w
	[ -x /etc/init.d/mwan3 ] || return 0
	[ -f /etc/config/mwan3 ] || return 0
	local active_cnt=0
	for w in $(uci -q show network | grep '=interface' | cut -d. -f2 | cut -d= -f1 | grep -E '^wan([0-9]+)?$'); do
		case "$w" in
			wan6|*_6|*6) continue ;;
		esac
		local auto="$(uci -q get "network.$w.auto" || echo '1')"
		[ "$auto" != "0" ] || continue
		local p="$(uci -q get "network.$w.proto" || echo 'none')"
		local d="$(uci -q get "network.$w.device" || uci -q get "network.$w.ifname" || echo '')"
		case "$d" in @*) continue ;; esac
		[ "$p" != "none" ] && [ "$p" != "dhcpv6" ] && [ -n "$d" ] && active_cnt=$((active_cnt + 1))
	done
	if [ "$active_cnt" -lt 2 ]; then
		logger -t equipe-mwan "Single-WAN detectado ($active_cnt interface WAN ativa). MWAN3 pausado em standby para economizar CPU/RAM."
		/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
		/etc/init.d/mwan3 disable >/dev/null 2>&1 || true
		if is_fw4; then
			/sbin/fw4 reload >/dev/null 2>&1 || true
		fi
	else
		if [ "$(uci -q get equipe_dashboard.speedify.desired_state)" != "connected" ]; then
			logger -t equipe-mwan "Multi-WAN detectado ($active_cnt interfaces WAN ativas). Ativando servico MWAN3."
			/etc/init.d/mwan3 enable >/dev/null 2>&1 || true
			/etc/init.d/mwan3 restart >/dev/null 2>&1 || true
		fi
	fi
}

