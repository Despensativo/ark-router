# Lote 032 — implantação e validação visual no W6x

Data: 07/11/2026. Continuação da [implementação local](031-ui-refresh-implementation.md). O usuário pediu explicitamente aplicação direta no W6x e validação; esta autorização cobre a exceção operacional à precedência da VM **para este teste de UI**. Não cobre publicação, atualização de pacote ou outros roteadores.

## Alvo, artefato e retorno

- Alvo confirmado: Acer Predator Connect W6x em `192.168.73.1`, LuCI/OpenWrt 25.12.6, sessão SSH por chave e SFTP funcional. `uhttpd` permaneceu em execução. Espaço livre em `/overlay`: 46.060 KiB antes, 45.712 KiB no fechamento.
- Arquivo alterado **somente**: `/www/luci-static/resources/view/equipe-dashboard/overview.js`. Nenhum backend, UCI de rede, pacote, serviço ou firmware foi implantado/reiniciado.
- SHA-256 anterior: `780e3e61df2981c9af3e30bcc4f230840d147810878d25b0fcccff0db14bfddc`. Cópia conferida em `/tmp/ark-ui-overview-pre-20261107.js` no W6x e em `/tmp/ark-w6x-overview-pre-ui-20261107.js` no Mac. Ambos são arquivos temporários; preservar cópia local antes de reiniciar qualquer máquina se for necessário manter rollback futuro.
- Fonte final `src/modules/system.js`: SHA-256 `304f28601640c18a09bdf9c202f50b79b35225eefb3ab42bbede9cb2033bcc00`. Bundle minificado final aplicado: SHA-256 `cdc0dee44646390c752d0b670a17c31fb3c17d8dfc6cf1d5d0531dcefae4395d`, 1.052.777 bytes, modo `0644`, `root:root`. Envio por SFTP para nome temporário no mesmo diretório, hash conferido e substituição por `mv` no mesmo filesystem.
- A primeira revisão aplicada (`8b778e32…`) confirmou a alternância sem recarga, mas mostrou que a Central reabria no topo após pausar. Ajustado `confirmFeatureChange` para rolar ao recurso após o modal terminar de montar; gerado e aplicado o bundle final acima. Não foi necessário rollback.

## Resultados observados no navegador real

| Cenário | Evidência observada |
|---|---|
| Carga do bundle | Após recarga com cache do navegador desabilitado, `_arkViewInstance.confirmFeatureChange` existe e contém o ajuste de rolagem. Zero erros no console capturado. |
| WoL ativo → pausado | Central indicou **Desativado pelo usuário**, navegação e cartão WoL indicaram **PAUSADO**, e `features.wol.active=false`. UCI: `user_disabled=1`, `enabled=0`, `user_removed=0`. A página não navegou/recarregou (`performance.timeOrigin` preservado). |
| WoL pausado → ativo | Central voltou a **Instalado e ativo**, cartão a **PRONTO (ETHERWAKE)** e `features.wol.active=true`. UCI final: `user_disabled=0`, `enabled=1`, `user_removed=0`. Sem recarga de página. A sequência foi repetida no bundle final. |
| Usabilidade do modal | Após o ajuste final, a linha do WoL reapareceu dentro da viewport móvel (`top=261`, `bottom=584` em 390×844) após confirmar a pausa. O botão correto permaneceu disponível para reativar. |
| Layout e navegação | Em 360 e 1280 px, `documentElement.scrollWidth <= innerWidth` e modal sem overflow horizontal; os três botões da linha WoL mediram 40 px de altura. A navegação **Recursos → WoL → Central WoL → voltar** abriu/fechou as seções esperadas. Zero erros de console nas verificações. |

Capturas reais do navegador foram observadas nesta sessão em 390, 360 e 1280 px, inclusive com a linha WoL pausada e depois ativa. A evidência estruturada e a fixture local atualizada estão em [evidence/032-ui-refresh-live](../evidence/032-ui-refresh-live/).

## Testes e limites

- `tests/test_ui_capability_sync.cjs`: 8 cenários passaram. Chrome local com RPC/LuCI simulados: 10 cenários (360/390/1280) sem erro de console e sem overflow nos nove cenários com captura. `node --check`, bundle, mapa de código, auditorias de shell/contratos/preservação e minificação passaram.
- `tests/run_local_tests.sh` **não ficou verde**: i18n estrito aponta 54 strings pendentes em EN e ES, quatro em linhas novas deste trabalho. `audit_docs.py --strict` aponta dois documentos órfãos no índice mestre, pendência já presente antes deste lote. O teste físico autorizado foi experimental e não é aprovação de release.
- O ensaio real cobriu WoL, a Central, seu fluxo de confirmação, responsividade e navegação indicada. **Não** demonstra que todos os outros 18 recursos alternáveis, 14 remoções, instalação de pacotes, criação/exclusão de SSID, WAN, fw3/opkg, reboot e outros modelos estejam aprovados. A VM VirtualBox segue indisponível neste host; a exceção do usuário permitiu esta verificação incremental no W6x.
- Estado final: WoL restaurado ativo; bundle final `cdc0dee44646390c752d0b670a17c31fb3c17d8dfc6cf1d5d0531dcefae4395d` confirmado no W6x, `uhttpd` ativo, nenhum erro de console observado. Sem commit, push ou publicação.
