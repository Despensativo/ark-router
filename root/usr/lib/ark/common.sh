#!/bin/sh
# /usr/lib/ark/common.sh - ARK Router Common Runtime & Environment Helper
# Compatible with BusyBox /bin/ash, OpenWrt 19.07-25.12, and sandbox test harnesses.

[ -z "${_ARK_COMMON_SH_LOADED:-}" ] || return 0
_ARK_COMMON_SH_LOADED=1

ARK_ROUTER_VERSION="2.1.2"
ARK_UPDATE_REPO_DEFAULT="Despensativo/ark-router"
ARK_ROOT="${ARK_ROOT:-}"

# Resolução de caminho de bibliotecas:
# Permite rodar nativamente em /usr/lib/ark ou em sandboxes/testes locais
if [ -z "${ARK_LIB_DIR:-}" ]; then
	if [ -n "$ARK_ROOT" ] && [ -d "${ARK_ROOT}/usr/lib/ark" ]; then
		ARK_LIB_DIR="${ARK_ROOT}/usr/lib/ark"
	elif [ -d "/usr/lib/ark" ]; then
		ARK_LIB_DIR="/usr/lib/ark"
	else
		# Fallback relativo para testes no repositório git
		_script_dir="$(dirname "$0")"
		if [ -d "${_script_dir}/../lib/ark" ]; then
			ARK_LIB_DIR="${_script_dir}/../lib/ark"
		else
			ARK_LIB_DIR="/usr/lib/ark"
		fi
		unset _script_dir
	fi
fi

# Boolean formatting helpers
bool() {
	case "${1:-}" in
		1|true|yes|on) printf true ;;
		*) printf false ;;
	esac
}

ez_bool() {
	case "$1" in
		1|true|yes|on|enabled) echo 1 ;;
		*) echo 0 ;;
	esac
}

json_escape() {
	printf '%s' "$1" | sed ':a;N;$!ba;s/\\/\\\\/g;s/"/\\"/g;s/\r/\\r/g;s/\n/\\n/g;s/\t/\\t/g'
}

json_bool_value() {
	[ "$1" = 1 ] || [ "$1" = true ] || [ "$1" = yes ] || [ "$1" = on ] && printf true || printf false
}

# Platform and OS Detection
ark_has_apk() {
	command -v apk >/dev/null 2>&1
}

ark_has_opkg() {
	command -v opkg >/dev/null 2>&1
}

# Detecta se o roteador utiliza o driver proprietário Qualcomm QSDK (qcawificfg80211 / qca-hostapd-11be, ex: Acer Predator Connect T7)
ark_has_qca_wifi() {
	grep -q "qcawificfg80211" /etc/config/wireless 2>/dev/null || \
	uci -q show wireless 2>/dev/null | grep -q "qcawificfg80211" || \
	command -v cfg80211tool >/dev/null 2>&1
}

# Detecta se o binário hostapd/wpad em execução suporta 802.11v WNM (bss_transition)
# No OpenWrt, imagens geradas com wpad-basic / hostapd-basic não compilam CONFIG_WNM e quebram se bss_transition for configurado.
# No Qualcomm QSDK (qcawificfg80211), o qca-hostapd-11be já vem compilado nativamente com OpenSSL e 802.11k/v/RNR/FILS completos.
ark_hostapd_has_wnm() {
	if ark_has_qca_wifi; then
		return 0
	fi
	if ark_has_apk; then
		if apk list -I 2>/dev/null | grep -E '^(wpad|hostapd)' | grep -q 'basic'; then
			return 1
		fi
		return 0
	elif ark_has_opkg; then
		if opkg list-installed 2>/dev/null | grep -E '^(wpad|hostapd)' | grep -q 'basic'; then
			return 1
		fi
		return 0
	fi
	return 0
}

# Detecta se o roteador roda drivers e daemons proprietários Qualcomm QSDK / Wi-Fi SON (qcawificfg80211 / IPQ5332 / Predator T7)
# Nesses ambientes, o qca-hostapd não expõe objetos no ubus (usa /var/run/hostapd-wifiX + cfg80211tool) e o steering ocorre em silício (RNR Co-located + FILS + 802.11k/v ou hyd/PPE); usteer deve ser estritamente bloqueado
ark_has_qualcomm_son() {
	ark_has_qca_wifi || \
	lsmod 2>/dev/null | grep -qE 'hyfi_bridging|qca_mcs|qca_ssdk' || \
	[ -d /sys/module/hyfi_bridging ] || \
	pgrep -x hyd >/dev/null 2>&1 || \
	[ -x /etc/init.d/hyd ]
}

ark_ensure_working_distfeeds() {
	[ -f /etc/opkg/distfeeds.conf ] || return 0
	if grep -q "19.07-SNAPSHOT" /etc/opkg/distfeeds.conf 2>/dev/null; then
		[ -f /etc/opkg/distfeeds.conf.orig ] || cp /etc/opkg/distfeeds.conf /etc/opkg/distfeeds.conf.orig 2>/dev/null || true
		cat << 'EOF' > /etc/opkg/distfeeds.conf
src/gz openwrt_base http://downloads.openwrt.org/releases/19.07.10/packages/arm_cortex-a7_neon-vfpv4/base
src/gz openwrt_packages http://downloads.openwrt.org/releases/19.07.10/packages/arm_cortex-a7_neon-vfpv4/packages
src/gz openwrt_luci http://downloads.openwrt.org/releases/19.07.10/packages/arm_cortex-a7_neon-vfpv4/luci
src/gz openwrt_routing http://downloads.openwrt.org/releases/19.07.10/packages/arm_cortex-a7_neon-vfpv4/routing
src/gz openwrt_telephony http://downloads.openwrt.org/releases/19.07.10/packages/arm_cortex-a7_neon-vfpv4/telephony
EOF
	fi
	# Compatibility stub: when kernel has built-in or pre-installed sch_cake.ko (e.g. Acer T7 with kernel 5.4 on 19.07 base)
	if [ -f "/lib/modules/$(uname -r)/sch_cake.ko" ] && [ -f /usr/lib/opkg/status ]; then
		if ! grep -q "^Package: kmod-sched-cake" /usr/lib/opkg/status 2>/dev/null; then
			cat << 'EOF' >> /usr/lib/opkg/status

Package: kmod-sched-cake
Version: 5.4.213-1
Depends: kmod-sched
Status: install user installed
Architecture: arm_cortex-a7_neon-vfpv4
Installed-Time: 1741683461
EOF
			touch /usr/lib/opkg/info/kmod-sched-cake.list 2>/dev/null || true
		fi
	fi
}

ark_has_fw4() {
	command -v fw4 >/dev/null 2>&1 || [ -x "${ARK_ROOT}/sbin/fw4" ] || [ -x "/sbin/fw4" ]
}

ark_has_nftables() {
	command -v nft >/dev/null 2>&1 || [ -x "${ARK_ROOT}/usr/sbin/nft" ] || [ -x "/usr/sbin/nft" ]
}

ark_firewall_engine() {
	if ark_has_fw4 || { ark_has_nftables && nft list table inet fw4 >/dev/null 2>&1; }; then
		printf 'fw4'
	else
		printf 'fw3'
	fi
}

is_fw4() {
	[ "$(ark_firewall_engine)" = "fw4" ]
}

is_fw3() {
	[ "$(ark_firewall_engine)" = "fw3" ]
}

is_swconfig() {
	command -v swconfig >/dev/null 2>&1 && swconfig dev switch0 show >/dev/null 2>&1
}

ark_cpu_cores() {
	local cores
	cores="$(grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 1)"
	[ "$cores" -ge 1 ] 2>/dev/null || cores=1
	printf '%s' "$cores"
}

