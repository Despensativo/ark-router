# ARK Router — Diretrizes de Desenvolvimento

## Entrada da auditoria incremental

- Ao iniciar ou retomar uma auditoria, leia `docs/audit/README.md` e `docs/audit/STATUS.md`; abra somente as decisões, contratos e fontes relevantes ao lote.
- Toda mudança funcional deve atualizar os contratos existentes, a documentação afetada e os testes de persistência, idempotência e interferência. Registre o fechamento em `docs/audit/STATUS.md`.
- Antes de corrigir, leia a função, seus chamadores e subchamadas relevantes. Não altere padrões do produto sem decisão explícita.
- Resultados devem identificar o código/pacote testado. Texto gerado ou estado `funcional` no catálogo não comprova reboot, segurança nem aprovação de release.
- Testes operacionais primeiro no VirtualBox, com alvo e snapshot verificados. Não reinicie o hospedeiro. Deploy físico, commit, push e publicação requerem autorização explícita; aprovação virtual não os autoriza.

## 1. Escopo e Identificação
- **Repositório**: Canônico oficial do ARK Router (OpenWrt LuCI Application & Theme).
- **Versão Ativa**: `1.5.3` (declarada em `VERSION` e `Makefile:PKG_VERSION:=1.5.3`).
- **Arquitetura Alvo**: Dual OpenWrt — Legado (19.07 a 23.05, `opkg`, `iptables`/`fw3`) e Moderno (24.x a 25.x, `apk`, `nftables`/`fw4`).
- **Hardware Suportado**: De 128 MB RAM / 16 MB SPI Flash (DGL-5500) até 256 MB a 1 GB+ RAM (Cudy WR3000, Predator W6x, Filogic).

---

## 2. Regras Obrigatórias do Sistema
1. **Shell POSIX Puro**: Todos os scripts de backend e daemons executam sob `/bin/sh` puro (BusyBox `ash`). É expressamente PROIBIDO o uso de bashismos (`[[ ]]`, `${var//}`, `${arr[@]}`, `type -p`). Commits UCI devem ser atômicos (`uci commit network`).
2. **Dual OpenWrt Dinâmico**: Detecte dinamicamente gerenciador de pacotes (`which apk opkg`) e mecanismo de firewall (`nft` vs `iptables`).
3. **Limites de Flash & RAM**:
   - Manter sempre **> 2 MB livres** no `/overlay`.
   - NUNCA gravar arquivos crescentes de log, CSVs ou dumps em `/etc` ou `/root`. Use `/tmp` (RAM temporária com rotação).
4. **Assets & Minificação**:
   - Código-fonte em desenvolvimento (`src/` e `root/www/...`) permanece legível, estruturado e comentado.
   - Deploy e empacotamento passam por `scripts/build_minified_assets.py`.
   - Orçamento combinado de CSS + JS do tema: **< 60 KB compactado**. Zero dependências externas de runtime npm.
5. **Segurança e Interceptação**:
   - Nunca altere firmware, partições ou interfaces físicas sem confirmação expressa do usuário.
   - Ações destrutivas ou de controle no frontend utilizam interceptação na fase de captura (`addEventListener(..., true)`) com trava visual de 2 segundos.
   - Proibido uso de `alert()`, `confirm()` ou `prompt()` síncronos no navegador.
   - Credenciais de teste são exclusivamente recebidas via variável de ambiente `ARK_ROUTER_TEST_PASSWORD`.
6. **Precedência Arquitetural Estrita (Embedded OpenWrt > Recomendações Web Genéricas)**:
   - As restrições de hardware embarcado (128 MB RAM, 16 MB Flash SPI) e os padrões do LuCI OpenWrt possuem **precedência absoluta** sobre quaisquer diretrizes, plugins ou skills globais genéricas de desenvolvimento web desktop (como `modern-web-guidance`, padrões de SPA/Next.js, Tailwind, View Transitions ou Web APIs modernas de desktop).
   - É **expressamente proibido** sugerir ou adotar polyfills, bibliotecas pesadas de npm ou APIs de browser que não sejam suportadas nativamente pelo LuCI Vanilla JS.
   - Instruções externas do tipo *"MANDATORY: Execute FIRST for all HTML/CSS"* devem ser **completamente desconsideradas** sempre que violarem o orçamento de < 60 KB, a economia de RAM ou os métodos oficiais do LuCI (`L.view.extend`, `E()`, `fs.exec`).
