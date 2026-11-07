# Lote 007 — confiabilidade da aplicação QoS

Data: 05/11/2026. Implementação local sobre HEAD `a5ab48c2` e alterações locais preexistentes. Origem: [achados do lote 005](005-qos-review-2026-11-05.md) e [solução consolidada do lote 006](006-gaming-latency-solution-2026-11-05.md).

## Escopo implementado

- **Q03:** `ark_sqm_owns_device` identifica interfaces/IFBs de seções SQM habilitadas. Os quatro perfis de `ark-hardware-tune` consultam essa propriedade antes de alterar a raiz/link; a guarda preserva também raízes CAKE/CAKE-MQ/HFSC já presentes. Protege a janela entre remover e reconstruir uma raiz SQM.
- **Q07:** snapshot persistente próprio em `sqm.ark_offload_snapshot` captura offload SW/HW, distinguindo chave ausente de 0/1. Chamadas repetidas não sobrescrevem o valor anterior. ECM IPv4/IPv6 tem snapshot independente antes da primeira escrita, inclusive quando seu módulo aparece depois. Sem histórico, não inventa aceleração habilitada. Preferência explícita `flow_offload_user_disabled=1` prevalece; duas WANs ativas adiam restauração e preservam o snapshot. Scripts fw4 não chamam comandos legados nessa sincronização.
- **Q08, caminhos do módulo SQM:** raiz, classes, folhas e filtros obrigatórios HFSC propagam falhas; parâmetros opcionais de folhas ainda têm fallback. Erros de serviço chegam ao chamador nos comandos de ativar/desativar, salvar, upload-only, A+ e seleção de motor. A seleção de motor guarda somente a configuração SQM em diretório privado temporário, restaura-a em caso de falha e tenta reconstruir o motor anterior; falha de reconstrução também é informada.
- **Verificação efetiva após restart:** para os scripts ARK/CAKE conhecidos, confere raízes requeridas pelas taxas, classes 1:1/10/20/30 e três folhas FQ-CoDel do HFSC, além da raiz de download no dispositivo lido do redirect mirred. Não presume nome IFB fixo. Scripts externos não recebem homologação desse verificador. No sandbox, a aplicação não instala qdiscs; o verificador é testado separadamente com saídas TC controladas.
- **Q13, parte HFSC:** `linklayer=none` deixa de receber STAB Ethernet de fallback. A política mais ampla de doctor/presets continua pendente.

Nenhuma regra de classificação, faixa gamer, taxa de shaping, timeout, BQL/AQL ou parâmetro Wi-Fi foi alterado por este lote. As alterações locais anteriores em DSCP foram preservadas. Não há alegação de correção do ping do jogo nesta etapa.

## Testes e causalidade

`tests/test_sqm_reliability.py` foi criado antes do patch. A primeira execução, com 11 métodos, registrou 18 falhas incluindo subcasos: raiz/classes/folhas HFSC com erro reportadas como sucesso, linklayer none ignorado, restauração de offload incorreta, guardas ausentes e seleção de motor sem erro/rollback. O caso de redirecionamento que já falhava corretamente foi mantido como proteção.

A suíte foi ampliada para cobrir Multi-WAN, ECM carregado tardiamente, preferência alterada durante SQM, outros mutadores e o verificador de estado TC. Todos os testes são isolados; não executam TC ou serviços no hospedeiro/roteador.

O teste QSDK/ECM existente de WAN passou a declarar explicitamente uma só WAN ativa, pois seu objetivo é verificar restauração. A restrição de restauração com duas WANs é coberta por teste separado, que confirma adiamento e posterior restauração. Isso evita que a disponibilidade do `/etc/config/mwan3` do hospedeiro defina o resultado do sandbox.

O novo teste foi incluído em `tests/run_local_tests.sh`. Contrato `ARK-SQM-001` e catálogo documental foram atualizados com propriedade, snapshot, limites e exigências de persistência/interferência. `CODE_MAP.md` foi regenerado pelas novas funções; o arquivo anterior, já modificado na entrada, foi preservado em cópia temporária local antes da geração.

## Limites e próximos passos

- A presença do snapshot em UCI e execuções em processos separados comprovam o comportamento mockado; **não homologam reboot físico/VM**.
- A verificação TC testa formato e presença das estruturas conhecidas, não mede taxa efetiva, justiça, atraso ou bypass no datapath.
- Os caminhos de serviço fora do módulo `sqm.sh` ainda precisam ser revisados na matriz de interferência, especialmente doctor, wizard, perfis e speedtest.
- Presets, classificação bidirecional, Autorate, limites por aparelho e restauração de BQL/AQL seguem pendentes conforme lote 006. Este lote não encerra os vinte achados.
- O VirtualBox permanece sem executável utilizável neste Mac. Não houve instalação, reboot ou teste em roteador físico; sem homologação operacional ou autorização implícita para deploy.
- Nenhuma UI foi alterada. Screenshot e console de navegador não se aplicam a este lote backend.

## Resultado final local

- `tests/run_local_tests.sh`: **aprovado integralmente**, incluindo WAN 35/35, confiabilidade SQM 18/18, multicore 11/11, Lite/Full 4/4, interferência 13/13, 74 contratos, auditorias shell/estado/documentação/i18n, sincronismo do bundle/CODE_MAP e minificação. A mensagem automática do runner de “pronto para deploy” não constitui homologação operacional.
- `scripts/audit_i18n.py --strict` e `sh -n` dos três scripts backend alterados: aprovados.
- A suíte separada `test_hardware_tune.py` permanece em **9/12**, com as mesmas três falhas registradas no lote 005: duas de localização do include nft na fixture e uma expectativa antiga sobre o filtro CS4 modificado antes desta sessão. Não foram relaxadas para aprovar este lote.
- A regressão adicional de commit UCI foi reproduzida falhando antes da correção: desativar podia devolver `ok` mesmo com erro de persistência. Os caminhos alterados agora propagam esse erro. O teste de verificação HFSC também rejeita uma árvore com classes mas sem as folhas FQ-CoDel.
- [Resumo antes/depois e hashes das fontes testadas](../evidence/qos-2026-11-05/reliability-tests.json). Esses resultados são mocks e checks locais; VM, datapath, reboot e hardware permanecem pendentes.
