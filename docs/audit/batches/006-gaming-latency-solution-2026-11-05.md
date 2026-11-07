# Solução consolidada — QoS e picos de ping no iPad por Ethernet

Data: 05/11/2026. Complementa a [revisão de engenharia QoS, lote 005](005-qos-review-2026-11-05.md).

## Objetivo e estado da conclusão

O usuário confirmou que **o ping mostrado dentro do jogo parte de aproximadamente 20 ms, sobe para mais de 100 ms, oscila, estabiliza e depois repete**, com o iPad conectado **por cabo de rede**. O título do jogo e o modelo do adaptador Ethernet não foram informados. O relato não fornece uma série temporal com duração/frequência dos eventos.

A solução precisa atender dois objetivos distintos: corrigir defeitos comprovados do ARK e identificar qual trecho introduz os picos da partida. **Ainda não é possível atribuir os picos ao QoS, operadora, ExitLag, servidor ou iPad.** Cabeamento reduz a prioridade da hipótese Wi-Fi, mas não elimina adaptador USB/Ethernet, alimentação, driver, porta, negociação, filas ou processamento do aparelho.

Esta etapa produziu análise reproduzível de arquivos existentes e projeto de solução. Nenhuma configuração de roteador foi aplicada, nenhum coletor foi iniciado em equipamento e nenhuma alegação do texto anexado de “já aplicamos” foi tratada como prova do estado atual.

## Evidências incorporadas

O texto anexado contém a interpretação anterior de dois testes de dez minutos e um teste de cinco minutos com ExitLag. Os três arquivos originais foram localizados fora do repositório e analisados integralmente por um [analisador offline](../evidence/qos-2026-11-05/analyze_monitor_logs.py). Os originais permaneceram intactos; [resultado estruturado com endpoints anonimizados](../evidence/qos-2026-11-05/monitor-analysis.json) preserva os hashes.

| Arquivo | Amostras | Janela | Campos de descarte vazios |
|---|---:|---|---:|
| `ipad_10min_monitor.log` | 60/60 | 08:44:01–08:53:54 | 120/120 |
| `ipad_anti_loss_monitor.log` | 60/60 | 08:57:15–09:07:07 | 120/120 |
| `ipad_exitlag_monitor.log` | 30/30 | 09:42:02–09:46:53 | 60/60 |

Os intervalos entre amostras são da ordem de dez segundos. Não há série do ping interno do jogo, bytes/s, sequências dos pacotes, identidade completa dos fluxos ou captura correlacionada LAN/WAN. No primeiro arquivo, **todas as 60 amostras** registram `LAN:sem_resposta` e rótulo WAN `icmp_bloq`; portanto não foi obtido um baseline LAN/WAN válido por esses campos. O rótulo escolhido pelo coletor não prova bloqueio ICMP.

## Correções da interpretação anterior

### 1. Reset estatístico do nlbwmon não comprova interrupção de conexão

