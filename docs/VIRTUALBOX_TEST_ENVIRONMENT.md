# Ambiente de Testes VirtualBox e Laboratório de Emulação ARK Router

## 1. Princípio Fundamental e Regras Obrigatórias

O ambiente principal de desenvolvimento, depuração e validação do **ARK Router** é uma infraestrutura isolada e controlada no VirtualBox. Nenhuma modificação deve ser promovida ou testada em roteadores físicos sem prévia aprovação integral neste ambiente.

### Regras Obrigatórias de Ambiente e Implantação

1. **Nunca instalar, publicar, atualizar ou executar alterações em roteadores físicos automaticamente.**
2. **Qualquer implantação em equipamento real depende de solicitação e confirmação manual e explícita do usuário por confirmação escrevendo SIM.**
3. **O ambiente virtual deve reproduzir o maior número possível de cenários suportados pelo ARK Router, incluindo:**
   - duas ou mais interfaces WAN;
   - balanceamento, failover e perda de conectividade;
   - LAN, VLANs, bridges e múltiplas sub-redes;
   - firewall fw3/iptables e fw4/nftables;
   - gerenciadores `opkg` e `apk`;
   - SQM, CAKE e diferentes capacidades de conexão;
   - Wi-Fi, mesh, roaming e recursos equivalentes ao Wi-Fi 7;
   - perfis de hardware legado e moderno;
   - restrições de RAM, flash e armazenamento;
   - falhas de serviços, interfaces e dependências.
4. **Recursos que não possam ser reproduzidos fielmente pelo VirtualBox** (como rádio Wi-Fi real, drivers proprietários, offloading de hardware de silício, alcance de sinal, interferência de RF e desempenho Wi-Fi 7 de 320 MHz) **devem ser simulados por mocks ou interfaces virtuais.**
5. **Os resultados devem distinguir claramente:**
   - comportamento validado integralmente no ambiente virtual;
   - comportamento apenas simulado ou mockado;
   - comportamento que ainda exige teste em hardware real.
6. **O ambiente virtual deve ser organizado, reproduzível e versionado** por meio de scripts e documentação, evitando configurações exclusivamente manuais.
7. **Cada ciclo de testes deve registrar:**
   - topologia utilizada;
   - versões do OpenWrt;
   - recursos simulados;
   - comandos e testes executados;
   - resultados esperados e observados;
   - logs e evidências relevantes;
   - limitações da emulação;
   - procedimentos de restauração e rollback.
8. **A preparação, atualização e documentação do laboratório virtual fazem parte obrigatória** do processo de desenvolvimento e dos deploys de teste.
9. **A aprovação no ambiente virtual não autoriza automaticamente implantação física.** O teste em roteador real constitui uma etapa separada e somente pode ocorrer após autorização explícita do usuário por confirmação escrevendo **SIM**.

---

## 2. Topologia do Laboratório Virtual (VirtualBox)

### Especificações da Máquina Virtual Primária (`OpenWrt-ARK-Dev`)

| Parâmetro | Configuração Padrão | Justificativa Técnica |
| :--- | :--- | :--- |
| **Nome da VM** | `OpenWrt-ARK-Dev` | Identificador padronizado para scripts de automação. |
| **Imagem Base** | OpenWrt 24.10.0 x86_64 EFI (`ext4-combined-efi`) | Kernel moderno, suporte a fw4 (`nftables`), `apk` e ucode. |
| **Memória RAM** | 512 MB | Suficiente para isolar vazamentos de memória sem penalizar o host. |
| **Processadores** | 2 vCPUs | Permite testar concorrência de daemons e scripts ubus. |
| **Armazenamento** | VDI de 1.024 MB (1 GB redimensionado) | Espaço suficiente para pacotes de teste, logs e mocks. |
| **Firmware** | EFI (habilitado) | Padrão do OpenWrt x86 moderno. |

### Especificações da Máquina Virtual Legada (`OpenWrt-19-Legacy`)

