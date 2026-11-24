#!/bin/sh
# ==============================================================================
# ARK Router — Revisor Contínuo 100% Offline (Fase 4 / PC Offline)
# ==============================================================================
# Executa revisão determinística de segurança, regressões, POSIX shell, JS,
# orçamento de tema (< 60 KiB gzip) e governança Spec-Driven sem internet nem
# APIs externas. Projetado para rodar manualmente e via .githooks/.
#
# Uso:
#   sh scripts/offline-review.sh --staged            # Hook pre-commit (rápido)
#   sh scripts/offline-review.sh --working           # Alterações no working tree
#   sh scripts/offline-review.sh --range A..B        # Revisão de intervalo Git
#   sh scripts/offline-review.sh --full              # Auditoria offline completa (pre-push)
#   sh scripts/offline-review.sh --full --with-tests # Auditoria + testes Wave 1-3 e offline
# ==============================================================================
set -eu

SCRIPT_DIR="$(CDPATH='' cd -- "$(dirname "$0")" && pwd)"
REPO_DIR="$(CDPATH='' cd -- "$SCRIPT_DIR/.." && pwd)"

MODE="working"
RANGE_SPEC=""
RUN_FULL=0
RUN_TESTS=0
FAILS=0
WARNS=0
PASSES=0

usage() {
	cat <<'EOF'
ARK Router — Offline Continuous Review (100% local, sem API/rede)

Uso:
  sh scripts/offline-review.sh [--staged | --working | --range <A..B>] [--full] [--with-tests]

Opções:
  --staged        Audita arquivos e diff em stage (padrão do hook pre-commit)
  --working       Audita arquivos modificados no working tree (padrão)
  --range <A..B>  Audita commits no intervalo Git (ex.: origin/main..HEAD)
  --full          Executa também a suíte determinística offline completa
  --with-tests    Executa testes de regressão offline (waves + offline-review)
  --help, -h      Exibe esta ajuda
EOF
}

while [ $# -gt 0 ]; do
	case "$1" in
		--staged)
			MODE="staged"
			shift
			;;
		--working)
			MODE="working"
			shift
			;;
		--range)
			[ $# -ge 2 ] || { printf '[FAIL] --range requer argumento <A..B>\n' >&2; exit 2; }
			MODE="range"
			RANGE_SPEC="$2"
			shift 2
			;;
		--full)
			RUN_FULL=1
			shift
			;;
		--with-tests)
			RUN_TESTS=1
			shift
			;;
		--help|-h)
			usage
			exit 0
			;;
		*)
			printf '[FAIL] Opção desconhecida: %s\n' "$1" >&2
			usage >&2
			exit 2
			;;
	esac
done

pass() {
	PASSES=$((PASSES + 1))
	printf '  [PASS] %s\n' "$1"
}

warn() {
	WARNS=$((WARNS + 1))
	printf '  [WARN] %s\n' "$1"
}

fail() {
	FAILS=$((FAILS + 1))
	printf '  [FAIL] %s\n' "$1" >&2
}

pick_python() {
	if [ -n "${ARK_PYTHON_CMD:-}" ] && [ -x "$ARK_PYTHON_CMD" ]; then
		printf '%s\n' "$ARK_PYTHON_CMD"
		return 0
	fi
	if [ -x "/Users/user/.antigravity-tools-env/bin/python3" ]; then
		printf '%s\n' "/Users/user/.antigravity-tools-env/bin/python3"
		return 0
	fi
	if command -v python3 >/dev/null 2>&1; then
		command -v python3
		return 0
	fi
	printf '\n'
}

PYTHON_BIN="$(pick_python)"

is_shell_target() {
	_target="$1"
	case "$_target" in
		*.sh|*.qos|.githooks/pre-commit|.githooks/pre-push)
			return 0
			;;
		*.js|*.css|*.py|*.md|*.json|*.yml|*.yaml|*.ut|*.htm|*.lua|*.html|*.png|*.svg|*.nft|*.po|*.apk|*.ipk)
			return 1
			;;
	esac
	if [ -f "$REPO_DIR/$_target" ]; then
		_first="$(head -n 1 "$REPO_DIR/$_target" 2>/dev/null || true)"
		case "$_first" in
			'#!/bin/sh'*|'#!/usr/bin/env sh'*|'#!/bin/ash'*)
				return 0
				;;
		esac
	fi
	return 1
}

