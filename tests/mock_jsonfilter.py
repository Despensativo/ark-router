#!/usr/bin/env python3
"""
Lightweight mock of OpenWrt's jsonfilter for offline local tests.
"""
import sys
import json

def main():
    args = sys.argv[1:]
    pattern = ""
    input_str = ""
    i = 0
    while i < len(args):
        if args[i] in ("-e", "--expr") and i + 1 < len(args):
            pattern = args[i+1]
            i += 2
        elif args[i] in ("-i", "--input") and i + 1 < len(args):
            try:
                with open(args[i+1], "r", encoding="utf-8") as f:
                    input_str = f.read()
            except:
                pass
            i += 2
        else:
            i += 1

    if not input_str:
        input_str = sys.stdin.read()
    if not input_str.strip():
        sys.exit(0)

    try:
        data = json.loads(input_str)
    except:
        sys.exit(0)

    if pattern in ("@.l3_device", '@["l3_device"]'):
        val = data.get("l3_device", "")
        if val:
            print(val)
    elif "ipv4-address" in pattern and "address" in pattern:
        ips = data.get("ipv4-address", [])
        if ips and isinstance(ips, list) and len(ips) > 0:
            print(ips[0].get("address", ""))
    elif "route" in pattern and "nexthop" in pattern:
        routes = data.get("route", [])
        for r in routes:
            if r.get("target") == "0.0.0.0" and "nexthop" in r:
                print(r["nexthop"])
                break
    elif pattern in ("@.up", '@["up"]'):
        print("1" if data.get("up") else "0")
    elif "dns-server" in pattern:
        dns = data.get("dns-server", [])
        if isinstance(dns, list):
            for d in dns:
                print(d)
    else:
        key = pattern.strip("@.[]\"'")
        if isinstance(data, dict) and key in data:
            print(data[key])

if __name__ == "__main__":
    main()
