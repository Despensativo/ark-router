# Roadmap

## Short Term

- Test the published `v0.9.22` package on a clean router install, not only on the pilot router.
- Test on at least one `opkg` based OpenWrt release.
- Add a compatibility table populated by real router reports.
- Add optional advanced `iperf3` calibration with a user-provided server.

## Medium Term

- Test more routers with limited flash and RAM.
- Add clearer package-size warnings before optional installs.
- Add more translations after Portuguese and English.
- Add a migration path from the legacy `equipe-dashboard` internal identifiers to public `ark-router` identifiers.
- Add automated checks for shell scripts in CI, including BusyBox `ash` syntax where practical.

## Long Term

- Publish signed packages through a feed.
- Add a compatibility matrix maintained by community reports.
