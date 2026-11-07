# Lote 008 — preparação de aplicação no W6x 192.168.73.1

Data: 05/11/2026. **Estado: aplicado no W6x em 05/11/2026, ativação às 11:37 e conferência final às 11:43 (America/Sao_Paulo). Usuário autorizou teste direto sem VM e removeu a exigência de palavra-chave.**

O usuário solicitou aplicar e validar as alterações no 73.1 e confirmou a exceção ao teste prévio na VM indisponível. Solicitou também remover a trava de digitar SIM: os AGENTS e manuais ativos agora reconhecem o pedido direto de aplicação como autorização, sem confirmação redundante. As leituras preliminares abaixo antecederam a implantação descrita na execução final.

## Alvo e baseline observados por SSH

- Modelo retornado por `ubus call system board`: Acer Predator Connect W6x (Stock Layout), board `acer,predator-w6x-stock`.
- OpenWrt 25.12.6, kernel 6.12.112; ARK 2.2.1.
- Overlay: 47240 KiB livres; `/tmp`: 502524 KiB livres na coleta.
- `sqm.wan1`: habilitado, `pppoe-wan`, `layer_cake.qos`, CAKE; download 720000 e upload 620000 kbit/s, Ethernet/overhead 44.
- CAKE efetivo em `pppoe-wan` e `ifb4pppoe-wan`, diffserv4, RTT 100 ms; serviço habilitado no boot.
- Flags de offload SW/HW: 0/0. Autorate 0; gamer 1. Nenhum desses valores foi alterado nesta etapa.
- Chave SSH observada por primeiro uso, registrada em arquivo temporário local: ED25519 `SHA256:6K9pMV4gdSEqfodTKPyqyTft8bI5kjayFmcCfbQP75U`. Identificação de destino e criptografia verificadas pela conexão; não há referência independente anterior desse fingerprint nesta sessão.

## Candidatos e integridade

| Destino | SHA-256 instalado antes | SHA-256 candidato |
|---|---|---|
| `/usr/lib/ark/common.sh` | `f9dcbd906c70a7f20075296d0b8ea97f592750263c9960f89369079a243c4db5` | `d405fa3e5a0ba0d9e20229d4dd661a7faed098cc1856ee24a565712276624551` |
| `/usr/lib/ark/modules/sqm.sh` | `799cd3833953f8601a8a8ccd53739ac77edc19551eae9061c3810d2451331c42` | `2c8cb835596146f9e0f910c1e4cb8a7bbbd551446a81c83fdc58e35a3c82fbbc` |
| `/etc/init.d/ark-hardware-tune` | `b6641c16783313134d8a4eabfff98c4a30bdbef12db261bd89b00a2e4e03e40e` | `322899417ea7170e6e1a4515c70dca6a57ccb7b2976cd4fe9a7cf8c51078ca19` |
| `/usr/lib/sqm/ark_hfsc_fqcodel.qos` | `a57189e870f13a16218e7b8e1c524b123b2d1efc18747895716cf4c75ba9dfb1` | `85a823b1b7edc1dcc82d4a4cf8b5a5fc39ba98e29b937539a90279cf13cc47b5` |

As versões instaladas correspondem às bases das correções do lote 007; as diferenças foram salvas para revisão. O include nft e demais arquivos não integram esse pacote.

Evidência local fora do repositório: `Evidencias locais/QoS-007-preflight-2026-11-05/`, relativo ao workspace. Contém cópias dos quatro arquivos remotos, diffs, `manifest.json`, manifests SHA-256 e `ark-qos-007-candidate.tar.gz`. A composição e os hashes internos do tar foram conferidos localmente; a instalação posterior está registrada abaixo.

## Validações já executadas

- Bateria local completa e 18 testes novos: resultados no [lote 007](007-qos-reliability-fixes-2026-11-05.md).
- Quatro candidatos enviados apenas ao stdin de `sh -n` via SSH: sintaxe aprovada pelo shell BusyBox do equipamento, sem escrita dos arquivos.
- Duas funções candidatas de verificação executadas em shell efêmero, com operações de leitura de UCI/TC: aprovadas nas filas CAKE atuais. Nenhum restart, troca de motor ou gravação UCI.

Isso não valida a aplicação, HFSC ativo, restauração de offload, reboot ou throughput do jogo. A suíte separada de hardware ainda tem as três falhas anteriores documentadas.

## Procedimento proposto após confirmação

1. Reconfirmar identidade e hashes do baseline. Se qualquer fonte ou configuração relevante tiver mudado, interromper antes da instalação e comparar novamente.
2. Capturar backup dos quatro arquivos e da configuração SQM; registrar somente as chaves de motor/offload necessárias ao retorno, sem exportar credenciais ou configurações completas de Wi-Fi/WAN. Copiar o backup para o Mac e verificar sua integridade antes de substituir arquivos. O backup em `/tmp` do roteador, sozinho, é volátil.
3. Registrar TC/rotas/erros físicos e conectividade antes. Preparar retorno para os quatro arquivos e parâmetros próprios da operação.
4. Transferir os quatro candidatos para staging em RAM, verificar hashes e `sh -n` novamente. Substituir cada destino com arquivo adjacente e rename no mesmo filesystem; preservar proprietário e permissões. Usar exclusão mútua durante a substituição.
5. Reiniciar SQM mantendo CAKE e as taxas atuais; possível breve oscilação do tráfego. Conferir raiz/IFB, classes quando aplicáveis, taxas, firewall/offload e conectividade. Não executar o tune completo apenas para testar sua guarda.
6. Exercitar a guarda de propriedade e a verificação de TC. Teste temporário HFSC→CAKE e toggle de offload exigem registro explícito no procedimento de execução e retorno aos valores originais; não serão feitos silenciosamente. Se houver falha, restaurar antes de prosseguir.
7. Conferir logs novos e realizar observação de tráfego sem gerar carga externa pesada automaticamente. O ping do jogo só será validado com uma partida e horários dos picos registrados; reiniciar SQM sem essa coleta não comprova solução do sintoma.
8. Retornar os parâmetros temporários ao baseline, conferir hashes/estado e registrar exatamente o que passou/falhou. A versão do pacote continua 2.2.1; a identificação deste patch será por manifesto de fontes.

