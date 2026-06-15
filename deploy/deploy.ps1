<#
.SYNOPSIS
  Deploy Happy Star to a remote host via SSH/SCP.

.DESCRIPTION
  Tars local source (excluding node_modules/data/dist), scp's it to the remote
  host, then triggers deploy/remote-install.sh on the remote. The remote
  script installs, builds, and restarts the server WITHOUT deleting the
  existing data directory (HAPPY_STAR_DATA is external to the code path).

  Usage from repo root:
    .\deploy\deploy.ps1 -Host 192.168.31.222 -User wh -RemoteDir /home/wh/apps/happy-star -DataDir /home/wh/apps/happy-star/data

  Or with defaults (host/user from common values; remote dir + data dir must be set):
    .\deploy\deploy.ps1 -RemoteDir /home/wh/apps/happy-star -DataDir /home/wh/apps/happy-star/data

.PARAMETER SshHost
  SSH host (default: 192.168.31.222)

.PARAMETER User
  SSH user (default: wh)

.PARAMETER RemoteDir
  Target directory on remote (default: /home/wh/apps/happy-star)

.PARAMETER DataDir
  Runtime data directory; NOT touched by this script. Must already exist
  with seed data, or be empty (seedIfEmpty will populate on first start).

.PARAMETER Port
  Server port on remote (default: 8080). Also used for health check.

.EXAMPLE
  .\deploy\deploy.ps1 -RemoteDir /home/wh/apps/happy-star -DataDir /home/wh/apps/happy-star/data
#>

[CmdletBinding()]
param(
  [string]$SshHost = "192.168.31.222",
  [string]$User = "wh",
  [string]$RemoteDir = "/home/wh/apps/happy-star",
  [Parameter(Mandatory = $true)]
  [string]$DataDir,
  [int]$Port = 8080
)

$ErrorActionPreference = "Stop"
$repoRoot = (Get-Location).Path
$tmpTar = Join-Path $env:TEMP "hs-deploy-$(Get-Random).tar.gz"
$remoteTar = "/tmp/hs-deploy-$(Get-Random).tar.gz"

function Step($t) { Write-Host "`n=== $t ===" -ForegroundColor Cyan }
function Ok($m) { Write-Host "  OK: $m" -ForegroundColor Green }
function Fail($m) { Write-Host "  FAIL: $m" -ForegroundColor Red; throw $m }

try {
  Step "1. Tar local source (exclude node_modules, data, dist, .git, logs)"
  tar -czf $tmpTar --exclude='.git' --exclude='node_modules' --exclude='data' --exclude='web/dist' --exclude='*.log' --exclude='deploy/*.bak' .
  $size = (Get-Item $tmpTar).Length
  Ok ("Tar: " + $tmpTar + " (" + $size + " bytes)")

  Step ("2. SCP tar to " + $User + "@" + $SshHost)
  scp -o StrictHostKeyChecking=no -o ConnectTimeout=10 $tmpTar ("${User}@${SshHost}:${remoteTar}") | Out-Null
  Ok ("Uploaded to " + $User + "@" + $SshHost + ":" + $remoteTar)

  Step ("3. Run remote-install.sh on " + $SshHost + " (install + build + restart)")
  # Pass port + data dir as args to the remote script.
  $remoteCmd = "bash deploy/remote-install.sh '" + $RemoteDir + "' '" + $DataDir + "' '" + $Port + "'"
  ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ("${User}@${SshHost}") $remoteCmd
  if ($LASTEXITCODE -ne 0) { Fail "Remote install exited $LASTEXITCODE" }

  Step "4. Cleanup local tar"
  Remove-Item $tmpTar -ErrorAction SilentlyContinue
  Ok "Local tar removed"

  Step ("5. Verify remote server")
  ssh -o StrictHostKeyChecking=no ("${User}@${SshHost}") ("curl -sS -o /dev/null -w 'HTTP %{http_code} /api/me' http://127.0.0.1:" + $Port + "/api/me")
  Ok "Health check done"

  Write-Host "`n=== DEPLOY COMPLETE ===" -ForegroundColor Green
  Write-Host ("Remote: http://" + $SshHost + ":" + $Port)
  Write-Host ("Data:   " + $DataDir + " (left untouched; contains PIN hashes + events)")
}
  catch {
  Write-Host "`nDEPLOY FAILED: $_" -ForegroundColor Red
  # Best-effort cleanup
  Remove-Item $tmpTar -ErrorAction SilentlyContinue
  if (Test-Path $tmpTar) { Remove-Item $tmpTar -Force }
  ssh -o StrictHostKeyChecking=no ("${User}@${SshHost}") ("rm -f " + $remoteTar) -ErrorAction SilentlyContinue
  exit 1
}
