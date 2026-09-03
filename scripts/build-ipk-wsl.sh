#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SRC_DIR="${SRC_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
PKG_BASE_NAME="luci-app-ark-router"
PKG_RELEASE="${PKG_RELEASE:-r1}"

if [ ! -f "$SRC_DIR/VERSION" ] || [ ! -d "$SRC_DIR/root" ]; then
	echo "Source not found at $SRC_DIR" >&2
	exit 2
fi

version="$(tr -d '[:space:]' < "$SRC_DIR/VERSION")"
pkg_version="${version}-${PKG_RELEASE}"
out_dir="$SRC_DIR/dist/sdk"
mkdir -p "$out_dir"

build_ipk_variant() {
	pkg_name="$1"
	depends="$2"
	description="$3"
	out_file="$out_dir/${pkg_name}-${pkg_version}.ipk"

	work_dir="$(mktemp -d)"
	trap 'rm -rf "$work_dir"' EXIT

	data_dir="$work_dir/data"
	control_dir="$work_dir/control"
	mkdir -p "$data_dir" "$control_dir"

	# 1. Copy payload files
	cp -a "$SRC_DIR/root/." "$data_dir/"
	mkdir -p "$data_dir/usr/share/ark-router"
	printf '%s\n' "$version" > "$data_dir/usr/share/ark-router/VERSION"
	rm -rf "$data_dir/etc/etc" "$data_dir/usr/usr" "$data_dir/www/www"

	# Strip starlink binary if lite
	if [ "$pkg_name" = "$PKG_BASE_NAME" ]; then
		rm -f "$data_dir/usr/bin/starlink-dish"
	fi

	# Fix permissions
	find "$data_dir" -type d -exec chmod 0755 {} +
	find "$data_dir" -type f -exec chmod 0644 {} +
	chmod 0755 "$data_dir/usr/sbin/equipe-dashboard-control" 2>/dev/null || true
	chmod 0755 "$data_dir/usr/sbin/equipe-traffic-history" 2>/dev/null || true
	chmod 0755 "$data_dir/usr/libexec/ark-starlink-telemetry" 2>/dev/null || true
	chmod 0755 "$data_dir/www/cgi-bin/ark-starlink-telemetry" 2>/dev/null || true
	chmod 0755 "$data_dir/etc/init.d/equipe-traffic-history" 2>/dev/null || true
	chmod 0755 "$data_dir/etc/init.d/ark-speedify" 2>/dev/null || true
	chmod 0755 "$data_dir/etc/init.d/ark-zerotier-ram" 2>/dev/null || true
	chmod 0755 "$data_dir/etc/uci-defaults/"* 2>/dev/null || true

	# Pack data.tar.gz
	(cd "$data_dir" && tar -czf "$work_dir/data.tar.gz" .)

	# 2. Prepare control files
	cat > "$control_dir/control" <<EOF
Package: $pkg_name
Version: $pkg_version
Depends: $depends
Section: luci
Architecture: all
Maintainer: ARK Router contributors
License: MIT
Description: $description
EOF

	cat > "$control_dir/conffiles" <<'EOF'
/etc/config/equipe_dashboard
/etc/config/equipe_devices
/etc/config/qos_equipe
EOF

	cat > "$control_dir/postinst" <<'EOF'
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
[ -f /etc/uci-defaults/99-ark-router-uhttpd ] && /bin/sh /etc/uci-defaults/99-ark-router-uhttpd >/dev/null 2>&1 || true
[ -f /etc/uci-defaults/99-ark-router-dhcp-sanitize ] && /bin/sh /etc/uci-defaults/99-ark-router-dhcp-sanitize >/dev/null 2>&1 || true
rm -f /tmp/luci-indexcache 2>/dev/null || true
rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history enable >/dev/null 2>&1 || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history restart >/dev/null 2>&1 || true
[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
exit 0
EOF
	chmod 0755 "$control_dir/postinst"

	cat > "$control_dir/postrm" <<'EOF'
#!/bin/sh
rm -f /tmp/luci-indexcache 2>/dev/null || true
rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
exit 0
EOF
	chmod 0755 "$control_dir/postrm"

	# Pack control.tar.gz
	(cd "$control_dir" && tar -czf "$work_dir/control.tar.gz" .)

	# 3. Create debian-binary
	printf '2.0\n' > "$work_dir/debian-binary"

	# 4. Pack final .ipk (OpenWrt opkg expects tar.gz container)
	(cd "$work_dir" && tar -czf "$out_file" ./debian-binary ./data.tar.gz ./control.tar.gz)
	echo "Created: $out_file"
}

echo "Building IPK packages for version $pkg_version..."

# Build Lite IPK
build_ipk_variant "$PKG_BASE_NAME" \
	"luci-base, rpcd, rpcd-mod-file, rpcd-mod-luci" \
	"Executive Control & Operational Dashboard for OpenWrt / LuCI (Lite)"

cp -f "$out_dir/${PKG_BASE_NAME}-${pkg_version}.ipk" "$out_dir/${PKG_BASE_NAME}-lite-${pkg_version}.ipk"
cp -f "$out_dir/${PKG_BASE_NAME}-${pkg_version}.ipk" "$out_dir/${PKG_BASE_NAME}-lite.ipk"
cp -f "$out_dir/${PKG_BASE_NAME}-${pkg_version}.ipk" "$out_dir/${PKG_BASE_NAME}.ipk"

# Build Full IPK
build_ipk_variant "${PKG_BASE_NAME}-full" \
	"luci-base, rpcd, rpcd-mod-file, rpcd-mod-luci" \
	"Executive Control & Operational Dashboard for OpenWrt / LuCI (Full)"

cp -f "$out_dir/${PKG_BASE_NAME}-full-${pkg_version}.ipk" "$out_dir/${PKG_BASE_NAME}-full.ipk"

echo "All IPK packages built successfully!"
ls -lh "$out_dir"/*.ipk
