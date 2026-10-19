// /src/modules/storage_wol.js - ARK Router KSMBD (SMB 3.1.1 USB File Server) & Wake-on-LAN Module
// Ported from Acer Predator Connect T7 & enhanced for ARK Router with optional install + ready-to-use UI pages.

const storageWolMethods = {
	// =========================================================================
	// 1. KSMBD (SERVIDOR DE ARQUIVOS USB / KERNEL SMB 3.1.1)
	// =========================================================================
	ksmbdCard: function() {
		const self = this;
		const f = this.feature('ksmbd') || {};
		const installed = !!f.installed;
		const active = !!f.active;

		let statusText = 'OPCIONAL';
		let pillClass = 'standby';
		if (active) {
			statusText = 'ATIVO (SMB 3.1.1)';
			pillClass = 'online';
		} else if (installed) {
			statusText = 'PAUSADO';
			pillClass = 'standby';
		}

		const pillEl = E('span', { id: 'ex-ksmbd-pill', class: 'ex-pill ' + pillClass }, [statusText]);
		const titleActions = E('div', { class: 'ex-card-title-actions' }, [pillEl]);
		const cardTitle = E('div', { class: 'ex-card-title' }, [
			E('div', {}, [
				E('span', { class: 'ex-kicker' }, ['SERVIDOR DE ARQUIVOS USB (KERNEL SMB 3.1.1)']),
				E('h3', {}, ['Central de Armazenamento & KSMBD'])
			]),
			titleActions
		]);

		const lanIp = (this.currentData && this.currentData.lan && this.currentData.lan.ipaddr) || '192.168.1.1';
		const summaryGrid = E('div', { id: 'ex-ksmbd-summary-grid', class: 'ex-grid ex-grid-2 ex-qos-grid', style: 'margin-bottom: 12px;' }, [
			E('div', { class: 'ex-row' }, [
				E('span', {}, ['Motor SMB']),
				E('strong', { id: 'ex-ksmbd-engine-state' }, [active ? '🟢 Em Execução (Kernel)' : (installed ? '⏸️ Em Espera' : '📦 Opcional (Pronto p/ Instalar)')])
			]),
			E('div', { class: 'ex-row' }, [
				E('span', {}, ['Unidades USB']),
				E('strong', { id: 'ex-ksmbd-disks-count' }, ['Consultando…'])
			]),
			E('div', { class: 'ex-row' }, [
				E('span', {}, ['Caminho Windows / Mac']),
				E('strong', { id: 'ex-ksmbd-share-path', style: 'font-family:monospace; color:#38bdf8;' }, ['\\\\' + lanIp])
			]),
			E('div', { class: 'ex-row' }, [
				E('span', {}, ['Redes Autorizadas']),
				E('strong', { id: 'ex-ksmbd-net-zones' }, ['🏠 LAN Principal'])
			])
		]);

		const actionsRow = E('div', { class: 'ex-speedify-actions', style: 'display:flex; flex-wrap:wrap; gap:8px; align-items:center;' }, [
			(!installed) ? E('button', {
				id: 'ex-ksmbd-install-btn',
				class: 'ex-mini-button',
				style: 'background:rgba(16,185,129,0.18); color:#34d399; border:1px solid rgba(16,185,129,0.4); font-weight:750;',
				click: function() { self.installFeature('ksmbd'); }
			}, ['📦 Instalar KSMBD (Servidor USB)']) : '',
			E('button', {
				class: 'ex-mini-button',
				style: 'font-weight:700;',
				click: function() { self.openKsmbdModal(); }
			}, ['⚙️ Abrir Painel KSMBD & Discos USB']),
			installed ? E('button', {
				id: 'ex-ksmbd-quick-toggle-btn',
				class: 'ex-mini-button',
				style: 'background:rgba(255,255,255,0.06);',
				click: function() {
					const cmd = self._ksmbdRunning ? 'pause' : 'start';
					fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-control', cmd]).then(function() {
						ui.addNotification(null, E('p', {}, [cmd === 'start' ? 'Servidor KSMBD iniciado.' : 'Servidor KSMBD pausado.']));
						self.refreshKsmbdCardSummary();
					});
				}
			}, [active ? '⏸️ Pausar Servidor' : '▶️ Iniciar Servidor']) : '',
			(!installed) ? E('button', {
				class: 'ex-feature-link',
				click: function() { self.setFeatureHidden('ksmbd', true); }
			}, ['Ocultar sugestão']) : ''
		]);

		const cardBody = E('div', { class: 'ex-card-collapse-body' }, [
			E('div', { class: 'ex-card-collapse-inner' }, [
				E('p', { class: 'ex-muted', style: 'margin-bottom: 12px;' }, [
					'Transforma qualquer pendrive ou HD externo conectado na porta USB em um servidor NAS de altíssima velocidade no kernel Linux (SMB 3.1.1). Inclui montagem automática, benchmark de leitura/gravação, reparo FSCK, formatação segura, controle de contas e isolamento de firewall por rede.'
				]),
				summaryGrid,
				actionsRow
			])
		]);

		const cardEl = E('section', { class: 'ex-card ex-ksmbd-card' }, [
			cardTitle,
			cardBody
		]);

		const acc = setupCardAccordion({
			id: 'ksmbd',
			cardEl: cardEl,
			titleEl: cardTitle,
			bodyEl: cardBody,
			isActive: active
		});
		titleActions.appendChild(acc.expandBtn);
		self._ksmbdAccordion = acc;

		window.setTimeout(function() { self.refreshKsmbdCardSummary(); }, 250);
		return cardEl;
	},

	refreshKsmbdCardSummary: function() {
		const self = this;
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-status']).then(function(r) {
			let st = {};
			try { st = JSON.parse(r.stdout || '{}'); } catch(e) {}
			self._ksmbdLastStatus = st;
			self._ksmbdRunning = !!st.running;

			const pill = document.getElementById('ex-ksmbd-pill');
			if (pill) {
				if (st.running) {
					pill.className = 'ex-pill online';
					pill.textContent = 'ATIVO (SMB 3.1.1)';
				} else if (st.installed) {
					pill.className = 'ex-pill standby';
					pill.textContent = 'PAUSADO';
				} else {
					pill.className = 'ex-pill standby';
					pill.textContent = 'OPCIONAL';
				}
			}

			const engEl = document.getElementById('ex-ksmbd-engine-state');
			if (engEl) {
				engEl.textContent = st.running ? '🟢 Em Execução (Kernel)' : (st.installed ? '⏸️ Em Espera' : '📦 Opcional (Pronto p/ Instalar)');
			}

			const instBtn = document.getElementById('ex-ksmbd-install-btn');
			if (instBtn) {
				instBtn.style.display = st.installed ? 'none' : '';
			}

			const disks = Array.isArray(st.disks) ? st.disks : [];
			const mountedCount = disks.filter(function(d) { return !!d.mounted; }).length;
			const dEl = document.getElementById('ex-ksmbd-disks-count');
			if (dEl) {
				dEl.textContent = disks.length > 0
					? (mountedCount + ' de ' + disks.length + ' unidade(s) montada(s)')
					: 'Nenhum disco USB conectado';
			}

			const pathEl = document.getElementById('ex-ksmbd-share-path');
			if (pathEl && st.lan_ip) {
				pathEl.textContent = '\\\\' + st.lan_ip;
			}

			const zEl = document.getElementById('ex-ksmbd-net-zones');
			if (zEl && st.interfaces) {
				const zones = [];
				if (st.interfaces.lan !== false) zones.push('🏠 LAN');
				if (st.interfaces.guest) zones.push('👥 Guest');
				if (st.interfaces.iot) zones.push('💡 IoT');
				if (st.interfaces.wan) zones.push('🌐 WAN (445)');
				zEl.textContent = zones.length ? zones.join(' • ') : '🏠 LAN Principal';
			}

			const qBtn = document.getElementById('ex-ksmbd-quick-toggle-btn');
			if (qBtn) {
				qBtn.textContent = st.running ? '⏸️ Pausar Servidor' : '▶️ Iniciar Servidor';
			}
		}).catch(function() {});
	},

	openKsmbdFormatConfirmModal: function(disk) {
		const self = this;
		const fsSelect = E('select', { class: 'cbi-input-select', style: 'width:100%;' }, [
			E('option', { value: 'exfat' }, ['exFAT (Recomendado — Windows, macOS, Linux, arquivos > 4 GB)']),
			E('option', { value: 'ext4' }, ['EXT4 (Máxima Performance Nativa Linux / OpenWrt)']),
			E('option', { value: 'vfat' }, ['FAT32 (Compatibilidade Universal / Smart TVs Antigas — limite 4 GB/arq)'])
		]);
		const labelInput = E('input', {
			type: 'text',
			class: 'cbi-input-text',
			value: (disk.label && disk.label !== disk.name) ? disk.label : 'ARK_USB',
			maxlength: 16,
			placeholder: 'ex: ARK_USB'
		});
		const confirmInput = E('input', {
			type: 'text',
			class: 'cbi-input-text',
			placeholder: 'Digite SIM em maiúsculas para confirmar',
			style: 'border-color: rgba(239,68,68,0.5); font-weight:700;'
		});

		const formatBtn = E('button', {
			class: 'btn cbi-button cbi-button-negative',
			disabled: true,
			click: function() {
				if (confirmInput.value.trim() !== 'SIM') return;
				formatBtn.disabled = true;
				formatBtn.textContent = 'Formatando unidade…';
				fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-disk-action', 'format', disk.device, fsSelect.value, labelInput.value.trim() || 'ARK_USB']).then(function(r) {
					if (r.code) throw new Error(r.stderr || 'Falha ao formatar unidade');
					ui.addNotification(null, E('p', {}, ['Unidade ' + disk.device + ' formatada com sucesso em ' + fsSelect.value.toUpperCase() + '!']));
					self.openKsmbdModal();
				}).catch(function(e) {
					formatBtn.disabled = false;
					formatBtn.textContent = '⚠️ Apagar Tudo e Formatar';
					ui.addNotification(null, E('p', {}, [e.message]), 'danger');
				});
			}
		}, ['⚠️ Apagar Tudo e Formatar']);

		confirmInput.addEventListener('input', function() {
			formatBtn.disabled = (confirmInput.value.trim() !== 'SIM');
		});

		ui.showModal('⚠️ Formatar Unidade USB (' + disk.device + ')', [
			E('div', { class: 'alert-message danger', style: 'margin-bottom:14px;' }, [
				E('strong', { style: 'display:block; margin-bottom:4px;' }, ['ATENÇÃO: PERDA TOTAL DE DADOS NA UNIDADE USB']),
				E('span', {}, ['Todos os arquivos existentes em ', E('code', {}, [disk.device + ' (' + (disk.size || 'USB') + ')']), ' serão permanentemente apagados. A flash interna do roteador (MTD/UBI/Rootfs) é blindada por hardware/software e nunca pode ser selecionada.'])
			]),
			E('div', { class: 'ex-ez-grid', style: 'gap:12px; margin-bottom:14px;' }, [
				E('label', { class: 'ex-ez-field' }, [
					E('span', {}, ['Sistema de Arquivos']),
					fsSelect
				]),
				E('label', { class: 'ex-ez-field' }, [
					E('span', {}, ['Rótulo do Volume (Nome da Pasta na Rede)']),
					labelInput
				]),
				E('label', { class: 'ex-ez-field' }, [
					E('span', { style: 'color:#f87171; font-weight:700;' }, ['Confirmação de Segurança Obrigatória (digite SIM):']),
					confirmInput
				])
			]),
			E('div', { class: 'right', style: 'display:flex; justify-content:flex-end; gap:8px;' }, [
				E('button', { class: 'btn cbi-button cbi-button-neutral', click: function() { self.openKsmbdModal(); } }, ['Cancelar']),
				formatBtn
			])
		]);
	},

	openKsmbdWanWarningModal: function(onConfirm, onCancel) {
		ui.showModal('🚨 Alerta Crítico de Segurança: Exposição SMB na WAN (Porta 445)', [
			E('div', { class: 'alert-message danger', style: 'margin-bottom:12px;' }, [
				E('strong', { style: 'display:block; font-size:0.95rem; margin-bottom:6px;' }, ['⚠️ RISCO EXTREMO: Protocolo SMB Exposto Diretamente para a Internet']),
				E('p', { style: 'margin:0; font-size:0.84rem; line-height:1.45;' }, [
					'Abrir a porta TCP 445 na interface WAN permite que bots e scanners na internet pública tentem ataques de força bruta diretamente contra os seus arquivos USB.'
				])
			]),
			E('div', { class: 'ex-device-config-block', style: 'margin-bottom:14px; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.3); padding:12px; border-radius:10px;' }, [
				E('strong', { style: 'color:#10b981; display:block; margin-bottom:4px;' }, ['💡 Recomendação Arquitetural ARK Router:']),
				E('span', { style: 'font-size:0.83rem; color:#cbd5e1;' }, [
					'Para acessar seus arquivos fora de casa com 100% de segurança e criptografia moderna, mantenha a WAN desativada aqui e utilize o ',
					E('strong', {}, ['WireGuard VPN']),
					' ou ',
					E('strong', {}, ['ZeroTier']),
					' integrados no painel.'
				])
			]),
			E('div', { class: 'right', style: 'display:flex; justify-content:flex-end; gap:8px;' }, [
				E('button', {
					class: 'btn cbi-button cbi-button-positive',
					click: function() { if (onCancel) onCancel(); }
				}, ['🛡️ Manter Bloqueado na WAN (Recomendado)']),
				E('button', {
					class: 'btn cbi-button cbi-button-negative',
					click: function() { if (onConfirm) onConfirm(); }
				}, ['Assumir Risco e Liberar Porta 445'])
			])
		]);
	},

	openKsmbdModal: function() {
		const self = this;
		ui.showModal('🗄️ Servidor de Arquivos USB (Kernel SMB 3.1.1 — KSMBD)', [
			E('p', { class: 'ex-muted' }, ['Carregando unidades USB, compartilhamentos e contas de acesso…'])
		]);

		return fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-status']).then(function(r) {
			let st = {};
			try { st = JSON.parse(r.stdout || '{}'); } catch(e) {}
			self._ksmbdLastStatus = st;
			self.refreshKsmbdCardSummary();

			const isInst = !!st.installed;
			const isRun = !!st.running;
			const lanIp = st.lan_ip || '192.168.1.1';
			const disks = Array.isArray(st.disks) ? st.disks : [];
			const users = Array.isArray(st.users) ? st.users : [];
			const ifaces = st.interfaces || { lan: true, guest: false, iot: false, wan: false };

			// 1. Optional Install Banner (if ksmbd-server not yet installed)
			const installBanner = !isInst ? E('div', {
				style: 'margin-bottom:14px; padding:14px 16px; border-radius:12px; background:linear-gradient(90deg, rgba(59,130,246,0.14) 0%, rgba(16,185,129,0.14) 100%); border:1px solid rgba(59,130,246,0.4); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;'
			}, [
				E('div', { style: 'flex:1; min-width:240px;' }, [
					E('div', { style: 'display:flex; align-items:center; gap:8px; margin-bottom:4px;' }, [
						E('span', { class: 'ex-pill standby' }, ['MÓDULO OPCIONAL']),
						E('strong', { style: 'font-size:0.95rem; color:#f8fafc;' }, ['Pacote ksmbd-server ainda não instalado na Flash'])
					]),
					E('small', { class: 'ex-muted', style: 'display:block; line-height:1.4;' }, [
						'Toda a interface web, usuários SMB, permissões e regras de rede já estão prontos abaixo! Você pode pré-configurar tudo agora e instalar o motor KSMBD com 1 clique quando desejar.'
					])
				]),
				E('button', {
					class: 'btn cbi-button cbi-button-positive',
					style: 'font-weight:750;',
					click: function() {
						closeModal();
						self.installFeature('ksmbd');
					}
				}, ['📦 Instalar KSMBD Agora'])
			]) : '';

			// 2. Server Control & Keepalive Header
			const serverCtrlBox = E('div', {
				class: 'ex-device-config-block',
				style: 'margin-bottom:14px; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.09); background:rgba(15,23,42,0.55);'
			}, [
				E('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;' }, [
					E('div', {}, [
						E('strong', { style: 'font-size:0.95rem; display:flex; align-items:center; gap:8px;' }, [
							'⚡ Controle do Motor KSMBD (In-Kernel SMB3)',
							E('span', { class: 'ex-pill ' + (isRun ? 'online' : 'standby') }, [isRun ? 'EM EXECUÇÃO' : (isInst ? 'PAUSADO' : 'AGUARDANDO INSTALAÇÃO')])
						]),
						E('small', { class: 'ex-muted', style: 'display:block; margin-top:2px;' }, [
							'Diferente do Samba tradicional em espaço de usuário, o KSMBD processa arquivos direto no kernel Linux com mínimo uso de RAM e máxima taxa de transferência.'
						])
					]),
					E('div', { style: 'display:flex; flex-wrap:wrap; gap:6px;' }, [
						E('button', {
							class: 'ex-mini-button',
							style: 'background:rgba(16,185,129,0.18); color:#34d399; border:1px solid rgba(16,185,129,0.35); font-weight:700;',
							click: function() {
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-control', 'start']).then(function() {
									ui.addNotification(null, E('p', {}, ['Servidor KSMBD iniciado e compartilhamentos sincronizados.']));
									self.openKsmbdModal();
								});
							}
						}, ['▶️ Iniciar / Ativar']),
						E('button', {
							class: 'ex-mini-button',
							click: function() {
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-control', 'restart']).then(function() {
									ui.addNotification(null, E('p', {}, ['Servidor KSMBD reiniciado.']));
									self.openKsmbdModal();
								});
							}
						}, ['🔄 Reiniciar']),
						E('button', {
							class: 'ex-mini-button',
							click: function() {
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-control', 'pause']).then(function() {
									ui.addNotification(null, E('p', {}, ['Servidor KSMBD pausado temporariamente.']));
									self.openKsmbdModal();
								});
							}
						}, ['⏸️ Pausar']),
						E('button', {
							class: 'ex-mini-button',
							style: 'background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);',
							click: function() {
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-control', 'disable']).then(function() {
									ui.addNotification(null, E('p', {}, ['Servidor KSMBD parado e desativado no boot.']));
									self.openKsmbdModal();
								});
							}
						}, ['🛑 Desativar'])
					])
				]),
				E('div', {
					style: 'display:flex; justify-content:space-between; align-items:center; gap:12px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.07);'
				}, [
					E('div', {}, [
						E('strong', { style: 'font-size:0.86rem; color:#38bdf8;' }, ['🔄 Modo HD Sempre Ligado (Anti-Hibernação / Keepalive)']),
						E('small', { class: 'ex-muted', style: 'display:block;' }, [
							'Atualiza um marcador invisível a cada 60s para impedir que HDs mecânicos externos entrem em suspensão profunda e travem ao abrir pastas.'
						])
					]),
					(function() {
						const kaInput = E('input', {
							type: 'checkbox',
							checked: st.keepalive ? '' : null,
							change: function(ev) {
								const desired = ev.currentTarget.checked ? 'keepalive_on' : 'keepalive_off';
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-control', desired]).then(function() {
									ui.addNotification(null, E('p', {}, [desired === 'keepalive_on' ? 'Keepalive de HD externo ativado.' : 'Keepalive de HD externo desativado.']));
								});
							}
						});
						kaInput.checked = !!st.keepalive;
						return E('label', { class: 'ex-switch' }, [kaInput, E('span', { class: 'ex-switch-slider' })]);
					})()
				])
			]);

			// 3. Connected USB Drives Section
			const diskCards = disks.length ? disks.map(function(d) {
				const benchResultEl = E('div', { style: 'margin-top:8px; font-size:0.8rem; color:#34d399; display:none;' });
				return E('div', {
					style: 'padding:12px 14px; border-radius:10px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.03); margin-bottom:10px;'
				}, [
					E('div', { style: 'display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;' }, [
						E('div', { style: 'display:flex; align-items:center; gap:8px; flex-wrap:wrap;' }, [
							E('span', { style: 'font-size:1.25rem;' }, ['💽']),
							E('strong', { style: 'font-size:0.95rem;' }, [d.label || d.name]),
							E('code', { style: 'font-size:0.78rem;' }, [d.device]),
							E('span', { class: 'ex-pill ' + (d.mounted ? 'online' : 'standby'), style: 'font-size:0.72rem;' }, [
								d.mounted ? ('MONTADO • ' + d.mount_point) : 'DESMONTADO (EJETADO)'
							])
						]),
						E('div', { style: 'font-size:0.82rem; color:#cbd5e1;' }, [
							E('strong', {}, [d.size || '—']),
							' total • ',
							E('span', { style: 'color:#10b981;' }, [(d.avail || '—') + ' livres']),
							' (' + (d.fstype || 'usb') + ')'
						])
					]),
					E('div', { style: 'display:flex; flex-wrap:wrap; gap:6px; margin-top:8px;' }, [
						d.mounted ? E('button', {
							class: 'ex-mini-button',
							click: function(ev) {
								ev.currentTarget.disabled = true;
								ev.currentTarget.textContent = 'Ejetando…';
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-disk-action', 'umount', d.device]).then(function(res) {
									if (res.code) throw new Error(res.stderr || 'Falha ao ejetar');
									ui.addNotification(null, E('p', {}, ['Unidade ' + d.device + ' ejetada com segurança.']));
									self.openKsmbdModal();
								}).catch(function(err) {
									ui.addNotification(null, E('p', {}, [err.message]), 'danger');
									self.openKsmbdModal();
								});
							}
						}, ['⏏️ Ejetar com Segurança']) : E('button', {
							class: 'ex-mini-button',
							style: 'background:rgba(16,185,129,0.18); color:#34d399;',
							click: function(ev) {
								ev.currentTarget.disabled = true;
								ev.currentTarget.textContent = 'Montando…';
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-disk-action', 'mount', d.device]).then(function(res) {
									if (res.code) throw new Error(res.stderr || 'Falha ao montar');
									ui.addNotification(null, E('p', {}, ['Unidade ' + d.device + ' montada e compartilhada!']));
									self.openKsmbdModal();
								}).catch(function(err) {
									ui.addNotification(null, E('p', {}, [err.message]), 'danger');
									self.openKsmbdModal();
								});
							}
						}, ['🔌 Montar Unidade']),
						E('button', {
							class: 'ex-mini-button',
							click: function(ev) {
								const btn = ev.currentTarget;
								btn.disabled = true;
								btn.textContent = '⏳ Medindo Velocidade…';
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-disk-action', 'benchmark', d.device]).then(function(res) {
									btn.disabled = false;
									btn.textContent = '🚀 Benchmark de Velocidade';
									if (res.code) throw new Error(res.stderr || 'Falha no benchmark');
									let bm = {};
									try { bm = JSON.parse(res.stdout || '{}'); } catch(e) {}
									benchResultEl.style.display = 'block';
									benchResultEl.textContent = '⚡ Resultado do Benchmark USB: Leitura Sequencial: ' + (bm.read_mbps || '—') + ' | Gravação Sequencial: ' + (bm.write_mbps || '—');
								}).catch(function(err) {
									btn.disabled = false;
									btn.textContent = '🚀 Benchmark de Velocidade';
									ui.addNotification(null, E('p', {}, [err.message]), 'danger');
								});
							}
						}, ['🚀 Benchmark de Velocidade']),
						E('button', {
							class: 'ex-mini-button',
							click: function(ev) {
								const btn = ev.currentTarget;
								btn.disabled = true;
								btn.textContent = '🩺 Verificando…';
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-disk-action', 'checkfs', d.device]).then(function(res) {
									btn.disabled = false;
									btn.textContent = '🩺 Verificar / Reparar (FSCK)';
									if (res.code) throw new Error(res.stderr || 'Falha no FSCK');
									let ck = {};
									try { ck = JSON.parse(res.stdout || '{}'); } catch(e) {}
									benchResultEl.style.display = 'block';
									benchResultEl.textContent = '🩺 Diagnóstico FSCK: ' + (ck.output || 'Verificação concluída sem erros.');
								}).catch(function(err) {
									btn.disabled = false;
									btn.textContent = '🩺 Verificar / Reparar (FSCK)';
									ui.addNotification(null, E('p', {}, [err.message]), 'danger');
								});
							}
						}, ['🩺 Verificar / Reparar (FSCK)']),
						E('button', {
							class: 'ex-mini-button',
							style: 'background:rgba(239,68,68,0.14); color:#f87171; border:1px solid rgba(239,68,68,0.3);',
							click: function() {
								self.openKsmbdFormatConfirmModal(d);
							}
						}, ['⚠️ Formatar…'])
					]),
					benchResultEl
				]);
			}) : [
				E('div', {
					style: 'padding:14px; border-radius:10px; border:1px dashed rgba(148,163,184,0.3); background:rgba(15,23,42,0.35); color:#94a3b8; font-size:0.84rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;'
				}, [
					E('span', {}, ['🔌 Nenhuma partição USB externa detectada em /dev/sd* ou /mnt/*. Conecte um Pendrive ou HD Externo na porta USB do roteador.']),
					E('button', {
						class: 'ex-mini-button',
						click: function() {
							fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-disk-action', 'sync_shares']).then(function() {
								self.openKsmbdModal();
							});
						}
					}, ['🔄 Atualizar / Sincronizar /mnt'])
				])
			];

			const disksSection = E('div', {
				class: 'ex-device-config-block',
				style: 'margin-bottom:14px; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.09);'
			}, [
				E('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;' }, [
					E('strong', { style: 'font-size:0.93rem;' }, ['💽 Unidades USB Conectadas & Blindagem Anti-MTD/UBI']),
					E('span', { class: 'ex-pill online', style: 'font-size:0.7rem;' }, ['FLASH INTERNA PROTEGIDA'])
				]),
				E('div', {}, diskCards)
			]);

			// 4. Authorized Networks & Firewall Zone Sync
			const zoneDefs = [
				{ key: 'lan', icon: '🏠', title: 'Rede Principal (LAN)', desc: 'Acesso local padrão em alta velocidade para seus computadores, celulares e TVs.' },
				{ key: 'guest', icon: '👥', title: 'Rede de Visitantes (Guest)', desc: 'Permite que convidados acessem os arquivos USB (abre regra TCP 445 na zona Guest).' },
				{ key: 'iot', icon: '💡', title: 'Rede IoT / Smart TVs Isoladas', desc: 'Ideal para TVs ou Media Centers na rede IoT reproduzirem filmes do USB.' },
				{ key: 'wan', icon: '🌐', title: 'Acesso Direto pela Internet (WAN - Porta 445)', desc: 'PERIGOSO: Expõe a porta 445 na WAN pública. Prefira usar WireGuard ou ZeroTier!', danger: true }
			];

			const zoneRows = zoneDefs.map(function(z) {
				const isAllowed = !!(ifaces[z.key]);
				const zChk = E('input', {
					type: 'checkbox',
					checked: isAllowed ? '' : null,
					change: function(ev) {
						const input = ev.currentTarget;
						const desired = input.checked;
						if (z.key === 'wan' && desired) {
							input.checked = false;
							self.openKsmbdWanWarningModal(function() {
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-interface-access', 'wan', '1']).then(function() {
									ui.addNotification(null, E('p', {}, ['Porta 445 liberada na WAN.']), 'warning');
									self.openKsmbdModal();
								});
							}, function() {
								self.openKsmbdModal();
							});
							return;
						}
						input.disabled = true;
						fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-interface-access', z.key, desired ? '1' : '0']).then(function() {
							ui.addNotification(null, E('p', {}, ['Acesso KSMBD na rede ' + z.title + (desired ? ' ativado.' : ' bloqueado.')]));
							self.openKsmbdModal();
						});
					}
				});
				zChk.checked = isAllowed;

				return E('div', {
					style: 'display:flex; justify-content:space-between; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; margin-bottom:6px; background:' + (z.danger && isAllowed ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.03)') + '; border:1px solid ' + (z.danger && isAllowed ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.06)') + ';'
				}, [
					E('div', {}, [
						E('strong', { style: 'font-size:0.86rem; color:' + (z.danger ? '#f87171' : '#f8fafc') + ';' }, [z.icon + ' ' + z.title]),
						E('small', { class: 'ex-muted', style: 'display:block; font-size:0.78rem;' }, [z.desc])
					]),
					E('label', { class: 'ex-switch' }, [zChk, E('span', { class: 'ex-switch-slider' })])
				]);
			});

			const netSection = E('div', {
				class: 'ex-device-config-block',
				style: 'margin-bottom:14px; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.09);'
			}, [
				E('strong', { style: 'font-size:0.93rem; display:block; margin-bottom:8px;' }, ['🛡️ Redes Autorizadas & Sincronização de Firewall (fw4/fw3)']),
				E('div', {}, zoneRows)
			]);

			// 5. SMB Users, Permissions & Global Settings
			const wgInput = E('input', { type: 'text', class: 'cbi-input-text', value: st.workgroup || 'WORKGROUP', maxlength: 32 });
			const descInput = E('input', { type: 'text', class: 'cbi-input-text', value: st.description || 'ARK Router SMB Server', maxlength: 64 });
			const guestChk = E('input', { type: 'checkbox', checked: st.guest_ok !== false ? '' : null });
			guestChk.checked = (st.guest_ok !== false);
			const smbv1Chk = E('input', { type: 'checkbox', checked: st.smbv1_legacy ? '' : null });
			smbv1Chk.checked = !!st.smbv1_legacy;

			const newUserInput = E('input', { type: 'text', class: 'cbi-input-text', placeholder: 'ex: admin_usb ou familia', maxlength: 32 });
			const newPassInput = E('input', { type: 'password', class: 'cbi-input-text', placeholder: 'Senha exclusiva do SMB', maxlength: 64 });
			const newPermSelect = E('select', { class: 'cbi-input-select' }, [
				E('option', { value: 'rw' }, ['🔓 Leitura e Gravação (RW)']),
				E('option', { value: 'ro' }, ['🔒 Somente Leitura (RO)'])
			]);

			const userRows = users.length ? users.map(function(u) {
				const isRo = (u.permission === 'ro');
				return E('tr', {}, [
					E('td', {}, [
						E('strong', {}, ['👤 ' + u.username]),
						u.username === 'root' ? E('span', { class: 'ex-pill standby', style: 'margin-left:6px; font-size:0.68rem;' }, ['ISOLADO DO SSH']) : ''
					]),
					E('td', {}, [
						E('span', { class: 'ex-pill ' + (isRo ? 'standby' : 'online'), style: 'font-size:0.72rem;' }, [
							isRo ? '🔒 Somente Leitura' : '🔓 Leitura & Gravação'
						])
					]),
					E('td', { style: 'text-align:right;' }, [
						E('button', {
							class: 'ex-mini-button',
							style: 'margin-right:6px;',
							click: function() {
								const nextPerm = isRo ? 'rw' : 'ro';
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-user-action', 'permission', u.username, nextPerm]).then(function() {
									ui.addNotification(null, E('p', {}, ['Permissão de ' + u.username + ' alterada para ' + nextPerm.toUpperCase() + '.']));
									self.openKsmbdModal();
								});
							}
						}, [isRo ? 'Mudar p/ Leitura+Gravação' : 'Mudar p/ Só Leitura']),
						E('button', {
							class: 'ex-mini-button',
							style: 'background:rgba(239,68,68,0.15); color:#f87171;',
							click: function() {
								fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-user-action', 'delete', u.username]).then(function() {
									ui.addNotification(null, E('p', {}, ['Conta SMB ' + u.username + ' removida.']));
									self.openKsmbdModal();
								});
							}
						}, ['🗑️ Remover'])
					])
				]);
			}) : [
				E('tr', {}, [
					E('td', { colspan: 3, class: 'ex-muted', style: 'text-align:center; padding:10px;' }, [
						'Nenhuma conta com senha cadastrada (Acesso Convidado / Guest ativo na LAN).'
					])
				])
			];

			const usersSection = E('div', {
				class: 'ex-device-config-block',
				style: 'margin-bottom:14px; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.09);'
			}, [
				E('strong', { style: 'font-size:0.93rem; display:block; margin-bottom:6px;' }, ['🔐 Contas de Acesso SMB, Permissões & Workgroup']),
				E('div', {
					style: 'margin-bottom:10px; padding:8px 12px; border-radius:8px; background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.25); font-size:0.79rem; color:#cbd5e1;'
				}, [
					'🛡️ ', E('strong', { style: 'color:#60a5fa;' }, ['Isolamento de Credenciais:']),
					' As senhas cadastradas aqui ficam exclusivamente no banco criptografado do KSMBD (/etc/ksmbd/ksmbdpwd.db). Mesmo que você crie um usuário chamado "root", a senha dele no SMB é 100% independente da senha administrativa SSH/Web do roteador.'
				]),
				E('div', { class: 'ark-table-scroll-wrap', style: 'overflow-x:auto; margin-bottom:10px;' }, [
					E('table', { class: 'table cbi-section-table', style: 'width:100%; font-size:0.84rem;' }, [
						E('thead', {}, [
							E('tr', {}, [
								E('th', {}, ['Usuário SMB']),
								E('th', {}, ['Permissão nas Pastas']),
								E('th', { style: 'text-align:right;' }, ['Ações'])
							])
						]),
						E('tbody', {}, userRows)
					])
				]),
				E('div', { class: 'ex-ez-grid ex-ez-grid-3', style: 'gap:8px; align-items:end; margin-bottom:12px;' }, [
					E('label', { class: 'ex-ez-field' }, [E('span', {}, ['Novo Usuário SMB']), newUserInput]),
					E('label', { class: 'ex-ez-field' }, [E('span', {}, ['Senha SMB']), newPassInput]),
					E('label', { class: 'ex-ez-field' }, [E('span', {}, ['Nível de Acesso']), newPermSelect])
				]),
				E('div', { style: 'display:flex; justify-content:flex-end; margin-bottom:12px;' }, [
					E('button', {
						class: 'ex-mini-button',
						style: 'background:rgba(59,130,246,0.2); color:#60a5fa; border:1px solid rgba(59,130,246,0.4); font-weight:700;',
						click: function() {
							const u = newUserInput.value.trim();
							const p = newPassInput.value;
							if (!u || !p) {
								ui.addNotification(null, E('p', {}, ['Informe o nome de usuário e a senha SMB.']), 'warning');
								return;
							}
							fs.exec('/usr/sbin/equipe-dashboard-control', ['ksmbd-user-action', 'add', u, p, newPermSelect.value]).then(function(res) {
								if (res.code) throw new Error(res.stderr || 'Falha ao salvar usuário SMB');
								ui.addNotification(null, E('p', {}, ['Usuário SMB ' + u + ' salvo com sucesso!']));
								self.openKsmbdModal();
							}).catch(function(err) {
								ui.addNotification(null, E('p', {}, [err.message]), 'danger');
							});
						}
					}, ['➕ Adicionar / Atualizar Conta SMB'])
				]),
				E('hr', { style: 'border:none; border-top:1px solid rgba(255,255,255,0.08); margin:10px 0;' }),
				E('div', { class: 'ex-ez-grid ex-ez-grid-2', style: 'gap:10px; margin-bottom:10px;' }, [
					E('label', { class: 'ex-ez-field' }, [E('span', {}, ['Grupo de Trabalho (Workgroup)']), wgInput]),
					E('label', { class: 'ex-ez-field' }, [E('span', {}, ['Descrição do Servidor na Rede']), descInput])
				]),
				E('div', { style: 'display:flex; flex-wrap:wrap; gap:16px; align-items:center; justify-content:space-between;' }, [
					E('label', { style: 'display:flex; align-items:center; gap:8px; font-size:0.84rem; cursor:pointer;' }, [
						guestChk,
						E('span', {}, ['Permitir Acesso Convidado (Guest sem senha na LAN)'])
					]),
					E('label', { style: 'display:flex; align-items:center; gap:8px; font-size:0.84rem; cursor:pointer;' }, [
						smbv1Chk,
						E('span', {}, ['Compatibilidade SMBv1 Legado (TV Box / PS2 / Impressoras antigas)'])
					]),
					E('button', {
						class: 'ex-mini-button',
						style: 'font-weight:700;',
						click: function() {
							fs.exec('/usr/sbin/equipe-dashboard-control', [
								'ksmbd-config-save',
								wgInput.value.trim() || 'WORKGROUP',
								descInput.value.trim() || 'ARK Router SMB Server',
								guestChk.checked ? '1' : '0',
								smbv1Chk.checked ? '1' : '0'
							]).then(function(res) {
								if (res.code) throw new Error(res.stderr || 'Falha ao salvar configuração KSMBD');
								ui.addNotification(null, E('p', {}, ['Configurações globais do KSMBD salvas com sucesso!']));
								self.openKsmbdModal();
							}).catch(function(err) {
								ui.addNotification(null, E('p', {}, [err.message]), 'danger');
							});
						}
					}, ['💾 Salvar Parâmetros SMB'])
				])
			]);

			// 6. Connection Guide (Windows / macOS / iOS / Android)
			const guideSection = E('div', {
				class: 'ex-device-config-block',
				style: 'padding:12px 14px; border-radius:12px; background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.22);'
			}, [
				E('strong', { style: 'font-size:0.88rem; color:#34d399; display:block; margin-bottom:6px;' }, ['📖 Como Acessar seus Arquivos nos Dispositivos:']),
				E('div', { class: 'ex-grid ex-grid-2', style: 'gap:8px; font-size:0.81rem;' }, [
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['🪟 Windows (Explorador de Arquivos): ']),
						E('code', { style: 'color:#38bdf8; font-weight:700;' }, ['\\\\' + lanIp])
					]),
					E('div', {}, [
						E('span', { class: 'ex-muted' }, ['🍎 macOS Finder / iPhone (App Arquivos): ']),
						E('code', { style: 'color:#38bdf8; font-weight:700;' }, ['smb://' + lanIp])
					])
				])
			]);

			ui.showModal('🗄️ Servidor de Arquivos USB (Kernel SMB 3.1.1 — KSMBD)', [
				installBanner,
				serverCtrlBox,
				disksSection,
				netSection,
				usersSection,
				guideSection,
				E('div', { class: 'right', style: 'margin-top:14px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar'])
				])
			]);
		}).catch(function(err) {
			ui.showModal('🗄️ Servidor de Arquivos USB (KSMBD)', [
				E('p', { class: 'alert-message warning' }, [err.message]),
				E('div', { class: 'right' }, [E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar'])])
			]);
		});
	},

	// =========================================================================
	// 2. WAKE-ON-LAN (ETHERWAKE / MAGIC PACKET IEEE 802.3)
	// =========================================================================
	wolCard: function() {
		const self = this;
		const f = this.feature('wol') || {};
		const installed = !!f.installed;

		const pillEl = E('span', { id: 'ex-wol-pill', class: 'ex-pill ' + (installed ? 'online' : 'standby') }, [
			installed ? 'PRONTO (ETHERWAKE)' : 'OPCIONAL'
		]);
		const titleActions = E('div', { class: 'ex-card-title-actions' }, [pillEl]);
		const cardTitle = E('div', { class: 'ex-card-title' }, [
			E('div', {}, [
				E('span', { class: 'ex-kicker' }, ['LIGAR PC & SERVIDORES REMOTAMENTE (MAGIC PACKET)']),
				E('h3', {}, ['Wake-on-LAN (WoL)'])
			]),
			titleActions
		]);

		const summaryGrid = E('div', { class: 'ex-grid ex-grid-2 ex-qos-grid', style: 'margin-bottom: 12px;' }, [
			E('div', { class: 'ex-row' }, [
				E('span', {}, ['Motor de Disparo']),
				E('strong', { id: 'ex-wol-engine-state' }, [installed ? '⚡ etherwake (L2 0x0842)' : '📦 Opcional (~30 KB)'])
			]),
			E('div', { class: 'ex-row' }, [
				E('span', {}, ['Interface Padrão']),
				E('strong', { id: 'ex-wol-lan-iface' }, ['br-lan'])
			]),
			E('div', { class: 'ex-row' }, [
				E('span', {}, ['Hosts Detectados']),
				E('strong', { id: 'ex-wol-hosts-count' }, ['Consultando…'])
			]),
			E('div', { class: 'ex-row' }, [
				E('span', {}, ['Favoritos Salvos']),
				E('strong', { id: 'ex-wol-favs-count' }, ['0 favoritados'])
			])
		]);

		const quickWakeStrip = E('div', { id: 'ex-wol-quick-strip', style: 'margin-bottom: 12px; display:none;' });

		const actionsRow = E('div', { class: 'ex-speedify-actions', style: 'display:flex; flex-wrap:wrap; gap:8px; align-items:center;' }, [
			(!installed) ? E('button', {
				id: 'ex-wol-install-btn',
				class: 'ex-mini-button',
				style: 'background:rgba(16,185,129,0.18); color:#34d399; border:1px solid rgba(16,185,129,0.4); font-weight:750;',
				click: function() { self.installFeature('wol'); }
			}, ['📦 Instalar Wake-on-LAN (etherwake)']) : '',
			E('button', {
				class: 'ex-mini-button',
				style: 'font-weight:700;',
				click: function() { self.openWolModal(); }
			}, ['⚡ Abrir Central Wake-on-LAN (Acordar Dispositivos)']),
			(!installed) ? E('button', {
				class: 'ex-feature-link',
				click: function() { self.setFeatureHidden('wol', true); }
			}, ['Ocultar sugestão']) : ''
		]);

		const cardBody = E('div', { class: 'ex-card-collapse-body' }, [
			E('div', { class: 'ex-card-collapse-inner' }, [
				E('p', { class: 'ex-muted', style: 'margin-bottom: 12px;' }, [
					'Envia quadros Ethernet mágicos (Magic Packet IEEE 802.3 + Broadcast) diretamente pela bridge local para ligar computadores, PCs Gamers e servidores NAS remotamente, mesmo quando estiverem desligados e fora da tabela DHCP ativa.'
				]),
				summaryGrid,
				quickWakeStrip,
				actionsRow
			])
		]);

		const cardEl = E('section', { class: 'ex-card ex-wol-card' }, [
			cardTitle,
			cardBody
		]);

		const acc = setupCardAccordion({
			id: 'wol',
			cardEl: cardEl,
			titleEl: cardTitle,
			bodyEl: cardBody,
			isActive: installed
		});
		titleActions.appendChild(acc.expandBtn);
		self._wolAccordion = acc;

		window.setTimeout(function() { self.refreshWolCardSummary(); }, 350);
		return cardEl;
	},

	refreshWolCardSummary: function() {
		const self = this;
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wol-status']).then(function(r) {
			let st = {};
			try { st = JSON.parse(r.stdout || '{}'); } catch(e) {}
			self._wolLastStatus = st;
			const devs = Array.isArray(st.devices) ? st.devices : [];
			const favs = devs.filter(function(d) { return !!d.favorite; });

			const pill = document.getElementById('ex-wol-pill');
			if (pill) {
				pill.className = 'ex-pill ' + (st.installed ? 'online' : 'standby');
				pill.textContent = st.installed ? 'PRONTO (ETHERWAKE)' : 'OPCIONAL';
			}
			const eng = document.getElementById('ex-wol-engine-state');
			if (eng) {
				eng.textContent = st.installed ? '⚡ etherwake (L2 0x0842)' : '📦 Opcional (~30 KB)';
			}
			const instBtn = document.getElementById('ex-wol-install-btn');
			if (instBtn) {
				instBtn.style.display = st.installed ? 'none' : '';
			}
			const ifEl = document.getElementById('ex-wol-lan-iface');
			if (ifEl && st.lan_iface) {
				ifEl.textContent = st.lan_iface;
			}
			const hEl = document.getElementById('ex-wol-hosts-count');
			if (hEl) {
				hEl.textContent = devs.length + ' aparelho(s) na LAN';
			}
			const fEl = document.getElementById('ex-wol-favs-count');
			if (fEl) {
				fEl.textContent = favs.length + ' favorito(s)';
			}

			const strip = document.getElementById('ex-wol-quick-strip');
			if (strip) {
				if (favs.length > 0) {
					strip.style.display = 'flex';
					strip.style.flexWrap = 'wrap';
					strip.style.gap = '8px';
					strip.replaceChildren.apply(strip, favs.map(function(fv) {
						return E('button', {
							class: 'ex-mini-button',
							style: 'background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); font-weight:700;',
							title: 'Disparar Magic Packet para ' + fv.mac,
							click: function() {
								self.triggerWolWake(fv.mac, fv.name, fv.iface || st.lan_iface || 'br-lan');
							}
						}, ['⚡ Acordar ' + fv.name + ' (' + fv.mac + ')']);
					}));
				} else {
					strip.style.display = 'none';
				}
			}
		}).catch(function() {});
	},

	triggerWolWake: function(mac, name, iface, btnEl) {
		const self = this;
		if (btnEl) {
			btnEl.disabled = true;
			btnEl.textContent = '⚡ Enviando…';
		}
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wol-wake', mac, iface || 'br-lan']).then(function(r) {
			if (btnEl) {
				btnEl.disabled = false;
				btnEl.textContent = '✅ Pacote Enviado!';
				window.setTimeout(function() { btnEl.textContent = '⚡ Acordar (Wake)'; }, 2500);
			}
			if (r.code) throw new Error(r.stderr || 'Falha ao enviar Magic Packet');
			ui.addNotification(null, E('p', {}, ['⚡ Magic Packet (Wake-on-LAN) enviado para ' + (name || mac) + ' [' + mac + '] na interface ' + (iface || 'br-lan') + '!']));
		}).catch(function(err) {
			if (btnEl) {
				btnEl.disabled = false;
				btnEl.textContent = '⚡ Acordar (Wake)';
			}
			ui.addNotification(null, E('p', {}, [err.message]), 'danger');
		});
	},

	openWolModal: function() {
		const self = this;
		ui.showModal('⚡ Central Wake-on-LAN (Acordar Computadores e Servidores)', [
			E('p', { class: 'ex-muted' }, ['Consultando tabela ARP, concessões DHCP e favoritos salvos…'])
		]);

		return fs.exec('/usr/sbin/equipe-dashboard-control', ['wol-status']).then(function(r) {
			let st = {};
			try { st = JSON.parse(r.stdout || '{}'); } catch(e) {}
			self._wolLastStatus = st;
			self.refreshWolCardSummary();

			const isInst = !!st.installed;
			const lanIface = st.lan_iface || 'br-lan';
			const devs = Array.isArray(st.devices) ? st.devices : [];

			// Sort favorites first, then online, then alphabetical
			devs.sort(function(a, b) {
				if (!!a.favorite !== !!b.favorite) return a.favorite ? -1 : 1;
				if (!!a.online !== !!b.online) return a.online ? -1 : 1;
				return String(a.name || '').localeCompare(String(b.name || ''));
			});

			const installBanner = !isInst ? E('div', {
				style: 'margin-bottom:14px; padding:14px 16px; border-radius:12px; background:linear-gradient(90deg, rgba(245,158,11,0.14) 0%, rgba(59,130,246,0.14) 100%); border:1px solid rgba(245,158,11,0.4); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;'
			}, [
				E('div', { style: 'flex:1; min-width:240px;' }, [
					E('div', { style: 'display:flex; align-items:center; gap:8px; margin-bottom:4px;' }, [
						E('span', { class: 'ex-pill standby' }, ['MÓDULO OPCIONAL (~30 KB)']),
						E('strong', { style: 'font-size:0.95rem; color:#f8fafc;' }, ['Utilitário etherwake ainda não instalado'])
					]),
					E('small', { class: 'ex-muted', style: 'display:block; line-height:1.4;' }, [
						'A lista de dispositivos da sua rede e o cadastro de PCs favoritos já estão prontos abaixo! Instale o pacote ultraleve etherwake com 1 clique para disparar pacotes mágicos físicos na camada 2.'
					])
				]),
				E('button', {
					class: 'btn cbi-button cbi-button-positive',
					style: 'font-weight:750;',
					click: function() {
						closeModal();
						self.installFeature('wol');
					}
				}, ['📦 Instalar etherwake Agora'])
			]) : '';

			// Manual Wake & Save Favorite Form
			const macInput = E('input', {
				type: 'text',
				class: 'cbi-input-text',
				placeholder: 'AA:BB:CC:DD:EE:FF',
				maxlength: 17,
				style: 'font-family:monospace; text-transform:uppercase;'
			});
			const nameInput = E('input', {
				type: 'text',
				class: 'cbi-input-text',
				placeholder: 'ex: PC Gamer Quarto / Servidor NAS',
				maxlength: 48
			});
			const ifaceInput = E('input', {
				type: 'text',
				class: 'cbi-input-text',
				value: lanIface,
				maxlength: 16
			});

			const manualBox = E('div', {
				class: 'ex-device-config-block',
				style: 'margin-bottom:14px; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.09); background:rgba(15,23,42,0.55);'
			}, [
				E('strong', { style: 'font-size:0.93rem; display:block; margin-bottom:8px;' }, ['🎯 Disparo Manual & Cadastro de Dispositivo Favorito (Persistente)']),
				E('div', { class: 'ex-ez-grid ex-ez-grid-3', style: 'gap:8px; margin-bottom:10px;' }, [
					E('label', { class: 'ex-ez-field' }, [E('span', {}, ['Endereço MAC do Alvo']), macInput]),
					E('label', { class: 'ex-ez-field' }, [E('span', {}, ['Nome / Identificação']), nameInput]),
					E('label', { class: 'ex-ez-field' }, [E('span', {}, ['Interface de Rede']), ifaceInput])
				]),
				E('div', { style: 'display:flex; justify-content:flex-end; flex-wrap:wrap; gap:8px;' }, [
					E('button', {
						class: 'ex-mini-button',
						style: 'background:rgba(245,158,11,0.16); color:#fbbf24; border:1px solid rgba(245,158,11,0.35); font-weight:700;',
						click: function() {
							const m = macInput.value.trim().toUpperCase();
							const n = nameInput.value.trim() || 'PC Favorito';
							const ifc = ifaceInput.value.trim() || lanIface;
							if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(m)) {
								ui.addNotification(null, E('p', {}, ['Informe um endereço MAC válido no formato AA:BB:CC:DD:EE:FF.']), 'warning');
								return;
							}
							fs.exec('/usr/sbin/equipe-dashboard-control', ['wol-target-save', m, n, '', ifc]).then(function(res) {
								if (res.code) throw new Error(res.stderr || 'Falha ao salvar favorito');
								ui.addNotification(null, E('p', {}, ['⭐ ' + n + ' (' + m + ') salvo nos favoritos do Wake-on-LAN!']));
								self.openWolModal();
							}).catch(function(err) {
								ui.addNotification(null, E('p', {}, [err.message]), 'danger');
							});
						}
					}, ['⭐ Fixar nos Favoritos']),
					E('button', {
						class: 'ex-mini-button',
						style: 'background:rgba(16,185,129,0.2); color:#34d399; border:1px solid rgba(16,185,129,0.4); font-weight:750;',
						click: function(ev) {
							const m = macInput.value.trim().toUpperCase();
							const n = nameInput.value.trim() || m;
							const ifc = ifaceInput.value.trim() || lanIface;
							if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(m)) {
								ui.addNotification(null, E('p', {}, ['Informe um endereço MAC válido no formato AA:BB:CC:DD:EE:FF.']), 'warning');
								return;
							}
							self.triggerWolWake(m, n, ifc, ev.currentTarget);
						}
					}, ['⚡ Disparar Magic Packet Agora'])
				])
			]);

			// Detected LAN Hosts Table
			const hostRows = devs.length ? devs.map(function(d) {
				return E('tr', {}, [
					E('td', {}, [
						E('div', { style: 'display:flex; align-items:center; gap:6px;' }, [
							E('span', {}, [d.favorite ? '⭐' : '🖥️']),
							E('strong', {}, [d.name || 'Dispositivo LAN']),
							d.favorite ? E('span', { class: 'ex-pill online', style: 'font-size:0.65rem; padding:1px 6px;' }, ['FAVORITO']) : ''
						])
					]),
					E('td', {}, [
						E('span', {}, [d.ip || '—']),
						E('small', { class: 'ex-muted', style: 'display:block; font-size:0.72rem;' }, [d.iface || lanIface])
					]),
					E('td', {}, [
						E('code', { style: 'font-size:0.8rem;' }, [d.mac])
					]),
					E('td', {}, [
						E('span', { class: 'ex-pill ' + (d.online ? 'online' : 'standby'), style: 'font-size:0.72rem;' }, [
							d.online ? '🟢 ONLINE (ARP)' : '🌙 EM ESPERA / DESLIGADO'
						])
					]),
					E('td', { style: 'text-align:right; white-space:nowrap;' }, [
						E('button', {
							class: 'ex-mini-button',
							style: 'background:rgba(56,189,248,0.16); color:#38bdf8; border:1px solid rgba(56,189,248,0.35); font-weight:750; margin-right:6px;',
							click: function(ev) {
								self.triggerWolWake(d.mac, d.name, d.iface || lanIface, ev.currentTarget);
							}
						}, ['⚡ Acordar (Wake)']),
						E('button', {
							class: 'ex-mini-button',
							title: d.favorite ? 'Remover dos Favoritos' : 'Fixar nos Favoritos (persiste mesmo desligado)',
							click: function() {
								const cmd = d.favorite
									? ['wol-target-delete', d.mac]
									: ['wol-target-save', d.mac, d.name || 'PC LAN', d.ip || '', d.iface || lanIface];
								fs.exec('/usr/sbin/equipe-dashboard-control', cmd).then(function() {
									self.openWolModal();
								});
							}
						}, [d.favorite ? '★ Fixado' : '☆ Favoritar'])
					])
				]);
			}) : [
				E('tr', {}, [
					E('td', { colspan: 5, class: 'ex-muted', style: 'text-align:center; padding:14px;' }, [
						'Nenhum dispositivo detectado no momento. Use o formulário acima para cadastrar o MAC do seu PC.'
					])
				])
			];

			const tableSection = E('div', {
				class: 'ex-device-config-block',
				style: 'margin-bottom:14px; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.09);'
			}, [
				E('div', { style: 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;' }, [
					E('strong', { style: 'font-size:0.93rem;' }, ['🖧 Aparelhos na Rede Local (ARP + Concessões DHCP + Favoritos)']),
					E('small', { class: 'ex-muted' }, ['Dica: Favoritar um PC mantém ele na lista mesmo quando desligado por vários dias'])
				]),
				E('div', { class: 'ark-table-scroll-wrap', style: 'overflow-x:auto;' }, [
					E('table', { class: 'table cbi-section-table', style: 'width:100%; font-size:0.84rem;' }, [
						E('thead', {}, [
							E('tr', {}, [
								E('th', {}, ['Dispositivo']),
								E('th', {}, ['IP / Interface']),
								E('th', {}, ['Endereço MAC']),
								E('th', {}, ['Status Atual']),
								E('th', { style: 'text-align:right;' }, ['Ações'])
							])
						]),
						E('tbody', {}, hostRows)
					])
				])
			]);

			const biosTipBox = E('div', {
				class: 'ex-device-config-block',
				style: 'padding:12px 14px; border-radius:12px; background:rgba(59,130,246,0.06); border:1px solid rgba(59,130,246,0.22); font-size:0.8rem; color:#cbd5e1; line-height:1.45;'
			}, [
				E('strong', { style: 'color:#60a5fa; display:block; margin-bottom:4px;' }, ['💡 Requisitos Rápidos no Computador Alvo (BIOS & Windows):']),
				E('span', {}, [
					'1. O computador deve estar conectado via ', E('strong', {}, ['Cabo de Rede Ethernet']), '. ',
					'2. Na BIOS da placa-mãe, ative ', E('code', {}, ['Power On By PCI-E / LAN']), ' e deixe ', E('code', {}, ['ErP Ready = Disabled']), '. ',
					'3. No Windows (Gerenciador de Dispositivos → Placa de Rede → Avançado), ative ', E('code', {}, ['Wake on Magic Packet']), '.'
				])
			]);

			ui.showModal('⚡ Central Wake-on-LAN (Acordar Computadores e Servidores)', [
				installBanner,
				manualBox,
				tableSection,
				biosTipBox,
				E('div', { class: 'right', style: 'margin-top:14px;' }, [
					E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar'])
				])
			]);
		}).catch(function(err) {
			ui.showModal('⚡ Central Wake-on-LAN', [
				E('p', { class: 'alert-message warning' }, [err.message]),
				E('div', { class: 'right' }, [E('button', { class: 'btn cbi-button cbi-button-neutral', click: closeModal }, ['Fechar'])])
			]);
		});
	}
};
