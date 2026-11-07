# Lote 019 — Testes nativos para decidir ajustes de QoS

05/11/2026. Continuação experimental da [pesquisa 018](018-deep-cake-hfsc-parameter-research.md), autorizada diretamente no W6x 192.168.73.1. Acer Predator W6x/MT7986A, quatro CPUs, aproximadamente 986 MiB de RAM, ARK 2.2.1/OpenWrt 25.12.6/kernel 6.12.112. Cliente de carga: Mac por Ethernet. Sem alteração de código funcional, interface, firmware ou ONT, sem reboot e sem validação em VM neste lote.

## Decisões sustentadas

1. **Manter no-split-gso neste W6x a 720/620 Mb/s.** Nas duas repetições, split-gso reduziu a vazão e a responsividade. Isso não estabelece um padrão universal para hardware e enlaces diferentes.
2. **Manter CAKE como perfil operacional atual.** A comparação curta entre os perfis não apresentou vantagem consistente que justifique migrar para HFSC.
3. **Priorizar a autoridade de classificação.** Um teste com pacotes reais reproduziu a sobreposição de DSCP pela prioridade explícita. Ainda falta validar e corrigir a política completa nas duas direções e famílias IP.
4. **Rever as curvas HFSC em enlaces lentos e explicitar a política ECN.** O kernel aceitou os parâmetros questionados; aceitação não demonstra adequação de latência, equidade ou throughput.
5. **Incluir processamento por núcleo e filas físicas na adaptação.** Sob carga, houve amostras próximas de 100% em núcleos individuais. A disponibilidade de RAM e o número de CPUs não demonstram capacidade máxima de shaping.

## Método e limites comuns

As alterações foram incrementais, com identificação SSH do alvo, backup privado, watchdog de retorno preparado antes das trocas e comparação posterior dos hashes de configuração. Foram usados `networkQuality -I en6 -M 45 -c`, sondas ICMP e telemetria de CPU/qdiscs. O parâmetro 45 é o limite máximo: o teste adaptativo terminou após aproximadamente 10–17 segundos em cada execução. **Não foram testes sustentados de 45 segundos nem de dez minutos.** Houve duas execuções por condição, na ordem A/B/B/A ou CAKE/HFSC/HFSC/CAKE.

As medições incluem variação do caminho externo e tráfego doméstico. Os perfis têm políticas diferentes de classificação/AQM; compará-los não isola apenas o algoritmo. ICMP recebe tratamento prioritário e não representa a latência de todos os fluxos ou o ping dentro do PUBG. RPM é o indicador de responsividade do networkQuality; maior é melhor. Não houve partida, teste de equidade com múltiplos clientes, benchmark sustentado de baixa velocidade ou homologação universal.

## 1. CAKE: no-split-gso versus split-gso

Somente a opção GSO dos dois qdiscs foi trocada. Taxas, demais opções, handles e configurações persistentes foram preservados durante este experimento.

| Execução | Opção | Carga efetiva (s) | Download (Mb/s) | Upload (Mb/s) | RPM | ICMP Cloudflare p95 (ms) |
|---|---|---:|---:|---:|---:|---:|
| A1 | no-split-gso | 17,01 | 531,851 | 362,239 | 1250,31 | 7,712 |
| B1 | split-gso | 16,18 | 305,063 | 187,884 | 880,13 | 40,197 |
| B2 | split-gso | 17,15 | 320,246 | 231,017 | 748,55 | 54,789 |
| A2 | no-split-gso | 15,09 | 637,096 | 379,869 | 1324,33 | 14,834 |

Janelas iniciadas entre 16:01:15 e 16:02:43 BRT. A reversão final voltou a melhorar os resultados. CPU máxima amostrada por núcleo: 99,50%, 99,51%, 100% e 93,84%, respectivamente; apenas seis a oito intervalos de CPU de dois segundos por execução. O custo de segmentação é uma explicação compatível, mas este desenho não prova que ele seja a única causa da diferença.

B2 teve lacunas internas nas sequências de peer/Cloudflare/Google; B1 não teve. A recorrência WAN já investigada pode afetar B2, sem explicar por si só a piora também em B1. Não atribuir essas ausências automaticamente ao GSO. Picos amostrados nas tins de download com no-split chegaram a aproximadamente 43/51 ms, apesar do ICMP menor: não há comprovação de todas as filas abaixo de poucos milissegundos.

## 2. Perfis reais: CAKE versus HFSC/FQ-CoDel

Foram trocados temporariamente apenas os campos de motor/qdisc/script de `sqm.wan1`, usando os helpers implantados de restart, sincronização de offload e verificação. Taxas 720/620 Mb/s, overhead44/mpu64 e offload0/0 foram mantidos. Não houve reconexão PPPoE; os restarts SQM recriaram filas e contadores.

