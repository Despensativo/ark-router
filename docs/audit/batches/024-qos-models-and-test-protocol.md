# Lote 024 — CAKE, HFSC + FQ-CoDel e protocolo reproduzível de QoS

Data: **05/11/2026**, horário de São Paulo. Testes físicos autorizados no Acer Predator Connect W6x `192.168.73.1`, board `acer,predator-w6x-stock`, OpenWrt **25.12.6**, kernel **6.12.112**, ARK **2.2.1** com alterações locais. Cliente Mac por Ethernet `en6`, 1000baseT full-duplex. Referência Git `a5ab48c279649e4f6f9fdb85687cb5127bd373f2`; os hashes dos scripts efetivamente instalados estão nas evidências, pois o HEAD sozinho não descreve esta árvore de trabalho.

## Resultado e limite de aceite

**Nenhum dos dois perfis passou na meta de A+ em todas as repetições.** O HFSC + FQ-CoDel apresentou notas A/A/C no BufferSpeed instalado e C/A/A+ no BufferSpeed web. O CAKE fez A+/A/A no aplicativo e A+/A+/A+ na web; sua primeira rodada do app também reportou 5% de perda. Não se selecionou a melhor tentativa para declarar aprovação.

Ambos usaram os tetos **720000/620000 kbit/s**, enquadramento overhead 44/mpu 64. A troca foi feita pela ação pública `sqm-engine-select hfsc_fq_codel`, com backup privado, identificação de board, conferência de alterações UCI pendentes/hash esperado e retorno temporizado. Os perfis diferem também em classificação, AQM e ajustes auxiliares do fluxo público: isto não isola apenas o algoritmo de escalonamento. As rodadas ocorreram em horários distintos, na rede real com outros clientes, e houve reboot entre as primeiras medições CAKE e a comparação HFSC. As diferenças de vazão não demonstram um ganho causal do motor.

O [lote 023](023-bufferbloat-three-sites.md) já contém três rodadas CAKE em Waveform, Cloudflare e FAST. Este lote acrescenta seis BufferSpeed CAKE e doze testes HFSC: três no aplicativo, três no BufferSpeed web, três no Waveform e três no FAST. Cloudflare não foi repetido no HFSC; os três sites desse perfil são BufferSpeed, Waveform e FAST.

## BufferSpeed instalado no Mac — 0.2.8, build 27

Dezesseis fluxos, fases de repouso/download/upload/carga combinada. Vazões em Mb/s e latências em ms, conforme exibidas pelo app. Não foram acionados os botões de correção ou diagnóstico por IA do aplicativo.

| Motor | Rodada | Down | Up | Repouso | Download | Upload | Combinada | Jitter | Perda | Nota |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| CAKE | 1 | 622,0 | 397,5 | 34 | 33 | 22 | 25 | 11 | 5% | A+ |
| CAKE | 2 | 626,5 | 216,8 | 20 | 20 | 26 | 28 | 0 | 0% | A |
| CAKE | 3 | 629,4 | 473,6 | 21 | 21 | 21 | 28 | 1 | 0% | A |
| HFSC | 1 | 686,0 | 240,8 | 21 | 20 | 25 | 29 | 1 | 0% | A |
| HFSC | 2 | 684,5 | 484,8 | 20 | 22 | 21 | 28 | 1 | 0% | A |
| HFSC | 3 | 683,9 | 318,1 | 21 | 21 | 121 | 30 | 1 | 0% | C |

A janela HFSC-app-3 teve CPU máxima amostrada de **73,33%**, zero aumento de drops/squeeze softnet, LAN sem lacunas (máximo 4,647 ms), duas respostas ausentes em cada destino ICMP externo e uma conexão TCP de **2006,329 ms**. As filas HFSC chegaram a backlog de aproximadamente **1,23 MB upload / 3,52 MB download** nessa janela. Isso não permite atribuir todo o pico a um único componente; a janela contém todas as fases e interação, não somente upload.

## BufferSpeed no navegador

Dezesseis conexões, dez segundos por fase, download/upload/carga combinada ligados e WebSocket desligado. Os campos de repouso abaixo pertencem à análise de bufferbloat; o resumo principal pode apresentar outra amostra de repouso.

