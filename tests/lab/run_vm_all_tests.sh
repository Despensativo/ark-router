#!/bin/sh
set -e

echo "============================================================"
echo "    ARK ROUTER: VALIDAÇÃO CANÔNICA EM AMBIENTE VIRTUAL      "
echo "============================================================"
echo "Host: $(uname -a)"
echo "OpenWrt Release: $(cat /etc/openwrt_release | grep DISTRIB_DESCRIPTION | cut -d= -f2)"
echo "Data/Hora: $(date)"
echo ""

TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

assert_eq() {
	local actual="$1" expected="$2" msg="$3"
	TOTAL_TESTS=$((TOTAL_TESTS + 1))
	if [ "$actual" = "$expected" ]; then
		PASSED_TESTS=$((PASSED_TESTS + 1))
		echo "    [PASS] $msg (valor: $actual)"
	else
		FAILED_TESTS=$((FAILED_TESTS + 1))
		echo "    [FAIL] $msg (esperado: '$expected', obtido: '$actual')"
	fi
}

assert_true() {
	local cond="$1" msg="$2"
	TOTAL_TESTS=$((TOTAL_TESTS + 1))
	if eval "$cond"; then
		PASSED_TESTS=$((PASSED_TESTS + 1))
		echo "    [PASS] $msg"
	else
		FAILED_TESTS=$((FAILED_TESTS + 1))
		echo "    [FAIL] $msg"
	fi
}

assert_contains() {
	local text="$1" pattern="$2" msg="$3"
	TOTAL_TESTS=$((TOTAL_TESTS + 1))
	if printf '%s\n' "$text" | grep -q "$pattern"; then
		PASSED_TESTS=$((PASSED_TESTS + 1))
		echo "    [PASS] $msg"
	else
		FAILED_TESTS=$((FAILED_TESTS + 1))
		echo "    [FAIL] $msg (padrão '$pattern' não encontrado)"
	fi
}

echo "============================================================"
echo " PARTE 1: DESINSTALAÇÃO DESTRUTIVA REAL (14 RECURSOS)"
echo "============================================================"

test_feature_removal() {
	local feature="$1" pkgs="$2"
	echo ""
	echo ">>> Testando remoção destrutiva: $feature (Pacotes: $pkgs)"

	# 1. Configura pacotes no opkg com arquivos reais no disco
	local pkg dummy_file
	for pkg in $pkgs; do
		dummy_file="/usr/bin/ark_test_${pkg}"
		mkdir -p /usr/bin /usr/lib/opkg/info
		touch "$dummy_file" && chmod 755 "$dummy_file"
		printf '%s\n' "$dummy_file" > "/usr/lib/opkg/info/${pkg}.list"

		# Garante entrada limpa no status
		sed -i "/^Package: ${pkg}$/,/^$/d" /usr/lib/opkg/status 2>/dev/null || true
		cat << EOF >> /usr/lib/opkg/status
Package: $pkg
Version: 1.0.0-ark-test
Status: install ok installed
Architecture: x86_64
Installed-Time: $(date +%s)

EOF
		# Confirma que está instalado
		assert_true "opkg status '$pkg' 2>/dev/null | grep -q '^Status:.* installed'" "Pacote $pkg registrado e instalado antes do teste"
		assert_true "[ -f '$dummy_file' ]" "Arquivo $dummy_file existe no disco antes da remoção"
	done

	# 2. Reseta UCI para estado inicial instalado/habilitado
	uci -q set "equipe_dashboard.${feature}=feature"
	uci -q set "equipe_dashboard.${feature}.user_removed=0"
	uci -q set "equipe_dashboard.${feature}.user_disabled=0"
	uci -q set "equipe_dashboard.${feature}.enabled=1"
	uci commit equipe_dashboard
	rm -f /tmp/ark-features.cache

	# 3. Executa feature-remove
	local rc=0
	/usr/sbin/equipe-dashboard-control feature-remove "$feature" || rc=$?
	assert_eq "$rc" "0" "feature-remove $feature executou com retorno 0"

	# 4. Verifica se opkg desinstalou TODOS os pacotes
	for pkg in $pkgs; do
		assert_true "! opkg status '$pkg' 2>/dev/null | grep -q '^Status:.* installed'" "Pacote $pkg removido com sucesso do opkg status"
		assert_true "[ ! -e '/usr/bin/ark_test_${pkg}' ]" "Arquivo do pacote /usr/bin/ark_test_${pkg} excluído fisicamente do disco"
	done

	# 5. Verifica persistência no UCI
	local u_rem u_dis u_en
	u_rem="$(uci -q get equipe_dashboard.${feature}.user_removed || echo 0)"
	u_dis="$(uci -q get equipe_dashboard.${feature}.user_disabled || echo 0)"
	u_en="$(uci -q get equipe_dashboard.${feature}.enabled || echo 1)"
	assert_eq "$u_rem" "1" "UCI equipe_dashboard.$feature.user_removed == 1"
	assert_eq "$u_dis" "1" "UCI equipe_dashboard.$feature.user_disabled == 1"
	assert_eq "$u_en" "0" "UCI equipe_dashboard.$feature.enabled == 0"

	# 6. Verifica endpoint features do LuCI
	local feat_json
	feat_json="$(/usr/sbin/equipe-dashboard-control features | grep -o "\"${feature}\":{[^}]*}")"
	assert_contains "$feat_json" '"installed":false' "Endpoint features reporta installed=false para $feature"
	assert_contains "$feat_json" '"active":false' "Endpoint features reporta active=false para $feature"
	assert_contains "$feat_json" '"user_removed":true' "Endpoint features reporta user_removed=true para $feature"
}

