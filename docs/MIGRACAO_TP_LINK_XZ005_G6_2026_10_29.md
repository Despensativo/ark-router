# Preparação da migração para TP-Link XZ005-G6

29/10/2026. Usuário solicitou migrar da Huawei para a TP-Link e informou a TP-Link conectada a uma LAN do W6x. Configurações de equipamentos físicos não foram alteradas.

## Acesso e testes executados

- Mac em `en6`, IP principal `192.168.73.73/24`; endereço temporário `192.168.1.254/24` adicionado manualmente pelo usuário e confirmado em leitura.
- Rota para `192.168.1.1` passou a ser diretamente por `en6`. Não continua saindo pelo PPPoE após o alias.
- `192.168.1.1` permaneceu sem resposta ARP/ICMP. Tentativa TCP 80 expirou; não houve acesso à interface nem tentativa de autenticação.
- Captura em `br-lan` confirmou pedidos ARP do Mac com origem `192.168.1.254` e do W6x com origem `192.168.73.1`, sem respostas na janela observada.
- Varredura limitada de `192.168.1.1–254` pelo W6x, com 16 sondas simultâneas no máximo, encontrou apenas o Mac no IP temporário. Isso não exclui outro IP, filtragem de gerenciamento ou indisponibilidade física durante a coleta.
- Teste de `192.168.18.1` forçado pela LAN, para verificar possível IP herdado da Huawei, sem resposta. Não confundir com a Huawei acessível pela WAN.
- Consulta DHCP/neighbors não localizou o MAC candidato da TP-Link. Descoberta multicast IPv6 não revelou endereço atribuível com segurança a ela.
- Inicialmente havia MAC com prefixo `e0:d3:62` aprendido na LAN4 e link 1000 Mb/s full-duplex. Prefixo compatível com TP-Link segundo consultas públicas, mas a identificação do modelo ainda depende de acesso à interface ou etiqueta.
- No fim da coleta, **LAN4 passou a carrier=0 / NO-CARRIER**, e o MAC candidato deixou de aparecer na FDB. O Mac continuava ligado à LAN3 do W6x. O instante exato da desconexão não foi registrado; **não concluir que a varredura negativa comprova IP errado**.
- Capturas tiveram encerramento limitado por temporizador próprio. Nenhum reset, reboot, flash, mudança de VLAN, GPON, firewall ou bridge foi realizado.

## Bloqueio atual e próximo passo

É necessário restabelecer/confirmar o link da TP-Link na LAN4 ou informar para qual porta ela foi movida. Não é obrigatório conectar diretamente ao Mac para continuar a investigação. Depois, repetir uma captura curta de ARP e tentativa ao IP informado, antes de ampliar a busca.

O [guia oficial da XZ005-G6](https://www.tp-link.com/kz/document/27251/) descreve gerenciamento em `192.168.1.1` com cliente na mesma sub-rede e configuração GPON por senha/SN fornecidos pelo ISP. Isso não confirma o IP/estado atual desta unidade nem seu provisionamento na Simtelecom.

Após recuperar o acesso: identificar revisão/firmware, registro GPON e potência óptica; ler configuração atual de autenticação/serviço e preparar uma comparação com a Huawei, sem gravar segredos em documentação. Qualquer aplicação física deve respeitar a confirmação explícita prevista em AGENTS.md.
