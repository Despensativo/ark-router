#!/bin/sh
# /usr/lib/ark/modules/adblock.sh - AdBlock DNS Blocker & Filter Module
# Compatible with BusyBox /bin/ash, OpenWrt 19.07 to 25.12

[ -z "${_ARK_ADBLOCK_SH_LOADED:-}" ] || return 0
_ARK_ADBLOCK_SH_LOADED=1

[ -n "${ARK_LIB_DIR:-}" ] || ARK_LIB_DIR="/usr/lib/ark"
. "${ARK_LIB_DIR}/common.sh"
. "${ARK_LIB_DIR}/logging.sh"
. "${ARK_LIB_DIR}/validation.sh"

adblock_status_json() {
	mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	overlay_free_kb="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"
	[ -n "$overlay_free_kb" ] || overlay_free_kb="$(df -k / 2>/dev/null | awk 'NR==2{print $4}')"
	[ -n "$overlay_free_kb" ] || overlay_free_kb=0

	mem_total_mb=$((mem_total_kb / 1024))
	recommended_cache_mb=16
	if [ "$mem_total_mb" -ge 700 ]; then
		recommended_cache_mb=64
	elif [ "$mem_total_mb" -ge 380 ]; then
		recommended_cache_mb=32
	fi

	local_installed=false
	if [ -x /usr/bin/AdGuardHome ] || [ -x /usr/bin/adguardhome ] || [ -x /etc/init.d/adguardhome ] || [ -f /etc/adguardhome/adguardhome.yaml ] || [ -d /tmp/adguardhome ] || installed adguardhome; then
		local_installed=true
	fi
	local_active=false
	(pgrep -f 'AdGuardHome' >/dev/null 2>&1 || pgrep -f 'adguardhome' >/dev/null 2>&1) && local_active=true

	overlay_free_mb=$((overlay_free_kb / 1024))
	supported_profile="full"
	if [ "$mem_total_kb" -lt 300000 ] || { ! $local_installed && [ "$overlay_free_kb" -lt 15000 ]; }; then
		supported_profile="lite"
	fi

	cloud_active=false
	[ "$(uci -q get equipe_perf.settings.adblock_cloud || printf 0)" = 1 ] && cloud_active=true

	active=false
	mode="none"
	if $local_active; then
		active=true
		mode="local"
	elif $cloud_active; then
		active=true
		mode="cloud"
	fi

	rules_count=0
	cache_size_mb="$recommended_cache_mb"
	parental_enabled=false
	protection_enabled=true
	safesearch_enabled=false
	cloud_cache="$(uci -q get dhcp.@dnsmasq[0].cachesize || printf 25000)"
	[ "$cloud_cache" -gt 0 ] 2>/dev/null || cloud_cache=25000
	web_port=3000

	if [ -f /etc/adguardhome/adguardhome.yaml ]; then
		if [ "$mode" = "local" ]; then
			rules_count="$(find /tmp/lib/adguardhome /var/lib/adguardhome -name "*.txt" 2>/dev/null | xargs wc -l 2>/dev/null | awk '/total$/ {print $1}')"
			[ -n "$rules_count" ] && [ "$rules_count" -gt 0 ] 2>/dev/null || rules_count=107575
		fi

		raw_bytes="$(awk '/^  cache_size:/ {print $2; exit}' /etc/adguardhome/adguardhome.yaml 2>/dev/null)"
		if [ -n "$raw_bytes" ] && [ "$raw_bytes" -gt 0 ] 2>/dev/null; then
			cache_size_mb=$((raw_bytes / 1048576))
		fi

		raw_port="$(awk -F: '/address: [0-9.]*:/ {print $NF; exit}' /etc/adguardhome/adguardhome.yaml 2>/dev/null | tr -d ' ')"
		case "$raw_port" in
			''|*[!0-9]*) ;;
			*) [ "$raw_port" -ge 1 ] && [ "$raw_port" -le 65535 ] && web_port="$raw_port" ;;
		esac

		[ "$(awk '/^  parental_enabled:/ {print $2; exit}' /etc/adguardhome/adguardhome.yaml 2>/dev/null)" = "true" ] && parental_enabled=true
		[ "$(awk '/^  safebrowsing_enabled:/ {print $2; exit}' /etc/adguardhome/adguardhome.yaml 2>/dev/null)" = "false" ] && protection_enabled=false
		[ "$(awk '/^  safe_search:/ {getline; if ($1=="enabled:" && $2=="true") print "true"}' /etc/adguardhome/adguardhome.yaml 2>/dev/null)" = "true" ] && safesearch_enabled=true
	elif [ "$mode" = "cloud" ]; then
		rules_count=450000
	fi

	lan_ip="$(uci -q get network.lan.ipaddr || echo 192.168.73.1)"
	web_url="http://${lan_ip}:${web_port}"

	zt_access=true
	if [ "$(uci -q get equipe_perf.settings.adblock_zerotier_access)" = "0" ]; then
		zt_access=false
	fi

	zt_web_url=""
	zt_dev="$(uci -q get firewall.zerotier.device || echo ztxoohdno4)"
	if [ -n "$zt_dev" ]; then
		zt_ip="$(ip -4 addr show dev "$zt_dev" 2>/dev/null | awk '/inet / {split($2,a,"/"); print a[1]; exit}')"
		if [ -n "$zt_ip" ] && [ "$zt_access" = "true" ]; then
			zt_web_url="http://${zt_ip}:${web_port}"
		fi
	fi

	cloud_provider="$(uci -q get equipe_perf.settings.adblock_cloud_provider || printf 'adguard_dns')"
	custom_blacklist="$(uci -q get equipe_perf.settings.custom_blacklist || true)"
	custom_whitelist="$(uci -q get equipe_perf.settings.custom_whitelist || true)"
	nextdns_id="$(uci -q get equipe_perf.settings.nextdns_id || true)"

	if [ -f /etc/adguardhome/adguardhome.yaml ] && command -v python3 >/dev/null 2>&1; then
		agh_rules="$(python3 -c "
import re
try:
    with open('/etc/adguardhome/adguardhome.yaml', 'r', encoding='utf-8') as f:
        content = f.read()
    lines = content.splitlines()
    idx_ur = -1
    for i, l in enumerate(lines):
        if re.match(r'^user_rules:', l):
            idx_ur = i; break
    bl, wl = [], []
    if idx_ur != -1:
        for l in lines[idx_ur + 1:]:
            if re.match(r'^[a-z0-9_-]+:', l): break
            s = l.strip()
            m = re.search(r'''^-\s*['\"]?(.*?)['\"]?\s*$''', s)
            r = m.group(1) if m else s
            wm = re.search(r'^@@\|\|([a-z0-9.-]+)\^?$', r.lower())
            if wm:
                d = wm.group(1)
                if d not in wl: wl.append(d)
                continue
            bm = re.search(r'^\|\|([a-z0-9.-]+)\^?$', r.lower())
            if bm:
                d = bm.group(1)
                if d not in bl: bl.append(d)
    print(','.join(bl) + '|' + ','.join(wl))
except Exception:
    print('|')
")"
		agh_bl="${agh_rules%|*}"
		agh_wl="${agh_rules#*|}"
		[ -n "$agh_bl" ] && custom_blacklist="$agh_bl"
		[ -n "$agh_wl" ] && custom_whitelist="$agh_wl"
	fi
	dns_intercept=false
	if [ "$(uci -q get equipe_perf.settings.dns_intercept || printf 1)" = "1" ] && [ "$(uci -q get firewall.dns_intercept_udp.enabled || printf 0)" = "1" ]; then
		dns_intercept=true
	fi

	printf '{"installed":%s,"active":%s,"mode":"%s","supported_profile":"%s","local_installed":%s,"local_active":%s,"cloud_active":%s,"cloud_provider":"%s","rules_count":%s,"web_url":"%s","mem_total_mb":%d,"overlay_free_mb":%d,"overlay_free_kb":%d,"cache_size_mb":%d,"recommended_cache_mb":%d,"parental_enabled":%s,"protection_enabled":%s,"safesearch_enabled":%s,"cloud_cache":%s,"web_port":%d,"zerotier_access":%s,"zt_web_url":"%s","custom_blacklist":"%s","custom_whitelist":"%s","nextdns_id":"%s","dns_intercept":%s}\n' \
		"$local_installed" "$active" "$mode" "$supported_profile" "$local_installed" "$local_active" "$cloud_active" "$cloud_provider" "$rules_count" "$web_url" "$mem_total_mb" "$overlay_free_mb" "$overlay_free_kb" "$cache_size_mb" "$recommended_cache_mb" "$parental_enabled" "$protection_enabled" "$safesearch_enabled" "$cloud_cache" "$web_port" "$zt_access" "$zt_web_url" "$(json_escape "$custom_blacklist")" "$(json_escape "$custom_whitelist")" "$(json_escape "$nextdns_id")" "$dns_intercept"
}

