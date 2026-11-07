#!/usr/bin/env python3
"""Resolve only QoS dependencies from the canonical OpenWrt Makefile."""
import argparse
import os
from pathlib import Path
import re

REPO = Path(__file__).resolve().parent.parent


def qos_dependencies(with_ctinfo=None):
    choice = os.environ.get("ARK_QOS_WITH_CTINFO", "1") if with_ctinfo is None else str(with_ctinfo)
    if choice not in {"0", "1"}:
        raise ValueError("ARK_QOS_WITH_CTINFO must be 0 or 1")
    source = (REPO / "Makefile").read_text()
    names = ["ARK_QOS_BASE_DEPENDS"]
    if choice == "1":
        names.append("ARK_QOS_CTINFO_DEPENDS")
    result = []
    for name in names:
        match = re.search(r"^" + name + r":=(.+)$", source, re.MULTILINE)
        if not match:
            raise ValueError("Missing canonical dependency list: " + name)
        for token in match.group(1).split():
            if not re.fullmatch(r"\+[a-z0-9][a-z0-9+_.-]*", token):
                raise ValueError("Unsupported dependency declaration")
            if token[1:] not in result:
                result.append(token[1:])
    return result


def augment_qos_dependencies(base, package_format=None):
    package_format = package_format or ("opkg" if "," in base else "apk")
    values = [v.strip() for v in base.split(",")] if package_format == "opkg" else base.split()
    for dependency in qos_dependencies():
        if dependency not in values:
            values.append(dependency)
    return (", " if package_format == "opkg" else " ").join(v for v in values if v)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--format", choices=["opkg", "apk"], required=True)
    parser.add_argument("--base", default="")
    args = parser.parse_args()
    try:
        print(augment_qos_dependencies(args.base, args.format))
    except ValueError as error:
        parser.error(str(error))
