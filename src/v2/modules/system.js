// /src/modules/system.js - ARK Router LuCI View Module
const systemMethods = {
	setDashboardLanguage: function(language){
		try {
			if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem('ark_caps');
			if (typeof window !== 'undefined') {
				delete window._arkCapabilities;
				window.dashboardLanguage = language;
			}
			dashboardLanguage = language;
			if (this.capabilities) this.capabilities.language = language;
		} catch(e) {}
		return fs.exec('/usr/sbin/equipe-dashboard-control',['language',language]).then(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao salvar o idioma');
			window.location.reload();
		}).catch(function(e){
			if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
			ui.addNotification(null,E('p',{},[e.message]));
		});
	},
	showLanguageModal: function(){
		const current = this.capabilities.language || dashboardLanguage || 'pt-br';
		const languages = [
			{ code: 'pt-br', flag: '🇧🇷', name: 'Português (Brasil)', desc: _t('Idioma nativo padrão do ARK Router') },
			{ code: 'en', flag: '🇺🇸', name: 'English', desc: _t('International English with technical networking terms') },
			{ code: 'es', flag: '🇪🇸', name: 'Español', desc: _t('Español neutro para routers y administración de red') }
		];

		const langCards = languages.map(function(l){
			const isCurrent = (l.code === current);
			return E('div', {
				class: 'ex-card ex-lang-choice-card' + (isCurrent ? ' is-selected' : ''),
				style: 'display:flex; align-items:center; gap:14px; padding:14px; margin-bottom:10px; cursor:pointer; border-radius:12px; border:2px solid ' + (isCurrent ? 'var(--ex-primary-safe, #3b82f6)' : 'rgba(127,127,127,0.2)') + '; background:' + (isCurrent ? 'color-mix(in srgb, var(--ex-primary-safe, #3b82f6) 12%, transparent)' : 'transparent') + '; transition:all 0.15s ease;',
				click: L.bind(function(){
					if (l.code === current) {
						ui.hideModal();
						return;
					}
					ui.hideModal();
					this.setDashboardLanguage(l.code);
				}, this)
			}, [
				E('span', { style: 'font-size:2rem; line-height:1;' }, [l.flag]),
				E('div', { style: 'flex:1; min-width:0;' }, [
					E('strong', { style: 'display:block; font-size:1.05rem;' }, [
						l.name,
						isCurrent ? E('span', { class: 'ex-pill online', style: 'margin-left:8px; font-size:0.75rem;' }, [_t('ATIVO')]) : ''
					]),
					E('small', { class: 'ex-muted' }, [l.desc])
				]),
				E('button', {
					class: 'ex-mini-button ' + (isCurrent ? 'cbi-button-positive' : 'cbi-button-action'),
					style: 'pointer-events:none;'
				}, [isCurrent ? _t('Selecionado') : _t('Selecionar')])
			]);
		}, this);

		ui.showModal(_t('Alterar Idioma do Painel'), [
			E('p', { class: 'ex-muted', style: 'margin-bottom:14px;' }, [
				_t('Escolha o idioma de exibição do ARK Router e da interface administrativa do LuCI:')
			]),
			E('div', { class: 'ex-lang-choices' }, langCards),
			E('div', { class: 'right', style: 'margin-top:14px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, [_t('Fechar')])
			])
		]);
	},
	setDashboardTitle: function(title){
		title=String(title||'').trim();return fs.exec('/usr/sbin/equipe-dashboard-control',['title',title]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar o nome');ui.addNotification(null,E('p',{},['Nome salvo. Recarregando o painel…']));window.setTimeout(function(){window.location.reload();},500);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});
	},
	setAppearance: function(mode,primary,secondary){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['appearance',mode,primary,secondary]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar a aparência');ui.addNotification(null,E('p',{},['Aparência salva. Recarregando o painel…']));window.setTimeout(function(){window.location.reload();},500);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});
	},
	changeHttpsRedirect: function(input){
		const desired=!!input.checked;input.checked=!desired;
		ui.showModal(desired?'Ativar redirecionamento HTTPS':'Desativar redirecionamento HTTPS',[E('p',{},[desired?'Depois de ativar, o navegador abrirá o painel em HTTPS e poderá exibir um aviso sobre o certificado local.':'O HTTP continuará disponível sem redirecionamento. O HTTPS permanecerá funcionando.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['https-redirect',desired?'1':'0']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar o HTTPS');input.checked=desired;input.setAttribute('aria-checked',desired?'true':'false');this.capabilities.https=this.capabilities.https||{};this.capabilities.https.redirect=desired;const panel=input.closest('.ex-https-panel'),summary=panel&&panel.querySelector('.ex-https-summary'),state=panel&&panel.querySelector('.ex-https-switch-state');if(panel)panel.classList.toggle('is-enabled',desired);if(summary)summary.textContent=desired?'Ligado • todo acesso HTTP vai para HTTPS':'Desligado • HTTP e HTTPS disponíveis';if(state){state.textContent=desired?'ATIVO':'DESLIGADO';state.className='ex-https-switch-state '+(desired?'online':'standby');}ui.hideModal();ui.addNotification(null,E('p',{},[desired?'Redirecionamento HTTPS ativado.':'Redirecionamento HTTPS desativado.']));if(desired&&window.location.protocol!=='https:')window.setTimeout(function(){window.location.href='https://'+window.location.hostname+window.location.pathname;},1600);},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});},this)},['Confirmar alteração'])])]);
	},
	showCertificateHelp: function(){
		const https=this.capabilities.https||{}, fingerprint=String(https.ca_fingerprint||'').replace(/(.{4})/g,'$1 ').trim();
		ui.showModal('INSTALAÇÃO DO CERTIFICADO',[E('p',{class:'alert-message warning'},['Instale apenas em aparelhos administrativos nos quais você confia. Nunca é necessário instalar a chave privada.']),E('ol',{class:'ex-cert-steps'},[E('li',{},['Windows: abra o arquivo e instale-o em Autoridades de Certificação Raiz Confiáveis.']),E('li',{},['Android: em Segurança, procure Instalar certificado de CA e selecione o arquivo.']),E('li',{},['iPhone/iPad: instale o perfil baixado e depois habilite confiança total nos Ajustes de Certificados.']),E('li',{},['Depois da instalação, feche e abra novamente o navegador e acesse novamente o endereço HTTPS do roteador.'])]),fingerprint?E('p',{class:'ex-cert-fingerprint'},[E('span',{},['Impressão digital SHA-256']),E('code',{},[fingerprint])]):'',E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar'])])]);
	},
	setFeatureHidden: function(key,hidden){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-hide',key,hidden?'1':'0']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar a preferência');return this.fetchCapabilities().then(function(c){this.capabilities=c;window.location.reload();}.bind(this));},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});
	},
	loadFeatureInstallLog: function(key){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install-log',key]).then(function(r){return String(r.stdout||'').trim();}).catch(function(){return '';});
	},
	renderSelfUpdateResult: function(info){
		const node=document.getElementById('ex-self-update-result'); if(!node)return;
		info=info||{};
		const update=this.capabilities.update||{}, manager=info.manager||update.manager||this.capabilities.package_manager||'opkg';
		const current=info.current||update.current||'—', latest=info.latest||'—';
		const profileUpgrade=!!info.available&&info.profile==='full'&&info.actual_profile!=='full'&&current===latest;
		const state=info.error?('Erro: '+info.error):(info.available?(profileUpgrade?'Upgrade para Full disponível':'Atualização disponível'):'Sem atualização mais nova');
		const stateClass=info.error?'offline':(info.available?'online':'standby');
		const actions=[];
		if(info.available){
			actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.showUpdateConfirmModal,this,info)},['Atualizar agora']));
		}
		actions.push(E('button',{class:'ex-mini-button','style':'background: rgba(127,127,127,.12);','click':L.bind(this.openManualUpdateModal,this,info)},['📦 Instalar manual/offline']));

		const children = [
			E('div',{class:'ex-feature-copy'},[
				E('div',{class:'ex-feature-name-row'},[
					E('strong',{},[state]),
					latest && latest !== '—' ? E('span',{class:'ex-pill '+stateClass},[latest]) : ''
				]),
				E('small',{class:'ex-muted'},['Instalada: ',current,' • Perfil: ',info.actual_profile||'—',' → ',info.profile||'—']),
				E('small',{class:'ex-muted'},['Repo: ',info.repo||(update.repo||'Despensativo/ark-router')]),
				info.asset?E('code',{},[info.asset]):''
			])
		];

		if(info.error){
			const asset = info.asset || ((manager === 'apk') ? 'luci-app-ark-router-full.apk' : 'luci-app-ark-router.ipk');
			const repo = info.repo || update.repo || 'Despensativo/ark-router';
			const dlUrl = info.url || ('https://github.com/' + repo + '/raw/main/dist/sdk/' + asset);
			const relUrl = 'https://github.com/' + repo + '/releases/latest';

			children.push(E('div',{class:'ex-manual-update-box'},[
				E('strong',{style:'font-size: 0.8rem; color: #f59e0b;'},['💡 Não conseguiu conectar ao GitHub?']),
				E('small',{class:'ex-muted'},['Você pode baixar o arquivo do pacote no seu dispositivo e instalá-lo manualmente sem precisar de internet no roteador:']),
				E('div',{class:'ex-manual-update-actions'},[
					E('a',{class:'ex-feature-link',href:dlUrl,target:'_blank'},['📥 Baixar '+asset]),
					E('a',{class:'ex-feature-link',href:relUrl,target:'_blank'},['🔗 Ver Releases']),
					E('button',{class:'ex-mini-button','click':L.bind(this.openManualUpdateModal,this,info)},['📦 Instalar pacote baixado'])
				])
			]));
		}

		children.push(E('div',{class:'ex-feature-state'},[
			E('div',{class:'ex-feature-actions',style:'flex-wrap: wrap; gap: 8px; margin-top: 6px;'},actions)
		]));

		node.replaceChildren(E('div',{class:'ex-update-card'},[
			E('div',{class:'ex-update-result-row'},children)
		]));
		translateTree(node);
	},
	checkSelfUpdate: function(button, force){
		if(button){button.disabled=true;button.textContent='Verificando…';}
		const node=document.getElementById('ex-self-update-result'); if(node)node.replaceChildren(E('div',{class:'ex-update-card'},[E('small',{class:'ex-muted'},['Consultando GitHub Releases…'])]));
		const args = ['self-update-check'];
		if(force) args.push('force');
		return fs.exec('/usr/sbin/equipe-dashboard-control',args,20000).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao verificar atualização');
			let info={}; try{info=JSON.parse(r.stdout||'{}');}catch(e){throw new Error('Resposta de atualização inválida');}
			this.renderSelfUpdateResult(info);
			if(info.available){
				this.showUpdateConfirmModal(info);
			}
		},this)).catch(function(e){if(node)node.replaceChildren(E('div',{class:'ex-update-card'},[E('p',{class:'alert-message warning'},[e.message])]));}).finally(function(){if(button){button.disabled=false;button.textContent='Verificar atualização';}});
	},
	pollSelfUpdate: function(attempt, liveContainer, updateInfo){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['self-update-status']).then(L.bind(function(r){
			let raw = String(r.stdout || '').trim();
			let data = { state: raw, percent: 30, message: 'Atualização em andamento…' };
			if (raw.startsWith('{')) {
				try { data = JSON.parse(raw); } catch(e){}
			}
			const cardNode = document.getElementById('ex-self-update-result');
			const node = liveContainer || cardNode;

			if (data.state === 'done') {
				if (node) {
					node.replaceChildren(E('div', { class: 'ex-update-live-box', style: 'border-color:rgba(16,185,129,0.4);' }, [
						E('div', { style: 'font-size:2.2rem;margin-bottom:8px;' }, ['🎉']),
						E('strong', { style: 'color: #10b981; font-size: 1.15rem; display: block;' }, ['✅ ' + (data.message || 'Atualização concluída com sucesso!')]),
						E('p', { class: 'ex-muted', style: 'font-size:0.86rem;margin:8px 0 16px 0;' }, [_t('A nova versão foi instalada e está operacional.')]),
						E('div', { class: 'ex-update-progress-bar-lg' }, [
							E('div', { class: 'ex-update-progress-fill-lg', style: 'width: 100%; background: #10b981;' })
						]),
						E('small', { id: 'ex-update-countdown', class: 'ex-muted', style: 'display: block; margin-top: 12px; font-weight:700; color:#38bdf8;' }, [_t('Recarregando a página em 3 segundos…')])
					]));
				}
				let seconds = 3;
				const timer = window.setInterval(function(){
					seconds--;
					const el = document.getElementById('ex-update-countdown');
					if (el) el.textContent = _t('Recarregando a página em %s segundo(s)…').replace('%s', seconds);
					if (seconds <= 0) {
						window.clearInterval(timer);
						window.location.reload();
					}
				}, 1000);
				return;
			}
			if (data.state === 'error' || attempt > 180) {
				return fs.exec('/usr/sbin/equipe-dashboard-control',['self-update-log']).then(L.bind(function(log){
					const lines = String(log.stdout||'').split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean);
					const detail = lines.length ? lines.slice(-5).join(' | ') : 'A atualização não foi concluída.';
					if (node) {
						node.replaceChildren(E('div', { class: 'ex-update-live-box', style: 'border-color:rgba(239,68,68,0.4);' }, [
							E('div', { style: 'font-size:2.2rem;margin-bottom:8px;' }, ['⚠️']),
							E('strong', { style: 'color:#ef4444;font-size:1.1rem;display:block;' }, [_t('A atualização não pôde ser concluída')]),
							E('p', { style: 'font-size:0.85rem;color:#fca5a5;margin:8px 0 16px 0;text-align:left;max-height:140px;overflow-y:auto;background:rgba(0,0,0,0.3);padding:8px;border-radius:6px;' }, [detail]),
							E('div', { style: 'display:flex;justify-content:center;gap:10px;margin-top:14px;' }, [
								E('button', { class: 'btn cbi-button cbi-button-neutral', click: ui.hideModal }, [_t('Fechar')]),
								updateInfo ? E('button', { class: 'btn cbi-button cbi-button-action', click: L.bind(function() {
									this.showUpdateConfirmModal(updateInfo);
								}, this) }, [_t('Tentar Novamente')]) : ''
							])
						]));
					}
					ui.addNotification(null, E('p',{},[detail]), 'danger');
				}, this));
			}
			if (node) {
				const pct = data.percent || Math.min(15 + attempt * 2, 90);
				const msg = data.message || 'Atualização em andamento…';
				node.replaceChildren(E('div', { class: 'ex-update-live-box' }, [
					E('div', { class: 'ex-update-live-title' }, [
						E('span', { class: 'ex-spinner-inline', style: 'width:18px;height:18px;border-width:3px;' }),
						E('strong', {}, [_t('Atualizando ARK Router…')])
					]),
					E('p', { class: 'ex-muted', style: 'font-size:0.86rem;margin:6px 0 14px 0;' }, [
						_t('Por favor, não desligue o aparelho nem feche esta janela.')
					]),
					E('div', { class: 'ex-update-progress-bar-lg' }, [
						E('div', { class: 'ex-update-progress-fill-lg', style: 'width: ' + pct + '%;' })
					]),
					E('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size:0.86rem;' }, [
						E('small', { style: 'font-weight: 700; color:#38bdf8;' }, [msg]),
						E('small', { class: 'ex-muted', style: 'font-variant-numeric: tabular-nums; font-weight: 750;' }, [pct + '%'])
					]),
					E('div', { style: 'margin-top:16px;padding:8px 12px;background:rgba(0,0,0,0.22);border-radius:8px;font-size:0.78rem;color:#94a3b8;display:flex;justify-content:space-around;' }, [
						E('span', {}, ['🛡️ Backup ativo']),
						E('span', {}, ['🔒 Configurações salvas']),
						E('span', {}, ['🌐 Conexões operando'])
					])
				]));
			}
			window.setTimeout(L.bind(this.pollSelfUpdate, this, attempt + 1, liveContainer, updateInfo), 1500);
		}, this));
	},
	showUpdateConfirmModal: function(info){
		info=info||{};
		const self=this;
		const update=this.capabilities.update||{};
		const current=info.current||update.current||'—';
		const latest=info.latest||'—';
		const manager=info.manager||update.manager||this.capabilities.package_manager||'apk';
		const asset=info.asset||('luci-app-ark-router.'+(manager==='apk'?'apk':'ipk'));
		const isSameVersion = (current && latest && current !== '—' && latest !== '—' && current === latest);

		const overlayFreeKb=Number(info.overlay_free_kb||0);
		const overlayFreeMb=(overlayFreeKb/1024).toFixed(1);
		const needOverlayKb=Number(info.need_overlay_kb||650);
		const tmpFreeKb=Number(info.tmp_free_kb||0);
		const tmpFreeMb=(tmpFreeKb/1024).toFixed(0);
		const spaceOk=(info.space_ok!==false)&&(overlayFreeKb>=needOverlayKb);
		const spaceWarning=info.space_warning||(overlayFreeKb>=needOverlayKb&&overlayFreeKb<1200);

		// Formatador de Changelog
		const rawChangelog=info.changelog||'';
		let changelogEls=[];
		if(rawChangelog.trim()){
			const lines=rawChangelog.split(/\r?\n/).map(function(l){return l.trim();}).filter(Boolean);
			lines.forEach(function(line){
				if(line.startsWith('###')||line.startsWith('##')){
					changelogEls.push(E('strong',{style:'display:block;margin:10px 0 4px 0;color:#3b82f6;font-size:0.95rem;'},[line.replace(/^#+\s*/,'')]));
				}else if(line.startsWith('•')||line.startsWith('-')||line.startsWith('*')){
					const clean=line.replace(/^[•\-\*]\s*/,'').replace(/\*\*(.*?)\*\*/g,'$1');
					changelogEls.push(E('div',{style:'display:flex;gap:8px;margin:4px 0;font-size:0.85rem;line-height:1.4;'},[
						E('span',{style:'color:#10b981;'},['•']),
						E('span',{},[clean])
					]));
				}else{
					changelogEls.push(E('p',{style:'margin:4px 0;font-size:0.85rem;line-height:1.4;'},[line.replace(/\*\*(.*?)\*\*/g,'$1')]));
				}
			});
		}else{
			changelogEls.push(E('p',{class:'ex-muted',style:'font-size:0.85rem;font-style:italic;'},[
				'Melhorias de desempenho, estabilidade de conexão e correções gerais do ecossistema ARK Router.'
			]));
		}

		// Diagnostico de Armazenamento Flash e RAM com ponto de corte no limite
		let storageBadgeText = _t('ESPAÇO SUFICIENTE');
		let storageBadgeClass = 'badge-green';
		let storageDesc = _t('Armazenamento seguro: %s MB livres na partição Flash (ponto de corte mínimo: %s KB).').replace('%s', overlayFreeMb).replace('%s', needOverlayKb);
		let storageBorderColor = 'rgba(16, 185, 129, 0.3)';
		let storageBg = 'rgba(16, 185, 129, 0.06)';

		if (!spaceOk) {
			storageBadgeText = _t('ESPAÇO INSUFICIENTE NA FLASH');
			storageBadgeClass = 'badge-red';
			storageDesc = _t('Apenas %s KB livres na partição Flash. O ponto de corte mínimo é de %s KB para evitar travamento ou corrupção de sistema. Atualização bloqueada por segurança.').replace('%s', overlayFreeKb).replace('%s', needOverlayKb);
			storageBorderColor = 'rgba(239, 68, 68, 0.4)';
			storageBg = 'rgba(239, 68, 68, 0.08)';
		} else if (spaceWarning) {
			storageBadgeText = _t('NO LIMITE DE SEGURANÇA');
			storageBadgeClass = 'badge-yellow';
			storageDesc = _t('Armazenamento compacto: %s MB livres (ponto de corte mínimo: %s KB). A atualização prosseguirá substituindo os arquivos existentes.').replace('%s', overlayFreeMb).replace('%s', needOverlayKb);
			storageBorderColor = 'rgba(245, 158, 11, 0.4)';
			storageBg = 'rgba(245, 158, 11, 0.08)';
		}

		const storageCard = E('div', {
			class: 'ex-device-config-block',
			style: 'padding:12px 14px;margin:12px 0;border-radius:10px;border:1px solid ' + storageBorderColor + ';background:' + storageBg + ';'
		}, [
			E('div', { style: 'display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;' }, [
				E('strong', { style: 'font-size:0.9rem;display:flex;align-items:center;gap:6px;' }, [
					_t('💾 Diagnóstico de Espaço em Disco'),
					E('span', { class: 'ex-perf-badge ' + storageBadgeClass }, [(spaceOk ? (spaceWarning ? '⚠️ ' : '✅ ') : '❌ ') + storageBadgeText])
				]),
				E('small', { class: 'ex-muted' }, [_t('RAM (/tmp): %s MB livres').replace('%s', tmpFreeMb)])
			]),
			E('p', { style: 'margin:8px 0 0 0;font-size:0.84rem;line-height:1.4;' }, [storageDesc]),
			(!spaceOk) ? E('div', { style: 'margin-top:10px;display:flex;justify-content:flex-start;' }, [
				E('button', {
					class: 'ex-mini-button',
					type: 'button',
					style: 'padding:6px 14px;font-weight:700;',
					click: function() {
						ui.hideModal();
						fs.exec('/usr/sbin/equipe-dashboard-control', ['system-storage-purge']).then(function() {
							ui.addNotification(null, E('p', {}, [_t('Espaço Flash otimizado! Verificando novamente…')]));
							self.checkSelfUpdate(null, true);
						});
					}
				}, [_t('🧹 Otimizar Espaço Flash Agora')])
			]) : ''
		]);

		const confirmLabel = spaceOk
			? (isSameVersion ? _t('🔄 Reinstalar / Reparar v%s').replace('%s', latest) : _t('🚀 Confirmar e Atualizar'))
			: _t('Espaço Insuficiente');

		const confirmBtn = E('button', {
			class: 'btn cbi-button ' + (spaceOk ? 'cbi-button-positive' : 'cbi-button-neutral'),
			disabled: (!spaceOk) ? '' : null,
			style: 'font-weight:750;',
			click: L.bind(function(ev) {
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.innerHTML = '<span class="ex-spinner-inline"></span> ' + _t('Iniciando…');

				const modalDialog = document.querySelector('.cbi-modal') || document.querySelector('.modal');
				let liveContainer = null;
				if (modalDialog) {
					const closeBtn = modalDialog.querySelector('.btn-close, .close, [aria-label="Close"], button.close');
					if (closeBtn) closeBtn.style.display = 'none';
					liveContainer = modalDialog.querySelector('.cbi-modal-body') || modalDialog;
					liveContainer.replaceChildren(E('div', { class: 'ex-update-live-box' }, [
						E('div', { class: 'ex-update-live-title' }, [
							E('span', { class: 'ex-spinner-inline', style: 'width:18px;height:18px;border-width:3px;' }),
							E('strong', {}, [_t('Iniciando atualização do ARK Router…')])
						]),
						E('p', { class: 'ex-muted', style: 'font-size:0.86rem;margin-top:6px;' }, [_t('Estabelecendo conexão e preparando ambiente…')])
					]));
				}

				const cmdArgs = ['self-update-start'];
				if (isSameVersion) {
					cmdArgs.push('force');
				}

				fs.exec('/usr/sbin/equipe-dashboard-control', cmdArgs).then(L.bind(function(r) {
					if (r.code) throw new Error(r.stderr || 'Falha ao iniciar atualização');
					this.pollSelfUpdate(0, liveContainer, info);
				}, this)).catch(L.bind(function(e) {
					if (reloadAfterExpectedDisconnect(e, 'Comando enviado. O painel recarregará quando o roteador concluir a atualização.', 4500)) return;
					if (liveContainer) {
						liveContainer.replaceChildren(E('div', { class: 'ex-update-live-box', style: 'border-color:rgba(239,68,68,0.4);' }, [
							E('strong', { style: 'color:#ef4444;font-size:1.05rem;display:block;' }, [_t('Erro ao iniciar atualização')]),
							E('p', { style: 'font-size:0.85rem;color:#fca5a5;margin:8px 0 16px 0;' }, [e.message]),
							E('button', { class: 'btn cbi-button cbi-button-neutral', click: ui.hideModal }, [_t('Fechar')])
						]));
					} else {
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					}
				}, this));
			}, this)
		}, [confirmLabel]);

		const promptMsg = isSameVersion
			? _t('Você já está com a versão v%s instalada. Deseja reinstalar ou reparar o pacote agora?').replace('%s', latest)
			: _t('Deseja realmente atualizar o ARK Router para a versão v%s agora?').replace('%s', latest);

		const modalContent = [
			E('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.08);flex-wrap:wrap;gap:8px;' }, [
				E('div', { style: 'display:flex;align-items:center;gap:8px;' }, [
					E('span', { style: 'font-size:0.85rem;color:#94a3b8;' }, [_t('Versão Instalada:')]),
					E('strong', { class: 'ex-pill standby', style: 'padding:4px 10px;' }, ['v' + current]),
					E('span', { style: 'color:#94a3b8;' }, ['➔']),
					E('span', { style: 'font-size:0.85rem;color:#10b981;font-weight:700;' }, [isSameVersion ? _t('Status:') : _t('Nova Versão:')]),
					E('strong', { class: 'ex-pill online', style: 'padding:4px 10px;' }, [isSameVersion ? ('v' + latest + ' ' + _t('(Atual)')) : ('v' + latest)])
				]),
				E('code', { style: 'font-size:0.82rem;font-weight:700;' }, [asset])
			]),

			E('div', { class: 'ex-device-config-block', style: 'margin-bottom:12px;' }, [
				E('strong', { style: 'font-size:0.9rem;display:block;margin-bottom:6px;' }, [_t('📋 O que há de novo na versão v%s:').replace('%s', latest)]),
				E('div', { style: 'max-height:220px;overflow-y:auto;padding:10px 14px;background:rgba(0,0,0,0.22);border-radius:8px;border:1px solid rgba(255,255,255,0.06);' }, changelogEls)
			]),

			storageCard,

			E('div', { class: 'ex-device-config-block', style: 'margin-bottom:14px;background:rgba(59,130,246,0.06);border-color:rgba(59,130,246,0.2);' }, [
				E('strong', { style: 'font-size:0.88rem;color:#3b82f6;' }, [_t('🛡️ Blindagem & Garantias de Segurança:')]),
				E('ul', { style: 'margin:6px 0 0 16px;padding:0;font-size:0.82rem;color:#cbd5e1;line-height:1.45;' }, [
					E('li', {}, [_t('Backup automático de segurança das configurações antes da gravação.')]),
					E('li', {}, [_t('Senhas, redes Wi-Fi, regras de firewall e conexões são 100% preservadas.')]),
					E('li', {}, [_t('Zero interrupção de tráfego de internet durante o processo.')])
				])
			]),

			E('p', { style: 'font-size:0.92rem;font-weight:700;text-align:center;margin:14px 0 8px 0;' }, [promptMsg]),

			E('div', { style: 'display:flex;justify-content:flex-end;gap:10px;margin-top:14px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', click: ui.hideModal }, [_t('Cancelar')]),
				confirmBtn
			])
		];

		ui.showModal(_t('🚀 Atualização do ARK Router'), modalContent);
		translateTree(document.querySelector('.cbi-modal') || document.body);
	},
	startSelfUpdate: function(info){
		return this.showUpdateConfirmModal(info);
	},
	checkBackgroundUpdate: function(){
		const self=this;
		const now=Date.now();
		const lastCheckTime=Number(localStorage.getItem('ark_last_update_check_time')||0);
		const cachedDataStr=localStorage.getItem('ark_last_update_check_data');

		if(now-lastCheckTime<43200000&&cachedDataStr){
			try{
				const data=JSON.parse(cachedDataStr);
				if(data&&data.available){
					self.renderUpdateBanner(data);
				}
				return;
			}catch(e){}
		}

		window.setTimeout(function(){
			fs.exec('/usr/sbin/equipe-dashboard-control',['self-update-check']).then(function(r){
				if(r.code)return;
				let info={};
				try{info=JSON.parse(r.stdout||'{}');}catch(e){return;}
				localStorage.setItem('ark_last_update_check_time',String(Date.now()));
				localStorage.setItem('ark_last_update_check_data',JSON.stringify(info));
				if(info&&info.available){
					self.renderUpdateBanner(info);
				}
			}).catch(function(){});
		},4500);
	},
	renderUpdateBanner: function(info){
		if(!info||!info.available||!info.latest)return;
		const dismissed=localStorage.getItem('ark_dismissed_update');
		if(dismissed===info.latest)return;

		const container=document.getElementById('ex-update-banner-container');
		if(!container)return;

		const banner=E('div',{
			class:'ex-update-banner',
			style:'display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;padding:12px 18px;margin:12px 0 16px 0;border-radius:12px;background:linear-gradient(90deg,rgba(59,130,246,0.12) 0%,rgba(139,92,246,0.12) 100%);border:1px solid rgba(59,130,246,0.35);box-shadow:0 4px 16px rgba(0,0,0,0.15);'
		},[
			E('div',{style:'display:flex;align-items:center;gap:12px;'},[
				E('span',{style:'font-size:1.4rem;'},['🚀']),
				E('div',{},[
					E('div',{style:'display:flex;align-items:center;gap:8px;'},[
						E('strong', { style: 'font-size:0.95rem;' }, [_t('Nova versão disponível: ARK Router v%s').replace('%s', info.latest)]),
						E('span', { class: 'ex-pill online', style: 'padding:2px 8px;font-size:0.75rem;font-weight:700;' }, [_t('ATUALIZAÇÃO')])
					]),
					E('small', { class: 'ex-muted', style: 'display:block;margin-top:2px;' }, [
						_t('Versão atual: v%s').replace('%s', info.current || '—') + ' • ' + _t('Atualização com backup de segurança automático.')
					])
				])
			]),
			E('div', { style: 'display:flex;align-items:center;gap:8px;' }, [
				E('button', {
					class: 'ex-mini-button',
					type: 'button',
					style: 'padding:8px 14px;font-weight:750;font-size:0.85rem;',
					click: L.bind(function() {
						this.showUpdateConfirmModal(info);
					}, this)
				}, [_t('Ver Novidades & Atualizar')]),
				E('button', {
					class: 'ex-mini-button',
					type: 'button',
					style: 'padding:8px 12px;background:rgba(127,127,127,0.15);color:#94a3b8;font-size:0.82rem;',
					title: _t('Ocultar aviso para esta versão'),
					click: function() {
						localStorage.setItem('ark_dismissed_update', info.latest);
						banner.style.transition = 'all 0.3s ease';
						banner.style.opacity = '0';
						banner.style.transform = 'translateY(-10px)';
						window.setTimeout(function() { banner.remove(); }, 300);
					}
				}, [_t('Ocultar ✕')])
			])
		]);

		container.replaceChildren(banner);
		translateTree(container);
	},
	openManualUpdateModal: function(info){
		info=info||{};
		const update=this.capabilities.update||{}, manager=info.manager||update.manager||this.capabilities.package_manager||'opkg';
		const ext=(manager==='apk')?'.apk':'.ipk';
		const asset=info.asset || ((manager==='apk')
			? (this.capabilities.actual_profile==='lite'?'luci-app-ark-router.apk':'luci-app-ark-router-full.apk')
			: (this.capabilities.actual_profile==='full'?'luci-app-ark-router-full.ipk':'luci-app-ark-router.ipk'));
		const repo=info.repo||update.repo||'Despensativo/ark-router';
		const dlUrl=info.url || ('https://github.com/' + repo + '/raw/main/dist/sdk/' + asset);
		const relUrl='https://github.com/' + repo + '/releases/latest';
		const self=this;

		ui.showModal('Instalação Manual / Offline do ARK Router',[
			E('p',{},['Se a consulta online falhar ou o roteador não tiver internet no momento, você pode baixar o pacote pelo celular ou PC e instalá-lo manualmente aqui:']),
			E('div',{class:'ex-manual-update-box',style:'margin: 12px 0;'},[
				E('strong',{style:'font-size: 0.88rem;'},['Pacote compatível com este roteador:']),
				E('div',{style:'display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 4px 0;'},[
					E('code',{style:'font-size: 0.85rem; font-weight: 700;'},[asset]),
					E('span',{class:'ex-pill online'},[manager])
				]),
				E('div',{class:'ex-manual-update-actions',style:'margin-top: 6px;'},[
					E('a',{class:'ex-feature-link',href:dlUrl,target:'_blank'},['📥 Baixar pacote direto ('+asset+')']),
					E('a',{class:'ex-feature-link',href:relUrl,target:'_blank'},['🔗 Abrir GitHub Releases'])
				])
			]),
			E('p',{class:'alert-message info',style:'margin-top: 10px;'},['Selecione o arquivo ('+ext+'). O sistema criará backup de segurança automático, preservará todas as configurações de Wi-Fi e rede, e aplicará com logs e barra de progresso em tempo real.']),
			E('div',{class:'right',style:'margin-top: 16px;'},[
				E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',
				E('button',{class:'btn cbi-button cbi-button-action important','click':function(){
					closeModal();
					self.startManualPackageUpload(asset, manager);
				}},['Selecionar arquivo e instalar'])
			])
		]);
	},
	startManualPackageUpload: function(expectedAsset, manager){
		const targetPath = (manager === 'apk') ? '/tmp/upload.apk' : '/tmp/upload.ipk';
		const self = this;
		ui.uploadFile(targetPath).then(function(reply){
			const filename = (reply && reply.name) ? reply.name : (expectedAsset || 'pacote');
			ui.showModal('Confirmar Instalação Manual',[
				E('p',{},['Arquivo carregado com sucesso: ', E('strong',{},[filename])]),
				E('p',{class:'alert-message warning'},['A instalação criará backup automático, substituirá com segurança os arquivos da versão e recarregará a interface web. Configurações de rede serão preservadas.']),
				E('div',{class:'right'},[
					E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',
					E('button',{class:'btn cbi-button cbi-button-positive','click':function(){
						closeModal();
						ui.addNotification(null,E('p',{},['Instalação manual iniciada. O painel avisará quando terminar.']));
						return fs.exec('/usr/sbin/equipe-dashboard-control',['manual-update-start', targetPath]).then(function(r){
							if(r.code)throw new Error(r.stderr||'Falha ao iniciar instalação manual');
							self.pollSelfUpdate(0);
						}).catch(function(e){
							if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
							ui.addNotification(null,E('p',{},[e.message]),'danger');
						});
					}},['Confirmar e Instalar'])
				])
			]);
		}).catch(function(err){
			if(err && err.message && err.message.includes('cancelled')) return;
			ui.addNotification(null, E('p',{},['Upload cancelado ou falhou: ' + (err ? err.message : '')]), 'warning');
		});
	},
	selfUpdatePanel: function(){
		const update=this.capabilities.update||{}, manager=update.manager||this.capabilities.package_manager||'—';
		const asuEnabled = !!(update.asu_check);

		const asuStatePill = E('strong', { class: 'ex-device-switch-state ' + (asuEnabled ? 'online' : 'standby') }, [
			asuEnabled ? _t('LIGADA (AVISOS ATIVOS)') : _t('DESLIGADA (RECOMENDADO)')
		]);

		const asuDesc = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, [
			asuEnabled 
				? _t('⚠️ O painel buscará atualizações do OpenWrt genérico a cada login. Atenção: atualizar por lá remove o ARK Router.')
				: _t('✅ Pop-ups do OpenWrt genérico bloqueados para evitar que o ARK Router seja sobrescrito por engano.')
		]);

		const asuToggleInput = E('input', {
			type: 'checkbox',
			checked: asuEnabled ? '' : null,
			change: L.bind(function(ev) {
				const input = ev.currentTarget;
				const desired = !!input.checked;
				input.disabled = true;
				asuStatePill.textContent = desired ? _t('LIGADA (AVISOS ATIVOS)') : _t('DESLIGADA (RECOMENDADO)');
				asuStatePill.className = 'ex-device-switch-state ' + (desired ? 'online' : 'standby');
				fs.exec('/usr/sbin/equipe-dashboard-control', ['asu-check-toggle', desired ? '1' : '0']).then(L.bind(function(r) {
					if (r.code) throw new Error(r.stderr || 'Falha ao alterar preferência');
					if (this.capabilities && this.capabilities.update) {
						this.capabilities.update.asu_check = desired;
					}
					input.disabled = false;
					asuDesc.textContent = desired 
						? _t('⚠️ O painel buscará atualizações do OpenWrt genérico a cada login. Atenção: atualizar por lá remove o ARK Router.')
						: _t('✅ Pop-ups do OpenWrt genérico bloqueados para evitar que o ARK Router seja sobrescrito por engano.');
					ui.addNotification(null, E('p', {}, [desired ? _t('Verificação do OpenWrt ativada. Pop-ups do OpenWrt genérico serão exibidos no login.') : _t('Verificação do OpenWrt desativada. O ARK Router está protegido contra sobrescrita.')]));
				}, this)).catch(L.bind(function(err) {
					input.checked = !desired;
					input.disabled = false;
					asuStatePill.textContent = (!desired) ? _t('LIGADA (AVISOS ATIVOS)') : _t('DESLIGADA (RECOMENDADO)');
					asuStatePill.className = 'ex-device-switch-state ' + ((!desired) ? 'online' : 'standby');
					ui.addNotification(null, E('p', {}, [err.message]), 'danger');
				}, this));
			}, this)
		});

		const asuSwitchControl = E('div', {
			class: 'ex-device-switch-control',
			style: 'cursor: pointer; user-select: none;',
			click: function(ev) {
				ev.preventDefault();
				ev.stopPropagation();
				if (asuToggleInput.disabled) return;
				asuToggleInput.checked = !asuToggleInput.checked;
				asuToggleInput.dispatchEvent(new Event('change', { bubbles: true }));
			}
		}, [
			asuStatePill,
			E('label', { class: 'ex-switch', style: 'pointer-events: none;' }, [
				asuToggleInput,
				E('span', { class: 'ex-switch-slider' })
			])
		]);

		const asuRow = E('div', { class: 'ex-asu-toggle-row', style: 'margin-top: 14px; padding: 12px 14px; background: rgba(127,127,127,0.06); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
			E('div', { style: 'flex: 1;' }, [
				E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
					E('strong', {}, [_t('Verificação do OpenWrt Base')]),
					E('span', { class: 'ex-pill standby', style: 'font-size: 0.7rem;' }, ['Attended Sysupgrade'])
				]),
				asuDesc
			]),
			asuSwitchControl
		]);

		return E('section',{class:'ex-update-panel'},[
			E('div',{class:'ex-update-header'},[
				E('div',{},[
					E('strong',{},['Atualização do ARK Router']),
					E('small',{class:'ex-muted'},['Verifica o GitHub Releases e instala com segurança após confirmação.'])
				]),
				E('span',{class:'ex-pill '+(manager==='none'?'offline':'online')},[manager])
			]),
			E('div',{class:'ex-update-cards-grid'},[
				E('div',{class:'ex-update-card'},[
					E('div',{class:'ex-feature-copy'},[
						E('div',{class:'ex-feature-name-row'},[
							E('strong',{},['Versão instalada: ']),
							E('span',{class:'ex-pill online'},[update.current||window.ARK_VERSION||'1.5.6'])
						]),
						E('small',{class:'ex-muted'},['Repositório: ',update.repo||'Despensativo/ark-router']),
						E('small',{class:'ex-muted'},['Gerenciador: ',manager])
					]),
					E('div',{class:'ex-feature-actions',style:'margin-top: 8px; flex-wrap: wrap; gap: 8px;'},[
						E('button',{class:'ex-mini-button','click':L.bind(function(ev){this.checkSelfUpdate(ev.currentTarget);},this)},['Verificar atualização']),
						E('button',{class:'ex-mini-button','style':'background: rgba(127,127,127,.12);','click':L.bind(this.openManualUpdateModal,this)},['📦 Instalar manual/offline'])
					])
				]),
				E('div',{id:'ex-self-update-result',class:'ex-update-result'},[
					E('div',{class:'ex-update-card'},[
						E('div',{class:'ex-feature-copy'},[
							E('strong',{},['Status de atualização']),
							E('small',{class:'ex-muted'},['Nenhuma verificação executada nesta sessão.']),
							E('small',{class:'ex-muted'},['Clique em "Verificar atualização" ou use a opção manual abaixo se estiver sem internet no aparelho.'])
						]),
						E('div',{class:'ex-feature-actions',style:'margin-top: 8px;'},[
							E('button',{class:'ex-mini-button','click':L.bind(this.openManualUpdateModal,this)},['Instalar pacote offline'])
						])
					])
				])
			]),
			asuRow
		]);
	},
	pollFeatureInstall: function(key,attempt){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install-status',key]).then(L.bind(function(r){
			const state=String(r.stdout||'').trim();
			if(state==='done'){
				ui.addNotification(null,E('p',{},[key==='speedtest'?'Medidor pronto na memória. Recarregando o painel…':'Recurso instalado com sucesso. Recarregando o painel…']));
				window.setTimeout(function(){window.location.reload();},1200);
				return;
			}
			if(state==='error'||attempt>150){
				return this.loadFeatureInstallLog(key).then(function(log){
					const lines=(log||'').split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean);
					const detail=lines.length ? lines.slice(-4).join(' | ') : 'A instalação não foi concluída.';
					ui.addNotification(null,E('p',{},[detail]));
				});
			}
			window.setTimeout(L.bind(this.pollFeatureInstall,this,key,attempt+1),2000);
		},this));
	},
	showPackageInstallProgressModal: function(opts){
		opts = opts || {};
		const title = opts.title || 'Instalando Pacotes e Recursos';
		const stageCmd = opts.stageCmd || 'feature-install-missing-stage';
		const logCmd = opts.logCmd || 'feature-install-missing-log';
		const statusCmd = opts.statusCmd || 'feature-install-missing-status';
		const successMsg = opts.successMsg || 'Instalação concluída com sucesso!';

		const stepBadge = E('span', { class: 'ex-install-step-badge' }, ['Iniciando…']);
		const percentLabel = E('span', { style: 'font-size:0.85rem; font-weight:700; color:#94a3b8;' }, ['0%']);
		const progressBar = E('div', { class: 'ex-install-progress-fill', style: 'width: 5%' });
		const progressTrack = E('div', { class: 'ex-install-progress-track' }, [progressBar]);
		const actionText = E('div', { class: 'ex-install-current-action' }, [
			E('span', { class: 'ex-spinner', style: 'font-size:1.1rem;' }, ['⏳']),
			E('span', { id: 'ex-install-msg' }, ['Preparando gerenciador de pacotes…'])
		]);
		const terminalBox = E('pre', { class: 'ex-install-terminal' }, ['Aguardando saída do gerenciador de pacotes…']);
		const noteText = E('p', { class: 'ex-install-note' }, [
			'O roteador está baixando e configurando os pacotes necessários. Isso pode levar de 30 segundos a alguns minutos dependendo da sua velocidade de internet. Por favor, mantenha esta tela aberta.'
		]);

		const actionBtn = E('button', { class: 'btn cbi-button cbi-button-neutral', disabled: true }, ['Instalação em andamento…']);
		let isFinished = false;
		let pollTimer = null;

		const updateTerminalLog = function(){
			return fs.exec('/usr/sbin/equipe-dashboard-control', [logCmd]).then(function(r){
				const text = String(r.stdout || '').trim();
				if(text){
					terminalBox.textContent = text;
					terminalBox.scrollTop = terminalBox.scrollHeight;
				}
			}).catch(function(){});
		};

		const finishSuccess = function(msg){
			if(isFinished) return;
			isFinished = true;
			if(pollTimer) window.clearTimeout(pollTimer);
			stepBadge.textContent = 'Concluído';
			stepBadge.className = 'ex-install-step-badge done';
			percentLabel.textContent = '100%';
			percentLabel.style.color = '#34d399';
			progressBar.style.width = '100%';
			progressBar.className = 'ex-install-progress-fill done';
			actionText.innerHTML = '<span>✅</span> <span>' + (msg || successMsg) + '</span>';
			updateTerminalLog();

			let countdown = 3;
			actionBtn.disabled = false;
			actionBtn.className = 'btn cbi-button cbi-button-positive';
			actionBtn.textContent = 'Concluir e recarregar (' + countdown + 's)';
			actionBtn.onclick = function(){
				window.location.reload();
			};

			const cdInterval = window.setInterval(function(){
				countdown--;
				if(countdown > 0){
					actionBtn.textContent = 'Concluir e recarregar (' + countdown + 's)';
				} else {
					window.clearInterval(cdInterval);
					window.location.reload();
				}
			}, 1000);
		};

		const finishError = function(errMsg){
			if(isFinished) return;
			isFinished = true;
			if(pollTimer) window.clearTimeout(pollTimer);
			stepBadge.textContent = 'Erro';
			stepBadge.className = 'ex-install-step-badge error';
			progressBar.className = 'ex-install-progress-fill error';
			actionText.innerHTML = '<span>❌</span> <span style="color:#f87171;">' + (errMsg || 'Falha na instalação dos pacotes.') + '</span>';
			updateTerminalLog();

			actionBtn.disabled = false;
			actionBtn.className = 'btn cbi-button cbi-button-neutral';
			actionBtn.textContent = 'Fechar';
			actionBtn.onclick = function(){
				ui.hideModal();
			};
		};

		const poll = function(attempt){
			if(isFinished) return;
			if(attempt > 240){
				finishError('Tempo limite excedido na instalação.');
				return;
			}

			Promise.all([
				fs.exec('/usr/sbin/equipe-dashboard-control', [statusCmd]).catch(function(){ return { stdout: '' }; }),
				fs.exec('/usr/sbin/equipe-dashboard-control', [stageCmd]).catch(function(){ return { stdout: '{}' }; })
			]).then(function(results){
				if(isFinished) return;
				const statusStr = String(results[0].stdout || '').trim();
				let stageData = {};
				try { stageData = JSON.parse(results[1].stdout || '{}'); } catch(e){}

				const step = stageData.step || 0;
				const total = stageData.total || 0;
				const pct = stageData.percent || 10;
				const message = stageData.message || 'Instalando pacotes…';

				if(total > 0 && step > 0){
					stepBadge.textContent = 'Etapa ' + step + ' de ' + total;
				}
				percentLabel.textContent = pct + '%';
				progressBar.style.width = pct + '%';
				const msgSpan = actionText.querySelector('#ex-install-msg');
				if(msgSpan && message) msgSpan.textContent = message;

				updateTerminalLog();

				if(statusStr === 'done' || stageData.stage === 'done'){
					finishSuccess(stageData.message || successMsg);
					return;
				}
				if(statusStr === 'error' || stageData.stage === 'error'){
					finishError(stageData.message || 'Falha durante o processo de instalação.');
					return;
				}

				pollTimer = window.setTimeout(function(){ poll(attempt + 1); }, 1500);
			}).catch(function(e){
				if(reloadAfterExpectedDisconnect(e, 'O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…', 4200)) return;
				pollTimer = window.setTimeout(function(){ poll(attempt + 1); }, 2000);
			});
		};

		const modalContent = E('div', { class: 'ex-install-progress-wrap' }, [
			E('div', { class: 'ex-install-header' }, [
				stepBadge,
				percentLabel
			]),
			progressTrack,
			actionText,
			terminalBox,
			noteText,
			E('div', { class: 'right', style: 'margin-top:10px;' }, [actionBtn])
		]);

		ui.showModal(title, [modalContent]);
		poll(0);
	},
	loadMissingInstallLog: function(){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install-missing-log']).then(function(r){return String(r.stdout||'').trim();}).catch(function(){return '';});
	},
	pollMissingInstall: function(attempt){
		this.showPackageInstallProgressModal({
			title: 'Instalação de Recursos em Lote',
			stageCmd: 'feature-install-missing-stage',
			logCmd: 'feature-install-missing-log',
			statusCmd: 'feature-install-missing-status',
			successMsg: 'Todos os recursos foram instalados com sucesso! Recarregando painel…'
		});
	},
	installMissingFeatures: function(keys){
		keys=keys||[];
		if(!keys.length){ui.addNotification(null,E('p',{},['Não há recursos leves faltando para instalar.']));return;}
		const names=keys.map(function(k){return (FEATURE_META[k]&&FEATURE_META[k].name)||k;}).join(' • ');
		ui.showModal('Instalar todos os recursos',[
			E('p',{},['Serão instalados os recursos recomendados que ainda faltam: ',E('strong',{},[names])]),
			E('p',{class:'alert-message warning'},['O ARK Router atualizará a lista de pacotes e instalará os módulos em sequência. Nenhuma configuração de WAN, LAN, Wi‑Fi, SQM ou Multi‑WAN será aplicada automaticamente.']),
			E('p',{class:'ex-muted'},['BONDING REAL / Speedify não entra neste botão porque depende de licença, arquitetura e escolha de armazenamento. Use a seção própria dele.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install-missing']).then(L.bind(function(r){
					const state=String(r.stdout||'').trim();
					if(r.code)throw new Error(r.stderr||'Falha ao iniciar instalação em lote');
					if(state==='installed'){
						ui.hideModal();
						ui.addNotification(null,E('p',{},['Todos os recursos leves já estavam instalados.']));
						window.setTimeout(function(){window.location.reload();},900);
						return;
					}
					this.showPackageInstallProgressModal({
						title: 'Instalação de Recursos em Lote',
						stageCmd: 'feature-install-missing-stage',
						logCmd: 'feature-install-missing-log',
						statusCmd: 'feature-install-missing-status',
						successMsg: 'Todos os recursos foram instalados com sucesso! Recarregando painel…'
					});
				},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Instalar tudo'])])
		]);
	},

	installFeature: function(key){
		const meta=FEATURE_META[key], feature=this.feature(key);
		if(key==='speedtest' && feature.storage && feature.storage.recommended==='fast_manual'){
			ui.showModal('Medidor leve / Fast.com',[
				E('p',{},['Este roteador tem pouca RAM livre para o medidor automático. Recomendação: usar Fast.com pelo navegador e informar o resultado manualmente no SQM.']),
				E('p',{class:'alert-message warning'},['Fast.com mede o caminho do aparelho que abriu o teste. Para calibrar WAN pura, rode pelo cabo/rede principal e, se Speedify estiver ativo, lembre que ele medirá o túnel.']),
				E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){this.openFastCom();},this)},['Abrir Fast.com'])])
			]);
			return;
		}
		ui.showModal(key==='speedtest'?'Preparar medidor':(key==='speedify'?'Instalar Speedify':'Instalar recurso'),[
			E('p',{},[(meta&&meta.name)||key,' — ',(meta&&meta.description)||'']),
			E('p',{class:'ex-package-name'},['Pacote: ',E('code',{},[feature.package||'—'])]),
			E('p',{class:'alert-message warning'},[key==='speedtest'?'O executável oficial será baixado para a memória temporária. Ele não ocupará a flash e desaparecerá ao reiniciar.':(key==='speedify'?'Será executado o instalador oficial get.speedify.com. Ele exige licença Speedify Router e pode instalar luci-app-speedify/Nginx. Nenhuma WAN será alterada automaticamente.':'Essa ação atualizará a lista de pacotes e instalará somente o pacote indicado e suas dependências. Nenhuma configuração de rede será alterada automaticamente.')]),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install',key]).then(L.bind(function(r){
					const state=String(r.stdout||'').trim();
					if(r.code)throw new Error(r.stderr||'Falha ao iniciar a instalação');
					ui.hideModal();
					if(state==='installed'){
						ui.addNotification(null,E('p',{},[key==='speedtest'?'Medidor já estava pronto na memória.':(key==='speedify'?'Speedify já estava disponível.':(key==='usteer'?'Assistente usteer ativado com sucesso.':'Esse recurso já estava disponível e foi ativado.'))]));
						window.setTimeout(function(){window.location.reload();},900);
						return;
					}
					if(state==='running'){
						ui.addNotification(null,E('p',{},['A instalação já está em andamento.']));
					} else {
						ui.addNotification(null,E('p',{},[key==='speedtest'?'Preparação iniciada. O painel avisará quando terminar.':'Instalação iniciada. O painel avisará quando terminar.']));
					}
					this.pollFeatureInstall(key,0);
				},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});
			},this)},['Confirmar instalação'])])
		]);
	},
	useTheme: function(key){
		const names = { ark: 'Tema ARK (Nativo)', bootstrap: 'Tema Bootstrap (Padrão)' };
		const name = names[key] || key;
		ui.showModal('Usar tema',[
			E('p',{},[name]),
			E('p',{class:'alert-message warning'},['O tema visual do LuCI será alterado para '+name+'. Nenhuma configuração de rede será modificada.']),
			E('div',{class:'right'},[
				E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),
				' ',
				E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
					return fs.exec('/usr/sbin/equipe-dashboard-control',['theme',key]).then(function(r){
						if(r.code)throw new Error(r.stderr||'Falha ao selecionar o tema');
						ui.hideModal();
						reloadSoon('Tema '+name+' ativado. Recarregando…',400);
					}).catch(function(e){
						if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
						ui.addNotification(null,E('p',{},[e.message]),'danger');
					});
				},this)},['Usar tema'])
			])
		]);
	},

	requestReboot: function(){
		ui.showModal('Primeira confirmação',[E('p',{},['Deseja preparar o reinício do roteador? Nenhuma configuração será apagada.']),E('p',{class:'alert-message warning'},['A internet e o painel ficarão indisponíveis por alguns minutos.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
			return fs.exec('/usr/sbin/equipe-dashboard-control',['reboot-prepare']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao preparar o reinício');const token=String(r.stdout||'').trim();if(!/^[0-9a-f]{8,64}$/.test(token))throw new Error('Confirmação inválida recebida do roteador');this.showRebootConfirmation(token);},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
		},this)},['Continuar'])])]);
	},
	showRebootConfirmation: function(token){
		const finalButton=E('button',{class:'btn cbi-button cbi-button-negative',disabled:true},['Aguarde 2 s']);
		const started=Date.now(), timer=window.setInterval(function(){const left=Math.ceil((2000-(Date.now()-started))/1000);if(left>0){finalButton.textContent='Aguarde '+left+' s';return;}window.clearInterval(timer);finalButton.disabled=false;finalButton.textContent='Reiniciar agora';},100);
		finalButton.addEventListener('click',L.bind(function(){finalButton.disabled=true;finalButton.textContent='Salvando dados e reiniciando…';return fs.exec('/usr/sbin/equipe-dashboard-control',['reboot-confirm',token]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao reiniciar');ui.hideModal();ui.addNotification(null,E('p',{},['Protegendo unidades externas e reiniciando o roteador. A conexão será interrompida.']));}).catch(function(e){finalButton.disabled=false;finalButton.textContent='Reiniciar agora';ui.addNotification(null,E('p',{},[e.message]),'danger');});},this));
		ui.showModal('Confirmação final',[
			E('p',{class:'alert-message warning'},['O roteador será reiniciado imediatamente. Aguarde a rede voltar antes de abrir o painel novamente.']),
			E('p',{class:'alert-message info',style:'margin-top:8px;font-size:0.9rem;'},['Proteção de armazenamento ativa: o roteador pausará serviços em execução (servidores, downloads e compartilhamentos), descarregará dados da memória RAM e protegerá unidades externas contra corrupção antes de reiniciar.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':function(){window.clearInterval(timer);ui.hideModal();}},['Cancelar']),' ',finalButton])
		]);
	},
	loadEzSetup: function(){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-status']).then(function(r){try{return JSON.parse(r.stdout||'{}');}catch(e){return {};}}).catch(function(){return {};});
	},
	ezField: function(label, control, hint){
		return E('label',{class:'ex-ez-field'},[E('span',{},[label]),control,hint?E('small',{class:'ex-muted'},[hint]):'']);
	},
	showEzSetup: function(){
		return this.loadEzSetup().then(L.bind(function(saved){
			const input = function(type, value, attrs){ attrs = attrs || {}; attrs.type = type; attrs.value = value || ''; attrs.class = attrs.class || 'cbi-input-text'; return E('input', attrs); };
			const select = function(value, items){ const node = E('select', {class:'cbi-input-select'}, items.map(function(item){ return E('option', {value:item[0]}, [item[1]]); })); node.value = value; return node; };
			const checkbox = function(value){ const node = E('input', {type:'checkbox'}); node.checked = !!value; return node; };

			const passwordWithToggle = function(value, placeholder, onInput){
				const passInput = E('input', {
					type: 'password',
					class: 'cbi-input-text',
					value: value || '',
					placeholder: placeholder || 'mínimo 8 caracteres',
					style: 'flex: 1; min-width: 0;'
				});
				if(onInput) passInput.addEventListener('input', onInput);
				const toggleBtn = E('button', {
					type: 'button',
					class: 'btn cbi-button cbi-button-neutral',
					style: 'flex: 0 0 44px; min-height: 40px; padding: 0 10px; font-size: 1.1rem; display: inline-flex; align-items: center; justify-content: center; user-select: none; -webkit-tap-highlight-color: transparent;',
					title: 'Mostrar / Ocultar Senha'
				}, ['👁️']);
				toggleBtn.addEventListener('click', function(e){
					e.preventDefault();
					e.stopPropagation();
					if(passInput.type === 'password'){
						passInput.type = 'text';
						toggleBtn.style.opacity = '1';
						toggleBtn.style.background = 'rgba(59,130,246,0.2)';
						toggleBtn.style.borderColor = '#3b82f6';
					} else {
						passInput.type = 'password';
						toggleBtn.style.opacity = '0.75';
						toggleBtn.style.background = '';
						toggleBtn.style.borderColor = '';
					}
				});
				const wrap = E('div', { style: 'display: flex; gap: 6px; align-items: center; width: 100%; min-width: 0;' }, [
					passInput,
					toggleBtn
				]);
				wrap.getValue = function(){ return passInput.value; };
				wrap.setValue = function(v){ passInput.value = v; };
				wrap.input = passInput;
				return wrap;
			};

			const language = select(this.capabilities.language||dashboardLanguage||'pt-br', [['pt-br','Português (Brasil)'],['en','English'],['es','Español']]);
			const routerName = input('text', saved.router_name || 'ARK Router', {maxlength:40});
			const country = select(saved.country || 'BR', []);
			const preferredCountries = [
				['00','Mundo / driver padrão'],
				['PK','Paquistão (Pakistan)'],
				['BR','Brasil'],
				['US','Estados Unidos (United States)'],
				['PT','Portugal'],
				['ES','Espanha (Spain)'],
				['AR','Argentina'],
				['CL','Chile'],
				['UY','Uruguai'],
				['PY','Paraguai'],
				['BO','Bolívia'],
				['PE','Peru'],
				['CO','Colômbia'],
				['VE','Venezuela'],
				['EC','Equador'],
				['MX','México'],
				['CA','Canadá'],
				['GB','Reino Unido (United Kingdom)'],
				['DE','Alemanha (Germany)'],
				['FR','França (France)'],
				['IT','Itália (Italy)'],
				['NL','Holanda (Netherlands)'],
				['BE','Bélgica (Belgium)'],
				['CH','Suíça (Switzerland)'],
				['AT','Áustria (Austria)'],
				['SE','Suécia (Sweden)'],
				['NO','Noruega (Norway)'],
				['DK','Dinamarca (Denmark)'],
				['FI','Finlândia (Finland)'],
				['IE','Irlanda (Ireland)'],
				['PL','Polônia (Poland)'],
				['CZ','República Tcheca (Czechia)'],
				['RO','Romênia (Romania)'],
				['GR','Grécia (Greece)'],
				['TR','Turquia (Türkiye)'],
				['RU','Rússia (Russia)'],
				['UA','Ucrânia (Ukraine)'],
				['IN','Índia (India)'],
				['BD','Bangladesh'],
				['ID','Indonésia (Indonesia)'],
				['MY','Malásia (Malaysia)'],
				['SG','Singapura (Singapore)'],
				['PH','Filipinas (Philippines)'],
				['TH','Tailândia (Thailand)'],
				['VN','Vietnã (Vietnam)'],
				['JP','Japão (Japan)'],
				['KR','Coreia do Sul (South Korea)'],
				['CN','China'],
				['HK','Hong Kong'],
				['TW','Taiwan'],
				['AU','Austrália (Australia)'],
				['NZ','Nova Zelândia (New Zealand)'],
				['SA','Arábia Saudita (Saudi Arabia)'],
				['AE','Emirados Árabes (UAE)'],
				['QA','Catar (Qatar)'],
				['KW','Kuwait'],
				['IL','Israel'],
				['EG','Egito (Egypt)'],
				['ZA','África do Sul (South Africa)'],
				['NG','Nigéria (Nigeria)'],
				['KE','Quênia (Kenya)'],
				['MA','Marrocos (Morocco)'],
				['PA','Panamá (Max Power)']
			];
			const seenCountries = {};
			preferredCountries.forEach(function(item){ seenCountries[item[0]]=1; country.appendChild(E('option',{value:item[0]},[item[1]+' ('+item[0]+')'])); });
			(this.countries||[]).slice().sort(function(a,b){ return String(a.country||a.code).localeCompare(String(b.country||b.code)); }).forEach(function(item){
				const code = String(item.code||item.iso3166||'').toUpperCase();
				if(!code || seenCountries[code]) return;
				seenCountries[code]=1;
				country.appendChild(E('option',{value:code},[(item.country||code)+' ('+code+')']));
			});
			country.value = saved.country || 'BR';

			const isValidIpv4 = function(ip){
				const parts = String(ip || '').trim().split('.');
				if (parts.length !== 4) return false;
				for (let i = 0; i < 4; i++) {
					const n = parseInt(parts[i], 10);
					if (isNaN(n) || n < 0 || n > 255 || String(n) !== parts[i]) return false;
				}
				return true;
			};
			const isValidMac = function(mac){
				return /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(String(mac || '').trim());
			};

			// WAN 1 Configuration
			const wan1Proto = select(saved.wan1_proto || 'dhcp', [
				['dhcp', 'Modem da Operadora / Starlink / Cabo (DHCP Automático - Plug & Play)'],
				['pppoe', 'Fibra Ótica com Login (PPPoE - Usuário e Senha)'],
				['static', 'IP Fixo / Manual (Estático)']
			]);
			const wan1Username = input('text', saved.wan1_username || '', { placeholder: 'ex: usuario@provedor' });
			const wan1PasswordWrap = passwordWithToggle(saved.wan1_password || '', 'senha PPPoE do provedor');
			const wan1ModemIp = input('text', saved.wan1_modem_ip || '', { placeholder: 'ex: 192.168.1.1 ou 192.168.18.1' });
			const wan1Macaddr = input('text', saved.wan1_macaddr || '', { placeholder: 'ex: AA:BB:CC:DD:EE:FF (vazio = MAC de fábrica)' });
			const wan1Ip = input('text', saved.wan1_ipaddr || '', { placeholder: 'ex: 192.168.1.50' });
			const wan1Mask = input('text', saved.wan1_netmask || '255.255.255.0', { placeholder: '255.255.255.0' });
			const wan1Gw = input('text', saved.wan1_gateway || '', { placeholder: 'ex: 192.168.1.1' });
			const wan1Dns = input('text', saved.wan1_dns || '', { placeholder: 'ex: 1.1.1.1 8.8.8.8' });

			const pppoeBox = E('div', { class: 'ex-ez-grid', style: 'margin-top: 10px; display: none;' }, [
				this.ezField('Usuário PPPoE', wan1Username, 'Fornecido pelo seu provedor de internet.'),
				this.ezField('Senha PPPoE', wan1PasswordWrap, 'Senha do seu provedor de internet.'),
				this.ezField('IP de Acesso ao Modem / ONU', wan1ModemIp, 'Opcional: permite abrir a tela do modem/ONU em Bridge sem trocar cabos.'),
				this.ezField('Clonar MAC da WAN', wan1Macaddr, 'Opcional: copie o MAC do roteador anterior se o provedor exigir.')
			]);
			const staticBox = E('div', { class: 'ex-ez-grid', style: 'margin-top: 10px; display: none;' }, [
				this.ezField('Endereço IPv4 Fixo', wan1Ip),
				this.ezField('Máscara de Rede', wan1Mask),
				this.ezField('Gateway Padrão', wan1Gw),
				this.ezField('Servidores DNS', wan1Dns)
			]);

			const syncWan1Proto = function(){
				if(wan1Proto.value === 'pppoe'){
					pppoeBox.style.display = '';
					staticBox.style.display = 'none';
				} else if(wan1Proto.value === 'static'){
					pppoeBox.style.display = 'none';
					staticBox.style.display = '';
				} else {
					pppoeBox.style.display = 'none';
					staticBox.style.display = 'none';
				}
			};
			wan1Proto.addEventListener('change', syncWan1Proto);
			syncWan1Proto();

			// WAN 2 Configuration (Optional)
			const wan2Enabled = checkbox(saved.wan2_enabled === true);
			const availableLanPorts = (this.currentData && this.currentData.lanPorts && this.currentData.lanPorts.length) ? this.currentData.lanPorts : ['lan1', 'lan2', 'lan3'];
			const portOptions = availableLanPorts.map(function(p) { return [p, portLabel(p) + ' (porta física ' + p + ')']; });
			const wan2Port = select(saved.wan2_port || 'lan1', portOptions);
			const wanMode = select(saved.wan_mode || 'failover', [
				['failover', 'Failover (WAN1 principal, WAN2 reserva se cair)'],
				['balanced', 'Balanceamento (dividir conexões entre as duas)'],
				['single', 'Somente WAN1'],
				['wan2', 'Forçar somente WAN2']
			]);
			const wan2Proto = select(saved.wan2_proto || 'dhcp', [
				['dhcp', 'Modem da Operadora / Starlink / Cabo (DHCP Automático)'],
				['pppoe', 'Fibra Ótica com Login (PPPoE - Usuário e Senha)'],
				['static', 'IP Fixo / Manual (Estático)']
			]);
			const wan2Username = input('text', saved.wan2_username || '', { placeholder: 'ex: usuario@provedor2' });
			const wan2PasswordWrap = passwordWithToggle(saved.wan2_password || '', 'senha PPPoE da WAN2');
			const wan2ModemIp = input('text', saved.wan2_modem_ip || '', { placeholder: 'ex: 192.168.2.1 ou 192.168.18.1' });
			const wan2Macaddr = input('text', saved.wan2_macaddr || '', { placeholder: 'ex: AA:BB:CC:DD:EE:FF (vazio = MAC de fábrica)' });
			const wan2Ip = input('text', saved.wan2_ipaddr || '', { placeholder: 'ex: 192.168.2.50' });
			const wan2Mask = input('text', saved.wan2_netmask || '255.255.255.0', { placeholder: '255.255.255.0' });
			const wan2Gw = input('text', saved.wan2_gateway || '', { placeholder: 'ex: 192.168.2.1' });
			const wan2Dns = input('text', saved.wan2_dns || '', { placeholder: 'ex: 1.1.1.1 8.8.8.8' });

			const wan2PppoeBox = E('div', { class: 'ex-ez-grid', style: 'margin-top: 10px; display: none;' }, [
				this.ezField('Usuário PPPoE (WAN2)', wan2Username, 'Fornecido pelo segundo provedor de internet.'),
				this.ezField('Senha PPPoE (WAN2)', wan2PasswordWrap, 'Senha do segundo provedor.'),
				this.ezField('IP de Acesso ao Modem / ONU (WAN2)', wan2ModemIp, 'Opcional: permite abrir o painel da ONU 2 em Bridge.'),
				this.ezField('Clonar MAC da WAN 2', wan2Macaddr, 'Opcional: se o provedor 2 exigir o MAC do roteador anterior.')
			]);
			const wan2StaticBox = E('div', { class: 'ex-ez-grid', style: 'margin-top: 10px; display: none;' }, [
				this.ezField('Endereço IPv4 Fixo (WAN2)', wan2Ip),
				this.ezField('Máscara de Rede (WAN2)', wan2Mask),
				this.ezField('Gateway Padrão (WAN2)', wan2Gw),
				this.ezField('Servidores DNS (WAN2)', wan2Dns)
			]);

			const syncWan2Proto = function(){
				if(wan2Proto.value === 'pppoe'){
					wan2PppoeBox.style.display = '';
					wan2StaticBox.style.display = 'none';
				} else if(wan2Proto.value === 'static'){
					wan2PppoeBox.style.display = 'none';
					wan2StaticBox.style.display = '';
				} else {
					wan2PppoeBox.style.display = 'none';
					wan2StaticBox.style.display = 'none';
				}
			};
			wan2Proto.addEventListener('change', syncWan2Proto);
			syncWan2Proto();

			const wan2Box = E('div', { style: 'margin-top: 12px; display: ' + (wan2Enabled.checked ? '' : 'none') + ';' }, [
				E('div', { class: 'ex-ez-grid ex-ez-grid-3' }, [
					this.ezField('Modo de Operação', wanMode, 'Failover troca se a WAN1 cair; Balanceamento divide tráfego.'),
					this.ezField('Porta Física para WAN2', wan2Port, 'Porta do aparelho que receberá a segunda internet.'),
					this.ezField('Tipo de Conexão (WAN2)', wan2Proto, 'Protocolo de internet da segunda porta.')
				]),
				wan2PppoeBox,
				wan2StaticBox,
				E('div', { class: 'alert-message info', style: 'margin-top: 10px; font-size: 0.8rem; line-height: 1.4;' }, [
					E('strong', {}, ['📌 Dica: ']),
					'Confira a numeração das portas na carcaça do aparelho (ex: LAN1, LAN2) para conectar o cabo do segundo modem.'
				])
			]);
			wan2Enabled.addEventListener('change', function(){
				wan2Box.style.display = wan2Enabled.checked ? '' : 'none';
			});

			// Wi-Fi Principal (Suporte a Unificado ou Redes Separadas 2.4G e 5G)
			const wifiMode = select(saved.wifi_mode || 'unified', [
				['unified', 'Unificar 2,4 GHz e 5 GHz (Recomendado - Band Steering)'],
				['split', 'Separar redes em 2,4 GHz e 5 GHz independentes']
			]);
			const mainSsid = input('text', saved.main_ssid || 'ARK Router', { maxlength: 32 });
			const mainKeyWrap = passwordWithToggle(saved.main_key || '', saved.main_key ? 'manter senha atual (' + saved.main_key + ')' : 'mínimo 8 caracteres');

			const mainSsid2g = input('text', saved.main_ssid_2g || saved.main_ssid || 'ARK Router-2.4G', { maxlength: 32 });
			const mainKey2gWrap = passwordWithToggle(saved.main_key_2g || saved.main_key || '', saved.main_key ? 'manter senha atual' : 'mínimo 8 caracteres');
			const mainSsid5g = input('text', saved.main_ssid_5g || (saved.main_ssid ? saved.main_ssid + '_5G' : 'ARK Router-5G'), { maxlength: 32 });
			const mainKey5gWrap = passwordWithToggle(saved.main_key_5g || saved.main_key || '', (saved.main_key_5g || saved.main_key) ? 'manter senha atual' : 'mínimo 8 caracteres');

			const unifiedWifiBox = E('div', { class: 'ex-ez-grid' }, [
				this.ezField('Nome da Rede (SSID Único)', mainSsid, 'Mesmo nome para 2,4 GHz e 5 GHz.'),
				this.ezField('Senha do Wi-Fi', mainKeyWrap, saved.main_key ? 'Deixe em branco para manter a senha atual (' + saved.main_key + ') ou digite uma nova.' : 'Mínimo 8 caracteres.')
			]);

			const splitWifiBox = E('div', {}, [
				E('div', { class: 'alert-message info', style: 'font-size: 0.82rem; line-height: 1.4; margin-bottom: 10px;' }, [
					E('strong', {}, ['📡 Redes Separadas: ']),
					'As frequências 2,4 GHz (maior alcance) e 5 GHz (maior velocidade) possuem nomes e senhas independentes.'
				]),
				E('div', { class: 'ex-ez-grid', style: 'margin-bottom: 12px;' }, [
					this.ezField('Nome da Rede 2,4 GHz (SSID)', mainSsid2g, 'Dispositivos IoT e conexões de longo alcance.'),
					this.ezField('Senha 2,4 GHz', mainKey2gWrap, saved.main_key ? 'Deixe em branco para manter a senha atual ou digite nova.' : 'Mínimo 8 caracteres.')
				]),
				E('div', { class: 'ex-ez-grid' }, [
					this.ezField('Nome da Rede 5 GHz (SSID)', mainSsid5g, 'Smartphones, PCs e TVs com máxima velocidade.'),
					this.ezField('Senha 5 GHz', mainKey5gWrap, (saved.main_key_5g || saved.main_key) ? 'Deixe em branco para manter ou digite nova.' : 'Mínimo 8 caracteres.')
				])
			]);

			const syncWifiMode = function(){
				if(wifiMode.value === 'split'){
					unifiedWifiBox.style.display = 'none';
					splitWifiBox.style.display = '';
				} else {
					unifiedWifiBox.style.display = '';
					splitWifiBox.style.display = 'none';
				}
			};
			wifiMode.addEventListener('change', syncWifiMode);
			syncWifiMode();

			// Wi-Fi Visitante
			const guestEnabled = checkbox(saved.guest_enabled === true);
			const guestSsid = input('text', saved.guest_ssid || 'ARK Router Visitantes', { maxlength: 32 });
			const guestKeyWrap = passwordWithToggle(saved.guest_key || '', 'mínimo 8 caracteres');
			const guestLimitEnabled = checkbox(saved.guest_limit_enabled !== false);
			const guestDownload = input('number', kbpsToMbpsInput(saved.guest_download_kbps || '0'), { min: 0, max: 100000, step: '0.1' });
			const guestUpload = input('number', kbpsToMbpsInput(saved.guest_upload_kbps || '1500'), { min: 0, max: 100000, step: '0.1' });

			const guestBox = E('div', { style: 'margin-top: 12px; display: ' + (guestEnabled.checked ? '' : 'none') + ';' }, [
				E('div', { class: 'ex-ez-grid' }, [
					this.ezField('Nome da Rede Visitante', guestSsid),
					this.ezField('Senha da Rede Visitante', guestKeyWrap, 'Mínimo 8 caracteres.'),
					this.ezField('Limitar Velocidade dos Visitantes', guestLimitEnabled, 'Evita que visitantes sobrecarreguem sua internet.'),
					this.ezField('Download Máximo Visitante (Mbps)', guestDownload, '0 = sem limite.'),
					this.ezField('Upload Máximo Visitante (Mbps)', guestUpload, '0 = sem limite.')
				])
			]);
			guestEnabled.addEventListener('change', function(){
				guestBox.style.display = guestEnabled.checked ? '' : 'none';
			});

			// Senha do Administrador (root)
			const adminToggle = checkbox(false);
			const adminPassWrap = passwordWithToggle('', 'nova senha do administrador (root)');
			const adminConfirmWrap = passwordWithToggle('', 'digite a senha novamente');
			const adminMatchAlert = E('small', { style: 'color: #ef4444; display: none; font-weight: 600;' }, ['As senhas não coincidem.']);

			const checkAdminMatch = function(){
				if(!adminToggle.checked){
					adminMatchAlert.style.display = 'none';
					return true;
				}
				const p1 = adminPassWrap.getValue();
				const p2 = adminConfirmWrap.getValue();
				if(p1 && p2 && p1 !== p2){
					adminMatchAlert.style.display = 'block';
					return false;
				}
				adminMatchAlert.style.display = 'none';
				return true;
			};
			adminPassWrap.input.addEventListener('input', checkAdminMatch);
			adminConfirmWrap.input.addEventListener('input', checkAdminMatch);

			const adminBox = E('div', { style: 'margin-top: 12px; display: none;' }, [
				E('div', { class: 'ex-ez-grid' }, [
					this.ezField('Nova Senha do Administrador', adminPassWrap, 'Mínimo 6 caracteres para acesso ao painel.'),
					this.ezField('Confirmar Nova Senha', adminConfirmWrap, adminMatchAlert)
				])
			]);
			adminToggle.addEventListener('change', function(){
				adminBox.style.display = adminToggle.checked ? '' : 'none';
				checkAdminMatch();
			});

			// SQM CAKE
			const sqmEnabled = checkbox(!!saved.sqm_enabled);
			const sqmStrategy = select(saved.sqm_strategy || 'manual', [
				['manual', 'Definir limites manualmente'],
				['calibrate_later', 'Medir depois pelo painel'],
				['off', 'Não configurar SQM agora']
			]);
			const sqmWanUp = input('number', kbpsToMbpsInput(saved.sqm_wan_upload), { placeholder: 'ex.: 15', min: 0, max: 100000, step: '0.1' });
			const sqmWanDown = input('number', kbpsToMbpsInput(saved.sqm_wan_download), { placeholder: 'ex.: 1200', min: 0, max: 100000, step: '0.1' });
			const sqmWan2Up = input('number', kbpsToMbpsInput(saved.sqm_wan2_upload), { placeholder: 'opcional', min: 0, max: 100000, step: '0.1' });
			const sqmWan2Down = input('number', kbpsToMbpsInput(saved.sqm_wan2_download), { placeholder: 'opcional', min: 0, max: 100000, step: '0.1' });

			const sqmBox = E('div', { style: 'margin-top: 12px; display: ' + (sqmEnabled.checked ? '' : 'none') + ';' }, [
				E('div', { class: 'alert-message info', style: 'font-size: 0.82rem; line-height: 1.45; margin-bottom: 12px;' }, [
					E('strong', {}, ['⚡ Recomendação: ']),
					'O SQM CAKE elimina o lag em jogos e reuniões durante downloads pesados. Para planos acima de 500 Mbps, recomenda-se deixar desativado para utilizar o Fastpath por hardware.'
				]),
				E('div', { class: 'ex-ez-grid' }, [
					this.ezField('Estratégia', sqmStrategy),
					this.ezField('Download da WAN1 (Mbps)', sqmWanDown, 'Insira 90% a 95% do seu plano contratado.'),
					this.ezField('Upload da WAN1 (Mbps)', sqmWanUp, 'Insira 90% a 95% do upload contratado.'),
					this.ezField('Download da WAN2 (Mbps)', sqmWan2Down, 'Opcional (se tiver WAN2 ativa).'),
					this.ezField('Upload da WAN2 (Mbps)', sqmWan2Up, 'Opcional (se tiver WAN2 ativa).')
				])
			]);
			sqmEnabled.addEventListener('change', function(){
				sqmBox.style.display = sqmEnabled.checked ? '' : 'none';
			});

			// DNS e Segurança
			const dnsMode = select(saved.dns_mode || 'recommended', [
				['recommended', 'DNS Recomendado (Cloudflare + Google rápido)'],
				['operator', 'DNS da Operadora (Automático via ISP)'],
				['custom', 'DNS Personalizado']
			]);
			const savedDns = String(saved.dns_servers || '1.1.1.1 1.0.0.1 8.8.8.8').split(/\s+/);
			const dns1 = input('text', savedDns[0] || '1.1.1.1', { placeholder: 'DNS 1' });
			const dns2 = input('text', savedDns[1] || '1.0.0.1', { placeholder: 'DNS 2' });
			const dns3 = input('text', savedDns[2] || '8.8.8.8', { placeholder: 'DNS 3 opcional' });

			const customDnsBox = E('div', { class: 'ex-ez-grid ex-ez-grid-3', style: 'margin-top: 10px; display: none;' }, [
				this.ezField('DNS Primário', dns1, 'Ex: 1.1.1.1 ou 2606:4700:4700::1111'),
				this.ezField('DNS Secundário', dns2, 'Ex: 1.0.0.1 ou 2001:4860:4860::8888'),
				this.ezField('DNS Terciário (Opcional)', dns3, 'Opcional')
			]);
			const syncDnsMode = function(){
				customDnsBox.style.display = (dnsMode.value === 'custom') ? '' : 'none';
			};
			dnsMode.addEventListener('change', syncDnsMode);
			syncDnsMode();

			const ipv6Select = select(saved.disable_ipv6 ? 'disable' : 'enable', [
				['enable', '🟢 Pilha Dupla Global (IPv6 Ativo - Recomendado)'],
				['disable', '🟡 Desativar IPv6 (Operar Apenas em IPv4)']
			]);

			const isLegacy = !!(this.capabilities && this.capabilities.hardware && this.capabilities.hardware.is_legacy_owrt);
			const disableWps = checkbox(saved.disable_wps !== false);

			// Módulos Opcionais
			const defaultModules = 'sqm mwan3 nlbwmon upnp';
			const modules = (saved.install_modules || defaultModules).split(/\s+/), moduleBoxes = {};
			const moduleNames = {
				sqm: 'SQM / CAKE',
				mwan3: 'Multi‑WAN',
				nlbwmon: 'Consumo por dispositivo',
				upnp: 'UPnP / NAT‑PMP',
				irqbalance: 'Multicore IRQ Balance'
			};
			const candidateKeys = ['sqm', 'mwan3', 'nlbwmon', 'upnp'];
			const cpuCores = ((this.capabilities && this.capabilities.hardware && this.capabilities.hardware.cpu_cores) || 1);
			const irqFeat = this.feature('irqbalance') || {};
			if (cpuCores > 1 && irqFeat.installable) candidateKeys.push('irqbalance');
			const modKeys = candidateKeys.filter(L.bind(function(key){
				const f = this.feature(key) || {};
				return f.installed || f.installable;
			}, this));
			modKeys.forEach(L.bind(function(key){
				const f = this.feature(key) || {}, inst = !!f.installed;
				moduleBoxes[key] = checkbox(inst || modules.indexOf(key) >= 0);
				moduleBoxes[key].disabled = inst;
			}, this));

			const progress = E('div', { class: 'ex-ez-progress' }, [
				E('strong', {}, ['Progresso salvo: etapa ', String(saved.applied_step || 0), '/7']),
				E('small', { class: 'ex-muted' }, [
					saved.state === 'applied' ? 'Configuração já aplicada anteriormente.' : (saved.last_step ? 'Última etapa: ' + saved.last_step : 'Rascunho pronto para editar.')
				]),
				saved.backup ? E('code', {}, [saved.backup]) : ''
			]);

			const validateForm = function(){
				if(adminToggle.checked){
					const p1 = adminPassWrap.getValue();
					const p2 = adminConfirmWrap.getValue();
					if(!p1 || p1.length < 6){
						ui.addNotification(null, E('p', {}, ['A nova senha de administrador deve ter no mínimo 6 caracteres.']), 'warning');
						return false;
					}
					if(p1 !== p2){
						ui.addNotification(null, E('p', {}, ['As senhas de administrador digitadas não coincidem.']), 'warning');
						return false;
					}
				}
				if(wan1Proto.value === 'pppoe'){
					if(!wan1Username.value.trim()){
						ui.addNotification(null, E('p', {}, ['Informe o usuário da sua conexão de fibra PPPoE (WAN 1).']), 'warning');
						return false;
					}
					const mIp = wan1ModemIp.value.trim();
					if(mIp && !isValidIpv4(mIp)){
						ui.addNotification(null, E('p', {}, ['O IP do Modem / ONU da WAN 1 é inválido (ex: 192.168.1.1).']), 'warning');
						return false;
					}
					const mMac = wan1Macaddr.value.trim();
					if(mMac && !isValidMac(mMac)){
						ui.addNotification(null, E('p', {}, ['O MAC clonado da WAN 1 é inválido (formato: AA:BB:CC:DD:EE:FF).']), 'warning');
						return false;
					}
				}
				if(wan2Enabled.checked && wan2Proto.value === 'pppoe'){
					if(!wan2Username.value.trim()){
						ui.addNotification(null, E('p', {}, ['Informe o usuário da conexão PPPoE da WAN 2.']), 'warning');
						return false;
					}
					const mIp2 = wan2ModemIp.value.trim();
					if(mIp2 && !isValidIpv4(mIp2)){
						ui.addNotification(null, E('p', {}, ['O IP do Modem / ONU da WAN 2 é inválido (ex: 192.168.2.1).']), 'warning');
						return false;
					}
					const mMac2 = wan2Macaddr.value.trim();
					if(mMac2 && !isValidMac(mMac2)){
						ui.addNotification(null, E('p', {}, ['O MAC clonado da WAN 2 é inválido (formato: AA:BB:CC:DD:EE:FF).']), 'warning');
						return false;
					}
				}
				if(wan1Proto.value === 'static'){
					if(!wan1Ip.value.trim() || !wan1Mask.value.trim()){
						ui.addNotification(null, E('p', {}, ['Informe o endereço IPv4 e a máscara de rede da WAN 1.']), 'warning');
						return false;
					}
				}
				if(wan2Enabled.checked && wan2Proto.value === 'static'){
					if(!wan2Ip.value.trim() || !wan2Mask.value.trim()){
						ui.addNotification(null, E('p', {}, ['Informe o endereço IPv4 e a máscara de rede da WAN 2.']), 'warning');
						return false;
					}
				}
				if(wifiMode.value === 'split'){
					if(!mainSsid2g.value.trim() || !mainSsid5g.value.trim()){
						ui.addNotification(null, E('p', {}, ['Os nomes das redes Wi-Fi 2,4 GHz e 5 GHz não podem ficar em branco.']), 'warning');
						return false;
					}
					const mk2 = mainKey2gWrap.getValue();
					if(mk2 && mk2.length < 8){
						ui.addNotification(null, E('p', {}, ['A senha do Wi-Fi 2,4 GHz deve ter no mínimo 8 caracteres.']), 'warning');
						return false;
					}
					const mk5 = mainKey5gWrap.getValue();
					if(mk5 && mk5.length < 8){
						ui.addNotification(null, E('p', {}, ['A senha do Wi-Fi 5 GHz deve ter no mínimo 8 caracteres.']), 'warning');
						return false;
					}
				} else {
					if(!mainSsid.value.trim()){
						ui.addNotification(null, E('p', {}, ['O nome do Wi-Fi principal não pode ficar em branco.']), 'warning');
						return false;
					}
					const mk = mainKeyWrap.getValue();
					if(mk && mk.length < 8){
						ui.addNotification(null, E('p', {}, ['A senha do Wi-Fi principal deve ter no mínimo 8 caracteres.']), 'warning');
						return false;
					}
				}
				if(guestEnabled.checked){
					const gk = guestKeyWrap.getValue();
					if(gk && gk.length < 8){
						ui.addNotification(null, E('p', {}, ['A senha da rede visitante deve ter no mínimo 8 caracteres.']), 'warning');
						return false;
					}
				}
				return true;
			};

			const collect = L.bind(function(){
				const selectedModules = Object.keys(moduleBoxes).filter(function(k){ return moduleBoxes[k].checked && !moduleBoxes[k].disabled; }).join(' ');
				const dnsServers = [dns1.value.trim(), dns2.value.trim(), dns3.value.trim()].filter(Boolean).join(' ');
				const effectiveMainSsid = (wifiMode.value === 'split') ? mainSsid2g.value.trim() : mainSsid.value.trim();
				const args = [
					'ez-setup-save',
					'language=' + language.value,
					'router_name=' + routerName.value,
					'country=' + country.value,
					'wifi_mode=' + wifiMode.value,
					'main_ssid=' + effectiveMainSsid,
					'main_ssid_2g=' + mainSsid2g.value.trim(),
					'main_ssid_5g=' + mainSsid5g.value.trim(),
					'wan1_proto=' + wan1Proto.value,
					'wan1_username=' + wan1Username.value.trim(),
					'wan1_password=' + wan1PasswordWrap.getValue().trim(),
					'wan1_ipaddr=' + wan1Ip.value.trim(),
					'wan1_netmask=' + wan1Mask.value.trim(),
					'wan1_gateway=' + wan1Gw.value.trim(),
					'wan1_dns=' + wan1Dns.value.trim(),
					'wan1_macaddr=' + (wan1Proto.value === 'pppoe' ? wan1Macaddr.value.trim() : ''),
					'wan1_modem_ip=' + (wan1Proto.value === 'pppoe' ? wan1ModemIp.value.trim() : ''),
					'wan2_enabled=' + (wan2Enabled.checked ? '1' : '0'),
					'wan2_port=' + wan2Port.value,
					'wan_mode=' + wanMode.value,
					'wan2_proto=' + wan2Proto.value,
					'wan2_username=' + wan2Username.value.trim(),
					'wan2_password=' + wan2PasswordWrap.getValue().trim(),
					'wan2_ipaddr=' + wan2Ip.value.trim(),
					'wan2_netmask=' + wan2Mask.value.trim(),
					'wan2_gateway=' + wan2Gw.value.trim(),
					'wan2_dns=' + wan2Dns.value.trim(),
					'wan2_macaddr=' + ((wan2Enabled.checked && wan2Proto.value === 'pppoe') ? wan2Macaddr.value.trim() : ''),
					'wan2_modem_ip=' + ((wan2Enabled.checked && wan2Proto.value === 'pppoe') ? wan2ModemIp.value.trim() : ''),
					'guest_enabled=' + (guestEnabled.checked ? '1' : '0'),
					'guest_ssid=' + guestSsid.value,
					'guest_limit_enabled=' + (guestLimitEnabled.checked ? '1' : '0'),
					'guest_download_kbps=' + mbpsToKbps(guestDownload.value),
					'guest_upload_kbps=' + mbpsToKbps(guestUpload.value),
					'change_admin_password=' + (adminToggle.checked ? '1' : '0'),
					'admin_password=' + (adminToggle.checked ? adminPassWrap.getValue().trim() : ''),
					'sqm_enabled=' + (sqmEnabled.checked ? '1' : '0'),
					'sqm_strategy=' + sqmStrategy.value,
					'sqm_wan_upload=' + mbpsToKbps(sqmWanUp.value),
					'sqm_wan_download=' + mbpsToKbps(sqmWanDown.value),
					'sqm_wan2_upload=' + mbpsToKbps(sqmWan2Up.value),
					'sqm_wan2_download=' + mbpsToKbps(sqmWan2Down.value),
					'dns_mode=' + dnsMode.value,
					'dns_servers=' + dnsServers,
					'disable_ipv6=' + (ipv6Select.value === 'disable' ? '1' : '0'),
					'disable_wps=' + (disableWps.checked ? '1' : '0'),
					'install_modules=' + selectedModules
				];
				if(wifiMode.value === 'split'){
					if(mainKey2gWrap.getValue()) args.push('main_key_2g=' + mainKey2gWrap.getValue().trim(), 'main_key=' + mainKey2gWrap.getValue().trim());
					if(mainKey5gWrap.getValue()) args.push('main_key_5g=' + mainKey5gWrap.getValue().trim());
				} else {
					if(mainKeyWrap.getValue()) args.push('main_key=' + mainKeyWrap.getValue().trim());
				}
				if(guestKeyWrap.getValue()) args.push('guest_key=' + guestKeyWrap.getValue().trim());
				return args;
			}, this);

			const saveDraft = L.bind(function(){
				if(!validateForm()) return Promise.reject(new Error('Validação pendente'));
				return fs.exec('/usr/sbin/equipe-dashboard-control', collect()).then(function(r){
					if(r.code) throw new Error(r.stderr || 'Falha ao salvar o Ark - Setup');
					ui.addNotification(null, E('p', {}, ['Rascunho do Ark - Setup salvo com sucesso.']));
				}).catch(function(e){
					if(reloadAfterExpectedDisconnect(e, 'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…', 4200)) return;
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				});
			}, this);

			const applySetup = L.bind(function(){
				if(!validateForm()) return;
				return saveDraft().then(L.bind(function(){
					ui.showModal('Aplicar Ark - Setup', [
						E('p', { class: 'alert-message warning' }, ['O roteador criará um backup em /tmp e aplicará as etapas salvas. A internet, Wi‑Fi e DNS serão sincronizados.']),
						E('p', {}, ['Se a conexão cair momentaneamente, reconecte no novo Wi-Fi e recarregue o painel; o progresso fica salvo.']),
						(function(){
							const applyBtn = E('button', {
								class: 'btn cbi-button cbi-button-positive',
								style: 'min-height:40px; min-width:180px; user-select:none; -webkit-tap-highlight-color:transparent;',
								disabled: true
							}, ['Confirmar e aplicar (2s)']);
							let remaining = 2;
							const interval = window.setInterval(function(){
								remaining--;
								if(remaining > 0){
									applyBtn.textContent = 'Confirmar e aplicar (' + remaining + 's)';
								} else {
									window.clearInterval(interval);
									applyBtn.textContent = 'Confirmar e aplicar';
									applyBtn.disabled = false;
								}
							}, 1000);
							applyBtn.addEventListener('click', function(ev){
								ev.preventDefault();
								ev.stopPropagation();
								applyBtn.disabled = true;
								applyBtn.textContent = 'Aplicando…';
								return fs.exec('/usr/sbin/equipe-dashboard-control', ['ez-setup-apply']).then(function(r){
									if(r.code) throw new Error(r.stderr || 'Falha ao aplicar o Ark - Setup');
									let out = {};
									try { out = JSON.parse(r.stdout || '{}'); } catch(e){}
									ui.hideModal();
									ui.addNotification(null, E('p', {}, ['Ark - Setup aplicado com sucesso! Backup: ', out.backup || '/tmp/ark-router-ezsetup-backup-*.tar.gz']));
									window.setTimeout(function(){ window.location.reload(); }, 2000);
								}).catch(function(e){
									if(reloadAfterExpectedDisconnect(e, 'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…', 4200)) return;
									ui.addNotification(null, E('p', {}, [e.message]), 'danger');
									applyBtn.disabled = false;
									applyBtn.textContent = 'Confirmar e aplicar';
								});
							}, true);
							return E('div', { class: 'right' }, [
								E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Cancelar']),
								' ',
								applyBtn
							]);
						})()
					]);
				}, this));
			}, this);

			const pollSetupModules = L.bind(function(){
				this.showPackageInstallProgressModal({
					title: 'Instalando Módulos do Ark - Setup',
					stageCmd: 'ez-setup-install-stage',
					logCmd: 'ez-setup-install-log',
					statusCmd: 'ez-setup-install-status',
					successMsg: 'Módulos do Ark - Setup instalados com sucesso! Recarregando painel…'
				});
			}, this);

			const installModules = L.bind(function(){
				return saveDraft().then(L.bind(function(){
					ui.showModal('Instalar módulos do Ark - Setup', [
						E('p', { class: 'alert-message warning' }, ['A lista de pacotes será atualizada e os módulos selecionados serão instalados em segundo plano.']),
						E('div', { class: 'right' }, [
							E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Cancelar']),
							' ',
							E('button', { class: 'btn cbi-button cbi-button-positive', 'click': L.bind(function(){
								return fs.exec('/usr/sbin/equipe-dashboard-control', ['ez-setup-install-modules']).then(L.bind(function(r){
									if(r.code) throw new Error(r.stderr || 'Falha ao iniciar instalação');
									const state = String(r.stdout || '').trim();
									if(state === 'installed'){
										ui.hideModal();
										ui.addNotification(null, E('p', {}, ['Nenhum módulo pendente para instalar.']));
										return;
									}
									this.showPackageInstallProgressModal({
										title: 'Instalando Módulos do Ark - Setup',
										stageCmd: 'ez-setup-install-stage',
										logCmd: 'ez-setup-install-log',
										statusCmd: 'ez-setup-install-status',
										successMsg: 'Módulos do Ark - Setup instalados com sucesso! Recarregando painel…'
									});
								}, this)).catch(function(e){
									if(reloadAfterExpectedDisconnect(e, 'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…', 4200)) return;
									ui.addNotification(null, E('p', {}, [e.message]), 'danger');
								});
							}, this) }, ['Confirmar instalação'])
						])
					]);
				}, this));
			}, this);

			const reset = L.bind(function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control', ['ez-setup-reset']).then(function(){
					ui.hideModal();
					ui.addNotification(null, E('p', {}, ['Rascunho do Ark - Setup apagado.']));
				}).catch(function(e){
					if(reloadAfterExpectedDisconnect(e, 'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…', 4200)) return;
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				});
			}, this);

			const moduleList = E('div', { class: 'ex-ez-module-grid' }, Object.keys(moduleBoxes).map(L.bind(function(k){
				const f = this.feature(k);
				if(f.installed) return E('div', { class: 'ex-ez-module-installed' }, [E('b', {}, ['✓']), E('span', {}, [moduleNames[k] || k, E('small', {}, ['Já instalado'])])]);
				return E('label', {}, [moduleBoxes[k], E('span', {}, [moduleNames[k] || k, E('small', {}, ['Opcional'])])]);
			}, this)));

			ui.showModal('Ark - Setup', [E('div', { class: 'ex-ez-setup' }, [
				progress,
				E('section', { class: 'ex-ez-section' }, [
					E('h3', {}, ['1. Idioma, nome e país']),
					E('div', { class: 'ex-ez-grid ex-ez-grid-3' }, [
						this.ezField('Idioma do Painel', language),
						this.ezField('Nome do Roteador', routerName),
						this.ezField('País Regulatório', country, 'Define os canais e limites de potência do Wi-Fi.')
					])
				]),
				E('section', { class: 'ex-ez-section ex-ez-primary' }, [
					E('div', { style: 'display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:12px;' }, [
						E('h3', { style: 'margin:0 !important;' }, ['2. Como a internet entra no roteador?']),
						E('span', { class: 'ex-device-badge', style: 'background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-size:0.75rem; padding:3px 8px; border-radius:6px;' }, [
							saved.wan1_online ? '🟢 Internet Principal Detectada' : '⚪ Aguardando Conexão'
						])
					]),
					E('div', { class: 'ex-ez-grid' }, [
						this.ezField('Tipo de Conexão (WAN1)', wan1Proto, 'Escolha como o cabo do modem ou fibra chega ao roteador.')
					]),
					pppoeBox,
					staticBox,
					E('hr', { style: 'margin: 16px 0; border: none; border-top: 1px solid rgba(127,127,127,0.15);' }),
					E('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
						wan2Enabled,
						E('span', { style: 'font-weight:700; font-size:0.9rem;' }, ['Possui uma segunda internet de reserva (WAN 2)?'])
					]),
					wan2Box
				]),
				E('section', { class: 'ex-ez-section' }, [
					E('h3', {}, ['3. Wi‑Fi principal']),
					E('div', { class: 'ex-ez-grid', style: 'margin-bottom: 12px;' }, [
						this.ezField('Modo de Frequência Wi-Fi', wifiMode, 'Unificado usa Band Steering automático; Separado permite nomes e senhas distintos para 2,4 GHz e 5 GHz.')
					]),
					unifiedWifiBox,
					splitWifiBox
				]),
				E('section', { class: 'ex-ez-section' }, [
					E('div', { style: 'display:flex; align-items:center; gap:8px; margin-bottom: 6px;' }, [
						guestEnabled,
						E('h3', { style: 'margin:0 !important;' }, ['4. Habilitar rede de visitantes'])
					]),
					E('p', { class: 'ex-muted', style: 'margin:0 0 6px 0; font-size:0.82rem;' }, ['Cria uma rede isolada para visitas, sem acesso aos computadores e arquivos da sua rede interna.']),
					guestBox
				]),
				E('section', { class: 'ex-ez-section' }, [
					E('div', { style: 'display:flex; align-items:center; gap:8px; margin-bottom: 6px;' }, [
						adminToggle,
						E('h3', { style: 'margin:0 !important;' }, ['5. Alterar senha de administrador do roteador'])
					]),
					E('p', { class: 'ex-muted', style: 'margin:0 0 6px 0; font-size:0.82rem;' }, ['Ative para definir uma nova senha de acesso ao painel web e SSH (usuário root).']),
					adminBox
				]),
				E('section', { class: 'ex-ez-section' }, [
					E('h3', {}, ['6. DNS e segurança']),
					E('div', { class: 'ex-ez-grid' }, [
						this.ezField('Servidores DNS', dnsMode),
						this.ezField('Conectividade IPv6', ipv6Select, 'Mantenha Pilha Dupla para jogos e sites modernos.'),
						this.ezField('Desativar WPS', disableWps, 'Recomendado manter desativado por segurança.')
					]),
					customDnsBox
				]),
				E('section', { class: 'ex-ez-section' }, [
					E('div', { style: 'display:flex; align-items:center; gap:8px; margin-bottom: 6px;' }, [
						sqmEnabled,
						E('h3', { style: 'margin:0 !important;' }, ['7. Anti-Lag para Jogos (SQM CAKE)'])
					]),
					E('p', { class: 'ex-muted', style: 'margin:0 0 6px 0; font-size:0.82rem;' }, ['Gerenciamento inteligente de fila de pacotes para manter ping estável mesmo com downloads pesados na casa.']),
					sqmBox
				]),
				E('section', { class: 'ex-ez-section' }, (function(){
					const allInstalled = modKeys.every(L.bind(function(k){ return !!(this.feature(k)||{}).installed; }, this));
					return [
						E('h3', {}, ['8. Recursos opcionais']),
						E('p', { class: 'ex-muted' }, ['Módulos adicionais do sistema. Os marcados como "Já instalado" já estão presentes na memória ROM.']),
						moduleList,
						allInstalled
							? E('div', { class: 'alert-message success', style: 'margin-top: 10px; font-size: 0.85rem; font-weight: 650;' }, ['✓ Todos os módulos recomendados já estão integrados e prontos para uso.'])
							: E('button', { class: 'ex-mini-button ex-ez-install-modules', 'click': installModules }, ['Instalar módulos selecionados'])
					];
				}).call(this)),
				E('div', { class: 'right' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Fechar']),
					' ',
					E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': reset }, ['Apagar rascunho']),
					' ',
					E('button', { class: 'btn cbi-button cbi-button-action', 'click': saveDraft }, ['Salvar rascunho']),
					' ',
					E('button', { class: 'btn cbi-button cbi-button-positive', 'click': applySetup }, ['Salvar e aplicar'])
				])
			])]);
		}, this));
	},
	showArkCleanup: function(){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['cleanup-status']).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao analisar otimização');
			let data={items:[]};try{data=JSON.parse(r.stdout||'{}');}catch(e){}
			const total=data.overlay_total_kb||0, avail=data.overlay_avail_kb||0, used=total?Math.max(0,Math.round((total-avail)*100/total)):0;
			const boxes={};
			const rows=(data.items||[]).map(function(item){
				const removable=item.removable!==false;
				const cb=E('input',{type:'checkbox','data-key':item.key});cb.checked=!!item.recommended&&removable;cb.disabled=!removable;boxes[item.key]=cb;
				return E('label',{class:'ex-cleanup-row'+(removable?'':' is-protected')},[
					cb,
					E('span',{class:'ex-cleanup-copy'},[
						E('strong',{},[item.label||item.key,item.recommended?E('em',{class:'ex-recommended-badge'},['RECOMENDADO']):'',removable?'':E('em',{class:'ex-pill standby'},['PROTEGIDO'])]),
						E('small',{class:'ex-muted'},[item.description||'',item.installed_count?(' • '+item.installed_count+' pacote(s)/resíduo(s) encontrado(s)'):''])
					])
				]);
			});
			const apply=L.bind(function(){
				const selected=Object.keys(boxes).filter(function(k){return boxes[k].checked;});
				if(!selected.length){ui.addNotification(null,E('p',{},['Selecione ao menos um item.']),'warning');return;}
				ui.showModal('Confirmar otimização ARK',[
					E('p',{class:'alert-message warning'},['Antes de remover qualquer item, o roteador criará um backup local em /tmp. A limpeza pode reiniciar LuCI/uHTTPd e alguns módulos removidos deixam de aparecer no OpenWrt avançado.']),
					E('p',{},['Selecionados: ',selected.join(', ')]),
					E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-negative','click':L.bind(function(){
						return fs.exec('/usr/sbin/equipe-dashboard-control',['cleanup-apply'].concat(selected)).then(function(res){
							if(res.code)throw new Error(res.stderr||'Falha ao aplicar otimização');
							ui.hideModal();
							const m=String(res.stdout||'').match(/Backup:\\s*(\\S+)/);
							ui.addNotification(null,E('p',{},['Otimização aplicada. Backup: ',m?m[1]:'gerado em /tmp']));
							window.setTimeout(function(){window.location.reload();},1800);
						}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
					},this)},['Criar backup e remover'])])
				]);
			},this);
			const applyAttrs={class:'btn cbi-button cbi-button-negative','click':apply};
			if(!rows.length)applyAttrs.disabled=true;
			ui.showModal('Otimização modo ARK',[
				E('section',{class:'ex-cleanup-panel'},[
					E('div',{class:'ex-cleanup-storage'},[
						E('div',{},[E('span',{class:'ex-kicker'},['ARMAZENAMENTO']),E('strong',{},[used+'% usado']),E('small',{class:'ex-muted'},[Math.round(avail/1024)+' MB livres de '+Math.round(total/1024)+' MB'])]),
						data.last_backup?E('code',{},['Último backup: '+data.last_backup]):''
					]),
					E('p',{class:'ex-muted'},['Modo ARK remove painéis e serviços dispensáveis para deixar o OpenWrt como base enxuta. SQM, Multi‑WAN, NLBWMon e uHTTPd são mantidos.']),
					rows.length?E('div',{class:'ex-cleanup-list'},rows):E('p',{class:'ex-muted'},['Nenhum item seguro de otimização encontrado agora.']),
					E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar']),' ',E('button',applyAttrs,['Aplicar selecionados'])])
				])
			]);
		},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
	},

	dmzCard: function() {
		const self = this;
		const pillEl = E('span', { id: 'ex-dmz-pill', class: 'ex-pill standby' }, ['CONSULTANDO…']);
		const summaryTextEl = E('p', { id: 'ex-dmz-summary', class: 'ex-muted', style: 'margin: 6px 0 12px; line-height: 1.45; font-size: 13px;' }, [
			'Encaminha todas as portas e conexões não mapeadas recebidas da internet diretamente para um único aparelho (PC Gamer, Console ou Servidor), garantindo NAT Tipo 1 / Aberto.'
		]);

		const hostPreviewEl = E('div', { id: 'ex-dmz-host-preview', style: 'margin-bottom: 14px;' }, [
			E('div', { class: 'ex-muted', style: 'font-size: 13px; font-style: italic;' }, ['Carregando dados da DMZ…'])
		]);

		const toggleInput = E('input', { id: 'ex-dmz-toggle', type: 'checkbox', 'aria-label': 'Ativar ou Desativar DMZ' });
		toggleInput.addEventListener('change', function(ev) {
			const chk = ev.currentTarget;
			const enable = chk.checked;
			if (enable) {
				chk.checked = false;
				self.showDmzModal();
			} else {
				chk.disabled = true;
				fs.exec('/usr/sbin/equipe-dashboard-control', ['dmz-set', '0']).then(function(r) {
					chk.disabled = false;
					if (r.code) throw new Error(r.stderr || 'Falha ao desativar DMZ');
					ui.addNotification(null, E('p', {}, ['DMZ desativada com sucesso.']));
					self.updateDmzStatus();
				}).catch(function(e) {
					chk.disabled = false;
					chk.checked = true;
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				});
			}
		});

		const toggleRow = E('div', { class: 'ex-channel-mode-control', style: 'margin-bottom: 12px;' }, [
			E('div', {}, [
				E('strong', {}, ['Zona Desmilitarizada Ativa']),
				E('small', { id: 'ex-dmz-toggle-desc', class: 'ex-muted' }, ['Nenhum tráfego exposto no momento'])
			]),
			E('label', { class: 'ex-switch' }, [
				toggleInput,
				E('span', { class: 'ex-switch-slider' })
			])
		]);

		const actionBtn = E('button', {
			id: 'ex-dmz-action-btn',
			class: 'btn cbi-button cbi-button-neutral',
			style: 'width: 100%; min-height: 40px; font-weight: 700; border-radius: 10px; display: flex; align-items: center; justify-content: center; gap: 8px;',
			click: function() { self.showDmzModal(); }
		}, [ '🎯 Escolher Dispositivo para DMZ (Host Aberto)' ]);

		window.setTimeout(function() { self.updateDmzStatus(); }, 300);

		const dmzTitleActions = E('div', { class: 'ex-card-title-actions' }, [
			pillEl
		]);
		const dmzTitle = E('div', { class: 'ex-card-title' }, [
			E('div', {}, [
				E('span', { class: 'ex-kicker' }, ['REDE & JOGOS • CONECTIVIDADE']),
				E('h3', {}, ['Zona Desmilitarizada (DMZ)'])
			]),
			dmzTitleActions
		]);
		const dmzBody = E('div', { class: 'ex-card-collapse-body' }, [
			E('div', { class: 'ex-card-collapse-inner' }, [
				summaryTextEl,
				toggleRow,
				hostPreviewEl,
				actionBtn
			])
		]);
		const dmzCard = E('section', { class: 'ex-card ex-dmz-card', style: 'margin-bottom: 20px;' }, [
			dmzTitle,
			dmzBody
		]);
		const dmzAccordion = setupCardAccordion({
			id: 'dmz',
			cardEl: dmzCard,
			titleEl: dmzTitle,
			bodyEl: dmzBody,
			isActive: !!self.dmzActive
		});
		dmzTitleActions.appendChild(dmzAccordion.expandBtn);
		self._dmzAccordion = dmzAccordion;

		return dmzCard;
	},
	updateDmzStatus: function() {
		const self = this;
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['dmz-status']).then(function(r) {
			let st = {};
			try { st = JSON.parse(r.stdout || '{}'); } catch(e) {}
			const isEnabled = !!st.enabled;
			const destIp = st.dest_ip || '';
			const mac = st.mac || '';
			const devName = st.name || (destIp ? 'Host ' + destIp : '');

			self.dmzActive = isEnabled;
			self.dmzDestIp = destIp;
			self.dmzMac = mac;

			if (self._dmzAccordion) {
				self._dmzAccordion.updateActiveState(isEnabled);
			}

			const pill = document.getElementById('ex-dmz-pill');
			if (pill) {
				pill.className = 'ex-pill ' + (isEnabled ? 'online' : 'standby');
				pill.textContent = isEnabled ? ('ATIVO • ' + (devName || destIp)) : 'DESATIVADO';
			}

			const toggle = document.getElementById('ex-dmz-toggle');
			if (toggle) {
				toggle.checked = isEnabled;
			}

			const toggleDesc = document.getElementById('ex-dmz-toggle-desc');
			if (toggleDesc) {
				toggleDesc.textContent = isEnabled
					? ('Direcionado para ' + (devName || destIp) + ' (' + destIp + ')')
					: 'Nenhum tráfego exposto no momento';
			}

			const preview = document.getElementById('ex-dmz-host-preview');
			if (preview) {
				if (isEnabled && destIp) {
					const icon = getDeviceIcon(devName);
					preview.innerHTML = '';
					preview.appendChild(E('div', { class: 'ex-dmz-host-box' }, [
						E('div', { class: 'ex-dmz-host-info' }, [
							E('span', { class: 'ex-dmz-host-icon' }, [ icon ]),
							E('div', { class: 'ex-dmz-host-details' }, [
								E('span', { class: 'ex-dmz-host-name' }, [
									devName || 'Host DMZ',
									E('span', { class: 'ex-device-badge badge-ipv6', style: 'background:rgba(244,63,94,0.18);color:#f43f5e;border:1px solid rgba(244,63,94,0.35);font-size:0.68rem;padding:2px 6px;border-radius:6px;' }, [ '⚡ NAT TIPO 1 / ABERTO' ])
								]),
								E('span', { class: 'ex-dmz-host-ip' }, [ destIp + (mac ? ' • ' + mac : '') ])
							])
						]),
						E('button', {
							class: 'ex-mini-button',
							style: 'background:rgba(239,68,68,0.14);color:#f87171;border:1px solid rgba(239,68,68,0.3);min-height:36px;padding:6px 12px;',
							title: 'Desativar DMZ',
							click: function() {
								fs.exec('/usr/sbin/equipe-dashboard-control', ['dmz-set', '0']).then(function(res) {
									if (res.code) throw new Error(res.stderr || 'Falha ao desativar DMZ');
									ui.addNotification(null, E('p', {}, ['DMZ desativada.']));
									self.updateDmzStatus();
								}).catch(function(err) {
									ui.addNotification(null, E('p', {}, [err.message]), 'danger');
								});
							}
						}, [ 'Desativar' ])
					]));
				} else {
					preview.innerHTML = '';
					preview.appendChild(E('div', {
						style: 'padding: 12px 14px; border-radius: 10px; background: rgba(127,127,127,0.06); border: 1px dashed rgba(127,127,127,0.22); font-size: 0.82rem; color: #94a3b8; display:flex; align-items:center; gap:8px;'
					}, [
						E('span', { style: 'font-size: 1rem;' }, ['🛡️']),
						E('span', {}, ['Nenhum dispositivo na DMZ. Todas as conexões externas não solicitadas são bloqueadas pelo firewall do roteador.'])
					]));
				}
			}

			const actionBtn = document.getElementById('ex-dmz-action-btn');
			if (actionBtn) {
				actionBtn.textContent = isEnabled
					? '🎯 Trocar Dispositivo DMZ (Host Aberto)'
					: '🎯 Escolher Dispositivo para DMZ (Host Aberto)';
			}
		}).catch(function() {});
	},
	showDmzModal: function() {
		const self = this;
		ui.showModal('Zona Desmilitarizada (DMZ) • Host Gamer', [
			E('p', { class: 'ex-muted' }, ['Carregando dados da rede e dispositivos…'])
		]);

		return fs.exec('/usr/sbin/equipe-dashboard-control', ['dmz-status']).then(function(r) {
			let curDmz = {};
			try { curDmz = JSON.parse(r.stdout || '{}'); } catch(e) {}
			const isCurrentlyActive = !!curDmz.enabled;
			let selectedIp = curDmz.dest_ip || '';
			let selectedMac = curDmz.mac || '';
			let selectedName = curDmz.name || '';

			const knownDevices = [];
			const seenMacs = {};

			if (self.devices && self.devices.length) {
				self.devices.forEach(function(d) {
					const m = String(d.mac || '').toUpperCase();
					if (m && !seenMacs[m]) {
						seenMacs[m] = true;
						const validIp = (d.ip && d.ip !== '—') ? d.ip : '';
						knownDevices.push({
							mac: m,
							ip: validIp,
							name: d.name || ('Dispositivo ' + (validIp || m)),
							isWifi: !!d.isWifi,
							band: d.band || ''
						});
					}
				});
			}

			if (self.currentData) {
				const leases = (self.currentData.leases && self.currentData.leases.dhcp_leases) || [];
				const names = friendlyMap(self.currentData.names || {});
				const dhcpValues = values(self.currentData.dhcpConfig || {});

				leases.forEach(function(l) {
					const m = String(l.mac || l.macaddr || '').toUpperCase();
					const devIp = l.ipaddr || l.ip || '';
					if (m && !seenMacs[m]) {
						seenMacs[m] = true;
						const devName = names[m] || l.hostname || ('Dispositivo ' + (devIp || m));
						knownDevices.push({
							mac: m,
							ip: devIp,
							name: devName,
							isWifi: false
						});
					} else if (m && seenMacs[m] && devIp) {
						const dev = knownDevices.find(function(d){ return d.mac === m; });
						if (dev && !dev.ip) dev.ip = devIp;
					}
				});

				const main = assocMap(self.currentData.mainAssoc || {});
				Object.keys(main).forEach(function(m) {
					const u = m.toUpperCase();
					if (!seenMacs[u]) {
						seenMacs[u] = true;
						knownDevices.push({
							mac: u,
							ip: main[m].ip || '',
							name: names[u] || 'Dispositivo Wi-Fi',
							isWifi: true,
							band: main[m].band || '5g'
						});
					} else {
						const found = knownDevices.find(function(d){ return d.mac === u; });
						if (found) { found.isWifi = true; found.band = main[m].band || '5g'; }
					}
				});

				Object.keys(dhcpValues).forEach(function(k) {
					const h = dhcpValues[k];
					if (h && h['.type'] === 'host' && h.mac) {
						const macs = Array.isArray(h.mac) ? h.mac : String(h.mac).split(/\s+/);
						macs.forEach(function(m) {
							const u = String(m).toUpperCase();
							if (!seenMacs[u] && h.ip) {
								seenMacs[u] = true;
								knownDevices.push({
									mac: u,
									ip: h.ip,
									name: names[u] || h.name || 'Dispositivo Fixo',
									isWifi: false
								});
							} else if (seenMacs[u] && h.ip) {
								const dev = knownDevices.find(function(d){ return d.mac === u; });
								if (dev && !dev.ip) dev.ip = h.ip;
							}
						});
					}
				});

				const arpText = String(self.currentData.arpTable || '');
				if (arpText) {
					const arpLines = arpText.split('\n');
					for (let i = 1; i < arpLines.length; i++) {
						const cols = arpLines[i].trim().split(/\s+/);
						if (cols.length >= 6) {
							const aIp = cols[0];
							const aMac = String(cols[3] || '').toUpperCase();
							if (aMac && aMac !== '00:00:00:00:00:00' && cols[2] === '0x2') {
								const dev = knownDevices.find(function(d){ return d.mac === aMac; });
								if (dev && !dev.ip) dev.ip = aIp;
							}
						}
					}
				}
			}

			if (selectedIp && !knownDevices.find(function(d){ return d.ip === selectedIp; })) {
				knownDevices.unshift({
					mac: selectedMac || '',
					ip: selectedIp,
					name: selectedName || ('Host DMZ (' + selectedIp + ')'),
					isWifi: false
				});
			}

			const infoBox = E('div', {
				class: 'ex-priority-desc-box',
				style: 'margin-bottom: 14px; border: 1px solid rgba(255,255,255,.1); padding: 14px; border-radius: 12px; background: rgba(15,23,42,.6);'
			}, [
				E('div', { style: 'display:flex; align-items:center; gap:8px; margin-bottom:8px;' }, [
					E('span', { style: 'font-size:1.3rem;' }, ['🎮']),
					E('strong', { style: 'font-size:0.95rem; color:#f8fafc;' }, ['Como Funciona a DMZ no ARK Router:'])
				]),
				E('p', { class: 'ex-muted', style: 'margin:0 0 10px; font-size:0.83rem; line-height:1.45;' }, [
					'A DMZ (Zona Desmilitarizada) encaminha ',
					E('strong', { style: 'color:#fff;' }, ['todas as portas e conexões não mapeadas']),
					' recebidas da internet para o aparelho selecionado. Isso garante ',
					E('strong', { style: 'color:#34d399;' }, ['NAT Tipo 1 / Aberto']),
					' em consoles (PS5, Xbox Series, Switch) e jogos de PC (Call of Duty, FIFA, GTA), eliminando quedas em salas e partidas online.'
				]),
				E('div', { style: 'padding:8px 10px; border-radius:8px; background:rgba(244,63,94,0.12); border:1px solid rgba(244,63,94,0.3); font-size:0.8rem; color:#fca5a5; line-height:1.35;' }, [
					'🛡️ ', E('strong', {}, ['Segurança Preservada:']), ' Apenas o aparelho escolhido recebe as conexões diretas da WAN. Todos os demais dispositivos da sua casa continuam 100% isolados e protegidos pelo firewall do roteador.'
				])
			]);

			const ipInput = E('input', {
				class: 'cbi-input-text',
				value: selectedIp,
				placeholder: 'Ex.: 192.168.73.90',
				style: 'width: 100%; font-family: monospace; font-size: 0.95rem;',
				inputmode: 'decimal'
			});

			const cardsContainer = E('div', { class: 'ex-dmz-device-grid' });
			const deviceCardEls = [];

			const updateSelection = function(targetIp, targetMac, targetName) {
				selectedIp = targetIp || '';
				selectedMac = targetMac || '';
				selectedName = targetName || '';
				ipInput.value = selectedIp;
				deviceCardEls.forEach(function(item) {
					const match = (selectedIp && item.ip && item.ip === selectedIp) ||
					              (!selectedIp && selectedMac && item.mac && item.mac === selectedMac);
					item.el.classList.toggle('is-active', !!match);
				});
				if (!selectedIp) {
					ipInput.focus();
				}
			};

			ipInput.addEventListener('input', function() {
				selectedIp = ipInput.value.trim();
				deviceCardEls.forEach(function(item) {
					const match = (selectedIp && item.ip && item.ip === selectedIp);
					item.el.classList.toggle('is-active', !!match);
				});
			});

			knownDevices.forEach(function(d) {
				const isIt = (d.ip && d.ip === selectedIp) || (!selectedIp && d.mac && d.mac === selectedMac);
				const icon = getDeviceIcon(d.name);
				const card = E('div', {
					class: 'ex-dmz-device-card' + (isIt ? ' is-active' : ''),
					click: function() { updateSelection(d.ip, d.mac, d.name); }
				}, [
					E('span', { class: 'ex-dmz-device-card-icon' }, [ icon ]),
					E('div', { class: 'ex-dmz-device-card-details' }, [
						E('span', { class: 'ex-dmz-device-card-name' }, [ d.name ]),
						E('span', { class: 'ex-dmz-device-card-ip' }, [ d.ip ? d.ip : d.mac ]),
						E('span', { class: 'ex-dmz-device-card-badge' }, [ d.isWifi ? ('Wi-Fi ' + (d.band === '5g' ? '5 GHz' : '2.4 GHz')) : 'Cabo / LAN' ])
					])
				]);
				deviceCardEls.push({ ip: d.ip, mac: d.mac, name: d.name, el: card });
				cardsContainer.appendChild(card);
			});

			const manualBlock = E('div', { style: 'margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);' }, [
				E('label', { style: 'display:flex; flex-direction:column; gap:4px; font-weight:650; font-size:0.85rem;' }, [
					E('span', {}, ['Endereço IPv4 do Dispositivo em DMZ:']),
					ipInput
				]),
				E('small', { class: 'ex-muted', style: 'display:block; margin-top:4px;' }, [
					'Dica: Ao selecionar um dispositivo acima ou digitar o IP, o ARK Router manterá a concessão estática do DHCP para que o aparelho nunca mude de IP.'
				])
			]);

			const btnCancel = E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Cancelar']);
			const btnDisable = isCurrentlyActive ? E('button', {
				class: 'btn cbi-button cbi-button-negative',
				style: 'min-height: 40px;',
				click: function(ev) {
					const btn = ev.currentTarget;
					btn.disabled = true;
					btn.textContent = 'Desativando…';
					fs.exec('/usr/sbin/equipe-dashboard-control', ['dmz-set', '0']).then(function(res) {
						if (res.code) throw new Error(res.stderr || 'Falha ao desativar DMZ');
						closeModal();
						ui.addNotification(null, E('p', {}, ['DMZ desativada com sucesso.']));
						self.updateDmzStatus();
					}).catch(function(err) {
						btn.disabled = false;
						btn.textContent = 'Desativar DMZ';
						ui.addNotification(null, E('p', {}, [err.message]), 'danger');
					});
				}
			}, ['Desativar DMZ']) : '';

			const btnSave = E('button', {
				class: 'btn cbi-button cbi-button-positive',
				style: 'min-height: 40px; font-weight: 700;',
				click: function(ev) {
					const btn = ev.currentTarget;
					const finalIp = ipInput.value.trim();
					if (!finalIp) {
						ui.addNotification(null, E('p', {}, ['Informe o endereço IP do dispositivo para a DMZ.']), 'danger');
						return;
					}
					btn.disabled = true;
					btn.textContent = 'Aplicando DMZ…';

					const matched = knownDevices.find(function(d){ return d.ip === finalIp; });
					const finalMac = (matched && matched.mac) ? matched.mac : selectedMac;
					const finalName = (matched && matched.name) ? matched.name : selectedName;

					fs.exec('/usr/sbin/equipe-dashboard-control', ['dmz-set', '1', finalIp, finalMac, finalName]).then(function(res) {
						if (res.code) throw new Error(res.stderr || 'Falha ao salvar DMZ');
						closeModal();
						ui.addNotification(null, E('p', {}, ['DMZ ativada com sucesso para ' + (finalName || finalIp) + '!']));
						self.updateDmzStatus();
					}).catch(function(err) {
						btn.disabled = false;
						btn.textContent = 'Salvar e Ativar DMZ';
						ui.addNotification(null, E('p', {}, [err.message]), 'danger');
					});
				}
			}, ['Salvar e Ativar DMZ']);

			const modalBody = [
				infoBox,
				E('div', { style: 'font-weight:700; font-size:0.88rem; margin-bottom:6px;' }, ['Selecione o Dispositivo da Rede com 1 Clique:']),
				cardsContainer,
				manualBlock,
				E('div', { class: 'right', style: 'display:flex; justify-content:flex-end; gap:8px; margin-top:16px;' }, [
					btnCancel,
					btnDisable,
					btnSave
				])
			];

			ui.showModal('Zona Desmilitarizada (DMZ) • Host Gamer', modalBody);
		}).catch(function(e) {
			ui.hideModal();
			ui.addNotification(null, E('p', {}, [e.message]), 'danger');
		});
	},

	showThermalModal: function() {
		const hwInfo = (this.currentData && this.currentData.hardwareInfo) || {};
		const sensors = hwInfo.thermal_sensors || [];
		if (!sensors.length) {
			ui.showModal('Sensores Térmicos', [
				E('p', { class: 'ex-muted' }, ['Este roteador não possui sensores térmicos expostos pelo hardware ou kernel.']),
				E('div', { class: 'right', style: 'margin-top: 20px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', style: 'min-height: 40px; padding: 0 20px; user-select: none;', 'click': ui.hideModal }, ['Fechar'])
				])
			]);
			return;
		}
		const sensorCards = sensors.map(function(s) {
			const temp = s.temp_c || 0;
			const warn = Number(s.warn_c) || 75;
			const crit = Number(s.crit_c) || 90;
			const isCrit = temp >= crit;
			const isWarn = temp >= warn;
			const color = isCrit ? '#ef4444' : (isWarn ? '#f59e0b' : '#10b981');
			const statusText = isCrit ? _t('Temperatura crítica') : (isWarn ? _t('Temperatura elevada') : _t('Temperatura ideal / estável'));
			const limitText = (s.warn_c && s.crit_c) ? (' • ' + _t('alerta %s°C / limite %s°C').replace('%s', s.warn_c).replace('%s', s.crit_c)) : '';
			return E('div', {
				class: 'ex-card',
				style: 'padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;'
			}, [
				E('div', {}, [
					E('strong', { style: 'display:block;font-size:0.95rem;color:#fff;' }, [s.name]),
					E('small', { style: 'color:var(--ark-text-muted, #94a3b8);' }, ['Tipo: ' + (s.type || 'genérico') + ' • ' + statusText + limitText])
				]),
				E('div', { style: 'text-align:right;' }, [
					E('span', { style: 'font-size:1.45rem;font-weight:800;color:' + color + ';' }, [temp + ' °C'])
				])
			]);
		});

		ui.showModal('Sensores Térmicos do Hardware', [
			E('p', { class: 'ex-muted' }, ['Leituras térmicas em tempo real coletadas diretamente dos sensores físicos da placa do roteador.']),
			E('div', { style: 'display:flex;flex-direction:column;gap:6px;margin:16px 0;' }, sensorCards),
			E('div', { class: 'right', style: 'margin-top: 15px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', style: 'min-height: 40px; padding: 0 20px; user-select: none;', 'click': ui.hideModal }, ['Fechar'])
			])
		]);
	},
	showNetworkModeModal: function() {
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['system-network-mode-get'])
		.then(L.bind(function(res) {
			let diag = {};
			try { diag = JSON.parse(res.stdout || '{}'); } catch(e) {}
			const currentRole = diag.role || '';
			const isCurrentlyAp = (diag.mode === 'ap' || currentRole === 'secondary' || currentRole === 'satellite' || (diag.dhcp_disabled && diag.gateway));
			const currentMode = isCurrentlyAp ? 'ap' : 'router';

			const modeRouterRadio = E('input', { type: 'radio', name: 'ark_net_mode', value: 'router', id: 'ark-opmode-router' });
			const modeApRadio = E('input', { type: 'radio', name: 'ark_net_mode', value: 'ap', id: 'ark-opmode-ap' });
			if (isCurrentlyAp) {
				modeApRadio.checked = true;
				modeRouterRadio.checked = false;
			} else {
				modeRouterRadio.checked = true;
				modeApRadio.checked = false;
			}

			const apIpDhcpRadio = E('input', { type: 'radio', name: 'ark_ap_ip_type', value: 'dhcp', id: 'ark-ap-ip-dhcp' });
			const apIpStaticRadio = E('input', { type: 'radio', name: 'ark_ap_ip_type', value: 'static', id: 'ark-ap-ip-static' });
			if (diag.lan_proto === 'static' || isCurrentlyAp) {
				apIpStaticRadio.checked = true;
				apIpDhcpRadio.checked = false;
			} else {
				apIpDhcpRadio.checked = true;
				apIpStaticRadio.checked = false;
			}

			let suggestedGw = diag.gateway || diag.current_gw || '';
			let suggestedApIp = '';
			if (isCurrentlyAp && diag.lan_proto === 'static' && diag.lan_ip) {
				suggestedApIp = diag.lan_ip;
			} else if (suggestedGw && /^(\d{1,3}\.){3}\d{1,3}$/.test(suggestedGw)) {
				const parts = suggestedGw.split('.');
				const lastOctet = parseInt(parts[3], 10);
				const candidate = (lastOctet === 1) ? 2 : (lastOctet === 254 ? 253 : (lastOctet < 100 ? lastOctet + 1 : 2));
				parts[3] = String(candidate);
				suggestedApIp = parts.join('.');
			} else {
				suggestedApIp = (diag.lan_ip && diag.lan_ip !== '192.168.1.1') ? diag.lan_ip.replace(/\.\d+$/, '.2') : '192.168.73.2';
				if (!suggestedGw) suggestedGw = suggestedApIp.replace(/\.\d+$/, '.1');
			}
			const suggestedDns = diag.dns || suggestedGw || '1.1.1.1 8.8.8.8';

			const staticIpInput = E('input', { type: 'text', class: 'cbi-input-text', placeholder: 'Ex.: ' + suggestedApIp, value: (isCurrentlyAp && diag.lan_proto === 'static' ? diag.lan_ip : suggestedApIp) });
			const staticMaskInput = E('input', { type: 'text', class: 'cbi-input-text', placeholder: '255.255.255.0', value: diag.netmask || '255.255.255.0' });
			const staticGwInput = E('input', { type: 'text', class: 'cbi-input-text', placeholder: 'Ex.: ' + (suggestedGw || '192.168.73.1'), value: suggestedGw });
			const staticDnsInput = E('input', { type: 'text', class: 'cbi-input-text', placeholder: 'Ex.: 1.1.1.1 8.8.8.8', value: suggestedDns });

			const staticFieldsBox = E('div', { id: 'ark-ap-static-fields', style: 'display:' + (apIpStaticRadio.checked ? 'grid' : 'none') + '; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;' }, [
				E('div', {}, [
					E('label', { style: 'display:block; font-size:12px; font-weight:600; margin-bottom:3px; color:#e2e8f0;' }, ['1. IP deste Aparelho (Secundário/AP):']),
					staticIpInput,
					E('small', { class: 'ex-muted', style: 'font-size:11px;' }, ['O IP que este roteador terá na rede local do mestre.'])
				]),
				E('div', {}, [
					E('label', { style: 'display:block; font-size:12px; font-weight:600; margin-bottom:3px; color:#e2e8f0;' }, ['2. Máscara de sub-rede:']),
					staticMaskInput,
					E('small', { class: 'ex-muted', style: 'font-size:11px;' }, ['Geralmente 255.255.255.0 para redes residenciais.'])
				]),
				E('div', {}, [
					E('label', { style: 'display:block; font-size:12px; font-weight:600; margin-bottom:3px; color:#e2e8f0;' }, ['3. Gateway (IP do Roteador Mestre):']),
					staticGwInput,
					E('small', { class: 'ex-muted', style: 'font-size:11px;' }, ['O endereço do roteador principal onde a internet chega.'])
				]),
				E('div', {}, [
					E('label', { style: 'display:block; font-size:12px; font-weight:600; margin-bottom:3px; color:#e2e8f0;' }, ['4. Servidor(es) DNS:']),
					staticDnsInput,
					E('small', { class: 'ex-muted', style: 'font-size:11px;' }, ['Para este roteador sincronizar horário e checar atualizações.'])
				])
			]);

			apIpDhcpRadio.addEventListener('change', function() { staticFieldsBox.style.display = 'none'; });
			apIpStaticRadio.addEventListener('change', function() { staticFieldsBox.style.display = 'grid'; });

			const apOptionsBox = E('div', {
				id: 'ark-ap-options-box',
				style: 'display:' + (isCurrentlyAp ? 'block' : 'none') + '; margin-top: 14px; padding: 14px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);'
			}, [
				E('strong', { style: 'display:block; font-size:13px; margin-bottom:8px; color:#60a5fa;' }, ['⚙️ Configuração de IP no Modo Ponto de Acesso']),
				E('div', { style: 'display:flex; flex-direction:column; gap:8px;' }, [
					E('label', { style: 'display:flex; align-items:center; gap:8px; cursor:pointer;' }, [
						apIpDhcpRadio,
						E('div', {}, [
							E('span', { style: 'font-weight:600; font-size:13px;' }, ['Automático via DHCP (Recomendado)']),
							E('small', { class: 'ex-muted', style: 'display:block;' }, ['Recebe IP, Gateway e DNS do roteador principal como um cliente. O IP de Resgate permanece sempre ativo.'])
						])
					]),
					E('label', { style: 'display:flex; align-items:center; gap:8px; cursor:pointer;' }, [
						apIpStaticRadio,
						E('div', {}, [
							E('span', { style: 'font-weight:600; font-size:13px;' }, ['IP Fixo / Estático']),
							E('small', { class: 'ex-muted', style: 'display:block;' }, ['Você define manualmente o IP deste aparelho, gateway do mestre e DNS.'])
						])
					])
				]),
				staticFieldsBox,
				E('div', { class: 'alert-message info', style: 'margin-top: 12px; margin-bottom: 0; font-size: 12px; line-height: 1.5;' }, [
					E('strong', { style: 'display:block; margin-bottom:4px;' }, ['🛡️ Salvaguarda Anti-Lockout (IP de Resgate Permanente):']),
					'Mesmo operando como Ponto de Acesso na rede do Mestre, o ARK Router manterá o ',
					E('strong', {}, ['IP de Resgate fixo (' + (diag.rescue_ip || '192.168.12.1') + ')']),
					' ativo no switch. Se você desconectar do mestre e plugar o PC direto nele com IP manual, sempre conseguirá abrir este painel!'
				])
			]);

			const cardRouter = E('label', {
				id: 'ark-card-mode-router',
				class: 'ex-opmode-card',
				style: 'display:flex; gap:12px; align-items:flex-start; padding:14px; background:' + (!isCurrentlyAp ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255,255,255,0.03)') + '; border:1px solid ' + (!isCurrentlyAp ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255,255,255,0.1)') + '; border-radius:8px; cursor:pointer;'
			}, [
				modeRouterRadio,
				E('div', { style: 'flex:1;' }, [
					E('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
						E('strong', { style: 'font-size:14px;' }, ['🌐 Modo Roteador Principal (Gateway)']),
						(!isCurrentlyAp ? E('span', { class: 'ex-pill online', style: 'font-size:11px;' }, ['ATIVO']) : '')
					]),
					E('small', { class: 'ex-muted', style: 'display:block; margin-top:4px; line-height:1.4;' }, [
						'O ARK Router atua como o mestre da rede conectado direto ao modem ou fibra. Gerencia distribuição de IPs (DHCP), firewall, NAT, Wi-Fi, SQM CAKE e Multi-WAN.'
					])
				])
			]);

			const cardAp = E('label', {
				id: 'ark-card-mode-ap',
				class: 'ex-opmode-card',
				style: 'display:flex; gap:12px; align-items:flex-start; padding:14px; background:' + (isCurrentlyAp ? 'rgba(56, 189, 248, 0.08)' : 'rgba(255,255,255,0.03)') + '; border:1px solid ' + (isCurrentlyAp ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255,255,255,0.1)') + '; border-radius:8px; cursor:pointer;'
			}, [
				modeApRadio,
				E('div', { style: 'flex:1;' }, [
					E('div', { style: 'display:flex; justify-content:space-between; align-items:center;' }, [
						E('strong', { style: 'font-size:14px; color:' + (isCurrentlyAp ? '#38bdf8' : '#fff') + ';' }, ['📡 Roteador Secundário / Ponto Adicional (Extensor de Wi-Fi)']),
						(isCurrentlyAp ? E('span', { class: 'ex-pill online', style: 'font-size:11px;' }, ['ATIVO']) : '')
					]),
					E('small', { class: 'ex-muted', style: 'display:block; margin-top:4px; line-height:1.4;' }, [
						'Ideal para expandir a rede do Roteador Principal via cabo ou sem fio. Desativa o servidor DHCP, firewall e NAT deste aparelho, transformando todas as portas e o Wi-Fi em uma extensão transparente da sua rede.'
					]),
					isCurrentlyAp ? E('div', {
						style: 'margin-top: 10px; padding: 8px 12px; background: rgba(0,0,0,0.3); border-radius: 6px; border: 1px solid rgba(56, 189, 248, 0.25); font-size: 11.5px; display: grid; gap: 4px;'
					}, [
						E('div', {}, [
							E('span', { class: 'ex-muted' }, ['Tipo de Conexão: ']),
							E('strong', { style: 'color: #38bdf8;' }, [diag.backhaul === 'air' ? '📶 Sem Fio (Enlace Mesh 802.11s)' : '🔌 Cabo de Rede (Ethernet Gigabit)']),
							diag.mesh_id ? E('span', { class: 'ex-muted', style: 'margin-left: 6px;' }, ['(Mesh ID: ' + diag.mesh_id + ')']) : ''
						]),
						E('div', {}, [
							E('span', { class: 'ex-muted' }, ['IP deste Aparelho: ']),
							E('code', { style: 'color: #f8fafc; font-weight: 700;' }, [diag.current_ip || diag.lan_ip || '192.168.73.2']),
							E('span', { class: 'ex-muted', style: 'margin-left: 10px;' }, ['Roteador Mestre: ']),
							E('code', { style: 'color: #38bdf8;' }, [diag.gateway || diag.current_gw || '192.168.73.1'])
						]),
						E('div', {}, [
							E('span', { class: 'ex-muted' }, ['Estado DHCP: ']),
							E('span', { style: 'color: #22c55e; font-weight: 600;' }, ['Desativado (Sem NAT Duplo / Modo Bridge)'])
						])
					]) : '',
					E('div', { style: 'margin-top: 10px;' }, [
						E('button', {
							class: 'btn cbi-button cbi-button-action',
							style: 'font-size: 12px; padding: 4px 12px; font-weight: 700; background: #0284c7 !important; border-color: #38bdf8 !important; color: #fff !important;',
							click: L.bind(function(ev) {
								ev.preventDefault();
								ev.stopPropagation();
								ui.hideModal();
								this.showSatelliteWizardModal();
							}, this)
						}, ['🪄 Assistente de Roteador Secundário…'])
					])
				])
			]);

			modeRouterRadio.addEventListener('change', function() {
				apOptionsBox.style.display = 'none';
				cardRouter.style.background = 'rgba(56, 189, 248, 0.08)';
				cardRouter.style.borderColor = 'rgba(56, 189, 248, 0.45)';
				cardAp.style.background = 'rgba(255,255,255,0.03)';
				cardAp.style.borderColor = 'rgba(255,255,255,0.1)';
			});
			modeApRadio.addEventListener('change', function() {
				apOptionsBox.style.display = 'block';
				cardAp.style.background = 'rgba(56, 189, 248, 0.08)';
				cardAp.style.borderColor = 'rgba(56, 189, 248, 0.45)';
				cardRouter.style.background = 'rgba(255,255,255,0.03)';
				cardRouter.style.borderColor = 'rgba(255,255,255,0.1)';
			});

			const modalBody = [
				E('p', { class: 'ex-muted', style: 'margin-top:0; font-size:13px;' }, [
					'Alterne como este ARK Router atua na topologia da sua rede residencial ou corporativa.'
				]),
				E('div', { style: 'display:flex; flex-direction:column; gap:12px; margin: 16px 0;' }, [
					cardRouter,
					cardAp
				]),
				apOptionsBox,
				E('div', { style: 'display:flex; justify-content:flex-end; gap:10px; margin-top:18px;' }, [
					E('button', {
						class: 'btn cbi-button cbi-button-neutral',
						'click': function() { ui.hideModal(); }
					}, ['Cancelar']),
					E('button', {
						class: 'btn cbi-button cbi-button-positive',
						style: 'font-weight:bold;',
						'click': L.bind(function(ev) {
							const selectedMode = modeApRadio.checked ? 'ap' : 'router';
							if (selectedMode === currentMode) {
								ui.hideModal();
								return;
							}

							const cmdArgs = ['system-network-mode-set', selectedMode];
							if (selectedMode === 'ap') {
								if (apIpStaticRadio.checked) {
									const ip = String(staticIpInput.value || '').trim();
									const mask = String(staticMaskInput.value || '').trim() || '255.255.255.0';
									const gw = String(staticGwInput.value || '').trim();
									const dns = String(staticDnsInput.value || '').trim();
									if (!ip) {
										ui.addNotification(null, E('p', {}, ['Informe um endereço IP válido para o modo estático.']), 'danger');
										return;
									}
									cmdArgs.push('static', ip, mask, gw, dns);
								} else {
									cmdArgs.push('dhcp');
								}
							}

							const loadingMsg = selectedMode === 'ap'
								? 'Convertendo para Ponto de Acesso e Switch. O roteador reiniciará a rede. IP de resgate: ' + (diag.rescue_ip || diag.lan_ip || '192.168.12.1')
								: 'Restaurando Modo Roteador Principal. O servidor DHCP e a porta WAN padrão foram reativados…';

							this.showNetworkModeConfirmation(selectedMode, cmdArgs, diag, loadingMsg);
						}, this)
					}, ['Continuar para Confirmação'])
				])
			];

			ui.showModal('Modo de Operação de Rede', modalBody);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', {}, ['Falha ao carregar modos de rede: ' + e.message]), 'danger');
		});
	},
	showNetworkModeConfirmation: function(selectedMode, cmdArgs, diag, loadingMsg) {
		const isAp = (selectedMode === 'ap');
		const rescueIp = diag.rescue_ip || diag.lan_ip || '192.168.12.1';

		const warningItems = isAp ? [
			E('li', { style: 'color: #f59e0b; font-weight: bold;' }, ['O servidor DHCP deste roteador será DESLIGADO. Os aparelhos passarão a receber IP diretamente do roteador mestre.']),
			E('li', {}, ['Todas as portas Ethernet (inclusive a porta WAN) e o Wi-Fi se tornarão um único switch local transparente.']),
			E('li', {}, ['Você deve conectar um cabo de rede vindo do roteador principal em qualquer porta deste roteador para distribuir internet.']),
			E('li', { style: 'color: #3b82f6; font-weight: bold;' }, ['SALVAGUARDA ANTI-LOCKOUT: O IP de Resgate (' + rescueIp + ') permanecerá sempre ativo no switch. Se você desconectar do mestre ou não souber o IP recebido, coloque IP manual no computador e abra http://' + rescueIp + '!'])
		] : [
			E('li', { style: 'color: #10b981; font-weight: bold;' }, ['O servidor DHCP local deste roteador será REATIVADO na rede local.']),
			E('li', {}, ['A porta WAN física voltará a operar como entrada de internet dedicada e o firewall com NAT será restabelecido.']),
			E('li', {}, ['O endereço IP do roteador será restaurado para o padrão (' + rescueIp + ').'])
		];

		const finalButton = E('button', {
			class: 'btn cbi-button ' + (isAp ? 'cbi-button-negative' : 'cbi-button-positive'),
			style: 'font-weight: bold;',
			disabled: true
		}, ['Aguarde 3 s']);

		let timer = null;
		const started = Date.now();
		timer = window.setInterval(function() {
			const left = Math.ceil((3000 - (Date.now() - started)) / 1000);
			if (left > 0) {
				finalButton.textContent = 'Aguarde ' + left + ' s';
				return;
			}
			window.clearInterval(timer);
			finalButton.disabled = false;
			finalButton.textContent = isAp ? '⚠️ Confirmar e Ativar Modo Ponto de Acesso' : 'Confirmar e Restaurar Modo Roteador';
		}, 100);

		let dhcpRestoreChoice = '1';
		let dhcpChoiceBox = null;

		if (!isAp) {
			const radioDhcpOn = E('input', { type: 'radio', name: 'ark_restore_dhcp', value: '1', checked: true });
			const radioDhcpOff = E('input', { type: 'radio', name: 'ark_restore_dhcp', value: '0' });
			radioDhcpOn.addEventListener('change', function() { if (radioDhcpOn.checked) dhcpRestoreChoice = '1'; });
			radioDhcpOff.addEventListener('change', function() { if (radioDhcpOff.checked) dhcpRestoreChoice = '0'; });

			dhcpChoiceBox = E('div', {
				style: 'margin-top: 14px; padding: 12px 14px; background: rgba(0,0,0,0.25); border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);'
			}, [
				E('strong', { style: 'display:block; font-size:13px; margin-bottom:8px; color:#38bdf8;' }, ['Configuração do Servidor DHCP ao Restaurar:']),
				E('div', { style: 'display:flex; flex-direction:column; gap:8px;' }, [
					E('label', { style: 'display:flex; align-items:flex-start; gap:8px; cursor:pointer;' }, [
						radioDhcpOn,
						E('div', {}, [
							E('span', { style: 'font-weight:600; font-size:13px; color:#10b981;' }, ['Reativar Servidor DHCP local (Recomendado)']),
							E('small', { class: 'ex-muted', style: 'display:block;' }, ['O roteador volta a distribuir endereços IP automaticamente para os seus aparelhos conectados via cabo ou Wi-Fi.'])
						])
					]),
					E('label', { style: 'display:flex; align-items:flex-start; gap:8px; cursor:pointer;' }, [
						radioDhcpOff,
						E('div', {}, [
							E('span', { style: 'font-weight:600; font-size:13px; color:#f59e0b;' }, ['Manter Servidor DHCP desativado']),
							E('small', { class: 'ex-muted', style: 'display:block;' }, ['A porta WAN e o NAT voltam a operar como Gateway, mas nenhum IP será distribuído localmente. Ideal se você possui outro servidor DHCP na rede ou usa IPs estáticos.'])
						])
					])
				])
			]);
		}

		const cancelModal = function() {
			if (timer) window.clearInterval(timer);
			ui.hideModal();
		};

		finalButton.addEventListener('click', L.bind(function() {
			if (timer) window.clearInterval(timer);
			finalButton.disabled = true;
			finalButton.textContent = 'Aplicando alteração de modo…';

			ui.hideModal();
			const finalCmdArgs = isAp ? cmdArgs : ['system-network-mode-set', 'router', dhcpRestoreChoice];
			fs.exec('/usr/sbin/equipe-dashboard-control', finalCmdArgs)
			.then(function(r) {
				reloadSoon(loadingMsg, 1500);
			}).catch(function(e) {
				if (reloadAfterExpectedDisconnect(e, loadingMsg, 4500)) return;
				ui.addNotification(null, E('p', {}, [e.message]), 'danger');
			});
		}, this), true);

		const modalContent = [
			E('div', { class: 'alert-message ' + (isAp ? 'warning' : 'info'), style: 'margin-bottom: 14px; font-size: 13px; line-height: 1.55;' }, [
				E('strong', { style: 'display:block; margin-bottom:8px; font-size:14px;' }, [
					isAp ? 'Atenção aos efeitos da conversão em Ponto de Acesso (Dumb AP):' : 'Restaurar modo padrão de roteador mestre:'
				]),
				E('ul', { style: 'margin: 0; padding-left: 18px;' }, warningItems)
			])
		];
		if (dhcpChoiceBox) modalContent.push(dhcpChoiceBox);
		modalContent.push(E('div', { style: 'display:flex; justify-content:flex-end; gap:10px; margin-top:16px;' }, [
			E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': cancelModal }, ['Cancelar']),
			finalButton
		]));

		ui.showModal(isAp ? '⚠️ Confirmação Final: Modo Ponto de Acesso & Switch' : 'Confirmação Final: Restaurar Modo Roteador Principal', modalContent);
	},
	showHardwareModal: function() {
		const hwInfo = (this.currentData && this.currentData.hardwareInfo) || {};
		const cpu = hwInfo.cpu || {};
		const mem = hwInfo.memory || {};
		const st = hwInfo.storage || {};
		const wf = hwInfo.wifi || {};
		const ports = hwInfo.ports || {};
		const sensors = hwInfo.thermal_sensors || [];

		const sectionBlock = function(title, icon, rows) {
			return E('div', {
				class: 'ex-card',
				style: 'margin-bottom:14px;padding:14px 16px;background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.08);border-radius:10px;'
			}, [
				E('div', { style: 'display:flex;align-items:center;gap:8px;margin-bottom:12px;' }, [
					E('span', { style: 'font-size:1.2rem;' }, [icon]),
					E('strong', { style: 'font-size:0.95rem;color:#fff;' }, [title])
				]),
				E('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;' }, rows)
			]);
		};

		const infoItem = function(label, value, badge) {
			return E('div', { style: 'background:rgba(127,127,127,0.06);padding:8px 12px;border-radius:6px;' }, [
				E('span', { class: 'ex-label', style: 'display:block;margin-bottom:2px;' }, [label]),
				E('div', { style: 'display:flex;align-items:center;gap:6px;' }, [
					E('strong', { style: 'font-size:0.95rem;color:#fff;' }, [value || '—']),
					badge ? E('span', { style: 'font-size:0.68rem;padding:2px 6px;border-radius:4px;font-weight:700;background:rgba(59,130,246,0.18);color:#60a5fa;' }, [badge]) : ''
				])
			]);
		};

		const profileName = (this.capabilities.actual_profile || this.capabilities.profile || 'full').toUpperCase();
		const fwEngine = (hwInfo.firewall && hwInfo.firewall.engine) || 'fw4';
		const fwDesc = (hwInfo.firewall && hwInfo.firewall.desc) || (fwEngine === 'fw4' ? 'Moderno (nftables puro)' : 'Legado (iptables)');
		const sysRows = [
			infoItem('Modelo do Equipamento', hwInfo.model || this.board.model || 'ARK Router'),
			infoItem('Perfil ARK Router', profileName === 'FULL' ? 'FULL (Alto Desempenho)' : 'LITE (Compacto)', 'ATIVO'),
			infoItem('Motor de Firewall', fwDesc, fwEngine.toUpperCase()),
			infoItem('Placa / Target', (hwInfo.board || this.board.board_name || '') + ' (' + (hwInfo.target || '') + ')'),
			infoItem('Sistema Operacional', hwInfo.release || 'OpenWrt'),
			infoItem('Versão do Kernel', hwInfo.kernel || this.board.kernel || 'Linux')
		];

		const cpuRows = [
			infoItem('Processador', cpu.model || 'ARM Cortex / MIPS'),
			infoItem('Frequência de Clock', cpu.freq_str || 'Padrão', (cpu.freq_mhz > 0 ? (cpu.freq_mhz + ' MHz') : null)),
			infoItem('Núcleos Físicos', (cpu.cores || 1) + ' Núcleo(s)'),
			infoItem('Arquitetura', cpu.arch_desc || cpu.arch || '64-bit'),
			infoItem('Uso Instantâneo', (cpu.usage_pct != null ? cpu.usage_pct : 0) + '%'),
			infoItem('Carga Média (Load)', (this.currentData && this.currentData.system && this.currentData.system.load && this.currentData.system.load.length >= 3) ? ((this.currentData.system.load[0]/65535).toFixed(2) + ' • ' + (this.currentData.system.load[1]/65535).toFixed(2) + ' • ' + (this.currentData.system.load[2]/65535).toFixed(2)) : '—')
		];

		const memRows = [
			infoItem('RAM Total', (mem.total_mb || 0) + ' MB (' + formatBytes((mem.total_kb || 0) * 1024) + ')'),
			infoItem('RAM Disponível', (mem.avail_mb || 0) + ' MB (' + formatBytes((mem.avail_kb || 0) * 1024) + ')'),
			infoItem('RAM Livre', formatBytes((mem.free_kb || 0) * 1024)),
			infoItem('Cache & Buffers', formatBytes(((mem.cached_kb || 0) + (mem.buffers_kb || 0)) * 1024))
		];

		const stRows = [
			infoItem('Mídia da Flash', st.flash_type || 'Flash Interna'),
			infoItem('Espaço Flash Overlay (Livre)', (st.overlay_avail_mb || 0) + ' MB livres de ' + (Math.round((st.overlay_total_kb || 0)/1024)) + ' MB'),
			infoItem('Memória Volátil (/tmp RAM)', (st.tmp_avail_mb || 0) + ' MB livres de ' + (Math.round((st.tmp_total_kb || 0)/1024)) + ' MB')
		];

		const thermalRows = sensors.length ? sensors.map(function(s) {
			const temp = s.temp_c || 0;
			const warn = Number(s.warn_c) || 75;
			const crit = Number(s.crit_c) || 90;
			const badge = temp >= crit ? 'CRÍTICO' : (temp >= warn ? 'ELEVADO' : 'NORMAL');
			return infoItem(s.name, temp + ' °C', badge);
		}) : [ infoItem('Sensores Térmicos', 'Nenhum sensor físico integrado neste modelo') ];

		const portNames = Object.keys(ports);
		const portRows = portNames.length ? portNames.map(function(p) {
			const info = ports[p];
			const isUp = !!info.carrier;
			const speedText = isUp ? ((info.speed ? info.speed + ' Mbps ' : 'Conectada ') + (info.duplex || '')) : 'Sem cabo conectado';
			return infoItem(p.toUpperCase(), speedText, 'Suporta ' + (info.max_speed || '1G'));
		}) : [ infoItem('Portas de Rede', 'Detectadas automaticamente pela bridge LAN') ];

		const wifiStandards = [];
		if (wf.wifi_be) wifiStandards.push('Wi-Fi 7 (be)');
		if (wf.wifi_ax) wifiStandards.push('Wi-Fi 6/6E (ax)');
		if (wf.wifi_ac) wifiStandards.push('Wi-Fi 5 (ac)');
		if (wf.wifi_n) wifiStandards.push('Wi-Fi 4 (n)');
		if (!wifiStandards.length) wifiStandards.push('Wi-Fi Padrão');

		let maxWidthStr = '80 MHz (VHT80)';
		if (wf.wifi_320 || wf.wifi_be || (wf.wifi_6g && wf.wifi_ax)) maxWidthStr = '320 MHz (EHT320 / Wi-Fi 7)';
		else if (wf.wifi_160) maxWidthStr = '160 MHz (Ultra Rápido)';

		let bandsStr = '2.4 GHz + 5.0 GHz (Dual-Band)';
		if (wf.wifi_6g) bandsStr = '2.4 GHz + 5 GHz + 6 GHz (Tri-Band)';

		const wifiRows = [
			infoItem('Padrões Suportados', wifiStandards.join(' • ')),
			infoItem('Largura Máxima do Canal', maxWidthStr),
			infoItem('Bandas Simultâneas', bandsStr)
		];

		const silicon = hwInfo.silicon || {};
		const wedDesc = silicon.wed_capable
			? 'Suportado (DMA Direto Wi-Fi/Ethernet)'
			: (silicon.class === 'qualcomm_ipq'
				? 'Integrado nativo (Qualcomm PPE / SFE Flow)'
				: (silicon.class === 'x86_pc'
					? 'Não aplicável (SMP Multicore x86_64)'
					: (silicon.class === 'mips_legacy'
						? 'Não aplicável (MIPS Fastpath Software)'
						: 'Padrão mac80211')));
		const wedBadge = silicon.wed_capable
			? 'WED'
			: (silicon.class === 'qualcomm_ipq' ? 'PPE' : null);
		const siliconRows = [
			infoItem('Família de Silício', silicon.name || 'Arquitetura Universal', 'DETECTADO'),
			infoItem('Aceleração em Silício (PPE)', silicon.hw_offload_capable ? 'Suportada (PPE Hardware)' : (silicon.class === 'x86_pc' ? 'Processamento Multicore Nativo' : 'Não aplicável (Software Flowtable)'), silicon.hw_offload_capable ? 'ATIVO' : null),
			infoItem('Despacho Wi-Fi Direto (WED)', wedDesc, wedBadge),
			infoItem('Faixa de Memória (Tier)', silicon.ram_tier_desc || 'Padrão', (silicon.ram_tier || 'standard').toUpperCase()),
			infoItem('Perfil de Ajuste Recomendado', silicon.tuning_profile || 'Universal Multicore')
		];

		const autoTuneModalBtn = E('button', {
			class: 'btn cbi-button cbi-button-action',
			style: 'display:inline-flex;align-items:center;gap:6px;font-weight:750;',
			click: function(ev) {
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = 'Otimizando hardware…';
				fs.exec('/usr/sbin/equipe-dashboard-control', ['system-hardware-auto-tune']).then(function(r) {
					let res = {};
					try { res = JSON.parse(r.stdout || '{}'); } catch(e){}
					if (res.ok) {
						let svcsText = '';
						if (res.services_detected && res.services_detected.length > 0) {
							svcsText = ' • Serviços: ' + res.services_detected.join(', ');
						}
						ui.addNotification(null, E('p', {}, [
							'Hardware calibrado com sucesso! Perfil: ' + (res.tuning_profile || res.silicon_name) +
							' • ' + res.offload_reason +
							' • ' + res.irq_action +
							svcsText
						]));
						ui.hideModal();
						self.triggerImmediateRefresh('Hardware calibrado com sucesso!', 'info', false);
					} else {
						throw new Error(r.stderr || 'Falha na calibração de hardware');
					}
				}).catch(function(e) {
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				}).finally(function() {
					btn.disabled = false;
					btn.textContent = '⚡ Otimizar Automaticamente por Hardware';
				});
			}
		}, ['⚡ Otimizar Automaticamente por Hardware']);

		const topProcContainer = E('div', {
			style: 'display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:10px;width:100%;'
		}, [
			E('small', { class: 'ex-muted' }, ['Carregando consumo real de processos…'])
		]);

		fs.exec('/usr/sbin/equipe-dashboard-control', ['system-processes-telemetry']).then(function(r) {
			if (!r || r.code !== 0 || !r.stdout) return;
			try {
				const d = JSON.parse(r.stdout);
				const top = d.top_rss || [];
				if (!top.length) {
					topProcContainer.innerHTML = '<span class="ex-muted">Nenhum processo em execução registrado.</span>';
					return;
				}
				topProcContainer.innerHTML = '';
				top.slice(0, 6).forEach(function(p) {
					const mb = (p.rss_kb / 1024).toFixed(1) + ' MB';
					const isGoOrHeavy = p.vsz_kb > 200000;
					const badge = isGoOrHeavy ? 'GO: ' + (p.vsz_kb / 1024).toFixed(0) + 'MB VSZ' : p.percent + '% RAM';
					topProcContainer.appendChild(infoItem(p.name + ' (PID ' + p.pid + ')', mb, badge));
				});
			} catch(e) {}
		});

		ui.showModal('Especificações Técnicas do Hardware', [
			E('p', { class: 'ex-muted' }, ['Diagnóstico abrangente e dinâmico dos componentes físicos, sensores térmicos e capacidades do seu roteador.']),
			E('div', { style: 'max-height: 72vh; overflow-y: auto; padding-right: 4px;' }, [
				sectionBlock('Identificação do Equipamento', '💻', sysRows),
				sectionBlock('Aceleração em Silício & Perfil de Ajuste', '🚀', siliconRows),
				sectionBlock('Processador e Desempenho', '⚡', cpuRows),
				sectionBlock('Sensores Térmicos ao Vivo', '🌡️', thermalRows),
				sectionBlock('Memória RAM', '💾', memRows),
				sectionBlock('Maiores Consumidores de RAM (Memória Real RSS)', '⚡', [
					topProcContainer,
					E('div', { style: 'margin-top:8px;text-align:right;' }, [
						E('a', { class: 'ex-mini-button', href: '/cgi-bin/luci/admin/status/processes', style: 'text-decoration:none;' }, ['Ver Tabela Completa de Processos ➔'])
					])
				]),
				sectionBlock('Armazenamento Flash & RAM', '💽', stRows),
				sectionBlock('Portas Físicas Ethernet', '🌐', portRows),
				sectionBlock('Recursos de Rede Sem Fio (Wi-Fi)', '📶', wifiRows)
			]),
			E('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-top:14px;' }, [
				autoTuneModalBtn,
				E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': ui.hideModal }, ['Fechar'])
			])
		]);
	},
	showFeatureCenter: function(){
		const language=E('select',{class:'cbi-input-select'},[E('option',{value:'pt-br'},['Português (Brasil)']),E('option',{value:'en'},['Inglês']),E('option',{value:'es'},['Español'])]);language.value=this.capabilities.language||'pt-br';
		const brandName=E('input',{class:'cbi-input-text',type:'text',maxlength:40,value:this.capabilities.title||'ARK Router','aria-label':translateText('Nome do painel')});
		const appearance=this.capabilities.appearance||{mode:'auto',primary:'#3b82f6',secondary:'#8b5cf6'}, appearanceMode=E('select',{class:'cbi-input-select'},[E('option',{value:'auto'},['Automático (seguir o tema)']),E('option',{value:'equipe'},['ARK Router']),E('option',{value:'custom'},['Personalizado'])]), primary=E('input',{type:'color',value:appearance.primary||'#3b82f6','aria-label':translateText('Cor principal')}), secondary=E('input',{type:'color',value:appearance.secondary||'#8b5cf6','aria-label':translateText('Cor secundária')}); appearanceMode.value=appearance.mode||'auto';
		const appearanceColors=E('div',{class:'ex-color-fields'},[E('label',{},[E('span',{},['Cor principal']),primary]),E('label',{},[E('span',{},['Cor secundária']),secondary])]);
		const isLegacy = !!(this.capabilities && this.capabilities.hardware && this.capabilities.hardware.is_legacy_owrt);
		const currentTheme = this.capabilities.current_theme || 'bootstrap';
		const rawAvailable = (this.capabilities.available_themes && this.capabilities.available_themes.length) ? this.capabilities.available_themes.slice() : ['ark', 'bootstrap'];
		if (rawAvailable.indexOf('ark') === -1) rawAvailable.unshift('ark');
		if (rawAvailable.indexOf('bootstrap') === -1) rawAvailable.push('bootstrap');

		const themeLabels = {
			ark: '⚡ Tema ARK (Nativo)',
			bootstrap: 'Tema Bootstrap (Padrão)',
			material: 'Tema Material',
			openwrt: 'Tema OpenWrt'
		};
		const themeOptions = rawAvailable.map(function(t) {
			const label = themeLabels[t] || ('Tema ' + t.charAt(0).toUpperCase() + t.slice(1));
			return E('option', { value: t }, [label]);
		});
		const themeSelect = E('select', { class: 'cbi-input-select' }, themeOptions);
		themeSelect.value = currentTheme;

		const updateColorFields = function() {
			const isCustom = appearanceMode.value === 'custom';
			primary.disabled = !isCustom;
			secondary.disabled = !isCustom;
			if (appearanceColors) appearanceColors.classList.toggle('is-disabled', !isCustom);
		};
		appearanceMode.addEventListener('change', updateColorFields);
		updateColorFields();

		const themeRow = E('div', { class: 'ex-theme-row' }, [
			E('div', {}, [
				E('strong', {}, ['Tema da Interface (LuCI)']),
				E('small', { class: 'ex-muted' }, ['Alterne entre o Tema ARK e o Tema Bootstrap padrão do sistema.'])
			]),
			E('div', { class: 'ex-theme-actions' }, [
				themeSelect,
				E('button', {
					class: 'ex-mini-button',
					'click': L.bind(function() {
						this.useTheme(themeSelect.value);
					}, this)
				}, ['Aplicar tema'])
			])
		]);

		const isSat = isSatelliteOrAp(this.currentData || (this.capabilities && this.capabilities));
		const rows=Object.keys(FEATURE_META).map(L.bind(function(key){
			const meta=FEATURE_META[key],f=this.feature(key)||{};
			const isShieldedOnSat = isSat && (key === 'sqm' || key === 'mwan3' || key === 'speedify' || key === 'upnp' || key === 'adblock' || key === 'nlbwmon');
			const isNativeHw = key === 'irqbalance' && (!!f.native_hw || (!f.installable && f.reason && (f.reason.indexOf('nativamente') !== -1 || f.reason.indexOf('Desnecessário') !== -1)));
			let state=f.installed?(f.temporary?'Pronto na memória':(f.active?'Instalado e ativo':'Instalado, mas inativo')):(f.installable?'Não instalado':'Não disponível');
			let pillClass=f.installed?(isShieldedOnSat?'standby':(f.active?'online':'standby')):(f.hidden?'standby':'offline');
			if (isNativeHw) {
				if (f.active) {
					state = 'Nativo (IRQ Balance ativo)';
					pillClass = 'standby';
				} else {
					state = 'Nativo por Hardware';
					pillClass = 'online';
				}
			} else if (isShieldedOnSat) {
				state = f.installed ? _t('Inativo (Modo AP)') : _t('Desativado em Modo AP');
				pillClass = 'standby';
			} else if (key === 'zram' && f.installed) {
				state = f.active ? ('Ativo' + (f.zram_size_mb ? ' (' + f.zram_size_mb + ' MB)' : '')) : 'Desativado';
				pillClass = f.active ? 'online' : 'standby';
			} else if(!f.installed&&f.hidden) {
				state='Sugestão oculta';
			}
			const actions=[];
			if (!isShieldedOnSat && !isNativeHw) {
				if(!f.installed&&f.installable){
					if(f.hidden)actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.setFeatureHidden,this,key,false)},['Mostrar sugestão']));
					else{
						if(key!=='speedtest')actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,key)},['Instalar']));
						actions.push(E('button',{class:'ex-feature-link','click':L.bind(this.setFeatureHidden,this,key,true)},['Ocultar sugestão']));
					}
				}
				if(key==='irqbalance'&&f.installed)actions.push(E('button',{class:'ex-mini-button','click':L.bind(function(){const desired=!f.active;return fs.exec('/usr/sbin/equipe-dashboard-control',['irqbalance-toggle',desired?'1':'0']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar IRQ Balance');ui.addNotification(null,E('p',{},[desired?'IRQ Balance ativado.':'IRQ Balance desativado.']));window.setTimeout(function(){window.location.reload();},900);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},[f.active?'Desativar':'Ativar']));
				if(key==='usteer'&&f.installed)actions.push(E('button',{class:'ex-mini-button','click':L.bind(function(){const desired=!f.active;return fs.exec('/usr/sbin/equipe-dashboard-control',['wifi-usteer-toggle',desired?'1':'0']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar usteer');ui.addNotification(null,E('p',{},[desired?'Assistente usteer ativado com sucesso.':'Assistente usteer desativado.']));window.setTimeout(function(){window.location.reload();},900);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},[f.active?'Desativar':'Ativar']));
				if(key==='upnp'&&f.installed)actions.push(E('button',{class:'ex-mini-button','click':L.bind(function(){const desired=!f.active;return fs.exec('/usr/sbin/equipe-dashboard-control',['upnp-toggle',desired?'1':'0']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar UPnP');ui.addNotification(null,E('p',{},[desired?'UPnP ativado. Atenção: portas podem ser abertas sem autenticação.':'UPnP desativado com sucesso (modo seguro).']));window.setTimeout(function(){window.location.reload();},900);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},[f.active?'Desativar':'Ativar']));
				if(key==='zram'&&f.installed)actions.push(E('button',{class:'ex-mini-button','click':L.bind(function(){
					const desired=!f.active;
					if(desired && f.is_high_ram){
						return this.showHighRamZramConfirmModal(f);
					}
					if(desired && f.is_low_end_mips){
						return this.showLowEndMipsZramConfirmModal(f);
					}
					return fs.exec('/usr/sbin/equipe-dashboard-control',['zram-toggle',desired?'1':'0']).then(function(r){
						if(r.code)throw new Error(r.stderr||'Falha ao alterar ZRAM');
						ui.addNotification(null,E('p',{},[desired?'Compressão de memória (ZRAM) ativada com sucesso.':'Compressão de memória (ZRAM) desativada com sucesso.']));
						window.setTimeout(function(){window.location.reload();},900);
					}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
				},this)},[f.active?'Desativar':'Ativar']));
			} else if (isNativeHw && f.installed && f.active) {
				actions.push(E('button',{class:'ex-mini-button','click':L.bind(function(){
					return fs.exec('/usr/sbin/equipe-dashboard-control',['irqbalance-toggle','0']).then(function(r){
						if(r.code)throw new Error(r.stderr||'Falha ao alterar IRQ Balance');
						ui.addNotification(null,E('p',{},['IRQ Balance desativado. Modo nativo por hardware restaurado.']));
						window.setTimeout(function(){window.location.reload();},900);
					}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
				},this)},['Desativar (Restaurar Nativo)']));
			}
			let reasonEl = '';
			if (isNativeHw) {
				if (f.active) {
					reasonEl = E('small',{class:'ex-feature-reason',style:'color:#f59e0b;font-weight:600;display:block;margin-top:4px;'},['⚠️ Alerta: IRQ Balance em execução em hardware que já possui anéis de DMA no silício. Desative para evitar jitter.']);
				} else {
					reasonEl = E('small',{class:'ex-feature-reason',style:'color:#10b981;font-weight:600;display:block;margin-top:4px;'},['✨ '+(f.reason||'Processamento multicore já distribuído nativamente por hardware/driver.')]);
				}
			} else if (isShieldedOnSat) {
				const satReason = f.reason || 'Exclusivo do Roteador Mestre (Gateway principal).';
				reasonEl = E('small',{class:'ex-feature-reason',style:'color:#3b82f6;font-weight:600;display:block;margin-top:4px;'},[(satReason.startsWith('🛡️')||satReason.startsWith('Desnecessário'))?satReason:('🛡️ '+satReason)]);
			} else if (key==='upnp'&&f.installed) {
				if (f.active) {
					reasonEl = E('small',{class:'ex-feature-reason',style:'color:#f59e0b;font-weight:600;display:block;margin-top:4px;'},['⚠️ Risco de Segurança: Ativo. Qualquer aplicativo na rede pode abrir portas na WAN sem senha. Desative se não usar jogos P2P.']);
				} else {
					reasonEl = E('small',{class:'ex-feature-reason',style:'color:#10b981;font-weight:600;display:block;margin-top:4px;'},['🛡️ Modo Seguro: Desativado. Nenhuma porta é aberta automaticamente. Máxima proteção e economia de RAM.']);
				}
			} else if (key==='zram'&&f.installed) {
				const memStr = (f.mem_total_mb || '512+') + ' MB';
				const sizeStr = (f.zram_size_mb || (f.is_low_end_mips ? '32' : '128')) + ' MB';
				if (f.active) {
					if (f.is_high_ram) {
						reasonEl = E('small',{class:'ex-feature-reason',style:'color:#3b82f6;font-weight:600;display:block;margin-top:4px;'},[_t('ℹ️ Desnecessário (RAM Abundante): Ativo manualmente. Este roteador possui %s de RAM física e dispensa compressão.').replace('%s', memStr)]);
					} else if (f.is_low_end_mips) {
						reasonEl = E('small',{class:'ex-feature-reason',style:'color:#f59e0b;font-weight:600;display:block;margin-top:4px;'},[_t('⚡ Modo Protegido (CPU Mononúcleo): Ativo com swappiness=15 e limite de %s para poupar a CPU.').replace('%s', sizeStr)]);
					} else {
						reasonEl = E('small',{class:'ex-feature-reason',style:'color:#10b981;font-weight:600;display:block;margin-top:4px;'},[_t('🛡️ Proteção Ativa: Memória comprimida em tempo real (%s ZRAM). Evita falhas por memória cheia (OOM).').replace('%s', sizeStr)]);
					}
				} else {
					if (f.is_high_ram) {
						reasonEl = E('small',{class:'ex-feature-reason',style:'color:#3b82f6;font-weight:600;display:block;margin-top:4px;'},[_t('✨ Recomendado Desativado: Memória abundante (%s). Manter desativado economiza 100% de CPU.').replace('%s', memStr)]);
					} else if (f.is_low_end_mips) {
						reasonEl = E('small',{class:'ex-feature-reason',style:'color:#f59e0b;font-weight:600;display:block;margin-top:4px;'},[_t('⚠️ Recomendado Desativado: Processador single-core MIPS. ZRAM pode causar lentidão se ativado sem extrema necessidade.')]);
					} else {
						reasonEl = E('small',{class:'ex-feature-reason',style:'color:#10b981;font-weight:600;display:block;margin-top:4px;'},[_t('💡 Altamente Recomendado: Roteador com %s de RAM. Ative para evitar falhas por falta de memória.').replace('%s', memStr)]);
					}
				}
			} else if (!f.installed&&f.reason) {
				reasonEl = E('small',{class:'ex-feature-reason',style:'color:#ef4444;font-weight:600;display:block;margin-top:4px;'},['⚠️ '+f.reason]);
			}
			return E('div',{class:'ex-feature-row'},[E('div',{class:'ex-feature-copy'},[E('div',{class:'ex-feature-name-row'},[E('strong',{},[meta.name]),(meta.recommended?E('span',{class:'ex-recommended-badge'},['RECOMENDADO']):'')]),E('small',{class:'ex-muted'},[meta.description]),f.package?E('code',{},[f.package]):'',reasonEl]),E('div',{class:'ex-feature-state'},[E('span',{class:'ex-pill '+pillClass},[state]),E('div',{class:'ex-feature-actions'},actions)])]);
		},this));
		const bulkKeys=['sqm','mwan3','nlbwmon','upnp'].filter(L.bind(function(key){const f=this.feature(key)||{};return !f.installed&&f.installable&&!(isSat&&(key==='sqm'||key==='mwan3'||key==='speedify'||key==='upnp'||key==='adblock'||key==='nlbwmon'));},this));
		const bulkPanel=E('section',{class:'ex-cleanup-entry'},[E('div',{},[E('strong',{},['Instalação rápida']),E('small',{class:'ex-muted'},[bulkKeys.length?('Instala todos os recursos leves faltantes: '+bulkKeys.map(function(k){return (FEATURE_META[k]&&FEATURE_META[k].name)||k;}).join(', ')):'Todos os recursos leves compatíveis já estão instalados ou indisponíveis neste roteador.'])]),E('button',{class:'ex-mini-button','click':L.bind(this.installMissingFeatures,this,bulkKeys),disabled:!bulkKeys.length},['Instalar tudo'])]);
		const ipv6Panel=E('section',{class:'ex-cleanup-entry'},[
			E('div',{},[
				E('strong',{},['🌐 Central de Conectividade IPv6']),
				E('small',{class:'ex-muted'},['Modos de operação: Pilha Dupla Global, NPTv6 Inteligente (Multi-WAN), IPv6 Seletivo por MAC, IPv4 Apenas ou IPv6-Only.'])
			]),
			E('button',{class:'ex-mini-button btn-ipv6','click':L.bind(function(){
				closeModal();
				this.showIpv6Modal();
			},this)},['Ajustes IPv6'])
		]);
		const ntpPanel=E('section',{class:'ex-cleanup-entry'},[
			E('div',{},[
				E('strong',{},['⏰ Sincronização de Horário & NTP Inteligente']),
				E('small',{class:'ex-muted'},['Pool resiliente (NTP.br + Cloudflare + Google), Interceptação UDP 123 na LAN (1ms para IoT) e Fake RTC Preserver contra ano 1970.'])
			]),
			E('button',{class:'ex-mini-button',style:'background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3);font-weight:700;','click':L.bind(function(){
				closeModal();
				this.showNtpModal();
			},this)},['Ajustes NTP & Fuso'])
		]);
		const profileSelect=E('select',{class:'cbi-input-select'},[
			E('option',{value:'standard'},['Modo Padrão / Equilibrado']),
			E('option',{value:'gamer'},['Modo Gamer (Baixa Latência & PUBG Mobile)'])
		]);
		profileSelect.value=this.capabilities.operation_profile||'standard';
		const profilePanel=E('div',{class:'ex-brand-row'},[
			E('label',{},['Perfil operacional']),
			profileSelect,
			E('button',{class:'ex-mini-button','click':L.bind(function(){
				closeModal();
				this.switchProfile(profileSelect.value);
			},this)},['Aplicar perfil'])
		]);
		const wanOptPanel=E('section',{class:'ex-cleanup-entry'},[
			E('div',{},[
				E('strong',{},['⚡ Otimização de Conexão e Desempenho da Internet']),
				E('small',{class:'ex-muted'},['Calibração inteligente para Modem/DHCP, Fibra PPPoE, 4G/5G e Starlink. Aceleração Fastpath e proteção de memória RAM.'])
			]),
			E('button',{class:'ex-mini-button','click':L.bind(function(){
				closeModal();
				this.showWanOptimizationsModal();
			},this)},['Otimizar internet'])
		]);
		const doctorPanel=E('section',{class:'ex-cleanup-entry'},[
			E('div',{},[
				E('strong',{},['🩺 Diagnóstico do Sistema & Logs (Ark Doctor)']),
				E('small',{class:'ex-muted'},['Auditoria contínua de 25+ itens vitais do roteador, visualizador de logs (/var/log/ark-doctor.log) e ferramentas de autocura.'])
			]),
			E('div',{style:'display:flex;gap:8px;align-items:center;'},[
				E('button',{class:'ex-mini-button','click':L.bind(function(){
					closeModal();
					this.showDoctorModal('diagnosis');
				},this)},[_t('Diagnóstico')]),
				E('button',{class:'ex-mini-button',style:'background:rgba(59,130,246,0.15);color:#3b82f6;border:1px solid rgba(59,130,246,0.3);font-weight:700;','click':L.bind(function(){
					closeModal();
					this.showDoctorModal('log');
				},this)},[_t('📜 Ver Logs')])
			])
		]);
		const starlinkAlwaysShowModalVal = !!(this.capabilities.features && (this.capabilities.features.starlink_always_show === 1 || this.capabilities.features.starlink_always_show === true || this.capabilities.features.starlink_always_show === '1')) || (localStorage.getItem('ark_starlink_always_show') === '1');
		const starlinkAlwaysShowModalInput = E('input', {
			id: 'ex-starlink-always-show-modal-input',
			type: 'checkbox',
			'aria-label': 'Sempre exibir painel Starlink',
			change: L.bind(function(ev) {
				this.toggleStarlinkAlwaysShow(ev.currentTarget);
			}, this)
		});
		starlinkAlwaysShowModalInput.checked = starlinkAlwaysShowModalVal;

		const starlinkModalPanel = E('section', {
			id: 'ex-starlink-always-show-modal-panel',
			class: 'ex-https-panel' + (starlinkAlwaysShowModalVal ? ' is-enabled' : ''),
			style: 'margin-bottom: 10px;'
		}, [
			E('div', { class: 'ex-https-toggle-row' }, [
				E('div', {}, [
					E('strong', { style: 'display: block; margin-bottom: 2px;' }, ['📡 Painel Starlink e Central de Telemetria']),
					E('small', { class: 'ex-muted' }, ['Sempre exibir o painel Starlink no início, permitindo testar e configurar telemetria mesmo sem antena física detectada.'])
				]),
				E('div', { class: 'ex-https-switch-wrap' }, [
					E('span', {
						id: 'ex-starlink-always-show-modal-state',
						class: 'ex-https-switch-state ' + (starlinkAlwaysShowModalVal ? 'online' : 'standby')
					}, [starlinkAlwaysShowModalVal ? 'LIGADO' : 'DESLIGADO']),
					E('label', { class: 'ex-switch' }, [starlinkAlwaysShowModalInput, E('span', { class: 'ex-switch-slider' })])
				])
			])
		]);

		ui.showModal('RECURSOS E COMPATIBILIDADE',[
			profilePanel,
			wanOptPanel,
			doctorPanel,
			E('div',{class:'ex-brand-row'},[E('label',{},['Nome do painel']),brandName,E('button',{class:'ex-mini-button','click':L.bind(function(){this.setDashboardTitle(brandName.value);},this)},['Salvar nome'])]),
			E('div',{class:'ex-language-row'},[E('label',{},['Idioma do painel']),language,E('button',{class:'ex-mini-button','click':L.bind(function(){this.setDashboardLanguage(language.value);},this)},['Salvar idioma'])]),
			this.selfUpdatePanel(),
			bulkPanel,
			ipv6Panel,
			ntpPanel,
			starlinkModalPanel,
			E('section', { class: 'ex-appearance-panel' }, [
				E('div', { class: 'ex-appearance-heading' }, [
					E('div', {}, [
						E('strong', {}, ['Aparência']),
						E('small', { class: 'ex-muted' }, ['No modo automático, o painel acompanha as cores e o modo claro ou escuro do tema LuCI.'])
					]),
					appearanceMode
				]),
				E('div', { class: 'ex-appearance-colors-row' }, [
					appearanceColors,
					E('button', {
						class: 'ex-mini-button ex-save-appearance',
						'click': L.bind(function() {
							this.setAppearance(appearanceMode.value, primary.value, secondary.value);
						}, this)
					}, ['Salvar aparência'])
				]),
				E('div', { class: 'ex-appearance-divider' }),
				themeRow
			]),
			E('div',{class:'ex-feature-list'},rows),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar'])])
		]);
	},
	showNtpModal: function() {
		const self = this;
		ui.showModal('⏰ Sincronização Inteligente de Horário & NTP', [
			E('p', { class: 'ex-muted' }, ['Consultando status de relógio e servidores NTP do roteador…'])
		]);

		return fs.exec('/usr/sbin/equipe-dashboard-control', ['ntp-status']).then(function(r) {
			let st = {};
			try { st = JSON.parse(r.stdout || '{}'); } catch(e) {}

			const browserTz = (Intl && Intl.DateTimeFormat) ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'America/Sao_Paulo';
			const browserOffsetMin = new Date().getTimezoneOffset();
			const browserDateStr = new Date().toLocaleString('pt-BR');

			const statusBox = E('div', {
				class: 'ex-priority-desc-box',
				style: 'margin-bottom: 16px; border: 1px solid rgba(255,255,255,.1); padding: 14px; border-radius: 10px; background: rgba(15,23,42,.6);'
			}, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
						E('strong', { style: 'font-size: 0.95rem; color: #f8fafc;' }, ['Relógio do Roteador:']),
						E('span', {
							class: 'ex-device-badge',
							style: 'font-weight: 700; font-size: 0.85rem; padding: 3px 10px; border-radius: 8px; color: #10b981; background: rgba(16,185,129,.15); border: 1px solid rgba(16,185,129,.35);'
						}, [ st.date_formatted || 'Desconhecido' ])
					]),
					E('span', {
						class: 'ex-pill ' + (st.server_active ? 'online' : 'standby'),
						style: 'font-size: 0.75rem;'
					}, [ st.server_active ? 'Servidor NTP Local Ativo (Porta 123)' : 'Modo Cliente Apenas' ])
				]),
				E('div', { class: 'ex-grid ex-grid-2', style: 'gap: 8px; font-size: 0.8rem;' }, [
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['Fuso Configurado: ']),
						E('strong', { style: 'color: #38bdf8;' }, [ (st.zonename || 'America/Sao_Paulo') + ' (' + (st.timezone || '<-03>3') + ')' ])
					]),
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['Fuso do seu Aparelho: ']),
						E('strong', { style: 'color: #a78bfa;' }, [ browserTz + ' (' + browserDateStr + ')' ])
					]),
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['Interceptação UDP 123: ']),
						E('strong', { style: 'color: ' + (st.intercept_active ? '#10b981' : '#f59e0b') }, [ st.intercept_active ? 'Ativa (1ms de resposta p/ IoT)' : 'Desativada' ])
					]),
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['Fake RTC Clock Preserver: ']),
						E('strong', { style: 'color: ' + (st.clock_preserver_active ? '#10b981' : '#94a3b8') }, [ st.clock_preserver_active ? 'Ativo (timestamp salvo)' : 'Aguardando primeiro boot' ])
					])
				])
			]);

			const interceptCheckbox = E('input', {
				type: 'checkbox',
				checked: st.intercept_active ? '' : null,
				change: function(ev) {
					const desired = ev.currentTarget.checked ? '1' : '0';
					ev.currentTarget.disabled = true;
					fs.exec('/usr/sbin/equipe-dashboard-control', ['ntp-intercept-toggle', desired]).then(function(res) {
						if (res.code) throw new Error(res.stderr || 'Falha ao alterar interceptação NTP');
						ui.addNotification(null, E('p', {}, [desired === '1' ? 'Interceptação NTP UDP 123 ativada.' : 'Interceptação NTP desativada.']));
						self.showNtpModal();
					}).catch(function(e) {
						ev.currentTarget.disabled = false;
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					});
				}
			});
			interceptCheckbox.checked = !!st.intercept_active;

			const interceptCard = E('section', {
				class: 'ex-cleanup-entry',
				style: 'margin-bottom: 12px; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); align-items: center;'
			}, [
				E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;' }, [
						E('strong', { style: 'font-size: 0.92rem; color: #f8fafc;' }, ['🛡️ Interceptação Anycast LAN (UDP 123)']),
						E('span', { class: 'ex-pill ' + (st.intercept_active ? 'online' : 'standby'), style: 'font-size: 0.7rem;' }, [ st.intercept_active ? 'REDIRECIONAMENTO ATIVO' : 'DESLIGADO' ])
					]),
					E('p', { class: 'ex-muted', style: 'font-size: 0.8rem; line-height: 1.4; margin: 4px 0 0;' }, [
						'Intercepta silenciosamente qualquer consulta NTP de câmeras IP, TVs e tomadas IoT na rede local e responde em menos de 1ms pelo próprio roteador. Aparelhos nunca mais perdem a hora mesmo com servidores externos bloqueados.'
					])
				]),
				E('div', { style: 'flex: 0 0 auto; margin-left: 14px;' }, [
					E('label', { class: 'ex-switch' }, [
						interceptCheckbox,
						E('span', { class: 'ex-switch-slider' })
					])
				])
			]);

			const serversList = (st.servers && st.servers.length) ? st.servers : ['a.st1.ntp.br', 'b.st1.ntp.br', 'time.cloudflare.com', 'time.google.com'];
			const serversCard = E('div', {
				class: 'ex-cleanup-entry',
				style: 'margin-bottom: 16px; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02);'
			}, [
				E('div', { style: 'flex: 1 1 auto;' }, [
					E('strong', { style: 'font-size: 0.92rem; color: #f8fafc; display: block; margin-bottom: 4px;' }, ['🌐 Servidores Upstream em Uso (Pool Resiliente)']),
					E('div', { style: 'display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px;' }, serversList.map(function(srv) {
						return E('code', { style: 'font-size: 0.78rem; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,.06); color: #38bdf8;' }, [ srv ]);
					}))
				])
			]);

			const syncBrowserBtn = E('button', {
				class: 'btn cbi-button cbi-button-positive',
				style: 'min-height: 40px; font-weight: 700;',
				click: function(ev) {
					const b = ev.currentTarget;
					b.disabled = true;
					b.textContent = 'Sincronizando…';
					const nowEpoch = Math.floor(Date.now() / 1000);
					return fs.exec('/usr/sbin/equipe-dashboard-control', ['ntp-sync-browser', String(nowEpoch), browserTz, String(browserOffsetMin)]).then(function(res) {
						if (res.code) throw new Error(res.stderr || 'Falha ao sincronizar relógio');
						ui.addNotification(null, E('p', {}, ['Relógio do roteador e fuso horário (' + browserTz + ') sincronizados com sucesso.']));
						self.showNtpModal();
					}).catch(function(err) {
						b.disabled = false;
						b.textContent = '⏱️ Sincronizar com Navegador Agora';
						ui.addNotification(null, E('p', {}, [err.message]), 'danger');
					});
				}
			}, ['⏱️ Sincronizar Fuso & Relógio com este Navegador']);

			const resetPoolBtn = E('button', {
				class: 'btn cbi-button cbi-button-neutral',
				style: 'min-height: 40px;',
				click: function(ev) {
					const b = ev.currentTarget;
					b.disabled = true;
					b.textContent = 'Aplicando…';
					return fs.exec('/usr/sbin/equipe-dashboard-control', ['ntp-configure-smart']).then(function(res) {
						if (res.code) throw new Error(res.stderr || 'Falha ao reconfigurar pool');
						ui.addNotification(null, E('p', {}, ['Pool resiliente (NTP.br + Cloudflare + Google) e Interceptação aplicados.']));
						self.showNtpModal();
					}).catch(function(err) {
						b.disabled = false;
						b.textContent = '⚡ Aplicar Pool Resiliente Padrão';
						ui.addNotification(null, E('p', {}, [err.message]), 'danger');
					});
				}
			}, ['⚡ Aplicar Pool Resiliente Padrão']);

			ui.showModal('⏰ Sincronização Inteligente de Horário & NTP', [
				statusBox,
				interceptCard,
				serversCard,
				E('div', { class: 'right', style: 'display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap;' }, [
					resetPoolBtn,
					syncBrowserBtn,
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar'])
				])
			]);
		}).catch(function(e) {
			ui.showModal('⏰ Sincronização de Horário', [
				E('p', { class: 'alert-message warning' }, [ e.message ]),
				E('div', { class: 'right' }, [ E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar']) ])
			]);
		});
	}
};
