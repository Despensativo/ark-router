# Revisão das alegações RPS 7/3, cake_mq e HFSC

Data: 18/11/2026. Escopo: pesquisa e reproduções locais; nenhum acesso ou alteração em roteador. Código examinado: checkout canônico, HEAD `0e5acd456f4a3f792d20802b2fbeaaa7f7d75f49`, VERSION `2.2.9`, com alterações locais preexistentes. O HEAD sozinho não identifica o conteúdo avaliado. Hash do módulo SQM no [resultado reproduzível](../evidence/qos-review-2026-11-18/results.json).

## Parecer

A arquitetura combina mecanismos reais, mas o texto original não descreve integralmente a implementação atual. Há inconsistência reproduzida no RPS do IFB, exclusão de interfaces virtuais menos forte que o comentário sugere e uma exceção importante ao isolamento por host do CAKE acima de 500 Mb/s. As promessas de CPU exclusivamente dedicada, perda zero, 1 Gb/s com A+ e jitter inferior a 1 ms não são garantias demonstradas.

A pesquisa de fontes primárias está em [035 — Linux/OpenWrt](035-qos-primary-sources-2026-11-18.md). A análise distingue código upstream de código do firmware: sem identificar os patches e binários do alvo, um backport de referência não prova o comportamento daquele equipamento.

## 1. RPS e afinidade

RPS é Receive Packet Steering. Máscara hexadecimal 7 seleciona CPUs 0/1/2; máscara 3 seleciona 0/1. É distribuição por hash de fluxo para processamento de recepção, não divisão garantida e uniforme de pacotes entre núcleos. Não torna um qdisc CAKE mono-fila automaticamente paralelo.

O hotplug `root/etc/hotplug.d/net/90-ark-rps-tune:13` e o perfil high-spec de `root/etc/init.d/ark-hardware-tune:491` aplicam 7/3 quando existem quatro CPUs e o texto de `/proc/interrupts` corresponde a `mt76|mt79|ath|qca`. É uma heurística mais abrangente que identificar precisamente MT7986; tampouco o nome físico da WAN é necessariamente eth1.

### Divergência reproduzida

`root/usr/lib/ark/modules/sqm.sh:119` zera IFB/bridge/eth. No mesmo fluxo, linhas 135–137 aplicam a máscara calculada novamente a PPPoE **e IFB**. O caminho é condicionado à execução real (`ARK_ROOT` vazio) e existência de `pppoe-*`; antecede inclusive a checagem de SQM habilitado.

Executamos somente esse bloco extraído da fonte, substituindo `/sys` e `/proc` por diretórios temporários, com quatro CPUs e identificação mt79 sintéticas. Resultado:

| Interface sintética | RPS após bloco da promoção |
|---|---:|
| eth1 | 0 |
| lan1 | 7 |
| phy0 | 3 |
| pppoe-wan | 3 |
| ifb4pppoe-wan | 3 |

O hotplug e o tune podem escrever IFB=0 novamente. Logo, há múltiplos escritores com políticas conflitantes e o último evento pode determinar o valor. Isto é prova do comportamento do shell no cenário simulado, não prova de degradação de tráfego ou do estado atual de um roteador.

### Ordem do processamento

Linux v6.12 entrega o IP desencapsulado por PPP em `netif_rx()`. `netif_rx_internal()` pode selecionar a CPU via `get_rps_cpu()` antes de enfileirar no backlog; o processamento posterior passa pelo hook de ingress. Portanto, com SQM ingress preso ao dispositivo PPP, RPS pode anteceder o redirecionamento para IFB e o CAKE de download. A frase “distribui depois do túnel e do CAKE” é imprecisa: depois da desencapsulação não implica depois do shaper. Fontes e funções no relatório 035.

O driver IFB upstream restaura o dispositivo original antes de reinjetar. Assim, a divergência no valor escrito em rps_cpus do IFB não comprova que esse campo seja consultado no caminho normal nem que cause uma segunda redistribuição. O efeito operacional precisa de trace/medição; a inconsistência de política permanece demonstrada.

### CPU3 não é exclusividade comprovada

O tune aplica máscaras IRQ 2/8 alternando a ordem das entradas Ethernet encontradas e aplica afinidade a threads NAPI. Não identifica semanticamente cada IRQ como TX/RX por uma prova do driver. A intenção pode corresponder ao W6x observado, mas precisa conferir `effective_affinity_list`, contadores por núcleo e threads no alvo. A CPU excluída do RPS continua podendo executar outros processos/kernel. DMA é trabalho do hardware; a CPU trata IRQ/NAPI. `irqbalance` pode ser ativado por outro fluxo do produto e merece verificação de interferência.

