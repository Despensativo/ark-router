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
			ip6Str = ip6Arr[0].address;
		} else if (this.currentData && this.currentData.interfaces) {
			const ifaceName = (cfg && (cfg.section || cfg.iface)) || (prefix.replace(/^ex-/, '').replace(/1$/, ''));
			const compName = (ifaceName === 'wan' ? 'wan6' : (ifaceName + '_6'));
			const comp = iface(this.currentData.interfaces, compName) || (ifaceName === 'wan' ? iface(this.currentData.interfaces, 'wan6') : null);
			if (comp && Array.isArray(comp['ipv6-address']) && comp['ipv6-address'].length > 0) {
				ip6Str = comp['ipv6-address'][0].address;
			}
		}
		const pInfo = getPingTargetInfo(this.currentData);
		const pTargetLabel = getPingTargetShortLabel(pInfo.target, pInfo.customIp);
		text(prefix+'-mode',wanProtoLabel(i,cfg)); text(prefix+'-ip',a?a.address:'—'); text(prefix+'-ipv6',ip6Str); text(prefix+'-gateway',wanGateway(i)); text(prefix+'-mask',a?cidrMask(a.mask):'—'); text(prefix+'-dns',wanDns(i)); text(prefix+'-link',link); text(prefix+'-latency-target',pTargetLabel); text(prefix+'-latency',(online&&ping!=null)?ping.toFixed(0)+' ms':(online?'Tempo esgotado':'—')); text(prefix+'-rx-day',daily?formatBytes(daily.rx):'Coletando…'); text(prefix+'-tx-day',daily?formatBytes(daily.tx):'Coletando…'); text(prefix+'-session','↓ '+formatBytes(Number(stats.rx_bytes)||0)+'  •  ↑ '+formatBytes(Number(stats.tx_bytes)||0)); text(prefix+'-uptime',i.up?formatUptime(i.uptime):'—');
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
			text('ex-mwan-mode', 'Modo Satélite / Ponto de Acesso (Bridge)');
			const toggle = document.getElementById('ex-mwan-toggle');
			if (toggle) {
				toggle.checked = false;
				toggle.disabled = true;
				toggle.title = 'Multi-WAN desativado em nós Satélites e Pontos de Acesso.';
			}
			text('ex-mwan-toggle-state', 'INATIVO NO SATÉLITE');
			setPill('ex-mwan-status', 'standby', 'MESTRE GERENCIA');
			const subEl = document.getElementById('ex-mwan-toggle-desc');
			if (subEl) subEl.textContent = 'Este roteador atua como extensor de rede (bridge transparente). O balanceamento e failover de internet operam exclusivamente no Roteador Mestre.';
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
		if (isSatelliteOrAp(this.currentData || this.lastData)) {
			input.checked = false;
			input.disabled = true;
			ui.showModal('Blindagem de Modo Satélite', [
				E('div', { class: 'alert-message warning' }, [
					E('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, [
						'🛡️ O serviço Multi-WAN é exclusivo do Roteador Mestre.'
					]),
					E('p', {}, [
						'Nós Satélites e Pontos de Acesso operam em ponte transparente e não realizam balanceamento ou failover de conexões WAN. Configure o Multi-WAN diretamente no roteador principal.'
					])
				]),
				E('div', { class: 'right', style: 'margin-top: 14px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Entendido'])
				])
			]);
			return;
		}
		const activeWans = getActiveWanList(this.lastData || {});
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
	toggleSqm: function(input){
		if (isSatelliteOrAp(this.currentData)) {
			input.checked = false;
			input.disabled = true;
			ui.showModal('Blindagem de Modo Satélite', [
				E('div', { class: 'alert-message warning' }, [
					E('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, [
						'🛡️ O controle de Bufferbloat (SQM / CAKE) é exclusivo do Roteador Mestre.'
					]),
					E('p', {}, [
						'Este roteador opera como nó Satélite / Ponto de Acesso em ponte transparente. O gerenciamento de tráfego de internet e filas SQM deve ser feito diretamente no roteador principal para evitar degradação de desempenho local.'
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
		const title = desired ? 'Ativar SQM / CAKE' : 'Desativar SQM / CAKE';
		const elements = [];
		if (desired) {
			elements.push(E('p', {class:'alert-message warning'}, ['O SQM será ligado nas filas configuradas e o serviço será reiniciado. A internet pode pausar por alguns segundos.']));
		} else {
			if (isGamerActive) {
				elements.push(E('p', {class:'alert-message danger'}, ['⚠️ Atenção: O Modo Gamer está ATIVO! Ao desligar o SQM / CAKE, a proteção anti-bufferbloat será desativada e o painel retornará automaticamente ao Modo Padrão.']));
			} else {
				elements.push(E('p', {class:'alert-message warning'}, ['O SQM será desligado e o serviço será reiniciado. A internet pode pausar por alguns segundos.']));
			}
		}
		elements.push(E('div', {class:'right'}, [
			E('button', {class:'btn cbi-button cbi-button-neutral', 'click':closeModal}, ['Cancelar']), ' ',
			E('button', {class:'btn cbi-button '+(desired?'cbi-button-positive':'cbi-button-negative'), 'click':L.bind(function(ev){
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = 'Aplicando…';
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
					btn.textContent = desired ? 'Confirmar' : (isGamerActive ? 'Desativar SQM e Desligar Gamer' : 'Confirmar');
					if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				});
			}, this)}, [desired ? 'Confirmar' : (isGamerActive ? 'Desativar SQM e Desligar Gamer' : 'Confirmar')])
		]));
		ui.showModal(title, elements);
	},
	editSqmLimits: function(){
		if (isSatelliteOrAp(this.currentData)) {
			ui.showModal('Blindagem de Modo Satélite', [
				E('div', { class: 'alert-message warning' }, [
					E('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, [
						'🛡️ O controle de Bufferbloat (SQM / CAKE) é exclusivo do Roteador Mestre.'
					]),
					E('p', {}, [
						'Este roteador opera como nó Satélite / Ponto de Acesso em ponte transparente. O gerenciamento de tráfego de internet e filas SQM deve ser feito diretamente no roteador principal para evitar degradação de desempenho local.'
					])
				]),
				E('div', { class: 'right', style: 'margin-top: 14px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Entendido'])
				])
			]);
			return Promise.resolve();
		}
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['system-hardware-sqm-audit'])
		.then(L.bind(function(auditRes) {
			let audit = {};
			try { audit = JSON.parse(auditRes.stdout || '{}'); } catch(e) {}
			const data=this.currentData||{}, sqm=values(data.sqm), qosValues=values(data.qos), qos=qosValues.main||{}, qosGuest=qosValues.guest||{};
			const field=function(label,value,hint){const node=E('input',{type:'number',class:'cbi-input-text',min:0,max:100000,step:'0.1',placeholder:'0 (ilimitado)',value:kbpsToMbpsInput(value)});return {node:node,row:E('label',{class:'ex-qos-edit-field'},[E('span',{},[label+' (Mbps)']),node,E('small',{class:'ex-muted'},[hint||'Mbps • 0 ou vazio = ilimitado'])])};};
			const profiles=sqmWanProfiles(data);if(!profiles.length)throw new Error('Nenhuma interface configurada como WAN foi encontrada.');
			const guestDownloadLimit=qosGuest.download_kbps||qos.guest_download_kbps||0, guestUploadLimit=qosGuest.upload_kbps||qos.guest_upload_kbps||0;
			const fwDefs = Object.values(data.firewallConfig || {}).find(function(s) { return s && s['.type'] === 'defaults'; }) || {};
			const isFlowOffloadActive = fwDefs.flow_offloading === '1';

			const editors=profiles.map(function(profile){
				const queue=sqm[profile.section]||{},enabled=E('input',{type:'checkbox'}),download=field(profile.label+' download',queue.download),upload=field(profile.label+' upload',queue.upload);
				enabled.checked=queue.enabled==='1';

				const calcInput = E('input', {
					type: 'number',
					class: 'cbi-input-text',
					min: 1,
					max: 100000,
					step: '1',
					placeholder: 'Velocidade nominal (Mbps)',
					style: 'max-width: 170px; margin-right: 6px;'
				});
				const calcNotice = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 4px; font-size: 11px; line-height: 1.3;' }, [
					'Margem de 7% aplicada para impedir acúmulo de fila no modem.'
				]);
				const applyCalcBtn = E('button', {
					type: 'button',
					class: 'btn cbi-button cbi-button-action ex-mini-button',
					style: 'font-weight: 600;',
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

				const calcBox = E('div', { class: 'ex-qos-calc-box', style: 'margin-top: 8px; margin-bottom: 8px; padding: 8px 10px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 8px;' }, [
					E('div', { style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;' }, [
						E('strong', { style: 'font-size: 11.5px;' }, ['🧮 Calculadora de Upload (-7% Bufferbloat)'])
					]),
					E('div', { style: 'display: flex; align-items: center; flex-wrap: wrap; gap: 4px;' }, [
						calcInput,
						applyCalcBtn
					]),
					calcNotice
				]);

				return {
					profile: profile,
					enabled: enabled,
					download: download,
					upload: upload,
					section: E('section', {}, [
						E('h3', {}, [profile.label]),
						E('small', { class: 'ex-muted' }, ['Interface '+profile.network+' • dispositivo '+profile.device+(profile.online?' • online':' • sem link')]),
						E('label', { class: 'ex-qos-edit-toggle' }, [enabled, E('span', {}, ['Ativar fila '+profile.label])]),
						download.row,
						upload.row,
						calcBox
					])
				};
			});
			const guestDown=field('Visitantes download total',guestDownloadLimit,'Mbps • 0 ou vazio = ilimitado'), guestUp=field('Visitantes upload total',guestUploadLimit,'Mbps • exemplo: 1,5 • 0 ou vazio = ilimitado');
			const mipsNotice = audit.is_low_end_mips ? E('div', { class: 'alert-message warning', style: 'margin-bottom: 12px; font-size: 12.5px; line-height: 1.5;' }, [
				E('strong', { style: 'display:block; margin-bottom:4px;' }, ['⚠️ Recomendação de Hardware: Processador MIPS (' + (audit.cpu_model || 'Single-Core 720 MHz') + ')']),
				'Para velocidades de download superiores a 100 Mbps, o algoritmo CAKE pode saturar a CPU (100%), reduzindo a velocidade real do link. ',
				E('div', { style: 'margin-top: 8px;' }, [
					E('button', {
						type: 'button',
						class: 'btn cbi-button cbi-button-neutral',
						style: 'font-weight: 600; font-size: 11.5px; padding: 3px 8px;',
						'click': function() {
							editors.forEach(function(ed) { ed.download.node.value = '0'; });
							ui.addNotification(null, E('p', {}, ['Download ajustado para 0 (ilimitado). O SQM atuará apenas no Upload, eliminando o bufferbloat sem sobrecarregar a CPU.']), 'info');
						}
					}, ['⚡ Otimizar: Limitar somente Upload (Zero lag sem gargalo de CPU)'])
				])
			]) : '';

			const hybridBanner = isFlowOffloadActive ? E('div', { class: 'alert-message info', style: 'margin-bottom: 12px; font-size: 12.5px; line-height: 1.45;' }, [
				E('strong', { style: 'display: block; margin-bottom: 3px;' }, ['⚡ Modo Híbrido Ativo (Fastpath + CAKE)']),
				'Modo Híbrido: O Download opera com velocidade total liberada no Fastpath e o Upload é gerenciado pelo CAKE para blindar a rede contra lag em jogos e chamadas.'
			]) : '';

			ui.showModal('Editar SQM / CAKE',[
				E('div',{style:'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;'},[
					E('p',{class:'ex-muted',style:'margin:0;'},['Defina os limites em Mbps. Exemplo: 1,2 Gbps = 1200 Mbps. Use 0 ou deixe em branco quando não quiser limitar aquela direção (ilimitado).']),
					E('button',{class:'ex-mini-button','click':L.bind(function(){ui.hideModal();this.openFastCom();},this)},['🎬 Medir no Fast.com'])
				]),
				hybridBanner,
				mipsNotice,
				E('div',{class:'ex-qos-edit-grid'},editors.map(function(editor){return editor.section;}).concat([E('section',{},[E('h3',{},['Visitantes']),guestDown.row,guestUp.row])])),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
			const btn = ev.currentTarget;
			const args=['sqm-save-v2'];let invalid=false;
			editors.forEach(function(editor){
				const profile=editor.profile;
				const dRaw=String(editor.download.node.value||'').trim();
				const uRaw=String(editor.upload.node.value||'').trim();
				const download=(dRaw===''||dRaw==='0')?'0':mbpsToKbps(dRaw);
				const upload=(uRaw===''||uRaw==='0')?'0':mbpsToKbps(uRaw);
				if(download==null||upload==null)invalid=true;
				args.push('wan='+[profile.section,profile.network,profile.device,editor.enabled.checked?'1':'0',download,upload].join('|'));
			});
			const gDRaw=String(guestDown.node.value||'').trim();
			const gURaw=String(guestUp.node.value||'').trim();
			const guestDownload=(gDRaw===''||gDRaw==='0')?'0':mbpsToKbps(gDRaw);
			const guestUpload=(gURaw===''||gURaw==='0')?'0':mbpsToKbps(gURaw);
			if(invalid||guestDownload==null||guestUpload==null){ui.addNotification(null,E('p',{},['Informe velocidades válidas em Mbps ou 0 para ilimitado.']),'danger');return;}
			btn.disabled = true;
			btn.textContent = 'Salvando SQM…';
			args.push('guest_download='+guestDownload,'guest_upload='+guestUpload);
			return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(L.bind(function(r){
				if(r.code)throw new Error(r.stderr||'Falha ao salvar limites');
				this.triggerImmediateRefresh('Limites de velocidade SQM / CAKE salvos com sucesso!', 'info');
			}, this)).catch(function(e){
				btn.disabled = false;
				btn.textContent = 'Salvar e reiniciar SQM';
				if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
				ui.addNotification(null,E('p',{},[e.message]),'danger');
			});
		},this)},['Salvar e reiniciar SQM'])])]);
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
			const wanPorts = [[targetDev || (!isPrimary ? 'lan1' : 'eth1'), chosenPortLabel]];
			const role=makeSelect((!isPrimary&&cfg.proto==='none'&&!preferredDevice)?'lan':'wan',!isPrimary?[['wan','Usar como internet / '+whichLabel],['lan','Voltar porta para LAN']]:[['wan','Usar como internet / WAN1']]);
			const device=makeSelect(targetDev||(!isPrimary?'lan1':'eth1'),wanPorts);
			device.disabled=true;
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
			const clonedMac=cfg.macaddr||'', macaddr=E('input',{class:'cbi-input-text',value:clonedMac,placeholder:'vazio = MAC físico do roteador'});
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
					ui.addNotification(null, E('p', {}, ['Perfil PPPoE "' + profName + '" salvo com sucesso!']));
				}).catch(function(e){
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				}).finally(function(){
					saveConfirmBtn.disabled = false;
					saveConfirmBtn.textContent = 'Confirmar';
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
		let selectedTarget = currentInfo.target || 'registro_br';
		let customIpVal = currentInfo.customIp || '';

		const activeWans = getActiveWanList(this.currentData || {});

		const modalBody = [];

		modalBody.push(E('p', { class: 'ex-muted', style: 'margin-bottom:12px; font-size:0.86rem; line-height:1.45;' }, [
			'Selecione o servidor de destino para a medição contínua de latência (ping) das conexões WAN no painel. O ',
			E('strong', { style: 'color:#60a5fa;' }, ['Registro.br / NIC.br']),
			' é a referência oficial recomendada para aferir rotas nacionais e estabilidade no Brasil.'
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
				placeholder: 'ex: 200.160.2.3, 1.0.0.1 ou ping.seuservidor.com',
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
						preset.badge ? E('span', { class: 'ex-ping-target-card-badge' }, [ preset.badge ]) : ''
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
						const ip = (live && live['ipv4-address'] && live['ipv4-address'][0] && live['ipv4-address'][0].address) || '';
						const bindTarget = ip || logicalDev;
						const targetHost = resolvePingTarget(preset.id, customVal, live, cfg);
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
	},
	showWanOptimizationsModal: function(iface) {
		iface = (/^wan([0-9]+)?$/.test(String(iface || '')) && String(iface).toLowerCase() !== 'wan6') ? String(iface) : 'wan';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wan-optimize-status', 'iface=' + iface]).then(L.bind(function(r) {
			let opt = {};
			try { opt = JSON.parse(r.stdout || '{}'); } catch(e) {}
			if (!opt.iface) throw new Error(r.stderr || 'A WAN selecionada não foi encontrada');
			let selectedPreset = opt.saved_profile || 'auto';
			let tcpTurbo = !!opt.tcp_turbo;
			let flowOffload = !!opt.flow_offloading;
			let linklayerProfile = opt.linklayer_profile || 'none';
			let babyJumbo = !!opt.baby_jumbo;
			let irqBalance = !!opt.irqbalance_active;
			const sqmInstalled = !!opt.sqm_installed;
			const sqmActive = !!opt.sqm_active;
			const sqmAnyActive = !!opt.sqm_any_active;
			const self = this;
			const hw = (self.capabilities && self.capabilities.hardware) || {};
			const isSingleCore = hw.cpu_cores <= 1;
			const isLowRam = (hw.mem_total_mb || 128) < 256;

			if (isLowRam && selectedPreset === 'auto') {
				tcpTurbo = false;
			}

			const presets = [
				{
					id: 'auto',
					label: '✨ Modo Automático',
					tag: 'RECOMENDADO (1 CLIQUE)',
					desc: 'O sistema identifica seu tipo de conexão e calibra automaticamente para máxima estabilidade e menor ping sem risco de erro.'
				},
				{
					id: 'dhcp_cable',
					label: '🌐 Modem da Operadora (DHCP)',
					tag: 'CABO / MODEM',
					desc: 'Para quem conecta o cabo de rede direto no roteador da Claro, Vivo, Oi ou provedor local (já configurado).'
				},
				{
					id: 'xpon_bridge',
					label: '⚡ Fibra Ótica Direta (PPPoE)',
					tag: 'FIBRA PPPoE',
					desc: 'Para conexões onde o usuário e a senha de fibra são autenticados diretamente neste roteador.',
					ll: 'pppoe_28',
					jumbo: true
				},
				{
					id: 'xpon_vlan',
					label: '🏷️ Fibra com VLAN da Operadora',
					tag: 'FIBRA VLAN',
					desc: 'Para planos de fibra ótica onde a operadora exige configuração de ID de VLAN na conexão.',
					ll: 'vlan_34',
					jumbo: true
				},
				{
					id: 'mobile_starlink',
					label: '📡 Satélite (Starlink) ou 4G/5G',
					tag: 'SEM FIO / MÓVEL',
					desc: 'Para antenas Starlink, roteadores 4G/5G ou modems celulares com latência dinâmica.'
				},
				{
					id: 'dedicated_static',
					label: '🏢 IP Fixo / Link Corporativo',
					tag: 'IP ESTÁTICO',
					desc: 'Para conexões com endereço de IP estático fixo fornecido pela operadora.'
				}
			];
			const profileById = function(id) { return presets.find(function(p) { return p.id === id; }) || presets[0]; };
			const effectiveProfile = function() { return selectedPreset === 'auto' ? profileById(opt.detected_profile) : profileById(selectedPreset); };

			const chips = [
				{ id: 'none', label: '⚪ Padrão / DHCP (0B)' },
				{ id: 'pppoe_28', label: '⚡ Fibra PPPoE (28B)' },
				{ id: 'vlan_34', label: '🏷️ Fibra c/ VLAN (34B)' },
				{ id: 'vdsl_44', label: '☎️ VDSL2 / DSL (44B)' }
			];

			const presetBtns = [];
			const chipBtns = [];

			const tcpInput = E('input', { type: 'checkbox' });
			const flowInput = E('input', { type: 'checkbox' });
			const jumboInput = E('input', { type: 'checkbox' });
			const irqInput = E('input', { type: 'checkbox' });
			const enableSqmInput = E('input', { type: 'checkbox', checked: '' });
			enableSqmInput.checked = true;
			const sqmDependency = E('div', { class: 'ex-opt-sqm-dependency' });
			const selectedSummary = E('div', { class: 'ex-opt-selected-summary' });
			const globalWarning = E('small', { class: 'ex-muted' });
			const tcpNotice = E('small', { style: 'font-weight:600;display:block;margin-top:4px;' });
			let saveButton = null;

			let initialUploadMbps = 0;
			if (Number(opt.sqm_upload || 0) > 0) {
				initialUploadMbps = Math.round((Number(opt.sqm_upload) / 1000) * 10) / 10;
			}
			const flowNotice = E('small', { class: 'ex-opt-requirement ready', style: 'display:none;margin-top:6px;' });
			const hybridContainer = E('div', { class: 'ex-opt-hybrid-container', style: 'display:none;margin-top:10px;' });

			const hybridNotice = E('div', { class: 'alert-message info', style: 'margin-bottom:8px;padding:8px 12px;font-size:12px;line-height:1.45;' }, [
				E('strong', { style: 'display:block;margin-bottom:2px;font-size:12.5px;' }, ['⚡ Modo Híbrido Ativo']),
				'Modo Híbrido: O Download opera com velocidade total no Fastpath e o Upload é gerenciado pelo CAKE contra lag.'
			]);

			const calcInput = E('input', {
				type: 'number',
				class: 'cbi-input-text',
				min: 1,
				max: 100000,
				step: '1',
				placeholder: 'Velocidade nominal (Mbps)',
				style: 'max-width: 170px; margin-right: 6px;'
			});
			const calcNotice = E('small', { class: 'ex-muted', style: 'display:block;margin-top:4px;font-size:11px;line-height:1.3;' }, [
				'Margem de 7% aplicada para impedir acúmulo de fila no modem e eliminar lag.'
			]);
			const uploadInput = E('input', {
				type: 'number',
				class: 'cbi-input-text',
				min: 0,
				max: 100000,
				step: '0.1',
				value: initialUploadMbps > 0 ? initialUploadMbps : 0,
				placeholder: '0'
			});
			const downloadInput = E('input', {
				type: 'text',
				class: 'cbi-input-text',
				value: '0 (Ilimitado / Fastpath)',
				disabled: true,
				style: 'opacity:0.85;'
			});

			const applyCalcBtn = E('button', {
				type: 'button',
				class: 'btn cbi-button cbi-button-action ex-mini-button',
				style: 'font-weight: 600;',
				click: function() {
					const nominal = parseFloat(calcInput.value || 0);
					if (nominal > 0) {
						const discounted = Math.round(nominal * 0.93 * 10) / 10;
						uploadInput.value = discounted;
						calcNotice.style.color = '#10b981';
						calcNotice.textContent = '✓ ' + discounted + ' Mbps aplicado ao Upload (-7% contra Bufferbloat).';
					}
				}
			}, ['Aplicar -7%']);

			const calcBox = E('div', { class: 'ex-qos-calc-box', style: 'margin-bottom:10px;padding:8px 12px;background:rgba(59,130,246,0.05);border:1px solid rgba(59,130,246,0.15);border-radius:8px;' }, [
				E('div', { style: 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;' }, [
					E('strong', { style: 'font-size:11.5px;' }, ['🧮 Calculadora de Upload (-7% Bufferbloat)'])
				]),
				E('div', { style: 'display:flex;align-items:center;flex-wrap:wrap;gap:4px;' }, [
					calcInput,
					applyCalcBtn
				]),
				calcNotice
			]);

			const downloadField = E('label', { class: 'ex-wan-edit-field', style: 'margin-bottom:6px;' }, [
				E('span', {}, ['Download (' + opt.label + ') • Mbps']),
				downloadInput,
				E('small', { class: 'ex-muted' }, ['No Modo Híbrido, o download opera sem limite artificial no kernel.'])
			]);

			const uploadField = E('label', { class: 'ex-wan-edit-field', style: 'margin-bottom:6px;' }, [
				E('span', {}, ['Upload (' + opt.label + ') • Mbps']),
				uploadInput,
				E('small', { class: 'ex-muted' }, ['Indispensável informar a velocidade real de upload para o CAKE estabilizar a latência.'])
			]);

			hybridContainer.appendChild(hybridNotice);
			hybridContainer.appendChild(calcBox);
			hybridContainer.appendChild(E('div', { style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;' }, [
				downloadField,
				uploadField
			]));

			const updateSqmDependency = function() {
				const isSatNode = isSatelliteOrAp(self.currentData);
				if (isSatNode) {
					sqmDependency.style.display = 'flex';
					sqmDependency.className = 'ex-opt-sqm-dependency warning';
					while (sqmDependency.firstChild) sqmDependency.removeChild(sqmDependency.firstChild);
					sqmDependency.appendChild(E('div', {}, [
						E('strong', {}, ['🛡️ Modo Satélite / Ponto de Acesso']),
						E('p', {}, ['O controle SQM / CAKE é exclusivo do Roteador Mestre e permanece desativado neste satélite.'])
					]));
					enableSqmInput.checked = false;
					enableSqmInput.disabled = true;
					if (saveButton) saveButton.textContent = '💾 Salvar e Aplicar Otimizações';
					return;
				}
				const required = linklayerProfile !== 'none';
				sqmDependency.style.display = required ? 'flex' : 'none';
				sqmDependency.className = 'ex-opt-sqm-dependency' + (sqmActive ? ' active' : (!sqmInstalled ? ' missing' : ' warning'));
				while (sqmDependency.firstChild) sqmDependency.removeChild(sqmDependency.firstChild);
				if (!required) {
					if (saveButton) saveButton.textContent = '💾 Salvar e Aplicar Otimizações';
					return;
				}
				if (sqmActive) {
					sqmDependency.appendChild(E('div', {}, [E('strong', {}, ['✅ SQM / CAKE ativo em ' + opt.label]), E('p', {}, ['O overhead será ajustado somente na fila ' + (opt.sqm_section || opt.label) + '.'])]));
					if (saveButton) saveButton.textContent = '💾 Salvar e Aplicar Otimizações';
				} else if (sqmInstalled) {
					sqmDependency.appendChild(E('div', {}, [E('strong', {}, ['💡 Este perfil utiliza SQM / CAKE']), E('p', {}, ['A fila será ativada somente para ' + opt.label + '. As outras WANs não serão modificadas.'])]));
					sqmDependency.appendChild(E('label', { class: 'ex-opt-sqm-enable' }, [enableSqmInput, E('span', {}, ['Ativar CAKE em ' + opt.label]) ]));
					if (saveButton) saveButton.textContent = enableSqmInput.checked ? 'Ativar CAKE e Salvar' : 'Salvar Otimizações';
				} else {
					sqmDependency.appendChild(E('div', {}, [E('strong', {}, ['⚠️ SQM / CAKE ainda não está instalado']), E('p', {}, ['Instale o módulo para ativar controle de filas e prioridades de tráfego.'])]));
					sqmDependency.appendChild(E('button', { type: 'button', class: 'ex-mini-button', click: function() { self.installFeature('sqm'); } }, ['Instalar SQM / CAKE']));
					if (saveButton) saveButton.textContent = 'Instalar SQM para continuar';
				}
			};

			const updateUI = function() {
				presetBtns.forEach(function(item) {
					item.btn.classList.toggle('active', item.id === selectedPreset);
				});
				chipBtns.forEach(function(item) {
					item.btn.classList.toggle('active', item.id === linklayerProfile);
				});
				tcpInput.checked = tcpTurbo;
				flowInput.checked = flowOffload;
				jumboInput.checked = babyJumbo;
				irqInput.checked = !isSingleCore && irqBalance;
				irqInput.disabled = isSingleCore || !opt.irqbalance_installed;
				flowInput.disabled = false;
				const effective = effectiveProfile();
				while (selectedSummary.firstChild) selectedSummary.removeChild(selectedSummary.firstChild);
				selectedSummary.style.display = 'block';
				selectedSummary.style.padding = '10px 14px';
				selectedSummary.style.borderRadius = '8px';
				selectedSummary.style.background = 'rgba(59, 130, 246, 0.08)';
				selectedSummary.style.border = '1px solid rgba(59, 130, 246, 0.2)';
				selectedSummary.style.marginBottom = '12px';
				selectedSummary.appendChild(E('div', { style: 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;' }, [
					E('span', { style: 'font-size:12.5px;font-weight:600;' }, [
						'Perfil ativo para ' + opt.label + ': ',
						E('b', { style: 'color:var(--ex-primary-safe);' }, [(selectedPreset === 'auto' ? 'Automático (' + effective.label.replace(/^[^A-Za-zÀ-ÿ]+/, '').trim() + ')' : effective.label)])
					]),
					E('span', { class: 'ex-pill online', style: 'font-size:11px;font-weight:700;padding:2px 8px;' }, ['✓ Calibrado'])
				]));

				if (isLowRam) {
					if (tcpTurbo) {
						tcpNotice.style.color = '#f59e0b';
						tcpNotice.textContent = '⚠️ Buffers ampliados ativos. Em roteadores com 128 MB RAM, recomendamos manter desligado para economizar memória.';
					} else {
						tcpNotice.style.color = '#10b981';
						tcpNotice.textContent = '✓ Modo econômico seguro ativo. Memória livre preservada para estabilidade total.';
					}
				} else {
					tcpNotice.style.color = 'var(--ex-muted)';
					tcpNotice.textContent = 'Recomendado para conexões de alta velocidade em roteadores com 256 MB ou mais de RAM.';
				}

				const isSatNode = isSatelliteOrAp(self.currentData);
				const isSqmOn = !isSatNode && (sqmActive || sqmAnyActive || enableSqmInput.checked);
				if (flowOffload && isSqmOn) {
					hybridContainer.style.display = 'block';
					flowNotice.style.display = 'none';
				} else if (flowOffload) {
					hybridContainer.style.display = 'none';
					flowNotice.style.display = 'block';
					flowNotice.className = 'ex-opt-requirement ready';
					flowNotice.textContent = '✓ Pronto e ativo: downloads e tráfego geral acelerados no kernel com menor uso de CPU.';
				} else {
					hybridContainer.style.display = 'none';
					flowNotice.style.display = 'none';
				}

				globalWarning.textContent = (flowOffload && sqmAnyActive) ? 'Modo Híbrido disponível: o Fastpath acelera downloads no kernel enquanto o CAKE gerencia uploads.' : 'Estas opções de desempenho beneficiam o roteador como um todo.';
				updateSqmDependency();
			};

			const applyPreset = function(presetId) {
				selectedPreset = presetId;
				const p = presets.find(function(x) { return x.id === presetId; });
				const effective = presetId === 'auto' ? profileById(opt.detected_profile) : p;
				if (effective && presetId !== 'custom') {
					linklayerProfile = effective.ll || 'none';
					babyJumbo = !!effective.jumbo;
				}
				updateUI();
			};

			const presetGrid = E('div', { class: 'ex-opt-preset-grid', style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;margin-bottom:12px;' });
			presets.forEach(function(p) {
				const isCurrentDetected = (p.id === opt.detected_profile);
				const b = E('button', {
					type: 'button',
					class: 'ex-opt-preset-btn',
					style: 'display:flex;flex-direction:column;align-items:flex-start;text-align:left;width:100%;padding:10px 12px;border-radius:10px;box-sizing:border-box;',
					click: function() { applyPreset(p.id); }
				}, [
					E('div', { style: 'display:flex;justify-content:space-between;width:100%;align-items:center;margin-bottom:3px;' }, [
						E('span', { class: 'ex-opt-preset-tag', style: 'font-size:10px;font-weight:700;' }, [p.tag]),
						isCurrentDetected ? E('span', { class: 'ex-pill online', style: 'font-size:9px;padding:1px 5px;' }, ['SUA CONEXÃO']) : ''
					]),
					E('strong', { style: 'display:block;font-size:13px;font-weight:700;margin-bottom:2px;' }, [p.label]),
					E('small', { style: 'display:block;font-size:11px;line-height:1.35;opacity:0.85;' }, [p.desc])
				]);
				presetBtns.push({ id: p.id, btn: b });
				presetGrid.appendChild(b);
			});

			const chipGrid = E('div', { class: 'ex-opt-chip-grid' });
			chips.forEach(function(c) {
				const b = E('button', {
					type: 'button',
					class: 'ex-opt-chip',
					click: function() { selectedPreset = 'custom'; linklayerProfile = c.id; updateUI(); }
				}, [c.label]);
				chipBtns.push({ id: c.id, btn: b });
				chipGrid.appendChild(b);
			});

			tcpInput.addEventListener('change', function() { tcpTurbo = tcpInput.checked; updateUI(); });
			flowInput.addEventListener('change', function() { flowOffload = flowInput.checked; updateUI(); });
			jumboInput.addEventListener('change', function() { selectedPreset = 'custom'; babyJumbo = jumboInput.checked; updateUI(); });
			irqInput.addEventListener('change', function() { irqBalance = irqInput.checked; updateUI(); });
			enableSqmInput.addEventListener('change', function() { updateSqmDependency(); updateUI(); });
			applyPreset(selectedPreset);

			const protoHuman = { dhcp: 'Modem da Operadora (DHCP)', pppoe: 'Fibra Ótica Direta (PPPoE)', static: 'IP Fixo Estático' };
			const speedText = Number(opt.link_speed_mbps || 0) > 0 ? (Number(opt.link_speed_mbps) + ' Mbps' + (opt.duplex ? ' • ' + opt.duplex : '')) : 'velocidade física não informada';
			const detected = profileById(opt.detected_profile);

			const content = [
				E('div', { class: 'alert-message info', style: 'margin-bottom:14px;font-size:13px;line-height:1.45;' }, [
					E('strong', { style: 'display:block;margin-bottom:4px;font-size:13.5px;' }, ['💡 O que esta tela faz?']),
					'Esta tela calibra o roteador para obter a ',
					E('b', {}, ['maior velocidade possível']),
					' e ',
					E('b', {}, ['menor tempo de resposta (ping)']),
					' para jogos, downloads e chamadas. ',
					E('b', {}, ['Ela NÃO altera seu usuário, senha nem tipo de conexão']),
					'; sua internet continua conectada normalmente.'
				]),
				E('div', { class: 'ex-opt-detected', style: 'display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-radius:12px;margin-bottom:14px;gap:12px;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.25);' }, [
					E('div', {}, [
						E('span', { class: 'ex-kicker', style: 'display:block;font-size:11px;font-weight:700;color:var(--ex-primary-safe);margin-bottom:2px;' }, ['SUA CONEXÃO ATUAL']),
						E('strong', { style: 'display:block;font-size:14.5px;margin-bottom:2px;' }, [(protoHuman[opt.proto] || String(opt.proto || '').toUpperCase()) + ' na porta ' + (opt.wan_dev || opt.label)]),
						E('small', { class: 'ex-muted', style: 'display:block;' }, ['Velocidade da porta: ' + speedText + (opt.starlink ? ' • Link Starlink Detectado' : '') + ' • Status: Conectado e operando'])
					]),
					E('span', { class: 'ex-pill online', style: 'font-weight:700;padding:6px 12px;font-size:12px;' }, ['✅ Perfil Ideal: ' + detected.label.replace(/^[^A-Za-zÀ-ÿ]+/, '').trim()])
				]),
				E('div', { class: 'ex-opt-section' }, [
					E('div', { class: 'ex-opt-section-head' }, [
						E('h4', {}, ['1. TIPO DE CONEXÃO COM A OPERADORA (' + opt.label + ')'])
					]),
					presetGrid,
					selectedSummary,
					E('details', { class: 'ex-opt-advanced', style: 'margin-top:8px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(127,127,127,0.15);' }, [
						E('summary', { style: 'cursor:pointer;font-weight:600;font-size:12.5px;color:var(--ex-muted);' }, ['⚙️ Configurações Técnicas de Pacotes e MTU (Avançado - Opcional)']),
						E('p', { class: 'ex-muted', style: 'margin-top:8px;margin-bottom:10px;font-size:11.5px;' }, ['Estes parâmetros já foram calibrados automaticamente pelo perfil escolhido acima. Altere apenas se o seu provedor exigir calibração manual de filas SQM / CAKE.']),
						E('strong', { style: 'display:block;font-size:12px;margin-bottom:6px;' }, ['Perfil de overhead no SQM / CAKE']),
						chipGrid,
						E('div', { class: 'ex-opt-module-card', style: 'margin-top:10px;' }, [
							E('div', { class: 'ex-opt-module-info' }, [
								E('strong', {}, ['Baby Jumbo / MTU 1508']),
								E('p', {}, ['Permite transportar MTU 1500 sem fragmentação em conexões de fibra PPPoE. Não é necessário em conexões DHCP/Modem.'])
							]),
							E('label', { class: 'ex-switch' }, [jumboInput, E('span', { class: 'ex-switch-slider' })])
						]),
						sqmDependency
					])
				]),
				E('div', { class: 'ex-opt-section' }, [
					E('div', { class: 'ex-opt-section-head' }, [
						E('h4', {}, ['2. ACELERAÇÃO DE DESEMPENHO DO ROTEADOR']), E('span', { class: 'ex-pill standby' }, ['GERAL'])
					]),
					globalWarning,
					E('div', { class: 'ex-opt-module-grid' }, [
						E('div', { class: 'ex-opt-module-card' }, [
							E('div', { class: 'ex-opt-module-info' }, [
								E('strong', {}, [isLowRam ? '🧠 Proteção de Memória RAM (128 MB)' : '🧠 Buffers Estendidos de Memória (TCP Turbo)']),
								E('p', {}, [isLowRam ? 'Mantém o uso de memória enxuto no roteador para evitar travamentos ou lentidão durante múltiplos downloads pesados (torrents, Steam, streams 4K).' : 'Aumenta os buffers de rede para 8 MB, mantendo velocidade máxima contínua em downloads pesados.']),
								tcpNotice
							]),
							E('label', { class: 'ex-switch' }, [ tcpInput, E('span', { class: 'ex-switch-slider' }) ])
						]),
						E('div', { class: 'ex-opt-module-card' }, [
							E('div', { class: 'ex-opt-module-info' }, [
								E('strong', {}, ['🚀 Aceleração de Tráfego (Fastpath / Flow Offloading)']),
								E('p', {}, ['Processa o tráfego de dados diretamente pelo kernel do Linux, reduzindo o uso da CPU para a internet rodar na velocidade máxima sem aquecer o roteador.']),
								flowNotice,
								hybridContainer
							]),
							E('label', { class: 'ex-switch' }, [ flowInput, E('span', { class: 'ex-switch-slider' }) ])
						]),
						(!isSingleCore) ? E('div', { class: 'ex-opt-module-card' }, [
							E('div', { class: 'ex-opt-module-info' }, [
								E('strong', {}, ['⚙️ IRQ Balance']),
								E('p', {}, [opt.irqbalance_installed ? 'Distribui o processamento de rede entre os núcleos de CPU disponíveis.' : 'Módulo não instalado neste roteador.'])
							]),
							E('label', { class: 'ex-switch' }, [irqInput, E('span', { class: 'ex-switch-slider' })])
						]) : ''
					])
				]),
				E('div', { class: 'right', style: 'margin-top:14px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Cancelar']),
					' ',
					(saveButton = E('button', { class: 'btn cbi-button cbi-button-positive', click: L.bind(function(ev) {
						const btn = ev.currentTarget;
						const requiresSqm = linklayerProfile !== 'none';
						if (requiresSqm && !sqmInstalled) {
							this.installFeature('sqm');
							return;
						}
						const isSatNode = isSatelliteOrAp(this.currentData);
						const isSqmOn = !isSatNode && (sqmActive || sqmAnyActive || enableSqmInput.checked);
						const activateSqm = !isSatNode && requiresSqm && !sqmActive && enableSqmInput.checked;
						btn.disabled = true;
						btn.textContent = activateSqm ? 'Ativando CAKE e aplicando…' : 'Aplicando otimizações…';
						const args = [
							'wan-optimize-set',
							'iface=' + opt.iface,
							'preset=' + selectedPreset,
							'tcp_turbo=' + (tcpTurbo ? '1' : '0'),
							'flow_offload=' + (flowOffload ? '1' : '0'),
							'linklayer_profile=' + linklayerProfile,
							'baby_jumbo=' + (babyJumbo ? '1' : '0'),
							'enable_sqm=' + (activateSqm ? '1' : '0'),
							'irqbalance=' + (irqBalance ? '1' : '0')
						];
						if (flowOffload && isSqmOn) {
							const upVal = parseFloat(uploadInput.value || 0);
							args.push('sqm_upload=' + Math.round(upVal * 1000));
							args.push('sqm_download=0');
						}
						return fs.exec('/usr/sbin/equipe-dashboard-control', args).then(L.bind(function(res) {
							if (res.code) throw new Error(res.stderr || 'Falha ao aplicar otimizações');
							this.triggerImmediateRefresh((flowOffload && isSqmOn) ? 'Modo Híbrido ativado: Fastpath no Download e CAKE no Upload aplicados com sucesso!' : (activateSqm ? 'SQM / CAKE ativado e otimizações aplicadas com sucesso!' : 'Otimizações de internet aplicadas com sucesso!'), 'info');
						}, this)).catch(function(err) {
							btn.disabled = false;
							btn.textContent = 'Salvar e Aplicar Otimizações';
							if (reloadAfterExpectedDisconnect(err, 'Otimizações enviadas. O roteador está reiniciando serviços…', 4200)) return;
							ui.addNotification(null, E('p', {}, [err.message]), 'danger');
						});
					}, this) }, ['Salvar e Aplicar Otimizações']))
				])
			];
			updateSqmDependency();

			ui.showModal('Otimização de Conexão — ' + opt.label + ' (' + (protoHuman[opt.proto] || String(opt.proto || '').toUpperCase()) + ')', content);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', {}, ['Falha ao carregar estado: ' + e.message]), 'danger');
		});
	},
	editLan: function(){
		let state={};try{state=JSON.parse(((this.currentData||{}).lanStatus&&this.currentData.lanStatus.stdout)||'{}');}catch(e){}
		const makeSelect=function(value,items){const s=E('select',{class:'cbi-input-select'},items.map(function(i){return E('option',{value:i[0]},[i[1]]);}));s.value=value;return s;};
		const mode=makeSelect(state.preset==='10'?'preset10':(state.preset==='192'?'preset192':'manual'),[['preset192','Padrão 192.168.x.x'],['preset10','Padrão 10.0.x.x'],['manual','Informar manualmente']]);
		const initialRouterIp=state.ipaddr||'192.168.1.1';
		let lastRouterIp=initialRouterIp;
		const routerIp=E('input',{class:'cbi-input-text',value:initialRouterIp,placeholder:initialRouterIp,inputmode:'decimal'});
		const netmask=E('input',{class:'cbi-input-text',value:state.netmask||'255.255.255.0',placeholder:'255.255.255.0',inputmode:'decimal'});
		const dhcpStart=E('input',{class:'cbi-input-text',value:state.dhcp_start||'192.168.1.100',placeholder:'192.168.1.100',inputmode:'decimal'});
		const dhcpEnd=E('input',{class:'cbi-input-text',value:state.dhcp_end||'192.168.1.249',placeholder:'192.168.1.249',inputmode:'decimal'});
		const dnsList=Array.isArray(state.dns)?state.dns:String(state.dns||'').split(/\s+/).filter(Boolean);
		const initialDns1=dnsList[0]||initialRouterIp;
		const dns1=E('input',{class:'cbi-input-text',value:initialDns1,placeholder:initialRouterIp,inputmode:'decimal'});
		const dns2=E('input',{class:'cbi-input-text',value:dnsList[1]||'1.1.1.1',placeholder:'1.1.1.1',inputmode:'decimal'});
		const dns3=E('input',{class:'cbi-input-text',value:dnsList[2]||'9.9.9.9',placeholder:'9.9.9.9',inputmode:'decimal'});
		const field=function(label,node,hint){return E('label',{class:'ex-wan-edit-field'},[E('span',{},[label]),node,hint?E('small',{class:'ex-muted'},[hint]):'']);};
		let dhcpTouched=false;
		let dns1Touched=false;

		const isSameSubnet24=function(ipA,ipB){
			if(!ipA||!ipB)return false;
			const pA=String(ipA).trim().split('.'), pB=String(ipB).trim().split('.');
			return pA.length===4&&pB.length===4&&pA[0]===pB[0]&&pA[1]===pB[1]&&pA[2]===pB[2];
		};

		const suggestDns=function(newIp){
			if(!newIp)return;
			const trimmed=String(newIp).trim();
			if(!trimmed)return;
			const curDns1=dns1.value.trim();
			if(!dns1Touched||curDns1===lastRouterIp||curDns1===initialRouterIp||isSameSubnet24(curDns1,lastRouterIp)){
				dns1.value=trimmed;
				dns1.placeholder=trimmed;
			}
			if(dns2.value.trim()===lastRouterIp)dns2.value=trimmed;
			if(dns3.value.trim()===lastRouterIp)dns3.value=trimmed;
			lastRouterIp=trimmed;
		};

		const suggestDhcp=function(force){
			const start=dhcpStartSuggestion(routerIp.value), end=dhcpEndSuggestion(routerIp.value);
			if(!start||!end)return;
			if(force||!dhcpTouched){dhcpStart.value=start;dhcpEnd.value=end;}
			dhcpStart.placeholder=start;dhcpEnd.placeholder=end;
		};

		const onRouterIpChange=function(force){
			if(mode.value==='manual'||force){
				suggestDhcp(force);
				suggestDns(routerIp.value);
			}
		};

		const applyPreset=function(changed){
			if(changed&&mode.value==='preset192'){
				routerIp.value='192.168.1.1';netmask.value='255.255.255.0';
				dhcpStart.value='192.168.1.10';dhcpEnd.value='192.168.1.254';
				dhcpTouched=false;
				suggestDns('192.168.1.1');
			}
			else if(changed&&mode.value==='preset10'){
				routerIp.value='10.0.0.1';netmask.value='255.255.255.0';
				dhcpStart.value='10.0.0.10';dhcpEnd.value='10.0.0.254';
				dhcpTouched=false;
				suggestDns('10.0.0.1');
			}
			const manual=mode.value==='manual';routerIp.disabled=netmask.disabled=dhcpStart.disabled=dhcpEnd.disabled=!manual;
			if(manual){
				suggestDhcp(false);
				suggestDns(routerIp.value);
			}else{
				suggestDhcp(changed);
			}
		};
		dhcpStart.addEventListener('input',function(){dhcpTouched=true;});
		dhcpEnd.addEventListener('input',function(){dhcpTouched=true;});
		dns1.addEventListener('input',function(){
			const val=dns1.value.trim();
			dns1Touched=(val!==''&&val!==routerIp.value.trim());
		});
		routerIp.addEventListener('input',function(){onRouterIpChange(false);});
		routerIp.addEventListener('blur',function(){onRouterIpChange(false);});
		mode.addEventListener('change',function(){applyPreset(true);});applyPreset(false);
		ui.showModal('Editar rede principal / DHCP',[
			E('p',{class:'alert-message warning'},['Alterar o IP principal muda o endereço de acesso do painel e pode desconectar dispositivos. O ARK cria um backup em /tmp antes de aplicar.']),
			E('div',{class:'ex-wan-edit-grid'},[field('Modelo de rede',mode),field('IP do roteador',routerIp,'Endereço usado para abrir o painel'),field('Máscara',netmask,'Nesta versão, use /24: 255.255.255.0'),field('DHCP começa em',dhcpStart),field('DHCP termina em',dhcpEnd),field('DNS enviado 1',dns1,'Acompanha o IP do roteador se não personalizado'),field('DNS enviado 2',dns2),field('DNS enviado 3',dns3,'Opcional. Apague os três para não enviar DNS fixo.')]),
			E('p',{class:'ex-muted'},['Exemplo: roteador 192.168.25.1 sugere automaticamente DHCP 192.168.25.10 até 192.168.25.254. Depois você pode ajustar só o final. O DHCP não pode incluir o IP do roteador. DNS preenchido será enviado aos aparelhos via DHCP.']),
			E('div',{class:'ex-cleanup-entry',style:'margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.03);'},[
				E('div',{},[
					E('strong',{},['🌐 Conectividade IPv6 e Modo Cascata (NDP Relay)']),
					E('small',{class:'ex-muted'},['Configure o protocolo IPv6 para esta rede local (Pilha Dupla Global, Seletivo por MAC, Cascata/NDP Relay ou IPv4 Puro).'])
				]),
				E('button',{class:'ex-mini-button btn-ipv6',style:'min-height:38px;padding:6px 14px;','click':L.bind(function(){closeModal();this.showIpv6Modal();},this)},['🌐 Ajustes IPv6 / Relay'])
			]),
			E('div',{class:'right',style:'margin-top:16px;'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				const dns=[dns1.value.trim(),dns2.value.trim(),dns3.value.trim()].filter(Boolean);
				const next={mode:mode.value,routerIp:routerIp.value.trim(),netmask:netmask.value.trim(),startIp:dhcpStart.value.trim(),endIp:dhcpEnd.value.trim(),dns:dns,oldIp:state.ipaddr||''};
				ui.showModal('Confirmar alteração da LAN',[E('p',{class:'alert-message warning'},['Essa alteração reinicia a rede/portas LAN e DHCP. O painel pode cair por alguns segundos e os dispositivos podem precisar renovar IP.']),E('div',{class:'ex-qos-edit-grid'},[E('section',{},[E('h3',{},['Novo acesso']),E('p',{},['Roteador: ',E('strong',{},[next.routerIp])]),E('p',{},['Máscara: ',E('strong',{},[next.netmask])])]),E('section',{},[E('h3',{},['Nova faixa DHCP']),E('p',{},[next.startIp,' → ',next.endIp])]),E('section',{},[E('h3',{},['DNS via DHCP']),E('p',{},[next.dns.length?next.dns.join(' • '):'Sem DNS fixo'])])]),E('p',{class:'ex-muted'},['O ARK cria backup em /tmp antes de aplicar. Se o IP principal mudar, tentarei abrir automaticamente o painel no novo endereço.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Voltar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
					const args=['lan-save','mode='+next.mode,'router_ip='+next.routerIp,'netmask='+next.netmask,'start_ip='+next.startIp,'end_ip='+next.endIp,'dns='+next.dns.join(' ')];
					return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar LAN');let out={};try{out=JSON.parse(r.stdout||'{}');}catch(e){}ui.hideModal();if((out.new_ip||next.routerIp)!==(out.old_ip||next.oldIp))redirectToRouter(out.new_ip||next.routerIp,'LAN salva. Tentando abrir o painel no novo IP '+(out.new_ip||next.routerIp)+'…',1000);else reloadSoon('Faixa DHCP salva. Recarregando o painel…',1000);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
				},this)},['Aplicar agora'])])]);
			},this)},['Continuar'])])
		]);
	},

	disableIpv6Full: function(){
		ui.showModal('Desativar IPv6 totalmente',[
			E('p',{class:'alert-message warning'},['Essa ação cria backup e remove/desativa WAN6, ULA, anúncios RA, DHCPv6/NDP, regras IPv6 do firewall e serviços odhcp6c/odhcpd quando presentes.']),
			E('p',{class:'ex-muted'},['Use quando o roteador deve operar somente em IPv4. A internet IPv4, Wi‑Fi e DHCP IPv4 continuam funcionando.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-negative','click':function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control',['ipv6-disable-full']).then(function(r){
					if(r.code)throw new Error(r.stderr||'Falha ao desativar IPv6');
					let out={};try{out=JSON.parse(r.stdout||'{}');}catch(e){}
					ui.hideModal();
					ui.addNotification(null,E('p',{},['IPv6 desativado. Backup: ',out.backup||'/tmp/ark-router-before-cleanup-*.tar.gz']));
					window.setTimeout(function(){window.location.reload();},1000);
				}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			}},['Criar backup e desativar IPv6'])])
		]);
	},

	showIpv6Modal: function() {
		const self = this;
		ui.showModal('Central de Conectividade IPv6', [
			E('p', { class: 'ex-muted' }, ['Consultando status de rede IPv6 do roteador…'])
		]);
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['ipv6-status']).then(function(r) {
			let st = {};
			try { st = JSON.parse(r.stdout || '{}'); } catch(e) {}
			const curMode = st.mode || 'dual_stack';
			const isRelay = !!st.relay;

			const modeBadgeMeta = {
				ipv4_only: { label: 'Modo 1: IPv4 Apenas', color: '#f59e0b', bg: 'rgba(245,158,11,.15)', border: 'rgba(245,158,11,.35)' },
				dual_stack: { label: 'Modo 2: Pilha Dupla Global', color: '#10b981', bg: 'rgba(16,185,129,.15)', border: 'rgba(16,185,129,.35)' },
				selective: { label: 'Modo 3: IPv6 Seletivo por MAC', color: '#38bdf8', bg: 'rgba(56,189,248,.15)', border: 'rgba(56,189,248,.35)' },
				ipv6_only: { label: 'Modo 4: IPv6-Only (Single-Stack)', color: '#c084fc', bg: 'rgba(192,132,252,.15)', border: 'rgba(192,132,252,.35)' }
			};
			const curBadge = modeBadgeMeta[curMode] || modeBadgeMeta.dual_stack;

			const statusHeader = E('div', {
				class: 'ex-priority-desc-box',
				style: 'margin-bottom: 16px; border: 1px solid rgba(255,255,255,.1); padding: 14px; border-radius: 10px; background: rgba(15,23,42,.6);'
			}, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 12px;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
						E('strong', { style: 'font-size: 0.95rem; color: #f8fafc;' }, ['Estado Atual:']),
						E('span', {
							class: 'ex-device-badge',
							style: 'font-weight: 700; font-size: 0.78rem; padding: 3px 10px; border-radius: 8px; color:' + curBadge.color + '; background:' + curBadge.bg + '; border: 1px solid ' + curBadge.border + ';'
						}, [ curBadge.label ])
					]),
					E('span', {
						class: 'ex-pill ' + (st.odhcpd_active ? 'online' : 'standby'),
						style: 'font-size: 0.75rem;'
					}, [ st.odhcpd_active ? (isRelay ? 'odhcpd (Relay Ativo)' : 'odhcpd (Servidor Ativo)') : 'odhcpd desligado' ])
				]),
				E('div', { class: 'ex-grid ex-grid-2', style: 'gap: 8px; font-size: 0.8rem;' }, [
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['Prefixo ISP Delegado: ']),
						E('strong', { style: 'color: #38bdf8; font-family: monospace;' }, [ st.prefix_delegated && st.prefix_delegated !== 'none' ? st.prefix_delegated : 'Nenhum / Não recebido' ])
					]),
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['Prefixo ULA Local: ']),
						E('strong', { style: 'color: #cbd5e1; font-family: monospace;' }, [ st.ula_prefix && st.ula_prefix !== 'none' ? st.ula_prefix : 'fd73:0192:0168::/48' ])
					]),
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['Filtro AAAA no DNS: ']),
						E('strong', { style: 'color: ' + (st.filter_aaaa ? '#f59e0b' : '#10b981') }, [ st.filter_aaaa ? 'Ativo (Bloqueando AAAA)' : 'Desativado (Normal)' ])
					]),
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['Dispositivos Seletivos: ']),
						E('strong', { style: 'color: #38bdf8;' }, [ (st.selective_allowed_macs && st.selective_allowed_macs.length) ? (st.selective_allowed_macs.length + ' autorizado(s)') : 'Nenhum aparelho liberado' ])
					])
				])
			]);

			const applyMode = function(newMode, label, promptMsg) {
				ui.showModal('Aplicar ' + label, [
					E('p', { class: 'alert-message warning' }, [ promptMsg || 'O roteador reconfigurará o subsistema IPv6 e recarregará as interfaces e firewall. A conexão de rede reiniciará brevemente.' ]),
					E('div', { class: 'right' }, [
						E('button', { class: 'btn cbi-button cbi-button-neutral', click: function(){ self.showIpv6Modal(); } }, ['Voltar']),
						' ',
						E('button', {
							class: 'btn cbi-button cbi-button-positive',
							click: function(ev) {
								const b = ev.currentTarget;
								b.disabled = true;
								b.textContent = 'Aplicando…';
								return fs.exec('/usr/sbin/equipe-dashboard-control', ['ipv6-mode-set', newMode]).then(function(res) {
									if (res.code) throw new Error(res.stderr || 'Falha ao aplicar modo IPv6');
									ui.hideModal();
									ui.addNotification(null, E('p', {}, [label + ' ativado com sucesso.']));
									window.setTimeout(function(){ window.location.reload(); }, 2200);
								}).catch(function(e) {
									b.disabled = false;
									b.textContent = 'Confirmar e aplicar';
									if (reloadAfterExpectedDisconnect(e, 'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…', 4200)) return;
									ui.addNotification(null, E('p', {}, [e.message]), 'danger');
								});
							}
						}, ['Confirmar e aplicar'])
					])
				]);
			};

			const renderModeCard = function(modeId, title, badgeText, description, benefitsList, isCurrent) {
				return E('div', {
					class: 'ex-cleanup-entry',
					style: 'margin-bottom: 12px; padding: 14px; border-radius: 10px; border: 1px solid ' + (isCurrent ? 'rgba(56,189,248,.4)' : 'rgba(255,255,255,.08)') + '; background: ' + (isCurrent ? 'rgba(56,189,248,.05)' : 'rgba(255,255,255,.02)') + ';'
				}, [
					E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
						E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;' }, [
							E('strong', { style: 'font-size: 0.92rem; color: #f8fafc;' }, [ title ]),
							E('span', { class: 'ex-device-badge', style: 'font-size: 0.68rem; padding: 2px 6px; border-radius: 6px; background: rgba(255,255,255,.1); color: #cbd5e1;' }, [ badgeText ]),
							isCurrent ? E('span', { class: 'ex-pill ok', style: 'font-size: 0.68rem; padding: 2px 6px;' }, [ 'ATIVO ATUALMENTE' ]) : ''
						]),
						E('p', { class: 'ex-muted', style: 'font-size: 0.8rem; line-height: 1.4; margin: 4px 0 6px;' }, [ description ]),
						E('ul', { style: 'margin: 0; padding-left: 18px; font-size: 0.78rem; color: #94a3b8; line-height: 1.45;' }, benefitsList.map(function(b){ return E('li', {}, [ b ]); }))
					]),
					E('div', { style: 'flex: 0 0 auto; display: flex; align-items: center; margin-left: 12px;' }, [
						isCurrent
							? E('button', { class: 'ex-mini-button', disabled: true, style: 'opacity: .6; cursor: default;' }, [ 'Modo Ativo' ])
							: E('button', {
								class: 'ex-mini-button',
								style: 'min-height: 40px; padding: 8px 14px; font-weight: 600;',
								click: function(){ applyMode(modeId, title); }
							}, [ 'Ativar Modo' ])
					])
				]);
			};

			const cards = [
				renderModeCard('dual_stack', 'Modo 2: Pilha Dupla Global', 'Recomendado Padrão',
					'IPv4 e IPv6 nativos funcionando simultaneamente com máxima performance e compatibilidade global.',
					[
						'Compatível com PPPoE Fibra e conexões DHCPv6 dinâmicas (IA_PD automático).',
						'Endereçamento ULA estático permanente (fd73:0192:0168::/48) blindando hostnames locais (.lan) contra trocas de IP da operadora.',
						'Conformidade RFC 7084: expiração imediata de prefixos antigos (valid_lifetime=0) em quedas do PPPoE.'
					],
					curMode === 'dual_stack'
				),
				renderModeCard('selective', 'Modo 3: IPv6 Seletivo por Aparelho', 'Escudo Gamer & IoT',
					'Apenas aparelhos marcados com "⚡ Permitir IPv6" no painel utilizam IPv6. Dispositivos não autorizados têm o tráfego rejeitado instantaneamente em 0,1ms.',
					[
						'Zero lag no Happy Eyeballs: celulares e TVs antigas não congelam esperando timeout de IPv6; caem em 0,1ms no IPv4.',
						'Otimizado para PC Gamer, PlayStation 5, Xbox Series e iPhones de última geração.',
						'Gerenciável aparelho por aparelho diretamente no card DISPOSITIVOS.'
					],
					curMode === 'selective'
				),
				renderModeCard('ipv4_only', 'Modo 1: IPv4 Apenas', 'Purga Limpa',
					'Desliga totalmente o stack IPv6 do kernel, wan6, odhcpd e ULA. Ativa filtro de consultas AAAA no DNS.',
					[
						'Para redes legadas ou operadoras com IPv6 instável.',
						'Filtro AAAA impede que navegadores percam tempo consultando endereços IPv6 inexistentes.',
						'Economiza memória RAM e ciclos de CPU desativando daemons IPv6.'
					],
					curMode === 'ipv4_only'
				),
				renderModeCard('ipv6_only', 'Modo 4: IPv6-Only (Futurista)', 'Single-Stack',
					'LAN operando puramente em IPv6 sem concessões DHCP IPv4 locais, com síntese DNS64 no dnsmasq.',
					[
						'Ideal para laboratórios, testes de novas tecnologias e transição pura para a próxima geração.',
						'Apenas dispositivos compatíveis com IPv6 navegarão na rede local.'
					],
					curMode === 'ipv6_only'
				)
			];

			const relayToggle = E('input', {
				type: 'checkbox',
				checked: isRelay ? '' : null,
				change: function(ev) {
					const desired = ev.currentTarget.checked ? '1' : '0';
					ev.currentTarget.disabled = true;
					fs.exec('/usr/sbin/equipe-dashboard-control', ['ipv6-relay-toggle', desired]).then(function(res) {
						if (res.code) throw new Error(res.stderr || 'Falha ao alternar NDP Relay');
						ui.addNotification(null, E('p', {}, [desired === '1' ? 'Modo NDP Relay ativado.' : 'Modo Servidor odhcpd ativado.']));
						self.showIpv6Modal();
					}).catch(function(e) {
						ev.currentTarget.disabled = false;
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					});
				}
			});
			relayToggle.checked = !!isRelay;

			const cascadePanel = E('section', {
				class: 'ex-cleanup-entry',
				style: 'margin-top: 16px; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); align-items: center;'
			}, [
				E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;' }, [
						E('strong', { style: 'font-size: 0.92rem; color: #f8fafc;' }, ['🔗 Roteador em Cascata / NDP Relay']),
						E('span', { class: 'ex-pill ' + (isRelay ? 'online' : 'standby'), style: 'font-size: 0.7rem;' }, [ isRelay ? 'RELAY ATIVO' : 'SERVIDOR DIRETO' ])
					]),
					E('p', { class: 'ex-muted', style: 'font-size: 0.8rem; line-height: 1.4; margin: 4px 0 0;' }, [
						'Ative se este ARK Router estiver conectado atrás de outro roteador principal (operadora) e receber apenas um prefixo /64. O odhcpd repassa os anúncios de vizinhança (NDP) transparentemente para os seus clientes, sem necessidade de DMZ no mestre.'
					])
				]),
				E('div', { style: 'flex: 0 0 auto; margin-left: 14px; display: flex; flex-direction: row; align-items: center; gap: 10px;' }, [
					E('strong', { class: 'ex-device-switch-state', style: 'font-size: 0.8rem; font-weight: 700; color: ' + (isRelay ? '#38bdf8' : '#94a3b8') + ';' }, [ isRelay ? 'Ativado' : 'Desativado' ]),
					E('label', { class: 'ex-switch', style: 'width: 48px; min-width: 48px; max-width: 48px; height: 26px; min-height: 26px; max-height: 26px; margin: 0;' }, [
						relayToggle,
						E('span', { class: 'ex-switch-slider' })
					])
				])
			]);

			ui.showModal('Central de Conectividade IPv6', [
				statusHeader,
				E('div', {}, cards),
				cascadePanel,
				E('div', { class: 'right', style: 'margin-top: 16px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar'])
				])
			]);
		}).catch(function(e) {
			ui.showModal('Central de Conectividade IPv6', [
				E('p', { class: 'alert-message danger' }, [ 'Falha ao consultar estado IPv6: ' + e.message ]),
				E('div', { class: 'right' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar'])
				])
			]);
		});
	},

	showAddMwanRuleModal: function() {
		const self = this;
		const closeModal = function() { ui.hideModal(); };
		const clients = (this.lastData && this.lastData.clients) || [];
		
		const nameInput = E('input', {
			type: 'text',
			class: 'cbi-input-text',
			placeholder: _t('Ex: PC Gamer Torrent, Steam, Console'),
			style: 'width: 100%;'
		});

		const clientOptions = [
			E('option', { value: '' }, [_t('Todos os aparelhos da rede (Qualquer IP)')]),
			E('option', { value: 'custom' }, [_t('Digitar IP manualmente…')])
		];

		clients.forEach(function(c) {
			const label = (c.hostname || c.name || _t('Dispositivo')) + ' (' + (c.ip || c.mac) + ')';
			clientOptions.push(E('option', { value: c.ip }, [label]));
		});

		const deviceSelect = E('select', {
			class: 'cbi-input-select',
			style: 'width: 100%;'
		}, clientOptions);

		const customIpInput = E('input', {
			type: 'text',
			class: 'cbi-input-text',
			placeholder: '192.168.73.181',
			style: 'width: 100%; margin-top: 8px; display: none;'
		});

		deviceSelect.addEventListener('change', function() {
			customIpInput.style.display = (deviceSelect.value === 'custom') ? 'block' : 'none';
			if (deviceSelect.value === 'custom') customIpInput.focus();
		});

		const protoSelect = E('select', {
			class: 'cbi-input-select',
			style: 'width: 100%;'
		}, [
			E('option', { value: 'tcp udp' }, [_t('TCP e UDP (Recomendado)')]),
			E('option', { value: 'tcp' }, [_t('Apenas TCP')]),
			E('option', { value: 'udp' }, [_t('Apenas UDP')])
		]);

		const portStartInput = E('input', {
			type: 'number',
			class: 'cbi-input-text',
			min: '1',
			max: '65535',
			placeholder: _t('Ex: 51413 ou 6881'),
			style: 'width: 100%;'
		});

		const portEndInput = E('input', {
			type: 'number',
			class: 'cbi-input-text',
			min: '1',
			max: '65535',
			placeholder: _t('Ex: 6999 (opcional)'),
			style: 'width: 100%;'
		});

		const policySelect = E('select', {
			class: 'cbi-input-select',
			style: 'width: 100%;'
		}, [
			E('option', { value: 'balanced' }, [_t('⚖️ Balancear pelas 2 Internets (Multi-WAN)')]),
			E('option', { value: 'wan_only' }, [_t('🔵 Somente WAN1 (Claro)')]),
			E('option', { value: 'wan2_only' }, [_t('🟣 Somente WAN2 (Link Telecom)')]),
			E('option', { value: 'wan_then_wan2' }, [_t('🛡️ WAN1 principal (Failover para WAN2)')]),
			E('option', { value: 'wan2_then_wan' }, [_t('🛡️ WAN2 principal (Failover para WAN1)')])
		]);

		const modalContent = [
			E('p', { class: 'ex-muted', style: 'margin-bottom: 14px;' }, [
				_t('Crie uma regra personalizada para direcionar portas específicas ou aparelhos para o balanceamento ou um link exclusivo.')
			]),
			E('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, [
				E('div', {}, [
					E('label', { style: 'font-weight:600;display:block;margin-bottom:4px;' }, [_t('Nome da Regra:')]),
					nameInput
				]),
				E('div', {}, [
					E('label', { style: 'font-weight:600;display:block;margin-bottom:4px;' }, [_t('Aparelho ou IP de Origem:')]),
					deviceSelect,
					customIpInput
				]),
				E('div', {}, [
					E('label', { style: 'font-weight:600;display:block;margin-bottom:4px;' }, [_t('Protocolo:')]),
					protoSelect
				]),
				E('div', {}, [
					E('label', { style: 'font-weight:600;display:block;margin-bottom:4px;' }, [_t('Faixa de Portas (Destino):')]),
					E('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px;' }, [
						E('div', {}, [
							E('small', { class: 'ex-muted', style: 'display:block;margin-bottom:3px;' }, [_t('Porta Inicial:')]),
							portStartInput
						]),
						E('div', {}, [
							E('small', { class: 'ex-muted', style: 'display:block;margin-bottom:3px;' }, [_t('Porta Final (Faixa):')]),
							portEndInput
						])
					]),
					E('small', { class: 'ex-muted', style: 'display:block;margin-top:4px;' }, [
						_t('Deixe a porta final vazia para aplicar apenas a uma única porta, ou preencha as duas para criar uma faixa contínua.')
					])
				]),
				E('div', {}, [
					E('label', { style: 'font-weight:600;display:block;margin-bottom:4px;' }, [_t('Ação / Rota de Saída:')]),
					policySelect
				])
			]),
			E('div', { class: 'right', style: 'margin-top: 18px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, [_t('Cancelar')]),
				' ',
				E('button', {
					class: 'btn cbi-button cbi-button-positive',
					click: function(ev) {
						const btn = ev.currentTarget;
						const name = (nameInput.value || '').trim();
						if (!name) {
							ui.addNotification(null, E('p', {}, [_t('Digite um nome para a regra.')]), 'warning');
							nameInput.focus();
							return;
						}
						let ip = deviceSelect.value;
						if (ip === 'custom') {
							ip = (customIpInput.value || '').trim();
							if (ip && !/^([0-9]{1,3}\.){3}[0-9]{1,3}(\/[0-9]{1,2})?$/.test(ip)) {
								ui.addNotification(null, E('p', {}, [_t('Endereço IP inválido.')]), 'danger');
								customIpInput.focus();
								return;
							}
						}
						const pStart = (portStartInput.value || '').trim();
						const pEnd = (portEndInput.value || '').trim();
						if (pStart && (parseInt(pStart, 10) < 1 || parseInt(pStart, 10) > 65535)) {
							ui.addNotification(null, E('p', {}, [_t('Porta inicial deve estar entre 1 e 65535.')]), 'danger');
							portStartInput.focus();
							return;
						}
						if (pEnd && (parseInt(pEnd, 10) < 1 || parseInt(pEnd, 10) > 65535)) {
							ui.addNotification(null, E('p', {}, [_t('Porta final deve estar entre 1 e 65535.')]), 'danger');
							portEndInput.focus();
							return;
						}
						if (pStart && pEnd && parseInt(pEnd, 10) <= parseInt(pStart, 10)) {
							ui.addNotification(null, E('p', {}, [_t('A porta final deve ser maior que a porta inicial.')]), 'danger');
							portEndInput.focus();
							return;
						}

						btn.disabled = true;
						btn.textContent = _t('Salvando…');
						return fs.exec('/usr/sbin/equipe-dashboard-control', [
							'mwan-rule-add',
							'name=' + name,
							'src_ip=' + ip,
							'proto=' + protoSelect.value,
							'port_start=' + pStart,
							'port_end=' + pEnd,
							'policy=' + policySelect.value
						]).then(function(res) {
							if (res.code) throw new Error(res.stderr || _t('Falha ao adicionar regra'));
							ui.hideModal();
							ui.addNotification(null, E('p', {}, [_t('Regra criada com sucesso!')]), 'info');
							return self.fetchData().then(L.bind(self.update, self));
						}).catch(function(err) {
							btn.disabled = false;
							btn.textContent = _t('Salvar Regra');
							ui.addNotification(null, E('p', {}, [err.message]), 'danger');
						});
					}
				}, [_t('Salvar Regra')])
			])
		];

		ui.showModal(_t('➕ Nova Regra de Roteamento Multi-WAN'), modalContent);
	},

	deleteMwanRule: function(ruleId, ruleName) {
		const self = this;
		const closeModal = function() { ui.hideModal(); };
		ui.showModal(_t('Excluir Regra de Roteamento'), [
			E('p', {}, [_t('Tem certeza que deseja excluir a regra “') + (ruleName || ruleId) + _t('”?')]),
			E('div', { class: 'right', style: 'margin-top: 14px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, [_t('Cancelar')]),
				' ',
				E('button', {
					class: 'btn cbi-button cbi-button-negative',
					click: function(ev) {
						const btn = ev.currentTarget;
						btn.disabled = true;
						btn.textContent = _t('Excluindo…');
						return fs.exec('/usr/sbin/equipe-dashboard-control', ['mwan-rule-delete', ruleId]).then(function(res) {
							if (res.code) throw new Error(res.stderr || _t('Falha ao excluir regra'));
							ui.hideModal();
							ui.addNotification(null, E('p', {}, [_t('Regra excluída com sucesso!')]), 'info');
							return self.fetchData().then(L.bind(self.update, self));
						}).catch(function(err) {
							btn.disabled = false;
							btn.textContent = _t('Excluir');
							ui.addNotification(null, E('p', {}, [err.message]), 'danger');
						});
					}
				}, [_t('Excluir')])
			])
		]);
	},

	toggleMwanRule: function(ruleId, isChecked) {
		const self = this;
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['mwan-rule-toggle', ruleId, isChecked ? '1' : '0']).then(function(res) {
			if (res.code) throw new Error(res.stderr || _t('Falha ao alternar regra'));
			ui.addNotification(null, E('p', {}, [isChecked ? _t('Regra ativada com sucesso!') : _t('Regra desativada!')]), 'info');
			setTimeout(function() {
				self.fetchData().then(L.bind(self.update, self)).catch(function(){});
			}, 800);
		}).catch(function(err) {
			if (err && (err.message || '').toLowerCase().indexOf('xhr') >= 0) {
				setTimeout(function() {
					self.fetchData().then(L.bind(self.update, self)).catch(function(){});
				}, 1500);
				return;
			}
			ui.addNotification(null, E('p', {}, [err.message]), 'danger');
		});
	},

	toggleMwanTorrentPreset: function(input, currentPorts, currentIp) {
		const self = this;
		const isChecked = input.checked;
		input.disabled = true;
		const ports = currentPorts || '1024:8079,8081:8442,8444:65535';
		const targetIp = currentIp || '0.0.0.0';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['mwan-torrent-toggle', isChecked ? '1' : '0', ports, targetIp]).then(function(res) {
			input.disabled = false;
			if (res.code) throw new Error(res.stderr || _t('Falha ao alternar aceleração P2P'));
			ui.addNotification(null, E('p', {}, [isChecked ? _t('Aceleração BitTorrent/P2P nas 2 conexões ATIVADA!') : _t('Aceleração BitTorrent/P2P DESATIVADA.')]), 'info');
			setTimeout(function() {
				self.fetchData().then(L.bind(self.update, self)).catch(function(){});
			}, 800);
		}).catch(function(err) {
			input.disabled = false;
			input.checked = !isChecked;
			if (err && (err.message || '').toLowerCase().indexOf('xhr') >= 0) {
				setTimeout(function() {
					self.fetchData().then(L.bind(self.update, self)).catch(function(){});
				}, 1500);
				return;
			}
			ui.addNotification(null, E('p', {}, [err.message]), 'danger');
		});
	},

	showMwanTorrentModal: function(currentPorts, currentIp) {
		const self = this;
		const closeModal = function() { ui.hideModal(); };
		const WIDE_PORTS = '1024:8079,8081:8442,8444:65535';
		const CLASSIC_PORTS = '51413,6881:6999';
		const clients = (this.lastData && this.lastData.clients) || [];

		let activePorts = currentPorts || WIDE_PORTS;
		let initialPreset = 'custom';
		if (activePorts === WIDE_PORTS || (activePorts.indexOf('1024') >= 0 && activePorts.indexOf('65535') >= 0)) {
			initialPreset = 'wide';
		} else if (activePorts === CLASSIC_PORTS) {
			initialPreset = 'classic';
		}

		let activeIp = (currentIp && currentIp !== '0.0.0.0' && currentIp !== '0.0.0.0/0') ? currentIp : '0.0.0.0';

		const customInput = E('input', {
			type: 'text',
			class: 'cbi-input-text',
			value: activePorts,
			placeholder: _t('Ex: 51413, 6881:6999 ou 1024:65535'),
			style: 'width: 100%; margin-top: 8px;'
		});

		const radioWide = E('input', { type: 'radio', name: 'torrent_mode', value: 'wide', id: 'ex-tor-mode-wide' });
		const radioClassic = E('input', { type: 'radio', name: 'torrent_mode', value: 'classic', id: 'ex-tor-mode-classic' });
		const radioCustom = E('input', { type: 'radio', name: 'torrent_mode', value: 'custom', id: 'ex-tor-mode-custom' });

		if (initialPreset === 'wide') radioWide.checked = true;
		else if (initialPreset === 'classic') radioClassic.checked = true;
		else radioCustom.checked = true;

		const updateInputVisibility = function() {
			customInput.disabled = !radioCustom.checked;
			if (radioWide.checked) customInput.value = WIDE_PORTS;
			else if (radioClassic.checked) customInput.value = CLASSIC_PORTS;
		};
		updateInputVisibility();

		[radioWide, radioClassic, radioCustom].forEach(function(r) {
			r.addEventListener('change', updateInputVisibility);
		});

		// Seletor de Aparelho Alvo (IP)
		const clientOptions = [
			E('option', { value: '0.0.0.0' }, [_t('🌐 Toda a Rede (0.0.0.0) — Padrão')])
		];

		let foundInClients = false;
		clients.forEach(function(c) {
			if (!c.ip) return;
			const label = (c.hostname || c.name || _t('Dispositivo')) + ' (' + c.ip + ')';
			clientOptions.push(E('option', { value: c.ip }, [label]));
			if (c.ip === activeIp) foundInClients = true;
		});

		clientOptions.push(E('option', { value: 'custom' }, [_t('✏️ Digitar IP manualmente…')]));

		const deviceSelect = E('select', {
			class: 'cbi-input-select',
			style: 'width: 100%; font-size: 13px; font-weight: 500;'
		}, clientOptions);

		const customIpInput = E('input', {
			type: 'text',
			class: 'cbi-input-text',
			placeholder: '192.168.73.90',
			value: (activeIp !== '0.0.0.0' && !foundInClients) ? activeIp : '',
			style: 'width: 100%; margin-top: 8px; display: ' + ((activeIp !== '0.0.0.0' && !foundInClients) ? 'block' : 'none') + ';'
		});

		if (activeIp === '0.0.0.0') {
			deviceSelect.value = '0.0.0.0';
		} else if (foundInClients) {
			deviceSelect.value = activeIp;
		} else {
			deviceSelect.value = 'custom';
		}

		deviceSelect.addEventListener('change', function() {
			customIpInput.style.display = (deviceSelect.value === 'custom') ? 'block' : 'none';
			if (deviceSelect.value === 'custom') customIpInput.focus();
		});

		const content = [
			E('p', { class: 'ex-muted', style: 'margin-bottom: 14px; font-size: 13px; line-height: 1.45;' }, [
				_t('Configure o balanceamento de BitTorrent/P2P nas 2 conexões para acelerar downloads. Você pode acelerar para toda a rede ou direcionar exclusivamente para seu PC ou console.')
			]),
			E('div', { style: 'margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;' }, [
				E('strong', { style: 'display: block; color: #38bdf8; margin-bottom: 4px; font-size: 13.5px;' }, [
					_t('🎯 Aparelho Alvo (IP de Origem)')
				]),
				E('small', { class: 'ex-muted', style: 'display: block; margin-bottom: 8px; line-height: 1.4;' }, [
					_t('Escolha se a aceleração BitTorrent se aplica a toda a casa ou apenas a uma máquina específica (protegendo Alexas e outros dispositivos de qualquer interferência):')
				]),
				deviceSelect,
				customIpInput
			]),
			E('div', { style: 'display: flex; flex-direction: column; gap: 12px;' }, [
				E('label', { style: 'display: flex; align-items: flex-start; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;' }, [
					radioWide,
					E('div', {}, [
						E('strong', { style: 'display: block; color: #f8fafc;' }, [_t('🚀 Modo Amplo Seguro (Recomendado)')]),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, [
							_t('Abre 1024-8079, 8081-8442, 8444-65535 (>64.500 portas). Cobre 100% dos clientes e peers de torrent sem tocar em portas web (80, 443, 8080, 8443) nem portas de sistema (1-1023).')
						])
					])
				]),
				E('label', { style: 'display: flex; align-items: flex-start; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;' }, [
					radioClassic,
					E('div', {}, [
						E('strong', { style: 'display: block; color: #f8fafc;' }, [_t('📦 Modo Padrão Clássico')]),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, [
							_t('Portas 51413 e 6881-6999 apenas. Modo restrito legado do BitTorrent.')
						])
					])
				]),
				E('label', { style: 'display: flex; align-items: flex-start; gap: 10px; cursor: pointer; padding: 10px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;' }, [
					radioCustom,
					E('div', { style: 'width: 100%;' }, [
						E('strong', { style: 'display: block; color: #f8fafc;' }, [_t('✏️ Portas Personalizadas')]),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, [
							_t('Digite as portas separadas por vírgula ou faixas separadas por dois-pontos/hífen:')
						]),
						customInput
					])
				])
			]),
			E('div', { class: 'right', style: 'margin-top: 18px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, [_t('Cancelar')]),
				' ',
				E('button', {
					class: 'btn cbi-button cbi-button-positive',
					click: function(ev) {
						const btn = ev.currentTarget;
						btn.disabled = true;
						btn.textContent = _t('Aplicando…');
						let selectedPorts = customInput.value.trim();
						if (radioWide.checked) selectedPorts = WIDE_PORTS;
						else if (radioClassic.checked) selectedPorts = CLASSIC_PORTS;

						if (!selectedPorts) {
							btn.disabled = false;
							btn.textContent = _t('Salvar e Aplicar');
							ui.addNotification(null, E('p', {}, [_t('Digite pelo menos uma porta ou faixa.')]), 'warning');
							return;
						}

						let selectedIp = deviceSelect.value;
						if (selectedIp === 'custom') {
							selectedIp = customIpInput.value.trim();
							if (!selectedIp) {
								btn.disabled = false;
								btn.textContent = _t('Salvar e Aplicar');
								ui.addNotification(null, E('p', {}, [_t('Digite um endereço IP válido para o aparelho.')]), 'warning');
								return;
							}
						}
						if (!selectedIp) selectedIp = '0.0.0.0';

						return fs.exec('/usr/sbin/equipe-dashboard-control', ['mwan-torrent-toggle', '1', selectedPorts, selectedIp]).then(function(res) {
							if (res.code) throw new Error(res.stderr || _t('Falha ao aplicar portas de BitTorrent'));
							ui.hideModal();
							ui.addNotification(null, E('p', {}, [_t('Configurações de BitTorrent/P2P atualizadas com sucesso!')]), 'info');
							setTimeout(function() {
								self.fetchData().then(L.bind(self.update, self)).catch(function(){});
							}, 800);
						}).catch(function(err) {
							btn.disabled = false;
							btn.textContent = _t('Salvar e Aplicar');
							if (err && (err.message || '').toLowerCase().indexOf('xhr') >= 0) {
								ui.hideModal();
								ui.addNotification(null, E('p', {}, [_t('Configurações de BitTorrent/P2P atualizadas com sucesso!')]), 'info');
								setTimeout(function() {
									self.fetchData().then(L.bind(self.update, self)).catch(function(){});
								}, 1500);
								return;
							}
							ui.addNotification(null, E('p', {}, [err.message]), 'danger');
						});
					}
				}, [_t('Salvar e Aplicar')])
			])
		];

		ui.showModal(_t('Configuração de Portas BitTorrent / P2P'), content);
	}
};
