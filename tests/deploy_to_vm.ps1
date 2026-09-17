# ==============================================================================
# ARK Router — Deploy Automatizado no Ambiente Virtual (VirtualBox localhost:2222)
# ==============================================================================
param (
    [string]$VmHost = "127.0.0.1",
    [int]$VmPort = 2222,
    [string]$VmUser = "root"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $scriptDir
$distDir = Join-Path $repoDir "dist"
$payloadArchive = Join-Path $distDir "ark_payload_1.0.2.tar.gz"

Write-Host "=== 1. Validando código e gerando bundle determinístico... ==="
& python "$repoDir\scripts\build_frontend_bundle.py"
& python "$repoDir\scripts\build_minified_assets.py"

Write-Host "=== 2. Empacotando arquivos de /root e /dist... ==="
if (-not (Test-Path $distDir)) {
    New-Item -ItemType Directory -Path $distDir -Force | Out-Null
}

$tarCmd = "tar -czf `"$payloadArchive`" -C `"$repoDir\root`" ."
Invoke-Expression $tarCmd

if (-not (Test-Path $payloadArchive)) {
    Write-Error "Falha ao gerar arquivo de payload: $payloadArchive"
}
$archiveSize = (Get-Item $payloadArchive).Length
Write-Host "Payload gerado com sucesso ($archiveSize bytes): $payloadArchive"

Write-Host "=== 3. Enviando para a VM VirtualBox ($VmHost`:$VmPort)... ==="
$sshOptions = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -o HostKeyAlgorithms=+ssh-rsa -o PubkeyAcceptedAlgorithms=+ssh-rsa"
$scpCmd = "scp -O -P $VmPort $sshOptions `"$payloadArchive`" ${VmUser}@${VmHost}:/tmp/ark_payload.tar.gz"
Write-Host "Executando: $scpCmd"
Invoke-Expression $scpCmd

Write-Host "=== 4. Extraindo e reiniciando serviços no OpenWrt da VM... ==="
$remoteCommands = @"
tar -xzf /tmp/ark_payload.tar.gz -C /
rm -f /tmp/ark_payload.tar.gz
chmod +x /etc/init.d/* /usr/sbin/* /usr/lib/ark/* /usr/lib/ark/modules/* 2>/dev/null || true
/etc/init.d/rpcd restart 2>/dev/null || true
/etc/init.d/uhttpd restart 2>/dev/null || true
rm -rf /tmp/luci-indexcache /tmp/luci-modulecache
echo 'ARK Router implantado com sucesso na VM!'
"@

$sshCmd = "ssh -p $VmPort $sshOptions ${VmUser}@${VmHost} `"$remoteCommands`""
Invoke-Expression $sshCmd

Write-Host "================================================================"
Write-Host "  DEPLOY CONCLUIDO NO AMBIENTE VIRTUAL!"
Write-Host "  🌐 LuCI Interface: http://localhost:8080"
Write-Host "================================================================"
