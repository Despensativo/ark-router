# ARK Router — Mapa Determinístico de Código e Execução (`CODE_MAP.md`)

> **Guia Rápido para IAs e Desenvolvedores (Anti-Amnésia & Token-Efficient)**:
> - **NUNCA** leia arquivos grandes (`common.sh`, `render.js`, `system.js`, `wifi.js`, `doctor.sh`) inteiros.
> - Use as tabelas abaixo para localizar o **arquivo e intervalo exato de linhas (`StartLine`–`EndLine`)** antes de chamar `view_file`.
> - Este documento é gerado deterministicamente por `python3 scripts/generate_code_map.py`.

---

## 1. Arquitetura de Execução, Fast-Path e Locks (`/usr/sbin/equipe-dashboard-control`)

| Camada | Mecanismo | Arquivos / Caches | Comportamento Exato |
| :--- | :--- | :--- | :--- |
| **0. Coalescência Hotplug** | Non-blocking Early Exit | `ark-doctor.lockdir/pid`, `ark_mutation.lock/pid` | Chamadas `ark-doctor --auto` encerram sem espera no topo de `equipe-dashboard-control` se já houver auditoria ou mutação viva (`kill -0`), evitando fila serial de hotplugs. |
| **1. Fast-Path (Sem Source)** | Resposta direta em RAM | `ark-fp-cache` (120s), `ark-stations-cache` (10s), `ark-perf-cache` (30s), `ark-hw-cache` (30s), `ark-mwan-cache` (3s), `ark-doctor-last.json` | Responde `device-fingerprints`, `device-stations`, `wifi-stations`, `system-perf-status`, `system-hardware-info`, `mwan-status-fast` e `doctor-status` **antes** de carregar `common.sh` (~10.000 linhas poupadas). |
| **2. Lock Global de Mutação** | `ark_acquire_mutation_lock` | `/tmp/ark_mutation.lock` (`pid`, `ts`, `cmd`) | Adquirido apenas quando `ark_is_readonly_action` retorna `1`. Leituras (`*-status`, `*-info`, etc.) e LEDs (`update-wan-led`, `update-led-alert`) passam livres sem bloqueio. |
| **3. Job Serializado** | `ark_serialized_job` | `root/usr/lib/ark/serialized-job.sh` | Garante execução única por recurso com reagendamento `.pending` automático se novo evento chegar durante a execução (código `75` para contendores). |

---

## 2. Matriz Ponta-a-Ponta: Frontend (`src/modules/*.js`) $\rightarrow$ RPC $\rightarrow$ Backend (`modules/*.sh`)

