# Lote 015 — localização das faltas de resposta WAN e leitura da TP-Link (05/11/2026)

## Achado principal

Na rodada de seis minutos, cada uma das três sondas originadas no W6x enviou 360 requests e recebeu 352 replies: primeiro salto PPPoE 172.26.1.157, 1.1.1.1 e 8.8.8.8. As mesmas oito sequências ficaram sem reply nas três sondas, em quatro eventos separados por aproximadamente 93 segundos.

Os requests correspondentes foram observados na interface PPPoE e na Ethernet física eth1; nenhum reply correspondente foi observado em qualquer desses dois pontos durante a captura. Os três fluxos próprios têm presença idêntica entre os pontos: 0 discrepâncias. Isso localiza a investigação no caminho a partir do ponto de captura físico do W6x, que ainda inclui driver/NIC, transmissão/recepção elétrica, enlace, ONT e operadora.

**Não é prova de transmissão no fio nem de culpa da operadora/ONT.** AF_PACKET de saída registra a passagem pelo hook local, não a entrega elétrica. Uma resposta também pode deixar de ser gerada, ser filtrada/perdida ou atrasar. Não chamar a fração ICMP de perda geral da Internet. Não foram feitas alterações de QoS como tentativa de corrigir uma causa ainda não determinada.

## Método e validação da captura

- Período de coleta: 14:13:06.818–14:19:09.111 de Brasília, 360 s programados e 362,29 s incluindo encerramento.
- eth1: quadros Ethernet/PPPoE de sondas ICMP/IPv4 aos três destinos. pppoe-wan: Linux cooked v1 das mesmas sondas.
- O printer textual do tcpdump não suporta o formato cooked desta imagem. Desta vez, o stream foi decodificado em memória por um parser com suporte a Ethernet, VLAN, PPPoE e SLL v1. Self-tests de três encapsulamentos e truncamento passaram antes da coleta. Não foi persistido PCAP bruto nem conteúdo de aplicação; somente tipo, alvo, ID/seq, horários, DSCP/ECN e tamanho do cabeçalho/pacote.
- IDs das três sondas próprias foram conferidos com seus processos e sequência; pacotes de outras sondas/healthchecks existentes na rede foram excluídos do pareamento. As duas capturas observam os mesmos requests: não somar os contadores como testes independentes.
- Ambos os capturadores reportaram 0 / 0 drops do capturador. O decoder não registrou erros. Contagens/seqs casam com os resultados dos três processos ping.
- As sondas saíram com DSCP 0 nos dois pontos. Não foi criado teste ou regra adicional de remarcação. Os replies recebidos da Cloudflare vieram com DSCP 34; peer e Google, com 0. Isso não prova onde a marcação recebida foi aplicada.

## Eventos pareados

| Horário de requests sem reply, Brasília | Sequências | Destinos simultâneos |
|---|---|---|
| 14:13:47.469–14:13:48.469 | 40, 41 | primeiro salto + 1.1.1.1 + 8.8.8.8 |
| 14:15:20.483–14:15:21.483 | 133, 134 | primeiro salto + 1.1.1.1 + 8.8.8.8 |
| 14:16:53.497–14:16:54.498 | 226, 227 | primeiro salto + 1.1.1.1 + 8.8.8.8 |
| 14:18:26.511–14:18:27.511 | 319, 320 | primeiro salto + 1.1.1.1 + 8.8.8.8 |

A sequência perdida não mede por si só duração exata da interrupção. São duas sondas consecutivas a 1 Hz; o intervalo de 93 s é entre grupos. Os testes anteriores do PUBG mostraram pausas de recepção UDP próximas de 2,1 s, uma observação separada.

| Alvo | Requests na eth1 | Replies na eth1 | RTT médio / máximo pareado na eth1 |
|---|---:|---:|---:|
| 172.26.1.157, peer PPPoE | 360 | 352 | 2.170 / 20.177 ms |
| 1.1.1.1 | 360 | 352 | 4.182 / 5.431 ms |
| 8.8.8.8 | 360 | 352 | 19.213 / 19.793 ms |

Os tempos consideram replies recebidos; ausência de reply não entra na média. O Mac também observou lacunas nas sondas externas, enquanto o iPad respondeu 360/360 sondas locais. O Mac recebeu 718 respostas do gateway, sem lacunas entre seq 0–717, mas o processo foi encerrado sem resumo final: não inventar 720 transmissões ou duas perdas com base apenas no programado. A sonda Mac→Cloudflare também não produziu resumo final; não foi usada para calcular percentagem de perda.

## Estado do W6x e limites

