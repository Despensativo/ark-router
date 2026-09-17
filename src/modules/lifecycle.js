// /src/modules/lifecycle.js - ARK Router LuCI View Module
const lifecycleMethods = {
	board: {}, countries: [], capabilities: {features:{}}, previous: {}, trafficPrevious: {}, trafficAt: 0, currentData: null, recommendedChannels: null, speedResults: {}, refreshTimer: null, dashboardRoot: null, deviceSortKey: 'total', deviceSortDir: 'desc', starlinkTelemetryTimer: null, starlinkTelemetryStopTimer: null, starlinkTelemetryActive: false, starlinkTelemetryWan: null, starlinkWanOrder: [], starlinkResults: {},
	fetchCapabilities: function(){
		return safe(fs.exec('/usr/sbin/equipe-dashboard-control',['features']),{}, 15000).then(function(r){
			try{
				const c=JSON.parse((r&&r.stdout)||'{}');
				if(c && c.features && Object.keys(c.features).length > 0){
					if(typeof window!=='undefined'){window._arkCapabilities=c;}
					return c;
				}
				if(typeof window!=='undefined' && window._arkCapabilities && window._arkCapabilities.features){
					return window._arkCapabilities;
				}
				return c;
			}catch(e){
				if(typeof window!=='undefined' && window._arkCapabilities && window._arkCapabilities.features){
					return window._arkCapabilities;
				}
				return {language:'pt-br',package_manager:'none',features:{}};
			}
		});
	},
	feature: function(key){
		const f = (this.capabilities && this.capabilities.features && this.capabilities.features[key]) ||
		          (typeof window!=='undefined' && window._arkCapabilities && window._arkCapabilities.features && window._arkCapabilities.features[key]) ||
		          null;
		return f || {installed:false,active:false,hidden:false,installable:false};
	},
	themeColor: function(names,fallback){
		const styles=[getComputedStyle(document.documentElement),getComputedStyle(document.body)];
		for(let i=0;i<styles.length;i++)for(let j=0;j<names.length;j++){const value=styles[i].getPropertyValue(names[j]).trim();if(value&&CSS.supports('color',value))return value;}
		return fallback;
	},
	applyAppearance: function(){
		const appearance=this.capabilities.appearance||{}, mode=/^(auto|equipe|custom)$/.test(appearance.mode)?appearance.mode:'auto';
		const profile=this.capabilities.operation_profile||'standard';
		let primary='#3b82f6',secondary='#8b5cf6';
		if(profile==='gamer'){
			primary='#ef4444';
			secondary='#dc2626';
		} else if(mode==='custom'){
			primary=appearance.primary||primary;
			secondary=appearance.secondary||secondary;
		} else if(mode==='auto'){
			primary=this.themeColor(['--primary','--primary-color','--main-color','--brand-primary','--accent-color'],'#5e72e4');
			secondary=this.themeColor(['--secondary','--secondary-color','--accent-color','--brand-secondary'],primary);
		}
		document.documentElement.style.setProperty('--ex-primary',primary);
		document.documentElement.style.setProperty('--ex-secondary',secondary);
		document.documentElement.setAttribute('data-ex-appearance',mode);
		document.documentElement.setAttribute('data-ex-profile',profile);
	},
	triggerImmediateRefresh: function(message, type, hideModal) {
		if (hideModal !== false) {
			try { ui.hideModal(); } catch(e){}
		}
		if (message) {
			ui.addNotification(null, E('p', {}, [message]), type || 'info');
		}
		return Promise.all([
			this.fetchCapabilities(),
			this.fetchData(false)
		]).then(L.bind(function(res) {
			const caps = res[0], data = res[1];
			this.capabilities = caps;
			if (typeof window !== 'undefined') window._arkCapabilities = caps;
			this.applyAppearance();
			this.update(data);
		}, this)).catch(function(err) {
			console.warn('[ARK] Erro no hot-refresh dinâmico:', err);
		});
	},
	switchProfile: function(targetMode){
		const isGamer = targetMode === 'gamer';
		const sqm = values((this.currentData||{}).sqm);
		const qosActive = sqmWanProfiles(this.currentData||{}).some(function(profile){ return !!(sqm[profile.section] && sqm[profile.section].enabled === '1'); });
		const autoEnableSqm = E('input', {type: 'checkbox', checked: ''});
		autoEnableSqm.checked = true;
		const modalElements = [
			E('p', {}, [isGamer ? 'Ativar o Modo Gamer (Baixa Latência)?' : 'Voltar ao Modo Padrão / Controlado?']),
			E('p', {class: 'alert-message warning'}, [isGamer ? 'O ARK Router ativará o tema Vermelho Gamer, aplicará otimizações de baixa latência e anti-bufferbloat (CAKE ack-filter) e priorizará pacotes de jogos em tempo real (DSCP EF).' : 'O ARK Router retornará ao tema visual padrão e aplicará o equilíbrio padrão de tráfego.'])
		];
		if (isGamer && !qosActive) {
			modalElements.push(E('div', {style: 'margin-top: 12px; padding: 10px 14px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px;'}, [
				E('p', {style: 'margin: 0 0 8px 0; font-weight: 600; color: var(--ex-text);'}, ['💡 O SQM / CAKE está desligado no momento.']),
				E('label', {style: 'display: flex; align-items: center; gap: 8px; font-weight: 600; cursor: pointer; color: var(--ex-text);'}, [
					autoEnableSqm,
					E('span', {}, ['Ligar e ativar o SQM / CAKE automaticamente'])
				])
			]));
		}
		modalElements.push(E('div', {class: 'right', style: 'margin-top: 16px;'}, [
			E('button', {class: 'btn cbi-button cbi-button-neutral', 'click': closeModal}, ['Cancelar']), ' ',
			E('button', {class: 'btn cbi-button ' + (isGamer ? 'cbi-button-negative' : 'cbi-button-positive'), 'click': L.bind(function(){
				const shouldTurnOnSqm = isGamer && !qosActive && autoEnableSqm.checked;
				const actions = [fs.exec('/usr/sbin/equipe-dashboard-control', ['profile', targetMode])];
				if (shouldTurnOnSqm) {
					actions.push(fs.exec('/usr/sbin/equipe-dashboard-control', ['sqm-toggle', '1']));
				}
				return Promise.all(actions).then(L.bind(function(r){
					const res = r[0] || {};
					if(res.code) throw new Error(res.stderr || 'Falha ao alterar perfil operacional');
					ui.hideModal();
					const msg = isGamer ? (shouldTurnOnSqm ? 'Modo Gamer e SQM / CAKE ativados com sucesso!' : 'Modo Gamer ativado com sucesso!') : 'Modo Padrão restaurado.';
					this.triggerImmediateRefresh(msg, 'info');
				}, this)).catch(function(e){
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				});
			}, this)}, [isGamer ? 'Confirmar e Ativar Gamer' : 'Confirmar'])
		]));
		ui.showModal(isGamer ? 'Ativar Modo Gamer' : 'Voltar ao Modo Padrão', modalElements);
	},
	applyBrand: function(title){
		title=String(title||'ARK Router');document.title=title+' · OpenWrt';
		window.setTimeout(function(){const link=document.querySelector('a[href$="/admin/equipe-dashboard"],a[href$="/admin/equipe-dashboard/"]');if(!link)return;for(let i=0;i<link.childNodes.length;i++){const node=link.childNodes[i];if(node.nodeType!==Node.TEXT_NODE||!node.nodeValue.trim())continue;const leading=(node.nodeValue.match(/^\s*/)||[''])[0],icon=(node.nodeValue.match(/[\uE000-\uF8FF]/)||[])[0]||'';node.nodeValue=leading+(icon?icon+' ':'')+title;break;}},0);
	},

	load: function() {
		return Promise.all([
			safe(callSystemBoard(), {}),
			Promise.resolve({ results: [] }),
			this.fetchCapabilities(),
			this.fetchData(true)
		]);
	},
	fetchData: function(isInitial) {
		return Promise.all([
			safe(callSystemInfo(), {}), safe(callInterfaceDump(), { interface: [] }),
			safe(callMwanStatus(), {}), safe(callDHCPLeases(), { dhcp_leases: [] }),
			safe(callUciGet('sqm'), { values: {} }), safe(callUciGet('qos_equipe'), { values: {} }), safe(callUciGet('wireless'), { values: {} }), safe(callUciGet('mwan3'), { values: {} }), safe(callUciGet('equipe_devices'), { values: {} }), safe(callUciGet('network'), { values: {} }),
			safe(fs.exec('/usr/sbin/equipe-dashboard-control', [ 'lan-status' ]), {}),
			safe(fs.read('/sys/class/thermal/thermal_zone0/temp'), '0'),
			safe(fs.exec('/usr/sbin/equipe-dashboard-control', [ 'system-perf-status' ]), {}),
			safe(fs.exec('/usr/libexec/nlbwmon-action', [ 'download', '-g', 'family,mac,ip', '-o', '-rx_bytes,-tx_bytes' ]).then(function(res) {
				try { return JSON.parse(res.stdout || '{}'); } catch(e) { return { columns: [], data: [] }; }
			}), { columns: [], data: [] }),
			safe(fs.read('/tmp/equipe-traffic-history.csv'), ''),
			safe(callWirelessStatus(), {}),
			safe(callUciGet('dhcp'), { values: {} }),
			safe(callUciGet('firewall'), { values: {} }),
			safe(fs.read('/tmp/equipe-wan-daily.csv'), ''),
			safe(callHostHints(), {}),
			safe(fs.read('/proc/net/arp'), ''),
			safe(fs.exec('/usr/sbin/equipe-dashboard-control', [ 'system-hardware-info' ]), {}),
			safe(callUciGet('equipe_dashboard'), { values: {} }),
			safe(fs.exec('/usr/sbin/equipe-dashboard-control', [ 'device-fingerprints' ]), {}),
			safe(fs.exec('/usr/sbin/equipe-dashboard-control', [ 'device-stations' ]), {})
		]).then(function(r) {
			const interfaces=r[1], networkConfig=r[9], networkValues=values(networkConfig), topology=wifiTopology(r[15], r[6]), lanPorts=lanPortsFromNetwork(networkConfig);
			const equipeDashboardConfig=r[22] || { values: {} };
			const pingCfg = getPingTargetInfo({ equipeDashboardConfig: equipeDashboardConfig });
			const activeWans=getActiveWanList({networkConfig:networkConfig, interfaces:interfaces});
			const wanDevicesMap={}, wanPhysicalDevicesMap={}, wanPingsMap={};
			const wanPromises=[];
			activeWans.forEach(function(w){
				const live=iface(interfaces,w.iface), cfg=networkValues[w.iface]||{};
				const logicalDev=live.l3_device||live.device||cfg.device||w.iface;
				const physicalDev=cfg.device||live.device||logicalDev;
				wanPromises.push(safe(callDeviceStatus(logicalDev),{}).then(function(s){wanDevicesMap[w.iface]=s;}));
				wanPromises.push(safe(callDeviceStatus(physicalDev),{}).then(function(s){wanPhysicalDevicesMap[w.iface]=s;}));
				if(!isInitial && live.up && logicalDev){
					const ip = (live['ipv4-address'] && live['ipv4-address'][0] && live['ipv4-address'][0].address) || '';
					const bindTarget = ip || logicalDev;
					const pingTarget = resolvePingTarget(pingCfg.target, pingCfg.customIp, live, cfg);
					wanPromises.push(safe(fs.exec('/bin/ping',['-c','1','-W','2','-I',bindTarget,pingTarget]),{}).then(function(p){wanPingsMap[w.iface]=p;}));
				}
			});
			return Promise.all([
				Promise.all(wanPromises),
				Promise.all(topology.mainIfnames.map(function(n){
					return safe(callAssocList(n), { results: [] }).then(function(res){
						return { ifname: n, meta: (topology.ifaceMeta && topology.ifaceMeta[n]) || {}, results: (res && res.results) || [] };
					});
				})),
				Promise.all(topology.guestIfnames.map(function(n){
					return safe(callAssocList(n), { results: [] }).then(function(res){
						return { ifname: n, meta: (topology.ifaceMeta && topology.ifaceMeta[n]) || {}, results: (res && res.results) || [] };
					});
				})),
				isInitial ? Promise.resolve({ results: [] }) : safe(callSurvey(topology.survey2), { results: [] }),
				isInitial ? Promise.resolve({ results: [] }) : safe(callSurvey(topology.survey5), { results: [] }),
				Promise.all(lanPorts.map(function(port){ return safe(callDeviceStatus(port), {}); }))
			]).then(function(x) {
				const deviceStations = (function(){ try { return JSON.parse((r[24] && r[24].stdout) || '{}'); } catch(e){ return {}; } })();
				const stationList = deviceStations.stations || [];
				if (stationList.length > 0) {
					stationList.forEach(function(st) {
						const isG = !!st.is_guest;
						const targetGroup = isG ? x[2] : x[1];
						const ifn = st.ifname || (isG ? 'wlan0-1' : 'wlan0');
						let grp = targetGroup.find(function(g){ return g && g.ifname === ifn; });
						if (!grp) {
							grp = { ifname: ifn, meta: { ifname: ifn, ssid: st.ssid, band: st.band, bandLabel: st.band_label, isGuest: isG }, results: [] };
							targetGroup.push(grp);
						}
						const existing = grp.results.find(function(res){ return String(res.mac).toUpperCase() === String(st.mac).toUpperCase(); });
						if (!existing) {
							grp.results.push({
								mac: st.mac,
								signal: st.signal,
								rx: { bytes: st.rx_bytes, mhz: (st.band === '6g' ? 320 : (st.band === '5g' ? 80 : 20)) },
								tx: { bytes: st.tx_bytes, mhz: (st.band === '6g' ? 320 : (st.band === '5g' ? 80 : 20)) }
							});
						}
					});
				}
				return {
				system:r[0], interfaces:interfaces, wanDevice:wanDevicesMap.wan||{}, wan2Device:wanDevicesMap.wan2||{}, wanPhysicalDevice:wanPhysicalDevicesMap.wan||{}, wan2PhysicalDevice:wanPhysicalDevicesMap.wan2||{},
				wanDevicesMap:wanDevicesMap, wanPhysicalDevicesMap:wanPhysicalDevicesMap, wanPingsMap:wanPingsMap,
				mwan:r[2], leases:r[3], mainAssoc:x[1], guestAssoc:x[2],
				survey2:x[3], survey5:x[4], sqm:r[4], qos:r[5], wireless:r[6], mwanConfig:r[7], names:r[8], networkConfig:r[9], lanStatus:r[10], temperature:r[11], pingWan:wanPingsMap.wan||null, pingWan2:wanPingsMap.wan2||null,
				perfStatus: (function(){ try { return JSON.parse((r[12] && r[12].stdout) || '{}'); } catch(e){ return {}; } })(),
				traffic:r[13], history:r[14], wirelessStatus:r[15], wifiTopology:topology, lanPorts:lanPorts, lanDevices:x[5]||[],
				dhcpConfig: r[16], firewallConfig: r[17], wanDaily: r[18],
				hostHints: r[19] || {}, arpTable: r[20] || '',
				hardwareInfo: (function(){ try { return JSON.parse((r[21] && r[21].stdout) || '{}'); } catch(e){ return {}; } })(),
				equipeDashboardConfig: equipeDashboardConfig,
				deviceFingerprints: (function(){ try { return JSON.parse((r[23] && r[23].stdout) || '{}'); } catch(e){ return {}; } })(),
				deviceStations: deviceStations,
				timestamp:Date.now()
			}; });
		});
	},
	fetchDataTimed: function(timeoutMs) {
		return new Promise(L.bind(function(resolve,reject){
			let done=false;
			const timer=window.setTimeout(function(){if(done)return;done=true;reject(new Error('Tempo esgotado ao atualizar o painel'));},timeoutMs||9000);
			this.fetchData().then(function(data){if(done)return;done=true;window.clearTimeout(timer);resolve(data);}).catch(function(err){if(done)return;done=true;window.clearTimeout(timer);reject(err);});
		},this));
	},
	calculateRates: function(data) {
		const activeWans = getActiveWanList(data);
		let rx = 0, tx = 0, down = 0, up = 0;
		activeWans.forEach(function(w){
			const dev = (data.wanDevicesMap && data.wanDevicesMap[w.iface]) || (w.iface==='wan'?data.wanDevice:(w.iface==='wan2'?data.wan2Device:{})) || {};
			const stats = dev.statistics || {};
			rx += Number(stats.rx_bytes) || 0;
			tx += Number(stats.tx_bytes) || 0;
		});
		if (this.previous.timestamp && data.timestamp > this.previous.timestamp) { const e=(data.timestamp-this.previous.timestamp)/1000; down=Math.max(0,(rx-this.previous.rx)*8/e); up=Math.max(0,(tx-this.previous.tx)*8/e); }
		this.previous={timestamp:data.timestamp,rx:rx,tx:tx}; return {down:down,up:up,rx:rx,tx:tx};
	},
	deviceRates: function(data) {
		const now = trafficMap(data.traffic), out = {}, elapsed = this.trafficAt ? (data.timestamp - this.trafficAt) / 1000 : 0;
		const mainAssoc = assocMap(data.mainAssoc || []), guestAssoc = assocMap(data.guestAssoc || []);
		const wifiAssoc = Object.assign({}, mainAssoc, guestAssoc);

		if (!this.deviceRatesSmoothed) this.deviceRatesSmoothed = {};
		if (!this.wifiPrevious) this.wifiPrevious = {};

		const allMacs = Object.keys(now);
		Object.keys(wifiAssoc).forEach(function(m) {
			if (allMacs.indexOf(m) < 0) allMacs.push(m);
		});

		allMacs.forEach(L.bind(function(mac) {
			const p = this.trafficPrevious[mac];
			const w = wifiAssoc[mac];
			const pw = this.wifiPrevious[mac];

			let instantRx = 0, instantTx = 0;

			// Wi-Fi: AP TX = download do cliente, AP RX = upload do cliente
			if (w && w.rx && w.tx && elapsed > 0) {
				const curWifiRx = Number(w.tx.bytes) || 0;
				const curWifiTx = Number(w.rx.bytes) || 0;
				if (pw) {
					const dRx = Math.max(0, curWifiRx - pw.rx);
					const dTx = Math.max(0, curWifiTx - pw.tx);
					instantRx = (dRx * 8) / elapsed;
					instantTx = (dTx * 8) / elapsed;
				}
				this.wifiPrevious[mac] = { rx: curWifiRx, tx: curWifiTx };
			} else if (now[mac] && p && elapsed > 0) {
				instantRx = Math.max(0, (now[mac].rx - p.rx) * 8 / elapsed);
				instantTx = Math.max(0, (now[mac].tx - p.tx) * 8 / elapsed);
			}

			// Suavização anti-piscamento (mantém a leitura estável na tela)
			const prevSmooth = this.deviceRatesSmoothed[mac] || { rx: 0, tx: 0 };
			let smoothRx = 0, smoothTx = 0;

			if (instantRx > 0) {
				smoothRx = prevSmooth.rx > 0 ? (prevSmooth.rx * 0.35 + instantRx * 0.65) : instantRx;
			} else {
				smoothRx = prevSmooth.rx > 10000 ? prevSmooth.rx * 0.45 : 0;
			}

			if (instantTx > 0) {
				smoothTx = prevSmooth.tx > 0 ? (prevSmooth.tx * 0.35 + instantTx * 0.65) : instantTx;
			} else {
				smoothTx = prevSmooth.tx > 10000 ? prevSmooth.tx * 0.45 : 0;
			}

			this.deviceRatesSmoothed[mac] = { rx: smoothRx, tx: smoothTx };

			const totRx = (now[mac] ? now[mac].rx : 0) || (w && w.tx ? w.tx.bytes : 0);
			const totTx = (now[mac] ? now[mac].tx : 0) || (w && w.rx ? w.rx.bytes : 0);

			out[mac] = {
				rx: smoothRx,
				tx: smoothTx,
				totalRx: totRx,
				totalTx: totTx
			};
		}, this));

		this.trafficPrevious = now;
		this.trafficAt = data.timestamp;

		// Poda defensiva de MACs inativos para evitar vazamento de memória (ARK-19)
		if (this.deviceRatesSmoothed) {
			Object.keys(this.deviceRatesSmoothed).forEach(function(m) {
				if (allMacs.indexOf(m) < 0) delete this.deviceRatesSmoothed[m];
			}, this);
		}
		if (this.wifiPrevious) {
			Object.keys(this.wifiPrevious).forEach(function(m) {
				if (!wifiAssoc[m]) delete this.wifiPrevious[m];
			}, this);
		}
		return out;
	},
	devicesExpanded: function() {
		const details=document.getElementById('ex-device-details');
		return !!(details&&details.open);
	},
	adaptiveRefreshSeconds: function(data) {
		if(!this.devicesExpanded())return 3;
		const mem=(data&&data.system&&data.system.memory)||{}, total=Number(mem.total)||0, free=Number(mem.available||mem.free)||0, mib=1024*1024;
		if(total>=224*mib&&free>=96*mib)return 1;
		if(total>=96*mib&&free>=40*mib)return 2;
		return 3;
	},
	updateRefreshSummary: function(data) {
		const sec=this.adaptiveRefreshSeconds(data), suffix=this.devicesExpanded()?' • lista aberta':'';
		text('ex-refresh-summary','sessão de 12 horas • atualização a cada '+sec+' segundo'+(sec===1?'':'s')+suffix);
	},
	scheduleAdaptiveRefresh: function(delay) {
		if(this.refreshTimer){window.clearTimeout(this.refreshTimer);this.refreshTimer=null;}
		const wait=delay!=null?delay:(this.currentData?this.adaptiveRefreshSeconds(this.currentData)*1000:3000);
		this.refreshTimer=window.setTimeout(L.bind(function(){
			if(typeof document !== 'undefined' && document.hidden){
				this.refreshPaused = true;
				return;
			}
			this.refreshPaused = false;
			this.fetchDataTimed(9000).then(L.bind(function(data){this.update(data);this.scheduleAdaptiveRefresh();},this)).catch(L.bind(function(){this.scheduleAdaptiveRefresh(3000);},this));
		},this),Math.max(250,wait));
	},

	update: function(data) {
		this.currentData=data; this.updateRefreshSummary(data); const r=this.calculateRates(data), dr=this.deviceRates(data); this.lastDeviceRates=dr; const wan=iface(data.interfaces,'wan'), mi=data.mwan.interfaces||{}, sqm=values(data.sqm), qosValues=values(data.qos), qos=qosValues.main||{}, qosGuest=qosValues.guest||{};
		let lanStatus={};try{lanStatus=JSON.parse((data.lanStatus&&data.lanStatus.stdout)||'{}');}catch(e){}
		text('ex-download',formatRate(r.down)); text('ex-upload',formatRate(r.up)); text('ex-down-total','Total recebido: '+formatBytes(r.rx)); text('ex-up-total','Total enviado: '+formatBytes(r.tx));
		const activeWans=getActiveWanList(data);
		const wanDaily={};
		String(data.wanDaily||'').trim().split(/\n/).forEach(function(line){const p=line.split(',');if(p.length<4)return;const rx=Number(p[2]),tx=Number(p[3]);if(!p[1]||!isFinite(rx)||!isFinite(tx))return;wanDaily[p[1]]={rx:rx,tx:tx,date:p[0]};});
		activeWans.forEach(L.bind(function(w){
			const i = iface(data.interfaces, w.iface);
			const d = (data.wanDevicesMap && data.wanDevicesMap[w.iface]) || (w.iface==='wan'?data.wanDevice:(w.iface==='wan2'?data.wan2Device:{})) || {};
			const phy = (data.wanPhysicalDevicesMap && data.wanPhysicalDevicesMap[w.iface]) || (w.iface==='wan'?data.wanPhysicalDevice:(w.iface==='wan2'?data.wan2PhysicalDevice:d)) || d;
			const m = (data.mwan && data.mwan.interfaces && data.mwan.interfaces[w.iface]) || {};
			const ping = (i.up && data.wanPingsMap && data.wanPingsMap[w.iface]) ? parsePing(data.wanPingsMap[w.iface]) : null;
			const cfg = (values(data.networkConfig)[w.iface]) || {};
			this.updateWan('ex-' + w.domId, i, d, phy, m, ping, cfg, wanDaily[w.iface]||null);
		}, this));
		(data.lanPorts||[]).forEach(L.bind(function(port,idx){
			let dev = (data.lanDevices||[])[idx] || {};
			if (!dev.carrier && data.hardwareInfo && data.hardwareInfo.ports) {
				const hwPorts = data.hardwareInfo.ports;
				const isWanPort = (port === 'lan5' || port === 'port5' || port === 'eth1' || port === 'wan' || port === 'eth0.2');
				const hw = hwPorts[port] || (isWanPort ? (hwPorts.lan5 || hwPorts.port5 || hwPorts.wan || hwPorts.wan1 || hwPorts.eth1) : null);
				if (hw && hw.carrier) {
					dev = Object.assign({}, dev, {
						carrier: true,
						speed: hw.speed || dev.speed,
						duplex: hw.duplex || dev.duplex
					});
				}
			}
			this.updateLan('ex-lan-'+portDomId(port), dev);
		},this));
		const mwanRunning=Object.keys(mi).some(function(k){return !!mi[k].running;});
		const activeWanLabels=[];
		activeWans.forEach(function(w){
			const i = iface(data.interfaces, w.iface);
			const m = mi[w.iface];
			const isOnline = mwanRunning ? (m && m.status === 'online') : !!i.up;
			if (isOnline) activeWanLabels.push(w.label);
		});
		const active = activeWanLabels.length ? activeWanLabels.join(' + ') : 'SEM INTERNET';
		setPill('ex-global-status',active==='SEM INTERNET'?'offline':'online',active+' ATIVA');
		const sf=this.feature('speedify')||{}, sfTop=document.getElementById('ex-speedify-top');
		if(sfTop){
			const sfDesired = String(sf.desired_state || '') === 'connected';
			const sfConnected = sf.state === 'CONNECTED' || sf.state === 'CONNECTING';
			const sfShouldShow = sfDesired || sfConnected;
			sfTop.style.display = sfShouldShow ? 'flex' : 'none';
			if (sfShouldShow) {
				sfTop.className = 'ex-hero-speedify ' + (sfConnected ? 'online' : 'standby');
				sfTop.replaceChildren(
					E('span',{},['Speedify']),
					E('strong',{},[sfConnected ? 'CONECTADO' : (sf.state || 'INICIANDO')]),
					E('small',{},[speedifyModeLabel(sf.runtime_mode || sf.bonding_mode) + ' • IP ' + (sf.tunnel_ip || '—')])
				);
			}
		}
		text('ex-lan-ip',lanStatus.ipaddr||'—'); text('ex-lan-dhcp',(lanStatus.dhcp_start&&lanStatus.dhcp_end)?lanStatus.dhcp_start+' → '+lanStatus.dhcp_end:'—'); text('ex-lan-mask',lanStatus.netmask||'—'); text('ex-lan-dns',Array.isArray(lanStatus.dns)&&lanStatus.dns.length?lanStatus.dns.join('  •  '):'Sem DNS fixo');
		let ipv6Label = lanStatus.ipv6_label;
		if (!ipv6Label) {
			const dhcpLan=(data.dhcpConfig&&data.dhcpConfig.values&&data.dhcpConfig.values.lan)||(data.dhcpConfig&&data.dhcpConfig.lan)||{};
			if(dhcpLan.ndp==='relay') ipv6Label = 'Cascata (NDP Relay)';
			else if(dhcpLan.dhcpv6==='disabled'&&dhcpLan.ra==='disabled') ipv6Label = 'Desativado (IPv4 Puro)';
			else ipv6Label = 'Pilha Dupla Global';
		}
		text('ex-lan-ipv6', ipv6Label);
		let ipv6Prefix = '—';
		const lanIface = iface(data.interfaces, 'lan');
		const wan6Iface = iface(data.interfaces, 'wan6');
		if (lanIface && Array.isArray(lanIface['ipv6-prefix-assignment']) && lanIface['ipv6-prefix-assignment'].length > 0) {
			const p = lanIface['ipv6-prefix-assignment'][0];
			ipv6Prefix = (p.address || '') + '/' + (p.mask || 64);
		} else if (wan6Iface && Array.isArray(wan6Iface['ipv6-prefix']) && wan6Iface['ipv6-prefix'].length > 0) {
			const p = wan6Iface['ipv6-prefix'][0];
			ipv6Prefix = (p.address || '') + '/' + (p.mask || 64);
		} else if (lanStatus.ipv6_relay === '1' || (ipv6Label && ipv6Label.indexOf('Relay') !== -1)) {
			ipv6Prefix = 'Repasse NDP WAN ⇄ LAN';
		} else if (lanStatus.ipv6_mode === 'ipv4_only' || (ipv6Label && ipv6Label.indexOf('Desativado') !== -1)) {
			ipv6Prefix = 'Desativado';
		}
		text('ex-lan-ipv6-prefix', ipv6Prefix);
		const lanPrefix=prefix24(lanStatus.ipaddr), guestPrefix=prefix24(((values(data.networkConfig).guest)||{}).ipaddr);
		const leases=data.leases.dhcp_leases||[], main=assocMap(data.mainAssoc), guest=assocMap(data.guestAssoc);
		const isApOrSecondary = isSatelliteOrAp(data);
		const devStats = data.deviceStations || {};
		const mainWifiCount = (devStats.main_wifi_count != null && devStats.main_wifi_count > Object.keys(main).length) ? devStats.main_wifi_count : Object.keys(main).length;
		const guestWifiCount = (devStats.guest_wifi_count != null && devStats.guest_wifi_count > Object.keys(guest).length) ? devStats.guest_wifi_count : Object.keys(guest).length;
		const wiredDevCount = (devStats.total_wired_count != null) ? devStats.total_wired_count : 0;
		const mainLanLeases = leases.filter(function(l){return lanPrefix&&String(l.ipaddr||'').indexOf(lanPrefix)===0;}).length;
		const guestLanLeases = leases.filter(function(l){return guestPrefix&&String(l.ipaddr||'').indexOf(guestPrefix)===0;}).length;

		if (isApOrSecondary) {
			const totalLocal = mainWifiCount + wiredDevCount;
			text('ex-main-clients', totalLocal > 0 ? totalLocal : mainWifiCount);
			text('ex-main-wifi', mainWifiCount + ' ' + (mainWifiCount === 1 ? 'conectado no Wi-Fi' : 'conectados no Wi-Fi') + (wiredDevCount > 0 ? (' • ' + wiredDevCount + ' no cabo') : ''));
			text('ex-guest-clients', guestWifiCount);
			text('ex-guest-wifi', guestWifiCount + ' ' + (guestWifiCount === 1 ? 'conectado no Wi-Fi' : 'conectados no Wi-Fi'));
		} else {
			const totalMain = Math.max(mainLanLeases, mainWifiCount, mainWifiCount + wiredDevCount);
			const totalGuest = Math.max(guestLanLeases, guestWifiCount);
			text('ex-main-clients', totalMain);
			text('ex-main-wifi', mainWifiCount + ' no Wi-Fi' + (totalMain > mainWifiCount ? (' • ' + (totalMain - mainWifiCount) + ' no cabo') : ''));
			text('ex-guest-clients', totalGuest);
			text('ex-guest-wifi', guestWifiCount + ' no Wi-Fi');
		}
		const hwInfo=data.hardwareInfo||{}, cpuInfo=hwInfo.cpu||{}, thermalSensors=hwInfo.thermal_sensors||[], storageInfo=hwInfo.storage||{};
		const mem=data.system.memory||{}, perf=data.perfStatus||{}, root=(data.system.root&&Number(data.system.root.total)>0)?data.system.root:{total:perf.root_total_kb||0,used:perf.root_used_kb||0,free:perf.root_avail_kb||0}, memFree=mem.available||mem.free||0, memUsed=Math.max(0,(mem.total||0)-memFree), rootTotalBytes=(Number(root.total)||0)*1024, rootUsedBytes=(Number(root.used)||0)*1024, mu=mem.total?100*memUsed/mem.total:0, du=root.total?100*root.used/root.total:0, load=data.system.load&&data.system.load[0]!=null?data.system.load[0]/65535:0;
		let temp=parseInt(data.temperature,10)/1000;
		if((!isFinite(temp)||temp<=0)&&thermalSensors.length>0){temp=thermalSensors[0].temp_c;}
		const cpuFreqStr=cpuInfo.freq_str||((this.capabilities&&this.capabilities.hardware&&this.capabilities.hardware.cpu_freq_str)||'');
		const cpuCores=cpuInfo.cores||((this.capabilities&&this.capabilities.hardware&&this.capabilities.hardware.cpu_cores)||1);
		const cpuUsage=(cpuInfo.usage_pct!=null)?cpuInfo.usage_pct:0;
		text('ex-cpu',cpuFreqStr?(cpuFreqStr+' ('+cpuCores+'c)'):(cpuCores+' Núcleos'));
		text('ex-cpu-detail',cpuUsage+'% em uso • '+(cpuInfo.arch_desc||'CPU'));
		const cb=document.getElementById('ex-cpu-bar');if(cb)cb.style.width=Math.min(100,Math.max(2,cpuUsage))+'%';
		text('ex-uptime',formatUptime(data.system.uptime));
		text('ex-temperature',isFinite(temp)?temp.toFixed(0)+' °C':(thermalSensors.length?thermalSensors[0].temp_c+' °C':'—'));
		if(thermalSensors.length>1){text('ex-temperature-detail',thermalSensors.length+' sensores • ver todos');}
		else if(isFinite(temp)){text('ex-temperature-detail','Sensor de CPU');}
		else{text('ex-temperature-detail','Sem sensor térmico');}
		text('ex-memory',mu.toFixed(0)+'%');
		text('ex-memory-detail','livre '+formatBytes(memFree)+' / total '+formatBytes(mem.total||0));
		text('ex-load',load.toFixed(2));
		const loadDetail=(data.system.load&&data.system.load.length>=3)?('1m: '+(data.system.load[0]/65535).toFixed(2)+'  5m: '+(data.system.load[1]/65535).toFixed(2)+'  15m: '+(data.system.load[2]/65535).toFixed(2)):'estabilidade do sistema';
		text('ex-load-detail',loadDetail);
		const flashLabel=storageInfo.flash_type||'Flash Interna';
		text('ex-storage',du.toFixed(0)+'%');
		text('ex-storage-detail',flashLabel+' • livre '+formatBytes(Math.max(0,rootTotalBytes-rootUsedBytes)));
		const mb=document.getElementById('ex-memory-bar'),db=document.getElementById('ex-storage-bar');
		if(mb)mb.style.width=Math.min(100,mu)+'%';
		if(db)db.style.width=Math.min(100,du)+'%';
		const healthWarning=(isFinite(temp)&&temp>=85)||mu>=85||du>=85||load>=1.5;
		setPill('ex-health-status',healthWarning?'standby':'online',healthWarning?'ATENÇÃO':'NORMAL');
		const qosWanProfiles=sqmWanProfiles(data), qe=qosWanProfiles.some(function(profile){return !!(sqm[profile.section]&&sqm[profile.section].enabled==='1');}), qosToggle=document.getElementById('ex-qos-toggle'), qosToggleState=document.getElementById('ex-qos-toggle-state');
		const isSat = isSatelliteOrAp(data);
		if (isSat) {
			setPill('ex-qos-status', 'standby', 'MESTRE GERENCIA');
			if (qosToggle) { qosToggle.checked = false; qosToggle.disabled = true; qosToggle.title = 'SQM / CAKE é exclusivo do Roteador Mestre em nós Satélite / Ponto de Acesso.'; }
			if (qosToggleState) qosToggleState.textContent = 'MESTRE GERENCIA';
		} else {
			setPill('ex-qos-status',qe?'online':'standby',qe?'ATIVO':'DESLIGADO');
			if(qosToggle){qosToggle.checked=qe;qosToggle.disabled=false;}
			if(qosToggleState)qosToggleState.textContent=qe?'Ligado':'Desligado';
		}
		const fmtLimit=function(v){v=Number(v)||0;return v>0?(v/1000).toFixed(1)+' Mbps':'Ilimitado';};
		const guestDownloadLimit=qosGuest.download_kbps||qos.guest_download_kbps||0, guestUploadLimit=qosGuest.upload_kbps||qos.guest_upload_kbps||0;
		qosWanProfiles.forEach(function(profile){const queue=sqm[profile.section]||{};text('ex-qos-wan-'+portDomId(profile.network),'↓ '+fmtLimit(queue.download)+'  •  ↑ '+fmtLimit(queue.upload)+(queue.enabled==='1'?'':'  •  fila desligada'));});
		text('ex-qos-guest','↓ '+fmtLimit(guestDownloadLimit)+'  •  ↑ '+fmtLimit(guestUploadLimit));
		text('ex-wifi-guest-limit-val', (guestDownloadLimit > 0 || guestUploadLimit > 0) ? ('↓ ' + fmtLimit(guestDownloadLimit) + '  •  ↑ ' + fmtLimit(guestUploadLimit)) : 'Ilimitado');
		text('ex-dns',(wan['dns-server']||['1.1.1.1','8.8.8.8']).join('  •  '));
		const starlinkPanelEl=document.getElementById('ex-starlink-global-panel');
		if(starlinkPanelEl){
			const allNetIfaces=((data.interfaces&&data.interfaces.interface)||[]);
			const hasStarlink=allNetIfaces.some(function(i){
				const routes=Array.isArray(i.route)?i.route:[],hasDef=routes.some(function(r){return r&&(r.target==='0.0.0.0'||Number(r.mask)===0);});
				if(!i.up||!hasDef||!Array.isArray(i['ipv4-address'])||!i['ipv4-address'].length)return false;
				const addr=String(i['ipv4-address'][0].address||''),gw=wanGateway(i),dns=(i['dns-server']||i.dns_server||[]),p=addr.split('.').map(Number);
				const cgnat=p.length===4&&p[0]===100&&p[1]>=64&&p[1]<=127;
				const slGw=String(gw)==='100.64.0.1',slDns=Array.isArray(dns)&&dns.some(function(s){return /^198\.54\.100\./.test(String(s));});
				const slRouterMode=(String(gw)==='192.168.1.1'&&String(i.interface||i.device)!=='lan');
				return slDns||(cgnat&&slGw)||slRouterMode;
			});
			const slPub=(this.capabilities.features&&this.capabilities.features.starlink_public)||{};
			const slAlwaysShow=!!(this.capabilities.features&&this.capabilities.features.starlink_always_show)||(localStorage.getItem('ark_starlink_always_show')==='1');
			starlinkPanelEl.style.display=(hasStarlink||slPub.enabled||slAlwaysShow)?'':'none';
		}
		this.updateWifi(data); this.updateMwanMode(data); this.updateHistory(data.history); this.renderDevices(data,dr); text('ex-clock',new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
	}
};
