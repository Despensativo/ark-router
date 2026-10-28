// /src/modules/network.js - ARK Router LuCI View Module
const networkMethods = {
	updateWan: function(prefix, i, d, physical, m, ping, cfg, daily) {
		let phy=(physical&&Object.keys(physical).length)?physical:d;
		if(!phy.carrier && this.currentData && this.currentData.hardwareInfo && this.currentData.hardwareInfo.ports){
			const hwPorts=this.currentData.hardwareInfo.ports;
			const hwMatch=hwPorts[i.device] || hwPorts[cfg.device] || (prefix==='ex-wan1'?(hwPorts.wan||hwPorts.wan1):null);
			if(hwMatch && hwMatch.carrier){
				phy=Object.assign({},phy,{carrier:true, speed:hwMatch.speed||phy.speed, duplex:hwMatch.duplex||phy.duplex});
			}
		}
		const netValues = values((this.currentData||{}).networkConfig);
		const isWanToLan = !!(netValues.autowan && String(netValues.autowan.wan_to_lan) === '1');
		const isWanPromoted = !!(netValues.autowan && String(netValues.autowan.wan_promoted) === '1');
		if (prefix === 'ex-wan1' && isWanToLan && !isWanPromoted) {
			setPill(prefix+'-status','standby','EM REDE LOCAL (LAN)');
			text(prefix+'-mode','Operando como LAN (Auto-Sensing)');
			text(prefix+'-ip','—');
			text(prefix+'-ipv6','—');
			text(prefix+'-gateway','—');
			text(prefix+'-mask','—');
			text(prefix+'-dns','—');
			text(prefix+'-link',phy.carrier ? 'Conectado (em LAN)' : 'Sem cabo');
			text(prefix+'-latency','—');
			text(prefix+'-latency-target','—');
			text(prefix+'-rx-day','—');
			text(prefix+'-tx-day','—');
			text(prefix+'-session','—');
			text(prefix+'-uptime','—');
			return;
		}
		const mwanInterfaces=((this.currentData||{}).mwan||{}).interfaces||{}, mwanRunning=Object.keys(mwanInterfaces).some(function(k){return !!mwanInterfaces[k].running;}), online=!!i.up&&(!mwanRunning||(m&&(m.status==='online'||m.status==='unknown'||!m.running))), disabled=!phy.carrier||(mwanRunning&&m&&m.status==='disabled');
		setPill(prefix+'-status',online?'online':(disabled?'standby':'offline'),online?'ONLINE':(disabled?'SEM CABO':'OFFLINE'));
		const a=i['ipv4-address']&&i['ipv4-address'][0], speed=String(phy.speed||'').match(/[0-9]+/), full=String(phy.speed||'').toUpperCase().indexOf('F')>=0, link=phy.carrier?(speed?speed[0]+' Mbps'+(full?' • Full duplex':''):'conectado'):(i.up?'interface ativa':'sem link'), stats=d.statistics||{};
		let ip6Str = '—';
		const ip6Arr = i['ipv6-address'];
		if (Array.isArray(ip6Arr) && ip6Arr.length > 0) {
			const globalV6 = ip6Arr.find(function(a) { return a && a.address && !a.address.toLowerCase().startsWith('fe80:'); });
			if (globalV6) ip6Str = globalV6.address;
		}
		if (ip6Str === '—' && this.currentData && this.currentData.interfaces) {
			const ifaceName = (cfg && (cfg.section || cfg.iface)) || (prefix.replace(/^ex-/, '').replace(/1$/, ''));
			const candidates = [
				(ifaceName === 'wan' ? 'wan6' : (ifaceName + '_6')),
				ifaceName + '6',
				ifaceName
			];
			for (let idx = 0; idx < candidates.length; idx++) {
				const candidate = iface(this.currentData.interfaces, candidates[idx]);
				if (candidate && candidate.interface) {
					const compArr = candidate['ipv6-address'];
					if (Array.isArray(compArr)) {
						const compGlobalV6 = compArr.find(function(a) { return a && a.address && !a.address.toLowerCase().startsWith('fe80:'); });
						if (compGlobalV6) {
							ip6Str = compGlobalV6.address;
							break;
						}
					}
					if (ip6Str === '—' && Array.isArray(candidate['ipv6-prefix']) && candidate['ipv6-prefix'].length > 0) {
						ip6Str = candidate['ipv6-prefix'][0].address + '/' + candidate['ipv6-prefix'][0].mask;
						break;
					}
				}
			}
		}
		if (ip6Str === '—' && Array.isArray(ip6Arr) && ip6Arr.length > 0) {
			ip6Str = ip6Arr[0].address;
		}
		const pInfo = getPingTargetInfo(this.currentData);
		const pTargetLabel = getPingTargetShortLabel(pInfo.target, pInfo.customIp);
		const isInitPing = !!(this.currentData && this.currentData._initialLoad);
		text(prefix+'-mode',wanProtoLabel(i,cfg)); text(prefix+'-ip',a?a.address:'—'); text(prefix+'-ipv6',ip6Str); text(prefix+'-gateway',wanGateway(i)); text(prefix+'-mask',a?cidrMask(a.mask):'—'); text(prefix+'-dns',wanDns(i)); text(prefix+'-link',link); text(prefix+'-latency-target',pTargetLabel); text(prefix+'-latency',(online&&ping!=null)?ping.toFixed(0)+' ms':(online?(isInitPing?'Medindo…':'Tempo esgotado'):'—')); text(prefix+'-rx-day',daily?formatBytes(daily.rx):'Coletando…'); text(prefix+'-tx-day',daily?formatBytes(daily.tx):'Coletando…'); text(prefix+'-session','↓ '+formatBytes(Number(stats.rx_bytes)||0)+'  •  ↑ '+formatBytes(Number(stats.tx_bytes)||0)); text(prefix+'-uptime',i.up?formatUptime(i.uptime):'—');
	},
	updateLan: function(prefix, device) {
		const connected=!!device.carrier, speed=String(device.speed||'').match(/[0-9]+/), stats=device.statistics||{}, full=String(device.speed||'').toUpperCase().indexOf('F')>=0;
		setPill(prefix+'-status',connected?'online':'standby',connected?'CONECTADA':'SEM CABO');
		text(prefix+'-speed',connected?(speed?speed[0]+' Mbps':'conectada'):'—');
		text(prefix+'-duplex',connected?(device.duplex?String(device.duplex):(full?'Full duplex':'Automático')):'—');
		text(prefix+'-rx',connected?formatBytes(stats.rx_bytes):'—'); text(prefix+'-tx',connected?formatBytes(stats.tx_bytes):'—');
	},

	updateMwanMode: function(data) {
		const v=values(data.mwanConfig), p=(v.default_rule_v4||{}).use_policy||(v.https||{}).use_policy||'wan_then_wan2';
		const activeWans = getActiveWanList(data);
		const devPool1 = v.dev_pool1, devPool2 = v.dev_pool2;
		const isDeviceBalanced = !!(devPool1 && String(devPool1.enabled) === '1' && devPool2 && String(devPool2.enabled) === '1');
		let mode = 'failover';
		if (isDeviceBalanced) {
			mode = 'balanced_devices';
		} else if (p === 'balanced') {
			mode = 'balanced';
		} else if (p === 'wan2_then_wan' || p === 'failover_wan2') {
			mode = 'failover_wan2';
		} else if (p === 'wan_then_wan2' || p === 'failover') {
			mode = 'failover';
		} else if (p.indexOf('_only') > 0) {
			mode = p.replace('_only', '');
			if (mode === 'wan') mode = 'wan1';
		}
		const allModeButtons = document.querySelectorAll('.ex-mode-button');
		allModeButtons.forEach(function(b) {
			b.classList.toggle('active', b.id === ('ex-mode-' + mode));
		});
		let modeLabel = 'Failover (WAN1 → WAN2)';
		if (mode === 'balanced_devices') {
			modeLabel = 'Balanceamento por Aparelho (Recomendado)';
		} else if (mode === 'balanced') {
			modeLabel = 'Balanceamento por Conexão';
		} else if (mode === 'failover') {
			modeLabel = activeWans.length > 1 ? ('Failover (' + activeWans.map(function(w){return w.label;}).join(' → ') + ')') : 'Failover (WAN1 → WAN2)';
		} else if (mode === 'failover_wan2') {
			modeLabel = 'Failover (WAN2 → WAN1)';
		} else {
			const matched = activeWans.find(function(w){return w.domId === mode || w.iface === mode;});
			modeLabel = matched ? ('Somente ' + matched.label) : ('Somente ' + mode.toUpperCase());
		}
		const netCfg = values(data.networkConfig);
		const isAutoWanActive = !!(netCfg.autowan && String(netCfg.autowan.enabled) === '1');
		const autowanPolicy = (netCfg.autowan && netCfg.autowan.policy) || 'balanced';

		if (isSatelliteOrAp(data)) {
			text('ex-mwan-mode', _t('Modo Ponto de Acesso (Bridge)'));
			const toggle = document.getElementById('ex-mwan-toggle');
			if (toggle) {
				toggle.checked = false;
				toggle.disabled = true;
				toggle.title = _t('Multi-WAN desativado em Pontos de Acesso (AP).');
			}
			text('ex-mwan-toggle-state', _t('INATIVO EM MODO AP'));
			setPill('ex-mwan-status', 'standby', 'MESTRE GERENCIA');
			const subEl = document.getElementById('ex-mwan-toggle-desc');
			if (subEl) subEl.textContent = _t('Este roteador opera como Ponto de Acesso (AP) em ponte transparente. O gerenciamento de tráfego de internet e multi-WAN pertencem exclusivamente ao Roteador Mestre.');
			return;
		}

		if (isAutoWanActive) {
			const dump = data.interfaces || {};
			const connectedWans = activeWans.filter(function(w){
				const live = iface(dump, w.iface);
				return live && live.up;
			});
			const mwanInterfaces=(data.mwan&&data.mwan.interfaces)||{}, mwanRunning=Object.keys(mwanInterfaces).some(function(k){return !!mwanInterfaces[k].running;});
			const toggle = document.getElementById('ex-mwan-toggle');
			if (toggle) {
				toggle.checked = mwanRunning;
				toggle.disabled = true;
				toggle.title = 'Gerenciado dinamicamente pelo Piloto Automático de Portas (Auto-WAN).';
			}
			if (connectedWans.length >= 2) {
				const autowanModeLabel = (autowanPolicy === 'balanced') ? 'Balanceamento Inteligente (Auto-WAN)' : 'Failover Automático (Auto-WAN)';
				text('ex-mwan-mode', autowanModeLabel + ' • ' + connectedWans.length + ' Links');
				text('ex-mwan-toggle-state', mwanRunning ? ('ATIVO (' + connectedWans.length + ' LINKS)') : 'SINCRONIZANDO');
				setPill('ex-mwan-status', mwanRunning ? 'online' : 'standby', mwanRunning ? ('MULTI-WAN ATIVO (' + connectedWans.length + ')') : 'SINCRONIZANDO');
				const subEl = document.getElementById('ex-mwan-toggle-desc');
				if (subEl) subEl.textContent = 'Multi-WAN em operação distribuindo tráfego dinamicamente entre as portas conectadas (' + connectedWans.map(function(w){return w.label;}).join(', ') + ').';
			} else if (connectedWans.length === 1) {
				const singleWan = connectedWans[0];
				text('ex-mwan-mode', 'Modo Single-WAN (' + singleWan.label + ' via DHCP)');
				text('ex-mwan-toggle-state', 'STANDBY (1 LINK)');
				setPill('ex-mwan-status', 'standby', 'SINGLE-WAN');
				const subEl = document.getElementById('ex-mwan-toggle-desc');
				if (subEl) subEl.textContent = 'Operando com 1 cabo de internet (' + singleWan.label + '). Balanceamento pausado para economizar RAM/CPU. Ativará automaticamente ao plugar um 2º cabo.';
			} else {
				text('ex-mwan-mode', 'Piloto Automático (Auto-WAN)');
				text('ex-mwan-toggle-state', 'AGUARDANDO CABO');
				setPill('ex-mwan-status', 'offline', 'SEM CABO');
				const subEl = document.getElementById('ex-mwan-toggle-desc');
				if (subEl) subEl.textContent = 'Nenhum cabo de modem detectado com sinal DHCP. Conecte um cabo de internet em qualquer porta para iniciar.';
			}
		} else if (activeWans.length < 2) {
			text('ex-mwan-mode', 'Link Único (Single-WAN)');
			const toggle = document.getElementById('ex-mwan-toggle');
			if (toggle) {
				toggle.checked = false;
				toggle.disabled = true;
				toggle.title = 'Requer pelo menos 2 conexões WAN ativas para ativar o Multi-WAN.';
			}
			text('ex-mwan-toggle-state', 'INDISPONÍVEL (1 WAN)');
			setPill('ex-mwan-status', 'standby', 'DESATIVADO');
			const subEl = document.getElementById('ex-mwan-toggle-desc');
			if (subEl) subEl.textContent = 'O balanceamento e failover requerem pelo menos 2 conexões WAN ativas para operar. Com apenas 1 link, todo o tráfego flui normalmente por ele.';
		} else {
			text('ex-mwan-mode', modeLabel);
			const mwanInterfaces=(data.mwan&&data.mwan.interfaces)||{}, mwanRunning=Object.keys(mwanInterfaces).some(function(k){return !!mwanInterfaces[k].running;});
			const speedify=(this.capabilities.features&&this.capabilities.features.speedify)||{}, paused=String(speedify.desired_state||'')==='connected'&&!mwanRunning;
			const toggle=document.getElementById('ex-mwan-toggle');
			if(toggle){
				toggle.checked=mwanRunning;
				toggle.disabled=paused;
				toggle.title = '';
			}
			text('ex-mwan-toggle-state',paused?'PAUSADO PELO SPEEDIFY':(mwanRunning?'LIGADO':'DESLIGADO'));
			setPill('ex-mwan-status',mwanRunning?'online':(paused?'standby':'offline'),paused?'PAUSADO':(mwanRunning?'ATIVO':'DESLIGADO'));
			const subEl = document.getElementById('ex-mwan-toggle-desc');
			if (subEl) subEl.textContent = paused?'Pausado automaticamente enquanto o Speedify controla as rotas.':'Liga failover/balanceamento sem alterar o modo escolhido.';
		}
	},
	updateHistory: function(raw) {
		const cutoff=Math.floor(Date.now()/1000)-86400;
		const rows=String(raw||'').trim().split(/\n/).map(function(line){const p=line.split(',').map(Number);return {time:p[0],down:p[1],up:p[2]};}).filter(function(x){return isFinite(x.time)&&x.time>=cutoff&&isFinite(x.down)&&isFinite(x.up)&&x.down<=5000000000&&x.up<=5000000000;});
		const draw=function(kind,color,fillColor){
			const values=rows.map(function(x){return x[kind];}), peak=values.length?Math.max.apply(null,values):0, magnitude=peak>0?Math.pow(10,Math.floor(Math.log(peak)/Math.LN10)):1, normalized=peak/magnitude, nice=normalized<=1?1:(normalized<=2?2:(normalized<=5?5:10)), max=Math.max(1000,nice*magnitude), canvas=document.getElementById('ex-history-'+kind);
			text('ex-history-'+kind+'-peak',values.length?'Pico '+formatRate(peak):'Coletando…');
			if(!canvas||!canvas.getContext)return;
			const width=Math.max(280,Math.floor(canvas.clientWidth||600)),height=126,dpr=Math.min(window.devicePixelRatio||1,2),ctx=canvas.getContext('2d'),right=7,top=9,bottom=22,usable=height-top-bottom;
			if(canvas.width!==Math.floor(width*dpr)||canvas.height!==Math.floor(height*dpr)){canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);}
			ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
			ctx.font='9px sans-serif';
			const axisLabels=[formatRate(max),formatRate(max/2),formatRate(0)],left=Math.max(56,Math.ceil(Math.max.apply(null,axisLabels.map(function(label){return ctx.measureText(label).width;})))+12),plotWidth=width-left-right;
			ctx.strokeStyle='rgba(148,163,184,.18)';ctx.lineWidth=1;ctx.fillStyle='rgba(148,163,184,.72)';ctx.textBaseline='middle';ctx.textAlign='right';
			[ {y:top,value:max},{y:top+usable/2,value:max/2},{y:top+usable,value:0} ].forEach(function(mark){ctx.beginPath();ctx.moveTo(left,mark.y+.5);ctx.lineTo(width-right,mark.y+.5);ctx.stroke();ctx.fillText(formatRate(mark.value),left-7,mark.y);});
			ctx.textBaseline='bottom';ctx.textAlign='left';ctx.fillText(rows.length?new Date(rows[0].time*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'24h atrás',left,height);
			ctx.textAlign='right';ctx.fillText('agora',width-right,height);ctx.textAlign='left';
			if(!values.length){ctx.fillStyle='rgba(148,163,184,.7)';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText('Coletando dados…',left+plotWidth/2,top+usable/2);return;}
			const coords=values.map(function(v,i){return {x:values.length===1?width-right:left+i*plotWidth/(values.length-1),y:top+usable-Math.min(v,max)*usable/max};});
			if(values.length===1)coords.unshift({x:left,y:coords[0].y});
			ctx.beginPath();ctx.moveTo(coords[0].x,top+usable);coords.forEach(function(p){ctx.lineTo(p.x,p.y);});ctx.lineTo(coords[coords.length-1].x,top+usable);ctx.closePath();
			const gradient=ctx.createLinearGradient(0,top,0,top+usable);gradient.addColorStop(0,fillColor);gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=gradient;ctx.fill();
			ctx.beginPath();coords.forEach(function(p,i){if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.strokeStyle=color;ctx.lineWidth=2.7;ctx.lineJoin='round';ctx.lineCap='round';ctx.stroke();
			const last=coords[coords.length-1];ctx.beginPath();ctx.arc(last.x,last.y,4,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=1.5;ctx.stroke();
		};
		draw('down','#3b82f6','rgba(59,130,246,.34)'); draw('up','#a855f7','rgba(168,85,247,.32)');
		text('ex-history-samples',rows.length?rows.length+' '+(rows.length===1?'amostra':'amostras')+' • '+new Date(rows[0].time*1000).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})+' até agora':'A primeira amostra aparecerá em até 1 minuto');
	},

	setMwanMode: function(mode,label) {
		ui.showModal('Alterar o Multi‑WAN',[E('p',{},['Aplicar “'+label+'”? A internet pode pausar por alguns segundos.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
			const btn = ev.currentTarget;
			btn.disabled = true;
			btn.textContent = 'Aplicando…';
			return fs.exec('/usr/sbin/equipe-dashboard-control',['mwan',mode]).then(L.bind(function(r){
				if(r.code)throw new Error(r.stderr||'Falha ao aplicar');
				if (mode === 'balanced' || mode === 'balanced_devices') {
					fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-policy-set', 'balanced']).catch(function(){});
				} else if (mode.indexOf('failover') >= 0) {
					fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-policy-set', 'failover']).catch(function(){});
				}
				ui.hideModal();
				ui.addNotification(null,E('p',{},['Modo Multi‑WAN alterado para '+label+'.']));
				return this.fetchData().then(L.bind(this.update,this));
			},this)).catch(function(e){
				btn.disabled = false;
				btn.textContent = 'Aplicar';
				if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
				ui.addNotification(null,E('p',{},[e.message]),'danger');
			});
		},this)},['Aplicar'])])]);
	},
	toggleMwan3: function(input) {
		if (isSatelliteOrAp(this.currentData)) {
			input.checked = false;
			input.disabled = true;
			ui.showModal(_t('Blindagem de Ponto de Acesso'), [
				E('div', { class: 'alert-message warning' }, [
					E('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, [
						'🛡️ O serviço Multi-WAN é exclusivo do Roteador Mestre.'
					]),
					E('p', {}, [
						_t('Pontos de Acesso (APs) operam em ponte transparente e não realizam balanceamento ou failover de conexões WAN. O gerenciamento de tráfego é realizado exclusivamente pelo Roteador Mestre.')
					])
				]),
				E('div', { class: 'right', style: 'margin-top: 14px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Entendido'])
				])
			]);
			return;
		}
		const activeWans = getActiveWanList(this.currentData || {});
		if (input.checked && activeWans.length < 2) {
			input.checked = false;
			input.disabled = true;
			ui.addNotification(null, E('p', {}, ['Multi-WAN requer pelo menos 2 conexões WAN ativas (ex: Fibra + Starlink ou Auto-WAN) para operar.']), 'warning');
			return;
		}
		const desired=!!input.checked;input.disabled=true;
		return fs.exec('/usr/sbin/equipe-dashboard-control',['mwan3-toggle',desired?'1':'0']).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao alterar o Multi-WAN');
			ui.addNotification(null,E('p',{},[String(r.stdout||'').trim()==='paused'?'Preferência salva. O Multi-WAN continuará pausado enquanto o Speedify estiver ativo.':(desired?'Multi-WAN ativado.':'Multi-WAN desativado.')]));
			return this.fetchData().then(L.bind(this.update,this));
		},this)).catch(L.bind(function(e){
			input.checked=!desired;
			const msg = String(e && e.message || e || '');
			if (/não está instalado|nao instalado/i.test(msg)) {
				ui.showModal('Módulo Multi-WAN (mwan3) Não Instalado', [
					E('div', { class: 'alert-message warning', style: 'margin-bottom: 14px;' }, [
						E('h4', { style: 'margin: 0 0 6px;' }, ['⚠️ Recurso Opcional Indisponível']),
						E('p', { style: 'margin: 0; line-height: 1.5;' }, [
							'O serviço ', E('strong', {}, ['Multi-WAN (luci-app-mwan3)']), ' é necessário para gerenciar múltiplos links de internet (Failover automático e Balanceamento de Carga), mas ainda não está instalado neste firmware.'
						])
					]),
					E('p', {}, ['Deseja baixar e instalar o pacote oficial do Multi-WAN agora pelo repositório do roteador?']),
					E('div', { class: 'right', style: 'margin-top: 18px;' }, [
						E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Agora não']),
						' ',
						E('button', {
							class: 'btn cbi-button cbi-button-positive',
							click: L.bind(function(ev) {
								const btn = ev.currentTarget;
								btn.disabled = true;
								btn.textContent = 'Iniciando instalação…';
								return fs.exec('/usr/sbin/equipe-dashboard-control', ['feature-install', 'mwan3']).then(L.bind(function(r) {
									ui.hideModal();
									this.pollFeatureInstall('mwan3', 0);
								}, this)).catch(function(err) {
									btn.disabled = false;
									btn.textContent = 'Instalar Multi-WAN';
									ui.addNotification(null, E('p', {}, [err.message]), 'danger');
								});
							}, this)
						}, ['📦 Instalar Multi-WAN (mwan3)'])
					])
				]);
			} else {
				ui.addNotification(null,E('p',{},[msg]),'danger');
			}
		},this)).finally(function(){input.disabled=false;});
	},
	toggleIgmp: function(input){
		const desired = !!input.checked;
		input.disabled = true;
		const descEl = document.getElementById('ex-lan-igmp-desc');
		const oldDesc = descEl ? descEl.textContent : '';
		if (descEl) descEl.textContent = _t('Aplicando configuração de IGMP Snooping…');

		return fs.exec('/usr/sbin/equipe-dashboard-control', ['lan-igmp-toggle', desired ? '1' : '0'])
			.then(L.bind(function(r){
				input.disabled = false;
				let res = {};
				try { res = JSON.parse(r.stdout || '{}'); } catch(e) {}
				if (r.code && !res.success) {
					throw new Error(r.stderr || 'Falha ao alterar IGMP Snooping');
				}
				const isNowActive = (res.igmp_snooping === 1 || res.igmp_snooping === true || desired);
				input.checked = isNowActive;

				const stateEl = document.getElementById('ex-lan-igmp-state');
				if (stateEl) stateEl.textContent = isNowActive ? _t('ATIVO') : _t('DESLIGADO');

				const pillEl = document.getElementById('ex-lan-igmp-pill');
				if (pillEl) {
					pillEl.className = 'ex-pill ' + (isNowActive ? 'online' : 'standby');
					pillEl.textContent = isNowActive ? _t('ATIVO (PROTEGIDO)') : _t('DESATIVADO');
				}

				const infoEl = document.getElementById('ex-lan-igmp-info');
				if (infoEl) infoEl.textContent = isNowActive ? _t('Ativado (Proteção Wi-Fi)') : _t('Desativado (Broadcast)');

				if (descEl) {
					descEl.textContent = isNowActive
						? _t('Ativado • Tráfego multicast (IPTV/AirPlay) filtrado e direcionado apenas aos dispositivos solicitantes, protegendo o Wi-Fi contra saturação.')
						: _t('Desativado • Tráfego multicast transmitido em broadcast para todas as portas e antenas Wi-Fi (pode causar lentidão em streaming/IPTV).');
				}

				ui.addNotification(null, E('p', {}, [
					isNowActive
						? _t('Proteção Multicast (IGMP Snooping) ativada com sucesso!')
						: _t('IGMP Snooping desativado.')
				]), 'info');
			}, this))
			.catch(L.bind(function(e){
				input.disabled = false;
				input.checked = !desired;
				if (descEl) descEl.textContent = oldDesc;
				ui.addNotification(null, E('p', {}, [e.message || String(e)]), 'danger');
			}, this));
	},
	toggleSqm: function(input){
		if (isSatelliteOrAp(this.currentData)) {
			input.checked = false;
			input.disabled = true;
			ui.showModal(_t('Blindagem de Ponto de Acesso'), [
				E('div', { class: 'alert-message warning' }, [
					E('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, [
						'🛡️ O controle de Bufferbloat (SQM / CAKE) é exclusivo do Roteador Mestre.'
					]),
					E('p', {}, [
						_t('Este roteador opera como Ponto de Acesso (AP) em ponte transparente. O gerenciamento de tráfego de internet e filas SQM deve ser feito diretamente no roteador principal para evitar degradação de desempenho local.')
					])
				]),
				E('div', { class: 'right', style: 'margin-top: 14px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Entendido'])
				])
			]);
			return;
		}
		const desired=!!input.checked;input.checked=!desired;
		const isGamerActive=(this.capabilities&&this.capabilities.operation_profile)==='gamer';
		const isEconomic = this.isEconomicHardware ? this.isEconomicHardware(this.currentData) : false;
		const hw = (this.currentData && this.currentData.hardwareInfo) || (this.capabilities && this.capabilities.hardware) || {};
		const silicon = hw.silicon || {};
		const hasHwOffload = !!silicon.hw_offload_capable;
		const cpuModel = (hw.cpu && (hw.cpu.model || hw.cpu.arch)) || 'Single-Core';
		const title = desired ? (isEconomic ? _t('⚠️ Atenção: Impacto de CPU em Hardware Econômico') : _t('Ativar SQM / CAKE')) : _t('Desativar SQM / CAKE');
		const elements = [];
		let timer = null;

		const clearSqmTimer = function() {
			if (timer) {
				window.clearInterval(timer);
				timer = null;
			}
		};

		if (desired) {
			if (isEconomic) {
				elements.push(E('div', { class: 'alert-message warning', style: 'margin-bottom: 12px; font-size: 13px; line-height: 1.55;' }, [
					E('strong', { style: 'display: block; margin-bottom: 6px; font-size: 14px;' }, [
						'⚠️ ' + _t('Processador de 1 Núcleo / MIPS Detectado') + ' (' + cpuModel + ')'
					]),
					E('p', { style: 'margin: 0 0 8px 0;' }, [
						_t('O algoritmo CAKE roda via software e nesta CPU é recomendado para conexões de até ~80–100 Mbps. Em planos mais rápidos (200M, 500M+), o SQM causará gargalo de CPU a 100% e limitará a velocidade do seu link.')
					]),
					E('div', { style: 'padding: 8px 10px; background: rgba(0,0,0,0.18); border-radius: 6px; border-left: 3px solid #3b82f6;' }, [
						E('strong', { style: 'color: #60a5fa;' }, ['💡 ' + _t('Dica Recomendada:') + ' ']),
						_t('Se o seu plano for de alta velocidade e você quiser eliminar lag em jogos (Bufferbloat), ative e defina o Download em 0 (ilimitado) em "Editar limites" para moldar apenas o Upload, mantendo a CPU livre.')
					])
				]));
			} else if (hasHwOffload) {
				elements.push(E('div', { class: 'alert-message info', style: 'margin-bottom: 12px; font-size: 12.5px; line-height: 1.5;' }, [
					E('strong', { style: 'display: block; margin-bottom: 4px;' }, [
						'⚡ ' + _t('Hardware Moderno com Aceleração em Silício')
					]),
					_t('Ao ativar o SQM / CAKE, o acelerador de pacotes em silício (Hardware PPE) operará em modo híbrido/software. Isso permite que cada pacote seja inspecionado para combater bufferbloat, com total capacidade na sua CPU multicore.')
				]));
			} else {
				elements.push(E('p', { class: 'alert-message warning' }, [
					_t('O SQM será ligado nas filas configuradas e o serviço será reiniciado. A internet pode pausar por alguns segundos.')
				]));
			}
		} else {
			if (isGamerActive) {
				elements.push(E('p', {class:'alert-message danger'}, ['⚠️ ' + _t('Atenção: O Modo Gamer está ATIVO! Ao desligar o SQM / CAKE, a proteção anti-bufferbloat será desativada e o painel retornará automaticamente ao Modo Padrão.')]));
			} else {
				elements.push(E('p', {class:'alert-message warning'}, [_t('O SQM será desligado e o serviço será reiniciado. A internet pode pausar por alguns segundos.')]));
			}
		}

		const confirmBtn = E('button', {
			class: 'btn cbi-button ' + (desired ? 'cbi-button-positive' : 'cbi-button-negative'),
			style: 'font-weight: bold;',
			disabled: (desired && isEconomic)
		}, [(desired && isEconomic) ? _t('Aguarde 3 s') : (desired ? _t('Confirmar') : (isGamerActive ? _t('Desativar SQM e Desligar Gamer') : _t('Confirmar')))]);

		if (desired && isEconomic) {
			const started = Date.now();
			timer = window.setInterval(function() {
				const left = Math.ceil((3000 - (Date.now() - started)) / 1000);
				if (left > 0) {
					confirmBtn.textContent = _t('Aguarde') + ' ' + left + ' s';
					return;
				}
				clearSqmTimer();
				confirmBtn.disabled = false;
				confirmBtn.textContent = '⚠️ ' + _t('Estou ciente e quero ativar SQM');
			}, 100);
		}

		const cancelBtn = E('button', {
			class: 'btn cbi-button cbi-button-neutral',
			click: function() {
				clearSqmTimer();
				closeModal();
			}
		}, [_t('Cancelar')]);

		confirmBtn.addEventListener('click', L.bind(function(ev){
			clearSqmTimer();
			const btn = ev.currentTarget;
			btn.disabled = true;
			btn.textContent = _t('Aplicando…');
			const actions = [fs.exec('/usr/sbin/equipe-dashboard-control', ['sqm-toggle', desired?'1':'0'])];
			if (!desired && isGamerActive) {
				actions.push(fs.exec('/usr/sbin/equipe-dashboard-control', ['profile', 'standard']));
			}
			return Promise.all(actions).then(L.bind(function(r){
				const res = r[0] || {};
				if(res.code) throw new Error(res.stderr || 'Falha ao alterar o SQM');
				const msg = desired ? 'SQM ativado com sucesso!' : (isGamerActive ? 'SQM desativado. Modo Gamer desligado e perfil retornado ao Modo Padrão.' : 'SQM desativado com sucesso!');
				this.triggerImmediateRefresh(msg, 'info');
			}, this)).catch(function(e){
				btn.disabled = false;
				btn.textContent = desired ? (isEconomic ? '⚠️ ' + _t('Estou ciente e quero ativar SQM') : _t('Confirmar')) : (isGamerActive ? _t('Desativar SQM e Desligar Gamer') : _t('Confirmar'));
				if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
				ui.addNotification(null, E('p', {}, [e.message]), 'danger');
			});
		}, this));

		elements.push(E('div', { class: 'right', style: 'margin-top: 14px;' }, [
			cancelBtn, ' ', confirmBtn
		]));
		ui.showModal(title, elements);
	},
	toggleWaveformAplus: function(input) {
		if (isSatelliteOrAp(this.currentData)) {
			if (input) input.checked = false;
			return Promise.resolve();
		}
		const desired = !!(input && input.checked);
		const stateEl = document.getElementById('ex-qos-waveform-aplus-state');
		if (input) input.disabled = true;
		if (stateEl) stateEl.textContent = 'Aplicando…';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['sqm-waveform-aplus', desired ? '1' : '0'])
			.then(L.bind(function(res) {
				if (res.code) throw new Error(res.stderr || 'Falha ao alternar Modo A+ Waveform');
				if (input) input.disabled = false;
				if (stateEl) {
					stateEl.textContent = desired ? 'Sobrepõe Ajustes' : 'Manual';
					stateEl.style.color = desired ? '#34d399' : '#94a3b8';
				}
				const msg = desired
					? '🏆 Modo A+ Waveform ativado! Ajustes manuais sobrepostos com a calibragem oficial ARK (memlimit dinâmico, Cobalt AQM 5ms/100ms, besteffort ingress, diffserv4 ack-filter, WAN DSCP Wash & Wi-Fi AQL).'
					: 'Modo A+ Waveform desativado. Os parâmetros avançados do CAKE agora podem ser customizados manualmente.';
				this.triggerImmediateRefresh(msg, 'info');
			}, this))
			.catch(function(e) {
				if (input) {
					input.disabled = false;
					input.checked = !desired;
				}
				if (stateEl) {
					stateEl.textContent = !desired ? 'Sobrepõe Ajustes' : 'Manual';
					stateEl.style.color = !desired ? '#34d399' : '#94a3b8';
				}
				ui.addNotification(null, E('p', {}, [e.message || String(e)]), 'danger');
			});
	},
	editSqmLimits: function(presetDown, presetUp){
		if (isSatelliteOrAp(this.currentData)) {
			ui.showModal(_t('Blindagem de Ponto de Acesso'), [
				E('div', { class: 'alert-message warning' }, [
					E('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, [
						'🛡️ O controle de Bufferbloat (SQM / CAKE) é exclusivo do Roteador Mestre.'
					]),
					E('p', {}, [
						_t('Este roteador opera como Ponto de Acesso (AP) em ponte transparente. O gerenciamento de tráfego de internet e filas SQM deve ser feito diretamente no roteador principal para evitar degradação de desempenho local.')
					])
				]),
				E('div', { class: 'right', style: 'margin-top: 14px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Entendido'])
				])
			]);
			return Promise.resolve();
		}
		if ((!presetDown || !presetUp) && window._lastSpeedtestResult) {
			presetDown = presetDown || window._lastSpeedtestResult.down;
			presetUp = presetUp || window._lastSpeedtestResult.up;
		}
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['system-hardware-sqm-audit'])
		.then(L.bind(function(auditRes) {
			let audit = {};
			try { audit = JSON.parse(auditRes.stdout || '{}'); } catch(e) {}
			const data=this.currentData||{}, sqm=values(data.sqm), qosValues=values(data.qos), qos=qosValues.main||{}, qosGuest=qosValues.guest||{};
			const field=function(label,value,hint){const node=E('input',{type:'number',class:'cbi-input-text',min:0,max:100000,step:'0.1',placeholder:'0 (ilimitado)',value:kbpsToMbpsInput(value)});return {node:node,row:E('label',{class:'ex-qos-edit-field'},[E('span',{},[label+' (Mbps)']),node,E('small',{class:'ex-muted'},[hint||'Mbps • 0 ou vazio = ilimitado'])])};};
			const profiles=sqmWanProfiles(data);
			const guestDownloadLimit=qosGuest.download_kbps||qos.guest_download_kbps||0, guestUploadLimit=qosGuest.upload_kbps||qos.guest_upload_kbps||0;
			const fwDefs = Object.values(data.firewallConfig || {}).find(function(s) { return s && s['.type'] === 'defaults'; }) || {};
			const isFlowOffloadActive = fwDefs.flow_offloading === '1';
			const cakeMemlimit = audit.cake_memlimit || '32M';
			const initialWaveformAplus = (audit.waveform_aplus_mode !== false) && !profiles.some(function(p) {
				return sqm[p.section] && sqm[p.section].waveform_aplus === '0';
			});

			const editors=profiles.map(function(profile){
				const queue=sqm[profile.section]||{},enabled=E('input',{type:'checkbox'}),download=field(profile.label+' download',queue.download),upload=field(profile.label+' upload',queue.upload);
				enabled.checked=queue.enabled==='1';

				// 1. Download Calculator
				const calcDownInput = E('input', {
					type: 'number',
					class: 'cbi-input-text',
					min: 1,
					max: 100000,
					step: '1',
					placeholder: 'Plano (ex: 500)',
					style: 'flex: 1 1 120px; min-width: 0; min-height: 38px;'
				});
				const calcDownNotice = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 4px; font-size: 11px; line-height: 1.3;' }, [
					'Margem de 7% aplicada para impedir acúmulo de fila no modem.'
				]);
				const applyCalcDownBtn = E('button', {
					type: 'button',
					class: 'btn cbi-button cbi-button-action ex-mini-button',
					style: 'font-weight: 600; white-space: nowrap; flex-shrink: 0; min-height: 38px;',
					click: function() {
						const nominal = parseFloat(calcDownInput.value || 0);
						if (nominal > 0) {
							const discounted = Math.round(nominal * 0.93 * 10) / 10;
							download.node.value = discounted;
							calcDownNotice.style.color = '#10b981';
							calcDownNotice.textContent = '✓ ' + discounted + ' Mbps aplicado ao Download (-7% contra Bufferbloat).';
						}
					}
				}, ['Aplicar -7%']);

				const calcDownBox = E('div', { class: 'ex-qos-calc-box' }, [
					E('div', { style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;' }, [
						E('strong', { style: 'font-size: 11.5px;' }, ['🧮 Calculadora de Download (-7%)'])
					]),
					E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
						calcDownInput,
						applyCalcDownBtn
					]),
					calcDownNotice
				]);

				// 2. Upload Calculator
				const calcInput = E('input', {
					type: 'number',
					class: 'cbi-input-text',
					min: 1,
					max: 100000,
					step: '1',
					placeholder: 'Plano (ex: 50)',
					style: 'flex: 1 1 120px; min-width: 0; min-height: 38px;'
				});
				const calcNotice = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 4px; font-size: 11px; line-height: 1.3;' }, [
					'Margem de 7% aplicada para impedir acúmulo de fila no modem.'
				]);
				const applyCalcBtn = E('button', {
					type: 'button',
					class: 'btn cbi-button cbi-button-action ex-mini-button',
					style: 'font-weight: 600; white-space: nowrap; flex-shrink: 0; min-height: 38px;',
					click: function() {
						const nominal = parseFloat(calcInput.value || 0);
						if (nominal > 0) {
							const discounted = Math.round(nominal * 0.93 * 10) / 10;
							upload.node.value = discounted;
							if (isFlowOffloadActive || download.node.value === '' || download.node.value === '0') {
								download.node.value = '0';
							}
							calcNotice.style.color = '#10b981';
							calcNotice.textContent = '✓ ' + discounted + ' Mbps aplicado ao Upload (-7% contra Bufferbloat).';
						}
					}
				}, ['Aplicar -7%']);

				const calcBox = E('div', { class: 'ex-qos-calc-box' }, [
					E('div', { style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;' }, [
						E('strong', { style: 'font-size: 11.5px;' }, ['🧮 Calculadora de Upload (-7%)'])
					]),
					E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
						calcInput,
						applyCalcBtn
					]),
					calcNotice
				]);

				// 3. Link Layer Overhead & CAKE Parameters
				const curLinklayer = queue.linklayer || 'none';
				const curOverhead = parseInt(queue.overhead || 0, 10);
				const curEqdisc = queue.eqdisc_opts || ('diffserv4 nat dual-srchost ack-filter wash memlimit ' + cakeMemlimit);
				const curIqdisc = queue.iqdisc_opts || ('besteffort nat dual-dsthost wash ingress memlimit ' + cakeMemlimit);

				const isPppoe = profile.proto === 'pppoe' || String(profile.device || '').indexOf('pppoe') === 0;
				const optimalOverheadVal = isPppoe ? 'ethernet|44' : 'ethernet|18';
				let targetOverheadVal = 'none|0';
				if (curLinklayer === 'ethernet' && (curOverhead === 18 || curOverhead === 28 || curOverhead === 34 || curOverhead === 44)) {
					targetOverheadVal = 'ethernet|' + curOverhead;
				} else if (curLinklayer === 'atm' && curOverhead === 44) {
					targetOverheadVal = 'atm|44';
				} else if (isPppoe) {
					targetOverheadVal = 'ethernet|44';
				} else if (curLinklayer === 'ethernet') {
					targetOverheadVal = 'ethernet|18';
				}

				const overheadSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; margin-top: 4px;' }, [
					E('option', { value: 'none|0' }, [_t('Nenhum / Ethernet Pura (0 bytes overhead)')]),
					E('option', { value: 'ethernet|18' }, [_t('Cabo DOCSIS / Ethernet Padrão (18 bytes)') + (!isPppoe ? ' — ' + _t('Recomendado Cabo/DHCP') : '')]),
					E('option', { value: 'ethernet|28' }, [_t('Fibra GPON / PPPoE Direto (28 bytes)')]),
					E('option', { value: 'ethernet|34' }, [_t('Fibra PPPoE / VLAN (34 bytes)')]),
					E('option', { value: 'ethernet|44' }, [_t('Fibra GPON / PPPoE Conservador (44 bytes)') + (isPppoe ? ' — ' + _t('Recomendado para esta WAN') : '')]),
					E('option', { value: 'atm|44' }, [_t('Linha ADSL Antiga (ATM 44 bytes)')])
				]);
				overheadSelect.value = targetOverheadVal;

				const chkNat = E('input', { type: 'checkbox', checked: curEqdisc.indexOf('nat') !== -1 });
				const chkHostFair = E('input', { type: 'checkbox', checked: (curEqdisc.indexOf('dual-srchost') !== -1 || curIqdisc.indexOf('dual-dsthost') !== -1) });
				const chkAck = E('input', { type: 'checkbox', checked: curEqdisc.indexOf('ack-filter') !== -1 });
				const chkWash = E('input', { type: 'checkbox', checked: curEqdisc.indexOf('wash') !== -1 });
				const chkDiffserv = E('input', { type: 'checkbox', checked: curEqdisc.indexOf('diffserv4') !== -1 });
				const aplusLockBadge = E('div', {
					style: 'display: ' + (initialWaveformAplus ? 'block' : 'none') + '; padding: 6px 10px; border-radius: 8px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); color: #34d399; font-size: 11.5px; font-weight: 600;'
				}, [
					'🔒 Parâmetros sobrepostos pelo Modo A+ Waveform (memlimit ' + cakeMemlimit + ', Cobalt AQM 5ms/100ms, besteffort ingress, diffserv4 ack-filter). Desative o Modo A+ acima se quiser customizar manualmente.'
				]);

				const advancedDetails = E('details', { style: 'margin-top: 12px; padding: 12px 14px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;' }, [
					E('summary', { style: 'cursor: pointer; font-weight: 700; font-size: 12px; color: #93c5fd;' }, ['⚙️ Parâmetros Avançados do CAKE & Enquadramento (Overhead)']),
					E('div', { style: 'margin-top: 10px; display: flex; flex-direction: column; gap: 8px;' }, [
						aplusLockBadge,
						E('label', { style: 'display: block;' }, [
							E('span', { style: 'font-weight: 600; font-size: 11.5px; display: block;' }, ['Tipo de Link / Overhead de Linha:']),
							overheadSelect,
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Compensa os cabeçalhos de fibra/cabo no shaper para precisão absoluta anti-bufferbloat.'])
						]),
						E('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px; margin-top: 4px;' }, [
							E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
								chkNat,
								E('span', {}, [E('strong', {}, ['NAT Lookup (nat): ']), 'Permite ao CAKE ver o IP real de cada aparelho da casa antes do NAT.'])
							]),
							E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
								chkHostFair,
								E('span', {}, [E('strong', {}, ['Host Isolation (dual-srchost/dsthost): ']), 'Divisão igualitária de banda por dispositivo (impede que um download sufoque os outros).'])
							]),
							E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
								chkAck,
								E('span', {}, [E('strong', {}, ['Filtro de ACK TCP (ack-filter): ']), 'Acelera o upload filtrando ACKs redundantes durante downloads pesados.'])
							]),
							E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
								chkWash,
								E('span', {}, [E('strong', {}, ['Limpeza DSCP (wash): ']), 'Higieniza marcações DSCP incorretas vindas da operadora.'])
							]),
							E('label', { style: 'display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;' }, [
								chkDiffserv,
								E('span', {}, [E('strong', {}, ['Diffserv 4-Tiers (diffserv4 no Upload / besteffort no Download): ']), 'Priorização automática no Upload e fila unificada de alta vazão no Download.'])
							])
						])
					])
				]);

				const applyAplusLock = function(locked) {
					aplusLockBadge.style.display = locked ? 'block' : 'none';
					if (locked) {
						overheadSelect.value = optimalOverheadVal;
						chkNat.checked = true;
						chkHostFair.checked = true;
						chkAck.checked = true;
						chkWash.checked = true;
						chkDiffserv.checked = true;
					}
					overheadSelect.disabled = locked;
					chkNat.disabled = locked;
					chkHostFair.disabled = locked;
					chkAck.disabled = locked;
					chkWash.disabled = locked;
					chkDiffserv.disabled = locked;
				};
				applyAplusLock(initialWaveformAplus);

				return {
					profile: profile,
					enabled: enabled,
					download: download,
					upload: upload,
					overheadSelect: overheadSelect,
					chkNat: chkNat,
					chkHostFair: chkHostFair,
					chkAck: chkAck,
					chkWash: chkWash,
					chkDiffserv: chkDiffserv,
					applyAplusLock: applyAplusLock,
					section: E('section', { class: 'ex-qos-wan-section', style: 'padding: 16px; border: 1px solid rgba(127,127,127,.18); border-radius: 14px; background: rgba(127,127,127,.05); margin-bottom: 14px;' }, [
						E('div', { style: 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 12px; padding-bottom: 10px; border-bottom: 1px solid rgba(127,127,127,.12);' }, [
							E('div', {}, [
								E('h3', { style: 'margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 8px;' }, [
									'🌐 ' + profile.label,
									E('span', { class: 'ex-pill ' + (profile.online ? 'online' : 'standby'), style: 'font-size: 0.75rem;' }, [
										profile.online ? _t('Online') : _t('Sem link')
									])
								]),
								E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, [
									_t('Interface') + ' ' + profile.network + ' • ' + _t('dispositivo') + ' ' + profile.device
								])
							]),
							E('label', { class: 'ex-qos-edit-toggle', style: 'margin: 0; cursor: pointer; display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.04); padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.08);' }, [
								enabled,
								E('span', { style: 'font-weight: 650; font-size: 13px;' }, [_t('Ativar fila') + ' ' + profile.label])
							])
						]),
						E('div', { class: 'ex-qos-dir-grid', style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;' }, [
							E('div', { class: 'ex-qos-dir-box', style: 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px;' }, [
								E('div', { style: 'display: flex; align-items: center; gap: 6px; margin-bottom: 6px;' }, [
									E('span', { style: 'font-size: 15px;' }, ['📥']),
									E('strong', { style: 'font-size: 13px; color: var(--ark-text-main, #fff);' }, [_t('Download')])
								]),
								download.row,
								calcDownBox
							]),
							E('div', { class: 'ex-qos-dir-box', style: 'background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 10px; padding: 12px;' }, [
								E('div', { style: 'display: flex; align-items: center; gap: 6px; margin-bottom: 6px;' }, [
									E('span', { style: 'font-size: 15px;' }, ['📤']),
									E('strong', { style: 'font-size: 13px; color: var(--ark-text-main, #fff);' }, [_t('Upload')])
								]),
								upload.row,
								calcBox
							])
						]),
						advancedDetails
					])
				};
			});

			const modalWaveformInput = E('input', {
				type: 'checkbox',
				checked: initialWaveformAplus,
				change: function(ev) {
					const on = !!ev.currentTarget.checked;
					modalWaveformState.textContent = on ? 'ATIVO (Sobrepõe Ajustes)' : 'Manual';
					modalWaveformState.style.color = on ? '#34d399' : '#94a3b8';
					editors.forEach(function(ed) { ed.applyAplusLock(on); });
				}
			});
			const modalWaveformState = E('strong', {
				class: 'ex-device-switch-state',
				style: 'color: ' + (initialWaveformAplus ? '#34d399' : '#94a3b8') + '; font-size: 12px;'
			}, [initialWaveformAplus ? 'ATIVO (Sobrepõe Ajustes)' : 'Manual']);

			const waveformAplusBanner = E('div', {
				style: 'margin-bottom: 14px; padding: 12px 14px; border-radius: 12px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.11), rgba(59, 130, 246, 0.09)); border: 1px solid rgba(16, 185, 129, 0.35);'
			}, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;' }, [
					E('div', { style: 'flex: 1 1 260px; min-width: 0;' }, [
						E('div', { style: 'display: flex; align-items: center; flex-wrap: wrap; gap: 8px;' }, [
							E('strong', { style: 'color: #34d399; font-size: 13.5px;' }, ['🏆 Modo A+ no Waveform (Calibragem Oficial ARK)']),
							E('a', {
								href: 'https://www.waveform.com/tools/bufferbloat',
								target: '_blank',
								rel: 'noopener noreferrer',
								style: 'font-size: 11.5px; font-weight: 700; color: #60a5fa; text-decoration: none; padding: 2px 8px; border-radius: 6px; background: rgba(59, 130, 246, 0.16); border: 1px solid rgba(59, 130, 246, 0.38);'
							}, ['🔗 Abrir Teste Waveform Bufferbloat ↗'])
						]),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 3px; line-height: 1.4;' }, [
							'Quando ativo, sobrepõe os ajustes manuais do usuário com todas as otimizações oficiais ARK (memlimit ' + cakeMemlimit + ', Cobalt AQM 5ms/100ms, besteffort ingress, diffserv4 ack-filter, WAN DSCP Wash e Wi-Fi AQL).'
						])
					]),
					E('div', { class: 'ex-device-switch-control' }, [
						modalWaveformState,
						E('label', { class: 'ex-switch' }, [modalWaveformInput, E('span', { class: 'ex-switch-slider' })])
					])
				]),
				E('details', { style: 'margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); font-size: 12px; line-height: 1.5;' }, [
					E('summary', { style: 'cursor: pointer; font-weight: 700; color: #93c5fd; user-select: none;' }, [
						'🔬 Por que 32M bateu no teto em 744 Mbps e por que subir para 92M NÃO aumenta o ping? (Ver Detalhes)'
					]),
					E('div', { style: 'margin-top: 8px; display: flex; flex-direction: column; gap: 8px; color: rgba(255,255,255,0.88);' }, [
						E('div', { style: 'padding: 8px 10px; border-radius: 8px; background: rgba(0,0,0,0.22); border-left: 3px solid #f59e0b;' }, [
							E('strong', { style: 'display: block; color: #fbbf24; margin-bottom: 2px;' }, ['Por que 32M bateu no teto em 744 Mbps?']),
							'No Linux 6.12 com o driver Ethernet da MediaTek (mtk_eth_soc), os pacotes de recepção usam Page Pool: cada pacote de 1,5 KB de dados reais ocupa uma página inteira de memória no kernel (skb->truesize de 4 KB a 8 KB — 3x a 5x maior que o pacote em si). Quando várias conexões paralelas (Speedtest / Fast.com / Steam) abrem rajadas a 744 Mbps, o contador de truesize bateu nos 32 MB (33.775.872 bytes) e forçou o CAKE a descartar pacotes por teto de memória (cake_drop), mesmo com a fila de tempo vazia (av_delay: 25 us, marks: 0).'
						]),
						E('div', { style: 'padding: 8px 10px; border-radius: 8px; background: rgba(0,0,0,0.22); border-left: 3px solid #10b981;' }, [
							E('strong', { style: 'display: block; color: #34d399; margin-bottom: 2px;' }, ['Por que subir para 92M NÃO aumenta o ping (Bufferbloat)?']),
							'Porque quem controla o ping no CAKE não é o memlimit, e sim o relógio do Cobalt AQM (target 5ms, rtt 100ms). O memlimit é apenas o teto de segurança da RAM do kernel (neste roteador: ' + cakeMemlimit + ') para que o skb->truesize inflado do driver não corte pacotes antes de o Cobalt medir os 5 ms.'
						])
					])
				])
			]);

			const guestDown=field('Visitantes download total',guestDownloadLimit,'Mbps • 0 ou vazio = ilimitado'), guestUp=field('Visitantes upload total',guestUploadLimit,'Mbps • exemplo: 1,5 • 0 ou vazio = ilimitado');
			const guestSection = E('section', {
				class: 'ex-qos-guest-section',
				style: 'padding: 14px 16px; border: 1px solid rgba(127,127,127,.18); border-radius: 14px; background: rgba(127,127,127,.05); margin-bottom: 16px;'
			}, [
				E('div', { style: 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid rgba(127,127,127,.12);' }, [
					E('div', {}, [
						E('h3', { style: 'margin: 0; font-size: 1rem; display: flex; align-items: center; gap: 6px;' }, [
							'👥 ' + _t('Rede de Visitantes (QoS Secundário)')
						]),
						E('small', { class: 'ex-muted' }, [_t('Limite máximo de velocidade que todos os aparelhos de visitas podem usar juntos.')])
					])
				]),
				E('div', { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;' }, [
					guestDown.row,
					guestUp.row
				])
			]);
			const mipsNotice = audit.is_low_end_mips ? E('div', { class: 'alert-message warning', style: 'margin-bottom: 12px; font-size: 12.5px; line-height: 1.5;' }, [
				E('strong', { style: 'display:block; margin-bottom:4px;' }, ['⚠️ ' + _t('Recomendação de Hardware: Processador MIPS') + ' (' + (audit.cpu_model || 'Single-Core 720 MHz') + ')']),
				_t('Para velocidades de download superiores a 100 Mbps, o algoritmo CAKE pode saturar a CPU (100%), reduzindo a velocidade real do link.') + ' ',
				E('div', { style: 'margin-top: 8px;' }, [
					E('button', {
						type: 'button',
						class: 'btn cbi-button cbi-button-neutral',
						style: 'font-weight: 600; font-size: 11.5px; padding: 3px 8px;',
						'click': function() {
							editors.forEach(function(ed) { ed.download.node.value = '0'; });
							ui.addNotification(null, E('p', {}, [_t('Download ajustado para 0 (ilimitado). O SQM atuará apenas no Upload, eliminando o bufferbloat sem sobrecarregar a CPU.')]), 'info');
						}
					}, ['⚡ ' + _t('Otimizar: Limitar somente Upload (Zero lag sem gargalo de CPU)')])
				])
			]) : '';

			const flowOffloadNotice = isFlowOffloadActive ? E('div', { class: 'alert-message warning', style: 'margin-bottom: 12px; font-size: 12.5px; line-height: 1.45;' }, [
				E('strong', { style: 'display: block; margin-bottom: 3px;' }, ['⚠️ ' + _t('Fastpath (Flow Offload) Ativo no Firewall')]),
				_t('O Fastpath desvia os pacotes do kernel e impede o funcionamento do SQM/CAKE. Ao salvar o SQM, o Fastpath será automaticamente desativado para garantir o controle anti-bufferbloat.')
			]) : '';

			const hasSpeedtest = (presetDown > 0 || presetUp > 0);
			const speedtestBanner = hasSpeedtest ? E('div', {
				class: 'alert-message info',
				style: 'margin-bottom: 12px; background: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.35); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; border-radius: 8px; padding: 10px 14px;'
			}, [
				E('div', {}, [
					E('strong', { style: 'display: block; color: #60a5fa; font-size: 13px;' }, ['🎬 Medição Recente do Fast.com']),
					E('span', { style: 'font-size: 12.5px;' }, [
						'Download: ', E('strong', {}, [presetDown + ' Mbps']), ' • Upload: ', E('strong', {}, [presetUp + ' Mbps'])
					])
				]),
				E('button', {
					type: 'button',
					class: 'btn cbi-button cbi-button-action ex-mini-button',
					style: 'font-weight: 700; padding: 6px 12px;',
					click: function() {
						editors.forEach(function(ed) {
							if (presetDown > 0) ed.download.node.value = Math.round(presetDown * 0.93 * 10) / 10;
							if (presetUp > 0) ed.upload.node.value = Math.round(presetUp * 0.93 * 10) / 10;
						});
						ui.addNotification(null, E('p', {}, ['✓ Limites anti-bufferbloat (-7%) aplicados a partir da medição do Fast.com!']), 'info');
					}
				}, ['🎯 Aplicar nos Limites'])
			]) : '';

			ui.showModal('Editar SQM / CAKE',[
				E('div',{style:'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;'},[
					E('p',{class:'ex-muted',style:'margin:0;'},[_t('Defina os limites em Mbps. Exemplo: 1,2 Gbps = 1200 Mbps. Use 0 ou deixe em branco quando não quiser limitar aquela direção (ilimitado).')]),
					E('div',{style:'display:flex;gap:8px;flex-wrap:wrap;'},[
						E('button',{class:'ex-mini-button','click':L.bind(function(){ui.hideModal();this.openFastCom();},this)},['🎬 ' + _t('Medir no Fast.com')]),
						E('a',{href:'https://www.waveform.com/tools/bufferbloat',target:'_blank',rel:'noopener noreferrer',class:'ex-mini-button',style:'text-decoration:none;background:rgba(16,185,129,.16);border-color:rgba(16,185,129,.4);color:#34d399;font-weight:700;'},['🏆 Testar no Waveform ↗'])
					])
				]),
				waveformAplusBanner,
				speedtestBanner,
				flowOffloadNotice,
				mipsNotice,
				E('div',{class:'ex-qos-wan-list',style:'display:flex;flex-direction:column;gap:14px;'},editors.map(function(editor){return editor.section;})),
				guestSection,
				E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
			const btn = ev.currentTarget;
			const args=['sqm-save-v2', 'waveform_aplus=' + (modalWaveformInput.checked ? '1' : '0')];let invalid=false;
			editors.forEach(function(editor){
				const profile=editor.profile;
				const dRaw=String(editor.download.node.value||'').trim();
				const uRaw=String(editor.upload.node.value||'').trim();
				const download=(dRaw===''||dRaw==='0')?'0':mbpsToKbps(dRaw);
				const upload=(uRaw===''||uRaw==='0')?'0':mbpsToKbps(uRaw);
				if(download==null||upload==null)invalid=true;

				const parts = (editor.overheadSelect.value || 'none|0').split('|');
				const linklayer = parts[0] || 'none';
				const overhead = parts[1] || '0';
				let eqOpts = [];
				let iqOpts = [];
				const saveMemlimit = audit.cake_memlimit || '32M';
				if (editor.chkDiffserv.checked) { eqOpts.push('diffserv4'); iqOpts.push('besteffort'); } else { eqOpts.push('besteffort'); iqOpts.push('besteffort'); }
				if (editor.chkNat.checked) { eqOpts.push('nat'); iqOpts.push('nat'); }
				if (editor.chkHostFair.checked) { eqOpts.push('dual-srchost'); iqOpts.push('dual-dsthost'); }
				if (editor.chkAck.checked) { eqOpts.push('ack-filter'); }
				if (editor.chkWash.checked) { eqOpts.push('wash'); iqOpts.push('wash'); }
				eqOpts.push('memlimit ' + saveMemlimit);
				iqOpts.push('ingress memlimit ' + saveMemlimit);
				const eqStr = eqOpts.join(' ');
				const iqStr = iqOpts.join(' ');

				args.push('wan='+[
					profile.section,
					profile.network,
					profile.device,
					editor.enabled.checked?'1':'0',
					download,
					upload,
					linklayer,
					overhead,
					eqStr,
					iqStr
				].join('|'));
			});
			const gDRaw=String(guestDown.node.value||'').trim();
			const gURaw=String(guestUp.node.value||'').trim();
			const guestDownload=(gDRaw===''||gDRaw==='0')?'0':mbpsToKbps(gDRaw);
			const guestUpload=(gURaw===''||gURaw==='0')?'0':mbpsToKbps(gURaw);
			if(invalid||guestDownload==null||guestUpload==null){ui.addNotification(null,E('p',{},['Informe velocidades válidas em Mbps ou 0 para ilimitado.']),'danger');return;}
			btn.disabled = true;
			btn.classList.add('is-busy');
			btn.innerHTML = '<span class="ex-spinner-inline"></span> ' + _t('Salvando SQM…');
			args.push('guest_download='+guestDownload,'guest_upload='+guestUpload);
			return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(L.bind(function(r){
				if(r.code)throw new Error(r.stderr||'Falha ao salvar limites');
				btn.classList.remove('is-busy');
				btn.classList.add('is-success');
				btn.innerHTML = '✓ ' + _t('SQM Salvo!');
				window.setTimeout(L.bind(function() {
					ui.hideModal();
					this.triggerImmediateRefresh('Limites de velocidade SQM / CAKE salvos com sucesso!', 'info');
				}, this), 600);
			}, this)).catch(function(e){
				btn.classList.remove('is-busy');
				btn.disabled = false;
				btn.textContent = _t('Salvar e reiniciar SQM');
				if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
				ui.addNotification(null,E('p',{},[e.message]),'danger');
			});
		},this)},[_t('Salvar e reiniciar SQM')])])]);
		}, this));
	},
	editWan: function(which, preferredDevice){
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['pppoe-profiles-list']).then(L.bind(function(profRes){
			let profData = { profiles: [] };
			try { profData = JSON.parse(profRes.stdout || '{}'); } catch(e) {}
			let savedProfiles = profData.profiles || [];
			const isPrimary = (which === 'wan' || which === 'wan1');
			const net = values((this.currentData||{}).networkConfig);
			const cfg = net[which] || {};
			const whichNum = which.replace(/\D/g,'') || '1';
			const whichLabel = 'WAN' + whichNum;
			const makeSelect=function(value,items){const s=E('select',{class:'cbi-input-select'},items.map(function(i){return E('option',{value:i[0]},[i[1]]);}));s.value=value;return s;};
			const detectedDev=cfg.device||((iface((this.currentData||{}).interfaces,which)||{}).l3_device)||((iface((this.currentData||{}).interfaces,which)||{}).device)||'';
			const targetDev=(!isPrimary&&preferredDevice)?preferredDevice:detectedDev;
			const chosenPortLabel = portLabel(targetDev || (!isPrimary ? 'lan1' : 'eth1'));
			const isPrimaryOnLanPort = isPrimary && /^lan[1-4]$/i.test(String(targetDev || ''));
			const nativeWanPort = (function(d) {
				const lp = (d && d.lanPorts) || [];
				for (let i = 0; i < lp.length; i++) {
					if (lp[i] === 'eth1' || lp[i] === 'lan5' || lp[i] === 'port5' || lp[i] === 'wan' || lp[i] === 'eth0.2') return lp[i];
				}
				return 'eth1';
			})(this.currentData);
			const wanPorts = [[targetDev || (!isPrimary ? 'lan1' : 'eth1'), chosenPortLabel]];
			if (isPrimaryOnLanPort && nativeWanPort !== targetDev) {
				wanPorts.push([nativeWanPort, 'PORTA WAN (Padrão)']);
			}
			const roleOptions = !isPrimary
				? [['wan','Usar como internet / '+whichLabel],['lan','Voltar porta para LAN']]
				: (isPrimaryOnLanPort
					? [['wan','Usar como internet / WAN1'],['lan','Voltar ' + chosenPortLabel + ' para LAN (Restaurar WAN1 na Porta WAN)']]
					: [['wan','Usar como internet / WAN1']]);
			const role=makeSelect((!isPrimary&&cfg.proto==='none'&&!preferredDevice)?'lan':'wan', roleOptions);
			const device=makeSelect(targetDev||(!isPrimary?'lan1':'eth1'),wanPorts);
			device.disabled = !isPrimaryOnLanPort;
			const proto=makeSelect(cfg.proto==='pppoe'?'pppoe':(cfg.proto==='static'?'static':'dhcp'),[['dhcp','DHCP automático'],['pppoe','PPPoE'],['static','IP fixo / estático']]);
			const username=E('input',{class:'cbi-input-text',value:cfg.username||'',placeholder:'usuário PPPoE'});
			const password=E('input',{type:'password',class:'cbi-input-text',value:cfg.password||'',placeholder:'senha PPPoE'});
			const passToggleBtn=E('button',{
				type:'button',
				class:'ex-mini-button',
				click:function(){
					const isPass = password.type === 'password';
					password.type = isPass ? 'text' : 'password';
					passToggleBtn.textContent = isPass ? '👁️ Ocultar' : '👁️ Ver senha';
				}
			},['👁️ Ver senha']);
			const passWrap=E('div',{class:'ex-wan-pass-wrap'},[password,passToggleBtn]);
			const ipaddr=E('input',{class:'cbi-input-text',value:cfg.ipaddr||'',placeholder:'192.0.2.10'});
			const netmask=E('input',{class:'cbi-input-text',value:cfg.netmask||'255.255.255.0',placeholder:'255.255.255.0'});
			const gateway=E('input',{class:'cbi-input-text',value:cfg.gateway||'',placeholder:'192.0.2.1'});
			const dnsList=Array.isArray(cfg.dns)?cfg.dns:String(cfg.dns||'1.1.1.1 8.8.8.8').split(/\s+/);
			const dns1=E('input',{class:'cbi-input-text',value:dnsList[0]||'1.1.1.1'}), dns2=E('input',{class:'cbi-input-text',value:dnsList[1]||'8.8.8.8'}), dns3=E('input',{class:'cbi-input-text',value:dnsList[2]||'',placeholder:'opcional'});
			let clonedMac=cfg.macaddr||'';
			if(!clonedMac && targetDev) {
				for(let k in net) {
					const sec = net[k];
					if(sec && (sec['.type'] === 'device' || sec.name) && sec.name === targetDev && sec.macaddr) {
						clonedMac = sec.macaddr;
						break;
					}
				}
			}
			const macaddr=E('input',{class:'cbi-input-text',value:clonedMac,placeholder:'vazio = MAC físico do roteador'});
			const macClear=E('button',{class:'ex-feature-link',type:'button','click':function(){macaddr.value='';}},['Usar MAC físico']);
			const modemIp=E('input',{class:'cbi-input-text',value:cfg.modem_ip||'',placeholder:'ex: 192.168.1.3 (opcional)'});
			const defaultMetric=String(cfg.metric||(parseInt(whichNum,10)*10));
			const metricInput=E('input',{class:'cbi-input-text',type:'number',min:'1',max:'255',value:defaultMetric,placeholder:'Ex: 10, 20, 30'});
			const ipv6Enabled=(cfg.ipv6==='1'||cfg.ipv6===1||cfg.ipv6===true||(isPrimary&&cfg.ipv6===undefined));
			const ipv6Input=E('input',{type:'checkbox',class:'cbi-input-checkbox',checked:ipv6Enabled ? '' : null});
			ipv6Input.checked = !!ipv6Enabled;
			const ipv6Switch=E('label',{class:'ex-switch'},[ipv6Input,E('span',{class:'ex-switch-slider'})]);

			const which6Cfg = net[which === 'wan' ? 'wan6' : (which + '_6')] || net[which + '6'] || {};
			let otherDelegatingWan = null;
			for (let ifaceKey in net) {
				if (ifaceKey !== which && /^wan[0-9]*$/.test(ifaceKey) && ifaceKey !== 'wan6') {
					const otherCfg = net[ifaceKey] || {};
					const other6Key = (ifaceKey === 'wan' ? 'wan6' : (ifaceKey + '_6'));
					const other6Cfg = net[other6Key] || net[ifaceKey + '6'] || {};
					const otherProto = otherCfg.proto;
					if (otherProto && otherProto !== 'none') {
						const isOtherPrimary = (ifaceKey === 'wan' || ifaceKey === 'wan1');
						const otherDelegated = (otherCfg.delegate === '1' || otherCfg.delegate === 1 || other6Cfg.delegate === '1' || other6Cfg.delegate === 1 ||
							(isOtherPrimary && otherCfg.delegate !== '0' && other6Cfg.delegate !== '0' && otherCfg.ipv6 !== '0' && cfg.delegate !== '1' && which6Cfg.delegate !== '1'));
						if (otherDelegated) {
							const otherNum = ifaceKey.replace(/\D/g, '') || '1';
							otherDelegatingWan = 'WAN' + otherNum;
							break;
						}
					}
				}
			}

			const isCurrentlyDelegating = (cfg.delegate === '1' || cfg.delegate === 1 || cfg.delegate === true ||
				which6Cfg.delegate === '1' || which6Cfg.delegate === 1 || which6Cfg.delegate === true ||
				(isPrimary && cfg.delegate !== '0' && which6Cfg.delegate !== '0' && ipv6Enabled && !otherDelegatingWan));

			const delegateInput = E('input', { type: 'checkbox', class: 'cbi-input-checkbox', checked: (isCurrentlyDelegating && !otherDelegatingWan) ? '' : null });
			delegateInput.checked = !!(isCurrentlyDelegating && !otherDelegatingWan);
			const delegateSwitch = E('label', { class: 'ex-switch' }, [delegateInput, E('span', { class: 'ex-switch-slider' })]);
			const delegateHint = E('small', { class: 'ex-muted' }, ['']);

			const updateDelegateState = function() {
				if (!ipv6Input.checked) {
					delegateInput.checked = false;
					delegateInput.disabled = true;
					delegateHint.textContent = _t("Requer 'Conectividade IPv6' ativa nesta WAN.");
					delegateHint.style.color = 'var(--text-muted, #94a3b8)';
				} else if (otherDelegatingWan) {
					delegateInput.checked = false;
					delegateInput.disabled = true;
					const template = _t("A distribuição já está ativa na %s. Desative na %s primeiro para ativar aqui.");
					delegateHint.textContent = template.replace(/%s/g, otherDelegatingWan);
					delegateHint.style.color = '#f59e0b';
				} else {
					delegateInput.disabled = false;
					delegateHint.textContent = _t("Distribui o bloco IPv6 público desta operadora para os dispositivos locais (DHCPv6-PD). Apenas uma WAN pode distribuir por vez para evitar conflitos.");
					delegateHint.style.color = '';
				}
			};
			ipv6Input.addEventListener('change', updateDelegateState);
			updateDelegateState();

			const pppoeProfileSelect = E('select', { class: 'cbi-input-select', style: 'flex:1;' }, [
				E('option', { value: '' }, ['-- Escolher perfil PPPoE salvo --'])
			]);
			const profileStatus = E('span', { class: 'ex-pill online', style: 'display:none;font-size:0.75rem;' }, ['']);
			const deleteProfileBtn = E('button', {
				type: 'button',
				class: 'ex-mini-button',
				disabled: true,
				title: 'Excluir perfil salvo',
				click: function() {
					const selId = pppoeProfileSelect.value;
					const found = savedProfiles.find(function(p){ return p.id === selId; });
					if (!found) return;
					deleteProfileBtn.disabled = true;
					deleteProfileBtn.textContent = 'Excluindo…';
					fs.exec('/usr/sbin/equipe-dashboard-control', ['pppoe-profile-delete', found.id]).then(function(r){
						let data = {}; try { data = JSON.parse(r.stdout || '{}'); } catch(e) {}
						savedProfiles = data.profiles || [];
						renderProfileOptions();
						profileStatus.style.display = 'none';
						ui.addNotification(null, E('p', {}, ['Perfil PPPoE excluído.']));
					}).catch(function(e){
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					}).finally(function(){
						deleteProfileBtn.textContent = '🗑️ Excluir';
					});
				}
			}, ['🗑️ Excluir']);

			const renderProfileOptions = function(selectIdToPick) {
				pppoeProfileSelect.replaceChildren(
					E('option', { value: '' }, ['-- Escolher perfil PPPoE salvo (' + savedProfiles.length + ') --'])
				);
				savedProfiles.forEach(function(p){
					const optLabel = p.name + ' (' + (p.username || 'sem usuário') + (p.macaddr ? ' • MAC ' + p.macaddr : '') + (p.modem_ip ? ' • ONU ' + p.modem_ip : '') + ')';
					pppoeProfileSelect.appendChild(E('option', { value: p.id }, [optLabel]));
				});
				if (selectIdToPick) {
					pppoeProfileSelect.value = selectIdToPick;
					deleteProfileBtn.disabled = false;
				} else {
					pppoeProfileSelect.value = '';
					deleteProfileBtn.disabled = true;
				}
			};
			renderProfileOptions();

			pppoeProfileSelect.addEventListener('change', function(){
				const selId = pppoeProfileSelect.value;
				const found = savedProfiles.find(function(p){ return p.id === selId; });
				if (found) {
					username.value = found.username || '';
					password.value = found.password || '';
					macaddr.value = found.macaddr || '';
					modemIp.value = found.modem_ip || '';
					deleteProfileBtn.disabled = false;
					profileStatus.textContent = '✓ ' + found.name + ' aplicado';
					profileStatus.style.display = 'inline-block';
				} else {
					deleteProfileBtn.disabled = true;
					profileStatus.style.display = 'none';
				}
			});

			const savePromptInput = E('input', {
				class: 'cbi-input-text',
				type: 'text',
				placeholder: 'Ex: Fibra Vivo, Fibra Claro, Provedor X',
				maxlength: 32,
				style: 'flex: 1 1 200px; min-width: 0; min-height: 40px; padding: 0 10px;'
			});

			const saveConfirmBtn = E('button', {
				type: 'button',
				class: 'btn cbi-button cbi-button-positive',
				style: 'min-height: 40px; padding: 0 16px; font-weight: 600; user-select: none; -webkit-tap-highlight-color: transparent;',
				click: function() { doSaveProfile(); }
			}, ['Confirmar']);

			const saveCancelBtn = E('button', {
				type: 'button',
				class: 'btn cbi-button cbi-button-neutral',
				style: 'min-height: 40px; padding: 0 12px; user-select: none; -webkit-tap-highlight-color: transparent;',
				click: function() {
					savePromptBox.style.display = 'none';
					saveProfileBtn.disabled = false;
				}
			}, ['Cancelar']);

			const savePromptBox = E('div', {
				class: 'ex-save-profile-prompt',
				style: 'display: none; margin-top: 8px; padding: 10px 12px; background: rgba(30,41,59,0.9); border: 1px solid rgba(59,130,246,0.4); border-radius: 8px;'
			}, [
				E('strong', { style: 'font-size: 0.85rem; color: #60a5fa; display: block; margin-bottom: 4px;' }, [
					'💾 Salvar Perfil PPPoE Atual'
				]),
				E('small', { class: 'ex-muted', style: 'display: block; margin-bottom: 8px; line-height: 1.3;' }, [
					'Dê um nome para salvar estas credenciais (usuário, senha, MAC e IP da ONU):'
				]),
				E('div', { style: 'display: flex; gap: 8px; align-items: center; flex-wrap: wrap;' }, [
					savePromptInput,
					saveConfirmBtn,
					saveCancelBtn
				])
			]);

			savePromptInput.addEventListener('keydown', function(ev) {
				if (ev.key === 'Enter') {
					ev.preventDefault();
					doSaveProfile();
				} else if (ev.key === 'Escape') {
					ev.preventDefault();
					savePromptBox.style.display = 'none';
					saveProfileBtn.disabled = false;
				}
			});

			const doSaveProfile = function() {
				const profName = savePromptInput.value.trim();
				if (!profName) {
					ui.addNotification(null, E('p', {}, ['Informe um nome para o perfil.']), 'warning');
					savePromptInput.focus();
					return;
				}
				const u = username.value.trim();
				const p = password.value;
				const m = macaddr.value.trim();
				const mip = modemIp.value.trim();

				saveConfirmBtn.disabled = true;
				saveConfirmBtn.textContent = 'Salvando…';
				fs.exec('/usr/sbin/equipe-dashboard-control', [
					'pppoe-profile-save',
					'name=' + profName,
					'username=' + u,
					'password=' + p,
					'macaddr=' + m,
					'modem_ip=' + mip
				]).then(function(r){
					if (r.code) throw new Error(r.stderr || 'Falha ao salvar perfil');
					let data = {}; try { data = JSON.parse(r.stdout || '{}'); } catch(e) {}
					savedProfiles = data.profiles || [];
					const newly = savedProfiles.find(function(item){ return item.name === profName; });
					renderProfileOptions(newly ? newly.id : '');
					profileStatus.textContent = '✓ ' + profName + ' salvo';
					profileStatus.style.display = 'inline-block';
					savePromptBox.style.display = 'none';
					ui.addNotification(null, E('p', {}, [_t('Perfil PPPoE salvo com sucesso!') + ' ("' + profName + '")']));
				}).catch(function(e){
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				}).finally(function(){
					saveConfirmBtn.disabled = false;
					saveConfirmBtn.textContent = _t('Confirmar');
					saveProfileBtn.disabled = false;
				});
			};

			const saveProfileBtn = E('button', {
				type: 'button',
				class: 'ex-mini-button',
				click: function(){
					const u = username.value.trim();
					if (!u) {
						ui.addNotification(null, E('p', {}, ['Preencha ao menos o Usuário PPPoE antes de salvar o perfil.']), 'warning');
						return;
					}
					savePromptInput.value = u.split('@')[0] || 'Novo Perfil';
					savePromptBox.style.display = 'block';
					savePromptInput.focus();
					savePromptInput.select();
				}
			}, ['💾 Salvar perfil']);

			const viewPppoeLogsBtn = E('button', {
				class: 'btn cbi-button',
				type: 'button',
				style: 'font-size:0.8rem; padding:3px 8px; background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.35); font-weight:600; border-radius:4px;',
				title: 'Ver histórico e diagnóstico da conexão PPPoE',
				click: L.bind(function() {
					this.showPppoeLogsModal(which, whichLabel);
				}, this)
			}, ['📜 Logs PPPoE']);

			const pppoeProfileBar = E('div', { class: 'ex-pppoe-profile-bar', style: 'grid-column: 1 / -1; margin-bottom: 8px; padding: 10px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2); border-radius: 8px;' }, [
				E('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;' }, [
					E('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
						E('strong', { style: 'font-size:0.85rem;' }, ['🏷️ Perfis PPPoE Salvos']),
						profileStatus
					]),
					E('div', { style: 'display:flex; gap:6px;' }, [
						viewPppoeLogsBtn,
						saveProfileBtn,
						deleteProfileBtn
					])
				]),
				E('div', { style: 'display:flex; gap:8px; align-items:center;' }, [
					pppoeProfileSelect
				]),
				E('small', { class: 'ex-muted', style: 'margin-top:4px; display:block;' }, ['Salva e preenche Usuário, Senha, MAC Clonado e IP da ONU em 1 clique para qualquer WAN.']),
				savePromptBox
			]);

			const field=function(label,node,hint,extraClass){return E('label',{class:'ex-wan-edit-field'+(extraClass?(' '+extraClass):'')},[E('span',{},[label]),node,(hint instanceof Node)?hint:(hint?E('small',{class:'ex-muted'},[hint]):'')]);};
			const pppoeBlock=E('div',{class:'ex-wan-proto-block'},[
				pppoeProfileBar,
				field('Usuário PPPoE',username),
				field('Senha PPPoE',passWrap,'Deixe vazio para manter/definir vazia conforme operadora','ex-wan-field-wide'),
				field('IP de Acesso ao Modem / ONU',modemIp,'Opcional: permite abrir o painel web da ONU em Bridge (ex: 192.168.1.3 ou 192.168.51.2)','ex-wan-field-wide')
			]);
			const staticBlock=E('div',{class:'ex-wan-proto-block'},[field('IPv4',ipaddr),field('Máscara',netmask),field('Gateway',gateway)]);
			const isNewWan = !!(preferredDevice && (!cfg.proto || cfg.proto === 'none'));
			const isExistingWan = !isNewWan && !!(cfg.proto && cfg.proto !== 'none');
			const optButton = isExistingWan ? E('div', { class: 'ex-wan-opt-wrap', style: 'grid-column: 1 / -1; margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(127,127,127,.15);' }, [
				E('button', {
					class: 'ex-mini-button',
					type: 'button',
					style: 'width:100%;justify-content:center;font-weight:700;padding:8px;',
					click: L.bind(function() {
						closeModal();
						this.showWanOptimizationsModal(which);
					}, this)
				}, ['⚡ Otimizar Velocidade e Desempenho desta WAN →'])
			]) : null;
			const sync=function(){
				const lanMode=!isPrimary&&role.value==='lan';
				if (isPrimaryOnLanPort) {
					if (role.value === 'lan') {
						device.value = nativeWanPort;
						device.disabled = true;
					} else {
						device.disabled = false;
					}
				}
				proto.disabled=lanMode;
				pppoeBlock.style.display=(!lanMode&&proto.value==='pppoe')?'contents':'none';
				staticBlock.style.display=(!lanMode&&proto.value==='static')?'contents':'none';
				const optWrap = document.querySelector('.ex-wan-opt-wrap');
				if (optWrap) optWrap.style.display = lanMode ? 'none' : 'block';
			};
			role.addEventListener('change',sync);proto.addEventListener('change',sync);sync();
			const modalTitle = isNewWan ? ('Configurar ' + chosenPortLabel + ' como ' + whichLabel) : ('Editar ' + whichLabel + ' (' + chosenPortLabel + ')');
			const gridChildren = [
				field('Função',role),
				field('Porta física',device,'Porta vinculada ao card selecionado'),
				field('Tipo de conexão',proto),
				field('Prioridade / Métrica (Peso)',metricInput,'Menor número = maior prioridade (ex: WAN1=10, WAN2=20). Não pode haver WANs com o mesmo peso.'),
				field('Conectividade IPv6',ipv6Switch,'Habilita requisição de endereço e rota IPv6 nesta conexão WAN.'),
				field(_t('Distribuir IPv6 na LAN'),delegateSwitch,delegateHint),
				pppoeBlock,
				staticBlock,
				field('DNS 1',dns1),
				field('DNS 2',dns2),
				field('DNS 3',dns3,'Opcional'),
				field('Clonar MAC da WAN',E('div',{class:'ex-wan-mac-control'},[macaddr,macClear]),clonedMac?'MAC clonado atual. Apague para voltar ao físico.':'Sem clone: usa o MAC físico da porta.','ex-wan-field-wide'),
				optButton
			].filter(Boolean);
			const warningNotice = isNewWan ? E('div', { class: 'alert-message warning', style: 'border-left: 4px solid #f59e0b; margin-bottom: 12px;' }, [
				E('strong', {}, ['⚠️ Atenção: A porta ' + chosenPortLabel + ' deixará de ser LAN e virará ' + whichLabel + '. ']),
				'Fique atento à escolha para não perder o acesso ao roteador (conecte-se via Wi-Fi ou por outra porta LAN).'
			]) : E('p', { class: 'alert-message warning' }, ['Alterar internet/porta pode derrubar o painel por alguns segundos. O ARK cria um backup antes de aplicar.']);

			ui.showModal(modalTitle,[
				warningNotice,
				E('div',{class:'ex-wan-edit-grid'},gridChildren),
				E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
					const isConvertingToWan = (role.value === 'wan') && (isNewWan || preferredDevice);
					const doApply = function() {
						const chosenMetric = parseInt(metricInput.value, 10);
						if (!chosenMetric || chosenMetric < 1 || chosenMetric > 255) {
							ui.addNotification(null, E('p', {}, ['A métrica / prioridade da WAN deve ser um número entre 1 e 255.']), 'warning');
							return;
						}
						for (let otherIface in net) {
							if (otherIface !== which && /^wan[0-9]*$/.test(otherIface) && otherIface !== 'wan6') {
								const otherCfg = net[otherIface];
								if (otherCfg && otherCfg.proto && otherCfg.proto !== 'none') {
									const otherMetric = parseInt(otherCfg.metric, 10);
									if (otherMetric === chosenMetric) {
										ui.addNotification(null, E('p', {}, ['Conflito de prioridade: A conexão ' + otherIface.toUpperCase() + ' já utiliza a métrica ' + chosenMetric + '. Cada conexão precisa ter um peso exclusivo para evitar instabilidade de rotas.']), 'danger');
										return;
									}
									const typedMac = macaddr.value.trim().toUpperCase();
									if (typedMac) {
										const otherMac = String(otherCfg.macaddr || '').trim().toUpperCase();
										if (otherMac && otherMac === typedMac) {
											ui.addNotification(null, E('p', {}, ['Conflito de MAC: O endereço ' + typedMac + ' já está clonado na conexão ' + otherIface.toUpperCase() + '. Cada conexão WAN deve possuir um MAC exclusivo.']), 'danger');
											return;
										}
									}
								}
							}
						}
						const chosenIpv6 = ipv6Input.checked ? '1' : '0';
						const chosenDelegate = (ipv6Input.checked && delegateInput.checked) ? '1' : '0';
						const dns = [dns1.value.trim(), dns2.value.trim(), dns3.value.trim()].filter(Boolean).join(' ');
						const args = ['wan-save', 'iface=' + which, 'mode=' + role.value, 'device=' + device.value, 'proto=' + proto.value, 'metric=' + chosenMetric, 'ipv6=' + chosenIpv6, 'delegate=' + chosenDelegate, 'username=' + username.value, 'password=' + password.value, 'ipaddr=' + ipaddr.value, 'netmask=' + netmask.value, 'gateway=' + gateway.value, 'dns=' + dns, 'macaddr=' + macaddr.value.trim(), 'modem_ip=' + modemIp.value.trim()];
						return fs.exec('/usr/sbin/equipe-dashboard-control', args).then(function(r) {
							if (r.code) throw new Error(r.stderr || 'Falha ao salvar WAN');
							ui.hideModal();
							reloadSoon('Configuração de internet salva. Recarregando após estabilizar a rede…', 1500);
						}).catch(function(e) {
							if (reloadAfterExpectedDisconnect(e, 'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…', 4200)) return;
							ui.addNotification(null, E('p', {}, [e.message]), 'danger');
						});
					};

					if (isConvertingToWan) {
						ui.showModal('⚠️ Confirmar Conversão da Porta ' + chosenPortLabel, [
							E('div', { class: 'alert-message warning', style: 'border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.14); padding: 14px 16px; border-radius: 10px; margin-bottom: 16px;' }, [
								E('h4', { style: 'margin: 0 0 8px 0; color: #f59e0b; font-size: 1.05rem; font-weight: 700;' }, [
									'⚠️ A porta deixará de ser LAN e virará WAN!'
								]),
								E('p', { style: 'margin: 0 0 10px 0; line-height: 1.5; font-size: 0.95rem;' }, [
									'A porta ', E('strong', {}, [chosenPortLabel]), ' deixará de fornecer rede local (LAN) e passará a funcionar como entrada de internet (', E('strong', {}, [whichLabel]), ').'
								]),
								E('p', { style: 'margin: 0; line-height: 1.5; font-size: 0.95rem; color: #fef08a;' }, [
									'🛑 ', E('strong', {}, ['Fique atento para não perder o acesso ao roteador:']),
									' Certifique-se de que o computador ou aparelho que você está usando para gerenciar o roteador ',
									E('strong', { style: 'text-decoration: underline;' }, ['NÃO está conectado nesta porta ' + chosenPortLabel]),
									'. Para não perder o acesso ao painel, conecte-se através do ',
									E('strong', {}, ['Wi-Fi']),
									' ou de ',
									E('strong', {}, ['outra porta LAN']),
									'.'
								])
							]),
							E('div', { class: 'ex-qos-edit-grid', style: 'margin-bottom: 14px;' }, [
								E('section', {}, [
									E('h3', {}, ['Porta que será convertida']),
									E('p', {}, [E('strong', { style: 'color: #38bdf8;' }, [chosenPortLabel])])
								]),
								E('section', {}, [
									E('h3', {}, ['Nova função']),
									E('p', {}, [E('strong', { style: 'color: #34d399;' }, [whichLabel + ' (' + (proto.value === 'pppoe' ? 'PPPoE' : (proto.value === 'static' ? 'IP Estático' : 'DHCP Automático')) + ')'])])
								]),
								E('section', {}, [
									E('h3', {}, ['Acesso local (LAN)']),
									E('p', {}, ['Permanece ativo no Wi-Fi e nas demais portas LAN'])
								])
							]),
							E('p', { class: 'ex-muted' }, [
								'O ARK Router cria um backup automático antes de aplicar. Deseja prosseguir com a conversão desta porta em WAN?'
							]),
							E('div', { class: 'right' }, [
								E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': L.bind(function() {
									this.editWan(which, preferredDevice);
								}, this) }, ['Voltar e revisar']),
								' ',
								E('button', { class: 'btn cbi-button cbi-button-positive', style: 'background: #2563eb !important; font-weight: 700;', 'click': doApply }, ['Entendi, converter para WAN'])
							])
						]);
						return;
					}

					return doApply();
				},this)},['Confirmar alteração'])])
			]);
		}, this));
	},
	showPppoeLogsModal: function(iface, label) {
		const wanLabel = label || (iface === 'wan' ? 'WAN1' : String(iface || '').toUpperCase());
		const logContainer = E('div', {
			class: 'ex-pppoe-log-box',
			style: 'background:#090d16; color:#94a3b8; padding:12px; border-radius:8px; font-family:Consolas,Monaco,"Courier New",monospace; font-size:0.78rem; line-height:1.5; max-height:380px; overflow-y:auto; white-space:pre-wrap; word-break:break-all; border:1px solid rgba(255,255,255,0.08); margin:10px 0;'
		}, [E('span', { class: 'ex-muted' }, ['Carregando logs do PPPoE…'])]);

		const statusBadge = E('span', {
			class: 'ex-pill standby',
			style: 'font-size:0.75rem; margin-left:8px; vertical-align:middle;'
		}, ['Consultando…']);

		const linesSelect = E('select', { class: 'cbi-input-select', style: 'font-size:0.8rem; padding:2px 6px;' }, [
			E('option', { value: '50' }, ['Últimas 50 linhas']),
			E('option', { value: '120', selected: 'selected' }, ['Últimas 120 linhas']),
			E('option', { value: '250' }, ['Últimas 250 linhas']),
			E('option', { value: '500' }, ['Últimas 500 linhas'])
		]);

		const refreshBtn = E('button', {
			class: 'btn cbi-button cbi-button-action',
			type: 'button',
			style: 'font-size:0.8rem; padding:3px 10px;'
		}, ['🔄 Atualizar']);

		const copyBtn = E('button', {
			class: 'btn cbi-button cbi-button-neutral',
			type: 'button',
			style: 'font-size:0.8rem; padding:3px 10px;'
		}, ['📋 Copiar']);

		let rawLogText = '';

		const fetchLogs = L.bind(function() {
			refreshBtn.disabled = true;
			refreshBtn.textContent = 'Carregando…';
			statusBadge.textContent = 'Buscando…';
			statusBadge.className = 'ex-pill standby';

			const lines = linesSelect.value || '120';
			return fs.exec('/usr/sbin/equipe-dashboard-control', ['pppoe-log', lines]).then(function(res) {
				refreshBtn.disabled = false;
				refreshBtn.textContent = '🔄 Atualizar';
				rawLogText = (res.stdout || '').trim();

				if (!rawLogText || rawLogText.indexOf('(Nenhum evento') === 0) {
					logContainer.innerHTML = '';
					const isCleanActive = (rawLogText && rawLogText.indexOf('ativa e estável') !== -1);
					if (isCleanActive) {
						statusBadge.textContent = '● Conectado & Estável (0 erros)';
						statusBadge.className = 'ex-pill online';
						logContainer.appendChild(E('div', { style: 'color:#34d399; font-weight:600; margin-bottom:6px;' }, [
							'✓ Sessão PPPoE Ativa e 100% Estável'
						]));
						logContainer.appendChild(E('div', { class: 'ex-muted' }, [
							'Nenhuma queda, timeout ou erro de autenticação registrado no log.',
							E('br'),
							'A conexão está funcionando normalmente sem interrupções.'
						]));
					} else {
						statusBadge.textContent = 'Sem eventos recentes';
						statusBadge.className = 'ex-pill standby';
						logContainer.appendChild(E('span', { class: 'ex-muted' }, [rawLogText || '(Nenhum evento PPPoE encontrado no buffer de log)']));
					}
					return;
				}

				const recentLines = rawLogText.split('\n').slice(-5).join(' ');
				if (/local\s+IP address|CHAP authentication succeeded/i.test(recentLines)) {
					statusBadge.textContent = '● Autenticado & Conectado';
					statusBadge.className = 'ex-pill online';
				} else if (/Modem hangup|Connection terminated|Timeout waiting|failed/i.test(recentLines)) {
					statusBadge.textContent = '▲ Desconectado / Reconectando';
					statusBadge.className = 'ex-pill offline';
				} else {
					statusBadge.textContent = '● Ativo';
					statusBadge.className = 'ex-pill online';
				}

				logContainer.innerHTML = '';
				const linesArr = rawLogText.split('\n');
				linesArr.forEach(function(line) {
					const lineDiv = E('div', { style: 'padding:1px 0;' });
					if (/succeeded|authorized|local\s+IP address/i.test(line)) {
						lineDiv.style.color = '#34d399';
						lineDiv.style.fontWeight = '600';
					} else if (/failed|terminated|hangup|Permission denied|timed? ?out/i.test(line)) {
						lineDiv.style.color = '#f87171';
						lineDiv.style.fontWeight = '600';
					} else if (/Connected to|Connect:|session is/i.test(line)) {
						lineDiv.style.color = '#60a5fa';
					} else if (/remote IP|primary\s+DNS|secondary\s+DNS/i.test(line)) {
						lineDiv.style.color = '#38bdf8';
					} else {
						lineDiv.style.color = '#94a3b8';
					}
					lineDiv.textContent = line;
					logContainer.appendChild(lineDiv);
				});

				window.setTimeout(function() {
					logContainer.scrollTop = logContainer.scrollHeight;
				}, 50);
			}).catch(function(err) {
				refreshBtn.disabled = false;
				refreshBtn.textContent = '🔄 Atualizar';
				statusBadge.textContent = 'Erro';
				statusBadge.className = 'ex-pill offline';
				logContainer.innerHTML = '';
				logContainer.appendChild(E('span', { style: 'color:#f87171;' }, ['Erro ao consultar logs: ' + (err.message || err)]));
			});
		}, this);

		refreshBtn.addEventListener('click', fetchLogs);
		linesSelect.addEventListener('change', fetchLogs);

		copyBtn.addEventListener('click', function() {
			if (!rawLogText) return;
			if (navigator.clipboard && navigator.clipboard.writeText) {
				navigator.clipboard.writeText(rawLogText).then(function() {
					ui.addNotification(null, E('p', {}, ['Logs PPPoE copiados para a área de transferência!']));
				});
			} else {
				const ta = E('textarea', { style: 'position:absolute; left:-9999px;' }, [rawLogText]);
				document.body.appendChild(ta);
				ta.select();
				document.execCommand('copy');
				document.body.removeChild(ta);
				ui.addNotification(null, E('p', {}, ['Logs PPPoE copiados!']));
			}
		});

		const modalContent = [
			E('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;' }, [
				E('div', { style: 'display:flex; align-items:center;' }, [
					E('strong', { style: 'font-size:0.9rem;' }, ['Histórico de Conexão & Sessão']),
					statusBadge
				]),
				E('div', { style: 'display:flex; align-items:center; gap:6px;' }, [
					linesSelect,
					refreshBtn,
					copyBtn
				])
			]),
			logContainer,
			E('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-top:8px; flex-wrap:wrap; gap:8px;' }, [
				E('small', { class: 'ex-muted' }, [
					'💡 Linhas em ',
					E('span', { style: 'color:#34d399; font-weight:bold;' }, ['verde']),
					' indicam sucesso e IPs obtidos. Linhas em ',
					E('span', { style: 'color:#f87171; font-weight:bold;' }, ['vermelho']),
					' indicam desconexão ou falha de autenticação.'
				]),
				E('button', {
					class: 'btn cbi-button cbi-button-neutral',
					type: 'button',
					click: function() { ui.hideModal(); }
				}, ['Fechar'])
			])
		];

		ui.showModal('📜 Logs e Diagnóstico PPPoE — ' + wanLabel, modalContent);
		fetchLogs();
	},
	showLatencyTargetModal: function() {
		const currentInfo = getPingTargetInfo(this.currentData);
		let selectedTarget = currentInfo.target || 'cloudflare';
		let customIpVal = currentInfo.customIp || '';

		const activeWans = getActiveWanList(this.currentData || {});

		const modalBody = [];

		modalBody.push(E('p', { class: 'ex-muted', style: 'margin-bottom:12px; font-size:0.86rem; line-height:1.45;' }, [
			'Selecione o servidor de destino para a medição contínua de latência (ping) das conexões WAN no painel. Servidores Anycast globais como ',
			E('strong', { style: 'color:#60a5fa;' }, ['Cloudflare (1.1.1.1)']),
			' garantem a menor latência conectando-se ao ponto de presença mais próximo da sua região.'
		]));

		const cardsContainer = E('div', { class: 'ex-ping-target-grid' });
		const customInputContainer = E('div', {
			id: 'ex-ping-custom-container',
			style: (selectedTarget === 'custom' ? 'display:block;' : 'display:none;') + 'margin-bottom:14px; padding:12px; border-radius:10px; background:rgba(127,127,127,0.08); border:1px solid rgba(127,127,127,0.15);'
		}, [
			E('label', { style: 'display:block; font-weight:700; font-size:0.85rem; margin-bottom:6px; color:#e2e8f0;' }, ['Endereço IP ou Domínio Personalizado:']),
			E('input', {
				id: 'ex-ping-custom-input',
				type: 'text',
				class: 'cbi-input-text',
				style: 'width:100%; min-height:40px; font-size:0.92rem; padding:8px 12px; border-radius:8px;',
				placeholder: 'ex: 1.0.0.1, 8.8.4.4 ou ping.seuservidor.com',
				value: customIpVal
			}),
			E('small', { class: 'ex-muted', style: 'display:block; margin-top:4px;' }, [
				'Dica: Útil para testar a rota direta até o servidor do seu jogo favorito (Riot/Steam), VPN corporativa ou filial.'
			])
		]);

		const liveResultBox = E('div', {
			id: 'ex-ping-live-box',
			class: 'ex-ping-live-result',
			style: 'display:none;'
		}, [
			E('span', { id: 'ex-ping-live-text', style: 'font-size:0.85rem; font-weight:600; color:#e2e8f0;' }, ['Testando latência…']),
			E('span', { id: 'ex-ping-live-badge', style: 'font-family:monospace; font-size:0.85rem; color:#60a5fa;' }, ['…'])
		]);

		const updateCardsSelection = function(targetKey) {
			selectedTarget = targetKey;
			const cards = cardsContainer.querySelectorAll('.ex-ping-target-card');
			cards.forEach(function(card) {
				const isIt = card.getAttribute('data-target') === targetKey;
				card.classList.toggle('is-active', isIt);
			});
			if (customInputContainer) {
				customInputContainer.style.display = (targetKey === 'custom' ? 'block' : 'none');
				if (targetKey === 'custom') {
					const inp = customInputContainer.querySelector('#ex-ping-custom-input');
					if (inp) inp.focus();
				}
			}
			if (liveResultBox) liveResultBox.style.display = 'none';
		};

		PING_TARGET_PRESETS.forEach(function(preset) {
			const isActive = (preset.id === selectedTarget);
			const latencyBadge = E('span', {
				id: 'ex-ping-card-val-' + preset.id,
				class: 'ex-ping-card-metric',
				style: 'display:none; font-family:monospace; font-size:0.75rem; font-weight:750; padding:2px 7px; border-radius:6px; transition:all 0.2s ease;'
			}, ['-- ms']);

			const card = E('div', {
				class: 'ex-ping-target-card' + (isActive ? ' is-active' : ''),
				'data-target': preset.id,
				click: function() { updateCardsSelection(preset.id); }
			}, [
				E('div', { class: 'ex-ping-target-card-header' }, [
					E('div', { class: 'ex-ping-target-card-title' }, [
						preset.shortLabel.split(' ')[0] + ' ',
						preset.title
					]),
					E('div', { style: 'display:flex; align-items:center; gap:6px; flex-shrink:0;' }, [
						latencyBadge,
						preset.badge ? E('span', {
							class: 'ex-ping-target-card-badge',
							style: preset.badge === 'IPv6' ? 'background:rgba(168,85,247,0.2); color:#c084fc; border-color:rgba(168,85,247,0.35);' : ''
						}, [ preset.badge ]) : ''
					])
				]),
				E('div', { class: 'ex-ping-target-card-ip' }, [ 'Alvo: ' + preset.ip ]),
				E('div', { class: 'ex-ping-target-card-desc' }, [ preset.desc ])
			]);
			cardsContainer.appendChild(card);
		});

		modalBody.push(cardsContainer);
		modalBody.push(customInputContainer);
		modalBody.push(liveResultBox);

		const testBtn = E('button', {
			class: 'btn cbi-button',
			style: 'min-height:40px; padding:0 14px; background:rgba(59,130,246,0.15); color:#60a5fa; border:1px solid rgba(59,130,246,0.3); font-weight:700; user-select:none; -webkit-tap-highlight-color:transparent;',
			click: L.bind(function() {
				const customInp = document.getElementById('ex-ping-custom-input');
				const customVal = (customInp && customInp.value) ? customInp.value.trim() : '';

				testBtn.disabled = true;
				testBtn.textContent = '⏳ Comparando todos os alvos…';
				if (liveResultBox) {
					liveResultBox.style.display = 'flex';
					const lt = document.getElementById('ex-ping-live-text');
					const lb = document.getElementById('ex-ping-live-badge');
					if (lt) lt.textContent = 'Disparando ping simultâneo para todos os alvos…';
					if (lb) lb.textContent = 'Aguarde';
				}

				PING_TARGET_PRESETS.forEach(function(p) {
					const b = document.getElementById('ex-ping-card-val-' + p.id);
					if (b) {
						if (p.id === 'custom' && !customVal) {
							b.style.display = 'none';
						} else {
							b.style.display = 'inline-flex';
							b.textContent = '…';
							b.style.background = 'rgba(148,163,184,0.15)';
							b.style.color = '#94a3b8';
							b.style.border = '1px solid rgba(148,163,184,0.3)';
						}
					}
				});

				const allPresetPromises = PING_TARGET_PRESETS.map(function(preset) {
					if (preset.id === 'custom' && !customVal) {
						return Promise.resolve({ presetId: preset.id, skip: true });
					}
					const wanPromises = activeWans.map(function(w) {
						const live = iface((this.currentData||{}).interfaces, w.iface);
						const cfg = ((values((this.currentData||{}).networkConfig))[w.iface]) || {};
						const logicalDev = live ? (live.l3_device || live.device || cfg.device || w.iface) : w.iface;
						const targetHost = resolvePingTarget(preset.id, customVal, live, cfg);
						const isV6 = targetHost && targetHost.indexOf(':') !== -1;
						const ip = (live && live['ipv4-address'] && live['ipv4-address'][0] && live['ipv4-address'][0].address) || '';
						const bindTarget = isV6 ? logicalDev : (ip || logicalDev);
						return safe(fs.exec('/bin/ping', ['-c', '1', '-W', '2', '-I', bindTarget, targetHost]), {}).then(function(res) {
							return { wan: w.label, ping: parsePing(res) };
						});
					}, this);

					return Promise.all(wanPromises).then(function(wanResults) {
						const validPings = wanResults.map(function(r){ return r.ping; }).filter(function(p){ return p != null; });
						const avgPing = validPings.length ? (validPings.reduce(function(a,b){ return a+b; }, 0) / validPings.length) : null;
						return {
							presetId: preset.id,
							presetTitle: preset.title,
							wanResults: wanResults,
							avgPing: avgPing
						};
					});
				}, this);

				Promise.all(allPresetPromises).then(function(allResults) {
					testBtn.disabled = false;
					testBtn.textContent = '⚡ Testar Todas as Rotas Novamente';

					let bestResult = null;

					allResults.forEach(function(res) {
						if (!res) return;
						const badge = document.getElementById('ex-ping-card-val-' + res.presetId);
						if (!badge) return;

						if (res.skip) {
							badge.style.display = 'none';
							return;
						}

						if (res.avgPing == null) {
							badge.textContent = 'Falha';
							badge.style.background = 'rgba(248,113,113,0.18)';
							badge.style.color = '#f87171';
							badge.style.border = '1px solid rgba(248,113,113,0.35)';
							return;
						}

						if (!bestResult || res.avgPing < bestResult.avgPing) {
							bestResult = res;
						}

						const pVal = res.avgPing < 10 ? res.avgPing.toFixed(1) : res.avgPing.toFixed(0);
						let label = '';
						if (res.wanResults.length > 1) {
							label = res.wanResults.map(function(w){
								return (w.wan || 'W') + ': ' + (w.ping != null ? (w.ping < 10 ? w.ping.toFixed(1) : w.ping.toFixed(0)) + 'ms' : 'X');
							}).join(' | ');
						} else {
							label = pVal + ' ms';
						}

						badge.textContent = label;
						if (res.avgPing < 25) {
							badge.style.background = 'rgba(52,211,153,0.2)';
							badge.style.color = '#34d399';
							badge.style.border = '1px solid rgba(52,211,153,0.4)';
						} else if (res.avgPing < 60) {
							badge.style.background = 'rgba(96,165,250,0.2)';
							badge.style.color = '#60a5fa';
							badge.style.border = '1px solid rgba(96,165,250,0.4)';
						} else if (res.avgPing < 120) {
							badge.style.background = 'rgba(251,191,36,0.2)';
							badge.style.color = '#fbbf24';
							badge.style.border = '1px solid rgba(251,191,36,0.4)';
						} else {
							badge.style.background = 'rgba(248,113,113,0.2)';
							badge.style.color = '#f87171';
							badge.style.border = '1px solid rgba(248,113,113,0.4)';
						}
					});

					if (bestResult && bestResult.avgPing != null) {
						const winnerBadge = document.getElementById('ex-ping-card-val-' + bestResult.presetId);
						if (winnerBadge) {
							const pVal = bestResult.avgPing < 10 ? bestResult.avgPing.toFixed(1) : bestResult.avgPing.toFixed(0);
							winnerBadge.textContent = '🏆 ' + pVal + ' ms (Mais Rápido)';
							winnerBadge.style.background = 'rgba(52,211,153,0.3)';
							winnerBadge.style.color = '#10b981';
							winnerBadge.style.border = '1px solid #10b981';
							winnerBadge.style.fontWeight = '800';
						}
						const lt = document.getElementById('ex-ping-live-text');
						const lb = document.getElementById('ex-ping-live-badge');
						if (lt && lb) {
							lt.textContent = '🏆 Melhor rota: ' + bestResult.presetTitle + ' (' + bestResult.avgPing.toFixed(1) + ' ms)';
							lb.textContent = 'Clique no cartão para selecionar';
						}
					}
				}).catch(function(e) {
					testBtn.disabled = false;
					testBtn.textContent = '⚡ Testar Todas as Rotas';
					const lt = document.getElementById('ex-ping-live-text');
					if (lt) lt.textContent = 'Erro ao executar teste comparativo: ' + (e.message || e);
				});
			}, this)
		}, [ '⚡ Testar Todas as Rotas' ]);

		const saveBtn = E('button', {
			class: 'btn cbi-button cbi-button-positive',
			style: 'min-height:40px; padding:0 18px; font-weight:750; user-select:none; -webkit-tap-highlight-color:transparent;',
			click: L.bind(function() {
				const customInp = document.getElementById('ex-ping-custom-input');
				const customVal = (customInp && customInp.value) ? customInp.value.trim() : '';
				if (selectedTarget === 'custom') {
					if (!customVal) {
						ui.addNotification(null, E('p', {}, ['Informe um IP ou domínio válido para o servidor personalizado.']), 'warning');
						return;
					}
					if (!/^[a-zA-Z0-9.:_-]+$/.test(customVal)) {
						ui.addNotification(null, E('p', {}, ['O endereço inserido contém caracteres inválidos.']), 'warning');
						return;
					}
				}

				saveBtn.disabled = true;
				saveBtn.textContent = 'Salvando…';

				// Update in-memory state immediately so ongoing cycles use new target
				if (this.currentData) {
					if (!this.currentData.equipeDashboardConfig) this.currentData.equipeDashboardConfig = { values: {} };
					if (!this.currentData.equipeDashboardConfig.values) this.currentData.equipeDashboardConfig.values = {};
					if (!this.currentData.equipeDashboardConfig.values.main) this.currentData.equipeDashboardConfig.values.main = {};
					this.currentData.equipeDashboardConfig.values.main.ping_target = selectedTarget;
					this.currentData.equipeDashboardConfig.values.main.ping_custom_ip = customVal;
				}

				try {
					if (typeof window !== 'undefined' && window.localStorage) {
						window.localStorage.setItem('ark_wan_ping_target', selectedTarget);
						window.localStorage.setItem('ark_wan_ping_custom_ip', customVal);
					}
				} catch(e) {}

				const shortLbl = getPingTargetShortLabel(selectedTarget, customVal);
				activeWans.forEach(function(w) {
					const b = document.getElementById('ex-' + w.domId + '-latency-target');
					if (b) b.textContent = shortLbl;
				});

				fs.exec('/usr/sbin/equipe-dashboard-control', ['ping-target-set', selectedTarget, customVal]).then(L.bind(function(res) {
					ui.hideModal();
					ui.addNotification(null, E('p', {}, [
						'Servidor de teste de latência e monitoramento configurado para: ',
						E('strong', {}, [ shortLbl ]),
						' (salvo na memória permanente à prova de reinício)'
					]), 'info');
					this.scheduleAdaptiveRefresh(50);
				}, this)).catch(L.bind(function(err) {
					ui.hideModal();
					this.scheduleAdaptiveRefresh(100);
				}, this));
			}, this)
		}, [ 'Salvar Servidor' ]);

		const cancelBtn = E('button', {
			class: 'btn cbi-button cbi-button-neutral',
			style: 'min-height:40px; padding:0 16px; user-select:none; -webkit-tap-highlight-color:transparent;',
			click: closeModal
		}, [ 'Cancelar' ]);

		const footer = E('div', {
			style: 'display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:16px; flex-wrap:wrap;'
		}, [
			testBtn,
			E('div', { style: 'display:flex; gap:8px;' }, [ cancelBtn, saveBtn ])
		]);

		modalBody.push(footer);

		ui.showModal('🎯 Servidor de Teste de Latência da WAN', modalBody);
	}
};
