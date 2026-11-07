# Doctor: política de diagnóstico e reparo

Estado: revisão local de 05/11/2026 sobre a versão declarada 2.2.1; não publicada nem homologada em VM/hardware. Evidências e pendências no [lote 021](audit/batches/021-docs-runtime-doctor-audit.md).

## Comportamento implementado

| Entrada | Comportamento | Escritas permitidas |
|---|---|---|
| `ark-doctor`, `ark-doctor run`, `doctor-run` | Diagnosticar | Cache, log e lock temporários; sem reconfiguração de rede |
| `ark-doctor --auto` / `auto` | Diagnosticar silenciosamente, com intervalo mínimo de 60 s entre inícios | Cache/log/lock; nenhuma autocura, mesmo combinado com `--fix` |
| `doctor-status` | Ler último resultado; diagnosticar quando não há cache | O cache pode ser antigo: verificar `timestamp` |
| `doctor-log` | Ler histórico limitado | Nenhuma alteração operacional |
| `ark-doctor --fix`, `fix-run`, `doctor-fix` | Reparador manual legado | Ainda pode alterar UCI, rádio, rotas e serviços; não é um executor transacional seguro |

Os nomes `doctor-*` da tabela são ações de `/usr/sbin/equipe-dashboard-control`, não objetos ubus independentes. O LuCI usa `file.exec` para chamar esse controlador. O grupo ACL de escrita é obrigatório para executar o controlador completo e `nlbwmon-action`. O grupo de leitura conserva as consultas nativas permitidas; um usuário apenas de leitura não tem todo o dashboard disponível enquanto não existir uma fachada RPC restrita.

`equipe_dashboard.doctor.auto_heal` é uma chave legada: `0` desliga diagnósticos agendados; `1` os habilita. Ausência mantém diagnóstico habilitado. Não autoriza reparos. Cron e hooks `iface/net/firewall` continuam observando eventos; novas instalações não alteram `/sbin/reload_config`. Um hook de versão anterior que ainda invoque `--auto` também obedece à política observacional do código atualizado.

## Severidade e resultado

- `OK`: nenhuma divergência na verificação executada. Não garante conectividade, ausência de regras desconhecidas ou desempenho.
- `WARN`: indicação que exige contexto, preferência do usuário ou dado indisponível. Não dispara ação.
- `FAIL`: incoerência detectada pelo teste específico. Não autoriza automaticamente a correção.
- `FIXED`: resultado histórico do caminho manual. Existem ramos que não verificam retorno/pós-condição; não usar esse rótulo como prova de recuperação.
- `busy: true`: outra auditoria detém o lock; nenhum novo resultado foi produzido. Não apresentar cache anterior como auditoria recém-executada.

As contagens de avisos e falhas derivam dos checks emitidos. Flash desconhecida gera aviso, nunca capacidade fictícia. Até 2048 KiB livres gera aviso; o Doctor não remove locks de pacotes, arquivos temporários de terceiros ou regras de firewall para liberar espaço.

Em fw4, o Doctor consulta tabelas legadas já presentes em `/proc/net/*tables_names` sem executar wrappers iptables. Essa leitura indica tabelas carregadas, não a origem ou o conteúdo de todas as regras. Arquivos e pacotes suspeitos permanecem intactos inclusive no reparo manual fw4. Migração requer o fluxo específico do recurso.

## Concorrência e ciclo de eventos

Lock com PID vivo não expira por idade. Lock sem PID é tratado como ocupado: pode estar entre `mkdir` e publicação do dono. PID comprovadamente encerrado permite recuperação serializada; a liberação do Doctor verifica sua propriedade. Um lock incompleto após interrupção nesse intervalo exige investigação, não remoção automática por suposição. Sinais encerram a auditoria após liberar sua posse.

A coalescência impede auditorias simultâneas e reduz rajadas sequenciais. Não constitui garantia de custo zero, nem mantém um snapshot atômico de toda a rede: outro subsistema pode mudar enquanto o diagnóstico observa. O próximo evento/cron atualiza o estado. Não houve teste de custo de CPU ou latência em hardware neste lote.

## Risco ainda presente no reparo manual

O argumento `--fix` seleciona muitos reparos de uma vez. Há commits e reinícios separados, erros suprimidos, padrões inferidos por protocolo e mudanças sem snapshot. Entre os exemplos estão overhead SQM, MTU, parâmetros de rádio, usteer, DNS/DoH, IPv6, pacotes no fw3 e timezone. Estes ramos não foram homologados por esta auditoria. O caminho automático não os executa.

O contrato `ARK-DIAG-001` está parcial por esse motivo. A retirada da autocura automática é a contenção já implementada, não a conclusão da migração de todos os reparos.

## Executor proposto para substituir `--fix` em lote

1. Cada check tem ID estável, observação, severidade, pré-condições, recursos próprios e recomendação. Ausência de informação resulta em estado desconhecido.
2. Um plano explícito contém somente a ação selecionada, diferença de configuração, impacto, dependências e reversão. Nunca contém senhas/tokens em relatórios.
3. O executor adquire o lock, relê o estado e confirma que ainda corresponde ao plano. Mudança concorrente invalida o plano.
4. Preserva valores, listas e ausência de opções, com marcador de propriedade por recurso. Repetir a ativação não substitui o snapshot original.
5. Aplica apenas o conjunto próprio e agrupa um reload por serviço. Falha de comando impede anúncio de sucesso.
6. Testa pós-condições: processo saudável não prova DNS funcional, e UCI gravado não prova tráfego. Falha reverte o conjunto próprio e preserva dados suficientes para diagnóstico.
7. Mitigação automática somente para ações da lista permitida, com falha persistente observada, orçamento de tentativas e intervalo entre tentativas. Reinício de rede, rádio, firewall, mudança de DNS, rotas ou pacotes fica fora dessa lista por padrão.

A lista automática de mutações de rede permanece vazia nesta revisão. Este plano ainda requer implementação por subsistema e validação VirtualBox fw3/fw4, reinício, perda de link, falha de serviço e concorrência antes de qualquer promoção.
