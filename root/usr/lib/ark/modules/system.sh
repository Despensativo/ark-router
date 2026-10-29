#!/bin/sh
# /usr/lib/ark/modules/system.sh - System Performance, Sysctl, DMZ, LEDs & Hardware Module
# Compatible with BusyBox /bin/ash, OpenWrt 19.07 to 25.12

[ -z "${_ARK_SYSTEM_SH_LOADED:-}" ] || return 0
_ARK_SYSTEM_SH_LOADED=1

[ -n "${ARK_LIB_DIR:-}" ] || ARK_LIB_DIR="/usr/lib/ark"
. "${ARK_LIB_DIR}/common.sh"
. "${ARK_LIB_DIR}/logging.sh"
. "${ARK_LIB_DIR}/validation.sh"
[ -f "${ARK_LIB_DIR}/led.sh" ] && . "${ARK_LIB_DIR}/led.sh"

[ -f "${ARK_LIB_DIR}/modules/system_hardware_leds.sh" ] && . "${ARK_LIB_DIR}/modules/system_hardware_leds.sh"

system_perf_status_json() {
	local perf_cache="/tmp/ark-perf-cache.json"
	local perf_ts="/tmp/ark-perf-cache.ts"
	local now cache_time

	now="$(date +%s 2>/dev/null || echo 0)"
	if [ -s "$perf_cache" ] && [ -f "$perf_ts" ]; then
		cache_time="$(head -n 1 "$perf_ts" 2>/dev/null || echo 0)"
		case "$cache_time" in ''|*[!0-9]*) cache_time=0 ;; esac
		if [ "$now" -gt 0 ] && [ "$cache_time" -gt 0 ] && [ $((now - cache_time)) -lt 120 ]; then
			local cc="$(cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo 0)"
			local ma="$(awk '/MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null || awk '/MemFree:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
			sed -e "s/\"conntrack_count\":[0-9]*/\"conntrack_count\":$cc/" -e "s/\"mem_avail_kb\":[0-9]*/\"mem_avail_kb\":$ma/" "$perf_cache"
			return 0
		fi
	fi

	system_perf_status_raw > "$perf_cache.tmp"
	mv "$perf_cache.tmp" "$perf_cache"
	echo "$now" > "$perf_ts"
	cat "$perf_cache"
}

system_perf_status_raw() {
	local conntrack_recycle ram_autopurge speedify_encryption speedify_installed speedify_cli_bin speedify_log_cap nlbwmon_lite irq_installed irq_active conntrack_count conntrack_max mem_total_kb
	local mem_avail_kb dns_allservers saved_allservers saved_servers clean_saved s clean_s dns_servers raw_servers clean_servers blocker_name dns_blocker_active
	local root_df root_total_kb root_used_kb root_avail_kb wifi_supplicant_disable ram_trim_interval igmp_snooping
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

	igmp_snooping=false
	[ "$(uci -q get network.lan.igmp_snooping || printf 0)" = 1 ] && igmp_snooping=true
	[ -f /sys/class/net/br-lan/bridge/multicast_snooping ] && [ "$(cat /sys/class/net/br-lan/bridge/multicast_snooping 2>/dev/null)" = 1 ] && igmp_snooping=true

	printf '{"conntrack_recycle":%s,"ram_autopurge":%s,"speedify_encryption":%s,"speedify_installed":%s,"speedify_log_cap":%s,"nlbwmon_lite":%s,"irqbalance_installed":%s,"irqbalance_active":%s,"conntrack_count":%s,"conntrack_max":%s,"mem_total_kb":%s,"mem_avail_kb":%s,"root_total_kb":%s,"root_used_kb":%s,"root_avail_kb":%s,"dns_allservers":%s,"dns_servers":"%s","dns_blocker_active":%s,"dns_blocker_name":"%s","wifi_supplicant_disable":%s,"ram_trim_interval":"%s","igmp_snooping":%s}\n' \
		"$conntrack_recycle" "$ram_autopurge" "$speedify_encryption" "$speedify_installed" "$speedify_log_cap" "$nlbwmon_lite" "$irq_installed" "$irq_active" "$conntrack_count" "$conntrack_max" "$mem_total_kb" "$mem_avail_kb" "$root_total_kb" "$root_used_kb" "$root_avail_kb" "$dns_allservers" "$(json_escape "$dns_servers")" "$dns_blocker_active" "$(json_escape "$blocker_name")" "$wifi_supplicant_disable" "$(json_escape "$ram_trim_interval")" "$igmp_snooping"
}

