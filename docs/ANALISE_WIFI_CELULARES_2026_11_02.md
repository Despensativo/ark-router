# Análise dos ajustes Wi-Fi/rede e da assimetria de velocidade em celulares

Data: 02/11/2026, aproximadamente 12:19–12:25, America/Sao_Paulo.
Alvo: W6x em 192.168.73.1. Inspeção SSH autorizada, exclusivamente em leitura.
Código: ARK 2.1.8, HEAD `c787a32e`, checkout inicialmente limpo.

## Conclusão

Há inconsistências reais nos ajustes e na indicação de recursos do ARK. Elas justificam revisar o perfil de transmissão Wi-Fi, mas **não foi comprovada uma causa única para o iPhone baixar a 100–300 Mb/s e enviar a 400–510 Mb/s no Fast.com**, comportamento informado pelo usuário.

O iPhone foi identificado pelo hostname DHCP e pela associação, sem presumir seu modelo. Estava em 5 GHz, HE160, duas spatial streams, com TX do AP de até 2401,9 Mb/s. Portanto, não estava preso a 2,4 GHz, HE20/HE80 ou NSS 1 nas leituras iniciais. Taxa PHY não é velocidade útil.

As prioridades de investigação são: comparar o Fast com outro servidor/aplicativo; separar tráfego local de internet; depois testar individualmente AQL/airtime, agregação, beamforming e largura do canal. Não é adequado prometer que qualquer desses ajustes isolados resolverá o problema.

## Método, evidências e limites

- Leitura de UCI, hostapd gerado, schemas/gerador ucode instalados, `iw`, debugfs mac80211/mt76, qdisc/filtros `tc`, nftables, afinidade de IRQ/NAPI, interfaces, contadores, temperatura e logs.
- Conferência SHA-256: `ark-hardware-tune`, `90-ark-rps-tune`, `modules/wifi.sh`, `modules/sqm.sh` e `15-ark-dscp-priority.nft` instalados coincidem com o checkout. Isso identifica esses cinco arquivos; não atesta todos os arquivos do pacote.
- Duas séries passivas: seis pontos com intervalo nominal de 5 s, acompanhando upload forte; doze pontos com timestamps e intervalo de aproximadamente 5 s, posteriormente sem download forte reproduzido.
- Nenhuma alteração UCI/sysctl/debugfs/nft/tc, instalação, reload, restart ou reboot foi executado. Não executei `ark-doctor --auto`, pois ele altera o equipamento.
- Nenhum teste operacional em VM ou mock foi realizado: esta entrega é diagnóstico estático e inspeção do hardware em leitura. Correções futuras exigem laboratório virtual; efeitos de rádio precisam também de validação física autorizada.
- Não houve iperf LAN, captura de pacotes, teste A/B de configuração, identificação do modelo/iOS, nem confirmação do estado de VPN/Retransmissão Privada. O download de 100–300 Mb/s não foi reproduzido numa janela correlacionada de carga nesta coleta.
- Senhas, chaves Wi-Fi, endereços MAC, SSIDs particulares e endereços públicos foram omitidos deste relatório.

## Estado atual observado

| Camada | Estado |
|---|---|
| Sistema | Acer Predator Connect W6x, OpenWrt 25.12.6, kernel 6.12.112, ARK 2.1.8 |
| Memória | Aproximadamente 986 MiB totais; cerca de 674 MiB disponíveis na leitura |
| Temperatura | CPU aproximadamente 51,3 °C; sem prova de throttling |
| WAN física | eth1, 1000 Mb/s Full Duplex, MTU 1508; FCS/checksum/erros RX zerados |
| PPPoE | pppoe-wan, MTU efetiva 1492 |
| SQM download | CAKE em ifb4pppoe-wan, 760 Mb/s, diffserv4, dual-dsthost, nat, wash, ingress, no-split-gso, RTT 100 ms, memlimit 64 MiB |
| SQM upload | CAKE em pppoe-wan, 750 Mb/s, diffserv4, dual-srchost, nat, wash, no-ack-filter, split-gso, RTT 100 ms, memlimit 64 MiB |
| Offload | WED habilitado e anexado no boot; flow_offloading e flow_offloading_hw desativados |
| 2,4 GHz | Canal 11, HE20, potência indicada 23 dBm; muitos clientes IoT |
| 5 GHz | Canal primário 44, largura real 160 MHz, centro 5250 MHz, potência indicada 30 dBm |
| País | PA nos dois rádios, também no domínio regulatório do kernel |
| Segurança principal | SAE/PSK misto, CCMP, PMF opcional, WMM ativo, U-APSD anunciado, DTIM 2 |
| Roaming principal | 802.11k/v gerados; sem FT-SAE anunciado nas redes principais |
| APs 5 GHz | Principal, convidados e backhaul oculto; os dois últimos sem estações no primeiro inventário |
| QoS convidados | UCI pede 50 Mb/s down e 10 Mb/s up; não apareceu qdisc TBF/policer correspondente no inventário global. O iPhone estava no AP principal |

