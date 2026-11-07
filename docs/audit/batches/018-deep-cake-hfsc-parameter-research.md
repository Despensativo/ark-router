# Lote 018 — Pesquisa técnica de CAKE e HFSC/FQ-CoDel

05/11/2026. Escopo confirmado pelo usuário: os dois perfis de QoS. Pesquisa em documentação dos mantenedores, RFCs, artigos dos autores e código Linux/iproute2/SQM, cruzada com o código local e leituras do W6x. Nenhum parâmetro foi alterado no roteador. A pesquisa sustenta decisões de implementação e testes; não constitui benchmark nem homologação.

Resultados posteriores: o [lote 019](019-native-decision-tests.md) executou a comparação GSO e dos perfis no W6x. A evidência nesse alvo favorece manter no-split-gso; a recomendação de pesquisar o padrão universal continua válida.

## Parecer

Há melhorias concretas além das já implementadas. A base do CAKE aproveita recursos relevantes do algoritmo, mas a classificação aplicada pelo ARK ainda interfere nessa política. O HFSC implementa uma árvore elaborada, porém vários parâmetros são heurísticas fixas: não demonstram adaptação completa ao hardware ou à diversidade dos links. Foram identificadas também filas físicas fora do orçamento comum dos shapers e refinada a avaliação de L4S.

A aplicação no W6x foi identificada como ARK 2.2.1/OpenWrt 25.12.6/kernel 6.12.112, MT7986A. Os hashes de `sqm.sh`, `ark_hfsc_fqcodel.qos`, `qos-resources.sh` e do include nft coincidem entre o equipamento e o repositório local. O kernel upstream 6.12 é referência; não se presume identidade binária com o kernel do equipamento. Manuais atuais podem conter recursos ausentes nessa imagem.

## 1. Parâmetros efetivos do CAKE

| Grupo | Em uso no W6x | Avaliação |
|---|---|---|
| Shaping | 720 Mb/s download, 620 Mb/s upload | Capacidade configurada; calibração máxima ainda pendente |
| Classes | diffserv4 | Quatro tins, mas política ARK precisa preservar a classificação pretendida |
| Justiça | dual-dsthost no download, dual-srchost no upload, nat | Escolha coerente para múltiplos clientes atrás do NAT |
| DSCP | wash e ctinfo; prioridades explícitas no ingresso | Há conflito de autoridade; wash não substitui validação de confiança antes do IFB |
| AQM | RTT100 ms nas duas direções | Não reduzir ao ping local de 2–20 ms sem avaliar os fluxos de maior RTT |
| GSO | no-split-gso; agregação habilitada; limites de tamanho8192 | Decisão de desempenho que precisa de comparação com split-gso |
| ACK | no-ack-filter | Coerente como baseline no link atual pouco assimétrico |
| Enquadramento | noatm, overhead44, mpu64 | Hipótese de encapsulamento; não é medida da contabilização da operadora |
| Memória | teto64 MiB por direção | Teto de segurança, não reserva nem acelerador de CPU |
| Paralelismo | PPP e IFB com uma TX queue cada | As 16 queues físicas não tornam esse CAKE automaticamente paralelo |

