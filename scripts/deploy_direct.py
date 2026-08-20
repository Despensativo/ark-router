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
    (os.path.join(repo_dir, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.js'), '/www/luci-static/resources/view/equipe-dashboard/overview.js'),
    (os.path.join(repo_dir, 'root', 'www', 'luci-static', 'resources', 'view', 'equipe-dashboard', 'overview.css'), '/www/luci-static/resources/view/equipe-dashboard/overview.css'),
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
    'chmod +x /usr/sbin/equipe-dashboard-control',
    'uci -q get equipe_dashboard.main.operation_profile >/dev/null || uci set equipe_dashboard.main.operation_profile="standard"',
    'uci commit equipe_dashboard',
    'rm -rf /tmp/luci-*',
    '/etc/init.d/rpcd restart',
    '/etc/init.d/uhttpd restart',
    '/usr/sbin/equipe-dashboard-control features',
    '/usr/sbin/equipe-dashboard-control profile status'
]

full_cmd = ' && '.join(cmds)
print("\nAplicando permissões, limpando cache e reiniciando LuCI...")
stdin, stdout, stderr = ssh.exec_command(full_cmd)
out = stdout.read().decode()
err = stderr.read().decode()

print("\n--- RESPOSTA DO ROTEADOR ---")
print(out)
if err:
    print("Stderr:", err)

ssh.close()
print("\n[OK] DEPLOY REALIZADO COM SUCESSO NO ROTEADOR!")
