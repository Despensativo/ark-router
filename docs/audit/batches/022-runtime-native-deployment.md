# Lote 022 — aplicação e validação física das correções do Doctor

Data: 05/11/2026. Solicitação explícita do usuário: aplicar as correções e testar no ambiente real. Alvo confirmado por `ubus system board`: **Acer Predator Connect W6x (Stock Layout), 192.168.73.1**, OpenWrt **25.12.6**, kernel **6.12.112**, fw4. Base local `a5ab48c2` + alterações anteriores de QoS + [lote 021](021-docs-runtime-doctor-audit.md); versão declarada 2.2.1, sem release nova.

## Aplicação realizada

Dez arquivos de runtime foram substituídos com cópia temporária e rename, preservando permissões e proprietário: `common.sh`, `modules/doctor.sh`, `modules/ezsetup.sh`, `equipe-dashboard-control`, `ark-web-watchdog`, `ark-firewall-guard`, os três hotplugs `99-ark-doctor` e a ACL `luci-app-equipe-dashboard.json`.

Os **20 hashes** registrados na validação local do lote 021 ainda coincidiam antes da instalação. Os dez arquivos instalados somam **350.837 bytes**; havia **47.140 KiB** livres no overlay. Backup dos dez originais foi conferido por SHA-256 no Mac e no roteador. Hashes instalados foram verificados imediatamente e ao terminar. As diferenças contra o equipamento correspondiam às contenções do lote 021; as alterações anteriores de QoS foram preservadas.

O reload de `rpcd` carregou a ACL; os PIDs dos serviços monitorados permaneceram iguais. Nenhum firmware foi gravado. Não houve reboot, reload de firewall, reinício de SQM, troca de DNS ou reconfiguração de Wi-Fi nesta aplicação.

O instalador `99-ark-router-doctor` permanece corrigido no repositório para futuras instalações. Ele não foi recolocado em `uci-defaults` nem executado neste equipamento já instalado: isso evitaria repetir uma migração de cron/UCI desnecessária. O hook antigo em `/sbin/reload_config` permanece chamando `--auto`, agora observacional. A preferência existente `auto_heal=1` e o agendamento foram preservados.

## Evidência por ambiente

| Cenário | Ambiente efetivamente exercitado | Resultado |
|---|---|---|
| `doctor-run` | CLI instalada, UCI/serviços reais | 32 checks OK, zero avisos/erros e zero reparos; stderr vazio |
| `doctor-run --fix` | Dispatcher instalado, UCI/serviços reais | Continua sendo leitura; 32 checks e zero reparos |
| `--auto --fix` e cinco repetições | CLI real inicial; depois função instalada com diretório de timestamp isolado, sobre o estado real | Zero mudanças persistentes; cinco chamadas coalescidas sem renovar cache/timestamp |
| Entradas inválidas de `feature-toggle` | Dispatcher instalado | Estado inválido e recurso desconhecido retornam 2; UCI preservado |
| Watchdog web e firewall guard | Scripts instalados, HTTP/fw4 reais | Sem mudanças de rede/processos; tema já correspondia à preferência e não foi alterado |
| Dono vivo antigo, PID ausente, dono morto, terceiro, busy, TERM | BusyBox ash nativo, diretórios de lock isolados em `/tmp` | Oito verificações aprovadas; TERM retorna 130, libera o lock próprio e não continua executando |
| ACL read/write | Sessões rpcd efêmeras com grants derivados da ACL instalada; requisição HTTP `/ubus` real | Read recebe Permission denied (6) para execução do controlador; write recebe 0 |
| Diagnóstico pela interface | Chrome real, LuCI do W6x em 1280 e 390 px | RPC e processo retornam 0, 32 cartões, zero reparos; nenhum `console.error`/`pageerror`; sem overflow horizontal |
| Falha de stop, desligamento, repetição e recursos alheios | Código instalado + ash/UCI/TC nativos; serviço SQM/offload substituídos por adaptadores; IFBs isolados | Quatro casos aprovados: falha preserva UCI/fila; desligar remove somente a fila própria; repetição funciona; ingress/IFB alheios continuam ativos |
| Conectividade curta | Mac → roteador e roteador → Internet | 20/20 respostas em cada caminho; sem perdas durante a amostra |

