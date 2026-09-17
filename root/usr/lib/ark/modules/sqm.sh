#!/bin/sh
# /usr/lib/ark/modules/sqm.sh - ARK Router SQM / CAKE Quality of Service Module
# Strict POSIX BusyBox ash compliant module for Bufferbloat mitigation, CAKE, and IRQ Balance.

[ -z "${_ARK_SQM_SH_LOADED:-}" ] || return 0
_ARK_SQM_SH_LOADED=1

[ -n "${ARK_LIB_DIR}" ] || ARK_LIB_DIR="/usr/lib/ark"
[ -f "${ARK_LIB_DIR}/common.sh" ] && . "${ARK_LIB_DIR}/common.sh"
[ -f "${ARK_LIB_DIR}/logging.sh" ] && . "${ARK_LIB_DIR}/logging.sh"
[ -f "${ARK_LIB_DIR}/validation.sh" ] && . "${ARK_LIB_DIR}/validation.sh"
[ -f "${ARK_LIB_DIR}/modules/network.sh" ] && . "${ARK_LIB_DIR}/modules/network.sh"

get_system_hardware_sqm_audit() {
	local cpu_cores="$(grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 1)"
	[ "$cpu_cores" -ge 1 ] 2>/dev/null || cpu_cores=1
	local cpu_arch="$(uname -m 2>/dev/null || echo 'generic')"
	local is_mips=0
	case "$cpu_arch" in
		mips*) is_mips=1 ;;
	esac
	local is_low_end_mips=0
	local suggested_cut_off_mbps=850
	if [ "$is_mips" -eq 1 ] && [ "$cpu_cores" -le 1 ]; then
		is_low_end_mips=1
		suggested_cut_off_mbps=100
	elif [ "$is_mips" -eq 1 ]; then
		suggested_cut_off_mbps=250
	elif [ "$cpu_cores" -le 2 ]; then
		suggested_cut_off_mbps=350
	fi

	local fastpath_active="false"
	if [ "$(uci -q get firewall.@defaults[0].flow_offloading || echo 0)" = "1" ]; then
		fastpath_active="true"
	fi

	local cpu_model="$(awk -F': ' '/model name|machine|Hardware|Processor/{print $2; exit}' /proc/cpuinfo 2>/dev/null || echo '')"
	[ -n "$cpu_model" ] || cpu_model="$(cat /proc/device-tree/model 2>/dev/null | tr -d '\0' || cat /tmp/sysinfo/model 2>/dev/null || echo 'MIPS Processor')"

	printf '{"is_low_end_mips":%s,"cpu_arch":"%s","cpu_cores":%d,"cpu_model":"%s","suggested_cut_off_mbps":%d,"fastpath_active":%s}\n' \
		"$(bool "$is_low_end_mips")" "$cpu_arch" "$cpu_cores" "$(json_escape "$cpu_model")" "$suggested_cut_off_mbps" "$fastpath_active"
}

sqm_apply_upload_only() {
	if ark_is_satellite_or_ap; then
		echo "O controle de Bufferbloat (SQM/CAKE) é exclusivo do Roteador Mestre (Gateway). Desativado em modo Satélite/Ponto de Acesso." >&2
		exit 2
	fi
	local wan="${1:-wan}"
	local up_kbps="${2:-0}"
	[ -n "$up_kbps" ] && [ "$up_kbps" -gt 0 ] 2>/dev/null || { echo 'Velocidade de upload invalida' >&2; exit 2; }
	local sec=""
	for s in $(uci -q show sqm | grep '=queue' | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "sqm.$s.interface")" = "$wan" ]; then
			sec="$s"
			break
		fi
	done
	[ -n "$sec" ] || sec="ark_$wan"
	uci -q set "sqm.$sec=queue"
	uci -q set "sqm.$sec.interface=$wan"
	uci -q set "sqm.$sec.enabled=1"
	uci -q set "sqm.$sec.download=0"
	uci -q set "sqm.$sec.upload=$up_kbps"
	uci -q set "sqm.$sec.qdisc=cake"
	uci -q set "sqm.$sec.script=piece_of_cake.qos"
	uci -q set "sqm.$sec.eqdisc_opts=diffserv4 ack-filter memlimit 32M"
	uci commit sqm
	/etc/init.d/sqm restart >/dev/null 2>&1 || true
	echo 'ok'
}

