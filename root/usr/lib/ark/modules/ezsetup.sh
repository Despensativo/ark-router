#!/bin/sh
# /usr/lib/ark/modules/ezsetup.sh - ARK Router EZ Setup Wizard & Feature Manager
# Strict POSIX BusyBox ash compliant module for First-time setup, Feature installation,
# Profile application, System updates, Cleanups, Themes and Localization.

[ -z "${_ARK_EZSETUP_SH_LOADED:-}" ] || return 0
_ARK_EZSETUP_SH_LOADED=1

[ -n "${ARK_LIB_DIR}" ] || ARK_LIB_DIR="/usr/lib/ark"
[ -f "${ARK_LIB_DIR}/common.sh" ] && . "${ARK_LIB_DIR}/common.sh"
[ -f "${ARK_LIB_DIR}/logging.sh" ] && . "${ARK_LIB_DIR}/logging.sh"
[ -f "${ARK_LIB_DIR}/validation.sh" ] && . "${ARK_LIB_DIR}/validation.sh"
[ -f "${ARK_LIB_DIR}/modules/network.sh" ] && . "${ARK_LIB_DIR}/modules/network.sh"
[ -f "${ARK_LIB_DIR}/modules/sqm.sh" ] && . "${ARK_LIB_DIR}/modules/sqm.sh"
[ -f "${ARK_LIB_DIR}/modules/wifi.sh" ] && . "${ARK_LIB_DIR}/modules/wifi.sh"
[ -f "${ARK_LIB_DIR}/modules/devices.sh" ] && . "${ARK_LIB_DIR}/modules/devices.sh"
[ -f "${ARK_LIB_DIR}/modules/starlink.sh" ] && . "${ARK_LIB_DIR}/modules/starlink.sh"
[ -f "${ARK_LIB_DIR}/modules/speedify.sh" ] && . "${ARK_LIB_DIR}/modules/speedify.sh"
[ -f "${ARK_LIB_DIR}/modules/vpn.sh" ] && . "${ARK_LIB_DIR}/modules/vpn.sh"
[ -f "${ARK_LIB_DIR}/modules/adblock.sh" ] && . "${ARK_LIB_DIR}/modules/adblock.sh"
[ -f "${ARK_LIB_DIR}/modules/system.sh" ] && . "${ARK_LIB_DIR}/modules/system.sh"

ark_kill_package_fetchers() {
	ps w 2>/dev/null | awk '/downloads\.openwrt\.org|packages\.adb|APKINDEX|apk update|apk fetch/ && !/awk/ {print $1}' | while read -r pid; do
		[ -n "$pid" ] && kill "$pid" 2>/dev/null || true
	done
}

ark_run_limited() {
	seconds="$1"; shift
	"$@" &
	pid="$!"
	i=0
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

feature_package() {
	case "$1" in
		sqm) printf luci-app-sqm ;;
		mwan3) printf luci-app-mwan3 ;;
		nlbwmon) printf luci-app-nlbwmon ;;
		upnp) printf luci-app-upnp ;;
		argon) printf luci-theme-argon ;;
		speedtest) printf speedtest-go ;;
		speedify) printf speedify ;;
		tailscale) printf tailscale ;;
		zerotier) printf zerotier ;;
		wireguard) printf 'wireguard-tools' ;;
		adblock) printf 'adblock' ;;
		irqbalance) printf irqbalance ;;
		usteer) printf usteer ;;
		*) return 1 ;;
	esac
}

bulk_feature_keys() {
	printf 'sqm mwan3 nlbwmon upnp'
}

feature_missing_installable() {
	key="$1"; package="$(feature_package "$key" 2>/dev/null)" || return 1
	case "$key" in
		speedify|tailscale|zerotier) return 1 ;;
		speedtest)
			feature_active speedtest && return 1
			tmp_avail="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $4}')"; [ -n "$tmp_avail" ] || tmp_avail=0
			[ "$tmp_avail" -ge "${ARK_SPEEDTEST_RAM_MIN_KB:-25600}" ] || return 1
			return 0
			;;
		upnp)
			if is_fw4 && ark_upnp_is_legacy_iptables; then
				return 0
			elif is_fw3 && ark_upnp_is_legacy_nftables_on_fw3; then
				return 0
			fi
			installed "$package" && return 1
			return 0
			;;
		*)
			installed "$package" && return 1
			return 0
			;;
	esac
}

cleanup_packages() {
	case "$1" in
		updater) printf 'luci-app-attendedsysupgrade attendedsysupgrade-common owut' ;;
		package_manager) printf 'luci-app-package-manager' ;;
		ipv6) printf 'luci-proto-ipv6 odhcp6c odhcpd-ipv6only' ;;
		translations) printf 'luci-i18n-mwan3-pt-br luci-i18n-nlbwmon-pt-br luci-i18n-sqm-pt-br luci-i18n-upnp-pt-br' ;;
		upnp)
			if is_fw4; then
				printf 'luci-app-upnp miniupnpd-nftables miniupnpd'
			else
				printf 'luci-app-upnp miniupnpd'
			fi
			;;
		speedify_residue) printf '' ;;
		*) return 1 ;;
	esac
}

cleanup_label() {
	case "$1" in
		updater) printf 'Atualizador de firmware via LuCI' ;;
		package_manager) printf 'Gerenciador LuCI de pacotes' ;;
		ipv6) printf 'IPv6 cliente/servidor' ;;
		translations) printf 'Traduções dos apps LuCI extras' ;;
		upnp) printf 'UPnP / NAT-PMP' ;;
		speedify_residue) printf 'Resíduos de instalações incompletas' ;;
		*) printf '%s' "$1" ;;
	esac
}

cleanup_desc() {
	case "$1" in
		updater) printf 'Dispensável quando o ARK Router controla atualização/backup.' ;;
		package_manager) printf 'Neste firmware fica preso à coleção LuCI; não é seguro remover sem remover o LuCI base.' ;;
		ipv6) printf 'Remove cliente/servidor IPv6 quando presentes. O protocolo LuCI pode ficar protegido pela coleção LuCI base.' ;;
		translations) printf 'Opcional. O ARK Router mantém inglês fixo como fallback e usa seu próprio idioma selecionado.' ;;
		upnp) printf 'Opcional. Remova somente se não precisa abrir portas automaticamente para consoles/apps.' ;;
		speedify_residue) printf 'Remove restos conhecidos de Speedify/Nginx/OpenSSL quando uma instalação falha.' ;;
		*) printf '' ;;
	esac
}

cleanup_recommended() {
	case "$1" in updater|package_manager|ipv6|translations|speedify_residue) return 0 ;; *) return 1 ;; esac
}

cleanup_removable() {
	case "$1" in
		package_manager) return 1 ;;
		ipv6)
			# odhcp6c/odhcpd are removable; luci-proto-ipv6 alone is tied to the LuCI collection on this firmware.
			installed odhcp6c || installed odhcpd-ipv6only
			return $?
			;;
		*) return 0 ;;
	esac
}

cleanup_installed_count() {
	count=0
	for pkg in $(cleanup_packages "$1"); do installed "$pkg" && count=$((count+1)); done
	if [ "$1" = speedify_residue ]; then
		for f in /overlay/upper/usr/lib/libcrypto.so.3 /overlay/upper/usr/lib/libssl.so.3 /overlay/upper/usr/lib/libstdc++.so.6.0.33 /overlay/upper/usr/lib/libpcre2-8.so.0.15.0 /overlay/upper/etc/nginx /overlay/upper/usr/lib/nginx; do
			[ -e "$f" ] && count=$((count+1))
		done
	fi
	printf '%s' "$count"
}

cleanup_status_json() {
	overlay_avail="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"; [ -n "$overlay_avail" ] || overlay_avail=0
	overlay_total="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $2}')"; [ -n "$overlay_total" ] || overlay_total=0
	backup="$(uci -q get equipe_dashboard.cleanup.last_backup || true)"
	printf '{"overlay_avail_kb":%s,"overlay_total_kb":%s,"last_backup":"%s","items":[' "$overlay_avail" "$overlay_total" "$(json_escape "$backup")"
	first=1
	for key in updater package_manager ipv6 translations upnp speedify_residue; do
		count="$(cleanup_installed_count "$key")"
		[ "$count" -gt 0 ] || continue
		[ "$first" = 1 ] || printf ','
		first=0
		cleanup_recommended "$key"; rec=$?
		cleanup_removable "$key"; rem=$?
		[ "$rem" = 0 ] || rec=1
		printf '{"key":"%s","label":"%s","description":"%s","installed_count":%s,"recommended":%s,"removable":%s}' \
			"$key" "$(json_escape "$(cleanup_label "$key")")" "$(json_escape "$(cleanup_desc "$key")")" "$count" "$(bool $((rec == 0)))" "$(bool $((rem == 0)))"
	done
	printf ']}\n'
}

cleanup_backup() {
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

cleanup_speedify_residue() {
	for f in \
		/overlay/upper/usr/lib/libcrypto.so.3 /overlay/upper/usr/lib/libssl.so.3 \
		/overlay/upper/usr/lib/libstdc++.so.6 /overlay/upper/usr/lib/libstdc++.so.6.0.33 \
		/overlay/upper/usr/lib/libpcre2-8.so /overlay/upper/usr/lib/libpcre2-8.so.0 /overlay/upper/usr/lib/libpcre2-8.so.0.15.0 \
		/overlay/upper/usr/lib/libpcre2-posix.so /overlay/upper/usr/lib/libpcre2-posix.so.3 /overlay/upper/usr/lib/libpcre2-posix.so.3.0.7 \
		/overlay/upper/usr/lib/libcap.so /overlay/upper/usr/lib/libcap.so.2 /overlay/upper/usr/lib/libcap.so.2.69 \
		/overlay/upper/usr/lib/libbz2.so.1.0 /overlay/upper/usr/lib/libbz2.so.1.0.8 \
		/overlay/upper/usr/lib/libkeyutils.so.1 /overlay/upper/usr/lib/libkeyutils.so.1.10 \
		/overlay/upper/usr/lib/nginx /overlay/upper/etc/nginx /overlay/upper/etc/config/nginx /overlay/upper/usr/bin/nginx-util \
		/overlay/upper/etc/sysctl.d/99-speedify-tcp-cca.conf; do
		rm -rf "$f"
	done
	for p in nginx-* luci-nginx.* libxml2.* luci-app-speedify.* speedify.* libopenssl3.* libstdcpp6.* libpcre2.* libcap.list libbz2-1.0.list libkeyutils1.list; do
		rm -f /overlay/upper/lib/apk/packages/$p 2>/dev/null || true
	done
}

cleanup_apply_keys() {
	[ $# -gt 0 ] || { echo 'Nenhum item selecionado' >&2; return 2; }
	backup="$(cleanup_backup)" || { echo 'Falha ao criar backup antes da limpeza' >&2; return 3; }
	echo "Backup: $backup"
	for key in "$@"; do
		cleanup_packages "$key" >/dev/null || { echo "Item invalido: $key" >&2; return 2; }
		cleanup_removable "$key" || { echo "Item protegido ou vinculado a dependencia base: $key" >&2; continue; }
		if [ "$key" = speedify_residue ]; then cleanup_speedify_residue; continue; fi
		pkgs="$(cleanup_packages "$key")"
		if command -v apk >/dev/null 2>&1; then
			for pkg in $pkgs; do installed "$pkg" && apk del "$pkg" || true; done
		elif command -v opkg >/dev/null 2>&1; then
			for pkg in $pkgs; do installed "$pkg" && opkg remove "$pkg" || true; done
		fi
	done
	rm -rf /tmp/luci-indexcache /tmp/luci-modulecache 2>/dev/null || true
	(
		sleep 2
		[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart
		[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd enable >/dev/null 2>&1 && /etc/init.d/uhttpd restart
	) >/dev/null 2>&1 &
	sync
	echo ok
}

install_argon_release() {
	version="${ARK_ARGON_VERSION:-2.4.6}"
	release="v$version"
	tmp="${TMPDIR:-/tmp}/ark-router-argon"
	rm -rf "$tmp" && mkdir -p "$tmp" || return 1
	if command -v apk >/dev/null 2>&1; then
		theme="$tmp/luci-theme-argon-$version-r1.apk"
		config="$tmp/luci-app-argon-config-$version-r1.apk"
		wget -q --no-check-certificate -O "$theme" "https://github.com/jerrykuku/luci-theme-argon/releases/download/$release/luci-theme-argon-$version-r1.apk" || return 1
		wget -q --no-check-certificate -O "$config" "https://github.com/jerrykuku/luci-theme-argon/releases/download/$release/luci-app-argon-config-$version-r1.apk" || return 1
		apk add --allow-untrusted "$theme" "$config" || return 1
	else
		theme="$tmp/luci-theme-argon_$version-1_all.ipk"
		config="$tmp/luci-app-argon-config_$version-1_all.ipk"
		wget -q --no-check-certificate -O "$theme" "https://github.com/jerrykuku/luci-theme-argon/releases/download/$release/luci-theme-argon_$version-1_all.ipk" || return 1
		wget -q --no-check-certificate -O "$config" "https://github.com/jerrykuku/luci-theme-argon/releases/download/$release/luci-app-argon-config_$version-1_all.ipk" || return 1
		opkg install "$theme" "$config" || return 1
	fi
	uci -q set luci.main.mediaurlbase='/luci-static/argon'
	uci -q set equipe_dashboard.main.theme_customized='1'
	uci -q set equipe_dashboard.main.user_theme='argon'
	uci -q set luci.main.theme_customized='1'
	uci -q set luci.main.user_theme='argon'
	uci commit luci
	uci commit equipe_dashboard 2>/dev/null || true
	rm -f /tmp/luci-indexcache
	rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
	[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
	return 0
}

feature_active() {
	case "$1" in
		sqm) uci -q show sqm 2>/dev/null | grep -q "\.enabled='1'" ;;
		mwan3) pgrep -f mwan3rtmon >/dev/null 2>&1 || pgrep -f mwan3track >/dev/null 2>&1 ;;
		nlbwmon) pidof nlbwmon >/dev/null 2>&1 || running nlbwmon ;;
		upnp) pidof miniupnpd >/dev/null 2>&1 || running miniupnpd ;;
		ark) [ -d /www/luci-static/ark ] && [ "$(uci -q get luci.main.mediaurlbase)" = /luci-static/ark ] ;;
		argon) [ -d /www/luci-static/argon ] && [ "$(uci -q get luci.main.mediaurlbase)" = /luci-static/argon ] ;;
		uhttpd) [ -f /usr/share/luci/menu.d/luci-app-uhttpd.json ] ;;
		wifi) [ -f /etc/config/wireless ] ;;
		temperature)
			[ -r /sys/class/thermal/thermal_zone0/temp ] || \
			ls /sys/class/thermal/thermal_zone*/temp >/dev/null 2>&1 || \
			ls /sys/class/hwmon/hwmon*/temp*_input >/dev/null 2>&1
			;;
		history) pgrep -f equipe-traffic-history >/dev/null 2>&1 || running equipe-traffic-history ;;
		custom_qos) [ -f /etc/config/qos_equipe ] && [ "$(uci -q get qos_equipe.guest.enabled)" = 1 ] ;;
		speedtest) command -v speedtest-go >/dev/null 2>&1 || [ -x /tmp/ark-speedtest/speedtest-go ] ;;
		speedify) [ -x /usr/share/speedify/speedify_cli ] || installed speedify ;;
		tailscale) command -v tailscale >/dev/null 2>&1 ;;
		zerotier) pidof zerotier-one >/dev/null 2>&1 && [ "$(uci -q get zerotier.global.enabled)" = 1 ] ;;
		wireguard) [ -d /sys/class/net/wg0 ] || [ -d /sys/class/net/wgclient ] || (command -v wg >/dev/null 2>&1 && [ -n "$(wg show interfaces 2>/dev/null)" ]) ;;
		irqbalance) pidof irqbalance >/dev/null 2>&1 || { [ -x /etc/init.d/irqbalance ] && /etc/init.d/irqbalance enabled >/dev/null 2>&1; } ;;
		usteer) pidof usteerd >/dev/null 2>&1 || [ "$(uci -q get equipe_dashboard.wifi.usteer_enabled)" = "1" ] || { [ -x /etc/init.d/usteer ] && /etc/init.d/usteer enabled >/dev/null 2>&1; } ;;
		*) return 1 ;;
	esac
}

