$vboxManage = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
$vmName = "OpenWrt-ARK-Dev"

$state = & $vboxManage showvminfo $vmName --machinereadable | Select-String 'VMState="running"'
if ($state) {
    Write-Host "Desligando a VM $vmName..."
    & $vboxManage controlvm $vmName acpipowerbutton
    Start-Sleep -Seconds 2
    $stillRunning = & $vboxManage showvminfo $vmName --machinereadable | Select-String 'VMState="running"'
    if ($stillRunning) {
        & $vboxManage controlvm $vmName poweroff
    }
    Write-Host "VM desligada com sucesso!"
} else {
    Write-Host "A VM $vmName ja esta desligada."
}
