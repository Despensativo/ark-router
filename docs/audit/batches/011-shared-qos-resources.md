# Lote 011 — orçamento compartilhado CAKE/HFSC (05/11/2026)

## Entrega

Biblioteca `root/usr/lib/ark/qos-resources.sh` compartilhada pelo runtime CAKE e pelo script HFSC. O teto conjunto das filas gerenciadas passa a ser repartido por direções SQM ativas; reserva mínima de duas cotas mantém o limite anterior por instância em instalações com uma WAN, inclusive upload-only. Direção desativada/taxa zero não adiciona cota. O inventário reconhece filhos CAKE-mq configurados, registrados ou candidatos antes da primeira promoção, reservando conservadoramente uma cota por TX queue. Presença de módulo/candidato não significa operação validada.

Mantidas as faixas de teto CAKE anteriores para uma WAN bidirecional: 4/16/32/64/128/256 MiB por instância. O total correspondente é 8/32/64/128/256/512 MiB, dividido pelas cotas; arredondamento em KiB é para baixo. Não é alocação antecipada, nem inclui todos os metadados/estruturas do kernel. Não controla filas externas não pertencentes ao ARK.

HFSC distribui o teto da direção em RT/BE/Bulk = 25%/50%/25% de **memória**, sem alterar as proporções de banda das classes. Roteadores pequenos deixam de ter tetos HFSC maiores que o orçamento comum. Fallback de parâmetros ECN avançados mantém `memory_limit`; se esse limite não puder ser instalado, a criação da fila falha e propaga erro, permitindo o tratamento de rollback existente. Compatibilidade com kernel legado ainda requer execução real nessa plataforma.

`ark_sqm_sync_memory_limits` atualiza apenas `eqdisc_opts`/`iqdisc_opts` de filas habilitadas pertencentes ao ARK (`ark_engine=cake`) com scripts CAKE conhecidos, antes do restart verificado. Preserva outras opções e taxas, normaliza limites duplicados e não pede commit se já correto. Erro no commit impede iniciar o serviço. Scripts externos não são reescritos. O orçamento entra em vigor nos caminhos ARK de aplicação/restart; editar UCI e reiniciar SQM diretamente fora do ARK pode ignorar a sincronização CAKE.

Novo comando somente leitura: `equipe-dashboard-control sqm-resource-plan`. Informa CPU, RAM, teto conjunto, cotas, tetos CAKE/HFSC e presença de módulos candidatos. `capacity_measured=false` e `capabilities_validated=false` distinguem inventário/política de homologação. Não escolhe motor por benchmark nem implementa coletor Autorate.

## Validação executada

- 15 métodos locais de recursos: seis faixas de RAM, múltiplas WANs, direções desativadas/zero, dados RAM inválidos/ausentes sem ler o host, arredondamento, filhos MQ atuais e potenciais, idempotência, preservação de taxas/opções, configuração externa, duplicatas, commit com falha e classificação da ação como somente leitura.
- 28 métodos de confiabilidade: inclui memória total das três folhas HFSC e recusa de fallback sem limite. O teste de fallback opcional agora simula ausência de `ce_threshold_selector`, não ausência do limite obrigatório de memória.
- Runner local completo aprovado, incluindo WAN 35, demais suites integradas, contratos 74, shell/estado/docs, i18n estrito, CODE_MAP e minificação. Suíte separada de hardware não reexecutada; as três falhas preexistentes documentadas no lote 007 não foram promovidas a aprovação.
- Hardware W6x, UCI e configuração de RAM em diretórios temporários: duas WANs **simuladas** resultaram em 32 MiB por direção. Persistência conferida no arquivo e ausência de deltas pendentes. O primeiro adaptador de teste com `-P` retornava commit sem persistir o arquivo; foi corrigido para isolar configuração, overrides, save path e pesquisa de deltas com `-c/-C/-t/-p`. Essa falha foi da infraestrutura de teste; configurações reais e campos UCI reais foram conferidos intactos.
- Kernel TC real em IFB descartável: CAKE aceitou `memlimit 32M`; árvore HFSC instalada e verificada com folhas 8/16/8 MiB, soma 32 MiB. IFB removido ao sair. Isso prova aceitação dos limites e estrutura pelo kernel 6.12.112, não desempenho sob carga nem Dual-WAN real.
- VM não utilizada, conforme autorização expressa para validação direta no W6x. Nenhum frontend alterado.

## Aplicação no W6x 192.168.73.1

Quatro arquivos instalados atomicamente por arquivo, sob trava de mutação, após conferir identidade, hashes anteriores e candidatos, sintaxe e backup. Arquivo novo instalado antes dos consumidores. Rollback por trap em erro/sinal durante a instalação; backup também copiado e verificado no Mac. A aplicação teve retorno zero.

Plano real após aplicação: 4 CPUs, 1010036 KiB de RAM (~986 MiB), duas cotas, teto conjunto 128 MiB; CAKE 64 MiB por direção, HFSC 16/32/16 MiB por direção. São tetos calculados; HFSC não substituiu o CAKE ativo. `ctinfo_module_present=false`, `cake_mq_candidate_present=false`.

Hashes de `/etc/config/sqm`, firewall e equipe_dashboard e saída das qdiscs WAN/IFB ficaram idênticos antes/depois. **Sem restart SQM, mudança de motor ou taxa**: CAKE continua 720 Mb/s download e 620 Mb/s upload. Backup local em `Evidencias locais/QoS-011-2026-11-05/backup.tar.gz`, SHA-256 `267d348c746c443b7895f14df7d731895f2e9e12937197becd3c46a260926123`.

| Arquivo instalado | SHA-256 |
|---|---|
| `/usr/lib/ark/qos-resources.sh` | `689f7b719c234ba7d06f987b1a2342d21a1789988314db56fe9743c99231da76` |
| `/usr/lib/ark/common.sh` | `29d8e7369b0abe74be88aa519b24f436ff5108e9f3178d4b2777d04116e1e5b7` |
| `/usr/lib/ark/modules/sqm.sh` | `bf59c37efcbb1fe7b3a89686dd586e36fb2e67ed20a18844a529a009a06cd1d6` |
| `/usr/lib/sqm/ark_hfsc_fqcodel.qos` | `b170991681b0abd0454e9531a8dcf9f2daf627e808a3c0f1a23018ab32fb0341` |

Para retorno, restaurar os três arquivos existentes e `/etc/config/sqm` do backup, remover a biblioteca nova e conferir os hashes anteriores. Como não houve mudança da configuração ativa nem de qdisc, o retorno deste lote não exige restart.

## Pendências e retomada

A política continua baseada em faixas conservadoras, sem calibrar capacidade da CPU. Próximos passos: corrigir classificação ingress/bidirecional e fronteira de confiança; comparar os dois motores com métricas de aplicações e CPU por núcleo; implementar controlador real por WAN/direção; homologar hardware fraco, links variáveis, VPN e ciclo de boot/hotplug. Não houve partida, reboot, troca real para HFSC ou prova de desempenho máximo neste lote. Não publicar como “dois melhores perfis” com esta evidência.
