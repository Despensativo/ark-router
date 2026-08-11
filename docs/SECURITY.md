# Security model

All state-changing dashboard actions call `/usr/sbin/equipe-dashboard-control`. The helper validates action names and arguments before invoking UCI, service scripts or a package manager.

Installing ARK Router only adds the package files and LuCI menu entry. It does not automatically change WAN, LAN, Wi-Fi, firewall, DHCP, SQM or Multi-WAN configuration.

Important properties:

- Optional package installation uses a fixed allowlist.
- Appearance modes and colors use strict validation.
- Dashboard names are limited to 40 characters and control characters are rejected.
- MAC addresses, Wi-Fi password length, country codes, Wi-Fi channels and Multi-WAN modes are validated.
- The UI asks for confirmation before disruptive or package-management operations.
- Speed-test preparation fetches only `speedtest-go` from the router's configured OpenWrt repository and stores the executable in temporary memory.
- Router restart requires a one-time token, two seconds of server-side delay and use within 60 seconds.
- SQM is restored before a speed-test result is marked complete or failed.
- Applying a measured SQM value is separate from testing and requires confirmation.
- Package upgrades preserve the two UCI configuration files declared as `conffiles`.
- HTTPS redirection accepts only `0` or `1`, verifies the HTTPS listener and certificate files before enabling, and requires UI confirmation.
- When a local CA is prepared by the administrator, the dashboard exposes only its public certificate for download. The uHTTPd private key is never returned by the dashboard or included in the source package.
- No credentials are stored in the source tree.

The package has administrative LuCI privileges and should be installed only from a trusted build or signed repository.

## Reporting security issues

Do not open a public issue with passwords, private keys, backups, customer data or exploitable details. Contact the maintainer privately first, then publish a sanitized issue or advisory after the fix is ready.
