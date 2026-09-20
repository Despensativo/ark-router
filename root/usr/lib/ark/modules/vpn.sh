#!/bin/sh
# /usr/lib/ark/modules/vpn.sh - WireGuard, Tailscale & ZeroTier VPN Module
# Compatible with BusyBox /bin/ash, OpenWrt 19.07 to 25.12

[ -z "${_ARK_VPN_SH_LOADED:-}" ] || return 0
_ARK_VPN_SH_LOADED=1

[ -n "${ARK_LIB_DIR:-}" ] || ARK_LIB_DIR="/usr/lib/ark"
. "${ARK_LIB_DIR}/common.sh"
. "${ARK_LIB_DIR}/logging.sh"
. "${ARK_LIB_DIR}/validation.sh"

tailscale_lan_cidr() {
	ipaddr="$(uci -q get network.lan.ipaddr || true)"
	netmask="$(uci -q get network.lan.netmask || printf 255.255.255.0)"
	[ -n "$ipaddr" ] || return 1
	if command -v ipcalc.sh >/dev/null 2>&1; then
		eval "$(ipcalc.sh "$ipaddr" "$netmask" 2>/dev/null)"
		[ -n "$NETWORK" ] && [ -n "$PREFIX" ] && { printf '%s/%s' "$NETWORK" "$PREFIX"; return 0; }
	fi
	case "$netmask" in
		255.255.255.0) prefix=24 ;;
		255.255.0.0) prefix=16 ;;
		255.0.0.0) prefix=8 ;;
		255.255.255.128) prefix=25 ;;
		255.255.255.192) prefix=26 ;;
		255.255.255.224) prefix=27 ;;
		255.255.255.240) prefix=28 ;;
		*) prefix=24 ;;
	esac
	network="$(printf '%s' "$ipaddr" | awk -F. -v p="$prefix" '{
		if(p==8) printf "%s.0.0.0",$1;
		else if(p==16) printf "%s.%s.0.0",$1,$2;
		else printf "%s.%s.%s.0",$1,$2,$3;
	}')"
	printf '%s/%s' "$network" "$prefix"
}

tailscale_state_json() {
	if ! command -v tailscale >/dev/null 2>&1; then
		printf '{"installed":false,"active":false,"logged_in":false,"ip":"—","hostname":"—","lan_cidr":"%s"}\n' "$(json_escape "$(tailscale_lan_cidr 2>/dev/null || true)")"
		return 0
	fi
	active=false; logged=false; ip=''; hostname=''
	status="$(tailscale status --json 2>/dev/null || true)"
	backend="$(printf '%s' "$status" | jsonfilter -e '@.BackendState' 2>/dev/null || true)"
	ip="$(printf '%s' "$status" | jsonfilter -e '@.Self.TailscaleIPs[0]' 2>/dev/null || true)"
	hostname="$(printf '%s' "$status" | jsonfilter -e '@.Self.HostName' 2>/dev/null || true)"
	case "$backend" in Running) active=true; logged=true ;; Stopped|NeedsLogin|NoState|Starting|'') active=false ;; *) active=true ;; esac
	[ -n "$ip" ] && logged=true
		printf '{"installed":true,"active":%s,"logged_in":%s,"backend":"%s","ip":"%s","hostname":"%s","lan_cidr":"%s"}\n' \
		"$active" "$logged" "$(json_escape "$backend")" "$(json_escape "${ip:-—}")" "$(json_escape "${hostname:-—}")" "$(json_escape "$(tailscale_lan_cidr 2>/dev/null || true)")"
}

tailscale_firewall_prepare() {
	zone="$(uci -q show firewall 2>/dev/null | awk -F= "/\\.name='tailscale'/{s=\$1; sub(/^firewall\\./,\"\",s); sub(/\\.name$/, \"\", s); print s; exit}")"
	if [ -z "$zone" ]; then
		zone="$(uci -q add firewall zone)"
		uci -q set "firewall.$zone.name=tailscale"
	fi
	uci -q set "firewall.$zone.input=ACCEPT"
	uci -q set "firewall.$zone.output=ACCEPT"
	uci -q set "firewall.$zone.forward=ACCEPT"
	uci -q delete "firewall.$zone.network"
	uci -q delete "firewall.$zone.device"
	uci -q add_list "firewall.$zone.device=tailscale0"
	if ! speedify_firewall_forwarding_exists tailscale lan; then
		fwd="$(uci -q add firewall forwarding)"
		uci -q set "firewall.$fwd.src=tailscale"
		uci -q set "firewall.$fwd.dest=lan"
	fi
	uci commit firewall
	/etc/init.d/firewall reload >/dev/null 2>&1 || true
}

tailscale_install() {
	command -v tailscale >/dev/null 2>&1 && return 0
	command -v apk >/dev/null 2>&1 || command -v opkg >/dev/null 2>&1 || { echo 'Gerenciador de pacotes indisponivel' >&2; return 3; }
	if command -v apk >/dev/null 2>&1; then
		apk update && apk add tailscale
	else
		opkg update && opkg install tailscale
	fi
	command -v tailscale >/dev/null 2>&1 || { echo 'Tailscale instalado parcialmente ou indisponivel neste firmware.' >&2; return 1; }
	[ -x /etc/init.d/tailscale ] && { /etc/init.d/tailscale enable >/dev/null 2>&1 || true; /etc/init.d/tailscale start >/dev/null 2>&1 || true; }
	tailscale_firewall_prepare
	return 0
}

tailscale_up_lan() {
	command -v tailscale >/dev/null 2>&1 || { echo 'Tailscale nao instalado' >&2; return 3; }
	[ -x /etc/init.d/tailscale ] && { /etc/init.d/tailscale enable >/dev/null 2>&1 || true; /etc/init.d/tailscale start >/dev/null 2>&1 || true; }
	tailscale_firewall_prepare
	cidr="$(tailscale_lan_cidr)" || { echo 'LAN sem IP valido para anunciar rota' >&2; return 3; }
	tmp="/tmp/ark-tailscale-up.$$"
	tailscale up --advertise-routes="$cidr" --accept-dns=false >"$tmp" 2>&1 &
	pid="$!"
	i=0
	while kill -0 "$pid" 2>/dev/null; do
		grep -Eq 'https://(login\.)?tailscale\.com/a/[^[:space:]]+' "$tmp" 2>/dev/null && break
		[ "$i" -ge 25 ] && break
		sleep 1
		i=$((i+1))
	done
	if kill -0 "$pid" 2>/dev/null; then
		kill "$pid" 2>/dev/null || true
		wait "$pid" 2>/dev/null
		rc=124
	else
		wait "$pid"; rc=$?
	fi
	out="$(cat "$tmp" 2>/dev/null || true)"
	rm -f "$tmp"
	uci -q set equipe_dashboard.tailscale=feature
	uci -q set equipe_dashboard.tailscale.lan_cidr="$cidr"
	uci commit equipe_dashboard
	url="$(printf '%s' "$out" | grep -Eo 'https://(login\.)?tailscale\.com/a/[^[:space:]]+' | head -n1)"
	[ "$rc" -eq 0 ] || [ "$rc" -eq 124 ] || [ -n "$url" ] || { printf '%s\n' "$out" >&2; return "$rc"; }
	printf '{"ok":%s,"lan_cidr":"%s","login_url":"%s","message":"%s"}\n' "$(bool $((rc == 0)))" "$(json_escape "$cidr")" "$(json_escape "$url")" "$(json_escape "$out")"
}

tailscale_down() {
	command -v tailscale >/dev/null 2>&1 || return 0
	tailscale down
}

zerotier_device_name() {
	ztdev=""
	if command -v zerotier-cli >/dev/null 2>&1; then
		ztdev="$(zerotier-cli -j listnetworks 2>/dev/null | jsonfilter -e '@[0].portDeviceName' 2>/dev/null)"
	fi
	if [ -z "$ztdev" ] || [ "$ztdev" = "-" ]; then
		ztdev="$(ip -o link show 2>/dev/null | awk -F': ' '/: zt/{print $2; exit}' | cut -d@ -f1)"
	fi
	if [ -z "$ztdev" ] || [ "$ztdev" = "-" ]; then
		ztdev="$(zerotier-cli listnetworks 2>/dev/null | awk 'NR>1 {for(i=1;i<=NF;i++) if($i ~ /^zt/) {print $i; exit}}')"
	fi
	case "$ztdev" in ''|'-') ztdev='' ;; esac
	printf '%s' "$ztdev"
}

