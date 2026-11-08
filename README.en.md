<p align="center">
  <img src="docs/screenshots/ark-router-banner.jpg" alt="ARK Router Hero Banner - Network Optimization Suite and Modern LuCI Theme for OpenWrt" width="100%">
</p>

# ARK Router — Network Optimization, Bufferbloat Control & Modern LuCI for OpenWrt

<p align="center">
  <a href="https://openwrt.org/"><img src="https://img.shields.io/badge/OpenWrt-19.07%20to%2025.x-00B5E2?logo=openwrt&logoColor=white" alt="OpenWrt 19.07 to 25.x"></a>
  <a href="https://github.com/Despensativo/ark-router/releases/tag/v2.2.4"><img src="https://img.shields.io/badge/release-v2.2.4-blue.svg" alt="Release v2.2.4"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="MIT License"></a>
  <img src="https://img.shields.io/badge/UI-PT--BR%20%2F%20EN%20%2F%20ES-blue" alt="Trilingual Interface PT-BR / EN / ES">
  <img src="https://img.shields.io/badge/arch-all%20%2F%20noarch-orange" alt="Architecture All / Noarch">
</p>

<p align="center">
  <b>🌐 Languages / Idiomas / Idiomas:</b><br>
  <a href="README.md">🇧🇷 <b>Português (Brasil)</b></a> &nbsp;•&nbsp;
  <a href="README.en.md">🇺🇸 <b>English</b></a> &nbsp;•&nbsp;
  <a href="README.es.md">🇪🇸 <b>Español</b></a>
</p>

---

**ARK Router** is a network optimization suite, active queue management (bufferbloat control) engine, and modern executive LuCI theme for **OpenWrt** (versions 19.07 through 25.x, with full dual-generation support for `fw4`/nftables and `fw3`/iptables).

Engineered to eliminate queue latency under concurrent link load and turn consumer hardware into low-jitter, high-stability equipment for competitive gaming, low-ping voice communications, and remote work, ARK operates as an official LuCI application (`luci-app-ark-router`). It does not replace your OpenWrt kernel: it layers high-frequency telemetry, low-level Linux kernel networking tuning, in-RAM ad blocking, and a mobile-first responsive web interface for smartphones, tablets, and desktop computers.

