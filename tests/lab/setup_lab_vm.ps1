# tests/lab/setup_lab_vm.ps1
# ARK Router - Script de Provisionamento e Configuração do Laboratório VirtualBox
# Configura a VM OpenWrt-ARK-Dev com topologia completa de 4 adaptadores de rede

[CmdletBinding()]
param (
    [string]$VmName = "OpenWrt-ARK-Dev",
    [string]$VBoxManagePath = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe",
    [int]$RamMB = 512,
    [int]$CpuCount = 2,
    [switch]$TakeCleanSnapshot
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "     ARK ROUTER: PROVISIONAMENTO DO LABORATÓRIO VIRTUAL     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Localizar VBoxManage
if (-not (Test-Path $VBoxManagePath)) {
    $found = Get-Command "VBoxManage.exe" -ErrorAction SilentlyContinue
    if ($found) {
        $VBoxManagePath = $found.Source
    } else {
        Write-Error "VBoxManage.exe não encontrado em '$VBoxManagePath'. Instale o VirtualBox ou ajuste o caminho."
    }
}
Write-Host "[OK] VBoxManage localizado: $VBoxManagePath" -ForegroundColor Green

# 2. Verificar se a VM existe
$vmList = & $VBoxManagePath list vms
if ($vmList -notmatch "`"$VmName`"") {
    Write-Warning "VM '$VmName' não encontrada na lista do VirtualBox."
    Write-Host "Crie a VM com base na imagem OpenWrt x86_64 (ext4-combined-efi) antes de prosseguir." -ForegroundColor Yellow
    exit 1
}
Write-Host "[OK] VM '$VmName' identificada no VirtualBox." -ForegroundColor Green

# 3. Garantir que a VM está desligada para alterações de hardware
$vmInfo = & $VBoxManagePath showvminfo $VmName --machinereadable
if ($vmInfo -match "VMState=`"running`"") {
    Write-Host "[INFO] Desligando VM '$VmName' para reconfiguração de interfaces..." -ForegroundColor Yellow
    & $VBoxManagePath controlvm $VmName poweroff
    Start-Sleep -Seconds 3
}

# 4. Ajustar Recursos de CPU e Memória
Write-Host "[CONFIG] Ajustando CPU ($CpuCount vCPUs) e RAM ($RamMB MB)..." -ForegroundColor White
& $VBoxManagePath modifyvm $VmName --cpus $CpuCount --memory $RamMB --firmware efi

# 5. Configurar Adaptador 1: NAT + Port Forwards (Gerenciamento e WAN1 Principal)
Write-Host "[CONFIG] Adaptador 1: NAT (WAN1 Principal + Port Forwards)..." -ForegroundColor White
& $VBoxManagePath modifyvm $VmName --nic1 nat --nictype1 82540EM
& $VBoxManagePath modifyvm $VmName --natpf1 delete "luci_http" 2>$null
& $VBoxManagePath modifyvm $VmName --natpf1 delete "luci_https" 2>$null
& $VBoxManagePath modifyvm $VmName --natpf1 delete "ssh_dev" 2>$null
& $VBoxManagePath modifyvm $VmName --natpf1 "luci_http,tcp,127.0.0.1,8080,,80"
& $VBoxManagePath modifyvm $VmName --natpf1 "luci_https,tcp,127.0.0.1,8443,,443"
& $VBoxManagePath modifyvm $VmName --natpf1 "ssh_dev,tcp,127.0.0.1,2222,,22"

# 6. Configurar Adaptador 2: Internal Network 'vwan2' (WAN2 Secundária / Failover)
Write-Host "[CONFIG] Adaptador 2: Rede Interna 'vwan2' (WAN2 Secundária)..." -ForegroundColor White
& $VBoxManagePath modifyvm $VmName --nic2 intnet --intnet2 "vwan2" --nictype2 82540EM --nicpromisc2 allow-all

# 7. Configurar Adaptador 3: Internal Network 'vwan3' (WAN3 Backup / Starlink)
Write-Host "[CONFIG] Adaptador 3: Rede Interna 'vwan3' (WAN3 Starlink)..." -ForegroundColor White
& $VBoxManagePath modifyvm $VmName --nic3 intnet --intnet3 "vwan3" --nictype3 82540EM --nicpromisc3 allow-all

# 8. Configurar Adaptador 4: Internal Network 'vlan_trunk' (Bridges LAN e VLANs)
Write-Host "[CONFIG] Adaptador 4: Rede Interna 'vlan_trunk' (Trunk LAN)..." -ForegroundColor White
& $VBoxManagePath modifyvm $VmName --nic4 intnet --intnet4 "vlan_trunk" --nictype4 82540EM --nicpromisc4 allow-all

# 9. Snapshot Base-Clean
if ($TakeCleanSnapshot) {
    Write-Host "[SNAPSHOT] Criando snapshot de restauração 'Base-Clean'..." -ForegroundColor Cyan
    & $VBoxManagePath snapshot $VmName take "Base-Clean" --description "Snapshot base limpo pré-testes ARK Router"
    Write-Host "[OK] Snapshot 'Base-Clean' registrado com sucesso!" -ForegroundColor Green
}

Write-Host "============================================================" -ForegroundColor Green
Write-Host " LABORATÓRIO VIRTUALBOX PROVISIONADO COM SUCESSO!           " -ForegroundColor Green
Write-Host " Acesse LuCI em:  http://localhost:8080                     " -ForegroundColor White
Write-Host " Conexão SSH em:  ssh root@localhost -p 2222               " -ForegroundColor White
Write-Host " Credenciais via: `$env:ARK_ROUTER_TEST_PASSWORD            " -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
