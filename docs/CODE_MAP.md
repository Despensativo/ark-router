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
| `adblock-blacklist-sync` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1598` (`handle_adblock`) | `src/modules/adblock.js:623` (`openAdblockSetupModal`) |
| `adblock-sso-login` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1578` (`handle_adblock`) | `src/modules/adblock.js:184` (`openAdguardWithSSO`)<br>`src/modules/adblock.js:217` (`openAdguardSSOModal`) |
| `adblock-uninstall` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1615` (`handle_adblock`) | `src/modules/adblock.js:289` (`openAdguardUninstallModal`) |
| `adblock-whitelist-sync` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1601` (`handle_adblock`) | `src/modules/adblock.js:680` (`openAdblockSetupModal`) |
| `appearance` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2228` (`handle_ezsetup`) | `src/modules/system.js:72` (`setAppearance`) |
| `asu-check-toggle` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1720` (`handle_system`) | `src/modules/system.js:652` (`selfUpdatePanel`) |
| `autowan-can-convert-wan` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1189` (`handle_network`) | `src/modules/render.js:597` (`render`) |
| `autowan-policy-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1150` (`handle_network`) | `src/modules/network.js:240` (`setMwanMode`)<br>`src/modules/network.js:242` (`setMwanMode`)<br>`src/modules/render.js:749` (`render`) |
| `autowan-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1027` (`handle_network`) | `src/modules/render.js:663` (`render`)<br>`src/modules/render.js:711` (`render`) |
| `autowan-wan-to-lan` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1192` (`handle_network`) | `src/modules/render.js:334` (`render`)<br>`src/modules/render.js:580` (`render`)<br>`src/modules/render.js:632` (`render`) |
| `cleanup-apply` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2575` (`handle_ezsetup`) | `src/modules/ezsetup.js:845` (`showArkCleanup`) |
| `cleanup-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2572` (`handle_ezsetup`) | `src/modules/ezsetup.js:822` (`showArkCleanup`) |
| `country` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1345` (`handle_ezsetup`) | `src/modules/wifi.js:1822` (`changeCountry`) |
| `device-fingerprints` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1398` (`handle_devices`) | `src/modules/lifecycle.js:246` (`fetchData`) |
| `device-reserve-quick` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1572` (`handle_devices`) | `src/modules/devices.js:981` (`quickReserveIot`) |
| `device-reserve-secondary` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1535` (`handle_devices`) | `src/modules/devices.js:956` (`quickReserveSecondary`) |
| `device-stations` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1979` (`handle_devices`) | `src/modules/lifecycle.js:247` (`fetchData`) |
| `device-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1604` (`handle_devices`) | `src/modules/devices.js:1103` (`configureDevice`) |
| `dmz-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1583` (`handle_system`) | `src/modules/system.js:1663` (`dmzCard`)<br>`src/modules/system.js:1787` (`updateDmzStatus`)<br>`src/modules/system.js:2029` (`showDmzModal`)<br>`src/modules/system.js:2059` (`showDmzModal`) |
| `dmz-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1580` (`handle_system`) | `src/modules/system.js:1732` (`updateDmzStatus`)<br>`src/modules/system.js:1822` (`showDmzModal`) |
| `dns-turbo-benchmark` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1649` (`handle_system`) | `src/modules/doctor_perf.js:277` (`openDnsTurboModal`)<br>`src/modules/doctor_perf.js:340` (`openDnsTurboModal`) |
| `dns-turbo-doh` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1644` (`handle_system`) | `src/modules/doctor_perf.js:390` (`openDnsTurboModal`) |
| `dns-turbo-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1636` (`handle_system`) | `src/modules/doctor_perf.js:93` (`openDnsTurboModal`) |
| `doctor-fix` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/doctor.sh:2923` (`handle_doctor`) | `src/modules/doctor_perf.js:1702` (`runDoctorFix`) |
| `doctor-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/doctor.sh:2915` (`handle_doctor`) | `src/modules/doctor_perf.js:1607` (`showDoctorModal`) |
| `doctor-run` | 🟢 Read-Only | `root/usr/lib/ark/modules/doctor.sh:2919` (`handle_doctor`) | `src/modules/doctor_perf.js:1675` (`runDoctorAudit`) |
| `doctor-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/doctor.sh:2911` (`handle_doctor`) | `src/modules/lifecycle.js:342` (`fetchData`) |
| `ez-setup-apply` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1423` (`handle_ezsetup`) | `src/modules/ezsetup.js:645` (`showEzSetup`) |
| `ez-setup-install-modules` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1647` (`handle_ezsetup`) | `src/modules/ezsetup.js:687` (`showEzSetup`) |
| `ez-setup-reset` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1323` (`handle_ezsetup`) | `src/modules/ezsetup.js:713` (`showEzSetup`) |
| `ez-setup-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1320` (`handle_ezsetup`) | `src/modules/ezsetup.js:4` (`loadEzSetup`) |
| `fast-targets` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1676` (`handle_system`) | `src/modules/speedtest.js:161` (`showEmbedSpeedtest`) |
| `feature-dev-mode` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2256` (`handle_ezsetup`) | `src/modules/system.js:3217` (`toggleDevMode`) |
| `feature-install` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2293` (`handle_ezsetup`) | `src/modules/network.js:307` (`toggleMwan3`)<br>`src/modules/system.js:971` (`installFeature`) |
| `feature-install-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2465` (`handle_ezsetup`) | `src/modules/system.js:86` (`loadFeatureInstallLog`) |
| `feature-install-missing` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2469` (`handle_ezsetup`) | `src/modules/system.js:929` (`installMissingFeatures`) |
| `feature-install-missing-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2566` (`handle_ezsetup`) | `src/modules/system.js:907` (`loadMissingInstallLog`) |
| `feature-install-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2448` (`handle_ezsetup`) | `src/modules/system.js:741` (`pollFeatureInstall`) |
| `feature-menu-policy` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2271` (`handle_ezsetup`) | `src/modules/system.js:3253` (`toggleShowUninstalledMenus`) |
| `features` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1706` (`handle_ezsetup`) | `src/modules/lifecycle.js:34` (`fetchCapabilities`)<br>`src/modules/lifecycle.js:57` (`fetchCapabilities`) |
| `flush-stale-leases` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1976` (`handle_devices`) | `src/modules/devices.js:1073` (`flushStaleLeases`) |
| `https-redirect` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1703` (`handle_system`) | `src/modules/system.js:76` (`changeHttpsRedirect`) |
| `ipv6-disable-full` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:2100` (`handle_network`) | `src/modules/network_modals.js:858` (`disableIpv6Full`) |
| `ipv6-mode-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:2091` (`handle_network`) | `src/modules/network_modals.js:960` (`showIpv6Modal`) |
| `ipv6-relay-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:2094` (`handle_network`) | `src/modules/network_modals.js:1085` (`showIpv6Modal`) |
| `ipv6-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:2088` (`handle_network`) | `src/modules/network_modals.js:878` (`showIpv6Modal`) |
| `irqbalance-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1370` (`handle_sqm`) | `src/modules/doctor_perf.js:988` (`systemPerfCard`)<br>`src/modules/doctor_perf.js:1015` (`systemPerfCard`) |
| `ksmbd-control` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:444` (`handle_storage_wol`) | `src/modules/storage_wol.js:72` (`ksmbdCard`)<br>`src/modules/storage_wol.js:349` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:363` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:377` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:392` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:420` (`openKsmbdModal`) |
| `ksmbd-disk-action` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:622` (`handle_storage_wol`) | `src/modules/storage_wol.js:198` (`openKsmbdFormatConfirmModal`)<br>`src/modules/storage_wol.js:459` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:474` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:490` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:511` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:544` (`openKsmbdModal`) |
| `ksmbd-interface-access` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:526` (`handle_storage_wol`) | `src/modules/storage_wol.js:582` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:597` (`openKsmbdModal`) |
| `ksmbd-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/storage_wol.sh:441` (`handle_storage_wol`) | `src/modules/storage_wol.js:115` (`refreshKsmbdCardSummary`)<br>`src/modules/storage_wol.js:293` (`openKsmbdModal`) |
| `ksmbd-user-action` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:562` (`handle_storage_wol`) | `src/modules/storage_wol.js:662` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:677` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:737` (`openKsmbdModal`) |
| `lan-igmp-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:630` (`handle_network`) | `src/modules/network.js:331` (`toggleIgmp`) |
| `lan-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:580` (`handle_network`) | `src/modules/lifecycle.js:233` (`fetchData`) |
| `language` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1338` (`handle_ezsetup`) | `src/modules/system.js:13` (`setDashboardLanguage`) |
| `manual-update-start` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2129` (`handle_ezsetup`) | `src/modules/system.js:614` (`startManualPackageUpload`) |
| `mwan` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:757` (`handle_network`) | `src/modules/network.js:237` (`setMwanMode`) |
| `mwan-rule-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:900` (`handle_network`) | `src/modules/network_modals.js:1357` (`deleteMwanRule`) |
| `mwan-rule-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:913` (`handle_network`) | `src/modules/network_modals.js:1375` (`toggleMwanRule`) |
| `mwan-status-fast` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:276` (`handle_network`) | `src/modules/lifecycle.js:212` (`fetchData`) |
| `mwan-torrent-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:926` (`handle_network`) | `src/modules/network_modals.js:1398` (`toggleMwanTorrentPreset`)<br>`src/modules/network_modals.js:1585` (`showMwanTorrentModal`) |
| `mwan3-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1020` (`handle_network`) | `src/modules/network.js:282` (`toggleMwan3`) |
| `network-capacity-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1653` (`handle_system`) | `src/modules/doctor_perf.js:533` (`openNetworkCapacityModal`) |
| `ntp-configure-smart` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1798` (`handle_system`) | `src/modules/system.js:3529` (`showNtpModal`) |
| `ntp-intercept-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1801` (`handle_system`) | `src/modules/system.js:3456` (`showNtpModal`) |
| `ntp-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1792` (`handle_system`) | `src/modules/system.js:3405` (`showNtpModal`) |
| `ntp-sync-browser` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1795` (`handle_system`) | `src/modules/system.js:3510` (`showNtpModal`) |
| `ping-target-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:2051` (`handle_network`) | `src/modules/network.js:2336` (`showLatencyTargetModal`) |
| `pppoe-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:2002` (`handle_network`) | `src/modules/network.js:1929` (`showPppoeLogsModal`) |
| `pppoe-profile-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1982` (`handle_network`) | `src/modules/network.js:1472` (`editWan`) |
| `pppoe-profiles-list` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1921` (`handle_network`) | `src/modules/network.js:1335` (`editWan`) |
| `profile` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1336` (`handle_ezsetup`) | `src/modules/lifecycle.js:168` (`switchProfile`) |
| `reboot-confirm` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1963` (`handle_devices`) | `src/modules/system.js:1026` (`showRebootConfirmation`) |
| `reboot-prepare` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1954` (`handle_devices`) | `src/modules/system.js:1020` (`requestReboot`) |
| `self-update-check` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1994` (`handle_ezsetup`) | `src/modules/system.js:487` (`checkBackgroundUpdate`) |
| `self-update-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2022` (`handle_ezsetup`) | `src/modules/system.js:224` (`pollSelfUpdate`) |
| `self-update-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2019` (`handle_ezsetup`) | `src/modules/system.js:182` (`pollSelfUpdate`) |
| `speedify` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1108` (`handle_speedify`) | `src/modules/speedify.js:145` (`speedifyCommand`) |
| `speedify-adapter-priority` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1032` (`handle_speedify`) | `src/modules/speedify.js:183` (`saveSpeedifyAdapterPriority`) |
| `speedify-adapter-rate` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1038` (`handle_speedify`) | `src/modules/speedify.js:186` (`saveSpeedifyAdapterRate`) |
| `speedify-autostart` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1090` (`handle_speedify`) | `src/modules/speedify.js:67` (`toggleSpeedifyAutostart`) |
| `speedify-bypass-master` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1024` (`handle_speedify`) | `src/modules/speedify.js:170` (`toggleSpeedifyBypassMaster`) |
| `speedify-bypass-service` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1015` (`handle_speedify`) | `src/modules/speedify.js:152` (`toggleSpeedifyBypass`) |
| `speedify-install-mode` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1068` (`handle_speedify`) | `src/modules/speedify.js:24` (`installSpeedifyMode`)<br>`src/modules/speedify.js:111` (`toggleSpeedifyPower`) |
| `speedify-pairing` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1102` (`handle_speedify`) | `src/modules/speedify.js:35` (`pairSpeedify`) |
| `speedify-power` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1093` (`handle_speedify`) | `src/modules/speedify.js:127` (`toggleSpeedifyPower`)<br>`src/modules/speedify.js:430` (`speedifyCard`) |
| `speedify-prepare` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1087` (`handle_speedify`) | `src/modules/speedify.js:9` (`prepareSpeedifyWans`)<br>`src/modules/speedify.js:109` (`toggleSpeedifyPower`) |
| `speedify-save-config` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1084` (`handle_speedify`) | `src/modules/speedify.js:29` (`saveSpeedifyConfig`) |
| `speedify-uninstall` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1096` (`handle_speedify`) | `src/modules/speedify.js:200` (`uninstallSpeedify`) |
| `speedify-user` | 🟢 Read-Only | `root/usr/lib/ark/modules/speedify.sh:1105` (`handle_speedify`) | `src/modules/speedify.js:49` (`checkSpeedifyUser`) |
| `speedtest-apply` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1508` (`handle_devices`) | `src/modules/speedtest.js:445` (`applySpeedtestSuggestion`) |
| `speedtest-result` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1500` (`handle_devices`) | `src/modules/speedtest.js:434` (`loadSpeedtestResult`) |
| `speedtest-start` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1408` (`handle_devices`) | `src/modules/speedtest.js:391` (`runSpeedtest`) |
| `speedtest-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1496` (`handle_devices`) | `src/modules/speedtest.js:425` (`pollSpeedtest`) |
| `sqm-engine-select` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1365` (`handle_sqm`) | `src/modules/network.js:506` (`selectSqmEngine`) |
| `sqm-gaming-ports` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1457` (`handle_sqm`) | `src/modules/network.js:607` (`toggleGamingPorts`) |
| `sqm-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1340` (`handle_sqm`) | `src/modules/lifecycle.js:172` (`switchProfile`)<br>`src/modules/network.js:473` (`toggleSqm`) |
| `sqm-waveform-aplus` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1384` (`handle_sqm`) | `src/modules/network.js:571` (`toggleWaveformAplus`) |
| `starlink-active-wan-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:222` (`handle_starlink`) | `src/modules/starlink.js:61` (`starlinkCard`) |
| `starlink-always-show-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:260` (`handle_starlink`) | `src/modules/starlink.js:137` (`toggleStarlinkAlwaysShow`) |
| `starlink-public-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:225` (`handle_starlink`) | `src/modules/starlink.js:124` (`toggleStarlinkPublic`) |
| `starlink-telemetry` | 🟢 Read-Only | `root/usr/lib/ark/modules/starlink.sh:208` (`handle_starlink`) | `src/modules/starlink.js:769` (`readStarlinkTelemetry`) |
| `starlink-telemetry-flush` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:417` (`handle_starlink`) | `src/modules/starlink.js:264` (`flushStarlinkTelemetryRam`) |
| `starlink-telemetry-send-test` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:382` (`handle_starlink`) | `src/modules/starlink.js:213` (`triggerStarlinkTestEmail`) |
| `starlink-telemetry-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/starlink.sh:232` (`handle_starlink`) | `src/modules/starlink.js:274` (`updateStarlinkTelemetryStatusBadge`) |
| `starlink-telemetry-test-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/starlink.sh:410` (`handle_starlink`) | `src/modules/starlink.js:244` (`pollStarlinkTestEmail`) |
| `system-hardware-auto-tune` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1761` (`handle_system`) | `src/modules/doctor_perf.js:854` (`systemPerfCard`)<br>`src/modules/system.js:2717` (`showHardwareModal`) |
| `system-hardware-info` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1758` (`handle_system`) | `src/modules/lifecycle.js:244` (`fetchData`) |
| `system-hardware-sqm-audit` | 🟢 Read-Only | `root/usr/lib/ark/modules/sqm.sh:1799` (`handle_sqm`) | `src/modules/network.js:653` (`editSqmLimits`) |
| `system-memory-purge` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1663` (`handle_system`) | `src/modules/doctor_perf.js:807` (`systemPerfCard`) |
| `system-network-mode-get` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1360` (`handle_network`) | `src/modules/system.js:2135` (`showNetworkModeModal`) |
| `system-perf-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1564` (`handle_system`) | `src/modules/lifecycle.js:235` (`fetchData`) |
| `system-processes-telemetry` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1660` (`handle_system`) | `src/modules/system.js:2751` (`showHardwareModal`) |
| `system-storage-purge` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1667` (`handle_system`) | `src/modules/doctor_perf.js:829` (`systemPerfCard`)<br>`src/modules/system.js:353` (`showUpdateConfirmModal`) |
| `theme` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2579` (`handle_ezsetup`) | `src/modules/system.js:1005` (`useTheme`) |
| `title` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2193` (`handle_ezsetup`) | `src/modules/system.js:69` (`setDashboardTitle`) |
| `upnp-clear-leases` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1622` (`handle_system`) | `src/modules/system.js:1610` (`clearUpnpLeases`) |
| `upnp-delete-lease` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1618` (`handle_system`) | `src/modules/system.js:1598` (`deleteUpnpLease`) |
| `upnp-restart` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1625` (`handle_system`) | `src/modules/system.js:1627` (`restartUpnpDaemon`) |
| `upnp-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1587` (`handle_system`) | `src/modules/system.js:1380` (`updateUpnpStatus`) |
| `upnp-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1590` (`handle_system`) | `src/modules/doctor_perf.js:1203` (`systemPerfCard`) |
| `wan-optimize-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1380` (`handle_network`) | `src/modules/network_modals.js:5` (`showWanOptimizationsModal`) |
| `wan-probe-mtu` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1367` (`handle_network`) | `src/modules/network_modals.js:180` (`showWanOptimizationsModal`) |
| `wifi` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:551` (`handle_wifi`) | `src/modules/wifi.js:164` (`changeWifiPassword`) |
| `wifi-add` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:863` (`handle_wifi`) | `src/modules/wifi.js:275` (`showAddWifiModal`) |
| `wifi-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:952` (`handle_wifi`) | `src/modules/wifi.js:948` (`editWifiNetwork`) |
| `wifi-dfs-optimize` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1383` (`handle_wifi`) | `src/modules/render.js:1607` (`render`)<br>`src/modules/wifi.js:1387` (`optimizeDfs`) |
| `wifi-enhancer-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/wifi.sh:2504` (`handle_wifi`) | `src/modules/wifi.js:2241` (`updateWifiEnhancerUI`)<br>`src/modules/wifi.js:2292` (`showWifiEnhancerModal`)<br>`src/modules/wifi.js:2390` (`showWifiEnhancerModal`) |
| `wifi-enhancer-upgrade` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2507` (`handle_wifi`) | `src/modules/wifi.js:2388` (`showWifiEnhancerModal`) |
| `wifi-iot-optimize` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1319` (`handle_wifi`) | `src/modules/render.js:1557` (`render`)<br>`src/modules/wifi.js:1357` (`optimizeIot`) |
| `wifi-mesh-pair-open` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1827` (`handle_wifi`) | `src/modules/wifi.js:2158` (`showMeshModal`) |
| `wifi-mesh-satellite-discover` | 🟢 Read-Only | `root/usr/lib/ark/modules/wifi.sh:1872` (`handle_wifi`) | `src/modules/wifi.js:2463` (`showSatelliteWizardModal`) |
| `wifi-mesh-satellite-revert` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2235` (`handle_wifi`) | `src/modules/wifi.js:3224` (`showSatelliteWizardModal`) |
| `wifi-mesh-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1835` (`handle_wifi`) | `src/modules/wifi.js:2185` (`showMeshModal`)<br>`src/modules/wifi.js:2216` (`showMeshModal`) |
| `wifi-mlo-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2514` (`handle_wifi`) | `src/modules/wifi.js:1988` (`toggleWifiMlo`) |
| `wifi-roaming-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1579` (`handle_wifi`) | `src/modules/wifi.js:1897` (`toggleRoaming`) |
| `wifi-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:567` (`handle_wifi`) | `src/modules/wifi.js:334` (`_executeWifiToggle`) |
| `wifi-txbalance-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1767` (`handle_wifi`) | `src/modules/wifi.js:2090` (`_applyTxBalance`) |
| `wifi-usteer-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1668` (`handle_wifi`) | `src/modules/wifi.js:1922` (`toggleUsteer`) |
| `wifi-wed-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1421` (`handle_wifi`) | `src/modules/render.js:1462` (`render`) |
| `wifi-wifi6-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2384` (`handle_wifi`) | `src/modules/wifi.js:1964` (`toggleWifi6Accel`) |
| `wifi-wps-pbc` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1535` (`handle_wifi`) | `src/modules/wifi.js:1865` (`triggerWpsPbc`) |
| `wifi-wps-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1503` (`handle_wifi`) | `src/modules/wifi.js:1841` (`toggleWps`) |
| `wireguard-autostart-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1606` (`handle_vpn`) | `src/modules/vpn.js:1080` (`wireguardCard`) |
| `wireguard-client-access-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1621` (`handle_vpn`) | `src/modules/vpn.js:552` (`showWireGuardClientModal`) |
| `wireguard-client-conf-get` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1624` (`handle_vpn`) | `src/modules/vpn.js:455` (`showWireGuardClientModal`) |
| `wireguard-client-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1633` (`handle_vpn`) | `src/modules/vpn.js:724` (`showWireGuardClientModal`) |
| `wireguard-client-import` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1618` (`handle_vpn`) | `src/modules/vpn.js:931` (`showWireGuardClientModal`) |
| `wireguard-client-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1627` (`handle_vpn`) | `src/modules/vpn.js:453` (`showWireGuardClientModal`) |
| `wireguard-client-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1630` (`handle_vpn`) | `src/modules/vpn.js:688` (`showWireGuardClientModal`) |
| `wireguard-disable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1603` (`handle_vpn`) | `src/modules/vpn.js:180` (`disableWireguard`) |
| `wireguard-enable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1600` (`handle_vpn`) | `src/modules/vpn.js:161` (`enableWireguard`) |
| `wireguard-peer-add` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1609` (`handle_vpn`) | `src/modules/vpn.js:329` (`showWireGuardModal`) |
| `wireguard-peer-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1612` (`handle_vpn`) | `src/modules/vpn.js:401` (`showWireGuardModal`) |
| `wireguard-peer-qr` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1615` (`handle_vpn`) | `src/modules/vpn.js:381` (`showWireGuardModal`) |
| `wireguard-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1594` (`handle_vpn`) | `src/modules/vpn.js:253` (`showWireGuardModal`) |
| `wol-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/storage_wol.sh:795` (`handle_storage_wol`) | `src/modules/storage_wol.js:911` (`refreshWolCardSummary`)<br>`src/modules/storage_wol.js:997` (`openWolModal`) |
| `wol-target-save` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:827` (`handle_storage_wol`) | `src/modules/devices.js:1946` (`configureDevice`)<br>`src/modules/storage_wol.js:1079` (`openWolModal`) |
| `wol-wake` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:798` (`handle_storage_wol`) | `src/modules/storage_wol.js:974` (`triggerWolWake`) |
| `zerotier-autostart-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1591` (`handle_vpn`) | `src/modules/vpn.js:113` (`zerotierCard`) |
| `zerotier-disable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1574` (`handle_vpn`) | `src/modules/vpn.js:24` (`disableZerotier`) |
| `zerotier-enable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1571` (`handle_vpn`) | `src/modules/vpn.js:6` (`enableZerotier`) |
| `zerotier-join` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1585` (`handle_vpn`) | `src/modules/vpn.js:48` (`joinZerotier`) |
| `zerotier-leave` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1588` (`handle_vpn`) | `src/modules/vpn.js:64` (`leaveZerotier`) |
| `zram-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1632` (`handle_system`) | `src/modules/doctor_perf.js:22` (`showHighRamZramConfirmModal`)<br>`src/modules/doctor_perf.js:60` (`showLowEndMipsZramConfirmModal`)<br>`src/modules/doctor_perf.js:1140` (`systemPerfCard`) |

---

## 3. Índice Cirúrgico de Funções Backend (`root/usr/lib/ark/**/*.sh`)

### `root/usr/lib/ark/common.sh` (3265 linhas, 121 funções)

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
| `ark_is_hub_mode()` | `222–228` | 7L |
| `ark_is_satellite_or_ap()` | `230–246` | 17L |
| `ark_ap_uplink_dev()` | `248–274` | 27L |
| `ark_language()` | `276–296` | 21L |
| `installed()` | `299–356` | 58L |
| `hidden()` | `358–360` | 3L |
| `running()` | `362–380` | 19L |
| `ark_is_init_enabled()` | `382–392` | 11L |
| `ark_feature_policy_drifted()` | `394–500` | 107L |
| `ark_get_drifted_features()` | `502–514` | 13L |
| `ark_ensure_adguardhome_circuit_breaker()` | `516–544` | 29L |
| `ark_check_post_upgrade_drift()` | `546–605` | 60L |
| `ark_post_upgrade_hygiene()` | `607–690` | 84L |
| `ark_current_version()` | `693–701` | 9L |
| `ark_update_repo()` | `703–705` | 3L |
| `normalize_version()` | `707–709` | 3L |
| `ark_acquire_lock()` | `715–737` | 23L |
| `ark_release_lock()` | `739–744` | 6L |
| `ez_backup()` | `746–775` | 30L |
| `detect_dns_blocker()` | `777–828` | 52L |
| `ark_calculate_rps_mask()` | `830–846` | 17L |
| `ark_sqm_owns_device()` | `848–860` | 13L |
| `ark_cake_memlimit()` | `862–865` | 4L |
| `ark_upnp_is_legacy_iptables()` | `869–896` | 28L |
| `ark_upnp_is_legacy_nftables_on_fw3()` | `898–919` | 22L |
| `ark_migrate_upnp_variant()` | `921–1003` | 83L |
| `ark_sanitize_upnp_config()` | `1005–1049` | 45L |
| `ark_optimize_nat_endpoint_independent()` | `1054–1075` | 22L |
| `ark_sync_clat_p2p_routes()` | `1080–1125` | 46L |
| `ark_safe_storage_reboot()` | `1132–1222` | 91L |
| `ark_harden_transmission_config()` | `1225–1280` | 56L |
| `ark_cleanup_dhcpv6_orphans()` | `1283–1301` | 19L |
| `ark_sanitize_wan6_config()` | `1304–1394` | 91L |
| `ark_sanitize_lan_ipv6()` | `1397–1468` | 72L |
| `ark_ipv6_expand_prefix64()` | `1471–1501` | 31L |
| `ark_has_active_device_limits()` | `1503–1517` | 15L |
| `ark_ipv6_prefix_hygiene()` | `1520–1654` | 135L |
| `ark_auto_enable_factory_wifi()` | `1658–1692` | 35L |
| `ark_dev_supports_mtu()` | `1695–1722` | 28L |
| `_ark_set_single_device_mtu()` | `1726–1804` | 79L |
| `ark_ensure_phys_device_mtu()` | `1806–1839` | 34L |
| `ark_ensure_wan_mtu_fix()` | `1842–1861` | 20L |
| `ark_probe_path_mtu()` | `1865–1957` | 93L |
| `ark_get_min_wan_mtu()` | `1960–2029` | 70L |
| `ark_optimal_wg_mtu()` | `2035–2059` | 25L |
| `ark_sync_lan_ipv6_ra_mtu()` | `2063–2100` | 38L |
| `ark_ensure_phys_device_mac()` | `2105–2193` | 89L |
| `ez_get()` | `2201–2201` | 1L |
| `ez_set()` | `2203–2203` | 1L |
| `cleanup_backup()` | `2205–2218` | 14L |
| `ark_kill_package_fetchers()` | `2220–2225` | 6L |
| `ark_run_limited()` | `2227–2246` | 20L |
| `guest_l3_device()` | `2248–2253` | 6L |
| `active_wan_networks()` | `2255–2261` | 7L |
| `sqm_device_for_network()` | `2263–2277` | 15L |
| `find_dhcp_host()` | `2279–2288` | 10L |
| `sanitize_dhcp_hostnames()` | `2290–2303` | 14L |
| `apply_lan_dhcp_dns()` | `2305–2317` | 13L |
| `same_managed_subnet()` | `2319–2347` | 29L |
| `sync_adguard_ipv6()` | `2349–2381` | 33L |
| `firewall_wan_zone_section()` | `2383–2387` | 5L |
| `firewall_zone_has_network()` | `2389–2392` | 4L |
| `lan_bridge_section()` | `2394–2396` | 3L |
| `lan_bridge_port_count()` | `2398–2402` | 5L |
| `find_switch_vlan()` | `2404–2416` | 13L |
| `swconfig_remove_port_from_vlan()` | `2418–2431` | 14L |
| `swconfig_add_port_to_vlan()` | `2433–2454` | 22L |
| `ark_board_switch_role_ports()` | `2457–2473` | 17L |
| `ark_board_switch_wan_port()` | `2475–2492` | 18L |
| `ark_board_switch_cpu_tag()` | `2494–2502` | 9L |
| `ark_board_uses_legacy_ifname()` | `2504–2514` | 11L |
| `swconfig_port_num()` | `2516–2531` | 16L |
| `bridge_has_port()` | `2533–2536` | 4L |
| `add_lan_port()` | `2538–2550` | 13L |
| `remove_lan_port()` | `2552–2562` | 11L |
| `configure_uhttpd_listeners()` | `2564–2573` | 10L |
| `zerotier_ram_compress()` | `2575–2615` | 41L |
| `get_primary_wan_dev()` | `2617–2643` | 27L |
| `get_active_online_wan_dev()` | `2645–2682` | 38L |
| `get_internet_led_sysfs()` | `2684–2715` | 32L |
| `get_internet_alert_led_sysfs()` | `2717–2729` | 13L |
| `ark_has_qsdk_ecm()` | `2734–2742` | 9L |
| `ark_has_doh_proxy()` | `2745–2752` | 8L |
| `ark_sync_doh_proxy()` | `2758–2909` | 152L |
| `ark_is_readonly_action()` | `2915–2950` | 36L |
| `ark_try_lock_dir()` | `2953–2976` | 24L |
| `ark_mutation_lock_is_held()` | `2978–2984` | 7L |
| `ark_acquire_mutation_lock()` | `2986–3007` | 22L |
| `ark_release_mutation_lock()` | `3009–3022` | 14L |
| `ark_invalidate_caches()` | `3024–3034` | 11L |
| `ark_restore_mutation_trap()` | `3036–3043` | 8L |
| `ark_usteer_expected_ssids()` | `3048–3077` | 30L |
| `ark_usteer_configured_ssids()` | `3080–3115` | 36L |
| `ark_usteer_ssids_dirty()` | `3118–3124` | 7L |
| `ark_usteer_sync_ssids()` | `3127–3148` | 22L |
| `ark_usteer_apply_defaults()` | `3151–3177` | 27L |
| `ark_tls_ca_available()` | `3180–3194` | 15L |
| `ark_tls_verify_ready()` | `3197–3206` | 10L |
| `ark_wget_tls()` | `3209–3215` | 7L |
| `ark_curl_tls()` | `3217–3223` | 7L |
| `ark_uclient_tls()` | `3225–3231` | 7L |
| `ark_http_download_strict()` | `3234–3255` | 22L |
| `ark_jool_instance_running()` | `3258–3263` | 6L |

### `root/usr/lib/ark/dhcp_fingerprint.sh` (48 linhas, 0 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |

### `root/usr/lib/ark/hw-tune.sh` (698 linhas, 15 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_hw_cpu_bitmask()` | `10–24` | 15L |
| `ark_hw_cpus_to_bitmask()` | `27–55` | 29L |
| `_ark_hw_uci()` | `61–67` | 7L |
| `ark_hw_resolve_phys_dev()` | `70–102` | 33L |
| `ark_hw_list_wan_phys_devs()` | `105–124` | 20L |
| `ark_hw_netdev_rx_queues()` | `127–135` | 9L |
| `ark_hw_detect_wifi_active()` | `138–169` | 32L |
| `ark_hw_latency_profile()` | `176–205` | 30L |
| `ark_hw_apply_budget_usecs()` | `209–227` | 19L |
| `ark_hw_apply_iface_latency()` | `230–272` | 43L |
| `ark_hw_compute_rps_target()` | `279–411` | 133L |
| `ark_hw_tune_irq_affinity()` | `414–521` | 108L |
| `ark_hw_max_thermal_mc()` | `528–538` | 11L |
| `ark_hw_tune_cpufreq()` | `541–610` | 70L |
| `ark_hw_collect_offload_telemetry()` | `622–698` | 77L |

