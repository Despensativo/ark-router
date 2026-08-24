#!/bin/sh
set -eu

REPO="${ARK_ROUTER_REPO:-${ARC_ROUTER_REPO:-Despensativo/ark-router}}"
BRANCH="${ARK_ROUTER_BRANCH:-main}"
MODE="${ARK_ROUTER_INSTALL_MODE:-${INSTALL_MODE:-auto}}"
PROFILE="${ARK_ROUTER_PROFILE:-auto}"
TMP_DIR="${TMPDIR:-/tmp}"
DRY_RUN="${DRY_RUN:-0}"
FULL_MIN_RAM_KB="${ARK_ROUTER_FULL_MIN_RAM_KB:-480000}"
FULL_MIN_OVERLAY_KB="${ARK_ROUTER_FULL_MIN_OVERLAY_KB:-64000}"
BASE_URL="https://github.com/$REPO/releases/latest/download"
SOURCE_URL="https://github.com/$REPO/archive/refs/heads/$BRANCH.tar.gz"

if [ "$(id -u 2>/dev/null || echo 1)" != 0 ]; then
	echo "ARK Router installer must run as root on the OpenWrt router." >&2
	exit 1
fi

run() {
	if [ "$DRY_RUN" = 1 ]; then
		echo "DRY_RUN=1: $*"
	else
		"$@"
	fi
}

manager() {
	case "${ARK_ROUTER_PACKAGE_MANAGER:-}" in
		apk|opkg) echo "$ARK_ROUTER_PACKAGE_MANAGER"; return 0 ;;
		"") ;;
		*) echo "Invalid ARK_ROUTER_PACKAGE_MANAGER: $ARK_ROUTER_PACKAGE_MANAGER. Use apk or opkg." >&2; return 2 ;;
	esac
	if command -v apk >/dev/null 2>&1; then echo apk
	elif command -v opkg >/dev/null 2>&1; then echo opkg
	else echo none
	fi
}

mem_total_kb() {
	v="$(awk '/^MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || true)"
	[ -n "$v" ] && echo "$v" || echo 0
}

overlay_avail_kb() {
	v="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4; exit}' || true)"
	[ -n "$v" ] && echo "$v" || echo 0
}

best_profile() {
	ram="$(mem_total_kb)"; [ -n "$ram" ] || ram=0
	overlay="$(overlay_avail_kb)"; [ -n "$overlay" ] || overlay=0
	if [ "$ram" -ge "$FULL_MIN_RAM_KB" ] && [ "$overlay" -ge "$FULL_MIN_OVERLAY_KB" ]; then
		echo full
	else
		echo lite
	fi
}

installed_profile() {
	pm="$(manager)"
	case "$pm" in
		apk)
			apk info -e luci-app-ark-router-full >/dev/null 2>&1 && { echo full; return 0; }
			;;
		opkg)
			opkg status luci-app-ark-router-full 2>/dev/null | grep -q '^Status:.* installed' && { echo full; return 0; }
			;;
	esac
	return 1
}

restart_luci() {
	[ "$DRY_RUN" = 1 ] && return 0
	rm -f /tmp/luci-indexcache 2>/dev/null || true
	rm -rf /tmp/luci-modulecache 2>/dev/null || true
	[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history enable >/dev/null 2>&1 || true
	[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history restart >/dev/null 2>&1 || true
	[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
	[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
}

install_release() {
	pm="$(manager)"
	case "$PROFILE" in
		lite|default|"") pkg_base="luci-app-ark-router"; PROFILE=lite ;;
		full) pkg_base="luci-app-ark-router-full" ;;
		auto)
			PROFILE="$(installed_profile 2>/dev/null || best_profile)"
			if [ "$PROFILE" = full ]; then pkg_base="luci-app-ark-router-full"; else pkg_base="luci-app-ark-router"; fi
			echo "Auto profile selected: $PROFILE (Full is preserved when already installed; otherwise hardware decides. RAM $(mem_total_kb) KB, overlay free $(overlay_avail_kb) KB)"
			;;
		*) echo "Invalid ARK_ROUTER_PROFILE: $PROFILE. Use auto, lite or full." >&2; return 2 ;;
	esac
	case "$pm" in
		apk)
			pkg_url="$BASE_URL/$pkg_base.apk"
			pkg_file="$TMP_DIR/$pkg_base.apk"
			install_cmd="apk add --allow-untrusted --force-overwrite"
			;;
		opkg)
			pkg_url="$BASE_URL/$pkg_base.ipk"
			pkg_file="$TMP_DIR/$pkg_base.ipk"
			install_cmd="opkg install"
			;;
		*)
			echo "No supported OpenWrt package manager found. Expected apk or opkg." >&2
			return 1
			;;
	esac

	echo "Downloading ARK Router $PROFILE package from $pkg_url"
	if [ "$DRY_RUN" = 1 ]; then
		echo "DRY_RUN=1: would download $pkg_url to $pkg_file"
	else
		rm -f "$pkg_file"
		wget -O "$pkg_file" "$pkg_url" || return 1
	fi

	echo "Installing ARK Router $PROFILE package"
	if [ "$DRY_RUN" = 1 ]; then
		echo "DRY_RUN=1: would run: $install_cmd $pkg_file"
	else
		# shellcheck disable=SC2086
		$install_cmd "$pkg_file" || return 1
	fi
	restart_luci
}

