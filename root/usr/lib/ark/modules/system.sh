#!/bin/sh
# /usr/lib/ark/modules/system.sh - System Performance, Sysctl, DMZ, LEDs & Hardware Module
# Compatible with BusyBox /bin/ash, OpenWrt 19.07 to 25.12

[ -z "${_ARK_SYSTEM_SH_LOADED:-}" ] || return 0
_ARK_SYSTEM_SH_LOADED=1

[ -n "${ARK_LIB_DIR:-}" ] || ARK_LIB_DIR="/usr/lib/ark"
. "${ARK_LIB_DIR}/common.sh"
. "${ARK_LIB_DIR}/logging.sh"
. "${ARK_LIB_DIR}/validation.sh"

system_perf_status_json() {
	conntrack_recycle=false
	[ "$(uci -q get equipe_perf.settings.conntrack_recycle || printf 0)" = 1 ] && conntrack_recycle=true

	ram_autopurge=false
	[ "$(uci -q get equipe_perf.settings.ram_autopurge || printf 0)" = 1 ] && ram_autopurge=true

	speedify_encryption=true
	[ "$(uci -q get equipe_perf.settings.speedify_encryption || printf 1)" = 0 ] && speedify_encryption=false

	speedify_installed=false
	speedify_cli_bin="$(which speedify_cli 2>/dev/null || echo '')"
	[ -n "$speedify_cli_bin" ] && speedify_installed=true

	speedify_log_cap=false
	[ "$(uci -q get equipe_perf.settings.speedify_log_cap || printf 0)" = 1 ] && speedify_log_cap=true

	nlbwmon_lite=false
	[ "$(uci -q get equipe_perf.settings.nlbwmon_lite || printf 0)" = 1 ] && nlbwmon_lite=true

	irq_installed=false; irq_active=false
	[ -x /etc/init.d/irqbalance ] && irq_installed=true
	[ "$irq_installed" = true ] && { pidof irqbalance >/dev/null 2>&1 || { [ -x /etc/init.d/irqbalance ] && /etc/init.d/irqbalance enabled >/dev/null 2>&1; }; } && irq_active=true

	conntrack_count="$(cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo 0)"
	conntrack_max="$(cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null || echo 0)"

	mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_avail_kb="$(awk '/MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null || awk '/MemFree:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"

	dns_allservers=false
	saved_allservers="$(uci -q get equipe_perf.settings.dns_allservers || true)"
	if [ -n "$saved_allservers" ]; then
		case "$saved_allservers" in 1|true) dns_allservers=true ;; *) dns_allservers=false ;; esac
	else
		[ "$(uci -q get dhcp.@dnsmasq[0].allservers)" = 1 ] && dns_allservers=true
	fi

	saved_servers="$(uci -q get equipe_perf.settings.dns_servers || true)"
	clean_saved=""
	for s in $saved_servers; do
		s="$(printf '%s' "$s" | tr -d '\r\n\t ')"
		[ -n "$s" ] || continue
		case "$s" in
			/*|*/*|127.*|0.0.0.0*|::1*|localhost*) continue ;;
		esac
		clean_s="$(printf '%s' "$s" | sed -E 's/#[0-9]+$//')"
		valid_ip "$clean_s" || continue
		clean_saved="${clean_saved:+$clean_saved }$s"
	done
	if [ -n "$clean_saved" ]; then
		dns_servers="$clean_saved"
	else
		raw_servers="$(uci -q get dhcp.@dnsmasq[0].server 2>/dev/null | tr '\r\n\t' '   ' | sed 's/  */ /g; s/ $//' || true)"
		clean_servers=""
		for s in $raw_servers; do
			s="$(printf '%s' "$s" | tr -d '\r\n\t ')"
			[ -n "$s" ] || continue
			case "$s" in
				/*|*/*|127.*|0.0.0.0*|::1*|localhost*) continue ;;
			esac
			clean_s="$(printf '%s' "$s" | sed -E 's/#[0-9]+$//')"
			valid_ip "$clean_s" || continue
			clean_servers="${clean_servers:+$clean_servers }$s"
		done
		dns_servers="${clean_servers:-1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4}"
	fi

	blocker_name="$(detect_dns_blocker 2>/dev/null || true)"
	dns_blocker_active=false
	[ -n "$blocker_name" ] && dns_blocker_active=true

	root_df="$(df -k / 2>/dev/null | awk 'NR==2{print $2,$3,$4}')"
	root_total_kb="$(printf '%s' "$root_df" | awk '{print $1}')"
	root_used_kb="$(printf '%s' "$root_df" | awk '{print $2}')"
	root_avail_kb="$(printf '%s' "$root_df" | awk '{print $3}')"
	[ -n "$root_total_kb" ] || root_total_kb=0
	[ -n "$root_used_kb" ] || root_used_kb=0
	[ -n "$root_avail_kb" ] || root_avail_kb=0

	wifi_supplicant_disable=false
	[ "$(uci -q get wireless.globals.supplicant || printf 1)" = 0 ] && wifi_supplicant_disable=true

	ram_trim_interval="$(uci -q get equipe_perf.settings.ram_trim_interval || printf 0)"

	printf '{"conntrack_recycle":%s,"ram_autopurge":%s,"speedify_encryption":%s,"speedify_installed":%s,"speedify_log_cap":%s,"nlbwmon_lite":%s,"irqbalance_installed":%s,"irqbalance_active":%s,"conntrack_count":%s,"conntrack_max":%s,"mem_total_kb":%s,"mem_avail_kb":%s,"root_total_kb":%s,"root_used_kb":%s,"root_avail_kb":%s,"dns_allservers":%s,"dns_servers":"%s","dns_blocker_active":%s,"dns_blocker_name":"%s","wifi_supplicant_disable":%s,"ram_trim_interval":"%s"}\n' \
		"$conntrack_recycle" "$ram_autopurge" "$speedify_encryption" "$speedify_installed" "$speedify_log_cap" "$nlbwmon_lite" "$irq_installed" "$irq_active" "$conntrack_count" "$conntrack_max" "$mem_total_kb" "$mem_avail_kb" "$root_total_kb" "$root_used_kb" "$root_avail_kb" "$dns_allservers" "$(json_escape "$dns_servers")" "$dns_blocker_active" "$(json_escape "$blocker_name")" "$wifi_supplicant_disable" "$(json_escape "$ram_trim_interval")"
}

dmz_status_json() {
	enabled=false
	dest_ip=""
	mac=""
	device_name=""
	src_zone="wan"

	cur_dest="$(uci -q get firewall.ark_dmz.dest_ip || true)"
	cur_enabled="$(uci -q get firewall.ark_dmz.enabled || printf 1)"

	if [ -n "$cur_dest" ] && [ "$cur_enabled" != "0" ]; then
		enabled=true
		dest_ip="$cur_dest"
	fi

	saved_enabled="$(uci -q get equipe_dashboard.dmz.enabled || printf 0)"
	saved_ip="$(uci -q get equipe_dashboard.dmz.dest_ip || true)"
	saved_mac="$(uci -q get equipe_dashboard.dmz.mac || true)"
	saved_name="$(uci -q get equipe_dashboard.dmz.name || true)"

	if [ "$saved_enabled" = 1 ] && [ -n "$saved_ip" ]; then
		dest_ip="$saved_ip"
		[ -n "$saved_mac" ] && mac="$saved_mac"
		[ -n "$saved_name" ] && device_name="$saved_name"
	fi

	if [ -n "$dest_ip" ]; then
		if [ -z "$mac" ]; then
			if [ -f /tmp/dhcp.leases ]; then
				mac="$(awk -v ip="$dest_ip" '$3==ip {print toupper($2); exit}' /tmp/dhcp.leases)"
			fi
			if [ -z "$mac" ]; then
				mac="$(ip neigh show 2>/dev/null | awk -v ip="$dest_ip" '$1==ip {print toupper($5); exit}')"
			fi
		fi
		if [ -n "$mac" ] && [ -z "$device_name" ]; then
			sec_name="device_$(printf '%s' "$mac" | tr -d ':')"
			device_name="$(uci -q get "equipe_devices.$sec_name.name" || true)"
			if [ -z "$device_name" ]; then
				host="$(find_dhcp_host "$mac")"
				[ -n "$host" ] && device_name="$(uci -q get "dhcp.$host.name" || true)"
			fi
		fi
	fi

	printf '{"enabled":%s,"dest_ip":"%s","mac":"%s","name":"%s","src_zone":"%s"}\n' \
		"$enabled" "$(json_escape "$dest_ip")" "$(json_escape "$mac")" "$(json_escape "$device_name")" "$(json_escape "$src_zone")"
}

dmz_set() {
	enable="${1:-0}"
	ip="$(printf '%s' "${2:-}" | tr -d ' ,;\t\r\n')"
	mac="$(printf '%s' "${3:-}" | tr '-' ':' | tr 'a-f' 'A-F' | tr -d ' ')"
	name="${4:-}"
	wan_src="${5:-wan}"

	case "$enable" in
		1|true|on)
			valid_ipv4 "$ip" || { echo "Endereço IPv4 inválido para DMZ" >&2; exit 2; }
			same_managed_subnet "$ip" || { echo "O IP do DMZ deve pertencer à mesma rede local (LAN) do roteador" >&2; exit 2; }

			if [ -n "$mac" ]; then
				valid_mac "$mac" || { echo "Endereço MAC inválido" >&2; exit 2; }
				suffix="$(device_suffix "$mac")"
				sec_name="device_$(printf '%s' "$mac" | tr -d ':')"
				host="$(find_dhcp_host "$mac")"
				[ -n "$host" ] || host="ark_$suffix"
				clean_host_name="$(printf '%s' "${name:-ark-$suffix}" | sed 's/[^a-zA-Z0-9_-]/-/g; s/\-{2,\}/-/g; s/^-//; s/-$//')"
				[ -n "$clean_host_name" ] || clean_host_name="ark-$suffix"

				uci -q set "dhcp.$host=host"
				uci -q set "dhcp.$host.name=$clean_host_name"
				uci -q set "dhcp.$host.mac=$mac"
				uci -q set "dhcp.$host.ip=$ip"
				uci commit dhcp
				/etc/init.d/dnsmasq reload >/dev/null 2>&1 || true

				[ -n "$name" ] && uci -q set "equipe_devices.$sec_name.name=$name"
				uci -q set "equipe_devices.$sec_name.mac=$mac"
				uci commit equipe_devices
			fi

			uci -q set firewall.ark_dmz=redirect
			uci -q set firewall.ark_dmz.name='ARK_DMZ'
			uci -q set "firewall.ark_dmz.src=$wan_src"
			uci -q set firewall.ark_dmz.dest='lan'
			uci -q set firewall.ark_dmz.proto='all'
			uci -q set "firewall.ark_dmz.dest_ip=$ip"
			uci -q set firewall.ark_dmz.target='DNAT'
			uci -q set firewall.ark_dmz.enabled='1'
			uci commit firewall

			uci -q set equipe_dashboard.dmz=dmz
			uci -q set equipe_dashboard.dmz.enabled='1'
			uci -q set "equipe_dashboard.dmz.dest_ip=$ip"
			[ -n "$mac" ] && uci -q set "equipe_dashboard.dmz.mac=$mac"
			[ -n "$name" ] && uci -q set "equipe_dashboard.dmz.name=$name"
			uci commit equipe_dashboard

			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			echo ok
			;;
		*)
			uci -q delete firewall.ark_dmz
			uci commit firewall
			if [ -f /etc/config/equipe_dashboard ]; then
				uci -q set equipe_dashboard.dmz=dmz
				uci -q set equipe_dashboard.dmz.enabled='0'
				uci commit equipe_dashboard
			fi
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			echo ok
			;;
	esac
}

dns_turbo_status_json() {
	allservers=false
	saved_allservers="$(uci -q get equipe_perf.settings.dns_allservers || true)"
	if [ -n "$saved_allservers" ]; then
		case "$saved_allservers" in 1|true) allservers=true ;; *) allservers=false ;; esac
	else
		[ "$(uci -q get dhcp.@dnsmasq[0].allservers)" = 1 ] && allservers=true
	fi

	saved_servers="$(uci -q get equipe_perf.settings.dns_servers || true)"
	clean_saved=""
	for s in $saved_servers; do
		s="$(printf '%s' "$s" | tr -d '\r\n\t ')"
		[ -n "$s" ] || continue
		case "$s" in
			/*|*/*|127.*|0.0.0.0*|::1*|localhost*) continue ;;
		esac
		clean_s="$(printf '%s' "$s" | sed -E 's/#[0-9]+$//')"
		valid_ip "$clean_s" || continue
		clean_saved="${clean_saved:+$clean_saved }$s"
	done
	if [ -n "$clean_saved" ]; then
		servers="$clean_saved"
	else
		raw_servers="$(uci -q get dhcp.@dnsmasq[0].server 2>/dev/null | tr '\r\n\t' '   ' | sed 's/  */ /g; s/ $//' || true)"
		clean_servers=""
		for s in $raw_servers; do
			s="$(printf '%s' "$s" | tr -d '\r\n\t ')"
			[ -n "$s" ] || continue
			case "$s" in
				/*|*/*|127.*|0.0.0.0*|::1*|localhost*) continue ;;
			esac
			clean_s="$(printf '%s' "$s" | sed -E 's/#[0-9]+$//')"
			valid_ip "$clean_s" || continue
			clean_servers="${clean_servers:+$clean_servers }$s"
		done
		servers="${clean_servers:-1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4}"
	fi

	filter_aaaa=false
	[ "$(uci -q get dhcp.@dnsmasq[0].filter_aaaa)" = 1 ] && filter_aaaa=true
	dhcp_fallback=false
	saved_fallback="$(uci -q get equipe_perf.settings.dns_dhcp_fallback || true)"
	if [ -n "$saved_fallback" ]; then
		case "$saved_fallback" in 1|true) dhcp_fallback=true ;; *) dhcp_fallback=false ;; esac
	else
		case "$(uci -q get dhcp.lan.dhcp_option || true)" in
			*1.1.1.1*) dhcp_fallback=true ;;
		esac
	fi
	blocker_name="$(detect_dns_blocker 2>/dev/null || true)"
	dns_blocker_active=false
	[ -n "$blocker_name" ] && dns_blocker_active=true
	printf '{"allservers":%s,"servers":"%s","filter_aaaa":%s,"dhcp_fallback":%s,"dns_blocker_active":%s,"dns_blocker_name":"%s"}\n' \
		"$allservers" "$(json_escape "$servers")" "$filter_aaaa" "$dhcp_fallback" "$dns_blocker_active" "$(json_escape "$blocker_name")"
}

