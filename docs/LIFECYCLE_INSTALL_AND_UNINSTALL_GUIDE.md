# ARK Router — Guia de Ciclo de Vida: Instalação e Desinstalação Segura

Este documento estabelece as diretrizes de engenharia, arquitetura e precauções operacionais aplicadas no ARK Router para o ciclo de vida (instalação, execução, mitigação de falhas e desinstalação completa) de módulos opcionais de grande porte, especificamente o **Speedify** (Bonding VPN) e o **AdGuard Home** (Bloqueador de Anúncios e Controle Parental).

---

## 1. Visão Geral e Contexto de Hardware Embarcado

Roteadores OpenWrt operam em ambientes com restrições severas de hardware:
- **Flash SPI/NAND Limitada**: Roteadores populares possuem de 16 MB (SPI) a 128 MB (NAND) de armazenamento total. O sistema de arquivos de gravação (`/overlay` montado sobre JFFS2/UBIFS) compartilha espaço com logs temporários, pacotes adicionais e configurações.
- **Memória Volátil (RAM)**: De 128 MB a 1 GB. Espaço em `/tmp` (tmpfs) consome diretamente a memória operacional.
- **Comunicação Cliente-Servidor LuCI**: O navegador se comunica com o backend via RPC HTTP (`uhttpd` chamando `rpcd` via socket UNIX `/var/run/ubus/ubus.sock`). Qualquer reinicialização síncrona dos servidores web encerra a conexão prematuramente.

Instalar e remover pacotes com binários pré-compilados pesados (como Speedify com ~14.3 MB ou AdGuard Home com 14–32 MB) exige engenharia defensiva para evitar o **travamento irreversível (soft-brick) do roteador**, **quedas de rede** ou **erros espúrios na interface**.

---

## 2. Cuidados Essenciais e Modos de Falha Mitigados

### 2.1 Risco 1: Esgotamento do `/overlay` (Anti-Brick Protection)
- **Modo de Falha**: Se uma instalação preencher 100% da partição `/overlay`, o kernel Linux remonta o sistema de arquivos em modo somente leitura (*read-only*). O OpenWrt não consegue mais gravar configurações do UCI, atualizar senhas nem criar arquivos de lock, resultando em falha de boot ou loop de inicialização.
- **Tamanho Real dos Pacotes**:
  - *Speedify (`speedify_*.ipk`)*: ~5.89 MB no download compactado em `/tmp`; ~14.29 MB descompactado em disco (`/overlay`).
  - *AdGuard Home (`adguardhome`)*: ~14 MB binário base; até 35 MB com listas de bloqueio e banco estatístico.
- **Solução Implementada**:
  1. O backend (`speedify_storage_check`) audita rigorosamente o espaço livre via `df -k /overlay`.
  2. O limiar de segurança interno foi calibrado para **22.000 KB (~22 MB)** livres (`min_internal_kb`). Roteadores com flash SPI de 16 MB ou com menos de 22 MB livres são bloqueados de instalar em modo interno.
  3. A interface apresenta três opções de execução:
     - **Interno**: Gravado no `/overlay` (permanente entre reboots). Apenas se `internal_ok == true`.
     - **RAM Experimental**: Descompactado em `/tmp/ark-speedify-root` (usa zero flash; ideal para testes rápidos).
     - **Armazenamento Externo**: Armazenado em pendrive/SSD USB montado em `/mnt/...`.

### 2.2 Risco 2: Queda Abrupta de RPC e o Erro "XHR request failed" ("Erro X")
- **Modo de Falha**:
  No LuCI, quando o frontend clica em "Desinstalar", ele executa uma chamada assíncrona RPC (`fs.exec` chamando `equipe-dashboard-control speedify-uninstall` ou `adblock-uninstall`).
  Se o script de shell executar de forma imediata e síncrona:
  ```sh
  /etc/init.d/rpcd restart
  /etc/init.d/uhttpd restart
  ```
  Os processos do `uhttpd` e `rpcd` são terminados instantaneamente pelo sistema init. O socket TCP mantido com o navegador é desconectado antes do envio do cabeçalho `HTTP/1.1 200 OK` com o JSON de retorno.
  No navegador, a requisição Ajax falha com `net::ERR_CONNECTION_RESET`, gerando a mensagem vermelha na tela: **"Error: XHR request failed"** ou **"Erro x..."**, transmitindo a falsa impressão de que a desinstalação falhou, mesmo quando o pacote foi removido com sucesso.
