import fs from 'node:fs';
import path from 'node:path';

const port = Number(process.env.ARK_CAPTURE_PORT || 9333);
const outDir = process.env.ARK_SCREENSHOT_DIR || path.resolve('docs/screenshots');
const base = process.env.ARK_ROUTER_URL || 'https://192.168.10.1/cgi-bin/luci';
const user = process.env.ARK_ROUTER_USER || 'root';
const password = process.env.ARK_ROUTER_PASSWORD;

if (!password) {
  console.error('Set ARK_ROUTER_PASSWORD before running this script.');
  process.exit(2);
}

let id = 0;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function httpJson(url, opts = {}) {
  const response = await fetch(url, opts);
  if (!response.ok)
    throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  const pending = new Map();
  ws.onmessage = event => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id))
      return;
    const callbacks = pending.get(message.id);
    pending.delete(message.id);
    if (message.error)
      callbacks.reject(new Error(JSON.stringify(message.error)));
    else
      callbacks.resolve(message.result);
  };

  return (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    pending.set(messageId, { resolve, reject });
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });
}

async function openPage(url) {
  let page;
  try {
    page = await httpJson(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  }
  catch {
    const pages = await httpJson(`http://127.0.0.1:${port}/json/list`);
    page = pages[0];
  }

  const command = await connect(page.webSocketDebuggerUrl);
  await command('Page.enable');
  await command('Runtime.enable');
  await command('DOM.enable');
  await command('Page.navigate', { url });
  await waitReady(command);
  return command;
}

async function evaluate(command, expression) {
  return command('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
}

async function waitReady(command) {
  for (let i = 0; i < 100; i++) {
    try {
      const result = await evaluate(command, `document.readyState + '|' + location.href`);
      if (String(result.result.value || '').startsWith('complete|'))
        return;
    }
    catch {
      // Page can be between navigations.
    }
    await sleep(250);
  }
}

async function waitForText(command, text) {
  for (let i = 0; i < 100; i++) {
    const result = await evaluate(command, `Boolean(document.body && document.body.innerText.includes(${JSON.stringify(text)}))`);
    if (result.result.value)
      return true;
    await sleep(400);
  }
  return false;
}

async function clickByText(command, terms) {
  const expression = `(() => {
    const terms = ${JSON.stringify(terms)}.map(term => term.toLowerCase());
    const candidates = [...document.querySelectorAll('button,a,input[type=button],input[type=submit]')];
    const element = candidates.find(el => terms.some(term => String(el.innerText || el.textContent || el.value || '').toLowerCase().includes(term)));
    if (!element)
      return null;
    element.scrollIntoView({ block: 'center', inline: 'center' });
    element.click();
    return String(element.innerText || element.textContent || element.value || '').trim();
  })()`;
  const result = await evaluate(command, expression);
  return result.result.value;
}

async function clickSelector(command, selector) {
  const result = await evaluate(command, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element)
      return false;
    element.scrollIntoView({ block: 'center', inline: 'center' });
    element.click();
    return true;
  })()`);
  return !!result.result.value;
}

async function sanitizeVisibleSecrets(command) {
  await evaluate(command, `(() => {
    const style = document.getElementById('ark-public-mask') || document.createElement('style');
    style.id = 'ark-public-mask';
    style.textContent = [
      '.ex-device-mac',
      '.mac',
      '.ipaddr',
      '[data-sensitive]',
      'input[type=password]'
    ].join(',') + '{filter:blur(7px)!important}';
    document.head.appendChild(style);
    document.querySelectorAll('input[type=password]').forEach(input => input.value = '••••••••');
  })()`);
}

async function screenshot(command, filename) {
  await sanitizeVisibleSecrets(command);
  await sleep(500);
  const result = await command('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true
  });
  fs.writeFileSync(path.join(outDir, filename), Buffer.from(result.data, 'base64'));
}

async function navigateDashboard(command) {
  await command('Page.navigate', { url: `${base}/admin/equipe-dashboard` });
  await waitReady(command);
  await waitForText(command, 'DOWNLOAD AGORA');
  await sleep(2500);
}

console.log('Opening LuCI login');
const command = await openPage(`${base}/`);
await sleep(1500);

await evaluate(command, `(() => {
  const username = document.querySelector('input[name=luci_username], input[type=text]');
  const password = document.querySelector('input[name=luci_password], input[type=password]');
  if (username)
    username.value = ${JSON.stringify(user)};
  if (password)
    password.value = ${JSON.stringify(password)};
  const button = [...document.querySelectorAll('button,input[type=submit],.cbi-button')].find(el => String(el.innerText || el.value || '').toLowerCase().includes('entrar') || el.type === 'submit');
  if (button)
    button.click();
})()`);

await sleep(4000);
console.log('Opening ARK Router dashboard');
await navigateDashboard(command);
await screenshot(command, 'dashboard-overview.png');

console.log('Capturing Ark - Setup modal');
await clickSelector(command, '.ex-hero-setup-button');
await waitForText(command, '1. Idioma');
await sleep(1200);
await screenshot(command, 'ark-setup.png');

console.log('Capturing WAN editor modal');
await navigateDashboard(command);
await clickSelector(command, '.ex-wan-edit-button');
await waitForText(command, 'Editar WAN');
await sleep(1200);
await screenshot(command, 'wan-editor.png');

console.log('Capturing SQM editor modal');
await navigateDashboard(command);
await clickSelector(command, '.ex-qos-edit-button');
await waitForText(command, 'Editar limites');
await sleep(1200);
await screenshot(command, 'sqm-editor.png');

console.log('Capturing mobile dashboard');
await command('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true
});
await navigateDashboard(command);
await screenshot(command, 'mobile-overview.png');

console.log('Captured real screenshots in ' + outDir);
process.exit(0);
