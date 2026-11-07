# Bufferbloat — nove testes reais em 05/11/2026

Três rodadas sequenciais em Waveform, Cloudflare e FAST.com, pela Ethernet do Mac através do W6x 192.168.73.1. CAKE 720/620 Mb/s preservado. Janela de monitoramento: 19:59:39–20:22:15, São Paulo.

- `results.json`: nove resultados, valores médios/medianos conforme cada site, picos disponíveis, CPU, contadores de filas, sondas complementares e preservação de estado.
- `browser-runs.json`: transcrição dirigida dos resultados visíveis; exclui endereço público, identidade do provedor e dados do cliente mostrados pelos sites.
- `waveform-1.csv`, `waveform-2.csv`, `waveform-3.csv`: exportações originais do Waveform. Não houve exportação CSV bem-sucedida do Cloudflare no navegador integrado.
- `waveform-1.jpg`, `waveform-2-result.jpg`, `waveform-3.jpg`: resultados Waveform; a segunda captura foi recortada para mostrar os números e a nota.
- `cloudflare-2.jpg`, `cloudflare-3.jpg`: painel principal do Cloudflare, recortado para excluir a identificação do cliente.
- `fast-2.jpg`, `fast-3.jpg`: resultados FAST; a região de identificação abaixo das métricas foi excluída usando a posição do rótulo Cliente na imagem.
- `sha256.json`: integridade dos arquivos desta pasta, exceto o próprio manifesto.

Scripts e telemetria completa: `Evidencias locais/Bufferbloat-023-2026-11-05/`, relativo ao workspace. O [relatório 023](../../batches/023-bufferbloat-three-sites.md) explica diferenças de método, limites de saturação, lacunas ICMP e conclusão.
