# ARK Router — Mapa Determinístico de Código e Execução (`CODE_MAP.md`)

> **Guia Rápido para IAs e Desenvolvedores (Anti-Amnésia & Token-Efficient)**:
> - **NUNCA** leia arquivos grandes (`common.sh`, `render.js`, `system.js`, `wifi.js`, `doctor.sh`) inteiros.
> - Use as tabelas abaixo para localizar o **arquivo e intervalo exato de linhas (`StartLine`–`EndLine`)** antes de chamar `view_file`.
> - Este documento é gerado deterministicamente por `python3 scripts/generate_code_map.py`.

---

## 1. Arquitetura de Execução, Fast-Path e Locks (`/usr/sbin/equipe-dashboard-control`)

| Camada | Mecanismo | Arquivos / Caches | Comportamento Exato |
| :--- | :--- | :--- | :--- |
| **0. Coalescência Hotplug** | Non-blocking Early Exit | `ark-doctor.lockdir/pid`, `ark_mutation.lock/pid` | Chamadas `ark-doctor --auto` abortam em `0ms` no topo de `equipe-dashboard-control` se já houver auditoria ou mutação viva (`kill -0`), evitando fila serial de hotplugs. |
| **1. Fast-Path (Sem Source)** | Resposta direta em RAM | `ark-fp-cache` (120s), `ark-stations-cache` (120s), `ark-perf-cache` (120s), `ark-hw-cache` (120s), `ark-mwan-cache` (3s), `ark-doctor-last.json` | Responde `device-fingerprints`, `device-stations`, `wifi-stations`, `system-perf-status`, `system-hardware-info`, `mwan-status-fast` e `doctor-status` **antes** de carregar `common.sh` (~10.000 linhas poupadas). |
| **2. Lock Global de Mutação** | `ark_acquire_mutation_lock` | `/tmp/ark_mutation.lock` (`pid`, `ts`, `cmd`) | Adquirido apenas quando `ark_is_readonly_action` retorna `1`. Leituras (`*-status`, `*-info`, etc.) e LEDs (`update-wan-led`, `update-led-alert`) passam livres sem bloqueio. |
| **3. Job Serializado** | `ark_serialized_job` | `root/usr/lib/ark/serialized-job.sh` | Garante execução única por recurso com reagendamento `.pending` automático se novo evento chegar durante a execução (código `75` para contendores). |

---

## 2. Matriz Ponta-a-Ponta: Frontend (`src/modules/*.js`) $\rightarrow$ RPC $\rightarrow$ Backend (`modules/*.sh`)

