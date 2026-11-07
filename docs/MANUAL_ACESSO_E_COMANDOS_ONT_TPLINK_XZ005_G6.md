# Manual Técnico: Acesso e Comandos da ONT TP-Link XZ005-G6

Este documento registra a arquitetura de software, portas, credenciais, catálogo de comandos CLI (Telnet) e a API de Data Model (CGI/JSON) da ONT **TP-Link XZ005-G6** (hardware v1.0, firmware `0.2.0 3.0.0 v6066.0 Build 250711 Rel.74023n`).

---

## 1. Identificação de Hardware e Plataforma

* **Modelo Comercial**: TP-Link XZ005-G6 (EU) v1.0
* **Descrição do Produto**: *XPON SFU with 1-port 2.5Gb LAN*
* **SoC / Plataforma**: MediaTek / EcoNet *Volcano* (EN7571)
* **Memória RAM**: ~32 MB (27.532 KB utilizáveis pelo kernel)
* **Porta de Rede**: 1x RJ45 2.5 Gbps Multi-Gigabit (`eth0_1`)
* **Porta Óptica**: SC/APC GPON / EPON (Classe B+ / C+)
* **Endereço IP Padrão**: `192.168.1.1` (máscara `255.255.255.0`)
* **Modo de Operação**: SFU (*Single Family Unit*) em Bridge puro (sem NAT, sem PPPoE interno, sem Wi-Fi)

---

## 2. Visão Geral dos Protocolos de Acesso

| Protocolo | Porta | Status | Observações |
|---|---|---|---|
| **HTTP** | `80` | **Ativo** | Interface Web clássica e API de Data Model `/cgi?9`. Suporta autenticação Base64. |
| **Telnet** | `23` | **Ativo** | CLI proprietário TP-Link. Requer negociação RFC 854. |
| **SSH** | `22` | **Desativado** | Retorna `Connection refused`. Compilado de fábrica com `INCLUDE_SSH_ACCESS=0`. |
| **HTTPS** | `443` | **Desativado** | Compilado sem SSL web (`INCLUDE_HTTP_SSL=0`). |

---

## 3. Acesso via Telnet (Porta 23)

### 3.1. Requisitos de Conexão
Diferente de um roteador Linux padrão com BusyBox ash, a XZ005-G6 executa um daemon Telnet proprietário da TP-Link. Clientes como o utilitário nativo `telnet` negociam automaticamente, mas scripts em Python/sockets brutos **devem responder à negociação de opções (RFC 854)** antes de enviar a senha:

* Bytes de recusa/aceite padrão: `\xff\xfc\x01\xff\xfc\x1f\xff\xfd\x01\xff\xfd\x03`
* Prompt de autenticação: `Password:`
* Prompt de comando inicial: `TP-Link(conf)#` (ou `TP-Link#`)

### 3.2. Estrutura de Modos
1. **Modo Normal / Privilegiado (`TP-Link#`)**: Acessado executando `exit` a partir do modo conf.
2. **Modo de Configuração (`TP-Link(conf)#`)**: Modo padrão pós-login ou acessado digitando `config`.

### 3.3. Tabela Completa de Comandos Telnet

#### Comandos Gerais do Sistema
| Comando | Descrição |
|---|---|
| `help` | Exibe o menu principal de comandos disponíveis no modo ativo. |
| `history` | Exibe o histórico de comandos digitados na sessão. |
| `clear` | Limpa a tela do terminal. |
| `exit` | Retorna do modo `TP-Link(conf)#` para `TP-Link#` ou encerra a sessão. |
| `logout` | Encerra a sessão Telnet imediatamente. |
| `config` | Entra no modo de configuração (`TP-Link(conf)#`). |

