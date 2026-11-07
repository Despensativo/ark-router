# Lote 021 — documentação, lógica operacional, UX e Doctor

Data: 05/11/2026. Base Git: `a5ab48c2`; versão declarada `2.2.1`, acrescida de alterações locais anteriores de QoS e desta auditoria. Não é uma release. Alterações anteriores foram preservadas; sem commit, push, publicação ou acesso a equipamento físico.

## Resultado e alcance

Foram implementadas contenções nos caminhos automáticos do Doctor, nos guardas de rede/web, na concorrência, nas ACLs e no desligamento SQM. A documentação agora distingue comportamento observado, contrato desejado e aprovação operacional. O reparador manual `--fix` e a restauração completa de todos os recursos ainda não estão concluídos.

A descoberta inicial encontrou **166 Markdown**: 54 skills, 84 referências e 28 registros classificados como históricos pela varredura. Inclui arquivos ocultos descobertos pelo `rg` e respeita ignore. O conjunto final contém **170 Markdown**, incluindo os quatro documentos criados neste lote. O [inventário final](../evidence/runtime-2026-11-05/markdown-inventory.json) registra cada caminho, tamanho, hash, referências e candidatos. Exclui dependências, `dist`, `.git` e os diretórios protegidos `Offline`, `Backups`, `Router Backups` e `Documentacao privada`; estes não foram lidos nem alterados.

**Nível de cobertura:** todos os arquivos descobertos passaram por inspeção estrutural automatizada do conteúdo. A revisão semântica aprofundada concentrou-se nos documentos de operação, instalação, segurança, Doctor, contratos e auditoria, cruzados com funções e chamadores. Isso não equivale a validar cada recomendação histórica, cada RFC citado ou todas as combinações dos 74 recursos. O escopo técnico incluiu descoberta de scripts de runtime, init/hotplug, controlador, ACL, testes e revisão dirigida dos fluxos de maior risco. Não foi auditado todo o código-fonte upstream do OpenWrt.

## 1. Discrepâncias documentais

| ID | Documento/origem | Divergência confirmada | Correção ou destino |
|---|---|---|---|
| D01 | `docs/README.md` | Índice se declarava 100% completo e ainda apontava versão 2.2.0 | Escopo explícito, referência a VERSION e caminho progressivo instalar → usar → diagnosticar → referência |
| D02 | Índice e gerador do catálogo | Exigiam a palavra SIM, apesar da decisão vigente de solicitação explícita | Removida exigência nos textos ativos alterados; registros datados preservam cronologia |
| D03 | `audit/STATUS.md` | Data de 19/10 e versões 2.0.1/2.1.6 apresentadas como atuais | Cabeçalho 05/11; versão atual 2.2.1; checkpoints antigos identificados |
| D04 | `FEATURE_AUDIT_AND_REBOOT.md` e metadata YAML | Versão 2.0.1 enquanto VERSION/Makefile declaravam 2.2.1 | Sincronização sem renumerar os 74 IDs |
| D05 | `network-diagnostics.md` | RAM exigia 80/60 MB; código alertava abaixo de 20 MiB. Flash documentada >2 MB, código usava 1500 KiB e inventava 99999 em falha | Documentação alinhada; código passa a alertar até 2048 KiB e em dado desconhecido |
| D06 | Contrato ARK-DIAG-001 | Dizia que Doctor não alterava Wi-Fi, omitia cache/log e estava integralmente funcional | Escopo de --fix explicitado; estado parcial; temporários, testes e limitações atualizados |
| D07 | Contratos ARK-FW-006 / ARK-SYS-007 | Quarentena/restart descritos como autocura segura; watchdog dizia reparar ubus continuamente | Contratos distinguem observação, instalador uhttpd e rotina de tema |
| D08 | `scripts/generate_feature_audit_md.py` | Inventava aprovação de `total_count - 3` recursos em VM, zero falhas e persistência sem executar testes | Estatísticas agora contam estados declarados; sem aprovação inferida; sobrescrita exige `--force` |
| D09 | Catálogo de persistência/idempotência | Texto gerado afirmava resultados sem revisão/cenário | Tabelas qualificadas como requisitos/persistência declarada; evidência vem dos lotes |
| D10 | Guia de ciclo de vida | Alegava validação exaustiva de todos os fluxos em VM e hardware, sem evidência vinculada | Tabela histórica qualificada; ressalva para DNS não exato reproduzido neste lote |
| D11 | `SECURITY.md` | Instalação descrita como cópia passiva, embora uci-defaults altere UCI e serviços | Modelo corrigido; ACL de escrita e limites documentados |
| D12 | Scripts de teste e segurança | Usavam ARK_ROUTER_PASSWORD em vez da variável exigida ARK_ROUTER_TEST_PASSWORD | Referências desses scripts padronizadas; browser runner recebe navegador configurável e alvo local por padrão |
| D13 | `generate_code_map.py` | Metadados fixavam TTL 120s para caches de 10/30s e chamavam hotplugs de autocura | Fonte do gerador corrigida e CODE_MAP regenerado |
| D14 | `run_local_tests.sh` / `audit_docs.py` | Runner não passava --strict ao i18n; auditor documental ignorava --strict para avisos e dizia comprovar 100% dos documentos | Gates estritos efetivos; resultado limitado aos checks implementados; testes locais não autorizam deploy |
| D15 | `PLAYBOOK.md`, READMEs e manual de subsistemas | Autocura contínua/imunidade a regressões tratadas como comportamento atual | Notas de revisão local e fonte canônica do Doctor; lições antigas contextualizadas |
| D16 | `audit/DECISIONS.md` / `CORRECTION_AND_VALIDATION.md` | 70 IDs e implementação do lote 001 ainda descrita como pendente | 74 IDs e estágio estrutural já implementado registrados |
| D18 | Manual de subsistemas | `wifi-qca-apply-roaming-tuning` e `speedtest-download-fallback` apresentados como comandos públicos, embora sejam derivados de funções internas | Entradas substituídas por `wifi-roaming-toggle` e `speedtest-start`; distinção CLI/script/símbolo explicitada |
| D17 | Evidência histórica externa ao repositório canônico | Um link relativo quebrado em `Evidencias locais/PUBG-ABC-2026-11-05/PUBG-ABC-resultado.md`, linha 65 | Documento preservado; alvo correto no repositório é `docs/DIAGNOSTICO_W6X_SONDAS_WAN_2026_10_29.md` |

