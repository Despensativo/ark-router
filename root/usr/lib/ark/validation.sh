#!/bin/sh
# /usr/lib/ark/validation.sh - ARK Router Input & Syntax Validation Library
# Strict POSIX BusyBox ash compliant validation for networking, IPs, MACs and rates.

[ -z "${_ARK_VALIDATION_SH_LOADED:-}" ] || return 0
_ARK_VALIDATION_SH_LOADED=1

valid_mac() {
	printf '%s' "$1" | grep -Eq '^([0-9A-F]{2}:){5}[0-9A-F]{2}$'
}

valid_mac_anycase() {
	printf '%s' "$1" | grep -Eq '^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$'
}

device_suffix() {
	printf '%s' "$1" | tr -d ':' | tr 'A-F' 'a-f'
}

valid_ipv4() {
	printf '%s\n' "$1" | awk -F. 'NF == 4 { for (i=1;i<=4;i++) if ($i !~ /^[0-9]+$/ || $i < 0 || $i > 255) exit 1; exit 0 } { exit 1 }'
}

valid_ipv6() {
	printf '%s' "$1" | grep -Eq '^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$'
}

valid_ip() {
	valid_ipv4 "$1" || valid_ipv6 "$1"
}

ipv4_prefix24() {
	printf '%s\n' "$1" | awk -F. 'NF == 4 { printf "%s.%s.%s", $1, $2, $3 }'
}

ipv4_host() {
	printf '%s\n' "$1" | awk -F. 'NF == 4 { print $4 }'
}

valid_lan_dhcp_range() {
	router_ip="$1"; netmask="$2"; start_ip="$3"; end_ip="$4"
	valid_ipv4 "$router_ip" && valid_ipv4 "$netmask" && valid_ipv4 "$start_ip" && valid_ipv4 "$end_ip" || return 1
	[ "$netmask" = 255.255.255.0 ] || return 1
	router_prefix="$(ipv4_prefix24 "$router_ip")"; start_prefix="$(ipv4_prefix24 "$start_ip")"; end_prefix="$(ipv4_prefix24 "$end_ip")"
	[ "$router_prefix" = "$start_prefix" ] && [ "$router_prefix" = "$end_prefix" ] || return 1
	router_host="$(ipv4_host "$router_ip")"; start_host="$(ipv4_host "$start_ip")"; end_host="$(ipv4_host "$end_ip")"
	[ "$router_host" -ge 1 ] && [ "$router_host" -le 254 ] || return 1
	[ "$start_host" -ge 2 ] && [ "$start_host" -le 254 ] || return 1
	[ "$end_host" -ge 2 ] && [ "$end_host" -le 254 ] || return 1
	[ "$start_host" -le "$end_host" ] || return 1
	[ "$router_host" -lt "$start_host" ] || [ "$router_host" -gt "$end_host" ] || return 1
	return 0
}

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

valid_plain() {
	value="$1"; max="$2"
	[ "${#value}" -le "$max" ] || return 1
	! printf '%s' "$value" | grep -q '[[:cntrl:]]'
}

valid_wifi_password() {
	length="${#1}"
	[ "$length" -ge 8 ] && [ "$length" -le 63 ] && valid_plain "$1" 63
}

valid_ssid() {
	length="${#1}"
	[ "$length" -ge 1 ] && [ "$length" -le 32 ] && valid_plain "$1" 32
}

valid_uint_range() {
	printf '%s' "$1" | grep -Eq '^[0-9]+$' || return 1
	[ "$1" -ge "$2" ] && [ "$1" -le "$3" ]
}

valid_sqm_rate() {
	valid_uint_range "$1" 0 100000000
}

valid_net_device() {
	case "$1" in
		''|*/*|*..*|*[!A-Za-z0-9_.:-]*) return 1 ;;
	esac
	if [ "$1" = wan ] || [ -d "${ARK_ROOT}/sys/class/net/$1" ] || [ -d "/sys/class/net/$1" ]; then
		return 0
	fi
	case "$1" in
		pppoe-*) return 0 ;;
	esac
	if command -v is_swconfig >/dev/null 2>&1 && is_swconfig; then
		case "$1" in
			lan[1-5]|port[1-5]|[1-5]|eth0.[0-9]*) return 0 ;;
		esac
	fi
	return 1
}
