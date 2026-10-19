import os
import sys
import tarfile
import time
import shutil
import tempfile
import io

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
VERSION_FILE = os.path.join(REPO_DIR, "VERSION")

LITE_DEPENDS = "attendedsysupgrade-common irqbalance iwinfo kmod-ifb kmod-sched-act-police kmod-sched-cake kmod-tun luci-app-attendedsysupgrade luci-app-mwan3 luci-app-nlbwmon luci-app-package-manager luci-app-sqm luci-app-uhttpd luci-app-upnp luci-base luci-i18n-mwan3-pt-br luci-i18n-nlbwmon-pt-br luci-i18n-sqm-pt-br luci-i18n-uhttpd-pt-br luci-i18n-upnp-pt-br miniupnpd-nftables nlbwmon owut rpcd tc-full"
FULL_DEPENDS = "attendedsysupgrade-common irqbalance iwinfo kmod-ifb kmod-sched-act-police kmod-sched-cake kmod-tun luci-app-attendedsysupgrade luci-app-mwan3 luci-app-nlbwmon luci-app-package-manager luci-app-sqm luci-app-uhttpd luci-app-upnp luci-base luci-i18n-mwan3-pt-br luci-i18n-nlbwmon-pt-br luci-i18n-sqm-pt-br luci-i18n-uhttpd-pt-br luci-i18n-upnp-pt-br miniupnpd-nftables nlbwmon owut rpcd tc-full zerotier"

