function translateText(value){
	let s=String(value==null?'':value);
	if (dashboardLanguage === 'pt-br') return s;
	const iconMatch = s.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|\uFE0F|[\u2000-\u3300]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]|[\u2600-\u27BF])\s*/);
	const iconPrefix = iconMatch ? iconMatch[0] : '';
	const coreText = iconPrefix ? s.slice(iconPrefix.length) : s;

	if (dashboardLanguage === 'en') {
		if (EN[s]) return EN[s];
		if (iconPrefix && EN[coreText]) return iconPrefix + EN[coreText];
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
		if (iconPrefix && ES[coreText]) return iconPrefix + ES[coreText];
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
	if (n.indexOf('iphone') >= 0 || n.indexOf('ipad') >= 0 || n.indexOf('galaxy') >= 0 || n.indexOf('s23') >= 0 || n.indexOf('celular') >= 0 || n.indexOf('phone') >= 0 || n.indexOf('redmi') >= 0 || n.indexOf('xiaomi') >= 0 || n.indexOf('motorola') >= 0) return '📱';
	if (n.indexOf('alexa') >= 0 || n.indexOf('echo') >= 0 || n.indexOf('sound') >= 0 || n.indexOf('som') >= 0) return '🔊';
	if (n.indexOf('camera') >= 0 || n.indexOf('porteiro') >= 0 || n.indexOf('intelbras') >= 0) return '📹';
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
}
function redirectToRouter(ip, message, delay) {
	const path = window.location.pathname || '/cgi-bin/luci/admin/equipe-dashboard';
	ui.addNotification(null, E('p', {}, [ message || ('Abrindo novo endereço: ' + ip) ]));
	window.setTimeout(function() { window.location.href = window.location.protocol + '//' + ip + path; }, delay || 1000);
}