RPS físico=0 significa desabilitar essa redistribuição por software naquele ponto. Não desliga recepção, não proíbe RSS nem elimina por si toda contenção PPP. Demonstrar spinlock como causa exige perfil/trace ou experimento controlado, além de throughput e backlog.

## 2. cake_mq

### A proteção real tem duas partes

1. `sqm.sh:611–613` fixa `use_mq=0`, impedindo o caminho normal de criação multiqueue do IFB pelo SQM.
2. O promotor (`sqm.sh:185–191`) exige `queues/tx-1` para promover a interface configurada de upload. Não há nessa condição veto explícito `ifb*|pppoe*`, nem teste de dispositivo físico.

A primeira parte torna o fluxo habitual mais conservador do que uma leitura apenas do promotor mostraria. A segunda não comprova “filas físicas reais no silício”: Linux suporta IFB virtual multiqueue. O predicado exato extraído da fonte aceitou eth1, ifb-test e pppoe-test com tx-1 sintético. PPPoE multiqueue neste teste é apenas nome e diretório artificiais, não demonstra que o driver PPP normal crie múltiplas filas.

`ark_has_cake_mq()` não se resume a testar/carregar `sch_cake_mq`: procura marcador de capacidade, símbolo em kallsyms ou texto do help do tc. A execução real de `tc qdisc replace` tem retorno checado antes de registrar promoção. A detecção preliminar não deve ser confundida com sucesso no kernel.

### IFB não é intrinsecamente incompatível

O próprio driver IFB v6.12 documenta criação com `numtxqueues 8`. Suporte multiqueue depende das filas e seleção de TX; não exige uma NIC física. Os backports cake_mq consultados no OpenWrt 25.12 devem ser identificados por revisão, não só por “kernel 6.12”. Há correção upstream específica de ajuste de taxas entre tins diffserv; isso mostra a importância da revisão, mas não demonstra que ela explique o caso local de 88 Mb/s.

CAKE MQ também não preserva automaticamente equidade global por host/fluxo nem prioridades entre tins em filas diferentes: o manual descreve classificação e equidade locais a cada instância. Compartilhar taxa não equivale a compartilhar todos os estados de fairness.

### Capacity estimate não comprova corrupção

No CAKE, `capacity estimate` é estatística `avg_peak_bandwidth`, distinta da taxa configurada. Nos filhos cake_mq, a inicialização sem opções seguida da substituição pela configuração compartilhada fornece uma explicação de código para estimativa zero sem shaper configurado em zero. O backport consultado rejeita `autorate-ingress` com cake_mq. Não confundir essa opção com o modo `ingress`.

A hipótese causal “0bit causa 9% de drops e 88 Mb/s em IFB nos kernels 6.6/6.12” não está estabelecida. Os números aparecem em comentário/documentação local; não foi localizado nesta investigação um A/B bruto correspondente que identifique patchset, tc, filas, ECN e carga. Não significa que o episódio não ocorreu: significa que não é reproduzível a partir da evidência localizada.

Drops AQM e marcações ECN são mecanismos de sinalização; não são equivalentes entre si nem equivalem a perda no anel RX. Sua porcentagem isolada não diagnostica bug.

## 3. Dual-engine e a exceção acima de 500 Mb/s

HFSC + FQ-CoDel existe em `root/usr/lib/sqm/ark_hfsc_fqcodel.qos:225`. HFSC controla curvas/serviço; as folhas FQ-CoDel usam 512 buckets RT, 1024 BE, 512 bulk por direção. `flows 1024` são buckets de hash, não limite rígido de conexões nem garantia de justiça entre 1024 aparelhos. Valores target e o ponto d da curva não garantem ping ou jitter.

**Achado adicional relevante:** `sqm.sh:658–680` cria ingress `besteffort flows` sem nat acima de 500000 kbit/s quando faltam opções; para configuração existente com squash_ingress=1, converte diffserv4 para besteffort e dual-dsthost para flows, removendo nat. Portanto, “CAKE sempre DiffServ4 com máximo isolamento por host” não descreve esse preset atual de alta velocidade. Upload e perfis de menor taxa têm política diferente. É comportamento local preexistente, não mudança feita por esta pesquisa.

