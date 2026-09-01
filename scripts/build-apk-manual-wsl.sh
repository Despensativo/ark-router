#!/usr/bin/env bash
set -euo pipefail

SDK_LINK="${SDK_LINK:-$HOME/openwrt-sdk-filogic}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="${SRC_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PKG_BASE_NAME="luci-app-ark-router"
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

cleanup() {
	rm -rf "$work_dir"
}
trap cleanup EXIT

mkdir -p "$pkg_root" "$out_dir"
cp -a "$SRC_DIR/root/." "$pkg_root/"
rm -rf "$pkg_root/etc/etc" "$pkg_root/usr/usr" "$pkg_root/www/www"

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
chmod 0755 "$pkg_root/usr/libexec/ark-starlink-telemetry" 2>/dev/null || true
chmod 0755 "$pkg_root/www/cgi-bin/ark-starlink-telemetry" 2>/dev/null || true
chmod 0755 "$pkg_root/etc/init.d/equipe-traffic-history" 2>/dev/null || true
chmod 0755 "$pkg_root/etc/init.d/ark-speedify" 2>/dev/null || true
chmod 0755 "$pkg_root/etc/init.d/ark-zerotier-ram" 2>/dev/null || true

mkdir -p "$pkg_root/lib/apk/packages"

cat > "$post_install" <<'EOF'
#!/bin/sh
[ "${IPKG_NO_SCRIPT}" = "1" ] && exit 0
chmod +x /usr/sbin/equipe-dashboard-control 2>/dev/null || true
chmod +x /usr/sbin/equipe-traffic-history 2>/dev/null || true
chmod +x /usr/libexec/ark-starlink-telemetry 2>/dev/null || true
chmod +x /www/cgi-bin/ark-starlink-telemetry 2>/dev/null || true
chmod +x /etc/init.d/equipe-traffic-history 2>/dev/null || true
chmod +x /etc/init.d/ark-speedify 2>/dev/null || true
chmod +x /etc/init.d/ark-zerotier-ram 2>/dev/null || true
[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram enable >/dev/null 2>&1 || true
[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram start >/dev/null 2>&1 || true
rm -f /tmp/luci-indexcache 2>/dev/null || true
rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history enable >/dev/null 2>&1 || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history restart >/dev/null 2>&1 || true
[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
exit 0
EOF

build_variant() {
	pkg_name="$1"
	depends="$2"
	description="$3"
	out_file="$out_dir/${pkg_name}-${pkg_version}.apk"
	# The persistent Starlink client is a Full-only payload. Lite keeps the
	# helper and downloads the ~1.4 MiB client to /tmp on first use.
	if [ "$pkg_name" = "$PKG_BASE_NAME" ]; then
		rm -f "$pkg_root/usr/bin/starlink-dish"
	else
		if [ -f "$SRC_DIR/root/usr/bin/starlink-dish" ]; then
			mkdir -p "$pkg_root/usr/bin"
			cp -f "$SRC_DIR/root/usr/bin/starlink-dish" "$pkg_root/usr/bin/starlink-dish"
			chmod 0755 "$pkg_root/usr/bin/starlink-dish"
		fi
	fi

	rm -f "$pkg_root/lib/apk/packages"/luci-app-ark-router*.conffiles
	rm -f "$pkg_root/lib/apk/packages"/luci-app-ark-router*.list
	cat > "$pkg_root/lib/apk/packages/${pkg_name}.conffiles" <<'EOF'
/etc/config/equipe_dashboard
/etc/config/equipe_devices
/etc/config/qos_equipe
EOF
	( cd "$pkg_root" && find . -type f,l -printf "/%P\n" | sort ) > "$pkg_root/lib/apk/packages/${pkg_name}.list"

	"$SDK_LINK/staging_dir/host/bin/apk" mkpkg \
		--info "name:${pkg_name}" \
		--info "version:${pkg_version}" \
		--info "arch:noarch" \
		--info "license:MIT" \
		--info "origin:/feed/${pkg_name}" \
		--info "url:https://github.com/Despensativo/ark-router" \
		--info "maintainer:ARK Router contributors" \
		--info "description:${description}" \
		--info "depends:${depends}" \
		--info "provides:${PKG_BASE_NAME}-any" \
		--info "tags:openwrt:section=luci" \
		--script "post-install:${post_install}" \
		--script "post-upgrade:${post_install}" \
		--files "$pkg_root" \
		--sign-key "$sign_key" \
		--output "$out_file"
	cp -f "$out_file" "$out_dir/${pkg_name}.apk"
}

lite_depends="attendedsysupgrade-common irqbalance iwinfo kmod-ifb kmod-sched-act-police kmod-sched-cake kmod-tun luci-app-attendedsysupgrade luci-app-mwan3 luci-app-nlbwmon luci-app-package-manager luci-app-sqm luci-app-uhttpd luci-app-upnp luci-base luci-i18n-mwan3-pt-br luci-i18n-nlbwmon-pt-br luci-i18n-sqm-pt-br luci-i18n-uhttpd-pt-br luci-i18n-upnp-pt-br miniupnpd-nftables nlbwmon owut rpcd tc-full"
full_depends="attendedsysupgrade-common irqbalance iwinfo kmod-ifb kmod-sched-act-police kmod-sched-cake kmod-tun luci-app-attendedsysupgrade luci-app-mwan3 luci-app-nlbwmon luci-app-package-manager luci-app-sqm luci-app-uhttpd luci-app-upnp luci-base luci-i18n-mwan3-pt-br luci-i18n-nlbwmon-pt-br luci-i18n-sqm-pt-br luci-i18n-uhttpd-pt-br luci-i18n-upnp-pt-br miniupnpd-nftables nlbwmon owut rpcd speedtest-go tc-full zerotier"

build_variant "${PKG_BASE_NAME}" "$lite_depends" "ARK Router Lite dashboard for OpenWrt with per-device traffic and complete guest upload/download limiting. Heavy modules remain optional from the panel."
build_variant "${PKG_BASE_NAME}-full" "$full_depends" "ARK Router Full dashboard for OpenWrt with traffic, guest limiting, SQM/CAKE, Multi-WAN, UPnP, uHTTPd, ZeroTier, speed testing and VPN tunnel support."

cp -f "$out_dir/${PKG_BASE_NAME}-${pkg_version}.apk" "$out_dir/${PKG_BASE_NAME}-lite-${pkg_version}.apk"
cp -f "$out_dir/${PKG_BASE_NAME}.apk" "$out_dir/${PKG_BASE_NAME}-lite.apk"
echo "Built manual packages:"
ls -lh "$out_dir"/*.apk