#### Controle de Dispositivo (`dev`)
| Comando | Descrição | Saída Típica |
|---|---|---|
| `dev version` | Exibe a versão de firmware e build ativa. | `softwareVersion=0.2.0 3.0.0 v6066.0 Build 250711 Rel.74023n` |
| `dev serial show` | Exibe o número de série da ONT. | Serial gravado na fábrica |
| `dev show prodName` | Exibe o nome do produto. | `XZ005-G6` |
| `dev show prodVer` | Exibe a versão do modelo. | `1.0` |
| `dev show prodSoftVer` | Exibe o número de revisão do software. | `1437204482` |
| `dev show prodHardVer` | Exibe a versão de hardware. | `XZ005-G6 v1.0 00000000` |
| `dev reboot` | Reinicia a ONT imediatamente. | Confirmação e reboot |
| `dev reset` | Restaura a ONT para as configurações de fábrica. | Limpa NVRAM e reinicia |

#### Rede Local (`lan` e `group`)
| Comando | Descrição | Parâmetros / Saída |
|---|---|---|
| `lan show info` | Exibe detalhes da bridge LAN (`br0`), MAC, IP, máscara e status do DHCP. | Retorna bloco com `ifName=br0`, `MACAddress`, `IPAddress=192.168.1.1`, etc. |
| `group show info` | Exibe o agrupamento de portas virtuais e isolamento. | Agrupamento padrão da porta 2.5G |

#### Conexão WAN (`wan`)
*Nota: Como este modelo opera como SFU Bridge puro, as tabelas de WAN roteada são nulas no firmware.*
| Comando | Descrição |
|---|---|
| `wan show defaultgw` | Exibe o gateway padrão configurado na ONT. |
| `wan show service` | Exibe os serviços WAN mapeados. |
| `wan show connection info` | Exibe detalhes da conexão WAN física. |

---

## 4. Acesso via Web GUI (Porta 80)

### 4.1. Páginas Disponíveis no Firmware SFU
A compilação SFU enxuta da TP-Link removeu telas de roteadores complexos, mantendo apenas os módulos de ponte:

* **Status Geral**: `http://192.168.1.1/main/status.htm`
  * Status óptico (Potência TX/RX, Temperatura, Tensão, Bias).
  * Uso de CPU e Memória RAM.
  * Status da porta LAN 2.5G.
* **Configuração GPON / LOID**: `http://192.168.1.1/main/gponcfg.htm`
  * Modo PON (GPON / EPON).
  * GPON Serial Number (SN) e Senha GPON / SLID (usados na autenticação na OLT da operadora).
* **VLANs da SFU**: `http://192.168.1.1/main/sfuVlanCfg.htm`
  * Mapeamento de VLANs da porta óptica para a porta 2.5GbE (Modo Tag, Untag, Trunk).
* **Configuração de LAN / IP**: `http://192.168.1.1/main/dhcp.htm`
  * Configuração do endereço IP de gerência e pool DHCP local.
* **Gerenciamento e Senha**: `http://192.168.1.1/main/manageCtrl.htm`
  * Troca de senha de administrador e regras de acesso local.
* **Atualização de Firmware**: `http://192.168.1.1/main/softup.htm`
* **Backup e Restauração**: `http://192.168.1.1/main/backNRestore.htm`

*Nota: Páginas como `log.htm`, `route.htm`, `cwmp.htm` e `snmp.htm` foram desabilitadas do romfs pelo fabricante e retornam `HTTP 406 Not Acceptable`.*

---

## 5. API de Data Model (CGI / JSON via `/cgi?9`)

A comunicação entre a interface web e o daemon de gerenciamento (`cmm`) é feita via chamadas HTTP estruturadas. Esse mecanismo pode ser chamado programaticamente por scripts para coletar telemetria sem interface gráfica.

### 5.1. Fluxo de Autenticação
1. **Autenticação (`/cgi/login`)**:
   * Método: `POST`
   * URL: `http://192.168.1.1/cgi/login?UserName=<USER_B64>&Passwd=<PASS_B64>&Action=1&LoginStatus=0`
   * Credenciais codificadas em Base64 padrão.
   * Resposta de sucesso: `$.ret=0;` com cookie `JSESSIONID`.
2. **Obtenção do Token de Sessão**:
   * Fazer requisição `GET` para `http://192.168.1.1/index.htm` carregando o cookie `JSESSIONID`.
   * Extrair o valor da variável JavaScript `var token="...";`.