ark_has_native_hw_queues() {
	local rx_q
	# 1. Checagem direta de drivers de anel de DMA / PPE / WED no kernel em execução (/proc/interrupts)
	# Cobre universalmente qualquer versão (estável, snapshot, beta ou OEM fork)
	if [ -r /proc/interrupts ]; then
		if grep -Eq 'edma_rxdesc|wlan_grp_dp|qca-nss|mtk_soc_eth|mtk-wed|qdma|mvneta|mvpp2|dpaa|runner' /proc/interrupts 2>/dev/null; then
			return 0
		fi
	fi

	# 2. Device Tree Compatible (SoCs enterprise com aceleração de hardware)
	if [ -d /proc/device-tree ]; then
		local dt_comp=''
		dt_comp="$(cat /proc/device-tree/compatible 2>/dev/null | tr '\0' ' ' || true)"
		case "$dt_comp" in
			*qcom,ipq*|*qcom,nss*|*qcom,appe*|*qcom,edma*|*mediatek,mt798*|*mediatek,mt79*|*mediatek,mt7622*|*mediatek,mt7623*|*mediatek,filogic*|*marvell,armada*|*fsl,ls*|*fsl,dpaa*|*brcm,bcm49*|*cavium,octeon*)
				return 0
				;;
		esac
	fi

	# 3. Target oficial do OpenWrt (/etc/openwrt_release e ubus)
	local dist_target
	dist_target="$(grep 'DISTRIB_TARGET' /etc/openwrt_release 2>/dev/null | cut -d"'" -f2 || echo '')"
	[ -n "$dist_target" ] || dist_target="$(ubus call system board 2>/dev/null | grep -o '"target":"[^"]*"' | cut -d'"' -f4 || echo '')"
	case "$dist_target" in
		mediatek/filogic*|mediatek/mt7622*|mediatek/mt7623*|ipq*|qualcommax*|qca*|mvebu*|layerscape*|qoriq*|bcm4908*|octeon*|realtek/rtl93*)
			return 0
			;;
	esac

	# 4. Multi-queue hardware NICs com 2 ou mais filas RX no hardware
	local q_cnt=0
	for rx_q in /sys/class/net/*/queues/rx-1; do
		if [ -d "$rx_q" ]; then
			q_cnt=$((q_cnt + 1))
		fi
	done
	if [ "$q_cnt" -gt 0 ] && [ "$(ark_cpu_cores)" -gt 1 ]; then
		return 0
	fi

	return 1
}

ark_is_satellite_or_ap() {
	local role="$(uci -q get equipe_dashboard.general.role || uci -q get equipe_dashboard.mesh.role || true)"
	case "$role" in
		master|primary|gateway) return 1 ;;
		secondary|satellite) return 0 ;;
	esac
	local net_mode="$(uci -q get equipe_dashboard.main.network_mode || uci -q get equipe_dashboard.general.network_mode || true)"
	case "$net_mode" in
		router) return 1 ;;
		ap) return 0 ;;
	esac
	local dhcp_ignore="$(uci -q get dhcp.lan.ignore || echo 0)"
	local lan_gw="$(uci -q get network.lan.gateway || true)"
	local lan_proto="$(uci -q get network.lan.proto || true)"
	[ "$dhcp_ignore" = "1" ] && { [ -n "$lan_gw" ] || [ "$lan_proto" = "dhcp" ]; } && return 0
	return 1
}

ark_ap_uplink_dev() {
	local cached=''
	if [ -f /tmp/ark-ap-uplink ]; then
		cached="$(cat /tmp/ark-ap-uplink 2>/dev/null)"
		[ -n "$cached" ] && [ -d "/sys/class/net/$cached" ] && { printf '%s' "$cached"; return 0; }
	fi
	local gw_ip gw_mac uplink=''
	gw_ip="$(ip route show default 2>/dev/null | awk '/default/ {print $3}' | head -n 1)"
	[ -n "$gw_ip" ] || gw_ip="$(uci -q get network.lan.gateway)"
	if [ -n "$gw_ip" ]; then
		gw_mac="$(ip neigh show "$gw_ip" 2>/dev/null | awk '{print $5}' | head -n 1)"
		[ -n "$gw_mac" ] || gw_mac="$(grep "$gw_ip " /proc/net/arp 2>/dev/null | awk '{print $4}' | head -n 1)"
		if [ -n "$gw_mac" ]; then
			uplink="$(bridge fdb show 2>/dev/null | grep -i "$gw_mac" | awk '{print $3}' | head -n 1)"
		fi
	fi
	if [ -z "$uplink" ] || [ ! -d "/sys/class/net/$uplink" ]; then
		local wan_dev="$(uci -q get network.wan.ark_phys_port || uci -q get network.wan.device || echo eth0)"
		if [ -n "$wan_dev" ] && [ -d "/sys/class/net/$wan_dev" ]; then
			uplink="$wan_dev"
		else
			uplink='br-lan'
		fi
	fi
	[ -n "$uplink" ] && printf '%s' "$uplink" > /tmp/ark-ap-uplink 2>/dev/null
	printf '%s' "$uplink"
}

ark_language() {
	local lang="$(uci -q get equipe_dashboard.main.language || true)"
	if [ -z "$lang" ] || [ "$lang" = "auto" ]; then
		local luci_lang="$(uci -q get luci.main.lang || true)"
		case "$luci_lang" in
			en*) lang="en" ;;
			es*) lang="es" ;;
			pt*) lang="pt-br" ;;
			*)
				local sys_lang="${LANG:-${LC_ALL:-}}"
				case "$sys_lang" in
					en*) lang="en" ;;
					es*) lang="es" ;;
					*) lang="pt-br" ;;
				esac
				;;
		esac
	fi
	[ -n "$lang" ] || lang="pt-br"
	printf '%s' "$lang"
}

# Package and service status queries
installed() {
	local _feat_key=""
	case "$1" in
		luci-app-sqm|sqm-scripts) _feat_key="sqm" ;;
		luci-app-mwan3|mwan3) _feat_key="mwan3" ;;
		luci-app-nlbwmon|nlbwmon) _feat_key="nlbwmon" ;;
		luci-app-upnp|miniupnpd*) _feat_key="upnp" ;;
		zerotier) _feat_key="zerotier" ;;
		wireguard|wireguard-tools|luci-proto-wireguard) _feat_key="wireguard" ;;
		irqbalance) _feat_key="irqbalance" ;;
		speedify|luci-app-speedify) _feat_key="speedify" ;;
		adblock|luci-app-adblock|adguardhome) _feat_key="adblock" ;;
		usteer|luci-app-usteer) _feat_key="usteer" ;;
		htop) _feat_key="htop" ;;
		kmod-zram|zram-swap) _feat_key="zram" ;;
		ksmbd|ksmbd-server) _feat_key="ksmbd" ;;
		wol|etherwake) _feat_key="wol" ;;
		ark-hardware-tune|hardware_tune) _feat_key="hardware_tune" ;;
		ark-firewall-guard|firewall_guard) _feat_key="firewall_guard" ;;
		ark-autowan|autowan) _feat_key="autowan" ;;
		ark-clock-preserver|clock_preserver) _feat_key="clock_preserver" ;;
		ark-safe-shutdown|safe_shutdown) _feat_key="safe_shutdown" ;;
		equipe-traffic-history|history) _feat_key="history" ;;
	esac
	if [ -n "$_feat_key" ] && [ "$(uci -q get "equipe_dashboard.${_feat_key}.user_removed" 2>/dev/null)" = "1" ]; then
		return 1
	fi
	case "$1" in
		ark-hardware-tune|ark-firewall-guard|ark-autowan|ark-clock-preserver|ark-safe-shutdown|equipe-traffic-history)
			([ -f "${ARK_ROOT}/etc/init.d/$1" ] || [ -f "/etc/init.d/$1" ]) && return 0
			return 1
			;;
		luci-app-sqm) ([ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ] || [ -f /usr/share/luci/menu.d/luci-app-sqm.json ]) && return 0 ;;
		luci-app-mwan3) ([ -f "${ARK_ROOT}/etc/config/mwan3" ] || [ -f /etc/config/mwan3 ] || [ -f /usr/share/luci/menu.d/luci-app-mwan3.json ]) && return 0 ;;
		luci-app-nlbwmon) ([ -f "${ARK_ROOT}/etc/config/nlbwmon" ] || [ -f /etc/config/nlbwmon ] || [ -f /usr/share/luci/menu.d/luci-app-nlbwmon.json ]) && return 0 ;;
		luci-app-upnp) ([ -f "${ARK_ROOT}/etc/config/upnpd" ] || [ -f /etc/config/upnpd ] || [ -f /usr/share/luci/menu.d/luci-app-upnp.json ]) && return 0 ;;
		luci-app-uhttpd) ([ -f "${ARK_ROOT}/usr/share/luci/menu.d/luci-app-uhttpd.json" ] || [ -f /usr/share/luci/menu.d/luci-app-uhttpd.json ]) && return 0 ;;
		zerotier) ([ -x "${ARK_ROOT}/usr/sbin/zerotier-one" ] || [ -f "${ARK_ROOT}/etc/init.d/zerotier" ] || [ -x /usr/sbin/zerotier-one ] || [ -f /etc/init.d/zerotier ]) && return 0 ;;
		wireguard|wireguard-tools) ([ -x "${ARK_ROOT}/usr/bin/wg" ] || [ -x /usr/bin/wg ] || [ -f /lib/netifd/proto/wireguard.sh ]) && return 0 ;;
		irqbalance) ([ -x "${ARK_ROOT}/usr/sbin/irqbalance" ] || [ -f "${ARK_ROOT}/etc/init.d/irqbalance" ] || [ -x /usr/sbin/irqbalance ] || [ -f /etc/init.d/irqbalance ]) && return 0 ;;
		speedify) ([ -x "${ARK_ROOT}/usr/share/speedify/speedify" ] || [ -x /usr/share/speedify/speedify ] || [ -x /usr/bin/speedify ] || [ -x /tmp/speedify/speedify ]) && return 0 ;;
		luci-app-speedify) ([ -f /usr/share/luci/menu.d/luci-app-speedify.json ] || [ -f /usr/lib/lua/luci/controller/speedify.lua ]) && return 0 ;;
		history) ([ -x "${ARK_ROOT}/usr/sbin/equipe-traffic-history" ] || [ -f "${ARK_ROOT}/etc/init.d/equipe-traffic-history" ] || [ -f "${ARK_ROOT}/tmp/equipe-traffic-history.csv" ] || [ -x /usr/sbin/equipe-traffic-history ] || [ -f /etc/init.d/equipe-traffic-history ]) && return 0 ;;
		custom_qos) (command -v tc >/dev/null 2>&1 || [ -f "${ARK_ROOT}/etc/config/qos_equipe" ] || [ -f /etc/config/qos_equipe ]) && return 0 ;;
		usteer|luci-app-usteer) ([ -x "${ARK_ROOT}/usr/sbin/usteerd" ] || [ -x /sbin/usteerd ] || [ -x /usr/sbin/usteerd ] || [ -f "${ARK_ROOT}/etc/init.d/usteer" ] || [ -f /etc/init.d/usteer ] || [ -f /usr/lib/opkg/info/usteer.control ]) && return 0 ;;
		htop) ([ -x "${ARK_ROOT}/usr/bin/htop" ] || [ -x /usr/bin/htop ] || [ -x /usr/sbin/htop ]) && return 0 ;;
		ksmbd|ksmbd-server) ([ -x "${ARK_ROOT}/etc/init.d/ksmbd" ] || [ -x /etc/init.d/ksmbd ] || [ -x /usr/sbin/ksmbd.mountd ]) && return 0 ;;
		wol|etherwake) ([ -x "${ARK_ROOT}/usr/bin/etherwake" ] || [ -x /usr/bin/etherwake ] || [ -x /usr/sbin/etherwake ] || command -v etherwake >/dev/null 2>&1) && return 0 ;;
		adblock|luci-app-adblock|adguardhome) ([ -x "${ARK_ROOT}/etc/init.d/adblock" ] || [ -f "${ARK_ROOT}/etc/config/adblock" ] || [ -x /etc/init.d/adblock ] || [ -x /usr/bin/AdGuardHome ] || [ -x /etc/init.d/adguardhome ]) && return 0 ;;
	esac
	if ark_has_apk; then
		apk info -e "$1" >/dev/null 2>&1
	elif [ -d /usr/lib/opkg/info ]; then
		[ -f "/usr/lib/opkg/info/$1.control" ] || [ -f "/usr/lib/opkg/info/$1.list" ]
	else
		opkg status "$1" 2>/dev/null | grep -q '^Status:.* installed$'
	fi
}

hidden() {
	[ "$(uci -q get equipe_dashboard.$1.hidden)" = 1 ]
}

running() {
	case "$1" in
		mwan3) pgrep -f mwan3rtmon >/dev/null 2>&1 || pgrep -f mwan3track >/dev/null 2>&1 ;;
		history|equipe-traffic-history) pidof equipe-traffic-history >/dev/null 2>&1 || pgrep -f equipe-traffic-history >/dev/null 2>&1 ;;
		upnp) pidof miniupnpd >/dev/null 2>&1 ;;
		usteer) pidof usteerd >/dev/null 2>&1 ;;
		irqbalance) pidof irqbalance >/dev/null 2>&1 ;;
		nlbwmon) pidof nlbwmon >/dev/null 2>&1 ;;
		ksmbd|ksmbd-server) pidof ksmbd.mountd >/dev/null 2>&1 || pgrep -f ksmbd >/dev/null 2>&1 || { [ -x "${ARK_ROOT}/etc/init.d/ksmbd" ] && "${ARK_ROOT}/etc/init.d/ksmbd" status 2>/dev/null | grep -E -qi 'running|active'; } || { [ -x /etc/init.d/ksmbd ] && /etc/init.d/ksmbd status 2>/dev/null | grep -E -qi 'running|active'; } ;;
		wol|etherwake) installed wol ;;
		*)
			pidof "$1" >/dev/null 2>&1 || pgrep -x "$1" >/dev/null 2>&1 || {
				[ -x "/etc/init.d/$1" ] && {
					"/etc/init.d/$1" status 2>/dev/null | grep -E -qi 'running|active' || \
					"/etc/init.d/$1" enabled >/dev/null 2>&1
				}
			}
			;;
	esac
}

# Version and identity helpers
ark_current_version() {
	if [ -f "${ARK_ROOT}/usr/share/ark-router/VERSION" ]; then
		cat "${ARK_ROOT}/usr/share/ark-router/VERSION" 2>/dev/null
	elif [ -f "/usr/share/ark-router/VERSION" ]; then
		cat /usr/share/ark-router/VERSION 2>/dev/null
	else
		printf '%s' "$ARK_ROUTER_VERSION"
	fi
}

ark_update_repo() {
	uci -q get equipe_dashboard.update.repo 2>/dev/null || printf '%s' "$ARK_UPDATE_REPO_DEFAULT"
}

normalize_version() {
	printf '%s' "$1" | sed 's/^v//; s/[^0-9.].*$//'
}

# Safe concurrency locking for BusyBox ash
ARK_LOCK_DIR="${ARK_ROOT}/var/lock"
[ -d "$ARK_LOCK_DIR" ] || ARK_LOCK_DIR="${ARK_ROOT}/tmp"

ark_acquire_lock() {
	local _lockname _lockfile _tries _holder
	_lockname="${1:-ark_operation}"
	_lockfile="${ARK_LOCK_DIR}/${_lockname}.lock"
	_tries=0
	while [ "$_tries" -lt 50 ]; do
		if mkdir "${_lockfile}.d" 2>/dev/null; then
			echo "$$" > "${_lockfile}.d/pid"
			return 0
		fi
		# Check for stale lock
		if [ -f "${_lockfile}.d/pid" ]; then
			_holder="$(cat "${_lockfile}.d/pid" 2>/dev/null || true)"
			if [ -n "$_holder" ] && ! kill -0 "$_holder" 2>/dev/null; then
				rm -rf "${_lockfile}.d" 2>/dev/null || true
				continue
			fi
		fi
		sleep 0.1 2>/dev/null || sleep 1
		_tries=$((_tries + 1))
	done
	return 1
}

ark_release_lock() {
	local _lockname _lockfile
	_lockname="${1:-ark_operation}"
	_lockfile="${ARK_LOCK_DIR}/${_lockname}.lock"
	rm -rf "${_lockfile}.d" 2>/dev/null || true
}

ez_backup() {
	local stamp file stage _cfg_dir cfg
	stamp="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo unknown)"
	file="/tmp/ark-router-ezsetup-backup-$stamp.tar.gz"
	stage="/tmp/ark-router-ezsetup-backup-$stamp"
	rm -rf "$stage"
	mkdir -p "$stage/etc/config" "$stage/metadata" || return 1
	_cfg_dir="${ARK_ROOT}/etc/config"
	[ -d "$_cfg_dir" ] || _cfg_dir="/etc/config"
	for cfg in network wireless dhcp firewall sqm mwan3 uhttpd luci equipe_dashboard equipe_devices qos_equipe; do
		[ -f "$_cfg_dir/$cfg" ] && cp "$_cfg_dir/$cfg" "$stage/etc/config/$cfg"
	done
	{
		echo "ARK Router EZ Setup backup"
		echo "Created: $(date 2>/dev/null || true)"
		echo "Restore command:"
		echo "  tar -xzf $file -C /"
		echo "  /etc/init.d/network reload"
		echo "  /etc/init.d/dnsmasq restart"
		echo "  /etc/init.d/firewall restart"
	} > "$stage/metadata/README.txt"
	tar -czf "$file" -C "$stage" . || return 1
	rm -rf "$stage"
	ls -1t /tmp/ark-router-ezsetup-backup-*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
	ls -1t /tmp/ark-profile-backup-*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
	command -v ez_set >/dev/null 2>&1 && ez_set backup "$file"
	printf '%s' "$file"
}

detect_dns_blocker() {
	if pgrep -x 'AdGuardHome' >/dev/null 2>&1 || pgrep -x 'adguardhome' >/dev/null 2>&1; then
		echo "AdGuard Home"
		return 0
	fi
	if [ "$(uci -q get equipe_perf.settings.adblock_cloud || printf 0)" = 1 ]; then
		local cur_dns="$(uci -q get dhcp.@dnsmasq[0].server 2>/dev/null || true)"
		case " $cur_dns " in
			*" 1.1.1.2 "*|*" 1.0.0.2 "*|*" 1.1.1.3 "*|*" 1.0.0.3 "*|*" 94.140.14."* |*" 94.140.15."* |*" 208.67.222.123 "*|*" 208.67.220.123 "*|*" 185.228.168."* )
				echo "Bloqueador em Nuvem"
				return 0
				;;
			*)
				if [ -n "${ARK_ROOT:-}" ] || [ -z "$cur_dns" ]; then
					echo "Bloqueador em Nuvem"
					return 0
				fi
				uci -q set equipe_perf.settings.adblock_cloud='0'
				uci -q commit equipe_perf 2>/dev/null || true
				;;
		esac
	fi
	if [ -x /etc/init.d/adguardhome ] && /etc/init.d/adguardhome status 2>/dev/null | grep -v 'not running' | grep -q 'running'; then
		echo "AdGuard Home"
		return 0
	fi
	if [ -f /etc/init.d/adblock-fast ] && /etc/init.d/adblock-fast status 2>/dev/null | grep -v 'not running' | grep -q 'running'; then
		echo "Adblock Fast"
		return 0
	fi
	if [ -f /etc/init.d/adblock ] && /etc/init.d/adblock status 2>/dev/null | grep -v 'not running' | grep -q 'running'; then
		echo "Adblock"
		return 0
	fi
	if pgrep -x 'pihole-FTL' >/dev/null 2>&1; then
		echo "Pi-hole"
		return 0
	fi
	return 1
}

ark_calculate_rps_mask() {
	local cores="$1"
	[ -z "$cores" ] || [ "$cores" -lt 1 ] 2>/dev/null && cores=1

	awk -v cores="$cores" 'BEGIN {
		full_f = int(cores / 4);
		rem = cores % 4;
		prefix = "";
		if (rem == 1) prefix = "1";
		else if (rem == 2) prefix = "3";
		else if (rem == 3) prefix = "7";
		mask = prefix;
		for (i = 0; i < full_f; i++) mask = mask "f";
		if (mask == "") mask = "1";
		print mask;
	}' 2>/dev/null || echo "f"
}

ark_cake_memlimit() {
	local mem_file="/proc/meminfo"
	[ -n "${ARK_ROOT:-}" ] && [ -f "${ARK_ROOT}/proc/meminfo" ] && mem_file="${ARK_ROOT}/proc/meminfo"
	local mem_kb="$(awk '/MemTotal:/ {print $2; exit}' "$mem_file" 2>/dev/null || echo 262144)"
	if [ "$mem_kb" -gt 327680 ] 2>/dev/null; then
		printf '32M'
	elif [ "$mem_kb" -gt 196608 ] 2>/dev/null; then
		printf '16M'
	else
		printf '4M'
	fi
}


# Firewall-aware Addon Reconcilers and Variant Migration (fw4 vs fw3)
ark_upnp_is_legacy_iptables() {
	local opkg_info="/usr/lib/opkg/info"
	local upnp_bin="/usr/sbin/miniupnpd"
	[ -n "${ARK_ROOT}" ] && {
		opkg_info="${ARK_ROOT}/usr/lib/opkg/info"
		upnp_bin="${ARK_ROOT}/usr/sbin/miniupnpd"
	}
	if ark_has_apk; then
		apk info -e miniupnpd-iptables >/dev/null 2>&1 && return 0
	elif [ -f "${opkg_info}/miniupnpd-iptables.control" ] || [ -f "${opkg_info}/miniupnpd-iptables.list" ]; then
		return 0
	fi
	if [ -x "$upnp_bin" ]; then
		if command -v readelf >/dev/null 2>&1; then
			readelf -d "$upnp_bin" 2>/dev/null | grep -q 'libip4tc' && return 0
		elif command -v strings >/dev/null 2>&1; then
			strings "$upnp_bin" 2>/dev/null | grep -q 'libip4tc' && return 0
		fi
	fi
	if is_fw4; then
		if ark_has_apk; then
			apk info -e miniupnpd >/dev/null 2>&1 && ! apk info -e miniupnpd-nftables >/dev/null 2>&1 && return 0
		elif [ -f "${opkg_info}/miniupnpd.control" ] && [ ! -f "${opkg_info}/miniupnpd-nftables.control" ]; then
			return 0
		fi
	fi
	return 1
}

ark_upnp_is_legacy_nftables_on_fw3() {
	is_fw3 || return 1
	local opkg_info="/usr/lib/opkg/info"
	local upnp_bin="/usr/sbin/miniupnpd"
	[ -n "${ARK_ROOT}" ] && {
		opkg_info="${ARK_ROOT}/usr/lib/opkg/info"
		upnp_bin="${ARK_ROOT}/usr/sbin/miniupnpd"
	}
	if ark_has_apk; then
		apk info -e miniupnpd-nftables >/dev/null 2>&1 && return 0
	elif [ -f "${opkg_info}/miniupnpd-nftables.control" ] || [ -f "${opkg_info}/miniupnpd-nftables.list" ]; then
		return 0
	fi
	if [ -x "$upnp_bin" ]; then
		if command -v readelf >/dev/null 2>&1; then
			readelf -d "$upnp_bin" 2>/dev/null | grep -q 'libnftnl' && return 0
		elif command -v strings >/dev/null 2>&1; then
			strings "$upnp_bin" 2>/dev/null | grep -q 'libnftnl' && return 0
		fi
	fi
	return 1
}

ark_migrate_upnp_variant() {
	local target_engine="$(ark_firewall_engine)"
	local root_prefix="${ARK_ROOT:-}"
	local cfg_file="${root_prefix}/etc/config/upnpd"
	local init_script="${root_prefix}/etc/init.d/miniupnpd"
	local fw4_bin="${root_prefix}/sbin/fw4"
	local bak_file="/tmp/upnpd.conf.bak"

	if [ "$target_engine" = "fw4" ]; then
		ark_upnp_is_legacy_iptables || return 0
		logger -t ark-reconcile "Detectado miniupnpd legado (iptables) em motor fw4. Migrando para miniupnpd-nftables puro..."
		
		# 1. Parar servico ativo
		[ -x "$init_script" ] && "$init_script" stop >/dev/null 2>&1 || true
		killall miniupnpd 2>/dev/null || true
		
		# 2. Preservar configuracoes UCI
		[ -f "$cfg_file" ] && cp -f "$cfg_file" "$bak_file" 2>/dev/null || true
		
		# 3. Remover pacote incompativel
		if ark_has_apk; then
			apk del miniupnpd-iptables miniupnpd >/dev/null 2>&1 || true
		else
			opkg remove --force-depends miniupnpd-iptables miniupnpd >/dev/null 2>&1 || true
		fi
		
		# 4. No fw4 puro (nftables), nao invocamos iptables/ip6tables para evitar instanciacao de tabelas legadas indesejadas no kernel
		
		# 5. Instalar pacote oficial nftables
		if ark_has_apk; then
			apk update >/dev/null 2>&1 || true
			apk add luci-app-upnp miniupnpd-nftables >/dev/null 2>&1 || true
		else
			opkg update >/dev/null 2>&1 || true
			opkg install luci-app-upnp miniupnpd-nftables >/dev/null 2>&1 || true
		fi
		
		# 6. Restaurar config se necessario
		if [ -f "$bak_file" ]; then
			[ -s "$cfg_file" ] || cp -f "$bak_file" "$cfg_file" 2>/dev/null || true
			rm -f "$bak_file" 2>/dev/null || true
		fi
		
		# 7. Recarregar fw4 e reiniciar daemon
		[ -x "$fw4_bin" ] && "$fw4_bin" reload >/dev/null 2>&1 || true
		[ -x "$init_script" ] && {
			"$init_script" enable >/dev/null 2>&1 || true
			"$init_script" start >/dev/null 2>&1 || true
		}
		logger -t ark-reconcile "Migracao UPnP concluida: miniupnpd-nftables ativo no fw4."
		return 0

	elif [ "$target_engine" = "fw3" ]; then
		ark_upnp_is_legacy_nftables_on_fw3 || return 0
		logger -t ark-reconcile "Detectado miniupnpd-nftables em motor fw3 legado. Restaurando versao iptables retrocompativel..."
		
		[ -x "$init_script" ] && "$init_script" stop >/dev/null 2>&1 || true
		killall miniupnpd 2>/dev/null || true
		[ -f "$cfg_file" ] && cp -f "$cfg_file" "$bak_file" 2>/dev/null || true
		
		if ark_has_apk; then
			apk del miniupnpd-nftables >/dev/null 2>&1 || true
			apk add luci-app-upnp miniupnpd >/dev/null 2>&1 || true
		else
			opkg remove --force-depends miniupnpd-nftables >/dev/null 2>&1 || true
			opkg install luci-app-upnp miniupnpd >/dev/null 2>&1 || true
		fi
		
		if [ -f "$bak_file" ]; then
			[ -s "$cfg_file" ] || cp -f "$bak_file" "$cfg_file" 2>/dev/null || true
			rm -f "$bak_file" 2>/dev/null || true
		fi
		
		[ -x "${root_prefix}/etc/init.d/firewall" ] && "${root_prefix}/etc/init.d/firewall" reload >/dev/null 2>&1 || true
		[ -x "$init_script" ] && {
			"$init_script" enable >/dev/null 2>&1 || true
			"$init_script" start >/dev/null 2>&1 || true
		}
		logger -t ark-reconcile "Restauracao UPnP concluida: miniupnpd compativel ativo no fw3."
		return 0
	fi
	return 1
}

ark_sanitize_upnp_config() {
	local root_prefix="${ARK_ROOT:-}"
	local cfg="${root_prefix}/etc/config/upnpd"
	[ -f "$cfg" ] || return 0

	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"
	local changed=0

	# Em modo Gateway/Roteador com UPnP ativo, assegurar STUN Anycast Cloudflare para travessia de CGNAT
	if ! ark_is_satellite_or_ap; then
		local enabled="$($uci_cmd get upnpd.config.enabled || echo 0)"
		if [ "$enabled" = "1" ]; then
			if [ "$($uci_cmd get upnpd.config.use_stun || echo 0)" != "1" ]; then
				$uci_cmd set upnpd.config.use_stun='1'
				changed=1
			fi
			if [ "$($uci_cmd get upnpd.config.stun_host || echo '')" != "stun.cloudflare.com" ]; then
				$uci_cmd set upnpd.config.stun_host='stun.cloudflare.com'
				changed=1
			fi
			if [ "$($uci_cmd get upnpd.config.stun_port || echo '')" != "3478" ]; then
				$uci_cmd set upnpd.config.stun_port='3478'
				changed=1
			fi
		fi
	fi

	if [ "$changed" = "1" ]; then
		$uci_cmd commit upnpd
		if [ "$($uci_cmd get upnpd.config.enabled || echo 0)" = "1" ]; then
			[ -z "$root_prefix" ] && [ -x /etc/init.d/miniupnpd ] && /etc/init.d/miniupnpd restart >/dev/null 2>&1 || true
		else
			[ -z "$root_prefix" ] && [ -x /etc/init.d/miniupnpd ] && /etc/init.d/miniupnpd stop >/dev/null 2>&1 || true
		fi
	fi
	return 0
}

# Safe Storage & Service Shutdown before Reboot
# Interrompe graciosamente servicos que gravam em midias externas (servidores web,
# bancos de dados, downloads, compartilhamentos de arquivos e midia),
# e descarrega todos os buffers de RAM do kernel de forma segura antes do reinicio.
ark_safe_storage_reboot() {
	local srv
	local root_prefix="${ARK_ROOT:-}"
	logger -t ark-safe-storage "Iniciando sequencia de encerramento seguro e protecao de armazenamento..."

	# 1. Pausa graciosa e encerramento de downloads (Transmission, Aria2)
	if pidof transmission-daemon >/dev/null 2>&1; then
		logger -t ark-safe-storage "Transmission ativo: pausando downloads e salvando metadados..."
		if command -v transmission-remote >/dev/null 2>&1; then
			local t_port="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].rpc_port 2>/dev/null || echo 9091)"
			local t_auth=""
			local t_auth_req="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].rpc_authentication_required 2>/dev/null || echo 0)"
			if [ "$t_auth_req" = "1" ] || [ "$t_auth_req" = "true" ]; then
				local t_user="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].rpc_username 2>/dev/null || echo '')"
				local t_pass="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].rpc_password 2>/dev/null || echo '')"
				[ -n "$t_user" ] && t_auth="-n ${t_user}:${t_pass}"
			fi
			transmission-remote "$t_port" $t_auth -t all --stop >/dev/null 2>&1 || true
		fi

		if [ -x "${root_prefix}/etc/init.d/transmission" ]; then
			"${root_prefix}/etc/init.d/transmission" stop >/dev/null 2>&1 || true
		else
			killall -TERM transmission-daemon 2>/dev/null || true
		fi

		local wait_cnt=0
		while pidof transmission-daemon >/dev/null 2>&1 && [ "$wait_cnt" -lt 6 ]; do
			usleep 500000 2>/dev/null || sleep 1
			wait_cnt=$((wait_cnt + 1))
		done
		if pidof transmission-daemon >/dev/null 2>&1; then
			killall -9 transmission-daemon 2>/dev/null || true
		fi
	fi

	if pidof aria2c >/dev/null 2>&1; then
		logger -t ark-safe-storage "Aria2 ativo: salvando sessao e encerrando downloads..."
		if [ -x "${root_prefix}/etc/init.d/aria2" ]; then
			"${root_prefix}/etc/init.d/aria2" stop >/dev/null 2>&1 || true
		else
			killall -TERM aria2c 2>/dev/null || true
		fi
		local wait_cnt=0
		while pidof aria2c >/dev/null 2>&1 && [ "$wait_cnt" -lt 6 ]; do
			usleep 500000 2>/dev/null || sleep 1
			wait_cnt=$((wait_cnt + 1))
		done
		if pidof aria2c >/dev/null 2>&1; then
			killall -9 aria2c 2>/dev/null || true
		fi
	fi

	# 2. Interromper daemons de servidores web e bancos de dados (fechar conexoes e locks)
	for srv in nginx lighttpd apache2 mysqld mariadb uwsgi php-fpm; do
		if [ -x "${root_prefix}/etc/init.d/$srv" ]; then
			"${root_prefix}/etc/init.d/$srv" stop >/dev/null 2>&1 || true
		fi
	done

	# 3. Interromper daemons de rede com escrita em disco (Samba, FTP, DLNA)
	for srv in smbd nmbd samba samba4 vsftpd minidlna gerbera; do
		if [ -x "${root_prefix}/etc/init.d/$srv" ]; then
			"${root_prefix}/etc/init.d/$srv" stop >/dev/null 2>&1 || true
		fi
	done

	# 4. Forcar nlbwmon a gravar estatisticas de trafego acumuladas
	if pidof nlbwmon >/dev/null 2>&1; then
		killall -USR1 nlbwmon 2>/dev/null || true
	fi

	# 5. Sincronizacao de memoria RAM para os discos fisicos (sync multiplo)
	sync
	sync
	sync

	logger -t ark-safe-storage "Protecao de armazenamento concluida. Buffers descarregados com sucesso."
	return 0
}

# Auditoria e endurecimento do Transmission contra vazamentos de protocolo
ark_harden_transmission_config() {
	local root_prefix="${ARK_ROOT:-}"
	local cfg="${root_prefix}/etc/config/transmission"
	[ -f "$cfg" ] || return 0

	local changed=0
	# 1. UPnP: desativar para evitar chamadas de miniupnpd/iptables no fw4
	if [ "$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].port_forwarding_enabled)" != "0" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].port_forwarding_enabled='0'
		changed=1
	fi

	# 2. Criptografia: forcar criptografia (1=prefer, 2=require) para eliminar vazamento em texto claro
	local enc="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].encryption)"
	if [ "$enc" = "0" ] || [ -z "$enc" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].encryption='1'
		changed=1
	fi

	# 3. LPD: desativar multicast local na LAN para evitar vazamento de hashes e acordar Wi-Fi
	if [ "$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].lpd_enabled)" != "0" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].lpd_enabled='0'
		changed=1
	fi

	# 4. Desativar uTP (LEDBAT) para evitar estrangulamento de banda e tempestade UDP em userspace
	if [ "$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].utp_enabled)" != "false" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].utp_enabled='false'
		changed=1
	fi

	# 5. Otimizacao de limites de peers para conexoes de alta velocidade (evita sobrecarga de CPU single-thread)
	local p_torrent="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].peer_limit_per_torrent)"
	if [ -z "$p_torrent" ] || [ "$p_torrent" -gt 80 ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].peer_limit_per_torrent='60'
		changed=1
	fi

	local p_global="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].peer_limit_global)"
	if [ -z "$p_global" ] || [ "$p_global" -gt 250 ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].peer_limit_global='180'
		changed=1
	fi

	# 6. Prioridade normal no agendador do Kernel (elimina nice 10)
	if [ "$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].nice)" = "10" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].nice='0'
		changed=1
	fi

	if [ "$changed" -eq 1 ]; then
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit transmission 2>/dev/null || true
		logger -t ark-transmission "Configuracoes de seguranca, desempenho Gigabit e blindagem uTP aplicadas no Transmission."
	fi
	return 0
}

# Limpeza de processos odhcp6c órfãos (PPID 1) para prevenir avalanches de recargas no netifd
ark_cleanup_dhcpv6_orphans() {
	local pid
	local cleaned=0
	for pid in $(pgrep -x odhcp6c 2>/dev/null || ps w 2>/dev/null | awk '/[o]dhcp6c/ {print $1}'); do
		[ -n "$pid" ] || continue
		local ppid=""
		if [ -f "/proc/$pid/status" ]; then
			ppid="$(awk '/^PPid:/ {print $2}' "/proc/$pid/status" 2>/dev/null)"
		fi
		if [ "$ppid" = "1" ]; then
			logger -t ark-anti-zombie "Encerrando processo odhcp6c orfao (PID $pid, PPID 1) para evitar loops de recarga..."
			kill -15 "$pid" 2>/dev/null || true
			sleep 0.2
			kill -9 "$pid" 2>/dev/null || true
			cleaned=$((cleaned + 1))
		fi
	done
	return $cleaned
}

# Sanitizacao Canonica de Interfaces WAN6 (prevencao contra device fisico bruto em vez de alias @wan)
ark_sanitize_wan6_config() {
	local sec claimed_parents
	local root_prefix="${ARK_ROOT:-}"
	local cfg="${root_prefix}/etc/config/network"
	[ -f "$cfg" ] || return 0
	ark_is_satellite_or_ap && return 0

	local changed=0
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"

	for sec in $($uci_cmd show network 2>/dev/null | sed -n 's/^network\.\([a-zA-Z0-9_]*\)=interface$/\1/p'); do
		local proto="$($uci_cmd get "network.$sec.proto" || echo '')"
		[ "$proto" = "dhcpv6" ] || continue

		local dev="$($uci_cmd get "network.$sec.device" || echo '')"
		[ -n "$dev" ] || dev="$($uci_cmd get "network.$sec.ifname" || echo '')"

		# Determina a interface WAN pai correspondente no netifd (ex: wan6 -> wan, wan2_6 -> wan2, etc.)
		local parent_wan="wan"
		case "$sec" in
			wan6|wan_6) parent_wan="wan" ;;
			wan2*|*wan2*|*wanb*) parent_wan="wan2" ;;
			wan3*|*wan3*) parent_wan="wan3" ;;
			wan4*|*wan4*) parent_wan="wan4" ;;
			*)
				parent_wan="${sec%_6}"
				parent_wan="${parent_wan%6}"
				[ -n "$parent_wan" ] || parent_wan="wan"
				;;
		esac

		# Se a WAN pai não existe, trata-se de interface órfã (ex: wan2 virou LAN). Exclui para evitar loop/sequestro!
		if [ -z "$($uci_cmd get "network.$parent_wan")" ]; then
			if [ "$parent_wan" = "wan" ]; then
				continue
			fi
			$uci_cmd delete "network.$sec"
			local z="$(firewall_wan_zone_section 2>/dev/null || echo '')"
			[ -n "$z" ] && $uci_cmd del_list "firewall.$z.network=$sec" 2>/dev/null || true
			changed=1
			logger -t ark-network-sanitize "Interface IPv6 orfa $sec removida (WAN pai $parent_wan nao existe no network)."
			continue
		fi

		# Previne que duas interfaces DHCPv6 reivindiquem o mesmo device pai (conflito netifd)
		case " $claimed_parents " in
			*" $parent_wan "*)
				$uci_cmd delete "network.$sec"
				local z="$(firewall_wan_zone_section 2>/dev/null || echo '')"
				[ -n "$z" ] && $uci_cmd del_list "firewall.$z.network=$sec" 2>/dev/null || true
				changed=1
				logger -t ark-network-sanitize "Interface IPv6 duplicada $sec removida (dispositivo @$parent_wan ja reivindicado)."
				continue
				;;
			*)
				claimed_parents="$claimed_parents $parent_wan"
				;;
		esac

		local canonical_dev="@${parent_wan}"
		local cur_ifname="$($uci_cmd get "network.$sec.ifname" || echo '')"
		if [ "$dev" != "$canonical_dev" ] || [ "$cur_ifname" != "$canonical_dev" ]; then
			$uci_cmd set "network.$sec.device=$canonical_dev"
			$uci_cmd set "network.$sec.ifname=$canonical_dev"
			changed=1
			logger -t ark-network-sanitize "Interface $sec: corrigido device/ifname de '${dev:-vazio}' para '$canonical_dev' para compatibilidade netifd universal."
		fi

		local reqaddr="$($uci_cmd get "network.$sec.reqaddress" || echo '')"
		if [ -z "$reqaddr" ]; then
			$uci_cmd set "network.$sec.reqaddress=try"
			changed=1
		fi
		local reqpfx="$($uci_cmd get "network.$sec.reqprefix" || echo '')"
		if [ -z "$reqpfx" ]; then
			$uci_cmd set "network.$sec.reqprefix=auto"
			changed=1
		fi
	done

	if [ "$changed" -eq 1 ]; then
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit network 2>/dev/null || true
		logger -t ark-network-sanitize "Configuracao de rede WAN6 sanitizada com sucesso no UCI."
	fi
	return 0
}

# Sanitizacao Canonica de IPv6 da LAN (compatibilidade Apple SLAAC e blindagem anti-colisao WAN)
ark_sanitize_lan_ipv6() {
	local flag pfx
	local root_prefix="${ARK_ROOT:-}"
	local dhcp_cfg="${root_prefix}/etc/config/dhcp"
	local net_cfg="${root_prefix}/etc/config/network"
	[ -f "$dhcp_cfg" ] || return 0
	ark_is_satellite_or_ap && return 0

	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"
	local changed_dhcp=0
	local changed_net=0

	# 1. Blindagem Apple iOS / SLAAC: apenas atua se o modo IPv6 estiver ativo como servidor de RA
	local cur_ra="$($uci_cmd get dhcp.lan.ra || echo 'disabled')"
	local ipv6_mode="$($uci_cmd get equipe_dashboard.ipv6.mode || echo '')"
	if [ "$cur_ra" = "server" ] && [ "$ipv6_mode" != "ipv4_only" ]; then
		for flag in $($uci_cmd get dhcp.lan.ra_flags); do
			if [ "$flag" = "managed-config" ]; then
				$uci_cmd del_list dhcp.lan.ra_flags='managed-config'
				changed_dhcp=1
			fi
		done
		if ! $uci_cmd get dhcp.lan.ra_flags | grep -q 'other-config'; then
			$uci_cmd add_list dhcp.lan.ra_flags='other-config'
			changed_dhcp=1
		fi
		if [ "$($uci_cmd get dhcp.lan.ra_slaac)" != "1" ]; then
			$uci_cmd set dhcp.lan.ra_slaac='1'
			changed_dhcp=1
		fi
		if [ "$($uci_cmd get dhcp.lan.ra_default)" != "1" ]; then
			$uci_cmd set dhcp.lan.ra_default='1'
			changed_dhcp=1
		fi
		if [ "$($uci_cmd get dhcp.lan.ra_prefer_old)" != "0" ]; then
			$uci_cmd set dhcp.lan.ra_prefer_old='0'
			changed_dhcp=1
		fi
		if [ "$($uci_cmd get dhcp.lan.ra_mininterval)" != "20" ] || [ "$($uci_cmd get dhcp.lan.ra_maxinterval)" != "60" ]; then
			$uci_cmd set dhcp.lan.ra_mininterval='20'
			$uci_cmd set dhcp.lan.ra_maxinterval='60'
			changed_dhcp=1
		fi
	fi

	# 2. Expurga prefixos estaticos de WAN PPPoE indevidamente atribuidos a bridge LAN
	if [ -f "$net_cfg" ]; then
		local lan_ip6_entries="$($uci_cmd get network.lan.ip6addr || true)"
		for pfx in $lan_ip6_entries; do
			case "$pfx" in
				*feca:e2a2*|*FECA:E2A2*)
					$uci_cmd del_list network.lan.ip6addr="$pfx" 2>/dev/null || true
					if [ "$($uci_cmd get network.lan.ip6addr 2>/dev/null)" = "$pfx" ]; then
						$uci_cmd delete network.lan.ip6addr 2>/dev/null || true
					fi
					changed_net=1
					logger -t ark-ipv6-sanitize "Prefixo de WAN '$pfx' removido da interface LAN para evitar blackhole."
					;;
			esac
		done
	fi

	if [ "$changed_dhcp" -eq 1 ]; then
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit dhcp 2>/dev/null || true
		[ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd reload >/dev/null 2>&1 || true
		logger -t ark-ipv6-sanitize "Flags de Router Advertisement (SLAAC) sanitizadas para compatibilidade Apple iOS/macOS."
	fi
	if [ "$changed_net" -eq 1 ]; then
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit network 2>/dev/null || true
	fi
	return 0
}

# Auto-ativacao inteligente de radios Wi-Fi de fabrica com preservacao estrita de escolha do usuario
ark_auto_enable_factory_wifi() {
	local r
	local root_prefix="${ARK_ROOT:-}"
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"

	local user_disabled="$($uci_cmd get equipe_dashboard.main.wifi_user_disabled 2>/dev/null || echo 0)"
	if [ "$user_disabled" = "1" ]; then
		return 0
	fi

	local w_cfg="${root_prefix}/etc/config/wireless"
	[ -f "$w_cfg" ] || return 0

	local total_radios=0
	local disabled_radios=0

	for r in $($uci_cmd show wireless 2>/dev/null | sed -n 's/^wireless\.\([a-zA-Z0-9_]*\)=wifi-device$/\1/p'); do
		total_radios=$((total_radios + 1))
		local dis="$($uci_cmd get "wireless.$r.disabled" || echo 0)"
		[ "$dis" = "1" ] && disabled_radios=$((disabled_radios + 1))
	done

	if [ "$total_radios" -gt 0 ] && [ "$total_radios" -eq "$disabled_radios" ]; then
		for r in $($uci_cmd show wireless 2>/dev/null | sed -n 's/^wireless\.\([a-zA-Z0-9_]*\)=wifi-device$/\1/p'); do
			$uci_cmd set "wireless.$r.disabled=0"
		done
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit wireless 2>/dev/null || true
		logger -t ark-wifi-guard "Radios Wi-Fi ativados do padrao virgem de fabrica do OpenWrt ($total_radios radios habilitados)."
		if [ -z "$root_prefix" ]; then
			(sleep 1; wifi reload >/dev/null 2>&1 || wifi up >/dev/null 2>&1 || true) &
		fi
		return 0
	fi
	return 1
}

# Verifica se o driver Ethernet do kernel suporta o MTU solicitado (ex: Baby Jumbo 1508 vs ag71xx hw max 1500)
ark_dev_supports_mtu() {
	local dev_name="$1"
	local req_mtu="${2:-1508}"
	local root_prefix="${ARK_ROOT:-}"
	[ -n "$dev_name" ] || return 1
	[ -n "$root_prefix" ] && return 0
	[ "$req_mtu" -le 1500 ] 2>/dev/null && return 0
	local base_dev="${dev_name%%.*}"
	[ -d "/sys/class/net/$base_dev" ] || return 0
	if [ -r "/sys/class/net/$base_dev/device/uevent" ]; then
		if grep -qE '^DRIVER=(ag71xx|fec)$' "/sys/class/net/$base_dev/device/uevent" 2>/dev/null; then
			return 1
		fi
	fi
	local max_k_mtu="$(ip -d link show "$base_dev" 2>/dev/null | sed -n 's/.*maxmtu \([0-9][0-9]*\).*/\1/p' | head -n 1)"
	if [ -n "$max_k_mtu" ] && [ "$req_mtu" -gt "$max_k_mtu" ] 2>/dev/null; then
		return 1
	fi
	local orig_mtu="$(cat "/sys/class/net/$base_dev/mtu" 2>/dev/null || echo 1500)"
	if [ -n "$orig_mtu" ] && [ "$orig_mtu" -ge "$req_mtu" ] 2>/dev/null; then
		return 0
	fi
	if ip link set "$base_dev" mtu "$req_mtu" 2>/dev/null; then
		return 0
	fi
	[ -n "$orig_mtu" ] && ip link set "$base_dev" mtu "$orig_mtu" 2>/dev/null || true
	return 1
}

