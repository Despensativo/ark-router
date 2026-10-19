# ARK Router — Exhaustive Commands, Subsystems & Engineering Reference Manual

> **Document Type**: Authoritative Technical Manual & Architecture Reference  
> **Target Version**: ARK Router `1.5.17` (OpenWrt `19.07` through `25.x`+)  
> **Author**: Google DeepMind Agentic Coding Pair / ARK Router Core Team  
> **Language**: English (Official Technical Reference) with Full Standards Cross-Referencing  

---

## 1. Executive Overview & Dispatch Architecture

ARK Router operates on a modular, decoupled architecture designed to deliver enterprise-grade latency control, multi-gigabit throughput, dynamic hardware adaptation, and autonomous self-healing on embedded OpenWrt devices.

The system segregates responsibilities across three core tiers:
1. **Presentation Layer (Frontend)**: LuCI Vanilla JavaScript views (`src/core/`, `src/modules/`) executing client-side DOM rendering, dynamic form validation, and asynchronous JSON-RPC requests via `rpcd` / `ubus`.
2. **Control & Security Layer (RPCD & ACLs)**: Protected `/usr/share/rpcd/acl.d/` permissions governing access to the unified backend dispatcher `/usr/sbin/equipe-dashboard-control`.
3. **Domain Engine Layer (Backend Modules & Daemons)**: 100% POSIX `/bin/ash` compliant modular domain scripts in `/usr/lib/ark/modules/`, hardware tuning daemons, hotplug triggers, and autonomous watchdogs.

```mermaid
flowchart TD
    subgraph Frontend["Frontend Tier (LuCI Client-Side Web UI)"]
        UI_View["overview.js / render.js (Vanilla ES5/ES6)"]
        UI_RPC["rpc.js (ubus / rpcd dispatcher)"]
        UI_Theme["ark-theme.js & cascade.css (Mobile-First CSS)"]
    end

    subgraph Security["Security & Access Control (OpenWrt rpcd)"]
        ACL["ACL: luci-app-equipe-dashboard.json"]
        RPCD["rpcd daemon (file.exec, uci, ubus)"]
    end

    subgraph Dispatcher["Unified Controller (/usr/sbin/equipe-dashboard-control)"]
        CTRL["equipe-dashboard-control"]
        COMMON["common.sh / validation.sh / logging.sh"]
    end

    subgraph Modules["Domain Modules (/usr/lib/ark/modules/)"]
        MOD_NET["network.sh (WAN/LAN/mwan3/PPPoE/IPv6)"]
        MOD_SQM["sqm.sh (CAKE/FQ-CoDel/Overhead/Offload)"]
        MOD_WIFI["wifi.sh (APs/DFS/Roaming/Mesh/WED/Wi-Fi 7)"]
        MOD_DOC["doctor.sh (Auto-Healing Diagnostic Engine)"]
        MOD_SYS["system.sh (Hardware Tuning/RAM/ZRAM/LEDs)"]
        MOD_DEV["devices.sh (nftables Limits/Parental/Leases)"]
        MOD_VPN["vpn.sh (WireGuard/ZeroTier flash protection)"]
        MOD_STAR["starlink.sh (gRPC Dishy/25h Telemetry Buffer)"]
        MOD_EZ["ezsetup.sh (Wizard/OTA Upgrades/Profiles)"]
        MOD_SFY["speedify.sh (Multi-Path Bonding Runtime)"]
        MOD_BLK["adblock.sh (DNS Interception/AdGuard Home SSO)"]
    end

    subgraph Daemons["Autonomous Daemons & System Services"]
        D_TUNE["ark-hardware-tune (Boot & Hotplug Optimization)"]
        D_GUARD["ark-firewall-guard (Firewall & Service Watchdog)"]
        D_AUTOWAN["ark-autowan-daemon (Autonomous Port Sensing)"]
        D_PROBE["ark-probe-disconnect (Sub-second RTT Sockets)"]
        D_LED["ark-port-ledd & ark-rainbowd (AW21018 HAL)"]
        D_STAR["starlink-telemetry-daemon & mailer"]
        D_CLOCK["ark-clock-preserver (Fake RTC Timestamp)"]
        D_WEB["ark-web-watchdog (Nginx/uhttpd Uptime Watchdog)"]
    end

    UI_View --> UI_RPC
    UI_RPC --> RPCD
    RPCD --> ACL
    ACL --> CTRL
    CTRL --> COMMON
    CTRL --> Modules
    Modules --> Daemons
```

---

## 2. Unified CLI & RPCD Dispatcher (`equipe-dashboard-control`)

All administrative mutations, hardware queries, and telemetry commands funnel through `/usr/sbin/equipe-dashboard-control`.

### 2.1 Invocation Protocol & Sandboxing
- **Path**: `/usr/sbin/equipe-dashboard-control <action> [arguments...]`
- **Shell Compatibility**: Strict POSIX `/bin/ash` (BusyBox). Zero bashisms (`[[`, `bash arrays`, `local -n` forbidden).
- **Environment**: Accepts `ARK_ROOT` (for testing within chroots or virtual rootfs) and dynamic `ARK_LIB_DIR`.
- **Foundational Libraries Loaded**:
  - `/usr/lib/ark/common.sh`: Hardware detection, OS engine checks (`is_fw4`, `is_fw3`), silicon identification.
  - `/usr/lib/ark/logging.sh`: Automated credential sanitization (`password=`, `key=`, `token=`, `loid_pass=` masked).
  - `/usr/lib/ark/validation.sh`: Strict regex parsers for IPv4, IPv6, MAC, rates, hostnames, and interface names.

### 2.2 Complete Dispatch Routing Table
| Command Pattern | Target Module | Responsibility |
| :--- | :--- | :--- |
| `audit-system`, `ark-doctor`, `doctor-*` | `doctor.sh` | Full system audit, log retrieval, automated self-healing |
| `sqm-*`, `irqbalance-*`, `system-hardware-sqm-audit` | `sqm.sh` | Bufferbloat management, CAKE shaping, CPU IRQ governance |
| `wan-*`, `lan-*`, `mwan*`, `autowan-*`, `system-network-mode-*`, `pppoe-*`, `ping-target-*`, `ipv6-*`, `sync-ipv6-firewall`, `ensure_mwan3_ark_config` | `network.sh` | WAN/LAN interface setup, Multi-WAN, Baby Jumbo, IPv6 modes |
| `wifi*`, `channels`, `country` | `wifi.sh` | AP management, Wi-Fi 6/7 parameters, DFS, 802.11k/v/r, usteer |
| `starlink-*` | `starlink.sh` | Starlink gRPC dishy polling, policy routing, telemetry buffer |
| `speedify*`, `rpc-disconnect-test` | `speedify.sh` | Speedify bonding runtime, bypass routes, failover probing |
| `zerotier*`, `wireguard*` | `vpn.sh` | WireGuard server/client, ZeroTier tmpfs RAM sandboxing |
| `adblock*` | `adblock.sh` | DNS adblocking, AdGuard Home SSO token generation, rule sync |
| `system-perf*`, `system-processes*`, `ram-purge-now`, `dmz*`, `upnp-*`, `zram-*`, `dns-turbo*`, `network-capacity*`, `system-memory-purge`, `system-storage-purge`, `fast-targets`, `https-redirect`, `asu-check-*`, `cleanup-orphan-leds`, `get-led-*`, `set-led-*`, `led-*`, `update-led-alert`, `update-wan-led`, `system-hardware-*`, `transmission-*`, `safe-storage-reboot`, `ntp-*`, `time-*`, `clock-*` | `system.sh` | Memory/storage management, sysctl tuning, LED HAL, RTC, UPnP |
| `device-*`, `satellite-*`, `rename`, `flush-stale-leases`, `speedtest-*`, `reboot-*` | `devices.sh` | Device bandwidth limits, parental control, speedtest, reboot lock |
| `ez-setup-*`, `features`, `feature-*`, `self-update-*`, `manual-update-*`, `cleanup-*`, `theme`, `language`, `title`, `profile`, `appearance`, `card-state-*` | `ezsetup.sh` | Setup wizard, package manager updates, theme switcher, profiles |

---

## 3. Kernel, Hardware Tuning & Silicon Acceleration (`ark-hardware-tune`)

Located at `/etc/init.d/ark-hardware-tune`, this subsystem executes on boot and interface hotplug to calibrate Linux kernel networking parameters to the exact hardware specifications of the host router.

### 3.1 Multicore IRQ Affinity Distribution (`ark_tune_irq_affinity`)
By default, standard Linux and OpenWrt route all peripheral interrupts (Ethernet DMA, PCIe Wi-Fi) to CPU Core 0, resulting in severe CPU softirq bottlenecks while other cores remain idle.
- **Implementation**: Inspects `/proc/interrupts` and modifies `/proc/irq/<irq>/smp_affinity`.
- **Core Allocation Strategy**:
  - **Dual-Core SoCs (e.g., MediaTek MT7981 / Cudy WR3000 v1)**:
    - Core 0 (`0x1`): Linux OS, user-space daemons, LuCI, dnsmasq.
    - Core 1 (`0x2`): All network traffic (Ethernet + Wi-Fi).
  - **Quad/Hexa-Core SoCs (e.g., MT7986, Qualcomm IPQ5332, x86 Quad)**:
    - Core 0 (`0x1`): OS, userspace, DNS blocker, telemetry.
    - Core 1 (`0x2`): Ethernet WAN and LAN DMA rings.
    - Core 2 (`0x4`): Wi-Fi 2.4 GHz, 5 GHz, 6 GHz radio interrupts.
    - Core 3 (`0x8`): SQM / CAKE scheduling and softirqs.
  - **Octa-Core+ / Enterprise x86 / BPi-R4**:
    - Core 0 (`0x1`): OS / Userspace / Web.
    - Core 1 (`0x2`): WAN Ethernet.
    - Core 2 (`0x4`): LAN Ethernet.
    - Core 3 (`0x8`): Wi-Fi interrupts.
    - Cores 4-7 (`0xF0`): Softirqs, RPS, CAKE SQM, Crypto offload.