| Execução | Perfil | Carga efetiva (s) | Download (Mb/s) | Upload (Mb/s) | RPM | ICMP Cloudflare p95 (ms) |
|---|---|---:|---:|---:|---:|---:|
| C1 | CAKE | 9,76 | 536,273 | 252,257 | 1252,13 | 8,999 |
| H1 | HFSC | 14,99 | 464,805 | 319,614 | 1117,57 | 11,848 |
| H2 | HFSC | 15,73 | 485,868 | 311,141 | 1015,05 | 15,474 |
| C2 | CAKE | 16,91 | 518,881 | 362,315 | 985,46 | 24,365 |

Inícios entre 16:09:01 e 16:10:35 BRT. CAKE teve maior download nas duas repetições; upload e responsividade não deram vencedor consistente entre os perfis. Houve núcleos próximos de 100% em ambos. Menor CPU com menor vazão não prova maior eficiência. H2 teve lacunas externas simultâneas; C1 teve duas lacunas apenas em Cloudflare. Não atribuir toda resposta ausente a uma causa comum.

## 3. HFSC nativo em IFB isolado

O script implantado foi exercitado em `q019hf`, com classes reais no kernel, a 1, 5, 620 e 720 Mb/s. Sem tráfego de desempenho nesse IFB. O teste confirma construção e parâmetros, não latência ou vazão nessas taxas.

| Taxa (Mb/s) | RT m1 (Mb/s) | RT m2 / LS (Mb/s) | RT m2 em relação à taxa |
|---:|---:|---:|---:|
| 1 | 0,9 | 0,45 | 45% |
| 5 | 4 | 2 | 40% |
| 620 | 248 | 124 | 20% |
| 720 | 288 | 144 | 20% |

O breakpoint RT de 1 ms e os targets fixos foram aceitos. Com `noecn` solicitado, RT permaneceu ECN em todos os casos; BE/Bulk ficaram sem ECN em 1/5 Mb/s e com ECN em 620/720 Mb/s. BE aceitou `ce_threshold` próximo de 1,5 ms com seletor ECT(1); RT/Bulk não tinham esse limiar. O teste não demonstra operação L4S completa.

O `tc -j` deste firmware gera JSON inválido para o root HFSC (`default` sem chave JSON) e classes com fragmentos textuais. A primeira falha foi do formato de saída, não da instalação do motor. A verificação usou texto para classes e normalização restrita ao campo conhecido do root para ler os leaves. Há ainda um registro vazio de download durante a restauração SQM, às 19:10:25 UTC, fora de todas as janelas de carga; não foi tratado como dado válido.

## 4. Prioridade explícita versus DSCP: reprodução com pacotes

Foi criado um CAKE temporário em `q019class`, com filtro ingress restrito a UDP do Mac para o W6x e porta de diagnóstico. Foram enviados 20 datagramas CS4 por fase. A segunda execução também restringiu a porta de origem e verificou fila vazia e requeues.

- Com `skbedit priority 55:2`, as 20 contagens ficaram em Best Effort.
- Sem a prioridade explícita, as contagens ficaram em Voice, coerente com CS4. Foram observadas 21 contagens para 20 datagramas injetados, nas duas execuções. Uma contagem excedente permanece sem explicação; não está demonstrada contabilidade individual 1:1 nessa fase.

A direção da seleção de classe foi reproduzida, sustentando o mecanismo de Q05. O DSCP foi definido pelo socket de teste; isso não é teste ponta a ponta de restauração ctinfo nem prova de causa dos picos no jogo. O filtro temporário e o IFB foram removidos; o root LAN voltou ao `noqueue` original.

## Restauração e evidências

Conferência final por SSH: CAKE upload620/download720 Mb/s, diffserv4, NAT, dual-srchost/dual-dsthost, wash, no-ack-filter, no-split-gso, RTT100ms, overhead44/mpu64, memória64M por direção; ctinfo carregado. Os hashes SHA-256 de `/etc/config/sqm`, `/etc/config/firewall` e `/etc/config/equipe_dashboard` coincidem exatamente com o início. Os handles finais são 8059/805a, novos após restart esperado; não se preservaram os contadores anteriores. Nenhum IFB de diagnóstico ou watchdog armado permaneceu. A checagem pós-teste não encontrou novos eventos de OOM, watchdog, timeout TX ou queda do link WAN no intervalo observado.

Resumo estruturado sem credenciais: [decision-tests-result.json](../evidence/qos-2026-11-05/decision-tests-result.json). Scripts, séries e backups privados ficam em `Evidencias locais/QoS-019-decision-tests-2026-11-05/`, fora do repositório canônico. As verificações de consistência confirmam retorno e hashes nos dois experimentos de carga e limpeza dos dois testes de classificação.

As próximas mudanças devem tratar classificação confiável, curvas/ECN para baixa velocidade e orçamento completo das filas. Este lote não determina um novo teto ótimo para as 16 filas físicas, não calibra capacidade sustentada e não resolve a causa das pausas periódicas WAN registradas nos lotes 014–016.
