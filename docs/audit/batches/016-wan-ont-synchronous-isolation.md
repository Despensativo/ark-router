# Lote 016 — ONT e PPPoE observados simultaneamente no W6x

Data: 05/11/2026. Ambiente: Acer Predator Connect W6x físico, `192.168.73.1`, OpenWrt 25.12.6/kernel 6.12.112, ARK 2.2.1 com as alterações locais dos lotes anteriores. ONT atual TP-Link XZ005-G6, gerenciamento `192.168.1.1`, WAN `eth1`/`pppoe-wan`. Sessão autorizada para diagnóstico direto no W6x. Nenhuma mudança de configuração, reinício de serviço ou acesso de escrita à ONT.

## Pergunta e método

O usuário informou não dispor de outro equipamento: ONT → W6x é a topologia disponível. Este lote testa se a ONT deixa de responder pelo enlace Ethernet nos mesmos instantes das ausências externas. Não exige substituir o cliente PPPoE.

Sondas simultâneas por seis minutos, iniciadas em 15:20:40 BRT (18:20:40 UTC): W6x → gerenciamento da ONT por `eth1`; W6x → peer PPPoE `172.26.1.157`, Cloudflare e Google por `pppoe-wan`; Mac → gateway e Cloudflare. Três capturas distintas observaram cabeçalhos ICMP em Ethernet PPPoE, PPP e Ethernet IPv4 direto. Cada sonda do W6x foi selecionada por destino, identificador e sequência; tráfego de outras sondas foi excluído.

O filtro Ethernet combinado não observou o ICMP direto da ONT. Foi acrescentada uma captura dedicada, que cobriu 291 pares de requisição/resposta; o log da sonda cobre os 360 envios da janela principal. Isso evita atribuir à captura combinada uma evidência que ela não fornece. Somente cabeçalhos selecionados foram persistidos: nenhum PCAP bruto, payload, credencial ou identificação óptica.

## Resultado físico

| Sonda originada no W6x | Respostas/envios | RTT médio/máximo do log |
|---|---:|---:|
| Gerenciamento da ONT | 360/360 | 0,474 / 3,760 ms |
| Peer PPPoE | 352/360 | 2,462 / 31,634 ms |
| Cloudflare | 352/360 | 4,398 / 7,001 ms |
| Google | 352/360 | 19,495 / 20,150 ms |

Os três destinos pelo PPPoE apresentaram as mesmas sequências sem resposta: 79–80, 172–173, 265–266 e 358–359. As duas capturas observaram as mesmas presenças/ausências, sem discrepância e com zero drops de captura. A separação entre o início dos eventos foi aproximadamente 93,009 segundos.

| Janela das requisições sem resposta, BRT | Respostas da ONT observadas na captura dedicada, próximas à janela |
|---|---|
| 15:21:59,757–15:22:00,757 | 0,337 e 0,390 ms |
| 15:23:32,767–15:23:33,767 | 0,362 e 0,357 ms |
| 15:25:05,776–15:25:06,776 | 0,337 e 0,356 ms |
| 15:26:38,784–15:26:39,785 | 0,312 ms na primeira sequência; a captura dedicada termina antes da segunda |

A sonda completa da ONT também recebeu a segunda sequência da última janela. O último evento alcança o fim da captura principal; sua recuperação não foi medida. A janela de duas requisições ausentes não deve ser tratada como duração exata da interrupção.

CAKE preservou os handles `804b:`/`804c:` e apresentou incremento zero de drops nas duas direções; máximo de atraso de tin amostrado de 1,714 ms no upload e 0,390 ms no download. Maior ocupação amostrada de núcleo: 31,53%. Não houve incremento nos contadores de erros/drops observados em `eth1` e PPP; carrier permaneceu ativo, com o mesmo contador de mudanças e nenhuma queda. O contador histórico `rx_checksum_errors` continuou em 1655; FCS, overflow, erros de tamanho, colisões e skips consultados continuaram zero.

O Mac recebeu 718 respostas do gateway, sem resumo final de envios; isso não autoriza alegar 720 envios ou calcular perda. As sondas ICMP não medem o ping interno do PUBG nem uma taxa geral de perda da conexão.

## PPP/LCP e limites da instrumentação

Offload de software/hardware estava 0/0; PPE0/PPE1 tinham zero entradas vinculadas e não havia flowtable ativa observada. O driver é `mtk_soc_eth`, versão 6.12.112. Os caminhos de ftrace consultados não estavam disponíveis; não houve instalação/carregamento de instrumentação. O histórico consultado do kernel apresentou uma subida de `eth1` e nenhuma queda de `eth1`, watchdog ou timeout TX. Os eventos PPP de reconexão pesquisados não apareceram no buffer consultado; isso não constitui histórico ilimitado.

Duas capturas adicionais, de cabeçalhos LCP, não tiveram drops. A segunda preservou apenas a direção em relação ao MAC local, sem gravar os endereços MAC. Segundo a [RFC 1661, seção 5.8](https://www.rfc-editor.org/rfc/rfc1661.html#section-5.8), os códigos 9 e 10 representam Echo-Request e Echo-Reply. Foram observados pedidos vindos do peer respondidos pelo W6x antes e depois da última janela; às 15:26:39,359 e 15:26:40,360 o W6x emitiu pedidos próprios sem resposta correspondente observada até o término dessa captura. Não há baseline demonstrando que o peer responde a pedidos próprios do W6x em condições saudáveis. Portanto, esse achado é complementar e não prova por si só onde ocorreu a falha. A sessão permaneceu ativa.

## Conclusão e próxima investigação

A ONT continuou respondendo pelo mesmo enlace físico durante as ausências pelo PPPoE. Isso reduz a hipótese de parada geral da CPU do W6x, perda completa do enlace Ethernet ou indisponibilidade total da ONT. A captura também não sustenta saturação amostrada de CPU/CAKE como explicação dessas janelas.

Ainda permanecem possíveis o caminho específico de PPPoE no driver/NIC do W6x, o encaminhamento da ponte da ONT, o acesso GPON e o peer/rede da operadora. A resposta do gerenciamento da ONT não testa sua ponte nem seu enlace óptico. O ICMP de gerenciamento saiu com DSCP48 e o ICMP externo com DSCP0; são caminhos e tratamentos diferentes. O ponto de captura de saída do kernel não comprova transmissão no fio. Não existe prova suficiente para declarar a operadora culpada, excluir todo problema de QoS ou anunciar uma correção definitiva.

Com os dois equipamentos disponíveis, o próximo avanço útil é correlacionar estes horários com contadores/logs de encaminhamento e ópticos da ONT/OLT e da sessão no BNG. Não foi localizado na interface consultada da ONT um contador de erros ópticos que permita fazer essa correlação local. O registro para investigação conjunta foi preparado em arquivo local, sem envio a terceiros. Alterar filas, limites de RAM ou velocidades neste ponto não seria uma correção sustentada pelo mecanismo observado.

## Evidências e preservação

Resultado selecionado: `docs/audit/evidence/qos-2026-11-05/wan-ont-synchronous-result.json`. Scripts, cabeçalhos e estatísticas em `Evidencias locais/WAN-ONT-sincrono-2026-11-05/`, fora do Git. Hashes de SQM, firewall e equipe_dashboard idênticos ao baseline; nenhum serviço reiniciado, nenhuma alteração persistente de rede/QoS/ONT. Todos os processos de coleta próprios foram encerrados e a ausência foi verificada. Não houve VM, mock, partida, teste de carga máxima ou mudança de UI neste lote; validação visual não se aplica. Auditoria documental local executada após o registro.
