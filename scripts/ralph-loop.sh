#!/bin/sh
# ARK Router — Ralph Loop Seguro (Ciclo Controlado de Correção e Verificação)
# Executa iterações limitadas em 1 módulo por vez, com checkpoint e rollback
# cirúrgico via Git (sem reset global, sem push e sem deploy físico).
set -eu

RL_SCRIPT_DIR=$(CDPATH='' cd -- "$(dirname -- "$0")" && pwd)
RL_REPO_DIR=$(CDPATH='' cd -- "$RL_SCRIPT_DIR/.." && pwd)
RL_AUDIT_FILE="$RL_REPO_DIR/docs/AUDIT_REPORT.md"

if [ -x "/Users/user/.antigravity-tools-env/bin/python3" ]; then
	RL_PYTHON="/Users/user/.antigravity-tools-env/bin/python3"
elif command -v python3 >/dev/null 2>&1; then
	RL_PYTHON=$(command -v python3)
else
	echo "ERRO: python3 não encontrado no ambiente." >&2
	exit 127
fi

RL_MODE="loop"
RL_AUDIT_ID=""
RL_TARGET=""
RL_TARGET_REL=""
RL_TARGET_ABS=""
RL_CMD=""
RL_MAX_ITERS=3
RL_VERIFY_MODE="quick"
RL_TMPDIR=""
RL_LOG_FILE=""

rl_usage() {
	cat <<'EOF'
Uso: scripts/ralph-loop.sh [opções]

Modos principais:
  --list                     Lista os achados (AUD-NNN) em docs/AUDIT_REPORT.md e sai
  --check-only               Executa somente a verificação (sem exigir tree limpo nem alterar arquivos)
  --dry-run                  Valida parâmetros, escopo e trava Git e exibe o plano sem executar
  --target <caminho>         Caminho relativo ao repo do módulo único em foco
  --cmd <comando>            Comando de correção executado a cada iteração (via sh -c)

Opções adicionais:
  --audit-id <AUD-NNN>       ID do achado em docs/AUDIT_REPORT.md (ex.: AUD-004)
  --max-iters <1..10>        Máximo de iterações (padrão: 3, teto: 10)
  --verify <quick|full>      Modo de verificação: quick (padrão) ou full (run_local_tests.sh)
  -h, --help                 Exibe esta ajuda

Variáveis exportadas para --cmd:
  ARK_RALPH_REPO, ARK_RALPH_TARGET, ARK_RALPH_AUDIT_ID, ARK_RALPH_ITER
EOF
}

# Invoked via trap EXIT INT TERM
# shellcheck disable=SC2329
rl_cleanup() {
	if [ -n "$RL_TMPDIR" ] && [ -d "$RL_TMPDIR" ]; then
		rm -rf -- "$RL_TMPDIR"
	fi
}
trap rl_cleanup EXIT INT TERM

rl_log() {
	rl_msg="$1"
	printf '%s\n' "$rl_msg"
	if [ -n "$RL_LOG_FILE" ]; then
		printf '%s\n' "$rl_msg" >> "$RL_LOG_FILE"
	fi
}

rl_list_audits() {
	if [ ! -f "$RL_AUDIT_FILE" ]; then
		echo "ERRO: $RL_AUDIT_FILE não encontrado." >&2
		exit 1
	fi
	"$RL_PYTHON" - "$RL_AUDIT_FILE" <<'PY'
import re, sys
path = sys.argv[1]
txt = open(path, "r", encoding="utf-8").read()
matches = re.findall(r"^###\s+(AUD-\d+)\s+—\s+(.+)$", txt, re.MULTILINE)
if not matches:
    print("Nenhum achado AUD-NNN encontrado.")
    sys.exit(1)
for aid, title in matches:
    print(f"{aid}: {title}")
PY
}