| Comando RPC (`equipe-dashboard-control`) | Tipo / Lock | Handler Backend (`arquivo:linha`) | Chamadores Frontend (`arquivo:linha [método]`) |
| :--- | :--- | :--- | :--- |
| `adblock-blacklist-sync` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1542` (`handle_adblock`) | `src/modules/adblock.js:623` (`openAdblockSetupModal`) |
| `adblock-sso-login` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1522` (`handle_adblock`) | `src/modules/adblock.js:184` (`openAdguardWithSSO`)<br>`src/modules/adblock.js:217` (`openAdguardSSOModal`) |
| `adblock-uninstall` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1559` (`handle_adblock`) | `src/modules/adblock.js:289` (`openAdguardUninstallModal`) |
| `adblock-whitelist-sync` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1545` (`handle_adblock`) | `src/modules/adblock.js:680` (`openAdblockSetupModal`) |
| `appearance` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2191` (`handle_ezsetup`) | `src/modules/system.js:72` (`setAppearance`) |
| `asu-check-toggle` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1518` (`handle_system`) | `src/modules/system.js:652` (`selfUpdatePanel`) |
| `autowan-can-convert-wan` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1149` (`handle_network`) | `src/modules/render.js:613` (`render`) |
| `autowan-policy-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1110` (`handle_network`) | `src/modules/network.js:234` (`setMwanMode`)<br>`src/modules/network.js:236` (`setMwanMode`)<br>`src/modules/render.js:765` (`render`) |
| `autowan-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:996` (`handle_network`) | `src/modules/render.js:679` (`render`)<br>`src/modules/render.js:727` (`render`) |
| `autowan-wan-to-lan` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1152` (`handle_network`) | `src/modules/render.js:351` (`render`)<br>`src/modules/render.js:596` (`render`)<br>`src/modules/render.js:648` (`render`) |
| `cleanup-apply` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2534` (`handle_ezsetup`) | `src/modules/ezsetup.js:845` (`showArkCleanup`) |
| `cleanup-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2531` (`handle_ezsetup`) | `src/modules/ezsetup.js:822` (`showArkCleanup`) |
| `country` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1327` (`handle_ezsetup`) | `src/modules/wifi.js:1822` (`changeCountry`) |
| `device-fingerprints` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1215` (`handle_devices`) | `src/modules/lifecycle.js:243` (`fetchData`) |
| `device-reserve-quick` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1389` (`handle_devices`) | `src/modules/devices.js:930` (`quickReserveIot`) |
| `device-reserve-secondary` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1352` (`handle_devices`) | `src/modules/devices.js:907` (`quickReserveSecondary`) |
| `device-stations` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1712` (`handle_devices`) | `src/modules/lifecycle.js:244` (`fetchData`) |
| `device-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1421` (`handle_devices`) | `src/modules/devices.js:1050` (`configureDevice`) |
| `dmz-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1385` (`handle_system`) | `src/modules/system.js:1663` (`dmzCard`)<br>`src/modules/system.js:1787` (`updateDmzStatus`)<br>`src/modules/system.js:2029` (`showDmzModal`)<br>`src/modules/system.js:2059` (`showDmzModal`) |
| `dmz-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1382` (`handle_system`) | `src/modules/system.js:1732` (`updateDmzStatus`)<br>`src/modules/system.js:1822` (`showDmzModal`) |
| `dns-turbo-doh` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1446` (`handle_system`) | `src/modules/doctor_perf.js:344` (`openDnsTurboModal`) |
| `dns-turbo-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1438` (`handle_system`) | `src/modules/doctor_perf.js:93` (`openDnsTurboModal`) |
| `doctor-fix` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/doctor.sh:2546` (`handle_doctor`) | `src/modules/doctor_perf.js:1648` (`runDoctorFix`) |
| `doctor-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/doctor.sh:2538` (`handle_doctor`) | `src/modules/doctor_perf.js:1553` (`showDoctorModal`) |
| `doctor-run` | 🟢 Read-Only | `root/usr/lib/ark/modules/doctor.sh:2542` (`handle_doctor`) | `src/modules/doctor_perf.js:1621` (`runDoctorAudit`) |
| `doctor-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/doctor.sh:2534` (`handle_doctor`) | `src/modules/lifecycle.js:339` (`fetchData`) |
| `ez-setup-apply` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1405` (`handle_ezsetup`) | `src/modules/ezsetup.js:645` (`showEzSetup`) |
| `ez-setup-install-modules` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1629` (`handle_ezsetup`) | `src/modules/ezsetup.js:687` (`showEzSetup`) |
| `ez-setup-reset` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1305` (`handle_ezsetup`) | `src/modules/ezsetup.js:713` (`showEzSetup`) |
| `ez-setup-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1302` (`handle_ezsetup`) | `src/modules/ezsetup.js:4` (`loadEzSetup`) |
| `fast-targets` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1474` (`handle_system`) | `src/modules/speedtest.js:161` (`showEmbedSpeedtest`) |
| `feature-dev-mode` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2219` (`handle_ezsetup`) | `src/modules/system.js:3110` (`toggleDevMode`) |
| `feature-install` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2252` (`handle_ezsetup`) | `src/modules/network.js:301` (`toggleMwan3`)<br>`src/modules/system.js:971` (`installFeature`) |
| `feature-install-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2424` (`handle_ezsetup`) | `src/modules/system.js:86` (`loadFeatureInstallLog`) |
| `feature-install-missing` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2428` (`handle_ezsetup`) | `src/modules/system.js:929` (`installMissingFeatures`) |
| `feature-install-missing-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2525` (`handle_ezsetup`) | `src/modules/system.js:907` (`loadMissingInstallLog`) |
| `feature-install-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2407` (`handle_ezsetup`) | `src/modules/system.js:741` (`pollFeatureInstall`) |
| `feature-menu-policy` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2234` (`handle_ezsetup`) | `src/modules/system.js:3146` (`toggleShowUninstalledMenus`) |
| `features` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1688` (`handle_ezsetup`) | `src/modules/lifecycle.js:34` (`fetchCapabilities`)<br>`src/modules/lifecycle.js:57` (`fetchCapabilities`) |
| `flush-stale-leases` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1709` (`handle_devices`) | `src/modules/devices.js:1022` (`flushStaleLeases`) |
| `https-redirect` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1501` (`handle_system`) | `src/modules/system.js:76` (`changeHttpsRedirect`) |
| `ipv6-disable-full` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1945` (`handle_network`) | `src/modules/network_modals.js:704` (`disableIpv6Full`) |
| `ipv6-mode-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1936` (`handle_network`) | `src/modules/network_modals.js:798` (`showIpv6Modal`) |
| `ipv6-relay-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1939` (`handle_network`) | `src/modules/network_modals.js:922` (`showIpv6Modal`) |
| `ipv6-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1933` (`handle_network`) | `src/modules/network_modals.js:724` (`showIpv6Modal`) |
| `irqbalance-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1300` (`handle_sqm`) | `src/modules/doctor_perf.js:964` (`systemPerfCard`)<br>`src/modules/doctor_perf.js:991` (`systemPerfCard`) |
| `ksmbd-control` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:415` (`handle_storage_wol`) | `src/modules/storage_wol.js:72` (`ksmbdCard`)<br>`src/modules/storage_wol.js:339` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:348` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:357` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:367` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:390` (`openKsmbdModal`) |
| `ksmbd-disk-action` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:562` (`handle_storage_wol`) | `src/modules/storage_wol.js:204` (`openKsmbdFormatConfirmModal`)<br>`src/modules/storage_wol.js:429` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:444` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:460` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:481` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:514` (`openKsmbdModal`) |
| `ksmbd-interface-access` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:487` (`handle_storage_wol`) | `src/modules/storage_wol.js:552` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:562` (`openKsmbdModal`) |
| `ksmbd-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/storage_wol.sh:412` (`handle_storage_wol`) | `src/modules/storage_wol.js:115` (`refreshKsmbdCardSummary`)<br>`src/modules/storage_wol.js:283` (`openKsmbdModal`) |
| `ksmbd-user-action` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:513` (`handle_storage_wol`) | `src/modules/storage_wol.js:622` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:632` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:687` (`openKsmbdModal`) |
| `lan-igmp-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:599` (`handle_network`) | `src/modules/network.js:325` (`toggleIgmp`) |
| `lan-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:549` (`handle_network`) | `src/modules/lifecycle.js:230` (`fetchData`) |
| `language` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1320` (`handle_ezsetup`) | `src/modules/system.js:13` (`setDashboardLanguage`) |
| `manual-update-start` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2096` (`handle_ezsetup`) | `src/modules/system.js:614` (`startManualPackageUpload`) |
| `mwan` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:726` (`handle_network`) | `src/modules/network.js:231` (`setMwanMode`) |
| `mwan-rule-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:869` (`handle_network`) | `src/modules/network_modals.js:1194` (`deleteMwanRule`) |
| `mwan-rule-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:882` (`handle_network`) | `src/modules/network_modals.js:1212` (`toggleMwanRule`) |
| `mwan-status-fast` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:280` (`handle_network`) | `src/modules/lifecycle.js:209` (`fetchData`) |
| `mwan-torrent-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:895` (`handle_network`) | `src/modules/network_modals.js:1235` (`toggleMwanTorrentPreset`)<br>`src/modules/network_modals.js:1422` (`showMwanTorrentModal`) |
| `mwan3-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:989` (`handle_network`) | `src/modules/network.js:276` (`toggleMwan3`) |
| `network-capacity-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1451` (`handle_system`) | `src/modules/doctor_perf.js:515` (`openNetworkCapacityModal`) |
| `ntp-configure-smart` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1596` (`handle_system`) | `src/modules/system.js:3422` (`showNtpModal`) |
| `ntp-intercept-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1599` (`handle_system`) | `src/modules/system.js:3349` (`showNtpModal`) |
| `ntp-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1590` (`handle_system`) | `src/modules/system.js:3298` (`showNtpModal`) |
| `ntp-sync-browser` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1593` (`handle_system`) | `src/modules/system.js:3403` (`showNtpModal`) |
| `ping-target-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1896` (`handle_network`) | `src/modules/network.js:2270` (`showLatencyTargetModal`) |
| `pppoe-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1847` (`handle_network`) | `src/modules/network.js:1863` (`showPppoeLogsModal`) |
| `pppoe-profile-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1827` (`handle_network`) | `src/modules/network.js:1466` (`editWan`) |
| `pppoe-profiles-list` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1766` (`handle_network`) | `src/modules/network.js:1329` (`editWan`) |
| `profile` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1318` (`handle_ezsetup`) | `src/modules/lifecycle.js:165` (`switchProfile`) |
| `reboot-confirm` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1696` (`handle_devices`) | `src/modules/system.js:1026` (`showRebootConfirmation`) |
| `reboot-prepare` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1688` (`handle_devices`) | `src/modules/system.js:1020` (`requestReboot`) |
| `self-update-check` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1973` (`handle_ezsetup`) | `src/modules/system.js:487` (`checkBackgroundUpdate`) |
| `self-update-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2001` (`handle_ezsetup`) | `src/modules/system.js:224` (`pollSelfUpdate`) |
| `self-update-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1998` (`handle_ezsetup`) | `src/modules/system.js:182` (`pollSelfUpdate`) |
| `speedify` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1095` (`handle_speedify`) | `src/modules/speedify.js:145` (`speedifyCommand`) |
| `speedify-adapter-priority` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1026` (`handle_speedify`) | `src/modules/speedify.js:183` (`saveSpeedifyAdapterPriority`) |
| `speedify-adapter-rate` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1032` (`handle_speedify`) | `src/modules/speedify.js:186` (`saveSpeedifyAdapterRate`) |
| `speedify-autostart` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1077` (`handle_speedify`) | `src/modules/speedify.js:67` (`toggleSpeedifyAutostart`) |
| `speedify-bypass-master` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1018` (`handle_speedify`) | `src/modules/speedify.js:170` (`toggleSpeedifyBypassMaster`) |
| `speedify-bypass-service` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1009` (`handle_speedify`) | `src/modules/speedify.js:152` (`toggleSpeedifyBypass`) |
| `speedify-install-mode` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1055` (`handle_speedify`) | `src/modules/speedify.js:24` (`installSpeedifyMode`)<br>`src/modules/speedify.js:111` (`toggleSpeedifyPower`) |
| `speedify-pairing` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1089` (`handle_speedify`) | `src/modules/speedify.js:35` (`pairSpeedify`) |
| `speedify-power` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1080` (`handle_speedify`) | `src/modules/speedify.js:127` (`toggleSpeedifyPower`)<br>`src/modules/speedify.js:507` (`speedifyCard`) |
| `speedify-prepare` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1074` (`handle_speedify`) | `src/modules/speedify.js:9` (`prepareSpeedifyWans`)<br>`src/modules/speedify.js:109` (`toggleSpeedifyPower`) |
| `speedify-save-config` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1071` (`handle_speedify`) | `src/modules/speedify.js:29` (`saveSpeedifyConfig`) |
| `speedify-uninstall` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1083` (`handle_speedify`) | `src/modules/speedify.js:200` (`uninstallSpeedify`) |
| `speedify-user` | 🟢 Read-Only | `root/usr/lib/ark/modules/speedify.sh:1092` (`handle_speedify`) | `src/modules/speedify.js:49` (`checkSpeedifyUser`) |
| `speedtest-apply` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1325` (`handle_devices`) | `src/modules/speedtest.js:417` (`applySpeedtestSuggestion`) |
| `speedtest-result` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1317` (`handle_devices`) | `src/modules/speedtest.js:406` (`loadSpeedtestResult`) |
| `speedtest-start` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1225` (`handle_devices`) | `src/modules/speedtest.js:363` (`runSpeedtest`) |
| `speedtest-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1313` (`handle_devices`) | `src/modules/speedtest.js:397` (`pollSpeedtest`) |
| `sqm-engine-select` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1295` (`handle_sqm`) | `src/modules/network.js:500` (`selectSqmEngine`) |
| `sqm-gaming-ports` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1387` (`handle_sqm`) | `src/modules/network.js:601` (`toggleGamingPorts`) |
| `sqm-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1270` (`handle_sqm`) | `src/modules/lifecycle.js:169` (`switchProfile`)<br>`src/modules/network.js:467` (`toggleSqm`) |
| `sqm-waveform-aplus` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1314` (`handle_sqm`) | `src/modules/network.js:565` (`toggleWaveformAplus`) |
| `starlink-active-wan-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:203` (`handle_starlink`) | `src/modules/speedify.js:378` (`speedifyCard`) |
| `starlink-always-show-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:241` (`handle_starlink`) | `src/modules/starlink.js:21` (`toggleStarlinkAlwaysShow`) |
| `starlink-public-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:206` (`handle_starlink`) | `src/modules/starlink.js:8` (`toggleStarlinkPublic`) |
| `starlink-telemetry` | 🟢 Read-Only | `root/usr/lib/ark/modules/starlink.sh:189` (`handle_starlink`) | `src/modules/starlink.js:653` (`readStarlinkTelemetry`) |
| `starlink-telemetry-flush` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:363` (`handle_starlink`) | `src/modules/starlink.js:148` (`flushStarlinkTelemetryRam`) |
| `starlink-telemetry-send-test` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:328` (`handle_starlink`) | `src/modules/starlink.js:97` (`triggerStarlinkTestEmail`) |
| `starlink-telemetry-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/starlink.sh:213` (`handle_starlink`) | `src/modules/starlink.js:158` (`updateStarlinkTelemetryStatusBadge`) |
| `starlink-telemetry-test-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/starlink.sh:356` (`handle_starlink`) | `src/modules/starlink.js:128` (`pollStarlinkTestEmail`) |
| `system-hardware-auto-tune` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1559` (`handle_system`) | `src/modules/doctor_perf.js:832` (`systemPerfCard`)<br>`src/modules/system.js:2610` (`showHardwareModal`) |
| `system-hardware-info` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1556` (`handle_system`) | `src/modules/lifecycle.js:241` (`fetchData`) |
| `system-hardware-sqm-audit` | 🟢 Read-Only | `root/usr/lib/ark/modules/sqm.sh:1729` (`handle_sqm`) | `src/modules/network.js:647` (`editSqmLimits`) |
| `system-memory-purge` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1461` (`handle_system`) | `src/modules/doctor_perf.js:789` (`systemPerfCard`) |
| `system-network-mode-get` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1320` (`handle_network`) | `src/modules/system.js:2135` (`showNetworkModeModal`) |
| `system-perf-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1366` (`handle_system`) | `src/modules/lifecycle.js:232` (`fetchData`) |
| `system-processes-telemetry` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1458` (`handle_system`) | `src/modules/system.js:2644` (`showHardwareModal`) |
| `system-storage-purge` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1465` (`handle_system`) | `src/modules/doctor_perf.js:809` (`systemPerfCard`)<br>`src/modules/system.js:353` (`showUpdateConfirmModal`) |
| `theme` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2538` (`handle_ezsetup`) | `src/modules/system.js:1005` (`useTheme`) |
| `title` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2156` (`handle_ezsetup`) | `src/modules/system.js:69` (`setDashboardTitle`) |
| `upnp-clear-leases` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1424` (`handle_system`) | `src/modules/system.js:1610` (`clearUpnpLeases`) |
| `upnp-delete-lease` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1420` (`handle_system`) | `src/modules/system.js:1598` (`deleteUpnpLease`) |
| `upnp-restart` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1427` (`handle_system`) | `src/modules/system.js:1627` (`restartUpnpDaemon`) |
| `upnp-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1389` (`handle_system`) | `src/modules/system.js:1380` (`updateUpnpStatus`) |
| `upnp-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1392` (`handle_system`) | `src/modules/doctor_perf.js:1179` (`systemPerfCard`) |
| `wan-optimize-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1327` (`handle_network`) | `src/modules/network_modals.js:5` (`showWanOptimizationsModal`) |
| `wifi` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:534` (`handle_wifi`) | `src/modules/wifi.js:164` (`changeWifiPassword`) |
| `wifi-add` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:845` (`handle_wifi`) | `src/modules/wifi.js:275` (`showAddWifiModal`) |
| `wifi-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:933` (`handle_wifi`) | `src/modules/wifi.js:948` (`editWifiNetwork`) |
| `wifi-dfs-optimize` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1363` (`handle_wifi`) | `src/modules/render.js:1621` (`render`)<br>`src/modules/wifi.js:1387` (`optimizeDfs`) |
| `wifi-enhancer-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/wifi.sh:2463` (`handle_wifi`) | `src/modules/wifi.js:2200` (`updateWifiEnhancerUI`)<br>`src/modules/wifi.js:2251` (`showWifiEnhancerModal`)<br>`src/modules/wifi.js:2349` (`showWifiEnhancerModal`) |
| `wifi-enhancer-upgrade` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2466` (`handle_wifi`) | `src/modules/wifi.js:2347` (`showWifiEnhancerModal`) |
| `wifi-iot-optimize` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1299` (`handle_wifi`) | `src/modules/render.js:1571` (`render`)<br>`src/modules/wifi.js:1357` (`optimizeIot`) |
| `wifi-mesh-satellite-discover` | 🟢 Read-Only | `root/usr/lib/ark/modules/wifi.sh:1855` (`handle_wifi`) | `src/modules/wifi.js:2422` (`showSatelliteWizardModal`) |
| `wifi-mesh-satellite-pull-master` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1942` (`handle_wifi`) | `src/modules/wifi.js:2575` (`showSatelliteWizardModal`) |
| `wifi-mesh-satellite-revert` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2197` (`handle_wifi`) | `src/modules/wifi.js:3169` (`showSatelliteWizardModal`) |
| `wifi-mesh-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1828` (`handle_wifi`) | `src/modules/wifi.js:2152` (`showMeshModal`)<br>`src/modules/wifi.js:2177` (`showMeshModal`) |
| `wifi-mlo-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2473` (`handle_wifi`) | `src/modules/wifi.js:1988` (`toggleWifiMlo`) |
| `wifi-roaming-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1524` (`handle_wifi`) | `src/modules/wifi.js:1897` (`toggleRoaming`) |
| `wifi-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:550` (`handle_wifi`) | `src/modules/wifi.js:334` (`_executeWifiToggle`) |
| `wifi-txbalance-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1768` (`handle_wifi`) | `src/modules/wifi.js:2090` (`_applyTxBalance`) |
| `wifi-usteer-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1610` (`handle_wifi`) | `src/modules/wifi.js:1922` (`toggleUsteer`) |
| `wifi-wed-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1401` (`handle_wifi`) | `src/modules/render.js:1476` (`render`) |
| `wifi-wifi6-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2346` (`handle_wifi`) | `src/modules/wifi.js:1964` (`toggleWifi6Accel`) |
| `wifi-wps-pbc` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1480` (`handle_wifi`) | `src/modules/wifi.js:1865` (`triggerWpsPbc`) |
| `wifi-wps-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1448` (`handle_wifi`) | `src/modules/wifi.js:1841` (`toggleWps`) |
| `wireguard-autostart-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1314` (`handle_vpn`) | `src/modules/vpn.js:963` (`wireguardCard`) |
| `wireguard-client-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1335` (`handle_vpn`) | `src/modules/vpn.js:619` (`showWireGuardClientModal`) |
| `wireguard-client-import` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1326` (`handle_vpn`) | `src/modules/vpn.js:815` (`showWireGuardClientModal`) |
| `wireguard-client-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1329` (`handle_vpn`) | `src/modules/vpn.js:453` (`showWireGuardClientModal`) |
| `wireguard-client-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1332` (`handle_vpn`) | `src/modules/vpn.js:583` (`showWireGuardClientModal`) |
| `wireguard-disable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1311` (`handle_vpn`) | `src/modules/vpn.js:180` (`disableWireguard`) |
| `wireguard-enable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1308` (`handle_vpn`) | `src/modules/vpn.js:161` (`enableWireguard`) |
| `wireguard-peer-add` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1317` (`handle_vpn`) | `src/modules/vpn.js:329` (`showWireGuardModal`) |
| `wireguard-peer-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1320` (`handle_vpn`) | `src/modules/vpn.js:401` (`showWireGuardModal`) |
| `wireguard-peer-qr` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1323` (`handle_vpn`) | `src/modules/vpn.js:381` (`showWireGuardModal`) |
| `wireguard-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1302` (`handle_vpn`) | `src/modules/vpn.js:253` (`showWireGuardModal`) |
| `wol-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/storage_wol.sh:687` (`handle_storage_wol`) | `src/modules/storage_wol.js:861` (`refreshWolCardSummary`)<br>`src/modules/storage_wol.js:947` (`openWolModal`) |
| `wol-target-save` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:719` (`handle_storage_wol`) | `src/modules/devices.js:1863` (`configureDevice`)<br>`src/modules/storage_wol.js:1029` (`openWolModal`) |
| `wol-wake` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:690` (`handle_storage_wol`) | `src/modules/storage_wol.js:924` (`triggerWolWake`) |
| `zerotier-autostart-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1299` (`handle_vpn`) | `src/modules/vpn.js:113` (`zerotierCard`) |
| `zerotier-disable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1282` (`handle_vpn`) | `src/modules/vpn.js:24` (`disableZerotier`) |
| `zerotier-enable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1279` (`handle_vpn`) | `src/modules/vpn.js:6` (`enableZerotier`) |
| `zerotier-join` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1293` (`handle_vpn`) | `src/modules/vpn.js:48` (`joinZerotier`) |
| `zerotier-leave` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1296` (`handle_vpn`) | `src/modules/vpn.js:64` (`leaveZerotier`) |
| `zram-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1434` (`handle_system`) | `src/modules/doctor_perf.js:22` (`showHighRamZramConfirmModal`)<br>`src/modules/doctor_perf.js:60` (`showLowEndMipsZramConfirmModal`)<br>`src/modules/doctor_perf.js:1116` (`systemPerfCard`) |

