'use strict';
'require network';
return network.registerProtocol('vxlan', {
	getI18n: function() { return _('VXLAN (Virtual eXtensible LAN)'); }
});
