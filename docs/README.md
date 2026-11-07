# ARK Router — Mapa Mestre de Documentação Técnica e Índices (`.md`)

> Índice de navegação dos documentos mantidos. A versão declarada está em [`VERSION`](../VERSION); alterações locais ainda não publicadas são identificadas nos lotes de auditoria. O índice não comprova revisão semântica nem aprovação de todos os documentos.

## Comece pela tarefa

1. **Instalar e ativar:** [instalação](INSTALL.md), [perfis Lite/Full](PACKAGE_PROFILES.md) e [ciclo de vida](LIFECYCLE_INSTALL_AND_UNINSTALL_GUIDE.md).
2. **Usar e desligar recursos:** [uso prático e solução de problemas](USAGE_AND_TROUBLESHOOTING.md), incluindo estado solicitado, estado efetivo e restauração.
3. **Investigar falhas:** [diagnósticos](network-diagnostics.md), [segurança do Doctor](DOCTOR_SAFETY_MODEL.md) e [recuperação Cudy](CUDY_WR3000_TFTP_RECOVERY.md).
4. **Consultar implementação:** [arquitetura](ARCHITECTURE.md), [CODE_MAP](CODE_MAP.md), [contratos](FEATURE_AUDIT_AND_REBOOT.md) e [auditoria ativa](audit/STATUS.md).

Auditoria de documentação, lógica, UX e Doctor de 05/11/2026: [relatório e matriz de risco](audit/batches/021-docs-runtime-doctor-audit.md).

---

## 1. Governança, Mapas de Código e Auditoria Incremental (Entrypoints para IA e Devs)

| Documento | Escopo e Regra de Leitura |
| :--- | :--- |
| [`AGENTS.md`](../AGENTS.md) *(Repositório)* & `AGENTS.md` *(Workspace)* | Regras universais de segurança (solicitação explícita dentro do escopo), Shell POSIX, isolamento `fw4`/`fw3`, orçamento `< 60 KB`, i18n triplo e protocolo Anti-Amnésia. |
| `PLAYBOOK.md` *(Raiz do Workspace)* | Tabela `DO-NOT-REPEAT` (`ARK-01` a `ARK-11`) e 18 seções de lições operacionais homologadas. Leia primeiro a seção `0` e o índice de linhas no topo. |
| `TASK.md` *(Raiz do Workspace)* | Checkpoint operacional e tarefas recentes; consulte o conteúdo atual. Histórico anterior arquivado em `tasks/done/`. |
| **[`docs/CODE_MAP.md`](CODE_MAP.md)** | **Mapa Determinístico de Código e Execução** (gerado por `scripts/generate_code_map.py`): indexa Fast-Path, locks, matriz `JS -> RPC -> Shell` e `StartLine`–`EndLine` de todas as funções `.sh` e métodos `.js`. |
| [`docs/audit/README.md`](audit/README.md) & [`docs/audit/STATUS.md`](audit/STATUS.md) | Ponto de entrada da auditoria incremental, lotes de verificação e regras de controle de contexto. |
| [`docs/audit/DECISIONS.md`](audit/DECISIONS.md) & [`docs/audit/INVENTORY.md`](audit/INVENTORY.md) | Decisões de produto aprovadas, cadeia de execução e matriz de propriedade/interferência. |
| [`docs/audit/PLAN.md`](audit/PLAN.md), [`CORRECTION_AND_VALIDATION.md`](audit/CORRECTION_AND_VALIDATION.md), [`DEFAULTS_AND_INSTALLATION.md`](audit/DEFAULTS_AND_INSTALLATION.md), [`POLICIES_AND_EXCEPTIONS.md`](audit/POLICIES_AND_EXCEPTIONS.md), [`VIRTUAL_LAB.md`](audit/VIRTUAL_LAB.md) | Procedimentos formais de validação de pacotes, padrões de instalação, políticas de exceção e templates de lotes ([`batches/`](audit/batches/)). |

---

## 2. Documentação Canônica Viva por Domínio Técnico (Fontes de Verdade)