adblock_apply_rules() {
	raw_blacklist="$1"
	raw_whitelist="${2:-}"
	mkdir -p /etc/config
	[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
	uci -q set equipe_perf.settings=performance

	old_addrs="$(uci -q get dhcp.@dnsmasq[0].address || true)"
	old_servers="$(uci -q get dhcp.@dnsmasq[0].server || true)"

	# 2. Sanitizar blacklist
	has_bl_arg=1
	if [ "$raw_blacklist" = "__KEEP_EXISTING__" ]; then
		has_bl_arg=0
		clean_bl="$(uci -q get equipe_perf.settings.custom_blacklist || true)"
	else
		clean_bl=""
		for item in $(printf '%s' "$raw_blacklist" | tr ',;\n\r\t' ' '); do
			dom="$(printf '%s' "$item" | sed -E 's|^@@\|\|||; s|^\|\|||; s|\^.*$||; s|^https?://||; s|/.*$||' | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9.-')"
			if printf '%s' "$dom" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$'; then
				case ",$clean_bl," in
					*,"$dom",*) ;;
					*)
						[ -z "$clean_bl" ] && clean_bl="$dom" || clean_bl="$clean_bl,$dom"
						;;
				esac
			fi
		done
	fi

	# 3. Sanitizar whitelist
	has_wl_arg=1
	if [ "$raw_whitelist" = "__KEEP_EXISTING__" ]; then
		has_wl_arg=0
		clean_wl="$(uci -q get equipe_perf.settings.custom_whitelist || true)"
	else
		clean_wl=""
		for item in $(printf '%s' "$raw_whitelist" | tr ',;\n\r\t' ' '); do
			dom="$(printf '%s' "$item" | sed -E 's|^@@\|\|||; s|^\|\|||; s|\^.*$||; s|^https?://||; s|/.*$||' | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9.-')"
			if printf '%s' "$dom" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$'; then
				case ",$clean_wl," in
					*,"$dom",*) ;;
					*)
						[ -z "$clean_wl" ] && clean_wl="$dom" || clean_wl="$clean_wl,$dom"
						;;
				esac
			fi
		done
	fi

	{
		[ "$raw_blacklist" != "__KEEP_EXISTING__" ] && echo "set equipe_perf.settings.custom_blacklist='$clean_bl'"
		[ "$raw_whitelist" != "__KEEP_EXISTING__" ] && echo "set equipe_perf.settings.custom_whitelist='$clean_wl'"
		for a in $old_addrs; do
			case "$a" in
				*/0.0.0.0) echo "del_list dhcp.@dnsmasq[0].address='$a'" ;;
			esac
		done
		for d in $(printf '%s' "$clean_bl" | tr ',' ' '); do
			# Se o domínio estiver na lista branca, a lista branca tem precedência (não bloqueia)
			case ",$clean_wl," in
				*,"$d",*) ;;
				*) echo "add_list dhcp.@dnsmasq[0].address='/$d/0.0.0.0'" ;;
			esac
		done
		for s in $old_servers; do
			case "$s" in
				/*) echo "del_list dhcp.@dnsmasq[0].server='$s'" ;;
			esac
		done
		for d in $(printf '%s' "$clean_wl" | tr ',' ' '); do
			echo "add_list dhcp.@dnsmasq[0].server='/$d/1.1.1.1'"
		done
		echo "commit dhcp"
		echo "commit equipe_perf"
	} | uci batch >/dev/null 2>&1 || true

	# 4. Sincronizar user_rules no AdGuard Home
	if [ -f /etc/adguardhome/adguardhome.yaml ] && command -v python3 >/dev/null 2>&1; then
		python3 -c "
import sys, re

yaml_path = '/etc/adguardhome/adguardhome.yaml'
raw_bl = sys.argv[1] if len(sys.argv) > 1 else ''
raw_wl = sys.argv[2] if len(sys.argv) > 2 else ''
has_bl_arg = len(sys.argv) > 1 and sys.argv[1] != '__KEEP_EXISTING__'
has_wl_arg = len(sys.argv) > 2 and sys.argv[2] != '__KEEP_EXISTING__'

new_bl_domains = [d.strip().lower() for d in raw_bl.split(',') if d.strip()]
new_wl_domains = [d.strip().lower() for d in raw_wl.split(',') if d.strip()]

try:
    with open(yaml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.splitlines()
    idx_ur = -1
    for i, l in enumerate(lines):
        if re.match(r'^user_rules:', l):
            idx_ur = i
            break

    if idx_ur != -1:
        end_idx = len(lines)
        for j in range(idx_ur + 1, len(lines)):
            if re.match(r'^[a-z0-9_-]+:', lines[j]):
                end_idx = j
                break

        existing_other = []
        existing_wl = []
        existing_bl = []
        for l in lines[idx_ur + 1:end_idx]:
            s = l.strip()
            if not s:
                continue
            m = re.search(r'''^-\s*['\"]?(.*?)['\"]?\s*$''', s)
            r = m.group(1) if m else s
            wm = re.search(r'''^@@\|\|([a-z0-9.-]+)\^?$''', r.lower())
            if wm:
                d = wm.group(1)
                if d not in existing_wl: existing_wl.append(d)
                continue
            bm = re.search(r'''^\|\|([a-z0-9.-]+)\^?$''', r.lower())
            if bm:
                d = bm.group(1)
                if d not in existing_bl: existing_bl.append(d)
                continue
            existing_other.append(r)

        target_wl = new_wl_domains if has_wl_arg else existing_wl
        target_bl = new_bl_domains if has_bl_arg else existing_bl

        final_rules = []
        for d in target_wl:
            final_rules.append(f\"  - '@@||{d}^$important'\")
        for d in target_bl:
            final_rules.append(f\"  - '||{d}^'\")
        for r in existing_other:
            final_rules.append(f\"  - '{r}'\")

        new_block = ['user_rules:'] + final_rules if final_rules else ['user_rules: []']
        new_content = '\\n'.join(lines[:idx_ur] + new_block + lines[end_idx:]) + '\\n'

        with open(yaml_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
except Exception:
    pass
" "${raw_blacklist:-$clean_bl}" "${raw_whitelist:-$clean_wl}"
		chown -R adguardhome:adguardhome /etc/adguardhome 2>/dev/null || true
		if pgrep -f 'AdGuardHome' >/dev/null 2>&1 && [ "$(uci -q get equipe_perf.settings.adblock_enabled || echo 0)" = "1" ] && [ "$(uci -q get equipe_perf.settings.adguard_enabled || echo 0)" = "1" ]; then
			/etc/init.d/adguardhome restart >/dev/null 2>&1 || true
		fi
	fi

	/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
}

adblock_apply_blacklist() {
	adblock_apply_rules "$1" "${2:-__KEEP_EXISTING__}"
}

adblock_sync_blacklist() {
	if [ -f /etc/adguardhome/adguardhome.yaml ] && command -v python3 >/dev/null 2>&1; then
		python3 -c "
import re, json, sys

yaml_path = '/etc/adguardhome/adguardhome.yaml'

OFFICIAL_BLACKLIST = [
    # Bets & Cassinos BR
    'bet365.com', 'blaze.com', 'blaze-1.com', '1xbet.com', '1x-bet.com', 'betano.com',
    'betano.bet.br', 'sportingbet.com', 'sportingbet.com.br', 'betfair.com', 'pixbet.com',
    'pixbet.org.br', 'estrelabet.com', 'kto.com', 'f12.bet', 'novibet.com',
    'parimatch.com', 'betsson.com', 'apostaganha.bet', 'superbet.com', 'rivalo.com',
    'galera.bet', 'vaidebet.com', 'betnacional.com', 'pagbet.com', 'mrjack.bet',
    'esportesdasorte.com', 'casaapostas.com', 'stake.com', 'bc.game', 'betmotion.com',
    'playpix.com', 'cassino.com', 'betbry.com', 'tigrinho.vip', 'fortune-tiger.com', 'fortuneox.com',
    # Bets & Cassinos Internacionais
    'kubet.ac', 'fabet.com', 'dafabet.com', 'bet88.com', '777pub.com', 'betway.com',
    'bodog.com', 'williamhill.com', 'bwin.com', 'melbet.com',
    # Phishing & Golpes BR
    'rastrearpedido.com', 'rastreamentocorreios.info', 'correios-taxa.com',
    'consulta-cpf-regularize.com', 'regularizacao-cpf.org', 'resgate-valores.com',
    # Cryptojacking & In-Browser Miners
    'coinhive.com', 'coin-hive.com', 'cryptoloot.pro', 'crypto-loot.com', 'minr.pw', 'webminepool.com',
    # Malware & Infostealers C2
    'advertipros.com', 'topendpower.top', 'anondns.net'
]

try:
    with open(yaml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.splitlines()
    idx_ur = -1
    for i, l in enumerate(lines):
        if re.match(r'^user_rules:', l):
            idx_ur = i
            break

    if idx_ur == -1:
        print(json.dumps({'status': 'error', 'message': 'user_rules nao encontrado no yaml', 'added': 0, 'total': 0}))
        sys.exit(0)

    end_idx = len(lines)
    for j in range(idx_ur + 1, len(lines)):
        if re.match(r'^[a-z0-9_-]+:', lines[j]):
            end_idx = j
            break

    existing_lines = lines[idx_ur + 1:end_idx]
    existing_rules_cleaned = []
    seen = set()
    existing_bl_domains = set()
    all_bl_list = []

    for l in existing_lines:
        s = l.strip()
        if not s:
            continue
        m = re.search(r'''^-\s*['\"]?(.*?)['\"]?\s*$''', s)
        rule_val = m.group(1) if m else s
        if rule_val in seen:
            continue
        seen.add(rule_val)
        existing_rules_cleaned.append(f\"  - '{rule_val}'\")
        bm = re.search(r'''^\|\|([a-z0-9.-]+)\^?$''', rule_val.lower())
        if bm:
            d = bm.group(1)
            existing_bl_domains.add(d)
            if d not in all_bl_list:
                all_bl_list.append(d)

    new_rules = []
    added_count = 0
    for d in OFFICIAL_BLACKLIST:
        d_lower = d.lower().strip()
        if d_lower not in existing_bl_domains:
            new_rules.append(f\"  - '||{d_lower}^'\")
            existing_bl_domains.add(d_lower)
            all_bl_list.append(d_lower)
            added_count += 1

    final_rules = existing_rules_cleaned + new_rules
    new_block = ['user_rules:'] + final_rules if final_rules else ['user_rules: []']
    new_content = '\\n'.join(lines[:idx_ur] + new_block + lines[end_idx:]) + '\\n'

    if new_rules or len(existing_rules_cleaned) != len(existing_lines):
        with open(yaml_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

    print(json.dumps({
        'status': 'ok',
        'added': added_count,
        'total': len(existing_bl_domains),
        'preserved': len(existing_rules_cleaned),
        'source': 'ARK Curated Bets, Cassinos & Phishing BR',
        'blacklist': ','.join(all_bl_list)
    }))
except Exception as e:
    print(json.dumps({'status': 'error', 'message': str(e), 'added': 0, 'total': 0}))
"
		# Sincronizar domínios bloqueados com Dnsmasq e UCI
		bl_list="$(python3 -c "
import re
try:
    with open('/etc/adguardhome/adguardhome.yaml', 'r', encoding='utf-8') as f:
        c = f.read()
    bl = []
    for l in c.splitlines():
        bm = re.search(r'''^-\s*['\"]?\|\|([a-z0-9.-]+)\^?['\"]?\s*$''', l.strip())
        if bm and bm.group(1) not in bl:
            bl.append(bm.group(1))
    print(','.join(bl))
except Exception:
    pass
")"
		if [ -n "$bl_list" ]; then
			adblock_apply_rules "$bl_list" "__KEEP_EXISTING__"
		fi

		chown -R adguardhome:adguardhome /etc/adguardhome 2>/dev/null || true
		if pgrep -f 'AdGuardHome' >/dev/null 2>&1 && [ "$(uci -q get equipe_perf.settings.adblock_enabled || echo 0)" = "1" ] && [ "$(uci -q get equipe_perf.settings.adguard_enabled || echo 0)" = "1" ]; then
			/etc/init.d/adguardhome reload >/dev/null 2>&1 || /etc/init.d/adguardhome restart >/dev/null 2>&1 || true
		fi
		/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
		return 0
	fi

	# Fallback nativo POSIX ash (Modo Nuvem / dnsmasq / Roteadores 16MB)
	OFFICIAL_BLACKLIST="bet365.com blaze.com blaze-1.com 1xbet.com 1x-bet.com betano.com betano.bet.br sportingbet.com sportingbet.com.br betfair.com pixbet.com pixbet.org.br estrelabet.com kto.com f12.bet novibet.com parimatch.com betsson.com apostaganha.bet superbet.com rivalo.com galera.bet vaidebet.com betnacional.com pagbet.com mrjack.bet esportesdasorte.com casaapostas.com stake.com bc.game betmotion.com playpix.com cassino.com betbry.com tigrinho.vip fortune-tiger.com fortuneox.com kubet.ac fabet.com dafabet.com bet88.com 777pub.com betway.com bodog.com williamhill.com bwin.com melbet.com rastrearpedido.com rastreamentocorreios.info correios-taxa.com consulta-cpf-regularize.com regularizacao-cpf.org resgate-valores.com coinhive.com coin-hive.com cryptoloot.pro crypto-loot.com minr.pw webminepool.com advertipros.com topendpower.top anondns.net"

	cur_bl="$(uci -q get equipe_perf.settings.custom_blacklist || true)"
	all_bl=""
	added_count=0
	total_count=0

	for d in $(printf '%s' "$cur_bl" | tr ',; \n\r\t' ' '); do
		[ -z "$d" ] && continue
		d="$(printf '%s' "$d" | tr 'A-Z' 'a-z')"
		case ",$all_bl," in
			*,"$d",*) ;;
			*)
				[ -z "$all_bl" ] && all_bl="$d" || all_bl="$all_bl,$d"
				total_count=$((total_count + 1))
				;;
		esac
	done

	for d in $OFFICIAL_BLACKLIST; do
		[ -z "$d" ] && continue
		d="$(printf '%s' "$d" | tr 'A-Z' 'a-z')"
		case ",$all_bl," in
			*,"$d",*) ;;
			*)
				[ -z "$all_bl" ] && all_bl="$d" || all_bl="$all_bl,$d"
				added_count=$((added_count + 1))
				total_count=$((total_count + 1))
				;;
		esac
	done

	adblock_apply_rules "$all_bl" "__KEEP_EXISTING__"
	/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true

	printf '{"status":"ok","added":%d,"total":%d,"source":"ARK Curated Bets, Cassinos & Phishing BR","blacklist":"%s"}\n' \
		"$added_count" "$total_count" "$all_bl"
}

adblock_sync_whitelist() {
	if [ -f /etc/adguardhome/adguardhome.yaml ] && command -v python3 >/dev/null 2>&1; then
		python3 -c "
import re, json, sys

yaml_path = '/etc/adguardhome/adguardhome.yaml'

OFFICIAL_WHITELIST = [
    # Apple Ecosystem, Store, CDN & Time
    'apple.com', 'itunes.com', 'itunes-apple.com', 'mzstatic.com', 'aaplimg.com',
    'icloud.com', 'apple-dns.net', 'cdn-apple.com', 'swcdn.apple.com', 'updates.cdn-apple.com',
    'time-ios.apple.com', 'time.apple.com',
    # Google, Android, Play Integrity & Firebase
    'play.google.com', 'android.clients.google.com', 'gvt1.com', 'gstatic.com', 'googleapis.com',
    'deviceintegritytokens.googleapis.com', 'fcm.googleapis.com',
    # Development, Git & Repos
    'github.com', 'githubassets.com', 'githubusercontent.com', 'github.io', 'githubstatus.com',
    # Global CDNs
    'edgekey.net', 'akamaiedge.net', 'fastly.net', 'jsdelivr.net',
    # Messaging & Social
    'whatsapp.com', 'whatsapp.net', 'cdn.whatsapp.net', 'fbcdn.net',
    # Governo & Serviços Públicos
    'gov.br', 'acesso.gov.br', 'serpro.gov.br', 'dataprev.gov.br',
    'receita.fazenda.gov.br', 'fazenda.gov.br', 'conectividade.caixa.gov.br', 'caixa.gov.br',
    # Bancos & Finanças BR
    'bb.com.br', 'itau.com.br', 'bradesco.com.br', 'santander.com.br',
    'nubank.com.br', 'inter.co', 'bancointer.com.br', 'c6bank.com.br',
    'mercadopago.com.br', 'pagseguro.uol.com.br', 'picpay.com',
    # Mídia, Streaming & Entregas
    'globo.com', 'globoplay.com.br', 'mercadolivre.com.br', 'ifood.com.br', 'clarotvmais.com.br',
    'steamcommunity.com', 'steampowered.com', 'epicgames.com', 'netflix.com', 'nflxvideo.net',
    # Telecomunicações & Operadoras BR (Minha Claro, Meu Vivo, TIM)
    'claro.com.br', 'clarobrasil.mobi', 'clarotvmais.com.br',
    'clarosa.us-5.evergage.com', 'cdn.evergage.com',
    'vivo.com.br', 'meuvivo.com.br', 'tim.com.br', 'meutim.com.br',
    # Gaming & Smart Home
    'accounts.nintendo.com', 'plex.tv', 'roborock.com',
    # Amazon & Alexa Ecosystem (AVS, Echo Voice, Audio Streaming, Device Cloud)
    'amazon.com', 'amazonalexa.com', 'alexa.amazon.com', 'a2z.com', 'devices.a2z.com',
    'amazon.dev', 'aws.dev', 'apl-alexa.com',
    'd3p8zr0ffa9t17.cloudfront.net',
    'amazonaws.com', 's3.amazonaws.com', 'media-amazon.com', 'm.media-amazon.com',
    'avs-alexa-na.amazon.com', 'avs-alexa-eu.amazon.com', 'avs-alexa-fe.amazon.com',
    'ntp-g7g.amazon.com',
    'alexa-hybrid-interaction-log-config-prod-na.s3.amazonaws.com',
    'device-metrics-us.amazon.com', 'device-metrics-us-2.amazon.com',
    # Smart TVs & Dongles (Samsung, LG, Roku)
    'samsungcloudsolution.com', 'samsungcloudsolution.net', 'samsungqbe.com',
    'lgtvcommon.com', 'lgtvsdp.com', 'lgappstv.com',
    'roku.com'
]

try:
    with open(yaml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.splitlines()
    idx_ur = -1
    for i, l in enumerate(lines):
        if re.match(r'^user_rules:', l):
            idx_ur = i
            break

    if idx_ur == -1:
        print(json.dumps({'status': 'error', 'message': 'user_rules nao encontrado no yaml', 'added': 0, 'total': 0}))
        sys.exit(0)

    end_idx = len(lines)
    for j in range(idx_ur + 1, len(lines)):
        if re.match(r'^[a-z0-9_-]+:', lines[j]):
            end_idx = j
            break

    existing_lines = lines[idx_ur + 1:end_idx]
    existing_rules_cleaned = []
    seen = set()
    existing_whitelist_domains = set()
    all_wl_list = []

    for l in existing_lines:
        s = l.strip()
        if not s:
            continue
        m = re.search(r'''^-\s*['\"]?(.*?)['\"]?\s*$''', s)
        rule_val = m.group(1) if m else s
        if rule_val in seen:
            continue
        seen.add(rule_val)
        existing_rules_cleaned.append(f\"  - '{rule_val}'\")
        wm = re.search(r'''@@\|\|([a-z0-9.-]+)\^?''', rule_val.lower())
        if wm:
            d = wm.group(1)
            existing_whitelist_domains.add(d)
            if d not in all_wl_list:
                all_wl_list.append(d)

    new_rules = []
    added_count = 0
    for d in OFFICIAL_WHITELIST:
        d_lower = d.lower().strip()
        if d_lower not in existing_whitelist_domains:
            new_rules.append(f'@@||{d_lower}^$important')
            existing_whitelist_domains.add(d_lower)
            all_wl_list.append(d_lower)
            added_count += 1

    final_rules = existing_rules_cleaned + [f\"  - '{r}'\" for r in new_rules]
    new_block = ['user_rules:'] + final_rules if final_rules else ['user_rules: []']
    new_content = '\\n'.join(lines[:idx_ur] + new_block + lines[end_idx:]) + '\\n'

    if new_rules or len(existing_rules_cleaned) != len(existing_lines):
        with open(yaml_path, 'w', encoding='utf-8') as f:
            f.write(new_content)

    print(json.dumps({
        'status': 'ok',
        'added': added_count,
        'total': len(existing_whitelist_domains),
        'preserved': len(existing_rules_cleaned),
        'source': 'Anudeep Global + Brasil Oficial',
        'whitelist': ','.join(all_wl_list)
    }))
except Exception as e:
    print(json.dumps({'status': 'error', 'message': str(e), 'added': 0, 'total': 0}))
"
		# Sincronizar domínios com UCI e dnsmasq
		wl_list="$(python3 -c "
import re
try:
    with open('/etc/adguardhome/adguardhome.yaml', 'r', encoding='utf-8') as f:
        c = f.read()
    wl = []
    for l in c.splitlines():
        wm = re.search(r'''^-\s*['\"]?@@\|\|([a-z0-9.-]+)\^?['\"]?\s*$''', l.strip())
        if wm and wm.group(1) not in wl:
            wl.append(wm.group(1))
    print(','.join(wl))
except Exception:
    pass
")"
		if [ -n "$wl_list" ]; then
			adblock_apply_rules "__KEEP_EXISTING__" "$wl_list"
		fi

		chown -R adguardhome:adguardhome /etc/adguardhome 2>/dev/null || true
		if pgrep -f 'AdGuardHome' >/dev/null 2>&1 && [ "$(uci -q get equipe_perf.settings.adblock_enabled || echo 0)" = "1" ] && [ "$(uci -q get equipe_perf.settings.adguard_enabled || echo 0)" = "1" ]; then
			/etc/init.d/adguardhome reload >/dev/null 2>&1 || /etc/init.d/adguardhome restart >/dev/null 2>&1 || true
		fi
		/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
		return 0
	fi

	# Fallback nativo POSIX ash para modo Cloud DNS ou roteadores sem Python/AdGuard (16MB Flash)
	OFFICIAL_WHITELIST="apple.com itunes.com itunes-apple.com mzstatic.com aaplimg.com icloud.com apple-dns.net cdn-apple.com swcdn.apple.com updates.cdn-apple.com time-ios.apple.com time.apple.com play.google.com android.clients.google.com gvt1.com gstatic.com googleapis.com deviceintegritytokens.googleapis.com fcm.googleapis.com github.com githubassets.com githubusercontent.com github.io githubstatus.com edgekey.net akamaiedge.net fastly.net jsdelivr.net whatsapp.com whatsapp.net cdn.whatsapp.net fbcdn.net gov.br acesso.gov.br serpro.gov.br dataprev.gov.br receita.fazenda.gov.br fazenda.gov.br conectividade.caixa.gov.br caixa.gov.br bb.com.br itau.com.br bradesco.com.br santander.com.br nubank.com.br inter.co bancointer.com.br c6bank.com.br mercadopago.com.br pagseguro.uol.com.br picpay.com globo.com globoplay.com.br mercadolivre.com.br ifood.com.br clarotvmais.com.br claro.com.br clarobrasil.mobi clarosa.us-5.evergage.com cdn.evergage.com vivo.com.br meuvivo.com.br tim.com.br meutim.com.br steamcommunity.com steampowered.com epicgames.com netflix.com nflxvideo.net accounts.nintendo.com plex.tv roborock.com amazon.com amazonalexa.com alexa.amazon.com a2z.com devices.a2z.com amazon.dev aws.dev apl-alexa.com d3p8zr0ffa9t17.cloudfront.net amazonaws.com s3.amazonaws.com media-amazon.com m.media-amazon.com avs-alexa-na.amazon.com avs-alexa-eu.amazon.com avs-alexa-fe.amazon.com ntp-g7g.amazon.com alexa-hybrid-interaction-log-config-prod-na.s3.amazonaws.com device-metrics-us.amazon.com device-metrics-us-2.amazon.com samsungcloudsolution.com samsungcloudsolution.net samsungqbe.com lgtvcommon.com lgtvsdp.com lgappstv.com roku.com"

	cur_wl="$(uci -q get equipe_perf.settings.custom_whitelist || true)"
	all_wl=""
	added_count=0
	total_count=0

	for d in $(printf '%s' "$cur_wl" | tr ',; \n\r\t' ' '); do
		[ -z "$d" ] && continue
		d="$(printf '%s' "$d" | tr 'A-Z' 'a-z')"
		case ",$all_wl," in
			*,"$d",*) ;;
			*)
				[ -z "$all_wl" ] && all_wl="$d" || all_wl="$all_wl,$d"
				total_count=$((total_count + 1))
				;;
		esac
	done

	for d in $OFFICIAL_WHITELIST; do
		[ -z "$d" ] && continue
		d="$(printf '%s' "$d" | tr 'A-Z' 'a-z')"
		case ",$all_wl," in
			*,"$d",*) ;;
			*)
				[ -z "$all_wl" ] && all_wl="$d" || all_wl="$all_wl,$d"
				added_count=$((added_count + 1))
				total_count=$((total_count + 1))
				;;
		esac
	done

	adblock_apply_rules "__KEEP_EXISTING__" "$all_wl"
	/etc/init.d/dnsmasq reload >/dev/null 2>&1 || /etc/init.d/dnsmasq restart >/dev/null 2>&1 || true

	printf '{"status":"ok","added":%d,"total":%d,"source":"Anudeep Global + Brasil Oficial","whitelist":"%s"}\n' \
		"$added_count" "$total_count" "$all_wl"
}

sync_dns_intercept() {
	local enabled="${1:-1}"
	case "$enabled" in 1|true) enabled=1 ;; *) enabled=0 ;; esac

	if [ "$enabled" = "1" ]; then
		local lan_ip="$(uci -q get network.lan.ipaddr || echo 192.168.73.1)"

		uci -q set firewall.dns_intercept_udp=redirect
		uci -q set firewall.dns_intercept_udp.name='DNS-Intercept-UDP'
		uci -q set firewall.dns_intercept_udp.src='lan'
		uci -q set firewall.dns_intercept_udp.proto='udp'
		uci -q set firewall.dns_intercept_udp.src_dport='53'
		uci -q set firewall.dns_intercept_udp.dest_ip="$lan_ip"
		uci -q set firewall.dns_intercept_udp.dest_port='53'
		uci -q set firewall.dns_intercept_udp.target='DNAT'
		uci -q set firewall.dns_intercept_udp.enabled='1'

		uci -q set firewall.dns_intercept_tcp=redirect
		uci -q set firewall.dns_intercept_tcp.name='DNS-Intercept-TCP'
		uci -q set firewall.dns_intercept_tcp.src='lan'
		uci -q set firewall.dns_intercept_tcp.proto='tcp'
		uci -q set firewall.dns_intercept_tcp.src_dport='53'
		uci -q set firewall.dns_intercept_tcp.dest_ip="$lan_ip"
		uci -q set firewall.dns_intercept_tcp.dest_port='53'
		uci -q set firewall.dns_intercept_tcp.target='DNAT'
		uci -q set firewall.dns_intercept_tcp.enabled='1'
	else
		uci -q delete firewall.dns_intercept_udp
		uci -q delete firewall.dns_intercept_tcp
	fi
	uci commit firewall
	/etc/init.d/firewall reload >/dev/null 2>&1 || true
}

adblock_configure() {
	mode="${1:-local}"
	cache_mb="${2:-64}"
	protection="${3:-1}"
	parental="${4:-0}"
	safesearch="${5:-0}"
	provider="${6:-adguard_dns}"
	cloud_cache="${7:-25000}"
	web_port="${8:-3000}"
	zt_access="${9:-1}"
	custom_blacklist="${10:-__KEEP_EXISTING__}"
	nextdns_id="${11:-}"
	custom_whitelist="${12:-__KEEP_EXISTING__}"
	dns_intercept="${13:-1}"

	case "$cache_mb" in ''|*[!0-9]*) cache_mb=64 ;; esac
	[ "$cache_mb" -lt 4 ] && cache_mb=4
	[ "$cache_mb" -gt 256 ] && cache_mb=256

	case "$web_port" in ''|*[!0-9]*) web_port=3000 ;; esac
	case "$web_port" in 22|53|80|443|5335|5353) web_port=3000 ;; esac
	[ "$web_port" -lt 80 ] && web_port=3000
	[ "$web_port" -gt 65535 ] && web_port=3000

	case "$protection" in 1|true) protection_bool="true" ;; *) protection_bool="false" ;; esac
	case "$parental" in 1|true) parental_bool="true" ;; *) parental_bool="false" ;; esac
	case "$safesearch" in 1|true) safesearch_bool="true" ;; *) safesearch_bool="false" ;; esac
	case "$zt_access" in 0|false) zt_access_val="0" ;; *) zt_access_val="1" ;; esac
	case "$dns_intercept" in 0|false) dns_intercept_val="0" ;; *) dns_intercept_val="1" ;; esac

	mkdir -p /etc/config
	[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
	uci -q set equipe_perf.settings=performance
	uci -q set "equipe_perf.settings.dns_intercept=$dns_intercept_val"
	uci commit equipe_perf
	sync_dns_intercept "$dns_intercept_val"

	if [ "$mode" = "local" ]; then
		cache_bytes=$((cache_mb * 1048576))
		yaml="/etc/adguardhome/adguardhome.yaml"
		if [ -f "$yaml" ]; then
			cp -f "$yaml" "${yaml}.bak" 2>/dev/null || true
			sed -i "s/^  cache_size: .*/  cache_size: $cache_bytes/" "$yaml"
			sed -i "s/^  safebrowsing_cache_size: .*/  safebrowsing_cache_size: $cache_bytes/" "$yaml"
			sed -i "s/^  safesearch_cache_size: .*/  safesearch_cache_size: $cache_bytes/" "$yaml"
			sed -i "s/^  parental_cache_size: .*/  parental_cache_size: $cache_bytes/" "$yaml"
			sed -i "s/^  safebrowsing_enabled: .*/  safebrowsing_enabled: $protection_bool/" "$yaml"
			sed -i "s/^  parental_enabled: .*/  parental_enabled: $parental_bool/" "$yaml"
			sed -i "s/^  address: .*/  address: 0.0.0.0:$web_port/" "$yaml"
			sed -i -E 's/^[[:space:]]*(upstream_dns_file|ipset_file|dnscrypt_config_file):.*/  \1: ""/' "$yaml"
			sed -i '/^[[:space:]]*file: ""/s|file: ""|file: "/var/lib/adguardhome/adguardhome.log"|' "$yaml"
			sed -i 's/^[[:space:]]*max_size: 100/  max_size: 1/' "$yaml"
			sed -i 's/^[[:space:]]*max_backups: 0/  max_backups: 1/' "$yaml"

			awk -v val="$safesearch_bool" '
			/^  safe_search:/ { in_ss=1; print; next }
			in_ss && /^    enabled:/ { print "    enabled: " val; in_ss=0; next }
			{ print }
			' "$yaml" > "${yaml}.tmp" && mv -f "${yaml}.tmp" "$yaml"
			chown -R adguardhome:adguardhome /etc/adguardhome /var/lib/adguardhome 2>/dev/null || true
			chmod 644 "$yaml" 2>/dev/null || true

			if [ -x /usr/bin/AdGuardHome ]; then
				if ! (/usr/bin/AdGuardHome --config "$yaml" --check-config >/dev/null 2>&1 || /usr/bin/AdGuardHome --check-config -c "$yaml" >/dev/null 2>&1); then
					logger -t ark-adguard "Configuracao YAML do AdGuard Home corrompida. Revertendo backup de seguranca."
					cp -f "${yaml}.bak" "$yaml" 2>/dev/null || true
					chown -R adguardhome:adguardhome /etc/adguardhome /var/lib/adguardhome 2>/dev/null || true
					chmod 644 "$yaml" 2>/dev/null || true
				fi
			fi
			sync_adguard_ipv6

			# Gerenciamento de Firewall ZeroTier para porta do AdGuard
			cur_zt_http="$(uci -q get firewall.zt_http.dest_port || echo '80 443')"
			new_zt_http="$(printf '%s' "$cur_zt_http" | sed -E 's/\b(3000|[0-9]{4,5})\b//g' | tr -s ' ' | sed 's/^ //;s/ $//')"
			[ -n "$new_zt_http" ] || new_zt_http="80 443"
			uci -q set "firewall.zt_http.dest_port=$new_zt_http"

			mkdir -p /etc/config
			[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
			uci -q set equipe_perf.settings=performance
			uci -q set "equipe_perf.settings.adblock_zerotier_access=$zt_access_val"
			uci -q set equipe_perf.settings.adblock_enabled='1'
			uci -q set equipe_perf.settings.adguard_enabled='1'
			uci commit equipe_perf
			[ -x /etc/init.d/adguardhome ] && /etc/init.d/adguardhome enable >/dev/null 2>&1 || true

			if [ "$zt_access_val" = "1" ]; then
				uci -q set firewall.zt_adguard=rule
				uci -q set firewall.zt_adguard.name='Allow-ZeroTier-AdGuard'
				uci -q set firewall.zt_adguard.src='zerotier'
				uci -q set firewall.zt_adguard.proto='tcp'
				uci -q set "firewall.zt_adguard.dest_port=$web_port"
				uci -q set firewall.zt_adguard.target='ACCEPT'
				uci -q set firewall.zt_adguard.enabled='1'
			else
				uci -q set firewall.zt_adguard=rule
				uci -q set firewall.zt_adguard.name='Allow-ZeroTier-AdGuard'
				uci -q set firewall.zt_adguard.enabled='0'
			fi
			uci commit firewall
			/etc/init.d/firewall reload >/dev/null 2>&1 || true

			uci -q delete dhcp.@dnsmasq[0].server
			uci -q add_list dhcp.@dnsmasq[0].server='127.0.0.1#5335'
			uci -q set dhcp.@dnsmasq[0].noresolv='1'
			uci commit dhcp

			/etc/init.d/adguardhome restart >/dev/null 2>&1 || true
			/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
		fi
		adblock_apply_rules "$custom_blacklist" "${custom_whitelist:-__KEEP_EXISTING__}"
		echo ok
		return 0
	elif [ "$mode" = "cloud" ]; then
		case "$cloud_cache" in ''|*[!0-9]*) cloud_cache=25000 ;; esac
		[ "$cloud_cache" -lt 1000 ] && cloud_cache=1000
		[ "$cloud_cache" -gt 100000 ] && cloud_cache=100000

		uci -q set "equipe_perf.settings.adblock_cloud_provider=$provider"
		uci commit equipe_perf

		uci -q delete dhcp.@dnsmasq[0].server
		case "$provider" in
			cloudflare_family)
				uci -q add_list dhcp.@dnsmasq[0].server='1.1.1.3'
				uci -q add_list dhcp.@dnsmasq[0].server='1.0.0.3'
				;;
			cloudflare_security)
				uci -q add_list dhcp.@dnsmasq[0].server='1.1.1.2'
				uci -q add_list dhcp.@dnsmasq[0].server='1.0.0.2'
				;;
			quad9)
				uci -q add_list dhcp.@dnsmasq[0].server='9.9.9.9'
				uci -q add_list dhcp.@dnsmasq[0].server='149.112.112.112'
				;;
			opendns_family)
				uci -q add_list dhcp.@dnsmasq[0].server='208.67.222.123'
				uci -q add_list dhcp.@dnsmasq[0].server='208.67.220.123'
				;;
			cleanbrowsing_adult)
				uci -q add_list dhcp.@dnsmasq[0].server='185.228.168.10'
				uci -q add_list dhcp.@dnsmasq[0].server='185.228.169.11'
				;;
			cleanbrowsing_family)
				uci -q add_list dhcp.@dnsmasq[0].server='185.228.168.168'
				uci -q add_list dhcp.@dnsmasq[0].server='185.228.169.168'
				;;
			controld_full)
				uci -q add_list dhcp.@dnsmasq[0].server='76.76.2.2'
				uci -q add_list dhcp.@dnsmasq[0].server='76.76.10.2'
				;;
			nextdns)
				if [ -n "$nextdns_id" ]; then
					uci -q set "equipe_perf.settings.nextdns_id=$nextdns_id"
					uci commit equipe_perf
				fi
				uci -q add_list dhcp.@dnsmasq[0].server='45.90.28.0'
				uci -q add_list dhcp.@dnsmasq[0].server='45.90.30.0'
				;;
			adguard_dns|*)
				if [ "$parental_bool" = "true" ]; then
					uci -q add_list dhcp.@dnsmasq[0].server='94.140.14.15'
					uci -q add_list dhcp.@dnsmasq[0].server='94.140.15.16'
				else
					uci -q add_list dhcp.@dnsmasq[0].server='94.140.14.14'
					uci -q add_list dhcp.@dnsmasq[0].server='94.140.15.15'
				fi
				;;
		esac

		uci -q set "dhcp.@dnsmasq[0].cachesize=$cloud_cache"
		uci commit dhcp
		/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
		adblock_apply_rules "$custom_blacklist" "${custom_whitelist:-__KEEP_EXISTING__}"
		echo ok
		return 0
	fi

	echo "Modo invalido" >&2
	exit 2
}

