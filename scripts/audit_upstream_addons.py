#!/usr/bin/env python3
"""
scripts/audit_upstream_addons.py - Comprehensive upstream package auditor for ARK Router.
Downloads and inspects upstream OpenWrt IPK packages for fw4 (23.05.5) and fw3 (22.03.7),
analyzing dependency declarations, control scripts, init scripts, hotplug triggers,
and firewall hooks for potential iptables/nftables leaks.
"""

import os
import sys
import gzip
import io
import re
import tarfile
import tempfile
import urllib.request
from collections import defaultdict

RELEASES = {
    "fw3": "22.03.7",
    "fw4": "23.05.5"
}

ARCH = "x86_64"

FEEDS = ["base", "packages", "luci", "routing"]

TARGET_PACKAGES = [
    "luci-app-upnp",
    "miniupnpd",
    "miniupnpd-iptables",
    "miniupnpd-nftables",
    "luci-app-mwan3",
    "mwan3",
    "luci-app-sqm",
    "sqm-scripts",
    "luci-app-nlbwmon",
    "nlbwmon",
    "wireguard-tools",
    "tailscale",
    "zerotier",
    "adblock",
    "luci-app-adblock",
    "usteer",
    "irqbalance",
    "speedtest-go"
]

def fetch_feed_index(release_ver, feed):
    url = f"https://downloads.openwrt.org/releases/{release_ver}/packages/{ARCH}/{feed}/Packages.gz"
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = gzip.decompress(resp.read()).decode("utf-8", errors="ignore")
            return data
    except Exception as e:
        print(f"[-] Error fetching {url}: {e}")
        return ""

def parse_packages_data(data, release_name, feed_name):
    packages = {}
    for block in data.split("\n\n"):
        if not block.strip():
            continue
        pkg_dict = {}
        for line in block.splitlines():
            if ": " in line:
                key, val = line.split(": ", 1)
                pkg_dict[key.strip()] = val.strip()
            elif line.startswith(" ") and "Description" in pkg_dict:
                pkg_dict["Description"] += "\n" + line.strip()
        pkg_name = pkg_dict.get("Package")
        if pkg_name:
            pkg_dict["_release"] = release_name
            pkg_dict["_feed"] = feed_name
            packages[pkg_name] = pkg_dict
    return packages

