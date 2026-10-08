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

        # 4. Handle starlink-dish binary for Lite vs Full
        starlink_bin = os.path.join(payload_dir, "usr", "bin", "starlink-dish")
        if not is_full and os.path.exists(starlink_bin):
            os.remove(starlink_bin)

        # 5. Create .PKGINFO
        pkginfo = f"""pkgname = {pkg_name}
pkgver = {pkg_version}
pkgdesc = {description}
url = https://github.com/Despensativo/ark-router
builddate = {int(time.time())}
packager = ARK Mac Native Builder
size = 2500000
arch = noarch
license = MIT
origin = /feed/{pkg_name}
maintainer = ARK Router contributors
provides = luci-app-ark-router-any
tags = openwrt:section=luci
"""
        for dep in depends.split():
            pkginfo += f"depend = {dep}\n"

        # 6. Build tar.gz container
        with tarfile.open(out_file, "w:gz") as tar:
            # Add .PKGINFO
            info = tarfile.TarInfo(name=".PKGINFO")
            info.size = len(pkginfo.encode("utf-8"))
            info.mode = 0o644
            info.mtime = int(time.time())
            info.uid = 0
            info.gid = 0
            info.uname = "root"
            info.gname = "root"
            tar.addfile(info, io.BytesIO(pkginfo.encode("utf-8")))

            # Add payload files recursively
            for dirpath, dirnames, filenames in os.walk(payload_dir):
                dirnames.sort()
                filenames.sort()
                rel_dir = os.path.relpath(dirpath, payload_dir)
                arc_dir = "" if rel_dir == "." else rel_dir

                if arc_dir:
                    d_info = tar.gettarinfo(dirpath, arcname=arc_dir)
                    d_info.uid = 0
                    d_info.gid = 0
                    d_info.uname = "root"
                    d_info.gname = "root"
                    d_info.mode = 0o755
                    tar.addfile(d_info)

                for f in filenames:
                    # Skip macOS AppleDouble or DS_Store files
                    if f.startswith("._") or f == ".DS_Store":
                        continue
                    file_path = os.path.join(dirpath, f)
                    arc_path = os.path.join(arc_dir, f) if arc_dir else f

                    f_info = tar.gettarinfo(file_path, arcname=arc_path)
                    f_info.uid = 0
                    f_info.gid = 0
                    f_info.uname = "root"
                    f_info.gname = "root"

                    # Execution permissions
                    is_exec = (
                        arc_path.startswith("usr/sbin/")
                        or arc_path.startswith("usr/bin/")
                        or arc_path.startswith("usr/libexec/")
                        or arc_path.startswith("www/cgi-bin/")
                        or arc_path.startswith("etc/init.d/")
                        or arc_path.startswith("etc/uci-defaults/")
                        or arc_path.startswith("etc/hotplug.d/")
                        or arc_path.endswith(".sh")
                    )
                    f_info.mode = 0o755 if is_exec else 0o644

                    with open(file_path, "rb") as fh:
                        tar.addfile(f_info, fh)

    print(f"  [OK] Criado: {out_file}")
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
