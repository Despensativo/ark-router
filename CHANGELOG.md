# Changelog

## 0.9.4

- Fixed the GitHub Actions OpenWrt package build workflow.
- Use the generic `aarch64_cortex-a53` SDK image instead of a firmware-specific SDK tag.
- Prepare a standard OpenWrt feed layout before calling the SDK action.

## 0.9.3

- Added dashboard WAN editors for WAN1 and WAN2.
- WAN1 can edit DHCP, PPPoE, static IPv4 and DNS while keeping the physical WAN port.
- WAN2 can use LAN1/LAN2/LAN3 as a DHCP/PPPoE/static internet port or return the selected port to LAN.
- Added automatic safety backup before WAN/port changes.
- Added guest download-limit editing alongside guest upload-limit editing.
- Cleaned Ark - Setup optional modules so already-installed resources show as installed instead of selectable.
- Added GitHub Actions package build workflow and release documentation.

## 0.9.2

- Improved Ark - Setup visibility with a stronger dashboard button.
- Reworked the first setup screen to start with language, router name and country.
- Replaced unclear scenario profiles with explicit internet modes: single WAN, dual-WAN failover, dual-WAN balancing and custom.
- Changed regulatory country entry from free text to a selectable list.
- Split DNS configuration into separate DNS 1, DNS 2 and DNS 3 fields.
- Improved optional-module cards with installed/optional status to reduce confusion.
- Improved Ark - Setup layout on desktop and mobile.

## 0.9.1

- Replaced the old QoS shortcut with useful SQM controls on the dashboard.
- Added a SQM/CAKE on/off switch with confirmation.
- Added a visual editor for WAN1/WAN2 download and upload limits, where `0` means unlimited/no limit for that direction.
- Added guest upload-limit editing from the same SQM card.

## 0.9.0

- Added `Ark - Setup`, a guided first-configuration assistant for common OpenWrt scenarios.
- Added resumable setup drafts stored in UCI, with applied-step checkpoints.
- Added safe final application flow with an automatic `/tmp/ark-router-ezsetup-backup-*.tar.gz` backup before network changes.
- Added guided choices for router name, regulatory country, unified or split 2.4/5 GHz Wi-Fi, guest network, guest upload limit, WAN2, Multi-WAN mode, SQM strategy, DNS, IPv6, WPS and suggested modules.
- Added confirmed installation of Ark - Setup selected modules with background progress.
- Corrected remaining default ARK Router branding in package configuration and RPC ACL.

## 0.8.6

- Corrected the public brand back to `ARK Router`.
- Updated uninstall backup names from `arc-router-*` to `ark-router-*`.
- Kept legacy `ARC_ROUTER_*` script variables as compatibility fallbacks.
- Clarified first-configuration and SQM behavior in the project documentation.

## 0.8.5

- Added automatic uninstall-time backup for ARK Router preferences and friendly device names.
- Documented how to download and restore the uninstall backup before rebooting the router.

## 0.8.4

- Added a conservative uninstall script with `DRY_RUN=1` preview and `PURGE=1` preference removal mode.
- Documented install, uninstall and optional-package retention behavior.
- Clarified that optional packages installed through or alongside ARK Router are not removed by the uninstaller.

## 0.8.3

- Renamed the public-facing brand to `ARK Router` while keeping the existing package slug for compatibility.
- Added OpenWrt/LuCI/search-oriented keywords to the README for better discovery.
- Added a simple GitHub Releases installer script for future `.apk` and `.ipk` release assets.

## 0.8.2

- Improved the public README with badges, clearer feature grouping and a dedicated note explaining that pilot Wi-Fi names are examples, not requirements.
- Clarified that QoS/SQM and device-priority features are optional and hidden when their modules are unavailable.

## 0.8.1

