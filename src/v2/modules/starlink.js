// /src/modules/starlink.js - ARK Router LuCI View Module
const starlinkMethods = {
	activateStarlinkPanel: function(wanName,panel){
		if(!panel||!panel.open)return;document.querySelectorAll('.ex-starlink-wan').forEach(function(other){if(other!==panel)other.open=false;});if(this.starlinkTelemetryActive&&this.starlinkTelemetryWan!==wanName)this.stopStarlinkAlignment();
	},
	toggleStarlinkPublic: function(input){
		const desired=!!input.checked;input.disabled=true;
		return fs.exec('/usr/sbin/equipe-dashboard-control',['starlink-public-toggle',desired?'1':'0']).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao alterar o acesso sem login');
			const feature=(this.capabilities.features&&this.capabilities.features.starlink_public)||{};
			feature.enabled=desired;
			if(this.capabilities.features)this.capabilities.features.starlink_public=feature;
			const state=document.getElementById('ex-starlink-public-state'),link=document.getElementById('ex-starlink-public-link');
			if(state)state.textContent=desired?'LIGADO':'DESLIGADO';
			if(link)link.hidden=!desired;
			ui.addNotification(null,E('p',{},[desired?'Página /starlink/ liberada somente para dispositivos da LAN.':'Página /starlink/ bloqueada.']));
		},this)).catch(function(e){input.checked=!desired;ui.addNotification(null,E('p',{},[e.message]),'danger');}).finally(function(){input.disabled=false;});
	},
	toggleStarlinkAlwaysShow: function(input){
		const desired = !!input.checked; input.disabled = true;
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['starlink-always-show-toggle', desired ? '1' : '0']).then(L.bind(function(r){
			if (r.code) throw new Error(r.stderr || 'Falha ao alterar visibilidade do painel Starlink');
			if (this.capabilities.features) this.capabilities.features.starlink_always_show = desired;
			try { localStorage.setItem('ark_starlink_always_show', desired ? '1' : '0'); } catch(e){}
			const panel = document.getElementById('ex-starlink-global-panel');
			if (panel) {
				const isDetected = panel.classList.contains('detected') || panel.classList.contains('problem');
				panel.style.display = (isDetected || desired) ? '' : 'none';
			}
			const modalState = document.getElementById('ex-starlink-always-show-modal-state');
			if (modalState) {
				modalState.textContent = desired ? 'LIGADO' : 'DESLIGADO';
				modalState.className = 'ex-https-switch-state ' + (desired ? 'online' : 'standby');
			}
			const modalPanel = document.getElementById('ex-starlink-always-show-modal-panel') || (modalState && modalState.closest('.ex-https-panel'));
			if (modalPanel) modalPanel.classList.toggle('is-enabled', desired);

			const cardState = document.getElementById('ex-starlink-always-show-card-state');
			if (cardState) {
				cardState.textContent = desired ? 'LIGADO' : 'DESLIGADO';
				cardState.className = 'ex-https-switch-state ' + (desired ? 'online' : 'standby');
			}
			const cardPanel = document.getElementById('ex-starlink-always-show-card') || (cardState && cardState.closest('.ex-https-panel'));
			if (cardPanel) cardPanel.classList.toggle('is-enabled', desired);

			const cardInput = document.getElementById('ex-starlink-always-show-card-input');
			if (cardInput && cardInput !== input) cardInput.checked = desired;
			const modalInput = document.getElementById('ex-starlink-always-show-modal-input');
			if (modalInput && modalInput !== input) modalInput.checked = desired;
			ui.addNotification(null, E('p', {}, [desired ? 'Painel Starlink fixado como visível no Visão Geral.' : 'Painel Starlink voltará a ser exibido apenas quando uma antena física for detectada.']), 'info');
		}, this)).catch(function(e){
			input.checked = !desired;
			ui.addNotification(null, E('p', {}, [e.message]), 'danger');
		}).finally(function(){ input.disabled = false; });
	},
	saveStarlinkTelemetrySettings: function(params, btn){
		if (btn) { btn.disabled = true; btn.textContent = 'Salvando…'; }
		const args = ['starlink-telemetry-config-set'];
		Object.keys(params).forEach(function(k){
			args.push(k + '=' + params[k]);
		});
		return fs.exec('/usr/sbin/equipe-dashboard-control', args).then(L.bind(function(r){
			if (r.code) throw new Error(r.stderr || 'Falha ao salvar configurações');
			const isTelActive = (params.enabled === '1' || params.enabled === 1 || params.enabled === true);
			const isEmailActive = (params.email_enabled === '1' || params.email_enabled === 1 || params.email_enabled === true);
			const isAttachCsv = (params.attach_csv === '1' || params.attach_csv === 1 || params.attach_csv === true);
			const isPurgeBoot = (params.purge_boot_email === '1' || params.purge_boot_email === 1 || params.purge_boot_email === true);
			const isAlwaysShow = (params.always_show === '1' || params.always_show === 1 || params.always_show === true);
			const normalized = Object.assign({}, params, {
				enabled: isTelActive,
				email_enabled: isEmailActive,
				attach_csv: isAttachCsv,
				purge_boot_email: isPurgeBoot,
				always_show: isAlwaysShow
			});

			if (this.capabilities && this.capabilities.features) {
				this.capabilities.features.starlink_telemetry = Object.assign(this.capabilities.features.starlink_telemetry || {}, normalized);
				this.capabilities.features.starlink_always_show = isAlwaysShow;
			}
			if (typeof window !== 'undefined' && window._arkCapabilities && window._arkCapabilities.features) {
				window._arkCapabilities.features.starlink_telemetry = Object.assign(window._arkCapabilities.features.starlink_telemetry || {}, normalized);
				window._arkCapabilities.features.starlink_always_show = isAlwaysShow;
			}
			if (btn) {
				ui.addNotification(null, E('p', {}, ['Configurações de telemetria e e-mail salvas com sucesso!']), 'info');
			}
			this.updateStarlinkTelemetryStatusBadge();
		}, this)).catch(function(e){
			ui.addNotification(null, E('p', {}, [e.message]), 'danger');
		}).finally(function(){
			if (btn) { btn.disabled = false; btn.textContent = '💾 Salvar Configurações'; }
		});
	},
	triggerStarlinkTestEmail: function(btn){
		if (btn) { btn.disabled = true; btn.textContent = '✉️ Disparando e-mail de teste…'; }
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['starlink-telemetry-send-test']).then(L.bind(function(r){
			let res = {};
			try { res = JSON.parse(r.stdout || '{}'); } catch(e){}
			// Se já respondeu finalizado (modo síncrono/erro imediato)
			if (res.success !== undefined) {
				if (res.success) {
					ui.addNotification(null, E('p', {}, [res.message || 'Relatório executivo enviado com sucesso por e-mail!']), 'info');
				} else {
					ui.addNotification(null, E('p', {}, [res.message || res.output || 'Falha ao enviar e-mail. Verifique a chave Resend API e conexão.']), 'danger');
				}
				if (btn) { btn.disabled = false; btn.textContent = '✉️ Disparar E-mail de Teste Agora'; }
				return;
			}
			// Processo disparado em segundo plano: efetua polling reativo
			this.pollStarlinkTestEmail(btn, 0);
		}, this)).catch(L.bind(function(e){
			ui.addNotification(null, E('p', {}, ['Erro ao disparar e-mail: ' + e.message]), 'danger');
			if (btn) { btn.disabled = false; btn.textContent = '✉️ Disparar E-mail de Teste Agora'; }
		}, this));
	},
	pollStarlinkTestEmail: function(btn, attempt){
		if (attempt > 30) { // 30 * 1.5s = 45s máx de espera
			ui.addNotification(null, E('p', {}, ['O envio está demorando mais do que o esperado e continua rodando em segundo plano no roteador. Verifique o log do sistema (logread -t starlink-mailer).']), 'warning');
			if (btn) { btn.disabled = false; btn.textContent = '✉️ Disparar E-mail de Teste Agora'; }
			return;
		}
		if (btn) {
			const elapsed = Math.round((attempt + 1) * 1.5);
			btn.textContent = '✉️ Transmitindo e-mail (' + elapsed + 's)…';
		}
		window.setTimeout(L.bind(function(){
			fs.exec('/usr/sbin/equipe-dashboard-control', ['starlink-telemetry-test-status']).then(L.bind(function(r){
				let st = {};
				try { st = JSON.parse(r.stdout || '{}'); } catch(e){}
				if (st.status === 'done') {
					if (st.success) {
						ui.addNotification(null, E('p', {}, [st.message || 'Relatório executivo enviado com sucesso por e-mail!']), 'info');
					} else {
						ui.addNotification(null, E('p', {}, [(st.message || 'Falha ao enviar e-mail') + (st.output ? ': ' + st.output : '')]), 'danger');
					}
					if (btn) { btn.disabled = false; btn.textContent = '✉️ Disparar E-mail de Teste Agora'; }
					return;
				}
				this.pollStarlinkTestEmail(btn, attempt + 1);
			}, this)).catch(L.bind(function(){
				this.pollStarlinkTestEmail(btn, attempt + 1);
			}, this));
		}, this), 1500);
	},
	flushStarlinkTelemetryRam: function(btn){
		if (btn) { btn.disabled = true; btn.textContent = 'Compactando…'; }
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['starlink-telemetry-flush']).then(function(r){
			if (r.code) throw new Error(r.stderr || 'Falha ao descarregar RAM');
			ui.addNotification(null, E('p', {}, ['Amostras em RAM sincronizadas e compactadas na Flash com sucesso!']), 'info');
		}).catch(function(e){
			ui.addNotification(null, E('p', {}, [e.message]), 'danger');
		}).finally(function(){
			if (btn) { btn.disabled = false; btn.textContent = '⚡ Sincronizar RAM para Flash'; }
		});
	},
	updateStarlinkTelemetryStatusBadge: function(){
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['starlink-telemetry-status']).then(function(r){
			let st = {};
			try { st = JSON.parse(r.stdout || '{}'); } catch(e){}
			const badge = document.getElementById('ex-starlink-telemetry-status-badge');
			if (badge) {
				if (st.enabled && st.running) {
					badge.className = 'ex-pill online';
					badge.textContent = 'COLETANDO (' + (st.hours_saved || 0) + 'h salvas)';
				} else if (st.enabled) {
					badge.className = 'ex-pill standby';
					badge.textContent = 'ATIVO / AGUARDANDO';
				} else {
					badge.className = 'ex-pill offline';
					badge.textContent = 'DESATIVADO';
				}
			}
			const flashInfo = document.getElementById('ex-starlink-telemetry-flash-info');
			if (flashInfo && st.flash_bytes !== undefined) {
				const kb = Math.round(st.flash_bytes / 1024);
				flashInfo.textContent = 'Histórico: ' + (st.hours_saved || 0) + 'h compactadas na Flash (~' + (kb < 1024 ? kb + ' KB' : (kb / 1024).toFixed(1) + ' MB') + ')';
			}
		}).catch(function(){});
	},
	renderStarlinkTelemetrySection: function(){
		const telData = (this.capabilities.features && this.capabilities.features.starlink_telemetry) || {};
		const telAlwaysShow = !!(this.capabilities.features && this.capabilities.features.starlink_always_show);
		const telEnabled = !!telData.enabled;
		const sampleMode = telData.sample_mode || 'auto';
		const maxHistoryHours = String(telData.max_history_hours || 25);
		const purgeBootEmail = (telData.purge_boot_email !== false && telData.purge_boot_email !== '0');
		const emailEnabled = !!telData.email_enabled;
		const provider = telData.provider || 'resend';
		const resendApiKey = telData.resend_api_key || '';
		const emailTo = telData.email_to || '';
		const emailFrom = telData.email_from || 'onboarding@resend.dev';
		const attachCsv = (telData.attach_csv !== false && telData.attach_csv !== '0');
		const smtpServer = telData.smtp_server || 'smtp.gmail.com';
		const smtpPort = telData.smtp_port || '587';
		const smtpTls = (telData.smtp_tls !== false && telData.smtp_tls !== '0');
		const smtpUser = telData.smtp_user || '';
		const smtpPass = telData.smtp_pass || '';
		const emailInterval = String(telData.email_interval || '24');

		const statusBadge = E('span', { id: 'ex-starlink-telemetry-status-badge', class: 'ex-pill ' + (telEnabled ? 'online' : 'offline') }, [telEnabled ? 'ATIVO' : 'DESLIGADO']);
		const flashInfo = E('small', { id: 'ex-starlink-telemetry-flash-info', class: 'ex-muted', style: 'font-size: 12px; display: block; margin-top: 2px;' }, ['Histórico: consultando…']);

		// 1. Always Show Toggle Card
		const alwaysShowCardState = E('span', {
			id: 'ex-starlink-always-show-card-state',
			class: 'ex-https-switch-state ' + (telAlwaysShow ? 'online' : 'standby')
		}, [telAlwaysShow ? 'LIGADO' : 'DESLIGADO']);

		const alwaysShowInput = E('input', {
			id: 'ex-starlink-always-show-card-input',
			type: 'checkbox',
			'aria-label': 'Sempre exibir painel Starlink',
			change: L.bind(function(ev) {
				this.toggleStarlinkAlwaysShow(ev.currentTarget);
			}, this)
		});
		alwaysShowInput.checked = telAlwaysShow;

		const alwaysShowCard = E('div', {
			id: 'ex-starlink-always-show-card',
			class: 'ex-https-panel' + (telAlwaysShow ? ' is-enabled' : ''),
			style: 'margin: 0; padding: 10px 14px; border-radius: 10px;'
		}, [
			E('div', { class: 'ex-https-toggle-row' }, [
				E('div', {}, [
					E('strong', { style: 'display: block; font-size: 13.5px; margin-bottom: 2px;' }, ['Sempre exibir painel Starlink']),
					E('small', { class: 'ex-muted' }, ['Mantém este painel e as ferramentas Starlink visíveis no Visão Geral mesmo sem antena física detectada na WAN.'])
				]),
				E('div', { class: 'ex-https-switch-wrap' }, [
					alwaysShowCardState,
					E('label', { class: 'ex-switch' }, [alwaysShowInput, E('span', { class: 'ex-switch-slider' })])
				])
			])
		]);

		// 2. Master Toggle: Coleta de Telemetria (Amostras 1s em RAM)
		const masterSwitchState = E('span', {
			id: 'ex-starlink-master-switch-state',
			class: 'ex-https-switch-state ' + (telEnabled ? 'online' : 'standby')
		}, [telEnabled ? 'ATIVO' : 'DESLIGADO']);

		const telEnabledInput = E('input', {
			id: 'ex-starlink-telemetry-master-input',
			type: 'checkbox',
			'aria-label': 'Ativar registro e coleta de telemetria'
		});
		telEnabledInput.checked = telEnabled;

		const masterToggleCard = E('div', {
			id: 'ex-starlink-master-toggle-card',
			class: 'ex-https-panel' + (telEnabled ? ' is-enabled' : ''),
			style: 'margin: 0; padding: 12px 14px; border-radius: 12px;'
		}, [
			E('div', { class: 'ex-https-toggle-row' }, [
				E('div', {}, [
					E('strong', { style: 'display: block; font-size: 14px; margin-bottom: 2px; color: ' + (telEnabled ? '#38bdf8' : 'inherit') + ';' }, ['⚡ Coleta de Telemetria (Amostras 1s em RAM)']),
					E('small', { class: 'ex-muted' }, ['Grava métricas segundo a segundo na RAM (/tmp/starlink_telemetry) e compacta na Flash a cada 15 min. Protege a vida útil da memória.'])
				]),
				E('div', { class: 'ex-https-switch-wrap' }, [
					masterSwitchState,
					E('label', { class: 'ex-switch' }, [telEnabledInput, E('span', { class: 'ex-switch-slider' })])
				])
			])
		]);

		// Sub-options (derived from telemetry collection):
		const sampleModeSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; max-width: 320px; font-weight: 600;' }, [
			E('option', { value: 'auto' }, ['🛰️ Automático (antena real / probes WAN)']),
			E('option', { value: 'simulate' }, ['🧪 Simulação (gerar dados Starlink para testes)'])
		]);
		sampleModeSelect.value = sampleMode;

		const maxHoursSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; max-width: 320px; font-weight: 600;' }, [
			E('option', { value: '25' }, ['25 horas (Padrão recomendado ~850 KB na flash)']),
			E('option', { value: '12' }, ['12 horas (~400 KB na flash)']),
			E('option', { value: '48' }, ['48 horas (~1.6 MB na flash)']),
			E('option', { value: '72' }, ['72 horas (~2.4 MB na flash)'])
		]);
		maxHoursSelect.value = maxHistoryHours;

		const purgeBootState = E('span', {
			class: 'ex-https-switch-state ' + (purgeBootEmail ? 'online' : 'standby')
		}, [purgeBootEmail ? 'ATIVO' : 'DESLIGADO']);

		const purgeBootInput = E('input', { type: 'checkbox', 'aria-label': 'Enviar por e-mail antes de apagar log' });
		purgeBootInput.checked = purgeBootEmail;
		purgeBootInput.addEventListener('change', function() {
			purgeBootState.textContent = purgeBootInput.checked ? 'ATIVO' : 'DESLIGADO';
			purgeBootState.className = 'ex-https-switch-state ' + (purgeBootInput.checked ? 'online' : 'standby');
		});

		const purgeBootRow = E('div', { class: 'ex-https-toggle-row', style: 'padding: 8px 10px; background: rgba(127,127,127,0.06); border-radius: 8px;' }, [
			E('div', {}, [
				E('strong', { style: 'display:block; font-size:13px;' }, ['Enviar por e-mail antes de apagar log antigo']),
				E('small', { class: 'ex-muted' }, ['Se o roteador ficar desligado por dias ou o histórico exceder o prazo, aguarda conexão e envia os logs por e-mail antes de descartar.'])
			]),
			E('div', { class: 'ex-https-switch-wrap' }, [
				purgeBootState,
				E('label', { class: 'ex-switch' }, [purgeBootInput, E('span', { class: 'ex-switch-slider' })])
			])
		]);

		// Email settings section
		const emailSwitchState = E('span', {
			class: 'ex-https-switch-state ' + (emailEnabled ? 'online' : 'standby')
		}, [emailEnabled ? 'ATIVO' : 'DESLIGADO']);

		const emailEnabledInput = E('input', { type: 'checkbox', 'aria-label': 'Enviar logs por e-mail' });
		emailEnabledInput.checked = emailEnabled;

		const providerSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; max-width: 320px; font-weight: 600;' }, [
			E('option', { value: 'resend' }, ['🚀 API Resend (Gratuito, Sem Senha)']),
			E('option', { value: 'smtp' }, ['✉️ SMTP Tradicional (msmtp)'])
		]);
		providerSelect.value = provider;

		const apiKeyInput = E('input', { class: 'cbi-input-text', type: 'password', value: resendApiKey, placeholder: 're_xxxxxxxxx', style: 'width: 100%; max-width: 280px; font-family: monospace; font-size: 13px;' });
		const toggleApiKeyBtn = E('button', { class: 'ex-mini-button', type: 'button', style: 'margin-left: 8px;' }, ['Ver']);
		toggleApiKeyBtn.addEventListener('click', function() {
			if (apiKeyInput.type === 'password') {
				apiKeyInput.type = 'text';
				toggleApiKeyBtn.textContent = 'Ocultar';
			} else {
				apiKeyInput.type = 'password';
				toggleApiKeyBtn.textContent = 'Ver';
			}
		});

		const emailToInput = E('input', { class: 'cbi-input-text', type: 'text', value: emailTo, placeholder: 'seu-email@gmail.com', style: 'width: 100%; max-width: 320px;' });
		const emailFromInput = E('input', { class: 'cbi-input-text', type: 'text', value: emailFrom, placeholder: 'onboarding@resend.dev', style: 'width: 100%; max-width: 320px;' });

		const attachCsvState = E('span', {
			class: 'ex-https-switch-state ' + (attachCsv ? 'online' : 'standby')
		}, [attachCsv ? 'ATIVO' : 'DESLIGADO']);

		const attachCsvInput = E('input', { type: 'checkbox', 'aria-label': 'Anexar planilha .csv.gz' });
		attachCsvInput.checked = attachCsv;
		attachCsvInput.addEventListener('change', function() {
			attachCsvState.textContent = attachCsvInput.checked ? 'ATIVO' : 'DESLIGADO';
			attachCsvState.className = 'ex-https-switch-state ' + (attachCsvInput.checked ? 'online' : 'standby');
		});

		// SMTP specific inputs
		const smtpServerInput = E('input', { class: 'cbi-input-text', type: 'text', value: smtpServer, placeholder: 'smtp.gmail.com', style: 'width: 100%; max-width: 320px;' });
		const smtpPortInput = E('input', { class: 'cbi-input-text', type: 'number', value: smtpPort, placeholder: '587', style: 'width: 100%; max-width: 100px;' });
		const smtpUserInput = E('input', { class: 'cbi-input-text', type: 'text', value: smtpUser, placeholder: 'seu-email@gmail.com', style: 'width: 100%; max-width: 320px;' });
		const smtpPassInput = E('input', { class: 'cbi-input-text', type: 'password', value: smtpPass, placeholder: 'Senha de app (16 dígitos)', style: 'width: 100%; max-width: 280px; font-family: monospace; font-size: 13px;' });
		const toggleSmtpPassBtn = E('button', { class: 'ex-mini-button', type: 'button', style: 'margin-left: 8px;' }, ['Ver']);
		toggleSmtpPassBtn.addEventListener('click', function() {
			if (smtpPassInput.type === 'password') {
				smtpPassInput.type = 'text';
				toggleSmtpPassBtn.textContent = 'Ocultar';
			} else {
				smtpPassInput.type = 'password';
				toggleSmtpPassBtn.textContent = 'Ver';
			}
		});

		const smtpTlsState = E('span', { class: 'ex-https-switch-state ' + (smtpTls ? 'online' : 'standby') }, [smtpTls ? 'ATIVO' : 'DESLIGADO']);
		const smtpTlsInput = E('input', { type: 'checkbox', 'aria-label': 'Conexão Segura TLS' });
		smtpTlsInput.checked = smtpTls;
		smtpTlsInput.addEventListener('change', function() {
			smtpTlsState.textContent = smtpTlsInput.checked ? 'ATIVO' : 'DESLIGADO';
			smtpTlsState.className = 'ex-https-switch-state ' + (smtpTlsInput.checked ? 'online' : 'standby');
		});

		const intervalSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; max-width: 320px; font-weight: 600;' }, [
			E('option', { value: '24' }, ['A cada 24 horas (Relatório Diário)']),
			E('option', { value: '12' }, ['A cada 12 horas']),
			E('option', { value: '6' }, ['A cada 6 horas']),
			E('option', { value: '0' }, ['Desativado (Apenas manual ou pós-boot)'])
		]);
		intervalSelect.value = emailInterval;

		const smtpFieldsContainer = E('div', { id: 'ex-starlink-smtp-rows', style: (provider === 'smtp') ? 'display:grid; gap:10px;' : 'display:none; gap:10px;' }, [
			E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Servidor SMTP (Host)']),
					E('small', { class: 'ex-muted' }, ['Ex: smtp.gmail.com, smtp.office365.com, etc.'])
				]),
				smtpServerInput
			]),
			E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Porta SMTP']),
					E('small', { class: 'ex-muted' }, ['587 para STARTTLS (recomendado) ou 465 para SSL/TLS direto.'])
				]),
				smtpPortInput
			]),
			E('div', { class: 'ex-https-toggle-row', style: 'padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Criptografia TLS (STARTTLS)']),
					E('small', { class: 'ex-muted' }, ['Conexão segura obrigatória para Gmail, Outlook e provedores modernos.'])
				]),
				E('div', { class: 'ex-https-switch-wrap' }, [
					smtpTlsState,
					E('label', { class: 'ex-switch' }, [smtpTlsInput, E('span', { class: 'ex-switch-slider' })])
				])
			]),
			E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Usuário / E-mail de Login SMTP']),
					E('small', { class: 'ex-muted' }, ['Seu endereço completo de e-mail da conta de envio.'])
				]),
				smtpUserInput
			]),
			E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Senha de Aplicativo (SMTP Password)']),
					E('small', { class: 'ex-muted' }, ['No Gmail/Outlook, gere uma "Senha de App" de 16 caracteres nas configurações de segurança.'])
				]),
				E('div', { style: 'display:flex; align-items:center;' }, [smtpPassInput, toggleSmtpPassBtn])
			])
		]);

		const emailFieldsContainer = E('div', { id: 'ex-starlink-email-fields', style: emailEnabled ? 'display:grid; gap:10px; margin-top:10px;' : 'display:none; gap:10px; margin-top:10px;' }, [
			E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Provedor de E-mail']),
					E('small', { class: 'ex-muted' }, ['API REST Resend (sem necessidade de senhas) ou SMTP tradicional.'])
				]),
				providerSelect
			]),
			E('div', { id: 'ex-starlink-resend-key-row', style: (provider === 'resend') ? 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' : 'display:none; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Chave da API Resend (Token)']),
					E('small', { class: 'ex-muted' }, ['Chave gerada no resend.com (ex: re_xxxxxxxxx). Risco zero para suas contas pessoais.'])
				]),
				E('div', { style: 'display:flex; align-items:center;' }, [apiKeyInput, toggleApiKeyBtn])
			]),
			smtpFieldsContainer,
			E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Intervalo de Envio Automático']),
					E('small', { class: 'ex-muted' }, ['Frequência com que o relatório consolidado das últimas horas será enviado.'])
				]),
				intervalSelect
			]),
			E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['E-mail de Destino (Para)']),
					E('small', { class: 'ex-muted' }, ['Endereço que receberá o relatório executivo com os anexos.'])
				]),
				emailToInput
			]),
			E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Remetente do E-mail (De)']),
					E('small', { class: 'ex-muted' }, ['Padrão de testes: onboarding@resend.dev ou seu usuário SMTP.'])
				]),
				emailFromInput
			]),
			E('div', { class: 'ex-https-toggle-row', style: 'padding:10px 12px; background:rgba(0,0,0,0.18); border-radius:10px;' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13px;' }, ['Anexar Planilha (.csv.gz)']),
					E('small', { class: 'ex-muted' }, ['Inclui arquivo compactado segundo a segundo com todos os dados da viagem.'])
				]),
				E('div', { class: 'ex-https-switch-wrap' }, [
					attachCsvState,
					E('label', { class: 'ex-switch' }, [attachCsvInput, E('span', { class: 'ex-switch-slider' })])
				])
			])
		]);

		const emailPanel = E('div', {
			id: 'ex-starlink-email-panel',
			class: 'ex-https-panel' + (emailEnabled ? ' is-enabled' : ''),
			style: 'margin: 0; padding: 12px; border-radius: 10px;'
		}, [
			E('div', { class: 'ex-https-toggle-row' }, [
				E('div', {}, [
					E('strong', { style: 'display:block; font-size:13.5px;' }, ['Enviar relatórios e logs por e-mail']),
					E('small', { class: 'ex-muted' }, ['Dispara relatórios executivos consolidados com tabela formatada e planilha compactada (.csv.gz) em anexo.'])
				]),
				E('div', { class: 'ex-https-switch-wrap' }, [
					emailSwitchState,
					E('label', { class: 'ex-switch' }, [emailEnabledInput, E('span', { class: 'ex-switch-slider' })])
				])
			]),
			emailFieldsContainer
		]);

		const collectParams = function() {
			return {
				always_show: alwaysShowInput.checked ? '1' : '0',
				enabled: telEnabledInput.checked ? '1' : '0',
				sample_mode: sampleModeSelect.value,
				max_history_hours: maxHoursSelect.value,
				purge_boot_email: purgeBootInput.checked ? '1' : '0',
				email_enabled: emailEnabledInput.checked ? '1' : '0',
				provider: providerSelect.value,
				resend_api_key: apiKeyInput.value.trim(),
				email_to: emailToInput.value.trim(),
				email_from: emailFromInput.value.trim(),
				attach_csv: attachCsvInput.checked ? '1' : '0',
				smtp_server: smtpServerInput.value.trim(),
				smtp_port: smtpPortInput.value.trim(),
				smtp_tls: smtpTlsInput.checked ? '1' : '0',
				smtp_user: smtpUserInput.value.trim(),
				smtp_pass: smtpPassInput.value.trim(),
				email_interval: intervalSelect.value
			};
		};

		emailEnabledInput.addEventListener('change', L.bind(function() {
			const isEmailActive = emailEnabledInput.checked;
			emailFieldsContainer.style.display = isEmailActive ? 'grid' : 'none';
			emailSwitchState.textContent = isEmailActive ? 'ATIVO' : 'DESLIGADO';
			emailSwitchState.className = 'ex-https-switch-state ' + (isEmailActive ? 'online' : 'standby');
			emailPanel.classList.toggle('is-enabled', isEmailActive);
			this.saveStarlinkTelemetrySettings(collectParams());
		}, this));

		providerSelect.addEventListener('change', function() {
			const isResend = providerSelect.value === 'resend';
			const resendRow = document.getElementById('ex-starlink-resend-key-row');
			const smtpRows = document.getElementById('ex-starlink-smtp-rows');
			if (resendRow) resendRow.style.display = isResend ? 'flex' : 'none';
			if (smtpRows) smtpRows.style.display = isResend ? 'none' : 'grid';
		});

		// Action buttons
		const saveBtn = E('button', {
			class: 'ex-hero-feature-button',
			type: 'button',
			style: 'padding: 8px 18px !important; background: #0284c7 !important; border-color: #38bdf8 !important; color: #fff !important; font-weight: 750 !important; cursor: pointer;'
		}, ['💾 Salvar Configurações']);

		saveBtn.addEventListener('click', L.bind(function() {
			this.saveStarlinkTelemetrySettings(collectParams(), saveBtn);
		}, this));

		const saveBtnTop = E('button', {
			class: 'ex-mini-button',
			type: 'button',
			style: 'padding: 5px 12px; background: #0284c7; border-color: #38bdf8; color: #fff; font-weight: 700; cursor: pointer;'
		}, ['💾 Salvar Configurações']);

		saveBtnTop.addEventListener('click', L.bind(function() {
			this.saveStarlinkTelemetrySettings(collectParams(), saveBtnTop);
		}, this));

		const testEmailBtn = E('button', {
			class: 'ex-mini-button',
			type: 'button',
			style: 'padding: 8px 14px; font-weight: 700; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;'
		}, ['✉️ Disparar E-mail de Teste Agora']);

		testEmailBtn.addEventListener('click', L.bind(function() {
			this.triggerStarlinkTestEmail(testEmailBtn);
		}, this));

		const flushBtn = E('button', {
			class: 'ex-mini-button',
			type: 'button',
			style: 'padding: 8px 14px; font-weight: 700;'
		}, ['⚡ Sincronizar RAM para Flash']);

		flushBtn.addEventListener('click', L.bind(function() {
			this.flushStarlinkTelemetryRam(flushBtn);
		}, this));

		// 3. Collapsible Details Container (Controlled strictly by Master Toggle)
		const detailsContainer = E('div', {
			id: 'ex-starlink-telemetry-details',
			style: telEnabled ? 'display:grid; gap:12px; margin-top:2px;' : 'display:none; gap:12px; margin-top:2px;'
		}, [
			E('div', { style: 'display:grid; gap:8px; padding:12px; background:rgba(127,127,127,0.05); border-radius:10px; border:1px solid rgba(127,127,127,0.12);' }, [
				E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;' }, [
					E('strong', { style: 'font-size:12.5px; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;' }, ['⏱️ Armazenamento e Retenção']),
					saveBtnTop
				]),
				E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:8px 10px; background:rgba(127,127,127,0.06); border-radius:8px;' }, [
					E('div', {}, [
						E('strong', { style: 'display:block; font-size:13px;' }, ['Modo da Telemetria']),
						E('small', { class: 'ex-muted' }, ['Escolha entre consultar antenas físicas reais ou simular comportamento Starlink com handovers para testes em bancada.'])
					]),
					sampleModeSelect
				]),
				E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; padding:8px 10px; background:rgba(127,127,127,0.06); border-radius:8px;' }, [
					E('div', {}, [
						E('strong', { style: 'display:block; font-size:13px;' }, ['Prazo para guardar logs (Retenção na Flash)']),
						E('small', { class: 'ex-muted' }, ['Tempo máximo de histórico preservado na memória interna do roteador.'])
					]),
					maxHoursSelect
				]),
				purgeBootRow
			]),
			emailPanel,
			E('div', { style: 'display:flex; align-items:center; justify-content:flex-end; flex-wrap:wrap; gap:10px; padding-top:8px; border-top:1px solid rgba(127,127,127,0.18);' }, [
				flushBtn,
				testEmailBtn,
				saveBtn
			])
		]);

		// Master Toggle behavior: expands/collapses details, and auto-saves enabled state immediately
		telEnabledInput.addEventListener('change', L.bind(function() {
			const active = telEnabledInput.checked;
			masterSwitchState.textContent = active ? 'ATIVO' : 'DESLIGADO';
			masterSwitchState.className = 'ex-https-switch-state ' + (active ? 'online' : 'standby');
			masterToggleCard.classList.toggle('is-enabled', active);
			const title = masterToggleCard.querySelector('strong');
			if (title) title.style.color = active ? '#38bdf8' : 'inherit';

			if (active) {
				detailsContainer.style.display = 'grid';
				statusBadge.textContent = 'ATIVANDO…';
				statusBadge.className = 'ex-pill standby';
			} else {
				detailsContainer.style.display = 'none';
				statusBadge.textContent = 'DESATIVANDO…';
				statusBadge.className = 'ex-pill standby';
			}
			const params = collectParams();
			this.saveStarlinkTelemetrySettings(params);
		}, this));

		window.setTimeout(L.bind(this.updateStarlinkTelemetryStatusBadge, this), 100);

		return E('div', {
			class: 'ex-starlink-telemetry-config',
			style: 'margin-top: 14px; padding: 16px; background: rgba(15, 23, 42, 0.55); border-radius: 14px; border: 1px solid rgba(56, 189, 248, 0.22); display: grid; gap: 12px;'
		}, [
			E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; border-bottom: 1px solid rgba(127,127,127,0.18); padding-bottom: 10px;' }, [
				E('div', {}, [
					E('strong', { style: 'font-size: 1rem; color: #38bdf8; display:flex; align-items:center; gap:6px;' }, [
						'📡 Telemetria, Logs e Envio por E-mail'
					]),
					flashInfo
				]),
				statusBadge
			]),
			alwaysShowCard,
			masterToggleCard,
			detailsContainer
		]);
	},
	stopStarlinkAlignment: function(){
		const oldWan=this.starlinkTelemetryWan, oldId=portDomId(oldWan||'wan');this.starlinkTelemetryActive=false;this.starlinkTelemetryWan=null;if(this.starlinkTelemetryTimer)window.clearTimeout(this.starlinkTelemetryTimer);if(this.starlinkTelemetryStopTimer)window.clearTimeout(this.starlinkTelemetryStopTimer);this.starlinkTelemetryTimer=null;this.starlinkTelemetryStopTimer=null;const b=document.getElementById('ex-starlink-live-'+oldId);if(b)b.textContent='Ajuste ao vivo (1 s)';
	},
	startStarlinkAlignment: function(wanName){
		wanName=String(wanName||'wan');this.stopStarlinkAlignment();this.starlinkTelemetryActive=true;this.starlinkTelemetryWan=wanName;if(!this._starlinkVisibilityBound){this._starlinkVisibilityBound=true;document.addEventListener('visibilitychange',L.bind(function(){if(document.hidden)this.stopStarlinkAlignment();},this));window.addEventListener('pagehide',L.bind(this.stopStarlinkAlignment,this));}const b=document.getElementById('ex-starlink-live-'+portDomId(wanName));if(b)b.textContent='Finalizar ajuste';this.starlinkTelemetryStopTimer=window.setTimeout(L.bind(this.stopStarlinkAlignment,this),300000);this.readStarlinkTelemetry(wanName);
	},
	finishStarlinkAndNext: function(wanName){
		wanName=String(wanName||this.starlinkTelemetryWan||'wan');this.stopStarlinkAlignment();const current=document.getElementById('ex-starlink-wan-'+portDomId(wanName));if(current)current.open=false;const order=this.starlinkWanOrder||[],index=order.indexOf(wanName);let next=null;for(let offset=1;offset<=order.length;offset++){const candidate=order[(Math.max(index,0)+offset)%order.length],result=this.starlinkResults[candidate];if(candidate!==wanName&&(!result||!result.aligned)){next=candidate;break;}}if(next){const panel=document.getElementById('ex-starlink-wan-'+portDomId(next));if(panel)panel.open=true;this.startStarlinkAlignment(next);}else ui.addNotification(null,E('p',{},['Todas as antenas detectadas foram verificadas.']));
	},
	readStarlinkTelemetry: function(wanName){
		wanName=String(wanName||this.starlinkTelemetryWan||'wan');const wanId=portDomId(wanName),box=document.getElementById('ex-starlink-telemetry-'+wanId);
		if(box && !this.starlinkTelemetryActive)box.textContent='Consultando a antena…';
		/* cgi-exec avoids the rpcd command timeout on routers where the dish query briefly waits for 192.168.100.1. */
		return fs.exec_direct('/usr/sbin/equipe-dashboard-control',['starlink-telemetry',wanName],'json',false,true).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'A antena não respondeu');
			let d={};try{if(r&&r.stdout)d=JSON.parse(r.stdout);else d=(r&&r.telemetry)||r||{};}catch(e){throw new Error('Resposta de telemetria inválida');}
			const azTolerance=10, elTolerance=8, pct=(Number(d.fraction_obstructed||0)*100).toFixed(1), down=(Number(d.downlink_bps||0)/1000000).toFixed(1), up=(Number(d.uplink_bps||0)/1000000).toFixed(1), azValue=Number(d.bore_azimuth_deg||0), azTargetValue=Number(d.desired_azimuth_deg||0), elValue=Number(d.elevation_deg||0), elTargetValue=Number(d.desired_elevation_deg||0), az=(((azValue%360)+360)%360).toFixed(1), azTarget=(((azTargetValue%360)+360)%360).toFixed(1), el=elValue.toFixed(1), elTarget=elTargetValue.toFixed(1), tilt=Number(d.tilt_angle_deg||0).toFixed(1), attitude=String(d.attitude||'—').replace(/_/g,' '), azDiff=Math.abs(((azValue-azTargetValue+540)%360)-180), elDiff=Math.abs(elValue-elTargetValue), alignmentHint=(azDiff<=azTolerance&&elDiff<=elTolerance)?'ALINHADA • dentro da margem':'AJUSTE RECOMENDADO';
			if(box)box.innerHTML='Obstrução <strong>'+pct+'%</strong>  •  Latência <strong>'+Number(d.latency_ms||0).toFixed(0)+' ms</strong>  •  ↓ '+down+' Mbps  •  ↑ '+up+' Mbps  •  GPS '+(d.gps_sats||0)+' satélites  •  Atitude <strong>'+attitude+'</strong>  •  <strong>'+alignmentHint+'</strong>  •  Azimute '+az+'° (alvo '+azTarget+'°)  •  Elevação '+el+'° (alvo '+elTarget+'°)  •  Inclinação '+tilt+'°  •  Firmware '+(d.software||'—');
			const orientation=document.getElementById('ex-starlink-orientation-'+wanId);
			if(orientation){
				const norm=function(v){return ((v%360)+360)%360;}, current=norm(azValue), target=norm(azTargetValue), turn=((target-current+540)%360)-180, turnDeg=Math.round(Math.abs(turn)), verticalDeg=Math.round(elDiff), horizontalOk=azDiff<=azTolerance, verticalOk=elDiff<=elTolerance, allOk=horizontalOk&&verticalOk;
				const sector=function(cx,cy,r,centerDeg,spanDeg){const rad=Math.PI/180,start=(centerDeg-spanDeg/2)*rad,end=(centerDeg+spanDeg/2)*rad,x1=cx+r*Math.cos(start),y1=cy+r*Math.sin(start),x2=cx+r*Math.cos(end),y2=cy+r*Math.sin(end);return 'M'+cx+','+cy+' L'+x1.toFixed(2)+','+y1.toFixed(2)+' A'+r+','+r+' 0 '+(spanDeg>180?1:0)+' 1 '+x2.toFixed(2)+','+y2.toFixed(2)+' Z';};
				let rotationDots='',tiltDots='';for(let i=0;i<72;i++){const pos=i%18;if(pos!==0&&pos!==1&&pos!==17){const a=(i*5-90)*Math.PI/180;rotationDots+='<circle cx="'+(100+78*Math.cos(a)).toFixed(2)+'" cy="'+(100+78*Math.sin(a)).toFixed(2)+'" r="1.4"/>';}}for(let i=0;i<=18;i++){const a=i*5*Math.PI/180;tiltDots+='<circle cx="'+(34+132*Math.cos(a)).toFixed(2)+'" cy="'+(166-132*Math.sin(a)).toFixed(2)+'" r="1.4"/>';}
				const direction=horizontalOk?'Dentro da faixa — não gire':(turn>0?'Gire a base para a DIREITA':'Gire a base para a ESQUERDA'), vertical=verticalOk?'Dentro da faixa — não incline':(elValue>elTargetValue?'ABAIXE a borda da frente':'LEVANTE a borda da frente'), finish=allOk?'Tudo certo: alinhamento dentro da margem aceita pelo aplicativo':'Ajuste somente o mostrador vermelho e consulte novamente';
				orientation.innerHTML='<div class="ex-alignment-head"><strong>'+alignmentHint+'</strong><small>Faixa sombreada = posição aceita • agulha laranja = posição atual</small></div><div class="ex-alignment-dials"><section class="ex-alignment-dial '+(horizontalOk?'ok':'bad')+'"><div class="ex-dial-head"><b>1. ROTAÇÃO HORIZONTAL</b><span>'+(horizontalOk?'ALINHADA':'AJUSTAR')+'</span></div><svg viewBox="0 0 200 200" role="img" aria-label="Mostrador de rotação horizontal">'+rotationDots+'<path class="ex-dial-wedge" d="'+sector(100,100,77,target-90,azTolerance*2)+'"/><text x="100" y="16">N</text><text x="184" y="104">L</text><text x="100" y="193">S</text><text x="16" y="104">O</text><g class="ex-dial-pointer" transform="rotate('+current+' 100 100)"><rect x="83" y="77" width="34" height="46" rx="3"/><line x1="100" y1="100" x2="100" y2="24"/></g><circle class="ex-dial-pivot" cx="100" cy="100" r="5"/></svg><em>'+direction+(horizontalOk?'':' • ~'+turnDeg+'°')+'</em><small>Atual '+az+'° • faixa aceita '+(target-azTolerance).toFixed(0)+'° a '+(target+azTolerance).toFixed(0)+'°</small></section><section class="ex-alignment-dial '+(verticalOk?'ok':'bad')+'"><div class="ex-dial-head"><b>2. INCLINAÇÃO VERTICAL</b><span>'+(verticalOk?'ALINHADA':'AJUSTAR')+'</span></div><svg viewBox="0 0 200 200" role="img" aria-label="Vista lateral da inclinação da antena">'+tiltDots+'<path class="ex-dial-wedge" d="'+sector(34,166,130,-elTargetValue,elTolerance*2)+'"/><text x="28" y="190">HORIZONTE 0°</text><text x="157" y="32">CÉU 90°</text><line class="ex-dial-ground" x1="8" y1="183" x2="82" y2="183"/><line class="ex-dial-mast" x1="34" y1="183" x2="34" y2="166"/><g class="ex-dial-pointer" transform="rotate('+(-elValue)+' 34 166)"><line x1="34" y1="166" x2="166" y2="166"/></g><g class="ex-dial-dish" transform="rotate('+(90-elValue)+' 34 166)"><rect x="0" y="159" width="68" height="14" rx="4"/></g><circle class="ex-dial-pivot" cx="34" cy="166" r="5"/></svg><em>'+vertical+(verticalOk?'':' • ~'+verticalDeg+'°')+'</em><small>A placa branca inclina; a agulha laranja mostra para onde ela aponta</small><small>Atual '+el+'° • faixa aceita '+Math.max(0,elTargetValue-elTolerance).toFixed(0)+'° a '+Math.min(90,elTargetValue+elTolerance).toFixed(0)+'°</small></section></div><small class="ex-align-finish">3. '+finish+'</small>';
				const dropRate=Number(d.drop_rate),obstructionNow=String(d.currently_obstructed||'').toLowerCase()==='true',uptime=Number(d.uptime||0),obDur=Number(d.avg_obstruction_dur),snr=String(d.snr_above_noise||'').toLowerCase()==='true',eth=Number(d.eth_speed_mbps),alerts=['al_heating','al_motors','al_psu_throttle','al_throttle','al_slow_eth','al_unexpected_location'].filter(function(k){return String(d[k]||'').toLowerCase()==='true';});
				if(box){const old=box.querySelector('.ex-starlink-diagnostics');if(old)old.remove();const fmtUp=uptime?Math.floor(uptime/3600)+' h '+Math.floor((uptime%3600)/60)+' min':'—',fmtDur=Number.isFinite(obDur)&&obDur?obDur.toFixed(1)+' s':'—',fmtDrop=Number.isFinite(dropRate)?dropRate.toFixed(2)+'%':'—';box.insertAdjacentHTML('beforeend','<div class="ex-starlink-diagnostics"><strong>Diagnóstico</strong><span>Perda <b>'+fmtDrop+'</b></span><span>Obstruída agora <b>'+(obstructionNow?'sim':'não')+'</b></span><span>Tempo obstrução <b>'+fmtDur+'</b></span><span>Uptime <b>'+fmtUp+'</b></span><span>SNR <b>'+(snr?'normal':'baixo/não informado')+'</b></span><span>Ethernet <b>'+(eth?eth+' Mbps':'—')+'</b></span><span>Alertas <b>'+(alerts.length?alerts.join(', '):'nenhum')+'</b></span></div>');}
			}
			this.starlinkResults[wanName]={aligned:azDiff<=azTolerance&&elDiff<=elTolerance,at:Date.now(),obstruction:pct};const statusPill=document.getElementById('ex-starlink-result-'+wanId);if(statusPill){statusPill.className='ex-pill '+(this.starlinkResults[wanName].aligned?'online':'offline');statusPill.textContent=this.starlinkResults[wanName].aligned?'ALINHADA':'AJUSTAR';}if(this.starlinkTelemetryActive&&this.starlinkTelemetryWan===wanName)this.starlinkTelemetryTimer=window.setTimeout(L.bind(this.readStarlinkTelemetry,this,wanName),1000);
		},this)).catch(function(e){if(box)box.textContent='Telemetria indisponível: '+e.message;ui.addNotification(null,E('p',{},[e.message]),'danger');});
	}
};