### `root/usr/lib/ark/led.sh` (777 linhas, 12 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `_get_led_sys()` | `25–31` | 7L |
| `_get_net_sys()` | `33–39` | 7L |
| `ark_led_normalize_hex()` | `42–89` | 48L |
| `ark_led_detect_topology()` | `92–142` | 51L |
| `ark_led_calibrate_curves()` | `145–183` | 39L |
| `ark_led_set_speed()` | `186–207` | 22L |
| `ark_led_start_rainbow()` | `210–231` | 22L |
| `ark_led_stop_rainbow()` | `233–240` | 8L |
| `ark_led_set_effect()` | `243–435` | 193L |
| `ark_led_apply_preset()` | `438–585` | 148L |
| `ark_led_sync_runtime()` | `588–632` | 45L |
| `ark_led_update_wan_status()` | `635–777` | 143L |

### `root/usr/lib/ark/logging.sh` (41 linhas, 5 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_mask_sensitive()` | `8–13` | 6L |
| `ark_log()` | `15–19` | 5L |
| `ark_warn()` | `21–26` | 6L |
| `ark_err()` | `28–33` | 6L |
| `ark_audit()` | `35–41` | 7L |

### `root/usr/lib/ark/modules/adblock.sh` (1631 linhas, 15 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `adblock_status_json()` | `13–223` | 211L |
| `adblock_apply_rules()` | `225–407` | 183L |
| `adblock_apply_blacklist()` | `409–411` | 3L |
| `adblock_sync_blacklist()` | `413–579` | 167L |
| `adblock_sync_whitelist()` | `581–771` | 191L |
| `sync_dns_intercept()` | `773–819` | 47L |
| `adblock_configure()` | `821–1009` | 189L |
| `adblock_mark_enabled()` | `1011–1017` | 7L |
| `adblock_enable()` | `1019–1258` | 240L |
| `adblock_restore_dns()` | `1260–1365` | 106L |
| `adblock_disable()` | `1367–1432` | 66L |
| `adblock_uninstall()` | `1434–1488` | 55L |
| `adblock_toggle()` | `1490–1501` | 12L |
| `adblock_sso_login()` | `1503–1572` | 70L |
| `handle_adblock()` | `1574–1627` | 54L |

