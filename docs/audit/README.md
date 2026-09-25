# Auditoria incremental do ARK Router

Esta é a entrada única da auditoria. As regras valem para manutenção futura; a aprovação registrada só vale para o código e o cenário realmente testados.

## Retomada em uma nova conversa

> Continue a auditoria pelo próximo lote de `docs/audit/STATUS.md`. Leia as instruções vigentes, confira o Git, consulte as decisões e fontes aplicáveis, execute o lote e atualize o ponto de retomada.

Ordem inicial: `AGENTS.md` → [STATUS](STATUS.md) → decisões aplicáveis em [DECISIONS](DECISIONS.md) → documentos e código do lote. Nunca é necessário carregar todos os relatórios para começar.

## Onde ler e onde atualizar

| Tarefa | Documento a consultar e manter |
|---|---|
| Etapas, dependências e conclusão | [PLAN](PLAN.md) |
| Andamento, bloqueios e próxima ação | [STATUS](STATUS.md) |
| Políticas aprovadas e dúvidas de produto | [DECISIONS](DECISIONS.md) |
| Recursos, scripts e subchamadas | [INVENTORY](INVENTORY.md) |
| Padrões, zero/null e instalações | [DEFAULTS_AND_INSTALLATION](DEFAULTS_AND_INSTALLATION.md) |
| Bloqueios, permissões e exceções | [POLICIES_AND_EXCEPTIONS](POLICIES_AND_EXCEPTIONS.md) |
| Correção, testes e aprovação de pacote | [CORRECTION_AND_VALIDATION](CORRECTION_AND_VALIDATION.md) |
| Preparação e limites das VMs | [VIRTUAL_LAB](VIRTUAL_LAB.md) |
| Evidências detalhadas e pendências de um lote | [batches](batches/TEMPLATE.md) |

## Fontes de verdade existentes

- Contratos funcionais: [tests/feature_contracts.yaml](../../tests/feature_contracts.yaml). Preserve IDs existentes; não crie outro catálogo YAML.
- Catálogo detalhado existente: [FEATURE_AUDIT_AND_REBOOT](../FEATURE_AUDIT_AND_REBOOT.md). Abra por ID/seção. As alegações históricas de aprovação precisam de evidência, conforme o [lote 000](batches/000-bootstrap.md).
- Verificador existente: [verify_feature_contracts.py](../../tests/verify_feature_contracts.py). Sua aprovação é estrutural e limitada, não operacional.
- Laboratório existente: [VIRTUAL_LAB](../VIRTUAL_LAB.md) e [VIRTUALBOX_TEST_ENVIRONMENT](../VIRTUALBOX_TEST_ENVIRONMENT.md). A existência dos manuais não comprova que a topologia está instalada.

## Controle de contexto

1. Um lote aborda um subsistema ou um pequeno conjunto com dependências comuns.
2. Comece por busca de símbolos e IDs; leia completamente as funções afetadas, chamadores e dependências relevantes antes de editar.
3. Separe leitura estática, hipótese, teste executado e decisão aprovada.
4. Não copie catálogo, código, logs ou contratos inteiros para STATUS. Prefira referências relativas com símbolo/ID e revisão; linhas são apenas auxiliares.
5. STATUS deve ficar preferencialmente abaixo de 100 linhas. Guarde detalhes em relatórios de lote; preserve evidências antigas com sua revisão.
6. Se uma seção crescer demais, divida por subsistema e mantenha o índice. Não fragmente funções inseparáveis só para reduzir texto.
7. Ao mudar o código, invalide testes afetados. Não recicle aprovação de outra versão ou de outro pacote.
8. Registre um checkpoint ao concluir uma unidade coerente, antes de abrir investigação grande adicional. Continue trabalho autorizado; um lote não exige nova permissão automaticamente.

## Atualização contínua

Adição: ID estável, contrato, padrões, propriedade, dependências e testes. Alteração: preserve ID e reavalie consumidores. Remoção: mantenha histórico e versão, avalie migração e dados de terceiros antes de limpar resíduos. Mudança intencional de padrão deve passar por DECISIONS.

Cada fato tem um único lugar de manutenção. Os documentos em `docs/audit/` organizam procedimento e evidências; não substituem silenciosamente o catálogo, instaladores ou manuais existentes.