A busca de referências de código produziu seis candidatos ausentes: cinco referiam-se a fontes explicitamente removidas em registros históricos e um a `src/ap/sta_info.c` upstream do hostapd. Não foram classificados como scripts quebrados. Nenhum link relativo quebrado foi encontrado no conjunto canônico pela varredura inicial. Isso não verifica links HTTP, anchors ou conteúdo de páginas externas.

Documentos de entrada novos: [uso prático](../../USAGE_AND_TROUBLESHOOTING.md) e [modelo de segurança do Doctor](../../DOCTOR_SAFETY_MODEL.md). Alertas de recuperação distinguem aplicativo, firmware, failsafe e TFTP por modelo, com backup externo e identidade/hash da imagem.

## 2. Matriz de erros lógicos e correções

P1 = risco de conectividade, autorização ou integridade; P2 = confiabilidade/observabilidade. “Corrigido” abaixo significa patch local e a evidência indicada, não homologação em roteador.

| ID | Prioridade | Mecanismo e causa raiz | Patch/estado | Evidência |
|---|---|---|---|---|
| L01 | P1 | `handle_doctor --auto` promovia qualquer evento/cron a `_auto_fix=1` | Automático sempre observacional, mesmo combinado com --fix | Regressão de combinações e chave legada |
| L02 | P1 | Auditoria de leitura chamava promoção CAKE, correção MTU/RA/CLAT e removia flowtable fora de `auto_fix` | Mutações isoladas do modo de leitura | Snapshot UCI + spies nos quatro helpers |
| L03 | P1 | Checagem fw4 chamava iptables-save/ip6tables-save | Consulta passiva em /proc; ramificação fw3 explícita | Wrappers sentinela não executados em fw4 |
| L04 | P1 | Doctor movia firewall.user inteiro e anunciava saneamento sem pós-condição | Em fw4, recomenda revisão e preserva arquivo/pacotes/regras | Regressão conserva firewall.user e WARN |
| L05 | P1 | Pressão de flash removia lock de opkg, caches e todos os *.tmp | Limpeza genérica retirada; dado desconhecido/limite baixo vira WARN | Casos de falha df e 2048 KiB |
| L06 | P1 | Lock global removia dono vivo após 120s; Doctor roubava lock sem PID | Dono vivo/ausente preservado, recuperação de morto serializada, liberação por posse | Casos de dono vivo antigo, vazio, morto e terceiro |
| L07 | P1 | Trap de sinal podia liberar exclusão mútua e continuar a mutação | Controlador, restaurador de trap e Doctor encerram após sinal | TERM retorna 130; sem execução posterior/lock residual |
| L08 | P1 | Grupo ACL read permitia executar controlador mutante e nlbwmon-action com quaisquer argumentos | Execução movida ao grupo write | Validação estrutural ACL; sessão rpcd real ainda pendente |
| L09 | P1 | Firewall guard movia todos os includes exceto o próprio e matava serviços por preferência ARK | Observação sem quarentena/kill/restart; rotina de tema preservada | Falha nft simulada, UCI/regras/processos preservados |
| L10 | P1 | Web watchdog matava nginx, abria prefixo IPv6 global e reescrevia WireGuard com valores fixos | Sonda HTTP somente observacional; retiradas mutações específicas | Duas sondas falhas geram aviso sem comandos mutantes |
| L11 | P1 | `feature-toggle sqm 0` apagava ingress de todas as interfaces e baixava todos os IFB com prefixo genérico | Limpeza delegada ao serviço SQM, sem varredura global | Repetição da desativação sem ip/tc alheio |
| L12 | P2 | Preferência SQM era gravada antes de parar serviço; erros suprimidos | Serviço/UCI/retorno conferidos, preferência após sucesso | Stop falho conserva estado solicitado anterior |
| L13 | P2 | Argumento inválido de toggle virava desligamento; chave desconhecida criava seção | Estado 0/1 e chave conhecidos exigidos antes de escrever | Snapshot UCI preservado em entradas inválidas |
| L14 | P2 | Contenção Doctor sem cache retornava saída vazia; cache antigo parecia novo | JSON explícito busy; rajadas sequenciais coalescidas por 60s | Contenção sem cache, eventos repetidos, timestamp futuro |
| L15 | P2 | Contagens WARN/FAIL dependiam de incrementos manuais espalhados | Contagem central em add_check | Resumo coincide com checks emitidos |
| L16 | P2 | Instalador editava `/sbin/reload_config`, pertencente ao OpenWrt | Novas instalações usam cron/hotplugs próprios; hook antigo chama --auto seguro | Revisão de fonte; migração nativa ainda pendente |

