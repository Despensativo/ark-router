# Estudo de Engenharia: TCP BBR, TFO (RFC 7413), DNS Stale Cache (RFC 8767) e ECN no ARK Router

**Autor**: Equipe de Engenharia ARK Router & Antigravity  
**Data**: 29 de Outubro de 2026  
**Alvo**: OpenWrt 25.12.x / Kernel Linux 6.12+ (MediaTek Filogic mt7986 / mt7981 / Qualcomm IPQ)  
**Status**: Homologado e Validado ao Vivo  

---

## 1. Resumo Executivo

Este documento aprofunda o estudo individual das quatro principais tecnologias modernas de transporte e baixa latência de rede consideradas para incorporação nativa no ecossistema do **ARK Router**:
1. **TCP BBR (v1)** com contenção de Bufferbloat de socket (`tcp_notsent_lowat = 16384`).
2. **TCP Fast Open (TFO - RFC 7413)** bidirecional (`tcp_fastopen = 3`).
3. **DNS Stale Cache & Resiliência (RFC 8767)** no `dnsmasq 2.93`.
4. **ECN (Explicit Congestion Notification - RFC 3168 / RFC 8311)** no Linux Kernel.

O objetivo é mapear o comportamento de cada tecnologia, identificar armadilhas potenciais (*pitfalls*), verificar compatibilidade entre hardwares de diferentes portes (16 MB Flash / 128 MB RAM vs 1 GB RAM Quad-Core) e blindar o ARK Router contra regressões operacionais.

---

## 2. Estudo Individual & Análise de Riscos

### 2.1. TCP BBR (*Bottleneck Bandwidth and RTT*)

#### A. Mecanismo
Diferente dos algoritmos tradicionais baseados em perda (*Loss-Based*) como o Cubic, o BBR mede constantemente a taxa de entrega máxima (*max bandwidth*) e o RTT mínimo físico da rota, operando no ponto ideal de Kleinrock sem criar filas artificiais nos roteadores da internet.

#### B. Benefícios para o Roteador
* **Túneis WireGuard / OpenVPN:** Mantém throughput estável mesmo quando acessado via conexões móveis 4G/5G com ruído de rádio e perdas aleatórias de pacotes.
* **Túneis Dual-DoH (HTTPS):** Recuperação instantânea de latência nas consultas DNS criptografadas aos servidores Cloudflare/Google (portas 5053 e 5054).
* **Zero Bufferbloat Interno com `tcp_notsent_lowat = 16384`:** O Linux padrão permite que programas joguem megabytes de dados brutos na fila de socket (`write queue`), criando até 80ms de latência dentro do próprio kernel. Com `16 KB`, a fila local responde em menos de 1 milissegundo.

#### C. Armadilhas (❌) e Soluções Canônicas (✅)
* ❌ **Armadilha 1: Pacing em Qdisc Inadequada (`pfifo_fast`).**  
  * *Sintoma:* O BBR precisa de pacing de pacotes (espaçamento uniforme). Em qdiscs legadas, o pacing é emulado por software via *high-resolution timers*, elevando o uso de CPU.
  * ✅ *Solução Canônica:* Garantir que `net.core.default_qdisc` seja `fq_codel` ou `fq`. No OpenWrt moderno (W6x e Cudy), o padrão já é `fq_codel`.
* ❌ **Armadilha 2: Exaustão de RAM em Roteadores Compactos.**  
  * *Sintoma:* Se janelas TCP de 16 MB (`tcp_rmem` / `tcp_wmem`) forem aplicadas em roteadores com 128 MB de RAM (ex: D-Link DGL-5500), downloads simultâneos podem acionar o OOM (*Out Of Memory Killer*).
  * ✅ *Solução Canônica:* Aplicação **Hardware-Adaptive** dentro de `ark-hardware-tune`:
    - *High-Spec (1 GB+ RAM):* `16 MB` máx.
    - *Mid-Spec (256-512 MB RAM):* `4 MB` máx.
    - *Low-Spec (<= 128 MB RAM):* `1 MB` máx e fallback para Cubic se `kmod-tcp-bbr` não estiver presente.
* ❌ **Armadilha 3: Tentativa cega de aplicar BBR sem o módulo carregado.**  
  * *Sintoma:* Se o sysctl tentar aplicar `bbr` antes de carregar o módulo, o kernel rejeita com `Invalid argument`.
  * ✅ *Solução Canônica:* Checagem condicional com `modprobe tcp_bbr 2>/dev/null` e validação em `sysctl net.ipv4.tcp_available_congestion_control`.

---

### 2.2. TCP Fast Open (TFO - RFC 7413)

#### A. Mecanismo
Permite que dados úteis de payload (como o TLS ClientHello ou requisição HTTP) sejam transmitidos no primeiro pacote TCP SYN inicial, economizando 1 RTT completo (30ms a 60ms) no estabelecimento da conexão.

