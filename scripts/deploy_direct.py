import os
import sys
import time
import paramiko

ROUTER_IP = os.environ.get('ARK_ROUTER_IP', '192.168.1.1')
ROUTER_PORT = int(os.environ.get('ARK_ROUTER_PORT', '22'))
USERNAME = os.environ.get('ARK_ROUTER_USER', 'root')
PASSWORD = os.environ.get('ARK_ROUTER_PASSWORD') or os.environ.get('ARK_ROUTER_TEST_PASSWORD') or ''

if not PASSWORD:
    print("Set ARK_ROUTER_PASSWORD or ARK_ROUTER_TEST_PASSWORD before running direct deploy.", file=sys.stderr)
    sys.exit(2)

repo_dir = os.environ.get('ARK_ROUTER_REPO_DIR', os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Run minification pipeline before deploy
try:
    from build_minified_assets import build_minified
    minified_map = build_minified()
except Exception as e:
    print(f"Aviso: Não foi possível minificar assets automaticamente ({e}). Usando originais.")
    minified_map = {}

raw_files_to_upload = [
    (os.path.join(repo_dir, 'root', 'usr', 'sbin', 'equipe-dashboard-control'), '/usr/sbin/equipe-dashboard-control'),
    (os.path.join(repo_dir, 'root', 'usr', 'sbin', 'ark-doctor'), '/usr/sbin/ark-doctor'),
    (os.path.join(repo_dir, 'root', 'usr', 'sbin', 'equipe-traffic-history'), '/usr/sbin/equipe-traffic-history'),
    (os.path.join(repo_dir, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.js'), '/www/luci-static/resources/view/equipe-dashboard/overview.js'),
    (os.path.join(repo_dir, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.css'), '/www/luci-static/resources/view/equipe-dashboard/overview.css'),
    (os.path.join(repo_dir, 'root', 'usr', 'share', 'rpcd', 'acl.d', 'luci-app-equipe-dashboard.json'), '/usr/share/rpcd/acl.d/luci-app-equipe-dashboard.json'),
    (os.path.join(repo_dir, 'root', 'usr', 'share', 'luci', 'menu.d', 'luci-app-equipe-dashboard.json'), '/usr/share/luci/menu.d/luci-app-equipe-dashboard.json'),
    (os.path.join(repo_dir, 'root', 'usr', 'share', 'ark-router', 'VERSION'), '/usr/share/ark-router/VERSION'),
    (os.path.join(repo_dir, 'root', 'usr', 'libexec', 'ark-starlink-telemetry'), '/usr/libexec/ark-starlink-telemetry'),
    (os.path.join(repo_dir, 'root', 'www', 'cgi-bin', 'ark-starlink-telemetry'), '/www/cgi-bin/ark-starlink-telemetry'),
    (os.path.join(repo_dir, 'root', 'www', 'cgi-bin', 'ark-mesh-export'), '/www/cgi-bin/ark-mesh-export'),
    (os.path.join(repo_dir, 'root', 'www', 'starlink', 'index.html'), '/www/starlink/index.html'),
    (os.path.join(repo_dir, 'root', 'www', 'luci-static', 'ark', 'ark-theme.js'), '/www/luci-static/ark/ark-theme.js'),
    (os.path.join(repo_dir, 'root', 'www', 'luci-static', 'ark', 'cascade.css'), '/www/luci-static/ark/cascade.css'),
    (os.path.join(repo_dir, 'root', 'usr', 'share', 'ucode', 'luci', 'template', 'themes', 'ark', 'header.ut'), '/usr/share/ucode/luci/template/themes/ark/header.ut'),
    (os.path.join(repo_dir, 'root', 'usr', 'share', 'ucode', 'luci', 'template', 'themes', 'ark', 'footer.ut'), '/usr/share/ucode/luci/template/themes/ark/footer.ut'),
    (os.path.join(repo_dir, 'root', 'usr', 'lib', 'lua', 'luci', 'view', 'themes', 'ark', 'header.htm'), '/usr/lib/lua/luci/view/themes/ark/header.htm'),
    (os.path.join(repo_dir, 'root', 'usr', 'lib', 'lua', 'luci', 'view', 'themes', 'ark', 'footer.htm'), '/usr/lib/lua/luci/view/themes/ark/footer.htm'),
    (os.path.join(repo_dir, 'root', 'etc', 'init.d', 'ark-zerotier-ram'), '/etc/init.d/ark-zerotier-ram'),
    (os.path.join(repo_dir, 'root', 'usr', 'sbin', 'starlink-telemetry-daemon'), '/usr/sbin/starlink-telemetry-daemon'),
    (os.path.join(repo_dir, 'root', 'etc', 'init.d', 'starlink-telemetry'), '/etc/init.d/starlink-telemetry'),
    (os.path.join(repo_dir, 'root', 'etc', 'init.d', 'ark-hardware-tune'), '/etc/init.d/ark-hardware-tune'),
    (os.path.join(repo_dir, 'root', 'etc', 'init.d', 'ark-firewall-guard'), '/etc/init.d/ark-firewall-guard'),
    (os.path.join(repo_dir, 'root', 'etc', 'uci-defaults', '99-ark-router-dhcp-sanitize'), '/etc/uci-defaults/99-ark-router-dhcp-sanitize'),
    (os.path.join(repo_dir, 'root', 'etc', 'nftables.d', '15-ark-dscp-priority.nft'), '/etc/nftables.d/15-ark-dscp-priority.nft'),
    (os.path.join(repo_dir, 'root', 'etc', 'hotplug.d', 'net', '90-ark-rps-tune'), '/etc/hotplug.d/net/90-ark-rps-tune'),
]

ark_lib_dir = os.path.join(repo_dir, 'root', 'usr', 'lib', 'ark')
if os.path.isdir(ark_lib_dir):
    for root_path, _, fnames in os.walk(ark_lib_dir):
        for fname in fnames:
            local_f = os.path.join(root_path, fname)
            rel = os.path.relpath(local_f, os.path.join(repo_dir, 'root'))
            remote_f = '/' + rel.replace('\\', '/')
            raw_files_to_upload.append((local_f, remote_f))

files_to_upload = [
    (minified_map.get(local_path, local_path), remote_path)
    for local_path, remote_path in raw_files_to_upload
]

print(f"Conectando ao roteador {ROUTER_IP} via SSH...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ROUTER_IP, port=ROUTER_PORT, username=USERNAME, password=PASSWORD, timeout=10)

for local_path, remote_path in files_to_upload:
    print(f"Transferindo {os.path.basename(local_path)} ({os.path.getsize(local_path)} bytes) para {remote_path}...")
    with open(local_path, 'rb') as f:
        data = f.read()
    
    remote_dir = os.path.dirname(remote_path).replace('\\', '/')
    stdin, stdout, stderr = ssh.exec_command(f"mkdir -p '{remote_dir}' && cat > '{remote_path}'")
    stdin.write(data)
    stdin.flush()
    stdin.channel.shutdown_write()
    status = stdout.channel.recv_exit_status()
    if status != 0:
        err = stderr.read().decode()
        print(f"Erro ao salvar {remote_path}: {err}")
    else:
        print(f"  -> {os.path.basename(local_path)} gravado com sucesso.")

cmds = [
    'chmod +x /usr/sbin/equipe-dashboard-control /usr/sbin/ark-doctor /usr/sbin/equipe-traffic-history /usr/libexec/ark-starlink-telemetry /www/cgi-bin/ark-starlink-telemetry /www/cgi-bin/ark-mesh-export /etc/init.d/ark-zerotier-ram /etc/init.d/ark-hardware-tune /etc/init.d/ark-firewall-guard /etc/uci-defaults/99-ark-router-dhcp-sanitize /usr/sbin/starlink-telemetry-daemon /usr/sbin/starlink-telemetry-mailer /etc/init.d/starlink-telemetry /usr/lib/ark/*.sh /usr/lib/ark/modules/*.sh 2>/dev/null || true',
    'touch /etc/config/starlink_telemetry 2>/dev/null || true',
    'rm -f /etc/rc.d/S99ark-qdisc-tune /etc/init.d/ark-qdisc-tune 2>/dev/null || true',
    'killall equipe-traffic-history 2>/dev/null || true',
    'rm -f /tmp/equipe-traffic-history.state',
    '/usr/sbin/equipe-traffic-history &',
    'uci -q get equipe_dashboard.main.operation_profile >/dev/null || uci set equipe_dashboard.main.operation_profile="standard"',
    'uci -q set network.globals.packet_steering="2" && uci commit network 2>/dev/null || true',
    'uci commit equipe_dashboard',
    '/etc/init.d/ark-hardware-tune enable 2>/dev/null || true',
    '/etc/init.d/ark-hardware-tune start 2>/dev/null || true',
    '/sbin/fw4 reload 2>/dev/null || true',
    'rm -rf /tmp/luci-*',
    '/etc/init.d/rpcd restart',
    '/etc/init.d/uhttpd restart',
    '/usr/sbin/equipe-dashboard-control features',
    '/usr/sbin/equipe-dashboard-control profile status'
]

print("\nAplicando permissões, limpando cache e reiniciando LuCI...")
for cmd in cmds:
    stdin, stdout, stderr = ssh.exec_command(cmd)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    if out:
        print(out)
    if err and 'syntax error' in err:
        print(f"Erro no comando '{cmd}': {err}")

ssh.close()
print("\n[OK] DEPLOY REALIZADO COM SUCESSO NO ROTEADOR!")
