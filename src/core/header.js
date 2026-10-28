'use strict';
'require view';
'require rpc';
'require poll';
'require fs';
'require ui';
const ARK_BUILD_VERSION = '2.0.9';
if (typeof window !== 'undefined') {
	window.ARK_BUILD_VERSION = ARK_BUILD_VERSION;
	window.ARK_VERSION = ARK_BUILD_VERSION;
	try {
		if (window.history && window.history.replaceState && window.location.search) {
			var _sp = new URLSearchParams(window.location.search);
			if (_sp.has('_v') || _sp.has('_ts')) {
				_sp.delete('_v');
				_sp.delete('_ts');
				var _qs = _sp.toString();
				window.history.replaceState(null, document.title, window.location.pathname + (_qs ? '?' + _qs : '') + window.location.hash);
			}
		}
	} catch(e) {}
}

if (typeof document !== 'undefined') {
	try {
		var _head = (document.querySelector && document.querySelector('head')) || document.documentElement || document.head;
		if (_head) {
			var _vpEl = document.querySelector ? document.querySelector('meta[name="viewport"]') : null;
			if (!_vpEl) {
				if (typeof E === 'function') {
					_vpEl = E('meta', { 'name': 'viewport', 'content': 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover' });
				} else if (typeof document.createElement === 'function') {
					_vpEl = document.createElement('meta');
					_vpEl.name = 'viewport';
					_vpEl.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
				}
				if (_vpEl && _head.appendChild) _head.appendChild(_vpEl);
			} else if (_vpEl.setAttribute) {
				_vpEl.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
			}

			var _assetRev = (typeof window !== 'undefined' && window.ARK_ASSET_REV) ? window.ARK_ASSET_REV : ARK_BUILD_VERSION;
			var _cssHref = (typeof L !== 'undefined' && L.resource ? L.resource('view/equipe-dashboard/overview.css') : '/luci-static/resources/view/equipe-dashboard/overview.css') + '?v=' + _assetRev;
			var _linkEl = null;
			if (typeof E === 'function') {
				_linkEl = E('link', { 'rel': 'stylesheet', 'type': 'text/css', 'href': _cssHref });
			} else if (typeof document.createElement === 'function') {
				_linkEl = document.createElement('link');
				_linkEl.rel = 'stylesheet';
				_linkEl.type = 'text/css';
				_linkEl.href = _cssHref;
			}
			if (_linkEl && _head.appendChild) _head.appendChild(_linkEl);
		}
	} catch(e) {}
}



