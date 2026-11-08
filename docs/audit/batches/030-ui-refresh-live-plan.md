# Lote 030 — confirmação no W6x e plano de sincronização visual

Data: 07/11/2026. Continuação do [lote 029](029-ui-state-refresh-audit.md). O usuário autorizou testar o W6x real. Escopo desta etapa: diagnóstico, teste reversível de Wake-on-LAN (WoL) e plano; nenhum arquivo de produção foi editado ou implantado.

## Identificação e proteção do alvo

- Alvo confirmado via SSH: Acer Predator Connect W6x (Stock Layout), OpenWrt 25.12.6, kernel 6.12.112, ARK 2.2.1. SFTP instalado e transferência funcional.
- A rota LuCI usa `equipe-dashboard/overview`. O bundle instalado é minificado (SHA-256 `780e3e61…`); o bundle legível local tem SHA diferente (`24a44ebc…`). Os trechos minificados de `toggleFeatureState`, `fetchCapabilities`, `triggerImmediateRefresh` e `reloadSoon` preservam os mecanismos examinados no lote 029. A diferença de hash isolada não identifica versão funcional diferente.
- Escolhido WoL porque o backend trata `wol|htop` apenas como preferência `user_disabled`/`enabled`, sem parar rede, rádio ou serviço de encaminhamento (`ezsetup.sh:257–276, 413–420` do runtime). Estado original: `user_disabled=0`, `enabled=1`, `user_removed=0`, `features.wol.active=1`.

## Resultado do teste real

| Etapa | Backend selecionado | Interface LuCI observada |
|---|---|---|
| Estado inicial | WoL ativo, preferência habilitada | “Pronto” e “Instalado e ativo” |
| Desativar pela Central | `user_disabled=1`, `enabled=0`, `features.active=0` | Após a recarga automática, ainda “Pronto”/“Instalado e ativo”; uma recarga manual adicional mostrou “Pausado”/“Desativado pelo usuário” |
| Reativar pela Central | `user_disabled=0`, `enabled=1`, `features.active=1` | Após a recarga automática, ainda “Pausado”; outra recarga manual mostrou “Pronto” |
| Teste discriminante: desativar pelo CLI e recarregar uma vez | `features.active=0` confirmado antes da carga | A interface ainda mostrou “Pronto”, enquanto `sessionStorage.ark_caps.features.wol.active` já havia sido atualizado em segundo plano para `false` |
| Restaurar pelo CLI e recarregar uma vez | `features.active=1` confirmado antes da carga | A interface mostrou “Pausado”, enquanto `sessionStorage.ark_caps.features.wol.active` já era `true`; a segunda carga exibiu “Pronto” |

**Causa demonstrada para WoL:** `fetchCapabilities()` usa o snapshot de `sessionStorage` na montagem, inicia uma leitura nova de `features` em segundo plano e atualiza o cache, mas não reatribui `this.capabilities` nem redesenha a tela já montada. A primeira carga usa o estado anterior; a segunda usa o cache renovado. O backend retornou o novo estado antes das cargas no teste discriminante, refutando a hipótese de atraso do commit/backend como explicação principal deste caso. A alternância central ainda depende de `location.reload()` após 650 ms; esses são dois problemas distintos.

Um erro de console `RPCError uci/get -32002: Access denied` foi observado na sessão. Não foi vinculado causalmente ao WoL; faltam método/configuração e baseline anterior para atribuição. Não contar como falha da alternância.

**Estado final verificado:** WoL restaurado a `user_disabled=0`, `enabled=1`, `user_removed=0`, `features.active=1`; badge LuCI “Pronto”. Nenhuma alteração de WAN, LAN, Wi-Fi, firewall, SQM ou pacote.

## Conferência com o Argo

