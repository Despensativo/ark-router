#!/usr/bin/env python3
"""Inspect generated Lite/Full IPK/APK QoS dependencies and shared payload."""
from pathlib import Path
import subprocess,tarfile,io,re,json,hashlib
import argparse,shutil
parser=argparse.ArgumentParser(description='Inspect local QoS package matrix without installing packages')
parser.add_argument('--directory',type=Path,required=True)
parser.add_argument('--apk-tool',default=shutil.which('apk'))
parser.add_argument('--version',default=(Path(__file__).resolve().parent.parent/'VERSION').read_text().strip()+'-r1')
args=parser.parse_args()
if not args.apk_tool:
 parser.error('--apk-tool is required when apk is not in PATH')
repo=Path(__file__).resolve().parent.parent
out=args.directory
required={'tc-full','sqm-scripts','kmod-ifb','kmod-sched-core','kmod-sched-cake'}
result=[]
for mode in ['standard','reduced']:
 for fmt in ['ipk','apk']:
  for profile,suffix in [('lite',''),('full','-full')]:
   p=out/(fmt+'-'+mode)/('luci-app-ark-router'+suffix+'-'+args.version+'.'+fmt)
   if fmt=='ipk':
    with tarfile.open(p) as outer:
     control=outer.extractfile('./control.tar.gz').read();payload=outer.extractfile('./data.tar.gz').read()
    with tarfile.open(fileobj=io.BytesIO(control)) as t:
     name=next(n for n in t.getnames() if n.lstrip('./')=='control');control_text=t.extractfile(name).read().decode()
    deps={v.strip() for v in re.search(r'^Depends: (.+)$',control_text,re.M).group(1).split(',')}
    with tarfile.open(fileobj=io.BytesIO(payload)) as t:
     names={n.lstrip('./'):n for n in t.getnames()}
     for file in ['usr/lib/ark/qos-resources.sh','usr/lib/sqm/ark_hfsc_fqcodel.qos']:
      assert t.extractfile(names[file]).read()==(repo/'root'/file).read_bytes(),(p,file)
    payload_verified=True
   else:
    r=subprocess.run([args.apk_tool,'adbdump',str(p)],capture_output=True,text=True,check=True)
    m=re.search(r'^  depends:.*\n((?:    - .*\n)+)',r.stdout,re.M);assert m,p
    deps={x.strip()[2:] for x in m.group(1).splitlines()}
    payload_verified='qos-resources.sh' in r.stdout and 'ark_hfsc_fqcodel.qos' in r.stdout
   assert required<=deps,(p,required-deps)
   assert ('kmod-sched-ctinfo' in deps)==(mode=='standard'),p
   assert payload_verified,p
   result.append({'format':fmt,'mode':mode,'profile':profile,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'size_bytes':p.stat().st_size,'qos_dependencies':sorted(deps & (required|{'kmod-sched-ctinfo'})),'payload_verified':payload_verified})
(out/'package-inspection.json').write_text(json.dumps(result,indent=2)+'\n')
print('Verified',len(result),'local packages; Lite/Full, IPK/APK, standard/reduced; shared runtime included.')