| Motor | Rodada | Down Mb/s | Up Mb/s | Repouso ms | Download ms | Upload ms | Combinada ms | P95 carregado ms | Nota |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| CAKE | 1 | 606 | 298 | 19 | 19 | 19 | 20 | 25 | A+ |
| CAKE | 2 | 590 | 150 | 20 | 20 | 20 | 21 | 27 | A+ |
| CAKE | 3 | 368 | 453 | 20 | 20 | 20 | 22 | 29 | A+ |
| HFSC | 1 | 668 | 157 | 20 | 25 | 100 | 22 | 39 | C |
| HFSC | 2 | 603 | 173 | 21 | 22 | 20 | 40 | 41 | A |
| HFSC | 3 | 645 | 231 | 20 | 20 | 19 | 24 | 29 | A+ |

Todas essas rodadas web reportaram 0% de perda. A rodada HFSC 2 mostrou jitter de 15,7 ms no resumo; as demais ficaram entre 0,4 e 1 ms. Várias fases ficaram abaixo dos tetos de shaping: uma boa nota com upload de 150 Mb/s não homologa o controle de 620 Mb/s.

## Waveform no HFSC — a nota pode ocultar instabilidade no repouso

Médias, P95 e máximos obtidos dos detalhes visíveis do site, sem alegação de CSV exportado nesta continuação. O aumento negativo em relação à média de repouso é limitado a zero pelo site na nota.

| Rodada | Down Mb/s | Up Mb/s | Repouso médio ms | Download médio ms | Upload médio ms | Máximo repouso / down / up ms | Nota |
|---|---:|---:|---:|---:|---:|---|---|
| 1 | 673,7 | 176,2 | 198,1 | 28,2 | 26,6 | 2086,5 / 38,3 / 38,6 | A+ |
| 2 | 711,3 | 276,4 | 26,4 | 29,4 | 50,2 | 34,5 / 106,6 / 2594 | A |
| 3 | 709,8 | 164,3 | 26,3 | 27,9 | 27,7 | 34,6 / 37,2 / 132,1 | A+ |

A primeira rodada teve **P95 de repouso 1115,2 ms** e mediana 26,7 ms. O pico em repouso inflou a referência e a nota A+ não significa ausência de interrupções. A segunda rodada exibiu mínimo de upload **−12,3 ms**, valor fisicamente impossível de RTT: ele foi preservado como artefato da medição do site, sem ser usado como evidência de latência negativa ou de melhoria.

