# Uso prático e solução de problemas

## Instalação e ativação

Siga [INSTALL](INSTALL.md) e selecione o perfil compatível com RAM, armazenamento e gerenciador de pacotes. A instalação do aplicativo não substitui firmware. Confira a identidade do equipamento e mantenha backup de recuperação fora do roteador antes de alterações que possam interromper acesso. `/tmp` não sobrevive a reboot.

Na Central de Recursos, a ação de ativar deve instalar/verificar dependências, aplicar a configuração e confirmar o estado efetivo. A interface não deve anunciar sucesso somente porque gravou a preferência. A implementação atual ainda possui caminhos que suprimem falhas; consulte a matriz do [lote 021](audit/batches/021-docs-runtime-doctor-audit.md).

## Ligar e desligar

| Situação | Resultado exigido | Estado desta revisão |
|---|---|---|
| Ativar recurso disponível | Subpassos automáticos, erro visível quando falham | SQM verifica o serviço; outros toggles ainda exigem migração |
| Repetir ativação | Não duplicar regra nem sobrescrever snapshot original | Deve ser testado por recurso, não inferido do botão |
| Desligar SQM pela Central | Parar serviço, retirar somente filas/IFBs próprios, restaurar estado de aceleração | Removida a varredura que apagava ingress de todas as interfaces; limpeza fica com o serviço SQM |
| Falha ao parar SQM | Preservar preferência anterior e informar erro | Coberto por regressão em sandbox |
| Desligar AdBlock/DoH | Restaurar servidores, listas, ausência de opções e escolhas DNS anteriores | Restauração exata ainda pendente; há filtros/fallbacks e prioridades de configuração incompatíveis com esse requisito |
| Desligar modo gamer ou ajuste de hardware | Reverter somente o que o recurso alterou | Não homologado; decisões anteriores podem persistir |

Uma alteração manual posterior do usuário não deve ser apagada ao desligar um recurso. Recursos compartilhados precisam de propriedade explícita: remover por nome genérico de interface, faixa de prioridade ou tipo de qdisc pode afetar outra função.

## Investigar uma falha

1. Abra o diagnóstico e confira data/hora do resultado. `doctor-status` retorna cache e não dispara sempre uma nova análise.
2. Execute `/usr/sbin/ark-doctor run` para observar. Salve somente os checks relevantes, sem configurações, credenciais ou logs brutos.
3. Diferencie aviso de falha comprovada. Espaço desconhecido, ausência de resposta HTTP ou um processo não observado exigem contexto.
4. Consulte [DOCTOR_SAFETY_MODEL](DOCTOR_SAFETY_MODEL.md) antes do reparador manual: `--fix` ainda engloba operações não transacionais.
5. Confirme a função afetada em [CODE_MAP](CODE_MAP.md) e execute seu teste no laboratório, com snapshot e retorno definido.

## Perda de acesso, failsafe e recuperação

Um problema de LuCI não comprova brick. Verifique primeiro acesso por cabo, endereço de gerência e disponibilidade SSH. Não execute `firstboot`, `jffs2reset`, `mtd write` ou sysupgrade como tentativa genérica de reparar o painel.

Recuperação depende do modelo, revisão física, partições e bootloader. Para Cudy WR3000 v1 use o [procedimento específico de TFTP](CUDY_WR3000_TFTP_RECOVERY.md), conferindo imagem e hash. Não reutilize offsets/comandos de outro hardware. O [runbook de firmware](firmware-runbook.md) é referência separada da instalação do pacote LuCI.

## Limite da validação

Sandbox verifica decisões e efeitos em mocks. Navegador com RPC simulado verifica somente o comportamento visual exercitado. VirtualBox valida serviços e rede virtual. Rádio, offload, portas físicas e desempenho de cliente exigem hardware identificado. Aprovação em um nível não substitui o seguinte.
