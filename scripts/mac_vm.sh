#!/usr/bin/env bash
# ==============================================================================
# ARK Router — Gerenciador CLI da Máquina Virtual no macOS (UTM / QEMU Headless)
# ==============================================================================
# Uso:
#   ./scripts/mac_vm.sh start [modern|legacy]  - Inicia a VM em segundo plano (-snapshot)
#   ./scripts/mac_vm.sh stop                   - Encerra a VM limpa e seguramente
#   ./scripts/mac_vm.sh status                 - Exibe status do processo e portas
#   ./scripts/mac_vm.sh shell                  - Abre console serial interativo com a VM
#   ./scripts/mac_vm.sh deploy                 - Realiza deploy direto do código na VM
#   ./scripts/mac_vm.sh test                   - Executa bateria de testes canônica na VM
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

VM_DIR="${ARK_VM_DIR:-$HOME/Downloads/OpenWrt-ARK-UTM}"
PID_FILE="/tmp/ark_vm_qemu.pid"
SERIAL_SOCK="/tmp/qemu_serial.sock"
LOG_FILE="/tmp/ark_vm_qemu.log"
IMG_TYPE_FILE="/tmp/ark_vm_qemu.type"

HTTP_PORT="${ARK_VM_HTTP_PORT:-8085}"
SSH_PORT="${ARK_VM_SSH_PORT:-2225}"
VM_PASS="${ARK_ROUTER_TEST_PASSWORD:-password}"

PYTHON_BIN="/Users/user/.antigravity-tools-env/bin/python3"
if [ ! -x "$PYTHON_BIN" ]; then
    PYTHON_BIN="$(command -v python3 || echo python3)"
fi

find_qemu() {
    if [ -x "/opt/homebrew/bin/qemu-system-x86_64" ]; then
        echo "/opt/homebrew/bin/qemu-system-x86_64"
    elif command -v qemu-system-x86_64 >/dev/null 2>&1; then
        command -v qemu-system-x86_64
    else
        echo ""
    fi
}

is_running() {
    if [ -f "$PID_FILE" ]; then
        local pid
        pid="$(cat "$PID_FILE" 2>/dev/null || true)"
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    # Fallback checando ps por qemu-system-x86_64 com nossa porta
    local alt_pid
    alt_pid="$(pgrep -f "qemu-system-x86_64.*hostfwd=tcp::$HTTP_PORT" | head -n1 || true)"
    if [ -n "$alt_pid" ]; then
        echo "$alt_pid" > "$PID_FILE"
        return 0
    fi
    return 1
}

wait_serial() {
    printf "Aguardando inicializacao do console serial..."
    "$PYTHON_BIN" -c "
import socket, time, sys
try:
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect('$SERIAL_SOCK')
    s.settimeout(1.0)
    start = time.time()
    while time.time() - start < 35:
        s.sendall(b'\n')
        try:
            buf = s.recv(4096).decode('utf-8', errors='ignore')
            if any(k in buf for k in ('root@', 'OpenWrt', 'BusyBox', 'login:', 'Enter to activate', '# ')):
                s.close()
                sys.exit(0)
        except Exception:
            pass
        time.sleep(1.0)
    s.close()
    sys.exit(0)
except Exception:
    sys.exit(1)
" 2>/dev/null && echo " [OK]" || echo " [TIMEOUT]"
}

bootstrap_vm_auth() {
    echo "Configurando credenciais padrao e acesso SSH no Dropbear..."
    "$PYTHON_BIN" - <<EOF 2>/dev/null || true
import socket, time
try:
    s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    s.connect("$SERIAL_SOCK")
    s.settimeout(2.0)
    for _ in range(3):
        s.sendall(b"\n")
        time.sleep(0.3)
    time.sleep(0.5)
    cmds = [
        b"ip route add default via 192.168.1.2 dev br-lan\n",
        b"(echo '$VM_PASS'; sleep 1; echo '$VM_PASS') | passwd root\n",
        b"uci set dropbear.@dropbear[0].RootPasswordAuth='on'\n",
        b"uci set dropbear.@dropbear[0].PasswordAuth='on'\n",
        b"uci commit dropbear\n",
        b"/etc/init.d/dropbear restart\n"
    ]
    for c in cmds:
        s.sendall(c)
        time.sleep(0.4)
    time.sleep(1.0)
    s.close()
except Exception:
    pass
EOF
    printf "Aguardando Dropbear aceitar conexoes SSH..."
    for i in $(seq 1 15); do
        if nc -z 127.0.0.1 "$SSH_PORT" 2>/dev/null; then
            echo " [OK]"
            return 0
        fi
        sleep 1
        printf "."
    done
    echo ""
}

