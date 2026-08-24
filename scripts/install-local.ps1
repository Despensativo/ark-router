param(
    [string]$RouterIp = "192.168.1.1",
    [string]$Password = "",
    [string]$HostKey = "",
    [string]$Pscp = "C:\Program Files\PuTTY\pscp.exe",
    [string]$Plink = "C:\Program Files\PuTTY\plink.exe"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoDir = Split-Path -Parent $scriptDir
$rootDir = Join-Path $repoDir "root"
$version = (Get-Content -LiteralPath (Join-Path $repoDir "VERSION") -Raw).Trim()
$archive = Join-Path $env:TEMP "ark-router-local-root-$version.tar.gz"

if (-not (Test-Path -LiteralPath $rootDir)) {
    throw "root/ not found at $rootDir"
}
if (-not (Test-Path -LiteralPath $Pscp)) {
    throw "pscp.exe not found at $Pscp"
}
if (-not (Test-Path -LiteralPath $Plink)) {
    throw "plink.exe not found at $Plink"
}
if ([string]::IsNullOrWhiteSpace($Password)) {
    throw "Pass -Password for the router root user."
}

Write-Host "Building local ARK Router source package v$version" -ForegroundColor Cyan
if (Test-Path -LiteralPath $archive) {
    Remove-Item -LiteralPath $archive -Force
}
tar -czf $archive -C $rootDir .

$remoteArchive = "/tmp/ark-router-local-root-$version.tar.gz"
$pscpArgs = @("-scp", "-batch")
$plinkArgs = @("-batch")
if (-not [string]::IsNullOrWhiteSpace($HostKey)) {
    $pscpArgs += @("-hostkey", $HostKey)
    $plinkArgs += @("-hostkey", $HostKey)
}
$pscpArgs += @("-pw", $Password, $archive, "root@${RouterIp}:$remoteArchive")

Write-Host "Uploading $archive to root@${RouterIp}:$remoteArchive" -ForegroundColor Yellow
& $Pscp @pscpArgs
if ($LASTEXITCODE -ne 0) {
    throw "Upload failed with exit code $LASTEXITCODE"
}

$remoteScript = @"
set -eu
archive='$remoteArchive'
backup="/tmp/ark-router-local-install-backup-`$(date +%Y%m%d-%H%M%S).tar.gz"
preserve="/tmp/ark-router-local-preserve"
rm -rf "`$preserve"
mkdir -p "`$preserve/etc/config"
for cfg in equipe_dashboard equipe_devices qos_equipe; do
    [ -f "/etc/config/`$cfg" ] && cp "/etc/config/`$cfg" "`$preserve/etc/config/`$cfg" || true
done
tar -czf "`$backup" -C "`$preserve" . 2>/dev/null || true
tar -xzf "`$archive" -C /
for cfg in equipe_dashboard equipe_devices qos_equipe; do
    [ -f "`$preserve/etc/config/`$cfg" ] && cp "`$preserve/etc/config/`$cfg" "/etc/config/`$cfg" || true
done
chmod +x /usr/sbin/equipe-dashboard-control 2>/dev/null || true
chmod +x /usr/sbin/equipe-traffic-history 2>/dev/null || true
chmod +x /etc/init.d/equipe-traffic-history 2>/dev/null || true
chmod +x /etc/init.d/ark-speedify 2>/dev/null || true
rm -f /tmp/luci-indexcache 2>/dev/null || true
rm -rf /tmp/luci-modulecache/* 2>/dev/null || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history enable >/dev/null 2>&1 || true
[ -x /etc/init.d/equipe-traffic-history ] && /etc/init.d/equipe-traffic-history restart >/dev/null 2>&1 || true
[ -x /etc/init.d/rpcd ] && /etc/init.d/rpcd restart >/dev/null 2>&1 || true
[ -x /etc/init.d/uhttpd ] && /etc/init.d/uhttpd restart >/dev/null 2>&1 || true
echo "Installed ARK Router v`$(cat /usr/share/ark-router/VERSION 2>/dev/null || echo unknown)"
echo "Backup: `$backup"
"@

$plinkArgs += @("-pw", $Password, "root@$RouterIp", $remoteScript)
Write-Host "Installing on router and preserving ARK config files" -ForegroundColor Yellow
& $Plink @plinkArgs
if ($LASTEXITCODE -ne 0) {
    throw "Remote install failed with exit code $LASTEXITCODE"
}

Write-Host "Local install finished. Open http://$RouterIp/cgi-bin/luci/admin/equipe-dashboard" -ForegroundColor Green
