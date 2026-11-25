#!/bin/sh
# Shared WAN trust boundary before CAKE/HFSC IFB redirection (BusyBox ash).
[ -z "${_ARK_QOS_INGRESS_LOADED:-}" ] || return 0
_ARK_QOS_INGRESS_LOADED=1
. "${ARK_LIB_DIR:-/usr/lib/ark}/qos-resources.sh" || return 1

ark_qos_ingress_policy() {
    local dev="$1" fallback="$2" tc_cmd="${3:-tc}" pref module ready=1 ipv4=0 ipv6=0
    case "$dev" in ''|*[!a-zA-Z0-9_.:@-]*) return 1 ;; esac
    case "$fallback" in ''|*[!0-9a-fA-F:]*|:*|*:) return 1 ;; esac
    # Preferences 1..9 have been owned by ARK since the original ingress policy.
    # Preference 10 belongs to the SQM redirect; never delete it here.
    for pref in 1 2 3 4 5 6 7 8 9; do
        SILENT=1 "$tc_cmd" filter del dev "$dev" parent ffff: pref "$pref" 2>/dev/null || true
    done
    SILENT=0
    # Guard both families before installing any optional DSCP action. If pedit
    # cannot be installed, explicit BE prevents trusting the original WAN DSCP.
    "$tc_cmd" filter add dev "$dev" parent ffff: protocol all pref 1 u32 \
        match u32 0 0 action skbedit priority "$fallback" continue 2>/dev/null || return 1
    for module in act_pedit act_csum; do
        ark_qos_module_present "$module" || { ready=0; break; }
        modprobe -q "$module" 2>/dev/null || {
            [ -d "${ARK_ROOT:-}/sys/module/$module" ] || { ready=0; break; }
        }
    done
    if [ "$ready" = 1 ]; then
        # retain selects the bits to edit: 0xfc clears DSCP, preserving ECN.
        # IPv4 needs its header checksum repaired; IPv6 has no header checksum.
        if "$tc_cmd" filter add dev "$dev" parent ffff: protocol ip pref 2 u32 \
            match u32 0 0 action skbedit priority 0 pipe \
            action pedit ex munge ip dsfield set 0 retain 0xfc pipe \
            action csum ip4h continue 2>/dev/null; then ipv4=1; else ready=0; fi
        if "$tc_cmd" filter add dev "$dev" parent ffff: protocol ipv6 pref 3 u32 \
            match u32 0 0 action skbedit priority 0 pipe \
            action pedit ex munge ip6 traffic_class set 0 retain 0xfc continue 2>/dev/null; then ipv6=1; else ready=0; fi
    fi
    if [ "$ready" != 1 ]; then
        if [ "$ipv4" = 1 ]; then
            "$tc_cmd" filter del dev "$dev" parent ffff: pref 2 2>/dev/null || return 1
        fi
        if [ "$ipv6" = 1 ]; then
            "$tc_cmd" filter del dev "$dev" parent ffff: pref 3 2>/dev/null || return 1
        fi
        logger -t ARK-QoS 'Ingress em Best Effort: limpeza DSCP indisponivel' 2>/dev/null || true
        return 0
    fi
    # Missing ctinfo leaves sanitized CS0, never the provider's original DSCP.
    # Restore every packet size so a flow does not change class with its length.
    ark_qos_install_ctinfo "$dev" 4 5 "$tc_cmd" 0 || true
    "$tc_cmd" filter del dev "$dev" parent ffff: pref 1 2>/dev/null || return 1
}
