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

ark_has_cake_mq() {
	if [ -f "${ARK_ROOT:-}/sys/kernel/debug/cake_mq_capable" ] || [ -f "/sys/kernel/debug/cake_mq_capable" ]; then
		return 0
	fi
	if [ -z "${ARK_ROOT:-}" ]; then
		grep -qw "cake_mq" /proc/kallsyms 2>/dev/null && return 0
		tc qdisc add cake_mq help 2>&1 | grep -qi "cake" && return 0
	fi
	return 1
}

ark_has_auto_dscp() {
	if [ -f "${ARK_ROOT:-}/etc/nftables.d/15-ark-dscp-priority.nft" ] || \
	   [ -f "/etc/nftables.d/15-ark-dscp-priority.nft" ] || \
	   [ -f "${ARK_LIB_DIR:-/usr/lib/ark}/../../../etc/nftables.d/15-ark-dscp-priority.nft" ]; then
		return 0
	fi
	command -v is_fw3 >/dev/null 2>&1 && is_fw3 && return 0
	return 1
}

ark_has_ctinfo() {
	if [ -f "${ARK_ROOT:-}/sys/kernel/debug/ctinfo_capable" ] || [ -f "/sys/kernel/debug/ctinfo_capable" ]; then
		return 0
	fi
	if [ -z "${ARK_ROOT:-}" ]; then
		grep -qw "act_ctinfo" /proc/modules 2>/dev/null && return 0
		[ -f "/lib/modules/$(uname -r 2>/dev/null)/act_ctinfo.ko" ] && return 0
	fi
	return 1
}

ark_has_l4s_dscp() {
	local nft_path="${ARK_ROOT:-}/etc/nftables.d/15-ark-dscp-priority.nft"
	[ -f "$nft_path" ] || nft_path="/etc/nftables.d/15-ark-dscp-priority.nft"
	[ -f "$nft_path" ] || nft_path="${ARK_LIB_DIR:-/usr/lib/ark}/../../../etc/nftables.d/15-ark-dscp-priority.nft"
	if [ -f "$nft_path" ] && grep -q "ecn == ect1" "$nft_path" 2>/dev/null; then
		return 0
	fi
	return 1
}

ark_apply_ingress_voice_tin_filters() {
	local iface="$1"
	[ -n "${ARK_ROOT:-}" ] && return 0
	[ -n "$iface" ] && [ -d "/sys/class/net/$iface" ] || return 0
	local ifb_dev="ifb4${iface}"
	[ -d "/sys/class/net/$ifb_dev" ] || return 0

	local cake_handle p
	cake_handle="$(tc qdisc show dev "$ifb_dev" 2>/dev/null | awk '/qdisc cake/ {print $3; exit}')"
	[ -n "$cake_handle" ] || return 0

	[ -f "/lib/modules/$(uname -r 2>/dev/null)/act_skbedit.ko" ] && modprobe act_skbedit 2>/dev/null || true
	# NUNCA remover pref 10: o /usr/lib/sqm/layer_cake.qos (e piece_of_cake.qos) instala o filtro
	# 'prio 10 u32 match u32 0 0 flowid 1:1 action mirred egress redirect dev ifb4*' exatamente em pref 10!
	for p in 1 2 3 4 5 6 7 8 9; do
		tc filter del dev "$iface" parent ffff: pref "$p" 2>/dev/null || true
	done
	# Classify incoming ICMP, ICMPv6, TCP SYN, interactive TCP PSH (<=255B: WebSocket latency probes/SSH),
	# small UDP (<=255B: Gaming/VoIP/DNS/STUN), and L4S ECT(1) (<=512B) into CAKE Voice Tin (${cake_handle}4) before prio 10 IFB redirect
	tc filter add dev "$iface" parent ffff: protocol ip pref 1 u32 match ip protocol 1 0xff action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	tc filter add dev "$iface" parent ffff: protocol ipv6 pref 2 u32 match ip6 protocol 58 0xff action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	tc filter add dev "$iface" parent ffff: protocol ip pref 3 u32 match ip protocol 6 0xff match u8 0x02 0x02 at 33 action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	tc filter add dev "$iface" parent ffff: protocol ipv6 pref 4 u32 match ip6 protocol 6 0xff match u8 0x02 0x02 at 53 action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	tc filter add dev "$iface" parent ffff: protocol ip pref 5 u32 match ip protocol 6 0xff match u16 0x0000 0xff00 at 2 match u8 0x08 0x08 at 33 action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	tc filter add dev "$iface" parent ffff: protocol ipv6 pref 6 u32 match ip6 protocol 6 0xff match u16 0x0000 0xff00 at 4 match u8 0x08 0x08 at 53 action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	tc filter add dev "$iface" parent ffff: protocol ip pref 7 u32 match ip protocol 17 0xff match u16 0x0000 0xff00 at 2 action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	tc filter add dev "$iface" parent ffff: protocol ipv6 pref 8 u32 match ip6 protocol 17 0xff match u16 0x0000 0xff00 at 4 action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	# L4S (RFC 9332) ECT(1) interactive packets (<= 512B, TOS/Traffic Class ECN bits 0x01) -> CAKE Voice Tin
	tc filter add dev "$iface" parent ffff: protocol ip pref 7 u32 match u8 0x01 0x03 at 1 match u16 0x0000 0xfe00 at 2 action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	tc filter add dev "$iface" parent ffff: protocol ipv6 pref 8 u32 match u16 0x0010 0x0030 at 0 match u16 0x0000 0xfe00 at 4 action skbedit priority "${cake_handle}4" continue 2>/dev/null || true
	# Restore bidirectional Conntrack DSCP (0x80 valid bit | 6-bit DSCP in ct mark lower byte) before prio 10 IFB redirect
	if ark_has_ctinfo; then
		[ -f "/lib/modules/$(uname -r 2>/dev/null)/act_ctinfo.ko" ] && modprobe act_ctinfo 2>/dev/null || true
		tc filter add dev "$iface" parent ffff: protocol all pref 9 u32 match u32 0 0 action ctinfo dscp 0x0000003f 0x00000080 continue 2>/dev/null || true
	fi
	# Autocura do redirecionamento prio 10 (mirred egress redirect dev ifb4*) caso tenha sido removido ou sobrescrito
	if ! tc filter show dev "$iface" parent ffff: 2>/dev/null | grep -q "mirred.*$ifb_dev"; then
		tc filter del dev "$iface" parent ffff: pref 10 2>/dev/null || true
		tc filter del dev "$iface" parent ffff: pref 11 2>/dev/null || true
		tc filter add dev "$iface" parent ffff: protocol all prio 10 u32 \
			match u32 0 0 flowid 1:1 action mirred egress redirect dev "$ifb_dev" 2>/dev/null || true
	fi
}

