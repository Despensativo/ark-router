// /src/modules/render.js - ARK Router LuCI View Module
const renderMethods = {
	render: function(loaded) {
		const self = this;
		if (!window._arkEscModalAttached) {
			window._arkEscModalAttached = true;
			document.addEventListener('keydown', function(ev) {
				if (ev.key === 'Escape' || ev.keyCode === 27) {
					var modal = document.querySelector('.modal, .cbi-modal, #modal_overlay, div[class*="modal"]');
					if (modal) {
						ev.preventDefault();
						if (typeof ui !== 'undefined' && typeof ui.hideModal === 'function') {
							ui.hideModal();
						} else if (window.L && L.ui && typeof L.ui.hideModal === 'function') {
							L.ui.hideModal();
						} else {
							var btn = modal.querySelector('button.cbi-button-neutral, button.btn-neutral, .close');
							if (btn) btn.click();
						}
					}
				}
			});
		}
		this.board=loaded[0]||{}; this.countries=(loaded[1]&&loaded[1].results)||[]; this.capabilities=loaded[2]||{features:{}}; dashboardLanguage=this.capabilities.language||'pt-br';this.applyAppearance();this.applyBrand(this.capabilities.title);enableTranslation(); const data=loaded[3], w=wifiConfig(data.wireless), release=((this.board.release||{}).description||'').split(' ').slice(0,2).join(' '), panelTitle=this.capabilities.title||'ARK Router';
		if (dashboardLanguage === 'pt-br') {
			var noPassH4 = document.querySelector('.alert-message.warning h4');
			if (noPassH4 && noPassH4.textContent.indexOf('No password set') !== -1) {
				noPassH4.textContent = 'Nenhuma senha definida!';
				var noPassP = noPassH4.parentElement ? noPassH4.parentElement.querySelector('p') : null;
				if (noPassP && noPassP.textContent.indexOf('There is no password set') !== -1) {
					noPassP.textContent = 'Não há nenhuma senha configurada neste roteador. Por favor, configure uma senha para o usuário root a fim de proteger o painel.';
				}
				var noPassA = noPassH4.parentElement ? noPassH4.parentElement.querySelector('a') : null;
				if (noPassA && (noPassA.textContent.indexOf('password configuration') !== -1 || noPassA.textContent.indexOf('Go to') !== -1)) {
					noPassA.textContent = 'Configurar senha de acesso…';
				}
			}
		}
		const isGamer=(this.capabilities&&this.capabilities.operation_profile)==='gamer';
		const isApMode=(this.capabilities&&this.capabilities.network_mode)==='ap';
		const hw = (this.capabilities && this.capabilities.hardware) || {};
		const isMaxPower = !!(hw.wifi_maxpower_enabled || (w.r2g && w.r2g.country === 'PA') || (w.r5g && w.r5g.country === 'PA'));
		const isWedSupported = !!hw.wifi_wed_supported;
		const isWedEnabled = !!hw.wifi_wed_enabled;
		const isWifi6PlusSupported = !!(hw.wifi_ax_supported || hw.wifi_be_supported);
		const isWifi7 = !!hw.wifi_be_supported;
		const has6gBand = !!(hw.wifi_6g_supported || w.has6g);
		const heroEyebrow=isApMode?_t('📡 ROTEADOR SECUNDÁRIO • PONTO ADICIONAL & SWITCH'):(isGamer?_t('🎮 MODO GAMER • BAIXA LATÊNCIA'):_t('CENTRAL DE OPERAÇÕES'));
		const gamerButton=E('button',{class:'ex-hero-feature-button '+(isGamer?'ex-hero-gamer-active':'ex-hero-gamer-btn'),'click':L.bind(this.switchProfile,this,isGamer?'standard':'gamer')},[isGamer?'🎮 GAMER ATIVO':'🎮 Modo Gamer']);
		const opModeButton=E('button',{class:'ex-hero-feature-button ex-hero-opmode-btn',style:isApMode?'border-color:#3b82f6;color:#60a5fa;font-weight:700;':'font-weight:650;','click':L.bind(this.showNetworkModeModal,this)},[isApMode?'📡 Roteador Secundário / AP':'🌐 Modo Roteador']);
		const langBadge = dashboardLanguage === 'en' ? '🌐 🇺🇸 EN' : (dashboardLanguage === 'es' ? '🌐 🇪🇸 ES' : '🌐 🇧🇷 PT');
		const languageButton = E('button', {
			class: 'ex-hero-feature-button ex-hero-lang-btn',
			style: 'font-weight:700;',
			title: _t('Alterar idioma do painel'),
			click: L.bind(this.showLanguageModal, this)
		}, [langBadge]);
		const wifiCard=L.bind(function(kind,title,cfg,isExtra){
			const ssid=cfg.ssid||(kind==='guest'?'ARK Router Visitantes':'ARK Router'),
			      key=cfg.key||'',
			      runtime=getWifiRuntimeState(cfg, data.wireless, data.wirelessStatus),
			      keyId='ex-'+kind+'-key';
			const kickerText = isExtra ? ('REDE ADICIONAL' + (cfg.network === 'guest' ? ' (ISOLADA)' : '')) : ('REDE WI‑FI' + (cfg.split ? ' (SEPARADA)' : ''));
			const titleElements = [
				E('span',{class:'ex-kicker'},[kickerText]),
				E('h3',{id:'ex-'+kind+'-ssid'},[ssid])
			];
			const bandContent = cfg.split ? E('div',{class:'ex-wifi-split-grid'},[
				E('div',{class:'ex-wifi-band-chip band-24'},[
					E('span',{class:'ex-wifi-band-badge'},['2.4 GHz']),
					E('strong',{class:'ex-wifi-band-name'},[cfg.ssid2 || '—'])
				]),
				E('div',{class:'ex-wifi-band-chip band-50'},[
					E('span',{class:'ex-wifi-band-badge'},['5 GHz']),
					E('strong',{class:'ex-wifi-band-name'},[cfg.ssid5 || '—'])
				])
			]) : E('small',{class:'ex-muted ex-wifi-subtitle'},[
				title + ' • ' + (cfg.has2g && cfg.has5g ? 'disponível em 2,4 e 5 GHz • ' : (cfg.has5g ? 'apenas 5 GHz • ' : 'apenas 2,4 GHz • ')),
				E('span',{class:'ex-wifi-unified-pill'},[cfg.network === 'guest' ? 'Isolada' : 'Rede Unificada'])
			]);
			const extraGuestRow = (kind === 'guest') ? E('div',{class:'ex-wifi-guest-limit-row'},[
				E('span',{},['Limite de velocidade']),
				E('strong',{id:'ex-wifi-guest-limit-val'},['—'])
			]) : '';
			return E('section',{class:'ex-card ex-wifi-card'},[
				E('div',{class:'ex-card-title'},[
					E('div',{},titleElements),
					E('div',{style:'display:flex;align-items:center;gap:10px;'},[
						E('span',{id:'ex-'+kind+'-wifi-status',class:'ex-pill '+runtime.pillClass},[runtime.label]),
						E('label',{class:'ex-switch',title:'Ligar ou desligar Wi‑Fi '+ssid},[
							E('input',{
								id:'ex-'+kind+'-wifi-toggle',
								type:'checkbox',
								checked: runtime.checked ? '' : null,
								'aria-label':'Ligar ou desligar Wi‑Fi '+ssid,
								'change':L.bind(function(ev){ this.toggleWifiNetwork(ev.currentTarget, kind, cfg); }, this)
							}),
							E('span',{class:'ex-switch-slider'})
						])
					])
				]),
				E('div',{class:'ex-secret'},[
					E('code',{id:keyId,'data-hidden':'1',style:'filter:blur(5px)'},[key||'sem senha']),
					E('button',{class:'ex-mini-button','click':function(ev){this.togglePassword(keyId,ev.currentTarget);}.bind(this)},['Ver senha'])
				]),
				bandContent,
				extraGuestRow,
				E('button',{class:'ex-mini-button ex-wifi-config-button',style:'margin-top:12px;width:100%;justify-content:center;font-weight:750;padding:8px 12px;display:flex;align-items:center;gap:6px;font-size:13px;','click':L.bind(function(){this.editWifiNetwork(kind,cfg);},this)},['⚙ Configurar Wi‑Fi (Nome, Senha e Status)'])
			]);
		},this);
		const modeButton=L.bind(function(mode,label){return E('button',{id:'ex-mode-'+mode,class:'ex-mode-button','click':L.bind(this.setMwanMode,this,mode,label)},[label]);},this);
		const historyCard=function(kind,title,color){return E('section',{class:'ex-card ex-history-card','style':'--history-color:'+color},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['HISTÓRICO 24 HORAS']),E('h3',{},[title])]),E('strong',{id:'ex-history-'+kind+'-peak',class:'ex-history-peak'},['Coletando…'])]),E('canvas',{id:'ex-history-'+kind,class:'ex-history-chart',width:600,height:126})]);};
		const healthItem=function(icon,label,valueId,barId,color,detailId,onClick){
			const attrs={class:'ex-health-item'+(onClick?' clickable':''),style:'--health-color:'+color};
			if(onClick){attrs.click=onClick;attrs.role='button';attrs.tabindex='0';}
			return E('div',attrs,[
				E('span',{class:'ex-health-icon'},[icon]),
				E('div',{class:'ex-health-copy'},[
					E('span',{class:'ex-label'},[label]),
					E('strong',{id:valueId},['—']),
					barId?E('div',{class:'ex-health-bar'},[E('i',{id:barId})]):E('small',{class:'ex-health-steady'},['atividade do sistema']),
					detailId?E('small',{id:detailId,class:'ex-health-detail'},['—']):''
				])
			]);
		};
		const speedWanCard=L.bind(function(wan,label,available){const attrs={class:'ex-mini-button','click':L.bind(this.startSpeedtest,this,wan,label)};if(!available)attrs.disabled=true;return E('div',{class:'ex-speedtest-wan'},[E('div',{class:'ex-card-title'},[E('h3',{},[label]),E('button',attrs,['Executar teste'])]),E('div',{id:'ex-speedtest-'+wan+'-result',class:'ex-speedtest-result'},[E('span',{class:'ex-muted'},[available?'Sem resultado nesta sessão.':'SEM CABO'])])]);},this);
		const sortSelect=E('select',{id:'ex-device-sort-key',class:'cbi-input-select ex-device-sort-select','change':L.bind(function(ev){this.setDeviceSort(ev.currentTarget.value);},this)},[E('option',{value:'total'},['Total consumido']),E('option',{value:'now'},['Agora (velocidade)']),E('option',{value:'name'},['Nome do aparelho'])]);sortSelect.value=this.deviceSortKey||'total';
		const deviceSortControls=E('div',{class:'ex-device-sort-controls'},[E('span',{class:'ex-muted ex-device-sort-label'},['Ordenar']),sortSelect,E('button',{id:'ex-device-sort-dir',class:'ex-mini-button','click':L.bind(function(ev){this.toggleDeviceSortDirection(ev.currentTarget);},this)},[this.deviceSortKey==='name'?(this.deviceSortDir==='asc'?'A → Z':'Z → A'):(this.deviceSortDir==='desc'?'Maior primeiro':'Menor primeiro')])]);
		const arkVersion=((this.capabilities.update||{}).current)||'—';
		const irqbalance = this.feature('irqbalance') || {};
		const irqbalanceInput=E('input',{type:'checkbox','aria-label':'Ativar IRQ Balance','change':L.bind(function(ev){const input=ev.currentTarget,desired=!!input.checked;return fs.exec('/usr/sbin/equipe-dashboard-control',['irqbalance-toggle',desired?'1':'0']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar IRQ Balance');self.triggerImmediateRefresh(desired?'IRQ Balance ativado com sucesso!':'IRQ Balance desativado com sucesso!','info');}).catch(function(e){input.checked=!desired;ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)});irqbalanceInput.checked=!!irqbalance.active;irqbalanceInput.disabled=!irqbalance.installed;
		const irqbalanceControl=irqbalance.installed?E('div',{class:'ex-device-switch-control'},[E('strong',{class:'ex-device-switch-state'},[irqbalance.active?'LIGADA':'DESLIGADA']),E('label',{class:'ex-switch'},[irqbalanceInput,E('span',{class:'ex-switch-slider'})])]):E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,'irqbalance')},['Instalar IRQ Balance']);
		const mwanInterfaces=(data.mwan&&data.mwan.interfaces)||{}, mwanRunning=Object.keys(mwanInterfaces).some(function(k){return !!mwanInterfaces[k].running;});
		const speedifyFeature=(this.capabilities.features&&this.capabilities.features.speedify)||{};
		const mwanPaused=String(speedifyFeature.desired_state||'')==='connected'&&!mwanRunning;
		const netCfgValues = values(data.networkConfig);
		const isAutoWanActiveGlobal = !!(netCfgValues.autowan && String(netCfgValues.autowan.enabled) === '1');
		const activeWans=getActiveWanList(data);
		const hasMultipleWans = activeWans.length >= 2;
		const mwanInput=E('input',{id:'ex-mwan-toggle',type:'checkbox','aria-label':'Ativar Multi-WAN','change':L.bind(function(ev){this.toggleMwan3(ev.currentTarget);},this)});
		mwanInput.checked = hasMultipleWans && (isAutoWanActiveGlobal || mwanRunning);
		mwanInput.disabled = !hasMultipleWans || isAutoWanActiveGlobal || mwanPaused;
		if (!hasMultipleWans) {
			mwanInput.title = 'Requer pelo menos 2 conexões WAN ativas (ex: Fibra + Starlink ou Auto-WAN) para ativar o Multi-WAN.';
		} else if (isAutoWanActiveGlobal) {
			mwanInput.title = 'Gerenciado pelo Piloto Automático Auto-WAN. Para controle manual, desative o Auto-WAN.';
		}
		const nextWan=getNextAvailableWan(data);
		const qosWanProfiles=sqmWanProfiles(data), qosWanRows=qosWanProfiles.map(function(profile){return infoRow(profile.label+' limites','ex-qos-wan-'+portDomId(profile.network));});
		const portsInfo=(data.hardwareInfo&&data.hardwareInfo.ports)||{};
		const getPortBadge=function(device,isLan){
			if(!device)return null;
			let p=portsInfo[device];
			const isWanPort = (device==='wan'||device==='wan1'||device==='lan5'||device==='port5'||device==='eth1'||device==='eth0.2');
			if(!p && isWanPort){
				p = portsInfo['eth1'] || portsInfo['port5'] || portsInfo['lan5'] || portsInfo['wan'] || portsInfo['wan1'];
			}
			if(!p){
				const clean=String(device).replace(/@.+/,'');
				if(portsInfo[clean])p=portsInfo[clean];
			}
			const maxSpeed=(p&&p.max_speed)||((device==='eth1'||String(device).indexOf('2.5')>=0)?'2.5G':'1G');
			const cls=maxSpeed==='2.5G'?'speed-2500':'speed-1000';
			return E('span',{class:'ex-port-badge '+cls},[maxSpeed]);
		};
		const wanCards=activeWans.map(L.bind(function(w){
			const id='ex-'+w.domId;
			return E('section',{class:'ex-card ex-wan-card'},[
				E('div',{class:'ex-card-title'},[
					E('div',{style:'display:flex;align-items:center;gap:6px;'},[
						E('h3',{},[w.label]),
						getPortBadge(w.device,false)||''
					]),
					E('span',{id:id+'-status',class:'ex-pill standby'},['—'])
				]),
				infoRow('Modo de conexão',id+'-mode'),
				infoRow('Endereço IPv4',id+'-ip'),
				infoRow('Endereço IPv6',id+'-ipv6'),
				infoRow('Gateway',id+'-gateway'),
				infoRow('Máscara',id+'-mask'),
				infoRow('DNS recebidos',id+'-dns'),
				infoRow('Link físico',id+'-link'),
				E('div', {
					class: 'ex-row ex-row-clickable',
					style: 'cursor:pointer; min-height:40px; user-select:none; -webkit-tap-highlight-color:transparent;',
					title: 'Clique para escolher o servidor de teste de latência (Registro.br, Cloudflare, Google, etc.)',
					click: L.bind(function(){ this.showLatencyTargetModal(); }, this)
				}, [
					E('span', { style: 'display:inline-flex; align-items:center; gap:6px; min-width:0;' }, [
						'Latência',
						E('span', {
							id: id+'-latency-target',
							class: 'ex-latency-badge',
							title: 'Servidor de teste de latência ativo'
						}, [ getPingTargetShortLabel(getPingTargetInfo(data).target, getPingTargetInfo(data).customIp) ])
					]),
					E('strong', { id: id+'-latency' }, [ '—' ])
				]),
				infoRow('Recebido hoje',id+'-rx-day'),
				infoRow('Enviado hoje',id+'-tx-day'),
				infoRow('Sessão atual',id+'-session'),
				infoRow('Tempo online',id+'-uptime'),
				E('div', { class: 'ex-wan-card-actions', style: 'display:flex; gap:6px; margin-top:8px;' }, [
					E('button', {
						class: 'ex-mini-button ex-wan-edit-button',
						style: 'flex:1;',
						click: L.bind(function(){ this.editWan(w.iface); }, this)
					}, [w.isPrimary ? 'Editar internet' : 'Editar porta / internet']),
					((values((data||{}).networkConfig)[w.iface] || {}).proto === 'pppoe' || (w.isPrimary && !((values((data||{}).networkConfig)[w.iface] || {}).proto))) ? E('button', {
						class: 'ex-mini-button ex-wan-log-button',
						style: 'background:rgba(59,130,246,0.12); color:#60a5fa; border:1px solid rgba(59,130,246,0.3); font-weight:600; padding:6px 10px; white-space:nowrap;',
						title: 'Ver histórico e diagnóstico da conexão PPPoE',
						click: L.bind(function(){ this.showPppoeLogsModal(w.iface, w.label); }, this)
					}, ['📜 Logs PPPoE']) : null
				].filter(Boolean))
			]);
		},this));
		const lanPorts=(data.lanPorts&&data.lanPorts.length)?data.lanPorts:lanPortsFromNetwork(data.networkConfig);
		const lanCards=lanPorts.map(L.bind(function(port){
			const id='ex-lan-'+portDomId(port), label=portLabel(port);
			const isPhysicalWanAsLan = (port === 'eth1' || port === 'lan5' || port === 'port5' || port === 'wan' || port === 'eth0.2');
			const actionBtn = isPhysicalWanAsLan ? E('button', {
				class: 'ex-mini-button ex-wan-edit-button',
				click: function() {
					fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-wan-to-lan', '0']).then(function() {
						self.triggerImmediateRefresh('Porta WAN física restaurada para conexão de modem/internet padrão.', 'info');
					});
				}
			}, ['Restaurar como WAN1']) : E('button', {
				class: 'ex-mini-button ex-wan-edit-button',
				click: L.bind(function(){this.editWan(nextWan.iface,port);},this)
			}, ['Usar como '+nextWan.label]);
			return E('section',{class:'ex-card ex-lan-card'},[
				E('div',{class:'ex-card-title'},[
					E('div',{style:'display:flex;align-items:center;gap:6px;'},[
						E('h3',{},[label]),
						getPortBadge(port,true)||''
					]),
					E('span',{id:id+'-status',class:'ex-pill standby'},['—'])
				]),
				infoRow('Velocidade',id+'-speed'),
				infoRow('Modo',id+'-duplex'),
				infoRow('Recebido',id+'-rx'),
				infoRow('Enviado',id+'-tx'),
				actionBtn
			]);
		},this));
		const mwanModeButtons = [];
		if (activeWans.length >= 2) {
			mwanModeButtons.push(modeButton('balanced_devices', '⚖️ Balancear por Aparelho (Recomendado)'));
			mwanModeButtons.push(modeButton('failover', 'Failover (WAN1 principal)'));
			mwanModeButtons.push(modeButton('failover_wan2', 'Failover (WAN2 principal)'));
			mwanModeButtons.push(modeButton('balanced', 'Balancear por Conexão'));
		}
		activeWans.forEach(function(w) {
			mwanModeButtons.push(modeButton(w.domId, 'Só ' + w.label));
		});
		const speedifySection=this.speedifyCard(data), starlinkSection=this._starlinkPanel;
		const allWifiCards = [
			wifiCard('main','Acesso principal',w.main),
			wifiCard('guest','Visitantes com upload limitado',w.guest)
		].concat((w.extras||[]).map(function(e){ return wifiCard(e.id, (e.network === 'guest' ? 'Rede isolada' : 'Rede adicional'), e, true); }));

		const wpsPill = E('span', {
			id: 'ex-wps-status-pill',
			class: 'ex-pill ' + (w.wpsEnabled ? 'online' : 'standby')
		}, [w.wpsEnabled ? 'ATIVO' : 'DESLIGADO']);
		const wpsTitleActions = E('div', { class: 'ex-card-title-actions' }, [
			wpsPill
		]);
		const wpsTitle = E('div', { class: 'ex-card-title' }, [
			E('div', {}, [
				E('span', { class: 'ex-kicker' }, ['CONEXÃO SIMPLIFICADA']),
				E('h3', {}, ['WPS (Wi-Fi Protected Setup)'])
			]),
			wpsTitleActions
		]);
		const wpsBody = E('div', { class: 'ex-card-collapse-body' }, [
			E('div', { class: 'ex-card-collapse-inner' }, [
				E('div', { style: 'margin-bottom: 12px; display: flex; align-items: center;' }, [
					E('button', {
						id: 'ex-wps-pbc-btn',
						class: 'ex-mini-button',
						style: 'font-weight: 750; padding: 8px 16px; min-height: 40px;',
						disabled: !w.wpsEnabled,
						click: L.bind(function(ev){ this.triggerWpsPbc(ev.currentTarget); }, this)
					}, ['🔘 Iniciar Pareamento WPS (2 min)'])
				]),
				E('div', { class: 'ex-channel-mode-control', style: 'margin-top: 8px;' }, [
					E('div', {}, [
						E('strong', {}, ['Pareamento Rápido por Botão (WPS PBC)']),
						E('small', { id: 'ex-wps-summary', class: 'ex-muted' }, [
							w.wpsEnabled
								? 'Ativo • Pareamento rápido por botão (PBC) habilitado nos rádios.'
								: 'Desativado • Conexões exigem senha manualmente.'
						])
					]),
					E('label', { class: 'ex-switch' }, [
						E('input', {
							id: 'ex-wps-toggle',
							type: 'checkbox',
							checked: w.wpsEnabled ? '' : null,
							'aria-label': 'Ativar ou desativar WPS',
							change: L.bind(function(ev){ this.toggleWps(ev.currentTarget); }, this)
						}),
						E('span', { class: 'ex-switch-slider' })
					])
				]),
				E('p', { class: 'ex-muted', style: 'margin: 8px 0 0; line-height: 1.45; font-size: 12.5px;' }, [
					'Permite conectar novos aparelhos (como impressoras Wi-Fi, smart TVs, repetidores ou celulares) sem digitar senha, bastando pressionar o botão acima e o botão no aparelho em até 2 minutos. ',
					E('b', { style: 'color: #10b981;' }, ['Segurança ARK: ']),
					'O modo WPS por PIN vulnerável a invasões permanece permanentemente desativado; apenas o pareamento físico temporário é permitido.'
				])
			])
		]);
		const wpsCard = E('section', { class: 'ex-card ex-wifi-wps-card', style: 'margin-top: 14px;' }, [
			wpsTitle,
			wpsBody
		]);
		const wpsAccordion = setupCardAccordion({
			id: 'wps',
			cardEl: wpsCard,
			titleEl: wpsTitle,
			bodyEl: wpsBody,
			isActive: !!w.wpsEnabled
		});
		wpsTitleActions.appendChild(wpsAccordion.expandBtn);

		const wifiBlock = w.hasRadios ? E('div', { class: 'ex-wifi-block' }, [
			E('div', { class: 'ex-wifi-block-head', style: 'display:flex;align-items:center;justify-content:space-between;margin:22px 0 10px;' }, [
				E('div', {}, [
					E('span', { class: 'ex-kicker' }, ['CONECTIVIDADE SEM FIO']),
					E('h3', { style: 'margin:0;font-size:1.15rem;' }, ['Redes Wi‑Fi'])
				]),
				E('button', { class: 'ex-mini-button ex-wifi-add-btn', 'click': L.bind(this.showAddWifiModal, this) }, ['+ Adicionar Rede Wi‑Fi'])
			]),
			E('div', { class: 'ex-grid ex-grid-2 ex-wifi-grid' }, allWifiCards),
			wpsCard
		]) : E('section', { class: 'ex-card ex-wifi-card ex-center-card', style: 'grid-column: 1 / -1; margin: 18px 0;' }, [
			bigIcon('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'),
			E('strong', { style: 'font-size: 1.05rem; margin-top: 8px;' }, ['Hardware Wi‑Fi não detectado']),
			E('small', { class: 'ex-muted' }, ['Este dispositivo opera como roteador / gateway cabeado. Nenhuma placa de rede sem fio foi encontrada no sistema.'])
		]);

		const root=E('div',{class:'ex-dashboard'},[
			E('section',{class:'ex-hero'+(isGamer?' ex-hero-gamer':'')},[E('div',{},[E('span',{class:'ex-eyebrow'},[heroEyebrow]),E('h2',{},[panelTitle]),E('p',{},[this.board.model||'OpenWrt','  •  ',release,'  •  ARK Router ',arkVersion]),E('div',{id:'ex-speedify-top',class:'ex-hero-speedify standby',style:'display:none'},[E('span',{},['Speedify']),E('strong',{},['—']),E('small',{},['—'])])]),E('div',{class:'ex-hero-status'},[E('span',{id:'ex-global-status',class:'ex-pill standby'},['VERIFICANDO']),E('strong',{id:'ex-clock'},['--:--:--']),E('small',{id:'ex-refresh-summary'},['sessão de 12 horas • atualização a cada 3 segundos']),E('div',{class:'ex-hero-actions'},[gamerButton,opModeButton,languageButton,E('button',{class:'ex-hero-feature-button ex-hero-setup-button','click':L.bind(this.showEzSetup,this)},['Ark - Setup']),E('button',{class:'ex-hero-feature-button','click':L.bind(this.showFeatureCenter,this)},['Recursos'])])])]),
			E('section',{class:'ex-card ex-health-strip'},[
				E('div',{class:'ex-health-head'},[
					E('div',{},[
						E('span',{class:'ex-kicker'},['SAÚDE DO ROTEADOR']),
						E('small',{},['Ligado há ',E('strong',{id:'ex-uptime'},['—'])])
					]),
					E('div',{style:'display:flex;align-items:center;gap:10px;'},[
						E('button',{class:'ex-health-specs-btn','click':L.bind(this.showHardwareModal,this),title:'Ver especificações técnicas completas do hardware'},['🔍 Especificações']),
						E('span',{id:'ex-health-status',class:'ex-pill standby'},['VERIFICANDO'])
					])
				]),
				E('div',{class:'ex-health-items'},[
					healthItem('⚡','Processador','ex-cpu','ex-cpu-bar','#10b981','ex-cpu-detail',L.bind(this.showHardwareModal,this)),
					healthItem('℃','Temperatura','ex-temperature',null,'#f59e0b','ex-temperature-detail',L.bind(this.showThermalModal,this)),
					healthItem('▦','Memória','ex-memory','ex-memory-bar','#3b82f6','ex-memory-detail',L.bind(this.showHardwareModal,this)),
					healthItem('▣','Armazenamento','ex-storage','ex-storage-bar','#8b5cf6','ex-storage-detail',L.bind(this.showHardwareModal,this)),
					healthItem('⌁','Carga','ex-load',null,'#6366f1','ex-load-detail')
				])
			]),
			this.systemPerfCard(data),
			E('div',{class:'ex-grid ex-grid-2'},[metricCard('↓','Download agora','ex-download','ex-down-total','#3b82f6'),metricCard('↑','Upload agora','ex-upload','ex-up-total','#a855f7')]),
			E('div',{class:'ex-grid ex-grid-2 ex-history-grid'},[historyCard('down','Download ao longo do dia','#3b82f6'),historyCard('up','Upload ao longo do dia','#a855f7')]),
			E('p',{id:'ex-history-samples',class:'ex-history-caption'},['A primeira amostra aparecerá em até 1 minuto']),
			(function(){
				const netCfg = values(data.networkConfig);
				const isAutoWanActive = !!(netCfg.autowan && String(netCfg.autowan.enabled) === '1');
				const isWanToLanActive = !!(netCfg.autowan && String(netCfg.autowan.wan_to_lan) === '1');

				const wanToLanSummaryEl = E('small', { id: 'ex-autowan-wan-to-lan-summary', class: 'ex-muted', style: 'display:block; margin-top:2px;' }, [
					isWanToLanActive
						? 'Ativo • A porta WAN física opera como rede local (LAN) com detecção automática de internet.'
						: 'Desativado • A porta WAN física opera exclusivamente como entrada de internet principal.'
				]);
				const wanToLanAttrs = { id: 'ex-autowan-wan-to-lan-toggle', type: 'checkbox', 'aria-label': 'Converter porta WAN em LAN' };
				if (isWanToLanActive) wanToLanAttrs.checked = '';
				const wanToLanInput = E('input', wanToLanAttrs);

				const toggleWanToLan = function(chk) {
					if (!chk.checked) {
						chk.disabled = true;
						wanToLanSummaryEl.textContent = 'Restaurando porta WAN para modo padrão…';
						fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-wan-to-lan', '0'])
						.then(function(r) {
							chk.disabled = false;
							chk.checked = false;
							wanToLanSummaryEl.textContent = 'Desativado • A porta WAN física opera exclusivamente como entrada de internet principal.';
							self.triggerImmediateRefresh('Porta WAN física restaurada para conexão de modem/internet padrão.', 'info');
						}).catch(function(e) {
							chk.disabled = false;
							chk.checked = true;
							ui.addNotification(null, E('p', {}, [e.message]), 'danger');
						});
						return;
					}

					chk.checked = false;
					chk.disabled = true;

					fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-can-convert-wan'])
					.then(function(res) {
						chk.disabled = false;
						let diag = {};
						try { diag = JSON.parse(res.stdout || '{}'); } catch(e){}

						const warningItems = [
							E('li', {}, ['A porta WAN física será adicionada à rede local (LAN), podendo ser usada para conectar computadores, TVs ou switches.']),
							E('li', {}, ['O Piloto Automático (Auto-WAN) passará a monitorar a porta WAN: se um cabo com sinal de internet (DHCP) for inserido nela, ela voltará a ser WAN dinamicamente.']),
							E('li', {}, ['Se a sua internet principal estiver nesta porta e for via DHCP, o Auto-WAN continuará detectando-a. Caso use PPPoE, configure-a como WAN antes de conectar.'])
						];

						if (diag.carrier && !diag.has_other_wan) {
							warningItems.unshift(E('li', { style: 'color: #f59e0b; font-weight: bold;' }, [
								'⚠️ Detectamos cabo conectado na porta WAN no momento. Certifique-se de que possui acesso via Wi-Fi ou outra porta LAN.'
							]));
						}

						const modalBody = [
							E('div', { class: 'alert-message warning', style: 'margin-bottom: 14px; font-size: 12.5px; line-height: 1.55;' }, [
								E('strong', { style: 'display:block; margin-bottom:8px; font-size:13.5px;' }, ['Converter porta WAN física em LAN (Auto-Sensing)?']),
								E('ul', { style: 'margin: 0; padding-left: 18px;' }, warningItems)
							]),
							E('div', { style: 'display:flex; justify-content:flex-end; gap:10px; margin-top:16px;' }, [
								E('button', {
									class: 'btn cbi-button cbi-button-neutral',
									'click': function() { ui.hideModal(); }
								}, ['Cancelar']),
								E('button', {
									class: 'btn cbi-button cbi-button-positive',
									style: 'font-weight:bold;',
									'click': function() {
										ui.hideModal();
										chk.disabled = true;
										wanToLanSummaryEl.textContent = 'Convertendo porta WAN em LAN…';
										fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-wan-to-lan', '1'])
										.then(function(r) {
											chk.disabled = false;
											chk.checked = true;
											wanToLanSummaryEl.textContent = 'Ativo • A porta WAN física opera como rede local (LAN) com detecção automática de internet.';
											self.triggerImmediateRefresh('Porta WAN física convertida com sucesso em rede local (LAN)!', 'success');
										}).catch(function(e) {
											chk.disabled = false;
											chk.checked = false;
											ui.addNotification(null, E('p', {}, [e.message]), 'danger');
										});
									}
								}, ['Confirmar e Converter'])
							])
						];

						ui.showModal('Converter porta WAN em LAN?', modalBody);
					}).catch(function(e) {
						chk.disabled = false;
						ui.addNotification(null, E('p', {}, ['Falha ao verificar status da porta WAN: ' + e.message]), 'danger');
					});
				};

				wanToLanInput.addEventListener('change', function(ev) {
					toggleWanToLan(ev.currentTarget);
				});

				const toggleAutoWan = function(chk, summaryEl, pillEl) {
					if (!chk.checked) {
						chk.disabled = true;
						if (summaryEl) summaryEl.textContent = 'Desativando Auto-WAN…';
						fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-toggle', '0'])
						.then(function(r) {
							chk.disabled = false;
							if (summaryEl) summaryEl.textContent = 'Desativado • As portas físicas permanecem fixas conforme a topologia padrão.';
							if (pillEl) { pillEl.className = 'ex-pill standby'; pillEl.textContent = 'STANDBY'; }
							if (policyBox) policyBox.style.display = 'none';
							if (wanToLanInput) wanToLanInput.checked = false;
							wanToLanSummaryEl.textContent = 'Desativado • A porta WAN física opera exclusivamente como entrada de internet principal.';
							const mwanToggle = document.getElementById('ex-mwan-toggle');
							if (mwanToggle) { mwanToggle.disabled = false; mwanToggle.title = ''; }
							const mwanDesc = document.getElementById('ex-mwan-toggle-desc');
							if (mwanDesc) mwanDesc.textContent = 'Liga failover/balanceamento sem alterar o modo escolhido.';
							const mwanState = document.getElementById('ex-mwan-toggle-state');
							if (mwanState) mwanState.textContent = (mwanToggle && mwanToggle.checked) ? 'LIGADO' : 'DESLIGADO';
							self.triggerImmediateRefresh('Piloto Automático (Auto-WAN) desativado. Porta WAN restaurada e Failover garantido.', 'info');
						}).catch(function(e) {
							chk.disabled = false;
							chk.checked = true;
							ui.addNotification(null, E('p', {}, [e.message]), 'danger');
						});
						return;
					}

					chk.checked = false;

					const modalBody = [
						E('div', { class: 'alert-message warning', style: 'margin-bottom: 14px; font-size: 12.5px; line-height: 1.55;' }, [
							E('strong', { style: 'display:block; margin-bottom:8px; font-size:13.5px;' }, ['⚠️ Importante: Entenda como o Auto-WAN opera']),
							E('ul', { style: 'margin: 0; padding-left: 18px;' }, [
								E('li', {}, ['Ao ativar, o roteador passará a monitorar continuamente a inserção de novos cabos nas portas de rede livres.']),
								E('li', {}, ['Ao detectar um cabo recém-espetado, ele envia uma sondagem DHCP. Se receber resposta de internet/modem, a porta será promovida automaticamente para WAN (Load Balance ou Failover).']),
								E('li', {}, ['Se for um PC, TV ou console de jogos (sem DHCP upstream), a porta continuará funcionando normalmente na rede local (LAN).']),
								E('li', {}, ['Atenção a modems em Modo Bridge (PPPoE): eles não fornecem IP por DHCP. Se sua internet exigir usuário e senha, configure a WAN manualmente na barra abaixo.']),
								E('li', {}, ['Garantia Salva-Vidas (Fail-Safe Inteligente): Todas as portas (inclusive a Porta 1) são inteligentes e podem virar WAN. Porém, se o Wi-Fi estiver desligado e nenhuma outra porta tiver conexão local ativa, o sistema protege a última porta conectada para garantir que você nunca perca o acesso ao painel.'])
							])
						]),
						E('div', { style: 'display:flex; justify-content:flex-end; gap:10px; margin-top:16px;' }, [
							E('button', {
								class: 'btn cbi-button cbi-button-neutral',
								'click': function() { ui.hideModal(); }
							}, ['Cancelar']),
							E('button', {
								class: 'btn cbi-button cbi-button-positive',
								style: 'font-weight:bold;',
								'click': function() {
									ui.hideModal();
									chk.disabled = true;
									if (summaryEl) summaryEl.textContent = 'Ativando Auto-WAN…';
									fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-toggle', '1'])
									.then(function(r) {
										chk.disabled = false;
										chk.checked = true;
										if (summaryEl) summaryEl.textContent = 'Ativo • Portas vagas monitoradas para detecção inteligente de novas conexões.';
										if (pillEl) { pillEl.className = 'ex-pill online'; pillEl.textContent = 'VIGILÂNCIA ATIVA'; }
										if (policyBox) policyBox.style.display = 'block';
										const mwanToggle = document.getElementById('ex-mwan-toggle');
										if (mwanToggle) {
											mwanToggle.checked = true;
											mwanToggle.disabled = true;
											mwanToggle.title = 'Gerenciado pelo Piloto Automático Auto-WAN. Para controle manual, desative o Auto-WAN.';
										}
										const mwanDesc = document.getElementById('ex-mwan-toggle-desc');
										if (mwanDesc) mwanDesc.textContent = 'Gerenciado dinamicamente pelo Piloto Automático de Portas conforme cabos de internet são inseridos ou removidos.';
										const mwanState = document.getElementById('ex-mwan-toggle-state');
										if (mwanState) mwanState.textContent = 'PILOTO AUTOMÁTICO';
										setPill('ex-mwan-status', 'online', 'PILOTO AUTOMÁTICO');
										ui.addNotification(null, E('p', {}, ['Piloto Automático (Auto-WAN) ativado com sucesso!']), 'success');
									}).catch(function(e) {
										chk.disabled = false;
										chk.checked = false;
										ui.addNotification(null, E('p', {}, [e.message]), 'danger');
									});
								}
							}, ['Entendi, Ativar Auto-WAN'])
						])
					];

					ui.showModal('Ativar Piloto Automático de Portas (Auto-WAN)?', modalBody);
				};

				const currentPolicy = (netCfg.autowan && netCfg.autowan.policy) || 'balanced';
				const setAutoWanPolicy = function(pol) {
					const btnBal = document.getElementById('ex-autowan-pol-balanced');
					const btnFail = document.getElementById('ex-autowan-pol-failover');
					if (btnBal) btnBal.disabled = true;
					if (btnFail) btnFail.disabled = true;
					fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-policy-set', pol])
					.then(function(r) {
						if (btnBal) {
							btnBal.disabled = false;
							btnBal.className = 'btn cbi-button ' + (pol === 'balanced' ? 'cbi-button-positive' : 'cbi-button-neutral');
						}
						if (btnFail) {
							btnFail.disabled = false;
							btnFail.className = 'btn cbi-button ' + (pol === 'failover' ? 'cbi-button-positive' : 'cbi-button-neutral');
						}
						text('ex-mwan-mode', pol === 'balanced' ? 'Balanceamento Inteligente (Auto-WAN)' : 'Failover Automático (Auto-WAN)');
						ui.addNotification(null, E('p', {}, [
							pol === 'balanced'
								? 'Multi-WAN configurado para Balanceamento (tráfego distribuído entre conexões).'
								: 'Multi-WAN configurado para Failover (WAN1 prioritária e as demais como reserva).'
						]), 'info');
					}).catch(function(e) {
						if (btnBal) btnBal.disabled = false;
						if (btnFail) btnFail.disabled = false;
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					});
				};

				const pillEl = E('span',{class:'ex-pill ' + (isAutoWanActive ? 'online' : 'standby')},[isAutoWanActive ? 'VIGILÂNCIA ATIVA' : 'STANDBY']);
				const summaryEl = E('small',{id:'ex-autowan-mode-summary',class:'ex-muted'},[
					isAutoWanActive
						? 'Ativo • Portas vagas monitoradas para detecção inteligente de novas conexões.'
						: 'Desativado • As portas físicas permanecem fixas conforme a topologia padrão.'
				]);

				const policyBox = E('div', {
					id: 'ex-autowan-policy-box',
					style: 'display:' + (isAutoWanActive ? 'block' : 'none') + '; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.08);'
				}, [
					E('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;' }, [
						E('div', {}, [
							E('strong', { style: 'font-size:13px;' }, ['Comportamento Multi-WAN automático']),
							E('small', { class: 'ex-muted', style: 'display:block;' }, ['Quando houver 2 ou mais conexões de internet ativas detectadas.'])
						])
					]),
					E('div', { style: 'display:flex; gap:10px; flex-wrap:wrap;' }, [
						E('button', {
							id: 'ex-autowan-pol-balanced',
							type: 'button',
							class: 'btn cbi-button ' + (currentPolicy === 'balanced' ? 'cbi-button-positive' : 'cbi-button-neutral'),
							style: 'flex:1; min-width:160px; font-weight:600;',
							click: function() { setAutoWanPolicy('balanced'); }
						}, ['⚡ Balancear Carga (Soma/Distribuição)']),
						E('button', {
							id: 'ex-autowan-pol-failover',
							type: 'button',
							class: 'btn cbi-button ' + (currentPolicy === 'failover' ? 'cbi-button-positive' : 'cbi-button-neutral'),
							style: 'flex:1; min-width:160px; font-weight:600;',
							click: function() { setAutoWanPolicy('failover'); }
						}, ['🛡️ Failover Inteligente (Backup)'])
					]),
					E('div', {
						class: 'ex-channel-mode-control',
						style: 'margin-top: 16px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06);'
					}, [
						E('div', {}, [
							E('strong', {}, ['Converter porta WAN em LAN (Auto-Sensing Total)']),
							wanToLanSummaryEl
						]),
						E('label', { class: 'ex-switch' }, [
							wanToLanInput,
							E('span', { class: 'ex-switch-slider' })
						])
					])
				]);

				const inpAttrs = { id:'ex-autowan-toggle', type:'checkbox', 'aria-label':'Piloto Automático Auto-WAN' };
				if (isAutoWanActive) inpAttrs.checked = '';
				const chkInput = E('input', inpAttrs);
				chkInput.addEventListener('change', function(ev) {
					toggleAutoWan(ev.currentTarget, summaryEl, pillEl);
				});

				return E('section',{class:'ex-card ex-autowan-card', style:'margin-bottom: 20px;'},[
					E('div',{class:'ex-card-title'},[
						E('div',{},[
							E('span',{class:'ex-kicker'},['CONECTIVIDADE FÍSICA']),
							E('h3',{},['Portas e Auto-WAN'])
						]),
						pillEl
					]),
					E('p',{class:'ex-muted', style:'margin: 6px 0 12px; line-height: 1.45; font-size: 13px;'},[
						'O sistema analisa os cabos conectados nas portas Ethernet. Se uma porta receber sinal de internet/modem (DHCP), ela é automaticamente configurada como WAN adicional para Multi-WAN. Se for um computador, videogame ou TV, opera normalmente como rede local (LAN).'
					]),
					E('div',{class:'ex-channel-mode-control'},[
						E('div',{},[
							E('strong',{},['Piloto Automático de Portas (Auto-WAN)']),
							summaryEl
						]),
						E('label',{class:'ex-switch'},[
							chkInput,
							E('span',{class:'ex-switch-slider'})
						])
					]),
					policyBox
				]);
			})(),
			starlinkSection || '',
			isSatelliteOrAp(data) ? E('div', {
				class: 'alert-message info',
				style: 'margin-bottom: 14px; display: flex; align-items: center; gap: 12px; border-left: 4px solid var(--ex-primary);'
			}, [
				E('span', { style: 'font-size: 22px;' }, ['🛡️']),
				E('div', {}, [
					E('strong', { style: 'display: block; font-size: 13.5px; margin-bottom: 2px;' }, ['Modo Satélite / Ponto de Acesso']),
					E('span', { class: 'ex-muted', style: 'font-size: 12px; line-height: 1.4;' }, [
						'Este nó opera como extensor em ponte transparente. O tráfego de saída, Multi-WAN e controle de Bufferbloat (SQM) são centralizados no Roteador Mestre.'
					])
				])
			]) : '',
			E('div',{class:'ex-grid ex-grid-2'},wanCards),
			(function(){
				const connectedWansInitial = activeWans.filter(function(w){
					const live = iface(data.interfaces, w.iface);
					return live && live.up;
				});
				let initialMwanModeLabel = 'Failover WAN1 → WAN2';
				let initialMwanPillClass = mwanRunning ? 'online' : (mwanPaused ? 'standby' : 'offline');
				let initialMwanPillText = mwanPaused ? 'PAUSADO' : (mwanRunning ? 'ATIVO' : 'DESLIGADO');
				let initialMwanToggleState = mwanPaused ? 'PAUSADO PELO SPEEDIFY' : (mwanRunning ? 'LIGADO' : 'DESLIGADO');
				let initialMwanToggleDesc = mwanPaused ? 'Pausado automaticamente enquanto o Speedify controla as rotas.' : 'Liga failover/balanceamento sem alterar o modo escolhido.';

				const isSatNode = isSatelliteOrAp(data);
				if (isSatNode) {
					initialMwanModeLabel = 'Modo Satélite / Ponto de Acesso (Bridge)';
					initialMwanPillClass = 'standby';
					initialMwanPillText = 'MESTRE GERENCIA';
					initialMwanToggleState = 'INATIVO NO SATÉLITE';
					initialMwanToggleDesc = 'Este roteador atua como extensor de rede (bridge transparente). O balanceamento e failover de internet operam exclusivamente no Roteador Mestre.';
					mwanInput.disabled = true;
					mwanInput.checked = false;
					mwanInput.title = 'Multi-WAN desativado em nós Satélites e Pontos de Acesso.';
				} else if (!hasMultipleWans) {
					initialMwanModeLabel = 'Link Único (Single-WAN)';
					initialMwanPillClass = 'standby';
					initialMwanPillText = 'DESATIVADO';
					initialMwanToggleState = 'INDISPONÍVEL (1 WAN)';
					initialMwanToggleDesc = 'O balanceamento e failover requerem pelo menos 2 conexões WAN ativas para operar. Com apenas 1 link, todo o tráfego flui normalmente por ele.';
				} else if (isAutoWanActiveGlobal) {
					if (connectedWansInitial.length >= 2) {
						initialMwanModeLabel = ((netCfgValues.autowan && netCfgValues.autowan.policy === 'failover') ? 'Failover Automático (Auto-WAN)' : 'Balanceamento Inteligente (Auto-WAN)') + ' • ' + connectedWansInitial.length + ' Links';
						initialMwanPillClass = mwanRunning ? 'online' : 'standby';
						initialMwanPillText = mwanRunning ? ('MULTI-WAN ATIVO (' + connectedWansInitial.length + ')') : 'SINCRONIZANDO';
						initialMwanToggleState = mwanRunning ? ('ATIVO (' + connectedWansInitial.length + ' LINKS)') : 'SINCRONIZANDO';
						initialMwanToggleDesc = 'Multi-WAN em operação distribuindo tráfego dinamicamente entre as portas conectadas (' + connectedWansInitial.map(function(w){return w.label;}).join(', ') + ').';
					} else if (connectedWansInitial.length === 1) {
						initialMwanModeLabel = 'Modo Single-WAN (' + connectedWansInitial[0].label + ' via DHCP)';
						initialMwanPillClass = 'standby';
						initialMwanPillText = 'SINGLE-WAN';
						initialMwanToggleState = 'STANDBY (1 LINK)';
						initialMwanToggleDesc = 'Operando com 1 cabo de internet (' + connectedWansInitial[0].label + '). Balanceamento pausado para economizar RAM/CPU. Ativará automaticamente ao plugar um 2º cabo.';
					} else {
						initialMwanModeLabel = 'Piloto Automático (Auto-WAN)';
						initialMwanPillClass = 'offline';
						initialMwanPillText = 'SEM CABO';
						initialMwanToggleState = 'AGUARDANDO CABO';
						initialMwanToggleDesc = 'Nenhum cabo de modem detectado com sinal DHCP. Conecte um cabo de internet em qualquer porta para iniciar.';
					}
				}

				const isMwanActive = !isSatNode && hasMultipleWans && (initialMwanPillClass === 'online' || mwanRunning);
				const mwanPill = E('span',{id:'ex-mwan-status',class:'ex-pill ' + initialMwanPillClass},[initialMwanPillText]);
				const mwanTitleActions = E('div', { class: 'ex-card-title-actions' }, [
					mwanPill
				]);
				const mwanTitle = E('div',{class:'ex-card-title'},[
					E('div',{},[
						E('span',{class:'ex-kicker'},['MULTI‑WAN']),
						E('h3',{},['Modo atual: ',E('span',{id:'ex-mwan-mode'},[initialMwanModeLabel])])
					]),
					mwanTitleActions
				]);
				const mwanBody = E('div', { class: 'ex-card-collapse-body' }, [
					E('div', { class: 'ex-card-collapse-inner' }, [
						isSatNode ? E('div', { class: 'alert-message warning', style: 'margin-bottom: 12px; font-size: 12px; line-height: 1.45;' }, [
							E('strong', { style: 'display: block; margin-bottom: 3px;' }, ['🛡️ Multi-WAN Gerenciado no Mestre']),
							'O balanceamento e failover de conexões de internet pertencem ao Roteador Mestre (Gateway). Em nós satélites, todo o tráfego é encaminhado diretamente via enlace local.'
						]) : '',
						E('div',{class:'ex-qos-toggle-row ex-mwan-toggle-row'},[
							E('div',{},[
								E('strong',{},['Serviço Multi-WAN']),
								E('small',{id:'ex-mwan-toggle-desc',class:'ex-muted'},[initialMwanToggleDesc])
							]),
							E('div',{class:'ex-device-switch-control'},[
								E('strong',{id:'ex-mwan-toggle-state',class:'ex-device-switch-state'},[initialMwanToggleState]),
								E('label',{class:'ex-switch'},[mwanInput,E('span',{class:'ex-switch-slider'})])
							])
						]),
						E('details',{class:'ex-mwan-editor'},[
							E('summary',{},['Editar modo do Multi‑WAN']),
							E('div',{class:'ex-mwan-editor-body'},[
								E('p',{class:'ex-muted'},[activeWans.length>=2?'Escolha um modo abaixo. Depois do clique, ainda será necessário confirmar antes que qualquer alteração seja aplicada.':'Quando houver 2 ou mais conexões WAN ativas, você poderá alternar entre Failover e Balanceamento.']),
								E('div',{class:'ex-mode-grid'},mwanModeButtons),
								E('small',{class:'ex-muted'},['Balanceamento distribui conexões entre os links; não soma a velocidade de um único envio.'])
							])
						]),
						self.renderMwanRulesSection(data)
					])
				]);
				const mwanCard = E('section',{class:'ex-card ex-mwan-control'},[
					mwanTitle,
					mwanBody
				]);
				const mwanAccordion = setupCardAccordion({
					id: 'multiwan',
					cardEl: mwanCard,
					titleEl: mwanTitle,
					bodyEl: mwanBody,
					isActive: isMwanActive
				});
				mwanTitleActions.appendChild(mwanAccordion.expandBtn);
				return mwanCard;
			})(),
			(function(){
				const isSatNode = isSatelliteOrAp(data);
				const isSqmActive = !isSatNode && qosWanProfiles.some(function(profile){
					return !!(data.sqm && data.sqm[profile.section] && data.sqm[profile.section].enabled === '1');
				});
				const sqmPill = E('span',{id:'ex-qos-status',class:'ex-pill ' + (isSatNode ? 'standby' : (isSqmActive ? 'online' : 'standby'))},[isSatNode ? 'MESTRE GERENCIA' : (isSqmActive ? 'ATIVO' : 'DESLIGADO')]);
				const sqmTitleActions = E('div', { class: 'ex-card-title-actions' }, [
					sqmPill
				]);
				const sqmTitle = E('div',{class:'ex-card-title'},[
					E('div',{},[E('span',{class:'ex-kicker'},['CONTROLE DE FILAS']),E('h3',{},['CAKE / SQM'])]),
					sqmTitleActions
				]);
				const sqmToggleInput = E('input',{id:'ex-qos-toggle',type:'checkbox','change':L.bind(function(ev){self.toggleSqm(ev.currentTarget);},self)});
				if (isSatNode) {
					sqmToggleInput.disabled = true;
					sqmToggleInput.checked = false;
					sqmToggleInput.title = 'SQM / CAKE é exclusivo do Roteador Mestre em nós Satélite / Ponto de Acesso.';
				}
				const sqmBody = E('div', { class: 'ex-card-collapse-body' }, [
					E('div', { class: 'ex-card-collapse-inner' }, [
						isSatNode ? E('div', { class: 'alert-message warning', style: 'margin-bottom: 12px; font-size: 12px; line-height: 1.45;' }, [
							E('strong', { style: 'display: block; margin-bottom: 3px;' }, ['🛡️ Fila Exclusiva do Roteador Mestre']),
							'O controle de Bufferbloat (SQM / CAKE) atua exclusivamente na porta de internet (WAN) do Roteador Mestre (Gateway). Em nós satélites, todo o tráfego passa em ponte direta (L2) para não limitar nem degradar a velocidade local do Wi-Fi.'
						]) : '',
						E('div',{class:'ex-qos-toggle-row'},[
							E('div',{},[E('strong',{},['SQM / CAKE']),E('small',{class:'ex-muted'},[isSatNode ? 'Desativado e gerenciado centralmente pelo Roteador Mestre' : 'Liga ou desliga as filas configuradas'])]),
							E('div',{class:'ex-device-switch-control'},[
								E('strong',{id:'ex-qos-toggle-state',class:'ex-device-switch-state'},[isSatNode ? 'MESTRE GERENCIA' : '—']),
								E('label',{class:'ex-switch'},[sqmToggleInput,E('span',{class:'ex-switch-slider'})])
							])
						]),
						E('p',{class:'ex-muted',style:'margin:6px 0 10px;line-height:1.45;'},[
							'O CAKE (Smart Queue Management) combate o bufferbloat, gerencia a latência em tempo real e impede que downloads ou vídeos pesados aumentem o ping de jogos e travem chamadas de voz de toda a rede.'
						]),
						E('div',{class:'ex-grid ex-grid-3 ex-qos-grid'},qosWanRows.concat([infoRow('Rede visitante','ex-qos-guest'),infoRow('DNS do roteador','ex-dns')])),
						E('div',{class:'ex-grid ex-grid-2',style:'margin-top:14px;gap:12px;'},[
							E('button',{class:'ex-button ex-qos-edit-button',style:'margin-top:0;','click':L.bind(function(){try{self.editSqmLimits();}catch(e){ui.addNotification(null,E('p',{},[e.message||String(e)]),'danger');}},self)},['Editar limites']),
							E('button',{class:'ex-button',style:'margin-top:0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.1);font-weight:650;cursor:pointer;','click':L.bind(self.openFastCom,self)},['🎬 Testar velocidade da internet'])
						])
					])
				]);
				const sqmCard = E('section',{class:'ex-card ex-qos-card', id:'ex-qos-section'},[
					sqmTitle,
					sqmBody
				]);
				const sqmAccordion = setupCardAccordion({
					id: 'sqm',
					cardEl: sqmCard,
					titleEl: sqmTitle,
					bodyEl: sqmBody,
					isActive: isSqmActive
				});
				sqmTitleActions.appendChild(sqmAccordion.expandBtn);
				return sqmCard;
			})(),
			E('section',{class:'ex-card ex-lan-config-card'},[
				E('div',{class:'ex-card-title'},[
					E('div',{},[
						E('span',{class:'ex-kicker'},['REDE PRINCIPAL']),
						E('h3',{},['LAN / DHCP'])
					]),
					E('div',{style:'display:flex;align-items:center;gap:8px;flex-wrap:wrap;'},[
						E('button',{
							class:'ex-mini-button btn-ipv6',
							title:'Alternar modo IPv6 (Pilha Dupla, Seletivo por MAC, Cascata NDP Relay ou IPv4)',
							click:L.bind(function(){this.showIpv6Modal();},this)
						},['🌐 Ajustes IPv6']),
						E('button',{class:'ex-mini-button',click:L.bind(function(){this.editLan();},this)},['Editar IP & DHCP'])
					])
				]),
				E('div',{class:'ex-grid ex-grid-3 ex-qos-grid'},[
					infoRow('IP do roteador','ex-lan-ip'),
					infoRow('Faixa DHCP','ex-lan-dhcp'),
					infoRow('Máscara','ex-lan-mask'),
					infoRow('DNS enviado','ex-lan-dns'),
					E('div', {
						class: 'ex-row ex-row-clickable',
						style: 'cursor:pointer;',
						title: 'Clique para alternar modos IPv6 (Pilha Dupla, Seletivo por MAC, Cascata ou IPv4 Puro)',
						click: L.bind(function(){ this.showIpv6Modal(); }, this)
					}, [
						E('span', {}, ['Modo IPv6']),
						E('strong', { id: 'ex-lan-ipv6', style: 'color:#c084fc;font-weight:700;' }, ['—'])
					]),
					infoRow('Prefixo IPv6 (PD)', 'ex-lan-ipv6-prefix')
				]),
				E('p',{class:'ex-muted'},['Use para trocar entre redes 192.168.x.x, 10.0.x.x ou gerenciar a distribuição de IP, DNS e o protocolo IPv6.'])
			]),
			this.dmzCard(),
			E('div',{class:'ex-lan-block'},[E('div',{class:'ex-lan-title'},[E('div',{},[E('span',{class:'ex-kicker'},['PORTAS CABEADAS']),E('h3',{},['LAN disponíveis'])]),E('small',{class:'ex-muted'},['Portas em modo LAN aparecem aqui; ao converter uma porta em '+nextWan.label+', ela sai desta lista e vira uma nova conexão de internet.'])]),E('div',{class:'ex-grid ex-grid-2'},lanCards.length?lanCards:[E('section',{class:'ex-card ex-lan-card ex-center-card'},[E('strong',{},['Nenhuma porta LAN disponível']),E('small',{class:'ex-muted'},['Todas as portas cabeadas livres estão em uso como WAN ou não foram detectadas.'])])])]),
			wifiBlock,
			E('div',{class:'ex-grid ex-grid-2',style:'margin:10px 0 16px;'},[
				E('section',{class:'ex-card ex-center-card'},[bigIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1.2" fill="currentColor"/></svg>'),E('span',{class:'ex-label'},[w.main.ssid||'Rede principal']),E('strong',{id:'ex-main-clients',class:'ex-number'},['0']),E('small',{id:'ex-main-wifi',class:'ex-muted'},['0 no Wi-Fi'])]),
				E('section',{class:'ex-card ex-center-card'},[bigIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'),E('span',{class:'ex-label'},[w.guest.ssid||'Visitantes']),E('strong',{id:'ex-guest-clients',class:'ex-number'},['0']),E('small',{id:'ex-guest-wifi',class:'ex-muted'},['0 no Wi-Fi'])])
			]),
			(function(){
				const isWifiEnvActive = !!(w.hasRadios && (w.main.ssid || (w.r2g && !w.r2g.disabled) || (w.r5g && !w.r5g.disabled)));
				const wifiEnvPill = E('span', {
					id: 'ex-wifi-env-status',
					class: 'ex-pill ' + (isWifiEnvActive ? 'online' : 'standby')
				}, [isWifiEnvActive ? 'ATIVO' : 'DESLIGADO']);
				const wifiEnvTitleActions = E('div', { class: 'ex-card-title-actions' }, [
					wifiEnvPill
				]);
				const wifiEnvTitle = E('div',{class:'ex-card-title'},[
					E('div',{},[
						E('span',{class:'ex-kicker'},['AMBIENTE WI‑FI']),
						E('h3',{},['Canais e interferência'])
					]),
					wifiEnvTitleActions
				]);
				const wifiEnvBody = E('div', { class: 'ex-card-collapse-body' }, [
					E('div', { class: 'ex-card-collapse-inner' }, [
						E('div', { style: 'display:flex; justify-content:flex-end; margin-bottom:12px;' }, [
							E('button',{class:'ex-button ex-inline-button','click':L.bind(function(ev){self.analyzeChannels(ev.currentTarget);},self)},['Analisar canais agora'])
						]),
						E('div',{class:'ex-country-control'},[
							E('div',{},[
								E('span',{class:'ex-label'},['PAÍS / DOMÍNIO REGULATÓRIO']),
								E('strong',{id:'ex-country-current'},['—'])
							]),
							E('button',{class:'ex-mini-button','click':L.bind(function(){self.changeCountry();},self)},['Alterar país'])
						]),
						E('div',{class:'ex-channel-mode-control'},[
							E('div',{},[
								E('strong',{},['Seleção automática inteligente de canais']),
								E('small',{id:'ex-channel-mode-summary',class:'ex-muted'},['Verificando…'])
							]),
							E('label',{class:'ex-switch'},[
								E('input',{id:'ex-channel-auto-toggle',type:'checkbox','aria-label':translateText('Seleção automática inteligente de canais'),'change':L.bind(function(ev){self.toggleAutoChannels(ev.currentTarget);},self)}),
								E('span',{class:'ex-switch-slider'})
							])
						]),
						E('div',{class:'ex-channel-mode-control'},[
							E('div',{},[
								E('strong',{},['Modo Estabilidade Casa Inteligente / Alexas (2,4 GHz)']),
								E('small',{id:'ex-iot-mode-summary',class:'ex-muted'},[
									(String((w.r2g && w.r2g.iot_stability) || '') === '1' || (String((w.r2g && w.r2g.iot_stability) || '') !== '0' && !((w.r2g && w.r2g.legacy_rates) === '0') && !((w.r2g && w.r2g.basic_rate))))
										? 'Ativo • Proteção anti-desconexão (disassoc_low_ack=0), DTIM sincronizado e rota estável AWS IoT.'
										: 'Desativado • Configuração padrão do OpenWrt.'
								])
							]),
							E('label',{class:'ex-switch'},[
								E('input',{
									id:'ex-iot-toggle',
									type:'checkbox',
									checked: (String((w.r2g && w.r2g.iot_stability) || '') === '1' || (String((w.r2g && w.r2g.iot_stability) || '') !== '0' && !((w.r2g && w.r2g.legacy_rates) === '0') && !((w.r2g && w.r2g.basic_rate)))) ? '' : null,
									'aria-label':'Modo Estabilidade Casa Inteligente Alexas',
									'change': L.bind(function(ev){
										const chk = ev.currentTarget;
										const enable = chk.checked;
										chk.disabled = true;
										const summary = document.getElementById('ex-iot-mode-summary');
										if (summary) summary.textContent = 'Aplicando alteração…';
										fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-iot-optimize', enable ? '1' : '0'])
										.then(L.bind(function(r){
											chk.disabled = false;
											if (r.code) throw new Error(r.stderr || 'Falha ao alterar modo IoT');
											if (summary) summary.textContent = enable
												? 'Ativo • Proteção anti-desconexão (disassoc_low_ack=0), DTIM sincronizado e rota estável AWS IoT.'
												: 'Desativado • Configuração padrão do OpenWrt.';
											ui.addNotification(null, E('p', {}, [enable ? 'Modo Casa Inteligente ativado! Proteção anti-desconexão e estabilidade aplicadas para Alexas e IoT.' : 'Modo Casa Inteligente desativado.']), 'info');
										}, self))
										.catch(function(e){
											chk.disabled = false;
											chk.checked = !enable;
											if (summary) summary.textContent = (!enable)
												? 'Ativo • Proteção anti-desconexão (disassoc_low_ack=0), DTIM sincronizado e rota estável AWS IoT.'
												: 'Desativado • Configuração padrão do OpenWrt.';
											ui.addNotification(null, E('p', {}, [e.message]), 'danger');
										});
									}, self)
								}),
								E('span',{class:'ex-switch-slider'})
							])
						]),
						E('div',{class:'ex-channel-mode-control'},[
							E('div',{},[
								E('strong',{},['Prevenção de Quedas Radar DFS (5 GHz)']),
								E('small',{id:'ex-dfs-mode-summary',class:'ex-muted'},[
									(String((w.r5g && w.r5g.ieee80211h) || '') === '1')
										? 'Ativo • Protocolo 802.11h CSA migra aparelhos sem desconectar ao detectar radar nos canais DFS (52 a 144).'
										: 'Desativado • Rádio pode interromper conexão ao detectar radar nos canais DFS (52 a 144). Canais 36-48 e 149-165 não usam radar.'
								])
							]),
							E('label',{class:'ex-switch'},[
								E('input',{
									id:'ex-dfs-toggle',
									type:'checkbox',
									checked: (String((w.r5g && w.r5g.ieee80211h) || '') === '1') ? '' : null,
									'aria-label':'Prevenção de Quedas Radar DFS',
									'change': L.bind(function(ev){
										const chk = ev.currentTarget;
										const enable = chk.checked;
										chk.disabled = true;
										const summary = document.getElementById('ex-dfs-mode-summary');
										if (summary) summary.textContent = 'Aplicando alteração…';
										fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-dfs-optimize', enable ? '1' : '0'])
										.then(L.bind(function(r){
											chk.disabled = false;
											if (r.code) throw new Error(r.stderr || 'Falha ao alterar proteção DFS');
											if (summary) summary.textContent = enable
												? 'Ativo • Protocolo 802.11h CSA migra aparelhos sem desconectar ao detectar radar nos canais DFS (52 a 144).'
												: 'Desativado • Rádio pode interromper conexão ao detectar radar nos canais DFS (52 a 144). Canais 36-48 e 149-165 não usam radar.';
											ui.addNotification(null, E('p', {}, [enable ? 'Proteção 802.11h CSA ativada no rádio 5 GHz (canais DFS 52-144).' : 'Proteção 802.11h CSA desativada.']), 'info');
										}, self))
										.catch(function(e){
											chk.disabled = false;
											chk.checked = !enable;
											if (summary) summary.textContent = (!enable)
												? 'Ativo • Protocolo 802.11h CSA migra aparelhos sem desconectar ao detectar radar nos canais DFS (52 a 144).'
												: 'Desativado • Rádio pode interromper conexão ao detectar radar nos canais DFS (52 a 144). Canais 36-48 e 149-165 não usam radar.';
											ui.addNotification(null, E('p', {}, [e.message]), 'danger');
										});
									}, self)
								}),
								E('span',{class:'ex-switch-slider'})
							])
						]),
						E('div',{class:'ex-channel-mode-control'},[
							E('div',{},[
								E('strong',{},['Modo Potência Máxima de Transmissão Wi-Fi (1 Watt / Panamá)']),
								E('small',{id:'ex-maxpower-mode-summary',class:'ex-muted'},[
									isMaxPower
										? 'Ativo • Libera 100% da potência física dos amplificadores (até 1.000 mW / 30 dBm) usando o domínio regulatório Panamá (PA).'
										: 'Desativado • Limite regulatório padrão Brasil (BR) aplicado.'
								])
							]),
							E('label',{class:'ex-switch'},[
								E('input',{
									id:'ex-maxpower-toggle',
									type:'checkbox',
									checked: isMaxPower ? '' : null,
									'aria-label':'Modo Potência Máxima de Transmissão Wi-Fi',
									'change': L.bind(function(ev){
										const chk = ev.currentTarget;
										const enable = chk.checked;
										chk.disabled = true;
										const summary = document.getElementById('ex-maxpower-mode-summary');
										if (summary) summary.textContent = 'Aplicando alteração e reiniciando rádio…';
										fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-maxpower-toggle', enable ? '1' : '0'])
										.then(L.bind(function(r){
											chk.disabled = false;
											if (r.code) throw new Error(r.stderr || 'Falha ao alterar potência Wi-Fi');
											if (summary) summary.textContent = enable
												? 'Ativo • Libera 100% da potência física dos amplificadores (até 1.000 mW / 30 dBm) usando o domínio regulatório Panamá (PA).'
												: 'Desativado • Limite regulatório padrão Brasil (BR) aplicado.';
											ui.addNotification(null, E('p', {}, [enable ? 'Modo Potência Máxima ativado! Amplificadores liberados para até 1.000 mW (Panamá PA).' : 'Potência regulatória padrão Brasil (BR) restaurada.']), 'info');
											const countryEl = document.getElementById('ex-country-current');
											if (countryEl) countryEl.textContent = enable ? 'Panamá (PA)' : 'Brasil (BR)';
										}, self))
										.catch(function(e){
											chk.disabled = false;
											chk.checked = !enable;
											if (summary) summary.textContent = (!enable)
												? 'Ativo • Libera 100% da potência física dos amplificadores (até 1.000 mW / 30 dBm) usando o domínio regulatório Panamá (PA).'
												: 'Desativado • Limite regulatório padrão Brasil (BR) aplicado.';
											ui.addNotification(null, E('p', {}, [e.message]), 'danger');
										});
									}, self)
								}),
								E('span',{class:'ex-switch-slider'})
							])
						]),
						isWedSupported ? E('div',{class:'ex-channel-mode-control'},[
							E('div',{},[
								E('strong',{},['Aceleração de Hardware Wi-Fi (MediaTek WED)']),
								E('small',{id:'ex-wed-mode-summary',class:'ex-muted'},[
									isWedEnabled
										? 'Ativo • Despacho direto de pacotes Wi-Fi via DMA/PPE no hardware MediaTek, aliviando a CPU.'
										: 'Desativado • Pacotes Wi-Fi processados pela pilha padrão de interrupções de CPU.'
								])
							]),
							E('label',{class:'ex-switch'},[
								E('input',{
									id:'ex-wed-toggle',
									type:'checkbox',
									checked: isWedEnabled ? '' : null,
									'aria-label':'Aceleração de Hardware Wi-Fi MediaTek WED',
									'change': L.bind(function(ev){
										const chk = ev.currentTarget;
										const enable = chk.checked;
										chk.disabled = true;
										const summary = document.getElementById('ex-wed-mode-summary');
										if (summary) summary.textContent = 'Aplicando alteração…';
										fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-wed-toggle', enable ? '1' : '0'])
										.then(L.bind(function(r){
											chk.disabled = false;
											if (r.code) throw new Error(r.stderr || 'Falha ao alterar aceleração WED');
											if (summary) summary.textContent = enable
												? 'Ativo • Despacho direto de pacotes Wi-Fi via DMA/PPE no hardware MediaTek, aliviando a CPU.'
												: 'Desativado • Pacotes Wi-Fi processados pela pilha padrão de interrupções de CPU.';
											ui.addNotification(null, E('p', {}, [enable ? 'Aceleração de Hardware Wi-Fi (WED) ativada!' : 'Aceleração de Hardware Wi-Fi (WED) desativada.']), 'info');
										}, self))
										.catch(function(e){
											chk.disabled = false;
											chk.checked = !enable;
											if (summary) summary.textContent = (!enable)
												? 'Ativo • Despacho direto de pacotes Wi-Fi via DMA/PPE no hardware MediaTek, aliviando a CPU.'
												: 'Desativado • Pacotes Wi-Fi processados pela pilha padrão de interrupções de CPU.';
											ui.addNotification(null, E('p', {}, [e.message]), 'danger');
										});
									}, self)
								}),
								E('span',{class:'ex-switch-slider'})
							])
						]) : '',
						E('div',{class:'ex-grid ' + (has6gBand ? 'ex-grid-3' : 'ex-grid-2') + ' ex-channel-grid'},[
							E('div',{},[
								E('div',{class:'ex-channel-band-head'},[E('b',{},['2,4 GHz']),E('span',{id:'ex-wifi-2-mode',class:'ex-pill standby'},['—'])]),
								E('span',{id:'ex-wifi-2'},['—'])
							]),
							E('div',{},[
								E('div',{class:'ex-channel-band-head'},[E('b',{},['5 GHz']),E('span',{id:'ex-wifi-5-mode',class:'ex-pill standby'},['—'])]),
								E('span',{id:'ex-wifi-5'},['—'])
							]),
							has6gBand ? E('div',{},[
								E('div',{class:'ex-channel-band-head'},[E('b',{},['6 GHz']),E('span',{id:'ex-wifi-6-mode',class:'ex-pill standby'},['—'])]),
								E('span',{id:'ex-wifi-6'},['—'])
							]) : ''
						]),
						E('p',{id:'ex-wifi-noise',class:'ex-muted'},['—']),
						E('p',{id:'ex-scan-result',class:'ex-scan-result'},['A análise é manual e apenas recomenda canais; não interrompe os usuários.']),
						E('div',{class:'ex-channel-actions'},[
							E('button',{class:'ex-channel-action','click':L.bind(self.showManualChannelsModal,self)},['Escolher canais']),
							E('button',{id:'ex-apply-channels',class:'ex-channel-action primary',disabled:true,'click':L.bind(function(){self.changeChannels('fixed');},self)},['Analisar antes de aplicar']),
							E('button',{class:'ex-channel-action','click':L.bind(function(){self.changeWifiWidth();},self)},['Largura / desempenho'])
						])
					])
				]);
				const channelCard = E('section',{class:'ex-card ex-channel-card'},[
					wifiEnvTitle,
					wifiEnvBody
				]);
				const wifiEnvAccordion = setupCardAccordion({
					id: 'wifi_env',
					cardEl: channelCard,
					titleEl: wifiEnvTitle,
					bodyEl: wifiEnvBody,
					isActive: isWifiEnvActive
				});
				wifiEnvTitleActions.appendChild(wifiEnvAccordion.expandBtn);
				return channelCard;
			})(),
			(isWifi6PlusSupported ? (function(){
				const isWifi6Active = [w.r2g, w.r5g, w.r6g].some(function(r){
					return r && (r.bss_color === 'auto' || String(r.twt_responder || '') === '1' || String(r.he_bss_color || '') === '1');
				});
				const wifi6Pill = E('span', { id: 'ex-wifi6-pill', class: 'ex-pill ' + (isWifi6Active ? 'online' : 'standby') }, [isWifi6Active ? 'ACELERAÇÃO ATIVA' : (isWifi7 ? 'WI-FI 7 READY' : 'WI-FI 6')]);
				const wifi6TitleActions = E('div', { class: 'ex-card-title-actions' }, [
					wifi6Pill
				]);
				const wifi6Title = E('div', { class: 'ex-card-title' }, [
					E('div', {}, [
						E('span', { class: 'ex-kicker' }, ['TECNOLOGIA DE PRÓXIMA GERAÇÃO']),
						E('h3', {}, [isWifi7 ? 'Aceleração Wi-Fi 7 & Wi-Fi 6 (802.11be / 802.11ax)' : 'Aceleração Wi-Fi 6 (802.11ax)'])
					]),
					wifi6TitleActions
				]);
				const wifi6Body = E('div', { class: 'ex-card-collapse-body' }, [
					E('div', { class: 'ex-card-collapse-inner' }, [
						E('p', { class: 'ex-muted', style: 'margin: 6px 0 14px; line-height: 1.45; font-size: 13px;' }, [
							'Otimizações de protocolo para redes densas e aparelhos modernos. Aumenta a velocidade real, reduz a latência e estende a bateria de celulares e laptops compatíveis.'
						]),
						E('div', { class: 'ex-channel-mode-control' }, [
							E('div', {}, [
								E('strong', {}, ['Aceleração Completa ' + (isWifi7 ? 'Wi-Fi 6 / 7' : 'Wi-Fi 6')]),
								E('small', { id: 'ex-wifi6-summary', class: 'ex-muted' }, [
									'Ativa BSS Coloring, Target Wake Time (TWT), OFDMA, Beamforming e Preamble Puncturing nos rádios.'
								])
							]),
							E('label', { class: 'ex-switch' }, [
								E('input', {
									id: 'ex-wifi6-toggle',
									type: 'checkbox',
									'aria-label': 'Ativar Aceleração Wi-Fi 6 / Wi-Fi 7',
									change: L.bind(function(ev){ self.toggleWifi6Accel(ev.currentTarget); }, self)
								}),
								E('span', { class: 'ex-switch-slider' })
							])
						]),
						E('div', { class: 'ex-grid ex-grid-2', style: 'margin-top: 14px; gap: 10px;' }, [
							E('div', { style: 'background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);' }, [
								E('strong', { style: 'font-size: 12.5px; display: block; margin-bottom: 2px;' }, ['🎨 BSS Coloring & OFDMA']),
								E('span', { style: 'font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.4;' }, ['Identifica e ignora redes de vizinhos no mesmo canal, multiplicando a capacidade em locais movimentados.'])
							]),
							E('div', { style: 'background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);' }, [
								E('strong', { style: 'font-size: 12.5px; display: block; margin-bottom: 2px;' }, ['🔋 Target Wake Time (TWT)']),
								E('span', { style: 'font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.4;' }, ['Negocia horários de transmissão para celulares e IoT dormirem quando ociosos, poupando até 67% de bateria.'])
							]),
							E('div', { style: 'background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);' }, [
								E('strong', { style: 'font-size: 12.5px; display: block; margin-bottom: 2px;' }, ['📡 Beamforming & MU-MIMO']),
								E('span', { style: 'font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.4;' }, ['Focaliza o sinal de rádio diretamente na direção dos seus aparelhos em vez de espalhar em círculo.'])
							]),
							E('div', { style: 'background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);' }, [
								E('strong', { style: 'font-size: 12.5px; display: block; margin-bottom: 2px;' }, ['⚡ Preamble Puncturing']),
								E('span', { style: 'font-size: 12px; color: rgba(255,255,255,0.65); line-height: 1.4;' }, ['Permite canais largos (80/160/320 MHz) mesmo se houver interferência pontual em uma sub-faixa.'])
							])
						])
					])
				]);
				const wifi6Card = E('section', { class: 'ex-card ex-wifi6-card', style: 'margin-bottom: 20px;' }, [
					wifi6Title,
					wifi6Body
				]);
				const wifi6Accordion = setupCardAccordion({
					id: 'wifi6',
					cardEl: wifi6Card,
					titleEl: wifi6Title,
					bodyEl: wifi6Body,
					isActive: isWifi6Active
				});
				wifi6TitleActions.appendChild(wifi6Accordion.expandBtn);
				return wifi6Card;
			})() : ''),
			(w.hasRadios ? (function(){
				const isMeshActive = !!(w.roamingEnabled || (w.mesh && w.mesh.active));
				const meshPill = E('span', { id: 'ex-mesh-roaming-pill', class: 'ex-pill ' + (isMeshActive ? 'online' : 'standby') }, [
					isMeshActive ? 'ATIVO' : 'DESLIGADO'
				]);
				const meshTitleActions = E('div', { class: 'ex-card-title-actions' }, [
					meshPill
				]);
				const meshTitle = E('div', { class: 'ex-card-title' }, [
					E('div', {}, [
						E('span', { class: 'ex-kicker' }, ['MÚLTIPLOS ROTEADORES & PERFORMANCE']),
						E('h3', {}, ['Rede Mesh & Roaming Rápido'])
					]),
					meshTitleActions
				]);
				const meshBody = E('div', { class: 'ex-card-collapse-body' }, [
					E('div', { class: 'ex-card-collapse-inner' }, [
						E('p', { class: 'ex-muted', style: 'margin: 6px 0 14px; line-height: 1.45; font-size: 13px;' }, [
							'Recursos avançados para residências e escritórios com múltiplos pontos de acesso. Garante transições instantâneas entre cômodos sem queda de chamadas e impede que aparelhos fiquem presos em sinais fracos.'
						]),
						E('div', {
							class: 'ex-alert-box',
							style: 'background: rgba(234, 179, 8, 0.09); border-left: 4px solid #eab308; padding: 12px 16px; border-radius: 6px; margin: 4px 0 16px;'
						}, [
							E('div', { style: 'font-weight: 700; color: #facc15; font-size: 13px; display: flex; align-items: center; gap: 6px;' }, [
								'⚠️ ATENÇÃO: RECURSOS RECOMENDADOS PARA RESIDÊNCIAS COM 2 OU MAIS ROTEADORES'
							]),
							E('p', { style: 'margin: 6px 0 0; font-size: 12.5px; color: rgba(255,255,255,0.85); line-height: 1.45;' }, [
								'• ', E('strong', {}, ['Usa apenas 1 roteador?']), ' Mantenha a Potência Balanceada e o Mesh ', E('strong', {}, ['DESLIGADOS']), ' para ter o alcance máximo das suas antenas.', E('br', {}),
								'• ', E('strong', {}, ['Passou cabo de rede entre os cômodos?']), ' Excelente! O cabo (Backhaul Ethernet) já entrega velocidade máxima Gigabit com zero perda pelo ar. ',
								E('strong', { style: 'color: #38bdf8;' }, ['Não ative o Mesh sem fio pelo ar']), ' neste caso — basta usar o Roaming Rápido com o mesmo nome de rede e senha em ambos os aparelhos!'
							])
						]),
						// 1. Roaming Rápido 802.11k/v/r
						E('div', { class: 'ex-channel-mode-control' }, [
							E('div', {}, [
								E('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
									E('strong', {}, ['Roaming Rápido Inteligente (802.11k / 802.11v / 802.11r)']),
									E('span', { id: 'ex-roaming-pill', class: 'ex-pill ' + (w.roamingEnabled ? 'online' : 'standby') }, [
										w.roamingEnabled ? '802.11k/v/r ATIVO' : 'DESLIGADO'
									])
								]),
								E('small', { id: 'ex-roaming-summary', class: 'ex-muted' }, [
									w.roamingEnabled
										? 'Ativo • Transições em < 50ms no 5 GHz (802.11r), relatórios de vizinhos (802.11k) e migração assistida (802.11v).'
										: 'Desativado • Aparelhos realizam reautenticação completa WPA ao trocar de ponto de acesso.'
								])
							]),
							E('label', { class: 'ex-switch' }, [
								E('input', {
									id: 'ex-roaming-toggle',
									type: 'checkbox',
									checked: w.roamingEnabled ? '' : null,
									'aria-label': 'Ativar Roaming Rápido 802.11k/v/r',
									change: L.bind(function(ev){ self.toggleRoaming(ev.currentTarget); }, self)
								}),
								E('span', { class: 'ex-switch-slider' })
							])
						]),
						E('p', { class: 'ex-muted', style: 'margin: 4px 0 12px; line-height: 1.4; font-size: 12px; padding-left: 2px;' }, [
							'Permite que celulares, tablets e notebooks troquem de roteador em menos de 50 milissegundos enquanto você anda pela casa, sem cortar chamadas de voz e vídeo (WhatsApp, Teams, Zoom) e sem desconectar jogos online. ',
							E('b', { style: 'color:#10b981;' }, ['Blindagem de Automação IoT: ']),
							'O 802.11r opera no rádio de 5 GHz (para roaming ultrarrápido em smartphones), enquanto a rede 2,4 GHz mantém 802.11k/v ativos com compatibilidade WPA2 padrão. Isso garante que celulares antigos troquem de ponto suavemente e que 100% das lâmpadas e tomadas inteligentes continuem conectadas sem quedas.'
						]),
						// 2. Assistente de Roaming usteer
						(function(){
							const usteerFeat = (self.capabilities && self.capabilities.features && self.capabilities.features.usteer) || {};
							const isInstalled = !!usteerFeat.installed;
							const isActive = !!usteerFeat.active;
							const isInstalling = !!(usteerFeat.installing || w.usteerInstalling);

							const control = E('label', { class: 'ex-switch' }, [
								E('input', {
									id: 'ex-usteer-toggle',
									type: 'checkbox',
									checked: (isActive || isInstalling) ? '' : null,
									disabled: isInstalling ? '' : null,
									'aria-label': 'Ativar Assistente de Roaming usteer',
									change: L.bind(function(ev){ self.toggleUsteer(ev.currentTarget); })
								}),
								E('span', { class: 'ex-switch-slider' })
							]);

							let pillText = 'STANDBY';
							let pillClass = 'standby';
							if (isInstalling) {
								pillText = 'INSTALANDO EM 2º PLANO...';
								pillClass = 'warning';
							} else if (isActive) {
								pillText = 'DAEMON ATIVO (< 1.5 MB RAM)';
								pillClass = 'online';
							} else if (!isInstalled) {
								pillText = 'AUTO-DOWNLOAD NATIVO (STANDBY)';
								pillClass = 'standby';
							}

							let summaryText = 'Desativado • O roteador não realiza assistência ativa de roaming.';
							if (isInstalling) {
								summaryText = 'Instalando módulo usteer em segundo plano via repositório OpenWrt…';
							} else if (isActive) {
								summaryText = 'Ativo • Monitora o sinal de cada dispositivo e orquestra a troca entre roteadores e frequências 2,4 / 5 GHz.';
							} else if (!isInstalled) {
								summaryText = 'Desativado • Ao ligar, o sistema baixa e ativa o usteer (~73 KB) automaticamente.';
							}

							return E('div', {
								class: 'ex-channel-mode-control',
								style: 'border-top: 1px solid rgba(127,127,127,.12); padding-top: 12px; margin-top: 12px;'
							}, [
								E('div', {}, [
									E('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
										E('strong', {}, ['Assistente de Roaming e Band Steering (usteer)']),
										E('span', { id: 'ex-usteer-pill', class: 'ex-pill ' + pillClass }, [
											pillText
										])
									]),
									E('small', { id: 'ex-usteer-summary', class: 'ex-muted' }, [
										summaryText
									]),
									E('p', { class: 'ex-muted', style: 'margin: 4px 0 0; line-height: 1.4; font-size: 12px;' }, [
										'Módulo ultraleve oficial do OpenWrt que roda em segundo plano consumindo quase zero de memória. Ele monitora a força do sinal de cada dispositivo conectado na casa e orquestra a troca suave entre múltiplos roteadores e entre as frequências de 2,4 GHz e 5 GHz (Band Steering).'
									])
								]),
								control
							]);
						})(),
						// 3. Potência Balanceada Anti-Sticky Client
						E('div', { class: 'ex-channel-mode-control', style: 'border-top: 1px solid rgba(127,127,127,.12); padding-top: 12px; margin-top: 12px;' }, [
							E('div', {}, [
								E('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
									E('strong', {}, ['Potência Balanceada Anti-Sobreposição (Anti-Sticky Client)']),
									E('span', { id: 'ex-txbalance-pill', class: 'ex-pill ' + (w.txBalanced ? 'online' : 'standby') }, [
										w.txBalanced ? '2.4G (15 dBm) / 5G (20 dBm)' : 'PADRÃO'
									])
								]),
								E('small', { id: 'ex-txbalance-summary', class: 'ex-muted' }, [
									w.txBalanced
										? 'Ativo • 2,4 GHz em potência moderada (15 dBm) e 5 GHz no máximo (20 dBm) para prevenir clientes presos.'
										: 'Desativado • Rádios operando na potência padrão máxima do país.'
								]),
								E('p', { class: 'ex-muted', style: 'margin: 4px 0 0; line-height: 1.4; font-size: 12px;' }, [
									'Em casas com mais de um roteador, manter o 2,4 GHz no volume máximo faz com que o sinal atravesse várias paredes e "prenda" o celular em conexões lentas. Esta opção reduz a potência do 2,4 GHz para um nível moderado e eleva o 5 GHz para a potência máxima, equilibrando a cobertura e incentivando os aparelhos a utilizarem a banda mais rápida.'
								])
							]),
							E('label', { class: 'ex-switch' }, [
								E('input', {
									id: 'ex-txbalance-toggle',
									type: 'checkbox',
									checked: w.txBalanced ? '' : null,
									'aria-label': 'Ativar Potência Balanceada',
									change: L.bind(function(ev){ self.toggleTxBalance(ev.currentTarget); }, self)
								}),
								E('span', { class: 'ex-switch-slider' })
							])
						]),
						// 4. Enlace Mesh Sem Fio (802.11s)
						E('div', {
							class: 'ex-channel-mode-control ex-has-action',
							style: 'border-top: 1px solid rgba(127,127,127,.12); padding-top: 12px; margin-top: 12px;'
						}, [
							E('div', {}, [
								E('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
									E('strong', {}, ['Enlace Mesh Sem Fio (802.11s)']),
									E('span', { class: 'ex-pill ' + (w.meshActive ? 'online' : 'standby') }, [
										w.meshActive ? 'MESH SEM FIO ATIVO' : 'BACKHAUL CABEADO / STANDBY'
									])
								]),
								E('small', { class: 'ex-muted' }, [
									w.meshActive
										? 'Ativo • Enlace criptografado pelo ar operando no rádio de 5 GHz.'
										: 'Recomendação: Cabos Ethernet entre os roteadores garantem velocidade Gigabit total sem perda de rádio.'
								]),
								E('p', { class: 'ex-muted', style: 'margin: 4px 0 0; line-height: 1.4; font-size: 12px;' }, [
									'Se você puder passar um cabo de rede entre os roteadores (Backhaul Ethernet), essa sempre será a melhor opção. Se não houver como passar cabos, o enlace Mesh sem fio 802.11s interliga os aparelhos ARK Router automaticamente pelo ar.'
								])
							]),
							E('div', { class: 'ex-channel-mode-actions' }, [
								E('button', {
									class: 'ex-mini-button',
									style: 'font-weight: 700; white-space: nowrap;',
									click: L.bind(function(){ self.showMeshModal(); }, self)
								}, [w.meshActive ? '⚙ Gerenciar Mesh Sem Fio' : '🔗 Configurar Mesh Sem Fio'])
							])
						])
					])
				]);
				const meshCard = E('section', { class: 'ex-card ex-mesh-roaming-card', style: 'margin-bottom: 20px;' }, [
					meshTitle,
					meshBody
				]);
				const meshAccordion = setupCardAccordion({
					id: 'mesh',
					cardEl: meshCard,
					titleEl: meshTitle,
					bodyEl: meshBody,
					isActive: isMeshActive
				});
				meshTitleActions.appendChild(meshAccordion.expandBtn);
				return meshCard;
			})() : ''),
			(function(){
				const isDevicesActive = true;
				const devicePill = E('span',{id:'ex-device-count',class:'ex-pill online'},['0 conectados']);
				const devicesTitleActions = E('div',{class:'ex-device-title-actions ex-card-title-actions'},[
					deviceSortControls,
					E('button',{
						id:'ex-device-flush-btn',
						class:'ex-mini-button ex-flush-btn',
						style:'display:none;align-items:center;gap:4px;min-height:40px;padding:0 12px;cursor:pointer;font-weight:600;font-size:0.75rem;border-radius:8px;background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.25);user-select:none;-webkit-tap-highlight-color:transparent;',
						'title':translateText('Limpar concessões de aparelhos desconectados ou MACs antigos'),
						'click':L.bind(function(){self.flushStaleLeases();},self)
					},['🧹 ' + translateText('Limpar inativos')]),
					devicePill
				]);
				const devicesTitle = E('div',{class:'ex-card-title'},[
					E('div',{},[
						E('span',{class:'ex-kicker'},['DISPOSITIVOS']),
						E('h3',{},['Quem está conectado'])
					]),
					devicesTitleActions
				]);
				const devicesDetailsEl = E('details',{id:'ex-device-details',open:true,style:'border:none;background:transparent;padding:0;margin:0;'},[
					E('summary',{style:'display:none;'},['Dispositivos']),
					E('div',{id:'ex-secondary-routers-banner',style:'display:none;margin-bottom:12px;'}),
					E('div',{class:'ex-table-wrap'},[
						E('table',{class:'ex-device-table'},[
							E('thead',{},[
								E('tr',{},[
									E('th',{},['Dispositivo']),
									E('th',{class:'ex-hide-mobile'},['Rede / sinal']),
									E('th',{},['Tráfego']),
									E('th',{class:'ex-hide-mobile'},['Total']),
									E('th',{class:'ex-device-action-th'},[''])
								])
							]),
							E('tbody',{id:'ex-device-body'}),
							E('tbody',{id:'ex-device-empty'},[
								E('tr',{},[
									E('td',{colspan:5},['Nenhum dispositivo conectado.'])
								])
							])
						])
					]),
					E('p',{class:'ex-muted ex-table-note'},['A velocidade instantânea vem dos contadores do roteador; o total acumulado vem do nlbwmon. Quando esta lista está aberta, o ARK Router acelera a atualização automaticamente conforme a RAM disponível.'])
				]);
				const devicesBody = E('div', { class: 'ex-card-collapse-body' }, [
					E('div', { class: 'ex-card-collapse-inner' }, [
						devicesDetailsEl
					])
				]);
				const devicesCard = E('section',{class:'ex-card ex-devices'},[
					devicesTitle,
					devicesBody
				]);
				const devicesAccordion = setupCardAccordion({
					id: 'devices',
					cardEl: devicesCard,
					titleEl: devicesTitle,
					bodyEl: devicesBody,
					isActive: isDevicesActive,
					onToggle: function(expanded) {
						devicesDetailsEl.open = expanded;
						if (self.currentData) self.updateRefreshSummary(self.currentData);
						self.scheduleAdaptiveRefresh(0);
					}
				});
				devicesTitleActions.appendChild(devicesAccordion.expandBtn);
				return devicesCard;
			})(),
			this.adblockCard(),
			this.wireguardCard(),
			this.zerotierCard(),
			speedifySection || '',
			E('section',{class:'ex-card ex-reboot-card'},[E('div',{},[E('span',{class:'ex-kicker'},['SISTEMA']),E('h3',{},['Reiniciar o roteador']),E('p',{class:'ex-muted'},['Interrompe a internet por alguns minutos e encerra as sessões abertas.'])]),E('button',{class:'ex-reboot-button','click':L.bind(function(){this.requestReboot();},this)},['Reiniciar…'])])
		]);
		if(!(this.feature('history')||{}).installed){const h=root.querySelector('.ex-history-grid'),c=root.querySelector('.ex-history-caption');if(h)h.remove();if(c)c.remove();}
		if(!(this.feature('wifi')||{}).installed){const g=root.querySelector('.ex-wifi-grid'),c=root.querySelector('.ex-channel-card');if(g)g.remove();if(c)c.remove();}
		if(!(this.feature('temperature')||{}).installed){const t=root.querySelector('#ex-temperature');if(t&&t.closest('.ex-health-item'))t.closest('.ex-health-item').remove();const hi=root.querySelector('.ex-health-items');if(hi)hi.classList.add('compact-3');}
		if(!(this.feature('custom_qos')||{}).installed){const q=root.querySelector('#ex-qos-guest');if(q&&q.closest('.ex-row'))q.closest('.ex-row').remove();}
		if(!(this.feature('sqm')||{}).installed){const q=root.querySelector('#ex-qos-section');if(q)q.remove();}
		if(!(this.feature('mwan3')||{}).installed){const m=root.querySelector('.ex-mwan-control');if(m)m.remove();}
		if(!(this.feature('nlbwmon')||{}).installed){const note=root.querySelector('.ex-table-note');if(note)note.textContent='O monitor de consumo não está instalado; a lista de dispositivos continua disponível, sem velocidade individual.';}
		translateTree(root);
		this.dashboardRoot=root;
		const deviceDetails=root.querySelector('#ex-device-details');
		if(deviceDetails)deviceDetails.addEventListener('toggle',L.bind(function(){if(this.currentData)this.updateRefreshSummary(this.currentData);this.scheduleAdaptiveRefresh(0);},this));
		if(typeof document !== 'undefined' && !window._arkVisibilityListenerAttached){
			window._arkVisibilityListenerAttached = true;
			document.addEventListener('visibilitychange', L.bind(function(){
				if(!document.hidden && this.refreshPaused){
					this.refreshPaused = false;
					this.scheduleAdaptiveRefresh(0);
				}
			}, this));
		}
		this.update(data); this.scheduleAdaptiveRefresh(); return root;
	},
	renderMwanRulesSection: function(data) {
		const self = this;
		const mwanCfg = values(data && data.mwanConfig);
		const torrentRule = mwanCfg.tor_src_tcp || mwanCfg.torrent_rule;
		const isTorrentActive = !!(torrentRule && String(torrentRule.enabled) !== '0');

		const seen = {};
		const customRules = [];
		Object.keys(mwanCfg).forEach(function(k) {
			if (k.indexOf('ark_rule_') !== 0 && k.indexOf('pbr_') !== 0) return;
			const baseId = k.replace(/_[tu]$/, '');
			if (seen[baseId]) return;
			seen[baseId] = true;
			const r = Object.assign({}, mwanCfg[k]);
			r._id = baseId;
			if (k.match(/_[tu]$/)) {
				r.proto = 'tcp udp';
			}
			customRules.push(r);
		});

		const policyLabels = {
			'balanced': '⚖️ Balanceado (2 Links)',
			'wan_only': '🔵 Somente WAN1',
			'wan2_only': '🟣 Somente WAN2',
			'wan_then_wan2': '🛡️ WAN1 ➔ WAN2',
			'wan2_then_wan': '🛡️ WAN2 ➔ WAN1'
		};

		const rulesElements = [];
		if (customRules.length === 0) {
			rulesElements.push(E('div', { class: 'ex-empty-state', style: 'padding: 14px; text-align: center; background: rgba(255,255,255,0.02); border-radius: 8px; border: 1px dashed rgba(255,255,255,0.08); margin-top: 8px;' }, [
				E('small', { class: 'ex-muted' }, ['Nenhuma regra personalizada cadastrada. Clique em "+ Nova Regra" para direcionar portas ou aparelhos específicos.'])
			]));
		} else {
			customRules.forEach(function(r) {
				const isEnabled = String(r.enabled) !== '0';
				const name = r.description || r._id.replace('ark_rule_', '').replace('pbr_', '');
				const proto = (r.proto || 'tcp udp').toUpperCase();
				const portText = r.dest_port ? ('Portas: ' + r.dest_port) : (r.src_port ? ('Porta Origem: ' + r.src_port) : 'Todas as portas');
				const ipText = r.src_ip ? ('IP: ' + r.src_ip) : 'Todos os aparelhos';
				const polLabel = policyLabels[r.use_policy] || r.use_policy;

				rulesElements.push(E('div', {
					class: 'ex-channel-mode-control',
					style: 'margin-top: 8px; padding: 10px 12px; background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;'
				}, [
					E('div', { style: 'flex: 1 1 auto; min-width: 200px;' }, [
						E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 3px;' }, [
							E('strong', { style: 'font-size: 13px; color: #f8fafc;' }, [name]),
							E('span', { class: 'ex-pill ' + (r.use_policy === 'balanced' ? 'online' : 'standby'), style: 'font-size: 11px; padding: 2px 8px;' }, [polLabel])
						]),
						E('small', { class: 'ex-muted', style: 'display: block; font-size: 12px;' }, [
							ipText + ' • ' + proto + ' • ' + portText
						])
					]),
					E('div', { style: 'display: flex; align-items: center; gap: 12px; flex: 0 0 auto;' }, [
						E('label', { class: 'ex-switch', style: 'margin: 0;' }, [
							E('input', {
								type: 'checkbox',
								checked: isEnabled ? '' : null,
								'aria-label': 'Ativar ou desativar regra ' + name,
								change: L.bind(function(ev){
									if (typeof self.toggleMwanRule === 'function') {
										self.toggleMwanRule(r._id, ev.currentTarget.checked);
									}
								}, self)
							}),
							E('span', { class: 'ex-switch-slider' })
						]),
						E('button', {
							class: 'ex-mini-button',
							style: 'padding: 4px 8px; min-height: 28px; background: rgba(239, 68, 68, 0.12); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.25); border-radius: 6px;',
							title: 'Excluir regra ' + name,
							click: L.bind(function(){
								if (typeof self.deleteMwanRule === 'function') {
									self.deleteMwanRule(r._id, name);
								}
							}, self)
						}, ['🗑️'])
					])
				]));
			}, self);
		}

		return E('details', { class: 'ex-mwan-rules-editor', style: 'margin-top: 14px;' }, [
			E('summary', {}, ['Regras Avançadas de Roteamento (Portas e IPs)']),
			E('div', { class: 'ex-mwan-rules-body', style: 'padding: 12px 0 4px;' }, [
				E('div', { style: 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px;flex-wrap:wrap;' }, [
					E('div', {}, [
						E('strong', { style: 'display:block;font-size:13px;' }, ['Roteamento por Política (PBR)']),
						E('small', { class: 'ex-muted' }, ['Direcione portas específicas ou aparelhos para balanceamento ou para um link dedicado.'])
					]),
					E('button', {
						class: 'ex-mini-button',
						style: 'font-weight:700;padding:6px 14px;',
						click: L.bind(function() {
							if (typeof self.showAddMwanRuleModal === 'function') {
								self.showAddMwanRuleModal();
							}
						}, self)
					}, ['+ Nova Regra'])
				]),
				E('div', { class: 'ex-channel-mode-control', style: 'margin-bottom:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;display:flex;align-items:center;justify-content:space-between;' }, [
					E('div', {}, [
						E('strong', {}, ['⚡ Acelerar BitTorrent / P2P nas 2 Internets']),
						E('small', { class: 'ex-muted', style: 'display:block;margin-top:2px;' }, ['Balanceia conexões BitTorrent (portas 51413 e 6881-6999) pelas 2 conexões simultaneamente.'])
					]),
					E('label', { class: 'ex-switch', style: 'margin:0;' }, [
						E('input', {
							id: 'ex-mwan-torrent-toggle',
							type: 'checkbox',
							checked: isTorrentActive ? '' : null,
							'aria-label': 'Ativar ou desativar aceleração P2P',
							change: L.bind(function(ev){
								if (typeof self.toggleMwanTorrentPreset === 'function') {
									self.toggleMwanTorrentPreset(ev.currentTarget);
								}
							}, self)
						}),
						E('span', { class: 'ex-switch-slider' })
					])
				]),
				E('div', { id: 'ex-mwan-custom-rules-list' }, rulesElements)
			])
		]);
	},
	handleSaveApply:null, handleSave:null, handleReset:null
};