---

## 3. Índice Cirúrgico de Funções Backend (`root/usr/lib/ark/**/*.sh`)

### `root/usr/lib/ark/common.sh` (2514 linhas, 98 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `bool()` | `32–37` | 6L |
| `ez_bool()` | `39–44` | 6L |
| `json_escape()` | `51–60` | 10L |
| `json_bool_value()` | `62–64` | 3L |
| `ark_has_apk()` | `67–69` | 3L |
| `ark_has_opkg()` | `71–73` | 3L |
| `ark_has_qca_wifi()` | `76–80` | 5L |
| `ark_hostapd_has_wnm()` | `85–101` | 17L |
| `ark_has_qualcomm_son()` | `105–111` | 7L |
| `ark_ensure_working_distfeeds()` | `113–140` | 28L |
| `ark_has_fw4()` | `142–144` | 3L |
| `ark_has_nftables()` | `146–148` | 3L |
| `ark_firewall_engine()` | `150–156` | 7L |
| `is_fw4()` | `158–160` | 3L |
| `is_fw3()` | `162–164` | 3L |
| `is_swconfig()` | `166–168` | 3L |
| `ark_cpu_cores()` | `170–175` | 6L |
| `ark_has_native_hw_queues()` | `177–220` | 44L |
| `ark_is_satellite_or_ap()` | `222–238` | 17L |
| `ark_ap_uplink_dev()` | `240–266` | 27L |
| `ark_language()` | `268–288` | 21L |
| `installed()` | `291–348` | 58L |
| `hidden()` | `350–352` | 3L |
| `running()` | `354–373` | 20L |
| `ark_current_version()` | `376–384` | 9L |
| `ark_update_repo()` | `386–388` | 3L |
| `normalize_version()` | `390–392` | 3L |
| `ark_acquire_lock()` | `398–420` | 23L |
| `ark_release_lock()` | `422–427` | 6L |
| `ez_backup()` | `429–456` | 28L |
| `detect_dns_blocker()` | `458–495` | 38L |
| `ark_calculate_rps_mask()` | `497–513` | 17L |
| `ark_sqm_owns_device()` | `515–527` | 13L |
| `ark_cake_memlimit()` | `529–532` | 4L |
| `ark_upnp_is_legacy_iptables()` | `536–563` | 28L |
| `ark_upnp_is_legacy_nftables_on_fw3()` | `565–586` | 22L |
| `ark_migrate_upnp_variant()` | `588–670` | 83L |
| `ark_sanitize_upnp_config()` | `672–716` | 45L |
| `ark_optimize_nat_endpoint_independent()` | `721–742` | 22L |
| `ark_sync_clat_p2p_routes()` | `747–792` | 46L |
| `ark_safe_storage_reboot()` | `799–878` | 80L |
| `ark_harden_transmission_config()` | `881–936` | 56L |
| `ark_cleanup_dhcpv6_orphans()` | `939–957` | 19L |
| `ark_sanitize_wan6_config()` | `960–1050` | 91L |
| `ark_sanitize_lan_ipv6()` | `1053–1124` | 72L |
| `ark_ipv6_prefix_hygiene()` | `1127–1258` | 132L |
| `ark_auto_enable_factory_wifi()` | `1262–1296` | 35L |
| `ark_dev_supports_mtu()` | `1299–1326` | 28L |
| `_ark_set_single_device_mtu()` | `1330–1408` | 79L |
| `ark_ensure_phys_device_mtu()` | `1410–1443` | 34L |
| `ark_ensure_wan_mtu_fix()` | `1446–1465` | 20L |
| `ark_get_min_wan_mtu()` | `1468–1525` | 58L |
| `ark_optimal_wg_mtu()` | `1531–1555` | 25L |
| `ark_sync_lan_ipv6_ra_mtu()` | `1559–1592` | 34L |
| `ark_ensure_phys_device_mac()` | `1597–1685` | 89L |
| `ez_get()` | `1693–1693` | 1L |
| `ez_set()` | `1695–1695` | 1L |
| `cleanup_backup()` | `1697–1708` | 12L |
| `ark_kill_package_fetchers()` | `1710–1715` | 6L |
| `ark_run_limited()` | `1717–1736` | 20L |
| `guest_l3_device()` | `1738–1743` | 6L |
| `active_wan_networks()` | `1745–1751` | 7L |
| `sqm_device_for_network()` | `1753–1767` | 15L |
| `find_dhcp_host()` | `1769–1778` | 10L |
| `sanitize_dhcp_hostnames()` | `1780–1793` | 14L |
| `apply_lan_dhcp_dns()` | `1795–1807` | 13L |
| `same_managed_subnet()` | `1809–1837` | 29L |
| `sync_adguard_ipv6()` | `1839–1871` | 33L |
| `firewall_wan_zone_section()` | `1873–1877` | 5L |
| `firewall_zone_has_network()` | `1879–1882` | 4L |
| `lan_bridge_section()` | `1884–1886` | 3L |
| `lan_bridge_port_count()` | `1888–1892` | 5L |
| `find_switch_vlan()` | `1894–1906` | 13L |
| `swconfig_remove_port_from_vlan()` | `1908–1921` | 14L |
| `swconfig_add_port_to_vlan()` | `1923–1944` | 22L |
| `ark_board_switch_role_ports()` | `1947–1963` | 17L |
| `ark_board_switch_wan_port()` | `1965–1982` | 18L |
| `ark_board_switch_cpu_tag()` | `1984–1992` | 9L |
| `ark_board_uses_legacy_ifname()` | `1994–2004` | 11L |
| `swconfig_port_num()` | `2006–2021` | 16L |
| `bridge_has_port()` | `2023–2026` | 4L |
| `add_lan_port()` | `2028–2040` | 13L |
| `remove_lan_port()` | `2042–2052` | 11L |
| `configure_uhttpd_listeners()` | `2054–2063` | 10L |
| `zerotier_ram_compress()` | `2065–2095` | 31L |
| `get_primary_wan_dev()` | `2097–2123` | 27L |
| `get_active_online_wan_dev()` | `2125–2162` | 38L |
| `get_internet_led_sysfs()` | `2164–2195` | 32L |
| `get_internet_alert_led_sysfs()` | `2197–2209` | 13L |
| `ark_has_qsdk_ecm()` | `2214–2222` | 9L |
| `ark_has_doh_proxy()` | `2225–2232` | 8L |
| `ark_sync_doh_proxy()` | `2238–2389` | 152L |
| `ark_is_readonly_action()` | `2395–2428` | 34L |
| `ark_try_lock_dir()` | `2431–2454` | 24L |
| `ark_acquire_mutation_lock()` | `2456–2477` | 22L |
| `ark_release_mutation_lock()` | `2479–2491` | 13L |
| `ark_invalidate_caches()` | `2493–2503` | 11L |
| `ark_restore_mutation_trap()` | `2505–2512` | 8L |

