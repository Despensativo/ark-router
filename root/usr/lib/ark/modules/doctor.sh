#!/bin/sh
# /usr/lib/ark/modules/doctor.sh - ARK Router System Integrity Auditor & Self-Healing
# Audits hardware memory, flash storage, WAN/SQM alignment, MTU 1508 Baby Jumbo,
# and flow offloading / Fastpath conflicts.

[ -z "${_ARK_DOCTOR_SH_LOADED:-}" ] || return 0
_ARK_DOCTOR_SH_LOADED=1

# Ensure common library is loaded
if ! command -v json_escape >/dev/null 2>&1; then
	_lib="${ARK_LIB_DIR:-/usr/lib/ark}"
	if [ -f "${_lib}/common.sh" ]; then
		. "${_lib}/common.sh"
	elif [ -f "$(dirname "$0")/../common.sh" ]; then
		. "$(dirname "$0")/../common.sh"
	fi
	unset _lib
fi

# Helper functions for network & SQM resolution if not already defined
if ! command -v active_wan_networks >/dev/null 2>&1; then
	active_wan_networks() {
		uci -q show network 2>/dev/null | sed -n 's/^network\.\(wan[0-9]*\)=interface$/\1/p' | while IFS= read -r network_section; do
			proto="$(uci -q get "network.$network_section.proto")"
			case "$proto" in dhcp|pppoe|static) printf '%s\n' "$network_section" ;; esac
		done
	}
fi

if ! command -v sqm_section_for_network >/dev/null 2>&1; then
	sqm_section_for_network() {
		case "$1" in wan) printf wan1 ;; wan[0-9]*) printf '%s' "$1" ;; *) return 1 ;; esac
	}
fi

if ! command -v sqm_device_for_network >/dev/null 2>&1; then
	sqm_device_for_network() {
		network_section="$1"
		proto="$(uci -q get "network.$network_section.proto")"
		if [ "$proto" = pppoe ]; then
			printf 'pppoe-%s' "$network_section"
			return 0
		fi
		device="$(ubus call "network.interface.$network_section" status 2>/dev/null | jsonfilter -e '@.l3_device' 2>/dev/null)"
		[ -n "$device" ] || device="$(uci -q get "network.$network_section.device")"
		[ -n "$device" ] || device="$network_section"
		printf '%s' "$device"
	}
fi

