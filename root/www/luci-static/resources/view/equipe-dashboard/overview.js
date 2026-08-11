'use strict';
'require view';
'require rpc';
'require poll';
'require fs';
'require ui';

document.querySelector('head').appendChild(E('link', {
	'rel': 'stylesheet', 'type': 'text/css',
	'href': L.resource('view/equipe-dashboard/overview.css')
}));

const callSystemBoard = rpc.declare({ object: 'system', method: 'board' });
const callSystemInfo = rpc.declare({ object: 'system', method: 'info' });
const callInterfaceDump = rpc.declare({ object: 'network.interface', method: 'dump' });
const callDeviceStatus = rpc.declare({ object: 'network.device', method: 'status', params: [ 'name' ], expect: { '': {} } });
const callMwanStatus = rpc.declare({ object: 'mwan3', method: 'status', expect: { '': {} } });
const callDHCPLeases = rpc.declare({ object: 'luci-rpc', method: 'getDHCPLeases', expect: { '': {} } });
const callAssocList = rpc.declare({ object: 'iwinfo', method: 'assoclist', params: [ 'device' ], expect: { '': {} } });
const callSurvey = rpc.declare({ object: 'iwinfo', method: 'survey', params: [ 'device' ], expect: { '': {} } });
const callScan = rpc.declare({ object: 'iwinfo', method: 'scan', params: [ 'device' ], expect: { '': {} } });
const callFreqList = rpc.declare({ object: 'iwinfo', method: 'freqlist', params: [ 'device' ], expect: { '': {} } });
const callCountryList = rpc.declare({ object: 'iwinfo', method: 'countrylist', params: [ 'device' ], expect: { '': {} } });
const callUciGet = rpc.declare({ object: 'uci', method: 'get', params: [ 'config' ], expect: { '': {} } });

let dashboardLanguage='pt-br', translationObserver=null;
const EN={
	'Fechar aviso':'Close notification',
	'Gerenciador HTTPS':'HTTPS manager','Interface leve para administrar o uHTTPd e seus certificados.':'Lightweight interface for managing uHTTPd and its certificates.','Certificado ARK preparado para este endereço. Instale a autoridade somente nos dispositivos administrativos.':'ARC certificate prepared for this address. Install the authority only on administrator devices.','Baixar certificado confiável':'Download trusted certificate','Como instalar':'How to install','INSTALAÇÃO DO CERTIFICADO':'CERTIFICATE INSTALLATION','Instale apenas em aparelhos administrativos nos quais você confia. Nunca é necessário instalar a chave privada.':'Install only on trusted administrator devices. The private key never needs to be installed.','Windows: abra o arquivo e instale-o em Autoridades de Certificação Raiz Confiáveis.':'Windows: open the file and install it under Trusted Root Certification Authorities.','Android: em Segurança, procure Instalar certificado de CA e selecione o arquivo.':'Android: under Security, choose Install CA certificate and select the file.','iPhone/iPad: instale o perfil baixado e depois habilite confiança total nos Ajustes de Certificados.':'iPhone/iPad: install the downloaded profile, then enable full trust under Certificate Trust Settings.','Depois da instalação, feche e abra novamente o navegador e acesse novamente o endereço HTTPS do roteador.':'After installation, close and reopen the browser, then access the router HTTPS address again.','Impressão digital SHA-256':'SHA-256 fingerprint',
	'ARK Router':'ARK Router','CENTRAL DE OPERAÇÕES':'OPERATIONS CENTER','VERIFICANDO':'CHECKING','sessão de 12 horas • atualização a cada 3 segundos':'12-hour session • updates every 3 seconds',
	'SAÚDE DO ROTEADOR':'ROUTER HEALTH','Ligado há ':'Up for ','Temperatura':'Temperature','Memória':'Memory','Armazenamento':'Storage','Carga':'Load','atividade do sistema':'system activity','NORMAL':'NORMAL','ATENÇÃO':'ATTENTION',
	'Download agora':'Download now','Upload agora':'Upload now','aguardando leitura':'waiting for data','HISTÓRICO 24 HORAS':'24-HOUR HISTORY','Download ao longo do dia':'Download throughout the day','Upload ao longo do dia':'Upload throughout the day','Coletando…':'Collecting…','A primeira amostra aparecerá em até 1 minuto':'The first sample will appear within 1 minute',
	'Endereço IPv4':'IPv4 address','Link físico':'Physical link','Latência':'Latency','Tempo online':'Uptime','ONLINE':'ONLINE','OFFLINE':'OFFLINE','SEM CABO':'UNPLUGGED','conectado':'connected','sem link':'no link','CONECTADA':'CONNECTED','Full duplex':'Full duplex','Automático':'Automatic',
	'PORTAS CABEADAS':'WIRED PORTS','LAN disponíveis':'Available LAN ports','A LAN1 está configurada como WAN2':'LAN1 is configured as WAN2','Velocidade':'Speed','Modo':'Mode','Recebido':'Received','Enviado':'Sent',
	'REDE WI‑FI':'WI-FI NETWORK','ATIVA':'ACTIVE','Ver senha':'Show password','Ocultar senha':'Hide password','Acesso principal':'Main access','Visitantes com upload limitado':'Guests with limited upload','Acesso principal • disponível em 2,4 e 5 GHz':'Main access • available on 2.4 and 5 GHz','Visitantes com upload limitado • disponível em 2,4 e 5 GHz':'Guests with limited upload • available on 2.4 and 5 GHz','Alterar senha nesta tela →':'Change password here →',
	'AMBIENTE WI‑FI':'WI-FI ENVIRONMENT','Canais e interferência':'Channels and interference','Analisar canais agora':'Analyze channels now','PAÍS / DOMÍNIO REGULATÓRIO':'COUNTRY / REGULATORY DOMAIN','Alterar país':'Change country','Seleção automática de canais':'Automatic channel selection','Verificando…':'Checking…','Desligado • canais definidos manualmente':'Off • manually selected channels','Ligado • o roteador escolhe os canais':'On • the router selects channels','Configuração mista entre as bandas':'Mixed configuration between bands','AUTO':'AUTO','MANUAL':'MANUAL',
	'A análise é manual e apenas recomenda canais; não interrompe os usuários.':'Analysis is manual and only recommends channels; it does not interrupt users.','Analisar antes de aplicar':'Analyze before applying',
	'DISPOSITIVOS':'DEVICES','Quem está conectado':'Connected devices','Expandir lista e ver tráfego individual':'Expand list and view per-device traffic','Dispositivo':'Device','Rede / sinal':'Network / signal','Agora':'Now','Nenhum dispositivo conectado.':'No devices connected.','Configurar':'Configure','Equipe-X / cabo':'Equipe-X / wired','Equipe-X / Wi-Fi':'Equipe-X / Wi-Fi','Visitantes / Wi-Fi':'Guests / Wi-Fi','Cabo / LAN':'Wired / LAN','Rede principal':'Main network','Visitantes':'Guests',
	'A velocidade é estimada pelos contadores do roteador e atualizada a cada 3 segundos. Em Configurar, você pode renomear, reservar o IP e priorizar o aparelho.':'Speed is estimated from router counters and refreshed every 3 seconds. Under Configure, you can rename, reserve the IP, and prioritize the device.',
	'Configurar dispositivo':'Configure device','Carregando configurações…':'Loading settings…','Nome neste roteador':'Name on this router','Ex.: Celular da Joyce':'E.g. Joyce’s phone','Endereço IP':'IP address','Automático pelo DHCP':'Automatic via DHCP','Reservar este IP pelo MAC':'Reserve this IP by MAC','O aparelho poderá precisar reconectar para receber um IP reservado diferente.':'The device may need to reconnect to receive a different reserved IP.','Prioridade no SQM':'SQM priority','Priorizar os envios deste dispositivo':'Prioritize uploads from this device','Usa a classe de vídeo do CAKE (AF41), mantendo a divisão justa com os demais aparelhos prioritários.':'Uses CAKE’s video class (AF41), while preserving fair sharing with other prioritized devices.','A prioridade aparece somente na rede principal quando o SQM está ativo.':'Priority is shown only on the main network while SQM is active.','Salvar configurações':'Save settings','Configurações do dispositivo salvas.':'Device settings saved.',
	'CONTROLE DE FILAS':'QUEUE MANAGEMENT','ATIVO':'ACTIVE','DESLIGADO':'OFF','WAN principal':'Primary WAN','Rede visitante':'Guest network','DNS do roteador':'Router DNS','Abrir controles do QoS':'Open QoS controls',
	'MULTI‑WAN':'MULTI-WAN','Modo atual: ':'Current mode: ','Failover WAN1 → WAN2':'Failover WAN1 → WAN2','Balanceamento':'Load balancing','Somente WAN1':'WAN1 only','Somente WAN2':'WAN2 only','Ver detalhes →':'View details →','Editar modo do Multi‑WAN':'Edit Multi-WAN mode','Escolha um modo abaixo. Depois do clique, ainda será necessário confirmar antes que qualquer alteração seja aplicada.':'Choose a mode below. You will still need to confirm before any change is applied.','Balancear':'Balance','Só WAN1':'WAN1 only','Só WAN2':'WAN2 only','Balanceamento distribui conexões entre os links; não soma a velocidade de um único envio.':'Load balancing distributes connections between links; it does not combine the speed of a single transfer.',
	'estado detalhado':'detailed status','Consumo':'Usage','histórico completo':'full history','Gráficos':'Charts','interfaces em tempo real':'real-time interfaces','IPs fixos':'Static IPs','reservas DHCP':'DHCP reservations',
	'RECURSOS OPCIONAIS':'OPTIONAL FEATURES','Amplie o painel':'Extend the dashboard','Instalar':'Install','Não mostrar':'Hide suggestion','RECURSOS E COMPATIBILIDADE':'FEATURES & COMPATIBILITY','Recursos':'Features','Idioma do painel':'Dashboard language','Português (Brasil)':'Portuguese (Brazil)','Inglês':'English','Salvar idioma':'Save language','Instalado e ativo':'Installed and active','Instalado, mas inativo':'Installed but inactive','Não instalado':'Not installed','Não disponível':'Unavailable','Sugestão oculta':'Suggestion hidden','Mostrar sugestão':'Show suggestion','Ocultar sugestão':'Hide suggestion','Fechar':'Close','Pacote':'Package','RECOMENDADO':'RECOMMENDED','Tema ativo':'Active theme','Instalado, mas não selecionado':'Installed but not selected','Usar tema':'Use theme',
	'Nome do painel':'Dashboard name','Salvar nome':'Save name','Nome salvo. Recarregando o painel…':'Name saved. Reloading the dashboard…','Aparência':'Appearance','Estilo do painel':'Dashboard style','Automático (seguir o tema)':'Automatic (follow theme)','Personalizado':'Custom','Cor principal':'Primary color','Cor secundária':'Secondary color','Salvar aparência':'Save appearance','No modo automático, o painel acompanha as cores e o modo claro ou escuro do tema LuCI.':'In automatic mode, the dashboard follows the LuCI theme colors and light or dark mode.','Aparência salva. Recarregando o painel…':'Appearance saved. Reloading the dashboard…',
	'Tema Argon':'Argon theme','Tema visual recomendado para a melhor experiência com o ARK Router.':'Recommended visual theme for the best ARK Router experience.','SQM / CAKE':'SQM / CAKE','Organiza as filas e reduz a latência quando o link está ocupado.':'Manages queues and reduces latency while the link is busy.','Multi‑WAN':'Multi-WAN','Adiciona failover e balanceamento entre dois ou mais links.':'Adds failover and load balancing across two or more links.','Consumo por dispositivo':'Per-device usage','Adiciona tráfego individual e histórico detalhado de consumo.':'Adds per-device traffic and detailed usage history.','UPnP / NAT‑PMP':'UPnP / NAT-PMP','Permite que aplicativos compatíveis solicitem portas automaticamente.':'Allows compatible applications to request ports automatically.','Wi‑Fi e análise de canais':'Wi-Fi and channel analysis','Usa os recursos sem fio e regulatórios fornecidos pelo driver.':'Uses wireless and regulatory capabilities exposed by the driver.','Histórico de 24 horas':'24-hour history','Coletor leve incluído no painel.':'Lightweight collector included with the dashboard.','Sensor de temperatura':'Temperature sensor','Exibe a leitura térmica quando o hardware oferece um sensor.':'Shows thermal readings when the hardware provides a sensor.','Limites personalizados':'Custom limits','Integra as regras específicas de prioridade e visitantes.':'Integrates custom priority and guest-limit rules.',
	'Teste e calibração':'Speed test and calibration','Mede cada WAN e sugere limites seguros para o SQM.':'Measures each WAN and suggests safe SQM limits.','Pronto na memória':'Ready in memory','TESTE DE LINK':'LINK TEST','Calibração do upload':'Upload calibration','Executar teste':'Run test','Sem resultado nesta sessão.':'No result in this session.','O teste faz uma medição completa e mais duas de upload. O SQM desta WAN será pausado e restaurado automaticamente. Durante o teste, o link ficará ocupado.':'The test runs one full measurement and two upload measurements. SQM on this WAN will be paused and restored automatically. The link will be busy during the test.','Iniciar teste':'Start test','Teste em andamento…':'Test in progress…','Medições de upload':'Upload measurements','Download medido':'Measured download','Latência':'Latency','Sugestão conservadora':'Conservative suggestion','Aplicar 85%':'Apply 85%','Aplicar 90%':'Apply 90%','Aplicar 95%':'Apply 95%','Preparar medidor':'Prepare tester','O executável oficial será baixado para a memória temporária. Ele não ocupará a flash e desaparecerá ao reiniciar.':'The official executable will be downloaded to temporary memory. It will not use flash storage and will disappear after reboot.','Aplicar sugestão ao SQM':'Apply suggestion to SQM','O novo limite será salvo e o SQM será reiniciado.':'The new limit will be saved and SQM will restart.','Teste concluído.':'Test completed.','O teste não foi concluído. O SQM já foi restaurado.':'The test did not complete. SQM has already been restored.',
	'HTTPS e segurança':'HTTPS and security','Disponível':'Available','Indisponível':'Unavailable','Redirecionar HTTP para HTTPS':'Redirect HTTP to HTTPS','Desligado • HTTP e HTTPS disponíveis':'Off • HTTP and HTTPS available','Ligado • todo acesso HTTP vai para HTTPS':'On • all HTTP access redirects to HTTPS','Certificado local/autossinado: a conexão é criptografada, mas navegadores não confiam nele automaticamente.':'Local/self-signed certificate: the connection is encrypted, but browsers do not trust it automatically.','Abrir endereço HTTPS':'Open HTTPS address','Ativar redirecionamento HTTPS':'Enable HTTPS redirection','Desativar redirecionamento HTTPS':'Disable HTTPS redirection','Depois de ativar, o navegador abrirá o painel em HTTPS e poderá exibir um aviso sobre o certificado local.':'After enabling, the browser will open the dashboard over HTTPS and may display a warning about the local certificate.','O HTTP continuará disponível sem redirecionamento. O HTTPS permanecerá funcionando.':'HTTP will remain available without redirection. HTTPS will continue working.','Confirmar alteração':'Confirm change',
	'Instalar recurso':'Install feature','Cancelar':'Cancel','Confirmar instalação':'Confirm installation','Instalação iniciada. O painel avisará quando terminar.':'Installation started. The dashboard will notify you when it finishes.','Recurso instalado com sucesso. Recarregando o painel…':'Feature installed successfully. Reloading the dashboard…','A instalação não foi concluída. Consulte os registros do sistema.':'Installation did not complete. Check the system logs.','Essa ação atualizará a lista de pacotes e instalará somente o pacote indicado e suas dependências. Nenhuma configuração de rede será alterada automaticamente.':'This action will refresh the package list and install only the selected package and its dependencies. No network settings will be changed automatically.','O monitor de consumo não está instalado; a lista de dispositivos continua disponível, sem velocidade individual.':'The usage monitor is not installed; the device list remains available without per-device speed.','O tema visual do LuCI será alterado. As configurações de rede não serão modificadas.':'The LuCI visual theme will change. Network settings will not be modified.'
	,'SISTEMA':'SYSTEM','Reiniciar o roteador':'Restart router','Interrompe a internet por alguns minutos e encerra as sessões abertas.':'Internet access will stop for a few minutes and open sessions will end.','Reiniciar…':'Restart…','Primeira confirmação':'First confirmation','Deseja preparar o reinício do roteador? Nenhuma configuração será apagada.':'Prepare to restart the router? No configuration will be erased.','A internet e o painel ficarão indisponíveis por alguns minutos.':'The internet and dashboard will be unavailable for a few minutes.','Continuar':'Continue','Confirmação final':'Final confirmation','O roteador será reiniciado imediatamente. Aguarde a rede voltar antes de abrir o painel novamente.':'The router will restart immediately. Wait for the network to return before reopening the dashboard.','Aguarde 2 s':'Wait 2 s','Aguarde 1 s':'Wait 1 s','Reiniciar agora':'Restart now','Reiniciando…':'Restarting…','Roteador reiniciando. A conexão será interrompida.':'Router restarting. The connection will be interrupted.'
};
const FEATURE_META={
	uhttpd:{name:'Gerenciador HTTPS',description:'Interface leve para administrar o uHTTPd e seus certificados.'},
	argon:{name:'Tema Argon',description:'Tema visual recomendado para a melhor experiência com o ARK Router.',recommended:true},
	sqm:{name:'SQM / CAKE',description:'Organiza as filas e reduz a latência quando o link está ocupado.'},
	mwan3:{name:'Multi‑WAN',description:'Adiciona failover e balanceamento entre dois ou mais links.'},
	nlbwmon:{name:'Consumo por dispositivo',description:'Adiciona tráfego individual e histórico detalhado de consumo.'},
	upnp:{name:'UPnP / NAT‑PMP',description:'Permite que aplicativos compatíveis solicitem portas automaticamente.'},
	wifi:{name:'Wi‑Fi e análise de canais',description:'Usa os recursos sem fio e regulatórios fornecidos pelo driver.'},
	history:{name:'Histórico de 24 horas',description:'Coletor leve incluído no painel.'},
	temperature:{name:'Sensor de temperatura',description:'Exibe a leitura térmica quando o hardware oferece um sensor.'},
	custom_qos:{name:'Limites personalizados',description:'Integra as regras específicas de prioridade e visitantes.'}
	,speedtest:{name:'Teste e calibração',description:'Mede cada WAN e sugere limites seguros para o SQM.'}
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
	let s=String(value==null?'':value); if(dashboardLanguage!=='en')return s; if(EN[s])return EN[s];
	s=s.replace(/^Total recebido: /,'Total received: ').replace(/^Total enviado: /,'Total sent: ').replace(/^Pico /,'Peak ').replace(/ amostras • /,' samples • ').replace(/ amostra • /,' sample • ').replace(/ até agora$/,' to now');
	s=s.replace(/ conectado(s)?$/,' connected').replace(/ no Wi-Fi$/,' on Wi-Fi').replace(/Canal /g,'Channel ').replace(/ • automático/g,' • automatic').replace(/ • manual/g,' • manual').replace(/ • ocupação /g,' • occupancy ').replace(/^Ruído:/,'Noise:').replace(/ visitantes$/,' guests').replace(/ ATIVA$/,' ACTIVE');
	s=s.replace(/^Ligado • /,'On • ').replace(/^Desligado • /,'Off • ').replace(/ canais definidos manualmente/,' manually selected channels').replace(/ o roteador escolhe os canais/,' the router selects channels');
	return s;
}
function translateTree(root){if(dashboardLanguage!=='en'||!root)return;if(root.nodeType===Node.TEXT_NODE){if(!root.parentNode||!/^(SCRIPT|STYLE|CODE)$/.test(root.parentNode.nodeName)){const v=translateText(root.nodeValue);if(v!==root.nodeValue)root.nodeValue=v;}return;}const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){if(n.parentNode&&/^(SCRIPT|STYLE|CODE)$/.test(n.parentNode.nodeName))continue;const v=translateText(n.nodeValue);if(v!==n.nodeValue)n.nodeValue=v;}}
function enableTranslation(){translateTree(document.body);if(translationObserver)return;translationObserver=new MutationObserver(function(records){records.forEach(function(r){r.addedNodes.forEach(function(n){translateTree(n);});if(r.type==='characterData'&&r.target){const v=translateText(r.target.nodeValue);if(v!==r.target.nodeValue)r.target.nodeValue=v;}});});translationObserver.observe(document.body,{subtree:true,childList:true,characterData:true});}