| Comando RPC (`equipe-dashboard-control`) | Tipo / Lock | Handler Backend (`arquivo:linha`) | Chamadores Frontend (`arquivo:linha [método]`) |
| :--- | :--- | :--- | :--- |
| `adblock-blacklist-sync` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1528` (`handle_adblock`) | `src/modules/adblock.js:625` (`openAdblockSetupModal`) |
| `adblock-sso-login` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1508` (`handle_adblock`) | `src/modules/adblock.js:186` (`openAdguardWithSSO`)<br>`src/modules/adblock.js:219` (`openAdguardSSOModal`) |
| `adblock-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1548` (`handle_adblock`) | `src/modules/adblock.js:32` (`adblockCard`) |
| `adblock-uninstall` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1545` (`handle_adblock`) | `src/modules/adblock.js:291` (`openAdguardUninstallModal`) |
| `adblock-whitelist-sync` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/adblock.sh:1531` (`handle_adblock`) | `src/modules/adblock.js:682` (`openAdblockSetupModal`) |
| `appearance` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2171` (`handle_ezsetup`) | `src/modules/system.js:72` (`setAppearance`) |
| `asu-check-toggle` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1518` (`handle_system`) | `src/modules/system.js:615` (`selfUpdatePanel`) |
| `autowan-can-convert-wan` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1135` (`handle_network`) | `src/modules/render.js:610` (`render`) |
| `autowan-policy-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1096` (`handle_network`) | `src/modules/network.js:234` (`setMwanMode`)<br>`src/modules/network.js:236` (`setMwanMode`)<br>`src/modules/render.js:762` (`render`) |
| `autowan-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:982` (`handle_network`) | `src/modules/render.js:676` (`render`)<br>`src/modules/render.js:724` (`render`) |
| `autowan-wan-to-lan` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1138` (`handle_network`) | `src/modules/render.js:348` (`render`)<br>`src/modules/render.js:593` (`render`)<br>`src/modules/render.js:645` (`render`) |
| `channels` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:872` (`handle_wifi`) | `src/modules/wifi.js:1191` (`showManualChannelsModal`) |
| `cleanup-apply` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2514` (`handle_ezsetup`) | `src/modules/ezsetup.js:845` (`showArkCleanup`) |
| `cleanup-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2511` (`handle_ezsetup`) | `src/modules/ezsetup.js:822` (`showArkCleanup`) |
| `country` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1307` (`handle_ezsetup`) | `src/modules/wifi.js:1724` (`changeCountry`) |
| `device-fingerprints` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1069` (`handle_devices`) | `src/modules/lifecycle.js:227` (`fetchData`) |
| `device-reserve-quick` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1243` (`handle_devices`) | `src/modules/devices.js:830` (`quickReserveIot`) |
| `device-reserve-secondary` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1206` (`handle_devices`) | `src/modules/devices.js:807` (`quickReserveSecondary`) |
| `device-stations` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1566` (`handle_devices`) | `src/modules/lifecycle.js:228` (`fetchData`) |
| `device-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1275` (`handle_devices`) | `src/modules/devices.js:950` (`configureDevice`) |
| `dmz-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1385` (`handle_system`) | `src/modules/system.js:1624` (`dmzCard`)<br>`src/modules/system.js:1748` (`updateDmzStatus`)<br>`src/modules/system.js:1990` (`showDmzModal`)<br>`src/modules/system.js:2020` (`showDmzModal`) |
| `dmz-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1382` (`handle_system`) | `src/modules/system.js:1693` (`updateDmzStatus`)<br>`src/modules/system.js:1783` (`showDmzModal`) |
| `dns-turbo-doh` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1446` (`handle_system`) | `src/modules/doctor_perf.js:344` (`openDnsTurboModal`) |
| `dns-turbo-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1438` (`handle_system`) | `src/modules/doctor_perf.js:93` (`openDnsTurboModal`) |
| `doctor-fix` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/doctor.sh:2360` (`handle_doctor`) | `src/modules/doctor_perf.js:1648` (`runDoctorFix`) |
| `doctor-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/doctor.sh:2352` (`handle_doctor`) | `src/modules/doctor_perf.js:1553` (`showDoctorModal`) |
| `doctor-run` | 🟢 Read-Only | `root/usr/lib/ark/modules/doctor.sh:2356` (`handle_doctor`) | `src/modules/doctor_perf.js:1621` (`runDoctorAudit`) |
| `doctor-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/doctor.sh:2348` (`handle_doctor`) | `src/modules/lifecycle.js:323` (`fetchData`) |
| `ez-setup-apply` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1385` (`handle_ezsetup`) | `src/modules/ezsetup.js:645` (`showEzSetup`) |
| `ez-setup-install-modules` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1609` (`handle_ezsetup`) | `src/modules/ezsetup.js:687` (`showEzSetup`) |
| `ez-setup-reset` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1285` (`handle_ezsetup`) | `src/modules/ezsetup.js:713` (`showEzSetup`) |
| `ez-setup-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1282` (`handle_ezsetup`) | `src/modules/ezsetup.js:4` (`loadEzSetup`) |
| `fast-targets` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1474` (`handle_system`) | `src/modules/speedtest.js:161` (`showEmbedSpeedtest`) |
| `feature-dev-mode` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2199` (`handle_ezsetup`) | `src/modules/system.js:3043` (`toggleDevMode`) |
| `feature-hide` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2184` (`handle_ezsetup`) | `src/modules/system.js:83` (`setFeatureHidden`) |
| `feature-install` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2232` (`handle_ezsetup`) | `src/modules/network.js:301` (`toggleMwan3`)<br>`src/modules/system.js:933` (`installFeature`) |
| `feature-install-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2404` (`handle_ezsetup`) | `src/modules/system.js:86` (`loadFeatureInstallLog`) |
| `feature-install-missing` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2408` (`handle_ezsetup`) | `src/modules/system.js:891` (`installMissingFeatures`) |
| `feature-install-missing-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2505` (`handle_ezsetup`) | `src/modules/system.js:869` (`loadMissingInstallLog`) |
| `feature-install-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:2387` (`handle_ezsetup`) | `src/modules/system.js:704` (`pollFeatureInstall`) |
| `feature-menu-policy` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2214` (`handle_ezsetup`) | `src/modules/system.js:3079` (`toggleShowUninstalledMenus`) |
| `feature-remove` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2196` (`handle_ezsetup`) | `src/modules/system.js:3180` (`removeFeature`) |
| `feature-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2193` (`handle_ezsetup`) | `src/modules/system.js:3113` (`toggleFeatureState`)<br>`src/modules/system.js:3142` (`toggleFeatureState`) |
| `features` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1668` (`handle_ezsetup`) | `src/modules/lifecycle.js:30` (`fetchCapabilities`)<br>`src/modules/lifecycle.js:46` (`fetchCapabilities`) |
| `flush-stale-leases` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1563` (`handle_devices`) | `src/modules/devices.js:922` (`flushStaleLeases`) |
| `https-redirect` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1501` (`handle_system`) | `src/modules/system.js:76` (`changeHttpsRedirect`) |
| `ipv6-disable-full` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1931` (`handle_network`) | `src/modules/network_modals.js:704` (`disableIpv6Full`) |
| `ipv6-mode-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1922` (`handle_network`) | `src/modules/network_modals.js:798` (`showIpv6Modal`) |
| `ipv6-relay-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1925` (`handle_network`) | `src/modules/network_modals.js:922` (`showIpv6Modal`) |
| `ipv6-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1919` (`handle_network`) | `src/modules/network_modals.js:724` (`showIpv6Modal`) |
| `irqbalance-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1022` (`handle_sqm`) | `src/modules/doctor_perf.js:964` (`systemPerfCard`)<br>`src/modules/doctor_perf.js:991` (`systemPerfCard`) |
| `ksmbd-control` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:415` (`handle_storage_wol`) | `src/modules/storage_wol.js:72` (`ksmbdCard`)<br>`src/modules/storage_wol.js:339` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:348` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:357` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:367` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:390` (`openKsmbdModal`) |
| `ksmbd-disk-action` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:562` (`handle_storage_wol`) | `src/modules/storage_wol.js:204` (`openKsmbdFormatConfirmModal`)<br>`src/modules/storage_wol.js:429` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:444` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:460` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:481` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:514` (`openKsmbdModal`) |
| `ksmbd-interface-access` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:487` (`handle_storage_wol`) | `src/modules/storage_wol.js:552` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:562` (`openKsmbdModal`) |
| `ksmbd-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/storage_wol.sh:412` (`handle_storage_wol`) | `src/modules/storage_wol.js:115` (`refreshKsmbdCardSummary`)<br>`src/modules/storage_wol.js:283` (`openKsmbdModal`) |
| `ksmbd-user-action` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:513` (`handle_storage_wol`) | `src/modules/storage_wol.js:622` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:632` (`openKsmbdModal`)<br>`src/modules/storage_wol.js:687` (`openKsmbdModal`) |
| `lan-igmp-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:585` (`handle_network`) | `src/modules/network.js:325` (`toggleIgmp`) |
| `lan-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:535` (`handle_network`) | `src/modules/lifecycle.js:214` (`fetchData`) |
| `language` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1300` (`handle_ezsetup`) | `src/modules/system.js:13` (`setDashboardLanguage`) |
| `manual-update-start` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2076` (`handle_ezsetup`) | `src/modules/system.js:577` (`startManualPackageUpload`) |
| `mwan` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:712` (`handle_network`) | `src/modules/network.js:231` (`setMwanMode`) |
| `mwan-rule-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:855` (`handle_network`) | `src/modules/network_modals.js:1194` (`deleteMwanRule`) |
| `mwan-rule-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:868` (`handle_network`) | `src/modules/network_modals.js:1212` (`toggleMwanRule`) |
| `mwan-status-fast` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:266` (`handle_network`) | `src/modules/lifecycle.js:193` (`fetchData`) |
| `mwan-torrent-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:881` (`handle_network`) | `src/modules/network_modals.js:1235` (`toggleMwanTorrentPreset`)<br>`src/modules/network_modals.js:1422` (`showMwanTorrentModal`) |
| `mwan3-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:975` (`handle_network`) | `src/modules/network.js:276` (`toggleMwan3`) |
| `network-capacity-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1451` (`handle_system`) | `src/modules/doctor_perf.js:515` (`openNetworkCapacityModal`) |
| `ntp-configure-smart` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1596` (`handle_system`) | `src/modules/system.js:3329` (`showNtpModal`) |
| `ntp-intercept-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1599` (`handle_system`) | `src/modules/system.js:3256` (`showNtpModal`) |
| `ntp-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1590` (`handle_system`) | `src/modules/system.js:3205` (`showNtpModal`) |
| `ntp-sync-browser` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1593` (`handle_system`) | `src/modules/system.js:3310` (`showNtpModal`) |
| `ping-target-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1882` (`handle_network`) | `src/modules/network.js:2168` (`showLatencyTargetModal`) |
| `pppoe-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1833` (`handle_network`) | `src/modules/network.js:1761` (`showPppoeLogsModal`) |
| `pppoe-profile-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/network.sh:1813` (`handle_network`) | `src/modules/network.js:1364` (`editWan`) |
| `pppoe-profiles-list` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1752` (`handle_network`) | `src/modules/network.js:1227` (`editWan`) |
| `profile` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:1298` (`handle_ezsetup`) | `src/modules/lifecycle.js:149` (`switchProfile`) |
| `reboot-confirm` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1550` (`handle_devices`) | `src/modules/system.js:987` (`showRebootConfirmation`) |
| `reboot-prepare` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1542` (`handle_devices`) | `src/modules/system.js:981` (`requestReboot`) |
| `self-update-check` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1953` (`handle_ezsetup`) | `src/modules/system.js:464` (`checkBackgroundUpdate`) |
| `self-update-log` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1981` (`handle_ezsetup`) | `src/modules/system.js:201` (`pollSelfUpdate`) |
| `self-update-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/ezsetup.sh:1978` (`handle_ezsetup`) | `src/modules/system.js:159` (`pollSelfUpdate`) |
| `speedify` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1095` (`handle_speedify`) | `src/modules/speedify.js:144` (`speedifyCommand`) |
| `speedify-adapter-priority` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1026` (`handle_speedify`) | `src/modules/speedify.js:182` (`saveSpeedifyAdapterPriority`) |
| `speedify-adapter-rate` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1032` (`handle_speedify`) | `src/modules/speedify.js:185` (`saveSpeedifyAdapterRate`) |
| `speedify-autostart` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1077` (`handle_speedify`) | `src/modules/speedify.js:67` (`toggleSpeedifyAutostart`) |
| `speedify-bypass-master` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1018` (`handle_speedify`) | `src/modules/speedify.js:169` (`toggleSpeedifyBypassMaster`) |
| `speedify-bypass-service` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1009` (`handle_speedify`) | `src/modules/speedify.js:151` (`toggleSpeedifyBypass`) |
| `speedify-install-mode` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1055` (`handle_speedify`) | `src/modules/speedify.js:24` (`installSpeedifyMode`)<br>`src/modules/speedify.js:111` (`toggleSpeedifyPower`) |
| `speedify-pairing` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1089` (`handle_speedify`) | `src/modules/speedify.js:35` (`pairSpeedify`) |
| `speedify-power` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1080` (`handle_speedify`) | `src/modules/speedify.js:127` (`toggleSpeedifyPower`)<br>`src/modules/speedify.js:506` (`speedifyCard`) |
| `speedify-prepare` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1074` (`handle_speedify`) | `src/modules/speedify.js:9` (`prepareSpeedifyWans`)<br>`src/modules/speedify.js:109` (`toggleSpeedifyPower`) |
| `speedify-save-config` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1071` (`handle_speedify`) | `src/modules/speedify.js:29` (`saveSpeedifyConfig`) |
| `speedify-uninstall` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/speedify.sh:1083` (`handle_speedify`) | `src/modules/speedify.js:199` (`uninstallSpeedify`) |
| `speedify-user` | 🟢 Read-Only | `root/usr/lib/ark/modules/speedify.sh:1092` (`handle_speedify`) | `src/modules/speedify.js:49` (`checkSpeedifyUser`) |
| `speedtest-apply` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1179` (`handle_devices`) | `src/modules/speedtest.js:417` (`applySpeedtestSuggestion`) |
| `speedtest-result` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1171` (`handle_devices`) | `src/modules/speedtest.js:406` (`loadSpeedtestResult`) |
| `speedtest-start` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/devices.sh:1079` (`handle_devices`) | `src/modules/speedtest.js:363` (`runSpeedtest`) |
| `speedtest-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/devices.sh:1167` (`handle_devices`) | `src/modules/speedtest.js:397` (`pollSpeedtest`) |
| `sqm-engine-select` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1001` (`handle_sqm`) | `src/modules/network.js:500` (`selectSqmEngine`) |
| `sqm-gaming-ports` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1095` (`handle_sqm`) | `src/modules/network.js:601` (`toggleGamingPorts`) |
| `sqm-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:976` (`handle_sqm`) | `src/modules/lifecycle.js:153` (`switchProfile`)<br>`src/modules/network.js:467` (`toggleSqm`) |
| `sqm-waveform-aplus` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/sqm.sh:1036` (`handle_sqm`) | `src/modules/network.js:565` (`toggleWaveformAplus`) |
| `starlink-active-wan-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:203` (`handle_starlink`) | `src/modules/speedify.js:377` (`speedifyCard`) |
| `starlink-always-show-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:241` (`handle_starlink`) | `src/modules/starlink.js:21` (`toggleStarlinkAlwaysShow`) |
| `starlink-public-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:206` (`handle_starlink`) | `src/modules/starlink.js:8` (`toggleStarlinkPublic`) |
| `starlink-telemetry` | 🟢 Read-Only | `root/usr/lib/ark/modules/starlink.sh:189` (`handle_starlink`) | `src/modules/starlink.js:653` (`readStarlinkTelemetry`) |
| `starlink-telemetry-flush` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:363` (`handle_starlink`) | `src/modules/starlink.js:148` (`flushStarlinkTelemetryRam`) |
| `starlink-telemetry-send-test` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/starlink.sh:328` (`handle_starlink`) | `src/modules/starlink.js:97` (`triggerStarlinkTestEmail`) |
| `starlink-telemetry-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/starlink.sh:213` (`handle_starlink`) | `src/modules/starlink.js:158` (`updateStarlinkTelemetryStatusBadge`) |
| `starlink-telemetry-test-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/starlink.sh:356` (`handle_starlink`) | `src/modules/starlink.js:128` (`pollStarlinkTestEmail`) |
| `system-hardware-auto-tune` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1559` (`handle_system`) | `src/modules/doctor_perf.js:832` (`systemPerfCard`)<br>`src/modules/system.js:2571` (`showHardwareModal`) |
| `system-hardware-info` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1556` (`handle_system`) | `src/modules/lifecycle.js:225` (`fetchData`) |
| `system-hardware-sqm-audit` | 🟢 Read-Only | `root/usr/lib/ark/modules/sqm.sh:1399` (`handle_sqm`) | `src/modules/network.js:647` (`editSqmLimits`) |
| `system-memory-purge` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1461` (`handle_system`) | `src/modules/doctor_perf.js:789` (`systemPerfCard`) |
| `system-network-mode-get` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1306` (`handle_network`) | `src/modules/system.js:2096` (`showNetworkModeModal`) |
| `system-perf-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1366` (`handle_system`) | `src/modules/lifecycle.js:216` (`fetchData`) |
| `system-processes-telemetry` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1458` (`handle_system`) | `src/modules/system.js:2605` (`showHardwareModal`) |
| `system-storage-purge` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1465` (`handle_system`) | `src/modules/doctor_perf.js:809` (`systemPerfCard`)<br>`src/modules/system.js:330` (`showUpdateConfirmModal`) |
| `theme` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2518` (`handle_ezsetup`) | `src/modules/system.js:966` (`useTheme`) |
| `title` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/ezsetup.sh:2136` (`handle_ezsetup`) | `src/modules/system.js:69` (`setDashboardTitle`) |
| `upnp-clear-leases` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1424` (`handle_system`) | `src/modules/system.js:1571` (`clearUpnpLeases`) |
| `upnp-delete-lease` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1420` (`handle_system`) | `src/modules/system.js:1559` (`deleteUpnpLease`) |
| `upnp-restart` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1427` (`handle_system`) | `src/modules/system.js:1588` (`restartUpnpDaemon`) |
| `upnp-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/system.sh:1389` (`handle_system`) | `src/modules/system.js:1341` (`updateUpnpStatus`) |
| `upnp-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1392` (`handle_system`) | `src/modules/doctor_perf.js:1179` (`systemPerfCard`) |
| `wan-optimize-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/network.sh:1313` (`handle_network`) | `src/modules/network_modals.js:5` (`showWanOptimizationsModal`) |
| `wifi` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:470` (`handle_wifi`) | `src/modules/wifi.js:157` (`changeWifiPassword`) |
| `wifi-add` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:775` (`handle_wifi`) | `src/modules/wifi.js:262` (`showAddWifiModal`) |
| `wifi-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:859` (`handle_wifi`) | `src/modules/wifi.js:904` (`editWifiNetwork`) |
| `wifi-dfs-optimize` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1241` (`handle_wifi`) | `src/modules/render.js:1520` (`render`)<br>`src/modules/wifi.js:1289` (`optimizeDfs`) |
| `wifi-enhancer-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/wifi.sh:2338` (`handle_wifi`) | `src/modules/wifi.js:2079` (`updateWifiEnhancerUI`)<br>`src/modules/wifi.js:2130` (`showWifiEnhancerModal`)<br>`src/modules/wifi.js:2228` (`showWifiEnhancerModal`) |
| `wifi-enhancer-upgrade` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2341` (`handle_wifi`) | `src/modules/wifi.js:2226` (`showWifiEnhancerModal`) |
| `wifi-iot-optimize` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1177` (`handle_wifi`) | `src/modules/render.js:1470` (`render`)<br>`src/modules/wifi.js:1259` (`optimizeIot`) |
| `wifi-mesh-satellite-discover` | 🟢 Read-Only | `root/usr/lib/ark/modules/wifi.sh:1733` (`handle_wifi`) | `src/modules/wifi.js:2301` (`showSatelliteWizardModal`) |
| `wifi-mesh-satellite-pull-master` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1820` (`handle_wifi`) | `src/modules/wifi.js:2454` (`showSatelliteWizardModal`) |
| `wifi-mesh-satellite-revert` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2075` (`handle_wifi`) | `src/modules/wifi.js:3048` (`showSatelliteWizardModal`) |
| `wifi-mesh-set` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1706` (`handle_wifi`) | `src/modules/wifi.js:2031` (`showMeshModal`)<br>`src/modules/wifi.js:2056` (`showMeshModal`) |
| `wifi-roaming-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1402` (`handle_wifi`) | `src/modules/wifi.js:1799` (`toggleRoaming`) |
| `wifi-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:486` (`handle_wifi`) | `src/modules/wifi.js:321` (`_executeWifiToggle`) |
| `wifi-txbalance-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1646` (`handle_wifi`) | `src/modules/wifi.js:1969` (`_applyTxBalance`) |
| `wifi-usteer-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1488` (`handle_wifi`) | `src/modules/wifi.js:1824` (`toggleUsteer`) |
| `wifi-wed-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1279` (`handle_wifi`) | `src/modules/render.js:1375` (`render`) |
| `wifi-wifi6-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:2224` (`handle_wifi`) | `src/modules/wifi.js:1866` (`toggleWifi6Accel`) |
| `wifi-wps-pbc` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1358` (`handle_wifi`) | `src/modules/wifi.js:1767` (`triggerWpsPbc`) |
| `wifi-wps-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/wifi.sh:1326` (`handle_wifi`) | `src/modules/wifi.js:1743` (`toggleWps`) |
| `wireguard-autostart-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1251` (`handle_vpn`) | `src/modules/vpn.js:924` (`wireguardCard`) |
| `wireguard-client-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1272` (`handle_vpn`) | `src/modules/vpn.js:605` (`showWireGuardClientModal`) |
| `wireguard-client-import` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1263` (`handle_vpn`) | `src/modules/vpn.js:776` (`showWireGuardClientModal`) |
| `wireguard-client-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1266` (`handle_vpn`) | `src/modules/vpn.js:453` (`showWireGuardClientModal`) |
| `wireguard-client-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1269` (`handle_vpn`) | `src/modules/vpn.js:569` (`showWireGuardClientModal`) |
| `wireguard-disable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1248` (`handle_vpn`) | `src/modules/vpn.js:180` (`disableWireguard`) |
| `wireguard-enable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1245` (`handle_vpn`) | `src/modules/vpn.js:161` (`enableWireguard`) |
| `wireguard-peer-add` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1254` (`handle_vpn`) | `src/modules/vpn.js:329` (`showWireGuardModal`) |
| `wireguard-peer-delete` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1257` (`handle_vpn`) | `src/modules/vpn.js:401` (`showWireGuardModal`) |
| `wireguard-peer-qr` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1260` (`handle_vpn`) | `src/modules/vpn.js:381` (`showWireGuardModal`) |
| `wireguard-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/vpn.sh:1239` (`handle_vpn`) | `src/modules/vpn.js:253` (`showWireGuardModal`) |
| `wol-status` | 🟢 Read-Only | `root/usr/lib/ark/modules/storage_wol.sh:687` (`handle_storage_wol`) | `src/modules/storage_wol.js:861` (`refreshWolCardSummary`)<br>`src/modules/storage_wol.js:946` (`openWolModal`) |
| `wol-target-save` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:719` (`handle_storage_wol`) | `src/modules/devices.js:1699` (`configureDevice`)<br>`src/modules/storage_wol.js:1028` (`openWolModal`) |
| `wol-wake` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/storage_wol.sh:690` (`handle_storage_wol`) | `src/modules/storage_wol.js:923` (`triggerWolWake`) |
| `zerotier-autostart-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1236` (`handle_vpn`) | `src/modules/vpn.js:113` (`zerotierCard`) |
| `zerotier-disable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1219` (`handle_vpn`) | `src/modules/vpn.js:24` (`disableZerotier`) |
| `zerotier-enable` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1216` (`handle_vpn`) | `src/modules/vpn.js:6` (`enableZerotier`) |
| `zerotier-join` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1230` (`handle_vpn`) | `src/modules/vpn.js:48` (`joinZerotier`) |
| `zerotier-leave` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/vpn.sh:1233` (`handle_vpn`) | `src/modules/vpn.js:64` (`leaveZerotier`) |
| `zram-toggle` | 🔒 Mutação (`ark_mutation.lock`) | `root/usr/lib/ark/modules/system.sh:1434` (`handle_system`) | `src/modules/doctor_perf.js:22` (`showHighRamZramConfirmModal`)<br>`src/modules/doctor_perf.js:60` (`showLowEndMipsZramConfirmModal`)<br>`src/modules/doctor_perf.js:1116` (`systemPerfCard`) |

