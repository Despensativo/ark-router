---
name: posix-shell
description: Enforce strict POSIX compliance and BusyBox ash compatibility for OpenWrt scripts. Forbids bashisms, ensures safe variable quoting, efficient resource usage, and clean UCI interactions.
---

# POSIX Shell & BusyBox Ash Guidelines (ARK Router)

## Objetivo
Garantir que todo script de shell desenvolvido para o ARK Router execute de forma confiável e leve sob o BusyBox `ash` (`/bin/sh`), sem dependências do GNU Bash e com consumo mínimo de recursos (RAM e Flash).

---

## Regras Fundamentais (Invioláveis)

### 1. Zero Bash-ismos (Strict POSIX)
- **Shebang Obrigatório:** `#!/bin/sh` (nunca `#!/bin/bash`).
- ❌ **Proibido `[[ ... ]]`**: Use sempre `[ ... ]` ou `test`.
  - Correto: `[ -n "$var" ] && [ "$var" = "val" ]`
  - Incorreto: `[[ -n $var && $var == "val" ]]`
- ❌ **Proibido arrays**: `arr=(a b c)` não existe no POSIX ash. Use listas separadas por espaço ou processe com `set --`.
- ❌ **Proibido substituições não-POSIX**:
  - Incorreto: `${var//foo/bar}`, `${var^^}`.
  - Correto: Use `sed`, `awk`, ou `cut` de forma enxuta.
- ❌ **Proibido `function foo()`**: No POSIX, a sintaxe de função é apenas `foo() { ... }`.
- ❌ **Proibido `read -a` ou `read -p`**: Use `printf "Prompt: " && read -r line`.

### 2. Tratamento Seguro de Variáveis e Aspas
- **Sempre citar variáveis de expansão:** `"$var"` para evitar quebras por espaços ou expansão de glob.
- Citar caminhos do UCI:
  ```sh
  ip=$(uci -q get "network.lan.ipaddr")
  ```
- Tratar saídas de comandos e verificar códigos de retorno:
  ```sh
  if ! output=$(some_command); then
      logger -t ark-router "Erro ao executar some_command"
      return 1
  fi
  ```

### 3. Eficiência em Sistemas Embarcados (128 MB / 256 MB RAM)
- Evite criar subshells desnecessários `$(...)` dentro de loops intensivos.
- Prefira comandos internos do BusyBox (built-ins) como `case ... esac`, `test`, `echo`, `printf`.
- Evite tubulações excessivas (`cat file | grep foo | awk ...`). Use comandos compostos ou leia linha a linha com `while read -r line; do ... done < file`.

### 4. Boas Práticas com o UCI
- Use a flag `-q` (quiet) quando o valor puder não existir: `uci -q get "system.@system[0].hostname"`.
- Sempre realize `uci commit` apenas ao final de um lote de alterações para poupar escritas na Flash SPI.
- Reinicie serviços de rede ou firewall de forma condicional, nunca incondicionalmente em loops.
