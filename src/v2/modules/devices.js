// /src/modules/devices.js - ARK Router LuCI View Module
const devicesMethods = {
	renderDevices: function(data, rates) {
		const body=document.getElementById('ex-device-body'); if(!body)return;
		const leases=data.leases.dhcp_leases||[], main=assocMap(data.mainAssoc), guest=assocMap(data.guestAssoc), names=friendlyMap(data.names), hostHints=data.hostHints||{}, seen={};
		let lanStatus={};try{lanStatus=JSON.parse((data.lanStatus&&data.lanStatus.stdout)||'{}');}catch(e){}
		const lanPrefix=prefix24(lanStatus.ipaddr), guestPrefix=prefix24(((values(data.networkConfig).guest)||{}).ipaddr), wifiNames=wifiConfig(data.wireless), mainName=wifiNames.main.ssid||'Rede principal', guestName=wifiNames.guest.ssid||'Visitantes';
		const isSecondaryRouter = isSatelliteOrAp(data);
		const masterGwIp = (lanStatus && (lanStatus.gateway || lanStatus.current_gw)) || '192.168.73.1';

		const dhcpValues = values(data.dhcpConfig);
		const reservedMap = {};
		const reservedNameMap = {};
		Object.keys(dhcpValues).forEach(function(k) {
			const h = dhcpValues[k];
			if (h && h['.type'] === 'host' && h.mac) {
				const macs = Array.isArray(h.mac) ? h.mac : String(h.mac).split(/\s+/);
				macs.forEach(function(m) {
					const u = String(m).toUpperCase();
					if (h.ip) reservedMap[u] = h.ip;
					if (h.name) reservedNameMap[u] = h.name;
				});
			}
		});

		const firewallValues = values(data.firewallConfig);
		const priorityMap = {};
		Object.keys(firewallValues).forEach(function(k) {
			const r = firewallValues[k];
			if (r && r['.type'] === 'rule' && String(r.enabled) === '1' && r.src_mac) {
				const dscp = r.set_dscp || 'EF';
				const macs = Array.isArray(r.src_mac) ? r.src_mac : String(r.src_mac).split(/\s+/);
				macs.forEach(function(m) {
					if (m) priorityMap[String(m).toUpperCase()] = dscp;
				});
			}
		});

		const limitsMap = deviceLimitsMap(data.names);
		const ipv6Map = deviceIpv6Map(data.names, (values(data.equipeDashboardConfig).ipv6||{}).mode || 'dual_stack');
		const parentalMap = deviceParentalMap(data.names);
		const dhcp6Leases = (data.leases && data.leases.dhcp6_leases) || [];
		const dhcp6ActiveMap = {};
		dhcp6Leases.forEach(function(l) {
			if (l.macaddr) dhcp6ActiveMap[String(l.macaddr).toUpperCase()] = true;
			if (l.mac) dhcp6ActiveMap[String(l.mac).toUpperCase()] = true;
		});

		const secRegex = /(ARK[-_]Secund[aá]rio|ARK[-_]Ponto|Ponto[-_]Adicional|Roteador[-_]Secund[aá]rio|secund[aá]rio)/i;

		const isPrivateMac = function(mac) {
			if (!mac) return false;
			const clean = String(mac).replace(/[^0-9A-Fa-f]/g, '');
			if (clean.length < 2) return false;
			const secondChar = clean[1].toUpperCase();
			return (secondChar === '2' || secondChar === '6' || secondChar === 'A' || secondChar === 'E');
		};

		const iotOuiPrefixes = [
			// Espressif Systems (ESP8266 / ESP32 - Tuya, Sonoff, Shelly, Smart Life, WLED, Tasmota, etc.)
			'C4:4F:33', 'C8:2B:96', 'A8:80:55', '2C:D8:DE', '3C:0B:59', 'BC:35:1E', '84:F3:EB', 'DC:4F:22',
			'68:C6:3A', 'A8:E6:21', 'D4:43:8A', '7C:25:DA', '4C:A9:19', '24:4C:AB', '24:0A:C4', '30:AE:A4',
			'80:7D:3A', '84:0D:8E', '94:B5:55', 'A4:CF:12', 'AC:67:B2', 'B4:E6:2D', 'C4:DD:57', 'D8:BC:38',
			'E0:E2:E6', 'E8:68:E7', 'EC:FA:BC', '48:55:19', '40:22:D8', '34:B4:72', '34:94:54', '34:98:7A',
			'30:83:98', '18:FE:34', '10:52:1C', '08:3A:8D', '08:B6:1F', '00:1A:7D', '00:08:22', 'CC:50:E3',
			'CC:7B:5C', '60:01:94', '54:43:B2', '50:02:91', '38:BE:AB', '24:62:AB', '24:DC:C3', '48:3F:DA',
			'48:E7:29', '70:03:9F', '7C:DF:A1', '84:F7:03', 'A4:7B:9D', 'AC:0B:FB', 'B8:D6:1A', 'C4:DE:E2',
			'DC:54:75', 'E0:98:06', 'FC:F5:C4',
			// Tuya Smart Inc.
			'D8:1F:12', '10:2C:6B', '70:89:71', '58:8E:81', '60:A4:23', 'A0:92:08', '44:17:93', '20:F1:B2',
			'D4:D4:DA', '68:57:2D', '1C:90:FF', '2C:AA:8E', '80:4B:50',
			// Midea Smart Home / Carrier AC
			'38:2F:B0', 'AC:69:21', '74:A7:EA',
			// Amazon Echo / Alexa
			'FC:E9:D8', '90:11:95', '40:B4:CD', '44:65:0D', '68:54:FD', '78:E1:03', '88:71:B1', '0C:47:C9',
			'34:D2:70', '50:F5:DA', '68:37:E9', 'CC:9E:A2', '00:FC:8B', '18:74:2E', '38:F7:3D', '6C:56:97',
			'74:75:48', 'A0:02:DC',
			// Google Home / Nest
			'00:1A:11', '30:FD:38', '48:D6:D5', '54:60:09', '64:16:66', 'A4:77:33', 'E4:F0:42', 'F8:0F:41',
			// BroadLink
			'B4:43:0D', '78:0F:77', '34:EA:34', 'EC:0B:AE',
			// Shelly / Allterco
			'E8:DB:84',
			// Sonoff / Itead
			'C0:56:E3', 'EC:EB:D4',
			// Philips Hue
			'00:17:88', 'EC:B5:FA',
			// Xiaomi / Yeelight
			'04:CF:8C', '28:6C:07', '64:90:C1', '7C:49:EB', 'F0:B4:29',
			// Shenzhen iComm Semiconductor (Câmeras Wi-Fi / Smart Home / Doorbells)
			'84:B4:D2', '08:1A:1E', '14:95:69', '20:67:E0', '84:EA:97', '98:17:3C'
		];
		const iotNameRegex = /(?:^|[\s_-])(?:ESP[_-]|TUYA[_-]|midea[_-]|smart|sonoff|shelly|tasmota|wled|zigbee|broadlink|yeelight|home[_-]?assistant|echo|alexa|google[_-]?home|nest[_-]?mini|camera|intelbras|interfone|interruptor|l[aâ]mpada|tomada|fechadura|climatizador|ar[_-]?condicionado|lwip)/i;

		const appleOuiPrefixes = [
			// Apple, Inc. (iPhone, iPad, Mac, Apple TV, Apple Watch)
			'C0:C7:DB', '28:CF:E9', 'A4:83:E7', '00:25:00', '3C:07:54', '40:6C:8F', '70:3E:AC', '8C:85:90', 'F4:0F:24'
		];

		const tvOuiPrefixes = [
			// Samsung Electronics (Smart TVs, Tizen)
			'08:28:02', '32:08:55', '40:16:3B', '78:AB:BB', 'B0:D5:9D', 'B8:BC:5B', 'CC:6E:A4', 'E8:50:8B', 'F4:7B:5E',
			'2C:99:75', '50:85:69', '64:1C:AE', '70:2C:1F', '94:35:0A', 'B4:79:A7', 'E4:7C:F9',
			// LG Electronics (webOS TVs)
			'A8:23:FE', '00:E0:91', '10:F9:6F', '20:3D:66', '3C:CD:36', 'A0:93:47', '64:95:6C', '88:36:6C', 'CC:FA:00',
			// Roku Inc.
			'00:0D:4B', 'B0:EE:45', 'D8:31:34', 'CC:6D:A0', '20:DF:B9', 'AC:AE:19', 'B8:3E:59',
			// Shenzhen Bilian / Fn-Link (TV Boxes Android, Dongles HDMI, Smart Projectors)
			'54:44:A3', '70:C9:4E', 'E4:5F:01', '00:22:6C', '10:A4:BE', '00:0C:43',
			// TCL / Thomson
			'00:E0:4C', '04:8D:38', '20:A6:0C', '44:33:4C', '64:CF:D9',
			// Hisense
			'00:1E:5E', '30:10:E4', '58:2A:F7', '88:E7:A6',
			// Philips TV (TPV Technology)
			'00:09:DF', '00:1A:E9', '08:86:3B', '54:4A:05'
		];
		const tvRegex = /(?:^|[\s_-])(?:TV[-_]|smart[-_]?tv|tizen|webos|bravia|roku|fire[-_]?tv|chromecast|mibox|mi[-_]?box|tv[-_]?box|box[-_]?tv|apple[-_]?tv)/i;

		const printerOuiPrefixes = [
			// HP Inc.
			'C8:5A:CF', '00:1E:0B', '00:9C:02', '10:60:4B', '2C:41:A1', '3C:D9:2B', '94:57:A5',
			// Seiko Epson
			'00:00:48', '00:26:AB', '44:D9:E7', '64:EB:8C', 'AC:18:26',
			// Brother Industries
			'00:80:77', '00:1B:A9', '30:05:5C', '40:B0:34',
			// Canon Inc.
			'00:00:85', '00:1E:8F', '18:0C:AC', '00:15:99', '00:04:00'
		];
		const printerRegex = /(?:^|[\s_-])(?:impressora|printer|deskjet|laserjet|laser|inkjet|epson|brother|ecotank|officetok|print)/i;

		const consoleOuiPrefixes = [
			// Sony Interactive Entertainment (PlayStation)
			'00:04:1F', '00:13:15', '00:15:C1', '00:19:C5', '00:1D:0D', '00:24:8D', '70:9E:29', 'A8:E3:EE', 'BC:60:A7', 'FC:0F:E6',
			// Microsoft (Xbox)
			'00:0D:3A', '00:17:FA', '00:50:F2', '28:18:78', '58:82:A8', '7C:1E:52', '98:5F:D3', 'B4:AE:2B',
			// Nintendo (Switch, Wii)
			'00:09:BF', '00:1B:7A', '00:1F:32', '00:26:59', '40:D2:8A', '70:48:0F', '98:B6:E9', 'E4:17:D8'
		];
		const consoleRegex = /(?:^|[\s_-])(?:playstation|ps4|ps5|xbox|nintendo|switch)/i;
		const pcRegex = /(?:^|[\s_-])(?:macbook|imac|laptop|desktop|notebook|gamer|windows|linux|thinkpad|dell|lenovo|asus|acer|pc[-_])/i;
		const tabletRegex = /(?:^|[\s_-])(?:ipad|tablet|pad[-_]|[_-]pad)/i;
		const phoneRegex = /(?:^|[\s_-])(?:iphone|galaxy|s2[0-9]|s1[0-9]|redmi|xiaomi|motorola|moto[-_]|pixel|zenfone|android|celular|smartphone|phone)/i;

		const detectDeviceCategory = function(mac, name, hostname, isWired, band, ssid, fp) {
			const uMac = String(mac || '').toUpperCase();
			const prefix = uMac.slice(0, 8);
			const n = (name || '') + ' ' + (hostname || '');
			const s = String(ssid || '');
			const vc = String((fp && fp.vendor_class) || '').toLowerCase();

			// 1. DHCP Option 60 (Vendor Class Identifier) - Sinal passivo de altíssima precisão
			if (vc) {
				if (/roku|tizen|webos|firetv|fire_tv|chromecast|appletv|apple_tv|bravia/i.test(vc)) {
					return 'tv';
				}
				if (/playstation|xbox|nintendo/i.test(vc)) {
					return 'console';
				}
				if (/printer|laserjet|deskjet|hewlett-packard|epson|brother|canon/i.test(vc)) {
					return 'printer';
				}
				if (/espressif|tuya|sonoff|shelly|tasmota|wled/i.test(vc)) {
					return 'iot';
				}
				if (/^msft|^windows/i.test(vc)) {
					return 'computer';
				}
				if (/^android/i.test(vc)) {
					if (/tv|box|stick/i.test(n) || /(?:^|[\s_-])(?:tv|streaming)/i.test(s)) return 'tv';
					if (/pad|tablet/i.test(n)) return 'tablet';
					return 'phone';
				}
			}

			// 2. Análise de OUI e Regex de Smart TV / Streaming
			if (tvOuiPrefixes.indexOf(prefix) >= 0 || tvRegex.test(n) || /(?:^|[\s_-])(?:tv|streaming)/i.test(s)) {
				return 'tv';
			}

			// 3. Análise de Smart Home / IoT
			if (iotOuiPrefixes.indexOf(prefix) >= 0 || iotNameRegex.test(n)) {
				return 'iot';
			}

			// 4. Impressora
			if (printerOuiPrefixes.indexOf(prefix) >= 0 || printerRegex.test(n)) {
				return 'printer';
			}

			// 5. Console de Jogos
			if (consoleOuiPrefixes.indexOf(prefix) >= 0 || consoleRegex.test(n)) {
				return 'console';
			}

			// 6. Computador / Laptop
			if (pcRegex.test(n)) {
				return 'computer';
			}

			// 7. Tablet
			if (tabletRegex.test(n)) {
				return 'tablet';
			}

			// 8. Celular / Smartphone
			if (phoneRegex.test(n)) {
				return 'phone';
			}

			// 9. Dispositivos Apple identificados por OUI (padrão portátil / celular se Wi-Fi)
			if (appleOuiPrefixes.indexOf(prefix) >= 0) {
				if (pcRegex.test(n) || isWired) return 'computer';
				if (tabletRegex.test(n)) return 'tablet';
				if (tvRegex.test(n)) return 'tv';
				return 'phone';
			}

			// 10. Cabo de rede sem classificação específica -> Computador
			if (isWired) {
				return 'computer';
			}

			return 'other';
		};

		const buildCategoryBadges = function(d, reservedIp, quickReserveFn) {
			const b = [];
			if (d.category === 'master') {
				b.push(E('span', { class: 'ex-device-badge badge-master-router', style: 'background:rgba(59,130,246,0.18);color:#60a5fa;border:1px solid rgba(59,130,246,0.45);font-weight:750;font-size:0.7rem;padding:2px 7px;border-radius:6px;white-space:nowrap;', title: 'Roteador Principal da residência conectado ao modem/fibra' }, [ '🌐 Roteador Principal' ]));
				return b;
			}
			if (d.category === 'secondary') {
				b.push(E('span', { class: 'ex-device-badge badge-secondary-router', style: 'background:rgba(14,165,233,0.18);color:#38bdf8;border:1px solid rgba(56,189,248,0.45);font-weight:750;font-size:0.7rem;padding:2px 7px;border-radius:6px;white-space:nowrap;', title: 'Roteador Secundário / Ponto Adicional expandindo a rede Wi-Fi e portas LAN' }, [ '📡 Roteador Secundário' ]));
				if (reservedIp) {
					b.push(E('span', { class: 'ex-device-badge badge-reserved', style: 'background:rgba(16,185,129,0.16);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'IP e MAC amarrados e protegidos no DHCP: ' + reservedIp }, [ '🔒 MAC Amarrado (' + reservedIp + ')' ]));
				} else {
					b.push(E('span', { class: 'ex-device-badge badge-unreserved', style: 'background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'O MAC deste roteador secundário ainda não está amarrado no DHCP. Clique em Amarrar MAC para protegê-lo contra conflitos de IP.' }, [ '⚠️ MAC Não Amarrado' ]));
					b.push(E('button', { class: 'ex-mini-button', style: 'background:#0284c7;color:#fff;border-color:#38bdf8;font-weight:700;font-size:0.68rem;padding:2px 7px;border-radius:6px;cursor:pointer;line-height:1;', title: 'Amarrar MAC ao IP ' + (d.ip || '192.168.1.2'), click: L.bind(function(ev) { ev.stopPropagation(); quickReserveFn('secondary', d); }, this) }, ['🔒 Amarrar MAC']));
				}
				return b;
			}

			if (d.category === 'iot') {
				b.push(E('span', { class: 'ex-device-badge badge-iot', style: 'background:rgba(234,179,8,0.18);color:#eab308;border:1px solid rgba(234,179,8,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Dispositivo Smart Home / Automação Residencial (Tuya, Sonoff, Espressif, Alexa, Midea, etc.)' }, [ '💡 Smart Home' ]));
			} else if (d.category === 'printer') {
				b.push(E('span', { class: 'ex-device-badge badge-printer', style: 'background:rgba(168,85,247,0.18);color:#c084fc;border:1px solid rgba(168,85,247,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Impressora / Multifuncional de Rede (HP, Epson, Brother, Canon, etc.)' }, [ '🖨️ Impressora' ]));
			} else if (d.category === 'tv') {
				b.push(E('span', { class: 'ex-device-badge badge-tv', style: 'background:rgba(6,182,212,0.18);color:#22d3ee;border:1px solid rgba(6,182,212,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Smart TV ou Dispositivo de Streaming (Samsung, LG, Roku, Apple TV, Fire TV, Chromecast, etc.)' }, [ '📺 Smart TV' ]));
			} else if (d.category === 'console') {
				b.push(E('span', { class: 'ex-device-badge badge-console', style: 'background:rgba(236,72,153,0.18);color:#f472b6;border:1px solid rgba(236,72,153,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Console de Jogos (PlayStation, Xbox, Nintendo Switch)' }, [ '🎮 Console' ]));
			} else if (d.category === 'computer') {
				b.push(E('span', { class: 'ex-device-badge badge-pc', style: 'background:rgba(99,102,241,0.18);color:#818cf8;border:1px solid rgba(99,102,241,0.38);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Computador, Notebook ou PC Gamer' }, [ '💻 Computador' ]));
			} else if (d.category === 'tablet') {
				b.push(E('span', { class: 'ex-device-badge badge-tablet', style: 'background:rgba(100,116,139,0.18);color:#94a3b8;border:1px solid rgba(100,116,139,0.35);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Tablet (iPad, Galaxy Tab, Redmi Pad)' }, [ '📱 Tablet' ]));
			} else if (d.category === 'phone') {
				b.push(E('span', { class: 'ex-device-badge badge-phone', style: 'background:rgba(100,116,139,0.18);color:#94a3b8;border:1px solid rgba(100,116,139,0.35);font-weight:750;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Smartphone / Celular' }, [ '📱 Celular' ]));
			}

			if (d.isPrivateMac) {
				b.push(E('span', { class: 'ex-device-badge badge-private-mac', style: 'background:rgba(148,163,184,0.12);color:#94a3b8;border:1px dashed rgba(148,163,184,0.4);font-weight:600;font-size:0.65rem;padding:2px 5px;border-radius:6px;white-space:nowrap;', title: 'Aparelho com MAC aleatório/privado gerado pelo sistema (iOS/Android). Para fixar IP permanente, mude para MAC do dispositivo no aparelho.' }, [ '🎭 MAC Privado' ]));
			}

			if (reservedIp) {
				b.push(E('span', { class: 'ex-device-badge badge-reserved', style: 'background:rgba(16,185,129,0.16);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'IP Fixo Reservado no DHCP: ' + reservedIp }, [ '🔒 IP Fixo' ]));
			} else {
				const isFixedRecommend = (d.category === 'iot' || d.category === 'printer' || d.category === 'tv' || d.category === 'console');
				if (isFixedRecommend) {
					let tip = 'Recomendado fixar o IP deste aparelho para evitar perdas de conexão e comandos.';
					if (d.category === 'iot') tip = 'Automação sem IP fixo. Recomendado fixar para que Alexa/Google não percam o controle ao reiniciar o roteador.';
					else if (d.category === 'printer') tip = 'Impressora sem IP fixo. Recomendado fixar para evitar erro de impressora offline nos computadores.';
					else if (d.category === 'tv') tip = 'Smart TV sem IP fixo. Recomendado fixar para manter espelhamento, DLNA e controle remoto sempre ativos.';
					else if (d.category === 'console') tip = 'Console sem IP fixo. Recomendado fixar para facilitar NAT Aberto / Tipo 2 e direcionamento de portas.';

					b.push(E('span', { class: 'ex-device-badge badge-unreserved', style: 'background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: tip }, [ '⚠️ IP Dinâmico' ]));
					if (d.ip && d.ip !== '—') {
						b.push(E('button', { class: 'ex-mini-button', style: 'background:#eab308;color:#0f172a;border-color:#ca8a04;font-weight:750;font-size:0.68rem;padding:2px 7px;border-radius:6px;cursor:pointer;line-height:1;', title: 'Fixar este IP (' + d.ip + ') no DHCP permanentemente', click: L.bind(function(ev) { ev.stopPropagation(); quickReserveFn('iot', d); }, this) }, ['🔒 Fixar IP']));
					}
				}
			}
			return b;
		};

		const deviceWifiInfo = function(mac, ip) {
			const a = main[mac] || guest[mac];
			const isGuest = !!guest[mac] || (guestPrefix && String(ip || '').indexOf(guestPrefix) === 0);
			if (a) {
				const is5G = (a.band === '5g') || (a.bandLabel === '5 GHz') ||
					(a.ifname && (a.ifname.indexOf('phy1') >= 0 || a.ifname.indexOf('radio1') >= 0 || a.ifname.indexOf('5g') >= 0 || a.ifname.indexOf('wlan1') >= 0)) ||
					(a.rx && (a.rx.mhz >= 80 || a.rx.vht)) || (a.tx && (a.tx.mhz >= 80 || a.tx.vht));
				const is6G = (a.band === '6g') || (a.bandLabel === '6 GHz') ||
					(a.rx && a.rx.mhz === 320) || (a.tx && a.tx.mhz === 320);
				const band = is6G ? '6g' : (is5G ? '5g' : '2g');
				const bandLabel = is6G ? '6 GHz' : (is5G ? '5 GHz' : '2,4 GHz');
				const defaultMainSsid = is5G ? (wifiNames.main.ssid5 || wifiNames.main.ssid || 'CASA_ARK_5G') : (wifiNames.main.ssid2 || wifiNames.main.ssid || 'CASA_ARK');
				const ssid = a.ssid || (isGuest ? guestName : defaultMainSsid);
				return {
					isWifi: true,
					ssid: ssid,
					band: band,
					bandLabel: bandLabel,
					signal: a.signal,
					isGuest: isGuest,
					network: ssid
				};
			}
			const wiredNet = isGuest ? (guestName + ' / Cabo') : 'Cabo / LAN';
			return {
				isWifi: false,
				ssid: '',
				band: '',
				bandLabel: '',
				signal: null,
				isGuest: isGuest,
				network: wiredNet
			};
		};
		const renderNetworkCell = function(d) {
			if (d.isMaster) {
				return E('div', { class: 'ex-net-info', style: 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;' }, [
					E('strong', { style: 'font-weight:600;color:#38bdf8;' }, ['Enlace Mesh / Mestre']),
					E('span', { class: 'ex-device-badge badge-wifi-50', style: 'background:rgba(56,189,248,0.18);color:#38bdf8;border:1px solid rgba(56,189,248,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;' }, ['Backhaul'])
				]);
			}
			if (d.isWifi) {
				const is5G = (d.band === '5g');
				const bandText = d.bandLabel || (is5G ? '5 GHz' : '2,4 GHz');
				const badgeStyle = is5G
					? 'background:rgba(59,130,246,0.18);color:#60a5fa;border:1px solid rgba(59,130,246,0.35);'
					: 'background:rgba(245,158,11,0.18);color:#f59e0b;border:1px solid rgba(245,158,11,0.35);';
				const wifiDisplayName = isSecondaryRouter ? ((d.ssid || 'Wi-Fi') + ' (Neste Ponto)') : (d.ssid || d.network || 'Wi-Fi');
				const children = [
					E('strong', { style: 'font-weight:600;color:var(--ex-text);' }, [wifiDisplayName]),
					E('span', {
						class: 'ex-device-badge ' + (is5G ? 'badge-wifi-50' : 'badge-wifi-24'),
						style: badgeStyle + 'font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;'
					}, [bandText])
				];
				if (d.signal != null) {
					children.push(E('span', { class: 'ex-muted', style: 'font-size:0.75rem;font-variant-numeric:tabular-nums;white-space:nowrap;' }, ['• ' + d.signal + ' dBm']));
				}
				return E('div', { class: 'ex-net-info', style: 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;' }, children);
			} else {
				const wiredLabel = isSecondaryRouter ? 'Rede Mesh / Roteador Mestre' : (d.network || 'Cabo / LAN');
				const badgeText = isSecondaryRouter ? 'Mesh / Mestre' : 'Cabo';
				return E('div', { class: 'ex-net-info', style: 'display:flex;align-items:center;gap:6px;flex-wrap:wrap;' }, [
					E('strong', { style: 'font-weight:600;color:var(--ex-text);' }, [wiredLabel]),
					E('span', {
						class: 'ex-device-badge badge-cabo',
						style: 'background:rgba(148,163,184,0.15);color:#94a3b8;border:1px solid rgba(148,163,184,0.3);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;'
					}, [badgeText])
				]);
			}
		};
		// Parse ARP table (/proc/net/arp) first to find active wired/LAN devices and dead ARPs
		const arpMap = {};
		const arpDeadMap = {};
		const arpText = String(data.arpTable || '');
		if (arpText) {
			const arpLines = arpText.split('\n');
			for (let i = 1; i < arpLines.length; i++) {
				const cols = arpLines[i].trim().split(/\s+/);
				if (cols.length >= 6) {
					const aIp = cols[0];
					const aFlags = cols[2];
					const aMac = String(cols[3] || '').toUpperCase();
					const aDev = cols[5];
					if (aMac && aMac !== '00:00:00:00:00:00' && aIp !== lanStatus.ipaddr) {
						if (aFlags === '0x2') {
							arpMap[aMac] = { ip: aIp, device: aDev };
						} else if (aFlags === '0x0') {
							arpDeadMap[aMac] = true;
						}
					}
				}
			}
		}

		let staleLeasesCount = 0;
		const devices=[];
		leases.forEach(function(l) {
			const mac=String(l.macaddr||'').toUpperCase();
			if(!mac||seen[mac] || (l.ipaddr && l.ipaddr.indexOf('169.254.') === 0))return;

			// Check if device is genuinely active / online:
			// 1. Actively associated with Wi-Fi (main or guest)
			// 2. Active in ARP table (flag 0x2)
			// 3. Actively transmitting / receiving packets right now
			const isWifi = !!(main[mac] || guest[mac]);
			const isSecDev = secRegex.test(l.hostname || '') || secRegex.test(names[mac] || '') || secRegex.test(reservedNameMap[mac] || '');
			const isWired = !!(arpMap[mac]) || isSecDev || (rates[mac] && ((rates[mac].rx || 0) > 0 || (rates[mac].tx || 0) > 0));

			if (!isWifi && !isWired) {
				// Device disconnected or changed MAC address (ghost / stale lease)
				staleLeasesCount++;
				return;
			}

			seen[mac]=1;
			const w = deviceWifiInfo(mac, l.ipaddr);
			devices.push({
				mac: mac,
				ip: l.ipaddr || '—',
				name: names[mac] || l.hostname || 'Dispositivo sem nome',
				hostname: l.hostname || '',
				network: w.network,
				ssid: w.ssid,
				band: w.band,
				bandLabel: w.bandLabel,
				isWifi: w.isWifi,
				guest: w.isGuest,
				signal: w.signal,
				rate: rates[mac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
			});
		});
		Object.keys(main).concat(Object.keys(guest)).forEach(function(mac) {
			if(seen[mac])return;
			seen[mac]=1;
			const w = deviceWifiInfo(mac, '');
			const hName = (hostHints[mac] || {}).name || '';
			let fallbackIp = (arpMap[mac] && arpMap[mac].ip) || '—';
			if (fallbackIp && fallbackIp.indexOf('169.254.') === 0) fallbackIp = '—';
			devices.push({
				mac: mac,
				ip: fallbackIp,
				name: names[mac] || hName || 'Dispositivo sem nome',
				hostname: hName,
				network: w.network,
				ssid: w.ssid,
				band: w.band,
				bandLabel: w.bandLabel,
				isWifi: true,
				guest: w.isGuest,
				signal: w.signal,
				rate: rates[mac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
			});
		});

		// Include active devices discovered via ARP on LAN
		Object.keys(arpMap).forEach(function(mac) {
			if (seen[mac]) return;
			const arpInfo = arpMap[mac];
			const devIp = arpInfo.ip;
			if (!devIp || devIp.indexOf('169.254.') === 0) return;
			const isLan = (lanPrefix && devIp.indexOf(lanPrefix) === 0) || (arpInfo.device === 'br-lan');
			const isGuest = !!(guestPrefix && devIp.indexOf(guestPrefix) === 0);
			if (!isLan && !isGuest) return;

			seen[mac] = 1;
			const hint = hostHints[mac] || {};
			const devName = names[mac] || hint.name || reservedNameMap[mac] || 'Dispositivo sem nome';
			const w = deviceWifiInfo(mac, devIp);
			devices.push({
				mac: mac,
				ip: devIp || '—',
				name: devName,
				hostname: hint.name || '',
				network: w.network,
				ssid: w.ssid,
				band: w.band,
				bandLabel: w.bandLabel,
				isWifi: w.isWifi,
				guest: isGuest,
				signal: w.signal,
				rate: rates[mac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
			});
		});

		// Include active wired devices discovered via deviceStations telemetry
		const devStationsWired = (data.deviceStations && data.deviceStations.wired) || [];
		devStationsWired.forEach(function(d) {
			const uMac = String(d.mac || '').toUpperCase();
			if (!uMac || seen[uMac]) return;
			seen[uMac] = 1;
			const hint = hostHints[uMac] || {};
			const devName = names[uMac] || hint.name || reservedNameMap[uMac] || d.name || 'Aparelho Cabeado';
			const w = deviceWifiInfo(uMac, d.ip);
			devices.push({
				mac: uMac,
				ip: d.ip || '—',
				name: devName,
				hostname: hint.name || '',
				network: w.network,
				ssid: w.ssid,
				band: w.band,
				bandLabel: w.bandLabel,
				isWifi: false,
				guest: false,
				signal: null,
				rate: rates[uMac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
			});
		});

		// Include static DHCP hosts only if they are genuinely online right now
		Object.keys(dhcpValues).forEach(function(k) {
			const h = dhcpValues[k];
			if (!h || h['.type'] !== 'host' || !h.mac || !h.ip) return;
			const macs = Array.isArray(h.mac) ? h.mac : String(h.mac).split(/\s+/);
			macs.forEach(function(m) {
				const mac = String(m || '').toUpperCase();
				if (!mac || seen[mac]) return;
				const devIp = h.ip;
				if (!devIp || devIp.indexOf('169.254.') === 0) return;
				const isLan = (lanPrefix && devIp.indexOf(lanPrefix) === 0);
				const isGuest = !!(guestPrefix && devIp.indexOf(guestPrefix) === 0);
				if (!isLan && !isGuest) return;
				const isWifi = !!(main[mac] || guest[mac]);
				const isSecDev = secRegex.test(h.name || '') || secRegex.test(names[mac] || '') || secRegex.test(reservedNameMap[mac] || '');
				const isWired = !!(arpMap[mac]) || isSecDev || (rates[mac] && ((rates[mac].rx || 0) > 0 || (rates[mac].tx || 0) > 0));
				if (isWifi || isWired) {
					seen[mac] = 1;
					const hint = hostHints[mac] || {};
					const devName = names[mac] || hint.name || h.name || 'Dispositivo sem nome';
					const w = deviceWifiInfo(mac, devIp);
					devices.push({
						mac: mac,
						ip: devIp,
						name: devName,
						hostname: hint.name || h.name || '',
						network: w.network,
						ssid: w.ssid,
						band: w.band,
						bandLabel: w.bandLabel,
						isWifi: w.isWifi,
						guest: isGuest,
						signal: w.signal,
						rate: rates[mac] || { rx: 0, tx: 0, totalRx: 0, totalTx: 0 }
					});
				}
			});
		});
		const fingerprints = data.deviceFingerprints || {};
		devices.forEach(function(d) {
			if (isSecondaryRouter && d.ip && (d.ip === masterGwIp || d.ip === '192.168.73.1')) {
				d.isMaster = true;
				d.name = 'Roteador Principal (Gateway)';
				d.category = 'master';
				return;
			}
			const fp = fingerprints[d.mac] || {};
			if ((!d.name || d.name === 'Dispositivo sem nome') && fp.hostname) {
				d.name = fp.hostname;
				d.hostname = fp.hostname;
			}
			d.isSecondary = secRegex.test(d.name) || secRegex.test(reservedNameMap[d.mac] || '') || secRegex.test(d.hostname || '');
			d.category = d.isSecondary ? 'secondary' : detectDeviceCategory(d.mac, d.name, d.hostname, !d.isWifi, d.band, d.ssid || d.network, fp);
			d.fingerprint = fp;
			d.isIot = (d.category === 'iot');
			d.isPrivateMac = isPrivateMac(d.mac);
			if (!d.name || d.name === 'Dispositivo sem nome') {
				const uPrefix = String(d.mac || '').toUpperCase().slice(0, 8);
				if (['84:B4:D2', '08:1A:1E', '14:95:69', '20:67:E0', '84:EA:97', '98:17:3C'].indexOf(uPrefix) >= 0) {
					d.name = 'Câmera Wi-Fi / Smart';
				} else if (appleOuiPrefixes.indexOf(uPrefix) >= 0) {
					d.name = d.category === 'computer' ? 'Computador Mac' : (d.category === 'tablet' ? 'iPad' : 'Dispositivo Apple');
				}
			}
		});
		this.sortDevices(devices);
		const existingRows = body.querySelectorAll('tr[data-mac]');
		const nowTime = Date.now();
		const force = !!this.forceDeviceReorder;
		this.forceDeviceReorder = false;

		const newOrder = devices.map(function(d){ return d.mac; }).join(',');
		const currentOrder = Array.prototype.map.call(existingRows, function(r){ return r.getAttribute('data-mac'); }).join(',');
		const orderChanged = (newOrder !== currentOrder);

		// Se o usuário ordenou manualmente (force), reordena imediatamente.
		// Em 'Nome' e 'Total', se a ordem mudou, reordena imediatamente (zero delay).
		// Se a ordem física não mudou, apenas atualiza os números in-place para desempenho.
		// Somente em 'Agora' (velocidade) seguramos 4 segundos para amortecer oscilações de pacotinhos.
		const shouldKeepInPlace = !force && existingRows.length > 0 && existingRows.length === devices.length && (
			!orderChanged ||
			(this.deviceSortKey === 'now' && (nowTime - (this.lastDeviceReorderTime || 0)) < 4000)
		);

		if (shouldKeepInPlace) {
			devices.forEach(L.bind(function(d) {
				const row = body.querySelector('tr[data-mac="' + d.mac + '"]');
				if (row) {
					const downEl = row.querySelector('.ex-rate-cell .down');
					if (downEl) downEl.textContent = '↓ ' + formatRate(d.rate.rx);
					const upEl = row.querySelector('.ex-rate-cell .up');
					if (upEl) upEl.textContent = '↑ ' + formatRate(d.rate.tx);
					const totEl = row.querySelector('.ex-total-cell');
					if (totEl) {
						const tot = (Number(d.rate.totalRx) || 0) + (Number(d.rate.totalTx) || 0);
						totEl.textContent = tot > 0 ? formatBytes(tot) : '—';
					}
					const reservedIp = reservedMap[d.mac];
					const prioDscp = priorityMap[d.mac];
					const lim = limitsMap[d.mac];
					const par = parentalMap[d.mac];
					const quickReserveFn = L.bind(function(type, dev) {
						if (type === 'secondary') this.quickReserveSecondary(dev);
						else this.quickReserveIot(dev);
					}, this);
					const badges = buildCategoryBadges(d, reservedIp, quickReserveFn);
					if (prioDscp === 'EF' || prioDscp === 'AF41') {
						badges.push(E('span', { class: 'ex-device-badge badge-gamer', title: 'Fila Gamer / Prioridade Máxima (AF41)' }, [ '🎮 Gamer' ]));
					} else if (prioDscp === 'AF31' || prioDscp === 'AF42') {
						badges.push(E('span', { class: 'ex-device-badge badge-video', title: 'Fila de Vídeo / Multimídia (AF31)' }, [ '📺 Vídeo' ]));
					}
					if (lim && lim.enabled && (lim.down > 0 || lim.up > 0)) {
						const downStr = lim.down > 0 ? lim.down + 'M↓' : '';
						const upStr = lim.up > 0 ? lim.up + 'M↑' : '';
						const limText = [downStr, upStr].filter(Boolean).join(' / ');
						const bypassTip = lim.lanBypass ? ' (Rede Local Livre)' : ' (Intranet Limitada)';
						badges.push(E('span', { class: 'ex-device-badge badge-limited', title: 'Limite de Banda Ativo: ' + limText + bypassTip }, [ '🛑 ' + limText ]));
					}
					if (ipv6Map[d.mac] || dhcp6ActiveMap[d.mac]) {
						badges.push(E('span', { class: 'ex-device-badge badge-ipv6', style: 'background:rgba(16,185,129,0.16);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: ipv6Map[d.mac] ? 'IPv6 Permitido para este aparelho' : 'IPv6 Ativo' }, [ '⚡ IPv6' ]));
					}
					if (this.dmzActive && ((this.dmzDestIp && this.dmzDestIp === d.ip) || (this.dmzMac && this.dmzMac === d.mac))) {
				badges.push(E('span', { class: 'ex-device-badge badge-dmz', style: 'background:rgba(244,63,94,0.18);color:#f43f5e;border:1px solid rgba(244,63,94,0.4);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Zona Desmilitarizada (DMZ): Todas as portas da WAN direcionadas para este dispositivo' }, [ '🎯 DMZ Ativa' ]));
			}
			if (par && par.mode === 'bypass') {
						badges.push(E('span', { class: 'ex-device-badge badge-bypass', style: 'background:rgba(59,130,246,0.16);color:#60a5fa;border:1px solid rgba(59,130,246,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Bypass AdGuard: DNS liberado direto para a Internet (1.1.1.1) sem bloqueio de anúncios ou filtros' }, [ '⚡ Bypass AdGuard' ]));
					} else if (par && par.mode === 'custom') {
						badges.push(E('span', { class: 'ex-device-badge badge-parental', style: 'background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Filtro Individual / Parental ativo para este aparelho' }, [ '🛡️ Filtro Ativo' ]));
					}
					const nameRowEl = row.querySelector('.ex-device-name-row');
					if (nameRowEl) {
						nameRowEl.replaceChildren.apply(nameRowEl, [ E('strong', {}, [d.name]) ].concat(badges));
					}
					const wifiMeta = d.isWifi ? (' • ' + (d.ssid || 'Wi-Fi') + ' (' + (d.bandLabel || (d.band === '5g' ? '5 GHz' : '2,4 GHz')) + ')') : '';
					const fpMeta = (d.fingerprint && d.fingerprint.vendor_class) ? (' • ' + d.fingerprint.vendor_class) : '';
					const metaEl = row.querySelector('.ex-device-meta');
					if (metaEl) {
						metaEl.textContent = d.ip + ' • ' + d.mac + (reservedIp && reservedIp !== d.ip ? ' (Fixo: ' + reservedIp + ')' : '') + wifiMeta + fpMeta;
					}
					const netEl = row.querySelector('.ex-net-cell');
					if (netEl) {
						netEl.replaceChildren(renderNetworkCell(d));
					}
				}
			}, this));
			const localWifiCount = devices.filter(function(x){ return x.isWifi; }).length;
			if (isSecondaryRouter) {
				text('ex-device-count', localWifiCount + ' neste ponto • ' + devices.length + ' na rede');
			} else {
				text('ex-device-count', devices.length + ' conectado' + (devices.length === 1 ? '' : 's'));
			}
			const flushBtn = document.getElementById('ex-device-flush-btn');
			if (flushBtn) {
				if (staleLeasesCount > 0) {
					flushBtn.style.display = 'inline-flex';
					flushBtn.textContent = '🧹 ' + translateText('Limpar inativos') + ' (' + staleLeasesCount + ')';
				} else {
					flushBtn.style.display = 'none';
				}
			}
			this.updateSecondaryBanner(devices, reservedMap);
			return;
		}

		this.lastDeviceReorderTime = nowTime;
		body.replaceChildren();
		devices.forEach(L.bind(function(d) {
			const reservedIp = reservedMap[d.mac];
			const prioDscp = priorityMap[d.mac];
			const lim = limitsMap[d.mac];
			const par = parentalMap[d.mac];
			const quickReserveFn = L.bind(function(type, dev) {
				if (type === 'secondary') this.quickReserveSecondary(dev);
				else this.quickReserveIot(dev);
			}, this);
			const badges = buildCategoryBadges(d, reservedIp, quickReserveFn);
			if (prioDscp === 'EF' || prioDscp === 'AF41') {
				badges.push(E('span', { class: 'ex-device-badge badge-gamer', title: 'Fila Gamer / Prioridade Máxima (AF41)' }, [ '🎮 Gamer' ]));
			} else if (prioDscp === 'AF31' || prioDscp === 'AF42') {
				badges.push(E('span', { class: 'ex-device-badge badge-video', title: 'Fila de Vídeo / Multimídia (AF31)' }, [ '📺 Vídeo' ]));
			}
			if (lim && lim.enabled && (lim.down > 0 || lim.up > 0)) {
				const downStr = lim.down > 0 ? lim.down + 'M↓' : '';
				const upStr = lim.up > 0 ? lim.up + 'M↑' : '';
				const limText = [downStr, upStr].filter(Boolean).join(' / ');
				const bypassTip = lim.lanBypass ? ' (Rede Local Livre)' : ' (Intranet Limitada)';
				badges.push(E('span', { class: 'ex-device-badge badge-limited', title: 'Limite de Banda Ativo: ' + limText + bypassTip }, [ '🛑 ' + limText ]));
			}
			if (ipv6Map[d.mac] || dhcp6ActiveMap[d.mac]) {
				badges.push(E('span', { class: 'ex-device-badge badge-ipv6', style: 'background:rgba(16,185,129,0.16);color:#10b981;border:1px solid rgba(16,185,129,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: ipv6Map[d.mac] ? 'IPv6 Permitido para este aparelho' : 'IPv6 Ativo' }, [ '⚡ IPv6' ]));
			}
			if (par && par.mode === 'bypass') {
				badges.push(E('span', { class: 'ex-device-badge badge-bypass', style: 'background:rgba(59,130,246,0.16);color:#60a5fa;border:1px solid rgba(59,130,246,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Bypass AdGuard: DNS liberado direto para a Internet (1.1.1.1) sem bloqueio de anúncios ou filtros' }, [ '⚡ Bypass AdGuard' ]));
			} else if (par && par.mode === 'custom') {
				badges.push(E('span', { class: 'ex-device-badge badge-parental', style: 'background:rgba(239,68,68,0.16);color:#f87171;border:1px solid rgba(239,68,68,0.35);font-weight:700;font-size:0.68rem;padding:2px 6px;border-radius:6px;white-space:nowrap;', title: 'Filtro Individual / Parental ativo para este aparelho' }, [ '🛡️ Filtro Ativo' ]));
			}

			const nameRow = E('div', { class: 'ex-device-name-row' }, [
				E('strong', {}, [d.name])
			].concat(badges));

			const wifiMeta = d.isWifi ? (' • ' + (d.ssid || 'Wi-Fi') + ' (' + (d.bandLabel || (d.band === '5g' ? '5 GHz' : '2,4 GHz')) + ')') : '';
			const fpMeta = (d.fingerprint && d.fingerprint.vendor_class) ? (' • ' + d.fingerprint.vendor_class) : '';
			const metaText = d.ip + ' • ' + d.mac + (reservedIp && reservedIp !== d.ip ? ' (Fixo: ' + reservedIp + ')' : '') + wifiMeta + fpMeta;
			const totalBytes = (Number(d.rate.totalRx) || 0) + (Number(d.rate.totalTx) || 0);

			const tr=E('tr',{'data-mac':d.mac},[
				E('td',{},[nameRow, E('small',{class:'ex-device-meta'},[metaText])]),
				E('td',{'class':'ex-hide-mobile ex-net-cell'},[renderNetworkCell(d)]),
				E('td',{'class':'ex-rate-cell'},[
					E('span',{class:'down'},['↓ '+formatRate(d.rate.rx)]),
					E('span',{class:'up'},['↑ '+formatRate(d.rate.tx)]),
					totalBytes > 0 ? E('span',{class:'ex-rate-total ex-show-mobile'},['Σ ' + formatBytes(totalBytes)]) : ''
				]),
				E('td',{'class':'ex-total-cell ex-hide-mobile',style:'font-weight:600;font-variant-numeric:tabular-nums;'},[totalBytes > 0 ? formatBytes(totalBytes) : '—']),
				E('td',{'class':'ex-device-action'},[
					d.isMaster ? E('a', {
						class: 'ex-mini-button',
						href: 'http://' + (d.ip || '192.168.73.1') + '/',
						target: '_blank',
						title: 'Abrir Painel do Roteador Principal (Gateway)',
						style: 'text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-right:4px;background:rgba(59,130,246,0.18);border-color:#3b82f6;color:#60a5fa;font-weight:700;'
					}, [
						E('span', { class: 'ex-hide-mobile' }, ['🌐 Painel Mestre']),
						E('span', { class: 'ex-show-mobile' }, ['🌐'])
					]) : '',
					d.isSecondary ? E('a', {
						class: 'ex-mini-button',
						href: 'http://' + (d.ip || '192.168.1.2') + '/',
						target: '_blank',
						title: 'Abrir Painel do Roteador Secundário',
						style: 'text-decoration:none;display:inline-flex;align-items:center;gap:3px;margin-right:4px;background:rgba(14,165,233,0.18);border-color:#38bdf8;color:#38bdf8;font-weight:700;'
					}, [
						E('span', { class: 'ex-hide-mobile' }, ['🌐 Painel']),
						E('span', { class: 'ex-show-mobile' }, ['🌐'])
					]) : '',
					E('button',{'class':'ex-mini-button','title':'Configurar dispositivo','click':L.bind(this.configureDevice,this,d)},[
						E('span',{'class':'ex-hide-mobile'},['Configurar']),
						E('span',{'class':'ex-show-mobile'},['⚙️'])
					])
				])
			]);
			body.appendChild(tr);
		},this));
		this.devices = devices;
		this.updateSecondaryBanner(devices, reservedMap);
		const localWifiCountFinal = devices.filter(function(x){ return x.isWifi; }).length;
		if (isSecondaryRouter) {
			text('ex-device-count', localWifiCountFinal + ' neste ponto • ' + devices.length + ' na rede');
		} else {
			text('ex-device-count', devices.length + ' conectado' + (devices.length === 1 ? '' : 's'));
		}
		const flushBtn = document.getElementById('ex-device-flush-btn');
		if (flushBtn) {
			if (staleLeasesCount > 0) {
				flushBtn.style.display = 'inline-flex';
				flushBtn.textContent = '🧹 ' + translateText('Limpar inativos') + ' (' + staleLeasesCount + ')';
			} else {
				flushBtn.style.display = 'none';
			}
		}
		const empty=document.getElementById('ex-device-empty'); if(empty)empty.style.display=devices.length?'none':'';
	},
	sortDevices: function(devices) {
		const key=this.deviceSortKey||'total', dir=this.deviceSortDir||'desc', factor=dir==='asc'?1:-1;
		const metric=function(d){
			if(key==='name')return String(d.name||'').toLocaleLowerCase();
			if(key==='total')return (Number(d.rate.totalRx)||0)+(Number(d.rate.totalTx)||0);
			return (Number(d.rate.rx)||0)+(Number(d.rate.tx)||0);
		};
		devices.sort(function(a,b){
			const av=metric(a), bv=metric(b);
			if(typeof av==='string'||typeof bv==='string'){
				const cmp=String(av).localeCompare(String(bv),undefined,{numeric:true,sensitivity:'base'});
				return cmp*factor || String(a.mac).localeCompare(String(b.mac));
			}
			return ((av>bv)?1:(av<bv?-1:0))*factor || String(a.name||'').localeCompare(String(b.name||''),undefined,{numeric:true,sensitivity:'base'});
		});
	},
	setDeviceSort: function(key) {
		this.deviceSortKey = key || 'total';
		if (this.deviceSortKey === 'name') {
			this.deviceSortDir = 'asc';
		} else {
			this.deviceSortDir = 'desc';
		}
		const dirBtn = document.getElementById('ex-device-sort-dir');
		if (dirBtn) {
			if (this.deviceSortKey === 'name') {
				dirBtn.textContent = this.deviceSortDir === 'asc' ? 'A → Z' : 'Z → A';
			} else {
				dirBtn.textContent = this.deviceSortDir === 'desc' ? 'Maior primeiro' : 'Menor primeiro';
			}
		}
		this.forceDeviceReorder = true;
		this.lastDeviceReorderTime = 0;
		if (this.currentData) this.renderDevices(this.currentData, this.lastDeviceRates || this.deviceRates(this.currentData));
	},
	toggleDeviceSortDirection: function(button) {
		this.deviceSortDir = this.deviceSortDir === 'asc' ? 'desc' : 'asc';
		if (button) {
			if (this.deviceSortKey === 'name') {
				button.textContent = this.deviceSortDir === 'asc' ? 'A → Z' : 'Z → A';
			} else {
				button.textContent = this.deviceSortDir === 'desc' ? 'Maior primeiro' : 'Menor primeiro';
			}
		}
		this.forceDeviceReorder = true;
		this.lastDeviceReorderTime = 0;
		if (this.currentData) this.renderDevices(this.currentData, this.lastDeviceRates || this.deviceRates(this.currentData));
	},
	quickReserveSecondary: function(d) {
		const targetIp = (d.ip && d.ip !== '—') ? d.ip : '192.168.1.2';
		const targetName = d.name || 'ARK-Secundario';
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['device-reserve-secondary', d.mac, targetIp, targetName]).then(L.bind(function(r) {
			ui.addNotification(null, E('p', {}, [
				'🔒 MAC ', E('strong', {}, [d.mac]), ' amarrado com sucesso ao IP ', E('strong', {}, [targetIp]), '! Nenhum outro aparelho receberá este IP.'
			]), 'info');
			window.setTimeout(function() {
				window.location.reload();
			}, 1500);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', {}, ['Erro ao amarrar MAC: ' + (e.message || e)]), 'danger');
		});
	},
	quickReserveIot: function(d) {
		const targetIp = (d.ip && d.ip !== '—') ? d.ip : '';
		if (!targetIp) {
			ui.addNotification(null, E('p', {}, ['Não foi possível identificar o IP atual do dispositivo.']), 'warning');
			return;
		}
		let defaultPrefix = 'Smart-';
		if (d.category === 'tv') defaultPrefix = 'TV-';
		else if (d.category === 'printer') defaultPrefix = 'Impressora-';
		else if (d.category === 'console') defaultPrefix = 'Console-';
		else if (d.category === 'computer') defaultPrefix = 'PC-';
		const rawName = (d.name && d.name !== 'Dispositivo sem nome') ? d.name : (defaultPrefix + String(d.mac).slice(-5).replace(':', ''));
		return fs.exec('/usr/sbin/equipe-dashboard-control', ['device-reserve-quick', d.mac, targetIp, rawName]).then(L.bind(function(r) {
			if (r.code !== 0) {
				throw new Error(r.stderr || 'Falha ao fixar IP no DHCP');
			}
			let catLabel = 'Dispositivos de automação e assistentes (Alexa/Google)';
			if (d.category === 'printer') catLabel = 'Impressoras de rede';
			else if (d.category === 'tv') catLabel = 'Smart TVs e aparelhos de streaming';
			else if (d.category === 'console') catLabel = 'Consoles de videogame';
			else if (d.category === 'computer') catLabel = 'Computadores e servidores';
			ui.addNotification(null, E('p', {}, [
				'🔒 IP ', E('strong', {}, [targetIp]), ' fixado com sucesso para ', E('strong', {}, [rawName]), '! ' + catLabel + ' agora manterão sempre o mesmo endereço.'
			]), 'info');
			this.forceDeviceReorder = true;
			window.setTimeout(L.bind(function() {
				if (this.fetchData) {
					this.fetchData().then(L.bind(this.update, this));
				} else {
					window.location.reload();
				}
			}, this), 1200);
		}, this)).catch(function(e) {
			ui.addNotification(null, E('p', {}, ['Erro ao fixar IP: ' + (e.message || e)]), 'danger');
		});
	},
	updateSecondaryBanner: function(devices, reservedMap) {
		const banner = document.getElementById('ex-secondary-routers-banner');
		if (!banner) return;
		const secRouters = (devices || []).filter(function(d) { return d.isSecondary; });
		if (!secRouters || secRouters.length === 0) {
			banner.style.display = 'none';
			banner.replaceChildren();
			return;
		}
		banner.style.display = 'block';
		const allReserved = secRouters.every(function(d) { return !!reservedMap[d.mac]; });

		const items = secRouters.map(L.bind(function(sr) {
			const isRes = !!reservedMap[sr.mac];
			const srIp = sr.ip || '192.168.1.2';
			return E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 10px; background: rgba(0,0,0,0.2); border-radius: 6px; margin-top: 6px; flex-wrap: wrap;' }, [
				E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' }, [
					E('strong', { style: 'color: #f8fafc;' }, [sr.name]),
					E('span', { class: 'ex-muted', style: 'font-size: 12px;' }, ['(' + srIp + ' • ' + sr.mac + ')']),
					isRes
						? E('span', { class: 'ex-device-badge badge-reserved', style: 'background: rgba(16,185,129,0.16); color: #10b981; border: 1px solid rgba(16,185,129,0.35); font-weight: 700; font-size: 0.68rem; padding: 2px 6px; border-radius: 6px;' }, ['🔒 MAC Amarrado (.2)'])
						: E('span', { class: 'ex-device-badge badge-unreserved', style: 'background: rgba(239,68,68,0.16); color: #f87171; border: 1px solid rgba(239,68,68,0.35); font-weight: 700; font-size: 0.68rem; padding: 2px 6px; border-radius: 6px;' }, ['⚠️ MAC Não Amarrado'])
				]),
				E('div', { style: 'display: flex; gap: 6px; align-items: center;' }, [
					!isRes ? E('button', {
						class: 'btn cbi-button cbi-button-action',
						style: 'font-size: 11.5px; font-weight: 700; padding: 3px 8px;',
						click: L.bind(function(ev) {
							ev.stopPropagation();
							this.quickReserveSecondary(sr);
						}, this)
					}, ['🔒 Amarrar MAC (.2)']) : '',
					E('a', {
						class: 'btn cbi-button cbi-button-neutral',
						href: 'http://' + srIp + '/',
						target: '_blank',
						style: 'font-size: 11.5px; font-weight: 700; padding: 3px 8px; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;'
					}, ['🌐 Abrir Painel'])
				])
			]);
		}, this));

		banner.replaceChildren(
			E('div', {
				class: 'alert-message info',
				style: 'background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 10px; padding: 12px 14px;'
			}, [
				E('div', { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;' }, [
					E('strong', { style: 'color: #38bdf8; font-size: 14px; display: flex; align-items: center; gap: 6px;' }, [
						'📡 Roteador' + (secRouters.length > 1 ? 'es Secundários Detectados' : ' Secundário Detectado') + ' (' + secRouters.length + ' ativo' + (secRouters.length > 1 ? 's' : '') + ' expandindo a rede)'
					]),
					allReserved
						? E('span', { class: 'ex-pill online', style: 'font-size: 11px; padding: 2px 8px;' }, ['PROTEGIDO CONTRA CONFLITOS'])
						: E('span', { class: 'ex-pill offline', style: 'background: rgba(239,68,68,0.2); color: #f87171; border-color: rgba(239,68,68,0.4); font-size: 11px; padding: 2px 8px;' }, ['PENDENTE DE AMARRAÇÃO'])
				]),
				E('p', { class: 'ex-muted', style: 'margin: 2px 0 6px; font-size: 12px; line-height: 1.4;' }, [
					'Aparelhos conectados abaixo deste roteador principal operando com Wi-Fi sincronizado e portas cabeadas transparentes. O endereço IP fica reservado pelo MAC para que nenhum outro celular ou computador cause colisão de rede.'
				]),
				E('div', { style: 'display: flex; flex-direction: column; gap: 4px;' }, items)
			])
		);
	},
	flushStaleLeases: function() {
		const btn = document.getElementById('ex-device-flush-btn');
		if (btn) {
			btn.disabled = true;
			btn.textContent = translateText('Limpando…');
		}
		fs.exec('/usr/sbin/equipe-dashboard-control', ['flush-stale-leases']).then(L.bind(function(res) {
			let count = 0;
			try {
				const json = JSON.parse(res.stdout || '{}');
				count = json.purged || 0;
			} catch(e) {}
			ui.addNotification(null, E('p', {}, [
				count > 0
					? ('🧹 ' + count + ' ' + translateText('concessão(ões) inativa(s) removida(s) com sucesso.'))
					: translateText('Nenhum dispositivo inativo encontrado no momento.')
			]), 'info');
			if (btn) {
				btn.disabled = false;
				btn.style.display = 'none';
			}
			this.scheduleAdaptiveRefresh(100);
		}, this)).catch(L.bind(function(err) {
			if (btn) {
				btn.disabled = false;
				btn.textContent = '🧹 ' + translateText('Limpar inativos');
			}
			ui.addNotification(null, E('p', {}, [translateText('Erro ao limpar inativos: ') + (err.message || err)]), 'danger');
		}, this));
	},

	togglePassword: function(id, button) { const n=document.getElementById(id), hidden=n.dataset.hidden!=='0'; n.dataset.hidden=hidden?'0':'1'; n.style.filter=hidden?'none':'blur(5px)'; button.textContent=hidden?'Ocultar senha':'Ver senha'; },
	configureDevice: function(device) {
		ui.showModal('Configurar dispositivo',[E('p',{class:'ex-muted'},['Carregando configurações…'])]);
		return fs.exec('/usr/sbin/equipe-dashboard-control',['device-status',device.mac]).then(L.bind(function(result){
			if(result.code)throw new Error(result.stderr||'Falha ao consultar o dispositivo');
			let state={};try{state=JSON.parse(result.stdout||'{}');}catch(e){throw new Error('Resposta inválida do roteador');}
			const isAutoName = (!device.name || device.name === 'Dispositivo sem nome' || device.name === 'Câmera Wi-Fi / Smart' || device.name === 'Dispositivo Apple' || device.name === 'Computador Mac' || device.name === 'iPad');
			const name=E('input',{class:'cbi-input-text',value:isAutoName?'':device.name,placeholder:device.name||'Ex.: Celular da Joyce',maxlength:48,style:'width:100%'});
			const ipInput=E('input',{class:'cbi-input-text',value:state.ip||(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(device.ip)?device.ip:''),placeholder:'192.168.73.120',inputmode:'decimal',style:'width:100%'});

			let isReserved = !!state.reserved;
			const reserveBtnAuto = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (!isReserved ? ' active' : ''),
				click: function() { updateReserveMode(false); }
			}, [ '⚡ Automático (DHCP)' ]);

			const reserveBtnFixed = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (isReserved ? ' active' : ''),
				click: function() { updateReserveMode(true); }
			}, [ '🔒 Reservar / IP Fixo' ]);

			const reserveDescBox = E('div', { class: 'ex-reserve-box' });

			const updateReserveMode = function(reserved) {
				isReserved = !!reserved;
				reserveBtnAuto.classList.toggle('active', !isReserved);
				reserveBtnFixed.classList.toggle('active', isReserved);
				reserveDescBox.innerHTML = '';
				if (!isReserved) {
					reserveDescBox.appendChild(E('div', { style: 'display:flex;flex-direction:column;gap:4px;' }, [
						E('div', { style: 'display:flex;align-items:center;gap:6px;' }, [
							E('span', { class: 'ex-pill standby', style: 'font-size:0.75rem;' }, ['DHCP DINÂMICO']),
							E('strong', { style: 'font-size:0.88rem;' }, ['IP Atribuído Automaticamente'])
						]),
						E('p', { class: 'ex-muted', style: 'margin:4px 0 0;font-size:0.83rem;line-height:1.4;' }, [
							'O roteador entrega um IP temporário livre da rede. O IP em uso agora é ',
							E('strong', { style: 'color:#cbd5e1;' }, [device.ip || state.ip || '—']),
							'. Nenhuma reserva fixa será mantida no sistema.'
						])
					]));
				} else {
					reserveDescBox.appendChild(E('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [
						E('div', { style: 'display:flex;align-items:center;gap:6px;' }, [
							E('span', { class: 'ex-pill online', style: 'font-size:0.75rem;' }, ['CONCESSÃO ESTÁTICA']),
							E('strong', { style: 'font-size:0.88rem;' }, ['IP Fixo Vinculado ao MAC'])
						]),
						E('label', { style: 'display:block;' }, [
							E('span', { style: 'display:block;font-size:0.82rem;margin-bottom:4px;color:#cbd5e1;' }, ['Endereço IP para fixar exclusivamente para este aparelho:']),
							ipInput
						]),
						E('p', { class: 'alert-message warning', style: 'margin:0;padding:6px 10px;border-radius:8px;font-size:0.8rem;line-height:1.35;' }, [
							'🔒 Este IP ficará gravado nas concessões estáticas do DHCP para o MAC ',
							E('code', {}, [device.mac]),
							'. Este aparelho sempre receberá o mesmo IP fixo toda vez que conectar.'
						])
					]));
					ipInput.focus();
				}
			};

			updateReserveMode(isReserved);

			const isSecondary = !!device.isSecondary;
			const isIot = !!device.isIot;
			const sections = [];
			if (isSecondary) {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(14, 165, 233, 0.08); border: 1px solid rgba(56, 189, 248, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #38bdf8; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['📡 Roteador Secundário Detectado']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Este aparelho é um nó secundário expandindo a rede Wi-Fi e portas LAN. É crucial manter o IP amarrado ao MAC (ex: ',
						E('code', { style: 'font-weight: 700; color: #f8fafc;' }, [device.ip || '192.168.1.2']),
						') para garantir que nenhum outro celular ou computador cause colisão de IP com este roteador.'
					])
				]));
			} else if (isIot) {
				sections.push(E('div', {
					class: 'alert-message warning',
					style: 'margin-bottom: 12px; background: rgba(234, 179, 8, 0.08); border: 1px solid rgba(234, 179, 8, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #eab308; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['💡 Dispositivo Smart Home / Automação']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificado como dispositivo de automação (Tuya, Sonoff, Espressif, Alexa, etc.). ',
						'É ', E('strong', { style: 'color: #f8fafc;' }, ['altamente recomendado manter o IP Fixo']),
						' para evitar que comandos de voz (Alexa / Google Home) ou aplicativos percam a comunicação local caso o roteador seja reiniciado.'
					])
				]));
			} else if (device.category === 'printer') {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #c084fc; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['🖨️ Impressora / Scanner de Rede']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificado como impressora de rede. ',
						'É ', E('strong', { style: 'color: #f8fafc;' }, ['altamente recomendado manter o IP Fixo']),
						' para que computadores, notebooks e celulares não percam a comunicação ou apresentem erro de impressora offline.'
					])
				]));
			} else if (device.category === 'tv') {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(6, 182, 212, 0.08); border: 1px solid rgba(6, 182, 212, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #22d3ee; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['📺 Smart TV / Aparelho de Streaming']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificado como Smart TV ou dispositivo de streaming. ',
						'Recomenda-se fixar o IP para manter espelhamento de tela (AirPlay/Chromecast), controle remoto por app no celular e integrações de ligar/desligar sempre estáveis.'
					])
				]));
			} else if (device.category === 'console') {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(236, 72, 153, 0.08); border: 1px solid rgba(236, 72, 153, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #f472b6; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['🎮 Console de Jogos']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificado como console de videogame. ',
						'Recomenda-se fixar o IP para manter o NAT Aberto / Tipo 2 (PlayStation/Xbox/Switch) estável e facilitar regras de encaminhamento de portas ou Fila Gamer.'
					])
				]));
			}

			if (device.isPrivateMac) {
				sections.push(E('div', {
					class: 'alert-message warning',
					style: 'margin-bottom: 12px; background: rgba(148, 163, 184, 0.08); border: 1px dashed rgba(148, 163, 184, 0.4); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #94a3b8; font-size: 13.5px; display: block; margin-bottom: 4px;' }, ['🎭 Endereço MAC Privado / Aleatório Detectado']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Este aparelho (iOS ou Android) está gerando um MAC privado aleatório nas configurações de Wi-Fi. ',
						'Se você fixar o IP e o aparelho mudar o MAC futuramente, a reserva deixará de corresponder a ele. Para fixação definitiva, acesse o menu Wi-Fi no dispositivo e mude de "MAC Aleatório" para "MAC do Dispositivo".'
					])
				]));
			}

			if (device.fingerprint && device.fingerprint.vendor_class) {
				sections.push(E('div', {
					class: 'alert-message info',
					style: 'margin-bottom: 12px; background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 8px; padding: 10px 12px;'
				}, [
					E('strong', { style: 'color: #60a5fa; font-size: 13px; display: block; margin-bottom: 4px;' }, ['🏷️ Identificação Passiva via DHCP (Option 60)']),
					E('p', { class: 'ex-muted', style: 'margin: 0; font-size: 12px; line-height: 1.45;' }, [
						'Identificador do Fabricante/SO: ',
						E('code', { style: 'font-weight: 700; color: #f8fafc;' }, [device.fingerprint.vendor_class]),
						(device.fingerprint.opt55 ? (' • Opções Solicitadas: ' + device.fingerprint.opt55) : '')
					])
				]));
			}
			sections.push(
				E('div',{class:'ex-device-config-block'},[
					E('label',{},['Nome neste roteador']),
					name,
					E('small',{class:'ex-muted'},['Endereço MAC: ' + device.mac])
				]),
				E('div',{class:'ex-device-config-block'},[
					E('strong',{},['Modo do Endereço IP']),
					E('small',{class:'ex-muted',style:'display:block;margin-top:2px;'},['Escolha se o dispositivo usa IP dinâmico ou se terá um IP fixo reservado:']),
					E('div', { class: 'ex-reserve-button-grid' }, [ reserveBtnAuto, reserveBtnFixed ]),
					reserveDescBox
				])
			);
			let selectedPriority = !state.priority ? 'none' : ((state.dscp === 'AF31' || state.dscp === 'AF42') ? 'video' : 'gamer');
			const hasQosFeature = (this.feature('sqm')||{}).installed || (this.feature('custom_qos')||{}).installed;
			if(hasQosFeature && !device.guest){
				const priorityButtons = [
					{ id: 'none', label: '⚪ Sem Prioridade', desc: 'Fila padrão justa (CS0). O SQM divide a banda igualmente entre os aparelhos. Recomendado para a maioria dos dispositivos (TVs, celulares e IoT).' },
					{ id: 'gamer', label: '🎮 Fila Gamer', desc: 'Prioridade máxima interativa (AF41 / Fila de Jogos). Os pacotes deste aparelho têm ultra-baixa latência e furam filas de downloads com total compatibilidade com jogos, web e Apple Store.' },
					{ id: 'video', label: '📺 Fila de Vídeo', desc: 'Alta prioridade multimídia (AF31 / Fila de Vídeo). Recomendado para chamadas de vídeo (Zoom, Meet, Teams) e transmissões ao vivo.' }
				];
				const descContainer = E('div', { class: 'ex-priority-desc-box' });
				const btnList = [];
				const updatePrioritySelection = function(newId) {
					selectedPriority = newId;
					btnList.forEach(function(item) {
						item.btn.classList.toggle('active', item.id === newId);
					});
					const matched = priorityButtons.find(function(p){ return p.id === newId; }) || priorityButtons[0];
					descContainer.innerHTML = '';
					descContainer.appendChild(E('p', { class: 'ex-priority-desc-text' }, [ matched.desc ]));
					if (newId === 'gamer') {
						descContainer.appendChild(E('small', { class: 'alert-message warning', style: 'margin-top:8px;display:block;padding:8px 10px;border-radius:8px;font-size:0.8rem;' }, [
							'💡 Dica ARK Router: Não ative a Fila Gamer em todos os aparelhos da casa. Priorize apenas onde você joga para manter o benefício anti-lag máximo!'
						]));
					}
				};
				const buttonsGrid = E('div', { class: 'ex-priority-button-grid' });
				priorityButtons.forEach(function(item) {
					const b = E('button', {
						type: 'button',
						class: 'ex-priority-option-btn' + (item.id === selectedPriority ? ' active' : ''),
						click: function() { updatePrioritySelection(item.id); }
					}, [ item.label ]);
					btnList.push({ id: item.id, btn: b });
					buttonsGrid.appendChild(b);
				});
				updatePrioritySelection(selectedPriority);

				sections.push(E('div',{class:'ex-device-config-block'},[
					E('strong',{},['Prioridade no SQM / QoS']),
					E('small',{class:'ex-muted',style:'display:block;margin-top:2px;'},['Escolha o nível de prioridade deste dispositivo na internet:']),
					buttonsGrid,
					descContainer
				]));
			}else sections.push(E('small',{class:'ex-muted ex-device-priority-note'},['A prioridade aparece somente na rede principal quando o SQM está ativo.']));

			const activeWans = getActiveWanList(this.currentData || {});
			let selectedWanRoute = state.wan_route || 'default';
			const wanRouteButtons = [
				{ id: 'default', label: '🌐 Padrão da Rede', desc: 'Segue a política global do Multi‑WAN / Speedify. Recomendado para a maioria dos aparelhos.' },
				{ id: 'wan', label: '⚡ Forçar WAN1 (Fibra)', desc: 'Rota 100% direta pela Fibra Óptica (WAN1). Menor latência pura, ideal para PC Gamer, consoles e transmissões sem oscilação.' }
			];
			if (activeWans.length > 1) {
				activeWans.forEach(function(w){
					if (w.iface !== 'wan' && w.iface !== 'wan1') {
						wanRouteButtons.push({
							id: w.iface,
							label: '🌐 Forçar ' + w.label,
							desc: 'Todo o tráfego deste dispositivo sairá exclusivamente pela conexão ' + w.label + '.'
						});
					}
				});
			}
			const wanDescBox = E('div', { class: 'ex-priority-desc-box', style: 'margin-top:6px;' });
			const wanBtnList = [];
			const updateWanRouteSelection = function(newId) {
				selectedWanRoute = newId;
				wanBtnList.forEach(function(item) {
					item.btn.classList.toggle('active', item.id === newId);
				});
				const matched = wanRouteButtons.find(function(p){ return p.id === newId; }) || wanRouteButtons[0];
				wanDescBox.innerHTML = '';
				wanDescBox.appendChild(E('p', { class: 'ex-priority-desc-text' }, [ matched.desc ]));
				if (newId === 'wan') {
					wanDescBox.appendChild(E('small', { class: 'alert-message notice', style: 'margin-top:8px;display:block;padding:8px 10px;border-radius:8px;font-size:0.8rem;' }, [
						'🎯 Rota Gamer Direta: Este aparelho sai direto pela Fibra com a menor latência possível (sem passar por balanceamento ou VPNs).'
					]));
				}
			};
			const wanRouteGrid = E('div', { class: 'ex-priority-button-grid' });
			wanRouteButtons.forEach(function(item) {
				const b = E('button', {
					type: 'button',
					class: 'ex-priority-option-btn' + (item.id === selectedWanRoute ? ' active' : ''),
					click: function() { updateWanRouteSelection(item.id); }
				}, [ item.label ]);
				wanBtnList.push({ id: item.id, btn: b });
				wanRouteGrid.appendChild(b);
			});
			updateWanRouteSelection(selectedWanRoute);

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['Rota de Saída de Internet (Policy Routing)']),
				E('small', { class: 'ex-muted', style: 'display:block;margin-top:2px;' }, ['Escolha por qual link de internet este dispositivo deve sair:']),
				wanRouteGrid,
				wanDescBox
			]));

			let limitEnabled = !!state.limit_enabled;
			let limitDown = Number(state.limit_down) || 0;
			let limitUp = Number(state.limit_up) || 0;

			const downInput = E('input', {
				type: 'number',
				min: '0',
				max: '1000',
				step: '1',
				value: limitDown ? String(limitDown) : '',
				placeholder: '0 = Ilimitado',
				class: 'cbi-input-text',
				style: 'width: 100%; box-sizing: border-box;'
			});

			const upInput = E('input', {
				type: 'number',
				min: '0',
				max: '1000',
				step: '1',
				value: limitUp ? String(limitUp) : '',
				placeholder: '0 = Ilimitado',
				class: 'cbi-input-text',
				style: 'width: 100%; box-sizing: border-box;'
			});

			const limitToggle = E('input', {
				type: 'checkbox',
				checked: limitEnabled ? '' : null,
				style: 'width: 20px; height: 20px; cursor: pointer;'
			});
			limitToggle.checked = !!limitEnabled;

			const limitPresets = [
				{ label: '♾️ Ilimitado', down: 0, up: 0 },
				{ label: '📱 10M / 2M', down: 10, up: 2 },
				{ label: '📺 25M / 5M', down: 25, up: 5 },
				{ label: '🚀 50M / 10M', down: 50, up: 10 },
				{ label: '⚡ 100M / 20M', down: 100, up: 20 }
			];

			const limitFieldsRow = E('div', {
				class: 'ex-grid ex-grid-2',
				style: 'margin-top: 10px; gap: 10px; display: ' + (limitEnabled ? 'grid' : 'none') + ';'
			}, [
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('span', {}, ['↓ Limite Download (Mbps):']),
					downInput
				]),
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('span', {}, ['↑ Limite Upload (Mbps):']),
					upInput
				])
			]);

			let limitLanBypass = (state.limit_lan_bypass == null || state.limit_lan_bypass === true || state.limit_lan_bypass === '1' || state.limit_lan_bypass === 1);
			const lanBypassToggle = E('input', {
				type: 'checkbox',
				checked: limitLanBypass ? '' : null
			});
			lanBypassToggle.checked = !!limitLanBypass;

			const lanBypassStatusPill = E('span', {
				class: 'ex-pill ok',
				style: 'font-size: 0.72rem; padding: 2px 8px; font-weight: 600;'
			});

			const lanBypassDescText = E('div', {
				style: 'font-size: 0.77rem; line-height: 1.35; margin-top: 6px;'
			});

			const updateLanBypassUI = function() {
				if (lanBypassToggle.checked) {
					limitLanBypassBlock.style.background = 'rgba(56,189,248,.08)';
					limitLanBypassBlock.style.borderColor = 'rgba(56,189,248,.25)';
					lanBypassStatusPill.className = 'ex-pill ok';
					lanBypassStatusPill.textContent = '✓ Rede Local Liberada (Recomendado)';
					lanBypassDescText.style.color = '#cbd5e1';
					lanBypassDescText.textContent = 'O limite se aplica estritamente à Internet. Transferências para computadores da casa, impressoras, servidores locais e NAS continuam em velocidade máxima da LAN (Gigabit / Wi-Fi 6).';
				} else {
					limitLanBypassBlock.style.background = 'rgba(245,158,11,.08)';
					limitLanBypassBlock.style.borderColor = 'rgba(245,158,11,.3)';
					lanBypassStatusPill.className = 'ex-pill warning';
					lanBypassStatusPill.textContent = '⚠️ Intranet Limitada';
					lanBypassDescText.style.color = '#fef08a';
					lanBypassDescText.textContent = 'Atenção: O limite de velocidade também será aplicado ao tráfego interno (LAN / Wi-Fi). Transferências de arquivos entre PCs, streaming local ou backups para NAS serão reduzidos a esta velocidade.';
				}
			};

			const limitLanBypassBlock = E('div', {
				style: 'margin-top: 10px; padding: 10px 12px; border-radius: 8px; border: 1px solid; transition: all .2s ease; display: ' + (limitEnabled ? 'block' : 'none') + ';'
			}, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
					E('div', { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' }, [
						E('strong', { style: 'font-size: 0.82rem; color: #f8fafc;' }, ['⚡ Bypass de Rede Local']),
						lanBypassStatusPill
					]),
					E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
						lanBypassToggle,
						E('span', { class: 'ex-switch-slider' })
					])
				]),
				lanBypassDescText
			]);

			lanBypassToggle.addEventListener('change', updateLanBypassUI);
			updateLanBypassUI();

			const presetBtnList = [];
			const updatePresetActive = function() {
				const curDown = Number(downInput.value) || 0;
				const curUp = Number(upInput.value) || 0;
				const isOff = !limitToggle.checked || (curDown === 0 && curUp === 0);
				presetBtnList.forEach(function(p) {
					if (p.preset.down === 0 && p.preset.up === 0) {
						p.btn.classList.toggle('active', isOff);
					} else {
						p.btn.classList.toggle('active', !isOff && p.preset.down === curDown && p.preset.up === curUp);
					}
				});
				limitFieldsRow.style.display = limitToggle.checked ? 'grid' : 'none';
				limitLanBypassBlock.style.display = limitToggle.checked ? 'block' : 'none';
			};

			const limitPresetGrid = E('div', { class: 'ex-priority-button-grid', style: 'margin-top: 8px;' });
			limitPresets.forEach(function(preset) {
				const b = E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					click: function() {
						if (preset.down === 0 && preset.up === 0) {
							limitToggle.checked = false;
							downInput.value = '';
							upInput.value = '';
						} else {
							limitToggle.checked = true;
							downInput.value = preset.down;
							upInput.value = preset.up;
						}
						updatePresetActive();
					}
				}, [ preset.label ]);
				presetBtnList.push({ preset: preset, btn: b });
				limitPresetGrid.appendChild(b);
			});

			limitToggle.addEventListener('change', updatePresetActive);
			downInput.addEventListener('input', updatePresetActive);
			downInput.addEventListener('change', updatePresetActive);
			upInput.addEventListener('input', updatePresetActive);
			upInput.addEventListener('change', updatePresetActive);
			updatePresetActive();

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px;' }, [
					E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
						E('strong', {}, ['Limite de Banda Individual']),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Restrinja a velocidade máxima de download e upload deste aparelho:'])
					]),
					E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
						limitToggle,
						E('span', { class: 'ex-switch-slider' })
					])
				]),
				limitPresetGrid,
				limitFieldsRow,
				limitLanBypassBlock
			]));

			// --- Seção: Protocolo de Internet / IPv6 Individual ---
			let ipv6Allowed = (state.ipv6_allowed === true || state.ipv6_allowed === '1' || state.ipv6_allowed === 1);
			const ipv6BtnDual = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (ipv6Allowed ? ' active' : ''),
				style: 'flex: 1; min-height: 40px; font-weight: 700;',
				click: function() { setIpv6Mode(true); }
			}, [ '⚡ Pilha Dupla (IPv4 + IPv6)' ]);

			const ipv6BtnBlocked = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (!ipv6Allowed ? ' active' : ''),
				style: 'flex: 1; min-height: 40px; font-weight: 700;',
				click: function() { setIpv6Mode(false); }
			}, [ '🚫 IPv4 Puro (Bloquear IPv6)' ]);

			const ipv6StatusPill = E('span', {
				class: 'ex-pill ' + (ipv6Allowed ? 'online' : 'warning'),
				style: 'font-size: 0.72rem; padding: 2px 8px; font-weight: 600;'
			});

			const ipv6DescText = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 6px; line-height: 1.4;' });

			const setIpv6Mode = function(allowed) {
				ipv6Allowed = !!allowed;
				ipv6BtnDual.classList.toggle('active', ipv6Allowed);
				ipv6BtnBlocked.classList.toggle('active', !ipv6Allowed);
				if (ipv6Allowed) {
					ipv6StatusPill.className = 'ex-pill online';
					ipv6StatusPill.textContent = '⚡ PILHA DUPLA (LIBERADO)';
					ipv6DescText.textContent = 'Este aparelho navega livremente com IPv4 e IPv6 em simultâneo. Recomendado para PCs Gamers, consoles e celulares.';
				} else {
					ipv6StatusPill.className = 'ex-pill warning';
					ipv6StatusPill.textContent = '🚫 BLOQUEIO ATIVO (IPv4 PURO)';
					ipv6DescText.textContent = 'O firewall do roteador bloqueia 100% do tráfego IPv6 para este aparelho. Ele operará exclusivamente em IPv4 puro (ideal para TV Box, UniTV, IPTV e saídas dedicadas por WAN2).';
				}
			};
			setIpv6Mode(ipv6Allowed);

			const ipv6ButtonGroup = E('div', {
				class: 'ex-priority-button-grid',
				style: 'margin-top: 8px; display: flex; gap: 8px; flex-wrap: wrap;'
			}, [
				ipv6BtnDual,
				ipv6BtnBlocked
			]);

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;' }, [
					E('strong', {}, ['🌐 Protocolo de Internet Deste Aparelho (IPv4 / IPv6)']),
					ipv6StatusPill
				]),
				ipv6ButtonGroup,
				ipv6DescText
			]));

			// --- Seção: Controle Parental & Filtros Deste Aparelho ---
			let parentalMode = state.parental_mode || 'default';
			if (parentalMode !== 'custom' && parentalMode !== 'bypass') parentalMode = 'default';
			const parBlockToggle = E('input', { type: 'checkbox' });
			parBlockToggle.checked = !!state.parental_block;

			const safeSearchToggle = E('input', { type: 'checkbox' });
			safeSearchToggle.checked = !!state.safesearch;

			const hasAgh = !!state.adguard_installed;
			const initialBlocked = (state.blocked_services || '').split(',').map(function(s){ return s.trim().toLowerCase(); }).filter(Boolean);
			const selectedServices = new Set(initialBlocked);

			const serviceOptions = [
				{ id: 'tiktok', name: 'TikTok', icon: '🎵' },
				{ id: 'instagram', name: 'Instagram', icon: '📸' },
				{ id: 'youtube', name: 'YouTube', icon: '▶️' },
				{ id: 'discord', name: 'Discord', icon: '💬' },
				{ id: 'roblox', name: 'Roblox', icon: '🎮' }
			];

			const parModeDefaultBtn = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (parentalMode === 'default' ? ' active' : ''),
				click: function() { updateParentalModeUI('default'); }
			}, [ '🌐 Padrão da Rede' ]);

			const parModeBypassBtn = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (parentalMode === 'bypass' ? ' active' : ''),
				click: function() { updateParentalModeUI('bypass'); }
			}, [ '⚡ Bypass (Sem Bloqueio)' ]);

			const parModeCustomBtn = E('button', {
				type: 'button',
				class: 'ex-priority-option-btn' + (parentalMode === 'custom' ? ' active' : ''),
				click: function() { updateParentalModeUI('custom'); }
			}, [ '🛡️ Filtro Individual' ]);

			const parDetailContainer = E('div', { style: 'margin-top: 10px;' });

			const makeSimpleToggleRow = function(title, desc, input) {
				return E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 10px; background: rgba(255,255,255,.025); border-radius: 8px; margin-top: 6px;' }, [
					E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
						E('strong', { style: 'font-size: 0.85rem; display: block;' }, [title]),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px; line-height: 1.3;' }, [desc])
					]),
					E('label', { class: 'ex-switch', style: 'flex: 0 0 auto;' }, [
						input,
						E('span', { class: 'ex-switch-slider' })
					])
				]);
			};

			const rowParBlock = makeSimpleToggleRow(
				'🔞 Bloquear Conteúdo Adulto / Pornografia',
				'Bloqueia sites pornográficos e explícitos exclusivamente para este aparelho.',
				parBlockToggle
			);

			const rowSafeSearch = makeSimpleToggleRow(
				'🔍 Forçar Busca Segura (SafeSearch)',
				'Obriga o filtro de família no Google, Bing e YouTube para proteger crianças.',
				safeSearchToggle
			);

			const servicesWrap = E('div', { style: 'margin-top: 10px; padding: 12px; background: rgba(255,255,255,.025); border-radius: 9px; border: 1px solid rgba(127,127,127,.12);' });
			servicesWrap.appendChild(E('strong', { style: 'font-size: 0.85rem; display: block; margin-bottom: 8px;' }, ['🚫 Bloqueio de Apps e Serviços:']));
			const chipsRow = E('div', { style: 'display: flex; flex-wrap: wrap; gap: 8px;' });

			serviceOptions.forEach(function(opt) {
				const isChecked = selectedServices.has(opt.id);
				const renderChip = function(btn, checked) {
					btn.replaceChildren();
					if (checked) {
						btn.appendChild(E('span', { class: 'ex-chip-icon' }, ['🚫']));
						btn.appendChild(E('span', { class: 'ex-chip-name' }, [opt.name]));
						btn.appendChild(E('span', { class: 'ex-chip-status' }, ['BLOQUEADO']));
					} else {
						btn.appendChild(E('span', { class: 'ex-chip-icon' }, [opt.icon]));
						btn.appendChild(E('span', { class: 'ex-chip-name' }, [opt.name]));
					}
				};
				const chip = E('button', {
					type: 'button',
					class: 'ex-service-chip' + (isChecked ? ' active' : ''),
					title: isChecked ? 'Clique para liberar o ' + opt.name : 'Clique para bloquear o ' + opt.name,
					click: function() {
						const nowChecked = !selectedServices.has(opt.id);
						if (nowChecked) {
							selectedServices.add(opt.id);
							chip.classList.add('active');
							chip.title = 'Clique para liberar o ' + opt.name;
						} else {
							selectedServices.delete(opt.id);
							chip.classList.remove('active');
							chip.title = 'Clique para bloquear o ' + opt.name;
						}
						renderChip(chip, nowChecked);
					}
				});
				renderChip(chip, isChecked);
				chipsRow.appendChild(chip);
			});
			servicesWrap.appendChild(chipsRow);

			const updateParentalModeUI = function(mode) {
				parentalMode = mode;
				parModeDefaultBtn.classList.toggle('active', parentalMode === 'default');
				parModeBypassBtn.classList.toggle('active', parentalMode === 'bypass');
				parModeCustomBtn.classList.toggle('active', parentalMode === 'custom');
				parDetailContainer.innerHTML = '';

				if (parentalMode === 'custom') {
					parDetailContainer.appendChild(rowParBlock);
					parDetailContainer.appendChild(rowSafeSearch);
					if (hasAgh) {
						parDetailContainer.appendChild(servicesWrap);
					}
				} else if (parentalMode === 'bypass') {
					parDetailContainer.appendChild(E('div', { style: 'margin-top: 6px; padding: 10px 12px; background: rgba(59,130,246,.08); border-radius: 8px; border: 1px solid rgba(59,130,246,.25);' }, [
						E('strong', { style: 'font-size: 0.85rem; color: #60a5fa; display: flex; align-items: center; gap: 6px;' }, [
							'⚡ Modo Direto sem Filtragem (Bypass)'
						]),
						E('p', { class: 'ex-muted', style: 'margin: 6px 0 0; font-size: 0.82rem; line-height: 1.4;' }, [
							'Este aparelho terá tráfego DNS liberado direto para a Internet, contornando o AdGuard Home e qualquer bloqueio ou filtro parental da rede local. Totalmente compatível com DNS manual ou personalizado.'
						])
					]));
				} else {
					parDetailContainer.appendChild(E('p', { class: 'ex-muted', style: 'margin: 6px 0 0; font-size: 0.82rem; line-height: 1.4;' }, [
						'Este aparelho segue as proteções gerais configuradas no painel principal do roteador. Nenhuma restrição ou filtro exclusivo será imposto a ele.'
					]));
				}
			};

			updateParentalModeUI(parentalMode);

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('div', { style: 'display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px;' }, [
					E('div', { style: 'flex: 1 1 auto; min-width: 0;' }, [
						E('strong', {}, ['🛡️ Controle Parental & Filtros Deste Aparelho']),
						E('small', { class: 'ex-muted', style: 'display: block; margin-top: 2px;' }, ['Defina regras individuais de proteção e restrição para este dispositivo:'])
					])
				]),
				E('div', { class: 'ex-priority-button-grid' }, [
					parModeDefaultBtn,
					parModeBypassBtn,
					parModeCustomBtn
				]),
				parDetailContainer
			]));
			// --- Seção: Servidor DNS Deste Aparelho (DHCP Opção 6) ---
			let curCustomDns = (state.custom_dns || '').trim();
			const customDnsInput = E('input', {
				type: 'text',
				class: 'cbi-input-text',
				value: curCustomDns,
				placeholder: 'Padrão da rede (vazio) ou ex.: 8.8.8.8, 8.8.4.4',
				style: 'width: 100%; box-sizing: border-box;'
			});

			const dnsPresets = [
				{ label: '🌐 Padrão da Rede', val: '' },
				{ label: '⚡ Google (8.8.8.8)', val: '8.8.8.8, 8.8.4.4' },
				{ label: '🛡️ Cloudflare (1.1.1.1)', val: '1.1.1.1, 1.0.0.1' },
				{ label: '🔒 Quad9 (9.9.9.9)', val: '9.9.9.9, 149.112.112.112' },
				{ label: '🚫 AdGuard DNS', val: '94.140.14.14, 94.140.15.15' }
			];

			const dnsPresetBtnList = [];
			const updateDnsPresetActive = function() {
				const curVal = customDnsInput.value.replace(/\s+/g, '');
				dnsPresetBtnList.forEach(function(p) {
					const pVal = p.val.replace(/\s+/g, '');
					if (!pVal) {
						p.btn.classList.toggle('active', !curVal);
					} else {
						p.btn.classList.toggle('active', curVal === pVal || curVal === pVal.split(',')[0]);
					}
				});
			};

			const dnsPresetGrid = E('div', { class: 'ex-priority-button-grid', style: 'margin-bottom: 8px;' });
			dnsPresets.forEach(function(p) {
				const b = E('button', {
					type: 'button',
					class: 'ex-priority-option-btn',
					click: function() {
						customDnsInput.value = p.val;
						updateDnsPresetActive();
					}
				}, [ p.label ]);
				dnsPresetBtnList.push({ val: p.val, btn: b });
				dnsPresetGrid.appendChild(b);
			});

			customDnsInput.addEventListener('input', updateDnsPresetActive);
			customDnsInput.addEventListener('change', updateDnsPresetActive);
			updateDnsPresetActive();

			let isDmz = !!state.dmz;
			const dmzToggle = E('input', {
				type: 'checkbox',
				checked: isDmz ? '' : null,
				'aria-label': 'Ativar DMZ para este dispositivo'
			});
			const dmzSummaryEl = E('small', { class: 'ex-muted', style: 'display: block; margin-top: 3px; font-size: 0.8rem; line-height: 1.35;' }, [
				isDmz
					? '⚡ Este aparelho é a DMZ ativa da rede. Todas as portas não solicitadas da WAN vão para ele (NAT Aberto).'
					: 'Desativado. O firewall bloqueia portas não solicitadas para este aparelho.'
			]);
			dmzToggle.addEventListener('change', function(ev) {
				if (ev.currentTarget.checked) {
					dmzSummaryEl.textContent = '⚡ DMZ será ativada para este aparelho ao salvar. Se o IP não estiver reservado, o ARK Router reservará automaticamente.';
					if (!isReserved) {
						updateReserveMode(true);
					}
				} else {
					dmzSummaryEl.textContent = 'Desativado. O firewall protegerá as portas deste aparelho.';
				}
			});

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('div', { style: 'display:flex; align-items:center; justify-content:space-between; gap:12px;' }, [
					E('div', {}, [
						E('div', { style: 'display:flex; align-items:center; gap:8px;' }, [
							E('strong', {}, ['🎯 Zona Desmilitarizada (DMZ / Host Aberto)']),
							isDmz ? E('span', { class: 'ex-pill online', style: 'font-size:0.72rem;' }, ['DMZ ATUAL']) : ''
						]),
						dmzSummaryEl
					]),
					E('label', { class: 'ex-switch' }, [
						dmzToggle,
						E('span', { class: 'ex-switch-slider' })
					])
				]),
				E('p', { class: 'ex-muted', style: 'margin: 6px 0 0; font-size: 0.78rem; line-height: 1.3;' }, [
					'🎮 Ideal para Consoles (PS5, Xbox, Switch) e PC Gamer para eliminar NAT Restrito/Moderado. Apenas um aparelho por vez pode ser o DMZ da rede.'
				])
			]));

			sections.push(E('div', { class: 'ex-device-config-block' }, [
				E('strong', {}, ['🌐 Servidor DNS Deste Aparelho (DHCP Opção 6)']),
				E('small', { class: 'ex-muted', style: 'display: block; margin: 2px 0 8px;' }, [
					'Envie um DNS exclusivo diretamente para este dispositivo via DHCP. Ele falará direto com os servidores sem intermediários:'
				]),
				dnsPresetGrid,
				E('label', { style: 'display: flex; flex-direction: column; gap: 4px; font-weight: 600;' }, [
					E('span', {}, ['Endereço(s) DNS personalizado(s):']),
					customDnsInput
				]),
				E('p', { class: 'ex-muted', style: 'margin: 6px 0 0; font-size: 0.8rem; line-height: 1.35;' }, [
					'💡 Dica: Se preenchido, o roteador avisa este aparelho para consultar o DNS escolhido. Caso o aparelho já tenha DNS fixo manual (ex.: 8.8.8.8 na TV), o roteador respeita e dá passagem livre automática.'
				])
			]));


			sections.push(E('div',{class:'right'},[E('button',{class:'btn cbi-button cbi-button-neutral','click':closeModal},['Cancelar']),' ',E('button',{class:'btn cbi-button cbi-button-positive','click':L.bind(function(ev){
				const btn = ev.currentTarget;
				btn.disabled = true;
				btn.textContent = 'Salvando…';
				const prioEnabled = (selectedPriority !== 'none') ? '1' : '0';
				const dscpVal = (selectedPriority === 'video') ? 'AF31' : 'AF41';
				const finalIp = isReserved ? ipInput.value.trim() : (device.ip || state.ip || '');
				const limEnabled = limitToggle.checked ? '1' : '0';
				const limDown = limitToggle.checked ? (Math.round(Number(downInput.value)) || 0) : 0;
				const limUp = limitToggle.checked ? (Math.round(Number(upInput.value)) || 0) : 0;
				const parBlockVal = (parentalMode === 'custom' && parBlockToggle.checked) ? '1' : '0';
				const safeSearchVal = (parentalMode === 'custom' && safeSearchToggle.checked) ? '1' : '0';
				const servList = (parentalMode === 'custom' && hasAgh) ? Array.from(selectedServices).join(',') : '';
				const limLanBypass = lanBypassToggle.checked ? '1' : '0';
				const ipv6AllowedVal = ipv6Allowed ? '1' : '0';
				const customDnsVal = customDnsInput.value.trim();
				const dmzVal = dmzToggle.checked ? '1' : '0';
				const args=['device-save',device.mac,name.value.trim(),isReserved?'reserved':'automatic',finalIp,prioEnabled,dscpVal,selectedWanRoute,limEnabled,String(limDown),String(limUp),parentalMode,parBlockVal,safeSearchVal,servList,limLanBypass,ipv6AllowedVal,customDnsVal,dmzVal];
				return fs.exec('/usr/sbin/equipe-dashboard-control',args).then(L.bind(function(r){
					if(r.code)throw new Error(r.stderr||'Falha ao salvar');
					ui.hideModal();
					ui.addNotification(null,E('p',{},['Configurações do dispositivo salvas.']));
					this.forceDeviceReorder = true;
					return this.fetchData().then(L.bind(this.update,this));
				},this)).catch(function(e){btn.disabled = false; btn.textContent = 'Salvar configurações'; if(reloadAfterExpectedDisconnect(e,'Comando enviado. O painel perdeu a resposta enquanto o roteador reinicia serviços. Recarregando…',4200))return;ui.addNotification(null,E('p',{},[e.message]),'danger');});
			},this)},['Salvar configurações'])]));
			ui.showModal('Configurar dispositivo',sections);name.focus();
		},this)).catch(function(e){ui.hideModal();ui.addNotification(null,E('p',{},[e.message]),'danger');});
	}
};