As sessões de teste foram criadas por SSH root autenticado e destruídas ao final; não houve criação de usuário, alteração de login ou gravação de senha/token. O teste de ACL comprova o enforcement dos grants no rpcd e no método `file.exec`; não substitui uma homologação de login de contas permanentes com perfis diferentes.

As screenshots são do LuCI real e mostram o diagnóstico concluído. Em 390 px, o modal utiliza rolagem vertical do overlay; o botão Fechar foi acionado com sucesso. O texto atual “Sistema 100% saudável” e a referência visual a “Autocura” pertencem ao frontend existente e não equivalem à homologação integral descrita neste relatório.

Na amostra de conectividade, RTT médio/máximo: **0,595/0,914 ms** do Mac ao roteador e **4,515/4,933 ms** do roteador a 1.1.1.1. É uma verificação curta de continuidade; não mede ganho de velocidade, bufferbloat, ping de jogo ou resolução das pausas WAN dos lotes anteriores.

## Preservação e retorno

Após instalação, diagnósticos, testes e navegador, permaneceram iguais ao preflight:

- Hashes de todos os arquivos em `/etc/config` e das alterações UCI pendentes.
- Hash da representação nft sem contadores, rotas IPv4, regras de política IPv4/IPv6 e inventário de links.
- Configuração/handles das qdiscs e PIDs de netifd, dnsmasq, odhcpd, uhttpd, rpcd, hostapd, wpa_supplicant e nginx quando presentes.

Os IFBs e diretórios isolados de teste foram removidos. Os locks de produção ficaram livres. O watchdog temporário de retorno foi desarmado após confirmação de integridade e conectividade e terminou. Seu rollback foi preparado e validado sintaticamente, mas não precisou ser acionado; recuperação após perda de acesso/reboot não foi ensaiada.

Backup persistente e scripts operacionais: `Evidencias locais/Runtime-022-2026-11-05/`, relativo à raiz do workspace. A pasta `original/` contém somente os dez arquivos de código substituídos, sem backup integral de configurações. Cópia volátil e script de retorno permanecem em `/tmp/ark-runtime022/` no W6x; desaparecem ao reiniciar. O retorno confere o hash candidato antes de restaurar cada arquivo, evitando sobrescrever alterações posteriores; exige revisão se algum hash divergir.

## Ajustes do ensaio e limites

As primeiras tentativas revelaram problemas no harness, não falhas demonstradas do runtime: seleção do known_hosts, resposta vazia válida de `session.grant`, seletor do botão na interface V2, criação inicial dos arquivos UCI da fixture e caminho de locks. O `common.sh` nativo seleciona `/var/lock`; a atribuição externa de `ARK_LOCK_DIR` é sobrescrita. O aplicador inicial protegeu o lock global, mas usou `/tmp` para o lock secundário do Doctor; o script reutilizável foi corrigido para o caminho efetivo. Não foi observada mutação concorrente e todas as pós-condições acima coincidiram. A função de coalescência foi testada com o override depois do source. Avisos de encerramento do Playwright foram eliminados consumindo a resposta JSON antes de fechar o navegador; a execução final terminou sem esses avisos.

**Não homologado neste lote:** reboot/boot completo, instalação por pacote, fw3 em hardware, Dual-WAN sob falha, WAN/SQM desligados em produção, radiofrequência e carga sustentada. A desativação SQM com falha foi exercitada com serviço injetado, não interrompendo o shaper da conexão usada pelo usuário. As doze pendências R01–R12 do lote 021 continuam abertas, em especial reparo manual transacional, restauração exata de DNS/AdBlock e rollback completo dos toggles. Não se executou o reparo manual em massa `doctor-fix`.

Evidência consolidada, hashes e screenshots: [pasta do lote físico](../evidence/runtime-native-2026-11-05/README.md). VirtualBox continuou indisponível; a validação física ocorreu pela solicitação explícita deste turno. Sem commit, push ou publicação.
