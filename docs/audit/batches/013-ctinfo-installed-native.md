# Lote 013 — ctinfo instalado e exercitado no W6x (05/11/2026)

## Instalação autorizada

Usuário solicitou diretamente instalar para testar em seguida. Alvo W6x 192.168.73.1, kernel 6.12.112. Comando executado: `apk add kmod-sched-ctinfo`, pelo nome no repositório configurado, sem `--allow-untrusted`, alteração de chaves, atualização global ou arquivo local imposto.

O gerenciador executou o post-install; `apk info -e kmod-sched-ctinfo` passou a retornar 0. O arquivo `/lib/modules/6.12.112/act_ctinfo.ko` pertence a `kmod-sched-ctinfo-6.12.112-r1`. `modprobe -q act_ctinfo` retornou 0; módulo visto em `/proc/modules`, com tamanho de 12288 bytes. Autoload configurado em `/etc/modules.d/71-sched-ctinfo`. SHA-256 do módulo: `3387bbc474d8b1c75ea79b90a2b60b740a4d6a96a16d1e1d0e276ac88ee2dced`.

**Ressalva:** o APK retornou código 1 e “1 error” apesar do pacote instalado e carregado. Nova simulação, agora sem operação a executar, também retorna esse erro. A origem ainda não foi isolada; não atribuir automaticamente a falha de assinatura ou afirmar transação do gerenciador inteiramente limpa. Estado funcional do módulo foi validado separadamente. Sem tentativa de conserto global de pacotes.

## Correção do diagnóstico anterior

Nos lotes 009–012, a recusa de `apk verify` para o arquivo APK isolado foi tratada como bloqueio à instalação. Essa conclusão era excessiva: verificação individual e instalação pelo repositório são caminhos diferentes. O [OpenWrt permite desativar a assinatura individual em builds da infraestrutura](https://github.com/openwrt/openwrt/blob/main/config/Config-build.in), mantendo configuração distinta para assinatura das listas. O resultado isolado não justificava presumir que a instalação normal pelo repositório também seria rejeitada.

Neste lote, a instalação normal foi tentada e o pacote ficou instalado; não se contornou confiança. Isso corrige a conclusão anterior, sem apagar o fato histórico de que a verificação isolada retornava UNTRUSTED. O erro residual de APK continua uma questão separada, não explicada por essa distinção.

## Validação nativa e ativação

1. IFB temporário criado; ingress instalado; helper compartilhado adicionou ações ctinfo reais para IPv4 e IPv6, máscaras DSCP `0x3f` e validade `0x80`, zona 0. Ambas aceitas pelo TC/kernel. IFB removido ao sair.
2. Antes da ativação real, confirmado que as prioridades 4/5 estavam ausentes na WAN. Adicionadas somente essas duas ações sob trava de mutação, com limpeza em falha. Não houve reconstrução das outras regras, troca de raiz ou restart SQM.
3. Hashes dos arquivos UCI sqm/firewall/equipe_dashboard e saída das qdiscs WAN/IFB ficaram iguais antes/depois da ativação. CAKE continua 720 Mb/s download e 620 Mb/s upload, handles 804c/804b.
4. Contadores observados: IPv4 DSCP set 22251, IPv6 DSCP set 50; erro DSCP 0 e CPMARK set 0 em ambos. Comprova execução real das ações em pacotes, sem demonstrar que o tin final esteja correto ou que fossem pacotes do jogo.
5. Ping do roteador a 1.1.1.1 após ativação: 10/10 respostas, média 4,386 ms e máximo 4,638 ms. Não é medição da partida.

`equipe-dashboard-control sqm-resource-plan` agora informa `ctinfo_module_present=true`; mantém `capabilities_validated=false` porque o inventário não transforma teste específico em homologação de toda classificação.

## Retorno e persistência

Estado anterior sem filtros ctinfo confirmado e salvo no roteador em `/tmp/ark-ctinfo-install/filters.before.txt`; world anterior copiado antes da instalação. Para retorno controlado, remover somente filtros 4/5, verificar ausência de referências às ações, descarregar act_ctinfo e remover o pacote pelo gerenciador, conferindo o plano antes de executar. Não executar limpeza ampla das regras. Nenhum retorno foi necessário.

A entrada de autoload está configurada e o runtime ARK já tenta recriar as ações nas aplicações de QoS. Reboot e recriação completa no boot não foram testados. Evidências selecionadas em `Evidencias locais/QoS-013-2026-11-05/` e `docs/audit/evidence/qos-2026-11-05/ctinfo-installation-result.json`.

## Limites para o próximo teste

Módulo instalado, carregado e restauração DSCP IPv4/IPv6 exercitada em tráfego real. Ainda não comprovada melhora de ping. A precedência de skb priority sobre DSCP no CAKE e os demais achados de classificação continuam abertos; instalar ctinfo não resolve esses defeitos sozinho. A próxima partida deve correlacionar ping do jogo e tráfego/filas, sem chamar o teste ICMP priorizado de prova de latência das aplicações.
