#!/bin/sh
# /usr/lib/ark/common.sh - ARK Router Common Runtime & Environment Helper
# Compatible with BusyBox /bin/ash, OpenWrt 19.07-25.12, and sandbox test harnesses.

[ -z "${_ARK_COMMON_SH_LOADED:-}" ] || return 0
_ARK_COMMON_SH_LOADED=1

ARK_ROUTER_VERSION="1.5.4"
ARK_UPDATE_REPO_DEFAULT="Despensativo/ark-router"
ARK_ROOT="${ARK_ROOT:-}"

# Resolução de caminho de bibliotecas:
# Permite rodar nativamente em /usr/lib/ark ou em sandboxes/testes locais
if [ -z "${ARK_LIB_DIR:-}" ]; then
	if [ -n "$ARK_ROOT" ] && [ -d "${ARK_ROOT}/usr/lib/ark" ]; then
		ARK_LIB_DIR="${ARK_ROOT}/usr/lib/ark"
	elif [ -d "/usr/lib/ark" ]; then
		ARK_LIB_DIR="/usr/lib/ark"
	else
		# Fallback relativo para testes no repositório git
		_script_dir="$(dirname "$0")"
		if [ -d "${_script_dir}/../lib/ark" ]; then
			ARK_LIB_DIR="${_script_dir}/../lib/ark"
		else
			ARK_LIB_DIR="/usr/lib/ark"
		fi
		unset _script_dir
	fi
fi

# Boolean formatting helpers
bool() {
	case "${1:-}" in
		1|true|yes|on) printf true ;;
		*) printf false ;;
	esac
}

ez_bool() {
	case "$1" in
		1|true|yes|on|enabled) echo 1 ;;
		*) echo 0 ;;
	esac
}

json_escape() {
	printf '%s' "$1" | sed ':a;N;$!ba;s/\\/\\\\/g;s/"/\\"/g;s/\r/\\r/g;s/\n/\\n/g;s/\t/\\t/g'
}

json_bool_value() {
	[ "$1" = 1 ] || [ "$1" = true ] || [ "$1" = yes ] || [ "$1" = on ] && printf true || printf false
}

# Platform and OS Detection
ark_has_apk() {
	command -v apk >/dev/null 2>&1
}

ark_has_opkg() {
	command -v opkg >/dev/null 2>&1
}

ark_has_fw4() {
	command -v fw4 >/dev/null 2>&1 || [ -x "${ARK_ROOT}/sbin/fw4" ] || [ -x "/sbin/fw4" ]
}

ark_has_nftables() {
	command -v nft >/dev/null 2>&1 || [ -x "${ARK_ROOT}/usr/sbin/nft" ] || [ -x "/usr/sbin/nft" ]
}

ark_firewall_engine() {
	if ark_has_fw4 || { ark_has_nftables && nft list table inet fw4 >/dev/null 2>&1; }; then
		printf 'fw4'
	else
		printf 'fw3'
	fi
}

is_fw4() {
	[ "$(ark_firewall_engine)" = "fw4" ]
}

is_fw3() {
	[ "$(ark_firewall_engine)" = "fw3" ]
}

is_swconfig() {
	command -v swconfig >/dev/null 2>&1 && swconfig dev switch0 show >/dev/null 2>&1
}

ark_is_satellite_or_ap() {
	local role="$(uci -q get equipe_dashboard.general.role || uci -q get equipe_dashboard.mesh.role || true)"
	case "$role" in
		master|primary|gateway) return 1 ;;
		secondary|satellite) return 0 ;;
	esac
	local net_mode="$(uci -q get equipe_dashboard.main.network_mode || uci -q get equipe_dashboard.general.network_mode || true)"
	case "$net_mode" in
		router) return 1 ;;
		ap) return 0 ;;
	esac
	local dhcp_ignore="$(uci -q get dhcp.lan.ignore || echo 0)"
	local lan_gw="$(uci -q get network.lan.gateway || true)"
	[ "$dhcp_ignore" = "1" ] && [ -n "$lan_gw" ] && return 0
	return 1
}

