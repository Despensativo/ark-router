#!/bin/sh
# /usr/lib/ark/modules/devices.sh - ARK Router Connected Devices & Bandwidth Module
# Strict POSIX BusyBox ash compliant module for Device management, DHCP leases,
# Bandwidth throttling (tc/HTB), Speedtest integration and Safe Reboot.

[ -z "${_ARK_DEVICES_SH_LOADED:-}" ] || return 0
_ARK_DEVICES_SH_LOADED=1

[ -n "${ARK_LIB_DIR}" ] || ARK_LIB_DIR="/usr/lib/ark"
[ -f "${ARK_LIB_DIR}/common.sh" ] && . "${ARK_LIB_DIR}/common.sh"
[ -f "${ARK_LIB_DIR}/logging.sh" ] && . "${ARK_LIB_DIR}/logging.sh"
[ -f "${ARK_LIB_DIR}/validation.sh" ] && . "${ARK_LIB_DIR}/validation.sh"
[ -f "${ARK_LIB_DIR}/modules/network.sh" ] && . "${ARK_LIB_DIR}/modules/network.sh"
[ -f "${ARK_LIB_DIR}/modules/speedify.sh" ] && . "${ARK_LIB_DIR}/modules/speedify.sh"
[ -f "${ARK_LIB_DIR}/modules/system.sh" ] && . "${ARK_LIB_DIR}/modules/system.sh"
[ -f "${ARK_LIB_DIR}/modules/ezsetup.sh" ] && . "${ARK_LIB_DIR}/modules/ezsetup.sh"

find_dhcp_host() {
	uci -q show dhcp 2>/dev/null | awk -F= -v wanted="$1" '
		/\.mac=/ {
			value=$2; gsub(/^\047|\047$/, "", value)
			if (toupper(value) == wanted) {
				key=$1; sub(/^dhcp\./, "", key); sub(/\.mac$/, "", key); print key; exit
			}
		}'
}

sanitize_dhcp_hostnames() {
	changed=0
	for h in $(uci -q show dhcp 2>/dev/null | grep -E '\.name=' | cut -d. -f2 | cut -d= -f1 | sort -u); do
		cur_name="$(uci -q get "dhcp.$h.name" || true)"
		[ -n "$cur_name" ] || continue
		clean_name="$(printf '%s' "$cur_name" | sed 's/[^a-zA-Z0-9_-]/-/g; s/-\{2,\}/-/g; s/^-//; s/-$//')"
		[ -n "$clean_name" ] || clean_name="ark-$h"
		if [ "$cur_name" != "$clean_name" ]; then
			uci -q set "dhcp.$h.name=$clean_name"
			changed=1
		fi
	done
	[ "$changed" = 1 ] && uci commit dhcp || true
}

flush_stale_leases() {
	[ -f /tmp/dhcp.leases ] || { printf '{"ok":true,"purged":0}\n'; return 0; }
	
	local wifi_macs=""
	if command -v iwinfo >/dev/null 2>&1; then
		for wif in $(iwinfo 2>/dev/null | grep 'ESSID:' | cut -d' ' -f1); do
			local wlist="$(iwinfo "$wif" assoclist 2>/dev/null | grep -oE '([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}' | tr 'a-f' 'A-F')"
			[ -n "$wlist" ] && wifi_macs="$wifi_macs $wlist"
		done
	fi
	if command -v iw >/dev/null 2>&1; then
		for wif in $(iw dev 2>/dev/null | grep Interface | cut -d' ' -f2); do
			local wlist="$(iw dev "$wif" station dump 2>/dev/null | grep -oE 'Station ([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}' | cut -d' ' -f2 | tr 'a-f' 'A-F')"
			[ -n "$wlist" ] && wifi_macs="$wifi_macs $wlist"
		done
	fi

	local active_arp=""
	local dead_arp=""
	if [ -f /proc/net/arp ]; then
		while read -r a_ip a_hw a_flags a_mac a_mask a_dev; do
			[ "$a_ip" = "IP" ] && continue
			a_mac="$(printf '%s' "$a_mac" | tr 'a-f' 'A-F')"
			[ "$a_mac" = "00:00:00:00:00:00" ] && continue
			if [ "$a_flags" = "0x2" ]; then
				active_arp="$active_arp $a_mac"
			elif [ "$a_flags" = "0x0" ]; then
				dead_arp="$dead_arp $a_mac"
			fi
		done < /proc/net/arp
	fi

	local tmp_leases="/tmp/dhcp.leases.tmp.$$"
	local purged_count=0
	rm -f "$tmp_leases"
	while read -r ts mac ip name clid; do
		[ -n "$mac" ] || continue
		local umac="$(printf '%s' "$mac" | tr 'a-f' 'A-F')"
		local is_dead=0
		
		case " $wifi_macs " in
			*" $umac "*) ;;
			*)
				case " $active_arp " in
					*" $umac "*) ;;
					*)
						case " $dead_arp " in
							*" $umac "*) is_dead=1 ;;
							*)
								if ! ping -c 1 -W 1 "$ip" >/dev/null 2>&1; then
									is_dead=1
								fi
								;;
						esac
						;;
				esac
				;;
		esac

		if [ "$is_dead" = "1" ]; then
			purged_count=$((purged_count + 1))
		else
			printf '%s %s %s %s %s\n' "$ts" "$mac" "$ip" "$name" "$clid" >> "$tmp_leases"
		fi
	done < /tmp/dhcp.leases

	if [ "$purged_count" -gt 0 ]; then
		cat "$tmp_leases" > /tmp/dhcp.leases
		killall -HUP dnsmasq 2>/dev/null || true
	fi
	rm -f "$tmp_leases"
	printf '{"ok":true,"purged":%d}\n' "$purged_count"
}

device_get_stations() {
	local mock_file="/tmp/ark_mock_stations.json"
	[ -n "${ARK_ROOT}" ] && [ -f "${ARK_ROOT}/tmp/ark_mock_stations.json" ] && mock_file="${ARK_ROOT}/tmp/ark_mock_stations.json"
	if [ -f "$mock_file" ]; then
		cat "$mock_file"
		return 0
	fi

	local main_ssid=""
	local guest_ssid=""
	local r2g_ssid=""
	local r5g_ssid=""

	for s in $(uci -q show wireless 2>/dev/null | grep '=wifi-iface' | cut -d. -f2 | cut -d= -f1); do
		local net="$(uci -q get "wireless.$s.network" || true)"
		local s_ssid="$(uci -q get "wireless.$s.ssid" || true)"
		case "$net" in
			*guest*) [ -z "$guest_ssid" ] && guest_ssid="$s_ssid" ;;
			*)
				[ -z "$main_ssid" ] && main_ssid="$s_ssid"
				local dev="$(uci -q get "wireless.$s.device" || true)"
				local band="$(uci -q get "wireless.$dev.band" || true)"
				[ "$band" = "5g" ] && [ -z "$r5g_ssid" ] && r5g_ssid="$s_ssid"
				[ "$band" = "2g" ] && [ -z "$r2g_ssid" ] && r2g_ssid="$s_ssid"
				;;
		esac
	done
	[ -n "$main_ssid" ] || main_ssid="$(uci -q get equipe_dashboard.main.wifi_ssid || echo 'CASA_ARK')"
	[ -n "$guest_ssid" ] || guest_ssid="$(uci -q get equipe_dashboard.main.guest_ssid || echo 'Visitantes')"

	local leases_file="/tmp/dhcp.leases"
	[ -n "${ARK_ROOT}" ] && [ -f "${ARK_ROOT}/tmp/dhcp.leases" ] && leases_file="${ARK_ROOT}/tmp/dhcp.leases"

	local ifaces=""
	if command -v iw >/dev/null 2>&1; then
		ifaces="$(iw dev 2>/dev/null | grep Interface | awk '{print $2}')"
	fi
	if [ -z "$ifaces" ] && command -v iwinfo >/dev/null 2>&1; then
		ifaces="$(iwinfo 2>/dev/null | grep 'ESSID:' | awk '{print $1}')"
	fi
	if [ -z "$ifaces" ]; then
		local sys_net="/sys/class/net"
		[ -n "${ARK_ROOT}" ] && [ -d "${ARK_ROOT}/sys/class/net" ] && sys_net="${ARK_ROOT}/sys/class/net"
		ifaces="$(ls "$sys_net" 2>/dev/null | grep -E '^(wlan|ath|ra|phy)')"
	fi

	local seen_macs=""
	local stations_json=""
	local main_count=0
	local guest_count=0
	local first_stat=1

	for wif in $ifaces; do
		[ -n "$wif" ] || continue
		local is_guest=0
		local if_ssid="$main_ssid"
		local if_band="2g"
		local if_band_label="2,4 GHz"

		for s in $(uci -q show wireless 2>/dev/null | grep '=wifi-iface' | cut -d. -f2 | cut -d= -f1); do
			local cur_ifname="$(uci -q get "wireless.$s.ifname" || true)"
			if [ "$cur_ifname" = "$wif" ] || [ "$s" = "$wif" ]; then
				local s_net="$(uci -q get "wireless.$s.network" || true)"
				case "$s_net" in
					*guest*) is_guest=1; if_ssid="$guest_ssid" ;;
				esac
				local s_ssid="$(uci -q get "wireless.$s.ssid" || true)"
				[ -n "$s_ssid" ] && if_ssid="$s_ssid"
				local dev="$(uci -q get "wireless.$s.device" || true)"
				local b="$(uci -q get "wireless.$dev.band" || true)"
				if [ "$b" = "5g" ] || [ "$b" = "6g" ]; then
					if_band="$b"
					[ "$b" = "5g" ] && if_band_label="5 GHz"
					[ "$b" = "6g" ] && if_band_label="6 GHz"
				fi
				break
			fi
		done

		case "$wif" in
			*5g*|*phy1*|*wlan1*|*ath1*|*rai0*) if_band="5g"; if_band_label="5 GHz" ;;
			*6g*|*phy2*|*wlan2*|*ath2*) if_band="6g"; if_band_label="6 GHz" ;;
		esac

		local dump_output=""
		if command -v iw >/dev/null 2>&1; then
			dump_output="$(iw dev "$wif" station dump 2>/dev/null || true)"
		fi

		if [ -n "$dump_output" ]; then
			local cur_mac=""
			local cur_sig=""
			local cur_rx=""
			local cur_tx=""

			IFS='