---

## 3. Índice Cirúrgico de Funções Backend (`root/usr/lib/ark/**/*.sh`)

### `root/usr/lib/ark/common.sh` (2448 linhas, 95 funções)

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
| `ark_cake_memlimit()` | `515–538` | 24L |
| `ark_upnp_is_legacy_iptables()` | `542–569` | 28L |
| `ark_upnp_is_legacy_nftables_on_fw3()` | `571–592` | 22L |
| `ark_migrate_upnp_variant()` | `594–676` | 83L |
| `ark_sanitize_upnp_config()` | `678–722` | 45L |
| `ark_sync_clat_p2p_routes()` | `727–772` | 46L |
| `ark_safe_storage_reboot()` | `779–858` | 80L |
| `ark_harden_transmission_config()` | `861–916` | 56L |
| `ark_cleanup_dhcpv6_orphans()` | `919–937` | 19L |
| `ark_sanitize_wan6_config()` | `940–1025` | 86L |
| `ark_sanitize_lan_ipv6()` | `1028–1099` | 72L |
| `ark_ipv6_prefix_hygiene()` | `1102–1210` | 109L |
| `ark_auto_enable_factory_wifi()` | `1214–1248` | 35L |
| `ark_dev_supports_mtu()` | `1251–1278` | 28L |
| `_ark_set_single_device_mtu()` | `1282–1360` | 79L |
| `ark_ensure_phys_device_mtu()` | `1362–1395` | 34L |
| `ark_ensure_wan_mtu_fix()` | `1398–1417` | 20L |
| `ark_get_min_wan_mtu()` | `1420–1477` | 58L |
| `ark_optimal_wg_mtu()` | `1483–1507` | 25L |
| `ark_sync_lan_ipv6_ra_mtu()` | `1511–1544` | 34L |
| `ark_ensure_phys_device_mac()` | `1549–1637` | 89L |
| `ez_get()` | `1645–1645` | 1L |
| `ez_set()` | `1647–1647` | 1L |
| `cleanup_backup()` | `1649–1660` | 12L |
| `ark_kill_package_fetchers()` | `1662–1667` | 6L |
| `ark_run_limited()` | `1669–1688` | 20L |
| `guest_l3_device()` | `1690–1695` | 6L |
| `active_wan_networks()` | `1697–1703` | 7L |
| `sqm_device_for_network()` | `1705–1719` | 15L |
| `find_dhcp_host()` | `1721–1730` | 10L |
| `sanitize_dhcp_hostnames()` | `1732–1745` | 14L |
| `apply_lan_dhcp_dns()` | `1747–1759` | 13L |
| `same_managed_subnet()` | `1761–1789` | 29L |
| `sync_adguard_ipv6()` | `1791–1823` | 33L |
| `firewall_wan_zone_section()` | `1825–1829` | 5L |
| `firewall_zone_has_network()` | `1831–1834` | 4L |
| `lan_bridge_section()` | `1836–1838` | 3L |
| `lan_bridge_port_count()` | `1840–1844` | 5L |
| `find_switch_vlan()` | `1846–1858` | 13L |
| `swconfig_remove_port_from_vlan()` | `1860–1873` | 14L |
| `swconfig_add_port_to_vlan()` | `1875–1896` | 22L |
| `ark_board_switch_role_ports()` | `1899–1915` | 17L |
| `ark_board_switch_wan_port()` | `1917–1934` | 18L |
| `ark_board_switch_cpu_tag()` | `1936–1944` | 9L |
| `ark_board_uses_legacy_ifname()` | `1946–1956` | 11L |
| `swconfig_port_num()` | `1958–1973` | 16L |
| `bridge_has_port()` | `1975–1978` | 4L |
| `add_lan_port()` | `1980–1992` | 13L |
| `remove_lan_port()` | `1994–2004` | 11L |
| `configure_uhttpd_listeners()` | `2006–2015` | 10L |
| `zerotier_ram_compress()` | `2017–2047` | 31L |
| `get_primary_wan_dev()` | `2049–2075` | 27L |
| `get_active_online_wan_dev()` | `2077–2114` | 38L |
| `get_internet_led_sysfs()` | `2116–2147` | 32L |
| `get_internet_alert_led_sysfs()` | `2149–2161` | 13L |
| `ark_has_qsdk_ecm()` | `2166–2174` | 9L |
| `ark_has_doh_proxy()` | `2177–2184` | 8L |
| `ark_sync_doh_proxy()` | `2190–2333` | 144L |
| `ark_is_readonly_action()` | `2339–2369` | 31L |
| `ark_acquire_mutation_lock()` | `2371–2412` | 42L |
| `ark_release_mutation_lock()` | `2414–2426` | 13L |
| `ark_invalidate_caches()` | `2428–2438` | 11L |
| `ark_restore_mutation_trap()` | `2440–2446` | 7L |

