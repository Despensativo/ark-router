# Lote 027 — análise dos logs disponíveis do W6x

Inspeção física somente leitura em 06/11/2026, aproximadamente 01:07–01:12, fuso America/Sao_Paulo. Alvo `192.168.73.1`, board `acer,predator-w6x-stock`, mesmo boot `948e10dd-199e-476a-8b17-d427a12ac250` dos testes anteriores. Nenhum restart, mudança de UCI/QoS, limpeza de logs, reprodução de crash ou reparo.

## Cobertura e limites

- Snapshot de `logread`: **3.363 linhas**, incluindo mensagens do kernel, rede, Wi-Fi, ARK e autenticação; primeiro horário exibido 05/11 20:00:10, último 06/11 01:07:47. O buffer continua recebendo mensagens, inclusive SSH desta inspeção.
- `dmesg`: **409 linhas**, sobrepostas em parte ao logread; não somar como eventos distintos.
- Pstore: `Oops#1 Part1` e `Panic#2 Part1`, **76/77 linhas**, com o mesmo instante de falha e grande sobreposição. Não demonstram dois incidentes independentes.
- Doctor: 14 linhas; logs temporários dos ensaios QoS/LED encontrados em `/tmp`, inclusive os vazios. `lastlog` e `wtmp` vazios. `/var/log` aponta para os mesmos arquivos disponíveis em `/tmp/log`; não duplicar.
- Inventário em `/tmp` até quatro níveis e `/root`, `/etc`, `/mnt` até três, além de `/sys/fs/pstore`. Não foi encontrado outro arquivo de log nesses recortes. `log_file` não configurado, buffer configurado de 2.048 KiB, sem destino remoto de syslog.

Isso cobre as fontes disponíveis/localizadas, não todo o histórico que já existiu antes de reinicializações ou rotação. O início do log usa horário anterior à sincronização: relógio/uptime não sustentam subtrair diretamente os horários iniciais. Periodicidade física foi calculada pelo tempo monotônico do kernel.

IPs, MACs, SSIDs, fingerprints de chaves e quadros Wi-Fi foram removidos ou pseudonimizados antes de disponibilizar a evidência. Não há mapa dos identificadores originais salvo. [Inventário](../evidence/027-router-logs/inventory.json) e [análise numérica](../evidence/027-router-logs/analysis.json).

## 1. Crash antigo: sequência SPI/LED → Oops → panic

Nos dois fragmentos preservados, em tempo de kernel próximo de **162.989–162.990 s do boot anterior**:

1. `leds_ws2812b spi1.0: SPI transfer timed out`;
2. falhas de transferência SPI e de brilho do LED, retorno `-110`;
3. tentativa de escrita inválida, `Internal error: Oops`;
4. contexto `irq/118-1100b00`, kernel 6.12.112, endereços de PC/LR sem nomes de função;
5. `Kernel panic - not syncing: Oops: Fatal exception` no fragmento de panic.

Há também erro `ramoops ... (-28)` ao preservar o crash. Esse registro pertence ao backend de pstore; não demonstra que o overlay esteja cheio. O overlay atual tem aproximadamente **46 MiB disponíveis**, 17% ocupado, e `/tmp` está abaixo de 1%.

**Conclusão:** crash real preservado e forte associação temporal com SPI/LED. Não é prova suficiente da linha de código causadora; exige kernel/vmlinux com símbolos da mesma compilação e investigação do driver/IRQ. Não reproduzido nesta inspeção. Nenhum novo panic/Oops/OOM foi encontrado no `dmesg` do boot atual. A correção anterior do ciclo de parada do daemon não equivale a uma correção comprovada desse panic. [Fragmento](../evidence/027-router-logs/sys__fs__pstore__dmesg-ramoops-1.txt).

## 2. Porta LAN1: dez ciclos físicos a 100 Mb/s

O kernel atual registra **10 Link Up e 10 Link Down em lan1**. Todos os ups registrados são 100 Mb/s full duplex. Após os eventos iniciais irregulares, os intervalos entre ups ficam em aproximadamente **1.801–1.802 s**, cerca de 30 minutos; vários períodos ativos duram somente 32–35 s. O pstore antigo também mostra ciclos semelhantes.

Na consulta atual: lan1 sem carrier; lan2/lan3 a 1 Gb/s, WAN eth1 a 2,5 Gb/s. LAN2 tem transição durante inicialização, mas não a repetição posterior observada na LAN1.

**Conclusão:** padrão físico real e recorrente em uma porta específica. Pode ser equipamento conectado que acorda/desliga periodicamente, cabo, negociação ou porta; os logs não separam esses candidatos. Não demonstra defeito da LAN inteira nem explica automaticamente as pausas WAN de ~93 s do lote 026. Próximo passo: identificar o dispositivo/cabo da LAN1 e observar se o ciclo acompanha esse conjunto em outra porta, com autorização para a alteração física.

## 3. SQM: 27 remoções de filtro ausente, sem prova de falha do shaper

Há **27 comandos de remoção falhos**, cada um acompanhado de outra linha com o erro do kernel: **54 mensagens**, e não 54 incidentes. São três grupos de nove preferências (1 a 9), às 21:28:50, 23:19:33 e 01:03:00 nos horários exibidos, durante configuração HFSC.