'
			for line in $dump_output; do
				case "$line" in
					Station\ *)
						if [ -n "$cur_mac" ]; then
							case " $seen_macs " in
								*" $cur_mac "*) ;;
								*)
									seen_macs="$seen_macs $cur_mac"
									local dev_ip=""
									local dev_name=""
									if [ -f "$leases_file" ]; then
										dev_ip="$(awk -v m="$(printf '%s' "$cur_mac" | tr 'A-F' 'a-f')" '$2==m {print $3; exit}' "$leases_file" 2>/dev/null || true)"
										dev_name="$(awk -v m="$(printf '%s' "$cur_mac" | tr 'A-F' 'a-f')" '$2==m {print $4; exit}' "$leases_file" 2>/dev/null || true)"
									fi
									[ -z "$dev_ip" ] && [ -f /proc/net/arp ] && dev_ip="$(awk -v m="$(printf '%s' "$cur_mac" | tr 'A-F' 'a-f')" '$4==m {print $1; exit}' /proc/net/arp 2>/dev/null || true)"
									[ -z "$dev_ip" ] && dev_ip="—"
									[ -z "$dev_name" ] || [ "$dev_name" = "*" ] && dev_name="Dispositivo Wi-Fi"

									[ "$first_stat" = 1 ] && first_stat=0 || stations_json="${stations_json},"
									stations_json="${stations_json}{\"mac\":\"$cur_mac\",\"ip\":\"$dev_ip\",\"name\":\"$dev_name\",\"ifname\":\"$wif\",\"ssid\":\"$if_ssid\",\"band\":\"$if_band\",\"band_label\":\"$if_band_label\",\"signal\":${cur_sig:-"-55"},\"is_guest\":$(bool $((is_guest == 1))),\"rx_bytes\":${cur_rx:-0},\"tx_bytes\":${cur_tx:-0}}"
									if [ "$is_guest" = 1 ]; then
										guest_count=$((guest_count + 1))
									else
										main_count=$((main_count + 1))
									fi
									;;
							esac
						fi
						cur_mac="$(printf '%s' "$line" | awk '{print $2}' | tr 'a-f' 'A-F')"
						cur_sig=""
						cur_rx=""
						cur_tx=""
						;;
					*signal:*)
						cur_sig="$(printf '%s' "$line" | grep -oE '[-][0-9]+' | head -n1 || echo "-55")"
						;;
					*rx\ bytes:*)
						cur_rx="$(printf '%s' "$line" | grep -oE '[0-9]+' | head -n1 || echo 0)"
						;;
					*tx\ bytes:*)
						cur_tx="$(printf '%s' "$line" | grep -oE '[0-9]+' | head -n1 || echo 0)"
						;;
				esac
			done
			unset IFS

			if [ -n "$cur_mac" ]; then
				case " $seen_macs " in
					*" $cur_mac "*) ;;
					*)
						seen_macs="$seen_macs $cur_mac"
						local dev_ip=""
						local dev_name=""
						if [ -f "$leases_file" ]; then
							dev_ip="$(awk -v m="$(printf '%s' "$cur_mac" | tr 'A-F' 'a-f')" '$2==m {print $3; exit}' "$leases_file" 2>/dev/null || true)"
							dev_name="$(awk -v m="$(printf '%s' "$cur_mac" | tr 'A-F' 'a-f')" '$2==m {print $4; exit}' "$leases_file" 2>/dev/null || true)"
						fi
						[ -z "$dev_ip" ] && [ -f /proc/net/arp ] && dev_ip="$(awk -v m="$(printf '%s' "$cur_mac" | tr 'A-F' 'a-f')" '$4==m {print $1; exit}' /proc/net/arp 2>/dev/null || true)"
						[ -z "$dev_ip" ] && dev_ip="—"
						[ -z "$dev_name" ] || [ "$dev_name" = "*" ] && dev_name="Dispositivo Wi-Fi"

						[ "$first_stat" = 1 ] && first_stat=0 || stations_json="${stations_json},"
						stations_json="${stations_json}{\"mac\":\"$cur_mac\",\"ip\":\"$dev_ip\",\"name\":\"$dev_name\",\"ifname\":\"$wif\",\"ssid\":\"$if_ssid\",\"band\":\"$if_band\",\"band_label\":\"$if_band_label\",\"signal\":${cur_sig:-"-55"},\"is_guest\":$(bool $((is_guest == 1))),\"rx_bytes\":${cur_rx:-0},\"tx_bytes\":${cur_tx:-0}}"
						if [ "$is_guest" = 1 ]; then
							guest_count=$((guest_count + 1))
						else
							main_count=$((main_count + 1))
						fi
						;;
				esac
			fi
		fi

		if command -v iwinfo >/dev/null 2>&1; then
			local assoc_out="$(iwinfo "$wif" assoclist 2>/dev/null || true)"
			if [ -n "$assoc_out" ]; then
				for m in $(printf '%s\n' "$assoc_out" | grep -oE '([0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}' | tr 'a-f' 'A-F'); do
					case " $seen_macs " in
						*" $m "*) ;;
						*)
							seen_macs="$seen_macs $m"
							local dev_ip=""
							local dev_name=""
							if [ -f "$leases_file" ]; then
								dev_ip="$(awk -v mm="$(printf '%s' "$m" | tr 'A-F' 'a-f')" '$2==mm {print $3; exit}' "$leases_file" 2>/dev/null || true)"
								dev_name="$(awk -v mm="$(printf '%s' "$m" | tr 'A-F' 'a-f')" '$2==mm {print $4; exit}' "$leases_file" 2>/dev/null || true)"
							fi
							[ -z "$dev_ip" ] && [ -f /proc/net/arp ] && dev_ip="$(awk -v mm="$(printf '%s' "$m" | tr 'A-F' 'a-f')" '$4==mm {print $1; exit}' /proc/net/arp 2>/dev/null || true)"
							[ -z "$dev_ip" ] && dev_ip="—"
							[ -z "$dev_name" ] || [ "$dev_name" = "*" ] && dev_name="Dispositivo Wi-Fi"

							[ "$first_stat" = 1 ] && first_stat=0 || stations_json="${stations_json},"
							stations_json="${stations_json}{\"mac\":\"$m\",\"ip\":\"$dev_ip\",\"name\":\"$dev_name\",\"ifname\":\"$wif\",\"ssid\":\"$if_ssid\",\"band\":\"$if_band\",\"band_label\":\"$if_band_label\",\"signal\":-55,\"is_guest\":$(bool $((is_guest == 1))),\"rx_bytes\":0,\"tx_bytes\":0}"
							if [ "$is_guest" = 1 ]; then
								guest_count=$((guest_count + 1))
							else
								main_count=$((main_count + 1))
							fi
							;;
					esac
				done
			fi
		fi
	done

	local wired_json=""
	local wired_count=0
	local first_wired=1
	local arp_file="/proc/net/arp"
	[ -n "${ARK_ROOT}" ] && [ -f "${ARK_ROOT}/proc/net/arp" ] && arp_file="${ARK_ROOT}/proc/net/arp"
	if [ -f "$arp_file" ]; then
		while read -r a_ip a_hw a_flags a_mac a_mask a_dev; do
			[ "$a_ip" = "IP" ] && continue
			[ "$a_flags" = "0x2" ] || continue
			local u_mac="$(printf '%s' "$a_mac" | tr 'a-f' 'A-F')"
			[ "$u_mac" = "00:00:00:00:00:00" ] && continue
			case " $seen_macs " in
				*" $u_mac "*) ;;
				*)
					seen_macs="$seen_macs $u_mac"
					local dev_name=""
					if [ -f "$leases_file" ]; then
						dev_name="$(awk -v mm="$(printf '%s' "$u_mac" | tr 'A-F' 'a-f')" '$2==mm {print $4; exit}' "$leases_file" 2>/dev/null || true)"
					fi
					[ -z "$dev_name" ] || [ "$dev_name" = "*" ] && dev_name="Aparelho Cabeado"

					[ "$first_wired" = 1 ] && first_wired=0 || wired_json="${wired_json},"
					wired_json="${wired_json}{\"mac\":\"$u_mac\",\"ip\":\"$a_ip\",\"name\":\"$dev_name\",\"device\":\"$a_dev\",\"is_guest\":false}"
					wired_count=$((wired_count + 1))
					;;
			esac
		done < "$arp_file"
	fi

	local total_wifi=$((main_count + guest_count))
	printf '{"main_wifi_count":%d,"guest_wifi_count":%d,"total_wifi_count":%d,"total_wired_count":%d,"stations":[%s],"wired":[%s]}\n' \
		"$main_count" "$guest_count" "$total_wifi" "$wired_count" "$stations_json" "$wired_json"
}

speedtest_history_file() {
	case "$1" in wan|wan2) ;; *) return 1 ;; esac
	mkdir -p /etc/ark-router/speedtest-history
	printf '/etc/ark-router/speedtest-history/%s.jsonl' "$1"
}

speedtest_history_append() {
	wan="$1"; result_file="$2"
	file="$(speedtest_history_file "$wan")" || return 0
	stamp="$(date +%Y-%m-%dT%H:%M:%S%z 2>/dev/null || date)"
	download="$(jsonfilter -i "$result_file" -e '@.download_mbps' 2>/dev/null || printf 0)"
	latency="$(jsonfilter -i "$result_file" -e '@.latency_ms' 2>/dev/null || printf 0)"
	upload="$(jsonfilter -i "$result_file" -e '@.suggested_kbps.balanced' 2>/dev/null || printf 0)"
	conservative="$(jsonfilter -i "$result_file" -e '@.suggested_kbps.conservative' 2>/dev/null || printf 0)"
	aggressive="$(jsonfilter -i "$result_file" -e '@.suggested_kbps.aggressive' 2>/dev/null || printf 0)"
	source_ip="$(jsonfilter -i "$result_file" -e '@.source_ip' 2>/dev/null || true)"
	printf '{"time":"%s","wan":"%s","source_ip":"%s","download_mbps":%s,"latency_ms":%s,"suggested_kbps":{"conservative":%s,"balanced":%s,"aggressive":%s}}\n' \
		"$(json_escape "$stamp")" "$wan" "$(json_escape "$source_ip")" "$download" "$latency" "$conservative" "$upload" "$aggressive" >>"$file"
	tail -n 12 "$file" >"$file.tmp" && mv "$file.tmp" "$file"
}