### `root/usr/lib/ark/dhcp_fingerprint.sh` (48 linhas, 0 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |

### `root/usr/lib/ark/led.sh` (722 linhas, 11 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `_get_led_sys()` | `25–31` | 7L |
| `_get_net_sys()` | `33–39` | 7L |
| `ark_led_normalize_hex()` | `42–89` | 48L |
| `ark_led_detect_topology()` | `92–142` | 51L |
| `ark_led_calibrate_curves()` | `145–183` | 39L |
| `ark_led_set_speed()` | `186–207` | 22L |
| `ark_led_start_rainbow()` | `210–228` | 19L |
| `ark_led_stop_rainbow()` | `230–236` | 7L |
| `ark_led_set_effect()` | `239–431` | 193L |
| `ark_led_apply_preset()` | `434–577` | 144L |
| `ark_led_update_wan_status()` | `580–722` | 143L |

### `root/usr/lib/ark/logging.sh` (41 linhas, 5 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_mask_sensitive()` | `8–13` | 6L |
| `ark_log()` | `15–19` | 5L |
| `ark_warn()` | `21–26` | 6L |
| `ark_err()` | `28–33` | 6L |
| `ark_audit()` | `35–41` | 7L |

### `root/usr/lib/ark/modules/adblock.sh` (1575 linhas, 15 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `adblock_status_json()` | `13–218` | 206L |
| `adblock_apply_rules()` | `220–377` | 158L |
| `adblock_apply_blacklist()` | `379–381` | 3L |
| `adblock_sync_blacklist()` | `383–549` | 167L |
| `adblock_sync_whitelist()` | `551–741` | 191L |
| `sync_dns_intercept()` | `743–789` | 47L |
| `adblock_configure()` | `791–979` | 189L |
| `adblock_mark_enabled()` | `981–987` | 7L |
| `adblock_enable()` | `989–1216` | 228L |
| `adblock_restore_dns()` | `1218–1309` | 92L |
| `adblock_disable()` | `1311–1376` | 66L |
| `adblock_uninstall()` | `1378–1432` | 55L |
| `adblock_toggle()` | `1434–1445` | 12L |
| `adblock_sso_login()` | `1447–1516` | 70L |
| `handle_adblock()` | `1518–1571` | 54L |

### `root/usr/lib/ark/modules/devices.sh` (1716 linhas, 20 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `flush_stale_leases()` | `18–91` | 74L |
| `device_get_stations()` | `93–123` | 31L |
| `device_get_stations_raw()` | `125–499` | 375L |
| `speedtest_history_file()` | `501–505` | 5L |
| `speedtest_history_append()` | `507–521` | 15L |
| `speedtest_history_json()` | `523–554` | 32L |
| `speedtest_schedule_weak_cleanup()` | `556–569` | 14L |
| `speedtest_download_fallback_mbps()` | `571–622` | 52L |
| `speedtest_upload_fallback_mbps()` | `624–656` | 33L |
| `device_limits_json()` | `658–678` | 21L |
| `apply_device_bandwidth_limits()` | `680–817` | 138L |
| `device_apply_parental()` | `819–998` | 180L |
| `can_install_speedtest_flash()` | `1000–1015` | 16L |
| `speedtest_storage_json()` | `1017–1032` | 16L |
| `prepare_speedtest()` | `1034–1085` | 52L |
| `satellite_sync_master_leases_if_needed()` | `1087–1125` | 39L |
| `get_device_fingerprints_raw()` | `1127–1168` | 42L |
| `get_device_fingerprints()` | `1170–1193` | 24L |
| `setup_dhcp_fingerprint_hook()` | `1195–1211` | 17L |
| `handle_devices()` | `1213–1716` | 504L |

### `root/usr/lib/ark/modules/doctor.sh` (2629 linhas, 5 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_doctor_audit()` | `23–2497` | 2475L |
| `doctor_get_status()` | `2499–2508` | 10L |
| `doctor_get_log()` | `2510–2519` | 10L |
| `doctor_release_lock()` | `2521–2526` | 6L |
| `handle_doctor()` | `2528–2624` | 97L |

