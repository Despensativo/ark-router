# Laboratório: entrada e verificação

Este arquivo encaminha a etapa 004. Não duplica os manuais existentes:

- [VIRTUAL_LAB](../VIRTUAL_LAB.md): topologia e cenários documentados.
- [VIRTUALBOX_TEST_ENVIRONMENT](../VIRTUALBOX_TEST_ENVIRONMENT.md): procedimentos do ambiente.
- [tests/lab](../../tests/lab/setup_lab_vm.ps1): scripts de preparação e testes.

O estado atual das VMs não foi verificado na criação desta estrutura. Nome, porta ou IP mencionados em documento não comprovam identidade do alvo.

## Antes de iniciar um teste

1. Descubra o VirtualBox disponível e consulte VMs/UUIDs e configuração sem alterar nada.
2. Identifique explicitamente a VM do laboratório, discos, interfaces e redirecionamentos. Preserve VMs não relacionadas.
3. Confira isolamento: use redes internas/host-only/NAT conforme topologia; não exponha DHCP, rotas ou testes destrutivos à rede física.
4. Correlacione acesso de teste com a VM/UUID, inclusive se houver SSH via localhost. Porta conhecida não garante que o alvo é correto.
5. Verifique snapshot/restauração e orçamento de disco/RAM antes de provisionar.
6. Leia scripts antes de executar: alvos hardcoded, download, escrita, parada de VM, reboot e coleta de segredos.
7. Credenciais por ambiente ou entrada segura; nunca em docs/logs. Capturas de UCI podem conter segredos: sanitizar antes de anexar/versionar.

Não reinicie o Windows hospedeiro. Teste físico depende de autorização específica; laboratório aprovado não autoriza uso de um roteador real.

## Cenários a verificar

| Cenário | Preparação/evidência exigida |
|---|---|
| Múltiplas WANs | Uplinks/destinos funcionais independentes; NIC extra sozinha não comprova failover |
| LAN/VLAN/bridges | Clientes reais virtuais e tráfego entre zonas |
| fw3/fw4 e opkg/apk | Detectar componentes efetivamente instalados; não inferir só pela versão anunciada |
| SQM/QoS | qdisc e tráfego medidos; VM não prova throughput do hardware alvo |
| Falhas | Link, dependência, serviço, reinício e recuperação controlados |
| Wi-Fi/mesh/Wi-Fi 7 | Registrar hwsim/mock realmente disponível e limites; não afirmar suporte físico por flags UCI |
| PPE/WED/LEDs | Mock/configuração apenas quando hardware não estiver representado |
| Perfis restritos | RAM/disco limitados; não equivalem automaticamente a geometria SPI/MTD real |

Defina primeiro cliente → roteador virtual → destino. Testes de política exigem tráfego permitido e proibido observados, não apenas regras presentes.

## Artefatos e checkpoints

Registre VM/UUID, snapshot, versão, perfil, hash do pacote e resultados no relatório do lote. Use caminhos portáveis no código; identidades da máquina ficam em evidência local sanitizada.

Scripts existentes a revisar antes de executar: `tests/lab/setup_lab_vm.ps1`, `tests/lab/validate_topology.sh`, `tests/lab/test_persistence_reboot.sh` e `tests/lab/test_interference_matrix.py`.

O teste Python de interferência usa `RouterSandbox`; não deve ser descrito como teste VirtualBox. O script de reboot copia configurações em sua fase de captura: confirme escopo, retenção e privacidade. Não execute automaticamente durante organização documental.
