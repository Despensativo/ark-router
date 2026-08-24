# ARK Router package profiles

ARK Router is published in two package profiles.

Automatic install/update profile selection:

| Router resources | Selected profile |
| --- | --- |
| RAM >= 480000 KB and `/overlay` free >= 64000 KB | Full |
| Anything below that | Lite |

The SSH installer accepts `ARK_ROUTER_PROFILE=auto|lite|full`; `auto` is the default. The dashboard self-updater uses the same check and keeps Full when Full is already installed. Older pre-profile installs can move to Full automatically when the router meets the Full thresholds; otherwise they update to Lite.

## Lite: routers with less than 256 MB RAM

File aliases:

- `luci-app-ark-router.apk`
- `luci-app-ark-router-lite.apk`
- `luci-app-ark-router-<version>-r1.apk`
- `luci-app-ark-router-lite-<version>-r1.apk`

Internal package name: `luci-app-ark-router`.

Default dependencies:

| Package | Purpose | Measured installed size on tested APK firmware |
| --- | --- | ---: |
| `luci-base` | LuCI base UI/runtime | 725 KiB |
| `rpcd` | LuCI RPC backend | 61 KiB |
| `nlbwmon` | per-device traffic accounting | 46 KiB |
| `tc-full` | full traffic-control tool | 468 KiB |
| `kmod-sched-act-police` | upload policing action for guest limits | 13 KiB |
| `libbpf1` | dependency pulled by `tc-full` | 360 KiB |
| `libelf1` | dependency pulled by `tc-full` | 92 KiB |
| `luci-app-package-manager` | package manager UI | 33 KiB |
| `luci-app-attendedsysupgrade` | attended upgrade UI | 21 KiB |
| `attendedsysupgrade-common` | attended upgrade backend helper | 604 B |
| `owut` | OpenWrt upgrade helper | 86 KiB |
| `luci-app-nlbwmon` | original LuCI traffic report page | 36 KiB |
| `luci-app-sqm` | SQM LuCI UI | 9402 B |
| `sqm-scripts` | SQM backend scripts | 67 KiB |
| `kmod-ifb` | ingress shaping support | 11 KiB |
| `kmod-sched-cake` | CAKE qdisc | 36 KiB |
| `luci-app-mwan3` | Multi-WAN LuCI UI | 33 KiB |
| `mwan3` | Multi-WAN backend | 140 KiB |
| `luci-app-upnp` | UPnP LuCI UI | 13 KiB |
| `miniupnpd-nftables` | UPnP/NAT-PMP daemon | 185 KiB |
| `luci-app-uhttpd` | LuCI web server manager | 9103 B |
| `kmod-tun` | VPN/tunnel support | 64 KiB |
| `iwinfo` / `libiwinfo-data` | Wi-Fi analysis/status | 1 B / 17 KiB on tested firmware |
| `luci-i18n-*-pt-br` supported modules | Portuguese labels for installed LuCI modules | about 30 KiB total |

Expected extra installed footprint beyond LuCI base: about 1.9 MB, depending on what is already present in the firmware.

Runtime notes:

- `nlbwmon` measured around 1 MB RSS on the tested router.
- Guest download limits use `tbf`.
- Guest upload limits use `tc police`, which requires `tc-full` and `kmod-sched-act-police`.
- The package manager, OpenWrt update helpers, SQM/CAKE, Multi-WAN, UPnP, uHTTPd management, Wi-Fi info, tunnel support and supported PT-BR translations are included because each item is under 1 MB on the tested firmware.
- ZeroTier, speed tests and Argon remain installable from the dashboard.

## Full: routers with 512 MB RAM or more

File aliases:

- `luci-app-ark-router-full.apk`
- `luci-app-ark-router-full-<version>-r1.apk`

Internal package name: `luci-app-ark-router-full`.

Default dependencies:

| Package | Purpose | Measured installed size on tested APK firmware |
| --- | --- | ---: |
| Lite profile dependencies | dashboard, traffic accounting, guest limits, package manager, updater and sub-1 MB operational modules | about 1.9 MB extra |
| `zerotier` | lightweight remote access | 1001 KiB |
| `speedtest-go` | local speed test/calibration binary | 24 MiB |

Runtime notes:

- `zerotier-one` measured around 8 MB RSS on the tested router.
- `mwan3` monitors measured several small shell processes, roughly 1.5 MB RSS each on the tested router.
- `miniupnpd` measured around 1.2 MB RSS.
- `speedtest-go` is large on flash and should be avoided in Lite.
- Speedify is not bundled. It is a licensed external runtime and remains managed by ARK Router as an optional RAM/internal/external install.
- Argon is not in the tested OpenWrt APK feed. Full keeps ARK Router's Argon installer available, but Argon cannot be a hard package dependency unless the target feed provides `luci-theme-argon`.