| Domínio Técnico | Documento Canônico Oficial | Descrição e Escopo |
| :--- | :--- | :--- |
| **Arquitetura & RPC** | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) | Subsistemas, despachante RPC (`/usr/sbin/equipe-dashboard-control`), handlers e daemons. |
| **Manual Exaustivo de Subsistemas** | [`docs/ARK_ROUTER_EXHAUSTIVE_COMMANDS_AND_SUBSYSTEMS_MANUAL.md`](ARK_ROUTER_EXHAUSTIVE_COMMANDS_AND_SUBSYSTEMS_MANUAL.md) | Referência detalhada de comandos RPC, módulos shell (`network_ipv6_mwan`, `storage_wol`, `system_hardware_leds`) e fluxos V2. |
| **Compatibilidade OpenWrt** | [`docs/COMPATIBILITY_MATRIX.md`](COMPATIBILITY_MATRIX.md) | Limites oficiais entre `fw3` (`<= 21.02`) e `fw4` (`>= 22.03`), `opkg` (`<= 24.10`) e `apk` (`>= 25.12`). |
| **Contratos e Persistência Reboot** | [`docs/FEATURE_AUDIT_AND_REBOOT.md`](FEATURE_AUDIT_AND_REBOOT.md) | Catálogo vivo dos 74 contratos funcionais (`tests/feature_contracts.yaml`), idempotência e não-interferência. |
| **Enciclopédia Master de QoS (Kernel)** | [`docs/ENCICLOPEDIA_MASTER_QOS_KERNEL_LINUX_ARK_2026.md`](ENCICLOPEDIA_MASTER_QOS_KERNEL_LINUX_ARK_2026.md) | Arquitetura multicore RPS/IRQ/NAPI, BQL físico, `CAKE` vs `HFSC + FQ-CoDel Turbo`, L4S e eliminação de Pause Frames. |
| **Engenharia QoS Dual-Engine & MTU** | [`docs/ENGENHARIA_QOS_DUAL_ENGINE_E_MTU_2026_11.md`](ENGENHARIA_QOS_DUAL_ENGINE_E_MTU_2026_11.md) | Filtros Real-Time `<= 511B`, exclusão STUN, motor inteligente de MTU por perfil WAN (`xpon_bridge`, `xpon_vlan`, `dhcp_cable`, `mobile_starlink`) e WireGuard. |
| **Engenharia de Rede & Checklist** | [`docs/NETWORK_ENGINEERING_FIXES_AND_TEST_CHECKLIST.md`](NETWORK_ENGINEERING_FIXES_AND_TEST_CHECKLIST.md) | Correções oficiais de Baby Jumbo 1508 (RFC 4638), VLAN 802.1Q, `ra_mtu`, Conntrack RFC 5382 e DoT 853. |
| **Diagnósticos & Ark Doctor** | [`docs/network-diagnostics.md`](network-diagnostics.md) | Checagens de integridade e autocura do `ark-doctor`, sondas de ping e resolução de conflitos. |
| **Testes de ajustes QoS** | [`docs/QOS_TEST_PROTOCOL.md`](QOS_TEST_PROTOCOL.md) | Comparação CAKE/HFSC, três rodadas por ferramenta, BufferSpeed web/app e coletor Python com triagem rápida no cliente. |
| **Wi-Fi 6/7, WPAD & Roaming** | [`docs/WPAD_UPGRADE_AND_WIFI6_ROAMING.md`](WPAD_UPGRADE_AND_WIFI6_ROAMING.md) | Migração atômica para `wpad-mbedtls`, roaming `802.11k/v` (`bss_transition=1`, `rnr=1`), `usteer` consultivo e armadilha FT-SAE (`T-039`). |
| **Design System, UI & Mobile QA** | [`docs/UI_DESIGN_SYSTEM_AND_QA.md`](UI_DESIGN_SYSTEM_AND_QA.md) & [`docs/ark-ui-rules.md`](ark-ui-rules.md) | Padrões DOM LuCI, contenção mobile (`360px`–`390px`), modais, touch targets de `40px+` e validação visual. |
| **Internacionalização (i18n Triplo)** | [`docs/I18N_TRANSLATION_GUIDE.md`](I18N_TRANSLATION_GUIDE.md) & [`docs/I18N_CATALOG_SUMMARY.md`](I18N_CATALOG_SUMMARY.md) | Fluxo de desenvolvimento em PT-BR, Pre-Release Gate (`audit_i18n.py --strict`) e catálogos `po/{pt-br,en,es}/ark.po`. |
| **Perfis de Hardware & Orçamento** | [`docs/MODULES_AND_HARDWARE_PROFILES.md`](MODULES_AND_HARDWARE_PROFILES.md) & [`docs/hardware-budget.md`](hardware-budget.md) | Matriz de hardware (128 MB MIPS até 1 GB+ Filogic/IPQ), limites de RAM e proteção de `/overlay`. |
| **Perfis de Pacote (Lite vs Full)** | [`docs/PACKAGE_PROFILES.md`](PACKAGE_PROFILES.md) | Limiares de seleção de pacotes opcionais, dependências e orçamento de armazenamento flash. |
| **Segurança & ACLs** | [`docs/SECURITY.md`](SECURITY.md) & [`docs/security-rules.md`](security-rules.md) | Políticas de segurança, sanitização de inputs POSIX, tokens efêmeros em `/tmp` e ACLs `rpcd`. |
| **Catálogo de Whitelist AdBlock** | [`docs/ADBLOCK_WHITELIST_CATALOG.md`](ADBLOCK_WHITELIST_CATALOG.md) | Domínios essenciais protegidos (bancos, pagamentos, governo, streaming e jogos). |