cmd_start() {
    local target_type="${1:-modern}"
    local img_path=""

    case "$target_type" in
        modern|24|24.10)
            img_path="$VM_DIR/OpenWrt-24-Moderno.img"
            target_type="modern (OpenWrt 24)"
            ;;
        legacy|19|19.07)
            img_path="$VM_DIR/OpenWrt-19-Legado.img"
            target_type="legacy (OpenWrt 19)"
            ;;
        *)
            if [ -f "$target_type" ]; then
                img_path="$target_type"
                target_type="custom ($target_type)"
            else
                echo "Erro: Tipo de imagem desconhecido '$target_type'. Use 'modern' ou 'legacy'."
                exit 1
            fi
            ;;
    esac

    if is_running; then
        local pid
        pid="$(cat "$PID_FILE")"
        echo "A VM ARK Router ja esta em execucao (PID: $pid)."
        echo "Portas ativas: LuCI HTTP -> http://localhost:$HTTP_PORT | SSH -> localhost:$SSH_PORT"
        exit 0
    fi

    if [ ! -f "$img_path" ]; then
        echo "Erro: Imagem de disco nao encontrada em:"
        echo "  $img_path"
        echo ""
        echo "Para preparar as imagens homologadas no Mac, execute:"
        echo "  $SCRIPT_DIR/prepare_mac_utm_image.sh"
        exit 1
    fi

    local qemu_bin
    qemu_bin="$(find_qemu)"
    if [ -z "$qemu_bin" ]; then
        echo "Erro: QEMU nao encontrado. Instale via Homebrew:"
        echo "  brew install qemu"
        exit 1
    fi

    rm -f "$SERIAL_SOCK" "$LOG_FILE"
    echo "$target_type" > "$IMG_TYPE_FILE"

    echo "Iniciando VM ARK Router [$target_type] em segundo plano..."
    echo "  Imagem: $img_path"
    echo "  Modo de protecao: -snapshot (alteracoes descartadas ao desligar)"
    echo "  Portas: LuCI http://localhost:$HTTP_PORT | SSH porta $SSH_PORT"

    local vm_pid
    vm_pid="$("$PYTHON_BIN" -c '
import subprocess, sys
p = subprocess.Popen([
    "'"$qemu_bin"'",
    "-m", "512M",
    "-smp", "2",
    "-drive", "file='"$img_path"',format=raw,if=virtio",
    "-snapshot",
    "-display", "none",
    "-netdev", "user,id=net0,net=192.168.1.0/24,dhcpstart=192.168.1.50,host=192.168.1.2,hostfwd=tcp::'"$HTTP_PORT"'-192.168.1.1:80,hostfwd=tcp::'"$SSH_PORT"'-192.168.1.1:22",
    "-device", "virtio-net-pci,netdev=net0",
    "-chardev", "socket,id=char0,path='"$SERIAL_SOCK"',server=on,wait=off",
    "-serial", "chardev:char0"
], stdin=subprocess.DEVNULL, stdout=open("'"$LOG_FILE"'", "w"), stderr=subprocess.STDOUT, start_new_session=True)
with open("'"$PID_FILE"'", "w") as f:
    f.write(str(p.pid))
print(p.pid)
')"
    echo "Processo QEMU desacoplado com sucesso (PID: $vm_pid)."

    wait_serial
    bootstrap_vm_auth

    echo ""
    echo "============================================================"
    echo " VM ARK ROUTER PRONTA PARA TESTES!"
    echo "============================================================"
    echo "  LuCI Web UI : http://localhost:$HTTP_PORT"
    echo "  SSH Dropbear: ssh -p $SSH_PORT root@localhost (senha: $VM_PASS)"
    echo "  Serial CLI  : ./scripts/mac_vm.sh shell"
    echo "  Parar VM    : ./scripts/mac_vm.sh stop"
    echo "============================================================"
}

cmd_stop() {
    if ! is_running; then
        echo "Nenhuma VM ARK Router em execucao."
        rm -f "$PID_FILE" "$SERIAL_SOCK" "$IMG_TYPE_FILE"
        exit 0
    fi

    local pid
    pid="$(cat "$PID_FILE" 2>/dev/null || pgrep -f "qemu-system-x86_64.*hostfwd=tcp::$HTTP_PORT" | head -n1)"
    echo "Encerrando VM ARK Router (PID: $pid)..."

    kill "$pid" 2>/dev/null || true
    local count=0
    while kill -0 "$pid" 2>/dev/null && [ $count -lt 5 ]; do
        sleep 1
        count=$((count + 1))
    done

    if kill -0 "$pid" 2>/dev/null; then
        echo "Forcando encerramento com SIGKILL..."
        kill -9 "$pid" 2>/dev/null || true
    fi

    rm -f "$PID_FILE" "$SERIAL_SOCK" "$IMG_TYPE_FILE"
    echo "VM finalizada com sucesso."
}

