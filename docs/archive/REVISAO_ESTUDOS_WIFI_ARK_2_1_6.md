# Revisão dos estudos de Wi-Fi e latência após as alterações do ARK 2.1.6

Data: 29/10/2026. Escopo: reavaliação documental, inspeção estática e testes locais existentes. Nenhuma alteração funcional, instalação ou acesso ao roteador físico.

> **Coleta posterior no mesmo dia:** o [diagnóstico instrumentado T-072](DIAGNOSTICO_W6X_MONITORADO_2026_10_29.md) confirmou ao vivo OpenWrt 25.12.6/kernel 6.12.112/ARK 2.1.6, CAKE download 700M/upload 744M, flow offload 0/0 e GRO/GSO ativos. As incertezas de execução abaixo descrevem o escopo desta revisão anterior; usar o diagnóstico para os fatos posteriormente medidos.

## 1. Base analisada e limites

- Estudo original: fonte `c4b8831b`, ARK 2.1.4, OpenWrt 25.12.5 informado pelo usuário, link nominal 800 Mb/s em cada direção.
- Revisão atual: HEAD `bc68981e531750ba39bfcee65f757a5f9b5cb8b5`, `VERSION=2.1.6`.
- Alterações locais preexistentes preservadas: `root/usr/lib/ark/modules/doctor.sh`, `root/usr/lib/ark/modules/wifi.sh`, `tests/test_wifi_hostapd_safety.py`.
- O `TASK.md` do workspace registra W6x com OpenWrt 25.12.6, kernel 6.12.112 e CAKE 700M/744M. É **registro documental**, não leitura ao vivo desta sessão. A ordem desses dois valores e as taxas efetivas ainda precisam ser verificadas no SQM.
- `AGENTS.md` ainda declara versão 2.1.5, enquanto `docs/audit/STATUS.md` mantém um checkpoint estrutural antigo. Não usar esses números como versão efetiva do pacote.

Resultado principal: **a estrutura dos estudos continua válida, mas os valores AQL e o estado de implementação ficaram desatualizados. As otimizações TCP/DNS novas têm alcance mais limitado do que algumas afirmações do estudo de transporte sugerem.**

## 2. O que continua válido e o que mudou

| Tema anterior | Veredito atual | Orientação |
|---|---|---|
| Separar fila WAN de fila Wi-Fi | Válido | Continuar medindo Ethernet, Wi-Fi local e internet separadamente |
| W6x dual band, sem 6 GHz/MLO | Válido | Desconsiderar receitas Wi-Fi 7/QSDK para esse aparelho |
| HE80 versus HE160 para link de 800 Mb/s | Válido, depende de RF/cliente | Comparar capacidade útil e p99, não só PHY |
| CAKE e isolamento por host/fluxo | Válido | Conferir percurso, IFB, taxa e CPU |
| 760/760 como referência inicial | Heurística, não configuração atual | Não substituir a configuração documentada de 700M/744M sem medição |
| AQL 1500/2500 com threshold 2000, não commitado | **Desatualizado** | O código agora usa threshold 12000 em 5 GHz e está versionado |
| WED solicitado versus inicializado versus usado | Válido, pendência permanece | Status Y não prova fluxo acelerado nem compatibilidade com SQM |
| BBR/TFO/16 KB eliminam bufferbloat dos clientes | **Não sustentado** | Afetam transporte TCP local; não substituem CAKE/AQL |
| DNS stale melhora resolução/resiliência | Válido com compromisso | Não reduz RTT de uma sessão já estabelecida |
| Roaming sem interrupção garantida | **Não sustentado como regra** | Cliente, candidato, versão e políticas determinam a transição |
| Ping baixo prova rede toda estável | Inválido | ICMP é priorizado pelo ARK; medir também tráfego comum |

## 3. AQL atual: a mudança que afeta diretamente filas de Wi-Fi

`root/etc/init.d/ark-hardware-tune`, função `ark_tune_wifi_aql()`, linhas 88–132 na revisão analisada:

| Banda | Categoria | Low/high (µs) | Threshold do PHY (µs) |
|---|---|---:|---:|
| 5 GHz | VO | 1000/2000 | 12000 |
| 5 GHz | VI | 1500/2500 | 12000 |
| 5 GHz | BE | 1500/2500 | 12000 |
| 5 GHz | BK | 1000/2000 | 12000 |
| 2,4 GHz | BE | 2000/4000 | 15000 |

Nos dois ramos, o script tenta configurar `fq_limit=1024` e `fq_memory_limit=4194304` por PHY.

