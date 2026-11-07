# Lote 025 — parada real do LED e integridade da comparação QoS

Data: 05/11/2026. W6x `192.168.73.1`, board `acer,predator-w6x-stock`, OpenWrt 25.12.6/kernel 6.12.112. Trabalho físico autorizado para a investigação QoS; sem commit, push ou publicação. Backup privado do init original e telemetria em `Evidencias locais/QoS-025-led-mitigation-2026-11-05/` no workspace.

## Falha reproduzida e correção operacional

`/etc/init.d/ark-rainbowd stop` terminava com código **143** e o daemon continuava registrado no procd. O `stop_service()` do pacote chamava `killall ark-rainbowd` e `pkill -f /usr/sbin/ark-rainbowd`. No W6x, o primeiro comando encerrava o próprio shell de `rc.common` antes de sua chamada a `procd_kill`; o interruptor não desligava o serviço. O fluxo de `rc.common` foi conferido no próprio equipamento: `stop_service` → `procd_kill` → `service_stopped`.

Removido `stop_service()` de `ark-rainbowd`; o procd passa a gerenciar a parada. Em `ark-port-ledd`, removidas as mesmas chamadas de encerramento e movida a limpeza do LED/PID para `service_stopped()`, após `procd_kill`. A segunda correção foi testada localmente; o W6x não possui o LED AW21018 para validá-la fisicamente.

O init corrigido de `ark-rainbowd` foi aplicado ao W6x após identificação de board, backup e conferência de hash do arquivo anterior. Resultado real: `stop` retornou **0** e deixou **zero** instâncias; `start` retornou **0** e deixou **uma** instância. O arquivo instalado e o repositório têm SHA-256 `6dfe1a46d0efb9edf164d54d1faa416d13b2a67a32d26aa56ecf783f5c4cdee6`. O retorno temporizado usado na triagem está desarmado e seu processo já terminou. Boot ID preservado; `/etc/config/system` e regras nft sem alteração nesta coleta. Espaço livre no overlay ao fim: 47.160 KiB.

O teste local `tests/test_led_service_lifecycle.py` simula um `killall` que encerra o shell chamador e confirma que os dois serviços alcançam `procd_kill`. `sh -n` passou para os dois scripts. Essa correção torna o desligamento do daemon efetivo; **não comprova correção do kernel panic** observado anteriormente no controlador SPI/WS2812B.

## LED ligado/desligado versus pausas WAN

Coleta contínua com sondas LAN, dois destinos externos e conexão TCP, além de CPU, qdisc e contadores. Todas as janelas ficaram no mesmo CAKE 720/700 Mb/s, sem transição de qdisc dentro das janelas:

| Estado do LED | Duração | Lacunas ICMP em cada destino externo | Lacunas LAN | CPU máxima de núcleo |
|---|---:|---:|---:|---:|
| Ligado A | 178 s | 4 | 0 | 49,06% |
| Desligado B | 237 s | 4 | 0 | 13,46% |
| Ligado A2 | 109 s | 2 | 0 | 12,87% |

As pausas externas recorrentes permaneceram com o LED desligado. Isso exclui **a animação RGB como condição necessária** para esses eventos nesta amostragem; não localiza definitivamente a perda entre driver PPPoE/NIC, ponte da ONT, GPON e rede da operadora. A comparação LED não incluiu carga de saturação nem repetição do panic.

## Estado QoS mudou no início da coleta

O snapshot às 22:18:43 tinha `sqm.wan1.upload=620000` e CAKE upload efetivo de 77,5 Mb/s por fila. Às **22:18:47**, o log do SQM registrou parada e partida com **700000 Kbit/s** de upload; a telemetria às 22:18:48 mostrou novos handles e CAKE upload efetivo de 87,5 Mb/s por fila. `/etc/config/sqm` mudou de hash nesse intervalo e encerrou sem mudanças UCI pendentes. O responsável pela mudança não foi identificado; nenhum ajuste de taxa foi atribuído ao LED. As três janelas A/B começaram após a transição, portanto usaram taxas iguais. O estado final do W6x permaneceu em **720000/700000**, com uma instância do rainbowd ativa. Não se sobrescreveu uma alteração de origem não identificada.

O relatório de `scripts/qos_benchmark.py` agora inclui `all.qdisc_transitions`, `windows[].qdisc_transitions` e aviso de comparação. Registra hora, direção, motor, handle e teto anterior/novo. Uma regressão local com troca de 77,5 para 87,5 Mb/s confirma que a janela afetada é marcada e a janela estável posterior não é. Na evidência real, as duas transições ocorreram **antes** da primeira janela LED. Assim, o teste não cria uma falsa conclusão de que um perfil QoS fixo existiu durante toda a coleta.

## Limites e próximo diagnóstico

A solução operacional entregue é o desligamento funcional do daemon LED e a detecção automática de troca de estado no teste QoS. Não há evidência para prometer A+ constante: os ensaios do [lote 024](024-qos-models-and-test-protocol.md) reprovaram essa meta, e pausas WAN também surgem ociosas com filas vazias. O próximo teste de localização precisa de observação fora do W6x ou captura no enlace físico para distinguir saída no fio e resposta da rede; repetir apenas sites de bufferbloat ou baixar taxas sem essa distinção pode mascarar o problema.

Validação: W6x real para ciclo de vida do rainbowd e A/B LED; mock local para port-ledd e troca de qdisc; Python local para relatório. `bash tests/run_local_tests.sh`, `sh -n` dos dois inits, `git diff --check` e `scripts/generate_code_map.py --check` aprovados. Nenhuma VM nesta exceção de QoS. Nenhum resultado aqui homologa reboot, driver SPI ou A+ em três sites.
