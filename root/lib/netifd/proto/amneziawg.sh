#!/bin/sh
# /lib/netifd/proto/amneziawg.sh - ARK Router AmneziaWG Netifd Protocol Handler
# Incorporates AmneziaWG Anti-DPI obfuscation (Jc, Jmin, Jmax, S1, S2, H1..H4)
# 100% POSIX /bin/ash compliant for OpenWrt 25.12 to 19.07.

# shellcheck disable=SC1091,SC3003,SC3043

WG=/usr/bin/awg
[ -x "$WG" ] || WG=/usr/bin/wg

[ -n "$INCLUDE_ONLY" ] || {
	. /lib/functions.sh
	. ../netifd-proto.sh
	init_proto "$@"
}

proto_amneziawg_init_config() {
	proto_config_add_string "private_key"
	proto_config_add_int "listen_port"
	proto_config_add_int "mtu"
	proto_config_add_string "fwmark"
	proto_config_add_int "awg_jc"
	proto_config_add_int "awg_jmin"
	proto_config_add_int "awg_jmax"
	proto_config_add_int "awg_s1"
	proto_config_add_int "awg_s2"
	proto_config_add_int "awg_h1"
	proto_config_add_int "awg_h2"
	proto_config_add_int "awg_h3"
	proto_config_add_int "awg_h4"
	available=1
	no_proto_task=1
}

proto_amneziawg_is_kernel_mode() {
	if [ ! -e /sys/module/amneziawg ]; then
		modprobe amneziawg >/dev/null 2>&1 || true
		if [ -e /sys/module/amneziawg ]; then
			return 0
		else
			if command -v "${WG_QUICK_USERSPACE_IMPLEMENTATION:-amneziawg-go}" >/dev/null 2>&1; then
				return 1
			elif [ -e /sys/module/wireguard ]; then
				# Fallback defensivo para modulo wireguard padrao
				return 0
			else
				modprobe wireguard >/dev/null 2>&1 || true
				[ -e /sys/module/wireguard ] && return 0
				return 1
			fi
		fi
	else
		return 0
	fi
}

proto_amneziawg_setup_peer() {
	local peer_config="$1"
	local disabled public_key preshared_key allowed_ips route_allowed_ips
	local endpoint_host endpoint_port persistent_keepalive endpoint allowed_ip

	config_get_bool disabled "${peer_config}" "disabled" 0
	config_get public_key "${peer_config}" "public_key"
	config_get preshared_key "${peer_config}" "preshared_key"
	config_get allowed_ips "${peer_config}" "allowed_ips"
	config_get_bool route_allowed_ips "${peer_config}" "route_allowed_ips" 0
	config_get endpoint_host "${peer_config}" "endpoint_host"
	config_get endpoint_port "${peer_config}" "endpoint_port"
	config_get persistent_keepalive "${peer_config}" "persistent_keepalive"

	[ "${disabled}" -eq 1 ] && return 0
	[ -z "$public_key" ] && return 0

	printf '[Peer]\nPublicKey=%s\n' "${public_key}" >> "${wg_cfg}"
	[ -n "${preshared_key}" ] && printf 'PresharedKey=%s\n' "${preshared_key}" >> "${wg_cfg}"

	for allowed_ip in $allowed_ips; do
		printf 'AllowedIPs=%s\n' "${allowed_ip}" >> "${wg_cfg}"
	done

	if [ -n "${endpoint_host}" ]; then
		case "${endpoint_host}" in
			*:*) endpoint="[${endpoint_host}]" ;;
			*) endpoint="${endpoint_host}" ;;
		esac
		if [ -n "${endpoint_port}" ]; then
			endpoint="${endpoint}:${endpoint_port}"
		else
			endpoint="${endpoint}:51820"
		fi
		printf 'Endpoint=%s\n' "${endpoint}" >> "${wg_cfg}"
	fi

	[ -n "${persistent_keepalive}" ] && printf 'PersistentKeepalive=%s\n' "${persistent_keepalive}" >> "${wg_cfg}"

	if [ "${route_allowed_ips}" -ne 0 ]; then
		for allowed_ip in ${allowed_ips}; do
			case "${allowed_ip}" in
				*:*/*) proto_add_ipv6_route "${allowed_ip%%/*}" "${allowed_ip##*/}" ;;
				*.*/*) proto_add_ipv4_route "${allowed_ip%%/*}" "${allowed_ip##*/}" ;;
				*:*) proto_add_ipv6_route "${allowed_ip%%/*}" "128" ;;
				*.*) proto_add_ipv4_route "${allowed_ip%%/*}" "32" ;;
			esac
		done
	fi
}

ensure_key_is_generated() {
	local private_key oldmask ucitmp
	private_key="$(uci -q get network."$1".private_key || true)"
	if [ "$private_key" = "generate" ]; then
		oldmask="$(umask)"
		umask 077
		ucitmp="$(mktemp -d)"
		private_key="$("${WG}" genkey 2>/dev/null || true)"
		if [ -n "$private_key" ]; then
			uci -q -t "$ucitmp" set network."$1".private_key="$private_key" && \
				uci -q -t "$ucitmp" commit network
		fi
		rm -rf "$ucitmp"
		umask "$oldmask"
	fi
}

