# Installation Guide

ARK Router is distributed as an OpenWrt LuCI package. It should be built with the OpenWrt SDK or buildroot that matches the target firmware.

## Requirements

- OpenWrt with LuCI.
- `rpcd`.
- `kmod-tun` for Speedify/VPN tunnel support. It is optional for the dashboard itself and is installed/verified only when Speedify/VPN tunneling is used.
- `nlbwmon` for per-device traffic accounting. Release package installs pull it as a dependency when the package manager can resolve it.
- `iwinfo` is recommended for Wi-Fi intelligence features, but it is not a hard package dependency.
- BusyBox `ash`.
- Enough free RAM in `/tmp` if temporary speed-test calibration is used.

The pilot installation was tested on Cudy WR3000 v1 with OpenWrt 25.12.5 and the Argon theme.

## Quick Install From GitHub Releases

When release packages are available, use:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

The script defaults to `auto` mode: it detects `apk` or `opkg`, tries the latest package from GitHub Releases and falls back to source installation if the package manager cannot resolve dependencies while offline. Re-running the same command updates ARK Router from the latest published release/source.

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

## Build Local APK With OpenWrt SDK

ARK Router is a LuCI/files package, so the local tested path uses the OpenWrt SDK `apk mkpkg` tool and does not compile firmware or kernel modules.

```sh
scripts/build-apk-wsl.sh
```

The script creates `dist/sdk/luci-app-ark-router.apk` and a versioned APK. It uses `scripts/build-apk-manual-wsl.sh` internally and requires the matching OpenWrt SDK only for the `apk` packaging tool/signing key.

For normal public distribution, prefer the repository GitHub Actions workflow instead of building manually on a desktop. The workflow should attach the generated package assets to the GitHub Release.

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

### Optional Tailscale remote access

Use **ARK Router → Recursos → Tailscale remoto** when remote administration is needed from iOS, Windows or another network.

The flow is:

1. Install Tailscale from the dashboard.
2. Click **Parear / anunciar LAN**.
3. Open the generated login URL.
4. Approve the router in Tailscale.
5. Approve the advertised subnet route in the Tailscale admin panel.

ARK Router does not open LuCI or SSH on the WAN. It advertises the current LAN subnet through Tailscale so administrators can access the router LAN over the private Tailscale network.

OpenWrt `luci-i18n-*` language packages are optional. ARK Router ships an English fallback and uses its own selected runtime language, so the dashboard does not depend on LuCI translation packages. On space-constrained routers, keeping only the selected ARK language plus English is the recommended model; original LuCI module pages may remain in English when their `luci-i18n-*` packages are not installed.

### Optional Speedify recovery

If Speedify is used, enable **auto recovery after reboot** only after choosing and testing a supported mode. On small routers the usual safe mode is RAM, which does not occupy flash but must be reloaded after every reboot. With auto recovery enabled, ARK Router enables `/etc/init.d/ark-speedify` and tries to reload the saved mode during boot.

Recovery behavior:

- internal mode starts the existing official Speedify service only; it does not run the official installer automatically;
- external mode starts the extracted runtime from the saved external mount;
- RAM mode downloads/extracts the runtime again into `/tmp` when there is enough free RAM and the router has network access.

If Speedify is not logged in or licensed, recovery can start the daemon but the state may remain `LOGGED_OUT`.

For offline-assisted setup, preload the official Speedify package at `/tmp/ark-speedify-cache/speedify.apk`. ARK Router reuses that file if present instead of deleting it before download. The runtime start also checks `/dev/net/tun`; when possible it installs `kmod-tun`, otherwise it reports a clear error. The Speedify firewall zone is always reinforced with masquerading and MTU fix so LAN clients can navigate through the tunnel.

The dashboard also has a live **Speedify active now** switch. It starts or stops the current Speedify runtime without changing the auto-recovery choice. If the runtime disappeared after reboot and a saved mode exists, turning the switch on attempts to recover that mode first.

To sign in, use the dashboard button **Parear / login**. It generates the official Speedify router activation URL through `speedify_cli activationcode`. Open that URL in a browser, sign in on Speedify's portal and then return to ARK Router to use **Verificar conta**. Do not enter Speedify account passwords in ARK Router; the dashboard intentionally does not store them.

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
