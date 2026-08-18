param(
    [string]$RouterIp = "192.168.21.1"
)

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   ARK Router v0.9.17 - Deploy de Teste          " -ForegroundColor Cyan
Write-Host "   Destino: root@$RouterIp                       " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $scriptDir

Write-Host "`n1. Enviando arquivos modificados..." -ForegroundColor Yellow

scp -O -o StrictHostKeyChecking=no "$repoDir\root\usr\sbin\equipe-dashboard-control" "root@${RouterIp}:/usr/sbin/equipe-dashboard-control"
scp -O -o StrictHostKeyChecking=no "$repoDir\root\www\luci-static\resources\view\equipe-dashboard\overview.js" "root@${RouterIp}:/www/luci-static/resources/view/equipe-dashboard/overview.js"
scp -O -o StrictHostKeyChecking=no "$repoDir\root\www\luci-static\resources\view\equipe-dashboard\overview.css" "root@${RouterIp}:/www/luci-static/resources/view/equipe-dashboard/overview.css"

Write-Host "`n2. Ajustando permissões e limpando cache do LuCI..." -ForegroundColor Yellow

ssh -o StrictHostKeyChecking=no "root@${RouterIp}" "chmod +x /usr/sbin/equipe-dashboard-control; uci -q get equipe_dashboard.main.operation_profile >/dev/null || uci set equipe_dashboard.main.operation_profile='standard'; uci commit equipe_dashboard; rm -rf /tmp/luci-*; /etc/init.d/rpcd restart; /etc/init.d/uhttpd restart; echo 'Pronto! v0.9.17 carregada no roteador.'"

Write-Host "`n[OK] Deploy de teste concluído com sucesso!" -ForegroundColor Green
Write-Host "Abra http://$RouterIp/cgi-bin/luci/admin/equipe-dashboard no navegador para testar." -ForegroundColor Green
