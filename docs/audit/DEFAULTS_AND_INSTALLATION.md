# Padrões, instalação e migração

Procedimento da etapa 003. Não há novos padrões de produto definidos neste documento.

Referências existentes: [INSTALL](../INSTALL.md), [ciclo de instalação/remoção](../LIFECYCLE_INSTALL_AND_UNINSTALL_GUIDE.md) e [perfis](../PACKAGE_PROFILES.md). Confirme alegações contra os instaladores e a configuração efetiva.

## Valores e precedência

Para cada parâmetro, rastreie pacote, hardware, configuração existente, migração, ambiente, argumento, formulário e fallback do backend. Descubra a precedência; não a deduza da ordem desta lista.

Distinga: opção inexistente, campo omitido, string vazia, string `"0"`, número `0`, booleano `false`, JSON `null`, lista vazia e valor inválido. Teste também `0` como automático, ilimitado ou desativado somente quando essa semântica estiver implementada/definida.

| ID/campo | Tipo/unidade | Fonte e símbolo | Padrão limpo | Ausente | Vazio | Zero | Null/false | Inválido | Existente | Valor efetivo/teste |
|---|---|---|---|---|---|---|---|---|---|---|
| A preencher por função | Não inferir | Revisão + localização | Observado | Resultado | Resultado | Resultado | Distinguir ambos | Erro/fallback | Preservado/migrado | Evidência |

Prioridades: SSID, rádio, senha/criptografia, endereçamento, DNS/DHCP, AdGuard/adblock se implementados, SQM/limites, offloading, telemetria, histórico, LEDs e intervalos. Ausência de pacote difere de serviço parado, desativado ou com falha.

Registre senhas apenas como `ausente`, `preservada`, `gerada`, `exigida` ou `substituída`. Se campo vazio gerar rede aberta, impedir ativação ou restaurar outro valor, comprove e explicite. Nunca preencha este catálogo com credenciais reais.

Confirme que a interface exibe o estado efetivo, não um fallback visual diferente do aplicado.

## Matriz de instalação

| Cenário | Preparação | Preservar/criar/migrar | Conflitos | Falha/recuperação | Teste/evidência |
|---|---|---|---|---|---|
| Limpa | Sem configuração prévia | Levantar defaults reais | Dependências/portas | Instalação parcial | Pendente |
| Reinstalação | Mesma versão | Idempotência e personalização | Duplicação de hooks/regras | Nova tentativa | Pendente |
| Atualização | Versão anterior suportada | Migração de chaves e serviços | Formato antigo | Rollback compatível | Pendente |
| Configuração residual | Antiga/incompleta/inválida | Identificar propriedade | Seção órfã ou de terceiro | Erro explícito | Pendente |
| Serviço preexistente | Ativo, parado ou desativado; testar cada um | Preservar intenção do usuário | Porta, DNS, DHCP, firewall | Não substituir silenciosamente | Pendente |
| Personalizada | Valores fora dos defaults | Preservar customizações | Política do instalador | Backup restrito ao necessário | Pendente |
| Dependência ausente | Ausente ou incompatível | Estado incompleto explícito | Compatibilidade | Reexecução segura | Pendente |
| Interrupção | VM descartável com snapshot | Atomicidade e recuperação | Meio aplicado | Nova tentativa | Pendente |
| Remover/reinstalar | Serviço em uso | Distinguir dados próprios e alheios | Resíduos | Política de retenção | Pendente |
| Lite↔Full | Somente transições suportadas | Dependências e opções | Serviço removido ainda ativo | Reversibilidade | Pendente |
| Restaurar backup | Versão/perfil conhecidos | Compatibilidade | Serviços ativos | Restaurar com coordenação | Pendente |
| Downgrade | Verificar suporte primeiro | Migração reversa | Incompatibilidade | Se não suportado, comprovar restrição | Pendente |

Não remova registros que parecem antigos sem confirmar sua propriedade. Migrações devem suportar nova tentativa sem duplicação nem sobrescrita silenciosa.

## Discussão de mudanças

| ID | Atual comprovado | Cenário/impacto | Proposta | Migração/compatibilidade | Decisão |
|---|---|---|---|---|---|
| Preencher após inspeção | Fonte + teste | Quem será afetado | Alternativa | Configuração existente e rollback | Link para DECISIONS |

Uma recomendação não é padrão atual nem autorização para mudança de comportamento.
