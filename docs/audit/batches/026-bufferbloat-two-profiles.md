# Lote 026 — bufferbloat dos dois perfis e redução controlada de download

Sessão física de 05–06/11/2026, fuso America/Sao_Paulo. **Meta A+ em todas as rodadas não atingida.** Seguido o [protocolo canônico](../../QOS_TEST_PROTOCOL.md). Sem commit, publicação, instalação, reboot ou mudança permanente de parâmetros. Não há homologação de A+ geral.

## Condições e cobertura

W6x `192.168.73.1`, board `acer,predator-w6x-stock`, OpenWrt 25.12.6/kernel 6.12.112, ARK 2.2.1. Cliente Mac via Ethernet `en6`, 1000baseT full duplex; WAN física eth1 2,5 Gb/s. CAKE e HFSC + FQ-CoDel em 720/700 Mb/s, overhead 44, mpu 64, Autorate 0. Fontes locais e cinco arquivos QoS do runtime com hashes coincidentes; árvore já tinha alterações anteriores. Backups privados fora do repositório.

Três resultados comparáveis por ferramenta e perfil: Waveform, Cloudflare, FAST, BufferSpeed web e app nativo 0.2.8 (27), total de 30. Duas janelas com possível carga concorrente foram conservadas e repetidas, uma preparação Cloudflare falhou e foi refeita; seis medições adicionais avaliaram download 650. As opções do experimento foram conferidas no TC, além do UCI. Uma ferramenta gerava carga por vez nos comandos desta coleta; tráfego leve de terceiros não foi interrompido. Os perfis diferem em classificação/AQM, portanto a comparação não isola somente o escalonador.

BufferSpeed web: 16 conexões, 10 s por fase, download/upload/combinado habilitados, WebSocket desabilitado, servidor automático mais próximo no Brasil; app: 16 fluxos e 140 amostras. A janela nativa passou de 4310×2546 na bateria CAKE para 1600×1264 no HFSC e nos experimentos, sem reiniciar o app; diferença de renderização/tempo é um fator de confusão para comparar vazão entre motores. `networkQuality` permaneceu suspenso pelo panic anterior. Hardware real autorizado pela exceção da sessão; não houve VM/mock nesta bateria.

## Notas da bateria principal

| Ferramenta | CAKE 720/700 | HFSC 720/700 |
|---|---|---|
| Waveform | A+ / A+ / A+ | A+ / A+ / A+ |
| BufferSpeed web | A+ / A+ / A+ | A+ / A / A+ |
| BufferSpeed app | A+ / B / C | A / A / A |

FAST e Cloudflare não atribuem A+ nesta interface; seus números não foram convertidos em uma nota inventada. Uma única nota inferior já reprova o critério solicitado. Todos os resultados, inclusive falhas, estão em [results.json](../evidence/026-bufferbloat-two-profiles/results.json).

## Medições comparáveis

