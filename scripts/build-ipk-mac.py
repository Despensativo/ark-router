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

POSTINST_SCRIPT = """#!/bin/sh
[ "${IPKG_NO_SCRIPT}" = "1" ] && exit 0
chmod +x /usr/sbin/equipe-dashboard-control 2>/dev/null || true
chmod +x /usr/sbin/ark-doctor 2>/dev/null || true
chmod +x /usr/sbin/equipe-traffic-history 2>/dev/null || true
chmod +x /usr/sbin/ark-autowan-daemon 2>/dev/null || true
chmod +x /usr/sbin/ark-port-ledd 2>/dev/null || true
chmod +x /usr/sbin/ark-rainbowd 2>/dev/null || true
chmod +x /usr/lib/ark/*.sh 2>/dev/null || true
chmod +x /usr/lib/ark/modules/*.sh 2>/dev/null || true
chmod +x /usr/libexec/ark-starlink-telemetry 2>/dev/null || true
chmod +x /www/cgi-bin/ark-starlink-telemetry 2>/dev/null || true
chmod +x /etc/init.d/* 2>/dev/null || true
chmod +x /etc/hotplug.d/iface/* 2>/dev/null || true
[ -x /etc/init.d/ark-safe-shutdown ] && /etc/init.d/ark-safe-shutdown enable >/dev/null 2>&1 || true
chmod +x /etc/init.d/equipe-traffic-history 2>/dev/null || true
chmod +x /etc/init.d/ark-speedify 2>/dev/null || true
chmod +x /etc/init.d/ark-zerotier-ram 2>/dev/null || true
chmod +x /etc/init.d/ark-firewall-guard 2>/dev/null || true
chmod +x /etc/init.d/ark-autowan 2>/dev/null || true
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
[ -f /etc/uci-defaults/99-ark-router-uhttpd ] && /bin/sh /etc/uci-defaults/99-ark-router-uhttpd >/dev/null 2>&1 || true
[ -f /etc/uci-defaults/99-ark-router-dhcp-sanitize ] && /bin/sh /etc/uci-defaults/99-ark-router-dhcp-sanitize >/dev/null 2>&1 || true
rm -f /tmp/luci-indexcache 2>/dev/null || true
rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history enable >/dev/null 2>&1 || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history restart >/dev/null 2>&1 || true
[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
exit 0
"""

POSTRM_SCRIPT = """#!/bin/sh
rm -f /tmp/luci-indexcache 2>/dev/null || true
rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
exit 0
"""

CONFFILES_CONTENT = """/etc/config/equipe_dashboard
/etc/config/equipe_devices
/etc/config/qos_equipe
/etc/config/equipe_perf
/etc/config/starlink_telemetry
"""

