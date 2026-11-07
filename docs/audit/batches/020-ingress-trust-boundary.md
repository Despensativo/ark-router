# Lote 020 — Fronteira DSCP antes do IFB e classificação CAKE/HFSC

05/11/2026. Continuação autorizada no Acer Predator W6x 192.168.73.1, ARK 2.2.1/OpenWrt 25.12.6/kernel 6.12.112. Código e parâmetros investigados nos lotes 018/019. Exceção de validação física sem precedência da VM vigente; sem reboot, publicação ou alteração de UI.

## Problema e correção

O ingresso CAKE atribuía uma prioridade explícita de tin antes de restaurar DSCP via ctinfo. Essa prioridade sobrepunha a seleção por DSCP, reproduzida com pacotes no lote 019. Retirar somente a prioridade permitiria confiar no DSCP externo recebido da operadora. No HFSC, o IFB podia receber CS4 não validado, e a restauração/classificação dependia do tamanho do pacote.

A biblioteca compartilhada `qos-ingress.sh` instala a mesma fronteira antes do redirect:

1. Guarda temporária de Best Effort para as duas famílias IP.
2. Limpeza do DSCP IPv4/IPv6, preservando ECN, e remoção da prioridade explícita de classe. O checksum do cabeçalho IPv4 é reparado.
3. Restauração de DSCP por ctinfo somente com o bit de validade 0x80 no connmark; não copia nem altera o skb mark de roteamento.
4. Remoção da guarda após instalação da sanitização. Sem ctinfo, o pacote sanitizado permanece CS0. Sem pedit/csum ou com falha parcial de instalação, a guarda permanece em Best Effort e os filtros parciais são retirados.

As preferências TC 1–9 já eram reservadas pelo ARK nesse caminho. A biblioteca preserva o redirect SQM na preferência 10. A reaplicação limpa apenas esse espaço de propriedade; um instalador que use manualmente essas mesmas preferências precisará resolver o conflito de propriedade.

No CAKE, saem os overrides fixos de tin e a promoção indiscriminada de UDP no ingress. No HFSC, CS4 confiável passa para RT nos dois tamanhos testados; CS1 restaurado pode alcançar Bulk também no download. Saem os filtros genéricos de UDP pequeno e ECT(1) da árvore HFSC. No include nft, foram retiradas somente as duas regras de promoção UDP por exclusão. Regras explícitas de jogos, controle e a regra LAN de ECT(1) permanecem; isso não equivale a identificação confiável de aplicações.

Conexões já marcadas não são apagadas: o novo comportamento de classificação LAN é observado em novos fluxos ou após expiração natural. Não houve flush de conntrack. Taxas, GSO, memória e curvas HFSC não foram modificados.

## Dependências e implantação

Na série OpenWrt examinada, act_pedit e act_csum pertencem a `kmod-sched`; nomes fictícios de pacotes individuais não são usados. A dependência comum foi adicionada ao Makefile, consumida também pelos builders locais. O opt-out de ctinfo continua disponível; a sanitização não depende de restaurar uma marca.

O plano de instalação no W6x informou 185 KiB para kmod-sched e 18 KiB para kmod-lib-textsearch. Havia 47.336 KiB livres no overlay antes e 47.248 KiB depois, acima da reserva de 2 MiB. Os pacotes foram obtidos pelo APK normal, sem contornar confiança. Ambos estão registrados como instalados e act_pedit/act_csum foram carregados. APK continuou retornando 1, também na simulação anterior à instalação, como já registrado no lote 013; o erro residual do gerenciador não foi isolado neste lote. Não se trata o código de saída como sucesso global do APK.

Backup privado dos arquivos anteriores, hashes e watchdog de retorno foram preparados. Quatro arquivos foram aplicados e conferidos por SHA-256: módulo SQM, script HFSC, include nft e biblioteca nova. O CAKE recebeu os filtros sem reiniciar SQM. Na tabela fw4, uma transação removeu apenas os dois handles cujos comentários correspondiam exatamente às regras UDP genéricas. O arquivo persistente contém a mesma remoção; a configuração completa fw4 foi submetida à checagem de sintaxe.

## Evidência local e nativa

### Testes locais

Runner `tests/run_local_tests.sh` aprovado após a alteração final. Seis testes novos cobrem ordenação das ações, preservação de ECN/marks, ausência de módulos, falha de uma família, falha da guarda e reaplicação/propriedade. As suítes de recursos (20), dependências (7) e confiabilidade SQM (28) passaram. Auditoria estrita de preservação de estado aprovada. Esses testes usam mocks e não substituem os pacotes reais abaixo.

### Pacotes reais em IFB isolado

Filtro de entrada restrito ao cliente de teste, destino no roteador e porta UDP de diagnóstico; redirecionamento por chain exclusiva para IFB temporário. Marcas de conexão foram criadas por regra nft temporária restrita aos fluxos de diagnóstico. A restauração ctinfo foi real, com consultas ao conntrack do kernel; não foi apenas um socket escrevendo DSCP depois da ação.

| Grupo | Casos | Evidência |
|---|---:|---|
| CAKE/HFSC, IPv4/IPv6, payloads 96/900 B, quatro combinações DSCP/ECN | 32 | CS4 externo sem marca válida vira CS0; CS1/AF41/CS4 restaurados alcançam a classificação esperada; ECN0/1/2/3 e checksum IPv4 conferidos |
| Capacidade pedit negada à biblioteca | 8 | Marca externa permanece no cabeçalho, porém prioridade explícita força a fila Best Effort |
| Capacidade ctinfo negada à biblioteca | 8 | Sanitização deixa CS0 e classificação Best Effort mesmo com connmark preparado |
| Connmark0x20, sem bit de validade | 8 | Não restaura CS4; pacote permanece CS0/Best Effort |

