#!/usr/bin/env python3
"""
generate_code_map.py — Gerador Determinístico do Mapa de Código e Execução (AI & Dev Index)

Extrai automaticamente do código-fonte:
1. Fast-Path, Locks e Tabela de Roteamento do Dispatcher (/usr/sbin/equipe-dashboard-control)
2. Matriz Ponta-a-Ponta: Método JS (src/modules/*.js:linha) -> Comando RPC -> Branch Shell (modules/*.sh:linha)
3. Índice Cirúrgico de Funções Backend (root/usr/lib/ark/**/*.sh com StartLine-EndLine)
4. Índice Cirúrgico de Métodos Frontend (src/core/*.js e src/modules/*.js com StartLine-EndLine)
5. Mapa de Daemons, Init Scripts e Hotplugs (Ordem de Execução no OpenWrt)

Uso:
  python3 scripts/generate_code_map.py           # Gera/atualiza docs/CODE_MAP.md
  python3 scripts/generate_code_map.py --check   # Verifica se docs/CODE_MAP.md está atualizado
"""

import fnmatch
import os
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_PATH = REPO_ROOT / "docs" / "CODE_MAP.md"


def parse_shell_functions():
    """Retorna lista de funções por arquivo em root/usr/lib/ark/."""
    ark_lib = REPO_ROOT / "root" / "usr" / "lib" / "ark"
    func_start_re = re.compile(r"^([a-zA-Z0-9_]+)\s*\(\)\s*\{")
    func_end_re = re.compile(r"^\}\s*(?:#.*)?$")
    result = {}

    for root, _, files in sorted(os.walk(ark_lib)):
        for f in sorted(files):
            if not f.endswith(".sh") or f.startswith("._"):
                continue
            full_path = Path(root) / f
            rel_path = full_path.relative_to(REPO_ROOT).as_posix()
            lines = full_path.read_text(encoding="utf-8", errors="ignore").splitlines()
            funcs = []
            cur_fn = None
            cur_start = 0
            for idx, line in enumerate(lines, 1):
                if cur_fn is None:
                    m = func_start_re.match(line)
                    if m:
                        cur_fn = m.group(1)
                        cur_start = idx
                        code_only = re.sub(r"#.*$", "", line).rstrip()
                        if code_only.endswith("}"):
                            funcs.append((cur_fn, cur_start, idx))
                            cur_fn = None
                else:
                    if func_end_re.match(line):
                        funcs.append((cur_fn, cur_start, idx))
                        cur_fn = None
            result[rel_path] = (len(lines), funcs)
    return result


def parse_handle_branches():
    """Mapeia padrões de comandos dentro de handle_*() em root/usr/lib/ark/modules/*.sh."""
    mod_dir = REPO_ROOT / "root" / "usr" / "lib" / "ark" / "modules"
    branches = []
    for f in sorted(os.listdir(mod_dir)):
        if not f.endswith(".sh") or f.startswith("._"):
            continue
        full_path = mod_dir / f
        rel_path = full_path.relative_to(REPO_ROOT).as_posix()
        lines = full_path.read_text(encoding="utf-8", errors="ignore").splitlines()
        in_handle = None
        for idx, line in enumerate(lines, 1):
            m_h = re.match(r"^(handle_[a-z0-9_]+)\s*\(\)\s*\{", line)
            if m_h:
                in_handle = m_h.group(1)
                continue
            if in_handle:
                if re.match(r"^\}\s*$", line):
                    in_handle = None
                    continue
                s = line.strip()
                if re.match(r"^[a-z0-9_|*-]+\)", s):
                    pat_part = s.split(")")[0]
                    for p in pat_part.split("|"):
                        p = p.strip()
                        if p and p != "*":
                            branches.append((p, rel_path, in_handle, idx))
    return branches