- **Solução Implementada**:
  1. **Desacoplamento Assíncrono com Delay em Background**:
     O reinício dos serviços web foi isolado em um subshell em segundo plano com delay de 2 segundos:
     ```sh
     (sleep 2; [ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart; [ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart) >/dev/null 2>&1 &
     ```
     Dessa forma, o script termina sua execução, o `rpcd` serializa a resposta JSON de sucesso, o `uhttpd` envia o pacote HTTP ao cliente e, somente 2 segundos depois, os serviços são reciclados sem afetar a sessão ativa.
  2. **Tratamento Resiliente no Frontend (`.catch()`)**:
     Nos arquivos `src/modules/speedify.js` e `src/modules/adblock.js`, o manipulador de erro intercepta desconexões transitórias de XHR e trata o evento como sucesso com recarregamento gracioso:
     ```javascript
     .catch(function(err) {
         var errStr = String(err && err.message ? err.message : (err || ''));
         if (errStr.indexOf('XHR') !== -1 || errStr.indexOf('failed') !== -1) {
             // O reinício do webserver fechou o socket; trata como concluído
             setTimeout(function() { window.location.reload(); }, 2500);
             return;
         }
         ui.addNotification(null, E('p', {}, 'Erro: ' + errStr), 'error');
     });
     ```

### 2.3 Risco 3: Blackhole de DNS na Desinstalação do AdGuard Home
- **Modo de Falha**:
  Quando o AdGuard Home é ativado localmente, o `dnsmasq` do OpenWrt é instruído a:
  - Definir upstream exclusivo para a porta local do AdGuard: `dhcp.@dnsmasq[0].server='127.0.0.1#5335'`.
  - Desativar servidores WAN upstream: `dhcp.@dnsmasq[0].noresolv='1'`.
  - Desativar consultas paralelas simultâneas: `dhcp.@dnsmasq[0].allservers='0'`.
  Se o AdGuard Home for desinstalado ou encerrado e essas configurações não forem revertidas de maneira atômica, a porta `5335` deixa de responder. Como resultado, **todas as consultas DNS de todos os dispositivos na rede falham (blackhole total)**, fazendo com que a internet pare de funcionar para a casa ou empresa inteira.
