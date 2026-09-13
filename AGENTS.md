# ARK Router & Development Guidelines

## Project Context
ARK Router is an advanced, lightweight operating system interface and networking distribution built on OpenWrt / LuCI for embedded routers (primary target: D-Link DGL-5500 with 128 MB RAM and 16 MB SPI Flash).

## Core Directives

### 1. Hardware Budget, Flash (16 MB) & Memory (Strict)
- **RAM Constraint**: 128 MB (DGL-5500) to 256 MB (Cudy WR3000). Under normal conditions, maintain > 80 MB free RAM on 128 MB devices and > 60 MB on 256 MB devices.
- **Flash Constraint**: 16 MB total SPI Flash. Partition is shared between Kernel, SquashFS ROM, and writable `/overlay` (`rootfs_data`).
  - Keep `/overlay` free space > 2 MB.
  - Never save growing logs, metrics or history CSVs directly in `/etc` on Flash. Use `/tmp` (RAM) with rotation or strictly capped small files.
- **Minification & Asset Pipeline**:
  - Source code in development (`root/www/...`) remains 100% readable, formatted, and commented.
  - Deployed assets to router and packaging builds MUST be minified via `scripts/build_minified_assets.py` (esbuild/terser) with `node --check` validation.
  - Minification reduces JS/CSS by 60-70%, preventing `/overlay` exhaustion on live routers and keeping compressed SquashFS tiny.
  - Theme CSS + JS combined target budget: keep total footprint under 60 KB compressed. Never bundle heavy npm libraries or runtime engines.

### 2. Dual OpenWrt Architecture (Antigo vs. Novo)
ARK Router must remain compatible with both generations:
- **OpenWrt Antigo (19.07 - 23.05)**:
  - Reference hardware: D-Link DGL-5500 (Atheros QCA9558), 128 MB RAM, 16 MB Flash.
  - Package manager: `opkg` (`/etc/opkg.conf`, `opkg install/status`).
  - Firewall engine: `iptables` / `firewall3` (`/etc/config/firewall`).
  - LuCI DOM: Rendered with both `<table>` and div-based tables (`<div class="table">`, `.tr`, `.td`).
- **OpenWrt Novo (24.x - 25.x / master)**:
  - Reference hardware: Cudy WR3000 v1 (MediaTek MT7981 Filogic 820), 256 MB RAM, 16 MB Flash.
  - Package manager: `apk` (`/etc/apk/`, `apk add/info/del`).
  - Firewall engine: `nftables` / `firewall4` (`table inet ...`).
  - Backend: `ucode` templates (`*.ut`) and modern RPC.
- **Portability Rule**: Always detect package manager dynamically (`which apk opkg`), firewall backend (`nft` vs `iptables`), and keep shell scripts compatible with pure BusyBox ash (`/bin/sh`).

### 3. UI, Botões e Modais: O Que Dá Certo vs. O Que NÃO Dá
- **Área de Toque (Mobile First)**: Todo botão, badge clicável ou switch deve ter altura mínima útil de **40px** (`min-height: 40px`).
- **Anti-Zoom e Seleção**: Aplicar `user-select: none; -webkit-tap-highlight-color: transparent;` em botões e controles rápidos para evitar zoom no duplo toque em celulares.
- **Safety Confirmation (Fase de Captura)**:
  - Ações críticas (Reboot, Reset, Flash, Mudança de perfil) DEVEM usar `addEventListener('click', fn, true)` (fase de captura) para interceptar antes de qualquer listener do LuCI ou submissão acidental de formulário.
  - Trava visual obrigatória de 2 segundos no botão final com contador decrescente e token efêmero validado no backend (`/tmp`).
- **Desacoplamento de Backdrop e Modal**:
  - O backdrop escuro (`#modal_overlay`) é fixo em tela inteira (`position: fixed; inset: 0; width: 100vw; height: 100dvh; pointer-events: none` quando inativo).
  - A caixa de diálogo (`.modal`, `.cbi-modal`) é o cartão central. NUNCA aplicar largura fixa ou margens diretamente em `#modal_overlay`.
- **Isolamento de Scroll no LuCI**:
  - No LuCI (Argon / Bootstrap), o `body` tem `overflow: hidden; height: 100vh;`. Quem rola é o contêiner `.main-right`. Ao abrir modais ou menu lateral, travar `.main-right` com `overflow: hidden !important; pointer-events: none !important;`.
- **Contenção Flex/Grid**:
  - SEMPRE usar `min-width: 0` em filhos diretos de `display: flex` e `display: grid` para evitar que endereços MAC, hostnames longos ou URLs empurrem a tela horizontalmente.
- **O que NÃO fazer (Proibido)**:
  - ❌ NÃO usar `alert()`, `confirm()` ou `prompt()` síncronos (eles congelam o loop do LuCI e causam falhas no mobile).
  - ❌ NÃO definir larguras fixas em pixels (`width: 600px`) sem limites responsivos (`max-width: 100%`).
  - ❌ NÃO confiar em preenchimento automático de senhas (o LuCI insere dummy inputs `left: -100000px` que devem ser ignorados).
  - ❌ NÃO subir arquivos de desenvolvimento sem minificar para o `/overlay` do roteador.

### 4. OpenWrt POSIX Shell & UCI
- All shell scripts must run under BusyBox ash (`/bin/sh`). No bash-isms (`[[ ]]`, `${var//}`, arrays).
- Quote UCI paths: `uci get "network.lan.ipaddr"`.
- Commit changes cleanly and restart services conditionally.

### 5. Cursor AI & Assistant Commands Available
- LuCI / Router: `/create-luci-view`, `/audit-ark-theme`, `/verify-router-health`
- React / Web: `/create-component`, `/refactor-component`, `/create-form`, `/add-tests`, `/audit-accessibility`, `/optimize-performance`, `/setup-dark-mode`