#### B. Armadilhas (❌) e Soluções Canônicas (✅)
* ❌ **Armadilha 1: Middleboxes Antigos de Operadoras (Drop de SYN com dados).**  
  * *Sintoma:* Certos roteadores de borda/CGNAT obsoletos descartam pacotes SYN que carregam dados (violando RFCs modernas). Se não houver tratamento, a conexão congela em timeout de 3 segundos.
  * ✅ *Mitigação Nativas do Linux 6.12:* O kernel Linux implementa o **TFO Blackhole Detection** automático (`net.ipv4.tcp_fastopen_blackhole_timeout_sec`). Se pacotes SYN com dados não receberem resposta em tentativas consecutivas, o kernel desativa o TFO temporariamente e faz fallback transparente para SYN normal sem travar a navegação do usuário.
* ✅ *Ajuste Canônico:* `net.ipv4.tcp_fastopen = 3` (habilita TFO tanto no modo cliente quanto no modo servidor, acelerando o LuCI local e os túneis remotos).

---

### 2.3. DNS Stale Cache & Resiliência (RFC 8767 no `dnsmasq 2.93`)

#### A. Mecanismo
O `dnsmasq 2.93` implementa a RFC 8767 (*"Serving Stale Data to Improve DNS Resiliency"*). Quando o TTL de um domínio em cache expira, se um cliente fizer uma consulta, o dnsmasq entrega imediatamente o registro expirado com TTL curto (latência de 0ms) e simultaneamente dispara uma requisição em segundo plano para o upstream (Dual-DoH) atualizar o cache.

#### B. Armadilhas (❌) e Soluções Canônicas (✅)
* ❌ **Armadilha 1: Congelamento de IPs em Dynamic DNS / Migrações de CDN.**  
  * *Sintoma:* Se o stale cache permitir registros com validade infinita, domínios de IP dinâmico poderiam entregar IPs defasados durante quedas de upstream prolongadas.
  * ✅ *Solução Canônica:* Delimitar o teto máximo de expiração com `--use-stale-cache=3600` (máximo de 1 hora de tolerância). Se o registro tiver expirado há mais de 1 hora, o dnsmasq é forçado a consultar o upstream normalmente.

---

### 2.4. ECN (Explicit Congestion Notification - RFC 3168)

#### A. Mecanismo
Permite que o roteador e os roteadores de trânsito marquem pacotes com bits CE (*Congestion Experienced*) em vez de dropá-los quando a fila começa a inchar. O BBR e o CAKE entendem essas marcações e desaceleram suavemente sem provocar retransmissões.

#### B. Armadilhas (❌) e Soluções Canônicas (✅)
* ❌ **Armadilha 1: Incompatibilidade com Servidores que não suportam ECN se forçado com `tcp_ecn = 1`.**  
  * *Sintoma:* Forçar ECN em 100% das conexões de saída pode causar perda de pacotes em sites legados raros que não tratam bits ECN adequadamente.
  * ✅ *Solução Canônica:* Adotar **`net.ipv4.tcp_ecn = 2`** (Habilitado sob demanda e negociado). O OpenWrt 25.12 já adota `2` como padrão, garantindo que o roteador responda e negocie ECN com CDNs modernas (Cloudflare, Google, Fastly) sem quebrar compatibilidade legada.

---

### 2.5. Coalescência de Interrupções e `ethtool` (Armadilha de Dependência Evitada)

* ❌ **Armadilha Identificada no Roteador Real:** O utilitário `ethtool` **não vem instalado por padrão** na imagem base do OpenWrt. Chamar `ethtool -C ...` no boot geraria erros no log do sistema.
* ✅ *Arquitetura Corrigida:* O driver MediaTek Filogic (`mtk_eth`) no Linux 6.12 gerencia a moderação de interrupções de hardware internamente via NAPI. O ARK Router controla isso através de **`net.core.netdev_budget = 600`** e **`netdev_budget_usecs = 20000`** em `ark-hardware-tune`, sem necessitar do binário externo `ethtool`.

---

## 3. Matriz de Integração no Código do ARK Router

A integração dessas lições no código canônico do ARK Router ocorre em:
1. **`root/etc/init.d/ark-hardware-tune`**:
   - Detecção dinâmica de `tcp_bbr`. Se presente, aplica `tcp_congestion_control = bbr`, `tcp_notsent_lowat = 16384` e `tcp_fastopen = 3`.
   - Ajuste de buffers `tcp_rmem` / `tcp_wmem` estritamente condicionado ao perfil de hardware (`mem_total_kb`).
2. **`root/usr/lib/ark/modules/doctor.sh`**:
   - Auditoria proativa com reporte visual de saúde da pilha TCP e resiliência de cache DNS.