zerotier_firewall_prepare() {
	ztdev="$(zerotier_device_name)"
	uci -q delete network.zerotier
	uci commit network
	uci -q set firewall.zerotier=zone
	uci -q set firewall.zerotier.name=zerotier
	uci -q set firewall.zerotier.input=REJECT
	uci -q set firewall.zerotier.output=ACCEPT
	uci -q set firewall.zerotier.forward=ACCEPT
	uci -q delete firewall.zerotier.device
	uci -q delete firewall.zerotier.network
	[ -n "$ztdev" ] && uci -q add_list "firewall.zerotier.device=$ztdev"
	uci -q set firewall.zt_to_lan=forwarding
	uci -q set firewall.zt_to_lan.src=zerotier
	uci -q set firewall.zt_to_lan.dest=lan

	uci -q set firewall.zt_ssh=rule
	uci -q set firewall.zt_ssh.name='Allow-ZeroTier-SSH'
	uci -q set firewall.zt_ssh.src=zerotier
	uci -q set firewall.zt_ssh.proto=tcp
	uci -q set firewall.zt_ssh.dest_port='22'
	uci -q set firewall.zt_ssh.target=ACCEPT

	uci -q set firewall.zt_http=rule
	uci -q set firewall.zt_http.name='Allow-ZeroTier-HTTP-HTTPS'
	uci -q set firewall.zt_http.src=zerotier
	uci -q set firewall.zt_http.proto=tcp
	uci -q set firewall.zt_http.dest_port='80 443'
	uci -q set firewall.zt_http.target=ACCEPT

	uci -q set firewall.zt_ping=rule
	uci -q set firewall.zt_ping.name='Allow-ZeroTier-Ping'
	uci -q set firewall.zt_ping.src=zerotier
	uci -q set firewall.zt_ping.proto=icmp
	uci -q set firewall.zt_ping.target=ACCEPT

	uci commit firewall
	/etc/init.d/firewall reload >/dev/null 2>&1 || true
}

zerotier_current_ip() {
	zerotier-cli listnetworks 2>/dev/null | awk 'NR>1 {for(i=1;i<=NF;i++) if($i ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+\/[0-9]+$/) {split($i,a,"/"); print a[1]; exit}}'
}

configure_uhttpd_listeners() {
	uci -q delete uhttpd.main.listen_http
	uci -q delete uhttpd.main.listen_https
	uci -q add_list "uhttpd.main.listen_http=0.0.0.0:80"
	uci -q add_list "uhttpd.main.listen_https=0.0.0.0:443"
	uci -q add_list "uhttpd.main.listen_http=[::]:80" 2>/dev/null || true
	uci -q add_list "uhttpd.main.listen_https=[::]:443" 2>/dev/null || true
	uci -q set uhttpd.main.rfc1918_filter=0
	uci commit uhttpd
}

zerotier_configure_access() {
	configure_uhttpd_listeners
	for sec in $(uci -q show dropbear 2>/dev/null | grep '=dropbear$' | cut -d. -f2 | cut -d= -f1); do
		uci -q delete "dropbear.$sec.Interface" 2>/dev/null || true
	done
	uci commit dropbear 2>/dev/null || true
	/etc/init.d/dropbear restart >/dev/null 2>&1 || true
	/etc/init.d/uhttpd restart >/dev/null 2>&1 || true
}

zerotier_bind_uhttpd() {
	zerotier_configure_access
}

zerotier_late_bind_uhttpd() {
	(
		for delay in 3 8 15; do
			sleep "$delay"
			zerotier_firewall_prepare >/dev/null 2>&1 || true
		done
	) >/dev/null 2>&1 &
}

zerotier_ram_compress() {
	local overlay_total
	overlay_total="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $2}')"
	case "$overlay_total" in ''|*[!0-9]*) overlay_total=65536 ;; esac
	if [ "$overlay_total" -le 16384 ]; then
		if [ -f /rom/usr/lib/libstdc++.so.6.0.33 ] || [ -f /rom/usr/bin/zerotier-one ]; then
			rm -f /etc/ark-router/zerotier-pkg.tar.gz /etc/ark-router/zerotier-libs.tar.gz 2>/dev/null || true
			return 0
		fi
		if [ -f /etc/ark-router/zerotier-pkg.tar.gz ]; then
			if [ ! -f /tmp/usr/lib/libstdc++.so.6.0.33 ] || [ ! -f /tmp/usr/bin/zerotier-one ]; then
				mkdir -p /tmp
				tar -xzf /etc/ark-router/zerotier-pkg.tar.gz -C /tmp/ 2>/dev/null
			fi
			[ -e /usr/lib/libstdc++.so.6.0.33 ] || ln -sf /tmp/usr/lib/libstdc++.so.6.0.33 /usr/lib/libstdc++.so.6.0.33
			[ -e /usr/lib/libstdc++.so.6 ] || ln -sf libstdc++.so.6.0.33 /usr/lib/libstdc++.so.6
			[ -e /usr/bin/zerotier-one ] || ln -sf /tmp/usr/bin/zerotier-one /usr/bin/zerotier-one
			chmod +x /tmp/usr/bin/zerotier-one 2>/dev/null || true
		elif [ -f /usr/lib/libstdc++.so.6.0.33 ] && [ ! -L /usr/lib/libstdc++.so.6.0.33 ]; then
			mkdir -p /etc/ark-router /tmp
			tar -czf /etc/ark-router/zerotier-pkg.tar.gz /usr/lib/libstdc++.so.6.0.33 /usr/bin/zerotier-one 2>/dev/null
			tar -xzf /etc/ark-router/zerotier-pkg.tar.gz -C /tmp/ 2>/dev/null
			rm -f /usr/lib/libstdc++.so.6.0.33 /usr/bin/zerotier-one /etc/ark-router/zerotier-libs.tar.gz 2>/dev/null || true
			ln -sf /tmp/usr/lib/libstdc++.so.6.0.33 /usr/lib/libstdc++.so.6.0.33
			ln -sf libstdc++.so.6.0.33 /usr/lib/libstdc++.so.6
			ln -sf /tmp/usr/bin/zerotier-one /usr/bin/zerotier-one
			chmod +x /tmp/usr/bin/zerotier-one 2>/dev/null || true
			[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram enable >/dev/null 2>&1 || true
		fi
	fi
}

zerotier_install() {
	command -v zerotier-cli >/dev/null 2>&1 && { zerotier_ram_compress; return 0; }
	command -v apk >/dev/null 2>&1 || command -v opkg >/dev/null 2>&1 || { echo 'Gerenciador de pacotes indisponivel' >&2; return 3; }
	if command -v apk >/dev/null 2>&1; then
		apk update && apk add zerotier
	else
		opkg update && opkg install zerotier
	fi
	zerotier_ram_compress
	command -v zerotier-cli >/dev/null 2>&1 || { echo 'ZeroTier indisponivel neste firmware.' >&2; return 1; }
}

