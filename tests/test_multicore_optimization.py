#!/usr/bin/env python3
"""Concorrência real entre shells e cache quente sem executar comandos do host."""
import os
import subprocess
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HELPER = ROOT / 'root/usr/lib/ark/serialized-job.sh'
CONTROL = ROOT / 'root/usr/sbin/equipe-dashboard-control'


class MulticoreOptimization(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix='ark_multicore_')
        self.path = Path(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def run_job(self, body, wait=True):
        script = '. "$HELPER"\nworker() {\n' + body + '\n}\nark_serialized_job "$JOB" worker\n'
        env = dict(os.environ, HELPER=str(HELPER), JOB=str(self.path / 'job'), TESTDIR=str(self.path))
        proc = subprocess.Popen(['sh', '-c', script], env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if not wait:
            return proc
        out, err = proc.communicate(timeout=5)
        return proc.returncode, out, err

    def test_coalesces_events_and_never_overlaps(self):
        body = '''mkdir "$TESTDIR/active" || exit 9
echo pass >> "$TESTDIR/passes"
touch "$TESTDIR/started"
while [ ! -f "$TESTDIR/release" ]; do sleep 0.02; done
rmdir "$TESTDIR/active"'''
        owner = self.run_job(body, wait=False)
        try:
            deadline = time.monotonic() + 3
            while not (self.path / 'started').exists():
                self.assertLess(time.monotonic(), deadline)
                time.sleep(0.01)
            for _ in range(12):
                self.assertEqual(self.run_job(body)[0], 75)
            (self.path / 'release').touch()
            self.assertEqual(owner.wait(timeout=5), 0)
            self.assertEqual((self.path / 'passes').read_text().splitlines(), ['pass', 'pass'])
            self.assertFalse((self.path / 'job.lock').exists())
            self.assertFalse((self.path / 'job.pending').exists())
        finally:
            if owner.poll() is None:
                (self.path / 'release').touch()
                owner.wait(timeout=5)
            owner.communicate()

    def test_error_releases_lock_and_preserves_failure(self):
        self.assertEqual(self.run_job('return 7')[0], 7)
        self.assertFalse((self.path / 'job.lock').exists())
        self.assertEqual(self.run_job('return 0')[0], 0)

    def test_contender_during_owner_pid_publication_is_quiet(self):
        (self.path / 'job.lock').mkdir()
        rc, _, err = self.run_job('return 9')
        self.assertEqual(rc, 75)
        self.assertEqual(err, b'')
        self.assertTrue((self.path / 'job.pending').exists())

    def test_dead_owner_does_not_steal_possibly_running_children(self):
        lock = self.path / 'job.lock'
        lock.mkdir()
        (lock / 'pid').write_text('99999999\n')
        rc, _, err = self.run_job('touch "$TESTDIR/unexpected"')
        self.assertEqual(rc, 1)
        self.assertIn(b'ARK:', err)
        self.assertFalse((self.path / 'unexpected').exists())

    def test_term_releases_owner_lock(self):
        owner = self.run_job('touch "$TESTDIR/started"; while :; do sleep 0.05; done', wait=False)
        deadline = time.monotonic() + 3
        while not (self.path / 'started').exists():
            self.assertLess(time.monotonic(), deadline)
            time.sleep(0.01)
        owner.terminate()
        owner.communicate(timeout=5)
        self.assertFalse((self.path / 'job.lock').exists())

    def cache_request(self, action, age, mock=False):
        tmp = self.path / 'tmp'
        lib = self.path / 'lib'
        tmp.mkdir(exist_ok=True)
        lib.mkdir(exist_ok=True)
        (lib / 'common.sh').write_text('exit 88\n')
        if action == 'doctor-status':
            if age < 120:
                (tmp / 'ark-doctor-last.json').write_text('{"cached":true}\n')
        else:
            name_map = {
                'device-fingerprints': 'ark-fp-cache',
                'device-stations': 'ark-stations-cache',
                'wifi-stations': 'ark-stations-cache',
                'mwan-status-fast': 'ark-mwan-cache',
                'system-perf-status': 'ark-perf-cache',
                'system-hardware-info': 'ark-hw-cache',
            }
            name = name_map[action]
            (tmp / (name + '.json')).write_text('{"cached":true}\n')
            (tmp / (name + '.ts')).write_text(str(int(time.time()) - age) + '\n')
        if mock:
            (tmp / 'ark_mock_stations.json').write_text('[]\n')
        return subprocess.run(['sh', str(CONTROL), action], env=dict(os.environ, ARK_ROOT=str(self.path), ARK_LIB_DIR=str(lib)), capture_output=True, timeout=5)

    def test_hot_cache_skips_dependency_loading(self):
        for action in ['device-fingerprints', 'device-stations', 'wifi-stations', 'mwan-status-fast', 'system-perf-status', 'system-hardware-info', 'doctor-status']:
            with self.subTest(action=action):
                result = self.cache_request(action, 1)
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertEqual(result.stdout, b'{"cached":true}\n')

    def test_doctor_auto_coalesces_immediately_when_locked(self):
        tmp = self.path / 'tmp'
        lib = self.path / 'lib'
        tmp.mkdir(exist_ok=True)
        lib.mkdir(exist_ok=True)
        (lib / 'common.sh').write_text('exit 88\n')
        lockdir = tmp / 'ark-doctor.lockdir'
        lockdir.mkdir(exist_ok=True)
        (lockdir / 'pid').write_text(f'{os.getpid()}\n')
        for args in [['ark-doctor', '--auto'], ['ark-doctor', '--json', '--auto'], ['audit-system', '--json', 'auto']]:
            result = subprocess.run(
                ['sh', str(CONTROL), *args],
                env=dict(os.environ, ARK_ROOT=str(self.path), ARK_LIB_DIR=str(lib)),
                capture_output=True,
                timeout=5,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_readonly_classifier_handles_arg_order_and_asu_toggle(self):
        common_sh = ROOT / 'root/usr/lib/ark/common.sh'
        script = f'''
. "{common_sh}"
ark_is_readonly_action ark-doctor --json && echo "ro1=0" || echo "ro1=1"
ark_is_readonly_action ark-doctor --json --fix && echo "ro2=0" || echo "ro2=1"
ark_is_readonly_action audit-system --json --auto && echo "ro3=0" || echo "ro3=1"
ark_is_readonly_action asu-check-status && echo "ro4=0" || echo "ro4=1"
ark_is_readonly_action asu-check-toggle 1 && echo "ro5=0" || echo "ro5=1"
'''
        res = subprocess.run(['sh', '-c', script], capture_output=True, text=True, timeout=5)
        self.assertEqual(res.returncode, 0, res.stderr)
        self.assertIn('ro1=0', res.stdout)
        self.assertIn('ro2=1', res.stdout)
        self.assertIn('ro3=1', res.stdout)
        self.assertIn('ro4=0', res.stdout)
        self.assertIn('ro5=1', res.stdout)

    def test_expired_and_future_cache_fall_back(self):
        for age in [120, 1000, -60]:
            with self.subTest(age=age):
                self.assertEqual(self.cache_request('device-stations', age).returncode, 88)

    def test_station_mock_is_not_hidden_by_cache(self):
        self.assertEqual(self.cache_request('device-stations', 1, mock=True).returncode, 88)

    def test_concurrent_cache_writers_publish_complete_output(self):
        source = (ROOT / 'root/usr/lib/ark/modules/devices.sh').read_text()
        for func, raw in [('device_get_stations', 'device_get_stations_raw'),
                          ('get_device_fingerprints', 'get_device_fingerprints_raw')]:
            wrapper = source.split(func + '() {', 1)[1].split('\n}\n', 1)[0]
            (self.path / 'tmp').mkdir(exist_ok=True)
            script = func + '() {' + wrapper + '\n}\n' + raw + '''() {
sleep 0.05
printf '{"complete":true}\\n'
}
''' + func
            env = dict(os.environ, ARK_ROOT=str(self.path))
            writers = [subprocess.Popen(['sh', '-c', script], env=env, stdout=subprocess.PIPE,
                                        stderr=subprocess.PIPE) for _ in range(8)]
            for proc in writers:
                out, err = proc.communicate(timeout=5)
                self.assertEqual(proc.returncode, 0, err)
                self.assertEqual(out, b'{"complete":true}\n')
            self.assertFalse(list((self.path / 'tmp').glob('*.tmp')))


if __name__ == '__main__':
    unittest.main(verbosity=2)