# Package and service status queries
installed() {
	case "$1" in
		luci-app-sqm) [ -f /etc/config/sqm ] || [ -f /usr/share/luci/menu.d/luci-app-sqm.json ] && return 0 ;;
		luci-app-mwan3) [ -f /etc/config/mwan3 ] || [ -f /usr/share/luci/menu.d/luci-app-mwan3.json ] && return 0 ;;
		luci-app-nlbwmon) [ -f /etc/config/nlbwmon ] || [ -f /usr/share/luci/menu.d/luci-app-nlbwmon.json ] && return 0 ;;
		luci-app-upnp) [ -f /etc/config/upnpd ] || [ -f /usr/share/luci/menu.d/luci-app-upnp.json ] && return 0 ;;
		luci-theme-argon) [ -d /www/luci-static/argon ] && return 0 ;;
		luci-app-uhttpd) [ -f /usr/share/luci/menu.d/luci-app-uhttpd.json ] && return 0 ;;
		tailscale) [ -x /usr/sbin/tailscale ] && return 0 ;;
		zerotier) ([ -x /usr/sbin/zerotier-one ] || [ -f /etc/init.d/zerotier ]) && return 0 ;;
		wireguard) ([ -x /usr/bin/wg ] || [ -f /lib/netifd/proto/wireguard.sh ]) && return 0 ;;
		irqbalance) ([ -x /usr/sbin/irqbalance ] || [ -f /etc/init.d/irqbalance ]) && return 0 ;;
		speedify) ([ -x /usr/share/speedify/speedify ] || [ -x /usr/bin/speedify ] || [ -x /tmp/speedify/speedify ]) && return 0 ;;
		luci-app-speedify) ([ -f /usr/share/luci/menu.d/luci-app-speedify.json ] || [ -f /usr/lib/lua/luci/controller/speedify.lua ]) && return 0 ;;
		history) ([ -x /usr/sbin/equipe-traffic-history ] || [ -f /etc/init.d/equipe-traffic-history ]) && return 0 ;;
		custom_qos) (command -v tc >/dev/null 2>&1 || [ -f /etc/config/qos_equipe ]) && return 0 ;;
		usteer|luci-app-usteer) ([ -x /sbin/usteerd ] || [ -x /usr/sbin/usteerd ] || [ -f /etc/init.d/usteer ] || [ -f /usr/lib/opkg/info/usteer.control ]) && return 0 ;;
	esac
	if ark_has_apk; then
		apk info -e "$1" >/dev/null 2>&1
	elif [ -d /usr/lib/opkg/info ]; then
		[ -f "/usr/lib/opkg/info/$1.control" ] || [ -f "/usr/lib/opkg/info/$1.list" ]
	else
		opkg status "$1" 2>/dev/null | grep -q '^Status:.* installed$'
	fi
}

hidden() {
	[ "$(uci -q get equipe_dashboard.$1.hidden)" = 1 ]
}

running() {
	case "$1" in
		mwan3) pgrep -f mwan3rtmon >/dev/null 2>&1 || pgrep -f mwan3track >/dev/null 2>&1 ;;
		history|equipe-traffic-history) pidof equipe-traffic-history >/dev/null 2>&1 || pgrep -f equipe-traffic-history >/dev/null 2>&1 ;;
		upnp) pidof miniupnpd >/dev/null 2>&1 ;;
		usteer) pidof usteerd >/dev/null 2>&1 ;;
		irqbalance) pidof irqbalance >/dev/null 2>&1 ;;
		nlbwmon) pidof nlbwmon >/dev/null 2>&1 ;;
		*)
			pidof "$1" >/dev/null 2>&1 || pgrep -x "$1" >/dev/null 2>&1 || {
				[ -x "/etc/init.d/$1" ] && {
					"/etc/init.d/$1" status 2>/dev/null | grep -E -qi 'running|active' || \
					"/etc/init.d/$1" enabled >/dev/null 2>&1
				}
			}
			;;
	esac
}

# Version and identity helpers
ark_current_version() {
	if [ -f "${ARK_ROOT}/usr/share/ark-router/VERSION" ]; then
		cat "${ARK_ROOT}/usr/share/ark-router/VERSION" 2>/dev/null
	elif [ -f "/usr/share/ark-router/VERSION" ]; then
		cat /usr/share/ark-router/VERSION 2>/dev/null
	else
		printf '%s' "$ARK_ROUTER_VERSION"
	fi
}