- WAN eth1: 2500 Mb/s full-duplex. EEE desativado; pause RX/TX/autonegotiation de flow control desativados nas consultas. Carrier permaneceu 1, carrier_changes 1, carrier_down_count 0 nas amostras. Uptime PPPoE continuou crescendo; sem evidência de reconexão nessa janela.
- Incrementos rx_errors/tx_errors/rx_dropped/tx_dropped/rx_missed_errors/tx_carrier_errors: zero em eth1 e pppoe-wan no trecho amostrado. rx_checksum_errors histórico 1655 permaneceu igual na consulta posterior. Isso não prova integridade do fio nem exclui drops silenciosos/filtragem em hardware/driver.
- CAKE manteve handles 804b/804c e taxas 620/720 Mb/s; nenhum incremento de drops de raiz. Maiores peak_delay amostrados: upload 4.355 ms, download 7.09 ms. Não confundir esses valores do scheduler com máximo de todos os pacotes ou RTT da Internet.
- Maior utilização amostrada de um núcleo: 18.54%. Não foi observada saturação; amostras não excluem todo pico curto.
- Hashes UCI sqm/firewall/equipe_dashboard iguais antes/depois; sem restart, troca de perfil, velocidade física ou configuração WAN persistente nesta rodada.

## ONT atual e acesso de consulta

Usuário confirmou a **TP-Link XZ005-G6**, não a Huawei do histórico. A ONT acessível pela Ethernet WAN está em **192.168.1.1**, painel `/superadmin`. A página confirmou modelo XZ005-G6, XPON SFU com uma porta LAN 2.5Gb.

O endereço informado inicialmente, 192.168.18.1, seguia pelo default PPPoE. Foi tentado acesso local com endereço /32 e host route temporários, protegidos por limpeza automática; não houve resposta de vizinhança/ping ou banner SSH no teste limitado. Esses dois objetos temporários foram removidos e sua ausência conferida. Nenhuma alteração UCI ou interrupção do link. As aliases de gerenciamento já existentes em 192.168.1.x foram preservadas.

A porta SSH 22 de 192.168.1.1 não ofereceu banner nos testes limitados; isso não é diagnóstico de senha errada nem prova geral de serviço desativado. Nenhuma senha foi enviada por SSH. O painel principal pedia criação de senha; não foi preenchido. O usuário forneceu o caminho `/superadmin`, que apresentou o login existente. A autenticação de consulta funcionou com a credencial fornecida, sem criar/alterar senha, ativar serviços, salvar campos, fazer upgrade, reset ou reboot.

## Leituras ópticas selecionadas

| Indicador | Primeira leitura de tela | Segunda leitura, 15:00:24.345 Brasília |
|---|---:|---:|
| Modo | GPON | GPON |
| Registro | Registered (O5) | Registered (O5) |
| RX óptico | −22,51 dBm | −22,44 dBm |
| TX óptico | +2,47 dBm | +2,41 dBm |
| Temperatura exibida no bloco XPON | 69,02 °C | 68,56 °C |
| Bias | 14,00 mA | 14,00 mA |
| Downstream FEC, estado exibido | Off | Off |
| Tensão, valor/unidade exibidos | 3,19 / mV | 3,18 / mV |

O painel mostra unidade mV para valores 3,18/3,19; os dados foram preservados sem conversão presumida. Não concluir falha elétrica a partir dessa inconsistência de apresentação. “FEC Off” é um estado exibido, não contador de erros nem indicação para alterar FEC unilateralmente. Não comparar a temperatura do bloco XPON a limites de temperatura ambiente do produto.

As leituras ópticas ocorreram depois da captura e não foram sincronizadas aos eventos. O5 e potência nessas duas leituras não descartam falha intermediária nem comprovam que a ONT esteja sem erros. Não foram obtidos contadores FEC/BIP/LOS/LOF ou logs da OLT/ONT que expliquem os instantes. Os menus consultados expõem status, LAN/XPON/VLAN e ferramentas administrativas; não foi encontrado nessa consulta um contador de falhas correlacionável. Não expor SN/LOID/PLOAM, senha, MAC ou identificadores de autenticação em relatório/evidências.

## Próximo isolamento útil

O teste externo decisivo é repetir o mesmo conjunto de sondas com outro roteador já configurado ou um computador PPPoE, no mesmo acesso/ONT, preservando fibra, operadora e cenário e depois restaurando o W6x. Isso exige troca física e pode interromper o acesso enquanto conectado diretamente. Uma captura por espelhamento/TAP no fio entre W6x e ONT é alternativa para distinguir o ponto de observação Linux da transmissão real.

Se a ocorrência persistir fora do W6x, a investigação passa a priorizar ONT/acesso/operadora. Se desaparecer em janelas repetidas, priorizar W6x/driver/configuração, sem chamar uma única janela curta de prova. A informação histórica de sintomas semelhantes com outra ONT orienta, mas não substitui esse A/B controlado.

## Evidências e encerramento

`docs/audit/evidence/qos-2026-11-05/wan-localization-result.json` contém somente campos selecionados. Metadados de pacotes/probes, scripts e estatísticas dos capturadores em `Evidencias locais/WAN-localizacao-2026-11-05/`, fora do Git. Capturas encerradas e checadas; nenhuma mudança na ONT ou no QoS. Nenhuma credencial foi gravada nos arquivos. O diagnóstico está localizado até a fronteira de observação; causa e correção definitiva permanecem abertas.
