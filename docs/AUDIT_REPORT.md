# ARK Router — Relatório de Auditoria Estática (`AUDIT_REPORT.md`)

> **Versão Base**: `2.2.14` (`HEAD aab85768` + alterações locais não commitadas preservadas)  
> **Data da Auditoria**: `2026-11-24`  
> **Escopo**: Análise estática automatizada e inspeção manual cirúrgica em `root/`, `src/`, `Makefile`, templates LuCI e scripts do projeto (sem alteração de código de produção).

---

## 1. Resumo da Cobertura e Ferramentas Aplicadas

| Camada / Ferramenta | Alvo | Resultado |
| :--- | :--- | :--- |
| `scripts/audit_shell_scripts.py` | Módulos `root/usr/lib/ark/`, `scripts/`, `tests/`, RPC/CSS/versão | **APROVADO** (0 colisões, 0 violações fw4/fw3, `sh -n` válido) |
| `dash -n` | 87 scripts POSIX/shell em `root/`, `scripts/`, `tests/` | **APROVADO** (87/87 válidos) |
| `shellcheck -s sh` | 74 scripts shell sob `root/` | **11 erros**, **14 `SC2154`**, **1 bashismo `SC3028`**, **8 `SC2221`/`SC2222`** (além de warnings informativos de `local`/quoting) |
| `scripts/audit_state_preservation.py --strict` | 15 rotinas de ciclo de vida / restauração | **APROVADO** (0 violações) |
| `scripts/audit_i18n.py --strict` | `src/`, `po/{pt-br,en,es}/ark.po` | **APROVADO** (5.116 chaves EN/ES, 1.949 strings visíveis) |
| `scripts/build_frontend_bundle.py --check` | `src/` vs `overview.js` | **APROVADO** (sincronizado) |
| `scripts/generate_code_map.py --check` | `docs/CODE_MAP.md` | **APROVADO** (sincronizado) |
| `tests/verify_feature_contracts.py` | 74 contratos em `tests/feature_contracts.yaml` | **APROVADO** (74/74 + 7 negativos) |
| Varredura estática JS / Templates / `Makefile` | `src/`, `ark-theme.js`, `footer.ut`, `footer.htm`, `Makefile` | **3 achados estruturais** (`AUD-007`, `AUD-010`, `AUD-011`) |

*(Ferramentas de outros ecossistemas como TypeScript strict, Ruff e SonarScanner não se aplicam ao runtime OpenWrt BusyBox `ash` + LuCI Vanilla JS.)*

---

## 2. Índice Consolidado de Achados

