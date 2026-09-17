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