zerotier_enable() {
	zerotier_install || return $?
	zerotier_ram_compress
	sec="$(uci -q show zerotier | grep '=zerotier' | head -n1 | cut -d. -f2 | cut -d= -f1)"
	[ -n "$sec" ] || sec="sample_config"
	for s in $(uci -q show zerotier | grep '=zerotier' | cut -d. -f2 | cut -d= -f1); do
		[ "$s" = "$sec" ] || uci -q delete "zerotier.$s"
	done
	uci -q set "zerotier.$sec=zerotier"
	uci -q set "zerotier.$sec.enabled=1"
	uci -q delete "zerotier.$sec.join" 2>/dev/null || true
	uci commit zerotier
	zerotier_firewall_prepare
	zt_auto="$(uci -q get equipe_dashboard.zerotier.autostart || true)"
	if [ "$zt_auto" != "0" ]; then
		[ -x /etc/init.d/ark-zerotier-ram ] && { /etc/init.d/ark-zerotier-ram enable >/dev/null 2>&1 || true; }
		[ -x /etc/init.d/zerotier ] && { /etc/init.d/zerotier enable >/dev/null 2>&1 || true; }
	else
		[ -x /etc/init.d/zerotier ] && /etc/init.d/zerotier disable >/dev/null 2>&1 || true
		[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram disable >/dev/null 2>&1 || true
		rm -f /etc/rc.d/S*zerotier* /etc/rc.d/K*zerotier* 2>/dev/null || true
	fi
	[ -x /etc/init.d/ark-zerotier-ram ] && { /etc/init.d/ark-zerotier-ram start >/dev/null 2>&1 || true; }
	killall -9 zerotier-one 2>/dev/null || true
	[ -x /etc/init.d/zerotier ] && { /etc/init.d/zerotier restart >/dev/null 2>&1 || true; }
	i=0
	while [ "$i" -lt 8 ]; do
		pidof zerotier-one >/dev/null 2>&1 && break
		sleep 1
		i=$((i+1))
	done
	zerotier_late_bind_uhttpd
	echo ok
}

zerotier_disable() {
	sec="$(uci -q show zerotier | grep '=zerotier' | head -n1 | cut -d. -f2 | cut -d= -f1)"
	[ -n "$sec" ] || sec="sample_config"
	uci -q set "zerotier.$sec.enabled=0"
	uci commit zerotier
	[ -x /etc/init.d/zerotier ] && {
		/etc/init.d/zerotier stop >/dev/null 2>&1 || true
		/etc/init.d/zerotier disable >/dev/null 2>&1 || true
	}
	killall -9 zerotier-one 2>/dev/null || true
	[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram disable >/dev/null 2>&1 || true
	rm -f /etc/rc.d/S*zerotier* /etc/rc.d/K*zerotier* 2>/dev/null || true
	ztdev="$(zerotier_device_name 2>/dev/null || true)"
	[ -n "$ztdev" ] && ip link set "$ztdev" down 2>/dev/null || true
	echo ok
}

valid_zerotier_network_id() { printf '%s' "$1" | grep -Eq '^[0-9a-fA-F]{16}$'; }

zerotier_join_network() {
	netid="$1"
	valid_zerotier_network_id "$netid" || { echo 'Network ID ZeroTier invalido. Use 16 caracteres hexadecimais.' >&2; return 2; }
	zerotier_enable || return $?
	sec="$(uci -q show zerotier | grep '=zerotier' | head -n1 | cut -d. -f2 | cut -d= -f1)"
	[ -n "$sec" ] || sec="sample_config"
	uci -q add_list "zerotier.$sec.join=$netid"
	uci -q set zerotier.ark=network
	uci -q set "zerotier.ark.id=$netid"
	uci -q set zerotier.ark.allow_managed=1
	uci -q set zerotier.ark.allow_global=0
	uci -q set zerotier.ark.allow_default=0
	uci -q set zerotier.ark.allow_dns=0
	uci commit zerotier
	if command -v zerotier-cli >/dev/null 2>&1; then
		zerotier-cli join "$netid" >/dev/null 2>&1 || true
	fi
	mkdir -p /var/lib/zerotier-one/networks.d 2>/dev/null || true
	touch "/var/lib/zerotier-one/networks.d/$netid.conf" 2>/dev/null || true
	[ -x /etc/init.d/zerotier ] && /etc/init.d/zerotier restart >/dev/null 2>&1 || true
	i=0
	while [ "$i" -lt 15 ]; do
		zerotier_current_ip >/dev/null 2>&1 && [ -n "$(zerotier_current_ip)" ] && break
		sleep 1
		i=$((i+1))
	done
	zerotier_firewall_prepare
	zerotier_configure_access
	zerotier_late_bind_uhttpd
	out="$(zerotier-cli listnetworks 2>&1 || true)"
	rc=0
	uci -q set equipe_dashboard.zerotier=feature
	uci -q set "equipe_dashboard.zerotier.network_id=$netid"
	uci commit equipe_dashboard
	[ "$rc" -eq 0 ] || { printf '%s\n' "$out" >&2; return "$rc"; }
	printf '{"network_id":"%s","message":"%s"}\n' "$(json_escape "$netid")" "$(json_escape "$out")"
}

zerotier_leave_network() {
	netid="$1"
	[ -n "$netid" ] || netid="$(uci -q get equipe_dashboard.zerotier.network_id || true)"
	valid_zerotier_network_id "$netid" || { echo 'Network ID ZeroTier invalido ou ausente.' >&2; return 2; }
	sec="$(uci -q show zerotier | grep '=zerotier' | head -n1 | cut -d. -f2 | cut -d= -f1)"
	[ -n "$sec" ] || sec="sample_config"
	uci -q del_list "zerotier.$sec.join=$netid" 2>/dev/null || true
	uci -q delete zerotier.ark
	uci commit zerotier
	command -v zerotier-cli >/dev/null 2>&1 && zerotier-cli leave "$netid" >/dev/null 2>&1 || true
	rm -f "/var/lib/zerotier-one/networks.d/$netid.conf" 2>/dev/null || true
	[ -x /etc/init.d/zerotier ] && /etc/init.d/zerotier restart >/dev/null 2>&1 || true
	uci -q delete equipe_dashboard.zerotier.network_id
	uci commit equipe_dashboard
	echo ok
}

zerotier_status_json() {
	installed_zt=false; [ -x /usr/sbin/zerotier-one ] || [ -x /usr/bin/zerotier-one ] || command -v zerotier-cli >/dev/null 2>&1 && installed_zt=true
	autostart=false
	zt_auto="$(uci -q get equipe_dashboard.zerotier.autostart || true)"
	if [ "$zt_auto" = "1" ]; then
		autostart=true
	elif [ "$zt_auto" = "0" ]; then
		autostart=false
	elif [ -x /etc/init.d/zerotier ] && /etc/init.d/zerotier enabled >/dev/null 2>&1; then
		autostart=true
	fi
	if ! $installed_zt; then
		printf '{"installed":false,"active":false,"online":false,"autostart":false,"node_id":"—","network_id":"","network_status":"—","ip":"—","lan_cidr":"—"}\n'
		return 0
	fi
	active=false
	pidof zerotier-one >/dev/null 2>&1 && active=true
	node=""
	online=false
	if command -v zerotier-cli >/dev/null 2>&1; then
		info="$(zerotier-cli info 2>/dev/null || true)"
		cli_node="$(printf '%s' "$info" | awk '{print $3}')"
		[ -n "$cli_node" ] && [ "$cli_node" != "—" ] && [ "$cli_node" != "{}" ] && node="$cli_node"
		printf '%s' "$info" | grep -q 'ONLINE' && online=true
	fi
	if [ -z "$node" ] || [ "$node" = "{}" ]; then
		for idf in /var/lib/zerotier-one/identity.public /var/lib/zerotier-one_*/identity.public /var/lib/zerotier-one/identity.secret /var/lib/zerotier-one_*/identity.secret; do
			[ -f "$idf" ] || continue
			node="$(cat "$idf" 2>/dev/null | cut -d: -f1)"
			[ -n "$node" ] && [ "$node" != "{}" ] && break
		done
	fi
	if [ -z "$node" ] || [ "$node" = "{}" ]; then
		sec="$(uci -q show zerotier | grep '=zerotier' | head -n1 | cut -d. -f2 | cut -d= -f1)"
		[ -n "$sec" ] && node="$(uci -q get "zerotier.$sec.secret" | cut -d: -f1 2>/dev/null || true)"
		[ -z "$node" ] && node="$(uci -q get zerotier.global.secret | cut -d: -f1 2>/dev/null || true)"
	fi
	[ -n "$node" ] && [ "$node" != "{}" ] || node="—"
	netid="$(uci -q get equipe_dashboard.zerotier.network_id || uci -q get zerotier.ark.id || true)"
	line=''
	if $active && command -v zerotier-cli >/dev/null 2>&1; then
		[ -n "$netid" ] && line="$(zerotier-cli listnetworks 2>/dev/null | awk -v n="$netid" '$3==n {print; exit}')"
		[ -z "$line" ] && line="$(zerotier-cli listnetworks 2>/dev/null | awk 'NR>1 {print; exit}')"
	fi
	if [ -n "$line" ]; then
		netid="$(printf '%s' "$line" | awk '{print $3}')"
		nstatus="$(printf '%s' "$line" | awk '{for(i=1;i<=NF;i++) if($i=="OK"||$i=="ACCESS_DENIED"||$i=="NOT_FOUND"||$i=="REQUESTING_CONFIGURATION"||$i=="PORT_ERROR") {print $i; exit}}')"
		ip="$(printf '%s' "$line" | grep -Eo '([0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]+' | head -n1)"
	else
		if $active; then nstatus='ONLINE (SEM REDE)'; else nstatus='DESLIGADO'; fi
		ip='—'
	fi
	printf '{"installed":true,"active":%s,"online":%s,"autostart":%s,"node_id":"%s","network_id":"%s","network_status":"%s","ip":"%s","lan_cidr":"%s"}\n' \
		"$active" "$online" "$autostart" "$(json_escape "${node:-—}")" "$(json_escape "$netid")" "$(json_escape "${nstatus:-—}")" "$(json_escape "${ip:-—}")" "$(json_escape "$(tailscale_lan_cidr 2>/dev/null || true)")"
}

zerotier_autostart_toggle() {
	val="${1:-1}"
	case "$val" in
		1|true|on)
			[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram enable >/dev/null 2>&1 || true
			[ -x /etc/init.d/zerotier ] && /etc/init.d/zerotier enable >/dev/null 2>&1 || true
			uci -q set equipe_dashboard.zerotier=feature
			uci -q set equipe_dashboard.zerotier.autostart='1'
			uci commit equipe_dashboard
			echo ok
			;;
		0|false|off)
			[ -x /etc/init.d/zerotier ] && /etc/init.d/zerotier disable >/dev/null 2>&1 || true
			[ -x /etc/init.d/ark-zerotier-ram ] && /etc/init.d/ark-zerotier-ram disable >/dev/null 2>&1 || true
			rm -f /etc/rc.d/S*zerotier* /etc/rc.d/K*zerotier* 2>/dev/null || true
			uci -q set equipe_dashboard.zerotier=feature
			uci -q set equipe_dashboard.zerotier.autostart='0'
			uci commit equipe_dashboard
			echo ok
			;;
	esac
}

wireguard_status_json() {
	installed_wg=false; ([ -x /usr/bin/wg ] || [ -f /lib/netifd/proto/wireguard.sh ]) && installed_wg=true
	autostart_wg=false; [ "$(uci -q get network.wg0.auto)" != "0" ] && autostart_wg=true
	configured_wg=false; [ -n "$(uci -q get network.wg0.proto)" ] && configured_wg=true
	active_wg=false; [ -d /sys/class/net/wg0 ] && active_wg=true

	listen_port="$(uci -q get network.wg0.listen_port || printf '51820')"
	wg_ip="$(uci -q get network.wg0.addresses 2>/dev/null || uci -q get network.wg0.ipaddr 2>/dev/null || printf '10.14.0.1/24')"
	pubkey=""
	if [ -f /etc/wireguard/server_public.key ]; then
		pubkey="$(cat /etc/wireguard/server_public.key 2>/dev/null || true)"
	fi
	if [ -z "$pubkey" ] && command -v wg >/dev/null 2>&1 && $active_wg; then
		pubkey="$(wg show wg0 public-key 2>/dev/null || true)"
	fi

	wan_ip="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null || true)"
	[ -n "$wan_ip" ] || wan_ip="$(uci -q get network.wan.ipaddr 2>/dev/null || true)"
	[ -n "$wan_ip" ] || wan_ip="$(uci -q get network.wan1.ipaddr 2>/dev/null || true)"

	wan_ipv6="$(ip -6 addr show scope global 2>/dev/null | awk '/inet6 2/ {print $2}' | cut -d/ -f1 | head -n 1)"
	[ -n "$wan_ipv6" ] || wan_ipv6="$(ubus call network.interface.wan6 status 2>/dev/null | jsonfilter -e '@["ipv6-address"][0].address' 2>/dev/null || true)"

	is_cgnat=false
	case "$wan_ip" in
		100.*|10.*|192.168.*|172.1[6-9].*|172.2[0-9].*|172.3[0-1].*) is_cgnat=true ;;
	esac

	custom_endpoint="$(uci -q get equipe_dashboard.wireguard.endpoint 2>/dev/null || true)"
	if [ -n "$custom_endpoint" ]; then
		endpoint="$custom_endpoint"
	elif [ "$is_cgnat" = true ] && [ -n "$wan_ipv6" ]; then
		endpoint="$wan_ipv6"
	else
		endpoint="${wan_ip:-$wan_ipv6}"
	fi

	dump_file="/tmp/ark-wg0-dump.$$"
	if $active_wg && command -v wg >/dev/null 2>&1; then
		wg show wg0 dump 2>/dev/null | tail -n +2 > "$dump_file" 2>/dev/null || true
	fi

	peers_count=0
	peers_active=0
	now="$(date +%s)"

	printf '{"installed":%s,"active":%s,"configured":%s,"autostart":%s,"ip":"%s","listen_port":"%s","public_key":"%s","endpoint":"%s","endpoint_ipv4":"%s","endpoint_ipv6":"%s","is_cgnat":%s,"has_qrencode":%s,"peers":[' \
		"$installed_wg" "$active_wg" "$configured_wg" "$autostart_wg" "$(json_escape "$wg_ip")" "$(json_escape "$listen_port")" "$(json_escape "$pubkey")" "$(json_escape "$endpoint")" "$(json_escape "$wan_ip")" "$(json_escape "$wan_ipv6")" "$is_cgnat" "$([ -x /usr/bin/qrencode ] && printf true || printf false)"

	first_peer=1
	for sec in $(uci -q show network 2>/dev/null | grep '=wireguard_wg0$' | cut -d. -f2 | cut -d= -f1); do
		pk="$(uci -q get "network.$sec.public_key" || true)"
		[ -n "$pk" ] || continue
		desc="$(uci -q get "network.$sec.description" || printf '%s' "$sec")"
		aips="$(uci -q get "network.$sec.allowed_ips" || true)"

		hs=0; rx=0; tx=0; ep=''
		if [ -f "$dump_file" ]; then
			line="$(awk -v k="$pk" '$1==k {print; exit}' "$dump_file" 2>/dev/null || true)"
			if [ -n "$line" ]; then
				ep="$(printf '%s' "$line" | awk '{print $3}')"
				hs="$(printf '%s' "$line" | awk '{print $5}')"
				rx="$(printf '%s' "$line" | awk '{print $6}')"
				tx="$(printf '%s' "$line" | awk '{print $7}')"
			fi
		fi
		[ "$ep" = "(none)" ] && ep=""
		[ -n "$hs" ] || hs=0
		[ -n "$rx" ] || rx=0
		[ -n "$tx" ] || tx=0

		peer_online=false
		if [ "$hs" -gt 0 ]; then
			diff=$((now - hs))
			if [ "$diff" -le 180 ]; then
				peer_online=true
				peers_active=$((peers_active + 1))
			fi
		fi
		peers_count=$((peers_count + 1))

		has_cfg=false
		[ -f "/etc/wireguard/clients/$desc.conf" ] && has_cfg=true

		[ "$first_peer" = 1 ] && first_peer=0 || printf ','
		printf '{"name":"%s","public_key":"%s","allowed_ips":"%s","endpoint":"%s","latest_handshake":%d,"rx_bytes":%s,"tx_bytes":%s,"online":%s,"has_config":%s}' \
			"$(json_escape "$desc")" "$(json_escape "$pk")" "$(json_escape "$aips")" "$(json_escape "$ep")" "$hs" "$rx" "$tx" "$peer_online" "$has_cfg"
	done

	rm -f "$dump_file" 2>/dev/null || true
	printf '],"peers_count":%d,"peers_active":%d}\n' "$peers_count" "$peers_active"
}

