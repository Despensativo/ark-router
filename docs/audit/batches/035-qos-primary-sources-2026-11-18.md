# QoS: fontes primárias, RPS/PPPoE/IFB e CAKE multiqueue

Data de consulta: 18/11/2026. Pesquisa estática, sem acesso ou mutação em roteador/VM. Este relatório não homologa desempenho, pacote instalado ou configuração operacional. O mecanismo de busca web recusou a consulta (403 de permissão do modelo); as fontes abaixo foram obtidas diretamente dos repositórios oficiais via HTTPS e seu conteúdo foi inspecionado.

## Revisões verificadas

- Linux upstream: tag **v6.12**, arquivos `net/core/dev.c`, `drivers/net/ppp/{ppp_generic,pppoe}.c`, `drivers/net/ifb.c`, `net/sched/{sch_cake,sch_mq,sch_generic}.c` e `Documentation/networking/scaling.rst`.
- OpenWrt **openwrt-25.12**, commit **08379a3a86bd6075cca11ed4203e91b77db9e6bc**, identificado pela API de branches e árvore recursiva. Contém backports CAKE MQ para **6.12**, série 700-01 a 700-07 e correções 701-01/02. [Árvore fixada](https://github.com/openwrt/openwrt/tree/08379a3a86bd6075cca11ed4203e91b77db9e6bc/target/linux/generic/backport-6.12).
- OpenWrt **main**, commit **2ccaccdb98f8d37eda9830e455e4a4d10834a369**, também verificado; nele a série está em `backport-6.18`. Não confundir a branch corrente com o firmware 6.12 instalado. [Árvore fixada](https://github.com/openwrt/openwrt/tree/2ccaccdb98f8d37eda9830e455e4a4d10834a369/target/linux/generic/backport-6.18).
- iproute2 **main**, commit **104413f986e92d41696a708d33ecac166a59b30b**, manuais `tc-cake.8`, `tc-fq_codel.8`, `tc-hfsc.7`, código `tc/q_cake.c`. URLs de consulta inicialmente usaram main, resolvido à revisão acima no mesmo ciclo de leitura; links abaixo estão fixados.

## 1. RPS pode preceder ingress/IFB na interface PPP

**Conclusão confirmada no fluxo upstream 6.12:** é incorreto afirmar genericamente que RPS na interface PPP só age depois do CAKE de download no IFB. A ordem depende do dispositivo e do ponto em que o filtro ingress está instalado.

Caminho normal do PPPoE recebido:

1. `pppoe_rcv_core()` entrega o pacote a `ppp_input()`. [pppoe.c](https://github.com/torvalds/linux/blob/v6.12/drivers/net/ppp/pppoe.c#L365).
2. `ppp_receive_nonmp_frame()` retira o protocolo PPP, muda `skb->dev` para `ppp->dev`, define o protocolo IP e chama `netif_rx(skb)`. [ppp_generic.c](https://github.com/torvalds/linux/blob/v6.12/drivers/net/ppp/ppp_generic.c#L2513).
3. `netif_rx_internal()` consulta `get_rps_cpu(skb->dev, ...)` antes de `enqueue_to_backlog()`, se RPS estiver habilitado. Logo a máscara consultada nesse ponto é da interface PPP. [dev.c](https://github.com/torvalds/linux/blob/v6.12/net/core/dev.c#L5172).
4. No processamento subsequente, `__netif_receive_skb_core()` executa `sch_handle_ingress()`, onde filtros TC podem redirecionar para IFB. [dev.c](https://github.com/torvalds/linux/blob/v6.12/net/core/dev.c#L5457).
5. Depois da saída do IFB, `ifb_ri_tasklet()` restaura `skb->dev` ao dispositivo original e reinjeta via `netif_receive_skb()`, marcando `tc_skip_classify` para evitar o ciclo de redirect. Portanto não se deve confundir o processamento anterior ao IFB com essa reinjeção posterior. [ifb.c](https://github.com/torvalds/linux/blob/v6.12/drivers/net/ifb.c#L105).

`netif_receive_skb_internal()` também consulta RPS antes de entrar no núcleo de receive. A documentação explica que RPS seleciona CPU por backlog para processamento acima do interrupt handler; não declara que RPS acontece universalmente após o ingress TC. [dev.c](https://github.com/torvalds/linux/blob/v6.12/net/core/dev.c#L5847), [scaling.rst](https://github.com/torvalds/linux/blob/v6.12/Documentation/networking/scaling.rst#L163).

**Limites:** essa cadeia não prova ganho de throughput nem que todos os pacotes mudarão de CPU. Uma máscara não zero permite seleção; hash, CPU atual, fila RX registrada, fluxo/RFS e caminhos acelerados importam. Não prova que configurar `rps_cpus` no próprio IFB tenha o mesmo efeito que configurar PPP: o caminho IFB consultado restaura o dispositivo original antes de reinjetar. O local real do redirect (Ethernet versus PPP), patches de fornecedor e contadores precisam ser verificados no alvo. RPS distribui recepção; não transforma a trava de uma única instância CAKE em processamento simultâneo.

## 2. CAKE MQ exige filas TX, não exclusivamente uma interface física

O backport OpenWrt registra `cake_mq` no mesmo módulo do CAKE e chama `mq_init_common(..., &cake_qdisc_ops)`. Essa rotina deriva do MQ que exige raiz e `netif_is_multiqueue(dev)`, alocando um CAKE por fila TX. [Patch 700-03](https://github.com/openwrt/openwrt/blob/08379a3a86bd6075cca11ed4203e91b77db9e6bc/target/linux/generic/backport-6.12/700-03-v7.0-net-sched-sch_cake-Add-cake_mq-qdisc-for-using-cake-.patch), [patch 700-01](https://github.com/openwrt/openwrt/blob/08379a3a86bd6075cca11ed4203e91b77db9e6bc/target/linux/generic/backport-6.12/700-01-v7.0-net-sched-Export-mq-functions-for-reuse.patch), [MQ base 6.12](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_mq.c#L67).

**IFB multiqueue é suportado pelo driver:** `ifb.c` distingue dispositivos legados com uma fila e recomenda expressamente criar um IFB com `numtxqueues 8`. Suas estruturas privadas, filas e tasklets são alocados por `dev->num_tx_queues`. Assim, não existe veto universal ao CAKE MQ por o nome começar com IFB. Um IFB já criado com uma fila não vira multiqueue apenas por trocar o qdisc. [ifb.c: criação](https://github.com/torvalds/linux/blob/v6.12/drivers/net/ifb.c#L393), [ifb.c: inicialização](https://github.com/torvalds/linux/blob/v6.12/drivers/net/ifb.c#L183).

**PPP padrão é diferente:** o dispositivo PPP genérico é criado com `alloc_netdev()`, ou seja, a criação padrão usa uma fila; sua existência não oferece múltiplas filas TX ao CAKE MQ. Não extrapolar essa condição para todas as interfaces virtuais ou implementações modificadas. [ppp_generic.c](https://github.com/torvalds/linux/blob/v6.12/drivers/net/ppp/ppp_generic.c#L3338).

**O que verificar no produto:** capacidade do kernel/módulo, suporte do binário `tc`, número de filas efetivas do dispositivo, instalação bem-sucedida e árvore de qdiscs resultante são evidências distintas. A presença de texto de ajuda no `tc` prova reconhecimento no userspace, não aceitação pelo kernel. Um diretório `tx-1` é um indício de topologia, não prova distribuição de tráfego, múltiplas CPUs ocupadas ou ganho. O backport do userspace é um arquivo separado. [Patch iproute2 OpenWrt](https://github.com/openwrt/openwrt/blob/08379a3a86bd6075cca11ed4203e91b77db9e6bc/package/network/utils/iproute2/patches/001-1-tc-cake-add-cake_mq-support.patch).

## 3. `capacity estimate: 0bit` não significa capacidade física zero

O `tc` imprime o atributo `TCA_CAKE_STATS_CAPACITY_ESTIMATE64`, que o kernel preenche com `avg_peak_bandwidth`. Em CAKE upstream 6.12, esse campo é inicializado com `rate_bps` e atualizado pelo estimador somente dentro do bloco `CAKE_FLAG_AUTORATE_INGRESS`. Não é leitura da velocidade Ethernet, nem teste ativo da Internet. [q_cake.c](https://github.com/iproute2/iproute2/blob/104413f986e92d41696a708d33ecac166a59b30b/tc/q_cake.c#L647), [sch_cake.c: atualização](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c#L1798), [inicialização](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c#L2765), [exportação](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c#L2869).

**Derivação estática para filhos CAKE MQ do backport consultado:**

- `mq_init_common()` usa `qdisc_create_dflt()`; essa função chama `ops->init(sch, NULL, ...)`, sem opções. O filho inicia com rate zero, portanto `avg_peak_bandwidth` zero. [sch_generic.c](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_generic.c#L1002), [patch MQ comum](https://github.com/openwrt/openwrt/blob/08379a3a86bd6075cca11ed4203e91b77db9e6bc/target/linux/generic/backport-6.12/700-01-v7.0-net-sched-Export-mq-functions-for-reuse.patch).
- Depois, `cake_config_replace()` substitui a configuração do filho pela compartilhada e reconfigura taxas, mas não reatribui `avg_peak_bandwidth`. Assim, o filho pode mostrar `bandwidth` válido e `capacity estimate: 0bit`. [Patch configuração compartilhada](https://github.com/openwrt/openwrt/blob/08379a3a86bd6075cca11ed4203e91b77db9e6bc/target/linux/generic/backport-6.12/700-04-v7.0-net-sched-sch_cake-Share-config-across-cake_mq-sub-q.patch).
- `autorate-ingress` é rejeitado quando a configuração é compartilhada. A raiz MQ usa dump MQ/configuração; não implementa um estimador de capacidade CAKE agregado. Somar os zeros dos filhos não mede o link. [Mesmo patch 700-04](https://github.com/openwrt/openwrt/blob/08379a3a86bd6075cca11ed4203e91b77db9e6bc/target/linux/generic/backport-6.12/700-04-v7.0-net-sched-sch_cake-Share-config-across-cake_mq-sub-q.patch), [registro root 700-03](https://github.com/openwrt/openwrt/blob/08379a3a86bd6075cca11ed4203e91b77db9e6bc/target/linux/generic/backport-6.12/700-03-v7.0-net-sched-sch_cake-Add-cake_mq-qdisc-for-using-cake-.patch).

Essa explicação é derivada do código, não de reprodução em kernel compilado. Para atribuí-la a uma captura específica, identificar se a linha pertence à raiz, ao filho ou a CAKE simples e conferir o patchset instalado. Em CAKE simples criado ilimitado e alterado depois, o histórico do campo também importa; zero isolado não é diagnóstico de falha do shaper.

## 4. Compartilhar taxa não preserva equidade global automaticamente

O CAKE MQ compartilha configuração e aproxima o shaper global contando instâncias ativas e ajustando a taxa de cada uma. A série consultada usa intervalo de 200 µs e inclui correções posteriores; não avaliar apenas o patch inicial. [Patch 700-05](https://github.com/openwrt/openwrt/blob/08379a3a86bd6075cca11ed4203e91b77db9e6bc/target/linux/generic/backport-6.12/700-05-v7.0-net-sched-sch_cake-share-shaper-state-across-sub-ins.patch), [correção 701-02](https://github.com/openwrt/openwrt/blob/08379a3a86bd6075cca11ed4203e91b77db9e6bc/target/linux/generic/backport-6.12/701-02-v7.0-net-sched-sch_cake-fixup-cake_mq-rate-adjustment-for.patch).

O manual atual declara que classificação, equidade entre fluxos/hosts e prioridade entre tins ficam dentro de cada instância. CAKE MQ não garante equidade global equivalente à de CAKE simples; aproximação depende da distribuição dos fluxos pelas filas. [tc-cake.8, diferenças MQ](https://github.com/iproute2/iproute2/blob/104413f986e92d41696a708d33ecac166a59b30b/man/man8/tc-cake.8#L710).

| Composição | Garantia que pode ser atribuída ao algoritmo | Condição/limite |
|---|---|---|
| CAKE `flows` | Equidade entre fluxos, com hash associativo | Não significa isolamento por dispositivo/host |
| CAKE `dual-srchost` / `dual-dsthost` / `triple-isolate` | Equidade por host e fluxo conforme modo | NAT e direção precisam ser configurados; não presumir defaults do produto |
| HFSC + FQ-CoDel nas folhas | HFSC distribui serviço pelas classes; FQ-CoDel isola fluxos dentro de cada folha | Não cria isolamento global por host automaticamente |
| CAKE MQ | Filhos CAKE e taxa compartilhada com possibilidade de paralelismo | Equidade e DiffServ locais a cada filho; filas/CPU devem efetivamente receber trabalho |

Fontes da tabela: [modos CAKE](https://github.com/iproute2/iproute2/blob/104413f986e92d41696a708d33ecac166a59b30b/man/man8/tc-cake.8#L459), [FQ-CoDel](https://github.com/iproute2/iproute2/blob/104413f986e92d41696a708d33ecac166a59b30b/man/man8/tc-fq_codel.8#L30), [HFSC](https://github.com/iproute2/iproute2/blob/104413f986e92d41696a708d33ecac166a59b30b/man/man7/tc-hfsc.7).

HFSC tem critérios RT, LS e UL com objetivos distintos: RT considera garantias temporais sem seguir a hierarquia de classes da mesma maneira que LS; LS distribui serviço hierarquicamente; UL limita elegibilidade. Portanto não é sustentado declarar HFSC inerentemente superior/inferior em latência ou equidade sem curvas, classificação, cargas e medições. FQ-CoDel justo entre fluxos não implica justiça entre hosts que abrem números diferentes de conexões. Também é incorreto dizer que toda configuração CAKE traz isolamento por host: `flows` explicitamente não traz. [tc-hfsc.7](https://github.com/iproute2/iproute2/blob/104413f986e92d41696a708d33ecac166a59b30b/man/man7/tc-hfsc.7#L170), [tc-cake.8](https://github.com/iproute2/iproute2/blob/104413f986e92d41696a708d33ecac166a59b30b/man/man8/tc-cake.8#L495).

## Validação e pendências

Verificado: conteúdo real de fontes oficiais baixadas, cadeias de chamadas indicadas, patches OpenWrt 6.12 e documentação iproute2; relatório relido após gravação. Fontes transitórias de trabalho em `/tmp/ark-qos-sources/` não são artefatos persistentes de homologação. As URLs fixadas acima permitem recuperar as revisões sem depender dessa pasta.

Não executado: build de kernel, instalação de pacote, alteração RPS/qdisc, tráfego, reboot, benchmark ou teste RF. A mudança deste subtrabalho é somente este Markdown; testes LuCI, screenshots e runner de código não se aplicam. Não conclui que a versão OpenWrt instalada contenha exatamente os commits consultados. O agente principal deve vincular achados locais/runtime e o checkpoint da auditoria ao seu relatório de revisão, mantendo estes limites.