dns_turbo_save() {
	allservers="${1:-1}"
	dns1="$2"
	dns2="$3"
	dns3="$4"
	dns4="$5"
	fallback="${6:-0}"
	case "$allservers" in 1|true) allservers=1 ;; *) allservers=0 ;; esac
	case "$fallback" in 1|true) fallback=1 ;; *) fallback=0 ;; esac

	valid_servers=""
	for raw_ip in "$dns1" "$dns2" "$dns3" "$dns4"; do
		[ -n "$raw_ip" ] || continue
		ip="$(printf '%s' "$raw_ip" | sed -E 's/#[0-9]+$//' | tr -d ' ,;\t\r\n')"
		case "$ip" in
			*:*:*) ;;
			*:*) ip="${ip%%:*}" ;;
		esac
		[ -n "$ip" ] || continue
		valid_ip "$ip" || continue
		valid_servers="${valid_servers:+$valid_servers }$ip"
	done
	[ -n "$valid_servers" ] || valid_servers="1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4"

	mkdir -p /etc/config
	[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
	uci -q set equipe_perf.settings=performance
	uci -q set "equipe_perf.settings.dns_allservers=$allservers"
	uci -q set "equipe_perf.settings.dns_servers=$valid_servers"
	uci -q set "equipe_perf.settings.dns_dhcp_fallback=$fallback"
	uci commit equipe_perf

	blocker_name="$(detect_dns_blocker 2>/dev/null || true)"
	actual_allservers="$allservers"
	if [ -n "$blocker_name" ]; then
		actual_allservers=0
	fi

	uci -q set "dhcp.@dnsmasq[0].allservers=$actual_allservers"

	# Preservar regras condicionais de dominio (/dominio/ip), limpando apenas servidores gerais
	domain_servers=""
	for s in $(uci -q get dhcp.@dnsmasq[0].server); do
		case "$s" in
			/*) domain_servers="${domain_servers:+$domain_servers }$s" ;;
		esac
	done

	uci -q delete dhcp.@dnsmasq[0].server

	if [ "$blocker_name" = "AdGuard Home" ]; then
		uci -q add_list dhcp.@dnsmasq[0].server='127.0.0.1#5335'
		uci -q set dhcp.@dnsmasq[0].noresolv='1'
	elif [ -n "$blocker_name" ]; then
		uci -q set dhcp.@dnsmasq[0].noresolv='1'
	else
		for ip in $valid_servers; do
			uci -q add_list "dhcp.@dnsmasq[0].server=$ip"
		done
		uci -q set dhcp.@dnsmasq[0].noresolv='0'
	fi

	for ds in $domain_servers; do
		uci -q add_list "dhcp.@dnsmasq[0].server=$ds"
	done

	cur_ipv6="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"
	if [ "$cur_ipv6" = "ipv4_only" ]; then
		uci -q set dhcp.@dnsmasq[0].filter_aaaa='1'
	else
		uci -q delete dhcp.@dnsmasq[0].filter_aaaa
	fi
	lan_ip="$(uci -q get network.lan.ipaddr || echo 192.168.73.1)"
	if ! command -v apply_lan_dhcp_dns >/dev/null 2>&1; then
		[ -f "${ARK_LIB_DIR:-/usr/lib/ark}/modules/network.sh" ] && . "${ARK_LIB_DIR:-/usr/lib/ark}/modules/network.sh"
	fi
	if command -v apply_lan_dhcp_dns >/dev/null 2>&1; then
		if [ "$fallback" = 1 ]; then
			apply_lan_dhcp_dns "$lan_ip 1.1.1.1"
		else
			apply_lan_dhcp_dns "$lan_ip"
		fi
	fi
	command -v sanitize_dhcp_hostnames >/dev/null 2>&1 && sanitize_dhcp_hostnames
	uci commit dhcp
	/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
	echo ok
}

network_capacity_status_json() {
	conntrack_max="$(cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null || echo 65536)"
	conntrack_count="$(cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo 0)"
	conntrack_tcp_timeout="$(cat /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_established 2>/dev/null || echo 432000)"
	dns_forward_max="$(uci -q get dhcp.@dnsmasq[0].dns_forward_max || echo 150)"
	cachesize="$(uci -q get dhcp.@dnsmasq[0].cachesize || echo 150)"
	dhcp_leasetime="$(uci -q get dhcp.lan.leasetime || echo 12h)"
	mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_total_mb=$((mem_total_kb / 1024))
	printf '{"conntrack_max":%s,"conntrack_count":%s,"conntrack_tcp_timeout":%s,"dns_forward_max":%s,"cachesize":%s,"dhcp_leasetime":"%s","mem_total_mb":%s}\n' \
		"$conntrack_max" "$conntrack_count" "$conntrack_tcp_timeout" "$dns_forward_max" "$cachesize" "$dhcp_leasetime" "$mem_total_mb"
}

network_capacity_save() {
	ct_max="${1:-131072}"
	fwd_max="${2:-2000}"
	cache_sz="${3:-10000}"
	lease_time="${4:-2h}"
	tcp_timeout="${5:-432000}"

	case "$ct_max" in ''|*[!0-9]*) ct_max=131072 ;; esac
	case "$fwd_max" in ''|*[!0-9]*) fwd_max=2000 ;; esac
	case "$cache_sz" in ''|*[!0-9]*) cache_sz=10000 ;; esac
	case "$tcp_timeout" in ''|*[!0-9]*) tcp_timeout=432000 ;; esac
	[ -n "$lease_time" ] || lease_time="2h"

	sysctl_dir="/etc/sysctl.d"
	[ -n "${ARK_ROOT}" ] && sysctl_dir="${ARK_ROOT}/etc/sysctl.d"
	mkdir -p "$sysctl_dir"
	sysctl -w "net.netfilter.nf_conntrack_max=$ct_max" 2>/dev/null || true
	sysctl -w "net.netfilter.nf_conntrack_tcp_timeout_established=$tcp_timeout" 2>/dev/null || true
	printf 'net.netfilter.nf_conntrack_max=%s\n' "$ct_max" > "${sysctl_dir}/99-ark-conntrack-max.conf"

	if [ "$tcp_timeout" -le 7200 ]; then
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_close_wait=30 2>/dev/null || true
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_fin_wait=30 2>/dev/null || true
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=30 2>/dev/null || true
		printf 'net.netfilter.nf_conntrack_tcp_timeout_established=%s\nnet.netfilter.nf_conntrack_tcp_timeout_close_wait=30\nnet.netfilter.nf_conntrack_tcp_timeout_fin_wait=30\nnet.netfilter.nf_conntrack_tcp_timeout_time_wait=30\n' "$tcp_timeout" > "${sysctl_dir}/99-ark-conntrack.conf"
		[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
		uci -q set equipe_perf.settings=performance
		uci -q set equipe_perf.settings.conntrack_recycle='1'
	else
		rm -f "${sysctl_dir}/99-ark-conntrack.conf" 2>/dev/null || true
		[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
		uci -q set equipe_perf.settings=performance
		uci -q set equipe_perf.settings.conntrack_recycle='0'
	fi
	uci commit equipe_perf

	uci -q set "dhcp.@dnsmasq[0].dns_forward_max=$fwd_max"
	uci -q set "dhcp.@dnsmasq[0].cachesize=$cache_sz"
	uci -q set "dhcp.lan.leasetime=$lease_time"
	uci commit dhcp
	/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true

	echo ok
}

system_perf_save() {
	conntrack_recycle="${1:-0}"
	ram_autopurge="${2:-0}"
	speedify_encryption="${3:-1}"
	speedify_log_cap="${4:-0}"
	nlbwmon_lite="${5:-0}"
	dns_allservers="${6:-0}"
	wifi_supplicant_disable="${7:-0}"
	ram_trim_interval="${8:-0}"

	case "$conntrack_recycle" in 1|true) conntrack_recycle=1 ;; *) conntrack_recycle=0 ;; esac
	case "$ram_autopurge" in 1|true) ram_autopurge=1 ;; *) ram_autopurge=0 ;; esac
	case "$speedify_encryption" in 0|false) speedify_encryption=0 ;; *) speedify_encryption=1 ;; esac
	case "$speedify_log_cap" in 1|true) speedify_log_cap=1 ;; *) speedify_log_cap=0 ;; esac
	case "$nlbwmon_lite" in 1|true) nlbwmon_lite=1 ;; *) nlbwmon_lite=0 ;; esac
	case "$dns_allservers" in 1|true) dns_allservers=1 ;; *) dns_allservers=0 ;; esac
	case "$wifi_supplicant_disable" in 1|true) wifi_supplicant_disable=1 ;; *) wifi_supplicant_disable=0 ;; esac
	case "$ram_trim_interval" in 1h|2h|6h|12h|24h) ;; *) ram_trim_interval=0 ;; esac

	blocker_name="$(detect_dns_blocker 2>/dev/null || true)"
	actual_dns_allservers="$dns_allservers"
	if [ -n "$blocker_name" ]; then
		actual_dns_allservers=0
	fi

	mkdir -p /etc/config
	[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
	uci -q set equipe_perf.settings=performance
	uci -q set "equipe_perf.settings.conntrack_recycle=$conntrack_recycle"
	uci -q set "equipe_perf.settings.ram_autopurge=$ram_autopurge"
	uci -q set "equipe_perf.settings.speedify_encryption=$speedify_encryption"
	uci -q set "equipe_perf.settings.speedify_log_cap=$speedify_log_cap"
	uci -q set "equipe_perf.settings.nlbwmon_lite=$nlbwmon_lite"
	uci -q set "equipe_perf.settings.dns_allservers=$dns_allservers"
	uci -q set "equipe_perf.settings.wifi_supplicant_disable=$wifi_supplicant_disable"
	uci -q set "equipe_perf.settings.ram_trim_interval=$ram_trim_interval"
	uci commit equipe_perf

	# DNS All-Servers
	if [ -z "$blocker_name" ]; then
		if [ "$(uci -q get dhcp.@dnsmasq[0].allservers)" != "$actual_dns_allservers" ]; then
			uci -q set "dhcp.@dnsmasq[0].allservers=$actual_dns_allservers"
			if [ "$actual_dns_allservers" = 1 ]; then
				has_global_server=false
				for s in $(uci -q get dhcp.@dnsmasq[0].server); do
					case "$s" in
						/*|*/*|127.*|0.0.0.0*|::1*|localhost*) continue ;;
						*) has_global_server=true; break ;;
					esac
				done
				if [ "$has_global_server" = false ]; then
					saved_servers="$(uci -q get equipe_perf.settings.dns_servers || echo '1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4')"
					for s in $saved_servers; do
						case "$s" in
							/*|*/*|127.*|0.0.0.0*|::1*|localhost*) continue ;;
						esac
						uci -q add_list "dhcp.@dnsmasq[0].server=$s"
					done
				fi
				lan_ip="$(uci -q get network.lan.ipaddr || echo 192.168.73.1)"
				command -v apply_lan_dhcp_dns >/dev/null 2>&1 && apply_lan_dhcp_dns "$lan_ip"
			fi
			uci commit dhcp
			/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
		fi
	fi

	sysctl_dir="/etc/sysctl.d"
	[ -n "${ARK_ROOT}" ] && sysctl_dir="${ARK_ROOT}/etc/sysctl.d"
	mkdir -p "$sysctl_dir"
	if [ "$conntrack_recycle" = 1 ]; then
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=3600 2>/dev/null || true
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_close_wait=30 2>/dev/null || true
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_fin_wait=30 2>/dev/null || true
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=30 2>/dev/null || true
		printf 'net.netfilter.nf_conntrack_tcp_timeout_established=3600\nnet.netfilter.nf_conntrack_tcp_timeout_close_wait=30\nnet.netfilter.nf_conntrack_tcp_timeout_fin_wait=30\nnet.netfilter.nf_conntrack_tcp_timeout_time_wait=30\n' > "${sysctl_dir}/99-ark-conntrack.conf"
	else
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=432000 2>/dev/null || true
		rm -f "${sysctl_dir}/99-ark-conntrack.conf" 2>/dev/null || true
	fi

	if [ "$ram_autopurge" = 1 ]; then
		sysctl -w vm.vfs_cache_pressure=150 2>/dev/null || true
		sysctl -w vm.dirty_ratio=10 2>/dev/null || true
		sysctl -w vm.dirty_background_ratio=5 2>/dev/null || true
		sysctl -w vm.swappiness=30 2>/dev/null || true
		sysctl -w net.core.rmem_max=1048576 2>/dev/null || true
		cat <<-EOF > "${sysctl_dir}/99-ark-memory.conf"
			vm.vfs_cache_pressure=150
			vm.dirty_ratio=10
			vm.dirty_background_ratio=5
			vm.swappiness=30
			net.core.rmem_max=1048576
		EOF
	else
		sysctl -w vm.vfs_cache_pressure=100 2>/dev/null || true
		sysctl -w vm.dirty_ratio=20 2>/dev/null || true
		sysctl -w vm.dirty_background_ratio=10 2>/dev/null || true
		sysctl -w vm.swappiness=60 2>/dev/null || true
		sysctl -w net.core.rmem_max=1048576 2>/dev/null || true
		rm -f "${sysctl_dir}/99-ark-memory.conf" 2>/dev/null || true
	fi

	# Garantir que wpad e wpa_supplicant permanecam ativos (essencial para o netifd inicializar radios Wi-Fi)
	uci -q delete wireless.globals 2>/dev/null || true
	uci commit wireless 2>/dev/null || true
	if [ -f /etc/init.d/wpad ]; then
		sed -i 's/.*wireless.globals.supplicant.*/\tif [ -x "\/usr\/sbin\/wpa_supplicant" ]; then/' /etc/init.d/wpad 2>/dev/null || true
	fi

	# Agendamento de trim de memoria (drop_caches)
	mkdir -p /etc/crontabs
	[ -f /etc/crontabs/root ] || touch /etc/crontabs/root
	sed -i '/drop_caches/d' /etc/crontabs/root 2>/dev/null || true
	case "$ram_trim_interval" in
		1h) echo "0 * * * * sync && echo 3 > /proc/sys/vm/drop_caches" >> /etc/crontabs/root ;;
		2h) echo "0 */2 * * * sync && echo 3 > /proc/sys/vm/drop_caches" >> /etc/crontabs/root ;;
		6h) echo "0 */6 * * * sync && echo 3 > /proc/sys/vm/drop_caches" >> /etc/crontabs/root ;;
		12h) echo "0 */12 * * * sync && echo 3 > /proc/sys/vm/drop_caches" >> /etc/crontabs/root ;;
		24h) echo "30 4 * * * sync && echo 3 > /proc/sys/vm/drop_caches" >> /etc/crontabs/root ;;
	esac
	if [ -x /etc/init.d/cron ]; then
		/etc/init.d/cron enable >/dev/null 2>&1 || true
		/etc/init.d/cron restart >/dev/null 2>&1 || true
	fi

	if command -v speedify_cli >/dev/null 2>&1; then
		if [ "$speedify_encryption" = 0 ]; then
			speedify_cli encryption off >/dev/null 2>&1 || true
		else
			speedify_cli encryption on >/dev/null 2>&1 || true
		fi
	fi

	if [ "$speedify_log_cap" = 1 ]; then
		for logf in /tmp/speedify*.log /var/log/speedify*.log /usr/share/speedify/logs/*.log; do
			[ -f "$logf" ] && [ "$(stat -c%s "$logf" 2>/dev/null || echo 0)" -gt 2097152 ] && : > "$logf"
		done
	fi

	if [ -f /etc/config/nlbwmon ]; then
		if [ "$nlbwmon_lite" = 1 ]; then
			uci -q set nlbwmon.@nlbwmon[0].compress_interval=1h
			uci -q set nlbwmon.@nlbwmon[0].database_limit=2000
		else
			uci -q delete nlbwmon.@nlbwmon[0].database_limit
		fi
		uci -q set nlbwmon.@nlbwmon[0].refresh_interval='2s'
		uci commit nlbwmon
		/etc/init.d/nlbwmon restart >/dev/null 2>&1 || true
	fi

	echo ok
}



system_memory_purge() {
	sync
	echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
	rm -f /tmp/speedify*.log.1 /tmp/*.tmp /tmp/ark-router-*.log 2>/dev/null || true
	free_kb="$(awk '/MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null || awk '/MemFree:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	printf '{"ok":true,"mem_available_kb":%s}\n' "$free_kb"
}

system_storage_purge() {
	local overlay_total overlay_free
	sync
	rm -rf /var/cache/apk/* /tmp/apk* /tmp/opkg-lists/* /tmp/luci-modulecache/* 2>/dev/null || true
	zerotier_ram_compress >/dev/null 2>&1 || true
	if [ -d /etc/ark-router/speedify/runtime ]; then
		rm -f /etc/ark-router/speedify/runtime/*.lastGood* 2>/dev/null || true
	fi
	overlay_total="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $2}')"
	case "$overlay_total" in ''|*[!0-9]*) overlay_total=65536 ;; esac
	if [ "$overlay_total" -le 16384 ]; then
		rm -f /www/luci-static/argon/img/bg1.jpg 2>/dev/null || true
	fi
	rm -f /tmp/*.tmp /tmp/*.log.1 2>/dev/null || true
	sync
	overlay_free="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"
	case "$overlay_free" in ''|*[!0-9]*) overlay_free=0 ;; esac
	printf '{"ok":true,"overlay_free_kb":%s,"overlay_total_kb":%s}\n' "$overlay_free" "$overlay_total"
}



cleanup_orphan_leds() {
	changed=0
	# Remove known duplicate where both led_wan and led_status point to rgb:status
	if [ -n "$(uci -q get system.led_status)" ] && [ -n "$(uci -q get system.led_wan)" ]; then
		if [ "$(uci -q get system.led_status.sysfs)" = "$(uci -q get system.led_wan.sysfs)" ]; then
			uci -q delete system.led_wan
			changed=1
		fi
	fi
	seen_sysfs=" "
	for sec in $(uci -q show system 2>/dev/null | grep '=led$' | cut -d. -f2 | cut -d= -f1); do
		sysfs="$(uci -q get "system.$sec.sysfs" || true)"
		if [ -n "$sysfs" ]; then
			if [ ! -e "/sys/class/leds/$sysfs" ]; then
				uci -q delete "system.$sec"
				changed=1
			elif echo "$seen_sysfs" | grep -q " $sysfs "; then
				uci -q delete "system.$sec"
				changed=1
			else
				seen_sysfs="$seen_sysfs$sysfs "
			fi
		fi
	done
	if [ "$changed" = 1 ]; then
		uci commit system
		/etc/init.d/led restart >/dev/null 2>&1 || true
	fi
}

get_primary_wan_dev() {
	local dev="$(uci -q get network.wan.device || true)"
	[ -z "$dev" ] && dev="$(uci -q get network.wan.ifname || true)"
	[ -z "$dev" ] && dev="$(uci -q get network.wan1.device || true)"
	[ -z "$dev" ] && dev="$(uci -q get network.wan1.ifname || true)"
	if [ -z "$dev" ]; then
		dev="$(ubus call network.interface.wan status 2>/dev/null | grep -o '"l3_device": "[^"]*"' | cut -d'"' -f4 || true)"
	fi
	if [ -z "$dev" ]; then
		dev="$(ubus call network.interface.wan status 2>/dev/null | grep -o '"device": "[^"]*"' | cut -d'"' -f4 || true)"
	fi
	if [ -z "$dev" ]; then
		dev="$(uci -q get network.wan2.device || uci -q get network.wan2.ifname || true)"
	fi
	if [ -z "$dev" ]; then
		if [ -e /sys/class/net/wan ]; then
			dev="wan"
		elif [ -e /sys/class/net/eth1 ]; then
			dev="eth1"
		elif [ -e /sys/class/net/eth0.2 ]; then
			dev="eth0.2"
		else
			dev="eth0.2"
		fi
	fi
	printf '%s' "$dev"
}

get_active_online_wan_dev() {
	# 1. Modo Ponto de Acesso (Dumb AP): a saida e o bridge local
	if [ "$(uci -q get dhcp.lan.ignore || echo 0)" = "1" ] || [ "$(uci -q get network.lan.proto || echo static)" = "dhcp" ]; then
		printf 'br-lan'
		return 0
	fi

	# 2. Rota padrao ativa no kernel (Default Gateway)
	local def_dev="$(ip route show default 2>/dev/null | awk '/default/{print $5; exit}')"
	if [ -n "$def_dev" ] && [ -e "/sys/class/net/$def_dev" ]; then
		printf '%s' "$def_dev"
		return 0
	fi

	# 3. Interfaces com status UP no netifd (ordem de prioridade: wan, wan2, wan1, ...)
	for iface in wan wan2 wan1 wan3 wan4; do
		local auto="$(uci -q get "network.$iface.auto" || echo 1)"
		[ "$auto" != "0" ] || continue
		local status="$(ubus call "network.interface.$iface" status 2>/dev/null || true)"
		if echo "$status" | grep -q '"up": true'; then
			local d="$(echo "$status" | grep -o '"l3_device": "[^"]*"' | cut -d'"' -f4)"
			[ -z "$d" ] && d="$(echo "$status" | grep -o '"device": "[^"]*"' | cut -d'"' -f4)"
			[ -z "$d" ] && d="$(uci -q get "network.$iface.device" || uci -q get "network.$iface.ifname" || echo "")"
			if [ -n "$d" ] && [ -e "/sys/class/net/$d" ]; then
				printf '%s' "$d"
				return 0
			fi
		fi
	done

	# 4. Interfaces com link fisico ativo (carrier = 1)
	for iface in wan wan2 wan1; do
		local auto="$(uci -q get "network.$iface.auto" || echo 1)"
		[ "$auto" != "0" ] || continue
		local d="$(uci -q get "network.$iface.device" || uci -q get "network.$iface.ifname" || echo "")"
		if [ -n "$d" ] && [ -e "/sys/class/net/$d" ]; then
			if [ "$(cat "/sys/class/net/$d/carrier" 2>/dev/null || echo 0)" = "1" ]; then
				printf '%s' "$d"
				return 0
			fi
		fi
	done

	# 5. Fallback para interface WAN primaria
	get_primary_wan_dev
}

get_internet_led_sysfs() {
	for cand in \
		"d-link:green:planet" \
		"blue:internet" "green:internet" "white:internet" \
		"blue:wan" "green:wan" "white:wan" \
		"planet" "internet" "wan"; do
		if [ -e "/sys/class/leds/$cand" ]; then
			printf '%s' "$cand"
			return 0
		fi
	done

	for p in /sys/class/leds/*planet* /sys/class/leds/*internet* /sys/class/leds/*wan* /sys/class/leds/*broadband* /sys/class/leds/*online* /sys/class/leds/*modem* /sys/class/leds/*dsl*; do
		[ -e "$p" ] || continue
		local b="$(basename "$p")"
		case "$b" in
			*orange*|*red*|*amber*) continue ;;
			*) printf '%s' "$b"; return 0 ;;
		esac
	done

	for p in /sys/class/leds/*/multi_intensity; do
		if [ -e "$p" ]; then
			printf '%s' "$(basename "$(dirname "$p")")"
			return 0
		fi
	done

	if [ -e /sys/class/leds/rgb:status ]; then
		printf 'rgb:status'
		return 0
	fi

	return 1
}

