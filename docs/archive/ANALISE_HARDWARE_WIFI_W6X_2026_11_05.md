# Diagnóstico de hardware e Wi-Fi do ARK Router W6x

Data: 05/11/2026 (America/Sao_Paulo). Alvo: Acer Predator Connect W6x em `192.168.73.1`.
O diagnóstico inicial foi uma inspeção remota somente leitura. A aplicação solicitada depois pelo usuário está registrada ao final deste documento.

## Método e alcance da evidência

- SSH com chave do host verificada contra `known_hosts`; identidade obtida de `/tmp/sysinfo/model`, device tree, `uname`, UCI, hostapd efetivo, `iw`, debugfs mac80211/mt76/WED, `tc`, `ethtool` e sysfs.
- A leitura de estações compara contadores em 12 s. O survey do canal ativo compara 15 s. Essas janelas são fotografias do tráfego, não testes de capacidade ou de roaming.
- Saídas foram reduzidas a campos necessários. Senhas, chaves, SSIDs, MACs, endereços públicos e logs brutos não fazem parte deste registro.
- Não houve varredura ativa de canais, iperf de cliente Wi-Fi, mapa de cobertura, captura de pacotes, teste A/B, VM ou mock nesta tarefa. A VM não representa RF, alcance nem offload físico. O diagnóstico de latência Wi-Fi sob carga continua pendente.

## Hardware e caminho de dados

| Componente | Estado confirmado |
|---|---|
| Plataforma | MediaTek MT7986A, quatro CPUs ARM64, kernel 6.12.112, OpenWrt 25.12.6, pacote ARK 2.2.1-r1 |
| Memória | 1.010.036 kB totais; 726.796 kB disponíveis na leitura |
| Armazenamento overlay | 58,2 MiB; 46,2 MiB livres |
| Temperatura/carga | 53,1 °C; load average 0,16/0,10/0,09. Sem evidência de limitação térmica naquela leitura |
| Rádio | Dois PHYs `mt798x-wmac`, 2,4 e 5 GHz; ambos anunciam até quatro spatial streams HE MCS 0–11. O PHY de 5 GHz anuncia capacidade HE160 e MU beamformer; capacidade anunciada não comprova uso efetivo |
| Ethernet | `eth0` e `eth1` em 2,5 Gb/s full duplex; LAN2/LAN3 em 1 Gb/s full duplex na leitura |
| WED | `wed0` expõe anéis e contadores TX/RX; não foi medida a fração do tráfego de cada cliente que passa por WED/PPE |
| WAN/QoS | CAKE em PPPoE: 620 Mb/s upload e 720 Mb/s download; flow offload UCI 0/0. O teto da internet é compartilhado e distinto da capacidade Wi-Fi local |

Não há rádio de 6 GHz nem MLO em operação. O W6x observado é Wi-Fi 6 de duas bandas; opções e promessas de Wi-Fi 7 não se aplicam a estes PHYs.

## Configuração Wi-Fi antes da aplicação, conferida com hostapd e `iw`

| Tema | 2,4 GHz | 5 GHz |
|---|---|---|
| País/canal/largura | BR, canal 6, HE20 | BR, canal 149, HE80 (149–161), centro 5775 MHz |
| Potência indicada | 23 dBm | 27 dBm |
| APs | Um principal | Principal, convidados e backhaul oculto, todos ativos |
| Clientes associados | 19 | 7 no principal; zero em convidados e backhaul |
| Ocupação do canal ativo | 42,3% na amostra de 15 s; ruído −92 dBm | 6,0% na amostra de 15 s; ruído −92 dBm |
| Filas e justiça | AQL habilitado, limites por AC presentes, `airtime_mode=2`, flags TX/RX visíveis | Igual |
| Wi-Fi 6 | BSS color 8, SU beamformer/beamformee habilitados; MU beamformer desabilitado | Igual; HE160 suportado pelo PHY, porém HE80 ativo |
| QoS de rádio | WMM ativo, U-APSD anunciado, beacon 100 ms, DTIM 2 | Igual |
| Taxas legadas | AP anuncia taxas OFDM 6–54 Mb/s, básicas 6/12/24; não anuncia 802.11b como taxa básica | N/A |