speedtest_history_json() {
	wan="$1"; file="$(speedtest_history_file "$wan")" || { printf '{"items":[],"average":{}}'; return 0; }
	[ -s "$file" ] || { printf '{"items":[],"average":{}}'; return 0; }
	last="$(tail -n 3 "$file")"
	printf '{"items":['
	first=1
	printf '%s\n' "$last" | while IFS= read -r line; do
		[ -n "$line" ] || continue
		[ "$first" = 1 ] || printf ','
		first=0
		printf '%s' "$line"
	done
	printf '],"average":'
	awk '
		BEGIN{n=0; dn=0; d=0; l=0; c=0; b=0; a=0}
		{
			if (match($0, /"download_mbps":[0-9.]+/)) { v=substr($0,RSTART+16,RLENGTH-16); if (v+0 > 0) { d+=v; dn++ } }
			if (match($0, /"latency_ms":[0-9.]+/)) { v=substr($0,RSTART+13,RLENGTH-13); l+=v }
			if (match($0, /"conservative":[0-9]+/)) { v=substr($0,RSTART+15,RLENGTH-15); c+=v }
			if (match($0, /"balanced":[0-9]+/)) { v=substr($0,RSTART+11,RLENGTH-11); b+=v }
			if (match($0, /"aggressive":[0-9]+/)) { v=substr($0,RSTART+13,RLENGTH-13); a+=v }
			n++
		}
		END{
			if(n<1){printf "{}"; exit}
			printf "{\"count\":%d,\"download_mbps\":%.2f,\"latency_ms\":%.2f,\"suggested_kbps\":{\"conservative\":%d,\"balanced\":%d,\"aggressive\":%d}}", n, (dn ? d/dn : 0), l/n, c/n, b/n, a/n
		}' <<EOF
$last
EOF
	printf '}'
}

speedtest_schedule_weak_cleanup() {
	command -v speedtest-go >/dev/null 2>&1 && return 0
	[ -x /tmp/ark-speedtest/speedtest-go ] || return 0
	tmp_total="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $2}')"; [ -n "$tmp_total" ] || tmp_total=0
	[ "$tmp_total" -le "${ARK_SPEEDTEST_WEAK_TMP_KB:-160000}" ] || return 0
	(
		sleep "${ARK_SPEEDTEST_CLEANUP_DELAY:-300}"
		grep -q 'running' /tmp/ark-speedtest-wan.status 2>/dev/null && exit 0
		grep -q 'running' /tmp/ark-speedtest-wan2.status 2>/dev/null && exit 0
		rm -rf /tmp/ark-speedtest /tmp/ark-speedtest-download
		echo cleaned >/tmp/ark-speedtest-cleanup.status
	) >/dev/null 2>&1 &
}

speedtest_download_fallback_mbps() {
	wan_src="$1"
	bind_opt=""
	[ -n "$wan_src" ] && bind_opt="--bind-address=$wan_src"

	# 1. Tenta obter múltiplos alvos da Netflix CDN (Fast.com) para multi-stream paralelo
	token="YXNkZmFzZGxmbnNkYWZoYXNkZmhrYWxm"
	fast_meta="$(wget $bind_opt -T 4 -qO- --no-check-certificate "https://api.fast.com/netflix/speedtest/v2?https=true&token=${token}&urlCount=4" 2>/dev/null)"
	urls="$(printf '%s' "$fast_meta" | grep -o 'https://[^"]*')"

	if [ -n "$urls" ]; then
		start="$(awk '{print $1}' /proc/uptime 2>/dev/null)"
		pids=""
		count=0
		for u in $urls $urls; do
			count=$((count + 1))
			[ "$count" -gt 8 ] && break
			wget $bind_opt -T 15 -qO- --no-check-certificate "${u}&range=0-26214400" >/dev/null 2>&1 &
			pids="$pids $!"
		done
		wait $pids
		end="$(awk '{print $1}' /proc/uptime 2>/dev/null)"
		awk -v s="$start" -v e="$end" -v count="$count" 'BEGIN{
			dt=e-s
			if (dt < 0.2) dt=0.2
			mbps=(count * 26.2144 * 8) / dt
			if (mbps > 0) printf "%.2f", mbps
			else printf "0"
		}'
		return 0
	fi

	# 2. Fallback Cloudflare Multi-Stream com User-Agent
	start="$(awk '{print $1}' /proc/uptime 2>/dev/null)"
	pids=""
	count=4
	for i in 1 2 3 4; do
		wget $bind_opt -T 15 -qO- --no-check-certificate --header='User-Agent: Mozilla/5.0' "https://speed.cloudflare.com/__down?bytes=25000000" >/dev/null 2>&1 &
		pids="$pids $!"
	done
	wait $pids
	end="$(awk '{print $1}' /proc/uptime 2>/dev/null)"
	awk -v s="$start" -v e="$end" -v count="$count" 'BEGIN{
		dt=e-s
		if (dt < 0.2) dt=0.2
		mbps=(count * 25.0 * 8) / dt
		if (mbps > 0) printf "%.2f", mbps
		else printf "0"
	}'
}

device_limits_json() {
	[ -f /etc/config/equipe_devices ] || { printf '{}\n'; return 0; }
	first=1
	printf '{'
	for sec in $(uci -q show equipe_devices 2>/dev/null | grep '=device$' | cut -d. -f2 | cut -d= -f1); do
		enabled="$(uci -q get "equipe_devices.$sec.limit_enabled" || printf 0)"
		down="$(uci -q get "equipe_devices.$sec.limit_down" || printf 0)"
		up="$(uci -q get "equipe_devices.$sec.limit_up" || printf 0)"
		lan_bypass="$(uci -q get "equipe_devices.$sec.limit_lan_bypass" || printf 1)"
		[ "$lan_bypass" = 0 ] || [ "$lan_bypass" = false ] && lan_bypass=false || lan_bypass=true
		dev_mac="$(uci -q get "equipe_devices.$sec.mac" | tr 'a-f' 'A-F')"
		[ -n "$dev_mac" ] || continue
		[ "$first" = 1 ] || printf ','
		first=0
		printf '"%s":{"enabled":%s,"down":%d,"up":%d,"lan_bypass":%s}' "$dev_mac" "$( [ "$enabled" = 1 ] && printf true || printf false )" "$down" "$up" "$lan_bypass"
	done
	printf '}\n'
}

apply_device_bandwidth_limits() {
	[ -f /etc/config/equipe_devices ] || return 0
	mkdir -p /etc/ark
	nft_file="/etc/ark/ark_device_limits.nft"
	apply_sh="/etc/ark/apply_limits.sh"
	tmp_nft="/tmp/ark_device_limits.nft.$$"
	has_rules=0

	# Clean up any legacy file that might break fw4
	rm -f /etc/nftables.d/ark_device_limits.nft 2>/dev/null || true

	printf 'table inet ark_device_limits\ndelete table inet ark_device_limits\ntable inet ark_device_limits {\n\tchain forward_limits {\n\t\ttype filter hook forward priority filter - 5; policy accept;\n' > "$tmp_nft"

	for sec in $(uci -q show equipe_devices 2>/dev/null | grep '=device$' | cut -d. -f2 | cut -d= -f1); do
		enabled="$(uci -q get "equipe_devices.$sec.limit_enabled" || printf 0)"
		[ "$enabled" = 1 ] || continue
		down_mbps="$(uci -q get "equipe_devices.$sec.limit_down" || printf 0)"
		up_mbps="$(uci -q get "equipe_devices.$sec.limit_up" || printf 0)"
		[ "$down_mbps" -gt 0 ] || [ "$up_mbps" -gt 0 ] || continue
		dev_mac="$(uci -q get "equipe_devices.$sec.mac" | tr 'A-F' 'a-f')"
		[ -n "$dev_mac" ] || continue
		lan_bypass="$(uci -q get "equipe_devices.$sec.limit_lan_bypass" || printf 1)"
		[ "$lan_bypass" = 0 ] || [ "$lan_bypass" = false ] && lan_bypass=0 || lan_bypass=1

		dev_ip=""
		for hsec in $(uci -q show dhcp 2>/dev/null | grep '=host$' | cut -d. -f2 | cut -d= -f1); do
			if [ "$(uci -q get "dhcp.$hsec.mac" | tr 'A-F' 'a-f')" = "$dev_mac" ]; then
				dev_ip="$(uci -q get "dhcp.$hsec.ip")"
				break
			fi
		done
		if [ -z "$dev_ip" ] && [ -f /tmp/dhcp.leases ]; then
			dev_ip="$(awk -v m="$dev_mac" '$2==m {print $3; exit}' /tmp/dhcp.leases)"
		fi
		if [ -z "$dev_ip" ]; then
			dev_ip="$(ip neigh show 2>/dev/null | awk -v m="$dev_mac" '$5==m {print $1; exit}')"
		fi

		if [ -n "$dev_ip" ]; then
			if [ "$lan_bypass" = 1 ]; then
				if [ "$down_mbps" -gt 0 ]; then
					down_kbps=$((down_mbps * 125))
					printf '\t\tip daddr %s ip saddr != { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 } limit rate over %d kbytes/second drop\n' "$dev_ip" "$down_kbps" >> "$tmp_nft"
					has_rules=1
				fi
				if [ "$up_mbps" -gt 0 ]; then
					up_kbps=$((up_mbps * 125))
					printf '\t\tip saddr %s ip daddr != { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 } limit rate over %d kbytes/second drop\n' "$dev_ip" "$up_kbps" >> "$tmp_nft"
					has_rules=1
				fi
			else
				if [ "$down_mbps" -gt 0 ]; then
					down_kbps=$((down_mbps * 125))
					printf '\t\tip daddr %s limit rate over %d kbytes/second drop\n' "$dev_ip" "$down_kbps" >> "$tmp_nft"
					has_rules=1
				fi
				if [ "$up_mbps" -gt 0 ]; then
					up_kbps=$((up_mbps * 125))
					printf '\t\tip saddr %s limit rate over %d kbytes/second drop\n' "$dev_ip" "$up_kbps" >> "$tmp_nft"
					has_rules=1
				fi
			fi
		else
			if [ "$lan_bypass" = 1 ]; then
				if [ "$up_mbps" -gt 0 ]; then
					up_kbps=$((up_mbps * 125))
					printf '\t\tether saddr %s ip daddr != { 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 } limit rate over %d kbytes/second drop\n' "$dev_mac" "$up_kbps" >> "$tmp_nft"
					has_rules=1
				fi
			else
				if [ "$up_mbps" -gt 0 ]; then
					up_kbps=$((up_mbps * 125))
					printf '\t\tether saddr %s limit rate over %d kbytes/second drop\n' "$dev_mac" "$up_kbps" >> "$tmp_nft"
					has_rules=1
				fi
			fi
		fi
	done

	printf '\t}\n}\n' >> "$tmp_nft"

	if [ "$has_rules" = 1 ]; then
		if ! /usr/sbin/nft -c -f "$tmp_nft" 2>/dev/null; then
			rm -f "$tmp_nft"
			echo "Erro de sintaxe nftables no arquivo de limites" >&2
			return 1
		fi
		mv -f "$tmp_nft" "$nft_file"
		cat << 'EOF' > "$apply_sh"
#!/bin/sh
[ -f /etc/ark/ark_device_limits.nft ] && /usr/sbin/nft -f /etc/ark/ark_device_limits.nft 2>/dev/null || true
EOF
		chmod +x "$apply_sh"
		nft delete table inet ark_device_limits 2>/dev/null || true
		nft -f "$nft_file" 2>/dev/null || true
		uci -q set firewall.ark_limits=include
		uci -q set firewall.ark_limits.type=script
		uci -q set "firewall.ark_limits.path=$apply_sh"
		uci -q set firewall.ark_limits.fw4_compatible='1'
		uci commit firewall
	else
		rm -f "$tmp_nft" "$nft_file" "$apply_sh" 2>/dev/null || true
		nft delete table inet ark_device_limits 2>/dev/null || true
		uci -q delete firewall.ark_limits 2>/dev/null || true
		uci commit firewall
	fi
}

