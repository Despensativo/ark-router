const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'modules', 'lifecycle.js'), 'utf8');
const formattersSource = fs.readFileSync(path.join(__dirname, '..', 'src', 'core', 'formatters.js'), 'utf8');
const oldCaps = { language: 'pt-br', features: { wol: { installed: true, active: true } } };
const newCaps = { language: 'pt-br', features: { wol: { installed: true, active: false } } };

function harness() {
	const items = new Map([['ark_caps', JSON.stringify(oldCaps)]]);
	const storage = {
		getItem: key => items.get(key) || null,
		setItem: (key, value) => items.set(key, value),
		removeItem: key => items.delete(key)
	};
	const notices = [];
	const context = vm.createContext({
		window: { _arkTxState: { epoch: 0 } }, sessionStorage: storage,
		fs: { exec: () => Promise.reject(new Error('RPC not configured')) },
		safe: (promise, fallback) => Promise.resolve(promise).catch(() => fallback),
		ui: { hideModal() {}, addNotification(_title, node) { notices.push(node); } },
		E: (_tag, _attrs, children) => children.join(''),
		L: { bind: (fn, self) => fn.bind(self) },
		dashboardLanguage: 'pt-br', console: { warn() {} },
		Promise, Object, JSON
	});
	vm.runInContext(source + '\nthis.methods = lifecycleMethods;', context);
	const view = Object.assign(Object.create(context.methods), {
		capabilities: oldCaps, dashboardRoot: {}, currentData: {},
		appearanceCount: 0, updateCount: 0, rowCount: 0,
		applyAppearance() { this.appearanceCount++; },
		update() { this.updateCount++; },
		refreshFeatureCenterRows() { this.rowCount++; }
	});
	return { context, view, items, notices };
}

async function main() {
	const h = harness();
	let deliver;
	h.context.fs.exec = () => new Promise(resolve => { deliver = resolve; });
	const initial = await h.view.fetchCapabilities(false);
	assert.equal(initial.features.wol.active, true, 'initial paint uses the cached value');
	deliver({ code: 0, stdout: JSON.stringify(newCaps) });
	await new Promise(setImmediate);
	assert.equal(h.view.capabilities.features.wol.active, false, 'background revalidation updates the live view');
	assert.equal(JSON.parse(h.items.get('ark_caps')).features.wol.active, false);
	assert.equal(h.view.updateCount, 1);
	assert.equal(h.view.rowCount, 1);

	const raced = harness();
	let deliverRace;
	raced.context.fs.exec = () => new Promise(resolve => { deliverRace = resolve; });
	await raced.view.fetchCapabilities(false);
	raced.context.window._arkTxState.epoch = 1;
	deliverRace({ code: 0, stdout: JSON.stringify(newCaps) });
	await new Promise(setImmediate);
	assert.equal(raced.view.capabilities.features.wol.active, true, 'older reply cannot overwrite a newer transaction');
	assert.equal(raced.view.updateCount, 0);
	const concurrent = harness();
	const deliveries = [];
	concurrent.context.fs.exec = () => new Promise(resolve => { deliveries.push(resolve); });
	const firstRead = concurrent.view.fetchCapabilities(true);
	const secondRead = concurrent.view.fetchCapabilities(true);
	deliveries[1]({ code: 0, stdout: JSON.stringify(newCaps) });
	await secondRead;
	deliveries[0]({ code: 0, stdout: JSON.stringify(oldCaps) });
	await assert.rejects(firstRead, /substituída/);
	assert.equal(JSON.parse(concurrent.items.get('ark_caps')).features.wol.active, false,
		'late forced read cannot overwrite a newer capability snapshot');

	h.context.fs.exec = async () => ({ code: 1, stdout: '' });
	await assert.rejects(h.view.fetchCapabilities(true), /Não foi possível confirmar/);
	h.view.fetchCapabilities = () => Promise.reject(new Error('RPC failed'));
	h.view.fetchData = () => Promise.resolve({});
	const ok = await h.view.triggerImmediateRefresh('Sucesso', 'info', false, true);
	assert.equal(ok, false, 'a failed forced read cannot be reported as a successful refresh');
	assert.equal(h.notices.includes('Sucesso'), false);

	const timers = [];
	const reloadNotices = [];
	let refreshCalls = 0;
	let reloadCalls = 0;
	const cache = new Map([['ark_caps', 'stale']]);
	const reloadContext = vm.createContext({
		window: {
			setTimeout: fn => { timers.push(fn); },
			location: { reload: () => { reloadCalls++; } },
			_arkViewInstance: { triggerImmediateRefresh: () => { refreshCalls++; return Promise.resolve(false); } }
		},
		sessionStorage: { removeItem: key => cache.delete(key) },
		ui: { addNotification(_title, node) { reloadNotices.push(node); } },
		E: (_tag, _attrs, children) => children.join(''), Promise, Date, Object
	});
	vm.runInContext(formattersSource + '\nthis.reloadSoon = reloadSoon;', reloadContext);
	const drain = async () => {
		while (timers.length) {
			timers.shift()();
			await new Promise(setImmediate);
		}
	};
	reloadContext.reloadSoon('Aplicado', 1);
	await drain();
	assert.equal(refreshCalls, 5, 'failed reads are retried without repeating the mutation');
	assert.equal(reloadCalls, 0);
	assert.equal(reloadNotices.includes('Aplicado'), false, 'failure never emits the success message');
	assert.ok(reloadNotices.some(value => value.includes('Não foi possível confirmar')));

	reloadContext.window._arkViewInstance.triggerImmediateRefresh = () => { refreshCalls++; return Promise.resolve(true); };
	reloadContext.reloadSoon('Aplicado', 1);
	await drain();
	assert.ok(reloadNotices.includes('Aplicado'), 'success is announced only after the forced read');
	assert.equal(reloadCalls, 0);

	reloadContext.reloadSoon('Mudança estrutural', 1, false, true);
	await drain();
	assert.equal(reloadCalls, 1, 'structural changes load a new page');
	assert.equal(cache.has('ark_caps'), false, 'structural reload invalidates stale capabilities');
	process.stdout.write('UI capability sync: 8 scenarios passed\n');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
