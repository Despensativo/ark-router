#!/bin/sh
# /usr/lib/ark/hw-tune.sh — Shared Hardware-Adaptive Topology, Latency, CPUFreq & Offload Helper
# Pure POSIX /bin/sh (BusyBox ash). Supports ARK_ROOT for deterministic sandbox testing.

# -----------------------------------------------------------------------------
# Bitmask Helpers (safe up to 64 CPUs on 32-bit BusyBox awk)
# -----------------------------------------------------------------------------

# Print hex CPU affinity bitmask with a single bit set for cpu_idx (0..63)
ark_hw_cpu_bitmask() {
	local idx="$1"
	case "$idx" in ''|*[!0-9]*) idx=0 ;; esac
	awk -v idx="$idx" 'BEGIN {
		if (idx < 0) idx = 0;
		if (idx > 63) idx = 63;
		nib = int(idx / 4);
		bit = idx % 4;
		val = 1;
		for (i = 0; i < bit; i++) val *= 2;
		hex = sprintf("%x", val);
		for (i = 0; i < nib; i++) hex = hex "0";
		print hex;
	}' 2>/dev/null || echo "1"
}

# Print hex CPU bitmask from a space-separated list of CPU indices (0..63)
ark_hw_cpus_to_bitmask() {
	local list="$1"
	awk -v list="$list" 'BEGIN {
		n = split(list, arr, /[ \t,]+/);
		max_nib = -1;
		for (i = 1; i <= n; i++) {
			if (arr[i] == "" || arr[i] ~ /[^0-9]/) continue;
			idx = arr[i] + 0;
			if (idx < 0 || idx > 63) continue;
			nib = int(idx / 4);
			bit = idx % 4;
			v = 1;
			for (b = 0; b < bit; b++) v *= 2;
			if (int(nibble[nib] / v) % 2 == 0) nibble[nib] += v;
			if (nib > max_nib) max_nib = nib;
		}
		if (max_nib < 0) {
			print "0";
			exit;
		}
		out = "";
		for (k = max_nib; k >= 0; k--) {
			out = out sprintf("%x", nibble[k] + 0);
		}
		sub(/^0+/, "", out);
		if (out == "") out = "0";
		print out;
	}' 2>/dev/null || echo "0"
}

# -----------------------------------------------------------------------------
# Hardware & WAN Device Discovery
# -----------------------------------------------------------------------------

_ark_hw_uci() {
	if [ -n "${ARK_ROOT:-}" ]; then
		uci -q -c "${ARK_ROOT}/etc/config" "$@"
	else
		uci -q "$@"
	fi
}

# Resolve a logical/VLAN/PPPoE device name to its underlying physical netdev
ark_hw_resolve_phys_dev() {
	local dev="$1"
	local root_prefix="${ARK_ROOT:-}"
	local uci_iface="" parent="" s=""

	[ -n "$dev" ] || return 0

	case "$dev" in
		pppoe-*)
			uci_iface="${dev#pppoe-}"
			dev="$(_ark_hw_uci get "network.${uci_iface}.device" || _ark_hw_uci get "network.${uci_iface}.ifname" || echo '')"
			[ -n "$dev" ] || return 0
			;;
	esac

	# Strip 802.1Q VLAN suffix (e.g. eth1.10 -> eth1)
	case "$dev" in
		*.*) parent="${dev%%.*}" ;;
	esac

	# Check named @device UCI section if no dot suffix
	if [ -z "$parent" ]; then
		for s in $(_ark_hw_uci show network 2>/dev/null | sed -n 's/^network\.\([^.=]*\)=device$/\1/p'); do
			if [ "$(_ark_hw_uci get "network.$s.name" || echo '')" = "$dev" ]; then
				parent="$(_ark_hw_uci get "network.$s.ifname" || echo '')"
				case "$parent" in *.*) parent="${parent%%.*}" ;; esac
				break
			fi
		done
	fi

	printf '%s\n' "${parent:-$dev}"
}

