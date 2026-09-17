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
		const split=E('input',{type:'checkbox'});
		split.checked=!!current.split;
		const curEnc=current.encryption||'sae-mixed';
		const encSelect = E('select', { class: 'cbi-input-select', style: 'width:100%' }, [
			E('option', { value: 'sae-mixed' }, ['WPA2 / WPA3 Misto (Mais Seguro)']),
			E('option', { value: 'psk2' }, ['WPA2-PSK (Máxima Compatibilidade IoT)']),
			E('option', { value: 'sae' }, ['WPA3-SAE Puro (Máxima Segurança Moderna)']),
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
		const unifiedRow=E('label',{class:'ex-device-config-block'},[E('strong',{},['Nome da rede WiFi']),ssid,E('small',{class:'ex-muted'},['Aplicado ao 2,4 GHz e ao 5 GHz.'])]);
		const splitRows=E('div',{},[E('label',{class:'ex-device-config-block'},[E('strong',{},['Nome 2,4 GHz']),ssid2]),E('label',{class:'ex-device-config-block'},[E('strong',{},['Nome 5 GHz']),ssid5])]);
		const updateSplit=function(){unifiedRow.style.display=split.checked?'none':'block';splitRows.style.display=split.checked?'block':'none';};
		split.addEventListener('change',function(){if(split.checked){ssid2.value=ssid2.value||ssid.value;ssid5.value=ssid5.value||ssid.value;}else{ssid.value=ssid.value||ssid2.value||ssid5.value;}updateSplit();});
		updateSplit();

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
				encAlert.innerHTML = '<strong>PMF Desativado:</strong> Recomendado para Casa Inteligente. Garante a conexão de dispositivos IoT antigos e modernos (Tuya/Sonoff) sem falhas de autenticação 802.11w.';
			} else if (encVal === 'sae-mixed' || encVal === 'sae') {
				encAlert.className = 'alert-message warning';
				encAlert.style.display = 'block';
				encAlert.innerHTML = '<strong>Atenção ao WPA3 e PMF:</strong> A segurança WPA3 exige/ativa o PMF (Protected Management Frames). Vários dispositivos Smart Home/IoT recusarão a conexão.';
			} else {
				encAlert.style.display = 'none';
			}
		};
		encSelect.addEventListener('change', updateEncVisibility);
		updateEncVisibility();

		const rows=[
			E('label',{class:'ex-device-config-block'},[E('strong',{},['Segurança / Criptografia']),encSelect,encAlert]),
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

		const rows = [
			E('label', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['Canal 2,4 GHz']),
				ch2Select,
				ch2Note,
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