O teto de 760/750 é compartilhado pela internet da rede, não reservado para cada celular. Overhead 44 e MPU 64 reduzem a taxa útil frente à taxa nominal de shaping. Esses tetos não explicam sozinhos download isolado a 100–300 Mb/s.

### Clientes móveis

| Cliente identificado pelo DHCP | Associação observada | Sinal aproximado inicial | TX AP → cliente | RX cliente → AP |
|---|---|---:|---|---|
| iPhone | HE160, NSS 2 | −42 a −44 dBm | Até 2401,9 Mb/s | Até 2401,9 Mb/s; sob upload foram vistos 1729,6–1921,5 Mb/s |
| S23 | HE160, NSS 2 | −45 a −47 dBm | Até 2401,9 Mb/s | Até 2401,9 Mb/s; leituras ociosas também mostraram 6 Mb/s |
| iPad | HE160, NSS 2 | −48 a −50 dBm | Até 2401,9 Mb/s | 1729,6–2401,9 Mb/s |

Uma leitura RX baixa em repouso pode corresponder ao último quadro de gerenciamento/controle ou a economia de energia; não prova que o upload de dados ficou limitado àquela taxa. O iPhone apresentou posteriormente RX de 286,7 Mb/s em repouso, sem reproduzir download forte na mesma janela; não se pode concluir renegociação permanente para 20 MHz.

## Achados e relação com o sintoma

### 1. AQL desativado globalmente: limites escritos não significam proteção ativa

Em `root/etc/init.d/ark-hardware-tune`, `ark_tune_wifi_aql()` (linhas 111–160), o ARK escreve `0` em `aql_enable` antes de configurar thresholds. Ambos os PHYs retornaram `0`.

