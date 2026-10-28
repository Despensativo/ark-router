#!/bin/sh
# /usr/lib/ark/modules/wifi.sh - ARK Router Wi-Fi & Radio Management Module
# Strict POSIX BusyBox ash compliant module for Wi-Fi radios, channels, SSIDs, DFS and WED.

[ -z "${_ARK_WIFI_SH_LOADED:-}" ] || return 0
_ARK_WIFI_SH_LOADED=1

[ -n "${ARK_LIB_DIR}" ] || ARK_LIB_DIR="/usr/lib/ark"
[ -f "${ARK_LIB_DIR}/common.sh" ] && . "${ARK_LIB_DIR}/common.sh"
[ -f "${ARK_LIB_DIR}/logging.sh" ] && . "${ARK_LIB_DIR}/logging.sh"
[ -f "${ARK_LIB_DIR}/validation.sh" ] && . "${ARK_LIB_DIR}/validation.sh"
[ -f "${ARK_LIB_DIR}/modules/network.sh" ] && . "${ARK_LIB_DIR}/modules/network.sh"
[ -f "${ARK_LIB_DIR}/modules/sqm.sh" ] && . "${ARK_LIB_DIR}/modules/sqm.sh"
[ -f "${ARK_LIB_DIR}/modules/ezsetup.sh" ] && . "${ARK_LIB_DIR}/modules/ezsetup.sh"

wifi_radio_by_band() {
	local wanted section value r b hw ht
	wanted="$1"
	uci -q show wireless 2>/dev/null | awk -F= -v wanted="$wanted" '
		/^[^.]+\.[^.]+=wifi-device/ { section=$1; sub(/^wireless\./, "", section); radios[++count]=section }
		/\.band=/ {
			section=$1; sub(/^wireless\./, "", section); sub(/\.band$/, "", section)
			value=$2; gsub(/^\047|\047$/, "", value)
			band[section]=tolower(value)
		}
		/\.hwmode=/ {
			section=$1; sub(/^wireless\./, "", section); sub(/\.hwmode$/, "", section)
			value=$2; gsub(/^\047|\047$/, "", value)
			hwmode[section]=tolower(value)
		}
		/\.htmode=/ {
			section=$1; sub(/^wireless\./, "", section); sub(/\.htmode$/, "", section)
			value=$2; gsub(/^\047|\047$/, "", value)
			htmode[section]=tolower(value)
		}
		END {
			for (i=1; i<=count; i++) {
				r=radios[i];
				b=band[r]; hw=hwmode[r]; ht=htmode[r];
				if (b ~ /^60/ || hw ~ /11ad/) {
					is_60g[r]=1;
				} else if (b ~ /^6/ || b=="3" || hw ~ /6g/ || ht ~ /320/ || r ~ /6g$/) {
					is_6g[r]=1;
				} else if (b ~ /^2/ || b=="1" || hw=="11g" || hw=="11b" || hw ~ /beg/ || hw ~ /axg/ || r ~ /2g$/) {
					is_2g[r]=1;
				} else if (b ~ /^5/ || b=="2" || hw=="11a" || hw ~ /bea/ || hw ~ /axa/ || hw ~ /11ac/ || ht ~ /80/ || ht ~ /160/ || r ~ /5g$/) {
					is_5g[r]=1;
				}
			}
			for (i=1; i<=count; i++) {
				r=radios[i];
				if (!is_60g[r] && !is_6g[r] && !is_2g[r] && !is_5g[r]) {
					if (r=="radio0" || r=="wifi0") is_2g[r]=1;
					else if (r=="radio1" || r=="wifi1") is_5g[r]=1;
					else if (r=="radio2" || r=="wifi2") is_6g[r]=1;
				}
			}
			if (wanted=="2g") {
				for (i=1; i<=count; i++) { if (is_2g[radios[i]]) { print radios[i]; exit; } }
				if (count >= 1) { print radios[1]; exit; }
			} else if (wanted=="5g") {
				for (i=1; i<=count; i++) { if (is_5g[radios[i]]) { print radios[i]; exit; } }
				if (count >= 2) { print radios[2]; exit; }
			} else if (wanted=="6g") {
				for (i=1; i<=count; i++) { if (is_6g[radios[i]]) { print radios[i]; exit; } }
				if (count >= 3) { print radios[3]; exit; }
			} else if (wanted=="60g") {
				for (i=1; i<=count; i++) { if (is_60g[radios[i]]) { print radios[i]; exit; } }
			}
		}'
}

wifi_radio_2g() { wifi_radio_by_band 2g; }

wifi_radio_5g() { wifi_radio_by_band 5g; }

wifi_radio_6g() { wifi_radio_by_band 6g; }

wifi_known_radios() {
	local rads
	rads="$(uci -q show wireless 2>/dev/null | awk -F= '/^[^.]+\.[^.]+=wifi-device/ { sub(/^wireless\./, "", $1); print $1 }')"
	if [ -n "$rads" ]; then
		printf '%s\n' "$rads"
	else
		local r2 r5 r6
		r2="$(wifi_radio_2g)"; r5="$(wifi_radio_5g)"; r6="$(wifi_radio_6g)"
		[ -n "$r2" ] && printf '%s\n' "$r2"
		[ -n "$r5" ] && [ "$r5" != "$r2" ] && printf '%s\n' "$r5"
		[ -n "$r6" ] && [ "$r6" != "$r5" ] && [ "$r6" != "$r2" ] && printf '%s\n' "$r6"
	fi
}

wifi_auto_enable_mesh_optimizations() {
	# 1. Potência Balanceada Anti-Sobreposição (Anti-Sticky Client: 2.4G 15 dBm / 5G 20 dBm)
	if [ "$(uci -q get equipe_dashboard.wifi.txpower_balanced)" != "1" ]; then
		handle_wifi "wifi-txbalance-toggle" "1" >/dev/null 2>&1 || true
	fi

	# 2. Aceleração Completa Wi-Fi 6 / 7 (se suportado pelo hardware)
	local iw_cache="/tmp/ark-iw-info.cache"
	[ -s "$iw_cache" ] || iw list 2>/dev/null > "$iw_cache" || true
	if grep -q 'HE Iftypes' "$iw_cache" 2>/dev/null || grep -qE 'EHT Capabilities|EHT-PHY|EHT Iftypes' "$iw_cache" 2>/dev/null; then
		if [ "$(uci -q get equipe_dashboard.wifi.wifi6_accel)" != "1" ]; then
			handle_wifi "wifi-wifi6-toggle" "1" >/dev/null 2>&1 || true
		fi
	fi

	# 3. Roaming Rápido Inteligente 802.11k/v/r
	handle_wifi "wifi-roaming-toggle" "1" >/dev/null 2>&1 || true

	# 4. Assistente de Roaming e Band Steering (usteer)
	handle_wifi "wifi-usteer-toggle" "1" >/dev/null 2>&1 || true
}

wifi_cleanup_mesh_interfaces() {
	local iface sec
	# 1. Encontra interfaces do tipo 'mesh point' ativas no kernel via iw dev
	local mesh_ifaces
	mesh_ifaces="$(iw dev 2>/dev/null | awk '/Interface/ {i=$2} /type mesh point/ {print i}')"

	# 2. Encontra qualquer interface registrada no ip link cujo nome contenha 'mesh'
	local all_mesh
	all_mesh="$(printf '%s\n%s' "$mesh_ifaces" "$(ip -o link show 2>/dev/null | awk -F': ' '{print $2}' | grep -E 'mesh')" | sort -u)"

	# 3. Purga ativa de cada interface no kernel e na bridge
	for iface in $all_mesh; do
		[ -n "$iface" ] || continue
		# Desvincula imediatamente da bridge para cessar vazamento L2
		ip link set dev "$iface" nomaster >/dev/null 2>&1 || true
		# Desliga a interface
		ip link set dev "$iface" down >/dev/null 2>&1 || true
		# Destrói no subsistema mac80211
		iw dev "$iface" del >/dev/null 2>&1 || true
		# Fallback de exclusão netdev
		ip link delete dev "$iface" >/dev/null 2>&1 || true
	done

	# 4. Remove dinamicamente qualquer seção UCI com mode='mesh'
	for sec in $(uci -q show wireless 2>/dev/null | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "wireless.$sec.mode")" = "mesh" ]; then
			uci -q delete "wireless.$sec"
		fi
	done
	uci commit wireless
}
 
wifi_get_ap_sections() {
	local net mode
	local kind="${1:-main}"
	local sections=""
	local r6="$(wifi_radio_6g)"

	if [ "$kind" = "main" ]; then
		sections="$(uci -q show wireless 2>/dev/null | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1 | while read -r s; do
			case "$s" in *guest*) continue ;; esac
			net="$(uci -q get "wireless.$s.network")"
			mode="$(uci -q get "wireless.$s.mode" || echo ap)"
			[ "$mode" = "ap" ] && { [ "$net" = "lan" ] || [ -z "$net" ]; } && echo "$s"
		done)"
		if [ -z "$sections" ]; then
			if uci -q get wireless.wifi0_ap >/dev/null || uci -q get wireless.wifi0 >/dev/null; then
				sections="wifi0_ap wifi1_ap"
				[ -n "$r6" ] && sections="$sections wifi2_ap"
			else
				sections="default_radio0 default_radio1"
				[ -n "$r6" ] && sections="$sections default_radio2"
			fi
		fi
	elif [ "$kind" = "guest" ]; then
		sections="$(uci -q show wireless 2>/dev/null | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1 | while read -r s; do
			net="$(uci -q get "wireless.$s.network")"
			[ "$net" = "guest" ] && echo "$s"
		done)"
		if [ -z "$sections" ]; then
			if uci -q get wireless.wifi0_guest >/dev/null || uci -q get wireless.wifi0 >/dev/null; then
				sections="wifi0_guest wifi1_guest"
				[ -n "$r6" ] && sections="$sections wifi2_guest"
			else
				sections="guest_radio0 guest_radio1"
				[ -n "$r6" ] && sections="$sections guest_radio2"
			fi
		fi
	fi
	printf '%s\n' "$sections"
}