def parse_js_modules():
    """Retorna métodos e chamadas RPC de src/modules/*.js."""
    mod_dir = REPO_ROOT / "src" / "modules"
    method_re = re.compile(r"^(\t|    )([a-zA-Z0-9_]+)\s*:\s*(?:async\s+)?function\s*\(")
    rpc_re = re.compile(
        r"fs\.exec(?:_direct)?\(\s*['\"]/usr/sbin/equipe-dashboard-control['\"]\s*,\s*\[\s*['\"]([a-z0-9_-]+)['\"]"
    )
    js_files = {}
    rpc_calls = []

    for f in sorted(os.listdir(mod_dir)):
        if not f.endswith(".js") or f.startswith("._"):
            continue
        full_path = mod_dir / f
        rel_path = full_path.relative_to(REPO_ROOT).as_posix()
        lines = full_path.read_text(encoding="utf-8", errors="ignore").splitlines()
        methods = []
        cur_method = None
        cur_start = 0

        for idx, line in enumerate(lines, 1):
            m = method_re.match(line)
            if m:
                if cur_method is not None:
                    methods.append((cur_method, cur_start, idx - 1))
                cur_method = m.group(2)
                cur_start = idx
            for rm in rpc_re.finditer(line):
                rpc_calls.append((rm.group(1), rel_path, cur_method or "<top>", idx))

        if cur_method is not None:
            methods.append((cur_method, cur_start, len(lines)))
        js_files[rel_path] = (len(lines), methods)

    return js_files, rpc_calls


def is_readonly_cmd(cmd):
    if cmd in {
        "doctor-run",
        "doctor-status",
        "doctor-log",
        "update-wan-led",
        "update-led-alert",
        "features",
        "fast-targets",
        "speedtest-result",
        "starlink-telemetry",
        "autowan-can-convert",
        "autowan-can-convert-wan",
        "speedify-user",
    }:
        return True
    readonly_globs = [
        "*-status",
        "*-status-*",
        "*-get",
        "*-list",
        "*-check",
        "*-check-*",
        "*-audit",
        "*-info",
        "*-discover",
        "*-fingerprints",
        "*-stations",
        "*-processes",
        "*-logs",
        "*-log",
        "*-telemetry",
        "*-qr",
    ]
    return any(fnmatch.fnmatch(cmd, g) for g in readonly_globs)