ark_update_repo() {
	uci -q get equipe_dashboard.update.repo 2>/dev/null || printf '%s' "$ARK_UPDATE_REPO_DEFAULT"
}

normalize_version() {
	printf '%s' "$1" | sed 's/^v//; s/[^0-9.].*$//'
}

# Safe concurrency locking for BusyBox ash
ARK_LOCK_DIR="${ARK_ROOT}/var/lock"
[ -d "$ARK_LOCK_DIR" ] || ARK_LOCK_DIR="${ARK_ROOT}/tmp"

ark_acquire_lock() {
	_lockname="${1:-ark_operation}"
	_lockfile="${ARK_LOCK_DIR}/${_lockname}.lock"
	_tries=0
	while [ "$_tries" -lt 50 ]; do
		if mkdir "${_lockfile}.d" 2>/dev/null; then
			echo "$$" > "${_lockfile}.d/pid"
			return 0
		fi
		# Check for stale lock
		if [ -f "${_lockfile}.d/pid" ]; then
			_holder="$(cat "${_lockfile}.d/pid" 2>/dev/null || true)"
			if [ -n "$_holder" ] && ! kill -0 "$_holder" 2>/dev/null; then
				rm -rf "${_lockfile}.d" 2>/dev/null || true
				continue
			fi
		fi
		sleep 0.1 2>/dev/null || sleep 1
		_tries=$((_tries + 1))
	done
	return 1
}

ark_release_lock() {
	_lockname="${1:-ark_operation}"
	_lockfile="${ARK_LOCK_DIR}/${_lockname}.lock"
	rm -rf "${_lockfile}.d" 2>/dev/null || true
}

ez_backup() {
	stamp="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo unknown)"
	file="/tmp/ark-router-ezsetup-backup-$stamp.tar.gz"
	stage="/tmp/ark-router-ezsetup-backup-$stamp"
	rm -rf "$stage"
	mkdir -p "$stage/etc/config" "$stage/metadata" || return 1
	_cfg_dir="${ARK_ROOT}/etc/config"
	[ -d "$_cfg_dir" ] || _cfg_dir="/etc/config"
	for cfg in network wireless dhcp firewall sqm mwan3 uhttpd luci equipe_dashboard equipe_devices qos_equipe; do
		[ -f "$_cfg_dir/$cfg" ] && cp "$_cfg_dir/$cfg" "$stage/etc/config/$cfg"
	done
	{
		echo "ARK Router EZ Setup backup"
		echo "Created: $(date 2>/dev/null || true)"
		echo "Restore command:"
		echo "  tar -xzf $file -C /"
		echo "  /etc/init.d/network reload"
		echo "  /etc/init.d/dnsmasq restart"
		echo "  /etc/init.d/firewall restart"
	} > "$stage/metadata/README.txt"
	tar -czf "$file" -C "$stage" . || return 1
	rm -rf "$stage"
	ls -1t /tmp/ark-router-ezsetup-backup-*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
	ls -1t /tmp/ark-profile-backup-*.tar.gz 2>/dev/null | tail -n +4 | xargs rm -f 2>/dev/null || true
	command -v ez_set >/dev/null 2>&1 && ez_set backup "$file"
	printf '%s' "$file"
}

detect_dns_blocker() {
	if pgrep -x 'AdGuardHome' >/dev/null 2>&1 || pgrep -x 'adguardhome' >/dev/null 2>&1; then
		echo "AdGuard Home"
		return 0
	fi
	if [ "$(uci -q get equipe_perf.settings.adblock_cloud || printf 0)" = 1 ]; then
		echo "Bloqueador em Nuvem"
		return 0
	fi
	if [ -x /etc/init.d/adguardhome ] && /etc/init.d/adguardhome status 2>/dev/null | grep -v 'not running' | grep -q 'running'; then
		echo "AdGuard Home"
		return 0
	fi
	if [ -f /etc/init.d/adblock-fast ] && /etc/init.d/adblock-fast status 2>/dev/null | grep -v 'not running' | grep -q 'running'; then
		echo "Adblock Fast"
		return 0
	fi
	if [ -f /etc/init.d/adblock ] && /etc/init.d/adblock status 2>/dev/null | grep -v 'not running' | grep -q 'running'; then
		echo "Adblock"
		return 0
	fi
	if pgrep -x 'pihole-FTL' >/dev/null 2>&1; then
		echo "Pi-hole"
		return 0
	fi
	return 1
}