ark_promote_cake_mq() {
	local state_file="${ARK_ROOT:-}/tmp/ark_sqm_cake_mq.state"
	local ifb_q ndev pppoe_phys cpu_cores rps_mask
	mkdir -p "$(dirname "$state_file")" 2>/dev/null || true
	rm -f "$state_file" 2>/dev/null || true

	if [ -z "${ARK_ROOT:-}" ]; then
		for ifb_q in /sys/class/net/ifb*/queues/rx-*/rps_cpus /sys/class/net/br-*/queues/rx-*/rps_cpus /sys/class/net/eth*/queues/rx-*/rps_cpus; do
			[ -w "$ifb_q" ] && echo 0 > "$ifb_q" 2>/dev/null || true
		done
		if ls /sys/class/net/pppoe-* >/dev/null 2>&1; then
			cpu_cores="$(grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 1)"
			rps_mask="f"
			command -v ark_calculate_rps_mask >/dev/null 2>&1 && rps_mask="$(ark_calculate_rps_mask "$cpu_cores")"
			if [ "$cpu_cores" = "4" ] && grep -qE "mt76|mt79|ath|qca" /proc/interrupts 2>/dev/null; then
				rps_mask="2"
				for ifb_q in /sys/class/net/lan[0-9]*/queues/rx-*/rps_cpus /sys/class/net/phy*/queues/rx-*/rps_cpus; do
					[ -w "$ifb_q" ] && echo 1 > "$ifb_q" 2>/dev/null || true
				done
			fi
			for ifb_q in /sys/class/net/pppoe*/queues/rx-*/rps_cpus; do
				[ -w "$ifb_q" ] && echo "$rps_mask" > "$ifb_q" 2>/dev/null || true
			done
			pppoe_phys="$(uci -q get network.wan.device || uci -q get network.wan.ifname || uci -q get network.wan1.device || echo '')"
			if [ -n "$pppoe_phys" ]; then
				for ifb_q in "/sys/class/net/$pppoe_phys"/queues/rx-*/rps_cpus; do
					[ -w "$ifb_q" ] && echo 0 > "$ifb_q" 2>/dev/null || true
				done
			fi
		fi
		if command -v ethtool >/dev/null 2>&1; then
			for ndev in /sys/class/net/*; do
				ndev="${ndev##*/}"
				[ "$ndev" = "lo" ] && continue
				ethtool -K "$ndev" rx-gro-list off 2>/dev/null || true
			done
		fi
	fi

	uci -q show sqm 2>/dev/null | grep -q "\.enabled='1'" || return 0

	local sec enabled qdisc iface upload linklayer overhead mpu eq_opts tx1_dir promoted=0
	for sec in $(uci -q show sqm 2>/dev/null | sed -n 's/^sqm\.\([^.=]*\)=queue$/\1/p'); do
		enabled="$(uci -q get "sqm.$sec.enabled" || echo 0)"
		[ "$enabled" = "1" ] || continue
		qdisc="$(uci -q get "sqm.$sec.qdisc" || echo cake)"
		[ "$qdisc" = "cake" ] || [ "$qdisc" = "cake_mq" ] || continue
		iface="$(uci -q get "sqm.$sec.interface")"
		[ -n "$iface" ] || continue
		if [ -z "${ARK_ROOT:-}" ]; then
			ip link set dev "$iface" txqueuelen 1000 gro_max_size 16384 gro_ipv4_max_size 16384 2>/dev/null || true
			ip link set dev "ifb4${iface}" txqueuelen 1000 gro_max_size 16384 gro_ipv4_max_size 16384 2>/dev/null || true
			tc qdisc change dev "$iface" root cake no-split-gso 2>/dev/null || true
			tc qdisc change dev "ifb4${iface}" root cake no-split-gso 2>/dev/null || true
		fi
		ark_apply_ingress_voice_tin_filters "$iface"
		ark_has_cake_mq || continue
		upload="$(uci -q get "sqm.$sec.upload" || echo 0)"
		[ "$upload" -gt 0 ] 2>/dev/null || continue

		# NUNCA ativar cake_mq em IFB virtual (ifb4*) ou tunel PPPoE mono-fila:
		# no kernel 6.12, cake_mq + ingress em IFB virtual zera capacity estimate (0bit)
		# e causa ~9% de drops/ECN marks prematuros (limitando Fast.com a ~88 Mbps).
		# Promover exclusivamente em NICs fisicas multi-fila reais (queues/tx-1).
		tx1_dir="${ARK_ROOT:-}/sys/class/net/${iface}/queues/tx-1"
		[ -d "$tx1_dir" ] || tx1_dir="/sys/class/net/${iface}/queues/tx-1"
		[ -d "$tx1_dir" ] || continue

		linklayer="$(uci -q get "sqm.$sec.linklayer" || echo ethernet)"
		overhead="$(uci -q get "sqm.$sec.overhead" || echo 18)"
		mpu="$(uci -q get "sqm.$sec.tcMPU" || uci -q get "sqm.$sec.mpu" || echo 64)"
		eq_opts="$(uci -q get "sqm.$sec.eqdisc_opts")"

		# Substitui a qdisc root cake mono-fila por cake_mq multi-core preservando parametros do Waveform A+
		if [ -n "${ARK_ROOT:-}" ]; then
			printf '%s\n' "$iface" >> "$state_file"
			promoted=$((promoted + 1))
		else
			# shellcheck disable=SC2086
			if tc qdisc replace dev "$iface" root cake_mq bandwidth "${upload}kbit" "$linklayer" overhead "$overhead" mpu "$mpu" $eq_opts 2>/dev/null; then
				printf '%s\n' "$iface" >> "$state_file"
				promoted=$((promoted + 1))
			fi
		fi
	done
	return 0
}

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

	local hw_flowoffload_capable=0
	if [ -d /sys/kernel/debug/ppe0 ] || [ -d /sys/kernel/debug/ppe1 ] || [ -f /sys/kernel/debug/ppe/offload_stats ] || [ -d /sys/devices/platform/soc/*ppe* ]; then
		hw_flowoffload_capable=1
	fi

	local hw_flowoffload_active=0
	if [ "$(uci -q get firewall.@defaults[0].flow_offloading_hw || echo 0)" = "1" ]; then
		hw_flowoffload_active=1
	fi

	local cpu_model="$(awk -F': ' '/model name|machine|Hardware|Processor/{print $2; exit}' /proc/cpuinfo 2>/dev/null || echo '')"
	[ -n "$cpu_model" ] || cpu_model="$(cat /proc/device-tree/model 2>/dev/null | tr -d '\0' || cat /tmp/sysinfo/model 2>/dev/null || echo 'MIPS Processor')"
	local cake_memlimit="$(ark_cake_memlimit)"
	local waveform_aplus=1
	if [ "$(uci -q get equipe_dashboard.settings.waveform_aplus_mode)" = "0" ]; then
		waveform_aplus=0
	elif uci -q show sqm 2>/dev/null | grep -q "\.waveform_aplus='0'"; then
		waveform_aplus=0
	fi

	local cake_mq_capable=0
	ark_has_cake_mq && cake_mq_capable=1
	local cake_mq_active=0
	if [ -s "${ARK_ROOT:-}/tmp/ark_sqm_cake_mq.state" ] || [ -s "/tmp/ark_sqm_cake_mq.state" ]; then
		cake_mq_active=1
	fi
	local auto_dscp_active=0
	ark_has_auto_dscp && auto_dscp_active=1
	local ctinfo_capable=0
	ark_has_ctinfo && ctinfo_capable=1
	local l4s_active=0
	ark_has_l4s_dscp && l4s_active=1
	local autorate_enabled=0
	[ "$(uci -q get equipe_dashboard.settings.sqm_autorate 2>/dev/null || echo 0)" = "1" ] && autorate_enabled=1

	printf '{"is_low_end_mips":%s,"cpu_arch":"%s","cpu_cores":%d,"cpu_model":"%s","suggested_cut_off_mbps":%d,"fastpath_active":%s,"hw_flowoffload_capable":%s,"hw_flowoffload_active":%s,"cake_memlimit":"%s","waveform_aplus_mode":%s,"cake_mq_capable":%s,"cake_mq_active":%s,"auto_dscp_active":%s,"ctinfo_capable":%s,"l4s_active":%s,"autorate_enabled":%s}\n' \
		"$(bool "$is_low_end_mips")" "$cpu_arch" "$cpu_cores" "$(json_escape "$cpu_model")" "$suggested_cut_off_mbps" "$fastpath_active" "$(bool "$hw_flowoffload_capable")" "$(bool "$hw_flowoffload_active")" "$cake_memlimit" "$(bool "$waveform_aplus")" "$(bool "$cake_mq_capable")" "$(bool "$cake_mq_active")" "$(bool "$auto_dscp_active")" "$(bool "$ctinfo_capable")" "$(bool "$l4s_active")" "$(bool "$autorate_enabled")"
}

sqm_apply_upload_only() {
	local s saved_sec wan_dev
	if ark_is_satellite_or_ap; then
		echo "O controle de Bufferbloat (SQM/CAKE) é exclusivo do Roteador Mestre (Gateway). Desativado em modo Ponto de Acesso (AP)." >&2
		exit 2
	fi
	local wan="${1:-wan}"
	local up_kbps="${2:-0}"
	[ -n "$up_kbps" ] && [ "$up_kbps" -gt 0 ] 2>/dev/null || { echo 'Velocidade de upload invalida' >&2; exit 2; }
	saved_sec="$(sqm_section_for_network "$wan" 2>/dev/null || echo '')"
	wan_dev="$(sqm_device_for_network "$wan" 2>/dev/null || echo "$wan")"
	local sec="$saved_sec"
	if [ -z "$sec" ]; then
		for s in $(uci -q show sqm | grep '=queue' | cut -d. -f2 | cut -d= -f1); do
			if [ "$(uci -q get "sqm.$s.interface")" = "$wan_dev" ] || [ "$(uci -q get "sqm.$s.interface")" = "$wan" ]; then
				sec="$s"
				break
			fi
		done
	fi
	[ -n "$sec" ] || sec="wan1"
	ensure_sqm_section "$sec" "$wan_dev"
	uci -q set "sqm.$sec.enabled=1"
	uci -q set "sqm.$sec.download=0"
	uci -q set "sqm.$sec.upload=$up_kbps"
	uci commit sqm
	sync_sqm_flow_offload
	/etc/init.d/sqm restart >/dev/null 2>&1 || true
	ark_promote_cake_mq
	echo 'ok'
}

ensure_qos_equipe() {
	local qos_cfg="${ARK_ROOT:-}/etc/config/qos_equipe"
	[ -f "$qos_cfg" ] && return 0
	mkdir -p "$(dirname "$qos_cfg")" 2>/dev/null || true
	{
		echo "config guest_limit 'guest'"
		echo "	option enabled '1'"
		echo "	option upload_kbps '1500'"
		echo "	option download_kbps '0'"
	} >"$qos_cfg"
}

ark_sqm_ack_filter_opt() {
	local down_kbps="${1:-0}"
	local up_kbps="${2:-0}"
	printf '%s' "$down_kbps" | grep -Eq '^[0-9]+$' || down_kbps=0
	printf '%s' "$up_kbps" | grep -Eq '^[0-9]+$' || up_kbps=0
	if [ "$up_kbps" -gt 0 ] && [ "$down_kbps" -ge $((up_kbps * 5)) ]; then
		printf 'ack-filter'
	else
		printf 'no-ack-filter'
	fi
}

ark_sqm_ingress_rtt_opt() {
	local net_sec="${1:-wan}"
	case "$net_sec" in wan1) net_sec="wan" ;; esac
	if [ "$(uci -q get "equipe_dashboard.main.starlink_mode")" = "1" ] || \
	   [ "$(uci -q get "equipe_dashboard.settings.starlink_mode")" = "1" ] || \
	   [ "$(uci -q get "equipe_dashboard.${net_sec}.preset")" = "starlink" ] || \
	   [ "$(uci -q get "starlink_telemetry.main.enabled")" = "1" ]; then
		printf 'rtt 150ms'
	else
		printf 'rtt 100ms'
	fi
}

ark_sqm_ingress_mode_opt() {
	printf 'ingress'
}

ensure_sqm_section() {
	local section device mlim down_k up_k ack_opt irtt_opt imode_opt
	section="$1"; device="$2"
	mlim="$(ark_cake_memlimit)"
	down_k="$(uci -q get "sqm.$section.download" || echo 0)"
	up_k="$(uci -q get "sqm.$section.upload" || echo 0)"
	ack_opt="$(ark_sqm_ack_filter_opt "$down_k" "$up_k")"
	irtt_opt="$(ark_sqm_ingress_rtt_opt "$section")"
	imode_opt="$(ark_sqm_ingress_mode_opt "$down_k" "$section")"
	uci -q get "sqm.$section" >/dev/null 2>&1 || uci -q set "sqm.$section=queue"
	uci -q set "sqm.$section.interface=$device"
	[ -n "$(uci -q get "sqm.$section.qdisc")" ] || uci -q set "sqm.$section.qdisc=cake"
	local cur_script="$(uci -q get "sqm.$section.script")"
	if [ -z "$cur_script" ] || [ "$cur_script" = "piece_of_cake.qos" ]; then
		uci -q set "sqm.$section.script=layer_cake.qos"
	fi
	uci -q set "sqm.$section.qdisc_advanced=1"
	uci -q set "sqm.$section.qdisc_really_really_advanced=1"
	[ -n "$(uci -q get "sqm.$section.waveform_aplus")" ] || uci -q set "sqm.$section.waveform_aplus=1"
	[ -n "$(uci -q get "sqm.$section.squash_dscp")" ] || uci -q set "sqm.$section.squash_dscp=1"
	[ -n "$(uci -q get "sqm.$section.squash_ingress")" ] || uci -q set "sqm.$section.squash_ingress=1"
	[ -n "$(uci -q get "sqm.$section.ingress_ecn")" ] || uci -q set "sqm.$section.ingress_ecn=ECN"
	[ -n "$(uci -q get "sqm.$section.egress_ecn")" ] || uci -q set "sqm.$section.egress_ecn=NOECN"
	# Mantem use_mq=0 para evitar que create_ifb() instancie cake_mq na interface virtual ifb4* (ingress),
	# pois cake_mq + ingress no kernel 6.12 zera capacity estimate (0bit) e derruba o download TCP.
	uci -q set "sqm.$section.use_mq=0"
	local cur_eq="$(uci -q get "sqm.$section.eqdisc_opts")"
	if [ -z "$cur_eq" ]; then
		cur_eq="diffserv4 nat dual-srchost wash $ack_opt memlimit $mlim"
		uci -q set "sqm.$section.eqdisc_opts=$cur_eq"
	else
		local eq_changed=0
		if ! printf '%s' "$cur_eq" | grep -qw 'wash'; then
			cur_eq="$cur_eq wash"
			eq_changed=1
		fi
		# Ensure egress uses standard RTT (target 5ms) for TCP upload slow-start; strip rtt 50ms
		if printf '%s' "$cur_eq" | grep -q 'rtt 50ms'; then
			cur_eq="$(printf '%s' "$cur_eq" | sed 's/ *rtt 50ms//g')"
			eq_changed=1
		fi
		if ! printf '%s' "$cur_eq" | grep -qw "$ack_opt" || printf '%s' "$cur_eq" | grep -qw 'no-no-ack-filter'; then
			cur_eq="$(printf '%s' "$cur_eq" | sed -E 's/(^| )(no-)*ack-filter( |$)/\1'"$ack_opt"'\3/g')"
			printf '%s' "$cur_eq" | grep -qw "$ack_opt" || cur_eq="$cur_eq $ack_opt"
			eq_changed=1
		fi
		if ! printf '%s' "$cur_eq" | grep -q 'memlimit'; then
			cur_eq="$cur_eq memlimit $mlim"
			eq_changed=1
		elif ! printf '%s' "$cur_eq" | grep -q "memlimit $mlim"; then
			cur_eq="$(printf '%s' "$cur_eq" | sed "s/memlimit [0-9]*[Mm][Bb]*/memlimit $mlim/g")"
			eq_changed=1
		fi
		[ "$eq_changed" = "1" ] && uci -q set "sqm.$section.eqdisc_opts=$cur_eq"
	fi
	if command -v ark_has_qsdk_ecm >/dev/null 2>&1 && ark_has_qsdk_ecm; then
		if ! printf '%s' "$cur_eq" | grep -qw 'no-split-gso'; then
			cur_eq="$cur_eq no-split-gso"
			uci -q set "sqm.$section.eqdisc_opts=$cur_eq"
		fi
	fi
	local cur_iq="$(uci -q get "sqm.$section.iqdisc_opts")"
	if [ -z "$cur_iq" ]; then
		cur_iq="$(printf 'diffserv4 nat dual-dsthost wash no-split-gso %s %s memlimit %s' "$imode_opt" "$irtt_opt" "$mlim" | tr -s ' ')"
		uci -q set "sqm.$section.iqdisc_opts=$cur_iq"
	elif [ "$(uci -q get "sqm.$section.squash_ingress" || echo 1)" = "1" ]; then
		local iq_changed=0
		if printf '%s' "$cur_iq" | grep -qw 'besteffort'; then
			cur_iq="$(printf '%s' "$cur_iq" | sed 's/\bbesteffort\b/diffserv4/g')"
			iq_changed=1
		fi
		if ! printf '%s' "$cur_iq" | grep -qw 'wash'; then
			cur_iq="$cur_iq wash"
			iq_changed=1
		fi
		if ! printf '%s' "$cur_iq" | grep -qw 'no-split-gso'; then
			cur_iq="$cur_iq no-split-gso"
			iq_changed=1
		fi
		if printf '%s' "$cur_iq" | grep -q 'rtt 50ms'; then
			cur_iq="$(printf '%s' "$cur_iq" | sed "s/rtt 50ms/$irtt_opt/g")"
			iq_changed=1
		elif ! printf '%s' "$cur_iq" | grep -qE '\b(rtt|regional|metro|lan|datacentre)\b'; then
			cur_iq="$cur_iq $irtt_opt"
			iq_changed=1
		fi
		if [ -z "$imode_opt" ] && printf '%s' "$cur_iq" | grep -qw 'ingress'; then
			cur_iq="$(printf '%s' "$cur_iq" | sed -E 's/(^| )ingress( |$)/ /g' | tr -s ' ' | sed 's/^ //; s/ $//')"
			iq_changed=1
		elif [ -n "$imode_opt" ] && ! printf '%s' "$cur_iq" | grep -qw 'ingress'; then
			cur_iq="$cur_iq ingress"
			iq_changed=1
		fi
		if ! printf '%s' "$cur_iq" | grep -q 'memlimit'; then
			cur_iq="$cur_iq memlimit $mlim"
			iq_changed=1
		elif ! printf '%s' "$cur_iq" | grep -q "memlimit $mlim"; then
			cur_iq="$(printf '%s' "$cur_iq" | sed "s/memlimit [0-9]*[Mm][Bb]*/memlimit $mlim/g")"
			iq_changed=1
		fi
		[ "$iq_changed" = "1" ] && uci -q set "sqm.$section.iqdisc_opts=$cur_iq"
	fi
	if [ -z "$(uci -q get "sqm.$section.linklayer")" ]; then
		uci -q set "sqm.$section.linklayer=ethernet"
	fi
	if [ "$(uci -q get "sqm.$section.linklayer")" = "ethernet" ]; then
		local cur_ov="$(uci -q get "sqm.$section.overhead")"
		case "$device" in
			pppoe*)
				if [ -z "$cur_ov" ] || [ "$cur_ov" = "0" ] || [ "$cur_ov" = "18" ]; then
					uci -q set "sqm.$section.overhead=44"
				fi
				;;
			*)
				if [ -z "$cur_ov" ] || [ "$cur_ov" = "0" ] || [ "$cur_ov" = "44" ]; then
					uci -q set "sqm.$section.overhead=18"
				fi
				;;
		esac
		uci -q set "sqm.$section.linklayer_advanced=1"
		uci -q set "sqm.$section.tcMTU=2047"
		uci -q set "sqm.$section.tcTSIZE=512"
		uci -q set "sqm.$section.tcMPU=64"
		uci -q set "sqm.$section.mpu=64"
		uci -q set "sqm.$section.linklayer_adaptation_mechanism=default"
	fi
}