## Retorno em caso de falha

Restaurar os quatro arquivos originais verificados, a configuração SQM e apenas as chaves de motor/offload pertencentes ao teste; reiniciar o SQM e conferir CAKE 720000/620000, IFB, rota e conectividade. Manter cópia íntegra fora do roteador. Não restaurar cegamente firewall/Wi-Fi/WAN de backups globais.

A autorização e a aplicação deste lote não comprovam que o ping do jogo foi corrigido. O usuário informou que não estava jogando durante a validação.


## Execução física e resultado

1. **Backup verificado fora do roteador:** quatro arquivos originais, `/etc/config/sqm` e apenas três valores necessários ao retorno (motor e flags SW/HW), sem copiar Wi-Fi/WAN ou credenciais. SHA-256 do arquivo de backup: `6092fb1d17fc797d08588e11342b6eb0a89bdf849eebd8e6af536264cbc18cfa`. Cópia local em `Evidencias locais/QoS-007-preflight-2026-11-05/deployment-20261105-112659/backup.tar.gz`, relativo ao workspace.
2. **Teste HFSC isolado no kernel real:** criação de IFB temporário, instalação da raiz HFSC, classes 1:1/10/20/30, três folhas FQ-CoDel e filtros; verificador e guarda de raiz aprovados. A interface temporária foi excluída e não recebeu tráfego de produção. Não foi necessário trocar o motor da WAN para HFSC.
3. **Ajuste adicional encontrado no teste isolado:** uma remoção esperadamente benigna de qdisc inexistente interrompia o teste com `set -e`. As duas remoções iniciais no script HFSC passaram a ignorar explicitamente esse erro. Regressão reproduzida antes do ajuste; bateria local completa reaprovada com **19 testes de confiabilidade**. O hash final HFSC na tabela já inclui essa correção.
4. **UCI nativo em contexto isolado:** o snapshot preservou e restaurou offload SW/HW e ECM IPv4/IPv6, inclusive preferência de desativação. Os hashes das configurações de produção permaneceram iguais nesse teste. Uma primeira execução precisou criar o arquivo de pacote UCI da fixture antes de definir sua seção; isso era uma diferença do harness, não alteração em produção.
5. **Primeira tentativa de instalação revertida:** o equipamento não fornece `stat` nem `nohup`. A instalação parou antes da substituição dos arquivos por falta de `stat`; o rollback restaurou/conferiu os originais e reconstruiu CAKE. O procedimento foi adaptado para ler permissões do tar de backup e iniciar um watchdog em shell com HUP ignorado, verificando sua liveness antes da substituição. Não foram instalados utilitários no roteador.
6. **Aplicação concluída:** substituição adjacente + rename, quatro hashes conferidos e arquivos root:root/755. Os dois scripts que antes tinham UID/GID 65534 passaram a root:root, conforme a propriedade esperada para código executado como root. Reinício de SQM e validação das estruturas efetivas; taxas continuaram 720000/620000, CAKE/diffserv4 e overhead 44. As demais opções SQM foram comparadas ao backup: a única adição foi `sqm.ark_offload_snapshot`, com os valores prévios 0/0 e marcador ready.
7. **Validação de conectividade:** Mac→roteador: 10/10 respostas, 0% perda, média 0,775 ms, máximo 1,095 ms. Roteador→1.1.1.1: 10/10, 0% perda, média 4,886 ms, máximo 8,866 ms. São amostras curtas em baixa carga, não comparação de desempenho antes/depois nem RTT do iPad/jogo.
8. **Estado final confirmado:** SHA-256 dos quatro arquivos corresponde aos candidatos; CAKE upload/download e IFB válidos; offload 0/0; sem flowtable fw4; rota padrão preservada, WAN up com uptime de 129889 s, sem renegociação PPPoE durante a operação. Restou somente o IFB de produção. O watchdog recebeu marcador `validated.ok`, portanto não desfaz a implantação.

### Aviso e limites

A ativação retornou sucesso e SQM registrou início bem-sucedido, mas o stderr também continha uma ocorrência isolada de `sh: out of range`. Não foi reproduzida ao repetir a promoção/verificação; o rastreamento da promoção retornou 0 e as filas continuaram válidas. O aviso está preservado em `activate.log`; sua origem não foi isolada, e não é tratado como prova de falha nem omitido como se a execução tivesse stderr vazio.

Não houve reboot, teste de throughput sob carga, partida ou confirmação de correção dos picos. CAKE permanece o motor de produção. A classificação gamer/Autorate e demais pendências dos lotes 005–007 não foram resolvidas por esta aplicação. O patch foi aplicado diretamente nos arquivos do pacote 2.2.1, identificado por manifesto; reinstalar/atualizar o pacote pode sobrescrevê-lo até que seja incorporado a uma release.

[Resumo estruturado da aplicação](../evidence/qos-2026-11-05/deployment-result.json). Os logs e scripts operacionais completos ficam na evidência local fora do repositório; o backup remoto em RAM é complementar à cópia verificada no Mac.