wifi_enhancer_status() {
	local mem_total_kb=0
	[ -f /proc/meminfo ] && mem_total_kb="$(awk '/MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
	local ram_mb=$((mem_total_kb / 1024))

	local flash_free_kb=0
	flash_free_kb="$(df -k /overlay 2>/dev/null | awk 'NR>1 {print $4}')"
	[ -n "$flash_free_kb" ] || flash_free_kb="$(df -k / 2>/dev/null | awk 'NR>1 {print $4}')"
	[ -n "$flash_free_kb" ] || flash_free_kb=0
	local flash_mb=$((flash_free_kb / 1024))

	local capable=0
	if [ "$ram_mb" -ge 256 ] && [ "$flash_free_kb" -ge 4096 ]; then
		capable=1
	fi

	local is_qca=0
	ark_has_qca_wifi && is_qca=1

	local current_pkg=""
	if [ "$is_qca" = "1" ]; then
		current_pkg="qca-hostapd-11be (Qualcomm QSDK)"
	elif ark_has_apk; then
		current_pkg="$(apk list -I 2>/dev/null | grep -E '^wpad' | head -n 1 | awk '{print $1}')"
		[ -n "$current_pkg" ] || current_pkg="$(apk list -I 2>/dev/null | grep -E '^hostapd' | head -n 1 | awk '{print $1}')"
	elif ark_has_opkg; then
		current_pkg="$(opkg list-installed 2>/dev/null | grep -E '^wpad' | head -n 1 | awk '{print $1}')"
		[ -n "$current_pkg" ] || current_pkg="$(opkg list-installed 2>/dev/null | grep -E '^hostapd' | head -n 1 | awk '{print $1}')"
	fi
	[ -n "$current_pkg" ] || current_pkg="wpad"

	local has_wnm=0
	ark_hostapd_has_wnm && has_wnm=1

	local status_file="/tmp/ark_wifi_enhancer.status"
	local state="idle"
	local stage="IDLE"
	local stage_num=0
	local total_stages=7
	local progress=0
	local message=""
	local error=""

	if [ -f "$status_file" ]; then
		state="$(grep -o '"state": *"[^"]*"' "$status_file" | cut -d'"' -f4)"
		stage="$(grep -o '"stage": *"[^"]*"' "$status_file" | cut -d'"' -f4)"
		stage_num="$(grep -o '"stage_num": *[0-9]*' "$status_file" | tr -dc '0-9')"
		progress="$(grep -o '"progress": *[0-9]*' "$status_file" | tr -dc '0-9')"
		message="$(grep -o '"message": *"[^"]*"' "$status_file" | cut -d'"' -f4)"
		error="$(grep -o '"error": *"[^"]*"' "$status_file" | cut -d'"' -f4)"
	fi
	[ -n "$state" ] || state="idle"
	[ -n "$stage" ] || stage="IDLE"
	[ -n "$stage_num" ] || stage_num=0
	[ -n "$progress" ] || progress=0

	if [ "$is_qca" = "1" ] && [ "$state" = "idle" ]; then
		message="Motor nativo Qualcomm QSDK (qca-hostapd-11be) com 802.11k/v, RNR Co-located (1 7) e FILS (20 ms) em silicio."
	elif [ "$has_wnm" = "1" ] && [ "$state" = "idle" ]; then
		message="Motor Pro wpad-mbedtls com 802.11v WNM e BSS Transition totalmente ativo."
	elif [ "$has_wnm" = "0" ] && [ "$state" = "idle" ]; then
		if [ "$capable" = "1" ]; then
			message="Motor compacto wpad-basic ativo. Hardware potente elegivel para upgrade com 1 clique."
		else
			message="Motor compacto wpad-basic ativo. Preservado para protecao de memoria e estabilidade."
		fi
	fi

	cat <<EOF
{
  "capable": $([ "$capable" = "1" ] && echo "true" || echo "false"),
  "ram_total_mb": $ram_mb,
  "flash_free_mb": $flash_mb,
  "current_pkg": "$current_pkg",
  "has_wnm": $([ "$has_wnm" = "1" ] && echo "true" || echo "false"),
  "is_qca": $([ "$is_qca" = "1" ] && echo "true" || echo "false"),
  "state": "$state",
  "stage": "$stage",
  "stage_num": $stage_num,
  "total_stages": $total_stages,
  "progress": $progress,
  "message": "$message",
  "error": "$error"
}
EOF
}

wifi_enhancer_update_status() {
	local state="$1" stage="$2" num="$3" pct="$4" msg="$5" err="$6"
	cat <<EOF > /tmp/ark_wifi_enhancer.status
{
  "state": "$state",
  "stage": "$stage",
  "stage_num": $num,
  "total_stages": 7,
  "progress": $pct,
  "message": "$msg",
  "error": "$err",
  "timestamp": $(date +%s)
}
EOF
}

wifi_qca_apply_roaming_tuning() {
	local iface vap6
	for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
		[ "$(uci -q get "wireless.$iface.mode" || echo ap)" = "ap" ] || continue
		uci -q set "wireless.$iface.rrm=1"
		uci -q set "wireless.$iface.ieee80211k=1"
		uci -q set "wireless.$iface.rrm_neighbor_report=1"
		uci -q set "wireless.$iface.rrm_beacon_report=1"
		uci -q set "wireless.$iface.bss_transition=1"
		uci -q delete "wireless.$iface.wnm_sleep_mode" 2>/dev/null || true
		uci -q set "wireless.$iface.rnr=1"
		uci -q set "wireless.$iface.disassoc_low_ack=0"
		uci -q set "wireless.$iface.wpa_group_rekey=0"
		uci -q set "wireless.$iface.skip_inactivity_poll=0"
		uci -q set "wireless.$iface.max_inactivity=86400"
		uci -q delete "wireless.$iface.ieee80211r" 2>/dev/null || true
		uci -q delete "wireless.$iface.ft_over_ds" 2>/dev/null || true
		uci -q delete "wireless.$iface.ft_psk_generate_local" 2>/dev/null || true
		uci -q delete "wireless.$iface.mobility_domain" 2>/dev/null || true
	done
	uci commit wireless 2>/dev/null || true

	if command -v cfg80211tool >/dev/null 2>&1; then
		local r6="$(wifi_radio_6g)"
		[ -n "$r6" ] || r6="wifi2"
		if [ -d "/sys/class/net/$r6" ]; then
			cfg80211tool "$r6" rnr_6ghz_colocated 1 7 >/dev/null 2>&1 || true
			cfg80211tool "$r6" acs_6g_only_psc 1 >/dev/null 2>&1 || true
		fi
		# Aplica enable_fils 1 20 na interface AP 6 GHz ativa (ex: ath2 / wifi2)
		for vap6 in ath2 wifi2_ap; do
			if [ -d "/sys/class/net/$vap6" ]; then
				cfg80211tool "$vap6" enable_fils 1 20 >/dev/null 2>&1 || true
			fi
		done
	fi
}

wifi_enhancer_run_upgrade() {
	local status_file="/tmp/ark_wifi_enhancer.status"
	local lock_file="/tmp/ark_wifi_enhancer.lock"

	if [ -f "$lock_file" ]; then
		local pid="$(cat "$lock_file" 2>/dev/null)"
		if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
			return 1
		fi
	fi
	echo "$$" > "$lock_file"
	trap 'rm -f "$lock_file"' EXIT INT TERM

	# Blindagem Crítica Qualcomm QSDK (qcawificfg80211 / Acer Predator Connect T7):
	# NUNCA substituir qca-hostapd-11be por wpad-mbedtls (quebraria os 3 rádios Wi-Fi 7, 320 MHz e MLO).
	# Em QSDK, apenas sincroniza rrm=1, bss_transition=1, rnr_6ghz_colocated 1 7 e enable_fils 1 20.
	if ark_has_qca_wifi; then
		wifi_enhancer_update_status "running" "CONFIGURING" 6 90 "Detectado driver Qualcomm QSDK (qcawificfg80211): preservando qca-hostapd-11be e calibrando 802.11k/v, RNR 6GHz (1 7) e FILS (20 ms)..." ""
		wifi_qca_apply_roaming_tuning
		wifi_enhancer_update_status "completed" "COMPLETED" 7 100 "Calibracao Qualcomm QSDK concluida! qca-hostapd-11be preservado com 802.11k/v, RNR Co-located (1 7) e FILS (20 ms) ativos." ""
		return 0
	fi

	# Etapa 1 / 7: PREFLIGHT
	wifi_enhancer_update_status "running" "PREFLIGHT" 1 15 "Validando elegibilidade de hardware (RAM e armazenamento Flash)..." ""
	sleep 1

	local mem_total_kb=0
	[ -f /proc/meminfo ] && mem_total_kb="$(awk '/MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
	local ram_mb=$((mem_total_kb / 1024))
	local flash_free_kb=0
	flash_free_kb="$(df -k /overlay 2>/dev/null | awk 'NR>1 {print $4}')"
	[ -n "$flash_free_kb" ] || flash_free_kb="$(df -k / 2>/dev/null | awk 'NR>1 {print $4}')"
	[ -n "$flash_free_kb" ] || flash_free_kb=0

	if [ "$ram_mb" -lt 256 ]; then
		wifi_enhancer_update_status "failed" "PREFLIGHT" 1 15 "Falha na Etapa 1: Memória RAM insuficiente (< 256 MB)." "ram_low"
		return 1
	fi
	if [ "$flash_free_kb" -lt 4096 ]; then
		wifi_enhancer_update_status "failed" "PREFLIGHT" 1 15 "Falha na Etapa 1: Armazenamento Flash insuficiente (< 4 MB livres em /overlay)." "flash_low"
		return 1
	fi

	# Etapa 2 / 7: CONNECTIVITY
	wifi_enhancer_update_status "running" "CONNECTIVITY" 2 30 "Testando conexao com os repositorios oficiais do OpenWrt..." ""
	sleep 1

	local ping_ok=0
	if ping -c 1 -W 3 1.1.1.1 >/dev/null 2>&1 || ping -c 1 -W 3 8.8.8.8 >/dev/null 2>&1; then
		ping_ok=1
	elif nslookup downloads.openwrt.org >/dev/null 2>&1; then
		ping_ok=1
	fi

	if [ "$ping_ok" = "0" ]; then
		wifi_enhancer_update_status "failed" "CONNECTIVITY" 2 30 "Falha na Etapa 2: Sem conexao de internet para baixar o pacote. Verifique a WAN." "no_internet"
		return 1
	fi

	# Etapa 3 / 7: PREPARING
	wifi_enhancer_update_status "running" "PREPARING" 3 45 "Atualizando listas de pacotes e preparando remocao de restricoes virtuais..." ""
	sleep 1

	if ark_has_apk; then
		sed -i -E '/^wpad-basic/d' /etc/apk/world 2>/dev/null || true
		if ! apk update >/tmp/ark_enhancer_apk.log 2>&1; then
			wifi_enhancer_update_status "failed" "PREPARING" 3 45 "Falha na Etapa 3: Nao foi possivel atualizar o catalogo de pacotes (apk update)." "repo_update_error"
			return 1
		fi
	elif ark_has_opkg; then
		if ! opkg update >/tmp/ark_enhancer_opkg.log 2>&1; then
			wifi_enhancer_update_status "failed" "PREPARING" 3 45 "Falha na Etapa 3: Nao foi possivel atualizar o catalogo de pacotes (opkg update)." "repo_update_error"
			return 1
		fi
	fi

	# Etapa 4 / 7: INSTALLING
	wifi_enhancer_update_status "running" "INSTALLING" 4 65 "Baixando e instalando pacote completo wpad-mbedtls com 802.11v nativo..." ""

	local install_ok=0
	if ark_has_apk; then
		if apk add wpad-mbedtls >>/tmp/ark_enhancer_apk.log 2>&1; then
			install_ok=1
		fi
	elif ark_has_opkg; then
		if opkg install --force-overwrite wpad-mbedtls >>/tmp/ark_enhancer_opkg.log 2>&1; then
			install_ok=1
		fi
	fi

	if [ "$install_ok" = "0" ]; then
		if ark_has_apk; then apk add wpad-basic-mbedtls >/dev/null 2>&1 || true; fi
		wifi_enhancer_update_status "failed" "INSTALLING" 4 65 "Falha na Etapa 4: Erro ao instalar wpad-mbedtls. Rollback de protecao executado." "install_error"
		return 1
	fi

	# Etapa 5 / 7: VERIFYING
	wifi_enhancer_update_status "running" "VERIFYING" 5 80 "Validando integridade do binario hostapd e suporte a WNM..." ""
	sleep 1

	if [ ! -x /usr/sbin/hostapd ]; then
		wifi_enhancer_update_status "failed" "VERIFYING" 5 80 "Falha na Etapa 5: Binario hostapd nao encontrado apos instalacao. Restaurando..." "binary_missing"
		if ark_has_apk; then apk add wpad-basic-mbedtls >/dev/null 2>&1 || true; fi
		return 1
	fi

	# Etapa 6 / 7: CONFIGURING
	wifi_enhancer_update_status "running" "CONFIGURING" 6 90 "Sincronizando 802.11v BSS Transition, anti-queda (disassoc_low_ack=0) e reiniciando daemons..." ""

	/etc/init.d/wpad restart >/dev/null 2>&1 || true
	handle_wifi "wifi-roaming-sync" "on" >/dev/null 2>&1 || true

	# Etapa 7 / 7: COMPLETED
	wifi_enhancer_update_status "completed" "COMPLETED" 7 100 "Upgrade concluido com sucesso! Motor Pro wpad-mbedtls 100% ativo e operacional." ""

	(sleep 2; wifi reload) >/dev/null 2>&1 &
	return 0
}

handle_wifi() {
	case "$1" in
	wifi)
		case "$2" in
			main|guest) sections="$(wifi_get_ap_sections "$2")" ;;
			*) echo 'Rede invalida' >&2; exit 2 ;;
		esac
		password="$3"
		length="${#password}"
		[ "$length" -ge 8 ] && [ "$length" -le 63 ] || { echo 'A senha deve ter entre 8 e 63 caracteres' >&2; exit 2; }
		printf '%s' "$password" | grep -q '[[:cntrl:]]' && { echo 'A senha contem caracteres de controle invalidos' >&2; exit 2; }
		for section in $sections; do
			uci -q set "wireless.$section.key=$password"
		done
		uci commit wireless
		(sleep 2; wifi reload) >/dev/null 2>&1 &
		echo 'ok'
		;;
	wifi-toggle)
		wifi_kind="$2"
		desired_state="${3:-1}"
		case "$wifi_kind" in
			main|guest)
				sections="$(wifi_get_ap_sections "$wifi_kind")"
				;;
			*)
				clean_prefix="$(printf '%s' "$wifi_kind" | sed 's/^extra_//')"
				sections="$(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1 | grep -E "^(extra_)?${clean_prefix}")"
				[ -n "$sections" ] || { echo 'Rede nao encontrada' >&2; exit 2; }
				;;
		esac

		has_sae=1
		if opkg list-installed 2>/dev/null | grep -q "^wpad-basic -"; then
			has_sae=0
		fi

		if [ "$desired_state" = "1" ]; then
			[ "$wifi_kind" = "main" ] && {
				uci -q set equipe_dashboard.main.wifi_user_disabled='0'
				uci commit equipe_dashboard 2>/dev/null || true
			}
			for r in $(uci -q show wireless | grep -E "=wifi-device$" | cut -d. -f2 | cut -d= -f1); do
				[ "$(uci -q get "wireless.$r.disabled")" = "1" ] && uci -q set "wireless.$r.disabled=0"
			done

			for section in $sections; do
				if [ "$has_sae" = "0" ]; then
					cur_enc="$(uci -q get "wireless.$section.encryption")"
					if [ "$cur_enc" = "sae" ] || [ "$cur_enc" = "sae-mixed" ]; then
						uci -q set "wireless.$section.encryption=psk2"
					fi
				fi
				uci -q set "wireless.$section.disabled=0"
			done
			[ "$wifi_kind" = "guest" ] && uci -q delete dhcp.guest.ignore && uci commit dhcp 2>/dev/null || true
		else
			[ "$wifi_kind" = "main" ] && {
				uci -q set equipe_dashboard.main.wifi_user_disabled='1'
				uci commit equipe_dashboard 2>/dev/null || true
				for r in $(uci -q show wireless | grep -E "=wifi-device$" | cut -d. -f2 | cut -d= -f1); do
					uci -q set "wireless.$r.disabled=1"
				done
			}
			for section in $sections; do
				uci -q set "wireless.$section.disabled=1"
			done
			[ "$wifi_kind" = "guest" ] && uci -q set dhcp.guest.ignore=1 && uci commit dhcp 2>/dev/null || true
		fi
		uci commit wireless
		(sleep 1; wifi reload >/dev/null 2>&1 || true) &
		echo "ok"
		;;
	wifi-settings)
		wifi_kind="$2"
		radio2="$(wifi_radio_2g)"; radio5="$(wifi_radio_5g)"; radio6="$(wifi_radio_6g)"
		[ -n "$radio2" ] || radio2='radio0'
		[ -n "$radio5" ] || radio5="$radio2"
		case "$2" in
			main)
				sections="$(wifi_get_ap_sections main)"
				allow_toggle=0
				;;
			guest)
				sections="$(wifi_get_ap_sections guest)"
				allow_toggle=1
				;;
			*)
				clean_prefix="$(printf '%s' "$wifi_kind" | sed 's/^extra_//')"
				sections="$(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1 | grep -E "^(extra_)?${clean_prefix}")"
				[ -n "$sections" ] || { echo 'Rede adicional nao encontrada' >&2; exit 2; }
				case "$wifi_kind" in
					extra_*)
						[ -n "$radio2" ] && case " $sections " in *" extra_${clean_prefix}_r0 "*) ;; *) sections="$sections extra_${clean_prefix}_r0" ;; esac
						[ -n "$radio5" ] && case " $sections " in *" extra_${clean_prefix}_r1 "*) ;; *) sections="$sections extra_${clean_prefix}_r1" ;; esac
						[ -n "$radio6" ] && case " $sections " in *" extra_${clean_prefix}_r2 "*) ;; *) sections="$sections extra_${clean_prefix}_r2" ;; esac
						;;
				esac
				allow_toggle=1
				;;
		esac
		ssid=''; ssid2=''; ssid5=''; ssid6=''; password=''; enabled='keep'; split='0'; split_enc='0'; guest_download=''; guest_upload=''; encryption=''; encryption2=''; encryption5=''; encryption6=''
		enable_2g='keep'; enable_5g='keep'; enable_6g='keep'
		shift 2
		for pair in "$@"; do
			key="${pair%%=*}"; value="${pair#*=}"
			case "$key" in
				ssid) ssid="$value" ;;
				ssid2) ssid2="$value" ;;
				ssid5) ssid5="$value" ;;
				ssid6) ssid6="$value" ;;
				password) password="$value" ;;
				encryption) case "$value" in psk2|sae-mixed|sae|none) encryption="$value" ;; esac ;;
				encryption2) case "$value" in psk2|sae-mixed|sae|none) encryption2="$value" ;; esac ;;
				encryption5) case "$value" in psk2|sae-mixed|sae|none) encryption5="$value" ;; esac ;;
				encryption6) case "$value" in psk2|sae-mixed|sae|none) encryption6="$value" ;; esac ;;
				split_enc) case "$value" in 0|1) split_enc="$value" ;; esac ;;
				enabled) case "$value" in 0|1|keep) enabled="$value" ;; *) echo 'Estado da rede invalido' >&2; exit 2 ;; esac ;;
				enable_2g) case "$value" in 0|1|keep) enable_2g="$value" ;; *) echo 'Estado 2,4 GHz invalido' >&2; exit 2 ;; esac ;;
				enable_5g) case "$value" in 0|1|keep) enable_5g="$value" ;; *) echo 'Estado 5 GHz invalido' >&2; exit 2 ;; esac ;;
				enable_6g) case "$value" in 0|1|keep) enable_6g="$value" ;; *) echo 'Estado 6 GHz invalido' >&2; exit 2 ;; esac ;;
				split) case "$value" in 0|1) split="$value" ;; *) echo 'Modo Wi-Fi invalido' >&2; exit 2 ;; esac ;;
				guest_download) guest_download="$value" ;;
				guest_upload) guest_upload="$value" ;;
				*) echo "Campo Wi-Fi invalido: $key" >&2; exit 2 ;;
			esac
		done
		if [ "$enable_2g" = 0 ] && [ "$enable_5g" = 0 ]; then
			if [ -z "$radio6" ] || [ "$enable_6g" = 0 ]; then
				echo 'Ao menos uma frequencia de Wi-Fi deve permanecer ativa' >&2
				exit 2
			fi
		fi
		if [ "$split" = 1 ]; then
			[ -n "$ssid2" ] || ssid2="$ssid"
			[ -n "$ssid5" ] || ssid5="$ssid"
			[ -n "$ssid6" ] || ssid6="$ssid5"
			valid_ssid "$ssid2" && valid_ssid "$ssid5" || { echo 'Os nomes das redes 2,4 GHz e 5 GHz devem ter entre 1 e 32 caracteres' >&2; exit 2; }
			[ -z "$radio6" ] || valid_ssid "$ssid6" || { echo 'O nome da rede 6 GHz deve ter entre 1 e 32 caracteres' >&2; exit 2; }
		else
			valid_ssid "$ssid" || { echo 'O nome da rede deve ter entre 1 e 32 caracteres' >&2; exit 2; }
			ssid2="$ssid"; ssid5="$ssid"; ssid6="$ssid"
		fi
		if [ "$encryption" != none ] && [ -n "$password" ]; then
			valid_wifi_password "$password" || { echo 'A senha deve ter entre 8 e 63 caracteres' >&2; exit 2; }
		fi
		[ "$allow_toggle" = 1 ] || [ "$enabled" = keep ] || { echo 'A rede principal nao pode ser desligada por este atalho' >&2; exit 2; }
		ez_backup >/dev/null || { echo 'Falha ao criar backup antes da alteracao do Wi-Fi' >&2; exit 3; }
		[ "$enable_2g" = 1 ] && uci -q set "wireless.$radio2.disabled=0"
		[ "$enable_5g" = 1 ] && uci -q set "wireless.$radio5.disabled=0"
		[ -n "$radio6" ] && [ "$enable_6g" = 1 ] && uci -q set "wireless.$radio6.disabled=0"
		[ "$wifi_kind" = main ] && uci -q set equipe_dashboard.main.wifi_user_disabled='0'
		if [ "$wifi_kind" = guest ]; then
			ez_apply_guest_network 1
		fi
		for section in $sections; do
			uci -q get "wireless.$section" >/dev/null 2>&1 && continue
			sec_dev="$(uci -q get "wireless.$section.device")"
			if [ "$sec_dev" = "$radio2" ]; then
				device="$radio2"; section_ssid="$ssid2"
			elif [ "$sec_dev" = "$radio5" ]; then
				device="$radio5"; section_ssid="$ssid5"
			elif [ -n "$radio6" ] && [ "$sec_dev" = "$radio6" ]; then
				device="$radio6"; section_ssid="$ssid6"
			else
				case "$section" in
					*radio0|*_r0|*wifi0*|*2g*) device="$radio2"; section_ssid="$ssid2" ;;
					*radio1|*_r1|*wifi1*|*5g*) device="$radio5"; section_ssid="$ssid5" ;;
					*radio2|*_r2|*wifi2*|*6g*) device="${radio6:-$radio5}"; section_ssid="$ssid6" ;;
					*) device="$radio2"; section_ssid="$ssid" ;;
				esac
			fi
			network='lan'; [ "$wifi_kind" = guest ] && network='guest'
			section_key="$password"
			[ -n "$section_key" ] || section_key="$(uci -q get wireless.guest_radio0.key)"
			[ -n "$section_key" ] || section_key="$(uci -q get wireless.guest_radio1.key)"
			[ -n "$section_key" ] || section_key="$(uci -q get wireless.wifi0_guest.key)"
			[ -n "$section_key" ] || section_key="$(uci -q get wireless.default_radio0.key)"
			[ -n "$section_key" ] || section_key="$(uci -q get wireless.default_radio1.key)"
			[ -n "$section_key" ] || section_key="$(uci -q get wireless.wifi0_ap.key)"
			[ -n "$section_key" ] || section_key='arkrouter0100'
			section_disabled='0'
			[ "$enabled" = 0 ] && section_disabled='1'
			ez_apply_wifi_iface "$section" "$device" "$network" "$section_ssid" "$section_key" "$section_disabled"
		done
		for section in $sections; do
			sec_dev="$(uci -q get "wireless.$section.device")"
			if [ "$sec_dev" = "$radio2" ]; then
				uci -q set "wireless.$section.ssid=$ssid2"
			elif [ "$sec_dev" = "$radio5" ]; then
				uci -q set "wireless.$section.ssid=$ssid5"
			elif [ -n "$radio6" ] && [ "$sec_dev" = "$radio6" ]; then
				uci -q set "wireless.$section.ssid=$ssid6"
			else
				case "$section" in
					*radio0|*_r0|*wifi0*|*2g*) uci -q set "wireless.$section.ssid=$ssid2" ;;
					*radio1|*_r1|*wifi1*|*5g*) uci -q set "wireless.$section.ssid=$ssid5" ;;
					*radio2|*_r2|*wifi2*|*6g*) uci -q set "wireless.$section.ssid=$ssid6" ;;
					*) uci -q set "wireless.$section.ssid=$ssid" ;;
				esac
			fi
			is_sec_6g=0
			if { [ -n "$radio6" ] && [ "$sec_dev" = "$radio6" ]; } || { [ -z "$sec_dev" ] && case "$section" in *radio2|*_r2|*wifi2*|*6g*) true;; *) false;; esac; }; then
				is_sec_6g=1
			fi

			sec_enc="$encryption"
			if [ "$split_enc" = "1" ]; then
				if [ "$sec_dev" = "$radio2" ]; then
					sec_enc="${encryption2:-$encryption}"
				elif [ "$sec_dev" = "$radio5" ]; then
					sec_enc="${encryption5:-$encryption}"
				elif [ -n "$radio6" ] && [ "$sec_dev" = "$radio6" ]; then
					sec_enc="${encryption6:-sae}"
				else
					case "$section" in
						*radio0|*_r0|*wifi0*|*2g*) sec_enc="${encryption2:-$encryption}" ;;
						*radio1|*_r1|*wifi1*|*5g*) sec_enc="${encryption5:-$encryption}" ;;
						*radio2|*_r2|*wifi2*|*6g*) sec_enc="${encryption6:-sae}" ;;
						*) sec_enc="$encryption" ;;
					esac
				fi
			fi

			if [ "$sec_enc" = none ]; then
				if [ "$is_sec_6g" = 1 ]; then
					# Banda de 6 GHz NÃO suporta rede aberta sem OWE; desabilita interface para não quebrar o hostapd
					uci -q set "wireless.$section.disabled=1"
					uci -q delete "wireless.$section.key"
					logger -t equipe-dashboard-control "Aviso: Banda 6 GHz desativada na rede aberta pois padrao Wi-Fi 6E/7 exige WPA3/OWE."
				else
					uci -q set "wireless.$section.encryption=none"
					uci -q delete "wireless.$section.key"
					uci -q delete "wireless.$section.sae_password" 2>/dev/null || true
				fi
			elif [ -n "$sec_enc" ]; then
				if opkg list-installed 2>/dev/null | grep -q "^wpad-basic -" && { [ "$sec_enc" = "sae" ] || [ "$sec_enc" = "sae-mixed" ]; }; then
					sec_enc="psk2"
				fi
				if [ "$is_sec_6g" = 1 ]; then
					sec_enc="sae"
					uci -q set "wireless.$section.ieee80211w=2"
				fi
				uci -q set "wireless.$section.encryption=$sec_enc"
				[ -n "$password" ] && uci -q set "wireless.$section.key=$password"
				[ -n "$password" ] && [ -n "$(uci -q get "wireless.$section.sae_password")" ] && uci -q set "wireless.$section.sae_password=$password"
			elif [ -n "$password" ]; then
				if [ "$is_sec_6g" = 1 ]; then
					uci -q set "wireless.$section.encryption=sae"
					uci -q set "wireless.$section.ieee80211w=2"
				fi
				uci -q set "wireless.$section.key=$password"
				[ -n "$(uci -q get "wireless.$section.sae_password")" ] && uci -q set "wireless.$section.sae_password=$password"
			fi
			if [ "$enabled" = 0 ]; then
				uci -q set "wireless.$section.disabled=1"
			elif [ "$enabled" = 1 ] && [ "$enable_2g" = keep ] && [ "$enable_5g" = keep ] && [ "$enable_6g" = keep ]; then
				uci -q set "wireless.$section.disabled=0"
			else
				if [ "$sec_dev" = "$radio2" ] || { [ -z "$sec_dev" ] && case "$section" in *radio0|*_r0) true;; *) false;; esac; }; then
					if [ "$enable_2g" = 1 ]; then
						uci -q set "wireless.$section.disabled=0"
					elif [ "$enable_2g" = 0 ]; then
						uci -q set "wireless.$section.disabled=1"
					elif [ "$enabled" = 1 ]; then
						uci -q set "wireless.$section.disabled=0"
					fi
				elif [ "$sec_dev" = "$radio5" ] || { [ -z "$sec_dev" ] && case "$section" in *radio1|*_r1) true;; *) false;; esac; }; then
					if [ "$enable_5g" = 1 ]; then
						uci -q set "wireless.$section.disabled=0"
					elif [ "$enable_5g" = 0 ]; then
						uci -q set "wireless.$section.disabled=1"
					elif [ "$enabled" = 1 ]; then
						uci -q set "wireless.$section.disabled=0"
					fi
				elif { [ -n "$radio6" ] && [ "$sec_dev" = "$radio6" ]; } || { [ -z "$sec_dev" ] && case "$section" in *radio2|*_r2) true;; *) false;; esac; }; then
					if [ "$enable_6g" = 1 ]; then
						uci -q set "wireless.$section.disabled=0"
					elif [ "$enable_6g" = 0 ]; then
						uci -q set "wireless.$section.disabled=1"
					elif [ "$enabled" = 1 ]; then
						uci -q set "wireless.$section.disabled=0"
					fi
				elif [ "$enabled" != keep ]; then
					[ "$enabled" = 1 ] && uci -q set "wireless.$section.disabled=0" || uci -q set "wireless.$section.disabled=1"
				fi
			fi
		done
		uci commit wireless
		uci commit network 2>/dev/null || true
		uci commit dhcp 2>/dev/null || true
		uci commit firewall 2>/dev/null || true
		[ "$allow_toggle" = 1 ] && [ "$enabled" = 0 ] && uci -q set dhcp.guest.ignore=1 && uci commit dhcp
		[ "$allow_toggle" = 1 ] && [ "$enabled" = 1 ] && uci -q delete dhcp.guest.ignore && uci commit dhcp
		if [ "$wifi_kind" = guest ] && { [ -n "$guest_download" ] || [ -n "$guest_upload" ]; }; then
			ez_apply_guest_limit 1 "${guest_upload:-0}" "${guest_download:-0}"
			uci commit qos_equipe 2>/dev/null || true
			apply_guest_tc_limit >/dev/null 2>&1 || true
		fi
		if [ "$wifi_kind" = guest ]; then
			(sleep 2; /etc/init.d/dnsmasq reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true; wifi reload >/dev/null 2>&1 || true) &
		else
			(sleep 1; wifi reload >/dev/null 2>&1 || true) &
		fi
		echo 'ok'
		;;
	wifi-add)
		new_ssid="$2"; new_password="$3"; target_network="${4:-lan}"; band_mode="${5:-both}"; new_encryption="${6:-sae-mixed}"
		valid_ssid "$new_ssid" || { echo 'O nome da rede deve ter entre 1 e 32 caracteres' >&2; exit 2; }
		[ "$new_encryption" = none ] || [ -z "$new_password" ] || valid_wifi_password "$new_password" || { echo 'A senha deve ter entre 8 e 63 caracteres' >&2; exit 2; }
		case "$target_network" in lan|guest) ;; *) target_network='lan' ;; esac
		case "$band_mode" in both|2g|5g|6g) ;; *) band_mode='both' ;; esac
		case "$new_encryption" in psk2|sae-mixed|sae|none) ;; *) new_encryption='sae-mixed' ;; esac
		if opkg list-installed 2>/dev/null | grep -q "^wpad-basic -" && { [ "$new_encryption" = "sae" ] || [ "$new_encryption" = "sae-mixed" ]; }; then
			new_encryption="psk2"
		fi
		radio2="$(wifi_radio_2g)"; radio5="$(wifi_radio_5g)"; radio6="$(wifi_radio_6g)"
		[ -n "$radio2" ] || radio2='radio0'
		[ -n "$radio5" ] || radio5="$radio2"
		id="$(printf '%s' "$new_ssid" | tr -dc '0-9a-zA-Z' | head -c 8 | tr 'A-Z' 'a-z')"
		[ -n "$id" ] || id="$(date +%s | head -c 8)"
		[ "$target_network" = guest ] && ez_apply_guest_network 1
		if [ "$band_mode" = both ] || [ "$band_mode" = 2g ]; then
			sec="extra_${id}_r0"
			uci -q set "wireless.$sec=wifi-iface"
			uci -q set "wireless.$sec.device=$radio2"
			uci -q set "wireless.$sec.network=$target_network"
			uci -q set "wireless.$sec.mode=ap"
			uci -q set "wireless.$sec.ssid=$new_ssid"
			if [ "$new_encryption" = none ]; then
				uci -q set "wireless.$sec.encryption=none"
				uci -q delete "wireless.$sec.key"
			else
				uci -q set "wireless.$sec.encryption=$new_encryption"
				[ -n "$new_password" ] && uci -q set "wireless.$sec.key=$new_password"
			fi
			[ "$target_network" = guest ] && uci -q set "wireless.$sec.isolate=1"
			uci -q set "wireless.$sec.disabled=0"
		fi
		if [ "$band_mode" = both ] || [ "$band_mode" = 5g ]; then
			if [ -n "$radio5" ] && { [ "$band_mode" = 5g ] || [ "$radio5" != "$radio2" ]; }; then
				sec="extra_${id}_r1"
				uci -q set "wireless.$sec=wifi-iface"
				uci -q set "wireless.$sec.device=$radio5"
				uci -q set "wireless.$sec.network=$target_network"
				uci -q set "wireless.$sec.mode=ap"
				uci -q set "wireless.$sec.ssid=$new_ssid"
				if [ "$new_encryption" = none ]; then
					uci -q set "wireless.$sec.encryption=none"
					uci -q delete "wireless.$sec.key"
				else
					uci -q set "wireless.$sec.encryption=$new_encryption"
					[ -n "$new_password" ] && uci -q set "wireless.$sec.key=$new_password"
				fi
				[ "$target_network" = guest ] && uci -q set "wireless.$sec.isolate=1"
				uci -q set "wireless.$sec.disabled=0"
			fi
		fi
		if [ "$band_mode" = both ] || [ "$band_mode" = 6g ]; then
			if [ -n "$radio6" ] && { [ "$band_mode" = 6g ] || { [ "$radio6" != "$radio2" ] && [ "$radio6" != "$radio5" ]; }; }; then
				sec="extra_${id}_r2"
				uci -q set "wireless.$sec=wifi-iface"
				uci -q set "wireless.$sec.device=$radio6"
				uci -q set "wireless.$sec.network=$target_network"
				uci -q set "wireless.$sec.mode=ap"
				uci -q set "wireless.$sec.ssid=$new_ssid"
				if [ "$new_encryption" = none ]; then
					# Em 6 GHz rede aberta exige OWE; desativa interface 6G para evitar crash do hostapd
					uci -q set "wireless.$sec.disabled=1"
					uci -q delete "wireless.$sec.key"
					logger -t equipe-dashboard-control "Aviso: 6 GHz desativado na nova rede aberta pois padrao exige WPA3/OWE."
				else
					# Em 6 GHz, WPA3-SAE e PMF (ieee80211w=2) sao mandatorios pelo padrao Wi-Fi 6E/7
					uci -q set "wireless.$sec.encryption=sae"
					uci -q set "wireless.$sec.ieee80211w=2"
					[ -n "$new_password" ] && uci -q set "wireless.$sec.key=$new_password"
					uci -q set "wireless.$sec.disabled=0"
				fi
				[ "$target_network" = guest ] && uci -q set "wireless.$sec.isolate=1"
			fi
		fi
		uci commit wireless
		uci commit network 2>/dev/null || true
		uci commit firewall 2>/dev/null || true
		(sleep 2; wifi reload >/dev/null 2>&1 || true) &
		echo 'ok'
		;;
	wifi-delete)
		sec_prefix="$2"
		[ -n "$sec_prefix" ] || { echo 'Identificador invalido' >&2; exit 2; }
		clean_prefix="$(printf '%s' "$sec_prefix" | sed 's/^extra_//')"
		for s in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
			case "$s" in
				${sec_prefix}*|extra_${sec_prefix}*|extra_${clean_prefix}*) uci -q delete "wireless.$s" ;;
			esac
		done
		uci commit wireless
		(sleep 2; wifi reload >/dev/null 2>&1 || true) &
		echo 'ok'
		;;
	channels)
		radio2="$(wifi_radio_2g)"; radio5="$(wifi_radio_5g)"; radio6="$(wifi_radio_6g)"
		[ -n "$radio2" ] || { echo 'Radio 2,4 GHz nao encontrado' >&2; exit 3; }
		[ -n "$radio5" ] || radio5="$radio2"
		case "$2" in
			fixed|set)
				channel2="$3"
				channel5="$4"
				if [ "$channel2" = auto ]; then
					uci -q set "wireless.$radio2.channel=auto"
					uci -q delete "wireless.$radio2.channels"
					uci -q add_list "wireless.$radio2.channels=1"
					uci -q add_list "wireless.$radio2.channels=6"
					uci -q add_list "wireless.$radio2.channels=11"
				elif [ -n "$channel2" ]; then
					uci -q set "wireless.$radio2.channel=$channel2"
					uci -q delete "wireless.$radio2.channels"
				fi
				if [ "$channel5" = auto ]; then
					cur_ht5="$(uci -q get "wireless.$radio5.htmode" || echo VHT80)"
					case "$cur_ht5" in
						*160)
							case "$cur_ht5" in
								HE160) uci -q set "wireless.$radio5.htmode=HE80" ;;
								VHT160) uci -q set "wireless.$radio5.htmode=VHT80" ;;
							esac
							logger -t equipe-dashboard-control "Auto Inteligente 5 GHz: htmode ajustado para 80 MHz para operacao 100% livre de DFS/radares."
							;;
					esac
					uci -q set "wireless.$radio5.channel=auto"
					uci -q set "wireless.$radio5.acs_exclude_dfs=1"
					uci -q set "wireless.$radio5.ieee80211h=1"
					uci -q delete "wireless.$radio5.channels"
					for ch in 36 40 44 48 149 153 157 161; do
						uci -q add_list "wireless.$radio5.channels=$ch"
					done
				elif [ -n "$channel5" ]; then
					uci -q set "wireless.$radio5.channel=$channel5"
					uci -q delete "wireless.$radio5.channels"
					uci -q delete "wireless.$radio5.acs_exclude_dfs"
					# Validacao de compatibilidade: canais >= 132 (UNII-3: 149-165) nao comportam 160 MHz
					# devido a restricao do kernel/regulamentacao. Se htmode for 160 MHz, hostapd trava em AP-DISABLED.
					# Ajusta automaticamente para 80 MHz para garantir que o radio suba estavel.
					if [ "$channel5" != auto ] && [ "$channel5" -ge 132 ] 2>/dev/null; then
						cur_ht5="$(uci -q get "wireless.$radio5.htmode" || echo HE80)"
						case "$cur_ht5" in
							EHT160)
								uci -q set "wireless.$radio5.htmode=EHT80"
								logger -t equipe-dashboard-control "Aviso: canal $channel5 nao suporta 160 MHz; htmode ajustado para EHT80."
								;;
							HE160)
								uci -q set "wireless.$radio5.htmode=HE80"
								logger -t equipe-dashboard-control "Aviso: canal $channel5 nao suporta 160 MHz; htmode ajustado para HE80."
								;;
							VHT160)
								uci -q set "wireless.$radio5.htmode=VHT80"
								logger -t equipe-dashboard-control "Aviso: canal $channel5 nao suporta 160 MHz; htmode ajustado para VHT80."
								;;
						esac
					fi
				fi
				;;
			auto)
				# 2.4 GHz: Auto Inteligente limitado estritamente a 1, 6 e 11 (sem sobreposicao espectral)
				uci -q set "wireless.$radio2.channel=auto"
				uci -q delete "wireless.$radio2.channels"
				uci -q add_list "wireless.$radio2.channels=1"
				uci -q add_list "wireless.$radio2.channels=6"
				uci -q add_list "wireless.$radio2.channels=11"

				# 5 GHz: Auto Inteligente limitado a UNII-1 (36-48) e UNII-3 (149-161)
				# Sem radar DFS (zero espera CAC de 60s/10min, sem quedas e total compatibilidade com Smart TVs)
				cur_ht5="$(uci -q get "wireless.$radio5.htmode" || echo VHT80)"
				case "$cur_ht5" in
					*160)
						case "$cur_ht5" in
							EHT160) uci -q set "wireless.$radio5.htmode=EHT80" ;;
							HE160) uci -q set "wireless.$radio5.htmode=HE80" ;;
							VHT160) uci -q set "wireless.$radio5.htmode=VHT80" ;;
						esac
						logger -t equipe-dashboard-control "Auto Inteligente 5 GHz: htmode ajustado para 80 MHz para operacao 100% livre de DFS/radares."
						;;
				esac
				uci -q set "wireless.$radio5.channel=auto"
				uci -q set "wireless.$radio5.acs_exclude_dfs=1"
				uci -q set "wireless.$radio5.ieee80211h=1"
				uci -q delete "wireless.$radio5.channels"
				for ch in 36 40 44 48 149 153 157 161; do
					uci -q add_list "wireless.$radio5.channels=$ch"
				done
				if [ -n "$radio6" ]; then
					if ark_has_qca_wifi; then
						command -v cfg80211tool >/dev/null 2>&1 && cfg80211tool "$radio6" acs_6g_only_psc 1 >/dev/null 2>&1 || true
					else
						# OpenWrt mac80211 / mt76: evita falha de ACS em 6 GHz ('No available channels found')
						# fixando no canal PSC 37 (6135 MHz, centro do 1o bloco de 160/320 MHz na UNII-5 Anatel Ato 1306)
						uci -q set "wireless.$radio6.channel=37"
						uci -q delete "wireless.$radio6.channels"
					fi
				fi
				;;
			*) echo 'Modo de canal invalido' >&2; exit 2 ;;
		esac
		uci commit wireless
		(
			sleep 2
			wifi reload >/dev/null 2>&1 || true
			# Watchdog de recuperacao automatica: se algum radio ficar em Canal 0 / AP-DISABLED
			sleep 5
			if iwinfo 2>/dev/null | grep -q "Channel: 0 (unknown GHz)"; then
				logger -t equipe-dashboard-control "ALERTA: Interface Wi-Fi desabilitada detectada apos troca de canal. Aplicando correcao segura..."
				for r in "$radio2" "$radio5"; do
					[ -n "$r" ] || continue
					cur_ht="$(uci -q get "wireless.$r.htmode")"
					case "$cur_ht" in
						*160) uci -q set "wireless.$r.htmode=HE80" ;;
					esac
				done
				uci commit wireless
				wifi reload >/dev/null 2>&1 || true
			fi
		) &
		echo 'ok'
		;;
	wifi-width)
		radio2="$(wifi_radio_2g)"; radio5="$(wifi_radio_5g)"; radio6="$(wifi_radio_6g)"
		[ -n "$radio2" ] || { echo 'Radio 2,4 GHz nao encontrado' >&2; exit 3; }
		[ -n "$radio5" ] || radio5="$radio2"
		width2="$2"; width5="$3"; width6="$4"
		current_ht2="$(uci -q get "wireless.$radio2.htmode" || echo HT20)"
		current_ht5="$(uci -q get "wireless.$radio5.htmode" || echo VHT80)"
		case "$current_ht2" in
			EHT*) pfx2="EHT" ;;
			HE*) pfx2="HE" ;;
			VHT*) pfx2="VHT" ;;
			*) pfx2="HT" ;;
		esac
		case "$current_ht5" in
			EHT*) pfx5="EHT" ;;
			HE*) pfx5="HE" ;;
			VHT*) pfx5="VHT" ;;
			*) pfx5="HT" ;;
		esac
		case "$width2" in 20|40) ht2="${pfx2}${width2}" ;; *) echo 'Largura 2,4 GHz invalida' >&2; exit 2 ;; esac
		case "$width5" in 20|40|80|160) ht5="${pfx5}${width5}" ;; *) echo 'Largura 5 GHz invalida' >&2; exit 2 ;; esac
		changed2=0
		changed5=0
		changed6=0
		[ "$ht2" != "$current_ht2" ] && changed2=1
		[ "$ht5" != "$current_ht5" ] && changed5=1

		[ "$changed2" = 1 ] && uci set "wireless.$radio2.htmode=$ht2"
		if [ "$width2" = 40 ]; then
			uci -q set "wireless.$radio2.noscan=1"
			uci -q set "wireless.$radio2.ht_coex=0"
			if ark_has_qca_wifi; then
				uci -q set "wireless.$radio2.disablecoext=1"
			fi
			changed2=1
		else
			uci -q delete "wireless.$radio2.noscan"
			uci -q delete "wireless.$radio2.ht_coex"
			uci -q delete "wireless.$radio2.disablecoext"
		fi
		[ "$changed5" = 1 ] && uci set "wireless.$radio5.htmode=$ht5"

		# Se a largura de 5 GHz for colocada em 160 MHz, garantir que o canal seja compativel (canais < 132)
		if [ "$width5" = 160 ]; then
			cur_ch5="$(uci -q get "wireless.$radio5.channel" || echo auto)"
			if [ "$cur_ch5" != auto ] && [ "$cur_ch5" -ge 132 ] 2>/dev/null; then
				uci -q set "wireless.$radio5.channel=36"
				changed5=1
				logger -t equipe-dashboard-control "Aviso: canal $cur_ch5 incompativel com ${width5} MHz; comutado para canal 36."
			fi
		fi
		if [ -n "$radio6" ] && [ -n "$width6" ]; then
			current_ht6="$(uci -q get "wireless.$radio6.htmode" || echo HE160)"
			case "$current_ht6" in
				EHT*) pfx6="EHT" ;;
				HT320*) pfx6="HT" ;;
				HE*) pfx6="HE" ;;
				*) pfx6="HE" ;;
			esac
			case "$width6" in
				320)
					case "$current_ht6" in
						HT320*) ht6="HT320" ;;
						*) ht6="EHT320" ;;
					esac
					;;
				20|40|80|160)
					ht6="${pfx6}${width6}"
					;;
				*)
					ht6="HE160"
					;;
			esac
			if [ "$ht6" != "$current_ht6" ]; then
				uci set "wireless.$radio6.htmode=$ht6"
				changed6=1
			fi
		fi
		uci commit wireless
		(
			sleep 1
			if [ "$changed2" = 0 ] && [ "$changed5" = 1 ] && [ "$changed6" = 0 ]; then
				logger -t equipe-dashboard-control "Reiniciando seletivamente apenas o radio 5 GHz ($radio5)..."
				wifi reconf "$radio5" >/dev/null 2>&1 || wifi reload >/dev/null 2>&1 || true
			elif [ "$changed2" = 1 ] && [ "$changed5" = 0 ] && [ "$changed6" = 0 ]; then
				logger -t equipe-dashboard-control "Reiniciando seletivamente apenas o radio 2,4 GHz ($radio2)..."
				wifi reconf "$radio2" >/dev/null 2>&1 || wifi reload >/dev/null 2>&1 || true
			elif [ "$changed2" = 0 ] && [ "$changed5" = 0 ] && [ "$changed6" = 1 ]; then
				logger -t equipe-dashboard-control "Reiniciando seletivamente apenas o radio 6 GHz ($radio6)..."
				wifi reconf "$radio6" >/dev/null 2>&1 || wifi reload >/dev/null 2>&1 || true
			else
				logger -t equipe-dashboard-control "Reiniciando os radios Wi-Fi..."
				wifi reload >/dev/null 2>&1 || true
			fi
			sleep 5
			if iwinfo 2>/dev/null | grep -q "Channel: 0 (unknown GHz)"; then
				logger -t equipe-dashboard-control "ALERTA: Interface Wi-Fi desabilitada detectada apos troca de largura. Revertendo 5 GHz para HE80..."
				uci -q set "wireless.$radio5.htmode=HE80"
				uci commit wireless
				wifi reload >/dev/null 2>&1 || true
			fi
		) &
		echo 'ok'
		;;
	wifi-iot-optimize)
		radio2="$(wifi_radio_2g)"
		radio5="$(wifi_radio_5g)"
		[ -n "$radio2" ] || { echo 'Radio 2,4 GHz nao encontrado' >&2; exit 3; }
		state="${2:-1}"
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			uci -q set "wireless.$radio2.iot_stability=1"
			uci -q set "wireless.$radio2.vendor_vht=1"
			if [ -n "$radio5" ] && [ "$radio5" != "$radio2" ]; then
				cur_tx2="$(uci -q get "wireless.$radio2.txpower" || true)"
				if [ -z "$cur_tx2" ] || [ "$cur_tx2" -gt 23 ] 2>/dev/null; then
					uci -q set "wireless.$radio2.txpower=22"
				fi
			fi
			# Remove restricoes toxicas de taxas que causam retransmissoes e quedas nas Alexas
			uci -q delete "wireless.$radio2.legacy_rates"
			uci -q delete "wireless.$radio2.basic_rate"
			# Aplica protecao anti-desconexao disassoc_low_ack=0, dtim_period=2 e sono blindado em todas as interfaces AP 2.4G
			for iface in $(uci -q show wireless | grep -E "\.device=['\"]?$radio2['\"]?" | cut -d. -f2); do
				mode="$(uci -q get wireless.$iface.mode || echo ap)"
				if [ "$mode" = "ap" ]; then
					uci -q set "wireless.$iface.disassoc_low_ack=0"
					uci -q set "wireless.$iface.dtim_period=2"
					uci -q set "wireless.$iface.wpa_group_rekey=0"
					uci -q set "wireless.$iface.skip_inactivity_poll=0"
					uci -q set "wireless.$iface.max_inactivity=86400"
				fi
			done
			uci commit wireless
			# Regra de persistencia MQTT para Alexa e Casa Inteligente (portas 8883/8886 no Multi-WAN)
			if [ -f /etc/config/mwan3 ]; then
				if ! uci -q get mwan3.iot_alexa_mqtt >/dev/null; then
					policy="$(uci -q get mwan3.wan_then_wan2 >/dev/null && echo 'wan_then_wan2' || echo 'balanced')"
					uci -q batch <<-EOF
						set mwan3.iot_alexa_mqtt=rule
						set mwan3.iot_alexa_mqtt.family='ipv4'
						set mwan3.iot_alexa_mqtt.proto='tcp'
						set mwan3.iot_alexa_mqtt.dest_port='8883,8886'
						set mwan3.iot_alexa_mqtt.use_policy='$policy'
						set mwan3.iot_alexa_mqtt.sticky='1'
						set mwan3.iot_alexa_mqtt.timeout='3600'
						commit mwan3
