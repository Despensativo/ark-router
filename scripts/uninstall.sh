#!/bin/sh
set -eu

PKG_NAME="${ARC_ROUTER_PACKAGE:-luci-app-ark-router}"
PURGE="${PURGE:-0}"
DRY_RUN="${DRY_RUN:-0}"

run() {
	if [ "$DRY_RUN" = 1 ]; then
		echo "DRY_RUN=1: $*"
	else
		"$@"
	fi
}

if command -v apk >/dev/null 2>&1; then
	if apk info -e "$PKG_NAME" >/dev/null 2>&1; then
		echo "Removing $PKG_NAME with apk"
		run apk del "$PKG_NAME"
	else
		echo "$PKG_NAME is not registered in apk. Removing ARC Router files directly."
	fi
elif command -v opkg >/dev/null 2>&1; then
	if opkg status "$PKG_NAME" 2>/dev/null | grep -q '^Status:.* installed$'; then
		echo "Removing $PKG_NAME with opkg"
		run opkg remove "$PKG_NAME"
	else
		echo "$PKG_NAME is not registered in opkg. Removing ARC Router files directly."
	fi
else
	echo "No supported OpenWrt package manager found. Removing ARC Router files directly."
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
	echo "Purging ARC Router saved preferences"
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

echo "ARC Router removal complete."
echo "Optional packages such as SQM, mwan3, nlbwmon, UPnP, Argon, uHTTPd and speedtest-go were not removed."