sqm_section_for_network() {
	case "$1" in wan) printf wan1 ;; wan[0-9]*) printf '%s' "$1" ;; *) return 1 ;; esac
}

apply_guest_tc_limit() {
	local dev upload download
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
		tc qdisc replace dev "$dev" root tbf rate "${download}kbit" burst 64kbit latency 50ms 2>/tmp/ark-guest-tc-download.log || {
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
		tc filter add dev "$dev" parent ffff: protocol ipv6 u32 match u32 0 0 police rate "${upload}kbit" burst 64kbit drop flowid :1 2>/dev/null || true
	fi
	echo "guest-limit-applied dev=$dev download=${download}kbit upload=${upload}kbit"
}

sync_sqm_flow_offload() {
	local w ecm_dir
	local sqm_active=0
	ecm_dir="${ARK_ROOT:-}/sys/kernel/debug/ecm"
	[ -d "$ecm_dir" ] || ecm_dir="/sys/kernel/debug/ecm"
	if uci -q show sqm 2>/dev/null | grep -q "\.enabled='1'"; then
		sqm_active=1
	fi

	if [ "$sqm_active" = "1" ]; then
		# Trava de exclusao mutua: se SQM/CAKE esta ativo, desativa Fastpath/Flow Offloading no firewall
		if [ "$(uci -q get firewall.@defaults[0].flow_offloading || echo 0)" = "1" ] || \
		   [ "$(uci -q get firewall.@defaults[0].flow_offloading_hw || echo 0)" = "1" ]; then
			uci -q set firewall.@defaults[0].flow_offloading=0
			uci -q set firewall.@defaults[0].flow_offloading_hw=0
			uci commit firewall 2>/dev/null || true
			if [ -z "${ARK_ROOT:-}" ] && command -v nft >/dev/null 2>&1; then
				nft delete flowtable inet fw4 ft 2>/dev/null || true
			fi
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			[ -z "${ARK_ROOT:-}" ] && [ -x /etc/init.d/ark-hardware-tune ] && /etc/init.d/ark-hardware-tune reload >/dev/null 2>&1 || true
		elif [ -z "${ARK_ROOT:-}" ] && command -v nft >/dev/null 2>&1 && nft list flowtables 2>/dev/null | grep -q 'flowtable ft'; then
			nft delete flowtable inet fw4 ft 2>/dev/null || true
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			[ -x /etc/init.d/ark-hardware-tune ] && /etc/init.d/ark-hardware-tune reload >/dev/null 2>&1 || true
		fi
		# Coordenacao Qualcomm QSDK ECM (qca-nss-ecm): impede sequestro do fluxo TCP apos ~25 pacotes em PPPoE + IFB
		if [ -d "$ecm_dir" ]; then
			[ -f "$ecm_dir/front_end_ipv4_stop" ] && echo 1 > "$ecm_dir/front_end_ipv4_stop" 2>/dev/null || true
			[ -f "$ecm_dir/front_end_ipv6_stop" ] && echo 1 > "$ecm_dir/front_end_ipv6_stop" 2>/dev/null || true
			[ -f "$ecm_dir/ecm_db/defunct_all" ] && echo 1 > "$ecm_dir/ecm_db/defunct_all" 2>/dev/null || true
		fi
		ark_sync_lan_selective_offload
	else
		# SQM desativado: verifica se Multi-WAN esta REALMENTE ativo no sistema operacional
		local mwan_count=0
		if [ -f /etc/config/mwan3 ] && [ -x /etc/init.d/mwan3 ] && /etc/init.d/mwan3 enabled >/dev/null 2>&1; then
			for w in $(active_wan_networks); do
				[ "$(uci -q get "mwan3.$w.enabled")" = "1" ] && mwan_count=$((mwan_count + 1))
			done
		fi

		# Se Multi-WAN nao esta ativo (menos de 2 WANs), religa Fastpath e Hardware Offload (MediaTek PPE / Qualcomm NSS)
		if [ "$mwan_count" -lt 2 ]; then
			if [ "$(uci -q get firewall.@defaults[0].flow_offloading || echo 0)" = "0" ] || \
			   [ "$(uci -q get firewall.@defaults[0].flow_offloading_hw || echo 0)" = "0" ]; then
				uci -q set firewall.@defaults[0].flow_offloading=1
				if [ -d /sys/kernel/debug/ppe0 ] || [ -d /sys/kernel/debug/ppe1 ] || [ -f /sys/kernel/debug/ppe/offload_stats ] || [ -d /sys/devices/platform/soc/*ppe* ]; then
					uci -q set firewall.@defaults[0].flow_offloading_hw=1
				fi
				uci commit firewall 2>/dev/null || true
				/etc/init.d/firewall reload >/dev/null 2>&1 || true
				[ -z "${ARK_ROOT:-}" ] && [ -x /etc/init.d/ark-hardware-tune ] && /etc/init.d/ark-hardware-tune reload >/dev/null 2>&1 || true
			fi
			if [ -d "$ecm_dir" ]; then
				[ -f "$ecm_dir/front_end_ipv4_stop" ] && echo 0 > "$ecm_dir/front_end_ipv4_stop" 2>/dev/null || true
				[ -f "$ecm_dir/front_end_ipv6_stop" ] && echo 0 > "$ecm_dir/front_end_ipv6_stop" 2>/dev/null || true
			fi
		fi
	fi
}

ark_sync_lan_selective_offload() {
	local br_dev br_name
	[ -z "${ARK_ROOT:-}" ] || return 0
	for br_dev in /sys/class/net/br-* /sys/class/net/lan*; do
		[ -d "$br_dev" ] || continue
		br_name="${br_dev##*/}"
		command -v ethtool >/dev/null 2>&1 && ethtool -K "$br_name" gro on gso on tso on 2>/dev/null || true
		ip link set dev "$br_name" txqueuelen 1000 2>/dev/null || true
	done
	return 0
}

ark_sqm_autorate_toggle() {
	local state="${1:-0}"
	case "$state" in 0|1) ;; *) echo 'Estado Autorate invalido' >&2; exit 2 ;; esac
	uci -q set equipe_dashboard.settings=dashboard
	uci -q set "equipe_dashboard.settings.sqm_autorate=$state"
	uci commit equipe_dashboard 2>/dev/null || true
	if [ "$state" = "0" ]; then
		rm -f "${ARK_ROOT:-}/tmp"/ark_autorate_*.state 2>/dev/null || true
	fi
	echo ok
}

