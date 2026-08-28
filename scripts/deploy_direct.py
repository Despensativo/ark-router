import os
import sys
import time
import paramiko

ROUTER_IP = os.environ.get('ARK_ROUTER_IP', '192.168.1.1')
USERNAME = os.environ.get('ARK_ROUTER_USER', 'root')
PASSWORD = os.environ.get('ARK_ROUTER_PASSWORD')

if not PASSWORD:
    print("Set ARK_ROUTER_PASSWORD before running direct deploy.", file=sys.stderr)
    sys.exit(2)

repo_dir = os.environ.get('ARK_ROUTER_REPO_DIR', os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

files_to_upload = [
    (os.path.join(repo_dir, 'root', 'usr', 'sbin', 'equipe-dashboard-control'), '/usr/sbin/equipe-dashboard-control'),
    (os.path.join(repo_dir, 'root', 'usr', 'sbin', 'equipe-traffic-history'), '/usr/sbin/equipe-traffic-history'),
    (os.path.join(repo_dir, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.js'), '/www/luci-static/resources/view/equipe-dashboard/overview.js'),
    (os.path.join(repo_dir, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.css'), '/www/luci-static/resources/view/equipe-dashboard/overview.css'),
    (os.path.join(repo_dir, 'root', 'usr', 'share', 'rpcd', 'acl.d', 'luci-app-equipe-dashboard.json'), '/usr/share/rpcd/acl.d/luci-app-equipe-dashboard.json'),
    (os.path.join(repo_dir, 'root', 'usr', 'libexec', 'ark-starlink-telemetry'), '/usr/libexec/ark-starlink-telemetry'),
    (os.path.join(repo_dir, 'root', 'www', 'cgi-bin', 'ark-starlink-telemetry'), '/www/cgi-bin/ark-starlink-telemetry'),
]

print(f"Conectando ao roteador {ROUTER_IP} via SSH...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ROUTER_IP, username=USERNAME, password=PASSWORD, timeout=10)

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
    'chmod +x /usr/sbin/equipe-dashboard-control /usr/sbin/equipe-traffic-history /usr/libexec/ark-starlink-telemetry /www/cgi-bin/ark-starlink-telemetry',
    'killall equipe-traffic-history 2>/dev/null || true',
    'rm -f /tmp/equipe-traffic-history.state',
    '/usr/sbin/equipe-traffic-history &',
    'uci -q get equipe_dashboard.main.operation_profile >/dev/null || uci set equipe_dashboard.main.operation_profile="standard"',
    'uci commit equipe_dashboard',
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