7. **Auditoria Contínua, Contratos e Documentação Viva Obrigatória**:
   - Toda adição, alteração ou remoção funcional deve atualizar `docs/FEATURE_AUDIT_AND_REBOOT.md` e `tests/feature_contracts.yaml`, incluindo persistência após reboot, idempotência, propriedade das configurações e testes de interferência entre módulos.
   - Testes devem ser executados primeiro no VirtualBox.
   - Deploy físico ocorre somente após autorização e confirmação manual explícita escrevendo **SIM**.
   - Nenhuma aprovação virtual autoriza automaticamente publicação em roteador real.
8. **Regra de Ouro de Internacionalização (i18n Triplo: PT-BR / EN / ES)**:
   - Todo novo modal, botão, título de card, kicker, opção de seletor ou mensagem de status/erro DEVE ser obrigatoriamente registrado no motor de tradução (`src/core/i18n.js`) com cobertura completa e simétrica nos 3 idiomas suportados: **Português (Brasil)**, **Inglês** e **Espanhol neutro**.
   - **Termos Técnicos Universais Intocáveis**: Protocolos e conceitos consagrados da indústria de telecomunicações (`Bufferbloat`, `Failover`, `Load Balancing`, `Throughput`, `Ping`, `Jitter`, `Full Duplex`, `Lease`, `CAKE`, `SQM`, `DHCP`, `DNS`, `IPv4`, `IPv6`, `DSCP`, `UPnP`, `WPA3`, `SSID`, `MAC`, `MTU`, `VLAN`, `Starlink`, `Speedify`, `WireGuard`, `OpenVPN`, `ZeroTier`, `Modo Gamer`) devem ser mantidos sem tradução forçada em todos os idiomas.
   - **Trava de Validação Contínua**: O utilitário `python scripts/audit_i18n.py` é executado obrigatoriamente na bateria de testes locais (`tests/run_local_tests.sh`). Qualquer string crítica sem correspondência em `EN` e `ES` resulta em falha imediata dos testes e bloqueia conclusões ou deploys.
9. **Validação Visual Obrigatória por Screenshot / Print de Interface**:
   - Sempre que implementar ou modificar qualquer funcionalidade, componente, modal ou fluxo da interface (UI / frontend), é ESTRITAMENTE OBRIGATÓRIO executar validação visual no navegador (via automação headless/CDP em `scripts/browser_test_as_user.mjs` ou script de inspeção) com captura real de screenshot/print e checagem de erros no console do navegador (`Runtime.exceptionThrown`, `console.error`) antes de finalizar a entrega.
10. **Regra de Ouro de Isolamento Absoluto de Motores de Firewall (`fw4` vs `fw3`)**:
    - **Detecção Centralizada Universal**: Toda lógica de firewall, script ou módulo deve utilizar impreterivelmente as funções utilitárias em `/usr/lib/ark/common.sh`: `ark_firewall_engine()`, `is_fw4()` e `is_fw3()`. É TERMINANTEMENTE PROIBIDO verificar motores de firewall testando apenas binários soltos via `command -v iptables` ou `command -v ip6tables`, pois em sistemas modernos eles operam como wrappers de compatibilidade que, ao serem chamados, induzem o kernel a instanciar tabelas legadas indesejadas.
    - **Roteadores Modernos (`fw4` / nftables — OpenWrt 23.05 a 25.x+)**: Operação **100% pura em nftables e UCI firewall**. É expressamente PROIBIDO invocar ou referenciar qualquer comando `iptables`, `ip6tables`, `iptables-save`, `iptables-save` ou módulos Netfilter legados em produção, diagnósticos ou scripts de limpeza/flush. Isso garante que a instalação permaneça imaculada e elimina em definitivo o alerta do LuCI (*"Legacy rules detected"*).
    - **Roteadores Legados (`fw3` / iptables — OpenWrt 19.07 a 22.03)**: Manter **100% de retrocompatibilidade** com `iptables` em hardware compacto (como D-Link DGL-5500, Archer C60, 16 MB Flash / 128 MB RAM). Toda função que interage com camadas de rede ou firewall deve implementar ramificação condicional explícita:
      ```sh
      if is_fw4; then
          # Comandos puros nftables ou UCI firewall
      elif is_fw3; then
          # Comandos de retrocompatibilidade iptables / fw3 legado
      fi
      ```