| ID | Severidade | Categoria | Arquivo(s) Principal(is) | Status |
| :--- | :--- | :--- | :--- | :--- |
| `AUD-001` | **CRÍTICO** | Segurança / Exposição LAN vs WAN | `root/www/cgi-bin/ark-mesh-export` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-002` | **ALTO** | Bug silencioso / Variável indefinida | `root/usr/lib/ark/modules/adblock.sh` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-003` | **ALTO** | Segurança / TLS sem verificação | `speedify.sh`, `ark-starlink-telemetry`, `devices.sh`, `ezsetup.sh`, `system.sh`, `starlink-telemetry-mailer` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-004` | **ALTO** | Bug POSIX Shell (`SC2144`) | `root/usr/lib/ark/modules/sqm.sh`, `root/usr/lib/ark/modules/system_hardware_leds.sh` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-005` | **ALTO** | Variáveis indefinidas (`SC2154`) | `root/usr/lib/ark/modules/network.sh`, `root/usr/lib/ark/modules/ezsetup.sh` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-006` | **MÉDIO-ALTO** | Bashismo `$RANDOM` em `/bin/sh` (`SC3028`) | `root/usr/lib/ark/modules/devices.sh` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-007` | **MÉDIO** | Violação de regra (`prompt()` síncrono) | `src/modules/doctor_perf.js` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-008` | **MÉDIO** | Erros `shellcheck` (`SC2045`, `SC1087`) | `led.sh`, `system_hardware_leds.sh`, `ark-hardware-tune`, `wifi.sh`, `99-ark-router-wifi` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-009` | **MÉDIO** | Código morto (`case` sombreado `SC2221`/`SC2222`) | `system_hardware_leds.sh`, `doctor.sh`, `led.sh`, `common.sh` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-010` | **MÉDIO** | Bundle staging duplicado e `Makefile` | `overview_v2.js`, `overview_v2.css`, `Makefile` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |
| `AUD-011` | **MÉDIO** | Sobreposição JS no tema & teto `< 60 KB` | `footer.ut`, `footer.htm`, `ark-theme.js`, `ark-guides.js`, `cascade.css`, `mobile.css` | Resolvido (local + VM 24.10/19.07 + Acer W6x 25.12.6) |

---

## 3. Detalhamento dos Achados

### AUD-001 — [CRÍTICO] CGI `ark-mesh-export` aceita `eth0|eth1` e expõe credenciais Wi-Fi/Mesh com fallback hardcoded
- **Arquivo(s)**: `root/www/cgi-bin/ark-mesh-export:23-27,98`
- **Evidência**: Em `is_authorized()`, o case de interfaces autorizadas inclui `br-lan*|lan*|eth0|eth1|lo)` (linha 24). Na linha 98, há fallback estático `mesh_key="$(uci -q get wireless.extra_mesh_r1.key || echo 'arkmeshkey123')"`.
- **Impacto**: Em roteadores ARM/Filogic onde `eth1` é a porta WAN (como Acer Predator W6x), clientes roteados pelo caminho `eth1` passam pelo filtro e recebem em texto claro `ssid_2g`, `key_2g`, `ssid_5g`, `key_5g`, `mesh_key` e `/tmp/dhcp.leases` caso o `uhttpd` esteja acessível.
- **Ação recomendada**: Autorizar exclusivamente sub-redes/interfaces pertencentes à LAN configurada em UCI (`network.lan` / `br-lan` + túneis WG/ZT validados por interface), remover `eth0|eth1` genéricos e exigir chave aleatória/configurada em vez de fallback literal.
- **Resolução (Onda 1 — local; pendente VM/hardware)**: Removidos `eth0|eth1` da allowlist genérica de `is_authorized()`, adicionada negação explícita para interfaces WAN (`wan*`/`pppoe-*`/`wwan*`), validado dispositivo LAN via UCI/`ubus` com fallback de sub-rede `client_is_lan_subnet()` e removido o fallback literal `'arkmeshkey123'` (`tests/test_audit_wave1_wave2.py`).

### AUD-002 — [ALTO] Expansão acidental de `$important` em shell apaga diretiva AdGuard Home
- **Arquivo(s)**: `root/usr/lib/ark/modules/adblock.sh:356`
- **Evidência**: `SC2154`: dentro de `python3 -c "..."` em aspas duplas no `/bin/sh`, a linha `final_rules.append(f\"  - '@@||{d}^$important'\")` faz o shell expandir `$important` para string vazia antes de executar o Python.
- **Impacto**: Regras de whitelist gravadas no YAML do AdGuard Home perdem o modificador `$important`, permitindo que filtros de bloqueio prevaleçam sobre exceções do usuário.
- **Ação recomendada**: Escapar `\$important` ou migrar o bloco Python para heredoc com delimitador entre aspas simples (`<< 'PYEOF'`).
- **Resolução (Onda 1 — local; pendente VM/hardware)**: Escapado `\$important` tanto na sincronização de regras (`adblock.sh:356`) quanto na instalação da whitelist oficial (`adblock.sh:652`), e atualizada a regex de leitura (`(?:[$]important)?`) na linha 339 para manter idempotência sem duplicação (`tests/test_audit_wave1_wave2.py`).

### AUD-003 — [ALTO] Downloads e chamadas HTTPS com verificação TLS desabilitada (`--no-check-certificate` / `-k`)
- **Arquivo(s)**:
  - Binários/scripts remotos: `root/usr/lib/ark/modules/speedify.sh:77,86,185`; `root/usr/libexec/ark-starlink-telemetry:74`; `root/usr/lib/ark/modules/devices.sh:1062`; `root/usr/lib/ark/modules/ezsetup.sh:699,701,705,717,720,723`
  - Telemetria/speedtest: `root/usr/lib/ark/modules/system.sh:1678,1681`; `root/usr/lib/ark/modules/devices.sh:580,590,610,643,645`; `root/usr/sbin/starlink-telemetry-mailer:205`
- **Evidência**: Uso sistemático de `wget --no-check-certificate`, `uclient-fetch --no-check-certificate` e `curl -k` inclusive ao baixar executáveis (`get.speedify.com`, `speedify.apk`, cliente Starlink e `.apk` do `speedtest-go`).
- **Impacto**: Risco de ataque Man-in-the-Middle (MITM) com execução arbitrária de código ao instalar pacotes/binários remotos em roteadores com `ca-bundle` disponível.
- **Ação recomendada**: Validar certificado TLS por padrão quando `/etc/ssl/certs` existir (com fallback explícito ou checagem SHA-256 para binários baixados).
- **Resolução (Onda 3 — local; pendente VM/hardware)**: Adicionados `ark_tls_ca_available()`, `ark_tls_verify_ready()`, `ark_wget_tls()`, `ark_curl_tls()` e `ark_uclient_tls()` em `root/usr/lib/ark/common.sh` exigindo verificação TLS estrita por padrão sempre que houver CA bundle e relógio válido (`>= 2024-01-01`, ou `ARK_TLS_STRICT=1`), com fallback controlado apenas em ambientes legados sem CA/NTP; migrados `ezsetup.sh`, `speedify.sh`, `devices.sh`, `system.sh` e protegidos os scripts standalone `ark-starlink-telemetry` e `starlink-telemetry-mailer` (`tests/test_audit_wave3.py`).

### AUD-004 — [ALTO] Teste `[ -d .../*glob* ]` inválido em POSIX shell (`SC2144`)
- **Arquivo(s)**: `root/usr/lib/ark/modules/sqm.sh:455`; `root/usr/lib/ark/modules/system_hardware_leds.sh:1100`
- **Evidência**:
  - `sqm.sh:455`: `[ -d /sys/devices/platform/soc/*ppe* ]`
  - `system_hardware_leds.sh:1100`: `[ -d /sys/devices/platform/soc/*wed* ]`
- **Impacto**: Se o glob expandir para mais de uma entrada no `sysfs`, `[ -d ... ]` falha em runtime com erro de sintaxe (`too many arguments`) e pode mascarar detecção de hardware PPE/WED.
- **Ação recomendada**: Substituir por loop `for _d in /sys/devices/platform/soc/*ppe*; do [ -d "$_d" ] && ...; done`.
- **Resolução (Onda 2 — local; pendente VM/hardware)**: Substituídos ambos os testes `[ -d .../*glob* ]` por loops POSIX seguros com `local _ppe_dir` (`sqm.sh`) e `local _wed_dir` (`system_hardware_leds.sh`), zerando os erros `SC2144`.

### AUD-005 — [ALTO] Variáveis referenciadas sem atribuição (`SC2154`) em `network.sh` e `ezsetup.sh`
- **Arquivo(s)**: `root/usr/lib/ark/modules/network.sh:43`; `root/usr/lib/ark/modules/ezsetup.sh:1904`
- **Evidência**:
  - `network.sh:43`: `local cur_pppd_opts="$($uci_cmd get "network.$iface.pppd_options" 2>/dev/null || uci -q get "network.$iface.pppd_options" || true)"` — `$uci_cmd` nunca é definida nessa função, executando literalmente `get ...` antes de cair no fallback.
  - `ezsetup.sh:1904`: campo `"user_theme":"%s"` recebe `$(json_escape "$user_theme")`, porém `$user_theme` não é atribuída nesse handler (imprime sempre string vazia).
- **Impacto**: Comportamento silenciosamente incorreto na leitura de `user_theme` no JSON de `features` e chamada espúria ao comando `get` em `network.sh`.
- **Ação recomendada**: Trocar `$uci_cmd` por `uci -q` em `network.sh:43` e ler `user_theme` de UCI (`equipe_dashboard.main.user_theme` / `luci.main.user_theme`) antes do `printf` em `ezsetup.sh`.
- **Resolução (Onda 1 — local; pendente VM/hardware)**: Substituído `$uci_cmd` por `uci -q` em `network.sh:43` e inicializada `user_theme` a partir de UCI em `ezsetup.sh`.

### AUD-006 — [MÉDIO-ALTO] Bashismo `$RANDOM` em fallback de token de reboot (`SC3028`)
- **Arquivo(s)**: `root/usr/lib/ark/modules/devices.sh:1773`
- **Evidência**: `[ -n "$token" ] || token="$(printf '%s' "$(date +%s)-$$-$RANDOM" | cksum | awk '{print $1}')"`
- **Impacto**: Em builds BusyBox `ash` sem `CONFIG_ASH_RANDOM_SUPPORT` ou `/bin/sh` POSIX estrito, `$RANDOM` expande vazio se `/dev/urandom` falhar, enfraquecendo o fallback de entropia.
- **Ação recomendada**: Usar leitura alternativa de `/proc/uptime` + `/proc/sys/kernel/random/uuid` (quando disponível) em vez de `$RANDOM`.
- **Resolução (Onda 1 — local; pendente VM/hardware)**: Removido `$RANDOM` de `devices.sh` (`reboot-prepare`), adotando fallback POSIX com `/proc/sys/kernel/random/uuid` e `printf '%08x%08x'` via `/proc/uptime` (`tests/test_audit_wave1_wave2.py`).

### AUD-007 — [MÉDIO] Uso de `prompt()` síncrono no frontend (violação da Regra 5)
- **Arquivo(s)**: `src/modules/doctor_perf.js:1548,1551` (propagado para `overview.js` e `overview_v2.js`)
- **Evidência**: Fallback de cópia de log chama `prompt(_t('Copie o log abaixo:'), txt);` quando `navigator.clipboard.writeText` falha ou não está disponível (ex.: acesso HTTP local sem HTTPS).
- **Impacto**: Viola explicitamente a Regra 5 de `AGENTS.md` (proibição de `alert()`, `confirm()` e `prompt()` síncronos no navegador) e degrada UX mobile.
- **Ação recomendada**: Substituir por fallback não-bloqueante (`document.execCommand('copy')` em `<textarea>` temporário ou seleção automática no `<pre>` com banner inline).
- **Resolução (Onda 3 — local; pendente VM/hardware)**: Substituído `prompt()` em `src/modules/doctor_perf.js` por fallback não-bloqueante com `<textarea>` temporário + `document.execCommand('copy')` e seleção automática via `Range.selectNodeContents(logPreEl)` (além da captura síncrona de `btn` antes do `.then()`), sem novas chaves i18n; `overview.js` regenerado e validado com zero ocorrências de `prompt()` (`tests/test_audit_wave3.py`).

### AUD-008 — [MÉDIO] Erros restantes de `shellcheck` (`SC2045` e `SC1087`)
- **Arquivo(s)**:
  - `SC2045` (`for ... in $(ls ...)`): `root/usr/lib/ark/led.sh:458,495`; `root/usr/lib/ark/modules/system_hardware_leds.sh:240,721,749`; `root/etc/init.d/ark-hardware-tune:423`
  - `SC1087` (expansão `$radio2['\"]` interpretada como array): `root/usr/lib/ark/modules/wifi.sh:1324,1357`; `root/etc/uci-defaults/99-ark-router-wifi:105`
- **Evidência**: `shellcheck -s sh` aponta 9 erros nestes pontos (somando aos 2 de `AUD-004`, totaliza os 11 erros do relatório).
- **Impacto**: `SC2045` quebra com nomes contendo espaços/newlines ou globs vazios; `SC1087` indica uso sem chaves `${radio2}` diante de `[` em regex `grep -E`.
- **Ação recomendada**: Substituir `$(ls dir)` por glob `for f in dir/*; do [ -e "$f" ] || continue; ...` e usar `${radio2}` em `grep -E`.
- **Resolução (Onda 2 — local; pendente VM/hardware)**: Substituídos todos os loops `$(ls ...)` por globs POSIX com variáveis `local` (`led.sh`, `system_hardware_leds.sh`, `ark-hardware-tune`) e ajustado `${radio2}` em `wifi.sh` e `99-ark-router-wifi`; `shellcheck -s sh -S error` zerado nos 74 scripts sob `root/`.

### AUD-009 — [MÉDIO] Branches `case` inalcançáveis / código morto (`SC2221`/`SC2222`)
- **Arquivo(s)**:
  - `root/usr/lib/ark/modules/system_hardware_leds.sh:414,420,438,444` (`*internet*` na linha 414 sombreia `*white:internet*` na linha 420; `*2g*` sombreia `*2ghz*`; `*5g*` sombreia `*5ghz*`)
  - `root/usr/lib/ark/modules/doctor.sh:1580,1581` (`*11b*` sombreia `*11beg*`; `*11a*` sombreia `*11ac*|*11ax*|*11bea*`)
  - `root/usr/lib/ark/led.sh:121` (`*wlan*` sombreia `*wlan2*|*wlan5*|*wlan6*`)
  - `root/usr/lib/ark/common.sh:2865` (`*-status` vs padrão duplicado na mesma linha)
- **Evidência**: `shellcheck` reporta pares `SC2221`/`SC2222` indicando padrões posteriores que nunca executam.
- **Impacto**: Em `system_hardware_leds.sh:414-420`, LEDs `white:internet` ou `white:wan` caem no branch verde (`color="green"`) em vez de `white`. Nos demais casos, representa código morto redundante.
- **Ação recomendada**: Ordenar padrões mais específicos antes dos genéricos (`*white:internet*` antes de `*internet*`) e remover padrões redundantes.
- **Resolução (Onda 2 — local; pendente VM/hardware)**: Branch `*white:internet*|*white*planet*|*white:wan*` movido antes do branch genérico em `system_hardware_leds.sh`, branch `5GHz` (`*5g*|*11a*|*11bea*`) movido antes de `2.4GHz` (`*2g*|*11g*|*11b*|*11n*`) em `doctor.sh`, e padrões redundantes removidos em `led.sh` e `common.sh` (0 avisos `SC2221`/`SC2222`).

### AUD-010 — [MÉDIO] Artefatos de staging `overview_v2.*` no `root/` sem exclusão no `Makefile`
- **Arquivo(s)**: `root/www/luci-static/resources/view/equipe-dashboard/overview_v2.js` (26.856 linhas), `overview_v2.css` (3.608 linhas), `Makefile:78,96`
- **Evidência**: Enquanto `build-apk-mac.py`, `build-ipk-mac.py`, `build-apk-manual-wsl.sh`, `build-ipk-wsl.sh` e `install.sh` apagam `*_v2.*`, o `Makefile` executa `$(CP) ./root/* $(1)/` diretamente. Além disso, `overview_v2.js` está defasado em relação a `overview.js` no working tree atual.
- **Impacto**: Compilações via OpenWrt SDK / ImageBuilder usando `Makefile` incluiriam ~1 MB extra de arquivos V2 obsoletos no pacote final.
- **Ação recomendada**: Remover `overview_v2.js`/`overview_v2.css` do diretório `root/` (ou adicionar exclusão explícita no `Makefile` após `$(CP)`).
- **Resolução (Onda 3 — local; pendente VM/hardware)**: Removidos `overview_v2.js` e `overview_v2.css` de `root/`, restringida a cópia de `overview_v2.css` em `scripts/build_frontend_bundle.py` ao flag `--v2` e adicionada limpeza explícita `rm -f $(1)/www/luci-static/resources/view/equipe-dashboard/overview_v2.*` nos dois blocos `install` (Lite e Full) do `Makefile` (`tests/test_audit_wave3.py`).

### AUD-011 — [MÉDIO] Sobreposição JS no tema (`footer.ut`/`footer.htm` vs `ark-theme.js`) e orçamento > 60 KB
- **Arquivo(s)**: `root/usr/share/ucode/luci/template/themes/ark/footer.ut:14-64`, `root/usr/lib/lua/luci/view/themes/ark/footer.htm:16-66`, `root/www/luci-static/ark/ark-theme.js:173-230`
- **Evidência**:
  - Os dois footers executam `L.require('menu-bootstrap')` e um bloco `<script>` inline com `autoExpandActiveMenu()` e listener global `Escape` que já existem em `ark-theme.js` (`initSidebarNavigation` + `initGlobalEscHandler`).
  - Soma compactada (gzip) atual em `dist/minified/www/luci-static/ark/`: `ark-theme.js` (48.050 B) + `cascade.css` (14.067 B) + `mobile.css` (2.761 B) = **64.878 B (~63,4 KiB)**, acima do teto de `< 60 KB` da Regra 4 do `AGENTS.md`.
- **Impacto**: Listeners duplicados em toda navegação LuCI e estouro de ~3,4 KiB sobre o orçamento alvo de flash/transferência do tema.
- **Ação recomendada**: Centralizar o handler de menu/Escape em um único local (`ark-theme.js`), verificar se `menu-bootstrap` ainda é necessário para popular `#topmenu` no LuCI e podar código morto/CSS redundante em `ark-theme.js`/`cascade.css` para retornar abaixo de `60 KB`.
- **Resolução (Onda 3 — local; pendente VM/hardware)**: Consolidados o toggle de dropdown `#topmenu li.dropdown > a.menu` e o fallback de fechamento de modal `Escape` em `ark-theme.js`, removida a IIFE duplicada de `footer.ut` e `footer.htm` (preservando `L.require('menu-bootstrap')`), removida propriedade morta `mode: 'basic'` e extraídos os 20 guias contextuais trilíngues para `root/www/luci-static/ark/ark-guides.js` carregado sob demanda apenas nas rotas de guia. Orçamento minificado gzip do núcleo do tema reduzido para **53.953 B (~52,69 KiB)** (`ark-theme.js` 37.148 B + `cascade.css` 14.055 B + `mobile.css` 2.750 B, `< 60 KiB`), verificado com `tests/test_audit_wave3.py` e Playwright (`scripts/verify_wave3_ui.py`, `1280x800` e `390x844`).

---

## 4. Falsos Positivos Triados e Descartados

Os itens abaixo foram reportados por análise automática bruta, verificados manualmente e **descartados** para evitar ruído no ciclo de correção:

- `SC2154` para `_ark_has_mut_lock` em `root/usr/lib/ark/serialized-job.sh:19`, `root/usr/lib/ark/modules/doctor.sh:2936` e `root/usr/lib/ark/modules/wifi.sh:353`: variável global gerenciada via `export`/estado do despachante principal `equipe-dashboard-control` + `common.sh`.
- `SC2154` para `silicon_*` em `root/usr/lib/ark/modules/ezsetup.sh:1969-1974`: populadas dinamicamente por função de detecção de hardware em `system_hardware_leds.sh` carregada via `source`.
- `SC3043` (1.567 ocorrências de `local`): suportado nativamente pelo BusyBox `ash` em todas as versões do OpenWrt (19.07 a 25.x) e usado como proteção obrigatória contra colisão de variáveis de loop.
- `innerHTML` em `src/core/helpers.js` e `src/modules/*.js` (121 ocorrências): amostragem inicial mostra uso majoritário para limpeza (`= ''`) e spinners internos estáticos; requer apenas cuidado em futuros PRs (não é vulnerabilidade ativa confirmada nesta amostra).

---

## 5. Validação Operacional em VMs OpenWrt (`-snapshot` QEMU)

Em `2026-11-24`, o deploy completo (`scripts/deploy_direct.py`, incluindo `ark-guides.js` minificado) e as verificações em tempo de execução foram executados em duas imagens QEMU `-snapshot`:

| Ambiente VM | Runtime & Firewall | Verificações Aprovadas | Observações / Ressalvas |
| :--- | :--- | :--- | :--- |
| **OpenWrt `24.10.0`** (`modern.img`, Linux `6.6.73`, BusyBox `1.36.1`) | `fw4` / `ucode` (`footer.ut`) | Deploy completo; `sh -n` em 100% dos scripts; `AUD-001` (`403` para `8.8.8.8`, `200` para `192.168.1.50`, sem `arkmeshkey123`); `AUD-002` (`\$important`); `AUD-003` (strict/fallback/override no BusyBox `ash`); `AUD-005` (`user_theme=ark`); `AUD-006` (token hex de 32 chars); `AUD-010` (sem `overview_v2.*`); Playwright em LuCI real: `/status/routes` e `/admin/equipe-dashboard` (`29` cards, `0` `pageerror`, `0` fetch de `ark-guides.js`), `/network/firewall` (`ark-guides.js` lazy-loaded + `#ark-feature-guide` + toggle `#topmenu`). | Em `tests/lab/run_vm_all_tests.sh`, **218/226** testes passaram (100% da Parte 1: 14 remoções destrutivas + caso negativo). As 8 falhas da Parte 2 são pré-existentes/de timing em emulação TCG: `Mutação 3`/`4` (confirmada funcionando após `sleep 2` de estabilização do `dnsmasq`, com `doubleclick.net -> 0.0.0.0` e `openwrt.org -> 64.226.122.113`) e `Mutação 6` (mock `uhttpd` na porta `5335` no script de lab). A imagem antiga `OpenWrt-24-Moderno.img` travou em `procd: - ubus -`; usou-se a imagem limpa `modern.img`. |
| **OpenWrt `19.07.10`** (`OpenWrt-19-Legado.img`, Linux `4.14.275`, BusyBox `1.30.1`) | `fw3` / `Lua` (`footer.htm`) | Deploy completo; `sh -n` em 100% dos scripts; detecção `fw3`; `AUD-001`, `AUD-003`, `AUD-005`, `AUD-006`, `AUD-010`, `AUD-011` (`footer.htm` limpo + `L.require('menu-bootstrap')`); Playwright em LuCI Lua real: `/status/routes` (`0` fetch de `ark-guides.js`), `/network/network` (`ark-guides.js` lazy-loaded + `#ark-feature-guide` + toggle `#topmenu`), `0` `pageerror`. | Nenhuma falha registrada. |
| **Acer Predator Connect W6x** (`192.168.73.1`, OpenWrt `25.12.6 r33311-981c978eff`) | `fw4` / `ucode` (`mediatek_filogic`, `hw_offload=true`, `wed=true`, `eth1`=WAN) | Backup em `/tmp/ark-pre-wave3-backup.tar.gz` + deploy minificado (`111` arquivos, `root:root`, `overview_v2.*` removido liberando flash em `/overlay` de `28.6M` para `29.1M`); `sh -n` em 100% dos scripts; `AUD-001` (`403` em WAN `eth1`, `200` em `br-lan`, zero `arkmeshkey123`); `AUD-002` (`\$important`); `AUD-003` (`ark_tls_ca_available` e `ark_tls_verify_ready` ativos com `/etc/ssl/certs/ca-certificates.crt` e NTP real); `AUD-004/005/008/009` (`features` JSON válido, `user_theme=ark`, `wed=true`, `hw_offload=true`); `AUD-006` (token hex de 32 chars); `AUD-010/011` (`HTTP 200` em `ark-theme.js` e `ark-guides.js`, `HTTP 404` em `overview_v2.js`, `footer.ut` limpo). | Validação em hardware físico concluída com autorização explícita do usuário (sem reiniciar interface WAN/Wi-Fi). |

