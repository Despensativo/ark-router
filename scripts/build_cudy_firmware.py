#!/usr/bin/env python3
"""
ARK Router - Cudy WR3000 v1 Native Firmware Compiler
Assembles a complete, production-grade OpenWrt sysupgrade image (.bin)
with the ARK Router v1.0.2 embedded directly into the SquashFS ROM partition (/rom).
Preserves the strict 16 MB SPI-NOR flash budget with safe headroom.
"""

import os
import sys
import subprocess
import shutil
import hashlib

def resolve_paths():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    repo_dir = os.path.abspath(os.path.join(script_dir, ".."))
    workspace_dir = os.path.abspath(os.path.join(repo_dir, "..", ".."))

    # When running on Windows, re-execute inside WSL
    if sys.platform == "win32":
        wsl_script = f"/mnt/{script_dir[0].lower()}{script_dir[2:].replace('\\', '/')}/build_cudy_firmware.py"
        print(f"[HOST] Delegating compilation to WSL Ubuntu: {wsl_script}")
        cmd = ["wsl.exe", "-d", "Ubuntu", "-u", "root", "--cd", "/root", "python3", wsl_script]
        res = subprocess.run(cmd)
        sys.exit(res.returncode)

    return repo_dir, workspace_dir

def audit_bootability_invariants(rootfs_dir):
    """
    Guarantees that all critical OpenWrt binaries retain execution permissions.
    Aborts the build immediately if any critical boot invariant is violated.
    """
    print("[AUDIT] Executando auditoria rigorosa de invariantes de boot...")
    critical_executables = [
        "bin/busybox",
        "bin/sh",
        "sbin/init",
        "sbin/procd",
        "sbin/netifd",
        "sbin/sysupgrade",
        "usr/sbin/ark-doctor",
        "usr/lib/ark/common.sh"
    ]
    for rel_path in critical_executables:
        full_path = os.path.join(rootfs_dir, rel_path)
        if not os.path.exists(full_path):
            raise RuntimeError(f"FALHA CRÍTICA DE BOOT: {rel_path} não existe no rootfs montado!")
        mode = os.stat(full_path).st_mode
        if not (mode & 0o111):
            raise RuntimeError(f"FALHA CRÍTICA DE BOOT: {rel_path} não possui permissão de execução (st_mode={oct(mode)})!")
        print(f"  [OK] {rel_path}: executável ({oct(mode)[-4:]})")

    # Verify no file in /bin or /sbin was stripped of execute permission
    for base_bin_dir in ["bin", "sbin"]:
        dir_path = os.path.join(rootfs_dir, base_bin_dir)
        if os.path.exists(dir_path):
            for entry in os.listdir(dir_path):
                ep = os.path.join(dir_path, entry)
                if os.path.isfile(ep) and not os.path.islink(ep):
                    st = os.stat(ep)
                    if not (st.st_mode & 0o111):
                        raise RuntimeError(f"FALHA CRÍTICA: Arquivo de sistema {base_bin_dir}/{entry} sem permissão de execução (modo={oct(st.st_mode)})!")
    print("[AUDIT] Todos os invariantes de boot foram aprovados com sucesso!")

