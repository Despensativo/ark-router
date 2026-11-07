# Lote 010 — avaliação e proposta de QoS adaptativo (05/11/2026)

Estado: análise e recomendação; arquitetura proposta ainda não implementada/homologada. Nenhuma configuração física alterada neste lote.

## Resposta técnica

Os dois motores têm adaptação parcial por regras. Não há prova de desempenho máximo, inteligência completa nem superioridade universal. O objetivo de produto deve ser máxima vazão útil compatível com metas de latência, equidade e estabilidade, sob orçamento de CPU/RAM.

## Evidência atual

- W6x consultado em 05/11: 4 CPUs, MemTotal 1010036 KiB (~986 MiB), MemAvailable 727032 KiB naquele instante; WAN PPPoE com uma TX queue. CAKE 620 Mb/s upload e 720 Mb/s download, 64M de limite em cada direção, no-split-gso. Disponibilidade de RAM em repouso não comprova folga sob pico.
- `common.sh:ark_cake_memlimit` escolhe 4/16/32/64/128/256M pela RAM total. Não divide orçamento global pelas WANs, direções e instâncias de qdisc; o limite é teto e não alocação antecipada ou indicador de desempenho.
- `ark_hfsc_fqcodel.qos:ark_hfsc_build_tree` escolhe mem_rt/mem_turbo por três faixas de RAM, quantum por velocidade e curvas por preset WAN. Em hardware com >=600000 KiB, RT/BE/Bulk permitem 16+32+16 MiB por direção, até 128 MiB por WAN bidirecional, antes de outras estruturas. Fallback sem memory_limit altera o orçamento efetivo e deve ser informado.
- `sqm.sh:get_system_hardware_sqm_audit` sugere limites 100/250/350/850 Mb/s por arquitetura/núcleos; não são capacidade medida.
- `ark_hfsc_detect_wan_profile` infere cabo de DHCP/static e fibra de PPPoE/subinterface. Isso é heurística insuficiente: protocolo de acesso não identifica meio físico nem jitter/RTT/capacidade.
- HFSC + FQ-CoDel tem isolamento por fluxo nas folhas; não oferece automaticamente a mesma equidade entre dispositivos do CAKE com host isolation.
- Classificação, ctinfo ausente/não verificado, trust boundary ingress e Autorate incompleto continuam abertos nos lotes 005–009. Não tratá-los como funcionalidades homologadas.
- O teste 638/514 Mb/s e pings do lote 009 não levou ambos os motores ao limite nem comparou CPU por núcleo. ICMP recebe prioridade no código: suas sondas não provam latência de aplicações Best Effort. O serviço networkQuality também forneceu responsiveness HTTP, mas não representa o jogo do iPad.

## Dois perfis recomendados

1. **CAKE — equilíbrio e justiça entre dispositivos**: candidato a padrão geral, com compensação de enquadramento, isolamento por dispositivo/fluxo e classificação conservadora. Diffserv apenas com fronteira de confiança operacional; usar entrada Best Effort com isolamento como fallback quando não for possível classificar com segurança. Isso continua sendo SQM. CAKE-mq somente com suporte comprovado, múltiplas TX queues e validação de equidade/latência na interface real.
2. **HFSC + FQ-CoDel — política de classes**: alternativa para prioridades explícitas e cenários nos quais benchmark demonstre vantagem. Preservar compartilhamento de capacidade ociosa, evitar starvation e separar classe prioritária por fluxo estável. Não prometer que é sempre mais leve, rápido ou melhor para jogos. Equidade entre dispositivos exige desenho adicional e teste de custo.

Ambos devem consumir uma política comum: preferências do usuário, orçamento, classificação, overhead, persistência e telemetria. Não duplicar detectores divergentes por motor.

## Adaptação necessária

