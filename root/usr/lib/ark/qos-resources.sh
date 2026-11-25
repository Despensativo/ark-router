#!/bin/sh
# Shared resource ceilings for ARK-owned CAKE and HFSC queues (BusyBox ash).
[ -z "${_ARK_QOS_RESOURCES_LOADED:-}" ] || return 0
_ARK_QOS_RESOURCES_LOADED=1

ark_qos_memory_kb() {
    local mem_kb
    mem_kb="$(awk '/^MemTotal:/ {print $2; exit}' "${ARK_ROOT:-}/proc/meminfo" 2>/dev/null || true)"
    case "$mem_kb" in ''|*[!0-9]*|??????????*) mem_kb=131072 ;; esac
    [ "$mem_kb" -gt 0 ] 2>/dev/null || mem_kb=131072
    printf '%s\n' "$mem_kb"
}

ark_qos_total_budget_kb() {
    local mem_kb
    mem_kb="$(ark_qos_memory_kb)"
    if [ "$mem_kb" -gt 3670016 ]; then printf '524288\n'
    elif [ "$mem_kb" -gt 1835008 ]; then printf '262144\n'
    elif [ "$mem_kb" -gt 786432 ]; then printf '131072\n'
    elif [ "$mem_kb" -gt 393216 ]; then printf '65536\n'
    elif [ "$mem_kb" -gt 196608 ]; then printf '32768\n'
    else printf '8192\n'; fi
}

ark_qos_module_present() {
    local module="$1" path
    case "$module" in ''|*[!a-zA-Z0-9_]*) return 1 ;; esac
    [ ! -d "${ARK_ROOT:-}/sys/module/$module" ] || return 0
    for path in "${ARK_ROOT:-}/lib/modules/$(uname -r)/$module".ko*; do
        [ ! -f "$path" ] || return 0
    done
    return 1
}

ark_qos_mq_candidate() {
    [ ! -f "${ARK_ROOT:-}/sys/kernel/debug/cake_mq_capable" ] || return 0
    ark_qos_module_present sch_cake_mq && return 0
    grep -qw cake_mq "${ARK_ROOT:-}/proc/kallsyms" 2>/dev/null
}

ark_qos_shaper_units() {
    # Reserve a common share per active direction and per potential cake_mq child.
    # Keep at least two shares so upload-only never doubles the old per-root cap.
    local mq_candidate=0
    ark_qos_mq_candidate && mq_candidate=1
    uci -q show sqm 2>/dev/null | awk -F= '
        { split($1, p, "."); sec=p[2]; key=p[3]; val=$2;
          gsub(/\047/, "", val);
          if (key == "") type[sec]=val;
          else value[sec,key]=val; }
        END { for (sec in type) if (type[sec] == "queue" && value[sec,"enabled"] == "1") {
          dl=value[sec,"download"]; ul=value[sec,"upload"];
          iface=value[sec,"interface"]; qdisc=value[sec,"qdisc"];
          if (iface ~ /^[a-zA-Z0-9_.:@-]+$/)
            print iface, (dl ~ /^[0-9]+$/ && dl+0 > 0 ? 1 : 0),
              (ul ~ /^[0-9]+$/ && ul+0 > 0 ? 1 : 0), (qdisc == "cake_mq" ? 1 : (qdisc == "cake" ? 2 : 0));
        }}' | {
        local units=0 iface dl ul mq path children
        while read -r iface dl ul mq; do
            units=$((units + dl))
            [ "$ul" = 1 ] || continue
            children=1
            if [ "$mq" = 1 ] || { [ "$mq" = 2 ] && [ "$mq_candidate" = 1 ]; } || grep -Fqx "$iface" "${ARK_ROOT:-}/tmp/ark_sqm_cake_mq.state" 2>/dev/null; then
                children=0
                for path in "${ARK_ROOT:-}/sys/class/net/$iface"/queues/tx-*; do
                    [ ! -d "$path" ] || children=$((children + 1))
                done
                [ "$children" -gt 0 ] || children=1
            fi
            units=$((units + children))
        done
        [ "$units" -ge 2 ] || units=2
        printf '%s\n' "$units"
    }
}

ark_qos_direction_budget_bytes() {
    local budget units share
    budget="$(ark_qos_total_budget_kb)"
    units="$(ark_qos_shaper_units)"
    share=$((budget / units))
    [ "$share" -gt 0 ] || { echo 'Orcamento QoS insuficiente' >&2; return 1; }
    printf '%s\n' "$((share * 1024))"
}

ark_qos_cake_memlimit() {
    local bytes
    bytes="$(ark_qos_direction_budget_bytes)" || return 1
    if [ "$((bytes % 1048576))" -eq 0 ]; then
        printf '%sM' "$((bytes / 1048576))"
    else
        printf '%sK' "$((bytes / 1024))"
    fi
}

ark_qos_ctinfo_fallback() {
    logger -t ARK-QoS 'ctinfo indisponivel: SQM continua sem restauracao DSCP bidirecional' 2>/dev/null || true
    return 1
}

ark_qos_install_ctinfo() {
    local dev="$1" ip_pref="$2" ip6_pref="$3" tc_cmd="${4:-tc}" small="${5:-0}" failed=0
    ark_qos_module_present act_ctinfo || { ark_qos_ctinfo_fallback; return 1; }
    if ! modprobe -q act_ctinfo 2>/dev/null; then
        [ -d "${ARK_ROOT:-}/sys/module/act_ctinfo" ] || \
            grep -qw act_ctinfo "${ARK_ROOT:-}/proc/modules" 2>/dev/null || {
                ark_qos_ctinfo_fallback; return 1
            }
    fi
    if [ "$small" = 1 ]; then
        "$tc_cmd" filter add dev "$dev" parent ffff: protocol ip pref "$ip_pref" u32 match u16 0x0000 0xfe00 at 2 action ctinfo dscp 0x0000003f 0x00000080 continue 2>/dev/null || failed=1
        "$tc_cmd" filter add dev "$dev" parent ffff: protocol ipv6 pref "$ip6_pref" u32 match u16 0x0000 0xfe00 at 4 action ctinfo dscp 0x0000003f 0x00000080 continue 2>/dev/null || failed=1
    else
        "$tc_cmd" filter add dev "$dev" parent ffff: protocol ip pref "$ip_pref" u32 match u32 0 0 action ctinfo dscp 0x0000003f 0x00000080 continue 2>/dev/null || failed=1
        "$tc_cmd" filter add dev "$dev" parent ffff: protocol ipv6 pref "$ip6_pref" u32 match u32 0 0 action ctinfo dscp 0x0000003f 0x00000080 continue 2>/dev/null || failed=1
    fi
    if [ "$failed" = 1 ]; then
        "$tc_cmd" filter del dev "$dev" parent ffff: pref "$ip_pref" 2>/dev/null || true
        "$tc_cmd" filter del dev "$dev" parent ffff: pref "$ip6_pref" 2>/dev/null || true
        ark_qos_ctinfo_fallback
        return 1
    fi
    return 0
}
