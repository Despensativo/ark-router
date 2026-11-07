#!/usr/bin/env python3
"""WAN trust boundary: action order, degradation and owned-filter isolation.

Command mocks exercise failure paths. Real packet results are recorded separately.
"""
from pathlib import Path
import unittest
from test_harness import RouterSandbox


class QosIngress(unittest.TestCase):
    def setUp(self):
        self.sb = RouterSandbox()
        self.root = Path(self.sb.temp_dir)

    def tearDown(self):
        self.sb.cleanup()

    def policy(self, missing='', reject='', fallback='55:2', repeat=False):
        for name in ('act_pedit', 'act_csum', 'act_ctinfo'):
            if name != missing:
                (self.root / 'sys/module' / name).mkdir(parents=True, exist_ok=True)
        script = ('. "$ARK_LIB_DIR/qos-ingress.sh"; '
                  'modprobe() { return 1; }; logger() { :; }; '
                  'tc() { cur_s="${SILENT:-0}"; printf "%s\\n" "$*" >> "$ARK_ROOT/tmp/policy-tc"; '
                  'printf "%s|%s\\n" "$cur_s" "$*" >> "$ARK_ROOT/tmp/policy-tc-env"; ')
        if reject:
            script += f'case "$*" in *"{reject}"*) return 2 ;; esac; '
        script += f'return 0; }}; ark_qos_ingress_policy wan0 {fallback} tc'
        if repeat:
            script += f'; ark_qos_ingress_policy wan0 {fallback} tc'
        r = self.sb.run_sh(script)
        p = self.root / 'tmp/policy-tc'
        return r, p.read_text().splitlines() if p.exists() else []

    def test_sanitizes_before_restore_without_mark_or_ecn_clobber(self):
        r, lines = self.policy()
        self.assertEqual(r.returncode, 0, r.stderr)
        ip = next(i for i, x in enumerate(lines) if 'protocol ip pref 2' in x)
        ct = next(i for i, x in enumerate(lines) if 'action ctinfo' in x)
        self.assertLess(ip, ct)
        self.assertIn('priority 0 pipe action pedit ex munge ip dsfield set 0 retain 0xfc pipe action csum ip4h continue', lines[ip])
        self.assertTrue(any('ip6 traffic_class set 0 retain 0xfc continue' in x for x in lines))
        self.assertFalse(any('cpmark' in x or 'action connmark' in x for x in lines))
        self.assertNotIn('pref 10', '\n'.join(lines))
        self.assertIn('filter del dev wan0 parent ffff: pref 1', lines[-1])

    def test_no_ctinfo_keeps_sanitization_and_clears_guard(self):
        r, lines = self.policy(missing='act_ctinfo')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertFalse(any('action ctinfo' in x for x in lines))
        self.assertIn('filter del dev wan0 parent ffff: pref 1', lines[-1])

    def test_missing_pedit_or_checksum_retains_be_guard(self):
        for module in ('act_pedit', 'act_csum'):
            with self.subTest(module=module):
                r, lines = self.policy(missing=module)
                self.assertEqual(r.returncode, 0, r.stderr)
                self.assertIn('action skbedit priority 55:2 continue', lines[-1])
                self.assertFalse(any('action ctinfo' in x or 'action pedit' in x for x in lines))
                # Restore fixtures for the next subcase.
                for p in (self.root / 'sys/module').iterdir():
                    p.rmdir()
                (self.root / 'tmp/policy-tc').unlink()

    def test_partial_family_failure_removes_edits_and_keeps_guard(self):
        for family in ('protocol ip pref 2', 'protocol ipv6 pref 3'):
            with self.subTest(family=family):
                r, lines = self.policy(reject=family)
                self.assertEqual(r.returncode, 0, r.stderr)
                successful_pref = '3' if family.startswith('protocol ip ') else '2'
                self.assertEqual(lines[-1], 'filter del dev wan0 parent ffff: pref ' + successful_pref)
                self.assertFalse(any('action ctinfo' in x for x in lines))
                (self.root / 'tmp/policy-tc').unlink()

    def test_guard_install_failure_is_reported(self):
        r, lines = self.policy(reject='protocol all pref 1')
        self.assertNotEqual(r.returncode, 0)
        self.assertFalse(any('action pedit' in x for x in lines))

    def test_hfsc_guard_uses_be_class_and_repeated_apply_cleans_owned_prefs(self):
        r, lines = self.policy(fallback='1:20', repeat=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(sum('action skbedit priority 1:20 continue' in x for x in lines), 2)
        self.assertEqual(lines.count('filter del dev wan0 parent ffff: pref 9'), 2)
        self.assertNotIn('pref 10', '\n'.join(lines))

    def test_stale_filter_cleanup_uses_silent_wrapper_flag(self):
        r, lines = self.policy()
        self.assertEqual(r.returncode, 0, r.stderr)
        env_lines = (self.root / 'tmp/policy-tc-env').read_text().splitlines()
        for i in range(1, 10):
            entry = next(x for x in env_lines if f'pref {i}' in x and 'filter del' in x)
            self.assertTrue(entry.startswith('1|'), f'Expected SILENT=1 for pref {i}, got {entry}')
        guard_entry = next(x for x in env_lines if 'protocol all pref 1' in x)
        self.assertTrue(guard_entry.startswith('0|'), f'Expected SILENT=0 for guard add, got {guard_entry}')


if __name__ == '__main__':
    unittest.main()