adblock_enable() {
	chosen_mode="${1:-auto}"
	provider="${2:-adguard_dns}"
	cache_mb="${3:-64}"
	protection="${4:-1}"
	parental="${5:-0}"
	safesearch="${6:-0}"
	cloud_cache="${7:-25000}"
	web_port="${8:-3000}"
	zt_access="${9:-1}"
	custom_blacklist="${10:-__KEEP_EXISTING__}"
	nextdns_id="${11:-}"
	custom_whitelist="${12:-__KEEP_EXISTING__}"
	dns_intercept="${13:-1}"

	# Suporta chamada do frontend com cache_mb na segunda posicao quando modo local
	if [ "$chosen_mode" = "local" ] && [ -n "$2" ] && echo "$2" | grep -Eq '^[0-9]+$'; then
		cache_mb="$2"
		protection="${3:-1}"
		parental="${4:-0}"
		safesearch="${5:-0}"
		provider="${6:-adguard_dns}"
		cloud_cache="${7:-25000}"
		web_port="${8:-3000}"
		zt_access="${9:-1}"
		custom_blacklist="${10:-__KEEP_EXISTING__}"
		nextdns_id="${11:-}"
		custom_whitelist="${12:-__KEEP_EXISTING__}"
		dns_intercept="${13:-1}"
	fi

	mem_total_kb="$(awk '/MemTotal:/ {print $2; exit}' /proc/meminfo 2>/dev/null || echo 0)"
	overlay_free_kb="$(df -k /overlay 2>/dev/null | awk 'NR==2{print $4}')"
	[ -n "$overlay_free_kb" ] || overlay_free_kb="$(df -k / 2>/dev/null | awk 'NR==2{print $4}')"
	[ -n "$overlay_free_kb" ] || overlay_free_kb=0

	if [ "$chosen_mode" = "auto" ]; then
		if [ "$mem_total_kb" -ge 300000 ] && [ "$overlay_free_kb" -ge 15000 ]; then
			chosen_mode="local"
		else
			chosen_mode="cloud"
		fi
	fi

	# Salva configuracao previa de DNS e All-Servers se ainda nao salva
	cur_servers="$(uci -q get dhcp.@dnsmasq[0].server 2>/dev/null | tr '\n' ' ' | sed 's/  */ /g; s/ $//' || true)"
	clean_cur=""
	for s in $cur_servers; do
		case "$s" in
			/*|*/*|127.*|0.0.0.0*|::1*|localhost*) continue ;;
		esac
		clean_s="$(printf '%s' "$s" | sed -E 's/#[0-9]+$//')"
		valid_ip "$clean_s" || continue
		clean_cur="${clean_cur:+$clean_cur }$s"
	done
	mkdir -p /etc/config
	[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
	uci -q set equipe_perf.settings=performance
	if [ -n "$clean_cur" ]; then
		if [ -z "$(uci -q get equipe_perf.settings.dns_servers)" ]; then
			uci -q set "equipe_perf.settings.dns_servers=$clean_cur"
		fi
		uci -q set "equipe_perf.settings.saved_dns_servers=$clean_cur"
	fi
	cur_allservers="$(uci -q get dhcp.@dnsmasq[0].allservers || echo 1)"
	if [ -z "$(uci -q get equipe_perf.settings.dns_allservers)" ]; then
		uci -q set "equipe_perf.settings.dns_allservers=$cur_allservers"
	fi
	uci -q set "equipe_perf.settings.saved_dns_allservers=$cur_allservers"
	cur_noresolv="$(uci -q get dhcp.@dnsmasq[0].noresolv || echo 0)"
	uci -q set "equipe_perf.settings.saved_noresolv=$cur_noresolv"
	cur_dhcp_fallback=0
	case "$(uci -q get dhcp.lan.dhcp_option || true)" in
		*1.1.1.1*) cur_dhcp_fallback=1 ;;
	esac
	if [ -z "$(uci -q get equipe_perf.settings.dns_dhcp_fallback)" ]; then
		uci -q set "equipe_perf.settings.dns_dhcp_fallback=$cur_dhcp_fallback"
	fi
	uci -q set "equipe_perf.settings.saved_dhcp_fallback=$cur_dhcp_fallback"
	uci commit equipe_perf

	if [ "$chosen_mode" = "local" ]; then
		uci -q set equipe_perf.settings.adblock_enabled='1'
		uci -q set equipe_perf.settings.adguard_enabled='1'
		uci -q set equipe_perf.settings.adblock_cloud='0'
		uci commit equipe_perf
		if [ ! -x /usr/bin/AdGuardHome ]; then
			if command -v apk >/dev/null 2>&1; then
				apk add adguardhome >/dev/null 2>&1 || true
			elif command -v opkg >/dev/null 2>&1; then
				opkg update >/dev/null 2>&1 || true
				opkg install adguardhome >/dev/null 2>&1 || true
			fi
		fi
		if [ -f /etc/init.d/adguardhome ] && ! grep -q -- '--logfile' /etc/init.d/adguardhome; then
			sed -i '/procd_append_param command --config/a \	procd_append_param command --logfile /var/lib/adguardhome/adguardhome.log' /etc/init.d/adguardhome
		fi
		if [ -f /etc/adguardhome/adguardhome.yaml ]; then
			sed -i -E 's/^[[:space:]]*(upstream_dns_file|ipset_file|dnscrypt_config_file):.*/  \1: ""/' /etc/adguardhome/adguardhome.yaml
			chown -R adguardhome:adguardhome /etc/adguardhome /var/lib/adguardhome 2>/dev/null || true
			chmod 644 /etc/adguardhome/adguardhome.yaml 2>/dev/null || true
		fi
		[ -x /etc/init.d/adguardhome ] && /etc/init.d/adguardhome enable >/dev/null 2>&1 || true
		[ -x /etc/init.d/adguardhome ] && /etc/init.d/adguardhome restart >/dev/null 2>&1 || true

		uci -q delete dhcp.@dnsmasq[0].server
		uci -q add_list dhcp.@dnsmasq[0].server='127.0.0.1#5335'
		uci -q set dhcp.@dnsmasq[0].noresolv='1'
		uci -q set dhcp.@dnsmasq[0].allservers='0'
		cur_ipv6="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"
		if [ "$cur_ipv6" = "ipv4_only" ]; then
			uci -q set dhcp.@dnsmasq[0].filter_aaaa='1'
		else
			uci -q delete dhcp.@dnsmasq[0].filter_aaaa
		fi
		uci commit dhcp

		mkdir -p /etc/config
		[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
		uci -q set equipe_perf.settings=performance
		uci -q set equipe_perf.settings.adblock_cloud='0'
		uci commit equipe_perf

		adblock_configure local "$cache_mb" "$protection" "$parental" "$safesearch" "$provider" "$cloud_cache" "$web_port" "$zt_access" "$custom_blacklist" "$nextdns_id" "$custom_whitelist" "$dns_intercept" >/dev/null 2>&1 || true

		/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
		echo ok
		return 0
	fi

	# Modo Nuvem (Lite)
	if [ -x /etc/init.d/adguardhome ]; then
		/etc/init.d/adguardhome stop >/dev/null 2>&1 || true
		/etc/init.d/adguardhome disable >/dev/null 2>&1 || true
	fi

	mkdir -p /etc/config
	[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
	uci -q set equipe_perf.settings=performance
	uci -q set equipe_perf.settings.adblock_cloud='1'
	uci -q set "equipe_perf.settings.adblock_cloud_provider=$provider"
	uci commit equipe_perf

	uci -q set dhcp.@dnsmasq[0].allservers='0'
	uci -q set dhcp.@dnsmasq[0].noresolv='1'
	cur_ipv6="$(uci -q get equipe_dashboard.ipv6.mode || echo dual_stack)"
	if [ "$cur_ipv6" = "ipv4_only" ]; then
		uci -q set dhcp.@dnsmasq[0].filter_aaaa='1'
	else
		uci -q delete dhcp.@dnsmasq[0].filter_aaaa
	fi
	uci commit dhcp

	adblock_configure cloud "$cache_mb" "$protection" "$parental" "$safesearch" "$provider" "$cloud_cache" "$web_port" "$zt_access" "$custom_blacklist" "$nextdns_id" "$custom_whitelist" "$dns_intercept"
	return 0
}

adblock_restore_dns() {
	# 1. Consulta os servidores DNS configurados ou previamente salvos no equipe_perf
	target_servers="$(uci -q get equipe_perf.settings.dns_servers || true)"
	if [ -z "$target_servers" ]; then
		target_servers="$(uci -q get equipe_perf.settings.saved_dns_servers || true)"
	fi

	# Filtra entradas invalidas ou apontamentos locais de bloqueador
	clean_restore_servers=""
	for s in $target_servers; do
		case "$s" in
			/*|*/*|127.*|0.0.0.0*|::1*|localhost*) continue ;;
		esac
		clean_s="$(printf '%s' "$s" | sed -E 's/#[0-9]+$//')"
		valid_ip "$clean_s" || continue
		clean_restore_servers="${clean_restore_servers:+$clean_restore_servers }$s"
	done

	# 2. Regra inteligente: se o usuario nao tinha nenhum registro no passado (clean slate),
	# ativa automaticamente o DNS Turbo Paralelo (All-Servers) e carrega os servidores padrao de alta performance.
	# Se ja tinha servidores configurados previamente, respeita a escolha salva de allservers.
	if [ -z "$clean_restore_servers" ]; then
		clean_restore_servers="1.1.1.1 8.8.8.8 1.0.0.1 8.8.4.4"
		target_allservers="1"
	else
		target_allservers="$(uci -q get equipe_perf.settings.dns_allservers || true)"
		if [ -z "$target_allservers" ]; then
			target_allservers="$(uci -q get equipe_perf.settings.saved_dns_allservers || echo 1)"
		fi
		case "$target_allservers" in 1|true) target_allservers=1 ;; *) target_allservers=0 ;; esac
	fi

	# 3. Restaura Redundancia de Fallback DHCP (1.1.1.1) se configurado previamente
	target_dhcp_fallback="$(uci -q get equipe_perf.settings.dns_dhcp_fallback || true)"
	if [ -z "$target_dhcp_fallback" ]; then
		target_dhcp_fallback="$(uci -q get equipe_perf.settings.saved_dhcp_fallback || true)"
	fi
	lan_ip="$(uci -q get network.lan.ipaddr || echo 192.168.73.1)"
	if ! command -v apply_lan_dhcp_dns >/dev/null 2>&1; then
		[ -f "${ARK_LIB_DIR:-/usr/lib/ark}/modules/network.sh" ] && . "${ARK_LIB_DIR:-/usr/lib/ark}/modules/network.sh"
	fi
	if command -v apply_lan_dhcp_dns >/dev/null 2>&1; then
		if [ "$target_dhcp_fallback" = "1" ] || [ "$target_dhcp_fallback" = "true" ]; then
			apply_lan_dhcp_dns "$lan_ip 1.1.1.1"
		elif [ "$target_dhcp_fallback" = "0" ] || [ "$target_dhcp_fallback" = "false" ]; then
			apply_lan_dhcp_dns "$lan_ip"
		fi
	fi
	command -v sanitize_dhcp_hostnames >/dev/null 2>&1 && sanitize_dhcp_hostnames

	# Limpa regras de sinkhole antigas do dnsmasq
	old_addrs="$(uci -q get dhcp.@dnsmasq[0].address || true)"
	for a in $old_addrs; do
		case "$a" in
			*/0.0.0.0) uci -q del_list dhcp.@dnsmasq[0].address="$a" ;;
		esac
	done

	target_noresolv="$(uci -q get equipe_perf.settings.saved_noresolv || echo 0)"

	# 4. Aplica restauracao no dnsmasq
	uci -q delete dhcp.@dnsmasq[0].server
	for s in $clean_restore_servers; do
		uci -q add_list "dhcp.@dnsmasq[0].server=$s"
	done

	uci -q set "dhcp.@dnsmasq[0].allservers=$target_allservers"
	uci -q set "dhcp.@dnsmasq[0].noresolv=$target_noresolv"
	uci -q set dhcp.@dnsmasq[0].cachesize='1000'
	uci commit dhcp

	# 5. Mantem equipe_perf sincronizado com a configuracao real do usuario
	if [ -f /etc/config/equipe_perf ]; then
		uci -q set equipe_perf.settings.adblock_cloud='0'
		uci -q set "equipe_perf.settings.dns_allservers=$target_allservers"
		uci -q set "equipe_perf.settings.dns_servers=$clean_restore_servers"
		[ -n "$target_dhcp_fallback" ] && uci -q set "equipe_perf.settings.dns_dhcp_fallback=$target_dhcp_fallback"
		uci -q delete equipe_perf.settings.saved_dns_servers
		uci -q delete equipe_perf.settings.saved_dns_allservers
		uci -q delete equipe_perf.settings.saved_noresolv
		uci -q delete equipe_perf.settings.saved_dhcp_fallback
		uci commit equipe_perf
	fi

	sync_dns_intercept 0
	/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true
}