get_changed_files() {
	case "$MODE" in
		staged)
			git -C "$REPO_DIR" diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true
			;;
		range)
			git -C "$REPO_DIR" diff --name-only --diff-filter=ACMR "$RANGE_SPEC" 2>/dev/null || true
			;;
		working)
			git -C "$REPO_DIR" diff --name-only --diff-filter=ACMR 2>/dev/null || true
			;;
	esac
}

get_added_lines_for_file() {
	_f="$1"
	case "$MODE" in
		staged)
			git -C "$REPO_DIR" diff --cached -U0 -- "$_f" 2>/dev/null | grep -E '^\+[^+]' || true
			;;
		range)
			git -C "$REPO_DIR" diff -U0 "$RANGE_SPEC" -- "$_f" 2>/dev/null | grep -E '^\+[^+]' || true
			;;
		working)
			git -C "$REPO_DIR" diff -U0 -- "$_f" 2>/dev/null | grep -E '^\+[^+]' || true
			;;
	esac
}

printf '============================================================\n'
printf ' ARK ROUTER — REVISAO CONTINUA OFFLINE (%s)\n' "$MODE"
printf '============================================================\n'

TMP_LIST="$(mktemp "${TMPDIR:-/tmp}/ark_offline_files.XXXXXX")"
trap 'rm -f "$TMP_LIST"' EXIT INT TERM HUP
get_changed_files > "$TMP_LIST"

FILE_COUNT="$(wc -l < "$TMP_LIST" | tr -d ' ')"
printf 'Arquivos analisados no diff: %s\n' "$FILE_COUNT"

TOUCHED_SRC_JS=0
TOUCHED_OVERVIEW_JS=0
TOUCHED_THEME=0
TOUCHED_SHELL=0
TOUCHED_JS=0