### `root/usr/lib/ark/modules/devices.sh` (1983 linhas, 20 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `flush_stale_leases()` | `18–91` | 74L |
| `device_get_stations()` | `93–123` | 31L |
| `device_get_stations_raw()` | `125–499` | 375L |
| `speedtest_history_file()` | `501–505` | 5L |
| `speedtest_history_append()` | `507–521` | 15L |
| `speedtest_history_json()` | `523–554` | 32L |
| `speedtest_schedule_weak_cleanup()` | `556–569` | 14L |
| `speedtest_download_fallback_mbps()` | `571–662` | 92L |
| `speedtest_upload_fallback_mbps()` | `664–708` | 45L |
| `device_limits_json()` | `710–730` | 21L |
| `apply_device_bandwidth_limits()` | `732–912` | 181L |
| `device_apply_parental()` | `914–1181` | 268L |
| `can_install_speedtest_flash()` | `1183–1198` | 16L |
| `speedtest_storage_json()` | `1200–1215` | 16L |
| `prepare_speedtest()` | `1217–1268` | 52L |
| `satellite_sync_master_leases_if_needed()` | `1270–1308` | 39L |
| `get_device_fingerprints_raw()` | `1310–1351` | 42L |
| `get_device_fingerprints()` | `1353–1376` | 24L |
| `setup_dhcp_fingerprint_hook()` | `1378–1394` | 17L |
| `handle_devices()` | `1396–1983` | 588L |

