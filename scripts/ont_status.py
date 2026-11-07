#!/usr/bin/env python3
"""
ont_status.py - Coleta de telemetria e diagnóstico da ONT TP-Link XZ005-G6
Uso:
  python3 scripts/ont_status.py [IP_ONT] [SENHA_ADMIN]
  ou defina a variável de ambiente ONT_PASSWORD.
"""

import os
import sys
import base64
import urllib.request
import urllib.parse
import http.cookiejar
import json
import re

def main():
    ont_ip = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("ONT_IP", "192.168.1.1")
    ont_pass = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("ONT_PASSWORD", "")

    if not ont_pass:
        print("Erro: Senha da ONT não informada.")
        print("Uso: python3 scripts/ont_status.py <IP_ONT> <SENHA_ADMIN>")
        print("Ou defina: export ONT_PASSWORD='sua_senha'")
        sys.exit(1)

    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # 1. Login via /cgi/login
    user_b64 = urllib.parse.quote(base64.b64encode(b"admin").decode())
    pwd_b64 = urllib.parse.quote(base64.b64encode(ont_pass.encode()).decode())
    login_url = f"http://{ont_ip}/cgi/login?UserName={user_b64}&Passwd={pwd_b64}&Action=1&LoginStatus=0"

    req_login = urllib.request.Request(
        login_url,
        data=b"",
        headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": f"http://{ont_ip}/superadmin"
        }
    )

    try:
        resp_login = opener.open(req_login, timeout=5).read().decode()
    except Exception as ex:
        print(f"Erro conectando à ONT em {ont_ip}: {ex}")
        sys.exit(1)

    if "$.ret=0" not in resp_login:
        print(f"Falha de autenticação na ONT: {resp_login.strip()}")
        sys.exit(1)

    # 2. Obter Token de index.htm
    req_idx = urllib.request.Request(
        f"http://{ont_ip}/index.htm",
        headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": f"http://{ont_ip}/"
        }
    )
    idx_content = opener.open(req_idx, timeout=5).read().decode("utf-8", errors="replace")
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
        try:
            res = opener.open(req, timeout=5).read().decode("utf-8", errors="replace")
            return json.loads(res)
        except Exception:
            return {}

    # 3. Consultas dos Data Models
    info = query("go", "DEV2_DEV_INFO").get("data", {})
    pon_list = query("gl", "DEV2_OPTC_GPON_CFG").get("data", [{}])
    pon = pon_list[0] if pon_list else {}
    cpu = query("go", "DEV2_PROC_STATUS").get("data", {})
    mem = query("go", "DEV2_MEM_STATUS").get("data", {})
    eth_list = query("gl", "DEV2_ETH_INTF_STATS").get("data", [{}])
    eth = eth_list[0] if eth_list else {}
    gpon_stats_list = query("gl", "DEV2_GPON_INTF_STATS").get("data", [{}])
    gpon_stats = gpon_stats_list[0] if gpon_stats_list else {}
    telnet = query("go", "DEV2_TELNET_CFG").get("data", {})

    rx_dbm = int(pon.get("RXPower", 0)) / 100.0 if pon.get("RXPower") else 0.0
    tx_dbm = int(pon.get("TXPower", 0)) / 100.0 if pon.get("TXPower") else 0.0
    temp_c = int(pon.get("transceiverTemperature", 0)) / 100.0 if pon.get("transceiverTemperature") else 0.0
    mem_total = int(mem.get("total", 0))
    mem_free = int(mem.get("free", 0))
    uptime_sec = int(info.get("upTime", 0))
    uptime_min = uptime_sec / 60.0

    print("=" * 60)
    print(f" DIAGNÓSTICO DA ONT TP-LINK XZ005-G6 ({ont_ip})")
    print("=" * 60)
    print(f" Modelo / HW:       {info.get('modelName')} ({info.get('hardwareVersion')})")
    print(f" Firmware:          {info.get('softwareVersion')}")
    print(f" Plataforma SoC:    {info.get('X_TP_PlatformCodeName')}")
    print(f" Uptime:            {uptime_sec} s (~{uptime_min:.1f} minutos)")
    print(f" Telnet Local:      {'Ativo (porta ' + telnet.get('telnetLocalPort', '23') + ')' if telnet.get('telnetLocalEnabled') == '1' else 'Inativo'}")
    print("-" * 60)
    print(" TELEMETRIA ÓPTICA GPON")
    print(f" Estado ONU:        O{pon.get('status')} ({pon.get('ponType')})")
    print(f" Potência RX:       {rx_dbm:.2f} dBm (Padrão: -8 a -27 dBm)")
    print(f" Potência TX:       {tx_dbm:.2f} dBm")
    print(f" Temp. Módulo:      {temp_c:.2f} °C")
    print(f" Tráfego GPON:      TX {int(gpon_stats.get('bytesSent', 0)) / (1024*1024):.1f} MB | RX {int(gpon_stats.get('bytesReceived', 0)) / (1024*1024):.1f} MB")
    print("-" * 60)
    print(" RECURSOS DE PROCESSAMENTO & REDE LOCAL")
    print(f" Uso de CPU:        {cpu.get('CPUUsage')}%")
    print(f" Memória RAM:       {mem_free} KB livres de {mem_total} KB ({mem_free * 100 // max(1, mem_total)}% livre)")
    print(f" Porta 2.5GbE:      TX {eth.get('packetsSent', 0)} pkts | RX {eth.get('packetsReceived', 0)} pkts")
    print(f" Descartes Eth:     TX {eth.get('discardPacketsSent', 0)} | RX {eth.get('discardPacketsReceived', 0)}")
    print(f" Erros Físicos Eth: TX {eth.get('errorsSent', 0)} | RX {eth.get('errorsReceived', 0)}")
    print("=" * 60)

if __name__ == "__main__":
    main()