### `root/usr/lib/ark/dhcp_fingerprint.sh` (48 linhas, 0 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |

### `root/usr/lib/ark/led.sh` (716 linhas, 11 funções)

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
| `ark_led_update_wan_status()` | `580–716` | 137L |

### `root/usr/lib/ark/logging.sh` (41 linhas, 5 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_mask_sensitive()` | `8–13` | 6L |
| `ark_log()` | `15–19` | 5L |
| `ark_warn()` | `21–26` | 6L |
| `ark_err()` | `28–33` | 6L |
| `ark_audit()` | `35–41` | 7L |

### `root/usr/lib/ark/modules/adblock.sh` (1561 linhas, 14 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `adblock_status_json()` | `13–214` | 202L |
| `adblock_apply_rules()` | `216–373` | 158L |
| `adblock_apply_blacklist()` | `375–377` | 3L |
| `adblock_sync_blacklist()` | `379–545` | 167L |
| `adblock_sync_whitelist()` | `547–737` | 191L |
| `sync_dns_intercept()` | `739–785` | 47L |
| `adblock_configure()` | `787–975` | 189L |
| `adblock_enable()` | `977–1202` | 226L |
| `adblock_restore_dns()` | `1204–1295` | 92L |
| `adblock_disable()` | `1297–1362` | 66L |
| `adblock_uninstall()` | `1364–1418` | 55L |
| `adblock_toggle()` | `1420–1431` | 12L |
| `adblock_sso_login()` | `1433–1502` | 70L |
| `handle_adblock()` | `1504–1557` | 54L |

