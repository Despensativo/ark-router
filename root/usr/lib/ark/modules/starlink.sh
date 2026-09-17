#!/bin/sh
# /usr/lib/ark/modules/starlink.sh - ARK Router Starlink Telemetry & Policy Routing Module
# Strict POSIX BusyBox ash compliant module for Starlink telemetry, dish communication and routing.

[ -z "${_ARK_STARLINK_SH_LOADED:-}" ] || return 0
_ARK_STARLINK_SH_LOADED=1

[ -n "${ARK_LIB_DIR}" ] || ARK_LIB_DIR="/usr/lib/ark"
[ -f "${ARK_LIB_DIR}/common.sh" ] && . "${ARK_LIB_DIR}/common.sh"
[ -f "${ARK_LIB_DIR}/logging.sh" ] && . "${ARK_LIB_DIR}/logging.sh"
[ -f "${ARK_LIB_DIR}/validation.sh" ] && . "${ARK_LIB_DIR}/validation.sh"
[ -f "${ARK_LIB_DIR}/modules/network.sh" ] && . "${ARK_LIB_DIR}/modules/network.sh"

starlink_cgnat_ipv4() {
	printf '%s' "$1" | awk -F. 'NF==4 && $1==100 && $2>=64 && $2<=127 {ok=1} END{exit !ok}'
}

starlink_active_wan_get() {
	active="$(uci -q get equipe_dashboard.starlink.active_wan || true)"
	if [ -z "$active" ]; then
		cur_dev="$(ip -4 route show exact 192.168.100.1/32 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") print $(i+1)}' || true)"
		if [ -n "$cur_dev" ]; then
			for w in $(active_wan_networks); do
				dev="$(sqm_device_for_network "$w")"
				if [ "$dev" = "$cur_dev" ]; then
					active="$w"
					break
				fi
			done
		fi
	fi
	[ -n "$active" ] || active="wan"
	printf '%s' "$active"
}

starlink_active_wan_set() {
	wan="$1"
	printf '%s' "$wan" | grep -Eq '^wan([0-9]+)?$' || { echo 'WAN invalida' >&2; exit 2; }
	[ "$(uci -q get "network.$wan")" = interface ] || { echo 'WAN nao encontrada' >&2; exit 3; }
	uci -q set equipe_dashboard.starlink=starlink
	uci -q set "equipe_dashboard.starlink.active_wan=$wan"
	uci commit equipe_dashboard

	status_json="$(ubus call "network.interface.$wan" status 2>/dev/null)"
	device="$(printf '%s' "$status_json" | jsonfilter -e '@.l3_device' 2>/dev/null)"
	[ -n "$device" ] || device="$(uci -q get "network.$wan.device")"
	[ -n "$device" ] || device="$wan"
	gateway="$(printf '%s' "$status_json" | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"

	if [ -n "$device" ]; then
		if [ -n "$gateway" ]; then
			ip -4 route replace 192.168.100.1/32 via "$gateway" dev "$device" metric 1 2>/dev/null || true
		else
			ip -4 route replace 192.168.100.1/32 dev "$device" metric 1 2>/dev/null || true
		fi
	fi
	echo ok
}

starlink_wan_port() {
	case "$1" in
		wan|wan1) echo 9201 ;;
		wan2) echo 9202 ;;
		wan3) echo 9203 ;;
		wan4) echo 9204 ;;
		wan[0-9]*)
			num="${1#wan}"
			echo "$((9200 + num))"
			;;
		*) echo 9201 ;;
	esac
}

starlink_wan_table() {
	case "$1" in
		wan|wan1) echo 5101 ;;
		wan2) echo 5102 ;;
		wan3) echo 5103 ;;
		wan4) echo 5104 ;;
		wan[0-9]*)
			num="${1#wan}"
			echo "$((5100 + num))"
			;;
		*) echo 5101 ;;
	esac
}