ark_doctor_audit() {
	auto_fix="${1:-0}"
	format="${2:-text}"
	errors=0
	warnings=0
	fixes_applied=0
	checks=""

	add_check() {
		local c_name="$1" c_status="$2" c_msg="$3"
		if [ "$format" = "json" ]; then
			local c_json
			c_json=$(printf '{"name":"%s","status":"%s","message":"%s"}' \
				"$(json_escape "$c_name")" "$(json_escape "$c_status")" "$(json_escape "$c_msg")")
			if [ -z "$checks" ]; then checks="$c_json"; else checks="$checks,$c_json"; fi
		else
			case "$c_status" in
				OK)    printf '\033[1;32m[  OK  ]\033[0m %s: %s\n' "$c_name" "$c_msg" ;;
				WARN)  printf '\033[1;33m[ AVISO]\033[0m %s: %s\n' "$c_name" "$c_msg" ;;
				FAIL)  printf '\033[1;31m[ FALHA]\033[0m %s: %s\n' "$c_name" "$c_msg" ;;
				FIXED) printf '\033[1;36m[ REPARADO]\033[0m %s: %s\n' "$c_name" "$c_msg" ;;
			esac
		fi
	}

	[ "$format" = "text" ] && {
		printf '============================================================\n'
		printf '            ARK DOCTOR: AUDITORIA DO ROTEADOR              \n'
		printf '============================================================\n'
	}

	# 1. Checagem de Hardware e Memoria
	mem_total_kb="$(awk '/MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_free_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || awk '/MemFree:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
	mem_total_mb=$((mem_total_kb / 1024))
	mem_free_mb=$((mem_free_kb / 1024))
	if [ "$mem_free_mb" -lt 20 ] && [ "$mem_total_mb" -gt 0 ]; then
		if [ "$auto_fix" = 1 ]; then
			sync 2>/dev/null || true
			echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
			mem_free_kb="$(awk '/MemAvailable:/ {print $2}' /proc/meminfo 2>/dev/null || awk '/MemFree:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
			mem_free_mb=$((mem_free_kb / 1024))
			fixes_applied=$((fixes_applied + 1))
			add_check "Memoria RAM" "FIXED" "Caches reciclados. Memoria livre recuperada para ${mem_free_mb}MB."
		else
			warnings=$((warnings + 1))
			add_check "Memoria RAM" "WARN" "RAM critica: apenas ${mem_free_mb}MB livres de ${mem_total_mb}MB."
		fi
	else
		add_check "Memoria RAM" "OK" "${mem_free_mb}MB livres de ${mem_total_mb}MB disponiveis."
	fi

	# 2. Checagem do Espaco em Flash (/overlay)
	overlay_free_kb="$(df -k /overlay 2>/dev/null | awk 'NR==2 {print $4}')"
	case "$overlay_free_kb" in
		''|*[!0-9]*) overlay_free_kb=99999 ;;
	esac
	if [ "$overlay_free_kb" -lt 1500 ]; then
		if [ "$auto_fix" = 1 ]; then
			rm -rf /tmp/opkg-lists /var/lock/opkg.lock /tmp/apk-cache /var/cache/apk/* 2>/dev/null || true
			find /tmp -type f -name "*.tmp" -delete 2>/dev/null || true
			overlay_free_kb="$(df -k /overlay 2>/dev/null | awk 'NR==2 {print $4}')"
			case "$overlay_free_kb" in ''|*[!0-9]*) overlay_free_kb=99999 ;; esac
			fixes_applied=$((fixes_applied + 1))
			add_check "Espaco Flash (/overlay)" "FIXED" "Caches temporarios purgados: $((overlay_free_kb / 1024))MB livres."
		else
			warnings=$((warnings + 1))
			add_check "Espaco Flash (/overlay)" "WARN" "Espaco livre baixo: apenas $((overlay_free_kb / 1024))MB livres."
		fi
	else
		add_check "Espaco Flash (/overlay)" "OK" "$((overlay_free_kb / 1024))MB livres no armazenamento gravavel."
	fi

	# 3. Checagem de Interfaces WAN & SQM Alignment & Baby Jumbo
	sqm_has_active=0
	for wan in $(active_wan_networks); do
		proto="$(uci -q get "network.$wan.proto")"
		wan_dev="$(uci -q get "network.$wan.device")"
		expected_sqm_dev="$(sqm_device_for_network "$wan")"
		sqm_sec="$(sqm_section_for_network "$wan")"

		# Verifica se a secao SQM existe
		if { [ -f "${ARK_ROOT}/etc/config/sqm" ] || [ -f /etc/config/sqm ]; } && uci -q get "sqm.$sqm_sec" >/dev/null 2>&1; then
			sqm_enabled="$(uci -q get "sqm.$sqm_sec.enabled")"
			cur_sqm_iface="$(uci -q get "sqm.$sqm_sec.interface")"
			[ "$sqm_enabled" = 1 ] && sqm_has_active=1
			if [ -n "$cur_sqm_iface" ] && [ "$cur_sqm_iface" != "$expected_sqm_dev" ]; then
				if [ "$auto_fix" = 1 ]; then
					uci -q set "sqm.$sqm_sec.interface=$expected_sqm_dev"
					uci commit sqm
					fixes_applied=$((fixes_applied + 1))
					add_check "SQM $wan" "FIXED" "Corrigido dispositivo de '$cur_sqm_iface' para '$expected_sqm_dev'."
				else
					errors=$((errors + 1))
					add_check "SQM $wan" "FAIL" "Desalinhado: configurado '$cur_sqm_iface', esperado '$expected_sqm_dev'."
				fi
			else
				add_check "SQM $wan" "OK" "Fila vinculada corretamente a $cur_sqm_iface."
			fi
		fi

		# 4. Checagem de MTU e Baby Jumbo (1508)
		cur_mtu="$(uci -q get "network.$wan.mtu")"
		dev_mtu="$(uci -q get "network.$wan.device_mtu")"
		if [ "$dev_mtu" = 1508 ] || [ "$cur_mtu" = 1500 -a "$proto" = pppoe ]; then
			phys_dev="$wan_dev"
			[ -n "$phys_dev" ] || phys_dev="$(uci -q get "network.$wan.ifname")"
			[ -n "$phys_dev" ] || phys_dev="$(uci -q get "network.$wan.ark_phys_port")"

			dev_sec_count=0
			dev_has_non_1508=0
			for s in $(uci -q show network 2>/dev/null | grep '=device$' | cut -d. -f2 | cut -d= -f1); do
				if [ "$(uci -q get "network.$s.name")" = "$phys_dev" ]; then
					dev_sec_count=$((dev_sec_count + 1))
					s_mtu="$(uci -q get "network.$s.mtu")"
					[ "$s_mtu" = "1508" ] || dev_has_non_1508=1
				fi
			done

			real_phys_mtu=""
			[ -f "${ARK_ROOT}/sys/class/net/$phys_dev/mtu" ] && real_phys_mtu="$(cat "${ARK_ROOT}/sys/class/net/$phys_dev/mtu" 2>/dev/null || true)"
			[ -z "$real_phys_mtu" ] && [ -f "/sys/class/net/$phys_dev/mtu" ] && [ -z "${ARK_ROOT}" ] && real_phys_mtu="$(cat "/sys/class/net/$phys_dev/mtu" 2>/dev/null || true)"

			real_ppp_mtu=""
			if [ "$proto" = pppoe ]; then
				[ -f "${ARK_ROOT}/sys/class/net/pppoe-$wan/mtu" ] && real_ppp_mtu="$(cat "${ARK_ROOT}/sys/class/net/pppoe-$wan/mtu" 2>/dev/null || true)"
				[ -z "$real_ppp_mtu" ] && [ -f "/sys/class/net/pppoe-$wan/mtu" ] && [ -z "${ARK_ROOT}" ] && real_ppp_mtu="$(cat "/sys/class/net/pppoe-$wan/mtu" 2>/dev/null || true)"
			fi

			mtu_defect=0
			mtu_err_msg=""

			if [ "$dev_sec_count" -gt 1 ]; then
				mtu_defect=1
				mtu_err_msg="Detectadas $dev_sec_count secoes device duplicadas para a porta $phys_dev."
			elif [ "$dev_sec_count" -eq 0 ] || [ "$dev_has_non_1508" = 1 ]; then
				mtu_defect=1
				mtu_err_msg="Porta fisica $phys_dev nao possui mtu=1508 em config device."
			elif [ -n "$real_phys_mtu" ] && [ "$real_phys_mtu" -lt 1508 ] 2>/dev/null; then
				mtu_defect=1
				mtu_err_msg="Porta fisica $phys_dev opera em MTU $real_phys_mtu no kernel (esperado: 1508)."
			elif [ "$proto" = pppoe ] && [ -n "$real_ppp_mtu" ] && [ "$real_ppp_mtu" -lt 1500 ] 2>/dev/null; then
				mtu_defect=1
				mtu_err_msg="Interface pppoe-$wan opera em MTU $real_ppp_mtu no kernel (esperado: 1500)."
			fi

			if [ "$mtu_defect" = 1 ]; then
				if [ "$auto_fix" = 1 ]; then
					ark_ensure_phys_device_mtu "$phys_dev" 1508
					uci -q set "network.$wan.mtu=1500"
					uci -q set "network.$wan.device_mtu=1508"
					uci commit network
					if [ -n "${ARK_ROOT}" ] && [ -f "${ARK_ROOT}/sys/class/net/$phys_dev/mtu" ]; then
						printf '1508\n' > "${ARK_ROOT}/sys/class/net/$phys_dev/mtu" 2>/dev/null || true
						[ "$proto" = pppoe ] && [ -f "${ARK_ROOT}/sys/class/net/pppoe-$wan/mtu" ] && printf '1500\n' > "${ARK_ROOT}/sys/class/net/pppoe-$wan/mtu" 2>/dev/null || true
					elif [ -z "${ARK_ROOT}" ]; then
						ip link set "$phys_dev" mtu 1508 2>/dev/null || true
						[ "$proto" = pppoe ] && ip link set "pppoe-$wan" mtu 1500 2>/dev/null || true
					fi
					fixes_applied=$((fixes_applied + 1))
					add_check "MTU Baby Jumbo ($wan)" "FIXED" "Porta $phys_dev ajustada para MTU 1508 e duplicatas saneadas."
				else
					errors=$((errors + 1))
					add_check "MTU Baby Jumbo ($wan)" "FAIL" "$mtu_err_msg"
				fi
			else
				add_check "MTU Baby Jumbo ($wan)" "OK" "Porta $phys_dev e interface $wan alinhadas em 1508/1500 bytes."
			fi
		fi
	done

	# 5. Checagem de Conflitos: Flow Offloading vs SQM vs Multi-WAN
	flow_offload="$(uci -q get firewall.@defaults[0].flow_offloading || echo 0)"
	mwan_active_count=0
	if [ -f "${ARK_ROOT}/etc/config/mwan3" ] || [ -f /etc/config/mwan3 ]; then
		for w in $(active_wan_networks); do
			[ "$(uci -q get "mwan3.$w.enabled")" = 1 ] && mwan_active_count=$((mwan_active_count + 1))
		done
	fi

	if [ "$flow_offload" = "1" ] && [ "$sqm_has_active" = "1" ]; then
		if [ "$auto_fix" = 1 ]; then
			uci -q set firewall.@defaults[0].flow_offloading=0
			uci -q set firewall.@defaults[0].flow_offloading_hw=0
			uci commit firewall
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			fixes_applied=$((fixes_applied + 1))
			add_check "Flow Offload vs SQM" "FIXED" "Conflito detectado. Fastpath desativado para permitir funcionamento prioritario do SQM/CAKE."
		else
			errors=$((errors + 1))
			add_check "Flow Offload vs SQM" "FAIL" "Fastpath ativo junto com SQM/CAKE. O Fastpath impede o enfileiramento CAKE."
		fi
	elif [ "$flow_offload" = "1" ] && [ "$mwan_active_count" -ge 2 ]; then
		if [ "$auto_fix" = 1 ]; then
			uci -q set firewall.@defaults[0].flow_offloading=0
			uci -q set firewall.@defaults[0].flow_offloading_hw=0
			uci commit firewall
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			fixes_applied=$((fixes_applied + 1))
			add_check "Flow Offload vs Multi-WAN" "FIXED" "Conflito detectado. Fastpath desativado para permitir balanceamento e failover no mwan3."
		else
			warnings=$((warnings + 1))
			add_check "Flow Offload vs Multi-WAN" "WARN" "Fastpath ativo com 2+ WANs no mwan3. O Fastpath ignora regras de balanceamento/failover."
		fi
	else
		add_check "Aceleracao de Rede" "OK" "Sem conflitos entre Fastpath, SQM e Multi-WAN."
	fi

	# 6. Checagem de Hardware Offload vs Capacidade do Silicio
	flow_offload_hw="$(uci -q get firewall.@defaults[0].flow_offloading_hw || echo 0)"
	has_ppe=0
	if [ -e /sys/kernel/debug/ppe0 ] || [ -e /sys/kernel/debug/ppe1 ] || [ -d /sys/devices/platform/soc/15010000.wed ] || \
	   grep -qiE 'mt7981|mt7986|mt7988|mt7621|mt7622|filogic' /tmp/sysinfo/board_name /tmp/sysinfo/model 2>/dev/null; then
		has_ppe=1
	fi
	if [ "$flow_offload_hw" = "1" ] && [ "$has_ppe" = "0" ]; then
		if [ "$auto_fix" = 1 ]; then
			uci -q set firewall.@defaults[0].flow_offloading_hw=0
			uci commit firewall
			/etc/init.d/firewall reload >/dev/null 2>&1 || true
			fixes_applied=$((fixes_applied + 1))
			add_check "Hardware Offload em Silicio" "FIXED" "Acelerador PPE ausente. flow_offloading_hw corrigido para 0 (Software Flowtable mantido)."
		else
			warnings=$((warnings + 1))
			add_check "Hardware Offload em Silicio" "WARN" "flow_offloading_hw ativado em processador sem acelerador de silicio compativel."
		fi
	else
		add_check "Hardware Offload em Silicio" "OK" "Configuracao de aceleracao condizente com a arquitetura do processador."
	fi

	# 7. Checagem de Clientes e Leases
	dnsmasq_pid="$(pidof dnsmasq 2>/dev/null || pgrep -x dnsmasq 2>/dev/null || echo '')"
	if [ -z "$dnsmasq_pid" ] && [ -x /etc/init.d/dnsmasq ] && ! ark_is_satellite_or_ap; then
		if [ "$auto_fix" = 1 ]; then
			/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
			fixes_applied=$((fixes_applied + 1))
			add_check "Tabela de Clientes" "FIXED" "Servidor DHCP/DNS (dnsmasq) reiniciado com sucesso."
		else
			errors=$((errors + 1))
			add_check "Tabela de Clientes" "FAIL" "Servidor DHCP/DNS (dnsmasq) inativo! Clientes podem ficar sem IP."
		fi
	else
		lease_file="/tmp/dhcp.leases"
		[ -f "$lease_file" ] || lease_file="/var/dhcp.leases"
		lease_count=0
		if [ -f "$lease_file" ]; then
			lease_count="$(wc -l < "$lease_file" 2>/dev/null || echo 0)"
			lease_count="$(echo "$lease_count" | tr -d ' ')"
		fi
		add_check "Tabela de Clientes" "OK" "${lease_count} dispositivo(s) com concessao DHCP ativa (dnsmasq operacional)."
	fi

	# 8. Checagem de Consistência de Modo Satélite / Ponto de Acesso
	if ark_is_satellite_or_ap; then
		# 8a. DHCP Server no Satélite (Risco de Rogue DHCP e Duplo NAT)
		dhcp_ignore="$(uci -q get dhcp.lan.ignore || echo 0)"
		if [ "$dhcp_ignore" != "1" ]; then
			if [ "$auto_fix" = 1 ]; then
				uci -q set dhcp.lan.ignore='1'
				uci -q set dhcp.lan.ra='disabled'
				uci -q set dhcp.lan.dhcpv6='disabled'
				uci commit dhcp
				/etc/init.d/dnsmasq reload >/dev/null 2>&1 || true
				fixes_applied=$((fixes_applied + 1))
				add_check "Blindagem Satélite: DHCP" "FIXED" "Servidor DHCP desativado no Satélite para evitar Rogue DHCP e Duplo NAT."
			else
				errors=$((errors + 1))
				add_check "Blindagem Satélite: DHCP" "FAIL" "Servidor DHCP ativo em nó Satélite/AP (Risco de Rogue DHCP e Duplo NAT)."
			fi
		else
			add_check "Blindagem Satélite: DHCP" "OK" "Servidor DHCP local devidamente desativado (Mestre distribui IPs)."
		fi

		# 8b. SQM Residual no Satélite
		sat_sqm_active=0
		for s in $(uci -q show sqm 2>/dev/null | sed -n 's/^sqm\.\([a-zA-Z0-9_]*\)=queue$/\1/p'); do
			[ "$(uci -q get "sqm.$s.enabled")" = "1" ] && sat_sqm_active=1
		done
		if [ "$sat_sqm_active" = 1 ]; then
			if [ "$auto_fix" = 1 ]; then
				for s in $(uci -q show sqm 2>/dev/null | sed -n 's/^sqm\.\([a-zA-Z0-9_]*\)=queue$/\1/p'); do
					uci -q set "sqm.$s.enabled=0"
				done
				uci commit sqm
				/etc/init.d/sqm stop >/dev/null 2>&1 || true
				fixes_applied=$((fixes_applied + 1))
				add_check "Blindagem Satélite: SQM" "FIXED" "SQM residual desativado no Satélite. O CAKE deve atuar exclusivamente no Mestre."
			else
				errors=$((errors + 1))
				add_check "Blindagem Satélite: SQM" "FAIL" "SQM ativo em nó Satélite/AP (desperdiça CPU e limita a bridge local)."
			fi
		else
			add_check "Blindagem Satélite: SQM" "OK" "Sem filas SQM no Satélite (Bufferbloat gerenciado pelo Mestre)."
		fi

		# 8c. Multi-WAN no Satélite
		sat_mwan_active=0
		for w in $(uci -q show mwan3 2>/dev/null | sed -n 's/^mwan3\.\([a-zA-Z0-9_]*\)=interface$/\1/p'); do
			[ "$(uci -q get "mwan3.$w.enabled")" = "1" ] && sat_mwan_active=1
		done
		if [ "$sat_mwan_active" = 1 ]; then
			if [ "$auto_fix" = 1 ]; then
				for w in $(uci -q show mwan3 2>/dev/null | sed -n 's/^mwan3\.\([a-zA-Z0-9_]*\)=interface$/\1/p'); do
					uci -q set "mwan3.$w.enabled=0"
				done
				uci commit mwan3
				/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
				fixes_applied=$((fixes_applied + 1))
				add_check "Blindagem Satélite: Multi-WAN" "FIXED" "Multi-WAN desativado no Satélite para manter ponte de rede direta."
			else
				warnings=$((warnings + 1))
				add_check "Blindagem Satélite: Multi-WAN" "WARN" "Multi-WAN ativo em nó Satélite/AP. Deve ser desativado."
			fi
		else
			add_check "Blindagem Satélite: Multi-WAN" "OK" "Multi-WAN inativo no Satélite (ponte L2 direta)."
		fi
	fi

	# 9. Checagem de Interfaces Mesh Órfãs no Kernel
	has_uci_mesh=0
	for sec in $(uci -q show wireless 2>/dev/null | grep -E "=wifi-iface$" | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "wireless.$sec.mode")" = "mesh" ]; then
			has_uci_mesh=1
			break
		fi
	done

	orphan_mesh=""
	for iface in $(iw dev 2>/dev/null | awk '/Interface/ {i=$2} /type mesh point/ {print i}'); do
		[ "$has_uci_mesh" = "0" ] && orphan_mesh="${orphan_mesh} ${iface}"
	done
	orphan_mesh="$(printf '%s' "$orphan_mesh" | tr -s ' ' | sed 's/^ //')"

	if [ -n "$orphan_mesh" ]; then
		if [ "$auto_fix" = 1 ]; then
			for iface in $orphan_mesh; do
				ip link set dev "$iface" nomaster >/dev/null 2>&1 || true
				ip link set dev "$iface" down >/dev/null 2>&1 || true
				iw dev "$iface" del >/dev/null 2>&1 || true
				ip link delete dev "$iface" >/dev/null 2>&1 || true
			done
			fixes_applied=$((fixes_applied + 1))
			add_check "Interfaces Mesh Orfas" "FIXED" "Interface(s) mesh residual ($orphan_mesh) destruida do Kernel e desvinculada da bridge."
		else
			errors=$((errors + 1))
			add_check "Interfaces Mesh Orfas" "FAIL" "Interface(s) mesh orfa ($orphan_mesh) ativa no Kernel sem declaracao no UCI."
		fi
	else
		add_check "Interfaces Mesh Orfas" "OK" "Sem interfaces de enlace mesh residuais no Kernel."
	fi

	# 10. Checagem de Pureza e Integridade do Firewall (fw4 vs fw3 / iptables)
	if is_fw4; then
		legacy_rules=""
		if command -v iptables-save >/dev/null 2>&1; then
			legacy_rules="$(iptables-save 2>/dev/null | grep -E '^(\*|:|-A)' | grep -vE ':(INPUT|OUTPUT|FORWARD) (ACCEPT|DROP)' || true)"
		fi
		if [ -z "$legacy_rules" ] && command -v ip6tables-save >/dev/null 2>&1; then
			legacy_rules="$(ip6tables-save 2>/dev/null | grep -E '^(\*|:|-A)' | grep -vE ':(INPUT|OUTPUT|FORWARD) (ACCEPT|DROP)' || true)"
		fi

		fw_user_file="/etc/firewall.user"
		[ -n "${ARK_ROOT}" ] && [ -f "${ARK_ROOT}/etc/firewall.user" ] && fw_user_file="${ARK_ROOT}/etc/firewall.user"
		fw_user_has_iptables=0
		if [ -f "$fw_user_file" ] && grep -qE 'iptables|ip6tables' "$fw_user_file" 2>/dev/null; then
			fw_user_has_iptables=1
		fi

		upnp_is_legacy=0
		ark_upnp_is_legacy_iptables && upnp_is_legacy=1

		sqm_is_legacy=0
		if uci -q show sqm 2>/dev/null | grep -q "\.script='simple.qos'"; then
			sqm_is_legacy=1
		fi

		if [ -n "$legacy_rules" ] || [ "$fw_user_has_iptables" = 1 ] || [ "$upnp_is_legacy" = 1 ] || [ "$sqm_is_legacy" = 1 ]; then
			culprit="scripts/modulos legados"
			if [ "$upnp_is_legacy" = 1 ]; then
				culprit="miniupnpd (pacote iptables incompativel com fw4)"
			elif [ "$sqm_is_legacy" = 1 ]; then
				culprit="SQM simple.qos (injeta regras iptables)"
			elif echo "$legacy_rules" | grep -qiE 'miniupnpd|upnp'; then
				culprit="miniupnpd (UPnP legado)"
			elif echo "$legacy_rules" | grep -qi 'docker'; then
				culprit="Docker (dockerd)"
			elif echo "$legacy_rules" | grep -qi 'mwan3'; then
				culprit="mwan3"
			elif [ "$fw_user_has_iptables" = 1 ]; then
				culprit="/etc/firewall.user"
			fi

			if [ "$auto_fix" = 1 ]; then
				if [ "$upnp_is_legacy" = 1 ]; then
					ark_migrate_upnp_variant >/dev/null 2>&1 || true
				fi
				if [ "$sqm_is_legacy" = 1 ]; then
					for sec in $(uci -q show sqm 2>/dev/null | grep '=queue$' | cut -d. -f2 | cut -d= -f1); do
						[ "$(uci -q get "sqm.$sec.script")" = "simple.qos" ] && uci -q set "sqm.$sec.script=piece_of_cake.qos"
					done
					uci commit sqm 2>/dev/null || true
					/etc/init.d/sqm restart >/dev/null 2>&1 || true
				fi
				if [ "$fw_user_has_iptables" = 1 ]; then
					q_dir="/etc/ark/quarantine"
					[ -n "${ARK_ROOT}" ] && q_dir="${ARK_ROOT}/etc/ark/quarantine"
					mkdir -p "$q_dir"
					mv "$fw_user_file" "${q_dir}/firewall.user.legacy.$(date +%s 2>/dev/null || echo 0)" 2>/dev/null || true
					touch "$fw_user_file"
				fi
				if [ "$culprit" != "mwan3" ] && [ "$culprit" != "Docker (dockerd)" ]; then
					if command -v iptables >/dev/null 2>&1; then
						iptables -F 2>/dev/null || true
						iptables -X 2>/dev/null || true
						iptables -t nat -F 2>/dev/null || true
						iptables -t nat -X 2>/dev/null || true
						iptables -t mangle -F 2>/dev/null || true
						iptables -t mangle -X 2>/dev/null || true
					fi
					if command -v ip6tables >/dev/null 2>&1; then
						ip6tables -F 2>/dev/null || true
						ip6tables -X 2>/dev/null || true
						ip6tables -t mangle -F 2>/dev/null || true
						ip6tables -t mangle -X 2>/dev/null || true
					fi
					/sbin/fw4 reload >/dev/null 2>&1 || true
					fixes_applied=$((fixes_applied + 1))
					add_check "Pureza do Firewall (fw4 Puro)" "FIXED" "Regras legadas iptables ($culprit) saneadas e pacote migrado para nftables puro."
				else
					add_check "Pureza do Firewall (fw4 Puro)" "WARN" "Regras iptables pertencem ao servico ativo $culprit (preservadas para manter conectividade)."
				fi
			else
				warnings=$((warnings + 1))
				add_check "Pureza do Firewall (fw4 Puro)" "WARN" "Regras legadas iptables ou pacote incompativel detectado em fw4 (Origem provavel: $culprit)."
			fi
		else
			add_check "Pureza do Firewall (fw4 Puro)" "OK" "Firewall operando puramente via nftables (zero regras legadas iptables)."
		fi
	else
		if ark_upnp_is_legacy_nftables_on_fw3; then
			if [ "$auto_fix" = 1 ]; then
				ark_migrate_upnp_variant >/dev/null 2>&1 || true
				fixes_applied=$((fixes_applied + 1))
				add_check "Integridade do Firewall (fw3 iptables)" "FIXED" "Pacote miniupnpd-nftables corrigido para versao iptables retrocompativel no fw3."
			else
				warnings=$((warnings + 1))
				add_check "Integridade do Firewall (fw3 iptables)" "WARN" "Pacote miniupnpd-nftables detectado em fw3 legado. Requer migracao para miniupnpd compativel."
			fi
		elif command -v iptables >/dev/null 2>&1 && iptables -n -L FORWARD >/dev/null 2>&1; then
			add_check "Integridade do Firewall (fw3 iptables)" "OK" "Firewall fw3/iptables ativo e cadeias validas para arquitetura legada."
		else
			errors=$((errors + 1))
			add_check "Integridade do Firewall (fw3 iptables)" "FAIL" "Firewall fw3 com falha nas cadeias ou binario iptables ausente."
		fi
	fi

	# 11. Blindagem WAN6 e Processos DHCPv6
	root_prefix="${ARK_ROOT:-}"
	uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"
	has_zombie_dhcp=0
	for pid in $(pgrep -x odhcp6c 2>/dev/null || ps w 2>/dev/null | awk '/[o]dhcp6c/ {print $1}'); do
		[ -n "$pid" ] || continue
		if [ -f "/proc/$pid/status" ] && [ "$(awk '/^PPid:/ {print $2}' "/proc/$pid/status" 2>/dev/null)" = "1" ]; then
			has_zombie_dhcp=1
			break
		fi
	done

	has_bad_wan6_dev=0
	for sec in $($uci_cmd show network 2>/dev/null | sed -n 's/^network\.\([a-zA-Z0-9_]*\)=interface$/\1/p'); do
		[ "$($uci_cmd get "network.$sec.proto" || echo '')" = "dhcpv6" ] || continue
		dev="$($uci_cmd get "network.$sec.device" || echo '')"
		[ -n "$dev" ] || dev="$($uci_cmd get "network.$sec.ifname" || echo '')"
		case "$dev" in
			@*|'') ;;
			*) has_bad_wan6_dev=1; break ;;
		esac
	done

	if [ "$has_zombie_dhcp" = 1 ] || [ "$has_bad_wan6_dev" = 1 ]; then
		if [ "$auto_fix" = 1 ]; then
			ark_cleanup_dhcpv6_orphans >/dev/null 2>&1 || true
			ark_sanitize_wan6_config >/dev/null 2>&1 || true
			fixes_applied=$((fixes_applied + 1))
			add_check "Blindagem WAN6 e DHCPv6" "FIXED" "Processo zumbi eliminado e device @wan sanitizado sem loops."
		else
			warnings=$((warnings + 1))
			add_check "Blindagem WAN6 e DHCPv6" "WARN" "Configuracao WAN6 sem alias @wan ou processos odhcp6c orfaos detectados."
		fi
	else
		add_check "Blindagem WAN6 e DHCPv6" "OK" "Interfaces IPv6 canonicas (@wan) e zero processos orfaos."
	fi

	# 11b. Depreciação de Prefixos IPv6 na LAN (RFC 9096 - Prevenção de IPs Fantasmas)
	lan_ra_prefer_old="$($uci_cmd get dhcp.lan.ra_prefer_old || echo 1)"
	if [ "$lan_ra_prefer_old" != "0" ]; then
		if [ "$auto_fix" = 1 ]; then
			$uci_cmd set dhcp.lan.ra_prefer_old='0'
			$uci_cmd commit dhcp
			fixes_applied=$((fixes_applied + 1))
			add_check "Depreciação IPv6 (RFC 9096)" "FIXED" "ra_prefer_old configurado para 0 (eliminação imediata de prefixos fantasmas)."
		else
			warnings=$((warnings + 1))
			add_check "Depreciação IPv6 (RFC 9096)" "WARN" "ra_prefer_old não está ativo (aparelhos podem reter IPs antigos em trocas de PPPoE)."
		fi
	else
		add_check "Depreciação IPv6 (RFC 9096)" "OK" "Depreciação ativa no odhcpd (SLAAC limpa prefixos antigos automaticamente)."
	fi

	# 11c. Coerência do Protocolo IPv6 (Dashboard vs WAN vs LAN)
	if ! ark_is_satellite_or_ap; then
		ipv6_mode="$($uci_cmd get equipe_dashboard.ipv6.mode 2>/dev/null || echo '')"
		[ -n "$ipv6_mode" ] || ipv6_mode="dual_stack"

		wan_has_ipv6=0
		for w in wan wan2 wan3 wan4; do
			if [ "$($uci_cmd get "network.$w.ipv6" 2>/dev/null || echo '')" = "1" ] || \
			   [ "$($uci_cmd get "network.$w.delegate" 2>/dev/null || echo '')" = "1" ]; then
				wan_has_ipv6=1
				break
			fi
		done
		if [ "$wan_has_ipv6" = 0 ]; then
			wan6_proto="$($uci_cmd get network.wan6.proto 2>/dev/null || echo '')"
			if [ -n "$wan6_proto" ] && [ "$wan6_proto" != "none" ]; then
				wan_has_ipv6=1
			fi
		fi

		lan_ra="$($uci_cmd get dhcp.lan.ra 2>/dev/null || echo '')"
		lan_dhcpv6="$($uci_cmd get dhcp.lan.dhcpv6 2>/dev/null || echo '')"
		filter_aaaa="$($uci_cmd get dhcp.@dnsmasq[0].filter_aaaa 2>/dev/null || echo '0')"
		relay="$($uci_cmd get equipe_dashboard.ipv6.relay 2>/dev/null || echo '0')"

		if [ "$ipv6_mode" = "ipv4_only" ]; then
			# Modo IPv4 Puro: anúncios na LAN devem estar desativados e DNSmasq deve filtrar AAAA
			if [ "$lan_ra" = "server" ] || [ "$lan_ra" = "relay" ] || [ "$lan_dhcpv6" = "server" ] || [ "$lan_dhcpv6" = "relay" ] || [ "$filter_aaaa" != "1" ]; then
				if [ "$auto_fix" = 1 ]; then
					$uci_cmd set dhcp.lan.ra='disabled'
					$uci_cmd set dhcp.lan.dhcpv6='disabled'
					$uci_cmd set dhcp.lan.ndp='disabled'
					$uci_cmd set dhcp.@dnsmasq[0].filter_aaaa='1'
					$uci_cmd commit dhcp
					[ -z "$root_prefix" ] && [ -x /etc/init.d/dnsmasq ] && /etc/init.d/dnsmasq reload >/dev/null 2>&1 || true
					[ -z "$root_prefix" ] && [ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd restart >/dev/null 2>&1 || true
					fixes_applied=$((fixes_applied + 1))
					add_check "Coerência IPv6 (Dashboard vs LAN)" "FIXED" "Modo IPv4 Puro: anúncios desativados na LAN e filtro AAAA ativado no DNSmasq."
				else
					errors=$((errors + 1))
					add_check "Coerência IPv6 (Dashboard vs LAN)" "FAIL" "Modo IPv4 Puro ativo no painel, mas anúncios RA/DHCPv6 ativos ou filtro AAAA inativo na LAN."
				fi
			else
				add_check "Coerência IPv6 (Dashboard vs LAN)" "OK" "Modo IPv4 Puro: anúncios desativados na LAN e filtro AAAA ativo no DNSmasq."
			fi
		elif [ "$wan_has_ipv6" = "1" ]; then
			# Modo dual_stack ou selective com WAN IPv6 ativa: anúncios na LAN DEVEM estar operacionais
			expected_service="server"
			[ "$relay" = "1" ] && expected_service="relay"

			if [ "$lan_ra" != "$expected_service" ] || [ "$lan_dhcpv6" != "$expected_service" ] || [ "$filter_aaaa" = "1" ]; then
				if [ "$auto_fix" = 1 ]; then
					if [ "$relay" = "1" ]; then
						$uci_cmd set dhcp.lan.ra='relay'
						$uci_cmd set dhcp.lan.dhcpv6='relay'
						$uci_cmd set dhcp.lan.ndp='relay'
					else
						$uci_cmd set dhcp.lan.ra='server'
						$uci_cmd set dhcp.lan.dhcpv6='server'
						$uci_cmd set dhcp.lan.ndp='disabled'
					fi
					$uci_cmd set dhcp.lan.ra_prefer_old='0'
					$uci_cmd delete dhcp.@dnsmasq[0].filter_aaaa 2>/dev/null || true
					$uci_cmd set equipe_dashboard.ipv6=ipv6
					$uci_cmd set equipe_dashboard.ipv6.mode="$ipv6_mode"
					$uci_cmd commit dhcp
					$uci_cmd commit equipe_dashboard
					[ -z "$root_prefix" ] && [ -x /etc/init.d/dnsmasq ] && /etc/init.d/dnsmasq reload >/dev/null 2>&1 || true
					[ -z "$root_prefix" ] && [ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd enable >/dev/null 2>&1 || true
					[ -z "$root_prefix" ] && [ -x /etc/init.d/odhcpd ] && /etc/init.d/odhcpd restart >/dev/null 2>&1 || true
					fixes_applied=$((fixes_applied + 1))
					add_check "Coerência IPv6 (Dashboard vs LAN)" "FIXED" "Anúncios RA/DHCPv6 reativados na LAN ($expected_service) e filtro AAAA removido."
				else
					errors=$((errors + 1))
					add_check "Coerência IPv6 (Dashboard vs LAN)" "FAIL" "Modo $ipv6_mode ativo com IPv6 na WAN, mas anúncios RA/DHCPv6 na LAN estão desativados (blackhole de IPv6)."
				fi
			else
				add_check "Coerência IPv6 (Dashboard vs LAN)" "OK" "Modo $ipv6_mode devidamente alinhado entre WAN e anúncios da LAN ($expected_service)."
			fi
		else
			# Modo dual_stack ou selective, mas WAN sem IPv6
			if [ "$lan_ra" = "server" ] || [ "$lan_dhcpv6" = "server" ]; then
				warnings=$((warnings + 1))
				add_check "Coerência IPv6 (Dashboard vs LAN)" "WARN" "Modo $ipv6_mode ativo na LAN, mas nenhuma WAN possui IPv6 configurado."
			else
				add_check "Coerência IPv6 (Dashboard vs LAN)" "OK" "Modo $ipv6_mode preservado aguardando conectividade IPv6 na WAN."
			fi
		fi
	fi

	# 12. Blindagem de Radios Wi-Fi (Auto-Ativacao de Fabrica com Preservacao de Escolha)
	user_wifi_disabled="$($uci_cmd get equipe_dashboard.main.wifi_user_disabled 2>/dev/null || echo 0)"
	if [ "$user_wifi_disabled" = "1" ]; then
		add_check "Blindagem de Radios Wi-Fi" "OK" "Radios Wi-Fi desativados voluntariamente pelo usuario (preservado)."
	else
		total_radios=0
		disabled_radios=0
		for r in $($uci_cmd show wireless 2>/dev/null | sed -n 's/^wireless\.\([a-zA-Z0-9_]*\)=wifi-device$/\1/p'); do
			total_radios=$((total_radios + 1))
			[ "$($uci_cmd get "wireless.$r.disabled" || echo 0)" = "1" ] && disabled_radios=$((disabled_radios + 1))
		done

		if [ "$total_radios" -gt 0 ] && [ "$total_radios" -eq "$disabled_radios" ]; then
			if [ "$auto_fix" = 1 ]; then
				ark_auto_enable_factory_wifi >/dev/null 2>&1 || true
				fixes_applied=$((fixes_applied + 1))
				add_check "Blindagem de Radios Wi-Fi" "FIXED" "Radios Wi-Fi ativados do padrao virgem de fabrica do OpenWrt."
			else
				warnings=$((warnings + 1))
				add_check "Blindagem de Radios Wi-Fi" "WARN" "Radios Wi-Fi bloqueados pelo padrao virgem de fabrica do OpenWrt."
			fi
		else
			add_check "Blindagem de Radios Wi-Fi" "OK" "Radios Wi-Fi operacionais e transmitindo."
		fi
	fi

	# 13. Checagem de Sincronizacao de Horario (NTP)
	cur_year="$(date +%Y 2>/dev/null || echo 0)"
	cur_date_str="$(date '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo '')"
	if [ "$cur_year" -lt 2025 ] && [ "$cur_year" -gt 0 ]; then
		if [ "$auto_fix" = 1 ]; then
			if [ -x /etc/init.d/sysntpd ]; then
				/etc/init.d/sysntpd restart >/dev/null 2>&1 || true
			fi
			fixes_applied=$((fixes_applied + 1))
			add_check "Sincronizacao de Horario (NTP)" "FIXED" "Servico NTP reiniciado para sincronizacao imediata de data e hora."
		else
			warnings=$((warnings + 1))
			add_check "Sincronizacao de Horario (NTP)" "WARN" "Relogio desatualizado (${cur_year}). Isso pode invalidar certificados TLS e o LuCI."
		fi
	else
		add_check "Sincronizacao de Horario (NTP)" "OK" "Relogio sincronizado (${cur_date_str:-OK}). Certificados TLS validos."
	fi

	# 14. Checagem da Tabela NAT (Conntrack)
	ct_count="$(cat /proc/sys/net/netfilter/nf_conntrack_count 2>/dev/null || echo 0)"
	ct_max="$(cat /proc/sys/net/netfilter/nf_conntrack_max 2>/dev/null || echo 0)"
	case "$ct_count" in ''|*[!0-9]*) ct_count=0 ;; esac
	case "$ct_max" in ''|*[!0-9]*) ct_max=0 ;; esac
	if [ "$ct_max" -gt 0 ]; then
		ct_pct=$((ct_count * 100 / ct_max))
		if [ "$ct_pct" -ge 85 ]; then
			warnings=$((warnings + 1))
			add_check "Tabela NAT (Conntrack)" "WARN" "Saturacao alta: ${ct_count}/${ct_max} conexoes ativas (${ct_pct}% do limite)."
		else
			add_check "Tabela NAT (Conntrack)" "OK" "${ct_count} conexoes ativas de ${ct_max} max (${ct_pct}% de ocupacao)."
		fi
	fi

	if [ "$format" = "json" ]; then
		printf '{"errors":%s,"warnings":%s,"fixes_applied":%s,"checks":[%s]}\n' \
			"$errors" "$warnings" "$fixes_applied" "$checks"
	else
		printf '============================================================\n'
		if [ "$errors" -eq 0 ] && [ "$warnings" -eq 0 ]; then
			printf '\033[1;32mSTATUS: SISTEMA 100%s SAUDAVEL E OTIMIZADO!\033[0m\n' '%'
		elif [ "$errors" -eq 0 ]; then
			printf '\033[1;33mSTATUS: SISTEMA OPERACIONAL (%s avisos informativos)\033[0m\n' "$warnings"
		else
			printf '\033[1;31mSTATUS: %s FALHA(S) ENCONTRADA(S) (%s avisos)\033[0m\n' "$errors" "$warnings"
			if [ "$auto_fix" = 0 ]; then
				printf 'Execute com --fix para reparar automaticamente: ark-doctor --fix\n'
			fi
		fi
		[ "$fixes_applied" -gt 0 ] && printf '\033[1;36mReparos aplicados com sucesso: %s\033[0m\n' "$fixes_applied"
		printf '============================================================\n'
	fi
}

handle_doctor() {
	_auto_fix=0
	_format="text"
	for _arg in "$@"; do
		case "$_arg" in
			--fix|fix|fix=1) _auto_fix=1 ;;
			--json|format=json|json) _format="json" ;;
		esac
	done
	ark_doctor_audit "$_auto_fix" "$_format"
}

# If executed directly as a script
if [ "$(basename "$0")" = "doctor.sh" ]; then
	handle_doctor "$@"
fi