backup_ark_configs() {
	stamp="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo unknown)"
	backup="$TMP_DIR/ark-router-install-backup-$stamp.tar.gz"
	work="$TMP_DIR/ark-router-install-backup-$stamp"
	if [ "$DRY_RUN" = 1 ]; then
		echo "DRY_RUN=1: would backup ARK Router configs to $backup"
		return 0
	fi
	mkdir -p "$work/etc/config"
	copied=0
	for cfg in equipe_dashboard equipe_devices qos_equipe; do
		if [ -f "/etc/config/$cfg" ]; then
			cp "/etc/config/$cfg" "$work/etc/config/$cfg"
			copied=1
		fi
	done
	if [ "$copied" = 1 ]; then
		tar -czf "$backup" -C "$work" . && echo "Backup: $backup"
	fi
	rm -rf "$work"
}

preserve_existing_configs() {
	source_root="$1"
	[ -d "$source_root/etc/config" ] || return 0
	for cfg in equipe_dashboard equipe_devices qos_equipe; do
		if [ -f "/etc/config/$cfg" ] && [ -f "$source_root/etc/config/$cfg" ]; then
			echo "Preserving existing /etc/config/$cfg"
			rm -f "$source_root/etc/config/$cfg"
		fi
	done
}
copy_tree() {
	src="$1"
	dst="$2"
	[ -d "$src" ] || return 0
	if [ "$DRY_RUN" = 1 ]; then
		echo "DRY_RUN=1: would copy $src/* to $dst/"
	else
		mkdir -p "$dst"
		cp -R "$src"/. "$dst"/
	fi
}

install_source() {
	command -v wget >/dev/null 2>&1 || { echo "wget is required for source install." >&2; return 1; }
	command -v tar >/dev/null 2>&1 || { echo "tar is required for source install." >&2; return 1; }
	[ -d /usr/share/luci ] || echo "Warning: LuCI files were not detected. Install LuCI before using the dashboard." >&2
	work="$TMP_DIR/ark-router-source-install"
	archive="$TMP_DIR/ark-router-source.tar.gz"
	rootdir=""
	echo "Installing ARK Router from source: $REPO branch $BRANCH"
	if [ "$DRY_RUN" = 1 ]; then
		echo "DRY_RUN=1: would download $SOURCE_URL"
		return 0
	fi
	rm -rf "$work" "$archive"
	mkdir -p "$work"
	wget -O "$archive" "$SOURCE_URL"
	tar -xzf "$archive" -C "$work"
	rootdir="$(find "$work" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
	[ -n "$rootdir" ] && [ -d "$rootdir/root" ] || { echo "Downloaded source does not contain root/" >&2; return 1; }
	backup_ark_configs
	preserve_existing_configs "$rootdir/root"

	copy_tree "$rootdir/root" /
	chmod +x /usr/sbin/equipe-dashboard-control 2>/dev/null || true
	chmod +x /usr/sbin/equipe-traffic-history 2>/dev/null || true
	chmod +x /etc/init.d/equipe-traffic-history 2>/dev/null || true
	chmod +x /etc/init.d/ark-speedify 2>/dev/null || true
	if [ -f "$rootdir/VERSION" ]; then
		mkdir -p /usr/share/ark-router
		cp "$rootdir/VERSION" /usr/share/ark-router/VERSION
	fi
	restart_luci
}

case "$MODE" in
	release)
		install_release
		;;
	source)
		install_source
		;;
	auto)
		install_release || {
			echo "Release package unavailable. Falling back to source install from $REPO/$BRANCH."
			install_source
		}
		;;
	*)
		echo "Invalid ARK_ROUTER_INSTALL_MODE: $MODE. Use release, source or auto." >&2
		exit 2
		;;
esac

if [ "$DRY_RUN" = 1 ]; then
	echo "Dry run complete. No changes were made."
else
	echo "ARK Router installed/updated. Open LuCI and look for ARK Router in the menu."
fi