## Tested addon version baseline

Baseline collected from the active APK-based OpenWrt test router on 2026-08-24. Treat this as a tested reference, not as a pinned dependency lock. OpenWrt snapshot/package feeds may publish newer package revisions.

| Package | Profile | Version/revision tested | Source state |
| --- | --- | --- | --- |
| `luci-base` | Lite + Full | `26.133.20346~e9ebca7` | installed |
| `rpcd` | Lite + Full | `2025.12.03~ffb9961c-r1` | installed |
| `nlbwmon` | Lite + Full | `2025.06.02~29236be6-r1` | installed |
| `tc-full` | Lite + Full | `6.18.0-r2` | installed |
| `kmod-sched-act-police` | Lite + Full | `6.12.87-r1` | installed |
| `libbpf1` | Lite + Full, pulled by `tc-full` | `1.6.2-r1` | installed |
| `libelf1` | Lite + Full, pulled by `tc-full` | `0.192-r1` | installed |
| `luci-app-package-manager` | Lite + Full | `26.133.20346~e9ebca7` | installed |
| `luci-app-attendedsysupgrade` | Lite + Full | `26.133.20346~e9ebca7` | installed |
| `attendedsysupgrade-common` | Lite + Full | `10` | installed |
| `owut` | Lite + Full | `2026.04.09~5d6760b5-r1` | installed |
| `luci-app-nlbwmon` | Lite + Full | `26.234.21967~42d72f7` | installed |
| `luci-app-sqm` | Lite + Full | `26.234.21967~42d72f7` | installed |
| `sqm-scripts` | Lite + Full, pulled by SQM | `1.7.2-r1` | installed |
| `kmod-ifb` | Lite + Full | `6.12.87-r1` | installed |
| `kmod-sched-cake` | Lite + Full | `6.12.87-r1` | installed |
| `luci-app-mwan3` | Lite + Full | `26.234.21967~42d72f7` | installed |
| `mwan3` | Lite + Full, pulled by LuCI MWAN3 | `2.12.0-r3` | installed |
| `luci-app-upnp` | Lite + Full | `26.234.21967~42d72f7` | installed |
| `miniupnpd-nftables` | Lite + Full | `2.3.9-r1` | installed |
| `luci-app-uhttpd` | Lite + Full | `26.234.21967~42d72f7` | installed |
| `kmod-tun` | Lite + Full | `6.12.87-r1` | installed |
| `iwinfo` | Lite + Full | `2026.01.14~f5dd57a8-r1` | available in feed |
| `libiwinfo-data` | Lite + Full, pulled by Wi-Fi info | `2026.01.14~f5dd57a8-r1` | installed |
| `luci-i18n-mwan3-pt-br` | Lite + Full | `26.234.21967~42d72f7` | available in feed |
| `luci-i18n-nlbwmon-pt-br` | Lite + Full | `26.234.21967~42d72f7` | available in feed |
| `luci-i18n-sqm-pt-br` | Lite + Full | `26.234.21967~42d72f7` | available in feed |
| `luci-i18n-uhttpd-pt-br` | Lite + Full | `26.234.21967~42d72f7` | available in feed |
| `luci-i18n-upnp-pt-br` | Lite + Full | `26.234.21967~42d72f7` | available in feed |
| `zerotier` | Full only | `1.16.0-r1` | installed |
| `speedtest-go` | Full only | `1.7.10-r1` | installed |

Refresh command for maintainers:

```sh
for p in luci-base rpcd nlbwmon tc-full kmod-sched-act-police libbpf1 libelf1 luci-app-package-manager luci-app-attendedsysupgrade attendedsysupgrade-common owut luci-app-nlbwmon luci-app-sqm sqm-scripts kmod-ifb kmod-sched-cake luci-app-mwan3 mwan3 luci-app-upnp miniupnpd-nftables luci-app-uhttpd kmod-tun iwinfo libiwinfo-data luci-i18n-mwan3-pt-br luci-i18n-nlbwmon-pt-br luci-i18n-sqm-pt-br luci-i18n-uhttpd-pt-br luci-i18n-upnp-pt-br zerotier speedtest-go; do
  line="$(apk list --installed "$p" 2>/dev/null | head -n1)"
  state=installed
  if [ -z "$line" ]; then state=available; line="$(apk list "$p" 2>/dev/null | head -n1)"; fi
  first="${line%% *}"
  printf '%s | %s | %s\n' "$p" "${first#$p-}" "$state"
done
```