Mecanismo confirmado no código: `ark_qos_ingress_policy()` em `root/usr/lib/ark/qos-ingress.sh` tenta apagar as preferências 1–9 e aceita ausência com `|| true`. No runtime, `$TC` passa pelo wrapper SQM, que captura stderr e registra o erro antes de devolver o retorno. Portanto, `2>/dev/null` no chamador não elimina a mensagem emitida pelo wrapper. O runtime oferece `SILENT=1` para falhas esperadas; não foi aplicado patch nesta tarefa.

Na leitura atual há uma raiz **HFSC e três FQ-CoDel por direção**, além do ingress na WAN. Preferências ingress presentes: **2, 3, 4, 5 e 10**, compatíveis com saneamento/classificação e redirecionamento instalados; preferência 1 removida intencionalmente após instalação. Isso não é teste de prioridade em jogo, mas contradiz interpretar as mensagens de remoção como prova de QoS ausente.

**Conclusão:** ruído de diagnóstico confirmado em uma limpeza idempotente. Candidato a correção pequena do nível de log/silenciamento apenas dessas ausências esperadas, preservando falhas reais de instalação. Não explica por si as notas C ou as pausas externas.

## 4. WAN/PPPoE: falha de descoberta no início, sem reconexões recorrentes registradas

Dois `Timeout waiting for PADO packets` emitidos pelo pppd, duplicados pelo netifd, com falha de Discovery phase 1. Depois há conexão e autenticação CHAP bem-sucedida, seguida de WAN up. Os horários exibidos são de inicialização, anteriores à correção do relógio.

Após essa conexão, o recorte não mostra novas quedas de sessão PPPoE, LCP timeout ou Link Down da eth1. A negociação MTU resultou em 1492 bytes, registrada pelo ARK. Isso **não prova ausência de perda/pausas de pacotes**: a bateria anterior mediu interrupções externas sem derrubar a sessão. Os logs presentes não localizam o defeito entre W6x, ONT e operadora.

## 5. Wi-Fi/steering: 178 respostas sem candidato adequado

Foram encontradas **178 respostas BSS-TM com status 7**. A definição primária do hostap identifica esse código como `WNM_BSS_TM_REJECT_NO_SUITABLE_CANDIDATES`: cliente recusou a sugestão de transição por falta de candidato adequado. [Definição upstream](https://w1.fi/cgit/hostap/plain/src/common/ieee802_11_defs.h).

É uma indicação para revisar candidatos/limiares/periodicidade do steering e a situação de sinal dos clientes. A recusa não equivale a queda de conexão. Há handshakes RSN concluídos, conexões e desautenticações por inatividade; não foi encontrado crash/reset do firmware Wi-Fi ou erro de senha recorrente no recorte. A quantidade de respostas não mede vazão ou qualidade de rádio. Nenhuma configuração wireless foi alterada.

## 6. Alertas de inicialização e serviços

| Registro | Interpretação sustentada |
|---|---|
| Duas mensagens `generated random MAC address` e `legacy DT: missing interrupt-names` | Merece conferir device tree/NVMEM e endereçamento efetivo no boot. Não foi mudado MAC nem provada relação com PPPoE. |
| `fstab: Entry not found` / sem configuração utilizável | Ausência de configuração de montagem; isoladamente não indica corrupção do armazenamento. |
| MTD u-boot-env em NAND, overlay lower sem UUID, módulos out-of-tree | Avisos de plataforma/compatibilidade no boot, sem erro de I/O ou OOM associado encontrado. Módulo out-of-tree não é por si indício de ataque. |
| MiniUPnP STUN falhou no começo | Ocorre antes da WAN estabelecida; serviço está rodando na consulta posterior. Funcionamento de mapeamentos não testado. |
| Mwan3 hotplug antes da configuração | Alertas durante inicialização; daemon atual rodando. Failover não validado por isso. |
| Dois `procd: Got unexpected signal 1` | Isolados na inicialização; causa/efeito não separados pelos logs disponíveis. Sem repetição contínua posterior encontrada. |
| Doctor: DoH ainda não rodando no primeiro audit | Um WARN inicial, seguido de seis audits OK. `https-dns-proxy` atual rodando. Doctor OK não homologa ausência de pausas WAN. |

Autenticação: predominam acessos SSH por chave e encerramentos normais, incluindo as coletas desta sessão; há dois logins LuCI aceitos. Não apareceu sequência de senhas falhas/brute force no recorte. Isso não é auditoria completa de exposição ou garantia de ausência de comprometimento.

## Estado e prioridades

Consulta às 01:09 mostrou **HFSC + FQ-CoDel ativo**, com árvores e filtros acima presentes. O log registra nova seleção HFSC às 01:03, após o encerramento da bateria anterior. Esta inspeção não selecionou motor e não atribui a autoria dessa mudança apenas pela proximidade de um login.

Prioridades: (1) simbolizar/investigar o panic SPI/LED preservado; (2) identificar o conjunto conectado à LAN1 e separar a pausa WAN por captura em pontos distintos; (3) revisar os candidatos de roaming e reduzir ruído de limpeza SQM sem esconder falhas; (4) conferir avisos de device tree/MAC no próximo diagnóstico de boot. Nenhuma dessas hipóteses foi tratada como correção concluída.

Evidência é de hardware real e inspeção de código, sem VM/mock ou novo teste de carga. [Logs sanitizados e manifest](../evidence/027-router-logs/). Inspeção em modo de leitura, sem comandos para alterar configuração; sem commit/push/publicação.