ark_calculate_rps_mask() {
	local cores="$1"
	[ -z "$cores" ] || [ "$cores" -lt 1 ] 2>/dev/null && cores=1

	awk -v cores="$cores" 'BEGIN {
		full_f = int(cores / 4);
		rem = cores % 4;
		prefix = "";
		if (rem == 1) prefix = "1";
		else if (rem == 2) prefix = "3";
		else if (rem == 3) prefix = "7";
		mask = prefix;
		for (i = 0; i < full_f; i++) mask = mask "f";
		if (mask == "") mask = "1";
		print mask;
	}' 2>/dev/null || echo "f"
}


# Firewall-aware Addon Reconcilers and Variant Migration (fw4 vs fw3)
ark_upnp_is_legacy_iptables() {
	local opkg_info="/usr/lib/opkg/info"
	local upnp_bin="/usr/sbin/miniupnpd"
	[ -n "${ARK_ROOT}" ] && {
		opkg_info="${ARK_ROOT}/usr/lib/opkg/info"
		upnp_bin="${ARK_ROOT}/usr/sbin/miniupnpd"
	}
	if ark_has_apk; then
		apk info -e miniupnpd-iptables >/dev/null 2>&1 && return 0
	elif [ -f "${opkg_info}/miniupnpd-iptables.control" ] || [ -f "${opkg_info}/miniupnpd-iptables.list" ]; then
		return 0
	fi
	if [ -x "$upnp_bin" ]; then
		if command -v readelf >/dev/null 2>&1; then
			readelf -d "$upnp_bin" 2>/dev/null | grep -q 'libip4tc' && return 0
		elif command -v strings >/dev/null 2>&1; then
			strings "$upnp_bin" 2>/dev/null | grep -q 'libip4tc' && return 0
		fi
	fi
	if is_fw4; then
		if ark_has_apk; then
			apk info -e miniupnpd >/dev/null 2>&1 && ! apk info -e miniupnpd-nftables >/dev/null 2>&1 && return 0
		elif [ -f "${opkg_info}/miniupnpd.control" ] && [ ! -f "${opkg_info}/miniupnpd-nftables.control" ]; then
			return 0
		fi
	fi
	return 1
}

ark_upnp_is_legacy_nftables_on_fw3() {
	is_fw3 || return 1
	local opkg_info="/usr/lib/opkg/info"
	local upnp_bin="/usr/sbin/miniupnpd"
	[ -n "${ARK_ROOT}" ] && {
		opkg_info="${ARK_ROOT}/usr/lib/opkg/info"
		upnp_bin="${ARK_ROOT}/usr/sbin/miniupnpd"
	}
	if ark_has_apk; then
		apk info -e miniupnpd-nftables >/dev/null 2>&1 && return 0
	elif [ -f "${opkg_info}/miniupnpd-nftables.control" ] || [ -f "${opkg_info}/miniupnpd-nftables.list" ]; then
		return 0
	fi
	if [ -x "$upnp_bin" ]; then
		if command -v readelf >/dev/null 2>&1; then
			readelf -d "$upnp_bin" 2>/dev/null | grep -q 'libnftnl' && return 0
		elif command -v strings >/dev/null 2>&1; then
			strings "$upnp_bin" 2>/dev/null | grep -q 'libnftnl' && return 0
		fi
	fi
	return 1
}