if [ "$FILE_COUNT" -gt 0 ]; then
	while IFS= read -r rel; do
		[ -n "$rel" ] || continue
		abs="$REPO_DIR/$rel"

		# 1. Arquivos proibidos no repositório/pacote
		case "$rel" in
			*/._*|._*|*/.DS_Store|.DS_Store|*.env|.env.*|*.key)
				fail "Arquivo proibido/sensível no diff: $rel"
				;;
			*overview_v2.js|*overview_v2.css)
				fail "Artefato obsoleto overview_v2 detectado (AUD-010): $rel"
				;;
		esac

		# Rastreio de categorias para checks cruzados
		case "$rel" in
			src/*.js) TOUCHED_SRC_JS=1 ;;
			root/www/luci-static/resources/view/equipe-dashboard/overview.js) TOUCHED_OVERVIEW_JS=1 ;;
			root/www/luci-static/ark/ark-theme.js|root/www/luci-static/ark/cascade.css|root/www/luci-static/ark/mobile.css) TOUCHED_THEME=1 ;;
		esac

		# 2. Varredura de segredos e padrões perigosos nas linhas adicionadas
		added="$(get_added_lines_for_file "$rel")"
		skip_pattern_scan=0
		case "$rel" in
			tests/*|scripts/offline-review.sh|docs/AUDIT_REPORT.md|docs/archive/*)
				skip_pattern_scan=1
				;;
		esac

		if [ -n "$added" ] && [ "$skip_pattern_scan" -eq 0 ]; then
			if printf '%s\n' "$added" | grep -Eq 'BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY|AIza[0-9A-Za-z_-]{35}|ghp_[0-9A-Za-z]{36}|sk-[A-Za-z0-9]{20,}|re_[A-Za-z0-9_]{24,}'; then
				fail "Possível chave privada ou token/API secret adicionado em $rel"
			fi
			if printf '%s\n' "$added" | grep -Eq 'ARK_ROUTER_TEST_PASSWORD=[A-Za-z0-9_@#%+=.-]+'; then
				fail "Possível senha literal ARK_ROUTER_TEST_PASSWORD em $rel"
			fi
			if printf '%s\n' "$added" | grep -q 'arkmeshkey123'; then
				fail "Chave hardcoded 'arkmeshkey123' proibida (AUD-001) em $rel"
			fi
		fi

		# 3. Validação Shell POSIX + guardrails OpenWrt
		if [ -f "$abs" ] && is_shell_target "$rel"; then
			TOUCHED_SHELL=$((TOUCHED_SHELL + 1))
			if ! sh -n "$abs" 2>/dev/null; then
				fail "Erro de sintaxe sh -n em $rel"
			fi
			if command -v dash >/dev/null 2>&1; then
				if ! dash -n "$abs" 2>/dev/null; then
					fail "Erro de sintaxe dash -n em $rel"
				fi
			fi
			if command -v shellcheck >/dev/null 2>&1; then
				if ! shellcheck -s sh -S error "$abs" >/dev/null 2>&1; then
					fail "ShellCheck (-s sh -S error) falhou em $rel"
				fi
			fi
			if [ -n "$added" ] && [ "$skip_pattern_scan" -eq 0 ]; then
				if printf '%s\n' "$added" | grep -Eq '[$]RANDOM\b'; then
					fail "Bashismo \$RANDOM proibido em POSIX ash (AUD-006): $rel"
				fi
				if printf '%s\n' "$added" | grep -q 'jool -i ark_nat64 instance status >/dev/null'; then
					fail "Uso inseguro de 'jool instance status' sem filtrar Running ([AL-ARK-014]): $rel"
				fi
				case "$rel" in
					root/usr/lib/ark/common.sh|root/usr/libexec/ark-starlink-telemetry|root/usr/sbin/starlink-telemetry-mailer) ;;
					root/*)
						if printf '%s\n' "$added" | grep -Eq -- '--no-check-certificate|\bcurl\b[^|;]*[[:space:]]-[A-Za-z]*k([[:space:]]|$)'; then
							fail "Bypass TLS direto proibido fora dos wrappers ark_*_tls (AUD-003): $rel"
						fi
						;;
				esac
			fi
		fi

		# 4. Validação JS + proibição de prompt()/alert()/confirm()
		case "$rel" in
			*.js|*.mjs|*.cjs)
				if [ -f "$abs" ]; then
					TOUCHED_JS=$((TOUCHED_JS + 1))
					if command -v node >/dev/null 2>&1; then
						if ! node --check "$abs" >/dev/null 2>&1; then
							fail "Erro de sintaxe JS (node --check) em $rel"
						fi
					fi
					case "$rel" in
						src/*|root/www/luci-static/ark/*)
							if [ -n "$added" ] && printf '%s\n' "$added" | grep -Eq '(^|[^A-Za-z0-9_$.])(prompt|alert|confirm)[[:space:]]*\('; then
								fail "Uso de dialog síncrono prompt/alert/confirm proibido (AUD-007): $rel"
							fi
							;;
					esac
				fi
				;;
		esac

		# 5. Proibição de JS duplicado nos templates footer.ut / footer.htm
		case "$rel" in
			root/usr/share/ucode/luci/template/themes/ark/footer.ut|root/usr/lib/lua/luci/view/themes/ark/footer.htm)
				if [ -f "$abs" ] && grep -Eq 'autoExpandActiveMenu|addEventListener.*keydown' "$abs"; then
					fail "Lógica JS duplicada no footer (deve ficar em ark-theme.js, AUD-011): $rel"
				fi
				;;
		esac

		# 6. Aviso Spec-Driven para arquivos grandes (>= 300 linhas) ou módulos compartilhados
		if [ -f "$abs" ]; then
			case "$rel" in
				*.sh|*.js|*.css)
					lines="$(wc -l < "$abs" | tr -d ' ')"
					if [ "${lines:-0}" -ge 300 ]; then
						warn "Módulo >= 300 linhas alterado ($rel: $lines linhas) — confirmar mini-plano de impacto Spec-Driven"
					fi
					;;
			esac
		fi
	done < "$TMP_LIST"

	# 7. Coerência src/ <-> overview.js
	if [ "$TOUCHED_SRC_JS" -eq 1 ] && [ "$TOUCHED_OVERVIEW_JS" -eq 0 ]; then
		if [ -n "$PYTHON_BIN" ] && [ -f "$REPO_DIR/scripts/build_frontend_bundle.py" ]; then
			if ! "$PYTHON_BIN" "$REPO_DIR/scripts/build_frontend_bundle.py" --check >/dev/null 2>&1; then
				fail "src/ foi alterado sem regenerar overview.js (execute scripts/build_frontend_bundle.py)"
			fi
		fi
	fi

	# 8. Orçamento do tema (< 60 KiB gzip) se tema foi alterado
	if [ "$TOUCHED_THEME" -eq 1 ] && [ -n "$PYTHON_BIN" ]; then
		if ! "$PYTHON_BIN" - "$REPO_DIR" <<'PY'
import gzip, pathlib, sys
repo = pathlib.Path(sys.argv[1])
min_dir = repo / "dist" / "minified" / "www" / "luci-static" / "ark"
src_dir = repo / "root" / "www" / "luci-static" / "ark"
names = ("ark-theme.js", "cascade.css", "mobile.css")
if all((min_dir / n).is_file() for n in names):
    gz = sum(len(gzip.compress((min_dir / n).read_bytes(), compresslevel=6)) for n in names)
    limit = 60 * 1024
    if gz >= limit:
        print(f"Theme minified gzip {gz} B >= {limit} B", file=sys.stderr)
        sys.exit(1)
else:
    gz = sum(len(gzip.compress((src_dir / n).read_bytes(), compresslevel=6)) for n in names)
    if gz >= 65536:
        print(f"Theme raw gzip {gz} B >= 65536 B (run build_minified_assets.py)", file=sys.stderr)
        sys.exit(1)
PY
		then
			fail "Orçamento gzip do núcleo do tema excedeu < 60 KiB (AUD-011)"
		else
			pass "Orçamento gzip do núcleo do tema dentro do limite (< 60 KiB)"
		fi
	fi

	if [ "$FAILS" -eq 0 ]; then
		pass "Verificações de diff aprovadas ($FILE_COUNT arquivo(s), $TOUCHED_SHELL shell, $TOUCHED_JS JS)"
	fi
else
	pass "Nenhum arquivo alterado no escopo '$MODE'"
fi

# 9. Modo completo offline (--full): suíte determinística sem rede
if [ "$RUN_FULL" -eq 1 ]; then
	printf '\n--- Auditoria Determinística Offline Completa ---\n'
	if [ -z "$PYTHON_BIN" ]; then
		fail "Python 3 não encontrado para auditorias completas"
	else
		run_step() {
			_label="$1"
			shift
			if "$@" >/dev/null 2>&1; then
				pass "$_label"
			else
				fail "$_label (comando: $*)"
			fi
		}
		run_step "build_frontend_bundle.py --check" "$PYTHON_BIN" "$REPO_DIR/scripts/build_frontend_bundle.py" --check
		run_step "audit_shell_scripts.py" "$PYTHON_BIN" "$REPO_DIR/scripts/audit_shell_scripts.py"
		run_step "audit_state_preservation.py --strict" "$PYTHON_BIN" "$REPO_DIR/scripts/audit_state_preservation.py" --strict
		run_step "audit_i18n.py --strict" "$PYTHON_BIN" "$REPO_DIR/scripts/audit_i18n.py" --strict
		run_step "audit_docs.py --strict" "$PYTHON_BIN" "$REPO_DIR/scripts/audit_docs.py" --strict
		run_step "generate_code_map.py --check" "$PYTHON_BIN" "$REPO_DIR/scripts/generate_code_map.py" --check
		run_step "verify_feature_contracts.py" "$PYTHON_BIN" "$REPO_DIR/tests/verify_feature_contracts.py"
		if command -v shellcheck >/dev/null 2>&1; then
			run_step "shellcheck -s sh scripts/ralph-loop.sh & offline-review.sh & .githooks" \
				shellcheck -s sh "$REPO_DIR/scripts/ralph-loop.sh" "$REPO_DIR/scripts/offline-review.sh" \
				"$REPO_DIR/.githooks/pre-commit" "$REPO_DIR/.githooks/pre-push"
		fi
	fi
fi

# 10. Testes unitários focais offline (--with-tests)
if [ "$RUN_TESTS" -eq 1 ]; then
	printf '\n--- Testes de Regressão Offline ---\n'
	if [ -z "$PYTHON_BIN" ]; then
		fail "Python 3 não encontrado para executar testes"
	else
		for t in test_audit_wave1_wave2.py test_audit_wave3.py test_offline_review.py; do
			if [ -f "$REPO_DIR/tests/$t" ]; then
				if "$PYTHON_BIN" "$REPO_DIR/tests/$t" >/dev/null 2>&1; then
					pass "tests/$t"
				else
					fail "tests/$t"
				fi
			fi
		done
	fi
fi

printf '============================================================\n'
printf ' Resumo Offline Review: PASS=%d | WARN=%d | FAIL=%d\n' "$PASSES" "$WARNS" "$FAILS"
printf '============================================================\n'

[ "$FAILS" -eq 0 ]
