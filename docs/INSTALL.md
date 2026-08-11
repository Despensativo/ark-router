# Installation Guide

ARC Router is distributed as an OpenWrt LuCI package. It should be built with the OpenWrt SDK or buildroot that matches the target firmware.

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

The script detects `apk` or `opkg`, downloads the latest package from GitHub Releases and restarts `rpcd`. This only works after a matching release asset has been published.

## Build With OpenWrt SDK

Copy this package into a package feed, refresh feeds if needed, then select it under LuCI applications.

```sh
make menuconfig
make package/luci-app-ark-router/compile V=s
```

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

## After Installation

Open LuCI and choose ARC Router from the menu. Installing the package only adds its files and menu entry. It does not change WAN, LAN, Wi-Fi, firewall, DHCP, SQM or Multi-WAN settings automatically.

## Optional Modules

Optional cards appear when the corresponding module is available. The dashboard can suggest supported optional packages, but every installation requires confirmation.

## Uninstall

Use the conservative uninstaller:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | sh
```

This removes ARC Router files, menu entries, helper scripts and temporary runtime files. It does not remove optional packages such as:

- `luci-app-sqm`
- `luci-app-mwan3`
- `luci-app-nlbwmon`
- `luci-app-upnp`
- `luci-theme-argon`
- `luci-app-uhttpd`
- `speedtest-go`

Before removing files, the script creates a small backup in `/tmp`:

```text
/tmp/arc-router-config-backup-YYYYMMDD-HHMMSS.tar.gz
```

It includes:

- `/etc/config/equipe_dashboard`
- `/etc/config/equipe_devices`
- backup metadata and restore notes

Download it before rebooting if you want a local copy:

```sh
scp root@ROUTER_IP:/tmp/arc-router-config-backup-*.tar.gz .
```

Saved dashboard preferences and friendly device names are preserved:

- `/etc/config/equipe_dashboard`
- `/etc/config/equipe_devices`

To remove those saved ARC Router preferences too:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | PURGE=1 sh
```

To restore a backup:

```sh
tar -xzf /tmp/arc-router-config-backup-YYYYMMDD-HHMMSS.tar.gz -C /
/etc/init.d/rpcd restart
```

To preview what would happen without changing the router:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | DRY_RUN=1 sh
```
