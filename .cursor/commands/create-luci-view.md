# Create LuCI View Command

Use this command when creating a new LuCI Client-Side JavaScript view or extending an existing page for ARK Router.

## Prompt
Generate a clean, vanilla JavaScript LuCI view (`view.extend({...})`) complying with ARK Router standards:
1. Support OpenWrt 19.07+ LuCI client-side DOM (`ui.addNotification`, `form.Map`, CBI controls).
2. Integrate with ARK Theme CSS classes (`.table`, `.tr`, `.th`, `.td`, `.cbi-tabmenu`).
3. If providing destructive actions (reboot, wipe, reset), include safety confirmation modals.
4. Ensure 40px+ touch targets and full mobile responsiveness down to 360px viewport.
5. Zero external npm dependencies.