### `root/usr/lib/ark/modules/ezsetup.sh` (2666 linhas, 43 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `feature_package()` | `24–49` | 26L |
| `bulk_feature_keys()` | `51–53` | 3L |
| `feature_missing_installable()` | `55–80` | 26L |
| `cleanup_packages()` | `82–98` | 17L |
| `cleanup_label()` | `100–110` | 11L |
| `cleanup_desc()` | `112–122` | 11L |
| `cleanup_recommended()` | `124–126` | 3L |
| `cleanup_removable()` | `128–138` | 11L |
| `cleanup_installed_count()` | `140–150` | 11L |
| `cleanup_status_json()` | `152–171` | 20L |
| `cleanup_speedify_residue()` | `173–190` | 18L |
| `cleanup_apply_keys()` | `192–216` | 25L |
| `feature_active()` | `218–255` | 38L |
| `ark_feature_toggle_internal()` | `257–422` | 166L |
| `ark_feature_remove_internal()` | `424–475` | 52L |
| `ark_enforce_saved_feature_policies()` | `477–484` | 8L |
| `version_gt()` | `486–496` | 11L |
| `ark_package_manager()` | `498–503` | 6L |
| `ark_cpu_arch()` | `505–509` | 5L |
| `ark_can_run_aarch64()` | `511–516` | 6L |
| `ark_mem_total_kb()` | `518–522` | 5L |
| `ark_overlay_avail_kb()` | `524–528` | 5L |
| `ark_tmp_avail_kb()` | `530–534` | 5L |
| `ark_best_profile()` | `536–548` | 13L |
| `ark_actual_profile()` | `550–556` | 7L |
| `ark_installed_profile()` | `558–566` | 9L |
| `ark_update_asset_name()` | `568–578` | 11L |
| `ark_remove_opposite_profile()` | `580–609` | 30L |
| `ark_install_package_file()` | `611–678` | 68L |
| `ark_http_get()` | `680–702` | 23L |
| `ark_http_download()` | `704–720` | 17L |
| `ark_latest_release()` | `722–738` | 17L |
| `ark_latest_changelog()` | `740–752` | 13L |
| `ark_update_json()` | `754–795` | 42L |
| `ark_operation_profile()` | `797–797` | 1L |
| `apply_operation_profile()` | `799–875` | 77L |
| `ez_progress()` | `877–877` | 1L |
| `ez_json()` | `879–976` | 98L |
| `ez_apply_wifi_iface()` | `978–988` | 11L |
| `ez_apply_guest_network()` | `990–1031` | 42L |
| `ez_apply_guest_limit()` | `1033–1048` | 16L |
| `feature_json()` | `1050–1298` | 249L |
| `handle_ezsetup()` | `1300–2666` | 1367L |

### `root/usr/lib/ark/modules/network.sh` (1951 linhas, 6 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `apply_wan_proto()` | `18–103` | 86L |
| `apply_wan_modem_access()` | `105–150` | 46L |
| `bind_uhttpd_to_lan_ip()` | `152–155` | 4L |
| `mwan3_toggle()` | `157–202` | 46L |
| `mwan_status_fast()` | `204–276` | 73L |
| `handle_network()` | `278–1951` | 1674L |

### `root/usr/lib/ark/modules/network_ipv6_mwan.sh` (1842 linhas, 26 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `autowan_can_convert()` | `15–49` | 35L |
| `get_physical_wan_dev()` | `51–86` | 36L |
| `autowan_can_convert_wan_json()` | `88–144` | 57L |
| `system_network_mode_get()` | `146–186` | 41L |
| `system_network_mode_set()` | `188–367` | 180L |
| `restore_ipv6_firewall_rules()` | `369–417` | 49L |
| `ark_ensure_ipv6_dhcpv6_client()` | `419–440` | 22L |
| `enable_ipv6_dual_stack()` | `442–536` | 95L |
| `clean_ipv6_selective_firewall()` | `538–565` | 28L |
| `sync_ipv6_selective_firewall()` | `567–634` | 68L |
| `ark_has_multi_wan()` | `739–753` | 15L |
| `sync_nptv6_firewall()` | `755–765` | 11L |
| `clean_nptv6_firewall()` | `767–773` | 7L |
| `save_pre_clat_state()` | `775–795` | 21L |
| `ark_register_cloudflare_warp_v6()` | `797–846` | 50L |
| `sync_ipv6_clat_tunnel()` | `848–976` | 129L |
| `clean_ipv6_clat_tunnel()` | `978–1054` | 77L |
| `set_ipv6_mode()` | `1056–1164` | 109L |
| `set_ipv6_relay()` | `1166–1206` | 41L |
| `toggle_ipv6_device()` | `1208–1224` | 17L |
| `get_ipv6_status()` | `1226–1285` | 60L |
| `disable_ipv6_full()` | `1289–1351` | 63L |
| `mwan3_reorder_rules()` | `1353–1399` | 47L |
| `get_configured_ping_track_ips()` | `1401–1439` | 39L |
| `ensure_mwan3_ark_config()` | `1441–1809` | 369L |
| `mwan3_sync_lifecycle()` | `1811–1841` | 31L |

### `root/usr/lib/ark/modules/speedify.sh` (1111 linhas, 54 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `speedify_detected_install_mode()` | `13–28` | 16L |
| `speedify_ipk_name()` | `30–46` | 17L |
| `speedify_extract_package()` | `48–65` | 18L |
| `install_speedify_official()` | `67–105` | 39L |
| `speedify_save_config()` | `107–121` | 15L |
| `speedify_loader_path()` | `123–140` | 18L |
| `speedify_library_path()` | `142–149` | 8L |
| `speedify_write_cli_wrapper()` | `151–163` | 13L |
| `speedify_package_url()` | `165–171` | 7L |
| `speedify_fetch_package()` | `173–189` | 17L |
| `speedify_ensure_tun()` | `191–209` | 19L |
| `speedify_tunnel_device()` | `211–215` | 5L |
| `speedify_firewall_zone_section()` | `217–221` | 5L |
| `speedify_firewall_forwarding_exists()` | `223–231` | 9L |
| `speedify_clean_zone_devices()` | `233–240` | 8L |
| `speedify_start_extracted()` | `242–280` | 39L |
| `speedify_install_external()` | `282–304` | 23L |
| `speedify_start_external_saved()` | `306–313` | 8L |
| `speedify_install_ram()` | `315–336` | 22L |
| `speedify_install_auto_safe()` | `338–359` | 22L |
| `speedify_clean_runtime_network()` | `361–389` | 29L |
| `speedify_prepare_runtime_network()` | `391–440` | 50L |
| `speedify_auto_prepare_wan2()` | `442–460` | 19L |
| `speedify_prepare_wans()` | `462–512` | 51L |
| `speedify_status_json()` | `514–548` | 35L |
| `speedify_cli_action()` | `550–563` | 14L |
| `speedify_wait_tunnel()` | `565–573` | 9L |
| `speedify_route_ok()` | `575–581` | 7L |
| `speedify_wait_route()` | `583–591` | 9L |
| `mwan3_service_running()` | `593–595` | 3L |
| `speedify_pause_mwan3()` | `597–606` | 10L |
| `speedify_restore_mwan3()` | `608–619` | 12L |
| `speedify_configure_downstream_subnets()` | `621–635` | 15L |
| `speedify_safe_connect()` | `637–659` | 23L |
| `speedify_watchdog()` | `661–678` | 18L |
| `speedify_safe_disconnect()` | `680–700` | 21L |
| `speedify_stop_runtime()` | `702–731` | 30L |
| `speedify_start_ui_helper()` | `733–737` | 5L |
| `speedify_adapter_valid()` | `739–739` | 1L |
| `speedify_mask_email()` | `741–752` | 12L |
| `speedify_pairing_json()` | `754–763` | 10L |
| `speedify_user_json()` | `765–778` | 14L |
| `speedify_autostart_set()` | `780–792` | 13L |
| `speedify_recover_runtime()` | `794–822` | 29L |
| `speedify_power_set()` | `824–866` | 43L |
| `speedify_autostart_run()` | `868–874` | 7L |
| `speedify_cli_path()` | `876–883` | 8L |
| `speedify_runtime_running()` | `885–885` | 1L |
| `speedify_supported()` | `887–898` | 12L |
| `speedify_external_target()` | `900–910` | 11L |
| `speedify_storage_json()` | `912–933` | 22L |
| `speedify_state_value()` | `935–943` | 9L |
| `speedify_uninstall()` | `945–1001` | 57L |
| `handle_speedify()` | `1005–1107` | 103L |

### `root/usr/lib/ark/modules/sqm.sh` (1751 linhas, 33 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_has_cake_mq()` | `14–23` | 10L |
| `ark_has_auto_dscp()` | `25–33` | 9L |
| `ark_has_ctinfo()` | `35–39` | 5L |
| `ark_has_l4s_dscp()` | `41–49` | 9L |
| `ark_apply_ingress_voice_tin_filters()` | `51–71` | 21L |
| `ark_sync_sqm_gaming_dns()` | `73–110` | 38L |
| `ark_promote_cake_mq()` | `112–212` | 101L |
| `ark_is_gaming_ports_enabled()` | `214–226` | 13L |
| `ark_sync_gaming_ports_and_bql()` | `228–337` | 110L |
| `ark_get_sqm_engine()` | `374–386` | 13L |
| `ark_apply_sqm_engine_to_section()` | `388–401` | 14L |
| `get_system_hardware_sqm_audit()` | `403–476` | 74L |
| `sqm_apply_upload_only()` | `478–509` | 32L |
| `ensure_qos_equipe()` | `511–521` | 11L |
| `ark_sqm_ack_filter_opt()` | `523–533` | 11L |
| `ark_sqm_ingress_rtt_opt()` | `535–554` | 20L |
| `ark_sqm_ingress_mode_opt()` | `556–575` | 20L |
| `ensure_sqm_section()` | `577–752` | 176L |
| `sqm_section_for_network()` | `754–756` | 3L |
| `apply_guest_tc_limit()` | `758–784` | 27L |
| `ark_sqm_save_offload_state()` | `786–824` | 39L |
| `sync_sqm_flow_offload()` | `826–896` | 71L |
| `ark_sync_lan_selective_offload()` | `898–914` | 17L |
| `ark_sqm_autorate_toggle()` | `916–934` | 19L |
| `ark_sqm_autorate_step()` | `936–1102` | 167L |
| `ark_sqm_autorate_status()` | `1104–1119` | 16L |
| `ark_sqm_verify_device()` | `1121–1144` | 24L |
| `ark_sqm_verify_queues()` | `1146–1170` | 25L |
| `ark_sqm_sync_memory_limits()` | `1172–1196` | 25L |
| `get_sqm_resource_plan()` | `1198–1210` | 13L |
| `ark_sqm_restart_checked()` | `1212–1217` | 6L |
| `ark_sqm_select_engine()` | `1219–1266` | 48L |
| `handle_sqm()` | `1268–1751` | 484L |

