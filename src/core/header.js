'use strict';
'require view';
'require rpc';
'require poll';
'require fs';
'require ui';
const ARK_BUILD_VERSION = '1.5.16';
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

document.querySelector('head').appendChild(E('link', {
	'rel': 'stylesheet', 'type': 'text/css',
	'href': L.resource('view/equipe-dashboard/overview.css') + '?v=' + ARK_BUILD_VERSION
}));