wireguard_firewall_setup() {
	port="${1:-51820}"
	no_reload="${2:-0}"
	changed=0

	zg="$(uci -q show firewall 2>/dev/null | grep -E "\\.name='wireguard'" | head -n1 | cut -d. -f2)"
	if [ -z "$zg" ]; then
		zg="$(uci add firewall zone)"
		uci -q set "firewall.$zg.name=wireguard"
		uci -q set "firewall.$zg.input=ACCEPT"
		uci -q set "firewall.$zg.output=ACCEPT"
		uci -q set "firewall.$zg.forward=ACCEPT"
		uci -q set "firewall.$zg.masq=1"
		uci -q set "firewall.$zg.masq6=1"
		uci -q set "firewall.$zg.mtu_fix=1"
		uci -q add_list "firewall.$zg.network=wg0"
		uci -q add_list "firewall.$zg.network=wgclient"
		uci -q set "firewall.$zg.device=wg+"
		changed=1
	else
		nets="$(uci -q get "firewall.$zg.network" || true)"
		case " $nets " in
			*" wg0 "*) ;;
			*)
				uci -q add_list "firewall.$zg.network=wg0"
				changed=1
				;;
		esac
		case " $nets " in
			*" wgclient "*) ;;
			*)
				uci -q add_list "firewall.$zg.network=wgclient"
				changed=1
				;;
		esac
		if [ "$(uci -q get "firewall.$zg.device")" != "wg+" ]; then
			uci -q set "firewall.$zg.device=wg+"
			changed=1
		fi
		if [ "$(uci -q get "firewall.$zg.masq")" != "1" ]; then
			uci -q set "firewall.$zg.masq=1"
			changed=1
		fi
		if [ "$(uci -q get "firewall.$zg.masq6")" != "1" ]; then
			uci -q set "firewall.$zg.masq6=1"
			changed=1
		fi
		if [ "$(uci -q get "firewall.$zg.mtu_fix")" != "1" ]; then
			uci -q set "firewall.$zg.mtu_fix=1"
			changed=1
		fi
	fi

	fw_wan=""
	for sec in $(uci -q show firewall | grep -E '=forwarding$' | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "firewall.$sec.src")" = "wireguard" ] && [ "$(uci -q get "firewall.$sec.dest")" = "wan" ]; then
			fw_wan="$sec"; break
		fi
	done
	if [ -z "$fw_wan" ]; then
		f="$(uci add firewall forwarding)"
		uci -q set "firewall.$f.src=wireguard"
		uci -q set "firewall.$f.dest=wan"
		changed=1
	fi

	fw_lan=""
	for sec in $(uci -q show firewall | grep -E '=forwarding$' | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "firewall.$sec.src")" = "wireguard" ] && [ "$(uci -q get "firewall.$sec.dest")" = "lan" ]; then
			fw_lan="$sec"; break
		fi
	done
	if [ -z "$fw_lan" ]; then
		f="$(uci add firewall forwarding)"
		uci -q set "firewall.$f.src=wireguard"
		uci -q set "firewall.$f.dest=lan"
		changed=1
	fi

	fw_lan_wg=""
	for sec in $(uci -q show firewall | grep -E '=forwarding$' | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "firewall.$sec.src")" = "lan" ] && [ "$(uci -q get "firewall.$sec.dest")" = "wireguard" ]; then
			fw_lan_wg="$sec"; break
		fi
	done
	if [ -z "$fw_lan_wg" ]; then
		f="$(uci add firewall forwarding)"
		uci -q set "firewall.$f.src=lan"
		uci -q set "firewall.$f.dest=wireguard"
		changed=1
	fi

	rule_wg=""
	for sec in $(uci -q show firewall | grep -E '=rule$' | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "firewall.$sec.name")" = "Allow-WireGuard-Inbound" ]; then
			rule_wg="$sec"; break
		fi
	done
	if [ -z "$rule_wg" ]; then
		r="$(uci add firewall rule)"
		uci -q set "firewall.$r.name=Allow-WireGuard-Inbound"
		uci -q set "firewall.$r.src=wan"
		uci -q set "firewall.$r.proto=udp"
		uci -q set "firewall.$r.dest_port=$port"
		uci -q set "firewall.$r.target=ACCEPT"
		changed=1
	else
		cur_port="$(uci -q get "firewall.$rule_wg.dest_port" || true)"
		if [ "$cur_port" != "$port" ]; then
			uci -q set "firewall.$rule_wg.dest_port=$port"
			changed=1
		fi
	fi

	# Explicit WireGuard Access Rules (identical to ZeroTier)
	# 1. HTTP / HTTPS (LuCI Web UI)
	if ! uci -q show firewall | grep -q "name='Allow-WireGuard-HTTP-HTTPS'"; then
		r="$(uci add firewall rule)"
		uci -q set "firewall.$r.name=Allow-WireGuard-HTTP-HTTPS"
		uci -q set "firewall.$r.src=wireguard"
		uci -q set "firewall.$r.proto=tcp"
		uci -q set "firewall.$r.dest_port=80 443"
		uci -q set "firewall.$r.target=ACCEPT"
		changed=1
	fi

	# 2. SSH
	if ! uci -q show firewall | grep -q "name='Allow-WireGuard-SSH'"; then
		r="$(uci add firewall rule)"
		uci -q set "firewall.$r.name=Allow-WireGuard-SSH"
		uci -q set "firewall.$r.src=wireguard"
		uci -q set "firewall.$r.proto=tcp"
		uci -q set "firewall.$r.dest_port=22"
		uci -q set "firewall.$r.target=ACCEPT"
		changed=1
	fi

	# 3. Ping (ICMP)
	if ! uci -q show firewall | grep -q "name='Allow-WireGuard-Ping'"; then
		r="$(uci add firewall rule)"
		uci -q set "firewall.$r.name=Allow-WireGuard-Ping"
		uci -q set "firewall.$r.src=wireguard"
		uci -q set "firewall.$r.proto=icmp"
		uci -q set "firewall.$r.target=ACCEPT"
		changed=1
	fi

	# 4. AdGuard Home
	if ! uci -q show firewall | grep -q "name='Allow-WireGuard-AdGuard'"; then
		r="$(uci add firewall rule)"
		uci -q set "firewall.$r.name=Allow-WireGuard-AdGuard"
		uci -q set "firewall.$r.src=wireguard"
		uci -q set "firewall.$r.proto=tcp"
		uci -q set "firewall.$r.dest_port=3000"
		uci -q set "firewall.$r.target=ACCEPT"
		changed=1
	fi

	if [ "$changed" = 1 ]; then
		uci commit firewall
		if [ "$no_reload" != "1" ]; then
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
		fi
	fi
}