### `root/usr/lib/ark/modules/devices.sh` (1570 linhas, 20 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `flush_stale_leases()` | `18–91` | 74L |
| `device_get_stations()` | `93–123` | 31L |
| `device_get_stations_raw()` | `125–353` | 229L |
| `speedtest_history_file()` | `355–359` | 5L |
| `speedtest_history_append()` | `361–375` | 15L |
| `speedtest_history_json()` | `377–408` | 32L |
| `speedtest_schedule_weak_cleanup()` | `410–423` | 14L |
| `speedtest_download_fallback_mbps()` | `425–476` | 52L |
| `speedtest_upload_fallback_mbps()` | `478–510` | 33L |
| `device_limits_json()` | `512–532` | 21L |
| `apply_device_bandwidth_limits()` | `534–671` | 138L |
| `device_apply_parental()` | `673–852` | 180L |
| `can_install_speedtest_flash()` | `854–869` | 16L |
| `speedtest_storage_json()` | `871–886` | 16L |
| `prepare_speedtest()` | `888–939` | 52L |
| `satellite_sync_master_leases_if_needed()` | `941–979` | 39L |
| `get_device_fingerprints_raw()` | `981–1022` | 42L |
| `get_device_fingerprints()` | `1024–1047` | 24L |
| `setup_dhcp_fingerprint_hook()` | `1049–1065` | 17L |
| `handle_devices()` | `1067–1570` | 504L |

### `root/usr/lib/ark/modules/doctor.sh` (2436 linhas, 4 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_doctor_audit()` | `23–2318` | 2296L |
| `doctor_get_status()` | `2320–2329` | 10L |
| `doctor_get_log()` | `2331–2340` | 10L |
| `handle_doctor()` | `2342–2431` | 90L |