### `root/usr/lib/ark/modules/doctor.sh` (3006 linhas, 6 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `_ark_dns_probe_local_port()` | `23–36` | 14L |
| `ark_doctor_audit()` | `38–2874` | 2837L |
| `doctor_get_status()` | `2876–2885` | 10L |
| `doctor_get_log()` | `2887–2896` | 10L |
| `doctor_release_lock()` | `2898–2903` | 6L |
| `handle_doctor()` | `2905–3001` | 97L |

### `root/usr/lib/ark/modules/ezsetup.sh` (2707 linhas, 43 funções)

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
| `ark_feature_toggle_internal()` | `257–424` | 168L |
| `ark_feature_remove_internal()` | `426–477` | 52L |
| `ark_enforce_saved_feature_policies()` | `479–490` | 12L |
| `version_gt()` | `492–502` | 11L |
| `ark_package_manager()` | `504–509` | 6L |
| `ark_cpu_arch()` | `511–515` | 5L |
| `ark_can_run_aarch64()` | `517–522` | 6L |
| `ark_mem_total_kb()` | `524–528` | 5L |
| `ark_overlay_avail_kb()` | `530–534` | 5L |
| `ark_tmp_avail_kb()` | `536–540` | 5L |
| `ark_best_profile()` | `542–554` | 13L |
| `ark_actual_profile()` | `556–562` | 7L |
| `ark_installed_profile()` | `564–572` | 9L |
| `ark_update_asset_name()` | `574–584` | 11L |
| `ark_remove_opposite_profile()` | `586–615` | 30L |
| `ark_install_package_file()` | `617–684` | 68L |
| `ark_http_get()` | `686–708` | 23L |
| `ark_http_download()` | `710–726` | 17L |
| `ark_latest_release()` | `728–744` | 17L |
| `ark_latest_changelog()` | `746–758` | 13L |
| `ark_update_json()` | `760–808` | 49L |
| `ark_operation_profile()` | `810–810` | 1L |
| `apply_operation_profile()` | `812–888` | 77L |
| `ez_progress()` | `890–890` | 1L |
| `ez_json()` | `892–989` | 98L |
| `ez_apply_wifi_iface()` | `991–1001` | 11L |
| `ez_apply_guest_network()` | `1003–1049` | 47L |
| `ez_apply_guest_limit()` | `1051–1066` | 16L |
| `feature_json()` | `1068–1316` | 249L |
| `handle_ezsetup()` | `1318–2707` | 1390L |

