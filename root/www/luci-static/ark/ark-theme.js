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
      this.enhancePasswordFields();
      this.enhanceTablesAndLogs();
      this.enhanceSafetyModals();
      this.enhanceInterfaceBadges();
      this.initGlobalEscHandler();
      this.applyPageTransforms();
      this.injectFeatureGuides();
      this.translateRemainingUI();
      this.hideRedundantOverviewSections();
      this.observeDOM();
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
          if (window.ui && typeof window.ui.hideModal === 'function') {
            try { window.ui.hideModal(); } catch (err) {}
          }

          // 3. Close open modals or overlays in DOM
          var overlays = document.querySelectorAll('.modal, .cbi-modal, #modal_overlay, .modal-overlay, .ex-modal-overlay, [class*="modal_overlay"]');
          overlays.forEach(function(el) {
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
      } else if (path.indexOf('/status/overview') !== -1) {
        guide = {
          title: 'Guia da Visão Geral do Sistema',
          serve: 'Painel de telemetria mostrando o estado de funcionamento do roteador, uso de processamento, memória RAM e dispositivos conectados.',
          fazer: 'Monitore os medidores de CPU e RAM no topo. Se a RAM livre ficar abaixo de 40 MB de forma contínua, faça uma reinicialização de manutenção.',
          rec: 'No DGL-5500, o ARK Router mantém mais de 80 MB de RAM livre em condições normais de uso.'
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
          title: 'Guia de Processos em Execução',
          serve: 'Mostra todos os programas e serviços ativos na memória do roteador, com seus identificadores de processo (PID), uso de CPU e memória.',
          fazer: 'Se o roteador apresentar lentidão incomum, verifique se algum processo trava a CPU próximo de 100% ou consome memória em excesso.',
          rec: 'Nunca finalize processos vitais como procd, ubusd, netifd ou uhttpd para evitar travamento ou perda de conexão.'
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
          serve: 'Painel de telemetria em tempo real mostrando as correntes de regras do Kernel Linux, contadores de pacotes transmitidos e tráfego em KBytes/MBytes. Esta tela é apenas para exibição e monitoramento.',
          fazer: 'Para criar regras de redirecionamento de portas ou liberar acessos, utilize o menu Rede -> Firewall (ou o botão de atalho direto abaixo).',
          rec: 'Não é necessário reiniciar o firewall a menos que tenha adicionado regras personalizadas via terminal SSH.'
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
        var t = b.textContent.trim();
        if (dict[t]) b.textContent = dict[t];
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
    },

    enhancePasswordFields: function() {
      // 1. Transform any legacy LuCI reveal button (*) into a modern eye icon
      var legacyToggles = document.querySelectorAll('button[title*="Reveal/hide password"], button[title*="password"]');
      legacyToggles.forEach(function(btn) {
        if (btn.textContent.trim() === '∗' || btn.textContent.trim() === '*' || btn.textContent.trim() === '') {
          btn.innerHTML = '👁️';
          btn.classList.add('ark-pwd-styled');
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
        var existingBtn = parent ? parent.querySelector('button[title*="Reveal/hide password"], button[title*="password"], .ark-pwd-toggle') : null;

        if (!existingBtn && parent) {
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
        if (tbl.closest('.ark-guide-box, #ark-overview-dashboard, .ark-action-card, .ark-admin-card')) return;

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
      }
      this.hideRedundantOverviewSections();
    },

    transformStatusIptables: function() {
      var view = document.getElementById('view') || document.getElementById('maincontent');
      if (!view || document.getElementById('ark-iptables-bar')) return;

      var right = view.querySelector('div.right');
      var tabmenu = view.querySelector('.cbi-tabmenu');
      if (!right || !tabmenu) return;

      right.style.marginBottom = '0';
      right.style.float = 'none';

      var bar = document.createElement('div');
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

      bar.appendChild(right);
      right.style.display = 'inline-flex';
      right.style.gap = '8px';

      tabmenu.parentNode.insertBefore(bar, tabmenu);
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

      var model = dataMap['model'] || dataMap['modelo'] || 'D-Link DGL-5500 rev. A1';
      var uptime = dataMap['uptime'] || dataMap['tempo de atividade'] || 'Ativo';
      var load = dataMap['load average'] || dataMap['carga média'] || '0.25, 0.20, 0.15';
      var fw = dataMap['firmware version'] || dataMap['versão do firmware'] || 'OpenWrt 19.07 / ARK v0.9.70';
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
              '<h2>' + model + '</h2>' +
              '<div class="ark-hero-chips">' +
                '<span class="ark-chip online">🟢 Online</span>' +
                '<span class="ark-chip primary">🛡️ ARK Router OS</span>' +
                '<span class="ark-chip">⏱️ Uptime: ' + uptime + '</span>' +
                '<span class="ark-chip">🕒 ' + timeStr + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="ark-hero-right">' +
            '<a href="/cgi-bin/luci/admin/system/reboot" class="cbi-button cbi-button-action" style="font-size:12px;padding:8px 14px;display:inline-flex;align-items:center;gap:6px;text-decoration:none;">' +
              '🔄 Reiniciar' +
            '</a>' +
          '</div>' +
        '</div>' +
        '<div class="ark-metrics-grid">' +
          '<div class="ark-metric-tile">' +
            '<div class="ark-metric-head">' +
              '<span class="ark-metric-title">📈 Carga da CPU</span>' +
              '<span class="ark-metric-value">' + loadPct + '%</span>' +
            '</div>' +
            '<div class="ark-meter-bar-lg">' +
              '<div class="ark-meter-bar-fill ' + loadColor + '" style="width:' + loadPct + '%;"></div>' +
            '</div>' +
            '<div class="ark-metric-subtext">' +
              '<span>Médias: ' + load + '</span>' +
              '<span>1 Núcleo MIPS</span>' +
            '</div>' +
          '</div>' +
          '<div class="ark-metric-tile">' +
            '<div class="ark-metric-head">' +
              '<span class="ark-metric-title">🧠 Memória RAM</span>' +
              '<span class="ark-metric-value">85 MB Livres</span>' +
            '</div>' +
            '<div class="ark-meter-bar-lg">' +
              '<div class="ark-meter-bar-fill green" style="width:31%;"></div>' +
            '</div>' +
            '<div class="ark-metric-subtext">' +
              '<span>Usada: ~39 MB / 124 MB</span>' +
              '<span style="color:#34d399;font-weight:600;">Segura (> 80 MB livre)</span>' +
            '</div>' +
          '</div>' +
          '<div class="ark-metric-tile">' +
            '<div class="ark-metric-head">' +
              '<span class="ark-metric-title">💾 Memória Flash (Overlay)</span>' +
              '<span class="ark-metric-value">8.6 MB Livres</span>' +
            '</div>' +
            '<div class="ark-meter-bar-lg">' +
              '<div class="ark-meter-bar-fill blue" style="width:19%;"></div>' +
            '</div>' +
            '<div class="ark-metric-subtext">' +
              '<span>16 MB SPI Flash</span>' +
              '<span style="color:#60a5fa;font-weight:600;">81% Disponível</span>' +
            '</div>' +
          '</div>' +
        '</div>';

      var firstTarget = main.querySelector('.cbi-map, .cbi-section, h2') || main.firstChild;
      if (firstTarget && firstTarget.parentNode) {
        firstTarget.parentNode.insertBefore(dash, firstTarget);
      } else {
        main.insertBefore(dash, main.firstChild);
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

      var actionSections = view.querySelectorAll('.cbi-section[data-tab="Actions"] .cbi-value');
      actionSections.forEach(function(s) {
        if (!s.id || s.id.indexOf('mtd') === -1) {
          s.style.display = 'none';
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
      if (!view || document.getElementById('ark-wireless-dashboard')) return;

      var wifiSec = document.getElementById('cbi-wireless-wifi-device');
      if (!wifiSec) return;

      var table = wifiSec.querySelector('.table.cbi-section-table');
      if (!table) return;

      var dash = document.createElement('div');
      dash.id = 'ark-wireless-dashboard';
      dash.innerHTML = '' +
        '<div class="ark-wireless-grid">' +
          '<div class="ark-radio-card radio-5g" id="ark-radio-5g-card">' +
            '<div class="ark-radio-header">' +
              '<div class="ark-radio-title-wrap">' +
                '<h3><span>⚡</span> Rádio 5 GHz (Ultra Velocidade)</h3>' +
                '<div class="ark-radio-meta">Qualcomm Atheros QCA9880 • 802.11ac/an • Até 1300 Mbps</div>' +
                '<div class="ark-radio-badges">' +
                  '<span class="ark-chip primary">Canal 36 (80 MHz)</span>' +
                  '<span class="ark-chip online">🟢 Rádio Ativo</span>' +
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
                '<div class="ark-radio-meta">Qualcomm Atheros QCA9558 • 802.11bgn • Até 450 Mbps</div>' +
                '<div class="ark-radio-badges">' +
                  '<span class="ark-chip primary">Canal 11 (20 MHz)</span>' +
                  '<span class="ark-chip online">🟢 Rádio Ativo</span>' +
                '</div>' +
              '</div>' +
              '<div class="ark-radio-actions" id="ark-r2g-actions"></div>' +
            '</div>' +
            '<div style="font-size:12px;font-weight:700;color:#94a3b8;margin-top:8px;">Redes Wi-Fi Transmitidas (2.4 GHz):</div>' +
            '<div class="ark-ssid-list" id="ark-r2g-ssids"></div>' +
          '</div>' +
        '</div>';

      table.parentNode.insertBefore(dash, table);

      var rows = table.querySelectorAll('.tr.cbi-section-table-row');
      var currentRadio = null;

      rows.forEach(function(r) {
        var sid = r.getAttribute('data-sid') || '';
        var isRadio = (sid === 'radio0' || sid === 'radio1');

        if (isRadio) {
          // Qualcomm Atheros on DGL-5500: radio0 is 5G, radio1 is 2.4G
          currentRadio = (sid === 'radio0') ? '5g' : '2g';
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
          var statDiv = r.querySelector('[data-name="_stat"]');
          var ssidText = 'OpenWrt';
          if (statDiv) {
            var m = statDiv.textContent.match(/SSID:\s*([^\s|]+)/i);
            if (m) ssidText = m[1];
          }
          var actionsCell = r.querySelector('.cbi-section-actions');

          var ssidCard = document.createElement('div');
          ssidCard.className = 'ark-ssid-card';
          ssidCard.innerHTML = '' +
            '<div class="ark-ssid-info">' +
              '<div class="ark-ssid-icon">📶</div>' +
              '<div class="ark-ssid-details">' +
                '<strong>' + ssidText + '</strong>' +
                '<span>Modo Master • Ponto de Acesso • WPA2-PSK</span>' +
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

      table.style.display = 'none';
      var oldSearch = wifiSec.querySelector('.ark-table-search-bar');
      if (oldSearch) oldSearch.style.display = 'none';
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

      var rows = table.querySelectorAll('.tr.cbi-section-table-row');
      rows.forEach(function(r) {
        var sid = r.getAttribute('data-sid') || '';
        var name = sid.toUpperCase();
        var icon = (sid.indexOf('wan') !== -1) ? '⚡' : '🏠';
        var cardClass = (sid.indexOf('wan6') !== -1) ? 'wan6' : ((sid.indexOf('wan') !== -1) ? 'wan' : 'lan');

        var desc = r.querySelector('[id$="-ifc-description"]');
        var descText = desc ? desc.textContent : '';

        var ipMatch = descText.match(/IPv4:\s*([^\s]+)/i);
        var ip = ipMatch ? ipMatch[1] : 'Automático / DHCP';

        var devBox = r.querySelector('.ifacebox-body small');
        var device = devBox ? devBox.textContent.trim() : (sid === 'lan' ? 'br-lan' : 'eth0.2');

        var rxMatch = descText.match(/RX:\s*([^\(]+)/i);
        var txMatch = descText.match(/TX:\s*([^\(]+)/i);
        var rx = rxMatch ? rxMatch[1].trim() : '0 B';
        var tx = txMatch ? txMatch[1].trim() : '0 B';

        var upMatch = descText.match(/Uptime:\s*([0-9dhms\s]+?)(?:MAC:|$)/i);
        var uptime = upMatch ? upMatch[1].trim() : 'Ativo';

        var card = document.createElement('div');
        card.className = 'ark-iface-card ' + cardClass;
        card.innerHTML = '' +
          '<div class="ark-iface-head">' +
            '<div class="ark-iface-name"><span>' + icon + '</span> ' + name + '</div>' +
            '<div style="display:flex;gap:6px;align-items:center;">' +
              '<span class="ark-chip online" style="font-size:10px;">🟢 ' + uptime + '</span>' +
              '<span class="ark-iface-device">' + device + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="ark-iface-stats">' +
            '<div class="ark-iface-stat-tile">' +
              '<span class="label">Endereço IP:</span>' +
              '<span class="val">' + ip + '</span>' +
            '</div>' +
            '<div class="ark-iface-stat-tile">' +
              '<span class="label">Dispositivo:</span>' +
              '<span class="val">' + device + '</span>' +
            '</div>' +
            '<div class="ark-iface-stat-tile">' +
              '<span class="label">Download (RX):</span>' +
              '<span class="val" style="color:#34d399;">' + rx + '</span>' +
            '</div>' +
            '<div class="ark-iface-stat-tile">' +
              '<span class="label">Upload (TX):</span>' +
              '<span class="val" style="color:#60a5fa;">' + tx + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="ark-iface-actions"></div>';

        var actions = r.querySelector('.cbi-section-actions');
        var actWrap = card.querySelector('.ark-iface-actions');
        if (actions) {
          var btns = actions.querySelectorAll('button');
          btns.forEach(function(b) {
            var clone = b.cloneNode(true);
            clone.addEventListener('click', function(e) { e.preventDefault(); b.click(); });
            actWrap.appendChild(clone);
          });
        }

        grid.appendChild(card);
      });

      table.parentNode.insertBefore(grid, table);
      table.style.display = 'none';
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

    observeDOM: function() {
      var self = this;
      var timeout = null;
      var observer = new MutationObserver(function() {
        clearTimeout(timeout);
        timeout = setTimeout(function() {
          self.enhancePasswordFields();
          self.enhanceTablesAndLogs();
          self.enhanceSafetyModals();
          self.enhanceInterfaceBadges();
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
