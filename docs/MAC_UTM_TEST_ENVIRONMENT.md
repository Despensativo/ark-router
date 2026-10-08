# Ambiente de Testes UTM (macOS Nativo) - ARK Router

## 1. Visão Geral
Este documento define o equivalente oficial ao `VIRTUALBOX_TEST_ENVIRONMENT.md` para ambientes macOS (Apple Silicon M1/M2/M3 e Intel).
O **UTM** foi homologado como o hipervisor padrão para o macOS porque ele permite virtualização completa (Full VM) utilizando o framework nativo da Apple (Hypervisor.framework), suportando perfeitamente **testes de UI (front-end)** e **testes de Roteamento/Kernel (SQM, Dual-WAN, nftables)** simultaneamente.

## 2. Preparando a Imagem Base
O script automatizado faz o download, extração e redimensionamento exato da imagem EFI do OpenWrt 24.10.0 (padrão ARK Dev).
Abra o terminal do seu Mac e rode:
```bash
./scripts/prepare_mac_utm_image.sh
```
O arquivo final será salvo em `~/Downloads/OpenWrt-ARK-UTM/ark-dev-disk.img`.

## 3. Criando a VM no UTM (Passo a Passo)
1. Abra o aplicativo **UTM** e clique em **+ Criar uma nova máquina virtual**.
2. Escolha **Virtualizar** (para máxima velocidade nativa).
3. Selecione **Outro** (Other) e marque a opção **Pular inicialização ISO**.
4. **Hardware**: Configure **512 MB de RAM** e **2 Núcleos**.
5. **Armazenamento**: 
   - A tela inicial pedirá um tamanho. Ignore e prossiga.
   - Após salvar a VM (nomeie como `OpenWrt-ARK-Dev-Mac`), clique nela e vá no ícone de **Configurações** (engrenagem).
   - Vá na aba **Unidades** (Drives), clique na unidade padrão vazia e clique em **Apagar**.
   - Clique em **Nova** -> **Importar**, e navegue até selecionar o arquivo `ark-dev-disk.img` criado no passo 2.
6. **Rede (Crucial para Dual-WAN)**:
   - Vá na aba **Rede**.
   - A primeira placa (Network 1) deve ficar como **Shared Network** (NAT). Esta será a `eth0` (WAN Principal com internet).
   - Clique em **Nova** (New Network).
   - Configure a segunda placa como **Host Only** ou **Bridged**. Esta será a `eth1` (WAN Secundária / LAN de testes).

## 4. Fluxo de Trabalho Integrado
Com esta VM rodando no UTM:
1. **Testes Visuais**: Você pode enviar o `.apk` localmente para ela ou rodar o `scripts/deploy_direct.py` injetando seus códigos e testando a UI em milissegundos acessando o IP local gerado pela placa (ex: `http://192.168.64.2`).
2. **Testes de Roteamento**: Você tem um Kernel Linux puro (mesmo no Mac M1, o UTM roda a versão arm64 ou traduz a x86_64 brutalmente rápido) onde o `kmod-sched-cake` e o `fw4` funcionam nativamente.

> **Regra de Ouro ARK Router mantida:** Todas as validações devem passar nesta VM antes de ir para o Cudy ou Predator físico.