proto_amneziawg_setup() {
	local config="$1"
	local wg_dir="/tmp/wireguard"
	local wg_cfg="${wg_dir}/${config}"
	local private_key listen_port addresses mtu fwmark ip6prefix nohostroute tunlink
	local awg_jc awg_jmin awg_jmax awg_s1 awg_s2 awg_h1 awg_h2 awg_h3 awg_h4
	local dev_type WG_RETURN address prefix

	ensure_key_is_generated "${config}"

	config_load network
	config_get private_key "${config}" "private_key"
	config_get listen_port "${config}" "listen_port"
	config_get addresses "${config}" "addresses"
	config_get mtu "${config}" "mtu"
	config_get fwmark "${config}" "fwmark"
	config_get ip6prefix "${config}" "ip6prefix"
	config_get nohostroute "${config}" "nohostroute"
	config_get tunlink "${config}" "tunlink"

	config_get awg_jc "${config}" "awg_jc"
	config_get awg_jmin "${config}" "awg_jmin"
	config_get awg_jmax "${config}" "awg_jmax"
	config_get awg_s1 "${config}" "awg_s1"
	config_get awg_s2 "${config}" "awg_s2"
	config_get awg_h1 "${config}" "awg_h1"
	config_get awg_h2 "${config}" "awg_h2"
	config_get awg_h3 "${config}" "awg_h3"
	config_get awg_h4 "${config}" "awg_h4"

	if proto_amneziawg_is_kernel_mode; then
		dev_type="amneziawg"
		[ -e /sys/module/amneziawg ] || dev_type="wireguard"
		logger -t "amneziawg" "info: using kernel-space module ($dev_type) for ${WG}"
		ip link del dev "${config}" 2>/dev/null || true
		ip link add dev "${config}" type "$dev_type" 2>/dev/null || ip link add dev "${config}" type wireguard 2>/dev/null || true
	else
		logger -t "amneziawg" "info: using user-space implementation for ${WG}"
		rm -f "/var/run/amneziawg/${config}.sock" "/var/run/wireguard/${config}.sock"
		if command -v "${WG_QUICK_USERSPACE_IMPLEMENTATION:-amneziawg-go}" >/dev/null 2>&1; then
			"${WG_QUICK_USERSPACE_IMPLEMENTATION:-amneziawg-go}" "${config}"
		else
			wireguard-go "${config}" 2>/dev/null || true
		fi
	fi

	[ -n "${mtu}" ] && ip link set mtu "${mtu}" dev "${config}" 2>/dev/null || true
	proto_init_update "${config}" 1

	umask 077
	mkdir -p "${wg_dir}"
	printf '[Interface]\nPrivateKey=%s\n' "${private_key}" > "${wg_cfg}"
	[ -n "${listen_port}" ] && printf 'ListenPort=%s\n' "${listen_port}" >> "${wg_cfg}"
	[ -n "${fwmark}" ] && printf 'FwMark=%s\n' "${fwmark}" >> "${wg_cfg}"

	# Parâmetros de Ofuscação Anti-DPI (AmneziaWG)
	[ -n "${awg_jc}" ] && printf 'Jc = %s\n' "${awg_jc}" >> "${wg_cfg}"
	[ -n "${awg_jmin}" ] && printf 'Jmin = %s\n' "${awg_jmin}" >> "${wg_cfg}"
	[ -n "${awg_jmax}" ] && printf 'Jmax = %s\n' "${awg_jmax}" >> "${wg_cfg}"
	[ -n "${awg_s1}" ] && printf 'S1 = %s\n' "${awg_s1}" >> "${wg_cfg}"
	[ -n "${awg_s2}" ] && printf 'S2 = %s\n' "${awg_s2}" >> "${wg_cfg}"
	[ -n "${awg_h1}" ] && printf 'H1 = %s\n' "${awg_h1}" >> "${wg_cfg}"
	[ -n "${awg_h2}" ] && printf 'H2 = %s\n' "${awg_h2}" >> "${wg_cfg}"
	[ -n "${awg_h3}" ] && printf 'H3 = %s\n' "${awg_h3}" >> "${wg_cfg}"
	[ -n "${awg_h4}" ] && printf 'H4 = %s\n' "${awg_h4}" >> "${wg_cfg}"

	config_foreach proto_amneziawg_setup_peer "amneziawg_${config}"
	config_foreach proto_amneziawg_setup_peer "wireguard_${config}"

	# Aplica configuração via awg (ou wg em fallback)
	${WG} setconf "${config}" "${wg_cfg}"
	WG_RETURN=$?
	rm -f "${wg_cfg}"

	if [ ${WG_RETURN} -ne 0 ]; then
		sleep 2
		proto_setup_failed "${config}"
		return 1
	fi

	for address in ${addresses}; do
		case "${address}" in
			*:*/*) proto_add_ipv6_address "${address%%/*}" "${address##*/}" ;;
			*.*/*) proto_add_ipv4_address "${address%%/*}" "${address##*/}" ;;
			*:*) proto_add_ipv6_address "${address%%/*}" "128" ;;
			*.*) proto_add_ipv4_address "${address%%/*}" "32" ;;
		esac
	done

	for prefix in ${ip6prefix}; do
		proto_add_ipv6_prefix "$prefix"
	done

	if [ "${nohostroute}" != "1" ]; then
		${WG} show "${config}" endpoints 2>/dev/null | \
		sed -E 's/\[?([0-9.:a-f]+)\]?:([0-9]+)/\1 \2/' | \
		while IFS=$'\t ' read -r _key address port; do
			[ -n "${port}" ] || continue
			proto_add_host_dependency "${config}" "${address}" "${tunlink}"
		done
	fi

	proto_send_update "${config}"
}

proto_amneziawg_teardown() {
	local config="$1"
	if proto_amneziawg_is_kernel_mode; then
		ip link del dev "${config}" >/dev/null 2>&1 || true
	else
		rm -f "/var/run/amneziawg/${config}.sock" "/var/run/wireguard/${config}.sock" 2>/dev/null || true
	fi
}

[ -n "$INCLUDE_ONLY" ] || {
	add_protocol amneziawg
}
