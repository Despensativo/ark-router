# Contributing

Contributions are welcome through issues and pull requests.

Keep changes compatible with standard LuCI JavaScript views and BusyBox `ash`. Do not commit credentials, private backups, Wi-Fi passwords, private IP maps, customer data or router-specific network settings.

The maintainer controls what enters the official repository. Public users may fork and modify their own copies under the project license, but changes to this repository should be proposed through pull requests and reviewed before merge.

Before submitting a change:

1. Run `node --check` on the dashboard JavaScript.
2. Test both Portuguese and English.
3. Test automatic and custom appearance modes.
4. Confirm the page remains useful when each optional package is absent.
5. Validate desktop and narrow-screen layouts.
6. Exercise invalid backend inputs and confirm they are rejected.
7. If shell scripts were changed, validate them with BusyBox `ash` on OpenWrt or an equivalent environment.
8. If packaging or version files changed, review `docs/PUBLISHING.md` before tagging a release.

When reporting compatibility, include the router model, OpenWrt version, package manager, LuCI theme and installed optional modules.
