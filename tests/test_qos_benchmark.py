#!/usr/bin/env python3
"""Regressões do coletor local; nenhum acesso a roteadores ou carga de rede."""
import importlib.util
import json
from pathlib import Path
import tempfile
import types
import unittest
from unittest import mock

SPEC = importlib.util.spec_from_file_location('benchmark', Path(__file__).resolve().parents[1] / 'scripts/qos_benchmark.py')
benchmark = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(benchmark)


class BenchmarkTests(unittest.TestCase):
    def test_qdisc_rate_change_is_reported_in_the_affected_window(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            def qdisc(handle, rate):
                return json.dumps([{'kind': 'cake', 'root': True, 'handle': handle,
                                    'options': {'bandwidth': rate}, 'bytes': 100}])
            (out / 'router-telemetry.txt').write_text(
                'TIME 1\nUL ' + qdisc('1:', 77500000) + '\nDL []\n'
                'TIME 2\nUL ' + qdisc('2:', 87500000) + '\nDL []\n'
                'TIME 3\nUL ' + qdisc('2:', 87500000) + '\nDL []\n')
            (out / 'events.jsonl').write_text(
                '{"time":1,"event":"start","label":"change"}\n'
                '{"time":2,"event":"end","label":"change"}\n'
                '{"time":2.1,"event":"start","label":"stable"}\n'
                '{"time":3,"event":"end","label":"stable"}\n')
            benchmark.report(types.SimpleNamespace(out=out))
            data = json.loads((out / 'summary.json').read_text())
            self.assertEqual(len(data['all']['qdisc_transitions']), 1)
            self.assertEqual(data['windows'][0]['qdisc_transitions'][0]['after'][0][2], 87500000)
            self.assertEqual(data['windows'][1]['qdisc_transitions'], [])
            self.assertIsNotNone(data['comparison_warning'])

    def test_hfsc_firmware_json_and_cake(self):
        rows = benchmark.tc_json('[{"kind":"hfsc","root":true,"options":{default 3 }}]')
        self.assertEqual(rows[0]['options']['default'], '3')
        self.assertEqual(benchmark.tc_json('[{"kind":"cake","options":{"bandwidth":123}}]')[0]['options']['bandwidth'], 123)
        with self.assertRaises(ValueError):
            benchmark.tc_json('[{this is not a known firmware defect}]')

    def test_loss_ignores_duplicates_and_unobserved_edges(self):
        rows = [{'time': n, 'seq': s, 'rtt_ms': r} for n, s, r in
                [(1, 10, 5), (2, 11, 6), (3, 11, 6), (4, 14, 7)]]
        result = benchmark.probe_summary(rows)
        self.assertEqual(result['responses'], 3)
        self.assertEqual(result['internal_sequence_holes'], 2)
        self.assertEqual(result['gaps'][0]['missing'], 2)
        self.assertIsNone(benchmark.probe_summary([])['max_ms'])

    def test_queue_restart_does_not_become_negative_throughput_or_drop(self):
        def sample(t, handle, byte_count, drops):
            return {'time': t, 'queues': {'UL': [{'root': True, 'kind': 'cake',
                    'handle': handle, 'bytes': byte_count, 'drops': drops}]}}
        samples = [sample(1, '1:', 100, 8), sample(2, '1:', 1000100, 10),
                   sample(3, '2:', 50, 0), sample(4, '2:', 500050, 1)]
        result = benchmark.queue_summary(samples, 'UL')
        self.assertEqual(result['max_sample_rate_mbps'], 8)
        self.assertEqual(result['aqm_drop_counter_increases'], 3)

    def test_cpu_guest_time_not_double_counted_and_softnet_hex(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'telemetry'
            path.write_text('TIME 1\ncpu0 100 0 0 100 0 0 0 0 50 0\n'
                            'TIME 2\ncpu0 150 0 0 150 0 0 0 0 100 0\n'
                            'SOFTNET 0000000a 0000000f;00000001 00000002;\n')
            rows = benchmark.telemetry_rows(path)
            self.assertEqual(rows[-1]['cpu']['cpu0'], 50)
            self.assertEqual(rows[-1]['softnet_dropped'], 11)
            self.assertEqual(rows[-1]['softnet_squeezed'], 17)

    def test_marker_and_atomic_json(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            benchmark.marker(out, 'HFSC-app-1', 'start')
            benchmark.marker(out, 'HFSC-app-1', 'end')
            self.assertEqual(len(benchmark.read_rows(out / 'events.jsonl')), 2)
            benchmark.write_json(out / 'result.json', {'grade': None})
            self.assertIsNone(json.loads((out / 'result.json').read_text())['grade'])
            self.assertFalse((out / 'result.json.tmp').exists())

    def test_shell_injection_in_interface_or_label_is_rejected(self):
        for name in ('wan;reboot', '$(id)', '../file', 'a\nb'):
            with self.assertRaises(Exception):
                benchmark.safe_name(name)

    def test_telemetry_interrupted_mid_sample_preserves_last_complete_block(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'telemetry'
            path.write_text('TIME 1\nUL []\nDL []\nPHYSICAL eth0 rx_errors=0\n'
                            'PHYSICAL eth1 rx_errors=0\nTIME 2\nUL []\n')
            rows = benchmark.telemetry_rows(path)
            self.assertEqual(len(rows), 1)
            self.assertIn('eth1', rows[-1]['physical'])

    def test_live_report_ignores_exfat_metadata_and_incomplete_last_record(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            (out / 'external.jsonl').write_text('{"time":1,"seq":1,"rtt_ms":4}\n{"time":2')
            (out / '._external.jsonl').write_bytes(b'\x00\xff\xb0')
            (out / 'router-telemetry.txt').write_text('TIME 1\ncpu0 100 0 0 100 0 0 0 0\n')
            class Args:
                pass
            args = Args()
            args.out = out
            benchmark.report(args)
            data = json.loads((out / 'summary.json').read_text())
            self.assertEqual(list(data['all']['probes']), ['external'])
            self.assertEqual(data['all']['probes']['external']['responses'], 1)

    def test_networkquality_exit_zero_with_service_error_is_invalid(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            args = types.SimpleNamespace(out=out, label='CAKE', repeat=1, max_seconds=10,
                                         interface='en6', cooldown=0)
            process = mock.Mock(returncode=0)
            process.poll.return_value = 0
            process.communicate.return_value = (json.dumps({'error_code': -1001,
                'dl_throughput': 600000000, 'ul_throughput': 450000000}), '')
            with mock.patch('sys.platform', 'darwin'), mock.patch.object(benchmark, 'monitor_alive', return_value=True), mock.patch.object(benchmark.subprocess, 'Popen', return_value=process):
                self.assertEqual(benchmark.quick(args), 1)
            data = json.loads((out / 'CAKE-quick.json').read_text())
            self.assertFalse(data['runs'][0]['measurement_valid'])
            self.assertIsNone(data['grade'])

    def test_lost_monitor_terminates_load_and_prevents_next_repetition(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            args = types.SimpleNamespace(out=out, label='HFSC', repeat=3, max_seconds=10,
                                         interface='en6', cooldown=0)
            process = mock.Mock(returncode=-15)
            process.poll.return_value = None
            process.communicate.return_value = ('', '')
            with mock.patch('sys.platform', 'darwin'), mock.patch.object(benchmark, 'monitor_alive', side_effect=[True, True, False, False]), mock.patch.object(benchmark.subprocess, 'Popen', return_value=process), mock.patch.object(benchmark.time, 'sleep'):
                self.assertEqual(benchmark.quick(args), 1)
            process.terminate.assert_called_once()
            data = json.loads((out / 'HFSC-quick.json').read_text())
            self.assertEqual(len(data['runs']), 1)
            self.assertEqual(data['runs'][0]['invalid_reason'], 'monitor_interrompido')

    def test_unexpected_ssh_eof_stops_collector(self):
        with tempfile.TemporaryDirectory() as directory:
            collector = benchmark.Collector.__new__(benchmark.Collector)
            collector.args = types.SimpleNamespace(duration=10, interval=1, wan='wan', ifb='ifb')
            collector.out = Path(directory)
            collector.ssh, collector.procs, collector.errors = [], [], []
            collector.token, collector.pidfile = 'test_token', '/tmp/test_token.pid'
            collector.stop = benchmark.threading.Event()
            process = mock.Mock()
            process.stdout = iter(['TIME 1\n'])
            with mock.patch.object(benchmark.subprocess, 'Popen', return_value=process):
                collector.telemetry()
            self.assertTrue(collector.stop.is_set())
            self.assertTrue(collector.errors)

    def test_monitor_failure_is_preserved_and_returns_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            collector = benchmark.Collector(types.SimpleNamespace(
                out=Path(directory), known_hosts=Path('/tmp/unused'), port=22,
                router='192.0.2.1', interface='test', duration=10, tcp_host='example.test'))
            snapshot = {'config_hashes': 'same', 'nft_stateless_hash': 'same',
                        'boot_id': 'same', 'qdiscs': {}}
            def interrupted(*_):
                collector.errors.append('telemetria interrompida')
                collector.stop.set()
            with mock.patch.object(collector, 'snapshot', return_value=snapshot), mock.patch.object(collector, 'remote'), mock.patch.object(collector, 'launch', side_effect=interrupted), mock.patch.object(benchmark.socket, 'gethostbyname', return_value='192.0.2.2'), mock.patch.object(benchmark.signal, 'signal'):
                self.assertEqual(collector.run(), 1)
            final = json.loads((Path(directory) / 'final-state.json').read_text())
            self.assertIn('telemetria interrompida', final['errors'])


if __name__ == '__main__':
    unittest.main()