### `root/usr/lib/ark/modules/starlink.sh` (372 linhas, 8 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `starlink_cgnat_ipv4()` | `14–16` | 3L |
| `starlink_active_wan_get()` | `18–35` | 18L |
| `starlink_active_wan_set()` | `37–60` | 24L |
| `starlink_wan_port()` | `62–75` | 14L |
| `starlink_wan_table()` | `77–90` | 14L |
| `starlink_setup_policy_routing()` | `92–150` | 59L |
| `starlink_public_list_json()` | `152–185` | 34L |
| `handle_starlink()` | `187–372` | 186L |

### `root/usr/lib/ark/modules/storage_wol.sh` (766 linhas, 9 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `is_safe_usb_partition()` | `12–52` | 41L |
| `ksmbd_ensure_config()` | `54–77` | 24L |
| `ksmbd_get_user_perm()` | `79–90` | 12L |
| `ksmbd_set_user_perm()` | `92–105` | 14L |
| `ksmbd_sync_shares()` | `107–160` | 54L |
| `ksmbd_sync_firewall()` | `162–186` | 25L |
| `ksmbd_status_json()` | `188–300` | 113L |
| `wol_status_json()` | `305–403` | 99L |
| `handle_storage_wol()` | `408–766` | 359L |

### `root/usr/lib/ark/modules/system.sh` (1615 linhas, 25 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `system_perf_status_json()` | `16–38` | 23L |
| `system_perf_status_raw()` | `40–134` | 95L |
| `dmz_status_json()` | `136–185` | 50L |
| `dmz_set()` | `187–253` | 67L |
| `upnp_status_json()` | `255–397` | 143L |
| `upnp_save()` | `399–476` | 78L |
| `upnp_delete_lease()` | `478–497` | 20L |
| `upnp_clear_leases()` | `499–517` | 19L |
| `dns_turbo_status_json()` | `519–587` | 69L |
| `dns_turbo_save()` | `589–695` | 107L |
| `dns_turbo_doh_toggle()` | `697–742` | 46L |
| `network_capacity_status_json()` | `744–761` | 18L |
| `network_capacity_save()` | `763–816` | 54L |
| `system_perf_save()` | `818–994` | 177L |
| `system_processes_telemetry()` | `998–1062` | 65L |
| `system_memory_purge()` | `1064–1071` | 8L |
| `system_storage_purge()` | `1073–1088` | 16L |
| `zram_status_json()` | `1091–1138` | 48L |
| `zram_toggle()` | `1140–1184` | 45L |
| `get_ntp_status()` | `1190–1223` | 34L |
| `ntp_sync_browser()` | `1227–1290` | 64L |
| `ntp_configure_smart()` | `1292–1329` | 38L |
| `ntp_intercept_toggle()` | `1331–1346` | 16L |
| `time_save_clock()` | `1348–1360` | 13L |
| `handle_system()` | `1362–1611` | 250L |

### `root/usr/lib/ark/modules/system_hardware_leds.sh` (1976 linhas, 12 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `cleanup_orphan_leds()` | `14–43` | 30L |
| `update_wan_led()` | `45–179` | 135L |
| `get_led_hardware_info()` | `181–484` | 304L |
| `update_led_alert()` | `486–489` | 4L |
| `apply_aw21018_leds()` | `491–541` | 51L |
| `set_led_rgb_color()` | `543–696` | 154L |
| `set_led_preset()` | `698–949` | 252L |
| `get_led_status()` | `951–964` | 14L |
| `detect_hardware_silicon_profile()` | `966–1103` | 138L |
| `system_hardware_auto_tune()` | `1105–1464` | 360L |
| `get_system_hardware_info_raw()` | `1466–1937` | 472L |
| `get_system_hardware_info()` | `1939–1975` | 37L |

### `root/usr/lib/ark/modules/vpn.sh` (1348 linhas, 33 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `json_text_escape()` | `13–15` | 3L |
| `ark_vpn_lan_cidr()` | `17–42` | 26L |
| `zerotier_device_name()` | `44–58` | 15L |
| `zerotier_firewall_prepare()` | `60–100` | 41L |
| `zerotier_current_ip()` | `102–104` | 3L |
| `zerotier_configure_access()` | `106–115` | 10L |
| `zerotier_bind_uhttpd()` | `117–119` | 3L |
| `zerotier_late_bind_uhttpd()` | `121–129` | 9L |
| `zerotier_install()` | `131–141` | 11L |
| `zerotier_enable()` | `143–177` | 35L |
| `zerotier_disable()` | `179–195` | 17L |
| `valid_zerotier_network_id()` | `197–197` | 1L |
| `zerotier_join_network()` | `199–236` | 38L |
| `zerotier_leave_network()` | `238–254` | 17L |
| `zerotier_status_json()` | `256–312` | 57L |
| `zerotier_autostart_toggle()` | `314–336` | 23L |
| `wireguard_status_json()` | `338–432` | 95L |
| `wireguard_firewall_setup()` | `434–600` | 167L |
| `wireguard_firewall_cleanup()` | `602–653` | 52L |
| `wireguard_server_setup()` | `655–690` | 36L |
| `wireguard_enable()` | `692–706` | 15L |
| `wireguard_disable()` | `708–718` | 11L |
| `wireguard_autostart_toggle()` | `720–735` | 16L |
| `wireguard_peer_add()` | `737–882` | 146L |
| `wireguard_peer_delete()` | `884–907` | 24L |
| `wireguard_peer_qr()` | `909–943` | 35L |
| `b64_decode_str()` | `945–975` | 31L |
| `b64_encode_file()` | `977–992` | 16L |
| `wireguard_client_import()` | `994–1151` | 158L |
| `wireguard_client_status_json()` | `1153–1216` | 64L |
| `wireguard_client_toggle()` | `1218–1245` | 28L |
| `wireguard_client_delete()` | `1247–1268` | 22L |
| `handle_vpn()` | `1272–1344` | 73L |

### `root/usr/lib/ark/modules/wifi.sh` (2477 linhas, 16 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `wifi_radio_by_band()` | `15–70` | 56L |
| `wifi_radio_2g()` | `72–72` | 1L |
| `wifi_radio_5g()` | `74–74` | 1L |
| `wifi_radio_6g()` | `76–76` | 1L |
| `wifi_known_radios()` | `78–90` | 13L |
| `wifi_auto_enable_mesh_optimizations()` | `92–115` | 24L |
| `wifi_cleanup_mesh_interfaces()` | `117–147` | 31L |
| `wifi_get_ap_sections()` | `149–187` | 39L |
| `wifi_enhancer_status()` | `189–272` | 84L |
| `wifi_enhancer_update_status()` | `276–288` | 13L |
| `wifi_qca_apply_roaming_tuning()` | `292–328` | 37L |
| `wifi_enhancer_cleanup_lock()` | `330–337` | 8L |
| `wifi_enhancer_run_upgrade()` | `339–466` | 128L |
| `wifi_mlo_status()` | `468–495` | 28L |
| `wifi_mlo_toggle()` | `497–530` | 34L |
| `handle_wifi()` | `532–2477` | 1946L |

### `root/usr/lib/ark/qos-ingress.sh` (52 linhas, 1 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_qos_ingress_policy()` | `7–52` | 46L |

### `root/usr/lib/ark/qos-resources.sh` (124 linhas, 9 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_qos_memory_kb()` | `6–12` | 7L |
| `ark_qos_total_budget_kb()` | `14–23` | 10L |
| `ark_qos_module_present()` | `25–33` | 9L |
| `ark_qos_mq_candidate()` | `35–39` | 5L |
| `ark_qos_shaper_units()` | `41–75` | 35L |
| `ark_qos_direction_budget_bytes()` | `77–84` | 8L |
| `ark_qos_cake_memlimit()` | `86–94` | 9L |
| `ark_qos_ctinfo_fallback()` | `96–99` | 4L |
| `ark_qos_install_ctinfo()` | `101–124` | 24L |

### `root/usr/lib/ark/serialized-job.sh` (40 linhas, 1 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_serialized_job()` | `3–40` | 38L |

### `root/usr/lib/ark/validation.sh` (134 linhas, 17 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `valid_mac()` | `8–10` | 3L |
| `valid_mac_anycase()` | `12–14` | 3L |
| `device_suffix()` | `16–18` | 3L |
| `valid_ipv4()` | `20–22` | 3L |
| `valid_ipv6()` | `24–26` | 3L |
| `valid_ip()` | `28–30` | 3L |
| `ipv4_prefix24()` | `32–34` | 3L |
| `ipv4_host()` | `36–38` | 3L |
| `valid_lan_dhcp_range()` | `40–54` | 15L |
| `lan_dhcp_dns_values()` | `56–63` | 8L |
| `validate_dns_list()` | `65–74` | 10L |
| `valid_plain()` | `76–81` | 6L |
| `valid_wifi_password()` | `83–87` | 5L |
| `valid_ssid()` | `89–93` | 5L |
| `valid_uint_range()` | `95–98` | 4L |
| `valid_sqm_rate()` | `100–102` | 3L |
| `valid_net_device()` | `104–134` | 31L |

---

## 4. Índice Cirúrgico de Métodos Frontend (`src/modules/*.js`)

