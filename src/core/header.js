'use strict';
'require view';
'require rpc';
'require poll';
'require fs';
'require ui';
const ARK_BUILD_VERSION = '1.5.9';
if (typeof window !== 'undefined') {
	window.ARK_BUILD_VERSION = ARK_BUILD_VERSION;
	window.ARK_VERSION = ARK_BUILD_VERSION;
}

document.querySelector('head').appendChild(E('link', {
	'rel': 'stylesheet', 'type': 'text/css',
	'href': L.resource('view/equipe-dashboard/overview.css') + '?v=' + ARK_BUILD_VERSION
}));

