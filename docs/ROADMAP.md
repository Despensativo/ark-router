# Roadmap

> **Current Version**: `2.2.1` | **Status**: Active & Validated (ARM64 MT7986 / MT7981, MIPS, apk & opkg)

## Active Milestones (v2.2.x — Completed & Maintained)

- [x] Full V2 Cockpit & Feature Center lifecycle with state preservation across all 23 features.
- [x] Dual-engine QoS (`CAKE` vs `HFSC + FQ-CoDel Turbo`) with dynamic WAN profile calibration and gaming ports.
- [x] Triple internationalization (PT-BR, EN, ES) with Pre-Release Gate (`audit_i18n.py --strict`, 5064 keys).
- [x] Dual-generation package management (`apk` on OpenWrt 25.12+ and `opkg` on OpenWrt 19.07 - 24.10).
- [x] Strict firewall engine isolation: pure `nftables` on `fw4` and conditional fallback on legacy `fw3`.
- [x] Local fast-build pipeline (`build-apk-mac.py` / `build-ipk-wsl.sh`) bypassing cloud CI queues.

## Short Term (v2.3.0)

- Add AmneziaWG kmod integration and LuCI management interface for obfuscated WireGuard tunnels.
- Physical archive separation of dated diagnostics into `docs/archive/` to streamline context consumption for AI agents.
- Expand compatibility table populated by live router reports (see `docs/COMPATIBILITY_MATRIX.md`).
- Add proactive RAM/Flash budget pre-flight checks before installing large optional features on <= 16MB flash routers.

## Medium Term

- Gradual migration path from legacy `equipe-dashboard` internal UCI and file paths to unified `ark-router` namespace.
- Automated shell compliance suite integrated into local pre-commit hooks.
- Mesh 802.11s and DAWN / usteer band-steering dynamic wizard.

## Long Term

- Community package feed with cryptographically signed release manifests (`usign` / `apk`).
- Interactive web-based compatibility matrix maintained by user telemetry opt-in reports.