# Return space-separated deduplicated list of WAN devices (both VLAN and physical parent)
ark_hw_list_wan_phys_devs() {
	local sec dev phys out="" item found
	for sec in $(_ark_hw_uci show network 2>/dev/null | sed -n 's/^network\.\([^.=]*\)=interface$/\1/p'); do
		case "$sec" in
			wan|wan[0-9]*|wwan*)
				dev="$(_ark_hw_uci get "network.$sec.device" || _ark_hw_uci get "network.$sec.ifname" || echo '')"
				[ -n "$dev" ] || continue
				case "$dev" in @*|lo|br-*|pppoe-*|wg*|tun*|tap*) continue ;; esac
				phys="$(ark_hw_resolve_phys_dev "$dev")"
				for item in "$dev" "$phys"; do
					[ -n "$item" ] || continue
					found=0
					case " $out " in *" $item "*) found=1 ;; esac
					[ "$found" -eq 0 ] && out="${out:+$out }$item"
				done
				;;
		esac
	done
	printf '%s\n' "$out"
}

# Count RX hardware queues exposed in sysfs for an interface
ark_hw_netdev_rx_queues() {
	local iface="$1"
	local root_prefix="${ARK_ROOT:-}"
	local q count=0
	for q in "${root_prefix}/sys/class/net/${iface}"/queues/rx-*; do
		[ -d "$q" ] && count=$((count + 1))
	done
	printf '%s\n' "$count"
}

# Detect whether a Wi-Fi subsystem is actively present/enabled (returns 0=active, 1=absent/disabled)
ark_hw_detect_wifi_active() {
	local root_prefix="${ARK_ROOT:-}"
	local d state has_up_netdev=0 has_any_netdev=0 has_irq=0 has_uci_radio=0 has_enabled_radio=0 r dis

	for d in "${root_prefix}/sys/class/net"/phy* "${root_prefix}/sys/class/net"/wlan* "${root_prefix}/sys/class/net"/ath* "${root_prefix}/sys/class/net"/ra*; do
		[ -d "$d" ] || continue
		has_any_netdev=1
		state="$(cat "$d/operstate" 2>/dev/null || echo 'up')"
		[ "$state" != "down" ] && has_up_netdev=1
	done

	if grep -qE 'mt76|mt79|ath|qca|rtw|rtl|brcm|wifi|wlan' "${root_prefix}/proc/interrupts" 2>/dev/null; then
		has_irq=1
	fi

	for r in $(_ark_hw_uci show wireless 2>/dev/null | sed -n 's/^wireless\.\([^.=]*\)=wifi-device$/\1/p'); do
		has_uci_radio=1
		dis="$(_ark_hw_uci get "wireless.$r.disabled" || echo '0')"
		[ "$dis" != "1" ] && has_enabled_radio=1
	done

	# Active Wi-Fi netdev always wins
	[ "$has_up_netdev" -eq 1 ] && return 0

	# If UCI explicitly configures radios and ALL of them are disabled, treat Wi-Fi as off
	if [ "$has_uci_radio" -eq 1 ] && [ "$has_enabled_radio" -eq 0 ]; then
		return 1
	fi

	# Otherwise active if Wi-Fi IRQ or netdev is present
	[ "$has_irq" -eq 1 ] || [ "$has_any_netdev" -eq 1 ]
}

# -----------------------------------------------------------------------------
# Unified Latency / NAPI / GRO / GSO Profile (Single Source of Truth)
# -----------------------------------------------------------------------------

# Computes ARK_LAT_MODE, ARK_GRO_CAP, ARK_GRO_TO, ARK_NAPI_DEF, ARK_BUDGET_USECS
ark_hw_latency_profile() {
	local sqm_on=0 hw_offload_on=0

	if _ark_hw_uci show sqm 2>/dev/null | grep -q "\.enabled='1'"; then
		sqm_on=1
	fi
	if [ "$(_ark_hw_uci get firewall.@defaults[0].flow_offloading_hw || echo '0')" = "1" ]; then
		hw_offload_on=1
	fi

	if [ "$sqm_on" -eq 1 ]; then
		ARK_LAT_MODE="sqm"
		ARK_GRO_CAP=8192
		ARK_GRO_TO=20000
		ARK_NAPI_DEF=2
		ARK_BUDGET_USECS=4000
	elif [ "$hw_offload_on" -eq 1 ]; then
		ARK_LAT_MODE="hw_offload"
		ARK_GRO_CAP=65536
		ARK_GRO_TO=20000
		ARK_NAPI_DEF=2
		ARK_BUDGET_USECS=8000
	else
		ARK_LAT_MODE="cpu_only"
		ARK_GRO_CAP=65536
		ARK_GRO_TO=50000
		ARK_NAPI_DEF=4
		ARK_BUDGET_USECS=8000
	fi
}