O artigo dos autores explica o isolamento por host e a utilidade do filtro de ACK em enlaces fortemente assimétricos. Esses recursos não justificam ativar todas as opções em qualquer link. [Høiland-Jørgensen, Täht e Morton, Piece of CAKE](https://arxiv.org/abs/1804.07617).

### R01 — Corrigir a autoridade de classificação antes de afinar as tins

Reconferido nos lotes 016/017 e no código: `skbedit priority` com handle válido sobrepõe a seleção por DSCP. Restaurar DSCP via ctinfo não elimina a prioridade anterior. A correção precisa de uma única política confiável por direção, com proteção das marcações locais e rejeição das não confiáveis; retirar a prioridade sem tratar a confiança pode reintroduzir marcações da operadora. Validar CS0/CS1/AF41/CS4 em IPv4 e IPv6. [Linux6.12, cake_select_tin](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c).

O wash do CAKE ocorre depois da classificação; portanto, não é por si um filtro de confiança de entrada. Os percentuais das tins diffserv4 são limiares do escalonador, não reservas rígidas nem tetos fixos. [Linux6.12, seleção e configuração das tins](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c).

### R02 — Reavaliar no-split-gso como padrão universal

O manual recomenda split-gso para menor latência e aponta no-split-gso como possibilidade de maior vazão acima de10 Gb/s. No W6x, no-split está ativo abaixo de1 Gb/s, com GSO/GRO habilitados. Isso merece A/B, não troca automática: segmentar custa CPU. [Manual CAKE](https://github.com/iproute2/iproute2/blob/main/man/man8/tc-cake.8).

O kernel possui caminho explícito de segmentação. Os máximos cumulativos observados incluíram pacotes maiores que a MTU; não são tamanho atual nem explicam sozinhos pausas de segundos. Ilustração aritmética:8192 bytes ocupam ~0,106 ms a620 Mb/s, mas ~65,5 ms a1 Mb/s, sem contar enquadramento. Uma escolha aceitável neste hardware pode ser ruim em outro cenário. [Linux6.12, sch_cake](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c).

### R03 — Manter opções coerentes sem transformar heurísticas em provas

Não há evidência para reduzir RTT100 ms ao ping do servidor mais próximo. ACK filtering deve depender do gargalo real da subida; o critério atual de assimetria5:1 é uma heurística. `autorate-ingress` estima pela chegada de tráfego e não substitui um controlador externo de atraso/carga. Se houver um controlador comum aos motores, ele deve ter propriedade exclusiva das taxas. [Manual CAKE](https://github.com/iproute2/iproute2/blob/main/man/man8/tc-cake.8), [artigo CAKE](https://arxiv.org/abs/1804.07617).

## 2. Parâmetros produzidos pelo HFSC/FQ-CoDel

HFSC estava inativo. A tabela abaixo é derivação estática do preset fibra para720/620 Mb/s; não é resultado físico de HFSC.

| Parâmetro | Real-Time | Best Effort | Bulk |
|---|---:|---:|---:|
| Classe | 1:10 | 1:20 | 1:30 |
| Inclinação LS de referência | 20% | 70% | 10% |
| RT m2 upload/download | 124/144 Mb/s | sem curva RT | sem curva RT |
| RT m1 upload/download | 248/288 Mb/s | — | — |
| Ponto de mudança da curva RT | 1 ms | — | — |
| target | 1,5 ms | 2,5 ms | 10 ms |
| interval | 30 ms | 40 ms | 100 ms |
| quantum | 500 B | 1514 B | 1514 B |
| flows | 512 | 1024 | 512 |
| limit | 2048 pacotes | 10240 pacotes | 4096 pacotes |
| memory_limit por direção | 16 MiB | 32 MiB | 16 MiB |
| ce_threshold seletivo ECT(1) | ausente | 1,5 ms, com fallback sem recurso | ausente |

O limite superior de cada classe foi configurado na taxa total. As inclinações descrevem a política de serviço; não significam que a capacidade ociosa fique inutilizável. `d=1ms` é o ponto de mudança da curva, não uma garantia de ping ou de atraso máximo de1 ms. [Manual HFSC](https://github.com/iproute2/iproute2/blob/main/man/man8/tc-hfsc.8), [teoria e limites do HFSC Linux](https://github.com/iproute2/iproute2/blob/main/man/man7/tc-hfsc.7).

### R04 — Ajustar target/interval ao RTT e à serialização

A RFC8290 orienta interval na ordem do maior RTT relevante e target compatível com a transmissão de um pacote. Fibra não implica RTT30–40 ms; podem existir destinos distantes. [RFC8290, seção5.2](https://www.rfc-editor.org/rfc/rfc8290.html#section-5.2).

Derivação do nosso script:

| Taxa configurada | RT m2 após os clamps | Percentual efetivo da inclinação | Serialização IPv4 de1500 B, sem overhead | target RT |
|---|---:|---:|---:|---:|
| 1 Mb/s | 450 kb/s | 45% | 12 ms | 1,5 ms |
| 5 Mb/s | 2 Mb/s | 40% | 2,4 ms | 1,5 ms |
| 10 Mb/s | 2 Mb/s | 20% | 1,2 ms | 1,5 ms |
| 620 Mb/s | 124 Mb/s | 20% | 0,019 ms | 1,5 ms |

O mínimo de2 Mb/s e o clamp de45% mudam substancialmente o preset em links lentos; BE/Bulk continuam calculados com o percentual original. Isso exige revisão de coerência e teste sob backlog, não permite afirmar automaticamente que HFSC esteja inválido ou que ocorrerá starvation. Target não é limite rígido de atraso. Quantums menores também podem ser úteis em baixas taxas, com custo de escalonamento. [RFC8290, seção4](https://www.rfc-editor.org/rfc/rfc8290.html#section-4), [HFSC corner cases](https://github.com/iproute2/iproute2/blob/main/man/man7/tc-hfsc.7).

### R05 — Diferenciar justiça por fluxo de justiça por aparelho

Os flows512/1024 dividem fluxos em buckets, não representam número de aparelhos. O HFSC atual não possui equivalente completo ao dual-host+nat do CAKE: um cliente com muitas conexões pode competir de maneira diferente de outro com uma só. Se a promessa dos dois perfis incluir equidade por aparelho, o HFSC precisa de classificação/hierarquia correspondente ou de uma limitação claramente descrita. Simplesmente aumentar flows não cria isolamento por host. [RFC8290, seção6.1](https://www.rfc-editor.org/rfc/rfc8290.html#section-6.1).

### R06 — Preservar classe ao longo do fluxo e tornar ECN efetivo observável

Há classificação por tamanho, DSCP e ECT(1), com caminhos distintos para pequenos/grandes pacotes de um fluxo; as exceções QUIC aparecem depois de filtros por DSCP. Isso permite tratamentos inconsistentes, devendo ser testado por fluxo e pelos dois protocolos IP. A fronteira de confiança antes do IFB continua pendente, inclusive para CS4 recebido sem connmark válido.

O script força ECN na fila RT e, para taxas a partir de20 Mb/s, nas outras filas mesmo se o parâmetro recebido era noecn. Isso é uma política explícita no código que precisa ser compatível com a preferência apresentada ao usuário. O fallback de ce_threshold remove silenciosamente esse recurso; a telemetria deve relatar o resultado aplicado, não apenas o solicitado. Código local: `ark_hfsc_build_tree`. [Manual FQ-CoDel](https://github.com/iproute2/iproute2/blob/main/man/man8/tc-fq_codel.8).

## 3. Refinamento da avaliação L4S

A formulação anterior podia sugerir que somente DualQ acoplado serviria para L4S. Isso é incompleto: a RFC9330 admite FQ-CoDel com marcação rasa seletiva de ECT(1). Logo, não se deve exigir outro plugin ou novo motor apenas pela ausência de DualQ. [RFC9330, seção4](https://www.rfc-editor.org/rfc/rfc9330.html#section-4).

O HFSC já solicita ce_threshold e selector0x01/0x03 na fila BE; existe, portanto, uma base relevante. Porém pequenos pacotes ECT(1) podem ir à fila RT, que não solicita esse limiar, e o recurso pode cair em fallback. `ark_has_l4s_dscp` apenas encontra texto no include nft. É preciso comprovar fila efetiva, parâmetros aceitos, marcações, conservação do ECN e interação com endpoints escaláveis. A presença da regra não homologa L4S. A RFC9332 descreve especificamente DualQ acoplado; ela não exclui a alternativa FQ. [RFC9330, seção5.2](https://www.rfc-editor.org/rfc/rfc9330.html#section-5.2), [RFC9332](https://www.rfc-editor.org/rfc/rfc9332.html).

## 4. Filas físicas e memória: achado novo no caminho comum

Leitura real de eth1: uma raiz mq com16 filhos FQ-CoDel. Todos os filhos tinham target~50 ms, interval~500 ms, quantum1514, flows1024, limit10240 e memory_limit64 MiB. Cada TX queue tinha BQL limit_min e limit atuais de524288 bytes, com limit_max1879048192.

Somar os tetos dos16 filhos dá1024 MiB, além dos128 MiB dos dois shapers CAKE. Isso NÃO significa memória reservada ou ocupada: limite de pacotes, tráfego, driver e disponibilidade também restringem o uso. Demonstra que o orçamento de `qos-resources.sh` cobre os shapers configurados, não todos os qdiscs do caminho. O hardware-tune contém configuração64 MiB por filho e o SQM contém alteração para50/500 ms; o estado observado é compatível com esses mecanismos.

Recomendação: incluir filas físicas e outras instâncias ARK no inventário; definir propriedade e orçamento agregado; medir backlog/BQL antes de conservar mínimos elevados. Não reduzir indiscriminadamente BQL ou substituir mq durante uma partida. Neste enlace de2,5 Gb/s, essas filas não foram demonstradas como gargalo nem como causa dos eventos de93 s. [Fontes locais: ark-hardware-tune e ark_sync_gaming_ports_and_bql; tamanho/limites do FQ-CoDel](https://github.com/iproute2/iproute2/blob/main/man/man8/tc-fq_codel.8).

## 5. Recursos adicionais que exigem decisão, não ativação automática

**CAKE-MQ:** o W6x tem16 TX queues físicas, mas PPP/IFB têm uma cada. Não basta instalar o módulo para paralelizar o shaper atual. Há ainda um compromisso no recurso descrito pelo manual atual: justiça e priorização atuam por instância filha, sem garantia global exata de justiça entre hosts. Não generalizar resultados de outro NIC para este PPPoE. [mq-cake: artigo dos autores](https://schmiste.github.io/netdev25.pdf), [seção CAKE-MQ do manual atual](https://github.com/iproute2/iproute2/blob/main/man/man8/tc-cake.8).

**Overhead/MPU:** ambos os motores precisam compensar o mesmo gargalo a partir do ponto de contabilização correto. O valor44 não comprova contabilização Ethernet/PPPoE/GPON/VLAN. CAKE usa compensação própria; HFSC utiliza STAB. Inventariar encapsulamento e validar taxas com pacotes de tamanhos diferentes, preservando ajuste manual. O preset Ethernet do manual CAKE é38/84; isso não autoriza substituir automaticamente44/64 em um acesso GPON. [CAKE, algoritmo de overhead](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c), [manual STAB](https://github.com/iproute2/iproute2/blob/main/man/man8/tc-stab.8).

**Memória e estatísticas:** aumentar memlimit não aumenta processamento. Os valores observados de memory_used eram cerca de20,8/21,3 MiB; no código upstream6.12 esse campo é buffer_max_used, isto é, máximo histórico. capacity_estimate com autorate desligado pode refletir a taxa configurada. Não usar esses campos como memória atual ou teste de capacidade. [Linux6.12, cake_dump_stats/cake_init](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c).

**Autorate e adaptação:** há seleção parcial por RAM/preset/taxa, não calibração completa por CPU, pps e RTT. Um controlador comum deve atualizar as taxas efetivas e, no HFSC, manter as curvas coerentes. Não habilitar loops concorrentes ou apresentar estimativa como medição. Mais RAM não compensa saturação de um núcleo ou perda no acesso.

## 6. Ordem de execução proposta

| Prioridade | Trabalho | Aceite necessário |
|---|---|---|
| P1 | Classificação confiável e consistente nos dois motores | Fluxos CS0/CS1/AF41/CS4, DSCP não confiável, IPv4/IPv6, pequenos/grandes pacotes; tin/classe correta sem troca indevida |
| P1 | Inventário e orçamento de todas as filas ARK, incluindo físicas | Tetos agregados por hardware e WAN; preservar raiz, parâmetros anteriores e rollback |
| P1 | HFSC: RTT/serialização, clamps de taxa e ECN | Baixas taxas, RTT alto, backlog misto, respeito à preferência e estado aplicado |
| P2 | Política de GSO medida e calibração de taxas/overhead | A/B com mesma carga, destinos e ordem alternada; CPU por núcleo, p95/p99 e vazão útil |
| P2 | Equidade por aparelho no HFSC ou limite explícito | Dois clientes:1 fluxo versus16; upload/download simultâneos e dual-stack |
| P2 | Telemetria L4S/ECN e estatísticas | Somente marcar funcional quando parâmetros e efeitos estiverem comprovados |
| Condicional | CAKE-MQ/autorate avançado | Suporte real, interface adequada e ganho medido, com trade-offs documentados |

CAKE é o candidato mais simples para o perfil geral com equidade por aparelho já disponível. HFSC deve ser oferecido como política de classes e curvas explícitas, com condições de uso e limites medidos. Não há evidência atual de que HFSC seja sempre mais rápido, que CAKE seja sempre melhor ou que um valor fixo sirva a todos os usuários.

## Evidência e validação deste lote

Manifesto de fontes, hashes, leituras selecionadas e derivação: `docs/audit/evidence/qos-2026-11-05/deep-profile-research.json`. Cópias das fontes públicas e scripts em `Evidencias locais/QoS-pesquisa-perfis-2026-11-05/`, fora do Git. Leituras físicas e aritmética estática foram separadas; não houve troca de motor, restart, benchmark, VM, mock ou UI. Nenhum ganho de desempenho ou solução das pausas é anunciado. Auditoria documental local executada após o registro. Pesquisa de busca indisponível por resposta403 do serviço; fontes primárias foram acessadas diretamente por HTTPS.