ark_sqm_autorate_step() {
	local arg key val override_load="" override_delay="" thr_ms=15
	for arg in "$@"; do
		key="${arg%%=*}"
		val="${arg#*=}"
		case "$key" in
			load_pct) override_load="$val" ;;
			delay_ms) override_delay="$val" ;;
		esac
	done

	if [ "$(uci -q get equipe_dashboard.main.starlink_mode 2>/dev/null)" = "1" ] || \
	   [ "$(uci -q get equipe_dashboard.settings.starlink_mode 2>/dev/null)" = "1" ]; then
		thr_ms=35
	fi

	local sec enabled iface base_dl base_ul state_file cur_dl cur_ul saved_base_dl saved_base_ul
	local last_action="steady" load_dl_pct=0 load_ul_pct=0 delay_dl_ms=0 delay_ul_ms=0
	local min_dl max_dl min_ul max_ul new_dl new_ul step_dl step_ul qdisc_type
	local out_sec="wan1" out_dl=0 out_ul=0 out_base_dl=0 out_base_ul=0 out_action="steady" out_delay=0 out_load=0

	for sec in $(uci -q show sqm 2>/dev/null | sed -n 's/^sqm\.\([^.=]*\)=queue$/\1/p'); do
		enabled="$(uci -q get "sqm.$sec.enabled" || echo 0)"
		[ "$enabled" = "1" ] || continue
		iface="$(uci -q get "sqm.$sec.interface" || echo wan)"
		base_dl="$(uci -q get "sqm.$sec.download" || echo 0)"
		base_ul="$(uci -q get "sqm.$sec.upload" || echo 0)"
		[ "$base_dl" -gt 0 ] 2>/dev/null || base_dl=0
		[ "$base_ul" -gt 0 ] 2>/dev/null || base_ul=0
		[ "$base_dl" -gt 0 ] || [ "$base_ul" -gt 0 ] || continue

		state_file="${ARK_ROOT:-}/tmp/ark_autorate_${sec}.state"
		mkdir -p "$(dirname "$state_file")" 2>/dev/null || true
		cur_dl="$base_dl"
		cur_ul="$base_ul"
		saved_base_dl="$base_dl"
		saved_base_ul="$base_ul"

		if [ -f "$state_file" ]; then
			saved_base_dl="$(awk -F= '/^base_dl=/{print $2}' "$state_file" 2>/dev/null || echo "$base_dl")"
			saved_base_ul="$(awk -F= '/^base_ul=/{print $2}' "$state_file" 2>/dev/null || echo "$base_ul")"
			if [ "$saved_base_dl" = "$base_dl" ] && [ "$saved_base_ul" = "$base_ul" ]; then
				cur_dl="$(awk -F= '/^cur_dl=/{print $2}' "$state_file" 2>/dev/null || echo "$base_dl")"
				cur_ul="$(awk -F= '/^cur_ul=/{print $2}' "$state_file" 2>/dev/null || echo "$base_ul")"
			fi
		fi
		[ -n "$cur_dl" ] && [ "$cur_dl" -gt 0 ] 2>/dev/null || cur_dl="$base_dl"
		[ -n "$cur_ul" ] && [ "$cur_ul" -gt 0 ] 2>/dev/null || cur_ul="$base_ul"

		load_dl_pct="${override_load:-30}"
		load_ul_pct="${override_load:-30}"
		delay_dl_ms="${override_delay:-2}"
		delay_ul_ms="${override_delay:-2}"

		min_dl=$((base_dl * 35 / 100))
		[ "$min_dl" -lt 1000 ] && [ "$base_dl" -ge 1000 ] && min_dl=1000
		max_dl="$base_dl"
		min_ul=$((base_ul * 35 / 100))
		[ "$min_ul" -lt 500 ] && [ "$base_ul" -ge 500 ] && min_ul=500
		max_ul="$base_ul"

		new_dl="$cur_dl"
		new_ul="$cur_ul"
		last_action="steady"

		# 1. Bufferbloat / Congestion detected (delay > threshold): Multiplicative Decrease (-12%)
		if [ "$delay_dl_ms" -gt "$thr_ms" ] 2>/dev/null; then
			new_dl=$((cur_dl * 88 / 100))
			[ "$new_dl" -lt "$min_dl" ] && new_dl="$min_dl"
			last_action="shaping_down"
		# 2. Motor 1 — Sondagem Ativa (Active Probing under high load >= 70% with clean latency): +5% step up
		elif [ "$load_dl_pct" -ge 70 ] 2>/dev/null && [ "$cur_dl" -lt "$max_dl" ]; then
			step_dl=$((cur_dl * 5 / 100))
			[ "$step_dl" -lt 500 ] && step_dl=500
			new_dl=$((cur_dl + step_dl))
			[ "$new_dl" -gt "$max_dl" ] && new_dl="$max_dl"
			last_action="probing_up"
		# 3. Motor 2 — Retorno Elastico Silencioso (Elastic Idle Recovery when load < 50%): +15% of base toward base_dl
		elif [ "$load_dl_pct" -lt 50 ] 2>/dev/null && [ "$cur_dl" -lt "$base_dl" ]; then
			step_dl=$((base_dl * 15 / 100))
			[ "$step_dl" -lt 1000 ] && step_dl=1000
			new_dl=$((cur_dl + step_dl))
			[ "$new_dl" -gt "$base_dl" ] && new_dl="$base_dl"
			last_action="elastic_recovery"
		fi

		if [ "$delay_ul_ms" -gt "$thr_ms" ] 2>/dev/null; then
			new_ul=$((cur_ul * 88 / 100))
			[ "$new_ul" -lt "$min_ul" ] && new_ul="$min_ul"
			last_action="shaping_down"
		elif [ "$load_ul_pct" -ge 70 ] 2>/dev/null && [ "$cur_ul" -lt "$max_ul" ]; then
			step_ul=$((cur_ul * 5 / 100))
			[ "$step_ul" -lt 250 ] && step_ul=250
			new_ul=$((cur_ul + step_ul))
			[ "$new_ul" -gt "$max_ul" ] && new_ul="$max_ul"
			[ "$last_action" = "steady" ] && last_action="probing_up"
		elif [ "$load_ul_pct" -lt 50 ] 2>/dev/null && [ "$cur_ul" -lt "$base_ul" ]; then
			step_ul=$((base_ul * 15 / 100))
			[ "$step_ul" -lt 500 ] && step_ul=500
			new_ul=$((cur_ul + step_ul))
			[ "$new_ul" -gt "$base_ul" ] && new_ul="$base_ul"
			[ "$last_action" = "steady" ] && last_action="elastic_recovery"
		fi

		if [ -z "${ARK_ROOT:-}" ]; then
			if [ "$new_ul" != "$cur_ul" ] && [ "$new_ul" -gt 0 ]; then
				qdisc_type="cake"
				tc qdisc show dev "$iface" 2>/dev/null | grep -q "cake_mq" && qdisc_type="cake_mq"
				tc qdisc change dev "$iface" root "$qdisc_type" bandwidth "${new_ul}kbit" 2>/dev/null || true
			fi
			if [ "$new_dl" != "$cur_dl" ] && [ "$new_dl" -gt 0 ]; then
				tc qdisc change dev "ifb4${iface}" root cake bandwidth "${new_dl}kbit" 2>/dev/null || true
			fi
		fi

		{
			printf 'sec=%s\n' "$sec"
			printf 'iface=%s\n' "$iface"
			printf 'base_dl=%d\n' "$base_dl"
			printf 'base_ul=%d\n' "$base_ul"
			printf 'cur_dl=%d\n' "$new_dl"
			printf 'cur_ul=%d\n' "$new_ul"
			printf 'last_action=%s\n' "$last_action"
			printf 'delay_ms=%d\n' "$delay_dl_ms"
			printf 'load_pct=%d\n' "$load_dl_pct"
		} > "$state_file"

		out_sec="$sec"
		out_dl="$new_dl"
		out_ul="$new_ul"
		out_base_dl="$base_dl"
		out_base_ul="$base_ul"
		out_action="$last_action"
		out_delay="$delay_dl_ms"
		out_load="$load_dl_pct"
	done

	printf '{"ok":true,"section":"%s","cur_dl_kbps":%d,"cur_ul_kbps":%d,"base_dl_kbps":%d,"base_ul_kbps":%d,"action":"%s","delay_ms":%d,"load_pct":%d,"threshold_ms":%d}\n' \
		"$out_sec" "$out_dl" "$out_ul" "$out_base_dl" "$out_base_ul" "$out_action" "$out_delay" "$out_load" "$thr_ms"
}

