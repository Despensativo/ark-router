#!/usr/bin/env bash
set -euo pipefail

SDK_URL="${SDK_URL:-https://downloads.openwrt.org/snapshots/targets/mediatek/filogic/openwrt-sdk-mediatek-filogic_gcc-14.4.0_musl.Linux-x86_64.tar.zst}"
WORK_ROOT="${WORK_ROOT:-$HOME/openwrt-build}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="${SRC_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
SDK_LINK="${SDK_LINK:-$HOME/openwrt-sdk-filogic}"

mkdir -p "$WORK_ROOT" "$(dirname "$SRC_DIR")"

cd "$WORK_ROOT"
sdk_archive="$WORK_ROOT/sdk.tar.zst"
sdk_dir="openwrt-sdk-mediatek-filogic_gcc-14.4.0_musl.Linux-x86_64"

if [ ! -d "$WORK_ROOT/$sdk_dir" ]; then
	if [ ! -s "$sdk_archive" ]; then
		echo "Downloading OpenWrt SDK: $SDK_URL"
		wget -O "$sdk_archive" "$SDK_URL"
	else
		echo "Using existing SDK archive: $sdk_archive"
	fi
	echo "Extracting SDK..."
	tar --zstd -xf "$sdk_archive"
fi

rm -f "$SDK_LINK"
ln -s "$WORK_ROOT/$sdk_dir" "$SDK_LINK"

if [ ! -f "$SRC_DIR/scripts/build-apk-manual-wsl.sh" ]; then
	echo "Manual APK builder not found at $SRC_DIR/scripts/build-apk-manual-wsl.sh" >&2
	exit 2
fi

chmod +x "$SRC_DIR/scripts/build-apk-manual-wsl.sh"
exec "$SRC_DIR/scripts/build-apk-manual-wsl.sh"