starlink_setup_policy_routing() {
	sysctl -w net.ipv4.conf.all.route_localnet=1 >/dev/null 2>&1 || true
	sysctl -w net.ipv4.conf.default.route_localnet=1 >/dev/null 2>&1 || true

	mkdir -p /etc/ark
	nft_file="/etc/ark/ark_starlink.nft"
	tmp_nft="/tmp/ark_starlink.nft.$$"

	printf 'table inet ark_starlink\ndelete table inet ark_starlink\ntable inet ark_starlink {\n' > "$tmp_nft"
	printf '\tchain prerouting {\n\t\ttype nat hook prerouting priority dstnat; policy accept;\n' >> "$tmp_nft"
	prerouting_rules=""
	mangle_pre_rules=""
	output_nat_rules=""
	mangle_out_rules=""

	for network_section in $(active_wan_networks); do
		status_json="$(ubus call "network.interface.$network_section" status 2>/dev/null)"
		[ -n "$status_json" ] || continue
		device="$(printf '%s' "$status_json" | jsonfilter -e '@.l3_device' 2>/dev/null)"
		[ -n "$device" ] || device="$(printf '%s' "$status_json" | jsonfilter -e '@.device' 2>/dev/null)"
		[ -n "$device" ] || device="$(uci -q get "network.$network_section.device")"
		[ -n "$device" ] || continue
		gateway="$(printf '%s' "$status_json" | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"

		port="$(starlink_wan_port "$network_section")"
		table="$(starlink_wan_table "$network_section")"
		mark="$(printf '0x%x' "$table")"
		rule_prio="$((table - 4200))"

		if [ -n "$gateway" ]; then
			ip -4 route replace 192.168.100.1/32 via "$gateway" dev "$device" table "$table" 2>/dev/null || true
		else
			ip -4 route replace 192.168.100.1/32 dev "$device" table "$table" 2>/dev/null || true
		fi

		if ! ip rule show 2>/dev/null | grep -q "lookup $table"; then
			ip rule add fwmark "$mark" lookup "$table" priority "$rule_prio" 2>/dev/null || true
		fi

		prerouting_rules="${prerouting_rules}\t\ttcp dport $port counter dnat ip to 192.168.100.1:9200\n"
		mangle_pre_rules="${mangle_pre_rules}\t\ttcp dport $port counter meta mark set $mark\n"
		output_nat_rules="${output_nat_rules}\t\ttcp dport $port counter dnat ip to 192.168.100.1:9200\n"
		mangle_out_rules="${mangle_out_rules}\t\ttcp dport $port counter meta mark set $mark\n"
	done

	printf '%b\t}\n' "$prerouting_rules" >> "$tmp_nft"
	printf '\tchain prerouting_mangle {\n\t\ttype filter hook prerouting priority mangle; policy accept;\n%b\t}\n' "$mangle_pre_rules" >> "$tmp_nft"
	printf '\tchain output_nat {\n\t\ttype nat hook output priority dstnat; policy accept;\n%b\t}\n' "$output_nat_rules" >> "$tmp_nft"
	printf '\tchain output_mangle {\n\t\ttype filter hook output priority mangle; policy accept;\n%b\t}\n' "$mangle_out_rules" >> "$tmp_nft"
	printf '\tchain postrouting {\n\t\ttype nat hook postrouting priority srcnat; policy accept;\n\t\tip daddr 192.168.100.1 counter masquerade\n\t}\n}\n' >> "$tmp_nft"

	if nft -f "$tmp_nft" 2>/dev/null; then
		mv -f "$tmp_nft" "$nft_file"
	else
		rm -f "$tmp_nft" 2>/dev/null || true
	fi
}