ark_current_version() { cat /usr/share/ark-router/VERSION 2>/dev/null || printf '%s' "$ARK_ROUTER_VERSION"; }

ark_update_repo() { uci -q get equipe_dashboard.update.repo 2>/dev/null || printf '%s' "$ARK_UPDATE_REPO_DEFAULT"; }

normalize_version() { printf '%s' "$1" | sed 's/^v//; s/[^0-9.].*$//'; }

version_gt() {
	awk -v a="$(normalize_version "$1")" -v b="$(normalize_version "$2")" 'BEGIN {
		split(a, A, "."); split(b, B, ".");
		for (i = 1; i <= 4; i++) {
			aa = A[i] + 0; bb = B[i] + 0;
			if (aa > bb) exit 0;
			if (aa < bb) exit 1;
		}
		exit 1;
	}'
}

ark_package_manager() {
	if command -v apk >/dev/null 2>&1; then printf apk
	elif command -v opkg >/dev/null 2>&1; then printf opkg
	else printf none
	fi
}

ark_mem_total_kb() {
	v="$(awk '/^MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || true)"
	[ -n "$v" ] && printf '%s' "$v" || printf 0
}

ark_overlay_avail_kb() {
	v="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4; exit}' || true)"
	[ -n "$v" ] && printf '%s' "$v" || printf 0
}

ark_best_profile() {
	ram="$(ark_mem_total_kb)"; [ -n "$ram" ] || ram=0
	overlay="$(ark_overlay_avail_kb)"; [ -n "$overlay" ] || overlay=0
	min_ram="${ARK_ROUTER_FULL_MIN_RAM_KB:-480000}"
	min_overlay="${ARK_ROUTER_FULL_MIN_OVERLAY_KB:-35000}"
	if [ "$ram" -ge "$min_ram" ] && [ "$overlay" -ge "$min_overlay" ]; then printf full; else printf lite; fi
}

ark_actual_profile() {
	if command -v apk >/dev/null 2>&1 && apk info -e luci-app-ark-router-full >/dev/null 2>&1; then printf full; return 0; fi
	if command -v apk >/dev/null 2>&1 && apk info -e luci-app-ark-router >/dev/null 2>&1; then printf lite; return 0; fi
	if command -v opkg >/dev/null 2>&1 && opkg status luci-app-ark-router-full 2>/dev/null | grep -q '^Status:.* installed'; then printf full; return 0; fi
	if command -v opkg >/dev/null 2>&1 && opkg status luci-app-ark-router 2>/dev/null | grep -q '^Status:.* installed'; then printf lite; return 0; fi
	printf source
}

ark_installed_profile() {
	actual="$(ark_actual_profile)"
	[ "$actual" = full ] && { printf full; return 0; }
	ark_best_profile
}

ark_update_asset_name() {
	profile="$(ark_installed_profile)"
	case "$(ark_package_manager):$profile" in
		apk:full) printf luci-app-ark-router-full.apk ;;
		apk:*) printf luci-app-ark-router.apk ;;
		opkg:full) printf luci-app-ark-router-full.ipk ;;
		opkg:*) printf luci-app-ark-router.ipk ;;
		*) return 1 ;;
	esac
}

ark_remove_opposite_profile() {
	asset="$1"
	manager="$2"
	case "$asset" in
		*luci-app-ark-router-full*) old_pkg="luci-app-ark-router" ;;
		*luci-app-ark-router.apk|*luci-app-ark-router.ipk) old_pkg="luci-app-ark-router-full" ;;
		*) return 0 ;;
	esac
	case "$manager" in
		apk) apk info -e "$old_pkg" >/dev/null 2>&1 || return 0 ;;
		opkg) opkg status "$old_pkg" 2>/dev/null | grep -q '^Status:.* installed' || return 0 ;;
		*) return 0 ;;
	esac
	echo "Switching ARK Router profile: removing old package $old_pkg before installing $asset"
	backup_dir="/tmp/ark-router-profile-switch-backup"
	rm -rf "$backup_dir"
	mkdir -p "$backup_dir/etc/config"
	for cfg in equipe_dashboard equipe_devices qos_equipe; do
		[ -f "/etc/config/$cfg" ] && cp "/etc/config/$cfg" "$backup_dir/etc/config/$cfg" || true
	done
	case "$manager" in
		apk) apk del "$old_pkg" ;;
		opkg) opkg remove "$old_pkg" ;;
	esac
	for cfg in equipe_dashboard equipe_devices qos_equipe; do
		[ -f "$backup_dir/etc/config/$cfg" ] && cp "$backup_dir/etc/config/$cfg" "/etc/config/$cfg" || true
	done
	rm -rf "$backup_dir"
}

ark_latest_release() {
	repo="$(ark_update_repo)"
	tag=""
	# 1. Tentativa primária ultra-rápida via raw.githubusercontent.com (sem rate limit e sem jsonfilter)
	tag="$(wget -T 10 -qO- --no-check-certificate "https://raw.githubusercontent.com/$repo/main/VERSION" 2>/dev/null | tr -d '\r\n v')"
	# 2. Fallback via tags da API do GitHub
	if [ -z "$tag" ]; then
		tag="$(wget -T 10 -qO- --no-check-certificate --header='User-Agent: ARK-Router' "https://api.github.com/repos/$repo/tags" 2>/dev/null | jsonfilter -e '@[0].name' 2>/dev/null | head -n 1 | tr -d '\r\n v')"
	fi
	# 3. Fallback via releases/latest da API do GitHub
	if [ -z "$tag" ]; then
		tag="$(wget -T 10 -qO- --no-check-certificate --header='User-Agent: ARK-Router' "https://api.github.com/repos/$repo/releases/latest" 2>/dev/null | jsonfilter -e '@.tag_name' 2>/dev/null | head -n 1 | tr -d '\r\n v')"
	fi
	printf '%s' "$tag"
}

ark_update_json() {
	current="$(ark_current_version)"
	repo="$(ark_update_repo)"
	manager="$(ark_package_manager)"
	actual_profile="$(ark_actual_profile)"
	profile="$(ark_installed_profile)"
	best_profile="$(ark_best_profile)"
	ram_kb="$(ark_mem_total_kb)"; [ -n "$ram_kb" ] || ram_kb=0
	overlay_kb="$(ark_overlay_avail_kb)"; [ -n "$overlay_kb" ] || overlay_kb=0
	asset="$(ark_update_asset_name 2>/dev/null || true)"
	latest="$(ark_latest_release)"
	available=false; error=""
	if [ "$manager" = none ]; then error="Gerenciador de pacotes indisponivel"
	elif [ -z "$asset" ]; then error="Tipo de pacote indisponivel"
	elif [ -z "$latest" ]; then error="Nao foi possivel consultar o GitHub Releases"
	elif version_gt "$latest" "$current"; then available=true
	elif [ "$profile" = full ] && [ "$actual_profile" != full ]; then available=true
	fi
	if [ -n "$asset" ]; then url="https://github.com/$repo/raw/main/dist/sdk/$asset"; else url=""; fi
	printf '{"current":"%s","repo":"%s","manager":"%s","profile":"%s","actual_profile":"%s","best_profile":"%s","ram_kb":%s,"overlay_free_kb":%s,"latest":"%s","asset":"%s","url":"%s","available":%s,"error":"%s"}\n' \
		"$(json_escape "$current")" "$(json_escape "$repo")" "$(json_escape "$manager")" "$(json_escape "$profile")" "$(json_escape "$actual_profile")" "$(json_escape "$best_profile")" "$ram_kb" "$overlay_kb" "$(json_escape "$latest")" "$(json_escape "$asset")" "$(json_escape "$url")" "$available" "$(json_escape "$error")"
}

ark_operation_profile() { uci -q get equipe_dashboard.main.operation_profile 2>/dev/null || printf 'standard'; }

apply_operation_profile() {
	mode="$1"
	case "$mode" in
		standard|gamer) ;;
		*) echo 'Perfil operacional invalido' >&2; return 2 ;;
	esac
	# 1. Cria backup automatico de seguranca antes de qualquer alteracao
	stage="/tmp/ark-profile-backup-stage"
	rm -rf "$stage" && mkdir -p "$stage/etc/config"
	for cfg in sqm firewall equipe_dashboard equipe_devices network wireless; do
		[ -f "/etc/config/$cfg" ] && cp "/etc/config/$cfg" "$stage/etc/config/$cfg"
	done
	tar -czf "/etc/config/ark_last_profile_backup.tar.gz" -C "$stage" . 2>/dev/null || true
	stamp="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo unknown)"
	tar -czf "/tmp/ark-profile-backup-$stamp.tar.gz" -C "$stage" . 2>/dev/null || true
	rm -rf "$stage"

	# 2. Identifica hardware e memoria disponivel para otimizacao inteligente
	mem_total_kb="$(awk '/MemTotal/{print $2}' /proc/meminfo 2>/dev/null || echo 256000)"
	if [ "$mem_total_kb" -gt 300000 ]; then
		cake_opts="diffserv4 nat dual-srchost ack-filter memlimit 64M"
	else
		cake_opts="diffserv4 nat dual-srchost ack-filter memlimit 32M"
	fi

	uci -q set equipe_dashboard.main=settings
	uci -q set "equipe_dashboard.main.operation_profile=$mode"
	if [ "$mode" = gamer ]; then
		uci -q show firewall 2>/dev/null | grep -E '^firewall\.ark_priority_.*\.set_dscp=' | while read -r line; do
			sec="$(printf '%s' "$line" | awk -F. '{print $2}')"
			uci -q set "firewall.$sec.set_dscp=EF"
		done
		if [ -f /etc/config/sqm ]; then
			sqm_queues="$(uci -q show sqm | grep '=queue' | cut -d. -f2 | cut -d= -f1)"
			[ -n "$sqm_queues" ] || sqm_queues="wan1 wan2"
			for sec in $sqm_queues; do
				if [ -n "$(uci -q get "sqm.$sec" 2>/dev/null)" ]; then
					uci -q set "sqm.$sec.qdisc=cake"
					uci -q set "sqm.$sec.script=piece_of_cake.qos"
					uci -q set "sqm.$sec.eqdisc_opts=$cake_opts"
					uci -q set "sqm.$sec.iqdisc_opts=diffserv4 nat dual-dsthost ingress"
				fi
			done
		fi
	else
		uci -q show firewall 2>/dev/null | grep -E '^firewall\.ark_priority_.*\.set_dscp=' | while read -r line; do
			sec="$(printf '%s' "$line" | awk -F. '{print $2}')"
			uci -q set "firewall.$sec.set_dscp=AF41"
		done
		if [ -f /etc/config/sqm ]; then
			sqm_queues="$(uci -q show sqm | grep '=queue' | cut -d. -f2 | cut -d= -f1)"
			[ -n "$sqm_queues" ] || sqm_queues="wan1 wan2"
			for sec in $sqm_queues; do
				if [ -n "$(uci -q get "sqm.$sec" 2>/dev/null)" ]; then
					uci -q delete "sqm.$sec.opts" 2>/dev/null || true
					uci -q set "sqm.$sec.eqdisc_opts=diffserv4 nat dual-srchost ack-filter"
					uci -q set "sqm.$sec.iqdisc_opts=diffserv4 nat dual-dsthost ingress"
				fi
			done
		fi
	fi
	uci commit equipe_dashboard
	uci commit firewall 2>/dev/null || true
	[ -f /etc/config/sqm ] && uci commit sqm 2>/dev/null || true
	/etc/init.d/firewall reload >/dev/null 2>&1 || true
	[ -x /etc/init.d/sqm ] && /etc/init.d/sqm restart >/dev/null 2>&1 || true
	return 0
}

ez_get() { uci -q get "equipe_dashboard.setup.$1" 2>/dev/null || printf '%s' "$2"; }

ez_set() { uci -q set equipe_dashboard.setup=ezsetup; uci -q set "equipe_dashboard.setup.$1=$2"; }

ez_bool() { case "$1" in 1|true|yes|on) printf 1 ;; *) printf 0 ;; esac; }

ez_backup() {
	stamp="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo unknown)"
	file="/tmp/ark-router-ezsetup-backup-$stamp.tar.gz"
	stage="/tmp/ark-router-ezsetup-backup-$stamp"
	rm -rf "$stage"
	mkdir -p "$stage/etc/config" "$stage/metadata" || return 1
	for cfg in network wireless dhcp firewall sqm mwan3 uhttpd luci equipe_dashboard equipe_devices qos_equipe; do
		[ -f "/etc/config/$cfg" ] && cp "/etc/config/$cfg" "$stage/etc/config/$cfg"
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
	# Retenção inteligente em /tmp: mantém no máximo os 3 backups mais recentes para economizar RAM
	ls -1t /tmp/ark-router-ezsetup-backup-*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
	ls -1t /tmp/ark-profile-backup-*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
	ez_set backup "$file"
	printf '%s' "$file"
}

ez_progress() { ez_set applied_step "$1"; ez_set last_step "$2"; uci commit equipe_dashboard; }

