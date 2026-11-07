#!/usr/bin/env python3
"""Regressões de política, efeitos colaterais, locks e ACL; sandbox, não VM."""
import json
import os
import shlex
import unittest
from pathlib import Path
from test_harness import RouterSandbox

REPO = Path(__file__).resolve().parents[1]


class DoctorSafety(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()
        self.root = Path(self.sb.temp_dir)
        self.load = '. "$ARK_LIB_DIR/common.sh"\n. "$ARK_LIB_DIR/modules/doctor.sh"\n'

    def tearDown(self):
        self.sb.cleanup()

    def shell(self, body):
        result = self.sb.run_sh(self.load + body)
        self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def state(self):
        return {p.name: p.read_bytes() for p in Path(self.sb.etc_config).iterdir() if p.is_file()}

    def spy(self, name, body):
        path = Path(self.sb.bin_dir) / name
        # O harness usa symlinks para um cliente UCI compartilhado.
        # Substituir o link, nunca sobrescrever seu destino entre cenários.
        path.unlink(missing_ok=True)
        path.write_text('#!/bin/sh\n' + body + '\n')
        path.chmod(0o755)

    def test_audit_preserves_uci_and_does_not_call_mutating_helpers(self):
        before = self.state()
        result = self.shell('''
ark_ensure_wan_mtu_fix() { echo mtu >> "$ARK_ROOT/state/mutations"; }
ark_sync_lan_ipv6_ra_mtu() { echo ra >> "$ARK_ROOT/state/mutations"; }
ark_promote_cake_mq() { echo cake >> "$ARK_ROOT/state/mutations"; }
ark_sync_clat_p2p_routes() { echo clat >> "$ARK_ROOT/state/mutations"; }
ark_doctor_audit 0 json
''')
        self.assertEqual(json.loads(result.stdout)['fixes_applied'], 0)
        self.assertFalse((self.root / 'state/mutations').exists())
        self.assertEqual(before, self.state())

    def test_auto_flags_cannot_enable_repairs(self):
        for args in ['--auto', '--auto --fix', '--fix --auto', 'auto fix=1']:
            with self.subTest(args=args):
                (self.root / 'tmp/ark-doctor-auto.ts').unlink(missing_ok=True)
                result = self.shell('''
ark_doctor_audit() { printf '%s' "$1" > "$ARK_ROOT/state/mode"; }
handle_doctor ''' + args + '\ncat "$ARK_ROOT/state/mode"\n')
                self.assertEqual(result.stdout.strip(), '0')

    def test_read_endpoint_cannot_enable_repairs(self):
        result = self.shell('''
ark_doctor_audit() { printf '%s' "$1"; }
handle_doctor doctor-run --fix
''')
        self.assertEqual(result.stdout, '0')

    def test_auto_disabled_and_burst_coalescing(self):
        self.sb.uci_set('equipe_dashboard.doctor=doctor')
        self.sb.uci_set('equipe_dashboard.doctor.auto_heal=0')
        self.shell('ark_doctor_audit() { echo run >> "$ARK_ROOT/state/runs"; }; handle_doctor --auto')
        self.assertFalse((self.root / 'state/runs').exists())
        self.sb.uci_set('equipe_dashboard.doctor.auto_heal=1')
        self.shell('''
ark_doctor_audit() { echo run >> "$ARK_ROOT/state/runs"; }
handle_doctor --auto
handle_doctor --auto
''')
        self.assertEqual((self.root / 'state/runs').read_text().splitlines(), ['run'])

    def test_future_auto_timestamp_does_not_suppress_audit(self):
        (self.root / 'tmp/ark-doctor-auto.ts').write_text('4102444800\n')
        self.shell('ark_doctor_audit() { echo run > "$ARK_ROOT/state/ran"; }; handle_doctor --auto')
        self.assertTrue((self.root / 'state/ran').exists())

    def test_fw4_never_executes_legacy_wrappers(self):
        for name in ['iptables', 'ip6tables', 'iptables-save', 'ip6tables-save']:
            self.spy(name, 'echo legacy >> "$ARK_ROOT/state/legacy"; exit 1')
        result = self.sb.run_control('doctor-run')
        self.assertEqual(result.returncode, 0)
        self.assertFalse((self.root / 'state/legacy').exists())

    def test_fw4_legacy_table_is_warning_not_automatic_cleanup(self):
        proc = self.root / 'proc/net'
        proc.mkdir(parents=True)
        (proc / 'ip_tables_names').write_text('filter\n')
        result = self.sb.run_control('doctor-run')
        checks = json.loads(result.stdout)['checks']
        self.assertEqual(next(c for c in checks if 'Firewall' in c['name'])['status'], 'WARN')

    def test_unknown_flash_is_not_fabricated_free_space(self):
        self.spy('df', 'exit 1')
        result = self.sb.run_control('doctor-run')
        checks = json.loads(result.stdout)['checks']
        check = next(c for c in checks if c['name'] == 'Espaco Flash (/overlay)')
        self.assertEqual(check['status'], 'WARN')
        self.assertIn('desconhecido', check['message'])

    def test_summary_counts_match_emitted_severities(self):
        result = self.sb.run_control('doctor-run')
        data = json.loads(result.stdout)
        self.assertEqual(data['warnings'], sum(c['status'] == 'WARN' for c in data['checks']))
        self.assertEqual(data['errors'], sum(c['status'] == 'FAIL' for c in data['checks']))

    def test_low_flash_fix_preserves_package_locks_and_temporary_files(self):
        self.spy('df', "printf 'Filesystem 1K-blocks Used Available Use%% Mounted\nroot 4096 2048 2048 50%% /overlay\n'")
        sentinel = self.root / 'tmp/foreign.tmp'
        sentinel.write_text('preserve')
        result = self.sb.run_control('doctor-fix')
        check = next(c for c in json.loads(result.stdout)['checks'] if c['name'] == 'Espaco Flash (/overlay)')
        self.assertEqual(check['status'], 'WARN')
        self.assertEqual(sentinel.read_text(), 'preserve')

    def test_busy_without_cache_returns_explicit_json(self):
        lock = self.root / 'tmp/ark-doctor.lockdir'
        lock.mkdir()
        (lock / 'pid').write_text(str(os.getpid()))
        result = self.shell('sleep() { :; }; handle_doctor doctor-run')
        self.assertTrue(json.loads(result.stdout)['busy'])
        self.assertTrue(lock.exists())

    def test_empty_lock_is_not_stolen(self):
        lock = self.root / 'tmp/ark-doctor.lockdir'
        lock.mkdir()
        result = self.shell('sleep() { :; }; handle_doctor doctor-run')
        self.assertTrue(json.loads(result.stdout)['busy'])
        self.assertTrue(lock.exists())

    def test_live_mutation_lock_older_than_timeout_is_preserved(self):
        lock = self.root / 'tmp/ark_mutation.lock'
        lock.mkdir()
        (lock / 'pid').write_text(str(os.getpid()))
        (lock / 'ts').write_text('1')
        self.shell('sleep() { :; }; if ark_acquire_mutation_lock test; then exit 1; fi')
        self.assertEqual((lock / 'pid').read_text(), str(os.getpid()))

    def test_mutation_signal_releases_lock_and_stops_execution(self):
        result = self.sb.run_sh(self.load + '''
ark_acquire_mutation_lock signal-test
_ark_has_mut_lock=1
ark_restore_mutation_trap
kill -TERM $$
echo unsafe > "$ARK_ROOT/state/continued"
''')
        self.assertEqual(result.returncode, 130)
        self.assertFalse((self.root / 'state/continued').exists())
        self.assertFalse((self.root / 'tmp/ark_mutation.lock').exists())

    def test_dead_owner_is_recovered(self):
        lock = self.root / 'tmp/ark-doctor.lockdir'
        lock.mkdir()
        (lock / 'pid').write_text('999999999')
        self.shell('ark_doctor_audit() { :; }; handle_doctor doctor-run')
        self.assertFalse(lock.exists())

    def test_release_preserves_other_owner(self):
        lock = self.root / 'tmp/ark-doctor.lockdir'
        lock.mkdir()
        (lock / 'pid').write_text(str(os.getpid()))
        self.shell('_lock_path="$ARK_ROOT/tmp/ark-doctor.lockdir"; doctor_release_lock')
        self.assertTrue(lock.exists())

    def test_write_capability_is_required_for_mutating_executables(self):
        acl = json.loads((REPO / 'root/usr/share/rpcd/acl.d/luci-app-equipe-dashboard.json').read_text())['luci-app-equipe-dashboard']
        for path in ['/usr/sbin/equipe-dashboard-control', '/usr/libexec/nlbwmon-action']:
            self.assertNotIn('exec', acl['read']['file'].get(path, []))
            self.assertIn('exec', acl['write']['file'][path])

    def test_watchdog_reports_failure_without_network_or_process_mutation(self):
        self.spy('wget', 'exit 1')
        self.spy('sleep', ':')
        self.spy('logger', 'echo warning >> "$ARK_ROOT/state/warnings"')
        for name in ['uci', 'killall', 'pkill', 'wg', 'sed']:
            self.spy(name, 'echo mutation >> "$ARK_ROOT/state/mutations"; exit 1')
        self.shell('sh ' + shlex.quote(str(REPO / 'root/usr/sbin/ark-web-watchdog')))
        self.assertTrue((self.root / 'state/warnings').exists())
        self.assertFalse((self.root / 'state/mutations').exists())

    def test_firewall_guard_missing_fw4_preserves_external_rules(self):
        self.spy('nft', 'exit 1')
        self.spy('pgrep', 'exit 0')
        self.spy('logger', ':')
        for name in ['mv', 'killall', 'pkill', 'ubus']:
            self.spy(name, 'echo mutation >> "$ARK_ROOT/state/mutations"; exit 1')
        before = self.state()
        self.shell('. ' + shlex.quote(str(REPO / 'root/etc/init.d/ark-firewall-guard')) + '; boot')
        self.assertEqual(before, self.state())
        self.assertFalse((self.root / 'state/mutations').exists())

    def test_feature_toggle_rejects_invalid_input_without_writes(self):
        before = self.state()
        self.shell('''
. "$ARK_LIB_DIR/modules/ezsetup.sh"
if ark_feature_toggle_internal unknown 1; then exit 1; fi
if ark_feature_toggle_internal sqm invalid; then exit 1; fi
''')
        self.assertEqual(before, self.state())

    def test_sqm_disable_does_not_sweep_foreign_qdiscs(self):
        for name in ['tc', 'ip']:
            self.spy(name, 'echo mutation >> "$ARK_ROOT/state/mutations"; exit 0')
        service = self.root / 'etc/init.d/sqm'
        service.parent.mkdir(parents=True, exist_ok=True)
        service.write_text('#!/bin/sh\nexit 0\n')
        service.chmod(0o755)
        self.shell('''
. "$ARK_LIB_DIR/modules/ezsetup.sh"
sync_sqm_flow_offload() { return 0; }
ark_feature_toggle_internal sqm 0
ark_feature_toggle_internal sqm 0
''')
        self.assertEqual(self.sb.uci_get('equipe_dashboard.sqm.enabled'), '0')
        self.assertFalse((self.root / 'state/mutations').exists())

    def test_sqm_stop_failure_does_not_claim_disabled(self):
        self.sb.uci_set('equipe_dashboard.sqm=feature')
        self.sb.uci_set('equipe_dashboard.sqm.enabled=1')
        service = self.root / 'etc/init.d/sqm'
        service.parent.mkdir(parents=True, exist_ok=True)
        service.write_text('#!/bin/sh\nexit 1\n')
        service.chmod(0o755)
        self.shell('''
. "$ARK_LIB_DIR/modules/ezsetup.sh"
if ark_feature_toggle_internal sqm 0; then exit 1; fi
''')
        self.assertEqual(self.sb.uci_get('equipe_dashboard.sqm.enabled'), '1')


if __name__ == '__main__':
    unittest.main(verbosity=2)
