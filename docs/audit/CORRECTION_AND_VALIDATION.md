# Correção, regressão e evidências

## Antes de editar

1. Confira Git e preserve alterações existentes. Identifique fonte versus artefato gerado.
2. Leia a função inteira, seus chamadores/subchamadas e os consumidores dos recursos compartilhados.
3. Registre reprodução, comportamento esperado, hipótese e evidência. Buscas localizam; não substituem a leitura do fluxo.
4. Mapeie entradas/defaults, saídas/erros, permissões, serviços e alcance das escritas.
5. Crie teste reprodutor quando possível. Não considere retorno zero de subchamada como prova de resultado completo.

## Correção

Faça a menor mudança coerente, preserve contratos públicos ou submeta incompatibilidade para decisão. Não edite bundle no lugar da fonte. Não altere testes apenas para esconder falha. Mudança de padrão intencional deve estar aprovada em [DECISIONS](DECISIONS.md).

Evite restauração cega de defaults. Preserve diferença entre ausência e valor vazio. Snapshot/rollback de configuração compartilhada precisa respeitar mudanças posteriores de outros módulos.

## Validação por nível

| Nível | Prova possível | Não prova sozinho |
|---|---|---|
| Estrutural/estático | Sintaxe, IDs, referências, tipos | Funcionamento de rede ou reboot |
| Unitário com mocks | Contrato do código sob entradas controladas | Comportamento real do serviço/kernel |
| Integração na VM | Serviço, regras e tráfego no cenário virtual | Rádio/ASIC/desempenho físico |
| Hardware autorizado | Recurso físico naquele equipamento/cenário | Todos os modelos e topologias |

Execute testes direcionados e `tests/run_local_tests.sh` quando aplicável a mudanças de código/scripts. Inspecione efeitos da suíte antes de executá-la; ela pode gerar artefatos. Preserve alterações anteriores.

Alteração de UI exige DOM, console e screenshot real no ambiente de teste. HTTP 200 não basta. Alterações somente documentais exigem integridade de links, referências e diff; a validação visual LuCI não se aplica.

## Ciclo operacional

Teste por função aplicável: ativar → repetir → desativar → repetir → reativar; reiniciar serviço; reboot ativada; reboot desativada; desligar/iniciar normalmente. Confirme idempotência, limpeza operacional e retenção intencional da configuração.

Teste dependência atrasada, falha e recuperação. Corte abrupto apenas em VM descartável com snapshot verificado. Confirme novo boot por boot ID ou evidência equivalente, aguarde saúde efetiva com timeout; não use apenas atraso fixo.

Compare configuração, processos, serviços, interfaces, rotas, firewall, RPC e estado da interface. Não exija igualdade literal de campos dinâmicos (PID, timestamp, contador): defina invariantes funcionais.

## Integração

Teste A→B, B→A e concorrência aplicável. Inclua WAN/SQM/failover/PBR, VLAN/bridge, Wi-Fi/mesh/roaming, firewall/bloqueio, QoS/limites, Starlink/telemetria, Doctor/customização, backup/restauração e perfis. Leia [POLICIES_AND_EXCEPTIONS](POLICIES_AND_EXCEPTIONS.md) para regras de tráfego.

Registre alterações esperadas e inesperadas. Correção em utilitário compartilhado invalida os testes dependentes; quando o impacto não puder ser delimitado, amplie a regressão.

## Registro mínimo de teste

| Campo | Conteúdo obrigatório |
|---|---|
| Identidade | Test ID, feature IDs e lote |
| Código | Commit + identificação/hash das alterações locais pertinentes |
| Pacote | Hash do artefato realmente instalado, ou N/A em teste documental |
| Ambiente | VM, snapshot, OpenWrt, perfil, topologia e nível de emulação |
| Execução | Data, comandos, entradas sanitizadas e timeout |
| Expectativa | Contrato/decisão, antes de observar o resultado |
| Resultado | passou / falhou / bloqueado / não executado / não aplicável justificado |
| Evidência | Logs sanitizados, observações, capturas e limitações |
| Frescor | Alterações posteriores que invalidam o resultado |

Estado `funcional` no YAML é declaração de catálogo. Não substitui esse registro. Geradores não podem atribuir sucesso pela presença de `/etc/config` ou `procd`.

## Portão de release

Valide o pacote final instalado, além das fontes. Exija testes obrigatórios aplicáveis, migrações, regressão, documentação correspondente e recuperação. Falha/bloqueio em requisito de release impede aprovação; exceções dependem de decisão explícita registrada.

Informe limites de mocks e testes físicos pendentes. Alteração posterior no artefato exige nova avaliação. Aprovação técnica não autoriza commit, push, publicação ou deploy físico.

## Evolução dos contratos

O verificador atual confere parte da estrutura. No lote 001, formalize esquema, tipos, enums, IDs únicos, relações válidas e referências a testes; adicione casos negativos. Separe resultado executado de ciclo de vida e nível de validação. Migre sem renumerar IDs nem descartar conteúdo existente.

A descoberta de todas as ações dinâmicas exige revisão; nenhum scanner simples deve anunciar cobertura completa sem evidência.