ez_json() {
	# Ler dados atuais do roteador caso ainda nao existam no setup
	cur_wan_proto="$(uci -q get network.wan.proto || printf 'dhcp')"
	cur_wan_user="$(uci -q get network.wan.username || true)"
	cur_wan_pass="$(uci -q get network.wan.password || true)"
	cur_wan_ip="$(uci -q get network.wan.ipaddr || true)"
	cur_wan_mask="$(uci -q get network.wan.netmask || true)"
	cur_wan_gw="$(uci -q get network.wan.gateway || true)"
	cur_wan_dns="$(uci -q get network.wan.dns || true)"
	cur_wan_mac="$(uci -q get network.wan.macaddr || true)"
	cur_wan_modem="$(uci -q get network.wan.modem_ip || true)"

	cur_wan2_proto="$(uci -q get network.wan2.proto || printf 'dhcp')"
	cur_wan2_user="$(uci -q get network.wan2.username || true)"
	cur_wan2_pass="$(uci -q get network.wan2.password || true)"
	cur_wan2_ip="$(uci -q get network.wan2.ipaddr || true)"
	cur_wan2_mask="$(uci -q get network.wan2.netmask || true)"
	cur_wan2_gw="$(uci -q get network.wan2.gateway || true)"
	cur_wan2_dns="$(uci -q get network.wan2.dns || true)"
	cur_wan2_mac="$(uci -q get network.wan2.macaddr || true)"
	cur_wan2_modem="$(uci -q get network.wan2.modem_ip || true)"

	cur_main_ssid="$(uci -q get wireless.default_radio0.ssid || uci -q get wireless.@wifi-iface[0].ssid || printf 'ARK Router')"
	cur_main_key="$(uci -q get wireless.default_radio0.key || uci -q get wireless.@wifi-iface[0].key || true)"
	cur_main_ssid_5g="$(uci -q get wireless.default_radio1.ssid || uci -q get wireless.@wifi-iface[1].ssid || true)"
	cur_main_key_5g="$(uci -q get wireless.default_radio1.key || uci -q get wireless.@wifi-iface[1].key || true)"
	[ -n "$cur_main_ssid_5g" ] || cur_main_ssid_5g="$cur_main_ssid"
	[ -n "$cur_main_key_5g" ] || cur_main_key_5g="$cur_main_key"
	detected_wifi_mode="unified"
	if [ "$cur_main_ssid" != "$cur_main_ssid_5g" ]; then
		detected_wifi_mode="split"
	fi
	cur_wifi_mode="$(ez_get wifi_mode "$detected_wifi_mode")"

	cur_guest_ssid="$(uci -q get wireless.guest_radio0.ssid || uci -q get wireless.@wifi-iface[1].ssid || printf 'ARK Router Visitantes')"
	cur_guest_key="$(uci -q get wireless.guest_radio0.key || uci -q get wireless.@wifi-iface[1].key || true)"

	cur_wan_online=false
	if [ -n "$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null)" ] || [ -d /sys/class/net/pppoe-wan ]; then
		cur_wan_online=true
	fi

	printf '{"state":"%s","applied_step":%s,"last_step":"%s","backup":"%s","profile":"%s","router_name":"%s","country":"%s","wifi_mode":"%s","main_ssid":"%s","main_key":"%s","main_ssid_5g":"%s","main_key_5g":"%s","guest_enabled":%s,"guest_ssid":"%s","guest_key":"%s","guest_limit_enabled":%s,"guest_download_kbps":"%s","guest_upload_kbps":"%s","wan1_online":%s,"wan1_proto":"%s","wan1_username":"%s","wan1_password":"%s","wan1_ipaddr":"%s","wan1_netmask":"%s","wan1_gateway":"%s","wan1_dns":"%s","wan1_macaddr":"%s","wan1_modem_ip":"%s","wan_mode":"%s","wan2_enabled":%s,"wan2_port":"%s","wan2_proto":"%s","wan2_username":"%s","wan2_password":"%s","wan2_ipaddr":"%s","wan2_netmask":"%s","wan2_gateway":"%s","wan2_dns":"%s","wan2_macaddr":"%s","wan2_modem_ip":"%s","sqm_enabled":%s,"sqm_strategy":"%s","sqm_wan_upload":"%s","sqm_wan_download":"%s","sqm_wan2_upload":"%s","sqm_wan2_download":"%s","dns_mode":"%s","dns_servers":"%s","disable_ipv6":%s,"disable_wps":%s,"install_modules":"%s"}\n' \
		"$(json_escape "$(ez_get state draft)")" \
		"$(ez_get applied_step 0)" \
		"$(json_escape "$(ez_get last_step '')")" \
		"$(json_escape "$(ez_get backup '')")" \
		"$(json_escape "$(ez_get profile event)")" \
		"$(json_escape "$(ez_get router_name 'ARK Router')")" \
		"$(json_escape "$(ez_get country BR)")" \
		"$(json_escape "$cur_wifi_mode")" \
		"$(json_escape "$(ez_get main_ssid "$cur_main_ssid")")" \
		"$(json_escape "$(ez_get main_key "$cur_main_key")")" \
		"$(json_escape "$(ez_get main_ssid_5g "$cur_main_ssid_5g")")" \
		"$(json_escape "$(ez_get main_key_5g "$cur_main_key_5g")")" \
		"$(json_bool_value "$(ez_get guest_enabled 0)")" \
		"$(json_escape "$(ez_get guest_ssid "$cur_guest_ssid")")" \
		"$(json_escape "$(ez_get guest_key "$cur_guest_key")")" \
		"$(json_bool_value "$(ez_get guest_limit_enabled 1)")" \
		"$(json_escape "$(ez_get guest_download_kbps 0)")" \
		"$(json_escape "$(ez_get guest_upload_kbps 1500)")" \
		"$cur_wan_online" \
		"$(json_escape "$(ez_get wan1_proto "$cur_wan_proto")")" \
		"$(json_escape "$(ez_get wan1_username "$cur_wan_user")")" \
		"$(json_escape "$(ez_get wan1_password "$cur_wan_pass")")" \
		"$(json_escape "$(ez_get wan1_ipaddr "$cur_wan_ip")")" \
		"$(json_escape "$(ez_get wan1_netmask "$cur_wan_mask")")" \
		"$(json_escape "$(ez_get wan1_gateway "$cur_wan_gw")")" \
		"$(json_escape "$(ez_get wan1_dns "$cur_wan_dns")")" \
		"$(json_escape "$(ez_get wan1_macaddr "$cur_wan_mac")")" \
		"$(json_escape "$(ez_get wan1_modem_ip "$cur_wan_modem")")" \
		"$(json_escape "$(ez_get wan_mode failover)")" \
		"$(json_bool_value "$(ez_get wan2_enabled 0)")" \
		"$(json_escape "$(ez_get wan2_port 'lan1')")" \
		"$(json_escape "$(ez_get wan2_proto "$cur_wan2_proto")")" \
		"$(json_escape "$(ez_get wan2_username "$cur_wan2_user")")" \
		"$(json_escape "$(ez_get wan2_password "$cur_wan2_pass")")" \
		"$(json_escape "$(ez_get wan2_ipaddr "$cur_wan2_ip")")" \
		"$(json_escape "$(ez_get wan2_netmask "$cur_wan2_mask")")" \
		"$(json_escape "$(ez_get wan2_gateway "$cur_wan2_gw")")" \
		"$(json_escape "$(ez_get wan2_dns "$cur_wan2_dns")")" \
		"$(json_escape "$(ez_get wan2_macaddr "$cur_wan2_mac")")" \
		"$(json_escape "$(ez_get wan2_modem_ip "$cur_wan2_modem")")" \
		"$(json_bool_value "$(ez_get sqm_enabled 0)")" \
		"$(json_escape "$(ez_get sqm_strategy manual)")" \
		"$(json_escape "$(ez_get sqm_wan_upload '')")" \
		"$(json_escape "$(ez_get sqm_wan_download '')")" \
		"$(json_escape "$(ez_get sqm_wan2_upload '')")" \
		"$(json_escape "$(ez_get sqm_wan2_download '')")" \
		"$(json_escape "$(ez_get dns_mode recommended)")" \
		"$(json_escape "$(ez_get dns_servers '1.1.1.1 1.0.0.1 8.8.8.8')")" \
		"$(json_bool_value "$(ez_get disable_ipv6 0)")" \
		"$(json_bool_value "$(ez_get disable_wps 1)")" \
		"$(json_escape "$(ez_get install_modules 'sqm mwan3 nlbwmon')")"
}

ez_apply_wifi_iface() {
	section="$1"; device="$2"; network="$3"; ssid="$4"; key="$5"; disabled="$6"
	uci -q get "wireless.$section" >/dev/null 2>&1 || uci -q set "wireless.$section=wifi-iface"
	uci -q set "wireless.$section.device=$device"
	uci -q set "wireless.$section.mode=ap"
	uci -q set "wireless.$section.network=$network"
	uci -q set "wireless.$section.ssid=$ssid"
	uci -q set "wireless.$section.encryption=psk2"
	uci -q set "wireless.$section.key=$key"
	uci -q set "wireless.$section.disabled=$disabled"
}

ez_apply_guest_network() {
	enabled="$1"
	if [ "$enabled" = 1 ]; then
		uci -q set network.guest=interface
		uci -q set network.guest.proto=static
		uci -q set network.guest.ipaddr="${2:-192.168.20.1}"
		uci -q set network.guest.netmask=255.255.255.0
		uci -q set dhcp.guest=dhcp
		uci -q set dhcp.guest.interface=guest
		uci -q set dhcp.guest.start=100
		uci -q set dhcp.guest.limit=150
		uci -q set dhcp.guest.leasetime=12h
		uci -q set dhcp.guest.dhcpv4=server
		uci -q delete dhcp.guest.ignore 2>/dev/null || true
		uci -q set firewall.guest=zone
		uci -q set firewall.guest.name=guest
		uci -q set firewall.guest.network=guest
		uci -q set firewall.guest.input=REJECT
		uci -q set firewall.guest.output=ACCEPT
		uci -q set firewall.guest.forward=REJECT
		uci -q set firewall.guest.masq=1
		uci -q set firewall.guest_forwarding=forwarding
		uci -q set firewall.guest_forwarding.src=guest
		uci -q set firewall.guest_forwarding.dest=wan
		uci -q set firewall.guest_dhcp=rule
		uci -q set firewall.guest_dhcp.name='Allow-Guest-DHCP'
		uci -q set firewall.guest_dhcp.src=guest
		uci -q set firewall.guest_dhcp.proto=udp
		uci -q set firewall.guest_dhcp.src_port=68
		uci -q set firewall.guest_dhcp.dest_port=67
		uci -q set firewall.guest_dhcp.target=ACCEPT
		uci -q set firewall.guest_dns=rule
		uci -q set firewall.guest_dns.name='Allow-Guest-DNS'
		uci -q set firewall.guest_dns.src=guest
		uci -q set firewall.guest_dns.proto='tcp udp'
		uci -q set firewall.guest_dns.dest_port=53
		uci -q set firewall.guest_dns.target=ACCEPT
	else
		uci -q set dhcp.guest.ignore=1
	fi
}

ez_apply_guest_limit() {
	ensure_qos_equipe
	enabled="$1"; upload="$2"; download="${3:-0}"
	if [ "$enabled" = 1 ]; then
		valid_uint_range "$upload" 128 100000 || return 1
		valid_uint_range "$download" 0 100000 || return 1
		uci -q set qos_equipe.guest=guest_limit
		uci -q set qos_equipe.guest.enabled=1
		uci -q set "qos_equipe.guest.upload_kbps=$upload"
		uci -q set "qos_equipe.guest.download_kbps=$download"
	else
		uci -q set qos_equipe.guest=guest_limit
		uci -q set qos_equipe.guest.enabled=0
	fi
}

guest_l3_device() {
	dev="$(ubus call network.interface.guest status 2>/dev/null | jsonfilter -e '@.l3_device' 2>/dev/null || true)"
	[ -n "$dev" ] || dev="$(ubus call network.interface.guest status 2>/dev/null | jsonfilter -e '@.device' 2>/dev/null || true)"
	valid_net_device "$dev" && printf '%s' "$dev"
}

