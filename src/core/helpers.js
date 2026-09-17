function iface(dump, name) { return ((dump && dump.interface) || []).find(function(x) { return x && x.interface === name; }) || {}; }
function values(config) { return config && config.values || {}; }
function lanPortsFromNetwork(networkConfig) {
	const net=values(networkConfig), ports=[], seen={};
	Object.keys(net).forEach(function(k) {
		const s=net[k]||{};
		if(s['.type']==='device'&&s.name==='br-lan') {
			const p=Array.isArray(s.ports)?s.ports:String(s.ports||'').split(/\s+/);
			p.forEach(function(port){ if(port&&!seen[port]){seen[port]=1;ports.push(port);} });
		} else if(s['.type']==='switch_vlan'&&String(s.vlan)==='1') {
			const p=Array.isArray(s.ports)?s.ports:String(s.ports||'').split(/\s+/);
			p.forEach(function(port){
				const clean=String(port||'').replace(/t$/,'');
				if(clean && clean !== '0' && !seen['lan'+clean]) {
					seen['lan'+clean]=1;
					ports.push('lan'+clean);
				}
			});
		}
	});
	if(!ports.length) ['lan1','lan2','lan3','lan4'].forEach(function(port){ports.push(port);});
	const isWanToLan = !!(net.autowan && String(net.autowan.wan_to_lan) === '1');
	const isWanPromoted = !!(net.autowan && String(net.autowan.wan_promoted) === '1');
	if (isWanToLan && !isWanPromoted) {
		const wanDev = (net.wan && (net.wan.ark_phys_port || net.wan.device || net.wan.ifname)) || '';
		const targetPort = (wanDev === 'eth0.2' || !wanDev) ? 'lan5' : wanDev;
		if (!seen[targetPort] && !seen.lan5 && !seen.eth1) {
			seen[targetPort] = 1;
			ports.push(targetPort);
		}
	}
	return ports;
}
function portLabel(port) {
	if (port === 'eth1' || port === 'lan5' || port === 'port5' || port === 'wan' || port === 'eth0.2') return 'PORTA WAN (LAN)';
	const m=String(port||'').match(/^lan([0-9]+)$/i);
	return m?'LAN'+m[1]:String(port||'porta').toUpperCase();
}
function portDomId(port) { return String(port||'port').replace(/[^A-Za-z0-9_-]/g,'_'); }
function isCompanionOrVirtualIpv6Wan(name, cfg, live) {
	const n = String(name || '').toLowerCase();
	if (n === 'wan6' || /_6$/i.test(n) || /^wan[0-9]*_6$/i.test(n)) return true;
	const proto = String((cfg && cfg.proto) || (live && live.proto) || '').toLowerCase();
	if (proto === 'dhcpv6' || proto === '6in4' || proto === '6to4' || proto === '6rd') return true;
	const dev = String((cfg && cfg.device) || (live && (live.l3_device || live.device)) || '');
	if (dev.charAt(0) === '@') return true;
	return false;
}
function getActiveWanList(data) {
	const net=values((data||{}).networkConfig), dump=(data||{}).interfaces||{}, list=[], seen={};
	const isWanToLan = !!(net.autowan && String(net.autowan.wan_to_lan) === '1');
	const isWanPromoted = !!(net.autowan && String(net.autowan.wan_promoted) === '1');
	const otherWans = Object.keys(net).filter(function(k){
		if (!/^wan([0-9]+)$/i.test(k)) return false;
		const cfg = net[k] || {}, live = iface(dump, k);
		if (isCompanionOrVirtualIpv6Wan(k, cfg, live)) return false;
		const proto = String(cfg.proto || live.proto || ''), dev = String(cfg.device || live.l3_device || live.device || '');
		return proto !== 'none' && proto && dev;
	});
	// Se a porta WAN física opera como rede local (LAN) e não foi promovida, e existe outra WAN (ex: WAN2),
	// não exibe a WAN1 como um card vazio no topo. Ela atua como porta LAN.
	if (!isWanToLan || isWanPromoted || !otherWans.length) {
		list.push({iface:'wan', label:'WAN1', domId:'wan1', isPrimary:true, device:(net.wan||{}).device||'wan'});
		seen.wan=1;
	}
	Object.keys(net).filter(function(k){
		if (!/^wan([0-9]+)$/i.test(k)) return false;
		const cfg = net[k] || {}, live = iface(dump, k);
		if (isCompanionOrVirtualIpv6Wan(k, cfg, live)) return false;
		return true;
	})
		.sort(function(a,b){ return Number(a.replace(/\D/g,'')) - Number(b.replace(/\D/g,'')); })
		.forEach(function(name){
			const cfg=net[name]||{}, live=iface(dump,name);
			const proto=String(cfg.proto||live.proto||''), dev=String(cfg.device||live.l3_device||live.device||'');
			if(proto==='none' || proto==='dhcpv6' || !proto || !dev || dev.charAt(0) === '@') return;
			const num=name.replace(/\D/g,'');
			const ifaceKey=name.toLowerCase();
			if(!seen[ifaceKey]){
				seen[ifaceKey]=1;
				list.push({iface:ifaceKey, label:'WAN'+num, domId:'wan'+num, isPrimary:false, device:dev});
			}
		});
	return list;
}
function getNextAvailableWan(data) {
	const net=values((data||{}).networkConfig);
	let n = 2;
	while (true) {
		if (n === 6) { n++; continue; }
		const name = 'wan' + n;
		const cfg = net[name] || {};
		const proto = String(cfg.proto || '');
		const dev = String(cfg.device || '');
		if (proto === 'none' || !proto || !dev) {
			return { iface: name, label: 'WAN' + n, num: n };
		}
		n++;
	}
}
function wan2IsLan(data) {
	const cfg=(values((data||{}).networkConfig).wan2)||{}, i=iface((data||{}).interfaces,'wan2');
	return !i.up&&(cfg.proto==='none'||!cfg.proto||!cfg.device);
}
function isSatelliteOrAp(data) {
	const globalCaps = (typeof window !== 'undefined' && (window.EQUIPE_CAPABILITIES || window._arkCapabilities)) || null;
	if (!data && globalCaps) {
		if (globalCaps.role === 'master' || globalCaps.role === 'primary' || globalCaps.role === 'gateway' || globalCaps.network_mode === 'router') return false;
		if (globalCaps.role === 'secondary' || globalCaps.role === 'satellite' || globalCaps.network_mode === 'ap') return true;
	}
	if (!data) return false;
	const dashboardCfg = values((data || {}).equipeDashboardConfig || (data || {}).dashboardConfig);
	const generalRole = (dashboardCfg.general && dashboardCfg.general.role) || (dashboardCfg.mesh && dashboardCfg.mesh.role) || (dashboardCfg.main && dashboardCfg.main.role) || '';
	if (generalRole === 'master' || generalRole === 'primary' || generalRole === 'gateway') return false;
	if (generalRole === 'secondary' || generalRole === 'satellite') return true;
	const dashNetMode = (dashboardCfg.main && dashboardCfg.main.network_mode) || (dashboardCfg.general && dashboardCfg.general.network_mode) || '';
	if (dashNetMode === 'router') return false;
	if (dashNetMode === 'ap') return true;
	const netCfg = values((data || {}).networkConfig);
	if (netCfg && netCfg.general && netCfg.general.network_mode === 'router') return false;
	if (netCfg && netCfg.general && netCfg.general.network_mode === 'ap') return true;
	const lanStatus = (data || {}).lanStatus;
	if (lanStatus && (lanStatus.dhcp_disabled || lanStatus.mode === 'ap') && lanStatus.gateway) return true;
	if (globalCaps) {
		if (globalCaps.role === 'master' || globalCaps.role === 'primary' || globalCaps.role === 'gateway' || globalCaps.network_mode === 'router') return false;
		if (globalCaps.role === 'secondary' || globalCaps.role === 'satellite' || globalCaps.network_mode === 'ap') return true;
	}
	return false;
}

