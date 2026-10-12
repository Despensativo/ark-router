const callSystemBoard = rpc.declare({ object: 'system', method: 'board' });
const callSystemInfo = rpc.declare({ object: 'system', method: 'info' });
const callInterfaceDump = rpc.declare({ object: 'network.interface', method: 'dump' });
const callDeviceStatus = rpc.declare({ object: 'network.device', method: 'status', params: [ 'name' ], expect: { '': {} } });
const callWirelessStatus = rpc.declare({ object: 'network.wireless', method: 'status', expect: { '': {} } });
const callMwanStatus = rpc.declare({ object: 'mwan3', method: 'status', expect: { '': {} } });
const callDHCPLeases = rpc.declare({ object: 'luci-rpc', method: 'getDHCPLeases', expect: { '': {} } });
const callHostHints = rpc.declare({ object: 'luci-rpc', method: 'getHostHints', expect: { '': {} } });
const callAssocList = rpc.declare({ object: 'iwinfo', method: 'assoclist', params: [ 'device' ], expect: { '': {} } });
const callSurvey = rpc.declare({ object: 'iwinfo', method: 'survey', params: [ 'device' ], expect: { '': {} } });
const callScan = rpc.declare({ object: 'iwinfo', method: 'scan', params: [ 'device' ], expect: { '': {} } });
const callFreqList = rpc.declare({ object: 'iwinfo', method: 'freqlist', params: [ 'device' ], expect: { '': {} } });
const callCountryList = rpc.declare({ object: 'iwinfo', method: 'countrylist', params: [ 'device' ], expect: { '': {} } });
const callUciGet = rpc.declare({ object: 'uci', method: 'get', params: [ 'config' ], expect: { '': {} } });