ark_sqm_autorate_status() {
	local enabled=0 state_file="${ARK_ROOT:-}/tmp/ark_autorate_wan1.state"
	local cur_dl=0 cur_ul=0 base_dl=0 base_ul=0 last_action="idle" delay_ms=0 load_pct=0
	[ "$(uci -q get equipe_dashboard.settings.sqm_autorate 2>/dev/null || echo 0)" = "1" ] && enabled=1
	if [ -f "$state_file" ]; then
		cur_dl="$(awk -F= '/^cur_dl=/{print $2}' "$state_file" 2>/dev/null || echo 0)"
		cur_ul="$(awk -F= '/^cur_ul=/{print $2}' "$state_file" 2>/dev/null || echo 0)"
		base_dl="$(awk -F= '/^base_dl=/{print $2}' "$state_file" 2>/dev/null || echo 0)"
		base_ul="$(awk -F= '/^base_ul=/{print $2}' "$state_file" 2>/dev/null || echo 0)"
		last_action="$(awk -F= '/^last_action=/{print $2}' "$state_file" 2>/dev/null || echo idle)"
		delay_ms="$(awk -F= '/^delay_ms=/{print $2}' "$state_file" 2>/dev/null || echo 0)"
		load_pct="$(awk -F= '/^load_pct=/{print $2}' "$state_file" 2>/dev/null || echo 0)"
	fi
	printf '{"enabled":%s,"cur_dl_kbps":%d,"cur_ul_kbps":%d,"base_dl_kbps":%d,"base_ul_kbps":%d,"action":"%s","delay_ms":%d,"load_pct":%d}\n' \
		"$(bool "$enabled")" "$cur_dl" "$cur_ul" "$base_dl" "$base_ul" "$last_action" "$delay_ms" "$load_pct"
}

