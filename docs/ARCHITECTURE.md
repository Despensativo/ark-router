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

## Compatibility identifiers

The legacy `equipe-dashboard` route and `equipe_dashboard` UCI configuration are retained so pilot installations can upgrade without losing settings. A future major release may include an explicit migration to `ark-router` identifiers.

## Optional modules

The control helper reports each capability as installed, active, hidden and installable. The UI removes unsupported sections and offers a confirmed installation only for packages in the backend allowlist.

Installing an optional package makes its card available, but the package is not configured automatically. Network-impacting changes remain separate confirmed commands.

## Ark - Setup

Ark - Setup is the guided first-configuration assistant. It stores its draft in `equipe_dashboard.setup`, validates every field in the shell helper and applies the final plan in numbered checkpoints.

The apply flow creates a backup in `/tmp`, then applies identity, Wi-Fi, guest network, WAN/Multi-WAN intent, SQM values, guest limit preferences and service reloads. The `applied_step` option lets the interface resume after a browser disconnect or Wi-Fi reload.

Optional module selections are stored as setup intent. The assistant can install the selected modules through a separate confirmed background operation, with status and logs in `/tmp/ark-ezsetup-modules.*`. Network configuration is still applied only by the final setup action.

## Link calibration

`speedtest-go` is too large for the flash of some target routers. ARK Router therefore supports refreshing the volatile APK indexes, fetching its official OpenWrt package into `/tmp`, extracting only the main executable and discarding the archive and auxiliary binaries. The runtime is recreated after reboot only when requested.

Each calibration binds to the selected WAN source address, temporarily disables the matching SQM section without committing that temporary state, performs three measurements, restores SQM and then writes a JSON result under `/tmp`. Applying a suggestion is a separate validated action.

The tested pilot SQM values were manually chosen for the local Starlink/event scenario. Public users should either run calibration or apply their own conservative limits.

## Device controls

The device dialog stores friendly names in `equipe_devices`, creates or updates a DHCP host reservation keyed by MAC address, and can create a deterministic `firewall.ark_priority_*` DSCP rule. Priority uses AF41 so CAKE `diffserv4` places that device's uploads in its video class while `dual-srchost` continues to provide per-source fairness. The UI exposes priority only for main-network clients while a WAN SQM queue is active.

## HTTPS

The capability response reports whether uHTTPd has an HTTPS listener, readable certificate and key, plus the current redirect state. Changing HTTP redirection is a separate validated command. The UI never enables redirection during installation and warns about the browser transition before applying it.

## Restart safety

The restart flow has two UI confirmations. After the first confirmation, the backend creates a private, short-lived token under `/tmp`. The final action is rejected until two seconds have elapsed and expires after 60 seconds, so the delay cannot be bypassed by an accidental repeated click.