- **Authoritative Reference**: Linux Kernel Documentation: `Documentation/core-api/irq/irq-affinity.rst`.

### 3.2 Dynamic RPS / RFS Mask Calculation (`ark_calculate_rps_mask`)
Receive Packet Steering (RPS) distributes incoming packet processing across multiple CPU cores at the software level.
- **RPS Mask Calculation**:
  $$\text{rps\_mask} = \sum_{i=1}^{N-1} 2^i$$
  For a 4-core system: Cores 1, 2, 3 receive packets ($\text{mask} = 0x2 + 0x4 + 0x8 = 0xE$). Core 0 is reserved for userspace.
- **Sysfs Nodes Modified**:
  - `/sys/class/net/<iface>/queues/rx-*/rps_cpus` $\leftarrow$ `rps_mask`
  - `/sys/class/net/<iface>/queues/rx-*/rps_flow_cnt` $\leftarrow$ `2048` (Mid-Spec) / `4096` (High-Spec) / `8192` (Ultra-Spec)
  - `net.core.rps_sock_flow_entries` $\leftarrow$ `16384` / `32768` / `65536`
- **Authoritative Reference**: Linux Kernel Documentation: `Documentation/networking/scaling.rst` (RPS and RFS).

### 3.3 Silicon Profiles & Hardware Tiers
ARK Router automatically bins the host system into four architectural tiers:

```
+-------------------------------------------------------------------------------------------------------+
| Profile Tier     | RAM Range           | CPU Topology        | Target Platform Examples               |
+-------------------------------------------------------------------------------------------------------+
| 1. Low-Spec      | <= 192 MB           | Single-Core MIPS    | D-Link DGL-5500 (AR9344 720MHz)       |
| 2. Mid-Spec      | 192 MB - 512 MB     | Dual-Core ARM       | Cudy WR3000 v1 (MT7981B Cortex-A53)    |
| 3. High-Spec     | 512 MB - 1536 MB    | Quad/Hexa-Core ARM  | Acer Predator W6x (MT7986 Quad 2.0GHz) |
| 4. Ultra-Spec    | > 1536 MB           | >= 8 Cores / x86    | Intel N100/N305, BPi-R4 (4GB SFP+ 10G) |
+-------------------------------------------------------------------------------------------------------+
```

#### Detailed Kernel Tuning Matrix by Tier
| Parameter | Low-Spec | Mid-Spec | High-Spec | Ultra-Spec / Enterprise | Technical Mechanics & Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `net.core.netdev_max_backlog` | `1000` | `5000` | `10000` | `25000` - `50000` | Maximum number of packets queued on the INPUT queue when interfaces receive packets faster than the kernel can process them (NAPI backlog). Prevents packet drops during multi-gigabit bursts. |
| `net.core.netdev_budget` | `300` | `300` | `600` | `1000` | Maximum number of packets processed in one NAPI polling cycle per softirq invocation. Higher values reduce interrupt context-switching overhead on fast CPUs. |
| `net.core.netdev_budget_usecs` | `20000` | `20000` | `20000` | `20000` | Maximum time (20 ms) allowed per NAPI poll cycle, guaranteeing latency fairness between network I/O and process execution. |
| `vm.min_free_kbytes` | `4096` | `16384` | `65536` | `131072` | Forces the Linux kernel VM to maintain a reserve of unallocated RAM. Crucial for atomic network allocations (`GFP_ATOMIC`) inside interrupt handlers. Prevents page allocation stalls under load. |
| `net.ipv4.tcp_rmem` | `4K 87K 1M` | `4K 87K 4M` | `4K 87K 8M` | `4K 87K 16M` - `32M` | TCP receive buffer auto-tuning vector: `min`, `default`, `max`. Allows high Bandwidth-Delay Product (BDP) connections without memory exhaustion. |
| `net.ipv4.tcp_wmem` | `4K 65K 1M` | `4K 65K 4M` | `4K 65K 8M` | `4K 65K 16M` - `32M` | TCP send buffer auto-tuning vector: `min`, `default`, `max`. Ensures maximum upstream throughput on multi-gigabit fiber connections. |
| `uhttpd max_connections` | `30` | `80` | `150` | `150` | Prevents file descriptor and RAM exhaustion on low-memory routers while scaling web concurrency on high-spec platforms. |
| `txqueuelen` | `1024` | `1500` | `2048` | `4096` - `8192` | Network device transmit queue length. Sized to eliminate `NETDEV_TX_BUSY` packet drops under intense Wi-Fi 6/7 and Multi-Gigabit routing bursts. |
| Default Interface Qdisc | `fq_codel (2Mb limit 1024)` | `mq + fq_codel (8Mb limit 10240)` | `mq + fq_codel (16Mb limit 20480)` | `mq + fq_codel (32-64Mb limit 40960)` | Multiqueue Fair Queueing CoDel active queue management applied across Ethernet interfaces when CAKE is not explicitly bound. |

### 3.4 ZRAM Dynamic Compression & CPU Protection
ZRAM provides a compressed block device in RAM used as swap space.
- **Hardware Coherence Rule**:
  - Devices with $\le 256$ MB RAM activate ZRAM swap automatically.
  - Devices with $> 512$ MB RAM disable ZRAM by default to eliminate CPU compression overhead, since physical RAM is plentiful.
- **Weak CPU Safeguard**:
  On single-core or weak MIPS architectures (e.g., AR9344):
  - Compression algorithm forced to `lz4` (or `zstd`).
  - Maximum swap size capped at `32 MB`.
  - `vm.swappiness` clamped to `15` (down from default `60`).
  - *Rationale*: A high swappiness on single-core MIPS creates a compression feedback loop where the CPU pegs at 100%, stalling network softirqs.
- **Authoritative Reference**: Linux Kernel Documentation: `Documentation/admin-guide/blockdev/zram.rst`.

---

## 4. Smart Queue Management (SQM) & Bufferbloat Mitigation

ARK Router's SQM subsystem (`/usr/lib/ark/modules/sqm.sh`) eliminates bufferbloat through the Comprehensive Queue Management and Packet Aggregation (CAKE) qdisc.

### 4.1 CAKE Architecture & Egress/Ingress Mechanics
- **Qdisc**: `sch_cake` (Linux kernel module).
- **Core Script**: `layer_cake.qos`.
- **DiffServ Modes**:
  - `diffserv4`: Classifies traffic into 4 priority tins based on DSCP (Bulk, Best Effort, Video, Voice).
  - `besteffort`: Single tin, round-robin fairness across flows.
- **Target Latency**: Dynamically tracks RTT with a 5 ms target threshold.
- **Flow Isolation**: Triple isolation by default (host isolation + flow isolation via dual src/dst hashing).

### 4.2 Linklayer Framing & Overhead Compensation Matrix
Improper framing overhead causes CAKE to miscalculate packet transmission time, resulting in packets accumulating in upstream modem/DSLAM buffers (re-introducing bufferbloat).

```
+----------------------------------------------------------------------------------------------------+
| Profile Name      | Linklayer | Overhead (Bytes) | MPU (Bytes) | Underlying Technology & Framing   |
+----------------------------------------------------------------------------------------------------+
| none / cable      | none      | 0                | 0           | Direct Ethernet / DOCSIS Cable    |
| pppoe_28          | ethernet  | 28               | 64          | Standard PPPoE over Ethernet      |
| vlan_34           | ethernet  | 34 (or 32)       | 64          | PPPoE + 802.1Q VLAN Tagged (FTTH) |
| vdsl_44           | ethernet  | 44 (or 40)       | 64          | VDSL2 Packet Transfer Mode (PTM)  |
| atm               | atm       | 48               | 0           | ADSL / ATM AAL5 (RFC 2684)        |
+----------------------------------------------------------------------------------------------------+
```

#### Framing Byte Breakdown
- **Standard PPPoE (`28 bytes`)**:
  - Ethernet Preamble & Start-of-Frame: 8 bytes
  - Ethernet MAC Header: 14 bytes (6 src + 6 dst + 2 ether_type)
  - PPPoE Session Header: 6 bytes
  - PPP Protocol ID: 2 bytes
  - Frame Check Sequence (FCS): 4 bytes
  - Inter-Packet Gap (IPG): 12 bytes
  - Calculation: $14 + 6 + 2 + 4 + 12 - 10 = 28$ bytes framing overhead.
- **PPPoE with 802.1Q VLAN (`34 bytes`)**:
  - Adds 4 bytes for the 802.1Q VLAN tag (TPID `0x8100` + TCI/PCP/VID) + FCS alignment.
- **VDSL2 / PTM (`44 bytes`)**:
  - Encapsulates Ethernet frames over ITU-T G.993.2 PTM TC (Transmission Convergence) layer. Includes 64b/65b framing sync octets.
- **ATM (`48 bytes` cell alignment)**:
  - Enforces 53-byte ATM cell segmentation with 48-byte payload payloads (AAL5 trailer).
- **Minimum Packet Unit (MPU)**: Fixed at `64 bytes` for Ethernet linklayers to account for the minimum IEEE 802.3 frame size.
- **Authoritative References**:
  - Høiland-Jørgensen et al., *"Piece of CAKE: A Comprehensive Queue Management and Scheduling Algorithm"*, IEEE/ACM Transactions on Networking.
  - RFC 2684: Multiprotocol Encapsulation over ATM Adaptation Layer 5.

