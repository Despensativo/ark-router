# Releases

ARK Router is a LuCI/OpenWrt package. It is not installed with an ISO image.

For the complete maintainer publishing checklist, see [`PUBLISHING.md`](PUBLISHING.md).

The easiest public distribution path is:

1. Push the source code to GitHub.
2. Create a version tag, for example `v0.9.20`.
3. Let GitHub Actions build the package with the OpenWrt SDK.
4. Publish the generated `.apk` or `.ipk` files as GitHub Release assets.
5. Install or update from the router with the SSH one-liner in `scripts/install.sh`.

For public/stable releases, prefer the generated `.apk`/`.ipk` assets because they are installed by the OpenWrt package manager. For early testing, emergency updates or a moment when the release asset has not been generated yet, use source mode over SSH. Source mode backs up ARK Router configs, preserves existing dashboard/device/QoS config files and copies only the project files into place.


If a package asset exists, use release mode:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

If GitHub Actions has not produced the package yet, use source mode:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_INSTALL_MODE=source sh
```

For a beginner-friendly command that tries the package first and falls back to source:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_INSTALL_MODE=auto sh
```

The installer detects the router package manager:

- `apk` based OpenWrt releases download `luci-app-ark-router.apk`.
- `opkg` based OpenWrt releases download `luci-app-ark-router.ipk`.

## Local Build Note

This repository does not contain a generated package binary. A real OpenWrt package must be produced by the matching OpenWrt SDK or buildroot for the target release.

The pilot router uses OpenWrt with APK v3 packages, so a normal `.tar.gz` archive is not a valid installable package. The GitHub workflow uses the official OpenWrt SDK action to build proper package artifacts.

## Tested Baseline

| Item | Value |
| --- | --- |
| Router | Cudy WR3000 v1 |
| Firmware | OpenWrt 25.12.5 r33051-f5dae5ece4 |
| Target | `mediatek/filogic` |
| CPU/package arch | `aarch64_cortex-a53` |
| Package manager | `apk` |
| Theme used in pilot | Argon |

The package is expected to work on recent OpenWrt/LuCI versions, but public releases should collect test reports by device and firmware before calling it stable.

## Screenshot Checklist

Before a public announcement, capture sanitized screenshots without private IPs, MAC addresses, Wi-Fi passwords or customer/event names:

- dashboard overview;
- WAN editor;
- SQM editor;
- Ark - Setup;
- Wi-Fi controls;
- device dialog;
- mobile layout.