Total: **56 casos aprovados e 224 datagramas capturados após as ações**. Cada caso validou quatro datagramas e as contagens na fila esperada. As quatro combinações DSCP/ECN não são o produto cartesiano de todos os valores possíveis. No HFSC, AF41 permanece na classe BE; não há classe Video dedicada como no CAKE.

Nos dois grupos de ausência, a indisponibilidade foi injetada na função de detecção; os módulos permaneceram carregados para não afetar a WAN. A execução das ações restantes, o tráfego e as filas eram reais. Não se afirma teste físico em firmware onde os módulos não existem.

### Problemas do instrumento resolvidos

- `mark` é nome reservado na declaração de chain nft: o setup inicial falhou, foi limpo e passou a usar `qmark`.
- A ordem de enumeração dos leaves HFSC era 120/130/110. O instrumento passou a ordenar pelo handle antes de comparar classes.
- A captura precisava aguardar a entrega do buffer de pacotes antes de encerrar tcpdump.
- O próprio IFB temporário emitia Router Solicitation IPv6, DSCP48, tipo133, acrescentando uma contagem na fila de controle. Uma captura isolada confirmou esse tráfego autogerado. Desativou-se a autoconfiguração IPv6 somente nos IFBs de diagnóstico e os grupos foram repetidos com sucesso; IPv6 da LAN/WAN não foi desativado.

O último achado oferece uma explicação candidata para a contagem excedente do lote 019, mas não reconstrói a identidade daquele pacote histórico. Não se declara prova retroativa. O problema de formatação JSON do root HFSC nesse firmware continua contornado apenas no instrumento, sem alteração do tc.

## Validação da WAN e limitações

Os resultados de carga e o fechamento são mantidos no [resumo estruturado](../evidence/qos-2026-11-05/ingress-trust-result.json). O comparativo usa networkQuality simultâneo no Mac cabeado, sondas ICMP e CPU por núcleo. Duração efetiva é registrada individualmente: o limite máximo de 45 segundos não é duração sustentada garantida. Uma execução anterior e duas posteriores servem como verificação operacional, sem demonstrar ganho causal de vazão ou latência.

| Execução | Carga efetiva | Download | Upload | RPM | CPU máxima amostrada por núcleo |
|---|---:|---:|---:|---:|---:|
| Antes | 13,93 s | 465,238 Mb/s | 305,134 Mb/s | 987,16 | 100% |
| Depois1 | 15,16 s | 599,631 Mb/s | 427,097 Mb/s | 939,36 | 96,04% |
| Depois2 | 11,79 s | 548,980 Mb/s | 350,965 Mb/s | 1092,32 | 99,02% |

O gateway respondeu sem lacunas internas nas três janelas. Houve uma lacuna em Google antes e uma em Cloudflare no primeiro teste posterior; isso não comprova perda por QoS. As amostras de ICMP incluem dois segundos anteriores e um posterior à carga, portanto não são exclusivamente o intervalo carregado. A CPU inclui esses intervalos de observação.

A conferência final passou nos 13 itens de integridade/operação e em reaplicação adicional. Os hashes UCI e as opções/handles CAKE8059/805a foram preservados; regra de redirect presente, pedit/csum/ctinfo ativos, regras UDP por exclusão ausentes e `fw4 check` aprovado. Nenhum IFB de diagnóstico permaneceu e o watchdog foi desarmado. O perfil ativo permaneceu CAKE720/620 Mb/s, no-split-gso e 64M por direção; HFSC novo foi validado em IFB isolado, sem ativá-lo na WAN de produção neste lote.

Picos periódicos WAN previamente observados continuam sendo um fator externo à comparação. ICMP agora atravessa uma política de classes diferente; seu p95 não pode ser interpretado isoladamente como melhora/piora do jogo. Nenhum ping interno do PUBG ou equidade entre vários clientes foi medido neste lote.

A tabela nft e os filtros de diagnóstico também foram removidos. O backup privado e o script de retorno permanecem disponíveis, sem watchdog armado.

Scripts, PCAPs restritos aos testes, tentativas anteriores e backup permanecem em `Evidencias locais/QoS-020-classification-2026-11-05/`, fora do repositório canônico. Não há teste de reboot ou VM neste lote, nem homologação de todos os kernels, WANs e equipamentos suportados. Validação visual LuCI não se aplica: não houve alteração de UI.

## Continuidade

O lote corrige a autoridade do DSCP antes do IFB e parte das heurísticas que a sobrepunham. Permanecem curvas/targets/ECN HFSC para enlaces lentos, revisão da confiança e das regras amplas da LAN, orçamento das filas físicas, capacidade sustentada por núcleo e Autorate com coleta real. Não resolve a causa dos picos periódicos da conexão nem torna os dois perfis universalmente ótimos.

Fontes primárias adicionais: [OpenWrt25.12, empacotamento dos módulos](https://github.com/openwrt/openwrt/blob/openwrt-25.12/package/kernel/linux/modules/netsupport.mk), [iproute2, pedit e retenção dos bits ECN](https://github.com/iproute2/iproute2/blob/main/man/man8/tc-pedit.8), [iproute2, csum](https://github.com/iproute2/iproute2/blob/main/man/man8/tc-csum.8). A versão efetivamente aceita foi conferida com pacotes no kernel do W6x; os manuais atuais não substituem esse teste.
