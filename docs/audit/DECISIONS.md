# Decisões da auditoria

## Aprovadas pelo usuário

| ID | Decisão | Consequência |
|---|---|---|
| DEC-001 | Testar primeiro em laboratório VirtualBox | Identificar VM e snapshot antes de testes operacionais |
| DEC-002 | Roteador físico mediante solicitação explícita do usuário; o pedido de aplicar já é autorização | Aprovação virtual isolada não permite deploy físico; palavra SIM e confirmação redundante removidas por solicitação em 05/11/2026 |
| DEC-003 | Auditoria pode corrigir defeitos | Diagnóstico, leitura de dependências e regressão são obrigatórios |
| DEC-004 | Discutir mudanças de padrões do produto | Documentar atual/proposta/impacto antes de implementar intenção nova |
| DEC-005 | Cobrir bloqueios, liberações e exceções | Confirmar permissões e bloqueios com tráfego no laboratório |
| DEC-006 | Trabalho incremental com continuidade em Markdown | Checkpoint por lote; leitura seletiva e evidências por revisão |
| DEC-007 | Não reiniciar o Windows hospedeiro | Reboots de teste restritos às VMs identificadas |
| DEC-008 | Sem commit, push ou publicação automática | Preparação local não autoriza distribuição externa |

Origem: requisitos e autorização desta conversa, consolidados em 2026-09-20. Não registrar segredos ou conteúdo privado.

## Organização adotada nesta entrega

- Reutilizar os 74 IDs e documentos existentes; não criar um segundo catálogo.
- Preservar IDs e curadoria; atualizar contratos ao alterar comportamento. O lote 001 implementou validação estrutural, que não comprova operação.
- Usar caminhos relativos ao repositório. A letra do disco e o caminho do computador não fazem parte do contrato do produto.
- Resultados históricos sem evidência vinculada não serão promovidos a aprovação atual.

## Decisões de produto pendentes

Nenhum novo padrão de SSID, senha, DNS, AdGuard, firewall, QoS ou instalação foi aprovado por esta entrega.

| ID da proposta | Comportamento atual e evidência | Proposta | Impacto/migração | Decisão do usuário |
|---|---|---|---|---|
| A preencher por achado | Não presumir padrão | Descrever alternativa | Incluir configurações existentes | Pendente |

Preserve decisões substituídas com link para a sucessora. O resultado desejado do teste deve vir do contrato e da decisão aprovada, não de adaptação ao comportamento defeituoso.

## Atualização autorizada em 05/11/2026

O usuário solicitou remover a trava de digitar SIM. A solicitação direta de implantação física passa a valer como autorização, sem repetir confirmação. Permanecem identificação do alvo, integridade, backup/retorno e limites do escopo solicitado. Nesta sessão, o usuário também autorizou explicitamente aplicar e validar o lote 007 no W6x 192.168.73.1 sem validação prévia no VirtualBox indisponível; essa exceção vale para esta operação e não remove o laboratório como padrão. Registros históricos anteriores conservam a cronologia.

Continuação em 05/11/2026: “pode ir fazendo e alterando ambiente real para validar mais rapido” autoriza a sequência incremental desta investigação no W6x 192.168.73.1 sem VM prévia. Não exige nova confirmação entre lotes dentro desse escopo.

## Classificação QoS — continuação autorizada em 05/11/2026

Após os testes do lote 019 e a solicitação de prosseguir, o lote 020 corrige a fronteira WAN antes do IFB: DSCP externo é limpo preservando ECN; ctinfo pode restaurar a marcação registrada localmente, sem prioridade CAKE fixa sobrepondo-a. A ausência de pedit/csum degrada para Best Effort; ausência de ctinfo deixa CS0. Retira-se a promoção genérica de UDP/ECT(1) no ingress e de UDP por exclusão no include nft, preservando regras explícitas de jogos e controle. HFSC mantém CS4 restaurado na mesma classe em todos os tamanhos. Conexões já marcadas não são apagadas; confiança/classificação LAN e regras explícitas amplas ainda exigem revisão. Não altera taxas, GSO, RAM ou curvas HFSC neste lote.

## Doctor e guardas — auditoria solicitada em 05/11/2026

DEC-009: o pedido desta auditoria prioriza observabilidade e recomendações não destrutivas. `--auto`, cron e hotplugs passam a diagnosticar sem autocura de rede. A chave legada `doctor.auto_heal` continua habilitando/desabilitando o agendamento. Watchdog web e verificação de firewall no boot deixam de matar processos, reescrever rede ou colocar regras de terceiros em quarentena. Nenhuma mitigação autônoma de rede entra na lista permitida sem contexto, propriedade, teste e reversão demonstrados.

O caminho manual `--fix` ainda contém reparos históricos não transacionais; permanece explicitamente parcial no contrato. A proposta de executor por ação e os riscos remanescentes estão em [DOCTOR_SAFETY_MODEL](../DOCTOR_SAFETY_MODEL.md). A exceção física de QoS anterior não foi utilizada nesta auditoria ampla.