O proxy local Argo foi consultado com `gemini-4-argon-high` usando somente resumo técnico filtrado. A primeira resposta tratou o hash distinto como impedimento de atribuição ao runtime; a inspeção do bundle minificado e o teste real refutaram essa cautela para os trechos testados. A segunda resposta propôs corrida no cache do backend após 650 ms; o teste CLI → backend `features` correto → primeira carga visual antiga com cache de sessão já atualizado refutou essa causa para WoL. A contribuição aproveitada foi separar estado backend, rede, cache e DOM com teste reversível, sem tocar na conectividade de administração. Recomendações de cópia grande na flash e bind mount não foram executadas.

## Plano de ação

| Fase | Trabalho | Critério de conclusão |
|---|---|---|
| 0 — base e regressão | Criar teste determinístico para cache antigo na primeira carga, resposta nova em segundo plano, alteração por outra aba e retorno de aba oculta. Fixar o estado do recurso no backend simulado e conferir DOM/capacidades. | O teste reproduz o WoL antigo antes da correção e falha pelo motivo esperado. |
| 1 — correção mínima do cache | Em `fetchCapabilities`, não deixar revalidação em segundo plano atualizar apenas `sessionStorage`/`window`; atualizar `this.capabilities` e as partes dependentes, ou aguardar a leitura nova em caminhos pós-mutação. Invalidar cache antes de recarga forçada, sem depender da versão do pacote para refletir configuração runtime. | Após alternar WoL, a **primeira** carga/transição mostra o mesmo estado de `features` e UCI; zero F5 adicional. |
| 2 — confirmação de ação e falhas | `triggerImmediateRefresh` deve propagar falhas; `reloadSoon` só marca sucesso após leitura válida e paridade do estado esperado. Para timeout/resposta perdida, consultar o destino antes de dizer que aplicou ou de repetir a mutação. Liberar trava com mensagem de estado “não confirmado” e tentativa de reconciliação limitada. | Sucesso, erro RPC, timeout antes/depois do commit e perda temporária de conexão têm badge correto ou aviso honesto; nunca falso sucesso silencioso. |
| 3 — atualização localizada | Na Central, trocar a linha afetada, barra de ciclo de vida e badges do cockpit a partir das capacidades novas, preservando foco/scroll; retirar `location.reload()` de alternâncias simples. Manter navegação completa só para tema, idioma, assets/instalação ou mudança de endereço/rota. | Ativar, pausar e reativar WoL/um segundo recurso seguro sem piscar a página, sem duplicar listeners, com UI e backend iguais. |
| 4 — estrutura e múltiplas abas | Aplicar diff por chave para cartões de SSID extra e WAN; ao voltar do segundo plano ou ganhar foco, revalidar capacidades com taxa limitada. Em mudança de IP, indicar reconexão e destino correto. | Adição/remoção aparece sem cartão órfão; mudança em outra aba aparece ao voltar ao foco, sem sobrescrever formulário aberto. |
| 5 — validação e entrega | `tests/run_local_tests.sh`, contratos/documentação afetados, screenshot real Chrome 360/390/1280 e console; depois VM fw4/apk e mocks fw3/opkg/topologia. Só então teste incremental no W6x com WoL e estado/restauração documentados. | Todos os gates aprovados no código/pacote identificado; RAM/flash/CPU sem regressão relevante; rollback comprovado. |

### Limites de execução

- O executável VirtualBox continua quebrado neste host. O teste acima examinou o runtime existente; a alteração de código planejada permanece pendente de validação em VM conforme `AGENTS.md` ou decisão explícita que trate essa precedência.
- Não repetir em WAN, LAN, Wi-Fi principal, firewall, SQM, VPN de acesso ou armazenamento durante a descoberta de UI. Usar WoL para o ciclo inicial e comparar com `features`/UCI, preservando o estado original.
- Antes de qualquer teste de bundle novo no roteador, confirmar mecanismo de sobreposição e rollback no ambiente alvo; manter backup do arquivo original em RAM e verificar espaço. Não copiar bundles grandes para `/root`/flash por hábito.
