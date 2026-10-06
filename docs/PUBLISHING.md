# Publishing ARK Router on GitHub

This document describes the recommended public release flow for ARK Router.

ARK Router is an OpenWrt/LuCI package. It is not an ISO image and it is not an Android APK. On newer OpenWrt builds, `.apk` means the OpenWrt package format used by the router package manager.

## Recommended Release Model (Local-First Packaging)

Build packages locally to avoid slow CI/CD cloud queues, verify them immediately, and upload them directly to GitHub Releases:

1. Keep source code on the `main` branch.
2. Update `VERSION`, `Makefile`, `CHANGELOG.md` and runtime version files.
3. Build the packages **locally** in seconds:
   - IPK packages: run `scripts/build-ipk-wsl.sh` (or `python scripts/pack_ipk_local.py`).
   - APK packages: run `scripts/build-apk-manual-wsl.sh` (under WSL or build host).
   - Artifacts will be generated in `dist/sdk/`.
4. Validate packages locally in VirtualBox (`OpenWrt-ARK-Dev`).
5. Commit and push source to GitHub.
6. Create the release and upload the pre-built packages directly:
   ```sh
   gh release create v1.5.x dist/sdk/luci-app-ark-router* --title "ARK Router v1.5.x" --notes-file CHANGELOG.md
   ```
   *(Or attach the files directly in the GitHub Release web UI).*
7. The cloud GitHub Actions workflow (`.github/workflows/build-packages.yml`) is kept only as an optional background fallback (`workflow_dispatch`), eliminating the slow cloud build queue.

## Before Publishing

- Ensure that:
  - `VERSION` is bumped;
  - `CHANGELOG.md` describes the release;
  - `Makefile` matches `VERSION`;
  - assets are minified and valid (`scripts/build_minified_assets.py`);
  - `git status` is clean or changes are intentionally included.

The repository includes `.gitattributes` rules to keep shell/runtime files as LF.

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

## Release Commands (Local Build & Direct Upload)

Typical release flow with pre-built local packages:

```sh
# 1. Build packages locally in seconds
scripts/build-ipk-wsl.sh
scripts/build-apk-manual-wsl.sh

# 2. Check and commit
git status
git add .
git commit -m "Release ARK Router v1.5.x"
git push origin main
git tag -a v1.5.x -m "ARK Router v1.5.x"
git push origin v1.5.x

# 3. Upload pre-built packages directly to the release
gh release create v1.5.x dist/sdk/luci-app-ark-router* --title "ARK Router v1.5.x" --notes-file CHANGELOG.md
# (Or drag and drop files from dist/sdk/ into GitHub Release web editor)
```

Direct upload completes in seconds and eliminates waiting for the cloud runner.

## Public Install Commands

Stable/recommended install from Release package:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

The default command auto-selects Lite or Full. It chooses Full only when RAM is at least 480000 KB and `/overlay` has at least 35000 KB free; otherwise it chooses Lite.

Force Lite:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=lite sh
```

Force Full from the same Release:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=full sh
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

The updater checks the latest GitHub Release and downloads the package matching the router package manager and selected profile:

- automatic Lite APK updates from `luci-app-ark-router.apk`;
- automatic/installed Full APK updates from `luci-app-ark-router-full.apk`;
- OPKG installs use `luci-app-ark-router.ipk` or `luci-app-ark-router-full.ipk` when those assets are published.

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
./GitHub/luci-app-ark-router
./Offline/source
./Offline/packages
./Backups
```

These paths are examples from the workspace organization, not hard requirements.
