// ARK Router: EZ-Setup Wizard & Cleanup Module
const ezsetupMethods = {
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
	}
};
