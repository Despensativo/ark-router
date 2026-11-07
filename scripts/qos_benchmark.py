#!/usr/bin/env python3
"""Coletor de QoS no cliente: somente leitura no roteador, sem dependências Python.

monitor coleta CPU/filas/sondas; mark delimita testes UI; quick usa networkQuality;
report cruza as janelas. Nunca muda SQM, firewall, taxas ou offload.
"""
import argparse
import hashlib
import ipaddress
import json
import math
import os
from pathlib import Path
import re
import shlex
import signal
import socket
import subprocess
import threading
import time
import uuid


def write_json(path, value):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)


def append_json(path, value):
    with path.open('a') as stream:
        stream.write(json.dumps(value, ensure_ascii=False) + '\n')


def read_rows(path):
    text = path.read_text()
    lines = text.splitlines()
    if text and not text.endswith('\n'):
        lines = lines[:-1]  # Coleta pode estar escrevendo a última linha.
    return [json.loads(line) for line in lines if line.strip()]


def safe_name(value):
    if not re.fullmatch(r'[A-Za-z0-9_.-]{1,80}', value):
        raise argparse.ArgumentTypeError('Use letras, números, ponto, hífen ou sublinhado.')
    return value


def tc_json(text):
    # Defeito conhecido do tc deste firmware HFSC: {default 3 } não é JSON.
    text = re.sub(r'"options":\{default ([0-9a-fA-Fx]+)\s*\}',
                  r'"options":{"default":"\1"}', text)
    return json.loads(text)


def percentile(values, fraction):
    if not values:
        return None
    values = sorted(values)
    return round(values[math.ceil((len(values) - 1) * fraction)], 3)


def probe_summary(rows):
    received = sorted({r['seq']: r for r in rows if 'rtt_ms' in r}.values(),
                      key=lambda r: r['seq'])
    values = [r['rtt_ms'] for r in received]
    gaps = [{'after_epoch': b['time'], 'missing': b['seq'] - a['seq'] - 1}
            for a, b in zip(received, received[1:]) if b['seq'] > a['seq'] + 1]
    return {'responses': len(received), 'failed_tcp_attempts': sum(bool(r.get('timeout_or_error')) for r in rows),
            'internal_sequence_holes': sum(g['missing'] for g in gaps),
            'p50_ms': percentile(values, .5), 'p95_ms': percentile(values, .95),
            'max_ms': max(values, default=None), 'gaps': gaps}