# Apply net.core.netdev_budget_usecs respecting kernel CONFIG_HZ minimum floor
# (e.g. HZ=1000 -> >=2000us, HZ=250 -> >=8000us, OpenWrt ARM HZ=100 -> >=20000us)
ark_hw_apply_budget_usecs() {
	local target="${1:-8000}"
	local root_prefix="${ARK_ROOT:-}"
	local cand

	if [ -n "$root_prefix" ]; then
		printf '%s\n' "$target"
		return 0
	fi

	for cand in "$target" 8000 10000 20000; do
		[ "$cand" -lt "$target" ] 2>/dev/null && continue
		if sysctl -q -w "net.core.netdev_budget_usecs=$cand" 2>/dev/null; then
			printf '%s\n' "$cand"
			return 0
		fi
	done
	sysctl -n net.core.netdev_budget_usecs 2>/dev/null || printf '%s\n' "$target"
}

# Apply unified GRO/GSO/NAPI settings to a single interface without cross-script clobbering
ark_hw_apply_iface_latency() {
	local iface="$1"
	local root_prefix="${ARK_ROOT:-}"
	local iface_dir="${root_prefix}/sys/class/net/${iface}"

	[ -d "$iface_dir" ] || return 0
	[ -n "${ARK_GRO_CAP:-}" ] || ark_hw_latency_profile

	case "$iface" in
		pppoe*)
			# Virtual PPPoE tunnel has no hardware NAPI poll loop: always zero flush/defer
			[ -w "$iface_dir/gro_flush_timeout" ] && echo 0 > "$iface_dir/gro_flush_timeout" 2>/dev/null || true
			[ -w "$iface_dir/napi_defer_hard_irqs" ] && echo 0 > "$iface_dir/napi_defer_hard_irqs" 2>/dev/null || true
			if [ -z "$root_prefix" ]; then
				ethtool -K "$iface" rx-gro-list off 2>/dev/null || true
				ethtool -K "$iface" rx-udp-gro-forwarding on 2>/dev/null || true
				ip link set dev "$iface" txqueuelen 128 \
					gro_max_size "$ARK_GRO_CAP" gro_ipv4_max_size "$ARK_GRO_CAP" \
					gso_max_size "$ARK_GRO_CAP" gso_ipv4_max_size "$ARK_GRO_CAP" 2>/dev/null || true
			fi
			;;
		ifb*)
			if [ -z "$root_prefix" ]; then
				ethtool -K "$iface" rx-gro-list off 2>/dev/null || true
				ip link set dev "$iface" txqueuelen 1000 \
					gro_max_size "$ARK_GRO_CAP" gro_ipv4_max_size "$ARK_GRO_CAP" \
					gso_max_size "$ARK_GRO_CAP" gso_ipv4_max_size "$ARK_GRO_CAP" 2>/dev/null || true
			fi
			;;
		eth*|lan*|en*|igb*|ixgbe*|i40e*|igc*|wan*)
			[ -w "$iface_dir/gro_flush_timeout" ] && echo "$ARK_GRO_TO" > "$iface_dir/gro_flush_timeout" 2>/dev/null || true
			[ -w "$iface_dir/napi_defer_hard_irqs" ] && echo "$ARK_NAPI_DEF" > "$iface_dir/napi_defer_hard_irqs" 2>/dev/null || true
			if [ -z "$root_prefix" ]; then
				ethtool -K "$iface" gro on gso on 2>/dev/null || true
				ethtool -K "$iface" rx-gro-list off 2>/dev/null || true
				ethtool -K "$iface" rx-udp-gro-forwarding on 2>/dev/null || true
				ip link set dev "$iface" \
					gro_max_size "$ARK_GRO_CAP" gro_ipv4_max_size "$ARK_GRO_CAP" \
					gso_max_size "$ARK_GRO_CAP" gso_ipv4_max_size "$ARK_GRO_CAP" 2>/dev/null || true
			fi
			;;
	esac
}

# -----------------------------------------------------------------------------
# Decoupled CPU-Topology RPS & IRQ Affinity Calculation
# -----------------------------------------------------------------------------

