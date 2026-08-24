# Changelog

## Unreleased

- Lowered the automatic Full profile overlay threshold from 64000 KB to 35000 KB so routers with enough RAM and moderate free flash can receive the Full package.
- Fixed Lite/Full profile switching so the installer removes the opposite ARK Router package while preserving local UCI configuration files before installing the selected profile.
- Split release packaging into Lite and Full profiles. Lite keeps the canonical `luci-app-ark-router` package name for compatibility, while Full publishes `luci-app-ark-router-full`.
- The SSH installer and dashboard self-updater can auto-select Lite or Full from detected RAM and free overlay space, with `ARK_ROUTER_PROFILE=lite|full` available for forced installs.
- Lite now also includes every measured sub-1 MB operational module from the Full profile, including SQM/CAKE, Multi-WAN, UPnP, uHTTPd management, Wi-Fi info, tunnel support, the LuCI package manager, OpenWrt update helpers and supported PT-BR LuCI translations.
- The Full profile pulls SQM/CAKE, Multi-WAN, UPnP, ZeroTier, speed testing, package manager, attended upgrade tooling, tunnel support, Wi-Fi info and supported PT-BR LuCI translations.
- Added package profile documentation with measured flash and service RAM impact from the tested APK firmware.

## 0.9.30

- Added `tc-full` and `kmod-sched-act-police` as default package dependencies so guest/visitor networks can enforce both download and upload limits.
- Fixed guest/visitor DHCP firewall handling and prevented ZeroTier firewall preparation from writing an invalid `device='-'` entry.
- Added runtime application of guest/visitor bandwidth limits through `tc` on the actual guest Wi-Fi interface.

## 0.9.29

- Added optional ZeroTier remote access integration as a lighter alternative for routers with limited flash/RAM.
- ZeroTier support can install/enable the service, join/leave a Network ID, show node/network/IP status and open the ARK Router directly through the ZeroTier IP.
- Fixed ZeroTier firewall/uHTTPd preparation to avoid creating a conflicting OpenWrt network interface and to keep the virtual IP assigned by ZeroTier itself.
- Removed Tailscale from the visible dashboard flow so the lightweight remote-access path focuses on ZeroTier.
- Improved visual spacing and per-section color accents in the dashboard, independent of the active LuCI theme.
- Fixed the Wi-Fi channel-width action button contrast on dark/default themes.
- Self-update now validates the installed version after package installation and reports an explicit error if the release asset does not actually advance the router version.
- Added a local WSL/OpenWrt SDK APK builder that uses `apk mkpkg` to generate the `noarch` LuCI package directly, avoiding full firmware/kernel-module compilation for ARK Router.

## 0.9.28

- Fixed WAN speed test startup on routers where the logical WAN interface uses a different physical device name, such as `wan` using `eth1`.
- Fixed speed test result persistence after appending history, so the dashboard receives the complete latest result instead of only historical data.
- Fixed aggressive speed test average calculation.
- Full IPv6 disable now also enables dnsmasq AAAA filtering, preventing IPv6 DNS answers from being sent to clients in IPv4-only mode.
- Channel analysis now detects when the suggested 2.4/5 GHz channels are already applied and disables the redundant apply action.
- Device list now supports sorting by name, current traffic or accumulated total, with a largest/smallest toggle.
- Apply actions now treat expected XHR/timeout disconnects during service restarts as "command sent" and reload the panel instead of showing a false failure.
- Speed test calibration now limits each `speedtest-go` run and falls back to a real HTTP/HTTPS download when the selected test server returns invalid download values.
- Speed test history averages now ignore invalid zero-download samples while still showing the original historical entries.
- Fixed the built-in 24-hour traffic collector deployment and WAN counter detection, avoiding fixed interface names and ensuring the dashboard history card becomes available after installation.
- WAN/LAN cards are now rendered from the actual bridge ports: when WAN2 is in LAN mode it appears under wired LAN ports, and any available LAN port can be selected as WAN2.
- WAN2 SQM now follows the selected physical port instead of assuming LAN1, and is disabled automatically when WAN2 returns to LAN mode.
- Added Wi-Fi channel-width controls to the dashboard: 2.4 GHz can be switched between 20/40 MHz and 5 GHz between 80/160 MHz.

## 0.9.27

- WAN1/WAN2 cards now show received gateway, IPv4 netmask and DNS servers from the active OpenWrt interface status.
- Improved WAN link wording so an online DHCP interface is not shown as "sem link" just because the physical device probe is unavailable.

## 0.9.26

- Added a confirmed **Disable IPv6 completely** action in Resources.
- The action backs up the router, removes WAN6/ULA/LAN IPv6 assignment, disables RA/DHCPv6/NDP, removes IPv6 firewall rules and persists kernel-level IPv6 disablement with sysctl.
- Ark Setup now uses the same full IPv6 disable routine instead of only partially disabling LAN IPv6.

## 0.9.25