CAKE possui funcionalidades adicionais ao FQ-CoDel simples (isolamento host/NAT, COBALT, compensação de overhead, filtro ACK opcional). A hipótese de menor custo do HFSC/FQ-CoDel é razoável, mas o ganho precisa ser medido com funcionalidades comparáveis. RPS e múltiplos fluxos não removem automaticamente locks de um root HFSC/CAKE único.

## 4. Qualidade das evidências de desempenho

A enciclopédia registra 159,09 ms → 0,10 ms junto com mudanças em RPS, dev_weight e netdev_budget. Não é isolamento causal de RPS. Não foi localizado nesta busca o conjunto bruto que permita recalcular essa comparação nem o intervalo 0,10–0,44 ms do texto. A ocorrência 0.448 no JSON de bufferbloat é taxa UL em Mb/s, não evidência dessa latência.

Os relatórios de 05/11 documentam cenários reais, mas pertencem a revisões anteriores e não invalidam possíveis melhorias posteriores:

- [Lote 023](023-bufferbloat-three-sites.md): CAKE Waveform A+, C e A; FAST 670–700 Mb/s download, 550–560 upload, latência agregada mostrada de 5 ms; picos em outros testes acima de 2 segundos.
- [Lote 026](026-bufferbloat-two-profiles.md): CAKE aplicativo A+/B/C; HFSC aplicativo A/A/A. HFSC FAST 630–740 Mb/s DL e 650–670 UL. CPU atingiu 100% em amostra de ambos os motores.
- Pausas externas também ocorreram no controle ocioso. Não se pode atribuí-las automaticamente ao algoritmo de fila ou à operadora.

A+ não prova jitter menor que 1 ms; RTT, atraso incremental sob carga, atraso interno e jitter têm definições diferentes. Zero drops softnet não significa ausência de drops no qdisc/driver ou de perdas externas. “1 Gb/s com A+” exige informar goodput, payload/tamanho dos pacotes, direções simultâneas, classificador e definição de jitter.

## 5. Verificação executada e limites

- Reprodução de dois blocos reais em shell isolado: resultados esperados confirmados, script e JSON em [evidências](../evidence/qos-review-2026-11-18/reproduce.py).
- Teste existente `python -m unittest test_hardware_tune.TestHardwareTune.test_09_sqm_cake_mq_and_auto_dscp_promotion -v`: 1 teste aprovado em 2,324 s, sandbox mock. Valida o fluxo de configuração simulado, não kernel cake_mq nem desempenho.
- Fontes primárias baixadas por HTTPS direto após indisponibilidade do mecanismo web de pesquisa (403 de permissão); URLs/revisões no relatório 035.
- Não foram executados benchmark, VM, reboot, deploy, alteração de QoS, commit ou publicação. A bateria completa não é necessária para uma pesquisa sem alteração funcional; o teste focal e as reproduções não aprovam release. UI não se aplica.

## 6. Próximas decisões técnicas recomendadas

1. Definir uma única política de RPS por interface e validar precedência em boot, hotplug PPP e reinício SQM. Não escolher IFB=0 ou 3 apenas com base em comentário antigo; comparar carga e custo de reinjeção.
2. Descrever a restrição cake_mq como política conservadora do produto até testar a revisão exata. Se a política for “somente físico”, expressá-la explicitamente em código; tx-1 sozinho não a implementa.
3. Tornar explícita a troca de justiça por host/DiffServ no preset CAKE acima de 500 Mb/s.
4. Identificar firmware/kernel/patchset/iproute2/sqm-scripts e hashes do alvo antes de qualquer conclusão de regressão.
5. A/B/A controlado: mono e multiqueue, CAKE e HFSC, mantendo taxas/overhead/GSO/classificação; repetir DL, UL e simultâneo com 1 e vários fluxos, diferentes tamanhos de pacote e dois clientes com números distintos de conexões. Monitorar IRQ, softnet, tc por folha, ECN/drops, goodput, RTT p50/p95/p99, jitter definido e CPU por núcleo. Três rodadas por ferramenta e controle ocioso conforme protocolo QoS. Hardware requer sessão autorizada para alterações.

Redação tecnicamente defensável: “O ARK aplica perfis de afinidade e oferece CAKE ou HFSC/FQ-CoDel para controlar filas. Ganhos observados pertencem aos cenários documentados; desempenho, equidade e latência dependem do perfil, da revisão de software e do hardware. A promoção multiqueue é conservadora e requer validação de filas e de funcionamento.”