wireguard_firewall_cleanup() {
	local wg0_enabled=0
	local wgclient_enabled=0

	[ "$(uci -q get network.wg0.disabled)" != "1" ] && [ "$(uci -q get network.wg0.auto)" != "0" ] && [ -n "$(uci -q get network.wg0.proto)" ] && wg0_enabled=1
	[ "$(uci -q get network.wgclient.disabled)" != "1" ] && [ "$(uci -q get network.wgclient.auto)" != "0" ] && [ -n "$(uci -q get network.wgclient.proto)" ] && wgclient_enabled=1

	if [ "$wg0_enabled" -eq 0 ] && [ "$wgclient_enabled" -eq 0 ]; then
		local changed=0
		while true; do
			local r="$(uci -q show firewall 2>/dev/null | grep -E '\.name=.Allow-WireGuard-' | head -n1 | cut -d. -f2 | cut -d= -f1)"
			[ -n "$r" ] || break
			uci -q delete "firewall.$r"
			changed=1
		done
		while true; do
			local fw_match=""
			for sec in $(uci -q show firewall 2>/dev/null | grep -E '=forwarding$' | cut -d. -f2 | cut -d= -f1); do
				local s="$(uci -q get "firewall.$sec.src")"
				local d="$(uci -q get "firewall.$sec.dest")"
				if [ "$s" = "wireguard" ] || [ "$d" = "wireguard" ]; then
					fw_match="$sec"
					break
				fi
			done
			[ -n "$fw_match" ] || break
			uci -q delete "firewall.$fw_match"
			changed=1
		done
		while true; do
			local z="$(uci -q show firewall 2>/dev/null | grep -E '=zone$' | cut -d. -f2 | cut -d= -f1 | while read -r zsec; do
				if [ "$(uci -q get "firewall.$zsec.name")" = "wireguard" ]; then
					echo "$zsec"
					break
				fi
			done)"
			[ -n "$z" ] || break
			uci -q delete "firewall.$z"
			changed=1
		done
		if uci -q get mwan3.wireguard_udp >/dev/null 2>&1; then
			uci -q delete mwan3.wireguard_udp
			uci commit mwan3 2>/dev/null || true
			[ -x /etc/init.d/mwan3 ] && /etc/init.d/mwan3 restart >/dev/null 2>&1 || true
		fi
		if [ "$changed" -eq 1 ]; then
			uci commit firewall
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
		fi
	fi
}

wireguard_server_setup() {
	port="${1:-51820}"
	ip="${2:-10.14.0.1/24}"

	case "$port" in ''|*[!0-9]*) port=51820 ;; esac
	[ "$port" -ge 1 ] && [ "$port" -le 65535 ] || port=51820

	mkdir -p /etc/wireguard/clients
	chmod 700 /etc/wireguard

	if [ ! -s /etc/wireguard/server_private.key ]; then
		( umask 077 && wg genkey > /etc/wireguard/server_private.key )
		chmod 600 /etc/wireguard/server_private.key
		wg pubkey < /etc/wireguard/server_private.key > /etc/wireguard/server_public.key
		chmod 644 /etc/wireguard/server_public.key
	fi
	privkey="$(cat /etc/wireguard/server_private.key)"

	uci -q set network.wg0=interface
	uci -q set network.wg0.proto='wireguard'
	uci -q set network.wg0.private_key="$privkey"
	uci -q set network.wg0.listen_port="$port"
	uci -q set network.wg0.addresses="$ip"
	uci -q set network.wg0.auto='1'
	uci -q set network.wg0.disabled='0'
	uci commit network

	wireguard_firewall_setup "$port"
	ifup wg0 >/dev/null 2>&1 || true
	sleep 1

	wireguard_status_json
}

