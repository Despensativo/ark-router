# ARK Router

![OpenWrt](https://img.shields.io/badge/OpenWrt-LuCI-00B5E2?logo=openwrt&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![Language](https://img.shields.io/badge/UI-PT--BR%20%2F%20EN-blue)
![Status](https://img.shields.io/badge/status-pilot%20release-orange)

ARK Router is a responsive, bilingual and modular operational dashboard for OpenWrt/LuCI. It was created to make event and field routers easier to operate when the network has multiple WAN links, Starlink or mobile links, guest Wi-Fi limits, SQM/CAKE and non-technical people checking the router during the day.

The project does not replace LuCI. It adds a cleaner operations home screen on top of LuCI, with safer shortcuts for common actions.

Keywords: OpenWrt dashboard, LuCI dashboard, router panel, router management, Multi-WAN, mwan3, SQM, CAKE QoS, Wi-Fi channel analyzer, Starlink router, guest Wi-Fi, bandwidth management, OpenWrt monitoring, OpenWrt UI, OpenWrt plugin.

## Why Use It

- **Operations view:** See WAN, LAN, Wi-Fi, device, traffic and router-health information on one screen.
- **Modular cards:** Keep Multi-WAN, SQM/CAKE, UPnP, per-device usage and speed calibration visible only when those modules exist.
- **Device handling:** Rename connected devices, reserve DHCP addresses by MAC and prioritize selected main-network devices.
- **Wi-Fi control:** Manage a main network and a guest network from a simpler screen. The SSID names are fully configurable; the pilot names are only examples.
- **Ark - Setup:** Guided first-configuration assistant with saved progress and final confirmation.
- **Channel planning:** Analyze Wi-Fi channels manually, apply suggested channels with confirmation or return to automatic channel selection.
- **SQM calibration:** Run per-WAN speed tests and generate SQM upload suggestions at 85%, 90% and 95%.
- **Small-flash friendly:** Avoid filling router flash by loading `speedtest-go` into temporary RAM.
- **Bilingual UI:** Use Portuguese (Brazil) or English.
- **Theme aware:** Follow the active LuCI theme automatically, use ARK Router colors or choose custom colors.

## Screenshots

Screenshots are stored in [`docs/screenshots`](docs/screenshots). The first public release should include:

- Dashboard overview.
- Wi-Fi cards and password controls.
- Multi-WAN mode selector.
- Device configuration dialog.
- Speed-test calibration result.
- Mobile layout.

## Tested Device

The current pilot has been tested on:

| Item | Value |
| --- | --- |
| Router | Cudy WR3000 v1 |
| Firmware | OpenWrt 25.12.5 r33051-f5dae5ece4 |
| Target | `mediatek/filogic` |
| Package manager | `apk` |
| LuCI theme used during testing | Argon |
| Main SSID used in the pilot | `Equipe-X` |
| Guest SSID used in the pilot | `Equipe-X-Visitantes` |

The SSIDs above are not requirements. They document the pilot environment only. ARK Router reads and manages whichever Wi-Fi names are configured on the router. Pilot passwords, private IPs, backups and router-specific secrets are intentionally not included in this repository.

## Compatibility

Known-good baseline:

- OpenWrt 25.12.x with LuCI, `rpcd` and `iwinfo`.
- BusyBox `ash`.
- Standard LuCI JavaScript view environment.

Expected but not yet fully certified:

- Recent OpenWrt releases with LuCI and either `apk` or `opkg`.
- Routers with enough RAM to temporarily extract `speedtest-go` into `/tmp`.

Not guaranteed:

- Old LuCI versions without the JavaScript view APIs used here.
- Very small devices with too little RAM for temporary speed-test extraction.
- Non-OpenWrt vendor firmware.

The package manager adapter supports both `apk` and `opkg` for optional package detection and installation. The temporary `speedtest-go` preparation is optimized for OpenWrt `apk` repositories because the tested firmware stores package indexes in volatile storage.

## Features

| Area | What ARK Router Adds |
| --- | --- |
| Dashboard | Responsive overview for desktop, tablet and mobile |
| Ark - Setup | Guided first setup with resumable draft, checkpoints and safety backup |
| Traffic | Real-time download/upload counters and 24-hour history |
| Health | Temperature, memory, storage and load strip |
| WAN | WAN1/WAN2 status and Multi-WAN mode controls |
| LAN | Wired LAN port status |
| Wi-Fi | Main and guest cards, password visibility, password editing, country selection and channel analysis |
| Devices | Friendly names, per-device traffic when available and DHCP reservation by MAC |
| QoS | Optional CAKE priority marking for selected main-network devices |
| SQM | SQM/CAKE toggle and editable WAN/guest limits; `0` means unlimited for that direction |
| HTTPS | Redirect control and local CA download guidance |
| System | Router restart button with two confirmations and a backend-enforced delay |
| Modules | Optional feature center with install/hide suggestions |

## Optional Integrations

| Feature | Package |
| --- | --- |
| SQM / CAKE | `luci-app-sqm` |
| Multi-WAN | `luci-app-mwan3` |
| Per-device usage | `luci-app-nlbwmon` |
| UPnP / NAT-PMP | `luci-app-upnp` |
| Argon theme | `luci-theme-argon` |
| uHTTPd LuCI manager | `luci-app-uhttpd` |
| Link testing | `speedtest-go`, loaded into temporary memory |

Optional packages are not hard dependencies. Cards are displayed only when the corresponding capability exists. The dashboard asks for confirmation before installing an optional package. Package installation does not automatically alter network configuration.

## First Configuration

Installing ARK Router only adds the dashboard and helper files. It does not automatically create WAN2, guest Wi-Fi limits, SQM queues, Multi-WAN policies or firewall priority rules.

Those changes require administrator action inside LuCI/ARK Router. The easiest path is the **Ark - Setup** button at the top of the dashboard.

Ark - Setup asks for the common first-run choices:

- scenario/profile;
- router and panel name;
- regulatory country;
- unified or split 2.4/5 GHz Wi-Fi names;
- main Wi-Fi SSID and password;
- optional guest Wi-Fi with optional upload cap;
- WAN2 on LAN1 as DHCP, failover or balancing intent;
- SQM strategy and optional manual speed limits;
- DNS mode;
- IPv6 and WPS preferences;
- optional modules that the administrator may install separately.
- confirmed installation of selected optional modules, with progress tracking.

The assistant saves a draft in UCI and stores the last applied checkpoint. If the browser disconnects while Wi-Fi or network services reload, the administrator can reconnect and continue from the saved state. Optional modules can be installed from inside Ark - Setup, but only after confirmation. Before applying network changes, it creates a backup under `/tmp/ark-router-ezsetup-backup-*.tar.gz`.

The manual flow remains:

1. Install the dashboard.
2. Install only the optional modules you want, such as SQM, Multi-WAN or per-device usage.
3. Review the current router state in the dashboard.
4. Run speed calibration if SQM limits are needed.
5. Apply confirmed changes, such as guest upload limits, WAN mode, Wi-Fi channel suggestions or device priority.

This keeps public installations safe while still allowing a guided setup similar to the tested pilot scenario.

## Wi-Fi Names And QoS

ARK Router does not require the pilot SSID names. It can be used with the administrator's own Wi-Fi names. The main/guest split is useful when the operator wants a more open trusted network and a limited guest network, but QoS/SQM and device priority remain optional. If SQM or the custom QoS rules are not present, those controls are hidden instead of forcing a configuration.

## Safety Model

Installing ARK Router does not automatically change WAN, LAN, Wi-Fi, firewall, DHCP, SQM or Multi-WAN settings. Monitoring and dashboard views are read-only. Network changes happen only after an administrator uses a confirmed action, such as changing Wi-Fi passwords, applying channel suggestions, changing Multi-WAN mode, applying SQM speed suggestions or restarting the router.

See [`docs/SECURITY.md`](docs/SECURITY.md) for the command validation model.

## Building

Place this repository inside an OpenWrt package feed, select `luci-app-ark-router`, and build it using the normal OpenWrt SDK or buildroot workflow.

```text
make menuconfig
LuCI -> Applications -> luci-app-ark-router
make package/luci-app-ark-router/compile V=s
```

## Installation

Install the generated package using the package manager appropriate for the OpenWrt release. After installation, clear the LuCI cache or restart `rpcd`, then open ARK Router in the LuCI menu.

When release packages are available, the simplest path is the installer script:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

The installer detects `apk` or `opkg`, downloads the latest compatible release package and restarts `rpcd`. Until a release package exists for your firmware family, build the package with the OpenWrt SDK:

```sh
apk add ./luci-app-ark-router-*.apk
/etc/init.d/rpcd restart
```

On `opkg` based releases, install the generated `.ipk` instead.

## Uninstall

ARK Router includes a conservative uninstaller:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | sh
```

By default it removes only ARK Router files and temporary runtime files. It does not remove optional packages that may have been installed or used with the dashboard, such as SQM, Multi-WAN, nlbwmon, UPnP, Argon, uHTTPd or `speedtest-go`.

Before removing anything, the script creates a small backup in `/tmp` with ARK Router preferences and friendly device names. Download it before rebooting the router if you want to keep a copy:

```sh
scp root@ROUTER_IP:/tmp/ark-router-config-backup-*.tar.gz .
```

Saved dashboard preferences and friendly device names are kept by default. To remove those too:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | PURGE=1 sh
```

To restore a saved ARK Router preference backup:

```sh
tar -xzf /tmp/ark-router-config-backup-YYYYMMDD-HHMMSS.tar.gz -C /
/etc/init.d/rpcd restart
```

## Project Status

Version 0.9.0 is a tested pilot release. It is ready to publish as an early public project, with the current compatibility limits documented above. Additional router models and OpenWrt releases should be tracked through GitHub issues before calling it broadly stable.

## License

This project is released under the MIT License. See [`LICENSE`](LICENSE).
