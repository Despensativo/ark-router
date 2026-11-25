#!/bin/sh
# Unified IPK builder wrapper — delegates to canonical zero-dependency Python packager
# so WSL, Linux CI, and macOS share 100% identical metadata, permissions, prerm, and postinst.
set -eu
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
exec python3 "${SCRIPT_DIR}/build-ipk-mac.py" "$@"
