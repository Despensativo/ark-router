#!/bin/sh
set -e

ROUTER_IP="${1:-192.168.1.1}"

echo "================================================="
echo "   ARK Router v0.9.26 - Deploy de Teste          "
echo "   Destino: root@$ROUTER_IP                      "
echo "================================================="

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"

echo "1. Enviando arquivos modificados..."
scp -O -o StrictHostKeyChecking=no "$REPO_DIR/root/usr/sbin/equipe-dashboard-control" "root@$ROUTER_IP:/usr/sbin/equipe-dashboard-control"
scp -O -o StrictHostKeyChecking=no "$REPO_DIR/root/www/luci-static/resources/view/equipe-dashboard/overview.js" "root@$ROUTER_IP:/www/luci-static/resources/view/equipe-dashboard/overview.js"
scp -O -o StrictHostKeyChecking=no "$REPO_DIR/root/www/luci-static/resources/view/equipe-dashboard/overview.css" "root@$ROUTER_IP:/www/luci-static/resources/view/equipe-dashboard/overview.css"

echo "2. Ajustando permissões e limpando cache do LuCI..."
ssh -o StrictHostKeyChecking=no "root@$ROUTER_IP" "chmod +x /usr/sbin/equipe-dashboard-control; uci -q get equipe_dashboard.main.operation_profile >/dev/null || uci set equipe_dashboard.main.operation_profile='standard'; uci commit equipe_dashboard; rm -rf /tmp/luci-*; /etc/init.d/rpcd restart; /etc/init.d/uhttpd restart; echo 'Pronto! v0.9.26 carregada no roteador.'"

echo ""
echo "[OK] Deploy de teste concluído com sucesso!"
echo "Abra http://$ROUTER_IP/cgi-bin/luci/admin/equipe-dashboard no navegador para testar."