wireguard_enable() {
	if [ -z "$(uci -q get network.wg0.proto)" ]; then
		wireguard_server_setup "51820" "10.14.0.1/24"
		return 0
	fi
	uci -q set network.wg0.disabled='0'
	uci -q set network.wg0.auto='1'
	uci commit network
	port="$(uci -q get network.wg0.listen_port || printf '51820')"
	wireguard_firewall_setup "$port"
	ifup wg0 >/dev/null 2>&1 || true
	sleep 1
	wireguard_status_json
}

wireguard_disable() {
	uci -q set network.wg0.auto='0'
	uci -q set network.wg0.disabled='1'
	uci commit network
	/sbin/ifdown wg0 >/dev/null 2>&1 || true
	ip route flush dev wg0 2>/dev/null || true
	ip link delete dev wg0 2>/dev/null || true
	wireguard_firewall_cleanup
	sleep 1
	wireguard_status_json
}

wireguard_autostart_toggle() {
	val="${1:-1}"
	case "$val" in
		1|true|on)
			uci -q set network.wg0.auto='1'
			uci commit network
			echo ok
			;;
		*)
			uci -q set network.wg0.auto='0'
			uci commit network
			echo ok
			;;
	esac
}

wireguard_peer_add() {
	name="$1"
	req_ip="$2"
	custom_endpoint="$3"
	tunnel_mode="${4:-full}"

	[ -n "$name" ] || { echo 'Nome do cliente obrigatorio' >&2; exit 2; }
	clean_name="$(printf '%s' "$name" | sed 's/[^a-zA-Z0-9_-]/-/g; s/-\{2,\}/-/g; s/^-//; s/-$//')"
	[ -n "$clean_name" ] || clean_name="cliente-$(date +%s)"

	if [ ! -s /etc/wireguard/server_private.key ] || [ -z "$(uci -q get network.wg0.proto)" ]; then
		wireguard_server_setup "51820" "10.14.0.1/24" >/dev/null 2>&1 || true
	fi
	server_pub="$(cat /etc/wireguard/server_public.key 2>/dev/null || true)"
	server_port="$(uci -q get network.wg0.listen_port || printf '51820')"

	client_ip="$req_ip"
	if [ -z "$client_ip" ]; then
		max_host=1
		for aip in $(uci -q show network 2>/dev/null | grep -E '\.allowed_ips=' | cut -d= -f2 | tr -d "'\""); do
			case "$aip" in
				10.14.0.*)
					h="$(printf '%s' "$aip" | awk -F. '{split($4,a,"/"); print a[1]}')"
					case "$h" in ''|*[!0-9]*) ;; *)
						[ "$h" -gt "$max_host" ] && max_host="$h"
						;;
					esac
					;;
			esac
		done
		client_ip="10.14.0.$((max_host + 1))"
	fi

	client_priv="$(wg genkey)"
	client_pub="$(printf '%s' "$client_priv" | wg pubkey)"
	client_psk="$(wg genpsk 2>/dev/null || true)"

	for sec in $(uci -q show network 2>/dev/null | grep '=wireguard_wg0$' | cut -d. -f2 | cut -d= -f1); do
		cur_desc="$(uci -q get "network.$sec.description" || true)"
		cur_pk="$(uci -q get "network.$sec.public_key" || true)"
		if [ "$cur_desc" = "$clean_name" ] || [ "$cur_pk" = "$client_pub" ]; then
			uci -q delete "network.$sec"
		fi
	done

	psec="$(uci add network wireguard_wg0)"
	uci -q set "network.$psec.description=$clean_name"
	uci -q set "network.$psec.public_key=$client_pub"
	[ -n "$client_psk" ] && uci -q set "network.$psec.preshared_key=$client_psk"
	uci -q add_list "network.$psec.allowed_ips=$client_ip/32"
	uci -q set "network.$psec.route_allowed_ips=1"
	uci commit network

	wan_ip="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null || true)"
	[ -n "$wan_ip" ] || wan_ip="$(uci -q get network.wan.ipaddr 2>/dev/null || true)"
	[ -n "$wan_ip" ] || wan_ip="$(uci -q get network.wan1.ipaddr 2>/dev/null || true)"
	wan_ipv6="$(ip -6 addr show scope global 2>/dev/null | awk '/inet6 2/ {print $2}' | cut -d/ -f1 | head -n 1)"
	[ -n "$wan_ipv6" ] || wan_ipv6="$(ubus call network.interface.wan6 status 2>/dev/null | jsonfilter -e '@["ipv6-address"][0].address' 2>/dev/null || true)"

	is_cgnat=false
	case "$wan_ip" in
		100.*|10.*|192.168.*|172.1[6-9].*|172.2[0-9].*|172.3[0-1].*) is_cgnat=true ;;
	esac

	[ -n "$custom_endpoint" ] || custom_endpoint="$(uci -q get equipe_dashboard.wireguard.endpoint 2>/dev/null || true)"
	if [ -n "$custom_endpoint" ]; then
		endpoint="$custom_endpoint"
	elif [ "$is_cgnat" = true ] && [ -n "$wan_ipv6" ]; then
		endpoint="$wan_ipv6"
	else
		endpoint="${wan_ip:-$wan_ipv6}"
	fi
	[ -n "$endpoint" ] || endpoint="192.168.73.1"

	host_num="${client_ip##*.}"
	[ -n "$host_num" ] || host_num=2

	if [ "$tunnel_mode" = "split" ]; then
		lan_net="$(uci -q get network.lan.ipaddr || printf '192.168.1.1')"
		lan_prefix="$(ipv4_prefix24 "$lan_net")"
		client_allowed_ips="$lan_prefix.0/24, 10.14.0.0/24, fddd:dd40:a110::/64"
	else
		client_allowed_ips="0.0.0.0/0, ::/0"
	fi

	client_ip="$(printf '%s' "$client_ip" | tr -d '\r\n ')"
	endpoint="$(printf '%s' "$endpoint" | tr -d '\r\n ')"
	server_port="$(printf '%s' "$server_port" | tr -d '\r\n ')"

	case "$endpoint" in
		\[*\]:*) full_endpoint="$endpoint" ;;
		\[*\]) full_endpoint="$endpoint:$server_port" ;;
		*:*:*) full_endpoint="[$endpoint]:$server_port" ;;
		*:*) full_endpoint="$endpoint" ;;
		*) full_endpoint="$endpoint:$server_port" ;;
	esac

	mkdir -p /etc/wireguard/clients
	chmod 700 /etc/wireguard/clients
	cfg_file="/etc/wireguard/clients/$clean_name.conf"

	(
		umask 077
		cat > "$cfg_file" <<EOF
[Interface]
PrivateKey = $client_priv
Address = $client_ip/24, fddd:dd40:a110::$host_num/64
DNS = 10.14.0.1, 1.1.1.1, 2606:4700:4700::1111

[Peer]
PublicKey = $server_pub
$( [ -n "$client_psk" ] && printf 'PresharedKey = %s\n' "$client_psk" )
Endpoint = $full_endpoint
AllowedIPs = $client_allowed_ips
PersistentKeepalive = 25
EOF
	)
	chmod 600 "$cfg_file"

	if [ -d /sys/class/net/wg0 ] && command -v wg >/dev/null 2>&1; then
		if [ -n "$client_psk" ]; then
			psk_tmp="/tmp/ark-wg-psk.$$"
			printf '%s' "$client_psk" > "$psk_tmp"
			wg set wg0 peer "$client_pub" preshared-key "$psk_tmp" allowed-ips "$client_ip/32" 2>/dev/null || true
			rm -f "$psk_tmp" 2>/dev/null || true
		else
			wg set wg0 peer "$client_pub" allowed-ips "$client_ip/32" 2>/dev/null || true
		fi
	fi
	ifup wg0 >/dev/null 2>&1 || true

	json_text_escape() {
		sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\r' ' ' | awk '{ if (NR>1) printf "\\n"; printf "%s", $0 }'
	}
	conf_txt="$(cat "$cfg_file" | json_text_escape)"
	qr_svg=""
	if command -v qrencode >/dev/null 2>&1; then
		qr_svg="$(qrencode -t SVG --svg-path --inline -o - < "$cfg_file" 2>/dev/null | json_text_escape || true)"
	fi

	printf '{"ok":true,"name":"%s","clean_name":"%s","public_key":"%s","ip":"%s","endpoint":"%s","conf":"%s","qr_svg":"%s"}\n' \
		"$(json_escape "$name")" "$(json_escape "$clean_name")" "$(json_escape "$client_pub")" "$(json_escape "$client_ip")" "$(json_escape "$full_endpoint")" "$conf_txt" "$qr_svg"
}