O [projeto nlbwmon](https://github.com/jow-/nlbwmon#description) documenta leitura com zeragem dos contadores. Isso não equivale a apagar a entrada conntrack ou interromper seu tráfego. Mudar o polling de 30 s para 5 min reduz a frequência da coleta, mas não comprova correção de perda de pacotes. Uma queda do contador exige separar coleta, recriação do fluxo e troca da entrada observada.

Há um contraexemplo dentro do próprio teste com ExitLag:

| Amostra | Horário | Contador TX do endpoint principal 1 | Contador RX |
|---|---|---:|---:|
| 25/30 | 09:46:03 | 27867 | 27480 |
| 26/30 | 09:46:13 | 539 | 535 |
| 27/30 | 09:46:23 | 1316 | 1312 |

O mesmo padrão de queda aparece nos quatro endpoints principais observados. É compatível com coleta/reset estatístico comum, entre outras explicações. **Não prova reconexão, nem prova queda da partida.** Também impede afirmar que os contadores cresceram sem reset durante as trinta amostras.

### 2. `drop=` está ausente; não significa zero

Os 300 campos de descarte das três coletas estão vazios. A conclusão “zero drops” não é suportada por esses arquivos. A causa do campo vazio depende do comando/parser original, que não foi recuperado; não presumir qual coluna do `tc` deveria ter sido usada.

No ExitLag, o campo rotulado `DL_Voice av` assume 1, 2, **358** e 5 µs ao longo do teste. O valor 358 µs aparece às 09:46:33, depois da janela das primeiras 25 amostras usada no resumo anterior. Mesmo 358 µs corresponde a só 0,358 ms; não explica por si uma oscilação superior a 80 ms. Também não limita o atraso máximo de cada pacote nem cobre outras filas.

### 3. Contadores de ida/volta não medem perda nem duplicação útil

Uma aplicação pode enviar quantidades diferentes em cada direção. `1 - rx/tx` não é taxa de perda, e quatro contadores semelhantes não demonstram que o mesmo pacote foi recebido quatro vezes ou entregue no mesmo milissegundo.

A [ExitLag descreve envio por múltiplas rotas](https://www.exitlag.com/technology?language=english). Essa descrição explica a intenção do produto; os logs locais não demonstram a política específica dessa sessão, independência física das rotas, sincronismo, deduplicação ou latência até o servidor final. Todos os túneis ainda podem compartilhar o cabo, o roteador e o mesmo acesso da operadora.

O resumo agrupa apenas IP remoto e porta remota. Há inclusive várias entradas simultâneas para o mesmo endpoint. Sem porta local/tupla completa, uma linha ausente não prova desaparecimento de socket, e comparar duas observações pode comparar conexões diferentes. O analisador registra essa ambiguidade em vez de convertê-la em perda.

### 4. `mark=160`, DSCP e tin são coisas diferentes

Na política do ARK, `0xa0` decimal 160 pode codificar o bit válido `0x80` mais DSCP CS4 decimal 32. No campo DS do pacote IPv4, CS4 corresponde a `0x80`, com os dois bits ECN tratados separadamente. Connmark, packet mark e `skb->priority` não são intercambiáveis.

Os logs exibem uma marca sem cabeçalho da captura original. Aceitar a interpretação connmark exige conhecer o comando de origem. Mesmo quando o connmark está correto, é preciso confirmar a classe efetivamente usada: o lote 005 demonstrou que prioridade explícita no skb pode prevalecer sobre o DSCP no CAKE. Ver [seleção de tin no Linux 6.12](https://github.com/torvalds/linux/blob/v6.12/net/sched/sch_cake.c#L1510).

### 5. Timeout local não altera o CGNAT da operadora

`nf_conntrack_udp_timeout*` controla o roteador onde foi aplicado. Não reconfigura o NAT do provedor. A [RFC 4787](https://www.rfc-editor.org/rfc/rfc4787.html#section-4.3) trata expiração e refresh de mapeamentos; um fluxo com tráfego frequente deve ser distinguido de um fluxo reserva ocioso.

Aumentar timeout pode ser uma escolha de compatibilidade para sessões ociosas, mas não é uma redução de RTT e não garante que túneis “nunca fechem”. Sem eventos de expiração/recriação correlacionados ao pico, não é a causa demonstrada. Preservar a escolha do usuário e não vincular automaticamente esses parâmetros ao botão gamer.

### 6. Traceroute não condena um PTT sozinho

O texto menciona um salto no PTT de São Paulo e atribui a ele microcortes. Nenhum traceroute original com horários e comparação ao destino foi localizado entre os três logs usados nesta etapa. A ausência de resposta em um salto não equivale a perda do tráfego encaminhado; roteadores podem limitar respostas ICMP, conforme a [RFC 1812, seção 4.3.2.8](https://www.rfc-editor.org/rfc/rfc1812.html#section-4.3.2.8).

Não somar RTTs dos saltos como se fossem atrasos incrementais. Não concluir o caminho de retorno a partir de uma sondagem de ida. O trecho relay→servidor continua desconhecido mesmo quando o RTT até o relay é baixo.

## O jogo é pesado?

Estes arquivos não medem bytes nem utilização do link, portanto não demonstram saturação de banda pelo jogo. Em uma janela contínua dos túneis principais, a evolução é da ordem de cem pacotes por segundo por endpoint; isso não permite determinar Mb/s sem os tamanhos. Réplicas e overhead aumentam tráfego, mas o fator efetivo precisa ser medido.

Carga gráfica/CPU, tráfego e sensibilidade a atraso são dimensões distintas. Não diagnosticar CPU/GPU do iPad a partir de conntrack. O indicador do jogo pode incluir espera de resposta e processamento dependentes da aplicação; para interpretá-lo precisamente, falta identificar o jogo. A hipótese útil é **um aumento intermitente de atraso**, cuja localização precisa ser medida.

## Arquitetura da solução

### A. Um dono por fila; aplicação verificável e reversível

1. SQM é o único proprietário das raízes das interfaces sob shaping e seus IFBs. Hardware tune deve consultar as seções ativas e não substituir nenhuma dessas raízes, seja CAKE, HFSC ou outra seleção suportada.
2. Presets operacionais alteram parâmetros compatíveis com o motor escolhido, sem reescrever silenciosamente outro motor. Configuração global, seção, serviço e estado kernel precisam concordar.
3. Validar capacidades e parâmetros antes de ativar. Falha de raiz, classe, folha ou redirecionamento deve chegar ao RPC. Um arquivo `active` não é evidência de sucesso.
4. Preservar configuração original de SQM/offload e preferências explícitas. Se a aplicação falhar, restaurar a configuração anterior e reconstruir pelo serviço correspondente, verificando o resultado.
5. BQL, AQL, GRO, NAPI e timeouts ficam sob propriedade definida, com snapshot e restauração. Não ampliar buffers ou alterar afinidade para corrigir um pico ainda não localizado.

Entrega de código proposta: Q03/Q07/Q08/Q12/Q14/Q20 do lote 005, primeiro em VM. Critério: sequências SQM→tune e tune→SQM preservam classe, taxa e bypass; erro injetado produz falha observável e restauração, não “ok”.

### B. Uma política coerente de classificação nos dois motores

1. Tráfego desconhecido fica em Best Effort. Remover promoção universal UDP e faixas extensas sem identificação de aplicação. Não reintroduzir prioridade indiscriminada para compensar os picos.
2. Para o jogo/ExitLag, definir perfil opt-in por aparelho e fluxos explicitamente identificados. Endpoints dinâmicos precisam de validade limitada e identidade completa; porta remota isolada não é identificação suficiente. Não publicar IPs observados como lista universal do produto.
3. No egress, resolver a classificação final depois das regras que podem mudar DSCP e antes do enqueue; salvar a classe autorizada no conntrack, preservando os bits usados por outros módulos. Documentar máscaras, incluindo coexistência com Multi-WAN.
4. No ingress, limpar DSCP não confiável e restaurar a classe autorizada **antes do IFB**. Preservar ECN. Eliminar a disputa entre `skb->priority` imposto pelo ARK e DSCP restaurado; não apagar prioridades de terceiros sem verificar propriedade.
5. Usar classificação estável por fluxo para dados do jogo. Exceções de controle devem ser deliberadas, não resultado acidental de pacotes de 200 B e 650 B caírem em classes diferentes. Suportar IPv4/IPv6 e tratar fragmentos/cabeçalhos adicionais.
6. Instalar apenas filtros pertencentes ao ARK, com identificadores próprios, sem deletar indiscriminadamente preferências de terceiros. Aplicar regras nft em transação e preservar isolamento fw3/fw4.
7. Desligar gamer precisa remover toda a política que o produto diz controlar. Os dois motores devem demonstrar as classes suportadas com contadores efetivos.

Entrega proposta: Q04–Q06/Q10/Q11/Q15/Q16. Critério: CS1, AF41 e CS4 autorizados chegam às classes esperadas; WAN forjada fica no fallback; UDP desconhecido/VPN/bulk não invade a classe do jogo; nenhum filtro remove o redirect IFB.

### C. Baseline estático antes de Autorate

Manter um único motor por comparação e taxas estáticas inicialmente. CAKE é uma referência adequada quando há capacidade de CPU; isso não homologa a integração ARK atual. HFSC permanece alternativa após corrigir sua propriedade e validação de instalação.

Medir a capacidade sustentada do acesso, não inferi-la do plano ou de três números fabricados por fallback. Escolher margem inicial documentada e ajustar com vazão e atraso sob carga. Não fixar neste relatório 700/744 Mb/s ou qualquer taxa histórica como estado atual.

Autorate não deve entrar no experimento de jogo enquanto usar valores de carga/atraso substitutos. Sua futura implementação precisa coletor por WAN, tempo monotônico, refletores independentes, baseline RTT, histerese, ausência de amostra explícita e confirmação da taxa aplicada. É uma etapa separada; não é requisito para reduzir picos em acesso de capacidade estável.

### D. Instrumentação que mede o sintoma do usuário

O próximo experimento precisa registrar simultaneamente:

| Camada | Medida necessária | Interpretação e limite |
|---|---|---|
| Jogo no iPad | Ping exibido, horário dos picos, contexto da partida; FPS/temperatura quando disponíveis | É o sintoma principal; sem isso não há correlação com as coletas. |
| iPad/adaptador/cabo | Modelo, alimentação, link negociado, mudanças de carrier e erros | Cabo não elimina buffer/driver do adaptador. Registrar a topologia real. |
| LAN | RTT do próprio iPad ao gateway quando houver ferramenta que obtenha resposta válida | Router→iPad sem resposta é indisponível, não prova perda. Outro cliente cabeado serve de controle, mas não mede o adaptador do iPad. |
| Roteador | `tc -s -d`/JSON quando suportado, backlog, drops, ECN, bytes e classe por direção; softirq por CPU | Ausente vira null; não selecionar só a tin Voice nem só médias suavizadas. |
| NICs | Contadores físicos, erros, drops, carrier, Pause Frames, fila/driver disponíveis | Coletar LAN e WAN. Não confundir contador de qdisc com perda fim a fim. |
| Acesso/Internet | RTT a destinos responsivos estáveis, com origem/rota corretas | Destino ICMP sem resposta não permite afirmar falha. Evitar usar somente um salto intermediário. |
| ExitLag | RTT até relay e dados do aplicativo para o caminho até o jogo, quando disponíveis | RTT do relay não é RTT até o jogo. Rotas múltiplas podem ter segmento comum. |
| Pacotes | Captura filtrada LAN/WAN, timestamps, tamanhos, tuple completa e sequências quando visíveis | Permite estimar permanência local e intervalos. Com payload cifrado, correspondência e perda podem permanecer inconclusivas. |

Preferir contadores cumulativos de `tc`/nft em pontos definidos; não interpretar contador conntrack zero-on-read como taxa cumulativa global. Se for necessário observar conntrack, registrar tupla completa, eventos de ciclo de vida e distinguir reset de contagem. Não desativar nlbwmon como pressuposto do diagnóstico.

Agregar métricas em janelas de aproximadamente 1 s; para sondas leves responsivas, avaliar 100–200 ms quando o alvo permitir. Coleta pesada como dumps de conntrack completos não deve rodar a essa frequência. Captura filtrada em ring buffer é mais adequada a microeventos que snapshots a cada 10 s; usar `/tmp` com limite e rotação, sem capturar payload/segredos além do necessário. Medir overhead do coletor.

Não conectar a um roteador físico só para preencher essa matriz sem a autorização exigida pelo workspace. A implementação do coletor deve nascer e ser validada na VM; instalação física é etapa posterior.

## Experimentos e decisões

### 1. Separar capacidade local e carga externa

Fazer testes comparáveis com motor, taxas, cabo e topologia fixos: ocioso, download saturado, upload saturado e ambos. Registrar p50/p95/p99, máximo e duração dos eventos, não só média ou nota A+. Incluir tráfego de aplicação em Best Effort, porque ping priorizado pode esconder congestionamento de dados.

### 2. Comparar ExitLag sem confundir variáveis

Usar sequência A/B/A: direto, ExitLag e direto novamente, com região/servidor e contexto tão próximos quanto o jogo permitir. Não mudar QoS, timeout e rota no mesmo passo. Se o servidor mudar, registrar e reduzir a força da comparação. Uma partida por condição é exploração; repetir antes de atribuir ganho causal.

Se só ExitLag piorar, investigar seleção/variação dos relays, política de redundância e trecho até o jogo. Se direto e ExitLag piorarem simultaneamente com as sondas de acesso, investigar segmento compartilhado. Se a LAN e os contadores locais também piorarem, priorizar o caminho local. Isso orienta hipóteses, não substitui medições.

### 3. Confirmar ou excluir o adaptador

Se picos se correlacionarem a LAN/carrier/erros, comparar outro cabo, porta e adaptador/alimentação, uma variável por vez. Se apenas o iPad apresentar o sintoma, um segundo cliente cabeado ajuda a separar acesso compartilhado e caminho específico; não reproduz automaticamente a sessão do jogo.

### Matriz de decisão

| Observação sincronizada | Próxima investigação |
|---|---|
| Ping do jogo e RTT iPad→gateway sobem juntos | Adaptador, porta/cabo, fila LAN, processamento do iPad/roteador. |
| LAN estável; backlog/atraso local cresce e pico depende de carga | Shaping, taxa/overhead, bypass de offload, CPU/softirq, qdisc efetivo. |
| LAN/filas estáveis; vários destinos externos pioram juntos | Acesso, ONT, uplink e rede da operadora; incluir erros físicos e carga. |
| Relays responsivos estáveis; só jogo piora | Trecho relay→servidor, servidor, protocolo ou processamento no cliente; ainda sem isolamento causal. |
| Somente um hop de traceroute não responde | Não atribuir perda sem persistência até o destino e correlação com a sessão. |
| Só contadores conntrack caem | Investigar polling/identidade da entrada; não aplicar correção de rede por esse evento isolado. |

## Ordem de entrega e aceite

1. **Observabilidade offline (esta etapa):** logs relidos, inferências corrigidas e analisador com campos ausentes/ambiguidade explícitos. Não houve modificação operacional.
2. **Correções locais do ARK:** lotes A e B, testes de falha e contratos atualizados. Não misturar mudança de arquitetura com tuning de CPU/BQL.
3. **VM identificada e snapshot:** testar fw3/fw4, PPPoE/IPoE, duas WANs, classificação bidirecional, perda/latência simuladas, toggles, restart e reboot. VirtualBox continua indisponível neste Mac; isso bloqueia homologação operacional, não a análise/design local.
4. **Coleta física autorizada:** baseline sincronizado com o ping do jogo e topologia do iPad. Não reaplicar automaticamente ajustes descritos no texto anexado.
5. **Aplicação física autorizada e comparação:** backup e plano de retorno; confirmar motor/filas após aplicar; A/B controlado e restauração caso piore.

Sucesso exige reduzir frequência/duração e percentis dos picos **do jogo**, mantendo vazão e justiça aceitáveis, com limite de banda/CPU documentado. O alvo exato deve ser definido a partir da sessão e região; não prometer 14 ms ou zero perda. Filas locais de 1 µs e uma marca CS4 não são critérios suficientes de conclusão.

## Validação desta etapa

O analisador é local e não conecta à rede. Sete verificações isoladas aprovadas: campo vazio permanece ausente, valor numérico continua distinguível, queda de contador não vira desconexão, endpoints anonimizados, entrada vazia, múltiplos fluxos por endpoint e ausência de endpoint sem inferir perda. Sequências dos três logs verificadas: 60, 60 e 30 amostras em ordem.

`tests/run_local_tests.sh` foi executado e terminou com código 1 na verificação de sincronismo de `docs/CODE_MAP.md`, arquivo já modificado antes desta revisão. Antes desse ponto passaram auditoria shell, sintaxe JS/bundle, WAN 35/35, multicore 11/11, cenários Lite/Full 4/4, interferência 13/13, contratos 74, preservação de estado, i18n e documentação. A etapa de minificação não foi alcançada. O gerador só consulta fontes de runtime; os helpers em `docs/audit/evidence/` não são entradas dele. Não sobrescrever o mapa preexistente para ocultar o resultado. Esta execução não inclui a suíte separada `test_hardware_tune.py`, cujas três falhas constam no lote 005.

Nenhuma UI foi alterada; screenshot/console não se aplicam. Não há confirmação de hardware nem de causa-raiz dos picos nesta etapa. O resultado é uma solução de engenharia definida para implementação e validação, com as incertezas expostas.