### `root/usr/lib/ark/modules/ezsetup.sh` (2646 linhas, 43 funções)

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
| `ark_feature_toggle_internal()` | `257–412` | 156L |
| `ark_feature_remove_internal()` | `414–458` | 45L |
| `ark_enforce_saved_feature_policies()` | `460–467` | 8L |
| `version_gt()` | `469–479` | 11L |
| `ark_package_manager()` | `481–486` | 6L |
| `ark_cpu_arch()` | `488–492` | 5L |
| `ark_can_run_aarch64()` | `494–499` | 6L |
| `ark_mem_total_kb()` | `501–505` | 5L |
| `ark_overlay_avail_kb()` | `507–511` | 5L |
| `ark_tmp_avail_kb()` | `513–517` | 5L |
| `ark_best_profile()` | `519–531` | 13L |
| `ark_actual_profile()` | `533–539` | 7L |
| `ark_installed_profile()` | `541–549` | 9L |
| `ark_update_asset_name()` | `551–561` | 11L |
| `ark_remove_opposite_profile()` | `563–592` | 30L |
| `ark_install_package_file()` | `594–661` | 68L |
| `ark_http_get()` | `663–685` | 23L |
| `ark_http_download()` | `687–703` | 17L |
| `ark_latest_release()` | `705–721` | 17L |
| `ark_latest_changelog()` | `723–735` | 13L |
| `ark_update_json()` | `737–778` | 42L |
| `ark_operation_profile()` | `780–780` | 1L |
| `apply_operation_profile()` | `782–858` | 77L |
| `ez_progress()` | `860–860` | 1L |
| `ez_json()` | `862–959` | 98L |
| `ez_apply_wifi_iface()` | `961–971` | 11L |
| `ez_apply_guest_network()` | `973–1014` | 42L |
| `ez_apply_guest_limit()` | `1016–1031` | 16L |
| `feature_json()` | `1033–1278` | 246L |
| `handle_ezsetup()` | `1280–2646` | 1367L |

### `root/usr/lib/ark/modules/network.sh` (1937 linhas, 6 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `apply_wan_proto()` | `18–89` | 72L |
| `apply_wan_modem_access()` | `91–136` | 46L |
| `bind_uhttpd_to_lan_ip()` | `138–141` | 4L |
| `mwan3_toggle()` | `143–188` | 46L |
| `mwan_status_fast()` | `190–262` | 73L |
| `handle_network()` | `264–1937` | 1674L |

### `root/usr/lib/ark/modules/network_ipv6_mwan.sh` (1841 linhas, 26 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `autowan_can_convert()` | `15–49` | 35L |
| `get_physical_wan_dev()` | `51–86` | 36L |
| `autowan_can_convert_wan_json()` | `88–144` | 57L |
| `system_network_mode_get()` | `146–186` | 41L |
| `system_network_mode_set()` | `188–367` | 180L |
| `restore_ipv6_firewall_rules()` | `369–417` | 49L |
| `ark_ensure_ipv6_dhcpv6_client()` | `419–440` | 22L |
| `enable_ipv6_dual_stack()` | `442–535` | 94L |
| `clean_ipv6_selective_firewall()` | `537–564` | 28L |
| `sync_ipv6_selective_firewall()` | `566–633` | 68L |
| `ark_has_multi_wan()` | `738–752` | 15L |
| `sync_nptv6_firewall()` | `754–764` | 11L |
| `clean_nptv6_firewall()` | `766–772` | 7L |
| `save_pre_clat_state()` | `774–794` | 21L |
| `ark_register_cloudflare_warp_v6()` | `796–845` | 50L |
| `sync_ipv6_clat_tunnel()` | `847–975` | 129L |
| `clean_ipv6_clat_tunnel()` | `977–1053` | 77L |
| `set_ipv6_mode()` | `1055–1163` | 109L |
| `set_ipv6_relay()` | `1165–1205` | 41L |
| `toggle_ipv6_device()` | `1207–1223` | 17L |
| `get_ipv6_status()` | `1225–1284` | 60L |
| `disable_ipv6_full()` | `1288–1350` | 63L |
| `mwan3_reorder_rules()` | `1352–1398` | 47L |
| `get_configured_ping_track_ips()` | `1400–1438` | 39L |
| `ensure_mwan3_ark_config()` | `1440–1808` | 369L |
| `mwan3_sync_lifecycle()` | `1810–1840` | 31L |

### `root/usr/lib/ark/modules/speedify.sh` (1108 linhas, 54 funções)

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
| `handle_speedify()` | `1005–1104` | 100L |

### `root/usr/lib/ark/modules/sqm.sh` (1418 linhas, 25 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `ark_has_cake_mq()` | `14–23` | 10L |
| `ark_has_auto_dscp()` | `25–33` | 9L |
| `ark_has_ctinfo()` | `35–44` | 10L |
| `ark_has_l4s_dscp()` | `46–54` | 9L |
| `ark_apply_ingress_voice_tin_filters()` | `56–107` | 52L |
| `ark_promote_cake_mq()` | `109–207` | 99L |
| `ark_is_gaming_ports_enabled()` | `209–221` | 13L |
| `ark_sync_gaming_ports_and_bql()` | `223–330` | 108L |
| `ark_get_sqm_engine()` | `362–374` | 13L |
| `ark_apply_sqm_engine_to_section()` | `376–389` | 14L |
| `get_system_hardware_sqm_audit()` | `391–464` | 74L |
| `sqm_apply_upload_only()` | `466–497` | 32L |
| `ensure_qos_equipe()` | `499–509` | 11L |
| `ark_sqm_ack_filter_opt()` | `511–521` | 11L |
| `ark_sqm_ingress_rtt_opt()` | `523–534` | 12L |
| `ark_sqm_ingress_mode_opt()` | `536–538` | 3L |
| `ensure_sqm_section()` | `540–676` | 137L |
| `sqm_section_for_network()` | `678–680` | 3L |
| `apply_guest_tc_limit()` | `682–708` | 27L |
| `sync_sqm_flow_offload()` | `710–770` | 61L |
| `ark_sync_lan_selective_offload()` | `772–788` | 17L |
| `ark_sqm_autorate_toggle()` | `790–800` | 11L |
| `ark_sqm_autorate_step()` | `802–955` | 154L |
| `ark_sqm_autorate_status()` | `957–972` | 16L |
| `handle_sqm()` | `974–1418` | 445L |

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

### `root/usr/lib/ark/modules/system_hardware_leds.sh` (1963 linhas, 12 funções)

| Função | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `cleanup_orphan_leds()` | `14–43` | 30L |
| `update_wan_led()` | `45–166` | 122L |
| `get_led_hardware_info()` | `168–471` | 304L |
| `update_led_alert()` | `473–476` | 4L |
| `apply_aw21018_leds()` | `478–528` | 51L |
| `set_led_rgb_color()` | `530–683` | 154L |
| `set_led_preset()` | `685–936` | 252L |
| `get_led_status()` | `938–951` | 14L |
| `detect_hardware_silicon_profile()` | `953–1090` | 138L |
| `system_hardware_auto_tune()` | `1092–1451` | 360L |
| `get_system_hardware_info_raw()` | `1453–1924` | 472L |
| `get_system_hardware_info()` | `1926–1962` | 37L |

