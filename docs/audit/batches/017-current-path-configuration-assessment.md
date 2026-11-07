# Lote 017 — Estado de configuração ONT → W6x → LAN

05/11/2026. Conferência física somente leitura no W6x `192.168.73.1`, Acer Predator W6x/OpenWrt 25.12.6/ARK 2.2.1, e testes IPv4 DF do Mac através dele. Não houve alteração de configuração ou de UI. Não representa nova inspeção completa da ONT, homologação de Wi-Fi, LAN sob carga ou comparação CAKE/HFSC.

## Avaliação

O conjunto tem uma base coerente, mas não pode ser declarado na melhor configuração possível. Há pendências funcionais confirmadas de classificação QoS e falta de calibração comparativa; as pausas periódicas do lote 016 também permanecem sem causa isolada.

| Camada | Observado | Limite da conclusão |
|---|---|---|
| ONT/WAN Ethernet | TP-Link XZ005-G6 consultada no lote anterior; Ethernet do W6x a 2500 Mb/s full duplex, EEE e pause RX/TX desativados | Isso não homologa a ponte/GPON da ONT nem prova que desativar esses recursos seja universalmente melhor |
| PPPoE/MTU | PPPoE no W6x, MTU operacional 1492, física eth1 1508, LAN 1500; configuração WAN solicita 1500 | O valor solicitado não é o operacional; não demonstra defeito. Teste DF abaixo confirma o limite atual. Sem prova de suporte fim a fim a PPPoE com IP de 1500 |
| Firewall | Zona WAN input REJECT, forward DROP, output ACCEPT, NAT e mtu_fix habilitados | Estado declarado não substitui auditoria integral do ruleset ou teste de MSS |
| QoS ativo | CAKE 720/620 Mb/s, diffserv4, isolamento dual-dsthost/dual-srchost, nat/wash, overhead44, mpu64, memlimit64M por direção, offload0/0 | Taxas e overhead não foram homologados como valores ótimos. HFSC não estava ativo nem foi comparado sob carga equivalente neste lote |
| LAN | br-lan1500; lan2/lan3 a 1000 Mb/s full duplex, sem erros RX/TX observados | O link limita a taxa física desses enlaces a 1 Gb/s; não é medição de throughput. lan2 tinha rx_dropped141, inalterado na segunda leitura; origem histórica não isolada |
| IPv6 e DHCP | wan6 up, DHCPv4/DHCPv6/RA server, prefixo LAN64, lease1h | Declaração do serviço não homologa alcance IPv6, DNS, isolamento ou ausência de clientes com configuração conflitante |
| Recursos | MemTotal1010036 KiB, MemAvailable723900 KiB na leitura | Não houve evidência de pressão de RAM nesta consulta; não mede capacidade máxima sustentada |
| DNS | allservers1, cache10000, dnsforwardmax3000, rebind_protection1, noresolv1 | Não foi medido desempenho/privacidade dos upstreams; valores elevados não provam melhora do jogo |

## MTU testada no caminho real

Do Mac para Cloudflare e Google, com IPv4 DF, três envios por destino e tamanho:

- Payload ICMP1464, pacote IPv4 total1492: 3/3 respostas em cada destino.
- Payload ICMP1472, pacote IPv4 total1500: 0/3 Echo-Replies e indicação de fragmentação necessária com MTU1492 em cada destino.

As indicações de fragmentação são comportamento esperado para esses pacotes maiores no caminho observado; não devem ser contadas como a perda periódica do lote 016. O teste valida este caminho IPv4 nessas condições, sem provar funcionamento universal de PMTUD ou IPv6. Não justifica forçar MTU1500 para buscar menor ping.

## Pendência funcional de QoS reconfirmada

Os filtros reais de ingresso ainda aplicam `skbedit priority 804c:2` em pref1, promovem seleções para `804c:4` em pref2/3, executam ctinfo em pref4/5 e aplicam prioridades adicionais em pref6/7 antes do redirect pref10. A instalação de ctinfo está presente, mas não elimina o problema Q05 do lote005.

No [código upstream Linux6.12, cake_select_tin](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c), uma prioridade válida correspondente ao handle seleciona a tin antes da consulta DSCP. Assim, restaurar DSCP no pacote não garante a classe pretendida quando uma prioridade explícita permanece. Isso foi reconfirmado por inspeção dos filtros reais e do código upstream; este lote não mediu fluxos por classe ou corrigiu o mecanismo.

Prioridades para fechar a homologação: corrigir a autoridade de classificação e testar as tins nos dois sentidos; validar as taxas e o overhead sob carga equivalente; comparar CAKE/HFSC; medir LAN e clientes reais; concluir a localização das pausas. Não declarar configuração universalmente ótima com base apenas no modelo do hardware ou na quantidade de RAM.

Sem alterações runtime, deploy, VM ou UI. Validação visual não se aplica. Auditoria documental local executada após o registro.