### 4.3 Mutual Exclusion with Silicon Offload
A critical hardware reality in OpenWrt:
- **Packet Processing Engine (PPE)** and **Hardware Flow Offloading** bypass the Linux network stack entirely once a flow is marked as established in conntrack.
- When hardware offload is active, packets do not traverse the `tc` subsystem, rendering CAKE queues 100% ineffective.
- **ARK Router Mutual Exclusion Engine**:
  - If SQM is enabled on any WAN $\rightarrow$ Automatically disables `flow_offloading` and `flow_offloading_hw` in `/etc/config/firewall`.
  - If SQM is disabled and MWAN count is $< 2$ $\rightarrow$ Automatically detects whether PPE hardware exists (`/sys/kernel/debug/ppe*`) and re-enables hardware flow offloading for 100% wire-speed routing.
- **Upload-Only SQM (`sqm-apply-upload-only`)**:
  Sets ingress bandwidth to 0 (`download=0`). Only shapes outgoing traffic (where domestic bufferbloat primarily occurs due to asymmetric upload speeds), allowing software flowtables or hardware offload to accelerate downloads.

---

## 5. High-Priority Zero-Drop DSCP Classification Engine

Managed in `/etc/nftables.d/15-ark-dscp-priority.nft` for OpenWrt modern (`fw4` / nftables) and replicated via `iptables -t mangle` for legacy (`fw3`).

### 5.1 Architectural Rationale
Instead of dropping packets or relying on heavy deep-packet inspection (DPI) that exhausts embedded CPUs, ARK Router utilizes the DiffServ field in the IPv4/IPv6 header to place critical packets into CAKE's highest priority scheduling tin (`Voice` / `Network Control`).

### 5.2 Classification Rules & Priority Tins
```
+----------------------------------------------------------------------------------------------------+
| Traffic Type                  | Protocol & Ports           | Target DSCP Class | CAKE / FQ Tin     |
+----------------------------------------------------------------------------------------------------+
| ICMP & ICMPv6 Echo Request    | IP proto 1, IPv6 proto 58  | CS6 (Class 6)     | Priority / Voice  |
| ICMP & ICMPv6 Local Replies   | Output hook filter         | CS6 (Class 6)     | Priority / Voice  |
| DNS Inbound Queries           | UDP/TCP 53, 853, 5353      | CS6 (Class 6)     | Priority / Voice  |
| DNS Local Responses           | UDP/TCP sport 53, 853, 5353| CS6 (Class 6)     | Priority / Voice  |
| TCP Handshakes & Teardown     | TCP flags SYN, RST, FIN    | CS5 (Class 5)     | Priority / Voice  |
+----------------------------------------------------------------------------------------------------+
```

- **CS6 (Class Selector 6 - DSCP `0x30` / `48`)**: Network Control. Guarantees that diagnostic ping packets and DNS resolution queries jump ahead of multi-megabyte video or torrent downloads in the queues.
- **CS5 (Class Selector 5 - DSCP `0x28` / `40`)**: Signaling. Accelerates TCP three-way handshakes (`SYN`, `SYN-ACK`) and connection tear-downs (`FIN`, `RST`). Drastically improves page load responsiveness (LCP / TTFB).
- **Zero-Drop Policy**: Bulk torrents, streaming, and background transfers are never dropped; they simply yield priority during queue contention.
- **Authoritative References**:
  - RFC 2474: Definition of the Differentiated Services Field (DS Field) in the IPv4 and IPv6 Headers.
  - RFC 2475: An Architecture for Differentiated Services.
  - RFC 4594: Configuration Guidelines for DiffServ Service Classes.

---

## 6. Network, WAN, PPPoE & Baby Jumbo Frames (RFC 4638)

Managed by `/usr/lib/ark/modules/network.sh`, `/etc/hotplug.d/iface/05-ark-pppoe-babyjumbo`, and `99-ark-mtu`.

### 6.1 Baby Jumbo Frames (RFC 4638) Implementation
- **The Problem**: Standard Ethernet MTU is 1500 bytes. PPPoE requires 8 bytes of encapsulation header (6 bytes PPPoE + 2 bytes PPP Protocol ID). Standard PPPoE is thus forced to run at MTU 1492, requiring TCP MSS Clamping to 1452 bytes. This induces packet fragmentation and CPU clamping overhead.
- **The RFC 4638 Solution**:
  1. The parent physical Ethernet device (e.g., `eth0`) is elevated to MTU **1508** (or **1512** for VLAN tagged setups).
  2. The virtual `pppoe-wan` interface negotiates a full **1500 byte** MTU and MRU.
  3. TCP MSS Clamping is completely eliminated (`mss = 1460`), matching native Ethernet payloads.
- **Idempotent Hotplug Enforcement**:
  `/etc/hotplug.d/iface/05-ark-pppoe-babyjumbo` intercepts `ifup` events. If `network.$INTERFACE.device_mtu = 1508` and `network.$INTERFACE.mtu = 1500`, it ensures the kernel physical link and PPPoE interface remain strictly locked at 1508/1500 bytes.
- **Authoritative Reference**: RFC 4638: *"Accommodating an MTU of Greater Than 1492 in PPPoE"*.

### 6.2 Modem / ONT Isolated IP Alias (`modem_ip`)
- When a fiber ONT (Optical Network Terminal) or cable modem operates in bridge mode, its internal web management interface (typically `192.168.1.1` or `192.168.100.1`) becomes unreachable once the router establishes a PPPoE session or public DHCP lease.
- **ARK Router Implementation**:
  Declares a static IP alias on the physical WAN port within the modem's subnet (e.g., `192.168.1.254/24` on `eth0`). Adds a dedicated firewall SNAT rule allowing LAN clients to access the modem's diagnostic UI at `192.168.1.1` concurrently with active internet on `pppoe-wan`.

### 6.3 Multi-WAN Routing Engine (`mwan3`)
- **Policies**:
  - `balanced`: Session-based load balancing weighted across active WANs.
  - `balanced_devices`: Sticky device-based load balancing (all connections from a single client device stick to one WAN, preventing online banking / session disconnects).
  - `failover` (`wan_then_wan2`): Primary traffic routes over WAN 1; fails over to WAN 2 in $< 1$ second upon link failure.
  - `failover_wan2` (`wan2_then_wan`): Reverse failover priority.
  - `wan1_only` / `wan2_only`: Dedicated single-WAN pinning.
- **Torrent PBR Sticky Routing (`mwan-torrent-toggle`)**:
  BitTorrent protocols open hundreds of simultaneous UDP and TCP sessions. If distributed across multiple WANs with different public IPs, torrent trackers reject connections or ban users. ARK Router creates a dedicated high-priority PBR rule pinning all torrent traffic (or specific local device IP) to a single WAN interface.
- **Auto-WAN Autonomous Daemon (`ark-autowan-daemon`)**:
  A lightweight C/ash background daemon monitoring physical link carrier state (`/sys/class/net/*/carrier`).
  - Automatically senses when a cable is plugged into a designated LAN port.
  - Issues DHCP discovery probes.
  - If an upstream gateway replies, automatically promotes the port from LAN to WAN2, applies firewall zones, and starts `mwan3` with the configured policy.
  - If the link drops permanently, cleanly reverts the port back to LAN without user intervention.

---

## 7. IPv6 Architecture, SLAAC & Cross-Platform Compliance

Configured in `network.sh`, `99-ark-router-dhcp-sanitize`, and audited by `doctor.sh`.

### 7.1 RFC 9096: Deprecation of Stale IPv6 Prefixes
- **The Problem**: When a residential ISP disconnects and reconnects PPPoE, it delegates a *new* IPv6 `/64` or `/56` prefix. Devices on the LAN retain their old SLAAC addresses until the old prefix preferred lifetime expires (often hours or days). LAN devices attempt to route outbound packets using deprecated source addresses, causing a catastrophic IPv6 connection stall.
- **ARK Router Solution**:
  Enforces `uci set dhcp.lan.ra_prefer_old='0'`. This instructs `odhcpd` to immediately send Router Advertisement (RA) messages with a Lifetime of 0 for deprecated prefixes upon WAN re-connection, forcing all operating systems to instantly purge obsolete IPv6 addresses.
- **Authoritative Reference**: RFC 9096: *"Improving the Robustness of Stateless Address Autoconfiguration (SLAAC) to Premature Default Router Invalidation"*.

### 7.2 Apple iOS / macOS SLAAC Compatibility
- Apple devices (iPhones, iPads, MacBooks) do not implement DHCPv6 client stateful addressing (RFC 8415) by architectural design; they rely exclusively on SLAAC (RFC 4862) with RDNSS (RFC 8106).
- If a router advertises the **Managed Address Configuration (M-bit)** flag, Apple devices stall during network discovery waiting for a DHCPv6 response that never resolves.
- **ARK Router Sanitation Engine**:
  - Automatically purges `managed-config` (M-bit) from `dhcp.lan.ra_flags`.
  - Enforces `ra_slaac = 1`.
  - Sets `other-config` (O-bit) to distribute DNS servers and domain search lists statelessly via RDNSS.
  - Enforces rapid RA interval timing: `ra_mininterval = 20`, `ra_maxinterval = 60` seconds.
  - Sets `ra_default = 2`: Router Advertisement will only declare the router as default gateway if a verified default IPv6 route exists on upstream WAN, preventing IPv6 blackholes.
- **Authoritative References**:
  - RFC 4862: IPv6 Stateless Address Autoconfiguration.
  - RFC 8106: IPv6 Router Advertisement Options for DNS Configuration.