### `root/usr/lib/ark/modules/network.sh` (2106 linhas, 6 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `apply_wan_proto()` | `18–107` | 90L |
| `apply_wan_modem_access()` | `109–154` | 46L |
| `bind_uhttpd_to_lan_ip()` | `156–159` | 4L |
| `mwan3_toggle()` | `161–197` | 37L |
| `mwan_status_fast()` | `199–271` | 73L |
| `handle_network()` | `273–2106` | 1834L |

### `root/usr/lib/ark/modules/network_ipv6_mwan.sh` (2315 linhas, 31 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `autowan_can_convert()` | `15–49` | 35L |
| `get_physical_wan_dev()` | `51–86` | 36L |
| `autowan_can_convert_wan_json()` | `88–144` | 57L |
| `system_network_mode_get()` | `146–200` | 55L |
| `system_network_mode_set()` | `202–447` | 246L |
| `restore_ipv6_firewall_rules()` | `449–497` | 49L |
| `ark_ensure_ipv6_dhcpv6_client()` | `499–520` | 22L |
| `enable_ipv6_dual_stack()` | `522–617` | 96L |
| `ark_has_per_device_ipv6_only()` | `619–630` | 12L |
| `ark_sync_ipv6_doh_fastfail()` | `632–657` | 26L |
| `ark_sync_nat64_jool()` | `659–710` | 52L |
| `ark_sync_lan_ipv6_dns()` | `712–835` | 124L |
| `ark_release_per_device_ipv6_only_dhcp()` | `837–870` | 34L |
| `clean_ipv6_selective_firewall()` | `872–908` | 37L |
| `sync_ipv6_selective_firewall()` | `910–1148` | 239L |
| `ark_has_multi_wan()` | `1150–1164` | 15L |
| `sync_nptv6_firewall()` | `1166–1176` | 11L |
| `clean_nptv6_firewall()` | `1178–1184` | 7L |
| `save_pre_clat_state()` | `1186–1206` | 21L |
| `ark_register_cloudflare_warp_v6()` | `1208–1264` | 57L |
| `sync_ipv6_clat_tunnel()` | `1266–1394` | 129L |
| `clean_ipv6_clat_tunnel()` | `1396–1472` | 77L |
| `set_ipv6_mode()` | `1474–1612` | 139L |
| `set_ipv6_relay()` | `1614–1655` | 42L |
| `toggle_ipv6_device()` | `1657–1679` | 23L |
| `get_ipv6_status()` | `1681–1758` | 78L |
| `disable_ipv6_full()` | `1762–1824` | 63L |
| `mwan3_reorder_rules()` | `1826–1872` | 47L |
| `get_configured_ping_track_ips()` | `1874–1912` | 39L |
| `ensure_mwan3_ark_config()` | `1914–2282` | 369L |
| `mwan3_sync_lifecycle()` | `2284–2314` | 31L |