test_feature_removal "sqm" "luci-app-sqm sqm-scripts"
test_feature_removal "mwan3" "luci-app-mwan3 mwan3"
test_feature_removal "nlbwmon" "luci-app-nlbwmon nlbwmon"
test_feature_removal "upnp" "luci-app-upnp miniupnpd"
test_feature_removal "adblock" "luci-app-adblock adblock"
test_feature_removal "wireguard" "luci-proto-wireguard wireguard-tools"
test_feature_removal "zerotier" "zerotier"
test_feature_removal "speedify" "luci-app-speedify speedify"
test_feature_removal "usteer" "luci-app-usteer usteer"
test_feature_removal "irqbalance" "irqbalance"
test_feature_removal "zram" "zram-swap"
test_feature_removal "ksmbd" "luci-app-ksmbd ksmbd-server ksmbd-utils"
test_feature_removal "wol" "luci-app-wol etherwake"
test_feature_removal "htop" "htop"

echo ""
echo ">>> Testando Caso Negativo: Falha na Remoção de Pacotes Bloqueia Mutação de UCI"
touch /usr/bin/ark_test_htop
cat << EOF >> /usr/lib/opkg/status
Package: htop
Version: 1.0.0
Status: install ok installed
Architecture: x86_64
EOF
printf '/usr/bin/ark_test_htop\n' > /usr/lib/opkg/info/htop.list
uci -q set equipe_dashboard.htop=feature
uci -q set equipe_dashboard.htop.user_removed=0
uci commit equipe_dashboard

# Injeta falha no opkg remove mantendo opkg status funcional
mv /bin/opkg /bin/opkg.real
cat << 'EOF' > /bin/opkg
#!/bin/sh
case "$1" in
	status) /bin/opkg.real "$@" ;;
	remove) exit 7 ;;
	*) /bin/opkg.real "$@" ;;
esac
EOF
chmod 755 /bin/opkg

rc_neg=0
/usr/sbin/equipe-dashboard-control feature-remove htop || rc_neg=$?
mv -f /bin/opkg.real /bin/opkg

assert_true "[ '$rc_neg' != '0' ]" "feature-remove abortou com erro quando opkg remove falhou (código: $rc_neg)"
u_rem_neg="$(uci -q get equipe_dashboard.htop.user_removed || echo 0)"
assert_eq "$u_rem_neg" "0" "UCI não foi corrompido para user_removed=1 após falha de remoção"
rm -f /usr/bin/ark_test_htop /usr/lib/opkg/info/htop.list
sed -i "/^Package: htop$/,/^$/d" /usr/lib/opkg/status 2>/dev/null || true