ark_migrate_upnp_variant() {
	local target_engine="$(ark_firewall_engine)"
	local root_prefix="${ARK_ROOT:-}"
	local cfg_file="${root_prefix}/etc/config/upnpd"
	local init_script="${root_prefix}/etc/init.d/miniupnpd"
	local fw4_bin="${root_prefix}/sbin/fw4"
	local bak_file="/tmp/upnpd.conf.bak"

	if [ "$target_engine" = "fw4" ]; then
		ark_upnp_is_legacy_iptables || return 0
		logger -t ark-reconcile "Detectado miniupnpd legado (iptables) em motor fw4. Migrando para miniupnpd-nftables puro..."
		
		# 1. Parar servico ativo
		[ -x "$init_script" ] && "$init_script" stop >/dev/null 2>&1 || true
		killall miniupnpd 2>/dev/null || true
		
		# 2. Preservar configuracoes UCI
		[ -f "$cfg_file" ] && cp -f "$cfg_file" "$bak_file" 2>/dev/null || true
		
		# 3. Remover pacote incompativel
		if ark_has_apk; then
			apk del miniupnpd-iptables miniupnpd >/dev/null 2>&1 || true
		else
			opkg remove --force-depends miniupnpd-iptables miniupnpd >/dev/null 2>&1 || true
		fi
		
		# 4. No fw4 puro (nftables), nao invocamos iptables/ip6tables para evitar instanciacao de tabelas legadas indesejadas no kernel
		
		# 5. Instalar pacote oficial nftables
		if ark_has_apk; then
			apk update >/dev/null 2>&1 || true
			apk add luci-app-upnp miniupnpd-nftables >/dev/null 2>&1 || true
		else
			opkg update >/dev/null 2>&1 || true
			opkg install luci-app-upnp miniupnpd-nftables >/dev/null 2>&1 || true
		fi
		
		# 6. Restaurar config se necessario
		if [ -f "$bak_file" ]; then
			[ -s "$cfg_file" ] || cp -f "$bak_file" "$cfg_file" 2>/dev/null || true
			rm -f "$bak_file" 2>/dev/null || true
		fi
		
		# 7. Recarregar fw4 e reiniciar daemon
		[ -x "$fw4_bin" ] && "$fw4_bin" reload >/dev/null 2>&1 || true
		[ -x "$init_script" ] && {
			"$init_script" enable >/dev/null 2>&1 || true
			"$init_script" start >/dev/null 2>&1 || true
		}
		logger -t ark-reconcile "Migracao UPnP concluida: miniupnpd-nftables ativo no fw4."
		return 0

	elif [ "$target_engine" = "fw3" ]; then
		ark_upnp_is_legacy_nftables_on_fw3 || return 0
		logger -t ark-reconcile "Detectado miniupnpd-nftables em motor fw3 legado. Restaurando versao iptables retrocompativel..."
		
		[ -x "$init_script" ] && "$init_script" stop >/dev/null 2>&1 || true
		killall miniupnpd 2>/dev/null || true
		[ -f "$cfg_file" ] && cp -f "$cfg_file" "$bak_file" 2>/dev/null || true
		
		if ark_has_apk; then
			apk del miniupnpd-nftables >/dev/null 2>&1 || true
			apk add luci-app-upnp miniupnpd >/dev/null 2>&1 || true
		else
			opkg remove --force-depends miniupnpd-nftables >/dev/null 2>&1 || true
			opkg install luci-app-upnp miniupnpd >/dev/null 2>&1 || true
		fi
		
		if [ -f "$bak_file" ]; then
			[ -s "$cfg_file" ] || cp -f "$bak_file" "$cfg_file" 2>/dev/null || true
			rm -f "$bak_file" 2>/dev/null || true
		fi
		
		[ -x "${root_prefix}/etc/init.d/firewall" ] && "${root_prefix}/etc/init.d/firewall" reload >/dev/null 2>&1 || true
		[ -x "$init_script" ] && {
			"$init_script" enable >/dev/null 2>&1 || true
			"$init_script" start >/dev/null 2>&1 || true
		}
		logger -t ark-reconcile "Restauracao UPnP concluida: miniupnpd compativel ativo no fw3."
		return 0
	fi
	return 1
}