3. **Execução de Consultas (`/cgi?9`)**:
   * Método: `POST`
   * Cabeçalhos obrigatórios:
     * `TokenID: <token>`
     * `Referer: http://192.168.1.1/index.htm`
     * `Content-Type: text/plain`
   * Estrutura do Payload JSON:
     ```json
     {
       "operation": "go",
       "oid": "<NOME_DO_OID>",
       "data": {
         "stack": "0,0,0,0,0,0",
         "pstack": "0,0,0,0,0,0"
       }
     }
     ```
     * `operation`:
       * `"go"`: *Get Object* (consulta objeto único)
       * `"gl"`: *Get List* (consulta lista/tabela de instâncias)
       * `"so"`: *Set Object* (altera parâmetros)
       * `"ao"`: *Add Object* (adiciona entrada)
       * `"do"`: *Delete Object* (remove entrada)
       * `"op"`: *Operation* (operações como reboot/reset)

---

## 6. Catálogo de OIDs Úteis para Monitoramento

### 6.1. Informações do Dispositivo (`DEV2_DEV_INFO`)
* **Operação**: `go`
* **Campos Principais**:
  * `modelName`: Nome do modelo (`XZ005-G6`).
  * `hardwareVersion`: Versão do hardware (`XZ005-G6 v1.0 00000000`).
  * `softwareVersion`: Versão de software e build.
  * `upTime`: Tempo de atividade em segundos.
  * `X_TP_PlatformCodeName`: Codinome da plataforma SoC (`Volcano`).
  * `X_TP_AuthExpireTime`: Timeout de bloqueio de autenticação (`600` segundos).

### 6.2. Status Óptico GPON (`DEV2_OPTC_GPON_CFG`)
* **Operação**: `gl`
* **Campos Principais**:
  * `ponType`: Modo PON ativo (`GPON`).
  * `status`: Estado da máquina de estados GPON (`5` = Estado O5 *Operation State*).
  * `RXPower`: Potência óptica recebida em centésimos de dBm (ex: `-2244` = -22.44 dBm).
  * `TXPower`: Potência óptica transmitida em centésimos de dBm (ex: `241` = +2.41 dBm).
  * `transceiverTemperature`: Temperatura do módulo óptico em centésimos de °C (ex: `6763` = 67.63 °C).
  * `supplyVottage`: Tensão de alimentação (ex: `318` = 3.18 V).
  * `biasCurrent`: Corrente de bias em centésimos de mA (ex: `1400` = 14.00 mA).

### 6.3. Estatísticas de Tráfego GPON (`DEV2_GPON_INTF_STATS`)
* **Operação**: `gl`
* **Campos Principais**:
  * `bytesSent`: Total de bytes transmitidos na fibra.
  * `bytesReceived`: Total de bytes recebidos da fibra.
  * `packetsSent`: Total de pacotes transmitidos.
  * `packetsReceived`: Total de pacotes recebidos.

### 6.4. Estatísticas da Interface Ethernet 2.5G (`DEV2_ETH_INTF_STATS`)
* **Operação**: `gl`
* **Campos Principais**:
  * `packetsSent` / `packetsReceived`: Pacotes na porta física 2.5 Gbps.
  * `discardPacketsSent` / `discardPacketsReceived`: Pacotes descartados por saturação de buffer.
  * `errorsSent` / `errorsReceived`: Erros de CRC/enquadramento físico na porta.

### 6.5. Recursos de Hardware (`DEV2_MEM_STATUS` e `DEV2_PROC_STATUS`)
* **Operação**: `go`
* **Campos Principais**:
  * `DEV2_MEM_STATUS` -> `total` e `free`: Memória RAM total e livre em KB.
  * `DEV2_PROC_STATUS` -> `CPUUsage`: Percentual de uso de CPU (ex: `1` = 1%).

### 6.6. Configuração de Telnet (`DEV2_TELNET_CFG`)
* **Operação**: `go`
* **Campos Principais**:
  * `telnetLocalEnabled`: `1` (ativo) ou `0` (desativado).
  * `telnetLocalPort`: Porta Telnet local (`23`).

---

## 7. Script Utilitário em Python para Coleta Automatizada

O script abaixo pode ser executado a partir de qualquer máquina conectada à rede (Mac ou roteador OpenWrt com python3) para extrair instantaneamente as métricas de fibra e integridade da ONT:

```python
#!/usr/bin/env python3
"""
ont_status.py - Coleta de telemetria da TP-Link XZ005-G6
Uso: python3 ont_status.py <IP_ONT> <SENHA_ADMIN>
"""
import sys
import base64
import urllib.request
import urllib.parse
import http.cookiejar
import json
import re

def main():
    ont_ip = sys.argv[1] if len(sys.argv) > 1 else "192.168.1.1"
    ont_pass = sys.argv[2] if len(sys.argv) > 2 else "admin0100"
    
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    
    # 1. Login
    user_b64 = urllib.parse.quote(base64.b64encode(b"admin").decode())
    pwd_b64 = urllib.parse.quote(base64.b64encode(ont_pass.encode()).decode())
    login_url = f"http://{ont_ip}/cgi/login?UserName={user_b64}&Passwd={pwd_b64}&Action=1&LoginStatus=0"
    
    req_login = urllib.request.Request(login_url, data=b"", headers={
        "User-Agent": "Mozilla/5.0",
        "Referer": f"http://{ont_ip}/superadmin"
    })
    opener.open(req_login)
    
    # 2. Obter Token
    req_idx = urllib.request.Request(f"http://{ont_ip}/index.htm", headers={
        "User-Agent": "Mozilla/5.0",
        "Referer": f"http://{ont_ip}/"
    })
    idx_content = opener.open(req_idx).read().decode("utf-8", errors="replace")
    m = re.search(r'var token="([^"]+)"', idx_content)
    token = m.group(1) if m else ""
    
    def query(op, oid):
        payload = json.dumps({
            "operation": op,
            "oid": oid,
            "data": {"stack": "0,0,0,0,0,0", "pstack": "0,0,0,0,0,0"}
        }) + "\r\n"
        req = urllib.request.Request(
            f"http://{ont_ip}/cgi?9",
            data=payload.encode("utf-8"),
            headers={
                "User-Agent": "Mozilla/5.0",
                "Referer": f"http://{ont_ip}/index.htm",
                "TokenID": token,
                "Content-Type": "text/plain"
            }
        )
        return json.loads(opener.open(req).read().decode("utf-8", errors="replace"))

    # Coletar OIDs
    info = query("go", "DEV2_DEV_INFO").get("data", {})
    pon = query("gl", "DEV2_OPTC_GPON_CFG").get("data", [{}])[0]
    cpu = query("go", "DEV2_PROC_STATUS").get("data", {})
    mem = query("go", "DEV2_MEM_STATUS").get("data", {})
    eth = query("gl", "DEV2_ETH_INTF_STATS").get("data", [{}])[0]

    rx_dbm = int(pon.get("RXPower", 0)) / 100.0
    tx_dbm = int(pon.get("TXPower", 0)) / 100.0
    temp_c = int(pon.get("transceiverTemperature", 0)) / 100.0
    mem_total = int(mem.get("total", 0))
    mem_free = int(mem.get("free", 0))

    print(f"==================================================")
    print(f" ONT TP-Link XZ005-G6 Telemetria ({ont_ip})")
    print(f"==================================================")
    print(f" Uptime:           {info.get('upTime')} segundos")
    print(f" Firmware:         {info.get('softwareVersion')}")
    print(f" Plataforma:       {info.get('X_TP_PlatformCodeName')}")
    print(f" Estado ONU GPON:  O{pon.get('status')} ({pon.get('ponType')})")
    print(f" Potência RX:      {rx_dbm:.2f} dBm")
    print(f" Potência TX:      {tx_dbm:.2f} dBm")
    print(f" Temp. Módulo:     {temp_c:.2f} °C")
    print(f" Uso de CPU:       {cpu.get('CPUUsage')}%")
    print(f" Memória Livre:    {mem_free} KB / {mem_total} KB")
    print(f" Descartes Eth:    TX {eth.get('discardPacketsSent')}, RX {eth.get('discardPacketsReceived')}")
    print(f" Erros Eth:        TX {eth.get('errorsSent')}, RX {eth.get('errorsReceived')}")
    print(f"==================================================")

if __name__ == "__main__":
    main()
```