### `root/usr/lib/ark/modules/vpn.sh` (1285 linhas, 33 funções)

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
| `b64_decode_str()` | `945–973` | 29L |
| `b64_encode_file()` | `975–988` | 14L |
| `wireguard_client_import()` | `990–1106` | 117L |
| `wireguard_client_status_json()` | `1108–1153` | 46L |
| `wireguard_client_toggle()` | `1155–1182` | 28L |
| `wireguard_client_delete()` | `1184–1205` | 22L |
| `handle_vpn()` | `1209–1281` | 73L |

### `root/usr/lib/ark/modules/wifi.sh` (2346 linhas, 14 funções)

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
| `handle_wifi()` | `468–2346` | 1879L |

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

### `src/modules/adblock.js` (849 linhas, 5 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.adblockCard()` | `3–175` | 173L |
| `this.openAdguardWithSSO()` | `176–200` | 25L |
| `this.openAdguardSSOModal()` | `201–271` | 71L |
| `this.openAdguardUninstallModal()` | `272–363` | 92L |
| `this.openAdblockSetupModal()` | `364–849` | 486L |

### `src/modules/devices.js` (1755 linhas, 10 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.renderDevices()` | `3–755` | 753L |
| `this.sortDevices()` | `756–771` | 16L |
| `this.setDeviceSort()` | `772–790` | 19L |
| `this.toggleDeviceSortDirection()` | `791–803` | 13L |
| `this.quickReserveSecondary()` | `804–817` | 14L |
| `this.quickReserveIot()` | `818–853` | 36L |
| `this.updateSecondaryBanner()` | `854–915` | 62L |
| `this.flushStaleLeases()` | `916–946` | 31L |
| `this.togglePassword()` | `947–947` | 1L |
| `this.configureDevice()` | `948–1755` | 808L |

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

### `src/modules/lifecycle.js` (1016 linhas, 21 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.fetchCapabilities()` | `4–79` | 76L |
| `this.feature()` | `80–85` | 6L |
| `this.themeColor()` | `86–90` | 5L |
| `this.applyAppearance()` | `91–105` | 15L |
| `this.triggerImmediateRefresh()` | `106–125` | 20L |
| `this.switchProfile()` | `126–168` | 43L |
| `this.applyBrand()` | `169–173` | 5L |
| `this.load()` | `174–184` | 11L |
| `this.fetchData()` | `185–359` | 175L |
| `this.fetchDataTimed()` | `360–366` | 7L |
| `this.calculateRates()` | `367–410` | 44L |
| `this.deviceRates()` | `411–491` | 81L |
| `this.devicesExpanded()` | `492–495` | 4L |
| `this.isEconomicHardware()` | `496–509` | 14L |
| `this.adaptiveRefreshSeconds()` | `510–519` | 10L |
| `this.updateRefreshSummary()` | `520–531` | 12L |
| `this.scheduleAdaptiveRefresh()` | `532–560` | 29L |
| `this.update()` | `561–878` | 318L |
| `this.updateClockAndDate()` | `879–906` | 28L |
| `this.startClockTicker()` | `907–914` | 8L |
| `this.updateDoctorStatus()` | `915–1016` | 102L |

### `src/modules/network.js` (2200 linhas, 15 métodos)

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
| `this.editSqmLimits()` | `626–1225` | 600L |
| `this.editWan()` | `1226–1720` | 495L |
| `this.showPppoeLogsModal()` | `1721–1884` | 164L |
| `this.showLatencyTargetModal()` | `1885–2200` | 316L |

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

### `src/modules/render.js` (3356 linhas, 15 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.render()` | `3–2047` | 2045L |
| `this.renderMwanRulesSection()` | `2048–2215` | 168L |
| `this.renderV2DoctorStrip()` | `2216–2246` | 31L |
| `this.renderV2QuickStatusStrip()` | `2247–2275` | 29L |
| `this.renderV2SwitchPortsCard()` | `2276–2294` | 19L |
| `this.toggleV2MobileSidebar()` | `2295–2303` | 9L |
| `this.switchV2Panel()` | `2304–2380` | 77L |
| `this.renderV2CockpitStatusOverview()` | `2381–2452` | 72L |
| `this.setupV2CockpitLayout()` | `2453–2738` | 286L |
| `this.renderPluginLifecycleBar()` | `2739–2820` | 82L |
| `this.applyFeatureVisibilityAndLifecycle()` | `2821–2940` | 120L |
| `this.renderV2LuciDrawer()` | `2941–3058` | 118L |
| `this.toggleV2LuciDrawer()` | `3059–3075` | 17L |
| `this.filterV2LuciDrawer()` | `3076–3087` | 12L |
| `this.updateV2CockpitStatus()` | `3088–3356` | 269L |

### `src/modules/speedify.js` (643 linhas, 14 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.prepareSpeedifyWans()` | `3–12` | 10L |
| `this.installSpeedifyMode()` | `13–27` | 15L |
| `this.saveSpeedifyConfig()` | `28–30` | 3L |
| `this.pairSpeedify()` | `31–47` | 17L |
| `this.checkSpeedifyUser()` | `48–63` | 16L |
| `this.toggleSpeedifyAutostart()` | `64–75` | 12L |
| `this.toggleSpeedifyPower()` | `76–138` | 63L |
| `this.speedifyCommand()` | `139–147` | 9L |
| `this.toggleSpeedifyBypass()` | `148–161` | 14L |
| `this.toggleSpeedifyBypassMaster()` | `162–180` | 19L |
| `this.saveSpeedifyAdapterPriority()` | `181–183` | 3L |
| `this.saveSpeedifyAdapterRate()` | `184–186` | 3L |
| `this.uninstallSpeedify()` | `187–261` | 75L |
| `this.speedifyCard()` | `262–643` | 382L |

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

### `src/modules/storage_wol.js` (1158 linhas, 9 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.ksmbdCard()` | `8–112` | 105L |
| `this.refreshKsmbdCardSummary()` | `113–175` | 63L |
| `this.openKsmbdFormatConfirmModal()` | `176–245` | 70L |
| `this.openKsmbdWanWarningModal()` | `246–276` | 31L |
| `this.openKsmbdModal()` | `277–772` | 496L |
| `this.wolCard()` | `773–858` | 86L |
| `this.refreshWolCardSummary()` | `859–916` | 58L |
| `this.triggerWolWake()` | `917–939` | 23L |
| `this.openWolModal()` | `940–1158` | 219L |

