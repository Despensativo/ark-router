# Como testar ajustes de QoS sem perder o controle da comparação

Use este protocolo ao ajustar CAKE ou HFSC + FQ-CoDel. O teste deve partir de um **cliente Ethernet**, atravessando o roteador até a Internet. Registre motor, taxas, enquadramento, firmware, versão dos scripts e interface do cliente. Uma execução originada no roteador pode percorrer outro caminho e consumir a CPU que se pretende medir.

## 1. Preparar e medir o controle

1. Identifique o equipamento e a rota efetiva do cliente. Verifique link Ethernet, VPN/relay e outros consumidores de banda. Registre tráfego concorrente que não puder interromper.
2. Preserve os arquivos de configuração necessários **privadamente**, com permissões restritas, antes de trocar o motor. Não versione backups contendo senhas ou tokens. Guarde também hashes e opções TC, que permitem conferir a restauração.
3. Comece a coleta antes da carga. Reserve pelo menos **três minutos ociosos**: eventos periódicos do caminho externo também precisam aparecer no controle.
4. Teste primeiro a configuração atual. Mude **uma variável por vez**; ao comparar motores, mantenha taxas, perfil de WAN e enquadramento. Os perfis CAKE/HFSC também diferem em classificação/AQM: a comparação não isola somente o escalonador.
5. Uma troca recria filas e pode interromper tráfego brevemente. Prepare retorno temporizado com verificação do hash esperado e do estado original. Não restaure um backup antigo sobre alterações concorrentes do usuário.

## 2. Coletor Python reutilizável no Mac/Linux

`scripts/qos_benchmark.py` utiliza somente a biblioteca padrão do Python, SSH, ping e os utilitários nativos já existentes no roteador. O coletor **não altera SQM, firewall, taxas, offload ou serviços**. Não instala Python no OpenWrt. A autenticação é por chave SSH já configurada, com host key verificada; não recebe senha por argumento.

Execute a partir da raiz do repositório, em um terminal dedicado. Os nomes de interface e board abaixo são do W6x desta investigação; adapte-os ao alvo real.

```sh
python3 scripts/qos_benchmark.py monitor \
  --router 192.168.73.1 \
  --known-hosts "$HOME/.ssh/known_hosts" \
  --expected-board acer,predator-w6x-stock \
  --interface en6 --wan pppoe-wan --ifb ifb4pppoe-wan \
  --interval 1 --duration 3600 --out /tmp/ark-qos-ensaio-01
```

Use um diretório novo por sessão. A coleta registra CPU por núcleo, memória, contadores softnet, filas reais das duas direções, erros/drops/carrier físicos e sondas ICMP para LAN/dois destinos externos. Uma sonda TCP adicional mede a conexão à porta 443 de `www.apple.com` (configurável por `--tcp-host`). O destino TCP é resolvido uma vez em IPv4 antes da coleta, evitando misturar resolução DNS e fallback IPv6 em cada amostra. Essa conexão não mede uma transação HTTP completa nem reproduz o protocolo do jogo.

Em outro terminal, delimite cada teste imediatamente antes de clicar em iniciar e depois de aparecer o resultado:

```sh
python3 scripts/qos_benchmark.py mark start CAKE-waveform-1 --out /tmp/ark-qos-ensaio-01
# Executar e aguardar o resultado no navegador/aplicativo.
python3 scripts/qos_benchmark.py mark end CAKE-waveform-1 --out /tmp/ark-qos-ensaio-01
```

As janelas delimitadas incluem eventual tempo de interação. Para relacionar um pico com uma fase exata, acrescente marcadores de fase ou exporte as amostras do teste; não apresente a janela inteira como fase de upload.

### Triagem rápida sem interface gráfica no macOS

```sh
python3 scripts/qos_benchmark.py quick \
  --interface en6 --label CAKE-triagem --repeat 3 --max-seconds 45 \
  --out /tmp/ark-qos-ensaio-01
```

