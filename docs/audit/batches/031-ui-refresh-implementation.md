# Lote 031 — reconciliação visual após ações

Data: 07/11/2026. Continuação do [diagnóstico no W6x](030-ui-refresh-live-plan.md). O código deste lote permanece **local**; o bundle novo não foi instalado no roteador.

Registro posterior: a revisão final, com ajuste adicional de rolagem do modal, foi [aplicada e validada no W6x no lote 032](032-ui-refresh-w6x-live.md). As afirmações de ambiente local abaixo referem-se ao checkpoint anterior à implantação.

Identificação: SHA-256 de `src/modules/system.js` `b75aa5ce1038fae5bb37b1291576d1825e7e17eca818b3e04957bbd32aa1e9c2`; bundle gerado `overview.js` `d15726a2f4f89f37dcbffcc26381b9209d5eef27f2974425bdade8936aabd036`.

## Mudanças aplicadas

| Caminho | Comportamento novo |
|---|---|
| Primeira carga com cache de sessão | A resposta `features` em segundo plano atualiza `this.capabilities`, o cockpit, as linhas abertas da Central e o badge de WoL. Respostas anteriores à transação/geração atual ou recebidas durante uma mutação são descartadas. |
| Alternar, ocultar e remover recurso | A resposta RPC não muda mais o estado visual por suposição. A leitura forçada de `features` confirma os campos esperados, com até três leituras. Só então aparece mensagem de sucesso; a Central é reaberta após confirmação de desativação/remoção. |
| Erro RPC ou leitura inconclusiva | Erro RPC preserva o estado anterior e permite tentar novamente. Uma leitura inconclusiva gera aviso, sem afirmar sucesso e sem repetir a mutação. `reloadSoon` limita as novas leituras a cinco tentativas. |
| Abas e foco | O retorno à aba revalida capacidades com intervalo mínimo de cinco segundos. A linha da Central só é substituída se a assinatura visual mudou; foco do botão e posição da lista são conservados. |
| WoL | O badge usa a capacidade `active`: instalado e pausado mostra **PAUSADO**, instalado e ativo mostra **PRONTO**. |
| Mudanças estruturais | Tema, criação/exclusão de SSID, alteração de WAN, preparação de WAN para Speedify, restauração de porta WAN e troca de modo de rede usam recarga controlada com `ark_caps` invalidado. Instalação concluída e alternâncias específicas de AdBlock/Speedify também invalidam esse cache antes da recarga. A lista de cartões ainda é montada pela carga integral. |

## Evidência executada

- `tests/test_ui_capability_sync.cjs`: oito cenários em Node, incluindo cache antigo seguido de resposta nova, resposta ultrapassada após nova transação, duas leituras forçadas fora de ordem, leitura forçada inválida, falha de hot refresh, cinco tentativas de reconciliação, confirmação positiva e recarga estrutural com invalidação de cache.
- `tests/capture_feature_toggle_fixture.py`: Chrome real headless em 360, 390 e 1280 px; nove combinações de largura e cenário (erro RPC, confirmação positiva, resposta sem estado esperado), mais um cenário de reconciliação da linha com foco preservado em 390 px. Sem `pageerror`/`console.error` e sem overflow horizontal nos nove cenários com captura. O teste usa método frontend original e backend/LuCI simulados; não comprova comportamento no W6x com o bundle novo.
- [Evidência filtrada](../evidence/031-ui-refresh/browser-fixture.json) e capturas: [erro RPC 360 px](../evidence/031-ui-refresh/sqm-stop-failed-360.png), [sucesso 390 px](../evidence/031-ui-refresh/sqm-stop-synced-390.png), [estado inconclusivo 360 px](../evidence/031-ui-refresh/sqm-stop-unconfirmed-360.png).
- `node --check` dos arquivos modificados, geração de bundle e `scripts/generate_code_map.py --check` aprovados. `tests/verify_feature_contracts.py`, auditoria de shell, matriz local de Python e preservação de estado passaram na execução do runner.
- O runner completo parou no gate de i18n: 54 strings atuais faltam em EN e ES; quatro delas aparecem em linhas novas deste lote. A tradução em lote fica para o portão de pré-release definido em `AGENTS.md`. `scripts/audit_docs.py --strict` também falhou separadamente por dois documentos órfãos preexistentes no índice mestre; o aviso de tamanho de `TASK.md` já excedia o limite antes deste lote. Minificação e `git diff --check` passaram separadamente.

## Validações ainda necessárias

- A VM VirtualBox `OpenWrt-ARK-Dev` continua inacessível neste host: `/usr/local/bin/VBoxManage` aponta para executável ausente. O requisito de testar alterações primeiro na VM impede implantação do bundle novo no W6x neste momento. A sessão real anterior validou somente o defeito da versão instalada e restaurou WoL ativo.
- Não há comprovação de reboot, persistência após atualização, interferência entre recursos, fw3/opkg, nem de todos os 19 alternáveis/14 removíveis no hardware com o código novo. O teste de browser é uma fixture, não a tela LuCI completa. Mudanças de SSID/WAN ainda exigem recarga de página por construção dos cartões; a reconexão após mudança de IP precisa de ensaio operacional.
- Antes de concluir ou publicar: recuperar VirtualBox, executar matriz de VM/apk/fw4 e fw3/opkg mockado, navegar no LuCI real da VM em telas móveis/desktop, conferir console/estado backend/reboot, passar gates de i18n e documentação e então repetir WoL reversível no W6x com backup e verificação de retorno.