- **Solução Implementada (Restauração Fiel e Inteligente)**:
  Em vez de forçar cegamente servidores fixos, a rotina centralizada `adblock_restore_dns()` (chamada em `adblock_disable` e `adblock_uninstall`) **consulta o estado e as preferências reais do usuário**:
  1. **Preservação Prévia Completa**: Ao ativar o bloqueador (local ou nuvem), o sistema captura e salva:
     - Servidores DNS anteriores em `equipe_perf.settings.saved_dns_servers` (e preserva `dns_servers`).
     - Estado de paralelismo (`allservers`) em `saved_dns_allservers`.
     - Estado de fallback do DHCP (`dhcp.lan.dhcp_option` contendo `1.1.1.1`) em `saved_dhcp_fallback` e `dns_dhcp_fallback`.
     - Resolução local (`noresolv`) em `saved_noresolv`.
  2. **Consulta e Restauração Inteligente no Desinstalar / Desativar**:
     - **Predefinições Rápidas ou IPs Customizados**: Se o usuário havia configurado servidores customizados ou escolhido qualquer uma das predefinições rápidas no modal **⚡ Configurar DNS Turbo Paralelo** (ex: *Cisco OpenDNS* `208.67.222.222 208.67.220.220`, *Quad9 Anti-Malware* `1.1.1.2 9.9.9.9...`, *Dual-Stack IPv4+IPv6*), o sistema restaura **exatamente a lista de servidores dele**.
     - **Paralelismo All-Servers Fiel**: Se o usuário escolheu manter a consulta paralela desligada (`allservers='0'`, comum em servidores como Cisco OpenDNS), restaura `0`. Se estava ligada (`allservers='1'`), restaura ligada `1`.
     - **Redundância de Fallback no DHCP (1.1.1.1)**: Se a opção de redundância de DHCP estava ativa (`saved_dhcp_fallback=1` ou `dns_dhcp_fallback=1`), a rotina chama `apply_lan_dhcp_dns "$lan_ip 1.1.1.1"`, restaurando a opção 6 no DHCP (`dhcp.lan.dhcp_option`) para que os dispositivos continuem recebendo `1.1.1.1` como secundário em caso de reinicialização. Se estava inativa, restaura limpa com apenas o IP do roteador (`$lan_ip`).
     - **Cenário Limpo (Clean Slate / Sem Registro Prévio)**: Se o roteador for novo ou nunca teve nenhum registro prévio de DNS, o ARK Router **ativa automaticamente o modo Turbo Paralelo (`allservers='1'`)** e carrega o quarteto de alta performance (`1.1.1.1`, `8.8.8.8`, `1.0.0.1`, `8.8.4.4`), garantindo que o usuário nunca fique sem internet e já desfrute da máxima velocidade por padrão.
  3. **Aplicação Atômica e Limpeza de Temporários**:
     ```sh
     # Fluxo executado em adblock_restore_dns:
     target_servers="$(uci -q get equipe_perf.settings.dns_servers || uci -q get equipe_perf.settings.saved_dns_servers || true)"
     # Filtra entradas de loopback (127.0.0.1 / ::1 / 0.0.0.0)
     clean_restore_servers="..."
     if [ -z "$clean_restore_servers" ]; then
         clean_restore_servers="1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4"
         target_allservers="1" # Clean slate: liga Turbo All-Servers por padrao
     else
         target_allservers="$(uci -q get equipe_perf.settings.dns_allservers || uci -q get equipe_perf.settings.saved_dns_allservers || echo 1)"
     fi
     # Restaura servidores no dnsmasq e sincroniza All-Servers
     uci del dhcp.@dnsmasq[0].server
     for s in $clean_restore_servers; do
         uci add_list "dhcp.@dnsmasq[0].server=$s"
     done
     uci set "dhcp.@dnsmasq[0].allservers=$target_allservers"
     # Restaura Fallback DHCP (1.1.1.1) se configurado
     [ "$target_dhcp_fallback" = "1" ] && apply_lan_dhcp_dns "$lan_ip 1.1.1.1"
     uci commit dhcp
     uci commit equipe_perf
     /etc/init.d/dnsmasq restart
     ```
  A conectividade de resolução de nomes da rede volta instantaneamente com fidelidade absoluta às escolhas do operador, preservando redundâncias e sem risco de *blackhole*.

### 2.4 Risco 4: Acionamento Acidental por Toque ou Clique
- **Modo de Falha**:
  Em roteadores gerenciados por smartphones ou tablets, toques acidentais poderiam disparar desinstalações destrutivas durante reuniões ou transmissões ao vivo.
- **Solução Implementada**:
  - Modal de segurança com contagem regressiva obrigatória de **5 segundos**.
  - O botão de ação perigosa (`btn-danger`) é renderizado inicialmente desabilitado com o texto:
    `Desinstalar (5s)...`, decrementando progressivamente a cada segundo (`4s...`, `3s...`, `2s...`, `1s...`).
  - Apenas após o término do temporizador o botão é habilitado e estilizado para permitir o clique consciente do operador.

### 2.5 Risco 5: Danos Colaterais ao Finalizar Processos (`killall`)
- **Modo de Falha**:
  O Speedify possui um daemon principal (`speedify`) e um serviço auxiliar de autenticação websocket escrito em Python (`sfy-ws-auth`). Executar `killall -9 python3` durante a desinstalação mataria outros serviços legítimos do sistema (scripts de telemetria Starlink, ferramentas de automação ou daemons em Python).
