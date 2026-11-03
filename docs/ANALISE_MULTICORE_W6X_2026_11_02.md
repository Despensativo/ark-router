# Multitarefas e distribuição de CPU no W6x

Inspeção em 02/11/2026, aproximadamente 13:53–14:02 (America/Sao_Paulo).
Alvo: W6x 192.168.73.1, OpenWrt 25.12.6/kernel 6.12.112, ARK 2.1.8.
Checkout: `89fda1c0`. Tarefa `T-081`. Diagnóstico exclusivamente em leitura.

[Métricas derivadas da coleta, sem credenciais ou identificadores de clientes](audit/evidence/w6x_multicore_2026_11_02.json).

## Resultado principal

O ARK distribui etapas da rede entre os quatro núcleos, mas não implementa uma divisão exclusiva de todos os recursos. IRQ/NAPI e RPS possuem afinidades explícitas; os serviços de usuário continuam livres em CPU0–3. A CPU2 concentra processamento de ambos os rádios, mas não está isolada do sistema.

Não foi demonstrada saturação sustentada de CPU. Houve download WAN médio de aproximadamente 160 Mb/s em um intervalo de 10 s, com ocupação entre 29% e 35% por núcleo. Isso não homologa capacidade de 700 Mb/s com Wi-Fi, VPN, NAS e painel simultaneamente: essa carga completa não foi observada.

Os achados mais relevantes são: recalibração de hardware concorrente após eventos de interface; custo significativo dos filhos do RPCd; centralização dos rádios em um núcleo; e indicações de “multicore nativo” que não medem capacidade efetiva por fila.

## Escopo e identificação das evidências

- Quatro CPUs online, IDs físicos de core 0/1/2/3 e siblings individuais: quatro núcleos, sem SMT indicado.
- Os arquivos instalados `ark-hardware-tune`, `90-ark-rps-tune`, `modules/sqm.sh`, `equipe-traffic-history`, `ark-rainbowd.uc` e `ark-web-watchdog` tiveram SHA-256 iguais ao checkout. Não foi comparado o pacote inteiro.
- AQL=1 e airtime_flags TX+RX nos dois PHYs; packet_steering=0. As correções posteriores ao primeiro relatório estão efetivamente aplicadas nesses pontos.
- Duas séries de rede: cinco pontos em 40,22 s e sete pontos em 60,37 s, espaçados aproximadamente 10 s. Foram lidos `/proc/stat`, IRQs, softirqs, softnet, bytes de interfaces e tempo acumulado de todas as threads acessíveis.
- Uma série por cgroup em 45,42 s e uma confirmação de RPCd em 15,01 s. Cgroups incluem os filhos curtos que desaparecem antes da próxima leitura de processos.
- O usuário confirmou disponibilidade para gerar carga, mas não identificou quais recursos utilizou. As taxas observadas delimitam o teste; não se presume saturação por ter sido autorizada.
- Sem mudanças, instalação, benchmarks sintéticos de CPU, reboot, reload, alteração de afinidade ou execução de autocura. Nenhum teste de implementação em VM/mock foi realizado, pois não houve correção.
- O checkout já continha alterações em STATUS e três assets de i18n, além do relatório anterior não versionado. Foram preservadas.

## Mapa efetivo dos núcleos

| Núcleo | Trabalho explicitamente direcionado | Trabalho adicional permitido |
|---|---|---|
| CPU0 | RPS das quatro interfaces AP, portanto encaminhamento superior de tráfego recebido do Wi-Fi | RPS PPPoE, DNS, LuCI/RPC, LEDs, controle e workers livres |
| CPU1 | IRQ Ethernet 122 e 130; `napi/mtk_eth-5` | RPS PPPoE e serviços livres |
| CPU2 | IRQ Wi-Fi 119; seis NAPIs `phy0-7` a `phy0-12`; `mt76-tx phy0` | Todos os serviços cuja máscara é 0–3, workqueues e IRQ crypto 128 |
| CPU3 | IRQ Ethernet 123; `napi/mtk_eth-6` | RPS PPPoE e serviços livres |