function safe(promise, fallback) { return L.resolveDefault(promise, fallback); }
function formatRate(bits) {
	bits = Number(bits) || 0;
	if (bits >= 1000000) return (bits / 1000000).toFixed(bits >= 10000000 ? 1 : 2) + ' Mbps';
	if (bits >= 1000) return (bits / 1000).toFixed(1) + ' Kbps';
	return bits.toFixed(0) + ' bps';
}
function formatBytes(bytes) {
	bytes = Number(bytes) || 0;
	const units = [ 'B', 'KB', 'MB', 'GB', 'TB' ]; let unit = 0;
	while (bytes >= 1024 && unit < units.length - 1) { bytes /= 1024; unit++; }
	return bytes.toFixed(unit > 1 ? 1 : 0) + ' ' + units[unit];
}
function formatUptime(seconds) {
	seconds = Math.max(0, Number(seconds) || 0);
	const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
	return d ? '%dd %dh %dm'.format(d, h, m) : (h ? '%dh %dm'.format(h, m) : '%dm'.format(m));
}
function text(id, value) { const n = document.getElementById(id); if (n) n.textContent = value == null ? '—' : String(value); }
function setPill(id, state, label) { const n = document.getElementById(id); if (n) { n.className = 'ex-pill ' + state; n.textContent = label; } }
function iface(dump, name) { return ((dump && dump.interface) || []).find(function(x) { return x.interface === name; }) || {}; }
function values(config) { return config && config.values || {}; }
function parsePing(r) { const m = ((r && r.stdout) || '').match(/time[=<]([0-9.]+)/); return r && r.code === 0 && m ? Number(m[1]) : null; }
function infoRow(label, id) { return E('div', { 'class': 'ex-row' }, [ E('span', {}, [ label ]), E('strong', { 'id': id }, [ '—' ]) ]); }
function metricCard(icon, label, valueId, hintId, color) {
	return E('div', { 'class': 'ex-card ex-metric', 'style': '--accent:' + color }, [
		E('div', { 'class': 'ex-metric-icon' }, [ icon ]),
		E('div', { 'class': 'ex-metric-copy' }, [ E('span', { 'class': 'ex-label' }, [ label ]), E('strong', { 'id': valueId, 'class': 'ex-value' }, [ '—' ]), E('small', { 'id': hintId, 'class': 'ex-muted' }, [ 'aguardando leitura' ]) ])
	]);
}
function assocMap(groups) {
	const out = {};
	groups.forEach(function(g) { ((g && g.results) || []).forEach(function(r) { if (r.mac) out[r.mac.toUpperCase()] = r; }); });
	return out;
}
function friendlyMap(config) {
	const out = {};
	Object.keys(values(config)).forEach(function(k) { const x = values(config)[k]; if (x.mac && x.name) out[x.mac.toUpperCase()] = x.name; });
	return out;
}
function wifiConfig(config) {
	const v = values(config), main = v.default_radio0 || v.default_radio1 || {}, guest = v.guest_radio0 || v.guest_radio1 || {};
	return { main: main, guest: guest, r0: v.radio0 || {}, r1: v.radio1 || {} };
}
function trafficMap(report) {
	const out = {}, cols = {};
	if (!report || !Array.isArray(report.columns)) return out;
	report.columns.forEach(function(c, i) { cols[c] = i; });
	(report.data || []).forEach(function(r) {
		const mac = String(r[cols.mac] || '').toUpperCase();
		if (!mac || mac === '00:00:00:00:00:00') return;
		if (!out[mac]) out[mac] = { rx: 0, tx: 0 };
		out[mac].rx += Number(r[cols.rx_bytes]) || 0; out[mac].tx += Number(r[cols.tx_bytes]) || 0;
	});
	return out;
}
function surveyInfo(s) {
	const rows = (s && s.results) || [], active = rows.find(function(x) { return x.in_use; }) || rows[0] || {};
	const noise = Number(active.noise), busy = Number(active.busy_time), time = Number(active.active_time), mhz = Number(active.mhz);
	let channel = null;
	if (mhz === 2484) channel = 14;
	else if (mhz >= 2412 && mhz <= 2472) channel = Math.round((mhz - 2407) / 5);
	else if (mhz >= 5000 && mhz <= 5900) channel = Math.round((mhz - 5000) / 5);
	return { noise: noise > 127 ? noise - 256 : noise, busy: time > 0 ? busy * 100 / time : 0, channel: channel };
}

