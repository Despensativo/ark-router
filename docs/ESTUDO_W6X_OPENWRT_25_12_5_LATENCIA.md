# Acer Predator Connect W6x: latência, jitter e bufferbloat no OpenWrt 25.12.5

Data: 29/10/2026. Estudo específico, complementar a [pesquisa geral](ESTUDO_WIFI_LATENCIA_BUFFERBLOAT.md). Nenhum comando foi executado no roteador; nenhuma configuração, dependência, firmware ou código funcional foi alterado.

## 1. Premissas e conclusão

O usuário confirmou **Acer Predator Connect W6x**, **OpenWrt 25.12.5** e **800 Mb/s de upload e download**. Também usou o termo “assimétricos”: este estudo considera valores nominais iguais, mas calibra as direções independentemente. Não foram informados cliente Wi-Fi principal, PPPoE/IPoE, canal atual, sinal ou capacidade sustentada medida.

O caminho mais promissor para esse conjunto é: **5 GHz com largura escolhida por medição + mt76/AQL efetivo + CAKE no gargalo WAN + controle do caminho PPE/WED + CPU com margem na carga bidirecional**. O W6x tem recursos para experimentar essa combinação, mas não há neste estudo benchmark que homologue 800/800 Mb/s simultâneos com CAKE.

O diferencial deste aprofundamento é usar as fontes da release declarada, em vez de atribuir automaticamente ao equipamento o comportamento do Linux mais recente.

## 2. Hardware e suporte OpenWrt confirmados externamente

| Componente | Evidência pública | Implicação prática |
|---|---|---|
| SoC | MT7986AV, quatro Cortex-A53 a 2 GHz | Avaliar núcleo/softirq, não apenas CPU média |
| RAM física | 1 GB, conforme inclusão oficial do suporte | RAM não garante desempenho do shaper; medir memória disponível |
| Flash | 256 MB SPI NAND | Capacidade de armazenamento não controla fila nem jitter |
| Wi-Fi | MT7976GN + MT7976AN, dual band 2,4/5 GHz, Wi-Fi 6 | Sem 6 GHz, Wi-Fi 7, 320 MHz ou MLO neste modelo |
| 5 GHz | 4×4, suporte comercial a 160 MHz, até 4804 Mb/s PHY | Cliente 1×1/2×2 não recebe quatro fluxos só porque o AP tem 4×4 |
| WAN | Uma porta 2,5 GbE | Confirmar negociação real com ONT/modem |
| LAN | Quatro portas de 1 GbE | Um servidor numa porta LAN não mede sozinho vazão Wi-Fi acima de 1 Gb/s |
| Switch | MT7531, enlace CPU/switch declarado em 2,5 Gb/s no DTS | Separar limite da porta, do caminho compartilhado e do rádio |

