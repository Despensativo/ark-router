# Plano de lotes

## Sequência e critérios

| Lote/etapa | Escopo | Entrada | Saída exigida | Estado inicial |
|---|---|---|---|---|
| 000 | Organização e baseline documental | Repositório identificado | Navegação, decisões, baseline e pendências registrados | Concluído documentalmente |
| 001 | Confiabilidade de contratos e geradores | Lote 000 | Fonte de verdade definida, esquema validado, distinção entre declaração e evidência, migração testada | Pendente |
| 002 | Inventário e cadeia de chamadas | Contratos preservados | Pontos de entrada, chamadores/subchamadas e propriedade mapeados; lacunas explícitas | Pendente |
| 003 | Padrões e instalação | Fluxos identificados | Matrizes de valores vazios e instalação/migração com fontes | Pendente |
| 004 | Laboratório | Alvos identificáveis e plano de isolamento | VMs e snapshots verificados; clientes/destinos de teste operacionais | Pendente |
| 005.* | Ciclo de vida por subsistema | Lote 004 e contratos relevantes | Ativar/desativar/repetir/reboot testados com evidência | Pendente |
| 006.* | Políticas e exceções | Cenários e expectativas definidos | Tráfego permitido e proibido comprovado para cada cenário | Pendente |
| 007.* | Integração e concorrência | Contratos dos módulos envolvidos | A→B, B→A, concorrência aplicável e recuperação verificadas | Pendente |
| 008 | Pacote candidato | Lotes aplicáveis concluídos | Hash do artefato instalado, regressão, pendências e recuperação documentados | Pendente |

## Como dividir

- Divida 002, 003 e 005–007 por família do catálogo, mantendo juntas funções que escrevem os mesmos recursos.
- Priorize acesso administrativo, instalação/recuperação, conectividade e firewall. Depois expanda para serviços, interface e recursos físicos simulados.
- Corrija defeitos dentro do lote e reexecute os testes afetados. Planejar a etapa seguinte não comprova a anterior.
- Escolha combinações por dependência e risco. Registre as combinações não cobertas; não prometa testar o produto cartesiano inteiro.
- Inspeções independentes podem continuar se uma decisão de produto estiver pendente. Não aplique uma política ambígua por suposição.

## Fechamento e reabertura

Cada lote usa o [modelo](batches/TEMPLATE.md). Um lote só conclui com seus critérios e testes, ou registra conclusão exclusivamente documental quando esse for seu escopo. Teste bloqueado não equivale a passou.

Mudanças em biblioteca compartilhada, migração, gerador, UCI ou política reabrem as verificações dependentes. Mudanças no pacote após teste invalidam a aprovação daquele artefato; avalie o impacto para escolher o reteste.

O lote 008 produz prontidão técnica, não autorização de publicação ou de deploy físico.
