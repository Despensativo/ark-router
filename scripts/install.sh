#!/bin/sh
set -eu

REPO="${ARC_ROUTER_REPO:-Despensativo/ark-router}"
BASE_URL="https://github.com/$REPO/releases/latest/download"
TMP_DIR="${TMPDIR:-/tmp}"
DRY_RUN="${DRY_RUN:-0}"

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
if [ "$DRY_RUN" = 1 ]; then
	echo "DRY_RUN=1: would download $PKG_URL to $PKG_FILE"
else
	rm -f "$PKG_FILE"
	wget -O "$PKG_FILE" "$PKG_URL"
fi

echo "Installing ARC Router"
if [ "$DRY_RUN" = 1 ]; then
	echo "DRY_RUN=1: would run: $INSTALL_CMD $PKG_FILE"
else
	$INSTALL_CMD "$PKG_FILE"
fi

if [ "$DRY_RUN" != 1 ] && [ -x /etc/init.d/rpcd ]; then
	echo "Restarting rpcd"
	/etc/init.d/rpcd restart
fi

if [ "$DRY_RUN" = 1 ]; then
	echo "Dry run complete. No changes were made."
else
	echo "ARC Router installed. Open LuCI and look for ARC Router in the menu."
fi
