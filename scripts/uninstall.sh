#!/bin/sh
set -eu

PKG_NAME="${ARK_ROUTER_PACKAGE:-${ARC_ROUTER_PACKAGE:-luci-app-ark-router}}"
PURGE="${PURGE:-0}"
DRY_RUN="${DRY_RUN:-0}"
BACKUP_DIR="${BACKUP_DIR:-/tmp}"
BACKUP_FILE=""

run() {
	if [ "$DRY_RUN" = 1 ]; then
		echo "DRY_RUN=1: $*"
	else
		"$@"
	fi
}

create_backup() {
	stamp="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo unknown)"
	workdir="/tmp/ark-router-uninstall-backup-$stamp"
	BACKUP_FILE="$BACKUP_DIR/ark-router-config-backup-$stamp.tar.gz"
	if [ "$DRY_RUN" = 1 ]; then
		echo "DRY_RUN=1: would create $BACKUP_FILE with ARK Router preferences and metadata"
		return 0
	fi
	rm -rf "$workdir"
	mkdir -p "$workdir/etc/config" "$workdir/metadata"
	[ -f /etc/config/equipe_dashboard ] && cp /etc/config/equipe_dashboard "$workdir/etc/config/equipe_dashboard"
	[ -f /etc/config/equipe_devices ] && cp /etc/config/equipe_devices "$workdir/etc/config/equipe_devices"
	{
		echo "ARK Router uninstall backup"
		echo "Created: $(date 2>/dev/null || true)"
		echo "Package: $PKG_NAME"
		echo "Purge requested: $PURGE"
		echo "Restore command:"
		echo "  tar -xzf $BACKUP_FILE -C /"
		echo "  /etc/init.d/rpcd restart"
	} > "$workdir/metadata/README.txt"
	tar -czf "$BACKUP_FILE" -C "$workdir" .
	rm -rf "$workdir"
	echo "Backup created: $BACKUP_FILE"
}

create_backup

if command -v apk >/dev/null 2>&1; then
	if apk info -e "$PKG_NAME" >/dev/null 2>&1; then
		echo "Removing $PKG_NAME with apk"
		run apk del "$PKG_NAME"
	else
		echo "$PKG_NAME is not registered in apk. Removing ARK Router files directly."
	fi
elif command -v opkg >/dev/null 2>&1; then
	if opkg status "$PKG_NAME" 2>/dev/null | grep -q '^Status:.* installed$'; then
		echo "Removing $PKG_NAME with opkg"
		run opkg remove "$PKG_NAME"
	else
		echo "$PKG_NAME is not registered in opkg. Removing ARK Router files directly."
	fi
else
	echo "No supported OpenWrt package manager found. Removing ARK Router files directly."
fi

run rm -f /usr/sbin/equipe-dashboard-control
run rm -f /usr/sbin/equipe-traffic-history
run rm -f /etc/init.d/equipe-traffic-history
run rm -f /usr/share/luci/menu.d/luci-app-equipe-dashboard.json
run rm -f /usr/share/rpcd/acl.d/luci-app-equipe-dashboard.json
run rm -f /www/luci-static/resources/view/equipe-dashboard/overview.js
run rm -f /www/luci-static/resources/view/equipe-dashboard/overview.css
run rmdir /www/luci-static/resources/view/equipe-dashboard 2>/dev/null || true
run rm -rf /tmp/ark-speedtest /tmp/ark-speedtest-download /tmp/ark-speedtest-*.json /tmp/ark-speedtest-*.log /tmp/ark-speedtest-*.status
run rm -f /tmp/equipe-dashboard-install-*.log /tmp/equipe-dashboard-install-*.status
run rm -f /tmp/luci-indexcache
run rm -rf /tmp/luci-modulecache 2>/dev/null || true

if [ "$PURGE" = 1 ]; then
	echo "Purging ARK Router saved preferences"
	[ -n "$BACKUP_FILE" ] && echo "Saved preferences were backed up before purge: $BACKUP_FILE"
	run rm -f /etc/config/equipe_dashboard
	run rm -f /etc/config/equipe_devices
else
	echo "Keeping /etc/config/equipe_dashboard and /etc/config/equipe_devices"
	echo "Run with PURGE=1 to remove saved dashboard preferences and device names."
fi

if [ "$DRY_RUN" != 1 ] && [ -x /etc/init.d/rpcd ]; then
	echo "Restarting rpcd"
	/etc/init.d/rpcd restart
fi

echo "ARK Router removal complete."
if [ -n "$BACKUP_FILE" ]; then
	echo "Backup available until the next reboot: $BACKUP_FILE"
	echo "Download it with: scp root@ROUTER_IP:$BACKUP_FILE ."
fi
echo "Optional packages such as SQM, mwan3, nlbwmon, UPnP, Argon, uHTTPd and speedtest-go were not removed."
