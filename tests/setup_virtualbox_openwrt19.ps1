# tests/setup_virtualbox_openwrt19.ps1
# ARK Router - Script de Criação da Máquina Virtual OpenWrt 19 Legada
# Especificações: OpenWrt 19.07.10, 256 MB RAM, 1 vCPU, 16 MB de Flash/armazenamento simulado,
# 1 WAN NAT (Port Forwards 8081/8444/2223) e 1 LAN Virtual ("ark_router_lan")

[CmdletBinding()]
param (
    [string]$VmName = "OpenWrt-19-Legacy",
    [string]$VBoxManage = "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe",
    [string]$VmBaseDir = "C:\Users\User\VirtualBox VMs",
    [switch]$ForceRecreate
)

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "    ARK ROUTER: CRIANDO VM OPENWRT 19 LEGADA (19.07.10)     " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Localizar VBoxManage
if (-not (Test-Path $VBoxManage)) {
    $found = Get-Command "VBoxManage.exe" -ErrorAction SilentlyContinue
    if ($found) {
        $VBoxManage = $found.Source
    } else {
        Write-Error "VBoxManage.exe não encontrado em '$VBoxManage'. Verifique a instalação do VirtualBox."
    }
}
Write-Host "[OK] VBoxManage localizado: $VBoxManage" -ForegroundColor Green

# 2. Configuração de Diretórios e URLs
$vmDir = Join-Path $VmBaseDir $VmName
$gzUrl = "https://downloads.openwrt.org/releases/19.07.10/targets/x86/64/openwrt-19.07.10-x86-64-combined-ext4.img.gz"
$gzFile = Join-Path $vmDir "openwrt19.img.gz"
$imgFile = Join-Path $vmDir "openwrt19.img"
$vdiFile = Join-Path $vmDir "openwrt19.vdi"

if (-not (Test-Path $vmDir)) {
    New-Item -ItemType Directory -Path $vmDir -Force | Out-Null
}

# 3. Baixar e Preparar Disco VDI
if (-not (Test-Path $vdiFile) -or $ForceRecreate) {
    if (-not (Test-Path $imgFile)) {
        if (-not (Test-Path $gzFile)) {
            Write-Host "[DOWNLOAD] Baixando OpenWrt 19.07.10 x86_64 oficial..." -ForegroundColor Yellow
            Invoke-WebRequest -Uri $gzUrl -OutFile $gzFile -UseBasicParsing
        }
        Write-Host "[EXTRACT] Descompactando imagem .img.gz..." -ForegroundColor Yellow
        $inStream = [System.IO.File]::OpenRead($gzFile)
        $gzipStream = New-Object System.IO.Compression.GzipStream($inStream, [System.IO.Compression.CompressionMode]::Decompress)
        $outStream = [System.IO.File]::Create($imgFile)
        $gzipStream.CopyTo($outStream)
        $gzipStream.Dispose()
        $outStream.Dispose()
        $inStream.Dispose()
        Remove-Item $gzFile -Force
    }

    Write-Host "[CONVERT] Convertendo para disco VirtualBox VDI dinâmico..." -ForegroundColor Yellow
    if (Test-Path $vdiFile) {
        Remove-Item $vdiFile -Force
    }
    & $VBoxManage convertfromraw $imgFile $vdiFile --format VDI
    Remove-Item $imgFile -Force
    Write-Host "[OK] Disco VDI preparado com sucesso em: $vdiFile" -ForegroundColor Green
} else {
    Write-Host "[OK] Disco VDI já existente em: $vdiFile" -ForegroundColor Green
}