dmz_status_json() {
	local enabled dest_ip mac device_name src_zone cur_dest cur_enabled saved_enabled saved_ip saved_mac saved_name sec_name
	local host
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
	local enable mac name wan_src suffix sec_name host clean_host_name
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
	local allservers saved_allservers saved_servers clean_saved s clean_s servers raw_servers clean_servers filter_aaaa dhcp_fallback saved_fallback
	local blocker_name dns_blocker_active cachesize mem_total_kb mem_total_mb doh_installed doh_active
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
	doh_installed=false
	doh_active=false
	if command -v ark_has_doh_proxy >/dev/null 2>&1 && ark_has_doh_proxy; then
		doh_installed=true
		if uci -q get dhcp.@dnsmasq[0].server 2>/dev/null | grep -q '127\.0\.0\.1#5053'; then
			doh_active=true
		fi
	fi
	cachesize="$(uci -q get dhcp.@dnsmasq[0].cachesize || echo 150)"
	mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_total_mb=$((mem_total_kb / 1024))
	printf '{"allservers":%s,"servers":"%s","filter_aaaa":%s,"dhcp_fallback":%s,"dns_blocker_active":%s,"dns_blocker_name":"%s","cachesize":%s,"mem_total_mb":%s,"doh_installed":%s,"doh_active":%s}\n' \
		"$allservers" "$(json_escape "$servers")" "$filter_aaaa" "$dhcp_fallback" "$dns_blocker_active" "$(json_escape "$blocker_name")" "$cachesize" "$mem_total_mb" "$doh_installed" "$doh_active"
}

dns_turbo_save() {
	local allservers dns1 dns2 dns3 dns4 fallback cache_sz valid_servers raw_ip blocker_name actual_allservers domain_servers
	local s ds cur_ipv6 lan_ip
	allservers="${1:-1}"
	dns1="$2"
	dns2="$3"
	dns3="$4"
	dns4="$5"
	fallback="${6:-0}"
	cache_sz="${7:-}"
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
	case " $valid_servers " in
		*" 1.1.1.2 "*|*" 1.0.0.2 "*|*" 1.1.1.3 "*|*" 1.0.0.3 "*|*" 94.140.14."* |*" 94.140.15."* |*" 208.67.222.123 "*|*" 208.67.220.123 "*|*" 185.228.168."* ) ;;
		*) uci -q set equipe_perf.settings.adblock_cloud='0' ;;
	esac
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
		command -v ark_sync_doh_proxy >/dev/null 2>&1 && ark_sync_doh_proxy "disable" || true
		uci -q add_list dhcp.@dnsmasq[0].server='127.0.0.1#5335'
		uci -q set dhcp.@dnsmasq[0].noresolv='1'
	elif [ -n "$blocker_name" ]; then
		uci -q set dhcp.@dnsmasq[0].noresolv='1'
	elif [ "$(uci -q get equipe_perf.settings.dns_doh_enabled || echo 1)" != "0" ] && command -v ark_sync_doh_proxy >/dev/null 2>&1 && ark_sync_doh_proxy "turbo" "$valid_servers"; then
		uci -q set "dhcp.@dnsmasq[0].allservers=1"
	else
		command -v ark_sync_doh_proxy >/dev/null 2>&1 && ark_sync_doh_proxy "disable" || true
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
	if [ -n "$cache_sz" ]; then
		case "$cache_sz" in
			''|*[!0-9]*) cache_sz=10000 ;;
		esac
		[ "$cache_sz" -lt 150 ] && cache_sz=150
		[ "$cache_sz" -gt 50000 ] && cache_sz=50000
		uci -q set "dhcp.@dnsmasq[0].cachesize=$cache_sz"
	fi
	command -v sanitize_dhcp_hostnames >/dev/null 2>&1 && sanitize_dhcp_hostnames
	uci commit dhcp
	/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
	echo ok
}

dns_turbo_doh_toggle() {
	local enable="${1:-1}" alls fallback cache_sz servers s1 s2 s3 s4
	case "$enable" in 1|true|on|install) enable=1 ;; *) enable=0 ;; esac
	if [ "$enable" = "1" ]; then
		if ! ark_has_doh_proxy; then
			if command -v apk >/dev/null 2>&1; then
				apk add https-dns-proxy >/dev/null 2>&1 || { apk update >/dev/null 2>&1 || true; apk add https-dns-proxy >/dev/null 2>&1; } || true
			elif command -v opkg >/dev/null 2>&1; then
				opkg install https-dns-proxy >/dev/null 2>&1 || { opkg update >/dev/null 2>&1 || true; opkg install https-dns-proxy >/dev/null 2>&1; } || true
			fi
		fi
		if ! ark_has_doh_proxy; then
			echo "Nao foi possivel instalar o pacote https-dns-proxy neste sistema." >&2
			return 1
		fi
	fi
	mkdir -p /etc/config
	[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
	uci -q set equipe_perf.settings=performance
	uci -q set "equipe_perf.settings.dns_doh_enabled=$enable"
	uci commit equipe_perf

	alls="$(uci -q get equipe_perf.settings.dns_allservers || uci -q get dhcp.@dnsmasq[0].allservers || echo 1)"
	fallback="$(uci -q get equipe_perf.settings.dns_dhcp_fallback || echo 1)"
	cache_sz="$(uci -q get dhcp.@dnsmasq[0].cachesize || echo 2500)"
	servers="$(uci -q get equipe_perf.settings.dns_servers || echo '1.1.1.1 2606:4700:4700::1111 8.8.8.8 2001:4860:4860::8888')"
	# shellcheck disable=SC2086
	set -- $servers
	s1="${1:-1.1.1.1}"
	s2="${2:-8.8.8.8}"
	s3="${3:-}"
	s4="${4:-}"
	dns_turbo_save "$alls" "$s1" "$s2" "$s3" "$s4" "$fallback" "$cache_sz" >/dev/null
	dns_turbo_status_json
}

