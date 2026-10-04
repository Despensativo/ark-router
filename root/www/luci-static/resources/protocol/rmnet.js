'use strict';
'require network';
return network.registerProtocol('rmnet', {
	getI18n: function() { return _('Qualcomm RMNET'); }
});
