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

  console.log("\n4. RESULTADO DA VALIDAÇÃO VISUAL NO NAVEGADOR:");
  console.log("  -> Título da página:", title);
  console.log("  -> Total de cards no painel:", cards);
  console.log("  -> Cards de WAN encontrados:", wanCards);
  console.log("  -> Portas LAN encontradas:", lanCards);
  console.log("  -> Botões nas portas LAN:", lanBtns);
  console.log("  -> Legenda do bloco de LAN:", lanCaption);
  console.log("  -> Browser Logs:", browserLogs);
  console.log("  -> View HTML snippet:", viewHtml);
  console.log("  -> DevTools Console Messages:", consoleMessages);

} catch (err) {
  console.error("ERRO:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