### `root/usr/lib/ark/modules/speedify.sh` (1124 linhas, 54 funções)

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
| `speedify_prepare_wans()` | `462–518` | 57L |
| `speedify_status_json()` | `520–554` | 35L |
| `speedify_cli_action()` | `556–569` | 14L |
| `speedify_wait_tunnel()` | `571–579` | 9L |
| `speedify_route_ok()` | `581–587` | 7L |
| `speedify_wait_route()` | `589–597` | 9L |
| `mwan3_service_running()` | `599–601` | 3L |
| `speedify_pause_mwan3()` | `603–612` | 10L |
| `speedify_restore_mwan3()` | `614–625` | 12L |
| `speedify_configure_downstream_subnets()` | `627–641` | 15L |
| `speedify_safe_connect()` | `643–665` | 23L |
| `speedify_watchdog()` | `667–684` | 18L |
| `speedify_safe_disconnect()` | `686–706` | 21L |
| `speedify_stop_runtime()` | `708–737` | 30L |
| `speedify_start_ui_helper()` | `739–743` | 5L |
| `speedify_adapter_valid()` | `745–745` | 1L |
| `speedify_mask_email()` | `747–758` | 12L |
| `speedify_pairing_json()` | `760–769` | 10L |
| `speedify_user_json()` | `771–784` | 14L |
| `speedify_autostart_set()` | `786–798` | 13L |
| `speedify_recover_runtime()` | `800–828` | 29L |
| `speedify_power_set()` | `830–872` | 43L |
| `speedify_autostart_run()` | `874–880` | 7L |
| `speedify_cli_path()` | `882–889` | 8L |
| `speedify_runtime_running()` | `891–891` | 1L |
| `speedify_supported()` | `893–904` | 12L |
| `speedify_external_target()` | `906–916` | 11L |
| `speedify_storage_json()` | `918–939` | 22L |
| `speedify_state_value()` | `941–949` | 9L |
| `speedify_uninstall()` | `951–1007` | 57L |
| `handle_speedify()` | `1011–1120` | 110L |

### `root/usr/lib/ark/modules/sqm.sh` (1821 linhas, 33 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_has_cake_mq()` | `14–23` | 10L |
| `ark_has_auto_dscp()` | `25–33` | 9L |
| `ark_has_ctinfo()` | `35–39` | 5L |
| `ark_has_l4s_dscp()` | `41–49` | 9L |
| `ark_apply_ingress_voice_tin_filters()` | `51–71` | 21L |
| `ark_sync_sqm_gaming_dns()` | `73–123` | 51L |
| `ark_promote_cake_mq()` | `125–221` | 97L |
| `ark_is_gaming_ports_enabled()` | `223–235` | 13L |
| `ark_sync_gaming_ports_and_bql()` | `237–389` | 153L |
| `ark_get_sqm_engine()` | `428–440` | 13L |
| `ark_apply_sqm_engine_to_section()` | `442–455` | 14L |
| `get_system_hardware_sqm_audit()` | `457–537` | 81L |
| `sqm_apply_upload_only()` | `539–570` | 32L |
| `ensure_qos_equipe()` | `572–582` | 11L |
| `ark_sqm_ack_filter_opt()` | `584–594` | 11L |
| `ark_sqm_ingress_rtt_opt()` | `596–615` | 20L |
| `ark_sqm_ingress_mode_opt()` | `617–636` | 20L |
| `ensure_sqm_section()` | `638–813` | 176L |
| `sqm_section_for_network()` | `815–817` | 3L |
| `apply_guest_tc_limit()` | `819–845` | 27L |
| `ark_sqm_save_offload_state()` | `847–885` | 39L |
| `sync_sqm_flow_offload()` | `887–957` | 71L |
| `ark_sync_lan_selective_offload()` | `959–982` | 24L |
| `ark_sqm_autorate_toggle()` | `984–1002` | 19L |
| `ark_sqm_autorate_step()` | `1004–1170` | 167L |
| `ark_sqm_autorate_status()` | `1172–1187` | 16L |
| `ark_sqm_verify_device()` | `1189–1212` | 24L |
| `ark_sqm_verify_queues()` | `1214–1238` | 25L |
| `ark_sqm_sync_memory_limits()` | `1240–1264` | 25L |
| `get_sqm_resource_plan()` | `1266–1278` | 13L |
| `ark_sqm_restart_checked()` | `1280–1285` | 6L |
| `ark_sqm_select_engine()` | `1287–1334` | 48L |
| `handle_sqm()` | `1336–1821` | 486L |

### `root/usr/lib/ark/modules/starlink.sh` (426 linhas, 8 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `starlink_cgnat_ipv4()` | `14–16` | 3L |
| `starlink_active_wan_get()` | `18–35` | 18L |
| `starlink_active_wan_set()` | `37–60` | 24L |
| `starlink_wan_port()` | `62–75` | 14L |
| `starlink_wan_table()` | `77–90` | 14L |
| `starlink_setup_policy_routing()` | `92–169` | 78L |
| `starlink_public_list_json()` | `171–204` | 34L |
| `handle_starlink()` | `206–426` | 221L |

### `root/usr/lib/ark/modules/storage_wol.sh` (874 linhas, 9 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `is_safe_usb_partition()` | `12–52` | 41L |
| `ksmbd_ensure_config()` | `54–77` | 24L |
| `ksmbd_get_user_perm()` | `79–90` | 12L |
| `ksmbd_set_user_perm()` | `92–105` | 14L |
| `ksmbd_sync_shares()` | `107–166` | 60L |
| `ksmbd_sync_firewall()` | `168–192` | 25L |
| `ksmbd_status_json()` | `194–321` | 128L |
| `wol_status_json()` | `326–424` | 99L |
| `handle_storage_wol()` | `429–874` | 446L |

