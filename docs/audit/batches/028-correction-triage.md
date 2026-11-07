# Lote 028 — triagem das correções após análise dos logs

Investigação em 06/11/2026, aproximadamente 01:14–01:29, America/Sao_Paulo. Alvo físico W6x, board `acer,predator-w6x-stock`, mesmo boot do lote 027. Inspeção somente leitura no equipamento; reprodução de shell isolada no Mac. Nenhum ajuste de UCI, troca de QoS, restart, reboot, instalação ou reprodução deliberada do panic.

## Decisões

| Achado | Decisão | Evidência e limite |
|---|---|---|
| Panic anterior na sequência SPI/LED | Prioridade alta de investigação do kernel/driver; não inventar patch sem localizar a função | Crash real preservado no lote 027. Símbolos oficiais disponíveis não correspondem ao kernel em execução. Ainda falta o `vmlinux` da compilação do crash, com confirmação da identidade. |
| Erros SQM ao remover filtros ausentes | Correção pequena justificada na observabilidade | Wrapper registra o erro antes de `2>/dev/null`/`|| true` do chamador. Proposta de usar `SILENT=1` somente no laço de limpeza tolerada; mock demonstra redução de 18 para zero mensagens de erro por aplicação e preserva a falha injetada de instalação. Não aplicado ao produto ou roteador neste lote. |
| LAN1 a 100 Mb/s e ciclos periódicos | Não forçar velocidade, desabilitar WoL ou atribuir defeito ao cabo agora | Usuário informou que provavelmente é o PC gamer com WoL a 100 Mb/s. Compatível com operação em espera, sem confirmar a identidade ou explicar cada ciclo. Conferir negociação e estabilidade quando o PC estiver acordado. |
| Recusas BSS-TM com status 7 | Não desativar steering nem alterar roaming em bloco | Vizinhos locais válidos nas duas bandas do mesmo SSID; zero `kick_count` nos clientes do snapshot; combinação WPA3/FT local problemática não encontrada. A recusa do cliente permanece sem causa individual isolada. |
| Aviso inicial de MAC aleatório | Não trocar o MAC efetivo de WAN/LAN | WAN coincide com override UCI; LAN/portas DSA coincidem com MAC declarado em `board.json`. `eth0` conserva tipo aleatório e não é o MAC efetivo da bridge. Persistência em outro boot não foi testada. |
| Pausas externas de cerca de 2 s/~93 s | Manter investigação do caminho WAN; não reduzir teto de QoS como correção presumida | Lotes 015/016/026 já distinguem LAN/ONT acessíveis das ausências no caminho PPPoE/Internet, inclusive ocioso. Nenhuma medição nova deste lote atribui a causa ao ISP, ONT ou driver. |
| PADO inicial, avisos de plataforma e serviços que recuperaram | Não alterar configuração só pela presença de WARN/erro de boot | Log disponível mostra sessão PPPoE estabelecida e sem novas quedas posteriores registradas no lote 027. Não equivale a ausência de falhas de tráfego ou histórico completo. |

## Panic: a tentativa de simbolização distinguiu uma falsa pista

Foi obtido o arquivo oficial de depuração para OpenWrt 25.12.6/mediatek/filogic e conferido seu SHA-256 contra o índice oficial. O `vmlinux` tem símbolos, mas seu Build ID difere do kernel em execução:

- Kernel atual: `504b59d4f9c210f83fa59b2a9ac9929dfaa33382`.
- `vmlinux` oficial: `4bbf7b0fee902042b4e976b3f5478e484c5308f4`.

Não foram convertidos endereços do panic usando esse arquivo. Mesma versão de kernel não garante mesmo endereço de função. Além da correspondência com o kernel atual, será necessário confirmar que os símbolos representam a compilação do boot que sofreu o crash. Não há `/proc/kallsyms` disponível neste equipamento. O driver `leds-ws2812b.ko` está presente como módulo externo; isso identifica o componente a investigar, sem provar que ele contém a instrução causadora.

