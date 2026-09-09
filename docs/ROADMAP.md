# Roadmap

## Short Term

- Test the published `v0.9.90` package across architectures (ARM64 MT7986, MIPS QCA9558, MT7981).
- Validate Auto-WAN dynamic sensing, Dumb AP topology switching, and SQM upload-only optimization on additional OpenWrt 24.x/25.x targets.
- Test on both `apk` (OpenWrt 25.x) and `opkg` (OpenWrt 23.x / 24.x) based releases.
- Expand compatibility table populated by live router reports.

## Medium Term

- Test more routers with limited flash and RAM.
- Add clearer package-size warnings before optional installs.
- Add more translations after Portuguese and English.
- Add a migration path from the legacy `equipe-dashboard` internal identifiers to public `ark-router` identifiers.
- Add automated checks for shell scripts in CI, including BusyBox `ash` syntax where practical.

## Long Term

- Publish signed packages through a feed.
- Add a compatibility matrix maintained by community reports.