O perfil atual combina limites por estação/categoria menores com threshold agregado maior. É uma hipótese coerente para equilibrar paralelismo e filas, mas não comprova resolução universal de problemas de Doze ou latência abaixo de 5 ms.

**Correção conceitual:** `aql_threshold=12000` não é um teto rígido de airtime total, nem de RTT. Na lógica mac80211, o threshold participa da decisão entre low e high; o limite baixo pode permitir novas transmissões por estação/categoria mesmo quando o agregado já ultrapassou o threshold. [Referência mac80211](https://raw.githubusercontent.com/torvalds/linux/v6.12/net/mac80211/tx.c).

Logo, a tarefa registrada como “teto global desacoplado” não deve ser interpretada como garantia de fila máxima de 12 ms. O cálculo também não inclui todo o atraso de acesso ao meio, retransmissões, cliente e caminho externo.

**O que fazer com a recomendação anterior:** considerar o perfil atual como um candidato completo. Compará-lo ao padrão efetivo do driver; não reaplicar o antigo threshold 2000 como se fosse a configuração atual. Não modificar AQL e FQ juntos quando o objetivo for atribuir causalidade.

Persistem as limitações da inspeção anterior: associação presumida `phyN`↔`radioN`, tolerância silenciosa a falha de escrita e necessidade de ler valores/atividade depois do boot e dos serviços.

## 4. BBR, TFO, 16 KB e ECN: separar transporte local de encaminhamento

### 4.1. Benefício possível e alcance real

`ark_tune_tcp_stack()` foi adicionado e é chamado no início do auto-tune. Configura TFO, low-watermark de bytes não enviados, janelas/timestamps, ECN e BBR quando disponível.

| Ajuste novo | Alcance defensável | Afirmação que precisa ser abandonada |
|---|---|---|
| `tcp_congestion_control=bbr` | Novos sockets TCP locais, salvo escolha por socket/listener | Que o celular/PC passou a usar BBR por atravessar o W6x |
| `tcp_notsent_lowat=16384` | Backpressure de escrita TCP local | Que toda fila da rede caiu para 16 KB ou que VPN/DoH ficou abaixo de 1 ms |
| `tcp_fastopen=3` | Permite TFO a aplicações TCP compatíveis | Que todo LuCI, túnel ou navegador encaminhado usa dados no SYN |
| `tcp_ecn=2` | Aceita ECN em conexões entrantes e não o solicita por padrão nas saídas locais | Que ativa ECN de todos os clientes ou equivale a L4S |

Fonte técnica: [documentação TCP do Linux 6.12](https://raw.githubusercontent.com/torvalds/linux/v6.12/Documentation/networking/ip-sysctl.rst). A presença de um sysctl não comprova uso pela aplicação.

WireGuard transporta mensagens em UDP; BBR é TCP. Não cabe atribuir melhora direta do transporte WireGuard à seleção global de BBR. OpenVPN em TCP e conexões TCP locais exigem análise diferente; TCP interno apenas encaminhado continua pertencendo aos endpoints. [Protocolo WireGuard](https://www.wireguard.com/protocol/).

### 4.2. Pontos concretos de implementação/documentação

- O comentário local afirma fallback TFO automático. A documentação Linux 6.12 informa que `tcp_fastopen_blackhole_timeout_sec` tem default zero, desabilitando esse mecanismo. O ARK não o ajusta na função nova. Conferir o valor efetivo antes de afirmar proteção ativa.
- O backend `network_capacity_save()` aceita uma sexta opção `tcp_cc` e altera o sysctl em execução. Não grava essa escolha em configuração persistente própria nesse caminho.
- O frontend modular consultado (`src/modules/doctor_perf.js:701`) envia só os cinco argumentos anteriores, sem `tcp_cc`; não há seletor TCP demonstrado nesse fluxo da fonte.
- No boot/reload do auto-tune, `ark_tune_tcp_stack()` escolhe BBR sempre que disponível. Uma escolha diferente aplicada pelo backend pode ser substituída. Não confundir isso com escolha do usuário preservada.
- A função nova não captura estado anterior para restauração. Não há rotina `stop()`/restore específica no serviço consultado que reverta esses sysctls.

Esses são achados estáticos. Não foi reproduzido reboot nem alterada a configuração do hospedeiro ou roteador para testá-los. A discussão de TFO/fallback também consta na [documentação atual do kernel](https://docs.kernel.org/networking/ip-sysctl.html).

### 4.3. Ark Doctor não comprova desempenho

O check novo, `doctor.sh:2107`, reporta `OK` tanto para transporte “otimizado” quanto para padrão. O rótulo otimizado usa condição **OU**: `notsent=16384` ou algoritmo BBR.

O check não mede filas, não demonstra TFO negociado, não verifica latência de VPN e não homologa bufferbloat. “Doctor 100% OK” pode ser um inventário saudável, mas não substitui teste de carga.

## 5. DNS stale: mecanismo válido, promessa de ping zero inválida

O instalador agora detecta `use-stale-cache` e acrescenta `use-stale-cache=3600` em `extraconftext`, preservando o texto anterior. A tag OpenWrt 25.12.6 possui suporte a essa chave para gerar configuração adicional do dnsmasq; logo, não é correto descartar a opção UCI como inexistente. [Init oficial dnsmasq](https://raw.githubusercontent.com/openwrt/openwrt/v25.12.6/package/network/services/dnsmasq/files/dnsmasq.init).

O mecanismo pode responder com dado expirado e buscar atualização, tolerando até uma hora além do TTL nesse ajuste. O compromisso é servir eventualmente endereço desatualizado e mudar a utilização do cache. [Manual dnsmasq](https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html).

Isso favorece resolução/resiliência, não reduz RTT do rádio ou da sessão após conexão. “0 ms” deve ser entendido, quando medido e arredondado, como resultado local de resolução; não é latência literalmente nula.

Como está em `uci-defaults`, a efetivação depende também do fluxo de instalação/upgrade. Exigir leitura da configuração gerada e ensaio de TTL/atualização, não apenas existência do bloco no pacote. Não foi confirmado que o procedimento rodou no W6x.

## 6. UDP GRO: candidato de CPU com observabilidade incompleta

O perfil High-Spec do W6x agora tenta ativar `rx-udp-gro-forwarding` em interfaces `eth*|lan*`. Isso pode reduzir trabalho por pacote em caminhos elegíveis; não atua como shaper nem garante menor jitter. [GRO/GSO no Linux](https://docs.kernel.org/networking/segmentation-offloads.html).

No JSON `network_capacity_status_json()`, `gro_supported=true` depende somente de encontrar o executável `ethtool`. Isso não confirma suporte por interface nem ativação da feature. As escritas do auto-tune também toleram erro.

Validação necessária: `ethtool -k` da interface efetiva, contadores, CPU/p99 com UDP e túneis, mantendo as demais variáveis estáveis. Não converter existência de ferramenta em badge de aceleração comprovada.

## 7. Roaming e potência: mudanças úteis, sem garantia universal

### 7.1. Estado atual

Wi-Fi/Doctor agora escrevem `roam_scan_snr=-74`, `roam_trigger_snr=-78`, `signal_diff_threshold=8`, `roam_kick_delay=60000`, `min_snr=0`, `load_kick_enabled=0` e `local_mode=1`.

As alterações locais ainda não commitadas condicionam também `ieee80211v` à detecção WNM, removendo a chave no outro ramo. Os testes de segurança passaram, mas são principalmente verificações estruturais; isso não prova que o pacote hostapd do alvo tenha todos os recursos nem que clientes migrem sem pausa.

### 7.2. Interpretação correta

O código upstream usteer tem máquina de estados de roaming, seleção de candidato e transições que dependem da agressividade do cliente/estado, incluindo BTM com `disassociation_imminent` em certos caminhos. Portanto, `min_snr=0` e `load_kick_enabled=0` não são prova universal de que toda transição seja apenas consultiva. A versão instalada não foi identificada; confirmar o código correspondente e os eventos antes de afirmar “zero chutes”. [Política usteer](https://raw.githubusercontent.com/openwrt/usteer/master/policy.c), [requisições BTM](https://raw.githubusercontent.com/openwrt/usteer/master/ubus.c).

Migrar para 2,4 GHz pode estabilizar cobertura, mas reduzir muito a capacidade para aquele cliente. Para o link de 800 Mb/s, decidir por throughput e p99 no local, não só sinal mais forte. Uma migração documentada de um telefone não homologa todos os clientes ou o cenário de jogos parado em 5 GHz.

`local_mode=1` também exige considerar quais nós o usteer conhece; não presumir coordenação completa entre vários APs pela simples instalação do daemon.

O assistente de satélite ganhou potência baixa/balanceada/máxima. “Máxima” remove a opção `txpower`, deixando o driver/domínio regulatório decidir; não significa watts fixos nem alcance irrestrito. Baixa potência pode reduzir sobreposição, mas também piorar enlace. Não aplicar perfis de satélite ao gateway W6x sem topologia e medições.

Mantém-se o ponto anterior: `wpa_group_rekey=0`, `twt_responder=0` e opções HE precisam de análise própria de segurança/compatibilidade. Não são receitas universais de redução de bufferbloat.

## 8. Pendências antigas que as novas versões ainda não encerram

Não houve mudança desde `c4b8831b` no módulo `sqm.sh` nem no arquivo `15-ark-dscp-priority.nft` na comparação feita. Assim:

1. **WED:** toggle e status continuam baseados no parâmetro do módulo; comprovar dispositivo e fluxos continua necessário.
2. **CAKE:** conferir caminho e contadores continua essencial, mesmo com políticas de exclusão de flow offload no código.
3. **ICMP priorizado:** os pings continuam podendo receber tratamento diferente do tráfego comum.
4. **Overhead, RAM e `rtt 50ms`:** continuam hipóteses/configurações a validar por cenário, sem teto de desempenho garantido.
5. **HE80/HE160:** continua uma decisão de RF e cliente, não algo resolvido por BBR/DNS.
6. **CPU por núcleo:** carga de 800/800 simultâneos continua exigindo teste; memória de 1 GB não garante escalabilidade do shaper.

## 9. Revalidação externa da release registrada

Na tag `v25.12.6`, o pacote mt76 referencia o mesmo commit de fonte do estudo anterior (`39c960c3ada558b4c2e7915772483d3731573d09`), mas `PKG_RELEASE` passou a 3. O mac80211 passa a backports **6.18.55**, release 2. Isso mantém o fundamento geral de suporte mt76/AQL, mas invalida tratar 6.18.26 como identificação atual da pilha registrada. Patches da embalagem e binários instalados ainda precisam de conferência. [mt76 25.12.6](https://raw.githubusercontent.com/openwrt/openwrt/v25.12.6/package/kernel/mt76/Makefile), [mac80211 25.12.6](https://raw.githubusercontent.com/openwrt/openwrt/v25.12.6/package/kernel/mac80211/Makefile).

## 10. Verificações realizadas e o que não demonstram

| Verificação nesta sessão | Resultado | Limite |
|---|---|---|
| Histórico/diff desde `c4b8831b`, fontes e chamadores citados | Revisados | Inspeção, sem estado de execução do W6x |
| Sintaxe `sh -n` de tune, DHCP sanitize, Wi-Fi, Doctor e SQM | Passou | Não comprova semântica BusyBox/kernel |
| `test_wifi_hostapd_safety.py` | 5/5 passaram | Estrutura e fixtures locais; sem hostapd/radio real |
| `test_hardware_tune.py` | 8/8 passaram | Sandbox/mocks; não exercita integralmente a nova rotina TCP/AQL no driver |
| VM e RF/hardware | Não executados | Nenhuma homologação de p99, reboot, WED, roaming ou 800/800 |
| UI/screenshot | Não se aplica | Nenhuma UI foi modificada nesta revisão |

Os 13 testes aprovados não validam as promessas de “<1 ms”, “<5 ms”, “zero-drop” ou todas as transições sem desconexão.

## 11. Prioridades revisadas

1. Ler estado efetivo do W6x em futura coleta: versões, canal/largura, cliente, AQL/AQM, qdiscs/IFB, WED, offload, CPU e DSCP.
2. Usar a configuração atual como referência e medir cabo/Wi-Fi local/internet; não reaplicar presets históricos.
3. Confirmar os valores documentados de CAKE e manter upload/download separados; não impor novamente 760/760.
4. Comparar o perfil AQL atual contra padrão do driver com um e vários clientes, incluindo cliente adormecido/fraco, p99 e vazão.
5. Testar roaming como cenário próprio; a calibração estacionária deve fixar BSSID e evitar scans.
6. Avaliar BBR/TFO/DNS em testes de serviços locais e separar esses resultados dos de tráfego encaminhado.
7. Antes de implementar correções, decidir propriedade/persistência da seleção TCP e melhorar observabilidade de GRO/WED; não mudar silenciosamente padrões.

**Decisão:** manter a metodologia e a arquitetura CAKE + AQL dos estudos; substituir os números históricos e restringir as promessas de transporte/roaming ao alcance demonstrável. Nenhuma nova medição encontrada nesta sessão permite declarar bufferbloat universalmente eliminado.