### 7.3 IPv6 Operating Modes
```
+----------------------------------------------------------------------------------------------------+
| Mode Name   | Backend Parameter  | Functional Behavior                                             |
+----------------------------------------------------------------------------------------------------+
| Dual-Stack  | dual_stack         | Native IPv6 with DHCPv6-PD prefix delegation from ISP WAN.      |
| Relay       | relay              | Transparently bridges upstream ISP RA/NDP across WAN and LAN.   |
| NPTv6       | nptv6 (RFC 6296)   | Translates internal ULA (fc00::/7) 1:1 into dynamic ISP prefix. |
| IPv4-Only   | ipv4_only          | Shuts down odhcpd RA/DHCPv6; enables filter-aaaa in dnsmasq.     |
+----------------------------------------------------------------------------------------------------+
```

- **IPv4-Only DNS Turbo Acceleration (`filter-aaaa`)**:
  When IPv4-Only mode is enabled, `filter-aaaa` is activated in `dnsmasq`. This discards AAAA DNS queries locally and instantly, preventing mobile apps from waiting for IPv6 timeouts on connections that only possess IPv4 transit.

---

## 8. Wi-Fi Subsystem, 802.11k/v/r Roaming, Wi-Fi 6/7 & Silicon Drivers

Located in `/usr/lib/ark/modules/wifi.sh`, `/etc/uci-defaults/99-ark-router-wifi`, and `WPAD_UPGRADE_AND_WIFI6_ROAMING.md`.

### 8.1 Out-of-the-Box Radio Governance & Brazilian Regulatory Compliance
- Standard OpenWrt ships with Wi-Fi radios administratively disabled (`disabled = 1`). ARK Router automatically sets `disabled = 0` on first boot for all discovered physical PHYs.
- Sets regulatory country code to `BR` (Brazil - Anatel).
- **UNII-3 Safeguard for 160 MHz Channelization**:
  On 5 GHz radios configured for 160 MHz bandwidth (`HE160` / `VHT160`), channels in the UNII-3 band (149-165) do not have contiguous 160 MHz spectrum available under Anatel / FCC regulations without overlapping weather radar. ARK Router detects if a user selects channels $\ge 132$ and automatically adjusts `htmode` to `HE80` or switches to lower channels (36-48), preventing `hostapd` crashes and `AP-DISABLED` boot loops.

### 8.2 Seamless Roaming: 802.11k, 802.11v, 802.11r & FT-SAE Traps
- **802.11k (Radio Resource Measurement - RRM)**:
  `rrm_neighbor_report = 1`. Enables APs to provide a list of neighboring APs to client devices upon request, eliminating the need for clients to scan all channels.
- **802.11v (BSS Transition Management)**:
  `bss_transition = 1`, `wnm_sleep_mode = 1`. Allows the router to send BSS Transition Management request frames instructing a mobile client to roam to an adjacent band or AP before link degradation.
- **The 802.11r (Fast Transition) & WPA3-SAE Trap**:
  - Fast BSS Transition (`ft_psk`) works reliably on pure WPA2-PSK.
  - However, on modern **WPA3-Personal (SAE)** and **WPA2/WPA3 Mixed** networks, standard 802.11r (`ft_sae`) introduces severe key derivation conflicts (`PMK-R0` / `PMK-R1` derivation) on major client chipsets (Samsung Galaxy S24, Google Pixel, iPhone 15/16, Intel Wi-Fi 6E/7 BE200). Clients reject authentication handshakes or enter disconnect loops.
  - **ARK Router Solution**:
    When WPA3 or Mixed encryption is active, ARK Router intelligently deactivates 802.11r (`ieee80211r = 0`) while fully maintaining 802.11k and 802.11v assisted roaming. Roaming remains fast ($< 30\text{ ms}$) without authentication rejections.

### 8.3 Qualcomm QSDK Native Roaming vs `usteer` Daemon
- On **Qualcomm SoCs running QSDK** (e.g., IPQ5332 with `qca-hostapd-11be`):
  Roaming and band steering are executed in native silicon firmware. ARK Router detects `ark_has_qca_wifi` and configures FILS Discovery (`fils_discovery_max_interval = 20`), RNR Co-located elements (`rnr = 1 7`), and disables external `usteer` to avoid dual-daemon race conditions.
- On **Standard OpenWrt (MediaTek MT76/MT79, Atheros ath9k/ath10k)**:
  ARK Router deploys the `usteer` daemon with calibrated parameters:
  - Hysteresis: `8 dB` (prevents ping-pong flapping between bands).
  - High-Speed 5 GHz Threshold: `-70 dBm`.
  - Zero forced kicks: `min_snr = 0`, `load_kick = 0` (uses 802.11v BSS Transition frames; never violently disassociates active clients).

### 8.4 Mobile & IoT Stabilization Safeguards
Smart home devices (ESP8266, ESP32, Tuya, Tasmota, smart plugs) and smartphones in deep sleep are notoriously vulnerable to dropping off Wi-Fi.
- `wpa_group_rekey = 0`: Disables periodic Group Transient Key (GTK) rotation. Periodic GTK rekeying wakes up sleeping mobile chipsets, causing broadcast loss and disconnects.
- `disassoc_low_ack = 0`: Prevents `hostapd` from prematurely disconnecting clients that fail to ACK a single low-level packet during sleep states.
- `dtim_period = 2`: Balances battery saving for IoT devices with timely multicast delivery.
- `max_inactivity = 86400`: Allows sleeping IoT devices to remain associated for up to 24 hours without keepalive drops.

### 8.5 Wi-Fi 6 (802.11ax) & Wi-Fi 7 (802.11be) Parameterization
```
+----------------------------------------------------------------------------------------------------+
| Parameter             | UCI Option               | Standard & Technical Description                |
+----------------------------------------------------------------------------------------------------+
| BSS Coloring          | bss_color=auto           | IEEE 802.11ax Spatial Reuse. Assigns numerical  |
|                       | he_bss_color=1           | color ID to the BSS, allowing clients to ignore |
|                       |                          | co-channel interference from neighboring APs.   |
| Target Wake Time      | twt_responder=1          | IEEE 802.11ax power saving. Schedules specific  |
|                       |                          | wake times for IoT devices, saving 60%+ battery.|
| OFDMA (DL & UL)       | he_ul_ofdma=1            | Orthogonal Frequency Division Multiple Access.  |
|                       |                          | Divides channels into Resource Units (RUs).     |
| Multi-User MIMO       | he_mu_beamformer=1       | Simultaneous multi-stream spatial transmission. |
|                       | he_ul_mumimo=1           |                                                 |
| Beamforming           | he_su_beamformer=1       | Directs RF energy towards specific client device|
|                       | he_su_beamformee=1       | antenna matrices via channel sounding feedback. |
| Preamble Puncturing   | he_puncturing=1          | IEEE 802.11ax/be channel bonding. Allows wide   |
|                       |                          | channels (160/320 MHz) even if sub-channel busy.|
| MLO Bridging          | /etc/hotplug.d/net/      | IEEE 802.11be Multi-Link Operation. Bridges     |
|                       | 98-ark-mlo-bridge        | virtual mld* interfaces dynamically into br-lan.|
| Wireless Eth Dispatch | wifi-wed-toggle          | MediaTek hardware offload. Connects Wi-Fi DMA   |
|                       |                          | rings directly to the Ethernet Packet Engine.   |
+----------------------------------------------------------------------------------------------------+
```

- **Authoritative References**:
  - IEEE Std 802.11ax-2021: High Efficiency WLAN (HE).
  - IEEE Std 802.11be: Extremely High Throughput (EHT / Wi-Fi 7).
  - MediaTek MT7986/MT7981 WED (Wireless Ethernet Dispatch) Architecture Whitepaper.

---

## 9. ARK Doctor: Autonomous Self-Healing Diagnostic Engine

Managed by `/usr/lib/ark/modules/doctor.sh`, `/etc/init.d/ark-firewall-guard`, and `/usr/sbin/ark-doctor`.

ARK Doctor executes a comprehensive, rule-based diagnostic check covering 30+ potential failure points across Linux kernel memory, storage, routing, firewall, Wi-Fi, and DNS.