feature_json() {
	key="$1" package="$2" installable="$3" reason="$4"
	if [ "$key" = ark ]; then
		feature_active ark; enabled=$?
		hidden ark; concealed=$?
		printf '"ark":{"installed":true,"active":%s,"hidden":%s,"installable":true,"package":"luci-theme-ark"}' \
			"$(bool $((enabled == 0)))" "$(bool $((concealed == 0)))"
		return 0
	fi
	if [ "$key" = adblock ]; then
		printf '"adblock":'
		adblock_status_json | tr -d '\n'
		return 0
	fi
	if [ "$key" = speedtest ]; then
		if [ -x /usr/bin/speedtest-go ]; then
			printf '"speedtest":{"installed":true,"active":true,"hidden":false,"installable":true,"package":"speedtest-go","temporary":false,'
			speedtest_storage_json
			printf '}'
			return 0
		elif [ -x /tmp/ark-speedtest/speedtest-go ]; then
			printf '"speedtest":{"installed":true,"active":true,"hidden":false,"installable":true,"package":"speedtest-go","temporary":true,'
			speedtest_storage_json
			printf '}'
			return 0
		else
			tmp_avail="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $4}')"; [ -n "$tmp_avail" ] || tmp_avail=0
			min_kb="${ARK_SPEEDTEST_RAM_MIN_KB:-25600}"
			installable=true; [ "$tmp_avail" -lt "$min_kb" ] && installable=false
			printf '"speedtest":{"installed":false,"active":false,"hidden":false,"installable":%s,"package":"speedtest-go","temporary":true,' "$installable"
			speedtest_storage_json
			printf '}'
			return 0
		fi
	fi
	if [ "$key" = speedify ]; then
		supported=false; speedify_supported && supported=true
		cli="$(speedify_cli_path)"
		runtime=false; speedify_runtime_running && runtime=true
		present=false; ([ -n "$cli" ] || installed speedify) && present=true
		luci=false; installed luci-app-speedify && luci=true
		active=false; state="$(speedify_state_value)"; case "$state" in CONNECTED|CONNECTING) active=true ;; esac
		prepared="$(uci -q get equipe_dashboard.speedify.prepared || printf 0)"
		mode="$(speedify_detected_install_mode 2>/dev/null || true)"
		if [ -z "$mode" ] || [ "$mode" = auto ]; then
			mode="$(uci -q get equipe_dashboard.speedify.install_mode || printf auto)"
		fi
		if [ "$mode" = "internal" ] && [ "$(uci -q get equipe_dashboard.speedify.install_mode)" != "internal" ]; then
			uci -q set equipe_dashboard.speedify.install_mode='internal'
			uci commit equipe_dashboard
		fi
		saved="$(uci -q get equipe_dashboard.speedify.saved_config || printf 0)"
		autostart="$(uci -q get equipe_dashboard.speedify.autostart || printf 0)"
		desired="$(uci -q get equipe_dashboard.speedify.desired_state || printf manual)"
		bonding_mode="$(uci -q get equipe_dashboard.speedify.bonding_mode || printf speed)"
		runtime_mode="$bonding_mode"
		tunnel_ip="$(ip -4 addr show connectify0 2>/dev/null | awk '/inet /{print $2; exit}' | cut -d/ -f1)"
		settings_out=''
		if $runtime && [ -n "$cli" ]; then
			settings_out="$("$cli" -s show settings 2>/dev/null || true)"
			settings_mode="$(printf '%s' "$settings_out" | jsonfilter -e '@.bondingMode' 2>/dev/null || true)"
			[ -n "$settings_mode" ] && runtime_mode="$settings_mode"
		fi
		adapters_json='[]'; settings_json='{}'
		$runtime && [ -n "$cli" ] && adapters_json="$("$cli" -s show adapters 2>/dev/null || printf '[]')"
		[ -n "$settings_out" ] && settings_json="$settings_out"
		last_autostart="$(cat /tmp/ark-speedify-autostart.status 2>/dev/null || true)"
		account_logged=false; account_licensed=false; account_masked=''
		if $runtime && [ -n "$cli" ]; then
			user_out="$("$cli" show user 2>/dev/null || true)"
			account_email="$(printf '%s' "$user_out" | jsonfilter -e '@.email' 2>/dev/null || true)"
			account_bytes="$(printf '%s' "$user_out" | jsonfilter -e '@.bytesAvailable' 2>/dev/null || true)"
			[ -n "$account_email" ] && { account_logged=true; account_masked="$(speedify_mask_email "$account_email")"; }
			[ "$account_bytes" = -1 ] && account_licensed=true
		fi
		hidden "$key"; concealed=$?
		reason=''
		if ! $supported; then
			case "$(uname -m 2>/dev/null)" in
				aarch64|x86_64)
					reason='Memoria RAM insuficiente. Requer no minimo 160 MB de RAM para carregar em memoria.'
					;;
				*)
					arch="$(uname -m 2>/dev/null || printf 'desconhecida')"
					reason="Incompativel: Speedify requer arquitetura 64-bit (ARM64/x86_64). Este hardware possui arquitetura ${arch} (32-bit)."
					;;
			esac
		fi
		printf '"speedify":{"installed":%s,"active":%s,"runtime_running":%s,"hidden":%s,"installable":%s,"reason":"%s","package":"Runtime Speedify opcional: interno, externo ou RAM","luci":%s,"state":"%s","supported":%s,"prepared":%s,"install_mode":"%s","saved_config":%s,"autostart":%s,"desired_state":"%s","bonding_mode":"%s","runtime_mode":"%s","tunnel_ip":"%s","last_autostart":"%s","account_logged_in":%s,"account_licensed":%s,"account_email_masked":"%s","adapters":%s,"settings":%s,' \
			"$present" "$active" "$runtime" "$(bool $((concealed == 0)))" "$supported" "$(json_escape "$reason")" "$luci" "$(json_escape "$state")" "$supported" "$(bool "$prepared")" "$(json_escape "$mode")" "$(bool "$saved")" "$(bool "$autostart")" "$(json_escape "$desired")" "$(json_escape "$bonding_mode")" "$(json_escape "$runtime_mode")" "$(json_escape "$tunnel_ip")" "$(json_escape "$last_autostart")" "$account_logged" "$account_licensed" "$(json_escape "$account_masked")" "$adapters_json" "$settings_json"
		speedify_storage_json
		printf '}'
		return 0
	fi
	if [ "$key" = tailscale ]; then
		installed_ts=false; command -v tailscale >/dev/null 2>&1 && installed_ts=true
		active_ts=false; logged_ts=false; backend=''; ip=''; hostname=''
		if $installed_ts && pidof tailscaled >/dev/null 2>&1; then
			status="$(tailscale status --json 2>/dev/null || true)"
			backend="$(printf '%s' "$status" | jsonfilter -e '@.BackendState' 2>/dev/null || true)"
			ip="$(printf '%s' "$status" | jsonfilter -e '@.Self.TailscaleIPs[0]' 2>/dev/null || true)"
			hostname="$(printf '%s' "$status" | jsonfilter -e '@.Self.HostName' 2>/dev/null || true)"
			case "$backend" in Running) active_ts=true; logged_ts=true ;; Starting) active_ts=true ;; esac
			[ -n "$ip" ] && logged_ts=true
		fi
		hidden "$key"; concealed=$?
		route="$(tailscale_lan_cidr 2>/dev/null || true)"
		printf '"tailscale":{"installed":%s,"active":%s,"hidden":%s,"installable":true,"package":"tailscale","logged_in":%s,"backend":"%s","ip":"%s","hostname":"%s","lan_cidr":"%s"}' \
			"$installed_ts" "$active_ts" "$(bool $((concealed == 0)))" "$logged_ts" "$(json_escape "$backend")" "$(json_escape "${ip:-—}")" "$(json_escape "${hostname:-—}")" "$(json_escape "$route")"
		return 0
	fi
	if [ "$key" = zerotier ]; then
		hidden "$key"; concealed=$?
		installed_zt=false; [ -x /usr/sbin/zerotier-one ] || command -v zerotier-cli >/dev/null 2>&1 && installed_zt=true
		active_zt=false; pidof zerotier-one >/dev/null 2>&1 && active_zt=true
		autostart_zt=false
		zt_auto="$(uci -q get equipe_dashboard.zerotier.autostart || true)"
		if [ "$zt_auto" = "1" ]; then
			autostart_zt=true
		elif [ "$zt_auto" = "0" ]; then
			autostart_zt=false
		elif [ -x /etc/init.d/zerotier ] && /etc/init.d/zerotier enabled >/dev/null 2>&1; then
			autostart_zt=true
		fi
		state='{}'
		if $active_zt; then
			state="$(zerotier_status_json 2>/dev/null || printf '{}')"
		fi
		node="$(printf '%s' "$state" | jsonfilter -e '@.node_id' 2>/dev/null || true)"
		netid="$(printf '%s' "$state" | jsonfilter -e '@.network_id' 2>/dev/null || true)"
		nstatus="$(printf '%s' "$state" | jsonfilter -e '@.network_status' 2>/dev/null || true)"
		ip="$(printf '%s' "$state" | jsonfilter -e '@.ip' 2>/dev/null || true)"
		lan_cidr="$(printf '%s' "$state" | jsonfilter -e '@.lan_cidr' 2>/dev/null || tailscale_lan_cidr 2>/dev/null || true)"
		printf '"zerotier":{"installed":%s,"active":%s,"autostart":%s,"hidden":%s,"installable":true,"package":"zerotier","node_id":"%s","network_id":"%s","network_status":"%s","ip":"%s","lan_cidr":"%s"}' \
			"$installed_zt" "$active_zt" "$autostart_zt" "$(bool $((concealed == 0)))" "$(json_escape "${node:-—}")" "$(json_escape "$netid")" "$(json_escape "${nstatus:-—}")" "$(json_escape "${ip:-—}")" "$(json_escape "$lan_cidr")"
		return 0
	fi
	if [ "$key" = wireguard ]; then
		hidden "$key"; concealed=$?
		installed_wg=false; ([ -x /usr/bin/wg ] || [ -f /lib/netifd/proto/wireguard.sh ]) && installed_wg=true
		active_wg=false; ([ -d /sys/class/net/wg0 ] || [ -d /sys/class/net/wgclient ]) && active_wg=true
		autostart_wg=false; ([ "$(uci -q get network.wg0.auto)" != "0" ] || [ "$(uci -q get network.wgclient.auto)" != "0" ]) && autostart_wg=true
		listen_port="$(uci -q get network.wg0.listen_port || printf '51820')"
		wg_ip="$(uci -q get network.wg0.addresses 2>/dev/null || uci -q get network.wg0.ipaddr 2>/dev/null || printf '10.14.0.1/24')"
		pubkey=""
		peers_count=0
		peers_active=0
		if command -v wg >/dev/null 2>&1 && [ -d /sys/class/net/wg0 ]; then
			pubkey="$(wg show wg0 public-key 2>/dev/null || true)"
			peers_count="$(wg show wg0 peers 2>/dev/null | wc -l)"
			now="$(date +%s)"
			for hs in $(wg show wg0 latest-handshakes 2>/dev/null | awk '{print $2}'); do
				if [ -n "$hs" ] && [ "$hs" -gt 0 ]; then
					diff=$((now - hs))
					[ "$diff" -le 180 ] && peers_active=$((peers_active + 1))
				fi
			done
		else
			[ -f /etc/wireguard/server_public.key ] && pubkey="$(cat /etc/wireguard/server_public.key 2>/dev/null || true)"
			peers_count="$(uci -q show network 2>/dev/null | grep -c '=wireguard_wg0$' || true)"
		fi
		[ -n "$peers_count" ] || peers_count=0
		[ -n "$peers_active" ] || peers_active=0
		wan_ip="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null || true)"
		[ -n "$wan_ip" ] || wan_ip="$(uci -q get network.wan.ipaddr 2>/dev/null || true)"
		custom_endpoint="$(uci -q get equipe_dashboard.wireguard.endpoint 2>/dev/null || true)"
		endpoint="${custom_endpoint:-$wan_ip}"

		client_configured=false; [ "$(uci -q get network.wgclient.proto)" = "wireguard" ] && client_configured=true
		client_active=false; [ -d /sys/class/net/wgclient ] && client_active=true
		client_endpoint="$(uci -q get network.@wireguard_wgclient[0].endpoint_host 2>/dev/null || true)"
		client_online=false
		if [ "$client_active" = true ] && command -v wg >/dev/null 2>&1; then
			client_hs="$(wg show wgclient latest-handshakes 2>/dev/null | awk '{print $2}' || true)"
			if [ -n "$client_hs" ] && [ "$client_hs" -gt 0 ]; then
				now_c="$(date +%s)"
				diff_c=$((now_c - client_hs))
				[ "$diff_c" -le 180 ] && client_online=true
			fi
		fi

		printf '"wireguard":{"installed":%s,"active":%s,"autostart":%s,"hidden":%s,"installable":true,"package":"wireguard-tools","ip":"%s","listen_port":"%s","public_key":"%s","endpoint":"%s","peers_count":%d,"peers_active":%d,"client_configured":%s,"client_active":%s,"client_online":%s,"client_endpoint":"%s"}' \
			"$installed_wg" "$active_wg" "$autostart_wg" "$(bool $((concealed == 0)))" "$(json_escape "$wg_ip")" "$(json_escape "$listen_port")" "$(json_escape "$pubkey")" "$(json_escape "$endpoint")" "$peers_count" "$peers_active" \
			"$client_configured" "$client_active" "$client_online" "$(json_escape "$client_endpoint")"
		return 0
	fi
	if [ -n "$package" ]; then installed "$package"; present=$?; else feature_active "$key"; present=$?; fi
	feature_active "$key"; enabled=$?
	hidden "$key"; concealed=$?
	printf '"%s":{"installed":%s,"active":%s,"hidden":%s,"installable":%s' \
		"$key" "$(bool $((present == 0)))" "$(bool $((enabled == 0)))" "$(bool $((concealed == 0)))" "$installable"
	[ -n "$package" ] && printf ',"package":"%s"' "$package"
	[ -n "$reason" ] && printf ',"reason":"%s"' "$(json_escape "$reason")"
	printf '}'
}