def build_markdown():
    sh_funcs = parse_shell_functions()
    handle_branches = parse_handle_branches()
    js_files, rpc_calls = parse_js_modules()

    out = []
    out.append("# ARK Router — Mapa Determinístico de Código e Execução (`CODE_MAP.md`)")
    out.append("")
    out.append("> **Guia Rápido para IAs e Desenvolvedores (Anti-Amnésia & Token-Efficient)**:")
    out.append("> - **NUNCA** leia arquivos grandes (`common.sh`, `render.js`, `system.js`, `wifi.js`, `doctor.sh`) inteiros.")
    out.append("> - Use as tabelas abaixo para localizar o **arquivo e intervalo exato de linhas (`StartLine`–`EndLine`)** antes de chamar `view_file`.")
    out.append("> - Este documento é gerado deterministicamente por `python3 scripts/generate_code_map.py`.")
    out.append("")
    out.append("---")
    out.append("")
    out.append("## 1. Arquitetura de Execução, Fast-Path e Locks (`/usr/sbin/equipe-dashboard-control`)")
    out.append("")
    out.append("| Camada | Mecanismo | Arquivos / Caches | Comportamento Exato |")
    out.append("| :--- | :--- | :--- | :--- |")
    out.append("| **0. Coalescência Hotplug** | Non-blocking Early Exit | `ark-doctor.lockdir/pid`, `ark_mutation.lock/pid` | Chamadas `ark-doctor --auto` abortam em `0ms` no topo de `equipe-dashboard-control` se já houver auditoria ou mutação viva (`kill -0`), evitando fila serial de hotplugs. |")
    out.append("| **1. Fast-Path (Sem Source)** | Resposta direta em RAM | `ark-fp-cache` (120s), `ark-stations-cache` (120s), `ark-perf-cache` (120s), `ark-hw-cache` (120s), `ark-mwan-cache` (3s), `ark-doctor-last.json` | Responde `device-fingerprints`, `device-stations`, `wifi-stations`, `system-perf-status`, `system-hardware-info`, `mwan-status-fast` e `doctor-status` **antes** de carregar `common.sh` (~10.000 linhas poupadas). |")
    out.append("| **2. Lock Global de Mutação** | `ark_acquire_mutation_lock` | `/tmp/ark_mutation.lock` (`pid`, `ts`, `cmd`) | Adquirido apenas quando `ark_is_readonly_action` retorna `1`. Leituras (`*-status`, `*-info`, etc.) e LEDs (`update-wan-led`, `update-led-alert`) passam livres sem bloqueio. |")
    out.append("| **3. Job Serializado** | `ark_serialized_job` | `root/usr/lib/ark/serialized-job.sh` | Garante execução única por recurso com reagendamento `.pending` automático se novo evento chegar durante a execução (código `75` para contendores). |")
    out.append("")
    out.append("---")
    out.append("")
    out.append("## 2. Matriz Ponta-a-Ponta: Frontend (`src/modules/*.js`) $\\rightarrow$ RPC $\\rightarrow$ Backend (`modules/*.sh`)")
    out.append("")
    out.append("| Comando RPC (`equipe-dashboard-control`) | Tipo / Lock | Handler Backend (`arquivo:linha`) | Chamadores Frontend (`arquivo:linha [método]`) |")
    out.append("| :--- | :--- | :--- | :--- |")

    # Agrupar chamadas RPC por comando
    cmd_to_callers = {}
    for cmd, js_rel, mname, line_no in rpc_calls:
        cmd_to_callers.setdefault(cmd, []).append(f"`{js_rel}:{line_no}` (`{mname}`)")

    for cmd in sorted(cmd_to_callers.keys()):
        matched_handlers = []
        for pat, sh_rel, h_fn, h_line in handle_branches:
            if fnmatch.fnmatch(cmd, pat):
                matched_handlers.append(f"`{sh_rel}:{h_line}` (`{h_fn}`)")
                break
        handler_str = matched_handlers[0] if matched_handlers else "*(via glob dispatcher)*"
        lock_str = "🟢 Read-Only" if is_readonly_cmd(cmd) else "🔒 Mutação (`ark_mutation.lock`)"
        callers_str = "<br>".join(cmd_to_callers[cmd][:6])
        if len(cmd_to_callers[cmd]) > 6:
            callers_str += f"<br>*(+{len(cmd_to_callers[cmd]) - 6} chamadas)*"
        out.append(f"| `{cmd}` | {lock_str} | {handler_str} | {callers_str} |")

    out.append("")
    out.append("---")
    out.append("")
    out.append("## 3. Índice Cirúrgico de Funções Backend (`root/usr/lib/ark/**/*.sh`)")
    out.append("")

    for rel_path, (total_lines, funcs) in sorted(sh_funcs.items()):
        out.append(f"### `{rel_path}` ({total_lines} linhas, {len(funcs)} funções)")
        out.append("")
        out.append("| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |")
        out.append("| :--- | :--- | :--- |")
        for fn_name, start, end in funcs:
            out.append(f"| `{fn_name}()` | `{start}–{end}` | {end - start + 1}L |")
        out.append("")

    out.append("---")
    out.append("")
    out.append("## 4. Índice Cirúrgico de Métodos Frontend (`src/modules/*.js`)")
    out.append("")

    for rel_path, (total_lines, methods) in sorted(js_files.items()):
        out.append(f"### `{rel_path}` ({total_lines} linhas, {len(methods)} métodos)")
        out.append("")
        out.append("| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |")
        out.append("| :--- | :--- | :--- |")
        for mname, start, end in methods:
            out.append(f"| `this.{mname}()` | `{start}–{end}` | {end - start + 1}L |")
        out.append("")

    out.append("---")
    out.append("")
    out.append("## 5. Mapa de Daemons, Init Scripts (`procd`) e Hotplugs (`root/etc/hotplug.d/`)")
    out.append("")
    out.append("| Categoria | Caminho no Repositório | Papel Operacional |")
    out.append("| :--- | :--- | :--- |")

    runtime_items = [
        ("Dispatcher", "root/usr/sbin/equipe-dashboard-control", "Controlador unificado CLI/RPC com Fast-Path de cache e lock de mutação"),
        ("Wrapper CLI", "root/usr/sbin/ark-doctor", "Atalho CLI para `equipe-dashboard-control ark-doctor`"),
        ("Daemon", "root/usr/sbin/ark-autowan-daemon", "Monitoramento contínuo de portas físicas e conversão automática WAN/LAN"),
        ("Daemon", "root/usr/sbin/ark-port-ledd", "Sincronização em tempo real dos LEDs físicos de portas de rede"),
        ("Daemon", "root/usr/sbin/ark-rainbowd", "Motor de efeitos RGB e animações de LEDs (GPIO / I2C AW21018)"),
        ("Daemon", "root/usr/sbin/ark-web-watchdog", "Watchdog de disponibilidade do servidor web uhttpd/rpcd"),
        ("Daemon", "root/usr/sbin/equipe-traffic-history", "Coletor leve de histórico de tráfego em `/tmp/equipe-traffic-history.csv`"),
        ("Daemon", "root/usr/sbin/starlink-telemetry-daemon", "Coletor gRPC de telemetria da antena Starlink"),
        ("Hotplug (`iface`)", "root/etc/hotplug.d/iface/05-ark-pppoe-babyjumbo", "Sondagem e ajuste automático de MTU 1508 (RFC 4638 Baby Jumbo) no PPPoE"),
        ("Hotplug (`iface`)", "root/etc/hotplug.d/iface/15-ark-ipv6-hygiene", "Expurgo de prefixos IPv6 órfãos e sincronia de rotas CLAT a cada `ifup`/`ifupdate`"),
        ("Hotplug (`iface`)", "root/etc/hotplug.d/iface/30-wireguard-wan", "Ressincronização de endpoint e MTU do WireGuard em transições WAN"),
        ("Hotplug (`iface`)", "root/etc/hotplug.d/iface/95-ark-cache-invalidate", "Invalidação de caches `/tmp/ark-*-cache.ts` e reload seguro de DoH"),
        ("Hotplug (`iface`)", "root/etc/hotplug.d/iface/98-ark-hardware-tune", "Reaplicação de sintonia de hardware em eventos `ifup` de interfaces físicas"),
        ("Hotplug (`iface`)", "root/etc/hotplug.d/iface/99-ark-doctor", "Auditoria e autocura silenciosa (`ark-doctor --auto`) pós-conexão"),
        ("Hotplug (`iface`)", "root/etc/hotplug.d/iface/99-ark-led-wan", "Atualização dinâmica do LED de Internet/WAN em `ifup`/`ifdown`"),
        ("Hotplug (`net`)", "root/etc/hotplug.d/net/90-ark-rps-tune", "Atribuição multicore de máscaras RPS e limites GRO/GSO para interfaces recém-criadas"),
        ("Hotplug (`net`)", "root/etc/hotplug.d/net/95-ark-cache-invalidate", "Invalidação de caches em eventos físicos de link de rede"),
        ("Hotplug (`net`)", "root/etc/hotplug.d/net/98-ark-mlo-bridge", "Vinculação automática de interfaces MLD (Wi-Fi 7 MLO) à `br-lan`"),
        ("Hotplug (`net`)", "root/etc/hotplug.d/net/99-ark-doctor", "Autocura `ark-doctor --auto` ao recriar interfaces de rádio Wi-Fi ou bridge"),
        ("Hotplug (`net`)", "root/etc/hotplug.d/net/99-ark-led-wan", "Atualização imediata de LED WAN em eventos de cabo físico (ignora interfaces virtuais/Wi-Fi)"),
        ("Hotplug (`firewall`)", "root/etc/hotplug.d/firewall/99-ark-doctor", "Revalidação de conflitos Flow Offloading vs SQM após reload do firewall"),
    ]
    for cat, path_str, desc in runtime_items:
        out.append(f"| **{cat}** | `{path_str}` | {desc} |")

    out.append("")
    return "\n".join(out) + "\n"


def main():
    check_only = "--check" in sys.argv
    content = build_markdown()

    if check_only:
        if not OUTPUT_PATH.exists():
            print("ERRO: docs/CODE_MAP.md não existe. Execute: python3 scripts/generate_code_map.py", file=sys.stderr)
            return 1
        current = OUTPUT_PATH.read_text(encoding="utf-8")
        if current != content:
            print("ERRO: docs/CODE_MAP.md está desatualizado em relação ao código! Execute: python3 scripts/generate_code_map.py", file=sys.stderr)
            return 1
        print("✓ docs/CODE_MAP.md está 100% sincronizado com o código-fonte.")
        return 0

    OUTPUT_PATH.write_text(content, encoding="utf-8")
    print(f"✓ Gerado {OUTPUT_PATH.relative_to(REPO_ROOT)} ({len(content.splitlines())} linhas).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