Fontes: [inclusão oficial do W6x no OpenWrt](https://github.com/openwrt/openwrt/commit/6e04dccb7ad3191e9a48597a1b354bf548ead1d8), [Acer: bandas, CPU e portas](https://store.acer.com/en-us/predator-connect-w6x-wi-fi-6-gaming-router), [Acer Brasil: 5 GHz e 160 MHz](https://br-store.acer.com/wifi-router-quad-w6x-dual-band-ff-g2tta-007/p), [DTS do W6x](https://raw.githubusercontent.com/openwrt/openwrt/main/target/linux/mediatek/dts/mt7986a-acer-predator-w6x.dtsi).

Não confundir W6x com W6, W6d, W6m ou T7. Recursos Intel Killer/Hybrid QoS anunciados para o firmware Acer não comprovam existência nem equivalência no OpenWrt.

O DTS comum consultado também contém uma declaração inicial de memória de 512 MiB, enquanto a inclusão do suporte informa 1 GB físico. Isso torna importante ler o `MemTotal` e o estado efetivo de boot; não permite concluir, sem acessar o equipamento, que haja perda de RAM. Nenhuma alteração de DTS/bootloader é proposta.

## 3. A release 25.12.5 usa componentes de gerações diferentes

| Camada | Fonte da tag `v25.12.5` | Consequência |
|---|---|---|
| Kernel do target MediaTek | Série 6.12 | Revisão exata e patches ainda precisam ser lidos no equipamento |
| mac80211 | Backports 6.18.26 | `uname -r` sozinho não identifica a geração da pilha Wi-Fi |
| mt76 | Revisão `39c960c3ada558b4c2e7915772483d3731573d09`, data de fonte 19/03/2026 | Inspecionar esse código e os patches da distribuição |
| Pacote Wi-Fi W6x | `kmod-mt7915e`, `kmod-mt7986-firmware`, `mt7986-wo-firmware` | Nome mt7915e não significa que o aparelho seja MT7915 ou Qualcomm |

Fontes fixadas na release: [target](https://raw.githubusercontent.com/openwrt/openwrt/v25.12.5/target/linux/mediatek/Makefile), [mac80211](https://raw.githubusercontent.com/openwrt/openwrt/v25.12.5/package/kernel/mac80211/Makefile), [mt76](https://raw.githubusercontent.com/openwrt/openwrt/v25.12.5/package/kernel/mt76/Makefile), [perfis de imagem](https://raw.githubusercontent.com/openwrt/openwrt/v25.12.5/target/linux/mediatek/image/filogic.mk).

Esses são os componentes declarados pelo projeto oficial, não uma auditoria do binário instalado. Uma imagem personalizada ou atualização de pacotes pode divergir. Os perfis stock/ubootmod existem, mas trocar layout não é otimização de latência e não integra esta proposta.

## 4. AQL e WED: o ponto principal nesse hardware

### 4.1. Suporte AQL no código da versão

Na revisão mt76 referenciada pela release, a inicialização comum anuncia `NL80211_EXT_FEATURE_AQL` e `NL80211_EXT_FEATURE_AIRTIME_FAIRNESS`. Isso dá fundamento melhor à investigação de AQL no W6x do que extrapolar a proposta de patches ath11k do estudo geral. Ainda é necessário conferir atividade e o percurso de cada fluxo. [Código mt76 fixado](https://raw.githubusercontent.com/openwrt/mt76/39c960c3ada558b4c2e7915772483d3731573d09/mac80211.c).

AQL limita airtime estimado pendente no caminho de transmissão; seu efeito mais direto é AP → cliente. Upload também depende das filas, energia e driver do cliente. Não se deve esperar que uma configuração no W6x controle todas as filas internas de um celular.

### 4.2. Três estados diferentes de WED

1. **Solicitado:** parâmetro `wed_enable` com valor Y.
2. **Inicializado:** dispositivo WED foi anexado e inicializado pelo driver.
3. **Utilizado:** fluxos da rodada realmente passam pelo percurso acelerado.

Na revisão mt76 da release, `wed_enable` é um parâmetro booleano comum, e a função `mt7915_mmio_wed_init()` o consulta durante inicialização. Não há nessa declaração um callback que anexe/desanexe WED ao escrever o valor. Portanto, mudar o parâmetro ou ver Y no painel não comprova transição efetiva de percurso. [Código de inicialização WED](https://raw.githubusercontent.com/openwrt/mt76/39c960c3ada558b4c2e7915772483d3731573d09/mt7915/mmio.c).

A futura comparação precisa garantir estados de inicialização reproduzíveis, com reinicialização controlada do driver ou do equipamento quando necessária e autorizada. Não executar unload/reload do driver com a administração dependente do Wi-Fi.

A documentação OpenWrt alerta para perda de QoS/AQL no caminho acelerado WED descrito. Foi possível consultar o trecho indexado; a abertura integral ficou bloqueada por anti-bot. Não se presume que toda combinação de patches ou firmware MediaTek tenha comportamento igual. [Documentação WED](https://openwrt.org/docs/guide-user/network/wifi/wed).

### 4.3. Perfis de comparação

| Perfil | WAN | Wi-Fi | Objetivo |
|---|---|---|---|
| Referência de estado | Configuração atual, apenas medida | Atual, sem mudança | Saber de onde se parte |
| Referência de controle de filas | CAKE; fluxos moldados sem bypass de offload | Caminho software, AQL padrão efetivo | Isolar o que filas gerenciadas resolvem |
| Candidato ARK moderado | Igual ao anterior | AQL versionado no ARK | Comparar p99 e vazão |
| Candidato ARK restritivo | Igual ao anterior | AQL local preexistente | Avaliar custo de menor orçamento |
| Referência acelerada | Offload/WED com estado comprovado | Caminho acelerado comprovado | Medir ganho de CPU e efeito na latência |

O perfil acelerado não é presumido compatível com CAKE sobre os mesmos fluxos. Se a taxa configurada não limitar o tráfego ou os contadores não acompanharem a carga, o ensaio não demonstra SQM efetivo.

## 5. Configuração de rádio candidata para o W6x

| Parâmetro | Referência proposta | Condição para mudar |
|---|---|---|
| País | País real de operação, BR se instalado no Brasil | Não usar outro domínio para forçar potência/canais |
| Banda do cliente principal | 5 GHz | Usar 2,4 GHz se cobertura de 5 GHz não sustentar enlace estável |
| Modo | HE, preservando compatibilidade necessária | Não desativar Wi-Fi 6 para “baixar ping” sem comparação |
| Largura 5 GHz | **HE80 como referência; HE160 como concorrente obrigatório para 800 Mb/s** | Vence quem entrega melhor p99 e capacidade com margem |
| Largura 2,4 GHz | HE20/HT20 conforme suporte | Não forçar 40 MHz/coexistência desativada por rotina |
| Canal | Escolha após survey e testes no horário ocupado | Comparar blocos, não apenas o número primário |
| WMM | Habilitado | Não desativar para tentar reduzir prioridade/filas |
| Agregação | Padrão do mt76 | Reduzir só se benefício for reproduzível |
| Potência | Suficiente para enlace de ida e volta; padrão como referência | Ajustar pela qualidade medida do cliente, não por watts máximos |
| Beacon/DTIM | Padrões efetivos inicialmente | Comparar DTIM/energia em experimento separado |
| Beamforming/OFDMA/MU-MIMO | Preservar padrões suportados da imagem como referência | Só atribuir efeito a recurso realmente ativo |
| Steering/roaming | Cliente fixo no BSSID durante calibração | Testar mobilidade depois de fechar o cenário estacionário |
| SSIDs | Reduzir SSIDs desnecessários; manter segmentação útil | Medir custo de gerenciamento antes de sacrificar isolamento |

**Por que HE160 pode ser importante aqui:** em cliente de dois fluxos, a referência PHY máxima HE com GI curto passa aproximadamente de 1201 Mb/s em 80 MHz para 2402 Mb/s em 160 MHz. Esses são tetos PHY teóricos, não goodput. Com overhead e disputa, HE80 pode ficar próximo demais de 800 Mb/s úteis. Nesse caso HE160 pode criar margem e diminuir fila, mesmo usando mais espectro. Em ambiente ocupado ou com sinal pior, HE80/HE40 pode vencer. O cliente principal ainda não foi identificado.

O rótulo AX6000 agrega capacidades e não representa 6 Gb/s de internet num cliente. A capacidade 4×4 do AP não remove a limitação 1×1/2×2 do receptor. Sinal perto de -50 a -65 dBm serve como referência exploratória de boa cobertura, sem substituir SNR/retries por cliente.

Não recomendar “canal 149 em 160 MHz” sem conferir o bloco efetivamente permitido pelo driver/domínio regulatório. Não usar `noscan`, `ht_coex=0`, modo de teste ou país alternativo como receita. DFS deve permanecer funcional; registrar CAC/trocas e avaliar estabilidade no local.

## 6. CAKE para 800 Mb/s em cada direção

### 6.1. Taxa inicial e calibração

Se a capacidade sustentada por cabo realmente for 800/800 Mb/s, iniciar ensaios em **760000 kbit/s por direção** é uma hipótese de 95%. Comparar, quando necessário, **744000** e **720000**. Não são números homologados para o W6x nem ordem de aplicação automática.

Se a medição por cabo entregar taxas diferentes, calcular a referência separadamente. Exemplos: download sustentado de 780 Mb/s → 741000 kbit/s a 95%; upload sustentado de 760 Mb/s → 722000 kbit/s. A melhor margem depende da variabilidade e do ponto de contagem de overhead.

No teste simultâneo, 800+800 corresponde a **1,6 Gb/s agregados de tráfego útil nos dois sentidos**, além do processamento de ACKs e encapsulamento. Quatro núcleos e WAN de 2,5 GbE não garantem que uma instância/caminho de CAKE escale linearmente entre núcleos.

### 6.2. Opções a comparar

- **Algoritmo:** CAKE como primeira referência; FQ-CoDel com shaper apropriado como alternativa se CPU limitar. Trocar CAKE por `fq_codel` sem controlar a taxa da WAN não produz comparação equivalente.
- **Classes:** Best Effort facilita descobrir se a melhora atende a todos os fluxos; testar a política DiffServ do ARK separadamente, sem removê-la silenciosamente do produto.
- **Justiça:** isolamento por host/fluxo; `dual-srchost` no upload e `dual-dsthost` no ingresso são candidatos coerentes com a direção; conferir NAT/endereço observado.
- **ACK filtering:** `no-ack-filter` como referência para taxas nominais iguais. Não há razão demonstrada neste cenário para habilitar filtro agressivo.
- **RTT:** usar a referência do algoritmo e comparar com o `rtt 50ms` do ARK; RTT menor configurado não encurta caminho físico nem equivale a meta de ping.
- **GSO:** preservar `split-gso` como referência. A exceção QSDK/ECM do ARK não se aplica automaticamente ao MediaTek W6x.
- **Overhead/MPU:** identificar PPPoE, VLAN e a interface usada pelo shaper. Não aplicar 44 ou 18 por reconhecer apenas a palavra “fibra”.
- **Memória:** comparar automático e o teto 64M escolhido pelo ARK para RAM acima de 768 MiB, observando `memory used`, perdas e latência. Um teto não é pré-alocação fixa nem justificativa para ocupar a memória disponível.

Semânticas no [manual CAKE](https://man7.org/linux/man-pages/man8/tc-cake.8.html). Esses pontos são propostas; nenhuma seção SQM foi escrita no equipamento.

## 7. AQL: reduzir o espaço de busca sem vender um preset

| Candidato 5 GHz | BE low/high | Threshold | Origem |
|---|---:|---:|---|
| Padrão efetivo | Ler no equipamento | Ler no equipamento | Referência que depende do backport/patches |
| ARK versionado | 2500/4500 µs | 4000 µs | HEAD local `c4b8831b` |
| ARK restritivo | 1500/2500 µs | 2000 µs | Alteração local preexistente não commitada |

Não começar com 500/1000 µs copiado do ath11k. O W6x usa outro driver, outra contabilização e outro caminho de hardware. Também não apresentar 1500/2500 como ping de 1,5–2,5 ms: AQL mede uma estimativa de airtime pendente, não RTT de aplicação.

O candidato restritivo também tenta reduzir FQ a 1024 pacotes e 4 MiB por PHY. Para saber a causa de uma melhora, testar primeiro somente AQL, depois threshold e finalmente os limites FQ. Manter as outras categorias de acesso estáveis enquanto se investiga BE, registrando toda configuração para restauração exata.

## 8. Achados locais do ARK relevantes ao W6x

Leitura estática da árvore local; não diagnóstico do roteador em execução:

| Achado | Risco de interpretação | Validação necessária |
|---|---|---|
| `wifi-wed-toggle` grava `wed_enable` em execução e arquivos de módulos | Interface mostrar ligado/desligado sem mudança efetiva do percurso | Comprovar inicialização e utilização do WED |
| `system-hardware-info` usa Y do parâmetro para status | Confundir intenção com aceleração ativa | Conferir estado do dispositivo e tráfego |
| `sync_sqm_flow_offload()` desliga flags de flow offload quando SQM está ativo | Presumir que isso também desanexe WED | Medir separadamente flags do firewall, WED e fluxos |
| Regras locais marcam ICMP/ICMPv6 como CS6 | Ping parecer melhor do que tráfego Best Effort | Sondas UDP/latência dos fluxos, verificando DSCP real |
| Perfil High-Spec aumenta backlog, orçamento de polling e RPS/RFS | Interpretar buffer/CPU médio como garantia de latência | Comparar padrão contra perfil, núcleo/softirq e p99 |
| Script tenta preservar CAKE ao substituir qdiscs Ethernet | Ordem de serviços e interface errada ainda podem invalidar o teste | Ler qdisc/IFB após todos os serviços estabilizarem |

O arquivo nft local também contém comentário afirmando que `besteffort wash` não limpa DSCP. Na fonte Linux v6.12 consultada, `cake_select_tin()` processa `wash` antes de selecionar Best Effort. Portanto, o comentário não é evidência universal dessa falha; inspecionar o kernel/patches efetivos e confirmar DSCP com tráfego. [Código CAKE v6.12](https://raw.githubusercontent.com/torvalds/linux/v6.12/net/sched/sch_cake.c).

RPS distribui processamento por CPU; RFS procura afinidade com aplicação/socket consumidor. Em um gateway predominantemente encaminhando tráfego, RFS não deve ser tratado automaticamente como acelerador universal de roteamento. [Documentação Linux de escalabilidade](https://docs.kernel.org/networking/scaling.html).

O código local permite promessas fortes em comentários e histórico (“zero-drop”, ping 0, aceleração sem quebrar SQM). Não foram reutilizadas como prova. Perdas controladas por AQM podem fazer parte do funcionamento correto; zero perdas sob saturação não é o objetivo isolado.

## 9. Teste desenhado para esse equipamento e esse link

### Etapa A — inventário somente leitura

Identificar release/build, kernel, versões de mt76/mac80211/firmware, board/layout, RAM reconhecida, WAN/encapsulamento, ligação com ONT, cliente e associação real. Não coletar senha, chave SAE, arquivo wireless completo ou configurações integrais.

Comandos de referência para futura coleta, não executados nesta sessão:

```sh
ubus call system board
uname -r
awk '/MemTotal:|MemAvailable:/ {print}' /proc/meminfo
iw dev
iw reg get
lsmod | sed -n '/mt76/p; /mt7915/p; /mt7986/p; /wed/p'
cat /sys/module/mt7915e/parameters/wed_enable
uci -q get firewall.@defaults[0].flow_offloading
uci -q get firewall.@defaults[0].flow_offloading_hw
```

Objetos de interface e caminhos debugfs devem ser descobertos antes de consultar station/survey, `aql_txq_limit`, `aql_threshold`, `aql_pending` e `aqm`. Não assumir `radio1=phy1` ou que uma interface chamada `eth1` seja a WAN usada pelo SQM. Consultar somente campos necessários das versões de pacote; nomes disponíveis dependem da imagem.

### Etapa B — teto por Ethernet

Cliente Ethernet em LAN 1 GbE, servidor externo adequado e destinos auxiliares. Medir ocioso, download, upload e simultâneo. A porta 1 GbE atende ao ensaio de 800 Mb/s por direção, respeitando margem e o duplex negociado. Nenhum resultado acima do teto da porta será atribuído ao rádio.

Identificar se 800/800 se sustenta no mesmo instante. Monitorar CPU por núcleo, softirq, temperatura e erros. Se a latência subir já por cabo, fechar primeiro o gargalo WAN/CPU.

### Etapa C — rádio isolado da operadora

Servidor Ethernet local e cliente Wi-Fi na mesma posição/BSSID. Comparar HE80 e HE160 em download, upload e simultâneo, com WED efetivamente identificado. Repetir com cliente distante e segundo cliente concorrente. Registrar variações de retries/failed, sinal, MCS/NSS e ocupação.

Um servidor único em LAN 1 GbE é suficiente para investigar a meta de 800 Mb/s, mas mascara a capacidade Wi-Fi além desse limite. Se for necessário caracterizar capacidade acima de 1 Gb/s, usar vários servidores/portas ou topologia temporária apropriada em laboratório; não converter a WAN em LAN do roteador real automaticamente.

### Etapa D — conjunto e escolha

1. Referência por cabo e Wi-Fi sem trocar presets.
2. Seleção de canal/largura com capacidade útil e estabilidade adequadas.
3. CAKE em 760/760 Mb/s apenas se 800/800 sustentados forem confirmados; ajustar cada direção.
4. Comparação de padrão AQL e candidatos ARK com caminho de software comprovado.
5. Comparação acelerada separada, validando contadores e CPU.
6. Conferência de classes reais: Best Effort, prioridades pretendidas e tráfego dos demais clientes.

Cinco repetições de 60–120 s por candidato, referência/candidato/referência, e ensaio prolongado do finalista. Registrar p50/p95/p99, série temporal, perda e vazão. O relatório geral define jitter e amostragem. Não usar scan ativo durante a rodada.

## 10. Critérios e escolha provisória

**Perfil provisório mais defensável:** 5 GHz HE80 como referência e HE160 como concorrente, WMM e agregação preservados, país correto, CAKE com fluxos sem bypass, AQL padrão primeiro, upload/download calibrados separadamente e sondagem que não dependa apenas de ICMP priorizado.

Metas de engenharia, sem garantia: reduzir acréscimo p95 sob carga para aproximadamente 5–10 ms no cenário relevante, investigar cauda p99/picos, evitar perda persistente e desconexões. Comparar custo de vazão previamente aceito. Não confundir essa meta com RTT absoluto até servidor remoto.

Se CAKE a 760/760 simultâneos saturar processamento, as opções a comparar são reduzir taxa, alterar o shaper/algoritmo com controle de banda equivalente ou separar gateway e AP. Não concluir que o Wi-Fi é culpado apenas porque o teste foi feito sem fio.

Se HE160 reduzir p99 e sustentar a taxa com menos tempo ocupado, mantê-lo é justificável. Se aumentar retries/trocas ou sofrer interferência, HE80 pode ser superior mesmo com menor pico. Uma configuração “perfeita” para um cliente próximo pode não ser adequada para a residência inteira.

## 11. Estado da entrega

- Pesquisa específica de hardware, tag OpenWrt 25.12.5 e revisão mt76: realizada.
- Inspeção do ARK, sem modificar sua alteração preexistente: realizada.
- Dados de modelo, release e taxas nominais: fornecidos pelo usuário, sem medição independente.
- Cliente, WAN, RF, pacotes instalados, AQL/WED/CAKE ativos: ainda não medidos.
- VM, mocks e hardware real: nenhum ensaio executado; plano de testes proposto.
- Mudança de UI/código funcional: nenhuma; screenshot e testes de frontend não se aplicam.

Uma futura implementação deve passar primeiro pelo laboratório virtual para integração/SQM. Rádio, interferência, WED e desempenho desse SoC exigem etapa física autorizada; a VM não homologa esses efeitos. O estudo não exige upgrade, troca de bootloader ou instalação de firmware para ser usado.