### `root/usr/lib/ark/modules/system.sh` (1817 linhas, 28 funções)

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
| `dns_turbo_save()` | `589–730` | 142L |
| `dns_turbo_doh_toggle()` | `732–777` | 46L |
| `_ark_dns_now_ms()` | `779–788` | 10L |
| `_ark_dns_probe_single()` | `790–831` | 42L |
| `dns_turbo_benchmark_json()` | `833–925` | 93L |
| `network_capacity_status_json()` | `927–944` | 18L |
| `network_capacity_save()` | `946–1010` | 65L |
| `system_perf_save()` | `1012–1192` | 181L |
| `system_processes_telemetry()` | `1196–1260` | 65L |
| `system_memory_purge()` | `1262–1269` | 8L |
| `system_storage_purge()` | `1271–1286` | 16L |
| `zram_status_json()` | `1289–1336` | 48L |
| `zram_toggle()` | `1338–1382` | 45L |
| `get_ntp_status()` | `1388–1421` | 34L |
| `ntp_sync_browser()` | `1425–1488` | 64L |
| `ntp_configure_smart()` | `1490–1527` | 38L |
| `ntp_intercept_toggle()` | `1529–1544` | 16L |
| `time_save_clock()` | `1546–1558` | 13L |
| `handle_system()` | `1560–1813` | 254L |

### `root/usr/lib/ark/modules/system_hardware_leds.sh` (2068 linhas, 12 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `cleanup_orphan_leds()` | `14–43` | 30L |
| `update_wan_led()` | `45–179` | 135L |
| `get_led_hardware_info()` | `181–485` | 305L |
| `update_led_alert()` | `487–490` | 4L |
| `apply_aw21018_leds()` | `492–542` | 51L |
| `set_led_rgb_color()` | `544–697` | 154L |
| `set_led_preset()` | `699–954` | 256L |
| `get_led_status()` | `956–969` | 14L |
| `detect_hardware_silicon_profile()` | `971–1115` | 145L |
| `system_hardware_auto_tune()` | `1117–1536` | 420L |
| `get_system_hardware_info_raw()` | `1538–2029` | 492L |
| `get_system_hardware_info()` | `2031–2067` | 37L |

### `root/usr/lib/ark/modules/vpn.sh` (1646 linhas, 38 funções)

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
| `zerotier_enable()` | `143–176` | 34L |
| `zerotier_disable()` | `178–194` | 17L |
| `valid_zerotier_network_id()` | `196–196` | 1L |
| `zerotier_join_network()` | `198–235` | 38L |
| `zerotier_leave_network()` | `237–253` | 17L |
| `zerotier_status_json()` | `255–311` | 57L |
| `zerotier_autostart_toggle()` | `313–335` | 23L |
| `wireguard_status_json()` | `337–431` | 95L |
| `wireguard_firewall_setup()` | `433–596` | 164L |
| `wireguard_client_detect_admin_ports()` | `598–616` | 19L |
| `wireguard_client_firewall_setup()` | `618–747` | 130L |
| `wireguard_firewall_cleanup()` | `749–848` | 100L |
| `wireguard_server_setup()` | `850–885` | 36L |
| `wireguard_enable()` | `887–901` | 15L |
| `wireguard_disable()` | `903–913` | 11L |
| `wireguard_autostart_toggle()` | `915–930` | 16L |
| `wireguard_peer_add()` | `932–1078` | 147L |
| `wireguard_peer_delete()` | `1080–1109` | 30L |
| `wireguard_peer_qr()` | `1111–1156` | 46L |
| `b64_decode_str()` | `1158–1188` | 31L |
| `b64_encode_file()` | `1190–1205` | 16L |
| `wireguard_client_validate_ranges()` | `1207–1220` | 14L |
| `wireguard_client_access_set()` | `1222–1248` | 27L |
| `wireguard_client_import()` | `1250–1432` | 183L |
| `wireguard_client_conf_get_json()` | `1434–1440` | 7L |
| `wireguard_client_status_json()` | `1442–1508` | 67L |
| `wireguard_client_toggle()` | `1510–1537` | 28L |
| `wireguard_client_delete()` | `1539–1560` | 22L |
| `handle_vpn()` | `1564–1642` | 79L |

### `root/usr/lib/ark/modules/wifi.sh` (2518 linhas, 16 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `wifi_radio_by_band()` | `15–70` | 56L |
| `wifi_radio_2g()` | `72–72` | 1L |
| `wifi_radio_5g()` | `74–74` | 1L |
| `wifi_radio_6g()` | `76–76` | 1L |
| `wifi_known_radios()` | `78–90` | 13L |
| `wifi_auto_enable_mesh_optimizations()` | `92–115` | 24L |
| `wifi_cleanup_mesh_interfaces()` | `117–147` | 31L |
| `wifi_get_ap_sections()` | `149–190` | 42L |
| `wifi_enhancer_status()` | `192–275` | 84L |
| `wifi_enhancer_update_status()` | `279–291` | 13L |
| `wifi_qca_apply_roaming_tuning()` | `295–331` | 37L |
| `wifi_enhancer_cleanup_lock()` | `333–340` | 8L |
| `wifi_enhancer_run_upgrade()` | `342–469` | 128L |
| `wifi_mlo_status()` | `471–498` | 28L |
| `wifi_mlo_toggle()` | `500–547` | 48L |
| `handle_wifi()` | `549–2518` | 1970L |

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

### `root/usr/lib/ark/validation.sh` (171 linhas, 19 funções)

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
| `valid_plain()` | `80–88` | 9L |
| `valid_cidr4_or_ipv4()` | `90–103` | 14L |
| `valid_cidr6_or_ipv6()` | `105–118` | 14L |
| `valid_wifi_password()` | `120–124` | 5L |
| `valid_ssid()` | `126–130` | 5L |
| `valid_uint_range()` | `132–135` | 4L |
| `valid_sqm_rate()` | `137–139` | 3L |
| `valid_net_device()` | `141–171` | 31L |

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

### `src/modules/devices.js` (2010 linhas, 10 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.renderDevices()` | `3–904` | 902L |
| `this.sortDevices()` | `905–920` | 16L |
| `this.setDeviceSort()` | `921–939` | 19L |
| `this.toggleDeviceSortDirection()` | `940–952` | 13L |
| `this.quickReserveSecondary()` | `953–968` | 16L |
| `this.quickReserveIot()` | `969–1004` | 36L |
| `this.updateSecondaryBanner()` | `1005–1066` | 62L |
| `this.flushStaleLeases()` | `1067–1099` | 33L |
| `this.togglePassword()` | `1100–1100` | 1L |
| `this.configureDevice()` | `1101–2010` | 910L |

### `src/modules/doctor_perf.js` (1720 linhas, 8 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.showHighRamZramConfirmModal()` | `3–54` | 52L |
| `this.showLowEndMipsZramConfirmModal()` | `55–89` | 35L |
| `this.openDnsTurboModal()` | `90–528` | 439L |
| `this.openNetworkCapacityModal()` | `529–739` | 211L |
| `this.systemPerfCard()` | `740–1472` | 733L |
| `this.showDoctorModal()` | `1473–1667` | 195L |
| `this.runDoctorAudit()` | `1668–1692` | 25L |
| `this.runDoctorFix()` | `1693–1720` | 28L |

### `src/modules/ezsetup.js` (870 linhas, 4 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.loadEzSetup()` | `3–5` | 3L |
| `this.ezField()` | `6–8` | 3L |
| `this.showEzSetup()` | `9–820` | 812L |
| `this.showArkCleanup()` | `821–870` | 50L |

### `src/modules/lifecycle.js` (1043 linhas, 21 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.fetchCapabilities()` | `4–93` | 90L |
| `this.feature()` | `94–99` | 6L |
| `this.themeColor()` | `100–104` | 5L |
| `this.applyAppearance()` | `105–119` | 15L |
| `this.triggerImmediateRefresh()` | `120–144` | 25L |
| `this.switchProfile()` | `145–187` | 43L |
| `this.applyBrand()` | `188–192` | 5L |
| `this.load()` | `193–203` | 11L |
| `this.fetchData()` | `204–380` | 177L |
| `this.fetchDataTimed()` | `381–391` | 11L |
| `this.calculateRates()` | `392–435` | 44L |
| `this.deviceRates()` | `436–516` | 81L |
| `this.devicesExpanded()` | `517–520` | 4L |
| `this.isEconomicHardware()` | `521–534` | 14L |
| `this.adaptiveRefreshSeconds()` | `535–544` | 10L |
| `this.updateRefreshSummary()` | `545–556` | 12L |
| `this.scheduleAdaptiveRefresh()` | `557–585` | 29L |
| `this.update()` | `586–905` | 320L |
| `this.updateClockAndDate()` | `906–933` | 28L |
| `this.startClockTicker()` | `934–941` | 8L |
| `this.updateDoctorStatus()` | `942–1043` | 102L |