O comando executa o **networkQuality nativo da Apple**, por padrão com upload/download simultâneos. `--max-seconds` é um limite; o teste adaptativo pode terminar antes. Ele guarda vazão, responsividade/RPM e tempos numéricos, sem copiar URLs/IPs de servidor ou campos textuais desconhecidos. **RPM não é uma nota A+** e esta triagem não substitui a bateria final. Não execute outra carga ao mesmo tempo.

Código de saída zero do processo não basta: `error_code` interno deve indicar sucesso e as duas vazões precisam existir. O coletor marca dados incompletos como inválidos e retorna falha. Se a telemetria SSH termina inesperadamente, ele encerra a coleta e retorna falha; `quick` interrompe sua carga e não inicia as repetições restantes.

**Interrompa a bateria diante de reboot, perda da LAN ou kernel panic.** Preserve o pstore antes de qualquer reboot manual, registre a janela e investigue o subsistema indicado. Não transforme ausência de respostas durante uma reinicialização em “bufferbloat”. Nesta investigação de 05/11/2026, uma carga networkQuality coincidiu com panic no caminho SPI/LED WS2812B; essa carga foi suspensa no W6x até o diagnóstico do driver. Não a apresente como triagem já homologada para esse equipamento.

No Linux, delimite uma carga de `iperf3` ou Flent com `mark`. O servidor de teste deve estar sob seu controle ou autorizar esse uso, e estar além da WAN para medir o gargalo correto. Um iperf entre dois clientes LAN não valida bufferbloat da Internet. Não use upload estimado como se fosse medido.

## 3. Bateria final: três repetições de cada ferramenta

Execute uma ferramenta por vez, com intervalo ocioso entre rodadas. A ordem pode ser Waveform → Cloudflare → FAST → BufferSpeed web → BufferSpeed app, repetida três vezes. Mantenha o mesmo cliente e configurações das ferramentas. Registre todas as tentativas; uma falha não pode desaparecer do relatório porque a repetição seguinte foi boa.