def main():
    repo_dir, workspace_dir = resolve_paths()

    print("=" * 65)
    print("  ARK ROUTER: COMPILAÇÃO DE FIRMWARE NATIVO CUDY WR3000 v1  ")
    print("=" * 65)

    # 1. Verify host SDK tools
    sdk_host_bin = os.environ.get("OPENWRT_SDK_HOST_BIN", "/root/openwrt-sdk-filogic/staging_dir/host/bin")
    fwtool = os.path.join(sdk_host_bin, "fwtool")
    unsquashfs4 = os.path.join(sdk_host_bin, "unsquashfs4")
    mksquashfs4 = os.path.join(sdk_host_bin, "mksquashfs4")
    padjffs2 = os.path.join(sdk_host_bin, "padjffs2")

    for t in [fwtool, unsquashfs4, mksquashfs4, padjffs2]:
        if not os.path.exists(t):
            print(f"ERRO: Ferramenta do SDK não encontrada: {t}", file=sys.stderr)
            sys.exit(1)
    print(f"[OK] Ferramentas do OpenWrt SDK localizadas em: {sdk_host_bin}")

    # 2. Verify base firmware image
    firmware_dir = os.path.join(workspace_dir, "Firmware")
    base_fw = os.path.join(firmware_dir, "openwrt-25.12.5-cudy-wr3000-v1-ark-router-squashfs-sysupgrade.bin")
    if not os.path.exists(base_fw):
        fallback_fw = os.path.join(firmware_dir, "WR3000-v1-25.12.5", "openwrt-25.12.5-mediatek-filogic-cudy_wr3000-v1-squashfs-sysupgrade.bin")
        if os.path.exists(fallback_fw):
            base_fw = fallback_fw
        else:
            print(f"ERRO: Imagem base de firmware não encontrada em: {base_fw}", file=sys.stderr)
            sys.exit(1)
    print(f"[OK] Imagem base de firmware: {base_fw}")

    # 3. Setup work directory
    work_dir = "/tmp/cudy_firmware_workspace"
    shutil.rmtree(work_dir, ignore_errors=True)
    os.makedirs(work_dir, exist_ok=True)

    # 4. Extract metadata trailer
    meta_path = os.path.join(work_dir, "metadata.json")
    res = subprocess.run([fwtool, "-i", meta_path, base_fw], capture_output=True, text=True)
    if res.returncode != 0 or not os.path.exists(meta_path):
        print(f"ERRO ao extrair metadados:\n{res.stderr}", file=sys.stderr)
        sys.exit(1)
    with open(meta_path, "r") as f:
        meta_json = f.read().strip()
    print(f"[OK] Metadados OpenWrt extraídos: {meta_json}")

    # 5. Extract kernel FIT image and squashfs
    with open(base_fw, "rb") as f:
        fw_bytes = f.read()

    offset = fw_bytes.find(b"hsqs")
    if offset == -1:
        print("ERRO: Assinatura SquashFS (hsqs) não encontrada no binário base!", file=sys.stderr)
        sys.exit(1)
    print(f"[OK] Partição SquashFS detectada no offset: {offset} (hex: {hex(offset)})")

    kernel_bytes = fw_bytes[:offset]
    kernel_path = os.path.join(work_dir, "kernel.bin")
    with open(kernel_path, "wb") as f:
        f.write(kernel_bytes)
    print(f"[OK] Kernel FIT isolado ({len(kernel_bytes)/1024:.1f} KB)")

    rootfs_raw_path = os.path.join(work_dir, "rootfs_raw.bin")
    with open(rootfs_raw_path, "wb") as f:
        f.write(fw_bytes[offset:])

    # 6. Unsquash rootfs
    rootfs_dir = os.path.join(work_dir, "rootfs")
    res = subprocess.run([unsquashfs4, "-d", rootfs_dir, rootfs_raw_path], capture_output=True, text=True)
    if res.returncode != 0:
        print(f"ERRO ao descompactar SquashFS:\n{res.stderr}", file=sys.stderr)
        sys.exit(1)
    print("[OK] Raiz do sistema de arquivos (/rom) extraída com sucesso")

    # 7. Ensure frontend assets are minified
    minifier = os.path.join(repo_dir, "scripts", "build_minified_assets.py")
    if os.path.exists(minifier):
        print("[RUN] Minificando assets de frontend...")
        res = subprocess.run([sys.executable, minifier], capture_output=True, text=True, errors="replace")
        if res.returncode != 0:
            print(f"ERRO ao minificar assets:\n{res.stderr}", file=sys.stderr)
            sys.exit(res.returncode)

    # 8. Inject updated ARK Router v1.0.2 files
    print("[RUN] Injetando código-fonte e módulos do ARK Router v1.0.2 no rootfs...")
    root_src = os.path.join(repo_dir, "root")
    subprocess.run(f"cp -a '{root_src}/.' '{rootfs_dir}/'", shell=True, check=True)

    minified_src = os.path.join(repo_dir, "dist", "minified")
    if os.path.exists(minified_src):
        subprocess.run(f"cp -a '{minified_src}/.' '{rootfs_dir}/'", shell=True, check=True)

    # Write definitive VERSION
    version_file = os.path.join(repo_dir, "VERSION")
    with open(version_file, "r") as f:
        current_version = f.read().strip()

    target_ver = os.path.join(rootfs_dir, "usr", "share", "ark-router", "VERSION")
    os.makedirs(os.path.dirname(target_ver), exist_ok=True)
    with open(target_ver, "w") as f:
        f.write(f"{current_version}\n")

    # Sanitize debris
    for bad in ["etc/etc", "usr/usr", "www/www", "etc/mwan3.user"]:
        bad_path = os.path.join(rootfs_dir, bad)
        if os.path.isdir(bad_path):
            shutil.rmtree(bad_path)
        elif os.path.isfile(bad_path) or os.path.islink(bad_path):
            os.remove(bad_path)

    subprocess.run(f"find '{rootfs_dir}' -name '*~' -delete -o -name '*.bak' -delete 2>/dev/null || true", shell=True)

    # Apply strict POSIX permissions ONLY to executable paths and directories
    subprocess.run(f"find '{rootfs_dir}' -type d -exec chmod 0755 {{}} +", shell=True, check=True)
    subprocess.run(
        f"chmod 0755 "
        f"'{rootfs_dir}/bin/'* "
        f"'{rootfs_dir}/sbin/'* "
        f"'{rootfs_dir}/usr/sbin/'* "
        f"'{rootfs_dir}/usr/bin/'* "
        f"'{rootfs_dir}/usr/libexec/'* "
        f"'{rootfs_dir}/etc/init.d/'* "
        f"'{rootfs_dir}/etc/uci-defaults/'* "
        f"'{rootfs_dir}/www/cgi-bin/'* "
        f"'{rootfs_dir}/usr/lib/ark/'*.sh "
        f"'{rootfs_dir}/usr/lib/ark/modules/'*.sh "
        f"'{rootfs_dir}/lib/preinit/'* 2>/dev/null || true",
        shell=True
    )

    # Invariants Gate: Validate critical boot executables before packaging
    audit_bootability_invariants(rootfs_dir)

    # 9. Pack new SquashFS with OpenWrt standard parameters
    new_rootfs = os.path.join(work_dir, "new_rootfs.squashfs")
    mksquash_cmd = [
        mksquashfs4,
        rootfs_dir,
        new_rootfs,
        "-nopad",
        "-noappend",
        "-root-owned",
        "-comp", "xz",
        "-b", "262144",
        "-p", "/dev d 755 0 0",
        "-p", "/dev/console c 600 0 0 5 1",
        "-no-xattrs"
    ]
    print("[RUN] Compactando nova partição SquashFS (XZ, bloco 256k)...")
    res = subprocess.run(mksquash_cmd, capture_output=True, text=True)
    if res.returncode != 0:
        print(f"ERRO no mksquashfs4:\n{res.stderr}", file=sys.stderr)
        sys.exit(1)

    new_rootfs_size = os.path.getsize(new_rootfs)
    print(f"[OK] SquashFS gerado: {new_rootfs_size} bytes ({new_rootfs_size / (1024*1024):.2f} MB)")

    # 10. Combine kernel + new rootfs
    combined_bin = os.path.join(work_dir, "openwrt-25.12.5-cudy-wr3000-v1-ark-router-squashfs-sysupgrade.bin")
    with open(combined_bin, "wb") as out_f:
        with open(kernel_path, "rb") as k_f:
            out_f.write(k_f.read())
        with open(new_rootfs, "rb") as r_f:
            out_f.write(r_f.read())

    # 11. Pad to eraseblock (128k) using padjffs2
    subprocess.run([padjffs2, combined_bin, "128"], check=True)

    # 12. Append OpenWrt metadata trailer
    subprocess.run([fwtool, "-I", meta_path, combined_bin], check=True)
    final_size = os.path.getsize(combined_bin)

    # 13. Check flash budget limit (15.06 MB DTS partition limit)
    max_partition_size = 15424 * 1024  # 15424k = 15,794,176 bytes
    if final_size > max_partition_size:
        print(f"ERRO CRÍTICO: Imagem ({final_size} bytes) excede partição MTD ({max_partition_size} bytes)!", file=sys.stderr)
        sys.exit(1)

    free_headroom = (max_partition_size - final_size) / (1024 * 1024)
    print(f"[OK] Tamanho final do firmware: {final_size} bytes ({final_size / (1024*1024):.2f} MB)")
    print(f"[OK] Folga de segurança na partição Flash MTD: {free_headroom:.2f} MB livres")

    # 14. Verify integrity and metadata trailer with fwtool
    verify_res = subprocess.run([fwtool, "-i", "-", combined_bin], capture_output=True, text=True)
    if verify_res.returncode != 0:
        print(f"ERRO: Trailer de metadados corrompido no binário final:\n{verify_res.stderr}", file=sys.stderr)
        sys.exit(1)
    print(f"[OK] Validação fwtool aprovada com sucesso")

    # 15. Calculate SHA-256
    with open(combined_bin, "rb") as f:
        sha256_hash = hashlib.sha256(f.read()).hexdigest()
    print(f"[OK] SHA-256: {sha256_hash}")

    # 16. Copy compiled firmware to target locations
    target_firmware_path = os.path.join(firmware_dir, "openwrt-25.12.5-cudy-wr3000-v1-ark-router-squashfs-sysupgrade.bin")
    shutil.copy2(combined_bin, target_firmware_path)
    print(f"[OK] Firmware salvo com sucesso em: {target_firmware_path}")

    # Also save to root of workspace if it existed there
    root_fw_path = os.path.join(workspace_dir, "openwrt-25.12.5-cudy-wr3000-v1-ark-router-squashfs-sysupgrade.bin")
    try:
        shutil.copy2(combined_bin, root_fw_path)
        print(f"[OK] Cópia raiz atualizada em: {root_fw_path}")
    except Exception as e:
        pass

    # 17. Update sha256sums
    sha256sums_path = os.path.join(firmware_dir, "sha256sums")
    if os.path.exists(sha256sums_path):
        lines = []
        with open(sha256sums_path, "r") as f:
            for line in f:
                if "openwrt-25.12.5-cudy-wr3000-v1-ark-router-squashfs-sysupgrade.bin" in line:
                    lines.append(f"{sha256_hash} *openwrt-25.12.5-cudy-wr3000-v1-ark-router-squashfs-sysupgrade.bin\n")
                else:
                    lines.append(line)
        with open(sha256sums_path, "w") as f:
            f.writelines(lines)
        print(f"[OK] Arquivo sha256sums atualizado: {sha256sums_path}")

    print("=" * 65)
    print("  COMPILAÇÃO NATIVA v1.0.2 CONCLUÍDA COM 100% DE SUCESSO!     ")
    print("=" * 65)

    # Clean up temp
    shutil.rmtree(work_dir, ignore_errors=True)

if __name__ == "__main__":
    main()
