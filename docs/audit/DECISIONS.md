# Decisões da auditoria

## Aprovadas pelo usuário

| ID | Decisão | Consequência |
|---|---|---|
| DEC-001 | Testar primeiro em laboratório VirtualBox | Identificar VM e snapshot antes de testes operacionais |
| DEC-002 | Roteador físico somente por solicitação e confirmação explícitas | Aprovação virtual não permite deploy físico |
| DEC-003 | Auditoria pode corrigir defeitos | Diagnóstico, leitura de dependências e regressão são obrigatórios |
| DEC-004 | Discutir mudanças de padrões do produto | Documentar atual/proposta/impacto antes de implementar intenção nova |
| DEC-005 | Cobrir bloqueios, liberações e exceções | Confirmar permissões e bloqueios com tráfego no laboratório |
| DEC-006 | Trabalho incremental com continuidade em Markdown | Checkpoint por lote; leitura seletiva e evidências por revisão |
| DEC-007 | Não reiniciar o Windows hospedeiro | Reboots de teste restritos às VMs identificadas |
| DEC-008 | Sem commit, push ou publicação automática | Preparação local não autoriza distribuição externa |

Origem: requisitos e autorização desta conversa, consolidados em 2026-09-20. Não registrar segredos ou conteúdo privado.

## Organização adotada nesta entrega

- Reutilizar os 70 IDs e documentos existentes; não criar um segundo catálogo.
- Preservar geradores e contratos nesta etapa documental; registrar suas limitações antes da migração do lote 001.
- Usar caminhos relativos ao repositório. A letra do disco e o caminho do computador não fazem parte do contrato do produto.
- Resultados históricos sem evidência vinculada não serão promovidos a aprovação atual.

## Decisões de produto pendentes

Nenhum novo padrão de SSID, senha, DNS, AdGuard, firewall, QoS ou instalação foi aprovado por esta entrega.

| ID da proposta | Comportamento atual e evidência | Proposta | Impacto/migração | Decisão do usuário |
|---|---|---|---|---|
| A preencher por achado | Não presumir padrão | Descrever alternativa | Incluir configurações existentes | Pendente |

Preserve decisões substituídas com link para a sucessora. O resultado desejado do teste deve vir do contrato e da decisão aprovada, não de adaptação ao comportamento defeituoso.