| Parâmetro | Configuração Padrão | Justificativa Técnica |
| :--- | :--- | :--- |
| **Nome da VM** | `OpenWrt-19-Legacy` | Identificador padronizado para validação de perfis legados. |
| **Imagem Base** | OpenWrt 19.07.10 x86_64 BIOS (`ext4-combined`) | Kernel 4.14, suporte a fw3 (`iptables`), `opkg` e perfis legados. |
| **Memória RAM** | 256 MB | Simulação de hardware legado com restrição de memória. |
| **Processadores** | 1 vCPU | Simulação de SoC embarcado mononúcleo (MIPS 24Kc/74Kc / MT7628). |
| **Armazenamento** | VDI dinâmico (~16 MB host) | Simulação de restrição de Flash interna de 16 MB. |
| **Firmware** | BIOS MBR padrão | Bootloader GRUB BIOS legado do OpenWrt 19. |

### Matriz de Adaptadores e Interconexão entre Roteadores Virtuais

```
+-----------------------------------------------------------------------------------------+
|                                    Host Windows (Dev)                                   |
|                                                                                         |
|   OpenWrt-ARK-Dev (Moderno 24.10)               OpenWrt-19-Legacy (Legado 19.07)        |
|   - LuCI: http://localhost:8080                 - LuCI: http://localhost:8081           |
|   - SSH:  ssh root@localhost -p 2222            - SSH:  ssh root@localhost -p 2223      |
+--------------------------|---------------------------------------|----------------------+
                           |                                       |
    [NIC 1: NAT] (10.0.2.15/24)                             [NIC 1: NAT] (10.0.2.15/24)
                           |                                       |
                           +-------------------+-------------------+
                                               |
                +------------------------------v------------------------------+
                |     Rede Interna VirtualBox: "ark_router_lan"               |
                |                                                             |
                |  OpenWrt-ARK-Dev (NIC 3 / eth2):   192.168.19.2/24          |
                |  OpenWrt-19-Legacy (NIC 2 / eth1): 192.168.19.1/24 (GW/DNS) |
                +-------------------------------------------------------------+
```

---

## 3. Simulação de Recursos Avançados

### 3.1. Dual-WAN, Multi-WAN e Failover
- **WAN 1 Principal**: Utiliza a interface `eth0` provida pelo NAT do VirtualBox com acesso à internet.
- **WAN 2 Secundária**: Utiliza a interface `eth1` conectada a uma rede interna ou adaptador host-only.
- **Simulação de Queda de Link**:
  - Queda de cabo físico virtual via comando VirtualBox:
    ```powershell
    & "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm "OpenWrt-ARK-Dev" setlinkstate2 off
    ```
  - Reativação de cabo virtual:
    ```powershell
    & "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm "OpenWrt-ARK-Dev" setlinkstate2 on
    ```
  - Simulação de latência e perda de pacotes via `tc` / `netem`:
    ```sh
    tc qdisc add dev eth1 root netem delay 120ms 15ms loss 5%
    ```

### 3.2. Wi-Fi 7, MLO e Wireless via Mocks
Como ambientes virtualizados x86 não possuem chipsets de rádio físico Qualcomm/MediaTek, a emulação de Wi-Fi é realizada em duas camadas:

1. **Camada de Driver Virtual (`mac80211_hwsim`)**:
   - Cria rádios virtuais no kernel OpenWrt (`phy0`, `phy1`, `phy2`), permitindo que ferramentas como `hostapd`, `wpa_supplicant` e `iw` operem normalmente sem hardware físico.
2. **Camada de Mocking UCI e Ubus (`mock_wifi7_vm.sh`)**:
   - Injeta seções em `/etc/config/wireless` representando:
     - Rádio 2.4 GHz (802.11ax/be, 20/40 MHz);
     - Rádio 5 GHz (802.11be, 160 MHz);
     - Rádio 6 GHz (802.11be, 320 MHz com MLO - Multi-Link Operation).
   - Injeta mocks de telemetria no ubus (`iwinfo`) para simular clientes conectados com taxas MCS de Wi-Fi 7 (4096-QAM) e links MLO ativos.

### 3.3. SQM, CAKE e Controle de Bufferbloat
- Os testes de SQM executam o `kmod-sched-cake` nas interfaces virtuais `eth0` e `eth1`.
- Valida-se:
  - Formação de regras de enfileiramento `cake`;
  - Parâmetros `autorate-ingress`, `wash`, `diffserv4`;
  - Consumo de CPU das rotinas de shaper e integridade dos scripts de reinicialização (`/etc/init.d/sqm restart`).