- Hardened Wi-Fi editing on routers where one band-specific SSID section is missing, creating only the missing section before saving.
- Improved Wi-Fi save UX when the browser loses the XHR because the radio reloads during the change.

## 0.9.24

- Added optional WAN MAC clone editing to WAN1/WAN2. Leaving the field empty removes the override and uses the physical router MAC.
- Added Wi-Fi split mode in the network editor so 2.4 GHz and 5 GHz can use either the same SSID or separate SSIDs.
- Wi-Fi cards now show per-band names when the SSIDs are split.

## 0.9.23

- Added a one-click **Install missing features** action in the Resources modal for clean-router setup.
- The bulk installer installs only lightweight supported missing modules: Argon, SQM, Multi-WAN, nlbwmon, UPnP, uHTTPd and speed test when compatible.
- Speedify/BONDING REAL is intentionally excluded from the bulk installer because it requires licensing, architecture checks and storage-mode selection.

## 0.9.22

- Added DHCP DNS editing to the LAN/DHCP modal, allowing up to three IPv4 DNS servers to be sent to clients through DHCP option 6.
- LAN/DHCP status now reports and displays the DNS servers currently being advertised by the router.
- LAN/DHCP save now preserves non-DNS DHCP options while replacing only the DNS option.

## 0.9.21

- Improved the Speedify section wording to show BONDING REAL as the user-facing feature name.
- The BONDING REAL toggle now offers to install Speedify in the recommended mode when it is not installed yet, preparing WAN1/WAN2 before starting the install flow.

## 0.9.20

- Fixed clean-install behavior for guest QoS limits by shipping and preserving `/etc/config/qos_equipe`.
- Hardened `sqm-save` and Ark Setup guest-limit writes so they create `qos_equipe` when missing.
- Validated local clean reinstall on Cudy WR3000 v1 / OpenWrt 25.12.5 without resetting LAN/WAN access.
- Fixed SQM/CAKE advanced option persistence by writing `eqdisc_opts`/`iqdisc_opts`, so CAKE actually starts with `diffserv4`, NAT awareness and `ack-filter`.
- Normalized Multi-WAN setup on clean installs by removing inherited `wanb`/IPv6 defaults and rebuilding ARK policies with proper UCI list values.

## 0.9.19

- Made the one-line installer default to `auto`: it tries the Release package first and falls back to source install if the router package database cannot resolve dependencies while offline.
- Removed `iwinfo` as a hard package dependency. ARK Router still uses `iwinfo` when available, but package installation no longer fails on images where the binary exists without an APK database record.
- Kept `kmod-tun` as a Speedify/VPN runtime requirement, but removed it from the mandatory ARK Router package dependency list so the dashboard APK stays lightweight and does not force kernel module builds on every target.
- Added `nlbwmon` as an APK package dependency so ARK Router can expose per-device live and accumulated traffic by default.
- Fixed Speedify RAM/external runtime setup to reuse `/tmp/ark-speedify-cache/speedify.apk` instead of deleting a preloaded package before download.
- Added `kmod-tun`/`/dev/net/tun` verification before starting the reduced Speedify runtime.
- Reinforced the Speedify firewall zone with NAT masquerading and MTU fix every time the runtime network is prepared.
- Made Speedify tunnel preparation re-check the active `connectify*` device after daemon start, reducing the risk of clients losing Internet if the tunnel interface is recreated.
- Added live Speedify power control separate from reboot auto-recovery.
- Added Speedify runtime recovery that can restore the saved mode after reboot without running the heavy official internal installer automatically.
- Added visible Speedify account/connection state, active mode and tunnel IP in the dashboard.
- Added Fast.com/manual speed-test fallback that remains available even when `speedtest-go` is not suitable for weak routers.
- Improved speed-test storage detection with RAM-aware recommendations for small devices.
- Fixed LAN/uHTTPd binding so HTTP/HTTPS follows the selected LAN router IP instead of staying tied to a fixed development address.
- Replaced pilot-specific default Wi-Fi labels with generic ARK Router names while still reading the real SSIDs from each router.
- Sanitized development test/deploy scripts so router passwords are supplied through environment variables instead of being committed.
- Added Operational Profiles system: Standard/Controlled mode vs Gamer Mode with low-latency optimizations.
- Added dynamic Gamer Red visual theme (`#ef4444` / `#dc2626`) activated automatically when Gamer Mode is enabled.
- Added 1-click Gamer Mode toggle button and low-latency status indicator directly in the dashboard Hero section.
- Optimized SQM/CAKE queue parameters with `ack-filter` and `diffserv4` for zero-bufferbloat and minimal jitter in online gaming.
- Added real-time DSCP `EF` (Expedited Forwarding) priority support in device configuration for mobile/PC gaming (PUBG Mobile, Free Fire, etc.).
- Added automatic configuration snapshot backup (`/etc/config/ark_last_profile_backup.tar.gz`) before applying profile changes.
- Added smart storage detection for speedtest-go: installs permanently into flash only when safe; otherwise uses volatile RAM or manual fallback on small-flash devices.
- Preserved standard fair-share traffic policies when returning to Standard Mode.