cmd_status() {
    if is_running; then
        local pid
        pid="$(cat "$PID_FILE" 2>/dev/null || pgrep -f "qemu-system-x86_64.*hostfwd=tcp::$HTTP_PORT" | head -n1)"
        local itype="desconhecido"
        [ -f "$IMG_TYPE_FILE" ] && itype="$(cat "$IMG_TYPE_FILE")"

        echo "Status: EM EXECUCAO"
        echo "  PID: $pid"
        echo "  Imagem: $itype"
        echo "  Porta LuCI HTTP: $HTTP_PORT"
        echo "  Porta SSH: $SSH_PORT"
        echo "  Socket Serial: $SERIAL_SOCK"

        # Testa portas
        if nc -z 127.0.0.1 "$HTTP_PORT" 2>/dev/null; then
            echo "  Conectividade HTTP: [OK]"
        else
            echo "  Conectividade HTTP: [AGUARDANDO...]"
        fi

        if nc -z 127.0.0.1 "$SSH_PORT" 2>/dev/null; then
            echo "  Conectividade SSH : [OK]"
        else
            echo "  Conectividade SSH : [AGUARDANDO...]"
        fi
    else
        echo "Status: PARADA (Nenhuma VM em execucao)"
    fi
}

cmd_shell() {
    if ! is_running; then
        echo "Erro: A VM nao esta em execucao. Inicie com: ./scripts/mac_vm.sh start"
        exit 1
    fi
    if [ ! -S "$SERIAL_SOCK" ]; then
        echo "Erro: Socket serial $SERIAL_SOCK nao encontrado."
        exit 1
    fi
    echo "Conectando ao console serial da VM (Pressione Ctrl+C para sair)..."
    nc -U "$SERIAL_SOCK"
}

cmd_deploy() {
    if ! is_running; then
        echo "A VM nao esta rodando. Iniciando VM primeiro..."
        cmd_start modern
    fi
    echo "Executando deploy direto do ARK Router na VM..."
    ARK_ROUTER_IP="127.0.0.1" \
    ARK_ROUTER_PORT="$SSH_PORT" \
    ARK_ROUTER_USER="root" \
    ARK_ROUTER_TEST_PASSWORD="$VM_PASS" \
    "$PYTHON_BIN" "$SCRIPT_DIR/deploy_direct.py"
}

cmd_test() {
    if ! is_running; then
        echo "A VM nao esta rodando. Iniciando VM primeiro..."
        cmd_start modern
    fi

    cmd_deploy

    echo ""
    echo "============================================================"
    echo " EXECUTANDO SUITE DE TESTES DENTRO DA VM OPENWRT"
    echo "============================================================"

    "$PYTHON_BIN" - <<EOF
import sys, paramiko
import paramiko.rsakey
from cryptography.hazmat.primitives import hashes
paramiko.rsakey.RSAKey.HASHES["ssh-rsa"] = hashes.SHA1
paramiko.Transport._key_info["ssh-rsa"] = paramiko.RSAKey
paramiko.Transport._preferred_keys = ("ssh-ed25519", "ecdsa-sha2-nistp256", "rsa-sha2-512", "rsa-sha2-256", "ssh-rsa")

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect("127.0.0.1", port=int("$SSH_PORT"), username="root", password="$VM_PASS", timeout=10)

test_script = "$REPO_DIR/tests/lab/run_vm_all_tests.sh"
with open(test_script, "rb") as f:
    data = f.read()

stdin, stdout, stderr = client.exec_command("cat > /tmp/run_vm_all_tests.sh && chmod +x /tmp/run_vm_all_tests.sh")
stdin.write(data)
stdin.flush()
stdin.channel.shutdown_write()
stdout.channel.recv_exit_status()

print("Executando /tmp/run_vm_all_tests.sh...")
stdin, stdout, stderr = client.exec_command("sh /tmp/run_vm_all_tests.sh")
for line in iter(stdout.readline, ""):
    sys.stdout.write(line)
    sys.stdout.flush()

exit_status = stdout.channel.recv_exit_status()
err = stderr.read().decode(errors="replace")
if err:
    print("STDERR:\n", err, file=sys.stderr)

client.close()
sys.exit(exit_status)
EOF
}

case "$1" in
    start)
        shift
        cmd_start "$@"
        ;;
    stop)
        cmd_stop
        ;;
    status)
        cmd_status
        ;;
    shell)
        cmd_shell
        ;;
    deploy)
        cmd_deploy
        ;;
    test)
        cmd_test
        ;;
    *)
        echo "Uso: $0 {start [modern|legacy]|stop|status|shell|deploy|test}"
        exit 1
        ;;
esac