# Safe Storage & Service Shutdown before Reboot
# Interrompe graciosamente servicos que gravam em midias externas (servidores web,
# bancos de dados, downloads, compartilhamentos de arquivos e midia),
# e descarrega todos os buffers de RAM do kernel de forma segura antes do reinicio.
ark_safe_storage_reboot() {
	local root_prefix="${ARK_ROOT:-}"
	logger -t ark-safe-storage "Iniciando sequencia de encerramento seguro e protecao de armazenamento..."

	# 1. Pausa graciosa e encerramento de downloads (Transmission, Aria2)
	if pidof transmission-daemon >/dev/null 2>&1; then
		logger -t ark-safe-storage "Transmission ativo: pausando downloads e salvando metadados..."
		if command -v transmission-remote >/dev/null 2>&1; then
			local t_port="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].rpc_port 2>/dev/null || echo 9091)"
			local t_auth=""
			local t_auth_req="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].rpc_authentication_required 2>/dev/null || echo 0)"
			if [ "$t_auth_req" = "1" ] || [ "$t_auth_req" = "true" ]; then
				local t_user="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].rpc_username 2>/dev/null || echo '')"
				local t_pass="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].rpc_password 2>/dev/null || echo '')"
				[ -n "$t_user" ] && t_auth="-n ${t_user}:${t_pass}"
			fi
			transmission-remote "$t_port" $t_auth -t all --stop >/dev/null 2>&1 || true
		fi

		if [ -x "${root_prefix}/etc/init.d/transmission" ]; then
			"${root_prefix}/etc/init.d/transmission" stop >/dev/null 2>&1 || true
		else
			killall -TERM transmission-daemon 2>/dev/null || true
		fi

		local wait_cnt=0
		while pidof transmission-daemon >/dev/null 2>&1 && [ "$wait_cnt" -lt 6 ]; do
			usleep 500000 2>/dev/null || sleep 1
			wait_cnt=$((wait_cnt + 1))
		done
		if pidof transmission-daemon >/dev/null 2>&1; then
			killall -9 transmission-daemon 2>/dev/null || true
		fi
	fi

	if pidof aria2c >/dev/null 2>&1; then
		logger -t ark-safe-storage "Aria2 ativo: salvando sessao e encerrando downloads..."
		if [ -x "${root_prefix}/etc/init.d/aria2" ]; then
			"${root_prefix}/etc/init.d/aria2" stop >/dev/null 2>&1 || true
		else
			killall -TERM aria2c 2>/dev/null || true
		fi
		local wait_cnt=0
		while pidof aria2c >/dev/null 2>&1 && [ "$wait_cnt" -lt 6 ]; do
			usleep 500000 2>/dev/null || sleep 1
			wait_cnt=$((wait_cnt + 1))
		done
		if pidof aria2c >/dev/null 2>&1; then
			killall -9 aria2c 2>/dev/null || true
		fi
	fi

	# 2. Interromper daemons de servidores web e bancos de dados (fechar conexoes e locks)
	for srv in nginx lighttpd apache2 mysqld mariadb uwsgi php-fpm; do
		if [ -x "${root_prefix}/etc/init.d/$srv" ]; then
			"${root_prefix}/etc/init.d/$srv" stop >/dev/null 2>&1 || true
		fi
	done

	# 3. Interromper daemons de rede com escrita em disco (Samba, FTP, DLNA)
	for srv in smbd nmbd samba samba4 vsftpd minidlna gerbera; do
		if [ -x "${root_prefix}/etc/init.d/$srv" ]; then
			"${root_prefix}/etc/init.d/$srv" stop >/dev/null 2>&1 || true
		fi
	done

	# 4. Forcar nlbwmon a gravar estatisticas de trafego acumuladas
	if pidof nlbwmon >/dev/null 2>&1; then
		killall -USR1 nlbwmon 2>/dev/null || true
	fi

	# 5. Sincronizacao de memoria RAM para os discos fisicos (sync multiplo)
	sync
	sync
	sync

	logger -t ark-safe-storage "Protecao de armazenamento concluida. Buffers descarregados com sucesso."
	return 0
}

