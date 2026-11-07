#!/usr/bin/env python3
"""QoS metadata parity and explicit opt-out for custom targets."""
import os
from pathlib import Path
import sys
import subprocess
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / 'scripts'))
from qos_package_deps import augment_qos_dependencies, qos_dependencies


class PackageQosDependencies(unittest.TestCase):
    def test_default_contains_runtime_requirements(self):
        with patch.dict(os.environ, {'ARK_QOS_WITH_CTINFO': '1'}):
            self.assertEqual(set(qos_dependencies()), {'tc-full', 'sqm-scripts', 'kmod-ifb',
                             'kmod-sched-core', 'kmod-sched-cake', 'kmod-sched-ctinfo', 'kmod-sched'})

    def test_explicit_reduced_build_only_omits_ctinfo(self):
        self.assertEqual(set(qos_dependencies('1')) - set(qos_dependencies('0')),
                         {'kmod-sched-ctinfo'})

    def test_invalid_choice_fails(self):
        for flag in ['yes', '', '2', '1;echo']:
            with self.subTest(flag=flag), self.assertRaises(ValueError):
                qos_dependencies(flag)

    def test_opkg_dependencies_preserve_existing_and_deduplicate(self):
        with patch.dict(os.environ, {'ARK_QOS_WITH_CTINFO': '1'}):
            text = augment_qos_dependencies('luci-base, tc-full, zerotier', 'opkg')
            values = text.split(', ')
            self.assertEqual(values.count('tc-full'), 1)
            self.assertIn('zerotier', values)
            self.assertIn('kmod-sched-ctinfo', values)
            self.assertEqual(text, augment_qos_dependencies(text, 'opkg'))

    def test_apk_reduced_dependencies_preserve_existing(self):
        with patch.dict(os.environ, {'ARK_QOS_WITH_CTINFO': '0'}):
            text = augment_qos_dependencies('luci-base tc-full speedtest-go', 'apk')
            self.assertNotIn('kmod-sched-ctinfo', text.split())
            self.assertIn('kmod-sched-core', text.split())
            self.assertIn('speedtest-go', text.split())
            self.assertEqual(text.split().count('tc-full'), 1)

    def test_unused_optional_modules_not_forced(self):
        self.assertFalse({'kmod-sched-act-pedit', 'kmod-sched-act-csum'} & set(qos_dependencies('1')))

    def test_makefile_lite_full_match_local_dependency_policy(self):
        repo = Path(__file__).resolve().parent.parent
        with tempfile.TemporaryDirectory(prefix='ark_package_make_') as directory:
            root = Path(directory)
            (root / 'rules.mk').touch()
            (root / 'package.mk').touch()
            probe = root / 'probe.mk'
            probe.write_text('include ' + str(repo / 'Makefile').replace(' ', '\\ ') + '\n'
                             '$(eval $(Package/luci-app-ark-router))\n'
                             'LITE_DEPS:=$(DEPENDS)\n'
                             '$(eval $(Package/luci-app-ark-router-full))\n'
                             'probe:\n\t@echo "$(LITE_DEPS)"\n\t@echo "$(DEPENDS)"\n')
            for flag in ['0', '1']:
                r = subprocess.run(['make', '-s', '-f', str(probe), 'probe',
                                    'TOPDIR=' + directory, 'INCLUDE_DIR=' + directory,
                                    'ARK_QOS_WITH_CTINFO=' + flag], capture_output=True, text=True)
                self.assertEqual(r.returncode, 0, r.stderr)
                self.assertEqual(len(r.stdout.splitlines()), 2)
                for line in r.stdout.splitlines():
                    deps = {x.lstrip('+') for x in line.split()}
                    self.assertTrue(set(qos_dependencies(flag)) <= deps)
                    self.assertEqual('kmod-sched-ctinfo' in deps, flag == '1')
            r = subprocess.run(['make', '-s', '-f', str(probe), 'probe',
                                'TOPDIR=' + directory, 'INCLUDE_DIR=' + directory,
                                'ARK_QOS_WITH_CTINFO=invalid'], capture_output=True, text=True)
            self.assertNotEqual(r.returncode, 0)


if __name__ == '__main__':
    unittest.main()
