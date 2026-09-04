# ARK Router & Development Guidelines

## Project Context
ARK Router is an advanced, lightweight operating system interface and networking distribution built on OpenWrt / LuCI for embedded routers (primary target: D-Link DGL-5500 with 128 MB RAM and 16 MB SPI Flash).

## Core Directives

### 1. Hardware Budget & Memory (Strict)
- **RAM Constraint**: 128 MB total. Under normal conditions, maintain > 80 MB free RAM.
- **Flash Constraint**: 16 MB total. Maintain > 3 MB free overlay space.
- **Lightweight Assets**: Theme CSS + JS combined must stay under 60 KB. Never bundle heavy npm libraries or client-side runtime engines into router builds.

### 2. LuCI & Frontend Architecture
- **Vanilla JavaScript**: LuCI views must use clean, modern vanilla JavaScript (`view.extend({...})`).
- **Div-Based Tables**: OpenWrt 19.07+ renders tables as `<div class="table">`, `<div class="tr">`, `<div class="td">`. Always handle both `<table>` and `.table` DOM structures.
- **Safety Confirmation Modals**: All critical/destructive actions (Reboot, Reset, Flash, Restore) must use capture-phase event listeners (`addEventListener('click', fn, true)`) to prevent accidental execution.
- **Dual Mode (Básico vs. Avançado)**: Always respect the `ark_interface_mode` localStorage key. Advanced technical options are tagged and shown only in Advanced mode.
- **Password Obfuscation & Dummy Inputs**: LuCI injects hidden dummy inputs (`position: absolute; left: -100000px`) to bypass browser autofill. Suppress or ignore them.

### 3. OpenWrt POSIX Shell & UCI
- All shell scripts must run under BusyBox ash (`/bin/sh`). No bash-isms (`[[ ]]`, `${var//}`, arrays).
- Quote UCI paths: `uci get "network.lan.ipaddr"`.
- Commit changes cleanly and restart services conditionally.

### 4. React & Modern Web Standards (When building external dashboards/apps)
- Follow the rules defined in `.cursor/rules/`:
  - React 18+, TypeScript 5+, Tailwind CSS.
  - Strict typing (no `any`), functional components with hooks (< 200 lines).
  - Mobile-first responsive layouts, accessibility (WCAG 2.1 AA), Zod + React Hook Form.

### 5. Cursor AI & Assistant Commands Available
- LuCI / Router: `/create-luci-view`, `/audit-ark-theme`, `/verify-router-health`
- React / Web: `/create-component`, `/refactor-component`, `/create-form`, `/add-tests`, `/audit-accessibility`, `/optimize-performance`, `/setup-dark-mode`