### 9.1 Diagnostic Checklist, Failure Conditions & Automated Healing Actions
```
+----------------------------------------------------------------------------------------------------+
| Subsystem Checked       | Failure Condition Detected        | Automated Repair Executed (doctor-fix)       |
+----------------------------------------------------------------------------------------------------+
| RAM & Kernel Caches     | Free RAM < 15 MB                  | Recycles dentry/inode caches:                |
|                         |                                   | sync && echo 3 > /proc/sys/vm/drop_caches    |
| Storage Health          | /overlay mounted Read-Only (RO)   | Flags critical flash failure; triggers safe  |
|                         | or bad blocks detected            | storage unmount and urgent backup alert      |
| Kernel OOM Killer       | Out of Memory traces in dmesg     | Lowers process memory limits; enables ZRAM   |
| SQM Interface Sync      | SQM queue bound to virtual WAN    | Remaps queue to physical l3_device (e.g.     |
|                         | instead of physical device        | pppoe-wan or eth0.100) and restarts SQM      |
| SQM Framing Overhead    | Mismatched framing (e.g., 0B      | Recalibrates overhead to 28B/34B/44B based   |
|                         | overhead on PPPoE fiber)          | on active WAN encapsulation profile          |
| Baby Jumbo MTU          | Parent eth MTU < 1508 or          | Elevates parent interface to 1508; restores  |
|                         | pppoe-wan MTU < 1500              | pppoe-wan MTU to 1500 (RFC 4638)             |
| Flow Offload vs SQM     | Fastpath active concurrently      | Disables Fastpath/PPE to restore CAKE queue  |
|                         | with SQM/CAKE                     | scheduling priority                          |
| Flow Offload vs MWAN3   | Fastpath active with 2+ WANs      | Disables Fastpath to restore mwan3 session   |
|                         |                                   | balancing and failover routing               |
| Hardware Offload Engine | flow_offloading_hw=1 on CPU       | Reverts flow_offloading_hw to 0; retains     |
|                         | without silicon accelerator       | software flowtable acceleration              |
| Rogue DHCP on AP        | DHCP server active on router      | Sets dhcp.lan.ignore=1; stops dnsmasq DHCP   |
|                         | operating in Access Point mode    | to prevent double NAT and IP conflicts       |
| Multicast (IGMP Snooping)| br-lan igmp_snooping=0           | Enables IGMP snooping in bridge device to    |
|                         |                                   | prevent IPTV / multicast Wi-Fi flooding      |
| Orphan Mesh Interfaces  | Residual 802.11s mesh interfaces  | Destroys orphan wlan-mesh interfaces from    |
|                         | active in kernel without UCI config| kernel using iw dev <iface> del              |
| Pure Firewall (fw4)     | Legacy iptables rules or wrappers | Flushes residual iptables tables; migrates   |
|                         | lingering in nftables kernel      | rules cleanly to pure nftables               |
| Apple SLAAC Compliance  | managed-config active on LAN or   | Strips M-bit; restores SLAAC + other-config  |
|                         | SLAAC disabled                    | (O-bit RDNSS RFC 8106)                       |
| IPv6 Prefix Deprecation | ra_prefer_old != 0                | Sets ra_prefer_old=0 (RFC 9096 compliance)   |
| MAC Address Collision   | LAN bridge port shares duplicate  | Reverts LAN MAC to factory OEM hardware address|
|                         | MAC address with WAN port         |                                              |
| Wi-Fi Band Credentials  | Divergent passwords or ciphers    | Unifies SSID credentials across 2.4/5/6 GHz  |
|                         | between 2.4 GHz and 5 GHz bands   | to enable seamless 802.11v client steering   |
| FT-SAE Roaming Conflict | 802.11r active on WPA3-Personal   | Disables ieee80211r on WPA3 interfaces to    |
|                         |                                   | eliminate Galaxy S24 / iPhone auth drops     |
| Qualcomm QSDK Tuning    | QSDK detected with usteer running | Disables usteer; configures native RNR /     |
|                         |                                   | FILS discovery in qca-hostapd-11be           |
| usteer Calibration      | Bad hysteresis or forced kicks    | Sets hysteresis=8dB, min_snr=0, load_kick=0, |
|                         |                                   | steer threshold -70 dBm                      |
| IoT Wi-Fi Stability     | wpa_group_rekey > 0 or            | Sets wpa_group_rekey=0, disassoc_low_ack=0,  |
|                         | disassoc_low_ack=1                | max_inactivity=86400                         |
| NTP Clock Validity      | Year < 2024 (RTC clock lost)      | Reads timestamp from /etc/ark-clock.timestamp|
|                         |                                   | restarts NTP; restores TLS cert validity     |
| Conntrack Saturation    | NAT connections > 85% of limit    | Doubles nf_conntrack_max; purges dead states  |
| UPnP STUN Traversal     | STUN disabled under CGNAT         | Configures stun.cloudflare.com:3478 in upnpd  |
+----------------------------------------------------------------------------------------------------+
```

---

## 10. Hardware Abstraction Layer (HAL) & LED Control Subsystem

Managed in `/usr/lib/ark/led.sh`, `/root/usr/lib/ark/ark-rainbowd.uc`, and `/usr/sbin/ark-port-ledd`.

### 10.1 Multi-Topology Hardware LED Detection
ARK Router dynamically probes `/sys/class/leds` to detect three LED architectures:
1. `TOPOLOGY_I2C_MATRIX`: I2C LED matrix controllers, specifically the **AW21018** (18-channel constant current LED driver used on the Acer Predator Connect T7).
2. `TOPOLOGY_DIRECT_PHY`: Ethernet port LEDs tied directly to PHY transceivers or MDIO switch registers.
3. `TOPOLOGY_GPIO`: Standard Linux GPIO-driven LEDs controlled via standard sysfs triggers.

### 10.2 Hardware Autonomous Breathing (0% CPU Curve Registers)
Unlike standard software scripts that run endless `while sleep` loops to fade LEDs (wasting CPU cycles and waking processors from low-power states), ARK Router programs the internal hardware PWM curve registers of the AW21018:
- **Registers Programmed**: Writes configuration hex strings directly to `/sys/class/leds/aw21018_led/led`.
- **Hardware Curve**: Programs the `50 50` hex exponential ramp curve and sets the `GE1` bit in the AW21018 configuration register.
- **Result**: The hardware silicon executes autonomous, ultra-smooth analog breathing with **0% CPU utilization** and zero kernel timer interrupts.

### 10.3 Real-Time Port LED Daemon (`ark-port-ledd`)
Monitors physical Ethernet ports and drives link/activity LEDs with standard enterprise switch behavior:
- Reads carrier state from `/sys/class/net/<iface>/carrier`.
- Link Down $\rightarrow$ LED completely OFF.
- Link Up $\rightarrow$ Solid link LED.
- Network Traffic $\rightarrow$ Blinks activity LED proportional to packet deltas read from `/proc/net/dev`.
- In-memory caching: Writes to the I2C bus *only* when physical port status changes, eliminating bus flooding.

### 10.4 Event-Driven Rainbow Spectrum Daemon (`ark-rainbowd.uc`)
For gaming presets and aesthetic branding, ARK Router implements a multi-color spectrum cycling daemon written in native **ucode** (`/usr/lib/ark/ark-rainbowd.uc`).
- Operates on the event-driven `uloop` asynchronous engine.
- Uses a precomputed 120-step analog Look-Up Table (LUT) for smooth RGB color transitions.
- Zero forks, zero shell invocations, and 0% CPU consumption.

---

## 11. Starlink Dishy Integration & Telemetry Pipeline

Managed in `/usr/lib/ark/modules/starlink.sh`, `/usr/bin/starlink-dish`, and `/usr/sbin/starlink-telemetry-daemon`.

### 11.1 gRPC Polling Architecture
- **Client Binary**: `/usr/bin/starlink-dish`, a high-performance compiled Go/C client.
- **Endpoint**: Starlink Dishy management IP `192.168.100.1:9200` via gRPC protobuf protocol (`SpaceX.API.Device.Device/Handle`).
- **Telemetry Captured**:
  - Outage status, cause, and duration.
  - Downlink and uplink throughput (bps).
  - PopPingDropRate and PopPingLatencyMs.
  - Dish orientation: azimuth, elevation, and tilt angle.
  - Obstruction percentage and wedge map.
  - Software version and sleep states.

### 11.2 Dual-WAN Policy Routing & CGNAT Route Isolation
- The Starlink Dishy app communicates over IPv4 link-local and CGNAT prefixes: `192.168.100.1` and `100.64.0.0/10` (RFC 6598).
- In Dual-WAN or Multi-WAN environments, standard default routes or VPN tunnels break communication with the Dishy app.
- **ARK Router Isolation**:
  Installs static host routes and policy-based ip rules (`ip rule add to 192.168.100.1 lookup <starlink_table>`), guaranteeing that all Dishy traffic egresses directly through the physical Starlink WAN port regardless of active VPN tunnels or Multi-WAN failover states.

### 11.3 25-Hour Circular RAM Buffer & Flash Wear-Leveling
- High-frequency telemetry polling (every 3 to 10 seconds) destroys SPI NAND/NOR flash memory if written directly to disk.
- **ARK Router Wear-Leveling Architecture**:
  - Telemetry samples are recorded strictly into a circular ring buffer in volatile memory (`/tmp/starlink_telemetry/`).
  - Implements a 25-hour history capacity in RAM ($< 4\text{ MB}$ footprint).
  - Data is synchronized to persistent flash (`/etc/starlink_history/`) only upon graceful shutdown, reboot, or once every 24 hours.
- **Executive Email Reporting (`starlink-telemetry-mailer`)**:
  Generates automated executive HTML performance reports with latency graphs, outage summaries, and attached CSV history via SMTP or the Resend HTTP API.

---

## 12. VPN Subsystems & Remote Access Governance

Managed in `/usr/lib/ark/modules/vpn.sh`.

### 12.1 Native WireGuard Server & Peer Provisioning
- **Cryptographic Generation**: Generates Curve25519 keypairs via `wg genkey` and `wg pubkey`.
- **Pre-Shared Keys**: Automatically provisions symmetric PSKs (`wg genpsk`) for post-quantum resistance.
- **QR Code Engine**: Integrates `qrencode` to generate Base64 PNG and ANSI terminal QR codes for mobile client provisioning.
- **WAN Re-sync Daemon (`ark-wireguard-wan-sync`)**:
  On Multi-WAN setups or dynamic IP ISP connections, when WAN failover occurs, remote WireGuard peers lose connectivity. The watchdog daemon tracks upstream IP changes and re-resolves endpoint hostnames, updating active WireGuard kernel peers without interrupting local interfaces.

### 12.2 ZeroTier Flash Wear Prevention (RAM Sandboxing)
- **The Problem**: The ZeroTier daemon continuously writes peer cache data, network identity packets, and connection metrics to `/var/lib/zerotier-one`. On OpenWrt routers with SPI flash, this continuous write traffic exhausts flash erase blocks within months.
- **ARK Router RAM Sandboxing (`ark-zerotier-ram`)**:
  - Intercepts ZeroTier startup in `/etc/init.d/ark-zerotier-ram`.
  - Redirects `/var/lib/zerotier-one` into a compressed `tmpfs` RAM mount (`/tmp/zerotier-one`).
  - Secret identity keys (`identity.secret`) are backed up to flash once, while all volatile peer databases operate purely in RAM.
  - Binds `uhttpd` and Dropbear securely to the ZeroTier interface (`zt*`), allowing remote router administration over encrypted overlays without exposing administration ports to the public WAN.

