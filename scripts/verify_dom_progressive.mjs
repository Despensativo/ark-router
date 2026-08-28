import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const ROUTER_URL = "http://192.168.73.1/cgi-bin/luci/admin/equipe-dashboard";
const USER = "root";
const PASS = "admin0100";

let id = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function httpJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} returned HTTP ${res.status}`);
  return res.json();
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const pending = new Map();
  const consoleMessages = [];
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Runtime.consoleAPICalled') {
      consoleMessages.push(msg.params.type + ': ' + msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' '));
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      consoleMessages.push('EXCEPTION: ' + JSON.stringify(msg.params.exceptionDetails));
    }
    if (msg.method === 'Log.entryAdded') {
      consoleMessages.push('LOG: ' + JSON.stringify(msg.params.entry));
    }
    if (!msg.id || !pending.has(msg.id)) return;
    const callbacks = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) callbacks.reject(new Error(JSON.stringify(msg.error)));
    else callbacks.resolve(msg.result);
  };

  return {
    send: (method, params = {}) => new Promise((resolve, reject) => {
      const msgId = ++id;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    }),
    consoleMessages
  };
}

const userDataDir = path.resolve('C:/temp/chrome-ark-test');
fs.mkdirSync(userDataDir, { recursive: true });

const chrome = spawn(CHROME_PATH, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--disable-gpu',
  '--no-sandbox',
  '--ignore-certificate-errors',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
], { stdio: 'ignore' });

process.on('exit', () => chrome.kill());
await sleep(2000);

try {
  const list = await httpJson(`http://127.0.0.1:${PORT}/json/list`);
  const page = list[0];
  const client = await connect(page.webSocketDebuggerUrl);
  const send = client.send;
  const consoleMessages = client.consoleMessages;

  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('DOM.enable');

  const evalJs = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res && res.result ? res.result.value : null;
  };

  console.log("1. Acessando painel direto:", ROUTER_URL);
  await send('Page.navigate', { url: ROUTER_URL });
  await sleep(3000);

  let currentUrl = await evalJs(`window.location.href`);
  console.log("  URL atual:", currentUrl);

  const isLoginPage = await evalJs(`!!document.querySelector('input[type="password"]')`);
  if (isLoginPage) {
    console.log("2. Fazendo login...");
    await evalJs(`
      const u = document.querySelector('input[name="luci_username"]') || document.querySelector('input[name="username"]');
      const p = document.querySelector('input[name="luci_password"]') || document.querySelector('input[name="password"]');
      if (u) u.value = '${USER}';
      if (p) p.value = '${PASS}';
      const form = document.querySelector('form');
      if (form) form.submit();
    `);
    await sleep(5000);
    currentUrl = await evalJs(`window.location.href`);
    console.log("  URL após login:", currentUrl);
  }

  await send('Log.enable');
  await send('Runtime.enable');

  const logs = [];
  // escuta logs
  send('Runtime.evaluate', {
    expression: `
      window.__logs = [];
      window.addEventListener('error', e => window.__logs.push('ERR: ' + e.message + ' at ' + e.filename + ':' + e.lineno));
      const origErr = console.error;
      console.error = function(...args) { window.__logs.push('CONSOLE.ERR: ' + args.join(' ')); origErr.apply(console, args); };
    `
  });

  // Aguarda renderização completa dos cards do LuCI JS
  console.log("3. Aguardando renderização dos cards do painel...");
  for (let i = 0; i < 20; i++) {
    const cardCount = await evalJs(`document.querySelectorAll('.ex-card').length`);
    if (cardCount > 0) {
      console.log(`  -> Cards detectados (${cardCount}) após ${i + 1} segundos.`);
      await sleep(3500);
      break;
    }
    await sleep(1000);
  }

  const browserLogs = await evalJs(`window.__logs || []`);
  const viewHtml = await evalJs(`(document.getElementById('view') || document.body).innerHTML.slice(0, 1500)`);
  const title = await evalJs(`document.title`);
  const cards = await evalJs(`document.querySelectorAll('.ex-card').length`);
  const lanCards = await evalJs(`Array.from(document.querySelectorAll('.ex-lan-card h3')).map(e => e.textContent)`);
  const wanCards = await evalJs(`Array.from(document.querySelectorAll('.ex-wan-card h3')).map(e => e.textContent)`);
  const lanBtns = await evalJs(`Array.from(document.querySelectorAll('.ex-lan-card .ex-wan-edit-button')).map(e => e.textContent.trim())`);
  const lanCaption = await evalJs(`(document.querySelector('.ex-lan-title small') || {}).textContent || ''`);
  const starlinkDisplay = await evalJs(`(function(){ const el = document.getElementById('ex-starlink-global-panel'); return el ? { display: window.getComputedStyle(el).display, style: el.getAttribute('style') } : 'não encontrado'; })()`);
  const wan1Latency = await evalJs(`(document.getElementById('ex-wan1-latency') || {}).textContent || ''`);
  const wan2Latency = await evalJs(`(document.getElementById('ex-wan2-latency') || {}).textContent || ''`);

  // Teste de clique no botão "Usar como WAN3" da LAN1
  await evalJs(`document.querySelector('.ex-lan-card .ex-wan-edit-button').click()`);
  await sleep(1000);
  const modalInfo = await evalJs(`(function(){
    const title = (document.querySelector('.modal h4') || document.querySelector('.modal h3') || document.querySelector('.modal .cbi-modal-title') || document.querySelector('.modal strong') || {}).textContent || '';
    const selects = document.querySelectorAll('.ex-wan-edit-grid select');
    const portSelect = selects[1];
    const options = portSelect ? Array.from(portSelect.options).map(o => o.text) : [];
    const disabled = portSelect ? portSelect.disabled : false;
    return { title: title, portOptions: options, portDisabled: disabled };
  })()`);
  await evalJs(`const closeBtn = document.querySelector('.modal .cbi-button-neutral'); if (closeBtn) closeBtn.click();`);
  await sleep(2500);

  // Teste de clique no primeiro botão "Configurar" da tabela de dispositivos
  await evalJs(`const details = document.getElementById('ex-device-details'); if (details && !details.open) { details.open = true; }`);
  await sleep(3500);

  const deviceModalPrio = await evalJs(`new Promise((resolve) => {
    const dBtn = document.querySelector('.ex-device-action button') || document.querySelector('#ex-device-body button');
    if (!dBtn) { resolve({ error: 'Configurar button not found in table' }); return; }
    dBtn.click();
    setTimeout(() => {
      const prioButtons = Array.from(document.querySelectorAll('.ex-priority-option-btn')).map(b => ({
        text: b.textContent.trim(),
        active: b.classList.contains('active')
      }));
      const descText = (document.querySelector('.ex-priority-desc-text') || {}).textContent || '';
      const tipText = (document.querySelector('.ex-priority-desc-box .alert-message') || {}).textContent || '';
      const closeBtn = document.querySelector('.modal .cbi-button-neutral');
      if (closeBtn) closeBtn.click();
      resolve({ buttons: prioButtons, desc: descText, tip: tipText });
    }, 2500);
  })`);

  // Teste de abertura do modal "Adicionar Rede Wi-Fi"
  const addWifiModalInfo = await evalJs(`new Promise((resolve) => {
    const addBtn = document.querySelector('.ex-wifi-add-btn');
    if (!addBtn) { resolve({ error: 'Add wifi button not found' }); return; }
    addBtn.click();
    setTimeout(() => {
      const title = (document.querySelector('.modal h4') || document.querySelector('.modal strong') || {}).textContent || '';
      const encOptions = Array.from(document.querySelectorAll('.modal select')[0] ? document.querySelectorAll('.modal select')[0].options : []).map(o => o.text);
      const closeBtn = document.querySelector('.modal .cbi-button-neutral');
      if (closeBtn) closeBtn.click();
      resolve({ title: title, encOptions: encOptions });
    }, 1500);
  })`);

  // Teste de abertura do modal "Escolher canais"
  const channelModalInfo = await evalJs(`new Promise((resolve) => {
    const chBtns = Array.from(document.querySelectorAll('.ex-channel-actions button'));
    const chBtn = chBtns.find(b => b.textContent.includes('Escolher canais'));
    if (!chBtn) { resolve({ error: 'Escolher canais button not found' }); return; }
    chBtn.click();
    setTimeout(() => {
      const title = (document.querySelector('.modal h4') || document.querySelector('.modal strong') || {}).textContent || '';
      const selects = document.querySelectorAll('.modal select');
      const ch2Opts = selects[0] ? Array.from(selects[0].options).map(o => o.value) : [];
      const ch5Opts = selects[1] ? Array.from(selects[1].options).map(o => o.value) : [];
      const closeBtn = document.querySelector('.modal .cbi-button-neutral');
      if (closeBtn) closeBtn.click();
      resolve({ title: title, ch2Count: ch2Opts.length, ch5Count: ch5Opts.length });
    }, 1500);
  })`);

  // Teste de abertura do modal "Aceleração de Internet & Perfis WAN"
  const wanOptModalInfo = await evalJs(`new Promise((resolve) => {
    const editWanBtns = Array.from(document.querySelectorAll('.ex-wan-edit-button'));
    if (!editWanBtns.length) { resolve({ error: 'Edit WAN button not found' }); return; }
    editWanBtns[0].click();
    setTimeout(() => {
      const optBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Aceleração de Internet, XPON'));
      if (!optBtn) { resolve({ error: 'Opt button in editWan not found' }); return; }
      optBtn.click();
      setTimeout(() => {
        const modal = document.querySelector('#modal_content');
        if (!modal) { resolve({ error: 'Modal content not found' }); return; }
        const presets = Array.from(modal.querySelectorAll('.ex-opt-preset-btn')).map(b => ({
          tag: (b.querySelector('.ex-opt-preset-tag') || {}).textContent || '',
          label: (b.querySelector('strong') || {}).textContent || '',
          active: b.classList.contains('active')
        }));
        const chips = Array.from(modal.querySelectorAll('.ex-opt-chip')).map(c => ({
          label: c.textContent.trim(),
          active: c.classList.contains('active')
        }));
        const switches = Array.from(modal.querySelectorAll('.ex-opt-module-card')).map(m => ({
          name: (m.querySelector('strong') || {}).textContent || '',
          checked: !!(m.querySelector('input') || {}).checked
        }));
        const closeBtn = document.querySelector('.cbi-button-neutral');
        if (closeBtn) closeBtn.click();
        resolve({ presets, chips, switches });
      }, 1500);
    }, 1200);
  })`);

  const wifiIcons = await evalJs(`Array.from(document.querySelectorAll('.ex-center-card .ex-big-icon')).map(e => e.innerHTML.slice(0, 40))`);
  const mwanButtons = await evalJs(`Array.from(document.querySelectorAll('.ex-mode-grid .ex-mode-button')).map(b => b.textContent.trim())`);
  const downPeak = await evalJs(`(document.getElementById('ex-history-down-peak') || {}).textContent || ''`);
  const upPeak = await evalJs(`(document.getElementById('ex-history-up-peak') || {}).textContent || ''`);

  const deviceBadges = await evalJs(`Array.from(document.querySelectorAll('#ex-device-body tr')).map(tr => ({
    name: (tr.querySelector('strong') || {}).textContent || '',
    badges: Array.from(tr.querySelectorAll('.ex-device-badge')).map(b => b.textContent.trim()),
    meta: (tr.querySelector('.ex-device-meta') || {}).textContent || ''
  }))`);

  console.log("\n4. RESULTADO DA VALIDAÇÃO VISUAL NO NAVEGADOR:");
  console.log("  -> Título da página:", title);
  console.log("  -> Total de cards no painel:", cards);
  console.log("  -> Dispositivos com Badges Visuais (Fila & IP Fixo):", JSON.stringify(deviceBadges, null, 2));
  console.log("  -> Pico Download 24h:", downPeak);
  console.log("  -> Pico Upload 24h:", upPeak);
  console.log("  -> Latência WAN1 (Online):", wan1Latency);
  console.log("  -> Latência WAN2 (Sem cabo):", wan2Latency);
  console.log("  -> Portas LAN encontradas:", lanCards);
  console.log("  -> Botões nas portas LAN:", lanBtns);
  console.log("  -> Botões Dinâmicos Multi-WAN:", JSON.stringify(mwanButtons));
  console.log("  -> Modal Prioridade Dispositivo:", JSON.stringify(deviceModalPrio));
  console.log("  -> Modal Aceleração e Perfis WAN (Corrigido):", JSON.stringify(wanOptModalInfo, null, 2));
  console.log("  -> Modal Adicionar Wi-Fi (Criptografia):", JSON.stringify(addWifiModalInfo));
  console.log("  -> Modal Escolher Canais (2.4G & 5G):", JSON.stringify(channelModalInfo));
  console.log("  -> Novos Ícones SVG Wi-Fi:", JSON.stringify(wifiIcons));
  console.log("  -> Modal de WAN aberto a partir da LAN1:", JSON.stringify(modalInfo));
  console.log("  -> Legenda do bloco de LAN:", lanCaption);
  console.log("  -> Painel Starlink (sem antena):", JSON.stringify(starlinkDisplay));
  console.log("  -> Browser Logs:", browserLogs);
  console.log("  -> View HTML snippet:", viewHtml);
  console.log("  -> DevTools Console Messages:", consoleMessages);

} catch (err) {
  console.error("ERRO:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
