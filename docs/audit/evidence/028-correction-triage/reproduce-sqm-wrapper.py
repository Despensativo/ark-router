import json, os, subprocess, tempfile, hashlib
from pathlib import Path

repo = Path(__file__).resolve().parents[4]
evidence = repo / 'docs/audit/evidence/028-correction-triage'
source = (repo / 'root/usr/lib/ark/qos-ingress.sh').read_text()
wrapper = (evidence / 'sqm-wrapper-reference.sh').read_text()
old = '        "$tc_cmd" filter del dev "$dev" parent ffff: pref "$pref" 2>/dev/null || true'
new = '        SILENT=1 "$tc_cmd" filter del dev "$dev" parent ffff: pref "$pref" 2>/dev/null || true'
if new in source:
    assert source.count(new) == 1
    legacy_source = source.replace(new, old).replace('    SILENT=0\n', '')
    applied_source = source
else:
    assert source.count(old) == 1
    legacy_source = source
    applied_source = source.replace(old, new)
result = {'environment': 'local /bin/sh mock, not VM or hardware',
          'source_sha256': hashlib.sha256(source.encode()).hexdigest(),
          'wrapper_sha256': hashlib.sha256(wrapper.encode()).hexdigest(), 'cases': []}
with tempfile.TemporaryDirectory(prefix='ark028-mock-') as tmp:
    root = Path(tmp)
    fake = root / 'fake-tc'
    fake.write_text('''#!/bin/sh
case "$*" in
  *"filter del"*)
    case "$*" in
      *"pref 1") if [ -f "$CASE_DIR/guard" ]; then rm "$CASE_DIR/guard"; exit 0; fi ;;
    esac
    echo 'Cannot find filter'; exit 2 ;;
  *"protocol all pref 1"*)
    if [ "$REJECT_GUARD" = 1 ]; then echo 'Injected installation failure'; exit 2; fi
    touch "$CASE_DIR/guard" ;;
esac
exit 0
''')
    fake.chmod(0o700)
    for proposed in [False, True]:
        for reject in [False, True]:
            case = root / ('proposed' if proposed else 'current') / str(int(reject))
            case.mkdir(parents=True)
            policy = applied_source if proposed else legacy_source
            policy = policy.replace('. "${ARK_LIB_DIR:-/usr/lib/ark}/qos-resources.sh" || return 1', ': # dependency functions supplied below')
            policy_path = root / 'policy.sh'
            policy_path.write_text(policy)
            script = root / 'run.sh'
            script.write_text(wrapper + '''
SILENT=0
sqm_debug() { :; }
sqm_trace() { :; }
sqm_error() { printf '%s\\n' "$*" >> "$CASE_DIR/errors"; }
tc() { cmd_wrapper tc "$FAKE_TC" "$@"; }
ark_qos_module_present() { return 0; }
ark_qos_install_ctinfo() { return 0; }
modprobe() { return 0; }
logger() { :; }
. "$POLICY_PATH"
ark_qos_ingress_policy wan0 1:20 tc
rc=$?
printf '%s\\n' "$SILENT" > "$CASE_DIR/silent-after"
exit "$rc"
''')
            subprocess.run(['/bin/sh', '-n', str(fake)], check=True)
            subprocess.run(['/bin/sh', '-n', str(script)], check=True)
            env = dict(os.environ, CASE_DIR=str(case), FAKE_TC=str(fake), POLICY_PATH=str(policy_path), REJECT_GUARD=str(int(reject)))
            run = subprocess.run(['/bin/sh', str(script)], env=env, capture_output=True, text=True)
            errors = (case / 'errors').read_text().splitlines() if (case / 'errors').exists() else []
            item = {'proposed': proposed, 'injected_guard_failure': reject, 'returncode': run.returncode,
                    'error_messages': len(errors), 'missing_delete_errors': sum('Cannot find filter' in line for line in errors),
                    'guard_failure_visible': any('Injected installation failure' in line for line in errors),
                    'silent_after': (case / 'silent-after').read_text().strip()}
            assert run.returncode == (1 if reject else 0), item
            assert item['error_messages'] == ((0 if proposed else 18) + (2 if reject else 0)), item
            assert item['guard_failure_visible'] == reject, item
            assert item['silent_after'] == '0', item
            result['cases'].append(item)
result['all_assertions_passed'] = True
(evidence / 'sqm-wrapper-reproduction.json').write_text(json.dumps(result, indent=2) + '\n')
(evidence / 'sqm-wrapper-reference.sh').write_text(wrapper)
print(json.dumps(result))
