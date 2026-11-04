<p align="center">
  <img src="docs/screenshots/ark-router-banner.jpg" alt="ARK Router Hero Banner" width="100%">
</p>

# ARK Router

<p align="center">
  <a href="https://openwrt.org/"><img src="https://img.shields.io/badge/OpenWrt-19.07%20a%2025.x-00B5E2?logo=openwrt&logoColor=white" alt="OpenWrt"></a>
  <a href="https://github.com/Despensativo/ark-router/releases/tag/v2.2.0"><img src="https://img.shields.io/badge/release-v2.2.0-blue.svg" alt="Release v2.2.0"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/UI-PT--BR%20%2F%20EN%20%2F%20ES-blue" alt="Trilingual UI">
  <img src="https://img.shields.io/badge/arch-all%20%2F%20noarch-orange" alt="Arquitectura: All">
</p>

<p align="center">
  <b>🌐 Idiomas / Languages / Idiomas:</b><br>
  <a href="README.md">🇧🇷 <b>Português (Brasil)</b></a> &nbsp;•&nbsp;
  <a href="README.en.md">🇺🇸 <b>English</b></a> &nbsp;•&nbsp;
  <a href="README.es.md">🇪🇸 <b>Español</b></a>
</p>

---

**ARK Router** transforma los enrutadores con **OpenWrt** en auténticos centros de control operativos profesionales. Sustituye la interfaz estática tradicional de LuCI por un panel ejecutivo moderno, ultrarrápido, modular y 100% responsivo para smartphones y ordenadores.

El proyecto no reemplaza OpenWrt ni LuCI: opera como una suite avanzada de gestión (`luci-app-ark-router`) con telemetría en tiempo real, cero bloatware, salvaguardas anti-bloqueo y funciones pioneras de red y blindaje de memoria.

