#!/usr/bin/env python3
"""
Test Sandbox Harness for ARK Router.
Provides an isolated virtual OpenWrt environment to run and test equipe-dashboard-control locally without a router.
"""
import os
import sys
import shutil
import tempfile
import subprocess

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
CONTROL_SCRIPT = os.path.join(REPO_DIR, "root", "usr", "sbin", "equipe-dashboard-control").replace("\\", "/")

class RouterSandbox:
    def __init__(self):
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

        # 2. Setup mock UCI wrapper
        mock_uci_src = os.path.join(SCRIPT_DIR, "mock_uci.py").replace("\\", "/")
        py_bin = sys.executable.replace("\\", "/")
        uci_wrapper = os.path.join(self.bin_dir, "uci")
        with open(uci_wrapper, "w") as f:
            f.write(f"#!/bin/sh\nexport UCI_CONFIG_DIR='{self.etc_config}'\nexec '{py_bin}' '{mock_uci_src}' \"$@\"\n")
        os.chmod(uci_wrapper, 0o755)

        # 3. Setup mock jsonfilter wrapper
        mock_json_src = os.path.join(SCRIPT_DIR, "mock_jsonfilter.py").replace("\\", "/")
        json_wrapper = os.path.join(self.bin_dir, "jsonfilter")
        with open(json_wrapper, "w") as f:
            f.write(f"#!/bin/sh\nexec '{py_bin}' '{mock_json_src}' \"$@\"\n")
        os.chmod(json_wrapper, 0o755)

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
            f.write("#!/bin/sh\nexit 1\n")
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
	option overhead '28'

config queue 'wan2'
	option interface 'pppoe-wan2'
	option qdisc 'cake'
	option script 'piece_of_cake.qos'
	option enabled '1'
	option linklayer 'ethernet'
	option overhead '28'
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
        env["ARK_LIB_DIR"] = os.path.join(REPO_DIR, "root", "usr", "lib", "ark")
        
        sh_bin = "sh"
        for candidate in [r"C:\Program Files\Git\bin\sh.exe", r"C:\Program Files\Git\bin\bash.exe", "sh", "bash"]:
            if os.path.isabs(candidate) and os.path.isfile(candidate):
                sh_bin = candidate
                break
            elif shutil.which(candidate):
                sh_bin = candidate
                break

        cmd = [sh_bin, CONTROL_SCRIPT] + list(args)
        proc = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env
        )
        return proc

    def run_sh(self, script_str):
        env = os.environ.copy()
        env["PATH"] = self.bin_dir + os.pathsep + env.get("PATH", "")
        env["UCI_CONFIG_DIR"] = self.etc_config
        env["ARK_ROOT"] = self.temp_dir
        env["ARK_LIB_DIR"] = os.path.join(REPO_DIR, "root", "usr", "lib", "ark")
        
        sh_bin = "sh"
        for candidate in [r"C:\Program Files\Git\bin\sh.exe", r"C:\Program Files\Git\bin\bash.exe", "sh", "bash"]:
            if os.path.isabs(candidate) and os.path.isfile(candidate):
                sh_bin = candidate
                break
            elif shutil.which(candidate):
                sh_bin = candidate
                break

        return subprocess.run([sh_bin, "-c", script_str], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env)

    def uci_get(self, key):
        env = os.environ.copy()
        env["UCI_CONFIG_DIR"] = self.etc_config
        mock_uci_src = os.path.join(SCRIPT_DIR, "mock_uci.py")
        proc = subprocess.run(
            [sys.executable, mock_uci_src, "-c", self.etc_config, "get", key],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env
        )
        if proc.returncode == 0:
            return proc.stdout.strip()
        return None

    def uci_set(self, expr):
        env = os.environ.copy()
        env["UCI_CONFIG_DIR"] = self.etc_config
        mock_uci_src = os.path.join(SCRIPT_DIR, "mock_uci.py")
        subprocess.run(
            [sys.executable, mock_uci_src, "-c", self.etc_config, "set", expr],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env
        )

    def cleanup(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

if __name__ == "__main__":
    sb = RouterSandbox()
    res = sb.run_control("wan-optimize-status", "iface=wan2")
    print("Status code:", res.returncode)
    print("Stdout:", res.stdout)
    sb.cleanup()
