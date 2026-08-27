import os
import sys
import json
import paramiko

ROUTER_IP = os.environ.get('ARK_ROUTER_IP', '192.168.73.1')
USERNAME = os.environ.get('ARK_ROUTER_USER', 'root')
PASSWORD = os.environ.get('ARK_ROUTER_PASSWORD', 'admin0100')

print("=" * 60)
print(f"  TESTANDO ADIÇÃO PROGRESSIVA DE WAN NO ROTEADOR {ROUTER_IP}")
print("=" * 60)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(ROUTER_IP, username=USERNAME, password=PASSWORD, timeout=10)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    return out, err

print("\n1. Verificando estado atual das interfaces de rede...")
ports_before, _ = run("uci -q get network.@device[0].ports")
print(f"  -> Portas na bridge br-lan: {ports_before}")

wans_before, _ = run("uci -q show network | grep '=interface' | cut -d. -f2 | cut -d= -f1 | grep -E '^wan'")
print(f"  -> WANs existentes:\n{wans_before}")

# 2. Testando criação de WAN3 em uma porta LAN
print("\n2. Executando wan-save para converter lan3 em WAN3...")
out, err = run("/usr/sbin/equipe-dashboard-control wan-save iface=wan3 device=lan3 proto=dhcp")
print(f"  -> Resposta do comando: {out} (err: {err})")
assert out == "ok", f"Esperado 'ok', obtido '{out}'"

print("\n3. Validando criação de WAN3 e isolamento da bridge...")
wan3_dev, _ = run("uci -q get network.wan3.device")
wan3_metric, _ = run("uci -q get network.wan3.metric")
wan3_proto, _ = run("uci -q get network.wan3.proto")
ports_during, _ = run("uci -q get network.@device[0].ports")
fw_networks, _ = run("zone=$(uci -q show firewall | grep -E '\\.name=.?wan.?' | cut -d. -f2 | head -n1); uci -q get firewall.$zone.network")

print(f"  -> network.wan3.device: {wan3_dev}")
print(f"  -> network.wan3.metric: {wan3_metric}")
print(f"  -> network.wan3.proto: {wan3_proto}")
print(f"  -> Portas no br-lan após conversão (lan3 deve ter saído): {ports_during}")
print(f"  -> Redes na zona WAN do firewall (deve incluir wan3): {fw_networks}")

assert wan3_dev == "lan3", f"device incorreto: {wan3_dev}"
assert wan3_metric == "30", f"metric incorreta: {wan3_metric}"
assert "lan3" not in ports_during.split(), "lan3 ainda está no br-lan!"
assert "wan3" in fw_networks.split(), "wan3 não foi adicionado à zona do firewall!"

print("\n4. Validando integração no MWAN3...")
mwan_members, _ = run("uci -q show mwan3 | grep -i 'wan3' || echo 'Sem entradas wan3'")
print(f"  -> Entradas wan3 no mwan3:\n{mwan_members}")

print("\n5. Testando devolução de WAN3 para a LAN (mode=lan)...")
out, err = run("/usr/sbin/equipe-dashboard-control wan-save iface=wan3 mode=lan")
print(f"  -> Resposta ao devolver para LAN: {out} (err: {err})")
assert out == "ok", f"Esperado 'ok', obtido '{out}'"

print("\n6. Validando restauração de lan3 no br-lan e limpeza de network.wan3...")
wan3_check, _ = run("uci -q get network.wan3.device || echo 'Deletado com sucesso'")
ports_after, _ = run("uci -q get network.@device[0].ports")
fw_networks_after, _ = run("zone=$(uci -q show firewall | grep -E '\\.name=.?wan.?' | cut -d. -f2 | head -n1); uci -q get firewall.$zone.network")

print(f"  -> network.wan3: {wan3_check}")
print(f"  -> Portas no br-lan (lan3 deve ter voltado): {ports_after}")
print(f"  -> Redes na zona WAN do firewall: {fw_networks_after}")

assert "lan3" in ports_after.split(), "lan3 não foi restaurada no br-lan!"
assert "wan3" not in fw_networks_after.split(), "wan3 ainda está na zona do firewall!"

ssh.close()
print("\n" + "=" * 60)
print("  TESTES DE ADIÇÃO PROGRESSIVA DE WAN CONCLUÍDOS COM SUCESSO!")
print("=" * 60)