| Rodada | Nota | Download / upload (Mb/s) | Latência (ms) |
|---|---|---:|---|
| CAKE-waveform-1 | A+ | 630.7 / 156.1 | idle 273; added_download 0; added_upload 0 |
| CAKE-waveform-2 | A+ | 633.6 / 253.4 | idle 25; added_download 3; added_upload 1 |
| CAKE-waveform-3 | A+ | 547.9 / 281.1 | idle 26; added_download 0; added_upload 0 |
| CAKE-cloudflare-1 | sem nota | 601 / 115 | Unloaded latency: média 12.1, máx 18.5; Latency during download: média 65, máx 3140; Latency during upload: média 8.48, máx 44.1 |
| CAKE-cloudflare-2 | sem nota | 597 / 123 | Unloaded latency: média 11.9, máx 16.9; Latency during download: média 7.61, máx 12.6; Latency during upload: média 5.81, máx 16 |
| CAKE-cloudflare-3 | sem nota | 603 / 111 | Unloaded latency: média 12, máx 27.5; Latency during download: média 11.3, máx 32.3; Latency during upload: média 8.46, máx 40.6 |
| CAKE-fast-1 | sem nota | 680 / 640 | idle 5; loaded 6 |
| CAKE-fast-2 | sem nota | 680 / 640 | idle 5; loaded 5 |
| CAKE-fast-3 | sem nota | 700 / 660 | idle 6; loaded 5 |
| CAKE-bufferspeed-web-1 | A+ | 580 / 156 | idle 20; download 18; upload 20; combined 19; worst_5_percent 22 |
| CAKE-bufferspeed-web-2 | A+ | 573 / 172 | idle 19; download 19; upload 19; combined 19; worst_5_percent 21 |
| CAKE-bufferspeed-web-3 | A+ | 574 / 164 | idle 19; download 19; upload 19; combined 19; worst_5_percent 21 |
| CAKE-bufferspeed-app-1 | A+ | 598.3 / 532.6 | idle 19; download 20; upload 20; combined 23 |
| CAKE-bufferspeed-app-2 | B | 628.4 / 490.7 | idle 20; download 19; upload 19; combined 56 |
| CAKE-bufferspeed-app-3 | C | 627.9 / 292.8 | idle 20; download 20; upload 102; combined 35 |
| HFSC-waveform-1 | A+ | 579.8 / 250.7 | idle 25; added_download 1; added_upload 1 |
| HFSC-waveform-2 | A+ | 650.4 / 195 | idle 25; added_download 1; added_upload 1 |
| HFSC-waveform-3 | A+ | 645.4 / 259.7 | idle 25; added_download 1; added_upload 0 |
| HFSC-cloudflare-1-recheck | sem nota | 673 / 114 | Unloaded latency: média 10.8, máx 14.9; Latency during download: média 10.5, máx 14.1; Latency during upload: média 7.34, máx 12.6 |
| HFSC-cloudflare-2-retry | sem nota | 644 / 98.5 | Unloaded latency: média 18, máx 39.2; Latency during download: média 8.91, máx 29.3; Latency during upload: média 34.7, máx 2520 |
| HFSC-cloudflare-3 | sem nota | 656 / 134 | Unloaded latency: média 87.2, máx 3170; Latency during download: média 7.9, máx 13.3; Latency during upload: média 5.09, máx 11.4 |
| HFSC-fast-1 | sem nota | 630 / 670 | idle 6; loaded 6 |
| HFSC-fast-2 | sem nota | 730 / 660 | idle 6; loaded 6 |
| HFSC-fast-3-recheck | sem nota | 740 / 650 | idle 5; loaded 5 |
| HFSC-bufferspeed-web-1 | A+ | 576 / 270 | idle 19; download 19; upload 19; combined 19; worst_5_percent 20 |
| HFSC-bufferspeed-web-2 | A | 252 / 141 | idle 19; download 19; upload 18; combined 26; worst_5_percent 22 |
| HFSC-bufferspeed-web-3 | A+ | 516 / 159 | idle 19; download 19; upload 19; combined 19; worst_5_percent 23 |
| HFSC-bufferspeed-app-1 | A | 685.8 / 574 | idle 20; download 6; upload 19; combined 24 |
| HFSC-bufferspeed-app-2 | A | 690.1 / 552.6 | idle 19; download 20; upload 23; combined 32 |
| HFSC-bufferspeed-app-3 | A | 685.4 / 526.6 | idle 20; download 22; upload 20; combined 30 |

Os valores `idle/download/upload/combined` são RTTs exibidos, e `added_download/added_upload` são acréscimos do Waveform. No FAST, `loaded` é agregado. O campo web `worst_5_percent` reproduz o rótulo do site, sem assumir equivalência exata ao P95 bruto.

## Picos, limites das notas e carga efetiva

