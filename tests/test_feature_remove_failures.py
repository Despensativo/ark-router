#!/usr/bin/env python3
"""Exercita a rotina real de remoção com falhas injetadas, sem tocar pacotes reais."""
import os
import subprocess
import tempfile
from pathlib import Path


REPO = Path(__file__).resolve().parents[1]
SOURCE = (REPO / 'root/usr/lib/ark/modules/ezsetup.sh').read_text()
START = SOURCE.index('ark_feature_remove_internal() {')
END = SOURCE.index('\nark_enforce_saved_feature_policies()', START)
FUNCTION = SOURCE[START:END]


def run_case(tmp: Path, *, disable_rc='0', fail_commit=False, fail_apk=False):
    script = tmp / 'probe.sh'
    script.write_text('''#!/bin/sh
ark_feature_toggle_internal() { return "${ARK_TEST_DISABLE_RC:-0}"; }
uci() {
  printf '%s\\n' "$*" >> "$ARK_TEST_UCI_LOG"
  if [ "${ARK_TEST_FAIL_COMMIT:-0}" = 1 ] && [ "$1" = commit ]; then return 6; fi
  return 0
}
rm() { :; }
''' + FUNCTION + '''
ark_feature_remove_internal wol
''')
    subprocess.run(['sh', '-n', str(script)], check=True)
    uci_log = tmp / 'uci.log'
    uci_log.unlink(missing_ok=True)
    apk = tmp / 'apk'
    apk.write_text('#!/bin/sh\ncase "$1" in info) exit 0 ;; del) exit 7 ;; esac\n')
    apk.chmod(0o755)
    env = os.environ.copy()
    env.update({
        'ARK_ROOT': '' if fail_apk else str(tmp),
        'ARK_TEST_DISABLE_RC': disable_rc,
        'ARK_TEST_FAIL_COMMIT': '1' if fail_commit else '0',
        'ARK_TEST_UCI_LOG': str(uci_log),
        'PATH': str(tmp) + os.pathsep + env.get('PATH', ''),
    })
    result = subprocess.run(['sh', str(script)], env=env, capture_output=True, text=True, timeout=10)
    calls = uci_log.read_text().splitlines() if uci_log.exists() else []
    return result.returncode, calls


def main():
    with tempfile.TemporaryDirectory(prefix='ark-feature-remove-') as dirname:
        tmp = Path(dirname)
        rc, calls = run_case(tmp, disable_rc='9')
        assert rc == 9 and not calls, ('disable failure', rc, calls)

        rc, calls = run_case(tmp, fail_apk=True)
        assert rc == 1 and not calls, ('package failure', rc, calls)

        rc, calls = run_case(tmp, fail_commit=True)
        assert rc == 1 and 'commit equipe_dashboard' in calls, ('commit failure', rc, calls)

        rc, calls = run_case(tmp)
        assert rc == 0 and 'commit equipe_dashboard' in calls, ('success', rc, calls)

    print('Feature removal: 4 failure/success scenarios passed')


if __name__ == '__main__':
    main()