handle_ezsetup() {
	case "$1" in
	ez-setup-status)
		ez_json
		;;
	ez-setup-reset)
		uci -q delete equipe_dashboard.setup
		uci commit equipe_dashboard
		echo ok
		;;
	ez-setup-save)
		shift
		uci -q set equipe_dashboard.setup=ezsetup
		uci -q set equipe_dashboard.setup.state=draft
		uci -q set equipe_dashboard.setup.applied_step=0
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				profile)
					case "$value" in event|home|starlink|dualwan|internet_single|internet_failover|internet_balance|custom) ;; *) echo 'Perfil invalido' >&2; exit 2 ;; esac ;;
				language)
					case "$value" in pt-br|en|es) ;; *) echo 'Idioma invalido' >&2; exit 2 ;; esac
					uci -q set equipe_dashboard.main=settings
					uci -q set "equipe_dashboard.main.language=$value"
					;;
				router_name)
					valid_plain "$value" 40 && [ -n "$value" ] || { echo 'Nome do roteador invalido' >&2; exit 2; } ;;
				country)
					value="$(printf '%s' "$value" | tr 'a-z' 'A-Z')"; printf '%s' "$value" | grep -Eq '^([A-Z]{2}|00)$' || { echo 'Pais invalido' >&2; exit 2; } ;;
				wifi_mode)
					case "$value" in unified|split) ;; *) echo 'Modo Wi-Fi invalido' >&2; exit 2 ;; esac ;;
				main_ssid|guest_ssid|main_ssid_2g|main_ssid_5g)
					valid_plain "$value" 32 && [ -n "$value" ] || { echo 'SSID invalido' >&2; exit 2; } ;;
				main_key|guest_key|main_key_2g|main_key_5g)
					if [ -n "$value" ]; then
						valid_wifi_password "$value" || { echo 'Senha Wi-Fi invalida (minimo 8 caracteres)' >&2; exit 2; }
					fi ;;
				guest_enabled|guest_limit_enabled|wan2_enabled|sqm_enabled|disable_ipv6|disable_wps|change_admin_password)
					value="$(ez_bool "$value")" ;;
				admin_password)
					[ -z "$value" ] || valid_plain "$value" 64 || { echo 'Senha de administrador invalida' >&2; exit 2; } ;;
				guest_download_kbps|guest_upload_kbps)
					valid_sqm_rate "$value" || { echo 'Limite visitante invalido' >&2; exit 2; } ;;
				wan1_proto)
					case "$value" in dhcp|pppoe|static) ;; *) echo 'Protocolo WAN1 invalido' >&2; exit 2 ;; esac ;;
				wan1_username)
					valid_plain "$value" 96 || { echo 'Usuario PPPoE invalido' >&2; exit 2; } ;;
				wan1_password)
					valid_plain "$value" 128 || { echo 'Senha PPPoE invalida' >&2; exit 2; } ;;
				wan1_ipaddr|wan1_netmask|wan1_gateway)
					[ -z "$value" ] || valid_ipv4 "$value" || { echo "Parametro $key invalido" >&2; exit 2; } ;;
				wan1_dns)
					val="$(printf '%s' "$value" | tr ',;\t' '  ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"
					valid_plain "$val" 120 || { echo 'DNS WAN1 invalido' >&2; exit 2; }
					for server in $val; do valid_ip "$server" || { echo "DNS WAN1 invalido: $server" >&2; exit 2; }; done
					value="$val"
					;;
				wan1_macaddr|wan2_macaddr)
					if [ -n "$value" ]; then
						value="$(printf '%s' "$value" | tr 'A-Z' 'a-z')"
						valid_mac_anycase "$value" || { echo "MAC de $key invalido" >&2; exit 2; }
					fi
					;;
				wan1_modem_ip|wan2_modem_ip)
					[ -z "$value" ] || valid_ipv4 "$value" || { echo "IP do modem de $key invalido" >&2; exit 2; } ;;
				wan2_proto)
					case "$value" in dhcp|pppoe|static) ;; *) echo 'Protocolo WAN2 invalido' >&2; exit 2 ;; esac ;;
				wan2_username)
					valid_plain "$value" 96 || { echo 'Usuario PPPoE WAN2 invalido' >&2; exit 2; } ;;
				wan2_password)
					valid_plain "$value" 128 || { echo 'Senha PPPoE WAN2 invalida' >&2; exit 2; } ;;
				wan2_ipaddr|wan2_netmask|wan2_gateway)
					[ -z "$value" ] || valid_ipv4 "$value" || { echo "Parametro $key invalido" >&2; exit 2; } ;;
				wan2_dns)
					val="$(printf '%s' "$value" | tr ',;\t' '  ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"
					valid_plain "$val" 120 || { echo 'DNS WAN2 invalido' >&2; exit 2; }
					for server in $val; do valid_ip "$server" || { echo "DNS WAN2 invalido: $server" >&2; exit 2; }; done
					value="$val"
					;;
				wan_mode)
					case "$value" in single|failover|balanced|wan1|wan2) ;; *) echo 'Modo WAN invalido' >&2; exit 2 ;; esac ;;
				wan2_port)
					case "$value" in lan[0-9]*|eth[0-9]*) ;; *) echo 'Porta WAN2 invalida' >&2; exit 2 ;; esac ;;
				sqm_strategy)
					case "$value" in off|manual|calibrate_later) ;; *) echo 'Estrategia SQM invalida' >&2; exit 2 ;; esac ;;
				sqm_wan_upload|sqm_wan_download|sqm_wan2_upload|sqm_wan2_download)
					[ -z "$value" ] || valid_uint_range "$value" 100 100000000 || { echo 'Velocidade SQM invalida' >&2; exit 2; } ;;
				dns_mode)
					case "$value" in operator|recommended|custom) ;; *) echo 'Modo DNS invalido' >&2; exit 2 ;; esac ;;
				dns_servers)
					val="$(printf '%s' "$value" | tr ',;	' '  ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"
					valid_plain "$val" 120 || { echo 'DNS invalido' >&2; exit 2; }
					for server in $val; do valid_ip "$server" || { echo "DNS invalido: $server" >&2; exit 2; }; done
					value="$val"
					;;
				install_modules)
					valid_plain "$value" 120 || { echo 'Lista de modulos invalida' >&2; exit 2; }
					for module in $value; do feature_package "$module" >/dev/null || { echo "Modulo invalido: $module" >&2; exit 2; }; done ;;
				*) echo "Campo invalido: $key" >&2; exit 2 ;;
			esac
			ez_set "$key" "$value"
		done
		uci commit equipe_dashboard
		ez_json
		;;
	ez-setup-apply)
		state="$(ez_get state draft)"
		[ "$state" != applied ] || { ez_json; exit 0; }
		start="$(ez_get applied_step 0)"
		if [ "$start" -lt 1 ]; then
			backup="$(ez_backup)" || { echo 'Falha ao criar backup de seguranca' >&2; exit 3; }
			ez_progress 1 "backup:$backup"
		fi
		if [ "$(ez_get applied_step 0)" -lt 2 ]; then
			if [ "$(ez_get change_admin_password 0)" = 1 ]; then
				adm_pass="$(ez_get admin_password '')"
				if [ -n "$adm_pass" ]; then
					printf '%s\n%s\n' "$adm_pass" "$adm_pass" | passwd root >/dev/null 2>&1 || true
					uci -q delete equipe_dashboard.setup.admin_password
				fi
			fi
			title="$(ez_get router_name 'ARK Router')"; country="$(ez_get country BR)"
			uci -q set equipe_dashboard.main=settings
			uci -q set "equipe_dashboard.main.title=$title"
			if [ "$(ez_get disable_wps 1)" = 1 ]; then
				uci -q show wireless 2>/dev/null | sed -n "s/^\(wireless\.[^.]*\)\.wps_pushbutton=.*/\1/p" | while read -r section; do uci -q set "$section.wps_pushbutton=0"; done
				uci -q show wireless 2>/dev/null | sed -n "s/^\(wireless\.[^.]*\)\.wps_label=.*/\1/p" | while read -r section; do uci -q set "$section.wps_label=0"; done
			fi
			for radio in $(wifi_known_radios); do uci -q set "wireless.$radio.country=$country"; done
			uci commit equipe_dashboard
			uci commit wireless
			ez_progress 2 identity
		fi
		if [ "$(ez_get applied_step 0)" -lt 3 ]; then
			if [ "$(ez_get disable_ipv6 0)" = 1 ]; then
				disable_ipv6_full
			fi
			dns_mode="$(ez_get dns_mode recommended)"
			if [ "$dns_mode" != operator ]; then
				servers="$(ez_get dns_servers '1.1.1.1 1.0.0.1 8.8.8.8')"
				uci -q set dhcp.@dnsmasq[0].noresolv=1
				uci -q delete dhcp.@dnsmasq[0].server
				for server in $servers; do uci -q add_list "dhcp.@dnsmasq[0].server=$server"; done
			else
				uci -q delete dhcp.@dnsmasq[0].noresolv
				uci -q delete dhcp.@dnsmasq[0].server
			fi
			uci commit network
			uci commit dhcp
			ez_progress 3 network_basics
		fi
		if [ "$(ez_get applied_step 0)" -lt 4 ]; then
			main_ssid="$(ez_get main_ssid '')"
			[ -n "$main_ssid" ] || main_ssid="$(uci -q get wireless.default_radio0.ssid || uci -q get wireless.@wifi-iface[0].ssid || printf 'ARK Router')"
			main_key="$(ez_get main_key '')"
			[ -n "$main_key" ] || main_key="$(uci -q get wireless.default_radio0.key || uci -q get wireless.@wifi-iface[0].key || true)"
			guest_ssid="$(ez_get guest_ssid 'ARK Router Visitantes')"
			guest_key="$(ez_get guest_key '')"
			[ -n "$guest_key" ] || guest_key="$(uci -q get wireless.guest_radio0.key || uci -q get wireless.@wifi-iface[1].key || true)"
			mode="$(ez_get wifi_mode unified)"
			if [ -n "$main_key" ]; then
				valid_wifi_password "$main_key" || { echo 'Senha da rede principal invalida (minimo 8 caracteres)' >&2; exit 2; }
			fi
			guest_enabled="$(ez_get guest_enabled 0)"
			if [ "$guest_enabled" = 1 ]; then
				if [ -z "$guest_key" ]; then guest_key="visitante1234"; fi
				valid_wifi_password "$guest_key" || { echo 'Senha da rede visitante invalida (minimo 8 caracteres)' >&2; exit 2; }
			fi
			if [ "$mode" = split ]; then
				main2="$(ez_get main_ssid_2g "$main_ssid")"
				[ -n "$main2" ] || main2="${main_ssid}"
				key2="$(ez_get main_key_2g "$main_key")"
				main5="$(ez_get main_ssid_5g '')"
				[ -n "$main5" ] || main5="${main_ssid}_5G"
				key5="$(ez_get main_key_5g "$main_key")"
				guest2="${guest_ssid}-2G"; guest5="${guest_ssid}-5G"
			else
				main2="$main_ssid"; main5="$main_ssid"; key2="$main_key"; key5="$main_key"
				guest2="$guest_ssid"; guest5="$guest_ssid"
			fi
			radio2="$(wifi_radio_2g)"; radio5="$(wifi_radio_5g)"
			[ -n "$radio2" ] || { echo 'Radio 2,4 GHz nao encontrado' >&2; exit 3; }
			[ -n "$radio5" ] || radio5="$radio2"
			ez_apply_wifi_iface default_radio0 "$radio2" lan "$main2" "${key2:-$main_key}" 0
			ez_apply_wifi_iface default_radio1 "$radio5" lan "$main5" "${key5:-$main_key}" 0
			if [ "$guest_enabled" = 1 ]; then
				ez_apply_guest_network 1
				ez_apply_wifi_iface guest_radio0 "$radio2" guest "$guest2" "$guest_key" 0
				ez_apply_wifi_iface guest_radio1 "$radio5" guest "$guest5" "$guest_key" 0
			else
				ez_apply_wifi_iface guest_radio0 "$radio2" guest "$guest2" "${guest_key:-$main_key}" 1
				ez_apply_wifi_iface guest_radio1 "$radio5" guest "$guest5" "${guest_key:-$main_key}" 1
				ez_apply_guest_network 0
			fi
			uci commit wireless
			uci commit network
			uci commit dhcp
			uci commit firewall
			ez_progress 4 wifi
		fi
		if [ "$(ez_get applied_step 0)" -lt 5 ]; then
			# WAN 1 Configuration
			wan1_proto="$(ez_get wan1_proto '')"
			if [ -n "$wan1_proto" ]; then
				wan1_user="$(ez_get wan1_username '')"
				wan1_pass="$(ez_get wan1_password '')"
				wan1_ip="$(ez_get wan1_ipaddr '')"
				wan1_mask="$(ez_get wan1_netmask '')"
				wan1_gw="$(ez_get wan1_gateway '')"
				wan1_dns="$(ez_get wan1_dns '')"
				wan1_mac="$(ez_get wan1_macaddr '')"
				wan1_modem="$(ez_get wan1_modem_ip '')"
				apply_wan_proto wan "$wan1_proto" "$wan1_user" "$wan1_pass" "$wan1_ip" "$wan1_mask" "$wan1_gw" "$wan1_dns" "$wan1_mac"
				effective_dev1="$(uci -q get network.wan.device || uci -q get network.wan.ifname || echo wan)"
				apply_wan_modem_access wan "$wan1_proto" "$wan1_modem" "$effective_dev1"
				uci -q set network.wan.metric=10
			fi

			# WAN 2 Configuration
			wan2_port="$(ez_get wan2_port lan1)"
			if [ "$(ez_get wan2_enabled 0)" = 1 ]; then
				remove_lan_port "$wan2_port"
				wan2_proto="$(ez_get wan2_proto dhcp)"
				wan2_user="$(ez_get wan2_username '')"
				wan2_pass="$(ez_get wan2_password '')"
				wan2_ip="$(ez_get wan2_ipaddr '')"
				wan2_mask="$(ez_get wan2_netmask '')"
				wan2_gw="$(ez_get wan2_gateway '')"
				wan2_dns="$(ez_get wan2_dns '')"
				wan2_mac="$(ez_get wan2_macaddr '')"
				wan2_modem="$(ez_get wan2_modem_ip '')"
				apply_wan_proto wan2 "$wan2_proto" "$wan2_user" "$wan2_pass" "$wan2_ip" "$wan2_mask" "$wan2_gw" "$wan2_dns" "$wan2_mac"
				uci -q set "network.wan2.device=$wan2_port"
				apply_wan_modem_access wan2 "$wan2_proto" "$wan2_modem" "$wan2_port"
				uci -q set network.wan2.metric=20
				zone="$(firewall_wan_zone_section)"
				[ -n "$zone" ] && firewall_zone_has_network "$zone" wan2 || uci -q add_list "firewall.$zone.network=wan2"
			else
				add_lan_port "$wan2_port"
				apply_wan_modem_access wan2 dhcp "" ""
				uci -q delete network.wan2
				zone="$(firewall_wan_zone_section)"
				[ -n "$zone" ] && uci -q del_list "firewall.$zone.network=wan2" 2>/dev/null || true
			fi

			if installed luci-app-mwan3 || [ -f /etc/config/mwan3 ]; then
				ensure_mwan3_ark_config
				case "$(ez_get wan_mode failover)" in
					balanced) policy=balanced ;;
					wan1|single) policy=wan_only ;;
					wan2) policy=wan2_only ;;
					*) policy=wan_then_wan2 ;;
				esac
				uci -q set mwan3.dns_udp.use_policy="$policy"
				uci -q set mwan3.dns_udp.sticky=0
				uci -q set mwan3.dns_tcp.use_policy="$policy"
				uci -q set mwan3.dns_tcp.sticky=0
				uci -q set mwan3.wireguard_udp.use_policy="$policy"
				uci -q set mwan3.wireguard_udp.sticky=0
				uci -q set mwan3.https.use_policy="$policy"
				uci -q set mwan3.https_quic.use_policy="$policy"
				uci -q set mwan3.default_rule_v4.use_policy="$policy"
				uci commit mwan3
			fi
			uci commit network
			uci commit firewall
			ez_progress 5 wan
		fi
		if [ "$(ez_get applied_step 0)" -lt 6 ]; then
			if [ "$(ez_get sqm_enabled 0)" = 1 ] && [ "$(ez_get sqm_strategy manual)" = manual ]; then
				if [ -f /etc/config/sqm ]; then
					for item in wan:wan1 wan2:wan2; do
						iface="${item%%:*}"; section="${item#*:}"
						upload="$(ez_get "sqm_${iface}_upload" '')"; download="$(ez_get "sqm_${iface}_download" '')"
						if [ -n "$upload" ] || [ -n "$download" ]; then
							ensure_sqm_section "$section" "$([ "$iface" = wan2 ] && printf '%s' "$(ez_get wan2_port lan1)" || printf wan)"
							uci -q set "sqm.$section.enabled=1"
							[ -n "$upload" ] && uci -q set "sqm.$section.upload=$upload"
							[ -n "$download" ] && uci -q set "sqm.$section.download=$download"
						fi
					done
					uci commit sqm
				fi
			fi
			if [ "$(ez_get guest_limit_enabled 1)" = 1 ]; then ez_apply_guest_limit 1 "$(ez_get guest_upload_kbps 1500)" "$(ez_get guest_download_kbps 0)" || { echo 'Falha ao aplicar limite visitante' >&2; exit 2; }
			else ez_apply_guest_limit 0 0; fi
			uci commit qos_equipe
			apply_guest_tc_limit >/dev/null 2>&1 || true
			ez_progress 6 qos
		fi
		if [ "$(ez_get applied_step 0)" -lt 7 ]; then
			/etc/init.d/network reload >/dev/null 2>&1 || true
			sleep 1
			/etc/init.d/firewall restart >/dev/null 2>&1 || true
			/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
			[ -x /etc/init.d/sqm ] && /etc/init.d/sqm restart >/dev/null 2>&1 || true
			[ -x /etc/init.d/mwan3 ] && /etc/init.d/mwan3 restart >/dev/null 2>&1 || true
			(sleep 2; wifi reload) >/dev/null 2>&1 &
			ez_progress 7 services
		fi
		ez_set state applied
		uci commit equipe_dashboard
		ez_json
		;;
	ez-setup-install-modules)
		status="/tmp/ark-ezsetup-modules.status"; log="/tmp/ark-ezsetup-modules.log"
		stage_file="/tmp/ark-ezsetup-modules.stage"
		[ "$(cat "$status" 2>/dev/null)" != running ] || { echo running; exit 0; }
		modules="$(ez_get install_modules '')"
		if [ -z "$modules" ]; then
			echo done >"$status"
			printf '{"stage":"done","step":1,"total":1,"percent":100,"message":"Nenhum módulo pendente para instalar.","package":""}\n' >"$stage_file"
			echo installed; exit 0
		fi
		command -v apk >/dev/null 2>&1 || command -v opkg >/dev/null 2>&1 || { echo 'Gerenciador de pacotes indisponivel' >&2; exit 3; }
		echo running >"$status"
		(
			ok=1
			mod_count=$(echo "$modules" | wc -w)
			total_steps=$((mod_count + 2))
			curr_step=1
			printf '{"stage":"update","step":%d,"total":%d,"percent":10,"message":"Atualizando índice de pacotes...","package":""}\n' "$curr_step" "$total_steps" > "$stage_file"
			if command -v apk >/dev/null 2>&1; then apk update || ok=0
			else opkg update || ok=0
			fi
			for key in $modules; do
				curr_step=$((curr_step + 1))
				package="$(feature_package "$key" 2>/dev/null)" || { echo "Modulo invalido: $key"; ok=0; continue; }
				pct=$(( 15 + ((curr_step - 1) * 75 / mod_count) ))
				[ "$pct" -gt 92 ] && pct=92
				printf '{"stage":"installing","step":%d,"total":%d,"percent":%d,"message":"Instalando %s (%s)...","package":"%s","key":"%s"}\n' "$curr_step" "$total_steps" "$pct" "$key" "$package" "$package" "$key" > "$stage_file"
				if [ "$key" = speedtest ]; then
					feature_active speedtest || prepare_speedtest || ok=0
					continue
				fi
				installed "$package" && continue
				if command -v apk >/dev/null 2>&1; then apk add "$package" || ok=0
				else opkg install "$package" || ok=0
				fi
				if [ "$key" = mwan3 ] && [ -x /etc/init.d/mwan3 ]; then
					/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
					/etc/init.d/mwan3 disable >/dev/null 2>&1 || true
				fi
			done
			if [ "$ok" = 1 ]; then
				echo done >"$status"
				printf '{"stage":"done","step":%d,"total":%d,"percent":100,"message":"Módulos do Ark - Setup instalados com sucesso!","package":""}\n' "$total_steps" "$total_steps" > "$stage_file"
			else
				echo error >"$status"
				printf '{"stage":"error","step":%d,"total":%d,"percent":%d,"message":"Ocorreu uma falha ao instalar módulos. Verifique o log.","package":""}\n' "$curr_step" "$total_steps" "$pct" > "$stage_file"
			fi
		) >"$log" 2>&1 &
		echo started
		;;
	ez-setup-install-status)
		cat /tmp/ark-ezsetup-modules.status 2>/dev/null || echo idle
		;;
	ez-setup-install-log)
		cat /tmp/ark-ezsetup-modules.log 2>/dev/null
		;;
	ez-setup-install-stage)
		cat /tmp/ark-ezsetup-modules.stage 2>/dev/null || printf '{"stage":"idle","step":0,"total":0,"percent":0,"message":""}\n'
		;;
	features)
		cache="/tmp/ark-features.cache"
		if [ -s "$cache" ]; then
			now="$(date +%s)"
			mtime="$(date -r "$cache" +%s 2>/dev/null || echo 0)"
			if [ $((now - mtime)) -lt 15 ] 2>/dev/null; then
				cat "$cache"
				exit 0
			fi
		fi
		features_payload() {
		manager="$(ark_package_manager)"
		speedtest_installable=false; [ "$manager" = apk ] && speedtest_installable=true
		appearance="$(uci -q get equipe_dashboard.main.appearance || printf auto)"
		primary="$(uci -q get equipe_dashboard.main.primary || printf '#3b82f6')"
		secondary="$(uci -q get equipe_dashboard.main.secondary || printf '#8b5cf6')"
		title="$(uci -q get equipe_dashboard.main.title || printf 'ARK Router')"
		operation_profile="$(ark_operation_profile)"
		https_available=false
		cert="$(uci -q get uhttpd.main.cert)"; key="$(uci -q get uhttpd.main.key)"
		[ -n "$(uci -q get uhttpd.main.listen_https)" ] && [ -r "$cert" ] && [ -r "$key" ] && https_available=true
		https_redirect="$(uci -q get uhttpd.main.redirect_https || printf 0)"
		ca_available=false; ca_fingerprint=''
		if [ -r /etc/ark-router/ark-router-ca.crt ] && [ -r /www/ark-router/ark-router-ca.crt ]; then ca_available=true; ca_fingerprint="$(sha256sum /etc/ark-router/ark-router-ca.crt | awk '{print $1}')"; fi
		board="$(cat /tmp/sysinfo/board_name 2>/dev/null || echo 'generic')"
		cpu_cores="$(grep -c '^processor' /proc/cpuinfo 2>/dev/null || echo 1)"
		[ "$cpu_cores" -ge 1 ] 2>/dev/null || cpu_cores=1
		cpu_arch="$(uname -m 2>/dev/null || echo 'generic')"
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
			case "$board" in
				*mt7986*|*filogic-830*|*predator-w6x*) cpu_freq_mhz=2000 ;;
				*mt7981*|*filogic-820*) cpu_freq_mhz=1300 ;;
				*mt7622*) cpu_freq_mhz=1350 ;;
				*mt7621*) cpu_freq_mhz=880 ;;
				*qca9558*|*dgl-5500*|*archer-c7*) cpu_freq_mhz=720 ;;
				*qca9563*) cpu_freq_mhz=775 ;;
				*ipq4019*|*ipq4018*) cpu_freq_mhz=717 ;;
				*ipq807*) cpu_freq_mhz=2200 ;;
			esac
		fi
		if [ "$cpu_freq_mhz" -ge 1000 ]; then
			cpu_freq_str="$(awk -v f="$cpu_freq_mhz" 'BEGIN { printf "%.1f GHz", f/1000 }')"
		elif [ "$cpu_freq_mhz" -gt 0 ]; then
			cpu_freq_str="${cpu_freq_mhz} MHz"
		else
			cpu_freq_str="Padrão"
		fi

		flash_type="Flash Interna"
		root_dev="$(df -k /overlay 2>/dev/null | awk 'NR==2 {print $1}')"
		case "$root_dev" in
			*ubi*) flash_type="NAND Flash (UBI)" ;;
			*mtdblock*|*spi*) flash_type="SPI Flash (NOR)" ;;
			*mmcblk*) flash_type="eMMC / MicroSD" ;;
			*sd*|*nvme*) flash_type="SSD / Disco" ;;
			*overlayfs*) flash_type="Flash Overlay" ;;
		esac

		mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
		mem_total_mb=$((mem_total_kb / 1024))
		wifi_ax=false; wifi_be=false; wifi_6g=false; wifi_320=false; wifi_160=false
		iw_cache="/tmp/ark-iw-info.cache"
		if [ ! -s "$iw_cache" ]; then
			iw list 2>/dev/null > "$iw_cache" || true
		fi
		if grep -qE 'EHT Capabilities|EHT-PHY|EHT Iftypes' "$iw_cache" 2>/dev/null; then wifi_be=true; fi
		if grep -q 'HE Iftypes' "$iw_cache" 2>/dev/null; then wifi_ax=true; fi
		if [ "$wifi_be" = true ] && grep -qE 'Supported Channel Width: 320 MHz|EHT320' "$iw_cache" 2>/dev/null; then wifi_320=true; fi
		if grep -qE 'Supported Channel Width: 160 MHz|HE160|VHT160|EHT160' "$iw_cache" 2>/dev/null; then wifi_160=true; fi
		if grep -qE 'Band 4:|Band 6GHz|/6GHz|5955 MHz' "$iw_cache" 2>/dev/null; then wifi_6g=true; fi
		owrt_ver="$(grep 'DISTRIB_RELEASE' /etc/openwrt_release 2>/dev/null | cut -d"'" -f2 || echo '')"
		is_legacy_owrt=false
		case "$owrt_ver" in
			19.*|18.*) is_legacy_owrt=true ;;
		esac

		argon_installable=true; argon_reason=''
		if $is_legacy_owrt; then
			argon_installable=false
			argon_reason='Incompatível com OpenWrt 19.07 (o ARK Router já possui visual moderno nativo).'
		fi

		irq_installable=true; irq_reason=''
		if [ "$cpu_cores" -le 1 ]; then
			irq_installable=false
			irq_reason='Requer processador multi-core (este roteador possui 1 núcleo).'
		fi

		current_theme="$(uci -q get luci.main.mediaurlbase | sed 's|/luci-static/||')"
		[ -n "$current_theme" ] || current_theme="bootstrap"
		theme_customized="$(uci -q get equipe_dashboard.main.theme_customized 2>/dev/null || uci -q get luci.main.theme_customized 2>/dev/null || echo 0)"
		network_mode="$(uci -q get equipe_dashboard.main.network_mode || echo '')"
		cur_role="$(uci -q get equipe_dashboard.general.role || echo '')"
		dhcp_ignore="$(uci -q get dhcp.lan.ignore || echo '0')"
		lan_gw="$(uci -q get network.lan.gateway || echo '')"
		if [ -z "$network_mode" ]; then
			if [ "$cur_role" = "secondary" ] || [ "$cur_role" = "satellite" ]; then
				network_mode="ap"
			elif [ "$dhcp_ignore" = "1" ] && [ -n "$lan_gw" ]; then
				network_mode="ap"
			else
				network_mode="router"
			fi
		fi
		ping_target="$(uci -q get equipe_dashboard.main.ping_target || printf 'registro_br')"
		ping_custom_ip="$(uci -q get equipe_dashboard.main.ping_custom_ip || true)"
		sqm_installable=true; sqm_reason=""
		mwan3_installable=true; mwan3_reason=""
		speedify_installable=true; speedify_reason=""
		if ark_is_satellite_or_ap; then
			sqm_installable=false
			sqm_reason="Exclusivo do Roteador Mestre. O enfileiramento CAKE deve rodar onde a internet entra fisicamente."
			mwan3_installable=false
			mwan3_reason="Exclusivo do Roteador Mestre. Nó Satélite opera em ponte transparente (Bridge L2)."
			speedify_installable=false
			speedify_reason="Exclusivo do Roteador Mestre. O agrupamento de links de operadora deve ser executado no Gateway."
		fi

		printf '{"language":"%s","title":"%s","operation_profile":"%s","network_mode":"%s","package_manager":"%s","current_theme":"%s","theme_customized":%s,"user_theme":"%s","ping_target":"%s","ping_custom_ip":"%s","appearance":{"mode":"%s","primary":"%s","secondary":"%s"},"features":{' "$(uci -q get equipe_dashboard.main.language || printf pt-br)" "$(json_escape "$title")" "$(json_escape "$operation_profile")" "$network_mode" "$manager" "$current_theme" "$(bool $((theme_customized == 1)))" "$(json_escape "$user_theme")" "$(json_escape "$ping_target")" "$(json_escape "$ping_custom_ip")" "$appearance" "$primary" "$secondary"
		feature_json sqm luci-app-sqm "$sqm_installable" "$sqm_reason"; printf ','
		feature_json mwan3 luci-app-mwan3 "$mwan3_installable" "$mwan3_reason"; printf ','
		feature_json nlbwmon luci-app-nlbwmon true; printf ','
		feature_json upnp luci-app-upnp true; printf ','
		feature_json argon luci-theme-argon "$argon_installable" "$argon_reason"; printf ','
		feature_json wifi '' false; printf ','
		feature_json history history false; printf ','
		feature_json temperature '' false; printf ','
		feature_json custom_qos custom_qos false; printf ','
		feature_json speedify speedify "$speedify_installable" "$speedify_reason"; printf ','
		feature_json tailscale tailscale true; printf ','
		feature_json zerotier zerotier true; printf ','
		feature_json wireguard wireguard-tools true; printf ','
		feature_json adblock adblock true
		printf ','; feature_json irqbalance irqbalance "$irq_installable" "$irq_reason"
		printf ','; feature_json usteer usteer true
		cli="$(speedify_cli_path)"
		bypass='{}'; speedify_runtime_running && [ -n "$cli" ] && bypass="$("$cli" -s show streamingbypass 2>/dev/null || printf '{}')"
		printf ',"speedify_bypass":%s' "$bypass"
		starlink_public=false; [ "$(uci -q get equipe_dashboard.starlink.public_view || printf 0)" = 1 ] && starlink_public=true
		starlink_always_show=false; [ "$(uci -q get starlink_telemetry.global.always_show || printf 0)" = 1 ] && starlink_always_show=true
		sl_tel_enabled=false; [ "$(uci -q get starlink_telemetry.global.enabled || printf 0)" = 1 ] && sl_tel_enabled=true
		sl_sample_mode="$(uci -q get starlink_telemetry.global.sample_mode || printf 'auto')"
		sl_max_h="$(uci -q get starlink_telemetry.global.max_history_hours || printf 25)"
		sl_purge_boot=true; [ "$(uci -q get starlink_telemetry.global.purge_boot_email || printf 1)" = 0 ] && sl_purge_boot=false
		sl_mail_enabled=false; [ "$(uci -q get starlink_telemetry.email.enabled || printf 0)" = 1 ] && sl_mail_enabled=true
		sl_provider="$(uci -q get starlink_telemetry.email.provider || printf 'resend')"
		sl_key="$(uci -q get starlink_telemetry.email.resend_api_key || true)"
		sl_to="$(uci -q get starlink_telemetry.email.email_to || true)"
		sl_from="$(uci -q get starlink_telemetry.email.email_from || printf 'onboarding@resend.dev')"
		sl_attach=true; [ "$(uci -q get starlink_telemetry.email.attach_csv || printf 1)" = 0 ] && sl_attach=false
		sl_smtp_server="$(uci -q get starlink_telemetry.email.smtp_server || printf 'smtp.gmail.com')"
		sl_smtp_port="$(uci -q get starlink_telemetry.email.smtp_port || printf '587')"
		sl_smtp_tls=true; [ "$(uci -q get starlink_telemetry.email.smtp_tls || printf 1)" = 0 ] && sl_smtp_tls=false
		sl_smtp_user="$(uci -q get starlink_telemetry.email.smtp_user || true)"
		sl_smtp_pass="$(uci -q get starlink_telemetry.email.smtp_pass || true)"
		sl_interval="$(uci -q get starlink_telemetry.email.email_interval || printf 24)"
		printf ',"starlink_public":{"enabled":%s,"url":"/starlink/","read_only":true,"active_wan":"%s"}' "$starlink_public" "$(starlink_active_wan_get)"
		printf ',"starlink_always_show":%s,"starlink_telemetry":{"enabled":%s,"sample_mode":"%s","max_history_hours":%s,"purge_boot_email":%s,"email_enabled":%s,"provider":"%s","resend_api_key":"%s","email_to":"%s","email_from":"%s","attach_csv":%s,"smtp_server":"%s","smtp_port":"%s","smtp_tls":%s,"smtp_user":"%s","smtp_pass":"%s","email_interval":%s}' \
			"$starlink_always_show" "$sl_tel_enabled" "$(json_escape "$sl_sample_mode")" "$sl_max_h" "$sl_purge_boot" "$sl_mail_enabled" "$(json_escape "$sl_provider")" "$(json_escape "$sl_key")" "$(json_escape "$sl_to")" "$(json_escape "$sl_from")" "$sl_attach" \
			"$(json_escape "$sl_smtp_server")" "$(json_escape "$sl_smtp_port")" "$sl_smtp_tls" "$(json_escape "$sl_smtp_user")" "$(json_escape "$sl_smtp_pass")" "$sl_interval"
		current_version="$(ark_current_version)"
		update_repo="$(ark_update_repo)"
		wifi_wed_supported=false
		wifi_wed_enabled=false
		for mod in mt7915e mt7996e mt7921e; do
			if [ -e "/sys/module/$mod/parameters/wed_enable" ]; then
				wifi_wed_supported=true
				[ "$(cat "/sys/module/$mod/parameters/wed_enable" 2>/dev/null)" = "Y" ] && wifi_wed_enabled=true
			fi
		done
		wifi_maxpower_enabled=false
		cur_country="$(uci -q get wireless.radio0.country || uci -q get wireless.radio1.country || echo 'BR')"
		[ "$cur_country" = "PA" ] && wifi_maxpower_enabled=true
		asu_check=false
		[ "$(uci -q get attendedsysupgrade.client.login_check_for_upgrades || echo 0)" = "1" ] && asu_check=true
		printf '},"hardware":{"cpu_cores":%s,"cpu_freq_mhz":%s,"cpu_freq_str":"%s","cpu_arch":"%s","mem_total_mb":%s,"flash_type":"%s","wifi_160_supported":%s,"wifi_ax_supported":%s,"wifi_be_supported":%s,"wifi_6g_supported":%s,"wifi_320_supported":%s,"wifi_wed_supported":%s,"wifi_wed_enabled":%s,"wifi_maxpower_enabled":%s,"is_legacy_owrt":%s},"https":{"available":%s,"redirect":%s,"certificate":"local","ca_available":%s,"ca_fingerprint":"%s","ca_download":"/ark-router/ark-router-ca.crt"},"update":{"current":"%s","repo":"%s","manager":"%s","asu_check":%s}}\n' \
			"$cpu_cores" "$cpu_freq_mhz" "$(json_escape "$cpu_freq_str")" "$(json_escape "$cpu_arch")" "$mem_total_mb" "$(json_escape "$flash_type")" "$wifi_160" "$wifi_ax" "$wifi_be" "$wifi_6g" "$wifi_320" "$wifi_wed_supported" "$wifi_wed_enabled" "$wifi_maxpower_enabled" "$is_legacy_owrt" "$https_available" "$(bool "$https_redirect")" "$ca_available" "$ca_fingerprint" "$(json_escape "$current_version")" "$(json_escape "$update_repo")" "$(json_escape "$manager")" "$asu_check"
		}
		features_out="$(features_payload)"
		printf '%s\n' "$features_out" > "$cache" 2>/dev/null
		printf '%s\n' "$features_out"
		;;
	self-update-check)
		ark_update_json
		;;
	self-update-status)
		cat /tmp/ark-router-self-update.status 2>/dev/null || echo idle
		;;
	self-update-log)
		cat /tmp/ark-router-self-update.log 2>/dev/null
		;;
	self-update-start)
		status=/tmp/ark-router-self-update.status
		log=/tmp/ark-router-self-update.log
		grep -qE '("state":"running"|^running)' "$status" 2>/dev/null && { echo running; exit 0; }
		info="$(ark_update_json)"
		available="$(printf '%s' "$info" | jsonfilter -e '@.available' 2>/dev/null)"
		url="$(printf '%s' "$info" | jsonfilter -e '@.url' 2>/dev/null)"
		asset="$(printf '%s' "$info" | jsonfilter -e '@.asset' 2>/dev/null)"
		manager="$(printf '%s' "$info" | jsonfilter -e '@.manager' 2>/dev/null)"
		latest="$(printf '%s' "$info" | jsonfilter -e '@.latest' 2>/dev/null)"
		repo="$(printf '%s' "$info" | jsonfilter -e '@.repo' 2>/dev/null)"
		[ -n "$repo" ] || repo="$(ark_update_repo)"
		[ "$available" = true ] || { echo 'Nenhuma atualizacao mais nova disponivel' >&2; exit 3; }
		[ -n "$url" ] && [ -n "$asset" ] || { echo 'Arquivo de atualizacao indisponivel' >&2; exit 3; }
		echo '{"state":"running","percent":10,"message":"Iniciando processo de atualização..."}' >"$status"
		(
			set -e
			tmp=/tmp/ark-router-self-update
			rm -rf "$tmp"; mkdir -p "$tmp"
			echo '{"state":"running","percent":20,"message":"1/4 Criando backup de segurança do sistema..."}' >"$status"
			backup="/tmp/ark-router-before-self-update-$(date +%Y%m%d-%H%M%S).tar.gz"
			if command -v sysupgrade >/dev/null 2>&1; then sysupgrade -b "$backup" 2>/dev/null || true; fi
			echo "Backup: $backup"
			echo '{"state":"running","percent":45,"message":"2/4 Baixando pacote '"$asset"' do GitHub..."}' >"$status"
			clean_latest="$(normalize_version "$latest")"
			download_ok=0
			echo "Downloading primary: $url"
			if wget -T 35 --no-check-certificate -O "$tmp/$asset" "$url" 2>&1 && [ -s "$tmp/$asset" ]; then
				download_ok=1
			fi
			if [ "$download_ok" -eq 0 ] && [ -n "$clean_latest" ]; then
				echo "Fallback downloading from releases tag v$clean_latest..."
				if wget -T 35 --no-check-certificate -O "$tmp/$asset" "https://github.com/$repo/releases/download/v$clean_latest/$asset" 2>&1 && [ -s "$tmp/$asset" ]; then
					download_ok=1
				fi
			fi
			if [ "$download_ok" -eq 0 ]; then
				echo "Fallback downloading from releases/latest..."
				if wget -T 35 --no-check-certificate -O "$tmp/$asset" "https://github.com/$repo/releases/latest/download/$asset" 2>&1 && [ -s "$tmp/$asset" ]; then
					download_ok=1
				fi
			fi
			if [ "$download_ok" -eq 0 ]; then
				echo "Fallback downloading direct from raw..."
				if wget -T 35 --no-check-certificate -O "$tmp/$asset" "https://raw.githubusercontent.com/$repo/main/dist/sdk/$asset" 2>&1 && [ -s "$tmp/$asset" ]; then
					download_ok=1
				fi
			fi
			if [ "$download_ok" -eq 0 ] || [ ! -s "$tmp/$asset" ]; then
				echo "Erro fatal: Nao foi possivel baixar o arquivo $asset de nenhuma fonte." >&2
				exit 3
			fi
			echo '{"state":"running","percent":75,"message":"3/4 Instalando nova versão '"$latest"'..."}' >"$status"
			case "$manager" in
				apk)
					ark_remove_opposite_profile "$asset" "$manager"
					apk add --allow-untrusted --force-overwrite "$tmp/$asset"
					;;
				opkg)
					ark_remove_opposite_profile "$asset" "$manager"
					opkg install --force-overwrite --force-reinstall "$tmp/$asset"
					;;
				*)
					echo 'Gerenciador de pacotes indisponivel' >&2
					exit 3
					;;
			esac
			installed_after="$(ark_current_version)"
			echo "Installed version after update: $installed_after"
			clean_installed="$(normalize_version "$installed_after")"
			if [ -n "$clean_latest" ] && version_gt "$clean_latest" "$clean_installed"; then
				echo "Atualizacao baixada, mas a versao instalada continua antiga ($installed_after < $latest)." >&2
				echo "Isso normalmente indica asset de release antigo/incompleto ou pacote rejeitado pelo gerenciador." >&2
				exit 4
			fi
			echo '{"state":"running","percent":90,"message":"4/4 Limpando caches e recarregando serviços web..."}' >"$status"
			# Limpa pacotes legados de speedtest se existirem
			if command -v apk >/dev/null 2>&1 && apk info -e speedtest-go >/dev/null 2>&1; then
				apk del speedtest-go >/dev/null 2>&1 || true
			fi
			rm -rf /tmp/ark-speedtest /tmp/ark-speedtest-download
			[ -x /etc/uci-defaults/99-ark-router-theme ] && /etc/uci-defaults/99-ark-router-theme
			rm -f /tmp/luci-indexcache
			rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
			[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
			[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
			echo '{"state":"done","percent":100,"message":"Atualização concluída com sucesso! Versão '"$latest"' ativa."}' >"$status"
		) >"$log" 2>&1 || echo '{"state":"error","percent":0,"message":"Falha na atualização."}' >"$status" &
		echo started
		;;
	manual-update-start)
		status=/tmp/ark-router-self-update.status
		log=/tmp/ark-router-self-update.log
		grep -qE '("state":"running"|^running)' "$status" 2>/dev/null && { echo running; exit 0; }
		manager="$(ark_package_manager)"
		pkg_file="$2"
		if [ -z "$pkg_file" ]; then
			case "$manager" in
				apk) [ -f /tmp/upload.apk ] && pkg_file="/tmp/upload.apk" ;;
				opkg) [ -f /tmp/upload.ipk ] && pkg_file="/tmp/upload.ipk" ;;
			esac
		fi
		[ -n "$pkg_file" ] && [ -s "$pkg_file" ] || { echo "Arquivo de pacote invalido ou nao encontrado" >&2; exit 3; }
		echo '{"state":"running","percent":10,"message":"Iniciando instalação manual offline..."}' >"$status"
		(
			set -e
			echo '{"state":"running","percent":25,"message":"1/4 Criando backup de segurança do sistema..."}' >"$status"
			backup="/tmp/ark-router-before-self-update-$(date +%Y%m%d-%H%M%S).tar.gz"
			if command -v sysupgrade >/dev/null 2>&1; then sysupgrade -b "$backup" 2>/dev/null || true; fi
			echo "Backup: $backup"
			echo '{"state":"running","percent":50,"message":"2/4 Verificando pacote e preparando instalação..."}' >"$status"
			echo "Arquivo: $pkg_file"
			echo '{"state":"running","percent":75,"message":"3/4 Instalando pacote com '"$manager"'..."}' >"$status"
			case "$manager" in
				apk)
					apk add --allow-untrusted --force-overwrite "$pkg_file"
					;;
				opkg)
					opkg install --force-overwrite "$pkg_file"
					;;
				*)
					echo 'Gerenciador de pacotes indisponivel' >&2
					exit 3
					;;
			esac
			rm -f "$pkg_file"
			installed_after="$(ark_current_version)"
			echo "Versão instalada: $installed_after"
			echo '{"state":"running","percent":90,"message":"4/4 Limpando caches e recarregando serviços web..."}' >"$status"
			if command -v apk >/dev/null 2>&1 && apk info -e speedtest-go >/dev/null 2>&1; then
				apk del speedtest-go >/dev/null 2>&1 || true
			fi
			rm -rf /tmp/ark-speedtest /tmp/ark-speedtest-download
			[ -x /etc/uci-defaults/99-ark-router-theme ] && /etc/uci-defaults/99-ark-router-theme
			rm -f /tmp/luci-indexcache
			rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
			[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
			[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
			echo '{"state":"done","percent":100,"message":"Instalação concluída com sucesso! Versão '"$installed_after"' ativa."}' >"$status"
		) >"$log" 2>&1 || echo '{"state":"error","percent":0,"message":"Falha na instalação manual do pacote."}' >"$status" &
		echo started
		;;
	language)
		case "$2" in
			pt-br) luci_lang="pt_br" ;;
			en) luci_lang="en" ;;
			es) luci_lang="es" ;;
			*) echo 'Idioma invalido' >&2; exit 2 ;;
		esac
		uci -q set equipe_dashboard.main=settings
		uci -q set "equipe_dashboard.main.language=$2"
		uci commit equipe_dashboard
		uci -q set "luci.main.lang=$luci_lang"
		uci commit luci
		rm -f /tmp/luci-indexcache 2>/dev/null || true
		rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
		rm -f /tmp/ark-features.cache 2>/dev/null || true
		echo ok
		;;
	title)
		title="$2"
		[ -n "$title" ] && [ "${#title}" -le 40 ] || { echo 'O nome deve ter entre 1 e 40 caracteres' >&2; exit 2; }
		printf '%s' "$title" | grep -q '[[:cntrl:]]' && { echo 'O nome contem caracteres de controle invalidos' >&2; exit 2; }
		uci -q set equipe_dashboard.main=settings
		uci -q set "equipe_dashboard.main.title=$title"
		uci commit equipe_dashboard
		rm -f /tmp/ark-features.cache 2>/dev/null || true
		echo ok
		;;
	profile)
		target_mode="$2"
		[ -n "$target_mode" ] || target_mode="status"
		if [ "$target_mode" = status ]; then
			has_bk=0; [ -f /etc/config/ark_last_profile_backup.tar.gz ] && has_bk=1
			printf '{"operation_profile":"%s","has_backup":%s}\n' "$(ark_operation_profile)" "$(bool "$has_bk")"
		elif [ "$target_mode" = restore ]; then
			if [ -f /etc/config/ark_last_profile_backup.tar.gz ]; then
				tar -xzf /etc/config/ark_last_profile_backup.tar.gz -C /
				/etc/init.d/firewall reload >/dev/null 2>&1 || true
				[ -x /etc/init.d/sqm ] && /etc/init.d/sqm restart >/dev/null 2>&1 || true
				/etc/init.d/rpcd restart >/dev/null 2>&1 || true
				rm -f /tmp/ark-features.cache 2>/dev/null || true
				printf '{"status":"restored","operation_profile":"%s"}\n' "$(ark_operation_profile)"
			else
				echo 'Nenhum backup anterior encontrado' >&2; exit 3
			fi
		else
			apply_operation_profile "$target_mode" || exit $?
			rm -f /tmp/ark-features.cache 2>/dev/null || true
			printf '{"status":"ok","operation_profile":"%s","has_backup":true}\n' "$(ark_operation_profile)"
		fi
		;;
	appearance)
		case "$2" in auto|equipe|custom) ;; *) echo 'Modo de aparencia invalido' >&2; exit 2 ;; esac
		primary="${3:-#3b82f6}"; secondary="${4:-#8b5cf6}"
		printf '%s' "$primary" | grep -Eq '^#[0-9A-Fa-f]{6}$' || { echo 'Cor primaria invalida' >&2; exit 2; }
		printf '%s' "$secondary" | grep -Eq '^#[0-9A-Fa-f]{6}$' || { echo 'Cor secundaria invalida' >&2; exit 2; }
		uci -q set equipe_dashboard.main=settings
		uci -q set "equipe_dashboard.main.appearance=$2"
		uci -q set "equipe_dashboard.main.primary=$primary"
		uci -q set "equipe_dashboard.main.secondary=$secondary"
		uci commit equipe_dashboard
		rm -f /tmp/ark-features.cache 2>/dev/null || true
		echo ok
		;;
	feature-hide)
		feature_package "$2" >/dev/null || { echo 'Recurso invalido' >&2; exit 2; }
		case "$3" in 0|1) ;; *) echo 'Preferencia invalida' >&2; exit 2 ;; esac
		uci -q set "equipe_dashboard.$2=feature"
		uci -q set "equipe_dashboard.$2.hidden=$3"
		uci commit equipe_dashboard
		rm -f /tmp/ark-features.cache 2>/dev/null || true
		echo ok
		;;
	feature-install)
		key="$2"; package="$(feature_package "$key")" || { echo 'Recurso invalido' >&2; exit 2; }
		status="/tmp/equipe-dashboard-install-$key.status"; log="/tmp/equipe-dashboard-install-$key.log"
		pid_file="/tmp/equipe-dashboard-install-$key.pid"
		if [ "$key" = speedtest ]; then feature_active "$key" && { echo done >"$status"; echo installed; exit 0; }
		elif [ "$key" = speedify ]; then feature_active "$key" && { echo done >"$status"; echo installed; exit 0; }
		elif [ "$key" = tailscale ]; then feature_active "$key" && { echo done >"$status"; echo installed; exit 0; }
		elif [ "$key" = usteer ]; then
			if installed "$package"; then
				if [ ! -s /etc/config/usteer ]; then
					touch /etc/config/usteer
					uci -q set usteer.@usteer[0]=usteer 2>/dev/null || uci -q add usteer usteer
					uci -q set usteer.@usteer[0].network='lan'
					uci -q set usteer.@usteer[0].syslog='1'
					uci -q set usteer.@usteer[0].min_snr='15'
					uci -q set usteer.@usteer[0].band_steering_threshold='20'
					uci -q set usteer.@usteer[0].kick_threshold='-78'
					uci -q set usteer.@usteer[0].max_retries='3'
					uci commit usteer 2>/dev/null || true
				fi
				if [ -x /etc/init.d/usteer ]; then
					/etc/init.d/usteer enable >/dev/null 2>&1 || true
					/etc/init.d/usteer restart >/dev/null 2>&1 || true
				fi
				uci -q set equipe_dashboard.wifi=settings 2>/dev/null || true
				uci -q set equipe_dashboard.wifi.usteer_enabled=1
				uci commit equipe_dashboard 2>/dev/null || true
				echo done >"$status"
				echo installed
				exit 0
			fi
		elif [ "$key" = nlbwmon ]; then
			if installed "$package"; then
				[ -x /etc/init.d/nlbwmon ] && { /etc/init.d/nlbwmon enable >/dev/null 2>&1 || true; /etc/init.d/nlbwmon restart >/dev/null 2>&1 || true; }
				echo done >"$status"; echo installed; exit 0
			fi
		elif [ "$key" = upnp ]; then
			if (is_fw4 && ark_upnp_is_legacy_iptables) || (is_fw3 && ark_upnp_is_legacy_nftables_on_fw3); then
				ark_migrate_upnp_variant
				echo done >"$status"; echo installed; exit 0
			elif installed "$package"; then
				[ -x /etc/init.d/miniupnpd ] && { /etc/init.d/miniupnpd enable >/dev/null 2>&1 || true; /etc/init.d/miniupnpd restart >/dev/null 2>&1 || true; }
				echo done >"$status"; echo installed; exit 0
			fi
		elif [ "$key" = adblock ]; then
			if installed "$package"; then
				[ -x /etc/init.d/adblock ] && { /etc/init.d/adblock enable >/dev/null 2>&1 || true; /etc/init.d/adblock restart >/dev/null 2>&1 || true; }
				echo done >"$status"; echo installed; exit 0
			fi
		elif [ "$key" = irqbalance ]; then
			if installed "$package"; then
				[ -x /etc/init.d/irqbalance ] && { /etc/init.d/irqbalance enable >/dev/null 2>&1 || true; /etc/init.d/irqbalance restart >/dev/null 2>&1 || true; }
				echo done >"$status"; echo installed; exit 0
			fi
		else installed "$package" && { echo done >"$status"; echo installed; exit 0; }; fi
		if [ "$(cat "$status" 2>/dev/null)" = running ] && [ -f "$pid_file" ]; then
			bg_pid="$(cat "$pid_file" 2>/dev/null)"
			if [ -n "$bg_pid" ] && kill -0 "$bg_pid" 2>/dev/null; then
				echo running; exit 0
			fi
		fi
		command -v apk >/dev/null 2>&1 || command -v opkg >/dev/null 2>&1 || { echo 'Gerenciador de pacotes indisponivel' >&2; exit 3; }
		echo running >"$status"
		(
			ok=1
			if [ "$key" = speedtest ]; then prepare_speedtest || ok=0
			elif [ "$key" = speedify ]; then speedify_install_auto_safe || ok=0
			elif [ "$key" = tailscale ]; then tailscale_install || ok=0
			elif [ "$key" = zerotier ]; then zerotier_enable || ok=0
			elif [ "$key" = wireguard ]; then
				if command -v apk >/dev/null 2>&1; then
					apk update && apk add wireguard-tools luci-proto-wireguard kmod-wireguard qrencode || ok=0
				else
					opkg update && opkg install wireguard-tools luci-proto-wireguard kmod-wireguard qrencode || ok=0
				fi
				killall -HUP netifd 2>/dev/null || true
			elif [ "$key" = adblock ]; then
				if command -v apk >/dev/null 2>&1; then
					apk update && (apk add adblock luci-app-adblock || apk add adblock) || ok=0
				else
					opkg update && (opkg install adblock luci-app-adblock || opkg install adblock) || ok=0
				fi
			elif [ "$key" = usteer ]; then
				if command -v apk >/dev/null 2>&1; then
					apk update && (apk add usteer luci-app-usteer || apk add usteer) || ok=0
					if apk info -e wpad-basic-mbedtls >/dev/null 2>&1 || apk info -e wpad-basic >/dev/null 2>&1; then
						apk add wpad-mbedtls || true
					fi
				else
					opkg update && (opkg install usteer luci-app-usteer || opkg install usteer) || ok=0
					if opkg list-installed 2>/dev/null | grep -q '^wpad-basic'; then
						opkg remove wpad-basic-mbedtls wpad-basic --force-depends 2>/dev/null || true
						opkg install wpad-mbedtls || true
					fi
				fi
				if [ ! -s /etc/config/usteer ]; then
					touch /etc/config/usteer
					uci -q set usteer.@usteer[0]=usteer 2>/dev/null || uci -q add usteer usteer
					uci -q set usteer.@usteer[0].network='lan'
					uci -q set usteer.@usteer[0].syslog='1'
					uci -q set usteer.@usteer[0].min_snr='15'
					uci -q set usteer.@usteer[0].band_steering_threshold='20'
					uci -q set usteer.@usteer[0].kick_threshold='-78'
					uci -q set usteer.@usteer[0].max_retries='3'
					uci commit usteer 2>/dev/null || true
				fi
				if [ -x /etc/init.d/usteer ]; then
					/etc/init.d/usteer enable >/dev/null 2>&1 || true
					/etc/init.d/usteer restart >/dev/null 2>&1 || true
				fi
				uci -q set equipe_dashboard.wifi=settings 2>/dev/null || true
				uci -q set equipe_dashboard.wifi.usteer_enabled=1
				uci commit equipe_dashboard 2>/dev/null || true
			elif [ "$key" = argon ] && command -v apk >/dev/null 2>&1 && ! apk search luci-theme-argon 2>/dev/null | grep -qx 'luci-theme-argon.*'; then
				install_argon_release || ok=0
			elif [ "$key" = upnp ] && is_fw4; then
				if command -v apk >/dev/null 2>&1; then
					apk update && apk add luci-app-upnp miniupnpd-nftables || ok=0
				else
					opkg update && opkg install luci-app-upnp miniupnpd-nftables || ok=0
				fi
			elif command -v apk >/dev/null 2>&1; then
				apk update && apk add "$package" || ok=0
			else
				opkg update && opkg install "$package" || ok=0
			fi
			if [ "$key" = mwan3 ] && [ -x /etc/init.d/mwan3 ]; then
				/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
				/etc/init.d/mwan3 disable >/dev/null 2>&1 || true
			elif [ "$key" = nlbwmon ] && [ -x /etc/init.d/nlbwmon ]; then
				/etc/init.d/nlbwmon enable >/dev/null 2>&1 || true
				/etc/init.d/nlbwmon restart >/dev/null 2>&1 || true
			elif [ "$key" = upnp ] && [ -x /etc/init.d/miniupnpd ]; then
				/etc/init.d/miniupnpd enable >/dev/null 2>&1 || true
				/etc/init.d/miniupnpd restart >/dev/null 2>&1 || true
			elif [ "$key" = adblock ] && [ -x /etc/init.d/adblock ]; then
				/etc/init.d/adblock enable >/dev/null 2>&1 || true
				/etc/init.d/adblock restart >/dev/null 2>&1 || true
			elif [ "$key" = irqbalance ] && [ -x /etc/init.d/irqbalance ]; then
				/etc/init.d/irqbalance enable >/dev/null 2>&1 || true
				/etc/init.d/irqbalance restart >/dev/null 2>&1 || true
			fi
			rm -f "$pid_file"
			[ "$ok" = 1 ] && echo done >"$status" || echo error >"$status"
		) >"$log" 2>&1 &
		echo $! > "$pid_file"
		echo started
		;;
	feature-install-status)
		feature_package "$2" >/dev/null || { echo 'Recurso invalido' >&2; exit 2; }
		status="/tmp/equipe-dashboard-install-$2.status"
		pid_file="/tmp/equipe-dashboard-install-$2.pid"
		if [ "$(cat "$status" 2>/dev/null)" = running ]; then
			if [ -f "$pid_file" ]; then
				bg_pid="$(cat "$pid_file" 2>/dev/null)"
				if [ -n "$bg_pid" ] && ! kill -0 "$bg_pid" 2>/dev/null; then
					[ "$(cat "$status" 2>/dev/null)" = running ] && echo error >"$status"
					rm -f "$pid_file"
				fi
			else
				ps w 2>/dev/null | grep -E "apk|opkg|wget" | grep -vq grep || echo error >"$status"
			fi
		fi
		cat "$status" 2>/dev/null || echo idle
		;;
	feature-install-log)
		feature_package "$2" >/dev/null || { echo 'Recurso invalido' >&2; exit 2; }
		cat "/tmp/equipe-dashboard-install-$2.log" 2>/dev/null
		;;
	feature-install-missing)
		status="/tmp/equipe-dashboard-install-missing.status"; log="/tmp/equipe-dashboard-install-missing.log"
		stage_file="/tmp/equipe-dashboard-install-missing.stage"
		pid_file="/tmp/equipe-dashboard-install-missing.pid"
		if [ "$(cat "$status" 2>/dev/null)" = running ] && [ -f "$pid_file" ]; then
			bg_pid="$(cat "$pid_file" 2>/dev/null)"
			if [ -n "$bg_pid" ] && kill -0 "$bg_pid" 2>/dev/null; then
				echo running; exit 0
			fi
		fi
		command -v apk >/dev/null 2>&1 || command -v opkg >/dev/null 2>&1 || { echo 'Gerenciador de pacotes indisponivel' >&2; exit 3; }
		keys=''
		for key in $(bulk_feature_keys); do
			feature_missing_installable "$key" && keys="$keys $key"
		done
		if [ -z "$keys" ]; then
			echo done >"$status"
			printf '{"stage":"done","step":1,"total":1,"percent":100,"message":"Todos os recursos leves já estavam instalados.","package":""}\n' >"$stage_file"
			echo installed; exit 0
		fi
		echo running >"$status"
		(
			ok=1
			key_count=$(echo "$keys" | wc -w)
			total_steps=$((key_count + 2))
			curr_step=1
			printf '{"stage":"update","step":%d,"total":%d,"percent":10,"message":"Atualizando índice de pacotes...","package":""}\n' "$curr_step" "$total_steps" > "$stage_file"
			echo "Instalando recursos:$keys"
			if command -v apk >/dev/null 2>&1; then apk update || ok=0
			else opkg update || ok=0
			fi
			for key in $keys; do
				curr_step=$((curr_step + 1))
				package="$(feature_package "$key")" || { echo "Recurso invalido: $key"; ok=0; continue; }
				pct=$(( 15 + ((curr_step - 1) * 75 / key_count) ))
				[ "$pct" -gt 92 ] && pct=92
				printf '{"stage":"installing","step":%d,"total":%d,"percent":%d,"message":"Instalando %s (%s)...","package":"%s","key":"%s"}\n' "$curr_step" "$total_steps" "$pct" "$key" "$package" "$package" "$key" > "$stage_file"
				echo "==> $key ($package)"
				if [ "$key" = speedtest ]; then
					prepare_speedtest || ok=0
				elif [ "$key" = argon ] && command -v apk >/dev/null 2>&1 && ! apk search luci-theme-argon 2>/dev/null | grep -qx 'luci-theme-argon.*'; then
					install_argon_release || ok=0
				elif [ "$key" = upnp ]; then
					if (is_fw4 && ark_upnp_is_legacy_iptables) || (is_fw3 && ark_upnp_is_legacy_nftables_on_fw3); then
						ark_migrate_upnp_variant || ok=0
					elif is_fw4; then
						if command -v apk >/dev/null 2>&1; then
							installed "$package" || apk add luci-app-upnp miniupnpd-nftables || ok=0
						else
							installed "$package" || opkg install luci-app-upnp miniupnpd-nftables || ok=0
						fi
					elif command -v apk >/dev/null 2>&1; then
						installed "$package" || apk add "$package" || ok=0
					else
						installed "$package" || opkg install "$package" || ok=0
					fi
				elif command -v apk >/dev/null 2>&1; then
					installed "$package" || apk add "$package" || ok=0
				else
					installed "$package" || opkg install "$package" || ok=0
				fi
				if [ "$key" = mwan3 ] && [ -x /etc/init.d/mwan3 ]; then
					# Prevent unconfigured mwan3 from blackholing single-WAN connections during bulk install
					/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
					/etc/init.d/mwan3 disable >/dev/null 2>&1 || true
				fi
			done
			rm -f "$pid_file"
			if [ "$ok" = 1 ]; then
				echo done >"$status"
				printf '{"stage":"done","step":%d,"total":%d,"percent":100,"message":"Todos os recursos foram instalados com sucesso!","package":""}\n' "$total_steps" "$total_steps" > "$stage_file"
			else
				echo error >"$status"
				printf '{"stage":"error","step":%d,"total":%d,"percent":%d,"message":"Ocorreu uma falha durante a instalação. Verifique o log.","package":""}\n' "$curr_step" "$total_steps" "$pct" > "$stage_file"
			fi
		) >"$log" 2>&1 &
		echo $! > "$pid_file"
		echo started
		;;
	feature-install-missing-status)
		status="/tmp/equipe-dashboard-install-missing.status"
		pid_file="/tmp/equipe-dashboard-install-missing.pid"
		if [ "$(cat "$status" 2>/dev/null)" = running ]; then
			if [ -f "$pid_file" ]; then
				bg_pid="$(cat "$pid_file" 2>/dev/null)"
				if [ -n "$bg_pid" ] && ! kill -0 "$bg_pid" 2>/dev/null; then
					[ "$(cat "$status" 2>/dev/null)" = running ] && echo error >"$status"
					rm -f "$pid_file"
				fi
			else
				ps w 2>/dev/null | grep -E "apk|opkg|wget" | grep -vq grep || echo error >"$status"
			fi
		fi
		cat "$status" 2>/dev/null || echo idle
		;;
	feature-install-missing-log)
		cat "/tmp/equipe-dashboard-install-missing.log" 2>/dev/null
		;;
	feature-install-missing-stage)
		cat "/tmp/equipe-dashboard-install-missing.stage" 2>/dev/null || printf '{"stage":"idle","step":0,"total":0,"percent":0,"message":""}\n'
		;;
	cleanup-status)
		cleanup_status_json
		;;
	cleanup-apply)
		shift
		cleanup_apply_keys "$@"
		;;
	theme)
		target="$2"
		case "$target" in
			ark)
				[ -d /www/luci-static/ark ] || { echo 'Tema ARK nao encontrado' >&2; exit 3; }
				uci -q set luci.main.mediaurlbase='/luci-static/ark'
				uci -q set luci.themes.ARK='/luci-static/ark'
				uci -q set equipe_dashboard.main.theme_customized='1'
				uci -q set equipe_dashboard.main.user_theme='ark'
				uci -q set luci.main.theme_customized='1'
				uci -q set luci.main.user_theme='ark'
				uci commit luci
				uci commit equipe_dashboard 2>/dev/null || true
				rm -f /tmp/luci-indexcache
				rm -rf /tmp/luci-modulecache/* 2>/dev/null
				rm -f /tmp/ark-features.cache 2>/dev/null || true
				echo ok
				;;
			bootstrap)
				[ -d /www/luci-static/bootstrap ] || { echo 'Tema Bootstrap nao encontrado' >&2; exit 3; }
				uci -q set luci.main.mediaurlbase='/luci-static/bootstrap'
				uci -q set equipe_dashboard.main.theme_customized='1'
				uci -q set equipe_dashboard.main.user_theme='bootstrap'
				uci -q set luci.main.theme_customized='1'
				uci -q set luci.main.user_theme='bootstrap'
				uci commit luci
				uci commit equipe_dashboard 2>/dev/null || true
				rm -f /tmp/luci-indexcache
				rm -rf /tmp/luci-modulecache/* 2>/dev/null
				rm -f /tmp/ark-features.cache 2>/dev/null || true
				echo ok
				;;
			argon)
				[ -d /www/luci-static/argon ] || { echo 'Tema Argon nao instalado' >&2; exit 3; }
				uci -q set luci.main.mediaurlbase='/luci-static/argon'
				uci -q set equipe_dashboard.main.theme_customized='1'
				uci -q set equipe_dashboard.main.user_theme='argon'
				uci -q set luci.main.theme_customized='1'
				uci -q set luci.main.user_theme='argon'
				uci commit luci
				uci commit equipe_dashboard 2>/dev/null || true
				rm -f /tmp/luci-indexcache
				rm -rf /tmp/luci-modulecache/* 2>/dev/null
				rm -f /tmp/ark-features.cache 2>/dev/null || true
				echo ok
				;;
			*)
				echo 'Tema invalido' >&2; exit 2
				;;
		esac
		;;
	esac
}