- Waveform CAKE 1: repouso médio 273 ms, P95 **1.110 ms**, máximo **2.069,8 ms**. O A+ foi obtido sobre uma referência inflada; não aprova disponibilidade. CAKE 2: máximos DL 228,6/UL 140,7 ms. HFSC 3: máximo DL 171,6 ms mesmo com A+.
- Cloudflare CAKE 1: download médio 65 ms, mediana 10,3 ms, máximo **3.140 ms**. HFSC 2 repetido: upload médio 34,7 ms, mediana 8,8 ms, máximo **2.520 ms**. HFSC 3: repouso médio 87,2 ms, mediana 10,1 ms e máximo **3.170 ms**. Perda 0% nessa amostragem do site não elimina esses atrasos.
- Waveform CAKE 3 informou mínimo DL **−19,8 ms**; FAST CAKE 3 informou 6 ms ocioso/5 ms carregado. Valores preservados como limitações de medição, sem interpretação física. App HFSC 1 exibiu DL 6 ms contra repouso 20 ms e nota A, preservada sem reinterpretar o algoritmo.
- A maior parte dos testes Waveform/BufferSpeed web/Cloudflare ficou bem abaixo de 700 Mb/s no upload. A+ nessas rodadas não comprova que o SQM controla saturação total dessa direção. FAST chegou mais perto: CAKE 640–660 Mb/s UL; HFSC comparável 650–670 Mb/s UL.
- Máximos/P95 de todas as fases Waveform foram recuperados dos seis links públicos de resultados, incluídos no JSON e nos arquivos `.result.ax.txt`. A exportação CSV não apareceu utilizável no layout normal nem no layout amplo observado; nenhum CSV foi fabricado. Isso limita a reanálise amostra por amostra.

## Sondas independentes e controle ocioso

Sondas simultâneas ao gateway, dois destinos ICMP e conexão TCP IPv4 externa, além de CPU por núcleo, TC, softnet e interfaces físicas, a cada segundo. A primeira carga começou após 184,8 s de controle. A coleta não é um benchmark de ping de jogo; amostragem de CPU/TC pode perder eventos subsegundo.

- **CAKE-initial-idle**, 184.8 s: CPU máxima de núcleo 13.0%; lacunas LAN 0, externas 4/4; TCP máximo 2006.977 ms, 0 tentativas falhas.
- **HFSC-idle-control**, 201.1 s: CPU máxima de núcleo 12.26%; lacunas LAN 0, externas 6/6; TCP máximo 2007.057 ms, 2 tentativas falhas.
- **CAKE650-idle-control**, 201.1 s: CPU máxima de núcleo 44.86%; lacunas LAN 0, externas 4/4; TCP máximo 2007.522 ms, 1 tentativa falha.
- **CAKE650V-idle-control**, 259.9 s: CPU máxima de núcleo 14.15%; lacunas LAN 0, externas 6/6; TCP máximo 2009.044 ms, 0 tentativas falhas.

No controle HFSC, backlog UL 0/DL máximo 168 bytes, zero incremento de drops AQM e CPU máxima 12,26%; houve seis respostas ausentes por destino externo e falhas TCP. As ausências repetiram aproximadamente a cada 93 s nesse controle. Assim, fila cheia não é condição necessária da pausa. LAN estável e problemas cruzados em destinos/protocolos apontam para investigação no caminho WAN/acesso, mas não separam W6x/PPPoE/NIC, ONT/GPON e operadora. Os dados não provam culpa do ISP.

Sob carga nativa, CAKE chegou a 100% em amostras de núcleo e backlog DL 5,52 MB; a rodada B teve CPU máxima 88,35% e backlog DL 5,23 MB, e a C 91,09%. HFSC também atingiu 100% em uma rodada. Portanto, saturação de CPU merece acompanhamento, mas não explica sozinha todas as notas ruins. Softnet dropped permaneceu zero. O contador Linux `rx_dropped` da eth1 aumentou inclusive em controle ocioso, sem RX/TX errors ou mudança de carrier; a consulta filtrada ethtool não trouxe contadores de erro/drop de hardware não zero. O significado/origem desses descartes não foi isolado, e não devem ser somados a perda externa nem atribuídos automaticamente ao driver.

