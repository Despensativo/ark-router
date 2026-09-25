# Lote 000 — estrutura e baseline da auditoria

Data: 2026-09-20. Estado: concluído documentalmente. Escopo: organizar continuidade, reutilizar catálogo/testes existentes e identificar limites da evidência. Nenhuma correção de runtime nem execução operacional em VM/roteador.

## Baseline observado

- Repositório localizado pelo usuário em `H:/FEITOS COM IA/Ark-Router/GitHub/luci-app-ark-router`; usar caminhos relativos nos contratos futuros.
- Branch `main`; HEAD `ce2b724ed0245f1d6772f94ffbc62ce09138a6df`.
- `VERSION`: `1.5.2`.
- Alterações preexistentes preservadas:

| Arquivo | SHA-256 antes da organização |
|---|---|
| `root/www/luci-static/resources/view/equipe-dashboard/overview.js` | `efadb0f7f7a59bdfc20cd8fe64fd340ea5739168131983273cce450484633e18` |
| `src/core/formatters.js` | `f39e85c9eb8d66f6a026b1ff5724a321a1d5f0c0cc905bc3c52033b5f6e5af22` |
| `src/core/i18n.js` | `35632ceb4668b50d5266772dfbe8ce1aebe34be31a8149789d3c14ebb71567e1` |
| `src/modules/devices.js` | `27b9aad7c818a285ea06210191bc9fc524592a73ea3a8014ab2af2ca781d9c35` |

Durante o fechamento, `root/usr/lib/ark/modules/network.sh` passou a constar modificado no Git. Esta entrega não editou esse arquivo. A mudança externa foi preservada e exige nova leitura no próximo lote; os quatro hashes acima continuavam iguais na checagem.

## Fontes inspecionadas

- [contratos](../../../tests/feature_contracts.yaml): metadados, IDs, estados e referências a testes.
- [verificador](../../../tests/verify_feature_contracts.py): `verify_contracts()` e limites das checagens.
- [gerador dos contratos](../../../scripts/generate_feature_contracts.py): `FEATURES` e `main()`; escrita do YAML completo.
- [gerador do catálogo](../../../scripts/generate_feature_audit_md.py): `generate_doc()`; cabeçalhos e matriz pós-reboot.
- [catálogo](../../FEATURE_AUDIT_AND_REBOOT.md): cabeçalho atual e tamanho.
- [suíte local](../../../tests/run_local_tests.sh): leitura do fluxo; não executada nesta mudança documental.
- [dispatcher](../../../root/usr/sbin/equipe-dashboard-control): bibliotecas e seleção de módulos.
- [interferência](../../../tests/lab/test_interference_matrix.py): trecho inicial, uso de `RouterSandbox`; sem execução.
- [reboot](../../../tests/lab/test_persistence_reboot.sh): fase inicial de captura; sem execução.

## Achados para próximos lotes

| ID | Evidência estática | Consequência | Encaminhamento |
|---|---|---|---|
| AUD-001 | Gerador Markdown atribui “persistente e restaurada corretamente” com base nos campos, sem resultado de execução | Potencial aprovação documental sem teste | Separar expectativa/evidência no lote 001 |
| AUD-002 | Cabeçalho do catálogo diz 1.5.1; VERSION diz 1.5.2; gerador fixa 1.0.2 e total 70 | Regeneração pode reintroduzir informação obsoleta | Definir origem única e teste de sincronização |
| AUD-003 | YAML e seu gerador registram caminho antigo absoluto no C: | Contexto não portável | Migrar para identidade/caminho relativo |
| AUD-004 | Verificador checa presença de chaves/IDs/arquivos e trechos no Markdown, mas não resultados de teste nem todo o esquema | Mensagens de “zero divergências” têm alcance limitado | Esquema formal e testes negativos |
| AUD-005 | Catálogo declara 67 funcionais, 1 corrigido, 2 simulados | Não comprova saúde atual dos 70 recursos | Vincular resultados ao código/pacote |
| AUD-006 | Gerador YAML mantém lista própria `FEATURES` e sobrescreve o arquivo | Edições manuais podem desaparecer | Reconciliar diferenças antes de regenerar |
| AUD-007 | Teste de interferência usa `RouterSandbox`; script de reboot captura arquivos UCI | Não equivalem a reboot comprovado na VM; capturas podem conter segredos | Rever evidência e sanitização no lote do laboratório |

As consequências são riscos identificados na leitura, não incidentes comprovados em roteador. Nenhum default de rede, senha ou serviço foi alterado.

## Verificações

| Verificação | Resultado | Alcance |
|---|---|---|
| `python tests/verify_feature_contracts.py` | Passou (exit 0), 70 IDs | Verificador estrutural existente |
| Contagem YAML e referências a testes | 70 registros; nenhum caminho de teste ausente | Existência, não execução/cobertura |
| Links locais dos documentos novos | Passou: 45 links em 11 documentos | Destinos existem no workspace |
| Hashes dos quatro arquivos preexistentes | Preservados | Nenhuma edição desta etapa neles |
| `git diff --check` | Passou | Espaçamento do diff rastreado |
| Reboot, tráfego, VirtualBox e UI | Não executados | Fora do lote documental |

Ferramenta opcional `jsonschema` não estava instalada no Python consultado; nenhuma dependência foi instalada. O validador existente usa PyYAML disponível. Definir esquema e execução reproduzível no lote 001.

## Entrega e retomada

Criados índice, plano, estado, decisões, guias por assunto e modelo de lote. Atualizados os dois AGENTS com entrada curta e referências. Preservados catálogo, YAML, geradores, runtime e manuais existentes.

Próximo passo: executar lote 001 de [PLAN](../PLAN.md), começando por reconciliar geradores e catálogo sem sobrescrever conteúdo. Esta entrega prepara a auditoria; não declara o ARK aprovado após reboot nem pronto para publicar.