rl_show_audit_section() {
	rl_id="$1"
	if [ ! -f "$RL_AUDIT_FILE" ]; then
		echo "ERRO: $RL_AUDIT_FILE não encontrado." >&2
		exit 1
	fi
	"$RL_PYTHON" - "$RL_AUDIT_FILE" "$rl_id" <<'PY'
import re, sys
path, aid = sys.argv[1], sys.argv[2]
txt = open(path, "r", encoding="utf-8").read()
pat = re.compile(rf"(^###\s+{re.escape(aid)}\b.*?)(?=^###\s+AUD-\d+|\n##\s+|\Z)", re.MULTILINE | re.DOTALL)
m = pat.search(txt)
if not m:
    print(f"ERRO: ID '{aid}' não encontrado em {path}.", file=sys.stderr)
    sys.exit(2)
print(m.group(1).strip())
PY
}

rl_resolve_target() {
	rl_raw="$1"
	"$RL_PYTHON" - "$RL_REPO_DIR" "$rl_raw" <<'PY'
import os, sys
repo = os.path.realpath(sys.argv[1])
raw = sys.argv[2]
cand = raw if os.path.isabs(raw) else os.path.join(repo, raw)
real = os.path.realpath(cand)
if real == repo or not real.startswith(repo + os.sep):
    print("ERRO: --target fora do repositório.", file=sys.stderr)
    sys.exit(2)
rel = os.path.relpath(real, repo).replace("\\", "/")
blocked = (".git/", "Offline/", "Backups/", "dist/", "Router Backups/", "Clean Test Backups/", "Factory Reset Backups/")
if rel == ".git" or any(rel.startswith(b) for b in blocked):
    print(f"ERRO: --target aponta para caminho protegido: {rel}", file=sys.stderr)
    sys.exit(2)
if not os.path.isfile(real):
    print(f"ERRO: arquivo --target não encontrado: {rel}", file=sys.stderr)
    sys.exit(2)
print(rel)
PY
}

rl_is_shell_file() {
	rl_f="$1"
	case "$rl_f" in
		*.sh|*.qos) return 0 ;;
		*.js|*.css|*.py|*.md|*.yml|*.yaml|*.json|*.ut|*.htm|*.lua|*.po|*.mjs|*.cjs) return 1 ;;
	esac
	rl_first=$(head -n 1 "$rl_f" 2>/dev/null || true)
	case "$rl_first" in
		"#!/"*"sh"*) return 0 ;;
	esac
	return 1
}

rl_run_verify() {
	rl_rc=0
	rl_log "[verify] Modo: $RL_VERIFY_MODE"

	if [ "$RL_VERIFY_MODE" = "full" ]; then
		if "$RL_REPO_DIR/tests/run_local_tests.sh" >> "$RL_LOG_FILE" 2>&1; then
			rl_log "[verify] tests/run_local_tests.sh: OK"
		else
			rl_log "[verify] FALHA: tests/run_local_tests.sh (ver $RL_LOG_FILE)"
			rl_rc=1
		fi
		if [ -n "$RL_TARGET_ABS" ] && rl_is_shell_file "$RL_TARGET_ABS"; then
			if command -v shellcheck >/dev/null 2>&1; then
				if shellcheck -s sh -S error "$RL_TARGET_ABS" >> "$RL_LOG_FILE" 2>&1; then
					rl_log "[verify] shellcheck -s sh -S error ($RL_TARGET_REL): OK"
				else
					rl_log "[verify] FALHA: shellcheck encontrou erros em $RL_TARGET_REL"
					rl_rc=1
				fi
			fi
		fi
		return "$rl_rc"
	fi

	# Modo quick
	if "$RL_PYTHON" "$RL_REPO_DIR/scripts/audit_shell_scripts.py" >> "$RL_LOG_FILE" 2>&1; then
		rl_log "[verify] audit_shell_scripts.py: OK"
	else
		rl_log "[verify] FALHA: audit_shell_scripts.py"
		rl_rc=1
	fi

	if "$RL_PYTHON" "$RL_REPO_DIR/scripts/audit_state_preservation.py" --strict >> "$RL_LOG_FILE" 2>&1; then
		rl_log "[verify] audit_state_preservation.py --strict: OK"
	else
		rl_log "[verify] FALHA: audit_state_preservation.py --strict"
		rl_rc=1
	fi

	if "$RL_PYTHON" "$RL_REPO_DIR/scripts/audit_docs.py" --strict >> "$RL_LOG_FILE" 2>&1; then
		rl_log "[verify] audit_docs.py --strict: OK"
	else
		rl_log "[verify] FALHA: audit_docs.py --strict"
		rl_rc=1
	fi

	if [ -n "$RL_TARGET_ABS" ]; then
		if rl_is_shell_file "$RL_TARGET_ABS"; then
			if sh -n "$RL_TARGET_ABS" >> "$RL_LOG_FILE" 2>&1; then
				rl_log "[verify] sh -n ($RL_TARGET_REL): OK"
			else
				rl_log "[verify] FALHA: sh -n em $RL_TARGET_REL"
				rl_rc=1
			fi
			if command -v shellcheck >/dev/null 2>&1; then
				if shellcheck -s sh -S error "$RL_TARGET_ABS" >> "$RL_LOG_FILE" 2>&1; then
					rl_log "[verify] shellcheck -s sh -S error ($RL_TARGET_REL): OK"
				else
					rl_log "[verify] FALHA: shellcheck encontrou erros em $RL_TARGET_REL"
					rl_rc=1
				fi
			fi
		else
			case "$RL_TARGET_REL" in
				*.js|*.mjs|*.cjs)
					if command -v node >/dev/null 2>&1; then
						if node --check "$RL_TARGET_ABS" >> "$RL_LOG_FILE" 2>&1; then
							rl_log "[verify] node --check ($RL_TARGET_REL): OK"
						else
							rl_log "[verify] FALHA: node --check em $RL_TARGET_REL"
							rl_rc=1
						fi
					fi
					if "$RL_PYTHON" "$RL_REPO_DIR/scripts/build_frontend_bundle.py" --check >> "$RL_LOG_FILE" 2>&1; then
						rl_log "[verify] build_frontend_bundle.py --check: OK"
					else
						rl_log "[verify] FALHA: build_frontend_bundle.py --check"
						rl_rc=1
					fi
					;;
			esac
		fi
	fi

	return "$rl_rc"
}

