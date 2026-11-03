# Registro consolidado — Wi-Fi, multicore e otimização do W6x

Data: 02/11/2026, fuso America/Sao_Paulo. Checkpoint solicitado pelo usuário **antes de prosseguir com novos testes**.

## 1. Situação que permanece aberta

**O download lento no iPhone não foi resolvido.** A otimização comprovada foi no custo das consultas do backend e na concorrência da recalibração. As taxas agregadas do roteador não comprovam a velocidade individual do telefone.

Informações fornecidas pelo usuário:

- Cabo: velocidade máxima, anteriormente descrita como cerca de 700 Mb/s nos dois sentidos.
- Wi-Fi no iPhone: aproximadamente 100 Mb/s de download e 430 Mb/s de upload após a otimização; anteriormente 100–300 Mb/s down e 400–510 Mb/s up.
- Aparelho: **iPhone 17 Pro Max**.
- Retransmissão Privada do iCloud: **desligada**, conforme relato do usuário.
- VPN: **não está em uso**, conforme relato do usuário.
- Teste utilizado: Fast.com. **O navegador/aplicativo não foi confirmado**; não presumir Safari.
- Usuário aceitou repetir o teste individual. A repetição sincronizada fica para depois deste checkpoint documental.

O modelo e as opções do telefone foram informados pelo usuário; não foram inspecionados diretamente na tela do aparelho. Retransmissão Privada/VPN não devem continuar sendo apresentadas como explicação principal sem evidência contrária ao relato.

## 2. Equipamento, código e autorização

Alvo verificado via SSH: Acer Predator Connect W6x (Stock Layout), `192.168.73.1`, OpenWrt 25.12.6, kernel 6.12.112, ARK 2.1.8. Não se registram credenciais neste documento.

Revisões observadas ao longo do trabalho:

| Revisão | Contexto |
|---|---|
| `c787a32e` | Primeiro diagnóstico Wi-Fi, antes das correções seguintes |
| `89fda1c0` | Auditoria multicore após ajustes de Wi-Fi/RPS feitos fora desta tarefa |
| `c5132c52` | HEAD durante a implementação/aplicação; commit externo incluiu mudanças IPv6/Doctor e parte do init em edição |

Havia mudanças locais e commits externos durante o trabalho. Foram preservados; esta tarefa não executou commit, push ou publicação. Alterações de Wi-Fi/IPv6 feitas por outro processo não são atribuídas a esta otimização.

O VirtualBox não estava instalado: o wrapper VBoxManage apontava para executável inexistente em `/Applications/VirtualBox.app`. A porta local 2225 do laboratório não respondeu. O usuário orientou testar no 73.1 e, após apresentação do patch, escreveu **SIM**, autorizando a aplicação dos quatro arquivos backend e os testes físicos. Não houve autorização inferida para experimentar novos parâmetros de rádio.

## 3. Etapas realizadas e relatórios detalhados

1. **T-080 — inspeção inicial somente leitura:** configuração UCI, hostapd gerado, schemas/ucode, driver, clientes, filas, firewall e logs. [Análise Wi-Fi](ANALISE_WIFI_CELULARES_2026_11_02.md).
2. **T-081 — auditoria multicore somente leitura:** IRQ/NAPI/RPS, afinidades de threads, processos, cgroups, serviços e carga. [Análise multicore](ANALISE_MULTICORE_W6X_2026_11_02.md).
3. **T-083 — implementação e aplicação autorizada:** serialização da calibração, warmup único, caminho de cache quente e publicação segura dos caches. [Alterações e validação](OTIMIZACAO_MULTICORE_T083.md).
4. **T-084 — rechecagem após o usuário confirmar persistência do gargalo:** identificação específica da estação iPhone; nenhuma alteração adicional de rádio, UCI ou filas. Teste individual ainda não reproduzido durante a coleta.

O número T-083 substituiu o T-082 inicialmente usado para esta otimização, para evitar duplicidade com uma tarefa externa no quadro. Os diretórios técnicos `ark-t082` mantêm o nome original.

## 4. O que foi encontrado na configuração

No primeiro diagnóstico, AQL estava desligado e a contabilização TX/RX de airtime também, apesar de indicações UCI/painel de aceleração. Havia opções HE/OFDMA/TWT sem correspondência com os nomes consumidos pelo gerador instalado. Também se observou país PA, potência elevada, HE160 no canal 44 incluindo subcanais DFS e afirmações excessivas no status de recursos.

Posteriormente, antes da otimização T-083, verificou-se que ajustes externos já tinham ativado AQL e airtime e desativado o packet_steering concorrente. Essa comparação é temporal: não interpretar o primeiro relatório como descrição atual de todas as opções.

Último estado operacional verificado após T-083:

| Item | Observação |
|---|---|
| WAN Ethernet | 1 Gb/s Full Duplex nas leituras; sem indicação de enlace de 100 Mb/s |
| PPPoE | WAN up, MTU 1492; interface física com MTU 1508 |
| CAKE down/up | 760/750 Mb/s, instâncias separadas e single-queue em IFB/PPPoE |
| Download GSO | `no-split-gso` já presente |
| 5 GHz | Canal primário 44, HE160, centro 5250 MHz |
| 2,4 GHz | Canal 11, HE20 |
| AQL/airtime | AQL=1 e AIRTIME_TX + AIRTIME_RX nos dois PHYs |
| RPS | eth1=0; PPPoE=`b` (CPU0/1/3); APs=`1` (CPU0) |
| Flow offload | Software/hardware desativados; WED habilitado/anexado não comprova offload de cada fluxo |
| IPhone | AP principal 5 GHz, HE160, NSS 2; sem regra nft específica encontrada para seu IP/MAC e sem qdisc limitadora no AP |

Não foi comprovado que DFS, beamforming, TWT, AQL, potência ou o servidor Fast sejam a causa dos 100 Mb/s. Não foram alterados como experimento nesta sequência.

## 5. Multitarefas: conclusões e limites

- CPU0 recebe RPS dos APs; CPU1 e CPU3 recebem etapas Ethernet; CPU2 concentra IRQ Wi-Fi, seis NAPIs e o worker `mt76-tx`.
- Serviços como DNS, hostapd, usteer, LuCI/RPC e LEDs estavam livres em CPU0–3. A CPU2 **não é exclusiva** do Wi-Fi.
- As 16 filas TX Ethernet não equivalem a 16 caminhos de processamento independentes ou quatro filas RSS. O tráfego WAN observado concentrava-se numa subfila TX.
- CAKE e PPPoE conservam etapas seriais. Ter quatro núcleos não paraleliza automaticamente cada fluxo ou cada instância de qdisc.
- O custo do RPCd foi medido por cgroup para incluir filhos curtos. Só olhar o processo principal no top subestima o trabalho.
- VPN WireGuard, NAS/USB, failover e outros recursos foram inventariados, mas não submetidos simultaneamente a carga máxima. Não há homologação de todos esses recursos em paralelo.

## 6. Código desenvolvido e arquivos efetivamente aplicados

| Arquivo no W6x | Alteração |
|---|---|
| `/etc/init.d/ark-hardware-tune` | Uma execução por vez; eventos concorrentes pedem reaplicação final; warmup protegido contra duplicação |
| `/usr/lib/ark/serialized-job.sh` | Novo helper com trava atômica por mkdir e tratamento de erros/sinais |
| `/usr/lib/ark/modules/devices.sh` | Temporários por PID, rename, rejeição de timestamps futuros e cache isolado com ARK_ROOT |
| `/usr/sbin/equipe-dashboard-control` | Cache quente de fingerprints/estações retorna antes de carregar dependências; TTL existente de 120 s preservado |

A aplicação usou arquivos temporários e rename, instalando o helper antes do init. O conteúdo anterior foi comparado ao patch para preservar mudanças IPv6 já existentes. Os hashes finais foram lidos de volta e coincidiram com os fontes locais.

Não houve reboot, `wifi reload`, troca de canal, nova alteração de potência, mudança deliberada dos limites SQM ou firmware. A rotina de hardware tune existente foi executada para teste e reaplicou seus próprios parâmetros; afinidades/filas/radios foram conferidos depois.

Também foram alterados **localmente** testes, contratos, documentação, seis traduções EN/ES pendentes da tela anterior e assets i18n gerados. Traduções/assets não foram enviados ao W6x nesta aplicação. Não foi publicada uma release nem gerado um pacote IPK/APK homologado com a mudança.

## 7. Testes e falhas encontradas durante a validação

### Local/sandbox

- Nove testes novos de concorrência/cache aprovados, incluindo produtores simultâneos, sinais, erro, janela de publicação do PID, expiração e relógio futuro.
- Nove testes de hardware e dez cenários de interferência aprovados em sandbox.
- 74 contratos, auditores de shell, preservação de estado e documentação aprovados.
- WAN: 33/34 inicialmente. O teste restante ainda exigia a chave antiga `twt_responder`; foi atualizado para exigir sua remoção e `he_twt_required=0`, conforme a mudança anterior do produto. Reteste específico aprovado; não se afirma que a suíte inteira foi novamente executada depois disso.
- i18n estrito inicialmente falhou em seis strings, cada uma sem EN/ES. Catálogos completados, assets regenerados e auditoria/sintaxe aprovadas.

### No W6x, após SIM

- Os quatro arquivos passaram em `ash -n`.
- Doze concorrentes no helper: pedidos coalescidos, duas aplicações sem sobreposição e trava liberada.
- Três chamadas simultâneas reais de reload: retorno 0, uma calibração em 14:59:45–14:59:46 e um warmup às 15:00:00.
- Um aviso benigno surgiu quando um concorrente leu o PID antes de sua publicação. Foi corrigida a ordem dos redirecionamentos, com novo teste local e físico silencioso.
- Falha de worker propagou retorno 7; TERM retornou 1 e liberou a trava; timestamp futuro acionou fallback.
- JSON de fingerprints e estações validado com cache quente e após reconstrução fria. Reconstrução fria combinada: 2,53 s, sem benchmark frio antigo equivalente.
- Filas, WAN, rádios, AQL e RPS permaneceram coerentes. Nenhuma trava de calibração/warmup ficou presa.
- Sonda limitada: 5/5 respostas de 1.1.1.1, RTT médio 4,373 ms. Não é prova de estabilidade prolongada.