class Collector:
    def __init__(self, args):
        self.args, self.out = args, args.out
        self.stop = threading.Event()
        self.procs, self.threads, self.errors = [], [], []
        self.token = 'ark_qos_benchmark_' + uuid.uuid4().hex
        self.tcp_address = None
        self.pidfile = '/tmp/' + self.token + '.pid'
        self.ssh = ['ssh', '-o', 'BatchMode=yes', '-o', 'ForwardAgent=no',
                    '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=8',
                    '-o', 'ServerAliveInterval=10', '-o', 'ServerAliveCountMax=2',
                    '-o', 'UserKnownHostsFile=' + str(args.known_hosts),
                    '-p', str(args.port), 'root@' + args.router]

    def remote(self, command):
        result = subprocess.run(self.ssh + [command], text=True, capture_output=True, timeout=25)
        if result.returncode:
            raise RuntimeError('Consulta SSH falhou; saída remota omitida.')
        return result.stdout

    def snapshot(self):
        board = json.loads(self.remote('ubus call system board'))
        if self.args.expected_board and board.get('board_name') != self.args.expected_board:
            raise RuntimeError('Alvo diferente do board esperado.')
        queues = {d: tc_json(self.remote('tc -j -s qdisc show dev ' + shlex.quote(d)))
                  for d in (self.args.wan, self.args.ifb)}
        return {'time': time.time(), 'model': board.get('model'), 'board': board.get('board_name'),
                'boot_id': self.remote('cat /proc/sys/kernel/random/boot_id').strip(),
                'openwrt': board.get('release', {}).get('version'), 'kernel': board.get('kernel'),
                'config_hashes': self.remote('sha256sum /etc/config/*'),
                'nft_stateless_hash': self.remote('. /usr/lib/ark/common.sh; if is_fw4; then nft -s list ruleset | sha256sum; elif is_fw3; then printf "fw3: ruleset hash not collected\\n"; fi'),
                'qdiscs': queues,
                'route_interface': self.args.interface,
                'cpu_sample_interval_seconds': self.args.interval,
                'tcp_probe_host': self.args.tcp_host,
                'tcp_probe_family': 'IPv4; DNS resolvido uma vez antes da coleta',
                'collector_sha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                'engine_setting': self.remote('uci -q get equipe_dashboard.settings.sqm_engine || true').strip()}

    def launch(self, function, *args):
        def guarded():
            try:
                function(*args)
            except Exception as error:
                self.errors.append(type(error).__name__ + ': ' + str(error))
                self.stop.set()
        thread = threading.Thread(target=guarded, daemon=True)
        self.threads.append(thread)
        thread.start()

    def probe(self, name, host):
        # macOS -W é em milissegundos; Linux é em segundos.
        wait = '1000' if __import__('sys').platform == 'darwin' else '1'
        process = subprocess.Popen(['ping', '-n', '-i', '1', '-W', wait, host],
                                   stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                   text=True, bufsize=1)
        self.procs.append(process)
        for line in process.stdout:
            seq = re.search(r'(?:icmp_)?seq[= ](\d+)', line)
            rtt = re.search(r'time[=<]([0-9.]+)', line)
            if seq and rtt:
                append_json(self.out / (name + '.jsonl'),
                            {'time': time.time(), 'seq': int(seq[1]), 'rtt_ms': float(rtt[1])})
            if self.stop.is_set():
                break

    def tcp_probe(self):
        index = 0
        while not self.stop.is_set():
            index += 1
            start = time.time()
            row = {'time': start, 'seq': index}
            try:
                with socket.create_connection((self.tcp_address, 443), timeout=3):
                    row['rtt_ms'] = round((time.time() - start) * 1000, 3)
            except OSError as error:
                row['timeout_or_error'] = True
                row['error_type'] = type(error).__name__
            append_json(self.out / 'tcp-external.jsonl', row)
            self.stop.wait(max(0, 1 - (time.time() - start)))

    def telemetry(self):
        a = self.args
        script = '''trap 'rm -f "$pidfile"; exit 0' EXIT HUP INT TERM
echo $$ > "$pidfile"
i=0
while [ "$i" -lt "$samples" ]; do
 printf 'TIME '; date +%s
 read up rest < /proc/uptime; printf 'UPTIME %s\n' "$up"
 awk '/^cpu[0-9]+ /' /proc/stat
 awk '/MemAvailable:/' /proc/meminfo
 printf 'SOFTNET '; awk '{printf "%s %s;", $2, $3} END {print ""}' /proc/net/softnet_stat
 printf 'UL '; tc -j -s qdisc show dev "$wan"
 printf 'DL '; tc -j -s qdisc show dev "$ifb"
 for dev in eth0 eth1; do
  printf 'PHYSICAL %s ' "$dev"
  for key in rx_errors tx_errors rx_dropped tx_dropped carrier_changes; do
   file="/sys/class/net/$dev/statistics/$key"
   [ "$key" != carrier_changes ] || file="/sys/class/net/$dev/carrier_changes"
   [ ! -r "$file" ] || { read value < "$file"; printf '%s=%s ' "$key" "$value"; }
  done
  printf '\\n'
 done
 i=$((i+1)); sleep "$interval"
done
'''
        prelude = '\n'.join(k + '=' + shlex.quote(str(v)) for k, v in {
            'pidfile': self.pidfile, 'samples': math.ceil(a.duration / a.interval),
            'wan': a.wan, 'ifb': a.ifb, 'interval': a.interval}.items()) + '\n'
        process = subprocess.Popen(self.ssh + ['sh -s ' + self.token], stdin=subprocess.PIPE,
                                   stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                   text=True, bufsize=1)
        self.procs.append(process)
        process.stdin.write(prelude + script)
        process.stdin.close()
        with (self.out / 'router-telemetry.txt').open('w') as stream:
            for line in process.stdout:
                stream.write(line)
                stream.flush()
                if self.stop.is_set():
                    break
        if not self.stop.is_set():
            self.errors.append('Fluxo SSH de telemetria encerrado inesperadamente; coleta interrompida.')
            self.stop.set()

    def run(self):
        self.out.mkdir(parents=True, exist_ok=True)
        lock = self.out / 'monitor.json'
        if lock.exists() or (self.out / 'preflight.json').exists():
            raise RuntimeError('Diretório já utilizado; escolha outro para preservar evidências.')
        before = self.snapshot()
        self.tcp_address = socket.gethostbyname(self.args.tcp_host)
        write_json(self.out / 'preflight.json', before)
        write_json(lock, {'pid': os.getpid(), 'started': time.time()})
        for sig in (signal.SIGINT, signal.SIGTERM):
            signal.signal(sig, lambda *_: self.stop.set())
        for name, host in [('gateway', self.args.router), ('external', '1.1.1.1'), ('external2', '8.8.8.8')]:
            self.launch(self.probe, name, host)
        self.launch(self.tcp_probe)
        self.launch(self.telemetry)
        print(json.dumps({'status': 'monitorando', 'pid': os.getpid(), 'output': str(self.out)}), flush=True)
        try:
            self.stop.wait(self.args.duration)
        finally:
            self.stop.set()
            try:
                # Só encerra o shell desta sessão, conferindo token único no cmdline.
                self.remote('f=' + shlex.quote(self.pidfile) + '; if [ -r "$f" ]; then '
                            'read p < "$f"; case "$p" in ""|*[!0-9]*) exit 1;; esac; '
                            'if tr "\\000" " " < /proc/$p/cmdline | grep -Fq ' + shlex.quote(self.token) +
                            '; then kill -TERM "$p"; fi; fi')
            except Exception as error:
                self.errors.append('Limpeza remota: ' + str(error))
            for process in self.procs:
                if process.poll() is None:
                    process.terminate()
            for process in self.procs:
                try:
                    process.wait(timeout=4)
                except subprocess.TimeoutExpired:
                    process.kill()
                    process.wait()
            for thread in self.threads:
                thread.join(timeout=4)
            final = {'finished': time.time(), 'errors': self.errors}
            try:
                after = self.snapshot()
                final.update(after=after, config_hashes_unchanged=before['config_hashes'] == after['config_hashes'],
                             nft_stateless_unchanged=before['nft_stateless_hash'] == after['nft_stateless_hash'])
                final['boot_id_unchanged'] = before['boot_id'] == after['boot_id']
                final['qdisc_options_and_handles_unchanged'] = all(
                    [(q['kind'], q.get('handle'), q.get('options')) for q in before['qdiscs'][d]] ==
                    [(q['kind'], q.get('handle'), q.get('options')) for q in after['qdiscs'][d]]
                    for d in before['qdiscs'])
            except Exception as error:
                self.errors.append('Snapshot final: ' + str(error))
            write_json(self.out / 'final-state.json', final)
            print(json.dumps({k: v for k, v in final.items() if k != 'after'}), flush=True)
        return 1 if self.errors else 0


def marker(out, label, event):
    append_json(out / 'events.jsonl', {'time': time.time(), 'label': label, 'event': event})


def monitor_alive(out):
    if not (out / 'monitor.json').exists() or (out / 'final-state.json').exists():
        return False
    try:
        pid = json.loads((out / 'monitor.json').read_text())['pid']
        if not isinstance(pid, int) or pid < 2:
            return False
        os.kill(pid, 0)
    except (OSError, ValueError, KeyError):
        return False
    return True


def quick(args):
    if not monitor_alive(args.out):
        raise RuntimeError('Inicie monitor no mesmo diretório antes da carga.')
    if __import__('sys').platform != 'darwin':
        raise RuntimeError('quick utiliza networkQuality do macOS; use mark com iperf3/Flent no Linux.')
    result_file = args.out / (args.label + '-quick.json')
    if result_file.exists():
        raise RuntimeError('Rótulo já usado; resultados não serão sobrescritos.')
    results = []
    for number in range(1, args.repeat + 1):
        if not monitor_alive(args.out):
            break
        label = args.label + '-' + str(number)
        marker(args.out, label, 'start')
        start = time.time()
        try:
            process = subprocess.Popen(['networkQuality', '-I', args.interface, '-M', str(args.max_seconds), '-c'],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            aborted = None
            while process.poll() is None:
                if not monitor_alive(args.out):
                    aborted = 'monitor_interrompido'
                elif time.time() - start > args.max_seconds + 25:
                    aborted = 'limite_de_tempo'
                if aborted:
                    process.terminate()
                    try:
                        process.wait(timeout=3)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait()
                    break
                time.sleep(.25)
            stdout, _ = process.communicate()
            data = json.loads(stdout) if not aborted else {}
            # Exclui URLs, IPs, dados de cliente/servidor e campos textuais desconhecidos.
            metrics = {k: v for k, v in data.items() if isinstance(v, (int, float, bool)) and
                       any(word in k.lower() for word in ('throughput', 'responsiveness', 'rtt',
                                                          'capacity', 'runtime', 'duration', 'byte', 'error'))}
            valid = (not aborted and process.returncode == 0 and data.get('error_code', 0) == 0
                     and data.get('dl_throughput', 0) > 0 and data.get('ul_throughput', 0) > 0)
            row = {'label': label, 'returncode': process.returncode, 'metrics': metrics,
                   'measurement_valid': valid}
            if not valid:
                row['invalid_reason'] = aborted or 'erro_do_servico_ou_metricas_incompletas'
        except (subprocess.TimeoutExpired, ValueError):
            row = {'label': label, 'failed_or_timed_out': True, 'measurement_valid': False}
        finally:
            marker(args.out, label, 'end')
        row['elapsed_seconds'] = round(time.time() - start, 3)
        results.append(row)
        write_json(result_file, {'tool': 'networkQuality', 'interface': args.interface,
                                'maximum_seconds_per_run': args.max_seconds, 'runs': results,
                                'grade': None, 'note': 'RPM não equivale à nota A+ de um site.'})
        print(json.dumps(row), flush=True)
        if number < args.repeat:
            time.sleep(args.cooldown)
    return 0 if len(results) == args.repeat and all(r['measurement_valid'] for r in results) else 1


def telemetry_rows(path):
    samples, current, previous_cpu = [], None, {}
    for line in path.read_text().splitlines():
        if line.startswith('TIME '):
            if current:
                samples.append(current)
            current = {'time': float(line.split()[1]), 'cpu': {}, 'queues': {}, 'physical': {}}
        elif current and line.startswith('UPTIME '):
            current['monotonic'] = float(line.split()[1])
        elif current and re.match(r'^cpu\d+ ', line):
            parts = line.split()
            counters = list(map(int, parts[1:9]))
            total, idle = sum(counters), counters[3] + counters[4]
            old = previous_cpu.get(parts[0])
            if old and total > old[0]:
                current['cpu'][parts[0]] = round(100 * (1 - (idle - old[1]) / (total - old[0])), 2)
            previous_cpu[parts[0]] = (total, idle)
        elif current and line.startswith(('UL ', 'DL ')):
            try:
                current['queues'][line[:2]] = tc_json(line[3:])
            except ValueError:
                current['tc_parse_error'] = True
        elif current and line.startswith('SOFTNET '):
            pairs = [p.split() for p in line[8:].split(';') if p.strip()]
            current['softnet_dropped'] = sum(int(p[0], 16) for p in pairs)
            current['softnet_squeezed'] = sum(int(p[1], 16) for p in pairs)
        elif current and line.startswith('MemAvailable:'):
            current['memory_available_kib'] = int(line.split()[1])
        elif current and line.startswith('PHYSICAL '):
            parts = line.split()
            current['physical'][parts[1]] = {k: int(v) for k, v in (p.split('=') for p in parts[2:])}
    if current:
        # Um SIGINT pode encerrar o fluxo entre TIME e o fim do bloco.
        # Preserve o último bloco apenas se contiver a estrutura já observada.
        previous = samples[-1] if samples else {}
        maps_complete = all(set(previous.get(key, {})) <= set(current.get(key, {}))
                            for key in ('cpu', 'queues', 'physical'))
        fields_complete = all(key in current for key in
                              ('monotonic', 'memory_available_kib', 'softnet_dropped', 'softnet_squeezed')
                              if key in previous)
        if maps_complete and fields_complete:
            samples.append(current)
    return samples


def queue_summary(samples, direction):
    roots = [(s.get('monotonic', s['time']), q) for s in samples
             for q in s['queues'].get(direction, []) if q.get('root')]
    rates = [(b['bytes'] - a['bytes']) * 8 / (tb - ta) / 1e6
             for (ta, a), (tb, b) in zip(roots, roots[1:])
             if tb > ta and b.get('handle') == a.get('handle') and b.get('bytes', 0) >= a.get('bytes', 0)]
    deltas = [b.get('drops', 0) - a.get('drops', 0) for (_, a), (_, b) in zip(roots, roots[1:])
              if b.get('handle') == a.get('handle') and b.get('drops', 0) >= a.get('drops', 0)]
    return {'kinds': sorted({q['kind'] for _, q in roots}),
            'max_sample_rate_mbps': round(max(rates), 3) if rates else None,
            'aqm_drop_counter_increases': sum(deltas),
            'max_root_backlog_bytes': max((q.get('backlog', 0) for _, q in roots), default=None),
            'max_sample_cake_tin_delay_us': max((t.get('peak_delay_us', 0) for _, q in roots
                                               for t in q.get('tins', [])), default=None)}


def qdisc_transitions(samples):
    """Registra trocas de motor, handle ou teto que invalidam uma janela A/B."""
    transitions, previous = [], {}
    for sample in samples:
        for direction in ('UL', 'DL'):
            roots = [q for q in sample['queues'].get(direction, []) if q.get('root')]
            if not roots:
                continue  # tc pode estar momentaneamente sem raiz durante um restart.
            current = tuple((q.get('kind'), q.get('handle'), q.get('options', {}).get('bandwidth'))
                            for q in roots)
            old = previous.get(direction)
            if old is not None and old != current:
                transitions.append({'time': sample['time'], 'direction': direction,
                                    'before': old, 'after': current})
            previous[direction] = current
    return transitions


def report(args):
    samples = telemetry_rows(args.out / 'router-telemetry.txt')
    transitions = qdisc_transitions(samples)
    probes = {p.stem: read_rows(p) for p in args.out.glob('*.jsonl')
              if p.name != 'events.jsonl' and not p.name.startswith('._')}
    if not samples:
        raise RuntimeError('Ainda não há amostras remotas; confira a coleta SSH.')
    events = read_rows(args.out / 'events.jsonl') if (args.out / 'events.jsonl').exists() else []
    windows, pending = [], {}
    for event in events:
        if event['event'] == 'start':
            pending[event['label']] = event['time']
        elif event['label'] in pending:
            windows.append({'label': event['label'], 'start': pending.pop(event['label']), 'end': event['time']})
    def summarize(start, end):
        selected = [s for s in samples if start <= s['time'] <= end]
        cpu = [v for s in selected for v in s['cpu'].values()]
        first, last = (selected[0], selected[-1]) if selected else ({}, {})
        physical = {dev: {key: value - first.get('physical', {}).get(dev, {}).get(key, value)
                          for key, value in counters.items()}
                    for dev, counters in last.get('physical', {}).items()}
        return {'probes': {n: probe_summary([r for r in rows if start <= r['time'] <= end])
                           for n, rows in probes.items()},
                'cpu_max_core_pct': max(cpu, default=None), 'telemetry_samples': len(selected),
                'core_samples_at_least_95pct': sum(v >= 95 for v in cpu),
                'softnet_dropped_delta': last.get('softnet_dropped', 0) - first.get('softnet_dropped', 0),
                'softnet_squeezed_delta': last.get('softnet_squeezed', 0) - first.get('softnet_squeezed', 0),
                'physical_counter_deltas': physical,
                'minimum_memory_available_kib': min((s['memory_available_kib'] for s in selected
                                                     if 'memory_available_kib' in s), default=None),
                'qdiscs': {d: queue_summary(selected, d) for d in ('UL', 'DL')},
                'qdisc_transitions': [t for t in transitions if start <= t['time'] <= end],
                'tc_parse_errors': sum(bool(s.get('tc_parse_error')) for s in selected)}
    start, end = samples[0]['time'], samples[-1]['time']
    result = {'start': start, 'end': end, 'duration_seconds': end - start,
              'windows': [dict(w, **summarize(w['start'], w['end'])) for w in windows],
              'all': summarize(start, end), 'unfinished_labels': list(pending),
              'comparison_warning': ('Mudança de qdisc/teto durante a coleta; compare apenas janelas com '
                                     'estado e taxas iguais.' if transitions else None),
              'limits': ['Sondas ICMP não representam ping de jogo; TCP mede conexão, não HTTP completo.',
                         'CPU e filas são amostras, não máximos instantâneos.',
                         'Drops AQM não equivalem à perda externa; lacunas excluem bordas sem resposta.',
                         'networkQuality não fornece nota A+; aceite exige resultados reais dos sites/app.']}
    final = args.out / 'final-state.json'
    if final.exists():
        data = json.loads(final.read_text())
        result['preservation'] = {k: v for k, v in data.items() if k != 'after'}
    write_json(args.out / 'summary.json', result)
    print(json.dumps({'windows': len(windows), 'summary': str(args.out / 'summary.json'),
                      'qdisc_transitions': len(transitions),
                      'comparison_warning': result['comparison_warning'],
                      'cpu_max_core_pct': result['all']['cpu_max_core_pct'],
                      'probes': {k: {n: v for n, v in s.items() if n != 'gaps'}
                                 for k, s in result['all']['probes'].items()}}))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='command', required=True)
    monitor = commands.add_parser('monitor', help='Somente leitura: inicia sondas e telemetria SSH.')
    monitor.add_argument('--router', required=True, type=lambda v: str(ipaddress.ip_address(v)))
    monitor.add_argument('--known-hosts', required=True, type=Path)
    monitor.add_argument('--expected-board')
    monitor.add_argument('--port', type=int, default=22)
    monitor.add_argument('--wan', type=safe_name, default='pppoe-wan')
    monitor.add_argument('--ifb', type=safe_name, default='ifb4pppoe-wan')
    monitor.add_argument('--interface', type=safe_name, default='en6')
    monitor.add_argument('--tcp-host', default='www.apple.com')
    monitor.add_argument('--duration', type=int, default=3600)
    monitor.add_argument('--interval', type=int, choices=(1, 2, 3, 5), default=1)
    mark = commands.add_parser('mark', help='Delimita um teste iniciado no app ou navegador.')
    mark.add_argument('event', choices=('start', 'end'))
    mark.add_argument('label', type=safe_name)
    fast = commands.add_parser('quick', help='Carga rápida real pelo networkQuality do macOS.')
    fast.add_argument('--label', type=safe_name, required=True)
    fast.add_argument('--interface', type=safe_name, default='en6')
    fast.add_argument('--repeat', type=int, choices=range(1, 11), default=3)
    fast.add_argument('--max-seconds', type=int, choices=range(10, 121), default=45)
    fast.add_argument('--cooldown', type=int, choices=range(0, 121), default=10)
    commands.add_parser('report', help='Cruza janelas e medições sem alterar o roteador.')
    for command in (monitor, mark, fast, commands.choices['report']):
        command.add_argument('--out', type=Path, required=True)
    args = parser.parse_args()
    args.out = args.out.resolve()
    if args.command == 'monitor':
        if not 10 <= args.duration <= 7200 or not 1 <= args.port <= 65535:
            parser.error('Duração deve ser 10–7200 segundos e porta 1–65535.')
        raise SystemExit(Collector(args).run())
    elif args.command == 'mark':
        if args.event == 'start' and not monitor_alive(args.out):
            raise RuntimeError('Coleta inativa: não iniciar outra carga antes de investigar.')
        marker(args.out, args.label, args.event)
    elif args.command == 'quick':
        raise SystemExit(quick(args))
    else:
        report(args)


if __name__ == '__main__':
    main()