network_capacity_status_json() {
	local conntrack_max conntrack_count conntrack_tcp_timeout dns_forward_max cachesize dhcp_leasetime mem_total_kb mem_total_mb tcp_cc bbr_supported gro_supported
	conntrack_max="$(cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null || echo 65536)"
	conntrack_count="$(cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo 0)"
	conntrack_tcp_timeout="$(cat /proc/sys/net/netfilter/nf_conntrack_tcp_timeout_established 2>/dev/null || echo 432000)"
	dns_forward_max="$(uci -q get dhcp.@dnsmasq[0].dns_forward_max || echo 150)"
	cachesize="$(uci -q get dhcp.@dnsmasq[0].cachesize || echo 150)"
	dhcp_leasetime="$(uci -q get dhcp.lan.leasetime || echo 12h)"
	mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_total_mb=$((mem_total_kb / 1024))
	tcp_cc="$(sysctl -n net.ipv4.tcp_congestion_control 2>/dev/null || echo cubic)"
	bbr_supported=false
	grep -q "\bbbr\b" /proc/sys/net/ipv4/tcp_available_congestion_control 2>/dev/null && bbr_supported=true
	gro_supported=false
	command -v ethtool >/dev/null 2>&1 && gro_supported=true
	printf '{"conntrack_max":%s,"conntrack_count":%s,"conntrack_tcp_timeout":%s,"dns_forward_max":%s,"cachesize":%s,"dhcp_leasetime":"%s","mem_total_mb":%s,"tcp_congestion_control":"%s","bbr_supported":%s,"gro_supported":%s}\n' \
		"$conntrack_max" "$conntrack_count" "$conntrack_tcp_timeout" "$dns_forward_max" "$cachesize" "$dhcp_leasetime" "$mem_total_mb" "$tcp_cc" "$bbr_supported" "$gro_supported"
}