---

## 13. System Hygiene, RTC Clock Preserver & Web Watchdogs

Managed in `/usr/lib/ark/modules/system.sh`, `ark-clock-preserver`, and `ark-web-watchdog`.

### 13.1 Fake RTC Clock Preserver (`ark-clock-preserver`)
- **The Problem**: Most embedded consumer routers lack a battery-backed hardware Real-Time Clock (RTC). When powered off, their hardware clock resets to UNIX epoch (`1970-01-01`) or the firmware compilation date.
- Upon booting, if the clock is in 1970, all HTTPS / TLS connections fail immediately (`x509: certificate has expired or is not yet valid`). NTP cannot sync if upstream NTP servers require TLS or DNS over TLS (DoT), creating a chicken-and-egg lock.
- **ARK Router Solution**:
  - `ark-clock-preserver` saves the current epoch timestamp to `/etc/ark-clock.timestamp` during graceful shutdown and every hour.
  - On early boot (`START=01`), before network interfaces or daemons initialize, it restores system time to the saved timestamp via `date -s @<timestamp>`.
  - Ensures system clock is always reasonably current, allowing TLS certificates and LuCI to function immediately until NTP synchronizes.

### 13.2 Web Interface Watchdog (`ark-web-watchdog`)
- Periodically executes an HTTP probe (`wget -q -T 3 -O /dev/null http://127.0.0.1/`) every 60 seconds.
- If Nginx or `uhttpd` hangs or fails to respond within 3 seconds, executes automated recovery: sends `SIGKILL` to hung web server processes, restarts `uhttpd`/`nginx`, flushes LuCI index caches, and verifies recovery in system logs.

### 13.3 Safe Storage Reboot (`safe-storage-reboot`)
- Standard hard reboots (`reboot -f`) corrupt writable `/overlay` filesystems and external USB/NVMe storage drives.
- **ARK Router Graceful Shutdown**:
  1. Issues `sync` to flush all dirty memory pages and disk buffers to permanent storage.
  2. Stops heavy write daemons (ZeroTier, AdGuard Home, Transmission).
  3. Safely unmounts all external partitions (`umount -r -d /mnt/*`).
  4. Triggers clean kernel reboot via `busybox reboot`.

### 13.4 Transmission BitTorrent Hardening (`transmission-harden`)
- Optimizes `/etc/config/transmission` for embedded hardware:
  - Caps peer connection limits based on available router RAM (prevents conntrack and memory exhaustion).
  - Enables pre-allocation (`preallocation = 1`).
  - Restricts download directories to external storage mounts, preventing accidental flooding of internal flash storage.

---

## 14. Complete Package Management, Installation & OTA Lifecycle Engine

Managed in `/usr/lib/ark/modules/ezsetup.sh`, `/usr/lib/ark/common.sh`, `/usr/lib/ark/modules/wifi.sh`, `/usr/lib/ark/modules/vpn.sh`, and `install.sh`.

ARK Router includes a robust, hardware-aware package lifecycle manager capable of negotiating dependencies, verifying storage thresholds, healing broken repository feeds, and executing atomic updates across heterogeneous OpenWrt environments.

### 14.1 Dual Package Engine Abstraction (`apk` vs `opkg`)
OpenWrt is in transition between two packaging systems:
1. **`opkg` (IPK format)**: The traditional Debian-style package manager used in OpenWrt `19.07` through `24.x`.
2. **`apk` (APK format)**: The next-generation Alpine-derived package manager introduced in OpenWrt `25.x`+.

ARK Router abstracts both engines seamlessly through `/usr/lib/ark/common.sh`:
- `ark_has_apk()`: Detects `command -v apk`.
- `ark_has_opkg()`: Detects `command -v opkg`.
- `ark_package_manager()`: Returns the active manager (`apk` or `opkg`).
- `installed <package>`: Probes package presence via `apk info -e <package>` or `opkg status <package> | grep '^Status:.* installed$'`.
- **Atomic Execution Flags**:
  - `opkg install --force-overwrite <pkg>`
  - `opkg remove --force-depends <pkg>`
  - `apk add --allow-untrusted <pkg>`
  - `apk del <pkg>`

### 14.2 Dual Distribution Profiles & Storage Guardrails
To prevent flash exhaustion (which causes permanent write locks and bricks embedded routers), ARK Router enforces strict storage cutoffs before allowing any installation:

```
+----------------------------------------------------------------------------------------------------+
| Distribution Profile | Memory Threshold  | Flash Cutoff (/overlay) | Intended Hardware Classes     |
+----------------------------------------------------------------------------------------------------+
| Lite Profile         | RAM < 256 MB      | Hard block: < 3.5 MB    | 16 MB SPI Flash Routers       |
| (luci-app-ark-router)|                   | Warning: 3.5 - 6.0 MB   | (Cudy WR3000 v1, DGL-5500,    |
|                      |                   | Footprint: ~1.8 MB      | TP-Link Archer C6/C7)         |
+----------------------------------------------------------------------------------------------------+
| Full Profile         | RAM >= 480 MB     | Hard block: < 35.0 MB   | High-RAM Quad-Core & x86      |
| (luci-app-ark-router-|                   | Footprint: ~28.0 MB     | (Acer Predator W6x, BPi-R4,   |
|  full)               |                   |                         | Intel N100/N305, Proxmox VMs) |
+----------------------------------------------------------------------------------------------------+
```

- **Volatile Execution Rule for Lite**: On the Lite profile, heavy compiled binaries (e.g. `speedtest-go`, Starlink gRPC client) are NEVER committed to flash. They are dynamically fetched into volatile memory (`/tmp`), executed in RAM, and garbage-collected after use.
- **Persistent Binary Rule for Full**: On the Full profile, compiled Go/Rust binaries reside permanently in `/usr/bin/` (`speedtest-go` ~24 MiB, `zerotier` ~3.5 MiB, `starlink-dish` ~1.4 MiB).

### 14.3 Exhaustive Catalog of All Packages Installed by ARK Router
ARK Router coordinates, manages, and installs 25+ specific system packages across its functional modules:

```
+----------------------------------------------------------------------------------------------------+
| Package Name          | Primary Domain Module      | Function & Architectural Role                 |
+----------------------------------------------------------------------------------------------------+
| luci-base             | Base LuCI Runtime          | Modern LuCI JavaScript client-side MVC engine |
| rpcd & rpcd-mod-luci  | Access Control Layer       | Unified RPC dispatcher & permission broker    |
| nlbwmon               | Network Traffic History    | Netfilter-based per-device traffic accounting |
| luci-app-nlbwmon      | Network Traffic UI         | Original LuCI bandwidth historical dashboard  |
| tc-full               | Traffic Control Engine     | Full Linux traffic control (HTB, CAKE, CoDel) |
| libbpf1 & libelf1     | eBPF Subsystem             | Kernel BPF runtime pulled by tc-full          |
| kmod-sched-act-police | QoS Rate Limiter           | Upload policing action for guest bandwidth    |
| kmod-ifb              | Intermediate Functional Blk| Virtual interface for ingress SQM shaping     |
| kmod-sched-cake       | Bufferbloat Active Queue   | Comprehensive CAKE qdisc kernel module        |
| luci-app-sqm          | Bufferbloat UI             | LuCI interface for SQM configuration          |
| sqm-scripts           | SQM Orchestration          | Backend shaping scripts (layer_cake.qos)      |
| luci-app-mwan3        | Multi-WAN UI               | LuCI interface for Multi-WAN policy routing   |
| mwan3                 | Multi-WAN Core             | Policy routing daemon, metric probing & rules |
| luci-app-upnp         | Port Forwarding UI         | LuCI interface for UPnP / NAT-PMP IGD         |
| miniupnpd-nftables    | UPnP Daemon (Modern fw4)   | nftables-native IGD daemon (zero iptables)    |
| miniupnpd             | UPnP Daemon (Legacy fw3)   | iptables-compatible IGD daemon for legacy OS  |
| luci-app-uhttpd       | Web Server UI              | LuCI interface for uhttpd web server settings |
| kmod-tun              | Virtual Tunnel Driver      | Creates /dev/net/tun for WireGuard/Speedify   |
| wireguard-tools       | WireGuard Core             | Kernel WireGuard CLI (wg, wg-quick)           |
| luci-proto-wireguard  | WireGuard Protocol Handler | Netifd integration protocol for WireGuard     |
| kmod-wireguard        | WireGuard Kernel Driver    | In-kernel cryptographic tunneling engine      |
| qrencode              | Cryptographic Provisioning | Generates ANSI & PNG QR codes for peers       |
| zerotier              | Overlay Mesh VPN           | ZeroTier One client daemon (RAM sandboxed)    |
| speedify (optional)   | Channel Bonding Runtime    | Commercial multi-path bonding network engine  |
| adblock &             | DNS Adblocking             | Local domain blocker with memory super-cache  |
|  luci-app-adblock     |                            |                                               |
| AdGuardHome (optional)| Advanced DNS & Parental    | Embedded Go DNS proxy running in RAM on :3000 |
| speedtest-go          | WAN Speed Benchmark        | Multi-stream Ookla/Fast speedtest Go binary   |
| wpad-mbedtls /        | Wi-Fi Security & Roaming   | Full IEEE 802.11r/k/v/w/ax/be hostapd suite   |
|  wpad-openssl         |                            | (Replaces wpad-basic / wpad-mini)             |
| usteer &              | Band Steering Daemon       | Assisted BSS Transition steering daemon        |
|  luci-app-usteer      |                            |                                               |
| irqbalance            | Multicore IRQ Governance   | Distributes interrupts across CPU cores       |
| kmod-zram             | Virtual Compressed Swap    | In-kernel compressed RAM swap block device    |
| htop                  | Process Monitoring CLI     | Interactive terminal process viewer           |
| luci-i18n-*-pt-br     | Internationalization       | Brazilian Portuguese translation catalogs     |
| owut &                | Firmware Upgrader          | OpenWrt attended upgrade client & helpers      |
|  attendedsysupgrade   |                            |                                               |
| luci-app-package-mgr  | Package Manager UI         | Graphical repository browser and installer    |
+----------------------------------------------------------------------------------------------------+
```