starlink_public_list_json() {
	starlink_setup_policy_routing
	active_wan="$(starlink_active_wan_get)"
	printf '{"ok":true,"enabled":true,"active_wan":"%s","wans":[' "$(json_escape "$active_wan")"
	first=1
	for network_section in $(active_wan_networks); do
		status_json="$(ubus call "network.interface.$network_section" status 2>/dev/null)"
		[ -n "$status_json" ] || continue
		up="$(printf '%s' "$status_json" | jsonfilter -e '@.up' 2>/dev/null)"
		ipaddr="$(printf '%s' "$status_json" | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null)"
		gateway="$(printf '%s' "$status_json" | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"
		dns="$(printf '%s' "$status_json" | jsonfilter -e '@["dns-server"][@]' 2>/dev/null | tr '\n' ' ')"
		device="$(sqm_device_for_network "$network_section")"
		port="$(starlink_wan_port "$network_section")"
		likely=false
		cgnat_ip=false
		starlink_cgnat_ipv4 "$ipaddr" && cgnat_ip=true
		[ "$cgnat_ip" = true ] && [ "$gateway" = 100.64.0.1 ] && likely=true
		printf '%s' "$dns" | grep -Eq '(^|[[:space:]])198\.54\.100\.' && likely=true
		if [ "$likely" = false ] && [ "$up" = true ]; then
			case "$gateway" in
				192.168.1.1) likely=true ;;
			esac
		fi
		[ "$first" = 1 ] || printf ','; first=0
		if [ "$network_section" = wan ]; then label=WAN1; else label="WAN${network_section#wan}"; fi
		printf '{"name":"%s","label":"%s","device":"%s","port":%d,"up":%s,"ip":"%s","gateway":"%s","likely_starlink":%s,"is_active_route":%s}' \
			"$(json_escape "$network_section")" "$(json_escape "$label")" "$(json_escape "$device")" "$port" "$(bool "$up")" "$(json_escape "$ipaddr")" "$(json_escape "$gateway")" "$likely" "$([ "$network_section" = "$active_wan" ] && printf true || printf false)"
	done
	printf ']}\n'
}