- **Inventário de capacidades**: kernel, firewall, módulos efetivamente exercitados, filas físicas/virtuais, CPU, frequência disponível, RAM e serviços concorrentes. Estado deve distinguir suportado, ativo, validado e indisponível.
- **Envelope medido**: testes limitados de download, upload e simultâneos; tamanhos pequenos e grandes de pacote, IPv4/IPv6 e vários dispositivos. Medir softirq e núcleo mais ocupado, não somente média geral. Detectar gargalo em VPN, PPPoE, interface e Wi-Fi separadamente.
- **Orçamento global de RAM**: reservar sistema, Wi-Fi, conntrack, VPN e serviços; repartir teto entre WANs/direções/folhas/filhos mq. Aplicar limites ao pior caso; usar pressão de memória como proteção, sem recalibrar a cada oscilação de MemAvailable.
- **Perfil de link**: separar meio de acesso de DHCP/PPPoE; usar preset confirmado e observações com nível de confiança. Overhead/MPU/ATM/PTM por encapsulamento e caminho real. Evitar um valor global 44 para todos.
- **Parâmetros AQM**: RTT/interval/quantum/ECN e split-gso precisam de comparação controlada. Investigar o no-split-gso aplicado universalmente; não assumir vantagem em links domésticos. RTT do AQM não é promessa do ping do jogo.
- **Controlador para links variáveis**: implementar coletor real, amostras por WAN/direção, múltiplos destinos, rejeição de outliers, baseline, limites, histerese, tempo mínimo entre ajustes e recuperação após falha/reboot. Diferenciar congestão de perda de sinal/ISP. Manter Autorate atual desligado até isso existir e ser validado.
- **Prioridade confiável**: remover pressuposto UDP=jogo, tratar IPv4/IPv6, não dividir a mesma conexão entre classes por tamanho do pacote, preservar bits MWAN e validar restauração antes do IFB. Priorizar ICMP de forma diferente das aplicações pode mascarar benchmark.
- **Offload e scheduler**: não permitir caminho acelerado contornar o shaper; verificar datapath de cada plataforma. IRQ/RPS ajudam outros estágios, sem multiplicar automaticamente capacidade de uma qdisc mono-fila. BQL/AQL/GRO não devem receber valores universais sem teste.
- **Operação para usuário final**: mostrar motor e motivo da escolha, limites medidos, grau de confiança, fallback e mudança aplicada. Evitar habilitar/desabilitar opções silenciosamente ou executar testes de saturação inesperados.

## Matriz mínima de homologação

| Eixo | Cenários |
|---|---|
| Hardware | 1 núcleo/128 MiB; 2 núcleos/256 MiB; 4 núcleos/512 MiB–1 GiB; x86/multiqueue |
| Link | fibra DHCP e PPPoE; DOCSIS assimétrico; DSL/ATM/PTM; Starlink; 4G/5G; VPN |
| Uso | jogo+download; videoconferência+upload; QUIC; backup/P2P; convidados; muitos fluxos por dispositivo |
| Topologia | IPv4/IPv6; Dual-WAN simultânea; failover; VLAN; túnel; Wi-Fi concorrente |
| Ciclo de vida | boot, hotplug, reinício SQM/firewall, idempotência, erro TC/UCI, falta de módulo, rollback |

Comparar CAKE e HFSC com as mesmas taxas, cenário, destinos e ordem alternada. Observar vazão útil; latência adicional p50/p95/p99 e pior caso; perda/ECN/retransmissão; equidade por dispositivo; softirq por núcleo; pressão de memória e estabilidade prolongada. Metas devem ser definidas por cenário e comparadas ao estado anterior, sem prometer um único número para todo ISP/hardware. VM/mocks cobrem lógica; hardware valida throughput/driver/filas.

## Ordem recomendada

1. Fechar classificação e comportamento seguro sem módulos opcionais.
2. Unificar inventário e orçamento de recursos dos dois motores.
3. Medir e selecionar parâmetros por hardware/cenário, preservando preferências.
4. Implementar controlador real de links variáveis.
5. Homologar comparativamente e publicar limites conhecidos por plataforma.

## Referências primárias

- iproute2, manual CAKE: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2-next/+/refs/heads/master/man/man8/tc-cake.8 — memória, isolamento, GSO, wash e mq. Documento upstream atual não prova suporte no kernel instalado.
- Koppeler, Høiland-Jørgensen e Schmid, mq-cake: https://schmiste.github.io/netdev25.pdf — escalabilidade multiqueue; resultados do artigo não são benchmarks do W6x.
- OpenWrt SQM: https://openwrt.org/docs/guide-user/network/traffic-shaping/sqm — configuração e limites de integração/offload; consulta por busca, abertura direta bloqueada pelo site.
