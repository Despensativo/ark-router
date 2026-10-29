# Estudo: Wi-Fi com baixa latência, jitter e bufferbloat

Data: 29/10/2026. Escopo: estudo técnico e proposta de experimentação, sem mudanças em equipamentos, código funcional ou padrões do produto.

Revisão 2, na mesma data: pesquisa externa ampliada. A seção 11 acrescenta resultados publicados, limites metodológicos e mudanças concretas no protocolo. As metas anteriores continuam sendo objetivos de engenharia, não valores demonstrados para o ARK.

Recorte específico após confirmação do usuário: [Acer Predator Connect W6x, OpenWrt 25.12.5 e link nominal 800/800 Mb/s](ESTUDO_W6X_OPENWRT_25_12_5_LATENCIA.md). Para esse equipamento, consultar primeiro o recorte: 6 GHz, MLO e recomendações ath11k/QSDK deste estudo geral não são perfis aplicáveis ao W6x.

Referência local: HEAD `c4b8831b`, com alteração preexistente não commitada em `root/etc/init.d/ark-hardware-tune`, preservada. Os valores descritos abaixo foram lidos da árvore de trabalho; não comprovam a configuração de nenhum roteador em execução. Fontes upstream consultadas nesta data podem diferir dos kernels e backports efetivamente instalados.

## 1. Conclusão técnica

O melhor resultado combina **controle de fila na WAN**, **controle de fila no rádio**, **capacidade de rádio com margem** e **clientes estáveis**. Nenhum parâmetro isolado garante ping constante em um meio compartilhado e sujeito a interferência.

O objetivo é reduzir principalmente a cauda da distribuição: p95/p99 de RTT sob carga, perda e interrupções. Uma média bonita ou uma nota A+ em um teste curto não bastam. Velocidade PHY, vazão TCP e capacidade simultânea de upload/download são grandezas diferentes.

Prioridade proposta:

1. Localizar o gargalo com testes separados de Ethernet, Wi-Fi local e internet.
2. Melhorar cobertura, canal, largura e backhaul.
3. Calibrar SQM no gateway onde o tráfego realmente passa.
4. Verificar AQM/AQL e suporte do driver; ajustar apenas com comparações controladas.
5. Avaliar prioridades, economia de energia e recursos avançados por cliente e cenário.

