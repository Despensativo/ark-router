// /src/modules/vpn.js - ARK Router LuCI View Module
const vpnMethods = {
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
		const self = this;
		ui.showModal('Desligar Tailscale',[E('p',{},['Desligar o Tailscale neste roteador? O acesso remoto pela VPN vai parar, mas a configuração/login local permanecem.']),E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-negative','click':function(){return fs.exec('/usr/sbin/equipe-dashboard-control',['tailscale-down']).then(function(r){if(r.code)throw new Error(r.stderr||'Falha ao desligar Tailscale');ui.hideModal();self.triggerImmediateRefresh('Tailscale desligado com sucesso!', 'info');}).catch(function(e){ui.addNotification(null,E('p',{},[e.message]),'danger');});}},['Desligar'])])]);
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
					installed?'':E('button',{class:'ex-mini-button','click':L.bind(this.installFeature,this,'zerotier')},['Instalar ZeroTier']),
					installed && !active ? E('button',{class:'ex-mini-button','click':L.bind(this.enableZerotier,this)},['▶ Ativar ZeroTier']) : '',
					installed && active ? E('button',{class:'ex-mini-button','click':L.bind(this.joinZerotier,this)},['Entrar / trocar rede']) : '',
					(active && f.ip && f.ip!=='—') ? E('a',{class:'ex-mini-button',href:'http://'+String(f.ip).replace(/\/.*$/,''),target:'_blank',rel:'noopener noreferrer'},['Abrir ARK remoto']) : '',
					installed && active ? E('button',{class:'ex-feature-link','click':L.bind(this.disableZerotier,this)},['⏹ Desligar']) : '',
					installed ? E('button',{class:'ex-feature-link','click':L.bind(this.leaveZerotier,this)},['Sair da rede']) : '',
					E('a',{class:'ex-text-link',href:'https://my.zerotier.com/network',target:'_blank',rel:'noopener noreferrer'},['ZeroTier Central →'])
				]),
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