echo ""
echo "============================================================"
echo " PARTE 2: TESTE DE MUTAÇÃO REAL DE DNS LOCAL VS NUVEM"
echo "============================================================"

# Garante rota padrao para o gateway virtual do QEMU/UTM (192.168.1.2) se necessario
ip route add default via 192.168.1.2 dev br-lan 2>/dev/null || ip route add default via 192.168.1.2 2>/dev/null || true

# Garante baseline com dnsmasq rodando
/etc/init.d/dnsmasq restart >/dev/null 2>&1 || true

echo ""
echo ">>> Mutação 1: Baseline DNS Upstream"
ns_out="$(nslookup openwrt.org 1.1.1.1 2>&1 || true)"
assert_contains "$ns_out" "64.226.122.113" "Resolução baseline via 1.1.1.1 funciona"

echo ""
echo ">>> Mutação 2: Ativação Modo Nuvem (NextDNS)"
rc_c1=0
/usr/sbin/equipe-dashboard-control adblock-enable cloud nextdns 32 1 1 0 25000 3000 || rc_c1=$?
assert_eq "$rc_c1" "0" "adblock-enable cloud nextdns retornou 0"

s_c1="$(uci -q get dhcp.@dnsmasq[0].server || true)"
assert_contains "$s_c1" "45.90.28.0" "dnsmasq configurado com upstream NextDNS (45.90.28.0)"

st_c1="$(/usr/sbin/equipe-dashboard-control adblock-status)"
assert_contains "$st_c1" '"active":true' "adblock-status reporta active=true"
assert_contains "$st_c1" '"mode":"cloud"' "adblock-status reporta mode=cloud"
assert_contains "$st_c1" '"cloud_provider":"nextdns"' "adblock-status reporta cloud_provider=nextdns"

ns_nextdns="$(nslookup openwrt.org 127.0.0.1 2>&1 || true)"
assert_contains "$ns_nextdns" "64.226.122.113" "dnsmasq local (127.0.0.1) resolve consultas reais via NextDNS"

echo ""
echo ">>> Mutação 3: Interceptação de Domínio Blacklist (Sinkhole 0.0.0.0)"
/usr/sbin/equipe-dashboard-control adblock-blacklist "doubleclick.net badtracker.ark.local" >/dev/null 2>&1
ns_block="$(nslookup doubleclick.net 127.0.0.1 2>&1 || true)"
assert_contains "$ns_block" "0.0.0.0" "Domínio em blacklist doubleclick.net é sinkholed para 0.0.0.0"

ns_clean="$(nslookup openwrt.org 127.0.0.1 2>&1 || true)"
assert_contains "$ns_clean" "64.226.122.113" "Domínio limpo openwrt.org continua resolvendo normalmente"

echo ""
echo ">>> Mutação 4: Transição de Provedor Nuvem (AdGuard DNS)"
rc_c2=0
/usr/sbin/equipe-dashboard-control adblock-enable cloud adguard_dns 32 1 1 0 25000 3000 || rc_c2=$?
assert_eq "$rc_c2" "0" "adblock-enable cloud adguard_dns retornou 0"

s_c2="$(uci -q get dhcp.@dnsmasq[0].server || true)"
assert_contains "$s_c2" "94.140.14" "dnsmasq upstream atualizado para AdGuard DNS (94.140.14.x)"

ns_adg="$(nslookup openwrt.org 127.0.0.1 2>&1 || true)"
assert_contains "$ns_adg" "64.226.122.113" "dnsmasq local (127.0.0.1) resolve consultas reais via AdGuard DNS"

echo ""
echo ">>> Mutação 5: Circuit Breaker ao tentar Ativar Modo Local sem AdGuard Home"
rm -f /usr/bin/AdGuardHome /usr/bin/adguardhome 2>/dev/null || true
rc_cb=0
cb_out="$(/usr/sbin/equipe-dashboard-control adblock-enable local adguard_dns 32 1 1 0 25000 3000 2>&1)" || rc_cb=$?
assert_eq "$rc_cb" "1" "Ativação local sem binário abortou com código 1"
assert_contains "$cb_out" "O DNS padrao foi mantido" "Mensagem de proteção do Circuit Breaker emitida"