O trabalho de Høiland-Jørgensen e colaboradores demonstra por que filas por fluxo e justiça de airtime precisam ser tratadas conjuntamente no Wi-Fi; o ganho do experimento não é uma promessa para qualquer chipset. [Pesquisa original](https://arxiv.org/abs/1703.00064).

## 2. Separar as causas antes de escolher parâmetros

| Observação reproduzível | Hipótese a investigar | Verificação seguinte |
|---|---|---|
| RTT externo cresce por Ethernet quando a WAN satura | Fila da operadora/ONT, shaper ineficaz ou CPU | SQM por direção, contadores do qdisc, CPU por núcleo |
| RTT até servidor Ethernet local cresce ao saturar apenas Wi-Fi | Fila de rádio/cliente, retransmissões ou disputa de airtime | AQL/AQM, sinal, retries e canal |
| Wi-Fi tem picos sem tráfego próprio | Interferência, scans, power save ou atividade do cliente | Repetir com outro cliente, outro canal e posição fixa |
| Clientes Ethernet e Wi-Fi pioram juntos, inclusive acesso local | CPU, interrupções, driver ou link Ethernet | CPU/softirq por núcleo, erros de interface e logs |
| Só um dispositivo apresenta picos | Driver, economia de energia ou tráfego desse dispositivo | Mesmo teste em segundo cliente e configuração controlada |
| Cabo está estável, mas Wi-Fi piora apenas com internet rápida | WAN entrega mais do que o rádio consegue escoar | Reproduzir carga equivalente com servidor local |

Ping ao roteador é uma referência auxiliar: a resposta passa pelo plano de controle e pode sofrer tratamento diferente do tráfego encaminhado. Usar também um servidor Ethernet na LAN e um destino externo estável. Traceroute isoladamente não prova onde há congestionamento, pois respostas ICMP intermediárias podem ser limitadas.

Exemplo conceitual: WAN moldada em 900 Mb/s e um cliente com capacidade útil variável de 250–450 Mb/s. A fila pode continuar no salto Wi-Fi; o CAKE da WAN não acompanha automaticamente a capacidade daquele cliente. Adicionar outro SQM numa bridge sem mapear o percurso também pode limitar o tráfego errado.

## 3. Base recomendada para experimentação de rádio

Os valores desta seção são pontos de partida de engenharia, não resultados medidos neste ambiente.

| Parâmetro | Base proposta | Como decidir |
|---|---|---|
| Banda | 5 GHz para clientes próximos; 6 GHz se ambos suportarem e houver cobertura | Comparar p99, retries e vazão na posição real |
| 2,4 GHz | 20 MHz | Priorizar alcance/IoT e reduzir ocupação; selecionar canal permitido após medir |
| 5 GHz | Começar com 80 MHz; comparar 40 e 160 MHz | 40 pode vencer em ambiente ocupado; 160 pode reduzir airtime em ambiente limpo |
| 6 GHz | Comparar 80/160 MHz; 320 apenas como candidato em Wi-Fi 7 | Maior largura exige condições e compatibilidade; não garante menor jitter |
| Canal | Selecionar pela ocupação e estabilidade observadas | Poucos SSIDs não significam pouco tráfego; usar variação dos contadores de survey |
| Potência | Suficiente para enlace bidirecional estável | Máximo no AP não aumenta a potência do cliente nem corrige retorno fraco |
| Sinal | Procurar boa margem; aproximadamente -50 a -65 dBm como referência inicial | Confirmar SNR, retries e capacidade; o valor ideal varia por dispositivo |
| WMM | Manter habilitado | Separar WMM de ajustes experimentais de prioridade |
| A-MPDU/A-MSDU | Preservar os padrões do driver inicialmente | Desabilitar agregação pode consumir mais airtime e piorar sob carga |
| Beamforming | Preservar recursos explicitamente suportados | Testar compatibilidade; evitar opções proprietárias genéricas |
| Beacon | Manter 100 TU como referência | Reduzir aumenta tráfego de gerenciamento; não é regulagem geral de ping |
| DTIM | Preservar padrão; comparar 1/2/3 apenas com objetivo específico | Relevante a entrega de tráfego em power save, especialmente multicast |
| RTS/CTS | Padrão; testar limiar menor só com evidência de nós ocultos | Proteção custa airtime; benefício depende de colisões |
| Basic rates/cell density | Preservar até verificar cobertura e clientes | Taxas mínimas maiores podem economizar airtime e perder alcance/compatibilidade |
| Backhaul | Ethernet quando viável | Repetidor no mesmo rádio disputa airtime com o cliente |

Não escolher um canal universalmente “melhor”. Evitar DFS pode evitar interrupções associadas a radar, mas um canal DFS limpo pode superar um não DFS congestionado. País, canais e potência devem respeitar o domínio regulatório real; não alterar país ou desativar mecanismos regulatórios para obter desempenho.

O hostapd documenta beacon, DTIM, WMM e parâmetros HE; a tradução entre UCI e hostapd deve ser verificada na versão instalada. [Configuração de referência do hostapd](https://android.googlesource.com/platform/external/wpa_supplicant_8/+/master/hostapd/hostapd.conf).

## 4. AQL e AQM: ajuste com maior relação direta com filas do rádio

No mac80211, AQM trata a fila de software; AQL limita airtime pendente entregue ao driver/hardware. Assim, uma fila escondida no driver não fica fora do alcance do controle de congestionamento. O suporte e a contabilização do driver são essenciais.

Os limites AQL são estimativas de microssegundos de airtime pendente, **não um teto do RTT**. `aql_threshold` interfere no uso dos limites low/high conforme a carga agregada. Vários clientes, retransmissões e outras filas impedem converter esse número diretamente em ping. A implementação upstream verifica suporte AQL antes de usar esse mecanismo. [Lógica de transmissão do mac80211](https://raw.githubusercontent.com/torvalds/linux/master/net/mac80211/tx.c).

Comparação dos valores locais para a categoria Best Effort (BE):

| Perfil local | `aql_threshold` | BE low/high | Situação |
|---|---:|---:|---|
| 5/6 GHz em HEAD | 4000 µs | 2500/4500 µs | Referência versionada; sem validação nova |
| 5/6 GHz na árvore de trabalho | 2000 µs | 1500/2500 µs | Alteração preexistente mais restritiva |
| 2,4 GHz em HEAD | 5000 µs | 2500/5000 µs | Referência versionada |
| 2,4 GHz na árvore de trabalho | 4000 µs | 2000/4000 µs | Alteração preexistente |

A árvore de trabalho também tenta aplicar `fq_limit 1024` e `fq_memory_limit 4194304` (4 MiB) por PHY. São limites da fila mac80211, distintos de `memlimit` do CAKE. Limitar pacotes/memória não define sozinho uma duração de fila.

No upstream, a enumeração das categorias é `0=VO`, `1=VI`, `2=BE`, `3=BK`. Confirmar a correspondência no kernel alvo antes de escrever valores. [Interface mac80211](https://raw.githubusercontent.com/torvalds/linux/master/include/net/mac80211.h). O debugfs expõe limites e contadores, mas seu formato pode variar com a versão. [Implementação do debugfs](https://raw.githubusercontent.com/torvalds/linux/master/net/mac80211/debugfs.c).

Protocolo proposto:

1. Medir o padrão efetivo do driver antes de aplicar qualquer perfil ARK.
2. Comparar esse padrão ao perfil versionado e ao perfil restritivo local.
3. Alterar uma família de parâmetros por vez: primeiro limites AQL, depois threshold, depois limites FQ.
4. Testar um cliente próximo, um distante, vários clientes e tráfego nos dois sentidos.
5. Observar p99, vazão, retries, perda e estabilidade por pelo menos 30 minutos no perfil finalista.
6. Restaurar os valores capturados se houver regressão; defaults arbitrários não são rollback.

Reduzir o orçamento pode limitar agregação ou deixar o hardware sem trabalho suficiente; aumentar demais pode ampliar a fila oculta. A afirmação no comentário local de que o perfil elimina bufferbloat e garante A+ abaixo de 5 ms não está comprovada por esta leitura estática.

O controle de transmissão do AP atua diretamente no sentido AP → cliente. A fila de upload do cliente depende também do seu sistema e driver; o AP não tem controle equivalente sobre todas as filas internas do dispositivo.

## 5. SQM/CAKE na WAN

Começar com CAKE e uma configuração simples, calibrando upload e download separadamente. Uma taxa inicial de 90–95% da capacidade sustentada medida por cabo é uma heurística; a taxa contratada não substitui a medição. Links variáveis podem exigir margem maior ou controle adaptativo validado.

Exemplo apenas aritmético: se a capacidade sustentada medida for 500/250 Mb/s, 450/225 a 475/237,5 Mb/s é uma faixa inicial de ensaio. A taxa vencedora depende da latência sob carga e da variação da conexão.

Pontos técnicos:

- Isolar hosts e fluxos evita que muitos fluxos de um cliente prejudiquem os demais. Confirmar direção e visibilidade dos endereços quando houver NAT.
- Começar em Best Effort facilita avaliar justiça e filas; DiffServ exige política de classificação confiável.
- `wash` limpa DSCP após a classificação do CAKE; não garante prioridade WMM depois dele. Verificar marcação e mapeamento em cada etapa.
- Calcular overhead conforme encapsulamento, interface observada e medição da operadora. PPPoE, VLAN e Ethernet não justificam um único valor universal.
- `rtt` é parâmetro do controle de filas; não define nem reduz diretamente o RTT físico da conexão.
- Aumentar `memlimit` não é uma técnica direta de redução de latência; avaliar pressão de memória, contadores e necessidade real.
- `ack-filter` pode ser candidato em enlaces muito assimétricos; manter como experimento separado.
- Preservar `split-gso` como referência, salvo necessidade demonstrada do driver/plataforma.

Essas semânticas constam no [manual do CAKE](https://man7.org/linux/man-pages/man8/tc-cake.8.html). A presença de `cake_mq` no manual upstream não confirma disponibilidade no kernel OpenWrt instalado. Tampouco equivale a executar instâncias independentes de CAKE com a mesma taxa em cada fila.

Verificar o caminho de offload: o qdisc precisa receber os fluxos que pretende moldar. Hardware NAT/PPE, WED, NSS/ECM e offload de fluxo têm funções e integrações diferentes. Para estabelecer uma referência, planejar teste controlado sem caminhos que contornem SQM e comparar contadores, CPU e vazão. Não concluir compatibilidade apenas porque a tela mostra ambos habilitados.

CPU deve ser observada por núcleo/softirq: a média total baixa pode esconder um núcleo saturado. Não aplicar RPS, IRQ affinity, packet steering ou governor agressivo por rotina; comparar o efeito no SoC e no caminho realmente utilizados.

## 6. Recursos avançados e prioridades

**OFDMA/MU-MIMO:** avaliar suporte no AP e nos clientes, número de dispositivos e carga. Não há base para desabilitar globalmente como regra de baixa latência, nem para prometer benefício só porque estão habilitados.

**BSS Coloring/spatial reuse:** podem melhorar uso do espectro em condições específicas; ajustes agressivos de reutilização podem aumentar interferência. Não tratá-los como substitutos de canal e cobertura adequados.

**TWT, U-APSD e power save:** comparar com cliente alimentado e perfil de energia conhecido. Podem alterar comportamento de entrega e autonomia; separar teste de latência contínua de uso com tela apagada. DTIM baixo não corrige todas as pausas de um smartphone.

**Roaming e steering:** úteis ao caminhar entre APs. Para calibrar filas, manter cliente e BSSID fixos. Kicks e mudanças de banda podem causar interrupções que aparecem como jitter. Fast Transition exige interoperabilidade de segurança e clientes comprovada.

**Wi-Fi 7/MLO:** comparar cada enlace individual e MLO; não pressupor simultaneidade completa nem menor p99. Firmware, modo MLO, cliente e espectro determinam o resultado. Qualcomm/QSDK requer análise própria; receitas mac80211 não se transferem automaticamente.

**DSCP/WMM:** classificar apenas tráfego identificável e confiável. Promover tudo a Voice tira utilidade das categorias; UDP e porta 443 não identificam jogos com segurança. Tráfego QUIC também pode ser volumoso. Prioridades precisam preservar serviço às outras classes.

**Segurança:** preservar WPA2-AES/CCMP ou WPA3 conforme suporte. Desabilitar PMF, rekey ou proteções de segurança não integra o perfil proposto de desempenho.

## 7. Achados específicos no ARK que merecem validação futura

Estes achados são leitura estática e perguntas de engenharia; não são falhas operacionais reproduzidas.

| Local | Observação | Próxima verificação |
|---|---|---|
| `root/etc/init.d/ark-hardware-tune`, `ark_tune_wifi_aql()` | Há perfil restritivo não commitado e comentários com promessa de A+ | Comparar com defaults e HEAD, sem atribuir o resultado ao valor isolado |
| Mesma função | Supõe associação entre `phyN` e `wireless.radioN`; fallback usa capacidades de banda | Resolver PHY/interface/UCI real; capacidade multibanda não prova banda em uso |
| Mesma função | Escritas usam tolerância a erro | Ler de volta e verificar contadores; arquivo gravável não comprova mecanismo ativo |
| `root/usr/lib/ark/modules/wifi.sh`, bloco Wi-Fi 6/7 | Grava `airtime_fairness`, desabilita `he_ul_ofdma` e `he_ul_mumimo`, ativa outros recursos | Conferir quais chaves o netifd/hostapd/driver daquela versão consomem |
| Mesmo bloco | Grava `he_bss_color=1` em todos os rádios | Não confundir recurso habilitado com seleção adequada de cor em múltiplos APs |
| Mesmo bloco | Grava `wpa_group_rekey=0` | Revisão de segurança separada; não justificar como otimização geral de jitter |
| `root/usr/lib/ark/modules/sqm.sh` | Usa opções por direção, overhead 44/18 em certos caminhos e `rtt 50ms` no ingresso | Verificar qdisc efetivo, encapsulamento e comparação controlada |
| `root/usr/lib/ark/common.sh`, `ark_cake_memlimit()` | Dimensiona teto CAKE de 4M até 256M conforme RAM | Medir consumo somado por instância/direção/WAN e necessidade sob carga |

No script upstream consultado, há tratamento explícito de `airtime_mode`. Isso não prova que `airtime_fairness=1` seja equivalente no alvo. É necessário conferir a cadeia UCI → configuração gerada → capacidade do driver → efeito medido. [Integração OpenWrt/hostapd](https://raw.githubusercontent.com/openwrt/openwrt/master/package/network/config/wifi-scripts/files/lib/netifd/hostapd.sh).

Não foram propostas correções automáticas desses pontos neste estudo. A alteração funcional exigiria investigação das dependências, preservação de estado e testes do projeto.

## 8. Plano de medição reproduzível

Topologia de referência: cliente Wi-Fi → AP → Ethernet → servidor LAN. Para internet: mesmo cliente → AP/gateway → WAN → servidor externo. O gerador de carga local deve ficar no servidor Ethernet, evitando confundir CPU do roteador com capacidade do rádio.

Registrar modelo, firmware/kernel, driver, banda/canal/largura, cliente/OS/driver, distância, sinal/SNR, taxas negociadas, versão ARK, configuração efetiva de SQM/AQL, offload e horário. Registrar apenas dados necessários, sem credenciais ou configuração completa contendo chaves.

| Etapa | Cenário | Finalidade |
|---|---|---|
| A | Ethernet, ocioso e saturando WAN nos dois sentidos | Estabelecer limite da WAN e CPU sem Wi-Fi |
| B | Wi-Fi ocioso, ping LAN e externo | Medir a contribuição básica do salto sem fio |
| C | Wi-Fi ↔ servidor LAN, download/upload/simultâneo | Isolar rádio e cliente sem operadora |
| D | Wi-Fi com WAN saturada nas três combinações | Validar conjunto WAN + rádio |
| E | Cliente próximo e distante ativos simultaneamente | Avaliar fairness e cauda de latência |
| F | Dois ou mais clientes modernos e legado/IoT | Conferir compatibilidade e distribuição de airtime |
| G | Roaming e uso com economia de energia | Avaliar interrupções fora do cenário estacionário |

Para cada candidato, realizar ao menos cinco rodadas de 60–120 segundos após aquecimento; alternar referência/candidato/referência para reduzir confusão com interferência ou variação da WAN. Repetir em horário ocupado. Cinco rodadas são um mínimo exploratório, não prova estatística universal.

Ferramentas propostas: iperf3 para tráfego local, Flent/RRUL com servidor compatível para carga concorrente e IRTT quando disponível para sondagem UDP. Teste de navegador é complementar. O [Flent](https://flent.org/intro.html) permite testes concorrentes e guarda resultados para comparação; suas dependências precisam ser confirmadas no sistema executor.

Coleta técnica somente leitura, em futura sessão autorizada de medição:

- `iw dev` e `iw phy` para mapear interfaces/capacidades; identificar a associação efetiva do cliente.
- `iw dev INTERFACE station dump` e `iw dev INTERFACE survey dump`, se suportados. Usar deltas de contadores, não comparar totais acumulados de sessões distintas.
- `tc -s qdisc show dev INTERFACE_WAN` e equivalente na IFB realmente utilizada.
- Leitura de `aql_txq_limit`, `aql_threshold`, `aql_pending` e `aqm` no PHY correto, caso existam.
- CPU por núcleo, softirq, erros de interface e logs relevantes, com dados sensíveis removidos.

Evitar scans ativos durante rodadas de latência: o próprio diagnóstico pode interromper o rádio. Descartar rodadas com mudança de BSSID/canal ou documentá-las como cenário de transição.

Métricas: RTT p50/p95/p99 e máximo, perda, vazão útil por sentido, retries/failed quando disponíveis e CPU por núcleo. Definir explicitamente jitter: neste protocolo, usar p95 de `abs(RTT[n] - RTT[n-1])`, além da série temporal. Não misturar essa métrica com jitter unidirecional/RTP; latência de ida exige sincronismo adequado para medição absoluta.

Metas propostas para um cliente próximo com sinal forte e ambiente controlado:

- Sem perda persistente e sem desconexões.
- Buscar acréscimo de RTT p95 sob carga de até 5–10 ms em relação ao ocioso; analisar p99 separadamente e investigar picos acima de 20–30 ms.
- Definir `acréscimo p95 = p95 sob carga - p95 ocioso`, por destino e cenário. Esses números são critérios de engenharia propostos, não garantia de resultado nem fronteira universal de qualidade.
- Escolher antes do ensaio uma perda de vazão aceitável; por exemplo, investigar regressões superiores a 10% frente à referência comparável.
- Aceitar um perfil somente se o benefício persistir nos cenários relevantes, inclusive com cliente lento; não apenas no melhor teste.

## 9. Sequência recomendada para o projeto

1. Inventariar capacidades e percursos, sem editar padrões.
2. Reproduzir na VM gateway/SQM, concorrência, interfaces virtuais, sobrecarga e conflitos de configuração.
3. Mockar capacidades Wi-Fi e confirmar que parâmetros sem suporte não sejam anunciados como efetivos.
4. Preparar três candidatos: padrão do driver, perfil versionado ARK e perfil restritivo local; salvar estado anterior e restauração exata.
5. Executar testes de rádio real apenas em etapa separada autorizada, conforme as regras do workspace.
6. Documentar o vencedor por família de hardware e cenário; evitar preset universal para mt76, ath e QSDK.

## 10. Estado de validação deste estudo

| Categoria | Realizado nesta sessão |
|---|---|
| Pesquisa em fontes primárias | Sim: Linux, hostapd/OpenWrt, CAKE, Flent e pesquisa original |
| Inspeção estática do ARK | Sim, nos símbolos citados e no diff local |
| Medição de configuração em roteador | Não |
| Testes na VM | Não; estudo documental, sem implementação |
| Mocks Wi-Fi | Não executados; plano proposto |
| Teste de RF/AQL/offload em hardware | Não; necessário para homologação de perfis |
| Alteração de código, UI, pacote ou firmware | Nenhuma |
| Screenshot e testes de frontend | Não se aplicam; UI não foi modificada |

Este documento entrega hipóteses priorizadas e um método para encontrar o melhor perfil. Não homologa a alteração local existente nem afirma que qualquer roteador tenha alcançado os objetivos.

## 11. Pesquisa externa ampliada e revisão das recomendações

### 11.1. Como avaliar a evidência

Separar quatro coisas: norma descreve comportamento esperado; código descreve uma implementação; teste publicado mede uma combinação concreta; só medição local caracteriza nosso equipamento. Uma proposta de patch não comprova disponibilidade em uma release. Uma simulação alimentada por medições reais não é um teste de firmware comercial.

As fontes abaixo foram consultadas em 29/10/2026. Duas páginas OpenWrt bloquearam a leitura integral por proteção anti-bot; nesse caso o achado veio do trecho indexado pelo buscador e está explicitamente marcado. Não foi usado fórum como prova de comportamento de driver.

### 11.2. AQL pode existir na interface e não atuar: evidência ath11k de 2026

Na mensagem original de uma série de patches de 24/08/2026, Julius Bairaktaris relata que o ath11k estudado não anunciava AQL/airtime fairness e que os controles correspondentes não produziam efeito. O ensaio usou AP IPQ8074, uma estação HE, download TCP saturado e sondagem a 20 Hz na mesma categoria de acesso, com três pares de rodadas intercaladas.

| Variante relatada pelo autor | Vazão | Latência relatada |
|---|---:|---:|
| Driver original do ensaio | 94,6 Mb/s | 155 ms |
| Série de patches, limite padrão | 94,0 Mb/s | 157 ms |
| Série de patches, BE 500/1000 µs | 74,3 Mb/s | 22 ms |

Os valores são do relato do autor, sem reexecução ou homologação nossa; a tabela não deve ser interpretada como p99 nem promessa. O ganho veio de suporte funcional **e** calibração; os patches com limites padrão quase não mudaram a latência. Não há confirmação aqui de merge ou backport no ARK. [Mensagem original arquivada — série ath-next v2](https://lkml.rescloud.iu.edu/2608.3/00270.html).

**Mudança no estudo:** testar suporte, contabilização de airtime e efeito real antes de escolher números AQL. Não extrapolar mt76 para ath11k, ath12k ou QSDK. A faixa 500/1000 desse ensaio não vira recomendação universal.

### 11.3. WED exige um eixo próprio de comparação

A documentação OpenWrt de WED descreve o encaminhamento acelerado PPE↔Wi-Fi e alerta para perda de QoS/AQL nesse caminho. A página GL-MT6000 também associa redução de AQL a menor latência com possível redução de pico e ressalva seu uso com WED. **Acesso parcial: foram lidos os trechos indexados; a abertura integral retornou proteção anti-bot.** [OpenWrt: WED](https://openwrt.org/docs/guide-user/network/wifi/wed), [OpenWrt: GL-MT6000](https://openwrt.org/toh/gl.inet/gl-mt6000).

Isso reforça uma hipótese específica de percurso e versão, não que toda implementação WED, inclusive SDK de fabricante, tenha comportamento idêntico. Tampouco prova que WED esteja ativo no alvo ou seja causa de um problema atual.

**Mudança no protocolo:** acrescentar comparação WED/offload versus caminho de software, registrando fluxos que atravessam o qdisc, AQL pendente e CPU por núcleo. Se desativar aceleração saturar a CPU, esse resultado precisa entrar no compromisso final. Não escolher somente pela vazão máxima nem somente pelo ping em carga artificialmente baixa.

### 11.4. Agregação e filas: reduzir a zero pode piorar o sistema

A documentação Linux Wireless explica que quadros precisam estar disponíveis para formar agregados e que isso complica a estimativa do airtime. Portanto, existe uma tensão entre alimentar o hardware eficientemente e evitar filas excessivas. Os detalhes e limites citados na página são históricos e não devem ser copiados como limites atuais de HE/EHT. [Linux Wireless: filas de dispositivos](https://wireless.docs.kernel.org/en/latest/en/developers/bufferbloat.html).

A RFC 8290 define `target` como referência de atraso persistente, não teto de RTT, e relaciona a calibração ao tempo de transmissão de um pacote e ao `interval`. Não oferece fundamento para simplesmente colocar tudo em 1 ms. [RFC 8290, seção 5.2](https://www.rfc-editor.org/rfc/rfc8290.html#section-5.2).

**Mudança no estudo:** preservar agregação na primeira rodada e variar AQL separadamente. Comparar eficiência, retries e cauda de latência; não aprovar limites mínimos só por reduzir um ping isolado.

### 11.5. CAKE e BBRv3: pesquisa recente favorável, com limite importante

O preprint de Shrestha, Pokhrel e Kua, revisado em março de 2026, compara FIFO, FQ-CoDel e CAKE com BBRv3/CUBIC e encontra vantagem para AQM. Entretanto, a seção experimental usa MikroTik hAP ax3, RouterOS 7.8, três laptops Wi-Fi e um gargalo artificial de **10 Mb/s** nos dois sentidos. Os autores também relatam interação entre sondagem do BBRv3 e rajadas de retransmissões.

Isso apoia testar filas gerenciadas, mas não demonstra que CAKE tenha o mesmo custo ou comportamento em 1 Gb/s, mt76/OpenWrt ou QSDK. Também não justifica trocar congestion control do roteador para acelerar tráfego apenas encaminhado. [Artigo completo, seções IV–V](https://arxiv.org/html/2512.18259v2).

**Mudança no protocolo:** registrar congestion control dos endpoints quando controlados e misturar tráfego concorrente. Resultados em 10 Mb/s não serão usados como capacidade estimada de hardware.

### 11.6. MLO pode ajudar muito ou piorar: distinguir o método

Carrascosa e colaboradores usam simulação de acesso ao meio orientada por traços reais de ocupação de espectro. O estudo considera dois canais de 20 MHz em 5 GHz, MCS fixo e políticas SLO/STR/NSTR; não é benchmark de um T7 comercial. Observa benefícios com oportunidades de transmissão em vários enlaces, mas também aumento de latência com ocupação assimétrica e atribuição desfavorável de pacotes. [Método e resultados completos](https://arxiv.org/html/2305.02052v1).

Como evidência de outra natureza, a WBA publicou resultados de ensaios com AT&T, RUCKUS e Intel em escritório real, com eMLSR comercial: reduções de latência de até 44% no downlink e 66% no uplink nos cenários relatados. São máximos divulgados pelos participantes, não uma auditoria independente nem redução de RTT garantida. A própria fonte esclarece que eMLSR alterna enlaces e só transmite/recebe dados numa banda por vez. [Relato dos ensaios WBA](https://wballiance.com/wba-validates-wifi-7-mlo-reliability-att-intel-ruckus/).

**Mudança no protocolo:** comparar SLO 5 GHz, SLO 6 GHz e MLO; incluir carga/interferência assimétrica; registrar modo negociado. Não presumir que “MLO ativo” signifique STR simultâneo ou superioridade de latência.

### 11.7. OFDMA: o agendador importa tanto quanto o recurso

O resumo publicado de LOMAS relata que OFDMA pode reduzir latência, mas que manter requisitos exige agendamento dinâmico. A leitura integral via IEEE Xplore foi bloqueada; portanto, não extraímos números, presets ou conclusões sobre um driver específico. [Publicação e resumo](https://ieeexplore.ieee.org/document/11192340/).

**Mudança no estudo:** retirar qualquer expectativa de que habilitar ou desabilitar OFDMA seja solução geral. Exigir suporte e atividade efetivos e comparar carga esparsa de um cliente, vários clientes com pacotes pequenos e tráfego volumoso concorrente. MU-MIMO e OFDMA são mecanismos distintos; não agrupar seus efeitos numa única opção de “aceleração”.

### 11.8. Prioridade na internet não garante prioridade no rádio

A RFC 8325 explica o desalinhamento possível entre DSCP e User Priority do Wi-Fi e recomenda mapeamentos explícitos. Por exemplo, EF tem recomendação de UP 6; não se deve presumir esse resultado apenas pela marcação IP. A RFC não recomenda classificar todos os jogos como voz. [RFC 8325](https://datatracker.ietf.org/doc/html/rfc8325).

Há atualização relevante em maio de 2026: a RFC 9956 define NQB, com DSCP 45, para tráfego que não constrói filas persistentes. Ela atualiza a RFC 8325, mas exige comportamento apropriado da rede e da origem. Marcar qualquer UDP com 45 não implementa NQB. [RFC 9956](https://datatracker.ietf.org/doc/html/rfc9956).

**Mudança no protocolo:** observar a cadeia classificação → CAKE → eventual limpeza/remarcação → UP/TID → categoria de acesso. Testar uma sonda Best Effort e a classe pretendida separadamente, para não esconder bufferbloat geral priorizando apenas o ping. Captura 802.11 é uma etapa opcional de laboratório com equipamento compatível, não substituída pela configuração UCI.

### 11.9. Cliente: uma otimização de upload pode prejudicar os demais

A Intel descreve Throughput Booster como packet bursting que prolonga a ocupação do meio pelo cliente e pode afetar outros dispositivos. Documenta ainda U-APSD como mecanismo de economia para tráfego sensível a latência e relaciona potência a cobertura e interferência. A disponibilidade das opções depende do adaptador/driver. [Intel: parâmetros avançados](https://www.intel.com/content/www/us/en/support/articles/000005585/wireless/legacy-intel-wireless-products.html).

**Mudança no estudo:** para clientes Intel que exponham a opção, manter Throughput Booster desativado como referência de fairness; comparar energia e U-APSD individualmente, preservando o estado original. Não aplicar instruções de Windows a macOS, celulares ou outros drivers.

A Apple recomenda 20 MHz em 2,4 GHz, WMM habilitado e Auto/todas as larguras em 5/6 GHz para compatibilidade geral. Isso deve ser distinguido da nossa comparação experimental 40/80/160 para um objetivo específico de cauda de latência. [Apple: configuração de roteadores](https://support.apple.com/en-us/102766).

Não foi encontrada nesta rodada base oficial suficiente para determinar um canal AWDL universalmente ideal. Relatos de “44/149 resolve tudo” não foram elevados a recomendação. Investigar serviços de continuidade só quando picos forem específicos de clientes Apple e reproduzíveis.

### 11.10. L4S: trilha futura, sem confundir com ECN comum

L4S inclui requisitos de transporte e tratamento de filas; não equivale a habilitar ECN no CAKE. A arquitetura descreve interação entre endpoints compatíveis e AQM apropriado, com suporte por fluxo ou DualQ. A RFC 9332 especifica a variante de duas filas acopladas. [Arquitetura L4S — RFC 9330](https://www.rfc-editor.org/rfc/rfc9330.html), [DualQ — RFC 9332](https://www.rfc-editor.org/rfc/rfc9332.html).

**Recomendação:** considerar apenas como linha de pesquisa separada, depois de resolver RF, filas convencionais e CPU. Validar coexistência com tráfego clássico e disponibilidade real no caminho; não substituir a base SQM por promessa de latência submilissegundo.

### 11.11. Protocolo melhorado: curva de carga e latência do fluxo

O Crusader mede vazão, latência e perda com tráfego de download/upload, incluindo medidas de latência associadas às transferências. A documentação exige cliente e servidor e permite execução local. [Projeto e documentação original](https://github.com/Zoxc/crusader).

Acrescentar ao protocolo da seção 8:

1. **Curva de carga:** oferecer 25%, 50%, 75%, 90% e saturação da capacidade útil de referência, com pacing verificado. Para Wi-Fi variável, registrar carga oferecida e efetivamente entregue; o percentual não é capacidade instantânea garantida.
2. **Carga esparsa e volumosa juntas:** observar latência dentro do tráfego ativo e de sondas separadas; ambos importam para aplicações.
3. **Direções separadas e simultâneas:** aplicar download, upload e bidirecional; uma aprovação em download não vale para upload.
4. **Sondas sem prioridade especial:** evitar que ICMP prioritário crie aparência de estabilidade enquanto os fluxos reais continuam atrasados.
5. **Replicação:** resultados por rodada, mediana entre rodadas e dispersão, sem juntar amostras de clientes distintos num p99 único.
6. **p99 com amostra suficiente:** a 20 sondas/s por 120 s são 2400 amostras, apenas cerca de 24 na cauda superior de 1%. Preservar séries temporais e repetir; isso não sustenta sozinho uma garantia de evento raro.
7. **Escolha por compromisso:** identificar a fronteira entre vazão e p99, incluindo CPU e perda. Aceitar menor pico de velocidade somente quando a redução de cauda for consistente e relevante ao uso.

### 11.12. Decisão revisada para o ARK

| Ordem | Experimento proposto | Por que ganhou prioridade |
|---|---|---|
| 1 | Padrão efetivo do driver e inventário de capacidades | AQL configurável pode estar inoperante |
| 2 | Caminho software versus WED/offload, com CPU e contadores | Evitar atribuir ao AQL resultado de fluxos que o contornam |
| 3 | Canal/largura e capacidade útil sob carga | Controlar a variação do serviço que alimenta as filas |
| 4 | CAKE na WAN, parâmetros simples e taxa medida | Isolar problema de operadora antes de ajustes finos de rádio |
| 5 | Padrão AQL versus perfil ARK versus perfil restritivo | Medir compromisso real, sem copiar limites de outro driver |
| 6 | Fairness, DSCP→UP/TID e cliente | Garantir benefício compartilhado e relevância para aplicações |
| 7 | OFDMA/MLO e L4S em trilhas específicas | Benefício depende de implementação e cenário demonstráveis |

**Conclusão da revisão:** a pesquisa externa fortalece a combinação AQM + controle de airtime, mas enfraquece a ideia de um preset universal. O candidato mais promissor é um perfil por driver e percurso de aceleração, escolhido pela curva vazão × p99 e pela estabilidade com múltiplos clientes. Nenhuma fonte externa homologa os limites locais do ARK sem medição.