network_capacity_save() {
	local ct_max fwd_max cache_sz lease_time tcp_timeout sysctl_dir tcp_cc
	ct_max="${1:-131072}"
	fwd_max="${2:-2000}"
	cache_sz="${3:-10000}"
	lease_time="${4:-2h}"
	tcp_timeout="${5:-432000}"
	tcp_cc="${6:-}"

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
	if [ -n "$tcp_cc" ]; then
		case "$tcp_cc" in
			bbr|cubic|reno)
				sysctl -w "net.ipv4.tcp_congestion_control=$tcp_cc" 2>/dev/null || true
				;;
		esac
	fi
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
	local conntrack_recycle ram_autopurge speedify_encryption speedify_log_cap nlbwmon_lite dns_allservers wifi_supplicant_disable ram_trim_interval igmp_snooping blocker_name actual_dns_allservers has_global_server
	local s saved_servers lan_ip sysctl_dir cur_rmem target_rmem logf
	conntrack_recycle="${1:-0}"
	ram_autopurge="${2:-0}"
	speedify_encryption="${3:-1}"
	speedify_log_cap="${4:-0}"
	nlbwmon_lite="${5:-0}"
	dns_allservers="${6:-0}"
	wifi_supplicant_disable="${7:-0}"
	ram_trim_interval="${8:-0}"
	igmp_snooping="${9:-}"

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
		# RFC 5382 REQ-5 & OpenWrt 10-default.conf: 7440s (2h04m) reduz o padrao de 5 dias (432000s) em 98.2%
		# mantendo janela superior ao keepalive de 2h (7200s) do iOS/Android Push (APNs/FCM) e SSH.
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=7440 2>/dev/null || true
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_close_wait=30 2>/dev/null || true
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_fin_wait=30 2>/dev/null || true
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_time_wait=30 2>/dev/null || true
		printf 'net.netfilter.nf_conntrack_tcp_timeout_established=7440\nnet.netfilter.nf_conntrack_tcp_timeout_close_wait=30\nnet.netfilter.nf_conntrack_tcp_timeout_fin_wait=30\nnet.netfilter.nf_conntrack_tcp_timeout_time_wait=30\n' > "${sysctl_dir}/99-ark-conntrack.conf"
	else
		sysctl -w net.netfilter.nf_conntrack_tcp_timeout_established=432000 2>/dev/null || true
		rm -f "${sysctl_dir}/99-ark-conntrack.conf" 2>/dev/null || true
	fi

	# Evita Split-Brain de rmem_max caso o hardware-tune ou TCP Turbo ja tenha alocado buffer maior
	cur_rmem="$(cat /proc/sys/net/core/rmem_max 2>/dev/null || echo 0)"
	case "$cur_rmem" in ''|*[!0-9]*) cur_rmem=0 ;; esac
	target_rmem=1048576
	[ "$cur_rmem" -gt "$target_rmem" ] && target_rmem="$cur_rmem"

	if [ "$ram_autopurge" = 1 ]; then
		sysctl -w vm.vfs_cache_pressure=150 2>/dev/null || true
		sysctl -w vm.dirty_ratio=10 2>/dev/null || true
		sysctl -w vm.dirty_background_ratio=5 2>/dev/null || true
		sysctl -w vm.swappiness=30 2>/dev/null || true
		[ "$cur_rmem" -lt 1048576 ] && sysctl -w net.core.rmem_max=1048576 2>/dev/null || true
		cat <<-EOF > "${sysctl_dir}/99-ark-memory.conf"
			vm.vfs_cache_pressure=150
			vm.dirty_ratio=10
			vm.dirty_background_ratio=5
			vm.swappiness=30
		EOF
		if [ ! -f "${sysctl_dir}/99-ark-hardware-tune.conf" ] && [ ! -f "${sysctl_dir}/99-ark-performance.conf" ]; then
			echo "net.core.rmem_max=$target_rmem" >> "${sysctl_dir}/99-ark-memory.conf"
		fi
	else
		sysctl -w vm.vfs_cache_pressure=100 2>/dev/null || true
		sysctl -w vm.dirty_ratio=20 2>/dev/null || true
		sysctl -w vm.dirty_background_ratio=10 2>/dev/null || true
		sysctl -w vm.swappiness=60 2>/dev/null || true
		[ "$cur_rmem" -lt 1048576 ] && sysctl -w net.core.rmem_max=1048576 2>/dev/null || true
		rm -f "${sysctl_dir}/99-ark-memory.conf" 2>/dev/null || true
	fi

	# Garantir que wpad e wpa_supplicant permanecam ativos (essencial para o netifd inicializar radios Wi-Fi)
	uci -q delete wireless.globals 2>/dev/null || true
	uci commit wireless 2>/dev/null || true
	if [ -f /etc/init.d/wpad ]; then
		sed -i 's/.*wireless.globals.supplicant.*/\tif [ -x "\/usr\/sbin\/wpa_supplicant" ]; then/' /etc/init.d/wpad 2>/dev/null || true
	fi

	# Higienizacao de cron legado: em sistemas OpenWrt SquashFS/OverlayFS, drop_caches=3 periodico via cron
	# despeja paginas descomprimidas da Flash e causa picos de CPU/I/O. A purga de RAM deve ocorrer apenas sob demanda (ram-purge-now).
	mkdir -p /etc/crontabs
	[ -f /etc/crontabs/root ] || touch /etc/crontabs/root
	sed -i '/drop_caches/d' /etc/crontabs/root 2>/dev/null || true
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
		fi
		/etc/init.d/nlbwmon restart >/dev/null 2>&1 || true
	fi

	if [ -n "$igmp_snooping" ]; then
		case "$igmp_snooping" in 1|true) igmp_val=1 ;; *) igmp_val=0 ;; esac
		uci -q set "network.lan.igmp_snooping=$igmp_val"
		uci commit network 2>/dev/null || true
		[ -f /sys/class/net/br-lan/bridge/multicast_snooping ] && echo "$igmp_val" > /sys/class/net/br-lan/bridge/multicast_snooping 2>/dev/null || true
	fi

	[ -x /etc/init.d/ark-hardware-tune ] && /etc/init.d/ark-hardware-tune start >/dev/null 2>&1 || true

	echo ok
}



