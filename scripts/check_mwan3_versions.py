#!/usr/bin/env python3
"""
Check mwan3 in 22.03, 23.05, and 24.10
"""
import urllib.request, gzip

for ver in ["22.03.7", "23.05.5", "24.10.0"]:
    url = f"https://downloads.openwrt.org/releases/{ver}/packages/x86_64/packages/Packages.gz"
    print(f"Checking {ver} at {url}...")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "curl/8.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = gzip.decompress(resp.read()).decode("utf-8", errors="ignore")
        for block in data.split("\n\n"):
            if "Package: mwan3\n" in block:
                for line in block.splitlines():
                    if any(line.startswith(k) for k in ["Package:", "Version:", "Depends:"]):
                        print(" ", line)
                break
    except Exception as e:
        print(f"Error {ver}: {e}")