# Compute optimal RPS hex bitmask for an interface strictly from CPU topology (independent of RAM tier)
ark_hw_compute_rps_target() {
	local iface="$1"
	local cpu_cores="$2"
	local wifi_active="$3"
	local wan_phys_list="${4:-}"
	local rx_q cpu_list c

	case "$cpu_cores" in ''|*[!0-9]*) cpu_cores=1 ;; esac
	if [ "$cpu_cores" -le 1 ]; then
		printf '0\n'
		return 0
	fi

	# Virtual tunnels, bridges, loopbacks and IFBs never take software RPS
	case "$iface" in
		lo|ifb*|br-*|wg*|tailscale*|zt*|tun*|tap*|sit*|gre*|veth*|teql*)
			printf '0\n'
			return 0
			;;
	esac

	# Any physical WAN device stays at rps=0 (avoids double-RPS and poor PPPoE L2 hashing)
	case " $wan_phys_list " in
		*" $iface "*)
			printf '0\n'
			return 0
			;;
	esac

	# Hardware multi-queue RSS NICs (rx_queues > 1) keep rps=0 to preserve native RSS cache locality
	rx_q="$(ark_hw_netdev_rx_queues "$iface")"
	if [ "$rx_q" -gt 1 ] 2>/dev/null; then
		printf '0\n'
		return 0
	fi

	case "$iface" in
		pppoe*)
			if [ "$cpu_cores" -eq 2 ]; then
				# Offload PPPoE L3/SQM to CPU0 while Eth+Wi-Fi IRQs stay on CPU1
				printf '1\n'
			elif [ "$cpu_cores" -eq 3 ]; then
				printf '3\n'
			elif [ "$cpu_cores" -eq 4 ]; then
				if [ "$wifi_active" -eq 1 ]; then
					# CPU0..1 (0x3): isolates CPU2 (Wi-Fi) and CPU3 (Eth DMA RX)
					printf '3\n'
				else
					# Wired-only 4-core (or Wi-Fi disabled): unlock CPU2 -> CPU0..2 (0x7)
					printf '7\n'
				fi
			elif [ "$cpu_cores" -ge 8 ]; then
				# 8+ cores: CPU0 + dedicated worker cores CPU4..N-1 (plus CPU3 if no Wi-Fi)
				cpu_list="0"
				[ "$wifi_active" -eq 0 ] && cpu_list="$cpu_list 3"
				c=4
				while [ "$c" -lt "$cpu_cores" ]; do
					cpu_list="$cpu_list $c"
					c=$((c + 1))
				done
				ark_hw_cpus_to_bitmask "$cpu_list"
			else
				# 5..7 cores: CPU0,1 + CPU4..N-1 (plus CPU2 if no Wi-Fi; skips CPU3 Eth RX)
				cpu_list="0 1"
				[ "$wifi_active" -eq 0 ] && cpu_list="$cpu_list 2"
				c=4
				while [ "$c" -lt "$cpu_cores" ]; do
					cpu_list="$cpu_list $c"
					c=$((c + 1))
				done
				ark_hw_cpus_to_bitmask "$cpu_list"
			fi
			;;
		lan[0-9]*)
			if [ "$cpu_cores" -le 2 ]; then
				printf '0\n'
			elif [ "$cpu_cores" -eq 3 ]; then
				printf '3\n'
			elif [ "$cpu_cores" -eq 4 ]; then
				# 3-Core Hash RPS CPU0..2 (0x7), avoiding CPU3 (Eth DMA RX) — works on 1GB W6x and 4GB BPi-R4 alike
				printf '7\n'
			elif [ "$cpu_cores" -ge 8 ]; then
				cpu_list="0"
				[ "$wifi_active" -eq 0 ] && cpu_list="$cpu_list 3"
				c=4
				while [ "$c" -lt "$cpu_cores" ]; do
					cpu_list="$cpu_list $c"
					c=$((c + 1))
				done
				ark_hw_cpus_to_bitmask "$cpu_list"
			else
				cpu_list="0 1 2"
				c=4
				while [ "$c" -lt "$cpu_cores" ]; do
					cpu_list="$cpu_list $c"
					c=$((c + 1))
				done
				ark_hw_cpus_to_bitmask "$cpu_list"
			fi
			;;
		phy*|wlan*|ath*|ra*)
			if [ "$cpu_cores" -le 2 ]; then
				printf '0\n'
			elif [ "$cpu_cores" -eq 3 ]; then
				printf '1\n'
			elif [ "$cpu_cores" -eq 4 ]; then
				# CPU0..1 (0x3): offloads Wi-Fi RX away from CPU2 (Wi-Fi IRQ/tasklet) and CPU3 (Eth RX)
				printf '3\n'
			elif [ "$cpu_cores" -ge 8 ]; then
				# Avoids CPU1/CPU2 (Eth) and CPU3 (Wi-Fi IRQ)
				cpu_list="0"
				c=4
				while [ "$c" -lt "$cpu_cores" ]; do
					cpu_list="$cpu_list $c"
					c=$((c + 1))
				done
				ark_hw_cpus_to_bitmask "$cpu_list"
			else
				cpu_list="0 1"
				c=4
				while [ "$c" -lt "$cpu_cores" ]; do
					cpu_list="$cpu_list $c"
					c=$((c + 1))
				done
				ark_hw_cpus_to_bitmask "$cpu_list"
			fi
			;;
		*)
			# Raw physical ethernet (eth0, eth1, enp*, etc.) stays at rps=0
			printf '0\n'
			;;
	esac
}

