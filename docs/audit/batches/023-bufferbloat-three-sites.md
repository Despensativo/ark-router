# Lote 023 — bufferbloat em três sites, três rodadas por site

Data: **05/11/2026**, monitoramento de **19:59:39 a 20:22:15**, horário de São Paulo. Foram concluídos **nove testes reais**, em sequência Waveform → Cloudflare → FAST, repetida três vezes. Cliente Mac por Ethernet `en6`, link 1000baseT full-duplex, gateway W6x `192.168.73.1`, OpenWrt 25.12.6 / kernel 6.12.112.

## Resultado

O resultado não foi consistentemente bom em todos os cenários. O FAST mostrou 5 ms em repouso e sob carga nas três rodadas. O Waveform variou entre **A+, C e A**. Waveform e Cloudflare registraram picos de **2,06 a 2,57 segundos**, apesar de medianas baixas. A medição atual não permite declarar o problema resolvido nem atribuir os picos exclusivamente ao SQM, ao navegador ou à operadora.

Nenhuma configuração foi ajustada para favorecer um teste. CAKE permaneceu em **720 Mb/s download / 620 Mb/s upload**, com os mesmos handles e opções. Os hashes de todos os arquivos `/etc/config/*` e do ruleset nft sem contadores coincidiram antes/depois. Esta bateria mede o estado atual após o [lote 022](022-runtime-native-deployment.md); não é um A/B que demonstre ganho causado pelas correções daquele lote.

## Waveform — médias do CSV e picos da interface

Vazões em Mb/s; latências em ms. O CSV do Waveform limita aumentos negativos a zero na coluna de aumento, por isso os zeros abaixo não significam igualdade matemática das médias brutas.

| Rodada | Download | Upload | Repouso médio | Aumento download | Aumento upload | Pico download / upload | Nota |
|---|---:|---:|---:|---:|---:|---:|---|
| 1 | 628,87 | 212,04 | 27,24 | +1,39 | 0 | 184 / 38,4 | A+ |
| 2 | 590,60 | 177,08 | 25,66 | +1,01 | +67,99 | 35,1 / 2064,7 | C |
| 3 | 512,74 | 121,71 | 26,69 | +11,91 | 0 | 548,7 / 49,7 | A |