def build_apk_variant(pkg_name, pkg_version, depends, description, is_full=False):
    out_dir = os.path.join(REPO_DIR, "dist", "sdk")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"{pkg_name}-{pkg_version}.apk")

    # Create temporary packaging tree
    with tempfile.TemporaryDirectory() as temp_dir:
        payload_dir = os.path.join(temp_dir, "payload")
        os.makedirs(payload_dir, exist_ok=True)

        # 1. Copy root payload
        root_dir = os.path.join(REPO_DIR, "root")
        shutil.copytree(root_dir, payload_dir, dirs_exist_ok=True)

        # 2. Overlay minified assets if present
        minified_dir = os.path.join(REPO_DIR, "dist", "minified")
        if os.path.isdir(minified_dir):
            shutil.copytree(minified_dir, payload_dir, dirs_exist_ok=True)

        # 3. Set version file
        ver_dir = os.path.join(payload_dir, "usr", "share", "ark-router")
        os.makedirs(ver_dir, exist_ok=True)
        version_num = pkg_version.split("-")[0]
        with open(os.path.join(ver_dir, "VERSION"), "w", encoding="utf-8") as f:
            f.write(f"{version_num}\n")

        # 4. Filter out staging / v2 and unwanted files
        for dirpath, _, filenames in os.walk(payload_dir):
            for fname in filenames:
                if "_v2." in fname or fname.endswith("-v2.json") or fname.startswith("._") or fname == ".DS_Store":
                    try:
                        os.remove(os.path.join(dirpath, fname))
                    except OSError:
                        pass

        # 5. Handle starlink-dish binary for Lite vs Full
        starlink_bin = os.path.join(payload_dir, "usr", "bin", "starlink-dish")
        if not is_full and os.path.exists(starlink_bin):
            os.remove(starlink_bin)

        apk_bin = shutil.which("apk") or "/Users/user/.antigravity-tools-env/bin/apk"
        if not os.path.isfile(apk_bin):
            print(f"ERRO: Binário apk não encontrado em {apk_bin}", file=sys.stderr)
            sys.exit(2)

        # 5. Criar scripts de pre-install e post-install oficiais
        pre_install = os.path.join(temp_dir, "pre-install")
        with open(pre_install, "w", encoding="utf-8") as f:
            f.write("""#!/bin/sh
rm -f /etc/init.d/ark-*.apk-new /etc/init.d/equipe-*.apk-new /etc/hotplug.d/iface/*ark*.apk-new /etc/uci-defaults/*ark*.apk-new 2>/dev/null || true
exit 0
""")
        os.chmod(pre_install, 0o755)

        post_install = os.path.join(temp_dir, "post-install")
        with open(post_install, "w", encoding="utf-8") as f:
            f.write("""#!/bin/sh
for apknew in /etc/init.d/ark-*.apk-new /etc/init.d/equipe-*.apk-new /etc/hotplug.d/iface/*ark*.apk-new /etc/uci-defaults/*ark*.apk-new; do
	[ -f "$apknew" ] || continue
	target="${apknew%.apk-new}"
	mv -f "$apknew" "$target" 2>/dev/null || true
done
chmod 0755 /usr/share/ark-router/VERSION 2>/dev/null || true
chmod +x /usr/sbin/equipe-dashboard-control /usr/sbin/ark-doctor /usr/sbin/equipe-traffic-history 2>/dev/null || true
chmod +x /usr/lib/ark/ark-control /usr/lib/ark/*.sh /usr/lib/ark/modules/*.sh 2>/dev/null || true
chmod +x /usr/libexec/ark-starlink-telemetry 2>/dev/null || true
chmod +x /www/cgi-bin/ark-starlink-telemetry /www/cgi-bin/ark-mesh-export 2>/dev/null || true
chmod +x /etc/init.d/* 2>/dev/null || true
chmod +x /etc/hotplug.d/iface/* 2>/dev/null || true
chown -R root:root /www/luci-static/ark /www/luci-static/resources/view/equipe-dashboard /usr/lib/ark /usr/sbin/equipe-dashboard-control 2>/dev/null || true
chmod -R a+rX /www/luci-static/ark /www/luci-static/resources/view/equipe-dashboard /usr/share/luci/menu.d /usr/share/rpcd/acl.d 2>/dev/null || true
[ -x /etc/init.d/ark-safe-shutdown ] && /etc/init.d/ark-safe-shutdown enable >/dev/null 2>&1 || true
[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram enable >/dev/null 2>&1 || true
[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram start >/dev/null 2>&1 || true
[ -x /etc/init.d/ark-firewall-guard ] && /etc/init.d/ark-firewall-guard enable >/dev/null 2>&1 || true
[ -x /etc/init.d/ark-firewall-guard ] && /etc/init.d/ark-firewall-guard start >/dev/null 2>&1 || true
[ -x /etc/init.d/ark-hardware-tune ] && /etc/init.d/ark-hardware-tune enable >/dev/null 2>&1 || true
[ -x /etc/init.d/ark-hardware-tune ] && /etc/init.d/ark-hardware-tune start >/dev/null 2>&1 || true
[ -x /etc/init.d/ark-port-ledd ] && /etc/init.d/ark-port-ledd enable >/dev/null 2>&1 || true
[ -x /etc/init.d/ark-port-ledd ] && /etc/init.d/ark-port-ledd restart >/dev/null 2>&1 || true
if [ "$(uci -q get network.autowan.enabled || echo 0)" = "1" ]; then
	[ -x /etc/init.d/ark-autowan ] && /etc/init.d/ark-autowan enable >/dev/null 2>&1 || true
	[ -x /etc/init.d/ark-autowan ] && /etc/init.d/ark-autowan restart >/dev/null 2>&1 || true
fi
[ -f /etc/uci-defaults/99-ark-router-leds ] && /bin/sh /etc/uci-defaults/99-ark-router-leds >/dev/null 2>&1 || true
if [ -f /etc/config/attendedsysupgrade ]; then
	[ -z "$(uci -q get attendedsysupgrade.client.login_check_for_upgrades)" ] && uci -q set attendedsysupgrade.client.login_check_for_upgrades='0' && uci commit attendedsysupgrade 2>/dev/null || true
fi
rm -f /tmp/luci-indexcache 2>/dev/null || true
rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history enable >/dev/null 2>&1 || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history restart >/dev/null 2>&1 || true
[ -x /usr/sbin/equipe-dashboard-control ] && /usr/sbin/equipe-dashboard-control feature-enforce-policies >/dev/null 2>&1 || true
[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
exit 0
""")
        os.chmod(post_install, 0o755)

        # 6. Limpar arquivos temporários do macOS e definir permissões corretas
        for dirpath, dirnames, filenames in os.walk(payload_dir):
            for f in filenames:
                file_path = os.path.join(dirpath, f)
                if f.startswith("._") or f == ".DS_Store":
                    os.remove(file_path)
                    continue
                rel_path = os.path.relpath(file_path, payload_dir)
                is_exec = (
                    rel_path.startswith("usr/sbin/")
                    or rel_path.startswith("usr/bin/")
                    or rel_path.startswith("usr/libexec/")
                    or rel_path.startswith("www/cgi-bin/")
                    or rel_path.startswith("etc/init.d/")
                    or rel_path.startswith("etc/uci-defaults/")
                    or rel_path.startswith("etc/hotplug.d/")
                    or rel_path.endswith(".sh")
                )
                os.chmod(file_path, 0o755 if is_exec else 0o644)

        # 7. Executar apk mkpkg nativo gerando pacote oficial ADB (sem xattrs do macOS)
        import subprocess
        subprocess.run(["xattr", "-cr", payload_dir], capture_output=True)
        env = os.environ.copy()
        env["COPYFILE_DISABLE"] = "1"
        cmd = [
            apk_bin, "mkpkg",
            "-I", f"name:{pkg_name}",
            "-I", f"version:{pkg_version}",
            "-I", "arch:noarch",
            "-I", f"description:{description}",
            "-I", "url:https://github.com/Despensativo/ark-router",
            "-I", "license:GPL-2.0",
            "-I", f"depends:{depends}",
            "-I", "provides:luci-app-ark-router-any",
            "-I", "tags:openwrt:section=luci",
            "-s", f"pre-install:{pre_install}",
            "-s", f"pre-upgrade:{pre_install}",
            "-s", f"post-install:{post_install}",
            "-s", f"post-upgrade:{post_install}",
            "-F", payload_dir,
            "-o", out_file
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, env=env)
        if res.returncode != 0:
            print(f"ERRO ao gerar pacote {pkg_name}: {res.stderr}", file=sys.stderr)
            sys.exit(res.returncode)

    print(f"  [OK] Criado pacote oficial nativo (ADB): {out_file}")
    return out_file

