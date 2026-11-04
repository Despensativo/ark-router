#!/usr/bin/env python3
"""
Test Sandbox Harness for ARK Router.
Provides an isolated virtual OpenWrt environment to run and test equipe-dashboard-control locally without a router.
"""
import os
import sys
import io
import shutil
import socket
import struct
import atexit
import tempfile
import threading
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

import mock_uci
import mock_jsonfilter

_RUNTIME_LOCK = threading.Lock()
_RUNTIME_CACHE_DIR = None
_UCI_SOCK_PATH = None
_FAST_CLIENT_BIN = None
_CACHED_CONTROL_SCRIPT = os.path.join(REPO_DIR, "root", "usr", "sbin", "equipe-dashboard-control").replace("\\", "/")
_CACHED_ARK_LIB_DIR = os.path.join(REPO_DIR, "root", "usr", "lib", "ark").replace("\\", "/")

_CLIENT_C_SRC = r"""
#include <sys/socket.h>
#include <sys/un.h>
#include <unistd.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>

#include <stdio.h>
#include <ctype.h>

static int write_all(int fd, const void *buf, size_t len) {
    const char *p = (const char *)buf;
    while (len > 0) {
        ssize_t n = write(fd, p, len);
        if (n <= 0) return -1;
        p += n;
        len -= (size_t)n;
    }
    return 0;
}

/* Fast-path in pure C for `uci [-q] [-c dir] get cfg.sec[.opt]` when sec is a named section (not @...) */
static int try_fast_uci_get(const char *cfg_dir, int argc, char **argv) {
    const char *cmd = NULL;
    const char *target = NULL;
    for (int i = 1; i < argc; i++) {
        if (strcmp(argv[i], "-q") == 0) continue;
        if (strcmp(argv[i], "-c") == 0 && i + 1 < argc) { cfg_dir = argv[++i]; continue; }
        if (strncmp(argv[i], "-c", 2) == 0 && argv[i][2] != '\0') { cfg_dir = argv[i] + 2; continue; }
        if (!cmd) cmd = argv[i];
        else if (!target) target = argv[i];
        else return -1;
    }
    if (!cmd) return 0;
    if (strcmp(cmd, "commit") == 0) return 0;
    if (strcmp(cmd, "get") != 0 || !target) return -1;

    char tbuf[512];
    if (strlen(target) >= sizeof(tbuf)) return -1;
    strcpy(tbuf, target);
    char *p1 = strchr(tbuf, '.');
    if (!p1) return 1;
    *p1++ = '\0';
    char *p2 = strchr(p1, '.');
    if (p2) {
        *p2++ = '\0';
        if (strchr(p2, '.')) return -1;
    }
    const char *cfg_name = tbuf;
    const char *sec_name = p1;
    const char *opt_name = p2;
    if (!*cfg_name || !*sec_name) return -1;

    int is_anon_target = 0;
    char anon_stype[128] = {0};
    int anon_target_idx = 0;
    if (sec_name[0] == '@') {
        const char *lb = strchr(sec_name, '[');
        const char *rb = lb ? strchr(lb, ']') : NULL;
        if (!lb || !rb || rb[1] != '\0') return -1;
        size_t slen = (size_t)(lb - (sec_name + 1));
        if (slen == 0 || slen >= sizeof(anon_stype)) return -1;
        memcpy(anon_stype, sec_name + 1, slen);
        anon_stype[slen] = '\0';
        anon_target_idx = atoi(lb + 1);
        if (anon_target_idx < 0) return -1;
        is_anon_target = 1;
    }

    char fpath[1024];
    snprintf(fpath, sizeof(fpath), "%s/%s", cfg_dir, cfg_name);
    FILE *fp = fopen(fpath, "r");
    if (!fp) return 1;

    char line[2048];
    int in_target_sec = 0;
    int found_sec = 0;
    char found_stype[256] = {0};
    int found_opt = 0;
    char opt_val[4096] = {0};
    int is_list = 0;
    int cur_anon_count = 0;

    while (fgets(line, sizeof(line), fp)) {
        char *s = line;
        while (*s && isspace((unsigned char)*s)) s++;
        if (!*s || *s == '#') continue;
        size_t l = strlen(s);
        while (l > 0 && (s[l-1] == '\n' || s[l-1] == '\r' || isspace((unsigned char)s[l-1]))) s[--l] = '\0';

        if (strncmp(s, "config", 6) == 0 && isspace((unsigned char)s[6])) {
            if (in_target_sec) break; /* mock_uci find_section returns first matching section */
            char *p = s + 6;
            while (*p && isspace((unsigned char)*p)) p++;
            char *stype = p;
            while (*p && !isspace((unsigned char)*p)) p++;
            if (*p) *p++ = '\0';
            while (*p && isspace((unsigned char)*p)) p++;
            if (*p == '\'' || *p == '"') p++;
            size_t pl = strlen(p);
            while (pl > 0 && (p[pl-1] == '\'' || p[pl-1] == '"')) p[--pl] = '\0';
            int match = 0;
            if (is_anon_target) {
                if (strcmp(stype, anon_stype) == 0 && *p == '\0') {
                    if (cur_anon_count == anon_target_idx) match = 1;
                    cur_anon_count++;
                }
            } else {
                if (strcmp(p, sec_name) == 0) match = 1;
            }
            if (match) {
                in_target_sec = 1;
                found_sec = 1;
                strncpy(found_stype, stype, sizeof(found_stype) - 1);
                if (!opt_name) break;
            }
            continue;
        }
        if (!in_target_sec || !opt_name) continue;

        int line_is_opt = (strncmp(s, "option", 6) == 0 && isspace((unsigned char)s[6]));
        int line_is_list = (!line_is_opt && strncmp(s, "list", 4) == 0 && isspace((unsigned char)s[4]));
        if (line_is_opt || line_is_list) {
            char *p = s + (line_is_opt ? 6 : 4);
            while (*p && isspace((unsigned char)*p)) p++;
            char *k = p;
            while (*p && !isspace((unsigned char)*p)) p++;
            if (!*p) continue;
            *p++ = '\0';
            if (strcmp(k, opt_name) != 0) continue;
            while (*p && isspace((unsigned char)*p)) p++;
            if (*p == '\'' || *p == '"') p++;
            size_t vl = strlen(p);
            while (vl > 0 && (p[vl-1] == '\'' || p[vl-1] == '"')) p[--vl] = '\0';
            if (line_is_opt) {
                strncpy(opt_val, p, sizeof(opt_val) - 1);
                opt_val[sizeof(opt_val) - 1] = '\0';
                found_opt = 1;
                is_list = 0;
            } else {
                if (!found_opt || !is_list) {
                    strncpy(opt_val, p, sizeof(opt_val) - 1);
                    is_list = 1;
                } else {
                    size_t cur = strlen(opt_val);
                    if (cur + 1 + vl < sizeof(opt_val)) {
                        opt_val[cur] = ' ';
                        strcpy(opt_val + cur + 1, p);
                    }
                }
                found_opt = 1;
            }
        }
    }
    fclose(fp);
    if (!found_sec) return is_anon_target ? -1 : 1;
    if (!opt_name) {
        printf("%s\n", found_stype);
        return 0;
    }
    if (!found_opt) return 1;
    printf("%s\n", opt_val);
    return 0;
}

int main(int argc, char **argv) {
    const char *prog = argv[0] ? argv[0] : "";
    char mode = (strstr(prog, "jsonfilter") != NULL) ? 'J' : 'U';
    const char *cfg = getenv("UCI_CONFIG_DIR");
    if (!cfg) cfg = "/etc/config";
    if (mode == 'U') {
        int fast_rc = try_fast_uci_get(cfg, argc, argv);
        if (fast_rc >= 0) return fast_rc;
    }
    const char *sock_path = getenv("ARK_MOCK_SOCK");
    if (!sock_path || !*sock_path) return 125;
    int fd = socket(AF_UNIX, SOCK_STREAM, 0);
    if (fd < 0) return 125;
    struct sockaddr_un addr;
    memset(&addr, 0, sizeof(addr));
    addr.sun_family = AF_UNIX;
    strncpy(addr.sun_path, sock_path, sizeof(addr.sun_path) - 1);
    if (connect(fd, (struct sockaddr *)&addr, sizeof(addr)) < 0) {
        close(fd);
        return 125;
    }

    uint32_t u_argc = (uint32_t)(argc > 1 ? argc - 1 : 0);
    write_all(fd, &mode, 1);
    write_all(fd, &u_argc, 4);
    write_all(fd, cfg, strlen(cfg) + 1);
    for (int i = 1; i < argc; i++) {
        write_all(fd, argv[i], strlen(argv[i]) + 1);
    }
    if (mode == 'J') {
        int has_input_file = 0;
        for (int i = 1; i < argc; i++) {
            if (strcmp(argv[i], "-i") == 0 || strcmp(argv[i], "--input") == 0) {
                has_input_file = 1;
                break;
            }
        }
        if (!has_input_file && !isatty(0)) {
            char sbuf[4096];
            ssize_t sn;
            while ((sn = read(0, sbuf, sizeof(sbuf))) > 0) {
                if (write_all(fd, sbuf, (size_t)sn) < 0) break;
            }
        }
    }
    shutdown(fd, SHUT_WR);

    char rbuf[4096];
    ssize_t rn;
    int rc = 0;
    int first = 1;
    while ((rn = read(fd, rbuf, sizeof(rbuf))) > 0) {
        if (first) {
            rc = (unsigned char)rbuf[0];
            if (rn > 1) write_all(1, rbuf + 1, (size_t)(rn - 1));
            first = 0;
        } else {
            write_all(1, rbuf, (size_t)rn);
        }
    }
    close(fd);
    return rc;
}
"""