Resultados públicos: [rodada 1](https://www.waveform.com/tools/bufferbloat?test-id=34e3433a-f11d-4443-b8fa-03eaa1ad834b), [rodada 2](https://www.waveform.com/tools/bufferbloat?test-id=6ae1872a-0f3a-4c6b-810b-1dda3cf3acb9), [rodada 3](https://www.waveform.com/tools/bufferbloat?test-id=b520545c-0a83-45c5-a09d-253bf3f0df0e). CSVs originais preservados nas evidências. As descrições promocionais renderizadas pelo site não foram tratadas como diagnóstico da causa.

## Cloudflare — médias detalhadas e extremos

O painel principal mostra **medianas** de latência; a tabela usa as **médias dos detalhes** para calcular o aumento. Assim, a primeira rodada mostra mediana de download 9,95 ms, mas média de 52,3 ms devido ao pico de 2570 ms. Não se deve interpretar somente a mediana como ausência de problemas.

| Rodada | Download Mb/s | Upload Mb/s | Repouso médio ms | Aumento download ms | Aumento upload ms | Pico download / upload ms | Perda do site |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 609 | 119 | 12,8 | +39,5 | −1,1 | 2570 / 28 | 0% |
| 2 | 610 | 82,3 | 10,8 | +1,3 | +0,3 | 30,1 / 23,6 | 0,1% |
| 3 | 540 | 75,3 | 11,4 | +41,5 | −1,3 | 2520 / 59,3 | 0% |

O [Cloudflare Speed Test](https://speed.cloudflare.com/) foi executado pelo navegador local. Seu exportador CSV não gerou um download observável no navegador integrado; os registros deste site são os valores visíveis, detalhes acessíveis e screenshots, sem alegação de amostras brutas exportadas. Não houve publicação em redes sociais.

## FAST.com — valores mostrados pelo site

| Rodada | Download Mb/s | Upload Mb/s | Não carregado ms | Carregado ms | Aumento mostrado ms |
|---|---:|---:|---:|---:|---:|
| 1 | 670 | 550 | 5 | 5 | 0 |
| 2 | 670 | 550 | 5 | 5 | 0 |
| 3 | 700 | 560 | 5 | 5 | 0 |

Em cada execução do [FAST.com](https://fast.com/pt/), “Mostrar mais informações” foi aberto e o indicador de upload terminou como `succeeded`. O site fornece um valor agregado de latência carregada; não foram inventados picos ou valores separados por direção. As rotas/servidores e os métodos diferem entre sites, portanto não se compara o ping absoluto de 5 ms com o de 27 ms como se fossem o mesmo destino.

## Observações independentes no W6x

- **Tráfego atravessou as filas reais:** amostras de dois segundos atingiram aproximadamente **713,0 Mb/s download / 611,3 Mb/s upload** nas qdiscs. São taxas de contador, diferentes da vazão útil exibida pelos sites. O FAST chegou mais perto dos tetos configurados; o upload de Waveform/Cloudflare ficou muito abaixo de 620 Mb/s, limitando conclusões sobre saturação máxima nesses testes.
- **CPU:** maior amostra por núcleo durante os testes foi **80,9%**; a coleta a cada dois segundos não exclui saturação subsegundo. Não é evidência de velocidade máxima suportada.
- **LAN:** 1351 respostas de sonda, mediana 0,588 ms, P95 0,870 ms, máximo 4,577 ms e nenhuma lacuna interna de sequência.
- **Sonda externa 1.1.1.1:** 1325 respostas e **26 respostas ausentes entre sequências**, em 13 eventos; mediana 4,935 ms, P95 5,522 ms e máximo respondido 65,427 ms. O intervalo mediano entre eventos foi **93,295 s**, com faixa de aproximadamente 92,2–183,6 s. Respostas que não chegaram não entram no cálculo de RTT; a mediana baixa não anula as lacunas.
- **Quatro eventos ocorreram fora das janelas dos testes**, com taxa máxima próxima de cada evento abaixo de 7,5 Mb/s no upload e 1,1 Mb/s no download. Portanto, também se observaram respostas externas ausentes sem saturação das filas. Isso mantém aberta a investigação do caminho WAN; ICMP sozinho não identifica a causa nem comprova perda de pacotes do jogo.

Os contadores de drops do CAKE representam ações da fila/AQM; não foram somados à perda reportada pelos sites ou à ausência de respostas ICMP. As janelas auxiliares incluem o tempo entre clique e captura, com trechos ociosos; não equivalem à duração exata de cada fase de download/upload. Outros clientes não foram desconectados: trata-se da rede real em uso, não de laboratório isolado.

## Evidências, preservação e próximo aceite

Os três CSVs Waveform, resultados estruturados e screenshots sem identificação do cliente estão na [pasta de evidências](../evidence/bufferbloat-2026-11-05/README.md). Telemetria completa e scripts reproduzíveis ficam em `Evidencias locais/Bufferbloat-023-2026-11-05/`, relativo ao workspace. Capturas iniciais auxiliares que não mostravam os números completos não foram usadas como prova de resultado. A coleta temporária foi encerrada; nenhum processo remoto `sh -s` de telemetria ficou ativo.

O próximo aceite para estabilidade exige localizar os picos com registros sincronizados de fase HTTP/TCP e tráfego WAN, preservando a configuração como controle, e repetir carga suficientemente próxima dos tetos nas duas direções. Os dados atuais sustentam **baixa latência habitual com falhas intermitentes ainda presentes**. Não sustentam “bufferbloat eliminado”, correção das pausas WAN anteriores ou melhoria causal do ping de jogo. Nenhum firmware, serviço, opção UCI ou regra foi alterado nesta bateria; sem commit, push ou release.