# Consolidacao e Blindagem de MTU em secoes config device (Baby Jumbo 1508 / Padrao 1500)
# Elimina secoes duplicadas para a mesma porta fisica (e sub-interface VLAN 802.1Q se houver) e garante aplicacao no kernel e UCI.
_ark_set_single_device_mtu() {
	local s
	local dev_name="$1"
	local target_mtu="${2:-1508}"
	[ -n "$dev_name" ] || return 1

	local root_prefix="${ARK_ROOT:-}"
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"

	local matched_sections=""
	local mac_to_keep=""
	local primary_sec=""

	for s in $($uci_cmd show network 2>/dev/null | grep '=device$' | cut -d. -f2 | cut -d= -f1); do
		if [ "$($uci_cmd get "network.$s.name")" = "$dev_name" ]; then
			matched_sections="$matched_sections $s"
			local m="$($uci_cmd get "network.$s.macaddr")"
			[ -n "$m" ] && [ -z "$mac_to_keep" ] && mac_to_keep="$m"
		fi
	done

	# Em OpenWrt legado swconfig (ex: 19.07 ag71xx), secoes config device com type=8021q para eth0/eth0.X
	# conflitam com a VLAN implicita do switch0 no netifd e impedem o pppd de subir.
	if [ -z "$root_prefix" ] && is_swconfig; then
		case "$dev_name" in
			eth0|eth0.*)
				for s in $matched_sections; do
					$uci_cmd delete "network.$s"
				done
				uci commit network 2>/dev/null || true
				if [ "$(cat "/sys/class/net/$dev_name/mtu" 2>/dev/null)" != "$target_mtu" ]; then
					ip link set "$dev_name" mtu "$target_mtu" 2>/dev/null || true
				fi
				return 0
				;;
		esac
	fi

	if [ -n "$matched_sections" ]; then
		local is_first=1
		for s in $matched_sections; do
			if [ "$is_first" = 1 ]; then
				primary_sec="$s"
				is_first=0
			else
				$uci_cmd delete "network.$s"
			fi
		done
	else
		$uci_cmd add network device >/dev/null 2>&1
		primary_sec="@device[-1]"
		$uci_cmd set "network.$primary_sec.name=$dev_name"
	fi

	$uci_cmd set "network.$primary_sec.name=$dev_name"
	$uci_cmd set "network.$primary_sec.mtu=$target_mtu"
	case "$dev_name" in
		*.*)
			local base_if="${dev_name%%.*}"
			local vid_id="${dev_name#*.}"
			case "$vid_id" in
				''|*[!0-9]*) ;;
				*)
					[ -n "$($uci_cmd get "network.$primary_sec.type")" ] || $uci_cmd set "network.$primary_sec.type=8021q"
					[ -n "$($uci_cmd get "network.$primary_sec.ifname")" ] || $uci_cmd set "network.$primary_sec.ifname=$base_if"
					[ -n "$($uci_cmd get "network.$primary_sec.vid")" ] || $uci_cmd set "network.$primary_sec.vid=$vid_id"
					;;
			esac
			;;
	esac
	[ -n "$mac_to_keep" ] && $uci_cmd set "network.$primary_sec.macaddr=$mac_to_keep"
	uci ${root_prefix:+-c "$root_prefix/etc/config"} commit network 2>/dev/null || true

	if [ -n "$root_prefix" ] && [ -f "$root_prefix/sys/class/net/$dev_name/mtu" ]; then
		printf '%s\n' "$target_mtu" > "$root_prefix/sys/class/net/$dev_name/mtu" 2>/dev/null || true
	elif [ -z "$root_prefix" ] && [ "$(cat "/sys/class/net/$dev_name/mtu" 2>/dev/null)" != "$target_mtu" ]; then
		ip link set "$dev_name" mtu "$target_mtu" 2>/dev/null || true
	fi
}

