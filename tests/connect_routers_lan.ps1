# tests/connect_routers_lan.ps1
# ARK Router - Script de Interconexão entre Roteadores Virtuais
# Interconecta OpenWrt-ARK-Dev (Moderno) e OpenWrt-19-Legacy (Legado)
# através da rede interna VirtualBox "ark_router_lan" (Sub-rede: 192.168.19.0/24)

[CmdletBinding()]
param (
    [string]$PrimaryVm = "OpenWrt-ARK-Dev",
    [string]$LegacyVm = "OpenWrt-19-Legacy",
    [string]$VBoxManage = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe",
    [int]$PrimarySshPort = 2222,
    [int]$LegacySshPort = 2223
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "      ARK ROUTER: INTERCONEXÃO LAN DOS ROTEADORES           " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Localizar VBoxManage
if (-not (Test-Path $VBoxManage)) {
    $found = Get-Command "VBoxManage.exe" -ErrorAction SilentlyContinue
    if ($found) {
        $VBoxManage = $found.Source
    } else {
        Write-Error "VBoxManage.exe não encontrado em '$VBoxManage'."
    }
}

# 2. Verificar existência das duas VMs
$vms = & $VBoxManage list vms
if (-not ($vms | Select-String "`"$PrimaryVm`"")) {
    Write-Error "VM Primária '$PrimaryVm' não encontrada."
}
if (-not ($vms | Select-String "`"$LegacyVm`"")) {
    Write-Error "VM Legada '$LegacyVm' não encontrada. Execute 'tests/setup_virtualbox_openwrt19.ps1' primeiro."
}

# 3. Configurar NIC 3 em OpenWrt-ARK-Dev para a rede interna 'ark_router_lan'
Write-Host "[CONFIG] Verificando Adaptador 3 de '$PrimaryVm'..." -ForegroundColor White
$primaryInfo = & $VBoxManage showvminfo $PrimaryVm --machinereadable
$needRestart = $false

if ($primaryInfo -notmatch "nic3=`"intnet`"" -or $primaryInfo -notmatch "intnet3=`"ark_router_lan`"") {
    Write-Host "[INFO] Ajustando Adaptador 3 de '$PrimaryVm' para 'ark_router_lan'..." -ForegroundColor Yellow
    if ($primaryInfo -match "VMState=`"running`"") {
        Write-Host "Desligando '$PrimaryVm' graciosamente para reconfigurar adaptador..." -ForegroundColor Yellow
        & $VBoxManage controlvm $PrimaryVm acpipowerbutton 2>$null
        Start-Sleep -Seconds 5
        $state = (& $VBoxManage showvminfo $PrimaryVm --machinereadable | Select-String "VMState=").ToString()
        if ($state -match "running") {
            & $VBoxManage controlvm $PrimaryVm poweroff 2>$null
            Start-Sleep -Seconds 2
        }
        $needRestart = $true
    }

    & $VBoxManage modifyvm $PrimaryVm --nic3 intnet --intnet3 "ark_router_lan" --nictype3 82540EM --nicpromisc3 allow-all
    Write-Host "[OK] Adaptador 3 de '$PrimaryVm' associado à rede interna 'ark_router_lan'." -ForegroundColor Green
}

# 4. Iniciar VMs caso estejam paradas
$pState = (& $VBoxManage showvminfo $PrimaryVm --machinereadable | Select-String "VMState=").ToString()
if ($pState -notmatch "running") {
    Write-Host "[BOOT] Iniciando '$PrimaryVm' em modo headless..." -ForegroundColor White
    & $VBoxManage startvm $PrimaryVm --type headless
    Start-Sleep -Seconds 10
}

$lState = (& $VBoxManage showvminfo $LegacyVm --machinereadable | Select-String "VMState=").ToString()
if ($lState -notmatch "running") {
    Write-Host "[BOOT] Iniciando '$LegacyVm' em modo headless..." -ForegroundColor White
    & $VBoxManage startvm $LegacyVm --type headless
    Start-Sleep -Seconds 10
}

# 5. Configurar interface 'interconnect' (eth2) em OpenWrt-ARK-Dev via SSH
Write-Host "[NET] Configurando IP 192.168.19.2/24 em '$PrimaryVm' via SSH (porta $PrimarySshPort)..." -ForegroundColor White
$sshCfgPrimary = @"
uci -q delete network.interconnect
uci set network.interconnect=interface
uci set network.interconnect.device='eth2'
uci set network.interconnect.proto='static'
uci set network.interconnect.ipaddr='192.168.19.2'
uci set network.interconnect.netmask='255.255.255.0'
uci commit network
/etc/init.d/network reload
"@

# Aguarda SSH da VM primária responder
$retries = 10
$primarySshOk = $false
while ($retries -gt 0 -and -not $primarySshOk) {
    try {
        $testSsh = ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o ConnectTimeout=3 -p $PrimarySshPort root@127.0.0.1 "echo ok" 2>&1
        if ($testSsh -match "ok") {
            $primarySshOk = $true
        }
    } catch {
        Start-Sleep -Seconds 2
        $retries--
    }
}

if ($primarySshOk) {
    ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p $PrimarySshPort root@127.0.0.1 $sshCfgPrimary 2>&1 | Out-Null
    Write-Host "[OK] Interface de interconexão configurada em '$PrimaryVm'." -ForegroundColor Green
} else {
    Write-Warning "Não foi possível conectar via SSH em '$PrimaryVm' na porta $PrimarySshPort. Configure manualmente a interface 'interconnect'."
}

# 6. Teste de Ping Bidirecional entre os Dois Roteadores
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "[PING] Testando conectividade bidirecional na LAN virtual..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Ping de OpenWrt-ARK-Dev (192.168.19.2) para OpenWrt-19-Legacy (192.168.19.1)
$pingPrimaryToLegacy = ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p $PrimarySshPort root@127.0.0.1 "ping -c 3 -W 2 192.168.19.1" 2>&1
Write-Host "Ping de $PrimaryVm (192.168.19.2) -> $LegacyVm (192.168.19.1):"
Write-Host $pingPrimaryToLegacy

if ($pingPrimaryToLegacy -match "0% packet loss" -or $pingPrimaryToLegacy -match "3 packets received") {
    Write-Host "[SUCESSO] Roteadores conectados com sucesso na LAN Virtual 'ark_router_lan'!" -ForegroundColor Green
} else {
    Write-Warning "Ping ainda não respondeu com 100% de sucesso. Verifique se as duas interfaces subiram corretamente."
}

Write-Host "============================================================" -ForegroundColor Green
Write-Host " Topologia Concluída:                                       " -ForegroundColor Green
Write-Host "  - OpenWrt-ARK-Dev:   192.168.19.2 (eth2)                  " -ForegroundColor White
Write-Host "  - OpenWrt-19-Legacy: 192.168.19.1 (eth1)                  " -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