### `src/modules/network.js` (2368 linhas, 15 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.updateWan()` | `3–73` | 71L |
| `this.updateLan()` | `74–81` | 8L |
| `this.updateMwanMode()` | `82–203` | 122L |
| `this.updateHistory()` | `204–231` | 28L |
| `this.setMwanMode()` | `232–254` | 23L |
| `this.toggleMwan3()` | `255–323` | 69L |
| `this.toggleIgmp()` | `324–372` | 49L |
| `this.toggleSqm()` | `373–493` | 121L |
| `this.selectSqmEngine()` | `494–561` | 68L |
| `this.toggleWaveformAplus()` | `562–595` | 34L |
| `this.toggleGamingPorts()` | `596–631` | 36L |
| `this.editSqmLimits()` | `632–1333` | 702L |
| `this.editWan()` | `1334–1888` | 555L |
| `this.showPppoeLogsModal()` | `1889–2052` | 164L |
| `this.showLatencyTargetModal()` | `2053–2368` | 316L |

### `src/modules/network_modals.js` (1612 linhas, 9 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.showWanOptimizationsModal()` | `3–594` | 592L |
| `this.editLan()` | `595–850` | 256L |
| `this.disableIpv6Full()` | `851–872` | 22L |
| `this.showIpv6Modal()` | `873–1158` | 286L |
| `this.showAddMwanRuleModal()` | `1159–1342` | 184L |
| `this.deleteMwanRule()` | `1343–1372` | 30L |
| `this.toggleMwanRule()` | `1373–1391` | 19L |
| `this.toggleMwanTorrentPreset()` | `1392–1417` | 26L |
| `this.showMwanTorrentModal()` | `1418–1612` | 195L |

### `src/modules/render.js` (3533 linhas, 16 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.render()` | `3–2165` | 2163L |
| `this.renderMwanRulesSection()` | `2166–2333` | 168L |
| `this.renderV2DoctorStrip()` | `2334–2364` | 31L |
| `this.renderV2QuickStatusStrip()` | `2365–2393` | 29L |
| `this.renderV2SwitchPortsCard()` | `2394–2412` | 19L |
| `this.renderV2CategoryTabs()` | `2413–2449` | 37L |
| `this.toggleV2MobileSidebar()` | `2450–2458` | 9L |
| `this.switchV2Panel()` | `2459–2551` | 93L |
| `this.renderV2CockpitStatusOverview()` | `2552–2623` | 72L |
| `this.setupV2CockpitLayout()` | `2624–2911` | 288L |
| `this.renderPluginLifecycleBar()` | `2912–2993` | 82L |
| `this.applyFeatureVisibilityAndLifecycle()` | `2994–3113` | 120L |
| `this.renderV2LuciDrawer()` | `3114–3231` | 118L |
| `this.toggleV2LuciDrawer()` | `3232–3248` | 17L |
| `this.filterV2LuciDrawer()` | `3249–3260` | 12L |
| `this.updateV2CockpitStatus()` | `3261–3533` | 273L |

### `src/modules/speedify.js` (566 linhas, 14 métodos)

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
| `this.speedifyCard()` | `263–566` | 304L |

### `src/modules/speedtest.js` (447 linhas, 11 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.openFastCom()` | `3–18` | 16L |
| `this.promptSelectWanForSpeedtest()` | `19–87` | 69L |
| `this.showEmbedSpeedtest()` | `88–389` | 302L |
| `this.runSpeedtest()` | `390–397` | 8L |
| `this.renderSpeedtestProgress()` | `398–406` | 9L |
| `this.startSpeedtest()` | `407–410` | 4L |
| `this.startConnectedSpeedtests()` | `411–423` | 13L |
| `this.pollSpeedtest()` | `424–432` | 9L |
| `this.loadSpeedtestResult()` | `433–435` | 3L |
| `this.renderSpeedtestResult()` | `436–443` | 8L |
| `this.applySpeedtestSuggestion()` | `444–447` | 4L |

### `src/modules/starlink.js` (787 linhas, 14 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.starlinkCard()` | `3–118` | 116L |
| `this.activateStarlinkPanel()` | `119–121` | 3L |
| `this.toggleStarlinkPublic()` | `122–134` | 13L |
| `this.toggleStarlinkAlwaysShow()` | `135–171` | 37L |
| `this.saveStarlinkTelemetrySettings()` | `172–210` | 39L |
| `this.triggerStarlinkTestEmail()` | `211–232` | 22L |
| `this.pollStarlinkTestEmail()` | `233–261` | 29L |
| `this.flushStarlinkTelemetryRam()` | `262–272` | 11L |
| `this.updateStarlinkTelemetryStatusBadge()` | `273–296` | 24L |
| `this.renderStarlinkTelemetrySection()` | `297–755` | 459L |
| `this.stopStarlinkAlignment()` | `756–758` | 3L |
| `this.startStarlinkAlignment()` | `759–761` | 3L |
| `this.finishStarlinkAndNext()` | `762–764` | 3L |
| `this.readStarlinkTelemetry()` | `765–787` | 23L |

### `src/modules/storage_wol.js` (1209 linhas, 9 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.ksmbdCard()` | `8–112` | 105L |
| `this.refreshKsmbdCardSummary()` | `113–175` | 63L |
| `this.openKsmbdFormatConfirmModal()` | `176–255` | 80L |
| `this.openKsmbdWanWarningModal()` | `256–286` | 31L |
| `this.openKsmbdModal()` | `287–822` | 536L |
| `this.wolCard()` | `823–908` | 86L |
| `this.refreshWolCardSummary()` | `909–967` | 59L |
| `this.triggerWolWake()` | `968–990` | 23L |
| `this.openWolModal()` | `991–1209` | 219L |

### `src/modules/system.js` (3558 linhas, 52 métodos)

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
| `this.showNetworkModeModal()` | `2134–2471` | 338L |
| `this.showNetworkModeConfirmation()` | `2472–2586` | 115L |
| `this.showHardwareModal()` | `2587–2793` | 207L |
| `this.showFeatureCenter()` | `2794–3176` | 383L |
| `this.refreshFeatureCenterRows()` | `3177–3201` | 25L |
| `this.isDevMode()` | `3202–3207` | 6L |
| `this.isShowUninstalledMenus()` | `3208–3213` | 6L |
| `this.toggleDevMode()` | `3214–3249` | 36L |
| `this.toggleShowUninstalledMenus()` | `3250–3281` | 32L |
| `this.confirmFeatureChange()` | `3282–3306` | 25L |
| `this.refreshChangedFeatureCard()` | `3307–3321` | 15L |
| `this.runFeatureMutation()` | `3322–3338` | 17L |
| `this.toggleFeatureState()` | `3339–3369` | 31L |
| `this.removeFeature()` | `3370–3398` | 29L |
| `this.showNtpModal()` | `3399–3558` | 160L |

### `src/modules/vpn.js` (1140 linhas, 11 métodos)

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
| `this.showWireGuardClientModal()` | `449–987` | 539L |
| `this.wireguardCard()` | `988–1140` | 153L |

### `src/modules/wifi.js` (3318 linhas, 29 métodos)

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
| `this.showMeshModal()` | `2107–2234` | 128L |
| `this.updateWifiEnhancerUI()` | `2235–2275` | 41L |
| `this.showWifiEnhancerModal()` | `2276–2455` | 180L |
| `this.showSatelliteWizardModal()` | `2456–3318` | 863L |

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