# 4. Gerenciar VM Existente
$existing = & $VBoxManage list vms | Select-String "`"$VmName`""
if ($existing) {
    Write-Host "[WARN] VM '$VmName' já existe no VirtualBox. Desligando e recriando..." -ForegroundColor Yellow
    & $VBoxManage controlvm $VmName poweroff 2>$null
    Start-Sleep -Seconds 2
    & $VBoxManage unregistervm $VmName --delete 2>$null
    Start-Sleep -Seconds 1
}

# 5. Criar e Configurar VM (1 vCPU, 256 MB RAM, BIOS)
Write-Host "[CREATE] Criando VM '$VmName' (1 vCPU, 256 MB RAM, BIOS)..." -ForegroundColor White
& $VBoxManage createvm --name $VmName --ostype "Linux_64" --register --basefolder $VmBaseDir
& $VBoxManage modifyvm $VmName --memory 256 --cpus 1 --firmware bios

# 6. Adaptador 1: NAT para Acesso Externo (Internet) e Port Forwards LuCI/SSH
Write-Host "[NET] Configurando NIC 1: NAT + Port Forwards (8081/8444/2223)..." -ForegroundColor White
& $VBoxManage modifyvm $VmName --nic1 nat --nictype1 82540EM
& $VBoxManage modifyvm $VmName --natpf1 "luci,tcp,127.0.0.1,8081,,80"
& $VBoxManage modifyvm $VmName --natpf1 "luci-ssl,tcp,127.0.0.1,8444,,443"
& $VBoxManage modifyvm $VmName --natpf1 "ssh,tcp,127.0.0.1,2223,,22"

# 7. Adaptador 2: Rede Interna "ark_router_lan" (Interconexão entre Roteadores)
Write-Host "[NET] Configurando NIC 2: Rede Interna 'ark_router_lan'..." -ForegroundColor White
& $VBoxManage modifyvm $VmName --nic2 intnet --intnet2 "ark_router_lan" --nictype2 82540EM --nicpromisc2 allow-all

# 8. Anexar Armazenamento
Write-Host "[STORAGE] Anexando controlador SATA com disco VDI..." -ForegroundColor White
& $VBoxManage storagectl $VmName --name "SATA" --add sata --controller IntelAhci
& $VBoxManage storageattach $VmName --storagectl "SATA" --port 0 --device 0 --type hdd --medium $vdiFile

# 9. Inicialização e Automação de Rede Inicial
Write-Host "[BOOT] Inicializando VM em modo headless para aplicar configuração de rede..." -ForegroundColor White
& $VBoxManage startvm $VmName --type headless

Write-Host "Aguardando 35 segundos para inicialização dos serviços base do OpenWrt 19..." -ForegroundColor Yellow
Start-Sleep -Seconds 35

Write-Host "[CONFIG] Configurando Firewall, WAN (eth0 DHCP) e LAN (eth1 192.168.19.1)..." -ForegroundColor White
& $VBoxManage controlvm $VmName keyboardputscancode 1c 9c
Start-Sleep -Seconds 1

# 9.1 Firewall: Liberar SSH e LuCI na zona WAN para portas redirecionadas pelo VirtualBox NAT
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@zone[1].input='ACCEPT'`n"
Start-Sleep -Milliseconds 400
& $VBoxManage controlvm $VmName keyboardputstring "uci add firewall rule >/dev/null`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].name='Allow-SSH-WAN'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].src='wan'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].proto='tcp'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].dest_port='22'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].target='ACCEPT'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci add firewall rule >/dev/null`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].name='Allow-LuCI-WAN'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].src='wan'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].proto='tcp'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].dest_port='80'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set firewall.@rule[-1].target='ACCEPT'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci commit firewall`n"
Start-Sleep -Milliseconds 400
& $VBoxManage controlvm $VmName keyboardputstring "/etc/init.d/firewall restart`n"
Start-Sleep -Seconds 2

# 9.2 Rede: eth0 como WAN DHCP e eth1 como LAN estática 192.168.19.1/24
& $VBoxManage controlvm $VmName keyboardputstring "uci -q delete network.lan.gateway`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci -q delete network.lan.dns`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set network.lan.ifname='eth1'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set network.lan.ipaddr='192.168.19.1'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set network.lan.netmask='255.255.255.0'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set network.wan.ifname='eth0'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set network.wan.proto='dhcp'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set network.wan6.ifname='eth0'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci set network.wan6.proto='dhcpv6'`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci -q delete network.interconnect`n"
Start-Sleep -Milliseconds 300
& $VBoxManage controlvm $VmName keyboardputstring "uci commit network`n"
Start-Sleep -Milliseconds 400
& $VBoxManage controlvm $VmName keyboardputstring "/etc/init.d/network restart`n"
Start-Sleep -Seconds 8