handle_sqm() {
	case "$1" in
	sqm-toggle)
		case "$2" in 0|1) ;; *) echo 'Estado SQM invalido' >&2; exit 2 ;; esac
		[ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ] || { echo 'SQM nao instalado' >&2; exit 3; }
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
		sync_sqm_flow_offload
		if [ "$2" = 1 ]; then
			/etc/init.d/sqm enable >/dev/null 2>&1 || true
			/etc/init.d/sqm restart
		else
			/etc/init.d/sqm stop >/dev/null 2>&1 || true
			/etc/init.d/sqm disable >/dev/null 2>&1 || true
		fi
		ark_promote_cake_mq
		echo ok
		;;
	irqbalance-toggle)
		case "$2" in 0|1) ;; *) echo 'Estado do irqbalance invalido' >&2; exit 2 ;; esac
		installed irqbalance || { echo 'irqbalance nao instalado' >&2; exit 3; }
		if [ "$2" = 1 ] && ark_has_native_hw_queues; then
			echo 'IRQ Balance desnecessario e contraindicado neste hardware: a distribuicao de interrupcoes e aneis de DMA ja e realizada nativamente pelo silicio.' >&2
			exit 4
		fi
		uci -q set "irqbalance.irqbalance.enabled=$2"
		uci commit irqbalance
		if [ "$2" = 1 ]; then /etc/init.d/irqbalance enable; /etc/init.d/irqbalance restart
		else /etc/init.d/irqbalance stop; /etc/init.d/irqbalance disable
		fi
		echo ok
		;;
	sqm-waveform-aplus)
		case "$2" in 0|1) ;; *) echo 'Estado Waveform A+ invalido' >&2; exit 2 ;; esac
		[ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ] || { echo 'SQM nao instalado' >&2; exit 3; }
		uci -q set equipe_dashboard.settings=dashboard
		uci -q set "equipe_dashboard.settings.waveform_aplus_mode=$2"
		uci commit equipe_dashboard 2>/dev/null || true
		mlim_aplus="$(ark_cake_memlimit)"
		for network_section in $(active_wan_networks); do
			sqm_section="$(sqm_section_for_network "$network_section")" || continue
			wan_device="$(sqm_device_for_network "$network_section")"
			valid_net_device "$wan_device" || continue
			ensure_sqm_section "$sqm_section" "$wan_device"
			uci -q set "sqm.$sqm_section.waveform_aplus=$2"
			if [ "$2" = "1" ]; then
				uci -q set "sqm.$sqm_section.qdisc=cake"
				uci -q set "sqm.$sqm_section.script=layer_cake.qos"
				uci -q set "sqm.$sqm_section.qdisc_advanced=1"
				uci -q set "sqm.$sqm_section.qdisc_really_really_advanced=1"
				uci -q set "sqm.$sqm_section.squash_dscp=1"
				uci -q set "sqm.$sqm_section.squash_ingress=1"
				uci -q set "sqm.$sqm_section.ingress_ecn=ECN"
				uci -q set "sqm.$sqm_section.egress_ecn=NOECN"
				uci -q set "sqm.$sqm_section.linklayer=ethernet"
				uci -q set "sqm.$sqm_section.linklayer_advanced=1"
				uci -q set "sqm.$sqm_section.tcMTU=2047"
				uci -q set "sqm.$sqm_section.tcTSIZE=512"
				uci -q set "sqm.$sqm_section.tcMPU=64"
				uci -q set "sqm.$sqm_section.mpu=64"
				uci -q set "sqm.$sqm_section.linklayer_adaptation_mechanism=default"
				wan_proto="$(uci -q get "network.$network_section.proto")"
				case "$wan_proto:$wan_device" in
					pppoe:*|*:pppoe*) uci -q set "sqm.$sqm_section.overhead=44" ;;
					*) uci -q set "sqm.$sqm_section.overhead=18" ;;
				esac
				down_aplus="$(uci -q get "sqm.$sqm_section.download" || echo 0)"
				up_aplus="$(uci -q get "sqm.$sqm_section.upload" || echo 0)"
				ack_aplus="$(ark_sqm_ack_filter_opt "$down_aplus" "$up_aplus")"
				irtt_aplus="$(ark_sqm_ingress_rtt_opt "$network_section")"
				imode_aplus="$(ark_sqm_ingress_mode_opt "$down_aplus" "$network_section")"
				eq_aplus="diffserv4 nat dual-srchost $ack_aplus wash memlimit $mlim_aplus"
				if command -v ark_has_qsdk_ecm >/dev/null 2>&1 && ark_has_qsdk_ecm; then
					eq_aplus="$eq_aplus no-split-gso"
				fi
				iq_aplus="$(printf 'diffserv4 nat dual-dsthost wash no-split-gso %s %s memlimit %s' "$imode_aplus" "$irtt_aplus" "$mlim_aplus" | tr -s ' ')"
				uci -q set "sqm.$sqm_section.eqdisc_opts=$eq_aplus"
				uci -q set "sqm.$sqm_section.iqdisc_opts=$iq_aplus"
			fi
		done
		uci commit sqm
		if [ "$2" = "1" ] && [ -z "${ARK_ROOT:-}" ] && [ -x /etc/init.d/ark-hardware-tune ]; then
			rm -f /tmp/ark-hardware-tune.ts 2>/dev/null || true
			/etc/init.d/ark-hardware-tune reload >/dev/null 2>&1 || true
		fi
		if uci -q show sqm 2>/dev/null | grep -q "\.enabled='1'"; then
			/etc/init.d/sqm stop >/dev/null 2>&1 || true
			/etc/init.d/sqm start >/dev/null 2>&1 || /etc/init.d/sqm restart >/dev/null 2>&1 || true
		fi
		ark_promote_cake_mq
		echo ok
		;;
	sqm-save-v2)
		[ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ] || { echo 'SQM nao instalado' >&2; exit 3; }
		shift
		wan_count=0
		submitted_sections=' '
		waveform_aplus_override=""
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				wan)
					wan_fields="$(printf '%s' "$value" | awk -F'|' '{print NF}')"
					[ "$wan_fields" -ge 6 ] && [ "$wan_fields" -le 10 ] || { echo 'Perfil WAN SQM invalido' >&2; exit 2; }
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
				waveform_aplus)
					case "$value" in 0|1) waveform_aplus_override="$value" ;; *) echo 'Estado Waveform A+ invalido' >&2; exit 2 ;; esac
					;;
				*) echo "Campo SQM invalido: $key" >&2; exit 2 ;;
			esac
		done
		[ "$wan_count" -gt 0 ] || { echo 'Nenhuma WAN enviada para o SQM' >&2; exit 2; }
		if [ -n "$waveform_aplus_override" ]; then
			uci -q set equipe_dashboard.settings=dashboard
			uci -q set "equipe_dashboard.settings.waveform_aplus_mode=$waveform_aplus_override"
			uci commit equipe_dashboard 2>/dev/null || true
		fi
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
					section="$(printf '%s' "$value" | cut -d '|' -f1)"
					net_name="$(printf '%s' "$value" | cut -d '|' -f2)"
					device="$(printf '%s' "$value" | cut -d '|' -f3)"
					enabled="$(printf '%s' "$value" | cut -d '|' -f4)"
					download="$(printf '%s' "$value" | cut -d '|' -f5)"
					upload="$(printf '%s' "$value" | cut -d '|' -f6)"
					linklayer="$(printf '%s' "$value" | cut -d '|' -f7)"
					overhead="$(printf '%s' "$value" | cut -d '|' -f8)"
					eqdisc_opts="$(printf '%s' "$value" | cut -d '|' -f9)"
					iqdisc_opts="$(printf '%s' "$value" | cut -d '|' -f10)"
					[ -n "$download" ] || download=0
					[ -n "$upload" ] || upload=0
					if [ -n "$net_name" ]; then
						target_sqm_dev="$(sqm_device_for_network "$net_name" 2>/dev/null || true)"
						[ -n "$target_sqm_dev" ] && device="$target_sqm_dev"
					fi
					uci -q get "sqm.$section" >/dev/null 2>&1 || uci -q set "sqm.$section=queue"
					uci -q set "sqm.$section.download=$download"
					uci -q set "sqm.$section.upload=$upload"
					ensure_sqm_section "$section" "$device"
					uci -q set "sqm.$section.enabled=$enabled"
					local ack_save="$(ark_sqm_ack_filter_opt "$download" "$upload")"
					local irtt_save="$(ark_sqm_ingress_rtt_opt "${net_name:-$section}")"
					local imode_save="$(ark_sqm_ingress_mode_opt "$download" "${net_name:-$section}")"
					if [ -n "$waveform_aplus_override" ]; then
						uci -q set "sqm.$section.waveform_aplus=$waveform_aplus_override"
					fi
					if [ "$waveform_aplus_override" = "1" ]; then
						local mlim_save="$(ark_cake_memlimit)"
						uci -q set "sqm.$section.qdisc=cake"
						uci -q set "sqm.$section.script=layer_cake.qos"
						uci -q set "sqm.$section.qdisc_advanced=1"
						uci -q set "sqm.$section.qdisc_really_really_advanced=1"
						uci -q set "sqm.$section.squash_dscp=1"
						uci -q set "sqm.$section.squash_ingress=1"
						uci -q set "sqm.$section.ingress_ecn=ECN"
						uci -q set "sqm.$section.egress_ecn=NOECN"
						uci -q set "sqm.$section.linklayer=ethernet"
						uci -q set "sqm.$section.linklayer_advanced=1"
						uci -q set "sqm.$section.tcMTU=2047"
						uci -q set "sqm.$section.tcTSIZE=512"
						uci -q set "sqm.$section.tcMPU=64"
						uci -q set "sqm.$section.mpu=64"
						uci -q set "sqm.$section.linklayer_adaptation_mechanism=default"
						local wan_proto="$(uci -q get "network.$net_name.proto")"
						case "$wan_proto:$device" in
							pppoe:*|*:pppoe*) uci -q set "sqm.$section.overhead=44" ;;
							*) uci -q set "sqm.$section.overhead=18" ;;
						esac
						eqdisc_opts="diffserv4 nat dual-srchost $ack_save wash memlimit $mlim_save"
						if command -v ark_has_qsdk_ecm >/dev/null 2>&1 && ark_has_qsdk_ecm; then
							eqdisc_opts="$eqdisc_opts no-split-gso"
						fi
						iqdisc_opts="$(printf 'diffserv4 nat dual-dsthost wash no-split-gso %s %s memlimit %s' "$imode_save" "$irtt_save" "$mlim_save" | tr -s ' ')"
						uci -q set "sqm.$section.eqdisc_opts=$eqdisc_opts"
						uci -q set "sqm.$section.iqdisc_opts=$iqdisc_opts"
					else
						if [ "$linklayer" = "none" ] || [ -z "$linklayer" ]; then
							uci -q set "sqm.$section.linklayer=none"
							uci -q delete "sqm.$section.linklayer_advanced"
							uci -q delete "sqm.$section.overhead"
							uci -q delete "sqm.$section.tcMPU"
							uci -q delete "sqm.$section.mpu"
						else
							uci -q set "sqm.$section.linklayer=$linklayer"
							[ -n "$overhead" ] && uci -q set "sqm.$section.overhead=$overhead"
							if [ "$linklayer" = "ethernet" ]; then
								uci -q set "sqm.$section.linklayer_advanced=1"
								uci -q set "sqm.$section.tcMTU=2047"
								uci -q set "sqm.$section.tcTSIZE=512"
								uci -q set "sqm.$section.tcMPU=64"
								uci -q set "sqm.$section.mpu=64"
								uci -q set "sqm.$section.linklayer_adaptation_mechanism=default"
							else
								uci -q delete "sqm.$section.tcMPU"
								uci -q delete "sqm.$section.mpu"
							fi
						fi
						if [ -n "$eqdisc_opts" ] || [ -n "$iqdisc_opts" ]; then
							local mlim_save="$(ark_cake_memlimit)"
							uci -q set "sqm.$section.qdisc_advanced=1"
							uci -q set "sqm.$section.qdisc_really_really_advanced=1"
							if [ -n "$eqdisc_opts" ]; then
								# Strip rtt 50ms from egress (upload uses standard 100ms / 5ms target)
								eqdisc_opts="$(printf '%s' "$eqdisc_opts" | sed 's/ *rtt 50ms//g')"
								if ! printf '%s' "$eqdisc_opts" | grep -qw "$ack_save" || printf '%s' "$eqdisc_opts" | grep -qw 'no-no-ack-filter'; then
									eqdisc_opts="$(printf '%s' "$eqdisc_opts" | sed -E 's/(^| )(no-)*ack-filter( |$)/\1'"$ack_save"'\3/g')"
									printf '%s' "$eqdisc_opts" | grep -qw "$ack_save" || eqdisc_opts="$eqdisc_opts $ack_save"
								fi
								if printf '%s' "$eqdisc_opts" | grep -q 'memlimit'; then
									eqdisc_opts="$(printf '%s' "$eqdisc_opts" | sed "s/memlimit [0-9]*[Mm][Bb]*/memlimit $mlim_save/g")"
								else
									eqdisc_opts="$eqdisc_opts memlimit $mlim_save"
								fi
								if command -v ark_has_qsdk_ecm >/dev/null 2>&1 && ark_has_qsdk_ecm; then
									printf '%s' "$eqdisc_opts" | grep -qw 'no-split-gso' || eqdisc_opts="$eqdisc_opts no-split-gso"
								fi
								uci -q set "sqm.$section.eqdisc_opts=$eqdisc_opts"
							fi
							if [ -n "$iqdisc_opts" ]; then
								if [ "$(uci -q get "sqm.$section.squash_ingress" || echo 1)" = "1" ] && printf '%s' "$iqdisc_opts" | grep -qw 'besteffort'; then
									iqdisc_opts="$(printf '%s' "$iqdisc_opts" | sed 's/\bbesteffort\b/diffserv4/g')"
								fi
								printf '%s' "$iqdisc_opts" | grep -qw 'wash' || iqdisc_opts="$iqdisc_opts wash"
								printf '%s' "$iqdisc_opts" | grep -qw 'no-split-gso' || iqdisc_opts="$iqdisc_opts no-split-gso"
								if printf '%s' "$iqdisc_opts" | grep -q 'rtt 50ms'; then
									iqdisc_opts="$(printf '%s' "$iqdisc_opts" | sed "s/rtt 50ms/$irtt_save/g")"
								elif ! printf '%s' "$iqdisc_opts" | grep -qE '\b(rtt|regional|metro|lan|datacentre)\b'; then
									iqdisc_opts="$iqdisc_opts $irtt_save"
								fi
								if [ -z "$imode_save" ] && printf '%s' "$iqdisc_opts" | grep -qw 'ingress'; then
									iqdisc_opts="$(printf '%s' "$iqdisc_opts" | sed -E 's/(^| )ingress( |$)/ /g' | tr -s ' ' | sed 's/^ //; s/ $//')"
								elif [ -n "$imode_save" ] && ! printf '%s' "$iqdisc_opts" | grep -qw 'ingress'; then
									iqdisc_opts="$iqdisc_opts ingress"
								fi
								if printf '%s' "$iqdisc_opts" | grep -q 'memlimit'; then
									iqdisc_opts="$(printf '%s' "$iqdisc_opts" | sed "s/memlimit [0-9]*[Mm][Bb]*/memlimit $mlim_save/g")"
								else
									iqdisc_opts="$iqdisc_opts memlimit $mlim_save"
								fi
								uci -q set "sqm.$section.iqdisc_opts=$iqdisc_opts"
							fi
						fi
					fi
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
		sync_sqm_flow_offload
		if uci -q show sqm 2>/dev/null | grep -q "\.enabled='1'"; then
			/etc/init.d/sqm enable >/dev/null 2>&1 || true
			/etc/init.d/sqm restart
		else
			/etc/init.d/sqm stop >/dev/null 2>&1 || true
			/etc/init.d/sqm disable >/dev/null 2>&1 || true
		fi
		ark_promote_cake_mq
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
		wan1_dev="$(sqm_device_for_network wan 2>/dev/null || printf wan)"
		ensure_sqm_section wan1 "$wan1_dev"
		wan2_dev="$(sqm_device_for_network wan2 2>/dev/null || uci -q get network.wan2.device || printf lan1)"
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
		sync_sqm_flow_offload
		/etc/init.d/sqm restart
		ark_promote_cake_mq
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
	sqm-autorate-toggle)
		shift
		ark_sqm_autorate_toggle "$@"
		;;
	sqm-autorate-step)
		shift
		ark_sqm_autorate_step "$@"
		;;
	sqm-autorate-status)
		ark_sqm_autorate_status
		;;
	esac
}