Fontes principais: [doctor.sh](../../../root/usr/lib/ark/modules/doctor.sh), [common.sh](../../../root/usr/lib/ark/common.sh), [ezsetup.sh](../../../root/usr/lib/ark/modules/ezsetup.sh), [ACL](../../../root/usr/share/rpcd/acl.d/luci-app-equipe-dashboard.json), [firewall guard](../../../root/etc/init.d/ark-firewall-guard) e [web watchdog](../../../root/usr/sbin/ark-web-watchdog). Símbolos/faixas atuais constam do [CODE_MAP](../../CODE_MAP.md).

## 3. Falhas abertas e patches recomendados

| ID | Prioridade | Causa/evidência | Refatoração necessária e aceite |
|---|---|---|---|
| R01 | P1 | --fix ainda executa muitos commits/reloads, suprime retornos e incrementa FIXED sem rechecagem | Executor por ação com plano, propriedade, snapshot, pós-condição e rollback; falha de cada serviço deve impedir FIXED |
| R02 | P1 | `adblock_restore_dns` filtra servidores por domínio/locais, prioriza configuração atual sobre backup e força cachesize=1000 | Snapshot tipado de listas/opções/ausência, capturado só na primeira ativação; restauração exata com conflito detectado. [Reprodução](../evidence/runtime-2026-11-05/dns-restore-reproduction.json): servidor sintético por domínio perdido, 4096→1000, retorno 0 |
| R03 | P1 | Outros ramos de feature-toggle gravam sucesso solicitado e suprimem erro; `hardware_tune` restaura valores fixos 1000/0 | Migrar cada toggle para proprietário único, estado solicitado/efetivo e reversão por snapshot; falhas não podem exibir sucesso |
| R04 | P1 | Desligamento mwan3 remove regras por faixa de prioridade sem comprovar proprietário | Remover somente regras do serviço, preservando PBR externo; testar coexistência com VPN/CLAT |
| R05 | P1 | `ark_firewall_engine` infere fw3 quando não identifica fw4, inclusive ambiente desconhecido | Resultado unknown e recusa de mutações até confirmação positiva do backend; matriz fw3/fw4/ausente |
| R06 | P2 | Doctor manual trata overhead/MTU/WPA3/ZRAM/timezone como norma universal e pode sobrescrever intenção | Converter recomendações em checks contextuais, respeitar opt-out e parâmetros medidos; testar capacidades/hardware |
| R07 | P2 | Cliques de ativação/desativação usam `reloadAfterExpectedDisconnect`; falha de transporte pode gerar mensagem otimista sem estado confirmado | Reconsultar estado efetivo após reconexão, com timeout e mensagem pendente; teste de RPC interrompido |
| R08 | P1 | Alterar UCI e habilitar serviço antes de falha no restart de SQM ainda pode deixar aplicação parcial | Transação do recurso e rollback dos valores alterados, sem apagar alterações externas; injetar falha em cada estágio |
| R09 | P2 | Lock sem PID e morte durante recuperação conservadora pode exigir limpeza supervisionada | Identidade de processo mais robusta/lock nativo no alvo; testar interrupção em cada janela sem roubar dono vivo |
| R10 | P2 | `doctor-status` usa cache sem limite temporal; leitura concorrente não é snapshot global | Exibir idade/estado obsoleto e observações desconhecidas; atualização agendada com custo medido |
| R11 | P1 | Grupo somente leitura perde chamadas gerais do dashboard após fechar ACL permissiva | Implementar fachada RPC de leitura com lista explícita de métodos; validar dois perfis de sessão no rpcd real |
| R12 | P2 | Manuais técnicos extensos contêm afirmações de RFC/RF/desempenho sem teste vinculado | Revisão temática por seção com fonte primária e cenário; não usar slogans “zero drop/0ms/imune” como resultado |