wireguard_peer_delete() {
	target="$1"
	[ -n "$target" ] || { echo 'Chave ou nome do peer obrigatorio' >&2; exit 2; }

	deleted_pk=""
	for sec in $(uci -q show network 2>/dev/null | grep '=wireguard_wg0$' | cut -d. -f2 | cut -d= -f1); do
		pk="$(uci -q get "network.$sec.public_key" || true)"
		nm="$(uci -q get "network.$sec.description" || true)"
		if [ "$pk" = "$target" ] || [ "$nm" = "$target" ] || [ "$sec" = "$target" ]; then
			deleted_pk="$pk"
			uci -q delete "network.$sec"
			[ -n "$nm" ] && rm -f "/etc/wireguard/clients/$nm.conf" 2>/dev/null || true
		fi
	done
	uci commit network

	if [ -n "$deleted_pk" ] && [ -d /sys/class/net/wg0 ] && command -v wg >/dev/null 2>&1; then
		wg set wg0 peer "$deleted_pk" remove 2>/dev/null || true
	fi
	ifup wg0 >/dev/null 2>&1 || true

	wireguard_status_json
}

wireguard_peer_qr() {
	target="$1"
	[ -n "$target" ] || { echo 'Nome ou chave do peer obrigatorio' >&2; exit 2; }

	cfg_file=""
	peer_name="$target"
	if [ -f "/etc/wireguard/clients/$target.conf" ]; then
		cfg_file="/etc/wireguard/clients/$target.conf"
	else
		for sec in $(uci -q show network 2>/dev/null | grep '=wireguard_wg0$' | cut -d. -f2 | cut -d= -f1); do
			pk="$(uci -q get "network.$sec.public_key" || true)"
			nm="$(uci -q get "network.$sec.description" || true)"
			if [ "$pk" = "$target" ] || [ "$nm" = "$target" ]; then
				peer_name="$nm"
				[ -f "/etc/wireguard/clients/$nm.conf" ] && cfg_file="/etc/wireguard/clients/$nm.conf"
				break
			fi
		done
	fi

	if [ -z "$cfg_file" ] || [ ! -f "$cfg_file" ]; then
		printf '{"ok":false,"error":"Arquivo de configuracao .conf nao encontrado para este cliente"}\n'
		return 1
	fi

	json_text_escape() {
		sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | tr '\r' ' ' | awk '{ if (NR>1) printf "\\n"; printf "%s", $0 }'
	}
	conf_txt="$(cat "$cfg_file" | json_text_escape)"
	qr_svg=""
	if command -v qrencode >/dev/null 2>&1; then
		qr_svg="$(qrencode -t SVG --svg-path --inline -o - < "$cfg_file" 2>/dev/null | json_text_escape || true)"
	fi

	printf '{"ok":true,"name":"%s","conf":"%s","qr_svg":"%s"}\n' \
		"$(json_escape "$peer_name")" "$conf_txt" "$qr_svg"
}

b64_decode_str() {
	raw_input="$1"
	if [ -z "$raw_input" ]; then
		raw_input="$(cat)"
	fi
	[ -n "$raw_input" ] || return 1

	case "$raw_input" in
		*"[Interface]"*|*"[Peer]"*)
			printf '%s\n' "$raw_input"
			return 0
			;;
	esac

	clean_b64="$(printf '%s' "$raw_input" | tr -d '\r\n ')"

	if command -v ucode >/dev/null 2>&1; then
		ucode -e 'print(b64dec(ARGV[0]))' -- "$clean_b64"
	elif command -v lua >/dev/null 2>&1; then
		printf '%s' "$clean_b64" | lua -e 'local nx=require("nixio"); local s=io.read("*all"); io.write((nx and nx.bin and nx.bin.b64decode and nx.bin.b64decode(s)) or "")' 2>/dev/null
	elif command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
		python -c "import sys, base64; sys.stdout.write(base64.b64decode(sys.argv[1]).decode('utf-8', errors='replace'))" "$clean_b64"
	elif command -v base64 >/dev/null 2>&1; then
		printf '%s' "$clean_b64" | base64 -d 2>/dev/null || printf '%s' "$clean_b64" | base64 -D 2>/dev/null
	elif command -v openssl >/dev/null 2>&1; then
		printf '%s' "$clean_b64" | openssl base64 -d 2>/dev/null
	fi
}

b64_encode_file() {
	file="$1"
	[ -s "$file" ] || return 0
	if command -v ucode >/dev/null 2>&1; then
		ucode -e 'let fs = require("fs"); let c = fs.readfile(ARGV[0]); if (c) print(b64enc(c));' -- "$file"
	elif command -v lua >/dev/null 2>&1; then
		cat "$file" 2>/dev/null | lua -e 'local nx=require("nixio"); local s=io.read("*all"); io.write((nx and nx.bin and nx.bin.b64encode and nx.bin.b64encode(s)) or "")' 2>/dev/null
	elif command -v python3 >/dev/null 2>&1 || command -v python >/dev/null 2>&1; then
		python -c "import sys, base64; sys.stdout.write(base64.b64encode(open(sys.argv[1], 'rb').read()).decode('ascii'))" "$file"
	elif command -v base64 >/dev/null 2>&1; then
		base64 "$file" 2>/dev/null | tr -d '\r\n'
	fi
}

wireguard_client_import() {
	b64="$1"
	[ -n "$b64" ] || b64="$(cat)"
	[ -n "$b64" ] || { echo 'Conteudo da configuracao vazio' >&2; exit 2; }

	tmp_conf="/tmp/ark_wg_client.$$.conf"
	b64_decode_str "$b64" > "$tmp_conf" 2>/dev/null
	[ -s "$tmp_conf" ] || { echo 'Falha ao decodificar arquivo .conf' >&2; exit 2; }

	clean_lines() {
		sed 's/^[[:space:]]*//; s/[[:space:]]*$//' "$tmp_conf" | grep -v '^[#;]' | tr -d '\r'
	}
	get_val() {
		clean_lines | grep -iE "^${1}[[:space:]]*=" | head -n 1 | sed -E "s/^${1}[[:space:]]*=[[:space:]]*//I"
	}
	get_all_vals() {
		clean_lines | grep -iE "^${1}[[:space:]]*=" | sed -E "s/^${1}[[:space:]]*=[[:space:]]*//I" | tr ',' '\n' | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | grep -v '^$'
	}

	privkey="$(get_val 'PrivateKey')"
	pubkey="$(get_val 'PublicKey')"
	preshared_key="$(get_val 'PresharedKey')"
	endpoint="$(get_val 'Endpoint')"
	keepalive="$(get_val 'PersistentKeepalive')"
	mtu="$(get_val 'MTU')"

	[ -n "$privkey" ] || { rm -f "$tmp_conf" 2>/dev/null; echo 'Chave Privada (PrivateKey) nao encontrada no .conf' >&2; exit 2; }
	[ -n "$pubkey" ] || { rm -f "$tmp_conf" 2>/dev/null; echo 'Chave Publica do Servidor (PublicKey) nao encontrada no .conf' >&2; exit 2; }
	[ -n "$endpoint" ] || { rm -f "$tmp_conf" 2>/dev/null; echo 'Endpoint do Servidor nao encontrado no .conf' >&2; exit 2; }

	case "$endpoint" in
		\[*\]:*)
			ep_host="$(printf '%s' "$endpoint" | sed 's/^\[//; s/\].*//')"
			ep_port="${endpoint##*:}"
			;;
		*:*)
			ep_host="${endpoint%:*}"
			ep_port="${endpoint##*:}"
			;;
		*)
			ep_host="$endpoint"
			ep_port="51820"
			;;
	esac

	# Cleanup old wgclient
	uci -q delete network.wgclient
	for s in $(uci -q show network | grep '=wireguard_wgclient$' | cut -d. -f2 | cut -d= -f1); do
		uci -q delete "network.$s"
	done

	uci -q set network.wgclient=interface
	uci -q set network.wgclient.proto='wireguard'
	uci -q set network.wgclient.private_key="$privkey"
	uci -q set network.wgclient.listen_port='51821'
	uci -q set network.wgclient.auto='1'
	[ -n "$mtu" ] && uci -q set network.wgclient.mtu="$mtu"

	for a in $(get_all_vals 'Address'); do
		uci -q add_list network.wgclient.addresses="$a"
	done

	for d in $(get_all_vals 'DNS'); do
		uci -q add_list network.wgclient.dns="$d"
	done

	sec="$(uci -q add network wireguard_wgclient)"
	uci -q set "network.$sec.public_key=$pubkey"
	[ -n "$preshared_key" ] && uci -q set "network.$sec.preshared_key=$preshared_key"
	uci -q set "network.$sec.endpoint_host=$ep_host"
	uci -q set "network.$sec.endpoint_port=$ep_port"
	uci -q set "network.$sec.persistent_keepalive=${keepalive:-25}"
	uci -q set "network.$sec.route_allowed_ips=1"

	allowed_count=0
	for aip in $(get_all_vals 'AllowedIPs'); do
		uci -q add_list "network.$sec.allowed_ips=$aip"
		allowed_count=$((allowed_count + 1))
	done
	if [ "$allowed_count" -eq 0 ]; then
		uci -q add_list "network.$sec.allowed_ips=0.0.0.0/0"
	fi

	for z in $(uci -q show firewall | grep '=zone$' | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "firewall.$z.name")" = "wan" ]; then
			uci -q del_list "firewall.$z.network=wgclient" 2>/dev/null || true
		fi
	done
	wireguard_firewall_setup "" "1"

	mkdir -p /etc/wireguard
	cp -f "$tmp_conf" /etc/wireguard/wgclient.conf 2>/dev/null
	chmod 600 /etc/wireguard/wgclient.conf 2>/dev/null
	rm -f "$tmp_conf" 2>/dev/null

	uci commit network
	uci commit firewall
	rm -f /tmp/ark-features.cache 2>/dev/null || true

	echo 'ok'

	(
		/etc/init.d/firewall reload >/dev/null 2>&1 || true
		/sbin/ifup wgclient >/dev/null 2>&1 || true
		/usr/sbin/ark-wireguard-wan-sync >/dev/null 2>&1 || true
	) </dev/null >/dev/null 2>&1 &
}

