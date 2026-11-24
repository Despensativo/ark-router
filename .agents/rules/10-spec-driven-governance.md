---
trigger: always_on
---

# Governança Spec-Driven & Anti-Duplicação — ARK Router

## 1. Arquitetura e Nomenclatura Obrigatórias

- **Backend Shell (`root/usr/lib/ark/`, `root/usr/sbin/`, `root/etc/`)**: POSIX `/bin/sh` puro (BusyBox `ash`). Proibido `[[ ]]`, arrays, `${var//}`, `$RANDOM`, `type -p` ou `for f in $(ls ...)`. Funções compartilhadas em `root/usr/lib/ark/` devem usar prefixo `ark_*` (ou prefixo do módulo) e declarar variáveis internas com `local`.
- **Dual Firewall & Pacotes**: Detectar firewall exclusivamente via `ark_firewall_engine()`, `is_fw4()` e `is_fw3()` (`common.sh`) e pacotes via `command -v apk` / `command -v opkg`.
- **Preservação de Estado**: Nunca restaurar defaults fixos em `disable_*`/`revert_*`/`toggle_*`; capturar antes em `saved_*` e validar via `audit_state_preservation.py --strict`.
- **Frontend SPA (`src/`)**: Editar **apenas** `src/core/` e `src/modules/` e regerar `overview.js` com `python3 scripts/build_frontend_bundle.py`. Proibido editar `overview.js` diretamente, duplicar código em `overview_v2.*` ou usar `alert()`/`confirm()`/`prompt()`.
- **Teto Modular**: Manter fontes `.sh`, `.js`, `.css` abaixo de 4.000 linhas e orçamento minificado do tema (`ark-theme.js` + `cascade.css` + `mobile.css`) abaixo de 60 KB.

## 2. Regra de Ouro Anti-Duplicação (Shell, JS e Templates)

Antes de criar qualquer função, helper, handler de evento DOM, listener `Escape` ou `<script>` inline:
1. Consulte `docs/CODE_MAP.md` (seções de Fast-Path, Matriz RPC e Índice de Funções).
2. Execute busca real no repositório com `rg -n "<termo>" root/usr/lib/ark/ src/ root/www/luci-static/ark/ root/usr/share/ucode/ root/usr/lib/lua/`.
3. **Proibição de Sobreposição no Tema**: Lógica global de navegação/modal/teclado do tema pertence exclusivamente a `root/www/luci-static/ark/ark-theme.js` — nunca duplique em `footer.ut` ou `footer.htm`.

## 3. Workflow Spec-Driven (Mini-Plano de Impacto Obrigatório)

Antes de editar **qualquer módulo compartilhado** (`common.sh`, `equipe-dashboard-control`, `hw-tune.sh`, `led.sh`, `src/core/*`, `ark-theme.js`, `Makefile`) ou **qualquer arquivo com >= 300 linhas**, formule um mini-plano de impacto de 5 pontos:
1. **Alvo e Janela**: Arquivo(s) e intervalo de linhas exato (`CODE_MAP.md` / `rg -n`).
2. **Chamadores e Efeitos Colaterais**: Quem chama a função/RPC e quais caches/serviços/UCI são afetados.
3. **Contratos e Guardrails**: IDs `ARK-*` afetados em `tests/feature_contracts.yaml`, ramificação `fw4`/`fw3`, preservação de estado (`saved_*`) e compatibilidade `19.07`–`25.x`.
4. **Anti-Duplicação**: Confirmação da busca prévia (`rg`) sem helper reutilizável existente.
5. **Verificação Alvo**: Comando exato pós-edição (`shellcheck -s sh`, `tests/run_local_tests.sh`, teste unitário focal, e validação visual/VM UTM quando tocar UI ou runtime).

Para template completo e checklist de entrega, leia `.agents/skills/ark-spec-impact/SKILL.md`.
