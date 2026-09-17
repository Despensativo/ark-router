// /src/modules/adblock.js - ARK Router LuCI View Module
const adblockMethods = {
	adblockCard: function(){
		const f = this.feature('adblock') || {};
		const installed = !!f.installed;
		const active = !!f.active;
		const mode = f.mode || 'none';
		const profile = f.supported_profile || 'lite';
		const rules = f.rules_count || 0;
		const isFull = (profile === 'full');
		const self = this;

		let statusText = 'OPCIONAL';
		let pillClass = 'standby';
		if (active) {
			statusText = (mode === 'local') ? 'ATIVO (LOCAL)' : 'ATIVO (NUVEM)';
			pillClass = 'online';
		} else if (installed) {
			statusText = 'DESLIGADO';
			pillClass = 'standby';
		}

		const hasAdguard = !!(f.installed || f.local_installed || mode === 'local' || f.adguard_installed);

		const toggleInput = E('input', {
			type: 'checkbox',
			checked: active ? '' : null,
			change: function(ev) {
				const input = ev.currentTarget;
				const desired = !!input.checked;
				input.disabled = true;
				fs.exec('/usr/sbin/equipe-dashboard-control', ['adblock-toggle', desired ? '1' : '0']).then(function(r) {
					if (r.code) throw new Error(r.stderr || 'Falha ao alterar bloqueador');
					ui.addNotification(null, E('p', {}, [desired ? 'Bloqueador ativado. Recarregando painel…' : 'Bloqueador desativado e DNS Turbo restaurado. Recarregando painel…']));
					window.setTimeout(function(){
						window.location.reload();
					}, 1400);
				}).catch(function(e) {
					input.checked = !desired;
					input.disabled = false;
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				});
			}
		});
		toggleInput.checked = !!active;

		const switchControl = E('div', { class: 'ex-device-switch-control' }, [
			E('strong', { class: 'ex-device-switch-state' }, [active ? 'LIGADA' : 'DESLIGADA']),
			E('label', { class: 'ex-switch' }, [
				toggleInput,
				E('span', { class: 'ex-switch-slider' })
			])
		]);

		const cacheLabel = (mode === 'local') ?
			((f.cache_size_mb || 64) + ' MB em RAM') :
			((f.cloud_cache ? Number(f.cloud_cache).toLocaleString('pt-BR') : '25.000') + ' domínios (0ms)');

		const activeProtections = [];
		if (f.protection_enabled !== false) activeProtections.push('🛡️ Malware');
		if (f.parental_enabled) activeProtections.push('👨‍👩‍👧 Adulto');
		if (f.safesearch_enabled) activeProtections.push('🔍 SafeSearch');
		const protectionsText = activeProtections.length ? activeProtections.join(' • ') : 'Padrão';

		const adblockPill = E('span', { class: 'ex-pill ' + pillClass }, [statusText]);
		const adblockTitleActions = E('div', { class: 'ex-card-title-actions' }, [
			adblockPill
		]);
		const adblockTitle = E('div', { class: 'ex-card-title' }, [
			E('div', {}, [
				E('span', { class: 'ex-kicker' }, ['SEGURANÇA & PRIVACIDADE']),
				E('h3', {}, ['Bloqueador de Anúncios'])
			]),
			adblockTitleActions
		]);

		const adblockBody = E('div', { class: 'ex-card-collapse-body' }, [
			E('div', { class: 'ex-card-collapse-inner' }, [
				E('p', { class: 'ex-muted' }, [
					'Bloqueia propagandas, popups invasivos, anúncios em Smart TVs e rastreadores na rede inteira antes mesmo de chegarem aos aparelhos.'
				]),
				active ? E('div', { class: 'ex-grid ex-grid-4 ex-qos-grid', style: 'margin-bottom: 12px;' }, [
					E('div', { class: 'ex-row' }, [
						E('span', {}, ['Modo']),
						E('strong', {}, [mode === 'local' ? 'AdGuard Home (Local)' : 'Anycast (Nuvem)'])
					]),
					E('div', { class: 'ex-row' }, [
						E('span', {}, ['Filtragem']),
						E('strong', {}, [rules > 0 ? (rules.toLocaleString('pt-BR') + ' regras') : 'Ativa'])
					]),
					E('div', { class: 'ex-row' }, [
						E('span', {}, ['Cache em RAM']),
						E('strong', {}, [cacheLabel])
					]),
					E('div', { class: 'ex-row' }, [
						E('span', {}, ['Proteções']),
						E('strong', {}, [protectionsText])
					])
				]) : '',
				E('div', { class: 'ex-speedify-actions' }, [
					!active ? E('button', {
						class: 'ex-mini-button',
						style: 'font-weight: 700;',
						click: function() { self.openAdblockSetupModal(f); }
					}, ['▶ Ativar Bloqueador']) : switchControl,
					(active && mode === 'local') ? E('button', {
						class: 'ex-mini-button',
						style: 'font-weight: 700;',
						click: function() { self.openAdguardWithSSO(f); }
					}, ['Abrir Painel AdGuard ↗']) : '',
					(active && mode === 'local' && f.zt_web_url) ? E('a', {
						class: 'ex-mini-button',
						style: 'background: rgba(16, 185, 129, 0.18); border-color: rgba(16, 185, 129, 0.4);',
						href: f.zt_web_url,
						target: '_blank',
						rel: 'noopener noreferrer'
					}, ['Abrir via ZeroTier ↗']) : '',
					active ? E('button', {
						class: 'ex-mini-button',
						style: 'font-weight: 750; padding: 7px 12px; margin-left: 6px;',
						click: function() { self.openAdblockSetupModal(f); }
					}, ['⚙️ Configurar Bloqueio']) : '',
					hasAdguard ? E('button', {
						class: 'ex-mini-button',
						style: 'color: #ef4444; border-color: rgba(239, 68, 68, 0.35); margin-left: auto; font-weight: 700;',
						click: function() { self.openAdguardUninstallModal(f); }
					}, ['🗑️ Desinstalar AdGuard Home']) : ''
				]),
				E('small', { class: 'ex-muted' }, [
					active ? (mode === 'local' ? ('AdGuard Home operando em RAM com cache de ' + (f.cache_size_mb || 64) + ' MB e DoH.') : ('Nuvem filtrada ativa com super cache dnsmasq respondendo em 0ms.')) : (isFull ? ('💡 Hardware potente (' + (f.mem_total_mb || '1024') + ' MB RAM): suporte completo ao AdGuard Home local em RAM.') : ((f.mem_total_mb >= 300) ? ('⚠️ RAM compatível (' + f.mem_total_mb + ' MB), mas armazenamento interno livre (' + (f.overlay_free_mb || Math.round((f.overlay_free_kb || 0)/1024)) + ' MB) menor que 15 MB. Libere espaço na Flash para desbloquear o AdGuard Home local completo.') : '💡 Hardware compacto: filtragem em nuvem com super-cache dnsmasq em 0ms.'))
				])
			])
		]);

		const adblockCardEl = E('section', { class: 'ex-card ex-adblock-card' }, [
			adblockTitle,
			adblockBody
		]);

		const adblockAccordion = setupCardAccordion({
			id: 'adblock',
			cardEl: adblockCardEl,
			titleEl: adblockTitle,
			bodyEl: adblockBody,
			isActive: active
		});
		adblockTitleActions.appendChild(adblockAccordion.expandBtn);

		return adblockCardEl;
	},
	openAdguardWithSSO: function(f) {
		const self = this;
		const targetUrl = (window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') ?
			('http://' + window.location.hostname + ':' + (f.web_port || 3000)) :
			(f.web_url || ('http://' + window.location.hostname + ':' + (f.web_port || 3000)));

		fs.exec('/usr/sbin/equipe-dashboard-control', ['adblock-sso-login']).then(function(r) {
			let res = {};
			try { res = JSON.parse(r.stdout || '{}'); } catch(e) {}
			if (res.status === 'ok') {
				if (res.token) {
					document.cookie = 'agh_session=' + res.token + '; path=/; max-age=31536000; SameSite=Lax';
				}
				window.open(targetUrl, '_blank', 'noopener,noreferrer');
				return;
			}
			self.openAdguardSSOModal(f, targetUrl);
		}).catch(function() {
			window.open(targetUrl, '_blank', 'noopener,noreferrer');
		});
	},
	openAdguardSSOModal: function(f, targetUrl) {
		const pwdInput = E('input', {
			type: 'password',
			class: 'cbi-input-text',
			style: 'width: 100%; margin-top: 6px;',
			placeholder: 'Digite a senha do AdGuard / Roteador'
		});
		const statusMsg = E('div', { style: 'color: #ef4444; font-size: 13px; margin-top: 6px; display: none;' });

		const submitBtn = E('button', {
			class: 'btn cbi-button cbi-button-positive',
			click: function() {
				const pass = pwdInput.value.trim();
				if (!pass) return;
				submitBtn.disabled = true;
				submitBtn.textContent = 'Conectando…';
				statusMsg.style.display = 'none';

				fs.exec('/usr/sbin/equipe-dashboard-control', ['adblock-sso-login', pass]).then(function(r) {
					let res = {};
					try { res = JSON.parse(r.stdout || '{}'); } catch(e) {}
					if (res.status === 'ok') {
						if (res.token) {
							document.cookie = 'agh_session=' + res.token + '; path=/; max-age=31536000; SameSite=Lax';
						}
						ui.hideModal();
						window.open(targetUrl, '_blank', 'noopener,noreferrer');
					} else {
						submitBtn.disabled = false;
						submitBtn.textContent = 'Conectar e Abrir Painel';
						statusMsg.textContent = res.message || 'Senha incorreta. Tente novamente.';
						statusMsg.style.display = 'block';
					}
				}).catch(function(err) {
					submitBtn.disabled = false;
					submitBtn.textContent = 'Conectar e Abrir Painel';
					statusMsg.textContent = 'Erro ao conectar: ' + (err && err.message ? err.message : err);
					statusMsg.style.display = 'block';
				});
			}
		}, ['Conectar e Abrir Painel']);

		ui.showModal('Acesso Direto AdGuard Home (1-Clique)', [
			E('p', {}, ['Para sincronizar o acesso direto com 1 clique a partir do ARK Router, digite a senha da conta ', E('b', {}, ['admin']), ' do AdGuard Home (geralmente a mesma senha do roteador):']),
			E('div', { class: 'cbi-value' }, [
				E('label', { class: 'cbi-value-title' }, ['Senha do AdGuard:']),
				E('div', { class: 'cbi-value-field' }, [pwdInput, statusMsg])
			]),
			E('p', { class: 'ex-muted', style: 'margin-top: 10px; font-size: 12px;' }, [
				'💡 A senha é armazenada de forma protegida e segura pelo sistema (root). Dispositivos que acessarem a porta 3000 por fora continuarão sendo barrados na tela de login por senha.'
			]),
			E('div', { class: 'right', style: 'margin-top: 16px;' }, [
				E('button', {
					class: 'btn cbi-button cbi-button-neutral',
					click: ui.hideModal
				}, ['Cancelar']),
				' ',
				E('a', {
					class: 'btn cbi-button',
					style: 'margin-right: 8px;',
					href: targetUrl,
					target: '_blank',
					rel: 'noopener noreferrer',
					click: ui.hideModal
				}, ['Abrir tela de login tradicional ↗']),
				' ',
				submitBtn
			])
		]);
		pwdInput.focus();
	},
	openAdguardUninstallModal: function(f) {
		const self = this;
		let countdown = 5;
		let timer = null;

		const confirmBtn = E('button', {
			class: 'btn cbi-button cbi-button-negative',
			disabled: true,
			style: 'opacity: 0.55; cursor: not-allowed; font-weight: 700;',
			click: function() {
				if (countdown > 0) return;
				if (timer) { clearInterval(timer); timer = null; }
				confirmBtn.disabled = true;

				ui.showModal('Desinstalando AdGuard Home', [
					E('p', {}, ['Encerrando serviços, removendo pacotes/arquivos e religando o DNS padrão e DNS Turbo (All-Servers)…']),
					E('div', { class: 'spinning', style: 'margin: 16px auto; text-align: center;' }, ['Aguarde…'])
				]);

				fs.exec('/usr/sbin/equipe-dashboard-control', ['adblock-uninstall']).then(function(r) {
					if (r && r.code) throw new Error(r.stderr || 'Falha ao desinstalar AdGuard Home');
					ui.addNotification(null, E('p', {}, ['AdGuard Home desinstalado com sucesso. DNS padrão e DNS Turbo (All-Servers) religados. Recarregando painel…']));
					window.setTimeout(function(){
						window.location.reload();
					}, 1600);
				}).catch(function(err) {
					var msg = (err && err.message) ? err.message : String(err || '');
					if (msg.indexOf('XHR') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('Failed to fetch') !== -1) {
						ui.addNotification(null, E('p', {}, ['AdGuard Home desinstalado com sucesso. Recarregando painel…']));
						window.setTimeout(function(){
							window.location.reload();
						}, 1600);
						return;
					}
					ui.hideModal();
					ui.addNotification(null, E('p', {}, ['Erro ao desinstalar AdGuard Home: ' + msg]), 'danger');
				});
			}
		}, ['Desinstalar agora (5s)']);

		const cancelBtn = E('button', {
			class: 'btn cbi-button cbi-button-neutral',
			click: function() {
				if (timer) { clearInterval(timer); timer = null; }
				ui.hideModal();
			}
		}, ['Cancelar']);

		timer = setInterval(function() {
			if (!document.contains(confirmBtn)) {
				clearInterval(timer);
				timer = null;
				return;
			}
			countdown--;
			if (countdown > 0) {
				confirmBtn.textContent = 'Desinstalar agora (' + countdown + 's)';
			} else {
				clearInterval(timer);
				timer = null;
				confirmBtn.disabled = false;
				confirmBtn.style.opacity = '1';
				confirmBtn.style.cursor = 'pointer';
				confirmBtn.textContent = 'Confirmar Desinstalação';
			}
		}, 1000);

		ui.showModal('⚠️ Desinstalar AdGuard Home Completamente', [
			E('div', { class: 'alert-message danger', style: 'margin-bottom: 14px;' }, [
				E('strong', {}, ['⚠️ Atenção: ']),
				'Esta ação removerá completamente o AdGuard Home deste roteador.'
			]),
			E('ul', { style: 'margin-left: 20px; line-height: 1.6; font-size: 13px;' }, [
				E('li', {}, ['O serviço AdGuard Home será encerrado e desativado imediatamente.']),
				E('li', {}, ['O binário executável, configurações, regras salvas e diretórios em Flash/RAM serão excluídos.']),
				E('li', {}, ['Todas as regras personalizadas e portas de firewall serão limpas sem resíduos.']),
				E('li', {}, [
					E('b', {}, ['O DNS do sistema será religado automaticamente']),
					' para os servidores padrão ultra-rápidos (Cloudflare / Google) e o ',
					E('b', { style: 'color: #10b981;' }, ['DNS Turbo Paralelo (All-Servers) será reativado']),
					'.'
				])
			]),
			E('p', { class: 'ex-muted', style: 'margin-top: 14px; font-size: 12px;' }, [
				'Para evitar cliques acidentais, aguarde 5 segundos para liberar a confirmação.'
			]),
			E('div', { class: 'right', style: 'margin-top: 18px; display: flex; gap: 8px; justify-content: flex-end;' }, [
				cancelBtn,
				confirmBtn
			])
		]);
	},
	openAdblockSetupModal: function(f){
		const self = this;
		const isFull = (f.supported_profile === 'full');
		const active = !!f.active;
		let chosenMode = f.mode && f.mode !== 'none' ? f.mode : (isFull ? 'local' : 'cloud');
		let chosenProvider = f.cloud_provider || 'adguard_dns';

		const localRadio = E('input', { type: 'radio', name: 'adblock_mode', value: 'local' });
		const cloudRadio = E('input', { type: 'radio', name: 'adblock_mode', value: 'cloud' });
		if (chosenMode === 'local') {
			localRadio.checked = true;
			cloudRadio.checked = false;
		} else {
			cloudRadio.checked = true;
			localRadio.checked = false;
		}

		// Cache em RAM do AdGuard Home Local
		const recCache = f.recommended_cache_mb || (f.mem_total_mb >= 700 ? 64 : (f.mem_total_mb >= 380 ? 32 : 16));
		const curCache = f.cache_size_mb || recCache;
		const cacheSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; margin-top: 6px;' }, [
			E('option', { value: '8' }, ['8 MB em RAM (Econômico — Roteadores de 256MB a 300MB)']),
			E('option', { value: '16' }, ['16 MB em RAM (Equilibrado — Roteadores de 300MB a 512MB)']),
			E('option', { value: '32' }, ['32 MB em RAM (Ideal para roteadores de 512MB)']),
			E('option', { value: '64' }, ['64 MB em RAM (Alto Desempenho — Roteadores de 1GB)']),
			E('option', { value: '128' }, ['128 MB em RAM (Extremo — 1GB+ e x86)'])
		]);
		cacheSelect.value = String(curCache);

		// Helper para criar Toggles visuais modernos
		const makeToggleRow = function(title, desc, checked) {
			const input = E('input', { type: 'checkbox' });
			input.checked = !!checked;
			const label = E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
				input,
				E('span', { class: 'ex-switch-slider' })
			]);
			const row = E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; padding: 10px 12px; background: rgba(255,255,255,.03); border-radius: 8px;' }, [
				E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
					E('strong', { style: 'font-size: 0.88rem; display: block;' }, [title]),
					E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px; line-height: 1.35;' }, [desc])
				]),
				label
			]);
			return { row: row, input: input };
		};

		const protMalware = makeToggleRow(
			'🛡️ Navegação Segura (Anti-Malware & Phishing)',
			'Bloqueia sites maliciosos, golpes financeiros e endereços perigosos antes que sejam abertos.',
			f.protection_enabled !== false
		);

		const protParental = makeToggleRow(
			'👨‍👩‍👧 Controle Parental (Bloqueio Adulto)',
			'Bloqueia automaticamente pornografia e conteúdos impróprios para menores na rede toda.',
			!!f.parental_enabled
		);

		const protSafeSearch = makeToggleRow(
			'🔍 Busca Segura Forçada (SafeSearch)',
			'Obriga o filtro de família no Google, Bing, YouTube e DuckDuckGo para proteger crianças.',
			!!f.safesearch_enabled
		);

		const portInput = E('input', {
			type: 'number',
			class: 'cbi-input-text',
			style: 'width: 110px; text-align: center; font-weight: 600;',
			min: '80',
			max: '65535',
			value: String(f.web_port || 3000)
		});

		const portRow = E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; padding: 10px 12px; background: rgba(255,255,255,.03); border-radius: 8px;' }, [
			E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
				E('strong', { style: 'font-size: 0.88rem; display: block;' }, ['🔌 Porta Web do AdGuard']),
				E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px; line-height: 1.35;' }, [
					'Porta usada para acessar a interface administrativa local (padrão: 3000).'
				])
			]),
			portInput
		]);

		const protZeroTier = makeToggleRow(
			'🌐 Permitir Acesso Remoto via ZeroTier',
			'Abre a porta do AdGuard no firewall para conexões vindas da sua rede virtual ZeroTier. Quando desativado, apenas a rede local (LAN) consegue abrir o painel.',
			f.zerotier_access !== false
		);

		const localConfigWrap = E('div', { style: 'margin-top: 10px; padding: 12px; background: rgba(255,255,255,.02); border-radius: 8px;' }, [
			E('label', { style: 'font-size: 0.85rem; font-weight: 600;' }, ['Tamanho do Cache DNS em RAM']),
			cacheSelect,
			E('small', { class: 'ex-muted', style: 'display: block; margin-top: 4px;' }, [
				'💡 Hardware: ' + (f.mem_total_mb ? f.mem_total_mb + ' MB de RAM total detectada. ' : '') + 'Recomendado para este modelo: ' + recCache + ' MB.'
			]),
			E('div', { style: 'margin-top: 14px; font-size: 0.85rem; font-weight: 600;' }, ['Acesso & Rede']),
			portRow,
			protZeroTier.row,
			E('div', { style: 'margin-top: 14px; font-size: 0.85rem; font-weight: 600;' }, ['Proteções Essenciais']),
			protMalware.row,
			protParental.row,
			protSafeSearch.row
		]);

		// Nuvem (Lite)
		const providerSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; margin-top: 6px;' }, [
			E('option', { value: 'adguard_dns' }, ['AdGuard DNS (Anúncios + Rastreadores — Anycast SP ~14ms)']),
			E('option', { value: 'cloudflare_security' }, ['Cloudflare 1.1.1.2 Segurança (Malware & Phishing — ~6ms)']),
			E('option', { value: 'cloudflare_family' }, ['Cloudflare 1.1.1.3 Família (Malware + Pornografia/Adulto — ~6ms)']),
			E('option', { value: 'quad9' }, ['Quad9 9.9.9.9 Segurança (Cibersegurança +20 Órgãos Globais — ~8ms)']),
			E('option', { value: 'opendns_family' }, ['OpenDNS FamilyShield (Cisco Anycast Adulto + Phishing — ~12ms)']),
			E('option', { value: 'cleanbrowsing_adult' }, ['CleanBrowsing Adult Filter (Pornografia e Explícito — ~18ms)']),
			E('option', { value: 'cleanbrowsing_family' }, ['CleanBrowsing Family Filter (Adulto + Apostas/Bets + SafeSearch — ~18ms)']),
			E('option', { value: 'controld_full' }, ['Control D Full Blocker (Anúncios + Pornografia + Cassinos/Apostas — ~15ms)']),
			E('option', { value: 'nextdns' }, ['NextDNS Personalizado (Seu Perfil com ID — Anycast BR ~12ms)'])
		]);
		providerSelect.value = chosenProvider;

		const nextdnsIdInput = E('input', {
			type: 'text',
			class: 'cbi-input-text',
			style: 'width: 100%; margin-top: 6px; font-family: monospace; font-weight: 700;',
			placeholder: 'Ex: a1b2c3',
			value: f.nextdns_id || ''
		});

		const nextdnsWrap = E('div', {
			style: 'margin-top: 10px; padding: 10px 12px; background: rgba(59,130,246,.08); border-radius: 8px; border: 1px solid rgba(59,130,246,.25);'
		}, [
			E('label', { style: 'font-size: 0.82rem; font-weight: 700; color: var(--ex-primary-safe, #3b82f6);' }, ['ID de Configuração do NextDNS']),
			nextdnsIdInput,
			E('small', { class: 'ex-muted', style: 'display: block; margin-top: 5px; font-size: 0.78rem; line-height: 1.35;' }, [
				'💡 O NextDNS opera com servidores Anycast de baixíssima latência no Brasil (SP, RJ, Fortaleza e Curitiba — ~12ms). Requer criar uma conta gratuita no site ',
				E('a', { href: 'https://nextdns.io', target: '_blank', rel: 'noopener noreferrer', style: 'font-weight: 700; text-decoration: underline;' }, ['nextdns.io']),
				' para gerar o seu ID de perfil personalizado.'
			])
		]);

		const updateNextDnsVisibility = function() {
			nextdnsWrap.style.display = (providerSelect.value === 'nextdns') ? 'block' : 'none';
		};
		providerSelect.addEventListener('change', updateNextDnsVisibility);
		updateNextDnsVisibility();

		const cloudCacheSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; margin-top: 6px;' }, [
			E('option', { value: '10000' }, ['10.000 domínios (~1 MB RAM — Roteadores de 128MB)']),
			E('option', { value: '25000' }, ['25.000 domínios (~2.5 MB RAM — Recomendado)']),
			E('option', { value: '50000' }, ['50.000 domínios (~5 MB RAM — Roteadores com folga)'])
		]);
		cloudCacheSelect.value = String(f.cloud_cache || 25000);

		const cloudWrap = E('div', { style: 'margin-top: 10px; padding: 12px; background: rgba(255,255,255,.03); border-radius: 8px;' }, [
			E('label', { style: 'font-size: 0.85rem; font-weight: 600;' }, ['Provedor em Nuvem']),
			providerSelect,
			nextdnsWrap,
			E('label', { style: 'font-size: 0.85rem; font-weight: 600; display: block; margin-top: 10px;' }, ['Super-Cache dnsmasq em RAM']),
			cloudCacheSelect,
			E('small', { class: 'ex-muted', style: 'display: block; margin-top: 4px;' }, ['O super-cache no dnsmasq responde em 0ms para todas as consultas repetidas da casa.'])
		]);

		const updateVisibility = function() {
			if (localConfigWrap) localConfigWrap.style.display = localRadio.checked ? 'block' : 'none';
			if (cloudWrap) cloudWrap.style.display = cloudRadio.checked ? 'block' : 'none';
		};

		localRadio.addEventListener('change', updateVisibility);
		cloudRadio.addEventListener('change', updateVisibility);
		updateVisibility();

		const blacklistSyncBtn = E('button', {
			class: 'btn cbi-button cbi-button-action',
			style: 'padding: 6px 14px; font-weight: 700; font-size: 0.82rem; background: rgba(239,68,68,.15); border: 1px solid rgba(239,68,68,.35); color: #f87171; white-space: nowrap;',
			click: function(ev) {
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = '🔄 Sincronizando…';
				fs.exec('/usr/sbin/equipe-dashboard-control', ['adblock-blacklist-sync']).then(function(r) {
					btn.disabled = false;
					btn.textContent = '🔄 Sincronizar Bets & Ameaças';
					if (r.code) throw new Error(r.stderr || 'Falha ao sincronizar lista negra');
					let data = {};
					try { data = JSON.parse(r.stdout); } catch(e) {}
					const added = data.added || 0;
					const total = data.total || 0;
					if (data.blacklist) {
						blacklistTextarea.value = data.blacklist.replace(/,/g, ', ');
					}
					ui.addNotification(null, E('p', {}, [
						added > 0
							? ('✅ Lista de bloqueios sincronizada: ' + added + ' novas regras adicionadas sem duplicatas! (' + total + ' regras ativas).')
							: ('✅ Lista de bloqueios atualizada! Todos os domínios de apostas e golpes já constam na lista (' + total + ' regras ativas). Nenhuma duplicata criada.')
					]), 'success');
				}).catch(function(err) {
					btn.disabled = false;
					btn.textContent = '🔄 Sincronizar Bets & Ameaças';
					ui.addNotification(null, E('p', {}, ['Erro ao sincronizar lista negra: ' + err.message]), 'danger');
				});
			}
		}, ['🔄 Sincronizar Bets & Ameaças']);

		const blacklistText = (f.custom_blacklist || '').replace(/,/g, ', ');
		const blacklistTextarea = E('textarea', {
			class: 'ex-blacklist-input',
			rows: 3,
			style: 'width: 100%; box-sizing: border-box; margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(0,0,0,.25); border: 1px solid rgba(148,163,184,.25); color: #f8fafc; font-family: monospace; font-size: 0.82rem; resize: vertical; line-height: 1.4;',
			placeholder: 'Ex: bet365.com, blaze.com, tigrinho.vip, tiktok.com'
		}, [ blacklistText ]);
		blacklistTextarea.value = blacklistText;

		const blacklistBlock = E('div', {
			class: 'ex-device-config-block',
			style: 'margin-top: 12px; padding: 12px; border-radius: 10px; background: rgba(239,68,68,.05); border: 1px solid rgba(239,68,68,.22);'
		}, [
			E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; flex-wrap: wrap;' }, [
				E('strong', { style: 'font-size: 0.88rem; color: #ef4444;' }, ['🚫 Bloquear Sites Específicos (Lista Negra da Rede)']),
				blacklistSyncBtn
			]),
			E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 0.81rem; line-height: 1.4;' }, [
				'Corta o domínio principal e todos os seus subdomínios instantaneamente em 0ms para todos os aparelhos da casa. Separe múltiplos domínios por vírgula ou espaço.',
				E('span', { style: 'display: block; margin-top: 4px; font-size: 0.77rem; color: #94a3b8;' }, [
					'💡 O botão baixa e adiciona novos domínios catalogados (Bets, Cassinos e Golpes BR) sem apagar as suas regras existentes e sem duplicar.'
				])
			]),
			blacklistTextarea
		]);

		const whitelistSyncBtn = E('button', {
			class: 'btn cbi-button cbi-button-action',
			style: 'padding: 6px 14px; font-weight: 700; font-size: 0.82rem; background: rgba(59,130,246,.15); border: 1px solid rgba(59,130,246,.35); color: #60a5fa; white-space: nowrap;',
			click: function(ev) {
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = '🔄 Sincronizando…';
				fs.exec('/usr/sbin/equipe-dashboard-control', ['adblock-whitelist-sync']).then(function(r) {
					btn.disabled = false;
					btn.textContent = '🔄 Sincronizar Regras de Exceção';
					if (r.code) throw new Error(r.stderr || 'Falha ao sincronizar lista branca');
					let data = {};
					try { data = JSON.parse(r.stdout); } catch(e) {}
					const added = data.added || 0;
					const total = data.total || 0;
					if (data.whitelist) {
						whitelistTextarea.value = data.whitelist.replace(/,/g, ', ');
					}
					ui.addNotification(null, E('p', {}, [
						added > 0
							? ('✅ Lista de exceções sincronizada: ' + added + ' novas regras adicionadas sem duplicatas! (' + total + ' regras ativas).')
							: ('✅ Lista atualizada! Todas as regras oficiais já estão ativas (' + total + ' regras). Nenhuma duplicata criada.')
					]), 'success');
				}).catch(function(err) {
					btn.disabled = false;
					btn.textContent = '🔄 Sincronizar Regras de Exceção';
					ui.addNotification(null, E('p', {}, ['Erro ao sincronizar lista branca: ' + err.message]), 'danger');
				});
			}
		}, ['🔄 Sincronizar Regras de Exceção']);

		const whitelistText = (f.custom_whitelist || '').replace(/,/g, ', ');
		const whitelistTextarea = E('textarea', {
			class: 'ex-whitelist-input',
			rows: 3,
			style: 'width: 100%; box-sizing: border-box; margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(0,0,0,.25); border: 1px solid rgba(148,163,184,.25); color: #f8fafc; font-family: monospace; font-size: 0.82rem; resize: vertical; line-height: 1.4;',
			placeholder: 'Ex: apple.com, play.google.com, github.com, whatsapp.com, gov.br, bb.com.br'
		}, [ whitelistText ]);
		whitelistTextarea.value = whitelistText;

		const whitelistBlock = E('div', {
			class: 'ex-device-config-block',
			style: 'margin-top: 12px; padding: 12px; border-radius: 10px; background: rgba(59,130,246,.05); border: 1px solid rgba(59,130,246,.22);'
		}, [
			E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; flex-wrap: wrap;' }, [
				E('strong', { style: 'font-size: 0.88rem; color: #38bdf8;' }, ['✅ Lista Branca de Serviços Essenciais (Brasil & Mundial)']),
				whitelistSyncBtn
			]),
			E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 0.81rem; line-height: 1.4;' }, [
				'Desbloqueia automaticamente serviços críticos (Apple App Store, Google Play, WhatsApp, GitHub, Gov.br, Bancos BR e PIX) para que filtros agressivos não causem falso-positivos.',
				E('span', { style: 'display: block; margin-top: 4px; font-size: 0.77rem; color: #94a3b8;' }, [
					'💡 O botão compara o que há de novo e adiciona somente as regras faltantes, sem remover suas regras personalizadas e sem criar duplicatas.'
				])
			]),
			whitelistTextarea
		]);

		const modalContent = [
			E('p', {}, [active ? 'Ajuste a memória RAM alocada e as proteções do bloqueador de anúncios:' : 'Escolha como deseja ativar o bloqueio de anúncios e rastreadores neste roteador:']),
			E('div', {
				class: 'ex-device-config-block' + (!isFull ? ' is-restricted' : ''),
				style: 'margin-bottom: 10px; cursor: pointer;' + (!isFull ? ' opacity: 0.88; border: 1px dashed rgba(245, 158, 11, 0.4);' : ''),
				click: function(ev){
					if (!isFull) {
						ui.addNotification(null, E('p', {}, [
							(f.mem_total_mb < 300)
								? ('O AdGuard Home local exige pelo menos 300 MB de RAM física (detectado: ' + f.mem_total_mb + ' MB). Recomendamos a Proteção em Nuvem para este roteador.')
								: ('O AdGuard Home local exige pelo menos 15 MB de espaço livre no armazenamento interno para download e instalação (espaço livre atual: ' + (f.overlay_free_mb || Math.round((f.overlay_free_kb || 0) / 1024)) + ' MB). Libere espaço na Flash para desbloquear a versão completa.')
						]), 'warning');
						return;
					}
					if (ev.target && (ev.target.tagName === 'SELECT' || ev.target.tagName === 'INPUT' || ev.target.closest('label.ex-switch'))) return;
					localRadio.checked = true;
					cloudRadio.checked = false;
					updateVisibility();
				}
			}, [
				E('div', { style: 'display: flex; align-items: flex-start; gap: 10px;' }, [
					isFull ? localRadio : E('span', { class: 'ex-pill standby', style: 'font-size: 0.7rem;' }, ['BLOQUEADO']),
					E('div', {}, [
						E('strong', {}, [
							'🏋️ Motor Local (AdGuard Home) — Versão Completa',
							(active && f.mode === 'local') ? E('span', { class: 'ex-pill online', style: 'margin-left: 8px; font-size: 0.72rem; vertical-align: middle;' }, ['ATIVO NO ROTEADOR']) : '',
							!isFull ? E('span', { class: 'ex-pill offline', style: 'margin-left: 8px; font-size: 0.7rem; vertical-align: middle;' }, [
								f.mem_total_mb < 300 ? 'REQUER 300MB RAM' : ('REQUER 15MB LIVRES (' + (f.overlay_free_mb || Math.round((f.overlay_free_kb || 0)/1024)) + 'MB DISPONÍVEIS)')
							]) : ''
						]),
						E('p', { style: 'margin: 4px 0 0 0; font-size: 0.83rem; line-height: 1.4;' }, [
							isFull
								? 'Roda 100% dentro da memória RAM do seu roteador. Mais de 100.000 regras ativas, cache local em 0ms, DoH criptografado e painel avançado.'
								: ('Versão completa com painel local, estatísticas e listas personalizadas. ' + (f.mem_total_mb < 300 ? ('Requer roteador com 300MB+ de RAM (este possui ' + f.mem_total_mb + ' MB).') : ('Requer 15 MB livres no disco interno para baixar o binário (atualmente ' + (f.overlay_free_mb || Math.round((f.overlay_free_kb || 0)/1024)) + ' MB livres). Libere espaço para ativar.')))
						])
					])
				]),
				isFull ? localConfigWrap : ''
			]),
			E('div', {
				class: 'ex-device-config-block',
				style: 'cursor: pointer;',
				click: function(ev){
					if (ev.target && (ev.target.tagName === 'SELECT' || ev.target.tagName === 'INPUT' || ev.target.closest('label.ex-switch'))) return;
					cloudRadio.checked = true;
					localRadio.checked = false;
					updateVisibility();
				}
			}, [
				E('div', { style: 'display: flex; align-items: flex-start; gap: 10px;' }, [
					cloudRadio,
					E('div', {}, [
						E('strong', {}, [
							'🪶 Proteção em Nuvem (Anycast Brasil)',
							(active && f.mode === 'cloud') ? E('span', { class: 'ex-pill online', style: 'margin-left: 8px; font-size: 0.72rem; vertical-align: middle;' }, ['ATIVO NO ROTEADOR']) : ''
						]),
						E('p', { style: 'margin: 4px 0 0 0; font-size: 0.83rem; line-height: 1.4;' }, [
							'Ultraleve, consome zero espaço flash. Utiliza servidores seguros no Brasil em conjunto com o super-cache em RAM do dnsmasq.'
						])
					])
				]),
				cloudWrap
			]),
			blacklistBlock,
			whitelistBlock,
			E('p', { class: 'alert-message warning', style: 'margin-top: 14px;' }, [
				'O modo All-Servers do DNS Turbo permanece protegido para que consultas paralelas não vazem requisições não filtradas.'
			]),
			E('div', { class: 'right', style: 'margin-top: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;' }, [
				(f.installed || f.local_installed || f.mode === 'local') ? E('button', {
					class: 'btn cbi-button cbi-button-negative',
					style: 'font-weight: 700;',
					click: function() { closeModal(); self.openAdguardUninstallModal(f); }
				}, ['🗑️ Desinstalar AdGuard Home']) : E('span', {}),
				E('div', { style: 'margin-left: auto; display: flex; gap: 8px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Cancelar']),
					E('button', {
					class: 'btn cbi-button cbi-button-positive',
					click: function(ev) {
						const b = ev.currentTarget;
						b.disabled = true;
						b.textContent = active ? 'Salvando…' : 'Ativando…';
						const mode = localRadio.checked ? 'local' : 'cloud';
						const cacheMb = cacheSelect.value;
						const prot = protMalware.input.checked ? '1' : '0';
						const par = protParental.input.checked ? '1' : '0';
						const ss = protSafeSearch.input.checked ? '1' : '0';
						const prov = providerSelect.value;
						const cCache = cloudCacheSelect.value;
						const webPort = parseInt(portInput.value, 10) || 3000;
						const ztAcc = protZeroTier.input.checked ? '1' : '0';
						const rawBlacklist = blacklistTextarea.value.trim();
						const rawWhitelist = whitelistTextarea.value.trim();
						const nextdnsId = nextdnsIdInput.value.trim();

						const cmd = active ? 'adblock-configure' : 'adblock-enable';
						const args = [cmd, mode, (mode === 'local' ? cacheMb : prov), prot, par, ss, prov, cCache, String(webPort), ztAcc, rawBlacklist, nextdnsId, rawWhitelist];

						fs.exec('/usr/sbin/equipe-dashboard-control', args).then(function(r) {
							if (r.code) throw new Error(r.stderr || 'Falha ao configurar bloqueador');
							closeModal();
							self.triggerImmediateRefresh(active ? 'Configurações do bloqueador salvas com sucesso!' : 'Bloqueador de anúncios ativado com sucesso!', 'info');
						}).catch(function(e) {
							b.disabled = false;
							b.textContent = active ? 'Salvar Alterações' : 'Confirmar e Ativar';
							ui.addNotification(null, E('p', {}, [e.message]), 'danger');
						});
					}
				}, [active ? 'Salvar Alterações' : 'Confirmar e Ativar'])
				])
			])
		];

		ui.showModal(active ? '🛡️ Configurações do Bloqueador de Anúncios' : '🛡️ Ativar Bloqueador de Anúncios', modalContent);
	}
};
