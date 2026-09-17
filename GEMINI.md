# ARK Router — Gemini Context & Directives

## Identificação do Projeto
- **Nome**: ARK Router (`luci-app-ark-router`).
- **Versão**: `1.0.2`.
- **Ambiente**: Dual OpenWrt (19.07 a 25.x). Backend em BusyBox `ash` (`/bin/sh`) e frontend em LuCI JavaScript SPA nativo.
- **Repositório Canônico**: Este diretório (`GitHub/luci-app-ark-router`).

## Regras Críticas Invioláveis
1. **Ambiente Virtual Obrigatório**: O desenvolvimento e validação devem ser feitos prioritariamente na máquina virtual isolada do VirtualBox (`OpenWrt-ARK-Dev`).
2. **Proibição de Deploy Físico Automático**: Nunca instalar, atualizar ou alterar roteadores físicos automaticamente.
3. **Exigência de Confirmação 'SIM'**: Qualquer intervenção em roteador real depende estritamente de aprovação prévia e confirmação manual do usuário digitando **SIM**.
4. **Shell POSIX Puro**: Proibido bashisms (`[[ ]]`, `${var//}`, arrays). Use sempre `/bin/sh` puro.
5. **Zero Frameworks Alienígenas**: Proibido React, Next.js, JSX, TypeScript, Tailwind ou dependências de runtime npm. Apenas vanilla JavaScript (`L.view.extend`) e CSS puro (< 60 KB).
6. **Orçamento Físico**: Manter > 80 MB livres de RAM (128 MB) e > 2 MB livres no `/overlay`. Nunca gravar logs em `/etc` (usar `/tmp`).
7. **Modularização (< 4.000 linhas)**: Código-fonte sempre modular abaixo de 4.000 linhas. O arquivo `overview.js` é um bundle determinístico compilado de `src/` via `scripts/build_frontend_bundle.py`.
8. **Validação**: Testes locais obrigatórios via `tests/run_local_tests.sh`.
9. **Internacionalização Obrigatória (i18n Triplo)**: Todo novo elemento de interface deve ter suporte simultâneo e testado em Português (`pt-br`), Inglês (`en`) e Espanhol (`es`), mantendo termos técnicos de rede universais preservados. Validado via `scripts/audit_i18n.py`.

## Diretrizes Canônicas
Consulte `AGENTS.md` e `docs/VIRTUALBOX_TEST_ENVIRONMENT.md` para instruções completas de desenvolvimento, validação e mapeamento de documentação técnica.