### 3.4. Dualidade de Firewall (fw3 vs fw4)
- Na VM OpenWrt 24.10, o firewall padrão é `fw4` com backend `nftables`.
- Valida-se:
  - Inserção de chains e sets no nftables (`nft list ruleset`);
  - Ausência de chamadas incompatíveis a comandos `iptables` obsoletos;
  - Respeito à transição transparente e detecção automática realizada pelo script `ark-doctor`.

---

## 4. Ciclo de Vida da VM, Snapshots e Rollback

Para garantir que o ambiente seja limpo e reproduzível, o VirtualBox deve utilizar o recurso de **Snapshots** antes de testes invasivos ou experimentais.

### 4.1. Criando Snapshot Base Limpo
```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot "OpenWrt-ARK-Dev" take "baseline-clean" --description "OpenWrt 24.10 limpo com LuCI e configuracoes base"
```

### 4.2. Restaurando Estado Limpo (Rollback Instantâneo)
Caso um teste corrompa a rede da VM ou trave um serviço:
```powershell
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm "OpenWrt-ARK-Dev" poweroff
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" snapshot "OpenWrt-ARK-Dev" restore "baseline-clean"
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" startvm "OpenWrt-ARK-Dev" --type headless
```

---

## 5. Scripts de Automação do Laboratório (`tests/`)

| Script | Finalidade |
| :--- | :--- |
| `tests/setup_virtualbox_vm.ps1` | Faz o download oficial do OpenWrt x86, cria o VDI, configura os adaptadores de rede (NIC 1 NAT com portas 8080/8443/2222 e NIC 2 Dual-WAN) e inicia a VM. |
| `tests/start_vm.ps1` | Inicia a máquina virtual em modo headless e valida a conectividade das portas. |
| `tests/stop_vm.ps1` | Desliga a VM de forma graciosa (ACPI power button) com salvaguarda de desligamento forçado se necessário. |
| `tests/deploy_to_vm.ps1` | Compila o payload do ARK Router, envia via SSH/SCP para a porta 2222 da VM, extrai na raiz `/`, limpa cache LuCI e valida a carga do serviço. |
| `tests/setup_vm_mocks.sh` | Configura na VM as interfaces simuladas de Dual-WAN e mocks de Wi-Fi 7 (MLO 320 MHz). |

---

## 6. Modelo de Relatório de Ciclo de Testes Virtual

Cada execução de teste no ambiente virtual deve ser documentada utilizando a seguinte estrutura:

```markdown
### Relatório de Ciclo de Teste Virtual (ARK Router)
- **Data e Hora**: AAAA-MM-DD HH:MM
- **Versão do ARK Router**: 1.0.2
- **Ambiente Virtual**: VirtualBox x86_64 - OpenWrt 24.10.0 (Kernel 6.6)
- **Topologia Testada**: Dual-WAN (NIC 1 NAT + NIC 2 Host-Only) + Mocks Wi-Fi 7
- **Recursos Validados Integralmente no VirtualBox**:
  - [x] Inicialização de daemons (/etc/init.d/ark-router start)
  - [x] Chamadas ubus e permissões RPCD ACL
  - [x] Renderização da tela LuCI (DOM sem erros JS)
  - [x] Aplicação de regras fw4 (nftables) e SQM CAKE
- **Recursos Apenas Simulados / Mockados**:
  - [x] MLO Wi-Fi 7 (simulação via UCI/iwinfo mock)
  - [x] Roaming 802.11r/k/v (interfaces virtuais hwsim)
- **Comportamentos que Exigem Validação Física**:
  - Desempenho real do hardware offloading (Filogic PPE / Qualcomm NSS)
  - Cobertura de RF e sinal real de 6 GHz
- **Status Final**: APROVADO NO AMBIENTE VIRTUAL
```

---

## 7. Protocolo Estrito de Transição para Roteador Físico

> [!CAUTION]
> **TRAVA DE SEGURANÇA MANDATÓRIA**
> A aprovação no laboratório virtual **NÃO** concede autorização implícita para tocar em hardware físico.
> 
> A implantação em qualquer roteador real (ex: Cudy WR3000 em `192.168.1.1` ou Predator W6x em `192.168.73.1`) está **CONDICIONADA** à apresentação do relatório de testes do ambiente virtual e **exclusivamente mediante confirmação expressa do usuário digitando "SIM"**.
