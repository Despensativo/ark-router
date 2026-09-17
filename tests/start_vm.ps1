$vboxManage = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
$vmName = "OpenWrt-ARK-Dev"

$state = & $vboxManage showvminfo $vmName --machinereadable | Select-String 'VMState="running"'
if ($state) {
    Write-Host "A VM $vmName ja esta em execucao!"
} else {
    Write-Host "Iniciando $vmName em segundo plano (headless)..."
    & $vboxManage startvm $vmName --type headless
    Start-Sleep -Seconds 3
}

Write-Host "=================================================="
Write-Host "🌐 LuCI Web Interface: http://localhost:8080"
Write-Host "🔒 LuCI HTTPS:         https://localhost:8443"
Write-Host "🔑 SSH Dropbear:        plink -P 2222 root@localhost"
Write-Host "=================================================="