# Distribute hardware IRQs (and NAPI kthreads on live systems) respecting multi-queue RSS NICs
ark_hw_tune_irq_affinity() {
	local cores="$1"
	local root_prefix="${ARK_ROOT:-}"
	local proc_int="${root_prefix}/proc/interrupts"
	local proc_irq="${root_prefix}/proc/irq"
	local wifi_active=0 eth_mask=2 eth_alt_mask=2 wifi_mask=2 wifi_cpu=-1
	local eth_irq_count=0 eth_idx=0 irq name target_mask
	local rss_cpus="" rss_count=0 c slot chosen_cpu

	case "$cores" in ''|*[!0-9]*) cores=1 ;; esac
	[ "$cores" -ge 2 ] || return 0
	[ -f "$proc_int" ] && [ -d "$proc_irq" ] || return 0

	ark_hw_detect_wifi_active && wifi_active=1

	if [ "$cores" -ge 8 ]; then
		eth_mask=2
		eth_alt_mask=4
		wifi_mask=8
		wifi_cpu=3
	elif [ "$cores" -ge 4 ]; then
		eth_mask=2
		eth_alt_mask=8
		wifi_mask=4
		wifi_cpu=2
	else
		eth_mask=2
		eth_alt_mask=2
		wifi_mask=2
		wifi_cpu=1
	fi

	# Count Ethernet IRQs to detect true Multi-Queue RSS NICs (> 2 Ethernet queues)
	eth_irq_count="$(awk '/ethernet|mtk_eth|edma|nss|igb|igc|i225|ixgbe|i40e|e1000|r8169|r8125|r8126|virtio|mlx|bnxt|sfc/ {c++} END {print c+0}' "$proc_int" 2>/dev/null || echo 0)"

	# Build round-robin CPU list for multi-queue RSS NICs (> 2 Ethernet IRQs on 4+ cores)
	if [ "$eth_irq_count" -gt 2 ] && [ "$cores" -ge 4 ]; then
		c=1
		while [ "$c" -lt "$cores" ]; do
			if [ "$wifi_active" -eq 1 ] && [ "$c" -eq "$wifi_cpu" ]; then
				c=$((c + 1))
				continue
			fi
			rss_cpus="${rss_cpus:+$rss_cpus }$c"
			rss_count=$((rss_count + 1))
			c=$((c + 1))
		done
		# If wired-only and queue count >= cores, append CPU0 as final slot for 1:1 RSS mapping
		if [ "$wifi_active" -eq 0 ] && [ "$eth_irq_count" -ge "$cores" ]; then
			rss_cpus="${rss_cpus:+$rss_cpus }0"
			rss_count=$((rss_count + 1))
		fi
	fi

	awk '/ethernet|mtk_eth|edma|nss|igb|igc|i225|ixgbe|i40e|e1000|r8169|r8125|r8126|virtio|mlx|bnxt|sfc|mt76|mt79|ath|qca|rtw|rtl|brcm|wifi|wlan/ {sub(/:/, "", $1); print $1, $NF}' "$proc_int" 2>/dev/null | while read -r irq name; do
		[ -n "$irq" ] && [ -f "${proc_irq}/${irq}/smp_affinity" ] || continue
		case "$name" in
			*ethernet*|mtk_eth|*eth*|*edma*|*nss*|*igb*|*igc*|*i225*|*ixgbe*|*i40e*|*e1000*|*r8169*|*r8125*|*r8126*|*virtio*|*mlx*|*bnxt*|*sfc*)
				if [ "$rss_count" -gt 0 ]; then
					slot=$(( (eth_idx % rss_count) + 1 ))
					chosen_cpu="$(printf '%s\n' "$rss_cpus" | awk -v s="$slot" '{print $s}')"
					target_mask="$(ark_hw_cpu_bitmask "$chosen_cpu")"
					echo "$target_mask" > "${proc_irq}/${irq}/smp_affinity" 2>/dev/null || true
				elif [ "$((eth_idx % 2))" -eq 0 ]; then
					echo "$eth_mask" > "${proc_irq}/${irq}/smp_affinity" 2>/dev/null || true
				else
					echo "$eth_alt_mask" > "${proc_irq}/${irq}/smp_affinity" 2>/dev/null || true
				fi
				eth_idx=$((eth_idx + 1))
				;;
			mt76*|mt79*|ath*|qca*|rtw*|rtl*|brcm*|*wifi*|*wlan*)
				echo "$wifi_mask" > "${proc_irq}/${irq}/smp_affinity" 2>/dev/null || true
				;;
		esac
	done

	# Pin threaded NAPI kthreads on live systems (skip under ARK_ROOT unit tests)
	if [ -z "$root_prefix" ]; then
		[ -w /sys/module/mtk_eth/parameters/rx_dim_max_us ] && echo 40 > /sys/module/mtk_eth/parameters/rx_dim_max_us 2>/dev/null || true
		if command -v taskset >/dev/null 2>&1; then
			local napi_eth_idx=0 npid nname
			ps -w 2>/dev/null | awk '/\[napi\/|\[mt76-tx/ {print $1, $NF}' | while read -r npid nname; do
				[ -n "$npid" ] || continue
				case "$nname" in
					*mtk_eth*|*eth*|*edma*|*nss*|*igb*|*igc*|*ixgbe*)
						if [ "$rss_count" -gt 0 ]; then
							slot=$(( (napi_eth_idx % rss_count) + 1 ))
							chosen_cpu="$(printf '%s\n' "$rss_cpus" | awk -v s="$slot" '{print $s}')"
							target_mask="$(ark_hw_cpu_bitmask "$chosen_cpu")"
							taskset -p "$target_mask" "$npid" >/dev/null 2>&1 || true
						elif [ "$((napi_eth_idx % 2))" -eq 0 ]; then
							taskset -p "$eth_mask" "$npid" >/dev/null 2>&1 || true
						else
							taskset -p "$eth_alt_mask" "$npid" >/dev/null 2>&1 || true
						fi
						command -v chrt >/dev/null 2>&1 && chrt -f -p 1 "$npid" >/dev/null 2>&1 || true
						napi_eth_idx=$((napi_eth_idx + 1))
						;;
					*phy*|*mt76*|*ath*|*wlan*|*wifi*)
						taskset -p "$wifi_mask" "$npid" >/dev/null 2>&1 || true
						command -v chrt >/dev/null 2>&1 && chrt -f -p 1 "$npid" >/dev/null 2>&1 || true
						;;
				esac
			done
		fi
		logger -t ark-hardware-tune "Afinidade de IRQ/NAPI (${cores} cores, eth_irqs=${eth_irq_count}, wifi=${wifi_active}): Eth(0x${eth_mask}/0x${eth_alt_mask}, rss=${rss_count}), Wi-Fi(0x${wifi_mask})."
	fi
}

