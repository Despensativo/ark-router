# Evidências locais da auditoria de runtime

Nenhum arquivo desta pasta contém configuração coletada de roteador real.

- `markdown-inventory.json`: inventário estrutural de Markdown, hashes, referências locais e candidatos à revisão. Não certifica revisão semântica de cada parágrafo.
- `validation.json`: comandos executados, contagens de testes, limitações e hashes dos fontes alterados neste lote.
- `dns-restore-reproduction.json`: restauração DNS em UCI simulado; entrada por domínio perdida e cache alterado de 4096 para 1000. Defeito ainda aberto.
- `browser-fixture.json`: método original `toggleFeatureState` de `src/modules/system.js` em Chromium com RPC/DOM LuCI simulados. A falha de desativação mantém o estado ativo e permite nova tentativa.
- `sqm-stop-failed-360.png` e `sqm-stop-failed-1280.png`: screenshots reais da fixture; não são screenshots de uma VM LuCI nem evidência de roteamento.

O [relatório 021](../../batches/021-docs-runtime-doctor-audit.md) distingue mudanças implementadas, recomendações e validação pendente.
