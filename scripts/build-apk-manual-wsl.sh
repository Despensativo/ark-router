#!/usr/bin/env bash
set -euo pipefail

SDK_LINK="${SDK_LINK:-$HOME/openwrt-sdk-filogic}"
SRC_DIR="${SRC_DIR:-$HOME/ark-router-work/luci-app-ark-router}"
PKG_NAME="luci-app-ark-router"
PKG_RELEASE="${PKG_RELEASE:-r1}"

if [ ! -x "$SDK_LINK/staging_dir/host/bin/apk" ]; then
	echo "OpenWrt SDK apk tool not found at $SDK_LINK/staging_dir/host/bin/apk" >&2
	exit 2
fi
if [ ! -f "$SRC_DIR/VERSION" ] || [ ! -d "$SRC_DIR/root" ]; then
	echo "Source not found at $SRC_DIR" >&2
	exit 2
fi

version="$(tr -d '[:space:]' < "$SRC_DIR/VERSION")"
pkg_version="${version}-${PKG_RELEASE}"
work_dir="$(mktemp -d)"
pkg_root="$work_dir/root"
post_install="$work_dir/post-install"
sign_key="${ARK_APK_SIGN_KEY:-$SDK_LINK/private-key.pem}"
out_dir="$SRC_DIR/dist/sdk"
out_file="$out_dir/${PKG_NAME}-${pkg_version}.apk"

cleanup() {
	rm -rf "$work_dir"
}
trap cleanup EXIT

mkdir -p "$pkg_root" "$out_dir"
cp -a "$SRC_DIR/root/." "$pkg_root/"

if [ ! -s "$sign_key" ]; then
	sign_key="$work_dir/ark-router-apk-private-key.pem"
	if [ ! -x "$SDK_LINK/staging_dir/host/bin/openssl" ]; then
		echo "OpenSSL tool not found in SDK; cannot create temporary APK signing key." >&2
		exit 2
	fi
	"$SDK_LINK/staging_dir/host/bin/openssl" genrsa -out "$sign_key" 2048 >/dev/null 2>&1
fi

find "$pkg_root" -type d -exec chmod 0755 {} +
find "$pkg_root" -type f -exec chmod 0644 {} +
chmod 0755 "$pkg_root/usr/sbin/equipe-dashboard-control" 2>/dev/null || true
chmod 0755 "$pkg_root/usr/sbin/equipe-traffic-history" 2>/dev/null || true
chmod 0755 "$pkg_root/etc/init.d/equipe-traffic-history" 2>/dev/null || true
chmod 0755 "$pkg_root/etc/init.d/ark-speedify" 2>/dev/null || true

mkdir -p "$pkg_root/lib/apk/packages"
cat > "$pkg_root/lib/apk/packages/${PKG_NAME}.conffiles" <<'EOF'
/etc/config/equipe_dashboard
/etc/config/equipe_devices
/etc/config/qos_equipe
EOF

( cd "$pkg_root" && find . -type f,l -printf "/%P\n" | sort ) > "$pkg_root/lib/apk/packages/${PKG_NAME}.list"

cat > "$post_install" <<'EOF'
#!/bin/sh
[ "${IPKG_NO_SCRIPT}" = "1" ] && exit 0
chmod +x /usr/sbin/equipe-dashboard-control 2>/dev/null || true
chmod +x /usr/sbin/equipe-traffic-history 2>/dev/null || true
chmod +x /etc/init.d/equipe-traffic-history 2>/dev/null || true
chmod +x /etc/init.d/ark-speedify 2>/dev/null || true
rm -f /tmp/luci-indexcache 2>/dev/null || true
rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history enable >/dev/null 2>&1 || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history restart >/dev/null 2>&1 || true
[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
exit 0
EOF

"$SDK_LINK/staging_dir/host/bin/apk" mkpkg \
	--info "name:${PKG_NAME}" \
	--info "version:${pkg_version}" \
	--info "arch:noarch" \
	--info "license:MIT" \
	--info "origin:/feed/${PKG_NAME}" \
	--info "url:https://github.com/Despensativo/ark-router" \
	--info "maintainer:ARK Router contributors" \
	--info "description:Responsive LuCI dashboard for OpenWrt with ARK setup, Wi-Fi, Multi-WAN, SQM, traffic, ZeroTier and optional Speedify integrations." \
	--info "depends:kmod-sched-act-police luci-base nlbwmon rpcd tc-full" \
	--info "provides:${PKG_NAME}-any" \
	--info "tags:openwrt:section=luci" \
	--script "post-install:${post_install}" \
	--script "post-upgrade:${post_install}" \
	--files "$pkg_root" \
	--sign-key "$sign_key" \
	--output "$out_file"

cp -f "$out_file" "$out_dir/${PKG_NAME}.apk"
echo "Built manual package:"
ls -lh "$out_file" "$out_dir/${PKG_NAME}.apk"