## 0.9.16

- Improved the SSH installer with `release`, `source` and `auto` modes.
- Added source-based install/update for cases where GitHub Release package assets have not been generated yet.
- The same installer can now be re-run over SSH to update an existing ARK Router installation.
- Added root, `wget`, `tar` and LuCI preflight checks for safer first-time installs.
- Documented simple one-line install/update commands for stable users and development/source installs.
- Added maintainer publishing documentation covering GitHub tags, GitHub Actions, Release assets, self-update and local offline copies.

## 0.9.15

- Added ARK Router self-update support through GitHub Releases.
- The feature center now shows the installed ARK Router version and repository.
- Administrators can check for a newer release and install it only after confirmation.
- Self-update downloads `luci-app-ark-router.apk` or `.ipk` according to the router package manager.
- Before installing an update, ARK Router creates a temporary configuration backup in `/tmp`.
- The update flow restarts LuCI services and reloads the dashboard without changing network, Wi-Fi, firewall, DHCP, SQM or Multi-WAN settings.

## 0.9.14

- Fixed modal cancel/close behavior without removing LuCI's persistent `#modal_overlay`.
- Fixed internal dashboard action buttons after closing a modal, including WAN, LAN/DHCP, Wi-Fi, SQM, channel and reboot controls.
- Fixed LAN/DHCP editor opening on custom `192.168.x.x` networks: it now preserves the current subnet instead of resetting to `192.168.1.1`.
- Validated SQM/CAKE guest download changes through the web interface and confirmed persistence in UCI.
- Validated LAN/DHCP no-op apply flow through the web interface and confirmed persistence in UCI.
- Documented a follow-up: guest bandwidth values are saved and displayed, but the actual per-guest traffic shaper still needs an explicit runtime enforcement layer.

## 0.9.13

- Added a second confirmation step before applying main LAN/DHCP changes.
- The confirmation explains that LAN ports, DHCP and the panel session may restart.
- When the router IP changes, ARK Router now tries to open the dashboard at the new router address automatically.
- Reduced LAN/DHCP post-apply waiting time for range-only changes.

## 0.9.12

- Improved the manual LAN/DHCP editor: changing the router IP now suggests matching DHCP start/end addresses automatically.
- Updated LAN presets to suggest DHCP ranges from `.10` to `.254`.
- Manual DHCP suggestions stop overwriting values after the administrator edits start/end fields.

## 0.9.11

- Reload the dashboard after actions that restart SQM, network or Wi-Fi services.
- Make SQM/CAKE limit changes visibly refresh after saving so WAN and guest download/upload values are not shown stale.
- Reload after applying speed-test SQM suggestions, WAN/LAN edits, Wi-Fi edits, channel changes and country changes.

## 0.9.10

- Added Wi-Fi network settings directly in the dashboard cards.
- Main and guest SSIDs can now be renamed from ARK Router, applied to both 2.4 GHz and 5 GHz.
- Guest Wi-Fi can now be enabled or disabled without deleting its saved configuration.
- Wi-Fi password changes remain optional in the same editor.

## 0.9.9

- Added a dashboard LAN/DHCP editor for the main network.
- Added selectable presets for `192.168.x.x` and `10.0.x.x`, plus a manual mode for router IP and DHCP start/end addresses.
- Added backend validation and an automatic safety backup before changing the main LAN IP or DHCP range.
- Updated device counts and network labeling to follow the configured LAN/guest prefixes instead of fixed pilot subnets.

## 0.9.8

- Fixed Ark - Setup modal overflow on the default OpenWrt/LuCI theme by constraining setup content to the actual modal width.
- Added safer sizing for setup grids, fields, selects and inputs so the layout does not depend on the Argon theme modal behavior.

## 0.9.7

- Fixed Argon optional installation on OpenWrt `apk` builds where `luci-theme-argon` is not present in the official package feed.
- Added a fallback installer that downloads Argon and Argon Config from the upstream Argon GitHub release and enables the theme after installation.

## 0.9.6

- Fixed guest SQM editor reload values so guest download/upload limits are read from the `qos_equipe.guest` section that the dashboard saves.
- Added guest download limit support to Ark - Setup drafts and apply flow.

## 0.9.5

- Fixed release artifact collection so the generic installer asset points to the ARK Router package itself.
- Publish only ARK Router package artifacts and build logs instead of every dependency package.

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
- Main Wi-Fi clients now show the active main SSID, guest Wi-Fi clients show the active guest SSID, DHCP-only clients show `Cabo / LAN`, and unknown main clients show `Rede principal`.

## 0.8.0

- Prepared the project for public GitHub publication.
- Added MIT license, public README, install guide, roadmap, support guide and screenshot guidance.
- Added issue templates, pull request template and GitHub Actions syntax check.
- Documented the tested router, firmware, package manager and LuCI theme without exposing passwords.

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
