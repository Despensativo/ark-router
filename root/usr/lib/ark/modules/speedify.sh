#!/bin/sh
# /usr/lib/ark/modules/speedify.sh - Speedify Bonding & Integration Module
# Compatible with BusyBox /bin/ash, OpenWrt 19.07 to 25.12

[ -z "${_ARK_SPEEDIFY_SH_LOADED:-}" ] || return 0
_ARK_SPEEDIFY_SH_LOADED=1

[ -n "${ARK_LIB_DIR:-}" ] || ARK_LIB_DIR="/usr/lib/ark"
. "${ARK_LIB_DIR}/common.sh"
. "${ARK_LIB_DIR}/logging.sh"
. "${ARK_LIB_DIR}/validation.sh"

speedify_detected_install_mode() {
	if [ -x /tmp/ark-speedify-root/usr/share/speedify/speedify ]; then
		printf 'ram'
	elif [ -n "$(uci -q get equipe_dashboard.speedify.external_target)" ] && [ -x "$(uci -q get equipe_dashboard.speedify.external_target)/ark-router/speedify-root/usr/share/speedify/speedify" ]; then
		printf 'external'
	elif [ -x /usr/share/speedify/speedify ] || [ -x /usr/bin/speedify ] || installed speedify; then
		printf 'internal'
	else
		saved_m="$(uci -q get equipe_dashboard.speedify.install_mode || true)"
		case "$saved_m" in
			internal|external|ram) printf '%s' "$saved_m" ;;
			*) printf 'auto' ;;
		esac
	fi
}

speedify_ipk_name() {
	if command -v opkg >/dev/null 2>&1; then
		arch="$(opkg info kernel 2>/dev/null | grep Architecture: | cut -d ' ' -f 2 | tail -n 1)"
		case "$arch" in
			aarch64_cortex-a53|aarch64_cortex-a72|aarch64_generic|x86_64)
				printf 'speedify_%s.ipk' "$arch"
				return 0
				;;
		esac
	fi
	case "$(uname -m 2>/dev/null)" in
		aarch64) printf 'speedify_aarch64_cortex-a53.ipk' ;;
		x86_64) printf 'speedify_x86_64.ipk' ;;
		*) return 1 ;;
	esac
}

speedify_extract_package() {
	pkg="$1"; dest="$2"
	mkdir -p "$dest"
	if command -v apk >/dev/null 2>&1; then
		apk --allow-untrusted extract --destination "$dest" "$pkg" >/tmp/ark-speedify-extract.log 2>&1 && return 0
	fi
	if tar -tzf "$pkg" >/dev/null 2>&1; then
		tar -xzf "$pkg" -C "$dest" >/tmp/ark-speedify-extract.log 2>&1 || { cat /tmp/ark-speedify-extract.log >&2; return 1; }
		if [ -f "$dest/data.tar.gz" ]; then
			tar -xzf "$dest/data.tar.gz" -C "$dest" >>/tmp/ark-speedify-extract.log 2>&1 || true
			rm -f "$dest/data.tar.gz" "$dest/control.tar.gz" "$dest/debian-binary" 2>/dev/null || true
		fi
		return 0
	fi
	echo "Formato de pacote Speedify nao reconhecido para extracao: $pkg" >&2
	return 1
}

