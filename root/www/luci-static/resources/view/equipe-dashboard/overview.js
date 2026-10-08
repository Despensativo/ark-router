'use strict';
'require view';
'require rpc';
'require poll';
'require fs';
'require ui';
const ARK_BUILD_VERSION = '1.5.10';
if (typeof window !== 'undefined') {
	window.ARK_BUILD_VERSION = ARK_BUILD_VERSION;
	window.ARK_VERSION = ARK_BUILD_VERSION;
}

document.querySelector('head').appendChild(E('link', {
	'rel': 'stylesheet', 'type': 'text/css',
	'href': L.resource('view/equipe-dashboard/overview.css') + '?v=' + ARK_BUILD_VERSION
}));

const callSystemBoard = rpc.declare({ object: 'system', method: 'board' });
const callSystemInfo = rpc.declare({ object: 'system', method: 'info' });
const callInterfaceDump = rpc.declare({ object: 'network.interface', method: 'dump' });
const callDeviceStatus = rpc.declare({ object: 'network.device', method: 'status', params: [ 'name' ], expect: { '': {} } });
const callWirelessStatus = rpc.declare({ object: 'network.wireless', method: 'status', expect: { '': {} } });
const callMwanStatus = rpc.declare({ object: 'mwan3', method: 'status', expect: { '': {} } });
const callDHCPLeases = rpc.declare({ object: 'luci-rpc', method: 'getDHCPLeases', expect: { '': {} } });
const callHostHints = rpc.declare({ object: 'luci-rpc', method: 'getHostHints', expect: { '': {} } });
const callAssocList = rpc.declare({ object: 'iwinfo', method: 'assoclist', params: [ 'device' ], expect: { '': {} } });
const callSurvey = rpc.declare({ object: 'iwinfo', method: 'survey', params: [ 'device' ], expect: { '': {} } });
const callScan = rpc.declare({ object: 'iwinfo', method: 'scan', params: [ 'device' ], expect: { '': {} } });
const callFreqList = rpc.declare({ object: 'iwinfo', method: 'freqlist', params: [ 'device' ], expect: { '': {} } });
const callCountryList = rpc.declare({ object: 'iwinfo', method: 'countrylist', params: [ 'device' ], expect: { '': {} } });
const callUciGet = rpc.declare({ object: 'uci', method: 'get', params: [ 'config' ], expect: { '': {} } });

let dashboardLanguage='pt-br', translationObserver=null;

const EN = (typeof window !== 'undefined' && window.ARK_I18N_EN) || {};
const ES = (typeof window !== 'undefined' && window.ARK_I18N_ES) || {};

function loadDashboardLanguage(lang) {
	if (!lang || lang === 'pt-br') return Promise.resolve();
	if (lang === 'en' && window.ARK_I18N_EN && Object.keys(window.ARK_I18N_EN).length > 0) {
		Object.assign(EN, window.ARK_I18N_EN);
		return Promise.resolve();
	}
	if (lang === 'es' && window.ARK_I18N_ES && Object.keys(window.ARK_I18N_ES).length > 0) {
		Object.assign(ES, window.ARK_I18N_ES);
		return Promise.resolve();
	}
	const targetLang = (lang === 'es' ? 'es' : 'en');
	return new Promise(function(resolve) {
		if (typeof document === 'undefined') return resolve();
		const s = document.createElement('script');
		s.type = 'text/javascript';
		const ver = (typeof ARK_BUILD_VERSION !== 'undefined' ? ARK_BUILD_VERSION : (window.ARK_BUILD_VERSION || '1.5.6'));
		s.src = L.resource('view/equipe-dashboard/i18n.' + targetLang + '.js') + '?v=' + ver;
		s.onload = function() {
			if (targetLang === 'en' && window.ARK_I18N_EN) Object.assign(EN, window.ARK_I18N_EN);
			if (targetLang === 'es' && window.ARK_I18N_ES) Object.assign(ES, window.ARK_I18N_ES);
			if (typeof translateTree === 'function' && document.body) translateTree(document.body);
			resolve();
		};
		s.onerror = function() {
			console.warn('[ARK Router] Falha ao carregar i18n.' + targetLang + '.js, continuando com fallback.');
			resolve();
		};
		document.head.appendChild(s);
	});
}

if (typeof window !== 'undefined') {
	window.loadDashboardLanguage = loadDashboardLanguage;
}

function _t(text){
	return translateText(text);
}

const FEATURE_META={
	sqm:{name:'SQM / CAKE',description:'Organiza as filas e reduz a latência quando o link está ocupado.'},
	mwan3:{name:'Multi‑WAN',description:'Adiciona failover e balanceamento entre dois ou mais links.'},
	nlbwmon:{name:'Consumo por dispositivo',description:'Adiciona tráfego individual e histórico detalhado de consumo.'},
	upnp:{name:'UPnP / NAT‑PMP',description:'Permite que aplicativos compatíveis solicitem portas automaticamente.'},
	wifi:{name:'Wi‑Fi e análise de canais',description:'Usa os recursos sem fio e regulatórios fornecidos pelo driver.'},
	history:{name:'Histórico de 24 horas',description:'Coletor leve incluído no painel.'},
	temperature:{name:'Sensor de temperatura',description:'Exibe a leitura térmica quando o hardware oferece um sensor.'},
	custom_qos:{name:'Limites personalizados',description:'Integra as regras específicas de prioridade e visitantes.'}
	,irqbalance:{name:'IRQ Balance',description:'Distribui interrupções de hardware entre os núcleos do processador para manter Wi‑Fi, rede e CPU mais responsivos.'}
	,speedify:{name:'Speedify Bonding',description:'Integra o Speedify para somar links de internet de verdade usando licença Speedify Router.',recommended:true}
	,zerotier:{name:'ZeroTier remoto leve',description:'Acesso remoto leve por rede virtual. Melhor para roteadores com pouca flash/RAM.',recommended:true}
	,wireguard:{name:'WireGuard VPN',description:'VPN de alta velocidade integrada ao kernel Linux. Conecte o roteador a servidores externos (Cliente) ou crie túneis locais (Servidor) com QR Code.',recommended:true}
	,adblock:{name:'Bloqueador de Anúncios',description:'Protege a rede inteira contra propagandas invasivas, anúncios de Smart TV e rastreadores.',recommended:true}
	,usteer:{name:'Assistente de Roaming (usteer)',description:'Orquestra troca rápida de sinal (AP Steering) e Band Steering entre múltiplos roteadores e bandas Wi-Fi.',recommended:true}
};

function installDashboardNotifications(){
	if(ui._arkNotificationOriginal)return;
	ui._arkNotificationOriginal=ui.addNotification;
	ui.addNotification=function(title,content,severity){
		let stack=document.getElementById('ex-toast-stack');
		if(!stack){stack=E('div',{id:'ex-toast-stack',class:'ex-toast-stack','aria-live':'polite'});document.body.appendChild(stack);}
		const body=E('div',{class:'ex-toast-body'},[]), toast=E('div',{class:'ex-toast '+(severity||'info'),role:severity==='danger'?'alert':'status'}), close=E('button',{class:'ex-toast-close',type:'button','aria-label':translateText('Fechar aviso')},['×']);
		if(title)body.appendChild(E('strong',{class:'ex-toast-title'},[title]));
		if(content instanceof Node)body.appendChild(content);else body.appendChild(document.createTextNode(String(content||'')));
		toast.appendChild(body);toast.appendChild(close);toast.appendChild(E('i',{class:'ex-toast-timer'}));stack.appendChild(toast);translateTree(toast);
		let removed=false,timer=null;const remove=function(){if(removed)return;removed=true;window.clearTimeout(timer);toast.classList.add('is-leaving');window.setTimeout(function(){toast.remove();if(stack&&!stack.children.length)stack.remove();},180);};
		close.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();remove();});
		toast.addEventListener('click',function(ev){if(!ev.target.closest('a,button,input,select,textarea'))remove();});
		toast.addEventListener('mouseenter',function(){window.clearTimeout(timer);toast.classList.add('is-paused');});
		toast.addEventListener('mouseleave',function(){toast.classList.remove('is-paused');timer=window.setTimeout(remove,3500);});
		window.requestAnimationFrame(function(){toast.classList.add('is-visible');});timer=window.setTimeout(remove,7000);return toast;
	};
}
installDashboardNotifications();

function translateText(value){
	let s=String(value==null?'':value);
	if (dashboardLanguage === 'pt-br' || !s) return s;

	const leadMatch = s.match(/^\s*/);
	const trailMatch = s.match(/\s*$/);
	const lead = leadMatch ? leadMatch[0] : '';
	const trail = trailMatch ? trailMatch[0] : '';
	const trimmed = s.slice(lead.length, s.length - (trail ? trail.length : 0));
	if (!trimmed) return s;

	const iconMatch = trimmed.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\uFE0F|[\u2000-\u3300]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|[\u2600-\u27BF])\s*/);
	const iconPrefix = iconMatch ? iconMatch[0] : '';
	const coreText = iconPrefix ? trimmed.slice(iconPrefix.length) : trimmed;

	if (dashboardLanguage === 'en') {
		if (EN[s]) return EN[s];
		if (EN[trimmed]) return lead + EN[trimmed] + trail;
		if (iconPrefix && EN[coreText]) return lead + iconPrefix + EN[coreText] + trail;
		s=s.replace(/^Total recebido: /,'Total received: ').replace(/^Total enviado: /,'Total sent: ').replace(/^Pico /,'Peak ').replace(/ amostras • /,' samples • ').replace(/ amostra • /,' sample • ').replace(/ até agora$/,' to now');
		s=s.replace(/ conectado(s)?$/,' connected').replace(/ conectado(s)? no Wi-Fi$/,' connected on Wi-Fi').replace(/ neste ponto • /,' on this node • ').replace(/ na rede$/,' on network').replace(/ no Wi-Fi$/,' on Wi-Fi').replace(/Canal /g,'Channel ').replace(/ • automático/g,' • automatic').replace(/ • manual/g,' • manual').replace(/ • ocupação /g,' • occupancy ').replace(/^Ruído:/,'Noise:').replace(/ visitantes$/,' guests').replace(/ ATIVA$/,' ACTIVE').replace(/ ATIVAS$/,' ACTIVE');
		s=s.replace(/^Ligado • /,'On • ').replace(/^Desligado • /,'Off • ').replace(/ canais definidos manualmente/,' manually selected channels').replace(/ o roteador escolhe os canais/,' the router selects channels');
		s=s.replace(/^LIGADA$/,'ON').replace(/^DESLIGADA$/,'OFF').replace(/Recolher\s*[▴▲^]?/g,'Collapse ▴').replace(/Expandir\s*[▾▼v]?/g,'Expand ▾').replace(/^PADRÃO$/,'DEFAULT');
		s=s.replace(/(\d+)\s+otimizaç(ão ativa|ões ativas) • toque para configurar/g,'$1 active optimizations • tap to configure');
		s=s.replace(/Controles de estabilidade e memória para eventos • toque para configurar/g,'Stability and memory controls for events • tap to configure');
		s=s.replace(/(\d+)\s+conexões ativas no NAT • (\d+)% da tabela/g,'$1 active NAT connections • $2% of table');
		s=s.replace(/Controla a tabela de conexões ativas do firewall e a reciclagem de conexões mortas \(padrão de 1 hora ativo\)\./g,'Controls active firewall connections table and recycling of dead connections (1-hour default active).');
		s=s.replace(/Tabela dimensionada para ([\d\.]+) conexões\./g,'Table sized for $1 connections.');
		s=s.replace(/Expande a tabela para ([\d\.]+) conexões simultâneas\./g,'Expands table to $1 concurrent connections.');
		s=s.replace(/• lista aberta/g,'• open list').replace(/• lista recolhida/g,'• collapsed list');
		s=s.replace(/• modo econômico/g,'• eco mode').replace(/• modo turbo/g,'• turbo mode');
		s=s.replace(/sessão de (\d+) horas • atualização a cada (\d+) segundo(s)?/g,'$1-hour session • updates every $2 second$3');
		s=s.replace(/Encendido hace /g,'Up for ').replace(/Ligado há /g,'Up for ');
		s=s.replace(/(\d+)% em uso • (.+)/g,'$1% in use • $2');
		s=s.replace(/livre ([\d\.]+\s+[KMGTP]?B) \/ total ([\d\.]+\s+[KMGTP]?B)/g,'free $1 / total $2');
		s=s.replace(/Flash Interna • livre ([\d\.]+\s+[KMGTP]?B)/g,'Internal Flash • free $1');
		s=s.replace(/^CRÍTICO PARA (.*)$/,'CRITICAL FOR $1').replace(/^RECOMENDADO PARA (.*)$/,'RECOMMENDED FOR $1');
		s=s.replace(/^ROTEADORES <= 16MB(.*)$/,'ROUTERS <= 16MB$1');
		s=s.replace(/Resolução local gerenciada pelo (.+?)\. O modo All-Servers está desativado para impedir que servidores públicos recebam requisições simultâneas e burlem suas listas de filtros\./g,'Local resolution managed by $1. All-Servers mode is disabled to prevent public servers from receiving simultaneous requests and bypassing filter lists.');
		s=s.replace(/A distribuição já está ativa na (WAN\d*)\. Desative na \1 primeiro para ativar aqui\./g,'IPv6 distribution is already active on $1. Disable it on $1 first to enable here.');
		return s;
	}
	if (dashboardLanguage === 'es') {
		if (ES[s]) return ES[s];
		if (ES[trimmed]) return lead + ES[trimmed] + trail;
		if (iconPrefix && ES[coreText]) return lead + iconPrefix + ES[coreText] + trail;
		s=s.replace(/^Total recebido: /,'Total recibido: ').replace(/^Total enviado: /,'Total enviado: ').replace(/^Pico /,'Pico ').replace(/ amostras • /,' muestras • ').replace(/ amostra • /,' muestra • ').replace(/ até agora$/,' hasta ahora');
		s=s.replace(/ conectado(s)?$/,' conectado(s)').replace(/ conectado(s)? no Wi-Fi$/,' conectado(s) en Wi-Fi').replace(/ neste ponto • /,' en este nodo • ').replace(/ na rede$/,' en red').replace(/ no Wi-Fi$/,' en Wi-Fi').replace(/Canal /g,'Canal ').replace(/ • automático/g,' • automático').replace(/ • manual/g,' • manual').replace(/ • ocupação /g,' • ocupación ').replace(/^Ruído:/,'Ruido:').replace(/ visitantes$/,' invitados').replace(/ ATIVA$/,' ACTIVA').replace(/ ATIVAS$/,' ACTIVAS');
		s=s.replace(/^Ligado • /,'Encendido • ').replace(/^Desligado • /,'Apagado • ').replace(/ canais definidos manualmente/,' canales seleccionados manualmente').replace(/ o roteador escolhe os canais/,' el router elige los canales');
		s=s.replace(/^LIGADA$/,'ACTIVADA').replace(/^DESLIGADA$/,'DESACTIVADA').replace(/Recolher\s*[▴▲^]?/g,'Colapsar ▴').replace(/Expandir\s*[▾▼v]?/g,'Expandir ▾').replace(/^PADRÃO$/,'POR DEFECTO');
		s=s.replace(/(\d+)\s+otimizaç(ão ativa|ões ativas) • toque para configurar/g,'$1 optimizaciones activas • toque para configurar');
		s=s.replace(/Controles de estabilidade e memória para eventos • toque para configurar/g,'Controles de estabilidad y memoria para eventos • toque para configurar');
		s=s.replace(/(\d+)\s+conexões ativas no NAT • (\d+)% da tabela/g,'$1 conexiones activas en NAT • $2% de la tabla');
		s=s.replace(/Controla a tabela de conexões ativas do firewall e a reciclagem de conexões mortas \(padrão de 1 hora ativo\)\./g,'Controla la tabla de conexiones activas del cortafuegos y el reciclaje de conexiones muertas (estándar de 1 hora activo).');
		s=s.replace(/Tabela dimensionada para ([\d\.]+) conexões\./g,'Tabla dimensionada para $1 conexiones.');
		s=s.replace(/Expande a tabela para ([\d\.]+) conexões simultâneas\./g,'Expande la tabla a $1 conexiones simultáneas.');
		s=s.replace(/• lista aberta/g,'• lista abierta').replace(/• lista recolhida/g,'• lista plegada');
		s=s.replace(/• modo econômico/g,'• modo económico').replace(/• modo turbo/g,'• modo turbo');
		s=s.replace(/sessão de (\d+) horas • atualização a cada (\d+) segundo(s)?/g,'sesión de $1 horas • actualización cada $2 segundo$3');
		s=s.replace(/Ligado há /g,'Encendido hace ');
		s=s.replace(/(\d+)% em uso • (.+)/g,'$1% en uso • $2');
		s=s.replace(/livre ([\d\.]+\s+[KMGTP]?B) \/ total ([\d\.]+\s+[KMGTP]?B)/g,'libre $1 / total $2');
		s=s.replace(/Flash Interna • livre ([\d\.]+\s+[KMGTP]?B)/g,'Flash Interna • libre $1');
		s=s.replace(/^CRÍTICO PARA (.*)$/,'CRÍTICO PARA $1').replace(/^RECOMENDADO PARA (.*)$/,'RECOMENDADO PARA $1');
		s=s.replace(/^ROTEADORES <= 16MB(.*)$/,'ENRUTADORES <= 16MB$1');
		s=s.replace(/Resolução local gerenciada pelo (.+?)\. O modo All-Servers está desativado para impedir que servidores públicos recebam requisições simultâneas e burlem suas listas de filtros\./g,'Resolución local gestionada por $1. El modo All-Servers está desactivado para evitar que servidores públicos reciban solicitudes simultáneas y evadan sus listas de filtros.');
		s=s.replace(/A distribuição já está ativa na (WAN\d*)\. Desative na \1 primeiro para ativar aqui\./g,'La distribución ya está activa en $1. Desactívela en $1 primero para activarla aquí.');
		return s;
	}
	return s;
}
function translateAttributes(el){
	if(!el||el.nodeType!==Node.ELEMENT_NODE)return;
	if(el.hasAttribute('title')){
		const t=translateText(el.getAttribute('title'));
		if(t!==el.getAttribute('title'))el.setAttribute('title',t);
	}
	if(el.hasAttribute('placeholder')){
		const p=translateText(el.getAttribute('placeholder'));
		if(p!==el.getAttribute('placeholder'))el.setAttribute('placeholder',p);
	}
	if(el.hasAttribute('aria-label')){
		const a=translateText(el.getAttribute('aria-label'));
		if(a!==el.getAttribute('aria-label'))el.setAttribute('aria-label',a);
	}
	if(el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value){
		const v=translateText(el.value);
		if(v!==el.value)el.value=v;
	}
}
function translateTree(root){
	if(dashboardLanguage==='pt-br'||!root)return;
	if(root.nodeType===Node.TEXT_NODE){
		if(!root.parentNode||!/^(SCRIPT|STYLE|CODE)$/.test(root.parentNode.nodeName)){
			const v=translateText(root.nodeValue);
			if(v!==root.nodeValue)root.nodeValue=v;
		}
		return;
	}
	if(root.nodeType===Node.ELEMENT_NODE){
		translateAttributes(root);
		if(root.querySelectorAll){
			const tagged=root.querySelectorAll('[title],[placeholder],[aria-label]');
			for(let i=0;i<tagged.length;i++)translateAttributes(tagged[i]);
		}
	}
	const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
	let n;
	while((n=walker.nextNode())){
		if(n.parentNode&&/^(SCRIPT|STYLE|CODE)$/.test(n.parentNode.nodeName))continue;
		const v=translateText(n.nodeValue);
		if(v!==n.nodeValue)n.nodeValue=v;
	}
}
function enableTranslation(){
	if(dashboardLanguage==='pt-br')return;
	translateTree(document.body);
	if(translationObserver)return;
	translationObserver=new MutationObserver(function(records){
		records.forEach(function(r){
			r.addedNodes.forEach(function(n){translateTree(n);});
			if(r.type==='characterData'&&r.target){
				const v=translateText(r.target.nodeValue);
				if(v!==r.target.nodeValue)r.target.nodeValue=v;
			}
		});
	});
	translationObserver.observe(document.body,{subtree:true,childList:true,characterData:true});
}

function safe(promise, fallback, timeoutMs) {
	if (!promise || typeof promise.then !== 'function') return Promise.resolve(fallback);
	var timeout = timeoutMs || 12000;
	var timer = null;
	var timeoutPromise = new Promise(function(_, reject) {
		timer = window.setTimeout(function() {
			reject(new Error('Operation timed out'));
		}, timeout);
	});
	return L.resolveDefault(
		Promise.race([promise, timeoutPromise]).finally(function() {
			if (timer) window.clearTimeout(timer);
		}),
		fallback
	);
}

function getDeviceIcon(name) {
	const n = String(name || '').toLowerCase();
	if (n.indexOf('gamer') >= 0 || n.indexOf('playstation') >= 0 || n.indexOf('ps5') >= 0 || n.indexOf('ps4') >= 0 || n.indexOf('xbox') >= 0 || n.indexOf('nintendo') >= 0 || n.indexOf('switch') >= 0 || n.indexOf('game') >= 0) return '🎮';
	if (n.indexOf('tv') >= 0 || n.indexOf('box') >= 0 || n.indexOf('chromecast') >= 0 || n.indexOf('roku') >= 0 || n.indexOf('fire') >= 0 || n.indexOf('smart') >= 0) return '📺';
	if (n.indexOf('pc') >= 0 || n.indexOf('desktop') >= 0 || n.indexOf('computador') >= 0 || n.indexOf('notebook') >= 0 || n.indexOf('macbook') >= 0 || n.indexOf('laptop') >= 0 || n.indexOf('dell') >= 0 || n.indexOf('lenovo') >= 0) return '💻';
	if (n.indexOf('iphone') >= 0 || n.indexOf('ipad') >= 0 || n.indexOf('galaxy') >= 0 || n.indexOf('s23') >= 0 || n.indexOf('celular') >= 0 || n.indexOf('phone') >= 0 || n.indexOf('redmi') >= 0 || n.indexOf('xiaomi') >= 0 || n.indexOf('motorola') >= 0 || n.indexOf('apple') >= 0) return '📱';
	if (n.indexOf('alexa') >= 0 || n.indexOf('echo') >= 0 || n.indexOf('sound') >= 0 || n.indexOf('som') >= 0) return '🔊';
	if (n.indexOf('camera') >= 0 || n.indexOf('câmera') >= 0 || n.indexOf('porteiro') >= 0 || n.indexOf('intelbras') >= 0 || n.indexOf('icomm') >= 0) return '📹';
	if (n.indexOf('lamp') >= 0 || n.indexOf('luz') >= 0 || n.indexOf('apagador') >= 0 || n.indexOf('tomada') >= 0 || n.indexOf('medidor') >= 0) return '💡';
	return '🖥️';
}

function formatRate(bits) {
	bits = Number(bits) || 0;
	if (bits >= 1000000000) return (bits / 1000000000).toFixed(bits >= 10000000000 ? 1 : 2) + ' Gbps';
	if (bits >= 1000000) return (bits / 1000000).toFixed(bits >= 10000000 ? 1 : 2) + ' Mbps';
	if (bits >= 1000) return (bits / 1000).toFixed(1) + ' Kbps';
	return bits.toFixed(0) + ' bps';
}
function kbpsToMbpsInput(kbps) {
	if (kbps == null || String(kbps).trim() === '') return '';
	const value = Number(kbps);
	if (!isFinite(value) || value <= 0) return '0';
	return String(Math.round(value) / 1000);
}
function mbpsToKbps(value) {
	if (value == null || String(value).trim() === '') return '';
	const rate = Number(value);
	if (!isFinite(rate) || rate < 0) return null;
	return String(Math.round(rate * 1000));
}
function formatBytes(bytes) {
	bytes = Number(bytes) || 0;
	const units = [ 'B', 'KB', 'MB', 'GB', 'TB' ]; let unit = 0;
	while (bytes >= 1024 && unit < units.length - 1) { bytes /= 1024; unit++; }
	return bytes.toFixed(unit > 1 ? 1 : 0) + ' ' + units[unit];
}
if (!String.prototype.format) {
	String.prototype.format = function() {
		var args = arguments;
		var i = 0;
		return this.replace(/%[sdh]/g, function() { return args[i++]; });
	};
}
function formatUptime(seconds) {
	seconds = Math.max(0, Number(seconds) || 0);
	const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
	return d ? (d + 'd ' + h + 'h ' + m + 'm') : (h ? (h + 'h ' + m + 'm') : (m + 'm'));
}
function text(id, value) { const n = document.getElementById(id); if (n) n.textContent = value == null ? '—' : String(value); }
function setPill(id, state, label) { const n = document.getElementById(id); if (n) { n.className = 'ex-pill ' + state; n.textContent = label; } }
function reloadSoon(message, delay) { ui.addNotification(null, E('p', {}, [ message || 'Aplicado. Recarregando o painel…' ])); window.setTimeout(function() { window.location.reload(); }, delay || 800); }
function isExpectedApplyDisconnect(e) { return /xhr|timeout|timed out|network|failed to fetch|request/i.test(String((e && e.message) || e || '')); }
function reloadAfterExpectedDisconnect(e, message, delay) {
	if (!isExpectedApplyDisconnect(e)) return false;
	try { ui.hideModal(); } catch (err) {}
	reloadSoon(message || 'Comando enviado. O painel pode ter perdido a resposta enquanto o roteador reinicia serviços…', delay || 1500);
	return true;
}
function closeModal(ev) {
	if (ev && ev.preventDefault) ev.preventDefault();
	if (ev && ev.stopPropagation) ev.stopPropagation();
	try { ui.hideModal(); } catch (e) {}
	document.body.classList.remove('modal-open');
	document.body.classList.remove('modal-overlay-active');
	if (window.ArkTheme && typeof window.ArkTheme.restoreScroll === 'function') {
		window.ArkTheme.restoreScroll();
	}
}
function redirectToRouter(ip, message, delay) {
	const path = window.location.pathname || '/cgi-bin/luci/admin/equipe-dashboard';
	ui.addNotification(null, E('p', {}, [ message || ('Abrindo novo endereço: ' + ip) ]));
	window.setTimeout(function() { window.location.href = window.location.protocol + '//' + ip + path; }, delay || 1000);
}

function iface(dump, name) { return ((dump && dump.interface) || []).find(function(x) { return x && x.interface === name; }) || {}; }
function values(config) { return config && config.values || {}; }
function lanPortsFromNetwork(networkConfig) {
	const net=values(networkConfig), ports=[], seen={};
	Object.keys(net).forEach(function(k) {
		const s=net[k]||{};
		if(s['.type']==='device'&&s.name==='br-lan') {
			const p=Array.isArray(s.ports)?s.ports:String(s.ports||'').split(/\s+/);
			p.forEach(function(port){ if(port&&!seen[port]){seen[port]=1;ports.push(port);} });
		} else if(s['.type']==='interface'&&k==='lan'&&s.ifname) {
			const p=Array.isArray(s.ifname)?s.ifname:String(s.ifname||'').split(/\s+/);
			p.forEach(function(port){ if(port&&!seen[port]){seen[port]=1;ports.push(port);} });
		} else if(s['.type']==='switch_vlan') {
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
	// Se existirem interfaces físicas particionadas (ex: eth1.1 e eth1.2 no IPQ5332)
	// remove os aliases redundantes de switch (lan1, lan2) mantendo os nomes reais de interface
	const hasVlanDevs = ports.some(function(p){ return /^eth[0-9]+\.[0-9]+$/i.test(p); });
	let result = ports;
	if (hasVlanDevs) {
		result = ports.filter(function(p){ return !/^lan[0-9]+$/i.test(p); });
	}
	if(!result.length) ['lan1','lan2','lan3','lan4'].forEach(function(port){result.push(port);});
	const isWanToLan = !!(net.autowan && String(net.autowan.wan_to_lan) === '1');
	const isWanPromoted = !!(net.autowan && String(net.autowan.wan_promoted) === '1');
	if (isWanToLan && !isWanPromoted) {
		const wanDev = (net.wan && (net.wan.ark_phys_port || net.wan.device || net.wan.ifname)) || '';
		const targetPort = (wanDev === 'eth0.2' || !wanDev) ? 'lan5' : wanDev;
		if (!seen[targetPort] && !seen.lan5 && !seen.eth1) {
			seen[targetPort] = 1;
			result.push(targetPort);
		}
	}
	return result;
}
function portLabel(port) {
	if (port === 'eth0') return 'PORTA 2.5G';
	if (port === 'eth1.1') return 'LAN 1';
	if (port === 'eth1.2') return 'LAN 2';
	if (port === 'eth1' || port === 'lan5' || port === 'port5' || port === 'wan' || port === 'eth0.2') return 'PORTA WAN (LAN)';
	const m=String(port||'').match(/^lan([0-9]+)$/i);
	return m?'LAN '+m[1]:String(port||'porta').toUpperCase();
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
	if (isSatelliteOrAp(data)) return [];
	if (data && Array.isArray(data.activeWans) && data.activeWans.length > 0) return data.activeWans;
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
	if (generalRole === 'secondary' || generalRole === 'satellite' || generalRole === 'ap') return true;
	const dashNetMode = (dashboardCfg.main && dashboardCfg.main.network_mode) || (dashboardCfg.general && dashboardCfg.general.network_mode) || '';
	if (dashNetMode === 'router') return false;
	if (dashNetMode === 'ap') return true;
	const netCfg = values((data || {}).networkConfig);
	if (netCfg && netCfg.general && netCfg.general.network_mode === 'router') return false;
	if (netCfg && netCfg.general && netCfg.general.network_mode === 'ap') return true;
	let lanStatus = (data || {}).lanStatus;
	if (lanStatus && typeof lanStatus.stdout === 'string') {
		try { lanStatus = JSON.parse(lanStatus.stdout); } catch(e) {}
	}
	if (lanStatus && (lanStatus.dhcp_disabled || lanStatus.mode === 'ap') && lanStatus.gateway) return true;
	const dhcpCfg = values((data || {}).dhcpLeasesConfig || (data || {}).dhcp);
	const dhcpLanIgnore = dhcpCfg && dhcpCfg.lan && String(dhcpCfg.lan.ignore) === '1';
	const lanGw = netCfg && netCfg.lan && netCfg.lan.gateway;
	if (dhcpLanIgnore && lanGw) return true;
	if (globalCaps) {
		if (globalCaps.role === 'master' || globalCaps.role === 'primary' || globalCaps.role === 'gateway' || globalCaps.network_mode === 'router') return false;
		if (globalCaps.role === 'secondary' || globalCaps.role === 'satellite' || globalCaps.role === 'ap' || globalCaps.network_mode === 'ap') return true;
	}
	return false;
}

function sqmWanProfiles(data) {
	const net=values((data||{}).networkConfig), dump=(data||{}).interfaces||{}, result=[], seen={};
	Object.keys(net).filter(function(name){return /^wan(?:[0-9]+)?$/i.test(name);}).sort(function(a,b){if(a==='wan')return -1;if(b==='wan')return 1;return Number(a.replace(/\D/g,''))-Number(b.replace(/\D/g,''));}).forEach(function(name){
		const cfg=net[name]||{}, live=iface(dump,name), proto=String(cfg.proto||''), hasIpv4=Array.isArray(live['ipv4-address'])&&live['ipv4-address'].length>0;
		if(isCompanionOrVirtualIpv6Wan(name, cfg, live) || proto==='none'||proto==='dhcpv6'||(!/^(dhcp|pppoe|static)$/i.test(proto)&&!hasIpv4))return;
		const section=name==='wan'?'wan1':name.toLowerCase();if(seen[section])return;seen[section]=1;
		result.push({network:name,section:section,label:name==='wan'?'WAN1':name.toUpperCase(),device:String(live.l3_device||live.device||cfg.device||name),online:!!live.up,proto:proto});
	});
	return result;
}
function parsePing(r) { const m = ((r && r.stdout) || '').match(/time[=<]([0-9.]+)/); return r && r.code === 0 && m ? Number(m[1]) : null; }
const PING_TARGET_PRESETS = [
	{
		id: 'cloudflare',
		title: 'Cloudflare DNS',
		shortLabel: '⚡ Cloudflare',
		ip: '1.1.1.1',
		desc: 'Rede Anycast global com centenas de PoPs mundiais e altíssima velocidade para CDN e web.',
		badge: 'Recomendado'
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
		desc: 'Insira qualquer IP ou domínio (ex: 1.0.0.1, 8.8.4.4, servidores de jogos, filiais corporativas ou VPNs).',
		badge: 'Manual'
	}
];
function getPingTargetInfo(data) {
	const eqCfg = (data && data.equipeDashboardConfig && data.equipeDashboardConfig.values && data.equipeDashboardConfig.values.main) ||
		(data && data.capabilities && data.capabilities.ping_target ? data.capabilities : null) ||
		(typeof window !== 'undefined' && window._arkCapabilities && window._arkCapabilities.ping_target ? window._arkCapabilities : null);
	let target = (eqCfg && eqCfg.ping_target) || '';
	let customIp = (eqCfg && eqCfg.ping_custom_ip != null) ? eqCfg.ping_custom_ip : '';

	// Migrate legacy registro_br to cloudflare
	if (target === 'registro_br') target = 'cloudflare';

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
			if (target === 'registro_br') target = 'cloudflare';
		}
	} catch(e) {}

	return { target: target || 'cloudflare', customIp: customIp || '' };
}
function getPingTargetShortLabel(target, customIp) {
	if (target === 'custom') {
		const clean = (customIp || '').trim();
		return clean ? ('✍️ ' + clean) : '✍️ Custom';
	}
	const p = PING_TARGET_PRESETS.find(function(item) { return item.id === target; });
	return p ? p.shortLabel : '⚡ Cloudflare';
}
function resolvePingTarget(target, customIp, live, cfg) {
	if (target === 'cloudflare' || target === 'registro_br') return '1.1.1.1';
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
		return '1.1.1.1';
	}
	return '1.1.1.1';
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
		if(band.indexOf('6')===0||band==='3'||hw.indexOf('6g')>=0||ht.indexOf('320')>=0||dev.indexOf('6g')>=0||dev==='wifi2'||dev==='radio2')return '6g';
		if(band.indexOf('2')===0||band==='1'||hw==='11g'||hw==='11b'||hw.indexOf('beg')>=0||hw.indexOf('g')>=0||ht.indexOf('g')>=0||dev.indexOf('2g')>=0||dev==='wifi0'||dev==='radio0')return '2g';
		if(band.indexOf('5')===0||band==='2'||hw==='11a'||hw.indexOf('bea')>=0||ht.indexOf('80')>=0||ht.indexOf('160')>=0||dev.indexOf('5g')>=0||dev==='wifi1'||dev==='radio1')return '5g';
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
		if (band.indexOf('6') === 0 || band === '3' || hw.indexOf('6g') >= 0 || ht.indexOf('320') >= 0 || name.indexOf('6g') >= 0 || name === 'wifi2' || name === 'radio2') {
			if (!dev6g) dev6g = k;
		} else if (band.indexOf('2') === 0 || band === '1' || hw === '11g' || hw === '11b' || hw.indexOf('beg') >= 0 || hw.indexOf('g') >= 0 || ht.indexOf('g') >= 0 || name.indexOf('2g') >= 0 || name === 'wifi0' || name === 'radio0') {
			if (!dev2g) dev2g = k;
		} else if (band.indexOf('5') === 0 || band === '2' || hw === '11a' || hw.indexOf('bea') >= 0 || ht.indexOf('80') >= 0 || ht.indexOf('160') >= 0 || name.indexOf('5g') >= 0 || name === 'wifi1' || name === 'radio1') {
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
		if (!found && targetDevice) {
			const prefKey = (network === 'guest' ? 'guest_' : 'default_') + targetDevice;
			if (v[prefKey] && v[prefKey].mode === 'ap' && v[prefKey].ssid) found = v[prefKey];
		}
		return found || {};
	};

	const main2 = pick('lan', dev2g, '2g'), main5 = pick('lan', dev5g, '5g'), main6 = dev6g ? pick('lan', dev6g, '6g') : null, guest2 = pick('guest', dev2g, '2g'), guest5 = pick('guest', dev5g, '5g'), guest6 = dev6g ? pick('guest', dev6g, '6g') : null;
	const mergeWifi=function(a,b,id,kindLabel,c){
		const out=Object.assign({}, c || {}, b || {}, a || {});
		out.id = id;
		out.kind = kindLabel || 'extra';
		out.sec2=(a&&a['.name'])||'';
		out.sec5=(b&&b['.name'])||'';
		out.sec6=(c&&c['.name'])||'';
		out.dev2=(a&&a.device)||dev2g;
		out.dev5=(b&&b.device)||dev5g;
		out.dev6=(c&&c.device)||dev6g;
		out.ssid2=(a&&a.ssid)||'';
		out.ssid5=(b&&b.ssid)||'';
		out.ssid6=(c&&c.ssid)||'';
		out.key=(a&&a.key)||(b&&b.key)||(c&&c.key)||'';

		const r2Disabled = !!(dev2g && v[dev2g] && v[dev2g].disabled === '1');
		const r5Disabled = !!(dev5g && v[dev5g] && v[dev5g].disabled === '1');
		const r6Disabled = !!(dev6g && v[dev6g] && v[dev6g].disabled === '1');

		out.disabled2 = (r2Disabled || !a || !a.ssid || a.disabled === '1') ? '1' : '0';
		out.disabled5 = (r5Disabled || !b || !b.ssid || b.disabled === '1') ? '1' : '0';
		out.disabled6 = (r6Disabled || !c || !c.ssid || c.disabled === '1') ? '1' : '0';

		const anyEnabled = (a && a.ssid && out.disabled2 !== '1') ||
		                   (b && b.ssid && out.disabled5 !== '1') ||
		                   (c && c.ssid && out.disabled6 !== '1');
		out.disabled = anyEnabled ? '0' : '1';
		out.encryption=(b&&b.encryption)||(a&&a.encryption)||(c&&c.encryption)||'sae-mixed';
		out.ssid=out.ssid2||out.ssid5||out.ssid6||out.ssid||'';
		out.split=!!(out.ssid2&&out.ssid5&&out.ssid2!==out.ssid5);
		out.network=(a&&a.network)||(b&&b.network)||(c&&c.network)||'lan';
		out.has2g=!!(a&&a.ssid);
		out.has5g=!!(b&&b.ssid);
		out.has6g=!!(c&&c.ssid);
		return out;
	};
	const hasRadios = devList.length > 0;
	const extrasMap = {};
	Object.keys(v).forEach(function(k){
		const s = v[k] || {};
		if(s['.type'] !== 'wifi-iface' || s.mode !== 'ap' || !s.ssid) return;
		if(k === 'default_radio0' || k === 'default_radio1' || k === 'default_radio2' ||
		   k === 'guest_radio0' || k === 'guest_radio1' || k === 'guest_radio2' ||
		   (dev2g && (k === 'default_' + dev2g || k === 'guest_' + dev2g)) ||
		   (dev5g && (k === 'default_' + dev5g || k === 'guest_' + dev5g)) ||
		   (dev6g && (k === 'default_' + dev6g || k === 'guest_' + dev6g))) return;
		const groupKey = k.replace(/_r[012]$/, '').replace(/_radio[012]$/, '');
		if(!extrasMap[groupKey]) extrasMap[groupKey] = { r0: null, r1: null, r2: null, name: groupKey };
		const band = bandOfSection(s);
		if(band === '2g' || s.device === dev2g) extrasMap[groupKey].r0 = s;
		else if(band === '6g' || s.device === dev6g) extrasMap[groupKey].r2 = s;
		else extrasMap[groupKey].r1 = s;
	});
	const extras = Object.keys(extrasMap).map(function(gk){
		const g = extrasMap[gk];
		return mergeWifi(g.r0, g.r1, gk, 'extra', g.r2);
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
		main: mergeWifi(main2, main5, 'main', 'main', main6),
		guest: mergeWifi(guest2, guest5, 'guest', 'guest', guest6),
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

function getCookie(name) {
	try {
		if (typeof document === 'undefined' || !document.cookie) return null;
		const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + '=([^;]*)'));
		return m ? decodeURIComponent(m[1]) : null;
	} catch(e) {
		return null;
	}
}

function setCookie(name, val, maxAgeSeconds) {
	try {
		if (typeof document === 'undefined') return;
		const maxAge = maxAgeSeconds || 31536000;
		document.cookie = name + '=' + encodeURIComponent(val) + '; max-age=' + maxAge + '; path=/; SameSite=Lax';
	} catch(e) {}
}

const _arkCardStatesCache = {};
let _arkUciCardStatesInitialized = false;
let _saveCardStateTimer = null;

function parseCardStatesString(str) {
	const res = {};
	if (!str || typeof str !== 'string') return res;
	const parts = str.split(',');
	for (let i = 0; i < parts.length; i++) {
		const pair = parts[i].trim();
		if (!pair) continue;
		const colon = pair.indexOf(':');
		if (colon > 0) {
			const k = pair.substring(0, colon).trim();
			const v = pair.substring(colon + 1).trim();
			res[k] = (v === '1' || v === 'true' || v === 'expanded') ? 1 : 0;
		}
	}
	return res;
}

function serializeCardStates(obj) {
	if (!obj || typeof obj !== 'object') return '';
	const pairs = [];
	for (const k in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, k)) {
			pairs.push(k + ':' + (obj[k] ? '1' : '0'));
		}
	}
	return pairs.join(',');
}

function initCardStatesFromUci(equipeDashboardConfig) {
	try {
		const vals = (equipeDashboardConfig && equipeDashboardConfig.values) ? equipeDashboardConfig.values : (equipeDashboardConfig || {});
		const main = vals.main || {};
		const uciStr = main.card_states || '';
		if (uciStr) {
			const parsed = parseCardStatesString(uciStr);
			for (const k in parsed) {
				if (_arkCardStatesCache[k] === undefined) {
					_arkCardStatesCache[k] = parsed[k];
				}
			}
		}
		_arkUciCardStatesInitialized = true;
	} catch(e) {}
}

function getCardAccordionState(cardId, defaultActive) {
	// 1. In-memory cache
	if (_arkCardStatesCache[cardId] !== undefined) {
		return { isExpanded: _arkCardStatesCache[cardId] === 1, hasUserPreference: true };
	}

	// 2. LocalStorage individual key
	if (typeof window !== 'undefined' && window.localStorage) {
		try {
			const saved = window.localStorage.getItem('ark_card_' + cardId);
			if (saved === '1' || saved === 'expanded' || saved === 'true' || saved === true) {
				_arkCardStatesCache[cardId] = 1;
				return { isExpanded: true, hasUserPreference: true };
			} else if (saved === '0' || saved === 'collapsed' || saved === 'false' || saved === false) {
				_arkCardStatesCache[cardId] = 0;
				return { isExpanded: false, hasUserPreference: true };
			}
		} catch(e) {}

		// LocalStorage bulk dictionary
		try {
			const bulk = JSON.parse(window.localStorage.getItem('ark_card_states') || '{}');
			if (bulk && bulk[cardId] !== undefined) {
				const exp = (bulk[cardId] === 1 || bulk[cardId] === true || bulk[cardId] === '1');
				_arkCardStatesCache[cardId] = exp ? 1 : 0;
				return { isExpanded: exp, hasUserPreference: true };
			}
		} catch(e) {}
	}

	// 3. Cookie fallback
	const cookieStr = getCookie('ark_card_states');
	if (cookieStr) {
		const parsed = parseCardStatesString(cookieStr);
		if (parsed[cardId] !== undefined) {
			const exp = (parsed[cardId] === 1);
			_arkCardStatesCache[cardId] = exp ? 1 : 0;
			try {
				if (typeof window !== 'undefined' && window.localStorage) {
					window.localStorage.setItem('ark_card_' + cardId, exp ? '1' : '0');
				}
			} catch(e) {}
			return { isExpanded: exp, hasUserPreference: true };
		}
	}

	// 4. Default active fallback
	return { isExpanded: !!defaultActive, hasUserPreference: false };
}

function saveCardAccordionState(cardId, isExpanded) {
	const val = isExpanded ? 1 : 0;
	_arkCardStatesCache[cardId] = val;

	// 1. LocalStorage
	if (typeof window !== 'undefined' && window.localStorage) {
		try {
			window.localStorage.setItem('ark_card_' + cardId, val ? '1' : '0');
			let bulk = {};
			try { bulk = JSON.parse(window.localStorage.getItem('ark_card_states') || '{}'); } catch(e) {}
			bulk[cardId] = val;
			window.localStorage.setItem('ark_card_states', JSON.stringify(bulk));
		} catch(e) {}
	}

	// 2. Cookie (1 year)
	try {
		const cookieStr = getCookie('ark_card_states') || '';
		const currentObj = parseCardStatesString(cookieStr);
		for (const k in _arkCardStatesCache) {
			currentObj[k] = _arkCardStatesCache[k];
		}
		currentObj[cardId] = val;
		const serialized = serializeCardStates(currentObj);
		setCookie('ark_card_states', serialized, 31536000);
	} catch(e) {}

	// 3. Router UCI (debounced background RPC)
	if (typeof fs !== 'undefined' && typeof fs.exec === 'function') {
		if (_saveCardStateTimer && typeof window !== 'undefined') {
			window.clearTimeout(_saveCardStateTimer);
		}
		const saveTask = function() {
			try {
				fs.exec('/usr/sbin/equipe-dashboard-control', ['card-state-save', cardId, val ? '1' : '0']).catch(function() {});
			} catch(e) {}
		};
		if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
			_saveCardStateTimer = window.setTimeout(saveTask, 300);
		} else {
			saveTask();
		}
	}
}

function setupCardAccordion(options) {
	const cardId = options.id;
	const cardEl = options.cardEl;
	const titleEl = options.titleEl;
	const bodyEl = options.bodyEl;
	const isActive = !!options.isActive;
	const onToggle = options.onToggle;

	const stateInfo = getCardAccordionState(cardId, isActive);
	let isExpanded = stateInfo.isExpanded;
	let hasSavedState = stateInfo.hasUserPreference;

	const labelRecolher = (typeof _t === 'function' ? _t('Recolher painel') : 'Recolher painel');
	const labelExpandir = (typeof _t === 'function' ? _t('Expandir painel') : 'Expandir painel');
	const textRecolher = (typeof _t === 'function' ? _t('Recolher ▴') : 'Recolher ▴');
	const textExpandir = (typeof _t === 'function' ? _t('Expandir ▾') : 'Expandir ▾');

	const expandBtn = E('button', {
		class: 'ex-mini-button ex-accordion-toggle-btn',
		type: 'button',
		'aria-expanded': isExpanded ? 'true' : 'false',
		'aria-label': isExpanded ? labelRecolher : labelExpandir
	}, [isExpanded ? textRecolher : textExpandir]);

	function applyState(expanded, userInitiated) {
		isExpanded = !!expanded;
		if (expandBtn) {
			expandBtn.textContent = isExpanded ? textRecolher : textExpandir;
			if (typeof expandBtn.setAttribute === 'function') {
				expandBtn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
				expandBtn.setAttribute('aria-label', isExpanded ? labelRecolher : labelExpandir);
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
		saveCardAccordionState(cardId, nextState);
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

// /src/modules/lifecycle.js - ARK Router LuCI View Module
const lifecycleMethods = {
	board: {}, countries: [], capabilities: {features:{}}, previous: {}, trafficPrevious: {}, trafficAt: 0, currentData: null, recommendedChannels: null, speedResults: {}, refreshTimer: null, dashboardRoot: null, deviceSortKey: 'total', deviceSortDir: 'desc', starlinkTelemetryTimer: null, starlinkTelemetryStopTimer: null, starlinkTelemetryActive: false, starlinkTelemetryWan: null, starlinkWanOrder: [], starlinkResults: {},
	fetchCapabilities: function(){
		if (typeof window !== 'undefined' && window._arkCapabilities && window._arkCapabilities.features) {
			return Promise.resolve(window._arkCapabilities);
		}
		if (typeof sessionStorage !== 'undefined') {
			try {
				const cached = JSON.parse(sessionStorage.getItem('ark_caps') || '{}');
				if (cached && cached.features && Object.keys(cached.features).length > 0) {
					if (typeof window !== 'undefined') window._arkCapabilities = cached;
					const lang = cached.language || 'pt-br';
					dashboardLanguage = lang;
					fs.exec('/usr/sbin/equipe-dashboard-control', ['features']).then(function(r) {
						try {
							const c = JSON.parse((r && r.stdout) || '{}');
							if (c && c.features) {
								sessionStorage.setItem('ark_caps', JSON.stringify(c));
								if (typeof window !== 'undefined') window._arkCapabilities = c;
							}
						} catch(e) {}
					}).catch(function(){});
					if (typeof loadDashboardLanguage === 'function') {
						return loadDashboardLanguage(lang).then(function() { return cached; });
					}
					return Promise.resolve(cached);
				}
			} catch(e) {}
		}
		return safe(fs.exec('/usr/sbin/equipe-dashboard-control',['features']),{}, 15000).then(function(r){
			try{
				const c=JSON.parse((r&&r.stdout)||'{}');
				if(c && c.features && Object.keys(c.features).length > 0){
					if(typeof window!=='undefined'){
						window._arkCapabilities=c;
						try { sessionStorage.setItem('ark_caps', JSON.stringify(c)); } catch(e){}
					}
					const lang = c.language || 'pt-br';
					dashboardLanguage = lang;
					if (typeof loadDashboardLanguage === 'function') {
						return loadDashboardLanguage(lang).then(function() { return c; });
					}
					return c;
				}
				if(typeof window!=='undefined' && window._arkCapabilities && window._arkCapabilities.features){
					const lang = window._arkCapabilities.language || 'pt-br';
					dashboardLanguage = lang;
					if (typeof loadDashboardLanguage === 'function') {
						return loadDashboardLanguage(lang).then(function() { return window._arkCapabilities; });
					}
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
		const self = this;
		const isApMode = (this.capabilities && this.capabilities.network_mode === 'ap') ||
			(typeof window !== 'undefined' && window._arkCapabilities && window._arkCapabilities.network_mode === 'ap') ||
			(this.currentData && this.currentData.networkConfig && this.currentData.networkConfig.lan && this.currentData.networkConfig.lan.proto === 'dhcp');
		const activeWansList = (this.currentData && (this.currentData.activeWans || getActiveWanList(this.currentData))) || null;
		const activeWansCount = activeWansList ? activeWansList.length : 2;
		const mwanPromise = (!isApMode && activeWansCount > 1)
			? safe(fs.exec('/usr/sbin/equipe-dashboard-control', [ 'mwan-status-fast' ]).then(function(res){
				try {
					const parsed = JSON.parse(res.stdout || '{}');
					if (parsed && parsed.interfaces && Object.keys(parsed.interfaces).length > 0) return parsed;
				} catch(e) {}
				return safe(callMwanStatus(), {});
			}), {})
			: Promise.resolve((this.currentData && this.currentData.mwan) || {});
		const hasNlbwmon = !(this.capabilities && this.capabilities.features && this.capabilities.features.nlbwmon && this.capabilities.features.nlbwmon.active === false);
		const nlbwmonPromise = (!isInitial && hasNlbwmon)
			? safe(fs.exec('/usr/libexec/nlbwmon-action', [ 'download', '-g', 'family,mac,ip', '-o', '-rx_bytes,-tx_bytes' ]).then(function(res) {
				try { return JSON.parse(res.stdout || '{}'); } catch(e) { return { columns: [], data: [] }; }
			}), { columns: [], data: [] })
			: Promise.resolve((this.currentData && this.currentData.traffic) || { columns: [], data: [] });
		const mwanUciPromise = (isApMode || activeWansCount <= 1)
			? Promise.resolve((this.currentData && this.currentData.mwanConfig) || { values: {} })
			: safe(callUciGet('mwan3'), { values: {} });
		return Promise.all([
			safe(callSystemInfo(), {}), safe(callInterfaceDump(), { interface: [] }),
			mwanPromise, safe(callDHCPLeases(), { dhcp_leases: [] }),
			safe(callUciGet('sqm'), { values: {} }), safe(callUciGet('qos_equipe'), { values: {} }), safe(callUciGet('wireless'), { values: {} }), mwanUciPromise, safe(callUciGet('equipe_devices'), { values: {} }), safe(callUciGet('network'), { values: {} }),
			safe(fs.exec('/usr/sbin/equipe-dashboard-control', [ 'lan-status' ]), {}),
			safe(fs.read('/sys/class/thermal/thermal_zone0/temp'), '0'),
			safe(fs.exec('/usr/sbin/equipe-dashboard-control', [ 'system-perf-status' ]), {}),
			nlbwmonPromise,
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
			let lanStatusObj = {};
			try { lanStatusObj = JSON.parse((r[10] && r[10].stdout) || '{}'); } catch(e) {}
			const apUplink = lanStatusObj.uplink_dev || '';
			if (activeWans.length === 0) {
				const lanLive = iface(interfaces, 'lan');
				const lanDevName = lanLive.l3_device || lanLive.device || 'br-lan';
				wanPromises.push(safe(callDeviceStatus(lanDevName),{}).then(function(s){wanDevicesMap['lan']=s;}));
				wanPromises.push(safe(callDeviceStatus('eth0'),{}).then(function(s){wanDevicesMap['eth0']=s;}));
				if (apUplink && apUplink !== lanDevName && apUplink !== 'eth0') {
					wanPromises.push(safe(callDeviceStatus(apUplink),{}).then(function(s){wanDevicesMap[apUplink]=s;}));
				}
			}
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
				(isInitial || self.isEconomicHardware(self.currentData)) ? Promise.resolve({ results: [] }) : safe(callSurvey(topology.survey2), { results: [] }),
				(isInitial || self.isEconomicHardware(self.currentData)) ? Promise.resolve({ results: [] }) : safe(callSurvey(topology.survey5), { results: [] }),
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
				activeWans: activeWans,
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
				apUplink: apUplink,
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
		if (activeWans.length > 0) {
			activeWans.forEach(function(w){
				const dev = (data.wanDevicesMap && data.wanDevicesMap[w.iface]) || (w.iface==='wan'?data.wanDevice:(w.iface==='wan2'?data.wan2Device:{})) || {};
				const stats = dev.statistics || {};
				rx += Number(stats.rx_bytes) || 0;
				tx += Number(stats.tx_bytes) || 0;
			});
		} else {
			// Modo Ponto de Acesso (AP Mode): mede o tráfego do uplink ou bridge
			let lanStatus = {};
			try { lanStatus = JSON.parse((data.lanStatus && data.lanStatus.stdout) || '{}'); } catch(e) {}
			const uplink = lanStatus.uplink_dev || data.apUplink || 'eth0';
			let dev = null;
			if (uplink && data.wanDevicesMap && data.wanDevicesMap[uplink]) {
				dev = data.wanDevicesMap[uplink];
			} else if (uplink && data.lanPorts && data.lanDevices) {
				const idx = data.lanPorts.indexOf(uplink);
				if (idx >= 0) dev = data.lanDevices[idx];
			}
			if (!dev) {
				dev = (data.wanDevicesMap && data.wanDevicesMap['lan']) || {};
			}
			const stats = (dev && dev.statistics) || {};
			rx = Number(stats.rx_bytes) || 0;
			tx = Number(stats.tx_bytes) || 0;
		}
		const ifaceKey = activeWans.length > 0 ? activeWans.map(function(w){return w.iface;}).join('+') : ('ap:' + (data.apUplink || 'lan'));
		if (this.previous.ifaceKey && this.previous.ifaceKey !== ifaceKey) {
			this.previous = { timestamp: data.timestamp, rx: rx, tx: tx, ifaceKey: ifaceKey };
			return { down: 0, up: 0, rx: rx, tx: tx };
		}
		if (this.previous.timestamp && data.timestamp > this.previous.timestamp) {
			const e = (data.timestamp - this.previous.timestamp) / 1000;
			if (e > 0 && e <= 30 && rx >= this.previous.rx && tx >= this.previous.tx) {
				down = (rx - this.previous.rx) * 8 / e;
				up = (tx - this.previous.tx) * 8 / e;
			}
		}
		this.previous = { timestamp: data.timestamp, rx: rx, tx: tx, ifaceKey: ifaceKey };
		return { down: down, up: up, rx: rx, tx: tx };
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
	isEconomicHardware: function(data) {
		const hw = (data && data.hardwareInfo) || (this.currentData && this.currentData.hardwareInfo) || {};
		const cpu = hw.cpu || {};
		const silicon = hw.silicon || {};
		const mem = (data && data.system && data.system.memory) || (this.currentData && this.currentData.system && this.currentData.system.memory) || {};
		const totalMemMb = (Number(mem.total) || 0) / (1024 * 1024);

		if (cpu.cores === 1) return true;
		if (cpu.arch && cpu.arch.indexOf('mips') >= 0) return true;
		if (silicon.class === 'mips_legacy') return true;
		if (cpu.freq_mhz && cpu.freq_mhz < 1000) return true;
		if (totalMemMb > 0 && totalMemMb <= 140) return true;
		return false;
	},
	adaptiveRefreshSeconds: function(data) {
		if (this.isEconomicHardware(data)) {
			return 5;
		}
		if (!this.devicesExpanded()) return 3;
		const mem = (data && data.system && data.system.memory) || {}, total = Number(mem.total) || 0, free = Number(mem.available || mem.free) || 0, mib = 1024 * 1024;
		if (total >= 224 * mib && free >= 96 * mib) return 2;
		if (total >= 96 * mib && free >= 40 * mib) return 2;
		return 3;
	},
	updateRefreshSummary: function(data) {
		const isEco = this.isEconomicHardware(data);
		const sec = this.adaptiveRefreshSeconds(data);
		const suffix = this.devicesExpanded() ? ' • lista aberta' : '';
		let modeTag = '';
		if (isEco) {
			modeTag = ' • modo econômico';
		} else if (data && data.hardwareInfo && data.hardwareInfo.cpu && data.hardwareInfo.cpu.cores >= 4 && sec <= 3) {
			modeTag = ' • modo turbo';
		}
		text('ex-refresh-summary', 'sessão de 12 horas • atualização a cada ' + sec + ' segundo' + (sec === 1 ? '' : 's') + modeTag + suffix);
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
			if (data.hardwareInfo && data.hardwareInfo.ports) {
				const hwPorts = data.hardwareInfo.ports;
				const isWanPort = (port === 'lan5' || port === 'port5' || port === 'eth1' || port === 'wan' || port === 'eth0.2');
				let hw = hwPorts[port] || (isWanPort ? (hwPorts.lan5 || hwPorts.port5 || hwPorts.wan || hwPorts.wan1 || hwPorts.eth1) : null);
				if (!hw && port === 'eth1.1') hw = hwPorts.lan1 || hwPorts.port1;
				if (!hw && port === 'eth1.2') hw = hwPorts.lan2 || hwPorts.port2;
				if (hw && (hw.carrier !== undefined || hw.speed)) {
					dev = Object.assign({}, dev, {
						carrier: !!hw.carrier,
						speed: hw.speed || dev.speed,
						duplex: hw.duplex || dev.duplex
					});
				}
			}
			this.updateLan('ex-lan-'+portDomId(port), dev);
		},this));
		if (isSatelliteOrAp(data)) {
			let lanStatus = {};
			try { lanStatus = JSON.parse((data.lanStatus && data.lanStatus.stdout) || '{}'); } catch(e) {}
			const uplink = lanStatus.uplink_dev || data.apUplink || 'eth0';
			const dev = (data.wanDevicesMap && (data.wanDevicesMap[uplink] || data.wanDevicesMap['eth0'] || data.wanDevicesMap['lan'])) || {};
			const hwPorts = (data.hardwareInfo && data.hardwareInfo.ports) || {};
			const hw = hwPorts[uplink] || hwPorts.eth0 || {};
			const isLinkUp = !!(dev.carrier || hw.carrier || (dev.speed && dev.speed !== '0'));
			const speedStr = (hw.speed || dev.speed || '1000') + ' Mbps';
			const duplexStr = hw.duplex || dev.duplex || 'Full duplex';
			setPill('ex-ap-uplink-status', isLinkUp ? 'online' : 'offline', isLinkUp ? _t('CONECTADO') : _t('SEM CABO'));
			text('ex-ap-uplink-mode', _t('Ponto de Acesso (Ponte L2 transparente)'));
			const gwIp = lanStatus.gateway || (data.networkConfig && data.networkConfig.values && data.networkConfig.values.lan && data.networkConfig.values.lan.gateway) || '192.168.73.1';
			const localIp = (data.networkConfig && data.networkConfig.values && data.networkConfig.values.lan && data.networkConfig.values.lan.ipaddr) || '192.168.73.2';
			text('ex-ap-uplink-gw', gwIp + ' (' + _t('Roteador Mestre') + ')');
			text('ex-ap-uplink-ip', localIp);
			text('ex-ap-uplink-port', (uplink === 'eth0' ? 'Porta 2.5 Gbps (eth0)' : uplink) + ' • ' + (hw.max_speed || '2.5G'));
			text('ex-ap-uplink-link', isLinkUp ? (speedStr + ' • ' + duplexStr) : _t('sem link físico'));
			const stats = dev.statistics || {};
			text('ex-ap-uplink-rx-day', formatBytes(Number(stats.rx_bytes) || 0));
			text('ex-ap-uplink-tx-day', formatBytes(Number(stats.tx_bytes) || 0));
			const uptimeSec = (data.systemInfo && data.systemInfo.uptime) || 0;
			text('ex-ap-uplink-uptime', formatUptime(uptimeSec));
		}
		const mwanRunning=Object.keys(mi).some(function(k){return !!mi[k].running;});
		const activeWanLabels=[];
		activeWans.forEach(function(w){
			const i = iface(data.interfaces, w.iface);
			const m = mi[w.iface];
			const isOnline = mwanRunning ? (m && m.status === 'online') : !!i.up;
			if (isOnline) activeWanLabels.push(w.label);
		});
		if (isSatelliteOrAp(data)) {
			const lanLive = iface(data.interfaces, 'lan');
			const isOnline = !!(lanLive && lanLive.up);
			setPill('ex-global-status', isOnline ? 'online' : 'offline', isOnline ? _t('MODO AP • ATIVO') : _t('SEM CONEXÃO'));
		} else {
			const active = activeWanLabels.length ? activeWanLabels.join(' + ') : 'SEM INTERNET';
			setPill('ex-global-status',active==='SEM INTERNET'?'offline':'online',active+' ATIVA');
		}
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
		const isApLan = isSatelliteOrAp(data) || lanStatus.network_mode === 'ap';
		let dhcpDisplay = '—';
		if (isApLan) {
			dhcpDisplay = 'Desativado (Modo Ponto de Acesso)';
		} else if (lanStatus.dhcp_enabled === false || lanStatus.dhcp_disabled === true) {
			dhcpDisplay = 'Desativado (IP Fixo)';
		} else if (lanStatus.dhcp_start && lanStatus.dhcp_end) {
			dhcpDisplay = lanStatus.dhcp_start + ' → ' + lanStatus.dhcp_end;
		}
		text('ex-lan-ip', lanStatus.ipaddr || '—');
		text('ex-lan-dhcp', dhcpDisplay);
		text('ex-lan-mask', lanStatus.netmask || '—');
		text('ex-lan-dns', Array.isArray(lanStatus.dns) && lanStatus.dns.length ? lanStatus.dns.join('  •  ') : 'Sem DNS fixo');
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
		const igmpActive = !!lanStatus.igmp_snooping;
		const igmpToggle = document.getElementById('ex-lan-igmp-toggle');
		if (igmpToggle && !igmpToggle.disabled) {
			igmpToggle.checked = igmpActive;
		}
		text('ex-lan-igmp-state', igmpActive ? _t('ATIVO') : _t('DESLIGADO'));
		setPill('ex-lan-igmp-pill', igmpActive ? 'online' : 'standby', igmpActive ? _t('ATIVO (PROTEGIDO)') : _t('DESATIVADO'));
		const igmpDescEl = document.getElementById('ex-lan-igmp-desc');
		if (igmpDescEl) {
			igmpDescEl.textContent = igmpActive
				? _t('Ativado • Tráfego multicast (IPTV/AirPlay) filtrado e direcionado apenas aos dispositivos solicitantes, protegendo o Wi-Fi contra saturação.')
				: _t('Desativado • Tráfego multicast transmitido em broadcast para todas as portas e antenas Wi-Fi (pode causar lentidão em streaming/IPTV).');
		}
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
		const tempCrit = (thermalSensors.length && Number(thermalSensors[0].crit_c)) ? Number(thermalSensors[0].crit_c) : 90;
		const tempWarn = (thermalSensors.length && Number(thermalSensors[0].warn_c)) ? Number(thermalSensors[0].warn_c) : 75;
		const isTempCrit = isFinite(temp) && temp >= tempCrit;
		const isTempWarn = isFinite(temp) && temp >= tempWarn;
		text('ex-temperature',isFinite(temp)?temp.toFixed(0)+' °C':(thermalSensors.length?thermalSensors[0].temp_c+' °C':'—'));
		const tempEl=document.getElementById('ex-temperature');if(tempEl&&isFinite(temp)){tempEl.style.color=isTempCrit?'#ef4444':(isTempWarn?'#f59e0b':'');}
		if(isTempCrit){text('ex-temperature-detail',_t('Temperatura crítica'));}
		else if(isTempWarn){text('ex-temperature-detail',_t('Temperatura elevada'));}
		else if(thermalSensors.length>1){text('ex-temperature-detail',thermalSensors.length+' sensores • '+_t('estável'));}
		else if(isFinite(temp)){text('ex-temperature-detail',_t('Sensor de CPU • estável'));}
		else{text('ex-temperature-detail',_t('Sem sensor térmico'));}
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
		const healthWarning=isTempCrit||mu>=85||du>=85||load>=1.5;
		setPill('ex-health-status',healthWarning?'standby':'online',healthWarning?'ATENÇÃO':'NORMAL');
		const qosWanProfiles=sqmWanProfiles(data), qe=qosWanProfiles.some(function(profile){return !!(sqm[profile.section]&&sqm[profile.section].enabled==='1');}), qosToggle=document.getElementById('ex-qos-toggle'), qosToggleState=document.getElementById('ex-qos-toggle-state');
		const isSat = isSatelliteOrAp(data);
		if (isSat) {
			setPill('ex-qos-status', 'standby', 'MESTRE GERENCIA');
			if (qosToggle) { qosToggle.checked = false; qosToggle.disabled = true; qosToggle.title = _t('SQM / CAKE é exclusivo do Roteador Mestre em Modo Ponto de Acesso (AP).'); }
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

// /src/modules/devices.js - ARK Router LuCI View Module
const devicesMethods = {
	renderDevices: function(data, rates) {
		const body=document.getElementById('ex-device-body'); if(!body)return;
		const leases=data.leases.dhcp_leases||[], main=assocMap(data.mainAssoc), guest=assocMap(data.guestAssoc), names=friendlyMap(data.names), hostHints=data.hostHints||{}, seen={};
		let lanStatus={};try{lanStatus=JSON.parse((data.lanStatus&&data.lanStatus.stdout)||'{}');}catch(e){}
		const lanPrefix=prefix24(lanStatus.ipaddr), guestPrefix=prefix24(((values(data.networkConfig).guest)||{}).ipaddr), wifiNames=wifiConfig(data.wireless), mainName=wifiNames.main.ssid||'Rede principal', guestName=wifiNames.guest.ssid||'Visitantes';
		const isSecondaryRouter = isSatelliteOrAp(data);
		const masterGwIp = (lanStatus && (lanStatus.gateway || lanStatus.current_gw)) || '192.168.73.1';

		const dhcpValues = values(data.dhcpConfig);
		const reservedMap = {};
		const reservedNameMap = {};
		Object.keys(dhcpValues).forEach(function(k) {
			const h = dhcpValues[k];
			if (h && h['.type'] === 'host' && h.mac) {
				const macs = Array.isArray(h.mac) ? h.mac : String(h.mac).split(/\s+/);
				macs.forEach(function(m) {
					const u = String(m).toUpperCase();
					if (h.ip) reservedMap[u] = h.ip;
					if (h.name) reservedNameMap[u] = h.name;
				});
			}
		});

		const firewallValues = values(data.firewallConfig);
		const priorityMap = {};
		Object.keys(firewallValues).forEach(function(k) {
			const r = firewallValues[k];
			if (r && r['.type'] === 'rule' && String(r.enabled) === '1' && r.src_mac) {
				const dscp = r.set_dscp || 'EF';
				const macs = Array.isArray(r.src_mac) ? r.src_mac : String(r.src_mac).split(/\s+/);
				macs.forEach(function(m) {
					if (m) priorityMap[String(m).toUpperCase()] = dscp;
				});
			}
		});

		const limitsMap = deviceLimitsMap(data.names);
		const ipv6Map = deviceIpv6Map(data.names, (values(data.equipeDashboardConfig).ipv6||{}).mode || 'dual_stack');
		const parentalMap = deviceParentalMap(data.names);
		const dhcp6Leases = (data.leases && data.leases.dhcp6_leases) || [];
		const dhcp6ActiveMap = {};
		dhcp6Leases.forEach(function(l) {
			if (l.macaddr) dhcp6ActiveMap[String(l.macaddr).toUpperCase()] = true;
			if (l.mac) dhcp6ActiveMap[String(l.mac).toUpperCase()] = true;
		});

		const secRegex = /(ARK[-_]Secund[aá]rio|ARK[-_]Ponto|Ponto[-_]Adicional|Roteador[-_]Secund[aá]rio|secund[aá]rio)/i;

		const isPrivateMac = function(mac) {
			if (!mac) return false;
			const clean = String(mac).replace(/[^0-9A-Fa-f]/g, '');
			if (clean.length < 2) return false;
			const secondChar = clean[1].toUpperCase();
			return (secondChar === '2' || secondChar === '6' || secondChar === 'A' || secondChar === 'E');
		};

		const iotOuiPrefixes = [
			// Espressif Systems (ESP8266 / ESP32 - Tuya, Sonoff, Shelly, Smart Life, WLED, Tasmota, etc.)
			'C4:4F:33', 'C8:2B:96', 'A8:80:55', '2C:D8:DE', '3C:0B:59', 'BC:35:1E', '84:F3:EB', 'DC:4F:22',
			'68:C6:3A', 'A8:E6:21', 'D4:43:8A', '7C:25:DA', '4C:A9:19', '24:4C:AB', '24:0A:C4', '30:AE:A4',
			'80:7D:3A', '84:0D:8E', '94:B5:55', 'A4:CF:12', 'AC:67:B2', 'B4:E6:2D', 'C4:DD:57', 'D8:BC:38',
			'E0:E2:E6', 'E8:68:E7', 'EC:FA:BC', '48:55:19', '40:22:D8', '34:B4:72', '34:94:54', '34:98:7A',
			'30:83:98', '18:FE:34', '10:52:1C', '08:3A:8D', '08:B6:1F', '00:1A:7D', '00:08:22', 'CC:50:E3',
			'CC:7B:5C', '60:01:94', '54:43:B2', '50:02:91', '38:BE:AB', '24:62:AB', '24:DC:C3', '48:3F:DA',
			'48:E7:29', '70:03:9F', '7C:DF:A1', '84:F7:03', 'A4:7B:9D', 'AC:0B:FB', 'B8:D6:1A', 'C4:DE:E2',
			'DC:54:75', 'E0:98:06', 'FC:F5:C4',
			// Tuya Smart Inc.
			'D8:1F:12', '10:2C:6B', '70:89:71', '58:8E:81', '60:A4:23', 'A0:92:08', '44:17:93', '20:F1:B2',
			'D4:D4:DA', '68:57:2D', '1C:90:FF', '2C:AA:8E', '80:4B:50',
			// Midea Smart Home / Carrier AC
			'38:2F:B0', 'AC:69:21', '74:A7:EA',
			// Amazon Echo / Alexa
			'FC:E9:D8', '90:11:95', '40:B4:CD', '44:65:0D', '68:54:FD', '78:E1:03', '88:71:B1', '0C:47:C9',
			'34:D2:70', '50:F5:DA', '68:37:E9', 'CC:9E:A2', '00:FC:8B', '18:74:2E', '38:F7:3D', '6C:56:97',
			'74:75:48', 'A0:02:DC',
			// Google Home / Nest
			'00:1A:11', '30:FD:38', '48:D6:D5', '54:60:09', '64:16:66', 'A4:77:33', 'E4:F0:42', 'F8:0F:41',
			// BroadLink
			'B4:43:0D', '78:0F:77', '34:EA:34', 'EC:0B:AE',
			// Shelly / Allterco
			'E8:DB:84',
			// Sonoff / Itead
			'C0:56:E3', 'EC:EB:D4',
			// Philips Hue
			'00:17:88', 'EC:B5:FA',
			// Xiaomi / Yeelight
			'04:CF:8C', '28:6C:07', '64:90:C1', '7C:49:EB', 'F0:B4:29',
			// Shenzhen iComm Semiconductor (Câmeras Wi-Fi / Smart Home / Doorbells)
			'84:B4:D2', '08:1A:1E', '14:95:69', '20:67:E0', '84:EA:97', '98:17:3C'
		];
		const iotNameRegex = /(?:^|[\s_-])(?:ESP[_-]|TUYA[_-]|midea[_-]|smart|sonoff|shelly|tasmota|wled|zigbee|broadlink|yeelight|home[_-]?assistant|echo|alexa|google[_-]?home|nest[_-]?mini|camera|intelbras|interfone|interruptor|l[aâ]mpada|tomada|fechadura|climatizador|ar[_-]?condicionado|lwip)/i;

		const appleOuiPrefixes = [
			// Apple, Inc. (iPhone, iPad, Mac, Apple TV, Apple Watch)
			'C0:C7:DB', '28:CF:E9', 'A4:83:E7', '00:25:00', '3C:07:54', '40:6C:8F', '70:3E:AC', '8C:85:90', 'F4:0F:24'
		];

		const tvOuiPrefixes = [
			// Samsung Electronics (Smart TVs, Tizen)
			'08:28:02', '32:08:55', '40:16:3B', '78:AB:BB', 'B0:D5:9D', 'B8:BC:5B', 'CC:6E:A4', 'E8:50:8B', 'F4:7B:5E',
			'2C:99:75', '50:85:69', '64:1C:AE', '70:2C:1F', '94:35:0A', 'B4:79:A7', 'E4:7C:F9',
			// LG Electronics (webOS TVs)
			'A8:23:FE', '00:E0:91', '10:F9:6F', '20:3D:66', '3C:CD:36', 'A0:93:47', '64:95:6C', '88:36:6C', 'CC:FA:00',
			// Roku Inc.
			'00:0D:4B', 'B0:EE:45', 'D8:31:34', 'CC:6D:A0', '20:DF:B9', 'AC:AE:19', 'B8:3E:59',
			// Shenzhen Bilian / Fn-Link (TV Boxes Android, Dongles HDMI, Smart Projectors)
			'54:44:A3', '70:C9:4E', 'E4:5F:01', '00:22:6C', '10:A4:BE', '00:0C:43',
			// TCL / Thomson
			'00:E0:4C', '04:8D:38', '20:A6:0C', '44:33:4C', '64:CF:D9',
			// Hisense
			'00:1E:5E', '30:10:E4', '58:2A:F7', '88:E7:A6',
			// Philips TV (TPV Technology)
			'00:09:DF', '00:1A:E9', '08:86:3B', '54:4A:05'
		];
		const tvRegex = /(?:^|[\s_-])(?:TV[-_]|smart[-_]?tv|tizen|webos|bravia|roku|fire[-_]?tv|chromecast|mibox|mi[-_]?box|tv[-_]?box|box[-_]?tv|apple[-_]?tv)/i;

		const printerOuiPrefixes = [
			// HP Inc.
			'C8:5A:CF', '00:1E:0B', '00:9C:02', '10:60:4B', '2C:41:A1', '3C:D9:2B', '94:57:A5',
			// Seiko Epson
			'00:00:48', '00:26:AB', '44:D9:E7', '64:EB:8C', 'AC:18:26',
			// Brother Industries
			'00:80:77', '00:1B:A9', '30:05:5C', '40:B0:34',
			// Canon Inc.
			'00:00:85', '00:1E:8F', '18:0C:AC', '00:15:99', '00:04:00'
		];
		const printerRegex = /(?:^|[\s_-])(?:impressora|printer|deskjet|laserjet|laser|inkjet|epson|brother|ecotank|officetok|print)/i;

		const consoleOuiPrefixes = [
			// Sony Interactive Entertainment (PlayStation)
			'00:04:1F', '00:13:15', '00:15:C1', '00:19:C5', '00:1D:0D', '00:24:8D', '70:9E:29', 'A8:E3:EE', 'BC:60:A7', 'FC:0F:E6',
			// Microsoft (Xbox)
			'00:0D:3A', '00:17:FA', '00:50:F2', '28:18:78', '58:82:A8', '7C:1E:52', '98:5F:D3', 'B4:AE:2B',
			// Nintendo (Switch, Wii)
			'00:09:BF', '00:1B:7A', '00:1F:32', '00:26:59', '40:D2:8A', '70:48:0F', '98:B6:E9', 'E4:17:D8'
		];
		const consoleRegex = /(?:^|[\s_-])(?:playstation|ps4|ps5|xbox|nintendo|switch)/i;
		const pcRegex = /(?:^|[\s_-])(?:macbook|imac|laptop|desktop|notebook|gamer|windows|linux|thinkpad|dell|lenovo|asus|acer|pc[-_])/i;
		const tabletRegex = /(?:^|[\s_-])(?:ipad|tablet|pad[-_]|[_-]pad)/i;
		const phoneRegex = /(?:^|[\s_-])(?:iphone|galaxy|s2[0-9]|s1[0-9]|redmi|xiaomi|motorola|moto[-_]|pixel|zenfone|android|celular|smartphone|phone)/i;

		const detectDeviceCategory = function(mac, name, hostname, isWired, band, ssid, fp) {
			const uMac = String(mac || '').toUpperCase();
			const prefix = uMac.slice(0, 8);
			const n = (name || '') + ' ' + (hostname || '');
			const s = String(ssid || '');
			const vc = String((fp && fp.vendor_class) || '').toLowerCase();

			// 1. DHCP Option 60 (Vendor Class Identifier) - Sinal passivo de altíssima precisão
			if (vc) {
				if (/roku|tizen|webos|firetv|fire_tv|chromecast|appletv|apple_tv|bravia/i.test(vc)) {
					return 'tv';
				}
				if (/playstation|xbox|nintendo/i.test(vc)) {
					return 'console';
				}
				if (/printer|laserjet|deskjet|hewlett-packard|epson|brother|canon/i.test(vc)) {
					return 'printer';
				}
				if (/espressif|tuya|sonoff|shelly|tasmota|wled/i.test(vc)) {
					return 'iot';
				}
				if (/^msft|^windows/i.test(vc)) {
					return 'computer';
				}
				if (/^android/i.test(vc)) {
					if (/tv|box|stick/i.test(n) || /(?:^|[\s_-])(?:tv|streaming)/i.test(s)) return 'tv';
					if (/pad|tablet/i.test(n)) return 'tablet';
					return 'phone';
				}
			}

			// 2. Análise de OUI e Regex de Smart TV / Streaming
			if (tvOuiPrefixes.indexOf(prefix) >= 0 || tvRegex.test(n) || /(?:^|[\s_-])(?:tv|streaming)/i.test(s)) {
				return 'tv';
			}

			// 3. Análise de Smart Home / IoT
			if (iotOuiPrefixes.indexOf(prefix) >= 0 || iotNameRegex.test(n)) {
				return 'iot';
			}

			// 4. Impressora
			if (printerOuiPrefixes.indexOf(prefix) >= 0 || printerRegex.test(n)) {
				return 'printer';
			}

			// 5. Console de Jogos
			if (consoleOuiPrefixes.indexOf(prefix) >= 0 || consoleRegex.test(n)) {
				return 'console';
			}

			// 6. Computador / Laptop
			if (pcRegex.test(n)) {
				return 'computer';
			}

			// 7. Tablet
			if (tabletRegex.test(n)) {
				return 'tablet';
			}

			// 8. Celular / Smartphone
			if (phoneRegex.test(n)) {
				return 'phone';
			}

			// 9. Dispositivos Apple identificados por OUI (padrão portátil / celular se Wi-Fi)
			if (appleOuiPrefixes.indexOf(prefix) >= 0) {
				if (pcRegex.test(n) || isWired) return 'computer';
				if (tabletRegex.test(n)) return 'tablet';
				if (tvRegex.test(n)) return 'tv';
				return 'phone';
			}

			// 10. Cabo de rede sem classificação específica -> Computador
			if (isWired) {
				return 'computer';
			}

			return 'other';
		};

		const buildCategoryBadges = function(d, reservedIp, quickReserveFn) {
			const b = [];
			if (d.category === 'master') {
				b.push(E('span', { class: 'ex-device-badge badge-master-router', style: 'background:rgba(59,130,246,0.18);color:#60a5fa;border:1px solid rgba(59,130,246,0.45);font-weight:750;font-size:0.7rem;padding:2px 7px;border-radius:6px;white-space:nowrap;', title: 'Roteador Principal da residência conectado ao modem/fibra' }, [ '🌐 Roteador Principal' ]));
				return b;
			}
			if (d.category === 'secondary') {
				b.push(E('span', { class: 'ex-device-badge badge-secondary-router', style: 'background:rgba(14,165,233,0.18);color:#38bdf8;border:1px solid rgba(56,189,248,0.45);font-weight:750;font-size:0.7rem;padding:2px 7px;border-radius:6px;white-space:nowrap;', title: 'Roteador Secundário / Ponto Adicional expandindo a rede Wi-Fi e portas LAN' }, [ '📡 Roteador Secundário' ]));
				if (reservedIp) {
					b.push(E('span', { class: 'ex-device-badge badge-reserved', style: 'background:rgba(16,185,129,0.16);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'IP e MAC amarrados e protegidos no DHCP: ' + reservedIp }, [ '🔒 MAC Amarrado (' + reservedIp + ')' ]));
				} else {
					b.push(E('span', { class: 'ex-device-badge badge-unreserved', style: 'background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'O MAC deste roteador secundário ainda não está amarrado no DHCP. Clique em Amarrar MAC para protegê-lo contra conflitos de IP.' }, [ '⚠️ MAC Não Amarrado' ]));
					b.push(E('button', { class: 'ex-mini-button', style: 'background:#0284c7;color:#fff;border-color:#38bdf8;font-weight:700;font-size:0.68rem;padding:2px 7px;border-radius:6px;cursor:pointer;line-height:1;', title: 'Amarrar MAC ao IP ' + (d.ip || '192.168.1.2'), click: L.bind(function(ev) { ev.stopPropagation(); quickReserveFn('secondary', d); }, this) }, ['🔒 Amarrar MAC']));
				}
				return b;
			}

			if (d.category === 'iot') {
				b.push(E('span', { class: 'ex-device-badge badge-iot', style: 'background:rgba(234,179,8,0.18);color:#eab308;border:1px solid rgba(234,179,8,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Dispositivo Smart Home / Automação Residencial (Tuya, Sonoff, Espressif, Alexa, Midea, etc.)' }, [ '💡 Smart Home' ]));
			} else if (d.category === 'printer') {
				b.push(E('span', { class: 'ex-device-badge badge-printer', style: 'background:rgba(168,85,247,0.18);color:#c084fc;border:1px solid rgba(168,85,247,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Impressora / Multifuncional de Rede (HP, Epson, Brother, Canon, etc.)' }, [ '🖨️ Impressora' ]));
			} else if (d.category === 'tv') {
				b.push(E('span', { class: 'ex-device-badge badge-tv', style: 'background:rgba(6,182,212,0.18);color:#22d3ee;border:1px solid rgba(6,182,212,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Smart TV ou Dispositivo de Streaming (Samsung, LG, Roku, Apple TV, Fire TV, Chromecast, etc.)' }, [ '📺 Smart TV' ]));
			} else if (d.category === 'console') {
				b.push(E('span', { class: 'ex-device-badge badge-console', style: 'background:rgba(236,72,153,0.18);color:#f472b6;border:1px solid rgba(236,72,153,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Console de Jogos (PlayStation, Xbox, Nintendo Switch)' }, [ '🎮 Console' ]));
			} else if (d.category === 'computer') {
				b.push(E('span', { class: 'ex-device-badge badge-pc', style: 'background:rgba(99,102,241,0.18);color:#818cf8;border:1px solid rgba(99,102,241,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Computador, Notebook ou PC Gamer' }, [ '💻 Computador' ]));
			} else if (d.category === 'tablet') {
				b.push(E('span', { class: 'ex-device-badge badge-tablet', style: 'background:rgba(100,116,139,0.18);color:#94a3b8;border:1px solid rgba(100,116,139,0.35);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Tablet (iPad, Galaxy Tab, Redmi Pad)' }, [ '📱 Tablet' ]));
			} else if (d.category === 'phone') {
				b.push(E('span', { class: 'ex-device-badge badge-phone', style: 'background:rgba(100,116,139,0.18);color:#94a3b8;border:1px solid rgba(100,116,139,0.35);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Smartphone / Celular' }, [ '📱 Celular' ]));
			}

			if (d.isPrivateMac) {
				b.push(E('span', { class: 'ex-device-badge badge-private-mac', style: 'background:rgba(148,163,184,0.12);color:#94a3b8;border:1px dashed rgba(148,163,184,0.4);font-weight:600;font-size:0.65rem;padding:2px 5px;border-radius:6px;white-space:nowrap;', title: 'Aparelho com MAC aleatório/privado gerado pelo sistema (iOS/Android). Para fixar IP permanente, mude para MAC do dispositivo no aparelho.' }, [ '🎭 MAC Privado' ]));
			}

			if (reservedIp) {
				b.push(E('span', { class: 'ex-device-badge badge-reserved', style: 'background:rgba(16,185,129,0.16);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'IP Fixo Reservado no DHCP: ' + reservedIp }, [ '🔒 IP Fixo' ]));
			} else {
				const isFixedRecommend = (d.category === 'iot' || d.category === 'printer' || d.category === 'tv' || d.category === 'console');
				if (isFixedRecommend) {
					let tip = 'Recomendado fixar o IP deste aparelho para evitar perdas de conexão e comandos.';
					if (d.category === 'iot') tip = 'Automação sem IP fixo. Recomendado fixar para que Alexa/Google não percam o controle ao reiniciar o roteador.';
					else if (d.category === 'printer') tip = 'Impressora sem IP fixo. Recomendado fixar para evitar erro de impressora offline nos computadores.';
					else if (d.category === 'tv') tip = 'Smart TV sem IP fixo. Recomendado fixar para manter espelhamento, DLNA e controle remoto sempre ativos.';
					else if (d.category === 'console') tip = 'Console sem IP fixo. Recomendado fixar para facilitar NAT Aberto / Tipo 2 e direcionamento de portas.';

					b.push(E('span', { class: 'ex-device-badge badge-unreserved', style: 'background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: tip }, [ '⚠️ IP Dinâmico' ]));
					if (d.ip && d.ip !== '—') {
						b.push(E('button', { class: 'ex-mini-button', style: 'background:#eab308;color:#0f172a;border-color:#ca8a04;font-weight:750;font-size:0.68rem;padding:2px 7px;border-radius:6px;cursor:pointer;line-height:1;', title: 'Fixar este IP (' + d.ip + ') no DHCP permanentemente', click: L.bind(function(ev) { ev.stopPropagation(); quickReserveFn('iot', d); }, this) }, ['🔒 Fixar IP']));
					}
				}
			}
			return b;
		};

		const deviceWifiInfo = function(mac, ip) {
			const a = main[mac] || guest[mac];
			const isGuest = !!guest[mac] || (guestPrefix && String(ip || '').indexOf(guestPrefix) === 0);
			if (a) {
				const is5G = (a.band === '5g') || (a.bandLabel === '5 GHz') ||
					(a.ifname && (a.ifname.indexOf('phy1') >= 0 || a.ifname.indexOf('radio1') >= 0 || a.ifname.indexOf('5g') >= 0 || a.ifname.indexOf('wlan1') >= 0)) ||
					(a.rx && (a.rx.mhz >= 80 || a.rx.vht)) || (a.tx && (a.tx.mhz >= 80 || a.tx.vht));
				const is6G = (a.band === '6g') || (a.bandLabel === '6 GHz') ||
					(a.rx && a.rx.mhz === 320) || (a.tx && a.tx.mhz === 320);
				const band = is6G ? '6g' : (is5G ? '5g' : '2g');
				const bandLabel = is6G ? '6 GHz' : (is5G ? '5 GHz' : '2,4 GHz');
				const defaultMainSsid = is5G ? (wifiNames.main.ssid5 || wifiNames.main.ssid || 'CASA_ARK_5G') : (wifiNames.main.ssid2 || wifiNames.main.ssid || 'CASA_ARK');
				const ssid = a.ssid || (isGuest ? guestName : defaultMainSsid);
				return {
					isWifi: true,
					ssid: ssid,
					band: band,
					bandLabel: bandLabel,
					signal: a.signal,
					isGuest: isGuest,
					network: ssid
				};
			}
			const wiredNet = isGuest ? (guestName + ' / Cabo') : 'Cabo / LAN';
			return {
				isWifi: false,
				ssid: '',
				band: '',
				bandLabel: '',
				signal: null,
				isGuest: isGuest,
				network: wiredNet
			};
		};
		const renderNetworkCell = function(d) {
			if (d.isMaster) {
				return E('div', { class: 'ex-net-info', style: 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;' }, [
					E('strong', { style: 'font-weight:600;color:#38bdf8;' }, ['Enlace Mesh / Mestre']),
					E('span', { class: 'ex-device-badge badge-wifi-50', style: 'background:rgba(56,189,248,0.18);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;' }, ['Backhaul'])
				]);
			}
			if (d.isWifi) {
				const is5G = (d.band === '5g');
				const bandText = d.bandLabel || (is5G ? '5 GHz' : '2,4 GHz');
				const badgeStyle = is5G
					? 'background:rgba(59,130,246,0.18);color:#60a5fa;border:1px solid rgba(59,130,246,0.35);'
					: 'background:rgba(245,158,11,0.18);color:#f59e0b;border:1px solid rgba(245,158,11,0.35);';
				const wifiDisplayName = isSecondaryRouter ? ((d.ssid || 'Wi-Fi') + ' (Neste Ponto)') : (d.ssid || d.network || 'Wi-Fi');
				const children = [
					E('strong', { style: 'font-weight:600;color:var(--ex-text);' }, [wifiDisplayName]),
					E('span', {
						class: 'ex-device-badge ' + (is5G ? 'badge-wifi-50' : 'badge-wifi-24'),
						style: badgeStyle + 'font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;'
					}, [bandText])
				];
				if (d.signal != null) {
					children.push(E('span', { class: 'ex-muted', style: 'font-size:0.75rem;font-variant-numeric:tabular-nums;white-space:nowrap;' }, ['• ' + d.signal + ' dBm']));
				}
				return E('div', { class: 'ex-net-info', style: 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;' }, children);
			} else {
				const wiredLabel = isSecondaryRouter ? 'Rede Mesh / Roteador Mestre' : (d.network || 'Cabo / LAN');
				const badgeText = isSecondaryRouter ? 'Mesh / Mestre' : 'Cabo';
				return E('div', { class: 'ex-net-info', style: 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;' }, [
					E('strong', { style: 'font-weight:600;color:var(--ex-text);' }, [wiredLabel]),
					E('span', {
						class: 'ex-device-badge badge-cabo',
						style: 'background:rgba(148,163,184,0.15);color:#94a3b8;border:1px solid rgba(148,163,184,0.3);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;'
					}, [badgeText])
				]);
			}
		};
		// Parse ARP table (/proc/net/arp) first to find active wired/LAN devices and dead ARPs
		const arpMap = {};
		const arpDeadMap = {};
		const arpText = String(data.arpTable || '');
		if (arpText) {
			const arpLines = arpText.split('\n');
			for (let i = 1; i < arpLines.length; i++) {
				const cols = arpLines[i].trim().split(/\s+/);
				if (cols.length >= 6) {
					const aIp = cols[0];
					const aFlags = cols[2];
					const aMac = String(cols[3] || '').toUpperCase();
					const aDev = cols[5];
					if (aMac && aMac !== '00:00:00:00:00:00' && aIp !== lanStatus.ipaddr) {
						if (aFlags === '0x2') {
							arpMap[aMac] = { ip: aIp, device: aDev };
						} else if (aFlags === '0x0') {
							arpDeadMap[aMac] = true;
						}
					}
				}
			}
		}

		let staleLeasesCount = 0;
		const devices=[];
		leases.forEach(function(l) {
			const mac=String(l.macaddr||'').toUpperCase();
			if(!mac||seen[mac] || (l.ipaddr && l.ipaddr.indexOf('169.254.') === 0))return;

			// Check if device is genuinely active / online:
			// 1. Actively associated with Wi-Fi (main or guest)
			// 2. Active in ARP table (flag 0x2)
			// 3. Actively transmitting / receiving packets right now
			const isWifi = !!(main[mac] || guest[mac]);
			const isSecDev = secRegex.test(l.hostname || '') || secRegex.test(names[mac] || '') || secRegex.test(reservedNameMap[mac] || '');
			const isWired = !!(arpMap[mac]) || isSecDev || (rates[mac] && ((rates[mac].rx || 0) > 0 || (rates[mac].tx || 0) > 0));

			if (!isWifi && !isWired) {
				// Device disconnected or changed MAC address (ghost / stale lease)
				staleLeasesCount++;
				return;
			}

			seen[mac]=1;
			const w = deviceWifiInfo(mac, l.ipaddr);
			devices.push({
				mac: mac,
				ip: l.ipaddr || '—',
				name: names[mac] || l.hostname || 'Dispositivo sem nome',
				hostname: l.hostname || '',
				network: w.network,
				ssid: w.ssid,
				band: w.band,
				bandLabel: w.bandLabel,
				isWifi: w.isWifi,
				guest: w.isGuest,
				signal: w.signal,
				rate: rates[mac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
			});
		});
		Object.keys(main).concat(Object.keys(guest)).forEach(function(mac) {
			if(seen[mac])return;
			seen[mac]=1;
			const w = deviceWifiInfo(mac, '');
			const hName = (hostHints[mac] || {}).name || '';
			let fallbackIp = (arpMap[mac] && arpMap[mac].ip) || '—';
			if (fallbackIp && fallbackIp.indexOf('169.254.') === 0) fallbackIp = '—';
			devices.push({
				mac: mac,
				ip: fallbackIp,
				name: names[mac] || hName || 'Dispositivo sem nome',
				hostname: hName,
				network: w.network,
				ssid: w.ssid,
				band: w.band,
				bandLabel: w.bandLabel,
				isWifi: true,
				guest: w.isGuest,
				signal: w.signal,
				rate: rates[mac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
			});
		});

		// Include active devices discovered via ARP on LAN
		Object.keys(arpMap).forEach(function(mac) {
			if (seen[mac]) return;
			const arpInfo = arpMap[mac];
			const devIp = arpInfo.ip;
			if (!devIp || devIp.indexOf('169.254.') === 0) return;
			const isLan = (lanPrefix && devIp.indexOf(lanPrefix) === 0) || (arpInfo.device === 'br-lan');
			const isGuest = !!(guestPrefix && devIp.indexOf(guestPrefix) === 0);
			if (!isLan && !isGuest) return;

			seen[mac] = 1;
			const hint = hostHints[mac] || {};
			const devName = names[mac] || hint.name || reservedNameMap[mac] || 'Dispositivo sem nome';
			const w = deviceWifiInfo(mac, devIp);
			devices.push({
				mac: mac,
				ip: devIp || '—',
				name: devName,
				hostname: hint.name || '',
				network: w.network,
				ssid: w.ssid,
				band: w.band,
				bandLabel: w.bandLabel,
				isWifi: w.isWifi,
				guest: isGuest,
				signal: w.signal,
				rate: rates[mac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
			});
		});

		// Include active wired devices discovered via deviceStations telemetry
		const devStationsWired = (data.deviceStations && data.deviceStations.wired) || [];
		devStationsWired.forEach(function(d) {
			const uMac = String(d.mac || '').toUpperCase();
			if (!uMac || seen[uMac]) return;
			seen[uMac] = 1;
			const hint = hostHints[uMac] || {};
			const devName = names[uMac] || hint.name || reservedNameMap[uMac] || d.name || 'Aparelho Cabeado';
			const w = deviceWifiInfo(uMac, d.ip);
			devices.push({
				mac: uMac,
				ip: d.ip || '—',
				name: devName,
				hostname: hint.name || '',
				network: w.network,
				ssid: w.ssid,
				band: w.band,
				bandLabel: w.bandLabel,
				isWifi: false,
				guest: false,
				signal: null,
				rate: rates[uMac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
			});
		});

		// Include static DHCP hosts only if they are genuinely online right now
		Object.keys(dhcpValues).forEach(function(k) {
			const h = dhcpValues[k];
			if (!h || h['.type'] !== 'host' || !h.mac || !h.ip) return;
			const macs = Array.isArray(h.mac) ? h.mac : String(h.mac).split(/\s+/);
			macs.forEach(function(m) {
				const mac = String(m || '').toUpperCase();
				if (!mac || seen[mac]) return;
				const devIp = h.ip;
				if (!devIp || devIp.indexOf('169.254.') === 0) return;
				const isLan = (lanPrefix && devIp.indexOf(lanPrefix) === 0);
				const isGuest = !!(guestPrefix && devIp.indexOf(guestPrefix) === 0);
				if (!isLan && !isGuest) return;
				const isWifi = !!(main[mac] || guest[mac]);
				const isSecDev = secRegex.test(h.name || '') || secRegex.test(names[mac] || '') || secRegex.test(reservedNameMap[mac] || '');
				const isWired = !!(arpMap[mac]) || isSecDev || (rates[mac] && ((rates[mac].rx || 0) > 0 || (rates[mac].tx || 0) > 0));
				if (isWifi || isWired) {
					seen[mac] = 1;
					const hint = hostHints[mac] || {};
					const devName = names[mac] || hint.name || h.name || 'Dispositivo sem nome';
					const w = deviceWifiInfo(mac, devIp);
					devices.push({
						mac: mac,
						ip: devIp,
						name: devName,
						hostname: hint.name || h.name || '',
						network: w.network,
						ssid: w.ssid,
						band: w.band,
						bandLabel: w.bandLabel,
						isWifi: w.isWifi,
						guest: isGuest,
						signal: w.signal,
						rate: rates[mac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
					});
				}
			});
		});
		const fingerprints = data.deviceFingerprints || {};
		devices.forEach(function(d) {
			if (isSecondaryRouter && d.ip && (d.ip === masterGwIp || d.ip === '192.168.73.1')) {
				d.isMaster = true;
				d.name = 'Roteador Principal (Gateway)';
				d.category = 'master';
				return;
			}
			const fp = fingerprints[d.mac] || {};
			if ((!d.name || d.name === 'Dispositivo sem nome') && fp.hostname) {
				d.name = fp.hostname;
				d.hostname = fp.hostname;
			}
			d.isSecondary = secRegex.test(d.name) || secRegex.test(reservedNameMap[d.mac] || '') || secRegex.test(d.hostname || '');
			d.category = d.isSecondary ? 'secondary' : detectDeviceCategory(d.mac, d.name, d.hostname, !d.isWifi, d.band, d.ssid || d.network, fp);
			d.fingerprint = fp;
			d.isIot = (d.category === 'iot');
			d.isPrivateMac = isPrivateMac(d.mac);
			if (!d.name || d.name === 'Dispositivo sem nome') {
				const uPrefix = String(d.mac || '').toUpperCase().slice(0, 8);
				if (['84:B4:D2', '08:1A:1E', '14:95:69', '20:67:E0', '84:EA:97', '98:17:3C'].indexOf(uPrefix) >= 0) {
					d.name = 'Câmera Wi-Fi / Smart';
				} else if (appleOuiPrefixes.indexOf(uPrefix) >= 0) {
					d.name = d.category === 'computer' ? 'Computador Mac' : (d.category === 'tablet' ? 'iPad' : 'Dispositivo Apple');
				}
			}
		});
		this.sortDevices(devices);
		const existingRows = body.querySelectorAll('tr[data-mac]');
		const nowTime = Date.now();
		const force = !!this.forceDeviceReorder;
		this.forceDeviceReorder = false;

		const newOrder = devices.map(function(d){ return d.mac; }).join(',');
		const currentOrder = Array.prototype.map.call(existingRows, function(r){ return r.getAttribute('data-mac'); }).join(',');
		const orderChanged = (newOrder !== currentOrder);

		// Se o usuário ordenou manualmente (force), reordena imediatamente.
		// Em 'Nome' e 'Total', se a ordem mudou, reordena imediatamente (zero delay).
		// Se a ordem física não mudou, apenas atualiza os números in-place para desempenho.
		// Somente em 'Agora' (velocidade) seguramos 4 segundos para amortecer oscilações de pacotinhos.
		const shouldKeepInPlace = !force && existingRows.length > 0 && existingRows.length === devices.length && (
			!orderChanged ||
			(this.deviceSortKey === 'now' && (nowTime - (this.lastDeviceReorderTime || 0)) < 4000)
		);

		if (shouldKeepInPlace) {
			devices.forEach(L.bind(function(d) {
				const row = body.querySelector('tr[data-mac="' + d.mac + '"]');
				if (row) {
					const downEl = row.querySelector('.ex-rate-cell .down');
					if (downEl) downEl.textContent = '↓ ' + formatRate(d.rate.rx);
					const upEl = row.querySelector('.ex-rate-cell .up');
					if (upEl) upEl.textContent = '↑ ' + formatRate(d.rate.tx);
					const totEl = row.querySelector('.ex-total-cell');
					if (totEl) {
						const tot = (Number(d.rate.totalRx) || 0) + (Number(d.rate.totalTx) || 0);
						totEl.textContent = tot > 0 ? formatBytes(tot) : '—';
					}
					const reservedIp = reservedMap[d.mac];
					const prioDscp = priorityMap[d.mac];
					const lim = limitsMap[d.mac];
					const par = parentalMap[d.mac];
					const quickReserveFn = L.bind(function(type, dev) {
						if (type === 'secondary') this.quickReserveSecondary(dev);
						else this.quickReserveIot(dev);
					}, this);
					const badges = buildCategoryBadges(d, reservedIp, quickReserveFn);
					if (prioDscp === 'EF' || prioDscp === 'AF41') {
						badges.push(E('span', { class: 'ex-device-badge badge-gamer', title: 'Fila Gamer / Prioridade Máxima (AF41)' }, [ '🎮 Gamer' ]));
					} else if (prioDscp === 'AF31' || prioDscp === 'AF42') {
						badges.push(E('span', { class: 'ex-device-badge badge-video', title: 'Fila de Vídeo / Multimídia (AF31)' }, [ '📺 Vídeo' ]));
					}
					if (lim && lim.enabled && (lim.down > 0 || lim.up > 0)) {
						const downStr = lim.down > 0 ? lim.down + 'M↓' : '';
						const upStr = lim.up > 0 ? lim.up + 'M↑' : '';
						const limText = [downStr, upStr].filter(Boolean).join(' / ');
						const bypassTip = lim.lanBypass ? ' (Rede Local Livre)' : ' (Intranet Limitada)';
						badges.push(E('span', { class: 'ex-device-badge badge-limited', title: 'Limite de Banda Ativo: ' + limText + bypassTip }, [ '🛑 ' + limText ]));
					}
					if (ipv6Map[d.mac] || dhcp6ActiveMap[d.mac]) {
						badges.push(E('span', { class: 'ex-device-badge badge-ipv6', style: 'background:rgba(16,185,129,0.16);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: ipv6Map[d.mac] ? 'IPv6 Permitido para este aparelho' : 'IPv6 Ativo' }, [ '⚡ IPv6' ]));
					}
					if (this.dmzActive && ((this.dmzDestIp && this.dmzDestIp === d.ip) || (this.dmzMac && this.dmzMac === d.mac))) {
				badges.push(E('span', { class: 'ex-device-badge badge-dmz', style: 'background:rgba(244,63,94,0.18);color:#f43f5e;border:1px solid rgba(244,63,94,0.4);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Zona Desmilitarizada (DMZ): Todas as portas da WAN direcionadas para este dispositivo' }, [ '🎯 DMZ Ativa' ]));
			}
			if (par && par.mode === 'bypass') {
						badges.push(E('span', { class: 'ex-device-badge badge-bypass', style: 'background:rgba(59,130,246,0.16);color:#60a5fa;border:1px solid rgba(59,130,246,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Bypass AdGuard: DNS liberado direto para a Internet (1.1.1.1) sem bloqueio de anúncios ou filtros' }, [ '⚡ Bypass AdGuard' ]));
					} else if (par && par.mode === 'custom') {
						badges.push(E('span', { class: 'ex-device-badge badge-parental', style: 'background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Filtro Individual / Parental ativo para este aparelho' }, [ '🛡️ Filtro Ativo' ]));
					}
					const nameRowEl = row.querySelector('.ex-device-name-row');
					if (nameRowEl) {
						nameRowEl.replaceChildren.apply(nameRowEl, [ E('strong', {}, [d.name]) ].concat(badges));
					}
					const wifiMeta = d.isWifi ? (' • ' + (d.ssid || 'Wi-Fi') + ' (' + (d.bandLabel || (d.band === '5g' ? '5 GHz' : '2,4 GHz')) + ')') : '';
					const fpMeta = (d.fingerprint && d.fingerprint.vendor_class) ? (' • ' + d.fingerprint.vendor_class) : '';
					const metaEl = row.querySelector('.ex-device-meta');
					if (metaEl) {
						metaEl.textContent = d.ip + ' • ' + d.mac + (reservedIp && reservedIp !== d.ip ? ' (Fixo: ' + reservedIp + ')' : '') + wifiMeta + fpMeta;
					}
					const netEl = row.querySelector('.ex-net-cell');
					if (netEl) {
						netEl.replaceChildren(renderNetworkCell(d));
					}
				}
			}, this));
			const localWifiCount = devices.filter(function(x){ return x.isWifi; }).length;
			if (isSecondaryRouter) {
				text('ex-device-count', localWifiCount + ' neste ponto • ' + devices.length + ' na rede');
			} else {
				text('ex-device-count', devices.length + ' conectado' + (devices.length === 1 ? '' : 's'));
			}
			const flushBtn = document.getElementById('ex-device-flush-btn');
			if (flushBtn) {
				if (staleLeasesCount > 0) {
					flushBtn.style.display = 'inline-flex';
					flushBtn.textContent = '🧹 ' + translateText('Limpar inativos') + ' (' + staleLeasesCount + ')';
				} else {
					flushBtn.style.display = 'none';
				}
			}
			this.updateSecondaryBanner(devices, reservedMap);
			return;
		}

		this.lastDeviceReorderTime = nowTime;
		body.replaceChildren();
		devices.forEach(L.bind(function(d) {
			const reservedIp = reservedMap[d.mac];
			const prioDscp = priorityMap[d.mac];
			const lim = limitsMap[d.mac];
			const par = parentalMap[d.mac];
			const quickReserveFn = L.bind(function(type, dev) {
				if (type === 'secondary') this.quickReserveSecondary(dev);
				else this.quickReserveIot(dev);
			}, this);
			const badges = buildCategoryBadges(d, reservedIp, quickReserveFn);
			if (prioDscp === 'EF' || prioDscp === 'AF41') {
				badges.push(E('span', { class: 'ex-device-badge badge-gamer', title: 'Fila Gamer / Prioridade Máxima (AF41)' }, [ '🎮 Gamer' ]));
			} else if (prioDscp === 'AF31' || prioDscp === 'AF42') {
				badges.push(E('span', { class: 'ex-device-badge badge-video', title: 'Fila de Vídeo / Multimídia (AF31)' }, [ '📺 Vídeo' ]));
			}
			if (lim && lim.enabled && (lim.down > 0 || lim.up > 0)) {
				const downStr = lim.down > 0 ? lim.down + 'M↓' : '';
				const upStr = lim.up > 0 ? lim.up + 'M↑' : '';
				const limText = [downStr, upStr].filter(Boolean).join(' / ');
				const bypassTip = lim.lanBypass ? ' (Rede Local Livre)' : ' (Intranet Limitada)';
				badges.push(E('span', { class: 'ex-device-badge badge-limited', title: 'Limite de Banda Ativo: ' + limText + bypassTip }, [ '🛑 ' + limText ]));
			}
			if (ipv6Map[d.mac] || dhcp6ActiveMap[d.mac]) {
				badges.push(E('span', { class: 'ex-device-badge badge-ipv6', style: 'background:rgba(16,185,129,0.16);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: ipv6Map[d.mac] ? 'IPv6 Permitido para este aparelho' : 'IPv6 Ativo' }, [ '⚡ IPv6' ]));
			}
			if (par && par.mode === 'bypass') {
				badges.push(E('span', { class: 'ex-device-badge badge-bypass', style: 'background:rgba(59,130,246,0.16);color:#60a5fa;border:1px solid rgba(59,130,246,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Bypass AdGuard: DNS liberado direto para a Internet (1.1.1.1) sem bloqueio de anúncios ou filtros' }, [ '⚡ Bypass AdGuard' ]));
			} else if (par && par.mode === 'custom') {
				badges.push(E('span', { class: 'ex-device-badge badge-parental', style: 'background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Filtro Individual / Parental ativo para este aparelho' }, [ '🛡️ Filtro Ativo' ]));
			}

			const nameRow = E('div', { class: 'ex-device-name-row' }, [
				E('strong', {}, [d.name])
			].concat(badges));

			const wifiMeta = d.isWifi ? (' • ' + (d.ssid || 'Wi-Fi') + ' (' + (d.bandLabel || (d.band === '5g' ? '5 GHz' : '2,4 GHz')) + ')') : '';
			const fpMeta = (d.fingerprint && d.fingerprint.vendor_class) ? (' • ' + d.fingerprint.vendor_class) : '';
			const metaText = d.ip + ' • ' + d.mac + (reservedIp && reservedIp !== d.ip ? ' (Fixo: ' + reservedIp + ')' : '') + wifiMeta + fpMeta;
			const totalBytes = (Number(d.rate.totalRx) || 0) + (Number(d.rate.totalTx) || 0);

			const tr=E('tr',{'data-mac':d.mac},[
				E('td',{},[nameRow, E('small',{class:'ex-device-meta'},[metaText])]),
				E('td',{'class':'ex-hide-mobile ex-net-cell'},[renderNetworkCell(d)]),
				E('td',{'class':'ex-rate-cell'},[
					E('span',{class:'down'},['↓ '+formatRate(d.rate.rx)]),
					E('span',{class:'up'},['↑ '+formatRate(d.rate.tx)]),
					totalBytes > 0 ? E('span',{class:'ex-rate-total ex-show-mobile'},['Σ ' + formatBytes(totalBytes)]) : ''
				]),
				E('td',{'class':'ex-total-cell ex-hide-mobile',style:'font-weight:600;font-variant-numeric:tabular-nums;'},[totalBytes > 0 ? formatBytes(totalBytes) : '—']),
				E('td',{'class':'ex-device-action'},[
					d.isMaster ? E('a', {
						class: 'ex-mini-button',
						href: 'http://' + (d.ip || '192.168.73.1') + '/',
						target: '_blank',
						title: 'Abrir Painel do Roteador Principal (Gateway)',
						style: 'text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-right:4px;background:rgba(59,130,246,0.18);border-color:#3b82f6;color:#60a5fa;font-weight:700;'
					}, [
						E('span', { class: 'ex-hide-mobile' }, ['🌐 Painel Mestre']),
						E('span', { class: 'ex-show-mobile' }, ['🌐'])
					]) : '',
					d.isSecondary ? E('a', {
						class: 'ex-mini-button',
						href: 'http://' + (d.ip || '192.168.1.2') + '/',
						target: '_blank',
						title: 'Abrir Painel do Roteador Secundário',
						style: 'text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-right:4px;background:rgba(14,165,233,0.18);border-color:#38bdf8;color:#38bdf8;font-weight:700;'
					}, [
						E('span', { class: 'ex-hide-mobile' }, ['🌐 Painel']),
						E('span', { class: 'ex-show-mobile' }, ['🌐'])
					]) : '',
					E('button',{'class':'ex-mini-button','title':'Configurar dispositivo','click':L.bind(this.configureDevice,this,d)},[
						E('span',{'class':'ex-hide-mobile'},['Configurar']),
						E('span',{'class':'ex-show-mobile'},['⚙️'])
					])
				])
			]);
			body.appendChild(tr);
		},this));
		this.devices = devices;
		this.updateSecondaryBanner(devices, reservedMap);
		const localWifiCountFinal = devices.filter(function(x){ return x.isWifi; }).length;
		if (isSecondaryRouter) {
			text('ex-device-count', localWifiCountFinal + ' neste ponto • ' + devices.length + ' na rede');
		} else {
			text('ex-device-count', devices.length + ' conectado' + (devices.length === 1 ? '' : 's'));
		}
		const flushBtn = document.getElementById('ex-device-flush-btn');
		if (flushBtn) {
			if (staleLeasesCount > 0) {
				flushBtn.style.display = 'inline-flex';
				flushBtn.textContent = '🧹 ' + translateText('Limpar inativos') + ' (' + staleLeasesCount + ')';
			} else {
				flushBtn.style.display = 'none';
			}
		}
		const empty=document.getElementById('ex-device-empty'); if(empty)empty.style.display=devices.length?'none':'';
	},
	sortDevices: function(devices) {
		const key=this.deviceSortKey||'total', dir=this.deviceSortDir||'desc', factor=dir==='asc'?1:-1;
		const metric=function(d){
			if(key==='name')return String(d.name||'').toLocaleLowerCase();
			if(key==='total')return (Number(d.rate.totalRx)||0)+(Number(d.rate.totalTx)||0);
			return (Number(d.rate.rx)||0)+(Number(d.rate.tx)||0);
		};
		devices.sort(function(a,b){
			const av=metric(a), bv=metric(b);
			if(typeof av==='string'||typeof bv==='string'){
				const cmp=String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});
				return cmp*factor || String(a.mac).localeCompare(String(b.mac));
			}
			return ((av>bv)?1:(av<bv?-1:0))*factor || String(a.name||'').localeCompare(String(b.name||''),undefined,{numeric:true,sensitivity:'base'});
		});
	},
	setDeviceSort: function(key) {
		this.deviceSortKey = key || 'total';
		if (this.deviceSortKey === 'name') {
			this.deviceSortDir = 'asc';
		} else {
			this.deviceSortDir = 'desc';
		}
		const dirBtn = document.getElementById('ex-device-sort-dir');
		if (dirBtn) {
			if (this.deviceSortKey === 'name') {
				dirBtn.textContent = this.deviceSortDir === 'asc' ? 'A → Z' : 'Z → A';
			} else {
				dirBtn.textContent = this.deviceSortDir === 'desc' ? 'Maior primeiro' : 'Menor primeiro';
			}
		}
		this.forceDeviceReorder = true;
		this.lastDeviceReorderTime = 0;
		if (this.currentData) this.renderDevices(this.currentData, this.lastDeviceRates || this.deviceRates(this.currentData));
	},
	toggleDeviceSortDirection: function(button) {
		this.deviceSortDir = this.deviceSortDir === 'asc' ? 'desc' : 'asc';
		if (button) {
			if (this.deviceSortKey === 'name') {
				button.textContent = this.deviceSortDir === 'asc' ? 'A → Z' : 'Z → A';
			} else {
				button.textContent = this.deviceSortDir === 'desc' ? 'Maior primeiro' : 'Menor primeiro';
			}
		}
		this.forceDeviceReorder = true;
		this.lastDeviceReorderTime = 0;
		if (this.currentData) this.renderDevices(this.currentData, this.lastDeviceRates || this.deviceRates(this.currentData));
	},
	quickReserveSecondary: function(d) {
		const targetIp = (d.ip && d.ip !== '—') ? d.ip : '192.168.1.2';
		const targetName = d.name || 'ARK-Secundario';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['device-reserve-secondary', d.mac, targetIp, targetName]).then(L.bind(function(r) {
			ui.addNotification(null, E('p', {}, [
				'🔒 MAC ', E('strong', {}, [d.mac]), ' amarrado com sucesso ao IP ', E('strong', {}, [targetIp]), '! Nenhum outro aparelho receberá este IP.'
			]), 'info');
			window.setTimeout(function() {
				window.location.reload();
			}, 1500);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', {}, ['Erro ao amarrar MAC: ' + (e.message || e)]), 'danger');
		});
	},
	quickReserveIot: function(d) {
		const targetIp = (d.ip && d.ip !== '—') ? d.ip : '';
		if (!targetIp) {
			ui.addNotification(null, E('p', {}, ['Não foi possível identificar o IP atual do dispositivo.']), 'warning');
			return;
		}
		let defaultPrefix = 'Smart-';
		if (d.category === 'tv') defaultPrefix = 'TV-';
		else if (d.category === 'printer') defaultPrefix = 'Impressora-';
		else if (d.category === 'console') defaultPrefix = 'Console-';
		else if (d.category === 'computer') defaultPrefix = 'PC-';
		const rawName = (d.name && d.name !== 'Dispositivo sem nome') ? d.name : (defaultPrefix + String(d.mac).slice(-5).replace(':', ''));
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['device-reserve-quick', d.mac, targetIp, rawName]).then(L.bind(function(r) {
			if (r.code !== 0) {
				throw new Error(r.stderr || 'Falha ao fixar IP no DHCP');
			}
			let catLabel = 'Dispositivos de automação e assistentes (Alexa/Google)';
			if (d.category === 'printer') catLabel = 'Impressoras de rede';
			else if (d.category === 'tv') catLabel = 'Smart TVs e aparelhos de streaming';
			else if (d.category === 'console') catLabel = 'Consoles de videogame';
			else if (d.category === 'computer') catLabel = 'Computadores e servidores';
			ui.addNotification(null, E('p', {}, [
				'🔒 IP ', E('strong', {}, [targetIp]), ' fixado com sucesso para ', E('strong', {}, [rawName]), '! ' + catLabel + ' agora manterão sempre o mesmo endereço.'
			]), 'info');
			this.forceDeviceReorder = true;
			window.setTimeout(L.bind(function() {
				if (this.fetchData) {
					this.fetchData().then(L.bind(this.update, this));
				} else {
					window.location.reload();
				}
			}, this), 1200);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', {}, ['Erro ao fixar IP: ' + (e.message || e)]), 'danger');
		});
	},
	updateSecondaryBanner: function(devices, reservedMap) {
		const banner = document.getElementById('ex-secondary-routers-banner');
		if (!banner) return;
		const secRouters = (devices || []).filter(function(d) { return d.isSecondary; });
		if (!secRouters || secRouters.length === 0) {
			banner.style.display = 'none';
			banner.replaceChildren();
			return;
		}
		banner.style.display = 'block';
		const allReserved = secRouters.every(function(d) { return !!reservedMap[d.mac]; });

		const items = secRouters.map(L.bind(function(sr) {
			const isRes = !!reservedMap[sr.mac];
			const srIp = sr.ip || '192.168.1.2';
			return E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 10px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-top: 6px; flex-wrap: wrap;' }, [
				E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' }, [
					E('strong', { style: 'color: #f8fafc;' }, [sr.name]),
					E('span', { class: 'ex-muted', style: 'font-size: 12px;' }, ['(' + srIp + ' • ' + sr.mac + ')']),
					isRes
						? E('span', { class: 'ex-device-badge badge-reserved', style: 'background: rgba(16,185,129,0.16); color: #10b981; border: 1px solid rgba(16,185,129,0.35); font-weight: 700; font-size: 0.68rem; padding: 2px 6px; border-radius: 6px;' }, ['🔒 MAC Amarrado (.2)'])
						: E('span', { class: 'ex-device-badge badge-unreserved', style: 'background: rgba(239,68,68,0.16); color: #f87171; border: 1px solid rgba(239,68,68,0.35); font-weight: 700; font-size: 0.68rem; padding: 2px 6px; border-radius: 6px;' }, ['⚠️ MAC Não Amarrado'])
				]),
				E('div', { style: 'display: flex; gap: 6px; align-items: center;' }, [
					!isRes ? E('button', {
						class: 'btn cbi-button cbi-button-action',
						style: 'font-size: 11.5px; font-weight: 700; padding: 3px 8px;',
						click: L.bind(function(ev) {
							ev.stopPropagation();
							this.quickReserveSecondary(sr);
						}, this)
					}, ['🔒 Amarrar MAC (.2)']) : '',
					E('a', {
						class: 'btn cbi-button cbi-button-neutral',
						href: 'http://' + srIp + '/',
						target: '_blank',
						style: 'font-size: 11.5px; font-weight: 700; padding: 3px 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;'
					}, ['🌐 Abrir Painel'])
				])
			]);
		}, this));

		banner.replaceChildren(
			E('div', {
				class: 'alert-message info',
				style: 'background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; padding: 12px 14px;'
			}, [
				E('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;' }, [
					E('strong', { style: 'color: #38bdf8; font-size: 14px; display: flex; align-items: center; gap: 6px;' }, [
						'📡 Roteador' + (secRouters.length > 1 ? 'es Secundários Detectados' : ' Secundário Detectado') + ' (' + secRouters.length + ' ativo' + (secRouters.length > 1 ? 's' : '') + ' expandindo a rede)'
					]),
					allReserved
						? E('span', { class: 'ex-pill online', style: 'font-size: 11px; padding: 2px 8px;' }, ['PROTEGIDO CONTRA CONFLITOS'])
						: E('span', { class: 'ex-pill offline', style: 'background: rgba(239,68,68,0.2); color: #f87171; border-color: rgba(239,68,68,0.4); font-size: 11px; padding: 2px 8px;' }, ['PENDENTE DE AMARRAÇÃO'])
				]),
				E('p', { class: 'ex-muted', style: 'margin: 2px 0 6px; font-size: 12px; line-height: 1.4;' }, [
					'Aparelhos conectados abaixo deste roteador principal operando com Wi-Fi sincronizado e portas cabeadas transparentes. O endereço IP fica reservado pelo MAC para que nenhum outro celular ou computador cause colisão de rede.'
				]),
				E('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, items)
			])
		);
	},
	flushStaleLeases: function() {
		const btn = document.getElementById('ex-device-flush-btn');
		if (btn) {
			btn.disabled = true;
			btn.textContent = translateText('Limpando…');
		}
		fs.exec('/usr/sbin/equipe-dashboard-control', ['flush-stale-leases']).then(L.bind(function(res) {
			let count = 0;
			try {
				const json = JSON.parse(res.stdout || '{}');
				count = json.purged || 0;
			} catch(e) {}
			ui.addNotification(null, E('p', {}, [
				count > 0
					? ('🧹 ' + count + ' ' + translateText('concessão(ões) inativa(s) removida(s) com sucesso.'))
					: translateText('Nenhum dispositivo inativo encontrado no momento.')
			]), 'info');
			if (btn) {
				btn.disabled = false;
				btn.style.display = 'none';
			}
			this.scheduleAdaptiveRefresh(100);
		}, this)).catch(L.bind(function(err) {
			if (btn) {
				btn.disabled = false;
				btn.textContent = '🧹 ' + translateText('Limpar inativos');
			}
			ui.addNotification(null, E('p', {}, [translateText('Erro ao limpar inativos: ') + (err.message || err)]), 'danger');
		}, this));
	},

	togglePassword: function(id, button) { const n=document.getElementById(id), hidden=n.dataset.hidden!=='0'; n.dataset.hidden=hidden?'0':'1'; n.style.filter=hidden?'none':'blur(5px)'; button.textContent=hidden?'Ocultar senha':'Ver senha'; },
	configureDevice: function(device) {
		ui.showModal('Configurar dispositivo',[E('p',{class:'ex-muted'},['Carregando configurações…'])]);
		return fs.exec('/usr/sbin/equipe-dashboard-control',['device-status',device.mac]).then(L.bind(function(result){
			if(result.code)throw new Error(result.stderr||'Falha ao consultar o dispositivo');
			let state={};try{state=JSON.parse(result.stdout||'{}');}catch(e){throw new Error('Resposta inválida do roteador');}
			const isAutoName = (!device.name || device.name === 'Dispositivo sem nome' || device.name === 'Câmera Wi-Fi / Smart' || device.name === 'Dispositivo Apple' || device.name === 'Computador Mac' || device.name === 'iPad');
			const name=E('input',{class:'cbi-input-text',value:isAutoName?'':device.name,placeholder:device.name||'Ex.: Celular da Joyce',maxlength:48,style:'width:100%'});
			const ipInput=E('input',{class:'cbi-input-text',value:state.ip||(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(device.ip)?device.ip:''),placeholder:'192.168.73.120',inputmode:'decimal',style:'width:100%'});

			let isReserved = !!state.reserved;
			const reserveBtnAuto = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (!isReserved ? ' active' : ''),
				click: function() { updateReserveMode(false); }
			}, [ '⚡ Automático (DHCP)' ]);

			const reserveBtnFixed = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (isReserved ? ' active' : ''),
				click: function() { updateReserveMode(true); }
			}, [ '🔒 Reservar / IP Fixo' ]);

			const reserveDescBox = E('div', { class: 'ex-reserve-box' });

			const updateReserveMode = function(reserved) {
				isReserved = !!reserved;
				reserveBtnAuto.classList.toggle('active', !isReserved);
				reserveBtnFixed.classList.toggle('active', isReserved);
				reserveDescBox.innerHTML = '';
				if (!isReserved) {
					reserveDescBox.appendChild(E('div', { style: 'display:flex;flex-direction:column;gap:4px;' }, [
						E('div', { style: 'display:flex;align-items:center;gap:6px;' }, [
							E('span', { class: 'ex-pill standby', style: 'font-size:0.75rem;' }, ['DHCP DINÂMICO']),
							E('strong', { style: 'font-size:0.88rem;' }, ['IP Atribuído Automaticamente'])
						]),
						E('p', { class: 'ex-muted', style: 'margin:4px 0 0;font-size:0.83rem;line-height:1.4;' }, [
							'O roteador entrega um IP temporário livre da rede. O IP em uso agora é ',
							E('strong', { style: 'color:#cbd5e1;' }, [device.ip || state.ip || '—']),
							'. Nenhuma reserva fixa será mantida no sistema.'
						])
					]));
				} else {
					reserveDescBox.appendChild(E('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [
						E('div', { style: 'display:flex;align-items:center;gap:6px;' }, [
							E('span', { class: 'ex-pill online', style: 'font-size:0.75rem;' }, ['CONCESSÃO ESTÁTICA']),
							E('strong', { style: 'font-size:0.88rem;' }, ['IP Fixo Vinculado ao MAC'])
						]),
						E('label', { style: 'display:block;' }, [
							E('span', { style: 'display:block;font-size:0.82rem;margin-bottom:4px;color:#cbd5e1;' }, ['Endereço IP para fixar exclusivamente para este aparelho:']),
							ipInput
						]),
						E('p', { class: 'alert-message warning', style: 'margin:0;padding:6px 10px;border-radius:8px;font-size:0.8rem;line-height:1.35;' }, [
							'🔒 Este IP ficará gravado nas concessões estáticas do DHCP para o MAC ',
							E('code', {}, [device.mac]),
							'. Este aparelho sempre receberá o mesmo IP fixo toda vez que conectar.'
						])
					]));
					ipInput.focus();
				}
			};

			updateReserveMode(isReserved);

			const isSecondary = !!device.isSecondary;
			const isIot = !!device.isIot;
			const sections = [];
			if (isSecondary) {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #38bdf8; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['📡 Roteador Secundário Detectado']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Este aparelho é um nó secundário expandindo a rede Wi-Fi e portas LAN. É crucial manter o IP amarrado ao MAC (ex: ',
						E('code', { style: 'font-weight: 700; color: #f8fafc;' }, [device.ip || '192.168.1.2']),
						') para garantir que nenhum outro celular ou computador cause colisão de IP com este roteador.'
					])
				]));
			} else if (isIot) {
				sections.push(E('div', {
					class: 'alert-message warning',
					style: 'margin-bottom: 12px; background: rgba(234, 179, 8, 0.08); border: 1px solid rgba(234, 179, 8, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #eab308; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['💡 Dispositivo Smart Home / Automação']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificado como dispositivo de automação (Tuya, Sonoff, Espressif, Alexa, etc.). ',
						'É ', E('strong', { style: 'color: #f8fafc;' }, ['altamente recomendado manter o IP Fixo']),
						' para evitar que comandos de voz (Alexa / Google Home) ou aplicativos percam a comunicação local caso o roteador seja reiniciado.'
					])
				]));
			} else if (device.category === 'printer') {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #c084fc; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['🖨️ Impressora / Scanner de Rede']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificado como impressora de rede. ',
						'É ', E('strong', { style: 'color: #f8fafc;' }, ['altamente recomendado manter o IP Fixo']),
						' para que computadores, notebooks e celulares não percam a comunicação ou apresentem erro de impressora offline.'
					])
				]));
			} else if (device.category === 'tv') {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #22d3ee; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['📺 Smart TV / Aparelho de Streaming']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificado como Smart TV ou dispositivo de streaming. ',
						'Recomenda-se fixar o IP para manter espelhamento de tela (AirPlay/Chromecast), controle remoto por app no celular e integrações de ligar/desligar sempre estáveis.'
					])
				]));
			} else if (device.category === 'console') {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(236, 72, 153, 0.08); border: 1px solid rgba(236, 72, 153, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #f472b6; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['🎮 Console de Jogos']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificado como console de videogame. ',
						'Recomenda-se fixar o IP para manter o NAT Aberto / Tipo 2 (PlayStation/Xbox/Switch) estável e facilitar regras de encaminhamento de portas ou Fila Gamer.'
					])
				]));
			}

			if (device.isPrivateMac) {
				sections.push(E('div', {
					class: 'alert-message warning',
					style: 'margin-bottom: 12px; background: rgba(148, 163, 184, 0.08); border: 1px dashed rgba(148, 163, 184, 0.4); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #94a3b8; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['🎭 Endereço MAC Privado / Aleatório Detectado']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Este aparelho (iOS ou Android) está gerando um MAC privado aleatório nas configurações de Wi-Fi. ',
						'Se você fixar o IP e o aparelho mudar o MAC futuramente, a reserva deixará de corresponder a ele. Para fixação definitiva, acesse o menu Wi-Fi no dispositivo e mude de "MAC Aleatório" para "MAC do Dispositivo".'
					])
				]));
			}

			if (device.fingerprint && device.fingerprint.vendor_class) {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #60a5fa; font-size: 13px; display: block; margin-bottom: 4px;' }, ['🏷️ Identificação Passiva via DHCP (Option 60)']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificador do Fabricante/SO: ',
						E('code', { style: 'font-weight: 700; color: #f8fafc;' }, [device.fingerprint.vendor_class]),
						(device.fingerprint.opt55 ? (' • Opções Solicitadas: ' + device.fingerprint.opt55) : '')
					])
				]));
			}
			sections.push(
				E('div',{class:'ex-device-config-block'},[
					E('label',{},['Nome neste roteador']),
					name,
					E('small',{class:'ex-muted'},['Endereço MAC: ' + device.mac])
				]),
				E('div',{class:'ex-device-config-block'},[
					E('strong',{},['Modo do Endereço IP']),
					E('small',{class:'ex-muted',style:'display:block;margin-top:2px;'},['Escolha se o dispositivo usa IP dinâmico ou se terá um IP fixo reservado:']),
					E('div', { class: 'ex-reserve-button-grid' }, [ reserveBtnAuto, reserveBtnFixed ]),
					reserveDescBox
				])
			);
			let selectedPriority = !state.priority ? 'none' : ((state.dscp === 'AF31' || state.dscp === 'AF42') ? 'video' : 'gamer');
			const hasQosFeature = (this.feature('sqm')||{}).installed || (this.feature('custom_qos')||{}).installed;
			if(hasQosFeature && !device.guest){
				const priorityButtons = [
					{ id: 'none', label: '⚪ Sem Prioridade', desc: 'Fila padrão justa (CS0). O SQM divide a banda igualmente entre os aparelhos. Recomendado para a maioria dos dispositivos (TVs, celulares e IoT).' },
					{ id: 'gamer', label: '🎮 Fila Gamer', desc: 'Prioridade máxima interativa (AF41 / Fila de Jogos). Os pacotes deste aparelho têm ultra-baixa latência e furam filas de downloads com total compatibilidade com jogos, web e Apple Store.' },
					{ id: 'video', label: '📺 Fila de Vídeo', desc: 'Alta prioridade multimídia (AF31 / Fila de Vídeo). Recomendado para chamadas de vídeo (Zoom, Meet, Teams) e transmissões ao vivo.' }
				];
				const descContainer = E('div', { class: 'ex-priority-desc-box' });
				const btnList = [];
				const updatePrioritySelection = function(newId) {
					selectedPriority = newId;
					btnList.forEach(function(item) {
						item.btn.classList.toggle('active', item.id === newId);
					});
					const matched = priorityButtons.find(function(p){ return p.id === newId; }) || priorityButtons[0];
					descContainer.innerHTML = '';
					descContainer.appendChild(E('p', { class: 'ex-priority-desc-text' }, [ matched.desc ]));
					if (newId === 'gamer') {
						descContainer.appendChild(E('small', { class: 'alert-message warning', style: 'margin-top:8px;display:block;padding:8px 10px;border-radius:8px;font-size:0.8rem;' }, [
							'💡 Dica ARK Router: Não ative a Fila Gamer em todos os aparelhos da casa. Priorize apenas onde você joga para manter o benefício anti-lag máximo!'
						]));
					}
				};
				const buttonsGrid = E('div', { class: 'ex-priority-button-grid' });
				priorityButtons.forEach(function(item) {
					const b = E('button', {
						type: 'button',
						class: 'ex-priority-option-btn' + (item.id === selectedPriority ? ' active' : ''),
						click: function() { updatePrioritySelection(item.id); }
					}, [ item.label ]);
					btnList.push({ id: item.id, btn: b });
					buttonsGrid.appendChild(b);
				});
				updatePrioritySelection(selectedPriority);

				sections.push(E('div',{class:'ex-device-config-block'},[
					E('strong',{},['Prioridade no SQM / QoS']),
					E('small',{class:'ex-muted',style:'display:block;margin-top:2px;'},['Escolha o nível de prioridade deste dispositivo na internet:']),
					buttonsGrid,
					descContainer
				]));
			}else sections.push(E('small',{class:'ex-muted ex-device-priority-note'},['A prioridade aparece somente na rede principal quando o SQM está ativo.']));

			const activeWans = getActiveWanList(this.currentData || {});
			let selectedWanRoute = state.wan_route || 'default';
			const wanRouteButtons = [
				{ id: 'default', label: '🌐 Padrão da Rede', desc: 'Segue a política global do Multi‑WAN / Speedify. Recomendado para a maioria dos aparelhos.' },
				{ id: 'wan', label: '⚡ Forçar WAN1 (Fibra)', desc: 'Rota 100% direta pela Fibra Óptica (WAN1). Menor latência pura, ideal para PC Gamer, consoles e transmissões sem oscilação.' }
			];
			if (activeWans.length > 1) {
				activeWans.forEach(function(w){
					if (w.iface !== 'wan' && w.iface !== 'wan1') {
						wanRouteButtons.push({
							id: w.iface,
							label: '🌐 Forçar ' + w.label,
							desc: 'Todo o tráfego deste dispositivo sairá exclusivamente pela conexão ' + w.label + '.'
						});
					}
				});
			}
			const wanDescBox = E('div', { class: 'ex-priority-desc-box', style: 'margin-top:6px;' });
			const wanBtnList = [];
			const updateWanRouteSelection = function(newId) {
				selectedWanRoute = newId;
				wanBtnList.forEach(function(item) {
					item.btn.classList.toggle('active', item.id === newId);
				});
				const matched = wanRouteButtons.find(function(p){ return p.id === newId; }) || wanRouteButtons[0];
				wanDescBox.innerHTML = '';
				wanDescBox.appendChild(E('p', { class: 'ex-priority-desc-text' }, [ matched.desc ]));
				if (newId === 'wan') {
					wanDescBox.appendChild(E('small', { class: 'alert-message notice', style: 'margin-top:8px;display:block;padding:8px 10px;border-radius:8px;font-size:0.8rem;' }, [
						'🎯 Rota Gamer Direta: Este aparelho sai direto pela Fibra com a menor latência possível (sem passar por balanceamento ou VPNs).'
					]));
				}
			};
			const wanRouteGrid = E('div', { class: 'ex-priority-button-grid' });
			wanRouteButtons.forEach(function(item) {
				const b = E('button', {
					type: 'button',
					class: 'ex-priority-option-btn' + (item.id === selectedWanRoute ? ' active' : ''),
					click: function() { updateWanRouteSelection(item.id); }
				}, [ item.label ]);
				wanBtnList.push({ id: item.id, btn: b });
				wanRouteGrid.appendChild(b);
			});
			updateWanRouteSelection(selectedWanRoute);

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['Rota de Saída de Internet (Policy Routing)']),
				E('small', { class: 'ex-muted', style: 'display:block;margin-top:2px;' }, ['Escolha por qual link de internet este dispositivo deve sair:']),
				wanRouteGrid,
				wanDescBox
			]));

			let limitEnabled = !!state.limit_enabled;
			let limitDown = Number(state.limit_down) || 0;
			let limitUp = Number(state.limit_up) || 0;

			const downInput = E('input', {
				type: 'number',
				min: '0',
				max: '1000',
				step: '1',
				value: limitDown ? String(limitDown) : '',
				placeholder: '0 = Ilimitado',
				class: 'cbi-input-text',
				style: 'width: 100%; box-sizing: border-box;'
			});

			const upInput = E('input', {
				type: 'number',
				min: '0',
				max: '1000',
				step: '1',
				value: limitUp ? String(limitUp) : '',
				placeholder: '0 = Ilimitado',
				class: 'cbi-input-text',
				style: 'width: 100%; box-sizing: border-box;'
			});

			const limitToggle = E('input', {
				type: 'checkbox',
				checked: limitEnabled ? '' : null,
				style: 'width: 20px; height: 20px; cursor: pointer;'
			});
			limitToggle.checked = !!limitEnabled;

			const limitPresets = [
				{ label: '♾️ Ilimitado', down: 0, up: 0 },
				{ label: '📱 10M / 2M', down: 10, up: 2 },
				{ label: '📺 25M / 5M', down: 25, up: 5 },
				{ label: '🚀 50M / 10M', down: 50, up: 10 },
				{ label: '⚡ 100M / 20M', down: 100, up: 20 }
			];

			const limitFieldsRow = E('div', {
				class: 'ex-grid ex-grid-2',
				style: 'margin-top: 10px; gap: 10px; display: ' + (limitEnabled ? 'grid' : 'none') + ';'
			}, [
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('span', {}, ['↓ Limite Download (Mbps):']),
					downInput
				]),
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('span', {}, ['↑ Limite Upload (Mbps):']),
					upInput
				])
			]);

			let limitLanBypass = (state.limit_lan_bypass == null || state.limit_lan_bypass === true || state.limit_lan_bypass === '1' || state.limit_lan_bypass === 1);
			const lanBypassToggle = E('input', {
				type: 'checkbox',
				checked: limitLanBypass ? '' : null
			});
			lanBypassToggle.checked = !!limitLanBypass;

			const lanBypassStatusPill = E('span', {
				class: 'ex-pill ok',
				style: 'font-size: 0.72rem; padding: 2px 8px; font-weight: 600;'
			});

			const lanBypassDescText = E('div', {
				style: 'font-size: 0.77rem; line-height: 1.35; margin-top: 6px;'
			});

			const updateLanBypassUI = function() {
				if (lanBypassToggle.checked) {
					limitLanBypassBlock.style.background = 'rgba(56,189,248,.08)';
					limitLanBypassBlock.style.borderColor = 'rgba(56,189,248,.25)';
					lanBypassStatusPill.className = 'ex-pill ok';
					lanBypassStatusPill.textContent = '✓ Rede Local Liberada (Recomendado)';
					lanBypassDescText.style.color = '#cbd5e1';
					lanBypassDescText.textContent = 'O limite se aplica estritamente à Internet. Transferências para computadores da casa, impressoras, servidores locais e NAS continuam em velocidade máxima da LAN (Gigabit / Wi-Fi 6).';
				} else {
					limitLanBypassBlock.style.background = 'rgba(245,158,11,.08)';
					limitLanBypassBlock.style.borderColor = 'rgba(245,158,11,.3)';
					lanBypassStatusPill.className = 'ex-pill warning';
					lanBypassStatusPill.textContent = '⚠️ Intranet Limitada';
					lanBypassDescText.style.color = '#fef08a';
					lanBypassDescText.textContent = 'Atenção: O limite de velocidade também será aplicado ao tráfego interno (LAN / Wi-Fi). Transferências de arquivos entre PCs, streaming local ou backups para NAS serão reduzidos a esta velocidade.';
				}
			};

			const limitLanBypassBlock = E('div', {
				style: 'margin-top: 10px; padding: 10px 12px; border-radius: 8px; border: 1px solid; transition: all .2s ease; display: ' + (limitEnabled ? 'block' : 'none') + ';'
			}, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' }, [
						E('strong', { style: 'font-size: 0.82rem; color: #f8fafc;' }, ['⚡ Bypass de Rede Local']),
						lanBypassStatusPill
					]),
					E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
						lanBypassToggle,
						E('span', { class: 'ex-switch-slider' })
					])
				]),
				lanBypassDescText
			]);

			lanBypassToggle.addEventListener('change', updateLanBypassUI);
			updateLanBypassUI();

			const presetBtnList = [];
			const updatePresetActive = function() {
				const curDown = Number(downInput.value) || 0;
				const curUp = Number(upInput.value) || 0;
				const isOff = !limitToggle.checked || (curDown === 0 && curUp === 0);
				presetBtnList.forEach(function(p) {
					if (p.preset.down === 0 && p.preset.up === 0) {
						p.btn.classList.toggle('active', isOff);
					} else {
						p.btn.classList.toggle('active', !isOff && p.preset.down === curDown && p.preset.up === curUp);
					}
				});
				limitFieldsRow.style.display = limitToggle.checked ? 'grid' : 'none';
				limitLanBypassBlock.style.display = limitToggle.checked ? 'block' : 'none';
			};

			const limitPresetGrid = E('div', { class: 'ex-priority-button-grid', style: 'margin-top: 8px;' });
			limitPresets.forEach(function(preset) {
				const b = E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					click: function() {
						if (preset.down === 0 && preset.up === 0) {
							limitToggle.checked = false;
							downInput.value = '';
							upInput.value = '';
						} else {
							limitToggle.checked = true;
							downInput.value = preset.down;
							upInput.value = preset.up;
						}
						updatePresetActive();
					}
				}, [ preset.label ]);
				presetBtnList.push({ preset: preset, btn: b });
				limitPresetGrid.appendChild(b);
			});

			limitToggle.addEventListener('change', updatePresetActive);
			downInput.addEventListener('input', updatePresetActive);
			downInput.addEventListener('change', updatePresetActive);
			upInput.addEventListener('input', updatePresetActive);
			upInput.addEventListener('change', updatePresetActive);
			updatePresetActive();

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
					E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
						E('strong', {}, ['Limite de Banda Individual']),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Restrinja a velocidade máxima de download e upload deste aparelho:'])
					]),
					E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
						limitToggle,
						E('span', { class: 'ex-switch-slider' })
					])
				]),
				limitPresetGrid,
				limitFieldsRow,
				limitLanBypassBlock
			]));

			// --- Seção: Protocolo de Internet / IPv6 Individual ---
			let ipv6Allowed = (state.ipv6_allowed === true || state.ipv6_allowed === '1' || state.ipv6_allowed === 1);
			const ipv6BtnDual = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (ipv6Allowed ? ' active' : ''),
				style: 'flex: 1; min-height: 40px; font-weight: 700;',
				click: function() { setIpv6Mode(true); }
			}, [ '⚡ Pilha Dupla (IPv4 + IPv6)' ]);

			const ipv6BtnBlocked = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (!ipv6Allowed ? ' active' : ''),
				style: 'flex: 1; min-height: 40px; font-weight: 700;',
				click: function() { setIpv6Mode(false); }
			}, [ '🚫 IPv4 Puro (Bloquear IPv6)' ]);

			const ipv6StatusPill = E('span', {
				class: 'ex-pill ' + (ipv6Allowed ? 'online' : 'warning'),
				style: 'font-size: 0.72rem; padding: 2px 8px; font-weight: 600;'
			});

			const ipv6DescText = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 6px; line-height: 1.4;' });

			const setIpv6Mode = function(allowed) {
				ipv6Allowed = !!allowed;
				ipv6BtnDual.classList.toggle('active', ipv6Allowed);
				ipv6BtnBlocked.classList.toggle('active', !ipv6Allowed);
				if (ipv6Allowed) {
					ipv6StatusPill.className = 'ex-pill online';
					ipv6StatusPill.textContent = '⚡ PILHA DUPLA (LIBERADO)';
					ipv6DescText.textContent = 'Este aparelho navega livremente com IPv4 e IPv6 em simultâneo. Recomendado para PCs Gamers, consoles e celulares.';
				} else {
					ipv6StatusPill.className = 'ex-pill warning';
					ipv6StatusPill.textContent = '🚫 BLOQUEIO ATIVO (IPv4 PURO)';
					ipv6DescText.textContent = 'O firewall do roteador bloqueia 100% do tráfego IPv6 para este aparelho. Ele operará exclusivamente em IPv4 puro (ideal para TV Box, UniTV, IPTV e saídas dedicadas por WAN2).';
				}
			};
			setIpv6Mode(ipv6Allowed);

			const ipv6ButtonGroup = E('div', {
				class: 'ex-priority-button-grid',
				style: 'margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;'
			}, [
				ipv6BtnDual,
				ipv6BtnBlocked
			]);

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;' }, [
					E('strong', {}, ['🌐 Protocolo de Internet Deste Aparelho (IPv4 / IPv6)']),
					ipv6StatusPill
				]),
				ipv6ButtonGroup,
				ipv6DescText
			]));

			// --- Seção: Controle Parental & Filtros Deste Aparelho ---
			let parentalMode = state.parental_mode || 'default';
			if (parentalMode !== 'custom' && parentalMode !== 'bypass') parentalMode = 'default';
			const parBlockToggle = E('input', { type: 'checkbox' });
			parBlockToggle.checked = !!state.parental_block;

			const safeSearchToggle = E('input', { type: 'checkbox' });
			safeSearchToggle.checked = !!state.safesearch;

			const hasAgh = !!state.adguard_installed;
			const initialBlocked = (state.blocked_services || '').split(',').map(function(s){ return s.trim().toLowerCase(); }).filter(Boolean);
			const selectedServices = new Set(initialBlocked);

			const serviceOptions = [
				{ id: 'tiktok', name: 'TikTok', icon: '🎵' },
				{ id: 'instagram', name: 'Instagram', icon: '📸' },
				{ id: 'youtube', name: 'YouTube', icon: '▶️' },
				{ id: 'discord', name: 'Discord', icon: '💬' },
				{ id: 'roblox', name: 'Roblox', icon: '🎮' }
			];

			const parModeDefaultBtn = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (parentalMode === 'default' ? ' active' : ''),
				click: function() { updateParentalModeUI('default'); }
			}, [ '🌐 Padrão da Rede' ]);

			const parModeBypassBtn = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (parentalMode === 'bypass' ? ' active' : ''),
				click: function() { updateParentalModeUI('bypass'); }
			}, [ '⚡ Bypass (Sem Bloqueio)' ]);

			const parModeCustomBtn = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (parentalMode === 'custom' ? ' active' : ''),
				click: function() { updateParentalModeUI('custom'); }
			}, [ '🛡️ Filtro Individual' ]);

			const parDetailContainer = E('div', { style: 'margin-top: 10px;' });

			const makeSimpleToggleRow = function(title, desc, input) {
				return E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; background: rgba(255,255,255,.025); border-radius: 8px; margin-top: 6px;' }, [
					E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
						E('strong', { style: 'font-size: 0.85rem; display: block;' }, [title]),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px; line-height: 1.3;' }, [desc])
					]),
					E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
						input,
						E('span', { class: 'ex-switch-slider' })
					])
				]);
			};

			const rowParBlock = makeSimpleToggleRow(
				'🔞 Bloquear Conteúdo Adulto / Pornografia',
				'Bloqueia sites pornográficos e explícitos exclusivamente para este aparelho.',
				parBlockToggle
			);

			const rowSafeSearch = makeSimpleToggleRow(
				'🔍 Forçar Busca Segura (SafeSearch)',
				'Obriga o filtro de família no Google, Bing e YouTube para proteger crianças.',
				safeSearchToggle
			);

			const servicesWrap = E('div', { style: 'margin-top: 10px; padding: 12px; background: rgba(255,255,255,.025); border-radius: 9px; border: 1px solid rgba(127,127,127,.12);' });
			servicesWrap.appendChild(E('strong', { style: 'font-size: 0.85rem; display: block; margin-bottom: 8px;' }, ['🚫 Bloqueio de Apps e Serviços:']));
			const chipsRow = E('div', { style: 'display: flex; flex-wrap: wrap; gap: 8px;' });

			serviceOptions.forEach(function(opt) {
				const isChecked = selectedServices.has(opt.id);
				const renderChip = function(btn, checked) {
					btn.replaceChildren();
					if (checked) {
						btn.appendChild(E('span', { class: 'ex-chip-icon' }, ['🚫']));
						btn.appendChild(E('span', { class: 'ex-chip-name' }, [opt.name]));
						btn.appendChild(E('span', { class: 'ex-chip-status' }, ['BLOQUEADO']));
					} else {
						btn.appendChild(E('span', { class: 'ex-chip-icon' }, [opt.icon]));
						btn.appendChild(E('span', { class: 'ex-chip-name' }, [opt.name]));
					}
				};
				const chip = E('button', {
					type: 'button',
					class: 'ex-service-chip' + (isChecked ? ' active' : ''),
					title: isChecked ? 'Clique para liberar o ' + opt.name : 'Clique para bloquear o ' + opt.name,
					click: function() {
						const nowChecked = !selectedServices.has(opt.id);
						if (nowChecked) {
							selectedServices.add(opt.id);
							chip.classList.add('active');
							chip.title = 'Clique para liberar o ' + opt.name;
						} else {
							selectedServices.delete(opt.id);
							chip.classList.remove('active');
							chip.title = 'Clique para bloquear o ' + opt.name;
						}
						renderChip(chip, nowChecked);
					}
				});
				renderChip(chip, isChecked);
				chipsRow.appendChild(chip);
			});
			servicesWrap.appendChild(chipsRow);

			const updateParentalModeUI = function(mode) {
				parentalMode = mode;
				parModeDefaultBtn.classList.toggle('active', parentalMode === 'default');
				parModeBypassBtn.classList.toggle('active', parentalMode === 'bypass');
				parModeCustomBtn.classList.toggle('active', parentalMode === 'custom');
				parDetailContainer.innerHTML = '';

				if (parentalMode === 'custom') {
					parDetailContainer.appendChild(rowParBlock);
					parDetailContainer.appendChild(rowSafeSearch);
					if (hasAgh) {
						parDetailContainer.appendChild(servicesWrap);
					}
				} else if (parentalMode === 'bypass') {
					parDetailContainer.appendChild(E('div', { style: 'margin-top: 6px; padding: 10px 12px; background: rgba(59,130,246,.08); border-radius: 8px; border: 1px solid rgba(59,130,246,.25);' }, [
						E('strong', { style: 'font-size: 0.85rem; color: #60a5fa; display: flex; align-items: center; gap: 6px;' }, [
							'⚡ Modo Direto sem Filtragem (Bypass)'
						]),
						E('p', { class: 'ex-muted', style: 'margin: 6px 0 0; font-size: 0.82rem; line-height: 1.4;' }, [
							'Este aparelho terá tráfego DNS liberado direto para a Internet, contornando o AdGuard Home e qualquer bloqueio ou filtro parental da rede local. Totalmente compatível com DNS manual ou personalizado.'
						])
					]));
				} else {
					parDetailContainer.appendChild(E('p', { class: 'ex-muted', style: 'margin: 6px 0 0; font-size: 0.82rem; line-height: 1.4;' }, [
						'Este aparelho segue as proteções gerais configuradas no painel principal do roteador. Nenhuma restrição ou filtro exclusivo será imposto a ele.'
					]));
				}
			};

			updateParentalModeUI(parentalMode);

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;' }, [
					E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
						E('strong', {}, ['🛡️ Controle Parental & Filtros Deste Aparelho']),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Defina regras individuais de proteção e restrição para este dispositivo:'])
					])
				]),
				E('div', { class: 'ex-priority-button-grid' }, [
					parModeDefaultBtn,
					parModeBypassBtn,
					parModeCustomBtn
				]),
				parDetailContainer
			]));
			// --- Seção: Servidor DNS Deste Aparelho (DHCP Opção 6) ---
			let curCustomDns = (state.custom_dns || '').trim();
			const customDnsInput = E('input', {
				type: 'text',
				class: 'cbi-input-text',
				value: curCustomDns,
				placeholder: 'Padrão da rede (vazio) ou ex.: 8.8.8.8, 8.8.4.4',
				style: 'width: 100%; box-sizing: border-box;'
			});

			const dnsPresets = [
				{ label: '🌐 Padrão da Rede', val: '' },
				{ label: '⚡ Google (8.8.8.8)', val: '8.8.8.8, 8.8.4.4' },
				{ label: '🛡️ Cloudflare (1.1.1.1)', val: '1.1.1.1, 1.0.0.1' },
				{ label: '🔒 Quad9 (9.9.9.9)', val: '9.9.9.9, 149.112.112.112' },
				{ label: '🚫 AdGuard DNS', val: '94.140.14.14, 94.140.15.15' }
			];

			const dnsPresetBtnList = [];
			const updateDnsPresetActive = function() {
				const curVal = customDnsInput.value.replace(/\s+/g, '');
				dnsPresetBtnList.forEach(function(p) {
					const pVal = p.val.replace(/\s+/g, '');
					if (!pVal) {
						p.btn.classList.toggle('active', !curVal);
					} else {
						p.btn.classList.toggle('active', curVal === pVal || curVal === pVal.split(',')[0]);
					}
				});
			};

			const dnsPresetGrid = E('div', { class: 'ex-priority-button-grid', style: 'margin-bottom: 8px;' });
			dnsPresets.forEach(function(p) {
				const b = E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					click: function() {
						customDnsInput.value = p.val;
						updateDnsPresetActive();
					}
				}, [ p.label ]);
				dnsPresetBtnList.push({ val: p.val, btn: b });
				dnsPresetGrid.appendChild(b);
			});

			customDnsInput.addEventListener('input', updateDnsPresetActive);
			customDnsInput.addEventListener('change', updateDnsPresetActive);
			updateDnsPresetActive();

			let isDmz = !!state.dmz;
			const dmzToggle = E('input', {
				type: 'checkbox',
				checked: isDmz ? '' : null,
				'aria-label': 'Ativar DMZ para este dispositivo'
			});
			const dmzSummaryEl = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 3px; font-size: 0.8rem; line-height: 1.35;' }, [
				isDmz
					? '⚡ Este aparelho é a DMZ ativa da rede. Todas as portas não solicitadas da WAN vão para ele (NAT Aberto).'
					: 'Desativado. O firewall bloqueia portas não solicitadas para este aparelho.'
			]);
			dmzToggle.addEventListener('change', function(ev) {
				if (ev.currentTarget.checked) {
					dmzSummaryEl.textContent = '⚡ DMZ será ativada para este aparelho ao salvar. Se o IP não estiver reservado, o ARK Router reservará automaticamente.';
					if (!isReserved) {
						updateReserveMode(true);
					}
				} else {
					dmzSummaryEl.textContent = 'Desativado. O firewall protegerá as portas deste aparelho.';
				}
			});

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('div', { style: 'display:flex; align-items:center; justify-content:space-between; gap:12px;' }, [
					E('div', {}, [
						E('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
							E('strong', {}, ['🎯 Zona Desmilitarizada (DMZ / Host Aberto)']),
							isDmz ? E('span', { class: 'ex-pill online', style: 'font-size:0.72rem;' }, ['DMZ ATUAL']) : ''
						]),
						dmzSummaryEl
					]),
					E('label', { class: 'ex-switch' }, [
						dmzToggle,
						E('span', { class: 'ex-switch-slider' })
					])
				]),
				E('p', { class: 'ex-muted', style: 'margin: 6px 0 0; font-size: 0.78rem; line-height: 1.3;' }, [
					'🎮 Ideal para Consoles (PS5, Xbox, Switch) e PC Gamer para eliminar NAT Restrito/Moderado. Apenas um aparelho por vez pode ser o DMZ da rede.'
				])
			]));

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['🌐 Servidor DNS Deste Aparelho (DHCP Opção 6)']),
				E('small', { class: 'ex-muted', style: 'display: block; margin: 2px 0 8px;' }, [
					'Envie um DNS exclusivo diretamente para este dispositivo via DHCP. Ele falará direto com os servidores sem intermediários:'
				]),
				dnsPresetGrid,
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('span', {}, ['Endereço(s) DNS personalizado(s):']),
					customDnsInput
				]),
				E('p', { class: 'ex-muted', style: 'margin: 6px 0 0; font-size: 0.8rem; line-height: 1.35;' }, [
					'💡 Dica: Se preenchido, o roteador avisa este aparelho para consultar o DNS escolhido. Caso o aparelho já tenha DNS fixo manual (ex.: 8.8.8.8 na TV), o roteador respeita e dá passagem livre automática.'
				])
			]));


			sections.push(E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = 'Salvando…';
				const prioEnabled = (selectedPriority !== 'none') ? '1' : '0';
				const dscpVal = (selectedPriority === 'video') ? 'AF31' : 'AF41';
				const finalIp = isReserved ? ipInput.value.trim() : (device.ip || state.ip || '');
				const limEnabled = limitToggle.checked ? '1' : '0';
				const limDown = limitToggle.checked ? (Math.round(Number(downInput.value)) || 0) : 0;
				const limUp = limitToggle.checked ? (Math.round(Number(upInput.value)) || 0) : 0;
				const parBlockVal = (parentalMode === 'custom' && parBlockToggle.checked) ? '1' : '0';
				const safeSearchVal = (parentalMode === 'custom' && safeSearchToggle.checked) ? '1' : '0';
				const servList = (parentalMode === 'custom' && hasAgh) ? Array.from(selectedServices).join(',') : '';
				const limLanBypass = lanBypassToggle.checked ? '1' : '0';
				const ipv6AllowedVal = ipv6Allowed ? '1' : '0';
				const customDnsVal = customDnsInput.value.trim();
				const dmzVal = dmzToggle.checked ? '1' : '0';
				const args=['device-save',device.mac,name.value.trim(),isReserved?'reserved':'automatic',finalIp,prioEnabled,dscpVal,selectedWanRoute,limEnabled,String(limDown),String(limUp),parentalMode,parBlockVal,safeSearchVal,servList,limLanBypass,ipv6AllowedVal,customDnsVal,dmzVal];
				return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(L.bind(function(r){
					if(r.code)throw new Error(r.stderr||'Falha ao salvar');
					ui.hideModal();
					ui.addNotification(null,E('p',{},['Configurações do dispositivo salvas.']));
					this.forceDeviceReorder = true;
					return this.fetchData().then(L.bind(this.update,this));
				},this)).catch(function(e){btn.disabled = false; btn.textContent = 'Salvar configurações'; if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Salvar configurações'])]));
			ui.showModal('Configurar dispositivo',sections);name.focus();
		},this)).catch(function(e){ui.hideModal();ui.addNotification(null,E('p',{},[e.message]),'danger');});
	}
};

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
			const profiles=sqmWanProfiles(data);if(!profiles.length)throw new Error('Nenhuma interface configurada como WAN foi encontrada.');
			const guestDownloadLimit=qosGuest.download_kbps||qos.guest_download_kbps||0, guestUploadLimit=qosGuest.upload_kbps||qos.guest_upload_kbps||0;
			const fwDefs = Object.values(data.firewallConfig || {}).find(function(s) { return s && s['.type'] === 'defaults'; }) || {};
			const isFlowOffloadActive = fwDefs.flow_offloading === '1';

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
					placeholder: 'Velocidade nominal (Mbps)',
					style: 'max-width: 170px; margin-right: 6px;'
				});
				const calcDownNotice = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 4px; font-size: 11px; line-height: 1.3;' }, [
					'Margem recomendada de 7% para absorver variações do modem.'
				]);
				const applyCalcDownBtn = E('button', {
					type: 'button',
					class: 'btn cbi-button cbi-button-action ex-mini-button',
					style: 'font-weight: 600;',
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

				const calcDownBox = E('div', { class: 'ex-qos-calc-box', style: 'margin-top: 8px; margin-bottom: 8px; padding: 8px 10px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.15); border-radius: 8px;' }, [
					E('div', { style: 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;' }, [
						E('strong', { style: 'font-size: 11.5px;' }, ['🧮 Calculadora de Download (-7% Bufferbloat)'])
					]),
					E('div', { style: 'display: flex; align-items: center; flex-wrap: wrap; gap: 4px;' }, [
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

				// 3. Link Layer Overhead & CAKE Parameters
				const curLinklayer = queue.linklayer || 'none';
				const curOverhead = parseInt(queue.overhead || 0, 10);
				const curEqdisc = queue.eqdisc_opts || 'diffserv4 nat dual-srchost ack-filter memlimit 32M';
				const curIqdisc = queue.iqdisc_opts || 'diffserv4 nat dual-dsthost ingress memlimit 32M';

				const isPppoe = profile.proto === 'pppoe';
				const overheadSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; margin-top: 4px;' }, [
					E('option', { value: 'none|0', selected: (curLinklayer === 'none' && curOverhead === 0) }, ['Nenhum / Ethernet Pura (0 bytes overhead)']),
					E('option', { value: 'ethernet|18', selected: (curLinklayer === 'ethernet' && curOverhead === 18) }, ['Cabo DOCSIS / Ethernet Padrão (18 bytes)' + (!isPppoe ? ' — Recomendado Cabo/DHCP' : '')]),
					E('option', { value: 'ethernet|28', selected: (curLinklayer === 'ethernet' && curOverhead === 28) || (!queue.overhead && isPppoe) }, ['Fibra GPON / PPPoE Direto (28 bytes' + (isPppoe ? ' — Recomendado para esta WAN' : '') + ')']),
					E('option', { value: 'ethernet|34', selected: (curLinklayer === 'ethernet' && curOverhead === 34) }, ['Fibra PPPoE / VLAN (34 bytes)']),
					E('option', { value: 'ethernet|44', selected: (curLinklayer === 'ethernet' && curOverhead === 44) }, ['Fibra GPON / PPPoE Conservador (44 bytes)']),
					E('option', { value: 'atm|44', selected: (curLinklayer === 'atm') }, ['Linha ADSL Antiga (ATM 44 bytes)'])
				]);

				const chkNat = E('input', { type: 'checkbox', checked: curEqdisc.indexOf('nat') !== -1 });
				const chkHostFair = E('input', { type: 'checkbox', checked: (curEqdisc.indexOf('dual-srchost') !== -1 || curIqdisc.indexOf('dual-dsthost') !== -1) });
				const chkAck = E('input', { type: 'checkbox', checked: curEqdisc.indexOf('ack-filter') !== -1 });
				const chkWash = E('input', { type: 'checkbox', checked: curEqdisc.indexOf('wash') !== -1 });
				const chkDiffserv = E('input', { type: 'checkbox', checked: curEqdisc.indexOf('diffserv4') !== -1 });

				const advancedDetails = E('details', { style: 'margin-top: 10px; padding: 10px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;' }, [
					E('summary', { style: 'cursor: pointer; font-weight: 700; font-size: 12px; color: #93c5fd;' }, ['⚙️ Parâmetros Avançados do CAKE & Enquadramento (Overhead)']),
					E('div', { style: 'margin-top: 10px; display: flex; flex-direction: column; gap: 8px;' }, [
						E('label', { style: 'display: block;' }, [
							E('span', { style: 'font-weight: 600; font-size: 11.5px; display: block;' }, ['Tipo de Link / Overhead de Linha:']),
							overheadSelect,
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Compensa os cabeçalhos de fibra/cabo no shaper para precisão absoluta anti-bufferbloat.'])
						]),
						E('div', { style: 'display: flex; flex-direction: column; gap: 6px; margin-top: 4px;' }, [
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
								E('span', {}, [E('strong', {}, ['Diffserv 4-Tiers (diffserv4): ']), 'Priorização automática: Voz/Jogos > Vídeo/Streaming > Normal > Torrents.'])
							])
						])
					])
				]);

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
					section: E('section', {}, [
						E('h3', {}, [profile.label]),
						E('small', { class: 'ex-muted' }, ['Interface '+profile.network+' • dispositivo '+profile.device+(profile.online?' • online':' • sem link')]),
						E('label', { class: 'ex-qos-edit-toggle' }, [enabled, E('span', {}, ['Ativar fila '+profile.label])]),
						download.row,
						calcDownBox,
						upload.row,
						calcBox,
						advancedDetails
					])
				};
			});
			const guestDown=field('Visitantes download total',guestDownloadLimit,'Mbps • 0 ou vazio = ilimitado'), guestUp=field('Visitantes upload total',guestUploadLimit,'Mbps • exemplo: 1,5 • 0 ou vazio = ilimitado');
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
				}, ['🎯 Aplicar nos Limites (-7%)'])
			]) : '';

			ui.showModal('Editar SQM / CAKE',[
				E('div',{style:'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;'},[
					E('p',{class:'ex-muted',style:'margin:0;'},[_t('Defina os limites em Mbps. Exemplo: 1,2 Gbps = 1200 Mbps. Use 0 ou deixe em branco quando não quiser limitar aquela direção (ilimitado).')]),
					E('button',{class:'ex-mini-button','click':L.bind(function(){ui.hideModal();this.openFastCom();},this)},['🎬 ' + _t('Medir no Fast.com')])
				]),
				speedtestBanner,
				flowOffloadNotice,
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

				const parts = (editor.overheadSelect.value || 'none|0').split('|');
				const linklayer = parts[0] || 'none';
				const overhead = parts[1] || '0';
				let eqOpts = [];
				let iqOpts = [];
				if (editor.chkDiffserv.checked) { eqOpts.push('diffserv4'); iqOpts.push('diffserv4'); }
				if (editor.chkNat.checked) { eqOpts.push('nat'); iqOpts.push('nat'); }
				if (editor.chkHostFair.checked) { eqOpts.push('dual-srchost'); iqOpts.push('dual-dsthost'); }
				if (editor.chkAck.checked) { eqOpts.push('ack-filter'); }
				if (editor.chkWash.checked) { eqOpts.push('wash'); iqOpts.push('wash'); }
				eqOpts.push('memlimit 32M');
				iqOpts.push('ingress memlimit 32M');
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
			let igmpSnooping = String(opt.igmp_snooping) === '1' || opt.igmp_snooping === 1 || opt.igmp_snooping === true;
			const sqmInstalled = !!opt.sqm_installed;
			const sqmActive = !!opt.sqm_active;
			const sqmAnyActive = !!opt.sqm_any_active;
			const self = this;
			const hw = (self.capabilities && self.capabilities.hardware) || {};
			const isSingleCore = hw.cpu_cores <= 1;
			const isLowRam = (hw.mem_total_mb || 128) < 256;
			const irqbalanceFeat = (typeof self.feature === 'function') ? (self.feature('irqbalance') || {}) : {};
			const isNativeHwIrq = !isSingleCore && (!!opt.irqbalance_native || !!irqbalanceFeat.native_hw || (!opt.irqbalance_installed && !opt.irqbalance_installable && irqbalanceFeat.reason && irqbalanceFeat.reason.indexOf('nativamente') !== -1));

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
			const igmpInput = E('input', { type: 'checkbox', change: function() { igmpSnooping = igmpInput.checked; updateUI(); } });
			const igmpNotice = E('small', { class: 'ex-opt-requirement', style: 'display:none;margin-top:6px;' });
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
			const flowNotice = E('small', { class: 'ex-opt-requirement', style: 'display:none;margin-top:6px;' });

			const updateSqmDependency = function() {
				const isSatNode = isSatelliteOrAp(self.currentData);
				if (isSatNode) {
					sqmDependency.style.display = 'flex';
					sqmDependency.className = 'ex-opt-sqm-dependency warning';
					while (sqmDependency.firstChild) sqmDependency.removeChild(sqmDependency.firstChild);
					sqmDependency.appendChild(E('div', {}, [
						E('strong', {}, ['🛡️ ' + _t('Modo Ponto de Acesso (AP)')]),
						E('p', {}, [_t('O controle SQM / CAKE é exclusivo do Roteador Mestre e permanece desativado neste Ponto de Acesso (AP).')])
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
				irqInput.checked = !isSingleCore && (irqBalance || isNativeHwIrq);
				irqInput.disabled = isSingleCore || isNativeHwIrq || !opt.irqbalance_installed;
				flowInput.disabled = false;
				igmpInput.checked = igmpSnooping;
				if (igmpSnooping) {
					igmpNotice.style.display = 'block';
					igmpNotice.className = 'ex-opt-requirement ready';
					igmpNotice.textContent = '✓ Proteção ativa: o tráfego multicast é entregue apenas a quem solicitou, liberando antenas Wi-Fi.';
				} else {
					igmpNotice.style.display = 'block';
					igmpNotice.className = 'ex-opt-requirement warning';
					igmpNotice.textContent = '⚠️ Desativado: transmissões de vídeo e descoberta mDNS podem ser transmitidas como broadcast no Wi-Fi.';
				}
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
				const isSqmOn = !isSatNode && (sqmActive || sqmAnyActive || enableSqmInput.checked || linklayerProfile !== 'none');
				if (flowOffload && isSqmOn) {
					flowOffload = false;
					flowInput.checked = false;
				}
				if (flowOffload) {
					flowNotice.style.display = 'block';
					flowNotice.className = 'ex-opt-requirement ready';
					flowNotice.textContent = '✓ Pronto e ativo: tráfego acelerado no kernel com menor uso de CPU. SQM/CAKE mantido desligado para evitar conflitos.';
				} else if (isSqmOn) {
					flowNotice.style.display = 'block';
					flowNotice.className = 'ex-opt-requirement warning';
					flowNotice.textContent = '🛡️ Desativado: SQM / CAKE ativo. Fastpath desabilitado para não desviar pacotes da fila anti-bufferbloat.';
				} else {
					flowNotice.style.display = 'none';
				}

				globalWarning.textContent = 'Estas opções de desempenho beneficiam o roteador como um todo.';
				updateSqmDependency();
			};

			const applyPreset = function(presetId) {
				selectedPreset = presetId;
				const p = presets.find(function(x) { return x.id === presetId; });
				const effective = presetId === 'auto' ? profileById(opt.detected_profile) : p;
				if (effective && presetId !== 'custom') {
					linklayerProfile = effective.ll || 'none';
					babyJumbo = !!effective.jumbo;
					if (linklayerProfile !== 'none') {
						flowOffload = false;
						flowInput.checked = false;
						enableSqmInput.checked = true;
					}
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
					click: function() {
						selectedPreset = 'custom';
						linklayerProfile = c.id;
						if (c.id !== 'none') {
							flowOffload = false;
							flowInput.checked = false;
							enableSqmInput.checked = true;
						}
						updateUI();
					}
				}, [c.label]);
				chipBtns.push({ id: c.id, btn: b });
				chipGrid.appendChild(b);
			});

			tcpInput.addEventListener('change', function() { tcpTurbo = tcpInput.checked; updateUI(); });
			flowInput.addEventListener('change', function() {
				flowOffload = flowInput.checked;
				if (flowOffload) {
					linklayerProfile = 'none';
					enableSqmInput.checked = false;
				}
				updateUI();
			});
			jumboInput.addEventListener('change', function() { selectedPreset = 'custom'; babyJumbo = jumboInput.checked; updateUI(); });
			irqInput.addEventListener('change', function() { irqBalance = irqInput.checked; updateUI(); });
			enableSqmInput.addEventListener('change', function() {
				if (enableSqmInput.checked) {
					flowOffload = false;
					flowInput.checked = false;
				}
				updateSqmDependency();
				updateUI();
			});
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
								flowNotice
							]),
							E('label', { class: 'ex-switch' }, [ flowInput, E('span', { class: 'ex-switch-slider' }) ])
						]),
						(!isSingleCore) ? E('div', { class: 'ex-opt-module-card' }, [
							E('div', { class: 'ex-opt-module-info' }, [
								E('strong', {}, ['⚙️ IRQ Balance']),
								E('p', {}, [opt.irqbalance_installed ? 'Distribui o processamento de rede entre os núcleos de CPU disponíveis.' : (isNativeHwIrq ? 'Processamento multicore distribuído nativamente por hardware/driver (DMA rings).' : 'Módulo não instalado neste roteador.')])
							]),
							isNativeHwIrq ? E('span', { class: 'ex-pill online', style: 'font-weight: 700; padding: 4px 10px; background:rgba(16,185,129,0.15); color:#10b981; border:1px solid rgba(16,185,129,0.3);' }, ['NATIVO']) : E('label', { class: 'ex-switch' }, [irqInput, E('span', { class: 'ex-switch-slider' })])
						]) : '',
						E('div', { class: 'ex-opt-module-card' }, [
							E('div', { class: 'ex-opt-module-info' }, [
								E('strong', {}, ['📶 Otimização Multicast / Wi-Fi (IGMP Snooping)']),
								E('p', {}, ['Evita que transmissões multicast (IPTV, Chromecast, Apple AirPlay, streaming local e mDNS) sejam propagadas como broadcast para todas as antenas Wi-Fi. Direciona os dados exclusivamente para o dispositivo que solicitou a transmissão, economizando tempo de antena (airtime) e mantendo a taxa máxima do Wi-Fi 7.']),
								igmpNotice
							]),
							E('label', { class: 'ex-switch' }, [ igmpInput, E('span', { class: 'ex-switch-slider' }) ])
						])
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
						const isSqmOn = !isSatNode && (requiresSqm || (sqmActive && enableSqmInput.checked) || enableSqmInput.checked);
						const activateSqm = !isSatNode && requiresSqm && !sqmActive && enableSqmInput.checked;
						const effectiveFlowOffload = (!isSqmOn && flowOffload);

						btn.disabled = true;
						btn.textContent = activateSqm ? 'Ativando CAKE e aplicando…' : 'Aplicando otimizações…';
						const args = [
							'wan-optimize-set',
							'iface=' + opt.iface,
							'preset=' + selectedPreset,
							'tcp_turbo=' + (tcpTurbo ? '1' : '0'),
							'flow_offload=' + (effectiveFlowOffload ? '1' : '0'),
							'linklayer_profile=' + (effectiveFlowOffload ? 'none' : linklayerProfile),
							'baby_jumbo=' + (babyJumbo ? '1' : '0'),
							'enable_sqm=' + (isSqmOn ? '1' : '0'),
							'irqbalance=' + (irqBalance ? '1' : '0'),
							'igmp_snooping=' + (igmpSnooping ? '1' : '0')
						];
						return fs.exec('/usr/sbin/equipe-dashboard-control', args).then(L.bind(function(res) {
							if (res.code) throw new Error(res.stderr || 'Falha ao aplicar otimizações');
							this.triggerImmediateRefresh(activateSqm ? 'SQM / CAKE ativado e otimizações aplicadas com sucesso!' : 'Otimizações de internet aplicadas com sucesso!', 'info');
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

		const isApMode = isSatelliteOrAp(this.currentData) || state.network_mode === 'ap';
		const initialDhcpEnabled = !isApMode && (state.dhcp_enabled !== false);

		const dhcpInput = E('input', { type: 'checkbox', class: 'cbi-input-checkbox', checked: initialDhcpEnabled ? '' : null });
		dhcpInput.checked = initialDhcpEnabled;
		if (isApMode) {
			dhcpInput.disabled = true;
		}

		const dhcpStateText = E('strong', { class: 'ex-device-switch-state' }, [initialDhcpEnabled ? 'LIGADO' : 'DESLIGADO']);
		const dhcpSwitch = E('label', { class: 'ex-switch' + (isApMode ? ' disabled' : '') }, [dhcpInput, E('span', { class: 'ex-switch-slider' })]);
		const dhcpControl = E('div', { class: 'ex-device-switch-control' }, [dhcpStateText, dhcpSwitch]);

		const dhcpNotice = isApMode ? E('p', { class: 'alert-message notice', style: 'margin-top: 10px;' }, [
			'Modo Roteador Secundário / Ponto Adicional ativo: o servidor DHCP local está desativado para evitar conflitos de IP na rede. Toda a distribuição de IPs é coordenada exclusivamente pelo roteador principal.'
		]) : null;

		const dhcpWarning = E('p', { class: 'alert-message warning', style: 'margin-top: 10px; display: ' + (initialDhcpEnabled || isApMode ? 'none' : 'block') + ';' }, [
			'Atenção: Com o servidor DHCP desativado, computadores e celulares conectados não receberão endereço IP automaticamente e exigirão configuração manual de IP estático.'
		]);

		const dhcpEntry = E('div', { class: 'ex-cleanup-entry', style: 'margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,.03);' }, [
			E('div', {}, [
				E('strong', {}, ['Distribuição de IPs (Servidor DHCP IPv4)']),
				E('small', { class: 'ex-muted' }, [
					isApMode
						? 'Desativado obrigatoriamente no Modo Secundário / Ponto Adicional para evitar conflitos com o Roteador Principal.'
						: 'Distribui endereços IP automaticamente para celulares, computadores e dispositivos conectados.'
				])
			]),
			dhcpControl
		]);

		const initialIgmpEnabled = (state.igmp_snooping === true || state.igmp_snooping === '1' || state.igmp_snooping === 1 || String(state.igmp_snooping) !== 'false');
		const igmpLanInput = E('input', { type: 'checkbox', class: 'cbi-input-checkbox', checked: initialIgmpEnabled ? '' : null });
		igmpLanInput.checked = initialIgmpEnabled;
		const igmpLanStateText = E('strong', { class: 'ex-device-switch-state' }, [initialIgmpEnabled ? 'LIGADO' : 'DESLIGADO']);
		igmpLanInput.addEventListener('change', function() {
			igmpLanStateText.textContent = igmpLanInput.checked ? 'LIGADO' : 'DESLIGADO';
		});
		const igmpLanSwitch = E('label', { class: 'ex-switch' }, [igmpLanInput, E('span', { class: 'ex-switch-slider' })]);
		const igmpLanControl = E('div', { class: 'ex-device-switch-control' }, [igmpLanStateText, igmpLanSwitch]);

		const igmpLanEntry = E('div', { class: 'ex-cleanup-entry', style: 'margin-top: 14px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,.03);' }, [
			E('div', {}, [
				E('strong', {}, ['📶 Otimização Multicast / Wi-Fi (IGMP Snooping)']),
				E('small', { class: 'ex-muted' }, [
					'Evita que transmissões multicast (IPTV, Chromecast, Apple AirPlay, streaming local e mDNS) inundem as antenas Wi-Fi. Direciona os pacotes exclusivamente para os dispositivos inscritos, liberando tempo de antena para máxima velocidade Wi-Fi.'
				])
			]),
			igmpLanControl
		]);

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

		const updateDhcpFields=function(){
			const isDhcpOn = dhcpInput.checked && !isApMode;
			dhcpStateText.textContent = isDhcpOn ? 'LIGADO' : 'DESLIGADO';
			if (dhcpWarning) {
				dhcpWarning.style.display = (isDhcpOn || isApMode) ? 'none' : 'block';
			}
			const manual = mode.value === 'manual';
			dhcpStart.disabled = dhcpEnd.disabled = (!manual || !isDhcpOn);
			if (!isDhcpOn) {
				dhcpStart.style.opacity = '0.4';
				dhcpEnd.style.opacity = '0.4';
			} else {
				dhcpStart.style.opacity = '';
				dhcpEnd.style.opacity = '';
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
			const manual=mode.value==='manual';
			const isDhcpOn = dhcpInput.checked && !isApMode;
			routerIp.disabled=netmask.disabled=!manual;
			dhcpStart.disabled=dhcpEnd.disabled=(!manual || !isDhcpOn);
			if(!isDhcpOn){
				dhcpStart.style.opacity='0.4';
				dhcpEnd.style.opacity='0.4';
			} else {
				dhcpStart.style.opacity='';
				dhcpEnd.style.opacity='';
			}
			if(manual){
				suggestDhcp(false);
				suggestDns(routerIp.value);
			}else{
				suggestDhcp(changed);
			}
		};
		dhcpInput.addEventListener('change', updateDhcpFields);
		dhcpStart.addEventListener('input',function(){dhcpTouched=true;});
		dhcpEnd.addEventListener('input',function(){dhcpTouched=true;});
		dns1.addEventListener('input',function(){
			const val=dns1.value.trim();
			dns1Touched=(val!==''&&val!==routerIp.value.trim());
		});
		routerIp.addEventListener('input',function(){onRouterIpChange(false);});
		routerIp.addEventListener('blur',function(){onRouterIpChange(false);});
		mode.addEventListener('change',function(){applyPreset(true);});applyPreset(false);

		const modalContent = [
			E('p',{class:'alert-message warning'},['Alterar o IP principal muda o endereço de acesso do painel e pode desconectar dispositivos. O ARK cria um backup em /tmp antes de aplicar.']),
			dhcpNotice,
			dhcpWarning,
			dhcpEntry,
			igmpLanEntry,
			E('div',{class:'ex-wan-edit-grid'},[
				field('Modelo de rede',mode),
				field('IP do roteador',routerIp,'Endereço usado para abrir o painel'),
				field('Máscara',netmask,'Nesta versão, use /24: 255.255.255.0'),
				field('DHCP começa em',dhcpStart, isApMode ? 'Desativado (Modo Secundário)' : ''),
				field('DHCP termina em',dhcpEnd, isApMode ? 'Desativado (Modo Secundário)' : ''),
				field('DNS enviado 1',dns1,'Acompanha o IP do roteador se não personalizado'),
				field('DNS enviado 2',dns2),
				field('DNS enviado 3',dns3,'Opcional. Apague os três para não enviar DNS fixo.')
			]),
			E('p',{class:'ex-muted'},['Exemplo: roteador 192.168.25.1 sugere automaticamente DHCP 192.168.25.10 até 192.168.25.254. Depois você pode ajustar só o final. O DHCP não pode incluir o IP do roteador. DNS preenchido será enviado aos aparelhos via DHCP.']),
			E('div',{class:'ex-cleanup-entry',style:'margin-top:14px;padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.03);'},[
				E('div',{},[
					E('strong',{},['🌐 Conectividade IPv6 e Modo Cascata (NDP Relay)']),
					E('small',{class:'ex-muted'},['Configure o protocolo IPv6 para esta rede local (Pilha Dupla Global, Seletivo por MAC, Cascata/NDP Relay ou IPv4 Puro).'])
				]),
				E('button',{class:'ex-mini-button btn-ipv6',style:'min-height:38px;padding:6px 14px;','click':L.bind(function(){closeModal();this.showIpv6Modal();},this)},['🌐 Ajustes IPv6 / Relay'])
			]),
			E('div',{class:'right',style:'margin-top:16px;'},[
				E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',
				E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
					const dns=[dns1.value.trim(),dns2.value.trim(),dns3.value.trim()].filter(Boolean);
					const isDhcpOn = dhcpInput.checked && !isApMode;
					const isIgmpOn = igmpLanInput.checked;
					const next={mode:mode.value,routerIp:routerIp.value.trim(),netmask:netmask.value.trim(),startIp:dhcpStart.value.trim(),endIp:dhcpEnd.value.trim(),dns:dns,dhcpEnabled:isDhcpOn,igmpSnooping:isIgmpOn,oldIp:state.ipaddr||''};
					ui.showModal('Confirmar alteração da LAN',[
						E('p',{class:'alert-message warning'},['Essa alteração reinicia a rede/portas LAN e DHCP. O painel pode cair por alguns segundos e os dispositivos podem precisar renovar IP.']),
						E('div',{class:'ex-qos-edit-grid'},[
							E('section',{},[
								E('h3',{},['Novo acesso']),
								E('p',{},['Roteador: ',E('strong',{},[next.routerIp])]),
								E('p',{},['Máscara: ',E('strong',{},[next.netmask])])
							]),
							E('section',{},[
								E('h3',{},['Servidor DHCP']),
								E('p',{},[
									next.dhcpEnabled
										? E('span',{class:'ex-badge ok'},['Ativado: ' + next.startIp + ' → ' + next.endIp])
										: E('span',{class:'ex-badge warn'},['Desativado (IP Fixo / Manual)'])
								])
							]),
							E('section',{},[
								E('h3',{},['Multicast Wi-Fi (IGMP)']),
								E('p',{},[
									next.igmpSnooping
										? E('span',{class:'ex-badge ok'},['Ativado (Proteção Wi-Fi)'])
										: E('span',{class:'ex-badge warn'},['Desativado (Broadcast)'])
								])
							]),
							E('section',{},[
								E('h3',{},['DNS via DHCP']),
								E('p',{},[next.dns.length?next.dns.join(' • '):'Sem DNS fixo'])
							])
						]),
						E('p',{class:'ex-muted'},['O ARK cria backup em /tmp antes de aplicar. Se o IP principal mudar, tentarei abrir automaticamente o painel no novo endereço.']),
						E('div',{class:'right'},[
							E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Voltar']),' ',
							E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
								const args=['lan-save','mode='+next.mode,'router_ip='+next.routerIp,'netmask='+next.netmask,'start_ip='+next.startIp,'end_ip='+next.endIp,'dns='+next.dns.join(' '),'dhcp_enabled='+(next.dhcpEnabled?'1':'0'),'igmp_snooping='+(next.igmpSnooping?'1':'0')];
								return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){
									if(r.code)throw new Error(r.stderr||'Falha ao salvar LAN');
									let out={};try{out=JSON.parse(r.stdout||'{}');}catch(e){}
									ui.hideModal();
									if((out.new_ip||next.routerIp)!==(out.old_ip||next.oldIp))redirectToRouter(out.new_ip||next.routerIp,'LAN salva. Tentando abrir o painel no novo IP '+(out.new_ip||next.routerIp)+'…',1000);
									else reloadSoon('Faixa DHCP salva. Recarregando o painel…',1000);
								}).catch(function(e){
									if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
									ui.addNotification(null,E('p',{},[e.message]),'danger');
								});
							},this)},['Aplicar agora'])
						])
					]);
				},this)},['Continuar'])
			])
		].filter(Boolean);

		ui.showModal('Editar rede principal / DHCP', modalContent);
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
						E('strong', { style: 'font-size: 0.92rem; color: #f8fafc;' }, ['🔗 Roteador em Cascata (Repasse IPv6 / NDP Relay)']),
						E('span', { class: 'ex-pill ' + (isRelay ? 'online' : 'standby'), style: 'font-size: 0.7rem;' }, [ isRelay ? 'RELAY IPV6 ATIVO' : 'SERVIDOR IPV6 DIRETO' ])
					]),
					E('p', { class: 'ex-muted', style: 'font-size: 0.8rem; line-height: 1.4; margin: 4px 0 0;' }, [
						'Ative se este ARK Router estiver conectado atrás do modem da operadora (ou outro roteador) e seus aparelhos não estiverem recebendo IPv6 (quando a operadora entrega apenas um prefixo /64). O odhcpd repassa os anúncios de vizinhança IPv6 (NDP) transparentemente para os seus clientes, sem necessidade de DMZ no mestre.'
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
		const clients = (this.currentData && this.currentData.clients) || [];
		
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
		const clients = (this.currentData && this.currentData.clients) || [];

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
							_t('Abre >64.500 portas (1024-65535) para BitTorrent e P2P. Serviços essenciais (Bancos, Alexa, Consoles, Jogos, VoIP e Trabalho) são blindados automaticamente antes na conexão principal.')
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
			E('div', { style: 'margin-top: 14px; padding: 10px 12px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 8px; font-size: 12px; line-height: 1.45; color: #94a3b8;' }, [
				E('strong', { style: 'color: #38bdf8; display: block; margin-bottom: 2px;' }, ['🛡️ ' + _t('Blindagem Inteligente de Portas Seguras')]),
				_t('Mesmo com o modo amplo ativo para toda a rede, assistentes de voz (Alexa, Google, Apple), jogos (PSN, Xbox, Steam), chamadas/VoIP (Zoom, Teams, Meet) e acessos de trabalho são automaticamente blindados na conexão principal.')
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

// /src/modules/wifi.js - ARK Router LuCI View Module
const wifiMethods = {
	updateWifi: function(data) {
		const w=wifiConfig(data.wireless);
		let s2=surveyInfo(data.survey2), s5=surveyInfo(data.survey5);
		if (s2.channel && Number(s2.channel) >= 36 && (!s5.channel || Number(s5.channel) <= 14)) {
			const tmp = s2; s2 = s5; s5 = tmp;
		}
		text('ex-main-ssid',w.main.ssid||'Rede principal');
		text('ex-guest-ssid',w.guest.ssid||'Visitantes');
		text('ex-main-key',w.main.key||'sem senha'); text('ex-guest-key',w.guest.key||'sem senha');

		const mainRuntime = getWifiRuntimeState(w.main, data.wireless, data.wirelessStatus);
		setPill('ex-main-wifi-status', mainRuntime.pillClass, mainRuntime.label);
		const mainToggle = document.getElementById('ex-main-wifi-toggle');
		if (mainToggle && !mainToggle.disabled) mainToggle.checked = mainRuntime.checked;

		const guestRuntime = getWifiRuntimeState(w.guest, data.wireless, data.wirelessStatus);
		setPill('ex-guest-wifi-status', guestRuntime.pillClass, guestRuntime.label);
		const guestToggle = document.getElementById('ex-guest-wifi-toggle');
		if (guestToggle && !guestToggle.disabled) guestToggle.checked = guestRuntime.checked;

		(w.extras||[]).forEach(function(e) {
			const extraRuntime = getWifiRuntimeState(e, data.wireless, data.wirelessStatus);
			setPill('ex-' + e.id + '-wifi-status', extraRuntime.pillClass, extraRuntime.label);
			const extraToggle = document.getElementById('ex-' + e.id + '-wifi-toggle');
			if (extraToggle && !extraToggle.disabled) extraToggle.checked = extraRuntime.checked;
		});

		const r2 = w.r2g || w.r0 || {}, r5 = w.r5g || w.r1 || {};
		const auto2=String(r2.channel||'auto')==='auto', auto5=String(r5.channel||'auto')==='auto';
		const country=String(r2.country||r5.country||'00').toUpperCase(), countryInfo=this.countries.find(function(x){return String(x.code||x.iso3166).toUpperCase()===country;}); text('ex-country-current',(countryInfo&&countryInfo.country?countryInfo.country:'País')+' ('+country+')');
		const maxPowerToggle = document.getElementById('ex-maxpower-toggle');
		if(maxPowerToggle && !maxPowerToggle.disabled){
			const isPA = (country === 'PA');
			maxPowerToggle.checked = isPA;
			const maxSummary = document.getElementById('ex-maxpower-mode-summary');
			if(maxSummary){
				maxSummary.textContent = isPA
					? 'Ativo • Libera 100% da potência física dos amplificadores (até 1.000 mW / 30 dBm) usando o domínio Panamá (PA).'
					: 'Desativado • Limite regulatório padrão Brasil (BR) aplicado.';
			}
		}
		const allAuto=auto2&&auto5, mixed=auto2!==auto5, toggle=document.getElementById('ex-channel-auto-toggle');
		if(toggle){toggle.checked=allAuto;toggle.indeterminate=mixed;toggle.setAttribute('aria-checked',mixed?'mixed':String(allAuto));}
		text('ex-channel-mode-summary',mixed?'Configuração mista entre as bandas':(allAuto?'Ligado • Auto Inteligente (1, 6, 11 no 2,4 GHz • Sem radar DFS no 5 GHz)':'Desligado • canais definidos manualmente'));
		setPill('ex-wifi-2-mode',auto2?'online':'standby',auto2?'AUTO':'MANUAL'); setPill('ex-wifi-5-mode',auto5?'online':'standby',auto5?'AUTO':'MANUAL');
		text('ex-wifi-2','Canal '+(auto2?(s2.channel||'em seleção'):(r2.channel||'—'))+' • '+(auto2?'automático':'manual')+' • '+(r2.htmode||'')+' • ocupação '+s2.busy.toFixed(0)+'%');
		text('ex-wifi-5','Canal '+(auto5?(s5.channel||'em seleção'):(r5.channel||'—'))+' • '+(auto5?'automático':'manual')+' • '+(r5.htmode||'')+' • ocupação '+s5.busy.toFixed(0)+'%');
		if(document.getElementById('ex-wifi-6')){
			const r6 = w.r6g || w.r2 || {};
			const auto6 = String(r6.channel||'auto')==='auto';
			setPill('ex-wifi-6-mode', auto6 ? 'online' : 'standby', auto6 ? 'AUTO' : 'MANUAL');
			text('ex-wifi-6', 'Canal ' + (auto6 ? 'automático' : (r6.channel || '—')) + ' • ' + (auto6 ? 'automático' : 'manual') + ' • ' + (r6.htmode || ''));
		}
		text('ex-wifi-noise','Ruído: 2,4 GHz '+(isFinite(s2.noise)?s2.noise+' dBm':'—')+' • 5 GHz '+(isFinite(s5.noise)?s5.noise+' dBm':'—'));

		const wifi6Toggle = document.getElementById('ex-wifi6-toggle');
		if(wifi6Toggle && !wifi6Toggle.disabled){
			const isWifi6Active = [w.r2g, w.r5g, w.r6g].some(function(r){
				return r && (r.bss_color === 'auto' || String(r.twt_responder || '') === '1' || String(r.he_bss_color || '') === '1');
			});
			wifi6Toggle.checked = isWifi6Active;
			setPill('ex-wifi6-pill', isWifi6Active ? 'online' : 'standby', isWifi6Active ? 'ACELERAÇÃO ATIVA' : 'STANDBY');
			const wifi6Summary = document.getElementById('ex-wifi6-summary');
			if(wifi6Summary){
				wifi6Summary.textContent = isWifi6Active
					? 'Ativo • BSS Coloring, TWT, OFDMA, Beamforming e Puncturing operando nos rádios.'
					: 'Desativado • Recursos avançados de agregação e economia de bateria em espera.';
			}
		}

		const wpsToggle = document.getElementById('ex-wps-toggle');
		if(wpsToggle && !wpsToggle.disabled) wpsToggle.checked = !!w.wpsEnabled;
		const wpsPbcBtn = document.getElementById('ex-wps-pbc-btn');
		if(wpsPbcBtn && !window._arkWpsInterval) wpsPbcBtn.disabled = !w.wpsEnabled;
		const wpsPill = document.getElementById('ex-wps-status-pill');
		if(wpsPill) setPill('ex-wps-status-pill', w.wpsEnabled ? 'online' : 'standby', w.wpsEnabled ? 'ATIVO' : 'DESLIGADO');
		const wpsSummary = document.getElementById('ex-wps-summary');
		if(wpsSummary && !window._arkWpsInterval){
			wpsSummary.textContent = w.wpsEnabled
				? 'Ativo • Pareamento rápido por botão (PBC) habilitado nos rádios.'
				: 'Desativado • Conexões exigem senha manualmente.';
		}

		const roamToggle = document.getElementById('ex-roaming-toggle');
		if(roamToggle && !roamToggle.disabled) roamToggle.checked = !!w.roamingEnabled;
		setPill('ex-roaming-pill', w.roamingEnabled ? 'online' : 'standby', w.roamingEnabled ? '802.11k/v/r ATIVO' : 'DESLIGADO');
		const roamSummary = document.getElementById('ex-roaming-summary');
		if(roamSummary){
			roamSummary.textContent = w.roamingEnabled
				? 'Ativo • Transições em < 50ms (802.11r), relatórios de vizinhos (802.11k) e migração de clientes teimosos (802.11v).'
				: 'Desativado • Aparelhos realizam reautenticação completa WPA ao trocar de ponto de acesso.';
		}

		const txBalToggle = document.getElementById('ex-txbalance-toggle');
		if(txBalToggle && !txBalToggle.disabled) txBalToggle.checked = !!w.txBalanced;
		setPill('ex-txbalance-pill', w.txBalanced ? 'online' : 'standby', w.txBalanced ? '2.4G (15 dBm) / 5G (20 dBm)' : 'PADRÃO');
		const txBalSummary = document.getElementById('ex-txbalance-summary');
		if(txBalSummary){
			txBalSummary.textContent = w.txBalanced
				? 'Ativo • 2,4 GHz em potência moderada (15 dBm) e 5 GHz no máximo (20 dBm) para prevenir clientes presos.'
				: 'Desativado • Rádios operando na potência padrão máxima do país.';
		}

		const usteerFeat = (this.capabilities && this.capabilities.features && this.capabilities.features.usteer) || {};
		const usteerToggle = document.getElementById('ex-usteer-toggle');
		if(usteerToggle && !usteerToggle.disabled) usteerToggle.checked = !!usteerFeat.active;
		setPill('ex-usteer-pill', usteerFeat.active ? 'online' : 'standby', usteerFeat.active ? 'DAEMON ATIVO (< 1 MB RAM)' : (usteerFeat.installed ? 'STANDBY' : 'NÃO INSTALADO'));
		const usteerSummary = document.getElementById('ex-usteer-summary');
		if (usteerSummary) {
			usteerSummary.textContent = usteerFeat.active
				? 'Ativo • Monitora o sinal de cada dispositivo e orquestra a troca entre roteadores e frequências 2,4 / 5 GHz.'
				: (usteerFeat.installed ? 'Desativado • O roteador não realiza assistência ativa de roaming.' : 'Módulo ultraleve oficial do OpenWrt disponível para instalação.');
		}
	},
	currentWifiChannels: function() {
		const data=this.currentData||{}, w=wifiConfig(data.wireless);
		let s2=surveyInfo(data.survey2), s5=surveyInfo(data.survey5);
		if (s2.channel && Number(s2.channel) >= 36 && (!s5.channel || Number(s5.channel) <= 14)) {
			const tmp = s2; s2 = s5; s5 = tmp;
		}
		const r2 = w.r2g || w.r0 || {}, r5 = w.r5g || w.r1 || {};
		return { two: currentChannelValue(r2.channel, s2), five: currentChannelValue(r5.channel, s5), auto2: String(r2.channel||'auto')==='auto', auto5: String(r5.channel||'auto')==='auto' };
	},

	changeWifiPassword: function(kind, ssid) {
		const first=E('input',{type:'password',class:'cbi-input-text',placeholder:'Nova senha',maxlength:63,autocomplete:'new-password',style:'width:100%'});
		const second=E('input',{type:'password',class:'cbi-input-text',placeholder:'Repita a nova senha',maxlength:63,autocomplete:'new-password',style:'width:100%;margin-top:10px'});
		const show=E('input',{type:'checkbox'});
		show.addEventListener('change',function(){first.type=second.type=show.checked?'text':'password';});
		ui.showModal('Alterar senha — '+ssid,[
			E('p',{},['A nova senha será aplicada ao 2,4 e ao 5 GHz desta rede.']),
			first,second,
			E('label',{class:'ex-show-password'},[show,E('span',{},['Mostrar senha digitada'])]),
			E('p',{class:'alert-message warning'},['Ao salvar, o Wi‑Fi reiniciará e os aparelhos serão desconectados. Depois, será necessário conectar novamente usando a nova senha.']),
			E('div',{class:'right'},[
				E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',
				E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
					const password=first.value;
					if(password.length<8||password.length>63){ui.addNotification(null,E('p',{},['A senha precisa ter entre 8 e 63 caracteres.']));return;}
					if(password!==second.value){ui.addNotification(null,E('p',{},['As duas senhas digitadas não são iguais.']));return;}
					return fs.exec('/usr/sbin/equipe-dashboard-control',['wifi',kind,password]).then(function(r){
						if(r.code)throw new Error(r.stderr||'Falha ao alterar a senha');
						ui.hideModal(); ui.addNotification(null,E('p',{},['Senha salva. O Wi‑Fi reiniciará em alguns segundos.']));
					}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});
				},this)},['Salvar nova senha'])
			])
		]);
		first.focus();
	},
	showAddWifiModal: function() {
		const ssid = E('input', { class: 'cbi-input-text', placeholder: 'Ex: MinhaRede_IoT', maxlength: 32, style: 'width:100%' });
		const encSelect = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'sae-mixed' }, ['WPA2 / WPA3 Misto (Mais Seguro)']),
			E('option', { value: 'psk2' }, ['WPA2-PSK (Máxima Compatibilidade IoT)']),
			E('option', { value: 'sae' }, ['WPA3-SAE Puro (Máxima Segurança Moderna)']),
			E('option', { value: 'none' }, ['Sem Senha (Rede Aberta)'])
		]);
		const password = E('input', { type: 'password', class: 'cbi-input-text', placeholder: 'senha (mínimo 8 caracteres)', maxlength: 63, style: 'width:100%' });
		const passwordConfirm = E('input', { type: 'password', class: 'cbi-input-text', placeholder: 'repita a senha', maxlength: 63, style: 'width:100%' });
		const show = E('input', { type: 'checkbox' });
		show.addEventListener('change', function() { password.type = passwordConfirm.type = show.checked ? 'text' : 'password'; });
		const netSelect = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'lan' }, ['Rede Principal / LAN (mesma faixa de computadores e impressoras)']),
			E('option', { value: 'guest' }, ['Rede Isolada / Visitantes (sem acesso aos computadores locais)'])
		]);
		const hw = (this.capabilities && this.capabilities.hardware) || {};
		const has6g = !!(hw.wifi && hw.wifi.wifi_6g);
		const bandOptions = [
			E('option', { value: 'both' }, [has6g ? 'Todas as Bandas (2.4 GHz + 5 GHz + 6 GHz)' : 'Unificada (2.4 GHz + 5 GHz com mesmo nome)']),
			E('option', { value: '2g' }, ['Apenas 2.4 GHz']),
			E('option', { value: '5g' }, ['Apenas 5 GHz'])
		];
		if (has6g) {
			bandOptions.push(E('option', { value: '6g' }, ['Apenas 6 GHz (Wi-Fi 6E / Wi-Fi 7)']));
		}
		const bandSelect = E('select', { class: 'cbi-input-select', style: 'width:100%' }, bandOptions);

		const passRow1 = E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Senha']), password ]);
		const passRow2 = E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Confirmar senha']), passwordConfirm ]);
		const showRow = E('label', { class: 'ex-show-password' }, [ show, E('span', {}, ['Mostrar senha digitada']) ]);

		const encAlert = E('div', { class: 'alert-message', style: 'margin-top: 6px; font-size: 11.5px; display: none;' });
		const updateEncVisibility = function() {
			const encVal = encSelect.value;
			const isNone = encVal === 'none';
			passRow1.style.display = isNone ? 'none' : 'block';
			passRow2.style.display = isNone ? 'none' : 'block';
			showRow.style.display = isNone ? 'none' : 'flex';
			
			if (encVal === 'psk2') {
				encAlert.className = 'alert-message success';
				encAlert.style.display = 'block';
				encAlert.innerHTML = '<strong>PMF Desativado:</strong> Recomendado para Casa Inteligente. Garante a conexão de dispositivos IoT antigos e modernos sem falhas de autenticação.';
			} else if (encVal === 'sae-mixed' || encVal === 'sae') {
				encAlert.className = 'alert-message warning';
				encAlert.style.display = 'block';
				encAlert.innerHTML = '<strong>Atenção ao WPA3 e PMF:</strong> A segurança WPA3 exige o uso de PMF. Vários dispositivos IoT/Smart Home recusarão conexão na rede.';
			} else {
				encAlert.style.display = 'none';
			}
		};
		encSelect.addEventListener('change', updateEncVisibility);
		updateEncVisibility();

		const rows = [
			E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Nome da nova rede Wi‑Fi (SSID)']), ssid ]),
			E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Segurança / Criptografia']), encSelect, encAlert ]),
			E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Tipo de rede e isolamento']), netSelect, E('small', { class: 'ex-muted' }, ['Escolha se os aparelhos desta rede podem conversar com outros computadores da casa ou se ficam isolados.']) ]),
			E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Frequência / Bandas']), bandSelect ]),
			passRow1,
			passRow2,
			showRow,
			E('p', { class: 'alert-message warning' }, ['Ao salvar, o Wi‑Fi reiniciará para criar os novos pontos de acesso sem fio.']),
			E('div', { class: 'right' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Cancelar']),
				' ',
				E('button', { class: 'btn cbi-button cbi-button-positive', 'click': L.bind(function(ev) {
					const btn = ev.currentTarget;
					const name = ssid.value.trim(), pass = password.value, enc = encSelect.value;
					if (!name || name.length > 32) { ui.addNotification(null, E('p', {}, ['O nome da rede precisa ter entre 1 e 32 caracteres.']), 'danger'); return; }
					if (enc !== 'none') {
						if (pass.length < 8 || pass.length > 63) { ui.addNotification(null, E('p', {}, ['A senha precisa ter entre 8 e 63 caracteres.']), 'danger'); return; }
						if (pass !== passwordConfirm.value) { ui.addNotification(null, E('p', {}, ['As duas senhas digitadas não conferem.']), 'danger'); return; }
					}
					btn.disabled = true;
					btn.textContent = 'Criando rede Wi‑Fi…';
					return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-add', name, (enc === 'none' ? '' : pass), netSelect.value, bandSelect.value, enc]).then(function(r) {
						if (r.code) throw new Error(r.stderr || 'Falha ao criar rede Wi-Fi');
						ui.hideModal();
						reloadSoon('Nova rede Wi-Fi criada. Reiniciando o rádio…', 1500);
					}).catch(function(e) {
						btn.disabled = false;
						btn.textContent = 'Criar Rede Wi-Fi';
						ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
					});
				}, this) }, ['Criar Rede Wi-Fi'])
			])
		];
		ui.showModal('Adicionar nova rede Wi‑Fi', rows);
		ssid.focus();
	},
	toggleWifiNetwork: function(chk, kind, cfg) {
		const desired = chk.checked;
		const ssidName = (cfg && (cfg.ssid || cfg.ssid2 || cfg.ssid5)) || (kind === 'guest' ? 'Visitantes' : 'Rede principal');

		// Fail-Safe: Se tentar desligar a rede principal, alertar que o acesso sem fio será interrompido
		if (kind === 'main' && !desired) {
			chk.checked = true;
			const modalBody = [
				E('div', { class: 'alert-message warning', style: 'font-size:13px;line-height:1.55;' }, [
					E('strong', { style: 'display:block;margin-bottom:6px;' }, ['⚠️ Desligar a rede Wi‑Fi principal?']),
					E('p', {}, ['Se você estiver conectado ao roteador através desta rede Wi‑Fi, sua conexão sem fio cairá imediatamente.']),
					E('p', {}, ['Para voltar a acessar o painel ou religar o sinal Wi‑Fi, você precisará conectar um cabo de rede em uma das portas LAN.']),
					E('p', { style: 'margin-bottom:0;font-weight:600;' }, ['Deseja realmente desligar o sinal Wi‑Fi agora?'])
				]),
				E('div', { style: 'display:flex;justify-content:flex-end;gap:10px;margin-top:16px;' }, [
					E('button', {
						class: 'btn cbi-button cbi-button-neutral',
						'click': function() { if (window.L && L.ui) L.ui.hideModal(); }
					}, ['Cancelar']),
					E('button', {
						class: 'btn cbi-button cbi-button-reset',
						style: 'font-weight:bold;',
						'click': L.bind(function() {
							if (window.L && L.ui) L.ui.hideModal();
							chk.checked = false;
							this._executeWifiToggle(chk, kind, cfg, false);
						}, this)
					}, ['Sim, Desligar Wi‑Fi'])
				])
			];
			ui.showModal('Confirmar desligamento do Wi‑Fi', modalBody);
			return;
		}

		this._executeWifiToggle(chk, kind, cfg, desired);
	},
	_executeWifiToggle: function(chk, kind, cfg, desired) {
		chk.disabled = true;
		const pill = document.getElementById('ex-' + kind + '-wifi-status');
		if (pill) {
			pill.className = 'ex-pill standby';
			pill.textContent = desired ? 'LIGANDO…' : 'DESLIGANDO…';
		}
		const ssidName = (cfg && (cfg.ssid || cfg.ssid2 || cfg.ssid5)) || (kind === 'guest' ? 'Visitantes' : 'Rede principal');
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-toggle', kind, desired ? '1' : '0'])
		.then(L.bind(function(r) {
			chk.disabled = false;
			if (r.code) throw new Error(r.stderr || 'Falha ao alterar estado do Wi-Fi');
			if (pill) {
				pill.className = 'ex-pill ' + (desired ? 'online' : 'standby');
				pill.textContent = desired ? 'ATIVA' : 'DESLIGADA';
			}
			ui.addNotification(null, E('p', {}, [
				'Wi‑Fi "' + ssidName + '" ' + (desired ? 'ligado com sucesso!' : 'desligado.')
			]), desired ? 'success' : 'info');
		}, this))
		.catch(L.bind(function(e) {
			chk.disabled = false;
			chk.checked = !desired;
			if (pill) {
				pill.className = 'ex-pill ' + (!desired ? 'online' : 'standby');
				pill.textContent = !desired ? 'ATIVA' : 'DESLIGADA';
			}
			const msg = String(e && e.message || e || '');
			if (reloadAfterExpectedDisconnect(msg, 'Wi‑Fi reiniciando. Reconecte caso tenha alterado o sinal sem fio.', 4000)) return;
			ui.addNotification(null, E('p', {}, [msg]), 'danger');
		}, this));
	},
	editWifiNetwork: function(kind, current) {
		current=current||{};
		const isGuest=kind==='guest', enabled=E('input', { type:'checkbox' });
		enabled.checked=String(current.disabled||'0')!=='1';
		const has6g = !!(current.has6g || current.dev6 || (this.currentData && this.currentData.has6g) || (this.capabilities && this.capabilities.has6g));

		const hw = (this.currentData && this.currentData.hardwareInfo) || (this.capabilities && this.capabilities.hardware) || {};
		const silicon = hw.silicon || {};
		const cpu = hw.cpu || {};
		const isLegacyMips = (cpu.arch && cpu.arch.indexOf('mips') >= 0) || silicon.class === 'mips_legacy';
		const isFilogic = silicon.class === 'mediatek_filogic';
		const hasWed = !!silicon.wed_capable;
		const isModernArm = isFilogic || silicon.class === 'broadcom_arm' || (cpu.cores > 1) || (cpu.arch === 'aarch64' || cpu.arch === 'arm');

		let hwWifiBanner = null;
		if (isLegacyMips) {
			hwWifiBanner = E('div', { class: 'alert-message info', style: 'margin-bottom: 12px; font-size: 12px; line-height: 1.45;' }, [
				E('strong', { style: 'display: block; margin-bottom: 3px;' }, ['🔒 ' + _t('Silício MIPS / Atheros Detectado')]),
				_t('Os chips Atheros possuem aceleração de criptografia AES em hardware. O modo WPA2-PSK (AES) entrega a velocidade máxima da rede sem sobrecarregar a CPU. Em 2,4 GHz, recomendamos manter a largura em 20 MHz para evitar retransmissões que afetam a CPU de 1 núcleo.')
			]);
		} else if (isModernArm) {
			const has320 = !!(hw.wifi && hw.wifi.wifi_320) || (current.has6g && current.htmode && current.htmode.indexOf('320') >= 0);
			const bannerDesc = has320
				? _t('Processador com capacidade multicore e aceleração moderna. Suporte nativo a WPA3-SAE com PMF e canais de alta velocidade (80/160/320 MHz) com baixa latência.')
				: _t('Processador com capacidade multicore e aceleração moderna. Suporte nativo a WPA3-SAE com PMF e canais de alta velocidade (80/160 MHz) com baixa latência.');
			hwWifiBanner = E('div', { class: 'alert-message info', style: 'margin-bottom: 12px; font-size: 12px; line-height: 1.45;' }, [
				E('strong', { style: 'display: block; margin-bottom: 3px;' }, ['⚡ ' + _t('Silício Wi-Fi de Alta Performance') + (hasWed ? ' (WED / DMA Direto)' : '')]),
				bannerDesc
			]);
		}

		let init2g = String(current.disabled2 || '0') !== '1' && (current.has2g !== false);
		let init5g = String(current.disabled5 || '0') !== '1' && (current.has5g !== false);
		let init6g = has6g && String(current.disabled6 || '0') !== '1' && (current.has6g !== false);
		if (!init2g && !init5g && !init6g) {
			if (current.has6g) init6g = true;
			else if (current.has5g) init5g = true;
			else init2g = true;
		}

		const band2Input = E('input', { type: 'checkbox' });
		band2Input.checked = init2g;
		const band5Input = E('input', { type: 'checkbox' });
		band5Input.checked = init5g;
		const band6Input = has6g ? E('input', { type: 'checkbox' }) : null;
		if (band6Input) band6Input.checked = init6g;

		const state2Text = E('strong', { class: 'ex-device-switch-state' }, [band2Input.checked ? _t('Ativa') : _t('Desativada')]);
		const state5Text = E('strong', { class: 'ex-device-switch-state' }, [band5Input.checked ? _t('Ativa') : _t('Desativada')]);
		const state6Text = has6g ? E('strong', { class: 'ex-device-switch-state' }, [band6Input.checked ? _t('Ativa') : _t('Desativada')]) : null;

		const split=E('input',{type:'checkbox'});
		split.checked=!!current.split;
		const curEnc=current.encryption||'sae-mixed';
		const encSelect = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'sae-mixed' }, [_t('WPA2 / WPA3 Misto (Mais Seguro)')]),
			E('option', { value: 'psk2' }, [_t('WPA2-PSK (Máxima Compatibilidade IoT)')]),
			E('option', { value: 'sae' }, [_t('WPA3-SAE Puro (Máxima Segurança Moderna)')]),
			E('option', { value: 'none' }, [_t('Sem Senha (Rede Aberta)')])
		]);
		encSelect.value = curEnc;
		const ssid=E('input',{class:'cbi-input-text',value:current.ssid||'',placeholder:isGuest?'Visitantes':'Rede principal',maxlength:32,style:'width:100%'});
		const ssid2=E('input',{class:'cbi-input-text',value:current.ssid2||current.ssid||'',placeholder:isGuest?'Visitantes-2G':'Rede-2G',maxlength:32,style:'width:100%'});
		const ssid5=E('input',{class:'cbi-input-text',value:current.ssid5||current.ssid||'',placeholder:isGuest?'Visitantes-5G':'Rede-5G',maxlength:32,style:'width:100%'});
		const ssid6=has6g ? E('input',{class:'cbi-input-text',value:current.ssid6||current.ssid||'',placeholder:isGuest?'Visitantes-6G':'Rede-6G',maxlength:32,style:'width:100%'}) : null;
		const password=E('input',{type:'password',class:'cbi-input-text',value:'',placeholder:'deixe vazio para manter a senha atual',maxlength:63,autocomplete:'new-password',style:'width:100%'});
		const password2=E('input',{type:'password',class:'cbi-input-text',value:'',placeholder:'repita a nova senha se preencher',maxlength:63,autocomplete:'new-password',style:'width:100%'});
		const show=E('input',{type:'checkbox'});
		show.addEventListener('change',function(){password.type=password2.type=show.checked?'text':'password';});

		const unifiedHint = E('small', { class: 'ex-muted' }, [_t('Aplicado ao 2,4 GHz e ao 5 GHz.')]);
		const unifiedRow=E('label',{class:'ex-device-config-block'},[E('strong',{},[_t('Nome da rede WiFi')]),ssid,unifiedHint]);

		const labelSsid2 = E('strong', {}, [_t('Nome 2,4 GHz')]);
		const labelSsid5 = E('strong', {}, [_t('Nome 5 GHz')]);
		const labelSsid6 = has6g ? E('strong', {}, [_t('Nome 6 GHz')]) : null;

		const splitElements = [
			E('label',{class:'ex-device-config-block'},[labelSsid2,ssid2]),
			E('label',{class:'ex-device-config-block'},[labelSsid5,ssid5])
		];
		if (has6g && labelSsid6 && ssid6) {
			splitElements.push(E('label',{class:'ex-device-config-block'},[labelSsid6,ssid6]));
		}
		const splitRows=E('div',{},splitElements);

		const updateWifiHints = function() {
			const b2 = band2Input.checked;
			const b5 = band5Input.checked;
			const b6 = band6Input ? band6Input.checked : false;

			if (b2 && b5 && b6) {
				unifiedHint.textContent = _t('Transmitindo em 2,4 GHz, 5 GHz e 6 GHz.');
			} else if (b2 && b5) {
				unifiedHint.textContent = _t('Aplicado ao 2,4 GHz e ao 5 GHz.');
			} else if (b2 && !b5 && !b6) {
				unifiedHint.textContent = _t('Transmitindo apenas em 2,4 GHz (5 GHz desativado).');
			} else if (!b2 && b5 && !b6) {
				unifiedHint.textContent = _t('Transmitindo apenas em 5 GHz (2,4 GHz desativado).');
			} else if (!b2 && !b5 && b6) {
				unifiedHint.textContent = _t('Transmitindo apenas em 6 GHz.');
			} else if (b2 && b6) {
				unifiedHint.textContent = _t('Transmitindo em 2,4 GHz e 6 GHz (5 GHz desativado).');
			} else if (b5 && b6) {
				unifiedHint.textContent = _t('Transmitindo em 5 GHz e 6 GHz (2,4 GHz desativado).');
			}

			labelSsid2.textContent = _t('Nome 2,4 GHz') + (b2 ? '' : ' (' + _t('Desativada') + ')');
			ssid2.disabled = !b2;
			ssid2.style.opacity = b2 ? '1' : '0.55';

			labelSsid5.textContent = _t('Nome 5 GHz') + (b5 ? '' : ' (' + _t('Desativada') + ')');
			ssid5.disabled = !b5;
			ssid5.style.opacity = b5 ? '1' : '0.55';

			if (labelSsid6 && ssid6) {
				labelSsid6.textContent = _t('Nome 6 GHz') + (b6 ? '' : ' (' + _t('Desativada') + ')');
				ssid6.disabled = !b6;
				ssid6.style.opacity = b6 ? '1' : '0.55';
			}
		};

		const updateBandStates = function() {
			state2Text.textContent = band2Input.checked ? _t('Ativa') : _t('Desativada');
			state5Text.textContent = band5Input.checked ? _t('Ativa') : _t('Desativada');
			if (state6Text && band6Input) state6Text.textContent = band6Input.checked ? _t('Ativa') : _t('Desativada');
			updateWifiHints();
		};

		let bandNotificationActive = false;
		const validateBandUncheck = function(changedInput) {
			const b2 = band2Input.checked;
			const b5 = band5Input.checked;
			const b6 = band6Input ? band6Input.checked : false;
			if (!b2 && !b5 && !b6) {
				changedInput.checked = true;
				updateBandStates();
				if (!bandNotificationActive) {
					bandNotificationActive = true;
					ui.addNotification(null, E('p', {}, [_t('Ao menos uma frequência deve permanecer ativa nesta rede Wi‑Fi.')]), 'warning');
					setTimeout(function() { bandNotificationActive = false; }, 3000);
				}
				return false;
			}
			updateBandStates();
			return true;
		};

		band2Input.addEventListener('change', function() { validateBandUncheck(band2Input); });
		band5Input.addEventListener('change', function() { validateBandUncheck(band5Input); });
		if (band6Input) band6Input.addEventListener('change', function() { validateBandUncheck(band6Input); });

		const updateSplit=function(){unifiedRow.style.display=split.checked?'none':'block';splitRows.style.display=split.checked?'block':'none';};
		split.addEventListener('change',function(){
			if(split.checked){
				ssid2.value=ssid2.value||ssid.value;
				ssid5.value=ssid5.value||ssid.value;
				if(ssid6) ssid6.value=ssid6.value||ssid.value;
			} else {
				ssid.value=ssid.value||ssid2.value||ssid5.value||(ssid6?ssid6.value:'');
			}
			updateSplit();
		});
		ssid.addEventListener('input', function(){
			if(!split.checked){
				ssid2.value = ssid.value;
				ssid5.value = ssid.value;
				if(ssid6) ssid6.value = ssid.value;
			}
		});
		updateSplit();
		updateWifiHints();

		const passRow1 = E('label',{class:'ex-device-config-block'},[E('strong',{},['Nova senha']),password,E('small',{class:'ex-muted'},['Opcional. Se preencher, use entre 8 e 63 caracteres.'])]);
		const passRow2 = E('label',{class:'ex-device-config-block'},[E('strong',{},['Confirmar nova senha']),password2]);
		const showRow = E('label',{class:'ex-show-password'},[show,E('span',{},['Mostrar senha digitada'])]);

		const encAlert = E('div', { class: 'alert-message', style: 'margin-top: 6px; font-size: 11.5px; display: none;' });
		const updateEncVisibility = function() {
			const encVal = encSelect.value;
			const isNone = encVal === 'none';
			passRow1.style.display = isNone ? 'none' : 'block';
			passRow2.style.display = isNone ? 'none' : 'block';
			showRow.style.display = isNone ? 'none' : 'flex';
			if (encVal === 'psk2') {
				encAlert.className = 'alert-message success';
				encAlert.style.display = 'block';
				if (isLegacyMips) {
					encAlert.innerHTML = '<strong>' + _t('Aceleração em Silício (AES):') + '</strong> ' + _t('Criptografia processada diretamente pelo hardware Atheros/MIPS. Máxima velocidade no ar e 100% compatível com IoT (Tuya/Sonoff) e celulares.');
				} else {
					encAlert.innerHTML = '<strong>' + _t('WPA2-PSK (Compatibilidade Geral):') + '</strong> ' + _t('Recomendado para Casa Inteligente (IoT) e aparelhos legados. Garante conexão estável sem exigir PMF 802.11w.');
				}
			} else if (encVal === 'sae-mixed') {
				encAlert.className = isLegacyMips ? 'alert-message warning' : 'alert-message success';
				encAlert.style.display = 'block';
				if (isLegacyMips) {
					encAlert.innerHTML = '<strong>' + _t('WPA2/WPA3 Misto:') + '</strong> ' + _t('Aparelhos novos usam WPA3 e antigos usam WPA2. Nota: em CPU de 1 núcleo, a autenticação WPA3 consome mais processamento.');
				} else {
					encAlert.innerHTML = '<strong>' + _t('WPA2/WPA3 Misto (Recomendado):') + '</strong> ' + _t('Padrão recomendado para redes modernas. Segurança avançada WPA3 com compatibilidade retroativa para aparelhos WPA2.');
				}
			} else if (encVal === 'sae') {
				encAlert.className = 'alert-message warning';
				encAlert.style.display = 'block';
				encAlert.innerHTML = '<strong>' + _t('WPA3-SAE Puro (Máxima Segurança):') + '</strong> ' + _t('Exige Protected Management Frames (PMF). Dispositivos Smart Home/IoT ou aparelhos legados que não suportam WPA3 não conseguirão se conectar.');
			} else if (encVal === 'none') {
				encAlert.className = 'alert-message danger';
				encAlert.style.display = 'block';
				encAlert.innerHTML = '<strong>' + _t('⚠️ Rede Aberta (Sem Senha):') + '</strong> ' + _t('Qualquer pessoa próxima poderá se conectar e o tráfego não será criptografado.');
			} else {
				encAlert.style.display = 'none';
			}
		};
		encSelect.addEventListener('change', updateEncVisibility);
		updateEncVisibility();

		const bandBlock = E('div', { class: 'ex-device-config-block', style: 'gap: 10px;' }, [
			E('div', {}, [
				E('strong', {}, [_t('Frequências de transmissão ativas')]),
				E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, [
					_t('Escolha quais faixas de rádio transmitem esta rede. Ao menos uma deve permanecer ligada.')
				])
			]),
			E('div', {
				class: 'ex-device-config-heading',
				style: 'padding: 10px 12px; border-radius: 8px; background: rgba(127,127,127,.06); border: 1px solid rgba(127,127,127,.12);'
			}, [
				E('div', { style: 'display: flex; flex-direction: column; gap: 2px; min-width: 0;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
						E('span', { class: 'ex-wifi-band-badge', style: 'font-size: 11px; padding: 2px 7px; background: rgba(245,158,11,.15); color: #f59e0b; border-radius: 4px; font-weight: 750;' }, ['2.4 GHz']),
						E('strong', { style: 'font-size: 13.5px;' }, ['2,4 GHz'])
					]),
					E('small', { class: 'ex-muted', style: 'font-size: 11.5px; line-height: 1.3;' }, [_t('Maior alcance e travessia de paredes. Ideal para Smart Home / IoT.')])
				]),
				E('div', { class: 'ex-device-switch-control', style: 'flex: 0 0 auto;' }, [
					state2Text,
					E('label', { class: 'ex-switch', 'aria-label': _t('Ativar frequência 2,4 GHz') }, [
						band2Input,
						E('span', { class: 'ex-switch-slider' })
					])
				])
			]),
			E('div', {
				class: 'ex-device-config-heading',
				style: 'padding: 10px 12px; border-radius: 8px; background: rgba(127,127,127,.06); border: 1px solid rgba(127,127,127,.12);'
			}, [
				E('div', { style: 'display: flex; flex-direction: column; gap: 2px; min-width: 0;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
						E('span', { class: 'ex-wifi-band-badge', style: 'font-size: 11px; padding: 2px 7px; background: rgba(59,130,246,.15); color: #3b82f6; border-radius: 4px; font-weight: 750;' }, ['5 GHz']),
						E('strong', { style: 'font-size: 13.5px;' }, ['5 GHz'])
					]),
					E('small', { class: 'ex-muted', style: 'font-size: 11.5px; line-height: 1.3;' }, [_t('Maior velocidade e menor interferência. Recomendado para celulares, PCs e TVs.')])
				]),
				E('div', { class: 'ex-device-switch-control', style: 'flex: 0 0 auto;' }, [
					state5Text,
					E('label', { class: 'ex-switch', 'aria-label': _t('Ativar frequência 5 GHz') }, [
						band5Input,
						E('span', { class: 'ex-switch-slider' })
					])
				])
			])
		]);

		if (has6g && band6Input) {
			bandBlock.appendChild(E('div', {
				class: 'ex-device-config-heading',
				style: 'padding: 10px 12px; border-radius: 8px; background: rgba(127,127,127,.06); border: 1px solid rgba(127,127,127,.12);'
			}, [
				E('div', { style: 'display: flex; flex-direction: column; gap: 2px; min-width: 0;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
						E('span', { class: 'ex-wifi-band-badge', style: 'font-size: 11px; padding: 2px 7px; background: rgba(16,185,129,.15); color: #10b981; border-radius: 4px; font-weight: 750;' }, ['6 GHz']),
						E('strong', { style: 'font-size: 13.5px;' }, ['6 GHz (Wi‑Fi 6E / 7)'])
					]),
					E('small', { class: 'ex-muted', style: 'font-size: 11.5px; line-height: 1.3;' }, [_t('Ultra velocidade com canais de 320 MHz e baixíssima latência.')])
				]),
				E('div', { class: 'ex-device-switch-control', style: 'flex: 0 0 auto;' }, [
					state6Text,
					E('label', { class: 'ex-switch', 'aria-label': _t('Ativar frequência 6 GHz') }, [
						band6Input,
						E('span', { class: 'ex-switch-slider' })
					])
				])
			]));
		}

		const rows=[
			hwWifiBanner,
			E('label',{class:'ex-device-config-block'},[E('strong',{},[_t('Segurança / Criptografia')]),encSelect,encAlert]),
			bandBlock,
			E('label',{class:'ex-show-password'},[split,E('span',{},[has6g ? _t('Separar nomes 2,4 GHz, 5 GHz e 6 GHz') : _t('Separar nomes 2,4 GHz e 5 GHz')])]),
			unifiedRow,
			splitRows
		].filter(Boolean);
		let guestDownInput=null, guestUpInput=null;
		if(isGuest){
			rows.push(E('div',{class:'ex-device-config-block'},[E('div',{class:'ex-device-config-heading'},[E('div',{},[E('strong',{},['Rede visitante']),E('small',{class:'ex-muted'},['Liga ou desliga o SSID visitante sem apagar a configuração.'])]),E('div',{class:'ex-device-switch-control'},[E('strong',{class:'ex-device-switch-state'},[enabled.checked?'Ligada':'Desligada']),E('label',{class:'ex-switch'},[enabled,E('span',{class:'ex-switch-slider'})])])])]));
			const qosValues=values((this.currentData||{}).qos), qosGuest=qosValues.guest||{}, qosMain=qosValues.main||{};
			const curGuestDown=qosGuest.download_kbps||qosMain.guest_download_kbps||20000;
			const curGuestUp=qosGuest.upload_kbps||qosMain.guest_upload_kbps||20000;
			guestDownInput=E('input',{type:'number',class:'cbi-input-text',value:kbpsToMbpsInput(curGuestDown),placeholder:'20',min:'0',max:'2500',step:'1',style:'width:100%'});
			guestUpInput=E('input',{type:'number',class:'cbi-input-text',value:kbpsToMbpsInput(curGuestUp),placeholder:'20',min:'0',max:'2500',step:'1',style:'width:100%'});
			rows.push(E('div',{class:'ex-device-config-block'},[
				E('strong',{},['Limite de velocidade']),
				E('div',{class:'ex-grid ex-grid-2',style:'margin-top:8px;gap:10px;'},[
					E('label',{},[E('small',{class:'ex-muted'},['Download (Mbps)']),guestDownInput]),
					E('label',{},[E('small',{class:'ex-muted'},['Upload (Mbps)']),guestUpInput])
				]),
				E('small',{class:'ex-muted'},['Limita a velocidade total compartilhada entre todos os visitantes. 0 = Ilimitado.'])
			]));
		}
		rows.push(passRow1);
		rows.push(passRow2);
		rows.push(showRow);
		if(current.kind === 'extra' || String(kind).indexOf('extra_') === 0 || (kind !== 'main' && kind !== 'guest')){
			const deleteBox = E('div', { class: 'ex-device-config-block', style: 'border:1px solid rgba(239,68,68,.3);background:rgba(239,68,68,.05);padding:12px;margin-top:14px;border-radius:12px;' });
			const deleteConfirmBox = E('div', { style: 'display:none;margin-top:10px;padding:12px;border-radius:10px;background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35);' });
			
			const btnDeleteInitial = E('button', { class: 'btn cbi-button cbi-button-reset', type: 'button', style: 'margin-top:4px;' }, [ '🗑️ Excluir esta rede Wi‑Fi' ]);
			const btnDeleteConfirm = E('button', { class: 'btn cbi-button cbi-button-reset', type: 'button', style: 'font-weight:750;' }, [ 'Sim, excluir permanentemente' ]);
			const btnDeleteCancel = E('button', { class: 'btn cbi-button cbi-button-neutral', type: 'button', style: 'margin-left:8px;' }, [ 'Não, cancelar' ]);

			btnDeleteInitial.addEventListener('click', function() {
				btnDeleteInitial.style.display = 'none';
				deleteConfirmBox.style.display = 'block';
			});

			btnDeleteCancel.addEventListener('click', function() {
				deleteConfirmBox.style.display = 'none';
				btnDeleteInitial.style.display = 'inline-block';
			});

			btnDeleteConfirm.addEventListener('click', L.bind(function(ev) {
				const btn = ev.currentTarget;
				btn.disabled = true;
				btnDeleteCancel.disabled = true;
				btn.textContent = 'Excluindo rede…';
				const targetId = current.id || kind;
				return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-delete', targetId]).then(L.bind(function(r) {
					if (r.code) throw new Error(r.stderr || 'Falha ao excluir rede Wi-Fi');
					ui.hideModal();
					reloadSoon('Rede Wi‑Fi excluída com sucesso. Recarregando…', 1200);
				}, this)).catch(function(e) {
					btn.disabled = false;
					btnDeleteCancel.disabled = false;
					btn.textContent = 'Sim, excluir permanentemente';
					if (reloadAfterExpectedDisconnect(e, 'Rede Wi‑Fi excluída. O rádio está reiniciando…', 2000)) return;
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				});
			}, this));

			deleteConfirmBox.appendChild(E('p', { style: 'margin:0 0 10px;font-size:0.84rem;color:#fca5a5;line-height:1.4;' }, [
				'⚠️ Tem certeza que deseja excluir esta rede Wi‑Fi? Esta ação removerá o SSID do rádio e desconectará os aparelhos associados a ela.'
			]));
			deleteConfirmBox.appendChild(E('div', {}, [ btnDeleteConfirm, btnDeleteCancel ]));

			deleteBox.appendChild(E('strong', { style: 'color:#ef4444;' }, ['Zona de exclusão']));
			deleteBox.appendChild(E('p', { class: 'ex-muted', style: 'margin:3px 0 6px;font-size:0.83rem;' }, ['Esta rede Wi‑Fi adicional pode ser removida se não for mais necessária.']));
			deleteBox.appendChild(btnDeleteInitial);
			deleteBox.appendChild(deleteConfirmBox);
			rows.push(deleteBox);
		}
		rows.push(E('p',{class:'alert-message warning'},['Ao salvar, o Wi‑Fi reiniciará e aparelhos dessa rede poderão precisar reconectar.']));
		rows.push(E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
			const btn = ev.currentTarget;
			const b2 = band2Input.checked;
			const b5 = band5Input.checked;
			const b6 = band6Input ? band6Input.checked : false;
			if (!b2 && !b5 && !b6) {
				ui.addNotification(null, E('p', {}, [_t('Ao menos uma frequência deve permanecer ativa nesta rede Wi‑Fi.')]), 'danger');
				return;
			}
			const name=ssid.value.trim(), name2=ssid2.value.trim(), name5=ssid5.value.trim(), name6=(ssid6?ssid6.value.trim():''), pass=password.value, isSplit=split.checked, enc=encSelect.value;
			if (!isSplit) {
				if (!name || name.length > 32) {
					ui.addNotification(null, E('p', {}, [_t('O nome da rede precisa ter entre 1 e 32 caracteres.')]), 'danger');
					return;
				}
			} else {
				if (b2 && (!name2 || name2.length > 32)) {
					ui.addNotification(null, E('p', {}, [_t('O nome da rede 2,4 GHz precisa ter entre 1 e 32 caracteres.')]), 'danger');
					return;
				}
				if (b5 && (!name5 || name5.length > 32)) {
					ui.addNotification(null, E('p', {}, [_t('O nome da rede 5 GHz precisa ter entre 1 e 32 caracteres.')]), 'danger');
					return;
				}
				if (b6 && (!name6 || name6.length > 32)) {
					ui.addNotification(null, E('p', {}, [_t('O nome da rede 6 GHz precisa ter entre 1 e 32 caracteres.')]), 'danger');
					return;
				}
			}
			if(enc !== 'none' && (pass||password2.value)){
				if(pass.length<8||pass.length>63){ui.addNotification(null,E('p',{},['A senha precisa ter entre 8 e 63 caracteres.']),'danger');return;}
				if(pass!==password2.value){ui.addNotification(null,E('p',{},['As duas senhas digitadas não são iguais.']),'danger');return;}
			}
			btn.disabled = true;
			btn.textContent = 'Salvando Wi‑Fi…';
			const args=['wifi-settings',kind,'split='+(isSplit?'1':'0'),'ssid='+name,'ssid2='+(isSplit?name2:name),'ssid5='+(isSplit?name5:name),'encryption='+enc,'enabled='+(isGuest?(enabled.checked?'1':'0'):'keep'),'enable_2g='+(b2?'1':'0'),'enable_5g='+(b5?'1':'0')];
			if (has6g) {
				args.push('enable_6g=' + (b6 ? '1' : '0'));
				args.push('ssid6=' + (isSplit ? name6 : name));
			}
			if(pass)args.push('password='+pass);
			if(isGuest&&guestDownInput&&guestUpInput){
				const gDown=mbpsToKbps(guestDownInput.value)||'0', gUp=mbpsToKbps(guestUpInput.value)||'0';
				args.push('guest_download='+gDown, 'guest_upload='+gUp);
			}
			return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar Wi‑Fi');ui.hideModal();reloadSoon('Configuração do Wi‑Fi salva. Recarregando após reiniciar o rádio…',1500);}).catch(function(e){btn.disabled = false; btn.textContent = 'Salvar Wi‑Fi'; const msg=String(e&&e.message||e||'');if(reloadAfterExpectedDisconnect(msg,'Wi‑Fi reiniciando. Se a alteração foi aplicada, reconecte na rede nova e recarregue o painel…',2000))return;ui.addNotification(null,E('p',{},[msg]),'danger');});
		},this)},['Salvar Wi‑Fi'])]));
		ui.showModal((isGuest?'Editar rede visitante':'Editar rede principal'),rows);
		ssid.focus();
		if(isGuest){enabled.addEventListener('change',function(){const st=enabled.closest('.ex-device-config-block').querySelector('.ex-device-switch-state');if(st)st.textContent=enabled.checked?'Ligada':'Desligada';});}
	},
	showManualChannelsModal: function() {
		const cur = this.currentWifiChannels();
		const ch2Select = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'auto' }, ['Automático Inteligente (1, 6 ou 11)']),
			E('option', { value: '1' }, ['Canal 1 (2412 MHz — Recomendado / Sem sobreposição)']),
			E('option', { value: '2' }, ['Canal 2 (2417 MHz — Sobreposição com canais 1 e 6)']),
			E('option', { value: '3' }, ['Canal 3 (2422 MHz — Sobreposição com canais 1 e 6)']),
			E('option', { value: '4' }, ['Canal 4 (2427 MHz — Sobreposição com canais 1 e 6)']),
			E('option', { value: '5' }, ['Canal 5 (2432 MHz — Sobreposição com canais 1 e 6)']),
			E('option', { value: '6' }, ['Canal 6 (2437 MHz — Recomendado / Sem sobreposição)']),
			E('option', { value: '7' }, ['Canal 7 (2442 MHz — Sobreposição com canais 6 e 11)']),
			E('option', { value: '8' }, ['Canal 8 (2447 MHz — Sobreposição com canais 6 e 11)']),
			E('option', { value: '9' }, ['Canal 9 (2452 MHz — Sobreposição com canais 6 e 11)']),
			E('option', { value: '10' }, ['Canal 10 (2457 MHz — Sobreposição com canais 6 e 11)']),
			E('option', { value: '11' }, ['Canal 11 (2462 MHz — Recomendado / Sem sobreposição)'])
		]);
		ch2Select.value = cur.two || 'auto';

		const ch2Note = E('div', { class: 'alert-message info', style: 'margin-top: 6px; font-size: 11.5px; display: none;' });
		const updateCh2Note = function() {
			const v = ch2Select.value;
			if (v === '1' || v === '6' || v === '11') {
				ch2Note.className = 'alert-message success';
				ch2Note.textContent = '✅ Canal 100% limpo de sobreposição: padrão ouro da indústria para estabilidade de IoT (lâmpadas, tomadas, câmeras) e celulares.';
				ch2Note.style.display = 'block';
			} else if (v === 'auto') {
				ch2Note.className = 'alert-message success';
				ch2Note.textContent = '✅ Modo Auto Inteligente: o roteador avaliará o espectro e operará estritamente nos canais 1, 6 ou 11 para eliminar sobreposições de vizinhos.';
				ch2Note.style.display = 'block';
			} else {
				ch2Note.className = 'alert-message warning';
				ch2Note.textContent = '⚠️ Canal com sobreposição espectral: causa interferência adjacente (ACI) com vizinhos, aumentando perda de pacotes em dispositivos fracos. Prefira 1, 6 ou 11.';
				ch2Note.style.display = 'block';
			}
		};
		ch2Select.addEventListener('change', updateCh2Note);
		updateCh2Note();

		const has160Support = !!(this.capabilities && this.capabilities.hardware && this.capabilities.hardware.wifi_160_supported);
		const unii1Label = has160Support
			? 'UNII-1 — Livre de DFS / Recomendado (Suporta 80/160 MHz)'
			: 'UNII-1 — Livre de DFS / Recomendado (Até 80 MHz)';
		const ch36Desc = has160Support
			? 'Canal 36 (5180 MHz — Recomendado / Âncora 160 MHz / Sem DFS)'
			: 'Canal 36 (5180 MHz — Recomendado / Sem DFS / Até 80 MHz)';
		const ch40Desc = has160Support
			? 'Canal 40 (5200 MHz — Seguro / Compatível com 160 MHz)'
			: 'Canal 40 (5200 MHz — Seguro / Sem DFS / Até 80 MHz)';
		const ch44Desc = has160Support
			? 'Canal 44 (5220 MHz — Seguro / Compatível com 160 MHz)'
			: 'Canal 44 (5220 MHz — Seguro / Sem DFS / Até 80 MHz)';
		const ch48Desc = has160Support
			? 'Canal 48 (5240 MHz — Seguro / Compatível com 160 MHz)'
			: 'Canal 48 (5240 MHz — Seguro / Sem DFS / Até 80 MHz)';

		const ch5Select = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'auto' }, ['Automático Inteligente (Sem DFS / Inicialização imediata)']),
			E('optgroup', { label: unii1Label }, [
				E('option', { value: '36' }, [ch36Desc]),
				E('option', { value: '40' }, [ch40Desc]),
				E('option', { value: '44' }, [ch44Desc]),
				E('option', { value: '48' }, [ch48Desc])
			]),
			E('optgroup', { label: 'UNII-3 — Livre de DFS & Alta Potência TX (Máx 80 MHz)' }, [
				E('option', { value: '149' }, ['Canal 149 (5745 MHz — Recomendado / Maior Potência / Sem DFS)']),
				E('option', { value: '153' }, ['Canal 153 (5765 MHz — Alta Potência / Sem DFS)']),
				E('option', { value: '157' }, ['Canal 157 (5785 MHz — Alta Potência / Sem DFS)']),
				E('option', { value: '161' }, ['Canal 161 (5805 MHz — Alta Potência / Sem DFS)']),
				E('option', { value: '165' }, ['Canal 165 (5825 MHz — Alta Potência / Somente 20 MHz)'])
			]),
			E('optgroup', { label: 'Canais DFS — Espectro Limpo (Espera CAC de 60s)' }, [
				E('option', { value: '52' }, [has160Support ? 'Canal 52 (5260 MHz — DFS Bloco 2A / Extensão 160 MHz)' : 'Canal 52 (5260 MHz — DFS Bloco 2A)']),
				E('option', { value: '56' }, ['Canal 56 (5280 MHz — DFS Bloco 2A)']),
				E('option', { value: '60' }, ['Canal 60 (5300 MHz — DFS Bloco 2A)']),
				E('option', { value: '64' }, ['Canal 64 (5320 MHz — DFS Bloco 2A)']),
				E('option', { value: '100' }, ['Canal 100 (5500 MHz — DFS Espectro Limpo)']),
				E('option', { value: '104' }, ['Canal 104 (5520 MHz — DFS Espectro Limpo)']),
				E('option', { value: '108' }, ['Canal 108 (5540 MHz — DFS Espectro Limpo)']),
				E('option', { value: '112' }, ['Canal 112 (5560 MHz — DFS Espectro Limpo)']),
				E('option', { value: '116' }, ['Canal 116 (5580 MHz — DFS Espectro Limpo)']),
				E('option', { value: '132' }, ['Canal 132 (5660 MHz — DFS Espectro Limpo / Máx 80 MHz)']),
				E('option', { value: '136' }, ['Canal 136 (5680 MHz — DFS Espectro Limpo / Máx 80 MHz)']),
				E('option', { value: '140' }, ['Canal 140 (5700 MHz — DFS Espectro Limpo / Máx 80 MHz)']),
				E('option', { value: '144' }, ['Canal 144 (5720 MHz — DFS Espectro Limpo / Máx 80 MHz)'])
			]),
			E('optgroup', { label: '⚠️ TDWR — Radares Meteorológicos (EVITAR / 10 Minutos de Espera)' }, [
				E('option', { value: '120' }, ['Canal 120 (5600 MHz — ⚠️ Radar TDWR / Espera obrigatória de 10 min)']),
				E('option', { value: '124' }, ['Canal 124 (5620 MHz — ⚠️ Radar TDWR / Espera obrigatória de 10 min)']),
				E('option', { value: '128' }, ['Canal 128 (5640 MHz — ⚠️ Radar TDWR / Espera obrigatória de 10 min)'])
			])
		]);
		ch5Select.value = cur.five || 'auto';

		const wConf = wifiConfig(this.currentData && this.currentData.wireless || {});
		const radio5Obj = wConf.r5g || wConf.r1 || {};
		const is160Mode = String(radio5Obj.htmode || '').indexOf('160') >= 0;
		const ch5Note = E('div', { class: 'alert-message info', style: 'margin-top: 6px; font-size: 11.5px; display: none;' });
		const updateCh5Note = function() {
			const num = Number(ch5Select.value);
			if (ch5Select.value === 'auto') {
				ch5Note.className = 'alert-message success';
				ch5Note.textContent = '✅ Modo Auto Inteligente: o roteador selecionará dinamicamente o melhor canal nas faixas UNII-1 e UNII-3, evitando completamente radares DFS (zero espera de CAC, sem quedas e total compatibilidade com Smart TVs e consoles).';
				ch5Note.style.display = 'block';
			} else if (num === 120 || num === 124 || num === 128) {
				ch5Note.className = 'alert-message danger';
				ch5Note.textContent = '⚠️ ALERTA TDWR: Os canais 120 a 128 são reservados para radares meteorológicos Doppler. Por exigência regulatória estrita da Anatel, o roteador deve aguardar 10 MINUTOS (600s) de silêncio absoluto (CAC) antes de ativar o Wi-Fi. Evite estes canais para não ficar sem rede 5 GHz após reinicializações!';
				ch5Note.style.display = 'block';
			} else if (is160Mode && num >= 132) {
				ch5Note.className = 'alert-message warning';
				ch5Note.textContent = 'ℹ️ O canal ' + ch5Select.value + ' opera em no máximo 80 MHz. A largura do 5 GHz será ajustada automaticamente para 80 MHz ao salvar para garantir estabilidade.';
				ch5Note.style.display = 'block';
			} else if ([52, 56, 60, 64, 100, 104, 108, 112, 116, 132, 136, 140, 144].indexOf(num) >= 0) {
				ch5Note.className = 'alert-message info';
				ch5Note.textContent = 'ℹ️ Canal DFS: Ao reiniciar ou aplicar, o roteador realiza 60 segundos de escuta inicial silenciosa (CAC) para checagem de radar antes de transmitir.';
				ch5Note.style.display = 'block';
			} else if ([36, 40, 44, 48].indexOf(num) >= 0) {
				ch5Note.className = 'alert-message success';
				ch5Note.textContent = '✅ Faixa UNII-1: 100% livre de DFS/radar (CAC = 0s, inicialização instantânea). ' + (has160Support ? 'Recomendado como âncora para 160 MHz.' : 'Recomendado para máxima estabilidade em 80 MHz.');
				ch5Note.style.display = 'block';
			} else if ([149, 153, 157, 161, 165].indexOf(num) >= 0) {
				ch5Note.className = 'alert-message success';
				ch5Note.textContent = '✅ Faixa UNII-3: 100% livre de DFS, permite potências de transmissão maiores (até 1W / 30 dBm) para alcance expandido. Opera em até 80 MHz.';
				ch5Note.style.display = 'block';
			} else {
				ch5Note.style.display = 'none';
			}
		};
		ch5Select.addEventListener('change', updateCh5Note);
		updateCh5Note();

		const ch5HelpText = has160Support
			? 'Canais 36-48 e 149-165 não usam DFS (sem pausas por radar). Canais 36-48 suportam 160 MHz; canais 149-165 operam em até 80 MHz.'
			: 'Canais 36-48 e 149-165 não usam DFS (sem pausas por radar). Este hardware opera com canais de até 80 MHz (VHT80) para máxima estabilidade.';

		const isEcoHw = this.isEconomicHardware ? this.isEconomicHardware(this.currentData) : false;
		const ecoWifiTip = isEcoHw ? E('div', { class: 'alert-message info', style: 'margin-top: 6px; font-size: 11.5px; line-height: 1.4;' }, [
			E('strong', {}, ['💡 ' + _t('Dica para CPU de 1 Núcleo / MIPS:') + ' ']),
			_t('Em 2,4 GHz, manter a largura em 20 MHz (HT20) evita colisões de canal de 40 MHz que sobrecarregam a CPU com erros de CRC.')
		]) : '';

		const rows = [
			E('label', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['Canal 2,4 GHz']),
				ch2Select,
				ch2Note,
				ecoWifiTip,
				E('small', { class: 'ex-muted' }, ['Canais 1, 6 e 11 são os únicos sem sobreposição no 2,4 GHz. Dica: use 20 MHz (HT20) para total estabilidade de automação residencial e IoT.'])
			]),
			E('label', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['Canal 5 GHz']),
				ch5Select,
				ch5Note,
				E('small', { class: 'ex-muted' }, [ch5HelpText])
			]),
			E('p', { class: 'alert-message warning' }, ['Ao aplicar, os rádios Wi‑Fi reiniciarão no novo canal selecionado.']),
			E('div', { class: 'right' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': closeModal }, ['Cancelar']),
				' ',
				E('button', { class: 'btn cbi-button cbi-button-positive', 'click': L.bind(function(ev) {
					const btn = ev.currentTarget;
					btn.disabled = true;
					btn.textContent = 'Aplicando canais…';
					return fs.exec('/usr/sbin/equipe-dashboard-control', ['channels', 'set', ch2Select.value, ch5Select.value]).then(function(r) {
						if (r.code) throw new Error(r.stderr || 'Falha ao aplicar os canais');
						ui.hideModal();
						reloadSoon('Novos canais Wi-Fi aplicados. Recarregando…', 1500);
					}).catch(function(e) {
						btn.disabled = false;
						btn.textContent = 'Aplicar canais';
						ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
					});
				}, this) }, ['Aplicar canais'])
			])
		];
		ui.showModal('Escolher canais Wi‑Fi manualmente', rows);
	},
	analyzeChannels: function(button) {
		const apply=document.getElementById('ex-apply-channels'); button.disabled=true; if(apply)apply.disabled=true; button.textContent='Analisando…'; text('ex-scan-result','O Wi‑Fi permanece ativo durante a análise.');
		const topology=(this.currentData&&this.currentData.wifiTopology)||wifiTopology({});
		return Promise.all([safe(callScan(topology.scan2),{results:[]}),safe(callScan(topology.scan5),{results:[]}),safe(callFreqList(topology.scan2),{results:[]}),safe(callFreqList(topology.scan5),{results:[]})]).then(L.bind(function(r){
			const a=r[0].results||[], b=r[1].results||[], score2={1:0,6:0,11:0}; a.forEach(function(n){[1,6,11].forEach(function(c){const d=Math.abs((Number(n.channel)||0)-c);if(d<5)score2[c]+=(5-d)*Math.pow(10,((Number(n.signal)||-100)+100)/20);});});
			const allowed2=(r[2].results||[]).filter(function(x){return !x.restricted&&[1,6,11].indexOf(Number(x.channel))>=0;}).map(function(x){return String(x.channel);}); Object.keys(score2).forEach(function(c){if(allowed2.length&&allowed2.indexOf(c)<0)delete score2[c];});
			const wConf = wifiConfig(this.currentData && this.currentData.wireless || {});
			const radio5Obj = wConf.r5g || wConf.r1 || {};
			const is160Mode = String(radio5Obj.htmode || '').indexOf('160') >= 0;
			const allowed5Pool = is160Mode ? [36,40,44,48] : [36,40,44,48,149,153,157,161];
			let candidates=(r[3].results||[]).filter(function(x){return !x.restricted&&allowed5Pool.indexOf(Number(x.channel))>=0;}).map(function(x){return Number(x.channel);}); if(!candidates.length)candidates=[36,40,44,48];
			const score5={}; candidates.forEach(function(c){score5[c]=0;}); b.forEach(function(n){candidates.forEach(function(c){if(Math.abs((Number(n.channel)||0)-c)<=12)score5[c]+=Math.pow(10,((Number(n.signal)||-100)+100)/20);});});
			const best2=Object.keys(score2).sort(function(x,y){return score2[x]-score2[y];})[0]||'1', best5=candidates.sort(function(x,y){return score5[x]-score5[y];})[0], current=this.currentWifiChannels(), already=current.two===String(best2)&&current.five===String(best5);
			this.recommendedChannels={two:String(best2),five:String(best5),alreadyApplied:already};
			text('ex-scan-result','Encontradas '+a.length+' redes em 2,4 GHz e '+b.length+' em 5 GHz. Sugestão: canal '+best2+' no 2,4 GHz e '+best5+' no 5 GHz. '+(already?'Esses canais já estão em uso; nenhuma alteração é necessária.':'Nenhuma alteração foi feita.'));
			if(apply){apply.disabled=already;apply.textContent=already?'Sugestão já aplicada':'Aplicar sugestão: '+best2+' / '+best5;}
		},this)).catch(function(e){text('ex-scan-result','Não foi possível concluir: '+e.message);}).finally(function(){button.disabled=false;button.textContent='Analisar canais agora';});
	},
	toggleAutoChannels: function(toggle) {
		const w=wifiConfig(this.currentData.wireless), isAuto=String(w.r0.channel||'auto')==='auto'&&String(w.r1.channel||'auto')==='auto';
		toggle.checked=isAuto;
		if(isAuto){
			if(!this.recommendedChannels){ui.addNotification(null,E('p',{},['Para desligar o automático, analise os canais primeiro. Depois, desligue esta chave ou use “Aplicar sugestão”.']));return;}
			this.changeChannels('fixed');
		}else this.changeChannels('auto');
	},
	changeChannels: function(mode) {
		const suggested=this.recommendedChannels, fixed=mode==='fixed';
		if(fixed&&!suggested){ui.addNotification(null,E('p',{},['Execute a análise de canais antes de aplicar uma sugestão.']));return;}
		if(fixed&&suggested.alreadyApplied){ui.addNotification(null,E('p',{},['Os canais sugeridos já estão aplicados. Nenhuma alteração foi feita.']));return;}
		const description=fixed?('Fixar canal '+suggested.two+' no 2,4 GHz e '+suggested.five+' no 5 GHz?'):'Ativar o Modo Auto Inteligente nas duas bandas? O roteador selecionará os melhores canais limpos (1, 6 ou 11 no 2,4 GHz e faixas livres de radares DFS no 5 GHz para máxima compatibilidade e sem quedas).';
		ui.showModal(fixed?'Aplicar canais sugeridos':'Ativar Seleção Automática Inteligente',[
			E('p',{},[description]),
			E('p',{class:'alert-message warning'},['A alteração reiniciará as duas bandas do Wi‑Fi e desconectará temporariamente os aparelhos conectados.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){const args=['channels',mode];if(fixed)args.push(suggested.two,suggested.five);return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao aplicar os canais');ui.hideModal();reloadSoon(fixed?'Canais sugeridos salvos. Recarregando após reiniciar o Wi‑Fi…':'Modo Auto Inteligente ativado. Recarregando após reiniciar o Wi‑Fi…',1500);}).catch(L.bind(function(e){if(reloadAfterExpectedDisconnect(e,fixed?'Canais enviados. O Wi‑Fi está reiniciando; recarregando o painel…':'Modo automático enviado. O Wi‑Fi está reiniciando; recarregando o painel…',2000))return;this.updateWifi(this.currentData);ui.addNotification(null,E('p',{},[e.message]));},this));},this)},[fixed?'Confirmar e aplicar':'Confirmar modo automático'])])
		]);
	},
	optimizeIot: function() {
		ui.showModal('Otimização IoT (Casa Inteligente)', [
			E('p', { class: 'alert-message info' }, [
				'A otimização IoT elimina a necessidade de manutenção de taxas muito antigas (1 Mbps a 2 Mbps - padrão 802.11b) na rede de 2.4 GHz, forçando uma base mais rápida e eficiente.'
			]),
			E('ul', { style: 'margin-left: 20px;' }, [
				E('li', {}, ['Libera até 40% a mais de tempo de antena (airtime).']),
				E('li', {}, ['Aumenta a estabilidade geral da rede Wi-Fi.']),
				E('li', {}, ['Não afeta dispositivos modernos ou a maioria esmagadora de equipamentos Casa Inteligente (que usam o padrão "G" ou "N").'])
			]),
			E('div', { class: 'right', style: 'margin-top: 15px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': ui.hideModal }, ['Cancelar']),
				' ',
				E('button', { class: 'btn cbi-button cbi-button-positive', 'click': L.bind(function(ev) {
					const btn = ev.currentTarget;
					btn.disabled = true;
					btn.textContent = 'Aplicando...';
					return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-iot-optimize']).then(function(r) {
						if (r.code) throw new Error(r.stderr || 'Falha ao aplicar otimização IoT');
						ui.hideModal();
						ui.addNotification(null, E('p', {}, ['Otimização IoT aplicada com sucesso! Seu Wi-Fi de 2.4 GHz agora roda com maior eficiência no ar.']), 'info');
					}).catch(function(e) {
						btn.disabled = false;
						btn.textContent = 'Aplicar otimização';
						ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
					});
				}, this) }, ['Aplicar otimização'])
			])
		]);
	},
	optimizeDfs: function() {
		ui.showModal('Otimização de Quedas (Radar DFS)', [
			E('p', { class: 'alert-message info' }, [
				'Ativa o protocolo "802.11h CSA (Channel Switch Announcement)" na rede 5 GHz. Se o roteador detectar um radar meteorológico, em vez de derrubar sua rede abruptamente, ele anunciará aos dispositivos para mudarem de canal sem desconectar.'
			]),
			E('ul', { style: 'margin-left: 20px;' }, [
				E('li', {}, ['Mantém chamadas, jogos e downloads ativos mesmo durante mudança forçada de canal.']),
				E('li', {}, ['Aumenta substancialmente a estabilidade em canais DFS (52 ao 144).']),
				E('li', {}, ['Compatível com qualquer celular ou placa de rede dos últimos 10 anos.'])
			]),
			E('div', { class: 'right', style: 'margin-top: 15px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', 'click': ui.hideModal }, ['Cancelar']),
				' ',
				E('button', { class: 'btn cbi-button cbi-button-positive', 'click': L.bind(function(ev) {
					const btn = ev.currentTarget;
					btn.disabled = true;
					btn.textContent = 'Aplicando...';
					return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-dfs-optimize']).then(function(r) {
						if (r.code) throw new Error(r.stderr || 'Falha ao aplicar otimização DFS');
						ui.hideModal();
						ui.addNotification(null, E('p', {}, ['Protocolo 802.11h CSA ativado com sucesso no 5 GHz! Sua rede agora fará transição inteligente em caso de radares.']), 'info');
					}).catch(function(e) {
						btn.disabled = false;
						btn.textContent = 'Aplicar otimização';
						ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
					});
				}, this) }, ['Ativar Protocolo'])
			])
		]);
	},
	changeWifiWidth: function() {
		const w=wifiConfig(this.currentData.wireless);
		const radio2 = (w.r0.hwmode === '11g' || String(w.r0.band||'').indexOf('2') === 0) ? w.r0 : w.r1;
		const radio5 = (radio2 === w.r0) ? w.r1 : w.r0;
		const curCh5 = Number(radio5.channel || 0);
		const widthFrom=function(ht){const m=String(ht||'').match(/(20|40|80|160|320)/);return m?m[1]:'';};
		const select=function(value,items){const s=E('select',{class:'cbi-input-select'},items.map(function(i){return E('option',{value:i[0]},[i[1]]);}));s.value=value;return s;};
		const w2=select(widthFrom(radio2.htmode)||'20',[['20','20 MHz — mais alcance/estabilidade'],['40','40 MHz — mais rápido, mais interferência']]);
		
		const hw = this.capabilities.hardware || {};
		const has160 = !!(hw.wifi_160_supported || (hw.wifi && hw.wifi.wifi_160));
		const has320 = !!(hw.wifi_320_supported || (hw.wifi && hw.wifi.wifi_320));
		const items5 = [['80','80 MHz — mais compatível/estável']];
		if (has160) {
			items5.push(['160','160 MHz — velocidade máxima perto do roteador']);
		}
		if (has320) {
			items5.push(['320','320 MHz — taxa extrema de dados (Wi-Fi 7)']);
		}
		const curWidth5 = widthFrom(radio5.htmode);
		const default5 = (has320 && curWidth5 === '320') ? '320' : ((has160 && curWidth5 === '160') ? '160' : '80');
		const w5=select(curWidth5 || default5, items5);
		const w5Note = E('div', { class: 'alert-message info', style: 'margin-top: 8px; font-size: 12px; display: none;' });
		const updateW5Note = function() {
			if ((w5.value === '160' || w5.value === '320') && curCh5 >= 132) {
				w5Note.textContent = 'ℹ️ O canal 5 GHz atual (Canal ' + curCh5 + ') opera em até 80 MHz. Ao selecionar ' + w5.value + ' MHz, o canal será comutado automaticamente para o Canal 36 para total estabilidade.';
				w5Note.style.display = 'block';
			} else {
				w5Note.style.display = 'none';
			}
		};
		w5.addEventListener('change', updateW5Note);
		updateW5Note();
		const field=function(label,node,hint){return E('label',{class:'ex-wan-edit-field'},[E('span',{},[label]),node,E('small',{class:'ex-muted'},[hint])]);};
		ui.showModal('Largura e desempenho do Wi‑Fi',[
			E('p',{class:'ex-muted'},['A largura maior aumenta velocidade máxima, mas também aumenta interferência e pode reduzir alcance estável. Alterar reinicia o Wi‑Fi.']),
			E('div',{class:'ex-wan-edit-grid'},[
				field('2,4 GHz',w2,'Recomendado: 20 MHz para maior alcance e menos interferência.'),
				field('5 GHz',E('div',{},[w5,w5Note]), has320 ? 'Suporta até 320 MHz (Wi-Fi 7).' : (has160 ? '80 MHz é mais estável e compatível com todos os canais; 160 MHz oferece velocidade máxima nos canais 36-64.' : '80 MHz é a largura máxima suportada pelo hardware deste roteador (VHT80).'))
			]),
			E('p',{class:'alert-message warning'},['A alteração reinicia seletivamente o rádio modificado (aparelhos na outra frequência permanecem conectados).']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['wifi-width',w2.value,w5.value]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar largura do Wi‑Fi');ui.hideModal();reloadSoon('Largura salva. Aplicando alteração no Wi‑Fi…',1500);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Wi‑Fi reiniciando. Recarregando o painel…',2000))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Salvar e aplicar'])])
		]);
	},
	changeCountry: function() {
		const current=String((wifiConfig(this.currentData.wireless).r0.country)||'00').toUpperCase();
		const select=E('select',{class:'cbi-input-select',style:'width:100%'});
		const populate = function(list) {
			select.innerHTML = '';
			const seen = {};
			list.slice().sort(function(a,b){return String(a.country||a.code).localeCompare(String(b.country||b.code));}).forEach(function(item){
				const code=String(item.code||item.iso3166||'').toUpperCase();
				if(!code || seen[code]) return;
				seen[code] = 1;
				select.appendChild(E('option',{value:code},[(item.country||code)+' ('+code+')']));
			});
			select.value=current;
		};
		const preferred = [
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
		].map(function(p){ return {code:p[0], country:p[1]}; });
		populate(this.countries && this.countries.length ? this.countries : preferred);
		if(!this.countries || !this.countries.length) {
			const dev = (this.currentData && this.currentData.wireless && (
				(this.currentData.wireless.radio0 && (this.currentData.wireless.radio0.device || 'radio0')) ||
				(this.currentData.wireless.interfaces && this.currentData.wireless.interfaces[0] && this.currentData.wireless.interfaces[0].ifname)
			)) || 'phy0-ap0';
			safe(callCountryList(dev), {results:[]}).then(L.bind(function(res){
				if(res && res.results && res.results.length) {
					this.countries = res.results;
					populate(res.results);
				}
			}, this));
		}
		ui.showModal('País e domínio regulatório',[
			E('p',{},['Escolha o país onde o roteador está sendo utilizado. Isso controla legalmente canais e potências disponíveis.']),select,
			E('p',{class:'alert-message warning'},['Ao alterar o país, as duas bandas voltarão ao modo automático e o Wi‑Fi será reiniciado. Selecione somente o país onde o equipamento está fisicamente instalado.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){const code=select.value,name=select.options[select.selectedIndex].text;return fs.exec('/usr/sbin/equipe-dashboard-control',['country',code]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar o país');ui.hideModal();reloadSoon('País alterado para '+name+'. Recarregando após reiniciar o Wi‑Fi…',1500);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',2000))return;ui.addNotification(null,E('p',{},[e.message]));});},this)},['Confirmar país'])])
		]);
	},

	toggleWps: function(chk) {
		const desired = chk.checked;
		chk.disabled = true;
		const summary = document.getElementById('ex-wps-summary');
		const pbcBtn = document.getElementById('ex-wps-pbc-btn');
		if (summary) summary.textContent = 'Aplicando alteração no WPS…';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-wps-toggle', desired ? '1' : '0'])
		.then(L.bind(function(r) {
			chk.disabled = false;
			if (r.code) throw new Error(r.stderr || 'Falha ao alterar WPS');
			if (pbcBtn) pbcBtn.disabled = !desired;
			if (summary) summary.textContent = desired
				? 'Ativo • Pareamento rápido por botão (PBC) habilitado nos rádios.'
				: 'Desativado • Conexões exigem senha manualmente.';
			const wpsPill = document.getElementById('ex-wps-status-pill');
			if (wpsPill) setPill('ex-wps-status-pill', desired ? 'online' : 'standby', desired ? 'ATIVO' : 'DESLIGADO');
			ui.addNotification(null, E('p', {}, [desired ? 'WPS ativado com sucesso! Pareamento por botão habilitado.' : 'WPS desativado com sucesso.']), 'info');
		}, this))
		.catch(L.bind(function(e) {
			chk.disabled = false;
			chk.checked = !desired;
			if (pbcBtn) pbcBtn.disabled = !chk.checked;
			ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
		}, this));
	},

	triggerWpsPbc: function(btn) {
		btn.disabled = true;
		const originalText = btn.textContent;
		btn.textContent = 'Iniciando pareamento…';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-wps-pbc'])
		.then(L.bind(function(r) {
			let res = {};
			try { res = JSON.parse(r.stdout || '{}'); } catch(e){}
			let remaining = res.remaining_seconds || 120;
			ui.addNotification(null, E('p', {}, ['Pareamento WPS ativado! Pressione o botão WPS no seu aparelho (impressora/TV) nos próximos 2 minutos.']), 'success');
			if (window._arkWpsInterval) window.clearInterval(window._arkWpsInterval);
			btn.textContent = '⏳ Pareando (' + remaining + 's)';
			window._arkWpsInterval = window.setInterval(function() {
				remaining--;
				if (remaining > 0) {
					btn.textContent = '⏳ Pareando (' + remaining + 's)';
				} else {
					window.clearInterval(window._arkWpsInterval);
					window._arkWpsInterval = null;
					btn.disabled = false;
					btn.textContent = originalText;
				}
			}, 1000);
		}, this))
		.catch(L.bind(function(e) {
			btn.disabled = false;
			btn.textContent = originalText;
			ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
		}, this));
	},

	toggleRoaming: function(chk) {
		const desired = chk.checked;
		chk.disabled = true;
		const summary = document.getElementById('ex-roaming-summary');
		if (summary) summary.textContent = 'Aplicando protocolo 802.11k/v/r nos rádios…';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-roaming-toggle', desired ? '1' : '0'])
		.then(L.bind(function(r) {
			chk.disabled = false;
			if (r.code) throw new Error(r.stderr || 'Falha ao alterar Roaming Rápido');
			setPill('ex-roaming-pill', desired ? 'online' : 'standby', desired ? '802.11k/v/r ATIVO' : 'DESLIGADO');
			if (summary) summary.textContent = desired
				? 'Ativo • Transições em < 50ms (802.11r), relatórios de vizinhos (802.11k) e migração de clientes teimosos (802.11v).'
				: 'Desativado • Aparelhos realizam reautenticação completa WPA ao trocar de ponto de acesso.';
			ui.addNotification(null, E('p', {}, [desired ? 'Roaming Rápido 802.11k/v/r ativado com sucesso!' : 'Roaming Rápido desativado.']), 'info');
		}, this))
		.catch(L.bind(function(e) {
			chk.disabled = false;
			chk.checked = !desired;
			ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
		}, this));
	},

	toggleUsteer: function(chk) {
		const desired = chk.checked;
		chk.disabled = true;
		const summary = document.getElementById('ex-usteer-summary');
		if (summary) summary.textContent = 'Alterando estado do assistente usteer…';
		const usteerFeat = (this.capabilities && this.capabilities.features && this.capabilities.features.usteer) || {};
		const wasInstalled = !!usteerFeat.installed;

		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-usteer-toggle', desired ? '1' : '0'])
		.then(L.bind(function(r) {
			chk.disabled = false;
			if (r.code) throw new Error(r.stderr || 'Falha ao alterar usteer');
			if (this.capabilities && this.capabilities.features && this.capabilities.features.usteer) {
				this.capabilities.features.usteer.active = desired;
				if (desired && !wasInstalled) {
					this.capabilities.features.usteer.installing = true;
				}
			}
			if (desired && !wasInstalled) {
				setPill('ex-usteer-pill', 'warning', 'INSTALANDO EM 2º PLANO...');
				if (summary) summary.textContent = 'Instalando módulo usteer em segundo plano via repositório OpenWrt…';
				ui.addNotification(null, E('p', {}, ['Assistente usteer ativado! O download e inicialização estão ocorrendo em segundo plano.']), 'info');
			} else {
				setPill('ex-usteer-pill', desired ? 'online' : 'standby', desired ? 'DAEMON ATIVO (< 1.5 MB RAM)' : 'STANDBY');
				if (summary) summary.textContent = desired
					? 'Ativo • Monitora o sinal de cada dispositivo e orquestra a troca entre roteadores e frequências 2,4 / 5 GHz.'
					: 'Desativado • O roteador não realiza assistência ativa de roaming.';
				ui.addNotification(null, E('p', {}, [desired ? 'Assistente usteer iniciado com sucesso!' : 'Assistente usteer pausado.']), 'info');
			}
		}, this))
		.catch(L.bind(function(e) {
			chk.disabled = false;
			chk.checked = !desired;
			if (this.capabilities && this.capabilities.features && this.capabilities.features.usteer) {
				this.capabilities.features.usteer.active = !desired;
				this.capabilities.features.usteer.installing = false;
			}
			setPill('ex-usteer-pill', !desired ? 'online' : 'standby', !desired ? 'DAEMON ATIVO (< 1.5 MB RAM)' : 'STANDBY');
			if (summary) summary.textContent = !desired
				? 'Ativo • Monitora o sinal de cada dispositivo e orquestra a troca entre roteadores e frequências 2,4 / 5 GHz.'
				: 'Desativado • O roteador não realiza assistência ativa de roaming.';
			ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
		}, this));
	},

	toggleWifi6Accel: function(chk) {
		const desired = chk.checked;
		chk.disabled = true;
		const summary = document.getElementById('ex-wifi6-summary');
		if (summary) summary.textContent = 'Aplicando aceleração Wi-Fi 6/7…';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-wifi6-toggle', desired ? '1' : '0'])
		.then(L.bind(function(r) {
			chk.disabled = false;
			if (r.code) throw new Error(r.stderr || 'Falha ao alterar aceleração Wi-Fi 6/7');
			setPill('ex-wifi6-pill', desired ? 'online' : 'standby', desired ? 'ACELERAÇÃO ATIVA' : 'STANDBY');
			if (summary) {
				summary.textContent = desired
					? 'Ativo • BSS Coloring, TWT, OFDMA, Beamforming e Puncturing operando nos rádios.'
					: 'Desativado • Recursos avançados de agregação e economia de bateria em espera.';
			}
			ui.addNotification(null, E('p', {}, [desired ? 'Aceleração Wi-Fi 6/7 ativada com sucesso! Rádios reiniciando…' : 'Aceleração Wi-Fi 6/7 desativada.']), 'info');
		}, this))
		.catch(L.bind(function(e) {
			chk.disabled = false;
			chk.checked = !desired;
			ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
		}, this));
	},

	confirmMultiRouterAction: function(title, messageHtml, onConfirm, onCancel) {
		let countdown = 3;
		const confirmBtn = E('button', {
			class: 'btn cbi-button cbi-button-positive',
			disabled: true,
			style: 'min-width: 250px; font-weight: 700;'
		}, ['⏳ Aguarde (' + countdown + 's)...']);

		const timer = window.setInterval(function() {
			countdown--;
			if (countdown > 0) {
				confirmBtn.textContent = '⏳ Aguarde (' + countdown + 's)...';
			} else {
				window.clearInterval(timer);
				confirmBtn.disabled = false;
				confirmBtn.textContent = 'Sim, possuo múltiplos roteadores (Ativar)';
			}
		}, 1000);

		const cancelAction = function() {
			window.clearInterval(timer);
			ui.hideModal();
			if (typeof onCancel === 'function') onCancel();
		};

		confirmBtn.addEventListener('click', function() {
			window.clearInterval(timer);
			ui.hideModal();
			if (typeof onConfirm === 'function') onConfirm();
		});

		const body = [
			E('div', { class: 'alert-message warning', style: 'margin-bottom: 16px;' }, [
				E('h4', { style: 'margin-top: 0; display: flex; align-items: center; gap: 8px;' }, [
					'⚠️ ATENÇÃO: RECURSO EXCLUSIVO PARA 2 OU MAIS ROTEADORES'
				]),
				E('div', { style: 'font-size: 13px; line-height: 1.5;' }, messageHtml)
			]),
			E('div', { class: 'right', style: 'margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;' }, [
				E('button', {
					class: 'btn cbi-button cbi-button-neutral',
					style: 'font-weight: 600;',
					click: cancelAction
				}, ['Cancelar (Uso apenas 1 roteador)']),
				confirmBtn
			])
		];

		ui.showModal(title, body);
	},

	toggleTxBalance: function(chk) {
		const desired = chk.checked;
		if (desired) {
			chk.checked = false;
			const warningContent = [
				E('p', {}, [
					'Se você utiliza ', E('strong', {}, ['apenas este roteador']), ' na sua residência, ativar a Potência Balanceada reduzirá o alcance da sua rede 2,4 GHz em cerca de 40%, podendo derrubar dispositivos inteligentes na garagem ou nos quartos distantes.'
				]),
				E('p', { style: 'margin-top: 8px;' }, [
					'Esta opção só deve ser ativada se você possuir ', E('strong', {}, ['2 ou mais roteadores']), ' para incentivar os aparelhos a migrarem para o ponto de acesso mais próximo.'
				])
			];
			this.confirmMultiRouterAction(
				'Confirmar Potência Balanceada Anti-Sobreposição',
				warningContent,
				L.bind(function() {
					chk.checked = true;
					this._applyTxBalance(chk, true);
				}, this),
				function() {
					chk.checked = false;
				}
			);
			return;
		}
		this._applyTxBalance(chk, false);
	},

	_applyTxBalance: function(chk, desired) {
		chk.disabled = true;
		const summary = document.getElementById('ex-txbalance-summary');
		if (summary) summary.textContent = 'Ajustando potências de transmissão…';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-txbalance-toggle', desired ? '1' : '0'])
		.then(L.bind(function(r) {
			chk.disabled = false;
			if (r.code) throw new Error(r.stderr || 'Falha ao ajustar potências');
			setPill('ex-txbalance-pill', desired ? 'online' : 'standby', desired ? '2.4G (15 dBm) / 5G (20 dBm)' : 'PADRÃO');
			if (summary) summary.textContent = desired
				? 'Ativo • 2,4 GHz em potência moderada (15 dBm) e 5 GHz no máximo (20 dBm) para prevenir clientes presos.'
				: 'Desativado • Rádios operando na potência padrão máxima do país.';
			ui.addNotification(null, E('p', {}, [desired ? 'Potência balanceada aplicada com sucesso!' : 'Potência balanceada desativada.']), 'info');
		}, this))
		.catch(L.bind(function(e) {
			chk.disabled = false;
			chk.checked = !desired;
			ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
		}, this));
	},

	showMeshModal: function() {
		const meshIdInput = E('input', { class: 'cbi-input-text', value: 'ark-mesh', placeholder: 'ark-mesh', maxlength: 32, style: 'width:100%;' });
		const meshKeyInput = E('input', { type: 'password', class: 'cbi-input-text', value: 'arkmeshkey123', placeholder: 'chave do mesh (mínimo 8 caracteres)', maxlength: 63, style: 'width:100%;' });
		const showKey = E('input', { type: 'checkbox' });
		showKey.addEventListener('change', function() { meshKeyInput.type = showKey.checked ? 'text' : 'password'; });

		const w = wifiConfig(this.currentData && this.currentData.wireless || {});
		const isMeshActive = !!w.meshActive;

		const body = [
			E('div', { class: 'alert-message warning', style: 'margin-bottom: 14px;' }, [
				E('h4', { style: 'margin-top: 0;' }, ['⚠️ Cabo Ethernet vs Mesh Sem Fio']),
				E('p', { style: 'margin: 4px 0 0; line-height: 1.45;' }, [
					'Se você conectou um cabo de rede entre os roteadores (Backhaul Ethernet), você já tem a velocidade máxima Gigabit. ',
					E('strong', { style: 'color: #ef4444;' }, ['NÃO ative o Mesh sem fio neste caso']),
					', pois cabos entregam 100% de velocidade sem perda de canal. Ative o Mesh apenas se os roteadores estiverem se comunicando puramente pelo ar.'
				])
			]),
			E('p', {}, ['O enlace Mesh sem fio (802.11s) permite interligar múltiplos roteadores ARK Router pelo ar, sem cabos de rede.']),
			E('div', { style: 'margin-bottom: 12px; padding: 10px 12px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.22); border-radius: 8px; font-size: 12px; line-height: 1.45;' }, [
				E('strong', { style: 'color: #38bdf8;' }, ['💡 Por que um Nome de Enlace (Mesh ID) separado em vez da sua rede Wi-Fi comum?']),
				E('p', { class: 'ex-muted', style: 'margin: 4px 0 0;' }, [
					'O Mesh ID NÃO é uma rede nova para você conectar celulares. Ele funciona como um “cabo de rede virtual invisível pelo ar” com criptografia WPA3-SAE, dedicado exclusivamente para os roteadores transportarem tráfego entre si (Backhaul). ',
					'Seus celulares, TVs e computadores continuarão usando normalmente o seu Wi-Fi principal (mesmo nome e senha) em todos os cômodos, com transição automática transparente.'
				])
			]),
			E('label', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['Nome do Enlace Mesh (Mesh ID)']),
				meshIdInput,
				E('small', { class: 'ex-muted' }, ['Deve ser idêntico em todos os nós da sua rede Mesh.'])
			]),
			E('label', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['Chave de Segurança do Enlace (WPA3-SAE)']),
				meshKeyInput,
				E('small', { class: 'ex-muted' }, ['Chave secreta compartilhada para proteger o tráfego entre os roteadores.'])
			]),
			E('label', { class: 'ex-show-password' }, [ showKey, E('span', {}, ['Mostrar chave digitada']) ]),
			E('div', { class: 'right', style: 'margin-top: 16px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar']),
				' ',
				isMeshActive ? E('button', {
					class: 'btn cbi-button cbi-button-reset',
					click: L.bind(function(ev) {
						ev.currentTarget.disabled = true;
						ev.currentTarget.textContent = 'Desativando Mesh…';
						return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-mesh-set', '0']).then(function() {
							ui.hideModal();
							reloadSoon('Enlace Mesh desativado. Reiniciando rádio…', 1500);
						});
					}, this)
				}, ['Desativar Enlace Mesh']) : '',
				' ',
				E('button', {
					class: 'btn cbi-button cbi-button-positive',
					click: L.bind(function(ev) {
						const btn = ev.currentTarget;
						const id = meshIdInput.value.trim(), key = meshKeyInput.value.trim();
						if (!id || id.length > 32) { ui.addNotification(null, E('p', {}, ['O Mesh ID precisa ter entre 1 e 32 caracteres.']), 'danger'); return; }
						if (!key || key.length < 8 || key.length > 63) { ui.addNotification(null, E('p', {}, ['A chave Mesh precisa ter entre 8 e 63 caracteres.']), 'danger'); return; }
						
						this.confirmMultiRouterAction(
							'Confirmar Ativação do Enlace Mesh (802.11s)',
							[
								E('p', {}, ['Você está prestes a ativar o enlace Mesh sem fio no rádio de 5 GHz.']),
								E('p', { style: 'margin-top: 8px;' }, ['Se você possui apenas 1 roteador ou se seus roteadores já estão interligados por cabo de rede, ', E('strong', {}, ['não ative este recurso']), '.']),
								E('p', { style: 'margin-top: 8px;' }, ['Deseja continuar e ativar o Mesh sem fio pelo ar?'])
							],
							L.bind(function() {
								btn.disabled = true;
								btn.textContent = 'Ativando Mesh…';
								return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-mesh-set', '1', id, key]).then(function() {
									ui.hideModal();
									reloadSoon('Enlace Mesh ativado com sucesso! Wi-Fi 6, Potência Balanceada e Roaming ativados automaticamente.', 1500);
								}).catch(function(e) {
									btn.disabled = false;
									btn.textContent = 'Ativar Enlace Mesh (802.11s)';
									ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
								});
							}, this)
						);
					}, this)
				}, ['Ativar Enlace Mesh (802.11s)'])
			])
		];
		ui.showModal('Configurar Enlace Mesh Sem Fio (802.11s)', body);
	},

	showSatelliteWizardModal: function() {
		const closeModal = function() { ui.hideModal(); };
		const loadingBody = [
			E('p', { class: 'spinning' }, ['Consultando topologia de rede e procurando roteador principal…'])
		];
		ui.showModal('📡 Assistente de Roteador Secundário (Ponto Adicional de Wi-Fi)', loadingBody);

		fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-mesh-satellite-discover']).then(L.bind(function(r) {
			let d = {};
			try { d = JSON.parse(r.stdout || '{}'); } catch(e) {}

			const gw = d.gateway || '192.168.1.1';
			const reachable = !!d.reachable;
			const currentRole = d.current_role || 'master';
			const suggestedSatIp = d.suggested_sat_ip || '192.168.1.2';
			const isAlreadySatellite = (currentRole === 'satellite' || currentRole === 'secondary');
			const activeBackhaul = (d.backhaul === 'air') ? 'air' : 'cable';
			const activeIpMode = (d.ip_mode === 'dhcp') ? 'dhcp' : 'static';

			const masterIpInput = E('input', {
				class: 'cbi-input-text',
				type: 'text',
				value: gw,
				placeholder: '192.168.1.1',
				style: 'width: 100%; font-family: monospace; font-weight: 600;'
			});

			const backhaulSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; font-weight: 600;' }, [
				E('option', { value: 'cable' }, ['🔌 Cabo de Rede (Backhaul Ethernet Gigabit - Recomendado)']),
				E('option', { value: 'air' }, ['📶 Sem Fio (Enlace Mesh 802.11s pelo Ar)'])
			]);
			backhaulSelect.value = activeBackhaul;

			const ipModeSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; font-weight: 600;' }, [
				E('option', { value: 'static' }, ['📌 IP Estático Recomendado (Ex: ' + suggestedSatIp + ')']),
				E('option', { value: 'dhcp' }, ['🔄 IP Automático (DHCP Cliente do Mestre)'])
			]);
			ipModeSelect.value = activeIpMode;

			const satIpInput = E('input', {
				class: 'cbi-input-text',
				type: 'text',
				value: (isAlreadySatellite && d.current_lan_ip) ? d.current_lan_ip : suggestedSatIp,
				placeholder: '192.168.1.2',
				style: 'width: 100%; font-family: monospace; font-weight: 600;'
			});

			const satNetmaskInput = E('input', {
				class: 'cbi-input-text',
				type: 'text',
				value: d.netmask || '255.255.255.0',
				placeholder: '255.255.255.0',
				style: 'width: 100%; font-family: monospace; font-weight: 600;'
			});

			const satGatewayInput = E('input', {
				class: 'cbi-input-text',
				type: 'text',
				value: d.gateway || gw,
				placeholder: '192.168.1.1',
				style: 'width: 100%; font-family: monospace; font-weight: 600;'
			});

			const satDnsInput = E('input', {
				class: 'cbi-input-text',
				type: 'text',
				value: d.dns || (gw + ', 1.1.1.1'),
				placeholder: '192.168.1.1, 1.1.1.1',
				style: 'width: 100%; font-family: monospace; font-weight: 600;'
			});

			masterIpInput.addEventListener('input', function() {
				const val = masterIpInput.value.trim();
				satGatewayInput.value = val;
				satDnsInput.value = val + ', 1.1.1.1';
			});

			const satIpRow = E('div', { id: 'ex-sat-ip-row', style: 'margin-top: 10px; display: ' + (activeIpMode === 'static' ? 'grid' : 'none') + '; gap: 10px; background: rgba(0,0,0,0.18); padding: 12px; border-radius: 8px;' }, [
				E('div', {}, [
					E('strong', { style: 'display: block; font-size: 13px; margin-bottom: 4px; color: #38bdf8;' }, ['IP deste Roteador Secundário (IP do Aparelho)']),
					satIpInput,
					E('small', { class: 'ex-muted', style: 'display: block; margin-top: 3px;' }, ['Endereço fixo e exclusivo para você acessar o painel deste aparelho na sua rede.'])
				]),
				E('div', { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px;' }, [
					E('div', {}, [
						E('strong', { style: 'display: block; font-size: 12px; margin-bottom: 4px;' }, ['Máscara de Rede']),
						satNetmaskInput,
						E('small', { class: 'ex-muted' }, ['Padrão: 255.255.255.0 (/24).'])
					]),
					E('div', {}, [
						E('strong', { style: 'display: block; font-size: 12px; margin-bottom: 4px;' }, ['Gateway Padrão (Roteador Principal)']),
						satGatewayInput,
						E('small', { class: 'ex-muted' }, ['IP onde a internet chega.'])
					])
				]),
				E('div', {}, [
					E('strong', { style: 'display: block; font-size: 12px; margin-bottom: 4px;' }, ['Servidores DNS']),
					satDnsInput,
					E('small', { class: 'ex-muted' }, ['Permite a este roteador consultar relógio NTP e verificar atualizações.'])
				])
			]);

			ipModeSelect.addEventListener('change', function() {
				satIpRow.style.display = (ipModeSelect.value === 'static') ? 'grid' : 'none';
			});

			// Wi-Fi credentials
			const ssid2gInput = E('input', { class: 'cbi-input-text', type: 'text', value: d.ssid_2g || '', placeholder: 'Nome da rede 2.4G', style: 'width: 100%;' });
			const key2gInput = E('input', { class: 'cbi-input-text', type: 'password', value: d.key_2g || '', placeholder: 'Senha do Wi-Fi 2.4G', style: 'width: 100%;' });

			const ssid5gInput = E('input', { class: 'cbi-input-text', type: 'text', value: d.ssid_5g || '', placeholder: 'Nome da rede 5G', style: 'width: 100%;' });
			const key5gInput = E('input', { class: 'cbi-input-text', type: 'password', value: d.key_5g || '', placeholder: 'Senha do Wi-Fi 5G', style: 'width: 100%;' });

			const mobDomainInput = E('input', { class: 'cbi-input-text', type: 'text', value: d.mobility_domain || 'a1b2', maxlength: 4, placeholder: 'a1b2', style: 'width: 100%; max-width: 120px; font-family: monospace; font-weight: 700; text-transform: lowercase;' });
			const targetChannel5gInput = E('input', { class: 'cbi-input-text', type: 'text', value: d.channel_5g || '', placeholder: 'Ex: 36, 44 (detectado pelo scanner)', style: 'width: 100%; font-family: monospace; font-weight: 600;' });

			// Wireless Mesh backhaul options (only shown when backhaulSelect is 'air')
			const meshIdInput = E('input', { class: 'cbi-input-text', type: 'text', value: d.mesh_id || 'ark-mesh', placeholder: 'ark-mesh', maxlength: 32, style: 'width: 100%;' });
			const meshKeyInput = E('input', { class: 'cbi-input-text', type: 'password', value: d.mesh_key || 'arkmeshkey123', placeholder: 'Senha Mesh WPA3 (mínimo 8 caracteres)', maxlength: 63, style: 'width: 100%;' });

			const channelStatusNote = E('div', { id: 'ex-sat-channel-status-note', style: 'display: none; margin-top: 8px; padding: 8px 12px; background: rgba(34, 197, 94, 0.12); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 6px; font-size: 12px;' });
			const scanResultContainer = E('div', { id: 'ex-sat-scan-results', style: 'margin-top: 8px; display: grid; gap: 6px;' });
			const scanBtn = E('button', {
				class: 'btn cbi-button cbi-button-action',
				type: 'button',
				style: 'font-size: 12px; font-weight: 700;'
			}, ['🔍 Escanear Redes do Mestre no Ar']);

			const importMasterBtn = E('button', {
				id: 'ex-sat-pull-master-btn',
				class: 'btn cbi-button cbi-button-action',
				type: 'button',
				style: 'font-size: 11.5px; font-weight: 700; background: #0284c7 !important; border-color: #38bdf8 !important; color: #fff !important; padding: 3px 12px; border-radius: 6px;'
			}, ['📥 Importar Dados do Mestre']);

			const importSyncCard = E('div', {
				id: 'ex-sat-import-sync-card',
				style: 'display: none; margin-bottom: 12px; padding: 12px; border-radius: 8px;'
			});

			const triggerImportMaster = function() {
				const targetIp = masterIpInput.value.trim() || '192.168.1.1';
				importMasterBtn.disabled = true;
				importMasterBtn.textContent = '⏳ Buscando no Mestre…';
				importSyncCard.style.display = 'block';
				importSyncCard.style.background = 'rgba(56, 189, 248, 0.08)';
				importSyncCard.style.border = '1px solid rgba(56, 189, 248, 0.3)';
				importSyncCard.innerHTML = '';
				importSyncCard.appendChild(E('p', { class: 'spinning', style: 'margin: 0; font-size: 12px; color: #38bdf8;' }, [
					'Consultando configurações Wi-Fi e Mesh no Roteador Mestre (' + targetIp + ')…'
				]));

				return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-mesh-satellite-pull-master', targetIp]).then(function(res) {
					importMasterBtn.disabled = false;
					importMasterBtn.textContent = '📥 Importar Dados do Mestre';
					let data = null;
					try {
						if (res && res.stdout) {
							data = JSON.parse(res.stdout.trim());
						}
					} catch (e) {
						data = null;
					}

					if (!data || !data.ok) {
						const errMsg = (data && data.error) || (res && res.stderr) || ('Não foi possível contatar o Mestre no IP ' + targetIp + '. Verifique se o cabo está conectado ou se o enlace Wi-Fi foi estabelecido.');
						importSyncCard.style.background = 'rgba(239, 68, 68, 0.1)';
						importSyncCard.style.border = '1px solid rgba(239, 68, 68, 0.35)';
						importSyncCard.innerHTML = '';
						importSyncCard.appendChild(E('div', {}, [
							E('strong', { style: 'color: #ef4444; font-size: 12.5px; display: block; margin-bottom: 4px;' }, ['⚠️ Falha ao Importar do Mestre']),
							E('p', { class: 'ex-muted', style: 'margin: 0 0 8px; font-size: 11.5px; line-height: 1.4;' }, [errMsg]),
							E('button', {
								class: 'btn cbi-button cbi-button-neutral',
								type: 'button',
								style: 'font-size: 11px;',
								click: function() { triggerImportMaster(); }
							}, ['🔄 Tentar Novamente'])
						]));
						return;
					}

					importSyncCard.style.background = 'rgba(56, 189, 248, 0.1)';
					importSyncCard.style.border = '1px solid rgba(56, 189, 248, 0.45)';
					importSyncCard.innerHTML = '';

					const choiceBox = E('div', { style: 'display: grid; gap: 8px;' }, [
						E('div', { style: 'display: flex; justify-content: space-between; align-items: center;' }, [
							E('strong', { style: 'color: #38bdf8; font-size: 13px;' }, ['📥 Dados do Roteador Mestre Obtidos com Sucesso!']),
							E('span', { class: 'ex-pill online', style: 'font-size: 10px; padding: 1px 6px;' }, ['SINCRONIZADO'])
						]),
						E('div', { style: 'padding: 8px 10px; background: rgba(0,0,0,0.25); border-radius: 6px; font-size: 11.5px; display: grid; gap: 4px;' }, [
							E('div', {}, [
								E('span', { class: 'ex-muted' }, ['Wi-Fi 5 GHz no Mestre: ']),
								E('strong', { style: 'color: #f8fafc;' }, [data.ssid_5g || '(não configurado)']),
								data.chan_5g ? E('span', { class: 'ex-muted', style: 'margin-left: 6px;' }, ['(Canal ' + data.chan_5g + ')']) : ''
							]),
							E('div', {}, [
								E('span', { class: 'ex-muted' }, ['Wi-Fi 2.4 GHz no Mestre: ']),
								E('strong', { style: 'color: #f8fafc;' }, [data.ssid_2g || '(não configurado)'])
							]),
							E('div', {}, [
								E('span', { class: 'ex-muted' }, ['Roaming 802.11r (Mobility Domain): ']),
								E('code', { style: 'color: #38bdf8; font-weight: 700;' }, [data.mobility_domain || 'a1b2']),
								E('span', { class: 'ex-muted', style: 'margin-left: 8px;' }, ['• Enlace Mesh: ']),
								E('code', { style: 'color: #38bdf8;' }, [data.mesh_id || 'ark-mesh'])
							])
						]),
						E('p', { style: 'margin: 4px 0 2px; font-size: 12.5px; font-weight: 600; color: #f8fafc; line-height: 1.4;' }, [
							'Deseja manter o mesmo nome de Wi-Fi e a mesma senha do Mestre neste ponto adicional?'
						]),
						E('p', { class: 'ex-muted', style: 'margin: 0 0 6px; font-size: 11.5px; line-height: 1.45;' }, [
							'• ', E('strong', {}, ['Sim (Mesh Unificado Recomendado)']), ': Seus celulares, smart TVs e computadores usarão a mesma rede em toda a residência e alternarão de roteador sem travar vídeos ou chamadas (Roaming Rápido 802.11k/v/r).',
							E('br'),
							'• ', E('strong', {}, ['Não (Nome/Senha Diferente)']), ': Este aparelho transmitirá um nome ou senha exclusivo de sua escolha, mas continuará conectado e recebendo internet do Mestre.'
						]),
						E('div', { style: 'display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px;' }, [
							E('button', {
								class: 'btn cbi-button cbi-button-action',
								type: 'button',
								style: 'font-size: 11.5px; font-weight: 750; background: #0284c7 !important; border-color: #38bdf8 !important; color: #fff !important; padding: 6px 14px;',
								click: function() {
									if (data.ssid_5g) ssid5gInput.value = data.ssid_5g;
									if (data.key_5g) key5gInput.value = data.key_5g;
									if (data.ssid_2g) ssid2gInput.value = data.ssid_2g;
									if (data.key_2g) key2gInput.value = data.key_2g;
									if (data.chan_5g) targetChannel5gInput.value = String(data.chan_5g);
									if (data.mobility_domain) mobDomainInput.value = data.mobility_domain;
									if (data.mesh_id) meshIdInput.value = data.mesh_id;
									if (data.mesh_key) meshKeyInput.value = data.mesh_key;

									importSyncCard.style.background = 'rgba(34, 197, 94, 0.12)';
									importSyncCard.style.border = '1px solid rgba(34, 197, 94, 0.4)';
									importSyncCard.innerHTML = '';
									importSyncCard.appendChild(E('div', { style: 'display: flex; justify-content: space-between; align-items: center;' }, [
										E('span', { style: 'color: #22c55e; font-size: 12px; font-weight: 700;' }, [
											'✔ Wi-Fi Unificado configurado! Nomes, senhas e roaming 802.11r sincronizados com o Mestre.'
										]),
										E('button', {
											class: 'btn cbi-button cbi-button-neutral',
											type: 'button',
											style: 'font-size: 10px; padding: 2px 6px;',
											click: function() { importSyncCard.style.display = 'none'; }
										}, ['✕ Fechar'])
									]));
								}
							}, ['🚀 Sim, Usar Mesmo Wi-Fi e Mesma Senha (Recomendado)']),
							E('button', {
								class: 'btn cbi-button cbi-button-neutral',
								type: 'button',
								style: 'font-size: 11.5px; font-weight: 600; padding: 6px 14px;',
								click: function() {
									if (data.chan_5g) targetChannel5gInput.value = String(data.chan_5g);
									if (data.mobility_domain) mobDomainInput.value = data.mobility_domain;
									if (data.mesh_id) meshIdInput.value = data.mesh_id;
									if (data.mesh_key) meshKeyInput.value = data.mesh_key;
									if (!ssid5gInput.value) {
										ssid5gInput.value = (data.ssid_5g ? (data.ssid_5g + '_Ponto2') : 'ARK_Router_5G');
									}
									if (!ssid2gInput.value) {
										ssid2gInput.value = (data.ssid_2g ? (data.ssid_2g + '_Ponto2') : 'ARK_Router_2.4G');
									}

									importSyncCard.style.background = 'rgba(56, 189, 248, 0.1)';
									importSyncCard.style.border = '1px solid rgba(56, 189, 248, 0.35)';
									importSyncCard.innerHTML = '';
									importSyncCard.appendChild(E('div', { style: 'display: flex; justify-content: space-between; align-items: center;' }, [
										E('span', { style: 'color: #38bdf8; font-size: 12px; font-weight: 700;' }, [
											'✏️ Canal e enlace técnico sincronizados. Digite abaixo o nome e a senha desejados para este roteador.'
										]),
										E('button', {
											class: 'btn cbi-button cbi-button-neutral',
											type: 'button',
											style: 'font-size: 10px; padding: 2px 6px;',
											click: function() { importSyncCard.style.display = 'none'; }
										}, ['✕ Fechar'])
									]));
									ssid5gInput.focus();
								}
							}, ['✏️ Não, Usar Nome ou Senha Diferentes neste Aparelho'])
						])
					]);

					importSyncCard.appendChild(choiceBox);
				}).catch(function(err) {
					importMasterBtn.disabled = false;
					importMasterBtn.textContent = '📥 Importar Dados do Mestre';
					importSyncCard.style.background = 'rgba(239, 68, 68, 0.1)';
					importSyncCard.style.border = '1px solid rgba(239, 68, 68, 0.35)';
					importSyncCard.innerHTML = '';
					importSyncCard.appendChild(E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 11.5px; color: #ef4444;' }, [
						'Erro ao buscar dados do Mestre: ' + (err && err.message || err)
					]));
				});
			};

			importMasterBtn.addEventListener('click', triggerImportMaster);

			const viewInstance = this;
			const isMeshNet = function(net) {
				if (!net) return false;
				const mode = (net.mode || '').toLowerCase();
				const ssid = (net.ssid || '').toLowerCase();
				return mode.indexOf('mesh') >= 0 || ssid.indexOf('mesh') >= 0;
			};

			const selectMasterMeshLink = function(meshNet, regularList, list2) {
				meshIdInput.value = meshNet.ssid || 'ark-mesh';
				const chan = String(meshNet.channel || '');
				targetChannel5gInput.value = chan;

				let matchedAP = null;
				if (meshNet.bssid) {
					const baseMac = meshNet.bssid.substring(0, 14).toLowerCase();
					const candidates = (regularList || []).filter(function(n) {
						if (!n || !n.bssid) return false;
						const isSame = (n.bssid.toLowerCase().substring(0, 14) === baseMac && String(n.channel) === chan);
						if (!isSame) return false;
						const s = (n.ssid || '').toLowerCase();
						return s.indexOf('visitante') === -1 && s.indexOf('guest') === -1 && s.indexOf('tv') === -1;
					});
					if (candidates.length) {
						matchedAP = candidates.find(function(c) { return /_?5G$/i.test(c.ssid); }) || candidates[0];
					}
				}
				if (!matchedAP && regularList && regularList.length) {
					const nonGuests = regularList.filter(function(n) {
						const s = (n.ssid || '').toLowerCase();
						return s.indexOf('visitante') === -1 && s.indexOf('guest') === -1 && s.indexOf('tv') === -1 && String(n.channel) === chan;
					});
					if (nonGuests.length) matchedAP = nonGuests[0];
				}

				if (matchedAP) {
					if (!ssid5gInput.value || ssid5gInput.value === 'ARK_Router_5G' || ssid5gInput.value === 'Equipe-X' || ssid5gInput.value === 'Tv casa') {
						ssid5gInput.value = matchedAP.ssid;
					}
					if (!ssid2gInput.value || ssid2gInput.value === 'ARK_Router_2.4G' || ssid2gInput.value === 'Equipe-X' || ssid2gInput.value === 'Tv casa') {
						const baseName = (matchedAP.ssid || '').replace(/_?5G$/i, '').replace(/-5G$/i, '');
						let matched2g = null;
						if (Array.isArray(list2)) {
							matched2g = list2.find(function(n) { return n && n.ssid && n.ssid.indexOf(baseName) === 0; });
						}
						ssid2gInput.value = matched2g ? matched2g.ssid : (baseName || ssid5gInput.value);
					}
					if (key5gInput.value === 'equipe0100@') key5gInput.value = '';
					if (key2gInput.value === 'equipe0100@') key2gInput.value = '';
				}

				const sig = Number(meshNet.signal) || -80;
				let sigLabel = 'Excelente';
				if (sig < -75) sigLabel = 'Fraco (aproxime os nós)';
				else if (sig < -65) sigLabel = 'Bom';

				channelStatusNote.style.display = 'block';
				channelStatusNote.innerHTML = '';
				channelStatusNote.appendChild(E('span', { style: 'color: #22c55e; font-weight: 700;' }, ['✔ Enlace Mesh Selecionado: ' + meshNet.ssid]));
				const detailText = ' • Canal 5G ' + chan + ' (' + sig + ' dBm - ' + sigLabel + ')' + (matchedAP ? (' • Wi-Fi: ' + matchedAP.ssid) : '');
				channelStatusNote.appendChild(E('span', { class: 'ex-muted', style: 'margin-left: 6px;' }, [detailText]));

				const quickPullBtn = E('button', {
					class: 'btn cbi-button cbi-button-action',
					type: 'button',
					style: 'font-size: 11px; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; font-weight: 700; background: #0284c7 !important; border-color: #38bdf8 !important; color: #fff !important;',
					click: function() {
						triggerImportMaster();
						const s4 = document.getElementById('ex-sat-section-4');
						if (s4) s4.scrollIntoView({ behavior: 'smooth' });
					}
				}, ['📥 Importar Wi-Fi e Senhas do Mestre Agora']);
				channelStatusNote.appendChild(E('div', { style: 'margin-top: 6px;' }, [quickPullBtn]));
			};

			const selectMasterNetwork = function(net, list2) {
				ssid5gInput.value = net.ssid || '';
				targetChannel5gInput.value = String(net.channel || '');

				if (!ssid2gInput.value || ssid2gInput.value === 'ARK_Router_2.4G') {
					const baseName = (net.ssid || '').replace(/_?5G$/i, '').replace(/-5G$/i, '');
					let matched2g = null;
					if (Array.isArray(list2)) {
						for (let i = 0; i < list2.length; i++) {
							if (list2[i] && list2[i].ssid && list2[i].ssid.indexOf(baseName) === 0) {
								matched2g = list2[i];
								break;
							}
						}
					}
					ssid2gInput.value = matched2g ? matched2g.ssid : baseName;
				}

				const sig = Number(net.signal) || -80;
				const chan = net.channel || '?';
				let sigLabel = 'Excelente';
				if (sig < -75) sigLabel = 'Fraco (aproxime os nós)';
				else if (sig < -65) sigLabel = 'Bom';

				channelStatusNote.style.display = 'block';
				channelStatusNote.innerHTML = '';
				channelStatusNote.appendChild(E('span', { style: 'color: #22c55e; font-weight: 700;' }, ['✔ Mestre Selecionado: ' + net.ssid]));
				channelStatusNote.appendChild(E('span', { class: 'ex-muted', style: 'margin-left: 8px;' }, ['Canal 5G ' + chan + ' (' + sig + ' dBm - ' + sigLabel + ') sintonizado automaticamente no rádio']));
			};

			scanBtn.addEventListener('click', function() {
				scanBtn.disabled = true;
				scanBtn.textContent = 'Escaneando frequências no ar…';
				scanResultContainer.innerHTML = '';
				scanResultContainer.appendChild(E('p', { class: 'spinning', style: 'margin: 6px 0; font-size: 12px;' }, ['Buscando redes de 5 GHz ao redor…']));

				const topology = (viewInstance && viewInstance.currentData && viewInstance.currentData.wifiTopology) || (typeof wifiTopology === 'function' ? wifiTopology({}) : {});
				let scanDev5 = (topology && topology.scan5) || '';
				let scanDev2 = (topology && topology.scan2) || '';
				if (!scanDev5 && viewInstance && viewInstance.currentData && viewInstance.currentData.wirelessStatus) {
					const ws = viewInstance.currentData.wirelessStatus;
					Object.keys(ws).forEach(function(r) {
						const ifaces = (ws[r] && ws[r].interfaces) || [];
						ifaces.forEach(function(ifc) {
							if (ifc && ifc.ifname) {
								if (!scanDev5) scanDev5 = ifc.ifname;
								else if (!scanDev2) scanDev2 = ifc.ifname;
							}
						});
					});
				}
				if (!scanDev5) scanDev5 = 'phy1-ap0';
				if (!scanDev2) scanDev2 = 'phy0-ap0';

				Promise.all([
					safe(callScan(scanDev5), { results: [] }),
					safe(callScan(scanDev2), { results: [] })
				]).then(function(res) {
					scanBtn.disabled = false;
					scanBtn.textContent = '🔍 Escanear Redes do Mestre no Ar';
					scanResultContainer.innerHTML = '';

					const list5 = (res[0] && res[0].results) || [];
					const list2 = (res[1] && res[1].results) || [];

					const valid5 = list5.filter(function(n) { return n && n.ssid && n.ssid.trim(); });
					valid5.sort(function(a, b) { return (Number(b.signal) || -100) - (Number(a.signal) || -100); });

					const meshNetworks = valid5.filter(isMeshNet);
					const regularNetworks = valid5.filter(function(n) { return !isMeshNet(n); });

					const mockBtn = E('button', {
						class: 'btn cbi-button cbi-button-neutral',
						type: 'button',
						style: 'font-size: 11px;',
						click: function() {
							selectMasterMeshLink(
								{ ssid: 'ark-mesh', channel: 36, signal: -45, mode: 'Mesh Point', bssid: '76:5A:6F:50:61:77' },
								[{ ssid: 'CASA_ARK_5G', channel: 36, signal: -45, bssid: '70:5A:6F:50:61:77' }],
								list2
							);
						}
					}, ['🧪 Simular Enlace Mesh ark-mesh (Canal 36 / -45 dBm)']);

					if (!valid5.length) {
						scanResultContainer.appendChild(E('div', {
							class: 'alert-message warning',
							style: 'font-size: 11.5px; margin: 4px 0;'
						}, [
							E('strong', {}, ['Nenhuma rede 5 GHz detectada no rádio no momento.']),
							E('p', { style: 'margin: 3px 0 0;' }, [
								'Em ambiente de teste virtual (VM sem placa Wi-Fi física) ou se o Mestre estiver distante, você pode preencher o canal manualmente ou usar a simulação abaixo:'
							]),
							E('div', { style: 'margin-top: 6px;' }, [mockBtn])
						]));
						return;
					}

					const renderFilteredList = function(filterMode) {
						scanResultContainer.innerHTML = '';

						const filterHeader = E('div', { style: 'display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; align-items: center;' }, [
							E('button', {
								class: 'btn cbi-button ' + (filterMode === 'mesh' ? 'cbi-button-action' : 'cbi-button-neutral'),
								type: 'button',
								style: 'font-size: 11px; padding: 3px 10px; font-weight: 700; border-radius: 6px;' + (filterMode === 'mesh' ? ' background: #0284c7 !important; border-color: #38bdf8 !important; color: #fff !important;' : ''),
								click: function() { renderFilteredList('mesh'); }
							}, ['🔗 Apenas Enlaces Mesh (' + meshNetworks.length + ')']),
							E('button', {
								class: 'btn cbi-button ' + (filterMode === 'all' ? 'cbi-button-action' : 'cbi-button-neutral'),
								type: 'button',
								style: 'font-size: 11px; padding: 3px 10px; font-weight: 600; border-radius: 6px;' + (filterMode === 'all' ? ' background: #0284c7 !important; border-color: #38bdf8 !important; color: #fff !important;' : ''),
								click: function() { renderFilteredList('all'); }
							}, ['🌐 Todas as Redes Wi-Fi (' + valid5.length + ')'])
						]);

						scanResultContainer.appendChild(filterHeader);

						if (filterMode === 'mesh' && !meshNetworks.length) {
							scanResultContainer.appendChild(E('div', {
								class: 'alert-message warning',
								style: 'font-size: 11.5px; margin: 4px 0;'
							}, [
								E('strong', {}, ['Nenhum enlace Mesh 802.11s detectado no ar no momento.']),
								E('p', { style: 'margin: 3px 0 0;' }, [
									'Certifique-se de que o Enlace Mesh Sem Fio (802.11s) está ativado no Roteador Principal. Você também pode visualizar todas as redes Wi-Fi normais ou simular:'
								]),
								E('div', { style: 'display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap;' }, [
									E('button', {
										class: 'btn cbi-button cbi-button-action',
										type: 'button',
										style: 'font-size: 11px;',
										click: function() { renderFilteredList('all'); }
									}, ['🌐 Ver Todas as Redes Wi-Fi (' + valid5.length + ')']),
									mockBtn
								])
							]));
							return;
						}

						const itemsToRender = (filterMode === 'mesh') ? meshNetworks : valid5;
						const seenSsid = {};

						itemsToRender.forEach(function(net) {
							if (seenSsid[net.ssid]) return;
							seenSsid[net.ssid] = true;

							const isMesh = isMeshNet(net);
							const sig = Number(net.signal) || -80;
							const chan = net.channel || '?';
							let sigColor = '#22c55e';
							let sigLabel = 'Excelente';
							if (sig < -75) {
								sigColor = '#ef4444';
								sigLabel = 'Fraco (aproxime os nós)';
							} else if (sig < -65) {
								sigColor = '#eab308';
								sigLabel = 'Bom';
							}

							const borderStyle = isMesh
								? 'border: 1px solid rgba(56, 189, 248, 0.45); background: rgba(56, 189, 248, 0.08);'
								: 'border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.25);';

							const itemRow = E('div', {
								style: 'display: flex; justify-content: space-between; align-items: center; padding: 7px 12px; border-radius: 8px; cursor: pointer; margin-bottom: 4px; ' + borderStyle,
								click: function() {
									if (isMesh) {
										selectMasterMeshLink(net, regularNetworks, list2);
									} else {
										selectMasterNetwork(net, list2);
									}
								}
							}, [
								E('div', {}, [
									E('div', { style: 'display: flex; align-items: center; gap: 6px;' }, [
										E('strong', { style: 'font-size: 12.5px; color: ' + (isMesh ? '#38bdf8' : '#f8fafc') + ';' }, [(isMesh ? '🔗 ' : '') + net.ssid]),
										isMesh ? E('span', {
											class: 'ex-pill online',
											style: 'font-size: 10px; padding: 1px 6px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); font-weight: 700;'
										}, ['Enlace 802.11s']) : E('span', {
											class: 'ex-muted',
											style: 'font-size: 10px; padding: 1px 6px; background: rgba(255,255,255,0.05); border-radius: 4px;'
										}, ['Ponto de Acesso'])
									]),
									E('div', { style: 'display: flex; align-items: center; gap: 8px; margin-top: 2px;' }, [
										E('span', { class: 'ex-muted', style: 'font-size: 11px;' }, ['Canal ' + chan]),
										net.bssid ? E('span', { class: 'ex-muted', style: 'font-size: 10px; font-family: monospace;' }, [net.bssid]) : ''
									])
								]),
								E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
									E('span', { style: 'font-size: 11px; font-weight: 700; color: ' + sigColor + ';' }, [sig + ' dBm (' + sigLabel + ')']),
									E('button', {
										class: 'btn cbi-button ' + (isMesh ? 'cbi-button-positive' : 'cbi-button-action'),
										type: 'button',
										style: 'font-size: 10.5px; padding: 3px 10px; font-weight: 700;' + (isMesh ? ' background: #0284c7 !important; border-color: #38bdf8 !important;' : '')
									}, [isMesh ? 'Conectar a este Enlace' : 'Usar Mestre'])
								])
							]);

							scanResultContainer.appendChild(itemRow);
						});
					};

					renderFilteredList(meshNetworks.length > 0 ? 'mesh' : 'all');
				}).catch(function(err) {
					scanBtn.disabled = false;
					scanBtn.textContent = '🔍 Escanear Redes do Mestre no Ar';
					scanResultContainer.innerHTML = '';
					scanResultContainer.appendChild(E('p', { class: 'ex-muted', style: 'font-size: 12px; color: #ef4444;' }, ['Falha ao varrer redes: ' + (err && err.message || err)]));
				});
			});

			const wirelessMeshRow = E('div', { id: 'ex-sat-wireless-mesh-fields', style: 'display: ' + (activeBackhaul === 'air' ? 'grid' : 'none') + '; margin-top: 10px; padding: 10px 12px; background: rgba(0,0,0,0.18); border-radius: 8px; gap: 8px;' }, [
				E('strong', { style: 'display: block; font-size: 13px; color: #38bdf8;' }, ['Parâmetros do Enlace Mesh Sem Fio (802.11s)']),
				E('p', { class: 'ex-muted', style: 'font-size: 12px; margin: 2px 0 6px; line-height: 1.45;' }, [
					'Cria um canal privado direto pelo ar entre os roteadores (Backhaul em 5 GHz para máxima velocidade de até 1.2 Gbps). Ambos os roteadores continuam transmitindo suas redes Wi-Fi normais em 2.4 GHz e 5 GHz com Roaming Rápido (802.11k/v/r) para todos os seus celulares e computadores.'
				]),
				E('div', { style: 'margin-top: 4px;' }, [
					E('small', { class: 'ex-muted' }, ['Mesh ID (Nome do enlace privado entre roteadores):']),
					meshIdInput
				]),
				E('div', { style: 'margin-top: 4px;' }, [
					E('small', { class: 'ex-muted' }, ['Chave secreta do enlace (WPA3-SAE):']),
					meshKeyInput
				]),
				E('div', { style: 'margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;' }, [
					E('div', {}, [
						E('strong', { style: 'font-size: 12px; color: #38bdf8;' }, ['Sintonização Automática de Canal no Ar']),
						E('p', { class: 'ex-muted', style: 'font-size: 11px; margin: 2px 0 0;' }, ['Escaneia e sintoniza no mesmo canal 5 GHz do Mestre para o Mesh fechar pelo ar.'])
					]),
					scanBtn
				]),
				scanResultContainer,
				channelStatusNote
			]);

			if (isAlreadySatellite && activeBackhaul === 'air') {
				channelStatusNote.style.display = 'block';
				channelStatusNote.innerHTML = '';
				channelStatusNote.appendChild(E('span', { style: 'color: #22c55e; font-weight: 700;' }, ['✔ Enlace Mesh 802.11s Ativo: ' + (d.mesh_id || 'ark-mesh')]));
				const detailText = ' • Canal 5G ' + (d.channel_5g || '36') + ' • Conectado ao Mestre ' + gw;
				channelStatusNote.appendChild(E('span', { class: 'ex-muted', style: 'margin-left: 6px;' }, [detailText]));
			}

			backhaulSelect.addEventListener('change', function() {
				wirelessMeshRow.style.display = (backhaulSelect.value === 'air') ? 'grid' : 'none';
			});

			const body = [
				E('div', {
					class: reachable ? 'alert-message success' : 'alert-message warning',
					style: 'margin-bottom: 14px;'
				}, [
					E('h4', { style: 'margin-top: 0;' }, [reachable ? '✅ Roteador Principal Detectado' : '⚠️ Verificação de Conexão com o Mestre']),
					E('p', { style: 'margin: 4px 0 0; line-height: 1.45;' }, [
						reachable
							? ('Roteador Mestre respondendo no endereço ' + gw + '. Conexão pronta para sincronização.')
							: 'O roteador principal não respondeu ao teste rápido no gateway. Conecte o cabo de rede vindo do Mestre ou confirme o IP manualmente abaixo.'
					])
				]),

				isAlreadySatellite ? E('div', { class: 'alert-message info', style: 'margin-bottom: 12px;' }, [
					E('strong', {}, ['Este roteador já está configurado como Roteador Secundário (Ponto Adicional).']),
					E('p', { style: 'margin: 4px 0 0;' }, ['Para voltar a utilizá-lo como roteador principal (reativando DHCP e WAN), clique no botão de reversão abaixo.'])
				]) : '',

				E('div', { style: 'display: grid; gap: 12px;' }, [
					E('label', { class: 'ex-device-config-block' }, [
						E('strong', {}, ['1. IP do Roteador Principal (Mestre na Rede)']),
						masterIpInput,
						E('small', { class: 'ex-muted' }, ['Endereço onde o roteador principal está operando (ex: 192.168.1.1).'])
					]),

					E('label', { class: 'ex-device-config-block' }, [
						E('strong', {}, ['2. Tipo de Conexão deste Roteador Secundário']),
						backhaulSelect,
						E('small', { class: 'ex-muted' }, ['Cabos garantem 100% da velocidade. Use sem fio apenas se não houver cabos passando pelas paredes.'])
					]),

					wirelessMeshRow,

					E('label', { class: 'ex-device-config-block' }, [
						E('strong', {}, ['3. Modo de Endereço IP do Roteador Secundário']),
						ipModeSelect
					]),

					satIpRow,

					E('div', { style: 'padding: 10px 12px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; font-size: 12px; line-height: 1.45;' }, [
						E('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;' }, [
							E('strong', { style: 'color: #38bdf8;' }, ['🔒 Amarração e Reserva de MAC no Roteador Principal:']),
							E('span', { class: 'ex-pill online', style: 'font-size: 10px; padding: 1px 6px;' }, ['PROTEGIDO'])
						]),
						E('span', {}, ['MAC físico deste aparelho: ']),
						E('code', { style: 'font-weight: 700; color: #f8fafc;' }, [d.local_mac || 'Detectando…']),
						E('p', { class: 'ex-muted', style: 'margin: 4px 0 0;' }, [
							'Este Roteador Secundário assumirá o IP fixo configurado acima (ex: ', E('strong', { style: 'color: #38bdf8;' }, [suggestedSatIp || '192.168.73.2']), '). ',
							'Para total segurança e evitar que qualquer outro celular ou computador pegue este mesmo endereço, fixe este IP no Roteador Principal salvando o MAC físico acima em “Rede > DHCP > Concessões Estáticas”. Assim, o Mestre sempre manterá este IP reservado exclusivamente para este aparelho.'
						])
					]),

					E('div', { id: 'ex-sat-section-4', style: 'margin-top: 8px; padding: 12px; background: rgba(127,127,127,0.06); border-radius: 10px; border: 1px solid rgba(127,127,127,0.14);' }, [
						E('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;' }, [
							E('strong', { style: 'font-size: 13.5px; color: #38bdf8;' }, ['4. Sincronização Wi-Fi & Roaming (802.11k/v/r)']),
							importMasterBtn
						]),
						E('p', { class: 'ex-muted', style: 'font-size: 12px; margin-bottom: 10px; line-height: 1.45;' }, [
							'Ambas as frequências (2.4 GHz e 5 GHz) funcionam e são transmitidas por este aparelho. Insira o nome e a senha idênticos aos do Mestre para que celulares e notebooks transitem automaticamente entre os cômodos sem quedas.'
						]),
						importSyncCard,
						E('div', { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px;' }, [
							E('div', {}, [
								E('strong', { style: 'display: block; font-size: 12px;' }, ['Wi-Fi 2,4 GHz (SSID)']),
								ssid2gInput,
								E('strong', { style: 'display: block; font-size: 12px; margin-top: 6px;' }, ['Senha 2,4 GHz']),
								key2gInput
							]),
							E('div', {}, [
								E('strong', { style: 'display: block; font-size: 12px;' }, ['Wi-Fi 5 GHz (SSID)']),
								ssid5gInput,
								E('strong', { style: 'display: block; font-size: 12px; margin-top: 6px;' }, ['Senha 5 GHz']),
								key5gInput,
								E('strong', { style: 'display: block; font-size: 12px; margin-top: 6px;' }, ['Canal 5 GHz do Mestre']),
								targetChannel5gInput,
								E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Sintonizado automaticamente pelo scanner de redes acima.'])
							])
						]),
						E('div', { style: 'margin-top: 10px;' }, [
							E('strong', { style: 'display: block; font-size: 12px;' }, ['Mobility Domain (Fast Transition 802.11r)']),
							mobDomainInput,
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 4px; line-height: 1.45;' }, [
								'Identificador do grupo de roaming rápido (802.11r). Deve ter ',
								E('strong', {}, ['exatamente 4 caracteres hexadecimais']),
								' (dígitos de 0 a 9 e letras de a a f, ex: ',
								E('code', {}, ['a1b2']),
								', ',
								E('code', {}, ['cafe']),
								', ',
								E('code', {}, ['0001']),
								'). ',
								E('strong', { style: 'color: #38bdf8;' }, ['Deve ser idêntico em todos os roteadores da casa']),
								' para que celulares troquem de aparelho sem travar chamadas de voz ou jogos.'
							])
						])
					]),

					E('div', { style: 'padding: 10px 12px; background: rgba(56, 189, 248, 0.07); border-radius: 8px; font-size: 12px; line-height: 1.45;' }, [
						E('strong', { style: 'color: #38bdf8;' }, ['💡 Como funciona o isolamento inteligente: ']),
						'O servidor DHCP local será desligado (eliminando NAT duplo). Os canais e potências de rádio de cada aparelho operam de maneira independente, evitando auto-interferência mesmo misturando roteadores de modelos diferentes (Wi-Fi 7, Wi-Fi 6 ou Wi-Fi 5).'
					])
				]),

				E('div', { class: 'right', style: 'margin-top: 18px; display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Cancelar']),
					isAlreadySatellite ? E('button', {
						class: 'btn cbi-button cbi-button-reset',
						click: L.bind(function(ev) {
							ev.currentTarget.disabled = true;
							ev.currentTarget.textContent = 'Revertendo…';
							return fs.exec('/usr/sbin/equipe-dashboard-control', ['wifi-mesh-satellite-revert']).then(function() {
								ui.hideModal();
								reloadSoon('Roteador revertido para Mestre (DHCP reativado). Reconectando em 192.168.1.1…', 3000);
							});
						}, this)
					}, ['🔄 Reverter para Mestre']) : '',
					E('button', {
						class: 'btn cbi-button cbi-button-positive',
						style: 'background: #0284c7 !important; border-color: #38bdf8 !important; color: #fff !important; font-weight: 750 !important;',
						click: L.bind(function(ev) {
							const btn = ev.currentTarget;
							const masterIp = masterIpInput.value.trim();
							const satIpMode = ipModeSelect.value;
							const satIp = satIpInput.value.trim();
							const satNetmask = (typeof satNetmaskInput !== 'undefined' && satNetmaskInput.value) ? satNetmaskInput.value.trim() : '255.255.255.0';
							const satGateway = (typeof satGatewayInput !== 'undefined' && satGatewayInput.value) ? satGatewayInput.value.trim() : masterIp;
							const satDns = (typeof satDnsInput !== 'undefined' && satDnsInput.value) ? satDnsInput.value.trim() : (masterIp + ', 1.1.1.1');
							const effectiveMasterIp = satGateway || masterIp;
							const isAir = (backhaulSelect.value === 'air');
							const meshId = meshIdInput.value.trim();
							const meshKey = meshKeyInput.value.trim();
							const s2 = ssid2gInput.value.trim();
							const k2 = key2gInput.value.trim();
							const s5 = ssid5gInput.value.trim();
							const k5 = key5gInput.value.trim();
							const mob = mobDomainInput.value.trim() || 'a1b2';
							const targetChan5 = (typeof targetChannel5gInput !== 'undefined' && targetChannel5gInput.value) ? targetChannel5gInput.value.trim() : '';

							if (!masterIp) { ui.addNotification(null, E('p', {}, ['Informe o endereço IP do roteador principal.']), 'danger'); return; }
							if (satIpMode === 'static' && !satIp) { ui.addNotification(null, E('p', {}, ['Informe o IP estático desejado para este Roteador Secundário.']), 'danger'); return; }
							if (isAir) {
								if (!meshId) { ui.addNotification(null, E('p', {}, ['Informe o Mesh ID para o enlace sem fio.']), 'danger'); return; }
								if (!meshKey || meshKey.length < 8) { ui.addNotification(null, E('p', {}, ['A chave Mesh precisa de pelo menos 8 caracteres.']), 'danger'); return; }
							}

							this.confirmMultiRouterAction(
								'Confirmar Modo Roteador Secundário (Ponto Adicional)',
								[
									E('p', {}, ['Este roteador deixará de distribuir IPs (servidor DHCP desativado) e atuará como extensão do roteador principal ', E('strong', {}, [masterIp]), '.']),
									E('p', { style: 'margin-top: 6px;' }, [
										'Após aplicar, acesse este painel pelo novo IP: ',
										E('strong', { style: 'color: #38bdf8;' }, [satIpMode === 'static' ? ('http://' + satIp + '/') : 'IP atribuído pelo roteador principal']),
										'.'
									]),
									E('p', { style: 'margin-top: 6px;' }, ['Deseja aplicar o Modo Roteador Secundário agora?'])
								],
								L.bind(function() {
									btn.disabled = true;
									btn.textContent = 'Configurando Roteador Secundário…';
									const args = [
										'wifi-mesh-satellite-apply',
										effectiveMasterIp,
										satIpMode,
										satIp,
										isAir ? '1' : '0',
										meshId,
										meshKey,
										s2,
										k2,
										s5,
										k5,
										mob,
										satNetmask,
										satDns,
										targetChan5 || ''
									];
									return fs.exec('/usr/sbin/equipe-dashboard-control', args).then(function(r) {
										ui.hideModal();
										const targetIp = (satIpMode === 'static') ? satIp : masterIp;
										ui.addNotification(null, E('p', {}, ['Roteador Secundário configurado com sucesso! Redirecionando para ' + targetIp + '…']), 'info');
										window.setTimeout(function() {
											window.location.href = 'http://' + targetIp + '/';
										}, 3500);
									}).catch(function(e) {
										btn.disabled = false;
										btn.textContent = '🚀 Salvar e Ativar Roteador Secundário';
										ui.addNotification(null, E('p', {}, [String(e && e.message || e)]), 'danger');
									});
								}, this)
							);
						}, this)
					}, ['🚀 Salvar e Ativar Roteador Secundário'])
				])
			];

			ui.showModal('📡 Assistente de Roteador Secundário (Ponto Adicional de Wi-Fi)', body);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', {}, ['Erro ao consultar mestre: ' + e.message]), 'danger');
			closeModal();
		});
	}
};

// /src/modules/vpn.js - ARK Router LuCI View Module
const vpnMethods = {
	enableZerotier: function(){
		const self = this;
		ui.showModal('Ativar ZeroTier',[E('p',{},['Iniciando serviço ZeroTier e conectando à rede virtual…'])]);
		return fs.exec('/usr/sbin/equipe-dashboard-control',['zerotier-enable']).then(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao iniciar ZeroTier');
			ui.hideModal();
			self.triggerImmediateRefresh('ZeroTier ativado com sucesso!', 'info');
		}).catch(function(e){
			ui.showModal('Ativar ZeroTier',[E('p',{class:'alert-message warning'},[e.message]),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar'])])]);
		});
	},
	disableZerotier: function(){
		const self = this;
		ui.showModal('Desligar ZeroTier',[
			E('p',{},['Desligar o ZeroTier neste roteador? O serviço será totalmente encerrado para economizar CPU e memória RAM. O acesso remoto pela VPN ficará pausado até você reativar.']),
			E('div',{class:'right'},[
				E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),
				' ',
				E('button',{class:'btn cbi-button cbi-button-negative','click':function(){
					return fs.exec('/usr/sbin/equipe-dashboard-control',['zerotier-disable']).then(function(r){
						if(r.code)throw new Error(r.stderr||'Falha ao desligar ZeroTier');
						ui.hideModal();
						self.triggerImmediateRefresh('ZeroTier desligado com sucesso!', 'info');
					}).catch(function(e){
						ui.addNotification(null,E('p',{},[e.message]),'danger');
					});
				}},['Desligar'])
			])
		]);
	},
	joinZerotier: function(){
		const self = this, f=this.feature('zerotier')||{}, current=f.network_id||'';
		const input=E('input',{class:'cbi-input-text',type:'text',value:current,placeholder:'ex.: 8056c2e21c000001',maxlength:16});
		ui.showModal('Entrar na rede ZeroTier',[
			E('p',{},['Cole o Network ID criado no ZeroTier Central. O roteador será autorizado no painel online do ZeroTier depois do join.']),
			E('p',{class:'alert-message warning'},['No plano grátis atual, use o IP ZeroTier para acessar o roteador. Rotas gerenciadas para a LAN inteira podem exigir plano pago.']),
			E('label',{class:'ex-field'},[E('span',{},['Network ID']),input]),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				const id=String(input.value||'').trim();
				return fs.exec('/usr/sbin/equipe-dashboard-control',['zerotier-join',id]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao entrar na rede ZeroTier');ui.hideModal();self.triggerImmediateRefresh('ZeroTier configurado! Autorize o roteador no ZeroTier Central.', 'info');}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Entrar'])])
		]);
	},
	leaveZerotier: function(){
		const self = this, f=this.feature('zerotier')||{}, id=f.network_id||'';
		ui.showModal('Sair da rede ZeroTier',[E('p',{},['Remover este roteador da rede ZeroTier atual?']),E('p',{class:'ex-muted'},[id||'Nenhuma rede detectada.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-negative','click':function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['zerotier-leave',id]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao sair da rede');ui.hideModal();self.triggerImmediateRefresh('ZeroTier desconectado da rede com sucesso!', 'info');}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});}},['Sair'])])]);
	},
	zerotierCard: function(){
		const f=this.feature('zerotier')||{}, installed=!!f.installed, active=!!f.active;
		const ztPill = E('span',{class:'ex-pill '+(active?'online':(installed?'standby':'offline'))},[active?'ATIVO':(installed?'DESLIGADO':'OPCIONAL')]);
		const ztTitleActions = E('div', { class: 'ex-card-title-actions' }, [
			ztPill
		]);
		const ztTitle = E('div',{class:'ex-card-title'},[
			E('div',{},[
				E('span',{class:'ex-kicker'},['ACESSO REMOTO LEVE']),
				E('h3',{},['ZeroTier'])
			]),
			ztTitleActions
		]);
		const ztBody = E('div', { class: 'ex-card-collapse-body' }, [
			E('div', { class: 'ex-card-collapse-inner' }, [
				E('p',{class:'ex-muted'},['Acesso remoto leve para iOS e Windows sem abrir portas na WAN. Quando desligado, o serviço não roda e não consome recursos.']),
				E('div',{class:'ex-grid ex-grid-4 ex-qos-grid'},[
					E('div',{class:'ex-row'},[E('span',{},['Node ID']),E('strong',{},[f.node_id||'—'])]),
					E('div',{class:'ex-row'},[E('span',{},['Network ID']),E('strong',{},[f.network_id||'—'])]),
					E('div',{class:'ex-row'},[E('span',{},['Status da Rede']),E('strong',{},[f.network_status||(active?'Online':'Desligado')])]),
					E('div',{class:'ex-row'},[E('span',{},['IP ZeroTier']),E('strong',{},[active?((f.ip||'—').replace(/\/.*$/,'')):'—'])])
				]),
				installed ? E('div', { class: 'ex-device-config-block', style: 'margin-top: 10px; margin-bottom: 8px;' }, [
					E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
						E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
							E('strong', {}, ['Auto-iniciar no boot']),
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, [
								'Inicia o ZeroTier automaticamente ao ligar o roteador. Em aparelhos compactos, prepara o binário na RAM sem ocupar a flash.'
							])
						]),
						(function(){
							const ztAutostart = !!f.autostart;
							const ztInput = E('input', {
								type: 'checkbox',
								checked: ztAutostart ? '' : null,
								change: function(ev) {
									const input = ev.currentTarget;
									const val = input.checked ? '1' : '0';
									f.autostart = input.checked;
									fs.exec('/usr/sbin/equipe-dashboard-control', ['zerotier-autostart-toggle', val]).then(function(r) {
										if (r.code) throw new Error(r.stderr || 'Falha ao alterar inicialização');
										ui.addNotification(null, E('p', {}, [val === '1' ? 'ZeroTier configurado para iniciar automaticamente no boot.' : 'ZeroTier não irá mais iniciar sozinho no boot.']), 'info');
									}).catch(function(e) {
										input.checked = !input.checked;
										f.autostart = input.checked;
										ui.addNotification(null, E('p', {}, [e.message]), 'danger');
									});
								}
							});
							ztInput.checked = ztAutostart;
							return E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
								ztInput,
								E('span', { class: 'ex-switch-slider' })
							]);
						})()
					])
				]) : '',
				E('div',{class:'ex-speedify-actions'},[
					installed?'':(f.installable!==false?E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,'zerotier')},['Instalar ZeroTier']):E('span',{class:'ex-pill standby',style:'padding:6px 12px;font-weight:700;',title:f.reason||''},['Flash insuficiente'])),
					installed && !active ? E('button',{class:'ex-mini-button','click':L.bind(this.enableZerotier,this)},['▶ Ativar ZeroTier']) : '',
					installed && active ? E('button',{class:'ex-mini-button','click':L.bind(this.joinZerotier,this)},['Entrar / trocar rede']) : '',
					(active && f.ip && f.ip!=='—') ? E('a',{class:'ex-mini-button',href:'http://'+String(f.ip).replace(/\/.*$/,''),target:'_blank',rel:'noopener noreferrer'},['Abrir ARK remoto']) : '',
					installed && active ? E('button',{class:'ex-feature-link','click':L.bind(this.disableZerotier,this)},['⏹ Desligar']) : '',
					installed ? E('button',{class:'ex-feature-link','click':L.bind(this.leaveZerotier,this)},['Sair da rede']) : '',
					E('a',{class:'ex-text-link',href:'https://my.zerotier.com/network',target:'_blank',rel:'noopener noreferrer'},['ZeroTier Central →'])
				]),
				(!installed && f.reason)?E('small',{class:'ex-feature-reason',style:'color:#ef4444;font-weight:600;display:block;margin-top:6px;'},['⚠️ '+f.reason]):'',
				E('small',{class:'ex-muted'},[active ? 'ZeroTier ativo. Use o IP acima para acessar o roteador remotamente.' : 'ZeroTier desligado (processo finalizado, zero uso de CPU e RAM). Clique em Ativar para conectar.'])
			])
		]);
		const ztCardEl = E('section',{class:'ex-card ex-remote-card'},[
			ztTitle,
			ztBody
		]);
		const ztAccordion = setupCardAccordion({
			id: 'zerotier',
			cardEl: ztCardEl,
			titleEl: ztTitle,
			bodyEl: ztBody,
			isActive: active
		});
		ztTitleActions.appendChild(ztAccordion.expandBtn);
		return ztCardEl;
	},
	enableWireguard: function(){
		const self = this;
		ui.showModal('Ativar WireGuard', [E('p', {}, ['Iniciando servidor WireGuard no kernel Linux…'])]);
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-enable']).then(function(r){
			if(r.code) throw new Error(r.stderr || 'Falha ao iniciar WireGuard');
			ui.hideModal();
			self.triggerImmediateRefresh('WireGuard ativado com sucesso!', 'info');
		}).catch(function(e){
			if(reloadAfterExpectedDisconnect(e, 'Servidor WireGuard ativado. Recarregando…', 2500)) return;
			ui.showModal('Ativar WireGuard', [E('p', {class:'alert-message warning'}, [e.message]), E('div', {class:'right'}, [E('button', {class:'btn cbi-button cbi-button-neutral', 'click':closeModal}, ['Fechar'])])]);
		});
	},
	disableWireguard: function(){
		const self = this;
		ui.showModal('Desligar WireGuard', [
			E('p', {}, ['Desligar o WireGuard neste roteador? O túnel VPN será interrompido e os clientes conectados perderão o acesso até você reativar.']),
			E('div', {class:'right'}, [
				E('button', {class:'btn cbi-button cbi-button-neutral', 'click':closeModal}, ['Cancelar']),
				' ',
				E('button', {class:'btn cbi-button cbi-button-negative', 'click':function(){
					return fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-disable']).then(function(r){
						if(r.code) throw new Error(r.stderr || 'Falha ao desligar WireGuard');
						ui.hideModal();
						self.triggerImmediateRefresh('WireGuard desligado com sucesso!', 'info');
					}).catch(function(e){
						if(reloadAfterExpectedDisconnect(e, 'Servidor WireGuard desligado. Recarregando…', 2500)) return;
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					});
				}}, ['Desligar'])
			])
		]);
	},
	showWireGuardQrModal: function(peerName, confText, qrSvg){
		const qrContainer = E('div', {class:'ex-wireguard-qr-box'}, []);
		if(qrSvg){
			qrContainer.innerHTML = qrSvg;
		} else {
			qrContainer.appendChild(E('p', {class:'ex-muted'}, ['QR Code não disponível (instale o pacote qrencode). Use a configuração abaixo.']));
		}

		const confBox = E('textarea', {
			class:'cbi-input-textarea',
			readonly:'readonly',
			rows: 8,
			style:'width:100%; font-family:monospace; font-size:12px; margin-top:10px;'
		}, [confText || '']);

		const downloadBtn = E('button', {
			class:'btn cbi-button cbi-button-action',
			click: function(){
				const blob = new Blob([confText], { type: 'text/plain;charset=utf-8' });
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = (peerName || 'wireguard-client') + '.conf';
				document.body.appendChild(a);
				a.click();
				setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
			}
		}, ['📥 Baixar .conf']);

		const copyBtn = E('button', {
			class:'btn cbi-button cbi-button-neutral',
			click: function(){
				navigator.clipboard.writeText(confText).then(function(){
					ui.addNotification(null, E('p', {}, ['Configuração copiada para a área de transferência!']), 'info');
				}).catch(function(){
					confBox.select();
					document.execCommand('copy');
					ui.addNotification(null, E('p', {}, ['Texto selecionado/copiado!']), 'info');
				});
			}
		}, ['📋 Copiar Texto']);

		ui.showModal('Conectar Cliente: ' + peerName, [
			E('p', {class:'ex-muted'}, ['Escaneie o QR Code no app WireGuard (iOS/Android) ou baixe o arquivo .conf para Windows/Mac.']),
			qrContainer,
			E('div', {style:'margin-top:12px;'}, [
				E('strong', {}, ['Arquivo de Configuração:']),
				confBox
			]),
			E('div', {class:'right', style:'margin-top:14px; display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;'}, [
				downloadBtn,
				copyBtn,
				E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Fechar'])
			])
		]);
	},
	showWireGuardModal: function(){
		const self = this;
		ui.showModal('Carregando WireGuard', [E('p', {}, ['Obtendo estado dos pares e configurações…'])]);

		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-status']).then(function(r){
			if(r.code) throw new Error(r.stderr || 'Falha ao obter status do WireGuard');
			let status = {};
			try { status = JSON.parse(r.stdout); } catch(e){ throw new Error('Resposta JSON inválida do backend'); }
			ui.hideModal();

			const peers = status.peers || [];
			const nextIp = '10.14.0.' + (peers.length + 2);

			const hasCgnat = !!status.is_cgnat;
			const epIpv4 = status.endpoint_ipv4 || '';
			const epIpv6 = status.endpoint_ipv6 || '';

			const nameInput = E('input', {class:'cbi-input-text', type:'text', placeholder:'ex.: Arthur-iPhone', maxlength:32, style:'width:100%;'});
			const ipInput = E('input', {class:'cbi-input-text', type:'text', value:nextIp, placeholder:'ex.: 10.14.0.2', maxlength:24, style:'width:100%;'});
			const endpointInput = E('input', {class:'cbi-input-text', type:'text', value:status.endpoint || '', placeholder:'IP público ou DDNS', maxlength:64, style:'width:100%;'});
			const tunnelSelect = E('select', {class:'cbi-input-select', style:'width:100%;'}, [
				E('option', {value:'full', selected:'selected'}, ['VPN Completa (todo o tráfego 0.0.0.0/0) - Mais seguro']),
				E('option', {value:'split'}, ['Split Tunnel (apenas rede do roteador) - Leve'])
			]);

			const endpointSuggestions = (epIpv4 || epIpv6) ? E('div', {style:'display:flex; gap:6px; flex-wrap:wrap; margin-top:5px; align-items:center;'}, [
				E('small', {class:'ex-muted', style:'font-size:0.72rem;'}, ['Sugestões:']),
				epIpv6 ? E('button', {
					type: 'button',
					class: 'ex-mini-button btn-ipv6',
					style: 'min-height:40px!important; padding:6px 12px!important; font-size:0.8rem!important; display:inline-flex; align-items:center; user-select:none; -webkit-tap-highlight-color:transparent;',
					title: 'Usar IPv6 Global: ' + epIpv6,
					click: function(){ endpointInput.value = epIpv6; }
				}, ['🌐 IPv6 Global (Fura CGNAT)']) : '',
				epIpv4 ? E('button', {
					type: 'button',
					class: 'ex-mini-button',
					style: 'min-height:40px!important; padding:6px 12px!important; font-size:0.8rem!important; display:inline-flex; align-items:center; user-select:none; -webkit-tap-highlight-color:transparent;',
					title: 'Usar IPv4: ' + epIpv4,
					click: function(){ endpointInput.value = epIpv4; }
				}, ['📡 IPv4 (' + epIpv4 + (hasCgnat ? ' - CGNAT' : '') + ')']) : ''
			]) : '';

			const cgnatWarning = hasCgnat ? E('div', {
				class: 'alert-message warning',
				style: 'margin-bottom:12px; display:flex; align-items:flex-start; gap:10px; padding:10px; border-radius:8px;'
			}, [
				E('span', {style:'font-size:1.2rem;'}, ['⚠️']),
				E('div', {}, [
					E('strong', {}, ['Conexão IPv4 em CGNAT (' + (epIpv4 || 'Privado') + ')']),
					E('p', {style:'margin:3px 0 0 0; font-size:0.82rem; line-height:1.35;'}, [
						'Sua operadora coloca o roteador atrás de CGNAT. Dispositivos externos (celular 4G/5G) não conseguem conectar por IPv4. ',
						epIpv6 ? E('span', {style:'color:#22c55e; font-weight:700;'}, ['Recomendamos usar o Endpoint IPv6 Global para conexão direta sem bloqueio.']) : ''
					])
				])
			]) : '';

			const addPeerSection = E('div', {class:'ex-device-config-block', style:'margin-bottom:16px; padding:14px; border:1px solid rgba(127,127,127,.2); border-radius:12px;'}, [
				cgnatWarning,
				E('h4', {style:'margin:0 0 10px; font-size:0.98rem;'}, ['+ Adicionar Novo Dispositivo / Gerar QR Code']),
				E('div', {style:'display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:12px;'}, [
					E('label', {class:'ex-field', style:'margin:0;'}, [E('span', {style:'font-size:0.75rem; font-weight:600; opacity:.75;'}, ['NOME DO DISPOSITIVO']), nameInput]),
					E('label', {class:'ex-field', style:'margin:0;'}, [E('span', {style:'font-size:0.75rem; font-weight:600; opacity:.75;'}, ['IP NA VPN']), ipInput]),
					E('label', {class:'ex-field', style:'margin:0;'}, [E('span', {style:'font-size:0.75rem; font-weight:600; opacity:.75;'}, ['ENDPOINT (IP/DDNS DO ROTEADOR)']), endpointInput, endpointSuggestions]),
					E('label', {class:'ex-field', style:'margin:0;'}, [E('span', {style:'font-size:0.75rem; font-weight:600; opacity:.75;'}, ['TIPO DE TÚNEL']), tunnelSelect])
				]),
				E('div', {style:'display:flex; justify-content:flex-end;'}, [
					E('button', {
						class:'btn cbi-button cbi-button-positive',
						style:'min-height:40px; padding:0 16px;',
						click: function(){
							const name = (nameInput.value || '').trim();
							const ip = (ipInput.value || '').trim();
							const ep = (endpointInput.value || '').trim();
							const mode = tunnelSelect.value;
							if(!name){
								ui.addNotification(null, E('p', {}, ['Informe o nome do dispositivo']), 'warning');
								return;
							}
							ui.showModal('Gerando Chaves & QR Code', [E('p', {}, ['Criando credenciais criptográficas WireGuard…'])]);
							return fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-peer-add', name, ip, ep, mode]).then(function(res){
								if(res.code) throw new Error(res.stderr || 'Falha ao criar par WireGuard');
								let rData = {};
								try { rData = JSON.parse(res.stdout); } catch(err){ throw new Error('Falha ao processar resposta'); }
								ui.hideModal();
								self.showWireGuardQrModal(rData.name || name, rData.conf, rData.qr_svg);
							}).catch(function(err){
								ui.showModal('Erro ao adicionar cliente', [E('p', {class:'alert-message warning'}, [err.message]), E('div', {class:'right'}, [E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Fechar'])])]);
							});
						}
					}, ['⚡ Gerar Par & Exibir QR Code'])
				])
			]);

			const peersList = E('div', {style:'display:flex; flex-direction:column; gap:10px;'}, []);
			if(peers.length === 0){
				peersList.appendChild(E('p', {class:'ex-muted', style:'text-align:center; padding:16px;'}, ['Nenhum dispositivo cliente cadastrado ainda. Use o formulário acima para conectar seu celular ou PC.']));
			} else {
				peers.forEach(function(p){
					const rxMb = (Number(p.rx_bytes || 0) / 1048576).toFixed(1);
					const txMb = (Number(p.tx_bytes || 0) / 1048576).toFixed(1);
					let statusText = 'Nunca conectou';
					let statusColor = 'inherit';
					if(p.online){
						statusText = '● Conectado agora';
						statusColor = '#22c55e';
					} else if(p.latest_handshake > 0){
						const diff = Math.floor(Date.now() / 1000) - Number(p.latest_handshake);
						if(diff < 3600) statusText = 'Visto há ' + Math.floor(diff / 60) + ' min';
						else if(diff < 86400) statusText = 'Visto há ' + Math.floor(diff / 3600) + 'h';
						else statusText = 'Visto há ' + Math.floor(diff / 86400) + 'd';
					}

					const pCard = E('div', {
						class:'ex-wireguard-peer-card',
						style:'display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-radius:10px; background:rgba(127,127,127,.07); flex-wrap:wrap;'
					}, [
						E('div', {style:'flex:1 1 200px; min-width:0;'}, [
							E('div', {style:'display:flex; align-items:center; gap:8px;'}, [
								E('strong', {style:'font-size:0.95rem;'}, [p.name]),
								E('span', {style:'font-size:0.75rem; color:' + statusColor + '; font-weight:700;'}, [statusText])
							]),
							E('div', {class:'ex-muted', style:'font-size:0.8rem; margin-top:2px;'}, [
								'IP: ' + p.allowed_ips + ' | Tráfego: ↓ ' + rxMb + ' MB  ↑ ' + txMb + ' MB'
							])
						]),
						E('div', {style:'display:flex; gap:8px; align-items:center;'}, [
							p.has_config ? E('button', {
								class:'ex-mini-button',
								style:'min-height:36px;',
								click: function(){
									ui.showModal('Carregando QR Code', [E('p', {}, ['Lendo dados do cliente…'])]);
									fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-peer-qr', p.name]).then(function(qrRes){
										if(qrRes.code) throw new Error(qrRes.stderr || 'Falha ao obter QR');
										let qd = JSON.parse(qrRes.stdout);
										ui.hideModal();
										self.showWireGuardQrModal(p.name, qd.conf, qd.qr_svg);
									}).catch(function(e){
										ui.addNotification(null, E('p', {}, [e.message]), 'danger');
									});
								}
							}, ['📱 Ver QR Code']) : '',
							E('button', {
								class:'ex-feature-link',
								style:'color:#ef4444; min-height:36px; padding:0 8px;',
								click: function(){
									ui.showModal('Excluir ' + p.name, [
										E('p', {}, ['Remover o dispositivo ' + p.name + ' do servidor WireGuard? O acesso deste dispositivo será bloqueado imediatamente.']),
										E('div', {class:'right'}, [
											E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Cancelar']),
											' ',
											E('button', {class:'btn cbi-button cbi-button-negative', click:function(){
												return fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-peer-delete', p.public_key]).then(function(delRes){
													if(delRes.code) throw new Error(delRes.stderr || 'Falha ao remover cliente');
													ui.addNotification(null, E('p', {}, ['Cliente ' + p.name + ' removido com sucesso!']), 'info');
													self.showWireGuardModal();
													self.triggerImmediateRefresh(null, null, false);
												}).catch(function(err){
													ui.addNotification(null, E('p', {}, [err.message]), 'danger');
												});
											}}, ['Excluir'])
										])
									]);
								}
							}, ['Excluir'])
						])
					]);
					peersList.appendChild(pCard);
				});
			}

			ui.showModal('Gerenciar Servidor WireGuard', [
				E('div', {style:'margin-bottom:14px;'}, [
					E('p', {class:'ex-muted', style:'margin-bottom:8px;'}, [
						'Servidor WireGuard ativo no kernel com criptografia Noise Protocol Framework. Chave Pública do Servidor: '
					]),
					E('div', {style:'display:flex; align-items:center; gap:8px; font-family:monospace; font-size:0.8rem; background:rgba(127,127,127,.1); padding:6px 10px; border-radius:6px;'}, [
						E('span', {style:'flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;'}, [status.public_key || '—']),
						E('button', {
							class:'ex-mini-button',
							style:'padding:2px 8px; font-size:0.75rem;',
							click: function(){
								navigator.clipboard.writeText(status.public_key || '').then(function(){
									ui.addNotification(null, E('p', {}, ['Chave pública copiada!']), 'info');
								});
							}
						}, ['Copiar'])
					])
				]),
				addPeerSection,
				E('h4', {style:'margin:16px 0 10px; font-size:0.98rem;'}, ['Dispositivos Pareados (' + peers.length + ')']),
				peersList,
				E('div', {class:'right', style:'margin-top:16px;'}, [
					E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Fechar'])
				])
			]);
		}).catch(function(err){
			ui.showModal('WireGuard', [E('p', {class:'alert-message warning'}, [err.message]), E('div', {class:'right'}, [E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Fechar'])])]);
		});
	},
	showWireGuardClientModal: function(isEditing){
		const self = this;
		ui.showModal('Cliente WireGuard', [E('p', {}, ['Obtendo status da conexão VPN…'])]);

		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-client-status']).then(function(r){
			if(r.code) throw new Error(r.stderr || 'Falha ao obter status do cliente WireGuard');
			let status = {};
			try { status = JSON.parse(r.stdout); } catch(e){ throw new Error('Resposta JSON inválida do backend'); }
			ui.hideModal();

			const configured = !!status.configured;
			let existingConf = '';
			if(status.conf_b64){
				try {
					existingConf = decodeURIComponent(escape(window.atob(status.conf_b64)));
				} catch(e){
					try { existingConf = window.atob(status.conf_b64); } catch(e2){}
				}
			}

			// Mode 1: Configured and NOT in edit mode -> Show status / control dashboard
			if(configured && !isEditing){
				const rxMb = (Number(status.rx_bytes || 0) / 1048576).toFixed(2);
				const txMb = (Number(status.tx_bytes || 0) / 1048576).toFixed(2);

				let statusTitle = 'DESCONECTADO / PAUSADO';
				let statusDesc = 'O túnel está pausado. Nenhuma rota ou tráfego está passando pela VPN.';
				let badgeColor = '#94a3b8';
				let badgeBg = 'rgba(148, 163, 184, 0.12)';
				let dot = '⚪';

				if(status.online){
					statusTitle = 'CONECTADO E OPERACIONAL';
					statusDesc = 'Túnel ativo com handshake recente. O tráfego do roteador está protegido via WireGuard.';
					badgeColor = '#22c55e';
					badgeBg = 'rgba(34, 197, 94, 0.12)';
					dot = '🟢';
				} else if(status.active){
					statusTitle = 'AGUARDANDO RESPOSTA';
					if(status.latest_handshake > 0){
						const diff = Math.floor(Date.now() / 1000) - Number(status.latest_handshake);
						let timeStr = diff + 's';
						if(diff >= 60 && diff < 3600) timeStr = Math.floor(diff / 60) + ' min';
						else if(diff >= 3600) timeStr = Math.floor(diff / 3600) + 'h';
						statusDesc = 'Último contato com o servidor há ' + timeStr + '. Tentando restabelecer conexão…';
					} else {
						statusDesc = 'Nenhum handshake estabelecido ainda. Verifique se o servidor remoto está ligado e acessível.';
					}
					badgeColor = '#eab308';
					badgeBg = 'rgba(234, 179, 8, 0.12)';
					dot = '🟡';
				}

				let handshakeText = 'Nenhum contato';
				if(status.latest_handshake > 0){
					const diff = Math.floor(Date.now() / 1000) - Number(status.latest_handshake);
					if(diff < 60) handshakeText = 'Há ' + diff + ' segundos';
					else if(diff < 3600) handshakeText = 'Há ' + Math.floor(diff / 60) + ' minutos';
					else if(diff < 86400) handshakeText = 'Há ' + Math.floor(diff / 3600) + ' horas';
					else handshakeText = 'Há ' + Math.floor(diff / 86400) + ' dias';
				}

				const statusBox = E('div', {
					style: 'padding: 14px 16px; border-radius: 12px; background:' + badgeBg + '; border: 1px solid ' + badgeColor + '40; margin-bottom: 16px;'
				}, [
					E('div', {style:'display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;'}, [
						E('div', {style:'display:flex; align-items:center; gap:8px; min-width:0;'}, [
							E('span', {style:'font-size:1.1rem;'}, [dot]),
							E('strong', {style:'color:' + badgeColor + '; font-size:0.95rem; text-transform:uppercase; letter-spacing:0.5px;'}, [statusTitle])
						]),
						E('span', {style:'font-size:0.8rem; font-weight:600; opacity:0.8;'}, [
							status.active ? 'Interface wgclient (UP)' : 'Interface wgclient (DOWN)'
						])
					]),
					E('p', {class:'ex-muted', style:'margin:6px 0 0 0; font-size:0.82rem;'}, [statusDesc])
				]);

				const metricsGrid = E('div', {
					style:'display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:16px;'
				}, [
					E('div', {style:'background:rgba(127,127,127,0.06); padding:10px 14px; border-radius:8px; min-width:0;'}, [
						E('span', {style:'font-size:0.75rem; font-weight:600; opacity:0.7; display:block;'}, ['SERVIDOR REMOTO (ENDPOINT)']),
						E('strong', {style:'font-size:0.9rem; word-break:break-all;'}, [status.endpoint || '—'])
					]),
					E('div', {style:'background:rgba(127,127,127,0.06); padding:10px 14px; border-radius:8px; min-width:0;'}, [
						E('span', {style:'font-size:0.75rem; font-weight:600; opacity:0.7; display:block;'}, ['IP LOCAL NA VPN']),
						E('strong', {style:'font-size:0.9rem;'}, [status.client_ip || '—'])
					]),
					E('div', {style:'background:rgba(127,127,127,0.06); padding:10px 14px; border-radius:8px; min-width:0;'}, [
						E('span', {style:'font-size:0.75rem; font-weight:600; opacity:0.7; display:block;'}, ['ÚLTIMO HANDSHAKE']),
						E('strong', {style:'font-size:0.9rem; color:' + (status.online ? '#22c55e' : 'inherit') + ';'}, [handshakeText])
					]),
					E('div', {style:'background:rgba(127,127,127,0.06); padding:10px 14px; border-radius:8px; min-width:0;'}, [
						E('span', {style:'font-size:0.75rem; font-weight:600; opacity:0.7; display:block;'}, ['TRÁFEGO DO TÚNEL']),
						E('strong', {style:'font-size:0.9rem;'}, ['↓ ' + rxMb + ' MB  ↑ ' + txMb + ' MB'])
					])
				]);

				const pubKeySection = status.public_key ? E('div', {style:'margin-bottom:16px;'}, [
					E('span', {style:'font-size:0.75rem; font-weight:600; opacity:0.7; display:block; margin-bottom:4px;'}, ['CHAVE PÚBLICA DO SERVIDOR']),
					E('div', {style:'display:flex; align-items:center; gap:8px; background:rgba(127,127,127,0.08); padding:6px 12px; border-radius:8px; font-family:monospace; font-size:0.78rem; min-width:0;'}, [
						E('span', {style:'flex:1 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; min-width:0;'}, [status.public_key]),
						E('button', {
							class:'ex-mini-button',
							style:'min-height:32px; padding:0 8px; font-size:0.75rem; user-select:none; -webkit-tap-highlight-color:transparent;',
							click: function(){
								navigator.clipboard.writeText(status.public_key).then(function(){
									ui.addNotification(null, E('p', {}, ['Chave pública copiada!']), 'info');
								});
							}
						}, ['Copiar'])
					])
				]) : '';

				const toggleBtn = E('button', {
					class: status.active ? 'btn cbi-button cbi-button-action' : 'btn cbi-button cbi-button-positive',
					style: 'min-height:40px; padding:0 16px; font-weight:600; user-select:none; -webkit-tap-highlight-color:transparent;',
					click: function(){
						const targetState = status.active ? '0' : '1';
						ui.showModal(status.active ? 'Pausando Cliente VPN' : 'Conectando Cliente VPN', [E('p', {}, ['Enviando comando à interface…'])]);
						return fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-client-toggle', targetState]).then(function(res){
							if(res.code) throw new Error(res.stderr || 'Falha ao alterar estado da conexão');
							ui.hideModal();
							ui.addNotification(null, E('p', {}, [targetState === '1' ? 'Cliente ativado. Tentando conectar…' : 'Cliente pausado.']), 'info');
							self.fetchCapabilities().then(function(c){
								self.capabilities = c;
								if(self.dashboardRoot && self.currentData) self.update(self.currentData);
							});
							setTimeout(function(){ self.showWireGuardClientModal(false); }, 800);
						}).catch(function(err){
							if(reloadAfterExpectedDisconnect(err, 'Comando enviado ao cliente WireGuard. Recarregando…', 2500)) return;
							ui.showModal('Erro', [E('p', {class:'alert-message warning'}, [err.message]), E('div', {class:'right'}, [E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Fechar'])])]);
						});
					}
				}, [status.active ? '⏸ Pausar Conexão' : '▶ Conectar Agora']);

				const editBtn = E('button', {
					class:'btn cbi-button cbi-button-neutral',
					style:'min-height:40px; padding:0 14px; user-select:none; -webkit-tap-highlight-color:transparent;',
					click: function(){
						self.showWireGuardClientModal(true);
					}
				}, ['✏ Ver / Trocar Arquivo .conf']);

				const deleteBtn = E('button', {
					class:'btn cbi-button cbi-button-negative',
					style:'min-height:40px; padding:0 14px; user-select:none; -webkit-tap-highlight-color:transparent;',
					click: function(){
						ui.showModal('Excluir Conexão VPN', [
							E('p', {}, ['Deseja remover completamente a conexão do cliente WireGuard? A interface wgclient e as regras de firewall serão excluídas deste roteador.']),
							E('div', {class:'right', style:'margin-top:14px; display:flex; gap:8px; justify-content:flex-end;'}, [
								E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Cancelar']),
								E('button', {
									class:'btn cbi-button cbi-button-negative',
									click: function(){
										ui.showModal('Excluindo Cliente WireGuard', [E('p', {}, ['Removendo configurações…'])]);
										return fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-client-delete']).then(function(delRes){
											if(delRes.code) throw new Error(delRes.stderr || 'Falha ao remover cliente');
											self.triggerImmediateRefresh('Configuração do cliente WireGuard removida com sucesso!', 'info');
										}).catch(function(err){
											if(reloadAfterExpectedDisconnect(err, 'Cliente WireGuard removido. Recarregando o painel…', 2500)) return;
											ui.showModal('Erro ao excluir', [E('p', {class:'alert-message warning'}, [err.message]), E('div', {class:'right'}, [E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Fechar'])])]);
										});
									}
								}, ['Excluir Definitivamente'])
							])
						]);
					}
				}, ['🗑 Excluir']);

				ui.showModal('Cliente WireGuard (Conexão VPN)', [
					statusBox,
					metricsGrid,
					pubKeySection,
					E('div', {class:'right', style:'margin-top:16px; display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;'}, [
						toggleBtn,
						editBtn,
						deleteBtn,
						E('button', {class:'btn cbi-button cbi-button-neutral', style:'min-height:40px;', click:closeModal}, ['Fechar'])
					])
				]);
				return;
			}

			// Mode 2: NOT configured OR in edit mode -> File upload / paste form
			const confTextarea = E('textarea', {
				class:'cbi-input-textarea',
				rows: 9,
				placeholder:'Cole aqui o conteúdo do arquivo .conf recebido do servidor WireGuard:\n\n[Interface]\nPrivateKey = ...\nAddress = 10.0.0.2/24\nDNS = 1.1.1.1\n\n[Peer]\nPublicKey = ...\nEndpoint = vpn.exemplo.com:51820\nAllowedIPs = 0.0.0.0/0',
				style:'width:100%; font-family:monospace; font-size:12px; margin-top:8px; line-height:1.4; box-sizing:border-box; border-radius:8px;'
			}, [existingConf || '']);

			const fileNotice = E('span', {class:'ex-muted', style:'font-size:0.8rem; margin-left:8px;'}, []);

			const fileInput = E('input', {
				type:'file',
				accept:'.conf,.txt',
				style:'display:none;',
				change: function(ev){
					const f = ev.target.files && ev.target.files[0];
					if(!f) return;
					const reader = new FileReader();
					reader.onload = function(evt){
						confTextarea.value = evt.target.result || '';
						fileNotice.textContent = 'Arquivo carregado: ' + f.name;
						updatePreview();
					};
					reader.readAsText(f);
				}
			});

			const previewContainer = E('div', {
				style:'margin-top:10px; padding:10px 14px; border-radius:8px; background:rgba(127,127,127,0.08); font-size:0.82rem;'
			}, [
				E('span', {class:'ex-muted'}, ['Cole o texto acima ou selecione um arquivo .conf para validar os campos.'])
			]);

			function parseConf(text){
				const res = { ip: '', endpoint: '', allowed_ips: '', dns: '', has_privkey: false, has_pubkey: false };
				const lines = (text || '').split('\n');
				for(let i = 0; i < lines.length; i++){
					const line = lines[i].trim();
					if(!line || line.startsWith('#') || line.startsWith(';')) continue;
					const eqIdx = line.indexOf('=');
					if(eqIdx === -1) continue;
					const key = line.substring(0, eqIdx).trim().toLowerCase();
					const val = line.substring(eqIdx + 1).trim();
					if(key === 'privatekey') res.has_privkey = !!val;
					else if(key === 'publickey') res.has_pubkey = !!val;
					else if(key === 'address') res.ip = val;
					else if(key === 'endpoint') res.endpoint = val;
					else if(key === 'allowedips') res.allowed_ips = val;
					else if(key === 'dns') res.dns = val;
				}
				return res;
			}

			function updatePreview(){
				const p = parseConf(confTextarea.value);
				previewContainer.innerHTML = '';

				if(!p.has_privkey && !p.has_pubkey && !p.endpoint){
					previewContainer.appendChild(E('span', {class:'ex-muted'}, ['Aguardando inserção de configuração válida…']));
					return;
				}

				const items = [];
				if(p.endpoint){
					items.push(E('div', {style:'min-width:0;'}, [
						E('span', {style:'font-weight:600; opacity:.75; font-size:0.75rem; display:block;'}, ['SERVIDOR (ENDPOINT)']),
						E('strong', {style:'color:#3b82f6; word-break:break-all;'}, [p.endpoint])
					]));
				}
				if(p.ip){
					items.push(E('div', {style:'min-width:0;'}, [
						E('span', {style:'font-weight:600; opacity:.75; font-size:0.75rem; display:block;'}, ['IP DO CLIENTE']),
						E('strong', {}, [p.ip])
					]));
				}
				if(p.allowed_ips){
					const isFull = p.allowed_ips.indexOf('0.0.0.0/0') !== -1;
					items.push(E('div', {style:'min-width:0;'}, [
						E('span', {style:'font-weight:600; opacity:.75; font-size:0.75rem; display:block;'}, ['ROTEAMENTO (ALLOWED IPS)']),
						E('strong', {style:'color:' + (isFull ? '#22c55e' : 'inherit') + ';'}, [
							isFull ? '0.0.0.0/0 (Toda a Internet)' : p.allowed_ips
						])
					]));
				}
				if(p.dns){
					items.push(E('div', {style:'min-width:0;'}, [
						E('span', {style:'font-weight:600; opacity:.75; font-size:0.75rem; display:block;'}, ['DNS DA VPN']),
						E('strong', {}, [p.dns])
					]));
				}

				const checks = [];
				checks.push(E('span', {style:'font-size:0.75rem; color:' + (p.has_privkey ? '#22c55e' : '#ef4444') + '; font-weight:600;'}, [
					p.has_privkey ? '✓ Chave Privada' : '✗ Falta PrivateKey'
				]));
				checks.push(E('span', {style:'font-size:0.75rem; color:' + (p.has_pubkey ? '#22c55e' : '#ef4444') + '; font-weight:600;'}, [
					p.has_pubkey ? '✓ Chave Servidor' : '✗ Falta PublicKey'
				]));
				checks.push(E('span', {style:'font-size:0.75rem; color:' + (p.endpoint ? '#22c55e' : '#ef4444') + '; font-weight:600;'}, [
					p.endpoint ? '✓ Endpoint Servidor' : '✗ Falta Endpoint'
				]));

				previewContainer.appendChild(E('div', {style:'display:flex; gap:12px; margin-bottom:8px; flex-wrap:wrap;'}, checks));
				if(items.length > 0){
					previewContainer.appendChild(E('div', {style:'display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px; margin-top:6px;'}, items));
				}
			}

			confTextarea.addEventListener('input', updatePreview);
			if(existingConf) updatePreview();

			const uploadBtn = E('button', {
				class:'btn cbi-button cbi-button-action',
				style:'min-height:40px; padding:0 14px; user-select:none; -webkit-tap-highlight-color:transparent;',
				click: function(){
					fileInput.click();
				}
			}, ['📁 Carregar Arquivo .conf']);

			const saveBtn = E('button', {
				class:'btn cbi-button cbi-button-positive',
				style:'min-height:40px; padding:0 20px; font-weight:600; user-select:none; -webkit-tap-highlight-color:transparent;',
				click: function(){
					const raw = (confTextarea.value || '').trim();
					if(!raw){
						ui.addNotification(null, E('p', {}, ['Insira ou carregue o arquivo de configuração']), 'warning');
						return;
					}
					const p = parseConf(raw);
					if(!p.has_privkey || !p.has_pubkey || !p.endpoint){
						ui.addNotification(null, E('p', {}, ['A configuração precisa conter pelo menos PrivateKey, PublicKey e Endpoint']), 'danger');
						return;
					}

					let b64 = '';
					try {
						b64 = window.btoa(unescape(encodeURIComponent(raw)));
					} catch(e){
						ui.addNotification(null, E('p', {}, ['Erro ao codificar configuração']), 'danger');
						return;
					}

					ui.showModal('Salvando Cliente VPN', [E('p', {}, ['Configurando interface wgclient, chaves e firewall…'])]);
					return fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-client-import', b64]).then(function(saveRes){
						if(saveRes.code) throw new Error(saveRes.stderr || 'Falha ao importar cliente WireGuard');
						ui.hideModal();
						ui.addNotification(null, E('p', {}, ['Cliente WireGuard importado e conectado com sucesso!']), 'info');
						self.fetchCapabilities().then(function(c){
							self.capabilities = c;
							if(self.dashboardRoot && self.currentData) self.update(self.currentData);
						});
						setTimeout(function(){ self.showWireGuardClientModal(false); }, 1200);
					}).catch(function(err){
						if(reloadAfterExpectedDisconnect(err, 'Cliente WireGuard salvo. Reconectando ao roteador enquanto a rede é reconfigurada…', 3000)) return;
						ui.showModal('Erro ao salvar cliente', [E('p', {class:'alert-message warning'}, [err.message]), E('div', {class:'right'}, [E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Fechar'])])]);
					});
				}
			}, ['⚡ Salvar e Conectar']);

			const modalButtons = [
				uploadBtn,
				saveBtn
			];

			if(configured){
				modalButtons.push(E('button', {
					class:'btn cbi-button cbi-button-neutral',
					style:'min-height:40px; user-select:none; -webkit-tap-highlight-color:transparent;',
					click: function(){ self.showWireGuardClientModal(false); }
				}, ['Voltar ao Status']));
			}

			modalButtons.push(E('button', {
				class:'btn cbi-button cbi-button-neutral',
				style:'min-height:40px; user-select:none; -webkit-tap-highlight-color:transparent;',
				click:closeModal
			}, ['Cancelar']));

			ui.showModal(configured ? 'Editar Cliente WireGuard' : 'Conectar a Servidor WireGuard', [
				E('p', {class:'ex-muted', style:'margin-bottom:12px;'}, [
					'Importe ou cole a configuração (.conf) fornecida pelo seu servidor VPN (ProtonVPN, Mullvad, NordVPN, VPS próprio ou outro roteador). O ARK Router criará a interface no kernel e integrará ao firewall automaticamente.'
				]),
				E('div', {style:'display:flex; align-items:center; gap:8px; margin-bottom:8px;'}, [
					fileInput,
					uploadBtn,
					fileNotice
				]),
				confTextarea,
				previewContainer,
				E('div', {class:'right', style:'margin-top:16px; display:flex; gap:8px; justify-content:flex-end; flex-wrap:wrap;'}, modalButtons)
			]);

		}).catch(function(err){
			ui.showModal('Cliente WireGuard', [
				E('p', {class:'alert-message warning'}, [err.message]),
				E('div', {class:'right'}, [E('button', {class:'btn cbi-button cbi-button-neutral', click:closeModal}, ['Fechar'])])
			]);
		});
	},
	wireguardCard: function(){
		const f = this.feature('wireguard') || {};
		const installed = !!f.installed;
		const active = !!f.active;
		const peersCount = Number(f.peers_count || 0);
		const peersActive = Number(f.peers_active || 0);

		const clientConfigured = !!f.client_configured;
		const clientActive = !!f.client_active;
		const clientOnline = !!f.client_online;
		const clientEndpoint = f.client_endpoint || '';

		let pillClass = 'offline';
		let pillText = 'OPCIONAL';
		if(clientOnline){
			pillClass = 'online';
			pillText = 'CLIENTE CONECTADO';
		} else if(clientActive){
			pillClass = 'standby';
			pillText = 'CLIENTE CONECTANDO';
		} else if(active){
			pillClass = 'online';
			pillText = 'SERVIDOR ATIVO';
		} else if(installed){
			pillClass = 'standby';
			pillText = 'STANDBY';
		}

		let clientStatusText = 'Não configurado';
		let clientStatusColor = 'inherit';
		if(clientOnline){
			clientStatusText = '● Conectado';
			clientStatusColor = '#22c55e';
		} else if(clientActive){
			clientStatusText = 'Conectando…';
			clientStatusColor = '#eab308';
		} else if(clientConfigured){
			clientStatusText = 'Pausado';
			clientStatusColor = '#94a3b8';
		}

		const wgPill = E('span', {class:'ex-pill ' + pillClass}, [pillText]);
		const wgTitleActions = E('div', { class: 'ex-card-title-actions' }, [
			wgPill
		]);
		const wgTitle = E('div', {class:'ex-card-title'}, [
			E('div', {}, [
				E('span', {class:'ex-kicker'}, ['VPN DE ALTA PERFORMANCE (KERNEL)']),
				E('h3', {}, ['WireGuard VPN'])
			]),
			wgTitleActions
		]);
		const wgBody = E('div', { class: 'ex-card-collapse-body' }, [
			E('div', { class: 'ex-card-collapse-inner' }, [
				E('p', {class:'ex-muted'}, [
					'VPN ultrarrápida integrada diretamente ao kernel Linux. Conecte este roteador a um servidor externo (Cliente VPN) ou configure seu próprio servidor local com geração de QR Code para celulares e computadores.'
				]),
				E('div', {class:'ex-grid ex-grid-4 ex-qos-grid'}, [
					E('div', {class:'ex-row'}, [
						E('span', {}, ['Cliente VPN']),
						E('strong', {style:'color:' + clientStatusColor + ';'}, [clientStatusText])
					]),
					E('div', {class:'ex-row'}, [
						E('span', {}, ['Servidor Remoto']),
						E('strong', {style:'overflow:hidden; text-overflow:ellipsis; white-space:nowrap;'}, [clientEndpoint || '—'])
					]),
					E('div', {class:'ex-row'}, [
						E('span', {}, ['Servidor Local']),
						E('strong', {}, [active ? ('Ativo (:' + (f.listen_port || '51820') + ')') : (installed ? 'Desligado' : 'Não instalado')])
					]),
					E('div', {class:'ex-row'}, [
						E('span', {}, ['Dispositivos Servidor']),
						E('strong', {}, [active ? (peersActive + ' ativos (' + peersCount + ' total)') : (peersCount + ' cadastrados')])
					])
				]),
				installed ? E('div', { class: 'ex-device-config-block', style: 'margin-top: 10px; margin-bottom: 8px;' }, [
					E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
						E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
							E('strong', {}, ['Auto-iniciar no boot']),
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, [
								'Inicia os túneis e carrega as regras de firewall do WireGuard automaticamente ao ligar o roteador.'
							])
						]),
						(function(){
							const wgAutostart = !!f.autostart;
							const wgInput = E('input', {
								type: 'checkbox',
								checked: wgAutostart ? '' : null,
								change: function(ev) {
									const input = ev.currentTarget;
									const val = input.checked ? '1' : '0';
									f.autostart = input.checked;
									fs.exec('/usr/sbin/equipe-dashboard-control', ['wireguard-autostart-toggle', val]).then(function(r) {
										if (r.code) throw new Error(r.stderr || 'Falha ao alterar inicialização');
										ui.addNotification(null, E('p', {}, [val === '1' ? 'WireGuard configurado para iniciar automaticamente no boot.' : 'WireGuard não irá mais iniciar sozinho no boot.']), 'info');
									}).catch(function(e) {
										input.checked = !input.checked;
										f.autostart = input.checked;
										ui.addNotification(null, E('p', {}, [e.message]), 'danger');
									});
								}
							});
							wgInput.checked = wgAutostart;
							return E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
								wgInput,
								E('span', { class: 'ex-switch-slider' })
							]);
						})()
					])
				]) : '',
				E('div', {class:'ex-speedify-actions'}, [
					installed ? '' : E('button', {class:'ex-mini-button', style:'min-height:40px;', click:L.bind(this.installFeature, this, 'wireguard')}, ['Instalar WireGuard']),
					installed ? E('button', {
						class:'btn cbi-button cbi-button-action ex-mini-button',
						style:'min-height:40px; font-weight:600; padding:0 14px; user-select:none; -webkit-tap-highlight-color:transparent;',
						click:L.bind(this.showWireGuardClientModal, this, false)
					}, [
						clientConfigured ? (clientOnline ? '🌐 Cliente VPN (Conectado)' : '🌐 Cliente VPN (Configurado)') : '🌐 Conectar a Servidor (Cliente)'
					]) : '',
					installed ? E('button', {
						class:'btn cbi-button cbi-button-neutral ex-mini-button',
						style:'min-height:40px; padding:0 14px; user-select:none; -webkit-tap-highlight-color:transparent;',
						click:L.bind(this.showWireGuardModal, this)
					}, [
						active ? ('📱 Servidor Local (' + peersCount + ')') : '📱 Servidor Local'
					]) : '',
					installed && !active ? E('button', {class:'ex-feature-link', style:'min-height:40px;', click:L.bind(this.enableWireguard, this)}, ['▶ Ligar Servidor']) : '',
					installed && active ? E('button', {class:'ex-feature-link', style:'min-height:40px; color:#ef4444;', click:L.bind(this.disableWireguard, this)}, ['⏹ Desligar Servidor']) : '',
					E('a', {class:'ex-text-link', href:L.url('admin/network/network'), target:'_blank', rel:'noopener noreferrer'}, ['Interfaces LuCI →'])
				]),
				E('small', {class:'ex-muted'}, [
					clientOnline ? ('Túnel Cliente conectado a ' + clientEndpoint + '. O tráfego do roteador está protegido via VPN.') :
					(clientActive ? ('Túnel Cliente ativo, aguardando resposta de ' + clientEndpoint + '.') :
					(active ? 'Servidor WireGuard ativo e pronto para tráfego seguro. Toque em “Servidor Local” para parear celulares via QR Code.' :
					'WireGuard pronto para uso. Toque em “Conectar a Servidor” para usar como cliente VPN ou configure o servidor local.'))
				])
			])
		]);
		const wgCardEl = E('section', {class:'ex-card ex-remote-card'}, [
			wgTitle,
			wgBody
		]);
		const wgAccordion = setupCardAccordion({
			id: 'wireguard',
			cardEl: wgCardEl,
			titleEl: wgTitle,
			bodyEl: wgBody,
			isActive: clientOnline || clientActive || active
		});
		wgTitleActions.appendChild(wgAccordion.expandBtn);
		return wgCardEl;
	}
};

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
		if (f.dns_intercept !== false) activeProtections.push('📺 Smart TVs');
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
				(active && mode === 'local' && f.stat_running) ? E('div', {
					class: 'ex-grid ex-grid-4 ex-qos-grid',
					style: 'margin-bottom: 12px; background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('div', { class: 'ex-row' }, [
						E('span', {}, ['Status DNS']),
						E('strong', { style: 'color: #10b981;' }, ['🟢 Online (127.0.0.1:5335)'])
					]),
					E('div', { class: 'ex-row' }, [
						E('span', {}, ['Consultas DNS']),
						E('strong', {}, [(Number(f.stat_queries || 0)).toLocaleString('pt-BR')])
					]),
					E('div', { class: 'ex-row' }, [
						E('span', {}, ['Anúncios Bloqueados']),
						E('strong', { style: 'color: #ef4444;' }, [
							(Number(f.stat_blocked || 0)).toLocaleString('pt-BR') + 
							(f.stat_blocked_pct ? (' (' + f.stat_blocked_pct + '%)') : '')
						])
					]),
					E('div', { class: 'ex-row' }, [
						E('span', {}, ['Tempo de Resposta']),
						E('strong', {}, [(f.stat_avg_ms || '0.0') + ' ms'])
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
		const rawHost = window.location.hostname || '192.168.1.1';
		const cleanHost = rawHost.replace(/\/.*$/, '').replace(/%[0-9a-zA-Z]+$/, '');
		const port = f.web_port || 3000;
		let targetUrl = 'http://' + cleanHost + ':' + port;
		if (f.web_url && !f.web_url.includes('/24') && !f.web_url.includes('/16')) {
			targetUrl = f.web_url.replace(/\/[0-9]+:/, ':');
		}

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
			const titleNodes = Array.isArray(title) ? title : [title];
			const descNodes = Array.isArray(desc) ? desc : [desc];
			const row = E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; padding: 10px 12px; background: rgba(255,255,255,.03); border-radius: 8px;' }, [
				E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
					E('strong', { style: 'font-size: 0.88rem; display: block;' }, titleNodes),
					E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px; line-height: 1.35;' }, descNodes)
				]),
				label
			]);
			return { row: row, input: input };
		};

		const protMalware = makeToggleRow(
			[
				_t('🛡️ Navegação Segura (Anti-Malware & Phishing)'),
				' ',
				E('span', {
					class: 'ex-pill warning',
					style: 'font-size: 0.68rem; margin-left: 6px; padding: 2px 7px; vertical-align: middle; background: rgba(234,179,8,0.18); border: 1px solid rgba(234,179,8,0.4); color: #facc15; font-weight: 700; border-radius: 4px;'
				}, [_t('Nuvem Externa')])
			],
			[
				_t('Bloqueia sites maliciosos e golpes antes que sejam abertos via checagem em servidores online.'),
				' ',
				E('span', { style: 'color: #f59e0b; font-weight: 600;' }, [_t('Atenção:')]),
				' ',
				E('span', { style: 'color: #fbbf24;' }, [_t('Pode elevar o tempo de resposta do DNS e reduzir a velocidade durante uso pesado de torrents.')])
			],
			f.protection_enabled !== false
		);

		const protParental = makeToggleRow(
			[
				_t('👨‍👩‍👧 Controle Parental (Bloqueio Adulto)'),
				' ',
				E('span', {
					class: 'ex-pill warning',
					style: 'font-size: 0.68rem; margin-left: 6px; padding: 2px 7px; vertical-align: middle; background: rgba(234,179,8,0.18); border: 1px solid rgba(234,179,8,0.4); color: #facc15; font-weight: 700; border-radius: 4px;'
				}, [_t('Nuvem Externa')])
			],
			[
				_t('Bloqueia automaticamente pornografia e conteúdos impróprios para menores na rede toda via servidores online.'),
				' ',
				E('span', { style: 'color: #f59e0b; font-weight: 600;' }, [_t('Atenção:')]),
				' ',
				E('span', { style: 'color: #fbbf24;' }, [_t('Pode causar lentidão no DNS em redes com alto volume de conexões.')])
			],
			!!f.parental_enabled
		);

		const protSafeSearch = makeToggleRow(
			_t('🔍 Busca Segura Forçada (SafeSearch)'),
			_t('Obriga o filtro de família no Google, Bing, YouTube e DuckDuckGo para proteger crianças.'),
			!!f.safesearch_enabled
		);

		const protDnsIntercept = makeToggleRow(
			[
				_t('📺 Blindagem de Smart TVs (Interceptar Porta 53)'),
				' ',
				E('span', {
					class: 'ex-pill online',
					style: 'font-size: 0.68rem; margin-left: 6px; padding: 2px 7px; vertical-align: middle; background: rgba(16,185,129,0.18); border: 1px solid rgba(16,185,129,0.4); color: #34d399; font-weight: 700; border-radius: 4px;'
				}, [_t('DNAT Transparente')])
			],
			_t('Força Smart TVs, Chromecasts e aparelhos com DNS embutido a passarem pelo AdGuard. Redireciona consultas externas da porta 53 para o roteador em 0ms.'),
			f.dns_intercept !== false
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
			protSafeSearch.row,
			protDnsIntercept.row
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
						const dnsIntercept = protDnsIntercept.input.checked ? '1' : '0';

						const cmd = active ? 'adblock-configure' : 'adblock-enable';
						const args = [cmd, mode, (mode === 'local' ? cacheMb : prov), prot, par, ss, prov, cCache, String(webPort), ztAcc, rawBlacklist, nextdnsId, rawWhitelist, dnsIntercept];

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
			ui.showModal(_t('Blindagem de Ponto de Acesso'), [
				E('div', { class: 'alert-message warning' }, [
					E('p', { style: 'margin-bottom: 8px; font-weight: 600;' }, [
						'🛡️ O serviço Speedify (Bonding de WANs) é exclusivo do Roteador Mestre.'
					]),
					E('p', {}, [
						_t('Pontos de Acesso (APs) operam como pontes transparentes na rede local. A agregação de links de internet (Speedify Bonding) deve rodar diretamente no roteador de borda principal (Gateway).')
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
		const allNetworkInterfaces=((detectionData.interfaces&&detectionData.interfaces.interface)||[]), wanCandidates=allNetworkInterfaces.filter(function(i){const routes=Array.isArray(i.route)?i.route:[],hasDefault=routes.some(function(r){return r&&(r.target==='0.0.0.0'||Number(r.mask)===0);}),name=String(i.interface||'');return !!i.up&&hasDefault&&Array.isArray(i['ipv4-address'])&&i['ipv4-address'].length>0&&!/^(lan|loopback|guest|wg|zerotier)/i.test(name);}).map(function(i){const name=String(i.interface||''),address=String(i['ipv4-address'][0].address||''),gateway=wanGateway(i),dns=(i['dns-server']||i.dns_server||[]),ipParts=address.split('.').map(Number),cgnatIp=ipParts.length===4&&ipParts[0]===100&&ipParts[1]>=64&&ipParts[1]<=127,starlinkGateway=String(gateway)==='100.64.0.1',starlinkDns=Array.isArray(dns)&&dns.some(function(server){return /^198\.54\.100\./.test(String(server));}),device=String(i.l3_device||i.device||''),confirmed=starlinkDns||(cgnatIp&&starlinkGateway);return {name:name,label:name.toUpperCase(),address:address,gateway:gateway,dns:dns,device:device,likely:confirmed,strong:confirmed};});
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
					_t('A agregação de links de internet (Speedify Bonding) atua nas portas WAN do Roteador Mestre (Gateway). Pontos de Acesso (APs) mantêm tráfego local transparente.')
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

// /src/modules/speedtest.js - ARK Router LuCI View Module
const speedtestMethods = {
	openFastCom: function(){
		this.showEmbedSpeedtest();
	},
	showEmbedSpeedtest: function(){
		const statusPill = E('span', {class:'ex-pill standby'}, ['⏳ CONECTANDO']);
		const clientInfo = E('span', {class:'ex-muted', style:'font-size:12px;'}, ['Identificando rota…']);
		
		const speedNumber = E('span', {style:'font-size:64px;font-weight:850;font-family:monospace;letter-spacing:-1px;color:#3b82f6;line-height:1;'}, ['0']);
		const speedUnit = E('span', {style:'font-size:20px;font-weight:700;color:#94a3b8;margin-left:6px;'}, ['Mbps']);
		const phaseBadge = E('div', {style:'margin-top:6px;font-size:13px;font-weight:750;text-transform:uppercase;letter-spacing:1px;color:#10b981;'}, ['Conectando ao CDN Netflix']);
		
		const pingVal = E('strong', {style:'font-size:20px;color:#fff;'}, ['—']);
		const downVal = E('strong', {style:'font-size:20px;color:#3b82f6;'}, ['—']);
		const upVal = E('strong', {style:'font-size:20px;color:#a855f7;'}, ['—']);
		const serverVal = E('strong', {style:'font-size:13px;color:#e2e8f0;word-break:break-all;'}, ['Netflix OCA']);
		
		const progressBar = E('div', {style:'width:0%;height:4px;background:linear-gradient(90deg,#3b82f6,#a855f7);border-radius:2px;transition:width 0.2s linear;'});
		const progressWrap = E('div', {style:'width:100%;height:4px;background:rgba(255,255,255,.08);border-radius:2px;margin:16px 0 14px;overflow:hidden;'}, [progressBar]);
		
		let lastDown = 0, lastUp = 0;
		const applySqmBtn = E('button', {class:'btn cbi-button cbi-button-action', style:'display:none;font-weight:700;', 'click': L.bind(function(){
			ui.hideModal();
			this.editSqmLimits(lastDown, lastUp);
		}, this)}, ['⚙️ Aplicar limites no SQM (-7%)']);
		
		const restartBtn = E('button', {class:'btn cbi-button cbi-button-neutral', disabled:true, 'click': function(){
			runEngine();
		}}, ['🔄 Repetir Teste']);
		
		let activeAbort = null;
		
		const runEngine = async () => {
			restartBtn.disabled = true;
			applySqmBtn.style.display = 'none';
			speedNumber.textContent = '0';
			speedNumber.style.color = '#3b82f6';
			pingVal.textContent = '…';
			downVal.textContent = '…';
			upVal.textContent = '…';
			progressBar.style.width = '5%';
			phaseBadge.textContent = 'Obtendo servidores Netflix OCA…';
			statusPill.className = 'ex-pill standby';
			statusPill.textContent = 'CONECTANDO';
			
			const abortCtrl = new AbortController();
			activeAbort = abortCtrl;
			
			try {
				const metaRes = await fs.exec('/usr/sbin/equipe-dashboard-control', ['fast-targets', '8']);
				let metaData = {};
				try { metaData = JSON.parse(metaRes.stdout || '{}'); } catch(e) {}
				const targets = (metaData.targets || []).map(function(t){ return t.url; });
				if (!targets.length) throw new Error('Não foi possível obter servidores Netflix OCA no momento.');
				
				if (metaData.client) {
					clientInfo.textContent = (metaData.client.ip || '') + ' (' + (metaData.client.asn ? 'AS' + metaData.client.asn : '') + (metaData.client.location && metaData.client.location.city ? ' • ' + metaData.client.location.city : '') + ')';
					serverVal.textContent = 'Netflix CDN (' + (metaData.client.location && metaData.client.location.city ? metaData.client.location.city : 'Brasil') + ')';
				}
				
				// 1. PING
				phaseBadge.textContent = '1/3 • Medindo Latência e Jitter…';
				statusPill.textContent = 'LATÊNCIA';
				statusPill.className = 'ex-pill online';
				progressBar.style.width = '15%';
				
				const pings = [];
				for (let i = 0; i < 4; i++) {
					if (abortCtrl.signal.aborted) return;
					const t0 = performance.now();
					await fetch(targets[0] + '&ping=' + i, { method: 'HEAD', cache: 'no-store', signal: abortCtrl.signal });
					pings.push(performance.now() - t0);
				}
				const avgPing = Math.round(pings.reduce(function(a, b){ return a + b; }, 0) / pings.length);
				pingVal.textContent = avgPing + ' ms';
				progressBar.style.width = '25%';
				
				// 2. DOWNLOAD (Multi-stream 8-10 conexoes)
				phaseBadge.textContent = '2/3 • Testando Download (Netflix OCA 800M)…';
				statusPill.textContent = 'DOWNLOAD';
				statusPill.className = 'ex-pill online';
				speedNumber.style.color = '#3b82f6';
				
				let bytesDown = 0;
				let downRunning = true;
				const tStartDown = performance.now();
				const downPromises = [];
				
				for (let i = 0; i < 10; i++) {
					const url = targets[i % targets.length] + '&range=0-52428800&_=' + Date.now() + '_' + i;
					const p = (async function(){
						while (downRunning && !abortCtrl.signal.aborted) {
							try {
								const resp = await fetch(url, { signal: abortCtrl.signal, cache: 'no-store' });
								const reader = resp.body.getReader();
								while (downRunning && !abortCtrl.signal.aborted) {
									const chunk = await reader.read();
									if (chunk.done) break;
									bytesDown += chunk.value.byteLength;
								}
							} catch(e) { break; }
						}
					})();
					downPromises.push(p);
				}
				
				const downInterval = setInterval(function(){
					const el = (performance.now() - tStartDown) / 1000;
					if (el > 0.4) {
						const curMbps = Math.round((bytesDown * 8) / (el * 1000000));
						speedNumber.textContent = curMbps;
						downVal.textContent = curMbps + ' Mbps';
						progressBar.style.width = Math.min(60, 25 + (el / 7) * 35) + '%';
					}
				}, 120);
				
				await new Promise(function(r){ setTimeout(r, 7000); });
				downRunning = false;
				clearInterval(downInterval);
				
				const finalDownEl = (performance.now() - tStartDown) / 1000;
				const finalDownMbps = Math.round((bytesDown * 8) / (finalDownEl * 1000000));
				speedNumber.textContent = finalDownMbps;
				downVal.textContent = finalDownMbps + ' Mbps';
				progressBar.style.width = '60%';
				
				// 3. UPLOAD AUTOMATICO (Multi-stream POST)
				phaseBadge.textContent = '3/3 • Testando Upload (Automático)…';
				statusPill.textContent = 'UPLOAD';
				statusPill.className = 'ex-pill online';
				speedNumber.style.color = '#a855f7';
				
				let bytesUp = 0;
				let upRunning = true;
				const tStartUp = performance.now();
				const payload = new Uint8Array(1024 * 1024 * 2); // 2MB
				
				for (let i = 0; i < 8; i++) {
					const url = targets[i % targets.length];
					(async function(){
						while (upRunning && !abortCtrl.signal.aborted) {
							try {
								await fetch(url, {
									method: 'POST',
									body: payload,
									signal: abortCtrl.signal,
									cache: 'no-store',
									mode: 'cors'
								});
								bytesUp += payload.byteLength;
							} catch(e) { break; }
						}
					})();
				}
				
				const upInterval = setInterval(function(){
					const el = (performance.now() - tStartUp) / 1000;
					if (el > 0.4) {
						const curMbps = Math.round((bytesUp * 8) / (el * 1000000));
						speedNumber.textContent = curMbps;
						upVal.textContent = curMbps + ' Mbps';
						progressBar.style.width = Math.min(100, 60 + (el / 7) * 40) + '%';
					}
				}, 120);
				
				await new Promise(function(r){ setTimeout(r, 7000); });
				upRunning = false;
				clearInterval(upInterval);
				
				const finalUpEl = (performance.now() - tStartUp) / 1000;
				const finalUpMbps = Math.round((bytesUp * 8) / (finalUpEl * 1000000));
				upVal.textContent = finalUpMbps + ' Mbps';
				speedNumber.textContent = finalDownMbps;
				speedNumber.style.color = '#10b981';
				progressBar.style.width = '100%';
				
				lastDown = finalDownMbps;
				lastUp = finalUpMbps;
				window._lastSpeedtestResult = { down: finalDownMbps, up: finalUpMbps, ping: avgPing };

				phaseBadge.textContent = '✅ Teste Completo Finalizado!';
				statusPill.className = 'ex-pill online';
				statusPill.textContent = 'CONCLUÍDO';
				applySqmBtn.style.display = 'inline-block';
			} catch(err) {
				if (abortCtrl.signal.aborted) return;
				phaseBadge.textContent = 'Falha no teste: ' + (err.message || String(err));
				statusPill.className = 'ex-pill offline';
				statusPill.textContent = 'ERRO';
			} finally {
				restartBtn.disabled = false;
			}
		};

		ui.showModal('🚀 Teste de Velocidade Turbo (Netflix OCA)', [
			E('div', {style:'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;'}, [
				E('div', {}, [
					E('strong', {style:'color:#e2e8f0;font-size:14px;'}, ['Servidor CDN Netflix OCA']),
					statusPill
				]),
				E('div', {style:'display:flex;gap:6px;'}, [
					E('button', {class:'btn cbi-button cbi-button-action', style:'font-size:11px;font-weight:650;', 'click': function(){ window.open('https://fast.com/', '_blank', 'noopener'); }}, ['↗ Fast.com']),
					E('button', {class:'btn cbi-button cbi-button-neutral', style:'font-size:11px;', 'click': function(){ window.open('https://www.speedtest.net/', '_blank', 'noopener'); }}, ['🌐 Ookla'])
				])
			]),
			E('div', {style:'background:#0f172a;border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:22px;text-align:center;box-shadow:inset 0 2px 10px rgba(0,0,0,.5);'}, [
				phaseBadge,
				E('div', {style:'margin:12px 0;display:flex;align-items:baseline;justify-content:center;'}, [
					speedNumber,
					speedUnit
				]),
				progressWrap,
				E('div', {style:'display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:14px;text-align:left;'}, [
					E('div', {style:'background:rgba(255,255,255,.04);border-radius:10px;padding:10px 12px;border:1px solid rgba(255,255,255,.06);'}, [
						E('small', {class:'ex-muted', style:'display:block;font-size:11px;'}, ['⚡ Latência']),
						pingVal
					]),
					E('div', {style:'background:rgba(255,255,255,.04);border-radius:10px;padding:10px 12px;border:1px solid rgba(255,255,255,.06);'}, [
						E('small', {class:'ex-muted', style:'display:block;font-size:11px;'}, ['⬇️ Download']),
						downVal
					]),
					E('div', {style:'background:rgba(255,255,255,.04);border-radius:10px;padding:10px 12px;border:1px solid rgba(255,255,255,.06);'}, [
						E('small', {class:'ex-muted', style:'display:block;font-size:11px;'}, ['⬆️ Upload']),
						upVal
					]),
					E('div', {style:'background:rgba(255,255,255,.04);border-radius:10px;padding:10px 12px;border:1px solid rgba(255,255,255,.06);'}, [
						E('small', {class:'ex-muted', style:'display:block;font-size:11px;'}, ['🏢 Servidor / ISP']),
						serverVal
					])
				]),
				E('div', {style:'margin-top:12px;'}, [clientInfo])
			]),
			E('div', {style:'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:14px;'}, [
				E('div', {style:'display:flex;gap:8px;'}, [
					restartBtn,
					applySqmBtn
				]),
				E('button', {class:'btn cbi-button cbi-button-neutral', 'click': function(){
					if (activeAbort) activeAbort.abort();
					closeModal();
				}}, ['Fechar'])
			])
		]);

		setTimeout(runEngine, 200);
	},

	runSpeedtest: function(wan){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedtest-start',wan]).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao iniciar o teste');
			const n=document.getElementById('ex-speedtest-'+wan+'-result');
			if(n)this.renderSpeedtestProgress(wan,5,'Preparando teste');
			this.pollSpeedtest(wan,0);
		},this));
	},
	renderSpeedtestProgress: function(wan,percent,message){
		const node=document.getElementById('ex-speedtest-'+wan+'-result');if(!node)return;
		percent=Math.max(0,Math.min(99,Number(percent)||0));
		node.replaceChildren(E('div',{class:'ex-speedtest-progress'},[
			E('div',{class:'ex-speedtest-progress-head'},[E('strong',{},[percent+'%']),E('span',{},[message||'Teste em andamento…'])]),
			E('div',{class:'ex-speedtest-progress-bar'},[E('i',{style:'width:'+percent+'%'})]),
			E('small',{class:'ex-muted'},['Não feche esta tela se quiser acompanhar o progresso. O teste continua no roteador.'])
		]));
	},
	startSpeedtest: function(wan,label){
		const sf=this.feature('speedify')||{}, speedifyOn=sf&&sf.state==='CONNECTED';
		ui.showModal('Iniciar teste',[E('p',{},[label]),speedifyOn?E('p',{class:'alert-message warning'},['Speedify está conectado. Para calibrar WAN/SQM real, desconecte antes; caso contrário o teste pode medir o túnel ou uma rota alterada.']):'',E('p',{class:'alert-message warning'},['O teste faz uma medição completa e mais duas de upload. O SQM desta WAN será pausado e restaurado automaticamente. Durante o teste, o link ficará ocupado.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return this.runSpeedtest(wan).then(function(){ui.hideModal();}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});},this)},['Iniciar teste'])])]);
	},
	startConnectedSpeedtests: function(){
		const data=this.currentData||{}, wans=[['wan','WAN1',!!iface(data.interfaces,'wan').up],['wan2','WAN2',!!iface(data.interfaces,'wan2').up]].filter(function(x){return x[2];}), sf=this.feature('speedify')||{}, speedifyOn=sf&&sf.state==='CONNECTED';
		if(!wans.length){ui.addNotification(null,E('p',{},['Nenhuma WAN conectada para testar.']),'warning');return;}
		ui.showModal('Testar WANs conectadas',[
			E('p',{},['Serão testadas individualmente: '+wans.map(function(x){return x[1];}).join(' e ')+'.']),
			speedifyOn?E('p',{class:'alert-message warning'},['Speedify está conectado. Para calibrar WAN/SQM real, desconecte antes de rodar os testes.']):'',
			E('p',{class:'alert-message warning'},['Os testes rodam em paralelo visualmente, mas cada WAN é medida pela sua interface/IP. O link ficará ocupado durante a medição.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				ui.hideModal();
				wans.forEach(L.bind(function(w){this.runSpeedtest(w[0]).catch(function(e){ui.addNotification(null,E('p',{},[w[1]+': '+e.message]),'danger');});},this));
			},this)},['Iniciar testes'])])
		]);
	},
	pollSpeedtest: function(wan,attempt){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedtest-status',wan]).then(L.bind(function(r){
			const raw=String(r.stdout||'').trim(), parts=raw.split('|'), state=parts[0];
			if(state==='done')return this.loadSpeedtestResult(wan).then(function(){ui.addNotification(null,E('p',{},['Teste concluído.']));});
			if(state==='error'||attempt>300){ui.addNotification(null,E('p',{},['O teste não foi concluído. O SQM já foi restaurado.']));return;}
			if(state==='running')this.renderSpeedtestProgress(wan,parts[1]||15,parts[2]||'Teste em andamento…');
			window.setTimeout(L.bind(this.pollSpeedtest,this,wan,attempt+1),2000);
		},this));
	},
	loadSpeedtestResult: function(wan){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedtest-result',wan]).then(L.bind(function(r){try{const data=JSON.parse(r.stdout||'{}');if(data&&(data.suggested_kbps||data.history)){this.speedResults[wan]=data;this.renderSpeedtestResult(wan,data);}}catch(e){}},this));
	},
	renderSpeedtestResult: function(wan,data){
		const node=document.getElementById('ex-speedtest-'+wan+'-result');if(!node)return;const runs=(data.upload_runs_mbps||[]).map(function(v){return Number(v).toFixed(2)+' Mbps';}).join(' • '), suggestions=data.suggested_kbps||{};
		const history=data.history||{}, avg=history.average||{}, items=history.items||[];
		const blocks=[];
		if(data.suggested_kbps)blocks.push(E('div',{class:'ex-speedtest-metrics'},[E('div',{},[E('span',{},['Medições de upload']),E('strong',{},[runs||'—'])]),E('div',{},[E('span',{},['Download medido']),E('strong',{},[Number(data.download_mbps||0).toFixed(2)+' Mbps'])]),E('div',{},[E('span',{},['Latência']),E('strong',{},[Number(data.latency_ms||0).toFixed(1)+' ms'])])]),E('div',{class:'ex-speedtest-suggestion'},[E('span',{},['Sugestão conservadora']),E('strong',{},[formatRate(Number(suggestions.conservative||0)*1000)]),E('div',{},[['conservative','Aplicar 85%'],['balanced','Aplicar 90%'],['aggressive','Aplicar 95%']].map(L.bind(function(item){return E('button',{class:'ex-mini-button','click':L.bind(this.applySpeedtestSuggestion,this,wan,suggestions[item[0]])},[item[1]]);},this))) ]));
		if(items.length)blocks.push(E('div',{class:'ex-speedtest-history'},[E('strong',{},['Últimos '+items.length+' testes']),E('small',{class:'ex-muted'},['Média: ↓ '+Number(avg.download_mbps||0).toFixed(2)+' Mbps • ↑ '+formatRate(Number((avg.suggested_kbps||{}).balanced||0)*1000)+' • '+Number(avg.latency_ms||0).toFixed(1)+' ms']),E('div',{},items.map(function(it){return E('small',{},[(it.time||'').replace('T',' ').replace(/[+-][0-9]{4}$/,''),' • ↓ ',Number(it.download_mbps||0).toFixed(2),' Mbps • ↑ ',formatRate(Number(((it.suggested_kbps||{}).balanced)||0)*1000),' • ',Number(it.latency_ms||0).toFixed(1),' ms']);}))]));
		node.replaceChildren.apply(node,blocks.length?blocks:[E('span',{class:'ex-muted'},['Sem resultado nesta sessão.'])]);translateTree(node);
	},
	applySpeedtestSuggestion: function(wan,kbps){
		kbps=Math.round(Number(kbps)||0);if(!kbps)return;ui.showModal('Aplicar sugestão ao SQM',[E('p',{},[(wan==='wan'?'WAN1':'WAN2')+': '+formatRate(kbps*1000)]),E('p',{class:'alert-message warning'},['O novo limite será salvo e o SQM será reiniciado.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['speedtest-apply',wan,String(kbps)]).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao aplicar');this.triggerImmediateRefresh('Sugestão de velocidade aplicada ao SQM com sucesso!','info');},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});},this)},['Aplicar'])])]);
	}
};

// /src/modules/system.js - ARK Router LuCI View Module
const systemMethods = {
	setDashboardLanguage: function(language){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['language',language]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar o idioma');window.location.reload();}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});
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
			actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.startSelfUpdate,this,info)},['Atualizar agora']));
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
	checkSelfUpdate: function(button){
		if(button){button.disabled=true;button.textContent='Verificando…';}
		const node=document.getElementById('ex-self-update-result'); if(node)node.replaceChildren(E('div',{class:'ex-update-card'},[E('small',{class:'ex-muted'},['Consultando GitHub Releases…'])]));
		return fs.exec('/usr/sbin/equipe-dashboard-control',['self-update-check'],20000).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao verificar atualização');
			let info={}; try{info=JSON.parse(r.stdout||'{}');}catch(e){throw new Error('Resposta de atualização inválida');}
			this.renderSelfUpdateResult(info);
		},this)).catch(function(e){if(node)node.replaceChildren(E('div',{class:'ex-update-card'},[E('p',{class:'alert-message warning'},[e.message])]));}).finally(function(){if(button){button.disabled=false;button.textContent='Verificar atualização';}});
	},
	pollSelfUpdate: function(attempt){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['self-update-status']).then(L.bind(function(r){
			let raw = String(r.stdout || '').trim();
			let data = { state: raw, percent: 30, message: 'Atualização em andamento…' };
			if (raw.startsWith('{')) {
				try { data = JSON.parse(raw); } catch(e){}
			}
			const node = document.getElementById('ex-self-update-result');
			if (data.state === 'done') {
				if (node) {
					node.replaceChildren(E('div', { class: 'ex-update-progress-wrap' }, [
						E('div', { class: 'ex-update-progress-bar' }, [
							E('div', { class: 'ex-update-progress-fill', style: 'width: 100%; background: #10b981;' })
						]),
						E('div', { style: 'margin-top: 10px; text-align: center;' }, [
							E('strong', { style: 'color: #10b981; font-size: 0.95rem; display: block;' }, ['✅ ' + (data.message || 'Atualização concluída com sucesso!')]),
							E('small', { id: 'ex-update-countdown', class: 'ex-muted', style: 'display: block; margin-top: 4px;' }, ['Recarregando a página em 3 segundos…'])
						])
					]));
				}
				let seconds = 3;
				const timer = window.setInterval(function(){
					seconds--;
					const el = document.getElementById('ex-update-countdown');
					if (el) el.textContent = 'Recarregando a página em ' + seconds + ' segundo' + (seconds === 1 ? '' : 's') + '…';
					if (seconds <= 0) {
						window.clearInterval(timer);
						window.location.reload();
					}
				}, 1000);
				return;
			}
			if (data.state === 'error' || attempt > 180) {
				return fs.exec('/usr/sbin/equipe-dashboard-control',['self-update-log']).then(function(log){
					const lines = String(log.stdout||'').split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean);
					const detail = lines.length ? lines.slice(-5).join(' | ') : 'A atualização não foi concluída.';
					if (node) node.replaceChildren(E('p',{class:'alert-message warning'},[detail]));
					ui.addNotification(null, E('p',{},[detail]), 'danger');
				});
			}
			if (node) {
				const pct = data.percent || Math.min(15 + attempt * 2, 90);
				const msg = data.message || 'Atualização em andamento…';
				node.replaceChildren(E('div', { class: 'ex-update-progress-wrap' }, [
					E('div', { class: 'ex-update-progress-bar' }, [
						E('div', { class: 'ex-update-progress-fill', style: 'width: ' + pct + '%;' })
					]),
					E('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-top: 8px;' }, [
						E('small', { style: 'font-weight: 650;' }, [msg]),
						E('small', { class: 'ex-muted', style: 'font-variant-numeric: tabular-nums; font-weight: 700;' }, [pct + '%'])
					])
				]));
			}
			window.setTimeout(L.bind(this.pollSelfUpdate, this, attempt + 1), 1500);
		}, this));
	},
	startSelfUpdate: function(info){
		info=info||{};
		const profileUpgrade=!!info.available&&info.profile==='full'&&info.actual_profile!=='full'&&(info.current||'')===(info.latest||'');
		ui.showModal('Atualizar ARK Router',[
			E('p',{},[profileUpgrade?'Upgrade de perfil: ':'Instalada: ',E('strong',{},[info.current||'—']),' • ',profileUpgrade?'Destino: ':'Nova: ',E('strong',{},[profileUpgrade?'Full':(info.latest||'—')])]),
			E('p',{class:'alert-message warning'},['O pacote será baixado do GitHub Releases e instalado com o gerenciador de pacotes do OpenWrt. O painel pode reiniciar por alguns segundos. Configurações de rede não serão alteradas.']),
			E('p',{class:'ex-package-name'},['Arquivo: ',E('code',{},[info.asset||'luci-app-ark-router'])]),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control',['self-update-start']).then(L.bind(function(r){
					if(r.code)throw new Error(r.stderr||'Falha ao iniciar atualização');
					ui.hideModal(); ui.addNotification(null,E('p',{},['Atualização iniciada. O painel avisará quando terminar.']));
					this.pollSelfUpdate(0);
				},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Confirmar atualização'])])
		]);
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
		if (wf.wifi_320) maxWidthStr = '320 MHz (EHT320 / Wi-Fi 7)';
		else if (wf.wifi_160) maxWidthStr = '160 MHz (Ultra Rápido)';

		let bandsStr = '2.4 GHz + 5.0 GHz (Dual-Band)';
		if (wf.wifi_6g) bandsStr = '2.4 GHz + 5 GHz + 6 GHz (Tri-Band)';

		const wifiRows = [
			infoItem('Padrões Suportados', wifiStandards.join(' • ')),
			infoItem('Largura Máxima do Canal', maxWidthStr),
			infoItem('Bandas Simultâneas', bandsStr)
		];

		const silicon = hwInfo.silicon || {};
		const siliconRows = [
			infoItem('Família de Silício', silicon.name || 'Arquitetura Universal', 'DETECTADO'),
			infoItem('Aceleração em Silício (PPE)', silicon.hw_offload_capable ? 'Suportada (PPE Hardware)' : 'Não aplicável (Software Flowtable)', silicon.hw_offload_capable ? 'ATIVO' : null),
			infoItem('Despacho Wi-Fi Direto (WED)', silicon.wed_capable ? 'Suportado (DMA Direto Wi-Fi/Ethernet)' : 'Padrão mac80211', silicon.wed_capable ? 'WED' : null),
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

		ui.showModal('Especificações Técnicas do Hardware', [
			E('p', { class: 'ex-muted' }, ['Diagnóstico abrangente e dinâmico dos componentes físicos, sensores térmicos e capacidades do seu roteador.']),
			E('div', { style: 'max-height: 72vh; overflow-y: auto; padding-right: 4px;' }, [
				sectionBlock('Identificação do Equipamento', '💻', sysRows),
				sectionBlock('Aceleração em Silício & Perfil de Ajuste', '🚀', siliconRows),
				sectionBlock('Processador e Desempenho', '⚡', cpuRows),
				sectionBlock('Sensores Térmicos ao Vivo', '🌡️', thermalRows),
				sectionBlock('Memória RAM', '💾', memRows),
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
		const themeOptions = [];
		if (currentTheme === 'ark') {
			themeOptions.push(E('option',{value:'ark'},['⚡ Tema ARK (Nativo)']));
		}
		themeOptions.push(E('option',{value:'bootstrap'},['Tema Bootstrap (Padrão)']));
		const themeSelect = E('select',{class:'cbi-input-select'}, themeOptions);
		themeSelect.value = currentTheme;
		const themeRow = E('div',{class:'ex-brand-row',style:'margin-top:12px;padding-top:12px;border-top:1px solid rgba(127,127,127,0.14);'},[
			E('label',{},['Tema do LuCI']),
			themeSelect,
			E('button',{class:'ex-mini-button','click':L.bind(function(){
				this.useTheme(themeSelect.value);
			},this)},['Aplicar tema'])
		]);

		const isSat = isSatelliteOrAp(this.currentData || (this.capabilities && this.capabilities));
		const rows=Object.keys(FEATURE_META).map(L.bind(function(key){
			const meta=FEATURE_META[key],f=this.feature(key)||{};
			const isShieldedOnSat = isSat && (key === 'sqm' || key === 'mwan3' || key === 'speedify' || key === 'upnp' || key === 'adblock' || key === 'nlbwmon');
			const isNativeHw = key === 'irqbalance' && !f.installed && (f.native_hw || (!f.installable && f.reason && f.reason.indexOf('nativamente') !== -1));
			let state=f.installed?(f.temporary?'Pronto na memória':(f.active?'Instalado e ativo':'Instalado, mas inativo')):(f.installable?'Não instalado':'Não disponível');
			let pillClass=f.installed?(isShieldedOnSat?'standby':(f.active?'online':'standby')):(f.hidden?'standby':'offline');
			if (isNativeHw) {
				state = 'Nativo por Hardware';
				pillClass = 'online';
			} else if (isShieldedOnSat) {
				state = f.installed ? _t('Inativo (Modo AP)') : _t('Desativado em Modo AP');
				pillClass = 'standby';
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
			}
			let reasonEl = '';
			if (isNativeHw) {
				reasonEl = E('small',{class:'ex-feature-reason',style:'color:#10b981;font-weight:600;display:block;margin-top:4px;'},['✨ '+(f.reason||'Processamento multicore já distribuído nativamente por hardware/driver.')]);
			} else if (isShieldedOnSat) {
				const satReason = f.reason || 'Exclusivo do Roteador Mestre (Gateway principal).';
				reasonEl = E('small',{class:'ex-feature-reason',style:'color:#3b82f6;font-weight:600;display:block;margin-top:4px;'},[(satReason.startsWith('🛡️')||satReason.startsWith('Desnecessário'))?satReason:('🛡️ '+satReason)]);
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
				E('small',{class:'ex-muted'},['Modos de operação: Pilha Dupla Global, IPv6 Seletivo por MAC (Gamer/IoT), IPv4 Apenas ou IPv6-Only. Suporte a cascata NDP Relay.'])
			]),
			E('button',{class:'ex-mini-button btn-ipv6','click':L.bind(function(){
				closeModal();
				this.showIpv6Modal();
			},this)},['Ajustes IPv6'])
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
			E('div',{class:'ex-brand-row'},[E('label',{},['Nome do painel']),brandName,E('button',{class:'ex-mini-button','click':L.bind(function(){this.setDashboardTitle(brandName.value);},this)},['Salvar nome'])]),
			E('div',{class:'ex-language-row'},[E('label',{},['Idioma do painel']),language,E('button',{class:'ex-mini-button','click':L.bind(function(){this.setDashboardLanguage(language.value);},this)},['Salvar idioma'])]),
			this.selfUpdatePanel(),
			bulkPanel,
			ipv6Panel,
			starlinkModalPanel,
			E('section',{class:'ex-appearance-panel'},[E('div',{class:'ex-appearance-heading'},[E('div',{},[E('strong',{},['Aparência']),E('small',{class:'ex-muted'},['No modo automático, o painel acompanha as cores e o modo claro ou escuro do tema LuCI.'])]),appearanceMode]),appearanceColors,E('button',{class:'ex-mini-button ex-save-appearance','click':L.bind(function(){this.setAppearance(appearanceMode.value,primary.value,secondary.value);},this)},['Salvar aparência']),themeRow]),
			E('div',{class:'ex-feature-list'},rows),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar'])])
		]);
	},
	openDnsTurboModal: function() {
		const self = this;
		ui.showModal('Carregando DNS Turbo…', [ E('p', {}, ['Consultando servidores e configurações atuais…']) ]);
		fs.exec('/usr/sbin/equipe-dashboard-control', ['dns-turbo-status']).then(function(r) {
			let status = { allservers: true, servers: '1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4' };
			const rawList = (status.servers || '1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4').split(' ').filter(function(s){
				if (!s) return false;
				if (s.indexOf('/') !== -1) return false; // Descartar rotas de dominio (/domain/ip)
				if (s.indexOf('127.') === 0 || s.indexOf('0.0.0.0') === 0 || s.indexOf('::1') === 0) return false; // Descartar loopback
				return true;
			});
			const defaultServers = ['1.1.1.1', '8.8.8.8', '1.0.0.1', '8.8.4.4'];
			const serverList = rawList.length ? rawList : defaultServers;
			const blockerName = status.dns_blocker_name || 'AdGuard Home';
			const hasDnsBlocker = !!status.dns_blocker_active;

			const allserversActive = !!status.allservers;
			const allserversToggle = E('input', {
				type: 'checkbox',
				checked: allserversActive ? '' : null,
				disabled: hasDnsBlocker,
				style: 'width: 20px; height: 20px; cursor: ' + (hasDnsBlocker ? 'not-allowed' : 'pointer') + ';'
			});
			allserversToggle.checked = allserversActive;

			const fallbackActive = !!status.dhcp_fallback;
			const fallbackToggle = E('input', {
				type: 'checkbox',
				checked: fallbackActive ? '' : null,
				style: 'width: 20px; height: 20px; cursor: pointer;'
			});
			fallbackToggle.checked = fallbackActive;

			const ipInputs = [
				E('input', { class: 'cbi-input-text', type: 'text', value: serverList[0] || '1.1.1.1', placeholder: 'ex: 1.1.1.1 ou 2606:4700:4700::1111', style: 'width: 100%; box-sizing: border-box;' }),
				E('input', { class: 'cbi-input-text', type: 'text', value: serverList[1] || '8.8.8.8', placeholder: 'ex: 8.8.8.8 ou 2001:4860:4860::8888', style: 'width: 100%; box-sizing: border-box;' }),
				E('input', { class: 'cbi-input-text', type: 'text', value: serverList[2] || '1.0.0.1', placeholder: 'ex: 1.0.0.1 ou 2606:4700:4700::1001', style: 'width: 100%; box-sizing: border-box;' }),
				E('input', { class: 'cbi-input-text', type: 'text', value: serverList[3] || '8.8.4.4', placeholder: 'ex: 8.8.4.4 ou 2001:4860:4860::8844', style: 'width: 100%; box-sizing: border-box;' })
			];

			const latBadges = [
				E('span', { class: 'ex-pill standby', style: 'font-size:0.75rem;' }, ['— ms']),
				E('span', { class: 'ex-pill standby', style: 'font-size:0.75rem;' }, ['— ms']),
				E('span', { class: 'ex-pill standby', style: 'font-size:0.75rem;' }, ['— ms']),
				E('span', { class: 'ex-pill standby', style: 'font-size:0.75rem;' }, ['— ms'])
			];

			const applyPreset = function(arr) {
				for (let i = 0; i < 4; i++) {
					ipInputs[i].value = arr[i] || '';
					latBadges[i].textContent = '— ms';
					latBadges[i].className = 'ex-pill standby';
				}
			};

			const presetBtns = [
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['1.1.1.1', '2606:4700:4700::1111', '8.8.8.8', '2001:4860:4860::8888']); }
				}, ['🚀 Dual-Stack (IPv4 + IPv6)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['2606:4700:4700::1111', '2001:4860:4860::8888', '2606:4700:4700::1001', '2001:4860:4860::8844']); }
				}, ['🌐 IPv6 Cloudflare + Google']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['2620:fe::fe', '2606:4700:4700::1112', '2620:fe::9', '2606:4700:4700::1002']); }
				}, ['🛡️ IPv6 Segurança (Quad9 + Cloudflare)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['1.1.1.1', '8.8.8.8', '1.0.0.1', '8.8.4.4']); }
				}, ['⚡ Cloudflare + Google (IPv4)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['1.1.1.2', '9.9.9.9', '1.0.0.2', '149.112.112.112']); }
				}, ['🛡️ Segurança (IPv4 Anti-Malware)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['2a10:50c0::ad1:ff', '2a10:50c0::ad2:ff', '', '']); }
				}, ['🚫 AdGuard DNS (IPv6)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['94.140.14.14', '94.140.15.15', '', '']); }
				}, ['🚫 AdGuard DNS (IPv4)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['208.67.222.222', '208.67.220.220', '', '']); }
				}, ['🌐 Cisco OpenDNS'])
			];

			const testBtn = E('button', {
				class: 'ex-mini-button ex-dns-test-btn',
				type: 'button',
				style: 'padding: 8px 14px; font-weight: 750;',
				click: function(ev) {
					const btn = ev.currentTarget;
					btn.disabled = true;
					btn.textContent = 'Testando latências…';
					const promises = ipInputs.map(function(inp, idx) {
						const ip = inp.value.trim();
						if (!ip) {
							latBadges[idx].textContent = 'Vazio';
							latBadges[idx].className = 'ex-pill offline';
							return Promise.resolve();
						}
						if (ip.indexOf('/') !== -1 || ip.indexOf('127.') === 0 || ip.indexOf('0.0.0.0') === 0 || ip.indexOf('::1') === 0) {
							latBadges[idx].textContent = 'Inválido';
							latBadges[idx].className = 'ex-pill offline';
							return Promise.resolve();
						}
						latBadges[idx].textContent = 'Medindo…';
						latBadges[idx].className = 'ex-pill standby';
						return fs.exec('/bin/ping', ['-c', '1', '-W', '2', ip]).then(function(res) {
							const m = String(res.stdout || '').match(/time=([0-9.]+)\s*ms/);
							if (m && m[1]) {
								const ms = parseFloat(m[1]).toFixed(1);
								latBadges[idx].textContent = ms + ' ms';
								latBadges[idx].className = parseFloat(ms) < 20 ? 'ex-pill online' : 'ex-pill standby';
							} else {
								latBadges[idx].textContent = 'Sem ping';
								latBadges[idx].className = 'ex-pill offline';
							}
						}).catch(function() {
							latBadges[idx].textContent = 'Falha';
							latBadges[idx].className = 'ex-pill offline';
						});
					});
					Promise.all(promises).finally(function() {
						btn.disabled = false;
						btn.textContent = '🧪 Testar Latência dos Servidores';
					});
				}
			}, ['🧪 Testar Latência dos Servidores']);

			const formGrid = E('div', { class: 'ex-grid ex-grid-2', style: 'gap: 12px; margin-top: 10px;' }, [
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('div', { style: 'display: flex; justify-content: space-between; align-items: center;' }, [ E('span', {}, ['DNS 1 (Principal):']), latBadges[0] ]),
					ipInputs[0]
				]),
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('div', { style: 'display: flex; justify-content: space-between; align-items: center;' }, [ E('span', {}, ['DNS 2 (Secundário):']), latBadges[1] ]),
					ipInputs[1]
				]),
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('div', { style: 'display: flex; justify-content: space-between; align-items: center;' }, [ E('span', {}, ['DNS 3 (Opcional):']), latBadges[2] ]),
					ipInputs[2]
				]),
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('div', { style: 'display: flex; justify-content: space-between; align-items: center;' }, [ E('span', {}, ['DNS 4 (Opcional):']), latBadges[3] ]),
					ipInputs[3]
				])
			]);

			const content = [
				hasDnsBlocker ? E('div', { class: 'alert-message warning', style: 'margin-bottom: 12px; display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: 6px;' }, [
					E('span', { style: 'font-size: 1.3rem;' }, ['🛡️']),
					E('div', {}, [
						E('strong', {}, ['Bloqueador de DNS Detectado (' + blockerName + ')']),
						E('p', { style: 'margin: 4px 0 0 0; font-size: 0.83rem; line-height: 1.4;' }, [
							'O modo All-Servers (Consulta Paralela) foi bloqueado automaticamente para a sua proteção. Se ele ficasse ligado, o roteador enviaria as consultas para servidores externos simultaneamente, vazando e anulando o bloqueio de anúncios e rastreadores.'
						])
					])
				]) : '',
				E('div', { class: 'ex-device-config-block' }, [
					E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
						E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
							E('strong', {}, ['Consulta Paralela All-Servers (0ms)']),
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Dispara para todos os servidores ao mesmo tempo. O primeiro que responder entrega a página sem esperar filas.']),
							hasDnsBlocker ? E('small', { style: 'display: block; margin-top: 4px; color: #f59e0b; font-weight: 600;' }, ['🔒 Desativado para proteger o ' + blockerName + ' (All-Servers anularia o bloqueio de anúncios).']) : ''
						]),
						E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' + (hasDnsBlocker ? ' opacity: 0.5; cursor: not-allowed;' : '') }, [
							allserversToggle,
							E('span', { class: 'ex-switch-slider' })
						])
					])
				]),
				E('div', { class: 'ex-device-config-block' }, [
					E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
						E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
							E('strong', {}, ['Redundância de Fallback no DHCP (1.1.1.1)']),
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Envia 1.1.1.1 como DNS secundário no DHCP. Se o roteador reiniciar, os aparelhos continuam navegando sem interrupção.'])
						]),
						E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
							fallbackToggle,
							E('span', { class: 'ex-switch-slider' })
						])
					])
				]),
				E('div', { class: 'ex-device-config-block' }, [
					E('strong', {}, ['Predefinições Rápidas']),
					E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Selecione uma combinação pronta ou digite seus próprios IPs:']),
					E('div', { class: 'ex-priority-button-grid', style: 'margin-top: 8px; gap: 8px;' }, presetBtns)
				]),
				E('div', { class: 'ex-device-config-block' }, [
					E('div', { style: 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;' }, [
						E('strong', {}, ['Servidores DNS Ativos (2 a 4)']),
						testBtn
					]),
					formGrid,
					E('small', { class: 'ex-muted', style: 'display: block; margin-top: 8px;' }, ['Você pode preencher de 1 a 4 servidores. Campos vazios serão desconsiderados.'])
				]),
				E('div', { class: 'right' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Cancelar']),
					' ',
					E('button', {
						class: 'btn cbi-button cbi-button-positive',
						click: function(ev) {
							const btn = ev.currentTarget;
							btn.disabled = true;
							btn.textContent = 'Salvando…';
							const cleanIp = function(v) {
								v = (v || '').trim();
								if (!v || v.indexOf('/') !== -1 || v.indexOf('127.') === 0 || v.indexOf('0.0.0.0') === 0 || v.indexOf('::1') === 0) return '';
								return v;
							};
							const s1 = cleanIp(ipInputs[0].value);
							const s2 = cleanIp(ipInputs[1].value);
							const s3 = cleanIp(ipInputs[2].value);
							const s4 = cleanIp(ipInputs[3].value);
							const alls = hasDnsBlocker ? (status.allservers ? '1' : '0') : (allserversToggle.checked ? '1' : '0');
							const fallback = fallbackToggle.checked ? '1' : '0';
							const args = ['dns-turbo-save', alls, s1, s2, s3, s4, fallback];
							return fs.exec('/usr/sbin/equipe-dashboard-control', args).then(function(r) {
								if (r.code) throw new Error(r.stderr || 'Falha ao salvar DNS');
								ui.hideModal();
								ui.addNotification(null, E('p', {}, ['Configurações de DNS Turbo salvas e aplicadas com sucesso!']));
								return self.fetchData().then(L.bind(self.update, self));
							}).catch(function(e) {
								btn.disabled = false;
								btn.textContent = 'Salvar configurações';
								ui.addNotification(null, E('p', {}, [e.message]), 'danger');
							});
						}
					}, ['Salvar configurações'])
				])
			];

			ui.showModal('⚡ Configurar DNS Turbo Paralelo', content);
		}).catch(function(e) {
			ui.showModal('Configurar DNS Turbo', [ E('p', { class: 'alert-message warning' }, [ e.message ]), E('div', { class: 'right' }, [ E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar']) ]) ]);
		});
	},
	openNetworkCapacityModal: function() {
		const self = this;
		const closeModal = function() { ui.hideModal(); };
		ui.showModal('Carregando Capacidade da Rede…', [ E('p', {}, ['Consultando limites de conexões e buffers…']) ]);
		fs.exec('/usr/sbin/equipe-dashboard-control', ['network-capacity-status']).then(function(r) {
			let status = { conntrack_max: 131072, conntrack_count: 0, dns_forward_max: 2000, cachesize: 10000, dhcp_leasetime: '2h', mem_total_mb: 1024 };
			try { status = JSON.parse(r.stdout || '{}'); } catch(e){}

			const ctInput = E('input', { class: 'cbi-input-text', type: 'number', value: status.conntrack_max || 131072, min: 16384, max: 524288, step: 4096, style: 'width: 100%; box-sizing: border-box;' });
			const fwdInput = E('input', { class: 'cbi-input-text', type: 'number', value: status.dns_forward_max || 2000, min: 150, max: 10000, step: 100, style: 'width: 100%; box-sizing: border-box;' });
			const cacheInput = E('input', { class: 'cbi-input-text', type: 'number', value: status.cachesize || 10000, min: 150, max: 50000, step: 500, style: 'width: 100%; box-sizing: border-box;' });

			const leaseSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; box-sizing: border-box;' }, [
				E('option', { value: '1h', selected: status.dhcp_leasetime === '1h' }, ['1 hora (Alta Rotatividade / Eventos / 250+ clientes)']),
				E('option', { value: '2h', selected: status.dhcp_leasetime === '2h' || (!['1h','6h','12h','24h'].includes(status.dhcp_leasetime)) }, ['2 horas (Recomendado para Escritórios / Comércio)']),
				E('option', { value: '6h', selected: status.dhcp_leasetime === '6h' }, ['6 horas (Misto)']),
				E('option', { value: '12h', selected: status.dhcp_leasetime === '12h' }, ['12 horas (Padrão Residencial - pouca rotatividade)']),
				E('option', { value: '24h', selected: status.dhcp_leasetime === '24h' }, ['24 horas (Apenas redes estáticas com poucos aparelhos)'])
			]);

			const timeoutSelect = E('select', { class: 'cbi-input-select', style: 'width: 100%; box-sizing: border-box;' }, [
				E('option', { value: '1800', selected: Number(status.conntrack_tcp_timeout) === 1800 }, ['30 minutos (Modo Eventos / Alta Rotatividade)']),
				E('option', { value: '3600', selected: Number(status.conntrack_tcp_timeout) === 3600 }, ['1 hora (Equilibrado para Escritórios / 100-250 usuários)']),
				E('option', { value: '7200', selected: Number(status.conntrack_tcp_timeout) === 7200 }, ['2 horas (Seguro para Redes Médias)']),
				E('option', { value: '432000', selected: Number(status.conntrack_tcp_timeout) > 7200 || !status.conntrack_tcp_timeout }, ['5 dias (Padrão Linux / Residencial - sem descarte precoce)'])
			]);

			const applyPreset = function(ct, fwd, cache, lease, timeout) {
				ctInput.value = ct;
				fwdInput.value = fwd;
				cacheInput.value = cache;
				leaseSelect.value = lease;
				if (timeout) timeoutSelect.value = timeout;
			};

			const presetBtns = [
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(131072, 2000, 10000, '2h', '3600'); }
				}, ['🏢 Alta Densidade (250+ disp / 512MB-1GB)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(262144, 3000, 20000, '1h', '1800'); }
				}, ['🚀 Extremo / Eventos (500+ disp / 1GB RAM)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(65536, 1000, 5000, '12h', '432000'); }
				}, ['🏠 Residencial (até 50 disp / 256MB-512MB)'])
			];

			const content = [
				E('div', { class: 'ex-device-config-block', style: 'background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.25); border-radius: 8px; padding: 12px; margin-bottom: 12px;' }, [
					E('div', { style: 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;' }, [
						E('div', {}, [
							E('strong', { style: 'color: #3b82f6; font-size: 0.95rem;' }, ['Hardware Detectado: ' + (status.mem_total_mb || 1024) + ' MB RAM']),
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, [
								'Conexões NAT ativas no momento: ',
								E('span', { style: 'font-weight: 700; color: #10b981;' }, [String(status.conntrack_count || 0)]),
								' / ' + (status.conntrack_max || 131072)
							])
						]),
						E('span', { class: 'ex-perf-badge badge-green' }, [(status.mem_total_mb >= 700 ? 'CLASSE 1 GB' : (status.mem_total_mb >= 380 ? 'CLASSE 512 MB' : 'CLASSE 256 MB'))])
					])
				]),

				E('div', { class: 'ex-device-config-block' }, [
					E('strong', {}, ['Predefinições Rápidas por Cenário']),
					E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Clique em um perfil para pré-preencher os limites recomendados:']),
					E('div', { class: 'ex-priority-button-grid', style: 'margin-top: 8px; gap: 8px;' }, presetBtns)
				]),

				E('div', { class: 'ex-device-config-block' }, [
					E('strong', {}, ['Parâmetros Personalizados (Ajuste Manual)']),
					E('div', { class: 'ex-grid ex-grid-2', style: 'gap: 12px; margin-top: 10px;' }, [
						E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
							E('span', {}, ['Tabela Conntrack NAT (Máx Conexões):']),
							ctInput,
							E('small', { class: 'ex-muted' }, ['Padrão 512M/1G: 131.072 (evita queda em torrent/p2p)'])
						]),
						E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
							E('span', {}, ['Tempo de Expiração TCP (Inatividade):']),
							timeoutSelect,
							E('small', { class: 'ex-muted' }, ['Só conta em silêncio total; downloads/uploads ativos nunca caem'])
						]),
						E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
							E('span', {}, ['Rajada de Consultas DNS (dns_forward_max):']),
							fwdInput,
							E('small', { class: 'ex-muted' }, ['Padrão 512M/1G: 2.000 consultas simultâneas no boot'])
						]),
						E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
							E('span', {}, ['Tamanho do Cache DNS (cachesize):']),
							cacheInput,
							E('small', { class: 'ex-muted' }, ['Padrão 512M/1G: 10.000 entradas (~1 MB de RAM)'])
						]),
						E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600; grid-column: 1 / -1;' }, [
							E('span', {}, ['Tempo de Concessão DHCP (leasetime):']),
							leaseSelect,
							E('small', { class: 'ex-muted' }, ['Tempo de retenção de IP antes de reciclar o pool de IPs locais'])
						])
					])
				]),

				E('div', { class: 'alert-message info', style: 'margin-top: 12px; display: flex; align-items: flex-start; gap: 10px; padding: 12px; border-radius: 6px;' }, [
					E('span', { style: 'font-size: 1.3rem;' }, ['💡']),
					E('div', {}, [
						E('strong', {}, ['Quando aumentar esses limites?']),
						E('ul', { style: 'margin: 6px 0 0 16px; padding: 0; font-size: 0.83rem; line-height: 1.5;' }, [
							E('li', {}, ['Redes com mais de 50 a 254 dispositivos ativos (comércio, clínicas, eventos, escolas).']),
							E('li', {}, ['Após quedas de energia, quando dezenas de smart TVs, assistentes e celulares ligam no mesmo segundo.']),
							E('li', {}, ['Uso intenso de P2P / Torrents ou gamers, que abrem centenas de portas de conexão ao mesmo tempo.']),
							E('li', {}, ['Dispositivos móveis com MAC randômico (Android/iOS) que trocam de endereço e esgotam o pool DHCP rapidamente.'])
						])
					])
				]),

				E('div', { class: 'right', style: 'margin-top: 16px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Cancelar']),
					' ',
					E('button', {
						class: 'btn cbi-button cbi-button-positive',
						click: function(ev) {
							const btn = ev.currentTarget;
							btn.disabled = true;
							btn.textContent = 'Aplicando…';
							const ctVal = ctInput.value.trim() || '131072';
							const fwdVal = fwdInput.value.trim() || '2000';
							const cacheVal = cacheInput.value.trim() || '10000';
							const leaseVal = leaseSelect.value || '2h';
							const timeoutVal = timeoutSelect.value || '432000';
							const args = ['network-capacity-save', ctVal, fwdVal, cacheVal, leaseVal, timeoutVal];
							return fs.exec('/usr/sbin/equipe-dashboard-control', args).then(function(r) {
								if (r.code) throw new Error(r.stderr || 'Falha ao salvar limites');
								ui.hideModal();
								ui.addNotification(null, E('p', {}, ['Limites de capacidade aplicados e persistidos com sucesso!']));
								return self.fetchData().then(L.bind(self.update, self));
							}).catch(function(e) {
								btn.disabled = false;
								btn.textContent = 'Salvar configurações';
								ui.addNotification(null, E('p', {}, [e.message]), 'danger');
							});
						}
					}, ['Salvar Limites'])
				])
			];

			ui.showModal('🌐 Dimensionamento de Rede & Conexões (512MB / 1GB)', content);
		}).catch(function(e) {
			ui.showModal('Dimensionamento de Rede', [ E('p', { class: 'alert-message warning' }, [ e.message ]), E('div', { class: 'right' }, [ E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar']) ]) ]);
		});
	},
	systemPerfCard: function(data) {
		const self = this;
		this.perfState = Object.assign({
			conntrack_recycle: false,
			ram_autopurge: false,
			speedify_encryption: true,
			speedify_installed: false,
			speedify_log_cap: false,
			nlbwmon_lite: false,
			dns_allservers: false,
			ram_trim_interval: '0',
			dns_servers: '1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4'
		}, data.perfStatus || {});

		const irqbalance = this.feature('irqbalance') || {};
		const hwInfo = data.hardwareInfo || {};
		const cpuInfo = hwInfo.cpu || {};
		const cpuCores = cpuInfo.cores || 1;
		const memTotalMb = (hwInfo.memory && hwInfo.memory.total_mb) || 128;
		const isOpkg = !!(hwInfo.target && (hwInfo.target.indexOf('ar71xx') >= 0 || hwInfo.target.indexOf('ath79') >= 0));
		const hasSpeedify = !!this.perfState.speedify_installed;

		const conntrackCount = this.perfState.conntrack_count || 0;
		const conntrackMax = this.perfState.conntrack_max || 16384;
		const conntrackPercent = conntrackMax > 0 ? Math.min(100, Math.round((conntrackCount / conntrackMax) * 100)) : 0;

		const countActive = function() {
			let c = 0;
			if (self.perfState.conntrack_recycle) c++;
			if (self.perfState.ram_autopurge) c++;
			if (self.perfState.ram_trim_interval && self.perfState.ram_trim_interval !== '0') c++;
			if (hasSpeedify && !self.perfState.speedify_encryption) c++;
			if (hasSpeedify && self.perfState.speedify_log_cap) c++;
			if (self.perfState.nlbwmon_lite) c++;
			const isNativeIrq = !irqbalance.installed && (!irqbalance.installable && (irqbalance.native_hw || (irqbalance.reason && irqbalance.reason.indexOf('nativamente') !== -1)));
			if ((cpuCores > 1 && irqbalance.installed && irqbalance.active) || isNativeIrq) c++;
			return c;
		};

		const updateBadges = function() {
			const c = countActive();
			const badgeEl = document.getElementById('ex-perf-active-badge');
			const subEl = document.getElementById('ex-perf-summary-sub');
			if (badgeEl) {
				badgeEl.textContent = c > 0 ? (c + ' ATIVAS') : 'PADRÃO';
				badgeEl.className = 'ex-pill ' + (c > 0 ? 'online' : 'standby');
			}
			if (subEl) {
				subEl.textContent = c > 0 ? (c + ' otimizaç' + (c === 1 ? 'ão ativa' : 'ões ativas') + ' • toque para configurar') : 'Controles de estabilidade e memória para eventos • toque para configurar';
			}
		};

		const purgeRamBtn = E('button', {
			class: 'ex-mini-button ex-perf-purge-btn',
			type: 'button',
			style: 'padding: 9px 16px; font-size: 0.85rem; font-weight: 750;',
			title: 'Libera caches de memória RAM e arquivos temporários órfãos em /tmp',
			click: function(ev) {
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = 'Limpando memória…';
				fs.exec('/usr/sbin/equipe-dashboard-control', ['system-memory-purge']).then(function(r) {
					ui.addNotification(null, E('p', {}, ['Memória RAM reciclada e buffers temporários limpos com sucesso!']));
				}).catch(function(e) {
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				}).finally(function() {
					btn.disabled = false;
					btn.textContent = '🧹 Liberar Memória RAM Agora';
				});
			}
		}, ['🧹 Liberar Memória RAM Agora']);

		const purgeStorageBtn = E('button', {
			class: 'ex-mini-button',
			type: 'button',
			style: 'padding: 9px 16px; font-size: 0.85rem; font-weight: 750;',
			title: 'Compacta bibliotecas pesadas em RAM, limpa caches e remove redundâncias na partição Flash',
			click: function(ev) {
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = 'Otimizando…';
				fs.exec('/usr/sbin/equipe-dashboard-control', ['system-storage-purge']).then(function(r) {
					let info = {};
					try { info = JSON.parse(r.stdout || '{}'); } catch(e){}
					const freeMb = info.overlay_free_kb ? (info.overlay_free_kb / 1024).toFixed(1) : null;
					ui.addNotification(null, E('p', {}, ['Armazenamento interno otimizado com sucesso!' + (freeMb ? ' (' + freeMb + ' MB livres na Flash)' : '')]));
				}).catch(function(e) {
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				}).finally(function() {
					btn.disabled = false;
					btn.textContent = '💾 Otimizar Espaço Flash';
				});
			}
		}, ['💾 Otimizar Espaço Flash']);

		const autoTunePerfBtn = E('button', {
			class: 'ex-mini-button',
			type: 'button',
			style: 'padding: 9px 16px; font-size: 0.85rem; font-weight: 750;',
			title: 'Ajusta automaticamente Offload, IRQ Balance, buffers TCP e Conntrack para o silício deste roteador',
			click: function(ev) {
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = 'Calibrando…';
				fs.exec('/usr/sbin/equipe-dashboard-control', ['system-hardware-auto-tune']).then(function(r) {
					let info = {};
					try { info = JSON.parse(r.stdout || '{}'); } catch(e){}
					let svcsText = '';
					if (info.services_detected && info.services_detected.length > 0) {
						svcsText = ' • Serviços: ' + info.services_detected.join(', ');
					}
					ui.addNotification(null, E('p', {}, [
						'Hardware otimizado com sucesso! Perfil: ' + (info.tuning_profile || info.silicon_name || 'Personalizado') +
						(info.offload_reason ? ' (' + info.offload_reason + ')' : '') +
						svcsText
					]));
					self.triggerImmediateRefresh('Hardware calibrado com sucesso!', 'info', false);
				}).catch(function(e) {
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				}).finally(function() {
					btn.disabled = false;
					btn.textContent = '⚡ Calibrar por Hardware';
				});
			}
		}, ['⚡ Calibrar por Hardware']);

		const savePerf = function(key, val, inputEl, pillEl) {
			self.perfState[key] = val;
			updateBadges();
			const args = [
				'system-perf-save',
				self.perfState.conntrack_recycle ? '1' : '0',
				self.perfState.ram_autopurge ? '1' : '0',
				self.perfState.speedify_encryption ? '1' : '0',
				self.perfState.speedify_log_cap ? '1' : '0',
				self.perfState.nlbwmon_lite ? '1' : '0',
				self.perfState.dns_allservers ? '1' : '0',
				'0',
				self.perfState.ram_trim_interval || '0',
				self.perfState.igmp_snooping ? '1' : '0'
			];
			console.log('[PERF_SAVE] Iniciando:', key, '=', val, 'args:', args);
			return fs.exec('/usr/sbin/equipe-dashboard-control', args).then(function(r) {
				console.log('[PERF_SAVE] Resposta r:', r);
				if (r.code) throw new Error(r.stderr || 'Falha ao salvar ajustes de desempenho');
				ui.addNotification(null, E('p', {}, ['Ajuste de desempenho aplicado!']));
			}).catch(function(e) {
				console.error('[PERF_SAVE] Erro no salvamento:', e);
				self.perfState[key] = !val;
				if (inputEl) inputEl.checked = !val;
				if (pillEl) {
					pillEl.textContent = (inputEl && inputEl.checked) ? 'LIGADA' : 'DESLIGADA';
				}
				updateBadges();
				ui.addNotification(null, E('p', {}, [e.message]), 'danger');
			});
		};

		const makePerfRow = function(icon, title, badgeText, badgeClass, desc, hwAdvice, isChecked, isEnabled, onChangeKey, isNegated, extraBtn) {
			const statePill = E('strong', {
				class: 'ex-device-switch-state',
				style: 'margin-right: 12px;'
			}, [isChecked ? 'LIGADA' : 'DESLIGADA']);

			const toggleInput = E('input', {
				type: 'checkbox',
				'aria-label': title,
				change: function(ev) {
					const desired = !!ev.currentTarget.checked;
					const finalVal = isNegated ? !desired : desired;
					statePill.textContent = desired ? 'LIGADA' : 'DESLIGADA';
					savePerf(onChangeKey, finalVal, ev.currentTarget, statePill);
				}
			});
			toggleInput.checked = !!isChecked;
			if (!isEnabled) toggleInput.disabled = true;

			const switchControl = E('div', {
				class: 'ex-device-switch-control',
				style: isEnabled ? 'cursor: pointer; user-select: none;' : 'opacity: 0.6;',
				click: function(ev) {
					console.log('[PERF_CLICK] Clicou no controle:', onChangeKey, 'isEnabled:', isEnabled, 'disabled:', toggleInput.disabled);
					ev.preventDefault();
					ev.stopPropagation();
					if (!isEnabled || toggleInput.disabled) return;
					toggleInput.checked = !toggleInput.checked;
					console.log('[PERF_CLICK] Novo valor de checked:', toggleInput.checked);
					toggleInput.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}, [
				statePill,
				E('label', { class: 'ex-switch', style: 'pointer-events: none;' }, [
					toggleInput,
					E('span', { class: 'ex-switch-slider' })
				])
			]);

			const rightWrap = E('div', { class: 'ex-perf-item-actions', style: 'display: flex; align-items: center; gap: 10px;' }, [
				extraBtn || '',
				switchControl
			]);

			return E('div', { class: 'ex-perf-item' }, [
				E('div', { class: 'ex-perf-item-content' }, [
					E('div', { class: 'ex-perf-item-head' }, [
						E('span', { class: 'ex-perf-icon' }, [icon]),
						E('strong', {}, [title]),
						badgeText ? E('span', { class: 'ex-perf-badge ' + badgeClass }, [badgeText]) : ''
					]),
					E('p', { class: 'ex-perf-desc' }, [desc]),
					hwAdvice ? E('small', { class: 'ex-perf-hw-advice' }, ['💡 ' + hwAdvice]) : ''
				]),
				rightWrap
			]);
		};

		const isNativeIrq = !irqbalance.installed && (!irqbalance.installable && (irqbalance.native_hw || (irqbalance.reason && irqbalance.reason.indexOf('nativamente') !== -1)));
		let irqControl;
		let irqBadge = 'DUAL-CORE / QUAD-CORE';
		let irqBadgeClass = 'badge-blue';
		let irqAdvice = (irqbalance.installed ? 'Recomendado para processadores Dual-Core e Quad-Core (x86, Raspberry Pi, plataformas sem DMA steering).' : 'Instale o pacote IRQ Balance na Central de Recursos para habilitar.');
		
		if (cpuCores <= 1) {
			irqBadge = 'SINGLE-CORE (1 NÚCLEO)';
			irqBadgeClass = 'badge-muted';
			irqAdvice = 'Indisponível em CPUs de 1 núcleo (' + (hwInfo.model || 'Qualcomm QCA9558') + '). O IRQ Balance requer processadores Multicore (Dual-Core ou Quad-Core) para distribuir tarefas.';
			irqControl = E('span', { class: 'ex-pill standby', style: 'padding: 6px 12px; font-weight: 700; cursor: default;' }, ['SINGLE-CORE']);
		} else if (isNativeIrq) {
			irqBadge = 'NATIVO POR HARDWARE';
			irqBadgeClass = 'badge-green';
			irqAdvice = irqbalance.reason || 'Processamento multicore de rede e Wi-Fi já distribuído nativamente por anéis de DMA e interrupções dedicados no hardware.';
			irqControl = E('span', { class: 'ex-pill online', style: 'padding: 6px 12px; font-weight: 700; cursor: default; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);' }, ['NATIVO']);
		} else {
			const irqStatePill = E('strong', {
				class: 'ex-device-switch-state',
				style: 'margin-right: 12px;'
			}, [irqbalance.active ? 'LIGADA' : 'DESLIGADA']);

			const irqInput = E('input', {
				type: 'checkbox',
				'aria-label': 'Distribuição de Interrupções Multicore (IRQ Balance)',
				change: function(ev) {
					const input = ev.currentTarget;
					const desired = !!input.checked;
					irqStatePill.textContent = desired ? 'LIGADA' : 'DESLIGADA';
					fs.exec('/usr/sbin/equipe-dashboard-control', ['irqbalance-toggle', desired ? '1' : '0']).then(function(r) {
						if (r.code) throw new Error(r.stderr || 'Falha ao alterar IRQ Balance');
						self.triggerImmediateRefresh(desired ? 'IRQ Balance ativado com sucesso!' : 'IRQ Balance desativado com sucesso!', 'info', false);
					}).catch(function(e) {
						input.checked = !desired;
						irqStatePill.textContent = !desired ? 'LIGADA' : 'DESLIGADA';
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					});
				}
			});
			irqInput.checked = !!irqbalance.active;
			if (!irqbalance.installed) irqInput.disabled = true;

			irqControl = irqbalance.installed ? E('div', {
				class: 'ex-device-switch-control',
				style: 'cursor: pointer; user-select: none;',
				click: function(ev) {
					ev.preventDefault();
					ev.stopPropagation();
					if (!irqbalance.installed || irqInput.disabled) return;
					irqInput.checked = !irqInput.checked;
					irqInput.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}, [
				irqStatePill,
				E('label', { class: 'ex-switch', style: 'pointer-events: none;' }, [
					irqInput,
					E('span', { class: 'ex-switch-slider' })
				])
			]) : E('button', { class: 'ex-mini-button', click: L.bind(this.installFeature, this, 'irqbalance') }, ['Instalar']);
		}

		const irqRow = E('div', { class: 'ex-perf-item' }, [
			E('div', { class: 'ex-perf-item-content' }, [
				E('div', { class: 'ex-perf-item-head' }, [
					E('span', { class: 'ex-perf-icon' }, ['⚖️']),
					E('strong', {}, ['Distribuição de Interrupções Multicore (IRQ Balance)']),
					E('span', { class: 'ex-perf-badge ' + irqBadgeClass }, [irqBadge])
				]),
				E('p', { class: 'ex-perf-desc' }, ['Equilibra o processamento dos pacotes Wi-Fi, Ethernet e placa de rede entre os núcleos da CPU.']),
				E('small', { class: 'ex-perf-hw-advice' }, ['💡 ' + irqAdvice])
			]),
			irqControl
		]);

		const conntrackStateText = conntrackCount > 0 ? (conntrackCount + ' conexões ativas no NAT • ' + conntrackPercent + '% da tabela') : 'Tabela de conexões NAT';

		const dnsTurboBtn = E('button', {
			class: 'ex-mini-button',
			type: 'button',
			style: 'padding: 8px 12px; font-size: 0.8rem; font-weight: 700;',
			title: 'Escolha até 4 servidores DNS e teste a latência de cada um em tempo real',
			click: function(ev) {
				ev.preventDefault();
				ev.stopPropagation();
				self.openDnsTurboModal();
			}
		}, ['⚙️ Servidores']);

		const hasDnsBlocker = !!this.perfState.dns_blocker_active;
		const blockerName = this.perfState.dns_blocker_name || 'AdGuard Home';

		const capacityBtn = E('button', {
			class: 'ex-mini-button',
			type: 'button',
			style: 'padding: 8px 12px; font-size: 0.8rem; font-weight: 700;',
			title: 'Ajuste os limites de conexões simultâneas, cache e rajada de DNS para roteadores fortes (512MB / 1GB)',
			click: function(ev) {
				ev.preventDefault();
				ev.stopPropagation();
				self.openNetworkCapacityModal();
			}
		}, ['⚙️ Limites']);

		const ramBadge = memTotalMb <= 150 ? 'CRÍTICO PARA 128 MB RAM' : (memTotalMb <= 300 ? 'RECOMENDADO PARA 256 MB' : 'RECOMENDADO PARA 512 MB');
		const ramAdvice = memTotalMb <= 150
			? 'Essencial para o D-Link DGL-5500 (128 MB) para manter margem segura de RAM livre (> 60 MB) e evitar esgotamento de memória sob carga contínua.'
			: 'Essencial para roteadores com 256MB ou 512MB de RAM (ex: Cudy WR3000) para evitar esgotamento em uso contínuo de várias horas.';

		const conntrackBadge = memTotalMb <= 150 ? '128 MB (PADRÃO 16K)' : '512MB / 1GB RAM';
		const conntrackAdvice = memTotalMb <= 150
			? 'O DGL-5500 opera perfeitamente com a tabela padrão de 16.384 conexões (apenas ' + conntrackPercent + '% em uso). Conexões ampliadas (65k/131k) são exclusivas para roteadores com 512MB ou 1GB de RAM.'
			: 'Padrão ativo em 1 hora (ideal para 100 a 250 clientes). Toque em “Limites” para dimensionar conexões NAT, rajada e pool DHCP.';

		const flashBadge = memTotalMb <= 150 ? 'ROTEADORES <= 16MB (DGL-5500)' : 'ROTEADORES <= 16MB';
		const flashDesc = 'Compacta pacotes pesados para descompressão em RAM no boot, limpa caches do ' + (isOpkg ? 'OPKG' : 'APK') + ' e remove redundâncias na partição Flash.';

		const rows = [
			makePerfRow(
				'⚡',
				hasDnsBlocker ? 'DNS Protegido por Bloqueador' : 'DNS Turbo Paralelo (All-Servers)',
				hasDnsBlocker ? 'BLOQUEADOR ATIVO' : 'RESPOSTA EM 0ms',
				hasDnsBlocker ? 'badge-blue' : 'badge-green',
				hasDnsBlocker
					? ('Resolução local gerenciada pelo ' + blockerName + '. O modo All-Servers está desativado para impedir que servidores públicos recebam requisições simultâneas e burlem suas listas de filtros.')
					: 'Dispara consultas simultaneamente para 2 a 4 servidores em paralelo (Cloudflare, Google, etc.). O primeiro que responder entrega a página sem fila nem atraso de rota.',
				hasDnsBlocker
					? 'Toque em “Servidores” para visualizar a rota de resolução e status de fallback.'
					: 'Elimina engasgos na abertura de sites e downloads. Toque em “Servidores” para testar e escolher até 4 DNS.',
				hasDnsBlocker ? false : !!this.perfState.dns_allservers,
				!hasDnsBlocker,
				'dns_allservers',
				false,
				dnsTurboBtn
			),
			E('div', { class: 'ex-perf-item', style: 'background: color-mix(in srgb, #10b981 8%, rgba(127,127,127,.055)); border-color: rgba(16,185,129,.25);' }, [
				E('div', { class: 'ex-perf-item-content' }, [
					E('div', { class: 'ex-perf-item-head' }, [
						E('span', { class: 'ex-perf-icon' }, ['🧹']),
						E('strong', {}, ['Reciclagem Rápida de Memória RAM']),
						E('span', { class: 'ex-perf-badge badge-green' }, ['AÇÃO IMEDIATA'])
					]),
					E('p', { class: 'ex-perf-desc' }, ['Descarte buffers inativos do kernel e apague arquivos temporários órfãos em /tmp para recuperar memória livre instantaneamente.'])
				]),
				purgeRamBtn
			]),
			E('div', { class: 'ex-perf-item', style: 'background: color-mix(in srgb, #3b82f6 8%, rgba(127,127,127,.055)); border-color: rgba(59,130,246,.25);' }, [
				E('div', { class: 'ex-perf-item-content' }, [
					E('div', { class: 'ex-perf-item-head' }, [
						E('span', { class: 'ex-perf-icon' }, ['💾']),
						E('strong', {}, ['Otimização de Armazenamento Flash']),
						E('span', { class: 'ex-perf-badge badge-blue' }, [flashBadge])
					]),
					E('p', { class: 'ex-perf-desc' }, [flashDesc])
				]),
				purgeStorageBtn
			]),
			E('div', { class: 'ex-perf-item', style: 'background: color-mix(in srgb, #8b5cf6 8%, rgba(127,127,127,.055)); border-color: rgba(139,92,246,.25);' }, [
				E('div', { class: 'ex-perf-item-content' }, [
					E('div', { class: 'ex-perf-item-head' }, [
						E('span', { class: 'ex-perf-icon' }, ['🚀']),
						E('strong', {}, ['Calibração Automática de Hardware']),
						E('span', { class: 'ex-perf-badge badge-purple' }, ['INTELIGENTE'])
					]),
					E('p', { class: 'ex-perf-desc' }, ['Ajusta automaticamente Offload (PPE/Flowtable), IRQ Balance, buffers TCP e limites de Conntrack sob medida para o processador e a memória deste roteador.'])
				]),
				autoTunePerfBtn
			]),
			makePerfRow(
				'🛡️',
				'Capacidade & Conexões NAT (Conntrack)',
				conntrackBadge,
				'badge-green',
				'Controla a tabela de conexões ativas do firewall e a reciclagem de conexões mortas (padrão de 1 hora ativo). ' + (memTotalMb <= 150 ? 'Tabela dimensionada para 16.384 conexões. (' : 'Expande a tabela para 131.072 conexões simultâneas. (') + conntrackStateText + ')',
				conntrackAdvice,
				!!this.perfState.conntrack_recycle,
				true,
				'conntrack_recycle',
				false,
				capacityBtn
			),
			makePerfRow(
				'⚡',
				'Perfil de Memória do Kernel (Sysctl Tuning)',
				ramBadge,
				'badge-yellow',
				'Ajusta o gerenciador de memória do kernel (vfs_cache_pressure=150, dirty_ratio=10, swappiness=30) para reciclar caches de arquivos lidos e gravar na flash em blocos menores, mantendo a maior quantidade de RAM livre para tráfego intenso.',
				ramAdvice,
				!!this.perfState.ram_autopurge,
				true,
				'ram_autopurge',
				false
			)
		];

		const trimSelect = E('select', {
			class: 'cbi-input-select',
			style: 'min-width: 140px; padding: 6px 10px; border-radius: 8px; font-weight: 600; cursor: pointer;',
			change: function(ev) {
				const val = ev.currentTarget.value;
				self.perfState.ram_trim_interval = val;
				updateBadges();
				savePerf('ram_trim_interval', val);
			}
		}, [
			E('option', { value: '0' }, ['Desativado']),
			E('option', { value: '1h' }, ['A cada 1 hora']),
			E('option', { value: '2h' }, ['A cada 2 horas']),
			E('option', { value: '6h' }, ['A cada 6 horas']),
			E('option', { value: '12h' }, ['A cada 12 horas']),
			E('option', { value: '24h' }, ['Diário (04:30 - Recomendado)'])
		]);
		trimSelect.value = this.perfState.ram_trim_interval || '0';

		const trimRow = E('div', { class: 'ex-perf-item' }, [
			E('div', { class: 'ex-perf-item-content' }, [
				E('div', { class: 'ex-perf-item-head' }, [
					E('span', { class: 'ex-perf-icon' }, ['🌙']),
					E('strong', {}, ['Auto-Trim Periódico de Cache de RAM']),
					E('span', { class: 'ex-perf-badge badge-blue' }, ['LIMPEZA PROGRAMADA'])
				]),
				E('p', { class: 'ex-perf-desc' }, ['Recicla periodicamente caches de arquivos lidos da flash retidos na memória pelo kernel (drop_caches). Seguro e transparente: zero impacto em conexões ativas, downloads e jogos.']),
				E('small', { class: 'ex-perf-hw-advice' }, ['💡 Escolha a frequência de reciclagem desejada para manter a memória RAM sempre livre.'])
			]),
			E('div', { class: 'ex-perf-item-actions', style: 'display: flex; align-items: center; gap: 10px;' }, [
				trimSelect
			])
		]);

		rows.push(trimRow);

		if (hasSpeedify) {
			rows.push(makePerfRow(
				'🚀',
				'Modo Turbo Speedify (Desligar Criptografia Interna)',
				'PARA CPUS DUAL-CORE / MÁXIMA VELOCIDADE',
				'badge-yellow',
				'Desativa a camada extra de criptografia no Speedify. Como 99% da internet já usa HTTPS/TLS e jogos usam pacotes próprios, desligar isso corta o uso de CPU e RAM pela metade e aumenta a velocidade máxima.',
				'Recomendado para roteadores com CPUs modestas (Dual-Core) que queiram agregar internet com menor aquecimento e menor consumo de RAM.',
				!this.perfState.speedify_encryption,
				true,
				'speedify_encryption',
				true
			));
			rows.push(makePerfRow(
				'🔒',
				'Trava de Logs do Speedify (Capping 2MB)',
				'BLINDAGEM DE MEMÓRIA',
				'badge-blue',
				'Limita os arquivos de log de telemetria do Speedify a 2MB com rotação automática, impedindo que horas de tráfego intenso encham a partição /tmp (RAM).',
				'Recomendado sempre que o Speedify estiver instalado.',
				!!this.perfState.speedify_log_cap,
				true,
				'speedify_log_cap',
				false
			));
		}

		rows.push(makePerfRow(
			'📊',
			'Modo Leve do Monitor de Tráfego (nlbwmon Lite)',
			'ECONOMIA EM EVENTOS',
			'badge-blue',
			'Agrupa métricas apenas por dispositivo (MAC/IP local), sem salvar o histórico detalhado de cada IP externo remoto da internet na memória.',
			'Recomendado em eventos e redes públicas para evitar crescimento do banco de dados na RAM.',
			!!this.perfState.nlbwmon_lite,
			true,
			'nlbwmon_lite',
			false
		));

		rows.push(irqRow);

		rows.push(makePerfRow(
			'📶',
			'Proteção Multicast & Wi-Fi (IGMP Snooping)',
			this.perfState.igmp_snooping ? 'LIGADO' : 'DESLIGADO',
			this.perfState.igmp_snooping ? 'badge-green' : 'badge-yellow',
			'Evita que transmissões multicast (IPTV, Chromecast, Apple AirPlay, streaming local e mDNS) sejam propagadas como broadcast para todas as antenas Wi-Fi. Direciona os dados exclusivamente para o dispositivo que solicitou a transmissão, economizando tempo de antena (airtime) e mantendo a taxa máxima do Wi-Fi 7.',
			'💡 Recomendado manter ATIVADO em todos os roteadores e Pontos de Acesso.',
			!!this.perfState.igmp_snooping,
			true,
			'igmp_snooping',
			false
		));

		const initialActive = countActive();
		const summarySubtitle = initialActive > 0 ? (initialActive + ' otimizaç' + (initialActive === 1 ? 'ão ativa' : 'ões ativas') + ' • toque para configurar') : 'Controles de estabilidade e memória para eventos • toque para configurar';

		const bodyEl = E('div', { class: 'ex-card-collapse-body' }, [
			E('div', { class: 'ex-card-collapse-inner' }, [
				E('div', { class: 'ex-perf-body' }, [
					E('div', { class: 'ex-perf-grid' }, rows)
				])
			])
		]);

		const summaryHead = E('div', { class: 'ex-perf-summary' }, [
			E('div', { class: 'ex-perf-summary-left' }, [
				E('span', { class: 'ex-perf-summary-icon' }, ['⚡']),
				E('div', {}, [
					E('div', { class: 'ex-perf-summary-title-row' }, [
						E('strong', {}, ['Desempenho & Blindagem de Memória']),
						E('span', { id: 'ex-perf-active-badge', class: 'ex-pill ' + (initialActive > 0 ? 'online' : 'standby') }, [initialActive > 0 ? (initialActive + ' ATIVAS') : 'PADRÃO'])
					]),
					E('small', { id: 'ex-perf-summary-sub', class: 'ex-muted' }, [summarySubtitle])
				])
			])
		]);

		const perfCard = E('section', {
			class: 'ex-card ex-perf-opt-card',
			style: 'margin: 16px 0;'
		}, [
			summaryHead,
			bodyEl
		]);

		const perfAccordion = setupCardAccordion({
			id: 'desempenho',
			cardEl: perfCard,
			titleEl: summaryHead,
			bodyEl: bodyEl,
			isActive: initialActive > 0
		});
		summaryHead.appendChild(perfAccordion.expandBtn);

		return perfCard;
	}
};

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
		this.board=loaded[0]||{}; this.countries=(loaded[1]&&loaded[1].results)||[]; this.capabilities=loaded[2]||{features:{}}; dashboardLanguage=this.capabilities.language||'pt-br';this.applyAppearance();this.applyBrand(this.capabilities.title);if(typeof loadDashboardLanguage==='function'){loadDashboardLanguage(dashboardLanguage).then(enableTranslation);}else{enableTranslation();} const data=loaded[3]; if(typeof initCardStatesFromUci==='function'&&data&&data.equipeDashboardConfig){initCardStatesFromUci(data.equipeDashboardConfig);} const w=wifiConfig(data.wireless), release=((this.board.release||{}).description||'').split(' ').slice(0,2).join(' '), panelTitle=this.capabilities.title||'ARK Router';
		const serverVersion = (this.capabilities && this.capabilities.update && this.capabilities.update.current) || '';
		if (serverVersion && typeof ARK_BUILD_VERSION !== 'undefined' && serverVersion !== '—' && serverVersion !== ARK_BUILD_VERSION) {
			const reloadKey = 'ark_version_reload_' + serverVersion;
			const reloadCount = parseInt((typeof sessionStorage !== 'undefined' && sessionStorage.getItem(reloadKey)) || '0', 10);
			if (reloadCount >= 1) {
				console.warn('[ARK Router] Cache persistente do navegador detectado (JS ' + ARK_BUILD_VERSION + ' vs Sistema ' + serverVersion + '). Loop evitado.');
				if (typeof ui !== 'undefined' && ui.addNotification) {
					ui.addNotification(null, E('div', { class: 'alert-message warning' }, [
						E('strong', {}, [_t('Atualização detectada (%s)!').replace('%s', 'v' + serverVersion)]),
						E('p', { style: 'margin: 4px 0 0;' }, [
							_t('Seu navegador ainda está executando arquivos em cache da versão anterior (%s). Pressione Ctrl + F5 para atualizar.').replace('%s', 'v' + ARK_BUILD_VERSION)
						])
					]), 'warning');
				}
			} else if (!window._arkReloading) {
				window._arkReloading = true;
				try {
					if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(reloadKey, '1');
				} catch(e) {}
				console.warn('[ARK Router] Versão do sistema (' + serverVersion + ') difere da versão em cache JS (' + ARK_BUILD_VERSION + '). Atualizando painel...');
				if (typeof ui !== 'undefined' && ui.addNotification) {
					ui.addNotification(null, E('p', { class: 'alert-message notice' }, [
						_t('Nova versão do ARK Router instalada! Atualizando painel...')
					]), 'info');
				}
				window.setTimeout(function() {
					var cleanPath = window.location.pathname;
					window.location.replace(cleanPath + '?_v=' + encodeURIComponent(serverVersion) + '&_ts=' + Date.now());
				}, 1000);
			}
		} else if (typeof sessionStorage !== 'undefined' && serverVersion && serverVersion === ARK_BUILD_VERSION) {
			try {
				sessionStorage.removeItem('ark_version_reload_' + serverVersion);
			} catch(e) {}
		}
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
			let bandSubtitle = '';
			const is2gOff = cfg.disabled2 === '1';
			const is5gOff = cfg.disabled5 === '1';
			const is6gOff = cfg.has6g && cfg.disabled6 === '1';

			if (is2gOff && !is5gOff && !is6gOff) {
				bandSubtitle = _t('apenas 5 GHz (2,4 GHz desativado)') + ' • ';
			} else if (is5gOff && !is2gOff && !is6gOff) {
				bandSubtitle = _t('apenas 2,4 GHz (5 GHz desativado)') + ' • ';
			} else if (cfg.has6g && !is6gOff && is2gOff && is5gOff) {
				bandSubtitle = _t('apenas 6 GHz (2,4 e 5 GHz desativados)') + ' • ';
			} else if (cfg.has6g && !is6gOff && !is2gOff && is5gOff) {
				bandSubtitle = _t('disponível em 2,4 e 6 GHz (5 GHz desativado)') + ' • ';
			} else if (cfg.has6g && !is6gOff && is2gOff && !is5gOff) {
				bandSubtitle = _t('disponível em 5 e 6 GHz (2,4 GHz desativado)') + ' • ';
			} else if (cfg.has6g && !is6gOff) {
				bandSubtitle = _t('disponível em 2,4, 5 e 6 GHz') + ' • ';
			} else if (cfg.has2g && cfg.has5g) {
				bandSubtitle = _t('disponível em 2,4 e 5 GHz') + ' • ';
			} else if (cfg.has5g) {
				bandSubtitle = _t('apenas 5 GHz') + ' • ';
			} else {
				bandSubtitle = _t('apenas 2,4 GHz') + ' • ';
			}

			const splitChips = [
				E('div', { class: 'ex-wifi-band-chip band-24' + (is2gOff ? ' is-disabled' : '') }, [
					E('span', { class: 'ex-wifi-band-badge' }, ['2.4 GHz' + (is2gOff ? ' (' + _t('Desativada') + ')' : '')]),
					E('strong', { class: 'ex-wifi-band-name' }, [is2gOff ? _t('Desativada') : (cfg.ssid2 || '—')])
				]),
				E('div', { class: 'ex-wifi-band-chip band-50' + (is5gOff ? ' is-disabled' : '') }, [
					E('span', { class: 'ex-wifi-band-badge' }, ['5 GHz' + (is5gOff ? ' (' + _t('Desativada') + ')' : '')]),
					E('strong', { class: 'ex-wifi-band-name' }, [is5gOff ? _t('Desativada') : (cfg.ssid5 || '—')])
				])
			];
			if (cfg.has6g) {
				splitChips.push(E('div', { class: 'ex-wifi-band-chip band-60' + (is6gOff ? ' is-disabled' : '') }, [
					E('span', { class: 'ex-wifi-band-badge' }, ['6 GHz' + (is6gOff ? ' (' + _t('Desativada') + ')' : '')]),
					E('strong', { class: 'ex-wifi-band-name' }, [is6gOff ? _t('Desativada') : (cfg.ssid6 || cfg.ssid || '—')])
				]));
			}

			const bandContent = cfg.split ? E('div', { class: 'ex-wifi-split-grid' }, splitChips) : E('small', { class: 'ex-muted ex-wifi-subtitle' }, [
				title + ' • ' + bandSubtitle,
				E('span', { class: 'ex-wifi-unified-pill' }, [cfg.network === 'guest' ? _t('Isolada') : _t('Rede Unificada')])
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
					title: 'Clique para escolher o servidor de teste de latência (Cloudflare, Google, Quad9, etc.)',
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
		const isApNode = isSatelliteOrAp(data);
		const lanStatusObj = (function(){ try { return JSON.parse((data.lanStatus && data.lanStatus.stdout) || '{}'); } catch(e) { return {}; } })();
		const apUplinkDev = lanStatusObj.uplink_dev || data.apUplink || 'eth0';
		const rawLanPorts = (data.lanPorts && data.lanPorts.length) ? data.lanPorts : lanPortsFromNetwork(data.networkConfig);
		const lanPorts = isApNode ? rawLanPorts.filter(function(port){ return port !== apUplinkDev && port !== 'eth0'; }) : rawLanPorts;
		const lanCards=lanPorts.map(L.bind(function(port){
			const id='ex-lan-'+portDomId(port), label=portLabel(port);
			const isPhysicalWanAsLan = (port === 'eth1' || port === 'lan5' || port === 'port5' || port === 'wan' || port === 'eth0.2');
			const actionBtn = isApNode ? null : (isPhysicalWanAsLan ? E('button', {
				class: 'ex-mini-button ex-wan-edit-button',
				click: function() {
					fs.exec('/usr/sbin/equipe-dashboard-control', ['autowan-wan-to-lan', '0']).then(function() {
						self.triggerImmediateRefresh('Porta WAN física restaurada para conexão de modem/internet padrão.', 'info');
					});
				}
			}, ['Restaurar como WAN1']) : E('button', {
				class: 'ex-mini-button ex-wan-edit-button',
				click: L.bind(function(){this.editWan(nextWan.iface,port);},this)
			}, ['Usar como '+nextWan.label]));
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
				actionBtn || ''
			]);
		},this));
		const apUplinkCard = (function(){
			if (!isApNode) return '';
			const uplinkDev = apUplinkDev;
			const gwIp = lanStatusObj.gateway || (data.networkConfig && data.networkConfig.values && data.networkConfig.values.lan && data.networkConfig.values.lan.gateway) || '192.168.73.1';
			const localIp = (data.networkConfig && data.networkConfig.values && data.networkConfig.values.lan && data.networkConfig.values.lan.ipaddr) || '192.168.73.2';
			const uplinkPortInfo = (data.hardwareInfo && data.hardwareInfo.ports && (data.hardwareInfo.ports[uplinkDev] || data.hardwareInfo.ports.eth0)) || {};
			const maxSpeed = uplinkPortInfo.max_speed || '2.5G';
			const speedBadge = E('span', { class: 'ex-port-badge ' + (maxSpeed === '2.5G' ? 'speed-2500' : 'speed-1000') }, [maxSpeed]);
			
			return E('section', { class: 'ex-card ex-wan-card ex-ap-uplink-card' }, [
				E('div', { class: 'ex-card-title' }, [
					E('div', { style: 'display:flex;align-items:center;gap:6px;' }, [
						E('h3', {}, [_t('Enlace de Entrada (Uplink)')]),
						speedBadge
					]),
					E('span', { id: 'ex-ap-uplink-status', class: 'ex-pill online' }, [_t('CONECTADO')])
				]),
				infoRow(_t('Modo de operação'), 'ex-ap-uplink-mode'),
				infoRow(_t('Roteador Mestre (Gateway)'), 'ex-ap-uplink-gw'),
				infoRow(_t('Endereço IP deste AP'), 'ex-ap-uplink-ip'),
				infoRow(_t('Porta física de entrada'), 'ex-ap-uplink-port'),
				infoRow(_t('Velocidade e link'), 'ex-ap-uplink-link'),
				infoRow(_t('Tráfego recebido hoje'), 'ex-ap-uplink-rx-day'),
				infoRow(_t('Tráfego enviado hoje'), 'ex-ap-uplink-tx-day'),
				infoRow(_t('Tempo ativo em rede'), 'ex-ap-uplink-uptime'),
				E('div', { class: 'ex-wan-card-actions', style: 'display:flex; gap:6px; margin-top:8px;' }, [
					E('button', {
						class: 'ex-mini-button ex-wan-edit-button',
						style: 'flex:1;',
						click: L.bind(function(){ self.editLan(); }, self)
					}, [_t('Editar IP & Gateway deste AP')])
				])
			]);
		})();
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
					E('strong', { style: 'display: block; font-size: 13.5px; margin-bottom: 2px;' }, [_t('Modo Ponto de Acesso (AP)')]),
					E('span', { class: 'ex-muted', style: 'font-size: 12px; line-height: 1.4;' }, [
						_t('Este nó opera como extensor em ponte transparente. O tráfego de saída, Multi-WAN e controle de Bufferbloat (SQM) são centralizados no Roteador Mestre.')
					])
				])
			]) : '',
			isApNode ? E('div', { class: 'ex-grid ex-grid-2' }, [apUplinkCard]) : E('div', { class: 'ex-grid ex-grid-2' }, wanCards),
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
					initialMwanModeLabel = _t('Modo Ponto de Acesso (Bridge)');
					initialMwanPillClass = 'standby';
					initialMwanPillText = _t('MESTRE GERENCIA');
					initialMwanToggleState = _t('INATIVO EM MODO AP');
					initialMwanToggleDesc = _t('Este roteador atua como extensor de rede (bridge transparente). O balanceamento e failover de internet operam exclusivamente no Roteador Mestre.');
					mwanInput.disabled = true;
					mwanInput.checked = false;
					mwanInput.title = _t('Multi-WAN desativado em nós em Modo Ponto de Acesso (AP).');
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
							E('strong', { style: 'display: block; margin-bottom: 3px;' }, ['🛡️ ' + _t('Multi-WAN Gerenciado no Mestre')]),
							_t('O balanceamento e failover de conexões de internet pertencem ao Roteador Mestre (Gateway). Em nós em Modo Ponto de Acesso (AP), todo o tráfego é encaminhado diretamente via enlace local.')
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
					sqmToggleInput.title = _t('SQM / CAKE é exclusivo do Roteador Mestre em Modo Ponto de Acesso (AP).');
				}
				const sqmBody = E('div', { class: 'ex-card-collapse-body' }, [
					E('div', { class: 'ex-card-collapse-inner' }, [
						isSatNode ? E('div', { class: 'alert-message warning', style: 'margin-bottom: 12px; font-size: 12px; line-height: 1.45;' }, [
							E('strong', { style: 'display: block; margin-bottom: 3px;' }, ['🛡️ ' + _t('Fila Exclusiva do Roteador Mestre')]),
							_t('O controle de Bufferbloat (SQM / CAKE) atua exclusivamente na porta de internet (WAN) do Roteador Mestre (Gateway). Em nós em Modo Ponto de Acesso (AP), todo o tráfego passa em ponte direta (L2) para não limitar nem degradar a velocidade local do Wi-Fi.')
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
						(function(){
							if (isSatNode) return '';
							const isEco = self.isEconomicHardware ? self.isEconomicHardware(data) : false;
							const hw = (data && data.hardwareInfo) || {};
							const sil = hw.silicon || {};
							if (isEco) {
								return E('div', { class: 'alert-message warning', style: 'margin: 6px 0 10px; font-size: 11.5px; line-height: 1.4;' }, [
									E('strong', {}, ['⚠️ ' + _t('Hardware Single-Core Detectado:') + ' ']),
									_t('O SQM por software nesta CPU é recomendado para conexões de até ~80–100 Mbps. Em planos superiores, prefira limitar apenas o Upload para manter o ping baixo sem afunilar a CPU.')
								]);
							} else if (sil.hw_offload_capable) {
								return E('div', { class: 'alert-message info', style: 'margin: 6px 0 10px; font-size: 11.5px; line-height: 1.4;' }, [
									E('strong', {}, ['⚡ ' + _t('Processador Multicore com Silício PPE:') + ' ']),
									_t('Capacidade total para moldagem de tráfego CAKE em alta velocidade com proteção anti-lag.')
								]);
							}
							return '';
						})(),
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
				E('p',{class:'ex-muted'},['Use para trocar entre redes 192.168.x.x, 10.0.x.x ou gerenciar a distribuição de IP, DNS e o protocolo IPv6.']),
				E('div', { class: 'ex-qos-toggle-row', style: 'margin-top: 14px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.08);' }, [
					E('div', {}, [
						E('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
							E('strong', {}, ['🛡️ ' + _t('Proteção Multicast & Wi-Fi (IGMP Snooping)')]),
							E('span', { id: 'ex-lan-igmp-pill', class: 'ex-pill standby' }, [_t('DESLIGADO')])
						]),
						E('small', { id: 'ex-lan-igmp-desc', class: 'ex-muted', style: 'display: block; margin-top: 4px; line-height: 1.45;' }, [
							_t('Monitora e filtra fluxos multicast (IPTV, TV Box, transmissões de vídeo, AirPlay e Chromecast). Ao ligar, o roteador envia o sinal apenas aos dispositivos solicitantes, impedindo que o tráfego inunde a rede local e degrade o Wi-Fi.')
						])
					]),
					E('div', { class: 'ex-device-switch-control' }, [
						E('strong', { id: 'ex-lan-igmp-state', class: 'ex-device-switch-state' }, ['—']),
						E('label', { class: 'ex-switch' }, [
							E('input', {
								id: 'ex-lan-igmp-toggle',
								type: 'checkbox',
								'aria-label': _t('Alternar IGMP Snooping'),
								change: L.bind(function(ev) {
									self.toggleIgmp(ev.currentTarget);
								}, self)
							}),
							E('span', { class: 'ex-switch-slider' })
						])
					])
				]),
				E('div', { style: 'margin-top: 10px; padding: 10px 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 6px; font-size: 12px; line-height: 1.45; color: rgba(255, 255, 255, 0.85);' }, [
					E('strong', { style: 'color: #60a5fa;' }, ['💡 ' + _t('Por que ativar o IGMP Snooping?') + ' ']),
					_t('Em redes com TV Box, IPTV ou caixas de som inteligentes, sem o IGMP Snooping a ponte L2 (br-lan) replica todo o fluxo multimídia como broadcast para todas as portas e antenas simultaneamente, causando saturação severa e travamentos no Wi-Fi.')
				])
			]),
			isApNode ? '' : this.dmzCard(),
			E('div',{class:'ex-lan-block'},[E('div',{class:'ex-lan-title'},[E('div',{},[E('span',{class:'ex-kicker'},['PORTAS CABEADAS']),E('h3',{},['LAN disponíveis'])]),E('small',{class:'ex-muted'},[isApNode ? _t('Portas locais em modo switch transparente conectadas aos seus aparelhos.') : (_t('Portas em modo LAN aparecem aqui; ao converter uma porta em ') + nextWan.label + _t(', ela sai desta lista e vira uma nova conexão de internet.'))])]),E('div',{class:'ex-grid ex-grid-2'},lanCards.length?lanCards:[E('section',{class:'ex-card ex-lan-card ex-center-card'},[E('strong',{},[_t('Nenhuma porta LAN disponível')]),E('small',{class:'ex-muted'},[_t('Todas as portas cabeadas livres estão em uso como WAN ou não foram detectadas.')])])])]),
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
		const rawTorrentPorts = (torrentRule && (torrentRule.dest_port || torrentRule.src_port)) || (mwanCfg.globals && mwanCfg.globals.torrent_ports) || '1024:8079,8081:8442,8444:65535';
		const rawTorrentIp = (torrentRule && torrentRule.src_ip) || (mwanCfg.globals && mwanCfg.globals.torrent_ip) || '0.0.0.0';
		const isWideMode = rawTorrentPorts.indexOf('1024') >= 0 && rawTorrentPorts.indexOf('65535') >= 0;
		const isClassicMode = rawTorrentPorts === '51413,6881:6999';
		let torrentSubtitle = '';
		if (isWideMode) {
			torrentSubtitle = _t('Modo Amplo Seguro (>64.500 portas com blindagem de serviços nobres) ativo nas 2 internets.');
		} else if (isClassicMode) {
			torrentSubtitle = _t('Modo Clássico (portas 51413 e 6881-6999) ativo nas 2 internets.');
		} else {
			torrentSubtitle = _t('Portas personalizadas ativas:') + ' ' + rawTorrentPorts;
		}

		if (rawTorrentIp && rawTorrentIp !== '0.0.0.0' && rawTorrentIp !== '0.0.0.0/0') {
			torrentSubtitle += ' • 🎯 ' + _t('Aparelho:') + ' ' + rawTorrentIp;
		} else {
			torrentSubtitle += ' • 🌐 ' + _t('Toda a Rede (0.0.0.0)');
		}

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

		return E('details', { class: 'ex-mwan-rules-editor' }, [
			E('summary', { class: 'ex-mwan-rules-summary' }, [
				E('div', { style: 'display: flex; align-items: center; gap: 10px;' }, [
					E('span', { class: 'ex-mwan-summary-icon' }, ['🔀']),
					E('strong', {}, [_t('Regras Avançadas de Roteamento (Portas e IPs)')])
				]),
				E('span', { class: 'ex-mwan-summary-toggle' }, [
					E('span', { class: 'ex-mwan-summary-badge' }, [_t('Configurar')]),
					E('span', { class: 'ex-mwan-summary-arrow' }, ['▾'])
				])
			]),
			E('div', { class: 'ex-mwan-rules-body' }, [
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
				E('div', { class: 'ex-channel-mode-control', style: 'margin-bottom:10px;padding:10px 12px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;' }, [
					E('div', { style: 'flex: 1 1 auto; min-width: 220px;' }, [
						E('strong', {}, ['⚡ ' + _t('Acelerar BitTorrent / P2P nas 2 Internets')]),
						E('small', { class: 'ex-muted', style: 'display:block;margin-top:2px;' }, [
							isTorrentActive ? torrentSubtitle : _t('Balanceia conexões BitTorrent/P2P pelas 2 conexões simultaneamente.')
						])
					]),
					E('div', { style: 'display:flex;align-items:center;gap:10px;flex:0 0 auto;' }, [
						E('button', {
							class: 'ex-mini-button',
							style: 'padding: 4px 10px; font-size: 11.5px; font-weight: 700;',
							title: _t('Configurar portas e aparelho de aceleração BitTorrent'),
							click: L.bind(function() {
								if (typeof self.showMwanTorrentModal === 'function') {
									self.showMwanTorrentModal(rawTorrentPorts, rawTorrentIp);
								}
							}, self)
						}, [_t('⚙️ Portas')]),
						E('label', { class: 'ex-switch', style: 'margin:0;' }, [
							E('input', {
								id: 'ex-mwan-torrent-toggle',
								type: 'checkbox',
								checked: isTorrentActive ? '' : null,
								'aria-label': _t('Ativar ou desativar aceleração P2P'),
								change: L.bind(function(ev){
									if (typeof self.toggleMwanTorrentPreset === 'function') {
										self.toggleMwanTorrentPreset(ev.currentTarget, rawTorrentPorts, rawTorrentIp);
									}
								}, self)
							}),
							E('span', { class: 'ex-switch-slider' })
						])
					])
				]),
				E('div', { id: 'ex-mwan-custom-rules-list' }, rulesElements)
			])
		]);
	},
	handleSaveApply:null, handleSave:null, handleReset:null
};


return view.extend(Object.assign(
	{},
	lifecycleMethods,
	devicesMethods,
	networkMethods,
	wifiMethods,
	vpnMethods,
	adblockMethods,
	speedifyMethods,
	starlinkMethods,
	speedtestMethods,
	systemMethods,
	renderMethods
));

