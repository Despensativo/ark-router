# PUBG Mobile — três condições de rede no iPad (05/11/2026)

## Resultado principal

As três janelas reproduziram ausência de respostas de sondas externas e pausas de recepção em fluxos UDP do iPad, com trechos recorrentes próximos de 93 segundos. O iPad respondeu a 900/900 sondas locais. Isso sustenta investigar um fenômeno comum ao caminho WAN, não exclusivo da condição ExitLag ou da otimização nativa. Não identifica qual equipamento/trecho falha nem demonstra melhora/piora do ping do PUBG.

O usuário confirmou que deixou o jogo apenas aberto, sem acompanhar uma partida ou registrar o ping interno. Portanto, são testes de conectividade **com PUBG aberto**, não benchmark de latência durante combate. Não declarar vencedor entre as três opções.

## Método e condições

- iPad por cabo, IPv4 192.168.73.114; captura LAN restrita ao MAC do adaptador para incluir IPv4 e IPv6. Somente resumos textuais de cabeçalhos, sem PCAP persistente ou conteúdo de aplicação.
- W6x OpenWrt 25.12.6, kernel 6.12.112; CAKE ativo em todas as condições, 720 Mb/s download e 620 Mb/s upload, 64 MiB por direção; Autorate 0, prioridade gamer 1, ctinfo carregado e ações presentes.
- Cada janela: 600 segundos programados, com até ~2 segundos adicionais para fechamento dos processos. 300 sondas por destino, intervalo 2 s, timeout 1 s, originadas no roteador. CPU e qdiscs amostradas aproximadamente a cada 2 s.
- Não foram alterados roteador, taxas, motor ou filas durante a comparação. Hashes UCI sqm/firewall/equipe_dashboard ficaram iguais antes/depois. Handles CAKE e opções das qdiscs foram conferidos nas amostras. Tráfego dos demais dispositivos da rede não foi controlado.
- Condições de aplicativos declaradas pelo usuário. Nome exato da opção nativa não informado; seu estado no teste 1 não foi confirmado. Testes 2 e 3 tiveram os estados explicitamente confirmados.

| Condição informada | Horário de Brasília | Respostas iPad | Respostas 1.1.1.1 | Respostas 8.8.8.8 |
|---|---|---:|---:|---:|
| 1 — ExitLag ligado | 13:13:37–13:23:37 | 300/300 | 292/300 | 291/300 |
| 2 — ExitLag desligado + otimização nativa ligada | 13:33:04–13:43:06 | 300/300 | 293/300 | 292/300 |
| 3 — ExitLag e otimização nativa desligados | 13:44:51–13:54:51 | 300/300 | 293/300 | 293/300 |

Cada fração é resposta ICMP recebida entre 300 sondas; não é porcentagem de perda do jogo nem de todos os pacotes da Internet. Latências abaixo consideram somente respostas recebidas: períodos sem resposta não entram na média.

| Teste | iPad média / máximo (ms) | 1.1.1.1 média / máximo (ms) | 8.8.8.8 média / máximo (ms) |
|---|---:|---:|---:|
| 1 | 0.434 / 0.941 | 4.478 / 10.491 | 19.390 / 21.133 |
| 2 | 0.466 / 1.437 | 4.447 / 5.915 | 19.406 / 20.142 |
| 3 | 0.489 / 2.299 | 4.517 / 26.495 | 19.471 / 20.514 |

## Filas, CPU e memória

| Teste | Drops CAKE upload / download (incremento global) | Maior peak_delay amostrado upload / download (ms) | Maior ocupação amostrada de um núcleo | Menor MemAvailable (MiB) |
|---|---:|---:|---:|---:|
| 1 | 0 / 0 | 0.346 / 7.592 | 14.71% | 697.6 |
| 2 | 0 / 12 | 1.537 / 11.304 | 38.00% | 694.5 |
| 3 | 0 / 1 | 0.212 / 4.684 | 10.63% | 705.2 |

Os contadores CAKE são globais; os drops não podem ser atribuídos ao iPad/PUBG. `peak_delay_us` é a estatística do scheduler observada nas amostras, não o máximo garantido de todos os pacotes nem RTT externo. Não houve saturação de CPU observada ou fila persistentemente elevada nas amostras. A memória disponível permaneceu ampla; não é teste da capacidade máxima do hardware.

O tráfego agregado da rede variou: médias amostradas de download aproximadamente 0,90 / 3,65 / 0,26 Mb/s. Por isso, diferenças de CPU/drops entre condições não medem o custo do ExitLag ou da opção nativa. Os testes não saturaram os links e não comparam CAKE contra HFSC.

## Pausas e recorrência

Foram observadas pausas de recepção no principal fluxo UDP de cada janela, frequentemente próximas de 2,1 segundos, com envio do iPad ainda observado durante o intervalo. Algumas pausas coincidem aproximadamente com sequências sem resposta em ambas as sondas externas. A mediana dos intervalos consecutivos entre inícios de pausas selecionados na faixa de 90–96 s foi 93.006 s. Essa seleção descreve uma periodicidade candidata; não prova temporizador específico nem causa. Também há pausas fora desse padrão.