ensure_qos_equipe() {
	[ -f /etc/config/qos_equipe ] && return 0
	{
		echo "config guest_limit 'guest'"
		echo "	option enabled '1'"
		echo "	option upload_kbps '1500'"
		echo "	option download_kbps '0'"
	} >/etc/config/qos_equipe
}

ensure_sqm_section() {
	section="$1"; device="$2"
	uci -q get "sqm.$section" >/dev/null 2>&1 || uci -q set "sqm.$section=queue"
	uci -q set "sqm.$section.interface=$device"
	[ -n "$(uci -q get "sqm.$section.qdisc")" ] || uci -q set "sqm.$section.qdisc=cake"
	[ -n "$(uci -q get "sqm.$section.script")" ] || uci -q set "sqm.$section.script=piece_of_cake.qos"
	[ -n "$(uci -q get "sqm.$section.qdisc_advanced")" ] || uci -q set "sqm.$section.qdisc_advanced=1"
	[ -n "$(uci -q get "sqm.$section.eqdisc_opts")" ] || uci -q set "sqm.$section.eqdisc_opts=diffserv4 nat dual-srchost ack-filter"
	[ -n "$(uci -q get "sqm.$section.iqdisc_opts")" ] || uci -q set "sqm.$section.iqdisc_opts=diffserv4 nat dual-dsthost ingress"
	[ -n "$(uci -q get "sqm.$section.linklayer")" ] || uci -q set "sqm.$section.linklayer=none"
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

apply_guest_tc_limit() {
	dev="$(guest_l3_device || true)"
	[ -n "$dev" ] || { echo 'Interface da rede visitante nao encontrada para aplicar limite.' >&2; return 1; }
	tc qdisc del dev "$dev" root 2>/dev/null || true
	tc qdisc del dev "$dev" ingress 2>/dev/null || true
	[ "$(uci -q get qos_equipe.guest.enabled || printf 0)" = 1 ] || return 0
	upload="$(uci -q get qos_equipe.guest.upload_kbps || printf 0)"
	download="$(uci -q get qos_equipe.guest.download_kbps || printf 0)"
	valid_sqm_rate "$upload" || upload=0
	valid_sqm_rate "$download" || download=0
	if [ "$download" -gt 0 ]; then
		tc qdisc replace dev "$dev" root tbf rate "${download}kbit" burst 64kbit latency 400ms 2>/tmp/ark-guest-tc-download.log || {
			cat /tmp/ark-guest-tc-download.log >&2
			return 1
		}
	fi
	if [ "$upload" -gt 0 ]; then
		tc qdisc add dev "$dev" ingress 2>/dev/null || true
		tc filter add dev "$dev" parent ffff: protocol ip u32 match ip src 0.0.0.0/0 police rate "${upload}kbit" burst 64kbit drop flowid :1 2>/tmp/ark-guest-tc-upload.log || {
			cat /tmp/ark-guest-tc-upload.log >&2
			return 1
		}
	fi
	echo "guest-limit-applied dev=$dev download=${download}kbit upload=${upload}kbit"
}

handle_sqm() {
	case "$1" in
	sqm-toggle)
		case "$2" in 0|1) ;; *) echo 'Estado SQM invalido' >&2; exit 2 ;; esac
		[ -f /etc/config/sqm ] || { echo 'SQM nao instalado' >&2; exit 3; }
		wan_count=0
		for network_section in $(active_wan_networks); do
			sqm_section="$(sqm_section_for_network "$network_section")" || continue
			wan_device="$(sqm_device_for_network "$network_section")"
			valid_net_device "$wan_device" || { echo "Dispositivo SQM invalido para $network_section" >&2; exit 2; }
			ensure_sqm_section "$sqm_section" "$wan_device"
			uci -q set "sqm.$sqm_section.enabled=$2"
			wan_count=$((wan_count + 1))
		done
		[ "$wan_count" -gt 0 ] || { echo 'Nenhuma WAN ativa encontrada' >&2; exit 3; }
		uci commit sqm
		/etc/init.d/sqm restart
		echo ok
		;;
	irqbalance-toggle)
		case "$2" in 0|1) ;; *) echo 'Estado do irqbalance invalido' >&2; exit 2 ;; esac
		installed irqbalance || { echo 'irqbalance nao instalado' >&2; exit 3; }
		uci -q set "irqbalance.irqbalance.enabled=$2"
		uci commit irqbalance
		if [ "$2" = 1 ]; then /etc/init.d/irqbalance enable; /etc/init.d/irqbalance restart
		else /etc/init.d/irqbalance stop; /etc/init.d/irqbalance disable
		fi
		echo ok
		;;
	sqm-save-v2)
		[ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ] || { echo 'SQM nao instalado' >&2; exit 3; }
		shift
		wan_count=0
		submitted_sections=' '
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				wan)
					[ "$(printf '%s' "$value" | awk -F'|' '{print NF}')" = 6 ] || { echo 'Perfil WAN SQM invalido' >&2; exit 2; }
					section="$(printf '%s' "$value" | cut -d '|' -f1)"; network_section="$(printf '%s' "$value" | cut -d '|' -f2)"; device="$(printf '%s' "$value" | cut -d '|' -f3)"; enabled="$(printf '%s' "$value" | cut -d '|' -f4)"; download="$(printf '%s' "$value" | cut -d '|' -f5)"; upload="$(printf '%s' "$value" | cut -d '|' -f6)"
					[ -n "$download" ] || download=0
					[ -n "$upload" ] || upload=0
					case "$section" in wan[0-9]*) ;; *) echo 'Secao SQM WAN invalida' >&2; exit 2 ;; esac
					case "$network_section" in wan|wan[0-9]*) ;; *) echo 'Interface logica WAN invalida' >&2; exit 2 ;; esac
					expected_section="$(sqm_section_for_network "$network_section")" || { echo 'Mapeamento SQM invalido' >&2; exit 2; }
					[ "$section" = "$expected_section" ] || { echo 'Secao SQM nao corresponde a WAN' >&2; exit 2; }
					[ "$(uci -q get "network.$network_section")" = interface ] || { echo "WAN $network_section nao configurada" >&2; exit 2; }
					case "$(uci -q get "network.$network_section.proto")" in dhcp|pppoe|static) ;; *) echo "WAN $network_section inativa" >&2; exit 2 ;; esac
					valid_net_device "$device" || { echo "Dispositivo SQM invalido para $network_section" >&2; exit 2; }
					expected_device="$(sqm_device_for_network "$network_section")"
					network_device="$(uci -q get "network.$network_section.device")"
					[ "$device" = "$expected_device" ] || [ "$device" = "$network_device" ] || [ "$device" = "$network_section" ] || { echo "Dispositivo SQM nao corresponde a $network_section" >&2; exit 2; }
					case "$enabled" in 0|1) ;; *) echo 'Estado SQM invalido' >&2; exit 2 ;; esac
					valid_sqm_rate "$download" && valid_sqm_rate "$upload" || { echo 'Velocidade SQM invalida' >&2; exit 2; }
					wan_count=$((wan_count + 1))
					case "$submitted_sections" in
						*" $section "*) ;;
						*) submitted_sections="${submitted_sections}${section} " ;;
					esac
					;;
				guest_download|guest_upload)
					[ -n "$value" ] || value=0
					valid_sqm_rate "$value" || { echo 'Velocidade visitante invalida' >&2; exit 2; }
					;;
				*) echo "Campo SQM invalido: $key" >&2; exit 2 ;;
			esac
		done
		[ "$wan_count" -gt 0 ] || { echo 'Nenhuma WAN enviada para o SQM' >&2; exit 2; }
		# Disable stale queues that belonged to WANs removed or converted back
		# to LAN. Otherwise SQM could keep shaping an old physical LAN device.
		for existing_section in $(uci -q show sqm 2>/dev/null | sed -n 's/^sqm\.\(wan[0-9]*\)=queue$/\1/p'); do
			case "$submitted_sections" in
				*" $existing_section "*) ;;
				*) uci -q set "sqm.$existing_section.enabled=0" ;;
			esac
		done
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				wan)
					section="$(printf '%s' "$value" | cut -d '|' -f1)"; device="$(printf '%s' "$value" | cut -d '|' -f3)"; enabled="$(printf '%s' "$value" | cut -d '|' -f4)"; download="$(printf '%s' "$value" | cut -d '|' -f5)"; upload="$(printf '%s' "$value" | cut -d '|' -f6)"
					[ -n "$download" ] || download=0
					[ -n "$upload" ] || upload=0
					ensure_sqm_section "$section" "$device"
					uci -q set "sqm.$section.enabled=$enabled"
					uci -q set "sqm.$section.download=$download"
					uci -q set "sqm.$section.upload=$upload"
					;;
				guest_upload)
					ensure_qos_equipe; uci -q set qos_equipe.guest=guest_limit; uci -q set qos_equipe.guest.enabled=1; [ -n "$value" ] || value=0; uci -q set "qos_equipe.guest.upload_kbps=$value"
					;;
				guest_download)
					ensure_qos_equipe; uci -q set qos_equipe.guest=guest_limit; uci -q set qos_equipe.guest.enabled=1; [ -n "$value" ] || value=0; uci -q set "qos_equipe.guest.download_kbps=$value"
					;;
			esac
		done
		uci commit sqm
		uci commit qos_equipe 2>/dev/null || true
		/etc/init.d/sqm restart
		apply_guest_tc_limit >/dev/null 2>&1 || true
		echo ok
		;;
	sqm-save)
		[ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ] || { echo 'SQM nao instalado' >&2; exit 3; }
		shift
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				wan1_enabled|wan2_enabled) case "$value" in 0|1) ;; *) echo 'Estado SQM invalido' >&2; exit 2 ;; esac ;;
				wan1_download|wan1_upload|wan2_download|wan2_upload|guest_download|guest_upload)
					[ -n "$value" ] || value=0
					valid_sqm_rate "$value" || { echo 'Velocidade SQM invalida' >&2; exit 2; }
					;;
				*) echo "Campo SQM invalido: $key" >&2; exit 2 ;;
			esac
		done
		ensure_sqm_section wan1 wan
		wan2_dev="$(uci -q get network.wan2.device || printf lan1)"
		ensure_sqm_section wan2 "$wan2_dev"
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				wan1_enabled) uci -q set "sqm.wan1.enabled=$value" ;;
				wan2_enabled) uci -q set "sqm.wan2.enabled=$value" ;;
				wan1_download) [ -n "$value" ] || value=0; uci -q set "sqm.wan1.download=$value" ;;
				wan1_upload) [ -n "$value" ] || value=0; uci -q set "sqm.wan1.upload=$value" ;;
				wan2_download) [ -n "$value" ] || value=0; uci -q set "sqm.wan2.download=$value" ;;
				wan2_upload) [ -n "$value" ] || value=0; uci -q set "sqm.wan2.upload=$value" ;;
				guest_upload)
					ensure_qos_equipe
					uci -q set qos_equipe.guest=guest_limit
					uci -q set qos_equipe.guest.enabled=1
					uci -q set "qos_equipe.guest.upload_kbps=$value"
					;;
				guest_download)
					ensure_qos_equipe
					uci -q set qos_equipe.guest=guest_limit
					uci -q set qos_equipe.guest.enabled=1
					uci -q set "qos_equipe.guest.download_kbps=$value"
					;;
			esac
		done
		uci commit sqm
		uci commit qos_equipe 2>/dev/null || true
		/etc/init.d/sqm restart
		apply_guest_tc_limit >/dev/null 2>&1 || true
		echo ok
		;;
	system-hardware-sqm-audit)
		get_system_hardware_sqm_audit
		;;
	sqm-apply-upload-only)
		shift
		sqm_apply_upload_only "$@"
		;;
	esac
}