function sqmWanProfiles(data) {
	const net=values((data||{}).networkConfig), dump=(data||{}).interfaces||{}, result=[], seen={};
	Object.keys(net).filter(function(name){return /^wan(?:[0-9]+)?$/i.test(name);}).sort(function(a,b){if(a==='wan')return -1;if(b==='wan')return 1;return Number(a.replace(/\D/g,''))-Number(b.replace(/\D/g,''));}).forEach(function(name){
		const cfg=net[name]||{}, live=iface(dump,name), proto=String(cfg.proto||''), hasIpv4=Array.isArray(live['ipv4-address'])&&live['ipv4-address'].length>0;
		if(isCompanionOrVirtualIpv6Wan(name, cfg, live) || proto==='none'||proto==='dhcpv6'||(!/^(dhcp|pppoe|static)$/i.test(proto)&&!hasIpv4))return;
		const section=name==='wan'?'wan1':name.toLowerCase();if(seen[section])return;seen[section]=1;
		result.push({network:name,section:section,label:name==='wan'?'WAN1':name.toUpperCase(),device:String(live.l3_device||live.device||cfg.device||name),online:!!live.up});
	});
	return result;
}
function parsePing(r) { const m = ((r && r.stdout) || '').match(/time[=<]([0-9.]+)/); return r && r.code === 0 && m ? Number(m[1]) : null; }
const PING_TARGET_PRESETS = [
	{
		id: 'registro_br',
		title: 'Registro.br / NIC.br (Brasil)',
		shortLabel: '🇧🇷 Registro.br',
		ip: '200.160.2.3',
		desc: 'Ponto Central IX.br (São Paulo). Referência recomendada e mais precisa para aferir a qualidade da rota e latência nacional.',
		badge: 'Recomendado BR'
	},
	{
		id: 'cloudflare',
		title: 'Cloudflare DNS',
		shortLabel: '⚡ Cloudflare',
		ip: '1.1.1.1',
		desc: 'Rede Anycast global com PoPs nas capitais brasileiras e altíssima velocidade para CDN.',
		badge: 'Ultra-rápido'
	},
	{
		id: 'google',
		title: 'Google Public DNS',
		shortLabel: '🌐 Google',
		ip: '8.8.8.8',
		desc: 'Serviço global do Google, padrão consagrado para testes de estabilidade e rotas internacionais.',
		badge: 'Global'
	},
	{
		id: 'quad9',
		title: 'Quad9 Security DNS',
		shortLabel: '🛡️ Quad9',
		ip: '9.9.9.9',
		desc: 'Anycast seguro com bloqueio automático contra malwares, phishing e ameaças.',
		badge: 'Segurança'
	},
	{
		id: 'isp',
		title: 'DNS da Operadora (Dinâmico)',
		shortLabel: '📡 Operadora',
		ip: 'dinâmico',
		desc: 'Mede o tempo de resposta do primeiro salto até a infraestrutura do seu provedor de internet.',
		badge: 'Local'
	},
	{
		id: 'custom',
		title: 'Servidor Personalizado',
		shortLabel: '✍️ Custom',
		ip: 'personalizado',
		desc: 'Insira qualquer IP ou domínio (servidores de jogos como Riot/Steam, filiais corporativas ou VPNs).',
		badge: 'Manual'
	}
];
function getPingTargetInfo(data) {
	const eqCfg = (data && data.equipeDashboardConfig && data.equipeDashboardConfig.values && data.equipeDashboardConfig.values.main) ||
		(data && data.capabilities && data.capabilities.ping_target ? data.capabilities : null) ||
		(typeof window !== 'undefined' && window._arkCapabilities && window._arkCapabilities.ping_target ? window._arkCapabilities : null);
	let target = (eqCfg && eqCfg.ping_target) || '';
	let customIp = (eqCfg && eqCfg.ping_custom_ip != null) ? eqCfg.ping_custom_ip : '';

	// Router UCI config is the authoritative single source of truth across reboots & devices
	if (target) {
		try {
			if (typeof window !== 'undefined' && window.localStorage) {
				window.localStorage.setItem('ark_wan_ping_target', target);
				if (customIp != null) window.localStorage.setItem('ark_wan_ping_custom_ip', customIp);
			}
		} catch(e) {}
		return { target: target, customIp: customIp };
	}

	// Fallback to localStorage if router UCI data hasn't loaded yet
	try {
		if (typeof window !== 'undefined' && window.localStorage) {
			const st = window.localStorage.getItem('ark_wan_ping_target');
			const sc = window.localStorage.getItem('ark_wan_ping_custom_ip');
			if (st) target = st;
			if (sc != null) customIp = sc;
		}
	} catch(e) {}

	return { target: target || 'registro_br', customIp: customIp || '' };
}
function getPingTargetShortLabel(target, customIp) {
	if (target === 'custom') {
		const clean = (customIp || '').trim();
		return clean ? ('✍️ ' + clean) : '✍️ Custom';
	}
	const p = PING_TARGET_PRESETS.find(function(item) { return item.id === target; });
	return p ? p.shortLabel : '🇧🇷 Registro.br';
}
function resolvePingTarget(target, customIp, live, cfg) {
	if (target === 'registro_br') return '200.160.2.3';
	if (target === 'cloudflare') return '1.1.1.1';
	if (target === 'google') return '8.8.8.8';
	if (target === 'quad9') return '9.9.9.9';
	if (target === 'custom' && customIp && customIp.trim()) return customIp.trim();
	if (target === 'isp') {
		// 1. Point-to-point gateway (PPPoE concentrator / BRAS)
		const addrs = (live && Array.isArray(live['ipv4-address'])) ? live['ipv4-address'] : [];
		for (let i = 0; i < addrs.length; i++) {
			if (addrs[i] && addrs[i].ptpaddress && addrs[i].ptpaddress !== '0.0.0.0') {
				return addrs[i].ptpaddress;
			}
		}
		// 2. Default route gateway / nexthop
		const routes = Array.isArray(live && live.route) ? live.route : [];
		const def = routes.find(function(r) { return r && (r.target === '0.0.0.0' || Number(r.mask) === 0) && r.nexthop && r.nexthop !== '0.0.0.0'; }) ||
			routes.find(function(r) { return r && r.nexthop && r.nexthop !== '0.0.0.0'; });
		if (def && def.nexthop && def.nexthop !== '0.0.0.0') return def.nexthop;
		// 3. Configured static gateway
		if (cfg && cfg.gateway && cfg.gateway !== '0.0.0.0') return cfg.gateway;
		// 4. Carrier dynamic DNS
		const dnsList = (live && (live['dns-server'] || live.dns_server)) || (live && live.inactive && live.inactive['dns-server']) || (cfg && cfg.dns) || [];
		if (Array.isArray(dnsList) && dnsList.length && dnsList[0] && dnsList[0] !== '0.0.0.0') {
			return dnsList[0];
		}
		return '200.160.2.3';
	}
	return '200.160.2.3';
}
function bigIcon(svgHtml) { const span = E('span', { 'class': 'ex-big-icon', 'aria-hidden': 'true' }); span.innerHTML = svgHtml; return span; }
function infoRow(label, id) { return E('div', { 'class': 'ex-row' }, [ E('span', {}, [ label ]), E('strong', { 'id': id }, [ '—' ]) ]); }
function cidrMask(bits) {
	bits = Number(bits);
	if (!(bits >= 0 && bits <= 32)) return '—';
	const out = [];
	for (let i = 0; i < 4; i++) {
		const used = Math.max(0, Math.min(8, bits - (i * 8)));
		out.push(used === 0 ? 0 : (256 - Math.pow(2, 8 - used)));
	}
	return out.join('.');
}
function wanGateway(i) {
	const routes = Array.isArray(i && i.route) ? i.route : [];
	const def = routes.find(function(r) { return r && (r.target === '0.0.0.0' || Number(r.mask) === 0) && r.nexthop; }) ||
		routes.find(function(r) { return r && r.nexthop; });
	return def && def.nexthop ? def.nexthop : '—';
}
function wanDns(i) {
	const active = (i && (i['dns-server'] || i.dns_server)) || [];
	const inactive = (i && i.inactive && (i.inactive['dns-server'] || i.inactive.dns_server)) || [];
	const dns = Array.isArray(active) && active.length ? active : inactive;
	return Array.isArray(dns) && dns.length ? dns.join(' • ') : '—';
}
function wanProtoLabel(i, cfg) {
	const proto=String((i&&i.proto)||(cfg&&cfg.proto)||'').toLowerCase();
	const labels={dhcp:'DHCP automático',pppoe:'PPPoE',static:'IP fixo / estático',qmi:'Modem móvel (QMI)',mbim:'Modem móvel (MBIM)',ncm:'Modem móvel (NCM)',wwan:'Wi-Fi como internet',none:'Desativada'};
	return labels[proto]||proto.toUpperCase()||'—';
}
function metricCard(icon, label, valueId, hintId, color) {
	return E('div', { 'class': 'ex-card ex-metric', 'style': '--accent:' + color }, [
		E('div', { 'class': 'ex-metric-icon' }, [ icon ]),
		E('div', { 'class': 'ex-metric-copy' }, [ E('span', { 'class': 'ex-label' }, [ label ]), E('strong', { 'id': valueId, 'class': 'ex-value' }, [ '—' ]), E('small', { 'id': hintId, 'class': 'ex-muted' }, [ 'aguardando leitura' ]) ])
	]);
}
function assocMap(groups) {
	const out = {};
	(groups || []).forEach(function(g) {
		const meta = (g && g.meta) || {};
		const ifname = (g && g.ifname) || meta.ifname || '';
		((g && g.results) || []).forEach(function(r) {
			if (r && r.mac) {
				const u = String(r.mac).toUpperCase();
				const rx = r.rx || {};
				const tx = r.tx || {};
				const mhz = rx.mhz || tx.mhz || 0;
				const isVht = !!(rx.vht || tx.vht);
				const isHeWide = !!((rx.he || tx.he) && mhz >= 80);
				const is6gMhz = (mhz === 320);
				const ifLower = ifname.toLowerCase();

				let detectedBand = meta.band || '';
				if (!detectedBand) {
					if (is6gMhz || ifLower.indexOf('phy2') >= 0 || ifLower.indexOf('radio2') >= 0 || ifLower.indexOf('6g') >= 0) {
						detectedBand = '6g';
					} else if (mhz >= 80 || isVht || isHeWide || ifLower.indexOf('phy1') >= 0 || ifLower.indexOf('radio1') >= 0 || ifLower.indexOf('5g') >= 0 || ifLower.indexOf('wlan1') >= 0) {
						detectedBand = '5g';
					} else if (ifLower.indexOf('phy0') >= 0 || ifLower.indexOf('radio0') >= 0 || ifLower.indexOf('2g') >= 0 || ifLower.indexOf('wlan0') >= 0) {
						detectedBand = '2g';
					}
				}
				if (mhz >= 80 || isVht || (isHeWide && detectedBand !== '6g')) {
					detectedBand = (is6gMhz ? '6g' : '5g');
				}

				const bandLabel = meta.bandLabel || (detectedBand === '5g' ? '5 GHz' : (detectedBand === '6g' ? '6 GHz' : '2,4 GHz'));
				r.band = detectedBand || '2g';
				r.bandLabel = bandLabel;
				r.ssid = meta.ssid || '';
				r.ifname = ifname;
				out[u] = r;
			}
		});
	});
	return out;
}
function friendlyMap(config) {
	const out = {};
	Object.keys(values(config)).forEach(function(k) { const x = values(config)[k]; if (x && x.mac && x.name) out[x.mac.toUpperCase()] = x.name; });
	return out;
}
function deviceLimitsMap(config) {
	const out = {};
	const v = values(config);
	Object.keys(v).forEach(function(k) {
		const x = v[k];
		if (x && x.mac) {
			const mac = String(x.mac).toUpperCase();
			const enabled = String(x.limit_enabled) === '1';
			const down = Number(x.limit_down) || 0;
			const up = Number(x.limit_up) || 0;
			const lanBypass = (x.limit_lan_bypass == null || x.limit_lan_bypass === '' || String(x.limit_lan_bypass) === '1');
			out[mac] = { enabled: enabled, down: down, up: up, lanBypass: lanBypass };
		}
	});
	return out;
}
function deviceIpv6Map(config, globalIpv6Mode) {
	const out = {};
	const v = values(config);
	const isSelective = (globalIpv6Mode === 'selective');
	Object.keys(v).forEach(function(k) {
		const x = v[k];
		if (x && x.mac) {
			const mac = String(x.mac).toUpperCase();
			if (isSelective) {
				out[mac] = (String(x.ipv6_allowed) === '1' || x.ipv6_allowed === true);
			} else {
				out[mac] = (String(x.ipv6_allowed) !== '0' && x.ipv6_allowed !== false);
			}
		}
	});
	return out;
}
function deviceParentalMap(config) {
	const out = {};
	const v = values(config);
	Object.keys(v).forEach(function(k) {
		const x = v[k];
		if (x && x.mac) {
			const mac = String(x.mac).toUpperCase();
			out[mac] = {
				mode: x.parental_mode || 'default',
				block: String(x.parental_block) === '1',
				safesearch: String(x.safesearch) === '1',
				blocked_services: x.blocked_services || ''
			};
		}
	});
	return out;
}
function wifiConfig(config) {
	const v = values(config);
	const bandOfSection=function(section){
		const radio=v[section.device]||{}, band=String(radio.band||'').toLowerCase(), ht=String(radio.htmode||'').toLowerCase(), hw=String(radio.hwmode||'').toLowerCase(), dev=String(section.device||'').toLowerCase();
		if(band.indexOf('6')===0||hw.indexOf('6g')>=0||ht.indexOf('320')>=0||dev.indexOf('6g')>=0)return '6g';
		if(band.indexOf('2')===0||hw==='11g'||hw==='11b'||ht.indexOf('g')>=0||dev.indexOf('2g')>=0)return '2g';
		if(band.indexOf('5')===0||hw==='11a'||ht.indexOf('80')>=0||ht.indexOf('160')>=0||dev.indexOf('5g')>=0)return '5g';
		return '';
	};

	let dev2g = null, dev5g = null, dev6g = null;
	const devList = Object.keys(v).filter(function(k){ return v[k] && v[k]['.type'] === 'wifi-device'; });
	devList.forEach(function(k){
		const s = v[k] || {};
		const band = String(s.band || '').toLowerCase();
		const hw = String(s.hwmode || '').toLowerCase();
		const ht = String(s.htmode || '').toLowerCase();
		const name = String(k).toLowerCase();
		if (band.indexOf('6') === 0 || hw.indexOf('6g') >= 0 || ht.indexOf('320') >= 0 || name.indexOf('6g') >= 0) {
			if (!dev6g) dev6g = k;
		} else if (band.indexOf('2') === 0 || hw === '11g' || hw === '11b' || ht.indexOf('g') >= 0 || name.indexOf('2g') >= 0) {
			if (!dev2g) dev2g = k;
		} else if (band.indexOf('5') === 0 || hw === '11a' || ht.indexOf('80') >= 0 || ht.indexOf('160') >= 0 || name.indexOf('5g') >= 0) {
			if (!dev5g) dev5g = k;
		}
	});
	if (!dev2g && !dev5g && !dev6g) {
		dev2g = devList[0] || 'radio0';
		dev5g = devList[1] || 'radio1';
		dev6g = devList[2] || null;
	} else if (!dev2g) {
		dev2g = devList.find(function(k){ return k !== dev5g && k !== dev6g; }) || 'radio0';
	} else if (!dev5g) {
		dev5g = devList.find(function(k){ return k !== dev2g && k !== dev6g; }) || 'radio1';
	}

	const pick=function(network, targetDevice, targetBand){
		let found = null;
		if (targetDevice) {
			Object.keys(v).some(function(k){
				const s = v[k] || {};
				if (s['.type'] !== 'wifi-iface' || s.mode !== 'ap' || !s.ssid) return false;
				const nets = String(s.network || '').split(/\s+/);
				if (nets.indexOf(network) < 0) return false;
				if (s.device === targetDevice) {
					found = s;
					return true;
				}
				return false;
			});
		}
		if (!found && targetBand) {
			Object.keys(v).some(function(k){
				const s = v[k] || {};
				if (s['.type'] !== 'wifi-iface' || s.mode !== 'ap' || !s.ssid) return false;
				const nets = String(s.network || '').split(/\s+/);
				if (nets.indexOf(network) < 0) return false;
				if (bandOfSection(s) === targetBand) {
					found = s;
					return true;
				}
				return false;
			});
		}
		if (!found) {
			const prefKey = (network === 'guest' ? 'guest_' : 'default_') + (targetDevice || 'radio0');
			if (v[prefKey] && v[prefKey].mode === 'ap' && v[prefKey].ssid) found = v[prefKey];
		}
		return found || {};
	};

	const main2 = pick('lan', dev2g, '2g'), main5 = pick('lan', dev5g, '5g'), guest2 = pick('guest', dev2g, '2g'), guest5 = pick('guest', dev5g, '5g');
	const mergeWifi=function(a,b,id,kindLabel){
		const out=Object.assign({}, b || {}, a || {});
		out.id = id;
		out.kind = kindLabel || 'extra';
		out.sec2=(a&&a['.name'])||'';
		out.sec5=(b&&b['.name'])||'';
		out.dev2=(a&&a.device)||dev2g;
		out.dev5=(b&&b.device)||dev5g;
		out.ssid2=(a&&a.ssid)||'';
		out.ssid5=(b&&b.ssid)||'';
		out.key=(a&&a.key)||(b&&b.key)||'';
		out.disabled=(a&&a.disabled!=null)?a.disabled:((b&&b.disabled!=null)?b.disabled:'0');
		out.encryption=(b&&b.encryption)||(a&&a.encryption)||'sae-mixed';
		out.ssid=out.ssid2||out.ssid5||out.ssid||'';
		out.split=!!(out.ssid2&&out.ssid5&&out.ssid2!==out.ssid5);
		out.network=(a&&a.network)||(b&&b.network)||'lan';
		out.has2g=!!(a&&a.ssid);
		out.has5g=!!(b&&b.ssid);
		return out;
	};
	const hasRadios = devList.length > 0;
	const extrasMap = {};
	Object.keys(v).forEach(function(k){
		const s = v[k] || {};
		if(s['.type'] !== 'wifi-iface' || s.mode !== 'ap' || !s.ssid) return;
		if(k === 'default_radio0' || k === 'default_radio1' || k === 'guest_radio0' || k === 'guest_radio1' ||
		   (dev2g && (k === 'default_' + dev2g || k === 'guest_' + dev2g)) ||
		   (dev5g && (k === 'default_' + dev5g || k === 'guest_' + dev5g))) return;
		const groupKey = k.replace(/_r[01]$/, '').replace(/_radio[01]$/, '');
		if(!extrasMap[groupKey]) extrasMap[groupKey] = { r0: null, r1: null, name: groupKey };
		const band = bandOfSection(s);
		if(band === '2g' || s.device === dev2g) extrasMap[groupKey].r0 = s;
		else extrasMap[groupKey].r1 = s;
	});
	const extras = Object.keys(extrasMap).map(function(gk){
		const g = extrasMap[gk];
		return mergeWifi(g.r0, g.r1, gk, 'extra');
	});
	const radio2g = (dev2g && v[dev2g]) || {};
	const radio5g = (dev5g && v[dev5g]) || {};
	const radio6g = (dev6g && v[dev6g]) || {};
	const isWpsEnabled = Object.keys(v).some(function(k){ return v[k] && v[k]['.type'] === 'wifi-iface' && String(v[k].wps_pushbutton || '') === '1'; });
	const isRoamingEnabled = Object.keys(v).some(function(k){ return v[k] && v[k]['.type'] === 'wifi-iface' && String(v[k].ieee80211r || '') === '1'; });
	const isMeshActive = Object.keys(v).some(function(k){ return v[k] && v[k]['.type'] === 'wifi-iface' && v[k].mode === 'mesh'; });
	const isTxBalanced = !!(radio2g.txpower && radio5g.txpower && String(radio2g.txpower) === '15' && String(radio5g.txpower) === '20');
	return {
		hasRadios: hasRadios,
		main: mergeWifi(main2, main5, 'main', 'main'),
		guest: mergeWifi(guest2, guest5, 'guest', 'guest'),
		extras: extras,
		dev2g: dev2g,
		dev5g: dev5g,
		dev6g: dev6g,
		device2g: dev2g,
		device5g: dev5g,
		device6g: dev6g,
		r2g: radio2g,
		r5g: radio5g,
		r6g: radio6g,
		r0: radio2g,
		r1: radio5g,
		r2: radio6g,
		rawRadio0: v.radio0 || {},
		rawRadio1: v.radio1 || {},
		rawRadio2: (dev6g && v[dev6g]) || v.radio2 || {},
		has6g: !!(dev6g && v[dev6g]),
		wpsEnabled: isWpsEnabled,
		roamingEnabled: isRoamingEnabled,
		meshActive: isMeshActive,
		txBalanced: isTxBalanced
	};
}
function getWifiRuntimeState(cfg, wirelessConfig, wirelessStatus) {
	cfg = cfg || {};
	const isUciDisabled = String(cfg.disabled || '0') === '1';
	const statusKeys = Object.keys(wirelessStatus || {});
	if (!statusKeys.length) {
		return {
			state: isUciDisabled ? 'disabled' : 'active',
			label: isUciDisabled ? 'DESLIGADA' : 'ATIVA',
			pillClass: isUciDisabled ? 'standby' : 'online',
			checked: !isUciDisabled
		};
	}

	let driverFailed = false;
	let anyRadioUp = false;
	let anyIfaceUp = false;

	const dev2 = cfg.dev2 || 'radio0';
	const dev5 = cfg.dev5 || 'radio1';
	const dev6 = cfg.dev6;
	const relevantRadios = [dev2, dev5, dev6].filter(Boolean);

	relevantRadios.forEach(function(rName) {
		const rStat = wirelessStatus[rName];
		if (rStat) {
			if (rStat.retry_setup_failed) driverFailed = true;
			if (rStat.up) anyRadioUp = true;
			const ifaces = rStat.interfaces || [];
			ifaces.forEach(function(ifc) {
				const sec = ifc.section;
				const matchSec = sec && (sec === cfg.sec2 || sec === cfg.sec5 || sec === cfg.id || sec === ('default_' + rName) || sec === ('guest_' + rName));
				const matchSsid = ifc.config && (ifc.config.ssid === cfg.ssid || ifc.config.ssid === cfg.ssid2 || ifc.config.ssid === cfg.ssid5);
				if ((matchSec || matchSsid) && ifc.ifname) anyIfaceUp = true;
			});
		}
	});

	if (driverFailed) {
		return {
			state: 'error',
			label: 'ERRO NO DRIVER',
			pillClass: 'offline',
			checked: false,
			error: true
		};
	}

	if (isUciDisabled) {
		return {
			state: 'disabled',
			label: 'DESLIGADA',
			pillClass: 'standby',
			checked: false
		};
	}

	if (anyIfaceUp || (anyRadioUp && !driverFailed)) {
		return {
			state: 'active',
			label: 'ATIVA',
			pillClass: 'online',
			checked: true
		};
	}

	return {
		state: 'down',
		label: 'DESLIGADA',
		pillClass: 'standby',
		checked: false
	};
}
function wifiBand(radioName, radio) {
	const c=(radio&&radio.config)||{}, band=String(c.band||'').toLowerCase(), ht=String(c.htmode||'').toLowerCase(), hw=String(c.hwmode||'').toLowerCase(), name=String(radioName||'').toLowerCase();
	if (band.indexOf('6') === 0 || hw.indexOf('6g') >= 0 || ht.indexOf('320') >= 0 || name.indexOf('6g') >= 0) return '6g';
	if (band.indexOf('2') === 0 || hw === '11g' || ht.indexOf('g') >= 0 || name.indexOf('2g') >= 0) return '2g';
	if (band.indexOf('5') === 0 || hw === '11a' || ht.indexOf('80') >= 0 || ht.indexOf('160') >= 0 || name.indexOf('5g') >= 0) return '5g';
	return '';
}
function wifiTopology(status, wirelessUci) {
	const topo={ mainIfnames:[], guestIfnames:[], ifaceMeta:{}, survey2:'phy0-ap0', survey5:'phy1-ap0', scan2:'phy0-ap0', scan5:'phy1-ap0', dynamic:false };
	const uciMeta = {};
	if (wirelessUci) {
		try {
			const w = wifiConfig(wirelessUci);
			if (w.r2g && w.r2g.ssid) uciMeta['2g_main'] = w.r2g.ssid;
			if (w.r5g && w.r5g.ssid) uciMeta['5g_main'] = w.r5g.ssid;
			if (w.main && w.main.ssid2) uciMeta['2g_main'] = w.main.ssid2;
			if (w.main && w.main.ssid5) uciMeta['5g_main'] = w.main.ssid5;
			if (w.guest && w.guest.ssid) uciMeta['guest'] = w.guest.ssid;

			Object.keys(wirelessUci).forEach(function(k) {
				const ifc = wirelessUci[k];
				if (!ifc || ifc['.type'] !== 'wifi-iface') return;
				const ifn = ifc.ifname;
				if (ifn && typeof ifn === 'string') {
					const isG = (ifc.network === 'guest' || (Array.isArray(ifc.network) && ifc.network.indexOf('guest') >= 0));
					if (isG && topo.guestIfnames.indexOf(ifn) < 0) topo.guestIfnames.push(ifn);
					else if (!isG && topo.mainIfnames.indexOf(ifn) < 0) topo.mainIfnames.push(ifn);
				}
			});
		} catch(e) {}
	}
	Object.keys(status||{}).forEach(function(radioName) {
		const radio=status[radioName]||{}, band=wifiBand(radioName, radio), ifaces=radio.interfaces||[];
		const bandLabel = (band === '5g' ? '5 GHz' : (band === '6g' ? '6 GHz' : '2,4 GHz'));
		let firstAp='';
		ifaces.forEach(function(iface) {
			if (!iface) return;
			const ifname=iface.ifname, cfg=iface.config||{}, networks=Array.isArray(cfg.network)?cfg.network:[cfg.network].filter(Boolean);
			if (!ifname) return;
			if (!firstAp) firstAp=ifname;
			const isGuest = (networks.indexOf('guest') >= 0);
			if (isGuest) {
				if (topo.guestIfnames.indexOf(ifname) < 0) topo.guestIfnames.push(ifname);
			} else if (networks.indexOf('lan') >= 0 || networks.length === 0) {
				if (topo.mainIfnames.indexOf(ifname) < 0) topo.mainIfnames.push(ifname);
			}
			const fallbackSsid = isGuest ? (uciMeta['guest'] || '') : (band === '5g' ? (uciMeta['5g_main'] || '') : (uciMeta['2g_main'] || ''));
			topo.ifaceMeta[ifname] = {
				ifname: ifname,
				radio: radioName,
				band: band,
				bandLabel: bandLabel,
				ssid: cfg.ssid || fallbackSsid,
				isGuest: isGuest
			};
		});
		if (firstAp && band === '2g') topo.survey2=topo.scan2=firstAp;
		if (firstAp && band === '5g') topo.survey5=topo.scan5=firstAp;
	});
	topo.dynamic = topo.mainIfnames.length > 0 || topo.guestIfnames.length > 0;
	if (!topo.mainIfnames.length) topo.mainIfnames=['wlan0','wlan1','phy0-ap0','phy1-ap0'];
	if (!topo.guestIfnames.length) topo.guestIfnames=['wlan0-1','wlan1-1','phy0-ap1','phy1-ap1'];

	['wlan0', 'wlan1', 'phy0-ap0', 'phy1-ap0'].forEach(function(name, idx) {
		if (!topo.ifaceMeta[name]) {
			const is5g = (idx % 2 === 1);
			topo.ifaceMeta[name] = { ifname: name, radio: is5g ? 'radio1' : 'radio0', band: is5g ? '5g' : '2g', bandLabel: is5g ? '5 GHz' : '2,4 GHz', ssid: is5g ? (uciMeta['5g_main'] || '') : (uciMeta['2g_main'] || ''), isGuest: false };
		}
	});
	['wlan0-1', 'wlan1-1', 'phy0-ap1', 'phy1-ap1'].forEach(function(name, idx) {
		if (!topo.ifaceMeta[name]) {
			const is5g = (idx % 2 === 1);
			topo.ifaceMeta[name] = { ifname: name, radio: is5g ? 'radio1' : 'radio0', band: is5g ? '5g' : '2g', bandLabel: is5g ? '5 GHz' : '2,4 GHz', ssid: uciMeta['guest'] || '', isGuest: true };
		}
	});
	return topo;
}
function speedifyModeLabel(mode) {
	return ({ speed: 'Velocidade', streaming: 'Streaming', redundant: 'Redundante' })[mode] || mode || '—';
}
function trafficMap(report) {
	const out = {}, cols = {};
	if (!report || !Array.isArray(report.columns)) return out;
	report.columns.forEach(function(c, i) { cols[c] = i; });
	(report.data || []).forEach(function(r) {
		if (!r) return;
		const mac = String(r[cols.mac] || '').toUpperCase();
		if (!mac || mac === '00:00:00:00:00:00') return;
		if (!out[mac]) out[mac] = { rx: 0, tx: 0 };
		out[mac].rx += Number(r[cols.rx_bytes]) || 0; out[mac].tx += Number(r[cols.tx_bytes]) || 0;
	});
	return out;
}
function surveyInfo(s) {
	const rows = (s && s.results) || [], active = rows.find(function(x) { return x && x.in_use; }) || rows[0] || {};
	const noise = Number(active.noise), busy = Number(active.busy_time), time = Number(active.active_time), mhz = Number(active.mhz);
	let channel = null;
	if (mhz === 2484) channel = 14;
	else if (mhz >= 2412 && mhz <= 2472) channel = Math.round((mhz - 2407) / 5);
	else if (mhz >= 5000 && mhz <= 5900) channel = Math.round((mhz - 5000) / 5);
	else if (mhz >= 5925 && mhz <= 7125) channel = Math.round((mhz - 5950) / 5);
	return { noise: noise > 127 ? noise - 256 : noise, busy: time > 0 ? busy * 100 / time : 0, channel: channel };
}
function prefix24(ip) {
	const m = String(ip || '').match(/^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/);
	return m ? m[1] + '.' : '';
}
function dhcpStartSuggestion(ip) { const p=prefix24(ip); return p ? p + '10' : ''; }
function dhcpEndSuggestion(ip) { const p=prefix24(ip); return p ? p + '254' : ''; }
function currentChannelValue(configured, survey) {
	const c = String(configured == null ? '' : configured);
	if (c && c !== 'auto') return c;
	return survey && survey.channel ? String(survey.channel) : c;
}

