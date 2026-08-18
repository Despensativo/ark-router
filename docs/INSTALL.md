# Installation Guide

ARK Router is distributed as an OpenWrt LuCI package. It should be built with the OpenWrt SDK or buildroot that matches the target firmware.

## Requirements

- OpenWrt with LuCI.
- `rpcd`.
- `iwinfo`.
- BusyBox `ash`.
- Enough free RAM in `/tmp` if temporary speed-test calibration is used.

The pilot installation was tested on Cudy WR3000 v1 with OpenWrt 25.12.5 and the Argon theme.

## Quick Install From GitHub Releases

When release packages are available, use:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

The script detects `apk` or `opkg`, downloads the latest package from GitHub Releases and restarts LuCI services. Re-running the same command updates ARK Router from the latest published release.

If the release asset has not been generated yet, install or update from source:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_INSTALL_MODE=source sh
```

Or try release first and automatically fall back to source:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_INSTALL_MODE=auto sh
```

Source mode creates a temporary backup under `/tmp/ark-router-install-backup-*.tar.gz`, preserves existing `/etc/config/equipe_dashboard`, `/etc/config/equipe_devices` and `/etc/config/qos_equipe`, copies the repository `root/` files into the router and restarts LuCI services. It is useful for development and early testing, but it does not register an `apk`/`opkg` package. For public/stable installs, prefer published package assets.

ARK Router is not installed with an `.iso`. The router downloads or receives a package file built for OpenWrt:

- `.apk` on newer APK-based OpenWrt builds.
- `.ipk` on older OPKG-based OpenWrt builds.

See [`RELEASES.md`](RELEASES.md) for the GitHub Actions release flow.
Maintainers should also read [`PUBLISHING.md`](PUBLISHING.md) before publishing a new GitHub Release.

## Build With OpenWrt SDK

Copy this package into a package feed, refresh feeds if needed, then select it under LuCI applications.

```sh
make menuconfig
make package/luci-app-ark-router/compile V=s
```

For normal public distribution, prefer the repository GitHub Actions workflow instead of building manually on a desktop. The workflow builds the package with the OpenWrt SDK when a `v*` tag is pushed and attaches the resulting package assets to the GitHub Release.

## Install On The Router

Install the generated package with the package manager used by the target release.

```sh
apk add ./luci-app-ark-router-*.apk
/etc/init.d/rpcd restart
```

For `opkg` based releases:

```sh
opkg install ./luci-app-ark-router_*.ipk
/etc/init.d/rpcd restart
```

## Update From The Dashboard

Open **ARK Router → Recursos → Atualização do ARK Router** and click **Verificar atualização**.
If the GitHub Release version is newer than the installed version, ARK Router offers **Atualizar agora**.

The updater downloads from:

- `https://github.com/Despensativo/ark-router/releases/latest/download/luci-app-ark-router.apk`
- `https://github.com/Despensativo/ark-router/releases/latest/download/luci-app-ark-router.ipk`

Before installing, it saves a temporary backup under `/tmp/ark-router-before-self-update-*.tar.gz`.
The update restarts `rpcd`/`uhttpd` and reloads the panel, but it does not alter router network configuration.

## After Installation

Open LuCI and choose ARK Router from the menu. Installing the package only adds its files and menu entry. It does not change WAN, LAN, Wi-Fi, firewall, DHCP, SQM or Multi-WAN settings automatically.

For a new router, use **Ark - Setup** from the dashboard or configure manually in this order:

1. Confirm that the router is reachable and LuCI is working normally.
2. Install only the optional modules needed for the scenario, such as SQM, Multi-WAN, nlbwmon or Argon.
3. Configure WAN, LAN and Wi-Fi according to the site plan.
4. If SQM is used, run speed calibration or manually set conservative upload/download values.
5. Apply guest limits, device priority, Wi-Fi channel suggestions or Multi-WAN mode only after reviewing the confirmation prompts.

Ark - Setup stores a draft, applies changes only after confirmation and keeps a checkpoint of the last completed step. It also creates a safety backup before applying network changes:

```text
/tmp/ark-router-ezsetup-backup-YYYYMMDD-HHMMSS.tar.gz
```

Download that backup before rebooting if you want a local copy.

The dashboard can help apply common actions, but it is intentionally not a blind first-boot configurator.

## Optional Modules

Optional cards appear when the corresponding module is available. The dashboard can suggest supported optional packages, but every installation requires confirmation.

When a supported module is already installed, Ark - Setup and the feature center show it as installed instead of offering a checkbox to install it again.

## Uninstall

Use the conservative uninstaller:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | sh
```

This removes ARK Router files, menu entries, helper scripts and temporary runtime files. It does not remove optional packages such as:

- `luci-app-sqm`
- `luci-app-mwan3`
- `luci-app-nlbwmon`
- `luci-app-upnp`
- `luci-theme-argon`
- `luci-app-uhttpd`
- `speedtest-go`

Before removing files, the script creates a small backup in `/tmp`:

```text
/tmp/ark-router-config-backup-YYYYMMDD-HHMMSS.tar.gz
```

It includes:

- `/etc/config/equipe_dashboard`
- `/etc/config/equipe_devices`
- backup metadata and restore notes

Download it before rebooting if you want a local copy:

```sh
scp root@ROUTER_IP:/tmp/ark-router-config-backup-*.tar.gz .
```

Saved dashboard preferences and friendly device names are preserved:

- `/etc/config/equipe_dashboard`
- `/etc/config/equipe_devices`

To remove those saved ARK Router preferences too:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | PURGE=1 sh
```

To restore a backup:

```sh
tar -xzf /tmp/ark-router-config-backup-YYYYMMDD-HHMMSS.tar.gz -C /
/etc/init.d/rpcd restart
```

To preview what would happen without changing the router:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | DRY_RUN=1 sh
```


