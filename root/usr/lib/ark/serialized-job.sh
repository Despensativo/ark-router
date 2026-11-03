#!/bin/sh
# Uma execução por recurso; eventos concorrentes pedem uma reaplicação final.
ark_serialized_job() {
	local job="$1" worker="$2" owner rc=0
	shift 2
	mkdir "$job.pending" 2>/dev/null || true
	if ! mkdir "$job.lock" 2>/dev/null; then
		owner=''
		read -r owner 2>/dev/null < "$job.lock/pid" || true
		case "$owner" in ''|*[!0-9]*) return 75 ;; esac
		if kill -0 "$owner" 2>/dev/null; then return 75; fi
		# SIGKILL pode deixar comandos filhos em execução: não roubar a trava.
		# Falha fechada até limpeza supervisionada ou reboot (/tmp é volátil).
		printf '%s\n' "ARK: trava órfã em $job.lock; verificar processos antes de limpar" >&2
		return 1
	fi
	printf '%s\n' "$$" > "$job.lock/pid"
	ARK_SERIAL_JOB_OWNER_PATH="$job"
	trap 'rm -f "$ARK_SERIAL_JOB_OWNER_PATH.lock/pid"; rmdir "$ARK_SERIAL_JOB_OWNER_PATH.lock" 2>/dev/null; [ "${ARK_MUTATION_LOCK_HELD:-0}" = "1" ] && command -v ark_release_mutation_lock >/dev/null 2>&1 && ark_release_mutation_lock' EXIT
	trap 'exit 1' HUP INT TERM
	while :; do
		rmdir "$job.pending" 2>/dev/null || true
		"$worker" "$@" || { rc=$?; break; }
		[ -d "$job.pending" ] || break
	done
	rm -f "$job.lock/pid"
	rmdir "$job.lock" 2>/dev/null || true
	if command -v ark_restore_mutation_trap >/dev/null 2>&1; then
		ark_restore_mutation_trap
	else
		trap - EXIT HUP INT TERM
	fi
	unset ARK_SERIAL_JOB_OWNER_PATH
	# Fecha a janela entre a última checagem e a liberação da trava.
	if [ "$rc" = 0 ] && [ -d "$job.pending" ]; then
		ark_serialized_job "$job" "$worker" "$@"
		return $?
	fi
	return "$rc"
}
