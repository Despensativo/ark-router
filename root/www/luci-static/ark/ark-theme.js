/* ==========================================================================
   ARK Theme Engine — Client-Side Core (ark-theme.js)
   Provides:
   1. Modo Básico (Leigo) vs Modo Avançado (Técnico) Switcher
   2. Password Reveal (Eye Toggle) & Password Strength Meter
   3. Safety Pre-Action Confirmation Modals (Reboot, Flash, Delete)
   4. Real-time In-Table Search Filter for long tables and logs
   5. Modal & Dropdown Escape Handling and Accessible Enhancements
   ========================================================================== */

(function() {
  'use strict';

  var ArkTheme = {
    mode: 'basic',

    init: function() {
      this.initSidebarNavigation();
      this.cleanupButtons();
      this.enhancePasswordFields();
      this.enhanceTablesAndLogs();
      this.enhanceTabs();
      this.enhanceSafetyModals();
      this.enhanceModals();
      this.enhanceInterfaceBadges();
      this.initGlobalEscHandler();
      this.enhanceNetlinkCharts();
      this.applyPageTransforms();
      this.injectFeatureGuides();
      this.translateRemainingUI();
      this.hideRedundantOverviewSections();
      this.observeDOM();
    },

    initSidebarNavigation: function() {
      // On login screen, remove sidebar, mobile bar, and backdrop completely
      if (document.body.classList.contains('ark-login-page') || document.querySelector('input[name="luci_password"]')) {
        document.body.classList.add('ark-login-page');
        var sb = document.getElementById('ark-sidebar');
        if (sb && sb.parentNode) sb.parentNode.removeChild(sb);
        var mb = document.querySelector('.ark-mobile-bar');
        if (mb && mb.parentNode) mb.parentNode.removeChild(mb);
        var bd = document.getElementById('ark-sidebar-backdrop');
        if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
        return;
      }

      var toggle = document.getElementById('ark-menu-toggle');
      var closeBtn = document.getElementById('ark-sidebar-close');
      var backdrop = document.getElementById('ark-sidebar-backdrop');

      function setOpen(open) {
        if (open) {
          document.body.classList.add('ark-sidebar-open');
        } else {
          document.body.classList.remove('ark-sidebar-open');
        }
      }

      if (toggle) {
        toggle.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(!document.body.classList.contains('ark-sidebar-open'));
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
          e.preventDefault();
          setOpen(false);
        });
      }

      if (backdrop) {
        backdrop.addEventListener('click', function(e) {
          e.preventDefault();
          setOpen(false);
        });
      }

      document.addEventListener('click', function(e) {
        // Close sidebar on mobile when navigating
        var navLink = e.target.closest('.ark-sidebar-nav a:not(.menu)');
        if (navLink && window.innerWidth <= 854) {
          setOpen(false);
        }
      });

      function autoExpandActiveMenu() {
        var curPath = window.location.pathname;
        var links = document.querySelectorAll('#topmenu .dropdown-menu a');
        for (var i = 0; i < links.length; i++) {
          var a = links[i];
          var href = a.getAttribute('href') || '';
          if (href && (href === curPath || (curPath.indexOf(href) === 0 && href.length > 15))) {
            a.classList.add('active');
            var parentDropdown = a.closest('li.dropdown');
            if (parentDropdown) parentDropdown.classList.add('open');
            break;
          }
        }
      }

      var topmenu = document.getElementById('topmenu');
      if (topmenu) {
        autoExpandActiveMenu();
        var obs = new MutationObserver(function() {
          autoExpandActiveMenu();
        });
        obs.observe(topmenu, { childList: true, subtree: true });
      }
    },

    initGlobalEscHandler: function() {
      document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' || e.keyCode === 27) {
          // 1. Close ARK Safety Modal
          var safety = document.getElementById('ark-safety-modal');
          if (safety) {
            safety.remove();
            return;
          }

          // 2. Close native LuCI modal dialogs
          var luciUi = (window.L && window.L.ui) || window.ui;
          if (luciUi && typeof luciUi.hideModal === 'function') {
            try { luciUi.hideModal(); } catch (err) {}
          }
          document.body.classList.remove('modal-overlay-active');

          // 3. Close open custom overlays in DOM (never remove #modal_overlay or native modal divs)
          var customOverlays = document.querySelectorAll('.ark-custom-overlay, .ex-modal-overlay');
          customOverlays.forEach(function(el) {
            if (el && el.parentNode) {
              el.remove();
            }
          });

          // 4. Close any open details or dropdown menus
          var openDropdowns = document.querySelectorAll('.dropdown.open, .open > .dropdown-menu');
          openDropdowns.forEach(function(d) {
            d.classList.remove('open');
          });
        }
      });
    },

    enhanceModals: function() {
      // 1. Backdrop click on #modal_overlay outside the modal closes it
      var overlay = document.getElementById('modal_overlay');
      if (overlay && !overlay._arkBound) {
        overlay._arkBound = true;
        overlay.addEventListener('click', function(ev) {
          if (ev.target === overlay) {
            var luciUi = (window.L && window.L.ui) || window.ui;
            if (luciUi && typeof luciUi.hideModal === 'function') {
              try { luciUi.hideModal(); } catch (e) {}
            }
            document.body.classList.remove('modal-overlay-active');
          }
        });
      }

      // 2. Add top-right sticky close '×' button to all modals (desktop & mobile)
      var modals = document.querySelectorAll('.modal, .cbi-modal');
      modals.forEach(function(m) {
        if (!m.querySelector('.ark-modal-close-btn')) {
          var closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.className = 'ark-modal-close-btn';
          closeBtn.setAttribute('aria-label', 'Fechar modal');
          closeBtn.title = 'Fechar';
          closeBtn.innerHTML = '&times;';
          closeBtn.addEventListener('click', function(ev) {
            ev.preventDefault();
            ev.stopPropagation();
            var luciUi = (window.L && window.L.ui) || window.ui;
            if (luciUi && typeof luciUi.hideModal === 'function') {
              try { luciUi.hideModal(); } catch (e) {}
            }
            document.body.classList.remove('modal-overlay-active');
          });
          m.insertBefore(closeBtn, m.firstChild);
        }
      });
    },

    injectFeatureGuides: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view || document.getElementById('ark-feature-guide')) return;

      var path = location.pathname;
      var guide = null;

      if (path.indexOf('/network/wireless') !== -1) {
        guide = {
          title: 'Guia de Redes Wi-Fi (Dual-Band)',
          serve: 'Controla a transmissão sem fio nas faixas de 5 GHz (máxima velocidade para vídeos e jogos) e 2.4 GHz (maior alcance através de paredes e compatibilidade com dispositivos inteligentes).',
          fazer: 'Defina nomes (SSID) fáceis de reconhecer e senhas fortes. Se o sinal estiver instável por interferência de vizinhos, troque o canal nas configurações do rádio.',
          rec: 'Mantenha o rádio 5 GHz no Canal 36 (80 MHz) e o 2.4 GHz no Canal 11 (20 MHz) com segurança WPA2-PSK (AES).'
        };
      } else if (path.indexOf('/network/network') !== -1) {
        guide = {
          title: 'Guia de Conexão: WAN (Internet) e LAN (Rede Local)',
          serve: 'A interface WAN recebe o sinal de internet do modem ou fibra da operadora. A interface LAN distribui essa conexão aos aparelhos conectados por cabo e Wi-Fi.',
          fazer: 'Se a internet cair, use o botão "Reiniciar" na interface WAN para restabelecer a conexão com a operadora. Para mudar a faixa de IP dos seus aparelhos, edite a interface LAN.',
          rec: 'Mantenha o roteador no IP 192.168.12.1 para nunca conflitar com modems de operadoras (que costumam usar 192.168.1.1 ou 192.168.0.1).'
        };
      } else if (path.indexOf('/system/flash') !== -1) {
        guide = {
          title: 'Guia de Backup, Restauração e Firmware',
          serve: 'Central de segurança do sistema para criar cópias de backup de todos os ajustes de rede e Wi-Fi, restaurar backups anteriores ou atualizar o sistema operacional OpenWrt.',
          fazer: 'Gere um arquivo de backup antes de fazer qualquer alteração técnica. Para voltar ao estado original de fábrica, use o botão "Restaurar de Fábrica".',
          rec: 'Sempre baixe um backup (.tar.gz) para o seu computador antes de instalar atualizações. Nunca desligue o aparelho da tomada durante uma gravação de firmware.'
        };
      } else if (path.indexOf('/system/admin') !== -1) {
        guide = {
          title: 'Guia de Senhas e Segurança Administrativa',
          serve: 'Define a senha da conta mestra "root", necessária para entrar neste painel de controle web e para conexões seguras de terminal SSH.',
          fazer: 'Digite a nova senha nos dois campos abaixo e acompanhe as 4 regras no medidor de força para garantir proteção máxima.',
          rec: 'Crie uma senha de pelo menos 8 dígitos combinando letras maiúsculas, minúsculas, números e um símbolo especial (@, #, $).'
        };
      } else if (path.indexOf('/network/diagnostics') !== -1) {
        guide = {
          title: 'Guia de Diagnósticos de Rede',
          serve: 'Testa a saúde da sua internet medindo latência (ping), rastreando a rota até o servidor de destino (traceroute) e testando a resolução de nomes (DNS).',
          fazer: 'Clique nos botões rápidos (Google DNS ou Cloudflare) para testar sua conexão com 1 clique sem precisar digitar comandos.',
          rec: 'Latência abaixo de 30 ms é ideal para chamadas de voz e jogos online. Se o Ping responder mas os sites não abrirem, seus servidores DNS estão fora do ar.'
        };
      } else if (path.indexOf('/system/reboot') !== -1) {
        guide = {
          title: 'Guia de Reinicialização Segura',
          serve: 'Reinicia o sistema operacional do roteador de forma segura, descarregando processos zumbis e liberando memória RAM sem perda de configurações.',
          fazer: 'Use esta opção se a internet estiver lenta após semanas ligada direto. O processo leva cerca de 60 a 75 segundos.',
          rec: 'Evite desligar puxando o cabo de energia da tomada para não corromper a memória flash SPI do equipamento.'
        };
      } else if (path.indexOf('/network/firewall') !== -1) {
        guide = {
          title: 'Guia do Firewall e Portas',
          serve: 'Barreira de proteção que bloqueia conexões não autorizadas vindas da internet para seus computadores e celulares.',
          fazer: 'Se precisar hospedar um servidor local ou obter NAT Aberto em jogos, crie regras de redirecionamento de portas (Port Forwarding) apenas para os IPs necessários.',
          rec: 'Mantenha a política de entrada da WAN como "Rejeitar" (Drop) para manter a rede doméstica invisível a invasores externos.'
        };
      } else if (path.indexOf('/network/dhcp') !== -1) {
        guide = {
          title: 'Guia de Servidor DHCP e DNS',
          serve: 'O DHCP atribui automaticamente endereços IP para cada novo dispositivo que entra no Wi-Fi ou cabo. O DNS converte nomes de sites em números IP de acesso.',
          fazer: 'Para fixar o IP de impressoras ou câmeras IP, role até "Leases Estáticos" e vincule o IP desejado ao endereço MAC do aparelho.',
          rec: 'Utilize tempo de concessão de 12 horas e configure servidores DNS rápidos como 1.1.1.1 (Cloudflare) ou 8.8.8.8 (Google).'
        };
      } else if (path.indexOf('/network/mwan') !== -1) {
        guide = {
          title: 'Guia do MWAN3 (Balanceamento e Redundância de Internet)',
          serve: 'Monitora links de internet (Multi-WAN) e detecta quedas automaticamente para alternar rotas ou somar conexões de operadoras diferentes.',
          fazer: 'O "Intervalo de Ping" (ex: 5 segundos) é a frequência com que o roteador testa se a internet está viva. Se o teste falhar 3 vezes seguidas, a rota é declarada inoperante. Clique no botão "Editar" de cada interface para alterar os segundos do intervalo ou os IPs de teste.',
          rec: 'Se você utiliza apenas 1 cabo de operadora (WAN única), o MWAN3 opera em modo padrão e os avisos amarelos no topo (wan6/wanb não encontrada) são normais e inofensivos.'
        };
      } else if (path.indexOf('/status/overview') !== -1) {
        guide = {
          title: 'Guia da Visão Geral do Sistema',
          serve: 'Painel de telemetria mostrando o estado de funcionamento do roteador, uso de processamento, memória RAM e dispositivos conectados.',
          fazer: 'Monitore os medidores de CPU e RAM no topo. Se a RAM livre ficar abaixo de 40 MB de forma contínua, faça uma reinicialização de manutenção.',
          rec: 'Mantenha margem segura de RAM livre para garantir estabilidade e máxima fluidez de tráfego.'
        };
      } else if (path.indexOf('/system/system') !== -1) {
        guide = {
          title: 'Guia de Configurações Gerais e Sincronização de Horário',
          serve: 'Define o nome identificador do roteador (hostname) na rede e sincroniza automaticamente o relógio com servidores NTP oficiais da internet.',
          fazer: 'Mantenha a sincronização NTP ativa para que os registros de log, agendamentos do firewall e relatórios de tráfego tenham horários precisos.',
          rec: 'Utilize o servidor pool.ntp.br e o fuso horário America/Sao_Paulo (UTC-3) para precisão no Brasil.'
        };
      } else if (path.indexOf('/status/processes') !== -1) {
        guide = {
          title: 'Guia de Processos em Execução (Memória RAM)',
          serve: 'Lista em tempo real os processos ativos na memória RAM do roteador (comando ps). Todos os itens listados já estão em execução, por isso não há opção de "Iniciar" direto nesta tabela.',
          fazer: 'Monitore o consumo de CPU e memória. Clique nos títulos das colunas (CPU, Memória, Comando ou PID) para ordenar a lista instantaneamente. Use "🔄 Recarregar" (SIGHUP) para recarregar configurações sem reiniciar nem descarregar da memória, "Terminar" (SIGTERM) para encerrar suavemente ou "Matar" (SIGKILL) caso o processo trave. Para INICIAR ou PARAR serviços do sistema, utilize o atalho no topo para "Sistema -> Inicialização".',
          rec: 'Nunca finalize processos essenciais do sistema operacional (como procd, ubusd, netifd ou uhttpd), pois eles mantêm o roteador e este painel funcionando.'
        };
      } else if (path.indexOf('/network/switch') !== -1 || path.indexOf('/network/vlan') !== -1) {
        guide = {
          title: 'Guia de Switch e VLANs (Portas de Rede Físicas)',
          serve: 'Configura o comutador de hardware interno (Switch Gigabit) dividindo as portas físicas traseiras em redes lógicas isoladas (VLANs).',
          fazer: 'Mantenha as portas 1 a 4 marcadas como "untagged" (U) na VLAN 1 para a rede local (LAN). A porta WAN conecta-se na VLAN 2.',
          rec: 'NUNCA desmarque nem altere a porta de CPU (eth0), pois ela é a ponte vital de comunicação entre o processador e as portas do roteador. Se quiser criar uma rede de visitantes isolada, utilize a interface Wi-Fi Guest em vez de alterar as VLANs físicas.'
        };
      } else if (path.indexOf('/nlbw/display') !== -1) {
        guide = {
          title: 'Guia do Monitor de Largura de Banda (Netlink)',
          serve: 'Monitora e registra em gráficos interativos o consumo de dados de cada computador, videogame e celular da sua casa em tempo real e por períodos acumulados.',
          fazer: 'Use o gráfico de rosca (donut) e a tabela de clientes abaixo para descobrir quais aparelhos ou protocolos estão usando a maior parte da sua franquia de dados ou banda de internet.',
          rec: 'Se sua internet estiver lenta durante downloads pesados de algum aparelho, utilize o Smart Queue Management (SQM Cake) no ARK Router para priorizar chamadas de voz e jogos.'
        };
      } else if (path.indexOf('/system/leds') !== -1) {
        guide = {
          title: 'Guia de Iluminação e LEDs de Status',
          serve: 'Controla os LEDs luminosos frontais do roteador (Status/Power, Internet, Wi-Fi 2.4 GHz e Wi-Fi 5 GHz) para indicar status de rede, quedas ou atividade física do seu aparelho.',
          fazer: 'Escolha um dos perfis rápidos no topo (Internet Inteligente, Modo Noturno, Alerta de Queda) para ajustar automaticamente todos os LEDs com 1 clique.',
          rec: 'Em dormitórios, ative o "Modo Noturno" para desligar as luzes e garantir um ambiente 100% escuro sem claridade.'
        };
      } else if (path.indexOf('/services/uhttpd') !== -1) {
        guide = {
          title: 'Guia do Servidor Web uHTTPd',
          serve: 'O uHTTPd é o servidor web HTTP e HTTPS interno do roteador, responsável por exibir este painel de controle LuCI e permitir a administração pelo navegador.',
          fazer: 'Ajuste portas de escuta (padrão 80 e 443) ou parâmetros de certificados. NUNCA apague a instância principal "main", pois ela mantém esta interface gráfica ativa.',
          rec: 'Mantenha "Ignore endereços IP privados na interface pública" marcado (RFC1918) para proteger o acesso administrativo contra ameaças externas da internet.'
        };
      } else if (path.indexOf('/status/syslog') !== -1 || path.indexOf('/status/dmesg') !== -1) {
        guide = {
          title: 'Guia de Registros de Eventos do Sistema (Logs)',
          serve: 'Registra em tempo real todos os acontecimentos operacionais do roteador, como conexões de aparelhos Wi-Fi, renovação de IP na operadora e avisos de segurança.',
          fazer: 'Utilize o campo de busca no topo para pesquisar termos como wifi, pppoe ou error e diagnosticar problemas rapidamente.',
          rec: 'Em caso de instabilidade com sua operadora, copie as linhas recentes que mencionem wan ou daemon para compartilhar com o suporte técnico.'
        };
      } else if (path.indexOf('/system/startup') !== -1) {
        guide = {
          title: 'Guia de Inicialização e Serviços',
          serve: 'Controla quais serviços do sistema são carregados automaticamente quando o roteador é ligado na tomada.',
          fazer: 'Você pode iniciar, reiniciar ou parar serviços individuais caso precise reiniciar uma função específica da rede sem reiniciar o aparelho inteiro.',
          rec: 'Mantenha habilitados apenas os serviços necessários para maximizar a memória RAM livre do equipamento.'
        };
      } else if (path.indexOf('/status/iptables') !== -1) {
        guide = {
          title: 'Guia de Condição e Fluxo do Firewall (iptables)',
          serve: 'Painel de telemetria em tempo real do Kernel Linux Netfilter. Mostra o fluxo exato de pacotes e bytes aceitos, bloqueados ou redirecionados entre sua rede local e a internet.',
          fazer: 'As correntes vazias vêm ocultadas por padrão para facilitar a leitura. Use a barra de busca no topo para pesquisar regras por IP, porta ou protocolo. Para adicionar ou modificar regras de segurança, clique no botão "⚙️ Editar Regras de Firewall (Rede ➔ Firewall)".',
          rec: 'A corrente FORWARD deve sempre manter a política padrão em DROP (Bloquear), garantindo que conexões externas não autorizadas nunca alcancem seus computadores e celulares.'
        };
      } else if (path.indexOf('/services/upnp') !== -1) {
        guide = {
          title: 'Guia de UPnP e NAT-PMP (Abertura Automática de Portas)',
          serve: 'Permite que consoles (PlayStation, Xbox, Switch) e aplicativos (torrents, games de PC) abram automaticamente portas de comunicação temporárias no roteador para obter NAT Aberto.',
          fazer: 'Se você joga online no videogame ou PC, mantenha o UPnP ativado para garantir conexões rápidas e bate-papo por voz sem bloqueios. Caso prefira segurança total e controle manual, desmarque e crie regras manuais no Firewall.',
          rec: 'Mantenha "Dispare os serviços de UPnP e NAT-PMP" ativado em residências com gamers. O ARK Router gerencia a limpeza automática das concessões inativas.'
        };
      } else if (path.indexOf('/status/realtime') !== -1) {
        guide = {
          title: 'Guia de Gráficos em Tempo Real (Largura de Banda e Carga)',
          serve: 'Painel com atualização dinâmica a cada 3 segundos exibindo carga da CPU, velocidade de download/upload, ruído do sinal Wi-Fi e sessões ativas (TCP/UDP).',
          fazer: 'Alterne entre as abas superiores para diagnosticar picos de consumo ou lentidão na rede. Se o tráfego atingir 100% da sua conexão, ative o Smart Queue Management (SQM Cake) no ARK Router para evitar lag em jogos.',
          rec: 'Para menor latência e jogos online fluidos, conexões UDP devem se manter estáveis e a Carga da CPU não deve ultrapassar 1.50.'
        };
      }

      if (!guide) return;

      var box = document.createElement('div');
      box.id = 'ark-feature-guide';
      box.className = 'ark-guide-box';
      box.innerHTML = '' +
        '<div class="ark-guide-title">📘 ' + guide.title + '</div>' +
        '<div class="ark-guide-item"><strong>📌 Para que serve:</strong> <span>' + guide.serve + '</span></div>' +
        '<div class="ark-guide-item"><strong>🛠️ O que fazer:</strong> <span>' + guide.fazer + '</span></div>' +
        '<div class="ark-guide-item rec"><strong>💡 Recomendação ARK:</strong> <span>' + guide.rec + '</span></div>';

      var target = view.querySelector('.ark-hero-banner, .ark-action-grid, .ark-wireless-grid, .ark-iface-grid, .ark-admin-card, .ark-diag-grid, .cbi-map, h2') || view.firstChild;
      if (target && target.parentNode) {
        target.parentNode.insertBefore(box, target);
      } else {
        view.insertBefore(box, view.firstChild);
      }
    },

    enhanceTabs: function() {
      var tabmenus = document.querySelectorAll('ul.cbi-tabmenu, ul.tabs, #tabmenu');
      tabmenus.forEach(function(menu) {
        // Enhance individual tab items
        var items = menu.querySelectorAll('li');
        items.forEach(function(li) {
          var a = li.querySelector('a');
          if (!a) return;

          var txt = a.textContent.trim();

          // Startup tab icons & tooltips
          if (txt === 'Scripts de iniciação' || txt === 'Initscripts') {
            a.innerHTML = '<span style="margin-right:6px;">⚙️</span> Scripts de Iniciação';
            a.title = 'Ativar, desativar, reiniciar ou parar serviços instalados no sistema';
          } else if (txt === 'Iniciação local' || txt === 'Local Startup') {
            a.innerHTML = '<span style="margin-right:6px;">📜</span> Iniciação Local (/etc/rc.local)';
            a.title = 'Comandos e scripts personalizados executados na inicialização';
          }

          // Active tab tactile feedback if clicked again
          if (!a.getAttribute('data-ark-click-bound')) {
            a.setAttribute('data-ark-click-bound', 'true');
            a.addEventListener('click', function() {
              if (!li.classList.contains('cbi-tab-disabled')) {
                a.style.transform = 'scale(0.96)';
                setTimeout(function() { a.style.transform = ''; }, 150);
              }
            });
          }
        });

        // Fail-safe delegated switcher for UI tabs
        if (!menu.getAttribute('data-ark-tab-delegated')) {
          menu.setAttribute('data-ark-tab-delegated', 'true');
          menu.addEventListener('click', function(ev) {
            var targetA = ev.target.closest('a');
            if (!targetA) return;
            var targetLi = targetA.closest('li[data-tab]');
            if (!targetLi) return;

            var tabName = targetLi.getAttribute('data-tab');
            if (!tabName) return;

            // Update tab button classes immediately
            menu.querySelectorAll('li[data-tab]').forEach(function(item) {
              if (item.getAttribute('data-tab') === tabName) {
                item.classList.add('cbi-tab');
                item.classList.remove('cbi-tab-disabled');
              } else {
                item.classList.remove('cbi-tab');
                item.classList.add('cbi-tab-disabled');
              }
            });

            // Find the sibling group container and enforce display styles
            var group = menu.nextElementSibling;
            if (group) {
              var panes = group.querySelectorAll('[data-tab]');
              panes.forEach(function(p) {
                if (p.tagName === 'LI') return;
                if (p.getAttribute('data-tab') === tabName) {
                  p.setAttribute('data-tab-active', 'true');
                  p.style.display = 'block';
                } else {
                  p.setAttribute('data-tab-active', 'false');
                  p.style.display = 'none';
                }
              });
            }
          });
        }
      });
    },

    translateRemainingUI: function() {
      var dict = {
        'Save & Apply': 'Salvar e Aplicar',
        'Apply unchecked': 'Aplicar sem verificar',
        'Save': 'Salvar Ajustes',
        'Reset': 'Redefinir Padrões',
        'Restart': 'Reiniciar',
        'Stop': 'Parar',
        'Edit': 'Editar',
        'Delete': 'Excluir',
        'Remove': 'Remover',
        'Scan': 'Escanear Redes',
        'Add': 'Adicionar',
        'Add new interface...': 'Adicionar Nova Interface...',
        'Generate archive': 'Gerar Cópia de Segurança',
        'Perform reset': 'Restaurar de Fábrica',
        'Upload archive...': 'Enviar Cópia...',
        'Flash image...': 'Gravar Imagem...',
        'Save mtdblock': 'Salvar Bloco MTD',
        'Open list...': 'Abrir Lista...',
        'Enable': 'Ativar',
        'Disable': 'Desativar',
        'Back': 'Voltar',
        'Dismiss': 'Fechar',
        'Cancel': 'Cancelar',
        'Confirm': 'Confirmar',
        'Wireless Overview': 'Centro de Comando Wi-Fi',
        'Associated Stations': 'Dispositivos Conectados no Wi-Fi',
        'Active DHCP Leases': 'Dispositivos Conectados na Rede Local (DHCP)',
        'Active DHCPv6 Leases': 'Dispositivos Conectados via IPv6',
        'Network Utilities': 'Utilitários e Diagnósticos de Rede',
        'Router Password': 'Senha do Administrador',
        'SSH Access': 'Acesso Remoto SSH',
        'SSH-Keys': 'Chaves Públicas SSH',
        'General Settings': 'Configurações Gerais',
        'Time Synchronization': 'Sincronização de Data e Hora',
        'Download backup': 'Baixar Cópia de Segurança',
        'Reset to defaults': 'Restaurar Padrões de Fábrica',
        'Restore backup': 'Restaurar Cópia de Segurança',
        'Flash new firmware image': 'Gravar Nova Imagem de Firmware',
        'Actions': 'Ações Principais',
        'Configuration': 'Ajustes Salvos',
        'Global network options': 'Opções Globais de Rede',
        'Interfaces': 'Interfaces de Rede',
        'Hostname': 'Nome do Roteador',
        'Model': 'Modelo',
        'Architecture': 'Processador / Arquitetura',
        'Firmware Version': 'Versão do Sistema',
        'Kernel Version': 'Versão do Kernel',
        'Local Time': 'Hora Local',
        'Uptime': 'Tempo de Atividade',
        'Load Average': 'Carga da CPU',
        'MAC-Address': 'Endereço MAC',
        'Network': 'Rede',
        'Signal / Noise': 'Sinal / Ruído',
        'RX Rate / TX Rate': 'Download / Upload',
        'No information available': 'Nenhum dispositivo conectado no momento.',
        'Auto Refresh': 'Atualização Automática',
        'Collecting data...': 'Coletando informações...',
        'System log': 'Registros de Mensagens do Sistema',
        'Kernel Log': 'Registros de Eventos do Kernel',
        'Processes': 'Processos em Execução',
        'Routing Table': 'Tabela de Rotas',
        'Firewall - Zone Settings': 'Firewall - Zonas de Segurança',
        'Port Forwards': 'Redirecionamento de Portas',
        'Traffic Rules': 'Regras de Tráfego',
        'Custom Rules': 'Regras Personalizadas',
        'Diagnostics': 'Diagnósticos de Rede',
        'Reboot': 'Reinicialização do Sistema',
        'Backup / Flash Firmware': 'Backup e Gravação de Firmware',
        'Administration': 'Administração e Senhas',
        'DHCP and DNS': 'Servidor DHCP e DNS',
        'Static Leases': 'Endereços IP Fixos (Leases Estáticos)',
        'IP Address': 'Endereço IP',
        'IP address': 'Endereço IP',
        'Netmask': 'Máscara de Rede',
        'Gateway': 'Gateway Padrão',
        'DNS server': 'Servidor DNS',
        'DNS servers': 'Servidores DNS',
        'IPv6-Address': 'Endereço IPv6',
        'Transfer': 'Tráfego',
        'Transmit': 'Enviados (TX)',
        'Receive': 'Recebidos (RX)'
      };

      var btns = document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn, a.cbi-button');
      btns.forEach(function(b) {
        if (b.tagName === 'INPUT') {
          var val = (b.value || '').trim();
          if (val === 'Limpar' || val === 'Reset') {
            b.value = '↩️ Desfazer Alterações';
            b.title = 'Descarta as alterações não salvas nesta tela e recarrega os dados originais salvos no roteador';
          } else if (val === 'Apagar' && b.closest('.cbi-section-remove')) {
            b.value = '🗑️ Apagar Instância';
            b.title = 'Exclui esta instância de serviço';
          } else if (dict[val]) {
            b.value = dict[val];
          }
        } else {
          var t = b.textContent.trim();
          if (t === 'Limpar' || t === 'Reset') {
            b.textContent = '↩️ Desfazer Alterações';
            b.title = 'Descarta as alterações não salvas nesta tela e recarrega os dados originais salvos no roteador';
          } else if (dict[t]) {
            b.textContent = dict[t];
          }
        }
      });

      var headings = document.querySelectorAll('h2, h3, legend, .cbi-value-title, th, .th, .cbi-tab a');
      headings.forEach(function(h) {
        var t = h.textContent.trim();
        if (dict[t]) h.textContent = dict[t];
      });

      var placeholders = document.querySelectorAll('.tr.placeholder td, .tr.placeholder .td, em');
      placeholders.forEach(function(p) {
        var t = p.textContent.trim();
        if (dict[t]) p.textContent = dict[t];
      });

      // 4. Empty Section Revert Warning Banner (e.g. if an instance was deleted by mistake)
      var emptyNotices = document.querySelectorAll('.cbi-section-empty, .cbi-section-node-empty, em');
      emptyNotices.forEach(function(em) {
        var txt = (em.textContent || '').trim().toLowerCase();
        if (txt.indexOf('não possui nenhum valor') !== -1 || txt.indexOf('no values yet') !== -1) {
          var secNode = em.closest('.cbi-section');
          if (secNode && !secNode.querySelector('.ark-revert-banner')) {
            var banner = document.createElement('div');
            banner.className = 'alert-message warning ark-revert-banner';
            banner.style.marginTop = '12px';
            banner.style.marginBottom = '16px';
            banner.style.display = 'flex';
            banner.style.alignItems = 'center';
            banner.style.justifyContent = 'space-between';
            banner.style.gap = '12px';
            banner.style.flexWrap = 'wrap';
            banner.innerHTML = '' +
              '<div>' +
                '<strong>⚠️ Atenção: Nenhuma instância configurada nesta seção!</strong><br>' +
                '<span style="font-size:12.5px;">Se você apagou por engano, você pode recuperar os dados originais salvos no roteador antes de salvar:</span>' +
              '</div>' +
              '<button type="button" class="btn btn-primary" style="padding:6px 14px;font-weight:600;">' +
                '↩️ Desfazer e Restaurar' +
              '</button>';
            banner.querySelector('button').addEventListener('click', function() {
              var resetBtn = document.querySelector('.cbi-button-reset, input[name*="reset"], button[name*="reset"]');
              if (resetBtn) {
                resetBtn.click();
              } else {
                location.reload();
              }
            });
            em.parentNode.insertBefore(banner, em);
          }
        }
      });
    },

    enhancePasswordFields: function() {
      // 1. Suppress legacy LuCI reveal button (*) so only ARK eye toggle is shown
      var legacyToggles = document.querySelectorAll('button[title*="Reveal/hide password"], button[title*="password"], button[title*="senha"], button[title*="Revele"], button[title*="oculte"], button[aria-label*="senha"], button[aria-label*="password"]');
      legacyToggles.forEach(function(btn) {
        var txt = btn.textContent.trim();
        if (txt === '∗' || txt === '*' || txt === '') {
          btn.style.setProperty('display', 'none', 'important');
        }
      });

      // 2. Wrap and add eye toggle only for real, visible inputs that do not already have a reveal button
      var passInputs = document.querySelectorAll('input[type="password"]:not([data-ark-eye="true"])');
      var firstProcessed = false;

      passInputs.forEach(function(input) {
        // Skip hidden dummy autofill inputs
        if (input.style.position === 'absolute' || 
            input.getAttribute('aria-hidden') === 'true' || 
            input.tabIndex === -1 || 
            (!input.id && !input.name)) {
          return;
        }

        input.setAttribute('data-ark-eye', 'true');

        var parent = input.parentElement;
        var existingBtn = parent ? parent.querySelector('.ark-pwd-toggle') : null;

        if (!existingBtn && parent) {
          // Hide any legacy reveal button in parent
          var legacyInParent = parent.querySelectorAll('button.cbi-button-neutral, button[title*="senha"], button[title*="password"], button[title*="Revele"]');
          legacyInParent.forEach(function(lb) {
            var ltxt = lb.textContent.trim();
            if (ltxt === '∗' || ltxt === '*' || ltxt === '') {
              lb.style.setProperty('display', 'none', 'important');
            }
          });

          var wrap = document.createElement('div');
          wrap.className = 'ark-pwd-wrap';
          parent.insertBefore(wrap, input);
          wrap.appendChild(input);

          var toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'ark-pwd-toggle';
          toggle.title = 'Mostrar / Ocultar Senha';
          toggle.setAttribute('aria-label', 'Mostrar / Ocultar Senha');
          toggle.innerHTML = '👁️';
          toggle.tabIndex = -1;

          toggle.addEventListener('click', function(e) {
            e.preventDefault();
            if (input.type === 'password') {
              input.type = 'text';
              toggle.classList.add('showing');
            } else {
              input.type = 'password';
              toggle.classList.remove('showing');
            }
          });
          wrap.appendChild(toggle);
        }

        // Add strength meter ONLY for the primary password input (pw1) on system admin
        var isSystemAdmin = (location.pathname.indexOf('/system/admin') !== -1);
        var isPrimary = (!firstProcessed && isSystemAdmin) || (input.name && input.name.indexOf('pw1') !== -1);

        if (isPrimary && !document.querySelector('.ark-pwd-meter')) {
          firstProcessed = true;
          var meter = document.createElement('div');
          meter.className = 'ark-pwd-meter';
          meter.innerHTML = '' +
            '<div class="ark-meter-bar"><div class="ark-meter-fill"></div></div>' +
            '<div class="ark-meter-label"><span class="ark-meter-text">Força da Senha: Digite sua nova senha</span></div>' +
            '<div class="ark-meter-rules">' +
              '<span class="rule-len">8+ Caracteres</span>' +
              '<span class="rule-case">Maiúsculas e Minúsculas</span>' +
              '<span class="rule-num">Números</span>' +
              '<span class="rule-sym">Símbolos (@, #, $)</span>' +
            '</div>';

          var fieldContainer = input.closest('.cbi-value-field') || input.parentElement;
          if (fieldContainer) {
            fieldContainer.appendChild(meter);
          }

          var fill = meter.querySelector('.ark-meter-fill');
          var text = meter.querySelector('.ark-meter-text');
          var rLen = meter.querySelector('.rule-len');
          var rCase = meter.querySelector('.rule-case');
          var rNum = meter.querySelector('.rule-num');
          var rSym = meter.querySelector('.rule-sym');

          input.addEventListener('input', function() {
            var val = input.value;
            if (!val) {
              fill.style.width = '0%';
              fill.className = 'ark-meter-fill';
              text.textContent = 'Força da Senha: Digite sua nova senha';
              rLen.classList.remove('ok');
              rCase.classList.remove('ok');
              rNum.classList.remove('ok');
              rSym.classList.remove('ok');
              return;
            }

            var score = 0;
            var hasLen = val.length >= 8;
            var hasCase = /[a-z]/.test(val) && /[A-Z]/.test(val);
            var hasNum = /[0-9]/.test(val);
            var hasSym = /[^a-zA-Z0-9]/.test(val);

            if (hasLen) { score += 25; rLen.classList.add('ok'); } else { rLen.classList.remove('ok'); }
            if (hasCase) { score += 25; rCase.classList.add('ok'); } else { rCase.classList.remove('ok'); }
            if (hasNum) { score += 25; rNum.classList.add('ok'); } else { rNum.classList.remove('ok'); }
            if (hasSym) { score += 25; rSym.classList.add('ok'); } else { rSym.classList.remove('ok'); }

            fill.style.width = score + '%';
            fill.className = 'ark-meter-fill';
            if (score <= 25) {
              fill.classList.add('weak');
              text.textContent = 'Força: Fraca (Vulnerável)';
            } else if (score <= 50) {
              fill.classList.add('medium');
              text.textContent = 'Força: Média (Razoável)';
            } else if (score <= 75) {
              fill.classList.add('good');
              text.textContent = 'Força: Boa (Recomendada)';
            } else {
              fill.classList.add('strong');
              text.textContent = 'Força: Excelente (ARK Shield 🛡️)';
            }
          });
        }
      });
    },

    enhanceTablesAndLogs: function() {
      // 1. Long Tables (Both <table> and <div class="table">)
      var tables = document.querySelectorAll('table.cbi-section-table, table.table, div.table');
      tables.forEach(function(tbl) {
        if (tbl.getAttribute('data-ark-filtered') === 'true') return;
        if (tbl.closest('.ark-guide-box, #ark-overview-dashboard, .ark-action-card, .ark-admin-card, [data-chain], [data-table], #ark-iptables-bar') || location.pathname.indexOf('/status/iptables') !== -1) return;

        var rows = tbl.querySelectorAll('tbody > tr, div.tr:not(.table-titles)');
        if (rows.length < 6) return;

        // Skip key-value tables with 2 or fewer columns (e.g. Memory, System info)
        var firstRow = rows[0];
        if (firstRow) {
          var cells = firstRow.querySelectorAll('td, th, .td, .th');
          if (cells.length <= 2) return;
        }

        tbl.setAttribute('data-ark-filtered', 'true');

        var filterBar = document.createElement('div');
        filterBar.className = 'ark-table-search-bar';
        filterBar.innerHTML = '' +
          '<span class="ark-search-icon">🔍</span>' +
          '<input type="text" class="ark-search-input" placeholder="Filtrar nesta lista em tempo real..." />' +
          '<span class="ark-search-count">' + rows.length + ' itens</span>';

        tbl.parentNode.insertBefore(filterBar, tbl);

        var searchInput = filterBar.querySelector('.ark-search-input');
        var searchCount = filterBar.querySelector('.ark-search-count');

        searchInput.addEventListener('input', function() {
          var query = searchInput.value.toLowerCase().trim();
          var visible = 0;
          rows.forEach(function(row) {
            var txt = row.textContent.toLowerCase();
            if (!query || txt.indexOf(query) !== -1) {
              row.style.display = '';
              visible++;
            } else {
              row.style.display = 'none';
            }
          });
          if (visible === 0 && query) {
            searchCount.textContent = 'Nenhum resultado';
            searchCount.style.color = '#f87171';
          } else {
            searchCount.style.color = '';
            searchCount.textContent = query ? (visible + ' de ' + rows.length + ' itens') : (rows.length + ' itens');
          }
        });
      });

      // 2. Preformatted Logs (Syslog & Dmesg)
      var logEl = document.querySelector('#syslog, #dmesg, textarea[name="syslog"], pre.log, pre');
      if (logEl && !logEl.getAttribute('data-ark-enhanced')) {
        var rawContent = logEl.value !== undefined ? logEl.value : logEl.textContent;
        if (rawContent && rawContent.length > 200) {
          logEl.setAttribute('data-ark-enhanced', 'true');

          var logActions = document.createElement('div');
          logActions.className = 'ark-log-header-bar';
          logActions.style.display = 'flex';
          logActions.style.flexWrap = 'wrap';
          logActions.style.gap = '10px';
          logActions.style.alignItems = 'center';
          logActions.style.marginBottom = '12px';

          logActions.innerHTML = '' +
            '<div class="ark-table-search-bar" style="margin-bottom: 0; flex: 1; min-width: 260px;">' +
              '<span class="ark-search-icon">🔍</span>' +
              '<input type="text" class="ark-search-input ark-log-filter" placeholder="Filtrar mensagens de log em tempo real..." />' +
              '<span class="ark-search-count ark-log-counter"></span>' +
            '</div>' +
            '<div class="ark-log-btn-group" style="display: flex; gap: 8px;">' +
              '<button type="button" class="cbi-button cbi-button-neutral ark-copy-log-btn" style="display:inline-flex;align-items:center;gap:6px;">📋 Copiar Log</button>' +
              '<button type="button" class="cbi-button cbi-button-action ark-download-log-btn" style="display:inline-flex;align-items:center;gap:6px;">📥 Baixar (.txt)</button>' +
            '</div>';

          logEl.parentNode.insertBefore(logActions, logEl);

          var rawLogLines = rawContent.split('\n');
          var logInput = logActions.querySelector('.ark-log-filter');
          var logCounter = logActions.querySelector('.ark-log-counter');
          var copyBtn = logActions.querySelector('.ark-copy-log-btn');
          var dlBtn = logActions.querySelector('.ark-download-log-btn');

          if (logCounter) logCounter.textContent = rawLogLines.length + ' linhas';

          function setLogText(text) {
            if (logEl.value !== undefined) {
              logEl.value = text;
            } else {
              logEl.textContent = text;
            }
          }

          function getLogText() {
            return logEl.value !== undefined ? logEl.value : logEl.textContent;
          }

          logInput.addEventListener('input', function() {
            var q = logInput.value.toLowerCase().trim();
            if (!q) {
              setLogText(rawLogLines.join('\n'));
              if (logCounter) logCounter.textContent = rawLogLines.length + ' linhas';
            } else {
              var filtered = rawLogLines.filter(function(line) {
                return line.toLowerCase().indexOf(q) !== -1;
              });
              setLogText(filtered.join('\n'));
              if (logCounter) logCounter.textContent = filtered.length + ' de ' + rawLogLines.length;
            }
          });

          // Universal Copy with HTTP fallback
          copyBtn.addEventListener('click', function() {
            var textToCopy = getLogText();
            var success = false;

            if (navigator.clipboard && window.isSecureContext) {
              navigator.clipboard.writeText(textToCopy).then(function() {
                showCopiedFeedback();
              }).catch(function() {
                fallbackCopy();
              });
            } else {
              fallbackCopy();
            }

            function fallbackCopy() {
              try {
                var ta = document.createElement('textarea');
                ta.value = textToCopy;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                ta.style.top = '0';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                success = document.execCommand('copy');
                document.body.removeChild(ta);
                if (success) {
                  showCopiedFeedback();
                } else {
                  copyBtn.textContent = '❌ Erro ao copiar';
                  setTimeout(function() { copyBtn.textContent = '📋 Copiar Log'; }, 2500);
                }
              } catch (err) {
                copyBtn.textContent = '❌ Erro ao copiar';
                setTimeout(function() { copyBtn.textContent = '📋 Copiar Log'; }, 2500);
              }
            }

            function showCopiedFeedback() {
              copyBtn.textContent = '✅ Copiado!';
              copyBtn.style.background = '#10b981';
              copyBtn.style.color = '#fff';
              setTimeout(function() {
                copyBtn.textContent = '📋 Copiar Log';
                copyBtn.style.background = '';
                copyBtn.style.color = '';
              }, 2000);
            }
          });

          // Download as .txt file
          dlBtn.addEventListener('click', function() {
            var textToSave = getLogText();
            var logType = location.pathname.indexOf('dmesg') !== -1 ? 'dmesg' : 'syslog';
            var now = new Date();
            var y = now.getFullYear();
            var m = String(now.getMonth() + 1).padStart(2, '0');
            var d = String(now.getDate()).padStart(2, '0');
            var hh = String(now.getHours()).padStart(2, '0');
            var mm = String(now.getMinutes()).padStart(2, '0');
            var filename = 'ark-router-' + logType + '-' + y + '-' + m + '-' + d + '_' + hh + 'h' + mm + '.txt';

            var blob = new Blob([textToSave], { type: 'text/plain;charset=utf-8' });
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            dlBtn.textContent = '✅ Baixando...';
            setTimeout(function() {
              dlBtn.textContent = '📥 Baixar (.txt)';
            }, 2000);
          });
        }
      }
    },

    enhanceSafetyModals: function() {
      var self = this;
      
      // 1. Reboot Page
      if (location.pathname.indexOf('/system/reboot') !== -1) {
        var rebootBtns = document.querySelectorAll('button.cbi-button, input[type="submit"], button[type="submit"]');
        rebootBtns.forEach(function(btn) {
          if (btn.getAttribute('data-ark-safe') === 'true') return;
          btn.setAttribute('data-ark-safe', 'true');

          btn.addEventListener('click', function(e) {
            if (btn.getAttribute('data-confirmed') === 'true') return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            self.showSafetyDialog({
              title: 'Confirmar Reinicialização do Sistema',
              icon: '🔄',
              type: 'warning',
              message: 'Tem certeza de que deseja reiniciar o roteador ARK?<br><br>' +
                       '<strong>Impacto no serviço:</strong><br>' +
                       '• Todas as conexões Wi-Fi e cabeadas serão interrompidas temporariamente.<br>' +
                       '• Downloads, chamadas e jogos em andamento serão desconectados.<br>' +
                       '• ⏱️ <em>Tempo estimado para retorno: cerca de 60 a 75 segundos.</em>',
              confirmText: 'Sim, Reiniciar Agora',
              onConfirm: function() {
                btn.setAttribute('data-confirmed', 'true');
                self.showCountdownScreen('Reiniciando o Roteador...', 75, 'Aguarde enquanto os serviços são restabelecidos. O painel será recarregado automaticamente.');
                btn.click();
              }
            });
          }, true);
        });
      }

      // 2. Flash / Factory Reset Page
      if (location.pathname.indexOf('/system/flash') !== -1) {
        var resetBtns = document.querySelectorAll('button.cbi-button-negative, input[name*="reset"], button[name*="reset"]');
        resetBtns.forEach(function(btn) {
          if (btn.getAttribute('data-ark-safe') === 'true') return;
          btn.setAttribute('data-ark-safe', 'true');

          btn.addEventListener('click', function(e) {
            if (btn.getAttribute('data-confirmed') === 'true') return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            self.showSafetyDialog({
              title: 'Restaurar Configurações de Fábrica?',
              icon: '⚠️',
              type: 'danger',
              message: '<strong style="color:#ef4444;">ATENÇÃO: ESTA AÇÃO É IRREVERSÍVEL!</strong><br><br>' +
                       'Todas as personalizações, senhas, redes Wi-Fi e regras serão apagadas e substituídas pelo padrão de fábrica.<br><br>' +
                       '• O IP voltará para o padrão (192.168.1.1 ou 192.168.12.1).<br>' +
                       '• ⏱️ <em>Tempo estimado: cerca de 2 minutos.</em>',
              confirmText: 'Apagar Tudo e Restaurar',
              onConfirm: function() {
                btn.setAttribute('data-confirmed', 'true');
                self.showCountdownScreen('Restaurando Padrões de Fábrica...', 120, 'Não desligue o equipamento da tomada durante a gravação!');
                btn.click();
              }
            });
          }, true);
        });
      }

      // 3. Destructive Deletion & Removal Buttons Across All CBI Forms (e.g. uHTTPd, Interfaces, Firewall)
      var deleteBtns = document.querySelectorAll(
        '.cbi-section-remove input, .cbi-section-remove button, ' +
        'input.cbi-button-remove, button.cbi-button-remove, ' +
        'input[name^="cbi.rts."], button[name^="cbi.rts."], ' +
        'input[name*="remove_conf"], input[name*="remove_old"]'
      );
      deleteBtns.forEach(function(btn) {
        if (btn.getAttribute('data-ark-safe') === 'true') return;
        if (btn.closest('#ark-flash-grid')) return;
        btn.setAttribute('data-ark-safe', 'true');

        btn.addEventListener('click', function(e) {
          if (btn.getAttribute('data-confirmed') === 'true') {
            btn.removeAttribute('data-confirmed');
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          var actionName = btn.value || btn.textContent || 'este item';
          var sec = btn.closest('.cbi-section') || btn.closest('.cbi-value');
          var secTitle = sec ? (sec.querySelector('h3, legend, .cbi-value-title') ? sec.querySelector('h3, legend, .cbi-value-title').textContent.trim() : '') : '';

          var isUhttpdMain = (btn.name && btn.name.indexOf('uhttpd.main') !== -1) ||
                             (location.pathname.indexOf('uhttpd') !== -1 && (secTitle === 'MAIN' || (btn.name && btn.name.indexOf('main') !== -1)));

          var msg = 'Tem certeza de que deseja executar a remoção?<br><br>' +
                    'Ação: <strong>' + actionName + '</strong>';
          if (secTitle) {
            msg += '<br>Seção afetada: <strong>' + secTitle + '</strong>';
          }
          if (isUhttpdMain) {
            msg += '<br><br><span style="color:#ef4444;font-weight:700;">⚠️ ALERTA CRÍTICO:</span> ' +
                   'A instância <strong>main</strong> do uHTTPd é o servidor web ativo que exibe este painel de controle. ' +
                   'Se você apagá-la e salvar, você perderá o acesso à interface web pelo navegador!';
          }
          msg += '<br><br><em>Dica: Se você apagar por engano, utilize o botão <strong>↩️ Desfazer Alterações</strong> no rodapé antes de salvar para recuperar os dados originais.</em>';

          self.showSafetyDialog({
            title: isUhttpdMain ? '⚠️ Confirmar Exclusão de Instância Crítica' : 'Confirmar Remoção / Exclusão',
            icon: '🗑️',
            type: 'danger',
            message: msg,
            confirmText: 'Sim, Desejo Apagar',
            onConfirm: function() {
              btn.setAttribute('data-confirmed', 'true');
              btn.click();
            }
          });
        }, true);
      });
    },

    showSafetyDialog: function(opts) {
      var existing = document.getElementById('ark-safety-modal');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.id = 'ark-safety-modal';
      overlay.className = 'ark-modal-backdrop';
      overlay.innerHTML = '' +
        '<div class="ark-modal-box ' + (opts.type || 'warning') + '">' +
          '<div class="ark-modal-header">' +
            '<span class="ark-modal-icon">' + (opts.icon || '⚠️') + '</span>' +
            '<h3>' + opts.title + '</h3>' +
          '</div>' +
          '<div class="ark-modal-body">' +
            opts.message +
          '</div>' +
          '<div class="ark-modal-actions">' +
            '<button type="button" class="cbi-button cbi-button-neutral ark-modal-cancel">Cancelar</button>' +
            '<button type="button" class="cbi-button cbi-button-negative ark-modal-confirm">' + (opts.confirmText || 'Confirmar') + '</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);

      overlay.querySelector('.ark-modal-cancel').addEventListener('click', function() {
        overlay.remove();
      });

      overlay.querySelector('.ark-modal-confirm').addEventListener('click', function() {
        overlay.remove();
        if (typeof opts.onConfirm === 'function') opts.onConfirm();
      });

      var escHandler = function(e) {
        if (e.key === 'Escape') {
          overlay.remove();
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
    },

    showCountdownScreen: function(title, seconds, note) {
      var scr = document.createElement('div');
      scr.className = 'ark-fullscreen-overlay';
      scr.innerHTML = '' +
        '<div class="ark-countdown-card">' +
          '<div class="ark-spinner-ring"></div>' +
          '<h2>' + title + '</h2>' +
          '<div class="ark-countdown-num" id="ark-timer-val">' + seconds + 's</div>' +
          '<div class="ark-countdown-progress"><div class="ark-progress-bar" id="ark-timer-bar"></div></div>' +
          '<p class="ark-countdown-note">' + note + '</p>' +
        '</div>';

      document.body.appendChild(scr);

      var remaining = seconds;
      var timerVal = document.getElementById('ark-timer-val');
      var timerBar = document.getElementById('ark-timer-bar');

      var interval = setInterval(function() {
        remaining--;
        if (timerVal) timerVal.textContent = remaining + 's';
        if (timerBar) timerBar.style.width = ((seconds - remaining) / seconds * 100) + '%';

        if (remaining <= 0) {
          clearInterval(interval);
          location.reload();
        }
      }, 1000);
    },

    enhanceInterfaceBadges: function() {
      var badges = document.querySelectorAll('.ifacebadge');
      badges.forEach(function(badge) {
        if (badge.classList.contains('ark-styled')) return;
        badge.classList.add('ark-styled');
        var text = badge.textContent.trim();
        var icon = '🌐';
        if (text.toLowerCase().indexOf('lan') !== -1) icon = '🏠';
        else if (text.toLowerCase().indexOf('wan') !== -1) icon = '⚡';
        else if (text.toLowerCase().indexOf('wlan') !== -1 || text.toLowerCase().indexOf('radio') !== -1) icon = '📡';

        var span = document.createElement('span');
        span.className = 'ark-iface-icon';
        span.textContent = icon + ' ';
        badge.prepend(span);
      });
    },

    applyPageTransforms: function() {
      var mode = localStorage.getItem('ark_interface_mode') || 'basic';
      if (document.body && document.body.getAttribute('data-interface-mode') !== mode) {
        document.body.setAttribute('data-interface-mode', mode);
      }
      var path = location.pathname;
      if (path.indexOf('/status/overview') !== -1) {
        this.transformStatusOverview();
      } else if (path.indexOf('/system/flash') !== -1) {
        this.transformSystemFlash();
      } else if (path.indexOf('/system/reboot') !== -1) {
        this.transformSystemReboot();
      } else if (path.indexOf('/network/diagnostics') !== -1) {
        this.transformNetworkDiagnostics();
      } else if (path.indexOf('/network/wireless') !== -1) {
        this.transformNetworkWireless();
      } else if (path.indexOf('/network/network') !== -1) {
        this.transformNetworkInterfaces();
      } else if (path.indexOf('/system/admin') !== -1) {
        this.transformSystemAdmin();
      } else if (path.indexOf('/status/iptables') !== -1) {
        this.transformStatusIptables();
      } else if (path.indexOf('/status/processes') !== -1) {
        this.transformStatusProcesses();
      } else if (path.indexOf('/status/realtime') !== -1) {
        this.transformStatusRealtime();
      } else if (path.indexOf('/system/leds') !== -1) {
        this.transformSystemLeds();
      } else if (path.indexOf('/nlbw/display') !== -1) {
        this.enhanceNetlinkCharts();
      }
      this.hideRedundantOverviewSections();
    },

    enhanceNetlinkCharts: function() {
      if (location.pathname.indexOf('/nlbw/display') === -1) return;

      var cyberpunkPalette = [
        '#38bdf8', '#818cf8', '#34d399', '#fbbf24', 
        '#f472b6', '#a78bfa', '#2dd4bf', '#fb923c',
        '#60a5fa', '#c084fc', '#4ade80', '#e879f9'
      ];

      var hookChart = function() {
        if (window.Chart && window.Chart.prototype && !window.Chart.prototype._arkHooked) {
          window.Chart.prototype._arkHooked = true;
          var origDoughnut = window.Chart.prototype.Doughnut;
          window.Chart.prototype.Doughnut = function(data, opts) {
            opts = opts || {};
            opts.segmentStrokeColor = '#111c35';
            opts.segmentStrokeWidth = 2;
            opts.percentageInnerCutout = 45;
            if (Array.isArray(data)) {
              data.forEach(function(seg, i) {
                if (seg.color === '#cccccc' || (data.length === 1 && seg.value === 1)) {
                  seg.color = '#223455';
                } else {
                  seg.color = cyberpunkPalette[i % cyberpunkPalette.length];
                }
              });
            }
            return origDoughnut.call(this, data, opts);
          };

          if (window.Chart.defaults && window.Chart.defaults.global) {
            window.Chart.defaults.global.tooltipFillColor = 'rgba(15, 23, 42, 0.94)';
            window.Chart.defaults.global.tooltipFontFamily = 'system-ui, -apple-system, sans-serif';
            window.Chart.defaults.global.tooltipFontSize = 11;
            window.Chart.defaults.global.tooltipCornerRadius = 6;
          }
        }
      };

      hookChart();
      if (!window.Chart) {
        var checkInterval = setInterval(function() {
          if (window.Chart) {
            hookChart();
            clearInterval(checkInterval);
          }
        }, 100);
        setTimeout(function() { clearInterval(checkInterval); }, 5000);
      }
    },

    transformStatusRealtime: function() {
      var svgs = document.querySelectorAll('svg');
      svgs.forEach(function(svg) {
        var parent = svg.parentElement;
        if (parent) {
          parent.classList.add('ark-realtime-chart-card');
          parent.style.background = 'var(--ark-surface-1, #111c35)';
          parent.style.borderColor = 'var(--ark-border, #223455)';
          parent.style.borderRadius = 'var(--ark-radius, 10px)';
          parent.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
          parent.style.overflow = 'hidden';
        }
        var lines = svg.querySelectorAll('line');
        lines.forEach(function(l) {
          l.style.stroke = 'rgba(255, 255, 255, 0.08)';
        });
        var texts = svg.querySelectorAll('text');
        texts.forEach(function(t) {
          t.style.fill = '#94a3b8';
        });
      });
    },

    transformStatusProcesses: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view) return;

      // 1. Top shortcut banner for System Services
      if (!document.getElementById('ark-proc-top-bar')) {
        var bar = document.createElement('div');
        bar.id = 'ark-proc-top-bar';
        bar.className = 'ark-proc-top-bar';
        bar.innerHTML = '' +
          '<div class="ark-proc-top-left">' +
            '<span class="ark-proc-top-icon">⚡</span>' +
            '<div class="ark-proc-top-text">' +
              '<strong>Processos Ativos na Memória RAM</strong>' +
              '<span>Estes programas já estão rodando na memória. Para iniciar novos serviços ou gerenciar o boot:</span>' +
            '</div>' +
          '</div>' +
          '<div class="ark-proc-top-right">' +
            '<a href="/cgi-bin/luci/admin/system/startup" class="cbi-button cbi-button-apply ark-proc-srv-btn">' +
              '⚙️ Gerenciar Serviços (Iniciar / Parar / Reiniciar)' +
            '</a>' +
          '</div>';

        var guide = document.getElementById('ark-feature-guide');
        if (guide && guide.nextSibling) {
          guide.parentNode.insertBefore(bar, guide.nextSibling);
        } else {
          var target = view.querySelector('.table, table, .cbi-map') || view.firstChild;
          if (target && target.parentNode) {
            target.parentNode.insertBefore(bar, target);
          }
        }
      }

      // 2. Format process rows (status badge + horizontal button group)
      var rows = view.querySelectorAll('.table .tr:not(.table-titles):not(.placeholder), table.cbi-section-table tr:not(.table-titles)');
      rows.forEach(function(row) {
        var cells = row.querySelectorAll('.td, td');
        if (cells.length < 6) return;

        var cmdCell = cells[2];
        var actionCell = cells[5];

        // Add Status Badge to Command Cell if not present
        if (!cmdCell.querySelector('.ark-proc-status')) {
          var rawCmd = cmdCell.textContent.trim();
          var isKernel = rawCmd.indexOf('[') === 0 && rawCmd.lastIndexOf(']') === rawCmd.length - 1;
          var badge = document.createElement('span');
          badge.className = 'ark-proc-status ' + (isKernel ? 'kernel' : 'active');
          badge.title = isKernel ? 'Thread interna do Kernel Linux' : 'Processo ativo e em execução na memória RAM';
          badge.innerHTML = isKernel ? '⚡ Kernel' : '🟢 Ativo';
          cmdCell.insertBefore(badge, cmdCell.firstChild);
        }

        // Style the action buttons in a clean horizontal group
        var btnWrap = actionCell.querySelector('div') || actionCell;
        btnWrap.classList.add('ark-proc-actions-group');

        var btns = btnWrap.querySelectorAll('button, input[type="submit"]');
        btns.forEach(function(btn) {
          var text = (btn.textContent || btn.value || '').trim();
          var lower = text.toLowerCase();
          btn.classList.add('ark-proc-btn');

          if (lower.indexOf('suspender') !== -1 || lower.indexOf('hangup') !== -1 || lower.indexOf('hup') !== -1 || lower.indexOf('recarregar') !== -1) {
            btn.classList.add('ark-btn-hup');
            btn.title = 'Recarregar configurações do serviço (SIGHUP) sem reiniciar nem descarregar da memória';
            btn.innerHTML = '<span class="ark-btn-icon">🔄</span> Recarregar';
          } else if (lower.indexOf('terminar') !== -1 || lower.indexOf('term') !== -1) {
            btn.classList.add('ark-btn-term');
            btn.title = 'Encerrar com segurança permitindo salvar dados (SIGTERM)';
            if (!btn.querySelector('.ark-btn-icon')) {
              btn.innerHTML = '<span class="ark-btn-icon">⚠️</span> ' + text;
            }
          } else if (lower.indexOf('matar') !== -1 || lower.indexOf('kill') !== -1) {
            btn.classList.add('ark-btn-kill');
            btn.title = 'Forçar finalização imediata pelo kernel (SIGKILL)';
            if (!btn.querySelector('.ark-btn-icon')) {
              btn.innerHTML = '<span class="ark-btn-icon">🛑</span> ' + text;
            }
          }
        });
      });

      // 3. Make Process table dynamically sortable
      this.makeProcessesTableSortable(view);
    },

    makeProcessesTableSortable: function(view) {
      var table = view.querySelector('.table, table.cbi-section-table');
      if (!table || table.getAttribute('data-ark-sortable') === 'true') return;
      table.setAttribute('data-ark-sortable', 'true');

      var headerRow = table.querySelector('.tr.table-titles, thead tr, tr.table-titles');
      if (!headerRow) return;

      var ths = headerRow.querySelectorAll('.th, th');
      if (ths.length < 5) return;

      var sortState = { col: -1, asc: true };
      var sortableCols = [0, 2, 3, 4]; // PID, COMANDO, CPU, MEMORIA

      sortableCols.forEach(function(colIdx) {
        var th = ths[colIdx];
        if (!th) return;

        th.classList.add('ark-sortable-th');
        th.title = 'Clique para alternar a ordenação por esta coluna';
        var icon = document.createElement('span');
        icon.className = 'ark-sort-icon';
        icon.textContent = ' ↕';
        th.appendChild(icon);

        th.addEventListener('click', function() {
          var isCurrent = (sortState.col === colIdx);
          var asc = isCurrent ? !sortState.asc : (colIdx === 3 || colIdx === 4 ? false : true);
          sortState = { col: colIdx, asc: asc };

          headerRow.querySelectorAll('.ark-sort-icon').forEach(function(ic) {
            ic.textContent = ' ↕';
            ic.classList.remove('active');
          });
          icon.textContent = asc ? ' ▲' : ' ▼';
          icon.classList.add('active');

          var tbody = table.querySelector('tbody') || table;
          var rows = Array.from(table.querySelectorAll('.tr:not(.table-titles):not(.placeholder), tbody > tr:not(.table-titles)'));

          rows.sort(function(rowA, rowB) {
            var cellsA = rowA.querySelectorAll('.td, td');
            var cellsB = rowB.querySelectorAll('.td, td');
            if (!cellsA[colIdx] || !cellsB[colIdx]) return 0;

            var valA = cellsA[colIdx].textContent.trim();
            var valB = cellsB[colIdx].textContent.trim();

            if (colIdx === 0 || colIdx === 3 || colIdx === 4) {
              var numA = parseFloat(valA.replace(/[^0-9.-]/g, '')) || 0;
              var numB = parseFloat(valB.replace(/[^0-9.-]/g, '')) || 0;
              return asc ? (numA - numB) : (numB - numA);
            } else {
              return asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
          });

          rows.forEach(function(r) {
            tbody.appendChild(r);
          });
        });
      });
    },

    transformStatusIptables: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view) return;

      var bar = document.getElementById('ark-iptables-bar');
      if (!bar) {
        var right = view.querySelector('div.right');
        var tabmenu = view.querySelector('.cbi-tabmenu');
        if (!right || !tabmenu) return;

        right.style.marginBottom = '0';
        right.style.float = 'none';

        bar = document.createElement('div');
        bar.id = 'ark-iptables-bar';
        bar.className = 'ark-iptables-top-bar';
        bar.style.display = 'flex';
        bar.style.flexWrap = 'wrap';
        bar.style.alignItems = 'center';
        bar.style.justifyContent = 'space-between';
        bar.style.gap = '12px';
        bar.style.margin = '14px 0';
        bar.style.padding = '12px 16px';
        bar.style.background = 'var(--ark-surface-2)';
        bar.style.borderRadius = 'var(--ark-radius)';
        bar.style.border = '1px solid var(--ark-border)';

        var link = document.createElement('a');
        link.href = '/cgi-bin/luci/admin/network/firewall';
        link.className = 'cbi-button cbi-button-apply';
        link.textContent = '⚙️ Editar Regras de Firewall (Rede -> Firewall)';
        link.style.textDecoration = 'none';
        link.style.display = 'inline-flex';
        link.style.alignItems = 'center';
        link.style.gap = '6px';
        bar.appendChild(link);

        // Search Filter in Top Bar
        var searchWrap = document.createElement('div');
        searchWrap.className = 'ark-iptables-filter-wrap';
        searchWrap.style.display = 'flex';
        searchWrap.style.alignItems = 'center';
        searchWrap.style.flex = '1';
        searchWrap.style.minWidth = '240px';
        searchWrap.style.maxWidth = '380px';
        searchWrap.innerHTML = '<div class="ark-table-search-bar" style="margin: 0; width: 100%;"><span class="ark-search-icon">🔍</span><input type="text" class="ark-search-input ark-iptables-search" placeholder="Filtrar regras (IP, porta, protocolo ou ação)..." /></div>';
        bar.appendChild(searchWrap);

        bar.appendChild(right);
        right.style.display = 'inline-flex';
        right.style.alignItems = 'center';
        right.style.gap = '8px';

        tabmenu.parentNode.insertBefore(bar, tabmenu);

        var searchInput = searchWrap.querySelector('.ark-iptables-search');
        searchInput.addEventListener('input', function() {
          var q = searchInput.value.toLowerCase().trim();
          var hideBtn = bar.querySelector('button[data-hide-empty]');
          var isHiddenMode = hideBtn && (hideBtn.getAttribute('data-hide-empty') === 'true');

          document.querySelectorAll('[data-chain]').forEach(function(cdiv) {
            var isInitiallyEmpty = (cdiv.getAttribute('data-empty') === 'true');
            if (isInitiallyEmpty && isHiddenMode) {
              cdiv.style.display = 'none';
              return;
            }
            var rows = cdiv.querySelectorAll('.tr:not(.table-titles)');
            if (rows.length === 0) return;
            var matches = 0;
            rows.forEach(function(r) {
              var t = r.textContent.toLowerCase();
              if (!q || t.indexOf(q) !== -1) {
                r.style.display = '';
                matches++;
              } else {
                r.style.display = 'none';
              }
            });
            if (q && matches === 0) {
              cdiv.style.display = 'none';
            } else if (!q && isInitiallyEmpty && isHiddenMode) {
              cdiv.style.display = 'none';
            } else {
              cdiv.style.display = '';
            }
          });
        });
      }

      // Hide empty chains by default and update toggle button
      var hideBtn = bar.querySelector('button[data-hide-empty]');
      if (hideBtn) {
        if (hideBtn.getAttribute('data-hide-empty') === 'false' && !hideBtn.getAttribute('data-ark-init')) {
          hideBtn.setAttribute('data-ark-init', 'true');
          hideBtn.click();
        }
        hideBtn.className = 'cbi-button cbi-button-neutral';
        hideBtn.style.display = 'inline-flex';
        hideBtn.style.alignItems = 'center';
        hideBtn.style.gap = '6px';
        var isHidden = (hideBtn.getAttribute('data-hide-empty') === 'true');
        hideBtn.innerHTML = isHidden ? '👁️ Mostrar Correntes Vazias' : '👁️ Ocultar Correntes Vazias';
      }

      // Style action buttons
      var btns = bar.querySelectorAll('button');
      btns.forEach(function(b) {
        var txt = b.textContent.trim().toLowerCase();
        if (txt.indexOf('reset') !== -1 || txt.indexOf('zerar') !== -1 || txt.indexOf('reinicie os contadores') !== -1) {
          b.className = 'cbi-button cbi-button-neutral';
          b.innerHTML = '🧹 Zerar Contadores';
        } else if (txt.indexOf('restart') !== -1 || txt.indexOf('reiniciar firewall') !== -1) {
          b.className = 'cbi-button cbi-button-action';
          b.innerHTML = '🔄 Reiniciar Firewall';
        }
      });

      // Chain Descriptions Dictionary
      var chainDescs = {
        'INPUT': '📥 <strong>Tráfego Destinado ao Roteador</strong> — Regras que controlam acessos diretos aos serviços locais do ARK OS (Painel Web LuCI na porta 80/443, SSH porta 22, DNS porta 53). Conexões externas da WAN são bloqueadas por segurança.',
        'FORWARD': '🔀 <strong>Tráfego de Passagem entre Redes</strong> — Escudo principal de proteção. Filtra dados trafegando entre a internet e seus dispositivos. A política padrão <code>DROP</code> impede invasões não autorizadas.',
        'OUTPUT': '📤 <strong>Tráfego Emitido pelo Roteador</strong> — Pacotes gerados pelo próprio ARK OS para a rede ou internet (sincronização de horário NTP, testes de rota e atualizações).',
        'zone_lan_input': '🏠 <strong>Entrada da Rede Local (LAN)</strong> — Conexões originadas pelos dispositivos da sua casa (cabo ou Wi-Fi) em direção ao roteador.',
        'zone_wan_input': '⚡ <strong>Entrada da Internet (WAN)</strong> — Tentativas de conexões diretas vindas de fora da internet para o roteador. Bloqueadas por padrão para proteção.',
        'zone_lan_forward': '🏠 ➔ 🌐 <strong>Navegação dos Clientes (LAN ➔ Internet)</strong> — Tráfego de navegação dos computadores e celulares locais saindo para a internet (permitidos).',
        'zone_wan_forward': '🌐 ➔ 🏠 <strong>Acesso Externo para Clientes (WAN ➔ LAN)</strong> — Bloqueado por padrão. Liberado apenas se você configurar Redirecionamento de Portas (Port Forward).',
        'syn_flood': '🛡️ <strong>Proteção Anti-DDoS / SYN Flood</strong> — Limita rajadas anômalas de abertura TCP para impedir que ataques saturem o processador do roteador.',
        'input_rule': '⚙️ <strong>Regras Personalizadas de Entrada</strong> — Regras manuais configuradas pelo administrador em <em>Rede ➔ Firewall</em>.',
        'forwarding_rule': '⚙️ <strong>Regras Personalizadas de Encaminhamento</strong> — Regras manuais de tráfego configuradas pelo administrador em <em>Rede ➔ Firewall</em>.',
        'output_rule': '⚙️ <strong>Regras Personalizadas de Saída</strong> — Regras manuais para pacotes gerados pelo próprio roteador configuradas em <em>Rede ➔ Firewall</em>.'
      };

      var colTooltips = [
        { title: 'PACOTES', tip: 'Total de pacotes processados por esta regra desde a última inicialização.' },
        { title: 'TRÁFEGO', tip: 'Volume acumulado de dados em Bytes, KB ou MB transferidos.' },
        { title: 'AÇÃO (ALVO)', tip: 'Ação executada pelo firewall: ACCEPT (Permitir), DROP (Bloquear/Descartar) ou desvio para sub-corrente de regras.' },
        { title: 'PROTOCOLO', tip: 'Tipo de protocolo: TCP, UDP, ICMP ou ALL (todos).' },
        { title: 'ENTRADA', tip: 'Interface de rede por onde o pacote entrou (ex: br-lan, eth0.2, lo).' },
        { title: 'SAÍDA', tip: 'Interface de rede por onde o pacote vai sair.' },
        { title: 'IP ORIGEM', tip: 'Endereço IP de quem enviou os dados (0.0.0.0/0 significa qualquer IP).' },
        { title: 'IP DESTINO', tip: 'Endereço IP de destino do pacote.' },
        { title: 'CONDIÇÃO / ESTADO', tip: 'Condições especiais (ex: RELATED,ESTABLISHED = conexões já autorizadas e ativas).' },
        { title: 'DESCRIÇÃO', tip: 'Comentário ou identificador descritivo da regra no sistema.' }
      ];

      // Format each chain
      document.querySelectorAll('[data-chain]').forEach(function(cdiv) {
        // Remove any misplaced search bar inside individual chain
        cdiv.querySelectorAll('.ark-table-search-bar').forEach(function(sb) { sb.remove(); });

        var chain = cdiv.getAttribute('data-chain');
        var h = cdiv.querySelector('h4, h3');
        if (!h) return;

        // Policy badge formatting
        var hHtml = h.innerHTML;
        if (hHtml.indexOf('ark-chip') === -1) {
          hHtml = hHtml.replace(/Política:\s*<em>ACCEPT<\/em>/i, 'Política: <span class="ark-chip online" style="font-size:10px;padding:2px 8px;">ACCEPT (Permitir)</span>');
          hHtml = hHtml.replace(/Política:\s*<em>DROP<\/em>/i, 'Política: <span class="ark-chip danger" style="font-size:10px;padding:2px 8px;">DROP (Bloquear)</span>');
          hHtml = hHtml.replace(/Política:\s*<em>REJECT<\/em>/i, 'Política: <span class="ark-chip warning" style="font-size:10px;padding:2px 8px;">REJECT (Rejeitar)</span>');
          h.innerHTML = hHtml;
        }

        // Clean up references small badge
        var refSmall = cdiv.querySelector('.references small');
        if (refSmall) {
          refSmall.classList.remove('ifacebadge');
        }

        // Descriptive subtitle banner
        if (chainDescs[chain] && !cdiv.querySelector('.ark-chain-desc')) {
          var desc = document.createElement('div');
          desc.className = 'ark-chain-desc';
          desc.innerHTML = chainDescs[chain];
          h.parentNode.insertBefore(desc, h.nextSibling);
        }

        // Action chips in rows
        cdiv.querySelectorAll('.target').forEach(function(tgt) {
          var txt = tgt.textContent.trim();
          if (txt === 'ACCEPT') {
            tgt.className = 'ark-chip online';
            tgt.style.fontSize = '11px';
            tgt.textContent = '✅ ACCEPT';
          } else if (txt === 'DROP') {
            tgt.className = 'ark-chip danger';
            tgt.style.fontSize = '11px';
            tgt.textContent = '🛑 DROP';
          } else if (txt === 'REJECT') {
            tgt.className = 'ark-chip warning';
            tgt.style.fontSize = '11px';
            tgt.textContent = '⚠️ REJECT';
          } else if (txt === 'syn_flood') {
            tgt.className = 'ark-chip primary';
            tgt.style.fontSize = '11px';
            tgt.textContent = '🛡️ syn_flood';
          }
        });

        // Format and clarify table header columns (eliminating duplicate "Destino")
        var ths = cdiv.querySelectorAll('.tr.table-titles .th, thead th');
        if (ths.length === 10) {
          for (var i = 0; i < 10; i++) {
            ths[i].textContent = colTooltips[i].title;
            ths[i].title = colTooltips[i].tip;
            ths[i].style.cursor = 'help';
            ths[i].style.letterSpacing = '0.03em';
          }
        }
      });
    },

    hideRedundantOverviewSections: function() {
      if (location.pathname.indexOf('/status/overview') === -1) return;
      var h3s = document.querySelectorAll('h3, legend');
      h3s.forEach(function(h) {
        var txt = h.textContent.trim().toLowerCase();
        if (txt === 'sistema' || txt.indexOf('mem') === 0 || (txt.indexOf('rede') === 0 && txt.indexOf('sem fio') === -1 && txt.indexOf('wireless') === -1)) {
          var sec = h.closest('.cbi-section') || h.parentElement;
          if (sec) sec.style.display = 'none';
        }
      });
    },

    transformStatusOverview: function() {
      var main = document.getElementById('maincontent') || document.getElementById('view');
      if (!main || document.getElementById('ark-overview-dashboard')) return;

      var tables = main.querySelectorAll('table, .table');
      if (tables.length === 0) return;

      var dataMap = {};
      var rows = main.querySelectorAll('tr, .tr');
      rows.forEach(function(r) {
        var th = r.querySelector('th, .th, td:first-child, .td:first-child');
        var td = r.querySelector('td:last-child, .td:last-child');
        if (th && td && th !== td) {
          var k = th.textContent.trim().toLowerCase();
          var v = td.textContent.trim();
          dataMap[k] = v;
        }
      });

      var model = dataMap['model'] || dataMap['modelo'] || 'ARK Router';
      var uptime = dataMap['uptime'] || dataMap['tempo de atividade'] || 'Ativo';
      var load = dataMap['load average'] || dataMap['carga média'] || '0.25, 0.20, 0.15';
      var fw = dataMap['firmware version'] || dataMap['versão do firmware'] || 'OpenWrt';
      var timeStr = dataMap['local time'] || dataMap['hora local'] || new Date().toLocaleTimeString();

      var load1 = parseFloat(load.split(',')[0]) || 0.3;
      var loadPct = Math.min(100, Math.round(load1 * 100));
      var loadColor = loadPct > 80 ? 'red' : (loadPct > 50 ? 'amber' : 'green');

      var dash = document.createElement('div');
      dash.id = 'ark-overview-dashboard';
      dash.innerHTML = '' +
        '<div class="ark-hero-banner">' +
          '<div class="ark-hero-left">' +
            '<div class="ark-hero-badge-icon">⚡</div>' +
            '<div class="ark-hero-details">' +
              '<h2 id="ark-dash-model">' + model + '</h2>' +
              '<div class="ark-hero-chips">' +
                '<span class="ark-chip online">🟢 Online</span>' +
                '<span class="ark-chip primary">🛡️ ARK Router OS</span>' +
                '<span class="ark-chip">⏱️ Uptime: ' + uptime + '</span>' +
                '<span class="ark-chip">🕒 ' + timeStr + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="ark-hero-right" style="display:flex;align-items:center;gap:8px;">' +
            '<a href="/cgi-bin/luci/admin/equipe-dashboard" class="cbi-button cbi-button-neutral" style="font-size:12px;padding:8px 14px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;background:rgba(59,130,246,0.15);color:#60a5fa;border:1px solid rgba(59,130,246,0.3);">' +
              '📊 Painel ARK' +
            '</a>' +
            '<a href="/cgi-bin/luci/admin/system/reboot" class="cbi-button cbi-button-action" style="font-size:12px;padding:8px 14px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">' +
              '🔄 Reiniciar' +
            '</a>' +
          '</div>' +
        '</div>' +
        '<div class="ark-metrics-grid" id="ark-metrics-grid">' +
          '<div class="ark-metric-tile">' +
            '<div class="ark-metric-head">' +
              '<span class="ark-metric-title">📈 Carga da CPU</span>' +
              '<span class="ark-metric-value" id="ark-dash-cpu-val">' + loadPct + '%</span>' +
            '</div>' +
            '<div class="ark-meter-bar-lg">' +
              '<div class="ark-meter-bar-fill ' + loadColor + '" id="ark-dash-cpu-bar" style="width:' + loadPct + '%;"></div>' +
            '</div>' +
            '<div class="ark-metric-subtext">' +
              '<span>Médias: ' + load + '</span>' +
              '<span id="ark-dash-cpu-desc">Processador</span>' +
            '</div>' +
          '</div>' +
          '<div class="ark-metric-tile">' +
            '<div class="ark-metric-head">' +
              '<span class="ark-metric-title">🧠 Memória RAM</span>' +
              '<span class="ark-metric-value" id="ark-dash-mem-val">Verificando…</span>' +
            '</div>' +
            '<div class="ark-meter-bar-lg">' +
              '<div class="ark-meter-bar-fill green" id="ark-dash-mem-bar" style="width:30%;"></div>' +
            '</div>' +
            '<div class="ark-metric-subtext">' +
              '<span id="ark-dash-mem-used">Memória RAM</span>' +
              '<span id="ark-dash-mem-status" style="color:#34d399;font-weight:600;">Estável</span>' +
            '</div>' +
          '</div>' +
          '<div class="ark-metric-tile">' +
            '<div class="ark-metric-head">' +
              '<span class="ark-metric-title">💾 Memória Flash (Overlay)</span>' +
              '<span class="ark-metric-value" id="ark-dash-flash-val">Verificando…</span>' +
            '</div>' +
            '<div class="ark-meter-bar-lg">' +
              '<div class="ark-meter-bar-fill blue" id="ark-dash-flash-bar" style="width:20%;"></div>' +
            '</div>' +
            '<div class="ark-metric-subtext">' +
              '<span id="ark-dash-flash-type">Memória Flash</span>' +
              '<span id="ark-dash-flash-pct" style="color:#60a5fa;font-weight:600;">Disponível</span>' +
            '</div>' +
          '</div>' +
        '</div>';

      var firstTarget = main.querySelector('.cbi-map, .cbi-section, h2') || main.firstChild;
      if (firstTarget && firstTarget.parentNode) {
        firstTarget.parentNode.insertBefore(dash, firstTarget);
      } else {
        main.insertBefore(dash, main.firstChild);
      }

      var callExec = (window.L && window.L.rpc) ? window.L.rpc.declare({
        object: 'file',
        method: 'exec',
        params: ['command', 'params']
      }) : null;

      if (callExec) {
        callExec('/usr/sbin/equipe-dashboard-control', ['system-hardware-info']).then(function(res) {
          try {
            var hw = JSON.parse(res.stdout || '{}');
            if (hw.model) {
              var elModel = document.getElementById('ark-dash-model');
              if (elModel) elModel.textContent = hw.model;
            }
            if (hw.cpu) {
              var cpu = hw.cpu;
              var usage = (cpu.usage_pct != null) ? cpu.usage_pct : loadPct;
              var cVal = document.getElementById('ark-dash-cpu-val');
              var cBar = document.getElementById('ark-dash-cpu-bar');
              var cDesc = document.getElementById('ark-dash-cpu-desc');
              if (cVal) cVal.textContent = usage + '%';
              if (cBar) cBar.style.width = Math.min(100, Math.max(2, usage)) + '%';
              if (cDesc) {
                var descStr = (cpu.freq_str ? cpu.freq_str + ' • ' : '') + (cpu.cores || 1) + 'c' + (cpu.arch_desc ? ' ' + cpu.arch_desc : '');
                cDesc.textContent = descStr;
              }
            }
            if (hw.memory) {
              var mem = hw.memory;
              var mVal = document.getElementById('ark-dash-mem-val');
              var mBar = document.getElementById('ark-dash-mem-bar');
              var mUsed = document.getElementById('ark-dash-mem-used');
              var mStatus = document.getElementById('ark-dash-mem-status');
              var usedMb = Math.max(0, (mem.total_mb || 0) - (mem.avail_mb || mem.free_mb || 0));
              var usedPct = mem.total_mb ? Math.round(usedMb * 100 / mem.total_mb) : 30;
              if (mVal) mVal.textContent = (mem.avail_mb || 0) + ' MB Livres';
              if (mBar) mBar.style.width = Math.min(100, usedPct) + '%';
              if (mUsed) mUsed.textContent = 'Usada: ~' + usedMb + ' MB / ' + (mem.total_mb || 0) + ' MB';
              if (mStatus) {
                var safeThreshold = (mem.total_mb > 256) ? 120 : 40;
                var isSafe = (mem.avail_mb || 0) >= safeThreshold;
                mStatus.textContent = isSafe ? ('Segura (> ' + safeThreshold + ' MB livre)') : 'Atenção: RAM baixa';
                mStatus.style.color = isSafe ? '#34d399' : '#f87171';
              }
            }
            if (hw.storage) {
              var st = hw.storage;
              var fVal = document.getElementById('ark-dash-flash-val');
              var fBar = document.getElementById('ark-dash-flash-bar');
              var fType = document.getElementById('ark-dash-flash-type');
              var fPct = document.getElementById('ark-dash-flash-pct');
              var fUsedPct = st.overlay_total_kb ? Math.round((st.overlay_total_kb - st.overlay_avail_kb) * 100 / st.overlay_total_kb) : 20;
              var fFreePct = st.overlay_total_kb ? Math.round(st.overlay_avail_kb * 100 / st.overlay_total_kb) : 80;
              if (fVal) fVal.textContent = (st.overlay_avail_mb || 0) + ' MB Livres';
              if (fBar) fBar.style.width = Math.min(100, fUsedPct) + '%';
              if (fType) fType.textContent = st.flash_type || 'Flash Interna';
              if (fPct) fPct.textContent = fFreePct + '% Disponível';
            }
            if (hw.thermal_sensors && hw.thermal_sensors.length > 0) {
              var grid = document.getElementById('ark-metrics-grid');
              if (grid && !document.getElementById('ark-dash-thermal-tile')) {
                var s0 = hw.thermal_sensors[0];
                var tTile = document.createElement('div');
                tTile.className = 'ark-metric-tile';
                tTile.id = 'ark-dash-thermal-tile';
                var tColor = s0.temp_c >= 80 ? 'red' : (s0.temp_c >= 65 ? 'amber' : 'green');
                tTile.innerHTML = '' +
                  '<div class="ark-metric-head">' +
                    '<span class="ark-metric-title">🌡️ Temperatura</span>' +
                    '<span class="ark-metric-value" style="color:' + (s0.temp_c >= 70 ? '#f59e0b' : '#34d399') + ';">' + s0.temp_c + ' °C</span>' +
                  '</div>' +
                  '<div class="ark-meter-bar-lg">' +
                    '<div class="ark-meter-bar-fill ' + tColor + '" style="width:' + Math.min(100, s0.temp_c) + '%;"></div>' +
                  '</div>' +
                  '<div class="ark-metric-subtext">' +
                    '<span>' + s0.name + '</span>' +
                    '<span style="color:#60a5fa;font-weight:600;">' + (hw.thermal_sensors.length > 1 ? (hw.thermal_sensors.length + ' sensores') : 'CPU') + '</span>' +
                  '</div>';
                grid.appendChild(tTile);
              }
            }
          } catch(e) {
            console.error('Error rendering dynamic hardware info in ark overview:', e);
          }
        });
      }

      // Hide redundant read-only tables already fully covered by the ARK Hero Banner
      var sections = main.querySelectorAll('.cbi-section');
      sections.forEach(function(sec) {
        var h = sec.querySelector('h3, legend');
        if (!h) return;
        var txt = h.textContent.trim().toLowerCase();
        if (txt === 'sistema' || txt.indexOf('memór') !== -1 || txt.indexOf('memor') !== -1 || txt === 'rede' || txt === 'memory' || txt === 'system' || txt === 'network') {
          sec.style.display = 'none';
        }
      });
    },

    transformSystemFlash: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view || document.getElementById('ark-flash-grid')) return;

      var backupTarget = document.getElementById('cbi-json-actions-dl_backup') || view.querySelector('form[action*="backup"]');
      var restoreTarget = document.getElementById('cbi-json-actions-restore') || view.querySelector('form[action*="restore"]');
      var flashTarget = document.getElementById('cbi-json-actions-sysupgrade') || view.querySelector('form[action*="upgrade"]');
      var resetTarget = document.getElementById('cbi-json-actions-reset') || view.querySelector('form[action*="reset"]');

      var backupBtn = view.querySelector('#cbi-json-actions-dl_backup button, button[name*="backup"]') || (backupTarget ? backupTarget.querySelector('button, input[type="submit"]') : null);
      var restoreBtn = view.querySelector('#cbi-json-actions-restore button, button[name*="restore"]') || (restoreTarget ? restoreTarget.querySelector('button, input[type="submit"]') : null);
      var flashBtn = view.querySelector('#cbi-json-actions-sysupgrade button, button[name*="image"]') || (flashTarget ? flashTarget.querySelector('button, input[type="submit"]') : null);
      var resetBtn = view.querySelector('#cbi-json-actions-reset button, button[name*="reset"]') || (resetTarget ? resetTarget.querySelector('button, input[type="submit"]') : null);

      if (!backupBtn && !restoreBtn && !flashBtn && !resetBtn) return;

      var grid = document.createElement('div');
      grid.id = 'ark-flash-grid';
      grid.className = 'ark-action-grid';

      var cardBackup = document.createElement('div');
      cardBackup.className = 'ark-action-card primary';
      cardBackup.innerHTML = '' +
        '<div class="ark-action-header">' +
          '<span class="ark-action-icon">💾</span>' +
          '<div>' +
            '<h3>Backup de Configurações</h3>' +
            '<span style="font-size:11px;color:#60a5fa;font-weight:600;">Cópia .tar.gz segura</span>' +
          '</div>' +
        '</div>' +
        '<p class="ark-action-desc">' +
          'Baixe um arquivo compactado contendo todos os ajustes de Wi-Fi, rede, senhas e serviços do roteador para restauração rápida.' +
        '</p>' +
        '<div class="ark-action-btn-wrap" id="ark-backup-slot"></div>';

      var cardRestore = document.createElement('div');
      cardRestore.className = 'ark-action-card success';
      cardRestore.innerHTML = '' +
        '<div class="ark-action-header">' +
          '<span class="ark-action-icon">📥</span>' +
          '<div>' +
            '<h3>Restaurar Backup</h3>' +
            '<span style="font-size:11px;color:#34d399;font-weight:600;">Subir arquivo .tar.gz</span>' +
          '</div>' +
        '</div>' +
        '<p class="ark-action-desc">' +
          'Envie uma cópia de segurança salva anteriormente para restabelecer imediatamente todos os parâmetros e regras do equipamento.' +
        '</p>' +
        '<div class="ark-action-btn-wrap" id="ark-restore-slot"></div>';

      var cardFlash = document.createElement('div');
      cardFlash.className = 'ark-action-card purple';
      cardFlash.innerHTML = '' +
        '<div class="ark-action-header">' +
          '<span class="ark-action-icon">🚀</span>' +
          '<div>' +
            '<h3>Atualização de Firmware</h3>' +
            '<span style="font-size:11px;color:#c084fc;font-weight:600;">Imagem OpenWrt Sysupgrade</span>' +
          '</div>' +
        '</div>' +
        '<p class="ark-action-desc">' +
          'Grave uma nova imagem de firmware (.bin). O sistema validará a assinatura e permitirá manter suas configurações atuais.' +
        '</p>' +
        '<div class="ark-action-btn-wrap" id="ark-flash-slot"></div>';

      var cardReset = document.createElement('div');
      cardReset.className = 'ark-action-card danger';
      cardReset.innerHTML = '' +
        '<div class="ark-action-header">' +
          '<span class="ark-action-icon">⚠️</span>' +
          '<div>' +
            '<h3>Padrões de Fábrica</h3>' +
            '<span style="font-size:11px;color:#f87171;font-weight:600;">Apagar todas as configurações</span>' +
          '</div>' +
        '</div>' +
        '<p class="ark-action-desc">' +
          '<strong style="color:#ef4444;">Ação irreversível!</strong> Apaga todas as redes, senhas e regras, retornando o roteador ao estado original de fábrica.' +
        '</p>' +
        '<div class="ark-action-btn-wrap" id="ark-reset-slot"></div>';

      grid.appendChild(cardBackup);
      grid.appendChild(cardRestore);
      grid.appendChild(cardFlash);
      grid.appendChild(cardReset);

      var insertTarget = view.querySelector('.cbi-section[data-tab="Actions"], .cbi-map, h2') || view.firstChild;
      if (insertTarget && insertTarget.parentNode) {
        insertTarget.parentNode.insertBefore(grid, insertTarget);
      } else {
        view.insertBefore(grid, view.firstChild);
      }

      if (backupBtn) {
        var elB = backupTarget && backupTarget.tagName === 'FORM' ? backupTarget : backupBtn.parentElement;
        cardBackup.querySelector('#ark-backup-slot').appendChild(elB);
      }
      if (restoreBtn) {
        var elR = restoreTarget && restoreTarget.tagName === 'FORM' ? restoreTarget : restoreBtn.parentElement;
        cardRestore.querySelector('#ark-restore-slot').appendChild(elR);
      }
      if (flashBtn) {
        var elF = flashTarget && flashTarget.tagName === 'FORM' ? flashTarget : flashBtn.parentElement;
        cardFlash.querySelector('#ark-flash-slot').appendChild(elF);
      }
      if (resetBtn) {
        var elS = resetTarget && resetTarget.tagName === 'FORM' ? resetTarget : resetBtn.parentElement;
        cardReset.querySelector('#ark-reset-slot').appendChild(elS);
      }

      // Tab titles enhancement
      var tabActions = view.querySelector('.cbi-tabmenu li:nth-child(1) a');
      var tabConfig = view.querySelector('.cbi-tabmenu li:nth-child(2) a');
      if (tabActions) tabActions.innerHTML = '💾 Partições MTD (U-Boot, ART)';
      if (tabConfig) tabConfig.innerHTML = '⚙️ Arquivos Preservados (sysupgrade.conf)';

      // Extract and style MTD partition backup into an advanced dedicated card
      var actionSec = view.querySelector('.cbi-section[data-tab="Ações"], .cbi-section[data-tab="actions"], .cbi-section[data-tab="Actions"]');
      var mtdSelect = view.querySelector('[data-name="mtdselect"] select, select[name="mtdselect"]');
      var mtdBtn = view.querySelector('#cbi-json-actions-mtddownload button, button[name*="mtddownload"]');

      if (actionSec && mtdSelect && mtdBtn && !document.getElementById('ark-mtd-card')) {
        actionSec.innerHTML = '';
        actionSec.style.background = 'transparent';
        actionSec.style.border = 'none';
        actionSec.style.padding = '0';
        actionSec.style.margin = '0';

        var card = document.createElement('div');
        card.id = 'ark-mtd-card';
        card.className = 'ark-action-card';
        card.style.background = 'var(--ark-surface-1, #111c35)';
        card.style.border = '1px solid var(--ark-border, #223455)';
        card.style.borderRadius = '10px';
        card.style.padding = '20px 24px';
        card.style.marginTop = '12px';

        card.innerHTML = '' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">' +
            '<div style="max-width:680px;">' +
              '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">' +
                '<span style="font-size:22px;">💾</span>' +
                '<h3 style="margin:0;font-size:16px;font-weight:700;color:#fff;">Cópia de Segurança de Partições de Baixo Nível (MTD)</h3>' +
                '<span style="background:rgba(234,179,8,0.15);color:#facc15;font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;border:1px solid rgba(234,179,8,0.3);">Recurso Avançado</span>' +
              '</div>' +
              '<p style="margin:0 0 10px 0;font-size:13px;color:var(--ark-text-muted, #94a3b8);line-height:1.5;">' +
                'Permite extrair a imagem binária (.bin) bruta diretamente do chip de memória Flash (16 MB) do roteador.' +
              '</p>' +
              '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;font-size:12px;background:rgba(0,0,0,0.25);padding:10px 14px;border-radius:8px;border-left:3px solid #3b82f6;">' +
                '<div><strong style="color:#60a5fa;">u-boot (mtd0):</strong> O bootloader ("BIOS") do aparelho. Essencial para recuperar roteadores inoperantes (unbrick).</div>' +
                '<div><strong style="color:#34d399;">art (mtd9):</strong> Atheros Radio Test. Calibração analógica de fábrica dos rádios Wi-Fi. Guarde como segurança!</div>' +
              '</div>' +
            '</div>' +
            '<div id="ark-mtd-slot" style="display:flex;flex-direction:column;gap:8px;min-width:220px;">' +
              '<label style="font-size:12px;font-weight:600;color:#cbd5e1;">Selecione a partição MTD:</label>' +
            '</div>' +
          '</div>';

        actionSec.appendChild(card);
        var slot = card.querySelector('#ark-mtd-slot');

        // Wrap select in container with data-name="mtdselect" so handleBlock querySelector succeeds
        var mtdWrap = document.createElement('div');
        mtdWrap.setAttribute('data-name', 'mtdselect');
        mtdSelect.style.width = '100%';
        mtdSelect.style.padding = '8px 12px';
        mtdSelect.style.borderRadius = '6px';
        mtdSelect.style.background = 'var(--ark-surface-2, #1e293b)';
        mtdSelect.style.color = '#fff';
        mtdSelect.style.border = '1px solid var(--ark-border, #334155)';
        mtdWrap.appendChild(mtdSelect);
        slot.appendChild(mtdWrap);

        mtdBtn.className = 'cbi-button cbi-button-action';
        mtdBtn.style.width = '100%';
        mtdBtn.style.padding = '8px 16px';
        mtdBtn.style.fontWeight = '600';
        mtdBtn.innerHTML = '⬇️ Baixar Partição (.bin)';
        slot.appendChild(mtdBtn);
      } else if (actionSec && !mtdSelect) {
        actionSec.style.display = 'none';
      }

      // Hide redundant raw sections outside the cards and tabs
      var duplicateSections = view.querySelectorAll('.cbi-section, fieldset');
      duplicateSections.forEach(function(sec) {
        if (sec.closest('#ark-flash-grid') || sec.id === 'ark-flash-grid' || sec === actionSec) return;
        var h = sec.querySelector('h2, h3, legend');
        if (!h) return;
        var txt = h.textContent.trim().toLowerCase();
        if (txt.indexOf('cópia de segurança') !== -1 || txt.indexOf('restauração') !== -1 ||
            txt.indexOf('gravar uma nova') !== -1 || txt.indexOf('salve o conteúdo') !== -1) {
          sec.style.display = 'none';
        }
      });

      var oldHeader = view.querySelector('h2');
      if (oldHeader && oldHeader.textContent.toLowerCase().indexOf('flash') !== -1) {
        oldHeader.style.display = 'none';
      }
    },

    transformSystemReboot: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view || document.getElementById('ark-reboot-card')) return;

      var rebootBtn = view.querySelector('button.cbi-button-action, button.cbi-button, input[type="submit"]');
      if (!rebootBtn) return;

      var card = document.createElement('div');
      card.id = 'ark-reboot-card';
      card.className = 'ark-action-card';
      card.style.maxWidth = '640px';
      card.style.margin = '20px auto';
      card.style.borderTop = '3px solid #3b82f6';
      card.innerHTML = '' +
        '<div class="ark-action-header">' +
          '<span class="ark-action-icon" style="background:rgba(59,130,246,0.15);color:#60a5fa;font-size:28px;width:52px;height:52px;">🔄</span>' +
          '<div>' +
            '<h3 style="font-size:18px;">Manutenção e Reinicialização</h3>' +
            '<span style="font-size:12px;color:#94a3b8;">Reiniciar o sistema operacional com segurança</span>' +
          '</div>' +
        '</div>' +
        '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;margin:14px 0;">' +
          '<div style="font-weight:700;margin-bottom:8px;font-size:13px;color:#f8fafc;">O que esperar durante a reinicialização:</div>' +
          '<ul style="margin:0;padding-left:18px;font-size:12px;color:#94a3b8;line-height:1.7;">' +
            '<li>⏱️ <strong>Tempo estimado</strong>: O roteador levará cerca de 60 a 75 segundos para restabelecer os serviços.</li>' +
            '<li>📶 <strong>Conexões</strong>: A internet Wi-Fi e os cabos de rede serão interrompidos temporariamente.</li>' +
            '<li>🛡️ <strong>Integridade</strong>: Nenhuma configuração gravada será perdida.</li>' +
          '</ul>' +
        '</div>' +
        '<div class="ark-action-btn-wrap" id="ark-reboot-btn-slot"></div>';

      var form = rebootBtn.closest('form');
      var target = view.querySelector('.cbi-map, h2') || view.firstChild;
      if (target && target.parentNode) {
        target.parentNode.insertBefore(card, target);
      } else {
        view.insertBefore(card, view.firstChild);
      }

      if (form && form !== card && !card.contains(form)) {
        card.querySelector('#ark-reboot-btn-slot').appendChild(form);
      } else if (!card.contains(rebootBtn)) {
        card.querySelector('#ark-reboot-btn-slot').appendChild(rebootBtn);
      }

      var oldHeaders = view.querySelectorAll('h2, p');
      oldHeaders.forEach(function(h) {
        if (!h.closest('#ark-reboot-card')) h.style.display = 'none';
      });
    },

    transformNetworkDiagnostics: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view || document.getElementById('ark-diag-grid-container')) return;

      var table = view.querySelector('.table');
      if (!table) return;

      var cells = table.querySelectorAll('.td.left');
      if (cells.length < 3) return;

      var grid = document.createElement('div');
      grid.id = 'ark-diag-grid-container';
      grid.className = 'ark-diag-grid';

      var pingCard = document.createElement('div');
      pingCard.className = 'ark-diag-card';
      pingCard.innerHTML = '' +
        '<div class="ark-diag-card-title"><span>📡</span> Teste de Ping (Latência)</div>' +
        '<div class="ark-diag-card-desc">Verifica conectividade e tempo de resposta em milissegundos.</div>' +
        '<div class="ark-preset-pills">' +
          '<button type="button" class="ark-preset-btn" data-host="8.8.8.8">🌐 Google DNS</button>' +
          '<button type="button" class="ark-preset-btn" data-host="1.1.1.1">⚡ Cloudflare</button>' +
          '<button type="button" class="ark-preset-btn" data-host="openwrt.org">🐧 OpenWrt</button>' +
          '<button type="button" class="ark-preset-btn" data-host="registro.br">🇧🇷 Registro.br</button>' +
        '</div>' +
        '<div id="ark-ping-slot"></div>';

      var traceCard = document.createElement('div');
      traceCard.className = 'ark-diag-card';
      traceCard.innerHTML = '' +
        '<div class="ark-diag-card-title"><span>🗺️</span> Traceroute (Rotas)</div>' +
        '<div class="ark-diag-card-desc">Mapeia cada salto e roteador intermediário até o servidor de destino.</div>' +
        '<div id="ark-trace-slot" style="margin-top:auto;"></div>';

      var nsCard = document.createElement('div');
      nsCard.className = 'ark-diag-card';
      nsCard.innerHTML = '' +
        '<div class="ark-diag-card-title"><span>🔍</span> Consulta DNS (Nslookup)</div>' +
        '<div class="ark-diag-card-desc">Resolve nomes de domínio em endereços IP para detectar falhas no provedor.</div>' +
        '<div id="ark-ns-slot" style="margin-top:auto;"></div>';

      grid.appendChild(pingCard);
      grid.appendChild(traceCard);
      grid.appendChild(nsCard);

      table.parentNode.insertBefore(grid, table);

      pingCard.querySelector('#ark-ping-slot').appendChild(cells[0]);
      traceCard.querySelector('#ark-trace-slot').appendChild(cells[1]);
      nsCard.querySelector('#ark-ns-slot').appendChild(cells[2]);
      table.style.display = 'none';

      var pingInput = pingCard.querySelector('input[type="text"]');
      pingCard.querySelectorAll('.ark-preset-btn').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          if (pingInput) {
            pingInput.value = this.getAttribute('data-host');
            pingInput.focus();
          }
        });
      });
    },

    transformNetworkWireless: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view) return;

      var wifiSec = document.getElementById('cbi-wireless-wifi-device');
      if (!wifiSec) return;

      var table = wifiSec.querySelector('.table.cbi-section-table, table.cbi-section-table');
      if (!table) return;

      var dash = document.getElementById('ark-wireless-dashboard');
      if (!dash) {
        dash = document.createElement('div');
        dash.id = 'ark-wireless-dashboard';
        dash.innerHTML = '' +
          '<div class="ark-wireless-grid">' +
            '<div class="ark-radio-card radio-5g" id="ark-radio-5g-card">' +
              '<div class="ark-radio-header">' +
                '<div class="ark-radio-title-wrap">' +
                  '<h3><span>⚡</span> Rádio 5 GHz (Ultra Velocidade)</h3>' +
                  '<div class="ark-radio-meta" id="ark-r5g-meta">Identificando hardware...</div>' +
                  '<div class="ark-radio-badges" id="ark-r5g-badges">' +
                    '<span class="ark-chip primary" id="ark-r5g-chan-chip">Canal --</span>' +
                    '<span class="ark-chip info" id="ark-r5g-bitrate-chip" style="display:none;"></span>' +
                    '<span class="ark-chip online" id="ark-r5g-status-chip">🟢 Rádio Ativo</span>' +
                  '</div>' +
                '</div>' +
                '<div class="ark-radio-actions" id="ark-r5g-actions"></div>' +
              '</div>' +
              '<div style="font-size:12px;font-weight:700;color:#94a3b8;margin-top:8px;">Redes Wi-Fi Transmitidas (5 GHz):</div>' +
              '<div class="ark-ssid-list" id="ark-r5g-ssids"></div>' +
            '</div>' +
            '<div class="ark-radio-card radio-2g" id="ark-radio-2g-card">' +
              '<div class="ark-radio-header">' +
                '<div class="ark-radio-title-wrap">' +
                  '<h3><span>📡</span> Rádio 2.4 GHz (Longo Alcance)</h3>' +
                  '<div class="ark-radio-meta" id="ark-r2g-meta">Identificando hardware...</div>' +
                  '<div class="ark-radio-badges" id="ark-r2g-badges">' +
                    '<span class="ark-chip primary" id="ark-r2g-chan-chip">Canal --</span>' +
                    '<span class="ark-chip info" id="ark-r2g-bitrate-chip" style="display:none;"></span>' +
                    '<span class="ark-chip online" id="ark-r2g-status-chip">🟢 Rádio Ativo</span>' +
                  '</div>' +
                '</div>' +
                '<div class="ark-radio-actions" id="ark-r2g-actions"></div>' +
              '</div>' +
              '<div style="font-size:12px;font-weight:700;color:#94a3b8;margin-top:8px;">Redes Wi-Fi Transmitidas (2.4 GHz):</div>' +
              '<div class="ark-ssid-list" id="ark-r2g-ssids"></div>' +
            '</div>' +
          '</div>';

        table.parentNode.insertBefore(dash, table);
      }

      var rows = table.querySelectorAll('.tr.cbi-section-table-row, tr.cbi-section-table-row');
      var currentRadio = null;

      var r5gSsids = document.getElementById('ark-r5g-ssids');
      var r2gSsids = document.getElementById('ark-r2g-ssids');
      if (r5gSsids) r5gSsids.innerHTML = '';
      if (r2gSsids) r2gSsids.innerHTML = '';

      rows.forEach(function(r) {
        var sid = r.getAttribute('data-sid') || '';
        var isRadio = (sid === 'radio0' || sid === 'radio1' || (sid.indexOf('radio') === 0 && sid.indexOf('_') === -1));

        if (isRadio) {
          var rowText = (r.textContent || '');
          var rowLower = rowText.toLowerCase();

          // Detecção precisa da banda (802.11ax existe em 2.4G e 5G simultaneamente no Wi-Fi 6)
          var is2g = false;
          var is5g = false;

          if (rowLower.indexOf('2.4') !== -1 || /channel:\s*([1-9]|1[0-4])\b/i.test(rowLower) || rowLower.indexOf('b/g/n') !== -1) {
            is2g = true;
          } else if (rowLower.indexOf('5.') !== -1 || rowLower.indexOf('5ghz') !== -1 || rowLower.indexOf('5 ghz') !== -1 || /channel:\s*(3[6-9]|[4-9][0-9]|1[0-9]{2})\b/i.test(rowLower) || rowLower.indexOf('ac/ax/n') !== -1 || rowLower.indexOf('ac/an') !== -1) {
            is5g = true;
          } else {
            is2g = (sid === 'radio0');
            is5g = (sid === 'radio1');
          }

          currentRadio = is5g ? '5g' : '2g';

          // Mapeamento dinâmico de hardware e velocidade teórica
          var metaEl = document.getElementById('ark-r' + currentRadio + '-meta');
          if (metaEl) {
            if (rowText.indexOf('MT7986') !== -1 || rowText.indexOf('mt7986') !== -1) {
              if (currentRadio === '5g') {
                metaEl.textContent = 'MediaTek MT7986 (Filogic 830) • Wi-Fi 6 (802.11ax/ac/n) • Até 2402 Mbps';
              } else {
                metaEl.textContent = 'MediaTek MT7986 (Filogic 830) • Wi-Fi 6 (802.11ax/b/g/n) • Até 574 Mbps';
              }
            } else if (rowText.indexOf('QCA9880') !== -1) {
              metaEl.textContent = 'Qualcomm Atheros QCA9880 • 802.11ac/an • Até 1300 Mbps';
            } else if (rowText.indexOf('QCA9558') !== -1) {
              metaEl.textContent = 'Qualcomm Atheros QCA9558 • 802.11bgn • Até 450 Mbps';
            } else {
              var mDev = rowText.match(/(MediaTek\s+[A-Za-z0-9]+|Qualcomm\s+[A-Za-z0-9]+|[A-Za-z0-9_-]+\s+802\.11[a-z/]+)/i);
              metaEl.textContent = (mDev ? mDev[1] : sid) + ' • Wi-Fi ' + (currentRadio === '5g' ? '5 GHz' : '2.4 GHz');
            }
          }

          // Badges dinâmicos de Canal, Frequência, Bitrate e Status
          var chanMatch = rowText.match(/Channel:\s*([0-9]+)(?:\s*\(([^)]+)\))?/i);
          var bitMatch = rowText.match(/Bitrate:\s*([0-9.]+\s*[M|G]bit\/s)/i);

          var chanBadge = document.getElementById('ark-r' + currentRadio + '-chan-chip');
          if (chanBadge && chanMatch) {
            var ch = chanMatch[1];
            var f = chanMatch[2] ? ' (' + chanMatch[2] + ')' : '';
            chanBadge.textContent = 'Canal ' + ch + f;
          }

          var bitBadge = document.getElementById('ark-r' + currentRadio + '-bitrate-chip');
          if (bitBadge) {
            if (bitMatch) {
              bitBadge.style.display = 'inline-flex';
              bitBadge.textContent = '⚡ ' + bitMatch[1];
            } else {
              bitBadge.style.display = 'none';
            }
          }

          var statusBadge = document.getElementById('ark-r' + currentRadio + '-status-chip');
          if (statusBadge) {
            var isOff = (rowLower.indexOf('disabled') !== -1 || rowLower.indexOf('desativado') !== -1 || (chanMatch && chanMatch[1] === '0'));
            if (isOff) {
              statusBadge.className = 'ark-chip offline';
              statusBadge.textContent = '🔴 Rádio Desativado';
            } else {
              statusBadge.className = 'ark-chip online';
              statusBadge.textContent = '🟢 Rádio Ativo';
            }
          }

          // Botões de ação do rádio
          var actions = r.querySelector('.cbi-section-actions');
          var targetSlot = document.getElementById('ark-r' + currentRadio + '-actions');
          if (actions && targetSlot && targetSlot.children.length === 0) {
            var btns = actions.querySelectorAll('button');
            btns.forEach(function(b) {
              var clone = b.cloneNode(true);
              clone.addEventListener('click', function(e) { e.preventDefault(); b.click(); });
              targetSlot.appendChild(clone);
            });
          }
        } else if (currentRadio) {
          var statDiv = r.querySelector('[data-name="_stat"]') || r;
          var ssidText = 'Wi-Fi';
          var statTxt = statDiv.textContent || '';
          var mSsid = statTxt.match(/SSID:\s*([^\s|]+)/i);
          if (mSsid) ssidText = mSsid[1];

          var mMode = statTxt.match(/Mode:\s*(Master|Client|Mesh|Ad-Hoc|AP|[A-Za-z]+)/i);
          var modeText = mMode ? mMode[1].replace(/BSSID.*/i, '').trim() : 'Ponto de Acesso';
          if (modeText.toLowerCase() === 'master') modeText = 'Ponto de Acesso (Master)';

          var mEnc = statTxt.match(/Encryption:\s*([^|\n\r]+?)(?:\s*(?:Desativar|Editar|Remover)|$)/i);
          var encText = mEnc ? mEnc[1].replace(/BSSID:[^|]+\|?/i, '').trim() : 'WPA2/WPA3 PSK';

          var mSig = statTxt.match(/(-?[0-9]+(?:\/-?[0-9]+)?\s*dBm)/i);
          var sigText = mSig ? (' • Sinal: ' + mSig[1]) : '';

          var actionsCell = r.querySelector('.cbi-section-actions');

          var ssidCard = document.createElement('div');
          ssidCard.className = 'ark-ssid-card';
          ssidCard.innerHTML = '' +
            '<div class="ark-ssid-info">' +
              '<div class="ark-ssid-icon">📶</div>' +
              '<div class="ark-ssid-details">' +
                '<strong>' + ssidText + '</strong>' +
                '<span>Modo ' + modeText + ' • ' + encText + sigText + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="ark-ssid-actions"></div>';

          var actWrap = ssidCard.querySelector('.ark-ssid-actions');
          if (actionsCell) {
            var sbtns = actionsCell.querySelectorAll('button');
            sbtns.forEach(function(sb) {
              var sclone = sb.cloneNode(true);
              sclone.addEventListener('click', function(e) { e.preventDefault(); sb.click(); });
              actWrap.appendChild(sclone);
            });
          }

          var ssidList = document.getElementById('ark-r' + currentRadio + '-ssids');
          if (ssidList) ssidList.appendChild(ssidCard);
        }
      });

      var mode = localStorage.getItem('ark_interface_mode') || 'basic';
      if (mode !== 'advanced') {
        table.style.setProperty('display', 'none', 'important');
      }
      var oldSearch = wifiSec.querySelector('.ark-table-search-bar');
      if (oldSearch && mode !== 'advanced') oldSearch.style.display = 'none';
    },

    transformNetworkInterfaces: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view || document.getElementById('ark-iface-grid')) return;

      var ifaceSec = document.getElementById('cbi-network-interface');
      if (!ifaceSec) return;

      var table = ifaceSec.querySelector('.table.cbi-section-table');
      if (!table) return;

      var grid = document.createElement('div');
      grid.id = 'ark-iface-grid';
      grid.className = 'ark-iface-grid';

      var rows = table.querySelectorAll('.tr.cbi-section-table-row, tr.cbi-section-table-row');
      rows.forEach(function(r) {
        var sid = r.getAttribute('data-sid') || '';
        var name = sid.toUpperCase();
        var icon = (sid.indexOf('wan') !== -1) ? '⚡' : '🏠';
        var cardClass = (sid.indexOf('wan6') !== -1) ? 'wan6' : ((sid.indexOf('wan') !== -1) ? 'wan' : 'lan');

        var desc = r.querySelector('[id$="-ifc-description"]');
        var descHTML = desc ? desc.innerHTML : '';

        // Extract metadata cleanly via HTML tags
        var protoMatch = descHTML.match(/<strong>Protocolo:\s*<\/strong>\s*([^<]+)/i);
        var proto = protoMatch ? protoMatch[1].trim() : (sid.indexOf('wan') !== -1 ? 'Cliente DHCP' : 'Endereço Estático');

        var ipMatch = descHTML.match(/<strong>IPv4:\s*<\/strong>\s*([^<]+)/i);
        var ip = ipMatch ? ipMatch[1].trim() : 'Automático / DHCP';

        var macMatch = descHTML.match(/<strong>MAC:\s*<\/strong>\s*([0-9a-f:]{17})/i);
        var mac = macMatch ? macMatch[1].toUpperCase() : '';

        var devBox = r.querySelector('.ifacebox-body small');
        var device = devBox ? devBox.textContent.trim() : (sid === 'lan' ? 'br-lan' : 'eth0.2');

        var rxMatch = descHTML.match(/<strong>RX:\s*<\/strong>\s*([^<]+)/i);
        var txMatch = descHTML.match(/<strong>TX:\s*<\/strong>\s*([^<]+)/i);
        var rx = rxMatch ? rxMatch[1].trim().replace(/\([^\)]+\)/, '').trim() : '0 B';
        var tx = txMatch ? txMatch[1].trim().replace(/\([^\)]+\)/, '').trim() : '0 B';

        var upMatch = descHTML.match(/<strong>(?:Tempo de atividade|Uptime):\s*<\/strong>\s*([^<]+)/i);
        var uptime = upMatch ? upMatch[1].trim() : 'Ativo';

        // Extract member devices cleanly from tooltip containers
        var ifaceBody = r.querySelector('.ifacebox-body');
        var memberBadgesHTML = '';
        if (ifaceBody) {
          var ttList = ifaceBody.querySelectorAll('.cbi-tooltip-container');
          ttList.forEach(function(tt) {
            var th = tt.innerHTML;
            var tm = th.match(/<strong>Tipo:\s*<\/strong>\s*([^<]+)/i);
            var dm = th.match(/<strong>Dispositivo:\s*<\/strong>\s*([^<]+)/i);
            var cm = th.match(/<strong>Conectado:\s*<\/strong>\s*([^<]+)/i);
            var mm = th.match(/<strong>MAC:\s*<\/strong>\s*([0-9a-f:]{17})/i);

            var devName = dm ? dm[1].trim() : '';
            var devType = tm ? tm[1].trim() : '';
            var isConnected = cm ? (cm[1].trim().toLowerCase() === 'sim') : false;
            var subMac = mm ? mm[1].trim() : '';

            if (devName) {
              var devIcon = '🔌';
              var friendlyName = devName;
              if (devName.indexOf('radio0') !== -1) {
                devIcon = '📶';
                friendlyName = 'Wi-Fi 2.4 GHz';
              } else if (devName.indexOf('radio1') !== -1) {
                devIcon = '📶';
                friendlyName = 'Wi-Fi 5 GHz';
              } else if (devName.indexOf('eth0.1') !== -1) {
                devIcon = '🔌';
                friendlyName = 'Portas LAN (Cabo)';
              } else if (devName.indexOf('eth0.2') !== -1) {
                devIcon = '🌐';
                friendlyName = 'Porta WAN (Internet)';
              } else if (devType.toLowerCase().indexOf('ponte') !== -1) {
                devIcon = '🌉';
                friendlyName = 'Ponte de Rede (' + devName + ')';
              }

              var dotClass = isConnected ? 'online' : 'offline';
              var dotText = isConnected ? '● Conectado' : '○ Standby';
              var badgeActive = isConnected ? 'active' : '';

              memberBadgesHTML += '' +
                '<span class="ark-member-badge ' + badgeActive + '" title="' + devName + ' (' + devType + ')' + (subMac ? ' - MAC: ' + subMac : '') + '">' +
                  '<span class="icon">' + devIcon + '</span>' +
                  '<span class="name"><strong>' + friendlyName + '</strong></span>' +
                  '<span class="dot ' + dotClass + '">' + dotText + '</span>' +
                '</span>';
            }
          });
        }

        // If no subdevices extracted, provide default chip
        if (!memberBadgesHTML) {
          var defIcon = (sid.indexOf('wan') !== -1) ? '🌐' : '🔌';
          var defLabel = (sid.indexOf('wan') !== -1) ? 'Porta WAN Física (eth0.2)' : 'Porta LAN Física (eth0.1)';
          memberBadgesHTML = '' +
            '<span class="ark-member-badge active">' +
              '<span class="icon">' + defIcon + '</span>' +
              '<span class="name"><strong>' + defLabel + '</strong></span>' +
              '<span class="dot online">● Conectado</span>' +
            '</span>';
        }

        var card = document.createElement('div');
        card.className = 'ark-iface-card ' + cardClass;
        card.innerHTML = '' +
          '<div class="ark-iface-head">' +
            '<div class="ark-iface-name"><span>' + icon + '</span> ' + name + '</div>' +
            '<div class="ark-iface-chips">' +
              '<span class="ark-chip online" style="font-size:11px;">🟢 ' + uptime + '</span>' +
              '<span class="ark-chip proto">🏷️ ' + proto + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="ark-iface-stats">' +
            '<div class="ark-iface-stat-tile">' +
              '<span class="label">Endereço IPv4:</span>' +
              '<span class="val" style="color:#60a5fa;font-size:14px;">' + ip + '</span>' +
            '</div>' +
            '<div class="ark-iface-stat-tile">' +
              '<span class="label">Dispositivo Principal / MAC:</span>' +
              '<span class="val">' + device + (mac ? ' <span style="font-size:10px;color:var(--ark-text-dim);">(' + mac + ')</span>' : '') + '</span>' +
            '</div>' +
            '<div class="ark-iface-stat-tile">' +
              '<span class="label">Download Total (RX):</span>' +
              '<span class="val" style="color:#34d399;">⬇️ ' + rx + '</span>' +
            '</div>' +
            '<div class="ark-iface-stat-tile">' +
              '<span class="label">Upload Total (TX):</span>' +
              '<span class="val" style="color:#a78bfa;">⬆️ ' + tx + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="ark-iface-members">' +
            '<div class="ark-iface-members-title">Portas e Dispositivos Físicos Vinculados:</div>' +
            '<div class="ark-iface-member-list">' + memberBadgesHTML + '</div>' +
          '</div>' +
          '<div class="ark-iface-actions"></div>';

        var actWrap = card.querySelector('.ark-iface-actions');
        var actions = r.querySelector('.cbi-section-actions');
        if (actions) {
          var btns = actions.querySelectorAll('button');
          var editBtn = null;
          var otherBtns = [];

          btns.forEach(function(b) {
            var bText = (b.textContent || '').trim().toLowerCase();
            if (bText.indexOf('edit') !== -1 || bText.indexOf('editar') !== -1 || b.classList.contains('cbi-button-edit')) {
              editBtn = b;
            } else {
              otherBtns.push(b);
            }
          });

          // 1. Edit button first (styled with cbi-button-apply, triggers native LuCI modal editor)
          if (editBtn) {
            var cloneEdit = document.createElement('button');
            cloneEdit.type = 'button';
            cloneEdit.className = 'cbi-button cbi-button-apply';
            cloneEdit.innerHTML = '✏️ Editar';
            cloneEdit.title = 'Configurar interface ' + name;
            cloneEdit.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              editBtn.click();
            });
            actWrap.appendChild(cloneEdit);
          }

          // 2. Other action buttons (Reinicie, Parar, Apagar)
          otherBtns.forEach(function(b) {
            var clone = b.cloneNode(true);
            var bText = (b.textContent || '').trim().toLowerCase();
            if (bText.indexOf('reinicie') !== -1 || bText.indexOf('restart') !== -1) {
              clone.innerHTML = '🔄 Reiniciar';
            } else if (bText.indexOf('parar') !== -1 || bText.indexOf('stop') !== -1) {
              clone.innerHTML = '⏹️ Parar';
            } else if (bText.indexOf('apagar') !== -1 || bText.indexOf('delete') !== -1) {
              clone.innerHTML = '🗑️ Apagar';
            }
            clone.addEventListener('click', function(e) {
              e.preventDefault();
              b.click();
            });
            actWrap.appendChild(clone);
          });
        }

        grid.appendChild(card);
      });

      table.parentNode.insertBefore(grid, table);
      table.style.setProperty('display', 'none', 'important');
      table.classList.add('ark-hidden-table');

      if (table.parentElement) {
        var oldHeader = table.parentElement.querySelector('h3, legend');
        if (oldHeader && oldHeader.textContent.toLowerCase().indexOf('interface') !== -1) {
          oldHeader.style.display = 'none';
        }
      }
    },

    transformSystemAdmin: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view || document.getElementById('ark-admin-card')) return;

      var pwSection = document.getElementById('cbi-json-password');
      if (!pwSection) return;

      var pw1 = document.getElementById('cbi-json-password-pw1');
      var pw2 = document.getElementById('cbi-json-password-pw2');
      if (!pw1 || !pw2) return;

      var card = document.createElement('div');
      card.id = 'ark-admin-card';
      card.className = 'ark-admin-card';
      card.innerHTML = '' +
        '<div class="ark-admin-card-head">' +
          '<div class="icon">🔐</div>' +
          '<div>' +
            '<h3>Credenciais de Acesso do Administrador (Root)</h3>' +
            '<p>Altere a senha de acesso da conta "root". Esta mesma senha é exigida para o painel Web e para conexão SSH segura.</p>' +
          '</div>' +
        '</div>' +
        '<div class="ark-grid-2" id="ark-pw-grid-slot"></div>';

      pwSection.parentNode.insertBefore(card, pwSection);

      var slot = card.querySelector('#ark-pw-grid-slot');
      slot.appendChild(pw1);
      slot.appendChild(pw2);

      var oldMapDescr = view.querySelector('.cbi-map-descr');
      if (oldMapDescr) oldMapDescr.style.display = 'none';
    },

    transformSystemLeds: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view || document.getElementById('ark-led-control-center')) return;

      var table = view.querySelector('.table, table.cbi-section-table');
      if (!table) return;

      var container = document.createElement('div');
      container.id = 'ark-led-control-center';
      container.innerHTML = '' +
        '<div class="ark-presets-box">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:24px;">💡</span>' +
            '<div>' +
              '<h3 style="margin:0;font-size:16px;color:#fff;">Perfis Rápidos de Iluminação (1 Clique)</h3>' +
              '<p style="margin:2px 0 0;font-size:12px;color:var(--ark-text-muted);">Configure os LEDs do painel frontal instantaneamente para diferentes momentos e necessidades.</p>' +
            '</div>' +
          '</div>' +
          '<div class="ark-preset-cards">' +
            '<button type="button" class="ark-preset-tile" data-led-preset="smart">' +
              '<div class="ark-preset-tile-title">🟢 Internet Conectada (Verde Fixo)</div>' +
              '<div class="ark-preset-tile-desc">LED frontal verde contínuo e estável quando conectado; sem piscar com tráfego de pacotes ou Wi-Fi.</div>' +
            '</button>' +
            '<button type="button" class="ark-preset-tile" data-led-preset="night">' +
              '<div class="ark-preset-tile-title">🌙 Modo Noturno (Tudo Desligado)</div>' +
              '<div class="ark-preset-tile-desc">Desliga todos os LEDs frontais para quartos e ambientes de descanso. Roteador 100% escuro sem claridade.</div>' +
            '</button>' +
            '<button type="button" class="ark-preset-tile" data-led-preset="default">' +
              '<div class="ark-preset-tile-title">↺ Restaurar Padrão de Fábrica</div>' +
              '<div class="ark-preset-tile-desc">Restaura a iluminação original e gatilhos padrão de fábrica do seu roteador com 1 clique.</div>' +
            '</button>' +
          '</div>' +

          '<!-- Seção de Personalização Visual de Cor RGB -->' +
          '<div id="ark-rgb-picker-section" class="ark-rgb-box" style="display:none;">' +
            '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span style="font-size:22px;">🎨</span>' +
                '<div>' +
                  '<h4 style="margin:0;font-size:14px;color:#fff;">Personalizar Cor do LED RGB Frontal</h4>' +
                  '<p style="margin:2px 0 0;font-size:12px;color:var(--ark-text-muted);">Escolha a cor antes de aplicar: utilize a paleta visual, selecione um tom rápido ou digite o código HEX / RGB:</p>' +
                '</div>' +
              '</div>' +
              '<div id="ark-rgb-preview-badge" style="display:flex;align-items:center;gap:8px;padding:5px 12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:20px;">' +
                '<span id="ark-rgb-preview-dot" style="width:14px;height:14px;border-radius:50%;background:#00FF00;box-shadow:0 0 10px #00FF00;display:inline-block;transition:all 0.2s ease;"></span>' +
                '<span id="ark-rgb-preview-text" style="font-size:12px;font-weight:700;font-family:monospace;color:#fff;">#00FF00</span>' +
              '</div>' +
            '</div>' +

            '<div style="display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap;">' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
                '<input type="color" id="ark-rgb-color-native" value="#00ff00" style="width:40px;height:36px;padding:2px;border:1px solid rgba(255,255,255,0.25);border-radius:8px;background:transparent;cursor:pointer;" title="Clique para abrir a paleta de cores completa">' +
                '<input type="text" id="ark-rgb-hex-manual" value="#00FF00" maxlength="20" style="width:120px;height:36px;padding:0 10px;border:1px solid rgba(255,255,255,0.25);border-radius:8px;background:rgba(0,0,0,0.3);color:#fff;font-family:monospace;font-weight:700;font-size:13px;text-transform:uppercase;" placeholder="#00FF00">' +
              '</div>' +
              '<button type="button" id="ark-rgb-apply-btn" class="cbi-button cbi-button-apply" style="height:36px;display:flex;align-items:center;gap:6px;font-weight:600;font-size:12px;padding:0 16px;">' +
                '<span>✨</span> Aplicar Cor no LED' +
              '</button>' +
            '</div>' +

            '<div style="display:flex;align-items:center;gap:6px;margin-top:12px;flex-wrap:wrap;">' +
              '<span style="font-size:11px;color:var(--ark-text-muted);margin-right:4px;">Cores rápidas:</span>' +
              '<button type="button" class="ark-color-swatch-btn" data-color="#00FF00" style="background:#00FF00;color:#000;" title="Verde Esmeralda">Verde</button>' +
              '<button type="button" class="ark-color-swatch-btn" data-color="#00E5FF" style="background:#00E5FF;color:#000;" title="Azul Ciano / Predador">Ciano</button>' +
              '<button type="button" class="ark-color-swatch-btn" data-color="#3B82F6" style="background:#3B82F6;color:#fff;" title="Azul Royal">Azul</button>' +
              '<button type="button" class="ark-color-swatch-btn" data-color="#8B5CF6" style="background:#8B5CF6;color:#fff;" title="Roxo Cyberpunk">Roxo</button>' +
              '<button type="button" class="ark-color-swatch-btn" data-color="#EC4899" style="background:#EC4899;color:#fff;" title="Rosa / Magenta">Rosa</button>' +
              '<button type="button" class="ark-color-swatch-btn" data-color="#F59E0B" style="background:#F59E0B;color:#000;" title="Âmbar / Laranja">Âmbar</button>' +
              '<button type="button" class="ark-color-swatch-btn" data-color="#EF4444" style="background:#EF4444;color:#fff;" title="Vermelho Gamer">Vermelho</button>' +
              '<button type="button" class="ark-color-swatch-btn" data-color="#FFFFFF" style="background:#FFFFFF;color:#000;" title="Branco Puro">Branco</button>' +
            '</div>' +
          '</div>' +

          '<div id="ark-led-feedback" style="display:none;margin-top:12px;font-size:12px;font-weight:600;padding:8px 12px;border-radius:6px;"></div>' +
        '</div>' +
        '<div id="ark-led-hardware-header" style="margin:20px 0 10px;font-size:14px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px;">' +
          '<span>🎛️</span> <span id="ark-led-hardware-title">Painel Frontal dos LEDs Físicos:</span>' +
        '</div>' +
        '<div class="ark-led-grid" id="ark-led-tiles"></div>';

      table.parentNode.insertBefore(container, table);

      var hardwareInfo = null;

      var colorNative = container.querySelector('#ark-rgb-color-native');
      var hexManual = container.querySelector('#ark-rgb-hex-manual');
      var previewDot = container.querySelector('#ark-rgb-preview-dot');
      var previewText = container.querySelector('#ark-rgb-preview-text');
      var applyColorBtn = container.querySelector('#ark-rgb-apply-btn');

      function syncColor(val, source) {
        if (!val) return;
        val = String(val).trim();
        var hex = val;
        if (hex.indexOf('#') !== 0 && /^[0-9a-fA-F]{6}$/.test(hex)) {
          hex = '#' + hex;
        }
        if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
          hex = hex.toUpperCase();
          if (source !== 'native' && colorNative) colorNative.value = hex.toLowerCase();
          if (source !== 'manual' && hexManual) hexManual.value = hex;
          if (previewDot) {
            previewDot.style.background = hex;
            previewDot.style.boxShadow = '0 0 10px ' + hex;
          }
          if (previewText) previewText.textContent = hex;
        } else if (source === 'manual' && hexManual) {
          hexManual.value = val;
          if (previewText) previewText.textContent = val;
        }
      }

      if (colorNative) {
        colorNative.addEventListener('input', function() { syncColor(this.value, 'native'); });
        colorNative.addEventListener('change', function() { syncColor(this.value, 'native'); });
      }

      if (hexManual) {
        hexManual.addEventListener('input', function() { syncColor(this.value, 'manual'); });
        hexManual.addEventListener('change', function() { syncColor(this.value, 'manual'); });
      }

      container.querySelectorAll('.ark-color-swatch-btn').forEach(function(swatch) {
        swatch.addEventListener('click', function() {
          var c = this.getAttribute('data-color');
          syncColor(c, 'swatch');
        });
      });

      var callExec = (window.L && window.L.rpc) ? window.L.rpc.declare({
        object: 'file',
        method: 'exec',
        params: ['command', 'params']
      }) : null;

      if (applyColorBtn) {
        applyColorBtn.addEventListener('click', function() {
          var chosenColor = (hexManual && hexManual.value) || (colorNative && colorNative.value) || '#00FF00';
          var fb = document.getElementById('ark-led-feedback');
          if (fb) {
            fb.style.display = 'block';
            fb.style.background = 'rgba(59, 130, 246, 0.15)';
            fb.style.color = '#60a5fa';
            fb.textContent = '⏳ Aplicando cor ' + chosenColor + ' no LED RGB frontal...';
          }
          if (callExec) {
            callExec('/usr/sbin/equipe-dashboard-control', ['set-led-rgb-color', chosenColor]).then(function(res) {
              if (fb) {
                fb.style.background = 'rgba(16, 185, 129, 0.2)';
                fb.style.color = '#34d399';
                fb.textContent = '✅ Cor ' + chosenColor + ' aplicada com sucesso no LED frontal!';
                setTimeout(function() { fb.style.display = 'none'; }, 4000);
              }
              var rgbInd = document.getElementById('ind-rgb_status');
              if (rgbInd) {
                rgbInd.className = 'ark-led-indicator';
                rgbInd.style.background = chosenColor;
                rgbInd.style.boxShadow = '0 0 12px ' + chosenColor;
              }
            }).catch(function(err) {
              if (fb) {
                fb.style.background = 'rgba(239, 68, 68, 0.2)';
                fb.style.color = '#f87171';
                fb.textContent = '⚠️ Erro ao aplicar cor: ' + err;
              }
            });
          }
        });
      }

      function sanitizeTableRows(validLeds) {
        if (!validLeds || !validLeds.length) return;
        var validSet = {};
        validLeds.forEach(function(l) { validSet[l.sysfs] = true; });

        var rows = table.querySelectorAll('tr.tr, tr');
        rows.forEach(function(row) {
          var cells = row.querySelectorAll('td, .td');
          if (!cells || cells.length < 2) return;
          var sysfsText = '';
          for (var i = 0; i < cells.length; i++) {
            var txt = (cells[i].innerText || cells[i].textContent || '').trim();
            if (txt && (validSet[txt] || txt.indexOf('d-link') >= 0 || txt.indexOf('ath10k') >= 0 || txt.indexOf('ath9k') >= 0 || txt.indexOf('mt76') >= 0 || txt.indexOf('rgb:') >= 0 || txt.indexOf('blue:') >= 0 || txt.indexOf('green:') >= 0 || txt.indexOf('wan') >= 0 || txt.indexOf('internet') >= 0)) {
              sysfsText = txt;
              break;
            }
          }
          if (sysfsText && !validSet[sysfsText]) {
            row.style.display = 'none';
          }
        });
      }

      function renderHardwareCards(info) {
        hardwareInfo = info;
        var titleEl = document.getElementById('ark-led-hardware-title');
        if (titleEl && info.model) {
          titleEl.textContent = 'Painel Frontal dos LEDs Físicos (' + info.model + '):';
        }

        if (info.has_rgb) {
          var rgbSection = document.getElementById('ark-rgb-picker-section');
          if (rgbSection) rgbSection.style.display = 'block';
          if (info.current_rgb_hex) {
            syncColor(info.current_rgb_hex, 'init');
          }
        }

        var grid = document.getElementById('ark-led-tiles');
        if (!grid) return;
        grid.innerHTML = '';

        (info.leds || []).forEach(function(l) {
          var domId = l.sysfs.replace(/[^a-zA-Z0-9_-]/g, '_');
          var card = document.createElement('div');
          card.className = 'ark-led-card';
          card.id = 'tile-' + domId;

          var indClass = 'ark-led-indicator ' + (l.color || 'green');
          if (l.trigger === 'none' && l.brightness === 0) indClass = 'ark-led-indicator off';

          card.innerHTML = '' +
            '<div class="ark-led-header">' +
              '<span class="' + indClass + '" id="ind-' + domId + '"></span>' +
              '<div>' +
                '<div class="ark-led-title">' + l.name + '</div>' +
                '<div class="ark-led-sub">' + l.sub + '</div>' +
              '</div>' +
            '</div>' +
            '<div style="font-size:12px;color:var(--ark-text-muted);">' +
              'Gatilho ativo: <code style="color:var(--ark-text);">' + (l.trigger || 'padrão') + '</code>' +
            '</div>';

          grid.appendChild(card);

          if ((l.type === 'status_rgb' || l.sysfs === 'rgb:status' || l.color === 'rgb') && l.hex_color) {
            var el = card.querySelector('#ind-' + domId);
            if (el && indClass.indexOf('off') === -1) {
              el.style.background = l.hex_color;
              el.style.boxShadow = '0 0 10px ' + l.hex_color;
            }
          }
        });

        sanitizeTableRows(info.leds);
      }

      function updateIndicators(preset) {
        if (!hardwareInfo || !hardwareInfo.leds) return;
        hardwareInfo.leds.forEach(function(l) {
          var domId = l.sysfs.replace(/[^a-zA-Z0-9_-]/g, '_');
          var el = document.getElementById('ind-' + domId);
          if (!el) return;

          if (preset === 'night' || preset === 'alert') {
            el.className = 'ark-led-indicator off';
            el.style.background = '';
            el.style.boxShadow = '';
          } else { // smart ou default
            el.className = 'ark-led-indicator ' + (l.color || 'green');
            if (l.type === 'status_rgb' || l.sysfs === 'rgb:status' || l.color === 'rgb') {
              var col = (hardwareInfo && hardwareInfo.current_rgb_hex) || '#00FF00';
              el.style.background = col;
              el.style.boxShadow = '0 0 10px ' + col;
            }
          }
        });
      }

      var applyPreset = function(presetName) {
        var fb = document.getElementById('ark-led-feedback');
        var labels = {
          smart: '🟢 Internet Conectada (Verde Fixo)',
          night: '🌙 Modo Noturno',
          alert: '🛡️ Alerta de Queda Silencioso',
          'default': '↺ Restaurar Padrão de Fábrica'
        };
        var label = labels[presetName] || presetName;
        if (fb) {
          fb.style.display = 'block';
          fb.style.background = 'rgba(59, 130, 246, 0.15)';
          fb.style.color = '#60a5fa';
          fb.textContent = '⏳ Aplicando "' + label + '" no roteador...';
        }

        if (callExec) {
          callExec('/usr/sbin/equipe-dashboard-control', ['set-led-preset', presetName]).then(function() {
            if (fb) {
              fb.style.background = 'rgba(16, 185, 129, 0.2)';
              fb.style.color = '#34d399';
              if (presetName === 'default') {
                fb.textContent = '✅ Configurações de iluminação restauradas para o padrão de fábrica!';
              } else if (presetName === 'night') {
                fb.textContent = '✅ Modo Noturno ativado: todos os LEDs foram apagados!';
              } else if (presetName === 'alert') {
                fb.textContent = '✅ Alerta Silencioso ativado: LEDs apagados em uso normal, acionando alerta se a conexão cair.';
              } else {
                fb.textContent = '✅ Perfil Internet Conectada aplicado: LED verde contínuo e estável!';
              }
              setTimeout(function() { fb.style.display = 'none'; }, 4000);
            }
            updateIndicators(presetName);
            if (callExec) {
              callExec('/usr/sbin/equipe-dashboard-control', ['get-led-hardware-info']).then(function(res) {
                try {
                  var data = JSON.parse(res.stdout || '{}');
                  if (data && data.leds) renderHardwareCards(data);
                } catch(e){}
              });
            }
          }).catch(function(err) {
            if (fb) {
              fb.style.background = 'rgba(239, 68, 68, 0.2)';
              fb.style.color = '#f87171';
              fb.textContent = '⚠️ Erro ao aplicar: ' + err;
            }
          });
        }
      };

      container.querySelectorAll('.ark-preset-tile').forEach(function(tile) {
        tile.addEventListener('click', function() {
          var p = this.getAttribute('data-led-preset');
          applyPreset(p);
        });
      });

      if (callExec) {
        callExec('/usr/sbin/equipe-dashboard-control', ['get-led-hardware-info']).then(function(res) {
          try {
            var data = JSON.parse(res.stdout || '{}');
            if (data && data.leds) {
              renderHardwareCards(data);
            }
          } catch(e) {
            console.error('Error parsing led hardware info:', e);
          }
        }).catch(function(err) {
          console.error('Error fetching led hardware info:', err);
        });
      }

      var mode = localStorage.getItem('ark_interface_mode') || 'basic';
      if (mode !== 'advanced') {
        table.style.display = 'none';
        var addBtn = view.querySelector('.cbi-section-create');
        if (addBtn) addBtn.style.display = 'none';
      }
    },

    cleanupButtons: function() {
      // 1. Permanently suppress orphan/hidden submit buttons injected by LuCI headers (Enter-key traps)
      var hiddenSubmits = document.querySelectorAll('form input[type="submit"].hidden, form > div > input[type="submit"].hidden, input[type="submit"].hidden');
      hiddenSubmits.forEach(function(b) {
        b.style.setProperty('display', 'none', 'important');
        b.style.setProperty('visibility', 'hidden', 'important');
        b.style.setProperty('position', 'absolute', 'important');
        b.style.setProperty('left', '-99999px', 'important');
        b.style.setProperty('width', '0', 'important');
        b.style.setProperty('height', '0', 'important');
        b.setAttribute('aria-hidden', 'true');
        b.tabIndex = -1;
      });

      // 2. Suppress duplicate legacy LuCI password toggle buttons (*) when ARK eye toggle exists
      var legacyPassToggles = document.querySelectorAll('button[title*="Revele"], button[title*="oculte"], button[title*="senha"], button[title*="Reveal"], button[aria-label*="senha"]');
      legacyPassToggles.forEach(function(b) {
        var txt = (b.textContent || '').trim();
        if (txt === '∗' || txt === '*' || txt === '') {
          b.style.setProperty('display', 'none', 'important');
        }
      });

      // 3. Modernize any raw unstyled submit buttons across any page
      var rawSubmits = document.querySelectorAll('input[type="submit"]:not(.cbi-button):not(.btn):not(.hidden), input[type="button"]:not(.cbi-button):not(.btn):not(.hidden), button:not(.cbi-button):not(.btn):not(.ark-pwd-toggle):not(.ark-modal-close):not([class*="ex-"])');
      rawSubmits.forEach(function(b) {
        var val = (b.value || b.textContent || '').trim().toLowerCase();
        if (val.indexOf('salvar') !== -1 || val.indexOf('save') !== -1) {
          b.classList.add('cbi-button', 'cbi-button-save');
        } else if (val.indexOf('adicionar') !== -1 || val.indexOf('add') !== -1 || val.indexOf('criar') !== -1) {
          b.classList.add('cbi-button', 'cbi-button-add');
        } else if (val.indexOf('apagar') !== -1 || val.indexOf('delete') !== -1 || val.indexOf('remover') !== -1) {
          b.classList.add('cbi-button', 'cbi-button-remove');
        } else if (val.indexOf('editar') !== -1 || val.indexOf('edit') !== -1) {
          b.classList.add('cbi-button', 'cbi-button-action');
        } else {
          b.classList.add('cbi-button', 'cbi-button-neutral');
        }
      });
    },

    observeDOM: function() {
      var self = this;
      var timeout = null;
      var observer = new MutationObserver(function() {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          self.cleanupButtons();
          self.enhancePasswordFields();
          self.enhanceTablesAndLogs();
          self.enhanceTabs();
          self.enhanceSafetyModals();
          self.enhanceModals();
          self.enhanceInterfaceBadges();
          self.enhanceNetlinkCharts();
          self.injectFeatureGuides();
          self.translateRemainingUI();
          self.hideRedundantOverviewSections();
          self.applyPageTransforms();
        }, 150);
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      ArkTheme.init();
    });
  } else {
    ArkTheme.init();
  }

  window.ArkTheme = ArkTheme;
})();
