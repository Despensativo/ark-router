#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[1;32m'
RED='\033[1;31m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

printf "${CYAN}============================================================${NC}\n"
printf "${CYAN}        ARK ROUTER: BATERIA DE TESTES LOCAIS (SEM ROTEADOR) ${NC}\n"
printf "${CYAN}============================================================${NC}\n\n"

# 1. Validação de Sintaxe Shell
printf "${YELLOW}[1/4] Verificando sintaxe BusyBox ash...${NC}\n"
sh -n "$REPO_DIR/root/usr/sbin/equipe-dashboard-control"
sh -n "$REPO_DIR/root/usr/sbin/ark-doctor"
printf "${GREEN}✓ Sintaxe de scripts 100%% limpa!${NC}\n\n"

NODE_CMD="node"
if ! command -v node >/dev/null 2>&1; then
	if command -v node.exe >/dev/null 2>&1; then
		NODE_CMD="node.exe"
	elif [ -x "/mnt/c/Program Files/nodejs/node.exe" ]; then
		NODE_CMD="/mnt/c/Program Files/nodejs/node.exe"
	fi
fi

check_node_syntax() {
	local f="$1"
	if [ "$NODE_CMD" != "node" ]; then
		f="$(wslpath -w "$f")"
	fi
	"$NODE_CMD" --check "$f"
}

# 2. Validação de Sintaxe Frontend (Node.js)
printf "${YELLOW}[2/4] Verificando integridade do JavaScript (node --check)...${NC}\n"
check_node_syntax "$REPO_DIR/root/www/luci-static/resources/view/equipe-dashboard/overview.js"
check_node_syntax "$REPO_DIR/root/www/luci-static/ark/ark-theme.js"
printf "${GREEN}✓ Código JavaScript válido e sem erros de sintaxe!${NC}\n\n"

# 3. Execução da Matriz de Testes Unitários e Integração (Python)
printf "${YELLOW}[3/4] Executando matriz de testes de WAN, SQM, MTU e ARK Doctor...${NC}\n"
python3 "$SCRIPT_DIR/test_wan_matrix.py"
printf "${GREEN}✓ Todos os testes unitários passaram com sucesso!${NC}\n\n"

# 4. Auditoria de Minificação
printf "${YELLOW}[4/4] Testando pipeline de minificação...${NC}\n"
if command -v cmd.exe >/dev/null 2>&1; then
	(cd "$REPO_DIR" && cmd.exe /c "python scripts/build_minified_assets.py" >/dev/null)
else
	python3 "$REPO_DIR/scripts/build_minified_assets.py" >/dev/null
fi
check_node_syntax "$REPO_DIR/dist/minified/www/luci-static/resources/view/equipe-dashboard/overview.js"
printf "${GREEN}✓ Assets minificados e validados com sucesso!${NC}\n\n"

printf "${GREEN}============================================================${NC}\n"
printf "${GREEN}  PARABÉNS: 100%% DOS TESTES LOCAIS PASSARAM COM SUCESSO!     ${NC}\n"
printf "${GREEN}  O código está seguro e pronto para compilação/deploy.      ${NC}\n"
printf "${GREEN}============================================================${NC}\n"
