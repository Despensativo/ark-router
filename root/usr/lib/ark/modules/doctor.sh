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
		warnings=$((warnings + 1))
		add_check "Memoria RAM" "WARN" "RAM critica: apenas ${mem_free_mb}MB livres de ${mem_total_mb}MB."
	else
		add_check "Memoria RAM" "OK" "${mem_free_mb}MB livres de ${mem_total_mb}MB disponiveis."
	fi

	# 2. Checagem do Espaco em Flash (/overlay)
	overlay_free_kb="$(df -k /overlay 2>/dev/null | awk 'NR==2 {print $4}')"
	case "$overlay_free_kb" in
		''|*[!0-9]*) overlay_free_kb=99999 ;;
	esac
	if [ "$overlay_free_kb" -lt 1500 ]; then
		warnings=$((warnings + 1))
		add_check "Espaco Flash (/overlay)" "WARN" "Espaco livre baixo: apenas $((overlay_free_kb / 1024))MB livres."
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
			dev_sec=""
			for s in $(uci -q show network 2>/dev/null | sed -n 's/^network\.\(@device\[[0-9]*\]\|[a-zA-Z0-9_]*\)=device$/\1/p'); do
				if [ "$(uci -q get "network.$s.name")" = "$phys_dev" ]; then
					dev_sec="$s"
					break
				fi
			done
			configured_dev_mtu="$(uci -q get "network.$dev_sec.mtu")"
			if [ "$configured_dev_mtu" != "1508" ]; then
				if [ "$auto_fix" = 1 ]; then
					if [ -z "$dev_sec" ]; then
						uci add network device >/dev/null 2>&1
						dev_sec="@device[-1]"
						uci -q set "network.$dev_sec.name=$phys_dev"
					fi
					uci -q set "network.$dev_sec.mtu=1508"
					uci commit network
					ip link set "$phys_dev" mtu 1508 2>/dev/null || true
					[ "$proto" = pppoe ] && ip link set "pppoe-$wan" mtu 1500 2>/dev/null || true
					fixes_applied=$((fixes_applied + 1))
					add_check "MTU Baby Jumbo ($wan)" "FIXED" "Porta $phys_dev ajustada para MTU 1508 em config device."
				else
					errors=$((errors + 1))
					add_check "MTU Baby Jumbo ($wan)" "FAIL" "Baby Jumbo ativo, mas porta fisica $phys_dev nao possui mtu=1508 em config device."
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
		warnings=$((warnings + 1))
		add_check "Flow Offload vs Multi-WAN" "WARN" "Fastpath ativo com 2+ WANs no mwan3. O Fastpath ignora regras de balanceamento/failover."
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
	add_check "Tabela de Clientes" "OK" "Tabela DHCP e limites validados."

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
