# Lote 009 — guardas Autorate e validação nativa (05/11/2026)

## Problema e alteração

`ark_sqm_autorate_step` podia alterar taxas com a opção desligada; sem amostras, inventava carga de 30% e atraso de 2 ms. Agora exige habilitação e ambos os inteiros explícitos: carga 0–100 e atraso 0–60000 ms. Rejeita negativos, decimais, vazios, zeros à esquerda e entradas enormes antes de aritmética ou escrita de estado.

Desligar com estado runtime agora chama o reinício verificado do SQM para restaurar taxas configuradas antes de apagar os arquivos. Após reiniciar, reaplica os ajustes ARK de filas/classificação por `ark_promote_cake_mq`; falha também conserva o estado. Falha preserva estado para repetição; a opção permanece desligada. Sem estado, desligar não reinicia SQM. Falhas de UCI são propagadas.

## Evidências

- Local com mocks: 26 métodos de regressão (19 anteriores + 7 novos), incluindo preservação de estado com amostra inválida/desabilitado, redução explícita, restauração e falha/repetição. Runner completo aprovado, incluindo contratos, shell, preservação, i18n estrito, mapa e minificação. Suíte hardware separada não reexecutada; 3 falhas preexistentes seguem registradas no lote 007.
- Hardware real, kernel W6x: dois IFBs descartáveis com CAKE, UCI nativo em diretório isolado. Amostra 85%/25 ms alterou TC de 100/50 para 88/44 Mb/s. Desligamento voltou a 100/50 por fixture de serviço restrita aos IFBs. Isso valida TC e shell nativos; não é prova do serviço SQM real nesse teste. Os arquivos UCI de produção tiveram hashes iguais antes/depois. IFBs removidos ao sair.
- Aplicação real no W6x 192.168.73.1 autorizada diretamente pelo usuário, sem VM. Um arquivo substituído atomicamente após comparação do hash anterior; backup conferido no Mac e no roteador. Sem restart na produção. Autorate continuou 0; configurações e qdiscs WAN idênticos antes/depois.
- A tentativa inicial pelo dispatcher ocorreu dentro da trava de implantação: foi recusada por concorrência e não comprovou a guarda. Repetição após liberar a trava confirmou especificamente `Autorate desligado`, com retorno não zero. A chamada direta também foi rejeitada pela guarda.
- Ping router→1.1.1.1: 10/10, média 4,443 ms, máximo 4,637 ms.
- Carga real pelo Mac via en6, gateway 73.1, `networkQuality -M 35 -s -c`: 638,08 Mb/s download e 513,62 Mb/s upload. Sondas paralelas (80 cada; incluem o período fora da carga): gateway média 0,612 / máximo 2,603 ms; 1.1.1.1 média 4,737 / máximo 7,072 ms; 8.8.8.8 média 19,990 / máximo 24,120 ms. Zero perda nas três. O RTT-base do serviço Apple é 21,909 ms; não se confunde com os destinos ICMP. Não houve captura de latência individual do jogo.

## Identidade e retorno

- Antes: `2c8cb835596146f9e0f910c1e4cb8a7bbbd551446a81c83fdc58e35a3c82fbbc` (backup inicial). Revisão intermediária: `2c40fce49e748601e29a04622c9d7b2f2b889144cb61721114632dc7c8e9911e`.
- Aplicado em `/usr/lib/ark/modules/sqm.sh`: `a4055d87b17b8783213dd1d8acd2682d860d7145ec0a66a6348719809dc46d2d`.
- Evidências locais fora do Git: `Evidencias locais/QoS-009-2026-11-05/` (backup inicial `sqm-before-initial.sh`; revisão imediatamente anterior `sqm-before.sh`, teste nativo, logs filtrados, resultado e teste de carga). Retorno: substituir o módulo pelo backup e conferir hash; este lote não alterou UCI nem exige restart para reverter as funções carregadas sob demanda.

## Limites e continuação

Não foi testado reboot, partida, HFSC Autorate nem dual-WAN. O Autorate ainda não tem coletor autônomo; usa uma amostra para ambas as direções/WANs, ignora certas falhas TC e reescreve curvas HFSC. Esses achados permanecem abertos: manter desativado. O teste de carga não prova eliminação dos picos intermitentes do iPad nem capacidade nominal da Internet.

No W6x não há `act_ctinfo`, `act_pedit` ou `act_csum`; o filtro ativo também não contém restauração ctinfo. O índice APK anuncia `kmod-sched-ctinfo-6.12.112-r1`, mas a simulação devolveu “1 error”. O download posterior retornou sucesso, porém `apk verify` recusou a assinatura (`UNTRUSTED signature`). Pacote não instalado, chave de confiança não alterada e verificação não contornada. Classificação bidirecional continua pendente; não foi ocultada pela guarda Autorate.

## Atualização posterior — lote 013

A conclusão de bloqueio baseada somente na assinatura do arquivo isolado foi corrigida. O pacote foi instalado pelo repositório sem contornar verificações, carregado e exercitado no kernel real. O APK ainda reporta um erro residual não isolado. Ver [instalação e correção do diagnóstico](013-ctinfo-installed-native.md). Este histórico preserva o que havia sido testado na etapa anterior.