`eth0`/`eth1` têm RPS=0; PPPoE tem máscara `b` (0/1/3); APs têm máscara `1` (CPU0); RFS=0. RPS=0 significa processamento sem redirecionamento por esse mecanismo, não “usar CPU0”. RPS `b` permite distribuir fluxos elegíveis, sem garantir divisão igual nem paralelizar cada pacote de um único fluxo. [Mecanismos RSS/RPS/RFS/XPS do kernel](https://www.kernel.org/doc/html/latest/networking/scaling.html).

As máscaras permaneceram coerentes no início e no fim. O packet_steering nativo está desativado e não havia irqbalance em execução; seu pacote está instalado, porém `enabled=0`.

### NAPI: afinidade real e dispositivo interno

O mt76 reporta `napi_threaded=1`, e seus contadores de execução aumentaram. Os NAPIs Ethernet também acumularam tempo durante tráfego. Logo não são apenas threads criadas e inativas.

`/sys/class/net/eth*/threaded` e `/sys/class/net/phy*-ap*/threaded` retornam 0. Isso não invalida a medição: os drivers utilizam dispositivos internos/dummy para NAPI, distintos das interfaces AP/Ethernet visíveis. O upstream mt76 cria um napi_dev com threaded=1; o Ethernet MediaTek agrega NAPI em dummy_dev. A implementação instalada pode conter backports, e o estado vivo é a evidência primária. [mt76 DMA](https://raw.githubusercontent.com/openwrt/mt76/master/dma.c), [Ethernet MediaTek](https://raw.githubusercontent.com/torvalds/linux/v6.12/drivers/net/ethernet/mediatek/mtk_eth_soc.c).

A documentação recomenda alinhar threads NAPI com a CPU da interrupção, mas ressalta que o mapeamento IRQ/NAPI depende do driver. Portanto, dividir arbitrariamente as seis threads entre CPUs pode aumentar migrações e contenção de locks. [NAPI](https://www.kernel.org/doc/html/latest/networking/napi.html).

## Por que a divisão ainda tem etapas seriais

1. Os dois rádios compartilham o dispositivo mt76 e o worker de transmissão `mt76-tx phy0`. Todos os seus NAPIs estão presos à CPU2. Tráfego pesado em ambas as bandas pode disputar esse orçamento, mesmo com folga em outras CPUs.
2. O recebimento de todos os APs é redirecionado à CPU0. Upload Wi-Fi, encaminhamento local/NAS e entrega de tráfego VPN podem competir nessa etapa. Isso não significa que toda criptografia ou transmissão posterior também execute na CPU0.
3. PPPoE e IFB têm uma fila TX cada, e cada direção usa uma instância de CAKE comum, não cake_mq. Uma instância mantém processamento protegido/serializado; não recebe um núcleo exclusivo por configuração. Upload e download podem executar em paralelo em contextos diferentes, mas um único CAKE não vira quatro shapers paralelos.
4. Cada Ethernet expõe 16 filas TX, porém só uma fila RX visível. Não equivale a RSS com quatro filas RX independentes. No acumulado de eth1, todo o tráfego observado estava em `parent 1:2`; eth0 concentrava a maior parte em `1:7`, com outras filas relacionadas às portas DSA. É evidência contra interpretar a contagem de filas como balanceamento uniforme de CPU.
5. XPS estava 0 em todas as filas Ethernet. Isso desativa a associação XPS explícita, mas o driver ainda escolhe filas; não é prova de que todos os pacotes saiam pela CPU0. O upstream MediaTek seleciona filas por MAC/DSA, não simplesmente por número de CPU.

O nome `pppd` não deve ser tratado como a thread que processa todos os pacotes PPPoE: ele cuida de controle/sessão. Da mesma forma, hostapd controla associação/segurança e não encaminha em userspace cada pacote Wi-Fi.

## Medições de CPU, serviços e processos filhos

### Rede e pressão

- Na janela com aproximadamente 160,4 Mb/s de entrada PPPoE e 167,0 Mb/s de TX do AP 5 GHz, CPU0/1/2/3 ficaram em 34,8%/31,5%/30,1%/29,3% de ocupação média. Interfaces contabilizam bytes em camadas distintas, portanto não se subtraem diretamente para medir perda.
- Na série seguinte, o maior intervalo de entrada PPPoE foi aproximadamente 62,0 Mb/s; os núcleos ficaram perto de 17%–18% naquele intervalo. As demais janelas tiveram tráfego baixo/intermitente.
- Não houve núcleo com média de 100% nos intervalos medidos. Picos inferiores a 10 s ou uma carga mais pesada continuam possíveis.
- Em aproximadamente 143 s entre snapshots de softnet: zero incremento de drops e zero incremento de time_squeeze nas quatro CPUs. Isso não mede drops do rádio/CAKE e não exclui gargalos fora do backlog de recepção.
- No fim, CAKE down/up estavam em 760/750 Mb/s, backlog amostrado zero, com picos acumulados de memória muito abaixo dos 64 MiB por instância. Contadores de drops acumulados não foram classificados como falha por si só: AQM pode descartar deliberadamente.
- Memória disponível aproximada de 672 MiB, sem swap; CPU aproximadamente 53,1 °C no fim. Sem evidência de esgotamento de RAM. cpufreq/PSI não estavam expostos pelos caminhos consultados; não se concluiu frequência efetiva, governor ou ausência de throttling a partir da temperatura.

### Serviços: custo medido por cgroup, com descendentes

Percentuais abaixo usam **100% = um núcleo**. Dividir por quatro para converter à capacidade total do roteador. São médias da janela de 45,42 s, não estimativas de pico nem limites de capacidade.

| Grupo/recurso | CPU de um núcleo | Organização observada |
|---|---:|---|
| RPCd + filhos | 31,96% | Processo principal single-thread; executa comandos filhos, todos permitidos em CPU0–3 |
| Histórico de tráfego ARK + filhos | 2,30% | Loop shell a cada 5 s, com consultas UCI/ifstatus e processamento de arquivos em RAM |
| hostapd | 1,16% | Controle Wi-Fi; máscara 0–3 |
| uhttpd | 0,64% | Servidor web; parte do trabalho solicitado aparece em RPCd, não neste grupo |
| SSH/coletor | 0,60% | Overhead incluído na observação, não subtraído artificialmente |
| usteer | 0,58% | Controle de steering, single-thread livre em 0–3 |
| ubus | 0,38% | Coordenação e RPC |
| Rainbow ucode | 0,35% | Event loop de LEDs; livre em 0–3 |
| dnsmasq | 0,33% | Serviço DNS/DHCP; wrappers/jail não equivalem a vários servidores paralelos |
| nlbwmon | 0,33% | Contabilização de conexões; nice 19 no processo observado |
| netifd | 0,20% | Controle de interfaces e eventos |
| DoH proxy 1 + proxy 2 | 0,22% somados | Dois processos independentes; isso não divide cada conexão TLS entre CPUs |
| DHCPv6/RA, supplicant, log | Cerca de 0,01% cada | Carga pequena na janela |
| KSMBD, NTP, UPnP, manutenção UBI | Próximos de zero nessa janela | Sem teste de cópia/renovação/manutenção pesada |

O sistema criou aproximadamente **62,8 processos/threads por segundo** durante essa janela, incluindo os filhos da coleta. O coletor usa um awk por grupo a cada 15 s; contribui para a contagem, mas seu grupo consumiu somente cerca de 0,6% de um núcleo.

Uma confirmação adicional em 15,01 s mediu RPCd+cgroup em aproximadamente **35,47% de um núcleo**. O processo RPCd diretamente aumentou apenas 20 ticks de CPU, enquanto o tempo dos filhos e o cgroup cresceram muito mais. Isso confirma que olhar apenas a linha `rpcd` no top subestima seu custo. A origem de cada chamada não foi rastreada: não atribuí toda essa carga a uma página ou usuário específico.

O código do painel em `src/modules/lifecycle.js:201–222` dispara um conjunto amplo de RPCs/comandos em paralelo. A atualização padrão é 3 s ou 2 s com a lista de dispositivos aberta neste perfil. Há proteção contra aba oculta e polling sequencial por página, mas várias páginas/clientes e comandos filhos ainda podem concorrer. É um candidato claro a otimizar/cachear antes de fixar cada daemon em uma CPU.

## Isolamento e prioridade

O procd criou cgroups por serviço, mas `cgroup.subtree_control` estava vazio nos níveis consultados e os arquivos de quotas/pesos de CPU não estavam expostos ali. Os serviços consultados continuam com afinidade 0–3. **Organização em cgroups não comprova reserva de CPU.** [Controladores cgroup v2](https://www.kernel.org/doc/html/latest/admin-guide/cgroup-v2.html).

`mt76-tx` utiliza policy=1 (SCHED_FIFO), prioridade RT=1, e está fixo na CPU2. NAPI usa política normal no inventário. O orçamento RT global foi 950000/1000000 µs. Não há medição de throttling RT por núcleo nesta entrega; não recomendo aumentar prioridade ou remover limites por suposição. [Agendamento RT](https://www.kernel.org/doc/html/latest/scheduler/sched-rt-group.html).

O comentário do código que “reserva exclusivamente CPU2” é mais forte do que a configuração: afinidade de IRQ/RPS/algumas threads não exclui os demais serviços. Entretanto, uma CPU ociosa rodar tarefas leves não é defeito por si só. Isolamento rígido pode desperdiçar capacidade e piorar a CPU0; deve ser comparado por latência/vazão real.

## Recursos instalados, ativos e não exercitados

- **WED/PPE:** WED=Y e foi anexado ao driver; flow_offloading e flow_offloading_hw permanecem 0. O trabalho de firmware/DMA não aparece como daemon Linux nas quatro CPUs. Não foi demonstrado que todo fluxo usa PPE, nem que habilitar flow offload preservaria o SQM.
- **Firewall/NAT/DSCP:** regras nftables executam no contexto dos pacotes, não em um processo “firewall” permanentemente ocupando uma CPU. Contagem de conexões, pacotes pequenos e classificação podem elevar custo mesmo sem aumentar muito Mb/s.
- **WireGuard:** interface e workqueue de criptografia presentes; zero delta de bytes WG nas duas séries. Sua workqueue pode usar mais de um core, mas não houve benchmark de VPN. Não foi encontrada evidência de que RPS=0 no túnel torne toda a criptografia single-core.
- **Crypto Safexcel:** driver instalado e quatro IRQs com afinidade 0/1/2/3, todas com contadores zero. Isso não comprova aceleração dos algoritmos usados pelo WireGuard, DoH ou HTTPS; a execução pode ocorrer em CPU/SIMD.
- **USB/NAS:** KSMBD ouvindo em 445, mountd com pool de threads e worker kernel; nenhum armazenamento USB massivo apareceu no inventário de block devices, e a IRQ xHCI tinha zero eventos. Não houve carga NAS/USB representativa. A divisão kernel/mountd impede concluir o custo de cópia olhando só o daemon.
- **Downloads:** aria2 instalado e habilitado no boot, mas `aria2.main.enabled=0`, sem processo ativo. Não estava disputando CPU. AdGuardHome instalado, sem processo ativo; DNS corrente era dnsmasq + dois proxies DoH.
- **Multi-WAN:** mwan3 instalado e configuração WAN habilitada; nenhum watcher persistente apareceu no inventário. Regras/failover não foram exercitados, portanto não se declarou o recurso operacional/inoperante apenas pela lista de processos.
- **LEDs:** rainbow estava no daemon ucode, não no fallback shell. Seu custo medido foi pequeno, mas a promessa textual de “0% CPU” não é literal. Port-ledd não apareceu como processo contínuo. Não há justificativa medida para dedicar um núcleo a LEDs.
- **NTP e wrappers:** os dois processos com nome ntpd correspondiam a ujail e ao daemon real; não eram prova de dois servidores NTP independentes. O mesmo cuidado vale para wrappers do wpad e dnsmasq.
- **Sincronização de roaming:** o equipamento tem `ark-roaming-sync`, ausente do caminho canônico consultado. É uma ação de boot com sleep e atualização de neighbor reports, não um balanceador contínuo de CPU. Seu conteúdo privado não foi copiado para o relatório.
- **Cron/autocura:** watchdog web a cada minuto e Doctor a cada hora; Doctor também é disparado por hotplug. Esses trabalhos podem criar rajadas e reconfigurações, mesmo sem daemon permanente no top.

## Inconsistências e riscos de concorrência confirmados no código

### A. Recalibração de hardware pode executar várias vezes em paralelo

`90-ark-rps-tune` chama `ark-hardware-tune reload` em background a cada AP/PPPoE/IFB criado. `reload()` apaga o timestamp de contenção antes de chamar start, e não há lock abrangente protegendo toda a execução. O timestamp sozinho também não é uma exclusão mútua atômica.

Nos logs houve início às 13:47:52, novo início às 13:47:56 e outro às 13:47:58, com finalizações às 13:47:59 e 13:48:00. Três warmups terminaram às 13:48:12/13. Isso é compatível com execução sobreposta e não apenas com três tarefas leves independentes.

Cada execução pode reescrever IRQ/RPS/AQL e substituir qdiscs Ethernet, além de disparar warmup. Sob recriação de interfaces, há risco de filas/statísticas reinicializadas, rajadas de comandos e resultados transitórios. **Não foi demonstrado que isso cause a limitação permanente do iPhone**, mas é a correção de concorrência mais concreta deste lote.

Proposta: uma execução única com lock; coalescer eventos e fazer uma reaplicação pendente ao final, se necessário; não substituir qdisc idêntica; warmup único. Testar no VirtualBox eventos simultâneos, persistência e interferência antes de qualquer deploy físico.

### B. O diagnóstico “multicore nativo” usa capacidade genérica como aprovação

`ark_has_native_hw_queues()` aceita família de SoC/target e o Doctor deriva daí indicação de “processamento multicore nativo”. Isso identifica uma classe de hardware; não verifica máscaras, distribuição de contadores, filas RX ativas, contenção ou saturação por direção.

Proposta: apresentar separadamente capacidade, política configurada, estado efetivo e métricas por núcleo. Não tratar “16 TX queues”, “WED ativo” ou “irqbalance desligado” como prova de balanceamento ótimo.

### C. Watchdog do histórico pode confundir paralelismo com travamento

`equipe-traffic-history:145–155` considera três ou mais processos cujo nome corresponde a rpcd, por seis ciclos, suficientes para matar rpcd/uhttpd e reiniciar serviços. Contagem isolada não comprova travamento: filhos/chamadas legítimas precisam ser distinguidos de requisições presas.

O Doctor possui lock próprio, mas ele não protege a recalibração de hardware. O critério de watchdog não foi acionado por esta análise e não houve falha/restart observado nessa janela. Proposta: saúde com timeout e idade/estado de pedidos, diferenciando pai/filhos, antes de reiniciar.

### D. Defaults de máscara não garantem política adequada a todos os recursos

O fallback RPS=0 também vale para interfaces virtuais, VPNs, USB e casos não reconhecidos. É uma política, não detecção de gargalo por recurso. Além disso, `ark_calculate_rps_mask` aparece no init e no common, e há repetição de política em SQM e hotplug: aumenta o risco de divergência futura.

Não é indicado trocar tudo por máscara `f`: isso pode adicionar redirecionamento redundante, cache misses e IPIs. A decisão deve vir do perfil real e da contabilidade de drops/latência por caminho.

## Prioridade de evolução proposta

1. **Serializar e tornar idempotente a recalibração**, eliminando sobreposição e warmups duplicados. Maior evidência de problema concreto.
2. **Reduzir RPC/telemetria redundante:** cache por classe de dado, agrupar leituras e evitar reconstruir dados estáticos a cada 2–3 s. Medir com painel aberto/fechado e vários clientes. O custo atual equivale a cerca de 8%–9% das quatro CPUs, não 32%–35% do roteador inteiro.
3. **Manter inicialmente as máscaras atuais como baseline**, em vez de redistribuir processos sem saturação demonstrada. Registrar por núcleo e direção as threads que realmente crescem.
4. **Testar uma política alternativa somente se CPU0/CPU2 saturarem:** comparar agrupamento de NAPI por fila/radio e afinidades de serviços pesados, sem assumir que separar threads que compartilham locks ajudará. Controle de orçamento de tarefas de fundo pode ser preferível a exclusão rígida.
5. **Carga representativa:** download, upload e bidirecional; um e vários clientes; 2,4 e 5 GHz simultâneos; VPN; NAS/USB; painel aberto e fechado. Registrar vazão, p95/p99 de RTT, CPU por núcleo, softnet, filas e funcionamento de DNS/LuCI. O mesmo cenário precisa ser repetido antes/depois.

Esta análise não autoriza alterações físicas. Não foi modificado código funcional nem UI. Builds, testes de implementação, screenshots e homologação virtual/física ficam para uma eventual correção autorizada.
