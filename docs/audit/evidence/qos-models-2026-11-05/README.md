# Evidências — comparação QoS, 05/11/2026

Origem: hardware W6x autorizado, cliente Mac Ethernet, BufferSpeed instalado **0.2.8 build 27** e navegador integrado. [Relatório e limites](../../batches/024-qos-models-and-test-protocol.md), [procedimento reutilizável](../../../QOS_TEST_PROTOCOL.md).

- `app-runs.json`: seis resultados novos do aplicativo, três CAKE e três HFSC.
- `web-runs.json`: seis BufferSpeed web; dezesseis conexões/dez segundos por fase.
- `waveform-hfsc-runs.json`: três resultados com detalhes numéricos e links públicos; não são amostras brutas CSV. Mínimo negativo preservado como artefato do site.
- `fast-hfsc-runs.json`: três resultados concluídos, incluindo upload e latência carregada; FAST não fornece nota A+.
- `collector-periods.json`: quatro períodos separados, com janelas, sondas e limitações. **O período networkQuality é inválido**; seu resumo temporal termina junto com a telemetria remota e não abrange todo o gap do reboot. `reboot-observation.json` registra esse gap a partir das sondas completas do cliente.
- `tcp-incidents.json`: conexões IPv4 TCP de pelo menos um segundo ou falhas, com CPU/filas próximas e janelas. Uma amostra próxima não demonstra causalidade de uma fase exata.
- `quick-invalid.json`: três tentativas descartadas; retorno zero do processo coexistiu com erro interno −1001. Não contar como três cargas válidas.
- `panic-selected.txt` e `pstore-preservation.json`: somente linhas necessárias ao contexto SPI/LED/Oops/panic e hashes dos dois originais preservados. Não constituem stack simbolizado.
- `restoration.json` e `nft-final-structure.json`: conferência final, incluindo **hash nft diferente** e interfaces Wi-Fi adicionais já existentes no começo dos testes HFSC depois do reboot. As flags falsas não foram ocultadas; RPS/segmentação das interfaces originais e configuração SQM foram restaurados.
- `provenance.json`: HEAD de referência, árvore local modificada, scripts efetivamente instalados e hashes do coletor. O coletor em execução e a revisão final têm hashes distintos porque os guardas/relatório foram corrigidos após a falha; os guardas foram exercitados em testes locais, sem provocar outro panic físico.
- `validation.json`: resultado da bateria local final, separado da validação física e dos mocks.
- `sha256sums`: integridade dos arquivos desta pasta, excluindo metadados AppleDouble `._*` do ExFAT e o próprio manifesto.

As capturas `cake-app-*`/`hfsc-app-*` foram reduzidas para 1800 px de largura. Capturas web mostram o viewport observado e podem cortar o início do cartão; os campos completos estão nos JSONs. FAST foi recortado antes da seção de identificação do cliente, preservando os quatro números usados no relatório. O recorte dos demais sites remove a faixa inferior publicitária quando presente. Nenhuma captura teve números ou notas editados.

Backups SQM, telemetria integral, pstore original e scripts temporários permanecem privados em `Evidencias locais/QoS-024-models-2026-11-05/`, relativo ao workspace. Configurações, IP público, identidade do cliente e dados de conta não foram incluídos nesta pasta. Sem commit, push ou publicação.
