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
      this.initMode();
      this.injectModeSwitcher();
      this.enhancePasswordFields();
      this.enhanceTablesAndLogs();
      this.enhanceSafetyModals();
      this.enhanceInterfaceBadges();
      this.initGlobalEscHandler();
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

    initMode: function() {
      var saved = localStorage.getItem('ark_ui_mode');
      if (saved === 'advanced' || saved === 'basic') {
        this.mode = saved;
      } else {
        this.mode = 'basic';
      }
      this.applyMode(this.mode);
    },

    applyMode: function(mode) {
      this.mode = mode;
      localStorage.setItem('ark_ui_mode', mode);
      var b = document.body;
      if (!b) return;

      if (mode === 'basic') {
        b.classList.add('ark-mode-basic');
        b.classList.remove('ark-mode-advanced');
      } else {
        b.classList.add('ark-mode-advanced');
        b.classList.remove('ark-mode-basic');
      }

      var switcher = document.getElementById('ark-mode-switcher');
      if (switcher) {
        var btns = switcher.querySelectorAll('.ark-mode-pill');
        btns.forEach(function(btn) {
          if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      this.tagAdvancedFields();
    },

    tagAdvancedFields: function() {
      var advancedKeywords = [
        'mtu', 'metric', 'igmp', 'multicast', 'txpower', 'beacon', 'dtim',
        'rts', 'frag', 'distance', 'wmm', 'isolation', 'stbc', 'ldpc',
        'vlan', 'dscp', 'mssfix', 'synflood', 'conntrack', 'keepalive',
        'cryptographic', 'cipher', 'gateway metric', 'dns metric', 'ttl'
      ];

      var values = document.querySelectorAll('.cbi-value');
      values.forEach(function(val) {
        if (val.classList.contains('ark-tagged')) return;
        var titleElem = val.querySelector('.cbi-value-title');
        var text = (titleElem ? titleElem.textContent : '').toLowerCase();
        
        var isAdv = advancedKeywords.some(function(kw) {
          return text.indexOf(kw) !== -1;
        });

        if (isAdv) {
          val.classList.add('ark-advanced-field');
        }
        val.classList.add('ark-tagged');
      });
    },

    injectModeSwitcher: function() {
      if (document.body.classList.contains('ark-login-page')) return;
      if (document.getElementById('ark-mode-switcher')) return;

      var main = document.getElementById('maincontent');
      if (!main) return;

      var hasCbi = document.querySelector('.cbi-map, .cbi-section, form, table, .table');
      if (!hasCbi && !location.pathname.includes('/system/') && !location.pathname.includes('/network/')) {
        return;
      }

      var wrap = document.createElement('div');
      wrap.id = 'ark-mode-switcher';
      wrap.className = 'ark-mode-bar';
      wrap.innerHTML = '' +
        '<div class="ark-mode-info">' +
          '<span class="ark-mode-title">Modo de Configuração</span>' +
          '<span class="ark-mode-desc">' +
            (this.mode === 'basic' 
              ? 'Exibindo controles essenciais com linguagem simples, segura e intuitiva.' 
              : 'Exibindo todos os parâmetros avançados, opções de socket e chaves UCI.') +
          '</span>' +
        '</div>' +
        '<div class="ark-mode-toggle-group">' +
          '<button type="button" class="ark-mode-pill ' + (this.mode === 'basic' ? 'active' : '') + '" data-mode="basic">' +
            '<span class="ark-mode-icon">🌱</span> Modo Básico' +
          '</button>' +
          '<button type="button" class="ark-mode-pill ' + (this.mode === 'advanced' ? 'active' : '') + '" data-mode="advanced">' +
            '<span class="ark-mode-icon">⚡</span> Modo Avançado' +
          '</button>' +
        '</div>';

      var target = main.querySelector('.cbi-map, .cbi-section, h2, #tabmenu') || main.firstChild;
      if (target) {
        main.insertBefore(wrap, target);
      } else {
        main.prepend(wrap);
      }

      var self = this;
      wrap.querySelectorAll('.ark-mode-pill').forEach(function(pill) {
        pill.addEventListener('click', function(e) {
          e.preventDefault();
          var m = this.getAttribute('data-mode');
          self.applyMode(m);
          var desc = wrap.querySelector('.ark-mode-desc');
          if (desc) {
            desc.textContent = (m === 'basic')
              ? 'Exibindo controles essenciais com linguagem simples, segura e intuitiva.'
              : 'Exibindo todos os parâmetros avançados, opções de socket e chaves UCI.';
          }
        });
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
        var rows = tbl.querySelectorAll('tbody > tr, div.tr:not(.table-titles)');
        if (rows.length < 3) return;

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
      var pre = document.querySelector('#syslog, #dmesg, pre.log, pre');
      if (pre && !pre.getAttribute('data-ark-enhanced') && pre.textContent.length > 300) {
        pre.setAttribute('data-ark-enhanced', 'true');
        
        var logActions = document.createElement('div');
        logActions.className = 'ark-log-header-bar';
        logActions.innerHTML = '' +
          '<div class="ark-table-search-bar" style="margin-bottom: 0; flex: 1;">' +
            '<span class="ark-search-icon">🔍</span>' +
            '<input type="text" class="ark-search-input ark-log-filter" placeholder="Filtrar mensagens de log em tempo real..." />' +
          '</div>' +
          '<button type="button" class="cbi-button cbi-button-neutral ark-copy-log-btn">📋 Copiar Log</button>';

        pre.parentNode.insertBefore(logActions, pre);

        var rawLogLines = pre.textContent.split('\n');
        var logInput = logActions.querySelector('.ark-log-filter');
        var copyBtn = logActions.querySelector('.ark-copy-log-btn');

        logInput.addEventListener('input', function() {
          var q = logInput.value.toLowerCase().trim();
          if (!q) {
            pre.textContent = rawLogLines.join('\n');
          } else {
            var filtered = rawLogLines.filter(function(line) {
              return line.toLowerCase().indexOf(q) !== -1;
            });
            pre.textContent = filtered.join('\n');
          }
        });

        copyBtn.addEventListener('click', function() {
          navigator.clipboard.writeText(pre.textContent).then(function() {
            var orig = copyBtn.textContent;
            copyBtn.textContent = '✅ Copiado!';
            setTimeout(function() { copyBtn.textContent = orig; }, 2000);
          });
        });
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
          self.tagAdvancedFields();
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