device_apply_parental() {
	p_mac="$1"
	p_ip="$2"
	p_name="$3"
	p_mode="${4:-default}"
	p_block="${5:-0}"
	p_safe="${6:-0}"
	p_services="${7:-}"
	p_suffix="$(device_suffix "$p_mac")"

	agh_active=0
	if [ -x /usr/bin/AdGuardHome ] && [ "$(uci -q get equipe_perf.settings.adblock_cloud || echo 0)" != "1" ] && [ -f /etc/adguardhome/adguardhome.yaml ]; then
		agh_active=1
	fi

	if [ "$agh_active" = "1" ] && command -v python3 >/dev/null 2>&1; then
		python3 -c "
import sys, re

yaml_path = '/etc/adguardhome/adguardhome.yaml'
mac = sys.argv[1]
ip = sys.argv[2]
name = sys.argv[3] or mac
mode = sys.argv[4]
p_block = (sys.argv[5] == '1')
s_safe = (sys.argv[6] == '1')
services = [s.strip() for s in sys.argv[7].split(',') if s.strip()]

try:
    with open(yaml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    idx_p = content.find('  persistent:')
    if idx_p != -1:
        eol_p = content.find('\\n', idx_p)
        if eol_p == -1: eol_p = len(content)
        idx_log = content.find('\\nlog:\\n', idx_p)
        if idx_log == -1:
            idx_log = content.find('\\nlog:', idx_p)
        if idx_log == -1:
            idx_log = len(content)

        before = content[:idx_p] + '  persistent:'
        after = content[idx_log:]
        mid = content[eol_p:idx_log]

        client_blocks = []
        current = []
        for line in mid.splitlines(True):
            if line.startswith('    - '):
                if current and any(c.strip() for c in current):
                    client_blocks.append(''.join(current))
                    current = []
            current.append(line)
        if current and any(c.strip() for c in current):
            client_blocks.append(''.join(current))

        filtered_blocks = []
        mac_clean = mac.lower().replace(':', '')
        name_clean = name.lower()
        for block in client_blocks:
            b_clean = block.lower().replace(':', '')
            if (mac_clean and mac_clean in b_clean) or (ip and ip in block) or (name_clean and ('name: \"' + name_clean + '\"' in b_clean or 'name: ' + name_clean in b_clean)):
                continue
            filtered_blocks.append(block)

        if mode in ('custom', 'bypass'):
            ids_lines = ('        - \"' + ip + '\"\\n') if ip else ''
            if mac:
                ids_lines += '        - \"' + mac.lower() + '\"'

            name_escaped = name.replace('\\\\', '\\\\\\\\').replace('\"', '\\\\\"')

            if mode == 'bypass':
                new_client = f'''    - name: \"{name_escaped}\"
      ids:
{ids_lines}
      use_global_settings: false
      filtering_enabled: false
      parental_enabled: false
      safesearch_enabled: false
      safe_search:
        enabled: false
        bing: false
        duckduckgo: false
        ecosia: false
        google: false
        pixabay: false
        yandex: false
        youtube: false
      use_global_blocked_services: false
      blocked_services:
        schedule:
          time_zone: UTC
        ids: []'''
            else:
                clean_services = [re.sub(r'[^a-zA-Z0-9_.-]', '', s) for s in services if s]
                clean_services = [s for s in clean_services if s]
                if clean_services:
                    s_lines = '\\n'.join(['          - ' + s for s in clean_services])
                    services_block = '      blocked_services:\\n        schedule:\\n          time_zone: UTC\\n        ids:\\n' + s_lines
                else:
                    services_block = '      blocked_services:\\n        schedule:\\n          time_zone: UTC\\n        ids: []'

                p_str = 'true' if p_block else 'false'
                s_str = 'true' if s_safe else 'false'

                new_client = f'''    - name: \"{name_escaped}\"
      ids:
{ids_lines}
      use_global_settings: false
      filtering_enabled: true
      parental_enabled: {p_str}
      safesearch_enabled: {s_str}
      safe_search:
        enabled: {s_str}
        bing: {s_str}
        duckduckgo: {s_str}
        ecosia: {s_str}
        google: {s_str}
        pixabay: {s_str}
        yandex: {s_str}
        youtube: {s_str}
      use_global_blocked_services: false
{services_block}'''

            filtered_blocks.append(new_client)

        if filtered_blocks:
            new_mid = '\\n' + '\\n'.join([b.strip('\\n') for b in filtered_blocks]) + '\\n'
            new_content = before + new_mid + '\\n' + after.lstrip('\\n')
        else:
            new_mid = ' []\\n'
            new_content = before + new_mid + after.lstrip('\\n')
        with open(yaml_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
except Exception:
    pass
" "$p_mac" "$p_ip" "$p_name" "$p_mode" "$p_block" "$p_safe" "$p_services"
		chown -R adguardhome:adguardhome /etc/adguardhome /var/lib/adguardhome 2>/dev/null || true
		chmod 644 /etc/adguardhome/adguardhome.yaml 2>/dev/null || true
		if pgrep -f 'AdGuardHome' >/dev/null 2>&1 && [ "$(uci -q get equipe_perf.settings.adblock_enabled || echo 0)" = "1" ] && [ "$(uci -q get equipe_perf.settings.adguard_enabled || echo 0)" = "1" ]; then
			/etc/init.d/adguardhome restart >/dev/null 2>&1 || true
		fi
	fi

	has_custom_dns="$(uci -q get "equipe_devices.device_$(printf '%s' "$p_mac" | tr -d ':').custom_dns" || true)"
	if [ "$p_mode" = "bypass" ] || [ -n "$has_custom_dns" ]; then
		if [ -n "$(uci -q get "firewall.ark_par_$p_suffix" 2>/dev/null)" ]; then
			uci -q delete "firewall.ark_par_$p_suffix"
			uci commit firewall
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
		fi
	elif [ "$p_mode" = "custom" ] && [ "$agh_active" != "1" ]; then
		if [ "$p_block" = "1" ] || [ "$p_safe" = "1" ]; then
			uci -q set "firewall.ark_par_$p_suffix=redirect"
			uci -q set "firewall.ark_par_$p_suffix.name=ARK-Parental-$p_mac"
			uci -q set "firewall.ark_par_$p_suffix.src=lan"
			uci -q set "firewall.ark_par_$p_suffix.proto=tcp udp"
			uci -q set "firewall.ark_par_$p_suffix.src_dport=53"
			uci -q set "firewall.ark_par_$p_suffix.dest_ip=94.140.14.15"
			uci -q set "firewall.ark_par_$p_suffix.dest_port=53"
			uci -q set "firewall.ark_par_$p_suffix.target=DNAT"
			[ -n "$p_mac" ] && uci -q set "firewall.ark_par_$p_suffix.src_mac=$p_mac"
			[ -n "$p_ip" ] && uci -q set "firewall.ark_par_$p_suffix.src_ip=$p_ip"
			uci -q set "firewall.ark_par_$p_suffix.enabled=1"
		else
			uci -q delete "firewall.ark_par_$p_suffix"
		fi
		uci commit firewall
		/etc/init.d/firewall reload >/dev/null 2>&1 || true
	else
		if [ -n "$(uci -q get "firewall.ark_par_$p_suffix" 2>/dev/null)" ]; then
			uci -q delete "firewall.ark_par_$p_suffix"
			uci commit firewall
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
		fi
	fi
}

can_install_speedtest_flash() {
	avail_kb="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"
	total_kb="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $2}')"
	[ -n "$avail_kb" ] || avail_kb="$(df -k / 2>/dev/null | awk 'NR==2{print $4}')"
	[ -n "$total_kb" ] || total_kb="$(df -k / 2>/dev/null | awk 'NR==2{print $2}')"
	needed_kb=5120
	if [ -n "$avail_kb" ] && [ -n "$total_kb" ] && [ "$total_kb" -gt 0 ]; then
		remaining_kb=$((avail_kb - needed_kb))
		if [ "$remaining_kb" -gt 10240 ]; then
			percent_free=$((remaining_kb * 100 / total_kb))
			[ "$percent_free" -ge 20 ] && return 0
		fi
	fi
	return 1
}

speedtest_storage_json() {
	tmp_avail="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $4}')"
	tmp_total="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $2}')"
	overlay_avail="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"
	[ -n "$tmp_avail" ] || tmp_avail=0
	[ -n "$tmp_total" ] || tmp_total=0
	[ -n "$overlay_avail" ] || overlay_avail=0
	min_kb="${ARK_SPEEDTEST_RAM_MIN_KB:-25600}"
	weak=false
	[ "$tmp_avail" -lt "$min_kb" ] && weak=true
	recommended=auto
	$weak && recommended=fast_manual
	printf '"storage":{"tmp_avail_kb":%s,"tmp_total_kb":%s,"overlay_avail_kb":%s,"need_ram_kb":%s,"weak_router":%s,"recommended":"%s"}' \
		"$tmp_avail" "$tmp_total" "$overlay_avail" "$min_kb" "$weak" "$recommended"
}

prepare_speedtest() {
	command -v speedtest-go >/dev/null 2>&1 && return 0
	[ -x /tmp/ark-speedtest/speedtest-go ] && return 0
	tmp_avail="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $4}')"; [ -n "$tmp_avail" ] || tmp_avail=0
	min_kb="${ARK_SPEEDTEST_RAM_MIN_KB:-25600}"
	[ "$tmp_avail" -ge "$min_kb" ] || { echo "RAM /tmp insuficiente para medidor automatico. Use Fast.com/manual." >&2; return 3; }
	if can_install_speedtest_flash; then
		pm="$(ark_package_manager)"
		if [ "$pm" = apk ]; then
			ark_run_limited 90 apk update >/dev/null 2>&1 && ark_run_limited 120 apk add speedtest-go >/dev/null 2>&1
			command -v speedtest-go >/dev/null 2>&1 && return 0
		elif [ "$pm" = opkg ]; then
			opkg update >/dev/null 2>&1 && opkg install speedtest-go >/dev/null 2>&1
			command -v speedtest-go >/dev/null 2>&1 && return 0
		fi
	fi
	command -v apk >/dev/null 2>&1 || return 1
	# OpenWrt keeps APK indexes in volatile storage. They disappear on reboot,
	# so refresh them before trying to fetch the temporary speed-test package.
	ark_run_limited 90 apk update || return 1
	stage=/tmp/ark-speedtest-download
	rm -rf "$stage" && mkdir -p "$stage/root" /tmp/ark-speedtest || return 1
	if command -v wget >/dev/null 2>&1; then
		version="$(apk policy speedtest-go 2>/dev/null | awk '/^[[:space:]]+[0-9]/{gsub(/:$/, "", $1); print $1; exit}')"
		repo="$(apk policy speedtest-go 2>/dev/null | awk '/^[[:space:]]+https?:\/\//{gsub(/^\[|\]$/, "", $1); sub(/\/packages\.adb$/, "", $1); print $1; exit}')"
		if [ -n "$version" ] && [ -n "$repo" ]; then
			wget -T 45 --no-check-certificate -O "$stage/speedtest-go-$version.apk" "$repo/speedtest-go-$version.apk" >/dev/null 2>&1 || {
				rm -rf "$stage"
				return 1
			}
		else
			ark_run_limited 120 apk fetch --output "$stage" speedtest-go || { rm -rf "$stage"; return 1; }
		fi
	else
		ark_run_limited 120 apk fetch --output "$stage" speedtest-go || { rm -rf "$stage"; return 1; }
	fi
	set -- "$stage"/*.apk; package_file="$1"
	[ -f "$package_file" ] || { rm -rf "$stage"; return 1; }
	apk --allow-untrusted extract --destination "$stage/root" "$package_file" || { rm -rf "$stage"; return 1; }
	[ -x "$stage/root/usr/bin/speedtest-go" ] || { rm -rf "$stage"; return 1; }
	cp "$stage/root/usr/bin/speedtest-go" /tmp/ark-speedtest/speedtest-go && chmod 755 /tmp/ark-speedtest/speedtest-go || { rm -rf "$stage"; return 1; }
	rm -rf "$stage"
}

satellite_sync_master_leases_if_needed() {
	local role="$(uci -q get equipe_dashboard.general.role || true)"
	local net_mode="$(uci -q get equipe_dashboard.main.network_mode || true)"
	local dhcp_off="$(uci -q get dhcp.lan.ignore || true)"

	# Only in secondary / AP mode
	if [ "$role" != "secondary" ] && [ "$role" != "satellite" ] && [ "$net_mode" != "ap" ] && [ "$dhcp_off" != "1" ]; then
		return 0
	fi

	local gw="$(uci -q get network.lan.gateway || true)"
	[ -n "$gw" ] || gw="$(ip -4 route show default 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="via") print $(i+1)}' | head -n 1)"
	[ -n "$gw" ] || gw="192.168.73.1"

	# Throttle / Cache: 15 seconds
	local now="$(date +%s)"
	local mtime=0
	if [ -f /tmp/dhcp.leases ]; then
		mtime="$(date -r /tmp/dhcp.leases +%s 2>/dev/null || stat -c %Y /tmp/dhcp.leases 2>/dev/null || echo 0)"
	fi
	local diff=$((now - mtime))
	if [ "$diff" -lt 15 ] && [ -s /tmp/dhcp.leases ]; then
		return 0
	fi

	local tmp_file="/tmp/dhcp.leases.tmp.$$"
	if command -v uclient-fetch >/dev/null 2>&1; then
		uclient-fetch -q -T 2 -O "$tmp_file" "http://${gw}/cgi-bin/ark-mesh-export?action=leases" 2>/dev/null || rm -f "$tmp_file"
	elif command -v wget >/dev/null 2>&1; then
		wget -qO "$tmp_file" -T 2 "http://${gw}/cgi-bin/ark-mesh-export?action=leases" 2>/dev/null || rm -f "$tmp_file"
	fi

	if [ -s "$tmp_file" ]; then
		mv -f "$tmp_file" /tmp/dhcp.leases
		chmod 644 /tmp/dhcp.leases
	else
		rm -f "$tmp_file"
	fi
}

get_device_fingerprints() {
	satellite_sync_master_leases_if_needed

	local fp_dir="/tmp/ark_fp"
	mkdir -p "$fp_dir" 2>/dev/null
	if [ -f /tmp/dhcp.leases ]; then
		while read -r l_ts l_mac l_ip l_name l_clid; do
			[ -n "$l_mac" ] || continue
			local fp_file="$fp_dir/$l_mac"
			if [ ! -f "$fp_file" ] && [ -n "$l_name" ] && [ "$l_name" != "*" ]; then
				printf 'mac=%s\nip=%s\nhostname=%s\nts=%s\n' "$l_mac" "$l_ip" "$l_name" "${l_ts:-0}" > "$fp_file" 2>/dev/null || true
			fi
		done < /tmp/dhcp.leases
	fi
	local first=1
	printf '{'
	for f in "$fp_dir"/*; do
		[ -f "$f" ] || continue
		local fmac="" fip="" fhost="" fvc="" fopt55="" fts=""
		while IFS='=' read -r key val; do
			case "$key" in
				mac) fmac="$val" ;;
				ip) fip="$val" ;;
				hostname) fhost="$val" ;;
				vendor_class) fvc="$val" ;;
				opt55) fopt55="$val" ;;
				ts) fts="$val" ;;
			esac
		done < "$f"
		[ -n "$fmac" ] || fmac="$(basename "$f")"
		[ "$first" = 1 ] && first=0 || printf ','
		printf '"%s":{"ip":"%s","hostname":"%s","vendor_class":"%s","opt55":"%s","ts":%s}' \
			"$fmac" \
			"$(json_escape "$fip")" \
			"$(json_escape "$fhost")" \
			"$(json_escape "$fvc")" \
			"$(json_escape "$fopt55")" \
			"${fts:-0}"
	done
	printf '}\n'
}

setup_dhcp_fingerprint_hook() {
	local hook_script="/usr/lib/ark/dhcp_fingerprint.sh"
	[ -f "$hook_script" ] || return 1
	chmod 755 "$hook_script" 2>/dev/null || true
	mkdir -p /tmp/ark_fp 2>/dev/null || true

	local cur_script="$(uci -q get dhcp.@dnsmasq[0].dhcpscript || true)"
	if [ "$cur_script" != "$hook_script" ]; then
		uci -q set "dhcp.@dnsmasq[0].dhcpscript=$hook_script"
		uci commit dhcp
		/etc/init.d/dnsmasq restart >/dev/null 2>&1 || /etc/init.d/dnsmasq reload >/dev/null 2>&1 || true
		printf '{"ok":true,"updated":true}\n'
		return 0
	fi
	printf '{"ok":true,"updated":false}\n'
	return 0
}

handle_devices() {
	case "$1" in
	device-fingerprints)
		get_device_fingerprints
		;;
	device-sync-master-leases|satellite-sync-leases|wifi-mesh-satellite-sync-leases)
		satellite_sync_master_leases_if_needed
		printf '{"ok":true,"count":%s}\n' "$(wc -l < /tmp/dhcp.leases 2>/dev/null || echo 0)"
		;;
	device-fingerprint-setup|device-fingerprints-setup|setup-fingerprint-hook|setup-dhcp-fingerprint)
		setup_dhcp_fingerprint_hook
		;;
	speedtest-start)
		case "$2" in wan) network=wan; sqm_section=wan1 ;; wan2) network=wan2; sqm_section=wan2 ;; *) echo 'WAN invalida' >&2; exit 2 ;; esac
		selected_wan="$2"
		feature_active speedtest || { echo 'Medidor indisponivel' >&2; exit 3; }
		status="/tmp/ark-speedtest-$2.status"; result="/tmp/ark-speedtest-$2.json"; log="/tmp/ark-speedtest-$2.log"
		grep -q 'running' "$status" 2>/dev/null && { echo running; exit 0; }
		ifstatus_json="$(ubus call "network.interface.$network" status 2>/dev/null)"
		source_ip="$(printf '%s\n' "$ifstatus_json" | jsonfilter -e '@["ipv4-address"][0].address')"
		[ -n "$source_ip" ] || { echo 'A interface nao possui IPv4 ativo' >&2; exit 3; }
		device="$(printf '%s\n' "$ifstatus_json" | jsonfilter -e '@.l3_device' 2>/dev/null)"
		[ -n "$device" ] || device="$(printf '%s\n' "$ifstatus_json" | jsonfilter -e '@.device' 2>/dev/null)"
		if [ -n "$device" ] && [ -r "/sys/class/net/$device/carrier" ]; then
			[ "$(cat "/sys/class/net/$device/carrier" 2>/dev/null)" = 1 ] || { echo 'A interface esta sem link fisico' >&2; exit 3; }
		fi
		echo 'running|5|Preparando teste' >"$status"; rm -f "$result"
		(
			bin="$(command -v speedtest-go 2>/dev/null || printf /tmp/ark-speedtest/speedtest-go)"
			restore_sqm() { uci -q revert "sqm.$sqm_section.enabled"; /etc/init.d/sqm restart >/dev/null 2>&1; }
			trap restore_sqm EXIT INT TERM
			echo 'running|10|Pausando SQM' >"$status"
			uci -q set "sqm.$sqm_section.enabled=0"; /etc/init.d/sqm restart >/dev/null 2>&1; sleep 2
			ok=0; uploads=''; download=0; latency=0; run=1
			while [ "$run" -le 3 ]; do
				file="/tmp/ark-speedtest-$2-run$run.json"
				if [ "$run" = 1 ]; then echo 'running|25|Medindo download e upload' >"$status"; ark_run_limited 45 "$bin" --json --multi --thread 8 --source "$source_ip" >"$file" 2>>"$log"
				else [ "$run" = 2 ] && echo 'running|55|Medindo upload 2/3' >"$status" || echo 'running|75|Medindo upload 3/3' >"$status"; ark_run_limited 35 "$bin" --json --no-download --multi --thread 8 --source "$source_ip" >"$file" 2>>"$log"; fi
				if [ $? -eq 0 ]; then
					u="$(jsonfilter -i "$file" -e '@.servers[0].ul_speed' 2>/dev/null)"; d="$(jsonfilter -i "$file" -e '@.servers[0].dl_speed' 2>/dev/null)"; l="$(jsonfilter -i "$file" -e '@.servers[0].latency' 2>/dev/null)"
					case "$u" in ''|*[!0-9.]*) ;; *) uploads="$uploads $u"; ok=$((ok+1));; esac
					[ "$run" = 1 ] && download="${d:-0}" && latency="${l:-0}"
				fi
				run=$((run+1))
			done
			if [ "$ok" -lt 2 ]; then restore_sqm; trap - EXIT INT TERM; echo error >"$status"; exit 1; fi
			if ! awk -v v="$download" 'BEGIN{exit !((v + 0) > 0)}'; then
				echo 'running|86|Download invalido; usando fallback multi-stream' >"$status"
				fallback_mbps="$(speedtest_download_fallback_mbps "$source_ip")"
				if awk -v v="$fallback_mbps" 'BEGIN{exit !((v + 0) > 0)}'; then
					download="$(awk -v v="$fallback_mbps" 'BEGIN{printf "%.2f", v*1000000/8}')"
					echo "download_fallback_mbps=$fallback_mbps" >>"$log"
				else
					echo "download_fallback_failed" >>"$log"
					download=0
				fi
			fi
			echo 'running|90|Calculando médias' >"$status"
			set -- $uploads; u1="$1"; u2="$2"; u3="${3:-$2}"
			metrics="$(awk -v d="$download" -v l="$latency" -v a="$u1" -v b="$u2" -v c="$u3" 'BEGIN{m=a;if(b<m)m=b;if(c<m)m=c;printf "%.2f %.2f %.2f %.2f %.2f %d %d %d",d*8/1000000,a*8/1000000,b*8/1000000,c*8/1000000,l/1000000,m*8/1000*.85,m*8/1000*.90,m*8/1000*.95}')"
			set -- $metrics
			speedify_state="$(speedify_state_value)"
			base="/tmp/ark-speedtest-$selected_wan-base.json"
			printf '{"wan":"%s","source_ip":"%s","speedify_state":"%s","download_mbps":%s,"upload_runs_mbps":[%s,%s,%s],"latency_ms":%s,"suggested_kbps":{"conservative":%s,"balanced":%s,"aggressive":%s}}\n' "$selected_wan" "$(json_escape "$source_ip")" "$(json_escape "$speedify_state")" "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" >"$base"
			speedtest_history_append "$selected_wan" "$base"
			history="$(speedtest_history_json "$selected_wan")"
			printf '{"wan":"%s","source_ip":"%s","speedify_state":"%s","download_mbps":%s,"upload_runs_mbps":[%s,%s,%s],"latency_ms":%s,"suggested_kbps":{"conservative":%s,"balanced":%s,"aggressive":%s},"history":%s}\n' "$selected_wan" "$(json_escape "$source_ip")" "$(json_escape "$speedify_state")" "$1" "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$history" >"$result"
			speedtest_schedule_weak_cleanup
			echo 'running|98|Restaurando SQM' >"$status"
			restore_sqm; trap - EXIT INT TERM
			echo done >"$status"
		) >"$log" 2>&1 &
		echo started
		;;
	speedtest-status)
		case "$2" in wan|wan2) ;; *) echo 'WAN invalida' >&2; exit 2 ;; esac
		cat "/tmp/ark-speedtest-$2.status" 2>/dev/null || echo idle
		;;
	speedtest-result)
		case "$2" in wan|wan2) ;; *) echo 'WAN invalida' >&2; exit 2 ;; esac
		if [ ! -s "/tmp/ark-speedtest-$2.json" ]; then
			printf '{"wan":"%s","history":%s}\n' "$2" "$(speedtest_history_json "$2")"
			exit 0
		fi
		cat "/tmp/ark-speedtest-$2.json"
		;;
	speedtest-apply)
		case "$2" in wan) sqm_section=wan1 ;; wan2) sqm_section=wan2 ;; *) echo 'WAN invalida' >&2; exit 2 ;; esac
		printf '%s' "$3" | grep -Eq '^[0-9]{3,7}$' || { echo 'Velocidade invalida' >&2; exit 2; }
		[ "$3" -ge 100 ] && [ "$3" -le 1000000 ] || { echo 'Velocidade fora do intervalo' >&2; exit 2; }
		uci -q set "sqm.$sqm_section.upload=$3"; uci -q set "sqm.$sqm_section.enabled=1"; uci commit sqm; /etc/init.d/sqm restart
		echo ok
		;;
	rename)
		mac="$(printf '%s' "$2" | tr 'a-f' 'A-F')"
		name="$3"
		printf '%s' "$mac" | grep -Eq '^([0-9A-F]{2}:){5}[0-9A-F]{2}$' || { echo 'MAC invalido' >&2; exit 2; }
		[ "${#name}" -le 48 ] || { echo 'Nome muito longo' >&2; exit 2; }
		section="device_$(printf '%s' "$mac" | tr -d ':')"
		if [ -z "$name" ]; then
			uci -q delete "equipe_devices.$section"
		else
			uci -q set "equipe_devices.$section=device"
			uci -q set "equipe_devices.$section.mac=$mac"
			uci -q set "equipe_devices.$section.name=$name"
		fi
		uci commit equipe_devices
		echo 'ok'
		;;
	device-reserve-secondary)
		mac="$(printf '%s' "$2" | tr '-' ':' | tr 'a-f' 'A-F' | tr -d ' ')"
		ip="$(printf '%s' "$3" | tr -d ' ,;\t\r\n')"
		name="$4"
		valid_mac "$mac" || { echo 'MAC invalido' >&2; exit 2; }
		if [ -z "$ip" ] || ! valid_ipv4 "$ip"; then
			lan_ip="$(uci -q get network.lan.ipaddr || printf '192.168.1.1')"
			subnet="${lan_ip%.*}"
			ip="${subnet}.2"
		fi
		same_managed_subnet "$ip" || { echo 'IP fora da sub-rede LAN gerenciada' >&2; exit 2; }
		suffix="$(device_suffix "$mac")"
		[ -n "$name" ] || name="ARK-Secundario-${suffix}"
		dns_host_name="$(printf '%s' "$name" | sed 's/[^a-zA-Z0-9_-]/-/g; s/\-{2,\}/-/g; s/^-//; s/-$//')"
		host="$(find_dhcp_host "$mac")"
		[ -n "$host" ] || host="ark_sec_$suffix"
		uci -q set "dhcp.$host=host"
		uci -q set "dhcp.$host.name=$dns_host_name"
		uci -q set "dhcp.$host.mac=$mac"
		uci -q set "dhcp.$host.ip=$ip"
		uci commit dhcp
		name_section="device_$(printf '%s' "$mac" | tr -d ':')"
		uci -q set "equipe_devices.$name_section=device"
		uci -q set "equipe_devices.$name_section.mac=$mac"
		uci -q set "equipe_devices.$name_section.name=$name"
		uci -q set "equipe_devices.$name_section.role=secondary"
		uci commit equipe_devices 2>/dev/null || true
		(sleep 1; /etc/init.d/dnsmasq reload 2>/dev/null || /etc/init.d/dnsmasq restart) >/dev/null 2>&1 &
		printf '{"ok":true,"mac":"%s","ip":"%s","name":"%s"}\n' "$mac" "$ip" "$name"
		;;
	device-reserve-quick|device-reserve-iot)
		mac="$(printf '%s' "$2" | tr '-' ':' | tr 'a-f' 'A-F' | tr -d ' ')"
		ip="$(printf '%s' "$3" | tr -d ' ,;\t\r\n')"
		name="$4"
		valid_mac "$mac" || { echo 'MAC invalido' >&2; exit 2; }
		valid_ipv4 "$ip" || { echo 'IP invalido' >&2; exit 2; }
		same_managed_subnet "$ip" || { echo 'IP fora da sub-rede LAN gerenciada' >&2; exit 2; }
		suffix="$(device_suffix "$mac")"
		[ -n "$name" ] || name="Dispositivo-${suffix}"
		dns_host_name="$(printf '%s' "$name" | sed 's/[^a-zA-Z0-9_-]/-/g; s/\-{2,\}/-/g; s/^-//; s/-$//')"
		[ -n "$dns_host_name" ] || dns_host_name="ark-$suffix"
		for h in $(uci -q show dhcp 2>/dev/null | grep -E '\.mac=' | cut -d. -f2 | cut -d= -f1); do
			hmac="$(uci -q get "dhcp.$h.mac" | tr 'a-f' 'A-F')"
			hip="$(uci -q get "dhcp.$h.ip")"
			if [ "$hmac" = "$mac" ] || [ "$hip" = "$ip" ]; then
				uci -q delete "dhcp.$h"
			fi
		done
		host="ark_$suffix"
		uci -q set "dhcp.$host=host"
		uci -q set "dhcp.$host.name=$dns_host_name"
		uci -q set "dhcp.$host.mac=$mac"
		uci -q set "dhcp.$host.ip=$ip"
		uci commit dhcp
		name_section="device_$(printf '%s' "$mac" | tr -d ':')"
		uci -q set "equipe_devices.$name_section=device"
		uci -q set "equipe_devices.$name_section.mac=$mac"
		uci -q set "equipe_devices.$name_section.name=$name"
		uci commit equipe_devices 2>/dev/null || true
		(sleep 1; /etc/init.d/dnsmasq reload 2>/dev/null || /etc/init.d/dnsmasq restart) >/dev/null 2>&1 &
		printf '{"ok":true,"mac":"%s","ip":"%s","name":"%s"}\n' "$mac" "$ip" "$name"
		;;
	device-status)
		mac="$(printf '%s' "$2" | tr 'a-f' 'A-F')"
		valid_mac "$mac" || { echo 'MAC invalido' >&2; exit 2; }
		suffix="$(device_suffix "$mac")"; host="$(find_dhcp_host "$mac")"; reserved=false; ip=''
		if [ -n "$host" ]; then reserved=true; ip="$(uci -q get "dhcp.$host.ip")"; fi
		priority=false
		dscp="$(uci -q get "firewall.ark_priority_$suffix.set_dscp")"
		[ -n "$dscp" ] || dscp="AF41"
		[ "$(uci -q get "firewall.ark_priority_$suffix.enabled")" = 1 ] && priority=true
		wan_route="default"; limit_enabled=false; limit_down=0; limit_up=0
		parental_mode="default"; parental_block=false; safesearch=false; blocked_services=""
		if [ -f /etc/config/equipe_devices ]; then
			name_section="device_$(printf '%s' "$mac" | tr -d ':')"
			saved_wan="$(uci -q get "equipe_devices.$name_section.wan_route" || true)"
			[ -n "$saved_wan" ] && wan_route="$saved_wan"
			saved_lim="$(uci -q get "equipe_devices.$name_section.limit_enabled" || printf 0)"
			[ "$saved_lim" = 1 ] && limit_enabled=true
			limit_down="$(uci -q get "equipe_devices.$name_section.limit_down" || printf 0)"
			limit_up="$(uci -q get "equipe_devices.$name_section.limit_up" || printf 0)"
			saved_llb="$(uci -q get "equipe_devices.$name_section.limit_lan_bypass" || printf 1)"
			limit_lan_bypass=true
			[ "$saved_llb" = 0 ] || [ "$saved_llb" = false ] && limit_lan_bypass=false
			saved_pm="$(uci -q get "equipe_devices.$name_section.parental_mode" || printf 'default')"
			[ -n "$saved_pm" ] && parental_mode="$saved_pm"
			[ "$(uci -q get "equipe_devices.$name_section.parental_block" || printf 0)" = 1 ] && parental_block=true
			[ "$(uci -q get "equipe_devices.$name_section.safesearch" || printf 0)" = 1 ] && safesearch=true
			blocked_services="$(uci -q get "equipe_devices.$name_section.blocked_services" || true)"
			cur_ipv6_mode="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"
			saved_ipv6_allowed="$(uci -q get "equipe_devices.$name_section.ipv6_allowed" || true)"
			if [ "$cur_ipv6_mode" = "selective" ]; then
				ipv6_allowed=false
				[ "$saved_ipv6_allowed" = "1" ] && ipv6_allowed=true
			else
				ipv6_allowed=true
				[ "$saved_ipv6_allowed" = "0" ] && ipv6_allowed=false
			fi
			saved_custom_dns="$(uci -q get "equipe_devices.$name_section.custom_dns" || true)"
		fi
		adguard_installed=false
		[ -x /usr/bin/AdGuardHome ] && [ "$(uci -q get equipe_perf.settings.adblock_cloud || echo 0)" != "1" ] && adguard_installed=true
		dmz_active=false
		dmz_dest="$(uci -q get firewall.ark_dmz.dest_ip || true)"
		dmz_en="$(uci -q get firewall.ark_dmz.enabled || printf 1)"
		saved_dmz_mac="$(uci -q get equipe_dashboard.dmz.mac || true)"
		if [ -n "$dmz_dest" ] && [ "$dmz_en" != 0 ]; then
			if [ -n "$ip" ] && [ "$ip" = "$dmz_dest" ]; then
				dmz_active=true
			elif [ -n "$saved_dmz_mac" ] && [ "$mac" = "$saved_dmz_mac" ]; then
				dmz_active=true
			fi
		fi
		printf '{"reserved":%s,"ip":"%s","priority":%s,"dscp":"%s","wan_route":"%s","limit_enabled":%s,"limit_down":%d,"limit_up":%d,"limit_lan_bypass":%s,"operation_profile":"%s","qos_active":%s,"parental_mode":"%s","parental_block":%s,"safesearch":%s,"blocked_services":"%s","adguard_installed":%s,"ipv6_allowed":%s,"custom_dns":"%s","dmz":%s}\n' \
			"$reserved" "$(json_escape "$ip")" "$priority" "$(json_escape "$dscp")" "$(json_escape "$wan_route")" "$limit_enabled" "$limit_down" "$limit_up" "$limit_lan_bypass" "$(ark_operation_profile)" "$(feature_active sqm && bool 1 || bool 0)" \
			"$(json_escape "$parental_mode")" "$parental_block" "$safesearch" "$(json_escape "$blocked_services")" "$adguard_installed" "$ipv6_allowed" "$(json_escape "$saved_custom_dns")" "$dmz_active"
		;;
	device-limits-list)
		device_limits_json
		;;
	device-limits-apply)
		apply_device_bandwidth_limits
		echo ok
		;;
	device-save)
		mac="$(printf '%s' "$2" | tr '-' ':' | tr 'a-f' 'A-F' | tr -d ' ')"; name="$3"; mode="$4"; ip="$(printf '%s' "$5" | tr -d ' ,;\t\r\n')"; priority="$6"; target_dscp="$7"; wan_route="${8:-default}"; limit_enabled="${9:-0}"; limit_down="${10:-0}"; limit_up="${11:-0}"; parental_mode="${12:-default}"; parental_block="${13:-0}"; safesearch="${14:-0}"; blocked_services="${15:-}"; limit_lan_bypass="${16:-1}"; ipv6_allowed="${17:-0}"; custom_dns="${18:-}"; dmz_enabled="${19:-0}"
		valid_mac "$mac" || { echo 'MAC invalido' >&2; exit 2; }
		[ "${#name}" -le 48 ] || { echo 'Nome muito longo' >&2; exit 2; }
		case "$mode" in automatic|reserved) ;; *) echo 'Modo de IP invalido' >&2; exit 2 ;; esac
		case "$priority" in 0|1|keep) ;; *) echo 'Prioridade invalida' >&2; exit 2 ;; esac
		case "$wan_route" in default|wan|wan1|wan2|wan3|wan4|wan[0-9]*) ;; *) wan_route='default' ;; esac
		case "$limit_enabled" in 1|true) limit_enabled=1 ;; *) limit_enabled=0 ;; esac
		case "$limit_down" in ''|*[!0-9]*) limit_down=0 ;; esac
		case "$limit_up" in ''|*[!0-9]*) limit_up=0 ;; esac
		case "$parental_mode" in custom|bypass|default) ;; *) parental_mode='default' ;; esac
		case "$parental_block" in 1|true) parental_block=1 ;; *) parental_block=0 ;; esac
		case "$safesearch" in 1|true) safesearch=1 ;; *) safesearch=0 ;; esac
		case "$ipv6_allowed" in 1|true) ipv6_allowed=1 ;; *) ipv6_allowed=0 ;; esac
		clean_custom_dns=""
		if [ -n "$custom_dns" ]; then
			for dip in $(printf '%s' "$custom_dns" | tr ',;' ' '); do
				if valid_ipv4 "$dip"; then
					if [ -z "$clean_custom_dns" ]; then
						clean_custom_dns="$dip"
					else
						clean_custom_dns="${clean_custom_dns},$dip"
					fi
				fi
			done
		fi
		if [ "$mode" = reserved ]; then
			valid_ipv4 "$ip" && same_managed_subnet "$ip" || { echo 'Use um IPv4 valido de uma rede local, diferente do endereco do roteador' >&2; exit 2; }
			duplicate="$(uci -q show dhcp 2>/dev/null | grep -F ".ip='$ip'" | head -n1)"
			host="$(find_dhcp_host "$mac")"
			[ -z "$duplicate" ] || printf '%s\n' "$duplicate" | grep -q "^dhcp\.$host\.ip=" || { echo 'Esse IP ja esta reservado para outro dispositivo' >&2; exit 2; }
		fi
		[ "$priority" != 1 ] || { feature_active sqm && [ -s /etc/config/qos_equipe ]; } || { echo 'Ative o SQM antes de priorizar o dispositivo' >&2; exit 3; }
		if [ -z "$target_dscp" ]; then
			target_dscp="AF41"
		fi
		case "$target_dscp" in EF|AF41|AF31|CS4|CS6) ;; *) target_dscp="AF41" ;; esac
		suffix="$(device_suffix "$mac")"; name_section="device_$(printf '%s' "$mac" | tr -d ':')"
		if [ -z "$name" ]; then uci -q delete "equipe_devices.$name_section"
		else
			uci -q set "equipe_devices.$name_section=device"
			uci -q set "equipe_devices.$name_section.mac=$mac"
			uci -q set "equipe_devices.$name_section.name=$name"
		fi
		host="$(find_dhcp_host "$mac")"
		tag_name="dns_$suffix"
		if [ -n "$clean_custom_dns" ]; then
			uci -q set "equipe_devices.$name_section.custom_dns=$clean_custom_dns"
			uci -q set "dhcp.$tag_name=tag"
			uci -q set "dhcp.$tag_name.dhcp_option=6,$clean_custom_dns"
			uci -q set "dhcp.$tag_name.force=1"
		else
			uci -q delete "equipe_devices.$name_section.custom_dns" 2>/dev/null || true
			uci -q delete "dhcp.$tag_name" 2>/dev/null || true
		fi
		if [ "$wan_route" != default ]; then
			if [ -z "$ip" ]; then
				if [ -f /tmp/dhcp.leases ]; then
					ip="$(awk -v m="$(printf '%s' "$mac" | tr 'A-F' 'a-f')" '$2==m {print $3; exit}' /tmp/dhcp.leases)"
				fi
				if [ -z "$ip" ]; then
					ip="$(ip neigh show 2>/dev/null | awk -v m="$(printf '%s' "$mac" | tr 'A-F' 'a-f')" '$5==m {print $1; exit}')"
				fi
			fi
			if [ -z "$ip" ] || ! valid_ipv4 "$ip"; then
				echo "Nao e possivel definir rota exclusiva de WAN sem um endereco IP valido para o dispositivo." >&2
				exit 2
			fi
			# Garante reserva de DHCP para que o IP deste aparelho nunca mude no futuro
			[ -n "$host" ] || host="ark_$suffix"
			dns_host_name="$(printf '%s' "${name:-ark-$suffix}" | sed 's/[^a-zA-Z0-9_-]/-/g; s/\-{2,\}/-/g; s/^-//; s/-$//')"
			[ -n "$dns_host_name" ] || dns_host_name="ark-$suffix"
			uci -q set "dhcp.$host=host"
			uci -q set "dhcp.$host.name=$dns_host_name"
			uci -q set "dhcp.$host.mac=$mac"
			uci -q set "dhcp.$host.ip=$ip"
			if [ -n "$clean_custom_dns" ]; then
				uci -q set "dhcp.$host.tag=$tag_name"
			else
				uci -q delete "dhcp.$host.tag" 2>/dev/null || true
			fi
		elif [ "$mode" = reserved ]; then
			[ -n "$host" ] || host="ark_$suffix"
			dns_host_name="$(printf '%s' "${name:-ark-$suffix}" | sed 's/[^a-zA-Z0-9_-]/-/g; s/\-{2,\}/-/g; s/^-//; s/-$//')"
			[ -n "$dns_host_name" ] || dns_host_name="ark-$suffix"
			uci -q set "dhcp.$host=host"
			uci -q set "dhcp.$host.name=$dns_host_name"
			uci -q set "dhcp.$host.mac=$mac"
			uci -q set "dhcp.$host.ip=$ip"
			if [ -n "$clean_custom_dns" ]; then
				uci -q set "dhcp.$host.tag=$tag_name"
			else
				uci -q delete "dhcp.$host.tag" 2>/dev/null || true
			fi
		elif [ -n "$clean_custom_dns" ]; then
			[ -n "$host" ] || host="ark_$suffix"
			dns_host_name="$(printf '%s' "${name:-ark-$suffix}" | sed 's/[^a-zA-Z0-9_-]/-/g; s/\-{2,\}/-/g; s/^-//; s/-$//')"
			[ -n "$dns_host_name" ] || dns_host_name="ark-$suffix"
			uci -q set "dhcp.$host=host"
			uci -q set "dhcp.$host.name=$dns_host_name"
			uci -q set "dhcp.$host.mac=$mac"
			uci -q set "dhcp.$host.tag=$tag_name"
			uci -q delete "dhcp.$host.ip" 2>/dev/null || true
		else
			[ -z "$host" ] || uci -q delete "dhcp.$host"
		fi
		priority_section="ark_priority_$suffix"
		if [ "$priority" = 1 ]; then
			uci -q set "firewall.$priority_section=rule"
			uci -q set "firewall.$priority_section.name=ARK-Priority-$mac"
			uci -q set "firewall.$priority_section.src=lan"
			uci -q set "firewall.$priority_section.dest=wan"
			uci -q set "firewall.$priority_section.family=ipv4"
			uci -q set "firewall.$priority_section.proto=all"
			uci -q set "firewall.$priority_section.src_mac=$mac"
			uci -q set "firewall.$priority_section.target=DSCP"
			uci -q set "firewall.$priority_section.set_dscp=$target_dscp"
			uci -q set "firewall.$priority_section.enabled=1"
		elif [ "$priority" = 0 ]; then uci -q delete "firewall.$priority_section"
		fi
		mwan3_changed=0
		mwan3_rule="d_$suffix"
		if [ "$wan_route" != default ]; then
			uci -q set "equipe_devices.$name_section.wan_route=$wan_route"
			policy="${wan_route}_only"
			[ "$policy" = "wan1_only" ] && policy="wan_only"
			uci -q delete "mwan3.ark_dev_$suffix" 2>/dev/null || true
			uci -q set "mwan3.$mwan3_rule=rule"
			uci -q set "mwan3.$mwan3_rule.family=ipv4"
			uci -q set "mwan3.$mwan3_rule.proto=all"
			uci -q set "mwan3.$mwan3_rule.dest_ip=0.0.0.0/0"
			uci -q set "mwan3.$mwan3_rule.src_ip=$ip"
			uci -q set "mwan3.$mwan3_rule.use_policy=$policy"
			mwan3_changed=1
		else
			uci -q delete "equipe_devices.$name_section.wan_route" 2>/dev/null || true
			if [ -n "$(uci -q get "mwan3.$mwan3_rule" 2>/dev/null)" ] || [ -n "$(uci -q get "mwan3.ark_dev_$suffix" 2>/dev/null)" ]; then
				uci -q delete "mwan3.$mwan3_rule" 2>/dev/null || true
				uci -q delete "mwan3.ark_dev_$suffix" 2>/dev/null || true
				mwan3_changed=1
			fi
		fi
		if [ "$limit_enabled" = 1 ] && { [ "$limit_down" -gt 0 ] || [ "$limit_up" -gt 0 ]; }; then
			uci -q set "equipe_devices.$name_section.limit_enabled=1"
			uci -q set "equipe_devices.$name_section.limit_down=$limit_down"
			uci -q set "equipe_devices.$name_section.limit_up=$limit_up"
			case "$limit_lan_bypass" in 0|false) limit_lan_bypass=0 ;; *) limit_lan_bypass=1 ;; esac
			uci -q set "equipe_devices.$name_section.limit_lan_bypass=$limit_lan_bypass"
		else
			uci -q delete "equipe_devices.$name_section.limit_enabled" 2>/dev/null || true
			uci -q delete "equipe_devices.$name_section.limit_down" 2>/dev/null || true
			uci -q delete "equipe_devices.$name_section.limit_up" 2>/dev/null || true
			uci -q delete "equipe_devices.$name_section.limit_lan_bypass" 2>/dev/null || true
		fi
		if [ "$parental_mode" = "custom" ]; then
			uci -q set "equipe_devices.$name_section.parental_mode=custom"
			uci -q set "equipe_devices.$name_section.parental_block=$parental_block"
			uci -q set "equipe_devices.$name_section.safesearch=$safesearch"
			uci -q set "equipe_devices.$name_section.blocked_services=$blocked_services"
		elif [ "$parental_mode" = "bypass" ]; then
			uci -q set "equipe_devices.$name_section.parental_mode=bypass"
			uci -q delete "equipe_devices.$name_section.parental_block" 2>/dev/null || true
			uci -q delete "equipe_devices.$name_section.safesearch" 2>/dev/null || true
			uci -q delete "equipe_devices.$name_section.blocked_services" 2>/dev/null || true
		else
			uci -q delete "equipe_devices.$name_section.parental_mode" 2>/dev/null || true
			uci -q delete "equipe_devices.$name_section.parental_block" 2>/dev/null || true
			uci -q delete "equipe_devices.$name_section.safesearch" 2>/dev/null || true
			uci -q delete "equipe_devices.$name_section.blocked_services" 2>/dev/null || true
		fi
		uci -q set "equipe_devices.$name_section.ipv6_allowed=$ipv6_allowed"
		uci commit equipe_devices; uci commit dhcp; uci commit firewall
		if [ "$mwan3_changed" = 1 ]; then
			mwan3_reorder_rules
			uci commit mwan3 2>/dev/null || true
		fi
		apply_device_bandwidth_limits
		sanitize_dhcp_hostnames
		device_apply_parental "$mac" "$ip" "$name" "$parental_mode" "$parental_block" "$safesearch" "$blocked_services"
		sync_ipv6_selective_firewall
		case "$dmz_enabled" in
			1|true|on)
				if [ -z "$ip" ]; then
					[ -f /tmp/dhcp.leases ] && ip="$(awk -v m="$(printf '%s' "$mac" | tr 'A-F' 'a-f')" '$2==m {print $3; exit}' /tmp/dhcp.leases)"
					[ -z "$ip" ] && ip="$(ip neigh show 2>/dev/null | awk -v m="$(printf '%s' "$mac" | tr 'A-F' 'a-f')" '$5==m {print $1; exit}')"
				fi
				[ -n "$ip" ] && dmz_set 1 "$ip" "$mac" "$name" >/dev/null 2>&1 || true
				;;
			0|false|off)
				cur_dmz_mac="$(uci -q get equipe_dashboard.dmz.mac || true)"
				cur_dmz_ip="$(uci -q get firewall.ark_dmz.dest_ip || true)"
				if [ "$mac" = "$cur_dmz_mac" ] || { [ -n "$ip" ] && [ "$ip" = "$cur_dmz_ip" ]; }; then
					dmz_set 0 >/dev/null 2>&1 || true
				fi
				;;
		esac
		/etc/init.d/dnsmasq reload >/dev/null 2>&1
		/etc/init.d/firewall reload >/dev/null 2>&1
		[ "$mwan3_changed" = 1 ] && [ "$(uci -q get equipe_dashboard.speedify.desired_state)" != "connected" ] && (sleep 1; /etc/init.d/mwan3 restart >/dev/null 2>&1) &
		echo ok
		;;
	reboot-prepare)
		token="$(dd if=/dev/urandom bs=16 count=1 2>/dev/null | hexdump -v -e '/1 "%02x"' 2>/dev/null)"
		[ -n "$token" ] || token="$(printf '%s' "$(date +%s)-$$-$RANDOM" | cksum | awk '{print $1}')"
		created="$(date +%s)"
		umask 077
		printf '%s %s\n' "$created" "$token" > /tmp/ark-router-reboot-token
		printf '%s\n' "$token"
		;;
	reboot-confirm)
		provided="$2"
		printf '%s' "$provided" | grep -Eq '^[0-9a-f]{8,64}$' || { echo 'Confirmacao de reinicio invalida' >&2; exit 2; }
		[ -r /tmp/ark-router-reboot-token ] || { echo 'A confirmacao expirou; tente novamente' >&2; exit 3; }
		read created expected < /tmp/ark-router-reboot-token
		now="$(date +%s)"; ready=$((created + 2)); expires=$((created + 60))
		[ "$provided" = "$expected" ] || { echo 'Confirmacao de reinicio invalida' >&2; exit 3; }
		[ "$now" -ge "$ready" ] || { echo 'Aguarde os 2 segundos de seguranca' >&2; exit 3; }
		[ "$now" -le "$expires" ] || { rm -f /tmp/ark-router-reboot-token; echo 'A confirmacao expirou; tente novamente' >&2; exit 3; }
		rm -f /tmp/ark-router-reboot-token
		( ark_safe_storage_reboot; sleep 1; /sbin/reboot ) >/dev/null 2>&1 &
		echo restarting
		;;
	device-reserve-secondary)
		mac="$(printf '%s' "$2" | tr 'a-f' 'A-F')"
		ip="$3"
		name="${4:-ARK-Ponto-Adicional}"
		valid_mac "$mac" || { echo 'MAC invalido' >&2; exit 2; }
		valid_ipv4 "$ip" || { echo 'IP invalido' >&2; exit 2; }
		for h in $(uci -q show dhcp 2>/dev/null | grep -E '\.mac=' | cut -d. -f2 | cut -d= -f1); do
			hmac="$(uci -q get "dhcp.$h.mac" | tr 'a-f' 'A-F')"
			hip="$(uci -q get "dhcp.$h.ip")"
			if [ "$hmac" = "$mac" ] || [ "$hip" = "$ip" ]; then
				uci -q delete "dhcp.$h"
			fi
		done
		sec_id="sec_$(printf '%s' "$mac" | tr -d ':' | tr 'A-F' 'a-f')"
		uci -q set "dhcp.$sec_id=host"
		uci -q set "dhcp.$sec_id.mac=$mac"
		uci -q set "dhcp.$sec_id.ip=$ip"
		uci -q set "dhcp.$sec_id.name=$name"
		uci -q set "dhcp.$sec_id.dns=1"
		uci commit dhcp
		/etc/init.d/dnsmasq reload >/dev/null 2>&1 || true
		echo 'reserved'
		;;
	flush-stale-leases)
		flush_stale_leases
		;;
	device-stations|wifi-stations)
		device_get_stations
		;;
	esac
}
