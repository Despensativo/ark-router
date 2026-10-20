### ⚡ ARK Router v2.0.2 — Otimização RF 2.4 GHz (256-QAM + Anti-Saturação), OTA Instantâneo & Blindagem de Boot

- **📡 Otimização Autônoma Wi-Fi 2.4 GHz (`vendor_vht=1` + Teto Anti-Saturação `22 dBm`)**:
  - Ativa automaticamente **256-QAM (`vendor_vht=1`)** no rádio 2.4 GHz (+33% de velocidade física para clientes Wi-Fi 5 sem afetar dispositivos IoT).
  - Em roteadores Dual-Band, limita automaticamente a potência do 2.4 GHz a **`22 dBm`** quando em automático (`30 dBm` / 1W), eliminando a saturação do amplificador de recepção (LNA clipping a `-15 dBm`), zerando tempestades de `tx failed` e destravando o *Band Steering* (`802.11v BSS Transition`) para jogar celulares e notebooks para o 5 GHz (`160 MHz`).
- **🔄 Verificador OTA Instantâneo (`self-update-check force` + Cache-Buster CDN)**:
  - O botão **"Verificar atualização"** agora força consulta em tempo real ao GitHub (`force`) com cache-buster `?t=<timestamp>` no CDN Fastly e sincronização imediata do `localStorage`.
  - Reduzido o TTL de cache negativo (`available=false` ou erro de rede no boot) para 5 minutos (`300s`), e suporte a `./data.tar.gz` na extração de contingência de pacotes `.ipk`.
- **🛡️ Blindagem de Boot (`https-dns-proxy` + `ark-hardware-tune` + `cronloglevel`)**:
  - Correção da limpeza de seções anônimas UCI do `https-dns-proxy` (`@https-dns-proxy[0]`), eliminando colisão na porta `5054` (`Address in use`) durante o boot.
  - Debounce de 10 segundos no `ark-hardware-tune` contra disparos simultâneos de hotplug (`wan` + `wan6`) e ajuste automático de `cronloglevel='9'` para eliminar logs repetitivos de `cron.err` a cada minuto.
