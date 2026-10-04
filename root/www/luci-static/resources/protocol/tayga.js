'use strict';
'require network';
return network.registerProtocol('tayga', {
	getI18n: function() { return _('TAYGA (NAT64)'); }
});