ark_ensure_phys_device_mtu() {
	local s
	local phys_dev="$1"
	local target_mtu="${2:-1508}"
	[ -n "$phys_dev" ] || return 1

	local root_prefix="${ARK_ROOT:-}"
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"

	# Se phys_dev for uma VLAN 802.1Q (ex: eth1.10 ou device com option ifname), aplica na porta fisica pai primeiro e depois na VLAN (manual netifd OpenWrt)
	local parent_dev=""
	case "$phys_dev" in
		*.*) parent_dev="${phys_dev%%.*}" ;;
		*)
			for s in $($uci_cmd show network 2>/dev/null | grep '=device$' | cut -d. -f2 | cut -d= -f1); do
				if [ "$($uci_cmd get "network.$s.name")" = "$phys_dev" ]; then
					parent_dev="$($uci_cmd get "network.$s.ifname")"
					break
				fi
			done
			;;
	esac

	if [ "$target_mtu" -gt 1500 ] 2>/dev/null && ! ark_dev_supports_mtu "${parent_dev:-$phys_dev}" "$target_mtu"; then
		[ -n "$parent_dev" ] && [ "$parent_dev" != "$phys_dev" ] && _ark_set_single_device_mtu "$parent_dev" 1500
		_ark_set_single_device_mtu "$phys_dev" 1500
		return 1
	fi

	if [ -n "$parent_dev" ] && [ "$parent_dev" != "$phys_dev" ]; then
		_ark_set_single_device_mtu "$parent_dev" "$target_mtu"
	fi
	_ark_set_single_device_mtu "$phys_dev" "$target_mtu"
}