---

## 3. Guias Operacionais, Instalação, Laboratório Virtual e Releases

| Categoria | Documento | Finalidade |
| :--- | :--- | :--- |
| **Instalação & Primeiro Boot** | [`docs/INSTALL.md`](INSTALL.md) | Guia passo a passo de instalação `.apk`/`.ipk` e assistente inicial. |
| **Ciclo de Vida (Install/Uninstall)** | [`docs/LIFECYCLE_INSTALL_AND_UNINSTALL_GUIDE.md`](LIFECYCLE_INSTALL_AND_UNINSTALL_GUIDE.md) | Preservação de estado, desinstalação limpa e restauração de snapshots UCI. |
| **Atualização de Pacotes** | [`docs/ARK_ROUTER_PACKAGES_UPDATE_GUIDE.md`](ARK_ROUTER_PACKAGES_UPDATE_GUIDE.md) | Fluxo de self-update, upload manual de pacotes e verificação de integridade. |
| **Empacotamento & Publicação** | [`docs/PUBLISHING.md`](PUBLISHING.md) & [`docs/RELEASES.md`](RELEASES.md) | Geração local de pacotes (`.apk`/`.ipk`) e publicação em GitHub Releases. |
| **Changelogs & Roadmap** | [`CHANGELOG.md`](../CHANGELOG.md), [`docs/LATEST_CHANGELOG.md`](LATEST_CHANGELOG.md), [`docs/CHANGELOG-COMPLETO.md`](CHANGELOG-COMPLETO.md), [`docs/ROADMAP.md`](ROADMAP.md) | Notas de versão ativas, histórico cumulativo de releases e planejamento evolutivo. |
| **Laboratório Virtual (VMs)** | [`docs/VIRTUALBOX_TEST_ENVIRONMENT.md`](VIRTUALBOX_TEST_ENVIRONMENT.md), [`docs/VIRTUAL_LAB.md`](VIRTUAL_LAB.md), [`docs/MAC_UTM_TEST_ENVIRONMENT.md`](MAC_UTM_TEST_ENVIRONMENT.md) | Configuração reproduzível de VMs OpenWrt no VirtualBox, QEMU (`:8085`/`:2225`) e UTM no macOS. |
| **Firmware & Recuperação TFTP** | [`docs/CUDY_WR3000_TFTP_RECOVERY.md`](CUDY_WR3000_TFTP_RECOVERY.md) & [`docs/firmware-runbook.md`](firmware-runbook.md) | Procedimento TFTP para Cudy WR3000 v1, verificação `sha256sums` e sysupgrade seguro. |

---

## 4. Estudos, Diagnósticos e Registros de Sessão Datados (Consulta sob Demanda)

> **⚠️ Diretriz de Economia de Tokens para IAs**: Os arquivos abaixo são **registros históricos e investigações datadas**. **NÃO** os carregue na inicialização da conversa; leia-os única e exclusivamente se o usuário solicitar análise histórica daquele incidente específico.

