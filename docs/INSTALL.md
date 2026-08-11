# Installation Guide

ARK Router is distributed as an OpenWrt LuCI package. It should be built with the OpenWrt SDK or buildroot that matches the target firmware.

## Requirements

- OpenWrt with LuCI.
- `rpcd`.
- `iwinfo`.
- BusyBox `ash`.
- Enough free RAM in `/tmp` if temporary speed-test calibration is used.

The pilot installation was tested on Cudy WR3000 v1 with OpenWrt 25.12.5 and the Argon theme.

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

Open LuCI and choose ARK Router from the menu. Installing the package only adds its files and menu entry. It does not change WAN, LAN, Wi-Fi, firewall, DHCP, SQM or Multi-WAN settings automatically.

## Optional Modules

Optional cards appear when the corresponding module is available. The dashboard can suggest supported optional packages, but every installation requires confirmation.