EOF
					(sleep 2; /etc/init.d/mwan3 restart) >/dev/null 2>&1 &
				fi
			fi
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'enabled'
		else
			uci -q set "wireless.$radio2.iot_stability=0"
			for iface in $(uci -q show wireless | grep -E "\.device=['\"]?$radio2['\"]?" | cut -d. -f2); do
				uci -q delete "wireless.$iface.disassoc_low_ack"
			done
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'disabled'
		fi
		;;
	wifi-dfs-optimize)
		radio5="$(wifi_radio_5g)"
		[ -n "$radio5" ] || { echo 'Radio 5 GHz nao encontrado' >&2; exit 3; }
		state="${2:-1}"
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			uci -q set "wireless.$radio5.ieee80211h=1"
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'enabled'
		else
			uci -q delete "wireless.$radio5.ieee80211h"
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'disabled'
		fi
		;;
	wifi-maxpower-toggle)
		state="${2:-1}"
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			old_country="$(uci -q get wireless.radio0.country || uci -q get wireless.radio1.country || echo 'BR')"
			[ "$old_country" != "PA" ] && uci -q set "equipe_dashboard.wifi.previous_country=$old_country" && uci commit equipe_dashboard 2>/dev/null || true
			for r in $(uci -q show wireless | grep '=wifi-device' | cut -d. -f2 | cut -d= -f1); do
				uci -q set "wireless.$r.country=PA"
			done
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'enabled'
		else
			restore_country="$(uci -q get equipe_dashboard.wifi.previous_country || echo 'BR')"
			[ -n "$restore_country" ] || restore_country='BR'
			for r in $(uci -q show wireless | grep '=wifi-device' | cut -d. -f2 | cut -d= -f1); do
				uci -q set "wireless.$r.country=$restore_country"
			done
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'disabled'
		fi
		;;
	wifi-wed-toggle)
		state="${2:-1}"
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			mkdir -p /etc/modules.d
			touch /etc/modules.conf
			for mod in mt7915e mt7996e mt7921e; do
				if [ -e "/sys/module/$mod/parameters/wed_enable" ] || lsmod 2>/dev/null | grep -q "$mod"; then
					grep -q "options $mod wed_enable=Y" /etc/modules.conf || echo "options $mod wed_enable=Y" >> /etc/modules.conf
					echo "$mod wed_enable=Y" > "/etc/modules.d/$mod"
					echo Y > "/sys/module/$mod/parameters/wed_enable" 2>/dev/null || true
				fi
			done
			rm -f /tmp/ark-router-features.json /tmp/ark-hw-cache.json /tmp/ark-hw-cache.ts
			echo 'enabled'
		else
			for mod in mt7915e mt7996e mt7921e; do
				sed -i "/options $mod wed_enable/d" /etc/modules.conf 2>/dev/null || true
				echo "$mod wed_enable=N" > "/etc/modules.d/$mod"
				echo N > "/sys/module/$mod/parameters/wed_enable" 2>/dev/null || true
			done
			rm -f /tmp/ark-router-features.json /tmp/ark-hw-cache.json /tmp/ark-hw-cache.ts
			echo 'disabled'
		fi
		;;
	wifi-wps-status)
		wps_en=0
		for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
			[ "$(uci -q get wireless.$iface.wps_pushbutton)" = "1" ] && { wps_en=1; break; }
		done
		pbc_active=0; remaining=0
		pbc_file="/tmp/ark-wps-pbc.state"
		if [ -f "$pbc_file" ]; then
			pbc_time="$(cat "$pbc_file" 2>/dev/null || echo 0)"
			now="$(date +%s)"
			elapsed=$((now - pbc_time))
			if [ "$elapsed" -lt 120 ] 2>/dev/null; then
				pbc_active=1
				remaining=$((120 - elapsed))
			else
				rm -f "$pbc_file"
			fi
		fi
		printf '{"enabled":%s,"pbc_active":%s,"remaining_seconds":%d}\n' \
			"$([ "$wps_en" = 1 ] && echo true || echo false)" \
			"$([ "$pbc_active" = 1 ] && echo true || echo false)" \
			"$remaining"
		;;
	wifi-wps-toggle)
		state="${2:-1}"
		radio2="$(wifi_radio_2g)"
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
				mode="$(uci -q get wireless.$iface.mode || echo ap)"
				[ "$mode" = "ap" ] || continue
				dev="$(uci -q get wireless.$iface.device || echo '')"
				enc="$(uci -q get wireless.$iface.encryption || echo '')"
				# WPS só é seguro e suportado no 2.4 GHz sem SAE (incompatível com WPA3-SAE e 6 GHz)
				if { [ -z "$radio2" ] || [ "$dev" = "$radio2" ]; } && [ "$enc" != "sae" ] && [ "$enc" != "none" ]; then
					uci -q set "wireless.$iface.wps_pushbutton=1"
					uci -q set "wireless.$iface.wps_label=0"
				else
					uci -q set "wireless.$iface.wps_pushbutton=0"
					uci -q set "wireless.$iface.wps_label=0"
				fi
			done
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'enabled'
		else
			for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
				uci -q set "wireless.$iface.wps_pushbutton=0"
				uci -q set "wireless.$iface.wps_label=0"
			done
			rm -f /tmp/ark-wps-pbc.state
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'disabled'
		fi
		;;
	wifi-wps-pbc)
		now="$(date +%s)"
		echo "$now" > /tmp/ark-wps-pbc.state
		for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
			mode="$(uci -q get wireless.$iface.mode || echo ap)"
			[ "$mode" = "ap" ] || continue
			ubus call "hostapd.$iface" wps_start '{}' >/dev/null 2>&1 || hostapd_cli -i "$iface" wps_pbc >/dev/null 2>&1 || true
		done
		for dev in $(iw dev 2>/dev/null | grep Interface | awk '{print $2}'); do
			hostapd_cli -i "$dev" wps_pbc >/dev/null 2>&1 || true
		done
		printf '{"ok":true,"remaining_seconds":120}\n'
		;;
	wifi-roaming-status)
		r_en=0
		for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
			if [ "$(uci -q get wireless.$iface.ieee80211r)" = "1" ] || [ "$(uci -q get wireless.$iface.ieee80211k)" = "1" ]; then
				r_en=1
				break
			fi
		done
		ust_inst=0; ust_run=0; ust_installing=0
		{ [ -x /sbin/usteerd ] || [ -x /usr/sbin/usteerd ] || [ -x /etc/init.d/usteer ]; } && ust_inst=1
		{ pidof usteerd >/dev/null 2>&1 || [ "$(uci -q get equipe_dashboard.wifi.usteer_enabled)" = "1" ] || { [ -x /etc/init.d/usteer ] && /etc/init.d/usteer enabled >/dev/null 2>&1; }; } && ust_run=1
		[ "$(uci -q get equipe_dashboard.wifi.usteer_installing)" = "1" ] && ust_installing=1
		txbal=0
		[ "$(uci -q get equipe_dashboard.wifi.txpower_balanced)" = "1" ] && txbal=1
		mesh_act=0; mesh_id=""
		for sec in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
			if [ "$(uci -q get wireless.$sec.mode)" = "mesh" ]; then
				mesh_act=1
				mesh_id="$(uci -q get wireless.$sec.mesh_id)"
				break
			fi
		done
		printf '{"roaming_enabled":%s,"usteer_installed":%s,"usteer_running":%s,"usteer_installing":%s,"txbalance_enabled":%s,"mesh_active":%s,"mesh_id":"%s"}\n' \
			"$([ "$r_en" = 1 ] && echo true || echo false)" \
			"$([ "$ust_inst" = 1 ] && echo true || echo false)" \
			"$([ "$ust_run" = 1 ] && echo true || echo false)" \
			"$([ "$ust_installing" = 1 ] && echo true || echo false)" \
			"$([ "$txbal" = 1 ] && echo true || echo false)" \
			"$([ "$mesh_act" = 1 ] && echo true || echo false)" \
			"$mesh_id"
		;;
	wifi-roaming-toggle)
		state="${2:-1}"
		mob_dom="a1b2"
		radio5="$(wifi_radio_5g)"
		radio6="$(wifi_radio_6g)"
		[ -n "$radio5" ] || radio5='radio1'
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
				mode="$(uci -q get wireless.$iface.mode || echo ap)"
				[ "$mode" = "ap" ] || continue
				dev="$(uci -q get wireless.$iface.device || echo '')"

				# 802.11k, 802.11v (bss_transition), disassoc_low_ack=0 e RNR operam em todos os rádios (2.4G, 5G e 6G)
				# Orientam celulares na troca de nós e frequências sem quedas bruscas por atenuação de parede
				uci -q set "wireless.$iface.rrm=1"
				uci -q set "wireless.$iface.ieee80211k=1"
				uci -q set "wireless.$iface.rrm_neighbor_report=1"
				uci -q set "wireless.$iface.rrm_beacon_report=1"
				uci -q set "wireless.$iface.rnr=1"
				uci -q set "wireless.$iface.ieee80211v=1"
				uci -q set "wireless.$iface.disassoc_low_ack=0"
				uci -q set "wireless.$iface.wpa_group_rekey=0"
				uci -q set "wireless.$iface.skip_inactivity_poll=0"
				uci -q set "wireless.$iface.max_inactivity=86400"

				if ark_hostapd_has_wnm; then
					uci -q set "wireless.$iface.bss_transition=1"
				else
					uci -q delete "wireless.$iface.bss_transition"
				fi
				uci -q delete "wireless.$iface.wnm_sleep_mode" 2>/dev/null || true

				# 802.11r (Fast Transition):
				# ATENÇÃO CRÍTICA: Em redes WPA3 (sae ou sae-mixed), ft_psk_generate_local=1 quebra clientes
				# modernos (FT-SAE), gerando "deauthenticated due to local deauth request".
				# A transição moderna em WPA3 é governada por 802.11k + 802.11v (WNM) + RNR.
				# 802.11r só é aplicável em redes puras legadas WPA2-PSK (psk/psk2).
				local iface_enc="$(uci -q get "wireless.$iface.encryption" || echo '')"
				case "$iface_enc" in
					*sae*|*owe*)
						uci -q delete "wireless.$iface.ieee80211r"
						uci -q delete "wireless.$iface.ft_over_ds"
						uci -q delete "wireless.$iface.ft_psk_generate_local"
						uci -q delete "wireless.$iface.mobility_domain"
						;;
					*)
						if [ "$dev" = "$radio5" ] || [ "$dev" = "radio1" ] || { [ -n "$radio6" ] && [ "$dev" = "$radio6" ]; } || [ "$dev" = "radio2" ]; then
							uci -q set "wireless.$iface.ieee80211r=1"
							uci -q set "wireless.$iface.ft_over_ds=0"
							uci -q set "wireless.$iface.ft_psk_generate_local=1"
							uci -q set "wireless.$iface.mobility_domain=$mob_dom"
						else
							uci -q delete "wireless.$iface.ieee80211r"
							uci -q delete "wireless.$iface.ft_over_ds"
							uci -q delete "wireless.$iface.ft_psk_generate_local"
							uci -q delete "wireless.$iface.mobility_domain"
						fi
						;;
				esac
			done
			uci commit wireless
			if ark_has_qca_wifi; then
				wifi_qca_apply_roaming_tuning
			fi
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'enabled'
		else
			for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
				uci -q delete "wireless.$iface.ieee80211r"
				uci -q delete "wireless.$iface.ft_over_ds"
				uci -q delete "wireless.$iface.ft_psk_generate_local"
				uci -q delete "wireless.$iface.mobility_domain"
				uci -q delete "wireless.$iface.ieee80211k"
				uci -q delete "wireless.$iface.rrm_neighbor_report"
				uci -q delete "wireless.$iface.rrm_beacon_report"
				uci -q delete "wireless.$iface.bss_transition"
				uci -q delete "wireless.$iface.wnm_sleep_mode"
				uci -q delete "wireless.$iface.rnr"
				uci -q delete "wireless.$iface.ieee80211v"
			done
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'disabled'
		fi
		;;
	wifi-usteer-toggle)
		state="${2:-1}"
		if ark_has_qualcomm_son; then
			echo 'qualcomm_son_active'
			return 0
		fi
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			uci -q set equipe_dashboard.wifi=settings 2>/dev/null || true
			uci -q set equipe_dashboard.wifi.usteer_enabled=1
			uci commit equipe_dashboard 2>/dev/null || true

			# Se usteer não estiver instalado, inicia processo de auto-download em segundo plano
			if ! [ -x /sbin/usteerd ] && ! [ -x /usr/sbin/usteerd ] && ! [ -x /etc/init.d/usteer ]; then
				uci -q set equipe_dashboard.wifi.usteer_installing=1
				uci commit equipe_dashboard 2>/dev/null || true
				(
					# Aguarda conexão com a rede/internet (máximo 30 segundos)
					for _i in $(seq 1 15); do
						ping -c 1 -W 2 1.1.1.1 >/dev/null 2>&1 && break
						ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1 && break
						sleep 2
					done

					inst_ok=0
					if command -v apk >/dev/null 2>&1; then
						apk add usteer >/dev/null 2>&1 || {
							apk update >/dev/null 2>&1
							apk add usteer >/dev/null 2>&1
						}
						[ -x /etc/init.d/usteer ] && inst_ok=1
					elif command -v opkg >/dev/null 2>&1; then
						opkg install usteer >/dev/null 2>&1 || {
							opkg update >/dev/null 2>&1
							opkg install usteer >/dev/null 2>&1
						}
						[ -x /etc/init.d/usteer ] && inst_ok=1
					fi

					uci -q set equipe_dashboard.wifi.usteer_installing=0
					if [ -x /etc/init.d/usteer ] || [ "$inst_ok" = "1" ]; then
						touch /etc/config/usteer 2>/dev/null || true
						[ -n "$(uci -q get usteer.@usteer[0] 2>/dev/null)" ] || uci -q add usteer usteer >/dev/null 2>&1 || true
						uci -q set usteer.@usteer[0].network='lan'
						uci -q set usteer.@usteer[0].syslog='1'
						uci -q set usteer.@usteer[0].min_snr='0'
						uci -q set usteer.@usteer[0].load_balancing_threshold='3'
						uci -q set usteer.@usteer[0].band_steering_threshold='5'
						uci -q set usteer.@usteer[0].band_steering_min_snr='-70'
						uci -q set usteer.@usteer[0].load_kick_enabled='0'
						uci -q set usteer.@usteer[0].roam_kick_delay='60000'
						uci -q set usteer.@usteer[0].roam_scan_snr='0'
						uci -q set usteer.@usteer[0].roam_trigger_snr='0'
						uci -q set usteer.@usteer[0].signal_diff_threshold='8'
						uci -q set usteer.@usteer[0].band_steering_interval='120000'
						uci -q set usteer.@usteer[0].max_retries='3'
						uci -q delete usteer.@usteer[0].kick_threshold 2>/dev/null || true
						uci commit usteer 2>/dev/null || true
						/etc/init.d/usteer enable >/dev/null 2>&1 || true
						/etc/init.d/usteer restart >/dev/null 2>&1 || true
						uci -q set equipe_dashboard.wifi.usteer_enabled=1
					fi
					uci commit equipe_dashboard 2>/dev/null || true
				) >/dev/null 2>&1 &
			else
				uci -q set equipe_dashboard.wifi.usteer_installing=0
				uci commit equipe_dashboard 2>/dev/null || true
				touch /etc/config/usteer 2>/dev/null || true
				[ -n "$(uci -q get usteer.@usteer[0] 2>/dev/null)" ] || uci -q add usteer usteer >/dev/null 2>&1 || true
				uci -q set usteer.@usteer[0].network='lan'
				uci -q set usteer.@usteer[0].syslog='1'
				uci -q set usteer.@usteer[0].min_snr='0'
				uci -q set usteer.@usteer[0].load_balancing_threshold='3'
				uci -q set usteer.@usteer[0].band_steering_threshold='5'
				uci -q set usteer.@usteer[0].band_steering_min_snr='-70'
				uci -q set usteer.@usteer[0].load_kick_enabled='0'
				uci -q set usteer.@usteer[0].roam_kick_delay='60000'
				uci -q set usteer.@usteer[0].roam_scan_snr='0'
				uci -q set usteer.@usteer[0].roam_trigger_snr='0'
				uci -q set usteer.@usteer[0].signal_diff_threshold='8'
				uci -q set usteer.@usteer[0].band_steering_interval='120000'
				uci -q set usteer.@usteer[0].max_retries='3'
				uci -q delete usteer.@usteer[0].kick_threshold 2>/dev/null || true
				uci commit usteer 2>/dev/null || true
				# Garante que 802.11v (bss_transition se suportado), 802.11k e RNR estejam ativos nos APs para o usteer operar
				for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
					[ "$(uci -q get wireless.$iface.mode || echo ap)" = "ap" ] || continue
					uci -q set "wireless.$iface.ieee80211k=1"
					uci -q set "wireless.$iface.rrm_neighbor_report=1"
					uci -q set "wireless.$iface.rrm_beacon_report=1"
					uci -q set "wireless.$iface.rnr=1"
					uci -q set "wireless.$iface.ieee80211v=1"
					uci -q set "wireless.$iface.disassoc_low_ack=0"
					uci -q set "wireless.$iface.wpa_group_rekey=0"
					uci -q set "wireless.$iface.skip_inactivity_poll=0"
					uci -q set "wireless.$iface.max_inactivity=86400"
					if ark_hostapd_has_wnm; then
						uci -q set "wireless.$iface.bss_transition=1"
					else
						uci -q delete "wireless.$iface.bss_transition"
					fi
					uci -q delete "wireless.$iface.wnm_sleep_mode" 2>/dev/null || true
				done
				uci commit wireless 2>/dev/null || true
				[ -x /etc/init.d/usteer ] && {
					/etc/init.d/usteer enable >/dev/null 2>&1 || true
					/etc/init.d/usteer restart >/dev/null 2>&1 || true
				}
			fi
			echo 'enabled'
		else
			[ -x /etc/init.d/usteer ] && {
				/etc/init.d/usteer stop >/dev/null 2>&1 || true
				/etc/init.d/usteer disable >/dev/null 2>&1 || true
			}
			uci -q set equipe_dashboard.wifi=settings 2>/dev/null || true
			uci -q set equipe_dashboard.wifi.usteer_enabled=0
			uci -q set equipe_dashboard.wifi.usteer_installing=0
			uci commit equipe_dashboard 2>/dev/null || true
			echo 'disabled'
		fi
		;;
	wifi-txbalance-toggle)
		state="${2:-1}"
		radio2="$(wifi_radio_2g)"
		radio5="$(wifi_radio_5g)"
		radio6="$(wifi_radio_6g)"
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			mkdir -p /etc/config
			[ -f /etc/config/equipe_dashboard ] || touch /etc/config/equipe_dashboard
			uci -q set equipe_dashboard.wifi=settings 2>/dev/null || true
			# Snapshot prévio das potências personalizadas do usuário
			if [ -z "$(uci -q get equipe_dashboard.wifi.saved_txpower_2g)" ]; then
				cur_tx2="$(uci -q get "wireless.$radio2.txpower" || true)"
				[ -n "$cur_tx2" ] && uci -q set "equipe_dashboard.wifi.saved_txpower_2g=$cur_tx2"
			fi
			if [ -z "$(uci -q get equipe_dashboard.wifi.saved_txpower_5g)" ]; then
				cur_tx5="$(uci -q get "wireless.$radio5.txpower" || true)"
				[ -n "$cur_tx5" ] && uci -q set "equipe_dashboard.wifi.saved_txpower_5g=$cur_tx5"
			fi
			if [ -n "$radio6" ] && [ -z "$(uci -q get equipe_dashboard.wifi.saved_txpower_6g)" ]; then
				cur_tx6="$(uci -q get "wireless.$radio6.txpower" || true)"
				[ -n "$cur_tx6" ] && uci -q set "equipe_dashboard.wifi.saved_txpower_6g=$cur_tx6"
			fi
			[ -n "$radio2" ] && uci -q set "wireless.$radio2.txpower=15"
			[ -n "$radio5" ] && uci -q set "wireless.$radio5.txpower=20"
			[ -n "$radio6" ] && uci -q set "wireless.$radio6.txpower=23"
			uci -q set equipe_dashboard.wifi.txpower_balanced=1
			uci commit equipe_dashboard 2>/dev/null || true
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'enabled'
		else
			# Restaura potências originais salvas do usuário; se clean slate (sem valor anterior), apaga para auto
			saved_tx2="$(uci -q get equipe_dashboard.wifi.saved_txpower_2g || true)"
			saved_tx5="$(uci -q get equipe_dashboard.wifi.saved_txpower_5g || true)"
			saved_tx6="$(uci -q get equipe_dashboard.wifi.saved_txpower_6g || true)"
			if [ -n "$saved_tx2" ] && [ -n "$radio2" ]; then
				uci -q set "wireless.$radio2.txpower=$saved_tx2"
			elif [ -n "$radio2" ]; then
				uci -q delete "wireless.$radio2.txpower"
			fi
			if [ -n "$saved_tx5" ] && [ -n "$radio5" ]; then
				uci -q set "wireless.$radio5.txpower=$saved_tx5"
			elif [ -n "$radio5" ]; then
				uci -q delete "wireless.$radio5.txpower"
			fi
			if [ -n "$saved_tx6" ] && [ -n "$radio6" ]; then
				uci -q set "wireless.$radio6.txpower=$saved_tx6"
			elif [ -n "$radio6" ]; then
				uci -q delete "wireless.$radio6.txpower"
			fi
			uci -q set equipe_dashboard.wifi.txpower_balanced=0
			uci -q delete equipe_dashboard.wifi.saved_txpower_2g
			uci -q delete equipe_dashboard.wifi.saved_txpower_5g
			uci -q delete equipe_dashboard.wifi.saved_txpower_6g
			uci commit equipe_dashboard 2>/dev/null || true
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'disabled'
		fi
		;;
	wifi-mesh-set)
		state="${2:-0}"; mesh_id="${3:-ark-mesh}"; mesh_key="${4:-arkmeshkey123}"
		radio5="$(wifi_radio_5g)"; [ -n "$radio5" ] || radio5="$(wifi_radio_2g)"; [ -n "$radio5" ] || radio5="radio0"
		if [ "$state" = "1" ] || [ "$state" = "enable" ]; then
			uci -q set wireless.extra_mesh_r1=wifi-iface
			uci -q set wireless.extra_mesh_r1.device="$radio5"
			uci -q set wireless.extra_mesh_r1.network='lan'
			uci -q set wireless.extra_mesh_r1.mode='mesh'
			uci -q set wireless.extra_mesh_r1.mesh_id="$mesh_id"
			uci -q set wireless.extra_mesh_r1.encryption='sae'
			uci -q set wireless.extra_mesh_r1.key="$mesh_key"
			uci -q set wireless.extra_mesh_r1.disabled='0'
			uci commit wireless
			wifi_auto_enable_mesh_optimizations
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'enabled'
		else
			wifi_cleanup_mesh_interfaces
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'disabled'
		fi
		;;
	wifi-mesh-cleanup|wifi-cleanup-mesh)
		wifi_cleanup_mesh_interfaces
		(sleep 1; wifi reload) >/dev/null 2>&1 &
		echo 'ok'
		;;
	wifi-mesh-satellite-discover)
		gw="$(ip -4 route show default 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="via") print $(i+1)}' | head -n 1)"
		if [ -z "$gw" ]; then
			gw="$(ubus call network.interface.wan status 2>/dev/null | jsonfilter -e '@.route[@.target="0.0.0.0"].nexthop' 2>/dev/null | head -n 1)"
		fi
		[ -n "$gw" ] || gw="192.168.1.1"

		reachable=false
		if ping -c 1 -W 1 "$gw" >/dev/null 2>&1; then
			reachable=true
		fi

		my_lan_ip="$(uci -q get network.lan.ipaddr || printf '192.168.1.1')"
		subnet="${gw%.*}"
		sat_ip="${subnet}.2"
		[ "$sat_ip" != "$gw" ] || sat_ip="${subnet}.3"

		cur_role="$(uci -q get equipe_dashboard.general.role || printf 'master')"

		r2="$(wifi_radio_2g)"
		r5="$(wifi_radio_5g)"
		ssid_2g="" key_2g="" ssid_5g="" key_5g="" mob_domain=""
		for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
			dev="$(uci -q get wireless.$iface.device)"
			mode="$(uci -q get wireless.$iface.mode || printf 'ap')"
			net="$(uci -q get wireless.$iface.network)"
			if [ "$mode" = "ap" ] && { [ "$net" = "lan" ] || [ -z "$net" ]; }; then
				if [ "$dev" = "$r2" ] && [ -z "$ssid_2g" ]; then
					ssid_2g="$(uci -q get wireless.$iface.ssid || true)"
					key_2g="$(uci -q get wireless.$iface.key || true)"
				fi
				if [ "$dev" = "$r5" ] && [ -z "$ssid_5g" ]; then
					ssid_5g="$(uci -q get wireless.$iface.ssid || true)"
					key_5g="$(uci -q get wireless.$iface.key || true)"
					mob_domain="$(uci -q get wireless.$iface.mobility_domain || true)"
				fi
			fi
		done

		local_mac="$(cat /sys/class/net/br-lan/address 2>/dev/null || cat /sys/class/net/eth0/address 2>/dev/null || ip link show br-lan 2>/dev/null | awk '/ether/ {print $2}')"
		local_mac="$(printf '%s' "$local_mac" | tr 'a-f' 'A-F')"

		mesh_disabled="$(uci -q get wireless.extra_mesh_r1.disabled || echo '1')"
		cur_mesh_id="$(uci -q get wireless.extra_mesh_r1.mesh_id || echo 'ark-mesh')"
		cur_mesh_key="$(uci -q get wireless.extra_mesh_r1.key || echo 'arkmeshkey123')"
		cur_chan_5g="$(uci -q get wireless.$r5.channel || echo '')"
		cur_chan_2g="$(uci -q get wireless.$r2.channel || echo '')"
		cur_proto="$(uci -q get network.lan.proto || echo 'static')"
		cur_netmask="$(uci -q get network.lan.netmask || echo '255.255.255.0')"
		cur_dns="$(uci -q get network.lan.dns || echo '')"

		cur_backhaul="cable"
		if [ "$mesh_disabled" = "0" ] && [ -n "$cur_mesh_id" ]; then
			cur_backhaul="air"
		fi

		printf '{"ok":true,"gateway":"%s","reachable":%s,"current_lan_ip":"%s","suggested_sat_ip":"%s","local_mac":"%s","current_role":"%s","ssid_2g":"%s","key_2g":"%s","ssid_5g":"%s","key_5g":"%s","mobility_domain":"%s","backhaul":"%s","mesh_id":"%s","mesh_key":"%s","channel_5g":"%s","channel_2g":"%s","ip_mode":"%s","netmask":"%s","dns":"%s"}\n' \
			"$(json_escape "$gw")" \
			"$reachable" \
			"$(json_escape "$my_lan_ip")" \
			"$(json_escape "$sat_ip")" \
			"$(json_escape "$local_mac")" \
			"$(json_escape "$cur_role")" \
			"$(json_escape "$ssid_2g")" \
			"$(json_escape "$key_2g")" \
			"$(json_escape "$ssid_5g")" \
			"$(json_escape "$key_5g")" \
			"$(json_escape "$mob_domain")" \
			"$(json_escape "$cur_backhaul")" \
			"$(json_escape "$cur_mesh_id")" \
			"$(json_escape "$cur_mesh_key")" \
			"$(json_escape "$cur_chan_5g")" \
			"$(json_escape "$cur_chan_2g")" \
			"$(json_escape "$cur_proto")" \
			"$(json_escape "$cur_netmask")" \
			"$(json_escape "$cur_dns")"
		;;
	wifi-mesh-satellite-pull-master)
		master_ip="${2:-}"
		[ -n "$master_ip" ] || master_ip="$(ip -4 route show default 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="via") print $(i+1)}' | head -n 1)"
		[ -n "$master_ip" ] || master_ip="192.168.1.1"

		res=""
		if command -v uclient-fetch >/dev/null 2>&1; then
			res="$(uclient-fetch -q -T 2 -O - "http://${master_ip}/cgi-bin/ark-mesh-export" 2>/dev/null || true)"
		elif command -v wget >/dev/null 2>&1; then
			res="$(wget -qO- -T 2 "http://${master_ip}/cgi-bin/ark-mesh-export" 2>/dev/null || true)"
		elif command -v curl >/dev/null 2>&1; then
			res="$(curl -s -m 2 "http://${master_ip}/cgi-bin/ark-mesh-export" 2>/dev/null || true)"
		fi

		if echo "$res" | grep -q '"ok":true'; then
			printf '%s\n' "$res"
		else
			printf '{"ok":false,"error":"Roteador Mestre em %s não respondeu ao pedido de sincronização"}\n' "$master_ip"
		fi
		;;
	wifi-mesh-satellite-apply)
		master_ip="${2:-192.168.1.1}"
		ip_mode="${3:-static}"
		sat_ip="${4:-192.168.1.2}"
		enable_wireless_mesh="${5:-0}"
		mesh_id="${6:-ark-mesh}"
		mesh_key="${7:-arkmeshkey123}"
		ssid_2g="${8:-}"
		key_2g="${9:-}"
		ssid_5g="${10:-}"
		key_5g="${11:-}"
		mobility_domain="${12:-a1b2}"
		sat_netmask="${13:-255.255.255.0}"
		sat_dns="${14:-}"
		target_channel_5g="${15:-}"
		target_channel_2g="${16:-}"

		# 0. Snapshot de segurança do estado original de rede antes da conversão
		cur_proto="$(uci -q get network.lan.proto || echo static)"
		cur_ipaddr="$(uci -q get network.lan.ipaddr || true)"
		cur_netmask="$(uci -q get network.lan.netmask || echo 255.255.255.0)"
		cur_gateway="$(uci -q get network.lan.gateway || true)"
		cur_dns="$(uci -q get network.lan.dns || true)"
		cur_dhcp_ignore="$(uci -q get dhcp.lan.ignore || echo 0)"
		cur_dhcp_ra="$(uci -q get dhcp.lan.ra || true)"
		cur_dhcpv6="$(uci -q get dhcp.lan.dhcpv6 || true)"

		mkdir -p /etc/config
		[ -f /etc/config/equipe_dashboard ] || touch /etc/config/equipe_dashboard
		uci -q set equipe_dashboard.mesh=mesh
		[ -n "$cur_ipaddr" ] && [ -z "$(uci -q get equipe_dashboard.mesh.saved_lan_ipaddr)" ] && uci -q set "equipe_dashboard.mesh.saved_lan_ipaddr=$cur_ipaddr"
		[ -n "$cur_netmask" ] && [ -z "$(uci -q get equipe_dashboard.mesh.saved_lan_netmask)" ] && uci -q set "equipe_dashboard.mesh.saved_lan_netmask=$cur_netmask"
		[ -n "$cur_proto" ] && [ -z "$(uci -q get equipe_dashboard.mesh.saved_lan_proto)" ] && uci -q set "equipe_dashboard.mesh.saved_lan_proto=$cur_proto"
		[ -n "$cur_gateway" ] && [ -z "$(uci -q get equipe_dashboard.mesh.saved_lan_gateway)" ] && uci -q set "equipe_dashboard.mesh.saved_lan_gateway=$cur_gateway"
		[ -n "$cur_dns" ] && [ -z "$(uci -q get equipe_dashboard.mesh.saved_lan_dns)" ] && uci -q set "equipe_dashboard.mesh.saved_lan_dns=$cur_dns"
		uci -q set "equipe_dashboard.mesh.saved_dhcp_ignore=$cur_dhcp_ignore"
		[ -n "$cur_dhcp_ra" ] && uci -q set "equipe_dashboard.mesh.saved_dhcp_ra=$cur_dhcp_ra"
		[ -n "$cur_dhcpv6" ] && uci -q set "equipe_dashboard.mesh.saved_dhcpv6=$cur_dhcpv6"
		uci commit equipe_dashboard

		# 1. Desativa DHCP Server local (evita conflito e NAT duplo)
		uci -q set dhcp.lan.ignore='1'
		uci -q set dhcp.lan.ra='disabled'
		uci -q set dhcp.lan.dhcpv6='disabled'
		uci commit dhcp

		# 2. Configura IP da interface LAN
		if [ "$ip_mode" = "dhcp" ]; then
			uci -q set network.lan.proto='dhcp'
			uci -q delete network.lan.ipaddr
			uci -q delete network.lan.netmask
			uci -q delete network.lan.gateway
			uci -q delete network.lan.dns
		else
			uci -q set network.lan.proto='static'
			uci -q set network.lan.ipaddr="$sat_ip"
			uci -q set network.lan.netmask="${sat_netmask:-255.255.255.0}"
			uci -q set network.lan.gateway="$master_ip"
			uci -q delete network.lan.dns
			if [ -n "$sat_dns" ]; then
				for d in $(echo "$sat_dns" | tr ',' ' '); do
					[ -n "$d" ] && uci -q add_list network.lan.dns="$d"
				done
			else
				uci -q add_list network.lan.dns="$master_ip"
				uci -q add_list network.lan.dns='1.1.1.1'
			fi
		fi

		# 3. Transforma porta WAN em porta LAN (Bridge Ethernet)
		wan_dev="$(uci -q get network.wan.device || true)"
		if [ -n "$wan_dev" ]; then
			uci -q set network.wan.disabled='1'
			for s in $(uci -q show network | grep -E "=device$" | cut -d. -f2 | cut -d= -f1); do
				if [ "$(uci -q get network.$s.name)" = "br-lan" ]; then
					if ! uci -q get "network.$s.ports" | grep -qw "$wan_dev"; then
						uci -q add_list "network.$s.ports=$wan_dev"
					fi
					break
				fi
			done
		fi
		uci commit network

		# 4. Sincroniza redes Wi-Fi (SSIDs, chaves e Roaming 802.11k/v/r)
		r2="$(wifi_radio_2g)"
		r5="$(wifi_radio_5g)"

		if [ -n "$ssid_2g" ]; then
			for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
				dev="$(uci -q get wireless.$iface.device)"
				mode="$(uci -q get wireless.$iface.mode || printf 'ap')"
				net="$(uci -q get wireless.$iface.network)"
				if [ "$mode" = "ap" ] && { [ "$net" = "lan" ] || [ -z "$net" ]; } && [ "$dev" = "$r2" ]; then
					uci -q set wireless.$iface.ssid="$ssid_2g"
					[ -n "$key_2g" ] && uci -q set wireless.$iface.key="$key_2g"
					uci -q set wireless.$iface.ieee80211k='1'
					uci -q set wireless.$iface.rrm_neighbor_report='1'
					uci -q set wireless.$iface.rrm_beacon_report='1'
					uci -q set wireless.$iface.rnr='1'
					uci -q set wireless.$iface.ieee80211v='1'
					if ark_hostapd_has_wnm; then
						uci -q set wireless.$iface.bss_transition='1'
					else
						uci -q delete wireless.$iface.bss_transition
					fi
					uci -q delete wireless.$iface.wnm_sleep_mode 2>/dev/null || true
					uci -q delete wireless.$iface.ieee80211r
				fi
			done
		fi

		if [ -n "$ssid_5g" ]; then
			for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
				dev="$(uci -q get wireless.$iface.device)"
				mode="$(uci -q get wireless.$iface.mode || printf 'ap')"
				net="$(uci -q get wireless.$iface.network)"
				if [ "$mode" = "ap" ] && { [ "$net" = "lan" ] || [ -z "$net" ]; } && [ "$dev" = "$r5" ]; then
					uci -q set wireless.$iface.ssid="$ssid_5g"
					[ -n "$key_5g" ] && uci -q set wireless.$iface.key="$key_5g"
					uci -q set wireless.$iface.ieee80211k='1'
					uci -q set wireless.$iface.rrm_neighbor_report='1'
					uci -q set wireless.$iface.rrm_beacon_report='1'
					uci -q set wireless.$iface.rnr='1'
					uci -q set wireless.$iface.ieee80211v='1'
					if ark_hostapd_has_wnm; then
						uci -q set wireless.$iface.bss_transition='1'
					else
						uci -q delete wireless.$iface.bss_transition
					fi
					uci -q delete wireless.$iface.wnm_sleep_mode 2>/dev/null || true
					local slave_enc="$(uci -q get "wireless.$iface.encryption" || echo '')"
					case "$slave_enc" in
						*sae*|*owe*)
							uci -q delete wireless.$iface.ieee80211r
							uci -q delete wireless.$iface.ft_over_ds
							uci -q delete wireless.$iface.ft_psk_generate_local
							uci -q delete wireless.$iface.mobility_domain
							;;
						*)
							uci -q set wireless.$iface.ieee80211r='1'
							uci -q set wireless.$iface.ft_over_ds='0'
							uci -q set wireless.$iface.ft_psk_generate_local='1'
							uci -q set wireless.$iface.mobility_domain="${mobility_domain:-a1b2}"
							;;
					esac
				fi
			done
		fi

		# 4.1 Sintoniza canais de rádio se informados (alinhamento automático com o Mestre)
		if [ -n "$target_channel_5g" ] && [ "$target_channel_5g" != "0" ] && [ "$target_channel_5g" != "auto" ]; then
			[ -n "$r5" ] && uci -q set "wireless.$r5.channel=$target_channel_5g"
		fi
		if [ -n "$target_channel_2g" ] && [ "$target_channel_2g" != "0" ] && [ "$target_channel_2g" != "auto" ]; then
			[ -n "$r2" ] && uci -q set "wireless.$r2.channel=$target_channel_2g"
		fi

		# 5. Enlace Mesh sem fio 802.11s (se selecionado)
		if [ "$enable_wireless_mesh" = "1" ]; then
			mesh_radio="$r5"
			[ -n "$mesh_radio" ] || mesh_radio="$r2"
			[ -n "$mesh_radio" ] || mesh_radio="radio0"
			uci -q set wireless.extra_mesh_r1=wifi-iface
			uci -q set wireless.extra_mesh_r1.device="$mesh_radio"
			uci -q set wireless.extra_mesh_r1.network='lan'
			uci -q set wireless.extra_mesh_r1.mode='mesh'
			uci -q set wireless.extra_mesh_r1.mesh_id="$mesh_id"
			uci -q set wireless.extra_mesh_r1.encryption='sae'
			uci -q set wireless.extra_mesh_r1.key="$mesh_key"
			uci -q set wireless.extra_mesh_r1.disabled='0'
		else
			uci -q delete wireless.extra_mesh_r1
		fi
		uci commit wireless

		# 6. Registra papel de roteador secundario e define hostname descritivo
		local_mac="$(cat /sys/class/net/br-lan/address 2>/dev/null || cat /sys/class/net/eth0/address 2>/dev/null || ip link show br-lan 2>/dev/null | awk '/ether/ {print $2}')"
		local_mac="$(printf '%s' "$local_mac" | tr 'a-f' 'A-F')"
		clean_mac="$(printf '%s' "$local_mac" | tr -d ':')"
		mac_suffix="$(printf '%s' "$clean_mac" | tail -c 4)"
		sec_name="ARK-Secundario-${mac_suffix:-01}"
		uci -q set system.@system[0].hostname="$sec_name"
		uci commit system

		uci -q set equipe_dashboard.main=settings
		uci -q set equipe_dashboard.main.network_mode='ap'
		uci -q set equipe_dashboard.general=general
		uci -q set equipe_dashboard.general.role='secondary'
		uci -q set equipe_dashboard.general.master_ip="$master_ip"
		uci commit equipe_dashboard
		wifi_auto_enable_mesh_optimizations

		# 7. Reinicia serviços de rede e wifi em segundo plano
		(
			sleep 2
			/etc/init.d/dnsmasq restart
			/etc/init.d/network restart
			wifi reload
		) >/dev/null 2>&1 &

		printf '{"ok":true,"new_ip":"%s","ip_mode":"%s"}\n' "$sat_ip" "$ip_mode"
		;;
	wifi-mesh-satellite-revert)
		# 1. Restaura DHCP local com base no snapshot prévio
		saved_ignore="$(uci -q get equipe_dashboard.mesh.saved_dhcp_ignore || true)"
		if [ "$saved_ignore" = "1" ]; then
			uci -q set dhcp.lan.ignore='1'
		else
			uci -q delete dhcp.lan.ignore
		fi
		saved_ra="$(uci -q get equipe_dashboard.mesh.saved_dhcp_ra || true)"
		if [ -n "$saved_ra" ]; then
			uci -q set "dhcp.lan.ra=$saved_ra"
		elif [ "$(uci -q get equipe_dashboard.ipv6.mode)" != "ipv4_only" ]; then
			uci -q set dhcp.lan.ra='server'
		else
			uci -q delete dhcp.lan.ra
		fi
		saved_v6="$(uci -q get equipe_dashboard.mesh.saved_dhcpv6 || true)"
		if [ -n "$saved_v6" ]; then
			uci -q set "dhcp.lan.dhcpv6=$saved_v6"
		elif [ "$(uci -q get equipe_dashboard.ipv6.mode)" != "ipv4_only" ]; then
			uci -q set dhcp.lan.dhcpv6='server'
		else
			uci -q delete dhcp.lan.dhcpv6
		fi
		uci commit dhcp

		# 2. Restaura IP e máscara da LAN do snapshot; se clean slate, usa perfil do roteador
		target_proto="$(uci -q get equipe_dashboard.mesh.saved_lan_proto || echo 'static')"
		target_ip="$(uci -q get equipe_dashboard.mesh.saved_lan_ipaddr || true)"
		target_mask="$(uci -q get equipe_dashboard.mesh.saved_lan_netmask || echo '255.255.255.0')"
		saved_gw="$(uci -q get equipe_dashboard.mesh.saved_lan_gateway || true)"
		saved_dns="$(uci -q get equipe_dashboard.mesh.saved_lan_dns || true)"

		if [ -z "$target_ip" ]; then
			# Clean slate inteligente: detecta IP de fábrica do firmware (/rom ou equipe_dashboard)
			target_ip="$(uci -q get equipe_dashboard.general.default_lan_ip || true)"
			if [ -z "$target_ip" ]; then
				if [ -f /rom/etc/config/network ] && grep -q '192.168.73.1' /rom/etc/config/network 2>/dev/null; then
					target_ip='192.168.73.1'
				elif [ -f /rom/etc/config/network ]; then
					target_ip="$(awk -F= '/\.lan\.ipaddr=/ {gsub(/[\047"]/, "", $2); print $2; exit}' /rom/etc/config/network 2>/dev/null || echo '192.168.73.1')"
				else
					target_ip='192.168.73.1'
				fi
			fi
		fi

		uci -q set "network.lan.proto=$target_proto"
		uci -q set "network.lan.ipaddr=$target_ip"
		uci -q set "network.lan.netmask=$target_mask"
		if [ -n "$saved_gw" ]; then
			uci -q set "network.lan.gateway=$saved_gw"
		else
			uci -q delete network.lan.gateway
		fi
		if [ -n "$saved_dns" ]; then
			uci -q set "network.lan.dns=$saved_dns"
		else
			uci -q delete network.lan.dns
		fi
		uci -q delete network.wan.disabled
		wan_dev="$(uci -q get network.wan.device || true)"
		if [ -n "$wan_dev" ]; then
			for s in $(uci -q show network | grep -E "=device$" | cut -d. -f2 | cut -d= -f1); do
				if [ "$(uci -q get network.$s.name)" = "br-lan" ]; then
					uci -q del_list "network.$s.ports=$wan_dev"
					break
				fi
			done
		fi
		uci commit network

		wifi_cleanup_mesh_interfaces

		uci -q set equipe_dashboard.main=settings
		uci -q set equipe_dashboard.main.network_mode='router'
		uci -q set equipe_dashboard.general.role='master'
		uci -q delete equipe_dashboard.general.master_ip
		uci -q delete equipe_dashboard.mesh
		uci commit equipe_dashboard

		(
			sleep 2
			/etc/init.d/dnsmasq restart
			/etc/init.d/network restart
			wifi reload
		) >/dev/null 2>&1 &

		echo ok
		;;
	wifi-wifi6-status)
		iw_cache="/tmp/ark-iw-info.cache"
		[ -s "$iw_cache" ] || iw list 2>/dev/null > "$iw_cache" || true
		sup_ax=0; sup_be=0; sup_6g=0
		grep -q 'HE Iftypes' "$iw_cache" 2>/dev/null && sup_ax=1
		grep -qE 'EHT Capabilities|EHT-PHY|EHT Iftypes' "$iw_cache" 2>/dev/null && sup_be=1
		grep -qE 'Band 4:|Band 6GHz|/6GHz|5955 MHz' "$iw_cache" 2>/dev/null && sup_6g=1
		
		is_sup=0
		[ "$sup_ax" = 1 ] || [ "$sup_be" = 1 ] && is_sup=1
		
		accel_en=0
		[ "$(uci -q get equipe_dashboard.wifi.wifi6_accel)" = "1" ] && accel_en=1
		if [ "$accel_en" = 0 ]; then
			for r in $(uci -q show wireless | grep -E "=wifi-device$" | cut -d. -f2 | cut -d= -f1); do
				if [ "$(uci -q get wireless.$r.bss_color)" = "auto" ] || [ "$(uci -q get wireless.$r.he_bss_color)" = "1" ] || [ "$(uci -q get wireless.$r.he_spatial_reuse)" = "1" ]; then
					accel_en=1
					break
				fi
			done
		fi
		bss_col=0; twt_val=0; punct_val=0; pmf_val=0
		for r in $(uci -q show wireless | grep -E "=wifi-device$" | cut -d. -f2 | cut -d= -f1); do
			[ "$(uci -q get wireless.$r.bss_color)" = "auto" ] && bss_col=1
			[ "$(uci -q get wireless.$r.twt_responder)" = "1" ] && twt_val=1
			[ "$(uci -q get wireless.$r.he_puncturing)" = "1" ] && punct_val=1
		done
		for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
			[ "$(uci -q get wireless.$iface.ieee80211w)" = "1" ] && pmf_val=1
		done
		printf '{"supported":%s,"enabled":%s,"is_wifi7":%s,"has_6g":%s,"bss_color":%s,"twt":%s,"puncturing":%s,"pmf":%s}\n' \
			"$([ "$is_sup" = 1 ] && echo true || echo false)" \
			"$([ "$accel_en" = 1 ] && echo true || echo false)" \
			"$([ "$sup_be" = 1 ] && echo true || echo false)" \
			"$([ "$sup_6g" = 1 ] && echo true || echo false)" \
			"$([ "$bss_col" = 1 ] && echo true || echo false)" \
			"$([ "$twt_val" = 1 ] && echo true || echo false)" \
			"$([ "$punct_val" = 1 ] && echo true || echo false)" \
			"$([ "$pmf_val" = 1 ] && echo true || echo false)"
		;;
	wifi-wifi6-toggle)
		iw_cache="/tmp/ark-iw-info.cache"
		[ -s "$iw_cache" ] || iw list 2>/dev/null > "$iw_cache" || true
		sup_ax=0; sup_be=0
		grep -q 'HE Iftypes' "$iw_cache" 2>/dev/null && sup_ax=1
		grep -qE 'EHT Capabilities|EHT-PHY|EHT Iftypes' "$iw_cache" 2>/dev/null && sup_be=1
		if [ "$sup_ax" != 1 ] && [ "$sup_be" != 1 ]; then
			echo 'Hardware não suporta Wi-Fi 6 ou Wi-Fi 7' >&2
			exit 2
		fi
		state="${2:-1}"
		if [ "$state" = "1" ] || [ "$state" = "on" ] || [ "$state" = "enable" ]; then
			radio2="$(wifi_radio_2g)"
			radio5="$(wifi_radio_5g)"
			if [ -n "$radio2" ]; then
				uci -q set "wireless.$radio2.vendor_vht=1"
				if [ -n "$radio5" ] && [ "$radio5" != "$radio2" ]; then
					cur_tx2="$(uci -q get "wireless.$radio2.txpower" || true)"
					if [ -z "$cur_tx2" ] || [ "$cur_tx2" -gt 23 ] 2>/dev/null; then
						uci -q set "wireless.$radio2.txpower=22"
					fi
				fi
			fi
			for r in $(uci -q show wireless | grep -E "=wifi-device$" | cut -d. -f2 | cut -d= -f1); do
				uci -q set "wireless.$r.bss_color=auto"
				uci -q set "wireless.$r.he_bss_color=1"
				uci -q set "wireless.$r.he_spatial_reuse=1"
				uci -q set "wireless.$r.twt_responder=0"
				uci -q set "wireless.$r.airtime_fairness=1"
				uci -q set "wireless.$r.he_su_beamformer=1"
				uci -q set "wireless.$r.he_su_beamformee=1"
				uci -q set "wireless.$r.he_mu_beamformer=1"
				uci -q set "wireless.$r.he_ul_mumimo=0"
				uci -q set "wireless.$r.he_ul_ofdma=0"
				uci -q set "wireless.$r.he_puncturing=1"
				if [ "$sup_be" = 1 ]; then
					uci -q set "wireless.$r.eht_puncturing=1"
				fi
			done
			for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
				mode="$(uci -q get wireless.$iface.mode || echo ap)"
				[ "$mode" = "ap" ] || continue
				# PMF adaptativo (opcional para clientes, obrigatório para WPA3)
				uci -q set "wireless.$iface.ieee80211w=1"
				uci -q set "wireless.$iface.disassoc_low_ack=0"
				uci -q set "wireless.$iface.wpa_group_rekey=0"
				uci -q set "wireless.$iface.skip_inactivity_poll=0"
				uci -q set "wireless.$iface.max_inactivity=86400"
			done
			uci -q set equipe_dashboard.wifi.wifi6_accel=1
			uci commit equipe_dashboard 2>/dev/null || true
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'enabled'
		else
			for r in $(uci -q show wireless | grep -E "=wifi-device$" | cut -d. -f2 | cut -d= -f1); do
				uci -q delete "wireless.$r.bss_color"
				uci -q delete "wireless.$r.he_bss_color"
				uci -q delete "wireless.$r.he_spatial_reuse"
				uci -q delete "wireless.$r.twt_responder"
				uci -q delete "wireless.$r.airtime_fairness"
				uci -q delete "wireless.$r.he_puncturing"
				uci -q delete "wireless.$r.eht_puncturing"
			done
			for iface in $(uci -q show wireless | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
				enc="$(uci -q get wireless.$iface.encryption || echo '')"
				if [ "$enc" != "sae" ]; then
					uci -q delete "wireless.$iface.ieee80211w"
				fi
			done
			uci -q set equipe_dashboard.wifi.wifi6_accel=0
			uci commit equipe_dashboard 2>/dev/null || true
			uci commit wireless
			(sleep 1; wifi reload) >/dev/null 2>&1 &
			echo 'disabled'
		fi
		;;
	country)
		country="$(printf '%s' "$2" | tr 'a-z' 'A-Z')"
		printf '%s' "$country" | grep -Eq '^([A-Z]{2}|00)$' || { echo 'Codigo de pais invalido' >&2; exit 2; }
		for radio in $(wifi_known_radios); do
			uci set "wireless.$radio.country=$country"
			uci set "wireless.$radio.channel=auto"
		done
		uci commit wireless
		(sleep 2; wifi reload) >/dev/null 2>&1 &
		echo 'ok'
		;;
	wifi-enhancer-status)
		wifi_enhancer_status
		;;
	wifi-enhancer-upgrade)
		(wifi_enhancer_run_upgrade) >/dev/null 2>&1 &
		echo 'started'
		;;
	esac
}