Os achados R03–R12 são revisão de fonte/arquitetura, não incidentes físicos reproduzidos nesta sessão. L01/L09/L10 mostram mecanismos capazes de causar instabilidade; não demonstram que causaram as pausas WAN estudadas nos lotes QoS anteriores.

## 4. Doctor reformulado e UX de interruptor

O modelo implementado separa observação automática de reparo manual. A lista de mutações autônomas de rede está vazia até existir ação com pré-condições, propriedade, orçamento de tentativas, retorno e teste. O [modelo detalhado](../../DOCTOR_SAFETY_MODEL.md) define a migração do reparador em lote para planos por ação.

O usuário deve escolher apenas ligar/desligar. Internamente, cada recurso precisa seguir: validar capacidade → preservar estado original → aplicar dependências → confirmar efeito → atualizar estado exibido. Desligar exige parar o proprietário e restaurar seu snapshot, preservando alterações posteriores e recursos compartilhados. A ausência de snapshot deve aparecer como limitação, não justificar restaurar arbitrariamente um “padrão”.

A Central já trata retorno não zero como erro. O backend SQM agora permite que essa informação chegue à interface. O [teste visual](../evidence/runtime-2026-11-05/browser-fixture.json) usa o método original, falha simulada e screenshots a 360/1280 px: estado anterior mantido, botão reabilitado, mensagem visível, zero exceções/console.error e sem overflow. O CSS/DOM externo é de fixture; isso não valida o tema completo, autenticação ou todas as telas LuCI.

## 5. Validação e restrições

- Baseline anterior aos patches: runner local aprovado, apesar dos defeitos encontrados. Evidência de que os testes anteriores não cobriam esses mecanismos.
- Runner final: **155 testes locais**, com **22 regressões de segurança**, **2 de gerador**, **74 contratos** e **7 rejeições negativas do esquema**. Gates estritos aprovados.
- Regressões novas de segurança: política automática, ausência de mutações em leitura, fw4 sem wrappers, flash, locks, sinais, ACL, guardas, entradas e desligamento SQM. Contagens finais em [validation.json](../evidence/runtime-2026-11-05/validation.json).
- Testes de firewall foram atualizados para exigir preservação e aviso em vez de quarentena/migração automática.
- Gates: shell/JS, bundle determinístico, matriz WAN/QoS/interferência, contratos, preservação de estado, documentação, i18n estrito, CODE_MAP e minificação. São evidências locais; UCI/serviços em sandbox são mocks.
- Screenshot: Chromium real com RPC/DOM LuCI simulados; nenhum frontend de produção foi alterado.
- VirtualBox: `VBoxManage list vms` retornou 126; o wrapper aponta para `/Applications/VirtualBox.app/Contents/MacOS/VBoxManage`, que não existe. Sem VM identificada/snapshot, nenhuma validação nativa foi declarada. QEMU instalado não foi apresentado como substituto de uma VM VirtualBox validada.
- Hardware: nenhum comando, deploy, reboot ou medição física. A exceção de QoS anterior não foi estendida a esta auditoria.
- Consulta externa: ferramenta de busca recusou a requisição (403 de autorização). Conclusões deste lote usam fontes locais e testes; nenhuma verificação de documentação upstream foi inventada.

## Retomada

Atualização posterior: o usuário solicitou aplicação e testes reais. A implantação no W6x, diagnóstico nativo, ACL e screenshots LuCI estão no [lote 022](022-runtime-native-deployment.md). Este documento preserva a evidência local original; o lote posterior não encerra R01–R12 nem homologa reboot/fw3.

Priorizar R01/R02/R03 e a validação VirtualBox fw3/fw4. Antes de release, executar instalação/atualização/reboot, duas sessões RPC com níveis distintos, rollback com falhas injetadas, tráfego Dual-WAN/IPv6/SQM e telas LuCI reais. Os relatórios anteriores de QoS continuam válidos somente para seus respectivos hashes e cenários.
