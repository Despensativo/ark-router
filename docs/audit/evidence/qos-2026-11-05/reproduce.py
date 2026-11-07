import sys,json,re,subprocess,tempfile,pathlib,os
sys.path.insert(0,str(pathlib.Path('tests').resolve()))
from test_harness import RouterSandbox
results={}
s=RouterSandbox()
try:
    r=s.run_control('sqm-save-v2','wan=wan1|wan|eth1|1|500000|250000|ethernet|18')
    results['save_rc']=r.returncode
    s.uci_set('equipe_dashboard.settings.sqm_autorate=0')
    r=s.run_control('sqm-autorate-step','load_pct=85','delay_ms=25')
    results['autorate_step_disabled']=json.loads(r.stdout)
    results['autorate_no_samples']=json.loads(s.run_control('sqm-autorate-step').stdout)
    s.uci_set('equipe_perf.settings.flow_offload_user_disabled=1')
    s.uci_set('firewall.@defaults[0].flow_offloading=0')
    s.uci_set('firewall.@defaults[0].flow_offloading_hw=0')
    results['sqm_disable_rc']=s.run_control('sqm-toggle','0').returncode
    results['offload_after_explicit_user_disabled']=s.uci_get('firewall.@defaults[0].flow_offloading')
    s.uci_set('equipe_dashboard.settings.sqm_gaming_ports=0')
    results['audit_gaming_off_auto_dscp']=json.loads(s.run_control('system-hardware-sqm-audit').stdout)
finally:s.cleanup()
q=pathlib.Path('root/usr/lib/sqm/ark_hfsc_fqcodel.qos').resolve()
with tempfile.TemporaryDirectory(prefix='ark_qos_review_') as d:
    pathlib.Path(d,'defaults.sh').write_text('')
    log=pathlib.Path(d,'tc.log')
    script='''
. "$1"
TC=mock_tc
IP=mock_ip
mock_tc() { printf '%s\\n' "$*" >> "$AUDIT_TC_LOG"; return 1; }
mock_ip() { return 0; }
uci() { return 1; }
logger() { return 0; }
get_stab_string() { return 0; }
IFACE=pppoe-wan
LINKLAYER=none
UPLINK=10000
DOWNLINK=10000
ark_hfsc_build_tree pppoe-wan 10000 noecn egress
printf 'tree_rc=%s\\n' "$?"
'''
    env=os.environ.copy();env.update(SQM_LIB_DIR=d,AUDIT_TC_LOG=str(log))
    r=subprocess.run(['sh','-c',script,'audit',str(q)],capture_output=True,text=True,env=env)
    results['all_tc_commands_fail']=r.stdout.strip()
    results['hfsc_linklayer_none_root_command']=[x for x in log.read_text().splitlines() if 'root handle' in x]
text=pathlib.Path('root/usr/lib/ark/modules/sqm.sh').read_text()
ports=re.search(r'--dports ([\d,:]+)',text).group(1)
results['fw3_multiport_slots']=sum(2 if ':' in p else 1 for p in ports.split(','))
results['bql_512KiB_serialization_ms']={str(m):524288*8/(m*1000) for m in [1000,100,20]}
print(json.dumps(results,ensure_ascii=False,indent=2))