# Auditoria e endurecimento do Transmission contra vazamentos de protocolo
ark_harden_transmission_config() {
	local root_prefix="${ARK_ROOT:-}"
	local cfg="${root_prefix}/etc/config/transmission"
	[ -f "$cfg" ] || return 0

	local changed=0
	# 1. UPnP: desativar para evitar chamadas de miniupnpd/iptables no fw4
	if [ "$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].port_forwarding_enabled)" != "0" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].port_forwarding_enabled='0'
		changed=1
	fi

	# 2. Criptografia: forcar criptografia (1=prefer, 2=require) para eliminar vazamento em texto claro
	local enc="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].encryption)"
	if [ "$enc" = "0" ] || [ -z "$enc" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].encryption='1'
		changed=1
	fi

	# 3. LPD: desativar multicast local na LAN para evitar vazamento de hashes e acordar Wi-Fi
	if [ "$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].lpd_enabled)" != "0" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].lpd_enabled='0'
		changed=1
	fi

	# 4. Desativar uTP (LEDBAT) para evitar estrangulamento de banda e tempestade UDP em userspace
	if [ "$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].utp_enabled)" != "false" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].utp_enabled='false'
		changed=1
	fi

	# 5. Otimizacao de limites de peers para conexoes de alta velocidade (evita sobrecarga de CPU single-thread)
	local p_torrent="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].peer_limit_per_torrent)"
	if [ -z "$p_torrent" ] || [ "$p_torrent" -gt 80 ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].peer_limit_per_torrent='60'
		changed=1
	fi

	local p_global="$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].peer_limit_global)"
	if [ -z "$p_global" ] || [ "$p_global" -gt 250 ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].peer_limit_global='180'
		changed=1
	fi

	# 6. Prioridade normal no agendador do Kernel (elimina nice 10)
	if [ "$(uci -q ${root_prefix:+-c "$root_prefix/etc/config"} get transmission.@transmission[0].nice)" = "10" ]; then
		uci -q ${root_prefix:+-c "$root_prefix/etc/config"} set transmission.@transmission[0].nice='0'
		changed=1
	fi

	if [ "$changed" -eq 1 ]; then
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit transmission 2>/dev/null || true
		logger -t ark-transmission "Configuracoes de seguranca, desempenho Gigabit e blindagem uTP aplicadas no Transmission."
	fi
	return 0
}

# Limpeza de processos odhcp6c órfãos (PPID 1) para prevenir avalanches de recargas no netifd
ark_cleanup_dhcpv6_orphans() {
	local cleaned=0
	for pid in $(pgrep -x odhcp6c 2>/dev/null || ps w 2>/dev/null | awk '/[o]dhcp6c/ {print $1}'); do
		[ -n "$pid" ] || continue
		local ppid=""
		if [ -f "/proc/$pid/status" ]; then
			ppid="$(awk '/^PPid:/ {print $2}' "/proc/$pid/status" 2>/dev/null)"
		fi
		if [ "$ppid" = "1" ]; then
			logger -t ark-anti-zombie "Encerrando processo odhcp6c orfao (PID $pid, PPID 1) para evitar loops de recarga..."
			kill -15 "$pid" 2>/dev/null || true
			sleep 0.2
			kill -9 "$pid" 2>/dev/null || true
			cleaned=$((cleaned + 1))
		fi
	done
	return $cleaned
}

# Sanitizacao Canonica de Interfaces WAN6 (prevencao contra device fisico bruto em vez de alias @wan)
ark_sanitize_wan6_config() {
	local root_prefix="${ARK_ROOT:-}"
	local cfg="${root_prefix}/etc/config/network"
	[ -f "$cfg" ] || return 0

	local changed=0
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"

	for sec in $($uci_cmd show network 2>/dev/null | sed -n 's/^network\.\([a-zA-Z0-9_]*\)=interface$/\1/p'); do
		local proto="$($uci_cmd get "network.$sec.proto" || echo '')"
		[ "$proto" = "dhcpv6" ] || continue

		local dev="$($uci_cmd get "network.$sec.device" || echo '')"
		[ -n "$dev" ] || dev="$($uci_cmd get "network.$sec.ifname" || echo '')"

		case "$dev" in
			@*) ;; # Ja e alias logico canonico (@wan, @wan2, etc.)
			*)
				if [ -n "$dev" ]; then
					$uci_cmd set "network.$sec.device=@$dev"
					$uci_cmd delete "network.$sec.ifname" 2>/dev/null || true
					changed=1
					logger -t ark-network-sanitize "Interface $sec: corrigido device de '$dev' para '@$dev' para compatibilidade netifd."
				fi
				;;
		esac

		local reqaddr="$($uci_cmd get "network.$sec.reqaddress" || echo '')"
		if [ -z "$reqaddr" ]; then
			$uci_cmd set "network.$sec.reqaddress=try"
			changed=1
		fi
		local reqpfx="$($uci_cmd get "network.$sec.reqprefix" || echo '')"
		if [ -z "$reqpfx" ]; then
			$uci_cmd set "network.$sec.reqprefix=auto"
			changed=1
		fi
	done

	if [ "$changed" -eq 1 ]; then
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit network 2>/dev/null || true
		logger -t ark-network-sanitize "Configuracao de rede WAN6 sanitizada com sucesso no UCI."
	fi
	return 0
}