Fontes: [arquivo oficial de depuração](https://downloads.openwrt.org/releases/25.12.6/targets/mediatek/filogic/kernel-debug.tar.zst), [índice de hashes](https://downloads.openwrt.org/releases/25.12.6/targets/mediatek/filogic/sha256sums), [revisão da distribuição](https://downloads.openwrt.org/releases/25.12.6/targets/mediatek/filogic/version.buildinfo). Hashes, resultado e limite registrados em [kernel-symbols-assessment.json](../evidence/028-correction-triage/kernel-symbols-assessment.json). O arquivo grande permanece temporário no Mac; não foi adicionado ao repositório nem instalado.

Próximo dado necessário: artefatos exatos da compilação instalada/do crash, incluindo `vmlinux` e fontes/revisão do driver. Sem isso, repetir a resolução com o mesmo pacote oficial não acrescenta informação. A correção anterior de parada do daemon, lote 025, não representa correção comprovada desse panic.

## SQM: mecanismo e proposta mínima reproduzidos

`ark_qos_ingress_policy()` remove preferências próprias 1–9 antes de criar a guarda e os filtros. No SQM, `$TC` chama `cmd_wrapper()`: o wrapper captura o stderr do binário e emite duas mensagens com `sqm_error` quando ele falha. A supressão de stderr no chamador não impede esse registro. Um filtro inexistente durante limpeza é tolerado pelo `|| true` existente.

O próprio wrapper oferece `SILENT=1`, que rebaixa o registro para `sqm_debug` e reseta a variável. Foi testada somente uma cópia temporária da função com esse prefixo no laço de limpeza. As demais operações permanecem sem o prefixo. Isso rebaixa todas as falhas dessa limpeza já tolerada, e não é um detector específico de `ENOENT`; por esse motivo, não deve ser aplicado globalmente às operações TC.

| Cenário local | Mensagens de erro atuais | Com proposta | Retorno atual/proposto |
|---|---:|---:|---:|
| Nove filtros ausentes; instalação bem-sucedida | 18 | 0 | 0 / 0 |
| Mesma limpeza; falha injetada ao instalar guarda | 20 | 2 | 1 / 1 |

Quatro cenários e suas asserções passaram. A falha real de guarda continuou visível e `SILENT` terminou em zero. Limite: `/bin/sh` local e comandos TC simulados, usando a implementação do wrapper lida do roteador. Não valida BusyBox/TC real, reboot, fluxo de pacotes, latência ou ganho de CPU. A alteração proposta não foi feita no código de produção. Antes de implantar, adicionar regressão na suíte canônica e executar os gates aplicáveis.

Reprodução: `python3 docs/audit/evidence/028-correction-triage/reproduce-sqm-wrapper.py`, da raiz do repositório. [Resultados e hashes](../evidence/028-correction-triage/sqm-wrapper-reproduction.json), [implementação do wrapper consultada](../evidence/028-correction-triage/sqm-wrapper-reference.sh).

## Wi-Fi: hipóteses que perderam suporte

No snapshot, o AP principal em 2,4 GHz tinha 19 clientes/carga 44; o principal em 5 GHz tinha oito clientes/carga 4. As listas de vizinhos apontavam reciprocamente para o AP local da outra banda e mesmo SSID. Uma rede separada sem clientes não tinha vizinho do mesmo SSID, o que isoladamente não é defeito.

Havia um status 7 em cache no AP de 2,4 GHz e zero contagens de expulsão nos clientes consultados. Esses valores atuais não substituem as 178 respostas históricas do lote 027. O cliente com recusa também apareceu no histórico local de ambas as bandas: não há base para classificá-lo como exclusivamente 2,4 GHz. A ausência de um candidato aceito pelo cliente não demonstra vizinhos ausentes no roteador. O código de status significa rejeição por falta de candidatos adequados, conforme [definições do hostap](https://w1.fi/cgit/hostap/plain/src/common/ieee802_11_defs.h).

As opções consultadas não mostraram SAE/SAE-mixed com `ieee80211r=1` e `ft_psk_generate_local=1`; a seção com FT local era WPA2-PSK. Não forçar clientes fracos a sair nem habilitar FT local em WPA3 por tentativa. O próximo diagnóstico útil exige observar o cliente afetado e uma transição com problema, identificando candidatos e nível de sinal naquele momento. [Snapshot anonimizado](../evidence/028-correction-triage/wifi-and-lan-assessment.json).

## Endereçamento e estado final

Os nós GMAC consultados não declaravam propriedades MAC/NVMEM usuais. O aviso inicial de geração aleatória, portanto, merece revisão futura do suporte de placa, mas os endereços efetivos não devem ser deduzidos desse aviso: `eth1` estava com o override UCI da WAN; `br-lan` e as três portas DSA coincidiam com o MAC LAN declarado pela placa. A bridge não usava o endereço aleatório de `eth0`. Nenhum MAC original foi salvo ou impresso nesta evidência. [Comparações booleanas](../evidence/028-correction-triage/mac-assessment.json).

Fechamento às 01:29: mesmo boot, zero mensagens `Kernel panic`, `Oops:` e OOM killer no dmesg atual; HFSC/FQ-CoDel selecionado, download 720.000/upload 700.000 kbit/s, Autorate não alterado. [Estado final selecionado](../evidence/028-correction-triage/closing-state.json). Não houve reparo automático, VM, validação visual, commit, push ou publicação. Validação visual não se aplica porque a interface não foi alterada.

## Verificações locais de fechamento

A reprodução preservada na pasta de evidências passou nos quatro cenários. `tests/run_local_tests.sh` terminou com retorno zero, 169 casos de unittest e os gates de sintaxe, bundle, contratos, preservação, i18n, documentação, CODE_MAP e minificação aprovados. Isso valida o workspace local atual; não homologa o kernel, as pausas WAN ou a proposta de patch no equipamento.

A primeira execução parou no gate documental: TASK.md tinha 66 linhas, acima do limite de 60. Cinco checkpoints históricos QoS 008–012 foram preservados em `tasks/done/2026-11-qos-008-012.md`, na raiz do workspace, e substituídos por um link no TASK.md, agora com 58 linhas. A segunda execução integral passou. Nenhuma falha desse gate foi atribuída ao roteador. [Resumo dos testes](../evidence/028-correction-triage/local-validation.json).

Ordem de continuidade: obter símbolos exatos do panic; preparar a correção restrita do ruído SQM com regressão; conferir LAN1 com PC acordado; isolar WAN por um ponto de observação independente ou correlação ONT/OLT/BNG. Não repetir medições idênticas nem reativar `networkQuality` para tentar provocar outro crash.
