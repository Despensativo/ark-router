# ARK Router — Diretrizes de Segurança & Shell POSIX

Regras mandatórias para evitar vulnerabilidades, injection de comandos e bloqueios acidentais no OpenWrt.

---

## 1. Regras Estritas de Shell POSIX BusyBox Ash
- Todo script deve executar sob `/bin/sh` puro (BusyBox ash).
- **PROIBIDO usar Bashismos**:
  - ❌ Não usar `[[ ... ]]` (use `[ ... ]`).
  - ❌ Não usar arrays `${arr[@]}` ou `${arr[0]}`.
  - ❌ Não usar substituição de string `${var//old/new}`.
  - ❌ Não usar `type -p` (use `command -v` ou `which`).
  - ❌ Cuidado com `exec cmd "$@"` sem checar `$# -gt 0` no Busybox ash.
- **Manipulação UCI**:
  - Sempre aspas nos caminhos: `uci get "network.lan.ipaddr"`.
  - Commits devem ser atômicos: `uci commit network`.
  - Recarregue serviços com checagem condicional de estado.

---

## 2. Prevenção de Command Injection & Validação de Entrada
- Sanitizar rigorosamente todo argumento recebido via HTTP, LuCI ou RPC antes de passar para comandos shell.
- NUNCA concatenar entradas de usuário diretamente em chamadas `eval` ou subshells sem validação contra regex (`[a-zA-Z0-9_.-]+`).
- Ações críticas de frontend usam tokens efêmeros com expiração de 30 segundos salvos em `/tmp/`.