# Garante TCP MSS Clamping dinamico por rota (mtu_fix=1) na zona WAN do firewall (Single-WAN e Multi-WAN)
ark_ensure_wan_mtu_fix() {
	local z
	local root_prefix="${ARK_ROOT:-}"
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"
	local changed=0
	for z in $($uci_cmd show firewall 2>/dev/null | sed -n 's/^firewall\.\([^.=]*\)=zone$/\1/p'); do
		if [ "$($uci_cmd get "firewall.$z.name")" = "wan" ]; then
			if [ "$($uci_cmd get "firewall.$z.mtu_fix")" != "1" ]; then
				$uci_cmd set "firewall.$z.mtu_fix=1"
				changed=1
			fi
		fi
	done
	if [ "$changed" = 1 ]; then
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit firewall 2>/dev/null || true
	fi
}

# Sincroniza o ra_mtu do IPv6 Router Advertisement (odhcpd) na LAN/Wi-Fi com o menor MTU real das WANs ativas
# Garante que clientes Android/iOS/PC em IPv6 enviem pacotes UDP/QUIC/HTTP3 sem ICMPv6 Packet Too Big drops, mantendo a LAN/Wi-Fi local em 1500B.
ark_sync_lan_ipv6_ra_mtu() {
	local root_prefix="${ARK_ROOT:-}"
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"
	[ -f "${root_prefix}/etc/config/dhcp" ] || [ -f /etc/config/dhcp ] || return 0

	local min_wan_mtu=1500
	local w proto w_mtu
	for w in $($uci_cmd show network 2>/dev/null | sed -n 's/^network\.\(wan[0-9]*\)=interface$/\1/p'); do
		proto="$($uci_cmd get "network.$w.proto")"
		case "$proto" in
			pppoe)
				w_mtu=""
				if [ -n "$root_prefix" ] && [ -f "$root_prefix/sys/class/net/pppoe-$w/mtu" ]; then
					w_mtu="$(cat "$root_prefix/sys/class/net/pppoe-$w/mtu" 2>/dev/null)"
				elif [ -z "$root_prefix" ] && [ -f "/sys/class/net/pppoe-$w/mtu" ]; then
					w_mtu="$(cat "/sys/class/net/pppoe-$w/mtu" 2>/dev/null)"
				fi
				[ -n "$w_mtu" ] || w_mtu="$($uci_cmd get "network.$w.mtu")"
				[ -n "$w_mtu" ] || w_mtu=1492
				;;
			dhcp|static)
				w_mtu="$($uci_cmd get "network.$w.mtu")"
				[ -n "$w_mtu" ] || w_mtu=1500
				;;
			*) continue ;;
		esac
		case "$w_mtu" in
			''|*[!0-9]*) w_mtu=1500 ;;
		esac
		if [ "$w_mtu" -ge 1280 ] && [ "$w_mtu" -lt "$min_wan_mtu" ]; then
			min_wan_mtu="$w_mtu"
		fi
	done

	local cur_ra_mtu="$($uci_cmd get dhcp.lan.ra_mtu 2>/dev/null)"
	if [ "$cur_ra_mtu" != "$min_wan_mtu" ]; then
		$uci_cmd set "dhcp.lan.ra_mtu=$min_wan_mtu"
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit dhcp 2>/dev/null || true
		[ -z "$root_prefix" ] && [ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd reload >/dev/null 2>&1 || true
	fi
}