### Adaptações de ferramentas, sem confundir com falha da rede

O firmware não tinha base64, openssl, diff ou od pelos caminhos consultados. A transferência foi feita por HTTP temporário entre Mac e W6x e conferida por SHA-256; o servidor foi encerrado. Não houve envio para serviço externo.

O utilitário time não executou a função shell usada na primeira tentativa; o processo de medição ficou preso e foram encerrados somente ele e a sessão de teste correspondente. A medição válida foi refeita por uptime monotônico. O ping não aceitou intervalo fracionário; a sonda válida foi refeita com intervalo inteiro. Esses erros de ferramenta não foram contabilizados como perda de internet ou falha da otimização.

## 8. Resultados medidos — o que significam

| Medição | Antigo | Novo | Interpretação |
|---|---:|---:|---|
| 80 leituras, antigo primeiro | 13,88 s | 0,35 s | Cache quente; mesmos dois comandos |
| 80 leituras, novo primeiro | 13,76 s | 0,40 s | Repetição na ordem inversa |
| 80 leituras após instalação | — | 0,39 s | Confirmação do caminho instalado |
| RPCd + filhos, janelas de 30 s | 32,21% de um núcleo | 26,40% de um núcleo | Observação sem carga rigidamente controlada; janela posterior incluía warmup |

O ganho de aproximadamente 97% vale para o tempo do **lote de consultas quentes**, não para todo o dashboard, CPU global ou velocidade da internet.

Houve janelas agregadas com aproximadamente 518–538 Mb/s de entrada PPPoE, 540–560 Mb/s de TX no AP e outra com 546 Mb/s de saída PPPoE. Máximo médio por núcleo nessas janelas: 62,7%. Elas não estavam discriminadas por estação e **não podem ser usadas para contradizer os 100 Mb/s informados pelo usuário no iPhone**.

A coleta seguinte identificou especificamente o iPhone, mas capturou somente cerca de 25 KB TX em um minuto, sem teste ativo. Não comprovou a causa nem a resolução do download lento. A hipótese de saturação sustentada de CPU também não foi demonstrada.

## 9. Backups, integridade e rollback

Arquivos copiados neste checkpoint para um diretório persistente no HD, fora do repositório canônico:

`Evidencias locais/T083-2026-11-02/` (relativo ao workspace).

- `original-backend.tar.gz`: três arquivos anteriores; helper não existia.
- `ark-t082-backend.tar.gz`: quatro arquivos finais para revisão/restauração da versão aplicada.
- Dois JSONs com métricas derivadas, sem identificadores de clientes.
- `manifest.json`: tamanho e SHA-256 dos arquivos preservados.

Hashes dos arquivos compactados:

| Artefato | SHA-256 |
|---|---|
| Backup anterior | `ae6dde2a8bdb27713bbaa6864b085e8b9e09326b07680ec1549c89b894d8e35c` |
| Código final aplicado | `3432191a32253671b38b65dbda094193358a888b22612a4b3110135e99b227e2` |

No W6x, o backup temporário está em `/tmp/ark-t082/backup/original-backend.tar.gz`. O rollback preparado é `/bin/ash /tmp/ark-t082/rollback.sh`: verifica ausência de trava ativa, restaura os três arquivos antigos e remove o helper novo, sem reload automático. Não foi executado. Os arquivos `/tmp` do roteador e do Mac não sobrevivem necessariamente a reboot/limpeza; por isso foi feita a cópia persistente acima.

Hashes dos quatro arquivos finais estão em [T-083](OTIMIZACAO_MULTICORE_T083.md). A restauração preserva os modos do backup. Antes de executar rollback no futuro, conferir o estado e possíveis alterações posteriores de terceiros.

Limite conhecido: SIGKILL pode deixar comandos filhos vivos e uma trava órfã. O helper falha fechado, sem roubar a trava; é necessário confirmar que os filhos terminaram antes de limpar, ou reiniciar. Reboot, interrupção física de link e recuperação desse cenário não foram exercitados.

## 10. Evidências e ponto de retomada

- [Métricas multicore iniciais](audit/evidence/w6x_multicore_2026_11_02.json).
- [Métricas de aplicação/testes T-083](audit/evidence/w6x_t083_deploy_2026_11_02.json).
- `tests/test_multicore_optimization.py`: testes novos.
- `tests/feature_contracts.yaml`, `docs/FEATURE_AUDIT_AND_REBOOT.md`, `docs/audit/STATUS.md` e `TASK.md`: acompanhamento atualizado.

**Próxima ação, somente depois desta documentação:** sincronizar teste individual do iPhone 17 Pro Max e medir bytes/PHY/retries por estação, CPU por núcleo e filas. Confirmar navegador e comparar caminho local/internet ou outro servidor antes de novos ajustes de rádio. Registrar resultados do telefone separados dos contadores do roteador.

Nenhum novo teste ou alteração de roteador foi executado durante este checkpoint documental. O problema de download Wi-Fi continua aberto.