- Fixed connected-device network labels so Wi-Fi clients are no longer shown as wired clients.
- Main Wi-Fi clients now show `Equipe-X / Wi-Fi`, guest Wi-Fi clients show `Visitantes / Wi-Fi`, DHCP-only clients show `Cabo / LAN`, and unknown main clients show `Rede principal`.

## 0.8.0

- Prepared the project for public GitHub publication.
- Added MIT license, public README, install guide, roadmap, support guide and screenshot guidance.
- Added issue templates, pull request template and GitHub Actions syntax check.
- Documented the tested router, firmware, package manager, LuCI theme and pilot SSIDs without exposing passwords.

## 0.7.4

- Fixed dashboard confirmation toasts using low-contrast text under some LuCI/Argon theme combinations.
- Added explicit toast colors for info, warning and danger states.

## 0.7.3

- Removed `speedtest-go --saving-mode` from calibrated measurements because it under-reports fast fiber links.
- Enabled multi-server, eight-thread tests for better high-bandwidth WAN calibration.

## 0.7.2

- Hardened temporary `speedtest-go` preparation by preferring a direct package download derived from the official APK policy metadata.
- Added install-log retrieval so the dashboard can surface the real reason when an optional feature fails to prepare or install.
- Improved the feature-center flow to distinguish between already-ready, running and newly started optional installs.

## 0.7.1

- Fixed temporary `speedtest-go` preparation after a router reboot.
- Refreshes volatile APK package indexes before fetching the speed-test package.

## 0.7.0

- Added a responsive router restart control at the end of the dashboard.
- Added two separate confirmation steps and a visible two-second safety delay.
- Added a short-lived backend token so the safety delay is enforced by the router, not only by the browser.

## 0.6.0

- Added a unified per-device configuration dialog.
- Added MAC-based DHCP reservation with automatic/manual selection and IPv4 validation against the LAN subnet.
- Added optional per-device upload priority through AF41 DSCP marking for CAKE `diffserv4`.
- Kept the priority control hidden for guest clients and whenever SQM is inactive.

## 0.5.1

- Replaced LuCI/Argon dismiss notifications inside ARK Router with responsive toasts.
- Added a large close button, click-to-dismiss behavior and a seven-second automatic timeout.

## 0.5.0

- Added `luci-app-uhttpd` detection and optional installation.
- Added trusted local CA download and administrator-device installation guidance.
- Added HTTPS certificate state and SHA-256 fingerprint reporting.

## 0.4.0

- Added Argon as the recommended LuCI theme in the feature center.
- Added automatic Argon installation detection and a confirmed theme activation action.
- Avoided reinstalling optional packages that are already present but inactive.

## 0.3.1

- Fixed the HTTPS redirect switch retaining stale state after a successful change.
- Added an explicit active/off label and stronger visual feedback for HTTPS redirect.

## 0.3.0

- Added HTTPS availability and local-certificate information to the feature center.
- Added a confirmed HTTP-to-HTTPS redirect switch without enabling it by default.
- Added an HTTPS shortcut and bilingual warning about local/self-signed certificates.
- Documented flash, overlay and RAM distinctions for constrained routers.

## 0.2.0

- Added per-WAN link testing and SQM upload recommendations.
- Added temporary-RAM loading for `speedtest-go` on routers with limited flash.
- Added one full measurement plus two upload measurements per calibration.
- Added conservative, balanced and aggressive apply choices with confirmation.
- Added automatic restoration of the selected SQM queue before results are published.
- Declared dashboard and device UCI files as preserved package configuration.

## 0.1.0

- Added the ARK Router operational dashboard.
- Added editable branding with `ARK Router` as the default.
- Added Portuguese and English runtime translations.
- Added automatic, ARK Router and custom appearance modes.
- Added modular capability detection and optional package suggestions.
- Added Multi-WAN, SQM, Wi-Fi, device, LAN/WAN and 24-hour traffic views.
- Added safe controls for Wi-Fi channels, country, passwords, device names and Multi-WAN policy.