def download_ipk(release_ver, feed, filename, dest_path):
    url = f"https://downloads.openwrt.org/releases/{release_ver}/packages/{ARCH}/{feed}/{filename}"
    req = urllib.request.Request(url, headers={"User-Agent": "curl/8.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        with open(dest_path, "wb") as f:
            f.write(resp.read())

def inspect_unpacked_ipk(ipk_path, extract_dir):
    os.makedirs(extract_dir, exist_ok=True)
    findings = {
        "files": [],
        "iptables_matches": [],
        "nft_matches": [],
        "fw3_matches": [],
        "fw4_matches": [],
        "details_by_file": defaultdict(lambda: {"ipt": [], "nft": [], "fw3": [], "fw4": []})
    }

    try:
        with tarfile.open(ipk_path, "r:*") as outer_tar:
            outer_tar.extractall(path=extract_dir)
    except Exception as e:
        findings["error"] = f"Failed to extract outer IPK tar: {e}"
        return findings

    # Extract control.tar.gz
    for fname in ["control.tar.gz", "control.tar"]:
        p = os.path.join(extract_dir, fname)
        if os.path.exists(p):
            ctrl_dir = os.path.join(extract_dir, "control")
            os.makedirs(ctrl_dir, exist_ok=True)
            try:
                with tarfile.open(p, "r:*") as ct:
                    ct.extractall(path=ctrl_dir)
            except Exception:
                pass
            break

    # Extract data.tar.gz
    for fname in ["data.tar.gz", "data.tar", "data.tar.zst"]:
        p = os.path.join(extract_dir, fname)
        if os.path.exists(p):
            data_dir = os.path.join(extract_dir, "data")
            os.makedirs(data_dir, exist_ok=True)
            try:
                with tarfile.open(p, "r:*") as dt:
                    dt.extractall(path=data_dir)
            except Exception:
                pass
            break

    # Walk extracted files
    for root, dirs, files in os.walk(extract_dir):
        for f in files:
            if f.endswith((".tar.gz", ".tar", ".ipk", ".zst")):
                continue
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, extract_dir)
            findings["files"].append(rel_path)

            try:
                with open(full_path, "rb") as fp:
                    content_bytes = fp.read()
                    if b"\x00" in content_bytes[:512]:
                        continue
                    text = content_bytes.decode("utf-8", errors="ignore")
            except Exception:
                continue

            for idx, line in enumerate(text.splitlines(), start=1):
                clean = line.strip()
                if re.search(r"\b(iptables|ip6tables|iptables-restore|ip6tables-restore)\b", clean):
                    match_item = {"file": rel_path, "line": idx, "text": clean}
                    findings["iptables_matches"].append(match_item)
                    findings["details_by_file"][rel_path]["ipt"].append(match_item)

                if re.search(r"\b(nft|nftables)\b", clean):
                    match_item = {"file": rel_path, "line": idx, "text": clean}
                    findings["nft_matches"].append(match_item)
                    findings["details_by_file"][rel_path]["nft"].append(match_item)

                if re.search(r"\bfw3\b", clean):
                    match_item = {"file": rel_path, "line": idx, "text": clean}
                    findings["fw3_matches"].append(match_item)
                    findings["details_by_file"][rel_path]["fw3"].append(match_item)

                if re.search(r"\bfw4\b", clean):
                    match_item = {"file": rel_path, "line": idx, "text": clean}
                    findings["fw4_matches"].append(match_item)
                    findings["details_by_file"][rel_path]["fw4"].append(match_item)

    return findings

def audit_detail(findings, pkg_name, env_name):
    print(f"\n" + "-" * 70)
    print(f"PACKAGE: {pkg_name} [{env_name.upper()}] - DETAILED LEAK & HOOK AUDIT")
    print("-" * 70)
    print(f"Total files unpacked: {len(findings['files'])}")
    print(f"IPTABLES occurrences: {len(findings['iptables_matches'])}")
    print(f"NFTABLES occurrences: {len(findings['nft_matches'])}")
    print(f"FW3 hooks: {len(findings['fw3_matches'])}")
    print(f"FW4 hooks: {len(findings['fw4_matches'])}")

    for rel_file, items in findings["details_by_file"].items():
        if items["ipt"] or items["nft"] or items["fw4"]:
            print(f"\n  File: {rel_file}")
            if items["ipt"]:
                print(f"    * IPTABLES ({len(items['ipt'])}):")
                for it in items["ipt"][:4]:
                    print(f"       L{it['line']}: {it['text'][:90]}")
            if items["nft"]:
                print(f"    * NFTABLES ({len(items['nft'])}):")
                for it in items["nft"][:4]:
                    print(f"       L{it['line']}: {it['text'][:90]}")
            if items["fw4"]:
                print(f"    * FW4 ({len(items['fw4'])}):")
                for it in items["fw4"][:4]:
                    print(f"       L{it['line']}: {it['text'][:90]}")

def main():
    print("=" * 80)
    print("ARK ROUTER — UPSTREAM ADDONS DEEP AUDIT & COMPARISON")
    print("=" * 80)

    # 1. Fetch package indexes
    all_packages = defaultdict(dict)
    for env_name, rel_ver in RELEASES.items():
        print(f"Loading Feeds for {env_name.upper()} ({rel_ver})...")
        for feed in FEEDS:
            raw_data = fetch_feed_index(rel_ver, feed)
            parsed = parse_packages_data(raw_data, env_name, feed)
            for pkg, info in parsed.items():
                all_packages[env_name][pkg] = info

    # 2. Detailed audit of packages
    target_audit = [
        "miniupnpd",
        "miniupnpd-iptables",
        "miniupnpd-nftables",
        "luci-app-upnp",
        "mwan3",
        "luci-app-mwan3",
        "sqm-scripts",
        "luci-app-sqm",
        "tailscale",
        "wireguard-tools",
        "nlbwmon",
        "adblock"
    ]

    work_dir = tempfile.mkdtemp(prefix="ark_pkg_detail_")

    for pkg_name in target_audit:
        for env_name in ["fw3", "fw4"]:
            info = all_packages[env_name].get(pkg_name)
            if not info or not info.get("Filename"):
                continue

            rel_ver = RELEASES[env_name]
            feed = info["_feed"]
            filename = info["Filename"]
            ipk_file = os.path.join(work_dir, f"{env_name}_{filename}")
            extract_dir = os.path.join(work_dir, f"unpacked_{env_name}_{pkg_name}")

            try:
                download_ipk(rel_ver, feed, filename, ipk_file)
                findings = inspect_unpacked_ipk(ipk_file, extract_dir)
                audit_detail(findings, pkg_name, env_name)
            except Exception as e:
                print(f"[-] Error processing {pkg_name} ({env_name}): {e}")

if __name__ == "__main__":
    main()