### `src/modules/adblock.js` (848 linhas, 5 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.adblockCard()` | `3–173` | 171L |
| `this.openAdguardWithSSO()` | `174–198` | 25L |
| `this.openAdguardSSOModal()` | `199–269` | 71L |
| `this.openAdguardUninstallModal()` | `270–361` | 92L |
| `this.openAdblockSetupModal()` | `362–848` | 487L |

### `src/modules/devices.js` (1919 linhas, 10 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.renderDevices()` | `3–855` | 853L |
| `this.sortDevices()` | `856–871` | 16L |
| `this.setDeviceSort()` | `872–890` | 19L |
| `this.toggleDeviceSortDirection()` | `891–903` | 13L |
| `this.quickReserveSecondary()` | `904–917` | 14L |
| `this.quickReserveIot()` | `918–953` | 36L |
| `this.updateSecondaryBanner()` | `954–1015` | 62L |
| `this.flushStaleLeases()` | `1016–1046` | 31L |
| `this.togglePassword()` | `1047–1047` | 1L |
| `this.configureDevice()` | `1048–1919` | 872L |

### `src/modules/doctor_perf.js` (1666 linhas, 8 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.showHighRamZramConfirmModal()` | `3–54` | 52L |
| `this.showLowEndMipsZramConfirmModal()` | `55–89` | 35L |
| `this.openDnsTurboModal()` | `90–510` | 421L |
| `this.openNetworkCapacityModal()` | `511–721` | 211L |
| `this.systemPerfCard()` | `722–1448` | 727L |
| `this.showDoctorModal()` | `1449–1613` | 165L |
| `this.runDoctorAudit()` | `1614–1638` | 25L |
| `this.runDoctorFix()` | `1639–1666` | 28L |

### `src/modules/ezsetup.js` (870 linhas, 4 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.loadEzSetup()` | `3–5` | 3L |
| `this.ezField()` | `6–8` | 3L |
| `this.showEzSetup()` | `9–820` | 812L |
| `this.showArkCleanup()` | `821–870` | 50L |

### `src/modules/lifecycle.js` (1032 linhas, 21 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.fetchCapabilities()` | `4–93` | 90L |
| `this.feature()` | `94–99` | 6L |
| `this.themeColor()` | `100–104` | 5L |
| `this.applyAppearance()` | `105–119` | 15L |
| `this.triggerImmediateRefresh()` | `120–141` | 22L |
| `this.switchProfile()` | `142–184` | 43L |
| `this.applyBrand()` | `185–189` | 5L |
| `this.load()` | `190–200` | 11L |
| `this.fetchData()` | `201–375` | 175L |
| `this.fetchDataTimed()` | `376–382` | 7L |
| `this.calculateRates()` | `383–426` | 44L |
| `this.deviceRates()` | `427–507` | 81L |
| `this.devicesExpanded()` | `508–511` | 4L |
| `this.isEconomicHardware()` | `512–525` | 14L |
| `this.adaptiveRefreshSeconds()` | `526–535` | 10L |
| `this.updateRefreshSummary()` | `536–547` | 12L |
| `this.scheduleAdaptiveRefresh()` | `548–576` | 29L |
| `this.update()` | `577–894` | 318L |
| `this.updateClockAndDate()` | `895–922` | 28L |
| `this.startClockTicker()` | `923–930` | 8L |
| `this.updateDoctorStatus()` | `931–1032` | 102L |

### `src/modules/network.js` (2302 linhas, 15 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.updateWan()` | `3–73` | 71L |
| `this.updateLan()` | `74–81` | 8L |
| `this.updateMwanMode()` | `82–197` | 116L |
| `this.updateHistory()` | `198–225` | 28L |
| `this.setMwanMode()` | `226–248` | 23L |
| `this.toggleMwan3()` | `249–317` | 69L |
| `this.toggleIgmp()` | `318–366` | 49L |
| `this.toggleSqm()` | `367–487` | 121L |
| `this.selectSqmEngine()` | `488–555` | 68L |
| `this.toggleWaveformAplus()` | `556–589` | 34L |
| `this.toggleGamingPorts()` | `590–625` | 36L |
| `this.editSqmLimits()` | `626–1327` | 702L |
| `this.editWan()` | `1328–1822` | 495L |
| `this.showPppoeLogsModal()` | `1823–1986` | 164L |
| `this.showLatencyTargetModal()` | `1987–2302` | 316L |

### `src/modules/network_modals.js` (1449 linhas, 9 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.showWanOptimizationsModal()` | `3–443` | 441L |
| `this.editLan()` | `444–696` | 253L |
| `this.disableIpv6Full()` | `697–718` | 22L |
| `this.showIpv6Modal()` | `719–995` | 277L |
| `this.showAddMwanRuleModal()` | `996–1179` | 184L |
| `this.deleteMwanRule()` | `1180–1209` | 30L |
| `this.toggleMwanRule()` | `1210–1228` | 19L |
| `this.toggleMwanTorrentPreset()` | `1229–1254` | 26L |
| `this.showMwanTorrentModal()` | `1255–1449` | 195L |

### `src/modules/render.js` (3488 linhas, 15 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.render()` | `3–2179` | 2177L |
| `this.renderMwanRulesSection()` | `2180–2347` | 168L |
| `this.renderV2DoctorStrip()` | `2348–2378` | 31L |
| `this.renderV2QuickStatusStrip()` | `2379–2407` | 29L |
| `this.renderV2SwitchPortsCard()` | `2408–2426` | 19L |
| `this.toggleV2MobileSidebar()` | `2427–2435` | 9L |
| `this.switchV2Panel()` | `2436–2512` | 77L |
| `this.renderV2CockpitStatusOverview()` | `2513–2584` | 72L |
| `this.setupV2CockpitLayout()` | `2585–2870` | 286L |
| `this.renderPluginLifecycleBar()` | `2871–2952` | 82L |
| `this.applyFeatureVisibilityAndLifecycle()` | `2953–3072` | 120L |
| `this.renderV2LuciDrawer()` | `3073–3190` | 118L |
| `this.toggleV2LuciDrawer()` | `3191–3207` | 17L |
| `this.filterV2LuciDrawer()` | `3208–3219` | 12L |
| `this.updateV2CockpitStatus()` | `3220–3488` | 269L |

### `src/modules/speedify.js` (644 linhas, 14 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.prepareSpeedifyWans()` | `3–12` | 10L |
| `this.installSpeedifyMode()` | `13–27` | 15L |
| `this.saveSpeedifyConfig()` | `28–30` | 3L |
| `this.pairSpeedify()` | `31–47` | 17L |
| `this.checkSpeedifyUser()` | `48–63` | 16L |
| `this.toggleSpeedifyAutostart()` | `64–75` | 12L |
| `this.toggleSpeedifyPower()` | `76–139` | 64L |
| `this.speedifyCommand()` | `140–148` | 9L |
| `this.toggleSpeedifyBypass()` | `149–162` | 14L |
| `this.toggleSpeedifyBypassMaster()` | `163–181` | 19L |
| `this.saveSpeedifyAdapterPriority()` | `182–184` | 3L |
| `this.saveSpeedifyAdapterRate()` | `185–187` | 3L |
| `this.uninstallSpeedify()` | `188–262` | 75L |
| `this.speedifyCard()` | `263–644` | 382L |

### `src/modules/speedtest.js` (419 linhas, 11 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.openFastCom()` | `3–18` | 16L |
| `this.promptSelectWanForSpeedtest()` | `19–87` | 69L |
| `this.showEmbedSpeedtest()` | `88–361` | 274L |
| `this.runSpeedtest()` | `362–369` | 8L |
| `this.renderSpeedtestProgress()` | `370–378` | 9L |
| `this.startSpeedtest()` | `379–382` | 4L |
| `this.startConnectedSpeedtests()` | `383–395` | 13L |
| `this.pollSpeedtest()` | `396–404` | 9L |
| `this.loadSpeedtestResult()` | `405–407` | 3L |
| `this.renderSpeedtestResult()` | `408–415` | 8L |
| `this.applySpeedtestSuggestion()` | `416–419` | 4L |

### `src/modules/starlink.js` (671 linhas, 13 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.activateStarlinkPanel()` | `3–5` | 3L |
| `this.toggleStarlinkPublic()` | `6–18` | 13L |
| `this.toggleStarlinkAlwaysShow()` | `19–55` | 37L |
| `this.saveStarlinkTelemetrySettings()` | `56–94` | 39L |
| `this.triggerStarlinkTestEmail()` | `95–116` | 22L |
| `this.pollStarlinkTestEmail()` | `117–145` | 29L |
| `this.flushStarlinkTelemetryRam()` | `146–156` | 11L |
| `this.updateStarlinkTelemetryStatusBadge()` | `157–180` | 24L |
| `this.renderStarlinkTelemetrySection()` | `181–639` | 459L |
| `this.stopStarlinkAlignment()` | `640–642` | 3L |
| `this.startStarlinkAlignment()` | `643–645` | 3L |
| `this.finishStarlinkAndNext()` | `646–648` | 3L |
| `this.readStarlinkTelemetry()` | `649–671` | 23L |

### `src/modules/storage_wol.js` (1159 linhas, 9 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.ksmbdCard()` | `8–112` | 105L |
| `this.refreshKsmbdCardSummary()` | `113–175` | 63L |
| `this.openKsmbdFormatConfirmModal()` | `176–245` | 70L |
| `this.openKsmbdWanWarningModal()` | `246–276` | 31L |
| `this.openKsmbdModal()` | `277–772` | 496L |
| `this.wolCard()` | `773–858` | 86L |
| `this.refreshWolCardSummary()` | `859–917` | 59L |
| `this.triggerWolWake()` | `918–940` | 23L |
| `this.openWolModal()` | `941–1159` | 219L |