install_speedify_official() {
	speedify_supported || { echo 'Arquitetura nao suportada pelo Speedify. Requer aarch64 ou x86_64.' >&2; return 3; }
	command -v wget >/dev/null 2>&1 || { echo 'wget nao encontrado' >&2; return 3; }
	overlay_avail="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"; [ -n "$overlay_avail" ] || overlay_avail=0
	need_internal="$(uci -q get equipe_dashboard.speedify.min_internal_kb || printf '%s' "${ARK_SPEEDIFY_INTERNAL_MIN_KB:-22000}")"
	[ "$overlay_avail" -ge "$need_internal" ] || { echo "Espaco interno insuficiente para Speedify. Livre: ${overlay_avail} KB; recomendado: ${need_internal} KB. Use armazenamento externo/extroot ou modo RAM experimental." >&2; return 3; }
	tmp="${TMPDIR:-/tmp}/ark-router-speedify-install.sh"
	rm -f "$tmp"
	inst_ok=0
	if wget -q --no-check-certificate https://get.speedify.com -O "$tmp" && [ -s "$tmp" ]; then
		sh "$tmp" --no-ui && inst_ok=1
	fi
	if [ "$inst_ok" -ne 1 ]; then
		echo 'Instalador get.speedify.com falhou. Tentando pacote oficial direto...' >&2
		ipk_file="$(speedify_ipk_name 2>/dev/null || true)"
		if [ -n "$ipk_file" ] && command -v opkg >/dev/null 2>&1; then
			ipk_tmp="/tmp/$ipk_file"
			rm -f "$ipk_tmp"
			if wget -q --no-check-certificate "https://downloads.speedify.com/$ipk_file" -O "$ipk_tmp" && [ -s "$ipk_tmp" ]; then
				opkg install "$ipk_tmp" && inst_ok=1
				rm -f "$ipk_tmp"
			fi
		fi
	fi
	[ "$inst_ok" -eq 1 ] || { echo 'Falha ao instalar Speedify oficial.' >&2; return 1; }
	uci -q set equipe_dashboard.speedify=feature
	uci -q set equipe_dashboard.speedify.install_mode='internal'
	uci -q set equipe_dashboard.speedify.prepared='1'
	uci commit equipe_dashboard
	rm -f /tmp/luci-indexcache
	rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
	(
		sleep 2
		[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart
		[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart
	) >/dev/null 2>&1 &
	return 0
}

speedify_save_config() {
	mkdir -p /etc/ark-router/speedify
	for src in /etc/speedify /usr/share/speedify/settings /usr/share/speedify/*.conf; do
		[ -e "$src" ] || continue
		name="$(basename "$src")"
		if [ -d "$src" ]; then tar -czf "/etc/ark-router/speedify/$name.tar.gz" -C "$(dirname "$src")" "$name" 2>/dev/null || true
		else cp "$src" "/etc/ark-router/speedify/$name" 2>/dev/null || true
		fi
	done
	uci -q set equipe_dashboard.speedify=feature
	uci -q set equipe_dashboard.speedify.saved_config=1
	uci commit equipe_dashboard
	echo saved
}

speedify_loader_path() {
	r="$1"
	case "$(uname -m 2>/dev/null)" in
		x86_64)
			if [ -e "$r/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2" ]; then printf '%s/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2' "$r"; return 0; fi
			if [ -e "$r/lib/ld-linux-x86-64.so.2" ]; then printf '%s/lib/ld-linux-x86-64.so.2' "$r"; return 0; fi
			if [ -e /lib64/ld-linux-x86-64.so.2 ]; then printf '/lib64/ld-linux-x86-64.so.2'; return 0; fi
			printf '%s/lib/x86_64-linux-gnu/ld-linux-x86-64.so.2' "$r"
			;;
		aarch64|*)
			if [ -e "$r/lib/ld-linux-aarch64.so.1" ]; then printf '%s/lib/ld-linux-aarch64.so.1' "$r"; return 0; fi
			if [ -e "$r/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1" ]; then printf '%s/lib/aarch64-linux-gnu/ld-linux-aarch64.so.1' "$r"; return 0; fi
			if [ -e /lib/ld-linux-aarch64.so.1 ]; then printf '/lib/ld-linux-aarch64.so.1'; return 0; fi
			printf '%s/lib/ld-linux-aarch64.so.1' "$r"
			;;
	esac
}

speedify_library_path() {
	r="$1"
	case "$(uname -m 2>/dev/null)" in
		x86_64) printf '%s/lib:%s/lib/x86_64-linux-gnu' "$r" "$r" ;;
		aarch64|*) printf '%s/lib:%s/lib/aarch64-linux-gnu' "$r" "$r" ;;
	esac
}

speedify_write_cli_wrapper() {
	wrapper="$1"; r="$2"
	mkdir -p "$(dirname "$wrapper")"
	ld="$(speedify_loader_path "$r")"
	lib_path="$(speedify_library_path "$r")"
	cat >"$wrapper" <<EOF
#!/bin/sh
R="$r"
exec "$ld" --library-path "$lib_path" "\$R/speedify_cli" "\$@"
EOF
	chmod +x "$wrapper"
}

speedify_package_url() {
	case "$(uname -m 2>/dev/null)" in
		aarch64) printf 'https://downloads.speedify.com/speedify_aarch64_cortex-a53.apk' ;;
		x86_64) printf 'https://downloads.speedify.com/speedify_x86_64.apk' ;;
		*) return 1 ;;
	esac
}

speedify_fetch_package() {
	pkg="$1"
	url="$(speedify_package_url)" || { echo 'Arquitetura Speedify sem pacote conhecido.' >&2; return 3; }
	mkdir -p "$(dirname "$pkg")"
	if [ -s "$pkg" ]; then
		echo "Usando pacote Speedify em cache: $pkg" >&2
		return 0
	fi
	command -v wget >/dev/null 2>&1 || { echo 'wget nao encontrado' >&2; return 3; }
	tmp="$pkg.download.$$"
	rm -f "$tmp"
	wget -q --no-check-certificate "$url" -O "$tmp" || { rm -f "$tmp"; echo 'Falha ao baixar pacote Speedify. Se o roteador estiver sem Internet, envie o pacote para /tmp/ark-speedify-cache/speedify.apk e tente novamente.' >&2; return 1; }
	[ -s "$tmp" ] || { rm -f "$tmp"; echo 'Download Speedify vazio ou invalido.' >&2; return 1; }
	mv "$tmp" "$pkg"
	return 0
}

speedify_ensure_tun() {
	[ -c /dev/net/tun ] && return 0
	mkdir -p /dev/net 2>/dev/null || true
	modprobe tun >/dev/null 2>&1 || true
	[ -c /dev/net/tun ] && return 0
	if command -v apk >/dev/null 2>&1; then
		ark_run_limited 90 apk update >/tmp/ark-speedify-kmod-tun.log 2>&1 || true
		ark_run_limited 120 apk add kmod-tun >>/tmp/ark-speedify-kmod-tun.log 2>&1 || { cat /tmp/ark-speedify-kmod-tun.log >&2; echo 'Falha ao instalar kmod-tun. O Speedify precisa de /dev/net/tun.' >&2; return 3; }
	elif command -v opkg >/dev/null 2>&1; then
		opkg update >/tmp/ark-speedify-kmod-tun.log 2>&1 || true
		opkg install kmod-tun >>/tmp/ark-speedify-kmod-tun.log 2>&1 || { cat /tmp/ark-speedify-kmod-tun.log >&2; echo 'Falha ao instalar kmod-tun. O Speedify precisa de /dev/net/tun.' >&2; return 3; }
	else
		echo 'Gerenciador de pacotes nao encontrado para instalar kmod-tun. Instale kmod-tun manualmente.' >&2
		return 3
	fi
	modprobe tun >/dev/null 2>&1 || true
	[ -c /dev/net/tun ] || { echo 'kmod-tun instalado/verificado, mas /dev/net/tun ainda nao existe.' >&2; return 3; }
	return 0
}

speedify_tunnel_device() {
	dev="$(ip -o link show 2>/dev/null | awk -F': ' '/: connectify[0-9]*:/{print $2; exit}' | cut -d@ -f1)"
	[ -n "$dev" ] && printf '%s' "$dev" || printf connectify0
}

speedify_firewall_zone_section() {
	uci -q show firewall 2>/dev/null | awk -F= '
		/\.name='\''speedify'\''$/ { s=$1; sub(/^firewall\./, "", s); sub(/\.name$/, "", s); print s; exit }
	'
}

speedify_firewall_forwarding_exists() {
	src="$1"; dest="$2"
	uci -q show firewall 2>/dev/null | awk -F= -v src="$src" -v dest="$dest" '
		/\.src=/ { s=$1; sub(/^firewall\./, "", s); sub(/\.src$/, "", s); v=$2; gsub(/\047/, "", v); if (v==src) a[s]=1 }
		/\.dest=/ { s=$1; sub(/^firewall\./, "", s); sub(/\.dest$/, "", s); v=$2; gsub(/\047/, "", v); if (v==dest) b[s]=1 }
		END { for (s in a) if (b[s]) { found=1; break } exit found ? 0 : 1 }
	'
}

speedify_clean_zone_devices() {
	# O tunel deve pertencer somente a zona speedify, nunca a lan/wan.
	for sec in $(uci -q show firewall 2>/dev/null | sed -n "s/^firewall\.\(@zone\[[0-9]*\]\)\.name=.*/\1/p"); do
		name="$(uci -q get "firewall.$sec.name" 2>/dev/null || true)"
		[ "$name" = speedify ] || uci -q del_list "firewall.$sec.device=$(speedify_tunnel_device)"
	done
}

speedify_start_extracted() {
	root="$1"; wrapper="$2"
	r="$root/usr/share/speedify"
	ld="$(speedify_loader_path "$r")"
	lib_path="$(speedify_library_path "$r")"
	[ -x "$r/speedify" ] && [ -x "$r/speedify_cli" ] && [ -e "$ld" ] || { echo "Runtime Speedify invalido em $root." >&2; return 3; }
	chmod +x "$r/speedify" "$r/speedify_cli" "$ld" 2>/dev/null || true
	speedify_ensure_tun || return 1
	mkdir -p /lib /lib64 /etc/ark-router/speedify/runtime /etc/ark-router/speedify/keys /tmp/speedify-logs
	rm -f /etc/ark-router/speedify/runtime/*.lastGood* 2>/dev/null || true
	ln -sf /tmp/speedify-lastGoodRead /etc/ark-router/speedify/runtime/settings.txt.lastGoodRead 2>/dev/null || true
	ln -sf /tmp/speedify-lastGoodWrite /etc/ark-router/speedify/runtime/settings.txt.lastGoodWrite 2>/dev/null || true
	case "$(uname -m 2>/dev/null)" in
		x86_64)
			[ -e /lib/x86_64-linux-gnu ] || ln -s "$r/lib/x86_64-linux-gnu" /lib/x86_64-linux-gnu 2>/dev/null || true
			[ -e /lib64/ld-linux-x86-64.so.2 ] || ln -s "$ld" /lib64/ld-linux-x86-64.so.2 2>/dev/null || true
			;;
		aarch64|*)
			[ -e /lib/aarch64-linux-gnu ] || ln -s "$r/lib/aarch64-linux-gnu" /lib/aarch64-linux-gnu 2>/dev/null || true
			[ -e /lib/ld-linux-aarch64.so.1 ] || ln -s "$ld" /lib/ld-linux-aarch64.so.1 2>/dev/null || true
			;;
	esac
	speedify_write_cli_wrapper "$wrapper" "$r"
	speedify_prepare_runtime_network || return 1
	pkill -f '/speedify -d /etc/ark-router/speedify/runtime' 2>/dev/null || true
	pkill -f "$r/speedify" 2>/dev/null || true
	"$ld" --library-path "$lib_path" "$r/speedify" -d /etc/ark-router/speedify/runtime -r "$r" -g /tmp/speedify-logs -k /etc/ark-router/speedify/keys >/tmp/ark-speedify-daemon.log 2>&1 &
	echo $! >/tmp/ark-speedify.pid
	sleep 6
	speedify_prepare_runtime_network >/dev/null 2>&1 || true
	"$wrapper" version >/tmp/ark-speedify-version.log 2>&1 || { cat /tmp/ark-speedify-daemon.log /tmp/ark-speedify-version.log 2>/dev/null >&2; return 1; }
	"$wrapper" streamingbypass domains add api.github.com github.com raw.githubusercontent.com objects.githubusercontent.com >/dev/null 2>&1 || true
	uci -q set equipe_dashboard.speedify=feature
	uci -q set equipe_dashboard.speedify.saved_config='1'
	uci -q set equipe_dashboard.speedify.prepared='1'
	uci commit equipe_dashboard
	return 0
}

speedify_install_external() {
	speedify_supported || { echo 'Arquitetura nao suportada pelo Speedify.' >&2; return 3; }
	command -v wget >/dev/null 2>&1 || { echo 'wget nao encontrado' >&2; return 3; }
	target="${ARK_SPEEDIFY_EXTERNAL_TARGET:-$(speedify_external_target)}"
	[ -n "$target" ] && [ -d "$target" ] || { echo "Armazenamento externo nao encontrado. Monte um pendrive em /mnt/sda1, /mnt/usb ou configure ARK_SPEEDIFY_EXTERNAL_TARGET." >&2; return 3; }
	avail="$(df -k "$target" 2>/dev/null | awk 'NR==2{print $4}')"; [ -n "$avail" ] || avail=0
	need_internal="$(uci -q get equipe_dashboard.speedify.min_internal_kb || printf '%s' "${ARK_SPEEDIFY_INTERNAL_MIN_KB:-22000}")"
	[ "$avail" -ge "$need_internal" ] || { echo "Espaco externo insuficiente em $target." >&2; return 3; }
	root="$target/ark-router/speedify-root"
	pkg="/tmp/ark-speedify-cache/speedify.apk"
	mkdir -p /tmp/ark-speedify-cache "$target/ark-router"
	speedify_fetch_package "$pkg" || return $?
	rm -rf "$root"
	mkdir -p "$root"
	speedify_extract_package "$pkg" "$root" || return 1
	speedify_start_extracted "$root" /etc/ark-router/speedify-cli || return 1
	uci -q set equipe_dashboard.speedify.install_mode='external'
	uci -q set equipe_dashboard.speedify.external_target="$target"
	uci commit equipe_dashboard
	echo "Speedify instalado no armazenamento externo em $root."
	return 0
}

speedify_start_external_saved() {
	target="$(uci -q get equipe_dashboard.speedify.external_target || true)"
	[ -n "$target" ] || target="$(speedify_external_target || true)"
	[ -n "$target" ] || { echo 'Armazenamento externo salvo nao encontrado.' >&2; return 3; }
	root="$target/ark-router/speedify-root"
	speedify_start_extracted "$root" /etc/ark-router/speedify-cli
}

speedify_install_ram() {
	speedify_supported || { echo 'Arquitetura nao suportada pelo Speedify.' >&2; return 3; }
	command -v wget >/dev/null 2>&1 || { echo 'wget nao encontrado' >&2; return 3; }
	tmp_avail="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $4}')"; [ -n "$tmp_avail" ] || tmp_avail=0
	need_ram="${ARK_SPEEDIFY_RAM_MIN_KB:-80000}"
	[ "$tmp_avail" -ge "$need_ram" ] || { echo "RAM /tmp insuficiente para Speedify temporario." >&2; return 3; }
	pkg="/tmp/ark-speedify-cache/speedify.apk"
	root="/tmp/ark-speedify-root"
	mkdir -p /tmp/ark-speedify-cache
	speedify_fetch_package "$pkg" || return $?
	rm -rf "$root"
	mkdir -p "$root"
	speedify_extract_package "$pkg" "$root" || return 1
	rm -rf /tmp/ark-speedify-cache "$pkg" /tmp/ark-speedify-extract.log 2>/dev/null || true
	rm -rf "$root/usr/share/doc" "$root/usr/share/man" "$root/usr/share/locale" 2>/dev/null || true
	speedify_start_extracted "$root" /tmp/ark-speedify-cli || return 1
	uci -q set equipe_dashboard.speedify.install_mode='ram'
	uci commit equipe_dashboard
	echo 'Speedify iniciado em RAM. A config fica salva; com auto recuperacao ligada ele sera recarregado apos reiniciar se houver internet e RAM suficiente.'
	return 0
}

speedify_install_auto_safe() {
	speedify_supported || { echo 'Arquitetura nao suportada pelo Speedify. Requer aarch64 ou x86_64.' >&2; return 3; }
	overlay_avail="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"; [ -n "$overlay_avail" ] || overlay_avail=0
	tmp_avail="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $4}')"; [ -n "$tmp_avail" ] || tmp_avail=0
	need_internal="$(uci -q get equipe_dashboard.speedify.min_internal_kb || printf '%s' "${ARK_SPEEDIFY_INTERNAL_MIN_KB:-22000}")"
	need_ram="${ARK_SPEEDIFY_RAM_MIN_KB:-80000}"
	external_path="$(speedify_external_target || true)"
	if [ "$overlay_avail" -ge "$need_internal" ]; then
		echo "Modo automatico Speedify: usando instalacao interna; livre ${overlay_avail} KB."
		install_speedify_official
	elif [ -n "$external_path" ]; then
		echo "Modo automatico Speedify: usando armazenamento externo em $external_path."
		speedify_install_external
	elif [ "$tmp_avail" -ge "$need_ram" ]; then
		echo "Modo automatico Speedify: usando RAM temporaria; livre ${tmp_avail} KB."
		speedify_install_ram
	else
		echo "Sem espaco suficiente para Speedify. Interno livre: ${overlay_avail} KB, precisa ${need_internal} KB. /tmp livre: ${tmp_avail} KB, precisa ${need_ram} KB. Use armazenamento externo/extroot ou libere espaco." >&2
		return 3
	fi
}

speedify_clean_runtime_network() {
	tunnel_dev="$(speedify_tunnel_device 2>/dev/null || echo connectify0)"
	if uci -q get network.speedify >/dev/null 2>&1; then
		ifdown speedify >/dev/null 2>&1 || true
		uci -q delete network.speedify
		uci commit network
	fi
	for d in $(uci -q show network 2>/dev/null | grep "=device$" | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "network.$d.name" 2>/dev/null)" = "$tunnel_dev" ]; then
			uci -q delete "network.$d"
			uci commit network
		fi
	done
	for z in $(uci -q show firewall 2>/dev/null | grep "=zone$" | cut -d. -f2 | cut -d= -f1); do
		if [ "$(uci -q get "firewall.$z.name" 2>/dev/null)" = "speedify" ]; then
			uci -q delete "firewall.$z"
		fi
	done
	for fwd in $(uci -q show firewall 2>/dev/null | grep "=forwarding$" | cut -d. -f2 | cut -d= -f1); do
		src="$(uci -q get "firewall.$fwd.src" 2>/dev/null)"
		dest="$(uci -q get "firewall.$fwd.dest" 2>/dev/null)"
		if [ "$src" = "speedify" ] || [ "$dest" = "speedify" ]; then
			uci -q delete "firewall.$fwd"
		fi
	done
	uci commit firewall
	/etc/init.d/firewall reload >/dev/null 2>&1 || true
}

speedify_prepare_runtime_network() {
	tunnel_dev="$(speedify_tunnel_device)"
	uci -q set network.speedify=interface
	uci -q set network.speedify.proto=none
	uci -q set network.speedify.defaultroute=0
	uci -q delete network.speedify.dns
	uci -q add_list network.speedify.dns=10.202.0.1
	uci -q set "network.speedify.device=$tunnel_dev"
	if ! uci -q show network 2>/dev/null | grep -q "device.*name='$tunnel_dev'"; then
		uci -q batch <<'EOI'
add network device
set network.@device[-1].acceptlocal=1
EOI
		uci -q set "network.@device[-1].name=$tunnel_dev"
	fi
	if ! uci -q show firewall 2>/dev/null | grep -q "\.name='speedify'"; then
		uci -q batch <<'EOI'
add firewall zone
set firewall.@zone[-1].name=speedify
set firewall.@zone[-1].input=ACCEPT
set firewall.@zone[-1].output=ACCEPT
set firewall.@zone[-1].forward=ACCEPT
add_list firewall.@zone[-1].network=speedify
EOI
	fi
	zone="$(speedify_firewall_zone_section)"
	if [ -n "$zone" ]; then
		speedify_clean_zone_devices
		uci -q set "firewall.$zone.masq=1"
		uci -q set "firewall.$zone.mtu_fix=1"
		uci -q get "firewall.$zone.network" 2>/dev/null | tr ' ' '\n' | grep -qx speedify || uci -q add_list "firewall.$zone.network=speedify"
		uci -q get "firewall.$zone.device" 2>/dev/null | tr ' ' '\n' | grep -qx "$tunnel_dev" || uci -q add_list "firewall.$zone.device=$tunnel_dev"
	fi
	if ! speedify_firewall_forwarding_exists speedify lan; then
		uci -q add firewall forwarding
		uci -q set firewall.@forwarding[-1].src=speedify
		uci -q set firewall.@forwarding[-1].dest=lan
	fi
	if ! speedify_firewall_forwarding_exists lan speedify; then
		uci -q add firewall forwarding
		uci -q set firewall.@forwarding[-1].src=lan
		uci -q set firewall.@forwarding[-1].dest=speedify
	fi
	uci commit network
	uci commit firewall
	/etc/init.d/firewall reload >/dev/null 2>&1 || true
	/etc/init.d/network reload >/dev/null 2>&1 || true
	return 0
}

speedify_auto_prepare_wan2() {
	[ -n "$(uci -q get network.wan2.proto)" ] && return 0
	[ -e /sys/class/net/lan1 ] || { echo 'WAN2 nao configurada e porta LAN1 nao encontrada.' >&2; return 3; }
	count="$(lan_bridge_port_count)"
	[ "$count" -ge 3 ] || { echo 'WAN2 nao configurada. Este roteador nao tem portas LAN sobrando suficientes para converter LAN1 automaticamente.' >&2; return 3; }
	remove_lan_port lan1
	uci -q set network.wan2=interface
	uci -q set network.wan2.device=lan1
	uci -q set network.wan2.proto=dhcp
	uci -q set network.wan2.metric="${ARK_SPEEDIFY_WAN2_METRIC:-20}"
	uci -q set network.wan2.peerdns=0
	uci -q add_list network.wan2.dns='1.1.1.1'
	uci -q add_list network.wan2.dns='8.8.8.8'
	uci -q set network.wan2.delegate=0
	uci -q set network.wan2.ipv6=0
	echo 'WAN2 criada automaticamente na porta LAN1 por DHCP.' >&2
	return 0
}

speedify_prepare_wans() {
	speedify_supported || { echo 'Este roteador nao esta em arquitetura Speedify suportada.' >&2; return 3; }
	[ -n "$(uci -q get network.wan.proto)" ] || { echo 'WAN1 nao configurada.' >&2; return 3; }
	ez_backup >/dev/null || { echo 'Falha ao criar backup antes da preparacao Speedify.' >&2; return 3; }
	# As portas e interfaces WAN adicionais sao criadas pelo usuario.
	# O ARK apenas detecta as interfaces existentes (WAN1..WAN4) e as prepara.
	wan_count=0
	wan_index=0
	for iface in wan wan2 wan3 wan4; do
		proto="$(uci -q get "network.$iface.proto" || true)"
		case "$proto" in
			dhcp|pppoe|static|qmi|qmi-sh|dhcpv6|wwan)
				wan_index=$((wan_index + 1))
				cur_m="$(uci -q get "network.$iface.metric" || true)"
				if [ -n "$cur_m" ] && [ "$cur_m" -ge 1 ] 2>/dev/null; then
					metric="$cur_m"
				else
					metric=$((wan_index * 10))
					uci -q set "network.$iface.metric=$metric"
				fi
				uci -q set "network.$iface.ip6metric=$metric"
				uci -q set "network.$iface.delegate=0"
				cur_ipv6="$(uci -q get "network.$iface.ipv6" || true)"
				if [ -z "$cur_ipv6" ]; then
					uci -q set "network.$iface.ipv6=0"
				fi
				wan_count=$((wan_count + 1))
				;;
			*) ;;
		esac
	done
	[ "$wan_count" -ge 1 ] || { echo 'Nenhuma WAN valida encontrada.' >&2; return 3; }
	zone="$(firewall_wan_zone_section)"
	if [ -n "$zone" ]; then
		for iface in wan wan2 wan3 wan4; do
			proto="$(uci -q get "network.$iface.proto" || true)"
			case "$proto" in
				dhcp|pppoe|static|qmi|qmi-sh|dhcpv6|wwan) firewall_zone_has_network "$zone" "$iface" || uci -q add_list "firewall.$zone.network=$iface" ;;
			esac
		done
		uci commit firewall
	fi
	uci commit network
	uci -q set equipe_dashboard.speedify=feature
	uci -q set equipe_dashboard.speedify.prepared=1
	uci -q set equipe_dashboard.speedify.mode='optional'
	uci commit equipe_dashboard
	( sleep 1; /etc/init.d/network reload >/dev/null 2>&1 || true; /etc/init.d/firewall reload >/dev/null 2>&1 || true ) >/dev/null 2>&1 &
	echo "prepared:$wan_count"
}

speedify_status_json() {
	cli="$(speedify_cli_path)"
	runtime=false; speedify_runtime_running && runtime=true
	present=false; ([ -x "$cli" ] || installed speedify) && present=true
	luci=false; installed luci-app-speedify && luci=true
	supported=false; speedify_supported && supported=true
	prepared="$(uci -q get equipe_dashboard.speedify.prepared || printf 0)"
	mode="$(speedify_detected_install_mode)"
	if [ "$mode" = "internal" ] && [ "$(uci -q get equipe_dashboard.speedify.install_mode)" != "internal" ]; then
		uci -q set equipe_dashboard.speedify.install_mode='internal'
		uci commit equipe_dashboard
	fi
	saved="$(uci -q get equipe_dashboard.speedify.saved_config || printf 0)"
	autostart="$(uci -q get equipe_dashboard.speedify.autostart || printf 0)"
	desired="$(uci -q get equipe_dashboard.speedify.desired_state || printf manual)"
	bonding_mode="$(uci -q get equipe_dashboard.speedify.bonding_mode || printf speed)"
	last_autostart="$(cat /tmp/ark-speedify-autostart.status 2>/dev/null || true)"
	state="$(speedify_state_value)"
	version=''; $runtime && [ -n "$cli" ] && version="$("$cli" -s version 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' || true)"
	adapters=''; $runtime && [ -n "$cli" ] && adapters="$("$cli" -s show adapters 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' || true)"
	settings=''; $runtime && [ -n "$cli" ] && settings="$("$cli" -s show settings 2>/dev/null || true)"
	runtime_mode="$(printf '%s' "$settings" | jsonfilter -e '@.bondingMode' 2>/dev/null || true)"
	[ -n "$runtime_mode" ] || runtime_mode="$bonding_mode"
	tunnel_ip="$(ip -4 addr show connectify0 2>/dev/null | awk '/inet /{print $2; exit}' | cut -d/ -f1)"
	user_email=''; user_masked=''; licensed=false; logged=false
	if $runtime && [ -n "$cli" ]; then
		user_out="$("$cli" show user 2>/dev/null || true)"
		user_email="$(printf '%s' "$user_out" | jsonfilter -e '@.email' 2>/dev/null || true)"
		bytes_available="$(printf '%s' "$user_out" | jsonfilter -e '@.bytesAvailable' 2>/dev/null || true)"
		[ -n "$user_email" ] && { logged=true; user_masked="$(speedify_mask_email "$user_email")"; }
		[ "$bytes_available" = -1 ] && licensed=true
	fi
	printf '{"installed":%s,"runtime_running":%s,"luci":%s,"supported":%s,"prepared":%s,"state":"%s","cli":"%s","version_raw":"%s","adapters_raw":"%s","wan_metric":"%s","wan2_metric":"%s","install_mode":"%s","saved_config":%s,"autostart":%s,"desired_state":"%s","bonding_mode":"%s","runtime_mode":"%s","tunnel_ip":"%s","last_autostart":"%s","account_logged_in":%s,"account_licensed":%s,"account_email_masked":"%s",' \
		"$present" "$runtime" "$luci" "$supported" "$(bool "$prepared")" "$(json_escape "$state")" "$(json_escape "$cli")" "$(json_escape "$version")" "$(json_escape "$adapters")" "$(json_escape "$(uci -q get network.wan.metric || true)")" "$(json_escape "$(uci -q get network.wan2.metric || true)")" "$(json_escape "$mode")" "$(bool "$saved")" "$(bool "$autostart")" "$(json_escape "$desired")" "$(json_escape "$bonding_mode")" "$(json_escape "$runtime_mode")" "$(json_escape "$tunnel_ip")" "$(json_escape "$last_autostart")" "$logged" "$licensed" "$(json_escape "$user_masked")"
	speedify_storage_json
	printf '}\n'
}

speedify_cli_action() {
	cli="$(speedify_cli_path)"
	[ -n "$cli" ] || { echo 'Speedify CLI nao encontrado. Instale e faca login no Speedify primeiro.' >&2; return 3; }
	case "$1" in
		connect) speedify_safe_connect "$cli" ;;
		disconnect) speedify_safe_disconnect "$cli" ;;
		mode-speed) "$cli" mode speed; rc=$?; [ "$rc" -eq 0 ] && { uci -q set equipe_dashboard.speedify=feature; uci -q set equipe_dashboard.speedify.bonding_mode='speed'; uci commit equipe_dashboard; }; return "$rc" ;;
		mode-streaming) "$cli" mode streaming; rc=$?; [ "$rc" -eq 0 ] && { uci -q set equipe_dashboard.speedify=feature; uci -q set equipe_dashboard.speedify.bonding_mode='streaming'; uci commit equipe_dashboard; }; return "$rc" ;;
		mode-redundant) "$cli" mode redundant; rc=$?; [ "$rc" -eq 0 ] && { uci -q set equipe_dashboard.speedify=feature; uci -q set equipe_dashboard.speedify.bonding_mode='redundant'; uci commit equipe_dashboard; }; return "$rc" ;;
		router-role) "$cli" devicerole router ;;
		*) echo 'Acao Speedify invalida' >&2; return 2 ;;
	esac
}

speedify_wait_tunnel() {
	dev="$(speedify_tunnel_device)"
	for _wait in 1 2 3 4 5 6 7 8 9 10; do
		ip link show "$dev" >/dev/null 2>&1 && ip -4 addr show "$dev" | grep -q 'inet ' && return 0
		sleep 2
	done
	return 1
}

speedify_route_ok() {
	dev="$(speedify_tunnel_device)"
	[ -n "$dev" ] || return 1
	ip -4 route get 1.1.1.1 2>/dev/null | grep -q "dev $dev" || return 1
	ping -c 1 -W 3 -I "$dev" 1.1.1.1 >/dev/null 2>&1 || ping -c 1 -W 3 -I "$dev" 8.8.8.8 >/dev/null 2>&1
}

speedify_wait_route() {
	# O endereco do tunel costuma aparecer antes da rota padrao e do DNS.
	for _route_wait in 1 2 3 4 5 6 7 8 9 10; do
		speedify_route_ok && return 0
		sleep 2
	done
	return 1
}

mwan3_service_running() {
	pgrep -f mwan3rtmon >/dev/null 2>&1 || pgrep -f mwan3track >/dev/null 2>&1
}

speedify_pause_mwan3() {
	[ -x /etc/init.d/mwan3 ] || return 0
	if [ "$(uci -q get equipe_dashboard.speedify.mwan3_state_saved || printf 0)" != 1 ]; then
		if mwan3_service_running; then previous=1; else previous=0; fi
		uci -q set equipe_dashboard.speedify.mwan3_previous="$previous"
		uci -q set equipe_dashboard.speedify.mwan3_state_saved=1
		uci -q commit equipe_dashboard
	fi
	/etc/init.d/mwan3 stop >/dev/null 2>&1 || true
}

speedify_restore_mwan3() {
	[ -x /etc/init.d/mwan3 ] || return 0
	saved="$(uci -q get equipe_dashboard.speedify.mwan3_state_saved || printf 0)"
	previous="$(uci -q get equipe_dashboard.speedify.mwan3_previous || printf 0)"
	[ "$saved" = 1 ] || return 0
	if [ "$previous" = 1 ]; then /etc/init.d/mwan3 restart >/dev/null 2>&1 || true
	else /etc/init.d/mwan3 stop >/dev/null 2>&1 || true
	fi
	uci -q set equipe_dashboard.speedify.mwan3_state_saved=0
	uci -q commit equipe_dashboard
}

speedify_configure_downstream_subnets() {
	cli="$1"
	args=""
	for iface in lan guest; do
		status="$(ubus call "network.interface.$iface" status 2>/dev/null || true)"
		ip="$(printf '%s' "$status" | jsonfilter -e '@["ipv4-address"][0].address' 2>/dev/null || true)"
		mask="$(printf '%s' "$status" | jsonfilter -e '@["ipv4-address"][0].mask' 2>/dev/null || true)"
		[ -n "$ip" ] && [ -n "$mask" ] || continue
		net="$(ipcalc.sh "$ip" "$mask" 2>/dev/null | sed -n 's/^NETWORK=//p')"
		prefix="$(ipcalc.sh "$ip" "$mask" 2>/dev/null | sed -n 's/^PREFIX=//p')"
		[ -n "$net" ] && [ -n "$prefix" ] && args="$args ${net}/${prefix}"
	done
	[ -n "$args" ] && "$cli" subnets $args >/dev/null 2>&1 || true
}

speedify_safe_connect() {
	cli="$1"
	[ -n "$cli" ] || return 3
	speedify_pause_mwan3
	# Reaplica a rede virtual e as permissões antes de cada ativação.
	speedify_prepare_runtime_network || { rc=$?; speedify_restore_mwan3; return "$rc"; }
	"$cli" devicerole router >/dev/null 2>&1 || true
	speedify_configure_downstream_subnets "$cli"
	"$cli" route default on >/dev/null 2>&1 || true
	"$cli" mode "$(uci -q get equipe_dashboard.speedify.bonding_mode || printf speed)" >/dev/null 2>&1 || true
	"$cli" connect >/tmp/ark-speedify-connect.log 2>&1 || { rc=$?; speedify_restore_mwan3; return "$rc"; }
	if ! speedify_wait_tunnel || ! speedify_wait_route; then
		echo 'Speedify conectado sem rota de Internet verificavel; revertendo para WAN normal.' >&2
		speedify_safe_disconnect "$cli"
		return 4
	fi
	uci -q set equipe_dashboard.speedify=feature
	uci -q set equipe_dashboard.speedify.desired_state='connected'
	uci -q commit equipe_dashboard
	speedify_watchdog >/tmp/ark-speedify-watchdog.log 2>&1 &
	return 0
}

speedify_watchdog() {
	# Monitora a primeira janela apos a troca de rota; em falha, faz rollback.
	cli="$(speedify_cli_path)"
	fails=0
	for _watch in 1 2 3 4 5 6 7 8 9 10 11 12; do
		[ "$(uci -q get equipe_dashboard.speedify.desired_state || true)" = connected ] || return 0
		if speedify_wait_tunnel && speedify_route_ok; then
			fails=0
		else
			fails=$((fails + 1))
		fi
		[ "$fails" -ge 3 ] || { sleep 5; continue; }
		echo 'Watchdog: tunel Speedify sem saida; restaurando WAN normal.'
		speedify_safe_disconnect "$cli"
		return 1
	done
}

speedify_safe_disconnect() {
	cli="$1"
	if [ -n "$cli" ] && speedify_runtime_running; then
		ark_run_limited 5 "$cli" disconnect >/dev/null 2>&1 || true
		ark_run_limited 5 "$cli" route default off >/dev/null 2>&1 || true
	fi
	speedify_clean_runtime_network
	# Reativa somente as WANs que o usuario ja configurou; nenhuma LAN e convertida.
	for iface in wan wan2 wan3 wan4; do
		proto="$(uci -q get "network.$iface.proto" || true)"
		case "$proto" in
			dhcp|pppoe|static|qmi|qmi-sh|dhcpv6|wwan) ifup "$iface" >/dev/null 2>&1 || true ;;
		esac
	done
	speedify_restore_mwan3
	uci -q set equipe_dashboard.speedify=feature
	uci -q set equipe_dashboard.speedify.desired_state='disconnected'
	uci -q commit equipe_dashboard
	return 0
}

speedify_stop_runtime() {
	cli="$1"
	if [ -n "$cli" ] && speedify_runtime_running; then
		speedify_safe_disconnect "$cli"
	else
		speedify_clean_runtime_network
		speedify_restore_mwan3
	fi
	# Garante exclusao no procd para evitar respawn automatico
	ubus call service delete '{"name":"speedify"}' >/dev/null 2>&1 || true
	ubus call service delete '{"name":"sfy-ws-auth"}' >/dev/null 2>&1 || true
	# O ARK controla o boot para o daemon nao consumir RAM quando inativo.
	if [ -x /etc/init.d/speedify ]; then
		/etc/init.d/speedify stop >/dev/null 2>&1 || true
		/etc/init.d/speedify disable >/dev/null 2>&1 || true
	fi
	if [ -x /etc/init.d/sfy-ws-auth ]; then
		/etc/init.d/sfy-ws-auth stop >/dev/null 2>&1 || true
		/etc/init.d/sfy-ws-auth disable >/dev/null 2>&1 || true
	fi
	rm -f /etc/rc.d/S*speedify /etc/rc.d/K*speedify /etc/rc.d/S*sfy-ws-auth /etc/rc.d/K*sfy-ws-auth 2>/dev/null || true
	pid="$(cat /tmp/ark-speedify.pid 2>/dev/null || true)"
	[ -n "$pid" ] && kill -9 "$pid" >/dev/null 2>&1 || true
	pkill -9 -f 'speedify' >/dev/null 2>&1 || true
	pkill -9 -f 'sfy-ws-auth' >/dev/null 2>&1 || true
	killall -9 speedify 2>/dev/null || true
	rm -f /tmp/ark-speedify.pid
	return 0
}

speedify_start_ui_helper() {
	installed luci-app-speedify || return 0
	[ -x /etc/init.d/sfy-ws-auth ] && /etc/init.d/sfy-ws-auth start >/dev/null 2>&1 || true
	return 0
}

speedify_adapter_valid() { printf '%s' "$1" | grep -Eq '^[A-Za-z0-9_.:-]{1,32}$'; }

speedify_mask_email() {
	email="$1"
	case "$email" in
		*@*)
			localpart="${email%@*}"; domain="${email#*@}"
			first="$(printf '%s' "$localpart" | cut -c1)"
			printf '%s***@%s' "$first" "$domain"
			;;
		*) printf '%s' "$email" ;;
	esac
}

speedify_pairing_json() {
	cli="$(speedify_cli_path)"
	[ -n "$cli" ] || { echo 'Speedify CLI nao encontrado. Inicie o Speedify primeiro.' >&2; return 3; }
	out="$("$cli" activationcode 2>/tmp/ark-speedify-activation.log)" || { cat /tmp/ark-speedify-activation.log >&2; return 1; }
	code="$(printf '%s' "$out" | jsonfilter -e '@.activationCode' 2>/dev/null || true)"
	url="$(printf '%s' "$out" | jsonfilter -e '@.activationUrl' 2>/dev/null || true)"
	[ -n "$url" ] || { echo 'Speedify nao retornou URL de ativacao.' >&2; return 1; }
	printf '{"activationCode":"%s","activationUrl":"%s"}\n' "$(json_escape "$code")" "$(json_escape "$url")"
}

speedify_user_json() {
	cli="$(speedify_cli_path)"
	[ -n "$cli" ] || { echo 'Speedify CLI nao encontrado. Inicie o Speedify primeiro.' >&2; return 3; }
	out="$("$cli" show user 2>/tmp/ark-speedify-user.log)" || { cat /tmp/ark-speedify-user.log >&2; return 1; }
	email="$(printf '%s' "$out" | jsonfilter -e '@.email' 2>/dev/null || true)"
	bytes_available="$(printf '%s' "$out" | jsonfilter -e '@.bytesAvailable' 2>/dev/null || true)"
	payment="$(printf '%s' "$out" | jsonfilter -e '@.paymentType' 2>/dev/null || true)"
	is_team="$(printf '%s' "$out" | jsonfilter -e '@.isTeam' 2>/dev/null || true)"
	logged=false; [ -n "$email" ] && logged=true
	licensed=false; [ "$bytes_available" = -1 ] && licensed=true
	printf '{"logged_in":%s,"licensed":%s,"email":"%s","email_masked":"%s","bytesAvailable":"%s","paymentType":"%s","isTeam":"%s"}\n' \
		"$logged" "$licensed" "$(json_escape "$email")" "$(json_escape "$(speedify_mask_email "$email")")" "$(json_escape "$bytes_available")" "$(json_escape "$payment")" "$(json_escape "$is_team")"
}

speedify_autostart_set() {
	case "$1" in 1|on|true|enabled) value=1 ;; 0|off|false|disabled) value=0 ;; *) echo 'Valor invalido para auto recuperacao Speedify' >&2; return 2 ;; esac
	uci -q set equipe_dashboard.speedify=feature
	uci -q set equipe_dashboard.speedify.autostart="$value"
	uci commit equipe_dashboard
	if [ -x /etc/init.d/ark-speedify ]; then
		[ "$value" = 1 ] && /etc/init.d/ark-speedify enable >/dev/null 2>&1 || /etc/init.d/ark-speedify disable >/dev/null 2>&1
	fi
	# O init oficial fica desabilitado; ark-speedify respeita o estado salvo.
	[ -x /etc/init.d/speedify ] && /etc/init.d/speedify disable >/dev/null 2>&1 || true
	[ -x /etc/init.d/sfy-ws-auth ] && /etc/init.d/sfy-ws-auth disable >/dev/null 2>&1 || true
	echo "$value"
}

speedify_recover_runtime() {
	speedify_supported || { echo unsupported >/tmp/ark-speedify-autostart.status; return 1; }
	echo running >/tmp/ark-speedify-autostart.status
	ping -c 1 -W 1 1.1.1.1 >/dev/null 2>&1 || ping -c 1 -W 1 8.8.8.8 >/dev/null 2>&1 || true
	cli="$(speedify_cli_path)"
	if [ -n "$cli" ] && "$cli" version >/dev/null 2>&1; then
		echo already-running >/tmp/ark-speedify-autostart.status
	else
		# Pacote interno presente sempre vence metadados antigos como "ram".
		# Isso preserva o login oficial depois de upgrades ou troca de perfil.
		if [ -x /etc/init.d/speedify ] && [ -x /usr/share/speedify/speedify ]; then
			mode=internal
			uci -q set equipe_dashboard.speedify.install_mode='internal'
			uci commit equipe_dashboard
		else
			mode="$(uci -q get equipe_dashboard.speedify.install_mode || printf ram)"
		fi
		case "$mode" in
			external) speedify_start_external_saved || { echo external-failed >/tmp/ark-speedify-autostart.status; return 1; } ;;
			internal|auto) [ -x /etc/init.d/speedify ] && /etc/init.d/speedify start >/dev/null 2>&1 || { echo internal-service-missing >/tmp/ark-speedify-autostart.status; return 1; } ;;
			ram|*) speedify_install_ram || { echo ram-failed >/tmp/ark-speedify-autostart.status; return 1; } ;;
		esac
	fi
	[ -x /etc/init.d/speedify ] && /etc/init.d/speedify disable >/dev/null 2>&1 || true
	speedify_start_ui_helper
	echo ok >/tmp/ark-speedify-autostart.status
	return 0
}

speedify_power_set() {
	if ark_is_satellite_or_ap; then
		echo "O Speedify atua no agrupamento de links de operadora e deve ser executado exclusivamente no Roteador Mestre." >&2
		return 2
	fi
	case "$1" in 1|on|true|enabled) value=1 ;; 0|off|false|disabled) value=0 ;; *) echo 'Valor invalido para Speedify' >&2; return 2 ;; esac
	if [ "$value" = 1 ]; then
		uci -q set equipe_dashboard.speedify=feature
		uci -q set equipe_dashboard.speedify.desired_state='connected'
		uci commit equipe_dashboard
		(
			if speedify_recover_runtime; then
				cli="$(speedify_cli_path)"
				user_out="$("$cli" show user 2>/dev/null || true)"
				bytes_avail="$(printf '%s' "$user_out" | jsonfilter -e '@.bytesAvailable' 2>/dev/null || true)"
				user_email="$(printf '%s' "$user_out" | jsonfilter -e '@.email' 2>/dev/null || true)"
				if [ -n "$user_email" ] || [ "$bytes_avail" = "-1" ]; then
					if speedify_cli_action connect; then
						echo connected
					else
						echo 'speedify-connect-pending' >&2
					fi
				else
					echo 'speedify-standby-awaiting-login' >&2
				fi
			else
				uci -q set equipe_dashboard.speedify.desired_state='disconnected'
				uci commit equipe_dashboard
				echo 'speedify-runtime-failed' >&2
			fi
		) >/tmp/ark-speedify-power-on.log 2>&1 &
		echo starting
		return 0
	else
		uci -q set equipe_dashboard.speedify=feature
		uci -q set equipe_dashboard.speedify.desired_state='disconnected'
		uci commit equipe_dashboard
		speedify_stop_runtime "$(speedify_cli_path)"
		echo stopped
		return 0
	fi
}

speedify_autostart_run() {
	[ "$(uci -q get equipe_dashboard.speedify.autostart || printf 0)" = 1 ] || { echo disabled >/tmp/ark-speedify-autostart.status; return 0; }
	[ "$(uci -q get equipe_dashboard.speedify.desired_state || true)" = connected ] || { echo inactive >/tmp/ark-speedify-autostart.status; return 0; }
	speedify_recover_runtime || return $?
	speedify_cli_action connect >/tmp/ark-speedify-autoconnect.log 2>&1 || true
	return 0
}

speedify_cli_path() {
	if [ -x /usr/share/speedify/speedify_cli ]; then printf /usr/share/speedify/speedify_cli; return 0; fi
	if [ -x /etc/ark-router/speedify-cli ]; then printf /etc/ark-router/speedify-cli; return 0; fi
	if [ -x /tmp/ark-speedify-cli ]; then printf /tmp/ark-speedify-cli; return 0; fi
	p="$(which speedify_cli 2>/dev/null || which speedify 2>/dev/null || true)"
	if [ -n "$p" ] && [ -x "$p" ]; then printf '%s' "$p"; return 0; fi
}

speedify_runtime_running() { pgrep -f '/speedify -d' >/dev/null 2>&1 || pgrep -x 'speedify' >/dev/null 2>&1; }

speedify_supported() {
	if ark_is_satellite_or_ap; then
		return 1
	fi
	case "$(uname -m 2>/dev/null)" in
		aarch64|x86_64) ;;
		*) return 1 ;;
	esac
	local mem_kb="$(awk '/MemTotal:/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
	[ "$mem_kb" -ge 160000 ] || return 1
	return 0
}

speedify_external_target() {
	need="$(uci -q get equipe_dashboard.speedify.min_internal_kb || printf '%s' "${ARK_SPEEDIFY_INTERNAL_MIN_KB:-22000}")"
	for mp in /opt /mnt/sda1 /mnt/usb /mnt/sdb1 /mnt/mmcblk0p1; do
		[ -d "$mp" ] || continue
		[ "$mp" = /overlay ] && continue
		avail="$(df -k "$mp" 2>/dev/null | awk 'NR==2{print $4}')"
		[ -n "$avail" ] && [ "$avail" -ge "$need" ] && { printf '%s' "$mp"; return 0; }
	done
	return 1
}

speedify_storage_json() {
	overlay_avail="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"
	overlay_total="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $2}')"
	tmp_avail="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $4}')"
	tmp_total="$(df -k /tmp 2>/dev/null | awk 'NR==2{print $2}')"
	[ -n "$overlay_avail" ] || overlay_avail=0; [ -n "$overlay_total" ] || overlay_total=0
	[ -n "$tmp_avail" ] || tmp_avail=0; [ -n "$tmp_total" ] || tmp_total=0
	need_internal="$(uci -q get equipe_dashboard.speedify.min_internal_kb || printf '%s' "${ARK_SPEEDIFY_INTERNAL_MIN_KB:-22000}")"
	need_ram="${ARK_SPEEDIFY_RAM_MIN_KB:-80000}"
	internal=false; [ "$overlay_avail" -ge "$need_internal" ] && internal=true
	ram=false; [ "$tmp_avail" -ge "$need_ram" ] && ram=true
	external=false
	external_path="$(speedify_external_target || true)"
	[ -n "$external_path" ] && external=true
	recommend=none
	$internal && recommend=internal
	[ "$recommend" = none ] && $external && recommend=external
	[ "$recommend" = none ] && $ram && recommend=ram
	printf '"storage":{"overlay_avail_kb":%s,"overlay_total_kb":%s,"tmp_avail_kb":%s,"tmp_total_kb":%s,"need_internal_kb":%s,"need_ram_kb":%s,"internal_ok":%s,"external_ok":%s,"ram_ok":%s,"recommended":"%s","external_path":"%s"}' \
		"$overlay_avail" "$overlay_total" "$tmp_avail" "$tmp_total" "$need_internal" "$need_ram" "$internal" "$external" "$ram" "$recommend" "$(json_escape "$external_path")"
}

speedify_state_value() {
	speedify_runtime_running || { printf STOPPED; return 0; }
	cli="$(speedify_cli_path)"
	[ -n "$cli" ] || { printf unavailable; return 0; }
	out="$("$cli" -s state 2>/dev/null || true)"
	state="$(printf '%s' "$out" | jsonfilter -e '@.state' 2>/dev/null || true)"
	[ -n "$state" ] && printf '%s' "$state" || printf unknown
}

speedify_uninstall() {
	# 1. Parar daemons, watchdog e conexoes
	cli="$(speedify_cli_path)"
	speedify_stop_runtime "$cli"
	if [ -x /etc/init.d/ark-speedify ]; then
		/etc/init.d/ark-speedify stop >/dev/null 2>&1 || true
		/etc/init.d/ark-speedify disable >/dev/null 2>&1 || true
	fi

	# 2. Desinstalar pacotes oficiais do gerenciador (opkg/apk)
	if command -v opkg >/dev/null 2>&1; then
		opkg remove --autoremove luci-app-speedify speedify >/dev/null 2>&1 || true
		opkg remove speedify >/dev/null 2>&1 || true
		opkg remove luci-app-speedify >/dev/null 2>&1 || true
	elif command -v apk >/dev/null 2>&1; then
		apk del luci-app-speedify speedify >/dev/null 2>&1 || true
	fi

	# 3. Remover runtime externo se configurado
	ext_target="$(uci -q get equipe_dashboard.speedify.external_target || true)"
	[ -n "$ext_target" ] && rm -rf "$ext_target/ark-router/speedify-root" 2>/dev/null || true

	# 4. Remover diretorios, binarios e arquivos de configuracao
	rm -rf /usr/share/speedify
	rm -rf /etc/speedify
	rm -rf /etc/ark-router/speedify
	rm -f /etc/ark-router/speedify-cli
	rm -rf /tmp/ark-speedify* /tmp/speedify*
	rm -f /usr/bin/speedify /usr/bin/speedify_cli
	rm -f /etc/init.d/speedify /etc/init.d/sfy-ws-auth
	rm -f /etc/rc.d/*speedify* /etc/rc.d/*sfy-ws-auth*
	[ -L /lib/aarch64-linux-gnu ] && rm -f /lib/aarch64-linux-gnu
	[ -L /lib/ld-linux-aarch64.so.1 ] && rm -f /lib/ld-linux-aarch64.so.1
	[ -L /lib/x86_64-linux-gnu ] && rm -f /lib/x86_64-linux-gnu
	[ -L /lib64/ld-linux-x86-64.so.2 ] && rm -f /lib64/ld-linux-x86-64.so.2

	# 5. Restaurar rede e firewall para WAN normal
	speedify_clean_runtime_network
	speedify_restore_mwan3

	# 6. Limpar secao UCI do Speedify
	uci -q delete equipe_dashboard.speedify
	uci commit equipe_dashboard

	# 7. Limpar caches do LuCI e reiniciar daemons web em segundo plano para nao derrubar a resposta RPC
	(
		sleep 2
		rm -f /tmp/luci-indexcache
		rm -rf /tmp/luci-modulecache/*
		[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart
		[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart
	) >/dev/null 2>&1 &

	echo uninstalled
	return 0
}



handle_speedify() {
	action="$1"
	[ -n "$action" ] || { echo "Uso: $0 <comando> [args...]" >&2; exit 1; }
	case "$action" in
	speedify-bypass-service)
		[ -n "$2" ] || { echo 'Servico invalido' >&2; exit 2; }
		case "$3" in on|off) ;; *) echo 'Estado Bypass invalido' >&2; exit 2 ;; esac
		printf '%s' "$2" | grep -Eq '^[A-Za-z0-9 .+&-]{1,80}$' || { echo 'Nome de servico invalido' >&2; exit 2; }
		cli="$(speedify_cli_path)"
		[ -n "$cli" ] && [ -x "$cli" ] || { echo 'Speedify indisponivel' >&2; exit 3; }
		"$cli" streamingbypass service "$2" "$3" >/dev/null 2>&1 || { echo 'Falha ao alterar Bypass' >&2; exit 3; }
		echo ok
		;;
	speedify-bypass-master)
		case "$2" in on|off) ;; *) echo 'Estado mestre Bypass invalido' >&2; exit 2 ;; esac
		cli="$(speedify_cli_path)"
		[ -n "$cli" ] && [ -x "$cli" ] || { echo 'Speedify indisponivel' >&2; exit 3; }
		if [ "$2" = on ]; then action=enable; else action=disable; fi
		"$cli" streamingbypass service "$action" >/dev/null 2>&1 || "$cli" streamingbypass "$2" >/dev/null 2>&1 || true
		echo ok
		;;
	speedify-adapter-priority)
		speedify_adapter_valid "$2" || { echo 'Adaptador invalido' >&2; exit 2; }
		case "$3" in automatic|always|secondary|backup|never) ;; *) echo 'Prioridade invalida' >&2; exit 2 ;; esac
		"$(speedify_cli_path)" adapter priority "$2" "$3" >/dev/null 2>&1 || { echo 'Falha ao salvar prioridade' >&2; exit 3; }
		echo ok
		;;
	speedify-adapter-rate)
		speedify_adapter_valid "$2" || { echo 'Adaptador invalido' >&2; exit 2; }
		for rate in "$3" "$4"; do case "$rate" in unlimited|[0-9]*) ;; *) echo 'Limite invalido' >&2; exit 2 ;; esac; done
		"$(speedify_cli_path)" adapter ratelimit "$2" "$3" "$4" >/dev/null 2>&1 || { echo 'Falha ao salvar limite' >&2; exit 3; }
		echo ok
		;;
	speedify-status)
		speedify_status_json
		;;
	rpc-disconnect-test)
		if [ -x /usr/sbin/ark-probe-disconnect ]; then
			exec /usr/sbin/ark-probe-disconnect client "${2:-}" "${3:-9999}" "${4:-30}"
		else
			echo 'Testador ark-probe-disconnect nao encontrado' >&2; exit 1
		fi
		;;
	speedify-install)
		status="/tmp/equipe-dashboard-install-speedify.status"; log="/tmp/equipe-dashboard-install-speedify.log"
		[ "$(cat "$status" 2>/dev/null)" != running ] || { echo running; exit 0; }
		echo running >"$status"
		( speedify_install_auto_safe; if [ $? -eq 0 ]; then echo done >"$status"; else echo error >"$status"; fi ) >"$log" 2>&1 &
		echo started
		;;
	speedify-install-mode)
		mode="$2"
		case "$mode" in internal|external|ram) ;; *) echo 'Modo Speedify invalido' >&2; exit 2 ;; esac
		status="/tmp/equipe-dashboard-install-speedify.status"; log="/tmp/equipe-dashboard-install-speedify.log"
		[ "$(cat "$status" 2>/dev/null)" != running ] || { echo running; exit 0; }
		echo running >"$status"
		(
			case "$mode" in
				internal) install_speedify_official ;;
				external) speedify_install_external ;;
				ram) speedify_install_ram ;;
			esac
			if [ $? -eq 0 ]; then echo done >"$status"; else echo error >"$status"; fi
		) >"$log" 2>&1 &
		echo started
		;;
	speedify-save-config)
		speedify_save_config
		;;
	speedify-prepare)
		speedify_prepare_wans
		;;
	speedify-autostart)
		speedify_autostart_set "$2"
		;;
	speedify-power)
		speedify_power_set "$2"
		;;
	speedify-uninstall)
		speedify_uninstall
		;;
	speedify-autostart-run)
		speedify_autostart_run
		;;
	speedify-pairing)
		speedify_pairing_json
		;;
	speedify-user)
		speedify_user_json
		;;
	speedify)
		speedify_cli_action "$2"
		;;

	*)
		echo "Acao Speedify desconhecida: $action" >&2
		exit 1
		;;
	esac
}

if [ "$(basename "$0")" = "speedify.sh" ]; then
	handle_speedify "$@"
fi