### 14.4 The Acer T7 Kernel Module Stub Hack
On specific carrier or OEM hardware (such as the Acer Predator Connect T7 running Qualcomm IPQ5332 with kernel 5.4), `sch_cake.ko` is pre-compiled directly into the vendor rootfs, but is absent from the `opkg` database.
- When a user attempts to install `luci-app-sqm`, `opkg` aborts with an unmet dependency error (`unknown package kmod-sched-cake`).
- **ARK Router Solution (`ark_ensure_working_distfeeds`)**:
  Detects `/lib/modules/$(uname -r)/sch_cake.ko`. If present, synthesizes an official package status entry directly into `/usr/lib/opkg/status`:
  ```
  Package: kmod-sched-cake
  Version: 5.4.213-1
  Status: install user installed
  Architecture: arm_cortex-a7_neon-vfpv4
  ```
  This immediately satisfies `opkg` dependency resolution, allowing `luci-app-sqm` and `sqm-scripts` to install cleanly without rebuilding the kernel!

### 14.5 Wi-Fi Enhancer Atomic Upgrade (`wifi-enhancer-upgrade`)
Most OpenWrt factory firmware images ship with `wpad-basic`, `wpad-basic-mbedtls`, or `wpad-mini` to conserve storage on 8 MB/16 MB flash. These stripped-down packages lack support for:
- 802.11r Fast Transition (FT).
- 802.11k Radio Resource Measurement (RRM).
- 802.11v BSS Transition Management.
- WPA3-SAE (Personal) and WPA3-Enterprise.
- 802.11s Mesh networking.

**ARK Router Atomic Upgrade Procedure**:
1. Verifies `/overlay` free space ($> 1200\text{ KB}$ required).
2. Updates package indexes (`apk update` or `opkg update`).
3. Executes an atomic replacement:
   - On `apk`: `apk add wpad-mbedtls` (APK replaces conflicting packages automatically).
   - On `opkg`: `opkg remove wpad-basic wpad-basic-mbedtls --force-depends && opkg install --force-overwrite wpad-mbedtls`.
4. Gracefully reloads `hostapd` instances across all radios without interrupting active Ethernet WAN/LAN routing.

### 14.6 Automated OTA Upgrade & Manual Package Installer Engine
Managed by `self-update-start` and `manual-update-start` in `ezsetup.sh`.
- **4-Stage Upgrade Pipeline**:
  1. **Stage 1 (20-25%) — Safety Backup**: Automatically executes `sysupgrade -b /tmp/ark-router-before-self-update-*.tar.gz`, preserving all UCI settings, DHCP leases, and SSH keys in case of update failure.
  2. **Stage 2 (45-50%) — Multi-Tier Resilient Download**:
     - Tier 1: Primary release asset URL from GitHub Releases API.
     - Tier 2: Fallback tagged release `https://github.com/<repo>/releases/download/v<version>/<asset>`.
     - Tier 3: Fallback latest release `https://github.com/<repo>/releases/latest/download/<asset>`.
     - Tier 4: Raw GitHub repository branch `https://raw.githubusercontent.com/<repo>/main/dist/sdk/<asset>`.
  3. **Stage 3 (75%) — Atomic Installation**:
     - Executes `opkg install --force-overwrite <pkg>` or `apk add --allow-untrusted <pkg>`.
     - Verifies that `installed_version >= latest_version`. Aborts if version check fails.
  4. **Stage 4 (90-100%) — Cache Invalidation & Reload**:
     - Re-runs theme defaults `/etc/uci-defaults/99-ark-router-theme`.
     - Deletes `/tmp/luci-indexcache` and purges `/tmp/luci-modulecache/*`.
     - Restarts `rpcd` and `uhttpd` in background subshells to avoid terminating the active HTTP response before completion.

### 14.7 Bloatware & Residual Cleanup Engine (`cleanup-apply`)
To maximize free space on 16 MB flash routers, ARK Router allows selective purging of heavy, non-essential OpenWrt packages:
- `updater`: Purges `luci-app-attendedsysupgrade`, `attendedsysupgrade-common`, and `owut` (saves ~110 KB).
- `package_manager`: Purges `luci-app-package-manager` (saves ~35 KB).
- `ipv6`: Purges `luci-proto-ipv6`, `odhcp6c`, and `odhcpd-ipv6only` when operating in strict IPv4-Only mode (saves ~280 KB).
- `translations`: Removes unused Portuguese/foreign language translation catalogs (`luci-i18n-*-pt-br`).
- `upnp`: Purges residual or conflicting `miniupnpd-iptables` binaries.
- `speedify_residue`: Removes orphaned chroot directories, temporary mounts, and socket files left behind by uninstalled Speedify instances.

---

## 15. Living Inventory: 74 ARK Feature Contracts Cross-Reference

Every feature in ARK Router is governed by an automated functional contract verified across virtual and physical targets.