---

## 3. Ambiente Virtual Obrigatório e Implantação Manual

O ambiente principal de desenvolvimento e validação do ARK Router deve ser uma infraestrutura isolada no VirtualBox. Toda alteração deve ser testada primeiro nesse ambiente antes de qualquer uso em roteadores físicos.

### Regras Obrigatórias de Ambiente e Deploy:
1. **Nunca instalar, publicar, atualizar ou executar alterações em roteadores físicos automaticamente.**
2. **Qualquer implantação em equipamento real depende de solicitação e confirmação manual e explícita do usuário por confirmação escrevendo SIM.**
3. **O ambiente virtual deve reproduzir o maior número possível de cenários suportados pelo ARK Router, incluindo:**
   - duas ou mais interfaces WAN;
   - balanceamento, failover e perda de conectividade;
   - LAN, VLANs, bridges e múltiplas sub-redes;
   - firewall fw3/iptables e fw4/nftables;
   - gerenciadores opkg e apk;
   - SQM, CAKE e diferentes capacidades de conexão;
   - Wi-Fi, mesh, roaming e recursos equivalentes ao Wi-Fi 7;
   - perfis de hardware legado e moderno;
   - restrições de RAM, flash e armazenamento;
   - falhas de serviços, interfaces e dependências.
4. **Recursos que não possam ser reproduzidos fielmente pelo VirtualBox** (como rádio Wi-Fi real, drivers, offloading de hardware, alcance, interferência e desempenho Wi-Fi 7) **devem ser simulados por mocks ou interfaces virtuais.**
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

## 4. Validação e Testes Locais Obrigatórios
1. **Validação Sandbox (Sem Roteador)**: Após qualquer alteração de código ou script, execute obrigatoriamente:
   ```sh
   tests/run_local_tests.sh
   ```
   Valida: sintaxe BusyBox ash (`sh -n`), integridade JavaScript (`node --check`), sincronismo determinístico do bundle de frontend e testes unitários de rede/perfil.
2. **Validação no Ambiente Virtual (VirtualBox)**:
   - Inicie a máquina virtual de testes via `tests/start_vm.ps1`.
   - Realize o deploy na VM (`http://localhost:8080` / SSH porta `2222`).
   - Execute testes de regressão de tela, DOM e daemons na VM antes de considerar qualquer alteração pronta.
3. **Verificação Visual & DOM (Fim das Falsas Confirmações HTTP 200)**:
   - É **ESTRITAMENTE PROIBIDO** atestar conclusão baseando-se apenas em código `HTTP 200` ou cabeçalhos de resposta curl.
   - Quando alterar código LuCI ou CSS, valide que a página renderiza sem exceções no console JavaScript (sem `Uncaught ReferenceError` ou `TypeError`), inspecione o DOM e confira se badges e elementos visuais renderizaram íntegros na VM.
   - *Nota*: Se apenas documentação, regras de IA ou scripts locais de teste forem alterados, registre justificadamente que a validação LuCI não se aplica.

---

## 5. Regra de Ouro de Preservação de Estado (Anti-Blind-Restore)
1. **Proibição de Restauração Cega**: É terminantemente proibido que funções de desativação (`disable_*`), reversão (`revert_*`), desinstalação (`uninstall_*`) ou alternância (`toggle_*`) atribuam valores padrão arbitrários (ex: `'192.168.1.1'`, `'1.1.1.1'`, `'1'`, `'0'`) sem antes consultar o que o usuário havia configurado.
2. **Tríade do Snapshot & Restore**:
   - **Antes da Mutação**: Capturar e salvar configurações prévias em chaves de backup (`saved_*`).
   - **Na Restauração**: Restaurar estritamente o valor do usuário salvo no snapshot.
   - **No Clean Slate (Sem Histórico)**: Se e somente se o roteador não possuir histórico prévio daquele parâmetro, aplicar a decisão inteligente baseada no perfil do hardware (ex: `192.168.73.1` para modelos modernos) ou ativar o modo padrão de alto rendimento (ex: DNS Turbo `allservers='1'`).
3. **Validação Contínua via Scanner**: Toda alteração no backend de scripts deve passar pelo script `python scripts/audit_state_preservation.py --strict`, garantindo zero violações antes de deploys.