get_internet_alert_led_sysfs() {
	for cand in \
		"d-link:orange:planet" \
		"orange:internet" "red:internet" "amber:internet" \
		"orange:wan" "red:wan" "amber:wan"; do
		if [ -e "/sys/class/leds/$cand" ]; then
			printf '%s' "$cand"
			return 0
		fi
	done
	return 1
}

update_wan_led() {
	local active_dev="$(get_active_online_wan_dev)"
	local inet_led="$(get_internet_led_sysfs || echo "")"
	local alert_led="$(get_internet_alert_led_sysfs || echo "")"

	[ -n "$inet_led" ] || return 0

	# Instala scripts hotplug caso nao existam
	if [ ! -f /etc/hotplug.d/iface/99-ark-led-wan ]; then
		mkdir -p /etc/hotplug.d/iface /etc/hotplug.d/net
		printf '#!/bin/sh\n[ "$ACTION" = "ifup" ] || [ "$ACTION" = "ifdown" ] || exit 0\n/usr/sbin/equipe-dashboard-control update-wan-led >/dev/null 2>&1 &\n' > /etc/hotplug.d/iface/99-ark-led-wan
		chmod +x /etc/hotplug.d/iface/99-ark-led-wan
		printf '#!/bin/sh\n[ "$ACTION" = "add" ] || [ "$ACTION" = "remove" ] || [ "$ACTION" = "change" ] || exit 0\n/usr/sbin/equipe-dashboard-control update-wan-led >/dev/null 2>&1 &\n' > /etc/hotplug.d/net/99-ark-led-wan
		chmod +x /etc/hotplug.d/net/99-ark-led-wan
	fi

	local has_link=0
	local carrier="$(cat "/sys/class/net/$active_dev/carrier" 2>/dev/null || echo 0)"
	if [ "$carrier" = "1" ]; then
		has_link=1
	else
		for w in wan wan2 wan1; do
			local d="$(uci -q get "network.$w.device" || uci -q get "network.$w.ifname" || echo "")"
			if [ -n "$d" ] && [ -e "/sys/class/net/$d" ]; then
				if [ "$(cat "/sys/class/net/$d/carrier" 2>/dev/null || echo 0)" = "1" ]; then
					active_dev="$d"
					has_link=1
					break
				fi
			fi
		done
	fi

	if [ "$inet_led" = "rgb:status" ] || [ -e "/sys/class/leds/$inet_led/multi_intensity" ]; then
		if [ -f /etc/config/ark_led_alert_mode ] && [ "$has_link" = "0" ]; then
			echo 0 255 0 > "/sys/class/leds/$inet_led/multi_intensity" 2>/dev/null || true
			echo timer > "/sys/class/leds/$inet_led/trigger" 2>/dev/null || true
			echo 500 > "/sys/class/leds/$inet_led/delay_on" 2>/dev/null || true
			echo 500 > "/sys/class/leds/$inet_led/delay_off" 2>/dev/null || true
			echo 255 > "/sys/class/leds/$inet_led/brightness" 2>/dev/null || true
		elif [ "$has_link" = "1" ]; then
			local r_val="$(uci -q get system.led_status.color_red || echo 255)"
			local g_val="$(uci -q get system.led_status.color_green || echo 0)"
			local b_val="$(uci -q get system.led_status.color_blue || echo 0)"
			echo "$r_val $g_val $b_val" > "/sys/class/leds/$inet_led/multi_intensity" 2>/dev/null || true
			echo netdev > "/sys/class/leds/$inet_led/trigger" 2>/dev/null || true
			echo "$active_dev" > "/sys/class/leds/$inet_led/device_name" 2>/dev/null || true
			echo 1 > "/sys/class/leds/$inet_led/link" 2>/dev/null || true
			echo 0 > "/sys/class/leds/$inet_led/rx" 2>/dev/null || true
			echo 0 > "/sys/class/leds/$inet_led/tx" 2>/dev/null || true
			echo 255 > "/sys/class/leds/$inet_led/brightness" 2>/dev/null || true
		else
			echo none > "/sys/class/leds/$inet_led/trigger" 2>/dev/null || true
			echo 0 > "/sys/class/leds/$inet_led/brightness" 2>/dev/null || true
		fi
		return 0
	fi

	# Hardware Monocromatico (Cudy WR3000, D-Link DGL-5500, etc.)
	if [ "$has_link" = "1" ]; then
		# Conectado: LED do Planeta LIGADO FIXO (solido, sem piscar em pacotes)
		echo netdev > "/sys/class/leds/$inet_led/trigger" 2>/dev/null || true
		echo "$active_dev" > "/sys/class/leds/$inet_led/device_name" 2>/dev/null || true
		echo 1 > "/sys/class/leds/$inet_led/link" 2>/dev/null || true
		echo 0 > "/sys/class/leds/$inet_led/rx" 2>/dev/null || true
		echo 0 > "/sys/class/leds/$inet_led/tx" 2>/dev/null || true
		[ -e "/sys/class/leds/$inet_led/mode" ] && echo link > "/sys/class/leds/$inet_led/mode" 2>/dev/null || true
		echo 255 > "/sys/class/leds/$inet_led/brightness" 2>/dev/null || echo 1 > "/sys/class/leds/$inet_led/brightness" 2>/dev/null || true

		# Se houver LED fisico secundario de porta WAN (ex: Cudy WR3000 possui blue:internet e blue:wan), sincroniza tambem
		for sec_wan in /sys/class/leds/*:wan /sys/class/leds/wan; do
			[ -d "$sec_wan" ] || continue
			local sec_b="$(basename "$sec_wan")"
			[ "$sec_b" != "$inet_led" ] || continue
			echo netdev > "$sec_wan/trigger" 2>/dev/null || true
			echo "$active_dev" > "$sec_wan/device_name" 2>/dev/null || true
			echo 1 > "$sec_wan/link" 2>/dev/null || true
			echo 0 > "$sec_wan/rx" 2>/dev/null || true
			echo 0 > "$sec_wan/tx" 2>/dev/null || true
			[ -e "$sec_wan/mode" ] && echo link > "$sec_wan/mode" 2>/dev/null || true
			echo 1 > "$sec_wan/brightness" 2>/dev/null || echo 255 > "$sec_wan/brightness" 2>/dev/null || true
		done

		if [ -n "$alert_led" ] && [ -e "/sys/class/leds/$alert_led" ]; then
			echo none > "/sys/class/leds/$alert_led/trigger" 2>/dev/null || true
			echo 0 > "/sys/class/leds/$alert_led/brightness" 2>/dev/null || true
		fi
	else
		# Desconectado / sem cabo:
		if [ -n "$alert_led" ] && [ -e "/sys/class/leds/$alert_led" ]; then
			echo none > "/sys/class/leds/$inet_led/trigger" 2>/dev/null || true
			echo 0 > "/sys/class/leds/$inet_led/brightness" 2>/dev/null || true
			echo timer > "/sys/class/leds/$alert_led/trigger" 2>/dev/null || true
			echo 500 > "/sys/class/leds/$alert_led/delay_on" 2>/dev/null || true
			echo 500 > "/sys/class/leds/$alert_led/delay_off" 2>/dev/null || true
			echo 255 > "/sys/class/leds/$alert_led/brightness" 2>/dev/null || echo 1 > "/sys/class/leds/$alert_led/brightness" 2>/dev/null || true
		else
			echo none > "/sys/class/leds/$inet_led/trigger" 2>/dev/null || true
			echo 0 > "/sys/class/leds/$inet_led/brightness" 2>/dev/null || true
		fi

		for sec_wan in /sys/class/leds/*:wan /sys/class/leds/wan; do
			[ -d "$sec_wan" ] || continue
			local sec_b="$(basename "$sec_wan")"
			[ "$sec_b" != "$inet_led" ] || continue
			echo none > "$sec_wan/trigger" 2>/dev/null || true
			echo 0 > "$sec_wan/brightness" 2>/dev/null || true
		done
	fi

	local uci_dev="$(uci -q get system.led_internet.dev || echo "")"
	if [ "$uci_dev" != "$active_dev" ]; then
		uci -q set "system.led_internet.dev=$active_dev"
		uci commit system 2>/dev/null || true
	fi
}

get_led_hardware_info() {
	cleanup_orphan_leds
	model="$(cat /tmp/sysinfo/model 2>/dev/null || cat /proc/cpuinfo 2>/dev/null | awk -F': ' '/model name|machine|Hardware/{print $2; exit}' || echo 'ARK Router')"
	board="$(cat /tmp/sysinfo/board_name 2>/dev/null || echo 'generic')"
	wan_dev="$(get_active_online_wan_dev)"

	has_rgb=false
	rgb_multi_node=""
	rgb_trio_r=""
	rgb_trio_g=""
	rgb_trio_b=""

	# 1. Checagem de nó RGB Multicolor nativo (multi_intensity)
	for p in /sys/class/leds/*/multi_intensity; do
		if [ -e "$p" ]; then
			has_rgb=true
			rgb_multi_node="$(basename "$(dirname "$p")")"
			break
		fi
	done

	# 2. Checagem de Trio RGB Discreto
	if [ "$has_rgb" = false ]; then
		for r_led in /sys/class/leds/*red* /sys/class/leds/*:r:* /sys/class/leds/*_r; do
			[ -d "$r_led" ] || continue
			r_base="$(basename "$r_led")"
			g_base="$(printf '%s' "$r_base" | sed 's/red/green/; s/:r:/:g:/; s/_r$/_g/')"
			b_base="$(printf '%s' "$r_base" | sed 's/red/blue/; s/:r:/:b:/; s/_r$/_b/')"
			if [ -d "/sys/class/leds/$g_base" ] && [ -d "/sys/class/leds/$b_base" ]; then
				has_rgb=true
				rgb_trio_r="$r_base"
				rgb_trio_g="$g_base"
				rgb_trio_b="$b_base"
				break
			fi
		done
	fi

	cur_rgb_hex="$(uci -q get system.led_status.hex_color || echo '#00FF00')"

	first_led=1
	printf '{"model":"%s","board":"%s","wan_dev":"%s","has_rgb":%s,"rgb_multi_node":"%s","rgb_trio_r":"%s","current_rgb_hex":"%s","leds":[' \
		"$(json_escape "$model")" "$(json_escape "$board")" "$(json_escape "$wan_dev")" "$has_rgb" "$(json_escape "$rgb_multi_node")" "$(json_escape "$rgb_trio_r")" "$(json_escape "$cur_rgb_hex")"

	for led in $(ls /sys/class/leds/ 2>/dev/null); do
		[ -d "/sys/class/leds/$led" ] || continue

		if [ -n "$rgb_trio_g" ] && { [ "$led" = "$rgb_trio_g" ] || [ "$led" = "$rgb_trio_b" ]; }; then
			continue
		fi

		cur_trigger="$(cat "/sys/class/leds/$led/trigger" 2>/dev/null | grep -o '\[.*\]' | tr -d '[]' || echo 'none')"
		cur_brightness="$(cat "/sys/class/leds/$led/brightness" 2>/dev/null || echo '0')"

		name="$led"
		sub="LED Físico"
		type="generic"
		color="green"

		case "$led" in
			"d-link:orange:planet"|"d-link:orange:power"|*orange:wan*|*red:wan*|*amber:wan*|*orange:internet*|*red:internet*)
				# Bicolor/Alerta secundário: consolidado no card representativo para evitar duplicatas
				continue
				;;
			"$rgb_multi_node"|"$rgb_trio_r"|"rgb:status"|*rgb:status*)
				name="Status / Conexão (RGB)"
				sub="Painel Frontal Multi-Estado (Status, WAN e Cores)"
				type="status_rgb"
				color="rgb"
				;;
			*sfp*|*fiber*|*optical*|*pon*|*los*)
				name="Fibra Óptica (SFP/PON)"
				sub="Link óptico de alta velocidade"
				type="fiber"
				color="blue"
				;;
			*usb1*)
				name="Porta USB 1"
				sub="Armazenamento ou modem externo"
				type="usb"
				color="green"
				;;
			*usb2*)
				name="Porta USB 2"
				sub="Armazenamento ou modem externo"
				type="usb"
				color="green"
				;;
			*usb*)
				name="Porta USB"
				sub="Armazenamento ou modem externo"
				type="usb"
				color="green"
				;;
			*wps*)
				name="WPS (Pareamento)"
				sub="Conexão Wi-Fi protegida"
				type="wps"
				color="blue"
				;;
			*mobile*|*4g*|*5g_modem*|*lte*|*sim*)
				name="Modem Móvel (4G/5G)"
				sub="Conectividade celular"
				type="mobile"
				color="green"
				;;
			*mesh*)
				name="Rede Mesh"
				sub="Sincronização entre nós sem fio"
				type="mesh"
				color="blue"
				;;
			*wifi6*|*wlan6*|*6g*)
				name="Wi-Fi 6 GHz (Ultra Rápido)"
				sub="Faixa limpa de 6 GHz (Wi-Fi 6E/7)"
				type="wifi6g"
				color="blue"
				;;
			"mt76-phy0"|*mt76*phy0*)
				name="Wi-Fi 5 GHz (Ultra Rápido)"
				sub="MediaTek Filogic (802.11ax / Wi-Fi 6)"
				type="wifi5g"
				color="blue"
				;;
			"mt76-phy1"|*mt76*phy1*)
				name="Wi-Fi 2.4 GHz (Longo Alcance)"
				sub="MediaTek Filogic (802.11ax / Wi-Fi 6)"
				type="wifi2g"
				color="green"
				;;
			"ath10k-phy0"|*ath10k*|*ath11k-phy0*|*ath12k-phy0*)
				name="Wi-Fi 5 GHz (Ultra Rápido)"
				sub="Qualcomm Atheros (Até 1300+ Mbps)"
				type="wifi5g"
				color="blue"
				;;
			"ath9k-phy1"|*ath9k*|*ath11k-phy1*|*ath12k-phy1*)
				name="Wi-Fi 2.4 GHz (Longo Alcance)"
				sub="Qualcomm Atheros (Até 450 Mbps)"
				type="wifi2g"
				color="green"
				;;
			*rtw88*phy0*|*rtw89*phy0*)
				name="Wi-Fi 5 GHz (Ultra Rápido)"
				sub="Realtek (802.11ac/ax)"
				type="wifi5g"
				color="blue"
				;;
			*rtw88*phy1*|*rtw89*phy1*)
				name="Wi-Fi 2.4 GHz (Longo Alcance)"
				sub="Realtek (802.11n/ax)"
				type="wifi2g"
				color="green"
				;;
			"d-link:green:power")
				name="Power (Alimentação)"
				pwr_org_bri="$(cat /sys/class/leds/d-link:orange:power/brightness 2>/dev/null || echo 0)"
				if [ "$cur_brightness" -gt 0 ] 2>/dev/null; then
					sub="LED Bicolor (Verde: Operação Normal)"
					color="green"
				elif [ "$pwr_org_bri" -gt 0 ] 2>/dev/null; then
					sub="LED Bicolor (Laranja: Alerta / Boot)"
					color="orange"
					cur_brightness="$pwr_org_bri"
				else
					sub="LED Bicolor Verde / Laranja"
					color="green"
				fi
				type="power"
				;;
			"d-link:green:planet")
				name="Internet (Planet)"
				planet_org_bri="$(cat /sys/class/leds/d-link:orange:planet/brightness 2>/dev/null || echo 0)"
				if [ "$cur_brightness" -gt 0 ] 2>/dev/null; then
					sub="Conectividade WAN ($wan_dev) — Online"
					color="green"
				elif [ "$planet_org_bri" -gt 0 ] 2>/dev/null; then
					sub="Conectividade WAN ($wan_dev) — Sem Conexão / Alerta"
					color="orange"
					cur_brightness="$planet_org_bri"
				else
					sub="Conectividade WAN ($wan_dev)"
					color="green"
				fi
				type="internet"
				;;
			*blue:internet*|*blue*planet*)
				name="Internet (Planeta)"
				if [ "$cur_brightness" -gt 0 ] 2>/dev/null; then sub="Conectividade WAN ($wan_dev) — Online"; else sub="Conectividade WAN ($wan_dev) — Sem Conexão"; fi
				type="internet"
				color="blue"
				;;
			*green:wan*|*green:internet*|*green*planet*|*internet*|*planet*|*web*)
				name="Internet (Planeta / WAN)"
				if [ "$cur_brightness" -gt 0 ] 2>/dev/null; then sub="Conectividade WAN ($wan_dev) — Online"; else sub="Conectividade WAN ($wan_dev) — Sem Conexão"; fi
				type="internet"
				color="green"
				;;
			*white:internet*|*white*planet*|*white:wan*)
				name="Internet (Planeta / WAN)"
				if [ "$cur_brightness" -gt 0 ] 2>/dev/null; then sub="Conectividade WAN ($wan_dev) — Online"; else sub="Conectividade WAN ($wan_dev) — Sem Conexão"; fi
				type="internet"
				color="white"
				;;
			*blue:wan*)
				name="Porta WAN"
				if [ "$cur_brightness" -gt 0 ] 2>/dev/null; then sub="Link Ativo ($wan_dev)"; else sub="Sem Link"; fi
				type="internet"
				color="blue"
				;;
			*wan*)
				name="Porta WAN"
				if [ "$cur_brightness" -gt 0 ] 2>/dev/null; then sub="Link Ativo ($wan_dev)"; else sub="Sem Link"; fi
				type="internet"
				case "$led" in *blue*) color="blue";; *) color="green";; esac
				;;
			*wifi2*|*wlan2*|*2g*|*2ghz*)
				name="Wi-Fi 2.4 GHz"
				sub="LED do Painel Frontal (2.4 GHz)"
				type="wifi2g"
				case "$led" in *blue*) color="blue";; *) color="green";; esac
				;;
			*wifi5*|*wlan5*|*5g*|*5ghz*)
				name="Wi-Fi 5 GHz"
				sub="LED do Painel Frontal (5 GHz)"
				type="wifi5g"
				case "$led" in *blue*) color="blue";; *) color="green";; esac
				;;
			*lan[1-8]*)
				port_num="$(printf '%s' "$led" | grep -o '[1-8]')"
				name="Porta LAN $port_num"
				sub="Atividade da porta local $port_num"
				type="lan"
				case "$led" in *blue*) color="blue";; *) color="green";; esac
				;;
			*lan*|*ethernet*)
				name="Rede Local (LAN)"
				sub="Atividade de portas locais"
				type="lan"
				case "$led" in *blue*) color="blue";; *) color="green";; esac
				;;
			*status*)
				name="Status / Conexão"
				sub="Alimentação e status do sistema"
				type="power"
				case "$led" in *blue*) color="blue";; *) color="green";; esac
				;;
			*power*|*pwr*|*system*)
				name="Power / Sistema"
				sub="Alimentação e status do sistema"
				type="power"
				case "$led" in *blue*) color="blue";; *) color="green";; esac
				;;
		esac

		[ "$first_led" = 1 ] && first_led=0 || printf ','
		printf '{"sysfs":"%s","name":"%s","sub":"%s","type":"%s","color":"%s","trigger":"%s","brightness":%s,"hex_color":"%s"}' \
			"$(json_escape "$led")" "$(json_escape "$name")" "$(json_escape "$sub")" \
			"$(json_escape "$type")" "$(json_escape "$color")" "$(json_escape "$cur_trigger")" "$cur_brightness" \
			"$(json_escape "$cur_rgb_hex")"
	done
	printf ']}\n'
}

update_led_alert() {
	[ -f /etc/config/ark_led_alert_mode ] || return 0
	update_wan_led
}

set_led_rgb_color() {
	raw_color="${1:-#00FF00}"
	rm -f /etc/config/ark_led_alert_mode /etc/hotplug.d/iface/99-ark-led-alert /etc/hotplug.d/net/99-ark-led-alert
	wan_dev="$(get_active_online_wan_dev)"

	clean_color="$(printf '%s' "$raw_color" | tr 'A-Z' 'a-z' | tr -d '#, ')"
	r_val=0; g_val=255; b_val=0
	hex_display="#00FF00"

	case "$clean_color" in
		green|verde)
			r_val=0; g_val=255; b_val=0; hex_display="#00FF00" ;;
		red|vermelho)
			r_val=255; g_val=0; b_val=0; hex_display="#FF0000" ;;
		blue|azul)
			r_val=0; g_val=0; b_val=255; hex_display="#0000FF" ;;
		cyan|ciano)
			r_val=0; g_val=229; b_val=255; hex_display="#00E5FF" ;;
		purple|roxo|magenta)
			r_val=139; g_val=92; b_val=246; hex_display="#8B5CF6" ;;
		yellow|amarelo|amber|ambar)
			r_val=245; g_val=158; b_val=11; hex_display="#F59E0B" ;;
		white|branco)
			r_val=255; g_val=255; b_val=255; hex_display="#FFFFFF" ;;
		orange|laranja)
			r_val=255; g_val=128; b_val=0; hex_display="#FF8000" ;;
		pink|rosa)
			r_val=236; g_val=72; b_val=153; hex_display="#EC4899" ;;
		[0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f][0-9a-f])
			hex_display="#$(printf '%s' "$clean_color" | tr 'a-z' 'A-Z')"
			r_hex="$(printf '%s' "$clean_color" | cut -c1-2)"
			g_hex="$(printf '%s' "$clean_color" | cut -c3-4)"
			b_hex="$(printf '%s' "$clean_color" | cut -c5-6)"
			r_val="$(printf '%d' "0x$r_hex" 2>/dev/null || echo 0)"
			g_val="$(printf '%d' "0x$g_hex" 2>/dev/null || echo 0)"
			b_val="$(printf '%d' "0x$b_hex" 2>/dev/null || echo 0)"
			;;
		*)
			if [ -n "$2" ] && [ -n "$3" ]; then
				r_val="$(printf '%d' "$1" 2>/dev/null || echo 0)"
				g_val="$(printf '%d' "$2" 2>/dev/null || echo 0)"
				b_val="$(printf '%d' "$3" 2>/dev/null || echo 0)"
				hex_display="$(printf '#%02X%02X%02X' "$r_val" "$g_val" "$b_val")"
			fi
			;;
	esac

	[ "$r_val" -gt 255 ] && r_val=255; [ "$r_val" -lt 0 ] && r_val=0
	[ "$g_val" -gt 255 ] && g_val=255; [ "$g_val" -lt 0 ] && g_val=0
	[ "$b_val" -gt 255 ] && b_val=255; [ "$b_val" -lt 0 ] && b_val=0

	# WS2812B GRB no SPI: Byte 0 = Verde (G), Byte 1 = Vermelho (R), Byte 2 = Azul (B)
	hw_byte0="$g_val"
	hw_byte1="$r_val"
	hw_byte2="$b_val"

	local rgb_multi_node=""
	local rgb_trio_r=""
	local rgb_trio_g=""
	local rgb_trio_b=""
	for p in /sys/class/leds/*/multi_intensity; do
		if [ -e "$p" ]; then
			rgb_multi_node="$(basename "$(dirname "$p")")"
			break
		fi
	done
	[ -n "$rgb_multi_node" ] || [ ! -e /sys/class/leds/rgb:status ] || rgb_multi_node="rgb:status"

	if [ -z "$rgb_multi_node" ]; then
		for r_led in /sys/class/leds/*red* /sys/class/leds/*:r:* /sys/class/leds/*_r; do
			[ -d "$r_led" ] || continue
			local r_b="$(basename "$r_led")"
			local g_b="$(printf '%s' "$r_b" | sed 's/red/green/; s/:r:/:g:/; s/_r$/_g/')"
			local b_b="$(printf '%s' "$r_b" | sed 's/red/blue/; s/:r:/:b:/; s/_r$/_b/')"
			if [ -d "/sys/class/leds/$g_b" ] && [ -d "/sys/class/leds/$b_b" ]; then
				rgb_trio_r="$r_b"
				rgb_trio_g="$g_b"
				rgb_trio_b="$b_b"
				break
			fi
		done
	fi

	if [ -n "$rgb_multi_node" ]; then
		[ -n "$(uci -q get system.led_status)" ] || uci -q set system.led_status=led
		uci -q set "system.led_status.name=Status / Conexão (RGB)"
		uci -q set "system.led_status.sysfs=$rgb_multi_node"
		uci -q set "system.led_status.trigger=netdev"
		uci -q set "system.led_status.dev=$wan_dev"
		uci -q set "system.led_status.mode=link"
		uci -q set "system.led_status.color_red=$hw_byte0"
		uci -q set "system.led_status.color_green=$hw_byte1"
		uci -q set "system.led_status.color_blue=$hw_byte2"
		uci -q set "system.led_status.hex_color=$hex_display"
		uci -q set "system.led_status.default=1"
		uci commit system
		/etc/init.d/led restart >/dev/null 2>&1 || true

		echo "$hw_byte0 $hw_byte1 $hw_byte2" > "/sys/class/leds/$rgb_multi_node/multi_intensity" 2>/dev/null || true
		echo 1 > "/sys/class/leds/$rgb_multi_node/link" 2>/dev/null || true
		echo 0 > "/sys/class/leds/$rgb_multi_node/rx" 2>/dev/null || true
		echo 0 > "/sys/class/leds/$rgb_multi_node/tx" 2>/dev/null || true
		echo 255 > "/sys/class/leds/$rgb_multi_node/brightness" 2>/dev/null || true
	elif [ -n "$rgb_trio_r" ]; then
		[ -n "$(uci -q get system.led_status)" ] || uci -q set system.led_status=led
		uci -q set "system.led_status.name=Status / Conexão (RGB)"
		uci -q set "system.led_status.sysfs=$rgb_trio_r"
		uci -q set "system.led_status.hex_color=$hex_display"
		uci commit system
		echo "$r_val" > "/sys/class/leds/$rgb_trio_r/brightness" 2>/dev/null || true
		echo "$g_val" > "/sys/class/leds/$rgb_trio_g/brightness" 2>/dev/null || true
		echo "$b_val" > "/sys/class/leds/$rgb_trio_b/brightness" 2>/dev/null || true
	fi

	printf '{"success":true,"hex":"%s","r":%d,"g":%d,"b":%d,"hw_intensity":"%s %s %s"}\n' \
		"$hex_display" "$r_val" "$g_val" "$b_val" "$hw_byte0" "$hw_byte1" "$hw_byte2"
}

set_led_preset() {
	preset="${1:-smart}"
	cleanup_orphan_leds

	wan_dev="$(get_active_online_wan_dev)"
	inet_led="$(get_internet_led_sysfs || echo "")"
	alert_led="$(get_internet_alert_led_sysfs || echo "")"

	case "$preset" in
		night)
			rm -f /etc/config/ark_led_alert_mode /etc/hotplug.d/iface/99-ark-led-alert /etc/hotplug.d/net/99-ark-led-alert
			for sec in $(uci -q show system 2>/dev/null | grep '=led$' | cut -d. -f2 | cut -d= -f1); do
				uci -q set "system.$sec.trigger=none"
				uci -q set "system.$sec.default=0"
			done
			uci commit system
			/etc/init.d/led restart >/dev/null 2>&1 || true
			for led in $(ls /sys/class/leds/ 2>/dev/null); do
				echo none > "/sys/class/leds/$led/trigger" 2>/dev/null || true
				echo 0 > "/sys/class/leds/$led/brightness" 2>/dev/null || true
			done
			;;
		alert)
			mkdir -p /etc/config /etc/hotplug.d/iface /etc/hotplug.d/net
			touch /etc/config/ark_led_alert_mode
			cat << 'EOF' > /etc/hotplug.d/iface/99-ark-led-alert
#!/bin/sh
[ -f /etc/config/ark_led_alert_mode ] || exit 0
/usr/sbin/equipe-dashboard-control update-wan-led >/dev/null 2>&1 &
EOF
			chmod +x /etc/hotplug.d/iface/99-ark-led-alert

			cat << 'EOF' > /etc/hotplug.d/net/99-ark-led-alert
#!/bin/sh
[ -f /etc/config/ark_led_alert_mode ] || exit 0
/usr/sbin/equipe-dashboard-control update-wan-led >/dev/null 2>&1 &
EOF
			chmod +x /etc/hotplug.d/net/99-ark-led-alert

			# LEDs Wi-Fi ficam discretos/apagados no modo alerta em todos os fabricantes
			for wf_led in $(ls /sys/class/leds/ 2>/dev/null); do
				case "$wf_led" in
					*wifi*|*wlan*|*phy*|*2g*|*5g*|*6g*)
						echo 0 > "/sys/class/leds/$wf_led/brightness" 2>/dev/null || true
						;;
				esac
			done
			uci commit system 2>/dev/null || true
			update_wan_led
			;;
		default|smart|*)
			rm -f /etc/config/ark_led_alert_mode /etc/hotplug.d/iface/99-ark-led-alert /etc/hotplug.d/net/99-ark-led-alert
			
			if [ "$preset" = "default" ]; then
				for sec in $(uci -q show system 2>/dev/null | grep '=led$' | cut -d. -f2 | cut -d= -f1); do
					uci -q delete "system.$sec"
				done
			fi

			local rgb_multi_cand=""
			for p in /sys/class/leds/*/multi_intensity; do
				if [ -e "$p" ]; then
					rgb_multi_cand="$(basename "$(dirname "$p")")"
					break
				fi
			done
			[ -n "$rgb_multi_cand" ] || [ ! -e /sys/class/leds/rgb:status ] || rgb_multi_cand="rgb:status"
			if [ -n "$rgb_multi_cand" ]; then
				[ -n "$(uci -q get system.led_status)" ] || uci -q set system.led_status=led
				uci -q set "system.led_status.name=Status / Conexão (RGB)"
				uci -q set "system.led_status.sysfs=$rgb_multi_cand"
				uci -q set "system.led_status.trigger=netdev"
				uci -q set "system.led_status.dev=$wan_dev"
				uci -q set "system.led_status.mode=link"
				# WS2812B GRB: Verde puro e 255 no byte 0 (color_red)
				uci -q set "system.led_status.color_red=255"
				uci -q set "system.led_status.color_green=0"
				uci -q set "system.led_status.color_blue=0"
				uci -q set "system.led_status.hex_color=#00FF00"
				uci -q set "system.led_status.default=1"
			fi

			local w5_led=""
			for cand in mt76-phy0 ath10k-phy0 ath11k-phy0 ath12k-phy0 blue:wifi5 green:wifi5 white:wifi5 wifi5 wlan5g wlan-5g 5g wlan5 wifi-5g; do
				if [ -e "/sys/class/leds/$cand" ]; then w5_led="$cand"; break; fi
			done
			if [ -z "$w5_led" ]; then
				for p in /sys/class/leds/*wifi5* /sys/class/leds/*wlan5* /sys/class/leds/*5g* /sys/class/leds/*5ghz*; do
					[ -e "$p" ] || continue
					w5_led="$(basename "$p")"
					break
				done
			fi
			if [ -z "$w5_led" ]; then
				for p in /sys/class/leds/*phy0*; do
					[ -e "$p" ] || continue
					w5_led="$(basename "$p")"
					break
				done
			fi
			if [ -n "$w5_led" ]; then
				[ -n "$(uci -q get system.led_wifi5g)" ] || uci -q set system.led_wifi5g=led
				uci -q set "system.led_wifi5g.name=Wi-Fi 5 GHz (Ultra Rápido)"
				uci -q set "system.led_wifi5g.sysfs=$w5_led"
				uci -q set "system.led_wifi5g.trigger=default-on"
				uci -q set "system.led_wifi5g.default=1"
			fi

			local w2_led=""
			for cand in mt76-phy1 ath9k-phy1 ath11k-phy1 ath12k-phy1 blue:wifi2 green:wifi2 white:wifi2 wifi2 wlan2g wlan-2g 2g wlan2 wifi-2g; do
				if [ -e "/sys/class/leds/$cand" ]; then w2_led="$cand"; break; fi
			done
			if [ -z "$w2_led" ]; then
				for p in /sys/class/leds/*wifi2* /sys/class/leds/*wlan2* /sys/class/leds/*2g* /sys/class/leds/*2ghz*; do
					[ -e "$p" ] || continue
					w2_led="$(basename "$p")"
					break
				done
			fi
			if [ -z "$w2_led" ]; then
				for p in /sys/class/leds/*phy1*; do
					[ -e "$p" ] || continue
					w2_led="$(basename "$p")"
					break
				done
			fi
			if [ -z "$w2_led" ] && [ -z "$w5_led" ]; then
				for p in /sys/class/leds/*wlan* /sys/class/leds/*wifi*; do
					[ -e "$p" ] || continue
					w2_led="$(basename "$p")"
					break
				done
			fi
			if [ -n "$w2_led" ]; then
				[ -n "$(uci -q get system.led_wifi2g)" ] || uci -q set system.led_wifi2g=led
				uci -q set "system.led_wifi2g.name=Wi-Fi 2.4 GHz (Longo Alcance)"
				uci -q set "system.led_wifi2g.sysfs=$w2_led"
				uci -q set "system.led_wifi2g.trigger=default-on"
				uci -q set "system.led_wifi2g.default=1"
			fi

			local w6_led=""
			for cand in blue:wifi6 green:wifi6 white:wifi6 wifi6 wlan6g wlan-6g 6g; do
				if [ -e "/sys/class/leds/$cand" ]; then w6_led="$cand"; break; fi
			done
			if [ -z "$w6_led" ]; then
				for p in /sys/class/leds/*wifi6* /sys/class/leds/*wlan6* /sys/class/leds/*6g* /sys/class/leds/*6ghz* /sys/class/leds/*phy2*; do
					[ -e "$p" ] || continue
					w6_led="$(basename "$p")"
					break
				done
			fi
			if [ -n "$w6_led" ]; then
				[ -n "$(uci -q get system.led_wifi6g)" ] || uci -q set system.led_wifi6g=led
				uci -q set "system.led_wifi6g.name=Wi-Fi 6 GHz (Ultra Rápido)"
				uci -q set "system.led_wifi6g.sysfs=$w6_led"
				uci -q set "system.led_wifi6g.trigger=default-on"
				uci -q set "system.led_wifi6g.default=1"
			fi

			# Power / Status LED (Compatibilidade Universal: TP-Link, GL.iNet, Netgear, Cudy, D-Link, Asus, Xiaomi, RPi, etc.)
			local pwr_led=""
			for cand_pwr in \
				"d-link:green:power" "green:power" "blue:power" "white:power" \
				"green:status" "blue:status" "white:status" \
				"power" "status" "pwr" "act" "system"; do
				if [ -e "/sys/class/leds/$cand_pwr" ]; then
					pwr_led="$cand_pwr"
					break
				fi
			done
			if [ -z "$pwr_led" ]; then
				for p in /sys/class/leds/*power* /sys/class/leds/*status* /sys/class/leds/*system* /sys/class/leds/*pwr* /sys/class/leds/*act*; do
					[ -e "$p" ] || continue
					local pb="$(basename "$p")"
					case "$pb" in
						*orange*|*red*|*amber*|*fail*) continue ;;
						*) pwr_led="$pb"; break ;;
					esac
				done
			fi
			if [ -n "$pwr_led" ]; then
				[ -n "$(uci -q get system.led_power)" ] || uci -q set system.led_power=led
				uci -q set "system.led_power.name=Power / Status"
				uci -q set "system.led_power.sysfs=$pwr_led"
				uci -q set "system.led_power.trigger=default-on"
				uci -q set "system.led_power.default=1"
			fi

			# Internet / Planet LED (Cudy WR3000, D-Link DGL-5500, etc.)
			# ESTRITAMENTE mode 'link' para ligar FIXO (sem piscar freneticamente com pacotes)
			if [ -n "$inet_led" ] && [ "$inet_led" != "$rgb_multi_cand" ] && [ "$inet_led" != "rgb:status" ]; then
				[ -n "$(uci -q get system.led_internet)" ] || uci -q set system.led_internet=led
				uci -q set "system.led_internet.name=Internet (Planeta / WAN)"
				uci -q set "system.led_internet.sysfs=$inet_led"
				uci -q set "system.led_internet.trigger=netdev"
				uci -q set "system.led_internet.dev=$wan_dev"
				uci -q set "system.led_internet.mode=link"
				uci -q set "system.led_internet.default=1"
			fi
			if [ -n "$alert_led" ]; then
				uci -q delete system.led_internet_orange 2>/dev/null || true
				echo none > "/sys/class/leds/$alert_led/trigger" 2>/dev/null || true
				echo 0 > "/sys/class/leds/$alert_led/brightness" 2>/dev/null || true
			fi

			uci commit system
			/etc/init.d/led restart >/dev/null 2>&1 || true

			# Resposta visual imediata no hardware
			update_wan_led
			;;
	esac

	printf '{"success":true,"preset":"%s"}\n' "$preset"
}

get_led_status() {
	cleanup_orphan_leds
	first_s=1
	printf '{'
	for sec in $(uci -q show system 2>/dev/null | grep '=led$' | cut -d. -f2 | cut -d= -f1); do
		sysfs="$(uci -q get "system.$sec.sysfs" || true)"
		trigger="$(uci -q get "system.$sec.trigger" || true)"
		[ "$first_s" = 1 ] && first_s=0 || printf ','
		printf '"%s":{"sysfs":"%s","trigger":"%s"}' \
			"$(json_escape "$sec")" "$(json_escape "$sysfs")" "$(json_escape "$trigger")"
	done
	printf '}\n'
}

detect_hardware_silicon_profile() {
	silicon_model="$(cat /tmp/sysinfo/model 2>/dev/null || cat /proc/cpuinfo 2>/dev/null | awk -F': ' '/model name|machine|Hardware/{print $2; exit}' || echo 'ARK Router')"
	silicon_board="$(cat /tmp/sysinfo/board_name 2>/dev/null || echo 'generic')"
	silicon_target="$(grep 'DISTRIB_TARGET' /etc/openwrt_release 2>/dev/null | cut -d"'" -f2 || echo '')"
	silicon_compat="$(cat /proc/device-tree/compatible 2>/dev/null | tr '\0' ' ' || echo '')"
	silicon_cpu_arch="$(uname -m 2>/dev/null || echo 'generic')"
	silicon_cpu_cores="$(grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 1)"
	[ "$silicon_cpu_cores" -ge 1 ] 2>/dev/null || silicon_cpu_cores=1
	silicon_mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	silicon_mem_total_mb=$((silicon_mem_total_kb / 1024))

	# RAM Tier
	if [ "$silicon_mem_total_mb" -lt 128 ]; then
		silicon_ram_tier="ultra_low"
		silicon_ram_tier_desc="Ultra-Leve (< 128 MB)"
	elif [ "$silicon_mem_total_mb" -lt 256 ]; then
		silicon_ram_tier="low"
		silicon_ram_tier_desc="Econômica (128 MB - 256 MB)"
	elif [ "$silicon_mem_total_mb" -lt 512 ]; then
		silicon_ram_tier="standard"
		silicon_ram_tier_desc="Padrão (256 MB - 512 MB)"
	elif [ "$silicon_mem_total_mb" -lt 1024 ]; then
		silicon_ram_tier="high"
		silicon_ram_tier_desc="Alto Desempenho (512 MB - 1 GB)"
	else
		silicon_ram_tier="extreme"
		silicon_ram_tier_desc="Extrema (1 GB+)"
	fi

	# Multicore
	if [ "$silicon_cpu_cores" -ge 2 ]; then
		silicon_multicore=1
	else
		silicon_multicore=0
	fi

	# Silicon Family
	haystack="$(printf '%s %s %s %s %s' "$silicon_board" "$silicon_model" "$silicon_target" "$silicon_compat" "$silicon_cpu_arch" | tr 'A-Z' 'a-z')"
	silicon_hw_offload_capable=0
	silicon_wed_capable=0

	case "$haystack" in
		*mt7988*|*filogic-880*)
			silicon_class="mediatek_filogic"
			silicon_name="MediaTek Filogic 880 (MT7988 Quad-Core 1.8 GHz)"
			silicon_hw_offload_capable=1
			silicon_tuning_profile="Filogic 880 (PPE v3 + WED 10GbE)"
			;;
		*mt7986*|*filogic-830*|*predator-w6x*)
			silicon_class="mediatek_filogic"
			silicon_name="MediaTek Filogic 830 (MT7986 Quad-Core 2.0 GHz)"
			silicon_hw_offload_capable=1
			silicon_tuning_profile="Filogic 830 (PPE v2 + WED 2.5GbE)"
			;;
		*mt7981*|*filogic-820*|*wr3000*)
			silicon_class="mediatek_filogic"
			silicon_name="MediaTek Filogic 820 (MT7981 Dual-Core 1.3 GHz)"
			silicon_hw_offload_capable=1
			silicon_tuning_profile="Filogic 820 (PPE v2 + WED Gigabit)"
			;;
		*mt7622*)
			silicon_class="mediatek_filogic"
			silicon_name="MediaTek MT7622 (Dual-Core 1.35 GHz)"
			silicon_hw_offload_capable=1
			silicon_tuning_profile="MediaTek MT7622 (PPE + WED)"
			;;
		*mt7621*)
			silicon_class="mediatek_mips"
			silicon_name="MediaTek MT7621A (Dual-Core 4T 880 MHz)"
			silicon_hw_offload_capable=1
			silicon_tuning_profile="MT7621A (PPE v1 HW NAT + Multicore)"
			;;
		*ipq807*|*ipq60*|*ipq50*|*ipq9574*|*ipq9554*)
			silicon_class="qualcomm_ipq"
			silicon_name="Qualcomm IPQ (ARMv8 Multicore High-Speed)"
			silicon_tuning_profile="Qualcomm IPQ (SFE / Flowtable Multicore)"
			;;
		*ipq4018*|*ipq4019*|*ipq40xx*)
			silicon_class="qualcomm_ipq"
			silicon_name="Qualcomm IPQ4019 / Dakota (Quad-Core 717 MHz)"
			silicon_tuning_profile="Qualcomm IPQ40xx (Quad-Core SFE / RPS)"
			;;
		*x86_64*|*i386*|*i686*|*x86/*|*virtualbox*|*qemu*|*kvm*|*vmware*)
			silicon_class="x86_pc"
			silicon_name="x86_64 / PC / Servidor / Máquina Virtual"
			silicon_tuning_profile="x86_64 (Multiqueue NICs + BBR + Buffer Extremo)"
			;;
		*rk3588*|*rk3568*|*rk3566*|*rk3399*|*rk3328*|*nanopi*)
			silicon_class="rockchip_arm"
			silicon_name="Rockchip ARM (NanoPi / SBC Alta Performance)"
			silicon_tuning_profile="Rockchip ARM (GMAC Multiqueue + Big.LITTLE)"
			;;
		*bcm2711*|*bcm2712*|*rpi-4*|*rpi-5*|*raspberrypi*)
			silicon_class="broadcom_arm"
			silicon_name="Raspberry Pi / Broadcom ARM"
			silicon_tuning_profile="Broadcom ARM (Multicore Fastpath)"
			;;
		*bcm4908*|*bcm4912*)
			silicon_class="broadcom_arm"
			silicon_name="Broadcom BCM4908 / BCM4912 (Quad-Core ARM)"
			silicon_tuning_profile="Broadcom High-End (Multicore Fastpath)"
			;;
		*qca9558*|*qca9531*|*qca9563*|*ar9344*|*ar71xx*|*ath79*|*mt7620*|*mt7628*)
			silicon_class="mips_legacy"
			silicon_name="MIPS Legado / Recursos Compactos"
			silicon_tuning_profile="MIPS Legado (Memória Enxuta + Fastpath Software)"
			;;
		*)
			if [ "$silicon_multicore" = 1 ]; then
				silicon_class="generic_multicore"
				silicon_name="Arquitetura Universal Multicore ($silicon_cpu_arch)"
				silicon_tuning_profile="Universal Multicore (Flowtable + RPS)"
			else
				silicon_class="generic_embedded"
				silicon_name="Arquitetura Universal Embarcada ($silicon_cpu_arch)"
				silicon_tuning_profile="Universal Embarcado (Flowtable Software)"
			fi
			;;
	esac

	# Check for kernel debugfs/sysfs PPE or WED
	if [ -e /sys/kernel/debug/ppe0 ] || [ -e /sys/kernel/debug/ppe1 ]; then
		silicon_hw_offload_capable=1
	fi
	if [ -d /sys/kernel/debug/wed0 ] || [ -d /sys/kernel/debug/wed1 ] || [ -d /sys/devices/platform/soc/*wed* ]; then
		silicon_wed_capable=1
	fi
}

system_hardware_auto_tune() {
	detect_hardware_silicon_profile

	# 1. Verificar se SQM esta ativo em alguma interface
	sqm_active=0
	if [ -f /etc/config/sqm ]; then
		for s in $(uci -q show sqm 2>/dev/null | sed -n 's/^sqm\.\([a-zA-Z0-9_]*\)=queue$/\1/p'); do
			[ "$(uci -q get "sqm.$s.enabled")" = "1" ] && sqm_active=1
		done
	fi

	# 2. Flow Offloading
	uci -q set firewall.@defaults[0].flow_offloading=1
	if [ "$sqm_active" = 1 ]; then
		uci -q set firewall.@defaults[0].flow_offloading_hw=0
		offload_reason="Software Flowtable (SQM/CAKE ativo prioriza combate a Bufferbloat)"
	elif [ "$silicon_hw_offload_capable" = 1 ]; then
		uci -q set firewall.@defaults[0].flow_offloading_hw=1
		offload_reason="Hardware PPE em Silício (Vazão máxima com CPU livre)"
	else
		uci -q set firewall.@defaults[0].flow_offloading_hw=0
		offload_reason="Software Flowtable (Estável e otimizado para a arquitetura)"
	fi
	uci commit firewall
	/etc/init.d/firewall reload >/dev/null 2>&1 || true

	# 3. Multicore & IRQ Balance
	irq_action="none"
	if [ "$silicon_multicore" = 1 ]; then
		if [ -x /etc/init.d/irqbalance ]; then
			/etc/init.d/irqbalance enable >/dev/null 2>&1 || true
			/etc/init.d/irqbalance restart >/dev/null 2>&1 || true
			irq_action="Ativado (distribui tarefas entre os $silicon_cpu_cores núcleos)"
		else
			irq_action="Multicore detectado ($silicon_cpu_cores núcleos)"
		fi
		# Mascara RPS
		rps_mask=1
		if [ "$silicon_cpu_cores" -eq 2 ]; then rps_mask=3
		elif [ "$silicon_cpu_cores" -eq 4 ]; then rps_mask="f"
		elif [ "$silicon_cpu_cores" -ge 8 ]; then rps_mask="ff"
		fi
		for rps_f in /sys/class/net/*/queues/rx-*/rps_cpus; do
			[ -w "$rps_f" ] && echo "$rps_mask" > "$rps_f" 2>/dev/null || true
		done
	else
		if [ -x /etc/init.d/irqbalance ]; then
			/etc/init.d/irqbalance stop >/dev/null 2>&1 || true
			/etc/init.d/irqbalance disable >/dev/null 2>&1 || true
		fi
		irq_action="Desativado (CPU de 1 núcleo dispensa troca de contexto)"
	fi

	# 4. Parametros de Sysctl por Faixa de Memoria (RAM Tier)
	sysctl_dir="/etc/sysctl.d"
	[ -n "${ARK_ROOT}" ] && sysctl_dir="${ARK_ROOT}/etc/sysctl.d"
	mkdir -p "$sysctl_dir"

	case "$silicon_ram_tier" in
		ultra_low)
			ct_max=16384
			rmem=262144
			wmem=262144
			backlog=1000
			vfs_cache=150
			dirty=10
			dirty_bg=5
			dns_cache=150
			;;
		low)
			ct_max=32768
			rmem=524288
			wmem=524288
			backlog=2000
			vfs_cache=120
			dirty=15
			dirty_bg=7
			dns_cache=500
			;;
		standard)
			ct_max=65536
			rmem=1048576
			wmem=1048576
			backlog=5000
			vfs_cache=100
			dirty=20
			dirty_bg=10
			dns_cache=1000
			;;
		high)
			ct_max=131072
			rmem=4194304
			wmem=4194304
			backlog=8000
			vfs_cache=100
			dirty=20
			dirty_bg=10
			dns_cache=2500
			;;
		extreme)
			ct_max=262144
			rmem=16777216
			wmem=16777216
			backlog=10000
			vfs_cache=100
			dirty=20
			dirty_bg=10
			dns_cache=5000
			;;
	esac

	cat <<-EOF > "${sysctl_dir}/99-ark-hardware-tune.conf"