# Consolidacao e Blindagem de MAC Clonado em secoes config device e porta fisica
# Garante aplicacao 100% confiavel em PPPoE, DHCP, DSA switch e camada 2.
# Quando target_mac estiver vazio, remove clonagem e restaura MAC nativo de fabrica.
ark_ensure_phys_device_mac() {
	local s
	local phys_dev="$1"
	local target_mac="$2"
	[ -n "$phys_dev" ] || return 1

	local root_prefix="${ARK_ROOT:-}"
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"

	local matched_sections=""
	local primary_sec=""

	for s in $($uci_cmd show network 2>/dev/null | grep '=device$' | cut -d. -f2 | cut -d= -f1); do
		if [ "$($uci_cmd get "network.$s.name")" = "$phys_dev" ]; then
			matched_sections="$matched_sections $s"
		fi
	done

	# Em OpenWrt legado swconfig (ex: 19.07), network.<wan>.macaddr ja aplica o MAC na VLAN eth0.X nativamente;
	# criar config device para eth0.X conflita com a VLAN implicita do switch0 no netifd.
	if [ -z "$root_prefix" ] && is_swconfig; then
		case "$phys_dev" in
			eth0|eth0.*)
				for s in $matched_sections; do
					$uci_cmd delete "network.$s"
				done
				uci commit network 2>/dev/null || true
				if [ -n "$target_mac" ]; then
					target_mac="$(printf '%s' "$target_mac" | tr 'a-f' 'A-F')"
					ip link set dev "$phys_dev" address "$target_mac" 2>/dev/null || true
				fi
				return 0
				;;
		esac
	fi

	if [ -n "$matched_sections" ]; then
		local is_first=1
		for s in $matched_sections; do
			if [ "$is_first" = 1 ]; then
				primary_sec="$s"
				is_first=0
			else
				$uci_cmd delete "network.$s"
			fi
		done
	fi

	if [ -n "$target_mac" ]; then
		# Normaliza para letras maiusculas
		target_mac="$(printf '%s' "$target_mac" | tr 'a-f' 'A-F')"
		if [ -z "$primary_sec" ]; then
			$uci_cmd add network device >/dev/null 2>&1
			primary_sec="@device[-1]"
		fi
		$uci_cmd set "network.$primary_sec.name=$phys_dev"
		$uci_cmd set "network.$primary_sec.macaddr=$target_mac"
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit network 2>/dev/null || true

		if [ -z "$root_prefix" ]; then
			ip link set dev "$phys_dev" address "$target_mac" 2>/dev/null || true
		fi
	else
		# Clonagem DESATIVADA / VAZIA: restaura MAC nativo de fabrica
		if [ -n "$primary_sec" ]; then
			$uci_cmd delete "network.$primary_sec.macaddr"
			# Se a secao device nao tiver outras configuracoes alem de name, limpa secao orfa
			local dev_mtu="$($uci_cmd get "network.$primary_sec.mtu")"
			local dev_ports="$($uci_cmd get "network.$primary_sec.ports")"
			if [ -z "$dev_mtu" ] && [ -z "$dev_ports" ]; then
				$uci_cmd delete "network.$primary_sec"
			fi
		fi
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit network 2>/dev/null || true

		if [ -z "$root_prefix" ]; then
			local perm_mac=""
			command -v ethtool >/dev/null 2>&1 && perm_mac="$(ethtool -P "$phys_dev" 2>/dev/null | awk '{print $NF}')"
			[ -z "$perm_mac" ] && [ -f "/sys/class/net/$phys_dev/perm_addr" ] && perm_mac="$(cat "/sys/class/net/$phys_dev/perm_addr" 2>/dev/null || true)"
			[ -z "$perm_mac" ] && perm_mac="$(ip -d link show "$phys_dev" 2>/dev/null | grep -o 'permaddr [0-9a-fA-F:]*' | awk '{print $2}' || true)"
			if [ -z "$perm_mac" ] && [ -f /etc/board.json ] && command -v jsonfilter >/dev/null 2>&1; then
				perm_mac="$(jsonfilter -i /etc/board.json -e "@.network.$phys_dev.macaddr" 2>/dev/null || jsonfilter -i /etc/board.json -e "@.network.wan.macaddr" 2>/dev/null || true)"
			fi
			if [ -n "$perm_mac" ] && [ "$perm_mac" != "00:00:00:00:00:00" ]; then
				ip link set dev "$phys_dev" address "$perm_mac" 2>/dev/null || true
			fi
		fi
	fi
}

# ============================================================================
# PRIMITIVAS COMPARTILHADAS ENTRE MODULOS (ISOLAMENTO DE ESCOPO 'local')
# Centralizadas em common.sh para evitar cross-sourcing circular de modulos
# inteiros e falhas de 'command not found' entre dominios.
# ============================================================================

ez_get() { uci -q get "equipe_dashboard.setup.$1" 2>/dev/null || printf '%s' "$2"; }

ez_set() { uci -q set equipe_dashboard.setup=ezsetup; uci -q set "equipe_dashboard.setup.$1=$2"; }

cleanup_backup() {
	local stamp file
	stamp="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo unknown)"
	file="/tmp/ark-router-before-cleanup-$stamp.tar.gz"
	if command -v sysupgrade >/dev/null 2>&1; then sysupgrade -b "$file" >/dev/null 2>&1 || return 1
	else ez_backup >/dev/null || return 1; file="$(ez_get backup '')"
	fi
	uci -q set equipe_dashboard.cleanup=cleanup
	uci -q set equipe_dashboard.cleanup.last_backup="$file"
	uci commit equipe_dashboard
	printf '%s' "$file"
}

ark_kill_package_fetchers() {
	local pid
	ps w 2>/dev/null | awk '/downloads\.openwrt\.org|packages\.adb|APKINDEX|apk update|apk fetch/ && !/awk/ {print $1}' | while read -r pid; do
		[ -n "$pid" ] && kill "$pid" 2>/dev/null || true
	done
}

ark_run_limited() {
	local seconds="$1" pid i=0
	shift
	"$@" &
	pid="$!"
	while kill -0 "$pid" 2>/dev/null; do
		[ "$i" -ge "$seconds" ] && {
			kill "$pid" 2>/dev/null || true
			ark_kill_package_fetchers
			sleep 2
			kill -9 "$pid" 2>/dev/null || true
			ark_kill_package_fetchers
			wait "$pid" 2>/dev/null
			return 124
		}
		sleep 1
		i=$((i+1))
	done
	wait "$pid"
}

guest_l3_device() {
	local dev
	dev="$(ubus call network.interface.guest status 2>/dev/null | jsonfilter -e '@.l3_device' 2>/dev/null || true)"
	[ -n "$dev" ] || dev="$(ubus call network.interface.guest status 2>/dev/null | jsonfilter -e '@.device' 2>/dev/null || true)"
	valid_net_device "$dev" && printf '%s' "$dev"
}

active_wan_networks() {
	local network_section proto
	uci -q show network 2>/dev/null | sed -n 's/^network\.\(wan[0-9]*\)=interface$/\1/p' | while IFS= read -r network_section; do
		proto="$(uci -q get "network.$network_section.proto")"
		case "$proto" in dhcp|pppoe|static) printf '%s\n' "$network_section" ;; esac
	done
}

sqm_device_for_network() {
	local network_section="$1" proto device
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

find_dhcp_host() {
	local value key
	uci -q show dhcp 2>/dev/null | awk -F= -v wanted="$1" '
		/\.mac=/ {
			value=$2; gsub(/^\047|\047$/, "", value)
			if (toupper(value) == wanted) {
				key=$1; sub(/^dhcp\./, "", key); sub(/\.mac$/, "", key); print key; exit
			}
		}'
}

sanitize_dhcp_hostnames() {
	local changed=0 h cur_name clean_name
	for h in $(uci -q show dhcp 2>/dev/null | grep -E '\.name=' | cut -d. -f2 | cut -d= -f1 | sort -u); do
		cur_name="$(uci -q get "dhcp.$h.name" || true)"
		[ -n "$cur_name" ] || continue
		clean_name="$(printf '%s' "$cur_name" | sed 's/[^a-zA-Z0-9_-]/-/g; s/-\{2,\}/-/g; s/^-//; s/-$//')"
		[ -n "$clean_name" ] || clean_name="ark-$h"
		if [ "$cur_name" != "$clean_name" ]; then
			uci -q set "dhcp.$h.name=$clean_name"
			changed=1
		fi
	done
	[ "$changed" = 1 ] && uci commit dhcp || true
}

apply_lan_dhcp_dns() {
	local dns="$1" old_options opt
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

same_managed_subnet() {
	local candidate="$1" managed managed_ip prefix netmask network candidate_network
	for managed in lan guest; do
		managed_ip="$(ubus call "network.interface.$managed" status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null || true)"
		prefix="$(ubus call "network.interface.$managed" status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].mask' 2>/dev/null || true)"
		if [ -z "$managed_ip" ]; then
			managed_ip="$(uci -q get "network.$managed.ipaddr" 2>/dev/null || true)"
		fi
		if [ -z "$prefix" ]; then
			netmask="$(uci -q get "network.$managed.netmask" 2>/dev/null || echo 255.255.255.0)"
			case "$netmask" in
				255.255.255.0) prefix=24 ;;
				255.255.0.0)   prefix=16 ;;
				255.0.0.0)     prefix=8 ;;
				*)             prefix=24 ;;
			esac
		fi
		[ -n "$managed_ip" ] && [ -n "$prefix" ] || continue
		[ "$candidate" != "$managed_ip" ] || return 1
		if command -v ipcalc.sh >/dev/null 2>&1; then
			network="$(ipcalc.sh "$managed_ip/$prefix" 2>/dev/null | sed -n 's/^NETWORK=//p')"
			candidate_network="$(ipcalc.sh "$candidate/$prefix" 2>/dev/null | sed -n 's/^NETWORK=//p')"
			[ -n "$network" ] && [ "$network" = "$candidate_network" ] && return 0
		else
			[ "${managed_ip%.*}" = "${candidate%.*}" ] && return 0
		fi
	done
	return 1
}