rl_is_allowed_change() {
	rl_changed="$1"
	if [ "$rl_changed" = "$RL_TARGET_REL" ]; then
		return 0
	fi
	case "$RL_TARGET_REL" in
		src/*)
			case "$rl_changed" in
				root/www/luci-static/resources/view/equipe-dashboard/overview.js) return 0 ;;
				root/www/luci-static/resources/view/equipe-dashboard/i18n.*.js) return 0 ;;
			esac
			;;
	esac
	return 1
}

rl_check_scope() {
	rl_scope_bad=0
	while IFS= read -r rl_p; do
		[ -n "$rl_p" ] || continue
		if ! rl_is_allowed_change "$rl_p"; then
			rl_log "[scope] BLOQUEADO: arquivo fora do escopo modificado: $rl_p"
			rl_scope_bad=1
		fi
	done <<EOF
$(git -C "$RL_REPO_DIR" diff --name-only HEAD)
$(git -C "$RL_REPO_DIR" ls-files --others --exclude-standard)
EOF
	return "$rl_scope_bad"
}

rl_surgical_rollback() {
	rl_log "[rollback] Restaurando alterações desta iteração de forma cirúrgica..."
	while IFS= read -r rl_u; do
		[ -n "$rl_u" ] || continue
		if [ -f "$RL_REPO_DIR/$rl_u" ]; then
			rm -f -- "$RL_REPO_DIR/$rl_u"
			rl_log "[rollback] Removido untracked criado na iteração: $rl_u"
		fi
	done <<EOF
$(git -C "$RL_REPO_DIR" ls-files --others --exclude-standard)
EOF

	while IFS= read -r rl_t; do
		[ -n "$rl_t" ] || continue
		if git -C "$RL_REPO_DIR" cat-file -e "HEAD:$rl_t" 2>/dev/null; then
			git -C "$RL_REPO_DIR" checkout HEAD -- "$rl_t"
			rl_log "[rollback] Restaurado via HEAD: $rl_t"
		else
			git -C "$RL_REPO_DIR" reset -q HEAD -- "$rl_t" 2>/dev/null || true
			rm -f -- "$RL_REPO_DIR/$rl_t"
			rl_log "[rollback] Removido arquivo novo em stage: $rl_t"
		fi
	done <<EOF
$(git -C "$RL_REPO_DIR" diff --name-only HEAD)
EOF

	if [ -n "$RL_TMPDIR" ] && [ -f "$RL_TMPDIR/target.bak" ] && [ -n "$RL_TARGET_ABS" ]; then
		if ! cmp -s "$RL_TMPDIR/target.bak" "$RL_TARGET_ABS" 2>/dev/null; then
			cp -f "$RL_TMPDIR/target.bak" "$RL_TARGET_ABS"
			rl_log "[rollback] Snapshot local do alvo restaurado: $RL_TARGET_REL"
		fi
	fi
}

while [ "$#" -gt 0 ]; do
	case "$1" in
		--list)
			RL_MODE="list"
			shift
			;;
		--check-only)
			RL_MODE="check-only"
			shift
			;;
		--dry-run)
			RL_MODE="dry-run"
			shift
			;;
		--audit-id)
			[ "$#" -ge 2 ] || { echo "ERRO: --audit-id requer argumento." >&2; exit 2; }
			RL_AUDIT_ID="$2"
			shift 2
			;;
		--target)
			[ "$#" -ge 2 ] || { echo "ERRO: --target requer argumento." >&2; exit 2; }
			RL_TARGET="$2"
			shift 2
			;;
		--cmd)
			[ "$#" -ge 2 ] || { echo "ERRO: --cmd requer argumento." >&2; exit 2; }
			RL_CMD="$2"
			shift 2
			;;
		--max-iters)
			[ "$#" -ge 2 ] || { echo "ERRO: --max-iters requer argumento." >&2; exit 2; }
			RL_MAX_ITERS="$2"
			shift 2
			;;
		--verify)
			[ "$#" -ge 2 ] || { echo "ERRO: --verify requer argumento." >&2; exit 2; }
			RL_VERIFY_MODE="$2"
			shift 2
			;;
		-h|--help)
			rl_usage
			exit 0
			;;
		*)
			echo "ERRO: opção desconhecida: $1" >&2
			rl_usage >&2
			exit 2
			;;
	esac
done

if [ "$RL_MODE" = "list" ]; then
	rl_list_audits
	exit 0
fi

case "$RL_VERIFY_MODE" in
	quick|full) ;;
	*)
		echo "ERRO: --verify deve ser 'quick' ou 'full' (recebido: $RL_VERIFY_MODE)." >&2
		exit 2
		;;
esac

case "$RL_MAX_ITERS" in
	''|*[!0-9]*)
		echo "ERRO: --max-iters deve ser inteiro entre 1 e 10." >&2
		exit 2
		;;
esac
if [ "$RL_MAX_ITERS" -lt 1 ] || [ "$RL_MAX_ITERS" -gt 10 ]; then
	echo "ERRO: --max-iters fora do limite seguro (1..10): $RL_MAX_ITERS" >&2
	exit 2
fi

if [ -n "$RL_AUDIT_ID" ]; then
	case "$RL_AUDIT_ID" in
		AUD-[0-9][0-9][0-9]*) ;;
		*)
			echo "ERRO: --audit-id inválido (esperado AUD-NNN): $RL_AUDIT_ID" >&2
			exit 2
			;;
	esac
	rl_show_audit_section "$RL_AUDIT_ID"
fi

if [ "$RL_MODE" != "check-only" ] && [ -z "$RL_TARGET" ]; then
	echo "ERRO: --target é obrigatório para os modos loop e --dry-run." >&2
	exit 2
fi

if [ -n "$RL_TARGET" ]; then
	RL_TARGET_REL=$(rl_resolve_target "$RL_TARGET")
	RL_TARGET_ABS="$RL_REPO_DIR/$RL_TARGET_REL"
fi

RL_LOG_FILE="/tmp/ark-ralph-loop-$(date +%Y%m%d-%H%M%S)-$$.log"
: > "$RL_LOG_FILE"

if [ "$RL_MODE" = "check-only" ]; then
	rl_log "[ralph-loop] Check-only no repositório: $RL_REPO_DIR"
	[ -n "$RL_TARGET_REL" ] && rl_log "[ralph-loop] Alvo focal: $RL_TARGET_REL"
	if rl_run_verify; then
		rl_log "[ralph-loop] Check-only APROVADO. Log: $RL_LOG_FILE"
		exit 0
	else
		rl_log "[ralph-loop] Check-only REPROVADO. Log: $RL_LOG_FILE"
		exit 1
	fi
fi

if [ "$RL_MODE" = "dry-run" ]; then
	rl_dirty=$(git -C "$RL_REPO_DIR" status --porcelain)
	rl_log "=== RALPH LOOP DRY-RUN ==="
	rl_log "Repositório : $RL_REPO_DIR"
	rl_log "Alvo        : $RL_TARGET_REL"
	rl_log "Audit ID    : ${RL_AUDIT_ID:-N/A}"
	rl_log "Max Iters   : $RL_MAX_ITERS"
	rl_log "Verify Mode : $RL_VERIFY_MODE"
	rl_log "Comando     : ${RL_CMD:-<não informado>}"
	rl_log "Log         : $RL_LOG_FILE"
	if [ -n "$rl_dirty" ]; then
		rl_log "Trava Git   : WORKING TREE SUJO (execução real bloquearia com exit 2)"
	else
		rl_log "Trava Git   : WORKING TREE LIMPO (pronto para execução)"
	fi
	exit 0
fi

# Modo loop real: exigir working tree limpo e --cmd informado
rl_dirty=$(git -C "$RL_REPO_DIR" status --porcelain)
if [ -n "$rl_dirty" ]; then
	echo "ERRO [trava de segurança]: working tree com alterações não commitadas em $RL_REPO_DIR." >&2
	echo "Faça commit, git stash ou crie um git worktree dedicado antes de rodar o Ralph Loop." >&2
	exit 2
fi

if [ -z "$RL_CMD" ]; then
	echo "ERRO: --cmd <comando> é obrigatório no modo de correção." >&2
	exit 2
fi

RL_TMPDIR=$(mktemp -d /tmp/ark-ralph-ckpt.XXXXXX)
rl_iter=1
while [ "$rl_iter" -le "$RL_MAX_ITERS" ]; do
	rl_log "=== Iteração $rl_iter/$RL_MAX_ITERS | Alvo: $RL_TARGET_REL | ID: ${RL_AUDIT_ID:-N/A} ==="
	cp -f "$RL_TARGET_ABS" "$RL_TMPDIR/target.bak"

	ARK_RALPH_REPO="$RL_REPO_DIR"
	ARK_RALPH_TARGET="$RL_TARGET_REL"
	ARK_RALPH_AUDIT_ID="$RL_AUDIT_ID"
	ARK_RALPH_ITER="$rl_iter"
	export ARK_RALPH_REPO ARK_RALPH_TARGET ARK_RALPH_AUDIT_ID ARK_RALPH_ITER

	if sh -c "$RL_CMD" >> "$RL_LOG_FILE" 2>&1; then
		rl_log "[cmd] Comando concluído (exit 0)."
	else
		rl_log "[cmd] Comando falhou; executando rollback cirúrgico."
		rl_surgical_rollback
		rl_iter=$((rl_iter + 1))
		continue
	fi

	if ! rl_check_scope; then
		rl_log "[scope] Violação de escopo detectada; executando rollback cirúrgico."
		rl_surgical_rollback
		rl_iter=$((rl_iter + 1))
		continue
	fi

	if rl_run_verify; then
		rl_log "=== CONVERGÊNCIA ATINGIDA na iteração $rl_iter! ==="
		git -C "$RL_REPO_DIR" status -sb
		rl_log "Log completo: $RL_LOG_FILE"
		exit 0
	fi

	rl_log "[verify] Iteração $rl_iter reprovada; executando rollback cirúrgico."
	rl_surgical_rollback
	rl_iter=$((rl_iter + 1))
done

rl_log "FALHA: limite máximo de $RL_MAX_ITERS iterações atingido sem convergência. Working tree preservado limpo."
rl_log "Log completo: $RL_LOG_FILE"
exit 1
