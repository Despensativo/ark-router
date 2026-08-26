# Architecture

ARK Router is composed of a LuCI JavaScript view, a scoped CSS file, an RPC ACL, a menu entry and small BusyBox shell helpers.

## Main components

- `root/www/luci-static/resources/view/equipe-dashboard/overview.js`: UI, polling and RPC orchestration.
- `root/www/luci-static/resources/view/equipe-dashboard/overview.css`: responsive presentation and theme variables.
- `root/usr/sbin/equipe-dashboard-control`: validated write operations and capability detection.
- `root/usr/sbin/equipe-traffic-history`: lightweight traffic history collector.
- `root/etc/init.d/equipe-traffic-history`: collector service.
- `root/etc/config/equipe_dashboard`: dashboard preferences.
- `root/etc/config/equipe_devices`: administrator-assigned device names.
- `root/usr/share/ark-router/VERSION`: installed version marker used by the dashboard updater.
- `scripts/install.sh`: SSH installer/updater for release, source and automatic fallback modes.
- `scripts/uninstall.sh`: conservative uninstaller with optional preference purge.

## Compatibility identifiers

The legacy `equipe-dashboard` route and `equipe_dashboard` UCI configuration are retained so pilot installations can upgrade without losing settings. A future major release may include an explicit migration to `ark-router` identifiers.

## Optional modules

The control helper reports each capability as installed, active, hidden and installable. The UI removes unsupported sections and offers a confirmed installation only for packages in the backend allowlist.

Installing an optional package makes its card available, but the package is not configured automatically. Network-impacting changes remain separate confirmed commands.

LuCI `luci-i18n-*` language packages are not part of ARK Router's dependency model. The ARK interface owns its runtime strings, always keeps English as a fallback and uses the administrator-selected language when available. This allows ARK Router to behave like a firmware-style front end while keeping OpenWrt/LuCI translations optional.

## Installation and update flow

The preferred public path is a GitHub Release package. The SSH installer detects `apk` or `opkg`, auto-selects the profile from router resources and restarts LuCI services. The automatic selector chooses Full when RAM is at least 480000 KB and `/overlay` has at least 35000 KB free; otherwise it chooses Lite. `ARK_ROUTER_PROFILE=lite` or `ARK_ROUTER_PROFILE=full` can force a profile. Lite uses `luci-app-ark-router.apk` / `.ipk`; Full uses `luci-app-ark-router-full.apk` / `.ipk`.

When a package asset is not available, source mode downloads the GitHub source archive, creates a temporary backup under `/tmp/ark-router-install-backup-*.tar.gz`, preserves existing ARK Router UCI config files and copies the project `root/` tree into place. Source mode is a fallback for early testing and emergency updates; it does not register an OpenWrt package.

The dashboard self-updater uses GitHub Releases only. It checks the latest tag, compares it with the installed version marker and installs only after administrator confirmation. It uses the same hardware selector. If Full is already installed, the updater keeps Full; otherwise it chooses Lite or Full from current RAM/overlay resources.

## Ark - Setup

Ark - Setup is the guided first-configuration assistant. It stores its draft in `equipe_dashboard.setup`, validates every field in the shell helper and applies the final plan in numbered checkpoints.

The apply flow creates a backup in `/tmp`, then applies identity, Wi-Fi, guest network, WAN/Multi-WAN intent, SQM values, guest limit preferences and service reloads. The `applied_step` option lets the interface resume after a browser disconnect or Wi-Fi reload.

Optional module selections are stored as setup intent. The assistant can install the selected modules through a separate confirmed background operation, with status and logs in `/tmp/ark-ezsetup-modules.*`. Network configuration is still applied only by the final setup action.

## Link calibration

`speedtest-go` is too large for the flash of some target routers. ARK Router therefore supports refreshing the volatile APK indexes, fetching its official OpenWrt package into `/tmp`, extracting only the main executable and discarding the archive and auxiliary binaries. The runtime is recreated after reboot only when requested.

Each calibration binds to the selected WAN source address, temporarily disables the matching SQM section without committing that temporary state, performs three measurements, restores SQM and then writes a JSON result under `/tmp`. Applying a suggestion is a separate validated action.

The tested pilot SQM values were manually chosen for the local Starlink/event scenario. Public users should either run calibration or apply their own conservative limits.

When the helper detects a weak router or too little free `/tmp` space for the speed-test runtime, the UI keeps a manual Fast.com path available instead of forcing package installation. The administrator can run Fast.com from a client, enter the measured values manually and still apply conservative SQM suggestions.

## Speedify runtime recovery

Speedify is treated as an optional runtime, not a core ARK Router dependency. The helper supports three modes:

- internal official install, only when overlay space is sufficient and the administrator explicitly starts installation;
- external storage runtime, extracted under `<mount>/ark-router/speedify-root`;
- temporary RAM runtime under `/tmp/ark-speedify-root`.

Generic Speedify install actions use a safe automatic selector: internal only when the overlay has the configured minimum free space, then external storage when available, then RAM when `/tmp` has enough free space. They do not force the heavy internal installer on small-flash routers.