# -----------------------------------------------------------------------------
# Adaptive CPUFreq Governor with Thermal Safety Guard
# -----------------------------------------------------------------------------

# Reads max thermal zone temp in millidegrees Celsius (returns 0 if no sensors)
ark_hw_max_thermal_mc() {
	local root_prefix="${ARK_ROOT:-}"
	local z t max_t=0
	for z in "${root_prefix}/sys/class/thermal"/thermal_zone*/temp; do
		[ -r "$z" ] || continue
		t="$(cat "$z" 2>/dev/null || echo 0)"
		case "$t" in ''|*[!0-9]*) continue ;; esac
		[ "$t" -gt "$max_t" ] && max_t="$t"
	done
	printf '%s\n' "$max_t"
}

# Configures cpufreq governor on DVFS-capable SoCs (no-op on fixed-PLL SoCs like MT7986/MT7981)
ark_hw_tune_cpufreq() {
	local root_prefix="${ARK_ROOT:-}"
	local cfg_gov max_temp_mc target_gov avail pol policies="" epp_val=""

	cfg_gov="$(_ark_hw_uci get equipe_dashboard.tuning.cpu_governor || echo 'auto')"
	[ "$cfg_gov" = "default" ] && return 0

	for pol in "${root_prefix}/sys/devices/system/cpu/cpufreq"/policy*; do
		[ -f "$pol/scaling_governor" ] && policies="${policies:+$policies }$pol"
	done
	if [ -z "$policies" ]; then
		for pol in "${root_prefix}/sys/devices/system/cpu"/cpu*/cpufreq; do
			[ -f "$pol/scaling_governor" ] && policies="${policies:+$policies }$pol"
		done
	fi
	# Fixed-PLL SoC (no cpufreq): clean no-op
	[ -n "$policies" ] || return 0

	max_temp_mc="$(ark_hw_max_thermal_mc)"

	for pol in $policies; do
		[ -w "$pol/scaling_governor" ] || continue
		avail="$(cat "$pol/scaling_available_governors" 2>/dev/null || echo '')"
		target_gov=""
		epp_val=""

		if [ "$cfg_gov" = "auto" ]; then
			# Thermal safety guard: only lock performance below 75 C
			if [ "$max_temp_mc" -ge 75000 ] 2>/dev/null; then
				case " $avail " in
					*" schedutil "*) target_gov="schedutil"; epp_val="balance_performance" ;;
					*" ondemand "*) target_gov="ondemand"; epp_val="balance_performance" ;;
					*" powersave "*) target_gov="powersave"; epp_val="balance_performance" ;;
				esac
			else
				case " $avail " in
					*" performance "*) target_gov="performance"; epp_val="performance" ;;
					*" schedutil "*) target_gov="schedutil"; epp_val="balance_performance" ;;
				esac
			fi
		else
			# Explicit override still enforces critical 90 C thermal guard against forcing performance
			if [ "$cfg_gov" = "performance" ] && [ "$max_temp_mc" -ge 90000 ] 2>/dev/null; then
				case " $avail " in
					*" schedutil "*) target_gov="schedutil"; epp_val="balance_performance" ;;
					*" ondemand "*) target_gov="ondemand"; epp_val="balance_performance" ;;
					*" powersave "*) target_gov="powersave"; epp_val="balance_performance" ;;
				esac
			else
				case " $avail " in
					*" $cfg_gov "*)
						target_gov="$cfg_gov"
						[ "$cfg_gov" = "performance" ] && epp_val="performance" || epp_val="balance_performance"
						;;
				esac
			fi
		fi

		if [ -n "$target_gov" ]; then
			echo "$target_gov" > "$pol/scaling_governor" 2>/dev/null || true
			if [ -n "$epp_val" ] && [ -w "$pol/energy_performance_preference" ]; then
				echo "$epp_val" > "$pol/energy_performance_preference" 2>/dev/null || true
			fi
		fi
	done

	if [ -z "$root_prefix" ] && [ -n "${target_gov:-}" ]; then
		logger -t ark-hardware-tune "CPUFreq calibrado: mode=${cfg_gov}, governor=${target_gov}, max_temp=$((max_temp_mc / 1000))C."
	fi
}