## Experimentos de download 650/700

As três primeiras medições abaixo usaram UL `split-gso`, recriado pelo seletor/restart, enquanto o controle original tinha `no-split-gso`. São exploratórias e não isolam só o download. A conferência identificou essa diferença; o estado original foi restaurado, o ajuste foi repetido com promoção das opções e novo controle de três minutos. No segundo trio (`CAKE650V`), comparação estruturada dos TC comprovou **somente** bandwidth ingress 720→650 Mb/s diferente; UL e demais opções iguais ao início. A prova está em [tune-verified.json](../evidence/026-bufferbloat-two-profiles/tune-verified.json).

| Rodada | Nota | Download / upload (Mb/s) | Latência (ms) |
|---|---|---:|---|
| CAKE650-bufferspeed-app-1 | A+ | 570 / 402.8 | idle 20; download 27; upload 20; combined 27 |
| CAKE650-bufferspeed-app-2 | A | 567.1 / 454.3 | idle 19; download 23; upload 20; combined 29 |
| CAKE650-bufferspeed-app-3 | A | 567.4 / 530.8 | idle 19; download 20; upload 28; combined 29 |
| CAKE650V-bufferspeed-app-1 | A | 565.4 / 580 | idle 20; download 21; upload 23; combined 26 |
| CAKE650V-bufferspeed-app-2 | A+ | 577.3 / 457.1 | idle 19; download 20; upload 19; combined 25 |
| CAKE650V-bufferspeed-app-3 | A | 567 / 562.7 | idle 19; download 20; upload 23; combined 31 |

O teto menor é um candidato para reduzir backlog sob carga, porém este ensaio não aprovou A+ consistente e não corrige a pausa externa ociosa. Não houve justificativa para manter perda de capacidade como solução definitiva. Nenhum patch de produto ou nova heurística de Autorate foi introduzido com base somente nas notas.

## Interferências e falhas preservadas

O app passou a mostrar uma rodada C às 23:50 (620,2/439,5 Mb/s, UL 111 ms, repouso 20 ms), sem comando desta coleta. O usuário informou não tê-la iniciado. Origem não identificada; não foi atribuída ao usuário nem contada como rodada isolada. Por precaução, FAST HFSC 3 e Cloudflare HFSC 1 originais foram classificados com possível concorrência, mantidos no JSON e repetidos. O horário do app permaneceu estável nas repetições. Cloudflare original mostrou UL máximo 1.520 ms; esse resultado não foi apagado.

Uma preparação Cloudflare deixou Start desabilitado, sem resultado de carga, e foi refeita. O controlador temporário falhou inicialmente ao carregar a biblioteca com `set -u` e `ARK_LIB_DIR` não definido: UCI já indicava 650, mas TC ainda 720. O estado foi conferido antes de retomar, o ambiente da biblioteca foi corrigido e nenhuma carga pontuada ocorreu nesse intervalo. Falha do harness, não defeito comprovado do QoS. `sh -n` passou localmente e no BusyBox.

Console observado: Waveform/FAST sem erros capturados; BufferSpeed web/Cloudflare registraram mensagens genéricas NaN/Object sem contexto suficiente para atribuir causa. Evidência sanitizada guardada; isso não demonstra falha do LuCI. Nenhuma interface ARK foi alterada nesta tarefa.

## Comparação de CPU, RAM e recomendação