### `src/modules/system.js` (3451 linhas, 52 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.setDashboardLanguage()` | `3–20` | 18L |
| `this.showLanguageModal()` | `21–67` | 47L |
| `this.setDashboardTitle()` | `68–70` | 3L |
| `this.setAppearance()` | `71–73` | 3L |
| `this.changeHttpsRedirect()` | `74–77` | 4L |
| `this.showCertificateHelp()` | `78–81` | 4L |
| `this.setFeatureHidden()` | `82–84` | 3L |
| `this.loadFeatureInstallLog()` | `85–87` | 3L |
| `this.renderSelfUpdateResult()` | `88–139` | 52L |
| `this.checkSelfUpdate()` | `140–180` | 41L |
| `this.pollSelfUpdate()` | `181–270` | 90L |
| `this.showUpdateConfirmModal()` | `271–460` | 190L |
| `this.startSelfUpdate()` | `461–463` | 3L |
| `this.checkBackgroundUpdate()` | `464–512` | 49L |
| `this.renderUpdateBanner()` | `513–565` | 53L |
| `this.openManualUpdateModal()` | `566–600` | 35L |
| `this.startManualPackageUpload()` | `601–628` | 28L |
| `this.selfUpdatePanel()` | `629–739` | 111L |
| `this.pollFeatureInstall()` | `740–758` | 19L |
| `this.showPackageInstallProgressModal()` | `759–905` | 147L |
| `this.loadMissingInstallLog()` | `906–908` | 3L |
| `this.pollMissingInstall()` | `909–917` | 9L |
| `this.installMissingFeatures()` | `918–953` | 36L |
| `this.installFeature()` | `954–994` | 41L |
| `this.useTheme()` | `995–1017` | 23L |
| `this.requestReboot()` | `1018–1022` | 5L |
| `this.showRebootConfirmation()` | `1023–1032` | 10L |
| `this.upnpCard()` | `1033–1377` | 345L |
| `this.updateUpnpStatus()` | `1378–1529` | 152L |
| `this.saveUpnpSettings()` | `1530–1595` | 66L |
| `this.deleteUpnpLease()` | `1596–1605` | 10L |
| `this.clearUpnpLeases()` | `1606–1619` | 14L |
| `this.restartUpnpDaemon()` | `1620–1642` | 23L |
| `this.dmzCard()` | `1643–1729` | 87L |
| `this.updateDmzStatus()` | `1730–1815` | 86L |
| `this.showDmzModal()` | `1816–2090` | 275L |
| `this.showThermalModal()` | `2091–2133` | 43L |
| `this.showNetworkModeModal()` | `2134–2375` | 242L |
| `this.showNetworkModeConfirmation()` | `2376–2479` | 104L |
| `this.showHardwareModal()` | `2480–2686` | 207L |
| `this.showFeatureCenter()` | `2687–3069` | 383L |
| `this.refreshFeatureCenterRows()` | `3070–3094` | 25L |
| `this.isDevMode()` | `3095–3100` | 6L |
| `this.isShowUninstalledMenus()` | `3101–3106` | 6L |
| `this.toggleDevMode()` | `3107–3142` | 36L |
| `this.toggleShowUninstalledMenus()` | `3143–3174` | 32L |
| `this.confirmFeatureChange()` | `3175–3199` | 25L |
| `this.refreshChangedFeatureCard()` | `3200–3214` | 15L |
| `this.runFeatureMutation()` | `3215–3231` | 17L |
| `this.toggleFeatureState()` | `3232–3262` | 31L |
| `this.removeFeature()` | `3263–3291` | 29L |
| `this.showNtpModal()` | `3292–3451` | 160L |

### `src/modules/vpn.js` (1023 linhas, 11 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.enableZerotier()` | `3–13` | 11L |
| `this.disableZerotier()` | `14–35` | 22L |
| `this.joinZerotier()` | `36–58` | 23L |
| `this.leaveZerotier()` | `59–73` | 15L |
| `this.zerotierCard()` | `74–157` | 84L |
| `this.enableWireguard()` | `158–169` | 12L |
| `this.disableWireguard()` | `170–192` | 23L |
| `this.showWireGuardQrModal()` | `193–248` | 56L |
| `this.showWireGuardModal()` | `249–448` | 200L |
| `this.showWireGuardClientModal()` | `449–870` | 422L |
| `this.wireguardCard()` | `871–1023` | 153L |

### `src/modules/wifi.js` (3263 linhas, 29 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.updateWifi()` | `3–128` | 126L |
| `this.currentWifiChannels()` | `129–145` | 17L |
| `this.changeWifiPassword()` | `146–176` | 31L |
| `this.showAddWifiModal()` | `177–289` | 113L |
| `this.toggleWifiNetwork()` | `290–325` | 36L |
| `this._executeWifiToggle()` | `326–357` | 32L |
| `this.editWifiNetwork()` | `358–1025` | 668L |
| `this.showManualChannelsModal()` | `1026–1302` | 277L |
| `this.analyzeChannels()` | `1303–1320` | 18L |
| `this.toggleAutoChannels()` | `1321–1328` | 8L |
| `this.changeChannels()` | `1329–1339` | 11L |
| `this.optimizeIot()` | `1340–1369` | 30L |
| `this.optimizeDfs()` | `1370–1399` | 30L |
| `this.changeWifiWidth()` | `1400–1556` | 157L |
| `this.showTxPowerModal()` | `1557–1722` | 166L |
| `this.changeCountry()` | `1723–1834` | 112L |
| `this.toggleWps()` | `1835–1860` | 26L |
| `this.triggerWpsPbc()` | `1861–1891` | 31L |
| `this.toggleRoaming()` | `1892–1913` | 22L |
| `this.toggleUsteer()` | `1914–1958` | 45L |
| `this.toggleWifi6Accel()` | `1959–1982` | 24L |
| `this.toggleWifiMlo()` | `1983–2005` | 23L |
| `this.confirmMultiRouterAction()` | `2006–2057` | 52L |
| `this.toggleTxBalance()` | `2058–2085` | 28L |
| `this._applyTxBalance()` | `2086–2106` | 21L |
| `this.showMeshModal()` | `2107–2193` | 87L |
| `this.updateWifiEnhancerUI()` | `2194–2234` | 41L |
| `this.showWifiEnhancerModal()` | `2235–2414` | 180L |
| `this.showSatelliteWizardModal()` | `2415–3263` | 849L |

---

## 5. Mapa de Daemons, Init Scripts (`procd`) e Hotplugs (`root/etc/hotplug.d/`)

| Categoria | Caminho no Repositório | Papel Operacional |
| :--- | :--- | :--- |
| **Dispatcher** | `root/usr/sbin/equipe-dashboard-control` | Controlador unificado CLI/RPC com Fast-Path de cache e lock de mutação |
| **Wrapper CLI** | `root/usr/sbin/ark-doctor` | Atalho CLI para `equipe-dashboard-control ark-doctor` |
| **Daemon** | `root/usr/sbin/ark-autowan-daemon` | Monitoramento contínuo de portas físicas e conversão automática WAN/LAN |
| **Daemon** | `root/usr/sbin/ark-port-ledd` | Sincronização em tempo real dos LEDs físicos de portas de rede |
| **Daemon** | `root/usr/sbin/ark-rainbowd` | Motor de efeitos RGB e animações de LEDs (GPIO / I2C AW21018) |
| **Daemon** | `root/usr/sbin/ark-web-watchdog` | Sonda HTTP local observacional; não reinicia serviços |
| **Daemon** | `root/usr/sbin/equipe-traffic-history` | Coletor leve de histórico de tráfego em `/tmp/equipe-traffic-history.csv` |
| **Daemon** | `root/usr/sbin/starlink-telemetry-daemon` | Coletor gRPC de telemetria da antena Starlink |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/05-ark-pppoe-babyjumbo` | Sondagem e ajuste automático de MTU 1508 (RFC 4638 Baby Jumbo) no PPPoE |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/15-ark-ipv6-hygiene` | Expurgo de prefixos IPv6 órfãos e sincronia de rotas CLAT a cada `ifup`/`ifupdate` |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/30-wireguard-wan` | Ressincronização de endpoint e MTU do WireGuard em transições WAN |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/95-ark-cache-invalidate` | Invalidação de caches `/tmp/ark-*-cache.ts` e reload seguro de DoH |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/98-ark-hardware-tune` | Reaplicação de sintonia de hardware em eventos `ifup` de interfaces físicas |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/99-ark-doctor` | Diagnóstico observacional (`ark-doctor --auto`) pós-conexão |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/99-ark-led-wan` | Atualização dinâmica do LED de Internet/WAN em `ifup`/`ifdown` |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/90-ark-rps-tune` | Atribuição multicore de máscaras RPS e limites GRO/GSO para interfaces recém-criadas |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/95-ark-cache-invalidate` | Invalidação de caches em eventos físicos de link de rede |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/98-ark-mlo-bridge` | Vinculação automática de interfaces MLD (Wi-Fi 7 MLO) à `br-lan` |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/99-ark-doctor` | Diagnóstico sem reparos ao recriar interfaces de rádio Wi-Fi ou bridge |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/99-ark-led-wan` | Atualização imediata de LED WAN em eventos de cabo físico (ignora interfaces virtuais/Wi-Fi) |
| **Hotplug (`firewall`)** | `root/etc/hotplug.d/firewall/99-ark-doctor` | Revalidação de conflitos Flow Offloading vs SQM após reload do firewall |