sync_adguard_ipv6() {
	local enable_ipv6="${1:-}" cur_mode yaml="/etc/adguardhome/adguardhome.yaml"
	if [ -z "$enable_ipv6" ]; then
		cur_mode="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"
		[ "$cur_mode" != "ipv4_only" ] && enable_ipv6=1 || enable_ipv6=0
	fi
	[ -f "$yaml" ] || return 0
	cp -f "$yaml" "${yaml}.bak_ipv6" 2>/dev/null || true
	if [ "$enable_ipv6" = "1" ] || [ "$enable_ipv6" = "true" ]; then
		sed -i 's/^[[:space:]]*aaaa_disabled:.*/  aaaa_disabled: false/' "$yaml"
		if ! grep -q "2606:4700:4700::1111" "$yaml"; then
			sed -i '/^[[:space:]]*upstream_dns:/a \    - 2606:4700:4700::1111\n    - 2001:4860:4860::8888' "$yaml"
		fi
		if ! sed -n '/^[[:space:]]*bootstrap_dns:/,/^[a-z_]/p' "$yaml" | grep -q "2606:4700:4700::1111"; then
			sed -i '/^[[:space:]]*bootstrap_dns:/a \    - 2606:4700:4700::1111\n    - 2001:4860:4860::8888' "$yaml"
		fi
	else
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

firewall_wan_zone_section() {
	uci -q show firewall 2>/dev/null | awk -F= '
		/\.name='\''wan'\''$/ { s=$1; sub(/^firewall\./, "", s); sub(/\.name$/, "", s); print s; exit }
	'
}

firewall_zone_has_network() {
	local section="$1" network="$2"
	uci -q get "firewall.$section.network" 2>/dev/null | tr ' ' '\n' | grep -qx "$network"
}

lan_bridge_section() {
	uci -q show network | awk -F= '/\.name=.br-lan./ { key=$1; sub(/^network\./, "", key); sub(/\.name$/, "", key); print key; exit }'
}

lan_bridge_port_count() {
	local br="$(lan_bridge_section)"
	[ -n "$br" ] || { printf 0; return 0; }
	uci -q get "network.$br.ports" 2>/dev/null | wc -w
}

find_switch_vlan() {
	local target_vlan="$1" idx=0 v
	while true; do
		v="$(uci -q get "network.@switch_vlan[$idx].vlan")"
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
	local p="$1" target_vlan="${2:-1}" sec cur_ports new_ports="" item
	sec="$(find_switch_vlan "$target_vlan")"
	[ -n "$sec" ] || return 0
	cur_ports="$(uci -q get "network.$sec.ports")"
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
	local p="$1" target_vlan="${2:-1}" sec cur_ports item new_ports="" added=0
	sec="$(find_switch_vlan "$target_vlan")"
	[ -n "$sec" ] || return 0
	cur_ports="$(uci -q get "network.$sec.ports")"
	for item in $cur_ports; do
		if [ "$item" = "$p" ] || [ "$item" = "${p}t" ]; then
			return 0
		fi
	done
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

# Leitura canonica do /etc/board.json (Manual Oficial OpenWrt) para topologia swconfig e geracao netifd
ark_board_switch_role_ports() {
	local role="${1:-wan}"
	local bfile="${ARK_ROOT:-}/etc/board.json"
	[ -f "$bfile" ] || bfile="/etc/board.json"
	local ports=""
	if [ -f "$bfile" ] && command -v jsonfilter >/dev/null 2>&1; then
		ports="$(jsonfilter -i "$bfile" -e "@.switch.*.roles[@.role=\"$role\"].ports" 2>/dev/null | head -n 1 || true)"
	fi
	if [ -z "$ports" ]; then
		if [ "$role" = "wan" ]; then
			ports="5 0t"
		else
			ports="1 2 3 4 0t"
		fi
	fi
	printf '%s' "$ports"
}

ark_board_switch_wan_port() {
	local bfile="${ARK_ROOT:-}/etc/board.json"
	[ -f "$bfile" ] || bfile="/etc/board.json"
	local p=""
	if [ -f "$bfile" ] && command -v jsonfilter >/dev/null 2>&1; then
		p="$(jsonfilter -i "$bfile" -e '@.switch.*.ports[@.role="wan"].num' 2>/dev/null | head -n 1 || true)"
	fi
	if [ -z "$p" ]; then
		local item
		for item in $(ark_board_switch_role_ports wan); do
			case "$item" in
				*t) ;;
				[0-9]*) p="$item"; break ;;
			esac
		done
	fi
	printf '%s' "${p:-5}"
}

ark_board_switch_cpu_tag() {
	local item
	for item in $(ark_board_switch_role_ports wan); do
		case "$item" in
			*t) printf '%s' "$item"; return 0 ;;
		esac
	done
	printf '0t'
}

ark_board_uses_legacy_ifname() {
	is_swconfig && return 0
	local bfile="${ARK_ROOT:-}/etc/board.json"
	[ -f "$bfile" ] || bfile="/etc/board.json"
	if [ -f "$bfile" ] && command -v jsonfilter >/dev/null 2>&1; then
		local has_ifname="$(jsonfilter -i "$bfile" -e '@.network.wan.ifname' 2>/dev/null || true)"
		local has_device="$(jsonfilter -i "$bfile" -e '@.network.wan.device' 2>/dev/null || true)"
		[ -n "$has_ifname" ] && [ -z "$has_device" ] && return 0
	fi
	return 1
}

swconfig_port_num() {
	case "$1" in
		eth*.*|eth*|br-*|wlan*|phy*|pppoe-*|@*)
			return 1
			;;
		wan)
			ark_board_switch_wan_port
			return 0
			;;
		lan[1-4]|port[1-5]|[1-5])
			printf '%s' "$1" | tr -cd '0-9'
			return 0
			;;
	esac
	return 1
}

bridge_has_port() {
	local br="$1" port="$2"
	uci -q get "network.$br.ports" 2>/dev/null | tr ' ' '\n' | grep -qx "$port"
}

add_lan_port() {
	local port="$1" p br wan_p
	if is_swconfig; then
		p="$(swconfig_port_num "$port" 2>/dev/null || true)"
		wan_p="$(ark_board_switch_wan_port)"
		[ -n "$p" ] && [ "$p" != "$wan_p" ] && swconfig_add_port_to_vlan "$p" 1
		return 0
	fi
	br="$(lan_bridge_section)"
	[ -n "$br" ] || return 0
	bridge_has_port "$br" "$port" || uci -q add_list "network.$br.ports=$port"
	ark_ensure_phys_device_mac "$port" ""
}

remove_lan_port() {
	local port="$1" p br
	if is_swconfig; then
		p="$(swconfig_port_num "$port" 2>/dev/null || true)"
		[ -n "$p" ] && swconfig_remove_port_from_vlan "$p" 1
		return 0
	fi
	br="$(lan_bridge_section)"
	[ -n "$br" ] || return 0
	uci -q del_list "network.$br.ports=$port" 2>/dev/null || true
}

configure_uhttpd_listeners() {
	uci -q delete uhttpd.main.listen_http
	uci -q delete uhttpd.main.listen_https
	uci -q add_list "uhttpd.main.listen_http=0.0.0.0:80"
	uci -q add_list "uhttpd.main.listen_https=0.0.0.0:443"
	uci -q add_list "uhttpd.main.listen_http=[::]:80" 2>/dev/null || true
	uci -q add_list "uhttpd.main.listen_https=[::]:443" 2>/dev/null || true
	uci -q set uhttpd.main.rfc1918_filter=0
	uci commit uhttpd
}

