'use strict';
'require view';
'require rpc';
'require poll';
'require fs';
'require ui';

document.querySelector('head').appendChild(E('link', {
	'rel': 'stylesheet', 'type': 'text/css',
	'href': L.resource('view/equipe-dashboard/overview.css') + '?v=' + (window.ARK_VERSION || '1.0.2')
}));