O estado mudou desde o diagnóstico de 02/11: naquela leitura havia país PA, canal 11/HE20 em 2,4 GHz, canal 44/HE160 em 5 GHz e AQL desativado. Esta avaliação usa **o estado ao vivo de 05/11**, não trata o relatório antigo como configuração atual.

### Segurança, roaming e redes secundárias

- Principal em ambas as bandas: WPA2/WPA3 misto (`sae-mixed`), CCMP, PMF opcional, 802.11k e BSS transition/802.11v presentes no hostapd; sem 802.11r. Isso é coerente com a precaução do projeto para SAE misto. `wpad-mbedtls` completo instalado.
- Convidados em 5 GHz: WPA2-PSK, PMF opcional, 802.11k/v, FT-PSK local e isolamento. O par WPA2 puro + FT local é coerente. Sem clientes no snapshot.
- Backhaul oculto em 5 GHz: WPA2-PSK, WDS, 802.11k/v, sem clientes no snapshot. Ocultar SSID não elimina beacons nem melhora desempenho por si só.
- `multicast_to_unicast=1` nas interfaces. O hostapd gerou `ap_isolate=1`, enquanto as portas bridge Wi-Fi principais têm hairpin habilitado. Isolamento aparente no hostapd, sozinho, não prova perda de comunicação entre clientes; requer teste funcional se houver sintoma.
- `usteer` habilitado, `local_mode=1`, sem expulsão por carga, `min_snr=0`, limiar de steering −70 dBm, disparo de roaming −78 dBm e intervalo de 120 s. É uma política conservadora, favorável à permanência de clientes; não garante que dispositivos migrem cedo para 5 GHz. A chave UCI `max_retries=3` não comprova o limite efetivo de tentativas do daemon.
- `disassoc_low_ack=0`, `max_inactivity=86400` e `wpa_group_rekey=0` nas redes. Protegem estabilidade de IoT/roaming conforme a política vigente, mas podem manter estações ruins ou inativas por longo período. Desabilitar renovação de chave de grupo não oferece ganho demonstrado de velocidade.

## Qualidade observada dos clientes

- Em 2,4 GHz há 19 associados, inclusive pelo menos um em −85 dBm. Esse cliente acumulou **89 retransmissões e 89 falhas** na janela de 12 s, com cerca de 56 pacotes TX adicionais. Dois outros registros tinham inatividade superior a 30 min e cerca de 15 h, respectivamente, e continuaram acumulando falhas no mesmo intervalo. Isso indica custo/qualidade ruim para esses vínculos; os contadores podem incluir sondas e quadros de controle, então não equivalem diretamente à perda de pacotes da aplicação.
- Em 5 GHz, seis clientes tiveram 0 retransmissões e 0 falhas adicionais na janela de 12 s; o sétimo negociou HE80, NSS 2 e 1200,9 Mb/s PHY com −52 dBm. Um associado aparecia a −89 dBm, mas o bitrate ocioso não mede o throughput sustentado; nessa janela não houve incremento de falhas dele.
- As taxas PHY, inclusive 1200,9 Mb/s, são taxa de enlace, não velocidade útil de aplicação. Não houve tráfego controlado para determinar o máximo real.
- O log circular foi resumido, sem conteúdo bruto: 73 linhas de deauth/desassoc e 107 de `usteer`; contagem isolada, sem duração ou correlação causal, não comprova instabilidade atual.

## Avaliação priorizada

