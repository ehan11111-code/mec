<#
  MEC Operations Portal - automated backup.

  Captures a full copy of the project so a laptop loss is fully recoverable:
    1. (optional) commits any working-tree changes  - so in-progress work is never lost
    2. pushes the branch to a PRIVATE GitHub backup repo (the 'backup' remote, NOT 'origin')
    3. writes a full `git bundle` (whole history in one file) into a synced cloud-drive folder
    4. copies gitignored secrets (.env.local) into that folder's /secrets - drive only, never GitHub
    5. prunes old timestamped bundles

  It NEVER pushes to 'origin', so it can't trigger a Vercel deploy. Safe to run on a schedule.

  Config: scripts/backup.config.json (copy from backup.config.example.json).
  Run:    powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
#>

$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
Set-Location $repo

$logFile = Join-Path $repo 'backup.log'
function Log($msg) {
  $line = "[{0}] {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Write-Host $line
  try { [System.IO.File]::AppendAllText($logFile, $line + [Environment]::NewLine) } catch {}
}

# --- load config ---------------------------------------------------------------
$cfgPath = Join-Path $PSScriptRoot 'backup.config.json'
if (-not (Test-Path $cfgPath)) {
  Log "No scripts/backup.config.json - copy backup.config.example.json and fill it in. Aborting."
  exit 1
}
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$remote = if ($cfg.backupRemote) { $cfg.backupRemote } else { 'backup' }
$branch = if ($cfg.branch) { $cfg.branch } else { 'main' }

Log "=== backup start (remote=$remote branch=$branch) ==="

# --- 1. auto-commit working changes -------------------------------------------
if ($cfg.autoCommit) {
  $dirty = git status --porcelain
  if ($dirty) {
    git add -A
    $stamp = Get-Date -Format 'yyyy-MM-dd HH:mm'
    git commit -m "backup: auto-snapshot $stamp" --no-verify | Out-Null
    Log "Committed working-tree changes."
  } else {
    Log "No working-tree changes to commit."
  }
}

# --- 2. push to the private backup remote --------------------------------------
# git writes normal progress to stderr, so judge success by the EXIT CODE, not by stderr. Run native git
# with ErrorActionPreference=Continue so its stderr can't raise a (false) terminating error.
$hasRemote = (git remote) -contains $remote
if ($hasRemote) {
  $eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  $pushOut = (git push $remote $branch 2>&1 | Out-String)
  $code = $LASTEXITCODE
  $ErrorActionPreference = $eap
  # git writes normal progress to stderr (PowerShell dresses it up as NativeCommandError noise), so on
  # success just log the summary; only dump git's raw output when the push actually failed.
  if ($code -eq 0) {
    $ref = ($pushOut -split "`r?`n" | Where-Object { $_ -match '->' } | Select-Object -First 1)
    Log "Pushed $branch to '$remote'.$(if ($ref) { ' (' + $ref.Trim() + ')' })"
  } else {
    Log "Push to '$remote' FAILED (git exit $code):"
    foreach ($l in ($pushOut -split "`r?`n" | Where-Object { $_.Trim() -ne '' })) { Log "  git: $($l.Trim())" }
  }
} else {
  Log "Remote '$remote' not configured - skipping GitHub push. Add it with: git remote add $remote <url>"
}

# --- 3 & 4. cloud-drive bundle + secrets ---------------------------------------
$driveRoot = if ($cfg.driveDir) { Split-Path -Qualifier $cfg.driveDir -ErrorAction SilentlyContinue } else { $null }
$driveReady = $cfg.driveDir -and $cfg.driveDir.Trim() -ne '' -and ((-not $driveRoot) -or (Test-Path "$driveRoot\"))
if ($cfg.driveDir -and $cfg.driveDir.Trim() -ne '' -and -not $driveReady) {
  Log "Drive '$($cfg.driveDir)' not mounted yet (Google Drive not running?) - GitHub backup done, skipping drive copy this run."
}
if ($driveReady) {
  $drive = $cfg.driveDir
  if (-not (Test-Path $drive)) { New-Item -ItemType Directory -Force -Path $drive | Out-Null }

  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $bundle = Join-Path $drive "mec-portal-$stamp.bundle"
  $eap = $ErrorActionPreference; $ErrorActionPreference = 'Continue'
  $bundleOut = (git bundle create $bundle --all 2>&1 | Out-String); $bcode = $LASTEXITCODE
  $ErrorActionPreference = $eap
  if ($bcode -ne 0) { Log "  bundle FAILED (git exit $bcode): $($bundleOut.Trim())" }
  # also keep a stable "latest" pointer
  Copy-Item $bundle (Join-Path $drive 'mec-portal-latest.bundle') -Force
  Log "Wrote git bundle -> $bundle"

  if ($cfg.includeSecrets -and $cfg.secretsFiles) {
    $secDir = Join-Path $drive 'secrets'
    if (-not (Test-Path $secDir)) { New-Item -ItemType Directory -Force -Path $secDir | Out-Null }
    foreach ($f in $cfg.secretsFiles) {
      $src = Join-Path $repo $f
      if (Test-Path $src) { Copy-Item $src (Join-Path $secDir (Split-Path $f -Leaf)) -Force; Log "Copied secret $f -> drive/secrets" }
    }
  }

  # --- 5. prune old bundles ----------------------------------------------------
  $keep = if ($cfg.keepBundles) { [int]$cfg.keepBundles } else { 14 }
  $old = Get-ChildItem $drive -Filter 'mec-portal-2*.bundle' | Sort-Object LastWriteTime -Descending | Select-Object -Skip $keep
  foreach ($o in $old) { Remove-Item $o.FullName -Force; Log "Pruned old bundle $($o.Name)" }
} else {
  Log "No driveDir configured - skipping cloud-drive copy."
}

Log "=== backup done ==="
