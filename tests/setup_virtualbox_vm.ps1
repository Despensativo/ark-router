$ErrorActionPreference = "Stop"

$vmName = "OpenWrt-ARK-Dev"
$vboxManage = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe"
$vmDir = "C:\Users\User\VirtualBox VMs\$vmName"
$gzUrl = "https://downloads.openwrt.org/releases/24.10.0/targets/x86/64/openwrt-24.10.0-x86-64-generic-ext4-combined-efi.img.gz"
$gzFile = Join-Path $vmDir "openwrt.img.gz"
$imgFile = Join-Path $vmDir "openwrt.img"
$vdiFile = Join-Path $vmDir "openwrt.vdi"

Write-Host "=== 1. Preparando pasta da VM: $vmDir ==="
if (-not (Test-Path $vmDir)) {
    New-Item -ItemType Directory -Path $vmDir -Force | Out-Null
}

Write-Host "=== 2. Baixando OpenWrt x86_64 oficial se necessario... ==="
if (-not (Test-Path $vdiFile)) {
    if (-not (Test-Path $imgFile)) {
        if (-not (Test-Path $gzFile)) {
            Invoke-WebRequest -Uri $gzUrl -OutFile $gzFile -UseBasicParsing
        }
        Write-Host "Descompactando imagem .img.gz..."
        $inStream = [System.IO.File]::OpenRead($gzFile)
        $gzipStream = New-Object System.IO.Compression.GzipStream($inStream, [System.IO.Compression.CompressionMode]::Decompress)
        $outStream = [System.IO.File]::Create($imgFile)
        $gzipStream.CopyTo($outStream)
        $gzipStream.Dispose()
        $outStream.Dispose()
        $inStream.Dispose()
        Remove-Item $gzFile -Force
    }

    Write-Host "=== 3. Convertendo para disco VirtualBox VDI... ==="
    & $vboxManage convertfromraw $imgFile $vdiFile --format VDI
    & $vboxManage modifymedium $vdiFile --resize 1024
    Remove-Item $imgFile -Force
}

Write-Host "=== 4. Configurando Maquina Virtual no VirtualBox... ==="
$existing = & $vboxManage list vms | Select-String $vmName
if ($existing) {
    Write-Host "VM ja existente. Parando e removendo para reinstalacao limpa..."
    & $vboxManage controlvm $vmName poweroff 2>$null
    Start-Sleep -Seconds 1
    & $vboxManage unregistervm $vmName --delete 2>$null
}

& $vboxManage createvm --name $vmName --ostype "Linux_64" --register --basefolder "C:\Users\User\VirtualBox VMs"
& $vboxManage modifyvm $vmName --memory 512 --cpus 2 --firmware efi

# Adaptador 1: NAT para Acesso Externo e Redirecionamento de Portas LuCI/SSH
& $vboxManage modifyvm $vmName --nic1 nat
& $vboxManage modifyvm $vmName --natpf1 "luci,tcp,,8080,,80"
& $vboxManage modifyvm $vmName --natpf1 "luci-ssl,tcp,,8443,,443"
& $vboxManage modifyvm $vmName --natpf1 "ssh,tcp,,2222,,22"

# Adaptador 2: Host-Only / Rede Interna para Simulacao Dual-WAN (WAN2)
& $vboxManage modifyvm $vmName --nic2 intnet --intnet2 "ark_vwan2"

# Adaptador 3: Rede Interna para Simulacao de Terceira WAN / Starlink (WAN3)
& $vboxManage modifyvm $vmName --nic3 intnet --intnet3 "ark_vwan3"

# Adaptador 4: Rede Interna para Simulacao de VLANs e Segmentacao LAN
& $vboxManage modifyvm $vmName --nic4 intnet --intnet4 "ark_vlan_trunk"

& $vboxManage storagectl $vmName --name "SATA" --add sata --controller IntelAhci
& $vboxManage storageattach $vmName --storagectl "SATA" --port 0 --device 0 --type hdd --medium $vdiFile

Write-Host "=== 5. Criando Snapshot Base Limpo... ==="
# Inicia em headless para inicializar particao e LuCI
& $vboxManage startvm $vmName --type headless
Write-Host "Aguardando 10 segundos para primeira inicializacao do OpenWrt..."
Start-Sleep -Seconds 10
& $vboxManage controlvm $vmName acpipowerbutton
Start-Sleep -Seconds 3
& $vboxManage snapshot $vmName take "baseline-clean" --description "OpenWrt 24.10 limpo com LuCI e 4 NICs"
& $vboxManage startvm $vmName --type headless

Write-Host "=== SUCESSO: VM MULTI-NIC CONFIGURADA E INICIADA! ==="
Write-Host "🌐 LuCI Web Interface: http://localhost:8080"
Write-Host "🔑 SSH Dropbear:        plink -P 2222 root@localhost"
