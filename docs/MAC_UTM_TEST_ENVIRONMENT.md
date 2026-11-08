# Ambiente de Testes UTM (macOS Nativo) - ARK Router

## 1. Visão Geral
Este documento define o ambiente oficial de virtualização e testes para o macOS (Apple Silicon M1/M2/M3/M4 e Intel).
O **UTM** é o hipervisor homologado padrão para o macOS porque permite virtualização nativa com aceleração de hardware via `Hypervisor.framework`, suportando perfeitamente:
- **Testes de UI / LuCI Frontend**: Acesso HTTP/HTTPS instantâneo na rede local com validação visual e DOM.
- **Testes de Roteamento, Kernel & Firewall**: Suporte nativo completo a `fw4` (nftables), `fw3` (iptables), `kmod-sched-cake` (SQM) e cenários Multi-WAN.

---

## 2. Imagens Prontas Disponíveis no Mac
O diretório local `~/Downloads/OpenWrt-ARK-UTM/` já contém as imagens prontas e homologadas para uso imediato no UTM:

1. **`OpenWrt-24-Moderno.img`** (~965 MB):
   - **Plataforma**: OpenWrt 24.10.x (x86_64 EFI).
   - **Mecanismos**: `fw4` (`nftables`), `apk` / `opkg`, DSA e kernel moderno.
   - **Uso**: Homologação principal da versão moderna do ARK Router.
2. **`OpenWrt-19-Legado.img`** (~495 MB):
   - **Plataforma**: OpenWrt 19.07.x (x86_64 EFI).
   - **Mecanismos**: `fw3` (`iptables`), `opkg` clássico.
   - **Uso**: Testes estritos de retrocompatibilidade com hardware legado (16MB Flash / 128MB RAM).

Caso necessite gerar uma imagem limpa adicional, execute:
```bash
./scripts/prepare_mac_utm_image.sh
```

---

## 3. Gerenciamento 100% por Linha de Comando (CLI Headless)

Para máxima produtividade e automação contínua de testes sem depender de janelas gráficas ou sofrer com restrições de permissões AppleEvents/TCC do macOS, o repositório disponibiliza o utilitário canônico:

👉 `scripts/mac_vm.sh`

Este script executa a VM diretamente pelo motor nativo QEMU/UTM com proteção **`-snapshot`** (nunca altera o disco original), expondo LuCI em `http://localhost:8085` e Dropbear SSH na porta `2225`.

### Comandos Canônicos do CLI:

```bash
# 1. Iniciar VM Moderna (OpenWrt 24.10 / fw4 / nftables)
./scripts/mac_vm.sh start modern

# 2. Iniciar VM Legada (OpenWrt 19.07 / fw3 / iptables)
./scripts/mac_vm.sh start legacy

# 3. Verificar status do processo, portas e conectividade
./scripts/mac_vm.sh status

# 4. Abrir console serial direto da VM (BusyBox ash root)
./scripts/mac_vm.sh shell

# 5. Sincronizar e aplicar todo o código ativo no roteador virtual
./scripts/mac_vm.sh deploy

# 6. Rodar a bateria completa de 226 testes de homologação na VM
./scripts/mac_vm.sh test

# 7. Encerrar a VM e liberar recursos
./scripts/mac_vm.sh stop
```

---

## 4. Configuração Opcional via Aplicativo Gráfico (UTM.app)

Caso deseje operar a VM com interface gráfica pelo app UTM:
2. Clique no ícone **+** (Criar uma nova máquina virtual).
3. Selecione **Virtualizar** (Virtualize) para máxima velocidade de CPU nativa.
4. Selecione **Outro** (Other) e marque a opção **Pular inicialização ISO** (Skip ISO boot).
5. **Hardware**: Configure **512 MB ou 1024 MB de RAM** e **2 Núcleos**.
6. **Armazenamento**:
   - Avance a tela inicial de tamanho de disco padrão.
   - Após salvar a VM (nomeie como `OpenWrt-24-Moderno` ou `OpenWrt-ARK-Dev-Mac`), clique nela e acerte as configurações (ícone de engrenagem).
   - Na aba **Unidades** (Drives), exclua a unidade padrão vazia.
   - Clique em **Nova** -> **Importar** e selecione `~/Downloads/OpenWrt-ARK-UTM/OpenWrt-24-Moderno.img`.
7. **Rede (Dual-WAN / LAN)**:
   - **Placa 1 (Network 1)**: Configure como **Shared Network** (NAT). Esta será a `eth0` (WAN Principal com internet).
   - **Placa 2 (Network 2)**: Clique em **Nova** e configure como **Bridged** ou **Host Only**. Esta será a `eth1` (LAN / WAN Secundária de testes).
8. Clique em **Iniciar** (Play).

---

## 4. Fluxo de Trabalho Integrado & Testes

Com a VM rodando no UTM:
1. **Acesso ao LuCI / SSH**:
   - A VM obtém IP automaticamente na rede Shared (geralmente faixa `192.168.64.x` ou acessível via SSH na porta configurada).
   - Verifique o IP atribuído no console do UTM rodando `ip a` ou `uci show network`.
2. **Deploy Local do Pacote**:
   - Para deploy direto sem reinstalação:
     ```bash
     ARK_ROUTER_IP="<IP_DA_VM>" ARK_ROUTER_TEST_PASSWORD="sua_senha" python3 scripts/deploy_direct.py
     ```
   - Para envio de pacote `.apk`:
     ```bash
     scp dist/sdk/luci-app-ark-router-2.2.2.apk root@<IP_DA_VM>:/tmp/
     ssh root@<IP_DA_VM> "apk add --allow-untrusted /tmp/luci-app-ark-router-2.2.2.apk"
     ```
3. **Execução da Suíte de Testes Dentro da VM**:
   - Copie e execute a bateria canônica de validação:
     ```bash
     scp tests/lab/run_vm_all_tests.sh root@<IP_DA_VM>:/tmp/
     ssh root@<IP_DA_VM> "sh /tmp/run_vm_all_tests.sh"
     ```

> **Regra de Ouro ARK Router**: Todas as alterações devem ser validadas nesta VM antes de qualquer implantação em equipamento físico real.