return view.extend({
	board: {}, countries: [], capabilities: {features:{}}, previous: {}, trafficPrevious: {}, trafficAt: 0, currentData: null, recommendedChannels: null, speedResults: {},
	fetchCapabilities: function(){return safe(fs.exec('/usr/sbin/equipe-dashboard-control',['features']),{}).then(function(r){try{return JSON.parse((r&&r.stdout)||'{}');}catch(e){return {language:'pt-br',package_manager:'none',features:{}};}});},
	feature: function(key){return (this.capabilities.features&&this.capabilities.features[key])||{installed:false,active:false,hidden:false,installable:false};},
	themeColor: function(names,fallback){
		const styles=[getComputedStyle(document.documentElement),getComputedStyle(document.body)];
		for(let i=0;i<styles.length;i++)for(let j=0;j<names.length;j++){const value=styles[i].getPropertyValue(names[j]).trim();if(value&&CSS.supports('color',value))return value;}
		return fallback;
	},
	applyAppearance: function(){
		const appearance=this.capabilities.appearance||{}, mode=/^(auto|equipe|custom)$/.test(appearance.mode)?appearance.mode:'auto';
		let primary='#3b82f6',secondary='#8b5cf6';
		if(mode==='custom'){primary=appearance.primary||primary;secondary=appearance.secondary||secondary;}
		else if(mode==='auto'){
			primary=this.themeColor(['--primary','--primary-color','--main-color','--brand-primary','--accent-color'],'#5e72e4');
			secondary=this.themeColor(['--secondary','--secondary-color','--accent-color','--brand-secondary'],primary);
		}
		document.documentElement.style.setProperty('--ex-primary',primary);document.documentElement.style.setProperty('--ex-secondary',secondary);
		document.documentElement.setAttribute('data-ex-appearance',mode);
	},
	applyBrand: function(title){
		title=String(title||'ARK Router');document.title=title+' · OpenWrt';
		window.setTimeout(function(){const link=document.querySelector('a[href$="/admin/equipe-dashboard"],a[href$="/admin/equipe-dashboard/"]');if(!link)return;for(let i=0;i<link.childNodes.length;i++){const node=link.childNodes[i];if(node.nodeType!==Node.TEXT_NODE||!node.nodeValue.trim())continue;const leading=(node.nodeValue.match(/^\s*/)||[''])[0],icon=(node.nodeValue.match(/[\uE000-\uF8FF]/)||[])[0]||'';node.nodeValue=leading+(icon?icon+' ':'')+title;break;}},0);
	},
	load: function() { return Promise.all([ safe(callSystemBoard(), {}), safe(callCountryList('phy0-ap0'), {results:[]}), this.fetchCapabilities(), this.fetchData() ]); },
	fetchData: function() {
		return Promise.all([
			safe(callSystemInfo(), {}), safe(callInterfaceDump(), { interface: [] }), safe(callDeviceStatus('wan'), {}), safe(callDeviceStatus('lan1'), {}),
			safe(callMwanStatus(), {}), safe(callDHCPLeases(), { dhcp_leases: [] }),
			safe(callAssocList('phy0-ap0'), { results: [] }), safe(callAssocList('phy1-ap0'), { results: [] }), safe(callAssocList('phy0-ap1'), { results: [] }), safe(callAssocList('phy1-ap1'), { results: [] }),
			safe(callSurvey('phy0-ap0'), { results: [] }), safe(callSurvey('phy1-ap0'), { results: [] }),
			safe(callUciGet('sqm'), { values: {} }), safe(callUciGet('qos_equipe'), { values: {} }), safe(callUciGet('wireless'), { values: {} }), safe(callUciGet('mwan3'), { values: {} }), safe(callUciGet('equipe_devices'), { values: {} }), safe(callUciGet('network'), { values: {} }),
			safe(fs.read('/sys/class/thermal/thermal_zone0/temp'), '0'),
			safe(fs.exec('/bin/ping', [ '-c', '1', '-W', '1', '-I', 'wan', '1.1.1.1' ]), {}), safe(fs.exec('/bin/ping', [ '-c', '1', '-W', '1', '-I', 'lan1', '1.1.1.1' ]), {}),
			safe(fs.exec_direct('/usr/libexec/nlbwmon-action', [ 'download', '-g', 'family,mac,ip', '-o', '-rx_bytes,-tx_bytes' ], 'json'), { columns: [], data: [] }),
			safe(fs.read('/tmp/equipe-traffic-history.csv'), ''),
			safe(callDeviceStatus('lan2'), {}), safe(callDeviceStatus('lan3'), {})
		]).then(function(r) { return {
			system:r[0], interfaces:r[1], wanDevice:r[2], wan2Device:r[3], mwan:r[4], leases:r[5], mainAssoc:[r[6],r[7]], guestAssoc:[r[8],r[9]],
			survey2:r[10], survey5:r[11], sqm:r[12], qos:r[13], wireless:r[14], mwanConfig:r[15], names:r[16], networkConfig:r[17], temperature:r[18], pingWan:r[19], pingWan2:r[20], traffic:r[21], history:r[22], lan2Device:r[23], lan3Device:r[24], timestamp:Date.now()
		}; });
	},
	calculateRates: function(data) {
		const a = data.wanDevice.statistics || {}, b = data.wan2Device.statistics || {}; let down = 0, up = 0;
		const rx = (Number(a.rx_bytes)||0)+(Number(b.rx_bytes)||0), tx = (Number(a.tx_bytes)||0)+(Number(b.tx_bytes)||0);
		if (this.previous.timestamp && data.timestamp > this.previous.timestamp) { const e=(data.timestamp-this.previous.timestamp)/1000; down=Math.max(0,(rx-this.previous.rx)*8/e); up=Math.max(0,(tx-this.previous.tx)*8/e); }
		this.previous={timestamp:data.timestamp,rx:rx,tx:tx}; return {down:down,up:up,rx:rx,tx:tx};
	},
	deviceRates: function(data) {
		const now = trafficMap(data.traffic), out = {}, elapsed = this.trafficAt ? (data.timestamp-this.trafficAt)/1000 : 0;
		Object.keys(now).forEach(L.bind(function(mac) { const p=this.trafficPrevious[mac]; out[mac]={rx:p&&elapsed>0?Math.max(0,(now[mac].rx-p.rx)*8/elapsed):0,tx:p&&elapsed>0?Math.max(0,(now[mac].tx-p.tx)*8/elapsed):0,totalRx:now[mac].rx,totalTx:now[mac].tx}; },this));
		this.trafficPrevious=now; this.trafficAt=data.timestamp; return out;
	},
	updateWan: function(prefix, i, d, m, ping) {
		const hasMwan=this.feature('mwan3').installed, online=!!i.up&&(!hasMwan||(m&&m.status==='online')), disabled=!d.carrier||(hasMwan&&m&&m.status==='disabled');
		setPill(prefix+'-status',online?'online':(disabled?'standby':'offline'),online?'ONLINE':(disabled?'SEM CABO':'OFFLINE'));
		const a=i['ipv4-address']&&i['ipv4-address'][0], speed=String(d.speed||'').match(/[0-9]+/); text(prefix+'-ip',a?a.address:'—'); text(prefix+'-link',d.carrier?(speed?speed[0]+' Mbps':'conectado'):'sem link'); text(prefix+'-uptime',i.up?formatUptime(i.uptime):'—'); text(prefix+'-latency',ping==null?'—':ping.toFixed(0)+' ms');
	},
	updateLan: function(prefix, device) {
		const connected=!!device.carrier, speed=String(device.speed||'').match(/[0-9]+/), stats=device.statistics||{}, full=String(device.speed||'').toUpperCase().indexOf('F')>=0;
		setPill(prefix+'-status',connected?'online':'standby',connected?'CONECTADA':'SEM CABO');
		text(prefix+'-speed',connected?(speed?speed[0]+' Mbps':'conectada'):'—');
		text(prefix+'-duplex',connected?(device.duplex?String(device.duplex):(full?'Full duplex':'Automático')):'—');
		text(prefix+'-rx',connected?formatBytes(stats.rx_bytes):'—'); text(prefix+'-tx',connected?formatBytes(stats.tx_bytes):'—');
	},
	updateWifi: function(data) {
		const w=wifiConfig(data.wireless), s2=surveyInfo(data.survey2), s5=surveyInfo(data.survey5);
		text('ex-main-ssid',w.main.ssid||'Equipe-X'); text('ex-guest-ssid',w.guest.ssid||'Equipe-X-Visitantes');
		text('ex-main-key',w.main.key||'sem senha'); text('ex-guest-key',w.guest.key||'sem senha');
		const auto2=String(w.r0.channel||'auto')==='auto', auto5=String(w.r1.channel||'auto')==='auto';
		const country=String(w.r0.country||w.r1.country||'00').toUpperCase(), countryInfo=this.countries.find(function(x){return String(x.code||x.iso3166).toUpperCase()===country;}); text('ex-country-current',(countryInfo&&countryInfo.country?countryInfo.country:'País')+' ('+country+')');
		const allAuto=auto2&&auto5, mixed=auto2!==auto5, toggle=document.getElementById('ex-channel-auto-toggle');
		if(toggle){toggle.checked=allAuto;toggle.indeterminate=mixed;toggle.setAttribute('aria-checked',mixed?'mixed':String(allAuto));}
		text('ex-channel-mode-summary',mixed?'Configuração mista entre as bandas':(allAuto?'Ligado • o roteador escolhe os canais':'Desligado • canais definidos manualmente'));
		setPill('ex-wifi-2-mode',auto2?'online':'standby',auto2?'AUTO':'MANUAL'); setPill('ex-wifi-5-mode',auto5?'online':'standby',auto5?'AUTO':'MANUAL');
		text('ex-wifi-2','Canal '+(auto2?(s2.channel||'em seleção'):(w.r0.channel||'—'))+' • '+(auto2?'automático':'manual')+' • '+(w.r0.htmode||'')+' • ocupação '+s2.busy.toFixed(0)+'%');
		text('ex-wifi-5','Canal '+(auto5?(s5.channel||'em seleção'):(w.r1.channel||'—'))+' • '+(auto5?'automático':'manual')+' • '+(w.r1.htmode||'')+' • ocupação '+s5.busy.toFixed(0)+'%');
		text('ex-wifi-noise','Ruído: 2,4 GHz '+(isFinite(s2.noise)?s2.noise+' dBm':'—')+' • 5 GHz '+(isFinite(s5.noise)?s5.noise+' dBm':'—'));
	},
	updateMwanMode: function(data) {
		const v=values(data.mwanConfig), p=(v.default_rule_v4||{}).use_policy||'wan_then_wan2';
		const mode=p==='balanced'?'balanced':(p==='wan_only'?'wan1':(p==='wan2_only'?'wan2':'failover'));
		[ 'failover','balanced','wan1','wan2' ].forEach(function(x) { const b=document.getElementById('ex-mode-'+x); if(b)b.classList.toggle('active',x===mode); });
		text('ex-mwan-mode',mode==='failover'?'Failover WAN1 → WAN2':(mode==='balanced'?'Balanceamento':(mode==='wan1'?'Somente WAN1':'Somente WAN2')));
	},
	updateHistory: function(raw) {
		const cutoff=Math.floor(Date.now()/1000)-86400;
		const rows=String(raw||'').trim().split(/\n/).map(function(line){const p=line.split(',').map(Number);return {time:p[0],down:p[1],up:p[2]};}).filter(function(x){return isFinite(x.time)&&x.time>=cutoff&&isFinite(x.down)&&isFinite(x.up);});
		const draw=function(kind,color,fillColor){
			const values=rows.map(function(x){return x[kind];}), peak=values.length?Math.max.apply(null,values):0, magnitude=peak>0?Math.pow(10,Math.floor(Math.log(peak)/Math.LN10)):1, normalized=peak/magnitude, nice=normalized<=1?1:(normalized<=2?2:(normalized<=5?5:10)), max=Math.max(1000,nice*magnitude), canvas=document.getElementById('ex-history-'+kind);
			text('ex-history-'+kind+'-peak',values.length?'Pico '+formatRate(peak):'Coletando…');
			if(!canvas||!canvas.getContext)return;
			const width=Math.max(280,Math.floor(canvas.clientWidth||600)),height=126,dpr=Math.min(window.devicePixelRatio||1,2),ctx=canvas.getContext('2d'),left=56,right=7,top=9,bottom=22,usable=height-top-bottom,plotWidth=width-left-right;
			if(canvas.width!==Math.floor(width*dpr)||canvas.height!==Math.floor(height*dpr)){canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);}
			ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);
			ctx.strokeStyle='rgba(148,163,184,.18)';ctx.lineWidth=1;ctx.fillStyle='rgba(148,163,184,.72)';ctx.font='9px sans-serif';ctx.textBaseline='middle';ctx.textAlign='right';
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
	renderDevices: function(data, rates) {
		const body=document.getElementById('ex-device-body'); if(!body)return;
		const leases=data.leases.dhcp_leases||[], main=assocMap(data.mainAssoc), guest=assocMap(data.guestAssoc), names=friendlyMap(data.names), seen={};
		const networkLabel=function(mac,ip,hasLease){
			if(guest[mac])return 'Visitantes / Wi-Fi';
			if(main[mac])return 'Equipe-X / Wi-Fi';
			if(hasLease)return 'Cabo / LAN';
			if(/^192\.168\.30\./.test(ip||''))return 'Visitantes';
			if(/^192\.168\.10\./.test(ip||''))return 'Rede principal';
			return 'Rede principal';
		};
		const devices=[];
		leases.forEach(function(l) { const mac=String(l.macaddr||'').toUpperCase(); if(!mac||seen[mac])return; seen[mac]=1; const a=main[mac]||guest[mac], isGuest=!!guest[mac]||/^192\.168\.30\./.test(l.ipaddr||''); devices.push({mac:mac,ip:l.ipaddr||'—',name:names[mac]||l.hostname||'Dispositivo sem nome',network:networkLabel(mac,l.ipaddr,true),guest:isGuest,signal:a&&a.signal,rate:rates[mac]||{rx:0,tx:0,totalRx:0,totalTx:0}}); });
		Object.keys(main).concat(Object.keys(guest)).forEach(function(mac) { if(seen[mac])return; seen[mac]=1; const a=main[mac]||guest[mac], isGuest=!!guest[mac]; devices.push({mac:mac,ip:'—',name:names[mac]||'Dispositivo sem nome',network:networkLabel(mac,'',false),guest:isGuest,signal:a.signal,rate:rates[mac]||{rx:0,tx:0,totalRx:0,totalTx:0}}); });
		devices.sort(function(a,b){return (b.rate.rx+b.rate.tx)-(a.rate.rx+a.rate.tx);}); body.replaceChildren();
		devices.forEach(L.bind(function(d) { const tr=E('tr',{},[
			E('td',{},[E('strong',{},[d.name]),E('small',{class:'ex-device-meta'},[d.ip+' • '+d.mac])]),
			E('td',{'class':'ex-hide-mobile'},[d.network+(d.signal!=null?' • '+d.signal+' dBm':'')]),
			E('td',{'class':'ex-rate-cell'},[E('span',{class:'down'},['↓ '+formatRate(d.rate.rx)]),E('span',{class:'up'},['↑ '+formatRate(d.rate.tx)])]),
			E('td',{'class':'ex-device-action'},[E('button',{'class':'ex-mini-button','click':L.bind(this.configureDevice,this,d)},['Configurar'])])
		]); body.appendChild(tr); },this));
		text('ex-device-count',devices.length+' conectado'+(devices.length===1?'':'s'));
		const empty=document.getElementById('ex-device-empty'); if(empty)empty.style.display=devices.length?'none':'';
	},
	update: function(data) {
		this.currentData=data; const r=this.calculateRates(data), dr=this.deviceRates(data), wan=iface(data.interfaces,'wan'), wan2=iface(data.interfaces,'wan2'), mi=data.mwan.interfaces||{}, sqm=values(data.sqm), qosValues=values(data.qos), qos=qosValues.main||{}, qosGuest=qosValues.guest||{};
		text('ex-download',formatRate(r.down)); text('ex-upload',formatRate(r.up)); text('ex-down-total','Total recebido: '+formatBytes(r.rx)); text('ex-up-total','Total enviado: '+formatBytes(r.tx));
		this.updateWan('ex-wan1',wan,data.wanDevice,mi.wan||{},parsePing(data.pingWan)); this.updateWan('ex-wan2',wan2,data.wan2Device,mi.wan2||{},parsePing(data.pingWan2)); this.updateLan('ex-lan2',data.lan2Device); this.updateLan('ex-lan3',data.lan3Device);
		const hasMwan=this.feature('mwan3').installed, active=hasMwan?(mi.wan&&mi.wan.status==='online'?'WAN1':(mi.wan2&&mi.wan2.status==='online'?'WAN2':'SEM INTERNET')):(wan.up?'WAN1':(wan2.up?'WAN2':'SEM INTERNET')); setPill('ex-global-status',active==='SEM INTERNET'?'offline':'online',active+' ATIVA');
		const leases=data.leases.dhcp_leases||[], main=assocMap(data.mainAssoc), guest=assocMap(data.guestAssoc); text('ex-main-clients',leases.filter(function(l){return /^192\.168\.10\./.test(l.ipaddr||'');}).length); text('ex-main-wifi',Object.keys(main).length+' no Wi-Fi'); text('ex-guest-clients',leases.filter(function(l){return /^192\.168\.30\./.test(l.ipaddr||'');}).length); text('ex-guest-wifi',Object.keys(guest).length+' no Wi-Fi');
		const mem=data.system.memory||{}, root=data.system.root||{}, mu=mem.total?100*(mem.total-(mem.available||mem.free||0))/mem.total:0, du=root.total?100*root.used/root.total:0, load=data.system.load&&data.system.load[0]!=null?data.system.load[0]/65535:0, temp=parseInt(data.temperature,10)/1000;
		text('ex-uptime',formatUptime(data.system.uptime)); text('ex-temperature',isFinite(temp)?temp.toFixed(0)+' °C':'—'); text('ex-memory',mu.toFixed(0)+'%'); text('ex-load',load.toFixed(2)); text('ex-storage',du.toFixed(0)+'%'); const mb=document.getElementById('ex-memory-bar'),db=document.getElementById('ex-storage-bar'); if(mb)mb.style.width=Math.min(100,mu)+'%'; if(db)db.style.width=Math.min(100,du)+'%';
		const healthWarning=(isFinite(temp)&&temp>=85)||mu>=85||du>=85||load>=1.5; setPill('ex-health-status',healthWarning?'standby':'online',healthWarning?'ATENÇÃO':'NORMAL');
		const qe=!!((sqm.wan1&&sqm.wan1.enabled==='1')||(sqm.wan2&&sqm.wan2.enabled==='1')), qosToggle=document.getElementById('ex-qos-toggle'), qosToggleState=document.getElementById('ex-qos-toggle-state');
		setPill('ex-qos-status',qe?'online':'standby',qe?'ATIVO':'DESLIGADO'); if(qosToggle){qosToggle.checked=qe;qosToggle.disabled=false;} if(qosToggleState)qosToggleState.textContent=qe?'Ligado':'Desligado';
		const fmtLimit=function(v){v=Number(v)||0;return v>0?(v/1000).toFixed(1)+' Mbps':'Ilimitado';};
		const guestDownloadLimit=qosGuest.download_kbps||qos.guest_download_kbps||0, guestUploadLimit=qosGuest.upload_kbps||qos.guest_upload_kbps||0;
		text('ex-qos-wan','↓ '+fmtLimit(sqm.wan1&&sqm.wan1.download)+'  •  ↑ '+fmtLimit(sqm.wan1&&sqm.wan1.upload)); text('ex-qos-guest','↓ '+fmtLimit(guestDownloadLimit)+'  •  ↑ '+fmtLimit(guestUploadLimit)); text('ex-dns',(wan['dns-server']||['1.1.1.1','8.8.8.8']).join('  •  '));
		this.updateWifi(data); this.updateMwanMode(data); this.updateHistory(data.history); this.renderDevices(data,dr); text('ex-clock',new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
	},
	togglePassword: function(id, button) { const n=document.getElementById(id), hidden=n.dataset.hidden!=='0'; n.dataset.hidden=hidden?'0':'1'; n.style.filter=hidden?'none':'blur(5px)'; button.textContent=hidden?'Ocultar senha':'Ver senha'; },
	configureDevice: function(device) {
		ui.showModal('Configurar dispositivo',[E('p',{class:'ex-muted'},['Carregando configurações…'])]);
		return fs.exec('/usr/sbin/equipe-dashboard-control',['device-status',device.mac]).then(L.bind(function(result){
			if(result.code)throw new Error(result.stderr||'Falha ao consultar o dispositivo');
			let state={};try{state=JSON.parse(result.stdout||'{}');}catch(e){throw new Error('Resposta inválida do roteador');}
			const name=E('input',{class:'cbi-input-text',value:device.name==='Dispositivo sem nome'?'':device.name,placeholder:'Ex.: Celular da Joyce',maxlength:48});
			const ip=E('input',{class:'cbi-input-text',value:state.ip||(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(device.ip)?device.ip:''),placeholder:'192.168.10.120',inputmode:'decimal'});
			const reserve=E('input',state.reserved?{type:'checkbox',checked:'checked'}:{type:'checkbox'});
			const reserveState=E('strong',{class:'ex-device-switch-state'},[state.reserved?'Reservado':'Automático']);
			const syncReserve=function(){ip.disabled=!reserve.checked;reserveState.textContent=reserve.checked?'Reservado':'Automático';}; reserve.addEventListener('change',syncReserve);syncReserve();
			const sections=[
				E('div',{class:'ex-device-config-block'},[E('label',{},['Nome neste roteador']),name,E('small',{class:'ex-muted'},[device.mac])]),
				E('div',{class:'ex-device-config-block'},[E('div',{class:'ex-device-config-heading'},[E('div',{},[E('strong',{},['Endereço IP']),E('small',{class:'ex-muted'},['Automático pelo DHCP'])]),E('div',{class:'ex-device-switch-control'},[reserveState,E('label',{class:'ex-switch'},[reserve,E('span',{class:'ex-switch-slider'})])])]),ip,E('small',{class:'ex-muted'},['Reservar este IP pelo MAC. O aparelho poderá precisar reconectar para receber um IP reservado diferente.'])])
			];
			const sqm=values((this.currentData||{}).sqm), qosActive=!!((sqm.wan1&&sqm.wan1.enabled==='1')||(sqm.wan2&&sqm.wan2.enabled==='1'));
			let priority=null;
			if(qosActive&&this.feature('custom_qos').installed&&!device.guest){
				priority=E('input',state.priority?{type:'checkbox',checked:'checked'}:{type:'checkbox'});
				const priorityState=E('strong',{class:'ex-device-switch-state'},[state.priority?'Ligada':'Desligada']);
				priority.addEventListener('change',function(){priorityState.textContent=priority.checked?'Ligada':'Desligada';});
				sections.push(E('div',{class:'ex-device-config-block'},[E('div',{class:'ex-device-config-heading'},[E('div',{},[E('strong',{},['Prioridade no SQM']),E('small',{class:'ex-muted'},['Priorizar os envios deste dispositivo'])]),E('div',{class:'ex-device-switch-control'},[priorityState,E('label',{class:'ex-switch'},[priority,E('span',{class:'ex-switch-slider'})])])]),E('small',{class:'ex-muted'},['Usa a classe de vídeo do CAKE (AF41), mantendo a divisão justa com os demais aparelhos prioritários.'])]));
			}else sections.push(E('small',{class:'ex-muted ex-device-priority-note'},['A prioridade aparece somente na rede principal quando o SQM está ativo.']));
			sections.push(E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				const args=['device-save',device.mac,name.value.trim(),reserve.checked?'reserved':'automatic',reserve.checked?ip.value.trim():'',priority?(priority.checked?'1':'0'):'keep'];
				return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar');ui.hideModal();ui.addNotification(null,E('p',{},['Configurações do dispositivo salvas.']));return this.fetchData().then(L.bind(this.update,this));},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Salvar configurações'])]));
			ui.showModal('Configurar dispositivo',sections);name.focus();
		},this)).catch(function(e){ui.hideModal();ui.addNotification(null,E('p',{},[e.message]),'danger');});
	},
	setMwanMode: function(mode,label) {
		ui.showModal('Alterar o Multi‑WAN',[E('p',{},['Aplicar “'+label+'”? A internet pode pausar por alguns segundos.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['mwan',mode]).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao aplicar');ui.hideModal();ui.addNotification(null,E('p',{},['Modo Multi‑WAN alterado para '+label+'.']));return this.fetchData().then(L.bind(this.update,this));},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});},this)},['Aplicar'])])]);
	},
	toggleSqm: function(input){
		const desired=!!input.checked;input.checked=!desired;
		ui.showModal(desired?'Ativar SQM / CAKE':'Desativar SQM / CAKE',[E('p',{class:'alert-message warning'},[desired?'O SQM será ligado nas filas configuradas e o serviço será reiniciado.':'O SQM será desligado e o serviço será reiniciado. A internet pode pausar por alguns segundos.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['sqm-toggle',desired?'1':'0']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar o SQM');ui.hideModal();ui.addNotification(null,E('p',{},[desired?'SQM ativado.':'SQM desativado.']));return this.fetchData().then(L.bind(this.update,this));},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Confirmar'])])]);
	},
	editSqmLimits: function(){
		const data=this.currentData||{}, sqm=values(data.sqm), qosValues=values(data.qos), qos=qosValues.main||{}, qosGuest=qosValues.guest||{};
		const field=function(label,value,hint){const node=E('input',{type:'number',class:'cbi-input-text',min:0,max:1000000,value:String(Number(value)||0)});return {node:node,row:E('label',{class:'ex-qos-edit-field'},[E('span',{},[label]),node,E('small',{class:'ex-muted'},[hint||'Kbps • 0 = ilimitado / sem limite'])])};};
		const wan1Enabled=E('input',{type:'checkbox'}), wan2Enabled=E('input',{type:'checkbox'});wan1Enabled.checked=!(sqm.wan1&&sqm.wan1.enabled==='0');wan2Enabled.checked=!!(sqm.wan2&&sqm.wan2.enabled==='1');
		const guestDownloadLimit=qosGuest.download_kbps||qos.guest_download_kbps||0, guestUploadLimit=qosGuest.upload_kbps||qos.guest_upload_kbps||0;
		const w1d=field('WAN1 download',sqm.wan1&&sqm.wan1.download), w1u=field('WAN1 upload',sqm.wan1&&sqm.wan1.upload), w2d=field('WAN2 download',sqm.wan2&&sqm.wan2.download), w2u=field('WAN2 upload',sqm.wan2&&sqm.wan2.upload), guestDown=field('Visitantes download total',guestDownloadLimit,'Kbps • 0 = ilimitado'), guestUp=field('Visitantes upload total',guestUploadLimit,'Kbps • 1500 = 1,5 Mbps • 0 = ilimitado');
		ui.showModal('Editar SQM / CAKE',[E('p',{class:'ex-muted'},['Defina os limites em Kbps. Use 0 quando não quiser limitar aquela direção. Em links variáveis como Starlink, upload conservador costuma manter a latência melhor.']),E('div',{class:'ex-qos-edit-grid'},[
			E('section',{},[E('h3',{},['WAN1']),E('label',{class:'ex-qos-edit-toggle'},[wan1Enabled,E('span',{},['Ativar fila WAN1'])]),w1d.row,w1u.row]),
			E('section',{},[E('h3',{},['WAN2']),E('label',{class:'ex-qos-edit-toggle'},[wan2Enabled,E('span',{},['Ativar fila WAN2'])]),w2d.row,w2u.row]),
			E('section',{},[E('h3',{},['Visitantes']),guestDown.row,guestUp.row])
		]),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){const args=['sqm-save','wan1_enabled='+(wan1Enabled.checked?'1':'0'),'wan2_enabled='+(wan2Enabled.checked?'1':'0'),'wan1_download='+w1d.node.value,'wan1_upload='+w1u.node.value,'wan2_download='+w2d.node.value,'wan2_upload='+w2u.node.value,'guest_download='+guestDown.node.value,'guest_upload='+guestUp.node.value];return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar limites');ui.hideModal();ui.addNotification(null,E('p',{},['Limites do SQM salvos.']));return this.fetchData().then(L.bind(this.update,this));},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Salvar e reiniciar SQM'])])]);
	},
	editWan: function(which){
		const net=values((this.currentData||{}).networkConfig), cfg=net[which==='wan2'?'wan2':'wan']||{}, isWan2=which==='wan2';
		const makeSelect=function(value,items){const s=E('select',{class:'cbi-input-select'},items.map(function(i){return E('option',{value:i[0]},[i[1]]);}));s.value=value;return s;};
		const role=makeSelect((isWan2&&cfg.proto==='none')?'lan':'wan',isWan2?[['wan','Usar como internet / WAN2'],['lan','Voltar porta para LAN']]:[['wan','Usar como internet / WAN1']]);
		const device=makeSelect(cfg.device||(isWan2?'lan1':'wan'),isWan2?[['lan1','LAN1'],['lan2','LAN2'],['lan3','LAN3']]:[['wan','WAN física']]);
		const proto=makeSelect(cfg.proto==='pppoe'?'pppoe':(cfg.proto==='static'?'static':'dhcp'),[['dhcp','DHCP automático'],['pppoe','PPPoE'],['static','IP fixo / estático']]);
		const username=E('input',{class:'cbi-input-text',value:cfg.username||'',placeholder:'usuário PPPoE'});
		const password=E('input',{type:'password',class:'cbi-input-text',value:'',placeholder:'senha PPPoE'});
		const ipaddr=E('input',{class:'cbi-input-text',value:cfg.ipaddr||'',placeholder:'192.0.2.10'});
		const netmask=E('input',{class:'cbi-input-text',value:cfg.netmask||'255.255.255.0',placeholder:'255.255.255.0'});
		const gateway=E('input',{class:'cbi-input-text',value:cfg.gateway||'',placeholder:'192.0.2.1'});
		const dnsList=Array.isArray(cfg.dns)?cfg.dns:String(cfg.dns||'1.1.1.1 8.8.8.8').split(/\s+/);
		const dns1=E('input',{class:'cbi-input-text',value:dnsList[0]||'1.1.1.1'}), dns2=E('input',{class:'cbi-input-text',value:dnsList[1]||'8.8.8.8'}), dns3=E('input',{class:'cbi-input-text',value:dnsList[2]||'',placeholder:'opcional'});
		const field=function(label,node,hint){return E('label',{class:'ex-wan-edit-field'},[E('span',{},[label]),node,hint?E('small',{class:'ex-muted'},[hint]):'']);};
		const pppoeBlock=E('div',{class:'ex-wan-proto-block'},[field('Usuário PPPoE',username),field('Senha PPPoE',password,'Deixe vazio para manter/definir vazia conforme operadora')]);
		const staticBlock=E('div',{class:'ex-wan-proto-block'},[field('IPv4',ipaddr),field('Máscara',netmask),field('Gateway',gateway)]);
		const sync=function(){const lanMode=isWan2&&role.value==='lan';device.disabled=lanMode;proto.disabled=lanMode;pppoeBlock.style.display=(!lanMode&&proto.value==='pppoe')?'grid':'none';staticBlock.style.display=(!lanMode&&proto.value==='static')?'grid':'none';};
		role.addEventListener('change',sync);proto.addEventListener('change',sync);sync();
		ui.showModal('Editar '+(isWan2?'WAN2':'WAN1'),[
			E('p',{class:'alert-message warning'},['Alterar internet/porta pode derrubar o painel por alguns segundos. O ARK cria um backup em /tmp antes de aplicar.']),
			E('div',{class:'ex-wan-edit-grid'},[field('Função',role),field('Porta física',device),field('Tipo de conexão',proto),pppoeBlock,staticBlock,field('DNS 1',dns1),field('DNS 2',dns2),field('DNS 3',dns3,'Opcional')]),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){const dns=[dns1.value.trim(),dns2.value.trim(),dns3.value.trim()].filter(Boolean).join(' '), args=['wan-save','iface='+(isWan2?'wan2':'wan'),'mode='+role.value,'device='+device.value,'proto='+proto.value,'username='+username.value,'password='+password.value,'ipaddr='+ipaddr.value,'netmask='+netmask.value,'gateway='+gateway.value,'dns='+dns];return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar WAN');ui.hideModal();ui.addNotification(null,E('p',{},['Configuração de internet salva. A rede pode levar alguns segundos para estabilizar.']));window.setTimeout(L.bind(function(){return this.fetchData().then(L.bind(this.update,this));},this),2500);},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Confirmar alteração'])])
		]);
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
				E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',
				E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
					const password=first.value;
					if(password.length<8||password.length>63){ui.addNotification(null,E('p',{},['A senha precisa ter entre 8 e 63 caracteres.']));return;}
					if(password!==second.value){ui.addNotification(null,E('p',{},['As duas senhas digitadas não são iguais.']));return;}
					return fs.exec('/usr/sbin/equipe-dashboard-control',['wifi',kind,password]).then(function(r){
						if(r.code)throw new Error(r.stderr||'Falha ao alterar a senha');
						ui.hideModal(); ui.addNotification(null,E('p',{},['Senha salva. O Wi‑Fi reiniciará em alguns segundos.']));
					}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});
				},this)},['Salvar nova senha'])
			])
		]);
		first.focus();
	},
	analyzeChannels: function(button) {
		const apply=document.getElementById('ex-apply-channels'); button.disabled=true; if(apply)apply.disabled=true; button.textContent='Analisando…'; text('ex-scan-result','O Wi‑Fi permanece ativo durante a análise.');
		return Promise.all([safe(callScan('phy0-ap0'),{results:[]}),safe(callScan('phy1-ap0'),{results:[]}),safe(callFreqList('phy0-ap0'),{results:[]}),safe(callFreqList('phy1-ap0'),{results:[]})]).then(L.bind(function(r){
			const a=r[0].results||[], b=r[1].results||[], score2={1:0,6:0,11:0}; a.forEach(function(n){[1,6,11].forEach(function(c){const d=Math.abs((Number(n.channel)||0)-c);if(d<5)score2[c]+=(5-d)*Math.pow(10,((Number(n.signal)||-100)+100)/20);});});
			const allowed2=(r[2].results||[]).filter(function(x){return !x.restricted&&[1,6,11].indexOf(Number(x.channel))>=0;}).map(function(x){return String(x.channel);}); Object.keys(score2).forEach(function(c){if(allowed2.length&&allowed2.indexOf(c)<0)delete score2[c];});
			let candidates=(r[3].results||[]).filter(function(x){return !x.restricted&&[36,40,44,48,149,153,157,161].indexOf(Number(x.channel))>=0;}).map(function(x){return Number(x.channel);}); if(!candidates.length)candidates=[36,40,44,48];
			const score5={}; candidates.forEach(function(c){score5[c]=0;}); b.forEach(function(n){candidates.forEach(function(c){if(Math.abs((Number(n.channel)||0)-c)<=12)score5[c]+=Math.pow(10,((Number(n.signal)||-100)+100)/20);});});
			const best2=Object.keys(score2).sort(function(x,y){return score2[x]-score2[y];})[0]||'1', best5=candidates.sort(function(x,y){return score5[x]-score5[y];})[0]; this.recommendedChannels={two:String(best2),five:String(best5)};
			text('ex-scan-result','Encontradas '+a.length+' redes em 2,4 GHz e '+b.length+' em 5 GHz. Sugestão: canal '+best2+' no 2,4 GHz e '+best5+' no 5 GHz. Nenhuma alteração foi feita.');
			if(apply){apply.disabled=false;apply.textContent='Aplicar sugestão: '+best2+' / '+best5;}
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
		const description=fixed?('Fixar canal '+suggested.two+' no 2,4 GHz e '+suggested.five+' no 5 GHz?'):'Voltar as duas bandas para seleção automática de canais?';
		ui.showModal(fixed?'Aplicar canais sugeridos':'Voltar ao modo automático',[
			E('p',{},[description]),
			E('p',{class:'alert-message warning'},['A alteração reiniciará as duas bandas do Wi‑Fi e desconectará temporariamente todos os aparelhos das redes Equipe-X e Visitantes.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){const args=['channels',mode];if(fixed)args.push(suggested.two,suggested.five);return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao aplicar os canais');ui.hideModal();ui.addNotification(null,E('p',{},[fixed?'Canais sugeridos salvos. A seleção automática foi desligada e o Wi‑Fi reiniciará em alguns segundos.':'Seleção automática ligada. O Wi‑Fi reiniciará em alguns segundos.']));return this.fetchData().then(L.bind(this.update,this));},this)).catch(L.bind(function(e){this.updateWifi(this.currentData);ui.addNotification(null,E('p',{},[e.message]));},this));},this)},[fixed?'Confirmar e aplicar':'Confirmar modo automático'])])
		]);
	},
	changeCountry: function() {
		const current=String((wifiConfig(this.currentData.wireless).r0.country)||'00').toUpperCase();
		const select=E('select',{class:'cbi-input-select',style:'width:100%'});
		this.countries.slice().sort(function(a,b){return String(a.country).localeCompare(String(b.country));}).forEach(function(item){const code=String(item.code||item.iso3166).toUpperCase();select.appendChild(E('option',{value:code},[(item.country||code)+' ('+code+')']));}); select.value=current;
		ui.showModal('País e domínio regulatório',[
			E('p',{},['Escolha o país onde o roteador está sendo utilizado. Isso controla legalmente canais e potências disponíveis.']),select,
			E('p',{class:'alert-message warning'},['Ao alterar o país, as duas bandas voltarão ao modo automático e o Wi‑Fi será reiniciado. Selecione somente o país onde o equipamento está fisicamente instalado.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){const code=select.value,name=select.options[select.selectedIndex].text;return fs.exec('/usr/sbin/equipe-dashboard-control',['country',code]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar o país');ui.hideModal();ui.addNotification(null,E('p',{},['País alterado para '+name+'. O Wi‑Fi reiniciará em alguns segundos.']));}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});},this)},['Confirmar país'])])
		]);
	},
	setDashboardLanguage: function(language){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['language',language]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar o idioma');window.location.reload();}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});
	},
	setDashboardTitle: function(title){
		title=String(title||'').trim();return fs.exec('/usr/sbin/equipe-dashboard-control',['title',title]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar o nome');ui.addNotification(null,E('p',{},['Nome salvo. Recarregando o painel…']));window.setTimeout(function(){window.location.reload();},500);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});
	},
	setAppearance: function(mode,primary,secondary){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['appearance',mode,primary,secondary]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar a aparência');ui.addNotification(null,E('p',{},['Aparência salva. Recarregando o painel…']));window.setTimeout(function(){window.location.reload();},500);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});
	},
	changeHttpsRedirect: function(input){
		const desired=!!input.checked;input.checked=!desired;
		ui.showModal(desired?'Ativar redirecionamento HTTPS':'Desativar redirecionamento HTTPS',[E('p',{},[desired?'Depois de ativar, o navegador abrirá o painel em HTTPS e poderá exibir um aviso sobre o certificado local.':'O HTTP continuará disponível sem redirecionamento. O HTTPS permanecerá funcionando.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['https-redirect',desired?'1':'0']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar o HTTPS');input.checked=desired;input.setAttribute('aria-checked',desired?'true':'false');this.capabilities.https=this.capabilities.https||{};this.capabilities.https.redirect=desired;const panel=input.closest('.ex-https-panel'),summary=panel&&panel.querySelector('.ex-https-summary'),state=panel&&panel.querySelector('.ex-https-switch-state');if(panel)panel.classList.toggle('is-enabled',desired);if(summary)summary.textContent=desired?'Ligado • todo acesso HTTP vai para HTTPS':'Desligado • HTTP e HTTPS disponíveis';if(state){state.textContent=desired?'ATIVO':'DESLIGADO';state.className='ex-https-switch-state '+(desired?'online':'standby');}ui.hideModal();ui.addNotification(null,E('p',{},[desired?'Redirecionamento HTTPS ativado.':'Redirecionamento HTTPS desativado.']));if(desired&&window.location.protocol!=='https:')window.setTimeout(function(){window.location.href='https://'+window.location.hostname+window.location.pathname;},1600);},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});},this)},['Confirmar alteração'])])]);
	},
	showCertificateHelp: function(){
		const https=this.capabilities.https||{}, fingerprint=String(https.ca_fingerprint||'').replace(/(.{4})/g,'$1 ').trim();
		ui.showModal('INSTALAÇÃO DO CERTIFICADO',[E('p',{class:'alert-message warning'},['Instale apenas em aparelhos administrativos nos quais você confia. Nunca é necessário instalar a chave privada.']),E('ol',{class:'ex-cert-steps'},[E('li',{},['Windows: abra o arquivo e instale-o em Autoridades de Certificação Raiz Confiáveis.']),E('li',{},['Android: em Segurança, procure Instalar certificado de CA e selecione o arquivo.']),E('li',{},['iPhone/iPad: instale o perfil baixado e depois habilite confiança total nos Ajustes de Certificados.']),E('li',{},['Depois da instalação, feche e abra novamente o navegador e acesse novamente o endereço HTTPS do roteador.'])]),fingerprint?E('p',{class:'ex-cert-fingerprint'},[E('span',{},['Impressão digital SHA-256']),E('code',{},[fingerprint])]):'',E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Fechar'])])]);
	},
	setFeatureHidden: function(key,hidden){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-hide',key,hidden?'1':'0']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar a preferência');return this.fetchCapabilities().then(function(c){this.capabilities=c;window.location.reload();}.bind(this));},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});
	},
	loadFeatureInstallLog: function(key){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install-log',key]).then(function(r){return String(r.stdout||'').trim();}).catch(function(){return '';});
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
	installFeature: function(key){
		const meta=FEATURE_META[key], feature=this.feature(key);
		ui.showModal(key==='speedtest'?'Preparar medidor':'Instalar recurso',[
			E('p',{},[(meta&&meta.name)||key,' — ',(meta&&meta.description)||'']),
			E('p',{class:'ex-package-name'},['Pacote: ',E('code',{},[feature.package||'—'])]),
			E('p',{class:'alert-message warning'},[key==='speedtest'?'O executável oficial será baixado para a memória temporária. Ele não ocupará a flash e desaparecerá ao reiniciar.':'Essa ação atualizará a lista de pacotes e instalará somente o pacote indicado e suas dependências. Nenhuma configuração de rede será alterada automaticamente.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install',key]).then(L.bind(function(r){
					const state=String(r.stdout||'').trim();
					if(r.code)throw new Error(r.stderr||'Falha ao iniciar a instalação');
					ui.hideModal();
					if(state==='installed'){
						ui.addNotification(null,E('p',{},[key==='speedtest'?'Medidor já estava pronto na memória.':'Esse recurso já estava disponível.']));
						window.setTimeout(function(){window.location.reload();},900);
						return;
					}
					if(state==='running'){
						ui.addNotification(null,E('p',{},['A instalação já está em andamento.']));
					} else {
						ui.addNotification(null,E('p',{},[key==='speedtest'?'Preparação iniciada. O painel avisará quando terminar.':'Instalação iniciada. O painel avisará quando terminar.']));
					}
					this.pollFeatureInstall(key,0);
				},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});
			},this)},['Confirmar instalação'])])
		]);
	},
	useTheme: function(key){
		if(key!=='argon')return;
		ui.showModal('Usar tema',[E('p',{},['Tema Argon']),E('p',{class:'alert-message warning'},['O tema visual do LuCI será alterado. As configurações de rede não serão modificadas.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['theme',key]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao selecionar o tema');ui.hideModal();window.location.reload();}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});},this)},['Usar tema'])])]);
	},
	startSpeedtest: function(wan,label){
		ui.showModal('Iniciar teste',[E('p',{},[label]),E('p',{class:'alert-message warning'},['O teste faz uma medição completa e mais duas de upload. O SQM desta WAN será pausado e restaurado automaticamente. Durante o teste, o link ficará ocupado.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['speedtest-start',wan]).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao iniciar o teste');ui.hideModal();const n=document.getElementById('ex-speedtest-'+wan+'-result');if(n)n.replaceChildren(E('span',{class:'ex-muted'},['Teste em andamento…']));this.pollSpeedtest(wan,0);},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});},this)},['Iniciar teste'])])]);
	},
	pollSpeedtest: function(wan,attempt){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedtest-status',wan]).then(L.bind(function(r){const state=String(r.stdout||'').trim();if(state==='done')return this.loadSpeedtestResult(wan).then(function(){ui.addNotification(null,E('p',{},['Teste concluído.']));});if(state==='error'||attempt>300){ui.addNotification(null,E('p',{},['O teste não foi concluído. O SQM já foi restaurado.']));return;}window.setTimeout(L.bind(this.pollSpeedtest,this,wan,attempt+1),2000);},this));
	},
	loadSpeedtestResult: function(wan){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedtest-result',wan]).then(L.bind(function(r){try{const data=JSON.parse(r.stdout||'{}');if(data&&data.suggested_kbps){this.speedResults[wan]=data;this.renderSpeedtestResult(wan,data);}}catch(e){}},this));
	},
	renderSpeedtestResult: function(wan,data){
		const node=document.getElementById('ex-speedtest-'+wan+'-result');if(!node)return;const runs=(data.upload_runs_mbps||[]).map(function(v){return Number(v).toFixed(2)+' Mbps';}).join(' • '), suggestions=data.suggested_kbps||{};
		node.replaceChildren(E('div',{class:'ex-speedtest-metrics'},[E('div',{},[E('span',{},['Medições de upload']),E('strong',{},[runs||'—'])]),E('div',{},[E('span',{},['Download medido']),E('strong',{},[Number(data.download_mbps||0).toFixed(2)+' Mbps'])]),E('div',{},[E('span',{},['Latência']),E('strong',{},[Number(data.latency_ms||0).toFixed(1)+' ms'])])]),E('div',{class:'ex-speedtest-suggestion'},[E('span',{},['Sugestão conservadora']),E('strong',{},[formatRate(Number(suggestions.conservative||0)*1000)]),E('div',{},[['conservative','Aplicar 85%'],['balanced','Aplicar 90%'],['aggressive','Aplicar 95%']].map(L.bind(function(item){return E('button',{class:'ex-mini-button','click':L.bind(this.applySpeedtestSuggestion,this,wan,suggestions[item[0]])},[item[1]]);},this))) ]));translateTree(node);
	},
	applySpeedtestSuggestion: function(wan,kbps){
		kbps=Math.round(Number(kbps)||0);if(!kbps)return;ui.showModal('Aplicar sugestão ao SQM',[E('p',{},[(wan==='wan'?'WAN1':'WAN2')+': '+formatRate(kbps*1000)]),E('p',{class:'alert-message warning'},['O novo limite será salvo e o SQM será reiniciado.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['speedtest-apply',wan,String(kbps)]).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao aplicar');ui.hideModal();return this.fetchData().then(L.bind(this.update,this));},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]));});},this)},['Aplicar'])])]);
	},
	requestReboot: function(){
		ui.showModal('Primeira confirmação',[E('p',{},['Deseja preparar o reinício do roteador? Nenhuma configuração será apagada.']),E('p',{class:'alert-message warning'},['A internet e o painel ficarão indisponíveis por alguns minutos.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
			return fs.exec('/usr/sbin/equipe-dashboard-control',['reboot-prepare']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao preparar o reinício');const token=String(r.stdout||'').trim();if(!/^[0-9a-f]{8,64}$/.test(token))throw new Error('Confirmação inválida recebida do roteador');this.showRebootConfirmation(token);},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
		},this)},['Continuar'])])]);
	},
	showRebootConfirmation: function(token){
		const finalButton=E('button',{class:'btn cbi-button cbi-button-negative',disabled:true},['Aguarde 2 s']);
		const started=Date.now(), timer=window.setInterval(function(){const left=Math.ceil((2000-(Date.now()-started))/1000);if(left>0){finalButton.textContent='Aguarde '+left+' s';return;}window.clearInterval(timer);finalButton.disabled=false;finalButton.textContent='Reiniciar agora';},100);
		finalButton.addEventListener('click',L.bind(function(){finalButton.disabled=true;finalButton.textContent='Reiniciando…';return fs.exec('/usr/sbin/equipe-dashboard-control',['reboot-confirm',token]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao reiniciar');ui.hideModal();ui.addNotification(null,E('p',{},['Roteador reiniciando. A conexão será interrompida.']));}).catch(function(e){finalButton.disabled=false;finalButton.textContent='Reiniciar agora';ui.addNotification(null,E('p',{},[e.message]),'danger');});},this));
		ui.showModal('Confirmação final',[E('p',{class:'alert-message warning'},['O roteador será reiniciado imediatamente. Aguarde a rede voltar antes de abrir o painel novamente.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':function(){window.clearInterval(timer);ui.hideModal();}},['Cancelar']),' ',finalButton])]);
	},
	loadEzSetup: function(){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-status']).then(function(r){try{return JSON.parse(r.stdout||'{}');}catch(e){return {};}}).catch(function(){return {};});
	},
	ezField: function(label, control, hint){
		return E('label',{class:'ex-ez-field'},[E('span',{},[label]),control,hint?E('small',{class:'ex-muted'},[hint]):'']);
	},
	showEzSetup: function(){
		return this.loadEzSetup().then(L.bind(function(saved){
			const input=function(type,value,attrs){attrs=attrs||{};attrs.type=type;attrs.value=value||'';attrs.class=attrs.class||'cbi-input-text';return E('input',attrs);};
			const select=function(value,items){const node=E('select',{class:'cbi-input-select'},items.map(function(item){return E('option',{value:item[0]},[item[1]]);}));node.value=value;return node;};
			const checkbox=function(value){const node=E('input',{type:'checkbox'});node.checked=!!value;return node;};
			const language=select(this.capabilities.language||dashboardLanguage||'pt-br',[['pt-br','Português (Brasil)'],['en','English']]);
			const savedProfile=({event:'internet_failover',starlink:'internet_single',dualwan:'internet_failover',home:'internet_single'})[saved.profile]||saved.profile||'internet_failover';
			const profile=select(savedProfile,[['internet_single','Uma internet — usar apenas WAN1'],['internet_failover','Duas internet — WAN1 principal e WAN2 reserva'],['internet_balance','Duas internet — balancear conexões'],['custom','Personalizado — eu ajusto manualmente']]);
			const profileHelp=E('p',{class:'ex-ez-profile-help ex-muted'},['WAN2 usa a porta LAN1 como segunda internet por DHCP. Failover troca para WAN2 quando WAN1 cair; balanceamento distribui conexões, mas não soma a velocidade de um único envio.']);
			const routerName=input('text',saved.router_name||'ARK Router',{maxlength:40});
			const country=select(saved.country||'BR',[]);
			const preferredCountries=[['BR','Brasil'],['US','Estados Unidos'],['PT','Portugal'],['AR','Argentina'],['CL','Chile'],['UY','Uruguai'],['PY','Paraguai'],['MX','México'],['CA','Canadá'],['GB','Reino Unido'],['DE','Alemanha'],['ES','Espanha'],['FR','França'],['IT','Itália'],['JP','Japão'],['AU','Austrália'],['00','Mundo / driver padrão']];
			const seenCountries={};
			preferredCountries.forEach(function(item){seenCountries[item[0]]=1;country.appendChild(E('option',{value:item[0]},[item[1]+' ('+item[0]+')']));});
			(this.countries||[]).slice().sort(function(a,b){return String(a.country||a.code).localeCompare(String(b.country||b.code));}).forEach(function(item){const code=String(item.code||item.iso3166||'').toUpperCase();if(!code||seenCountries[code])return;seenCountries[code]=1;country.appendChild(E('option',{value:code},[(item.country||code)+' ('+code+')']));});
			country.value=saved.country||'BR';
			const wifiMode=select(saved.wifi_mode||'unified',[['unified','Unificar 2,4 GHz e 5 GHz'],['split','Separar com sufixos -2G e -5G']]);
			const mainSsid=input('text',saved.main_ssid||'Equipe-X',{maxlength:32});
			const mainKey=input('password','',{placeholder:'mínimo 8 caracteres'});
			const guestEnabled=checkbox(saved.guest_enabled!==false);
			const guestSsid=input('text',saved.guest_ssid||'Equipe-X-Visitantes',{maxlength:32});
			const guestKey=input('password','',{placeholder:'mínimo 8 caracteres'});
			const guestLimitEnabled=checkbox(saved.guest_limit_enabled!==false);
			const guestDownload=input('number',saved.guest_download_kbps||'0',{min:0,max:100000});
			const guestUpload=input('number',saved.guest_upload_kbps||'1500',{min:0,max:100000});
			const wan2Enabled=checkbox(saved.wan2_enabled!==false);
			const wanMode=select(saved.wan_mode||'failover',[['single','Somente WAN1'],['failover','Failover WAN1 → WAN2'],['balanced','Balanceamento'],['wan1','Forçar WAN1'],['wan2','Forçar WAN2']]);
			const syncInternetProfile=function(){
				if(profile.value==='internet_single'){wan2Enabled.checked=false;wanMode.value='single';}
				else if(profile.value==='internet_failover'){wan2Enabled.checked=true;wanMode.value='failover';}
				else if(profile.value==='internet_balance'){wan2Enabled.checked=true;wanMode.value='balanced';}
			};
			profile.addEventListener('change',syncInternetProfile);
			const sqmEnabled=checkbox(!!saved.sqm_enabled);
			const sqmStrategy=select(saved.sqm_strategy||'manual',[['manual','Definir limites manualmente'],['calibrate_later','Medir depois pelo painel'],['off','Não configurar SQM agora']]);
			const sqmWanUp=input('number',saved.sqm_wan_upload||'',{placeholder:'ex.: 15000'});
			const sqmWanDown=input('number',saved.sqm_wan_download||'',{placeholder:'ex.: 200000'});
			const sqmWan2Up=input('number',saved.sqm_wan2_upload||'',{placeholder:'opcional'});
			const sqmWan2Down=input('number',saved.sqm_wan2_download||'',{placeholder:'opcional'});
			const dnsMode=select(saved.dns_mode||'recommended',[['recommended','DNS recomendado'],['operator','DNS da operadora'],['custom','DNS personalizado']]);
			const savedDns=String(saved.dns_servers||'1.1.1.1 1.0.0.1 8.8.8.8').split(/\s+/);
			const dns1=input('text',savedDns[0]||'1.1.1.1',{placeholder:'DNS 1'}), dns2=input('text',savedDns[1]||'1.0.0.1',{placeholder:'DNS 2'}), dns3=input('text',savedDns[2]||'8.8.8.8',{placeholder:'DNS 3 opcional'});
			const disableIpv6=checkbox(saved.disable_ipv6!==false), disableWps=checkbox(saved.disable_wps!==false), useArgon=checkbox(saved.use_argon!==false);
			const modules=(saved.install_modules||'argon sqm mwan3 nlbwmon').split(/\s+/), moduleBoxes={};
			const moduleNames={argon:'Tema Argon',sqm:'SQM / CAKE',mwan3:'Multi‑WAN',nlbwmon:'Consumo por dispositivo',upnp:'UPnP / NAT‑PMP',uhttpd:'HTTPS/uHTTPd',speedtest:'Medidor de internet'};
			['argon','sqm','mwan3','nlbwmon','upnp','uhttpd','speedtest'].forEach(L.bind(function(key){const installed=this.feature(key).installed;moduleBoxes[key]=checkbox(installed||modules.indexOf(key)>=0);moduleBoxes[key].disabled=installed;},this));
			const progress=E('div',{class:'ex-ez-progress'},[E('strong',{},['Progresso salvo: etapa ',String(saved.applied_step||0),'/7']),E('small',{class:'ex-muted'},[saved.state==='applied'?'Configuração já aplicada.':(saved.last_step?'Última etapa: '+saved.last_step:'Rascunho pronto para editar.')]),saved.backup?E('code',{},[saved.backup]):'']);
			const collect=L.bind(function(){
				const selectedModules=Object.keys(moduleBoxes).filter(function(k){return moduleBoxes[k].checked&&!moduleBoxes[k].disabled;}).join(' ');
				const dnsServers=[dns1.value.trim(),dns2.value.trim(),dns3.value.trim()].filter(Boolean).join(' ');
				const args=['ez-setup-save',
					'language='+language.value,'profile='+profile.value,'router_name='+routerName.value,'country='+country.value,'wifi_mode='+wifiMode.value,
					'main_ssid='+mainSsid.value,'guest_enabled='+(guestEnabled.checked?'1':'0'),'guest_ssid='+guestSsid.value,
					'guest_limit_enabled='+(guestLimitEnabled.checked?'1':'0'),'guest_download_kbps='+guestDownload.value,'guest_upload_kbps='+guestUpload.value,
					'wan2_enabled='+(wan2Enabled.checked?'1':'0'),'wan_mode='+wanMode.value,
					'sqm_enabled='+(sqmEnabled.checked?'1':'0'),'sqm_strategy='+sqmStrategy.value,
					'sqm_wan_upload='+sqmWanUp.value,'sqm_wan_download='+sqmWanDown.value,'sqm_wan2_upload='+sqmWan2Up.value,'sqm_wan2_download='+sqmWan2Down.value,
					'dns_mode='+dnsMode.value,'dns_servers='+dnsServers,'disable_ipv6='+(disableIpv6.checked?'1':'0'),'disable_wps='+(disableWps.checked?'1':'0'),'use_argon='+(useArgon.checked?'1':'0'),'install_modules='+selectedModules
				];
				if(mainKey.value)args.push('main_key='+mainKey.value);
				if(guestKey.value)args.push('guest_key='+guestKey.value);
				return args;
			},this);
			const saveDraft=L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',collect()).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar o Ark - Setup');ui.addNotification(null,E('p',{},['Rascunho do Ark - Setup salvo.']));}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this);
			const applySetup=L.bind(function(){return saveDraft().then(L.bind(function(){
				ui.showModal('Aplicar Ark - Setup',[E('p',{class:'alert-message warning'},['O roteador criará um backup em /tmp e aplicará as etapas salvas. Wi‑Fi, DNS, firewall, WAN ou SQM podem reiniciar durante o processo.']),E('p',{},['Se o painel cair, reconecte na nova rede e abra o ARK Router novamente; o progresso fica salvo.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-apply']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao aplicar o Ark - Setup');let out={};try{out=JSON.parse(r.stdout||'{}');}catch(e){}ui.hideModal();ui.addNotification(null,E('p',{},['Ark - Setup aplicado. Backup: ',out.backup||'/tmp/ark-router-ezsetup-backup-*.tar.gz']));window.setTimeout(function(){window.location.reload();},1800);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Confirmar e aplicar'])])]);
			},this));},this);
			const pollSetupModules=L.bind(function(attempt){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-install-status']).then(L.bind(function(r){const state=String(r.stdout||'').trim();if(state==='done'){ui.addNotification(null,E('p',{},['Módulos do Ark - Setup instalados. Recarregando…']));window.setTimeout(function(){window.location.reload();},1200);return;}if(state==='error'||attempt>180){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-install-log']).then(function(log){const lines=String(log.stdout||'').split(/\r?\n/).filter(Boolean);ui.addNotification(null,E('p',{},[lines.slice(-4).join(' | ')||'Falha ao instalar módulos.']),'danger');});}window.setTimeout(function(){pollSetupModules(attempt+1);},2000);},this));},this);
			const installModules=L.bind(function(){return saveDraft().then(L.bind(function(){
				ui.showModal('Instalar módulos do Ark - Setup',[E('p',{class:'alert-message warning'},['A lista de pacotes será atualizada e os módulos selecionados serão instalados um por um. Nenhuma configuração de rede será aplicada automaticamente.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-install-modules']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao iniciar instalação');ui.hideModal();ui.addNotification(null,E('p',{},['Instalação dos módulos iniciada.']));pollSetupModules(0);},this)).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Confirmar instalação'])])]);
			},this));},this);
			const reset=L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-reset']).then(function(){ui.hideModal();ui.addNotification(null,E('p',{},['Rascunho do Ark - Setup apagado.']));}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this);
			const moduleList=E('div',{class:'ex-ez-module-grid'},Object.keys(moduleBoxes).map(L.bind(function(k){const f=this.feature(k);if(f.installed)return E('div',{class:'ex-ez-module-installed'},[E('b',{},['✓']),E('span',{},[moduleNames[k]||k,E('small',{},['Já instalado'])])]);return E('label',{},[moduleBoxes[k],E('span',{},[moduleNames[k]||k,E('small',{},['Opcional'])])]);},this)));
			ui.showModal('Ark - Setup',[E('div',{class:'ex-ez-setup'},[
				progress,
				E('section',{class:'ex-ez-section'},[E('h3',{},['1. Idioma, nome e país']),E('div',{class:'ex-ez-grid ex-ez-grid-3'},[this.ezField('Idioma',language),this.ezField('Nome do painel',routerName),this.ezField('País regulatório',country,'Escolha onde o equipamento está sendo usado.')])]),
				E('section',{class:'ex-ez-section ex-ez-primary'},[E('h3',{},['2. Como a internet entra no roteador?']),E('div',{class:'ex-ez-wide'},[this.ezField('Modo de internet',profile,profileHelp.textContent),this.ezField('Modo Multi‑WAN',wanMode,'Usado quando há duas internet.'),this.ezField('Usar LAN1 como WAN2 DHCP',wan2Enabled,'Ativa a segunda entrada de internet na porta LAN1.')])]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['3. Wi‑Fi principal']),E('div',{class:'ex-ez-grid'},[this.ezField('Nome da rede principal',mainSsid),this.ezField('Senha principal',mainKey,'Mínimo 8 caracteres.'),this.ezField('2,4 GHz e 5 GHz',wifiMode)])]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['4. Rede visitante']),E('div',{class:'ex-ez-grid'},[this.ezField('Habilitar visitante',guestEnabled),this.ezField('Nome da rede visitante',guestSsid),this.ezField('Senha visitante',guestKey,'Mínimo 8 caracteres.'),this.ezField('Limitar visitante',guestLimitEnabled),this.ezField('Download total visitante em Kbps',guestDownload,'0 = ilimitado.'),this.ezField('Upload total visitante em Kbps',guestUpload,'1500 = 1,5 Mbps. Use 0 para ilimitado.')])]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['5. SQM / CAKE']),E('p',{class:'ex-muted'},['Ajuda a manter latência estável quando o link está cheio. Em Starlink/link móvel, prefira upload conservador.']),E('div',{class:'ex-ez-grid'},[this.ezField('Configurar SQM',sqmEnabled),this.ezField('Estratégia',sqmStrategy),this.ezField('WAN1 upload Kbps',sqmWanUp),this.ezField('WAN1 download Kbps',sqmWanDown),this.ezField('WAN2 upload Kbps',sqmWan2Up),this.ezField('WAN2 download Kbps',sqmWan2Down)])]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['6. DNS e segurança']),E('div',{class:'ex-ez-grid'},[this.ezField('Modo DNS',dnsMode),this.ezField('DNS 1',dns1),this.ezField('DNS 2',dns2),this.ezField('DNS 3',dns3,'Opcional'),this.ezField('Desativar IPv6',disableIpv6),this.ezField('Desativar WPS',disableWps),this.ezField('Usar Argon se instalado',useArgon)])]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['7. Recursos opcionais']),E('p',{class:'ex-muted'},['Marcados como “já instalado” já existem no roteador. Os demais são opcionais e só serão instalados se você confirmar.']),moduleList,E('button',{class:'ex-mini-button ex-ez-install-modules','click':installModules},['Instalar módulos selecionados'])]),
				E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Fechar']),' ',E('button',{class:'btn cbi-button cbi-button-neutral','click':reset},['Apagar rascunho']),' ',E('button',{class:'btn cbi-button cbi-button-action','click':saveDraft},['Salvar rascunho']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':applySetup},['Salvar e aplicar'])])
			])]);
		},this));
	},
	showFeatureCenter: function(){
		const language=E('select',{class:'cbi-input-select'},[E('option',{value:'pt-br'},['Português (Brasil)']),E('option',{value:'en'},['Inglês'])]);language.value=this.capabilities.language||'pt-br';
		const brandName=E('input',{class:'cbi-input-text',type:'text',maxlength:40,value:this.capabilities.title||'ARK Router','aria-label':translateText('Nome do painel')});
		const https=this.capabilities.https||{available:false,redirect:false}, httpsInput=E('input',{type:'checkbox','aria-label':translateText('Redirecionar HTTP para HTTPS'),'aria-checked':https.redirect?'true':'false','change':L.bind(function(ev){this.changeHttpsRedirect(ev.currentTarget);},this)});httpsInput.checked=!!https.redirect;if(!https.available)httpsInput.disabled=true;
		const certificateActions=https.ca_available?E('div',{class:'ex-cert-actions'},[E('a',{class:'ex-mini-button',href:https.ca_download||'/ark-router/ark-router-ca.crt',download:'ARK-Router-CA.crt'},['Baixar certificado confiável']),E('button',{class:'ex-feature-link','click':L.bind(this.showCertificateHelp,this)},['Como instalar'])]):'';
		const httpsPanel=E('section',{class:'ex-https-panel'+(https.redirect?' is-enabled':'')},[E('div',{class:'ex-https-heading'},[E('div',{},[E('strong',{},['HTTPS e segurança']),E('small',{class:'ex-muted ex-https-summary'},[https.redirect?'Ligado • todo acesso HTTP vai para HTTPS':'Desligado • HTTP e HTTPS disponíveis'])]),E('span',{class:'ex-pill '+(https.available?'online':'offline')},[https.available?'Disponível':'Indisponível'])]),E('div',{class:'ex-https-toggle-row'},[E('div',{},[E('strong',{},['Redirecionar HTTP para HTTPS']),E('small',{class:'ex-muted'},[https.ca_available?'Certificado ARK preparado para este endereço. Instale a autoridade somente nos dispositivos administrativos.':'Certificado local/autossinado: a conexão é criptografada, mas navegadores não confiam nele automaticamente.'])]),E('div',{class:'ex-https-switch-wrap'},[E('span',{class:'ex-https-switch-state '+(https.redirect?'online':'standby')},[https.redirect?'ATIVO':'DESLIGADO']),E('label',{class:'ex-switch'},[httpsInput,E('span',{class:'ex-switch-slider'})])])]),certificateActions,https.available?E('a',{class:'ex-text-link',href:'https://'+window.location.hostname+window.location.pathname,target:'_blank',rel:'noopener'},['Abrir endereço HTTPS']):'']);
		const appearance=this.capabilities.appearance||{mode:'auto',primary:'#3b82f6',secondary:'#8b5cf6'}, appearanceMode=E('select',{class:'cbi-input-select'},[E('option',{value:'auto'},['Automático (seguir o tema)']),E('option',{value:'equipe'},['ARK Router']),E('option',{value:'custom'},['Personalizado'])]), primary=E('input',{type:'color',value:appearance.primary||'#3b82f6','aria-label':translateText('Cor principal')}), secondary=E('input',{type:'color',value:appearance.secondary||'#8b5cf6','aria-label':translateText('Cor secundária')}); appearanceMode.value=appearance.mode||'auto';
		const appearanceColors=E('div',{class:'ex-color-fields'},[E('label',{},[E('span',{},['Cor principal']),primary]),E('label',{},[E('span',{},['Cor secundária']),secondary])]);
		const updateAppearanceControls=function(){const custom=appearanceMode.value==='custom';appearanceColors.classList.toggle('is-disabled',!custom);primary.disabled=!custom;secondary.disabled=!custom;};appearanceMode.addEventListener('change',updateAppearanceControls);updateAppearanceControls();
		const rows=Object.keys(FEATURE_META).map(L.bind(function(key){const meta=FEATURE_META[key],f=this.feature(key);let state=f.installed?(f.temporary?'Pronto na memória':(f.active?(key==='argon'?'Tema ativo':'Instalado e ativo'):(key==='argon'?'Instalado, mas não selecionado':'Instalado, mas inativo'))):(f.installable?'Não instalado':'Não disponível');if(!f.installed&&f.hidden)state='Sugestão oculta';const actions=[];
			if(!f.installed&&f.installable){if(f.hidden)actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.setFeatureHidden,this,key,false)},['Mostrar sugestão']));else{actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,key)},['Instalar']));actions.push(E('button',{class:'ex-feature-link','click':L.bind(this.setFeatureHidden,this,key,true)},['Ocultar sugestão']));}}
			if(key==='argon'&&f.installed&&!f.active)actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.useTheme,this,key)},['Usar tema']));
			return E('div',{class:'ex-feature-row'},[E('div',{class:'ex-feature-copy'},[E('div',{class:'ex-feature-name-row'},[E('strong',{},[meta.name]),meta.recommended?E('span',{class:'ex-recommended-badge'},['RECOMENDADO']):'']),E('small',{class:'ex-muted'},[meta.description]),f.package?E('code',{},[f.package]):'']),E('div',{class:'ex-feature-state'},[E('span',{class:'ex-pill '+(f.installed?(f.active?'online':'standby'):(f.hidden?'standby':'offline'))},[state]),E('div',{class:'ex-feature-actions'},actions)])]);
		},this));
		ui.showModal('RECURSOS E COMPATIBILIDADE',[E('div',{class:'ex-brand-row'},[E('label',{},['Nome do painel']),brandName,E('button',{class:'ex-mini-button','click':L.bind(function(){this.setDashboardTitle(brandName.value);},this)},['Salvar nome'])]),E('div',{class:'ex-language-row'},[E('label',{},['Idioma do painel']),language,E('button',{class:'ex-mini-button','click':L.bind(function(){this.setDashboardLanguage(language.value);},this)},['Salvar idioma'])]),httpsPanel,E('section',{class:'ex-appearance-panel'},[E('div',{class:'ex-appearance-heading'},[E('div',{},[E('strong',{},['Aparência']),E('small',{class:'ex-muted'},['No modo automático, o painel acompanha as cores e o modo claro ou escuro do tema LuCI.'])]),appearanceMode]),appearanceColors,E('button',{class:'ex-mini-button ex-save-appearance','click':L.bind(function(){this.setAppearance(appearanceMode.value,primary.value,secondary.value);},this)},['Salvar aparência'])]),E('div',{class:'ex-feature-list'},rows),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':ui.hideModal},['Fechar'])])]);
	},
	featureSuggestionCard: function(keys){
		return E('section',{class:'ex-card ex-feature-suggestions'},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['RECURSOS OPCIONAIS']),E('h3',{},['Amplie o painel'])]),E('button',{class:'ex-mini-button','click':L.bind(this.showFeatureCenter,this)},['Recursos'])]),E('div',{class:'ex-suggestion-list'},keys.map(L.bind(function(key){const meta=FEATURE_META[key];return E('div',{class:'ex-suggestion-row'},[E('div',{},[E('div',{class:'ex-feature-name-row'},[E('strong',{},[meta.name]),meta.recommended?E('span',{class:'ex-recommended-badge'},['RECOMENDADO']):'']),E('small',{class:'ex-muted'},[meta.description])]),E('div',{},[E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,key)},['Instalar']),E('button',{class:'ex-feature-link','click':L.bind(this.setFeatureHidden,this,key,true)},['Não mostrar'])])]);},this)))]);
	},
	render: function(loaded) {
		this.board=loaded[0]||{}; this.countries=(loaded[1]&&loaded[1].results)||[]; this.capabilities=loaded[2]||{features:{}}; dashboardLanguage=this.capabilities.language||'pt-br';this.applyAppearance();this.applyBrand(this.capabilities.title);enableTranslation(); const data=loaded[3], w=wifiConfig(data.wireless), release=((this.board.release||{}).description||'').split(' ').slice(0,2).join(' '), panelTitle=this.capabilities.title||'ARK Router';
		const wifiCard=L.bind(function(kind,title,ssid,key){const keyId='ex-'+kind+'-key';return E('section',{class:'ex-card ex-wifi-card'},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['REDE WI‑FI']),E('h3',{id:'ex-'+kind+'-ssid'},[ssid])]),E('span',{class:'ex-pill online'},['ATIVA'])]),E('div',{class:'ex-secret'},[E('code',{id:keyId,'data-hidden':'1',style:'filter:blur(5px)'},[key]),E('button',{class:'ex-mini-button','click':function(ev){this.togglePassword(keyId,ev.currentTarget);}.bind(this)},['Ver senha'])]),E('small',{class:'ex-muted'},[title+' • disponível em 2,4 e 5 GHz']),E('button',{class:'ex-text-button','click':L.bind(this.changeWifiPassword,this,kind,ssid)},['Alterar senha nesta tela →'])]);},this);
		const modeButton=L.bind(function(mode,label){return E('button',{id:'ex-mode-'+mode,class:'ex-mode-button','click':L.bind(this.setMwanMode,this,mode,label)},[label]);},this);
		const historyCard=function(kind,title,color){return E('section',{class:'ex-card ex-history-card','style':'--history-color:'+color},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['HISTÓRICO 24 HORAS']),E('h3',{},[title])]),E('strong',{id:'ex-history-'+kind+'-peak',class:'ex-history-peak'},['Coletando…'])]),E('canvas',{id:'ex-history-'+kind,class:'ex-history-chart',width:600,height:126})]);};
		const healthItem=function(icon,label,valueId,barId,color){return E('div',{class:'ex-health-item','style':'--health-color:'+color},[E('span',{class:'ex-health-icon'},[icon]),E('div',{class:'ex-health-copy'},[E('span',{class:'ex-label'},[label]),E('strong',{id:valueId},['—']),barId?E('div',{class:'ex-health-bar'},[E('i',{id:barId})]):E('small',{class:'ex-health-steady'},['atividade do sistema'])])]);};
		const speedWanCard=L.bind(function(wan,label,available){const attrs={class:'ex-mini-button','click':L.bind(this.startSpeedtest,this,wan,label)};if(!available)attrs.disabled=true;return E('div',{class:'ex-speedtest-wan'},[E('div',{class:'ex-card-title'},[E('h3',{},[label]),E('button',attrs,['Executar teste'])]),E('div',{id:'ex-speedtest-'+wan+'-result',class:'ex-speedtest-result'},[E('span',{class:'ex-muted'},[available?'Sem resultado nesta sessão.':'SEM CABO'])])]);},this);
		const root=E('div',{class:'ex-dashboard'},[
			E('section',{class:'ex-hero'},[E('div',{},[E('span',{class:'ex-eyebrow'},['CENTRAL DE OPERAÇÕES']),E('h2',{},[panelTitle]),E('p',{},[this.board.model||'OpenWrt','  •  ',release])]),E('div',{class:'ex-hero-status'},[E('span',{id:'ex-global-status',class:'ex-pill standby'},['VERIFICANDO']),E('strong',{id:'ex-clock'},['--:--:--']),E('small',{},['sessão de 12 horas • atualização a cada 3 segundos']),E('div',{class:'ex-hero-actions'},[E('button',{class:'ex-hero-feature-button ex-hero-setup-button','click':L.bind(this.showEzSetup,this)},['Ark - Setup']),E('button',{class:'ex-hero-feature-button','click':L.bind(this.showFeatureCenter,this)},['Recursos'])])])]),
			E('section',{class:'ex-card ex-health-strip'},[E('div',{class:'ex-health-head'},[E('div',{},[E('span',{class:'ex-kicker'},['SAÚDE DO ROTEADOR']),E('small',{},['Ligado há ',E('strong',{id:'ex-uptime'},['—'])])]),E('span',{id:'ex-health-status',class:'ex-pill standby'},['VERIFICANDO'])]),E('div',{class:'ex-health-items'},[healthItem('℃','Temperatura','ex-temperature',null,'#f59e0b'),healthItem('▦','Memória','ex-memory','ex-memory-bar','#3b82f6'),healthItem('▣','Armazenamento','ex-storage','ex-storage-bar','#8b5cf6'),healthItem('⌁','Carga','ex-load',null,'#10b981')])]),
			E('div',{class:'ex-grid ex-grid-2'},[metricCard('↓','Download agora','ex-download','ex-down-total','#3b82f6'),metricCard('↑','Upload agora','ex-upload','ex-up-total','#a855f7')]),
			E('div',{class:'ex-grid ex-grid-2 ex-history-grid'},[historyCard('down','Download ao longo do dia','#3b82f6'),historyCard('up','Upload ao longo do dia','#a855f7')]),
			E('p',{id:'ex-history-samples',class:'ex-history-caption'},['A primeira amostra aparecerá em até 1 minuto']),
			E('div',{class:'ex-grid ex-grid-2'},[
				E('section',{class:'ex-card ex-wan-card'},[E('div',{class:'ex-card-title'},[E('h3',{},['WAN1']),E('span',{id:'ex-wan1-status',class:'ex-pill standby'},['—'])]),infoRow('Endereço IPv4','ex-wan1-ip'),infoRow('Link físico','ex-wan1-link'),infoRow('Latência','ex-wan1-latency'),infoRow('Tempo online','ex-wan1-uptime'),E('button',{class:'ex-mini-button ex-wan-edit-button','click':L.bind(this.editWan,this,'wan')},['Editar internet'])]),
				E('section',{class:'ex-card ex-wan-card'},[E('div',{class:'ex-card-title'},[E('h3',{},['WAN2']),E('span',{id:'ex-wan2-status',class:'ex-pill standby'},['—'])]),infoRow('Endereço IPv4','ex-wan2-ip'),infoRow('Link físico','ex-wan2-link'),infoRow('Latência','ex-wan2-latency'),infoRow('Tempo online','ex-wan2-uptime'),E('button',{class:'ex-mini-button ex-wan-edit-button','click':L.bind(this.editWan,this,'wan2')},['Editar porta / internet'])])
			]),
			E('div',{class:'ex-lan-block'},[E('div',{class:'ex-lan-title'},[E('div',{},[E('span',{class:'ex-kicker'},['PORTAS CABEADAS']),E('h3',{},['LAN disponíveis'])]),E('small',{class:'ex-muted'},['A LAN1 está configurada como WAN2'])]),E('div',{class:'ex-grid ex-grid-2'},[
				E('section',{class:'ex-card ex-lan-card'},[E('div',{class:'ex-card-title'},[E('h3',{},['LAN2']),E('span',{id:'ex-lan2-status',class:'ex-pill standby'},['—'])]),infoRow('Velocidade','ex-lan2-speed'),infoRow('Modo','ex-lan2-duplex'),infoRow('Recebido','ex-lan2-rx'),infoRow('Enviado','ex-lan2-tx')]),
				E('section',{class:'ex-card ex-lan-card'},[E('div',{class:'ex-card-title'},[E('h3',{},['LAN3']),E('span',{id:'ex-lan3-status',class:'ex-pill standby'},['—'])]),infoRow('Velocidade','ex-lan3-speed'),infoRow('Modo','ex-lan3-duplex'),infoRow('Recebido','ex-lan3-rx'),infoRow('Enviado','ex-lan3-tx')])
			])]),
			E('div',{class:'ex-grid ex-grid-2 ex-wifi-grid'},[wifiCard('main','Acesso principal',w.main.ssid||'Equipe-X',w.main.key||''),wifiCard('guest','Visitantes com upload limitado',w.guest.ssid||'Equipe-X-Visitantes',w.guest.key||'')]),
			E('section',{class:'ex-card ex-channel-card'},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['AMBIENTE WI‑FI']),E('h3',{},['Canais e interferência'])]),E('button',{class:'ex-button ex-inline-button','click':L.bind(function(ev){this.analyzeChannels(ev.currentTarget);},this)},['Analisar canais agora'])]),E('div',{class:'ex-country-control'},[E('div',{},[E('span',{class:'ex-label'},['PAÍS / DOMÍNIO REGULATÓRIO']),E('strong',{id:'ex-country-current'},['—'])]),E('button',{class:'ex-mini-button','click':L.bind(this.changeCountry,this)},['Alterar país'])]),E('div',{class:'ex-channel-mode-control'},[E('div',{},[E('strong',{},['Seleção automática de canais']),E('small',{id:'ex-channel-mode-summary',class:'ex-muted'},['Verificando…'])]),E('label',{class:'ex-switch'},[E('input',{id:'ex-channel-auto-toggle',type:'checkbox','aria-label':translateText('Seleção automática de canais'),'change':L.bind(function(ev){this.toggleAutoChannels(ev.currentTarget);},this)}),E('span',{class:'ex-switch-slider'})])]),E('div',{class:'ex-grid ex-grid-2 ex-channel-grid'},[E('div',{},[E('div',{class:'ex-channel-band-head'},[E('b',{},['2,4 GHz']),E('span',{id:'ex-wifi-2-mode',class:'ex-pill standby'},['—'])]),E('span',{id:'ex-wifi-2'},['—'])]),E('div',{},[E('div',{class:'ex-channel-band-head'},[E('b',{},['5 GHz']),E('span',{id:'ex-wifi-5-mode',class:'ex-pill standby'},['—'])]),E('span',{id:'ex-wifi-5'},['—'])])]),E('p',{id:'ex-wifi-noise',class:'ex-muted'},['—']),E('p',{id:'ex-scan-result',class:'ex-scan-result'},['A análise é manual e apenas recomenda canais; não interrompe os usuários.']),E('div',{class:'ex-channel-actions'},[E('button',{id:'ex-apply-channels',class:'ex-channel-action primary',disabled:true,'click':L.bind(this.changeChannels,this,'fixed')},['Analisar antes de aplicar'])])]),
			E('section',{class:'ex-card ex-devices'},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['DISPOSITIVOS']),E('h3',{},['Quem está conectado'])]),E('span',{id:'ex-device-count',class:'ex-pill online'},['0 conectados'])]),E('details',{},[E('summary',{},['Expandir lista e ver tráfego individual']),E('div',{class:'ex-table-wrap'},[E('table',{class:'ex-device-table'},[E('thead',{},[E('tr',{},[E('th',{},['Dispositivo']),E('th',{class:'ex-hide-mobile'},['Rede / sinal']),E('th',{},['Agora']),E('th',{},[''])])]),E('tbody',{id:'ex-device-body'}),E('tbody',{id:'ex-device-empty'},[E('tr',{},[E('td',{colspan:4},['Nenhum dispositivo conectado.'])])])])]),E('p',{class:'ex-muted ex-table-note'},['A velocidade é estimada pelos contadores do roteador e atualizada a cada 3 segundos. Em Configurar, você pode renomear, reservar o IP e priorizar o aparelho.'])])]),
			E('div',{class:'ex-grid ex-grid-2'},[
				E('section',{class:'ex-card ex-center-card'},[E('span',{class:'ex-big-icon'},['★']),E('span',{class:'ex-label'},['Equipe-X']),E('strong',{id:'ex-main-clients',class:'ex-number'},['0']),E('small',{id:'ex-main-wifi',class:'ex-muted'},['0 no Wi-Fi'])]),
				E('section',{class:'ex-card ex-center-card'},[E('span',{class:'ex-big-icon'},['♟']),E('span',{class:'ex-label'},['Visitantes']),E('strong',{id:'ex-guest-clients',class:'ex-number'},['0']),E('small',{id:'ex-guest-wifi',class:'ex-muted'},['0 no Wi-Fi'])])
			]),
			E('section',{class:'ex-card ex-speedtest-card'},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['TESTE DE LINK']),E('h3',{},['Calibração do upload'])]),E('span',{class:'ex-pill online'},['Pronto na memória'])]),E('p',{class:'ex-muted'},['O teste faz uma medição completa e mais duas de upload. O SQM desta WAN será pausado e restaurado automaticamente. Durante o teste, o link ficará ocupado.']),E('div',{class:'ex-grid ex-grid-2 ex-speedtest-grid'},[speedWanCard('wan','WAN1',!!iface(data.interfaces,'wan').up),speedWanCard('wan2','WAN2',!!iface(data.interfaces,'wan2').up)])]),
			E('section',{class:'ex-card ex-qos-card'},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['CONTROLE DE FILAS']),E('h3',{},['CAKE / SQM'])]),E('span',{id:'ex-qos-status',class:'ex-pill standby'},['—'])]),E('div',{class:'ex-qos-toggle-row'},[E('div',{},[E('strong',{},['SQM / CAKE']),E('small',{class:'ex-muted'},['Liga ou desliga as filas configuradas'])]),E('div',{class:'ex-device-switch-control'},[E('strong',{id:'ex-qos-toggle-state',class:'ex-device-switch-state'},['—']),E('label',{class:'ex-switch'},[E('input',{id:'ex-qos-toggle',type:'checkbox','change':L.bind(function(ev){this.toggleSqm(ev.currentTarget);},this)}),E('span',{class:'ex-switch-slider'})])])]),E('div',{class:'ex-grid ex-grid-3 ex-qos-grid'},[infoRow('WAN1 limites','ex-qos-wan'),infoRow('Rede visitante','ex-qos-guest'),infoRow('DNS do roteador','ex-dns')]),E('button',{class:'ex-button ex-qos-edit-button','click':L.bind(this.editSqmLimits,this)},['Editar limites'])]),
			E('section',{class:'ex-card ex-mwan-control'},[
				E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['MULTI‑WAN']),E('h3',{},['Modo atual: ',E('span',{id:'ex-mwan-mode'},['Failover WAN1 → WAN2'])])]),E('a',{class:'ex-text-link',href:L.url('admin/status/mwan3/overview')},['Ver detalhes →'])]),
				E('details',{class:'ex-mwan-editor'},[
					E('summary',{},['Editar modo do Multi‑WAN']),
					E('div',{class:'ex-mwan-editor-body'},[E('p',{class:'ex-muted'},['Escolha um modo abaixo. Depois do clique, ainda será necessário confirmar antes que qualquer alteração seja aplicada.']),E('div',{class:'ex-mode-grid'},[modeButton('failover','Failover'),modeButton('balanced','Balancear'),modeButton('wan1','Só WAN1'),modeButton('wan2','Só WAN2')]),E('small',{class:'ex-muted'},['Balanceamento distribui conexões entre os links; não soma a velocidade de um único envio.'])])
				])
			]),
			E('section',{class:'ex-shortcuts'},[E('a',{'data-feature':'mwan3',href:L.url('admin/status/mwan3/overview')},[E('b',{},['⇄']),E('span',{},['MultiWAN',E('small',{},['estado detalhado'])])]),E('a',{'data-feature':'nlbwmon',href:L.url('admin/services/nlbw/display')},[E('b',{},['▥']),E('span',{},['Consumo',E('small',{},['histórico completo'])])]),E('a',{href:L.url('admin/status/realtime/bandwidth')},[E('b',{},['⌁']),E('span',{},['Gráficos',E('small',{},['interfaces em tempo real'])])]),E('a',{href:L.url('admin/network/dhcp')},[E('b',{},['⌘']),E('span',{},['IPs fixos',E('small',{},['reservas DHCP'])])])]),
			E('section',{class:'ex-card ex-reboot-card'},[E('div',{},[E('span',{class:'ex-kicker'},['SISTEMA']),E('h3',{},['Reiniciar o roteador']),E('p',{class:'ex-muted'},['Interrompe a internet por alguns minutos e encerra as sessões abertas.'])]),E('button',{class:'ex-reboot-button','click':L.bind(this.requestReboot,this)},['Reiniciar…'])])
		]);
		if(!this.feature('history').installed){const h=root.querySelector('.ex-history-grid'),c=root.querySelector('.ex-history-caption');if(h)h.remove();if(c)c.remove();}
		if(!this.feature('wifi').installed){const g=root.querySelector('.ex-wifi-grid'),c=root.querySelector('.ex-channel-card');if(g)g.remove();if(c)c.remove();}
		if(!this.feature('temperature').installed){const t=root.querySelector('#ex-temperature');if(t&&t.closest('.ex-health-item'))t.closest('.ex-health-item').remove();const hi=root.querySelector('.ex-health-items');if(hi)hi.classList.add('compact-3');}
		if(!this.feature('custom_qos').installed){const q=root.querySelector('#ex-qos-guest');if(q&&q.closest('.ex-row'))q.closest('.ex-row').remove();}
		if(!this.feature('sqm').installed){const q=root.querySelector('.ex-qos-card');if(q)q.remove();}
		if(!this.feature('speedtest').installed){const s=root.querySelector('.ex-speedtest-card');if(s)s.remove();}
		if(!this.feature('mwan3').installed){const m=root.querySelector('.ex-mwan-control'),s=root.querySelector('[data-feature="mwan3"]');if(m)m.remove();if(s)s.remove();}
		if(!this.feature('nlbwmon').installed){const s=root.querySelector('[data-feature="nlbwmon"]');if(s)s.remove();const note=root.querySelector('.ex-table-note');if(note)note.textContent='O monitor de consumo não está instalado; a lista de dispositivos continua disponível, sem velocidade individual.';}
		const missing=['argon','uhttpd','sqm','mwan3','nlbwmon','upnp','speedtest'].filter(L.bind(function(k){const f=this.feature(k);return !f.installed&&f.installable&&!f.hidden;},this));if(missing.length){const anchor=root.querySelector('.ex-devices');root.insertBefore(this.featureSuggestionCard(missing),anchor);}
		translateTree(root);
		this.update(data);if(this.feature('speedtest').installed)window.setTimeout(L.bind(function(){this.loadSpeedtestResult('wan');this.loadSpeedtestResult('wan2');},this),0); poll.add(L.bind(function(){return this.fetchData().then(L.bind(this.update,this));},this),3); return root;
	},
	handleSaveApply:null, handleSave:null, handleReset:null
});