| Ferramenta | Evidência a guardar | Interpretação |
|---|---|---|
| [Waveform](https://www.waveform.com/tools/bufferbloat) | Nota, link do resultado, CSV, média/P95/máximo em repouso e nas duas direções | A+ deve ocorrer nas três repetições para passar o critério de nota deste site; inspecione também os picos |
| [Cloudflare](https://speed.cloudflare.com/) | Vazão, perda e detalhes de latência: média, mediana e máximo | Não invente equivalência A+; a mediana baixa pode ocultar um pico de segundos |
| [FAST.com](https://fast.com/pt/) | Download, upload concluído, latência não carregada/carregada e captura | O valor carregado é agregado; não fornece aqui o máximo de cada direção |
| [BufferSpeed web](https://bufferspeed.com/) | Nota, latências de cada fase, carga combinada, vazões, fluxos, servidor e captura sem identificação pessoal | Confirme que é um resultado novo e que todas as fases terminaram |
| BufferSpeed instalado no cliente | Os mesmos campos disponíveis, versão do app e captura do resultado | Testar o app separadamente ajuda a distinguir limitação específica do navegador; não prova sozinho onde está o defeito |

Não acione botões de correção automática das ferramentas durante uma comparação. Use o resultado para escolher a próxima hipótese, preservando o controle.

## 4. Aceite e localização do gargalo

**Meta solicitada: A+ em todas as repetições das ferramentas que fornecem essa nota.** Uma única nota menor reprova a estabilidade daquela configuração na bateria. Não basta selecionar a melhor tentativa. Um pico durante o repouso pode inflar a média de referência e produzir A+ mesmo com indisponibilidade: inspecione também máximos/P95 do repouso e as sondas independentes. Valores impossíveis, como RTT negativo, devem ser preservados como limitação da ferramenta, sem interpretação física. Nenhuma quantidade finita de testes garante A+ em todos os momentos futuros; serviços e caminhos externos também variam.

Para ferramentas sem nota, registre os números e estabeleça o limiar antes da comparação. Uma política local conservadora pode exigir aumento médio de até 5 ms por direção/carga combinada, P95 sem regressão, sem interrupções recorrentes e vazão suficiente para os tetos. Identifique isso como **critério ARK**, nunca como nota atribuída pelo site. Não aceite apenas reduzir a taxa até uma carga deixar de saturar.

| Padrão observado | Investigação sustentada e próximo teste |
|---|---|
| RTT LAN sobe junto | Cliente/NIC/driver/LAN ou CPU do roteador; comparar outro cliente cabeado e verificar erros/carrier |
| Núcleo próximo de 100%, softnet cresce e vazão estaciona | Limite de processamento candidato; comparar mesma carga/taxa e opções de segmentação, uma por vez |
| Backlog/atraso das filas cresce com carga perto do teto | Shaping/AQM candidato; reduzir uma direção moderadamente e repetir controle, sem alterar outras opções |
| RTT/perda externa piora com filas baixas, inclusive ocioso | Caminho WAN/acesso/servidor candidato; cruzar dois destinos, TCP e pontos LAN/PPP/Ethernet; não atribuir automaticamente ao ISP |
| Só um site/navegador falha, app e destinos independentes estáveis | Investigar servidor, rota e cliente; não concluir que o roteador causa o pico somente pela nota |
| Vazão do site fica muito abaixo do teto configurado | Teste pode não saturar a direção; usar outra carga antes de aprovar a capacidade do SQM |

CPU e TC amostrados a cada segundo não capturam todos os eventos subsegundo. ICMP pode receber prioridade diferente de TCP/UDP. Drops de AQM são ações da fila e não devem ser somados à perda externa. Uma correlação gera hipótese; a causa exige experimento que separe os candidatos.

## 5. Encerrar, restaurar e documentar

1. Com a coleta ainda ativa, se trocou motor ou parâmetros, delimite a restauração com `mark` e restaure o estado original pelo procedimento preparado. Confira hashes e filas efetivas. Handles/contadores podem mudar após restart; opções e taxas devem voltar ao estado esperado. Uma diferença do hash nft precisa ser investigada; contagem de regras sozinha não comprova equivalência semântica.
2. Termine a coleta com **Ctrl+C** no terminal do monitor. O encerramento captura hashes/filas finais e encerra apenas o shell remoto identificado pelo token desta sessão. Há também duração máxima. O relatório ignora um último bloco de telemetria interrompido no meio da amostra.
3. Gere o resumo; também é possível gerá-lo durante a coleta, mas o relatório final deve conter a verificação de encerramento:

```sh
python3 scripts/qos_benchmark.py report --out /tmp/ark-qos-ensaio-01
```

Confira `all.qdisc_transitions` e `windows[].qdisc_transitions` no `summary.json`. O relatório registra hora, direção, motor, handle e teto antes/depois de uma troca. Uma janela que contém transição não serve para comparar notas ou latência como se o QoS estivesse fixo. A comparação entre janelas só vale quando motor, taxas e demais opções relevantes também coincidem; o coletor não atribui automaticamente quem mudou a configuração.

4. Guarde `summary.json`, medições e capturas sem IP público, conta, credenciais ou localização do cliente. Backups privados não entram no repositório. Registre ferramenta/versão, motor/taxas, horários, todas as notas e o que permanece inconclusivo.
5. Separe evidência local/mock/VM/hardware. Coletor e guia são ferramentas locais: não adicionam carga automática ao boot do roteador. Nenhum teste deste protocolo autoriza reboot, atualização de firmware, commit ou publicação.

Resultados reais de referência: [CAKE em três sites, lote 023](audit/batches/023-bufferbloat-three-sites.md) e [CAKE/HFSC, BufferSpeed app/web e triagem interrompida por panic, lote 024](audit/batches/024-qos-models-and-test-protocol.md).
