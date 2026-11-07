#!/usr/bin/env python3
"""Behavioral regression tests; UCI, services and TC are isolated mocks."""
import os
import re
from pathlib import Path
import shlex
import subprocess
import tempfile
import unittest

from test_harness import RouterSandbox

REPO = Path(__file__).resolve().parent.parent


class SqmReliability(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()
        self.sb.uci_set('sqm.wan1.enabled=0')
        self.sb.uci_set('sqm.wan2.enabled=0')
        self.sb.uci_set('mwan3.wan2.enabled=0')

    def tearDown(self):
        self.sb.cleanup()

    def sync(self):
        result = self.sb.run_sh('. "$ARK_LIB_DIR/modules/sqm.sh"; sync_sqm_flow_offload')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_user_disabled_offload_remains_disabled(self):
        self.sb.uci_set('equipe_perf.settings.flow_offload_user_disabled=1')
        self.sb.uci_set('firewall.@defaults[0].flow_offloading=0')
        self.sb.uci_set('firewall.@defaults[0].flow_offloading_hw=0')
        self.sync()
        self.assertEqual(self.sb.uci_get('firewall.@defaults[0].flow_offloading'), '0')
        self.assertEqual(self.sb.uci_get('firewall.@defaults[0].flow_offloading_hw'), '0')

    def test_no_snapshot_does_not_invent_previous_offload(self):
        self.sb.uci_set('firewall.@defaults[0].flow_offloading=0')
        self.sync()
        self.assertEqual(self.sb.uci_get('firewall.@defaults[0].flow_offloading'), '0')

    def test_offload_roundtrip_is_persistent_and_idempotent(self):
        for sw, hw in [('0', '0'), ('1', '0'), ('1', '1')]:
            with self.subTest(sw=sw, hw=hw):
                self.sb.uci_set(f'firewall.@defaults[0].flow_offloading={sw}')
                self.sb.uci_set(f'firewall.@defaults[0].flow_offloading_hw={hw}')
                self.sb.uci_set('sqm.wan1.enabled=1')
                self.sync()
                self.sync()  # Separate shell process; snapshot must survive.
                self.assertEqual(self.sb.uci_get('firewall.@defaults[0].flow_offloading'), '0')
                self.sb.uci_set('sqm.wan1.enabled=0')
                self.sync()
                self.sync()
                self.assertEqual(self.sb.uci_get('firewall.@defaults[0].flow_offloading'), sw)
                self.assertEqual(self.sb.uci_get('firewall.@defaults[0].flow_offloading_hw'), hw)

    def test_absent_options_restored_as_absent(self):
        self.sb.run_sh("uci -q delete 'firewall.@defaults[0].flow_offloading'; "
                       "uci -q delete 'firewall.@defaults[0].flow_offloading_hw'")
        self.sb.uci_set('sqm.wan1.enabled=1')
        self.sync()
        self.sb.uci_set('sqm.wan1.enabled=0')
        self.sync()
        self.assertIsNone(self.sb.uci_get('firewall.@defaults[0].flow_offloading'))
        self.assertIsNone(self.sb.uci_get('firewall.@defaults[0].flow_offloading_hw'))

    def test_user_disable_during_sqm_overrides_saved_enabled(self):
        self.sb.uci_set('firewall.@defaults[0].flow_offloading=1')
        self.sb.uci_set('sqm.wan1.enabled=1')
        self.sync()
        self.sb.uci_set('equipe_perf.settings.flow_offload_user_disabled=1')
        self.sb.uci_set('sqm.wan1.enabled=0')
        self.sync()
        self.assertEqual(self.sb.uci_get('firewall.@defaults[0].flow_offloading'), '0')

    def test_multiwan_defers_restore_until_safe(self):
        self.sb.uci_set('firewall.@defaults[0].flow_offloading=1')
        self.sb.uci_set('sqm.wan1.enabled=1')
        self.sync()
        self.sb.uci_set('mwan3.wan2.enabled=1')
        self.sb.uci_set('sqm.wan1.enabled=0')
        self.sync()
        self.assertEqual(self.sb.uci_get('firewall.@defaults[0].flow_offloading'), '0')
        self.sb.uci_set('mwan3.wan2.enabled=0')
        self.sync()
        self.assertEqual(self.sb.uci_get('firewall.@defaults[0].flow_offloading'), '1')

    def test_ecm_stops_restore_independently(self):
        ecm = Path(self.sb.temp_dir) / 'sys/kernel/debug/ecm'
        ecm.mkdir(parents=True)
        for family, value in [('ipv4', '0'), ('ipv6', '1')]:
            (ecm / f'front_end_{family}_stop').write_text(value + '\n')
        self.sb.uci_set('sqm.wan1.enabled=1')
        self.sync()
        self.assertEqual((ecm / 'front_end_ipv4_stop').read_text().strip(), '1')
        self.sb.uci_set('sqm.wan1.enabled=0')
        self.sync()
        self.assertEqual((ecm / 'front_end_ipv4_stop').read_text().strip(), '0')
        self.assertEqual((ecm / 'front_end_ipv6_stop').read_text().strip(), '1')

    def test_ecm_loaded_later_is_snapshotted_before_first_write(self):
        self.sb.uci_set('sqm.wan1.enabled=1')
        self.sync()
        ecm = Path(self.sb.temp_dir) / 'sys/kernel/debug/ecm'
        ecm.mkdir(parents=True)
        (ecm / 'front_end_ipv4_stop').write_text('0\n')
        self.sync()
        self.sb.uci_set('sqm.wan1.enabled=0')
        self.sync()
        self.assertEqual((ecm / 'front_end_ipv4_stop').read_text().strip(), '0')

    def test_tune_preserves_sqm_device_even_before_qdisc_exists(self):
        tune = shlex.quote(str(REPO / 'root/etc/init.d/ark-hardware-tune'))
        self.sb.uci_set('sqm.wan1.interface=eth1')
        self.sb.uci_set('sqm.wan1.enabled=1')
        result = self.sb.run_sh(f'. "$ARK_LIB_DIR/common.sh"; . {tune}; '
                               'tc() { return 0; }; ark_tune_preserve_root eth1')
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_tune_preserves_existing_hfsc_and_allows_unmanaged_fqcodel(self):
        tune = shlex.quote(str(REPO / 'root/etc/init.d/ark-hardware-tune'))
        for kind, expected in [('hfsc', 0), ('cake', 0), ('fq_codel', 1)]:
            result = self.sb.run_sh(f'. "$ARK_LIB_DIR/common.sh"; . {tune}; '
                f'tc() {{ echo "qdisc {kind} 1: root refcnt 2"; }}; '
                'ark_tune_preserve_root eth1')
            self.assertEqual(result.returncode, expected, result.stderr)

    def test_failed_engine_switch_reports_error_and_restores_engine(self):
        self.sb.uci_set('equipe_dashboard.settings.sqm_engine=cake')
        self.sb.uci_set('sqm.wan1.ark_engine=cake')
        self.sb.uci_set('sqm.wan1.script=layer_cake.qos')
        self.sb.uci_set('sqm.wan1.qdisc=cake')
        self.sb.uci_set('sqm.wan1.enabled=1')
        service = Path(self.sb.temp_dir) / 'etc/init.d/sqm'
        service.write_text('#!/bin/sh\nexit 1\n')
        result = self.sb.run_control('sqm-engine-select', 'hfsc_fq_codel')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotEqual(result.stdout.strip(), 'ok')
        self.assertEqual(self.sb.uci_get('equipe_dashboard.settings.sqm_engine'), 'cake')
        self.assertEqual(self.sb.uci_get('sqm.wan1.script'), 'layer_cake.qos')

    def test_service_failure_reaches_other_sqm_mutators(self):
        service = Path(self.sb.temp_dir) / 'etc/init.d/sqm'
        service.write_text('#!/bin/sh\nexit 1\n')
        actions = [('sqm-toggle', '1'), ('sqm-toggle', '0'),
                   ('sqm-save-v2', 'wan=wan1|wan|eth1|1|500000|250000|ethernet|18'),
                   ('sqm-apply-upload-only', 'wan', '50000'),
                   ('sqm-waveform-aplus', '1')]
        for action in actions:
            with self.subTest(action=action):
                result = self.sb.run_control(*action)
                self.assertNotEqual(result.returncode, 0)
                self.assertNotEqual(result.stdout.strip(), 'ok')

    def verify_queues(self, qdisc, redirect, classes='', engine='cake'):
        self.sb.uci_set('sqm.wan1.enabled=1')
        self.sb.uci_set('sqm.wan1.interface=eth1')
        self.sb.uci_set('sqm.wan1.upload=10000')
        self.sb.uci_set('sqm.wan1.download=10000')
        self.sb.uci_set('sqm.wan1.script=' + ('ark_hfsc_fqcodel.qos' if engine == 'hfsc' else 'layer_cake.qos'))
        (Path(self.sb.sys_net) / 'ifb4eth1').mkdir(exist_ok=True)
        tc = ('tc() { case "$1" in '
              f'qdisc) printf "%s\\n" {shlex.quote(qdisc)} ;; '
              f'filter) printf "%s\\n" {shlex.quote(redirect)} ;; '
              f'class) printf "%s\\n" {shlex.quote(classes)} ;; '
              '*) return 1 ;; esac; }; ')
        return self.sb.run_sh('. "$ARK_LIB_DIR/modules/sqm.sh"; ' + tc + 'ark_sqm_verify_queues')

    def test_kernel_verifier_rejects_missing_root_or_redirect(self):
        redirect = 'action order 1: mirred (Egress Redirect to device ifb4eth1) stolen'
        self.assertNotEqual(self.verify_queues('', redirect).returncode, 0)
        self.assertNotEqual(self.verify_queues('qdisc cake 1: root refcnt 2', '').returncode, 0)
        self.assertEqual(self.verify_queues('qdisc cake 1: root refcnt 2', redirect).returncode, 0)

    def test_kernel_verifier_requires_complete_hfsc_tree(self):
        redirect = 'action order 1: mirred (Egress Redirect to device ifb4eth1) stolen'
        classes = '\n'.join(f'class hfsc 1:{i} parent 1:' for i in [1, 10, 20, 30])
        qdiscs = 'qdisc hfsc 1: root\n' + '\n'.join(
            f'qdisc fq_codel 1{i}: parent 1:{i}' for i in [10, 20, 30])
        self.assertEqual(self.verify_queues(qdiscs, redirect, classes, 'hfsc').returncode, 0)
        self.assertNotEqual(self.verify_queues('qdisc hfsc 1: root', redirect, classes, 'hfsc').returncode, 0)
        classes = classes.replace('class hfsc 1:30 parent 1:', '')
        self.assertNotEqual(self.verify_queues(qdiscs, redirect, classes, 'hfsc').returncode, 0)

    def test_failed_uci_commit_cannot_report_disabled_success(self):
        result = self.sb.run_sh('''
. "$ARK_LIB_DIR/modules/sqm.sh"
uci() { case "$*" in 'commit sqm') return 1 ;; *) command uci "$@" ;; esac; }
handle_sqm sqm-toggle 0
''')
        self.assertNotEqual(result.returncode, 0)
        self.assertNotEqual(result.stdout.strip(), 'ok')


class HfscInstallation(unittest.TestCase):
    def run_tree(self, fail_pattern='', entry='tree', strict=False, memory_kb=None):
        with tempfile.TemporaryDirectory(prefix='ark_hfsc_test_') as directory:
            root = Path(directory)
            (root / 'defaults.sh').write_text('')
            tc = root / 'tc'
            tc.write_text('#!/bin/sh\nprintf "%s\\n" "$*" >> "$TC_TEST_LOG"\n'
                          'if [ -n "$TC_TEST_FAIL" ]; then\n'
                          'case "$*" in *"$TC_TEST_FAIL"*) exit 1 ;; esac\nfi\nexit 0\n')
            tc.chmod(0o755)
            env = {**os.environ, 'SQM_LIB_DIR': directory, 'TC': str(tc),
                   'ARK_LIB_DIR': str(REPO / 'root/usr/lib/ark'),
                   'TC_TEST_LOG': str(root / 'tc.log'), 'TC_TEST_FAIL': fail_pattern}
            if memory_kb is not None:
                (root / 'proc').mkdir()
                (root / 'proc/meminfo').write_text(f'MemTotal: {memory_kb} kB\n')
                env['ARK_ROOT'] = str(root)
            source = shlex.quote(str(REPO / 'root/usr/lib/sqm/ark_hfsc_fqcodel.qos'))
            command = {'tree': 'ark_hfsc_build_tree pppoe-wan 10000 noecn egress',
                       'egress': 'egress', 'ingress': 'ingress'}[entry]
            script = ('set -e\n' if strict else '') + f'. {source}\n' + '''
IP=true
IFACE=pppoe-wan
DEV=ifb4pppoe-wan
UPLINK=10000
DOWNLINK=10000
LINKLAYER=none
uci() { return 1; }
logger() { return 0; }
sqm_debug() { return 0; }
get_ecn() { echo noecn; }
get_stab_string() { return 0; }
''' + command
            result = subprocess.run(['sh', '-c', script], env=env, capture_output=True, text=True)
            return result, (root / 'tc.log').read_text()

    def test_required_root_class_leaf_and_redirect_failures_propagate(self):
        for pattern, entry in [('root handle', 'tree'), ('classid 1:1 ', 'tree'),
                               ('classid 1:10 ', 'tree'), ('handle 110:', 'tree'),
                               ('handle 120:', 'tree'), ('handle 130:', 'tree'),
                               ('filter add dev pppoe-wan parent 1:', 'tree'),
                               ('root handle', 'egress'), ('root handle', 'ingress'),
                               ('mirred', 'ingress')]:
            with self.subTest(pattern=pattern, entry=entry):
                result, _ = self.run_tree(pattern, entry)
                self.assertNotEqual(result.returncode, 0, 'Failure incorrectly reported as success')

    def test_none_linklayer_is_respected(self):
        result, commands = self.run_tree()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn('stab ', commands)

    def test_optional_leaf_options_can_fall_back(self):
        result, commands = self.run_tree('ce_threshold_selector')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('handle 120:', commands)

    def test_hfsc_leaves_share_direction_budget(self):
        for kb, cap in [(131072, 4), (250000, 16), (1010036, 64)]:
            with self.subTest(kb=kb):
                result, commands = self.run_tree(memory_kb=kb)
                self.assertEqual(result.returncode, 0, result.stderr)
                limits = [int(x) for x in re.findall(r'memory_limit (\d+)', commands)]
                self.assertEqual(len(limits), 3)
                self.assertEqual(sum(limits), cap * 1024 * 1024)

    def test_memory_limit_failure_cannot_fall_back_unbounded(self):
        result, _ = self.run_tree('memory_limit')
        self.assertNotEqual(result.returncode, 0)

    def test_absent_old_root_is_not_fatal_under_errexit(self):
        result, _ = self.run_tree('qdisc del', strict=True)
        self.assertEqual(result.returncode, 0, result.stderr)


class AutorateGuards(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()
        self.sb.uci_set('sqm.wan1.enabled=1')
        self.sb.uci_set('sqm.wan2.enabled=0')
        self.sb.uci_set('equipe_dashboard.settings.sqm_autorate=1')
        self.state = Path(self.sb.temp_dir) / 'tmp/ark_autorate_wan1.state'

    def tearDown(self):
        self.sb.cleanup()

    def step(self, args=''):
        return self.sb.run_sh('. "$ARK_LIB_DIR/modules/sqm.sh"; ark_sqm_autorate_step ' + args)

    def test_disabled_step_preserves_existing_state(self):
        self.sb.uci_set('equipe_dashboard.settings.sqm_autorate=0')
        self.state.write_text('sentinel')
        self.assertNotEqual(self.step('load_pct=85 delay_ms=25').returncode, 0)
        self.assertEqual(self.state.read_text(), 'sentinel')

    def test_requires_both_samples(self):
        for args in ['', 'load_pct=85', 'delay_ms=25']:
            with self.subTest(args=args):
                self.assertNotEqual(self.step(args).returncode, 0)
                self.assertFalse(self.state.exists())

    def test_rejects_invalid_and_unbounded_samples(self):
        for sample in ['-1', '1.5', 'nan', '08', '10000000', '1;echo']:
            for key in ['load_pct', 'delay_ms']:
                args = {'load_pct': '85', 'delay_ms': '25', key: sample}
                with self.subTest(key=key, sample=sample):
                    self.assertNotEqual(self.step(' '.join(shlex.quote(k+'='+v) for k, v in args.items())).returncode, 0)
        self.assertNotEqual(self.step('load_pct=101 delay_ms=25').returncode, 0)
        self.assertNotEqual(self.step('load_pct=85 delay_ms=60001').returncode, 0)
        self.assertFalse(self.state.exists())

    def test_explicit_valid_sample_still_reduces_rates(self):
        self.sb.uci_set('sqm.wan1.download=100000')
        self.sb.uci_set('sqm.wan1.upload=50000')
        r = self.step('load_pct=85 delay_ms=25')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('cur_dl=88000', self.state.read_text())
        self.assertIn('cur_ul=44000', self.state.read_text())

    def test_disable_restores_before_deleting_state(self):
        self.state.write_text('cur_dl=88000')
        r = self.sb.run_sh('. "$ARK_LIB_DIR/modules/sqm.sh"; '
                           'ark_sqm_restart_checked() { test -f "$ARK_ROOT/tmp/ark_autorate_wan1.state"; }; '
                           'ark_promote_cake_mq() { test -f "$ARK_ROOT/tmp/ark_autorate_wan1.state"; }; '
                           'ark_sqm_autorate_toggle 0')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertFalse(self.state.exists())
        self.assertEqual(self.sb.uci_get('equipe_dashboard.settings.sqm_autorate'), '0')

    def test_failed_restore_keeps_state_for_retry(self):
        self.state.write_text('cur_dl=88000')
        r = self.sb.run_sh('. "$ARK_LIB_DIR/modules/sqm.sh"; '
                           'ark_sqm_restart_checked() { return 1; }; ark_sqm_autorate_toggle 0')
        self.assertNotEqual(r.returncode, 0)
        self.assertTrue(self.state.exists())
        self.assertEqual(self.sb.uci_get('equipe_dashboard.settings.sqm_autorate'), '0')

    def test_disable_without_runtime_state_does_not_restart(self):
        r = self.sb.run_sh('. "$ARK_LIB_DIR/modules/sqm.sh"; '
                           'ark_sqm_restart_checked() { return 1; }; ark_sqm_autorate_toggle 0')
        self.assertEqual(r.returncode, 0, r.stderr)

    def test_qos_gaming_dns_bypass_doh(self):
        """Valida que ark_sync_sqm_gaming_dns desativa DoH e aplica Anycast direto (< 5 ms)"""
        self.sb.uci_set('equipe_perf.settings=performance')
        self.sb.uci_set('equipe_perf.settings.dns_doh_enabled=1')
        self.sb.uci_set('dhcp.@dnsmasq[0].server=127.0.0.1#5053')
        r = self.sb.run_sh('. "$ARK_LIB_DIR/modules/sqm.sh"; ark_sync_sqm_gaming_dns')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(self.sb.uci_get('equipe_perf.settings.dns_doh_enabled'), '0')
        servers = self.sb.uci_get('dhcp.@dnsmasq[0].server')
        self.assertNotIn('127.0.0.1#5053', servers)
        self.assertIn('1.1.1.1', servers)
        self.assertIn('2606:4700:4700::1111', servers)

    def test_ark_sync_doh_proxy_disable_cleans_sections(self):
        """Valida que ark_sync_doh_proxy disable remove seções e instâncias de proxy do UCI"""
        self.sb.uci_set('https-dns-proxy.ark_doh1=https-dns-proxy')
        self.sb.uci_set('https-dns-proxy.ark_doh1.listen_port=5053')
        self.sb.uci_set('https-dns-proxy.ark_doh2=https-dns-proxy')
        self.sb.uci_set('https-dns-proxy.ark_doh2.listen_port=5054')
        self.sb.uci_set('dhcp.@dnsmasq[0].server=127.0.0.1#5053')
        r = self.sb.run_sh('. "$ARK_LIB_DIR/common.sh"; ark_sync_doh_proxy "disable" || true')
        doh1 = self.sb.uci_get('https-dns-proxy.ark_doh1.listen_port')
        self.assertIn(doh1, ('', None))
        servers = self.sb.uci_get('dhcp.@dnsmasq[0].server')
        self.assertNotIn('127.0.0.1#5053', servers or '')


if __name__ == '__main__':
    unittest.main()