net.netfilter.nf_conntrack_max=$ct_max
net.core.rmem_max=$rmem
net.core.wmem_max=$wmem
net.core.netdev_max_backlog=$backlog
vm.vfs_cache_pressure=$vfs_cache
vm.dirty_ratio=$dirty
vm.dirty_background_ratio=$dirty_bg
EOF
	sysctl -p "${sysctl_dir}/99-ark-hardware-tune.conf" >/dev/null 2>&1 || true

	# 5. Dimensionamento de Cache do DNSmasq
	if [ -f /etc/config/dhcp ]; then
		cur_dns_cache="$(uci -q get dhcp.@dnsmasq[0].cachesize || true)"
		if [ "$cur_dns_cache" != "$dns_cache" ]; then
			uci -q set "dhcp.@dnsmasq[0].cachesize=$dns_cache"
			uci commit dhcp
			/etc/init.d/dnsmasq reload >/dev/null 2>&1 || true
		fi
	fi

	# 6. Gravar estado
	mkdir -p /etc/config
	[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
	uci -q set equipe_perf.settings=performance
	uci -q set "equipe_perf.settings.hardware_profile=$silicon_class"
	uci -q set "equipe_perf.settings.tuning_profile=$silicon_tuning_profile"
	uci -q set "equipe_perf.settings.ram_tier=$silicon_ram_tier"
	uci -q set "equipe_perf.settings.last_auto_tune=$(date +%s 2>/dev/null || echo 0)"
	uci commit equipe_perf

	printf '{"ok":true,"silicon_class":"%s","silicon_name":"%s","tuning_profile":"%s","ram_tier":"%s","cores":%s,"offload_reason":"%s","irq_action":"%s","conntrack_max":%s,"rmem_max":%s,"dns_cache":%s}\n' \
		"$(json_escape "$silicon_class")" "$(json_escape "$silicon_name")" "$(json_escape "$silicon_tuning_profile")" \
		"$(json_escape "$silicon_ram_tier")" "$silicon_cpu_cores" "$(json_escape "$offload_reason")" \
		"$(json_escape "$irq_action")" "$ct_max" "$rmem" "$dns_cache"
}

