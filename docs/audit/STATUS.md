# Estado da auditoria

Atualizado em: 2026-09-20. Este resumo é um checkpoint; confira o Git antes de continuar.

- Repositório: `GitHub/luci-app-ark-router`, relativo ao workspace ARK Router.
- Versão declarada em VERSION: `1.5.2`.
- HEAD observado: `ce2b724ed0245f1d6772f94ffbc62ce09138a6df`, branch `main`.
- Alterações preexistentes: bundle `overview.js`, `src/core/formatters.js`, `src/core/i18n.js`, `src/modules/devices.js`. Preservar; hashes no lote 000.
- Durante a validação apareceu também uma alteração em `root/usr/lib/ark/modules/network.sh`, externa a esta entrega. Reinspecionar antes do próximo lote; não foi revertida nem validada funcionalmente.
- Lote concluído: [000 — estrutura e baseline](batches/000-bootstrap.md), somente documentação e inspeção estrutural.
- Próximo lote: 001, confiabilidade dos contratos/geradores. Critérios em [PLAN](PLAN.md).
- Catálogo existente: 70 IDs. O estado `funcional` é declaração histórica, não resultado desta auditoria.
- Último pacote validado por esta auditoria: **nenhum**.
- Testes de reboot, tráfego e interferência executados nesta etapa: **nenhum**.
- Checagem estrutural existente: `python tests/verify_feature_contracts.py` passou para 70 contratos. Limites descritos no lote 000.
- Validação da estrutura criada: 11 documentos, 45 links locais válidos; `git diff --check` sem erros. Detalhes no lote 000.

## Pendências prioritárias

1. Gerador de Markdown produz aprovações pós-reboot a partir de metadados, sem consultar resultados executados. Não usar como aprovação de release.
2. Gerador de YAML pode sobrescrever edições do catálogo; definir manutenção/migração antes de executá-lo.
3. Contratos contêm caminho antigo de máquina; geradores e catálogo têm versões/cabeçalhos divergentes.
4. Verificador atual não valida integralmente tipos, relações, semântica ou execução dos testes. Formalizar esquema e testes negativos no lote 001.
5. Descoberta de ações e subchamadas ainda incompleta. Os 70 registros não comprovam cobertura de todo o código.
6. Topologia VirtualBox e snapshots ainda não inspecionados nesta etapa. Nenhuma VM foi iniciada ou modificada.

## Próxima ação concreta

Leia [000-bootstrap](batches/000-bootstrap.md), `tests/verify_feature_contracts.py` e os dois geradores citados nele. Compare com os contratos atuais; proponha e implemente uma migração compatível de evidências/esquema, preservando IDs e mudanças locais. Não regenere documentos antes de preservar as diferenças existentes e revisar o efeito do gerador.

Feche 001 com testes positivos/negativos, validação local aplicável e checkpoint. Consulte [DECISIONS](DECISIONS.md) se surgir mudança intencional de política ou padrão.