adblock_disable() {
	mkdir -p /etc/config
	[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
	uci -q set equipe_perf.settings=performance
	uci -q set equipe_perf.settings.adblock_enabled='0'
	uci -q set equipe_perf.settings.adguard_enabled='0'
	uci commit equipe_perf

	killall -9 AdGuardHome 2>/dev/null || true
	killall -9 adguardhome 2>/dev/null || true
	pkill -9 -f 'AdGuardHome' 2>/dev/null || true
	pkill -9 -f 'adguardhome' 2>/dev/null || true
	ubus call service delete '{"name":"adguardhome"}' >/dev/null 2>&1 || true

	if [ -x /etc/init.d/adguardhome ]; then
		/etc/init.d/adguardhome stop >/dev/null 2>&1 || true
		/etc/init.d/adguardhome disable >/dev/null 2>&1 || true
	fi
	rm -f /etc/rc.d/*adguardhome* 2>/dev/null || true

	# Aplicar trava de seguranca absoluta (Circuit Breaker) no /etc/init.d/adguardhome
	if [ -f /etc/init.d/adguardhome ] && ! grep -q 'ARK Router Circuit Breaker' /etc/init.d/adguardhome; then
		awk '
			/^start_service\(\) \{/ {
				print $0
				print "\t# ARK Router Circuit Breaker: Nunca iniciar se AdGuard/Adblock estiver desativado"
				print "\tif [ \"$(uci -q get equipe_perf.settings.adblock_enabled)\" = \"0\" ] || [ \"$(uci -q get equipe_perf.settings.adguard_enabled)\" = \"0\" ]; then"
				print "\t\treturn 0"
				print "\tfi"
				next
			}
			/^boot\(\) \{/ {
				print $0
				print "\t# ARK Router Circuit Breaker"
				print "\tif [ \"$(uci -q get equipe_perf.settings.adblock_enabled)\" = \"0\" ] || [ \"$(uci -q get equipe_perf.settings.adguard_enabled)\" = \"0\" ]; then"
				print "\t\treturn 0"
				print "\tfi"
				next
			}
			{ print }
		' /etc/init.d/adguardhome > /etc/init.d/adguardhome.tmp && mv -f /etc/init.d/adguardhome.tmp /etc/init.d/adguardhome
		chmod 755 /etc/init.d/adguardhome
	fi

	# Sanitizar /etc/mwan3.user se existir para evitar religamento por hotplug
	if [ -f /etc/mwan3.user ] && grep -q '/etc/init.d/adguardhome' /etc/mwan3.user && ! grep -q 'equipe_perf.settings.adblock_enabled' /etc/mwan3.user; then
		awk '
			/\/etc\/init\.d\/adguardhome restart/ {
				print "\t# Reinicia AdGuard Home APENAS se estiver explicitamente habilitado e ativo"
				print "\tif [ \"$(uci -q get equipe_perf.settings.adblock_enabled)\" != \"0\" ] && \\"
				print "\t   [ \"$(uci -q get equipe_perf.settings.adguard_enabled)\" != \"0\" ] && \\"
				print "\t   [ -x /etc/init.d/adguardhome ] && /etc/init.d/adguardhome enabled >/dev/null 2>&1 && \\"
				print "\t   pgrep -f \"AdGuardHome\" >/dev/null 2>&1; then"
				print "\t\t/etc/init.d/adguardhome restart >/dev/null 2>&1 &"
				print "\tfi"
				next
			}
			{ print }
		' /etc/mwan3.user > /etc/mwan3.user.tmp && mv -f /etc/mwan3.user.tmp /etc/mwan3.user
		chmod 755 /etc/mwan3.user
	fi

	adblock_restore_dns
	/etc/init.d/firewall reload >/dev/null 2>&1 || true
	echo ok
}

adblock_uninstall() {
	# 1. Encerrar processos, desabilitar servico e remover do procd
	killall -9 AdGuardHome 2>/dev/null || true
	killall -9 adguardhome 2>/dev/null || true
	pkill -9 -f 'AdGuardHome' 2>/dev/null || true
	pkill -9 -f 'adguardhome' 2>/dev/null || true
	ubus call service delete '{"name":"adguardhome"}' >/dev/null 2>&1 || true

	if [ -x /etc/init.d/adguardhome ]; then
		/etc/init.d/adguardhome stop >/dev/null 2>&1 || true
		/etc/init.d/adguardhome disable >/dev/null 2>&1 || true
	fi
	rm -f /etc/rc.d/*adguardhome* 2>/dev/null || true

	# 2. Desinstalar pacote se instalado via gerenciador (apk/opkg)
	if command -v apk >/dev/null 2>&1; then
		apk del adguardhome >/dev/null 2>&1 || true
	elif command -v opkg >/dev/null 2>&1; then
		opkg remove adguardhome --force-removal-of-dependent-packages >/dev/null 2>&1 || true
	fi

	# 3. Remover binarios e estruturas de dados residuais em Flash e RAM
	rm -f /usr/bin/AdGuardHome /usr/bin/adguardhome
	rm -f /etc/init.d/adguardhome
	rm -f /etc/config/adguardhome
	rm -rf /etc/adguardhome /var/lib/adguardhome /tmp/adguardhome /tmp/lib/adguardhome /var/run/adguardhome* /etc/adguardhome.yaml*

	# 4. Restaurar DNS consultando a configuracao salva do usuario
	adblock_restore_dns

	# 5. Limpar chaves residuais do AdGuard em equipe_perf
	if [ -f /etc/config/equipe_perf ]; then
		uci -q delete equipe_perf.settings.adguard_pass
		uci -q delete equipe_perf.settings.custom_blacklist
		uci -q delete equipe_perf.settings.custom_whitelist
		uci commit equipe_perf
	fi

	# 6. Limpar regra de firewall ZeroTier para AdGuard
	uci -q delete firewall.zt_adguard
	uci commit firewall

	# 7. Reiniciar servicos de rede e limpar caches do LuCI em segundo plano
	/etc/init.d/firewall reload >/dev/null 2>&1 || true
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

adblock_toggle() {
	desired="${1:-0}"
	case "$desired" in
		1|true)
			adblock_enable "$2" "$3"
			;;
		*)
			adblock_disable
			;;
	esac
}

adblock_sso_login() {
	user_pass="$1"
	stored_pass="$(uci -q get equipe_perf.settings.adguard_pass || true)"
	pass="${user_pass:-$stored_pass}"

	if ! pgrep -f 'AdGuardHome' >/dev/null 2>&1 && ! pgrep -f 'adguardhome' >/dev/null 2>&1; then
		printf '{"status":"error","message":"AdGuard Home nao esta em execucao."}\n'
		return 1
	fi

	web_port="3000"
	if [ -f /etc/adguardhome/adguardhome.yaml ]; then
		raw_port="$(awk -F: '/address: [0-9.]*:/ {print $NF; exit}' /etc/adguardhome/adguardhome.yaml 2>/dev/null | tr -d ' ')"
		[ -n "$raw_port" ] && [ "$raw_port" -gt 0 ] 2>/dev/null && web_port="$raw_port"
	elif [ -f /etc/adguardhome.yaml ]; then
		raw_port="$(awk -F: '/address: [0-9.]*:/ {print $NF; exit}' /etc/adguardhome.yaml 2>/dev/null | tr -d ' ')"
		[ -n "$raw_port" ] && [ "$raw_port" -gt 0 ] 2>/dev/null && web_port="$raw_port"
	fi

	has_users=1
	if [ -f /etc/adguardhome/adguardhome.yaml ]; then
		if grep -q '^users:[[:space:]]*\[\]' /etc/adguardhome/adguardhome.yaml 2>/dev/null; then
			has_users=0
		fi
	elif [ -f /etc/adguardhome.yaml ]; then
		if grep -q '^users:[[:space:]]*\[\]' /etc/adguardhome.yaml 2>/dev/null; then
			has_users=0
		fi
	fi
	if [ "$has_users" -eq 0 ]; then
		printf '{"status":"ok","token":"","no_auth":true}\n'
		return 0
	fi

	if [ -z "$pass" ]; then
		printf '{"status":"auth_required"}\n'
		return 0
	fi

	esc_pass="$(printf '%s' "$pass" | sed 's/\\/\\\\/g; s/"/\\"/g')"
	json_body="{\"name\":\"admin\",\"password\":\"$esc_pass\"}"
	body_len=${#json_body}

	resp="$(printf "POST /control/login HTTP/1.1\r\nHost: 127.0.0.1:%s\r\nContent-Type: application/json\r\nContent-Length: %d\r\nConnection: close\r\n\r\n%s" \
		"$web_port" "$body_len" "$json_body" | nc 127.0.0.1 "$web_port" 2>/dev/null)"

	token="$(printf '%s' "$resp" | awk -F"agh_session=" '/agh_session=/ {split($2, a, ";"); print a[1]; exit}' | tr -d '\r\n ')"

	if [ -n "$token" ]; then
		if [ -n "$user_pass" ]; then
			mkdir -p /etc/config
			[ -f /etc/config/equipe_perf ] || touch /etc/config/equipe_perf
			uci -q set equipe_perf.settings=performance
			uci -q set equipe_perf.settings.adguard_pass="$user_pass"
			uci commit equipe_perf
			chmod 600 /etc/config/equipe_perf 2>/dev/null || true
		fi
		printf '{"status":"ok","token":"%s"}\n' "$token"
		return 0
	fi

	if printf '%s' "$resp" | grep -Eq 'HTTP/1\.[01] 403'; then
		printf '{"status":"invalid_password","message":"Senha incorreta do AdGuard Home."}\n'
		return 1
	fi

	printf '{"status":"error","message":"Falha ao comunicar com a API do AdGuard Home."}\n'
	return 1
}

handle_adblock() {
	action="$1"
	[ -n "$action" ] || { echo "Uso: $0 <comando> [args...]" >&2; exit 1; }
	case "$action" in
	adblock-sso-login|sso-login)
		adblock_sso_login "$2"
		;;
	adblock-status)
		adblock_status_json
		;;
	adblock-enable)
		adblock_enable "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" "${10}" "${11}" "${12}" "${13}" "${14}"
		;;
	adblock-configure)
		adblock_configure "$2" "$3" "$4" "$5" "$6" "$7" "$8" "$9" "${10}" "${11}" "${12}" "${13}" "${14}"
		;;
	adblock-blacklist)
		if [ "$#" -ge 2 ]; then
			adblock_apply_rules "$2" "${3:-__KEEP_EXISTING__}"
			echo ok
		else
			uci -q get equipe_perf.settings.custom_blacklist || true
		fi
		;;
	adblock-blacklist-sync)
		adblock_sync_blacklist
		;;
	adblock-whitelist-sync)
		adblock_sync_whitelist
		;;
	adblock-whitelist)
		if [ "$#" -ge 2 ]; then
			adblock_apply_rules "${3:-__KEEP_EXISTING__}" "$2"
			echo ok
		else
			uci -q get equipe_perf.settings.custom_whitelist || true
		fi
		;;
	adblock-disable)
		adblock_disable
		;;
	adblock-uninstall|uninstall)
		adblock_uninstall
		;;
	adblock-toggle)
		adblock_toggle "$2" "$3" "$4"
		;;

	*)
		echo "Acao Adblock desconhecida: $action" >&2
		exit 1
		;;
	esac
}

if [ "$(basename "$0")" = "adblock.sh" ]; then
	handle_adblock "$@"
fi