def main():
    if not os.path.isfile(VERSION_FILE):
        print(f"ERRO: {VERSION_FILE} não encontrado.", file=sys.stderr)
        sys.exit(1)

    with open(VERSION_FILE, "r", encoding="utf-8") as f:
        version = f.read().strip()

    pkg_version = f"{version}-r1"
    out_dir = os.path.join(REPO_DIR, "dist", "sdk")
    os.makedirs(out_dir, exist_ok=True)

    print("=" * 60)
    print(f"ARK ROUTER: COMPILAÇÃO LOCAL DE PACOTES APK (MAC) v{pkg_version}")
    print("=" * 60)

    # 1. Build Lite APK
    lite_desc = "ARK Router Lite dashboard for OpenWrt (Mac Native Build)"
    lite_file = build_apk_variant("luci-app-ark-router", pkg_version, LITE_DEPENDS, lite_desc, is_full=False)

    # Create Lite aliases
    shutil.copyfile(lite_file, os.path.join(out_dir, f"luci-app-ark-router-lite-{pkg_version}.apk"))
    shutil.copyfile(lite_file, os.path.join(out_dir, f"luci-app-ark-router-{pkg_version}-mac.apk"))
    shutil.copyfile(lite_file, os.path.join(out_dir, "luci-app-ark-router-lite.apk"))
    shutil.copyfile(lite_file, os.path.join(out_dir, "luci-app-ark-router.apk"))

    # 2. Build Full APK
    full_desc = "ARK Router Full dashboard for OpenWrt (Mac Native Build)"
    full_file = build_apk_variant("luci-app-ark-router-full", pkg_version, FULL_DEPENDS, full_desc, is_full=True)

    # Create Full aliases
    shutil.copyfile(full_file, os.path.join(out_dir, "luci-app-ark-router-full.apk"))

    print("=" * 60)
    print("Todos os pacotes APK foram construídos com sucesso:")
    for f in sorted(os.listdir(out_dir)):
        if f.endswith(".apk") and not f.startswith("._") and version in f:
            p = os.path.join(out_dir, f)
            sz = os.path.getsize(p) / 1024
            print(f"  • {f:<42} ({sz:.1f} KB)")
    print("=" * 60)

if __name__ == "__main__":
    main()