system_processes_telemetry() {
	local mem_total_kb mem_avail_kb procs_json htop_inst
	mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_avail_kb="$(awk '/MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null || awk '/MemFree:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	[ -n "$mem_total_kb" ] || mem_total_kb=0
	[ -n "$mem_avail_kb" ] || mem_avail_kb=0

	procs_json="$(awk -v mem_tot="$mem_total_kb" '
	FNR == 1 {
		file = FILENAME
		if (file ~ /\/statm$/) {
			split(file, parts, "/")
			pid = parts[3]
			rss_kb = $2 * 4
			vsz_kb = $1 * 4
			if (pid > 0 && rss_kb > 0) {
				rss[pid] = rss_kb
				vsz[pid] = vsz_kb
				pids[count++] = pid
			}
		} else if (file ~ /\/comm$/) {
			split(file, parts, "/")
			pid = parts[3]
			comm[pid] = $0
		}
	}
	END {
		for (i = 0; i < count; i++) {
			for (j = i + 1; j < count; j++) {
				if (rss[pids[j]] > rss[pids[i]]) {
					tmp = pids[i]
					pids[i] = pids[j]
					pids[j] = tmp
				}
			}
		}
		top_out = "["
		all_out = "["
		for (k = 0; k < count; k++) {
			p = pids[k]
			c = comm[p] ? comm[p] : ("proc_" p)
			gsub(/["\\]/, "", c)
			pct = (mem_tot > 0) ? sprintf("%.1f", (rss[p] / mem_tot) * 100) : "0.0"
			entry = sprintf("{\"pid\":%d,\"name\":\"%s\",\"rss_kb\":%d,\"vsz_kb\":%d,\"percent\":%s}", p, c, rss[p], vsz[p], pct)
			if (k > 0) all_out = all_out ","
			all_out = all_out entry
			if (k < 5) {
				if (k > 0) top_out = top_out ","
				top_out = top_out entry
			}
		}
		top_out = top_out "]"
		all_out = all_out "]"
		print "{\"top_rss\":" top_out ",\"processes\":" all_out "}"
	}
	' /proc/[0-9]*/statm /proc/[0-9]*/comm 2>/dev/null)"

	[ -n "$procs_json" ] || procs_json='{"top_rss":[],"processes":[]}'

	htop_inst=false
	{ [ -x /usr/bin/htop ] || [ -x /usr/sbin/htop ]; } && htop_inst=true

	printf '{"ok":true,"mem_total_kb":%s,"mem_avail_kb":%s,"htop_installed":%s,%s\n' \
		"$mem_total_kb" "$mem_avail_kb" "$htop_inst" "${procs_json#\{}"
}

system_memory_purge() {
	local free_kb
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
	rm -f /tmp/*.tmp /tmp/*.log.1 2>/dev/null || true
	sync
	overlay_free="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"
	case "$overlay_free" in ''|*[!0-9]*) overlay_free=0 ;; esac
	printf '{"ok":true,"overlay_free_kb":%s,"overlay_total_kb":%s}\n' "$overlay_free" "$overlay_total"
}


zram_status_json() {
	local mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 262144)"
	local mem_avail_kb="$(awk '/MemAvailable:/ {print $2; exit}' /proc/meminfo 2>/dev/null || awk '/MemFree:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	local mem_total_mb=$((mem_total_kb / 1024))
	local mem_avail_mb=$((mem_avail_kb / 1024))
	local cpu_cores="$(grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 1)"
	[ "$cpu_cores" -ge 1 ] 2>/dev/null || cpu_cores=1
	local cpu_arch="$(uname -m 2>/dev/null || echo 'generic')"
	local is_low_end_mips=0
	case "$cpu_arch" in
		mips*) [ "$cpu_cores" -le 1 ] && is_low_end_mips=1 ;;
	esac

	local supported=0
	if [ -b /dev/zram0 ] || [ -d /sys/module/zram ] || [ -f "/lib/modules/$(uname -r 2>/dev/null)/zram.ko" ] || apk list -I 2>/dev/null | grep -q kmod-zram || opkg list-installed 2>/dev/null | grep -q kmod-zram; then
		supported=1
	fi

	local active=0
	local zram_size_mb=0
	local zram_used_mb=0
	if grep -q zram /proc/swaps 2>/dev/null; then
		active=1
		local swap_line="$(grep zram /proc/swaps 2>/dev/null | head -n 1)"
		local swap_size_kb="$(echo "$swap_line" | awk '{print $3}')"
		local swap_used_kb="$(echo "$swap_line" | awk '{print $4}')"
		[ -n "$swap_size_kb" ] && zram_size_mb=$((swap_size_kb / 1024))
		[ -n "$swap_used_kb" ] && zram_used_mb=$((swap_used_kb / 1024))
	fi

	local is_high_ram=0
	[ "$mem_total_mb" -ge 512 ] && is_high_ram=1

	local is_low_ram=0
	[ "$mem_total_mb" -le 256 ] && is_low_ram=1

	local recommendation="recommended"
	if [ "$is_high_ram" = 1 ]; then
		recommendation="unnecessary"
	elif [ "$is_low_end_mips" = 1 ]; then
		recommendation="caution_weak_cpu"
	fi

	local swappiness="$(sysctl -n vm.swappiness 2>/dev/null || echo 60)"

	printf '{"supported":%s,"active":%s,"mem_total_mb":%d,"mem_avail_mb":%d,"cpu_cores":%d,"is_low_end_mips":%s,"is_high_ram":%s,"is_low_ram":%s,"recommendation":"%s","zram_size_mb":%d,"zram_used_mb":%d,"swappiness":%d}\n' \
		"$(bool "$supported")" "$(bool "$active")" "$mem_total_mb" "$mem_avail_mb" "$cpu_cores" "$(bool "$is_low_end_mips")" "$(bool "$is_high_ram")" "$(bool "$is_low_ram")" "$recommendation" "$zram_size_mb" "$zram_used_mb" "$swappiness"
}

zram_toggle() {
	local state="${1:-0}"
	case "$state" in 1|true) state=1 ;; *) state=0 ;; esac
	local mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 262144)"
	local cpu_cores="$(grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 1)"
	local cpu_arch="$(uname -m 2>/dev/null || echo 'generic')"
	local is_low_end_mips=0
	case "$cpu_arch" in
		mips*) [ "$cpu_cores" -le 1 ] && is_low_end_mips=1 ;;
	esac

	if [ "$state" = 1 ]; then
		if ! grep -q zram /proc/swaps 2>/dev/null; then
			modprobe zram num_devices=1 2>/dev/null || true
			if [ -b /dev/zram0 ]; then
				echo lz4 > /sys/block/zram0/comp_algorithm 2>/dev/null || echo zstd > /sys/block/zram0/comp_algorithm 2>/dev/null || true
				local zram_size_bytes=$((mem_total_kb * 1024 / 2))
				if [ "$is_low_end_mips" = 1 ] && [ "$zram_size_bytes" -gt 33554432 ]; then
					zram_size_bytes=33554432
				fi
				echo $zram_size_bytes > /sys/block/zram0/disksize 2>/dev/null || true
				mkswap /dev/zram0 >/dev/null 2>&1 || true
				swapon -p 10 /dev/zram0 >/dev/null 2>&1 || true
			fi
		fi

		if [ "$is_low_end_mips" = 1 ]; then
			sysctl -q -w vm.swappiness=15 2>/dev/null || true
		else
			sysctl -q -w vm.swappiness=60 2>/dev/null || true
		fi

		uci -q set equipe_perf.settings.zram_enabled='1'
		uci commit equipe_perf 2>/dev/null || true
	else
		if grep -q zram /proc/swaps 2>/dev/null; then
			swapoff /dev/zram0 2>/dev/null || true
			echo 1 > /sys/block/zram0/reset 2>/dev/null || true
		fi
		uci -q set equipe_perf.settings.zram_enabled='0'
		uci commit equipe_perf 2>/dev/null || true
	fi
	rm -f /tmp/ark-features.cache /tmp/ark-perf-cache.ts 2>/dev/null || true
	echo ok
}

# -------------------------------------------------------------
# SUBSISTEMA DE HORÁRIO, NTP INTELIGENTE & FAKE RTC CLOCK PRESERVER
# -------------------------------------------------------------

get_ntp_status() {
	local s
	local cur_date="$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo '')"
	local cur_epoch="$(date +%s 2>/dev/null || echo 0)"
	local cur_tz="$(uci -q get system.@system[0].timezone || echo 'UTC')"
	local cur_zone="$(uci -q get system.@system[0].zonename || echo 'UTC')"
	local ntp_enabled="$(uci -q get system.ntp.enabled || echo 1)"
	local ntp_server="$(uci -q get system.ntp.enable_server || echo 0)"
	local intercept_enabled="$(uci -q get firewall.ark_ntp_intercept.enabled || echo 0)"

	local clock_saved=false
	if [ -f /etc/ark-clock.epoch ]; then
		clock_saved=true
	fi

	local servers=""
	local s_first=1
	for s in $(uci -q get system.ntp.server); do
		[ "$s_first" = 1 ] && s_first=0 || servers="$servers,"
		servers="$servers\"$(json_escape "$s")\""
	done

	cat <<EOF
{
  "date_formatted": "$(json_escape "$cur_date")",
  "epoch": $cur_epoch,
  "timezone": "$(json_escape "$cur_tz")",
  "zonename": "$(json_escape "$cur_zone")",
  "ntp_enabled": $([ "$ntp_enabled" = "1" ] && echo true || echo false),
  "server_active": $([ "$ntp_server" = "1" ] && echo true || echo false),
  "intercept_active": $([ "$intercept_enabled" = "1" ] && echo true || echo false),
  "clock_preserver_active": $clock_saved,
  "servers": [$servers]
}
EOF
}

ntp_sync_browser() {
	local target_epoch="$1"
	local target_tz_name="$2"
	local target_offset_min="$3"

	case "$target_epoch" in
		''|*[!0-9]*) ;;
		*)
			if [ "$target_epoch" -ge 1735689600 ]; then
				date -u -s "@$target_epoch" >/dev/null 2>&1 || true
				mkdir -p /etc
				printf '%s\n' "$target_epoch" > /etc/ark-clock.epoch
			fi
			;;
	esac

	if [ -n "$target_tz_name" ]; then
		local posix_tz=""
		case "$target_tz_name" in
			America/Sao_Paulo|America/Fortaleza|America/Recife|America/Bahia|America/Belem|America/Maceio|America/Araguaina)
				posix_tz="<-03>3"
				target_tz_name="America/Sao_Paulo"
				;;
			America/Manaus|America/Cuiaba|America/Campo_Grande|America/Porto_Velho|America/Boa_Vista)
				posix_tz="<-04>4"
				;;
			America/Rio_Branco)
				posix_tz="<-05>5"
				;;
			America/Noronha)
				posix_tz="<-02>2"
				;;
			UTC|Etc/UTC)
				posix_tz="UTC"
				;;
			*)
				if [ -n "$target_offset_min" ]; then
					case "$target_offset_min" in
						''|*[!0-9-]*) ;;
						*)
							local offset_hours=$((target_offset_min / 60))
							if [ "$offset_hours" -gt 0 ]; then
								posix_tz="<-0${offset_hours}>${offset_hours}"
							elif [ "$offset_hours" -lt 0 ]; then
								local pos_hours=$(( -offset_hours ))
								posix_tz="<+0${pos_hours}>-${pos_hours}"
							else
								posix_tz="UTC"
							fi
							;;
					esac
				fi
				;;
		esac

		if [ -n "$posix_tz" ]; then
			uci -q set system.@system[0].zonename="$target_tz_name"
			uci -q set system.@system[0].timezone="$posix_tz"
			uci commit system
		fi
	fi

	echo 'ok'
}

ntp_configure_smart() {
	uci -q set system.ntp=timeserver
	uci -q set system.ntp.enabled='1'
	uci -q set system.ntp.enable_server='1'
	uci -q delete system.ntp.server
	uci add_list system.ntp.server='a.st1.ntp.br'
	uci add_list system.ntp.server='b.st1.ntp.br'
	uci add_list system.ntp.server='time.cloudflare.com'
	uci add_list system.ntp.server='time.google.com'
	uci commit system

	uci -q delete firewall.ark_ntp_intercept
	uci set firewall.ark_ntp_intercept=redirect
	uci set firewall.ark_ntp_intercept.name='Interceptar NTP UDP 123'
	uci set firewall.ark_ntp_intercept.src='lan'
	uci set firewall.ark_ntp_intercept.proto='udp'
	uci set firewall.ark_ntp_intercept.src_dport='123'
	uci set firewall.ark_ntp_intercept.dest_port='123'
	uci set firewall.ark_ntp_intercept.target='DNAT'
	uci set firewall.ark_ntp_intercept.enabled='1'
	uci commit firewall

	if [ -x /etc/init.d/ark-clock-preserver ]; then
		/etc/init.d/ark-clock-preserver enable >/dev/null 2>&1 || true
		/etc/init.d/ark-clock-preserver start >/dev/null 2>&1 || true
	fi

	(
		/etc/init.d/sysntpd restart >/dev/null 2>&1 || true
		if command -v fw4 >/dev/null 2>&1; then
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
		elif command -v fw3 >/dev/null 2>&1; then
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
		fi
	) &

	echo 'ok'
}

ntp_intercept_toggle() {
	local state="$1"
	case "$state" in
		1|true) state=1 ;;
		*) state=0 ;;
	esac

	uci -q set "firewall.ark_ntp_intercept.enabled=$state"
	uci commit firewall

	if command -v fw4 >/dev/null 2>&1 || command -v fw3 >/dev/null 2>&1; then
		/etc/init.d/firewall reload >/dev/null 2>&1 || true
	fi

	echo 'ok'
}

time_save_clock() {
	local cur_epoch="$(date +%s 2>/dev/null || echo 0)"
	local cur_year="$(date +%Y 2>/dev/null || echo 0)"
	case "$cur_epoch" in ''|*[!0-9]*) cur_epoch=0 ;; esac
	case "$cur_year" in ''|*[!0-9]*) cur_year=0 ;; esac
	if [ "$cur_year" -ge 2025 ] && [ "$cur_epoch" -ge 1735689600 ]; then
		mkdir -p /etc
		printf '%s\n' "$cur_epoch" > /etc/ark-clock.epoch
		echo 'ok'
	else
		echo 'clock_invalid'
	fi
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
		rm -f /tmp/ark-perf-cache.ts 2>/dev/null || true
		system_perf_save "$@"
		;;
	ram-purge-now)
		sync
		echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
		rm -f /tmp/ark-perf-cache.ts 2>/dev/null || true
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
	upnp-status)
		local upnp_enabled="$(uci -q get upnpd.config.enabled || echo 0)"
		local upnp_running=0
		pidof miniupnpd >/dev/null 2>&1 && upnp_running=1
		printf '{"enabled":%s,"running":%s}\n' "$([ "$upnp_enabled" = 1 ] && echo true || echo false)" "$([ "$upnp_running" = 1 ] && echo true || echo false)"
		;;
	upnp-toggle)
		shift
		local state="${1:-0}"
		case "$state" in 1|true) state=1 ;; *) state=0 ;; esac
		if [ "$state" = 1 ]; then
			uci -q set upnpd.config.enabled='1'
			uci -q set upnpd.config.enable_upnp='1'
			uci -q set upnpd.config.enable_natpmp='1'
			[ "$(uci -q get upnpd.config.use_stun)" = "1" ] || uci -q set upnpd.config.use_stun='1'
			[ -n "$(uci -q get upnpd.config.stun_host)" ] || uci -q set upnpd.config.stun_host='stun.cloudflare.com'
			uci commit upnpd 2>/dev/null || true
			[ -x /etc/init.d/miniupnpd ] && { /etc/init.d/miniupnpd enable >/dev/null 2>&1 || true; /etc/init.d/miniupnpd restart >/dev/null 2>&1 || true; }
		else
			uci -q set upnpd.config.enabled='0'
			uci -q set upnpd.config.enable_upnp='0'
			uci -q set upnpd.config.enable_natpmp='0'
			uci commit upnpd 2>/dev/null || true
			[ -x /etc/init.d/miniupnpd ] && { /etc/init.d/miniupnpd stop >/dev/null 2>&1 || true; /etc/init.d/miniupnpd disable >/dev/null 2>&1 || true; }
		fi
		echo ok
		;;
	zram-status)
		zram_status_json
		;;
	zram-toggle)
		shift
		zram_toggle "$@"
		;;
	dns-turbo-status)
		dns_turbo_status_json
		;;
	dns-turbo-save)
		shift
		rm -f /tmp/ark-perf-cache.ts 2>/dev/null || true
		dns_turbo_save "$@"
		;;
	dns-turbo-doh)
		shift
		rm -f /tmp/ark-perf-cache.ts 2>/dev/null || true
		dns_turbo_doh_toggle "$@"
		;;
	network-capacity-status)
		network_capacity_status_json
		;;
	network-capacity-save)
		shift
		network_capacity_save "$@"
		;;
	system-processes-telemetry)
		system_processes_telemetry
		;;
	system-memory-purge)
		rm -f /tmp/ark-perf-cache.ts 2>/dev/null || true
		system_memory_purge
		;;
	system-storage-purge)
		system_storage_purge
		;;
	hardware-tune)
		if [ -x /etc/init.d/ark-hardware-tune ]; then
			/etc/init.d/ark-hardware-tune start
		fi
		printf '{"ok":true,"message":"Hardware tuning applied"}\n'
		;;
	fast-targets)
		count="${2:-8}"
		target_wan="${3:-}"
		token="YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm"
		source_ip=""
		if [ -n "$target_wan" ]; then
			source_ip="$(ubus call "network.interface.$target_wan" status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null || true)"
		fi
		fast_meta=""
		if [ -n "$source_ip" ] && command -v curl >/dev/null 2>&1; then
			fast_meta="$(curl -s --interface "$source_ip" --max-time 4 "https://api.fast.com/netflix/speedtest/v2?https=true&token=${token}&urlCount=${count}" 2>/dev/null || true)"
		fi
		if [ -z "$fast_meta" ]; then
			bind_arg=""
			[ -n "$source_ip" ] && bind_arg="--bind-address=$source_ip"
			fast_meta="$(wget $bind_arg -T 4 -qO- --no-check-certificate "https://api.fast.com/netflix/speedtest/v2?https=true&token=${token}&urlCount=${count}" 2>/dev/null || true)"
		fi
		if [ -z "$fast_meta" ]; then
			fast_meta="$(wget -T 4 -qO- --no-check-certificate "https://api.fast.com/netflix/speedtest/v2?https=true&token=${token}&urlCount=${count}" 2>/dev/null || true)"
		fi
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
	asu-check-status)
		val="$(uci -q get attendedsysupgrade.client.login_check_for_upgrades || echo '0')"
		case "$val" in
			1) printf '{"enabled":true,"status":"enabled"}\n' ;;
			*) printf '{"enabled":false,"status":"disabled"}\n' ;;
		esac
		;;
	asu-check-toggle)
		case "$2" in 0|1) ;; *) echo 'Preferencia invalida' >&2; exit 2 ;; esac
		mkdir -p /etc/config
		[ -f /etc/config/attendedsysupgrade ] || touch /etc/config/attendedsysupgrade
		uci -q set "attendedsysupgrade.client=client"
		uci -q set "attendedsysupgrade.client.login_check_for_upgrades=$2"
		uci commit attendedsysupgrade
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
	led-detect-topology)
		ark_led_detect_topology
		;;
	led-calibrate-curves)
		ark_led_calibrate_curves
		echo 'ok'
		;;
	set-led-effect)
		ark_led_set_effect "$2" "$3" "$4" "$5"
		;;
	set-led-speed)
		ark_led_set_speed "$2"
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
	transmission-harden)
		ark_harden_transmission_config
		echo ok
		;;
	transmission-audit)
		cfg="/etc/config/transmission"
		[ -n "${ARK_ROOT}" ] && cfg="${ARK_ROOT}/etc/config/transmission"
		if [ ! -f "$cfg" ]; then
			printf '{"installed":false}\n'
		else
			port_fwd="$(uci -q ${ARK_ROOT:+-c "$ARK_ROOT/etc/config"} get transmission.@transmission[0].port_forwarding_enabled || echo 1)"
			enc="$(uci -q ${ARK_ROOT:+-c "$ARK_ROOT/etc/config"} get transmission.@transmission[0].encryption || echo 0)"
			lpd="$(uci -q ${ARK_ROOT:+-c "$ARK_ROOT/etc/config"} get transmission.@transmission[0].lpd_enabled || echo 1)"
			utp="$(uci -q ${ARK_ROOT:+-c "$ARK_ROOT/etc/config"} get transmission.@transmission[0].utp_enabled || echo true)"
			p_torrent="$(uci -q ${ARK_ROOT:+-c "$ARK_ROOT/etc/config"} get transmission.@transmission[0].peer_limit_per_torrent || echo 250)"
			printf '{"installed":true,"port_forwarding_enabled":"%s","encryption":"%s","lpd_enabled":"%s","utp_enabled":"%s","peer_limit_per_torrent":"%s"}\n' "$port_fwd" "$enc" "$lpd" "$utp" "$p_torrent"
		fi
		;;
	safe-storage-reboot)
		ark_safe_storage_reboot
		echo ok
		;;
	ntp-status)
		get_ntp_status
		;;
	ntp-sync-browser)
		ntp_sync_browser "$2" "$3" "$4"
		;;
	ntp-configure-smart)
		ntp_configure_smart
		;;
	ntp-intercept-toggle)
		ntp_intercept_toggle "$2"
		;;
	time-save-clock|clock-save)
		time_save_clock
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