wireguard_client_status_json() {
	installed_wg=false; ([ -x /usr/bin/wg ] || [ -f /lib/netifd/proto/wireguard.sh ]) && installed_wg=true
	configured=false; [ "$(uci -q get network.wgclient.proto)" = "wireguard" ] && configured=true
	active=false; [ -d /sys/class/net/wgclient ] && active=true
	autostart=false; [ "$(uci -q get network.wgclient.auto)" != "0" ] && autostart=true

	client_ip="$(uci -q get network.wgclient.addresses 2>/dev/null || true)"
	ep_host="$(uci -q get network.@wireguard_wgclient[0].endpoint_host 2>/dev/null || true)"
	ep_port="$(uci -q get network.@wireguard_wgclient[0].endpoint_port 2>/dev/null || printf '51820')"
	pubkey="$(uci -q get network.@wireguard_wgclient[0].public_key 2>/dev/null || true)"
	endpoint="${ep_host}:${ep_port}"
	[ -z "$ep_host" ] && endpoint=""

	hs=0; rx=0; tx=0; live_ep=""
	if $active && command -v wg >/dev/null 2>&1; then
		dump="$(wg show wgclient dump 2>/dev/null | tail -n +2 | head -n 1 || true)"
		if [ -n "$dump" ]; then
			live_ep="$(echo "$dump" | awk '{print $3}')"
			hs="$(echo "$dump" | awk '{print $5}')"
			rx="$(echo "$dump" | awk '{print $6}')"
			tx="$(echo "$dump" | awk '{print $7}')"
		fi
	fi
	[ "$live_ep" = "(none)" ] && live_ep=""
	[ -n "$live_ep" ] && endpoint="$live_ep"
	[ -n "$hs" ] || hs=0
	[ -n "$rx" ] || rx=0
	[ -n "$tx" ] || tx=0

	online=false
	now="$(date +%s)"
	if [ "$hs" -gt 0 ]; then
		diff=$((now - hs))
		[ "$diff" -le 180 ] && online=true
	fi

	conf_b64=""
	if [ -f /etc/wireguard/wgclient.conf ]; then
		conf_b64="$(b64_encode_file /etc/wireguard/wgclient.conf)"
	fi

	printf '{"installed":%s,"configured":%s,"active":%s,"autostart":%s,"online":%s,"endpoint":"%s","public_key":"%s","client_ip":"%s","latest_handshake":%d,"rx_bytes":%s,"tx_bytes":%s,"conf_b64":"%s"}\n' \
		"$installed_wg" "$configured" "$active" "$autostart" "$online" "$(json_escape "$endpoint")" "$(json_escape "$pubkey")" "$(json_escape "$client_ip")" "$hs" "$rx" "$tx" "$conf_b64"
}

wireguard_client_toggle() {
	des="$1"
	rm -f /tmp/ark-features.cache 2>/dev/null || true
	if [ "$des" = "1" ] || [ "$des" = "on" ] || [ "$des" = "start" ]; then
		uci -q set network.wgclient.disabled='0'
		uci -q set network.wgclient.auto='1'
		uci commit network
		wireguard_firewall_setup "" "1"
		echo 'ok'
		(
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			/sbin/ifup wgclient >/dev/null 2>&1 || true
			/usr/sbin/ark-wireguard-wan-sync >/dev/null 2>&1 || true
		) </dev/null >/dev/null 2>&1 &
	else
		uci -q set network.wgclient.disabled='1'
		uci -q set network.wgclient.auto='0'
		uci commit network
		echo 'ok'
		(
			/sbin/ifdown wgclient >/dev/null 2>&1 || true
			ip route flush dev wgclient 2>/dev/null || true
			ip link delete dev wgclient 2>/dev/null || true
			wireguard_firewall_cleanup
		) </dev/null >/dev/null 2>&1 &
	fi
}

wireguard_client_delete() {
	rm -f /tmp/ark-features.cache 2>/dev/null || true
	uci -q delete network.wgclient
	for s in $(uci -q show network | grep '=wireguard_wgclient$' | cut -d. -f2 | cut -d= -f1); do
		uci -q delete "network.$s"
	done
	for z in $(uci -q show firewall | grep '=zone$' | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "firewall.$z.name")" = "wan" ]; then
			uci -q del_list "firewall.$z.network=wgclient" 2>/dev/null || true
		fi
	done
	rm -f /etc/wireguard/wgclient.conf 2>/dev/null
	uci commit network
	echo 'ok'
	(
		/sbin/ifdown wgclient >/dev/null 2>&1 || true
		ip route flush dev wgclient 2>/dev/null || true
		ip link delete dev wgclient 2>/dev/null || true
		wireguard_firewall_cleanup
	) </dev/null >/dev/null 2>&1 &
}



handle_vpn() {
	action="$1"
	[ -n "$action" ] || { echo "Uso: $0 <comando> [args...]" >&2; exit 1; }
	case "$action" in
	tailscale-status)
		tailscale_state_json
		;;
	tailscale-up)
		tailscale_up_lan
		;;
	tailscale-down)
		tailscale_down
		;;
	zerotier-status)
		zerotier_status_json
		;;
	zerotier-enable)
		zerotier_enable
		;;
	zerotier-disable)
		zerotier_disable
		;;
	zerotier-prepare-firewall)
		zerotier_firewall_prepare
		echo ok
		;;
	zerotier-configure-access)
		zerotier_configure_access
		echo ok
		;;
	zerotier-join)
		zerotier_join_network "$2"
		;;
	zerotier-leave)
		zerotier_leave_network "$2"
		;;
	zerotier-autostart-toggle)
		zerotier_autostart_toggle "$2"
		;;
	wireguard-status)
		wireguard_status_json
		;;
	wireguard-server-setup)
		wireguard_server_setup "$2" "$3"
		;;
	wireguard-enable)
		wireguard_enable
		;;
	wireguard-disable)
		wireguard_disable
		;;
	wireguard-autostart-toggle)
		wireguard_autostart_toggle "$2"
		;;
	wireguard-peer-add)
		wireguard_peer_add "$2" "$3" "$4" "$5"
		;;
	wireguard-peer-delete)
		wireguard_peer_delete "$2"
		;;
	wireguard-peer-qr)
		wireguard_peer_qr "$2"
		;;
	wireguard-client-import)
		wireguard_client_import "$2"
		;;
	wireguard-client-status)
		wireguard_client_status_json
		;;
	wireguard-client-toggle)
		wireguard_client_toggle "$2"
		;;
	wireguard-client-delete)
		wireguard_client_delete
		;;

	*)
		echo "Acao VPN desconhecida: $action" >&2
		exit 1
		;;
	esac
}

if [ "$(basename "$0")" = "vpn.sh" ]; then
	handle_vpn "$@"
fi
