// ARK Router: Network Modals (WAN Optimizations, LAN, IPv6 & Multi-WAN Rules)
const networkModalsMethods = {
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
			const isNativeHwIrq = !isSingleCore && (!!opt.irqbalance_native || !!irqbalanceFeat.native_hw || (irqbalanceFeat.reason && (irqbalanceFeat.reason.indexOf('nativamente') !== -1 || irqbalanceFeat.reason.indexOf('Desnecessário') !== -1)));

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
					ll: 'vdsl_44',
					jumbo: false
				},
				{
					id: 'xpon_vlan',
					label: '🏷️ Fibra com VLAN da Operadora',
					tag: 'FIBRA VLAN',
					desc: 'Para planos de fibra ótica onde a operadora exige configuração de ID de VLAN na conexão.',
					ll: 'vlan_34',
					jumbo: false
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
				{ id: 'vdsl_44', label: '⚡ Fibra GPON (44B)' }
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

			const applyPreset = function(presetId, isInit) {
				selectedPreset = presetId;
				const p = presets.find(function(x) { return x.id === presetId; });
				const effective = presetId === 'auto' ? profileById(opt.detected_profile) : p;
				if (effective && presetId !== 'custom') {
					linklayerProfile = effective.ll || 'none';
					if (!isInit) {
						babyJumbo = !!effective.jumbo;
					}
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
					click: function() { applyPreset(p.id, false); }
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
			jumboInput.addEventListener('change', function() { babyJumbo = jumboInput.checked; updateUI(); });
			irqInput.addEventListener('change', function() { irqBalance = irqInput.checked; updateUI(); });
			enableSqmInput.addEventListener('change', function() {
				if (enableSqmInput.checked) {
					flowOffload = false;
					flowInput.checked = false;
				}
				updateSqmDependency();
				updateUI();
			});
			applyPreset(selectedPreset, true);

			const protoHuman = { dhcp: 'Modem da Operadora (DHCP)', pppoe: 'Fibra Ótica Direta (PPPoE)', static: 'IP Fixo Estático' };
			const speedText = Number(opt.link_speed_mbps || 0) > 0 ? (Number(opt.link_speed_mbps) + ' Mbps' + (opt.duplex ? ' • ' + opt.duplex : '')) : 'velocidade física não informada';
			const detected = profileById(opt.detected_profile);

			const content = [
				E('div', { class: 'alert-message info', style: 'display:block;margin-bottom:14px;font-size:13px;line-height:1.45;' }, [
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
					E('details', { class: 'ex-opt-advanced', open: babyJumbo ? '' : null, style: 'margin-top:8px;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid rgba(127,127,127,0.15);' }, [
						E('summary', { style: 'cursor:pointer;font-weight:600;font-size:12.5px;color:var(--ex-muted);' }, ['⚙️ Auto-MTU Inteligente PPPoE e Overhead de Pacotes (Avançado)']),
						E('p', { class: 'ex-muted', style: 'margin-top:8px;margin-bottom:10px;font-size:11.5px;' }, ['Estes parâmetros já foram calibrados pelo perfil escolhido acima. Você pode ativar o Auto-MTU Inteligente abaixo para testar MTU 1500 real na fibra com fallback automático seguro.']),
						E('strong', { style: 'display:block;font-size:12px;margin-bottom:6px;' }, ['Perfil de overhead no SQM / CAKE']),
						chipGrid,
						E('div', { class: 'ex-opt-module-card', style: 'margin-top:10px;' }, [
							E('div', { class: 'ex-opt-module-info' }, [
								E('strong', {}, ['⚡ Auto-MTU Inteligente & Baby Jumbo PPPoE (1500 / 1492 Automático)']),
								E('p', {}, ['Ativa a sondagem automática de MTU na fibra PPPoE: negocia Baby Jumbo (porta em 1508B / RFC 4638) para entregar MTU 1500 real sem fragmentação; se a operadora limitar a sessão, ajusta sozinho para MTU 1492 (ou o teto exato da fibra) sincronizando TCP MSS e IPv6 sem risco de travar sites. Desligado: fixa em MTU 1492 padrão.']),
								(function() {
									const physMtu = Number(opt.current_mtu || 1500);
									const l3Mtu = Number(opt.l3_mtu || 0);
									const probedMtu = Number(opt.probed_mtu || 0);
									const effMtu = probedMtu || l3Mtu || 1492;
									if (opt.baby_jumbo) {
										if (effMtu >= 1500) {
											return E('small', { class: 'ex-opt-requirement ready', style: 'display:block;margin-top:6px;font-weight:600;' }, [
												'✅ Sondagem Concluída: Sua operadora aceitou Baby Jumbo (RFC 4638)! Porta ' + (opt.wan_dev || 'WAN') + ' em ' + physMtu + 'B e sessão PPPoE operando em MTU 1500 real sem fragmentação.'
											]);
										}
										return E('small', { class: 'ex-opt-requirement ready', style: 'display:block;margin-top:6px;font-weight:600;' }, [
											'🛡️ Sondagem Concluída: Porta ' + (opt.wan_dev || 'WAN') + ' aberta em ' + physMtu + 'B, mas o concentrador da operadora limitou a sessão PPPoE em ' + effMtu + ' bytes. O Auto-MTU ajustou o túnel PPPoE, o TCP MSS e o IPv6 automaticamente para ' + effMtu + ' bytes (zero fragmentação / sem risco de travar sites).'
										]);
									}
									return E('small', { class: 'ex-muted', style: 'display:block;margin-top:6px;font-weight:600;' }, [
										'⚪ Modo Fixo Atual: Sessão operando em MTU ' + (l3Mtu || 1492) + ' bytes (porta ' + (opt.wan_dev || 'WAN') + ' em ' + physMtu + 'B, sem sondagem RFC 4638).'
									]);
								})()
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
							E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
								const btn = ev && ev.currentTarget;
								if (btn) { btn.disabled = true; btn.textContent = 'Aplicando agora…'; }
								const args=['lan-save','mode='+next.mode,'router_ip='+next.routerIp,'netmask='+next.netmask,'start_ip='+next.startIp,'end_ip='+next.endIp,'dns='+next.dns.join(' '),'dhcp_enabled='+(next.dhcpEnabled?'1':'0'),'igmp_snooping='+(next.igmpSnooping?'1':'0')];
								return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(function(r){
									if(r.code)throw new Error(r.stderr||'Falha ao salvar LAN');
									let out={};try{out=JSON.parse(r.stdout||'{}');}catch(e){}
									ui.hideModal();
									if((out.new_ip||next.routerIp)!==(out.old_ip||next.oldIp))redirectToRouter(out.new_ip||next.routerIp,'LAN salva. Tentando abrir o painel no novo IP '+(out.new_ip||next.routerIp)+'…',1000);
									else reloadSoon('Faixa DHCP salva. Recarregando o painel…',1000);
								}).catch(function(e){
									if (btn) { btn.removeAttribute('disabled'); btn.disabled = false; btn.textContent = 'Aplicar agora'; }
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
			E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-negative','click':function(ev){
				const btn = ev && ev.currentTarget;
				if (btn) { btn.disabled = true; btn.textContent = 'Desativando IPv6…'; }
				return fs.exec('/usr/sbin/equipe-dashboard-control',['ipv6-disable-full']).then(function(r){
					if(r.code)throw new Error(r.stderr||'Falha ao desativar IPv6');
					let out={};try{out=JSON.parse(r.stdout||'{}');}catch(e){}
					ui.hideModal();
					ui.addNotification(null,E('p',{},['IPv6 desativado. Backup: ',out.backup||'/tmp/ark-router-before-cleanup-*.tar.gz']));
					window.setTimeout(function(){window.location.reload();},1000);
				}).catch(function(e){
					if (btn) { btn.removeAttribute('disabled'); btn.disabled = false; btn.textContent = 'Criar backup e desativar IPv6'; }
					if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;
					ui.addNotification(null,E('p',{},[e.message]),'danger');
				});
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
				nptv6: { label: 'Modo 4: NPTv6 Inteligente (Multi-WAN)', color: '#06b6d4', bg: 'rgba(6,182,212,.15)', border: 'rgba(6,182,212,.35)' },
				ipv6_only: { label: 'Modo 5: IPv6-Only (Single-Stack)', color: '#c084fc', bg: 'rgba(192,132,252,.15)', border: 'rgba(192,132,252,.35)' }
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
				renderModeCard('nptv6', 'Modo 4: NPTv6 Inteligente (Multi-WAN & Estabilidade)', 'Estabilidade & Multi-WAN',
					'Prefixo ULA local fixo (fd73:0192:0168::/48) com tradução 1:1 stateless para a WAN ativa (RFC 6296 / Masq6).',
					[
						'Perfeito para Dual-WAN (Fibra + Starlink): failover de IPv6 transparente sem desconexão.',
						'Imunidade contra troca de prefixo da operadora: servidores, Docker e Home Assistant mantêm IPs estáveis.',
						'Sem sobrecarga de portas: cada dispositivo preserva suas 65.535 portas 1:1 sem NAT restrito.'
					],
					curMode === 'nptv6'
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
				renderModeCard('ipv6_only', 'Modo 5: IPv6-Only (Futurista)', 'Single-Stack',
					'LAN operando puramente em IPv6 sem concessões DHCP IPv4 locais, com síntese DNS64 no dnsmasq.',
					[
						'Ideal para laboratórios, testes de novas tecnologias e transição pura para a próxima geração.',
						'Apenas dispositivos compatíveis com IPv6 navegarão na rede local.'
					],
					curMode === 'ipv6_only'
				)
			];

			const isNptv6 = curMode === 'nptv6';
			const isIpv4Only = curMode === 'ipv4_only';
			const isRelayLocked = isNptv6 || isIpv4Only;

			const relayToggle = E('input', {
				type: 'checkbox',
				checked: (!isRelayLocked && isRelay) ? '' : null,
				disabled: isRelayLocked ? '' : null,
				change: function(ev) {
					if (isRelayLocked) return;
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
			relayToggle.checked = !isRelayLocked && !!isRelay;
			if (isRelayLocked) relayToggle.disabled = true;

			let pillText = isRelay ? 'RELAY IPV6 ATIVO' : 'SERVIDOR IPV6 DIRETO';
			let pillClass = isRelay ? 'online' : 'standby';
			let stateText = isRelay ? 'Ativado' : 'Desativado';
			let stateColor = isRelay ? '#38bdf8' : '#94a3b8';

			if (isNptv6) {
				pillText = 'SERVIDOR DIRETO OBRIGATÓRIO (NPTv6)';
				pillClass = 'standby';
				stateText = 'Desativado (NPTv6)';
				stateColor = '#94a3b8';
			} else if (isIpv4Only) {
				pillText = 'DESATIVADO (MODO IPV4)';
				pillClass = 'standby';
				stateText = 'Desativado';
				stateColor = '#94a3b8';
			}

			const cascadePanel = E('section', {
				class: 'ex-cleanup-entry',
				style: 'margin-top: 16px; padding: 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.08); background: rgba(255,255,255,.02); align-items: center;'
			}, [
				E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;' }, [
						E('strong', { style: 'font-size: 0.92rem; color: #f8fafc;' }, ['🔗 Roteador em Cascata (Repasse IPv6 / NDP Relay)']),
						E('span', { class: 'ex-pill ' + pillClass, style: 'font-size: 0.7rem;' }, [ pillText ])
					]),
					E('p', { class: 'ex-muted', style: 'font-size: 0.8rem; line-height: 1.4; margin: 4px 0 0;' }, [
						isNptv6
							? 'No modo NPTv6, o ARK Router atua obrigatoriamente como Servidor Direto autoritativo (anunciando o prefixo ULA estável fd73:0192:0168::/48 para seus aparelhos e realizando a tradução 1:1 para a WAN ativa). O Repasse de vizinhança (Relay) fica automaticamente desligado.'
							: isIpv4Only
								? 'O Repasse IPv6 não pode ser utilizado enquanto o protocolo IPv6 estiver totalmente desligado (Modo IPv4 Apenas).'
								: 'Ative se este ARK Router estiver conectado atrás do modem da operadora (ou outro roteador) e seus aparelhos não estiverem recebendo IPv6 (quando a operadora entrega apenas um prefixo /64). O odhcpd repassa os anúncios de vizinhança IPv6 (NDP) transparentemente para os seus clientes, sem necessidade de DMZ no mestre.'
					])
				]),
				E('div', { style: 'flex: 0 0 auto; margin-left: 14px; display: flex; flex-direction: row; align-items: center; gap: 10px;' }, [
					E('strong', { class: 'ex-device-switch-state', style: 'font-size: 0.8rem; font-weight: 700; color: ' + stateColor + ';' }, [ stateText ]),
					E('label', { class: 'ex-switch', style: 'width: 48px; min-width: 48px; max-width: 48px; height: 26px; min-height: 26px; max-height: 26px; margin: 0;' + (isRelayLocked ? ' opacity: 0.45; cursor: not-allowed;' : '') }, [
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