_MOCK_EXEC_LOCK = threading.Lock()


def _run_mock_in_memory(mode: str, cfg_dir: str, args: list[str], stdin_data: str = "") -> tuple[int, str]:
    with _MOCK_EXEC_LOCK:
        out_buf = io.StringIO()
        old_argv = sys.argv
        old_stdout = sys.stdout
        old_stdin = sys.stdin
        old_cfg = mock_uci.CONFIG_DIR
        rc = 0
        try:
            sys.stdout = out_buf
            if mode == "U":
                mock_uci.CONFIG_DIR = cfg_dir
                sys.argv = ["uci"] + args
                mock_uci.main()
            else:
                sys.argv = ["jsonfilter"] + args
                sys.stdin = io.StringIO(stdin_data)
                mock_jsonfilter.main()
        except SystemExit as e:
            rc = int(e.code) if isinstance(e.code, int) else (1 if e.code else 0)
        except Exception:
            rc = 1
        finally:
            sys.argv = old_argv
            sys.stdout = old_stdout
            sys.stdin = old_stdin
            mock_uci.CONFIG_DIR = old_cfg
        return rc, out_buf.getvalue()


def _ensure_fast_runtime() -> None:
    global _RUNTIME_CACHE_DIR, _UCI_SOCK_PATH, _FAST_CLIENT_BIN, _CACHED_CONTROL_SCRIPT, _CACHED_ARK_LIB_DIR
    with _RUNTIME_LOCK:
        if _RUNTIME_CACHE_DIR is not None:
            return
        _RUNTIME_CACHE_DIR = tempfile.mkdtemp(prefix="ark_fast_rt_")
        atexit.register(lambda d=_RUNTIME_CACHE_DIR: shutil.rmtree(d, ignore_errors=True))

        # Copy shell control script and lib modules to local APFS (/tmp) to avoid ExFAT I/O overhead
        try:
            dst_lib = os.path.join(_RUNTIME_CACHE_DIR, "ark_lib")
            shutil.copytree(_CACHED_ARK_LIB_DIR, dst_lib)
            dst_ctrl = os.path.join(_RUNTIME_CACHE_DIR, "equipe-dashboard-control")
            shutil.copy2(_CACHED_CONTROL_SCRIPT, dst_ctrl)
            os.chmod(dst_ctrl, 0o755)
            _CACHED_ARK_LIB_DIR = dst_lib.replace("\\", "/")
            _CACHED_CONTROL_SCRIPT = dst_ctrl.replace("\\", "/")
        except Exception:
            pass

        if not hasattr(socket, "AF_UNIX"):
            return
        cc_bin = shutil.which("cc") or ("/usr/bin/cc" if os.path.isfile("/usr/bin/cc") else None)
        if not cc_bin:
            return

        try:
            c_src_path = os.path.join(_RUNTIME_CACHE_DIR, "client.c")
            c_bin_path = os.path.join(_RUNTIME_CACHE_DIR, "ark_mock_client")
            with open(c_src_path, "w", encoding="utf-8") as f:
                f.write(_CLIENT_C_SRC)
            subprocess.run([cc_bin, "-O2", c_src_path, "-o", c_bin_path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            os.chmod(c_bin_path, 0o755)

            sock_path = os.path.join(_RUNTIME_CACHE_DIR, "m.sock")
            srv = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            srv.bind(sock_path)
            srv.listen(128)
            srv.settimeout(None)

            def _serve() -> None:
                while True:
                    try:
                        conn, _ = srv.accept()
                    except Exception:
                        break
                    try:
                        raw = b""
                        while True:
                            chunk = conn.recv(8192)
                            if not chunk:
                                break
                            raw += chunk
                        if len(raw) >= 5:
                            mode = chr(raw[0])
                            (argc,) = struct.unpack("<I", raw[1:5])
                            parts = raw[5:].split(b"\x00", argc + 1)
                            cfg_dir = parts[0].decode("utf-8", "replace")
                            args = [p.decode("utf-8", "replace") for p in parts[1 : argc + 1]]
                            rem = parts[argc + 1].decode("utf-8", "replace") if len(parts) > argc + 1 else ""
                            rc, out_str = _run_mock_in_memory(mode, cfg_dir, args, rem)
                            conn.sendall(bytes([rc & 0xFF]) + out_str.encode("utf-8"))
                    except Exception:
                        try:
                            conn.sendall(b"\x01")
                        except Exception:
                            pass
                    finally:
                        try:
                            conn.close()
                        except Exception:
                            pass

            t = threading.Thread(target=_serve, daemon=True)
            t.start()
            _UCI_SOCK_PATH = sock_path
            _FAST_CLIENT_BIN = c_bin_path
        except Exception:
            _UCI_SOCK_PATH = None
            _FAST_CLIENT_BIN = None


CONTROL_SCRIPT = _CACHED_CONTROL_SCRIPT

class RouterSandbox:
    def __init__(self):
        _ensure_fast_runtime()
        self.temp_dir = tempfile.mkdtemp(prefix="ark_sandbox_")
        self.etc_config = os.path.join(self.temp_dir, "etc", "config")
        self.bin_dir = os.path.join(self.temp_dir, "bin")
        self.sys_net = os.path.join(self.temp_dir, "sys", "class", "net")
        self.state_dir = os.path.join(self.temp_dir, "state")
        self.setup_sandbox()

    def setup_sandbox(self):
        os.makedirs(self.etc_config, exist_ok=True)
        os.makedirs(self.bin_dir, exist_ok=True)
        os.makedirs(self.sys_net, exist_ok=True)
        os.makedirs(self.state_dir, exist_ok=True)
        os.makedirs(os.path.join(self.temp_dir, "tmp"), exist_ok=True)
        os.makedirs(os.path.join(self.temp_dir, "var", "log"), exist_ok=True)

        # 1. Create simulated network devices in sysfs
        for dev in ["eth1", "lan4", "pppoe-wan", "pppoe-wan2", "br-lan"]:
            dev_dir = os.path.join(self.sys_net, dev)
            os.makedirs(dev_dir, exist_ok=True)
            with open(os.path.join(dev_dir, "mtu"), "w") as f:
                f.write("1500\n" if dev != "lan4" else "1508\n")
            with open(os.path.join(dev_dir, "speed"), "w") as f:
                f.write("1000\n")
            with open(os.path.join(dev_dir, "duplex"), "w") as f:
                f.write("full\n")

        # 2 & 3. Setup mock UCI and jsonfilter wrappers (native C fast client when available)
        uci_wrapper = os.path.join(self.bin_dir, "uci")
        json_wrapper = os.path.join(self.bin_dir, "jsonfilter")
        if _FAST_CLIENT_BIN and _UCI_SOCK_PATH and os.path.isfile(_FAST_CLIENT_BIN):
            try:
                os.symlink(_FAST_CLIENT_BIN, uci_wrapper)
                os.symlink(_FAST_CLIENT_BIN, json_wrapper)
            except Exception:
                shutil.copy2(_FAST_CLIENT_BIN, uci_wrapper)
                shutil.copy2(_FAST_CLIENT_BIN, json_wrapper)
        else:
            mock_uci_src = os.path.join(SCRIPT_DIR, "mock_uci.py").replace("\\", "/")
            mock_json_src = os.path.join(SCRIPT_DIR, "mock_jsonfilter.py").replace("\\", "/")
            py_bin = sys.executable.replace("\\", "/")
            with open(uci_wrapper, "w") as f:
                f.write(f"#!/bin/sh\nexport UCI_CONFIG_DIR='{self.etc_config}'\nexec '{py_bin}' -S '{mock_uci_src}' \"$@\"\n")
            os.chmod(uci_wrapper, 0o755)
            with open(json_wrapper, "w") as f:
                f.write(f"#!/bin/sh\nexec '{py_bin}' -S '{mock_json_src}' \"$@\"\n")
            os.chmod(json_wrapper, 0o755)

        # 3b. Fast sleep/usleep mock so multi-second delays in shell modules don't stall unit tests
        sleep_wrapper = os.path.join(self.bin_dir, "sleep")
        with open(sleep_wrapper, "w") as f:
            f.write("#!/bin/sh\ncase \"$1\" in 0.*) exec /bin/sleep \"$1\" ;; *) exit 0 ;; esac\n")
        os.chmod(sleep_wrapper, 0o755)

        usleep_wrapper = os.path.join(self.bin_dir, "usleep")
        with open(usleep_wrapper, "w") as f:
            f.write("#!/bin/sh\nexit 0\n")
        os.chmod(usleep_wrapper, 0o755)

        # 4. Setup mock ubus wrapper
        ubus_wrapper = os.path.join(self.bin_dir, "ubus")
        with open(ubus_wrapper, "w") as f:
            f.write("""#!/bin/sh
case "$*" in
  *"network.interface.wan status"*)
    printf '{"up":true,"l3_device":"pppoe-wan","ipv4-address":[{"address":"191.100.1.50"}],"route":[{"target":"0.0.0.0","nexthop":"191.100.1.1"}],"dns-server":["1.1.1.1","8.8.8.8"]}\\n'
    ;;
  *"network.interface.wan2 status"*)
    printf '{"up":true,"l3_device":"pppoe-wan2","ipv4-address":[{"address":"100.64.21.207"}],"route":[{"target":"0.0.0.0","nexthop":"100.64.64.0"}],"dns-server":["1.1.1.1"]}\\n'
    ;;
  *)
    printf '{}\\n'
    ;;
esac
""")
        os.chmod(ubus_wrapper, 0o755)

        # 5. Setup mock sysctl wrapper
        sysctl_log = os.path.join(self.state_dir, "sysctl.log")
        sysctl_wrapper = os.path.join(self.bin_dir, "sysctl")
        with open(sysctl_wrapper, "w") as f:
            f.write(f"""#!/bin/sh
if [ "$1" = "-n" ]; then
    echo 8388608
elif [ "$1" = "-p" ]; then
    exit 0
elif [ "$1" = "-w" ]; then
    echo "$2" >> '{sysctl_log}'
    exit 0
else
    exit 0
fi
""")
        os.chmod(sysctl_wrapper, 0o755)

        # 6. Setup mock ip wrapper
        ip_log = os.path.join(self.state_dir, "ip.log")
        ip_wrapper = os.path.join(self.bin_dir, "ip")
        with open(ip_wrapper, "w") as f:
            f.write(f"""#!/bin/sh
echo "ip $*" >> '{ip_log}'
exit 0
""")
        os.chmod(ip_wrapper, 0o755)

        # 7. Setup mock swconfig wrapper
        sw_wrapper = os.path.join(self.bin_dir, "swconfig")
        with open(sw_wrapper, "w") as f:
            f.write("#!/bin/sh\nexit 0\n" if False else "#!/bin/sh\nexit 1\n")
        os.chmod(sw_wrapper, 0o755)

        # 7b. Setup mock firewall wrappers (defaulting to fw4 / modern OpenWrt)
        self.fw4_wrapper = os.path.join(self.bin_dir, "fw4")
        with open(self.fw4_wrapper, "w") as f:
            f.write("#!/bin/sh\nexit 0\n")
        os.chmod(self.fw4_wrapper, 0o755)

        self.nft_wrapper = os.path.join(self.bin_dir, "nft")
        with open(self.nft_wrapper, "w") as f:
            f.write("#!/bin/sh\nexit 0\n")
        os.chmod(self.nft_wrapper, 0o755)

        self.iptables_wrapper = os.path.join(self.bin_dir, "iptables")
        with open(self.iptables_wrapper, "w") as f:
            f.write("#!/bin/sh\nexit 0\n")
        os.chmod(self.iptables_wrapper, 0o755)

        self.iptables_save_wrapper = os.path.join(self.bin_dir, "iptables-save")
        with open(self.iptables_save_wrapper, "w") as f:
            f.write("#!/bin/sh\nexit 0\n")
        os.chmod(self.iptables_save_wrapper, 0o755)

        # 8. Setup mock init.d scripts
        init_dir = os.path.join(self.temp_dir, "etc", "init.d")
        os.makedirs(init_dir, exist_ok=True)
        for s in ["sqm", "firewall", "irqbalance", "network", "mwan3"]:
            s_path = os.path.join(init_dir, s)
            with open(s_path, "w") as f:
                f.write("#!/bin/sh\nexit 0\n")
            os.chmod(s_path, 0o755)

        # 9. Setup default configs
        self.init_configs()

    def init_configs(self):
        # /etc/config/network
        with open(os.path.join(self.etc_config, "network"), "w") as f:
            f.write("""
config globals 'globals'
	option packet_steering '1'

config device
	option name 'eth1'
	option macaddr '34:66:79:68:E6:97'

config interface 'wan'
	option device 'eth1'
	option proto 'pppoe'
	option mtu '1500'
	option device_mtu '1508'

config device
	option name 'lan4'
	option mtu '1508'

config interface 'wan2'
	option device 'lan4'
	option proto 'pppoe'
	option mtu '1500'
	option device_mtu '1508'

config interface 'lan'
	option proto 'static'
	option ipaddr '192.168.73.1'
""")

        # /etc/config/sqm
        with open(os.path.join(self.etc_config, "sqm"), "w") as f:
            f.write("""
config queue 'wan1'
	option interface 'pppoe-wan'
	option qdisc 'cake'
	option script 'piece_of_cake.qos'
	option enabled '1'
	option linklayer 'ethernet'
	option overhead '44'
	option mpu '64'

config queue 'wan2'
	option interface 'pppoe-wan2'
	option qdisc 'cake'
	option script 'piece_of_cake.qos'
	option enabled '1'
	option linklayer 'ethernet'
	option overhead '44'
	option mpu '64'
""")

        # /etc/config/firewall
        with open(os.path.join(self.etc_config, "firewall"), "w") as f:
            f.write("""
config defaults
	option flow_offloading '0'
	option flow_offloading_hw '0'

config zone
	option name 'wan'
	list network 'wan'
	list network 'wan2'
""")

        # /etc/config/mwan3
        with open(os.path.join(self.etc_config, "mwan3"), "w") as f:
            f.write("""
config interface 'wan'
	option enabled '1'

config interface 'wan2'
	option enabled '1'
""")

        # /etc/config/equipe_dashboard
        with open(os.path.join(self.etc_config, "equipe_dashboard"), "w") as f:
            f.write("""
config wan_profiles 'wan_profiles'
	option wan 'xpon_bridge'
	option wan2 'xpon_bridge'
""")

        # /etc/config/dhcp
        with open(os.path.join(self.etc_config, "dhcp"), "w") as f:
            f.write("""
config dnsmasq
	option domainneeded '1'
	option localise_queries '1'

config dhcp 'lan'
	option interface 'lan'
	option start '100'
	option limit '150'
	option leasetime '12h'
	option dhcpv4 'server'
	option dhcpv6 'server'
	option ra 'server'
""")

    def run_control(self, *args):
        env = os.environ.copy()
        env["PATH"] = self.bin_dir + os.pathsep + env.get("PATH", "")
        env["UCI_CONFIG_DIR"] = self.etc_config
        env["ARK_ROOT"] = self.temp_dir
        env["ARK_LIB_DIR"] = _CACHED_ARK_LIB_DIR
        if _UCI_SOCK_PATH:
            env["ARK_MOCK_SOCK"] = _UCI_SOCK_PATH
        
        sh_bin = "sh"
        for candidate in [r"C:\Program Files\Git\bin\sh.exe", r"C:\Program Files\Git\bin\bash.exe", "sh", "bash"]:
            if os.path.isabs(candidate) and os.path.isfile(candidate):
                sh_bin = candidate
                break
            elif shutil.which(candidate):
                sh_bin = candidate
                break

        cmd = [sh_bin, _CACHED_CONTROL_SCRIPT] + list(args)
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            encoding="utf-8",
            errors="replace",
            env=env
        )
        return proc

    def run_sh(self, script_str):
        env = os.environ.copy()
        env["PATH"] = self.bin_dir + os.pathsep + env.get("PATH", "")
        env["UCI_CONFIG_DIR"] = self.etc_config
        env["ARK_ROOT"] = self.temp_dir
        env["ARK_LIB_DIR"] = _CACHED_ARK_LIB_DIR
        if _UCI_SOCK_PATH:
            env["ARK_MOCK_SOCK"] = _UCI_SOCK_PATH
        
        sh_bin = "sh"
        for candidate in [r"C:\Program Files\Git\bin\sh.exe", r"C:\Program Files\Git\bin\bash.exe", "sh", "bash"]:
            if os.path.isabs(candidate) and os.path.isfile(candidate):
                sh_bin = candidate
                break
            elif shutil.which(candidate):
                sh_bin = candidate
                break

        return subprocess.run([sh_bin, "-c", script_str], stdout=subprocess.PIPE, stderr=subprocess.PIPE, encoding="utf-8", errors="replace", env=env)

    def uci_get(self, key):
        rc, out = _run_mock_in_memory("U", self.etc_config, ["-c", self.etc_config, "get", key])
        if rc == 0:
            return out.strip()
        return None

    def uci_set(self, expr):
        _run_mock_in_memory("U", self.etc_config, ["-c", self.etc_config, "set", expr])

    def cleanup(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)


def _install_parallel_unittest_runner() -> None:
    if os.environ.get("ARK_SERIAL_TESTS") == "1":
        return
    try:
        import unittest
        import concurrent.futures

        orig_suite_run = unittest.TestSuite.run

        def _flatten_cases(suite) -> list:
            cases = []
            for item in suite:
                if isinstance(item, unittest.TestSuite):
                    cases.extend(_flatten_cases(item))
                else:
                    cases.append(item)
            return cases

        def _parallel_suite_run(self, result, debug=False):
            if debug or getattr(result, "_ark_in_parallel", False):
                return orig_suite_run(self, result, debug)
            cases = _flatten_cases(self)
            if len(cases) < 4:
                return orig_suite_run(self, result, debug)

            _ensure_fast_runtime()
            setattr(result, "_ark_in_parallel", True)
            workers = min(8, (os.cpu_count() or 4), len(cases))

            def _run_case(tc):
                sub_res = unittest.TestResult()
                setattr(sub_res, "_ark_in_parallel", True)
                tc.run(sub_res)
                return tc, sub_res

            with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as pool:
                sub_results = list(pool.map(_run_case, cases))

            stream = getattr(result, "stream", None)
            show_all = getattr(result, "showAll", False)
            dots = getattr(result, "dots", False)

            for tc, sr in sub_results:
                result.testsRun += sr.testsRun
                result.failures.extend(sr.failures)
                result.errors.extend(sr.errors)
                result.skipped.extend(sr.skipped)
                if stream is not None:
                    if show_all:
                        status_str = "ok" if sr.wasSuccessful() else ("FAIL" if sr.failures else "ERROR")
                        stream.writeln(f"{tc} ... {status_str}")
                    elif dots:
                        stream.write("." if sr.wasSuccessful() else ("F" if sr.failures else "E"))
                        stream.flush()
            return result

        unittest.TestSuite.run = _parallel_suite_run  # type: ignore[method-assign]
    except Exception:
        pass


_install_parallel_unittest_runner()

if __name__ == "__main__":
    sb = RouterSandbox()
    res = sb.run_control("wan-optimize-status", "iface=wan2")
    print("Status code:", res.returncode)
    print("Stdout:", res.stdout)
    sb.cleanup()