handle_starlink() {
	case "$1" in
	starlink-telemetry)
		[ -x /usr/libexec/ark-starlink-telemetry ] || { echo 'Módulo Starlink do ARK não instalado.' >&2; exit 1; }
		exec /usr/libexec/ark-starlink-telemetry query "${2:-wan}"
		;;
	starlink-public-list)
		starlink_public_list_json
		;;
	starlink-setup-ports)
		starlink_setup_policy_routing
		echo ok
		;;
	starlink-active-wan-get)
		starlink_active_wan_get
		;;
	starlink-active-wan-set)
		starlink_active_wan_set "$2"
		;;
	starlink-public-toggle)
		case "$2" in 0|1) ;; *) echo 'Estado da visualização Starlink inválido' >&2; exit 2 ;; esac
		uci -q set equipe_dashboard.starlink=starlink
		uci -q set "equipe_dashboard.starlink.public_view=$2"
		uci commit equipe_dashboard
		echo ok
		;;
	starlink-telemetry-status)
		if [ -x /usr/sbin/starlink-telemetry-daemon ]; then
			exec /usr/sbin/starlink-telemetry-daemon status
		else
			echo '{"enabled":false,"running":false,"error":"daemon_not_found"}'
		fi
		;;
	starlink-telemetry-toggle)
		val="${2:-}"
		case "$val" in 0|1) ;; *) echo 'Estado invalido (0 ou 1)' >&2; exit 2 ;; esac
		touch /etc/config/starlink_telemetry 2>/dev/null || true
		uci -q set starlink_telemetry.global=starlink_telemetry
		uci -q set starlink_telemetry.global.enabled="$val"
		uci commit starlink_telemetry
		rm -f /tmp/ark-features.cache 2>/dev/null || true
		if [ "$val" = "1" ]; then
			/etc/init.d/starlink-telemetry enable 2>/dev/null || true
			/etc/init.d/starlink-telemetry restart 2>/dev/null || true
		else
			/etc/init.d/starlink-telemetry stop 2>/dev/null || true
			/etc/init.d/starlink-telemetry disable 2>/dev/null || true
			if [ -f /var/run/starlink-telemetry.pid ]; then
				pid="$(cat /var/run/starlink-telemetry.pid 2>/dev/null || true)"
				[ -n "$pid" ] && kill "$pid" 2>/dev/null || true
			fi
		fi
		echo ok
		;;
	starlink-always-show-toggle)
		val="${2:-}"
		case "$val" in 0|1) ;; *) echo 'Estado invalido (0 ou 1)' >&2; exit 2 ;; esac
		touch /etc/config/starlink_telemetry 2>/dev/null || true
		uci -q set starlink_telemetry.global=starlink_telemetry
		uci -q set "starlink_telemetry.global.always_show=$val"
		uci commit starlink_telemetry
		rm -f /tmp/ark-features.cache 2>/dev/null || true
		echo ok
		;;
	starlink-telemetry-config-get)
		always_show="$(uci -q get starlink_telemetry.global.always_show || printf 0)"
		enabled="$(uci -q get starlink_telemetry.global.enabled || printf 0)"
		sample_mode="$(uci -q get starlink_telemetry.global.sample_mode || printf 'auto')"
		max_history_hours="$(uci -q get starlink_telemetry.global.max_history_hours || printf 25)"
		purge_boot_email="$(uci -q get starlink_telemetry.global.purge_boot_email || printf 1)"
		email_enabled="$(uci -q get starlink_telemetry.email.enabled || printf 0)"
		provider="$(uci -q get starlink_telemetry.email.provider || printf 'resend')"
		resend_api_key="$(uci -q get starlink_telemetry.email.resend_api_key || true)"
		email_from="$(uci -q get starlink_telemetry.email.email_from || printf 'onboarding@resend.dev')"
		email_to="$(uci -q get starlink_telemetry.email.email_to || true)"
		attach_csv="$(uci -q get starlink_telemetry.email.attach_csv || printf 1)"
		smtp_server="$(uci -q get starlink_telemetry.email.smtp_server || printf 'smtp.gmail.com')"
		smtp_port="$(uci -q get starlink_telemetry.email.smtp_port || printf '587')"
		smtp_tls="$(uci -q get starlink_telemetry.email.smtp_tls || printf '1')"
		smtp_user="$(uci -q get starlink_telemetry.email.smtp_user || true)"
		smtp_pass="$(uci -q get starlink_telemetry.email.smtp_pass || true)"
		email_interval="$(uci -q get starlink_telemetry.email.email_interval || printf 24)"
		printf '{"always_show":%s,"enabled":%s,"sample_mode":"%s","max_history_hours":%s,"purge_boot_email":%s,"email_enabled":%s,"provider":"%s","resend_api_key":"%s","email_from":"%s","email_to":"%s","attach_csv":%s,"smtp_server":"%s","smtp_port":"%s","smtp_tls":%s,"smtp_user":"%s","smtp_pass":"%s","email_interval":%s}\n' \
			"$([ "$always_show" = "1" ] && echo true || echo false)" \
			"$([ "$enabled" = "1" ] && echo true || echo false)" \
			"$(json_escape "$sample_mode")" \
			"$max_history_hours" \
			"$([ "$purge_boot_email" = "1" ] && echo true || echo false)" \
			"$([ "$email_enabled" = "1" ] && echo true || echo false)" \
			"$(json_escape "$provider")" \
			"$(json_escape "$resend_api_key")" \
			"$(json_escape "$email_from")" \
			"$(json_escape "$email_to")" \
			"$([ "$attach_csv" = "1" ] && echo true || echo false)" \
			"$(json_escape "$smtp_server")" \
			"$(json_escape "$smtp_port")" \
			"$([ "$smtp_tls" = "1" ] && echo true || echo false)" \
			"$(json_escape "$smtp_user")" \
			"$(json_escape "$smtp_pass")" \
			"$email_interval"
		;;
	starlink-telemetry-config-set)
		shift
		touch /etc/config/starlink_telemetry 2>/dev/null || true
		uci -q set starlink_telemetry.global=starlink_telemetry
		uci -q set starlink_telemetry.email=email
		old_enabled="$(uci -q get starlink_telemetry.global.enabled || printf 0)"
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				always_show) uci -q set "starlink_telemetry.global.always_show=$value" ;;
				enabled) uci -q set "starlink_telemetry.global.enabled=$value" ;;
				sample_mode) uci -q set "starlink_telemetry.global.sample_mode=$value" ;;
				max_history_hours) uci -q set "starlink_telemetry.global.max_history_hours=$value" ;;
				purge_boot_email) uci -q set "starlink_telemetry.global.purge_boot_email=$value" ;;
				email_enabled) uci -q set "starlink_telemetry.email.enabled=$value" ;;
				provider) uci -q set "starlink_telemetry.email.provider=$value" ;;
				resend_api_key) uci -q set "starlink_telemetry.email.resend_api_key=$value" ;;
				email_to) uci -q set "starlink_telemetry.email.email_to=$value" ;;
				email_from) uci -q set "starlink_telemetry.email.email_from=$value" ;;
				attach_csv) uci -q set "starlink_telemetry.email.attach_csv=$value" ;;
				smtp_server) uci -q set "starlink_telemetry.email.smtp_server=$value" ;;
				smtp_port) uci -q set "starlink_telemetry.email.smtp_port=$value" ;;
				smtp_tls) uci -q set "starlink_telemetry.email.smtp_tls=$value" ;;
				smtp_user) uci -q set "starlink_telemetry.email.smtp_user=$value" ;;
				smtp_pass) uci -q set "starlink_telemetry.email.smtp_pass=$value" ;;
				email_interval) uci -q set "starlink_telemetry.email.email_interval=$value" ;;
			esac
		done
		uci commit starlink_telemetry
		rm -f /tmp/ark-features.cache 2>/dev/null || true
		new_enabled="$(uci -q get starlink_telemetry.global.enabled || printf 0)"
		if [ "$new_enabled" = "1" ]; then
			/etc/init.d/starlink-telemetry enable 2>/dev/null || true
			/etc/init.d/starlink-telemetry restart 2>/dev/null || true
		elif [ "$old_enabled" = "1" ] && [ "$new_enabled" = "0" ]; then
			/etc/init.d/starlink-telemetry stop 2>/dev/null || true
			/etc/init.d/starlink-telemetry disable 2>/dev/null || true
		fi
		echo ok
		;;
	starlink-telemetry-send-test)
		if [ -x /usr/sbin/starlink-telemetry-mailer ]; then
			if [ "${2:-}" = "--sync" ] || [ "${2:-}" = "sync" ]; then
				out="$(/usr/sbin/starlink-telemetry-mailer send-test 2>&1 || true)"
				if printf '%s' "$out" | grep -q "sucesso"; then
					id="$(printf '%s' "$out" | grep -o 'ID: [^ ]*' | head -n 1 || printf 'ok')"
					printf '{"success":true,"message":"Relatório executivo enviado com sucesso! %s","output":"%s"}\n' "$id" "$(json_escape "$out")"
				else
					printf '{"success":false,"message":"Falha no envio do relatório por e-mail","output":"%s"}\n' "$(json_escape "$out")"
				fi
				return 0
			fi

			printf '{"status":"running","stage":"iniciando","message":"Disparo de e-mail de teste iniciado..."}\n' > /tmp/starlink-telemetry-test.status
			(
				out="$(/usr/sbin/starlink-telemetry-mailer send-test 2>&1 || true)"
				if printf '%s' "$out" | grep -q "sucesso"; then
					id="$(printf '%s' "$out" | grep -o 'ID: [^ ]*' | head -n 1 || printf 'ok')"
					printf '{"status":"done","success":true,"message":"Relatório executivo enviado com sucesso! %s","output":"%s"}\n' "$id" "$(json_escape "$out")" > /tmp/starlink-telemetry-test.status
				else
					printf '{"status":"done","success":false,"message":"Falha no envio do relatório por e-mail","output":"%s"}\n' "$(json_escape "$out")" > /tmp/starlink-telemetry-test.status
				fi
			) >/dev/null 2>&1 &
			printf '{"started":true,"status":"running","message":"Envio de e-mail de teste iniciado em segundo plano"}\n'
		else
			echo '{"success":false,"message":"Mailer nao encontrado"}' >&2; exit 1
		fi
		;;
	starlink-telemetry-test-status)
		if [ -f /tmp/starlink-telemetry-test.status ]; then
			cat /tmp/starlink-telemetry-test.status
		else
			printf '{"status":"idle","message":"Nenhum teste recente"}\n'
		fi
		;;
	starlink-telemetry-flush)
		if [ -x /usr/sbin/starlink-telemetry-daemon ]; then
			/usr/sbin/starlink-telemetry-daemon flush
			echo ok
		else
			echo 'Daemon nao encontrado' >&2; exit 1
		fi
		;;
	esac
}
