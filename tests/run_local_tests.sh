#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Limpa metadados do macOS em filesystem ExFAT para evitar artefatos de teste
find "$REPO_DIR" -name "._*" -delete 2>/dev/null || true

GREEN='\033[1;32m'
RED='\033[1;31m'
CYAN='\033[1;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

printf "${CYAN}============================================================${NC}\n"
printf "${CYAN}        ARK ROUTER: BATERIA DE TESTES LOCAIS (SEM ROTEADOR) ${NC}\n"
printf "${CYAN}============================================================${NC}\n\n"

NODE_CMD="node"
if ! command -v node >/dev/null 2>&1; then
	if command -v node.exe >/dev/null 2>&1; then
		NODE_CMD="node.exe"
	elif [ -x "/mnt/c/Program Files/nodejs/node.exe" ]; then
		NODE_CMD="/mnt/c/Program Files/nodejs/node.exe"
	fi
fi

PYTHON_CMD="python3"
if ! "$PYTHON_CMD" -c "import sys" >/dev/null 2>&1; then
	if command -v python >/dev/null 2>&1 && python -c "import sys" >/dev/null 2>&1; then
		PYTHON_CMD="python"
	elif command -v py >/dev/null 2>&1 && py -c "import sys" >/dev/null 2>&1; then
		PYTHON_CMD="py"
	fi
fi

# 1. Validação de Sintaxe Shell e Auditoria Preventiva Anti-Colisão
printf "${YELLOW}[1/5] Verificando sintaxe BusyBox ash e colisões entre módulos (.sh)...${NC}\n"
"$PYTHON_CMD" "$REPO_DIR/scripts/audit_shell_scripts.py"
printf "${GREEN}✓ Scripts shell e módulos 100%% íntegros e sem colisões!${NC}\n\n"

check_node_syntax() {
	local f="$1"
	[ -f "$f" ] || return 0
	"$PYTHON_CMD" -c "import subprocess, sys, os; p = sys.argv[1]; p = (p[5].upper() + ':/' + p[7:]) if (p.startswith('/mnt/') and len(p) > 6 and p[6] == '/') else p; res = subprocess.run(['$NODE_CMD', '--check', p], capture_output=True, text=True); sys.stdout.write(res.stdout); sys.stderr.write(res.stderr); sys.exit(res.returncode)" "$f"
}

# 2. Validação de Sintaxe Frontend (Node.js)
printf "${YELLOW}[2/5] Verificando integridade do JavaScript (node --check)...${NC}\n"
for js_file in "$REPO_DIR"/src/core/*.js "$REPO_DIR"/src/modules/*.js; do
	[ -f "$js_file" ] || continue
	check_node_syntax "$js_file"
done
check_node_syntax "$REPO_DIR/root/www/luci-static/resources/view/equipe-dashboard/overview.js"
check_node_syntax "$REPO_DIR/root/www/luci-static/ark/ark-theme.js"
"$PYTHON_CMD" "$REPO_DIR/scripts/build_frontend_bundle.py" --check
printf "${GREEN}✓ Código JavaScript e sincronia do bundle válidos!${NC}\n\n"

# 3. Execução da Matriz de Testes Unitários e Integração (Python)
printf "${YELLOW}[3/5] Executando matriz de testes de WAN, SQM, MTU, ARK Doctor e Cenários Lite vs Full...${NC}\n"
"$PYTHON_CMD" "$SCRIPT_DIR/test_wan_matrix.py"
"$PYTHON_CMD" "$SCRIPT_DIR/test_lite_vs_full_scenarios.py"
printf "${GREEN}✓ Todos os testes unitários e de cenários passaram com sucesso!${NC}\n\n"

# 4. Auditoria de Contratos Funcionais, Preservação de Estado, Não-Interferência e i18n
printf "${YELLOW}[4/5] Verificando contratos, preservação de estado, i18n e não-interferência...${NC}\n"
"$PYTHON_CMD" "$SCRIPT_DIR/verify_feature_contracts.py"
"$PYTHON_CMD" "$SCRIPT_DIR/lab/test_interference_matrix.py"
"$PYTHON_CMD" "$REPO_DIR/scripts/audit_state_preservation.py" --strict
"$PYTHON_CMD" "$REPO_DIR/scripts/audit_i18n.py"
printf "${GREEN}✓ Contratos funcionais, cobertura i18n, preservação de estado e co-existência aprovados!${NC}\n\n"

# 5. Auditoria de Minificação
printf "${YELLOW}[5/5] Testando pipeline de minificação...${NC}\n"
"$PYTHON_CMD" "$REPO_DIR/scripts/build_minified_assets.py" >/dev/null
check_node_syntax "$REPO_DIR/dist/minified/www/luci-static/resources/view/equipe-dashboard/overview.js"
printf "${GREEN}✓ Assets minificados e validados com sucesso!${NC}\n\n"

printf "${GREEN}============================================================${NC}\n"
printf "${GREEN}  PARABÉNS: 100%% DOS TESTES LOCAIS PASSARAM COM SUCESSO!     ${NC}\n"
printf "${GREEN}  O código está seguro e pronto para compilação/deploy.      ${NC}\n"
printf "${GREEN}============================================================${NC}\n"
