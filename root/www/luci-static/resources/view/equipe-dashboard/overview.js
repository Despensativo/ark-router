'use strict';
'require view';
'require rpc';
'require poll';
'require fs';
'require ui';

document.querySelector('head').appendChild(E('link', {
	'rel': 'stylesheet', 'type': 'text/css',
	'href': L.resource('view/equipe-dashboard/overview.css') + '?v=' + Date.now()
}));

const callSystemBoard = rpc.declare({ object: 'system', method: 'board' });
const callSystemInfo = rpc.declare({ object: 'system', method: 'info' });
const callInterfaceDump = rpc.declare({ object: 'network.interface', method: 'dump' });
const callDeviceStatus = rpc.declare({ object: 'network.device', method: 'status', params: [ 'name' ], expect: { '': {} } });
const callWirelessStatus = rpc.declare({ object: 'network.wireless', method: 'status', expect: { '': {} } });
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
	'🎮 MODO GAMER • BAIXA LATÊNCIA':'🎮 GAMER MODE • LOW LATENCY','🎮 GAMER ATIVO':'🎮 GAMER ACTIVE','🎮 Modo Gamer':'🎮 Gamer Mode','Ativar Modo Gamer':'Enable Gamer Mode','Voltar ao Modo Padrão':'Switch to Standard Mode',
	'Ativar o Modo Gamer (Baixa Latência)?':'Enable Gamer Mode (Low Latency)?','Voltar ao Modo Padrão / Controlado?':'Switch back to Standard / Controlled Mode?','Confirmar e Ativar Gamer':'Confirm & Enable Gamer',
	'O ARK Router ativará o tema Vermelho Gamer, aplicará otimizações de baixa latência e anti-bufferbloat (CAKE ack-filter) e priorizará pacotes de jogos em tempo real (DSCP EF).':'ARK Router will activate the Gamer Red theme, apply low latency and anti-bufferbloat optimizations (CAKE ack-filter), and prioritize real-time gaming packets (DSCP EF).',
	'O ARK Router retornará ao tema visual padrão e aplicará o equilíbrio padrão de tráfego.':'ARK Router will return to the default visual theme and apply standard traffic balancing.',
	'Modo Gamer ativado com sucesso! Carregando tema Vermelho Gamer…':'Gamer Mode enabled successfully! Loading Gamer Red theme…','Modo Padrão restaurado. Recarregando…':'Standard Mode restored. Reloading…',
	'Fila Gamer / PUBG Mobile (DSCP EF - Tempo Real)':'Gamer / PUBG Mobile Queue (DSCP EF - Real-Time)','Fila Normal (DSCP AF41 - Vídeo)':'Standard Queue (DSCP AF41 - Video)',
	'No modo Gamer (EF), pacotes do dispositivo passam à frente de downloads e streams. No modo Normal (AF41), usa a classe de vídeo.':'In Gamer mode (EF), device packets bypass downloads and streams. In Standard mode (AF41), uses video class.',
	'SAÚDE DO ROTEADOR':'ROUTER HEALTH','Ligado há ':'Up for ','Temperatura':'Temperature','Memória':'Memory','Armazenamento':'Storage','Carga':'Load','atividade do sistema':'system activity','NORMAL':'NORMAL','ATENÇÃO':'ATTENTION',
	'Download agora':'Download now','Upload agora':'Upload now','aguardando leitura':'waiting for data','HISTÓRICO 24 HORAS':'24-HOUR HISTORY','Download ao longo do dia':'Download throughout the day','Upload ao longo do dia':'Upload throughout the day','Coletando…':'Collecting…','A primeira amostra aparecerá em até 1 minuto':'The first sample will appear within 1 minute',
	'Modo de conexão':'Connection mode','DHCP automático':'Automatic DHCP','IP fixo / estático':'Static IP','Modem móvel (QMI)':'Mobile modem (QMI)','Modem móvel (MBIM)':'Mobile modem (MBIM)','Modem móvel (NCM)':'Mobile modem (NCM)','Wi-Fi como internet':'Wi-Fi as internet','Desativada':'Disabled','Endereço IPv4':'IPv4 address','Gateway':'Gateway','Máscara':'Netmask','DNS recebidos':'Received DNS','Link físico':'Physical link','Latência':'Latency','Tempo online':'Uptime','ONLINE':'ONLINE','OFFLINE':'OFFLINE','SEM CABO':'UNPLUGGED','conectado':'connected','interface ativa':'interface active','sem link':'no link','CONECTADA':'CONNECTED','Full duplex':'Full duplex','Automático':'Automatic',
	'PORTAS CABEADAS':'WIRED PORTS','LAN disponíveis':'Available LAN ports','A LAN1 está configurada como WAN2':'LAN1 is configured as WAN2','Velocidade':'Speed','Modo':'Mode','Recebido':'Received','Enviado':'Sent','Recebido hoje':'Received today','Enviado hoje':'Sent today','Sessão atual':'Current session',
	'REDE WI‑FI':'WI-FI NETWORK','ATIVA':'ACTIVE','Ver senha':'Show password','Ocultar senha':'Hide password','Acesso principal':'Main access','Visitantes com upload limitado':'Guests with limited upload','Acesso principal • disponível em 2,4 e 5 GHz':'Main access • available on 2.4 and 5 GHz','Visitantes com upload limitado • disponível em 2,4 e 5 GHz':'Guests with limited upload • available on 2.4 and 5 GHz','Alterar senha nesta tela →':'Change password here →',
	'AMBIENTE WI‑FI':'WI-FI ENVIRONMENT','Canais e interferência':'Channels and interference','Analisar canais agora':'Analyze channels now','PAÍS / DOMÍNIO REGULATÓRIO':'COUNTRY / REGULATORY DOMAIN','Alterar país':'Change country','Seleção automática de canais':'Automatic channel selection','Verificando…':'Checking…','Desligado • canais definidos manualmente':'Off • manually selected channels','Ligado • o roteador escolhe os canais':'On • the router selects channels','Configuração mista entre as bandas':'Mixed configuration between bands','AUTO':'AUTO','MANUAL':'MANUAL',
	'A análise é manual e apenas recomenda canais; não interrompe os usuários.':'Analysis is manual and only recommends channels; it does not interrupt users.','Analisar antes de aplicar':'Analyze before applying',
	'DISPOSITIVOS':'DEVICES','Quem está conectado':'Connected devices','Ordenar':'Sort','Nome':'Name','Maior primeiro':'Largest first','Menor primeiro':'Smallest first','Expandir lista e ver tráfego individual':'Expand list and view per-device traffic','Dispositivo':'Device','Rede / sinal':'Network / signal','Agora':'Now','Total':'Total','Nenhum dispositivo conectado.':'No devices connected.','Configurar':'Configure','Visitantes / Wi-Fi':'Guests / Wi-Fi','Cabo / LAN':'Wired / LAN','Rede principal':'Main network','Visitantes':'Guests',
	'A velocidade instantânea vem dos contadores do roteador; o total acumulado vem do nlbwmon e é atualizado a cada 3 segundos. Em Configurar, você pode renomear, reservar o IP e priorizar o aparelho.':'Instant speed comes from router counters; accumulated total comes from nlbwmon and refreshes every 3 seconds. Under Configure, you can rename, reserve the IP, and prioritize the device.',
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
	,irqbalance:{name:'IRQ Balance',description:'Distribui interrupções de hardware entre os núcleos do processador para manter Wi‑Fi, rede e CPU mais responsivos.'}
	,speedify:{name:'Speedify Bonding',description:'Integra o Speedify para somar links de internet de verdade usando licença Speedify Router.',recommended:true}
	,zerotier:{name:'ZeroTier remoto leve',description:'Acesso remoto leve por rede virtual. Melhor para roteadores com pouca flash/RAM.',recommended:true}
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
function formatUptime(seconds) {
	seconds = Math.max(0, Number(seconds) || 0);
	const d = Math.floor(seconds / 86400), h = Math.floor((seconds % 86400) / 3600), m = Math.floor((seconds % 3600) / 60);
	return d ? '%dd %dh %dm'.format(d, h, m) : (h ? '%dh %dm'.format(h, m) : '%dm'.format(m));
}
function text(id, value) { const n = document.getElementById(id); if (n) n.textContent = value == null ? '—' : String(value); }
function setPill(id, state, label) { const n = document.getElementById(id); if (n) { n.className = 'ex-pill ' + state; n.textContent = label; } }
function reloadSoon(message, delay) { ui.addNotification(null, E('p', {}, [ message || 'Aplicado. Recarregando o painel…' ])); window.setTimeout(function() { window.location.reload(); }, delay || 1800); }
function isExpectedApplyDisconnect(e) { return /xhr|timeout|timed out|network|failed to fetch|request/i.test(String((e && e.message) || e || '')); }
function reloadAfterExpectedDisconnect(e, message, delay) {
	if (!isExpectedApplyDisconnect(e)) return false;
	try { ui.hideModal(); } catch (err) {}
	reloadSoon(message || 'Comando enviado. O painel pode ter perdido a resposta enquanto o roteador reinicia serviços…', delay || 3500);
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
	window.setTimeout(function() { window.location.href = window.location.protocol + '//' + ip + path; }, delay || 2200);
}
function iface(dump, name) { return ((dump && dump.interface) || []).find(function(x) { return x.interface === name; }) || {}; }
function values(config) { return config && config.values || {}; }
function lanPortsFromNetwork(networkConfig) {
	const net=values(networkConfig), ports=[], seen={};
	Object.keys(net).forEach(function(k) {
		const s=net[k]||{};
		if(s['.type']==='device'&&s.name==='br-lan') {
			const p=Array.isArray(s.ports)?s.ports:String(s.ports||'').split(/\s+/);
			p.forEach(function(port){ if(port&&!seen[port]){seen[port]=1;ports.push(port);} });
		}
	});
	if(!ports.length) ['lan1','lan2','lan3','lan4'].forEach(function(port){ports.push(port);});
	return ports;
}
function portLabel(port) {
	const m=String(port||'').match(/^lan([0-9]+)$/i);
	return m?'LAN'+m[1]:String(port||'porta').toUpperCase();
}
function portDomId(port) { return String(port||'port').replace(/[^A-Za-z0-9_-]/g,'_'); }
function getActiveWanList(data) {
	const net=values((data||{}).networkConfig), dump=(data||{}).interfaces||{}, list=[], seen={};
	list.push({iface:'wan', label:'WAN1', domId:'wan1', isPrimary:true, device:(net.wan||{}).device||'wan'});
	seen.wan=1;
	Object.keys(net).filter(function(k){ return /^wan([0-9]+)$/i.test(k); })
		.sort(function(a,b){ return Number(a.replace(/\D/g,'')) - Number(b.replace(/\D/g,'')); })
		.forEach(function(name){
			const cfg=net[name]||{}, live=iface(dump,name);
			const proto=String(cfg.proto||''), dev=String(cfg.device||live.l3_device||live.device||'');
			if(proto==='none' || !proto || !dev) return;
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
function sqmWanProfiles(data) {
	const net=values((data||{}).networkConfig), dump=(data||{}).interfaces||{}, result=[], seen={};
	Object.keys(net).filter(function(name){return /^wan(?:[0-9]+)?$/i.test(name);}).sort(function(a,b){if(a==='wan')return -1;if(b==='wan')return 1;return Number(a.replace(/\D/g,''))-Number(b.replace(/\D/g,''));}).forEach(function(name){
		const cfg=net[name]||{}, live=iface(dump,name), proto=String(cfg.proto||''), hasIpv4=Array.isArray(live['ipv4-address'])&&live['ipv4-address'].length>0;
		if(proto==='none'||proto==='dhcpv6'||(!/^(dhcp|pppoe|static)$/i.test(proto)&&!hasIpv4))return;
		const section=name==='wan'?'wan1':name.toLowerCase();if(seen[section])return;seen[section]=1;
		result.push({network:name,section:section,label:name==='wan'?'WAN1':name.toUpperCase(),device:String(live.l3_device||live.device||cfg.device||name),online:!!live.up});
	});
	return result;
}
function parsePing(r) { const m = ((r && r.stdout) || '').match(/time[=<]([0-9.]+)/); return r && r.code === 0 && m ? Number(m[1]) : null; }
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
	groups.forEach(function(g) { ((g && g.results) || []).forEach(function(r) { if (r.mac) out[r.mac.toUpperCase()] = r; }); });
	return out;
}
function friendlyMap(config) {
	const out = {};
	Object.keys(values(config)).forEach(function(k) { const x = values(config)[k]; if (x.mac && x.name) out[x.mac.toUpperCase()] = x.name; });
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
			out[mac] = { enabled: enabled, down: down, up: up };
		}
	});
	return out;
}
function wifiConfig(config) {
	const v = values(config);
	const bandOfSection=function(section){const radio=v[section.device]||{}, band=String(radio.band||'').toLowerCase(), ht=String(radio.htmode||'').toLowerCase(), hw=String(radio.hwmode||'').toLowerCase();if(band.indexOf('2')===0||hw==='11g')return '2g';if(band.indexOf('5')===0||hw==='11a'||ht.indexOf('80')>=0||ht.indexOf('160')>=0)return '5g';return '';};
	const pick=function(network, band, preferred){if(v[preferred])return v[preferred];let found={};Object.keys(v).some(function(k){const s=v[k]||{};if(s['.type']!=='wifi-iface'&&!(s.mode==='ap'&&s.ssid))return false;const nets=String(s.network||'').split(/\s+/);if(nets.indexOf(network)<0)return false;if(band&&bandOfSection(s)!==band)return false;found=s;return true;});return found;};
	const main2 = pick('lan','2g','default_radio0'), main5 = pick('lan','5g','default_radio1'), guest2 = pick('guest','2g','guest_radio0'), guest5 = pick('guest','5g','guest_radio1');
	const mergeWifi=function(a,b,id,kindLabel){
		const out=Object.assign({}, b || {}, a || {});
		out.id = id;
		out.kind = kindLabel || 'extra';
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
	const hasRadios = Object.keys(v).some(function(k){ return v[k]['.type'] === 'wifi-device'; });
	const extrasMap = {};
	Object.keys(v).forEach(function(k){
		const s = v[k] || {};
		if(s['.type'] !== 'wifi-iface' || s.mode !== 'ap' || !s.ssid) return;
		if(k === 'default_radio0' || k === 'default_radio1' || k === 'guest_radio0' || k === 'guest_radio1') return;
		const groupKey = k.replace(/_r[01]$/, '').replace(/_radio[01]$/, '');
		if(!extrasMap[groupKey]) extrasMap[groupKey] = { r0: null, r1: null, name: groupKey };
		const band = bandOfSection(s);
		if(band === '2g') extrasMap[groupKey].r0 = s;
		else extrasMap[groupKey].r1 = s;
	});
	const extras = Object.keys(extrasMap).map(function(gk){
		const g = extrasMap[gk];
		return mergeWifi(g.r0, g.r1, gk, 'extra');
	});
	return { hasRadios: hasRadios, main: mergeWifi(main2, main5, 'main', 'main'), guest: mergeWifi(guest2, guest5, 'guest', 'guest'), extras: extras, r0: v.radio0 || {}, r1: v.radio1 || {} };
}
function wifiBand(radioName, radio) {
	const c=(radio&&radio.config)||{}, band=String(c.band||'').toLowerCase(), ht=String(c.htmode||'').toLowerCase(), hw=String(c.hwmode||'').toLowerCase(), name=String(radioName||'').toLowerCase();
	if (band.indexOf('2') === 0 || hw === '11g' || ht.indexOf('g') >= 0 || name.indexOf('2g') >= 0) return '2g';
	if (band.indexOf('5') === 0 || hw === '11a' || ht.indexOf('80') >= 0 || ht.indexOf('160') >= 0 || name.indexOf('5g') >= 0) return '5g';
	return '';
}
function wifiTopology(status) {
	const topo={ mainIfnames:[], guestIfnames:[], survey2:'phy0-ap0', survey5:'phy1-ap0', scan2:'phy0-ap0', scan5:'phy1-ap0', dynamic:false };
	Object.keys(status||{}).forEach(function(radioName) {
		const radio=status[radioName]||{}, band=wifiBand(radioName, radio), ifaces=radio.interfaces||[];
		let firstAp='';
		ifaces.forEach(function(iface) {
			const ifname=iface.ifname, cfg=iface.config||{}, networks=Array.isArray(cfg.network)?cfg.network:[cfg.network].filter(Boolean);
			if (!ifname) return;
			if (!firstAp) firstAp=ifname;
			if (networks.indexOf('guest') >= 0) topo.guestIfnames.push(ifname);
			else if (networks.indexOf('lan') >= 0 || networks.length === 0) topo.mainIfnames.push(ifname);
		});
		if (firstAp && band === '2g') topo.survey2=topo.scan2=firstAp;
		if (firstAp && band === '5g') topo.survey5=topo.scan5=firstAp;
	});
	topo.dynamic = topo.mainIfnames.length > 0 || topo.guestIfnames.length > 0;
	if (!topo.mainIfnames.length) topo.mainIfnames=['phy0-ap0','phy1-ap0'];
	if (!topo.guestIfnames.length) topo.guestIfnames=['phy0-ap1','phy1-ap1'];
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

return view.extend({
	board: {}, countries: [], capabilities: {features:{}}, previous: {}, trafficPrevious: {}, trafficAt: 0, currentData: null, recommendedChannels: null, speedResults: {}, refreshTimer: null, dashboardRoot: null, deviceSortKey: 'total', deviceSortDir: 'desc', starlinkTelemetryTimer: null, starlinkTelemetryStopTimer: null, starlinkTelemetryActive: false, starlinkTelemetryWan: null, starlinkWanOrder: [], starlinkResults: {},
	fetchCapabilities: function(){return safe(fs.exec('/usr/sbin/equipe-dashboard-control',['features']),{}).then(function(r){try{return JSON.parse((r&&r.stdout)||'{}');}catch(e){return {language:'pt-br',package_manager:'none',features:{}};}});},
	feature: function(key){return (this.capabilities.features&&this.capabilities.features[key])||{installed:false,active:false,hidden:false,installable:false};},
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
	switchProfile: function(targetMode){
		const isGamer = targetMode === 'gamer';
		const sqm = values((this.currentData||{}).sqm);
		const qosActive = sqmWanProfiles(this.currentData||{}).some(function(profile){ return !!(sqm[profile.section] && sqm[profile.section].enabled === '1'); });
		const autoEnableSqm = E('input', {type: 'checkbox', checked: true});
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
					const msg = isGamer ? (shouldTurnOnSqm ? 'Modo Gamer e SQM / CAKE ativados com sucesso! Carregando tema Vermelho Gamer…' : 'Modo Gamer ativado com sucesso! Carregando tema Vermelho Gamer…') : 'Modo Padrão restaurado. Recarregando…';
					reloadSoon(msg, 2400);
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
			safe(fs.exec_direct('/usr/libexec/nlbwmon-action', [ 'download', '-g', 'family,mac,ip', '-o', '-rx_bytes,-tx_bytes' ], 'json'), { columns: [], data: [] }),
			safe(fs.read('/tmp/equipe-traffic-history.csv'), ''),
			safe(callWirelessStatus(), {}),
			safe(callUciGet('dhcp'), { values: {} }),
			safe(callUciGet('firewall'), { values: {} }),
			safe(fs.read('/tmp/equipe-wan-daily.csv'), '')
		]).then(function(r) {
			const interfaces=r[1], networkConfig=r[9], networkValues=values(networkConfig), topology=wifiTopology(r[16]), lanPorts=lanPortsFromNetwork(networkConfig);
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
					const dnsList = (live['dns-server'] || cfg.dns || []);
					const pingTarget = (Array.isArray(dnsList) && dnsList.length && dnsList[0] && dnsList[0] !== '0.0.0.0') ? dnsList[0] : '8.8.8.8';
					wanPromises.push(safe(fs.exec('/bin/ping',['-c','1','-W','2','-I',bindTarget,pingTarget]),{}).then(function(p){wanPingsMap[w.iface]=p;}));
				}
			});
			return Promise.all([
				Promise.all(wanPromises),
				Promise.all(topology.mainIfnames.map(function(n){ return safe(callAssocList(n), { results: [] }); })),
				Promise.all(topology.guestIfnames.map(function(n){ return safe(callAssocList(n), { results: [] }); })),
				isInitial ? Promise.resolve({ results: [] }) : safe(callSurvey(topology.survey2), { results: [] }),
				isInitial ? Promise.resolve({ results: [] }) : safe(callSurvey(topology.survey5), { results: [] }),
				Promise.all(lanPorts.map(function(port){ return safe(callDeviceStatus(port), {}); }))
			]).then(function(x) { return {
				system:r[0], interfaces:interfaces, wanDevice:wanDevicesMap.wan||{}, wan2Device:wanDevicesMap.wan2||{}, wanPhysicalDevice:wanPhysicalDevicesMap.wan||{}, wan2PhysicalDevice:wanPhysicalDevicesMap.wan2||{},
				wanDevicesMap:wanDevicesMap, wanPhysicalDevicesMap:wanPhysicalDevicesMap, wanPingsMap:wanPingsMap,
				mwan:r[2], leases:r[3], mainAssoc:x[1], guestAssoc:x[2],
				survey2:x[3], survey5:x[4], sqm:r[4], qos:r[5], wireless:r[6], mwanConfig:r[7], names:r[8], networkConfig:r[9], lanStatus:r[10], temperature:r[11], pingWan:wanPingsMap.wan||null, pingWan2:wanPingsMap.wan2||null,
				perfStatus: (function(){ try { return JSON.parse((r[12] && r[12].stdout) || '{}'); } catch(e){ return {}; } })(),
				traffic:r[13], history:r[14], wirelessStatus:r[15], wifiTopology:topology, lanPorts:lanPorts, lanDevices:x[5]||[],
				dhcpConfig: r[16], firewallConfig: r[17], wanDaily: r[18],
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
			this.fetchDataTimed(9000).then(L.bind(function(data){this.update(data);this.scheduleAdaptiveRefresh();},this)).catch(L.bind(function(){this.scheduleAdaptiveRefresh(3000);},this));
		},this),Math.max(250,wait));
	},
	updateWan: function(prefix, i, d, physical, m, ping, cfg, daily) {
		const phy=(physical&&Object.keys(physical).length)?physical:d, mwanInterfaces=((this.currentData||{}).mwan||{}).interfaces||{}, mwanRunning=Object.keys(mwanInterfaces).some(function(k){return !!mwanInterfaces[k].running;}), online=!!i.up&&(!mwanRunning||(m&&(m.status==='online'||m.status==='unknown'||!m.running))), disabled=!phy.carrier||(mwanRunning&&m&&m.status==='disabled');
		setPill(prefix+'-status',online?'online':(disabled?'standby':'offline'),online?'ONLINE':(disabled?'SEM CABO':'OFFLINE'));
		const a=i['ipv4-address']&&i['ipv4-address'][0], speed=String(phy.speed||'').match(/[0-9]+/), full=String(phy.speed||'').toUpperCase().indexOf('F')>=0, link=phy.carrier?(speed?speed[0]+' Mbps'+(full?' • Full duplex':''):'conectado'):(i.up?'interface ativa':'sem link'), stats=d.statistics||{};
		text(prefix+'-mode',wanProtoLabel(i,cfg)); text(prefix+'-ip',a?a.address:'—'); text(prefix+'-gateway',wanGateway(i)); text(prefix+'-mask',a?cidrMask(a.mask):'—'); text(prefix+'-dns',wanDns(i)); text(prefix+'-link',link); text(prefix+'-latency',(online&&ping!=null)?ping.toFixed(0)+' ms':'—'); text(prefix+'-rx-day',daily?formatBytes(daily.rx):'Coletando…'); text(prefix+'-tx-day',daily?formatBytes(daily.tx):'Coletando…'); text(prefix+'-session','↓ '+formatBytes(Number(stats.rx_bytes)||0)+'  •  ↑ '+formatBytes(Number(stats.tx_bytes)||0)); text(prefix+'-uptime',i.up?formatUptime(i.uptime):'—');
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
		text('ex-main-ssid',w.main.ssid||'Rede principal');
		text('ex-guest-ssid',w.guest.ssid||'Visitantes');
		text('ex-main-key',w.main.key||'sem senha'); text('ex-guest-key',w.guest.key||'sem senha');
		setPill('ex-main-wifi-status',String(w.main.disabled||'0')==='1'?'standby':'online',String(w.main.disabled||'0')==='1'?'DESLIGADA':'ATIVA');
		setPill('ex-guest-wifi-status',String(w.guest.disabled||'0')==='1'?'standby':'online',String(w.guest.disabled||'0')==='1'?'DESLIGADA':'ATIVA');
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
	currentWifiChannels: function() {
		const data=this.currentData||{}, w=wifiConfig(data.wireless), s2=surveyInfo(data.survey2), s5=surveyInfo(data.survey5);
		return { two: currentChannelValue(w.r0.channel, s2), five: currentChannelValue(w.r1.channel, s5), auto2: String(w.r0.channel||'auto')==='auto', auto5: String(w.r1.channel||'auto')==='auto' };
	},
	updateMwanMode: function(data) {
		const v=values(data.mwanConfig), p=(v.default_rule_v4||{}).use_policy||(v.https||{}).use_policy||'wan_then_wan2';
		const activeWans = getActiveWanList(data);
		let mode = 'failover';
		if (p === 'balanced') {
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
		if (mode === 'balanced') {
			modeLabel = 'Balanceamento';
		} else if (mode === 'failover') {
			modeLabel = activeWans.length > 1 ? ('Failover (' + activeWans.map(function(w){return w.label;}).join(' → ') + ')') : 'Failover (WAN1 → WAN2)';
		} else if (mode === 'failover_wan2') {
			modeLabel = 'Failover (WAN2 → WAN1)';
		} else {
			const matched = activeWans.find(function(w){return w.domId === mode || w.iface === mode;});
			modeLabel = matched ? ('Somente ' + matched.label) : ('Somente ' + mode.toUpperCase());
		}
		text('ex-mwan-mode', modeLabel);
		const mwanInterfaces=(data.mwan&&data.mwan.interfaces)||{}, mwanRunning=Object.keys(mwanInterfaces).some(function(k){return !!mwanInterfaces[k].running;});
		const speedify=(this.capabilities.features&&this.capabilities.features.speedify)||{}, paused=String(speedify.desired_state||'')==='connected'&&!mwanRunning;
		const toggle=document.getElementById('ex-mwan-toggle');if(toggle){toggle.checked=mwanRunning;toggle.disabled=paused;}
		text('ex-mwan-toggle-state',paused?'PAUSADO PELO SPEEDIFY':(mwanRunning?'LIGADO':'DESLIGADO'));
		setPill('ex-mwan-status',mwanRunning?'online':(paused?'standby':'offline'),paused?'PAUSADO':(mwanRunning?'ATIVO':'DESLIGADO'));
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
	renderDevices: function(data, rates) {
		const body=document.getElementById('ex-device-body'); if(!body)return;
		const leases=data.leases.dhcp_leases||[], main=assocMap(data.mainAssoc), guest=assocMap(data.guestAssoc), names=friendlyMap(data.names), seen={};
		let lanStatus={};try{lanStatus=JSON.parse((data.lanStatus&&data.lanStatus.stdout)||'{}');}catch(e){}
		const lanPrefix=prefix24(lanStatus.ipaddr), guestPrefix=prefix24(((values(data.networkConfig).guest)||{}).ipaddr), wifiNames=wifiConfig(data.wireless), mainName=wifiNames.main.ssid||'Rede principal', guestName=wifiNames.guest.ssid||'Visitantes';

		const dhcpValues = values(data.dhcpConfig);
		const reservedMap = {};
		Object.keys(dhcpValues).forEach(function(k) {
			const h = dhcpValues[k];
			if (h && h['.type'] === 'host' && h.mac && h.ip) {
				const macs = Array.isArray(h.mac) ? h.mac : String(h.mac).split(/\s+/);
				macs.forEach(function(m) {
					if (m) reservedMap[String(m).toUpperCase()] = h.ip;
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

		const networkLabel=function(mac,ip,hasLease){
			if(guest[mac])return guestName+' / Wi-Fi';
			if(main[mac])return mainName+' / Wi-Fi';
			if(hasLease)return 'Cabo / LAN';
			if(guestPrefix&&String(ip||'').indexOf(guestPrefix)===0)return guestName;
			if(lanPrefix&&String(ip||'').indexOf(lanPrefix)===0)return mainName;
			return mainName;
		};
		const devices=[];
		leases.forEach(function(l) { const mac=String(l.macaddr||'').toUpperCase(); if(!mac||seen[mac])return; seen[mac]=1; const a=main[mac]||guest[mac], isGuest=!!guest[mac]||(guestPrefix&&String(l.ipaddr||'').indexOf(guestPrefix)===0); devices.push({mac:mac,ip:l.ipaddr||'—',name:names[mac]||l.hostname||'Dispositivo sem nome',network:networkLabel(mac,l.ipaddr,true),guest:isGuest,signal:a&&a.signal,rate:rates[mac]||{rx:0,tx:0,totalRx:0,totalTx:0}}); });
		Object.keys(main).concat(Object.keys(guest)).forEach(function(mac) { if(seen[mac])return; seen[mac]=1; const a=main[mac]||guest[mac], isGuest=!!guest[mac]; devices.push({mac:mac,ip:'—',name:names[mac]||'Dispositivo sem nome',network:networkLabel(mac,'',false),guest:isGuest,signal:a.signal,rate:rates[mac]||{rx:0,tx:0,totalRx:0,totalTx:0}}); });
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
			devices.forEach(function(d) {
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
				}
			});
			text('ex-device-count', devices.length + ' conectado' + (devices.length === 1 ? '' : 's'));
			return;
		}

		this.lastDeviceReorderTime = nowTime;
		body.replaceChildren();
		devices.forEach(L.bind(function(d) {
			const reservedIp = reservedMap[d.mac];
			const prioDscp = priorityMap[d.mac];
			const lim = limitsMap[d.mac];
			const badges = [];
			if (reservedIp) {
				badges.push(E('span', { class: 'ex-device-badge badge-reserved', title: 'IP Fixo Reservado no DHCP: ' + reservedIp }, [ '🔒 IP Fixo' ]));
			}
			if (prioDscp === 'EF') {
				badges.push(E('span', { class: 'ex-device-badge badge-gamer', title: 'Fila Gamer / Prioridade Máxima (EF)' }, [ '🎮 Gamer' ]));
			} else if (prioDscp === 'AF41') {
				badges.push(E('span', { class: 'ex-device-badge badge-video', title: 'Fila de Vídeo / Multimídia (AF41)' }, [ '📺 Vídeo' ]));
			}
			if (lim && lim.enabled && (lim.down > 0 || lim.up > 0)) {
				const downStr = lim.down > 0 ? lim.down + 'M↓' : '';
				const upStr = lim.up > 0 ? lim.up + 'M↑' : '';
				const limText = [downStr, upStr].filter(Boolean).join(' / ');
				badges.push(E('span', { class: 'ex-device-badge badge-limited', title: 'Limite de Banda Ativo: ' + limText }, [ '🛑 ' + limText ]));
			}

			const nameRow = E('div', { class: 'ex-device-name-row' }, [
				E('strong', {}, [d.name])
			].concat(badges));

			const metaText = d.ip + ' • ' + d.mac + (reservedIp && reservedIp !== d.ip ? ' (Fixo: ' + reservedIp + ')' : '');
			const totalBytes = (Number(d.rate.totalRx) || 0) + (Number(d.rate.totalTx) || 0);

			const tr=E('tr',{'data-mac':d.mac},[
				E('td',{},[nameRow, E('small',{class:'ex-device-meta'},[metaText])]),
				E('td',{'class':'ex-hide-mobile'},[d.network+(d.signal!=null?' • '+d.signal+' dBm':'')]),
				E('td',{'class':'ex-rate-cell'},[E('span',{class:'down'},['↓ '+formatRate(d.rate.rx)]),E('span',{class:'up'},['↑ '+formatRate(d.rate.tx)])]),
				E('td',{'class':'ex-total-cell ex-hide-mobile',style:'font-weight:600;font-variant-numeric:tabular-nums;'},[totalBytes > 0 ? formatBytes(totalBytes) : '—']),
				E('td',{'class':'ex-device-action'},[E('button',{'class':'ex-mini-button','title':'Configurar dispositivo','click':L.bind(this.configureDevice,this,d)},[
					E('span',{'class':'ex-hide-mobile'},['Configurar']),
					E('span',{'class':'ex-show-mobile'},['⚙️'])
				])])
			]);
			body.appendChild(tr);
		},this));
		text('ex-device-count',devices.length+' conectado'+(devices.length===1?'':'s'));
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
		(data.lanPorts||[]).forEach(L.bind(function(port,idx){this.updateLan('ex-lan-'+portDomId(port),(data.lanDevices||[])[idx]||{});},this));
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
		const sf=this.feature('speedify'), sfTop=document.getElementById('ex-speedify-top');
		if(sfTop){
			const sfRunning=!!(sf.runtime_running || sf.state==='CONNECTED' || sf.state==='CONNECTING' || sf.state==='STARTING' || sf.state==='LOGGED_IN');
			const sfConnected=sf.state==='CONNECTED'||sf.state==='CONNECTING';
			sfTop.style.display=sfRunning?'flex':'none';
			sfTop.className='ex-hero-speedify '+(sfConnected?'online':'standby');
			sfTop.replaceChildren(
				E('span',{},['Speedify']),
				E('strong',{},[sfConnected?'CONECTADO':(sf.state||'INICIANDO')]),
				E('small',{},[speedifyModeLabel(sf.runtime_mode||sf.bonding_mode)+' • IP '+(sf.tunnel_ip||'—')])
			);
		}
		text('ex-lan-ip',lanStatus.ipaddr||'—'); text('ex-lan-dhcp',(lanStatus.dhcp_start&&lanStatus.dhcp_end)?lanStatus.dhcp_start+' → '+lanStatus.dhcp_end:'—'); text('ex-lan-mask',lanStatus.netmask||'—'); text('ex-lan-dns',Array.isArray(lanStatus.dns)&&lanStatus.dns.length?lanStatus.dns.join('  •  '):'Sem DNS fixo');
		const lanPrefix=prefix24(lanStatus.ipaddr), guestPrefix=prefix24(((values(data.networkConfig).guest)||{}).ipaddr);
		const leases=data.leases.dhcp_leases||[], main=assocMap(data.mainAssoc), guest=assocMap(data.guestAssoc); text('ex-main-clients',leases.filter(function(l){return lanPrefix&&String(l.ipaddr||'').indexOf(lanPrefix)===0;}).length); text('ex-main-wifi',Object.keys(main).length+' no Wi-Fi'); text('ex-guest-clients',leases.filter(function(l){return guestPrefix&&String(l.ipaddr||'').indexOf(guestPrefix)===0;}).length); text('ex-guest-wifi',Object.keys(guest).length+' no Wi-Fi');
		const mem=data.system.memory||{}, root=data.system.root||{}, memFree=mem.available||mem.free||0, memUsed=Math.max(0,(mem.total||0)-memFree), rootTotalBytes=(Number(root.total)||0)*1024, rootUsedBytes=(Number(root.used)||0)*1024, mu=mem.total?100*memUsed/mem.total:0, du=root.total?100*root.used/root.total:0, load=data.system.load&&data.system.load[0]!=null?data.system.load[0]/65535:0, temp=parseInt(data.temperature,10)/1000;
		text('ex-uptime',formatUptime(data.system.uptime)); text('ex-temperature',isFinite(temp)?temp.toFixed(0)+' °C':'—'); text('ex-memory',mu.toFixed(0)+'%'); text('ex-memory-detail','livre '+formatBytes(memFree)+' / total '+formatBytes(mem.total||0)); text('ex-load',load.toFixed(2)); text('ex-storage',du.toFixed(0)+'%'); text('ex-storage-detail','livre '+formatBytes(Math.max(0,rootTotalBytes-rootUsedBytes))+' / total '+formatBytes(rootTotalBytes)); const mb=document.getElementById('ex-memory-bar'),db=document.getElementById('ex-storage-bar'); if(mb)mb.style.width=Math.min(100,mu)+'%'; if(db)db.style.width=Math.min(100,du)+'%';
		const healthWarning=(isFinite(temp)&&temp>=85)||mu>=85||du>=85||load>=1.5; setPill('ex-health-status',healthWarning?'standby':'online',healthWarning?'ATENÇÃO':'NORMAL');
		const qosWanProfiles=sqmWanProfiles(data), qe=qosWanProfiles.some(function(profile){return !!(sqm[profile.section]&&sqm[profile.section].enabled==='1');}), qosToggle=document.getElementById('ex-qos-toggle'), qosToggleState=document.getElementById('ex-qos-toggle-state');
		setPill('ex-qos-status',qe?'online':'standby',qe?'ATIVO':'DESLIGADO'); if(qosToggle){qosToggle.checked=qe;qosToggle.disabled=false;} if(qosToggleState)qosToggleState.textContent=qe?'Ligado':'Desligado';
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
				return slDns||(cgnat&&slGw);
			});
			const slPub=(this.capabilities.features&&this.capabilities.features.starlink_public)||{};
			starlinkPanelEl.style.display=(hasStarlink||slPub.enabled)?'':'none';
		}
		this.updateWifi(data); this.updateMwanMode(data); this.updateHistory(data.history); this.renderDevices(data,dr); text('ex-clock',new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
	},
	togglePassword: function(id, button) { const n=document.getElementById(id), hidden=n.dataset.hidden!=='0'; n.dataset.hidden=hidden?'0':'1'; n.style.filter=hidden?'none':'blur(5px)'; button.textContent=hidden?'Ocultar senha':'Ver senha'; },
	configureDevice: function(device) {
		ui.showModal('Configurar dispositivo',[E('p',{class:'ex-muted'},['Carregando configurações…'])]);
		return fs.exec('/usr/sbin/equipe-dashboard-control',['device-status',device.mac]).then(L.bind(function(result){
			if(result.code)throw new Error(result.stderr||'Falha ao consultar o dispositivo');
			let state={};try{state=JSON.parse(result.stdout||'{}');}catch(e){throw new Error('Resposta inválida do roteador');}
			const name=E('input',{class:'cbi-input-text',value:device.name==='Dispositivo sem nome'?'':device.name,placeholder:'Ex.: Celular da Joyce',maxlength:48,style:'width:100%'});
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

			const sections=[
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
			];
			let selectedPriority = !state.priority ? 'none' : (state.dscp === 'AF31' ? 'video' : 'gamer');
			const hasQosFeature = this.feature('sqm').installed || this.feature('custom_qos').installed;
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
				checked: limitEnabled,
				style: 'width: 20px; height: 20px; cursor: pointer;'
			});

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
			upInput.addEventListener('input', updatePresetActive);
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
				limitFieldsRow
			]));

			sections.push(E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = 'Salvando…';
				const prioEnabled = (selectedPriority !== 'none') ? '1' : '0';
				const dscpVal = (selectedPriority === 'video') ? 'AF31' : 'AF41';
				const finalIp = isReserved ? ipInput.value.trim() : (device.ip || state.ip || '');
				const limEnabled = limitToggle.checked ? '1' : '0';
				const limDown = limitToggle.checked ? (Number(downInput.value) || 0) : 0;
				const limUp = limitToggle.checked ? (Number(upInput.value) || 0) : 0;
				const args=['device-save',device.mac,name.value.trim(),isReserved?'reserved':'automatic',finalIp,prioEnabled,dscpVal,selectedWanRoute,limEnabled,String(limDown),String(limUp)];
				return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar');ui.hideModal();ui.addNotification(null,E('p',{},['Configurações do dispositivo salvas.']));return this.fetchData().then(L.bind(this.update,this));},this)).catch(function(e){btn.disabled = false; btn.textContent = 'Salvar configurações'; if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Salvar configurações'])]));
			ui.showModal('Configurar dispositivo',sections);name.focus();
		},this)).catch(function(e){ui.hideModal();ui.addNotification(null,E('p',{},[e.message]),'danger');});
	},
	setMwanMode: function(mode,label) {
		ui.showModal('Alterar o Multi‑WAN',[E('p',{},['Aplicar “'+label+'”? A internet pode pausar por alguns segundos.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
			const btn = ev.currentTarget;
			btn.disabled = true;
			btn.textContent = 'Aplicando…';
			return fs.exec('/usr/sbin/equipe-dashboard-control',['mwan',mode]).then(L.bind(function(r){
				if(r.code)throw new Error(r.stderr||'Falha ao aplicar');
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
		const desired=!!input.checked;input.disabled=true;
		return fs.exec('/usr/sbin/equipe-dashboard-control',['mwan3-toggle',desired?'1':'0']).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao alterar o Multi-WAN');
			ui.addNotification(null,E('p',{},[String(r.stdout||'').trim()==='paused'?'Preferência salva. O Multi-WAN continuará pausado enquanto o Speedify estiver ativo.':(desired?'Multi-WAN ativado.':'Multi-WAN desativado.')]));
			return this.fetchData().then(L.bind(this.update,this));
		},this)).catch(function(e){input.checked=!desired;ui.addNotification(null,E('p',{},[e.message]),'danger');}).finally(function(){input.disabled=false;});
	},
	toggleSqm: function(input){
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
				return Promise.all(actions).then(function(r){
					const res = r[0] || {};
					if(res.code) throw new Error(res.stderr || 'Falha ao alterar o SQM');
					ui.hideModal();
					const msg = desired ? 'SQM ativado. Recarregando…' : (isGamerActive ? 'SQM desativado. Modo Gamer desligado e perfil retornado ao Modo Padrão.' : 'SQM desativado. Recarregando…');
					reloadSoon(msg, 2000);
				}).catch(function(e){
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
		const data=this.currentData||{}, sqm=values(data.sqm), qosValues=values(data.qos), qos=qosValues.main||{}, qosGuest=qosValues.guest||{};
		const field=function(label,value,hint){const node=E('input',{type:'number',class:'cbi-input-text',min:0,max:100000,step:'0.1',value:kbpsToMbpsInput(value)});return {node:node,row:E('label',{class:'ex-qos-edit-field'},[E('span',{},[label+' (Mbps)']),node,E('small',{class:'ex-muted'},[hint||'Mbps • 0 = ilimitado / sem limite'])])};};
		const profiles=sqmWanProfiles(data);if(!profiles.length)throw new Error('Nenhuma interface configurada como WAN foi encontrada.');
		const guestDownloadLimit=qosGuest.download_kbps||qos.guest_download_kbps||0, guestUploadLimit=qosGuest.upload_kbps||qos.guest_upload_kbps||0;
		const editors=profiles.map(function(profile){const queue=sqm[profile.section]||{},enabled=E('input',{type:'checkbox'}),download=field(profile.label+' download',queue.download),upload=field(profile.label+' upload',queue.upload);enabled.checked=queue.enabled==='1';return {profile:profile,enabled:enabled,download:download,upload:upload,section:E('section',{},[E('h3',{},[profile.label]),E('small',{class:'ex-muted'},['Interface '+profile.network+' • dispositivo '+profile.device+(profile.online?' • online':' • sem link')]),E('label',{class:'ex-qos-edit-toggle'},[enabled,E('span',{},['Ativar fila '+profile.label])]),download.row,upload.row])};});
		const guestDown=field('Visitantes download total',guestDownloadLimit,'Mbps • 0 = ilimitado'), guestUp=field('Visitantes upload total',guestUploadLimit,'Mbps • exemplo: 1,5 • 0 = ilimitado');
		ui.showModal('Editar SQM / CAKE',[
			E('div',{style:'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:12px;'},[
				E('p',{class:'ex-muted',style:'margin:0;'},['Defina os limites em Mbps. Exemplo: 1,2 Gbps = 1200 Mbps. Use 0 quando não quiser limitar aquela direção.']),
				E('button',{class:'ex-mini-button','click':L.bind(function(){ui.hideModal();this.openFastCom();},this)},['🎬 Medir no Fast.com'])
			]),
			E('div',{class:'ex-qos-edit-grid'},editors.map(function(editor){return editor.section;}).concat([E('section',{},[E('h3',{},['Visitantes']),guestDown.row,guestUp.row])])),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
			const btn = ev.currentTarget;
			const args=['sqm-save-v2'];let invalid=false;editors.forEach(function(editor){const profile=editor.profile,download=mbpsToKbps(editor.download.node.value),upload=mbpsToKbps(editor.upload.node.value);if(download==null||upload==null)invalid=true;args.push('wan='+[profile.section,profile.network,profile.device,editor.enabled.checked?'1':'0',download,upload].join('|'));});const guestDownload=mbpsToKbps(guestDown.node.value),guestUpload=mbpsToKbps(guestUp.node.value);
			if(invalid||guestDownload==null||guestUpload==null){ui.addNotification(null,E('p',{},['Informe velocidades válidas em Mbps.']),'danger');return;}
			btn.disabled = true;
			btn.textContent = 'Salvando SQM…';
			args.push('guest_download='+guestDownload,'guest_upload='+guestUpload);
			return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){
				if(r.code)throw new Error(r.stderr||'Falha ao salvar limites');
				ui.hideModal();
				reloadSoon('Limites das WANs salvos. Recarregando…',2000);
			}).catch(function(e){
				btn.disabled = false;
				btn.textContent = 'Salvar e reiniciar SQM';
				if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
				ui.addNotification(null,E('p',{},[e.message]),'danger');
			});
		},this)},['Salvar e reiniciar SQM'])])]);
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
					const optLabel = p.name + ' (' + (p.username || 'sem usuário') + (p.macaddr ? ' • MAC ' + p.macaddr : '') + ')';
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
					deleteProfileBtn.disabled = false;
					profileStatus.textContent = '✓ ' + found.name + ' aplicado';
					profileStatus.style.display = 'inline-block';
				} else {
					deleteProfileBtn.disabled = true;
					profileStatus.style.display = 'none';
				}
			});

			const saveProfileBtn = E('button', {
				type: 'button',
				class: 'ex-mini-button',
				click: function(){
					const u = username.value.trim();
					const p = password.value;
					const m = macaddr.value.trim();
					if (!u) {
						ui.addNotification(null, E('p', {}, ['Preencha ao menos o Usuário PPPoE antes de salvar o perfil.']), 'warning');
						return;
					}
					const profName = window.prompt('Nome para este perfil PPPoE (ex: Fibra Vivo, Fibra Claro, Provedor X):', u.split('@')[0] || 'Novo Perfil');
					if (!profName || !profName.trim()) return;
					saveProfileBtn.disabled = true;
					saveProfileBtn.textContent = 'Salvando…';
					fs.exec('/usr/sbin/equipe-dashboard-control', [
						'pppoe-profile-save',
						'name=' + profName.trim(),
						'username=' + u,
						'password=' + p,
						'macaddr=' + m
					]).then(function(r){
						if (r.code) throw new Error(r.stderr || 'Falha ao salvar perfil');
						let data = {}; try { data = JSON.parse(r.stdout || '{}'); } catch(e) {}
						savedProfiles = data.profiles || [];
						const newly = savedProfiles.find(function(item){ return item.name === profName.trim(); });
						renderProfileOptions(newly ? newly.id : '');
						profileStatus.textContent = '✓ ' + profName.trim() + ' salvo';
						profileStatus.style.display = 'inline-block';
						ui.addNotification(null, E('p', {}, ['Perfil PPPoE "' + profName.trim() + '" salvo com sucesso!']));
					}).catch(function(e){
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					}).finally(function(){
						saveProfileBtn.disabled = false;
						saveProfileBtn.textContent = '💾 Salvar perfil';
					});
				}
			}, ['💾 Salvar perfil']);

			const pppoeProfileBar = E('div', { class: 'ex-pppoe-profile-bar', style: 'grid-column: 1 / -1; margin-bottom: 8px; padding: 10px; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2); border-radius: 8px;' }, [
				E('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;' }, [
					E('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
						E('strong', { style: 'font-size:0.85rem;' }, ['🏷️ Perfis PPPoE Salvos']),
						profileStatus
					]),
					E('div', { style: 'display:flex; gap:6px;' }, [
						saveProfileBtn,
						deleteProfileBtn
					])
				]),
				E('div', { style: 'display:flex; gap:8px; align-items:center;' }, [
					pppoeProfileSelect
				]),
				E('small', { class: 'ex-muted', style: 'margin-top:4px; display:block;' }, ['Salva e preenche Usuário, Senha e MAC Clonado em 1 clique para qualquer WAN.'])
			]);

			const field=function(label,node,hint,extraClass){return E('label',{class:'ex-wan-edit-field'+(extraClass?(' '+extraClass):'')},[E('span',{},[label]),node,hint?E('small',{class:'ex-muted'},[hint]):'']);};
			const pppoeBlock=E('div',{class:'ex-wan-proto-block'},[pppoeProfileBar,field('Usuário PPPoE',username),field('Senha PPPoE',passWrap,'Deixe vazio para manter/definir vazia conforme operadora','ex-wan-field-wide')]);
			const staticBlock=E('div',{class:'ex-wan-proto-block'},[field('IPv4',ipaddr),field('Máscara',netmask),field('Gateway',gateway)]);
			const sync=function(){const lanMode=!isPrimary&&role.value==='lan';proto.disabled=lanMode;pppoeBlock.style.display=(!lanMode&&proto.value==='pppoe')?'contents':'none';staticBlock.style.display=(!lanMode&&proto.value==='static')?'contents':'none';};
			role.addEventListener('change',sync);proto.addEventListener('change',sync);sync();
			const optButton = E('div', { style: 'grid-column: 1 / -1; margin-top: 6px; padding-top: 10px; border-top: 1px solid rgba(127,127,127,.15);' }, [
				E('button', {
					class: 'ex-mini-button',
					type: 'button',
					style: 'width:100%;justify-content:center;font-weight:700;padding:8px;',
					click: L.bind(function() {
						closeModal();
						this.showWanOptimizationsModal(which);
					}, this)
				}, ['⚡ Aceleração de Internet, XPON & Perfis WAN →'])
			]);
			const modalTitle = (preferredDevice && (!cfg.proto || cfg.proto === 'none')) ? ('Configurar ' + chosenPortLabel + ' como ' + whichLabel) : ('Editar ' + whichLabel + ' (' + chosenPortLabel + ')');
			ui.showModal(modalTitle,[
				E('p',{class:'alert-message warning'},['Alterar internet/porta pode derrubar o painel por alguns segundos. O ARK cria um backup antes de aplicar.']),
				E('div',{class:'ex-wan-edit-grid'},[field('Função',role),field('Porta física',device,'Porta vinculada ao card selecionado'),field('Tipo de conexão',proto),pppoeBlock,staticBlock,field('DNS 1',dns1),field('DNS 2',dns2),field('DNS 3',dns3,'Opcional'),field('Clonar MAC da WAN',E('div',{class:'ex-wan-mac-control'},[macaddr,macClear]),clonedMac?'MAC clonado atual. Apague para voltar ao físico.':'Sem clone: usa o MAC físico da porta.','ex-wan-field-wide'),optButton]),
				E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){const dns=[dns1.value.trim(),dns2.value.trim(),dns3.value.trim()].filter(Boolean).join(' '), args=['wan-save','iface='+which,'mode='+role.value,'device='+device.value,'proto='+proto.value,'username='+username.value,'password='+password.value,'ipaddr='+ipaddr.value,'netmask='+netmask.value,'gateway='+gateway.value,'dns='+dns,'macaddr='+macaddr.value.trim()];return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar WAN');ui.hideModal();reloadSoon('Configuração de internet salva. Recarregando após estabilizar a rede…',3500);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Confirmar alteração'])])
			]);
		}, this));
	},
	showWanOptimizationsModal: function(iface) {
		iface = /^wan([0-9]+)?$/.test(String(iface || '')) ? String(iface) : 'wan';
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

			const presets = [
				{ id: 'auto', label: '✨ Automático', tag: 'RECOMENDADO', desc: 'Detecta o protocolo e aplica somente os ajustes compatíveis com esta WAN.' },
				{ id: 'xpon_bridge', label: '⚡ Fibra PPPoE', tag: 'BRIDGE / XPON', desc: 'PPPoE sem VLAN • overhead 28 B • MTU 1500 quando suportado.', ll: 'pppoe_28', jumbo: true },
				{ id: 'xpon_vlan', label: '🏷️ Fibra PPPoE + VLAN', tag: 'VLAN DA OPERADORA', desc: 'PPPoE encapsulado em VLAN • overhead 34 B • MTU 1500.', ll: 'vlan_34', jumbo: true },
				{ id: 'dhcp_cable', label: '🌐 Fibra/Modem DHCP', tag: 'DHCP / IPOE', desc: 'Internet entregue automaticamente, sem overhead PPPoE.', ll: 'none', jumbo: false },
				{ id: 'mobile_starlink', label: '📡 Starlink / Link móvel', tag: 'SATÉLITE / 4G / 5G', desc: 'Sem overhead fixo; preserva ajustes adequados a links variáveis.', ll: 'none', jumbo: false },
				{ id: 'dedicated_static', label: '🚀 IP fixo / link dedicado', tag: 'ESTÁTICO / ALTA BANDA', desc: 'IP estático ou link dedicado, sem impor overhead PPPoE.', ll: 'none', jumbo: false },
				{ id: 'custom', label: '🛠️ Personalizado', tag: 'AVANÇADO', desc: 'Mantém os valores escolhidos manualmente para esta WAN.' }
			];
			const profileById = function(id) { return presets.find(function(p) { return p.id === id; }) || presets[0]; };
			const effectiveProfile = function() { return selectedPreset === 'auto' ? profileById(opt.detected_profile) : profileById(selectedPreset); };

			const chips = [
				{ id: 'none', label: '⚪ Padrão / DHCP (0B)' },
				{ id: 'pppoe_28', label: '⚡ XPON PPPoE (28B)' },
				{ id: 'vlan_34', label: '🏷️ XPON c/ VLAN (34B)' },
				{ id: 'vdsl_44', label: '☎️ VDSL2 / DSL (44B)' }
			];

			const presetBtns = [];
			const chipBtns = [];

			const tcpInput = E('input', { type: 'checkbox' });
			const flowInput = E('input', { type: 'checkbox' });
			const jumboInput = E('input', { type: 'checkbox' });
			const irqInput = E('input', { type: 'checkbox' });
			const enableSqmInput = E('input', { type: 'checkbox', checked: true });
			const sqmDependency = E('div', { class: 'ex-opt-sqm-dependency' });
			const selectedSummary = E('div', { class: 'ex-opt-selected-summary' });
			const globalWarning = E('small', { class: 'ex-muted' });
			let saveButton = null;

			const updateSqmDependency = function() {
				const required = linklayerProfile !== 'none';
				sqmDependency.style.display = required ? 'flex' : 'none';
				sqmDependency.className = 'ex-opt-sqm-dependency' + (sqmActive ? ' active' : (!sqmInstalled ? ' missing' : ' warning'));
				while (sqmDependency.firstChild) sqmDependency.removeChild(sqmDependency.firstChild);
				if (!required) {
					if (saveButton) saveButton.textContent = 'Aplicar perfil nesta WAN';
					return;
				}
				if (sqmActive) {
					sqmDependency.appendChild(E('div', {}, [E('strong', {}, ['✅ SQM / CAKE ativo em ' + opt.label]), E('p', {}, ['O overhead será alterado somente na fila ' + (opt.sqm_section || opt.label) + '.'])]));
					if (saveButton) saveButton.textContent = 'Aplicar perfil em ' + opt.label;
				} else if (sqmInstalled) {
					sqmDependency.appendChild(E('div', {}, [E('strong', {}, ['💡 Este perfil utiliza SQM / CAKE']), E('p', {}, ['A fila será ativada somente para ' + opt.label + '. As outras WANs não serão modificadas.'])]));
					sqmDependency.appendChild(E('label', { class: 'ex-opt-sqm-enable' }, [enableSqmInput, E('span', {}, ['Ativar CAKE em ' + opt.label]) ]));
					if (saveButton) saveButton.textContent = enableSqmInput.checked ? 'Ativar CAKE e aplicar tudo' : 'Salvar perfil para depois';
				} else {
					sqmDependency.appendChild(E('div', {}, [E('strong', {}, ['⚠️ SQM / CAKE ainda não está instalado']), E('p', {}, ['Instale o módulo para ativar filas, limites, prioridades e o perfil de overhead.'])]));
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
				irqInput.checked = irqBalance;
				irqInput.disabled = !opt.irqbalance_installed;
				flowInput.disabled = sqmAnyActive && !flowOffload;
				const effective = effectiveProfile();
				while (selectedSummary.firstChild) selectedSummary.removeChild(selectedSummary.firstChild);
				selectedSummary.appendChild(E('strong', {}, [(selectedPreset === 'auto' ? 'Automático → ' : '') + effective.label]));
				selectedSummary.appendChild(E('span', {}, [opt.label + ': overhead ' + (linklayerProfile === 'none' ? 'padrão' : linklayerProfile.replace('_', ' ')) + ' • MTU físico ' + (babyJumbo ? '1508' : '1500')]));
				globalWarning.textContent = sqmAnyActive ? 'Fastpath fica bloqueado enquanto qualquer fila SQM/CAKE estiver ativa, evitando que o tráfego contorne o controle de filas.' : 'Estas opções são globais e afetam todas as WANs do roteador.';
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

			const presetGrid = E('div', { class: 'ex-opt-preset-grid' });
			presets.forEach(function(p) {
				const b = E('button', {
					type: 'button',
					class: 'ex-opt-preset-btn',
					click: function() { applyPreset(p.id); }
				}, [
					E('span', { class: 'ex-opt-preset-tag' }, [p.tag]),
					E('strong', {}, [p.label]),
					E('small', {}, [p.desc])
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
			enableSqmInput.addEventListener('change', updateSqmDependency);
			applyPreset(selectedPreset);

			const protoNames = { pppoe: 'PPPoE', dhcp: 'DHCP automático', static: 'IP estático' };
			const speedText = Number(opt.link_speed_mbps || 0) > 0 ? (Number(opt.link_speed_mbps) + ' Mbps' + (opt.duplex ? ' • ' + opt.duplex : '')) : 'velocidade física não informada';
			const detected = profileById(opt.detected_profile);

			const content = [
				E('div', { class: 'ex-opt-detected' }, [
					E('div', {}, [E('span', { class: 'ex-kicker' }, ['CONEXÃO DETECTADA']), E('strong', {}, [(protoNames[opt.proto] || String(opt.proto || '').toUpperCase()) + ' em ' + (opt.wan_dev || opt.label)]), E('small', { class: 'ex-muted' }, [speedText + (opt.starlink ? ' • telemetria Starlink confirmada' : '')])]),
					E('span', { class: 'ex-pill online' }, ['SUGESTÃO: ' + detected.label.replace(/^[^A-Za-zÀ-ÿ]+/, '')])
				]),
				E('div', { class: 'ex-opt-section' }, [
					E('div', { class: 'ex-opt-section-head' }, [
						E('h4', {}, ['1. PERFIL DE ' + opt.label])
					]),
					presetGrid,
					selectedSummary,
					E('details', { class: 'ex-opt-advanced' }, [
						E('summary', {}, ['Ver configurações avançadas desta WAN']),
						E('p', { class: 'ex-muted' }, ['Ajustes abaixo afetam somente ' + opt.label + '.']),
						E('strong', {}, ['Perfil de overhead no SQM / CAKE']), chipGrid,
						E('div', { class: 'ex-opt-module-card' }, [E('div', { class: 'ex-opt-module-info' }, [E('strong', {}, ['Baby Jumbo / PPPoE MTU 1500']), E('p', {}, ['Usa MTU 1508 na porta física desta WAN para tentar transportar MTU 1500 no PPPoE.'])]), E('label', { class: 'ex-switch' }, [jumboInput, E('span', { class: 'ex-switch-slider' })])]),
						sqmDependency
					])
				]),
				E('div', { class: 'ex-opt-section' }, [
					E('div', { class: 'ex-opt-section-head' }, [
						E('h4', {}, ['2. OTIMIZAÇÃO GERAL DO ROTEADOR']), E('span', { class: 'ex-pill standby' }, ['TODAS AS WANs'])
					]),
					globalWarning,
					E('div', { class: 'ex-opt-module-grid' }, [
						E('div', { class: 'ex-opt-module-card' }, [
							E('div', { class: 'ex-opt-module-info' }, [
								E('strong', {}, ['🧠 Buffers TCP Turbo (BDP 8 MB)']),
								E('p', {}, ['Aumenta rmem/wmem para 8 MB e backlog para 5000. Mantém velocidade máxima contínua em downloads pesados (Steam, torrents, streams 4K).'])
							]),
							E('label', { class: 'ex-switch' }, [ tcpInput, E('span', { class: 'ex-switch-slider' }) ])
						]),
						E('div', { class: 'ex-opt-module-card' }, [
							E('div', { class: 'ex-opt-module-info' }, [
								E('strong', {}, ['🚀 Software Flow Offloading (Fastpath)']),
								E('p', {}, ['Aceleração de roteamento direto na tabela de fluxos do kernel. Recomendado para links acima de 1 Gbps (reduz uso de CPU).']),
								E('small', { class: 'ex-opt-requirement' + (sqmAnyActive ? ' blocked' : ' ready') }, [sqmAnyActive ? '⚠ Requer SQM / CAKE desligado em todas as WANs.' : '✓ SQM / CAKE desligado: Fastpath pode ser ativado.'])
							]),
							E('label', { class: 'ex-switch' }, [ flowInput, E('span', { class: 'ex-switch-slider' }) ])
						]),
						E('div', { class: 'ex-opt-module-card' }, [
							E('div', { class: 'ex-opt-module-info' }, [E('strong', {}, ['⚙️ IRQ Balance']), E('p', {}, [opt.irqbalance_installed ? 'Distribui interrupções de rede entre os núcleos disponíveis.' : 'Módulo não instalado neste roteador.'])]),
							E('label', { class: 'ex-switch' }, [irqInput, E('span', { class: 'ex-switch-slider' })])
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
						const activateSqm = requiresSqm && !sqmActive && enableSqmInput.checked;
						if (flowOffload && sqmAnyActive) { ui.addNotification(null, E('p', {}, ['Desative as filas SQM / CAKE antes de ligar o Fastpath.']), 'danger'); return; }
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
						return fs.exec('/usr/sbin/equipe-dashboard-control', args).then(function(res) {
							if (res.code) throw new Error(res.stderr || 'Falha ao aplicar otimizações');
							ui.hideModal();
							reloadSoon(activateSqm ? 'SQM / CAKE ativado e otimizações aplicadas. Recarregando…' : 'Otimizações de internet aplicadas com sucesso. Recarregando…', 2200);
						}).catch(function(err) {
							btn.disabled = false;
							btn.textContent = 'Aplicar perfil nesta WAN';
							if (reloadAfterExpectedDisconnect(err, 'Otimizações enviadas. O roteador está reiniciando serviços…', 4200)) return;
							ui.addNotification(null, E('p', {}, [err.message]), 'danger');
						});
					}, this) }, ['Salvar e aplicar']))
				])
			];
			updateSqmDependency();

			ui.showModal('Otimizar ' + opt.label + ' — ' + (protoNames[opt.proto] || String(opt.proto || '').toUpperCase()), content);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', {}, ['Falha ao carregar estado: ' + e.message]), 'danger');
		});
	},
	editLan: function(){
		let state={};try{state=JSON.parse(((this.currentData||{}).lanStatus&&this.currentData.lanStatus.stdout)||'{}');}catch(e){}
		const makeSelect=function(value,items){const s=E('select',{class:'cbi-input-select'},items.map(function(i){return E('option',{value:i[0]},[i[1]]);}));s.value=value;return s;};
		const mode=makeSelect(state.preset==='10'?'preset10':(state.preset==='192'?'preset192':'manual'),[['preset192','Padrão 192.168.x.x'],['preset10','Padrão 10.0.x.x'],['manual','Informar manualmente']]);
		const routerIp=E('input',{class:'cbi-input-text',value:state.ipaddr||'192.168.1.1',placeholder:'192.168.1.1',inputmode:'decimal'});
		const netmask=E('input',{class:'cbi-input-text',value:state.netmask||'255.255.255.0',placeholder:'255.255.255.0',inputmode:'decimal'});
		const dhcpStart=E('input',{class:'cbi-input-text',value:state.dhcp_start||'192.168.1.100',placeholder:'192.168.1.100',inputmode:'decimal'});
		const dhcpEnd=E('input',{class:'cbi-input-text',value:state.dhcp_end||'192.168.1.249',placeholder:'192.168.1.249',inputmode:'decimal'});
		const dnsList=Array.isArray(state.dns)?state.dns:String(state.dns||'').split(/\s+/).filter(Boolean);
		const dns1=E('input',{class:'cbi-input-text',value:dnsList[0]||'1.1.1.1',placeholder:'1.1.1.1',inputmode:'decimal'});
		const dns2=E('input',{class:'cbi-input-text',value:dnsList[1]||'8.8.8.8',placeholder:'8.8.8.8',inputmode:'decimal'});
		const dns3=E('input',{class:'cbi-input-text',value:dnsList[2]||'9.9.9.9',placeholder:'9.9.9.9',inputmode:'decimal'});
		const field=function(label,node,hint){return E('label',{class:'ex-wan-edit-field'},[E('span',{},[label]),node,hint?E('small',{class:'ex-muted'},[hint]):'']);};
		let dhcpTouched=false;
		const suggestDhcp=function(force){
			const start=dhcpStartSuggestion(routerIp.value), end=dhcpEndSuggestion(routerIp.value);
			if(!start||!end)return;
			if(force||!dhcpTouched){dhcpStart.value=start;dhcpEnd.value=end;}
			dhcpStart.placeholder=start;dhcpEnd.placeholder=end;
		};
		const applyPreset=function(changed){
			if(changed&&mode.value==='preset192'){routerIp.value='192.168.1.1';netmask.value='255.255.255.0';dhcpStart.value='192.168.1.10';dhcpEnd.value='192.168.1.254';dhcpTouched=false;}
			else if(changed&&mode.value==='preset10'){routerIp.value='10.0.0.1';netmask.value='255.255.255.0';dhcpStart.value='10.0.0.10';dhcpEnd.value='10.0.0.254';dhcpTouched=false;}
			const manual=mode.value==='manual';routerIp.disabled=netmask.disabled=dhcpStart.disabled=dhcpEnd.disabled=!manual;
			if(manual)suggestDhcp(false);else suggestDhcp(changed);
		};
		dhcpStart.addEventListener('input',function(){dhcpTouched=true;});
		dhcpEnd.addEventListener('input',function(){dhcpTouched=true;});
		routerIp.addEventListener('input',function(){if(mode.value==='manual')suggestDhcp(false);});
		routerIp.addEventListener('blur',function(){if(mode.value==='manual')suggestDhcp(false);});
		mode.addEventListener('change',function(){applyPreset(true);});applyPreset(false);
		ui.showModal('Editar rede principal / DHCP',[
			E('p',{class:'alert-message warning'},['Alterar o IP principal muda o endereço de acesso do painel e pode desconectar dispositivos. O ARK cria um backup em /tmp antes de aplicar.']),
			E('div',{class:'ex-wan-edit-grid'},[field('Modelo de rede',mode),field('IP do roteador',routerIp,'Endereço usado para abrir o painel'),field('Máscara',netmask,'Nesta versão, use /24: 255.255.255.0'),field('DHCP começa em',dhcpStart),field('DHCP termina em',dhcpEnd),field('DNS enviado 1',dns1),field('DNS enviado 2',dns2),field('DNS enviado 3',dns3,'Opcional. Apague os três para não enviar DNS fixo.')]),
			E('p',{class:'ex-muted'},['Exemplo: roteador 192.168.25.1 sugere automaticamente DHCP 192.168.25.10 até 192.168.25.254. Depois você pode ajustar só o final. O DHCP não pode incluir o IP do roteador. DNS preenchido será enviado aos aparelhos via DHCP.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				const dns=[dns1.value.trim(),dns2.value.trim(),dns3.value.trim()].filter(Boolean);
				const next={mode:mode.value,routerIp:routerIp.value.trim(),netmask:netmask.value.trim(),startIp:dhcpStart.value.trim(),endIp:dhcpEnd.value.trim(),dns:dns,oldIp:state.ipaddr||''};
				ui.showModal('Confirmar alteração da LAN',[E('p',{class:'alert-message warning'},['Essa alteração reinicia a rede/portas LAN e DHCP. O painel pode cair por alguns segundos e os dispositivos podem precisar renovar IP.']),E('div',{class:'ex-qos-edit-grid'},[E('section',{},[E('h3',{},['Novo acesso']),E('p',{},['Roteador: ',E('strong',{},[next.routerIp])]),E('p',{},['Máscara: ',E('strong',{},[next.netmask])])]),E('section',{},[E('h3',{},['Nova faixa DHCP']),E('p',{},[next.startIp,' → ',next.endIp])]),E('section',{},[E('h3',{},['DNS via DHCP']),E('p',{},[next.dns.length?next.dns.join(' • '):'Sem DNS fixo'])])]),E('p',{class:'ex-muted'},['O ARK cria backup em /tmp antes de aplicar. Se o IP principal mudar, tentarei abrir automaticamente o painel no novo endereço.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Voltar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
					const args=['lan-save','mode='+next.mode,'router_ip='+next.routerIp,'netmask='+next.netmask,'start_ip='+next.startIp,'end_ip='+next.endIp,'dns='+next.dns.join(' ')];
					return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar LAN');let out={};try{out=JSON.parse(r.stdout||'{}');}catch(e){}ui.hideModal();if((out.new_ip||next.routerIp)!==(out.old_ip||next.oldIp))redirectToRouter(out.new_ip||next.routerIp,'LAN salva. Tentando abrir o painel no novo IP '+(out.new_ip||next.routerIp)+'…',2600);else reloadSoon('Faixa DHCP salva. Recarregando o painel…',2200);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
				},this)},['Aplicar agora'])])]);
			},this)},['Continuar'])])
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
			E('option', { value: 'sae-mixed' }, ['WPA2 / WPA3 Misto (Recomendado — Seguro e compatível)']),
			E('option', { value: 'psk2' }, ['WPA2-PSK (AES — Padrão mais compatível)']),
			E('option', { value: 'sae' }, ['WPA3-SAE Puro (Máxima segurança moderna)']),
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
		const bandSelect = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'both' }, ['Unificada (2.4 GHz + 5 GHz com mesmo nome)']),
			E('option', { value: '2g' }, ['Apenas 2.4 GHz']),
			E('option', { value: '5g' }, ['Apenas 5 GHz'])
		]);

		const passRow1 = E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Senha']), password ]);
		const passRow2 = E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Confirmar senha']), passwordConfirm ]);
		const showRow = E('label', { class: 'ex-show-password' }, [ show, E('span', {}, ['Mostrar senha digitada']) ]);

		const updateEncVisibility = function() {
			const isNone = encSelect.value === 'none';
			passRow1.style.display = isNone ? 'none' : 'block';
			passRow2.style.display = isNone ? 'none' : 'block';
			showRow.style.display = isNone ? 'none' : 'flex';
		};
		encSelect.addEventListener('change', updateEncVisibility);
		updateEncVisibility();

		const rows = [
			E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Nome da nova rede Wi‑Fi (SSID)']), ssid ]),
			E('label', { class: 'ex-device-config-block' }, [ E('strong', {}, ['Segurança / Criptografia']), encSelect ]),
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
						reloadSoon('Nova rede Wi-Fi criada. Reiniciando o rádio…', 4500);
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
	editWifiNetwork: function(kind, current) {
		current=current||{};
		const isGuest=kind==='guest', enabled=E('input', { type:'checkbox' });
		enabled.checked=String(current.disabled||'0')!=='1';
		const split=E('input',{type:'checkbox'});
		split.checked=!!current.split;
		const curEnc=current.encryption||'sae-mixed';
		const encSelect = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'sae-mixed' }, ['WPA2 / WPA3 Misto (Recomendado — Seguro e compatível)']),
			E('option', { value: 'psk2' }, ['WPA2-PSK (AES — Padrão mais compatível)']),
			E('option', { value: 'sae' }, ['WPA3-SAE Puro (Máxima segurança moderna)']),
			E('option', { value: 'none' }, ['Sem Senha (Rede Aberta)'])
		]);
		encSelect.value = curEnc;
		const ssid=E('input',{class:'cbi-input-text',value:current.ssid||'',placeholder:isGuest?'Visitantes':'Rede principal',maxlength:32,style:'width:100%'});
		const ssid2=E('input',{class:'cbi-input-text',value:current.ssid2||current.ssid||'',placeholder:isGuest?'Visitantes-2G':'Rede-2G',maxlength:32,style:'width:100%'});
		const ssid5=E('input',{class:'cbi-input-text',value:current.ssid5||current.ssid||'',placeholder:isGuest?'Visitantes-5G':'Rede-5G',maxlength:32,style:'width:100%'});
		const password=E('input',{type:'password',class:'cbi-input-text',value:'',placeholder:'deixe vazio para manter a senha atual',maxlength:63,autocomplete:'new-password',style:'width:100%'});
		const password2=E('input',{type:'password',class:'cbi-input-text',value:'',placeholder:'repita a nova senha se preencher',maxlength:63,autocomplete:'new-password',style:'width:100%'});
		const show=E('input',{type:'checkbox'});
		show.addEventListener('change',function(){password.type=password2.type=show.checked?'text':'password';});
		const unifiedRow=E('label',{class:'ex-device-config-block'},[E('strong',{},['Nome da rede Wi‑Fi']),ssid,E('small',{class:'ex-muted'},['Aplicado ao 2,4 GHz e ao 5 GHz.'])]);
		const splitRows=E('div',{},[E('label',{class:'ex-device-config-block'},[E('strong',{},['Nome 2,4 GHz']),ssid2]),E('label',{class:'ex-device-config-block'},[E('strong',{},['Nome 5 GHz']),ssid5])]);
		const updateSplit=function(){unifiedRow.style.display=split.checked?'none':'block';splitRows.style.display=split.checked?'block':'none';};
		split.addEventListener('change',function(){if(split.checked){ssid2.value=ssid2.value||ssid.value;ssid5.value=ssid5.value||ssid.value;}else{ssid.value=ssid.value||ssid2.value||ssid5.value;}updateSplit();});
		updateSplit();

		const passRow1 = E('label',{class:'ex-device-config-block'},[E('strong',{},['Nova senha']),password,E('small',{class:'ex-muted'},['Opcional. Se preencher, use entre 8 e 63 caracteres.'])]);
		const passRow2 = E('label',{class:'ex-device-config-block'},[E('strong',{},['Confirmar nova senha']),password2]);
		const showRow = E('label',{class:'ex-show-password'},[show,E('span',{},['Mostrar senha digitada'])]);

		const updateEncVisibility = function() {
			const isNone = encSelect.value === 'none';
			passRow1.style.display = isNone ? 'none' : 'block';
			passRow2.style.display = isNone ? 'none' : 'block';
			showRow.style.display = isNone ? 'none' : 'flex';
		};
		encSelect.addEventListener('change', updateEncVisibility);
		updateEncVisibility();

		const rows=[
			E('label',{class:'ex-device-config-block'},[E('strong',{},['Segurança / Criptografia']),encSelect]),
			E('label',{class:'ex-show-password'},[split,E('span',{},['Separar nomes 2,4 GHz e 5 GHz'])]),
			unifiedRow,
			splitRows
		];
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
					reloadSoon('Rede Wi‑Fi excluída com sucesso. Recarregando…', 2000);
				}, this)).catch(function(e) {
					btn.disabled = false;
					btnDeleteCancel.disabled = false;
					btn.textContent = 'Sim, excluir permanentemente';
					if (reloadAfterExpectedDisconnect(e, 'Rede Wi‑Fi excluída. O rádio está reiniciando…', 4500)) return;
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
			const name=ssid.value.trim(), name2=ssid2.value.trim(), name5=ssid5.value.trim(), pass=password.value, isSplit=split.checked, enc=encSelect.value;
			if((!isSplit&&(!name||name.length>32))||(isSplit&&(!name2||name2.length>32||!name5||name5.length>32))){ui.addNotification(null,E('p',{},['O nome da rede precisa ter entre 1 e 32 caracteres.']),'danger');return;}
			if(enc !== 'none' && (pass||password2.value)){
				if(pass.length<8||pass.length>63){ui.addNotification(null,E('p',{},['A senha precisa ter entre 8 e 63 caracteres.']),'danger');return;}
				if(pass!==password2.value){ui.addNotification(null,E('p',{},['As duas senhas digitadas não são iguais.']),'danger');return;}
			}
			btn.disabled = true;
			btn.textContent = 'Salvando Wi‑Fi…';
			const args=['wifi-settings',kind,'split='+(isSplit?'1':'0'),'ssid='+name,'ssid2='+name2,'ssid5='+name5,'encryption='+enc,'enabled='+(isGuest?(enabled.checked?'1':'0'):'keep')];
			if(pass)args.push('password='+pass);
			if(isGuest&&guestDownInput&&guestUpInput){
				const gDown=mbpsToKbps(guestDownInput.value)||'0', gUp=mbpsToKbps(guestUpInput.value)||'0';
				args.push('guest_download='+gDown, 'guest_upload='+gUp);
			}
			return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar Wi‑Fi');ui.hideModal();reloadSoon('Configuração do Wi‑Fi salva. Recarregando após reiniciar o rádio…',4500);}).catch(function(e){btn.disabled = false; btn.textContent = 'Salvar Wi‑Fi'; const msg=String(e&&e.message||e||'');if(reloadAfterExpectedDisconnect(msg,'Wi‑Fi reiniciando. Se a alteração foi aplicada, reconecte na rede nova e recarregue o painel…',5200))return;ui.addNotification(null,E('p',{},[msg]),'danger');});
		},this)},['Salvar Wi‑Fi'])]));
		ui.showModal((isGuest?'Editar rede visitante':'Editar rede principal'),rows);
		ssid.focus();
		if(isGuest){enabled.addEventListener('change',function(){const st=enabled.closest('.ex-device-config-block').querySelector('.ex-device-switch-state');if(st)st.textContent=enabled.checked?'Ligada':'Desligada';});}
	},
	showManualChannelsModal: function() {
		const cur = this.currentWifiChannels();
		const ch2Select = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'auto' }, ['Automático (Auto)']),
			E('option', { value: '1' }, ['Canal 1 (2412 MHz — Recomendado)']),
			E('option', { value: '2' }, ['Canal 2 (2417 MHz)']),
			E('option', { value: '3' }, ['Canal 3 (2422 MHz)']),
			E('option', { value: '4' }, ['Canal 4 (2427 MHz)']),
			E('option', { value: '5' }, ['Canal 5 (2432 MHz)']),
			E('option', { value: '6' }, ['Canal 6 (2437 MHz — Recomendado)']),
			E('option', { value: '7' }, ['Canal 7 (2442 MHz)']),
			E('option', { value: '8' }, ['Canal 8 (2447 MHz)']),
			E('option', { value: '9' }, ['Canal 9 (2452 MHz)']),
			E('option', { value: '10' }, ['Canal 10 (2457 MHz)']),
			E('option', { value: '11' }, ['Canal 11 (2462 MHz — Recomendado)']),
			E('option', { value: '12' }, ['Canal 12 (2467 MHz)']),
			E('option', { value: '13' }, ['Canal 13 (2472 MHz)'])
		]);
		ch2Select.value = cur.two || 'auto';

		const ch5Select = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'auto' }, ['Automático (Auto)']),
			E('option', { value: '36' }, ['Canal 36 (5180 MHz — Recomendado)']),
			E('option', { value: '40' }, ['Canal 40 (5200 MHz)']),
			E('option', { value: '44' }, ['Canal 44 (5220 MHz)']),
			E('option', { value: '48' }, ['Canal 48 (5240 MHz)']),
			E('option', { value: '52' }, ['Canal 52 (5260 MHz — DFS)']),
			E('option', { value: '56' }, ['Canal 56 (5280 MHz — DFS)']),
			E('option', { value: '60' }, ['Canal 60 (5300 MHz — DFS)']),
			E('option', { value: '64' }, ['Canal 64 (5320 MHz — DFS)']),
			E('option', { value: '100' }, ['Canal 100 (5500 MHz — DFS)']),
			E('option', { value: '104' }, ['Canal 104 (5520 MHz — DFS)']),
			E('option', { value: '108' }, ['Canal 108 (5540 MHz — DFS)']),
			E('option', { value: '112' }, ['Canal 112 (5560 MHz — DFS)']),
			E('option', { value: '116' }, ['Canal 116 (5580 MHz — DFS)']),
			E('option', { value: '120' }, ['Canal 120 (5600 MHz — DFS)']),
			E('option', { value: '124' }, ['Canal 124 (5620 MHz — DFS)']),
			E('option', { value: '128' }, ['Canal 128 (5640 MHz — DFS)']),
			E('option', { value: '132' }, ['Canal 132 (5660 MHz — DFS)']),
			E('option', { value: '136' }, ['Canal 136 (5680 MHz — DFS)']),
			E('option', { value: '140' }, ['Canal 140 (5700 MHz — DFS)']),
			E('option', { value: '144' }, ['Canal 144 (5720 MHz — DFS)']),
			E('option', { value: '149' }, ['Canal 149 (5745 MHz — Recomendado)']),
			E('option', { value: '153' }, ['Canal 153 (5765 MHz)']),
			E('option', { value: '157' }, ['Canal 157 (5785 MHz)']),
			E('option', { value: '161' }, ['Canal 161 (5805 MHz)']),
			E('option', { value: '165' }, ['Canal 165 (5825 MHz)'])
		]);
		ch5Select.value = cur.five || 'auto';

		const rows = [
			E('label', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['Canal 2,4 GHz']),
				ch2Select,
				E('small', { class: 'ex-muted' }, ['Canais 1, 6 e 11 são os únicos sem sobreposição de frequência no 2,4 GHz.'])
			]),
			E('label', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['Canal 5 GHz']),
				ch5Select,
				E('small', { class: 'ex-muted' }, ['Canais 36-48 e 149-165 são ideais para máxima performance sem verificação DFS de radar.'])
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
						reloadSoon('Novos canais Wi-Fi aplicados. Recarregando…', 4500);
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
			let candidates=(r[3].results||[]).filter(function(x){return !x.restricted&&[36,40,44,48,149,153,157,161].indexOf(Number(x.channel))>=0;}).map(function(x){return Number(x.channel);}); if(!candidates.length)candidates=[36,40,44,48];
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
		const description=fixed?('Fixar canal '+suggested.two+' no 2,4 GHz e '+suggested.five+' no 5 GHz?'):'Voltar as duas bandas para seleção automática de canais?';
		ui.showModal(fixed?'Aplicar canais sugeridos':'Voltar ao modo automático',[
			E('p',{},[description]),
			E('p',{class:'alert-message warning'},['A alteração reiniciará as duas bandas do Wi‑Fi e desconectará temporariamente os aparelhos conectados.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){const args=['channels',mode];if(fixed)args.push(suggested.two,suggested.five);return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao aplicar os canais');ui.hideModal();reloadSoon(fixed?'Canais sugeridos salvos. Recarregando após reiniciar o Wi‑Fi…':'Seleção automática ligada. Recarregando após reiniciar o Wi‑Fi…',4200);}).catch(L.bind(function(e){if(reloadAfterExpectedDisconnect(e,fixed?'Canais enviados. O Wi‑Fi está reiniciando; recarregando o painel…':'Modo automático enviado. O Wi‑Fi está reiniciando; recarregando o painel…',5200))return;this.updateWifi(this.currentData);ui.addNotification(null,E('p',{},[e.message]));},this));},this)},[fixed?'Confirmar e aplicar':'Confirmar modo automático'])])
		]);
	},
	changeWifiWidth: function() {
		const w=wifiConfig(this.currentData.wireless);
		const widthFrom=function(ht){const m=String(ht||'').match(/(20|40|80|160)/);return m?m[1]:'';};
		const select=function(value,items){const s=E('select',{class:'cbi-input-select'},items.map(function(i){return E('option',{value:i[0]},[i[1]]);}));s.value=value;return s;};
		const w2=select(widthFrom(w.r0.htmode)||'20',[['20','20 MHz — mais alcance/estabilidade'],['40','40 MHz — mais rápido, mais interferência']]);
		const w5=select(widthFrom(w.r1.htmode)||'160',[['80','80 MHz — mais compatível/estável'],['160','160 MHz — velocidade máxima perto do roteador']]);
		const field=function(label,node,hint){return E('label',{class:'ex-wan-edit-field'},[E('span',{},[label]),node,E('small',{class:'ex-muted'},[hint])]);};
		ui.showModal('Largura e desempenho do Wi‑Fi',[
			E('p',{class:'ex-muted'},['A largura maior aumenta velocidade máxima, mas também aumenta interferência e pode reduzir alcance estável. Alterar reinicia o Wi‑Fi.']),
			E('div',{class:'ex-wan-edit-grid'},[
				field('2,4 GHz',w2,'Recomendado: 20 MHz para maior alcance e menos interferência.'),
				field('5 GHz',w5,'80 MHz é mais estável; 160 MHz é o máximo desempenho perto do roteador.')
			]),
			E('p',{class:'alert-message warning'},['A alteração derruba temporariamente todos os aparelhos conectados ao Wi‑Fi.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['wifi-width',w2.value,w5.value]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar largura do Wi‑Fi');ui.hideModal();reloadSoon('Largura do Wi‑Fi salva. Recarregando após reiniciar os rádios…',4200);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Wi‑Fi reiniciando. Recarregando o painel…',5200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Salvar e reiniciar Wi‑Fi'])])
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
		const preferred = [['BR','Brasil'],['US','Estados Unidos'],['PT','Portugal'],['AR','Argentina'],['CL','Chile'],['UY','Uruguai'],['PY','Paraguai'],['MX','México'],['CA','Canadá'],['GB','Reino Unido'],['DE','Alemanha'],['ES','Espanha'],['FR','França'],['IT','Itália'],['JP','Japão'],['AU','Austrália'],['00','Mundo / driver padrão']].map(function(p){ return {code:p[0], country:p[1]}; });
		populate(this.countries && this.countries.length ? this.countries : preferred);
		if(!this.countries || !this.countries.length) {
			safe(callCountryList('phy0-ap0'), {results:[]}).then(L.bind(function(res){
				if(res && res.results && res.results.length) {
					this.countries = res.results;
					populate(res.results);
				}
			}, this));
		}
		ui.showModal('País e domínio regulatório',[
			E('p',{},['Escolha o país onde o roteador está sendo utilizado. Isso controla legalmente canais e potências disponíveis.']),select,
			E('p',{class:'alert-message warning'},['Ao alterar o país, as duas bandas voltarão ao modo automático e o Wi‑Fi será reiniciado. Selecione somente o país onde o equipamento está fisicamente instalado.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){const code=select.value,name=select.options[select.selectedIndex].text;return fs.exec('/usr/sbin/equipe-dashboard-control',['country',code]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar o país');ui.hideModal();reloadSoon('País alterado para '+name+'. Recarregando após reiniciar o Wi‑Fi…',4200);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});},this)},['Confirmar país'])])
		]);
	},
	setDashboardLanguage: function(language){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['language',language]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar o idioma');window.location.reload();}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});
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
		const current=info.current||(this.capabilities.update&&this.capabilities.update.current)||'—', latest=info.latest||'—';
		const profileUpgrade=!!info.available&&info.profile==='full'&&info.actual_profile!=='full'&&current===latest;
		const state=info.error?('Erro: '+info.error):(info.available?(profileUpgrade?'Upgrade para Full disponível':'Atualização disponível'):'Sem atualização mais nova');
		const stateClass=info.error?'offline':(info.available?'online':'standby');
		const actions=[];
		if(info.available)actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.startSelfUpdate,this,info)},['Atualizar agora']));
		node.replaceChildren(E('div',{class:'ex-feature-row ex-update-result-row'},[
			E('div',{class:'ex-feature-copy'},[
				E('div',{class:'ex-feature-name-row'},[E('strong',{},[state]),E('span',{class:'ex-pill '+stateClass},[latest])]),
				E('small',{class:'ex-muted'},['Instalada: ',current,' • Perfil: ',info.actual_profile||'—',' → ',info.profile||'—']),
				E('small',{class:'ex-muted'},['Repo: ',info.repo||((this.capabilities.update||{}).repo||'—')]),
				info.asset?E('code',{},[info.asset]):''
			]),
			E('div',{class:'ex-feature-state'},[E('div',{class:'ex-feature-actions'},actions)])
		])); translateTree(node);
	},
	checkSelfUpdate: function(button){
		if(button){button.disabled=true;button.textContent='Verificando…';}
		const node=document.getElementById('ex-self-update-result'); if(node)node.replaceChildren(E('small',{class:'ex-muted'},['Consultando GitHub Releases…']));
		return fs.exec('/usr/sbin/equipe-dashboard-control',['self-update-check'],20000).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao verificar atualização');
			let info={}; try{info=JSON.parse(r.stdout||'{}');}catch(e){throw new Error('Resposta de atualização inválida');}
			this.renderSelfUpdateResult(info);
		},this)).catch(function(e){if(node)node.replaceChildren(E('p',{class:'alert-message warning'},[e.message]));}).finally(function(){if(button){button.disabled=false;button.textContent='Verificar atualização';}});
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
	selfUpdatePanel: function(){
		const update=this.capabilities.update||{}, manager=update.manager||this.capabilities.package_manager||'—';
		return E('section',{class:'ex-appearance-panel ex-update-panel'},[
			E('div',{class:'ex-appearance-heading'},[
				E('div',{},[E('strong',{},['Atualização do ARK Router']),E('small',{class:'ex-muted'},['Verifica o GitHub Releases e instala somente após confirmação.'])]),
				E('span',{class:'ex-pill '+(manager==='none'?'offline':'online')},[manager])
			]),
			E('div',{class:'ex-feature-row'},[
				E('div',{class:'ex-feature-copy'},[E('strong',{},['Versão instalada: ',update.current||'—']),E('small',{class:'ex-muted'},['Repositório: ',update.repo||'Despensativo/ark-router'])]),
				E('div',{class:'ex-feature-actions'},[E('button',{class:'ex-mini-button','click':L.bind(function(ev){this.checkSelfUpdate(ev.currentTarget);},this)},['Verificar atualização'])])
			]),
			E('div',{id:'ex-self-update-result',class:'ex-update-result'},[E('small',{class:'ex-muted'},['Nenhuma verificação executada nesta sessão.'])])
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
	loadMissingInstallLog: function(){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install-missing-log']).then(function(r){return String(r.stdout||'').trim();}).catch(function(){return '';});
	},
	pollMissingInstall: function(attempt){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install-missing-status']).then(L.bind(function(r){
			const state=String(r.stdout||'').trim();
			if(state==='done'){
				ui.addNotification(null,E('p',{},['Recursos faltantes instalados. Recarregando o painel…']));
				window.setTimeout(function(){window.location.reload();},1400);
				return;
			}
			if(state==='error'||attempt>240){
				return this.loadMissingInstallLog().then(function(log){
					const lines=(log||'').split(/\r?\n/).map(function(line){return line.trim();}).filter(Boolean);
					const detail=lines.length?lines.slice(-6).join(' | '):'A instalação em lote não foi concluída.';
					ui.addNotification(null,E('p',{},[detail]),'danger');
				});
			}
			window.setTimeout(L.bind(this.pollMissingInstall,this,attempt+1),2500);
		},this));
	},
	installMissingFeatures: function(keys){
		keys=keys||[];
		if(!keys.length){ui.addNotification(null,E('p',{},['Não há recursos leves faltando para instalar.']));return;}
		const names=keys.map(function(k){return (FEATURE_META[k]&&FEATURE_META[k].name)||k;}).join(' • ');
		ui.showModal('Instalar recursos faltantes',[
			E('p',{},['Serão instalados somente os recursos leves/suportados que ainda faltam: ',E('strong',{},[names])]),
			E('p',{class:'alert-message warning'},['O ARK Router atualizará a lista de pacotes e instalará os módulos em sequência. Nenhuma configuração de WAN, LAN, Wi‑Fi, SQM ou Multi‑WAN será aplicada automaticamente.']),
			E('p',{class:'ex-muted'},['BONDING REAL / Speedify não entra neste botão porque depende de licença, arquitetura e escolha de armazenamento. Use a seção própria dele.']),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				return fs.exec('/usr/sbin/equipe-dashboard-control',['feature-install-missing']).then(L.bind(function(r){
					const state=String(r.stdout||'').trim();
					if(r.code)throw new Error(r.stderr||'Falha ao iniciar instalação em lote');
					ui.hideModal();
					if(state==='installed'){ui.addNotification(null,E('p',{},['Todos os recursos leves já estavam instalados.']));window.setTimeout(function(){window.location.reload();},900);return;}
					ui.addNotification(null,E('p',{},[state==='running'?'A instalação em lote já está em andamento.':'Instalação em lote iniciada. O painel avisará quando terminar.']));
					this.pollMissingInstall(0);
				},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Confirmar instalação'])])
		]);
	},
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
		
		const applySqmBtn = E('button', {class:'btn cbi-button cbi-button-action', style:'display:none;font-weight:700;', 'click': L.bind(function(){
			ui.hideModal();
			this.editSqmLimits();
		}, this)}, ['⚙️ Aplicar limites no SQM']);
		
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
						ui.addNotification(null,E('p',{},[key==='speedtest'?'Medidor já estava pronto na memória.':(key==='speedify'?'Speedify já estava disponível.':'Esse recurso já estava disponível.')]));
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
		if(key!=='argon')return;
		ui.showModal('Usar tema',[E('p',{},['Tema Argon']),E('p',{class:'alert-message warning'},['O tema visual do LuCI será alterado. As configurações de rede não serão modificadas.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['theme',key]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao selecionar o tema');ui.hideModal();window.location.reload();}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});},this)},['Usar tema'])])]);
	},
	pairTailscale: function(){
		const f=this.feature('tailscale')||{};
		if(!f.installed){this.installFeature('tailscale');return;}
		ui.showModal('Parear Tailscale',[E('p',{},['Preparando Tailscale e anunciando a rede LAN atual…'])]);
		return fs.exec('/usr/sbin/equipe-dashboard-control',['tailscale-up']).then(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao iniciar Tailscale');
			let data={};try{data=JSON.parse(r.stdout||'{}');}catch(e){}
			const url=data.login_url||'', cidr=data.lan_cidr||f.lan_cidr||'—';
			ui.showModal('Parear Tailscale',[
				E('p',{},['Rota LAN anunciada: ',E('strong',{},[cidr])]),
				url?E('p',{},['Abra o link abaixo, faça login e autorize este roteador:']):E('p',{},['Tailscale respondeu sem pedir novo login. Se a rota ainda não aparecer nos dispositivos, aprove a Subnet Route no painel Tailscale.']),
				url?E('p',{},[E('a',{class:'ex-text-link',href:url,target:'_blank',rel:'noopener noreferrer'},[url])]):'',
				E('p',{class:'alert-message warning'},['No painel Tailscale, aprove a rota anunciada para acessar IPs da LAN de fora. Não abra LuCI/SSH direto na WAN.']),
				E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar']),' ',url?E('button',{class:'btn cbi-button cbi-button-positive','click':function(){window.open(url,'_blank','noopener');}},['Abrir login']):''])
			]);
		}).catch(function(e){ui.showModal('Parear Tailscale',[E('p',{class:'alert-message warning'},[e.message]),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar'])])]);});
	},
	disconnectTailscale: function(){
		ui.showModal('Desligar Tailscale',[E('p',{},['Desligar o Tailscale neste roteador? O acesso remoto pela VPN vai parar, mas a configuração/login local permanecem.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-negative','click':function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['tailscale-down']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao desligar Tailscale');ui.hideModal();reloadSoon('Tailscale desligado. Recarregando…',1200);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});}},['Desligar'])])]);
	},
	tailscaleCard: function(){
		const f=this.feature('tailscale')||{}, installed=!!f.installed, active=!!f.active, logged=!!f.logged_in;
		return E('section',{class:'ex-card ex-remote-card'},[
			E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['ACESSO REMOTO SEGURO']),E('h3',{},['Tailscale'])]),E('span',{class:'ex-pill '+(active?'online':(installed?'standby':'offline'))},[active?'ATIVO':(installed?'INSTALADO':'OPCIONAL')])]),
			E('p',{class:'ex-muted'},['Acesso remoto gratuito para uso pessoal, sem abrir portas na WAN. Ideal para iPhone, Windows e redes com Starlink/CGNAT.']),
			E('div',{class:'ex-grid ex-grid-3 ex-qos-grid'},[
				E('div',{class:'ex-row'},[E('span',{},['Login']),E('strong',{},[logged?'Logado':'Não logado'])]),
				E('div',{class:'ex-row'},[E('span',{},['IP Tailscale']),E('strong',{},[f.ip||'—'])]),
				E('div',{class:'ex-row'},[E('span',{},['Rota LAN']),E('strong',{},[f.lan_cidr||'—'])])
			]),
			E('div',{class:'ex-speedify-actions'},[
				installed?'':E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,'tailscale')},['Instalar Tailscale']),
				E('button',{class:'ex-mini-button','click':L.bind(this.pairTailscale,this)},[installed?'Parear / anunciar LAN':'Instalar e parear']),
				installed?E('button',{class:'ex-feature-link','click':L.bind(this.disconnectTailscale,this)},['Desligar']):'',
				E('a',{class:'ex-text-link',href:'https://login.tailscale.com/admin/machines',target:'_blank',rel:'noopener noreferrer'},['Painel Tailscale →'])
			]),
			E('small',{class:'ex-muted'},['Depois do pareamento, aprove a Subnet Route no painel Tailscale. Use faixas LAN diferentes em cada roteador para evitar conflito.'])
		]);
	},
	enableZerotier: function(){
		ui.showModal('Ativar ZeroTier',[E('p',{},['Iniciando serviço ZeroTier e conectando à rede virtual…'])]);
		return fs.exec('/usr/sbin/equipe-dashboard-control',['zerotier-enable']).then(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao iniciar ZeroTier');
			ui.hideModal();
			reloadSoon('ZeroTier ativado com sucesso. Recarregando…',1500);
		}).catch(function(e){
			ui.showModal('Ativar ZeroTier',[E('p',{class:'alert-message warning'},[e.message]),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar'])])]);
		});
	},
	disableZerotier: function(){
		ui.showModal('Desligar ZeroTier',[
			E('p',{},['Desligar o ZeroTier neste roteador? O serviço será totalmente encerrado para economizar CPU e memória RAM. O acesso remoto pela VPN ficará pausado até você reativar.']),
			E('div',{class:'right'},[
				E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),
				' ',
				E('button',{class:'btn cbi-button cbi-button-negative','click':function(){
					return fs.exec('/usr/sbin/equipe-dashboard-control',['zerotier-disable']).then(function(r){
						if(r.code)throw new Error(r.stderr||'Falha ao desligar ZeroTier');
						ui.hideModal();
						reloadSoon('ZeroTier desligado com sucesso. Recarregando…',1200);
					}).catch(function(e){
						ui.addNotification(null,E('p',{},[e.message]),'danger');
					});
				}},['Desligar'])
			])
		]);
	},
	joinZerotier: function(){
		const f=this.feature('zerotier')||{}, current=f.network_id||'';
		const input=E('input',{class:'cbi-input-text',type:'text',value:current,placeholder:'ex.: 8056c2e21c000001',maxlength:16});
		ui.showModal('Entrar na rede ZeroTier',[
			E('p',{},['Cole o Network ID criado no ZeroTier Central. O roteador será autorizado no painel online do ZeroTier depois do join.']),
			E('p',{class:'alert-message warning'},['No plano grátis atual, use o IP ZeroTier para acessar o roteador. Rotas gerenciadas para a LAN inteira podem exigir plano pago.']),
			E('label',{class:'ex-field'},[E('span',{},['Network ID']),input]),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
				const id=String(input.value||'').trim();
				return fs.exec('/usr/sbin/equipe-dashboard-control',['zerotier-join',id]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao entrar na rede ZeroTier');ui.hideModal();reloadSoon('ZeroTier configurado. Autorize o roteador no ZeroTier Central…',1600);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Entrar'])])
		]);
	},
	leaveZerotier: function(){
		const f=this.feature('zerotier')||{}, id=f.network_id||'';
		ui.showModal('Sair da rede ZeroTier',[E('p',{},['Remover este roteador da rede ZeroTier atual?']),E('p',{class:'ex-muted'},[id||'Nenhuma rede detectada.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-negative','click':function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['zerotier-leave',id]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao sair da rede');ui.hideModal();reloadSoon('ZeroTier removido da rede. Recarregando…',1200);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});}},['Sair'])])]);
	},
	zerotierCard: function(){
		const f=this.feature('zerotier')||{}, installed=!!f.installed, active=!!f.active;
		return E('section',{class:'ex-card ex-remote-card'},[
			E('div',{class:'ex-card-title'},[
				E('div',{},[
					E('span',{class:'ex-kicker'},['ACESSO REMOTO LEVE']),
					E('h3',{},['ZeroTier'])
				]),
				E('span',{class:'ex-pill '+(active?'online':(installed?'standby':'offline'))},[active?'ATIVO':(installed?'DESLIGADO':'OPCIONAL')])
			]),
			E('p',{class:'ex-muted'},['Acesso remoto leve para iOS e Windows sem abrir portas na WAN. Quando desligado, o serviço não roda e não consome recursos.']),
			E('div',{class:'ex-grid ex-grid-3 ex-qos-grid'},[
				E('div',{class:'ex-row'},[E('span',{},['Node ID']),E('strong',{},[f.node_id||'—'])]),
				E('div',{class:'ex-row'},[E('span',{},['Network ID']),E('strong',{},[f.network_id||'—'])]),
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
					E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
						E('input', {
							type: 'checkbox',
							checked: !!f.autostart,
							change: function(ev) {
								const input = ev.currentTarget;
								const val = input.checked ? '1' : '0';
								fs.exec('/usr/sbin/equipe-dashboard-control', ['zerotier-autostart-toggle', val]).then(function(r) {
									if (r.code) throw new Error(r.stderr || 'Falha ao alterar inicialização');
									ui.addNotification(null, E('p', {}, [val === '1' ? 'ZeroTier configurado para iniciar automaticamente no boot.' : 'ZeroTier não irá mais iniciar sozinho no boot.']), 'info');
								}).catch(function(e) {
									input.checked = !input.checked;
									ui.addNotification(null, E('p', {}, [e.message]), 'danger');
								});
							}
						}),
						E('span', { class: 'ex-switch-slider' })
					])
				])
			]) : '',
			E('div',{class:'ex-speedify-actions'},[
				installed?'':E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,'zerotier')},['Instalar ZeroTier']),
				installed && !active ? E('button',{class:'ex-mini-button','click':L.bind(this.enableZerotier,this)},['▶ Ativar ZeroTier']) : '',
				installed && active ? E('button',{class:'ex-mini-button','click':L.bind(this.joinZerotier,this)},['Entrar / trocar rede']) : '',
				(active && f.ip && f.ip!=='—') ? E('a',{class:'ex-mini-button',href:'http://'+String(f.ip).replace(/\/.*$/,''),target:'_blank',rel:'noopener noreferrer'},['Abrir ARK remoto']) : '',
				installed && active ? E('button',{class:'ex-feature-link','click':L.bind(this.disableZerotier,this)},['⏹ Desligar']) : '',
				installed ? E('button',{class:'ex-feature-link','click':L.bind(this.leaveZerotier,this)},['Sair da rede']) : '',
				E('a',{class:'ex-text-link',href:'https://my.zerotier.com/network',target:'_blank',rel:'noopener noreferrer'},['ZeroTier Central →'])
			]),
			E('small',{class:'ex-muted'},[active ? 'ZeroTier ativo. Use o IP acima para acessar o roteador remotamente.' : 'ZeroTier desligado (processo finalizado, zero uso de CPU e RAM). Clique em Ativar para conectar.'])
		]);
	},
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
			ui.addNotification(null,E('p',{},[desired==='1'?'Inicialização do BONDING REAL enviada. O ARK validará o túnel em segundo plano.':'BONDING REAL desligado; rotas restauradas e daemon encerrado.']));
			return this.fetchCapabilities().then(function(c){this.capabilities=c;return this.fetchData();}.bind(this)).then(function(data){this.update(data);}.bind(this));
		}.bind(this)).catch(function(e){
			input.checked=!input.checked;
			ui.addNotification(null,E('p',{},[e.message]),'danger');
		}).finally(function(){input.disabled=false;});
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
	toggleSpeedifyBypass: function(title,input){
		const desired=!!input.checked;input.disabled=true;
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-bypass-service',title,desired?'on':'off']).then(L.bind(function(r){
			if(r.code)throw new Error(r.stderr||'Falha ao alterar o Bypass');
			return this.fetchCapabilities().then(L.bind(function(c){
				this.capabilities=c;
				const data=(c.features&&c.features.speedify_bypass)||{}, item=(data.services||[]).find(function(s){return String(s.title||'')===title;}), actual=item?!!item.enabled:desired;
				input.checked=actual;
				ui.addNotification(null,E('p',{},[title+': '+(actual?'bypass ligado; sai diretamente por uma WAN.':'bypass desligado; pode usar o túnel e somar links.')]));
			},this));
		},this)).catch(function(e){input.checked=!desired;ui.addNotification(null,E('p',{},[e.message]),'danger');}).finally(function(){input.disabled=false;});
	},
	toggleSpeedifyBypassMaster: function(input){
		const desired=!!input.checked; input.disabled=true;
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-bypass-master',desired?'on':'off']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar Bypass geral');ui.addNotification(null,E('p',{},[desired?'Bypass geral ligado.':'Bypass geral desligado.']));}).catch(function(e){input.checked=!desired;ui.addNotification(null,E('p',{},[e.message]),'danger');}).finally(function(){input.disabled=false;});
	},
	saveSpeedifyAdapterPriority: function(id, value){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-adapter-priority',id,value]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar prioridade');ui.addNotification(null,E('p',{},['Prioridade de '+id+' salva: '+value]));}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
	},
	saveSpeedifyAdapterRate: function(id, down, up){
		return fs.exec('/usr/sbin/equipe-dashboard-control',['speedify-adapter-rate',id,down||'unlimited',up||'unlimited']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar limites');ui.addNotification(null,E('p',{},['Limites de '+id+' salvos.']));}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});
	},
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
	},
	speedifyCard: function(data){
		const detectionData=data||this.currentData||{};
		const f=this.feature('speedify'), installed=!!f.installed, supported=f.supported!==false, prepared=!!f.prepared, state=(f.state||'unavailable'), luci=!!f.luci, storage=f.storage||{}, rec=storage.recommended||'none', installedMode=String(f.install_mode||'');
		const storageMode=installed&&/^(internal|external|ram)$/.test(installedMode)?installedMode:rec;
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
			input.addEventListener('change',L.bind(function(){this.toggleSpeedifyBypass(title,input);},this));
			return E('label',{class:'ex-speedify-bypass-row'},[
				E('span',{},[title]),
				input,
				E('span',{class:'ex-switch-slider'})
			]);
		},this));
		const bypassPanel=installed&&bypassServices.length?E('div',{class:'ex-speedify-bypass'},[
			E('div',{class:'ex-speedify-mode-head'},[
				E('div',{},[E('strong',{},['Bypass leve']),E('small',{class:'ex-muted'},['Ligado = o serviço sai direto por uma WAN e não soma links. Desligado = pode passar pelo túnel Speedify.'])]),
				E('label',{class:'ex-speedify-master-toggle'},[E('span',{},[bypassData.domainWatchlistEnabled?'BYPASS ATIVO':'BYPASS DESLIGADO']),bypassMaster,E('span',{class:'ex-switch-slider'})])
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
						fs.exec('/usr/sbin/equipe-dashboard-control', ['starlink-active-wan-set', w.name]).then(function(r) {
							if (r.code) throw new Error(r.stderr || 'Falha ao ativar rota');
							reloadSoon('Rota 192.168.100.1 e App Starlink apontados para ' + w.label + '! Recarregando…', 900);
						}).catch(function(e) {
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
		const starlinkPanel=E('details',{id:'ex-starlink-global-panel',class:'ex-starlink-panel '+(starlinkProblem?'problem':(starlinkDetected?'detected':'idle')),style:starlinkDetected?'':'display:none;'},[
			E('summary',{},[
				E('span',{class:'ex-starlink-summary-main'},[
					E('span',{class:'ex-starlink-icon'},['◉']),
					E('span',{},[E('strong',{},['Starlink']),E('small',{class:'ex-muted'},[starlinkDetected?(starlinkWans.length+' entrada'+(starlinkWans.length===1?'':'s')+' Starlink detectada'+(starlinkWans.length===1?'':'s')+' • ajuste sequencial'):'Nenhuma entrada Starlink detectada'])])
				]),
				E('span',{class:'ex-pill '+(starlinkProblem?'offline':(starlinkDetected?'online':'standby'))},[starlinkProblem?'SEM CONEXÃO':(starlinkDetected?'DETECTADA':'AGUARDANDO')])
			]),
			E('div',{class:'ex-starlink-body'},[
				starlinkWans.length>=2?E('div',{class:'ex-starlink-multi-warning'},[
					E('strong',{},['Duas ou mais Starlink detectadas']),
					E('span',{},['Se possível, instale as antenas afastadas e aponte-as para lados diferentes. Não é uma disputa direta por satélite, mas essa separação reduz obstruções compartilhadas e possível interferência, melhorando a diversidade dos enlaces.'])
				]):'',
				starlinkDetected?E('div',{class:'ex-starlink-list ex-starlink-wan-list'},starlinkWanCards):E('p',{class:'ex-muted'},['Quando uma WAN compatível for detectada, o ARK criará um card independente para consultar e alinhar cada antena.']),
				E('div',{class:'ex-starlink-public'},[
					E('div',{},[E('strong',{},['Visualização sem login']),E('small',{class:'ex-muted'},['Libera apenas telemetria e alinhamento em /starlink/ para dispositivos da LAN. Não permite alterar nenhuma configuração.']),E('a',{id:'ex-starlink-public-link',class:'ex-text-link',href:'/starlink/',target:'_blank',rel:'noopener noreferrer',hidden:!starlinkPublic.enabled},['Abrir painel somente leitura →'])]),
					E('div',{class:'ex-device-switch-control'},[E('strong',{id:'ex-starlink-public-state',class:'ex-device-switch-state'},[starlinkPublic.enabled?'LIGADO':'DESLIGADO']),E('label',{class:'ex-switch'},[starlinkPublicInput,E('span',{class:'ex-switch-slider'})])])
				]),
				E('div',{class:'ex-starlink-note'},[
					E('strong',{},['Módulo Starlink dedicado • Lite e Full']),
					E('small',{class:'ex-muted'},['Uma antena é consultada por vez através de uma rota temporária exclusiva para 192.168.100.1. Internet, mwan3 e Speedify permanecem inalterados.']),
					luci&&f.active?E('a',{class:'ex-text-link',href:L.url('admin/speedify'),target:'_blank',rel:'noopener noreferrer'},['Abrir Central Starlink / Speedify →']):(luci?E('small',{class:'ex-muted'},['Ligue o BONDING REAL para iniciar a Central Starlink oficial.']):'')
				])
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
		const powerInput=E('input',{type:'checkbox','aria-label':'Ligar Speedify agora','change':L.bind(function(ev){this.toggleSpeedifyPower(ev.currentTarget);},this)});
		powerInput.checked=state==='CONNECTED'||state==='CONNECTING'||String(f.desired_state||'')==='connected';
		if(!supported)powerInput.disabled=true;
		const autoInput=E('input',{type:'checkbox','aria-label':'Auto recuperar Speedify após reboot','change':L.bind(function(ev){this.toggleSpeedifyAutostart(ev.currentTarget);},this)});
		autoInput.checked=!!f.autostart;
		if(!supported)autoInput.disabled=true;
		const actions=[];
		const links=[E('a',{class:'ex-text-link',href:'https://support.speedify.com/article/918-openwrt',target:'_blank',rel:'noopener noreferrer'},['Guia oficial →'])];
		if(luci)links.unshift(E('a',{class:'ex-text-link',href:L.url('admin/speedify')},['Abrir painel oficial Speedify →']));
		else if(installed)links.unshift(E('span',{class:'ex-muted'},['Painel oficial LuCI não instalado neste modo leve. Use os botões do ARK Router.']));
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
				actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.pairSpeedify,this)},['Parear / login']));
				actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.checkSpeedifyUser,this)},['Verificar conta']));
				actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.saveSpeedifyConfig,this)},['Salvar config']));
			}
		}
		this._starlinkPanel=starlinkPanel;
		return E('section',{class:'ex-card ex-speedify-card'},[
			E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['BONDING REAL']),E('h3',{},['Speedify'])]),E('span',{class:'ex-pill '+(installed?(f.active?'online':'standby'):'offline')},[installed?(f.active?'ATIVO':'INSTALADO'):(supported?'OPCIONAL':'INDISPONÍVEL')])]),
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
							? (state==='CONNECTED'?'Ligado. O tráfego sai pelo túnel Speedify.':'Iniciando e validando o túnel em segundo plano; se falhar, o ARK restaura a WAN normal.')
							: (installed?'Desligado. A internet usa WAN/Multi‑WAN normal e o daemon não permanece rodando.':'Speedify ainda não instalado. Ao ligar, o ARK Router oferece instalar no modo recomendado.')
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
				E('div',{},[E('span',{},[installed?'Instalado em':'Recomendado']),E('strong',{},[storageMode==='internal'?'Interno':(storageMode==='external'?'Externo':(storageMode==='ram'?'RAM experimental':'Sem espaço'))])])
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
		]);
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
		const sf=this.feature('speedify'), speedifyOn=sf&&sf.state==='CONNECTED';
		ui.showModal('Iniciar teste',[E('p',{},[label]),speedifyOn?E('p',{class:'alert-message warning'},['Speedify está conectado. Para calibrar WAN/SQM real, desconecte antes; caso contrário o teste pode medir o túnel ou uma rota alterada.']):'',E('p',{class:'alert-message warning'},['O teste faz uma medição completa e mais duas de upload. O SQM desta WAN será pausado e restaurado automaticamente. Durante o teste, o link ficará ocupado.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return this.runSpeedtest(wan).then(function(){ui.hideModal();}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});},this)},['Iniciar teste'])])]);
	},
	startConnectedSpeedtests: function(){
		const data=this.currentData||{}, wans=[['wan','WAN1',!!iface(data.interfaces,'wan').up],['wan2','WAN2',!!iface(data.interfaces,'wan2').up]].filter(function(x){return x[2];}), sf=this.feature('speedify'), speedifyOn=sf&&sf.state==='CONNECTED';
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
		kbps=Math.round(Number(kbps)||0);if(!kbps)return;ui.showModal('Aplicar sugestão ao SQM',[E('p',{},[(wan==='wan'?'WAN1':'WAN2')+': '+formatRate(kbps*1000)]),E('p',{class:'alert-message warning'},['O novo limite será salvo e o SQM será reiniciado.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['speedtest-apply',wan,String(kbps)]).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao aplicar');ui.hideModal();reloadSoon('Sugestão aplicada ao SQM. Recarregando para atualizar os limites…',2400);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]));});},this)},['Aplicar'])])]);
	},
	requestReboot: function(){
		ui.showModal('Primeira confirmação',[E('p',{},['Deseja preparar o reinício do roteador? Nenhuma configuração será apagada.']),E('p',{class:'alert-message warning'},['A internet e o painel ficarão indisponíveis por alguns minutos.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){
			return fs.exec('/usr/sbin/equipe-dashboard-control',['reboot-prepare']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao preparar o reinício');const token=String(r.stdout||'').trim();if(!/^[0-9a-f]{8,64}$/.test(token))throw new Error('Confirmação inválida recebida do roteador');this.showRebootConfirmation(token);},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
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
			const mainSsid=input('text',saved.main_ssid||'ARK Router',{maxlength:32});
			const mainKey=input('password','',{placeholder:'mínimo 8 caracteres'});
			const guestEnabled=checkbox(saved.guest_enabled!==false);
			const guestSsid=input('text',saved.guest_ssid||'ARK Router Visitantes',{maxlength:32});
			const guestKey=input('password','',{placeholder:'mínimo 8 caracteres'});
			const guestLimitEnabled=checkbox(saved.guest_limit_enabled!==false);
			const guestDownload=input('number',kbpsToMbpsInput(saved.guest_download_kbps||'0'),{min:0,max:100000,step:'0.1'});
			const guestUpload=input('number',kbpsToMbpsInput(saved.guest_upload_kbps||'1500'),{min:0,max:100000,step:'0.1'});
			const availableLanPorts = (this.currentData && this.currentData.lanPorts && this.currentData.lanPorts.length) ? this.currentData.lanPorts : ['lan1', 'lan2', 'lan3'];
			const portOptions = availableLanPorts.map(function(p) { return [p, portLabel(p) + ' (porta física ' + p + ')']; });
			const wan2Port=select(saved.wan2_port||'lan1', portOptions);
			const wan2Enabled=checkbox(saved.wan2_enabled!==false);
			const wanMode=select(saved.wan_mode||'failover',[['single','Somente WAN1'],['failover','Failover WAN1 → WAN2'],['balanced','Balanceamento'],['wan1','Forçar WAN1'],['wan2','Forçar WAN2']]);
			const syncInternetProfile=function(){
				if(profile.value==='internet_single'){wan2Enabled.checked=false;wanMode.value='single';wan2Port.disabled=true;}
				else if(profile.value==='internet_failover'){wan2Enabled.checked=true;wanMode.value='failover';wan2Port.disabled=false;}
				else if(profile.value==='internet_balance'){wan2Enabled.checked=true;wanMode.value='balanced';wan2Port.disabled=false;}
			};
			profile.addEventListener('change',syncInternetProfile);
			wan2Enabled.addEventListener('change',function(){wan2Port.disabled=!wan2Enabled.checked;});
			syncInternetProfile();
			const sqmEnabled=checkbox(!!saved.sqm_enabled);
			const sqmStrategy=select(saved.sqm_strategy||'manual',[['manual','Definir limites manualmente'],['calibrate_later','Medir depois pelo painel'],['off','Não configurar SQM agora']]);
			const sqmWanUp=input('number',kbpsToMbpsInput(saved.sqm_wan_upload),{placeholder:'ex.: 15',min:0,max:100000,step:'0.1'});
			const sqmWanDown=input('number',kbpsToMbpsInput(saved.sqm_wan_download),{placeholder:'ex.: 1200',min:0,max:100000,step:'0.1'});
			const sqmWan2Up=input('number',kbpsToMbpsInput(saved.sqm_wan2_upload),{placeholder:'opcional',min:0,max:100000,step:'0.1'});
			const sqmWan2Down=input('number',kbpsToMbpsInput(saved.sqm_wan2_download),{placeholder:'opcional',min:0,max:100000,step:'0.1'});
			const dnsMode=select(saved.dns_mode||'recommended',[['recommended','DNS recomendado'],['operator','DNS da operadora'],['custom','DNS personalizado']]);
			const savedDns=String(saved.dns_servers||'1.1.1.1 1.0.0.1 8.8.8.8').split(/\s+/);
			const dns1=input('text',savedDns[0]||'1.1.1.1',{placeholder:'DNS 1'}), dns2=input('text',savedDns[1]||'1.0.0.1',{placeholder:'DNS 2'}), dns3=input('text',savedDns[2]||'8.8.8.8',{placeholder:'DNS 3 opcional'});
			const disableIpv6=checkbox(saved.disable_ipv6!==false), disableWps=checkbox(saved.disable_wps!==false), useArgon=checkbox(saved.use_argon!==false);
			const modules=(saved.install_modules||'argon sqm mwan3 nlbwmon').split(/\s+/), moduleBoxes={};
			const moduleNames={argon:'Tema Argon',sqm:'SQM / CAKE',mwan3:'Multi‑WAN',nlbwmon:'Consumo por dispositivo',upnp:'UPnP / NAT‑PMP',uhttpd:'HTTPS/uHTTPd'};
			['argon','sqm','mwan3','nlbwmon','upnp','uhttpd'].forEach(L.bind(function(key){const f=this.feature(key)||{}, installed=f.installed;moduleBoxes[key]=checkbox(installed||modules.indexOf(key)>=0);moduleBoxes[key].disabled=installed;},this));
			const progress=E('div',{class:'ex-ez-progress'},[E('strong',{},['Progresso salvo: etapa ',String(saved.applied_step||0),'/7']),E('small',{class:'ex-muted'},[saved.state==='applied'?'Configuração já aplicada.':(saved.last_step?'Última etapa: '+saved.last_step:'Rascunho pronto para editar.')]),saved.backup?E('code',{},[saved.backup]):'']);
			const collect=L.bind(function(){
				const selectedModules=Object.keys(moduleBoxes).filter(function(k){return moduleBoxes[k].checked&&!moduleBoxes[k].disabled;}).join(' ');
				const dnsServers=[dns1.value.trim(),dns2.value.trim(),dns3.value.trim()].filter(Boolean).join(' ');
				const args=['ez-setup-save',
					'language='+language.value,'profile='+profile.value,'router_name='+routerName.value,'country='+country.value,'wifi_mode='+wifiMode.value,
					'main_ssid='+mainSsid.value,'guest_enabled='+(guestEnabled.checked?'1':'0'),'guest_ssid='+guestSsid.value,
					'guest_limit_enabled='+(guestLimitEnabled.checked?'1':'0'),'guest_download_kbps='+mbpsToKbps(guestDownload.value),'guest_upload_kbps='+mbpsToKbps(guestUpload.value),
					'wan2_enabled='+(wan2Enabled.checked?'1':'0'),'wan2_port='+wan2Port.value,'wan_mode='+wanMode.value,
					'sqm_enabled='+(sqmEnabled.checked?'1':'0'),'sqm_strategy='+sqmStrategy.value,
					'sqm_wan_upload='+mbpsToKbps(sqmWanUp.value),'sqm_wan_download='+mbpsToKbps(sqmWanDown.value),'sqm_wan2_upload='+mbpsToKbps(sqmWan2Up.value),'sqm_wan2_download='+mbpsToKbps(sqmWan2Down.value),
					'dns_mode='+dnsMode.value,'dns_servers='+dnsServers,'disable_ipv6='+(disableIpv6.checked?'1':'0'),'disable_wps='+(disableWps.checked?'1':'0'),'use_argon='+(useArgon.checked?'1':'0'),'install_modules='+selectedModules
				];
				if(mainKey.value)args.push('main_key='+mainKey.value);
				if(guestKey.value)args.push('guest_key='+guestKey.value);
				return args;
			},this);
			const saveDraft=L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',collect()).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao salvar o Ark - Setup');ui.addNotification(null,E('p',{},['Rascunho do Ark - Setup salvo.']));}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});},this);
			const applySetup=L.bind(function(){return saveDraft().then(L.bind(function(){
				ui.showModal('Aplicar Ark - Setup',[E('p',{class:'alert-message warning'},['O roteador criará um backup em /tmp e aplicará as etapas salvas. Wi‑Fi, DNS, firewall, WAN ou SQM podem reiniciar durante o processo.']),E('p',{},['Se o painel cair, reconecte na nova rede e abra o ARK Router novamente; o progresso fica salvo.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-apply']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao aplicar o Ark - Setup');let out={};try{out=JSON.parse(r.stdout||'{}');}catch(e){}ui.hideModal();ui.addNotification(null,E('p',{},['Ark - Setup aplicado. Backup: ',out.backup||'/tmp/ark-router-ezsetup-backup-*.tar.gz']));window.setTimeout(function(){window.location.reload();},1800);}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Confirmar e aplicar'])])]);
			},this));},this);
			const pollSetupModules=L.bind(function(attempt){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-install-status']).then(L.bind(function(r){const state=String(r.stdout||'').trim();if(state==='done'){ui.addNotification(null,E('p',{},['Módulos do Ark - Setup instalados. Recarregando…']));window.setTimeout(function(){window.location.reload();},1200);return;}if(state==='error'||attempt>180){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-install-log']).then(function(log){const lines=String(log.stdout||'').split(/\r?\n/).filter(Boolean);ui.addNotification(null,E('p',{},[lines.slice(-4).join(' | ')||'Falha ao instalar módulos.']),'danger');});}window.setTimeout(function(){pollSetupModules(attempt+1);},2000);},this));},this);
			const installModules=L.bind(function(){return saveDraft().then(L.bind(function(){
				ui.showModal('Instalar módulos do Ark - Setup',[E('p',{class:'alert-message warning'},['A lista de pacotes será atualizada e os módulos selecionados serão instalados um por um. Nenhuma configuração de rede será aplicada automaticamente.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-install-modules']).then(L.bind(function(r){if(r.code)throw new Error(r.stderr||'Falha ao iniciar instalação');ui.hideModal();ui.addNotification(null,E('p',{},['Instalação dos módulos iniciada.']));pollSetupModules(0);},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},['Confirmar instalação'])])]);
			},this));},this);
			const reset=L.bind(function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['ez-setup-reset']).then(function(){ui.hideModal();ui.addNotification(null,E('p',{},['Rascunho do Ark - Setup apagado.']));}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});},this);
			const moduleList=E('div',{class:'ex-ez-module-grid'},Object.keys(moduleBoxes).map(L.bind(function(k){const f=this.feature(k);if(f.installed)return E('div',{class:'ex-ez-module-installed'},[E('b',{},['✓']),E('span',{},[moduleNames[k]||k,E('small',{},['Já instalado'])])]);return E('label',{},[moduleBoxes[k],E('span',{},[moduleNames[k]||k,E('small',{},['Opcional'])])]);},this)));
			ui.showModal('Ark - Setup',[E('div',{class:'ex-ez-setup'},[
				progress,
				E('section',{class:'ex-ez-section'},[E('h3',{},['1. Idioma, nome e país']),E('div',{class:'ex-ez-grid ex-ez-grid-3'},[this.ezField('Idioma',language),this.ezField('Nome do painel',routerName),this.ezField('País regulatório',country,'Escolha onde o equipamento está sendo usado.')])]),
				E('section',{class:'ex-ez-section ex-ez-primary'},[
					E('h3',{},['2. Como a internet entra no roteador?']),
					E('div',{class:'ex-ez-grid ex-ez-grid-3'},[
						this.ezField('Modo de internet',profile,profileHelp.textContent),
						this.ezField('Modo Multi‑WAN',wanMode,'Usado quando há duas conexões ativas.'),
						this.ezField('Habilitar segunda internet (WAN2)',wan2Enabled,'Ativa a segunda entrada de internet.')
					]),
					E('div',{class:'ex-ez-grid ex-ez-grid-2',style:'margin-top:12px;'},[
						this.ezField('Porta física para WAN2',wan2Port,'Selecione qual porta do aparelho receberá a segunda internet.'),
						this.ezField('Protocolo da WAN2',E('span',{class:'ex-muted',style:'display:block;padding:8px 0;font-size:0.85rem;'},['DHCP Automático (Starlink, 4G/5G ou segundo modem)']))
					]),
					E('div',{class:'alert-message info',style:'margin-top:12px;font-size:0.8rem;line-height:1.45;'},[
						E('strong',{},['📌 Dica: ']),
						'Confira a numeração das portas físicas gravada na carcaça do seu aparelho (ex: LAN1, LAN2, LAN3) caso tenha dúvida de onde conectar o cabo da segunda internet.'
					])
				]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['3. Wi‑Fi principal']),E('div',{class:'ex-ez-grid'},[this.ezField('Nome da rede principal',mainSsid),this.ezField('Senha principal',mainKey,'Mínimo 8 caracteres.'),this.ezField('2,4 GHz e 5 GHz',wifiMode)])]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['4. Rede visitante']),E('div',{class:'ex-ez-grid'},[this.ezField('Habilitar visitante',guestEnabled),this.ezField('Nome da rede visitante',guestSsid),this.ezField('Senha visitante',guestKey,'Mínimo 8 caracteres.'),this.ezField('Limitar visitante',guestLimitEnabled),this.ezField('Download total visitante em Mbps',guestDownload,'0 = ilimitado.'),this.ezField('Upload total visitante em Mbps',guestUpload,'Exemplo: 1,5 Mbps. Use 0 para ilimitado.')])]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['5. SQM / CAKE']),E('p',{class:'ex-muted'},['Ajuda a manter latência estável quando o link está cheio. Informe as velocidades em Mbps; 1,2 Gbps = 1200 Mbps.']),E('div',{class:'ex-ez-grid'},[this.ezField('Configurar SQM',sqmEnabled),this.ezField('Estratégia',sqmStrategy),this.ezField('WAN1 upload Mbps',sqmWanUp),this.ezField('WAN1 download Mbps',sqmWanDown),this.ezField('WAN2 upload Mbps',sqmWan2Up),this.ezField('WAN2 download Mbps',sqmWan2Down)])]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['6. DNS e segurança']),E('div',{class:'ex-ez-grid'},[this.ezField('Modo DNS',dnsMode),this.ezField('DNS 1',dns1),this.ezField('DNS 2',dns2),this.ezField('DNS 3',dns3,'Opcional'),this.ezField('Desativar IPv6',disableIpv6),this.ezField('Desativar WPS',disableWps),this.ezField('Usar Argon se instalado',useArgon)])]),
				E('section',{class:'ex-ez-section'},[E('h3',{},['7. Recursos opcionais']),E('p',{class:'ex-muted'},['Marcados como “já instalado” já existem no roteador. Os demais são opcionais e só serão instalados se você confirmar.']),moduleList,E('button',{class:'ex-mini-button ex-ez-install-modules','click':installModules},['Instalar módulos selecionados'])]),
				E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar']),' ',E('button',{class:'btn cbi-button cbi-button-neutral','click':reset},['Apagar rascunho']),' ',E('button',{class:'btn cbi-button cbi-button-action','click':saveDraft},['Salvar rascunho']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':applySetup},['Salvar e aplicar'])])
			])]);
		},this));
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
					E('p',{class:'ex-muted'},['Modo ARK remove painéis e serviços dispensáveis para deixar o OpenWrt como base enxuta. SQM, Multi‑WAN, NLBWMon, Argon e uHTTPd são mantidos.']),
					rows.length?E('div',{class:'ex-cleanup-list'},rows):E('p',{class:'ex-muted'},['Nenhum item seguro de otimização encontrado agora.']),
					E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar']),' ',E('button',applyAttrs,['Aplicar selecionados'])])
				])
			]);
		},this)).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
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
					window.setTimeout(function(){window.location.reload();},2500);
				}).catch(function(e){if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			}},['Criar backup e desativar IPv6'])])
		]);
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
		const rows=Object.keys(FEATURE_META).map(L.bind(function(key){const meta=FEATURE_META[key],f=this.feature(key)||{};let state=f.installed?(f.temporary?'Pronto na memória':(f.active?(key==='argon'?'Tema ativo':'Instalado e ativo'):(key==='argon'?'Instalado, mas não selecionado':'Instalado, mas inativo'))):(f.installable?'Não instalado':'Não disponível');if(!f.installed&&f.hidden)state='Sugestão oculta';const actions=[];
			if(!f.installed&&f.installable){if(f.hidden)actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.setFeatureHidden,this,key,false)},['Mostrar sugestão']));else{if(key!=='speedtest')actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,key)},['Instalar']));actions.push(E('button',{class:'ex-feature-link','click':L.bind(this.setFeatureHidden,this,key,true)},['Ocultar sugestão']));}}
			if(key==='argon'&&f.installed&&!f.active)actions.push(E('button',{class:'ex-mini-button','click':L.bind(this.useTheme,this,key)},['Usar tema']));
			if(key==='irqbalance'&&f.installed)actions.push(E('button',{class:'ex-mini-button','click':L.bind(function(){const desired=!f.active;return fs.exec('/usr/sbin/equipe-dashboard-control',['irqbalance-toggle',desired?'1':'0']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar IRQ Balance');ui.addNotification(null,E('p',{},[desired?'IRQ Balance ativado.':'IRQ Balance desativado.']));window.setTimeout(function(){window.location.reload();},900);}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)},[f.active?'Desativar':'Ativar']));
			return E('div',{class:'ex-feature-row'},[E('div',{class:'ex-feature-copy'},[E('div',{class:'ex-feature-name-row'},[E('strong',{},[meta.name]),(meta.recommended?E('span',{class:'ex-recommended-badge'},['RECOMENDADO']):'')]),E('small',{class:'ex-muted'},[meta.description]),f.package?E('code',{},[f.package]):'']),E('div',{class:'ex-feature-state'},[E('span',{class:'ex-pill '+(f.installed?(f.active?'online':'standby'):(f.hidden?'standby':'offline'))},[state]),E('div',{class:'ex-feature-actions'},actions)])]);
		},this));
		const bulkKeys=['argon','sqm','mwan3','nlbwmon','upnp','uhttpd'].filter(L.bind(function(key){const f=this.feature(key)||{};return !f.installed&&f.installable;},this));
		const bulkPanel=E('section',{class:'ex-cleanup-entry'},[E('div',{},[E('strong',{},['Instalação rápida']),E('small',{class:'ex-muted'},[bulkKeys.length?('Instala todos os recursos leves faltantes: '+bulkKeys.map(function(k){return (FEATURE_META[k]&&FEATURE_META[k].name)||k;}).join(', ')):'Todos os recursos leves compatíveis já estão instalados ou indisponíveis neste roteador.'])]),E('button',{class:'ex-mini-button','click':L.bind(this.installMissingFeatures,this,bulkKeys),disabled:!bulkKeys.length},['Instalar faltantes'])]);
		const ipv6Panel=E('section',{class:'ex-cleanup-entry'},[E('div',{},[E('strong',{},['IPv6 totalmente desligado']),E('small',{class:'ex-muted'},['Remove WAN6, ULA, RA/DHCPv6/NDP e regras IPv6. Cria backup antes de aplicar.'])]),E('button',{class:'ex-mini-button','click':L.bind(this.disableIpv6Full,this)},['Desativar IPv6'])]);
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
				E('strong',{},['⚡ Aceleração de Internet & Perfis WAN']),
				E('small',{class:'ex-muted'},['Presets de 1 clique para Fibra XPON, 4G/5G, Starlink, DHCP e IP Fixo. Buffers TCP Turbo (8 MB) e overhead do CAKE.'])
			]),
			E('button',{class:'ex-mini-button','click':L.bind(function(){
				closeModal();
				this.showWanOptimizationsModal();
			},this)},['Configurar aceleração'])
		]);
		ui.showModal('RECURSOS E COMPATIBILIDADE',[
			profilePanel,
			wanOptPanel,
			E('div',{class:'ex-brand-row'},[E('label',{},['Nome do painel']),brandName,E('button',{class:'ex-mini-button','click':L.bind(function(){this.setDashboardTitle(brandName.value);},this)},['Salvar nome'])]),
			E('div',{class:'ex-language-row'},[E('label',{},['Idioma do painel']),language,E('button',{class:'ex-mini-button','click':L.bind(function(){this.setDashboardLanguage(language.value);},this)},['Salvar idioma'])]),
			this.selfUpdatePanel(),
			bulkPanel,
			ipv6Panel,
			E('section',{class:'ex-cleanup-entry'},[E('div',{},[E('strong',{},['Otimização modo ARK']),E('small',{class:'ex-muted'},['Remove painéis e serviços dispensáveis para manter o OpenWrt enxuto. Sempre cria backup antes de remover.'])]),E('button',{class:'ex-mini-button','click':L.bind(this.showArkCleanup,this)},['Analisar e limpar'])]),
			httpsPanel,
			E('section',{class:'ex-appearance-panel'},[E('div',{class:'ex-appearance-heading'},[E('div',{},[E('strong',{},['Aparência']),E('small',{class:'ex-muted'},['No modo automático, o painel acompanha as cores e o modo claro ou escuro do tema LuCI.'])]),appearanceMode]),appearanceColors,E('button',{class:'ex-mini-button ex-save-appearance','click':L.bind(function(){this.setAppearance(appearanceMode.value,primary.value,secondary.value);},this)},['Salvar aparência'])]),
			E('div',{class:'ex-feature-list'},rows),
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Fechar'])])
		]);
	},
	openDnsTurboModal: function() {
		const self = this;
		ui.showModal('Carregando DNS Turbo…', [ E('p', {}, ['Consultando servidores e configurações atuais…']) ]);
		fs.exec('/usr/sbin/equipe-dashboard-control', ['dns-turbo-status']).then(function(r) {
			let status = { allservers: true, servers: '1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4' };
			try { status = JSON.parse(r.stdout || '{}'); } catch(e){}
			const serverList = (status.servers || '1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4').split(' ').filter(function(s){ return !!s; });

			const allserversToggle = E('input', {
				type: 'checkbox',
				checked: !!status.allservers,
				style: 'width: 20px; height: 20px; cursor: pointer;'
			});

			const fallbackToggle = E('input', {
				type: 'checkbox',
				checked: !!status.dhcp_fallback,
				style: 'width: 20px; height: 20px; cursor: pointer;'
			});

			const ipInputs = [
				E('input', { class: 'cbi-input-text', type: 'text', value: serverList[0] || '1.1.1.1', placeholder: 'ex: 1.1.1.1', style: 'width: 100%; box-sizing: border-box;' }),
				E('input', { class: 'cbi-input-text', type: 'text', value: serverList[1] || '8.8.8.8', placeholder: 'ex: 8.8.8.8', style: 'width: 100%; box-sizing: border-box;' }),
				E('input', { class: 'cbi-input-text', type: 'text', value: serverList[2] || '1.0.0.1', placeholder: 'ex: 1.0.0.1 (opcional)', style: 'width: 100%; box-sizing: border-box;' }),
				E('input', { class: 'cbi-input-text', type: 'text', value: serverList[3] || '8.8.4.4', placeholder: 'ex: 8.8.4.4 (opcional)', style: 'width: 100%; box-sizing: border-box;' })
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
					click: function(){ applyPreset(['1.1.1.1', '8.8.8.8', '1.0.0.1', '8.8.4.4']); }
				}, ['🚀 Cloudflare + Google (4x)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['1.1.1.1', '8.8.8.8', '', '']); }
				}, ['⚡ Apenas 2 Principais']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['1.1.1.2', '9.9.9.9', '1.0.0.2', '149.112.112.112']); }
				}, ['🛡️ Segurança (Anti-Malware)']),
				E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					style: 'padding: 9px 10px; font-size: 0.82rem; font-weight: 600; text-align: center; white-space: normal; height: auto; min-height: 42px; display: flex; align-items: center; justify-content: center;',
					click: function(){ applyPreset(['94.140.14.14', '94.140.15.15', '76.76.2.0', '76.76.10.0']); }
				}, ['🚫 Bloqueio de Anúncios'])
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
				E('div', { class: 'ex-device-config-block' }, [
					E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
						E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
							E('strong', {}, ['Consulta Paralela All-Servers (0ms)']),
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Dispara para todos os servidores ao mesmo tempo. O primeiro que responder entrega a página sem esperar filas.'])
						]),
						E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
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
							const s1 = ipInputs[0].value.trim();
							const s2 = ipInputs[1].value.trim();
							const s3 = ipInputs[2].value.trim();
							const s4 = ipInputs[3].value.trim();
							const alls = allserversToggle.checked ? '1' : '0';
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
			dns_servers: '1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4'
		}, data.perfStatus || {});

		const irqbalance = this.feature('irqbalance');
		const conntrackCount = this.perfState.conntrack_count || 0;
		const conntrackMax = this.perfState.conntrack_max || 16384;
		const conntrackPercent = conntrackMax > 0 ? Math.min(100, Math.round((conntrackCount / conntrackMax) * 100)) : 0;

		const countActive = function() {
			let c = 0;
			if (self.perfState.conntrack_recycle) c++;
			if (self.perfState.ram_autopurge) c++;
			if (self.perfState.speedify_installed && !self.perfState.speedify_encryption) c++;
			if (self.perfState.speedify_log_cap) c++;
			if (self.perfState.nlbwmon_lite) c++;
			if (self.perfState.dns_allservers) c++;
			if (irqbalance.installed && irqbalance.active) c++;
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
				self.perfState.dns_allservers ? '1' : '0'
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
					reloadSoon(desired ? 'IRQ Balance ativado. Recarregando…' : 'IRQ Balance desativado. Recarregando…', 900);
				}).catch(function(e) {
					input.checked = !desired;
					irqStatePill.textContent = !desired ? 'LIGADA' : 'DESLIGADA';
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				});
			}
		});
		irqInput.checked = !!irqbalance.active;
		if (!irqbalance.installed) irqInput.disabled = true;

		const irqControl = irqbalance.installed ? E('div', {
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

		const irqRow = E('div', { class: 'ex-perf-item' }, [
			E('div', { class: 'ex-perf-item-content' }, [
				E('div', { class: 'ex-perf-item-head' }, [
					E('span', { class: 'ex-perf-icon' }, ['⚖️']),
					E('strong', {}, ['Distribuição de Interrupções Multicore (IRQ Balance)']),
					E('span', { class: 'ex-perf-badge badge-blue' }, ['DUAL-CORE / QUAD-CORE'])
				]),
				E('p', { class: 'ex-perf-desc' }, ['Equilibra o processamento dos pacotes Wi-Fi, Ethernet e placa de rede entre os núcleos da CPU.']),
				E('small', { class: 'ex-perf-hw-advice' }, ['💡 ' + (irqbalance.installed ? 'Recomendado para processadores Dual-Core e Quad-Core (Filogic 820/830, MediaTek, x86).' : 'Instale o pacote IRQ Balance na Central de Recursos para habilitar.')])
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

		const rows = [
			makePerfRow(
				'⚡',
				'DNS Turbo Paralelo (All-Servers)',
				'RESPOSTA EM 0ms',
				'badge-green',
				'Dispara consultas simultaneamente para 2 a 4 servidores em paralelo (Cloudflare, Google, etc.). O primeiro que responder entrega a página sem fila nem atraso de rota.',
				'Elimina engasgos na abertura de sites e downloads. Toque em “Servidores” para testar e escolher até 4 DNS.',
				!!this.perfState.dns_allservers,
				true,
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
						E('span', { class: 'ex-perf-badge badge-blue' }, ['ROTEADORES <= 16MB'])
					]),
					E('p', { class: 'ex-perf-desc' }, ['Compacta pacotes pesados (ZeroTier) para descompressão em RAM no boot, limpa caches do APK e remove redundâncias na partição Flash.'])
				]),
				purgeStorageBtn
			]),
			makePerfRow(
				'🛡️',
				'Reciclador de Conexões Conntrack (Modo Eventos)',
				'RECOMENDADO PARA EVENTOS',
				'badge-green',
				'Reduz o tempo de retenção de conexões inativas de 5 dias para 30 minutos. Impede que milhares de conexões mortas de Instagram, TikTok e streaming fiquem presas na memória RAM do roteador. (' + conntrackStateText + ')',
				'Altamente recomendado para eventos, comércio, escritórios ou redes com mais de 10 pessoas conectadas.',
				!!this.perfState.conntrack_recycle,
				true,
				'conntrack_recycle',
				false
			),
			makePerfRow(
				'🧹',
				'Auto-Purge de Memória RAM & Caches do Kernel',
				'RECOMENDADO PARA 256MB/512MB RAM',
				'badge-green',
				'Ajusta o descarte contínuo de buffers (vfs_cache_pressure) e executa reciclagem de temporários em /tmp, mantendo margem segura de RAM livre.',
				'Essencial para roteadores com 256MB ou 512MB de RAM (ex: Cudy WR3000) para evitar esgotamento em uso contínuo de várias horas.',
				!!this.perfState.ram_autopurge,
				true,
				'ram_autopurge',
				false
			),
			makePerfRow(
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
			),
			makePerfRow(
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
			),
			makePerfRow(
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
			),
			irqRow
		];

		const initialActive = countActive();
		const summarySubtitle = initialActive > 0 ? (initialActive + ' otimizaç' + (initialActive === 1 ? 'ão ativa' : 'ões ativas') + ' • toque para configurar') : 'Controles de estabilidade e memória para eventos • toque para configurar';

		const bodyEl = E('div', { class: 'ex-perf-body', style: 'display: none;' }, [
			E('div', { class: 'ex-perf-grid' }, rows)
		]);

		const expandBtn = E('button', {
			class: 'ex-mini-button ex-perf-expand-btn',
			type: 'button',
			click: function(ev) {
				ev.preventDefault();
				ev.stopPropagation();
				const isHidden = bodyEl.style.display === 'none';
				bodyEl.style.display = isHidden ? 'block' : 'none';
				expandBtn.textContent = isHidden ? 'Recolher ▴' : 'Expandir ▾';
			}
		}, ['Expandir ▾']);

		const summaryHead = E('div', {
			class: 'ex-perf-summary',
			click: function(ev) {
				const isHidden = bodyEl.style.display === 'none';
				bodyEl.style.display = isHidden ? 'block' : 'none';
				expandBtn.textContent = isHidden ? 'Recolher ▴' : 'Expandir ▾';
			}
		}, [
			E('div', { class: 'ex-perf-summary-left' }, [
				E('span', { class: 'ex-perf-summary-icon' }, ['⚡']),
				E('div', {}, [
					E('div', { class: 'ex-perf-summary-title-row' }, [
						E('strong', {}, ['Desempenho & Blindagem de Memória']),
						E('span', { id: 'ex-perf-active-badge', class: 'ex-pill ' + (initialActive > 0 ? 'online' : 'standby') }, [initialActive > 0 ? (initialActive + ' ATIVAS') : 'PADRÃO'])
					]),
					E('small', { id: 'ex-perf-summary-sub', class: 'ex-muted' }, [summarySubtitle])
				])
			]),
			expandBtn
		]);

		return E('section', {
			class: 'ex-card ex-qos-card ex-perf-opt-card',
			style: 'margin: 16px 0;'
		}, [
			summaryHead,
			bodyEl
		]);
	},
	render: function(loaded) {
		this.board=loaded[0]||{}; this.countries=(loaded[1]&&loaded[1].results)||[]; this.capabilities=loaded[2]||{features:{}}; dashboardLanguage=this.capabilities.language||'pt-br';this.applyAppearance();this.applyBrand(this.capabilities.title);enableTranslation(); const data=loaded[3], w=wifiConfig(data.wireless), release=((this.board.release||{}).description||'').split(' ').slice(0,2).join(' '), panelTitle=this.capabilities.title||'ARK Router';
		const isGamer=(this.capabilities&&this.capabilities.operation_profile)==='gamer';
		const heroEyebrow=isGamer?'🎮 MODO GAMER • BAIXA LATÊNCIA':'CENTRAL DE OPERAÇÕES';
		const gamerButton=E('button',{class:'ex-hero-feature-button '+(isGamer?'ex-hero-gamer-active':'ex-hero-gamer-btn'),'click':L.bind(this.switchProfile,this,isGamer?'standard':'gamer')},[isGamer?'🎮 GAMER ATIVO':'🎮 Modo Gamer']);
		const wifiCard=L.bind(function(kind,title,cfg,isExtra){
			const ssid=cfg.ssid||(kind==='guest'?'ARK Router Visitantes':'ARK Router'),
			      key=cfg.key||'',
			      active=String(cfg.disabled||'0')!=='1',
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
					E('span',{id:'ex-'+kind+'-wifi-status',class:'ex-pill '+(active?'online':'standby')},[active?'ATIVA':'DESLIGADA'])
				]),
				E('div',{class:'ex-secret'},[
					E('code',{id:keyId,'data-hidden':'1',style:'filter:blur(5px)'},[key||'sem senha']),
					E('button',{class:'ex-mini-button','click':function(ev){this.togglePassword(keyId,ev.currentTarget);}.bind(this)},['Ver senha'])
				]),
				bandContent,
				extraGuestRow,
				E('button',{class:'ex-text-button','click':L.bind(function(){this.editWifiNetwork(kind,cfg);},this)},['Configurar nome, senha e status →'])
			]);
		},this);
		const modeButton=L.bind(function(mode,label){return E('button',{id:'ex-mode-'+mode,class:'ex-mode-button','click':L.bind(this.setMwanMode,this,mode,label)},[label]);},this);
		const historyCard=function(kind,title,color){return E('section',{class:'ex-card ex-history-card','style':'--history-color:'+color},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['HISTÓRICO 24 HORAS']),E('h3',{},[title])]),E('strong',{id:'ex-history-'+kind+'-peak',class:'ex-history-peak'},['Coletando…'])]),E('canvas',{id:'ex-history-'+kind,class:'ex-history-chart',width:600,height:126})]);};
		const healthItem=function(icon,label,valueId,barId,color,detailId){return E('div',{class:'ex-health-item','style':'--health-color:'+color},[E('span',{class:'ex-health-icon'},[icon]),E('div',{class:'ex-health-copy'},[E('span',{class:'ex-label'},[label]),E('strong',{id:valueId},['—']),barId?E('div',{class:'ex-health-bar'},[E('i',{id:barId})]):E('small',{class:'ex-health-steady'},['atividade do sistema']),detailId?E('small',{id:detailId,class:'ex-health-detail'},['—']):''])]);};
		const speedWanCard=L.bind(function(wan,label,available){const attrs={class:'ex-mini-button','click':L.bind(this.startSpeedtest,this,wan,label)};if(!available)attrs.disabled=true;return E('div',{class:'ex-speedtest-wan'},[E('div',{class:'ex-card-title'},[E('h3',{},[label]),E('button',attrs,['Executar teste'])]),E('div',{id:'ex-speedtest-'+wan+'-result',class:'ex-speedtest-result'},[E('span',{class:'ex-muted'},[available?'Sem resultado nesta sessão.':'SEM CABO'])])]);},this);
		const sortSelect=E('select',{id:'ex-device-sort-key',class:'cbi-input-select ex-device-sort-select','change':L.bind(function(ev){this.setDeviceSort(ev.currentTarget.value);},this)},[E('option',{value:'total'},['Total consumido']),E('option',{value:'now'},['Agora (velocidade)']),E('option',{value:'name'},['Nome do aparelho'])]);sortSelect.value=this.deviceSortKey||'total';
		const deviceSortControls=E('div',{class:'ex-device-sort-controls'},[E('span',{class:'ex-muted'},['Ordenar']),sortSelect,E('button',{id:'ex-device-sort-dir',class:'ex-mini-button','click':L.bind(function(ev){this.toggleDeviceSortDirection(ev.currentTarget);},this)},[this.deviceSortKey==='name'?(this.deviceSortDir==='asc'?'A → Z':'Z → A'):(this.deviceSortDir==='desc'?'Maior primeiro':'Menor primeiro')])]);
		const arkVersion=((this.capabilities.update||{}).current)||'—';
		const irqbalance=this.feature('irqbalance');
		const irqbalanceInput=E('input',{type:'checkbox','aria-label':'Ativar IRQ Balance','change':L.bind(function(ev){const input=ev.currentTarget,desired=!!input.checked;return fs.exec('/usr/sbin/equipe-dashboard-control',['irqbalance-toggle',desired?'1':'0']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao alterar IRQ Balance');reloadSoon(desired?'IRQ Balance ativado. Recarregando o painel…':'IRQ Balance desativado. Recarregando o painel…',900);}).catch(function(e){input.checked=!desired;ui.addNotification(null,E('p',{},[e.message]),'danger');});},this)});irqbalanceInput.checked=!!irqbalance.active;irqbalanceInput.disabled=!irqbalance.installed;
		const irqbalanceControl=irqbalance.installed?E('div',{class:'ex-device-switch-control'},[E('strong',{class:'ex-device-switch-state'},[irqbalance.active?'LIGADA':'DESLIGADA']),E('label',{class:'ex-switch'},[irqbalanceInput,E('span',{class:'ex-switch-slider'})])]):E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,'irqbalance')},['Instalar IRQ Balance']);
		const mwanInterfaces=(data.mwan&&data.mwan.interfaces)||{}, mwanRunning=Object.keys(mwanInterfaces).some(function(k){return !!mwanInterfaces[k].running;});
		const speedifyFeature=this.feature('speedify'), mwanPaused=String(speedifyFeature.desired_state||'')==='connected'&&!mwanRunning;
		const mwanInput=E('input',{id:'ex-mwan-toggle',type:'checkbox','aria-label':'Ativar Multi-WAN','change':L.bind(function(ev){this.toggleMwan3(ev.currentTarget);},this)});mwanInput.checked=mwanRunning;mwanInput.disabled=mwanPaused;
		const activeWans=getActiveWanList(data);
		const nextWan=getNextAvailableWan(data);
		const qosWanProfiles=sqmWanProfiles(data), qosWanRows=qosWanProfiles.map(function(profile){return infoRow(profile.label+' limites','ex-qos-wan-'+portDomId(profile.network));});
		const wanCards=activeWans.map(L.bind(function(w){
			const id='ex-'+w.domId;
			return E('section',{class:'ex-card ex-wan-card'},[
				E('div',{class:'ex-card-title'},[E('h3',{},[w.label]),E('span',{id:id+'-status',class:'ex-pill standby'},['—'])]),
				infoRow('Modo de conexão',id+'-mode'),
				infoRow('Endereço IPv4',id+'-ip'),
				infoRow('Gateway',id+'-gateway'),
				infoRow('Máscara',id+'-mask'),
				infoRow('DNS recebidos',id+'-dns'),
				infoRow('Link físico',id+'-link'),
				infoRow('Latência',id+'-latency'),
				infoRow('Recebido hoje',id+'-rx-day'),
				infoRow('Enviado hoje',id+'-tx-day'),
				infoRow('Sessão atual',id+'-session'),
				infoRow('Tempo online',id+'-uptime'),
				E('button',{class:'ex-mini-button ex-wan-edit-button','click':L.bind(function(){this.editWan(w.iface);},this)},[w.isPrimary?'Editar internet':'Editar porta / internet'])
			]);
		},this));
		const lanPorts=(data.lanPorts&&data.lanPorts.length)?data.lanPorts:lanPortsFromNetwork(data.networkConfig);
		const lanCards=lanPorts.map(L.bind(function(port){
			const id='ex-lan-'+portDomId(port), label=portLabel(port);
			return E('section',{class:'ex-card ex-lan-card'},[
				E('div',{class:'ex-card-title'},[E('h3',{},[label]),E('span',{id:id+'-status',class:'ex-pill standby'},['—'])]),
				infoRow('Velocidade',id+'-speed'),
				infoRow('Modo',id+'-duplex'),
				infoRow('Recebido',id+'-rx'),
				infoRow('Enviado',id+'-tx'),
				E('button',{class:'ex-mini-button ex-wan-edit-button','click':L.bind(function(){this.editWan(nextWan.iface,port);},this)},['Usar como '+nextWan.label])
			]);
		},this));
		const mwanModeButtons = [];
		if (activeWans.length >= 2) {
			mwanModeButtons.push(modeButton('failover', 'Failover (WAN1 principal)'));
			mwanModeButtons.push(modeButton('failover_wan2', 'Failover (WAN2 principal)'));
			mwanModeButtons.push(modeButton('balanced', 'Balancear'));
		}
		activeWans.forEach(function(w) {
			mwanModeButtons.push(modeButton(w.domId, 'Só ' + w.label));
		});
		const speedifySection=this.speedifyCard(data), starlinkSection=this._starlinkPanel;
		const allWifiCards = [
			wifiCard('main','Acesso principal',w.main),
			wifiCard('guest','Visitantes com upload limitado',w.guest)
		].concat((w.extras||[]).map(function(e){ return wifiCard(e.id, (e.network === 'guest' ? 'Rede isolada' : 'Rede adicional'), e, true); }));

		const wifiBlock = w.hasRadios ? E('div', { class: 'ex-wifi-block' }, [
			E('div', { class: 'ex-wifi-block-head', style: 'display:flex;align-items:center;justify-content:space-between;margin:22px 0 10px;' }, [
				E('div', {}, [
					E('span', { class: 'ex-kicker' }, ['CONECTIVIDADE SEM FIO']),
					E('h3', { style: 'margin:0;font-size:1.15rem;' }, ['Redes Wi‑Fi'])
				]),
				E('button', { class: 'ex-mini-button ex-wifi-add-btn', 'click': L.bind(this.showAddWifiModal, this) }, ['+ Adicionar Rede Wi‑Fi'])
			]),
			E('div', { class: 'ex-grid ex-grid-2 ex-wifi-grid' }, allWifiCards)
		]) : E('section', { class: 'ex-card ex-wifi-card ex-center-card', style: 'grid-column: 1 / -1; margin: 18px 0;' }, [
			bigIcon('<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/><path d="M10.71 5.05A16 16 0 0 1 22.58 9"/><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>'),
			E('strong', { style: 'font-size: 1.05rem; margin-top: 8px;' }, ['Hardware Wi‑Fi não detectado']),
			E('small', { class: 'ex-muted' }, ['Este dispositivo opera como roteador / gateway cabeado. Nenhuma placa de rede sem fio foi encontrada no sistema.'])
		]);

		const root=E('div',{class:'ex-dashboard'},[
			E('section',{class:'ex-hero'+(isGamer?' ex-hero-gamer':'')},[E('div',{},[E('span',{class:'ex-eyebrow'},[heroEyebrow]),E('h2',{},[panelTitle]),E('p',{},[this.board.model||'OpenWrt','  •  ',release,'  •  ARK Router ',arkVersion]),E('div',{id:'ex-speedify-top',class:'ex-hero-speedify standby',style:'display:none'},[E('span',{},['Speedify']),E('strong',{},['—']),E('small',{},['—'])])]),E('div',{class:'ex-hero-status'},[E('span',{id:'ex-global-status',class:'ex-pill standby'},['VERIFICANDO']),E('strong',{id:'ex-clock'},['--:--:--']),E('small',{id:'ex-refresh-summary'},['sessão de 12 horas • atualização a cada 3 segundos']),E('div',{class:'ex-hero-actions'},[gamerButton,E('button',{class:'ex-hero-feature-button ex-hero-setup-button','click':L.bind(this.showEzSetup,this)},['Ark - Setup']),E('button',{class:'ex-hero-feature-button','click':L.bind(this.showFeatureCenter,this)},['Recursos'])])])]),
			E('section',{class:'ex-card ex-health-strip'},[E('div',{class:'ex-health-head'},[E('div',{},[E('span',{class:'ex-kicker'},['SAÚDE DO ROTEADOR']),E('small',{},['Ligado há ',E('strong',{id:'ex-uptime'},['—'])])]),E('span',{id:'ex-health-status',class:'ex-pill standby'},['VERIFICANDO'])]),E('div',{class:'ex-health-items'},[healthItem('℃','Temperatura','ex-temperature',null,'#f59e0b'),healthItem('▦','Memória','ex-memory','ex-memory-bar','#3b82f6','ex-memory-detail'),healthItem('▣','Armazenamento','ex-storage','ex-storage-bar','#8b5cf6','ex-storage-detail'),healthItem('⌁','Carga','ex-load',null,'#10b981')])]),
			this.systemPerfCard(data),
			E('div',{class:'ex-grid ex-grid-2'},[metricCard('↓','Download agora','ex-download','ex-down-total','#3b82f6'),metricCard('↑','Upload agora','ex-upload','ex-up-total','#a855f7')]),
			E('div',{class:'ex-grid ex-grid-2 ex-history-grid'},[historyCard('down','Download ao longo do dia','#3b82f6'),historyCard('up','Upload ao longo do dia','#a855f7')]),
			E('p',{id:'ex-history-samples',class:'ex-history-caption'},['A primeira amostra aparecerá em até 1 minuto']),
			starlinkSection,
			E('div',{class:'ex-grid ex-grid-2'},wanCards),
			E('section',{class:'ex-card ex-mwan-control'},[
				E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['MULTI‑WAN']),E('h3',{},['Modo atual: ',E('span',{id:'ex-mwan-mode'},['Failover WAN1 → WAN2'])])]),E('span',{id:'ex-mwan-status',class:'ex-pill '+(mwanRunning?'online':(mwanPaused?'standby':'offline'))},[mwanPaused?'PAUSADO':(mwanRunning?'ATIVO':'DESLIGADO')])]),
				E('div',{class:'ex-qos-toggle-row ex-mwan-toggle-row'},[E('div',{},[E('strong',{},['Serviço Multi-WAN']),E('small',{class:'ex-muted'},[mwanPaused?'Pausado automaticamente enquanto o Speedify controla as rotas.':'Liga failover/balanceamento sem alterar o modo escolhido.'])]),E('div',{class:'ex-device-switch-control'},[E('strong',{id:'ex-mwan-toggle-state',class:'ex-device-switch-state'},[mwanPaused?'PAUSADO PELO SPEEDIFY':(mwanRunning?'LIGADO':'DESLIGADO')]),E('label',{class:'ex-switch'},[mwanInput,E('span',{class:'ex-switch-slider'})])])]),
				E('details',{class:'ex-mwan-editor'},[
					E('summary',{},['Editar modo do Multi‑WAN']),
					E('div',{class:'ex-mwan-editor-body'},[
						E('p',{class:'ex-muted'},[activeWans.length>=2?'Escolha um modo abaixo. Depois do clique, ainda será necessário confirmar antes que qualquer alteração seja aplicada.':'Quando houver 2 ou mais conexões WAN ativas, você poderá alternar entre Failover e Balanceamento.']),
						E('div',{class:'ex-mode-grid'},mwanModeButtons),
						E('small',{class:'ex-muted'},['Balanceamento distribui conexões entre os links; não soma a velocidade de um único envio.'])
					])
				])
			]),
			E('section',{class:'ex-card ex-qos-card'},[
				E('div',{class:'ex-card-title'},[
					E('div',{},[E('span',{class:'ex-kicker'},['CONTROLE DE FILAS']),E('h3',{},['CAKE / SQM'])]),
					E('span',{id:'ex-qos-status',class:'ex-pill standby'},['—'])
				]),
				E('div',{class:'ex-qos-toggle-row'},[
					E('div',{},[E('strong',{},['SQM / CAKE']),E('small',{class:'ex-muted'},['Liga ou desliga as filas configuradas'])]),
					E('div',{class:'ex-device-switch-control'},[
						E('strong',{id:'ex-qos-toggle-state',class:'ex-device-switch-state'},['—']),
						E('label',{class:'ex-switch'},[E('input',{id:'ex-qos-toggle',type:'checkbox','change':L.bind(function(ev){this.toggleSqm(ev.currentTarget);},this)}),E('span',{class:'ex-switch-slider'})])
					])
				]),
				E('p',{class:'ex-muted',style:'margin:6px 0 10px;line-height:1.45;'},[
					'O CAKE (Smart Queue Management) combate o bufferbloat, gerencia a latência em tempo real e impede que downloads ou vídeos pesados aumentem o ping de jogos e travem chamadas de voz de toda a rede.'
				]),
				E('div',{class:'ex-grid ex-grid-3 ex-qos-grid'},qosWanRows.concat([infoRow('Rede visitante','ex-qos-guest'),infoRow('DNS do roteador','ex-dns')])),
				E('div',{class:'ex-grid ex-grid-2',style:'margin-top:14px;gap:12px;'},[
					E('button',{class:'ex-button ex-qos-edit-button',style:'margin-top:0;','click':L.bind(function(){try{this.editSqmLimits();}catch(e){ui.addNotification(null,E('p',{},[e.message||String(e)]),'danger');}},this)},['Editar limites']),
					E('button',{class:'ex-button',style:'margin-top:0;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);box-shadow:inset 0 1px 0 rgba(255,255,255,.1);font-weight:650;cursor:pointer;','click':L.bind(this.openFastCom,this)},['🎬 Testar velocidade da internet'])
				])
			]),
			E('section',{class:'ex-card ex-lan-config-card'},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['REDE PRINCIPAL']),E('h3',{},['LAN / DHCP'])]),E('button',{class:'ex-mini-button','click':L.bind(function(){this.editLan();},this)},['Editar IP, DHCP e DNS'])]),E('div',{class:'ex-grid ex-grid-3 ex-qos-grid'},[infoRow('IP do roteador','ex-lan-ip'),infoRow('Faixa DHCP','ex-lan-dhcp'),infoRow('Máscara','ex-lan-mask'),infoRow('DNS enviado','ex-lan-dns')]),E('p',{class:'ex-muted'},['Use para trocar entre redes 192.168.x.x, 10.0.x.x ou definir manualmente a faixa e os DNS que os dispositivos recebem.'])]),
			E('div',{class:'ex-lan-block'},[E('div',{class:'ex-lan-title'},[E('div',{},[E('span',{class:'ex-kicker'},['PORTAS CABEADAS']),E('h3',{},['LAN disponíveis'])]),E('small',{class:'ex-muted'},['Portas em modo LAN aparecem aqui; ao converter uma porta em '+nextWan.label+', ela sai desta lista e vira uma nova conexão de internet.'])]),E('div',{class:'ex-grid ex-grid-2'},lanCards.length?lanCards:[E('section',{class:'ex-card ex-lan-card ex-center-card'},[E('strong',{},['Nenhuma porta LAN disponível']),E('small',{class:'ex-muted'},['Todas as portas cabeadas livres estão em uso como WAN ou não foram detectadas.'])])])]),
			wifiBlock,
			E('div',{class:'ex-grid ex-grid-2',style:'margin:10px 0 16px;'},[
				E('section',{class:'ex-card ex-center-card'},[bigIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1.2" fill="currentColor"/></svg>'),E('span',{class:'ex-label'},[w.main.ssid||'Rede principal']),E('strong',{id:'ex-main-clients',class:'ex-number'},['0']),E('small',{id:'ex-main-wifi',class:'ex-muted'},['0 no Wi-Fi'])]),
				E('section',{class:'ex-card ex-center-card'},[bigIcon('<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'),E('span',{class:'ex-label'},[w.guest.ssid||'Visitantes']),E('strong',{id:'ex-guest-clients',class:'ex-number'},['0']),E('small',{id:'ex-guest-wifi',class:'ex-muted'},['0 no Wi-Fi'])])
			]),
			E('section',{class:'ex-card ex-channel-card'},[E('div',{class:'ex-card-title'},[E('div',{},[E('span',{class:'ex-kicker'},['AMBIENTE WI‑FI']),E('h3',{},['Canais e interferência'])]),E('button',{class:'ex-button ex-inline-button','click':L.bind(function(ev){this.analyzeChannels(ev.currentTarget);},this)},['Analisar canais agora'])]),E('div',{class:'ex-country-control'},[E('div',{},[E('span',{class:'ex-label'},['PAÍS / DOMÍNIO REGULATÓRIO']),E('strong',{id:'ex-country-current'},['—'])]),E('button',{class:'ex-mini-button','click':L.bind(function(){this.changeCountry();},this)},['Alterar país'])]),E('div',{class:'ex-channel-mode-control'},[E('div',{},[E('strong',{},['Seleção automática de canais']),E('small',{id:'ex-channel-mode-summary',class:'ex-muted'},['Verificando…'])]),E('label',{class:'ex-switch'},[E('input',{id:'ex-channel-auto-toggle',type:'checkbox','aria-label':translateText('Seleção automática de canais'),'change':L.bind(function(ev){this.toggleAutoChannels(ev.currentTarget);},this)}),E('span',{class:'ex-switch-slider'})])]),E('div',{class:'ex-grid ex-grid-2 ex-channel-grid'},[E('div',{},[E('div',{class:'ex-channel-band-head'},[E('b',{},['2,4 GHz']),E('span',{id:'ex-wifi-2-mode',class:'ex-pill standby'},['—'])]),E('span',{id:'ex-wifi-2'},['—'])]),E('div',{},[E('div',{class:'ex-channel-band-head'},[E('b',{},['5 GHz']),E('span',{id:'ex-wifi-5-mode',class:'ex-pill standby'},['—'])]),E('span',{id:'ex-wifi-5'},['—'])])]),E('p',{id:'ex-wifi-noise',class:'ex-muted'},['—']),E('p',{id:'ex-scan-result',class:'ex-scan-result'},['A análise é manual e apenas recomenda canais; não interrompe os usuários.']),E('div',{class:'ex-channel-actions'},[E('button',{class:'ex-channel-action','click':L.bind(this.showManualChannelsModal,this)},['Escolher canais']),E('button',{id:'ex-apply-channels',class:'ex-channel-action primary',disabled:true,'click':L.bind(function(){this.changeChannels('fixed');},this)},['Analisar antes de aplicar']),E('button',{class:'ex-channel-action','click':L.bind(function(){this.changeWifiWidth();},this)},['Largura / desempenho'])])]),
			E('section',{class:'ex-card ex-devices'},[
				E('div',{class:'ex-card-title'},[
					E('div',{},[
						E('span',{class:'ex-kicker'},['DISPOSITIVOS']),
						E('h3',{},['Quem está conectado'])
					]),
					E('div',{class:'ex-device-title-actions'},[
						deviceSortControls,
						E('span',{id:'ex-device-count',class:'ex-pill online'},['0 conectados'])
					])
				]),
				E('details',{id:'ex-device-details',open:true},[
					E('summary',{},[
						E('div',{class:'ex-devices-summary-content'},[
							E('span',{class:'ex-devices-summary-icon'},['📱']),
							E('span',{},['Dispositivos conectados e tráfego em tempo real'])
						]),
						E('span',{class:'ex-devices-summary-arrow'},['▼'])
					]),
					E('div',{class:'ex-table-wrap'},[
						E('table',{class:'ex-device-table'},[
							E('thead',{},[
								E('tr',{},[
									E('th',{},['Dispositivo']),
									E('th',{class:'ex-hide-mobile'},['Rede / sinal']),
									E('th',{},['Agora']),
									E('th',{},['Total']),
									E('th',{},[''])
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
				])
			]),
			this.zerotierCard(),
			speedifySection,
			E('section',{class:'ex-card ex-reboot-card'},[E('div',{},[E('span',{class:'ex-kicker'},['SISTEMA']),E('h3',{},['Reiniciar o roteador']),E('p',{class:'ex-muted'},['Interrompe a internet por alguns minutos e encerra as sessões abertas.'])]),E('button',{class:'ex-reboot-button','click':L.bind(function(){this.requestReboot();},this)},['Reiniciar…'])])
		]);
		if(!this.feature('history').installed){const h=root.querySelector('.ex-history-grid'),c=root.querySelector('.ex-history-caption');if(h)h.remove();if(c)c.remove();}
		if(!this.feature('wifi').installed){const g=root.querySelector('.ex-wifi-grid'),c=root.querySelector('.ex-channel-card');if(g)g.remove();if(c)c.remove();}
		if(!this.feature('temperature').installed){const t=root.querySelector('#ex-temperature');if(t&&t.closest('.ex-health-item'))t.closest('.ex-health-item').remove();const hi=root.querySelector('.ex-health-items');if(hi)hi.classList.add('compact-3');}
		if(!this.feature('custom_qos').installed){const q=root.querySelector('#ex-qos-guest');if(q&&q.closest('.ex-row'))q.closest('.ex-row').remove();}
		if(!this.feature('sqm').installed){const q=root.querySelector('.ex-qos-card');if(q)q.remove();}
		if(!this.feature('mwan3').installed){const m=root.querySelector('.ex-mwan-control');if(m)m.remove();}
		if(!this.feature('nlbwmon').installed){const note=root.querySelector('.ex-table-note');if(note)note.textContent='O monitor de consumo não está instalado; a lista de dispositivos continua disponível, sem velocidade individual.';}
		translateTree(root);
		this.dashboardRoot=root;
		const deviceDetails=root.querySelector('#ex-device-details');
		if(deviceDetails)deviceDetails.addEventListener('toggle',L.bind(function(){if(this.currentData)this.updateRefreshSummary(this.currentData);this.scheduleAdaptiveRefresh(0);},this));
		this.update(data); this.scheduleAdaptiveRefresh(); return root;
	},
	handleSaveApply:null, handleSave:null, handleReset:null
});