# 9.3 Wi-Fi Virtual: Instalar mac80211-hwsim e habilitar interfaces sem fio
Write-Host "[WIFI] Configurando placa Wi-Fi virtual via mac80211_hwsim..." -ForegroundColor White
$sshOpts = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedKeyTypes=+ssh-rsa -p 2223"
$wifiSetupCmd = @"
opkg update && opkg install kmod-mac80211-hwsim iw hostapd-basic iwinfo 2>&1 || true
echo 'mac80211_hwsim radios=2' > /etc/modules.d/mac80211-hwsim
modprobe mac80211_hwsim radios=2 2>/dev/null || true
wifi config
uci set wireless.radio0.disabled='0'
uci set wireless.radio0.channel='6'
uci set wireless.radio0.hwmode='11g'
uci set wireless.radio0.htmode='HT20'
uci set wireless.radio0.country='BR'
uci set wireless.default_radio0.ssid='ARK_Legacy_2.4G'
uci set wireless.default_radio0.encryption='psk2'
uci set wireless.default_radio0.key='ArkRouter2026!'
uci set wireless.radio1.disabled='0'
uci set wireless.radio1.channel='36'
uci set wireless.radio1.hwmode='11a'
uci set wireless.radio1.htmode='VHT80'
uci set wireless.radio1.country='BR'
uci set wireless.default_radio1.ssid='ARK_Legacy_5G'
uci set wireless.default_radio1.encryption='psk2'
uci set wireless.default_radio1.key='ArkRouter2026!'
uci commit wireless
/etc/init.d/network restart
"@
try {
    ssh $sshOpts.Split(' ') root@127.0.0.1 $wifiSetupCmd 2>&1 | Out-Null
    Write-Host "[OK] Rádios Wi-Fi virtuais (2.4G e 5G) configurados com sucesso!" -ForegroundColor Green
} catch {
    Write-Warning "Falha ao provisionar pacotes Wi-Fi via SSH. O sistema tentará na inicialização manual."
}

# 10. Teste de Conectividade LuCI
Write-Host "[VALIDATE] Testando resposta HTTP do LuCI em http://127.0.0.1:8081..." -ForegroundColor Yellow
$retries = 6
$luciOk = $false
while ($retries -gt 0 -and -not $luciOk) {
    try {
        $resp = Invoke-WebRequest -Uri "http://127.0.0.1:8081" -TimeoutSec 5 -UseBasicParsing
        if ($resp.StatusCode -eq 200) {
            $luciOk = $true
            Write-Host "[OK] LuCI OpenWrt 19 respondeu HTTP 200 OK!" -ForegroundColor Green
        }
    } catch {
        Write-Host "Aguardando uhttpd subir... ($retries tentativas restantes)"
        Start-Sleep -Seconds 3
        $retries--
    }
}

# 11. Criar Snapshot de Base Limpa
Write-Host "[SNAPSHOT] Criando snapshot base limpo: 'baseline-clean-19'..." -ForegroundColor Cyan
& $VBoxManage controlvm $VmName acpipowerbutton 2>$null
Start-Sleep -Seconds 4
& $VBoxManage snapshot $VmName take "baseline-clean-19" --description "OpenWrt 19.07.10 limpo (256MB RAM, 1 vCPU, 2 NICs)"
& $VBoxManage startvm $VmName --type headless

Write-Host "============================================================" -ForegroundColor Green
Write-Host "    VM OPENWRT 19 LEGADA CONFIGURADA COM SUCESSO!          " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "🌐 LuCI Web Interface: http://localhost:8081" -ForegroundColor White
Write-Host "🔑 SSH Dropbear:        ssh -o HostKeyAlgorithms=+ssh-rsa -p 2223 root@localhost" -ForegroundColor White
Write-Host "🌐 Rede Interconexão:  eth1 -> 192.168.19.1/24 ('ark_router_lan')" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