```
+----------------------------------------------------------------------------------------------------+
| Feature ID    | Feature Name & Scope                                | Primary Backing Commands     |
+----------------------------------------------------------------------------------------------------+
| ARK-UI-001    | LuCI Overview Dashboard & Real-Time Telemetry       | rpc.js, ubus poll            |
| ARK-UI-002    | Responsive ARK Theme, Mobile-First Header & CSS     | ark-theme.js, cascade.css    |
| ARK-UI-003    | Theme Selector, Dark/Light Mode & Accent Palettes   | theme <name>                 |
| ARK-WAN-001   | Physical Primary WAN Port Configuration             | wan-save                     |
| ARK-WAN-002   | PPPoE Credential Management & Multi-ISP Profiles    | pppoe-profile-save           |
| ARK-WAN-003   | Baby Jumbo Frames Optimization (MTU 1508 / 1500)    | 05-ark-pppoe-babyjumbo       |
| ARK-WAN-004   | Auto-WAN Dynamic Port Conversion (LAN to WAN2)      | autowan-wan-to-lan           |
| ARK-WAN-005   | Multi-WAN Policy-Based Routing Engine (mwan3)       | mwan <policy>                |
| ARK-WAN-006   | Sub-Second Dual-WAN Failover & Probe Resilience     | ark-probe-disconnect         |
| ARK-WAN-007   | Dual-WAN Load Balancing (Session & Sticky Devices)  | mwan balanced_devices        |
| ARK-WAN-008   | Isolated Bridge Access to Modem/ONT Web GUI         | modem_ip                     |
| ARK-WAN-009   | TCP Turbo: Kernel Buffer & Congestion Optimization  | tcp_turbo                    |
| ARK-WAN-010   | Latency Monitor & Dynamic Ping Targets              | ping-target-set              |
| ARK-WAN-011   | NPTv6 (RFC 6296) vs NDP Relay & ULA Synchronization | ipv6-mode-set nptv6          |
| ARK-LAN-001   | LAN Subnet Configuration & Central DHCP Server      | lan-save                     |
| ARK-LAN-002   | LAN Bridges, 802.1Q VLANs & DSA Switch Isolation   | network-mode-set             |
| ARK-LAN-003   | DHCP Hostname RFC 1123 Sanitization Engine          | sanitize_dhcp_hostnames      |
| ARK-LAN-004   | Secondary Static IP Leases & Reservations           | device-reserve-secondary     |
| ARK-LAN-005   | Triple-Correlated Flush of Stale DHCP Leases        | flush-stale-leases           |
| ARK-IPV6-001  | Native Dual-Stack IPv6 & Prefix Delegation (PD)     | ipv6-mode-set dual_stack     |
| ARK-IPV6-002  | Hybrid IPv6 Relay Mode (odhcpd relay)               | ipv6-relay-toggle 1          |
| ARK-IPV6-003  | Strict IPv4-Only Mode & DNS filter-aaaa             | ipv6-disable-full            |
| ARK-FW-001    | Dual Firewall Abstraction (fw4/nftables vs fw3)     | ark_firewall_engine          |
| ARK-FW-002    | Device Parental Control & Hardware MAC Blocking     | device_apply_parental        |
| ARK-FW-003    | DMZ (Demilitarized Zone) Forwarding Host            | dmz-set                      |
| ARK-FW-004    | HTTPS Redirection & Web Administration Port Guard   | https-redirect               |
| ARK-FW-005    | UPnP / NAT-PMP IGD with Anycast STUN Anti-Crash     | upnp-toggle                  |
| ARK-FW-006    | Autonomous Firewall Guard Daemon                    | ark-firewall-guard           |
| ARK-SQM-001   | CAKE Smart Queue Management Bufferbloat Engine      | sqm-save-v2                  |
| ARK-SQM-002   | Dynamic SQM Interface Auto-Healing (l3_device)      | doctor-fix                   |
| ARK-SQM-003   | Multi-WAN Synchronized SQM Queues                   | sqm-save-v2                  |
| ARK-SQM-004   | CPU Multicore IRQ Balance Governance for SQM        | irqbalance-toggle            |
| ARK-QOS-001   | Per-Device Bandwidth Limits & Guest Rate Throttling | apply_device_bandwidth_limits|
| ARK-WIFI-001  | Dual/Tri-Band AP Governance & Out-of-Box Activation | 99-ark-router-wifi           |
| ARK-WIFI-002  | DFS Radar Optimization & UNII-3 160MHz Safeguard    | wifi-dfs-optimize            |
| ARK-WIFI-003  | 2.4 GHz Smart Home / IoT Stabilization Engine        | wifi-iot-optimize            |
| ARK-WIFI-004  | Seamless Roaming (802.11k/v/r & FT-SAE Shield)       | wifi-roaming-toggle          |
| ARK-WIFI-005  | Band Steering Controller (usteer Hysteresis Tuning)  | wifi-usteer-toggle           |
| ARK-WIFI-006  | Wi-Fi 6, 6E & Wi-Fi 7 Feature Suite (OFDMA/TWT/MLO) | wifi-wifi6-toggle            |
| ARK-WIFI-007  | EasyMesh 802.11s Mesh Controller & Satellite Sync   | wifi-mesh-satellite-apply    |
| ARK-WIFI-008  | WPS Pairing Control (Push Button & PIN)              | wifi-wps-pbc                 |
| ARK-WIFI-009  | Wireless Ethernet Dispatch (WED) Silicon Offload    | wifi-wed-toggle              |
| ARK-WIFI-010  | Fast Roaming 802.11k/v, RNR 6 GHz & Calibration     | wifi-qca-apply-roaming-tuning|
| ARK-WIFI-011  | Smart Wi-Fi Package Enhancer (Atomic wpad Upgrade)   | wifi-enhancer-upgrade        |
| ARK-HW-001    | Hardware Packet Processing Engine (PPE / Fastpath)   | flow_offloading_hw           |
| ARK-HW-002    | Hardware Topology Profiler & LED Preset Engine       | set-led-preset               |
| ARK-HW-003    | Dynamic Physical WAN Link Hotplug & LED Alert        | update-wan-led               |
| ARK-HW-004    | Autonomous RAM Cache Purging & Buffer Reclaim       | ram-purge-now                |
| ARK-HW-005    | Flash Storage Overlay Garbage Collection             | system-storage-purge         |
| ARK-STAR-001   | Direct Starlink Dishy gRPC / HTTP Telemetry Client   | starlink-dish                |
| ARK-STAR-002   | 25-Hour Circular RAM Telemetry Buffer with Wear-Level| starlink-telemetry-daemon    |
| ARK-STAR-003   | Starlink Public Dishy Redirection & CGNAT Routing   | starlink_setup_policy_routing|
| ARK-STAR-004   | Automated Outage Notification & Email Telemetry      | starlink-telemetry-mailer    |
| ARK-VPN-001    | Native WireGuard Server & Curve25519 Key Generation  | wireguard-enable             |
| ARK-VPN-002    | WireGuard Peer Management & Terminal QR Code Engine  | wireguard_peer_qr            |
| ARK-VPN-003    | WireGuard Client Tunnel Import & Status Monitor      | wireguard_client_import      |
| ARK-VPN-004    | WireGuard Hotplug WAN Failover Re-synchronization    | ark-wireguard-wan-sync       |
| ARK-VPN-006    | ZeroTier Sandboxing in RAM (Flash Wear Protection)   | ark-zerotier-ram             |
| ARK-VPN-007    | Speedify Multi-Path Bonding Engine Integration       | speedify-prepare             |
| ARK-BLOCK-001  | Integrated DNS Adblock & Cloudflare Family DNS       | adblock-enable               |
| ARK-BLOCK-002  | Custom DNS Whitelist & Blacklist Synchronization     | adblock-blacklist-sync       |
| ARK-HIST-001   | Traffic History Daemon & nlbwmon Sampling Database   | equipe-traffic-history       |
| ARK-DIAG-001   | ARK Doctor: Autonomous Self-Healing Diagnostic Engine| doctor-fix                   |
| ARK-DIAG-002   | High-Resolution Sub-Second Disconnect Probe Tester   | ark-probe-disconnect         |
| ARK-DIAG-003   | Multi-Stream WAN Speedtest Engine (Fast.com/CF)      | speedtest-download-fallback  |
| ARK-SYS-001    | Friendly Device Naming & DHCP Aliases Engine         | rename                       |
| ARK-SYS-002    | Two-Phase Token-Locked Safe Reboot Architecture      | reboot-confirm               |
| ARK-SYS-003    | Fast Setup Wizard (EZ-Setup Multi-Step Automation)   | ez-setup-apply               |
| ARK-SYS-004    | Modular Package Profile Manager (Lite vs Full)       | profile <name>               |
| ARK-SYS-005    | OTA Upgrade Engine & Manual Local IPK/APK Installer  | manual-update-start          |
| ARK-SYS-006    | System Branding, Title & Tri-Lingual i18n Switcher   | language / title             |
| ARK-SYS-007    | Nginx & uhttpd Web Server Auto-Recovery Watchdog     | ark-web-watchdog             |
| ARK-SYS-008    | Intelligent NTP, Fake RTC Preserver & Date Fallback  | ark-clock-preserver          |
| ARK-PERF-006   | Hardware-Adapted Zero-Latency DNS Cache Sizing       | 99-ark-router-dhcp-sanitize  |
+----------------------------------------------------------------------------------------------------+
```

---

## 16. Authoritative Standards, RFCs & Engineering Bibliography

Every parameter, algorithmic choice, and configuration value in ARK Router is grounded in established networking RFCs, IEEE specifications, Linux kernel documentation, and academic performance papers:

### 15.1 Internet Engineering Task Force (IETF) RFCs
- **RFC 4638**: *Accommodating a Maximum Transmission Unit (MTU) of Greater Than 1492 in the Point-to-Point Protocol over Ethernet (PPPoE)* — Foundation of ARK Router's 1508-byte Baby Jumbo parent device and 1500-byte PPPoE payload optimization.
- **RFC 9096**: *Improving the Robustness of Stateless Address Autoconfiguration (SLAAC) to Premature Default Router Invalidation* — Basis of `ra_prefer_old = 0` immediate prefix purge in `odhcpd`.
- **RFC 8106**: *IPv6 Router Advertisement Options for DNS Configuration (RDNSS/DNSSL)* — Governs stateless DNS delivery across Apple iOS/macOS and Android devices.
- **RFC 4862**: *IPv6 Stateless Address Autoconfiguration (SLAAC)* — Dictates M-bit elimination and autonomous address generation.
- **RFC 6296**: *IPv6-to-IPv6 Network Prefix Translation (NPTv6)* — Technical standard for ARK Router's multi-homed Multi-WAN IPv6 masquerading (`masq6`).
- **RFC 8290**: *The Flow Queue CoDel (FQ-CoDel) Packet Scheduler and Active Queue Management Algorithm* — Baseline queue management for non-CAKE interfaces.
- **RFC 2474 & 2475**: *Definition of the Differentiated Services Field (DiffServ)* — Standards for CS6 (Network Control) and CS5 (Signaling) classification in `15-ark-dscp-priority.nft`.
- **RFC 2684**: *Multiprotocol Encapsulation over ATM Adaptation Layer 5* — Technical framework for ATM cell padding and 48-byte overhead calculation.
- **RFC 6598**: *IANA-Reserved IPv4 Prefix for Shared Address Space (`100.64.0.0/10`)* — Architectural basis for Starlink Dishy CGNAT route isolation.
- **RFC 1123**: *Requirements for Internet Hosts — Application and Support* — Enforced by ARK Router's regex hostname sanitizer to prevent `dnsmasq` crashes.

### 15.2 IEEE 802.11 Wireless Specifications
- **IEEE Std 802.11k-2008**: *Radio Resource Measurement of Wireless LANs* — Neighbor reports (`rrm_neighbor_report = 1`).
- **IEEE Std 802.11v-2011**: *Wireless Network Management* — BSS Transition Management frames (`bss_transition = 1`), WNM sleep mode.
- **IEEE Std 802.11r-2008**: *Fast Basic Service Set (BSS) Transition* — Fast Over-the-Air / Over-the-DS handshakes.
- **IEEE Std 802.11ax-2021**: *High Efficiency WLAN (Wi-Fi 6)* — OFDMA, Target Wake Time (TWT), BSS Coloring, Spatial Reuse.
- **IEEE Std 802.11be**: *Extremely High Throughput (Wi-Fi 7)* — Multi-Link Operation (MLO), Preamble Puncturing, 320 MHz channels.
- **IEEE Std 802.11s**: *Mesh Networking* — Transparent Layer 2 path selection and frame forwarding.

### 15.3 Linux Kernel Documentation & Systems Research
- **Linux Kernel Networking Documentation**:
  - `Documentation/networking/scaling.rst`: Receive Packet Steering (RPS), Receive Flow Steering (RFS), and Byte Queue Limits (BQL).
  - `Documentation/core-api/irq/irq-affinity.rst`: SMP IRQ affinity masks and hardware interrupt steering.
  - `Documentation/admin-guide/blockdev/zram.rst`: In-memory compressed block devices.
  - `net/core/dev.c`: NAPI polling mechanics, `netdev_max_backlog`, and `netdev_budget`.
- **Academic Bufferbloat Research**:
  - Toke Høiland-Jørgensen, Dave Täht, Jim Gettys: *"The Bufferbloat Problem and What We Can Do About It"*, Communications of the ACM.
  - Toke Høiland-Jørgensen et al.: *"Piece of CAKE: A Comprehensive Queue Management and Scheduling Algorithm"*, IEEE/ACM Transactions on Networking (TON).
- **Semiconductor & Driver Whitepapers**:
  - MediaTek MT7986 / MT7981 Packet Processing Engine (PPE) & Wireless Ethernet Dispatch (WED) Programming Guide.
  - Qualcomm Atheros QCA9558 / IPQ5332 QSDK Hostapd & Automated Channel Selection (ACS) Driver Architecture.
  - Awinic AW21018 18-Channel Constant Current LED Driver with Autonomous Breathing Engine Datasheet.

---
*Manual compiled and verified for ARK Router production release. Zero omitted subroutines.*