# Auto-ativacao inteligente de radios Wi-Fi de fabrica com preservacao estrita de escolha do usuario
ark_auto_enable_factory_wifi() {
	local root_prefix="${ARK_ROOT:-}"
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"

	local user_disabled="$($uci_cmd get equipe_dashboard.main.wifi_user_disabled 2>/dev/null || echo 0)"
	if [ "$user_disabled" = "1" ]; then
		return 0
	fi

	local w_cfg="${root_prefix}/etc/config/wireless"
	[ -f "$w_cfg" ] || return 0

	local total_radios=0
	local disabled_radios=0

	for r in $($uci_cmd show wireless 2>/dev/null | sed -n 's/^wireless\.\([a-zA-Z0-9_]*\)=wifi-device$/\1/p'); do
		total_radios=$((total_radios + 1))
		local dis="$($uci_cmd get "wireless.$r.disabled" || echo 0)"
		[ "$dis" = "1" ] && disabled_radios=$((disabled_radios + 1))
	done

	if [ "$total_radios" -gt 0 ] && [ "$total_radios" -eq "$disabled_radios" ]; then
		for r in $($uci_cmd show wireless 2>/dev/null | sed -n 's/^wireless\.\([a-zA-Z0-9_]*\)=wifi-device$/\1/p'); do
			$uci_cmd set "wireless.$r.disabled=0"
		done
		uci ${root_prefix:+-c "$root_prefix/etc/config"} commit wireless 2>/dev/null || true
		logger -t ark-wifi-guard "Radios Wi-Fi ativados do padrao virgem de fabrica do OpenWrt ($total_radios radios habilitados)."
		if [ -z "$root_prefix" ]; then
			(sleep 1; wifi reload >/dev/null 2>&1 || wifi up >/dev/null 2>&1 || true) &
		fi
		return 0
	fi
	return 1
}

# Consolidacao e Blindagem de MTU em secoes config device (Baby Jumbo 1508 / Padrao 1500)
# Elimina secoes duplicadas para a mesma porta fisica e garante aplicacao no kernel e UCI.
ark_ensure_phys_device_mtu() {
	local phys_dev="$1"
	local target_mtu="${2:-1508}"
	[ -n "$phys_dev" ] || return 1

	local root_prefix="${ARK_ROOT:-}"
	local uci_cmd="uci -q ${root_prefix:+-c "$root_prefix/etc/config"}"

	local matched_sections=""
	local mac_to_keep=""
	local primary_sec=""

	for s in $($uci_cmd show network 2>/dev/null | grep '=device$' | cut -d. -f2 | cut -d= -f1); do
		if [ "$($uci_cmd get "network.$s.name")" = "$phys_dev" ]; then
			matched_sections="$matched_sections $s"
			local m="$($uci_cmd get "network.$s.macaddr")"
			[ -n "$m" ] && [ -z "$mac_to_keep" ] && mac_to_keep="$m"
		fi
	done

	if [ -n "$matched_sections" ]; then
		local is_first=1
		for s in $matched_sections; do
			if [ "$is_first" = 1 ]; then
				primary_sec="$s"
				is_first=0
			else
				$uci_cmd delete "network.$s"
			fi
		done
	else
		$uci_cmd add network device >/dev/null 2>&1
		primary_sec="@device[-1]"
		$uci_cmd set "network.$primary_sec.name=$phys_dev"
	fi

	$uci_cmd set "network.$primary_sec.name=$phys_dev"
	$uci_cmd set "network.$primary_sec.mtu=$target_mtu"
	[ -n "$mac_to_keep" ] && $uci_cmd set "network.$primary_sec.macaddr=$mac_to_keep"
	uci ${root_prefix:+-c "$root_prefix/etc/config"} commit network 2>/dev/null || true

	if [ -n "$root_prefix" ] && [ -f "$root_prefix/sys/class/net/$phys_dev/mtu" ]; then
		printf '%s\n' "$target_mtu" > "$root_prefix/sys/class/net/$phys_dev/mtu" 2>/dev/null || true
	elif [ -z "$root_prefix" ]; then
		ip link set "$phys_dev" mtu "$target_mtu" 2>/dev/null || true
	fi
}