### `src/modules/system.js` (3358 linhas, 48 métodos)

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
| `this.checkSelfUpdate()` | `140–157` | 18L |
| `this.pollSelfUpdate()` | `158–247` | 90L |
| `this.showUpdateConfirmModal()` | `248–437` | 190L |
| `this.startSelfUpdate()` | `438–440` | 3L |
| `this.checkBackgroundUpdate()` | `441–475` | 35L |
| `this.renderUpdateBanner()` | `476–528` | 53L |
| `this.openManualUpdateModal()` | `529–563` | 35L |
| `this.startManualPackageUpload()` | `564–591` | 28L |
| `this.selfUpdatePanel()` | `592–702` | 111L |
| `this.pollFeatureInstall()` | `703–720` | 18L |
| `this.showPackageInstallProgressModal()` | `721–867` | 147L |
| `this.loadMissingInstallLog()` | `868–870` | 3L |
| `this.pollMissingInstall()` | `871–879` | 9L |
| `this.installMissingFeatures()` | `880–915` | 36L |
| `this.installFeature()` | `916–955` | 40L |
| `this.useTheme()` | `956–978` | 23L |
| `this.requestReboot()` | `979–983` | 5L |
| `this.showRebootConfirmation()` | `984–993` | 10L |
| `this.upnpCard()` | `994–1338` | 345L |
| `this.updateUpnpStatus()` | `1339–1490` | 152L |
| `this.saveUpnpSettings()` | `1491–1556` | 66L |
| `this.deleteUpnpLease()` | `1557–1566` | 10L |
| `this.clearUpnpLeases()` | `1567–1580` | 14L |
| `this.restartUpnpDaemon()` | `1581–1603` | 23L |
| `this.dmzCard()` | `1604–1690` | 87L |
| `this.updateDmzStatus()` | `1691–1776` | 86L |
| `this.showDmzModal()` | `1777–2051` | 275L |
| `this.showThermalModal()` | `2052–2094` | 43L |
| `this.showNetworkModeModal()` | `2095–2336` | 242L |
| `this.showNetworkModeConfirmation()` | `2337–2440` | 104L |
| `this.showHardwareModal()` | `2441–2647` | 207L |
| `this.showFeatureCenter()` | `2648–3027` | 380L |
| `this.isDevMode()` | `3028–3033` | 6L |
| `this.isShowUninstalledMenus()` | `3034–3039` | 6L |
| `this.toggleDevMode()` | `3040–3075` | 36L |
| `this.toggleShowUninstalledMenus()` | `3076–3107` | 32L |
| `this.toggleFeatureState()` | `3108–3158` | 51L |
| `this.removeFeature()` | `3159–3198` | 40L |
| `this.showNtpModal()` | `3199–3358` | 160L |

### `src/modules/vpn.js` (984 linhas, 11 métodos)

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
| `this.showWireGuardClientModal()` | `449–831` | 383L |
| `this.wireguardCard()` | `832–984` | 153L |

### `src/modules/wifi.js` (3142 linhas, 28 métodos)

| Método da View LuCI | Linhas (`StartLine`–`EndLine`) | Tamanho |
| :--- | :--- | :--- |
| `this.updateWifi()` | `3–128` | 126L |
| `this.currentWifiChannels()` | `129–138` | 10L |
| `this.changeWifiPassword()` | `139–169` | 31L |
| `this.showAddWifiModal()` | `170–276` | 107L |
| `this.toggleWifiNetwork()` | `277–312` | 36L |
| `this._executeWifiToggle()` | `313–344` | 32L |
| `this.editWifiNetwork()` | `345–981` | 637L |
| `this.showManualChannelsModal()` | `982–1204` | 223L |
| `this.analyzeChannels()` | `1205–1222` | 18L |
| `this.toggleAutoChannels()` | `1223–1230` | 8L |
| `this.changeChannels()` | `1231–1241` | 11L |
| `this.optimizeIot()` | `1242–1271` | 30L |
| `this.optimizeDfs()` | `1272–1301` | 30L |
| `this.changeWifiWidth()` | `1302–1458` | 157L |
| `this.showTxPowerModal()` | `1459–1624` | 166L |
| `this.changeCountry()` | `1625–1736` | 112L |
| `this.toggleWps()` | `1737–1762` | 26L |
| `this.triggerWpsPbc()` | `1763–1793` | 31L |
| `this.toggleRoaming()` | `1794–1815` | 22L |
| `this.toggleUsteer()` | `1816–1860` | 45L |
| `this.toggleWifi6Accel()` | `1861–1884` | 24L |
| `this.confirmMultiRouterAction()` | `1885–1936` | 52L |
| `this.toggleTxBalance()` | `1937–1964` | 28L |
| `this._applyTxBalance()` | `1965–1985` | 21L |
| `this.showMeshModal()` | `1986–2072` | 87L |
| `this.updateWifiEnhancerUI()` | `2073–2113` | 41L |
| `this.showWifiEnhancerModal()` | `2114–2293` | 180L |
| `this.showSatelliteWizardModal()` | `2294–3142` | 849L |

---

## 5. Mapa de Daemons, Init Scripts (`procd`) e Hotplugs (`root/etc/hotplug.d/`)

| Categoria | Caminho no Repositório | Papel Operacional |
| :--- | :--- | :--- |
| **Dispatcher** | `root/usr/sbin/equipe-dashboard-control` | Controlador unificado CLI/RPC com Fast-Path de cache e lock de mutação |
| **Wrapper CLI** | `root/usr/sbin/ark-doctor` | Atalho CLI para `equipe-dashboard-control ark-doctor` |
| **Daemon** | `root/usr/sbin/ark-autowan-daemon` | Monitoramento contínuo de portas físicas e conversão automática WAN/LAN |
| **Daemon** | `root/usr/sbin/ark-port-ledd` | Sincronização em tempo real dos LEDs físicos de portas de rede |
| **Daemon** | `root/usr/sbin/ark-rainbowd` | Motor de efeitos RGB e animações de LEDs (GPIO / I2C AW21018) |
| **Daemon** | `root/usr/sbin/ark-web-watchdog` | Watchdog de disponibilidade do servidor web uhttpd/rpcd |
| **Daemon** | `root/usr/sbin/equipe-traffic-history` | Coletor leve de histórico de tráfego em `/tmp/equipe-traffic-history.csv` |
| **Daemon** | `root/usr/sbin/starlink-telemetry-daemon` | Coletor gRPC de telemetria da antena Starlink |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/05-ark-pppoe-babyjumbo` | Sondagem e ajuste automático de MTU 1508 (RFC 4638 Baby Jumbo) no PPPoE |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/15-ark-ipv6-hygiene` | Expurgo de prefixos IPv6 órfãos e sincronia de rotas CLAT a cada `ifup`/`ifupdate` |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/30-wireguard-wan` | Ressincronização de endpoint e MTU do WireGuard em transições WAN |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/95-ark-cache-invalidate` | Invalidação de caches `/tmp/ark-*-cache.ts` e reload seguro de DoH |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/98-ark-hardware-tune` | Reaplicação de sintonia de hardware em eventos `ifup` de interfaces físicas |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/99-ark-doctor` | Auditoria e autocura silenciosa (`ark-doctor --auto`) pós-conexão |
| **Hotplug (`iface`)** | `root/etc/hotplug.d/iface/99-ark-led-wan` | Atualização dinâmica do LED de Internet/WAN em `ifup`/`ifdown` |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/90-ark-rps-tune` | Atribuição multicore de máscaras RPS e limites GRO/GSO para interfaces recém-criadas |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/95-ark-cache-invalidate` | Invalidação de caches em eventos físicos de link de rede |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/98-ark-mlo-bridge` | Vinculação automática de interfaces MLD (Wi-Fi 7 MLO) à `br-lan` |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/99-ark-doctor` | Autocura `ark-doctor --auto` ao recriar interfaces de rádio Wi-Fi ou bridge |
| **Hotplug (`net`)** | `root/etc/hotplug.d/net/99-ark-led-wan` | Atualização imediata de LED WAN em eventos de cabo físico (ignora interfaces virtuais/Wi-Fi) |
| **Hotplug (`firewall`)** | `root/etc/hotplug.d/firewall/99-ark-doctor` | Revalidação de conflitos Flow Offloading vs SQM após reload do firewall |

