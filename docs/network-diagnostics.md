# Diagnósticos de rede e Dual OpenWrt

## Compatibilidade

Use a [matriz de compatibilidade](COMPATIBILITY_MATRIX.md) e detecte cada capacidade no alvo. O motor de firewall do ARK é selecionado por `ark_firewall_engine`, `is_fw4` e `is_fw3` em `common.sh`. Em fw4, não invoque wrappers iptables/ip6tables, inclusive para diagnóstico. Detecte `opkg`/`apk` separadamente do firewall.

## SQM, MTU e aceleração

O código associa SQM ao dispositivo L3 da WAN, como `pppoe-wan`; confirme o dispositivo efetivo no ubus e a árvore TC. PPPoE a MTU 1500 exige suporte ao caminho de 1508 no portador e negociação adequada. Não force 1500 somente porque existe PPPoE.

SQM e offload compartilham recursos: os módulos devem preservar o estado anterior e sincronizar aceleração ao ligar/desligar. Overhead, RTT, limites e GSO dependem do meio, hardware e medição; divergência em relação a uma heurística não comprova falha. O reparador manual do Doctor ainda contém heurísticas rígidas, conforme [modelo de segurança](DOCTOR_SAFETY_MODEL.md).

## Doctor

| Ação | Comando |
|---|---|
| Diagnosticar em texto | `/usr/sbin/ark-doctor` |
| Diagnosticar em JSON | `/usr/sbin/ark-doctor run` |
| Consultar cache | `/usr/sbin/equipe-dashboard-control doctor-status` |
| Consultar log | `/usr/sbin/equipe-dashboard-control doctor-log` |

A partir da revisão local de 05/11/2026, `--auto` é observacional. Cron e hotplugs não reconfiguram a rede. A chave legada `equipe_dashboard.doctor.auto_heal` controla o agendamento, com intervalo mínimo de 60 segundos entre inícios automáticos.

O alerta de RAM considera menos de 20 MiB disponíveis, conforme a implementação; não são os antigos limites documentados de 80/60 MB. Flash até 2048 KiB ou espaço desconhecido gera aviso. Cache e log ficam em `/tmp/ark-doctor-last.json` e `/var/log/ark-doctor.log`; confirmar que `/var/log` permanece em RAM no firmware alvo. Um resultado `OK` abrange somente os checks executados.

`doctor-fix` e `ark-doctor --fix` são reparadores manuais legados com risco de reload e perda de configuração. A matriz de riscos e o plano de substituição estão em [DOCTOR_SAFETY_MODEL](DOCTOR_SAFETY_MODEL.md). Não usá-los como prova de que toda a rede está saudável.

## Latência e hardware

As regras DSCP e o `ark-hardware-tune` influenciam classificação, filas e distribuição de CPU. Contadores, nomes de tins ou latência de fila isolada não demonstram RTT do cliente nem garantem zero perdas. Os lotes QoS de [STATUS](audit/STATUS.md) registram medições por alvo e revisão; não extrapolar resultados para outro hardware.

Ao medir, registre caminho do cliente, ligação por cabo ou Wi-Fi, carga, throughput, perda, RTT e CPU por núcleo. Compare condições equivalentes e preserve a configuração original. Use mocks para RF/MLO/offload no laboratório e identifique explicitamente essa limitação.