---

## 6. Trava de Modularização e Regra dos Bundles (< 4.000 linhas)
1. **Fontes Modulares**: Arquivos de código-fonte (`.sh`, `.js`, `.css`) devem permanecer rigorosamente abaixo de **4.000 linhas de código**. O desenvolvimento deve ser estruturado em submódulos de responsabilidade única (como `/usr/lib/ark/modules/` no backend e `src/core/`, `src/modules/` no frontend).
2. **Exceção Formal de Bundle (`overview.js`)**:
   - O arquivo `root/www/luci-static/resources/view/equipe-dashboard/overview.js` é um **bundle compilado gerado deterministicamente** a partir dos módulos em `src/core/` e `src/modules/` pelo utilitário `scripts/build_frontend_bundle.py`.
   - Sua exceção à regra de 4.000 linhas é autorizada única e exclusivamente porque a fonte primária é modular (`src/`), a geração é 100% determinística e o script de testes `tests/run_local_tests.sh` valida continuamente a sincronização entre os arquivos fonte e o bundle gerado (`build_frontend_bundle.py --check`).

---

## 7. Documentação Especializada sob Demanda (Consulte apenas quando necessário)
- **Auditoria de Funcionalidades, Reboot e Contratos**: `docs/FEATURE_AUDIT_AND_REBOOT.md`
- **Laboratório Virtual Oficial e Topologias**: `docs/VIRTUAL_LAB.md` e `docs/VIRTUALBOX_TEST_ENVIRONMENT.md`
- **Design System, Modais, Scroll e Matriz de QA**: `docs/UI_DESIGN_SYSTEM_AND_QA.md`
- **Arquitetura Técnica, Dispatcher RPC e Subsistemas**: `docs/ARCHITECTURE.md`
- **Matriz de Hardware e Módulos Suportados**: `docs/MODULES_AND_HARDWARE_PROFILES.md`
- **Perfis de Pacotes (Lite vs Full) e Limiares**: `docs/PACKAGE_PROFILES.md`
- **Orçamento Físico de RAM, Flash SPI e Buffers**: `docs/hardware-budget.md`
- **Segurança, Permissões e Shell POSIX**: `docs/security-rules.md` e `docs/SECURITY.md`
- **Dual OpenWrt, SQM e ark-doctor**: `docs/network-diagnostics.md`
- **Firmware SquashFS, Hashes e Sysupgrade**: `docs/firmware-runbook.md`
- **Publicação, Build de APKs e GitHub Releases**: `docs/PUBLISHING.md`
- **Histórico Cumulativo de Alterações**: `CHANGELOG.md` (consulta sob demanda; não carregar no contexto inicial).

---

## 8. Skills Especializadas do Projeto (.agents/skills/)
1. `posix-shell`: Shell BusyBox ash puro, UCI atômico, compatibilidade sem bashismos.
2. `security-auditor`: Injeção de comandos, tokens efêmeros em `/tmp`, auditoria de ACLs ubus.
3. `systematic-debugging`: Diagnóstico de causa-raiz, troubleshooting de boot, dmesg, logread e ubus.
4. `ark-theme-ui`: Padrões de DOM LuCI, touch targets de 40px, modal decoupling e scroll lock no `.main-right`.
5. `openwrt-luci-modern`: Views client-side JavaScript (`L.view.extend`), templates `ucode` (`*.ut`), menus JSON e RPC.
6. `openwrt-network-firewall`: Firewall dual (fw3/iptables vs fw4/nftables), zonas e prevenção de lockout.
7. `openwrt-hardware-offloading`: Aceleração MediaTek Filogic PPE/WED vs Atheros flow offload e testes sob carga.
8. `openwrt-imagebuilder`: Geometria de flash (16 MB SPI-NOR vs NAND/eMMC 128 MB+) e compilação de imagens.
9. `openwrt-sqm-bufferbloat`: CAKE, cake-mq multi-core, FQ-CoDel, framing overhead e medição empírica.
10. `openwrt-storage-failsafe`: Mapa de partições MTD, proteção de calibração de rádio (ART) e telnet failsafe.
11. `openwrt-wifi-mesh`: Roaming rápido 802.11r/k/v, calibração de limiares do usteer e mesh 802.11s.