get_system_hardware_info() {
	model="$(cat /tmp/sysinfo/model 2>/dev/null || cat /proc/cpuinfo 2>/dev/null | awk -F': ' '/model name|machine|Hardware/{print $2; exit}' || echo 'ARK Router')"
	board="$(cat /tmp/sysinfo/board_name 2>/dev/null || echo 'generic')"
	target="$(grep 'DISTRIB_TARGET' /etc/openwrt_release 2>/dev/null | cut -d"'" -f2 || echo '')"
	release="$(grep 'DISTRIB_DESCRIPTION' /etc/openwrt_release 2>/dev/null | cut -d"'" -f2 || echo 'OpenWrt')"
	kernel="$(uname -r 2>/dev/null || echo '')"

	# CPU Cores, Architecture and Model
	cpu_cores="$(grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 1)"
	[ "$cpu_cores" -ge 1 ] 2>/dev/null || cpu_cores=1
	cpu_model="$(awk -F': ' '/model name|machine|Hardware|Processor/{print $2; exit}' /proc/cpuinfo 2>/dev/null || true)"
	[ -n "$cpu_model" ] || cpu_model="$(cat /proc/device-tree/model 2>/dev/null | tr -d '\0' || true)"
	[ -n "$cpu_model" ] || cpu_model="$model"
	cpu_arch="$(uname -m 2>/dev/null || echo 'generic')"
	case "$cpu_arch" in
		aarch64*|arm64*) cpu_arch_desc="ARMv8 (64-bit)" ;;
		armv7*|armv6*|arm*) cpu_arch_desc="ARM (32-bit)" ;;
		mips64*) cpu_arch_desc="MIPS (64-bit)" ;;
		mips*) cpu_arch_desc="MIPS (32-bit)" ;;
		x86_64*) cpu_arch_desc="x86 (64-bit)" ;;
		i386*|i686*) cpu_arch_desc="x86 (32-bit)" ;;
		*) cpu_arch_desc="$cpu_arch" ;;
	esac

	# CPU Clock Frequency (MHz)
	cpu_freq_mhz=0
	if [ -r /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq ]; then
		f_khz="$(cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq 2>/dev/null || echo 0)"
		[ "$f_khz" -gt 0 ] 2>/dev/null && cpu_freq_mhz=$((f_khz / 1000))
	elif [ -r /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq ]; then
		f_khz="$(cat /sys/devices/system/cpu/cpu0/cpufreq/cpuinfo_max_freq 2>/dev/null || echo 0)"
		[ "$f_khz" -gt 0 ] 2>/dev/null && cpu_freq_mhz=$((f_khz / 1000))
	fi
	if [ "$cpu_freq_mhz" -le 0 ] && [ -r /sys/kernel/debug/clk/clk_summary ]; then
		armpll_hz="$(grep -E 'armpll|cpu_clk|arm_clk' /sys/kernel/debug/clk/clk_summary 2>/dev/null | awk '{print $4}' | head -n 1)"
		if [ -n "$armpll_hz" ] && [ "$armpll_hz" -gt 1000000 ] 2>/dev/null; then
			cpu_freq_mhz=$((armpll_hz / 1000000))
		fi
	fi
	if [ "$cpu_freq_mhz" -le 0 ]; then
		proc_mhz="$(awk -F': ' '/cpu MHz/{print int($2); exit}' /proc/cpuinfo 2>/dev/null || echo 0)"
		[ "$proc_mhz" -gt 0 ] 2>/dev/null && cpu_freq_mhz="$proc_mhz"
	fi
	if [ "$cpu_freq_mhz" -le 0 ]; then
		compat="$(cat /proc/device-tree/compatible 2>/dev/null | tr '\0' ' ' || echo '')"
		case "$board $compat" in
			*mt7986*|*filogic-830*|*predator-w6x*) cpu_freq_mhz=2000 ;;
			*mt7981*|*filogic-820*|*wr3000*) cpu_freq_mhz=1300 ;;
			*mt7988*|*filogic-880*) cpu_freq_mhz=1800 ;;
			*mt7622*) cpu_freq_mhz=1350 ;;
			*mt7621*) cpu_freq_mhz=880 ;;
			*mt7620*|*mt7628*) cpu_freq_mhz=580 ;;
			*qca9558*|*dgl-5500*|*archer-c7*) cpu_freq_mhz=720 ;;
			*qca9563*) cpu_freq_mhz=775 ;;
			*ipq4019*|*ipq4018*) cpu_freq_mhz=717 ;;
			*ipq807*) cpu_freq_mhz=2200 ;;
			*ipq5018*|*ipq5000*) cpu_freq_mhz=1000 ;;
			*ipq9574*|*ipq9554*) cpu_freq_mhz=2200 ;;
			*bcm4908*|*bcm4912*) cpu_freq_mhz=1800 ;;
			*bcm2711*|*rpi-4*) cpu_freq_mhz=1500 ;;
			*bcm2837*|*rpi-3*) cpu_freq_mhz=1200 ;;
			*rk3588*) cpu_freq_mhz=2400 ;;
			*rk3568*|*rk3566*) cpu_freq_mhz=2000 ;;
			*rk3399*) cpu_freq_mhz=1800 ;;
			*rk3328*) cpu_freq_mhz=1300 ;;
			*allwinner*|*sun8i*|*sun50i*|*h3*|*h5*|*h6*) cpu_freq_mhz=1200 ;;
			*armada-3720*|*armada-38*) cpu_freq_mhz=1000 ;;
			*x86_64*|*i386*) cpu_freq_mhz=2000 ;;
		esac
	fi
	if [ "$cpu_freq_mhz" -ge 1000 ]; then
		cpu_freq_str="$(awk -v f="$cpu_freq_mhz" 'BEGIN { printf "%.1f GHz", f/1000 }')"
	elif [ "$cpu_freq_mhz" -gt 0 ]; then
		cpu_freq_str="${cpu_freq_mhz} MHz"
	else
		cpu_freq_str="Padrão"
	fi

	# Real-time CPU Usage % via /proc/stat
	cpu_usage_pct=0
	stat_file="/tmp/ark-cpu-usage.prev"
	curr_stat="$(awk '/^cpu / {print $2+$3+$4+$5+$6+$7+$8, $5}' /proc/stat 2>/dev/null || echo '0 0')"
	curr_total="${curr_stat%% *}"; curr_idle="${curr_stat#* }"
	if [ -f "$stat_file" ]; then
		prev_stat="$(cat "$stat_file" 2>/dev/null || echo '0 0')"
		prev_total="${prev_stat%% *}"; prev_idle="${prev_stat#* }"
		diff_total=$((curr_total - prev_total))
		diff_idle=$((curr_idle - prev_idle))
		if [ "$diff_total" -gt 0 ]; then
			diff_used=$((diff_total - diff_idle))
			[ "$diff_used" -lt 0 ] && diff_used=0
			cpu_usage_pct=$(( (diff_used * 100) / diff_total ))
		fi
	fi
	echo "$curr_stat" > "$stat_file"

	# RAM
	mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_free_kb="$(awk '/MemFree:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_avail_kb="$(awk '/MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_cached_kb="$(awk '/^Cached:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_buffers_kb="$(awk '/^Buffers:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	[ -n "$mem_total_kb" ] || mem_total_kb=0
	[ -n "$mem_free_kb" ] || mem_free_kb=0
	[ -n "$mem_avail_kb" ] || mem_avail_kb=0
	[ -n "$mem_cached_kb" ] || mem_cached_kb=0
	[ -n "$mem_buffers_kb" ] || mem_buffers_kb=0
	[ "$mem_avail_kb" -gt 0 ] 2>/dev/null || mem_avail_kb=$((mem_free_kb + mem_cached_kb + mem_buffers_kb))

	# Storage / Flash
	flash_type="Flash Interna"
	root_dev="$(df -k /overlay 2>/dev/null | awk 'NR==2 {print $1}')"
	case "$root_dev" in
		*ubi*) flash_type="NAND Flash (UBI)" ;;
		*mtdblock*|*spi*) flash_type="SPI Flash (NOR)" ;;
		*mmcblk*) flash_type="eMMC / MicroSD" ;;
		*sd*|*nvme*) flash_type="SSD / Disco" ;;
		*overlayfs*) flash_type="Flash Overlay" ;;
	esac
	overlay_total_kb="$(df -k /overlay 2>/dev/null | awk 'NR==2 {print $2}')"
	overlay_avail_kb="$(df -k /overlay 2>/dev/null | awk 'NR==2 {print $4}')"
	tmp_total_kb="$(df -k /tmp 2>/dev/null | awk 'NR==2 {print $2}')"
	tmp_avail_kb="$(df -k /tmp 2>/dev/null | awk 'NR==2 {print $4}')"
	[ -n "$overlay_total_kb" ] || overlay_total_kb=0
	[ -n "$overlay_avail_kb" ] || overlay_avail_kb=0
	[ -n "$tmp_total_kb" ] || tmp_total_kb=0
	[ -n "$tmp_avail_kb" ] || tmp_avail_kb=0

	# Wi-Fi Capabilities
	wifi_be=false; wifi_ax=false; wifi_ac=false; wifi_n=false; wifi_320=false; wifi_160=false; wifi_6g=false
	iw_cache="/tmp/ark-iw-info.cache"
	if [ ! -s "$iw_cache" ]; then
		iw list 2>/dev/null > "$iw_cache" || true
	fi
	if grep -qE 'EHT Capabilities|EHT-PHY|EHT Iftypes' "$iw_cache" 2>/dev/null; then wifi_be=true; fi
	if grep -q 'HE Iftypes' "$iw_cache" 2>/dev/null; then wifi_ax=true; fi
	if grep -q 'VHT Capabilities' "$iw_cache" 2>/dev/null; then wifi_ac=true; fi
	if grep -q 'HT20/HT40' "$iw_cache" 2>/dev/null; then wifi_n=true; fi
	if [ "$wifi_be" = true ] && grep -qE 'Supported Channel Width: 320 MHz|EHT320' "$iw_cache" 2>/dev/null; then wifi_320=true; fi
	if grep -qE 'Supported Channel Width: 160 MHz|HE160|VHT160|EHT160' "$iw_cache" 2>/dev/null; then wifi_160=true; fi
	if grep -qE 'Band 4:|Band 6GHz|/6GHz|5955 MHz' "$iw_cache" 2>/dev/null; then wifi_6g=true; fi

	detect_hardware_silicon_profile
	hw_offload_bool="false"; [ "$silicon_hw_offload_capable" = 1 ] && hw_offload_bool="true"
	wed_bool="false"; [ "$silicon_wed_capable" = 1 ] && wed_bool="true"
	multicore_bool="false"; [ "$silicon_multicore" = 1 ] && multicore_bool="true"

	# Start JSON
	printf '{"model":"%s","board":"%s","target":"%s","release":"%s","kernel":"%s",' \
		"$(json_escape "$model")" "$(json_escape "$board")" "$(json_escape "$target")" \
		"$(json_escape "$release")" "$(json_escape "$kernel")"

	printf '"silicon":{"class":"%s","name":"%s","hw_offload_capable":%s,"wed_capable":%s,"multicore":%s,"ram_tier":"%s","ram_tier_desc":"%s","tuning_profile":"%s"},' \
		"$(json_escape "$silicon_class")" "$(json_escape "$silicon_name")" \
		"$hw_offload_bool" "$wed_bool" "$multicore_bool" \
		"$(json_escape "$silicon_ram_tier")" "$(json_escape "$silicon_ram_tier_desc")" \
		"$(json_escape "$silicon_tuning_profile")"

	printf '"cpu":{"cores":%s,"arch":"%s","arch_desc":"%s","model":"%s","freq_mhz":%s,"freq_str":"%s","usage_pct":%s},' \
		"$cpu_cores" "$(json_escape "$cpu_arch")" "$(json_escape "$cpu_arch_desc")" \
		"$(json_escape "$cpu_model")" "$cpu_freq_mhz" "$(json_escape "$cpu_freq_str")" "$cpu_usage_pct"

	printf '"memory":{"total_kb":%s,"free_kb":%s,"avail_kb":%s,"cached_kb":%s,"buffers_kb":%s,"total_mb":%s,"avail_mb":%s},' \
		"$mem_total_kb" "$mem_free_kb" "$mem_avail_kb" "$mem_cached_kb" "$mem_buffers_kb" \
		$((mem_total_kb / 1024)) $((mem_avail_kb / 1024))

	printf '"storage":{"flash_type":"%s","overlay_total_kb":%s,"overlay_avail_kb":%s,"overlay_avail_mb":%s,"tmp_total_kb":%s,"tmp_avail_kb":%s,"tmp_avail_mb":%s},' \
		"$(json_escape "$flash_type")" "$overlay_total_kb" "$overlay_avail_kb" $((overlay_avail_kb / 1024)) \
		"$tmp_total_kb" "$tmp_avail_kb" $((tmp_avail_kb / 1024))

	printf '"wifi":{"wifi_be":%s,"wifi_ax":%s,"wifi_ac":%s,"wifi_n":%s,"wifi_320":%s,"wifi_160":%s,"wifi_6g":%s},' \
		"$wifi_be" "$wifi_ax" "$wifi_ac" "$wifi_n" "$wifi_320" "$wifi_160" "$wifi_6g"

	# Thermal Sensors List
	first_t=1
	has_cpu_thermal=0
	printf '"thermal_sensors":['
	for z in /sys/class/thermal/thermal_zone*; do
		[ -d "$z" ] || continue
		ztype="$(cat "$z/type" 2>/dev/null || echo 'cpu')"
		ztemp="$(cat "$z/temp" 2>/dev/null || echo 0)"
		[ "$ztemp" -gt 0 ] 2>/dev/null || continue
		[ "$ztemp" -gt 1000 ] && ztemp_c=$((ztemp / 1000)) || ztemp_c="$ztemp"
		label="Processador (CPU)"
		case "$ztype" in
			*cpu*) label="Processador (CPU)"; has_cpu_thermal=1 ;;
			*wifi*|*wlan*) label="Wi-Fi" ;;
			*switch*|*phy*|*mdio*) label="Switch de Rede" ;;
			*) label="$ztype" ;;
		esac
		[ "$first_t" = 1 ] && first_t=0 || printf ','
		printf '{"name":"%s","type":"%s","temp_c":%s}' \
			"$(json_escape "$label")" "$(json_escape "$ztype")" "$ztemp_c"
	done
	for h in /sys/class/hwmon/hwmon*; do
		[ -d "$h" ] || continue
		hname="$(cat "$h/name" 2>/dev/null || echo '')"
		for tf in "$h"/temp*_input; do
			[ -r "$tf" ] || continue
			htemp="$(cat "$tf" 2>/dev/null || echo 0)"
			[ "$htemp" -gt 0 ] 2>/dev/null || continue
			[ "$htemp" -gt 1000 ] && htemp_c=$((htemp / 1000)) || htemp_c="$htemp"
			hlabel="Sensor"
			case "$hname" in
				*cpu*) hlabel="Processador (CPU)"; htype="cpu" ;;
				*mt7915_phy0*|*phy0*|*wifi2*) hlabel="Wi-Fi 2.4 GHz"; htype="wifi2g" ;;
				*mt7915_phy1*|*phy1*|*wifi5*) hlabel="Wi-Fi 5 GHz"; htype="wifi5g" ;;
				*mdio*|*switch*|*phy*) hlabel="Switch Ethernet"; htype="switch" ;;
				*) hlabel="$hname"; htype="generic" ;;
			esac
			t_label_file="$(printf '%s' "$tf" | sed 's/_input$/_label/')"
			t_label="$(cat "$t_label_file" 2>/dev/null || echo '')"
			if [ -n "$t_label" ]; then
				hlabel="$t_label"
				case "$t_label" in
					*Core*|*CPU*|*Package*|*cpu*) htype="cpu" ;;
					*Wi-Fi*|*WLAN*|*wifi*|*wlan*) htype="wifi" ;;
					*) htype="generic" ;;
				esac
			fi
			if [ "$htype" = "cpu" ]; then
				if [ "$has_cpu_thermal" = 1 ]; then
					continue
				fi
				has_cpu_thermal=1
			fi
			[ "$first_t" = 1 ] && first_t=0 || printf ','
			printf '{"name":"%s","type":"%s","temp_c":%s}' \
				"$(json_escape "$hlabel")" "$(json_escape "$htype")" "$htemp_c"
		done
	done
	printf '],'

	# Network Port Capabilities (Max Supported Speed)
	first_p=1
	printf '"ports":{'
	for ppath in /sys/class/net/*; do
		[ -d "$ppath" ] || continue
		pname="$(basename "$ppath")"
		case "$pname" in
			lan*|eth*|wan*)
				speed="$(cat "$ppath/speed" 2>/dev/null || echo '')"
				carrier="$(cat "$ppath/carrier" 2>/dev/null || echo 0)"
				duplex="$(cat "$ppath/duplex" 2>/dev/null || echo '')"
				max_speed="1G"
				dev_status="$(ubus call network.device status "{\"name\":\"$pname\"}" 2>/dev/null || true)"
				case "$dev_status" in
					*2500base*|*2500F*) max_speed="2.5G" ;;
					*10000base*) max_speed="10G" ;;
					*1000base*|*1000F*) max_speed="1G" ;;
					*100base*|*100F*) max_speed="100M" ;;
					*) [ "$speed" = 2500 ] && max_speed="2.5G" ;;
				esac
				[ "$first_p" = 1 ] && first_p=0 || printf ','
				printf '"%s":{"speed":"%s","carrier":%s,"duplex":"%s","max_speed":"%s"}' \
					"$(json_escape "$pname")" "$(json_escape "$speed")" "$carrier" \
					"$(json_escape "$duplex")" "$(json_escape "$max_speed")"
				;;
		esac
	done
	if is_swconfig; then
		for p in 1 2 3 4; do
			sw_link="$(swconfig dev switch0 port "$p" get link 2>/dev/null || true)"
			p_carrier=0; p_speed=""; p_duplex="Automático"; p_max="1G"
			if printf '%s' "$sw_link" | grep -q 'link:up'; then
				p_carrier=1
				case "$sw_link" in
					*1000base*) p_speed="1000"; p_max="1G" ;;
					*100base*) p_speed="100"; p_max="100M" ;;
					*10base*) p_speed="10"; p_max="10M" ;;
					*) p_speed="100"; p_max="100M" ;;
				esac
				printf '%s' "$sw_link" | grep -q 'full-duplex' && p_duplex="Full duplex" || p_duplex="Half duplex"
			fi
			for alias in "lan$p" "port$p"; do
				[ "$first_p" = 1 ] && first_p=0 || printf ','
				printf '"%s":{"speed":"%s","carrier":%s,"duplex":"%s","max_speed":"%s"}' \
					"$alias" "$p_speed" "$p_carrier" "$p_duplex" "$p_max"
			done
		done
		sw_wan="$(swconfig dev switch0 port 5 get link 2>/dev/null || true)"
		p_carrier=0; p_speed=""; p_duplex="Automático"; p_max="1G"
		if printf '%s' "$sw_wan" | grep -q 'link:up'; then
			p_carrier=1
			case "$sw_wan" in
				*1000base*) p_speed="1000"; p_max="1G" ;;
				*100base*) p_speed="100"; p_max="100M" ;;
				*) p_speed="100"; p_max="100M" ;;
			esac
			printf '%s' "$sw_wan" | grep -q 'full-duplex' && p_duplex="Full duplex" || p_duplex="Half duplex"
		fi
		for alias in "wan" "wan1" "port5" "lan5" "eth0.2"; do
			[ "$first_p" = 1 ] && first_p=0 || printf ','
			printf '"%s":{"speed":"%s","carrier":%s,"duplex":"%s","max_speed":"%s"}' \
				"$alias" "$p_speed" "$p_carrier" "$p_duplex" "$p_max"
		done
	fi
	printf '}}\n'
}



handle_system() {
	action="$1"
	[ -n "$action" ] || { echo "Uso: $0 <comando> [args...]" >&2; exit 1; }
	case "$action" in
	system-perf-status)
		system_perf_status_json
		;;
	system-perf-save)
		shift
		system_perf_save "$@"
		;;
	ram-purge-now)
		sync
		echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
		mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
		mem_avail_kb="$(awk '/MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null || awk '/MemFree:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
		printf '{"ok":true,"mem_total_kb":%s,"mem_avail_kb":%s}\n' "$mem_total_kb" "$mem_avail_kb"
		;;
	dmz-status)
		dmz_status_json
		;;
	dmz-set)
		shift
		dmz_set "$@"
		;;
	dns-turbo-status)
		dns_turbo_status_json
		;;
	dns-turbo-save)
		shift
		dns_turbo_save "$@"
		;;
	network-capacity-status)
		network_capacity_status_json
		;;
	network-capacity-save)
		shift
		network_capacity_save "$@"
		;;
	system-memory-purge)
		system_memory_purge
		;;
	system-storage-purge)
		system_storage_purge
		;;
	fast-targets)
		count="${2:-8}"
		token="YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm"
		fast_meta="$(wget -T 4 -qO- --no-check-certificate "https://api.fast.com/netflix/speedtest/v2?https=true&token=${token}&urlCount=${count}" 2>/dev/null)"
		if [ -n "$fast_meta" ]; then
			printf '%s\n' "$fast_meta"
		else
			printf '{"client":{},"targets":[]}\n'
		fi
		exit 0
		;;
	https-redirect)
		case "$2" in 0|1) ;; *) echo 'Preferencia HTTPS invalida' >&2; exit 2 ;; esac
		if [ "$2" = 1 ]; then
			cert="$(uci -q get uhttpd.main.cert)"; key="$(uci -q get uhttpd.main.key)"
			[ -n "$(uci -q get uhttpd.main.listen_https)" ] && [ -r "$cert" ] && [ -r "$key" ] || { echo 'HTTPS ou certificado indisponivel' >&2; exit 3; }
		fi
		uci -q set "uhttpd.main.redirect_https=$2"; uci commit uhttpd
		(sleep 1; /etc/init.d/uhttpd restart) >/dev/null 2>&1 &
		echo ok
		;;
	cleanup-orphan-leds)
		cleanup_orphan_leds
		echo 'ok'
		;;
	get-led-hardware-info)
		get_led_hardware_info
		;;
	set-led-preset)
		set_led_preset "${2:-smart}"
		;;
	set-led-rgb-color|set-led-color)
		set_led_rgb_color "$2" "$3" "$4"
		;;
	get-led-status)
		get_led_status
		;;
	system-hardware-info)
		get_system_hardware_info
		;;
	system-hardware-auto-tune)
		system_hardware_auto_tune
		;;
	update-led-alert)
		update_led_alert
		;;
	update-wan-led)
		update_wan_led
		;;

	*)
		echo "Acao Sistema desconhecida: $action" >&2
		exit 1
		;;
	esac
}

if [ "$(basename "$0")" = "system.sh" ]; then
	handle_system "$@"
fi