1. **Prioridade alta — rádio 2,4 GHz e clientes de borda.** A combinação de 42,3% de ocupação instantânea, 19 estações e um cliente a −85 dBm com falhas crescentes é o achado mais concreto para alcance e latência. Identificar esse aparelho no painel local, testar sua posição/alimentação/antena, verificar se pode usar 5 GHz ou cabo e repetir o delta de falhas sob carga. Não expulsar automaticamente IoT fraco sem confirmar cobertura funcional.
2. **Prioridade média — seleção do canal 2,4 GHz.** HE20 e a exclusão de taxas 802.11b são escolhas razoáveis para densidade. A amostra do canal 6 não prova que 1 ou 11 seja melhor. Medir ocupação de 1/6/11 em horários equivalentes com equipamento externo ou varredura agendada antes de mudar.
3. **Prioridade média — APs secundários em 5 GHz.** Convidados e backhaul estavam ativos sem clientes. Se não forem usados, desativá-los pode economizar beacons e administração; ganho esperado é pequeno e deve ser medido. Se o backhaul serve contingência, mantê-lo pode valer mais que esse ganho.
4. **Prioridade média — HE80 versus HE160.** O atual canal 149/HE80 está limpo na amostra e evita DFS. HE160 poderia elevar PHY de clientes compatíveis próximos, mas usa mais espectro e pode exigir outro bloco com DFS; não é ajuste universal de latência/alcance. Comparar somente em teste A/B local com transferência LAN e ping sob carga.
5. **Prioridade exploratória — MU beamforming e steering.** MU beamformer está desligado apesar de anunciado no PHY; pode aumentar eficiência sob vários clientes simultâneos, mas depende de suporte do driver/clientes. Testar em VM para comportamento de configuração e no rádio real para desempenho. O steering conservador pode ser ajustado após medir tempo de roaming, RSSI e falhas; `min_snr=0` e `load_kick_enabled=0` não são, isoladamente, erro.
6. **Potência e cobertura.** 23/27 dBm podem dar boa cobertura de download, mas não elevam a potência do celular/IoT no retorno. Alcance útil exige medir **ambos os sentidos** e posicionamento. Aumentar potência ou fixar 160 MHz às cegas pode piorar assimetria ou estabilidade.

## Próximo teste decisivo

Usar um notebook/telefone Wi-Fi em três posições (perto, cômodo intermediário, borda), com um servidor `iperf3` cabeado à LAN. Medir 30–60 s nos dois sentidos, um cliente e múltiplos clientes, junto com ping LAN ocioso/sob carga, RSSI, largura, MCS, retransmissões e ocupação do canal. Repetir em horários de maior interferência. Isso separa gargalo de rádio dos tetos CAKE/ISP. Mudanças de canal, largura, potência, steering e BSS devem ser feitas uma variável por vez, com snapshot/rollback, teste em VM quando aplicável e validação física solicitada pelo usuário.

## Aplicação posterior solicitada pelo usuário em 05/11/2026

O usuário pediu para desligar convidados e backhaul e autorizou explicitamente a exceção de aplicar diretamente no W6x porque o VirtualBox estava indisponível (`VBoxManage` instalado como wrapper, sem binário do aplicativo). Antes da alteração, alvo/modelo e ARK 2.2.1 foram reconfirmados, as duas seções eram `wifi-iface`, ambas tinham `disabled=0`, zero estações e não havia mudanças UCI wireless pendentes. O acesso do Mac ao roteador era por Ethernet 1 Gb/s.

Foram definidos `wireless.guest_radio1.disabled=1` e `wireless.backhaul_5g.disabled=1` em um commit UCI, seguido de um único `wifi reload`. O plano de retorno preserva exatamente os valores anteriores `0` e `0` e usa outro `wifi reload`, se necessário. Nenhum segredo foi salvo em arquivo de backup.

Verificação após a aplicação: ambas as opções persistidas em `1`; zero mudanças UCI pendentes; somente `phy1-ap0` permanece no rádio de 5 GHz; hostapd gerado sem BSS adicionais; 2,4 GHz continua no canal 6/HE20 e 5 GHz no canal 149/HE80. O AP principal de 5 GHz tinha seis clientes após a estabilização, contra sete antes do reload; a identidade/razão da diferença não foi determinada. Ping cabeado do Mac ao roteador: 4/4 respostas, média 0,714 ms. Não houve teste de throughput ou latência de cliente Wi-Fi; este resultado comprova o estado de configuração e a disponibilidade básica do roteador, não ganho de desempenho.
