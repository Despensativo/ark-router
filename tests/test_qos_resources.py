#!/usr/bin/env python3
"""Shared CAKE/HFSC resource policy; isolated UCI and proc/sys fixtures."""
import json
from pathlib import Path
import unittest
from test_harness import RouterSandbox


class QosResources(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()
        self.root = Path(self.sb.temp_dir)
        (self.root / 'proc').mkdir(exist_ok=True)
        self.ram(1010036)
        self.sb.uci_set('sqm.wan1.enabled=1')
        self.sb.uci_set('sqm.wan1.interface=pppoe-wan')
        self.sb.uci_set('sqm.wan1.download=720000')
        self.sb.uci_set('sqm.wan1.upload=620000')
        self.sb.uci_set('sqm.wan1.qdisc=cake')
        self.sb.uci_set('sqm.wan2.enabled=0')

    def tearDown(self):
        self.sb.cleanup()

    def ram(self, kb):
        (self.root / 'proc/meminfo').write_text(f'MemTotal: {kb} kB\n')

    def call(self, command):
        r = self.sb.run_sh('. "$ARK_LIB_DIR/common.sh"; '
                           '. "$ARK_LIB_DIR/qos-resources.sh"; ' + command)
        self.assertEqual(r.returncode, 0, r.stderr)
        return r.stdout.strip()

    def test_existing_single_wan_cake_caps_preserved(self):
        for kb, cap in [(131072, '4M'), (250000, '16M'), (500000, '32M'),
                        (1010036, '64M'), (2000000, '128M'), (4000000, '256M')]:
            with self.subTest(kb=kb):
                self.ram(kb)
                self.assertEqual(self.call('ark_cake_memlimit'), cap)

    def test_two_wans_share_total_budget(self):
        self.sb.uci_set('sqm.wan2.enabled=1')
        self.sb.uci_set('sqm.wan2.interface=wan2')
        self.sb.uci_set('sqm.wan2.download=100000')
        self.sb.uci_set('sqm.wan2.upload=20000')
        self.assertEqual(self.call('ark_qos_shaper_units'), '4')
        self.assertEqual(self.call('ark_cake_memlimit'), '32M')

    def test_disabled_and_zero_rate_directions_not_counted(self):
        self.sb.uci_set('sqm.wan2.download=100000')
        self.sb.uci_set('sqm.wan2.upload=20000')
        self.sb.uci_set('sqm.wan1.download=0')
        self.assertEqual(self.call('ark_qos_shaper_units'), '2')
        self.assertEqual(self.call('ark_cake_memlimit'), '64M')

    def test_invalid_ram_falls_back_without_host_leak(self):
        for value in ['', 'nan', '-1', '0', '99999999999']:
            self.ram(value)
            self.assertEqual(self.call('ark_cake_memlimit'), '4M')
        (self.root / 'proc/meminfo').unlink()
        self.assertEqual(self.call('ark_cake_memlimit'), '4M')

    def test_three_directions_round_down_within_global_budget(self):
        self.sb.uci_set('sqm.wan2.enabled=1')
        self.sb.uci_set('sqm.wan2.interface=wan2')
        self.sb.uci_set('sqm.wan2.download=100000')
        self.sb.uci_set('sqm.wan2.upload=0')
        share = int(self.call('ark_qos_direction_budget_bytes'))
        self.assertLessEqual(share * 3, 128 * 1024 * 1024)
        self.assertTrue(self.call('ark_cake_memlimit').endswith('K'))

    def test_multiqueue_children_reserved(self):
        self.sb.uci_set('sqm.wan1.qdisc=cake_mq')
        for q in range(4):
            (self.root / f'sys/class/net/pppoe-wan/queues/tx-{q}').mkdir(parents=True, exist_ok=True)
        self.assertEqual(self.call('ark_qos_shaper_units'), '5')
        share = int(self.call('ark_qos_direction_budget_bytes'))
        self.assertLessEqual(share * 5, 128 * 1024 * 1024)

    def test_potential_multiqueue_reserved_before_first_promotion(self):
        (self.root / 'sys/module/sch_cake_mq').mkdir(parents=True)
        for q in range(4):
            (self.root / f'sys/class/net/pppoe-wan/queues/tx-{q}').mkdir(parents=True, exist_ok=True)
        self.assertEqual(self.call('ark_qos_shaper_units'), '5')

    def test_promoted_multiqueue_marker_reserved(self):
        (self.root / 'tmp/ark_sqm_cake_mq.state').write_text('pppoe-wan\n')
        for q in range(2):
            (self.root / f'sys/class/net/pppoe-wan/queues/tx-{q}').mkdir(parents=True, exist_ok=True)
        self.assertEqual(self.call('ark_qos_shaper_units'), '3')

    def test_repeated_reads_do_not_change_configuration(self):
        before = self.sb.uci_get('sqm.wan1.upload')
        val1 = self.call('ark_cake_memlimit')
        val2 = self.call('ark_cake_memlimit')
        self.assertEqual(val1, val2)
        self.assertTrue(len(val1) > 0, "ark_cake_memlimit should return a non-empty limit string")
        self.assertEqual(self.sb.uci_get('sqm.wan1.upload'), before)

    def test_memory_plan_reports_policy_not_measured_capacity(self):
        plan = json.loads(self.call('. "$ARK_LIB_DIR/modules/sqm.sh"; get_sqm_resource_plan'))
        self.assertFalse(plan['capacity_measured'])
        self.assertEqual(plan['memory_total_kib'], 1010036)
        self.assertEqual(plan['hfsc_rt_bytes'] + plan['hfsc_be_bytes'] + plan['hfsc_bulk_bytes'],
                         plan['per_instance_ceiling_bytes'])

    def test_rebalance_updates_all_owned_cake_queues_and_preserves_options(self):
        for sec in ['wan1', 'wan2']:
            self.sb.uci_set(f'sqm.{sec}.enabled=1')
            self.sb.uci_set(f'sqm.{sec}.interface={sec}')
            self.sb.uci_set(f'sqm.{sec}.ark_engine=cake')
            self.sb.uci_set(f'sqm.{sec}.script=layer_cake.qos')
            self.sb.uci_set(f'sqm.{sec}.download=100000')
            self.sb.uci_set(f'sqm.{sec}.upload=50000')
            self.sb.uci_set(f'sqm.{sec}.eqdisc_opts=diffserv4 nat memlimit 64M rtt 100ms')
            self.sb.uci_set(f'sqm.{sec}.iqdisc_opts=diffserv4 ingress memlimit 65536K')
        self.call('. "$ARK_LIB_DIR/modules/sqm.sh"; ark_sqm_sync_memory_limits')
        for sec in ['wan1', 'wan2']:
            self.assertEqual(self.sb.uci_get(f'sqm.{sec}.upload'), '50000')
            self.assertEqual(self.sb.uci_get(f'sqm.{sec}.eqdisc_opts'),
                             'diffserv4 nat rtt 100ms memlimit 32M')
            self.assertEqual(self.sb.uci_get(f'sqm.{sec}.iqdisc_opts'),
                             'diffserv4 ingress memlimit 32M')
        # A second pass must not even request a commit.
        self.call('. "$ARK_LIB_DIR/modules/sqm.sh"; '
                  'uci() { case "$*" in "commit sqm") return 1 ;; *) command uci "$@" ;; esac; }; '
                  'ark_sqm_sync_memory_limits')

    def test_duplicate_limits_cannot_override_the_budget(self):
        self.sb.uci_set('sqm.wan1.ark_engine=cake')
        self.sb.uci_set('sqm.wan1.script=layer_cake.qos')
        self.sb.uci_set('sqm.wan1.eqdisc_opts=diffserv4 memlimit 64M memlimit 128M')
        self.call('. "$ARK_LIB_DIR/modules/sqm.sh"; ark_sqm_sync_memory_limits')
        self.assertEqual(self.sb.uci_get('sqm.wan1.eqdisc_opts'), 'diffserv4 memlimit 64M')

    def test_failed_memory_commit_prevents_service_restart(self):
        self.sb.uci_set('sqm.wan1.ark_engine=cake')
        self.sb.uci_set('sqm.wan1.script=layer_cake.qos')
        self.sb.uci_set('sqm.wan1.eqdisc_opts=memlimit 128M')
        init = self.root / 'etc/init.d/sqm'
        init.write_text('#!/bin/sh\ntouch "$ARK_ROOT/tmp/service-called"\n')
        init.chmod(0o755)
        r = self.sb.run_sh('. "$ARK_LIB_DIR/modules/sqm.sh"; '
                           'uci() { case "$*" in "commit sqm") return 1 ;; *) command uci "$@" ;; esac; }; '
                           'ark_sqm_restart_checked')
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse((self.root / 'tmp/service-called').exists())

    def test_external_queue_options_not_rewritten(self):
        self.sb.uci_set('sqm.wan1.ark_engine=cake')
        self.sb.uci_set('sqm.wan1.script=external.qos')
        self.sb.uci_set('sqm.wan1.eqdisc_opts=memlimit 3M')
        self.call('. "$ARK_LIB_DIR/modules/sqm.sh"; ark_sqm_sync_memory_limits')
        self.assertEqual(self.sb.uci_get('sqm.wan1.eqdisc_opts'), 'memlimit 3M')

    def test_resource_report_is_read_only(self):
        r = self.sb.run_sh('. "$ARK_LIB_DIR/common.sh"; ark_is_readonly_action sqm-resource-plan')
        self.assertEqual(r.returncode, 0, f"sqm-resource-plan should be recognized as read-only: {r.stderr}")

    def ctinfo(self, present=False, reject_ipv6=False, small=False):
        if present:
            (self.root / 'sys/module/act_ctinfo').mkdir(parents=True, exist_ok=True)
        script = ('. "$ARK_LIB_DIR/qos-resources.sh"; '
                  'modprobe() { return 1; }; '
                  'logger() { echo fallback >> "$ARK_ROOT/tmp/ctinfo-warning"; }; '
                  'tc() { printf "%s\\n" "$*" >> "$ARK_ROOT/tmp/ctinfo-tc"; ')
        if reject_ipv6:
            script += 'case "$*" in *"protocol ipv6"*) return 1 ;; esac; '
        script += 'return 0; }; ark_qos_install_ctinfo wan0 4 5 tc ' + ('1' if small else '0')
        r = self.sb.run_sh(script)
        log = self.root / 'tmp/ctinfo-tc'
        return r, log.read_text() if log.exists() else ''

    def test_missing_ctinfo_does_not_touch_filters_and_warns(self):
        r, commands = self.ctinfo()
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(commands, '')
        self.assertTrue((self.root / 'tmp/ctinfo-warning').exists())

    def test_loaded_ctinfo_installs_both_protocols(self):
        r, commands = self.ctinfo(present=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('protocol ip pref 4', commands)
        self.assertIn('protocol ipv6 pref 5', commands)
        self.assertNotIn('filter del', commands)

    def test_partial_ctinfo_failure_removes_only_its_filters(self):
        r, commands = self.ctinfo(present=True, reject_ipv6=True)
        self.assertNotEqual(r.returncode, 0)
        self.assertIn('filter del dev wan0 parent ffff: pref 4', commands)
        self.assertIn('filter del dev wan0 parent ffff: pref 5', commands)
        self.assertNotIn('pref 10', commands)

    def test_hfsc_ctinfo_packet_matching_preserved(self):
        r, commands = self.ctinfo(present=True, small=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertIn('match u16 0x0000 0xfe00 at 2', commands)
        self.assertIn('match u16 0x0000 0xfe00 at 4', commands)

    def test_file_only_ctinfo_with_load_failure_does_not_install_filters(self):
        import platform
        module = self.root / f'lib/modules/{platform.release()}/act_ctinfo.ko'
        module.parent.mkdir(parents=True)
        module.touch()
        r, commands = self.ctinfo()
        self.assertNotEqual(r.returncode, 0)
        self.assertEqual(commands, '')


if __name__ == '__main__':
    unittest.main()
