# Publishing ARK Router on GitHub

This document describes the recommended public release flow for ARK Router.

ARK Router is an OpenWrt/LuCI package. It is not an ISO image and it is not an Android APK. On newer OpenWrt builds, `.apk` means the OpenWrt package format used by the router package manager.

## Recommended Release Model

Use GitHub Releases as the public distribution channel:

1. Keep source code on the `main` branch.
2. Update `VERSION`, `Makefile`, `CHANGELOG.md` and runtime version files.
3. Commit and push to GitHub.
4. Create and push a version tag such as `v0.9.23`.
5. Let GitHub Actions build the OpenWrt package.
6. Confirm that the Release contains:
   - `luci-app-ark-router.apk`
   - versioned `.apk`, such as `luci-app-ark-router-0.9.23-r1.apk`
   - `.ipk` assets when the workflow/build target produces them.
7. Test the SSH installer from a router.

The current workflow is `.github/workflows/build-packages.yml`. It runs on:

- manual `workflow_dispatch`;
- pushed tags matching `v*`.

## Before Publishing

Run local validation:

```sh
node --check root/www/luci-static/resources/view/equipe-dashboard/overview.js
```

On an OpenWrt router, validate shell scripts with BusyBox `ash`:

```sh
ash -n /tmp/ark-install-test.sh
ash -n /usr/sbin/equipe-dashboard-control
```

Confirm that scripts use LF line endings. Windows CRLF line endings can break `ash` with confusing syntax errors. The repository includes `.gitattributes` rules to keep shell/runtime files as LF.

Review screenshots before publishing. Public screenshots must not expose:

- passwords;
- real MAC addresses;
- customer names;
- private backups;
- private IP maps that identify a deployment;
- event-specific secrets.

## Version Checklist

Update these files for each release:

| File | Required update |
| --- | --- |
| `VERSION` | package/project version |
| `Makefile` | `PKG_VERSION` |
| `root/usr/share/ark-router/VERSION` | version shown/read on router |
| `root/usr/sbin/equipe-dashboard-control` | `ARK_ROUTER_VERSION` fallback |
| `CHANGELOG.md` | release notes |
| `README.md` / docs | only when behavior or install instructions changed |

## Git Commands

Typical release flow:

```sh
git status
git add .
git commit -m "Release ARK Router v0.9.23"
git push origin main
git tag -a v0.9.23 -m "ARK Router v0.9.23"
git push origin v0.9.23
```

After the tag is pushed, open:

```text
https://github.com/Despensativo/ark-router/actions
```

Confirm that **Build OpenWrt package** finishes successfully.

Then open:

```text
https://github.com/Despensativo/ark-router/releases/tag/v0.9.23
```

Confirm that package assets were attached.

## Public Install Commands

Stable/recommended install from Release package:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

Beginner-friendly mode that tries the Release package first and falls back to source:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_INSTALL_MODE=auto sh
```

Source fallback when no package asset exists yet:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_INSTALL_MODE=source sh
```

Release mode is preferred because the package manager knows ARK Router is installed. Source mode is useful for early testing and emergency updates, but it copies files directly and does not register an OpenWrt package.

## Dashboard Self-Update

After ARK Router is installed, users can update from:

```text
ARK Router -> Recursos -> Atualizacao do ARK Router
```

The updater checks the latest GitHub Release and downloads the package matching the router package manager:

- `luci-app-ark-router.apk` for APK-based OpenWrt;
- `luci-app-ark-router.ipk` for OPKG-based OpenWrt.

Before installing, it creates a temporary backup under:

```text
/tmp/ark-router-before-self-update-*.tar.gz
```

The self-updater does not change WAN, LAN, Wi-Fi, firewall, DHCP, SQM or Multi-WAN settings.

## Local Offline Copy

For field work, keep a local copy of:

- source tree;
- latest generated `.apk`/`.ipk`;
- release backup ZIP;
- sanitized screenshots.

In the current development machine, the local organization used during the pilot was:

```text
C:\Users\User\Desktop\ARK Router\GitHub\luci-app-ark-router
C:\Users\User\Desktop\ARK Router\Offline\source
C:\Users\User\Desktop\ARK Router\Offline\packages
C:\Users\User\Desktop\ARK Router\Backups
```

These paths are examples from the pilot machine, not project requirements.
