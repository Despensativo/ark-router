# Waveform por Ethernet — 29/10/2026

Continuação instrumentada: [CPU/CAKE e sondas independentes no W6x](DIAGNOSTICO_W6X_MONITORADO_2026_10_29.md). Confirma estado efetivo e identifica timeouts externos sem CPU/fila altas, além de pressão no download em outra janela.

Sessão aproximadamente entre 14h17 e 14h20, America/Sao_Paulo. Duas novas rodadas executadas no navegador integrado local, sem alterar parâmetros do W6x ou do Mac. A repetição verificou a variação inesperada de upload da primeira rodada.

## Condições verificadas

- Rota padrão antes e depois: interface `en6`, adaptador USB Ethernet, gateway W6x `192.168.73.1`.
- Link Ethernet negociado em 1000baseT full-duplex, MTU 1500, ativo antes e depois.
- Nenhum proxy HTTP/SOCKS explícito apareceu na configuração de proxy consultada. Isso não é auditoria de todas as extensões/túneis do sistema.
- Não foram inspecionados nesta sessão CPU, SQM, AQL, WED, firmware ou contadores do roteador.
- Não houve controle dos demais clientes, processos ou alterações externas simultâneas; causalidade de diferenças entre rodadas permanece indeterminada.

## Resultados observados

Valores de latência, percentis e jitter são os exibidos pelo Waveform; não foram recalculados com a definição de jitter dos estudos anteriores.

| Métrica | Anterior fornecido | Rodada 1 | Rodada 2 |
|---|---:|---:|---:|
| Nota | A | A+ | A |
| Download (Mb/s) | 639,7 | 618,3 | 497,3 |
| Upload (Mb/s) | 475,6 | 212,7 | 573,1 |
| RTT médio ocioso (ms) | 18,8 | 16,2 | 16,7 |
| Acréscimo download, resumo arredondado (ms) | +25 | +0 | +9 |
| Acréscimo upload, resumo arredondado (ms) | +0 | +1 | +0 |
| p95 RTT durante download (ms) | 95,3 | 18,6 | 17,8 |
| Máximo RTT durante download (ms) | 346,9 | 23,3 | 2082,9 |
| Jitter durante download (ms) | 19 | 0,8 | 20,6 |
| p95 RTT durante upload (ms) | 21,2 | 20,9 | 18,1 |
| Máximo RTT durante upload (ms) | 38,5 | 77,4 | 21,5 |
| Jitter durante upload (ms) | 1,6 | 2,3 | 1 |

Links de evidência: [resultado anterior](https://www.waveform.com/tools/bufferbloat?test-id=b8614c81-ab59-4a86-984a-582665a85721), [rodada 1](https://www.waveform.com/tools/bufferbloat?test-id=5d80cb80-09c9-4ba9-9c37-a5c368ca7ead), [rodada 2](https://www.waveform.com/tools/bufferbloat?test-id=e0e9bd09-c3a5-4402-87f6-8086cec8ed65).

## Referência local complementar

Durante parte da primeira rodada, `ping -n -c 120 -i 0.5 192.168.73.1` registrou 120/120 respostas, 0% de perda, RTT mínimo/médio/máximo/desvio de **0,294/0,800/7,968/0,957 ms**. Esse resultado não cobre a segunda rodada nem prova ausência de congestionamento no tráfego encaminhado. ICMP também pode receber prioridade no ARK.

## Interpretação e próximo diagnóstico

1. O p95 de download nas duas novas rodadas ficou bem abaixo dos 95,3 ms anteriores. É observação entre testes, não prova de efeito de uma alteração específica.
2. A segunda rodada contém ao menos uma medição muito alta, 2082,9 ms, apesar de p95 17,8 ms e mediana 15,3 ms. Existe um evento de cauda importante; a nota A não o resume adequadamente.
3. Vazão variou entre rodadas, sobretudo upload. A primeira nota A+ ocorreu a apenas 212,7 Mb/s de upload; não homologa estabilidade a 800/800.
4. A coleta não localiza o evento entre navegador/cliente, caminho de rede, operadora e servidor. Não atribuir o pico ao W6x, à CPU ou ao CAKE sem coleta simultânea.
5. Antes de otimizar taxas ou rádio, o próximo ensaio útil é correlacionar uma sonda UDP/latência independente com CPU por núcleo e contadores CAKE/IFB no gateway, mantendo configuração e carga comparáveis. Fazer essa coleta somente leitura antes de propor qualquer mutação.
6. As fases de download/upload separadas do Waveform não homologam saturação bidirecional simultânea nem perda de pacotes da internet. O ping complementar mediu apenas o gateway local.

## Capturas

- [Detalhes da rodada 1](../screenshots/waveform-cabo-2026-10-29-rodada1.jpg).
- [Detalhes da rodada 2](../screenshots/waveform-cabo-2026-10-29-rodada2-detalhes.jpg).
- [Resumo da rodada 2](../screenshots/waveform-cabo-2026-10-29-rodada2-resumo.jpg).

Nenhuma mudança de configuração, deploy, teste de VM ou homologação de Wi-Fi foi realizada.