function setupCardAccordion(options) {
	const cardId = options.id;
	const cardEl = options.cardEl;
	const titleEl = options.titleEl;
	const bodyEl = options.bodyEl;
	const isActive = !!options.isActive;
	const onToggle = options.onToggle;

	let isExpanded = false;
	let hasSavedState = false;
	if (typeof window !== 'undefined' && window.localStorage) {
		try {
			const saved = window.localStorage.getItem('ark_card_' + cardId);
			if (saved === '1' || saved === 'expanded') {
				isExpanded = true;
				hasSavedState = true;
			} else if (saved === '0' || saved === 'collapsed') {
				isExpanded = false;
				hasSavedState = true;
			}
		} catch(e) {}
	}
	if (!hasSavedState) {
		isExpanded = isActive;
	}

	const expandBtn = E('button', {
		class: 'ex-mini-button ex-accordion-toggle-btn',
		type: 'button',
		'aria-expanded': isExpanded ? 'true' : 'false',
		'aria-label': isExpanded ? 'Recolher painel' : 'Expandir painel'
	}, [isExpanded ? 'Recolher ▴' : 'Expandir ▾']);

	function applyState(expanded, userInitiated) {
		isExpanded = !!expanded;
		if (expandBtn) {
			expandBtn.textContent = isExpanded ? 'Recolher ▴' : 'Expandir ▾';
			if (typeof expandBtn.setAttribute === 'function') {
				expandBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
			}
		}

		if (cardEl && cardEl.classList) {
			if (isExpanded) {
				cardEl.classList.remove('is-collapsed');
				cardEl.classList.add('is-expanded');
			} else {
				cardEl.classList.remove('is-expanded');
				cardEl.classList.add('is-collapsed');
			}
		}

		if (bodyEl) {
			if (typeof bodyEl.setAttribute === 'function') {
				bodyEl.setAttribute('aria-hidden', isExpanded ? 'false' : 'true');
			}
			if (bodyEl.classList) {
				if (isExpanded) {
					bodyEl.classList.remove('collapsed');
					bodyEl.classList.add('expanded');
				} else {
					bodyEl.classList.remove('expanded');
					bodyEl.classList.add('collapsed');
				}
			}
		}

		if (typeof onToggle === 'function') {
			try { onToggle(isExpanded, userInitiated); } catch(e) {}
		}
	}

	function toggle() {
		const nextState = !isExpanded;
		hasSavedState = true;
		if (typeof window !== 'undefined' && window.localStorage) {
			try {
				window.localStorage.setItem('ark_card_' + cardId, nextState ? '1' : '0');
			} catch(e) {}
		}
		applyState(nextState, true);
	}

	expandBtn.addEventListener('click', function(ev) {
		ev.preventDefault();
		ev.stopPropagation();
		toggle();
	});

	if (titleEl) {
		titleEl.classList.add('ex-accordion-header');
		titleEl.addEventListener('click', function(ev) {
			if (ev.target && ev.target.closest('button, a, input, select, label, .ex-switch, .ex-card-title-actions')) {
				return;
			}
			toggle();
		});
	}

	applyState(isExpanded, false);

	return {
		expandBtn: expandBtn,
		applyState: applyState,
		toggle: toggle,
		isExpanded: function() { return isExpanded; },
		updateActiveState: function(newActive) {
			if (!hasSavedState) {
				applyState(!!newActive, false);
			}
		}
	};
}


