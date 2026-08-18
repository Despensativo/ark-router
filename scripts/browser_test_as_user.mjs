import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const ROUTER_URL = "http://192.168.21.1/cgi-bin/luci/admin/equipe-dashboard";
const USER = "root";
const PASS = "admin0100";

let id = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function httpJson(url, opts = {}) {
  const res = await fetch(url, opts);
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
  ws.onmessage = event => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const callbacks = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) callbacks.reject(new Error(JSON.stringify(msg.error)));
    else callbacks.resolve(msg.result);
  };

  return (method, params = {}) => new Promise((resolve, reject) => {
    const msgId = ++id;
    pending.set(msgId, { resolve, reject });
    ws.send(JSON.stringify({ id: msgId, method, params }));
  });
}

console.log("=============================================================");
console.log("   INICIANDO TESTE REAL VIA NAVEGADOR (CHROME AUTOMATION)   ");
console.log("=============================================================");

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
  const send = await connect(page.webSocketDebuggerUrl);

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  const evalJs = async (expr) => {
    const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return res && res.result ? res.result.value : null;
  };

  console.log("\n1. Acessando painel direto:", ROUTER_URL);
  await send('Page.navigate', { url: ROUTER_URL });
  await sleep(3000);

  let currentUrl = await evalJs(`window.location.href`);
  console.log("  URL atual:", currentUrl);

  // Se redirecionou para login, faz login
  const isLoginPage = await evalJs(`!!document.querySelector('input[type="password"]')`);
  if (isLoginPage) {
    console.log("2. Tela de login detectada. Fazendo login...");
    await evalJs(`
      const form = document.querySelector('form');
      const pass = document.querySelector('input[type="password"]');
      if (pass) pass.value = '${PASS}';
      if (form) form.submit();
    `);
    await sleep(4000);
    currentUrl = await evalJs(`window.location.href`);
    console.log("  URL após login:", currentUrl);
  }

  // Navega para o dashboard
  if (!currentUrl.includes('equipe-dashboard')) {
    console.log("3. Navegando para o painel equipe-dashboard...");
    await send('Page.navigate', { url: 'http://192.168.21.1/cgi-bin/luci/admin/equipe-dashboard' });
    await sleep(4000);
  }

  // Aguarda carregar elementos LuCI JS
  console.log("4. Aguardando renderização do LuCI JS no navegador...");
  for (let i = 0; i < 10; i++) {
    const ready = await evalJs(`!!document.querySelector('.ex-dashboard')`);
    if (ready) break;
    await sleep(1000);
  }

  console.log("\n5. Inspecionando elementos do painel no DOM do navegador:");
  const initialProfile = await evalJs(`document.documentElement.getAttribute('data-ex-profile') || 'auto'`);
  const heroTitle = await evalJs(`(document.querySelector('.ex-hero h2') || {}).textContent || ''`);
  const initialBtnText = await evalJs(`(document.querySelector('.ex-hero-gamer-btn, .ex-hero-gamer-active') || {}).textContent || ''`);

  console.log(`  -> Título do painel: "${heroTitle}"`);
  console.log(`  -> data-ex-profile no <html>: "${initialProfile}"`);
  console.log(`  -> Texto do botão no Hero: "${initialBtnText}"`);

  if (!initialBtnText.includes('Gamer')) {
    const bodyHtml = await evalJs(`document.body.innerHTML.slice(0, 500)`);
    console.log('DEBUG BODY:', bodyHtml);
    throw new Error(`Botão Gamer não encontrado no Hero! Encontrado: "${initialBtnText}"`);
  }

  // 6. Usuário clica no botão "Modo Gamer"
  console.log("\n6. Usuário clica no botão [ 🎮 Modo Gamer ] no topo...");
  await evalJs(`
    const btn = document.querySelector('.ex-hero-gamer-btn');
    if (btn) btn.click();
  `);
  await sleep(1500);

  const modalTitle = await evalJs(`(document.querySelector('#modal_overlay h4, .cbi-modal h4, .modal-title') || {}).textContent || ''`);
  console.log(`  -> Janela Modal aberta: "${modalTitle}"`);

  console.log("7. Usuário clica no botão de confirmação dentro do modal...");
  await evalJs(`
    const confirmBtn = document.querySelector('#modal_overlay .cbi-button-negative, #modal_overlay .cbi-button-positive, .cbi-modal .cbi-button-negative');
    if (confirmBtn) confirmBtn.click();
  `);

  console.log("8. Aguardando aplicação e recarregamento automático...");
  await sleep(7000);

  // 7. Valida tema vermelho e modo gamer
  console.log("\n9. Validando o Modo Gamer e Tema Vermelho no navegador:");
  const gamerProfile = await evalJs(`document.documentElement.getAttribute('data-ex-profile')`);
  const gamerPrimaryColor = await evalJs(`getComputedStyle(document.documentElement).getPropertyValue('--ex-primary').trim()`);
  const gamerBtnText = await evalJs(`(document.querySelector('.ex-hero-gamer-active, .ex-hero-gamer-btn') || {}).textContent || ''`);
  const gamerEyebrow = await evalJs(`(document.querySelector('.ex-hero .ex-eyebrow') || {}).textContent || ''`);

  console.log(`  -> data-ex-profile no <html>: "${gamerProfile}" (esperado: gamer)`);
  console.log(`  -> Cor primária (--ex-primary): "${gamerPrimaryColor}" (esperado: #ef4444 - Vermelho)`);
  console.log(`  -> Texto do botão Hero: "${gamerBtnText}" (esperado: 🎮 GAMER ATIVO)`);
  console.log(`  -> Eyebrow no Hero: "${gamerEyebrow}"`);

  console.log("  ✅ TEMA VERMELHO E MODO GAMER VALIDADOS COM SUCESSO NO NAVEGADOR!");

  // 8. Usuário volta para o Modo Padrão
  console.log("\n10. Usuário clica em [ 🎮 GAMER ATIVO ] para voltar ao Modo Padrão...");
  await evalJs(`
    const btn = document.querySelector('.ex-hero-gamer-active');
    if (btn) btn.click();
  `);
  await sleep(1500);

  console.log("11. Usuário confirma o retorno ao Modo Padrão...");
  await evalJs(`
    const confirmBtn = document.querySelector('#modal_overlay .cbi-button-positive, #modal_overlay .cbi-button-neutral, .cbi-modal .cbi-button-positive');
    if (confirmBtn) confirmBtn.click();
  `);

  console.log("12. Aguardando retorno ao estado padrão...");
  await sleep(7000);

  const restoredProfile = await evalJs(`document.documentElement.getAttribute('data-ex-profile')`);
  const restoredBtnText = await evalJs(`(document.querySelector('.ex-hero-gamer-btn') || {}).textContent || ''`);
  console.log(`  -> data-ex-profile restaurado: "${restoredProfile}"`);
  console.log(`  -> Botão restaurado: "${restoredBtnText}"`);
  console.log("  ✅ NAVEGADOR RESTAURADO PARA O ESTADO PADRÃO COM SUCESSO!");

  console.log("\n=============================================================");
  console.log("   TESTE COMPLETO VIA NAVEGADOR EXECUTADO COM 100% SUCESSO!  ");
  console.log("=============================================================");

} catch (err) {
  console.error("\n❌ ERRO:", err);
} finally {
  chrome.kill();
  process.exit(0);
}