> **Versión Oficial Activa**: **`v2.2.0`** (consulte [`VERSION`](VERSION) y [Releases](https://github.com/Despensativo/ark-router/releases)).

---

## 🏆 Destaque de Ingeniería (`v2.2.0`): Arquitectura Dual-Engine de QoS & Kernel Networking

**ARK Router v2.2.0** introduce una arquitectura de **Control de Colas y Latencia (SQM Dual-Engine)** combinada con calibraciones de bajo nivel en el Kernel Linux (`BQL`, `RPS Multi-Core`, `NAPI` e `IEEE 802.3x`), documentada íntegramente en [`docs/ENCICLOPEDIA_MASTER_QOS_KERNEL_LINUX_ARK_2026.md`](docs/ENCICLOPEDIA_MASTER_QOS_KERNEL_LINUX_ARK_2026.md) y [`docs/ENGENHARIA_QOS_DUAL_ENGINE_E_MTU_2026_11.md`](docs/ENGENHARIA_QOS_DUAL_ENGINE_E_MTU_2026_11.md):

- **⚙️ Elección Inteligente entre 2 Motores de QoS en el Panel**:
  - **🛡️ Opción 1 — `CAKE (Layer Cake / DiffServ4)`**: Motor clásico `sch_cake` con aislamiento automático por dispositivo (`dual-srchost` / `dual-dsthost`), `nat`, `wash` y `no-split-gso`.
  - **🚀 Opción 2 — `HFSC + FQ-CoDel Turbo (Gamer & Gigabit Inteligente)`**: Motor `/usr/lib/sqm/ark_hfsc_fqcodel.qos` que combina 3 clases elásticas **HFSC (`Hierarchical Fair Service Curve`)** con **FQ-CoDel (`1024` flujos hash)**:
    - **Cola `1:10` Real-Time (`rt` curve `< 1 ms`)**: Curva de dos pendientes (`m1 = 40%` por `8ms`, `m2 = 20%`) exclusiva para paquetes `<= 511 bytes` (`u32 match u16 0x0000 0xfe00 at 2`) de Juegos UDP, VoIP, Ping, DNS, `L4S ECT(1)` y TCP SYN/ACK — bloqueando superpaquetes GRO de `16 KB` en la vía rápida.
    - **Cola `1:20` Interactive & Speed (`FQ-CoDel Turbo`)**: `ls` elástico hasta el `100%` del ancho de banda (`ul rate 100%`), `quantum 1514` (1 trama Ethernet por ronda DRR) y soporte nativo para **`ce_threshold` (L4S RFC 9332)**.
    - **Cola `1:30` Bulk Scavenger (`CS1`)**: Aísla torrents y copias de seguridad en la subida (`m2 = 5%`), liberando el `95%` del ancho de banda al instante sin estrangular la descarga cuando el proveedor remarca tráfico a `CS1`.
- **📡 Autocalibración por Perfil Físico de WAN (`xpon_bridge`, `xpon_vlan`, `dhcp_cable`, `mobile_starlink`)**: Ajusta automáticamente el overhead L2 (`34B` GPON PPPoE, `38B` PPPoE+VLAN, `18B` Cable DOCSIS/Starlink), `target`/`interval`/`ce_threshold`, **RFC 4638 Baby Jumbo Frames** (`eth1=1508` ➔ `pppoe-wan=1500` cero fragmentación), **RFC 4821 PLPMTUD** (`tcp_mtu_probing=1`) y MTU dinámico de túneles WireGuard (`1412` / `1420` / `1380`).
- **🎮 Base BufferSpeed de 80+ Juegos, NAT Abierta Asistida (`180s`) & Escalado Multi-Core Simétrico (`[AL-ARK-100..102]`)**:
  - **80+ Juegos y Consolas en 1 Clic**: Marcado bidireccional (`CS4` + `ct mark 0xa0`) para PS5/PSN, Xbox Live, Nintendo Switch, CS2, Valorant, Call of Duty/Warzone, Fortnite, EA FC, League of Legends, Discord y Cloud Gaming, con vía rápida en el cortafuegos (`ark_gaming_forward`) y timeout UDP de `180s`.
  - **RPS Multi-Core Simétrico `7/3` + Presupuesto NAPI `256/1200` (`[AL-ARK-100]`)**: Distribuye los puertos LAN (`rps_cpus=7`) y WAN/Wi-Fi (`rps_cpus=3`) manteniendo la `CPU3` (`IRQ 123`) 100% dedicada al DMA RX (`0%` pérdida), reduciendo el retraso interno de subida bajo carga combinada (`16 Down + 16 Up`) de `159 ms` a **`0.10–0.44 ms`**.
  - **BQL Físico `512 KB` Anti-Drop bajo PPPoE (`[AL-ARK-101]`)**: Calibra `limit_min=524288` (`512 KB`) y `fq_codel target 50ms interval 500ms quantum 1514 noecn` en el GMAC (`eth0`/`eth1`), eliminando el 100% de los descartes secundarios en tramas PPPoE (`0x8864` no-ECN).
  - **Aislamiento de Tormentas de Pause Frames `IEEE 802.3x` (`[AL-ARK-102]`)**: Desactiva `rx/tx flow control` (`ethtool -A`) en los puertos LAN/WAN, impidiendo que adaptadores USB-Ethernet de clientes pausen el switch físico del router.

---

## 🌟 Características Principales

1. **⚡ Centro Unificado de Rendimiento & Blindaje de Memoria**:
   - Tarjeta destacada en la Vista General con interruptores interactivos de primer nivel, contadores dinámicos de optimizaciones activas y aplicación instantánea en tiempo de ejecución sin reinicios innecesarios.
2. **🗜️ Compresión Inteligente de Memoria RAM (ZRAM / LZ4)**:
   - Duplica la capacidad multitarea efectiva de la memoria RAM mediante un disco swap comprimido ultrarrápido en LZ4, con cero desgaste de la memoria Flash.
   - **Bloqueo de Seguridad de 5 Segundos**: En enrutadores con $\ge 512$ MB de RAM física, el interruptor exige confirmación temporizada para evitar ciclos innecesarios de CPU.
   - **Modo Protegido para CPUs Mononúcleo (MIPS)**: Detecta procesadores modestos y limita el disco a 32 MB con `swappiness=15` para proteger el rendimiento de la CPU.
   - **Activación Inmediata**: En enrutadores multinúcleo con $\le 256$ MB (como el Cudy WR3000), asigna dinámicamente un espacio óptimo (116 MB) para absorber picos de tráfico.
3. **🎮 Apertura Automática de Puertos (UPnP / IGD) con Modo Seguro**:
   - Cambio rápido con respuesta visual inmediata:
     - **Modo Seguro (Desactivado - Predeterminado)**: Ningún puerto WAN externo se abre sin reglas explícitas en el cortafuegos.
     - **Modo Activo**: Permite la apertura bajo demanda para consolas de juegos (Xbox, PlayStation, PC) emitiendo avisos de seguridad en tiempo real.
4. **🩺 ARK Doctor (Auditor de Integridad y Autocura)**:
   - Diagnóstico continuo en tiempo de ejecución en 10 capas críticas: radios Wi-Fi, puentes de red, DHCP, cortafuegos (fw4/nftables puro), integridad de ZRAM (`Check 1b`), SQM y sintaxis de hostapd, con botón de autorreparación en 1 clic (`ark-doctor --fix`).
5. **🛡️ Bloqueador de Anuncios y Control Parental Híbrido (RAM / Nube)**:
   - **Perfil Full ($\ge 512$ MB RAM)**: Motor AdGuard Home completo ejecutándose directamente en memoria RAM (`/tmp/adguardhome`) en el puerto 3000 con más de 1 millón de reglas locales, supercaché, soporte nativo para **HTTP/3 QUIC (`h3://`)** y cero escritura en flash.
   - **Perfil Lite (128 MB a 256 MB RAM)**: Modo Nube ultraligero mediante `dnsmasq` con 9 proveedores Anycast especializados (Cloudflare Family, Quad9, CleanBrowsing, Control D, OpenDNS y NextDNS).
6. **🚫 Lista Negra Local de Sitios Web en 0ms**:
   - Bloqueo instantáneo de dominios específicos (apuestas, casinos, sitios no deseados) respondiendo `0.0.0.0` en 0ms con cero consumo extra de memoria RAM.
7. **⚡ Límite de Ancho de Banda Individual con Bypass de LAN Local (RFC 1918)**:
   - Control individual de velocidad de descarga y subida por dispositivo. El límite se aplica con precisión quirúrgica únicamente al tráfico de Internet: las transferencias locales (NAS, Plex, impresoras, PCs) continúan a velocidad nativa máxima (Gigabit o Wi-Fi 6 a 1200+ Mbps).
8. **🛑 Filtro Parental y SafeSearch Individual por Dispositivo**:
   - Bloqueo de contenido adulto y SafeSearch obligatorio (Google, Bing, YouTube) configurable por dispositivo individual.
9. **📊 Tráfico por Dispositivo en Tiempo Real (Hardware DMA & Anti-Jitter)**:
   - Medición instantánea desde contadores del controlador Wi-Fi (`iwinfo`), sin retrasos y con filtro de amortiguación suave (EMA) que evita saltos bruscos.
   - Columna de **Total Consumido** (MB/GB) y ordenación interactiva estable.
10. **🚀 DNS Turbo, Dual-DoH (`https-dns-proxy`) en 1 Clic & Escudo de Puertos 53/853**:
    - Comparación de latencia en tiempo real entre Cloudflare, Google, Quad9, OpenDNS y AdGuard, activación en 1 clic de **Dual-DoH (`https-dns-proxy`)** (`127.0.0.1#5053` + `#5054`) y escudo completo contra evasión DNS en Smart TVs y Android (*Private DNS* `TCP/UDP 853`).
11. **🌐 Acceso Remoto Inteligente con ZeroTier**:
    - Ejecución nativa en enrutadores con almacenamiento amplio y cargador ultrarrápido en RAM (0.3s) para dispositivos de 16 MB flash.
12. **🛰️ Central Multi-Starlink (Telemetría y Alineación)**:
    - Diagnóstico de múltiples antenas Starlink: brújula 3D, obstrucciones, pérdida de paquetes, SNR y visor público local sin contraseña en `/starlink/`.
13. **🔄 Ciclo Óptimo entre Fastpath (Flow Offload / PPE) y SQM Dual-Engine (`CAKE` / `HFSC + FQ-CoDel Turbo`)**:
    - Conmutación con exclusión mutua estricta. Al desactivar SQM en el interruptor rápido del panel, la aceleración de hardware (Fastpath/PPE) se reactiva automáticamente.
14. **🛡️ Auto-MTU Inteligente, Baby Jumbo MTU 1500 en PPPoE (RFC 4638) & PLPMTUD (RFC 4821)**:
    - Sondeo ICMP real sin fragmentación, ajuste automático de MTU 1508/1512 en la interfaz física base para lograr MTU 1500 pura en el túnel PPPoE y descubrimiento de PMTU en capa de paquete (`tcp_mtu_probing=1`).
15. **📱 Arquitectura V2: Cockpit de Estado, Central de Recursos & Diseño Mobile-First**:
    - Separación ejecutiva entre el **Cockpit** (telemetría pura en vivo) y la **Central de Recursos** (ciclo de vida completo de Servicios Nativos y Plugins Opcionales + **Modo Desarrollador**), 100% responsivo de 360px a 1440px+.
16. **🔀 Cambio en 1 Clic entre Modo Router y Modo Punto de Acceso (Dumb AP)**:
    - Unifica interfaces en un único puente (`br-lan`), desactiva DHCP y protege la administración con IP de Rescate permanente (`192.168.12.1` / `192.168.73.1`).
17. **🕸️ Inteligencia Wi-Fi 6/6E/7: Fast Roaming 802.11k/v Puro & Diagnóstico MacBook `awdl0`**:
    - Roaming `bss_transition=1` + `rnr=1` sin `wnm_sleep_mode`, junto con aviso contextual para la línea **Apple MacBook (M1 a M5)** mostrado exclusivamente en `160 MHz` para desbloquear `2400 Mbps` PHY (`1.4+ Gbps` reales).
18. **🌐 Balanceo PBR BitTorrent en Modo Seguro Amplio (Dual-WAN)**:
    - Reparte conexiones P2P en más de 64.500 puertos entre ambas conexiones WAN, protegiendo estrictamente los puertos de sistema (80, 443, 53) en la conexión principal.
19. **⚡ Servidor SMB 3.1.1 en Kernel (`ksmbd`), Wake-on-LAN & Cliente WireGuard Ultrarrápido**:
    - Servidor de archivos USB de alta velocidad en kernel (`ksmbd`), encendido remoto por Magic Packet (`etherwake`) e importación instantánea de túneles WireGuard (`.conf`).
20. **🌎 Internacionalización Triple con 100% de Paridad (i18n — 4.502 Claves)**:
    - Cobertura completa, nativa y auditada en Portugués de Brasil (PT-BR), Inglés (EN) y Español neutro (ES).

---

## 📸 Capturas de Pantalla

Capturas reales tomadas directamente de un enrutador físico en pruebas (Cudy WR3000 v1 / OpenWrt 25.12.5):

| Rendimiento & Blindaje de Memoria (ZRAM / UPnP) | Vista General del Panel |
| :---: | :---: |
| ![Rendimiento y Blindaje de Memoria](docs/screenshots/perf-hardening-card.png) | ![Vista General del Panel](docs/screenshots/dashboard-overview.png) |

| Asistente Inicial Ark - Setup | Control de WAN y Multi-WAN |
| :---: | :---: |
| ![Ark Setup](docs/screenshots/ark-setup.png) | ![Editor WAN](docs/screenshots/wan-editor.png) |

| Calibración de SQM / CAKE | Telemetría Starlink en Tiempo Real |
| :---: | :---: |
| ![Editor SQM](docs/screenshots/sqm-editor.png) | ![Telemetria Starlink](docs/screenshots/starlink-telemetry-real.png) |

| Interfaz Móvil Optimizada | Auditoría de Salud con Ark Doctor |
| :---: | :---: |
| ![Vista Movil](docs/screenshots/mobile-overview.png) | ![Ark Doctor](docs/screenshots/theme_switched_to_ark.png) |

---

## 🖥️ Enrutadores Validados

| Dispositivo | Arquitectura | Memoria / Almacenamiento | Versión OpenWrt | Perfil ARK |
| :--- | :--- | :--- | :--- | :--- |
| **Cudy WR3000 v1** | MediaTek Filogic 820 (ARM64 Dual-Core) | 256 MB RAM / 16 MB Flash SPI | 25.12.5 / 24.x (`apk`) | Standard / Full |
| **Acer Predator Connect W6x** | MediaTek Filogic 830 (ARM64 Quad-Core) | 1 GB RAM / 512 MB Flash | 25.12.x / 24.x (`apk`) | Full |
| **D-Link DGL-5500** | Qualcomm Atheros QCA9558 (MIPS Single-Core) | 128 MB RAM / 16 MB Flash | 19.07 a 23.05 (`opkg`) | Lite |
| **VirtualBox x86_64 (`OpenWrt-ARK-Dev`)** | Intel/AMD x86_64 Multinúcleo | 512 MB a 2 GB RAM | 24.10 / 25.x | Full / Dev |

---

## 📦 Instalación Rápida

ARK Router se instala sobre cualquier sistema OpenWrt con LuCI existente. **No reemplaza el kernel** ni altera la configuración de red de forma automática.

### Método 1: Instalador Automático de 1 Línea (Recomendado)

Conéctese por SSH a su enrutador y ejecute:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | sh
```

El instalador detecta si el sistema utiliza `apk` u `opkg`, inspecciona la RAM libre y el espacio en flash, y selecciona automáticamente el mejor perfil (**Lite**, **Standard** o **Full**).

### Forzar un Perfil Específico:
- **Perfil Lite** (para enrutadores con 128 MB a 256 MB de RAM y 16 MB flash):
  ```sh
  wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=lite sh
  ```
- **Perfil Full** (para enrutadores con 512 MB o más de RAM):
  ```sh
  wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/install.sh | ARK_ROUTER_PROFILE=full sh
  ```

---

### Método 2: Instalación Manual de Paquetes (`.apk` o `.ipk`)

Descargue los paquetes directamente de la sección de **[Releases](https://github.com/Despensativo/ark-router/releases)**:

- **OpenWrt Moderno (gestor APK)**:
  ```sh
  apk add ./luci-app-ark-router-2.2.0-r1.apk
  /etc/init.d/rpcd restart
  ```
- **OpenWrt Tradicional / Legado (gestor OPKG)**:
  ```sh
  opkg install ./luci-app-ark-router-2.2.0-r1.ipk
  /etc/init.d/rpcd restart
  ```

---

## 🔄 Actualización Directa desde el Panel

Una vez instalado, puede verificar nuevas versiones en:
**ARK Router → Recursos → Actualización de ARK Router**.

El actualizador comprueba GitHub Releases, muestra las notas de la versión y, tras la confirmación del administrador, descarga e instala el paquete actualizado creando previamente una copia de seguridad en `/tmp`.

---

## 🗑️ Desinstalación Limpia

Para desinstalar ARK Router conservando los nombres de sus dispositivos y preferencias:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | sh
```

Para desinstalarlo por completo, eliminando también las preferencias guardadas:

```sh
wget -O- https://raw.githubusercontent.com/Despensativo/ark-router/main/scripts/uninstall.sh | PURGE=1 sh
```

---

## 📄 Licencia

Este proyecto está publicado bajo la licencia de código abierto **MIT License**. Consulte el archivo [`LICENSE`](LICENSE) para más detalles.
