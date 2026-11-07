# Evidência local da revisão QoS — 05/11/2026

- [Relatório e limites](../../batches/005-qos-review-2026-11-05.md).
- [Resumo das suítes executadas](test-summary.txt).
- [Resultados das reproduções isoladas](reproductions.json).
- [Script de reprodução](reproduce.py).

Para repetir as reproduções, executar **a partir da raiz do repositório**, em ambiente local com Python 3 e shell:

```sh
python3 docs/audit/evidence/qos-2026-11-05/reproduce.py
```

O script usa o `RouterSandbox` existente, com arquivos/configuração temporários no disco local, e funções TC/IP simuladas. Não conecta a roteadores nem instala qdiscs no hospedeiro. Não precisa de credenciais. Depende da mesma árvore de código e do harness; resultados podem mudar após correções.

## Consolidação do diagnóstico de jogo

- [Solução consolidada, relato do iPad por cabo e limites dos logs](../../batches/006-gaming-latency-solution-2026-11-05.md).
- [Analisador offline dos arquivos originais](analyze_monitor_logs.py), sem conexões à rede.
- [Resumo com endpoints anonimizados e hashes das fontes](monitor-analysis.json).

Uso: `python3 docs/audit/evidence/qos-2026-11-05/analyze_monitor_logs.py CAMINHO_LOG_1 CAMINHO_LOG_2`. Os logs originais não foram copiados ao repositório. O resumo não transforma campos ausentes em zero, endpoints ausentes em perda ou quedas de contador em desconexão.

`tree_rc=0` com todos os TC retornando erro comprova perda de propagação de falha, não instala um shaper. As taxas Autorate resultantes são estado calculado em sandbox, sem aplicação ao kernel. Os números BQL são cálculos de serialização, não medições de atraso.

Logs completos da execução original ficaram temporariamente em `/tmp/ark-qos-*-tests-20261105.log`; o resumo preservado omite o dump integral do arquivo nft produzido pela mensagem de falha de uma asserção. O JSON registra arquitetura/CPU do hospedeiro conforme a leitura do sandbox; não descreve o W6x.
