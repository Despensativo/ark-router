#!/bin/sh
# /usr/lib/ark/common.sh - ARK Router Common Runtime & Environment Helper
# Compatible with BusyBox /bin/ash, OpenWrt 19.07-25.12, and sandbox test harnesses.

[ -z "${_ARK_COMMON_SH_LOADED:-}" ] || return 0
_ARK_COMMON_SH_LOADED=1

ARK_ROUTER_VERSION="1.0.2"
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

ark_has_fw4() {
	command -v fw4 >/dev/null 2>&1 || [ -x "${ARK_ROOT}/sbin/fw4" ]
}

ark_has_nftables() {
	command -v nft >/dev/null 2>&1 || [ -x "${ARK_ROOT}/usr/sbin/nft" ]
}

is_swconfig() {
	command -v swconfig >/dev/null 2>&1 && swconfig dev switch0 show >/dev/null 2>&1
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
	[ "$dhcp_ignore" = "1" ] && [ -n "$lan_gw" ] && return 0
	return 1
}

# Package and service status queries
installed() {
	case "$1" in
		luci-app-sqm) [ -f /etc/config/sqm ] || [ -f /usr/share/luci/menu.d/luci-app-sqm.json ] && return 0 ;;
		luci-app-mwan3) [ -f /etc/config/mwan3 ] || [ -f /usr/share/luci/menu.d/luci-app-mwan3.json ] && return 0 ;;
		luci-app-nlbwmon) [ -f /etc/config/nlbwmon ] || [ -f /usr/share/luci/menu.d/luci-app-nlbwmon.json ] && return 0 ;;
		luci-app-upnp) [ -f /etc/config/upnpd ] || [ -f /usr/share/luci/menu.d/luci-app-upnp.json ] && return 0 ;;
		luci-theme-argon) [ -d /www/luci-static/argon ] && return 0 ;;
		luci-app-uhttpd) [ -f /usr/share/luci/menu.d/luci-app-uhttpd.json ] && return 0 ;;
		tailscale) [ -x /usr/sbin/tailscale ] && return 0 ;;
		zerotier) ([ -x /usr/sbin/zerotier-one ] || [ -f /etc/init.d/zerotier ]) && return 0 ;;
		wireguard) ([ -x /usr/bin/wg ] || [ -f /lib/netifd/proto/wireguard.sh ]) && return 0 ;;
		irqbalance) ([ -x /usr/sbin/irqbalance ] || [ -f /etc/init.d/irqbalance ]) && return 0 ;;
		speedify) ([ -x /usr/share/speedify/speedify ] || [ -x /usr/bin/speedify ] || [ -x /tmp/speedify/speedify ]) && return 0 ;;
		luci-app-speedify) ([ -f /usr/share/luci/menu.d/luci-app-speedify.json ] || [ -f /usr/lib/lua/luci/controller/speedify.lua ]) && return 0 ;;
		history) ([ -x /usr/sbin/equipe-traffic-history ] || [ -f /etc/init.d/equipe-traffic-history ]) && return 0 ;;
		custom_qos) (command -v tc >/dev/null 2>&1 || [ -f /etc/config/qos_equipe ]) && return 0 ;;
		usteer|luci-app-usteer) ([ -x /sbin/usteerd ] || [ -x /usr/sbin/usteerd ] || [ -f /etc/init.d/usteer ] || [ -f /usr/lib/opkg/info/usteer.control ]) && return 0 ;;
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
	_lockname="${1:-ark_operation}"
	_lockfile="${ARK_LOCK_DIR}/${_lockname}.lock"
	rm -rf "${_lockfile}.d" 2>/dev/null || true
}

ez_backup() {
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
		echo "Bloqueador em Nuvem"
		return 0
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