Análise posterior da telemetria desta mesma bateria, sem nova carga ou mudança no roteador. Recomendação provisória pelo conjunto medido: **HFSC + FQ-CoDel, download 720000/upload 700000 kbit/s, overhead 44, mpu 64 e Autorate 0**, usando o perfil HFSC já testado. Teve pior nota A, frente a C no CAKE, e download nativo 685,4–690,1 Mb/s versus 598,3–628,4 Mb/s. Isso favorece o equilíbrio observado de estabilidade/vazão; não prova superioridade geral do motor, nem A+ consistente ou correção da pausa WAN. A máquina permaneceu no CAKE original após a restauração; esta recomendação não foi aplicada novamente.

Nos 15 resultados comparáveis de cada perfil, a média abaixo considera somente intervalos com tráfego TC >=100 Mb/s. CPU total é a média dos quatro núcleos; os picos são amostrados nas janelas completas. Cargas/servidores não atingiram vazões idênticas, portanto não se deve interpretar diferenças pequenas como eficiência causal do algoritmo.

| Perfil | CPU média total durante carga | Pico CPU total | Pico de um núcleo | RAM ocupada estimada máxima | RAM disponível mínima |
|---|---:|---:|---:|---:|---:|
| CAKE 720/700 | 30.9% | 72.9% | 100% | 320.7 MiB | 665.7 MiB |
| HFSC 720/700 | 32.9% | 66.9% | 100% | 290.8 MiB | 695.6 MiB |

O kernel expõe 986,4 MiB de RAM; o total foi conferido posteriormente no mesmo boot. Ocupação é `MemTotal − MemAvailable`, estimativa do sistema inteiro incluindo kernel e serviços, não alocação exclusiva do QoS. O mínimo de RAM não aponta esgotamento. Em 100% de um núcleo ainda pode haver capacidade nos demais; isso também não exclui gargalo em uma fila/thread.

Somente nas três rodadas nativas de 16 fluxos, CPU média total sob carga foi CAKE **46,32%**, HFSC **46,40%** e CAKE 650/700 verificado **43,82%**. Todos tiveram pico de 100% em algum núcleo. O teto 650 reduziu modestamente a média nesse recorte, mas gerou A/A+/A e download 565,4–577,3 Mb/s; não foi o melhor equilíbrio observado. Valores, filtros e dados por rodada estão em [resources.json](../evidence/026-bufferbloat-two-profiles/resources.json).

## Restauração e encaminhamento

Preservação final confirmada: mesmo boot, hashes de todos os `/etc/config/*` e hash nft stateless idênticos ao início; tipos e opções TC iguais ao ignorar handles. Handles mudaram pelos restarts esperados. Cinco arquivos QoS do runtime também mantiveram os hashes iniciais. Retorno temporizado desarmado e coletor encerrado sem erros. [Verificação](../evidence/026-bufferbloat-two-profiles/preservation.json).

W6x devolvido a CAKE 720/700 Mb/s, overhead 44, Autorate 0 e opções iniciais. Nenhuma alteração do usuário foi sobrescrita pela restauração: hashes esperados e ausência de UCI pendente foram verificados em cada mudança. Nenhuma janela de resultado comparável contém transição de motor/handle/teto registrada pelo coletor.

Próximo diagnóstico sustentado: separar os pontos WAN com outro cliente cabeado/bypass autorizado ou espelhamento externo, cruzando PPP/Ethernet/ONT e destinos durante a pausa. Essa topologia não foi modificada nesta sessão. Só depois de localizar a pausa faz sentido homologar tetos e opções de segmentação com carga que sature as duas direções e repetir a bateria completa. Reduzir indefinidamente a taxa ou selecionar apenas A+ não satisfaz o aceite.

Evidências sanitizadas: [pasta](../evidence/026-bufferbloat-two-profiles/), [resumo do coletor](../evidence/026-bufferbloat-two-profiles/summary.json), [notas e métricas](../evidence/026-bufferbloat-two-profiles/results.json). Coleta completa e backups privados permanecem em `Evidencias locais/Bufferbloat-026-2026-11-05/`, fora do repositório.
