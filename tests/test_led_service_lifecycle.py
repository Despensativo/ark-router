#!/usr/bin/env python3
"""Garante que a parada dos daemons LED alcance o procd_kill do rc.common."""

import os
from pathlib import Path
import subprocess
import tempfile
import unittest


REPO = Path(__file__).resolve().parents[1]


class LedServiceLifecycleTests(unittest.TestCase):
    def test_stop_reaches_procd_for_both_led_services(self):
        # Simula o risco observado no W6x: killall no stop_service mata o
        # próprio shell antes de rc.common alcançar procd_kill.
        with tempfile.TemporaryDirectory() as directory:
            fake_bin = Path(directory)
            for command in ('killall', 'pkill'):
                stub = fake_bin / command
                stub.write_text('#!/bin/sh\nkill -TERM "$PPID"\n')
                stub.chmod(0o755)
            environment = dict(os.environ, PATH=str(fake_bin) + os.pathsep + os.environ.get('PATH', ''))
            rc_common_stop = '''
stop_service() { :; }
procd_kill() { printf 'PROCD_KILL\\n'; }
. "$1"
stop_service
procd_kill "${1##*/}"
'''
            for name in ('ark-rainbowd', 'ark-port-ledd'):
                with self.subTest(service=name):
                    init_script = REPO / 'root/etc/init.d' / name
                    result = subprocess.run(['sh', '-c', rc_common_stop, 'test', str(init_script)],
                                            capture_output=True, text=True, env=environment, timeout=5)
                    self.assertEqual(result.returncode, 0, result.stderr)
                    self.assertEqual(result.stdout.strip(), 'PROCD_KILL')


if __name__ == '__main__':
    unittest.main()
