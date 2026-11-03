# T-083 — Concorrência e caminho de cache quente

Data: 02/11/2026. Estado: aplicado no W6x após confirmação SIM; validação operacional registrada abaixo.

## Alterações

- `ark-hardware-tune`: execução serializada, eventos concorrentes coalescidos em reaplicação final e warmup protegido contra duplicação. Mantém as afinidades e parâmetros existentes. A retirada do timestamp impede que um evento de interface recém-criada seja simplesmente ignorado pelo cooldown anterior.
- `serialized-job.sh`: helper shell sem dependências novas, com `mkdir` atômico. Retorno 75 sinaliza pedido coalescido (o init converte para sucesso). Falhas do worker propagam status; TERM/INT/HUP limpam a trava. Não rouba trava de dono morto porque comandos filhos podem continuar executando.
- Dispatcher: fingerprints e estações com cache válido retornam antes de carregar common/devices/network/system/ezsetup e outras dependências. Reutiliza o TTL existente de 120 segundos. Nenhum novo endpoint, privilégio ou alteração visual.
- Caches de dispositivos: temporários por PID e publicação por rename; erro do produtor não substitui o cache por saída parcial; relógio futuro invalida cache; ARK_ROOT separa o cache de teste do hospedeiro.

## Evidência local

`tests/test_multicore_optimization.py`: nove testes funcionais, incluindo doze pedidos concorrentes durante um worker bloqueado, oito escritores concorrentes por cache, falha do worker, dono morto, TERM, cache expirado/futuro e preservação do mock de estações.

O teste concorrente produziu duas aplicações sequenciais para a rajada (inicial e reaplicação), sem sobreposição. O teste de cache quente demonstra que as dependências não são carregadas. Isso não mede a redução de CPU no W6x e não justifica prometer porcentagem de ganho ou aumento de Mb/s.

Hardware: 9 testes aprovados. Interferência em sandbox: 10 aprovados. Novos testes: 9 aprovados. Contratos: 74 aprovados. Auditores de shell (9 etapas), preservação de estado e documentação aprovados. i18n estrito inicialmente falhou por seis strings EN/ES da tela Wi-Fi anterior; os catálogos foram completados e os assets i18n regenerados, com auditoria estrita e sintaxe JS aprovadas. Matriz WAN: 33/34 inicialmente; falha era expectativa antiga de twt_responder. Atualizada para exigir remoção dessa chave e he_twt_required=0, com reteste específico aprovado (sem reexecutar os 33 já aprovados). O registro final de resultados fica em `docs/audit/STATUS.md`.

Pacote de revisão local: `/tmp/ark-t082-review/ark-t082-backend.tar.gz`, contendo apenas init, helper, devices e dispatcher. O pacote inicial foi transferido e conferido antes da aplicação; o helper recebeu depois um ajuste de redirecionamento de stderr, validado novamente.

## Limites e validação pendente

O comando VBoxManage neste Mac aponta para um executável inexistente em `/Applications/VirtualBox.app`; a VM local em 127.0.0.1:2225 não respondeu. Não houve instalação automática de hipervisor. O usuário autorizou mudar o alvo de validação para o W6x 73.1. A inspeção física em leitura confirmou o init anterior e ausência do helper novo. O usuário confirmou SIM e autorizou explicitamente o teste físico.

Os testes locais usam shell do macOS e mocks; BusyBox ash, rc.common e filas foram verificados no W6x conforme abaixo; reboot e eventos físicos de hotplug continuam não exercitados. Não houve mudança frontend: screenshot não foi utilizado como evidência para esta alteração de backend.

SIGKILL/falta de energia são casos distintos: `/tmp` é limpo no reboot. Após SIGKILL sem reboot, uma trava órfã falha fechada; antes de removê-la é necessário confirmar que o worker e filhos terminaram. O warmup também mantém seu lock temporário se for morto sem possibilidade de executar o trap. Evita-se recuperação automática que poderia reintroduzir execução simultânea.

O checkout já continha alterações de terceiros. Durante a execução, HEAD avançou de `89fda1c0` para `c5132c52` por um commit externo, que incorporou a alteração do init antes de o helper novo ser versionado. Esta tarefa não executou commit/push. **A entrega deve incluir `root/usr/lib/ark/serialized-job.sh` junto do init**; não empacotar ou implantar somente o init daquele commit.

## Validações ainda pendentes

A aplicação física foi autorizada e executada, conforme seção seguinte. Continuam pendentes reboot, hotplug físico/interrupção de link, carga simultânea VPN/NAS e teste individual sincronizado que reproduza o gargalo do iPhone. O laboratório VirtualBox não foi exercitado. Não repetir a aplicação já concluída como se ainda aguardasse autorização.

Os quatro arquivos backend foram aplicados no W6x após backup. Não houve reboot, publicação ou homologação de release; traduções e assets i18n preparados localmente não foram implantados.


## Validação física autorizada — 02/11/2026, 14:54–15:05