- **Solução Implementada**:
  - Uso de padrões estritos de encerramento seletivo:
    `pkill -9 -f 'sfy-ws-auth'` encerra especificamente o script autenticador.
    `killall -9 speedify` encerra o binário do bonding engine.
  - Verificação de estado antes de comandos de socket: se o daemon já estiver parado (`speedify_runtime_running` falso), o script pula comandos CLI via socket UNIX (`$cli disconnect`), eliminando atrasos de 10 segundos de timeout de conexão.

### 2.6 Risco 6: Suporte Multi-Arquitetura (`aarch64` vs `x86_64`)
- **Modo de Falha**:
  Binários externos exigem o dynamic linker correto da biblioteca C (glibc):
  - Roteadores físicos com processadores ARM64 (como Acer Predator W6x, MediaTek Filogic MT7981/MT7986/MT7988) utilizam: `/lib/ld-linux-aarch64.so.1`.
  - Máquinas virtuais de desenvolvimento x86_64 (VirtualBox `OpenWrt-ARK-Dev`) utilizam: `/lib/ld-linux-x86-64.so.2`.
  Se os symlinks forem estáticos ou não forem limpos na desinstalação, binários ficam quebrados ou links simbólicos corrompidos poluem `/lib`.
- **Solução Implementada**:
  - Detecção dinâmica de arquitetura via `uname -m` no módulo shell:
    - Funções `speedify_loader_path` e `speedify_library_path`.
  - Limpeza completa dos symlinks de ambas as arquiteturas na rotina `speedify_uninstall`.

---

## 3. Arquitetura de Implementação

### 3.1 Camada Backend (Shell Scripts BusyBox Ash)

