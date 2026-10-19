# Estado da Auditoria Estrutural e de Contratos

Atualizado em: 2026-10-19. Este resumo é o checkpoint ativo da trilha `docs/audit/`.

- **Repositório**: `GitHub/luci-app-ark-router`, relativo ao workspace ARK Router.
- **Versão declarada em `VERSION`**: `2.0.1` (sincronizada em `Makefile`, `root/usr/share/ark-router/VERSION`, `common.sh` e `CHANGELOG.md`).
- **Lotes concluídos**:
  - [000 — estrutura e baseline](batches/000-bootstrap.md): estrutura documental e inventário inicial.
  - **001 — confiabilidade dos contratos, geradores, modularização e higienização (`T-003`, `T-042`, `T-043`, `T-044`)**:
    - `tests/verify_feature_contracts.py` atualizado com parser YAML *zero-dependency* nativo (eliminando o salto silencioso quando `pyyaml` está ausente), validação semântica de tipos/perfis, integridade relacional (`relations`) e suíte embutida de 7 testes negativos de esquema.
    - `tests/feature_contracts.yaml` saneado (`version: 2.0.1`, `total_features: 74`, `canonical_repo: GitHub/luci-app-ark-router` sem caminhos absolutos de máquina, e registro de `src/modules/doctor_perf.js` e `src/core/i18n/loader.js`).
    - `scripts/generate_feature_contracts.py` protegido por trava `--force` contra sobrescrita acidental de curadoria manual.
    - `scripts/audit_docs.py` expandido para 8 travas contínuas (versão, termos descontinuados, matriz OpenWrt, contagem de contratos, orçamento `TASK.md`, paridade SHA-256 com `Firmware/sha256sums`, higienização de credenciais em `.md` + `scripts/`, e teto `< 4.000 linhas` em todos os módulos fonte).
  - **002 — Expansão do Catálogo de Contratos (`v1.5.10` a `v2.0.0`)**:
    - 74 contratos (`ARK-*`) documentados e verificados em `tests/feature_contracts.yaml` e `docs/FEATURE_AUDIT_AND_REBOOT.md` (`ARK-SYS-008`, `ARK-WAN-011`, `ARK-PERF-006`, `ARK-WIFI-010`, `ARK-WIFI-011`).
  - **003 — Unificação da Árvore Modular (`src/v2/` ➔ `src/`) e Remoção de Dicionários Legados (`T-045`)**:
    - `scripts/build_frontend_bundle.py` unificado para gerar tanto `overview.js` quanto `overview_v2.js` (`--v2`) a partir da fonte única `src/` (injetando `overview_v2.css` sob `--v2`).
    - Removida a árvore duplicada `src/v2/` (~20.529 linhas duplicadas) e os dicionários JS legados órfãos (`src/core/i18n.js`, `src/core/i18n/en.js`, `src/core/i18n/es.js` — ~11.500 linhas / 1,2 MB), mantendo `po/{en,es,pt-br}/ark.po` + `src/core/i18n/loader.js` como fonte única de traduções.
  - **004 — Arquitetura V2 Cockpit & Central de Recursos, Sub-Modularização Backend/Frontend (`T-056`–`T-062`) e Release `v2.0.0`**:
    - Separação executiva entre Cockpit (Status-Only) e Central de Recursos (`features`), KSMBD 3.1.1 + Wake-on-LAN (`storage_wol.sh` / `storage_wol.js`), Dual-DoH 1-Clique (`https-dns-proxy`) + HTTP/3 QUIC (`h3://`), Auto-MTU Baby Jumbo RFC 4638 ao vivo e Inteligência Wi-Fi 6/7 para MacBook (`awdl0` 160 MHz).
- **Catálogo validado**: 74 IDs (`ARK-*`) 100% aprovados em estrutura, tipos, relações, ACLs e presença em `docs/FEATURE_AUDIT_AND_REBOOT.md`.
- **Cobertura i18n**: 4.423 chaves homologadas em `po/en/ark.po`, `po/es/ark.po` e `po/pt-br/ark.po` (`scripts/audit_i18n.py --strict` 100% aprovado).
- **Orçamento de Flash (`/overlay` Lite)**: reduzido de `3,46 MiB` para **`2,75 MiB`** (-748 KB / -20,6%).

## Próximos Lotes Planejados

1. **Lote 004 — Validação Visual e de Regressão Contínua no Lab VirtualBox (`OpenWrt-ARK-Dev`)**:
   - Execução automatizada de cenários Dual-WAN, `fw4`/`fw3`, SQM/CAKE e captura Playwright nos 7 perfis de tela quando a VM de desenvolvimento estiver ativa.
