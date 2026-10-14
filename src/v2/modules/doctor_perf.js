// /src/modules/doctor_perf.js - ARK Router LuCI View Module (Performance Tuning & Ark Doctor)
const doctorPerfMethods = {
	showHighRamZramConfirmModal: function(f) {
		const finalButton = E('button', { class: 'btn cbi-button cbi-button-negative', disabled: true }, [_t('Aguarde 5 s')]);
		const started = Date.now();
		const timer = window.setInterval(function() {
			const left = Math.ceil((5000 - (Date.now() - started)) / 1000);
			if (left > 0) {
				finalButton.textContent = _t('Aguarde %s s').replace('%s', left);
				return;
			}
			window.clearInterval(timer);
			finalButton.disabled = false;
			finalButton.textContent = _t('Confirmar ativação mesmo assim');
		}, 100);

		finalButton.addEventListener('click', L.bind(function() {
			window.clearInterval(timer);
			finalButton.disabled = true;
			finalButton.textContent = _t('Ativando ZRAM…');
			return fs.exec('/usr/sbin/equipe-dashboard-control', ['zram-toggle', '1']).then(function(r) {
				if (r.code) throw new Error(r.stderr || 'Falha ao ativar ZRAM');
				ui.hideModal();
				ui.addNotification(null, E('p', {}, [_t('Compressão de memória (ZRAM) ativada em modo forçado pelo usuário.')]));
				window.setTimeout(function() { window.location.reload(); }, 900);
			}).catch(function(e) {
				finalButton.disabled = false;
				finalButton.textContent = _t('Confirmar ativação mesmo assim');
				ui.addNotification(null, E('p', {}, [e.message]), 'danger');
			});
		}, this));

		ui.showModal(_t('⚠️ Confirmação: Compressão ZRAM em Alta Capacidade'), [
			E('p', { class: 'alert-message warning' }, [
				_t('Memória RAM física abundante detectada: este roteador possui %s de RAM. A memória é mais do que suficiente para o OpenWrt e todos os serviços sem qualquer risco de esgotamento.').replace('%s', (f.mem_total_mb || '512+') + ' MB')
			]),
			E('p', {}, [
				_t('A compressão ZRAM forçará o processador a gastar ciclos contínuos de CPU comprimindo dados em tempo real desnecessariamente. Isso eleva o consumo elétrico e pode reduzir o rendimento máximo de banda (throughput).')
			]),
			E('p', { class: 'alert-message info', style: 'margin-top: 8px; font-size: 0.9rem;' }, [
				_t('Trava de segurança de 5 segundos: projetada para evitar ativação acidental em equipamentos de ponta. Se você realmente deseja ativar para experimentos ou laboratório, aguarde a contagem.')
			]),
			E('div', { class: 'right' }, [
				E('button', {
					class: 'btn cbi-button cbi-button-neutral',
					click: function() { window.clearInterval(timer); ui.hideModal(); }
				}, [_t('Cancelar')]),
				' ',
				finalButton
			])
		]);
	},
	showLowEndMipsZramConfirmModal: function(f) {
		const confirmBtn = E('button', { class: 'btn cbi-button cbi-button-positive' }, [_t('Ativar em modo protegido (32 MB)')]);
		confirmBtn.addEventListener('click', L.bind(function() {
			confirmBtn.disabled = true;
			confirmBtn.textContent = _t('Ativando ZRAM protegido…');
			return fs.exec('/usr/sbin/equipe-dashboard-control', ['zram-toggle', '1']).then(function(r) {
				if (r.code) throw new Error(r.stderr || 'Falha ao ativar ZRAM');
				ui.hideModal();
				ui.addNotification(null, E('p', {}, [_t('Compressão ZRAM ativada em modo protegido (swappiness=15, máx 32 MB).')]));
				window.setTimeout(function() { window.location.reload(); }, 900);
			}).catch(function(e) {
				confirmBtn.disabled = false;
				confirmBtn.textContent = _t('Ativar em modo protegido (32 MB)');
				ui.addNotification(null, E('p', {}, [e.message]), 'danger');
			});
		}, this));

		ui.showModal(_t('⚠️ Compressão ZRAM em Processador Mononúcleo (MIPS)'), [
			E('p', { class: 'alert-message warning' }, [
				_t('Processador mononúcleo (MIPS single-core) detectado. Comprimir dados em tempo real consome CPU e pode causar lentidão se a rede for exigida ao máximo.')
			]),
			E('p', {}, [
				_t('Para proteger o roteador contra travamentos e garantir latência baixa, o ARK Router aplicará proteção automática:')
			]),
			E('ul', { style: 'margin: 8px 0 12px 20px; font-size: 0.9rem;' }, [
				E('li', {}, [E('strong', {}, [_t('Swappiness conservador (15):'), ' ']), _t('evita que o kernel compacte memória preventivamente sem necessidade real.')]),
				E('li', {}, [E('strong', {}, [_t('Teto rígido de 32 MB:'), ' ']), _t('impede que blocos comprimidos sobrecarreguem o cache de instruções da CPU.')])
			]),
			E('div', { class: 'right' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', click: ui.hideModal }, [_t('Cancelar')]),
				' ',
				confirmBtn
			])
		]);
	},
	openDnsTurboModal: function() {
		const self = this;
		ui.showModal('Carregando DNS Turbo…', [ E('p', {}, ['Consultando servidores e configurações atuais…']) ]);
		fs.exec('/usr/sbin/equipe-dashboard-control', ['dns-turbo-status']).then(function(r) {
			let status = { allservers: true, servers: '1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4' };
			try { Object.assign(status, JSON.parse(r.stdout || '{}')); } catch(e){}
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

			const memMb = Number(status.mem_total_mb || 0);
			let recCache = 10000;
			let memBadgeText = '1 GB RAM (Alta Capacidade)';
			if (memMb > 0 && memMb < 200) {
				recCache = 1000;
				memBadgeText = (memMb ? memMb + ' MB' : '128 MB') + ' RAM (Econômico)';
			} else if (memMb >= 200 && memMb < 400) {
				recCache = 2500;
				memBadgeText = (memMb ? memMb + ' MB' : '256 MB') + ' RAM (Médio)';
			} else if (memMb >= 400 && memMb < 700) {
				recCache = 5000;
				memBadgeText = (memMb ? memMb + ' MB' : '512 MB') + ' RAM (Intermediário)';
			} else if (memMb >= 700) {
				recCache = 10000;
				memBadgeText = (memMb ? memMb + ' MB' : '1 GB+') + ' RAM (Alta Capacidade)';
			}

			const currentCache = Number(status.cachesize || 150);
			const standardOptions = [10000, 5000, 2500, 1000, 150];
			const isKnownPreset = standardOptions.indexOf(currentCache) !== -1;

			const cacheSelect = E('select', {
				class: 'cbi-input-select',
				style: 'width: 100%; box-sizing: border-box; font-size: 0.88rem; padding: 7px 10px; font-weight: 600;'
			}, [
				E('option', { value: '10000' }, ['🚀 10.000 domínios na RAM (~1,5 MB)' + (recCache === 10000 ? ' ⭐ (Recomendado para seu Hardware)' : '')]),
				E('option', { value: '5000' }, ['⚡ 5.000 domínios na RAM (~800 KB)' + (recCache === 5000 ? ' ⭐ (Recomendado para seu Hardware)' : '')]),
				E('option', { value: '2500' }, ['🔹 2.500 domínios na RAM (~400 KB)' + (recCache === 2500 ? ' ⭐ (Recomendado para seu Hardware)' : '')]),
				E('option', { value: '1000' }, ['🔸 1.000 domínios na RAM (~160 KB)' + (recCache === 1000 ? ' ⭐ (Recomendado para seu Hardware)' : '')]),
				E('option', { value: '150' }, ['🐢 150 domínios (Padrão de Fábrica OpenWrt / Mínimo)' + (recCache === 150 ? ' ⭐ (Recomendado)' : '')]),
				E('option', { value: 'custom' }, ['✏️ Personalizado (Digitar valor manual)'])
			]);

			if (isKnownPreset) {
				cacheSelect.value = String(currentCache);
			} else {
				cacheSelect.value = 'custom';
			}

			const customCacheInput = E('input', {
				class: 'cbi-input-text',
				type: 'number',
				min: 150,
				max: 50000,
				step: 500,
				value: currentCache,
				style: 'width: 100%; box-sizing: border-box;'
			});

			const customCacheWrapper = E('div', {
				style: 'margin-top: 8px; display: ' + (isKnownPreset ? 'none' : 'block') + ';'
			}, [
				E('small', { class: 'ex-muted', style: 'display: block; margin-bottom: 4px;' }, ['Digite a quantidade de domínios em cache (150 a 50.000):']),
				customCacheInput
			]);

			cacheSelect.addEventListener('change', function() {
				if (cacheSelect.value === 'custom') {
					customCacheWrapper.style.display = 'block';
				} else {
					customCacheWrapper.style.display = 'none';
					customCacheInput.value = cacheSelect.value;
				}
			});

			const quickApplyRecBtn = (currentCache < recCache) ? E('div', { style: 'margin-top: 8px;' }, [
				E('button', {
					type: 'button',
					class: 'ex-mini-button',
					style: 'font-weight: 700; background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 5px 10px; border-radius: 6px; cursor: pointer;',
					click: function() {
						cacheSelect.value = String(recCache);
						customCacheWrapper.style.display = 'none';
						customCacheInput.value = String(recCache);
					}
				}, ['⚡ Aplicar Recomendado para seu Hardware (' + recCache.toLocaleString('pt-BR') + ' domínios)'])
			]) : '';

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
					E('div', { style: 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 6px;' }, [
						E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
							E('strong', {}, ['Tamanho do Cache DNS na Memória RAM (0ms)']),
							E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Guarda domínios na memória do roteador. Sites acessados respondem instantaneamente sem consultar a internet.'])
						]),
						E('span', { class: 'ex-perf-badge badge-blue', style: 'font-weight: 700;' }, [memBadgeText])
					]),
					cacheSelect,
					customCacheWrapper,
					quickApplyRecBtn,
					E('small', { class: 'ex-muted', style: 'display: block; margin-top: 6px;' }, ['O OpenWrt vem de fábrica com apenas 150 domínios. Em seu hardware, 10.000 domínios consomem menos de 2 MB de RAM e deixam a navegação em 0ms.'])
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
							const selectedCache = cacheSelect.value === 'custom' ? (parseInt(customCacheInput.value, 10) || 150) : (parseInt(cacheSelect.value, 10) || 10000);
							const args = ['dns-turbo-save', alls, s1, s2, s3, s4, fallback, String(selectedCache)];
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

			const capMemMb = Number(status.mem_total_mb || 0);
			let capRecCache = 10000;
			if (capMemMb > 0 && capMemMb < 200) capRecCache = 1000;
			else if (capMemMb >= 200 && capMemMb < 400) capRecCache = 2500;
			else if (capMemMb >= 400 && capMemMb < 700) capRecCache = 5000;
			else capRecCache = 10000;

			const capCurCache = Number(status.cachesize || 10000);
			const capPresets = [10000, 5000, 2500, 1000, 150];
			const capIsKnown = capPresets.indexOf(capCurCache) !== -1;

			const capCacheSelect = E('select', {
				class: 'cbi-input-select',
				style: 'width: 100%; box-sizing: border-box; font-size: 0.88rem; padding: 6px 10px; font-weight: 550;'
			}, [
				E('option', { value: '10000' }, ['🚀 10.000 domínios (~1,5 MB RAM)' + (capRecCache === 10000 ? ' ⭐ (Recomendado)' : '')]),
				E('option', { value: '5000' }, ['⚡ 5.000 domínios (~800 KB RAM)' + (capRecCache === 5000 ? ' ⭐ (Recomendado)' : '')]),
				E('option', { value: '2500' }, ['🔹 2.500 domínios (~400 KB RAM)' + (capRecCache === 2500 ? ' ⭐ (Recomendado)' : '')]),
				E('option', { value: '1000' }, ['🔸 1.000 domínios (~160 KB RAM)' + (capRecCache === 1000 ? ' ⭐ (Recomendado)' : '')]),
				E('option', { value: '150' }, ['🐢 150 domínios (Padrão OpenWrt)' + (capRecCache === 150 ? ' ⭐ (Recomendado)' : '')]),
				E('option', { value: 'custom' }, ['✏️ Personalizado (Digitar valor)'])
			]);

			if (capIsKnown) {
				capCacheSelect.value = String(capCurCache);
			} else {
				capCacheSelect.value = 'custom';
			}

			const cacheInput = E('input', {
				class: 'cbi-input-text',
				type: 'number',
				value: capCurCache,
				min: 150,
				max: 50000,
				step: 500,
				style: 'width: 100%; box-sizing: border-box;' + (capIsKnown ? ' display: none;' : ' margin-top: 6px;')
			});

			capCacheSelect.addEventListener('change', function() {
				if (capCacheSelect.value === 'custom') {
					cacheInput.style.display = 'block';
				} else {
					cacheInput.style.display = 'none';
					cacheInput.value = capCacheSelect.value;
				}
			});

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
				if (capPresets.indexOf(Number(cache)) !== -1) {
					capCacheSelect.value = String(cache);
					cacheInput.style.display = 'none';
				} else {
					capCacheSelect.value = 'custom';
					cacheInput.style.display = 'block';
				}
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
							E('span', {}, ['Tamanho do Cache DNS na Memória:']),
							capCacheSelect,
							cacheInput,
							E('small', { class: 'ex-muted' }, ['Mantém consultas resolvidas em 0ms sem reconsultar a internet'])
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
							const cacheVal = capCacheSelect.value === 'custom' ? (cacheInput.value.trim() || '150') : capCacheSelect.value;
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
		const zramFeat = this.feature('zram') || {};
		const upnpFeat = this.feature('upnp') || {};
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
			const isNativeIrq = !!irqbalance.native_hw || (!irqbalance.installable && irqbalance.reason && (irqbalance.reason.indexOf('nativamente') !== -1 || irqbalance.reason.indexOf('Desnecessário') !== -1));
			if ((cpuCores > 1 && irqbalance.installed && irqbalance.active) || isNativeIrq) c++;
			if (self.perfState.dns_allservers) c++;
			if (self.perfState.igmp_snooping) c++;
			if (zramFeat.installed && zramFeat.active) c++;
			if (upnpFeat.installed && upnpFeat.active) c++;
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

		const isNativeIrq = !!irqbalance.native_hw || (!irqbalance.installable && irqbalance.reason && (irqbalance.reason.indexOf('nativamente') !== -1 || irqbalance.reason.indexOf('Desnecessário') !== -1));
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
			if (irqbalance.active) {
				irqBadge = 'NATIVO (IRQ BALANCE ATIVO)';
				irqBadgeClass = 'badge-orange';
				irqAdvice = 'Atenção: IRQ Balance em execução em hardware que já gerencia interrupções no silício. Recomendado desativar para evitar jitter e disputa de núcleos.';
				irqControl = E('button', {
					class: 'ex-mini-button',
					style: 'padding: 6px 12px; font-weight: 700;',
					click: function() {
						fs.exec('/usr/sbin/equipe-dashboard-control', ['irqbalance-toggle', '0']).then(function(r) {
							if (r.code) throw new Error(r.stderr || 'Falha ao desativar IRQ Balance');
							self.triggerImmediateRefresh('IRQ Balance desativado. Modo nativo por hardware restaurado!', 'info', false);
						}).catch(function(e) {
							ui.addNotification(null, E('p', {}, [e.message]), 'danger');
						});
					}
				}, ['Desativar (Restaurar Nativo)']);
			} else {
				irqBadge = 'NATIVO POR HARDWARE';
				irqBadgeClass = 'badge-green';
				irqAdvice = irqbalance.reason || 'Processamento multicore de rede e Wi-Fi já distribuído nativamente por anéis de DMA e interrupções dedicados no hardware.';
				irqControl = E('span', { class: 'ex-pill online', style: 'padding: 6px 12px; font-weight: 700; cursor: default; background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3);' }, ['NATIVO']);
			}
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

		let zramRow = null;
		if (zramFeat.installed || zramFeat.installable) {
			let zramBadge = 'LZ4 EXPANSÃO';
			let zramBadgeClass = 'badge-green';
			let zramAdvice = 'Recomendado para expandir a memória útil e evitar travamentos sob tráfego pesado.';
			if (zramFeat.is_high_ram) {
				zramBadge = 'DESNECESSÁRIO (RAM ABUNDANTE)';
				zramBadgeClass = 'badge-blue';
				zramAdvice = 'Este roteador possui ' + (zramFeat.mem_total_mb || '512+') + ' MB de RAM física e dispensa compressão. Para ativar, há trava de segurança de 5s.';
			} else if (zramFeat.is_low_end_mips) {
				zramBadge = 'MODO PROTEGIDO (CPU 1-CORE)';
				zramBadgeClass = 'badge-yellow';
				zramAdvice = 'Em processadores mononúcleo lentos (MIPS), a ZRAM opera limitada a 32 MB com swappiness reduzido (15) para poupar a CPU.';
			} else if (zramFeat.active) {
				zramBadge = (zramFeat.zram_size_mb ? (zramFeat.zram_size_mb + ' MB ALOCADOS') : 'LZ4 ATIVO');
				zramBadgeClass = 'badge-green';
			}

			const zramStatePill = E('strong', {
				class: 'ex-device-switch-state',
				style: 'margin-right: 12px;'
			}, [zramFeat.active ? (zramFeat.zram_size_mb ? (zramFeat.zram_size_mb + ' MB') : 'LIGADA') : 'DESLIGADA']);

			const zramInput = E('input', {
				type: 'checkbox',
				'aria-label': 'Compressão de Memória RAM (ZRAM)',
				change: function(ev) {
					const input = ev.currentTarget;
					const desired = !!input.checked;
					if (desired && zramFeat.is_high_ram) {
						input.checked = false;
						return self.showHighRamZramConfirmModal(zramFeat);
					}
					if (desired && zramFeat.is_low_end_mips) {
						input.checked = false;
						return self.showLowEndMipsZramConfirmModal(zramFeat);
					}
					zramStatePill.textContent = desired ? (zramFeat.zram_size_mb ? (zramFeat.zram_size_mb + ' MB') : 'LIGADA') : 'DESLIGADA';
					fs.exec('/usr/sbin/equipe-dashboard-control', ['zram-toggle', desired ? '1' : '0']).then(function(r) {
						if (r.code) throw new Error(r.stderr || 'Falha ao alterar ZRAM');
						zramFeat.active = desired;
						updateBadges();
						self.triggerImmediateRefresh(desired ? 'Compressão de memória (ZRAM) ativada com sucesso!' : 'Compressão de memória (ZRAM) desativada com sucesso.', 'info', false);
					}).catch(function(e) {
						input.checked = !desired;
						zramStatePill.textContent = !desired ? (zramFeat.zram_size_mb ? (zramFeat.zram_size_mb + ' MB') : 'LIGADA') : 'DESLIGADA';
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					});
				}
			});
			zramInput.checked = !!zramFeat.active;
			if (!zramFeat.installed) zramInput.disabled = true;

			const zramControl = zramFeat.installed ? E('div', {
				class: 'ex-device-switch-control',
				style: 'cursor: pointer; user-select: none;',
				click: function(ev) {
					ev.preventDefault();
					ev.stopPropagation();
					if (!zramFeat.installed || zramInput.disabled) return;
					zramInput.checked = !zramInput.checked;
					zramInput.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}, [
				zramStatePill,
				E('label', { class: 'ex-switch', style: 'pointer-events: none;' }, [
					zramInput,
					E('span', { class: 'ex-switch-slider' })
				])
			]) : E('button', { class: 'ex-mini-button', click: L.bind(this.installFeature, this, 'zram') }, ['Instalar']);

			zramRow = E('div', { class: 'ex-perf-item' }, [
				E('div', { class: 'ex-perf-item-content' }, [
					E('div', { class: 'ex-perf-item-head' }, [
						E('span', { class: 'ex-perf-icon' }, ['🗜️']),
						E('strong', {}, ['Compressão de Memória RAM (ZRAM / LZ4)']),
						E('span', { class: 'ex-perf-badge ' + zramBadgeClass }, [zramBadge])
					]),
					E('p', { class: 'ex-perf-desc' }, [
						'Cria um disco de memória comprimida em tempo real utilizando algoritmo LZ4 ultrarrápido, duplicando a capacidade efetiva da RAM sem gravar nem desgastar a memória Flash.'
					]),
					E('small', { class: 'ex-perf-hw-advice' }, ['💡 ' + zramAdvice])
				]),
				zramControl
			]);
		}

		let upnpRow = null;
		if (upnpFeat.installed || upnpFeat.installable) {
			const upnpStatePill = E('strong', {
				class: 'ex-device-switch-state',
				style: 'margin-right: 12px;'
			}, [upnpFeat.active ? 'LIGADA' : 'DESLIGADA']);

			const upnpInput = E('input', {
				type: 'checkbox',
				'aria-label': 'Abertura Automática de Portas (UPnP / IGD)',
				change: function(ev) {
					const input = ev.currentTarget;
					const desired = !!input.checked;
					upnpStatePill.textContent = desired ? 'LIGADA' : 'DESLIGADA';
					fs.exec('/usr/sbin/equipe-dashboard-control', ['upnp-toggle', desired ? '1' : '0']).then(function(r) {
						if (r.code) throw new Error(r.stderr || 'Falha ao alterar UPnP');
						upnpFeat.active = desired;
						updateBadges();
						self.triggerImmediateRefresh(desired ? 'UPnP ativado. Atenção: portas podem ser abertas na WAN sem autenticação.' : 'UPnP desativado com sucesso (modo seguro).', 'info', false);
					}).catch(function(e) {
						input.checked = !desired;
						upnpStatePill.textContent = !desired ? 'LIGADA' : 'DESLIGADA';
						ui.addNotification(null, E('p', {}, [e.message]), 'danger');
					});
				}
			});
			upnpInput.checked = !!upnpFeat.active;
			if (!upnpFeat.installed) upnpInput.disabled = true;

			const upnpControl = upnpFeat.installed ? E('div', {
				class: 'ex-device-switch-control',
				style: 'cursor: pointer; user-select: none;',
				click: function(ev) {
					ev.preventDefault();
					ev.stopPropagation();
					if (!upnpFeat.installed || upnpInput.disabled) return;
					upnpInput.checked = !upnpInput.checked;
					upnpInput.dispatchEvent(new Event('change', { bubbles: true }));
				}
			}, [
				upnpStatePill,
				E('label', { class: 'ex-switch', style: 'pointer-events: none;' }, [
					upnpInput,
					E('span', { class: 'ex-switch-slider' })
				])
			]) : E('button', { class: 'ex-mini-button', click: L.bind(this.installFeature, this, 'upnp') }, ['Instalar']);

			upnpRow = E('div', { class: 'ex-perf-item' }, [
				E('div', { class: 'ex-perf-item-content' }, [
					E('div', { class: 'ex-perf-item-head' }, [
						E('span', { class: 'ex-perf-icon' }, ['🎮']),
						E('strong', {}, ['Abertura Automática de Portas (UPnP / IGD)']),
						E('span', { class: 'ex-perf-badge ' + (upnpFeat.active ? 'badge-yellow' : 'badge-green') }, [upnpFeat.active ? 'PORTAS DINÂMICAS ATIVAS' : 'MODO SEGURO'])
					]),
					E('p', { class: 'ex-perf-desc' }, [
						upnpFeat.active
							? 'Permite que consoles e aplicativos abram portas na WAN automaticamente. ⚠️ Risco: qualquer software na rede pode criar regras de entrada sem senha.'
							: 'Mantém portas protegidas contra abertura automática não autorizada. Nenhuma regra é criada na WAN sem permissão explícita no firewall.'
					]),
					E('small', { class: 'ex-perf-hw-advice' }, [
						upnpFeat.active
							? '💡 Desative se não utilizar jogos multiplayer que exijam NAT Aberto para máxima blindagem de segurança.'
							: '💡 Recomendado manter DESATIVADO (Modo Seguro). Ative apenas se consoles de jogos acusarem NAT Estrito / Tipo 3.'
					])
				]),
				upnpControl
			]);
		}

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
			upnpRow,
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
		if (zramRow) rows.push(zramRow);

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
					E('div', { class: 'ex-perf-grid' }, rows.filter(Boolean))
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
	},

	showDoctorModal: function(initialTab) {
		const self = this;
		let activeTab = initialTab === 'log' ? 'log' : 'diagnosis';
		const doc = (self.currentData && self.currentData.doctorStatus) || {};
		const isOk = doc.status === 'OK' || (Number(doc.errors || 0) === 0 && Number(doc.warnings || 0) === 0);
		const hasErrors = Number(doc.errors || 0) > 0;
		const statusPillClass = isOk ? 'online' : (hasErrors ? 'offline' : 'standby');
		const statusLabel = isOk ? _t('SISTEMA 100% SAUDÁVEL') : (hasErrors ? (_t('FALHA DETECTADA') + ' (' + doc.errors + ')') : (_t('AVISO DETECTADO') + ' (' + doc.warnings + ')'));

		// Header Summary Bar
		const summaryBar = E('div', {
			style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; padding: 12px 16px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);'
		}, [
			E('div', {}, [
				E('strong', { style: 'display: block; font-size: 0.95rem; color: #fff;' }, [_t('Status Geral da Auditoria')]),
				E('small', { class: 'ex-muted' }, [
					doc.date ? (_t('Última auditoria: ') + doc.date) : _t('Auditoria em tempo de execução'),
					' • ',
					((doc.checks && doc.checks.length) || 0) + ' ' + _t('checagens'),
					' • ',
					(doc.fixes_applied || 0) + ' ' + _t('reparos aplicados')
				])
			]),
			E('span', { class: 'ex-pill ' + statusPillClass, style: 'font-size: 0.78rem; font-weight: 750;' }, [statusLabel])
		]);

		// Tabs buttons
		const tabBtnDiagnosis = E('button', {
			class: 'ex-doctor-tab-btn' + (activeTab === 'diagnosis' ? ' is-active' : ''),
			click: function() { switchTab('diagnosis'); }
		}, ['📋 ' + _t('Diagnóstico Detalhado')]);

		const tabBtnLog = E('button', {
			class: 'ex-doctor-tab-btn' + (activeTab === 'log' ? ' is-active' : ''),
			click: function() { switchTab('log'); }
		}, ['📜 ' + _t('Log do Sistema (/var/log/ark-doctor.log)')]);

		const tabsNav = E('div', { class: 'ex-doctor-tabs' }, [tabBtnDiagnosis, tabBtnLog]);

		// Tab 1 Container (Diagnóstico)
		const checksListEl = E('div', { class: 'ex-doctor-check-list' });
		const checks = doc.checks || [];
		if (checks.length === 0) {
			checksListEl.appendChild(E('div', { style: 'padding: 20px; text-align: center; opacity: 0.7;' }, [
				_t('Nenhum dado de diagnóstico disponível. Clique em "Executar Diagnóstico" abaixo.')
			]));
		} else {
			checks.forEach(function(c) {
				let badgeClass = 'ok', badgeText = 'OK';
				if (c.status === 'FAIL') { badgeClass = 'fail'; badgeText = 'FALHA'; }
				else if (c.status === 'WARN') { badgeClass = 'warn'; badgeText = 'AVISO'; }
				else if (c.status === 'FIXED') { badgeClass = 'fixed'; badgeText = 'REPARADO'; }

				checksListEl.appendChild(E('div', { class: 'ex-doctor-check-card' }, [
					E('span', { class: 'ex-doctor-badge ' + badgeClass }, [badgeText]),
					E('div', { style: 'flex: 1; min-width: 0;' }, [
						E('strong', { style: 'display: block; font-size: 0.88rem; color: #fff; margin-bottom: 2px;' }, [c.name]),
						E('small', { class: 'ex-muted', style: 'line-height: 1.4; display: block;' }, [c.message])
					])
				]));
			});
		}

		// Tab 2 Container (Log)
		const logPreEl = E('pre', { class: 'ex-doctor-log-box' }, [_t('Carregando histórico de logs…')]);
		const copyLogBtn = E('button', {
			class: 'cbi-button cbi-button-neutral',
			style: 'padding: 5px 12px; font-size: 0.8rem; font-weight: 700;',
			click: function(ev) {
				const txt = logPreEl.textContent || '';
				if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
					navigator.clipboard.writeText(txt).then(function() {
						ev.currentTarget.textContent = '✅ ' + _t('Copiado!');
						setTimeout(function() { ev.currentTarget.textContent = '📋 ' + _t('Copiar Log'); }, 2000);
					}).catch(function() {
						prompt(_t('Copie o log abaixo:'), txt);
					});
				} else {
					prompt(_t('Copie o log abaixo:'), txt);
				}
			}
		}, ['📋 ' + _t('Copiar Log')]);

		const refreshLogBtn = E('button', {
			class: 'cbi-button cbi-button-action',
			style: 'padding: 5px 12px; font-size: 0.8rem; font-weight: 700;',
			click: function() { loadLogContent(); }
		}, ['🔄 ' + _t('Atualizar Log')]);

		const logActionsBar = E('div', {
			style: 'display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-bottom: 10px;'
		}, [copyLogBtn, refreshLogBtn]);

		const tabLogContainer = E('div', { style: activeTab === 'log' ? '' : 'display:none;' }, [
			logActionsBar,
			logPreEl
		]);

		const tabDiagnosisContainer = E('div', { style: activeTab === 'diagnosis' ? '' : 'display:none;' }, [
			checksListEl
		]);

		function loadLogContent() {
			logPreEl.textContent = _t('Lendo /var/log/ark-doctor.log…');
			safe(fs.exec('/usr/sbin/equipe-dashboard-control', ['doctor-log']), {}).then(function(res) {
				const raw = (res && res.stdout) ? res.stdout.trim() : '';
				const out = raw ? raw.replace(/\u001b\[[0-9;]*[a-zA-Z]/g, '').replace(/\[[0-9;]+m/g, '') : '';
				logPreEl.textContent = out || _t('Nenhum registro de log do Ark Doctor disponível.');
			}).catch(function() {
				logPreEl.textContent = _t('Não foi possível ler o log do Ark Doctor.');
			});
		}

		function switchTab(t) {
			activeTab = t;
			tabBtnDiagnosis.classList.toggle('is-active', t === 'diagnosis');
			tabBtnLog.classList.toggle('is-active', t === 'log');
			tabDiagnosisContainer.style.display = t === 'diagnosis' ? '' : 'none';
			tabLogContainer.style.display = t === 'log' ? '' : 'none';
			if (t === 'log') {
				loadLogContent();
			}
		}

		if (activeTab === 'log') {
			loadLogContent();
		}

		// Action Buttons in Footer
		const auditBtn = E('button', {
			class: 'cbi-button cbi-button-action',
			style: 'padding: 8px 16px; font-weight: 750;',
			click: function(ev) { self.runDoctorAudit(ev.currentTarget); }
		}, ['🔍 ' + _t('Executar Diagnóstico')]);

		const fixBtn = E('button', {
			class: 'cbi-button cbi-button-positive',
			style: 'padding: 8px 16px; font-weight: 750;',
			click: function(ev) { self.runDoctorFix(ev.currentTarget); }
		}, ['🔧 ' + _t('Reparar Tudo (--fix)')]);

		const closeBtn = E('button', {
			class: 'cbi-button cbi-button-neutral',
			style: 'padding: 8px 16px; font-weight: 750;',
			click: function() { ui.hideModal(); }
		}, [_t('Fechar')]);

		const footerEl = E('div', {
			style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-top: 20px; padding-top: 14px; border-top: 1px solid rgba(255, 255, 255, 0.1);'
		}, [
			E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' }, [auditBtn, fixBtn]),
			closeBtn
		]);

		const modalBody = E('div', { style: 'max-width: 820px; width: 100%;' }, [
			summaryBar,
			tabsNav,
			tabDiagnosisContainer,
			tabLogContainer,
			footerEl
		]);

		ui.showModal('🩺 ' + _t('Ark Doctor — Diagnóstico & Autocura do Sistema'), modalBody);
	},

	runDoctorAudit: function(btn) {
		const self = this;
		if (btn) {
			btn.disabled = true;
			btn.textContent = '⏳ ' + _t('Auditando…');
		}
		ui.addNotification(null, E('p', {}, [_t('Executando auditoria completa com Ark Doctor…')]), 'info');
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['doctor-run']).then(function(r) {
			let doc = null;
			try { doc = JSON.parse(r.stdout || '{}'); } catch(e){}
			if (doc && self.currentData) {
				self.currentData.doctorStatus = doc;
				self.updateDoctorStatus(doc);
			}
			ui.addNotification(null, E('p', {}, [_t('Auditoria do Ark Doctor concluída!')]), 'info');
			self.showDoctorModal('diagnosis');
		}).catch(function(err) {
			ui.addNotification(null, E('p', {}, [_t('Falha ao executar auditoria: ') + (err.message || err)]), 'danger');
			if (btn) {
				btn.disabled = false;
				btn.textContent = '🔍 ' + _t('Executar Diagnóstico');
			}
		});
	},

	runDoctorFix: function(btn) {
		const self = this;
		if (btn) {
			btn.disabled = true;
			btn.textContent = '⏳ ' + _t('Reparando…');
		}
		ui.addNotification(null, E('p', {}, [_t('Executando autocura com Ark Doctor (--fix)…')]), 'info');
		localStorage.removeItem('ark_doctor_banner_dismissed_ts');
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['doctor-fix']).then(function(r) {
			let doc = null;
			try { doc = JSON.parse(r.stdout || '{}'); } catch(e){}
			if (doc && self.currentData) {
				self.currentData.doctorStatus = doc;
				self.updateDoctorStatus(doc);
			}
			const fixes = (doc && doc.fixes_applied) || 0;
			ui.addNotification(null, E('p', {}, [_t('Ark Doctor aplicou ') + fixes + _t(' reparos com sucesso!')]), 'info');
			self.showDoctorModal('diagnosis');
		}).catch(function(err) {
			ui.addNotification(null, E('p', {}, [_t('Falha ao aplicar autocura: ') + (err.message || err)]), 'danger');
			if (btn) {
				btn.disabled = false;
				btn.textContent = '🔧 ' + _t('Reparar Tudo (--fix)');
			}
		});
	}
};