> **Active Official Version**: **`v2.2.4`** (see [`VERSION`](VERSION) and [Releases](https://github.com/Despensativo/ark-router/releases)).

---

## 🏆 Engineering Highlights (`v2.2.4`): Dual-Engine QoS & Kernel Networking

ARK Router combines battle-tested queue management algorithms with low-level Linux kernel optimizations (`BQL`, `Symmetric Multi-Core RPS`, `NAPI`, `RFC 4638 Baby Jumbo 1500`, and `Voice` Ingress `u32` prioritization):

- **⚙️ Choice Between 2 Dedicated QoS Engines in the Web UI**:
  - **🛡️ Option 1 — `CAKE (Layer Cake / DiffServ4)`**: Classical `sch_cake` engine with automatic per-host fairness (`dual-srchost` / `dual-dsthost`), `nat`, `wash`, and `no-split-gso`. Ideal for plug-and-play bandwidth fairness across multi-user environments.
  - **🚀 Option 2 — `HFSC + FQ-CoDel Turbo (Gaming & Low Latency)`**: Proprietary `/usr/lib/sqm/ark_hfsc_fqcodel.qos` engine pairing **HFSC (`Hierarchical Fair Service Curve`)** with **FQ-CoDel (`1024` hash flows)**:
    - **Queue `1:10` Real-Time (`rt` curve `< 1 ms`)**: Dual-slope curve (`m1 = 40%` for `8ms`, `m2 = 20%`) strictly dedicated to short packets (`<= 511 bytes` via `u32` classifier) from online gaming (UDP), VoIP, WebRTC, ICMP Ping, DNS, and TCP SYN/ACK handshakes. Dedicated safety guard keeps `UDP 443` (QUIC/HTTP3) in queue `1:20` (`Best Effort`) to eliminate packet reordering on modern web flows.
    - **Queue `1:20` Interactive & Throughput**: Elastic ceiling up to `100%` bandwidth (`ul rate 100%`), `quantum 1514` (one Ethernet frame per DRR round), and native ECN/L4S support.
    - **Queue `1:30` Bulk Scavenger (`CS1`)**: Isolates heavy downloads, torrents, and cloud backups (`m2 = 5%`), preventing upstream starvation.
- **📡 Physical Link Profiles with Precalculated Framing Overheads**:
  - Deterministic framing parameters: `overhead 34, mpu 64, atm off` for GPON PPPoE; `overhead 38` for PPPoE over VLAN; `overhead 18` for DOCSIS cable and Starlink.
  - **Baby Jumbo Frames (RFC 4638)**: Automatically establishes MTU `1508` on the underlying physical WAN interface, allowing true unfragmented MTU `1500` inside the PPPoE tunnel (MSS 1460 intact).
  - **Packet-Layer Path MTU Discovery (RFC 4821)**: Active `tcp_mtu_probing=1` protecting against ICMP-blocked black holes.
- **🎮 Competitive Gaming Classification & Multi-Core Core Distribution**:
  - Bidirectional traffic tagging (`CS4` + `ct mark 0xa0`) covering over 80 competitive titles (Counter-Strike 2, Valorant, Call of Duty, Fortnite, EA FC, League of Legends, Rainbow Six Siege) and console platforms (PlayStation Network, Xbox Live, Nintendo Switch).
  - **Symmetric Multi-Core RPS Affinity**: Evenly distributes network interrupts across Cortex-A53 cores (MediaTek Filogic MT7986/MT7981), eliminating single-core softirq bottlenecks on gigabit connections.
  - **Hardware BQL Anti-Drop (512 KB)**: Tunes minimum transmission limits on the GMAC DMA ring (`eth0`/`eth1`), eliminating secondary drops under PPPoE.
  - **Adaptive Dynamic Conntrack**: Dynamically provisions `nf_conntrack_max` based on physical RAM (from 16,384 connections on 128 MB up to 131,072 connections on 1 GB+ RAM), safeguarding low-RAM devices against OOM kernel panics.
- **⚡ In-RAM Fast-Path Cache in Dispatcher (`equipe-dashboard-control`)**:
  - Serves high-frequency telemetry routes directly from memory (`/tmp/ark-*-cache.json`) with volatile CPU/memory counters, cutting RPC overhead by up to 93% with minimal CPU cycles.

---

## 🌟 Core Capabilities

1. **⚡ Performance & Memory Hardening Center**:
   - Runtime low-level network tuning (TCP BBR, TCP Turbo, MediaTek PPE hardware flow offloading, conntrack calibration) applied instantaneously without dropping WAN connections.
2. **🗜️ Smart Memory Compression (ZRAM / LZ4)**:
   - Expands effective volatile memory via an ultra-fast in-memory swap compressed with LZ4, guarded by architecture-specific limits (32 MB on single-core MIPS, 116 MB on 256 MB routers) with zero flash wear.
3. **🎮 Secure UPnP / IGD Port Management**:
   - On-demand port opening for gaming consoles and gaming PCs with instant mapping audit and one-click revocation.
4. **🩺 ARK Doctor (Automated System Auditor & Self-Healing)**:
   - Live continuous verification across 28 checkpoints (Wi-Fi radios, network bridges, hostapd syntax, fw4/nftables rule integrity, daemon states, and memory health), complete with a single-click auto-repair engine (`ark-doctor --fix`).
5. **🛡️ Hybrid AdBlock & DNS Privacy Shield**:
   - **Full Routers ($\ge 512$ MB RAM)**: In-RAM AdGuard Home instance running in temporary storage (`/tmp/adguardhome`) on port 3000, supporting millions of blocklist rules with zero flash NAND/SPI writes.
   - **Lite Routers (128 MB to 256 MB RAM)**: Ultra-lightweight cloud mode via `dnsmasq` utilizing Anycast DNS filtering (Cloudflare Family, Quad9, CleanBrowsing, Control D).
6. **⚡ Per-Client Bandwidth Shaping with LAN Bypass (RFC 1918)**:
   - Surgical download/upload limits on internet traffic per device. Local transfers (NAS, Plex media, network printers, file shares) operate at full unthrottled hardware speed (Gigabit / Wi-Fi 6).
7. **📊 Real-Time Per-Device Telemetry**:
   - Hardware counters straight from the wireless driver (`iwinfo`) and Ethernet switches, featuring anti-jitter exponential smoothing (EMA) and 24-hour traffic history.
8. **🚀 Parallel DNS Turbo & 1-Click Dual-DoH (`https-dns-proxy`)**:
   - Parallel multi-upstream resolution (All-Servers), native DoH setup in one click, and automated redirection blocking smart TV and mobile DNS hijacking (ports 53 and 853).
9. **🌐 Intelligent Multi-WAN & Policy-Based Routing (PBR)**:
   - Automated failover and load balancing across multi-WAN connections, with granular routing policies for gaming, streaming, and P2P traffic.
10. **🔒 Kernel WireGuard VPN & SMB 3.1.1 Network Storage (`ksmbd`)**:
    - High-throughput kernel-space WireGuard client/server and high-speed USB storage sharing via modern `ksmbd`.
11. **📱 Mobile-First Cockpit Interface**:
    - Smooth touch-optimized collapsible cards, fully contained within 360px to 2560px viewports (smartphones, tablets, and ultra-wide desktop monitors).
12. **🌎 Native Trilingual Coverage (i18n)**:
    - 100% native translations in English (EN), Brazilian Portuguese (PT-BR), and Spanish (ES).

---

## 📸 Screenshot Gallery (v2.2.4)

Real screenshots captured directly from production hardware (**Acer Predator Connect W6x** — MediaTek Filogic 830 Quad-Core 2.0 GHz, 1 GB RAM, OpenWrt 25.x / 24.10):

| Cockpit Dashboard Overview | Performance & Kernel Hardening Center |
| :---: | :---: |
| ![ARK Router Cockpit Dashboard Overview](docs/screenshots/dashboard-overview.png) | ![Performance and Memory Hardening Center in ARK Router](docs/screenshots/perf-hardening-card.png) |

| Setup Wizard (Ark - Setup) | WAN Connection & Baby Jumbo Editor |
| :---: | :---: |
| ![Ark Setup Quick Configuration Wizard in LuCI](docs/screenshots/ark-setup.png) | ![WAN Configuration and Baby Jumbo Settings in OpenWrt](docs/screenshots/wan-editor.png) |

| Dual-Engine QoS / SQM Editor | High-Performance Kernel WireGuard VPN |
| :---: | :---: |
| ![SQM CAKE and HFSC FQ-CoDel Configuration in ARK Router](docs/screenshots/sqm-editor.png) | ![Kernel WireGuard VPN Telemetry on OpenWrt](docs/screenshots/starlink-telemetry-real.png) |

| Fluid Mobile Interface (390px) | System Audit & Self-Healing (Ark Doctor) |
| :---: | :---: |
| ![Responsive Mobile LuCI Interface in ARK Router](docs/screenshots/mobile-overview.png) | ![System Integrity Audit and Self-Healing with Ark Doctor](docs/screenshots/theme_switched_to_ark.png) |

---

## 🖥️ Validated Hardware Matrix & Profiles

| Device | SoC / Platform | RAM / Storage | OpenWrt Version | ARK Profile | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Acer Predator Connect W6x** | MediaTek Filogic 830 (MT7986 Quad-Core A53 2.0 GHz) | 1 GB RAM / 512 MB Flash | 24.10 / 25.x (`apk`) | Full | ✅ Production Validated |
| **Acer Predator Connect T7** | Qualcomm / Filogic Wi-Fi 7 BE11000 Multi-Gigabit | 1 GB+ RAM / Multi-Gig | 24.10 / 25.x (`apk`) | Full | ✅ Supported |
| **Cudy WR3000 v1** | MediaTek Filogic 820 (MT7981B Dual-Core A53 1.3 GHz) | 256 MB RAM / 16 MB SPI Flash | 24.10 / 25.x (`apk` / `opkg`) | Standard / Full | ✅ Production Validated |
| **D-Link DGL-5500** | Qualcomm Atheros QCA9558 (MIPS Single-Core 720 MHz) | 128 MB RAM / 16 MB Flash | 19.07 to 23.05 (`opkg`) | Lite | ✅ Lab Validated |
| **Virtual Machines x86_64 (UTM / VirtualBox)** | Intel/AMD x86_64 Multicore (QEMU / KVM) | 512 MB to 2 GB RAM | 19.07 to 25.x | Full / Dev | ✅ Canonical Test Lab |

### Minimum Hardware Requirements:
- **Lite Profile**: 128 MB RAM and 16 MB Flash (OpenWrt with `opkg`, firewall `fw3` or `fw4`).
- **Full Profile**: 256 MB to 1 GB+ RAM and 32 MB+ Flash storage (supports in-RAM AdGuard Home, extensive analytics, and telemetry daemons).

---

## 📦 Quick Installation

ARK Router is installed directly on top of an existing OpenWrt installation with LuCI. It **does not overwrite your kernel** and does not alter existing network settings or credentials.

### Method 1: Automatic 1-Line Installer (Recommended)

Connect to your OpenWrt router via SSH and run:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

The installer detects whether your system runs `apk` (OpenWrt 25.x) or `opkg` (OpenWrt 19.07 to 24.x), checks available RAM, and installs the optimal package (**Lite**, **Standard**, or **Full**).

### Force Specific Profile:
- **Lite Profile** (for 128 MB to 256 MB RAM routers):
  ```sh
  wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=lite sh
  ```
- **Full Profile** (for 512 MB to 1 GB+ RAM routers):
  ```sh
  wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=full sh
  ```

---

### Method 2: Manual Package Installation (`.apk` or `.ipk`)

Download prebuilt release packages from the **[Releases](https://github.com/Despensativo/ark-router/releases)** page:

- **Modern OpenWrt (`apk` — OpenWrt 25.x+)**:
  ```sh
  apk add --allow-untrusted ./luci-app-ark-router-full-2.2.4.apk
  /etc/init.d/rpcd restart
  ```
- **Traditional OpenWrt (`opkg` — OpenWrt 19.07 to 24.10)**:
  ```sh
  opkg install ./luci-app-ark-router-full-2.2.4.ipk
  /etc/init.d/rpcd restart
  ```

---

## 🔄 Updating via the Web Interface

New releases can be audited and applied straight from the LuCI dashboard:
**ARK Router → Resources → ARK Router Update**.

The update checker verifies GitHub releases against your active version, presents release notes, and downloads and installs the update while backing up configurations to `/tmp`.

---

## 🗑️ Clean Uninstallation

To remove the ARK Router suite while preserving your network configurations and friendly device names:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | sh
```

To purge all data, including historical metrics and custom preferences:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | PURGE=1 sh
```

---

## 📄 License

Released under the open-source **MIT License**. Refer to [`LICENSE`](LICENSE) for complete terms.