Resultados: [rodada 1](https://www.waveform.com/tools/bufferbloat?test-id=6ac777b1-8ece-4f52-a003-d6f7682aa9de), [rodada 2](https://www.waveform.com/tools/bufferbloat?test-id=65d238de-f39b-42ff-a892-4f83e3c9a538), [rodada 3](https://www.waveform.com/tools/bufferbloat?test-id=dce5576f-adc7-4145-9c84-e6a944e5b5ca). Os textos promocionais não foram tratados como diagnóstico.

## FAST no HFSC

| Rodada | Download Mb/s | Upload Mb/s | Não carregada ms | Carregada ms |
|---|---:|---:|---:|---:|
| 1 | 710 | 600 | 5 | 5 |
| 2 | 700 | 590 | 5 | 6 |
| 3 | 700 | 590 | 5 | 6 |

O FAST fornece latência carregada agregada, sem nota A+ e sem máximos por direção nesta interface. Download e upload só contam como concluídos após estado `succeeded`.

## Reinicialização inesperada durante a triagem nativa

Às **20:54:19**, começou a primeira carga `networkQuality` no CAKE. Aproximadamente doze segundos depois, a telemetria SSH acabou; houve **36 respostas LAN ausentes**, entre 20:54:31,524 e 20:55:08,722. A redução do uptime, o pstore e a confirmação do usuário de que não reiniciou o equipamento demonstram reboot automático após **kernel panic**.

O pstore mostra timeout `leds_ws2812b spi1.0`, falha de mensagem SPI e erro de brilho `rgb:status` (−110), seguidos de escrita em memória somente leitura/Oops e `Kernel panic - not syncing: Oops: Fatal exception`. O contexto é a thread IRQ `irq/118-1100b00`; `/proc/interrupts` identifica IRQ118 como controlador `1100b000.spi`. O pacote instalado é `kmod-leds-ws2812b-6.12.112-r1`.

**O subsistema SPI/LED é o candidato sustentado pelo contexto, não uma causa exata já comprovada.** Não havia `/proc/kallsyms` nem `vmlinux/System.map` correspondente disponível para simbolizar o stack. Não se demonstrou que CAKE, Doctor ou a operadora causaram o panic. Não se alterou driver, firmware ou configuração de LED como tentativa de correção.

O primeiro protótipo não interrompeu as repetições após EOF da telemetria. As três tentativas `networkQuality` foram invalidadas: a primeira retornou dados parciais e `error_code=-1001`; as duas seguintes não tinham vazões válidas. Retorno de processo zero não significa sucesso do serviço. **Essa carga permanece suspensa no W6x até diagnóstico do kernel.** A comparação posterior por app/navegador só foi retomada após preservar o pstore e identificar o contexto; não foram feitas novas cargas networkQuality nem reboot manual.

## Gargalo: evidência e hipóteses separadas

| Observação | O que sustenta | Próxima verificação / situação |
|---|---|---|
| TCP externo ~2 s ou timeout, com filas vazias e CPU baixa fora das cargas | Instabilidade além da LAN também existe sem saturação do SQM; não é apenas prioridade ICMP | Sincronizar LAN/PPP/Ethernet e tráfego de acesso/servidor; causa exata WAN/ISP ainda aberta |
| HFSC-app-3: upload médio 121 ms, TCP ~2 s e lacunas externas, LAN estável | Pico observado por ferramentas independentes | Não basta trocar o escalonador; separar evento WAN e backlog com captura de fase |
| CAKE-app-1: núcleo 100% em amostras e app reporta perda | Processamento é candidato nessa carga específica | Repetir em controle estável; não extrapolar para todos os testes ou culpar CPU pelos eventos ociosos |
| Backlog HFSC cresce em algumas cargas | As filas reais participaram do tráfego; possível contribuição do perfil/AQM | Ajuste de uma direção por vez, após estabilizar controle e kernel |
| FAST aproxima mais os tetos; outros uploads variam muito | Servidor/método/caminho influenciam a vazão apresentada | Não classificar toda vazão baixa como limite do roteador |
| Panic no contexto SPI/LED | Defeito de estabilidade do kernel/driver precisa de investigação própria | Obter build com símbolos correspondente e reprodução isolada; sem patch especulativo no driver |

A coleta pós-panic cobriu **35 min 38 s**, incluindo controle, troca de motor, doze testes HFSC e restauração. LAN: **2129 respostas, zero lacunas**, mediana 0,648 ms/P95 1,021 ms/máximo 12,536 ms. As duas sondas ICMP externas tiveram respectivamente **48 e 47 respostas ausentes entre sequências**; seus máximos respondidos foram 49,835 e 47,474 ms. A conexão TCP IPv4 teve **sete falhas** e máximo de **2010,468 ms** entre sucessos. Houve **28 incidentes TCP** de pelo menos um segundo ou falha, nove fora das janelas de teste. Uma amostra ociosa HFSC teve TCP 2008,281 ms, CPU máxima próxima de 6,8%, taxas máximas próximas de 0,151/0,131 Mb/s e backlog zero nas duas direções. Essa combinação sustenta investigar o caminho externo sem atribuição causal automática ao ISP.

CPU máxima por núcleo nessa sessão: **93,4%**, RAM disponível mínima ~690 MiB e zero crescimento de drops/squeeze softnet. Não houve aumento de erros RX/TX ou carrier de eth0/eth1. O contador `eth1.rx_dropped` cresceu 1014; isso permanece separado da perda de rede dos sites. Duas amostras TC incompletas ocorreram durante a troca de motor/restauração, sem erro de parse nas doze janelas HFSC. Contadores e handles reiniciados por troca de qdisc não foram convertidos em taxas negativas. O último bloco de telemetria interrompido pelo encerramento do coletor foi descartado antes do resumo.

AQM drops não foram somados à perda externa. `rx_dropped` de interface é contador do caminho de recepção, não prova isolada de defeito físico ou perda no cabo. CPU e TC a cada segundo não excluem picos subsegundo. A coleta anterior do CAKE-app usou um destino TCP que recusava conexão; a coleta CAKE-web ainda resolvia hostname/fallback por tentativa. Esses dois controles TCP foram explicitamente excluídos da inferência de RTT externo. A coleta HFSC usa IPv4 resolvido uma vez e não mistura DNS em cada amostra.

## Correções aplicadas à ferramenta e ao procedimento

| Falha confirmada | Causa | Correção e evidência |
|---|---|---|
| Triagem tratava retorno zero como sucesso | Serviço devolve `error_code` em JSON e pode omitir capacidades | Exige código interno zero, vazões positivas e dados completos; regressão com −1001 |
| Repetições continuavam depois da perda de telemetria | EOF SSH não sinalizava falha ao orquestrador | Monitor encerra, salva erro e retorna falha; carga rápida para e não inicia próxima rodada |
| JSON TC HFSC inválido neste firmware | TC emite `"options":{default 3 }` | Normalização restrita ao defeito conhecido, sem ignorar JSON arbitrariamente inválido |
| Pico TCP misturava DNS/IPv6 | Resolução/fallback dentro de cada tentativa | IPv4 fixado antes da sessão; destino recusado dos ensaios iniciais descartado |
| Taxa derivada oscilava por arredondamento temporal | Contadores divididos por epoch inteiro | Usa uptime fracionário; ignora reset/troca de handle |
| Relatório lia metadados ExFAT ou linha JSON incompleta | Glob incluía `._*` e leitura simultânea da última linha | Exclui AppleDouble e linha final ainda não terminada; preserva dados completos |
| Resumo final perdia contadores físicos no encerramento | SIGINT podia terminar entre TIME e o restante do bloco | Descarta último bloco sem a estrutura já observada; regressão interrompida no meio da amostra |

Criados [coletor Python](../../../scripts/qos_benchmark.py), [12 regressões locais](../../../tests/test_qos_benchmark.py) e [protocolo operacional](../../QOS_TEST_PROTOCOL.md). O fluxo ensina controle ocioso, marcação das fases, três repetições, app e navegador, critério de A+ sem ocultar falhas, identificação de gargalo, backup e retorno. AGENTS, índice documental e contrato `ARK-SQM-001` apontam para esse procedimento. O coletor só consulta o roteador: não instala Python, não muda SQM e não adiciona serviço automático no boot.

## Encerramento e escopo da validação

**CAKE original restaurado**, com hash de `/etc/config/sqm` idêntico ao backup e todas as configurações UCI idênticas ao início da comparação pós-panic. Opções efetivas das qdiscs correspondem ao CAKE de controle; os handles mudaram conforme esperado após restart. Nas interfaces que já existiam no início da sessão, RPS e parâmetros de segmentação/txqueuelen coincidiram. Duas interfaces Wi-Fi adicionais (`phy1-ap1`/`phy1-ap2`) já estavam presentes no começo dos testes HFSC após o reboot e foram preservadas; RPS final também coincide com esse início. O arquivo wireless difere do estado anterior ao panic. Não se sobrepôs um backup antigo sobre o estado de Wi-Fi gerado pelo boot.

**Não se comprovou reversão integral do ruleset:** o hash nft sem contadores mudou entre controle pós-panic e final. Não havia um dump estrutural anterior que permitisse distinguir reordenação/recriação das chains e alteração semântica. Inspeção final: tabela `inet fw4`, 64 chains, 211 regras, quatro chains ARK esperadas e nenhuma flowtable; UCI firewall preservada. Esses números não substituem uma comparação semântica anterior/posterior. Não se recarregou o firewall para tentar igualar um hash. Essa limitação permanece aberta.

O retorno temporizado foi desarmado e terminou; coleta encerrada sem erros e **zero pidfiles remotos do coletor**. Boot ID pós-panic permaneceu igual e os dois arquivos pstore mantiveram hashes idênticos, sem evidência de outro panic. Os guardas adicionados depois do panic foram verificados em regressões locais, sem reproduzir deliberadamente um novo crash físico.

A bateria `bash tests/run_local_tests.sh` e as doze regressões do coletor foram aprovadas localmente. Não houve alteração de frontend nesta continuação. Os resultados de carga são de hardware real; falhas injetadas do coletor são mocks locais; VirtualBox não foi executado, conforme exceção explícita desta sessão. Isto não homologa kernel, Wi-Fi físico, estabilidade do jogo ou release.

Os arquivos estruturados e capturas sem identificação do cliente estão na [pasta de evidências](../evidence/qos-models-2026-11-05/README.md). Telemetria integral, backups e pstore originais permanecem privados em `Evidencias locais/QoS-024-models-2026-11-05/`, relativo ao workspace. Sem commit, push ou publicação. A investigação continua aberta para **panic SPI/LED, pausas externas e aceite A+ consistente**; a conclusão deste lote de comparação não equivale à resolução desses problemas.