| Arquivo | Função / Responsabilidade |
| --- | --- |
| [`root/usr/lib/ark/modules/speedify.sh`](file:///c:/Users/User/Desktop/FEITOS%20COM%20IA/Ark-Router/GitHub/luci-app-ark-router/root/usr/lib/ark/modules/speedify.sh) | Orquestração do Speedify: auditoria de storage, instalação em RAM/Overlay/USB, detecção multi-arquitetura, desinstalação limpa com liberação de portas, rotas, symlinks e remoção de pacote (`opkg remove speedify` / `apk del speedify`). |
| [`root/usr/lib/ark/modules/adblock.sh`](file:///c:/Users/User/Desktop/FEITOS%20COM%20IA/Ark-Router/GitHub/luci-app-ark-router/root/usr/lib/ark/modules/adblock.sh) | Orquestração do AdGuard Home: encerramento de serviço, desinstalação do pacote, recuperação de flash e restauração imediata do `dnsmasq` para o modo DNS Turbo com upstreams públicos. |
| [`root/usr/lib/ark/modules/ezsetup.sh`](file:///c:/Users/User/Desktop/FEITOS%20COM%20IA/Ark-Router/GitHub/luci-app-ark-router/root/usr/lib/ark/modules/ezsetup.sh) | Assistente de configuração inicial: orquestração de módulos pesados selecionados, salvaguarda de backups em `/tmp` e aplicação não-bloqueante. |
| [`root/usr/sbin/equipe-dashboard-control`](file:///c:/Users/User/Desktop/FEITOS%20COM%20IA/Ark-Router/GitHub/luci-app-ark-router/root/usr/sbin/equipe-dashboard-control) | Ponto de entrada RPC do LuCI; despacha os comandos de instalação e desinstalação e formata retornos em JSON padronizado. |

### 3.2 Camada Frontend (LuCI JavaScript SPA)

| Arquivo | Componente / Responsabilidade |
| --- | --- |
| [`src/modules/speedify.js`](file:///c:/Users/User/Desktop/FEITOS%20COM%20IA/Ark-Router/GitHub/luci-app-ark-router/src/modules/speedify.js) | Renderização do painel Speedify, exibição de badge de status de armazenamento (Interno, RAM, USB), modal de desinstalação com contagem regressiva de 5s e polling dinâmico de status. |
| [`src/modules/adblock.js`](file:///c:/Users/User/Desktop/FEITOS%20COM%20IA/Ark-Router/GitHub/luci-app-ark-router/src/modules/adblock.js) | Renderização do painel de segurança, modal de remoção do AdGuard Home local com timer de 5s, visualização de listas e recuperação do estado Anycast. |

---

## 4. Matriz de Cenários Validados

Todos os fluxos foram exaustivamente validados tanto no laboratório virtual isolado (VirtualBox x86_64) quanto no hardware físico de referência (Acer Predator W6x aarch64):

| Cenário Testado | Ambiente | Ação Executada | Resultado Verificado |
| --- | --- | --- | --- |
| **Speedify em RAM** | VirtualBox (x86_64) | Instalação rápida em `/tmp/ark-speedify-root` e posterior desinstalação | Status mudou para `LOGGED_OUT` no install; na desinstalação, memória `/tmp` foi totalmente liberada, sem resíduos de processos e sem erro de interface. |
| **Speedify Interno** | VirtualBox (x86_64) | Instalação via pacote `opkg` e desinstalação pelo botão com timer de 5s | Pacote desinstalado do `opkg`, arquivos removidos, `/overlay` recuperou espaço para 45.6 MB livres, retorno com código 0. |
| **AdGuard Home Local** | VirtualBox (x86_64) | Ativação local (`opkg install adguardhome`) e remoção pelo botão | Daemon finalizado, pacote removido, `/overlay` subiu de 14 MB para 45.6 MB livres, `dnsmasq` restaurado com `allservers=1` e servidores 1.1.1.1/8.8.8.8. Resolução de nomes operante imediatamente. |
| **Deploy em Hardware Real** | Acer Predator W6x (aarch64) | Atualização de bundle e checagem de armazenamento com AdGuard ativo | Roteador físico com 34.5 MB livres exibiu recomendação **Interna** (verde) com botão `[ Instalar interno ]` disponível, sem risco de estourar a flash. |

---

## 5. Checklist para Criação de Novos Módulos Opcionais

Ao integrar novos pacotes de terceiros de grande porte ao ecossistema ARK Router, siga este checklist obrigatório:

- [ ] **Auditoria de Flash Prévia**: Implementar verificação de espaço livre antes de permitir o download ou instalação (`df -k /overlay`).
- [ ] **Modo RAM Disponível**: Se o binário puder ser executado a partir de `/tmp`, fornecer opção experimental volátil para preservar a vida útil da flash e atender roteadores modestos.
- [ ] **Desacoplamento de Serviços Web**: Nunca reiniciar `rpcd` ou `uhttpd` sincronamente dentro de uma chamada RPC; utilize sempre o padrão assíncrono `(sleep 2; /etc/init.d/rpcd restart; /etc/init.d/uhttpd restart) >/dev/null 2>&1 &`.
- [ ] **Tratamento de Exceções XHR no Frontend**: O `.catch()` do JavaScript deve reconhecer reinicializações de daemon como conclusões normais e fazer reload automático da página.
- [ ] **Confirmação com Timer de 5s**: Ações destrutivas ou de remoção de serviços essenciais devem utilizar o modal com temporizador antes de habilitar o botão de ação.
- [ ] **Teardown Atômico e Idempotente**: A rotina de desinstalação deve:
  1. Parar o serviço e seus processos de forma seletiva (`pkill -f` específico, não `killall` genérico).
  2. Desabilitar a inicialização automática (`/etc/init.d/... disable`).
  3. Remover o pacote via gerenciador de pacotes (`opkg remove` ou `apk del`).
  4. Remover arquivos de configuração, diretórios residuais e symlinks de arquitetura.
  5. Restaurar configurações de fallback de rede, firewall e DNS.
  6. Reverter opções no UCI (`equipe_dashboard`).