# -----------------------------------------------------------------------------
# Real Kernel Offload Telemetry (PPE + WED runtime vs configured + conflicts)
# -----------------------------------------------------------------------------

# Sets:
#   ARK_WED_SUPPORTED, ARK_WED_RUNTIME_ENABLED, ARK_WED_CONFIGURED_ENABLED,
#   ARK_WED_REBOOT_REQUIRED, ARK_WED_DEBUG_PRESENT,
#   ARK_PPE_PRESENT, ARK_PPE_BOUND_FLOWS, ARK_PPE_UNBOUND_FLOWS,
#   ARK_HW_OFFLOAD_ENABLED, ARK_SW_OFFLOAD_ENABLED, ARK_SQM_ACTIVE,
#   ARK_WED_CONFLICT_SQM, ARK_WED_MISSING_HW_OFFLOAD
ark_hw_collect_offload_telemetry() {
	local root_prefix="${ARK_ROOT:-}"
	local mod ppe_dir bnd unb val cfg_hit=0

	ARK_WED_SUPPORTED=false
	ARK_WED_RUNTIME_ENABLED=false
	ARK_WED_CONFIGURED_ENABLED=false
	ARK_WED_REBOOT_REQUIRED=false
	ARK_WED_DEBUG_PRESENT=false
	ARK_PPE_PRESENT=false
	ARK_PPE_BOUND_FLOWS=0
	ARK_PPE_UNBOUND_FLOWS=0
	ARK_HW_OFFLOAD_ENABLED=false
	ARK_SW_OFFLOAD_ENABLED=false
	ARK_SQM_ACTIVE=false
	ARK_WED_CONFLICT_SQM=false
	ARK_WED_MISSING_HW_OFFLOAD=false

	for mod in mt7915e mt7996e mt7921e; do
		if [ -e "${root_prefix}/sys/module/${mod}/parameters/wed_enable" ]; then
			ARK_WED_SUPPORTED=true
			val="$(cat "${root_prefix}/sys/module/${mod}/parameters/wed_enable" 2>/dev/null || echo 'N')"
			[ "$val" = "Y" ] || [ "$val" = "1" ] && ARK_WED_RUNTIME_ENABLED=true
		fi
		if [ -f "${root_prefix}/etc/modules.d/${mod}" ]; then
			if grep -qE "wed_enable=(Y|1)" "${root_prefix}/etc/modules.d/${mod}" 2>/dev/null; then
				ARK_WED_CONFIGURED_ENABLED=true
				cfg_hit=1
			elif grep -qE "wed_enable=(N|0)" "${root_prefix}/etc/modules.d/${mod}" 2>/dev/null; then
				cfg_hit=1
			fi
		fi
		if [ "$cfg_hit" -eq 0 ] && [ -f "${root_prefix}/etc/modules.conf" ]; then
			if grep -qE "options[[:space:]]+${mod}[[:space:]].*wed_enable=(Y|1)" "${root_prefix}/etc/modules.conf" 2>/dev/null; then
				ARK_WED_CONFIGURED_ENABLED=true
				cfg_hit=1
			elif grep -qE "options[[:space:]]+${mod}[[:space:]].*wed_enable=(N|0)" "${root_prefix}/etc/modules.conf" 2>/dev/null; then
				cfg_hit=1
			fi
		fi
	done

	# If no explicit config file exists yet, configured matches runtime
	if [ "$cfg_hit" -eq 0 ]; then
		ARK_WED_CONFIGURED_ENABLED="$ARK_WED_RUNTIME_ENABLED"
	fi

	if [ "$ARK_WED_SUPPORTED" = "true" ] && [ "$ARK_WED_RUNTIME_ENABLED" != "$ARK_WED_CONFIGURED_ENABLED" ]; then
		ARK_WED_REBOOT_REQUIRED=true
	fi

	for ppe_dir in "${root_prefix}/sys/kernel/debug"/wed*; do
		[ -r "$ppe_dir/txinfo" ] && ARK_WED_DEBUG_PRESENT=true
	done

	for ppe_dir in "${root_prefix}/sys/kernel/debug"/ppe*; do
		[ -r "$ppe_dir/entries" ] || continue
		ARK_PPE_PRESENT=true
		bnd="$(grep -c "BND" "$ppe_dir/entries" 2>/dev/null || echo 0)"
		unb="$(grep -c "UNB" "$ppe_dir/entries" 2>/dev/null || echo 0)"
		case "$bnd" in ''|*[!0-9]*) bnd=0 ;; esac
		case "$unb" in ''|*[!0-9]*) unb=0 ;; esac
		ARK_PPE_BOUND_FLOWS=$((ARK_PPE_BOUND_FLOWS + bnd))
		ARK_PPE_UNBOUND_FLOWS=$((ARK_PPE_UNBOUND_FLOWS + unb))
	done

	[ "$(_ark_hw_uci get firewall.@defaults[0].flow_offloading || echo '0')" = "1" ] && ARK_SW_OFFLOAD_ENABLED=true
	[ "$(_ark_hw_uci get firewall.@defaults[0].flow_offloading_hw || echo '0')" = "1" ] && ARK_HW_OFFLOAD_ENABLED=true
	if _ark_hw_uci show sqm 2>/dev/null | grep -q "\.enabled='1'"; then
		ARK_SQM_ACTIVE=true
	fi

	if [ "$ARK_WED_RUNTIME_ENABLED" = "true" ] || [ "$ARK_WED_CONFIGURED_ENABLED" = "true" ]; then
		[ "$ARK_SQM_ACTIVE" = "true" ] && ARK_WED_CONFLICT_SQM=true
		[ "$ARK_HW_OFFLOAD_ENABLED" != "true" ] && ARK_WED_MISSING_HW_OFFLOAD=true
	fi
}