- Alvo confirmado: Acer Predator Connect W6x, OpenWrt 25.12.6. Conteúdo do init anterior comparado ao patch: somente alterações de serialização/warmup; alterações IPv6 preexistentes preservadas.
- Backup dos três arquivos anteriores: `/tmp/ark-t082/backup/original-backend.tar.gz` no W6x e `/tmp/ark-t082-review/original-backend.tar.gz` no Mac, SHA-256 `ae6dde2a8bdb27713bbaa6864b085e8b9e09326b07680ec1549c89b894d8e35c`. O helper não existia antes.
- Rollback no W6x: `/bin/ash /tmp/ark-t082/rollback.sh`. Restaura os três arquivos e remove o helper novo, sem reload automático. Backup em RAM não sobrevive ao reboot; cópia local preservada.
- Quatro arquivos aplicados por arquivos temporários e rename, dependência instalada antes do init. Hashes lidos de volta coincidem com os fontes locais.
- Sintaxe ash dos quatro arquivos aprovada. JSON válido em fingerprints/estações com cache quente e após invalidação dos timestamps. Reconstrução fria combinada: 2,53 s; não foi medido um comparativo frio antigo.
- Helper sob ash: doze concorrentes retornaram 75 (coalescidos), dono retornou 0, duas execuções sem sobreposição e trava liberada. Falha do worker propagou 7; TERM retornou 1 e liberou a trava. Cache futuro caiu no caminho de fallback conforme esperado.
- Três invocações simultâneas reais do init retornaram 0. Logs: uma calibração 14:59:45–14:59:46 e um warmup às 15:00:00. Um aviso de abertura do PID antes de sua publicação foi reproduzido, corrigido pela ordem de redirecionamentos e retestado silenciosamente; não representou falha da calibração.
- WAN permaneceu up, CAKE em 760/750 Mb/s, HE160 no 5 GHz e HE20 no 2,4 GHz. Sem reboot ou wifi reload.

### Medição controlada das leituras quentes

Cada lote contém 40 pares de fingerprints/estações (80 processos CLI), mesmos caches e roteador; tempos pelo uptime monotônico:

| Execução | Antigo | Novo |
|---|---:|---:|
| Antigo primeiro | 13,88 s | 0,35 s |
| Novo primeiro | 13,76 s | 0,40 s |
| Instalado, confirmação final | — | 0,39 s |

Redução de aproximadamente 97% no tempo desse lote. Mede o caminho de leituras quentes, não o dashboard inteiro nem throughput de internet.

Janelas passivas de 30 s: cgroup RPCd+filhos passou de 9,662357 s de CPU (32,21% de um núcleo) para 7,921410 s (26,40% de um núcleo). Contexto não rigidamente controlado, com warmup na janela posterior; é observação, não uma estimativa causal de ganho global.


### Carga final e integridade

[Evidência resumida em JSON](audit/evidence/w6x_t083_deploy_2026_11_02.json).

Durante o teste solicitado no iPhone, duas janelas de aproximadamente 10 s mostraram 537,95/518,18 Mb/s de entrada PPPoE e 559,55/539,50 Mb/s de TX no AP 5 GHz. Outra janela mostrou 546,32 Mb/s de saída PPPoE e 551,53 Mb/s de RX no AP. São taxas agregadas por interface/camada, não a leitura final do Fast no telefone. O maior uso médio por núcleo foi 62,7% nessas janelas; não exclui picos menores que 10 s.

Após a carga: WAN up, CAKE com backlog amostrado zero em ambos os sentidos; AQL e airtime TX/RX ativos; RPS eth1=0, PPPoE=b e APs=1; nenhuma trava de calibração/warmup ficou presa. Não houve reboot nem reinicialização de Wi-Fi. O resultado numérico final exibido no telefone não foi recebido até este checkpoint.

Hashes finais lidos no W6x e iguais aos fontes locais:

| Arquivo | SHA-256 |
|---|---|
| init hardware tune | `4e192c02e5d5cd02618580cd8b4f639cfd0cb9683430fc99ead8beed48f491d0` |
| helper serializado | `767433b7760ce9b81c9796a385b3697e78e46be8d6cfd9edb6c46dd25fd148e4` |
| devices.sh | `66f3003581cde9f2f8a7002ae87f330ce0f9cfcd8ca3f471887d2510aec90d22` |
| dispatcher | `899c886c0f09230a1408daf59e6345b6245f5dddced5e5c7e477f7edc82c2abd` |

O ID deste lote passou a T-083 para não duplicar T-082, usado por outra atualização no quadro compartilhado. Os diretórios temporários de backup/teste mantêm o nome técnico ark-t082.

Sonda final limitada: 5/5 respostas de 1.1.1.1, sem perda, RTT médio 4,373 ms. Não equivale a monitoramento prolongado de estabilidade.


## Retorno do usuário e diagnóstico T-084

O usuário informou que, após a aplicação, o cabo continua na velocidade máxima, mas o Wi-Fi permanece em cerca de 100 Mb/s down e 430 Mb/s up. Portanto, T-083 resolveu custo de backend/concorrência, não comprovou resolução do gargalo do celular. As taxas agregadas anteriores não devem ser atribuídas ao iPhone.

Nova inspeção somente leitura: iPhone identificado pelo DHCP e associação ao AP principal de 5 GHz, HE160/NSS 2; taxas PHY variaram em repouso, incluindo 1441–2402 Mb/s. Não houve regra nft específica encontrada para seu IP/MAC, nem qdisc limitadora no AP; policy routing somente local/main/default. Isso não exclui limitações em outras camadas.

Uma série de sete snapshots em aproximadamente 60 s da estação pegou apenas tráfego ocioso (cerca de 25 KB TX no intervalo), sem reproduzir o teste de velocidade. Após essa coleta, o usuário informou iPhone 17 Pro Max, Retransmissão Privada desligada e ausência de VPN. Navegador ainda não confirmado. A repetição individual foi aceita, mas o usuário solicitou documentação antes de prosseguir. Nenhuma opção de rádio, UCI ou fila foi alterada nesta rechecagem. T-084 permanece aberto, sem causa-raiz declarada.

Registro consolidado solicitado antes da retomada: [REGISTRO_SESSAO_WIFI_MULTICORE_2026_11_02.md](REGISTRO_SESSAO_WIFI_MULTICORE_2026_11_02.md). Backups e métricas também copiados para `Evidencias locais/T083-2026-11-02/` no workspace, fora do repositório.