ns_cb="$(nslookup openwrt.org 127.0.0.1 2>&1 || true)"
assert_contains "$ns_cb" "64.226.122.113" "DNS continuou 100% íntegro e operacional após disparo do Circuit Breaker"

echo ""
echo ">>> Mutação 6: Ciclo de Vida do Modo Local (AdGuard Home na porta 5335)"
cat << 'EOF' > /usr/bin/adguardhome
#!/bin/sh
case "$*" in
	*--check-config*) exit 0 ;;
esac
uhttpd -f -h /www -p 127.0.0.1:5335 &
U_PID=$!
trap "kill $U_PID 2>/dev/null; exit 0" TERM INT HUP
wait $U_PID
EOF
chmod 755 /usr/bin/adguardhome

cat << 'EOF' > /etc/init.d/adguardhome
#!/bin/sh /etc/rc.common
START=90
start() {
  /usr/bin/adguardhome >/dev/null 2>&1 &
}
stop() {
  killall -9 adguardhome uhttpd 2>/dev/null || true
}
restart() { stop; sleep 1; start; }
EOF
chmod 755 /etc/init.d/adguardhome

rc_loc=0
/usr/sbin/equipe-dashboard-control adblock-enable local adguard_dns 32 1 1 0 25000 3000 || rc_loc=$?
assert_eq "$rc_loc" "0" "adblock-enable local retornou 0 com serviço ativo"

s_loc="$(uci -q get dhcp.@dnsmasq[0].server || true)"
assert_contains "$s_loc" "127.0.0.1#5335" "dnsmasq redirecionado para AdGuard Home local (127.0.0.1#5335)"

st_loc="$(/usr/sbin/equipe-dashboard-control adblock-status)"
assert_contains "$st_loc" '"active":true' "adblock-status reporta active=true no modo local"
assert_contains "$st_loc" '"local_active":true' "adblock-status reporta local_active=true"
assert_contains "$st_loc" '"mode":"local"' "adblock-status reporta mode=local"

# Limpeza do mock local
/etc/init.d/adguardhome stop 2>/dev/null || true
rm -f /usr/bin/adguardhome /etc/init.d/adguardhome

echo ""
echo ">>> Mutação 7: Desativação (adblock-toggle 0) e Restauração de DNS Turbo"
rc_off=0
/usr/sbin/equipe-dashboard-control adblock-toggle 0 || rc_off=$?
assert_eq "$rc_off" "0" "adblock-toggle 0 executou com sucesso"

allservers_val="$(uci -q get dhcp.@dnsmasq[0].allservers || echo 0)"
assert_eq "$allservers_val" "1" "Restauração de All-Servers=1 (DNS Turbo Paralelo)"

st_off="$(/usr/sbin/equipe-dashboard-control adblock-status)"
assert_contains "$st_off" '"active":false' "adblock-status reporta active=false"
assert_contains "$st_off" '"mode":"none"' "adblock-status reporta mode=none"

feat_off="$(/usr/sbin/equipe-dashboard-control features | grep -o '\"adblock\":{[^}]*}')"
assert_contains "$feat_off" '"active":false' "Endpoint features reporta adblock.active=false"

ns_restored="$(nslookup openwrt.org 127.0.0.1 2>&1 || true)"
assert_contains "$ns_restored" "64.226.122.113" "Resolução DNS final opera normalmente após restauração"

echo ""
echo "============================================================"
echo " RESUMO DA VALIDAÇÃO VIRTUAL"
echo "============================================================"
echo "Total de Testes Executados: $TOTAL_TESTS"
echo "Aprovados: $PASSED_TESTS"
echo "Falhas: $FAILED_TESTS"

if [ "$FAILED_TESTS" -eq 0 ]; then
	echo ""
	echo "  >>> SUCESSO ABSOLUTO: 100% DAS VALIDAÇÕES EM VM APROVADAS! <<<"
	exit 0
else
	echo ""
	echo "  >>> ERRO: $FAILED_TESTS TESTES FALHARAM! <<<"
	exit 1
fi
