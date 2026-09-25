# Políticas, precedência e exceções

Procedimento das etapas 006/007. Nenhuma política nova é aprovada por este documento.

## Contrato da política

Separe intenção do usuário → configuração persistente → regras geradas → regras carregadas → tráfego observado. Não suponha que a última regra ou a mais específica vence. Determine a semântica do backend e sua ordem real.

Para cada regra registre ID, módulo/origem, dispositivos/grupos, zonas/interfaces, origem/destino, IPv4/IPv6, protocolo/portas, horário, ação, cadeia/hook/prioridade quando aplicáveis, exceções, conexões novas/estabelecidas e comportamento após reload/reboot.

Diferencie acesso ao roteador, tráfego encaminhado e tráfego originado pelo roteador. Considere bridges e tráfego que não percorra o caminho presumido.

## Tabela de decisão antes do teste

| Caso | Política principal | Exceção | Tráfego | Resultado desejado | Regra efetiva | Observado/evidência |
|---|---|---|---|---|---|---|
| POL-EX-01 (exemplo de teste) | Bloquear internet do cliente fictício | Permitir destino/porta específicos | Dentro da exceção | Permitido, se política aprovada | Rastrear | Não executado |
| POL-EX-02 (exemplo de teste) | Mesma política | Mesma exceção | Outro destino/porta/protocolo | Bloqueado | Rastrear | Não executado |

Estes exemplos são cenários, não padrões a instalar. Expectativa ambígua vai para [DECISIONS](DECISIONS.md); avance em trabalho independente.

## Cobertura obrigatória por política aplicável

- Bloqueio geral + liberação específica; liberação geral + bloqueio específico.
- Sobreposição por dispositivo, grupo, zona e destino; duplicatas, contradições e regras inalcançáveis.
- Criar exceção antes/depois da principal; desativar, reativar e excluir cada uma.
- A→B e B→A; concorrência quando possível; reload, restart e reboot.
- Políticas existentes do usuário e de outros pacotes.
- Mudança de endereço/identidade do cliente; IPv4 e IPv6 separados.
- Conexões novas e estabelecidas; efeito real do conntrack e de offloading.
- NAT, redirecionamentos, PBR e failover; verificar o caminho selecionado.
- Falha de dependência, regra inválida e interrupção durante aplicação; verificar possível janela de liberação indevida.

Toda exceção deve provar a liberação prevista e a manutenção do bloqueio nos casos vizinhos (outra porta, destino, origem, família ou protocolo). Nenhuma exceção pode ampliar o escopo silenciosamente.

Preserve o acesso administrativo previsto. Documente a política de falha de cada recurso, em vez de impor fail-open ou fail-closed universalmente.

## Evidência operacional

Use cliente e destino de teste no laboratório. Confirme disponibilidade do destino antes de atribuir falha ao firewall. Correlacione tráfego, contadores/capturas/rastreamento e regra aplicada quando necessário.

Um ping falhar ou um contador existir não comprova sozinho o contrato inteiro. Inspecionar UCI também não comprova o resultado de tráfego.

Bloqueio DNS não equivale automaticamente a bloqueio integral de tráfego. Para promessas por domínio/aplicação, documente identificação e caminhos alternativos relevantes (cache, IP direto, DNS externo/criptografado e protocolos diferentes, conforme o recurso).

Referência já existente para exceções de bloqueio: [ADBLOCK_WHITELIST_CATALOG](../ADBLOCK_WHITELIST_CATALOG.md). Verificar código e regras atuais antes de adotar as conclusões do catálogo.

## Relatório de conflito

| Política/ID | Recurso compartilhado | Conflito observado | Impacto | Correção ou decisão | Reteste positivo | Reteste negativo |
|---|---|---|---|---|---|---|
| Preencher | Seção/chain/rota/serviço | Evidência | Escopo real | Referência | Permitido funciona | Proibido continua bloqueado |
