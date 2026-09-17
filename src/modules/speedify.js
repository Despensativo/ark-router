// /src/modules/speedify.js - ARK Router LuCI View Module
const speedifyMethods = {
	prepareSpeedifyWans: function(){
		ui.showModal('Preparar WANs para Speedify',[
			E('p',{},['Essa ação cria backup, ajusta métricas de WAN1/WAN2 e garante que as duas interfaces estejam na zona de firewall WAN. Se WAN2 ainda não existir e o roteador tiver portas LAN suficientes, a LAN1 será convertida em WAN2 DHCP automaticamente.']),
			E('p',{class:'ex-muted'},['Métrica é prioridade de rota: número menor vence. WAN1 fica 10 e WAN2 fica 20, então a WAN1 continua preferida pelo OpenWrt enquanto a WAN2 fica pronta para failover/Speedify.']),
			E('p',{class:'alert-message warning'},['A rede pode pausar por alguns segundos. Isso não instala nem conecta o Speedify.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-prepare']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao preparar WANs');ui.hideModal();reloadSoon('WANs preparadas para Speedify. Recarregando…',1800);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Preparar WANs'])])
		]);
	},
	installSpeedifyMode: function(mode){
		const labels={internal:'Instalar internamente',external:'Usar armazenamento externo',ram:'Carregar na RAM'};
		const warnings={
			internal:'Instala o Speedify na overlay interna. Use apenas se houver espaço livre suficiente.',
			external:'Reservado para extroot/USB. O ARK Router verifica o armazenamento externo antes de continuar.',
			ram:'Modo experimental. Usa /tmp quando houver RAM suficiente e mantém configurações salvas internamente para recarregar depois.'
		};
		ui.showModal(labels[mode]||'Instalar Speedify',[
			E('p',{},[warnings[mode]||'']),
			E('p',{class:'alert-message warning'},['O Speedify exige licença Speedify Router. O modo interno usa o instalador oficial; externo/RAM dependem de armazenamento adequado.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-install-mode',mode]).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao iniciar');ui.hideModal();ui.addNotification(null,E('p',{},['Processo Speedify iniciado.']));this.pollFeatureInstall('speedify',0);},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Confirmar'])])
		]);
	},
	saveSpeedifyConfig: function(){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-save-config']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar configurações');ui.addNotification(null,E('p',{},['Configurações Speedify salvas quando disponíveis.']));}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
	},
	pairSpeedify: function(){
		ui.showModal('Parear Speedify Router',[
			E('p',{},['Gerando código de ativação no roteador…'])
		]);
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-pairing']).then(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao gerar pareamento');
			let data={}; try{ data=JSON.parse(r.stdout||'{}'); }catch(e){}
			const url=data.activationUrl||'', code=data.activationCode||'';
			ui.showModal('Parear Speedify Router',[
				E('p',{},['Abra o link abaixo em qualquer navegador, faça login na sua conta Speedify e conclua a ativação. O token fica salvo localmente no roteador.']),
				code?E('div',{class:'ex-row'},[E('span',{},['Código']),E('strong',{},[code])]):'',
				E('p',{},[E('a',{class:'ex-text-link',href:url,target:'_blank',rel:'noopener noreferrer'},[url||'Link indisponível'])]),
				E('p',{class:'alert-message warning'},['Não coloque senha aqui. O login acontece no portal da Speedify; o ARK Router só recebe o resultado do pareamento.']),
				E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':function(){window.open(url,'_blank','noopener');}},['Abrir link'])])
			]);
		}).catch(function(e){ui.showModal('Parear Speedify Router',[E('p',{class:'alert-message warning'},[e.message]),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar'])])]);});
	},
	checkSpeedifyUser: function(){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-user']).then(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao verificar login');
			let data={}; try{ data=JSON.parse(r.stdout||'{}'); }catch(e){}
			ui.showModal('Conta Speedify',[
				E('div',{class:'ex-grid ex-grid-2 ex-qos-grid'},[
					E('div',{class:'ex-row'},[E('span',{},['Login']),E('strong',{},[data.logged_in?'Conectado':'Não conectado'])]),
					E('div',{class:'ex-row'},[E('span',{},['Licença']),E('strong',{},[data.licensed?'Liberada':'Não confirmada'])]),
					E('div',{class:'ex-row'},[E('span',{},['Conta']),E('strong',{},[data.email_masked||'—'])]),
					E('div',{class:'ex-row'},[E('span',{},['Plano']),E('strong',{},[data.paymentType||'—'])])
				]),
				E('p',{class:'ex-muted'},['Quando bytesAvailable aparece como -1 no Speedify, a licença está liberada para uso contínuo.']),
				E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar'])])
			]);
		}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
	},
	toggleSpeedifyAutostart: function(input){
		const desired=input.checked?'1':'0';
		input.disabled=true;
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-autostart',desired]).then(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao alterar auto recuperação');
			ui.addNotification(null,E('p',{},[desired==='1'?'Auto recuperação ativada. Se o BONDING REAL estiver ligado, ele voltará após o próximo reboot.':'Auto recuperação desativada; o Speedify não iniciará no próximo reboot.']));
			input.disabled=false;
		}).catch(function(e){
			input.checked=!input.checked;
			ui.addNotification(null,E('p',{},[e.message]),'danger');
		}).finally(function(){input.disabled=false;});
	},
	toggleSpeedifyPower: function(input){
		if (isSatelliteOrAp(this.currentData)) {
			input.checked = false;
			input.disabled = true;
			ui.showModal('Blindagem de Modo Satélite', [
				E('div', { class: 'alert-message warning' }, [
					E('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, [
						'🛡️ O serviço Speedify (Bonding de WANs) é exclusivo do Roteador Mestre.'
					]),
					E('p', {}, [
						'Nós Satélites e Pontos de Acesso operam como pontes transparentes na rede local. A agregação de links de internet (Speedify Bonding) deve rodar diretamente no roteador de borda principal (Gateway).'
					])
				]),
				E('div', { class: 'right', style: 'margin-top: 14px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Entendido'])
				])
			]);
			return;
		}
		const desired=input.checked?'1':'0';
		const f=this.feature('speedify')||{}, storage=f.storage||{}, rec=storage.recommended||'none';
		if(desired==='1'&&!f.installed){
			input.checked=false;
			if(!f.supported){ui.addNotification(null,E('p',{},['Este roteador não suporta Speedify. Requer aarch64 ou x86_64.']),'danger');return;}
			if(!/^(internal|external|ram)$/.test(rec)){ui.addNotification(null,E('p',{},['Sem espaço suficiente para instalar o BONDING REAL / Speedify agora.']),'danger');return;}
			const label=rec==='internal'?'interno':(rec==='external'?'externo':'RAM experimental');
			ui.showModal('Instalar e ativar BONDING REAL',[
				E('p',{},['O Speedify ainda não está instalado. O ARK Router pode instalar no modo recomendado: '+label+'.']),
				E('p',{class:'alert-message warning'},['Depois da instalação, ainda pode ser necessário parear/login na conta Speedify Router. Se já estiver pareado, o ARK Router tentará conectar automaticamente.']),
				E('div',{class:'right'},[
					E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',
					E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
						input.disabled=true;
						return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-prepare']).then(L.bind(function(r){
							if(r.code)throw new Error(r.stderr||'Falha ao preparar WANs');
							return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-install-mode',rec]);
						},this)).then(L.bind(function(r){
							if(r.code)throw new Error(r.stderr||'Falha ao iniciar instalação do Speedify');
							ui.hideModal();
							ui.addNotification(null,E('p',{},['Instalação do BONDING REAL iniciada. Ao terminar, o painel tentará atualizar o estado.']));
							this.pollFeatureInstall('speedify',0);
						},this)).catch(function(e){
							input.disabled=false;
							ui.addNotification(null,E('p',{},[e.message]),'danger');
						});
					},this)},['Instalar BONDING REAL'])
				])
			]);
			return;
		}
		input.disabled=true;
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-power',desired]).then(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao alterar Speedify');
			ui.addNotification(null,E('p',{},[desired==='1'?'BONDING REAL ativado. Recarregando painel…':'BONDING REAL desligado; rotas restauradas e daemon encerrado. Recarregando painel…']));
			window.setTimeout(function(){
				window.location.reload();
			}, 1400);
		}).catch(function(e){
			input.checked=!input.checked;
			ui.addNotification(null,E('p',{},[e.message]),'danger');
			input.disabled=false;
		});
	},
	speedifyCommand: function(action,label){
		ui.showModal('Speedify',[
			E('p',{},[label]),
			E('p',{class:'alert-message warning'},['Essa ação chama o Speedify CLI local. É necessário que o Speedify esteja instalado e ativado/licenciado.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify',action]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha no Speedify');ui.hideModal();ui.addNotification(null,E('p',{},['Comando enviado ao Speedify.']));window.setTimeout(function(){window.location.reload();},1400);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Executar'])])
		]);
	},
	toggleSpeedifyBypass: function(title,input,row){
		const desired=!!input.checked;input.disabled=true;
		if(row) row.classList.toggle('is-active', desired);
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-bypass-service',title,desired?'on':'off']).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao alterar o Bypass');
			return this.fetchCapabilities().then(L.bind(function(c){
				this.capabilities=c;
				const data=(c.features&&c.features.speedify_bypass)||{}, item=(data.services||[]).find(function(s){return String(s.title||'')===title;}), actual=item?!!item.enabled:desired;
				input.checked=actual;
				if(row) row.classList.toggle('is-active', actual);
				ui.addNotification(null,E('p',{},[title+': '+(actual?'bypass ligado; tráfego sai diretamente por uma WAN.':'bypass desligado; pode usar o túnel Speedify.')]));
			},this));
		},this)).catch(function(e){input.checked=!desired;if(row) row.classList.toggle('is-active', !desired);ui.addNotification(null,E('p',{},[e.message]),'danger');}).finally(function(){input.disabled=false;});
	},
	toggleSpeedifyBypassMaster: function(input){
		const desired=!!input.checked; input.disabled=true;
		const stateEl=document.getElementById('ex-speedify-bypass-state');
		if(stateEl){
			stateEl.textContent=desired?'BYPASS ATIVO':'BYPASS DESLIGADO';
			stateEl.style.color=desired?'#f59e0b':'';
		}
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-bypass-master',desired?'on':'off']).then(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao alterar Bypass geral');
			ui.addNotification(null,E('p',{},[desired?'Bypass geral ligado.':'Bypass geral desligado.']));
		}).catch(function(e){
			input.checked=!desired;
			if(stateEl){
				stateEl.textContent=(!desired)?'BYPASS ATIVO':'BYPASS DESLIGADO';
				stateEl.style.color=(!desired)?'#f59e0b':'';
			}
			ui.addNotification(null,E('p',{},[e.message]),'danger');
		}).finally(function(){input.disabled=false;});
	},
	saveSpeedifyAdapterPriority: function(id, value){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-adapter-priority',id,value]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar prioridade');ui.addNotification(null,E('p',{},['Prioridade de '+id+' salva: '+value]));}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
	},
	saveSpeedifyAdapterRate: function(id, down, up){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-adapter-rate',id,down||'unlimited',up||'unlimited']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar limites');ui.addNotification(null,E('p',{},['Limites de '+id+' salvos.']));}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
	},
	uninstallSpeedify: function(){
		var remaining = 5;
		var timer = null;
		var confirmBtn = E('button', {
			class: 'btn cbi-button cbi-button-negative',
			disabled: true,
			click: L.bind(function(){
				if(timer) clearInterval(timer);
				ui.showModal('Desinstalando Speedify', [
					E('p', {}, ['Removendo pacotes, arquivos e restaurando configurações de rede…']),
					E('div', { class: 'spinning', style: 'margin: 16px auto; text-align: center;' }, ['Aguarde…'])
				]);
				return fs.exec('/usr/sbin/equipe-dashboard-control', ['speedify-uninstall']).then(function(r){
					if(r && r.code) throw new Error(r.stderr || 'Falha ao desinstalar Speedify');
					ui.addNotification(null, E('p', {}, ['Speedify desinstalado com sucesso. Memória e espaço em disco liberados. Recarregando painel…']));
					window.setTimeout(function(){
						window.location.reload();
					}, 1600);
				}).catch(function(e){
					var msg = (e && e.message) ? e.message : String(e || '');
					if (msg.indexOf('XHR') !== -1 || msg.indexOf('NetworkError') !== -1 || msg.indexOf('Failed to fetch') !== -1) {
						ui.addNotification(null, E('p', {}, ['Speedify desinstalado com sucesso. Recarregando painel…']));
						window.setTimeout(function(){
							window.location.reload();
						}, 1600);
						return;
					}
					ui.hideModal();
					ui.addNotification(null, E('p', {}, [msg]), 'danger');
				});
			}, this)
		}, ['Desinstalar agora (5s)']);

		var cancelBtn = E('button', {
			class: 'btn cbi-button cbi-button-neutral',
			click: function(){
				if(timer) clearInterval(timer);
				ui.hideModal();
			}
		}, ['Cancelar']);

		timer = window.setInterval(function(){
			if(!document.contains(confirmBtn)){
				clearInterval(timer);
				return;
			}
			remaining -= 1;
			if(remaining > 0){
				confirmBtn.textContent = 'Desinstalar agora (' + remaining + 's)';
			} else {
				clearInterval(timer);
				confirmBtn.disabled = false;
				confirmBtn.textContent = 'Confirmar Desinstalação';
			}
		}, 1000);

		ui.showModal('Desinstalar BONDING REAL (Speedify)', [
			E('div', { class: 'alert-message danger', style: 'margin-bottom: 14px;' }, [
				E('strong', {}, ['⚠️ Atenção: ']),
				'Esta ação removerá completamente o Speedify deste roteador.'
			]),
			E('p', {}, [
				'Serão removidos todos os binários, daemons em execução, configurações salvas e arquivos de login.',
				' As rotas de rede e o firewall voltarão 100% para o modo padrão (WAN/Multi-WAN nativo).'
			]),
			E('p', { class: 'ex-muted' }, [
				'Para evitar cliques acidentais, aguarde 5 segundos para liberar a confirmação.'
			]),
			E('div', { class: 'right', style: 'margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;' }, [
				cancelBtn,
				confirmBtn
			])
		]);
	},

	speedifyCard: function(data){
		const detectionData=data||this.currentData||{};
		const f=this.feature('speedify')||{}, installed=!!f.installed, supported=f.supported!==false, prepared=!!f.prepared, state=(f.state||'unavailable'), luci=!!f.luci, storage=f.storage||{}, rec=storage.recommended||'none', installedMode=String(f.install_mode||'');
		if(f.hidden) return '';
		const arch = (this.capabilities.hardware && this.capabilities.hardware.cpu_arch) || '';
		const is64bit = arch === 'aarch64' || arch === 'x86_64';
		const memMb = (this.capabilities.hardware && this.capabilities.hardware.mem_total_mb) || 128;
		const isUnsupportedArch = !is64bit;
		const isTooLowRam = memMb < 160;

		const isWeakOrUnsupported = !installed && (isUnsupportedArch || isTooLowRam);
		if (isWeakOrUnsupported) {
			const reasonText = isUnsupportedArch
				? ('O motor Speedify Router é um serviço 64-bit que exige processador ARM64 ou x86_64. Este roteador opera com arquitetura ' + (arch || 'MIPS 32-bit') + ' e não possui binários oficiais compilados pelo desenvolvedor.')
				: ('O motor Speedify exige no mínimo 160 MB de RAM para carregar em memória. Este roteador possui apenas ' + memMb + ' MB de RAM.');

			return E('section', { class: 'ex-card ex-speedify-card is-unsupported' }, [
				E('div', { class: 'ex-card-title' }, [
					E('div', {}, [
						E('span', { class: 'ex-kicker' }, ['BONDING REAL (SPEEDIFY)']),
						E('h3', {}, ['Hardware Incompatível'])
					]),
					E('div', { style: 'display:flex;align-items:center;gap:8px;' }, [
						E('span', { class: 'ex-pill offline' }, ['NÃO SUPORTADO']),
						E('button', {
							class: 'ex-mini-button',
							style: 'padding:3px 8px;font-size:11px;',
							click: L.bind(function() { this.setFeatureHidden('speedify', true); }, this)
						}, ['Ocultar'])
					])
				]),
				E('div', { style: 'background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.22);border-radius:14px;padding:14px 16px;margin-top:10px;' }, [
					E('p', { style: 'margin:0 0 6px;font-weight:700;color:#f87171;font-size:13px;' }, [
						'⚠️ Este roteador não atende aos requisitos mínimos para Bonding Real (Speedify).'
					]),
					E('p', { class: 'ex-muted', style: 'margin:0;font-size:12.5px;line-height:1.5;' }, [
						reasonText,
						E('br'),
						'A redundância e distribuição de tráfego neste hardware é gerenciada nativamente com altíssima eficiência pelo ',
						E('strong', { style: 'color:#38bdf8;' }, ['Multi-WAN leve (mwan3)']),
						' (Failover automático e Balanceamento inteligente).'
					])
				])
			]);
		}
		const storageMode = installed
			? (/^(internal|external|ram)$/.test(installedMode) ? installedMode : 'internal')
			: rec;
		const accountLabel=f.account_logged_in?(f.account_licensed?'LOGADO / LICENCIADO':'LOGADO'):'NÃO LOGADO';
		const accountClass=f.account_logged_in?'online':'standby';
		const selectedMode=f.bonding_mode||'speed';
		const bypassData=(this.capabilities.features&&this.capabilities.features.speedify_bypass)||{};
		const bypassServices=(bypassData.services||[]).filter(function(s){return s.enabled||/whatsapp|instagram|youtube|starlink|netflix|chatgpt/i.test(String(s.title||''));}).slice(0,24);
		const bypassMaster=E('input',{type:'checkbox','aria-label':'Ativar Bypass geral','change':L.bind(function(ev){this.toggleSpeedifyBypassMaster(ev.currentTarget);},this)});
		bypassMaster.checked=!!bypassData.domainWatchlistEnabled;
		const bypassRows=bypassServices.map(L.bind(function(s){
			const title=String(s.title||'');
			const input=E('input',{type:'checkbox','aria-label':'Bypass '+title});
			input.checked=!!s.enabled;
			const row = E('label',{class:'ex-speedify-bypass-row' + (s.enabled ? ' is-active' : '')},[
				E('span',{},[title]),
				input,
				E('span',{class:'ex-bypass-slider'})
			]);
			input.addEventListener('change',L.bind(function(){
				this.toggleSpeedifyBypass(title,input,row);
			},this));
			return row;
		},this));
		const isBypassActive=!!bypassData.domainWatchlistEnabled;
		const bypassStateEl=E('strong',{
			id:'ex-speedify-bypass-state',
			class:'ex-device-switch-state',
			style:isBypassActive?'color:#f59e0b;':''
		},[isBypassActive?'BYPASS ATIVO':'BYPASS DESLIGADO']);
		const bypassMasterControl=E('div',{class:'ex-device-switch-control'},[
			bypassStateEl,
			E('label',{class:'ex-switch',style:'flex:0 0 auto;'},[
				bypassMaster,
				E('span',{class:'ex-switch-slider'})
			])
		]);
		const bypassPanel=installed&&bypassServices.length?E('div',{class:'ex-speedify-bypass'},[
			E('div',{class:'ex-speedify-bypass-head'},[
				E('div',{class:'ex-speedify-bypass-title'},[
					E('strong',{},['Bypass de Serviços (Streaming & Apps)']),
					E('small',{class:'ex-muted'},['Ligado = o tráfego do serviço sai diretamente por uma WAN física sem passar pelo túnel Speedify. Desligado = pode passar pelo túnel somado.'])
				]),
				bypassMasterControl
			]),
			E('div',{class:'ex-speedify-bypass-list'},bypassRows)
		]):'';
		const adapters=Array.isArray(f.adapters)?f.adapters:[];
		const starlinkAdapters=adapters.filter(function(a){
			return /starlink|spacex/i.test([a.isp,a.ispType,a.description,a.name,a.connectedNetworkName].join(' '));
		});
		const allNetworkInterfaces=((detectionData.interfaces&&detectionData.interfaces.interface)||[]), wanCandidates=allNetworkInterfaces.filter(function(i){const routes=Array.isArray(i.route)?i.route:[],hasDefault=routes.some(function(r){return r&&(r.target==='0.0.0.0'||Number(r.mask)===0);}),name=String(i.interface||'');return !!i.up&&hasDefault&&Array.isArray(i['ipv4-address'])&&i['ipv4-address'].length>0&&!/^(lan|loopback|guest|wg|zerotier|tailscale)/i.test(name);}).map(function(i){const name=String(i.interface||''),address=String(i['ipv4-address'][0].address||''),gateway=wanGateway(i),dns=(i['dns-server']||i.dns_server||[]),ipParts=address.split('.').map(Number),cgnatIp=ipParts.length===4&&ipParts[0]===100&&ipParts[1]>=64&&ipParts[1]<=127,starlinkGateway=String(gateway)==='100.64.0.1',starlinkDns=Array.isArray(dns)&&dns.some(function(server){return /^198\.54\.100\./.test(String(server));}),device=String(i.l3_device||i.device||''),confirmed=starlinkDns||(cgnatIp&&starlinkGateway);return {name:name,label:name.toUpperCase(),address:address,gateway:gateway,dns:dns,device:device,likely:confirmed,strong:confirmed};});
		let starlinkWans=wanCandidates.filter(function(w){if(w.likely)return true;return starlinkAdapters.some(function(a){const haystack=[a.adapterID,a.name,a.description,a.connectedNetworkName].join(' ').toLowerCase();return haystack.indexOf(w.name.toLowerCase())>=0||(w.device&&haystack.indexOf(w.device.toLowerCase())>=0);});});
		if(!starlinkWans.length&&starlinkAdapters.length)starlinkWans=wanCandidates.slice(0,Math.max(1,starlinkAdapters.length));
		const starlinkDetected=starlinkWans.length>0,starlinkProblem=starlinkAdapters.length>0&&!starlinkAdapters.some(function(a){return !a.offline&&String(a.state||'').toLowerCase()==='connected';});this.starlinkWanOrder=starlinkWans.map(function(w){return w.name;});
		const starlinkPublic = (this.capabilities.features && this.capabilities.features.starlink_public) || {}, starlinkPublicInput = E('input', { type: 'checkbox', 'aria-label': 'Permitir visualização Starlink sem login', 'change': L.bind(function(ev) { this.toggleStarlinkPublic(ev.currentTarget); }, this) }); starlinkPublicInput.checked = !!starlinkPublic.enabled;
		const activeStarlinkWan = (starlinkPublic.active_wan) || (starlinkWans[0] && starlinkWans[0].name) || 'wan';
		const starlinkWanCards=starlinkWans.map(L.bind(function(w,index){
			const wanId=portDomId(w.name),saved=this.starlinkResults[w.name],resultClass=saved?(saved.aligned?'online':'offline'):'standby',resultLabel=saved?(saved.aligned?'ALINHADA':'AJUSTAR'):(w.strong?'DETECTADA':'PROVÁVEL');
			const isActiveRoute = (w.name === activeStarlinkWan);
			let panel=null;
			const actions = [
				E('button',{class:'ex-mini-button','click':L.bind(this.readStarlinkTelemetry,this,w.name)},['Consultar esta antena']),
				E('button',{id:'ex-starlink-live-'+wanId,class:'ex-mini-button','click':L.bind(function(){this.starlinkTelemetryActive&&this.starlinkTelemetryWan===w.name?this.stopStarlinkAlignment():this.startStarlinkAlignment(w.name);},this)},['Ajuste ao vivo (1 s)']),
				E('button',{class:'ex-mini-button','click':L.bind(this.finishStarlinkAndNext,this,w.name)},['Finalizar e ir para próxima'])
			];
			if (!isActiveRoute) {
				actions.push(E('button', {
					class: 'ex-mini-button',
					style: 'border-color: rgba(56, 189, 248, 0.45); color: #38bdf8;',
					click: L.bind(function() {
						fs.exec('/usr/sbin/equipe-dashboard-control', ['starlink-active-wan-set', w.name]).then(L.bind(function(r) {
							if (r.code) throw new Error(r.stderr || 'Falha ao ativar rota');
							this.triggerImmediateRefresh('Rota 192.168.100.1 e App Starlink apontados para ' + w.label + '!', 'info');
						}, this)).catch(function(e) {
							ui.addNotification(null, E('p', {}, [e.message]), 'danger');
						});
					}, this)
				}, ['🎯 Definir como Antena Ativa']));
			}
			panel=E('details',{id:'ex-starlink-wan-'+wanId,class:'ex-starlink-wan','toggle':L.bind(function(){this.activateStarlinkPanel(w.name,panel);},this)},[
				E('summary',{},[
					E('span',{},[
						E('strong',{},['Starlink '+(index+1)+' • '+w.label]),
						isActiveRoute ? E('span', { class: 'ex-perf-badge badge-green', style: 'margin-left: 8px;' }, ['🎯 ROTA ATIVA (192.168.100.1)']) : '',
						E('small',{class:'ex-muted'},['IP '+w.address+' • gateway '+w.gateway+' • interface '+(w.device||'—')])
					]),
					E('span',{id:'ex-starlink-result-'+wanId,class:'ex-pill '+resultClass},[resultLabel])
				]),
				E('div',{class:'ex-starlink-wan-body'},[
					E('div',{class:'ex-starlink-telemetry-actions'}, actions),
					E('small',{id:'ex-starlink-telemetry-'+wanId,class:'ex-muted ex-starlink-telemetry-copy'},[isActiveRoute ? ('Esta antena é a rota ativa para o App Starlink e 192.168.100.1.') : ('Leitura isolada pela '+w.label+' • clique em "Definir como Antena Ativa" para usar no App oficial.')]),
					E('div',{id:'ex-starlink-orientation-'+wanId,class:'ex-starlink-orientation'},['Os mostradores aparecerão após consultar esta antena.'])
				])
			]);
			return panel;
		},this));
		const starlinkAlwaysShow = !!(this.capabilities.features && (this.capabilities.features.starlink_always_show === 1 || this.capabilities.features.starlink_always_show === true || this.capabilities.features.starlink_always_show === '1')) || (localStorage.getItem('ark_starlink_always_show') === '1');
		const showStarlinkPanel = starlinkDetected || starlinkAlwaysShow;
		const starlinkPanel=E('details',{id:'ex-starlink-global-panel',class:'ex-starlink-panel '+(starlinkProblem?'problem':(starlinkDetected?'detected':'idle')),style:showStarlinkPanel?'':'display:none;'},[
			E('summary',{},[
				E('span',{class:'ex-starlink-summary-main'},[
					E('span',{class:'ex-starlink-icon'},['◉']),
					E('span',{},[E('strong',{},['Starlink']),E('small',{class:'ex-muted'},[starlinkDetected?(starlinkWans.length+' entrada'+(starlinkWans.length===1?'':'s')+' Starlink detectada'+(starlinkWans.length===1?'':'s')+' • ajuste sequencial'):(starlinkAlwaysShow?'Exibição forçada via configuração • Nenhuma antena física conectada':'Nenhuma entrada Starlink detectada')])])
				]),
				E('span',{class:'ex-pill '+(starlinkProblem?'offline':(starlinkDetected?'online':'standby'))},[starlinkProblem?'SEM CONEXÃO':(starlinkDetected?'DETECTADA':'AGUARDANDO')])
			]),
			E('div',{class:'ex-starlink-body'},[
				starlinkWans.length>=2?E('div',{class:'ex-starlink-multi-warning'},[
					E('strong',{},['Duas ou mais Starlink detectadas']),
					E('span',{},['Se possível, instale as antenas afastadas e aponte-as para lados diferentes. Não é uma disputa direta por satélite, mas essa separação reduz obstruções compartilhadas e possível interferência, melhorando a diversidade dos enlaces.'])
				]):'',
				starlinkDetected?E('div',{class:'ex-starlink-list ex-starlink-wan-list'},starlinkWanCards):E('p',{class:'ex-muted'},[starlinkAlwaysShow?'Painel exibido conforme configuração de preferência. Quando uma WAN Starlink for conectada, os mostradores de alinhamento 3D aparecerão aqui automaticamente.':'Quando uma WAN compatível for detectada, o ARK criará um card independente para consultar e alinhar cada antena.']),
				E('div',{class:'ex-starlink-public'},[
					E('div',{},[E('strong',{},['Visualização sem login']),E('small',{class:'ex-muted'},['Libera apenas telemetria e alinhamento em /starlink/ para dispositivos da LAN. Não permite alterar nenhuma configuração.']),E('a',{id:'ex-starlink-public-link',class:'ex-text-link',href:'/starlink/',target:'_blank',rel:'noopener noreferrer',hidden:!starlinkPublic.enabled},['Abrir painel somente leitura →'])]),
					E('div',{class:'ex-device-switch-control'},[E('strong',{id:'ex-starlink-public-state',class:'ex-device-switch-state'},[starlinkPublic.enabled?'LIGADO':'DESLIGADO']),E('label',{class:'ex-switch'},[starlinkPublicInput,E('span',{class:'ex-switch-slider'})])])
				]),
				E('div',{class:'ex-starlink-note'},[
					E('strong',{},['Central de Antenas Starlink (Alinhamento 3D)']),
					E('small',{class:'ex-muted'},['Uma antena é consultada por vez através de uma rota temporária exclusiva para 192.168.100.1. Internet, mwan3 e Speedify permanecem inalterados.']),
					luci&&f.active?E('a',{class:'ex-text-link',href:L.url('admin/speedify'),target:'_blank',rel:'noopener noreferrer'},['Abrir Central Starlink / Speedify →']):(luci?E('small',{class:'ex-muted'},['Ligue o BONDING REAL para iniciar a Central Starlink oficial.']):'')
				]),
				this.renderStarlinkTelemetrySection()
			])
		]);
		const speedifyAdvanced=installed?E('details',{class:'ex-speedify-advanced'},[
			E('summary',{},['Configurações avançadas do Speedify']),
			E('p',{class:'ex-muted'},['Defina quais placas são Primárias/Secundárias e limites opcionais. Deixe ilimitado para não aplicar teto.']),
			E('div',{class:'ex-speedify-adapter-list'},adapters.length?adapters.map(L.bind(function(a){
				const id=String(a.adapterID||a.name||''), rate=a.rateLimit||{};
				const priorityInput=E('select',{class:'cbi-input-select'},['automatic','always','secondary','backup','never'].map(function(p){return E('option',{value:p},[p]);}));
				priorityInput.value=a.priority||'automatic';
				const downInput=E('input',{class:'cbi-input-text',type:'text',value:String(rate.downloadBps||0)==='0'?'unlimited':String(rate.downloadBps),placeholder:'download Bps'});
				const upInput=E('input',{class:'cbi-input-text',type:'text',value:String(rate.uploadBps||0)==='0'?'unlimited':String(rate.uploadBps),placeholder:'upload Bps'});
				return E('section',{class:'ex-speedify-adapter'},[
					E('strong',{},[id+' • '+(a.description||a.name||'WAN')]),
					E('small',{class:'ex-muted'},['Estado: '+(a.state||'—')+' • prioridade efetiva: '+(a.workingPriority||'—')]),
					E('div',{class:'ex-speedify-adapter-grid'},[E('label',{},['Prioridade',priorityInput]),E('label',{},['Download (Bps)',downInput]),E('label',{},['Upload (Bps)',upInput])]),
					E('div',{class:'ex-speedify-adapter-actions'},[
						E('button',{class:'ex-mini-button','click':L.bind(function(){this.saveSpeedifyAdapterPriority(id,priorityInput.value);},this)},['Salvar prioridade']),
						E('button',{class:'ex-mini-button','click':L.bind(function(){this.saveSpeedifyAdapterRate(id,downInput.value,upInput.value);},this)},['Salvar limites'])
					])
				]);
			},this)):E('span',{class:'ex-muted'},['Nenhuma placa Speedify detectada.']))
		]):'';
		const modeInfo=[
			{key:'speed',title:'Velocidade',badge:'PADRÃO',action:'mode-speed',text:'Foco em somar banda. Usa os links ao mesmo tempo para tentar aumentar download/upload total.',best:'Melhor para arquivos grandes, fotos, vídeos, backup e WhatsApp com muita mídia.',risk:'Se um link oscila muito, pode haver mais variação.'},
			{key:'streaming',title:'Streaming',badge:'EVENTO',action:'mode-streaming',text:'Foco em estabilidade em tempo real. Tenta manter chamadas, lives, vídeo, áudio e tráfego contínuo mais estáveis.',best:'Melhor para live, reunião, transmissão, chamada de vídeo e áudio ao vivo.',risk:'Mais equilibrado para evento, mas nem sempre entrega a maior velocidade bruta.'},
			{key:'redundant',title:'Redundante',badge:'CRÍTICO',action:'mode-redundant',text:'Foco em confiabilidade máxima. Envia dados duplicados por mais de um link.',best:'Melhor quando não pode cair de jeito nenhum.',risk:'Não soma velocidade; gasta mais dados e reduz eficiência.'}
		];
		const isRunning = !!f.runtime_running;
		const isConnected = state==='CONNECTED'||state==='CONNECTING';
		const isPowerOn = isConnected||String(f.desired_state||'')==='connected'||isRunning;
		const powerInput=E('input',{type:'checkbox','aria-label':'Ligar Speedify agora','change':L.bind(function(ev){this.toggleSpeedifyPower(ev.currentTarget);},this)});
		powerInput.checked=isPowerOn;
		if(!supported)powerInput.disabled=true;
		const autoInput=E('input',{type:'checkbox','aria-label':'Auto recuperar Speedify após reboot','change':L.bind(function(ev){this.toggleSpeedifyAutostart(ev.currentTarget);},this)});
		autoInput.checked=!!f.autostart;
		if(!supported)autoInput.disabled=true;
		const actions=[];
		const links=[E('a',{class:'ex-text-link',href:'https://support.speedify.com/article/918-openwrt',target:'_blank',rel:'noopener noreferrer'},['Guia oficial →'])];
		if(luci)links.unshift(E('a',{class:'ex-text-link',href:L.url('admin/speedify')},['Abrir painel oficial Speedify →']));
		else if(installed)links.unshift(E('span',{class:'ex-muted'},['Painel LuCI legado (luci-app-speedify) não instalado. O Speedify é gerenciado diretamente pelos controles nativos do ARK Router.']));
		if(!supported){
			actions.push(E('span',{class:'ex-muted'},['Arquitetura não suportada. Requer aarch64 ou x86_64.']));
		} else {
			if(!installed){
				const modes=[];
				if(storage.internal_ok)modes.push(['internal','Instalar interno','Instala pelo instalador oficial usando a memória interna/overlay.']);
				if(storage.external_ok)modes.push(['external','Usar externo','Usa armazenamento externo/extroot já preparado para evitar ocupar a flash interna.']);
				if(storage.ram_ok)modes.push(['ram','RAM experimental','Usa a memória temporária. Precisa recarregar após reiniciar e preserva apenas a configuração.']);
				if(modes.length){
					actions.push(E('div',{class:'ex-speedify-mode-list'},modes.map(L.bind(function(m){
						return E('button',{class:'ex-mini-button ex-speedify-mode','click':L.bind(this.installSpeedifyMode,this,m[0]),'title':m[2]},[
							E('strong',{},[m[1]]),
							E('span',{},[m[2]])
						]);
					},this))));
				} else {
					actions.push(E('span',{class:'ex-muted'},['Sem armazenamento suficiente para instalar o Speedify neste momento.']));
				}
			}
			actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.prepareSpeedifyWans,this)},['Preparar WAN1/WAN2']));
			if(installed){
				if(isRunning){
					actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.pairSpeedify,this)},['Parear / login']));
					actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.checkSpeedifyUser,this)},['Verificar conta']));
				}
				actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.saveSpeedifyConfig,this)},['Salvar config']));
				if(isRunning){
					actions.push(E('button',{
						class:'ex-mini-button',
						style:'color:#f87171;border-color:rgba(248,113,113,0.3);',
						click:L.bind(function(){
							ui.showModal('Encerrar Speedify',[
								E('p',{},['Deseja encerrar imediatamente o processo do Speedify e liberar a memória RAM alocada?']),
								E('div',{class:'right'},[
									E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',
									E('button',{class:'btn cbi-button cbi-button-negative','click':L.bind(function(){
										ui.hideModal();
										return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-power','0']).then(L.bind(function(){
											ui.addNotification(null,E('p',{},['Processo do Speedify encerrado e memória liberada. Recarregando…']));
											window.setTimeout(function(){ window.location.reload(); }, 1200);
										},this)).catch(function(e){
											ui.addNotification(null,E('p',{},[e.message]),'danger');
										});
									},this)},['Encerrar processo'])
								])
							]);
						},this)
					},['Encerrar daemon']));
				}
				actions.push(E('button',{
					class:'ex-mini-button',
					style:'color:#ef4444;border-color:rgba(239,68,68,0.35);margin-left:auto;',
					click:L.bind(this.uninstallSpeedify,this)
				},['🗑️ Desinstalar Speedify']));
			}
		}
		this._starlinkPanel=starlinkPanel;
		const isSatNode = isSatelliteOrAp(data);
		if (isSatNode) {
			powerInput.disabled = true;
			autoInput.disabled = true;
		}
		const isSpeedifyActive = !isSatNode && !!(f.active || (installed && isRunning) || state === 'CONNECTED');
		const speedifyPill = E('span',{class:'ex-pill '+(isSatNode ? 'standby' : (installed?(f.active?'online':'standby'):'offline'))},[isSatNode ? 'MESTRE GERENCIA' : (installed?(f.active?'ATIVO':'INSTALADO'):(supported?'OPCIONAL':'INDISPONÍVEL'))]);
		const speedifyTitleActions = E('div', { class: 'ex-card-title-actions' }, [
			speedifyPill
		]);
		const speedifyTitle = E('div',{class:'ex-card-title'},[
			E('div',{},[
				E('span',{class:'ex-kicker'},['BONDING REAL']),
				E('h3',{},['Speedify'])
			]),
			speedifyTitleActions
		]);
		const speedifyBody = E('div', { class: 'ex-card-collapse-body' }, [
			E('div', { class: 'ex-card-collapse-inner' }, [
				isSatNode ? E('div', { class: 'alert-message warning', style: 'margin-bottom: 12px; font-size: 12px; line-height: 1.45;' }, [
					E('strong', { style: 'display: block; margin-bottom: 3px;' }, ['🛡️ Speedify Gerenciado no Mestre']),
					'A agregação de links de internet (Speedify Bonding) atua nas portas WAN do Roteador Mestre (Gateway). Nós satélites mantêm tráfego local transparente.'
				]) : '',
				E('p',{class:'ex-muted'},['Opcional. Permite somar WAN1/WAN2 usando a licença Speedify Router. Sem ele, o ARK Router continua usando failover/balanceamento normal.']),
				E('div',{class:'ex-grid ex-grid-3 ex-qos-grid'},[
					E('div',{class:'ex-row'},[E('span',{},['Estado']),E('strong',{},[state])]),
					E('div',{class:'ex-row'},[E('span',{},['Conta']),E('strong',{},[E('span',{class:'ex-pill '+accountClass},[accountLabel]),f.account_email_masked?E('small',{class:'ex-muted ex-speedify-account-email'},[' '+f.account_email_masked]):''])]),
					E('div',{class:'ex-row'},[E('span',{},['WANs']),E('strong',{},[prepared?'Preparadas':'Não preparadas'])])
				]),
				E('div',{class:'ex-grid ex-grid-3 ex-qos-grid ex-speedify-live-grid'},[
					E('div',{class:'ex-row'},[E('span',{},['Conexão']),E('strong',{},[state==='CONNECTED'?'Conectado':state])]),
					E('div',{class:'ex-row'},[E('span',{},['Modo ativo']),E('strong',{},[speedifyModeLabel(f.runtime_mode||selectedMode)])]),
					E('div',{class:'ex-row'},[E('span',{},['IP Speedify']),E('strong',{},[f.tunnel_ip||'—'])])
				]),
				E('div',{class:'ex-speedify-autostart ex-speedify-power'},[
					E('div',{},[
						E('strong',{},['BONDING REAL ativo agora']),
						E('small',{class:'ex-muted'},[
							powerInput.checked
								? (state==='CONNECTED'
									? 'Ligado. O tráfego sai pelo túnel Speedify.'
									: (isRunning
										? 'Daemon em execução em segundo plano; tráfego em WAN normal até conectar.'
										: 'Iniciando e validando o túnel em segundo plano; se falhar, o ARK restaura a WAN normal.'))
								: (installed
									? (isRunning
										? 'Daemon ativo em segundo plano. Desligue para encerrar o processo e liberar a RAM.'
										: 'Desligado. A internet usa WAN/Multi‑WAN normal e o processo está totalmente encerrado.')
									: 'Speedify ainda não instalado. Ao ligar, o ARK Router oferece instalar no modo recomendado.')
						])
					]),
					E('div',{class:'ex-device-switch-control'},[
						E('strong',{class:'ex-device-switch-state'},[powerInput.checked?'LIGADO':'DESLIGADO']),
						E('label',{class:'ex-switch'},[powerInput,E('span',{class:'ex-switch-slider'})])
					])
				]),
				E('div',{class:'ex-speedify-autostart'},[
					E('div',{},[
						E('strong',{},['Auto recuperar após reboot']),
						E('small',{class:'ex-muted'},[
							f.autostart
								? 'Ligado. No próximo boot o ARK Router tentará recarregar o Speedify no modo salvo.'
								: 'Desligado. Após reboot, RAM precisa ser recarregada manualmente.'
						]),
						f.last_autostart?E('small',{class:'ex-muted'},['Último boot: '+f.last_autostart]):''
					]),
					E('div',{class:'ex-device-switch-control'},[
						E('strong',{class:'ex-device-switch-state'},[f.autostart?'LIGADO':'DESLIGADO']),
						E('label',{class:'ex-switch'},[autoInput,E('span',{class:'ex-switch-slider'})])
					])
				]),
				E('div',{class:'ex-speedify-storage'},[
					E('div',{},[E('span',{},['Interno livre']),E('strong',{},[Math.round((storage.overlay_avail_kb||0)/1024)+' MB'])]),
					E('div',{},[E('span',{},['RAM /tmp livre']),E('strong',{},[Math.round((storage.tmp_avail_kb||0)/1024)+' MB'])]),
					E('div',{},[
						E('span',{},[installed?'Instalado em':'Recomendado']),
						E('strong',{
							style: storageMode==='internal' ? 'color:#10b981;' : (storageMode==='ram' ? 'color:#f59e0b;' : (storageMode==='external' ? 'color:#38bdf8;' : 'color:#ef4444;'))
						},[
							storageMode==='internal'?'Interno':(storageMode==='external'?'Externo':(storageMode==='ram'?'RAM experimental':'Sem espaço'))
						])
					])
				]),
				installed?E('div',{class:'ex-speedify-mode-help'},[
					E('div',{class:'ex-speedify-mode-head'},[E('strong',{},['Modo de uso']),E('small',{class:'ex-muted'},['Padrão: Velocidade. Escolha antes de conectar ou altere durante o uso.'])]),
					E('div',{class:'ex-speedify-mode-cards'},modeInfo.map(L.bind(function(m){
						const active=selectedMode===m.key;
						return E('button',{class:'ex-speedify-choice '+(active?'active':''),'click':L.bind(this.speedifyCommand,this,m.action,'Usar modo '+m.title+' no Speedify?')},[
							E('span',{class:'ex-speedify-choice-top'},[E('strong',{},[m.title]),E('em',{},[active?'SELECIONADO':m.badge])]),
							E('span',{class:'ex-speedify-choice-text'},[
								E('small',{},[m.text]),
								E('small',{},[m.best]),
								E('small',{class:'ex-speedify-risk'},[m.risk])
							])
						]);
					},this)))
				]):'',
				bypassPanel,
				speedifyAdvanced,
				E('div',{class:'ex-speedify-actions'},actions),
				E('div',{class:'ex-speedify-links'},links)
			])
		]);
		const speedifyCardEl = E('section',{class:'ex-card ex-speedify-card'},[
			speedifyTitle,
			speedifyBody
		]);
		const speedifyAccordion = setupCardAccordion({
			id: 'speedify',
			cardEl: speedifyCardEl,
			titleEl: speedifyTitle,
			bodyEl: speedifyBody,
			isActive: isSpeedifyActive
		});
		speedifyTitleActions.appendChild(speedifyAccordion.expandBtn);
		return speedifyCardEl;
	}
};