The `ark-speedify` init script is enabled only when `equipe_dashboard.speedify.autostart=1`. On boot it waits briefly, then calls `equipe-dashboard-control speedify-autostart-run`. The recovery path never runs the heavy official internal installer automatically. It either starts the existing official service, starts the already extracted external runtime, or reloads the RAM runtime if enough `/tmp` space and network access are available.

The helper persists the selected mode, saved-config flag and desired connection state in UCI. Runtime files in `/tmp` are intentionally disposable; configuration remains under `/etc/ark-router/speedify`.

Manual power control is separate from boot recovery. `speedify-power 1` attempts to recover the saved runtime mode if needed, then connects. `speedify-power 0` disconnects/stops the runtime but leaves saved configuration untouched.

The RAM/external installer first checks `/tmp/ark-speedify-cache/speedify.apk`. If the file exists and is not empty, it is used as the Speedify package source. This supports field installs where the router has no working Internet before bonding is ready. The helper only downloads from Speedify when that cache is missing.

Before the daemon starts, ARK Router verifies `/dev/net/tun` and attempts to install `kmod-tun` when a package manager is available. The runtime network preparation always sets the `speedify` firewall zone with `masq=1` and `mtu_fix=1`, keeps LAN-to-Speedify and Speedify-to-LAN forwarding present, and re-runs after daemon start to catch recreated `connectify*` tunnel devices.

## SQM controls

The dashboard exposes a confirmed SQM/CAKE toggle and a small limit editor. The shell helper validates WAN1/WAN2 rates, writes UCI values under `sqm.wan1` and `sqm.wan2`, and restarts only the SQM service. A rate of `0` is accepted to mean no limit for that direction.

## WAN controls

The dashboard exposes confirmed WAN editors for common internet settings. WAN1 edits protocol and DNS while keeping the physical `wan` port. WAN2 can assign `lan1`, `lan2` or `lan3` as a second internet port, or return the selected port to the LAN bridge. The backend creates a `/tmp/ark-router-ezsetup-backup-*.tar.gz` backup before changing network UCI and reloads network services afterward.

## Dedicated multi-Starlink telemetry

Lite and Full contain the same ARK telemetry orchestrator. The dashboard identifies every eligible Starlink WAN dynamically and creates an independent collapsible card for it. Only one live alignment session can run at a time. When the operator finishes an antenna, the panel closes it and advances to the next unverified antenna.

The Starlink card also has an optional **Visualização sem login** switch. When enabled, `/starlink/` serves a standalone read-only alignment page for devices on the active LAN subnet. The CGI validates the source subnet, permits only GET/list/query operations and never exposes UCI changes, credentials or Speedify controls. It is disabled by default and is independent of the authenticated LuCI session.

The dish management address is shared (`192.168.100.1`), so the backend serializes requests with a lock. For each read it resolves the chosen logical WAN and physical device, saves any existing host route, installs a temporary `192.168.100.1/32` route through that WAN, performs the telemetry call and restores the prior route under a shell trap. It never changes the default route and therefore does not reconfigure MWAN3, Speedify or normal Internet forwarding.

Telemetry is read-only and reports the fields exposed by the dish: obstruction percentage, current obstruction state, packet loss, latency, uptime, average obstruction duration, SNR, Ethernet link, GPS/satellite count, firmware, alerts, azimuth, elevation, inclination and alignment status. The authenticated dashboard and the optional LAN-only `/starlink/` viewer use the same backend. A one-second live session expires after five minutes without interaction and is stopped when the page is left.

## Device controls and prioritization

The device dialog stores friendly names in `equipe_devices`, creates or updates a DHCP host reservation keyed by MAC address, and can create a deterministic `firewall.ark_priority_*` DSCP rule. In standard mode, priority uses `AF41` so CAKE `diffserv4` places that device's uploads in its video class. In Gamer mode, priority uses `EF` (Expedited Forwarding) so gaming UDP packets (such as PUBG Mobile, Free Fire, CoD) jump directly to the real-time queue.

## Operational profiles and Gamer mode

ARK Router supports switching between two operational profiles:
- **Standard / Controlled mode**: Balances traffic fairly across devices, applies moderate SQM queues and preserves the theme chosen in LuCI.
- **Gamer mode**: Focuses on lowest latency, minimal jitter and zero bufferbloat. It enables `ack-filter` in CAKE queues, applies DSCP `EF` for prioritized gamer devices, and activates the dynamic **Gamer Red** theme (`#ef4444` / `#dc2626`) across the dashboard.

## HTTPS

The capability response reports whether uHTTPd has an HTTPS listener, readable certificate and key, plus the current redirect state. Changing HTTP redirection is a separate validated command. The UI never enables redirection during installation and warns about the browser transition before applying it.

When the LAN editor changes the router IP, the helper rewrites uHTTPd `listen_http` and `listen_https` to the new LAN IP before restarting the web server. This keeps LuCI limited to LAN while avoiding a hardcoded pilot address.

## Restart safety

The restart flow has two UI confirmations. After the first confirmation, the backend creates a private, short-lived token under `/tmp`. The final action is rejected until two seconds have elapsed and expires after 60 seconds, so the delay cannot be bypassed by an accidental repeated click.
