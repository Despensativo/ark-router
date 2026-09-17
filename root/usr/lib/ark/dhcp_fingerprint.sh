#!/bin/sh
# /usr/lib/ark/dhcp_fingerprint.sh - ARK Router DHCP Passive Fingerprint Hook
# Executed by dnsmasq on lease creation, update and expiration.
# Captures DHCP Option 60 (Vendor Class), Option 55 (Requested Options),
# Client ID, IP, MAC and Hostname without CPU polling or network scanning.
# Strict POSIX BusyBox ash compliant.

action="$1"
mac="$2"
ip="$3"
hostname="$4"

[ -n "$mac" ] || exit 0

clean_mac="$mac"
fp_dir="/tmp/ark_fp"

case "$action" in
	del)
		[ -d "$fp_dir" ] && rm -f "${fp_dir}/${clean_mac}" 2>/dev/null
		exit 0
		;;
	add|old)
		[ -d "$fp_dir" ] || mkdir -p "$fp_dir" 2>/dev/null || exit 0
		[ -w "$fp_dir" ] || exit 0
		target_file="${fp_dir}/${clean_mac}"
		tmp_file="${target_file}.tmp.$$"
		
		vendor_class="${DNSMASQ_VENDOR_CLASS:-}"
		opt55="${DNSMASQ_REQUESTED_OPTIONS:-}"
		client_id="${DNSMASQ_CLIENT_ID:-}"
		ts="$(date +%s 2>/dev/null || echo 0)"

		{
			printf 'mac=%s\n' "$clean_mac"
			printf 'ip=%s\n' "$ip"
			printf 'hostname=%s\n' "$hostname"
			printf 'vendor_class=%s\n' "$vendor_class"
			printf 'opt55=%s\n' "$opt55"
			printf 'client_id=%s\n' "$client_id"
			printf 'ts=%s\n' "$ts"
		} > "$tmp_file" 2>/dev/null && mv -f "$tmp_file" "$target_file" 2>/dev/null
		;;
esac

exit 0
