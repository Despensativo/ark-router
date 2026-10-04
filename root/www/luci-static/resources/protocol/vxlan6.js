'use strict';
'require network';
return network.registerProtocol('vxlan6', {
	getI18n: function() { return _('VXLAN6 (IPv6)'); }
});