Exemplos de recepção interrompida, horários de Brasília:

| Teste | Intervalo observado | Duração | Pacotes de envio observados no mesmo fluxo durante a pausa |
|---|---|---:|---:|
| 1 | 13:16:26.283–13:16:28.384 | 2100.9 ms | 45 |
| 1 | 13:17:59.262–13:18:01.428 | 2165.8 ms | 44 |
| 1 | 13:19:32.293–13:19:34.405 | 2111.1 ms | 30 |
| 1 | 13:21:05.278–13:21:07.379 | 2100.8 ms | 45 |
| 1 | 13:22:38.336–13:22:40.438 | 2101.2 ms | 46 |
| 2 | 13:33:29.344–13:33:31.472 | 2128.6 ms | 43 |
| 2 | 13:35:02.299–13:35:04.363 | 2064.2 ms | 45 |
| 2 | 13:36:35.296–13:36:37.413 | 2116.7 ms | 39 |
| 3 | 13:46:11.553–13:46:13.624 | 2071.2 ms | 11 |
| 3 | 13:47:26.280–13:47:28.402 | 2121.8 ms | 36 |
| 3 | 13:48:59.286–13:49:01.409 | 2122.8 ms | 41 |
| 3 | 13:50:32.296–13:50:34.412 | 2116.0 ms | 46 |
| 3 | 13:52:05.303–13:52:07.366 | 2063.3 ms | 42 |

Uma pausa no fluxo capturado não é, sozinha, perda comprovada: a aplicação pode parar de receber/enviar dados, trocar conexão ou servidor. Também não se mede RTT de UDP criptografado pelo intervalo entre pacotes. Entretanto, a repetição com duas sondas externas independentes do processo PUBG torna relevante investigar o caminho comum. O [diagnóstico de 29/10](../../DIAGNOSTICO_W6X_SONDAS_WAN_2026_10_29.md) já registrava pausas e hipótese de intervalo próximo de 93 s, antes da instalação atual de ctinfo; isso orienta a investigação, sem estabelecer causa ou excluir o roteador.

## Captura e contadores de interface

- Teste 1: captura LAN textual válida, sem registros UNSUPPORTED, mas estatística final de drops do capturador indisponível pelo método de encerramento. Uma captura complementar na WAN produziu formato de enlace não suportado; foi descartada e seus dados não foram usados.
- Testes 2 e 3: encerramento controlado do capturador; ambos reportaram **zero pacotes descartados pelo kernel na captura**. Isso se refere ao observador, não à Internet nem ao CAKE.
- No trecho adicional monitorado do teste 3, contadores rx_errors/tx_errors/rx_missed_errors/tx_carrier_errors de eth1 não aumentaram. O ethtool expôs rx_checksum_errors histórico de 1655 na consulta inicial; não é evidência de erro CRC/FCS atual. O RX dropped de eth1 aumentou 70 no intervalo, em incrementos regulares de 2 por amostra de 10 s. Esse contador genérico não identifica fluxo, causa ou perda no cabo, e seu padrão não coincide automaticamente com as pausas de ~93 s. Não culpar o cabo/ONT por esse número isolado.
- Os contadores de erro DSCP das ações ctinfo permaneceram em zero nas amostras das três janelas. Isso não comprova prioridade final correta das classes; os achados anteriores de classificação continuam abertos.

## Conclusão e próximo passo

Há um indício consistente de ocorrência no caminho compartilhado da WAN nas três condições, com LAN responsiva. A investigação precisa separar datapath/driver e configuração WAN do W6x, enlace até a ONT, ONT e caminho da operadora. Os dados não localizam a origem; não justificam atribuí-la ao PTT, fibra, ExitLag, servidor do PUBG ou CAKE isoladamente.

Não reduzir mais as taxas nem aumentar memória como resposta automática a essas pausas: esta janela não mostrou uma fila CAKE da ordem de segundos ou esgotamento de recursos. Próxima investigação útil: sondas simultâneas ao primeiro salto e dois destinos, validação do instante de saída/chegada na WAN com captura corretamente decodificada e correlação com contadores/eventos do enlace/ONT. Deve manter o perfil estável e distinguir timeout/perda de resposta de atraso confirmado por pares request/reply.

Para escolher uma otimização para jogar, ainda será necessário teste em partida com ping interno observado, mesma região/modo e condições repetidas. As diferenças de uma ou duas respostas entre estas janelas não sustentam declarar uma opção superior.

## Evidências e encerramento

Métricas selecionadas em `docs/audit/evidence/qos-2026-11-05/pubg-abc-result.json`; cabeçalhos privados, análises e scripts em `Evidencias locais/PUBG-ABC-2026-11-05/`, fora do Git. Nenhum processo de captura criado para o teste permaneceu ativo após a checagem final. Sem alteração funcional ou implantação neste lote; sem reboot, partida ativa ou teste de throughput máximo.