O kernel mac80211 deixa de aplicar a checagem AQL quando a chave global de desativação está ativa. Assim, os números BE 5000/12000 µs, threshold 24000 µs em 5 GHz, e BE 2000/4000 µs, threshold 15000 µs em 2,4 GHz continuam visíveis, mas não provam que o airtime pendente esteja sendo limitado por AQL. O controle possui chave global: o arquivo por PHY não implica isolamento por rádio. [Código Linux 6.12, checagem AQL](https://raw.githubusercontent.com/torvalds/linux/v6.12/net/mac80211/tx.c).

**Impacto plausível:** filas maiores no driver/firmware em download para clientes lentos, distantes ou adormecidos; aumento de latência e prejuízo à justiça entre clientes. Isso é especialmente relevante quando a capacidade Wi-Fi cai abaixo dos 760 Mb/s da WAN. Desativar AQL também pode melhorar agregação em uma combinação específica de driver/cliente; a escolha exige A/B, não uma regra universal.

**Grau de certeza:** desativação confirmada; responsabilidade pelos 100–300 Mb/s não comprovada.

### 2. “Airtime fairness” solicitado e contabilização desligada

O `wifi-wifi6-toggle` escreve `airtime_fairness=1`; o hardware tune escreve `airtime_flags=0`. Os arquivos `airtime_flags` vieram vazios nos dois PHYs, consistente com ausência das flags TX/RX. Além disso, o gerador instalado usa `airtime_mode`, enquanto `airtime_fairness` não apareceu nos schemas/geradores consultados. O hostapd gerado não anuncia `airtime_mode` positivo.

**Por que importa:** o painel não comprova que a justiça por tempo de antena esteja funcionando. Clientes de baixa taxa podem consumir uma fração desproporcional do meio quando há tráfego concorrente. Isso é mais relevante em 2,4 GHz e sob concorrência; não demonstra um teto individual de 300 Mb/s no iPhone.

Os detalhes de leitura/escrita de flags e os limites do diagnóstico por debugfs estão no [mac80211 debugfs do Linux 6.12](https://raw.githubusercontent.com/torvalds/linux/v6.12/net/mac80211/debugfs.c).

### 3. O painel declara recursos operacionais a partir de chaves UCI

Em `src/modules/wifi.js:69–80` e `:1864–1875`, basta uma indicação de BSS color/TWT para declarar que “BSS Coloring, TWT, OFDMA, Beamforming e Puncturing” estão operando. Em `wifi.sh:2140–2172`, o status também é derivado de chaves e capacidades gerais.

Conferência com o OpenWrt instalado:

| Ajuste ARK | Leitura efetiva |
|---|---|
| `he_bss_color=1` e `bss_color=auto` | hostapd gerou `he_bss_color=1` nos dois rádios. A chave numérica é a que apareceu no schema; `bss_color=auto` não demonstra seleção automática |
| `he_spatial_reuse=1` | Chave não localizada no schema/gerador consultado. O gerador usa `he_spr_*`; `he_spr_sr_control=3` não confirma a política pretendida pelo ARK |
| `he_ul_ofdma=0` / `he_ul_mumimo=0` | Não localizadas no schema/gerador consultado. Não é válido afirmar que o hardware desativou os mecanismos UL por essas opções |
| `twt_responder=0` | Não localizada nesse caminho de configuração. O PHY continua anunciando capacidade TWT Responder; `he_twt_required=0` só indica que TWT não é obrigatório. Nenhum acordo TWT apareceu na leitura de `twt_stats` |
| `he_puncturing=1` | Sem correspondência encontrada no gerador/schema consultado e sem parâmetro correspondente no hostapd gerado; não prova puncturing operacional |
| `he_su_beamformer=1` / `he_su_beamformee=1` | Presentes no hostapd efetivo |
| `he_mu_beamformer=0` em 5 GHz | Presente no hostapd efetivo; MU beamforming está explicitamente desativado nesse rádio |

**Impacto:** há inconsistência de observabilidade e de contrato funcional. Parte dos “ajustes” pode não produzir o efeito anunciado. MU beamforming desativado pode reduzir eficiência multiusuário de downlink, mas não deveria ser tratado como requisito para um único celular atingir centenas de Mb/s. Ele não equivale a desligar todo OFDMA.

Em 2,4 GHz, o valor atual `he_mu_beamformer=1` difere do `0` aplicado pelo preset local. Isso é divergência de estado/preset; não identifica quem mudou a opção.

### 4. Perfil de agregação e filas agressivo, sem comprovação por modelo

5 GHz: FQ limit 4096, memória 16 MiB, quantum 12288; implicit_txbf=1. 2,4 GHz: FQ limit 1024, memória 4 MiB; código solicita quantum 4542. O debugfs de 2,4 GHz termina em `454` sem newline: o upstream usa buffer de saída de 200 bytes; não interpretei isso como prova de quantum configurado incorretamente. Também há versões cujo formato troca os rótulos overlimit/overmemory; por isso não atribuí os contadores a uma causa específica sem validar o backport.

No primeiro snapshot, 5 GHz mostrava contadores FQ 37/73; na janela posterior permaneceram iguais, backlog amostrado zero. Em 2,4 GHz os acumulados eram 121/45648, sem delta sob um teste controlado. Colisões de hash FQ não são colisões de rádio.

O mt76 mostrou agregação A-MSDU de 1 a 8 MSDUs: aproximadamente 50% com 1 e 30% com 3 no acumulado. Portanto, o comentário de código sobre empacotamento de 3 MSDUs não comprova que cada fluxo do iPhone está usando essa agregação. Os contadores incluem todos os clientes e períodos anteriores.

**Impacto plausível:** quantum grande e AQL desligado favorecem rajadas/agregação, com possível custo de latência e justiça. Compatibilidade de beamforming implícito/driver/cliente é hipótese de teste, não defeito comprovado.

### 5. RPS/IRQ concentram etapas em núcleos específicos

Estado efetivo: IRQ Wi-Fi e seis threads NAPI Wi-Fi em CPU2; `mt76-tx` também CPU2. Ethernet NAPI em CPU1/CPU3. RPS das interfaces Wi-Fi é máscara `1` (CPU0), PPPoE é `b` (CPUs 0/1/3); RFS desativado.

**Impacto plausível:** uma etapa serial em CPU0 ou CPU2 pode limitar tráfego antes que a média geral de CPU pareça alta. CAKE de PPPoE/IFB continua single-queue; quatro CPUs não tornam automaticamente cada fluxo ou qdisc multicore. A finalidade e as limitações de RPS/RFS estão na [documentação do kernel](https://www.kernel.org/doc/html/latest/networking/scaling.html).

Durante upload forte, os deltas de CPU ficaram aproximadamente entre 23% e 65% de ocupação por núcleo, sem núcleo a 100% nos intervalos amostrados. Houve crescimento de RX Wi-Fi de centenas de MB por intervalo nominal de 5 s, consistente com upload de centenas de Mb/s. Os intervalos da primeira série não têm timestamp por ponto; não os trato como medição exata de throughput.

**Grau de certeza:** afinidades confirmadas; saturação no download não demonstrada, porque o sintoma não foi reproduzido sob essa coleta.

### 6. GRO/NAPI e GSO são escolhas com compromisso, não garantia de desempenho

eth1 e PPPoE estão com `gro_flush_timeout=250000` ns (250 µs) e `napi_defer_hard_irqs=20`. Isso pode reduzir custo de processamento/agregar tráfego, mas também atrasar a entrega e mudar a formação de rajadas. O kernel documenta esse compromisso em [NAPI](https://www.kernel.org/doc/html/latest/networking/napi.html).

O download já está com `no-split-gso`; portanto, não procede atribuir o estado atual a ausência dessa opção. O upload usa `split-gso`, o que por si só não configura erro. Não há prova de que igualar os dois sentidos resolva a assimetria.

### 7. “Potência máxima” altera o país, não apenas a potência

Em `wifi.sh:1232–1252`, `wifi-maxpower-toggle` troca o país de todos os rádios para `PA`. O estado atual é PA/23 dBm/30 dBm. Isso foi produzido por uma ação disponível no ARK, embora o histórico exato da ativação não tenha sido reconstruído.

**Problema funcional:** um seletor de potência também muda domínio regulatório, canais e restrições de operação. Se a instalação é no Brasil, o domínio deve corresponder ao local de uso; não se deve tratar PA como um perfil genérico de aceleração. Este diagnóstico não calcula limites legais de EIRP.

**Relação com upload:** maior potência do AP não aumenta a potência transmitida pelo celular. Pode favorecer escolha de banda inadequada em distâncias maiores. Com o iPhone inicialmente perto e sinal forte, isso não comprova a causa do sintoma.

### 8. Canal 44 em 160 MHz inclui DFS

O rádio efetivamente opera HE160 com centro 5250 MHz: o bloco inclui canais 36–64. Os logs registram CAC de 60 s concluído e avisos “Can't set DFS state” para subcanais, seguidos de AP habilitado. Não houve evento radar demonstrado na janela final.

**Impacto possível:** interrupções por CAC/radar e maior exposição a ocupação de espectro. Não existe evidência de que DFS imponha continuamente 100–300 Mb/s. Os smartphones já negociaram HE160; testar HE80 é comparação de estabilidade/ocupação, não correção presumida.

### 9. 2,4 GHz é mais ocupado, mas os celulares analisados estavam em 5 GHz

Entre duas leituras separadas por aproximadamente 198 s, o survey do canal primário indicou cerca de 33% de tempo ocupado em 2,4 GHz e 14,5% em 5 GHz. São deltas passivos daquele período, com tráfego variando; não são um mapa de interferência dos 160 MHz nem baseline controlado.

Há IoT a aproximadamente −84 dBm e contadores expressivos de falhas em alguns clientes. `disassoc_low_ack=0`, inatividade de 24 h e steering pouco agressivo favorecem permanência/conectividade, mas podem manter clientes lentos no meio. Isso pode afetar celulares que migrarem para 2,4 GHz. Não explica diretamente os iPhones já associados ao 5 GHz nesta coleta.

O usteer efetivo tem `min_snr=0`, scan −74, trigger −78, intervalo de steering 120 s e `load_kick_enabled=false`. `max_retries=3` escrito pelo ARK não apareceu na API efetiva; `max_retry_band` continuou 5 e `roam_scan_tries` 3. São nomes com semânticas distintas; a configuração precisa ser alinhada ao serviço instalado. [API e código upstream usteer](https://github.com/openwrt/usteer).

### 10. Priorização do teste pode produzir ping excelente sem provar saúde do download

Filtros ingress priorizam ICMP/ICMPv6, SYN, PSH pequeno e UDP pequeno diretamente para Voice no CAKE antes do IFB. O nftables também prioriza controle e micro-payloads. Isso pode ser útil, mas um resultado “+0 ms” em sondas priorizadas não representa necessariamente o tempo de fila dos pacotes volumosos de download.

O `wash` não elimina a diferenciação interna do próprio CAKE: ele pode classificar e limpar DSCP no pacote. A classificação nft prerouting ocorre após o ponto ingress/IFB; logo a marcação feita ali não classifica retroativamente aquela passagem no CAKE de download. Os filtros tc são uma solução parcial, com offsets fixos para cabeçalhos TCP, que não cobrem toda variação de cabeçalhos IP. [Implementação CAKE Linux 6.12](https://raw.githubusercontent.com/torvalds/linux/v6.12/net/sched/sch_cake.c).

**Impacto:** fragilidade de classificação e de validação de latência; não foi encontrada regra de policer/teto específico de 100–300 Mb/s para o iPhone principal. Não confundir os thresholds dos tins com limites rígidos permanentes: o CAKE permite empréstimo de capacidade.

### 11. Blindagem de sono/roaming não equivale a acelerar transferência

WPA3 misto/CCMP e PMF opcional estão coerentes para os clientes observados. Não há FT-SAE anunciado nas redes principais. DTIM 2, U-APSD e BSS transition estão presentes. Não há evidência para mudar segurança, DTIM ou desativar economia de energia indiscriminadamente.

`wpa_group_rekey=0`, `disassoc_low_ack=0` e `max_inactivity=86400` são políticas amplas, não uma detecção da causa de queda de cada cliente. Os logs ainda mostram deauth por inatividade e recriação de APs, inclusive antes desta análise. Isso não prova falha espontânea: parte é compatível com reloads administrativos. A origem desses reloads não foi reconstruída.

O Doctor pode reimpor essas políticas e provocar reload quando detecta divergência; o hotplug `99-ark-doctor` o chama automaticamente. A/B feito apenas pelo LuCI pode ser revertido pela autocura. Também o toggle de Wi-Fi 6 remove só parte das opções ao desligar, sem restaurar integralmente os valores anteriores. Um futuro teste precisa controlar os escritores das configurações e guardar rollback.

### 12. BBR/TFO e WED não comprovam aceleração de TCP do iPhone

BBR, TCP Fast Open, buffers de socket e `tcp_notsent_lowat` configurados no roteador afetam principalmente TCP terminado/originado nele. Eles não substituem o congestion control ou buffers da conexão TCP do iPhone com o servidor. Logo não justificam prometer aceleração universal de downloads encaminhados. [Documentação TCP do kernel](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html).

WED foi inicializado, mas o fluxo do iPhone passar integralmente por PPE não foi comprovado; flow offload está desligado e contadores CAKE aumentam. Não recomendo ligar offload indiscriminadamente para elevar o teste, pois isso pode mudar o caminho controlado pelo SQM.

## Fast.com, iPhone e ordem de isolamento

A Apple informa que a Retransmissão Privada pode reduzir a velocidade indicada em alguns testes. Isso é uma hipótese importante se o Fast é executado no Safari e a função está ativa; **seu estado não foi consultado no iPhone**. Não se deve afirmar que ela é a causa. [Apple: iCloud Private Relay](https://support.apple.com/en-gb/102602).

Também faltou comparar servidor Netflix/OCA, IPv4/IPv6, número de conexões e outro aparelho no mesmo instante. Um teste anterior registrado como 700 Mb/s em outro dispositivo ou momento não comprova que este iPhone tenha o mesmo comportamento.

Ordem proposta, sem mudanças aplicadas:

1. Mesmo iPhone, mesma posição e horário: Fast versus Speedtest/app já disponível, anotando servidor e resultado. Conferir VPN, Retransmissão Privada e modo de pouca energia. Qualquer desativação temporária deve preservar/restaurar o estado escolhido pelo usuário.
2. Teste LAN bidirecional contra computador cabeado, para retirar operadora, CDN e PPPoE do caminho. Se LAN também for 100–300 down e mais de 400 up, aumenta muito a evidência contra o caminho AP→iPhone. Se LAN for rápida, priorizar servidor/rota/relay/IPv6/WAN.
3. Reproduzir download e upload com timestamps, bytes por estação, CPU por núcleo, filas CAKE e mt76, perdas/retries e RTT não favorecido pela mesma regra de prioridade. As amostras desta análise não substituem esse teste.
4. Preparar no laboratório as mudanças e os controles de rollback/autocura. No rádio físico, mediante solicitação e confirmação manual explícita `SIM`, testar uma variável por vez: AQL/airtime coerentes; perfil conservador de agregação; implicit beamforming; MU beamforming; HE80 versus HE160. Não alterar todos juntos.
5. Corrigir separadamente os nomes de opções conforme a versão do OpenWrt e o status do painel: distinguir “solicitado em UCI”, “gerado pelo hostapd”, “suportado pelo driver” e “medido”. O país deve corresponder ao local de uso.

## Verificação da entrega

Somente este relatório e o acompanhamento em `TASK.md` foram alterados localmente. Não houve modificação de código funcional, UI ou configuração de roteador; por isso não houve build, testes de regressão de código ou screenshot de interface. Nenhuma hipótese foi homologada como correção.