| Arquivo Datado | Contexto Histórico / Escopo do Estudo |
| :--- | :--- |
| [`docs/ANALISE_HARDWARE_WIFI_W6X_2026_11_05.md`](ANALISE_HARDWARE_WIFI_W6X_2026_11_05.md) | Diagnóstico de hardware e Wi-Fi do W6x em 05/11/2026. |
| [`docs/ANALISE_MULTICORE_W6X_2026_11_02.md`](ANALISE_MULTICORE_W6X_2026_11_02.md) | Auditoria somente-leitura de distribuição CPU/IRQ/NAPI/RPS no Acer W6x (`T-081`). |
| [`docs/ANALISE_WIFI_CELULARES_2026_11_02.md`](ANALISE_WIFI_CELULARES_2026_11_02.md) | Investigação de limites de vazão Wi-Fi em smartphones no W6x (`T-080`). |
| [`docs/REGISTRO_SESSAO_WIFI_MULTICORE_2026_11_02.md`](REGISTRO_SESSAO_WIFI_MULTICORE_2026_11_02.md) | Consolidação de testes de sessão Wi-Fi e multicore pós-`T-083` (`T-084`). |
| [`docs/OTIMIZACAO_MULTICORE_T083.md`](OTIMIZACAO_MULTICORE_T083.md) | Registro da serialização de jobs (`serialized-job.sh`) e cache quente (`T-083`). |
| [`docs/DIAGNOSTICO_ONT_HUAWEI_2026_10_29.md`](DIAGNOSTICO_ONT_HUAWEI_2026_10_29.md) | Telemetria óptica GPON da ONT Huawei EG8145X6-10 (`T-075`/`T-076`). |
| [`docs/DIAGNOSTICO_W6X_MONITORADO_2026_10_29.md`](DIAGNOSTICO_W6X_MONITORADO_2026_10_29.md) | Correlação de amostras de CPU/CAKE, ICMP e UDP sob carga (`T-072`). |
| [`docs/DIAGNOSTICO_W6X_SONDAS_WAN_2026_10_29.md`](DIAGNOSTICO_W6X_SONDAS_WAN_2026_10_29.md) | Captura ICMP WAN e análise de eventos ociosos (`T-073`/`T-074`). |
| [`docs/MIGRACAO_TP_LINK_XZ005_G6_2026_10_29.md`](MIGRACAO_TP_LINK_XZ005_G6_2026_10_29.md) | Notas de preparação para ponte óptica TP-Link XZ005-G6 2.5GbE (`T-077`). |
| [`docs/MANUAL_ACESSO_E_COMANDOS_ONT_TPLINK_XZ005_G6.md`](MANUAL_ACESSO_E_COMANDOS_ONT_TPLINK_XZ005_G6.md) | Manual técnico de acesso Telnet, CLI e Data Model HTTP (/cgi?9) da ONT TP-Link XZ005-G6. |
| [`docs/TESTE_WAVEFORM_CABO_2026_10_29.md`](TESTE_WAVEFORM_CABO_2026_10_29.md) | Medições comparativas de Bufferbloat Waveform via cabo Ethernet (`T-071`). |
| [`docs/ESTUDO_TCP_BBR_TFO_DNS_STALE_CACHE.md`](ESTUDO_TCP_BBR_TFO_DNS_STALE_CACHE.md) | Fundamentação RFC/Kernel de TCP BBR, TFO, `tcp_notsent_lowat` e DNS Stale Cache (`T-066`). |
| [`docs/ESTUDO_W6X_OPENWRT_25_12_5_LATENCIA.md`](ESTUDO_W6X_OPENWRT_25_12_5_LATENCIA.md) | Recorte de latência e WED no Filogic 830 / OpenWrt 25.12.5 (`T-064`). |
| [`docs/ESTUDO_WIFI_LATENCIA_BUFFERBLOAT.md`](ESTUDO_WIFI_LATENCIA_BUFFERBLOAT.md) | Estudo de AQL, airtime fairness e bufferbloat Wi-Fi (`T-064`). |
| [`docs/REVISAO_ESTUDOS_WIFI_ARK_2_1_6.md`](REVISAO_ESTUDOS_WIFI_ARK_2_1_6.md) | Revisão consolidada dos parâmetros Wi-Fi após a release `v2.1.6` (`T-070`). |
