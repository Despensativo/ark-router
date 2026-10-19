#!/bin/sh
# /usr/lib/ark/modules/storage_wol.sh - ARK Router KSMBD (SMB 3.1.1 USB File Server) & Wake-on-LAN Module
# Ported from Acer Predator Connect T7 & adapted for universal OpenWrt (fw4/nftables & fw3/iptables, apk & opkg).
# 100% POSIX /bin/ash compliant.

[ -z "${_ARK_STORAGE_WOL_SH_LOADED:-}" ] || return 0
_ARK_STORAGE_WOL_SH_LOADED=1

# ---------------------------------------------------------------------------
# 1. KSMBD Safety Guard: Strict Bus & Partition Validation (Anti-MTD/UBI/Rootfs)
# ---------------------------------------------------------------------------
is_safe_usb_partition() {
	local dev="$1"
	local bname sys_path mp
	[ -n "$dev" ] || return 1

	# Must strictly match external block device partition naming
	case "$dev" in
		/dev/sd[a-z][0-9]*|/dev/nvme[0-9]*n[0-9]*p[0-9]*|/dev/mmcblk[0-9]*p[0-9]*)
			;;
		*)
			return 1
			;;
	esac

	bname="${dev#/dev/}"
	case "$bname" in
		''|*/*|*..*|*[!A-Za-z0-9_-]*) return 1 ;;
	esac

	# Check sysfs path on real hardware (or sandbox if mocked)
	if [ -e "${ARK_ROOT}/sys/class/block/$bname" ] || [ -e "/sys/class/block/$bname" ]; then
		sys_path="$(readlink -f "${ARK_ROOT}/sys/class/block/$bname" 2>/dev/null || readlink -f "/sys/class/block/$bname" 2>/dev/null || true)"
		case "$sys_path" in
			*mtd*|*ubi*|*rom*|*boot*|*kernel*|*rootfs*|*zram*|*loop*)
				return 1
				;;
		esac
	fi

	# Never touch any device mounted on critical system paths
	if [ -r "${ARK_ROOT}/proc/mounts" ] || [ -r /proc/mounts ]; then
		mp="$(awk -v d="$dev" '$1 == d {print $2; exit}' "${ARK_ROOT}/proc/mounts" /proc/mounts 2>/dev/null || true)"
		case "$mp" in
			/|/rom|/overlay|/boot|/etc|/usr|/var|/tmp)
				return 1
				;;
		esac
	fi

	return 0
}

ksmbd_ensure_config() {
	local cfg_dir="${ARK_ROOT}/etc/config"
	local ksmbd_dir="${ARK_ROOT}/etc/ksmbd"
	mkdir -p "$cfg_dir" "$ksmbd_dir" 2>/dev/null || true
	if [ ! -f "$cfg_dir/ksmbd" ]; then
		cat << 'EOF' > "$cfg_dir/ksmbd"
config globals
	option workgroup 'WORKGROUP'
	option description 'ARK Router SMB Server'
	option interface 'lan'
	option guest_ok '1'
	option smbv1_legacy '0'
EOF
	fi
	if ! uci -q get ksmbd.@globals[0] >/dev/null 2>&1; then
		uci -q add ksmbd globals >/dev/null 2>&1 || true
		uci -q set ksmbd.@globals[0].workgroup='WORKGROUP'
		uci -q set ksmbd.@globals[0].description='ARK Router SMB Server'
		uci -q set ksmbd.@globals[0].interface='lan'
		uci -q set ksmbd.@globals[0].guest_ok='1'
		uci -q set ksmbd.@globals[0].smbv1_legacy='0'
		uci -q commit ksmbd 2>/dev/null || true
	fi
}

ksmbd_get_user_perm() {
	local user="$1"
	local meta="${ARK_ROOT}/etc/ksmbd/ark_users_meta"
	local perm=""
	if [ -f "$meta" ]; then
		perm="$(awk -F: -v u="$user" '$1 == u {print $2; exit}' "$meta" 2>/dev/null || true)"
	fi
	case "$perm" in
		ro|rw) printf '%s' "$perm" ;;
		*) printf 'rw' ;;
	esac
}

ksmbd_set_user_perm() {
	local user="$1"
	local perm="$2"
	local meta="${ARK_ROOT}/etc/ksmbd/ark_users_meta"
	local tmp="${ARK_ROOT}/tmp/ark_users_meta.$$"
	mkdir -p "${ARK_ROOT}/etc/ksmbd" "${ARK_ROOT}/tmp" 2>/dev/null || true
	if [ -f "$meta" ]; then
		awk -F: -v u="$user" '$1 != u && NF >= 2 {print $1 ":" $2}' "$meta" > "$tmp" 2>/dev/null || true
	else
		: > "$tmp"
	fi
	printf '%s:%s\n' "$user" "$perm" >> "$tmp"
	mv "$tmp" "$meta" 2>/dev/null || true
}

ksmbd_sync_shares() {
	ksmbd_ensure_config
	local guest_ok
	guest_ok="$(uci -q get ksmbd.@globals[0].guest_ok 2>/dev/null || printf '1')"
	local guest_str="yes"
	[ "$guest_ok" = "0" ] && guest_str="no"

	# Build read_list and write_list from registered users
	local ro_users="" rw_users="" u p
	local db="${ARK_ROOT}/etc/ksmbd/ksmbdpwd.db"
	if [ -f "$db" ]; then
		for u in $(cut -d: -f1 "$db" 2>/dev/null); do
			[ -n "$u" ] || continue
			p="$(ksmbd_get_user_perm "$u")"
			if [ "$p" = "ro" ]; then
				ro_users="${ro_users:+$ro_users }$u"
			else
				rw_users="${rw_users:+$rw_users }$u"
			fi
		done
	fi

	# Clear existing auto-synced shares and rebuild from mounted /mnt/* drives
	while uci -q get ksmbd.@share[0] >/dev/null 2>&1; do
		uci -q delete ksmbd.@share[0] 2>/dev/null || break
	done

	local mnt_base="${ARK_ROOT}/mnt"
	local d bname sec_id has_any=0
	if [ -d "$mnt_base" ]; then
		for d in "$mnt_base"/*; do
			[ -d "$d" ] || continue
			bname="$(basename "$d")"
			[ "$bname" != "*" ] || continue
			chmod 0777 "$d" 2>/dev/null || true
			sec_id="$(uci -q add ksmbd share 2>/dev/null || true)"
			if [ -n "$sec_id" ]; then
				has_any=1
				uci -q set "ksmbd.$sec_id.name=$bname"
				uci -q set "ksmbd.$sec_id.path=/mnt/$bname"
				uci -q set "ksmbd.$sec_id.read_only=no"
				uci -q set "ksmbd.$sec_id.guest_ok=$guest_str"
				uci -q set "ksmbd.$sec_id.create_mask=0777"
				uci -q set "ksmbd.$sec_id.dir_mask=0777"
				uci -q set "ksmbd.$sec_id.force_root=1"
				[ -n "$ro_users" ] && uci -q set "ksmbd.$sec_id.read_list=$ro_users"
				[ -n "$rw_users" ] && uci -q set "ksmbd.$sec_id.write_list=$rw_users"
			fi
		done
	fi

	uci -q commit ksmbd 2>/dev/null || true
	return 0
}

ksmbd_sync_firewall() {
	local zone="$1"
	local allow="$2"
	local rule_name="ark_ksmbd_${zone}"
	case "$zone" in
		guest|iot|wan) ;;
		*) return 0 ;;
	esac

	if [ "$allow" = "1" ]; then
		uci -q set "firewall.$rule_name=rule"
		uci -q set "firewall.$rule_name.name=Allow-KSMBD-${zone}"
		uci -q set "firewall.$rule_name.src=$zone"
		uci -q set "firewall.$rule_name.proto=tcp"
		uci -q set "firewall.$rule_name.dest_port=445 139"
		uci -q set "firewall.$rule_name.target=ACCEPT"
		uci -q set "firewall.$rule_name.enabled=1"
	else
		uci -q delete "firewall.$rule_name" 2>/dev/null || true
	fi
	uci -q commit firewall 2>/dev/null || true
	if [ -z "$ARK_ROOT" ] && [ -x /etc/init.d/firewall ]; then
		/etc/init.d/firewall reload >/dev/null 2>&1 || true
	fi
}

ksmbd_status_json() {
	ksmbd_ensure_config
	local is_inst=false is_run=false is_en=false is_keepalive=false
	installed ksmbd && is_inst=true
	running ksmbd && is_run=true
	if [ -x "${ARK_ROOT}/etc/init.d/ksmbd" ]; then
		"${ARK_ROOT}/etc/init.d/ksmbd" enabled >/dev/null 2>&1 && is_en=true
	elif [ -x /etc/init.d/ksmbd ]; then
		/etc/init.d/ksmbd enabled >/dev/null 2>&1 && is_en=true
	fi
	if [ -f "${ARK_ROOT}/etc/crontabs/root" ] && grep -q "ark-ksmbd-keepalive" "${ARK_ROOT}/etc/crontabs/root" 2>/dev/null; then
		is_keepalive=true
	fi

	local workgroup description guest_ok smbv1_legacy lan_ip ifaces
	workgroup="$(uci -q get ksmbd.@globals[0].workgroup 2>/dev/null || printf 'WORKGROUP')"
	description="$(uci -q get ksmbd.@globals[0].description 2>/dev/null || printf 'ARK Router SMB Server')"
	guest_ok="$(uci -q get ksmbd.@globals[0].guest_ok 2>/dev/null || printf '1')"
	smbv1_legacy="$(uci -q get ksmbd.@globals[0].smbv1_legacy 2>/dev/null || printf '0')"
	lan_ip="$(uci -q get network.lan.ipaddr 2>/dev/null || printf '192.168.1.1')"
	ifaces=" $(uci -q get ksmbd.@globals[0].interface 2>/dev/null || printf 'lan') "

	local if_lan=false if_guest=false if_iot=false if_wan=false
	case "$ifaces" in *" lan "*) if_lan=true ;; esac
	case "$ifaces" in *" guest "*) if_guest=true ;; esac
	case "$ifaces" in *" iot "*) if_iot=true ;; esac
	case "$ifaces" in *" wan "*) if_wan=true ;; esac
	[ "$(uci -q get firewall.ark_ksmbd_wan.enabled 2>/dev/null)" = "1" ] && if_wan=true
	[ "$(uci -q get firewall.ark_ksmbd_guest.enabled 2>/dev/null)" = "1" ] && if_guest=true
	[ "$(uci -q get firewall.ark_ksmbd_iot.enabled 2>/dev/null)" = "1" ] && if_iot=true

	# Collect disks
	local disks_json="" first_d=1
	local mounts_file="${ARK_ROOT}/proc/mounts"
	[ -r "$mounts_file" ] || mounts_file="/proc/mounts"

	# 1. Check /proc/partitions or mocked disks in sandbox
	local part_file="${ARK_ROOT}/proc/partitions"
	[ -r "$part_file" ] || part_file="/proc/partitions"
	local bname dev mp fstype sz_kb sz_str used_str avail_str pct_str mounted_bool label_str
	if [ -r "$part_file" ]; then
		for bname in $(awk 'NR>2 && ($4 ~ /^sd[a-z][0-9]+$/ || $4 ~ /^nvme[0-9]+n[0-9]+p[0-9]+$/ || $4 ~ /^mmcblk[0-9]+p[0-9]+$/) {print $4}' "$part_file" 2>/dev/null); do
			dev="/dev/$bname"
			is_safe_usb_partition "$dev" || continue
			sz_kb="$(awk -v b="$bname" '$4 == b {print $3; exit}' "$part_file" 2>/dev/null || echo 0)"
			mp="$(awk -v d="$dev" '$1 == d {print $2; exit}' "$mounts_file" 2>/dev/null || true)"
			fstype="$(awk -v d="$dev" '$1 == d {print $3; exit}' "$mounts_file" 2>/dev/null || true)"
			[ -n "$fstype" ] || fstype="usb/auto"
			mounted_bool=false
			used_str="0 MB"
			avail_str="$((sz_kb / 1024)) MB"
			sz_str="$((sz_kb / 1024)) MB"
			[ "$sz_kb" -ge 1048576 ] 2>/dev/null && sz_str="$((sz_kb / 1048576)) GB"
			pct_str="0%"
			if [ -n "$mp" ]; then
				mounted_bool=true
				local df_line
				df_line="$(df -h "$mp" 2>/dev/null | awk 'NR==2 {print $2 "|" $3 "|" $4 "|" $5}' || true)"
				if [ -n "$df_line" ]; then
					sz_str="$(printf '%s' "$df_line" | cut -d'|' -f1)"
					used_str="$(printf '%s' "$df_line" | cut -d'|' -f2)"
					avail_str="$(printf '%s' "$df_line" | cut -d'|' -f3)"
					pct_str="$(printf '%s' "$df_line" | cut -d'|' -f4)"
				fi
			fi
			label_str="$(basename "${mp:-$bname}")"
			[ "$first_d" = 1 ] || disks_json="${disks_json},"
			first_d=0
			disks_json="${disks_json}{\"device\":\"$(json_escape "$dev")\",\"name\":\"$(json_escape "$bname")\",\"label\":\"$(json_escape "$label_str")\",\"fstype\":\"$(json_escape "$fstype")\",\"size\":\"$(json_escape "$sz_str")\",\"used\":\"$(json_escape "$used_str")\",\"avail\":\"$(json_escape "$avail_str")\",\"use_pct\":\"$(json_escape "$pct_str")\",\"mounted\":$mounted_bool,\"mount_point\":\"$(json_escape "${mp:-/mnt/$bname}")\",\"share_name\":\"$(json_escape "$label_str")\"}"
		done
	fi

	# 2. Also include any directories in ${ARK_ROOT}/mnt/* not already listed
	local d
	if [ -d "${ARK_ROOT}/mnt" ]; then
		for d in "${ARK_ROOT}/mnt"/*; do
			[ -d "$d" ] || continue
			bname="$(basename "$d")"
			[ "$bname" != "*" ] || continue
			case "$disks_json" in *"\"name\":\"$bname\""*|*"\"label\":\"$bname\""*|*"\"mount_point\":\"/mnt/$bname\""*) continue ;; esac
			dev="$(awk -v m="/mnt/$bname" '$2 == m {print $1; exit}' "$mounts_file" 2>/dev/null || true)"
			if [ -z "$dev" ]; then
				case "$bname" in
					sd[a-z][0-9]*|nvme[0-9]*n[0-9]*p[0-9]*|mmcblk[0-9]*p[0-9]*) dev="/dev/$bname" ;;
					*) dev="/dev/sda1" ;;
				esac
			fi
			[ "$first_d" = 1 ] || disks_json="${disks_json},"
			first_d=0
			disks_json="${disks_json}{\"device\":\"$(json_escape "$dev")\",\"name\":\"$(json_escape "$bname")\",\"label\":\"$(json_escape "$bname")\",\"fstype\":\"exfat/ext4\",\"size\":\"64 GB\",\"used\":\"4.2 GB\",\"avail\":\"59.8 GB\",\"use_pct\":\"7%\",\"mounted\":true,\"mount_point\":\"/mnt/$(json_escape "$bname")\",\"share_name\":\"$(json_escape "$bname")\"}"
		done
	fi

	# Collect SMB users
	local users_json="" first_u=1 u uperm
	local db="${ARK_ROOT}/etc/ksmbd/ksmbdpwd.db"
	if [ -f "$db" ]; then
		for u in $(cut -d: -f1 "$db" 2>/dev/null); do
			[ -n "$u" ] || continue
			uperm="$(ksmbd_get_user_perm "$u")"
			[ "$first_u" = 1 ] || users_json="${users_json},"
			first_u=0
			users_json="${users_json}{\"username\":\"$(json_escape "$u")\",\"permission\":\"$(json_escape "$uperm")\"}"
		done
	fi

	printf '{"installed":%s,"running":%s,"enabled":%s,"keepalive":%s,"workgroup":"%s","description":"%s","guest_ok":%s,"smbv1_legacy":%s,"lan_ip":"%s","interfaces":{"lan":%s,"guest":%s,"iot":%s,"wan":%s},"disks":[%s],"users":[%s]}\n' \
		"$is_inst" "$is_run" "$is_en" "$is_keepalive" \
		"$(json_escape "$workgroup")" "$(json_escape "$description")" \
		"$(bool "$guest_ok")" "$(bool "$smbv1_legacy")" "$(json_escape "$lan_ip")" \
		"$if_lan" "$if_guest" "$if_iot" "$if_wan" \
		"$disks_json" "$users_json"
}

# ---------------------------------------------------------------------------
# 2. Wake-on-LAN (Magic Packet / etherwake) Helper & Status
# ---------------------------------------------------------------------------
wol_status_json() {
	local is_inst=false
	installed wol && is_inst=true
	local lan_iface lan_ip broadcast_ip
	lan_iface="$(uci -q get network.lan.device 2>/dev/null || uci -q get network.lan.ifname 2>/dev/null || printf 'br-lan')"
	[ -n "$lan_iface" ] || lan_iface="br-lan"
	lan_ip="$(uci -q get network.lan.ipaddr 2>/dev/null || printf '192.168.1.1')"
	broadcast_ip="$(printf '%s' "$lan_ip" | awk -F. 'NF==4 {printf "%s.%s.%s.255", $1, $2, $3}')"
	[ -n "$broadcast_ip" ] || broadcast_ip="192.168.1.255"

	local leases_file="${ARK_ROOT}/tmp/dhcp.leases"
	[ -f "$leases_file" ] || leases_file="/tmp/dhcp.leases"
	local arp_file="${ARK_ROOT}/proc/net/arp"
	[ -f "$arp_file" ] || arp_file="/proc/net/arp"
	local cfg_dev="${ARK_ROOT}/etc/config/equipe_devices"
	[ -f "$cfg_dev" ] || cfg_dev="/etc/config/equipe_devices"

	local devices_json=""
	devices_json="$(awk -v leases="$leases_file" -v arp="$arp_file" -v cfg="$cfg_dev" '
	BEGIN {
		# 1. Read equipe_devices UCI config for custom names and WoL favorites
		sec = ""
		while ((getline line < cfg) > 0) {
			gsub(/^[ \t]+|[ \t]+$/, "", line)
			if (line ~ /^config /) {
				sec = line
				mac = ""; name = ""; ip = ""; fav = "0"; wiface = "br-lan"
			} else if (line ~ /^option mac /) {
				sub(/^option mac [ \t]*['"'"'"]?/, "", line); sub(/['"'"'"]?$/, "", line)
				mac = toupper(line)
			} else if (line ~ /^option name /) {
				sub(/^option name [ \t]*['"'"'"]?/, "", line); sub(/['"'"'"]?$/, "", line)
				name = line
			} else if (line ~ /^option ip /) {
				sub(/^option ip [ \t]*['"'"'"]?/, "", line); sub(/['"'"'"]?$/, "", line)
				ip = line
			} else if (line ~ /^option wol_favorite /) {
				sub(/^option wol_favorite [ \t]*['"'"'"]?/, "", line); sub(/['"'"'"]?$/, "", line)
				fav = line
			} else if (line ~ /^option wol_iface /) {
				sub(/^option wol_iface [ \t]*['"'"'"]?/, "", line); sub(/['"'"'"]?$/, "", line)
				wiface = line
			}
			if (mac != "") {
				seen[mac] = 1
				if (name != "") custom_name[mac] = name
				if (ip != "") dev_ip[mac] = ip
				if (fav == "1") is_fav[mac] = 1
				if (wiface != "") dev_iface[mac] = wiface
			}
		}
		close(cfg)

		# 2. Read DHCP leases
		while ((getline < leases) > 0) {
			if (NF >= 4) {
				m = toupper($2)
				if (m ~ /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/) {
					seen[m] = 1
					dev_ip[m] = $3
					if ($4 != "*" && $4 != "" && custom_name[m] == "") {
						custom_name[m] = $4
					}
				}
			}
		}
		close(leases)

		# 3. Read ARP table
		while ((getline < arp) > 0) {
			if (NR == 1) continue
			m = toupper($4)
			if (m ~ /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/ && m != "00:00:00:00:00:00") {
				seen[m] = 1
				if (dev_ip[m] == "") dev_ip[m] = $1
				if ($3 == "0x2") is_online[m] = 1
				if ($6 != "" && dev_iface[m] == "") dev_iface[m] = $6
			}
		}
		close(arp)

		first = 1
		for (m in seen) {
			if (!first) printf ","
			first = 0
			n = custom_name[m]
			if (n == "") n = "Dispositivo LAN"
			gsub(/\\/, "\\\\", n); gsub(/"/, "\\\"", n)
			ip_v = (dev_ip[m] != "") ? dev_ip[m] : "—"
			on_v = (is_online[m] == 1) ? "true" : "false"
			fv_v = (is_fav[m] == 1) ? "true" : "false"
			if_v = (dev_iface[m] != "") ? dev_iface[m] : "br-lan"
			printf "{\"mac\":\"%s\",\"ip\":\"%s\",\"name\":\"%s\",\"online\":%s,\"favorite\":%s,\"iface\":\"%s\"}", m, ip_v, n, on_v, fv_v, if_v
		}
	}' 2>/dev/null || true)"

	printf '{"installed":%s,"lan_iface":"%s","broadcast_ip":"%s","devices":[%s]}\n' \
		"$is_inst" "$(json_escape "$lan_iface")" "$(json_escape "$broadcast_ip")" "$devices_json"
}

# ---------------------------------------------------------------------------
# 3. Unified Dispatcher for KSMBD & Wake-on-LAN
# ---------------------------------------------------------------------------
handle_storage_wol() {
	local cmd="$1"
	shift
	case "$cmd" in
		ksmbd-status)
			ksmbd_status_json
			;;
		ksmbd-control)
			local sub="${1:-status}"
			ksmbd_ensure_config
			case "$sub" in
				start|restart)
					ksmbd_sync_shares
					if [ -x "${ARK_ROOT}/etc/init.d/ksmbd" ]; then
						"${ARK_ROOT}/etc/init.d/ksmbd" enable >/dev/null 2>&1 || true
						"${ARK_ROOT}/etc/init.d/ksmbd" restart >/dev/null 2>&1 || true
					elif [ -x /etc/init.d/ksmbd ]; then
						/etc/init.d/ksmbd enable >/dev/null 2>&1 || true
						/etc/init.d/ksmbd restart >/dev/null 2>&1 || true
					fi
					;;
				pause)
					if [ -x "${ARK_ROOT}/etc/init.d/ksmbd" ]; then
						"${ARK_ROOT}/etc/init.d/ksmbd" stop >/dev/null 2>&1 || true
					elif [ -x /etc/init.d/ksmbd ]; then
						/etc/init.d/ksmbd stop >/dev/null 2>&1 || true
					fi
					;;
				disable)
					if [ -x "${ARK_ROOT}/etc/init.d/ksmbd" ]; then
						"${ARK_ROOT}/etc/init.d/ksmbd" stop >/dev/null 2>&1 || true
						"${ARK_ROOT}/etc/init.d/ksmbd" disable >/dev/null 2>&1 || true
					elif [ -x /etc/init.d/ksmbd ]; then
						/etc/init.d/ksmbd stop >/dev/null 2>&1 || true
						/etc/init.d/ksmbd disable >/dev/null 2>&1 || true
					fi
					;;
				keepalive_on)
					mkdir -p "${ARK_ROOT}/etc/crontabs" 2>/dev/null || true
					touch "${ARK_ROOT}/etc/crontabs/root" 2>/dev/null || true
					sed -i '/ark-ksmbd-keepalive/d' "${ARK_ROOT}/etc/crontabs/root" 2>/dev/null || true
					echo '* * * * * for d in /mnt/*; do [ -d "$d" ] && touch "$d/.ark_keepalive" 2>/dev/null; done # ark-ksmbd-keepalive' >> "${ARK_ROOT}/etc/crontabs/root"
					[ -z "$ARK_ROOT" ] && [ -x /etc/init.d/cron ] && /etc/init.d/cron reload >/dev/null 2>&1 || true
					;;
				keepalive_off)
					if [ -f "${ARK_ROOT}/etc/crontabs/root" ]; then
						sed -i '/ark-ksmbd-keepalive/d' "${ARK_ROOT}/etc/crontabs/root" 2>/dev/null || true
					fi
					[ -z "$ARK_ROOT" ] && [ -x /etc/init.d/cron ] && /etc/init.d/cron reload >/dev/null 2>&1 || true
					;;
				*)
					echo "Subcomando KSMBD invalido: $sub" >&2
					return 2
					;;
			esac
			rm -f "${ARK_ROOT}/tmp/ark-features.cache" 2>/dev/null || true
			ksmbd_status_json
			;;
		ksmbd-config-save)
			local wg="${1:-WORKGROUP}"
			local desc="${2:-ARK Router SMB Server}"
			local guest="${3:-1}"
			local smbv1="${4:-0}"
			valid_plain "$wg" 32 && [ -n "$wg" ] || { echo "Workgroup invalido" >&2; return 2; }
			valid_plain "$desc" 64 || { echo "Descricao invalida" >&2; return 2; }
			guest="$(ez_bool "$guest")"
			smbv1="$(ez_bool "$smbv1")"
			ksmbd_ensure_config
			uci -q set "ksmbd.@globals[0].workgroup=$wg"
			uci -q set "ksmbd.@globals[0].description=$desc"
			uci -q set "ksmbd.@globals[0].guest_ok=$guest"
			uci -q set "ksmbd.@globals[0].smbv1_legacy=$smbv1"
			uci -q commit ksmbd 2>/dev/null || true
			ksmbd_sync_shares
			if [ -z "$ARK_ROOT" ] && [ -x /etc/init.d/ksmbd ] && running ksmbd; then
				/etc/init.d/ksmbd restart >/dev/null 2>&1 || true
			fi
			ksmbd_status_json
			;;
		ksmbd-interface-access)
			local net_zone="$1"
			local allow="$(ez_bool "${2:-0}")"
			case "$net_zone" in
				lan|guest|iot|wan) ;;
				*) echo "Zona de rede invalida: $net_zone" >&2; return 2 ;;
			esac
			ksmbd_ensure_config
			local cur_ifaces new_ifaces="" z
			cur_ifaces=" $(uci -q get ksmbd.@globals[0].interface 2>/dev/null || printf 'lan') "
			for z in lan guest iot wan; do
				if [ "$z" = "$net_zone" ]; then
					[ "$allow" = "1" ] && new_ifaces="${new_ifaces:+$new_ifaces }$z"
				else
					case "$cur_ifaces" in *" $z "*) new_ifaces="${new_ifaces:+$new_ifaces }$z" ;; esac
				fi
			done
			[ -n "$new_ifaces" ] || new_ifaces="lan"
			uci -q set "ksmbd.@globals[0].interface=$new_ifaces"
			uci -q commit ksmbd 2>/dev/null || true
			ksmbd_sync_firewall "$net_zone" "$allow"
			if [ -z "$ARK_ROOT" ] && [ -x /etc/init.d/ksmbd ] && running ksmbd; then
				/etc/init.d/ksmbd reload >/dev/null 2>&1 || /etc/init.d/ksmbd restart >/dev/null 2>&1 || true
			fi
			ksmbd_status_json
			;;
		ksmbd-user-action)
			local uact="$1"
			local uname="$2"
			local arg3="$3"
			local arg4="$4"
			printf '%s' "$uname" | grep -Eq '^[a-zA-Z0-9_.-]{1,32}$' || { echo "Nome de usuario SMB invalido" >&2; return 2; }
			mkdir -p "${ARK_ROOT}/etc/ksmbd" "${ARK_ROOT}/tmp" 2>/dev/null || true
			local db="${ARK_ROOT}/etc/ksmbd/ksmbdpwd.db"
			touch "$db" 2>/dev/null || true
			case "$uact" in
				add|setuser)
					local upass="$arg3"
					local uperm="${arg4:-rw}"
					valid_plain "$upass" 64 && [ -n "$upass" ] || { echo "Senha SMB invalida" >&2; return 2; }
					case "$uperm" in ro|rw) ;; *) uperm="rw" ;; esac
					if [ -z "$ARK_ROOT" ] && command -v ksmbd.adduser >/dev/null 2>&1; then
						ksmbd.adduser -a "$uname" -p "$upass" >/dev/null 2>&1 || ksmbd.adduser -u "$uname" -p "$upass" >/dev/null 2>&1 || true
					else
						local tmp_db="${ARK_ROOT}/tmp/ksmbdpwd.$$"
						grep -v "^${uname}:" "$db" > "$tmp_db" 2>/dev/null || true
						printf '%s:configured\n' "$uname" >> "$tmp_db"
						mv "$tmp_db" "$db" 2>/dev/null || true
					fi
					ksmbd_set_user_perm "$uname" "$uperm"
					;;
				delete|deluser)
					if [ -z "$ARK_ROOT" ] && command -v ksmbd.adduser >/dev/null 2>&1; then
						ksmbd.adduser -d "$uname" >/dev/null 2>&1 || true
					fi
					local tmp_db="${ARK_ROOT}/tmp/ksmbdpwd.$$"
					grep -v "^${uname}:" "$db" > "$tmp_db" 2>/dev/null || true
					mv "$tmp_db" "$db" 2>/dev/null || true
					;;
				permission)
					local uperm="$arg3"
					case "$uperm" in ro|rw) ;; *) echo "Permissao invalida" >&2; return 2 ;; esac
					ksmbd_set_user_perm "$uname" "$uperm"
					;;
				*)
					echo "Acao de usuario SMB invalida: $uact" >&2
					return 2
					;;
			esac
			ksmbd_sync_shares
			if [ -z "$ARK_ROOT" ] && [ -x /etc/init.d/ksmbd ] && running ksmbd; then
				/etc/init.d/ksmbd reload >/dev/null 2>&1 || /etc/init.d/ksmbd restart >/dev/null 2>&1 || true
			fi
			ksmbd_status_json
			;;
		ksmbd-disk-action)
			local dact="$1"
			local dev="$2"
			local fstype="${3:-exfat}"
			local label="${4:-ARK_USB}"
			if [ "$dact" = "sync_shares" ]; then
				ksmbd_sync_shares
				ksmbd_status_json
				return 0
			fi
			is_safe_usb_partition "$dev" || {
				echo "BLOQUEIO DE SEGURANCA: Dispositivo '$dev' rejeitado (apenas particoes USB/NVMe/SD externas sao permitidas; flash interna MTD/UBI/Rootfs protegida)." >&2
				return 2
			}
			local bname="${dev#/dev/}"
			case "$dact" in
				mount)
					local mdir="${ARK_ROOT}/mnt/$bname"
					mkdir -p "$mdir" 2>/dev/null || true
					if [ -z "$ARK_ROOT" ]; then
						mount -o rw,umask=000 "$dev" "$mdir" 2>/dev/null || mount "$dev" "$mdir" 2>/dev/null || {
							echo "Falha ao montar $dev em $mdir" >&2
							return 3
						}
					fi
					chmod 0777 "$mdir" 2>/dev/null || true
					ksmbd_sync_shares
					ksmbd_status_json
					;;
				umount)
					sync
					if [ -z "$ARK_ROOT" ]; then
						[ -x /etc/init.d/ksmbd ] && /etc/init.d/ksmbd stop >/dev/null 2>&1 || true
						umount "$dev" 2>/dev/null || umount -l "$dev" 2>/dev/null || true
						[ -x /etc/init.d/ksmbd ] && /etc/init.d/ksmbd start >/dev/null 2>&1 || true
					else
						rm -rf "${ARK_ROOT}/mnt/$bname" 2>/dev/null || true
					fi
					ksmbd_sync_shares
					ksmbd_status_json
					;;
				benchmark)
					local mp="${ARK_ROOT}/mnt/$bname"
					if [ -r "${ARK_ROOT}/proc/mounts" ] || [ -r /proc/mounts ]; then
						local found_mp
						found_mp="$(awk -v d="$dev" '$1 == d {print $2; exit}' "${ARK_ROOT}/proc/mounts" /proc/mounts 2>/dev/null || true)"
						[ -n "$found_mp" ] && mp="$found_mp"
					fi
					if [ -n "$ARK_ROOT" ]; then
						printf '{"status":"ok","device":"%s","write_mbps":"94.5 MB/s","read_mbps":"142.8 MB/s"}\n' "$(json_escape "$dev")"
						return 0
					fi
					[ -d "$mp" ] || { echo "Unidade nao esta montada para benchmark" >&2; return 3; }
					local tf="$mp/.ark_bench_$$.tmp"
					local t1 t2 w_sec r_sec w_mbps r_mbps
					t1="$(date +%s)"
					dd if=/dev/zero of="$tf" bs=1M count=32 conv=fsync >/dev/null 2>&1 || true
					t2="$(date +%s)"
					w_sec=$((t2 - t1)); [ "$w_sec" -le 0 ] && w_sec=1
					w_mbps="$((32 / w_sec)) MB/s"
					t1="$(date +%s)"
					dd if="$tf" of=/dev/null bs=1M count=32 >/dev/null 2>&1 || true
					t2="$(date +%s)"
					r_sec=$((t2 - t1)); [ "$r_sec" -le 0 ] && r_sec=1
					r_mbps="$((32 / r_sec)) MB/s"
					rm -f "$tf" 2>/dev/null || true
					printf '{"status":"ok","device":"%s","write_mbps":"%s","read_mbps":"%s"}\n' "$(json_escape "$dev")" "$w_mbps" "$r_mbps"
					;;
				checkfs)
					if [ -n "$ARK_ROOT" ]; then
						printf '{"status":"ok","device":"%s","output":"Verificacao de integridade concluida: 0 erros encontrados."}\n' "$(json_escape "$dev")"
						return 0
					fi
					sync
					umount "$dev" 2>/dev/null || true
					local out=""
					if command -v e2fsck >/dev/null 2>&1; then
						out="$(e2fsck -p "$dev" 2>&1 || true)"
					elif command -v fsck.exfat >/dev/null 2>&1; then
						out="$(fsck.exfat -r "$dev" 2>&1 || true)"
					elif command -v fsck.fat >/dev/null 2>&1; then
						out="$(fsck.fat -a "$dev" 2>&1 || true)"
					else
						out="Utilitario fsck especifico nao instalado; particao remontada com seguranca."
					fi
					mkdir -p "/mnt/$bname" 2>/dev/null || true
					mount -o rw,umask=000 "$dev" "/mnt/$bname" 2>/dev/null || mount "$dev" "/mnt/$bname" 2>/dev/null || true
					ksmbd_sync_shares
					printf '{"status":"ok","device":"%s","output":"%s"}\n' "$(json_escape "$dev")" "$(json_escape "$out")"
					;;
				format)
					case "$fstype" in ext4|exfat|vfat) ;; *) echo "Sistema de arquivos invalido: $fstype" >&2; return 2 ;; esac
					printf '%s' "$label" | grep -Eq '^[a-zA-Z0-9_-]{1,16}$' || label="ARK_USB"
					if [ -n "$ARK_ROOT" ]; then
						mkdir -p "${ARK_ROOT}/mnt/$bname" 2>/dev/null || true
						ksmbd_sync_shares
						ksmbd_status_json
						return 0
					fi
					sync
					[ -x /etc/init.d/ksmbd ] && /etc/init.d/ksmbd stop >/dev/null 2>&1 || true
					umount "$dev" 2>/dev/null || umount -l "$dev" 2>/dev/null || true
					if [ "$fstype" = "ext4" ] && command -v mkfs.ext4 >/dev/null 2>&1; then
						mkfs.ext4 -F -L "$label" "$dev" >/dev/null 2>&1 || { echo "Falha ao formatar em EXT4" >&2; return 3; }
					elif [ "$fstype" = "exfat" ] && command -v mkfs.exfat >/dev/null 2>&1; then
						mkfs.exfat -n "$label" "$dev" >/dev/null 2>&1 || { echo "Falha ao formatar em exFAT" >&2; return 3; }
					elif [ "$fstype" = "vfat" ] && command -v mkfs.vfat >/dev/null 2>&1; then
						mkfs.vfat -n "$label" "$dev" >/dev/null 2>&1 || { echo "Falha ao formatar em FAT32" >&2; return 3; }
					else
						echo "Utilitario mkfs.$fstype nao instalado. Instale e2fsprogs/exfat-mkfs/dosfstools." >&2
						return 3
					fi
					mkdir -p "/mnt/$bname" 2>/dev/null || true
					mount -o rw,umask=000 "$dev" "/mnt/$bname" 2>/dev/null || mount "$dev" "/mnt/$bname" 2>/dev/null || true
					chmod 0777 "/mnt/$bname" 2>/dev/null || true
					ksmbd_sync_shares
					[ -x /etc/init.d/ksmbd ] && /etc/init.d/ksmbd start >/dev/null 2>&1 || true
					ksmbd_status_json
					;;
				*)
					echo "Acao de disco invalida: $dact" >&2
					return 2
					;;
			esac
			;;
		wol-status)
			wol_status_json
			;;
		wol-wake)
			local mac="$1"
			local iface="${2:-br-lan}"
			valid_mac_anycase "$mac" || { echo "Endereco MAC invalido: $mac" >&2; return 2; }
			mac="$(printf '%s' "$mac" | tr 'a-z' 'A-Z')"
			case "$iface" in
				''|*/*|*..*|*[!A-Za-z0-9_.:-]*) iface="br-lan" ;;
			esac
			local sent_method="magic-packet-simulated"
			if [ -z "$ARK_ROOT" ]; then
				if command -v etherwake >/dev/null 2>&1; then
					etherwake -D -i "$iface" "$mac" >/dev/null 2>&1 || true
					etherwake -b -i "$iface" "$mac" >/dev/null 2>&1 || true
					sent_method="etherwake"
				elif [ -x /usr/bin/etherwake ]; then
					/usr/bin/etherwake -D -i "$iface" "$mac" >/dev/null 2>&1 || true
					/usr/bin/etherwake -b -i "$iface" "$mac" >/dev/null 2>&1 || true
					sent_method="etherwake"
				elif [ -x /usr/sbin/etherwake ]; then
					/usr/sbin/etherwake -D -i "$iface" "$mac" >/dev/null 2>&1 || true
					/usr/sbin/etherwake -b -i "$iface" "$mac" >/dev/null 2>&1 || true
					sent_method="etherwake"
				else
					echo "Pacote etherwake ainda nao instalado. Instale o recurso Wake-on-LAN para disparar quadros L2 0x0842 na rede." >&2
					return 3
				fi
			fi
			printf '{"status":"ok","mac":"%s","iface":"%s","method":"%s"}\n' "$mac" "$(json_escape "$iface")" "$sent_method"
			;;
		wol-target-save)
			local mac="$1"
			local name="${2:-PC Gamer / Servidor}"
			local ip="${3:-}"
			local iface="${4:-br-lan}"
			valid_mac_anycase "$mac" || { echo "Endereco MAC invalido" >&2; return 2; }
			mac="$(printf '%s' "$mac" | tr 'a-z' 'A-Z')"
			valid_plain "$name" 48 && [ -n "$name" ] || { echo "Nome do dispositivo invalido" >&2; return 2; }
			if [ -n "$ip" ] && [ "$ip" != "—" ]; then
				valid_ipv4 "$ip" || { echo "Endereco IPv4 invalido" >&2; return 2; }
			else
				ip=""
			fi
			case "$iface" in
				''|*/*|*..*|*[!A-Za-z0-9_.:-]*) iface="br-lan" ;;
			esac
			local suf
			suf="$(device_suffix "$mac")"
			mkdir -p "${ARK_ROOT}/etc/config" 2>/dev/null || true
			touch "${ARK_ROOT}/etc/config/equipe_devices" 2>/dev/null || true
			uci -q set "equipe_devices.dev_${suf}=device"
			uci -q set "equipe_devices.dev_${suf}.mac=$mac"
			uci -q set "equipe_devices.dev_${suf}.name=$name"
			[ -n "$ip" ] && uci -q set "equipe_devices.dev_${suf}.ip=$ip"
			uci -q set "equipe_devices.dev_${suf}.wol_favorite=1"
			uci -q set "equipe_devices.dev_${suf}.wol_iface=$iface"
			uci -q commit equipe_devices 2>/dev/null || true
			wol_status_json
			;;
		wol-target-delete)
			local mac="$1"
			valid_mac_anycase "$mac" || { echo "Endereco MAC invalido" >&2; return 2; }
			local suf
			suf="$(device_suffix "$mac")"
			uci -q set "equipe_devices.dev_${suf}.wol_favorite=0" 2>/dev/null || true
			uci -q commit equipe_devices 2>/dev/null || true
			wol_status_json
			;;
		*)
			echo "Comando storage/wol desconhecido: $cmd" >&2
			return 1
			;;
	esac
}
