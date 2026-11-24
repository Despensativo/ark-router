---
name: ark-spec-impact
description: Workflow Spec-Driven e template de mini-plano de impacto obrigatório antes de editar módulos compartilhados ou arquivos com >= 300 linhas no ARK Router.
---

# ARK Spec-Impact — Protocolo Spec-Driven

Ative esta skill antes de modificar **módulos compartilhados** (`common.sh`, `equipe-dashboard-control`, `hw-tune.sh`, `led.sh`, `src/core/*`, `ark-theme.js`, `Makefile`) ou **arquivos com 300+ linhas** em `GitHub/luci-app-ark-router/`.

## 1. Descoberta Econômica e Anti-Duplicação (Antes de Editar)

1. **Localize via índice determinístico**:
   - Leia apenas o trecho relevante de `docs/CODE_MAP.md` com `rg -n "<funcao_ou_rpc>" docs/CODE_MAP.md`.
   - Inspecione apenas janelas de ~100 linhas no arquivo alvo; nunca carregue arquivos grandes por completo.
2. **Busque implementações existentes** (nunca duplique helpers/handlers):
   ```sh
   rg -n "<palavra_chave>" root/usr/lib/ark/ src/ root/www/luci-static/ark/ root/usr/share/ucode/ root/usr/lib/lua/
   ```
3. **Mapeie chamadores e subchamadas**:
   - Confira quem chama a função/método/RPC no backend (`.sh`, `equipe-dashboard-control`, `init.d`, `hotplug.d`, `cgi-bin`) e no frontend (`src/modules/*.js`).
   - Se o alvo estiver em `docs/AUDIT_REPORT.md`, leia o bloco `AUD-NNN` correspondente.

## 2. Template Obrigatório do Mini-Plano de Impacto

Registre este resumo antes de iniciar a primeira edição:

```markdown
### Mini-Plano de Impacto — <Módulo / AUD-NNN>
1. **Alvo & Linhas**: `<arquivo>:<inicio>-<fim>` (`<N> linhas`)
2. **Chamadores & Caches/Serviços**: `<lista de chamadores, locks ark_mutation.lock, caches /tmp/ark-*>`
3. **Contratos & Guardrails**:
   - Contratos `ARK-*`: `<IDs em tests/feature_contracts.yaml ou N/A>`
   - Firewall: `<fw4/fw3 via common.sh ou N/A>`
   - Estado UCI: `<snapshot saved_* preservado ou N/A>`
4. **Anti-Duplicação**: `<resultado da busca rg confirmando ausência de helper equivalente>`
5. **Verificação Pós-Edição**: `<comandos exatos: shellcheck, tests/run_local_tests.sh, pytest focal, screenshot/VM>`
```

## 3. Checklist Obrigatório de Fechamento

- [ ] Se editou `src/`: executou `python3 scripts/build_frontend_bundle.py` para manter `overview.js` sincronizado (nunca tocar `overview_v2.*`).
- [ ] Se adicionou strings visíveis em PT-BR: manteve o desenvolvimento em PT-BR e rodou `python3 scripts/audit_i18n.py --strict` (ou atualizou `po/{en,es,pt-br}/ark.po` em pré-release).
- [ ] Se adicionou/alterou comportamento funcional: atualizou `tests/feature_contracts.yaml`, `docs/FEATURE_AUDIT_AND_REBOOT.md` e `docs/audit/STATUS.md`.
- [ ] Executou validação estática/local após a última edição:
  - `shellcheck -s sh -S error <arquivos_sh_alterados>`
  - `python3 scripts/audit_shell_scripts.py`
  - `python3 scripts/audit_state_preservation.py --strict`
  - `python3 scripts/audit_docs.py --strict`
  - `python3 scripts/generate_code_map.py --check` (regerar com `generate_code_map.py` se linhas/funções mudaram)
  - `tests/run_local_tests.sh`
- [ ] Se alterou UI/CSS/LuCI JS: validou visualmente com screenshot real e console limpo antes de concluir; se alterou runtime de roteador: validou em VM UTM/VirtualBox antes de qualquer deploy físico autorizado.
