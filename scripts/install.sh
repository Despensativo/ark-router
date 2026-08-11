#!/bin/sh
set -eu

REPO="${ARC_ROUTER_REPO:-Despensativo/ark-router}"
BASE_URL="https://github.com/$REPO/releases/latest/download"
TMP_DIR="${TMPDIR:-/tmp}"

if command -v apk >/dev/null 2>&1; then
	PKG_URL="$BASE_URL/luci-app-ark-router.apk"
	PKG_FILE="$TMP_DIR/luci-app-ark-router.apk"
	INSTALL_CMD="apk add --allow-untrusted"
elif command -v opkg >/dev/null 2>&1; then
	PKG_URL="$BASE_URL/luci-app-ark-router.ipk"
	PKG_FILE="$TMP_DIR/luci-app-ark-router.ipk"
	INSTALL_CMD="opkg install"
else
	echo "No supported OpenWrt package manager found. Expected apk or opkg." >&2
	exit 1
fi

echo "Downloading ARC Router package from $PKG_URL"
rm -f "$PKG_FILE"
wget -O "$PKG_FILE" "$PKG_URL"

echo "Installing ARC Router"
$INSTALL_CMD "$PKG_FILE"

if [ -x /etc/init.d/rpcd ]; then
	echo "Restarting rpcd"
	/etc/init.d/rpcd restart
fi

echo "ARC Router installed. Open LuCI and look for ARC Router in the menu."