zerotier_ram_compress() {
	local overlay_total
	overlay_total="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $2}')"
	case "$overlay_total" in ''|*[!0-9]*) overlay_total=65536 ;; esac
	if [ "$overlay_total" -le 16384 ]; then
		if [ -f /rom/usr/lib/libstdc++.so.6.0.33 ] || [ -f /rom/usr/bin/zerotier-one ]; then
			rm -f /etc/ark-router/zerotier-pkg.tar.gz /etc/ark-router/zerotier-libs.tar.gz 2>/dev/null || true
			return 0
		fi
		if [ -f /etc/ark-router/zerotier-pkg.tar.gz ]; then
			if [ ! -f /tmp/usr/lib/libstdc++.so.6.0.33 ] || [ ! -f /tmp/usr/bin/zerotier-one ]; then
				mkdir -p /tmp
				tar -xzf /etc/ark-router/zerotier-pkg.tar.gz -C /tmp/ 2>/dev/null
			fi
			[ -e /usr/lib/libstdc++.so.6.0.33 ] || ln -sf /tmp/usr/lib/libstdc++.so.6.0.33 /usr/lib/libstdc++.so.6.0.33
			[ -e /usr/lib/libstdc++.so.6 ] || ln -sf libstdc++.so.6.0.33 /usr/lib/libstdc++.so.6
			[ -e /usr/bin/zerotier-one ] || ln -sf /tmp/usr/bin/zerotier-one /usr/bin/zerotier-one
			chmod +x /tmp/usr/bin/zerotier-one 2>/dev/null || true
		elif [ -f /usr/lib/libstdc++.so.6.0.33 ] && [ ! -L /usr/lib/libstdc++.so.6.0.33 ]; then
			mkdir -p /etc/ark-router /tmp
			tar -czf /etc/ark-router/zerotier-pkg.tar.gz /usr/lib/libstdc++.so.6.0.33 /usr/bin/zerotier-one 2>/dev/null
			tar -xzf /etc/ark-router/zerotier-pkg.tar.gz -C /tmp/ 2>/dev/null
			rm -f /usr/lib/libstdc++.so.6.0.33 /usr/bin/zerotier-one /etc/ark-router/zerotier-libs.tar.gz 2>/dev/null || true
			ln -sf /tmp/usr/lib/libstdc++.so.6.0.33 /usr/lib/libstdc++.so.6.0.33
			ln -sf libstdc++.so.6.0.33 /usr/lib/libstdc++.so.6
			ln -sf /tmp/usr/bin/zerotier-one /usr/bin/zerotier-one
			chmod +x /tmp/usr/bin/zerotier-one 2>/dev/null || true
			[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram enable >/dev/null 2>&1 || true
		fi
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
	if [ "$(uci -q get dhcp.lan.ignore || echo 0)" = "1" ] || [ "$(uci -q get network.lan.proto || echo static)" = "dhcp" ]; then
		printf 'br-lan'
		return 0
	fi
	local def_dev="$(ip route show default 2>/dev/null | awk '/default/{print $5; exit}')"
	if [ -n "$def_dev" ] && [ -e "/sys/class/net/$def_dev" ]; then
		printf '%s' "$def_dev"
		return 0
	fi
	local iface auto status d
	for iface in wan wan2 wan1 wan3 wan4; do
		auto="$(uci -q get "network.$iface.auto" || echo 1)"
		[ "$auto" != "0" ] || continue
		status="$(ubus call "network.interface.$iface" status 2>/dev/null || true)"
		if echo "$status" | grep -q '"up": true'; then
			d="$(echo "$status" | grep -o '"l3_device": "[^"]*"' | cut -d'"' -f4)"
			[ -z "$d" ] && d="$(echo "$status" | grep -o '"device": "[^"]*"' | cut -d'"' -f4)"
			[ -z "$d" ] && d="$(uci -q get "network.$iface.device" || uci -q get "network.$iface.ifname" || echo "")"
			if [ -n "$d" ] && [ -e "/sys/class/net/$d" ]; then
				printf '%s' "$d"
				return 0
			fi
		fi
	done
	for iface in wan wan2 wan1; do
		auto="$(uci -q get "network.$iface.auto" || echo 1)"
		[ "$auto" != "0" ] || continue
		d="$(uci -q get "network.$iface.device" || uci -q get "network.$iface.ifname" || echo "")"
		if [ -n "$d" ] && [ -e "/sys/class/net/$d" ]; then
			if [ "$(cat "/sys/class/net/$d/carrier" 2>/dev/null || echo 0)" = "1" ]; then
				printf '%s' "$d"
				return 0
			fi
		fi
	done
	get_primary_wan_dev
}

get_internet_led_sysfs() {
	local cand p b
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
		b="$(basename "$p")"
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
	local cand
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

# Detecta se o kernel executa sob arquitetura Qualcomm QSDK / NSS / ECM (Kernel 5.4 QCA)
# Utilizado para isolar estritamente o workaround 'no-split-gso' do sch_cake (bug skb_gso_segment 0x8864)
# e a coordenacao de front_end_ipv4_stop no qca-nss-ecm sem afetar MediaTek Filogic (mt76 / PPE).
ark_has_qsdk_ecm() {
	local root_prefix="${ARK_ROOT:-}"
	if [ -n "$root_prefix" ]; then
		[ -d "$root_prefix/sys/kernel/debug/ecm" ] && return 0
	else
		[ -d /sys/kernel/debug/ecm ] && return 0
	fi
	ark_has_qca_wifi
}

# Detecta se o daemon leve de DNS-over-HTTPS (https-dns-proxy em C/libcurl HTTP/2) esta instalado
ark_has_doh_proxy() {
	local root_prefix="${ARK_ROOT:-}"
	if [ -n "$root_prefix" ]; then
		[ -x "$root_prefix/usr/sbin/https-dns-proxy" ]
	else
		[ -x /usr/sbin/https-dns-proxy ] || command -v https-dns-proxy >/dev/null 2>&1
	fi
}

# Sincroniza o https-dns-proxy (Dual-DoH RFC 8484 em 127.0.0.1:5053 e 127.0.0.1:5054) com blindagem UCI:
# - dnsmasq_config_update='-' (impede que o procd do pacote sobrescreva dhcp.@dnsmasq[0].server)
# - force_dns='0' (impede colisao com a regra ark_dns_intercept do ARK Router)
# Retorna 0 se o proxy DoH foi ativado e vinculado ao dnsmasq; retorna 1 para fallback UDP/TCP padrao.
ark_sync_doh_proxy() {
	local mode="${1:-disable}" arg1="${2:-}" arg2="${3:-}" arg3="${4:-}"
	local root_prefix="${ARK_ROOT:-}" uci_cmd cfg_file s b1 b2 u1 u2 nd_path ip1 ip2
	uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"
	cfg_file="${root_prefix}/etc/config/https-dns-proxy"

	if [ "$mode" = "disable" ] || ! ark_has_doh_proxy; then
		if [ -f "$cfg_file" ]; then
			$uci_cmd set https-dns-proxy.config=main 2>/dev/null || true
			$uci_cmd set https-dns-proxy.config.dnsmasq_config_update='-' 2>/dev/null || true
			$uci_cmd set https-dns-proxy.config.update_dnsmasq_config='-' 2>/dev/null || true
			$uci_cmd set https-dns-proxy.config.force_dns='0' 2>/dev/null || true
			uci ${root_prefix:+-c "$root_prefix/etc/config"} commit https-dns-proxy 2>/dev/null || true
		fi
		$uci_cmd delete dhcp.@dnsmasq[0].doh_backup_server 2>/dev/null || true
		$uci_cmd delete dhcp.@dnsmasq[0].doh_backup_noresolv 2>/dev/null || true
		$uci_cmd delete dhcp.@dnsmasq[0].doh_server 2>/dev/null || true
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit dhcp 2>/dev/null || true
		if [ -z "$root_prefix" ] && [ -x /etc/init.d/https-dns-proxy ]; then
			/etc/init.d/https-dns-proxy stop >/dev/null 2>&1 || true
		fi
		return 1
	fi

	mkdir -p "${root_prefix}/etc/config" 2>/dev/null || true
	[ -f "$cfg_file" ] || touch "$cfg_file"

	while $uci_cmd delete "https-dns-proxy.@https-dns-proxy[0]" 2>/dev/null; do :; done
	for s in $($uci_cmd show https-dns-proxy 2>/dev/null | sed -n 's/^https-dns-proxy\.\([^.=@]*\)=https-dns-proxy$/\1/p'); do
		$uci_cmd delete "https-dns-proxy.$s" 2>/dev/null || true
	done

	$uci_cmd set https-dns-proxy.config=main
	$uci_cmd set https-dns-proxy.config.dnsmasq_config_update='-'
	$uci_cmd set https-dns-proxy.config.update_dnsmasq_config='-'
	$uci_cmd set https-dns-proxy.config.force_dns='0'
	$uci_cmd delete dhcp.@dnsmasq[0].doh_backup_server 2>/dev/null || true
	$uci_cmd delete dhcp.@dnsmasq[0].doh_backup_noresolv 2>/dev/null || true
	$uci_cmd delete dhcp.@dnsmasq[0].doh_server 2>/dev/null || true
	uci ${root_prefix:+-c "$root_prefix/etc/config"} commit dhcp 2>/dev/null || true

	b1="1.1.1.1,1.0.0.1"
	u1="https://cloudflare-dns.com/dns-query"
	b2="8.8.8.8,8.8.4.4"
	u2="https://dns.google/dns-query"

	if [ "$mode" = "turbo" ]; then
		ip1="$(printf '%s' "$arg1" | awk '{print $1}')"
		ip2="$(printf '%s' "$arg1" | awk '{print $2}')"
		case "$ip1" in
			9.9.9.9|149.112.*) b1="9.9.9.9,149.112.112.112"; u1="https://dns.quad9.net/dns-query" ;;
			94.140.*) b1="94.140.14.14,94.140.15.15"; u1="https://dns.adguard-dns.com/dns-query" ;;
			8.8.8.8|8.8.4.4) b1="8.8.8.8,8.8.4.4"; u1="https://dns.google/dns-query"; b2="1.1.1.1,1.0.0.1"; u2="https://cloudflare-dns.com/dns-query" ;;
		esac
		case "$ip2" in
			9.9.9.9|149.112.*) b2="9.9.9.9,149.112.112.112"; u2="https://dns.quad9.net/dns-query" ;;
			94.140.*) b2="94.140.14.14,94.140.15.15"; u2="https://dns.adguard-dns.com/dns-query" ;;
		esac
	elif [ "$mode" = "cloud" ]; then
		case "$arg1" in
			cloudflare_family)
				b1="1.1.1.3,1.0.0.3"; u1="https://family.cloudflare-dns.com/dns-query"
				b2="1.0.0.3,1.1.1.3"; u2="https://family.cloudflare-dns.com/dns-query"
				;;
			cloudflare_security)
				b1="1.1.1.2,1.0.0.2"; u1="https://security.cloudflare-dns.com/dns-query"
				b2="1.0.0.2,1.1.1.2"; u2="https://security.cloudflare-dns.com/dns-query"
				;;
			quad9)
				b1="9.9.9.9,149.112.112.112"; u1="https://dns.quad9.net/dns-query"
				b2="149.112.112.112,9.9.9.9"; u2="https://dns.quad9.net/dns-query"
				;;
			opendns_family)
				b1="208.67.222.123,208.67.220.123"; u1="https://doh.familyshield.opendns.com/dns-query"
				b2="208.67.220.123,208.67.222.123"; u2="https://doh.familyshield.opendns.com/dns-query"
				;;
			cleanbrowsing_adult)
				b1="185.228.168.10,185.228.169.11"; u1="https://doh.cleanbrowsing.org/doh/adult-filter/"
				b2="185.228.169.11,185.228.168.10"; u2="https://doh.cleanbrowsing.org/doh/adult-filter/"
				;;
			cleanbrowsing_family)
				b1="185.228.168.168,185.228.169.168"; u1="https://doh.cleanbrowsing.org/doh/family-filter/"
				b2="185.228.169.168,185.228.168.168"; u2="https://doh.cleanbrowsing.org/doh/family-filter/"
				;;
			controld_full)
				b1="76.76.2.2,76.76.10.2"; u1="https://freedns.controld.com/p2"
				b2="76.76.10.2,76.76.2.2"; u2="https://freedns.controld.com/p2"
				;;
			nextdns)
				nd_path="/dns-query"
				local clean_nd_id
				clean_nd_id="$(printf '%s' "$arg3" | tr -cd 'a-zA-Z0-9_-')"
				[ -n "$clean_nd_id" ] && nd_path="/$clean_nd_id"
				b1="45.90.28.0,45.90.30.0"; u1="https://dns.nextdns.io${nd_path}"
				b2="45.90.30.0,45.90.28.0"; u2="https://dns.nextdns.io${nd_path}"
				;;
			adguard_dns|*)
				if [ "$arg2" = "true" ] || [ "$arg2" = "1" ]; then
					b1="94.140.14.15,94.140.15.16"; u1="https://family.adguard-dns.com/dns-query"
					b2="94.140.15.16,94.140.14.15"; u2="https://family.adguard-dns.com/dns-query"
				else
					b1="94.140.14.14,94.140.15.15"; u1="https://dns.adguard-dns.com/dns-query"
					b2="94.140.15.15,94.140.14.14"; u2="https://dns.adguard-dns.com/dns-query"
				fi
				;;
		esac
	fi

	$uci_cmd set https-dns-proxy.ark_doh1=https-dns-proxy
	$uci_cmd set "https-dns-proxy.ark_doh1.bootstrap_dns=$b1"
	$uci_cmd set "https-dns-proxy.ark_doh1.resolver_url=$u1"
	$uci_cmd set https-dns-proxy.ark_doh1.listen_addr='127.0.0.1'
	$uci_cmd set https-dns-proxy.ark_doh1.listen_port='5053'
	$uci_cmd set https-dns-proxy.ark_doh1.user='nobody'
	$uci_cmd set https-dns-proxy.ark_doh1.group='nogroup'

	$uci_cmd set https-dns-proxy.ark_doh2=https-dns-proxy
	$uci_cmd set "https-dns-proxy.ark_doh2.bootstrap_dns=$b2"
	$uci_cmd set "https-dns-proxy.ark_doh2.resolver_url=$u2"
	$uci_cmd set https-dns-proxy.ark_doh2.listen_addr='127.0.0.1'
	$uci_cmd set https-dns-proxy.ark_doh2.listen_port='5054'
	$uci_cmd set https-dns-proxy.ark_doh2.user='nobody'
	$uci_cmd set https-dns-proxy.ark_doh2.group='nogroup'

	uci ${root_prefix:+-c "$root_prefix/etc/config"} commit https-dns-proxy 2>/dev/null || true

	if [ -z "$root_prefix" ] && [ -x /etc/init.d/https-dns-proxy ]; then
		/etc/init.d/https-dns-proxy enable >/dev/null 2>&1 || true
		/etc/init.d/https-dns-proxy restart >/dev/null 2>&1 || true
	fi

	$uci_cmd delete dhcp.@dnsmasq[0].doh_backup_server 2>/dev/null || true
	$uci_cmd delete dhcp.@dnsmasq[0].doh_backup_noresolv 2>/dev/null || true
	$uci_cmd delete dhcp.@dnsmasq[0].doh_server 2>/dev/null || true
	$uci_cmd del_list dhcp.@dnsmasq[0].server='127.0.0.1#5053' 2>/dev/null || true
	$uci_cmd del_list dhcp.@dnsmasq[0].server='127.0.0.1#5054' 2>/dev/null || true
	$uci_cmd add_list dhcp.@dnsmasq[0].server='127.0.0.1#5053'
	$uci_cmd add_list dhcp.@dnsmasq[0].server='127.0.0.1#5054'
	$uci_cmd set dhcp.@dnsmasq[0].noresolv='1'
	uci ${root_prefix:+-c "$root_prefix/etc/config"} commit dhcp 2>/dev/null || true
	return 0
}

# ---------------------------------------------------------------------------
# Transactional Mutation Guard (prevents concurrent UCI commits / service reloads
# while guaranteeing zero ghost locks via kill -0 PID check + 25s stale TTL)
# ---------------------------------------------------------------------------
ark_is_readonly_action() {
	local act="${1:-}"
	local sub="${2:-}"
	case "$act" in
		*-status|*-status-*|*-get|*-list|*-check|*-check-*|*-audit|*-info|*-discover|*-fingerprints|*-stations|*-processes|*-logs|*-log|*-telemetry|*-qr|features|fast-targets|audit-system|ark-doctor|card-state-save|speedtest-*|starlink-telemetry|autowan-can-convert-wan|speedify-user)
			return 0
			;;
	esac
	case "$sub" in
		status|get|list|check|scan|discover|audit|info)
			return 0
			;;
	esac
	return 1
}

ark_acquire_mutation_lock() {
	local cmd_name="${1:-unknown}"
	local lock_dir="${ARK_ROOT}/tmp/ark_mutation.lock"
	local wait_ticks=0
	local max_wait_ticks=12

	mkdir -p "${ARK_ROOT}/tmp" 2>/dev/null || true

	while ! mkdir "$lock_dir" 2>/dev/null; do
		local owner_pid=""
		local lock_ts=0
		local now_ts
		now_ts=$(date +%s 2>/dev/null || echo 0)

		[ -f "$lock_dir/pid" ] && read -r owner_pid < "$lock_dir/pid" 2>/dev/null
		[ -f "$lock_dir/ts" ] && read -r lock_ts < "$lock_dir/ts" 2>/dev/null

		# Auto-heal ghost locks immediately if owner process exited or lock is older than 25s
		if [ -z "$owner_pid" ] || ! kill -0 "$owner_pid" 2>/dev/null || [ $((now_ts - lock_ts)) -gt 25 ]; then
			rm -rf "$lock_dir" 2>/dev/null
			continue
		fi

		wait_ticks=$((wait_ticks + 1))
		if [ "$wait_ticks" -ge "$max_wait_ticks" ]; then
			echo "Outra alteração ainda está sendo aplicada no roteador. Aguarde concluir." >&2
			return 1
		fi
		sleep 1
	done

	echo "$$" > "$lock_dir/pid" 2>/dev/null
	date +%s > "$lock_dir/ts" 2>/dev/null
	echo "$cmd_name" > "$lock_dir/cmd" 2>/dev/null
	return 0
}

ark_release_mutation_lock() {
	local lock_dir="${ARK_ROOT}/tmp/ark_mutation.lock"
	local owner_pid=""
	[ -f "$lock_dir/pid" ] && read -r owner_pid < "$lock_dir/pid" 2>/dev/null
	if [ "$owner_pid" = "$$" ] || [ -z "$owner_pid" ]; then
		rm -rf "$lock_dir" 2>/dev/null
	fi
	rm -f "${ARK_ROOT}/tmp/ark_dashboard_cache.json" 2>/dev/null || true
}

