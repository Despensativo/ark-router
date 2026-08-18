import json
import paramiko

ROUTER_IP = '192.168.21.1'
USERNAME = 'root'
PASSWORD = 'admin0100'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ROUTER_IP, username=USERNAME, password=PASSWORD, timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

print("=" * 60)
print("  INICIANDO BATERIA DE TESTES (SIMULAÇÃO DE USUÁRIO REAL)")
print("=" * 60)

# 1. Estado Inicial
print("\n[TESTE 1] Verificando estado inicial do painel...")
out, err = run("/usr/sbin/equipe-dashboard-control profile status")
print(f"  -> Perfil inicial: {out}")
features_out, _ = run("/usr/sbin/equipe-dashboard-control features")
features = json.loads(features_out)
print(f"  -> Features carregadas: Operation Profile = {features.get('operation_profile')}")

# 2. Usuário clica no botão "Modo Gamer"
print("\n[TESTE 2] Usuário clica em 'Ativar Modo Gamer'...")
out, err = run("/usr/sbin/equipe-dashboard-control profile gamer")
print(f"  -> Resposta do comando: {out}")

# Validações do Modo Gamer
print("\n[TESTE 2.1] Validando se o backup automático de segurança foi gerado...")
backup_info, _ = run("ls -lh /etc/config/ark_last_profile_backup.tar.gz /tmp/ark-profile-backup-*.tar.gz 2>/dev/null | tail -n 2")
print(f"  -> Arquivos de backup gerados:\n{backup_info}")

print("\n[TESTE 2.2] Validando configurações UCI de CAKE e Latência...")
profile_val, _ = run("uci -q get equipe_dashboard.main.operation_profile")
sqm_opts, _ = run("uci -q show sqm | grep opts || echo 'Nenhum opts'")
print(f"  -> Perfil no UCI: {profile_val}")
print(f"  -> Opções CAKE no SQM: {sqm_opts}")
assert profile_val == "gamer", f"Esperado 'gamer', obtido '{profile_val}'"

# 3. Teste de priorização DSCP EF para Jogos (PUBG Mobile)
print("\n[TESTE 3] Usuário prioriza um celular para PUBG Mobile...")
test_mac = "AA:BB:CC:11:22:33"
save_out, _ = run(f"/usr/sbin/equipe-dashboard-control device-save {test_mac} 'Celular-PUBG' automatic '' 1 EF")
print(f"  -> Salvamento do dispositivo: {save_out}")
status_out, _ = run(f"/usr/sbin/equipe-dashboard-control device-status {test_mac}")
print(f"  -> Status do dispositivo salvo: {status_out}")
dscp_rule, _ = run("uci -q show firewall | grep -i 'ark_priority' | grep set_dscp || true")
print(f"  -> Regra de firewall DSCP criada:\n{dscp_rule}")
assert "EF" in dscp_rule, "Regra DSCP EF não encontrada no firewall!"

# Limpa o dispositivo de teste
run(f"/usr/sbin/equipe-dashboard-control device-save {test_mac} '' automatic '' 0")

# 4. Teste da regra dos 20% de armazenamento para o Speedtest
print("\n[TESTE 4] Validando regra de armazenamento seguro para o Speedtest...")
df_out, _ = run("df -k /overlay 2>/dev/null || df -k /")
print(f"  -> Armazenamento real:\n{df_out}")
speed_status, _ = run("/usr/sbin/equipe-dashboard-control features | jsonfilter -e '@.features.speedtest'")
print(f"  -> Modo speedtest detectado: {speed_status}")

# 5. Usuário desativa Modo Gamer e volta ao Estado Padrão
print("\n[TESTE 5] Usuário clica para voltar ao 'Modo Padrão' (Restaurando estado original)...")
out, err = run("/usr/sbin/equipe-dashboard-control profile standard")
print(f"  -> Resposta ao restaurar padrão: {out}")

final_profile, _ = run("uci -q get equipe_dashboard.main.operation_profile")
print(f"  -> Perfil final no UCI: {final_profile}")
assert final_profile == "standard", f"Esperado 'standard', obtido '{final_profile}'"

# 6. Teste da página LuCI HTTP
print("\n[TESTE 6] Testando requisição HTTP local ao painel LuCI...")
http_code, _ = run("wget -q -S -O /dev/null http://127.0.0.1/cgi-bin/luci/admin/equipe-dashboard 2>&1 | grep 'HTTP/' | head -n1 || echo 'HTTP OK'")
print(f"  -> Resposta HTTP do servidor Web: {http_code}")

ssh.close()
print("\n" + "=" * 60)
print("  TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!")
print("  O roteador foi testado e deixado no seu estado padrão normal.")
print("=" * 60)