def build_ipk_variant(pkg_name, pkg_version, depends, description, is_full=False):
    out_dir = os.path.join(REPO_DIR, "dist", "sdk")
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, f"{pkg_name}-{pkg_version}.ipk")

    now = int(time.time())

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

        # 3. Clean up non-package artifacts
        for dead_path in [
            os.path.join(payload_dir, "etc", "etc"),
            os.path.join(payload_dir, "usr", "usr"),
            os.path.join(payload_dir, "www", "www"),
            os.path.join(payload_dir, "etc", "mwan3.user"),
        ]:
            if os.path.exists(dead_path):
                if os.path.isdir(dead_path):
                    shutil.rmtree(dead_path)
                else:
                    os.remove(dead_path)

        # 4. Set version file
        ver_dir = os.path.join(payload_dir, "usr", "share", "ark-router")
        os.makedirs(ver_dir, exist_ok=True)
        version_num = pkg_version.split("-")[0]
        with open(os.path.join(ver_dir, "VERSION"), "w", encoding="utf-8") as f:
            f.write(f"{version_num}\n")

        # 5. Handle starlink-dish binary for Lite vs Full
        starlink_bin = os.path.join(payload_dir, "usr", "bin", "starlink-dish")
        if not is_full and os.path.exists(starlink_bin):
            os.remove(starlink_bin)

        # 6. Build data.tar.gz in memory
        data_buf = io.BytesIO()
        with tarfile.open(fileobj=data_buf, mode="w:gz") as tar:
            # Add root dir entry "."
            root_info = tarfile.TarInfo(name=".")
            root_info.type = tarfile.DIRTYPE
            root_info.mode = 0o755
            root_info.mtime = now
            root_info.uid = 0
            root_info.gid = 0
            root_info.uname = "root"
            root_info.gname = "root"
            tar.addfile(root_info)

            for dirpath, dirnames, filenames in os.walk(payload_dir):
                dirnames.sort()
                filenames.sort()
                rel_dir = os.path.relpath(dirpath, payload_dir)
                arc_dir = "." if rel_dir == "." else f"./{rel_dir}"

                if rel_dir != ".":
                    d_info = tar.gettarinfo(dirpath, arcname=arc_dir)
                    d_info.uid = 0
                    d_info.gid = 0
                    d_info.uname = "root"
                    d_info.gname = "root"
                    d_info.mode = 0o755
                    tar.addfile(d_info)

                for f in filenames:
                    if f.startswith("._") or f == ".DS_Store":
                        continue
                    file_path = os.path.join(dirpath, f)
                    arc_path = f"{arc_dir}/{f}"

                    f_info = tar.gettarinfo(file_path, arcname=arc_path)
                    f_info.uid = 0
                    f_info.gid = 0
                    f_info.uname = "root"
                    f_info.gname = "root"

                    is_exec = (
                        arc_path.startswith("./usr/sbin/")
                        or arc_path.startswith("./usr/bin/")
                        or arc_path.startswith("./usr/libexec/")
                        or arc_path.startswith("./www/cgi-bin/")
                        or arc_path.startswith("./etc/init.d/")
                        or arc_path.startswith("./etc/uci-defaults/")
                        or arc_path.startswith("./etc/hotplug.d/")
                        or arc_path.endswith(".sh")
                    )
                    f_info.mode = 0o755 if is_exec else 0o644

                    with open(file_path, "rb") as fh:
                        tar.addfile(f_info, fh)

        data_bytes = data_buf.getvalue()

        # 7. Build control.tar.gz in memory
        control_content = f"""Package: {pkg_name}
Version: {pkg_version}
Depends: {depends}
Section: luci
Architecture: all
Maintainer: ARK Router contributors
License: MIT
Description: {description}
"""

        control_buf = io.BytesIO()
        with tarfile.open(fileobj=control_buf, mode="w:gz") as tar:
            # Entry: .
            root_info = tarfile.TarInfo(name=".")
            root_info.type = tarfile.DIRTYPE
            root_info.mode = 0o755
            root_info.mtime = now
            root_info.uid = 0
            root_info.gid = 0
            root_info.uname = "root"
            root_info.gname = "root"
            tar.addfile(root_info)

            # File: ./control
            c_info = tarfile.TarInfo(name="./control")
            c_data = control_content.encode("utf-8")
            c_info.size = len(c_data)
            c_info.mode = 0o644
            c_info.mtime = now
            c_info.uid = 0
            c_info.gid = 0
            c_info.uname = "root"
            c_info.gname = "root"
            tar.addfile(c_info, io.BytesIO(c_data))

            # File: ./conffiles
            cf_info = tarfile.TarInfo(name="./conffiles")
            cf_data = CONFFILES_CONTENT.encode("utf-8")
            cf_info.size = len(cf_data)
            cf_info.mode = 0o644
            cf_info.mtime = now
            cf_info.uid = 0
            cf_info.gid = 0
            cf_info.uname = "root"
            cf_info.gname = "root"
            tar.addfile(cf_info, io.BytesIO(cf_data))

            # File: ./postinst
            p_info = tarfile.TarInfo(name="./postinst")
            p_data = POSTINST_SCRIPT.encode("utf-8")
            p_info.size = len(p_data)
            p_info.mode = 0o755
            p_info.mtime = now
            p_info.uid = 0
            p_info.gid = 0
            p_info.uname = "root"
            p_info.gname = "root"
            tar.addfile(p_info, io.BytesIO(p_data))

            # File: ./postrm
            pr_info = tarfile.TarInfo(name="./postrm")
            pr_data = POSTRM_SCRIPT.encode("utf-8")
            pr_info.size = len(pr_data)
            pr_info.mode = 0o755
            pr_info.mtime = now
            pr_info.uid = 0
            pr_info.gid = 0
            pr_info.uname = "root"
            pr_info.gname = "root"
            tar.addfile(pr_info, io.BytesIO(pr_data))

        control_bytes = control_buf.getvalue()

        # 8. Create debian-binary content
        debian_binary = b"2.0\n"

        # 9. Pack final .ipk archive (tar.gz container)
        with tarfile.open(out_file, mode="w:gz") as tar:
            # ./debian-binary
            db_info = tarfile.TarInfo(name="./debian-binary")
            db_info.size = len(debian_binary)
            db_info.mode = 0o644
            db_info.mtime = now
            db_info.uid = 0
            db_info.gid = 0
            db_info.uname = "root"
            db_info.gname = "root"
            tar.addfile(db_info, io.BytesIO(debian_binary))

            # ./data.tar.gz
            dt_info = tarfile.TarInfo(name="./data.tar.gz")
            dt_info.size = len(data_bytes)
            dt_info.mode = 0o644
            dt_info.mtime = now
            dt_info.uid = 0
            dt_info.gid = 0
            dt_info.uname = "root"
            dt_info.gname = "root"
            tar.addfile(dt_info, io.BytesIO(data_bytes))

            # ./control.tar.gz
            ct_info = tarfile.TarInfo(name="./control.tar.gz")
            ct_info.size = len(control_bytes)
            ct_info.mode = 0o644
            ct_info.mtime = now
            ct_info.uid = 0
            ct_info.gid = 0
            ct_info.uname = "root"
            ct_info.gname = "root"
            tar.addfile(ct_info, io.BytesIO(control_bytes))

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
    print(f"ARK ROUTER: COMPILAÇÃO LOCAL DE PACOTES IPK (MAC) v{pkg_version}")
    print("=" * 60)

    lite_depends = "luci-base, rpcd, rpcd-mod-file, rpcd-mod-luci"
    full_depends = "luci-base, rpcd, rpcd-mod-file, rpcd-mod-luci"

    # 1. Build Lite IPK
    lite_desc = "Executive Control & Operational Dashboard for OpenWrt / LuCI (Lite)"
    lite_file = build_ipk_variant("luci-app-ark-router", pkg_version, lite_depends, lite_desc, is_full=False)

    # Aliases
    shutil.copyfile(lite_file, os.path.join(out_dir, f"luci-app-ark-router-lite-{pkg_version}.ipk"))
    shutil.copyfile(lite_file, os.path.join(out_dir, "luci-app-ark-router-lite.ipk"))
    shutil.copyfile(lite_file, os.path.join(out_dir, "luci-app-ark-router.ipk"))

    # 2. Build Full IPK
    full_desc = "Executive Control & Operational Dashboard for OpenWrt / LuCI (Full)"
    full_file = build_ipk_variant("luci-app-ark-router-full", pkg_version, full_depends, full_desc, is_full=True)

    # Aliases
    shutil.copyfile(full_file, os.path.join(out_dir, "luci-app-ark-router-full.ipk"))

    print("=" * 60)
    print("Todos os pacotes IPK foram construídos com sucesso:")
    for f in sorted(os.listdir(out_dir)):
        if f.endswith(".ipk") and not f.startswith("._") and version in f:
            p = os.path.join(out_dir, f)
            sz = os.path.getsize(p) / 1024
            print(f"  • {f:<42} ({sz:.1f} KB)")
    print("=" * 60)

if __name__ == "__main__":
    main()
