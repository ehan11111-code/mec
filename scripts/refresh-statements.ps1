# Local fallback for the always-on extract worker. Decrypts + caches WhatsApp media and OCR-extracts the
# credit/inventory statements STRAIGHT INTO Supabase (live, no redeploy), then syncs the generated JSON
# baseline so the server-rendered figures stay aligned, and pushes if they changed.
# ASCII-only + judged by git exit code (see the PowerShell .ps1 BOM gotcha).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 1. THE RELIABLE PATH: fetch+decrypt media -> Supabase Storage, OCR statements -> whatsapp_intake.extracted.
#    The live /api/credit + /api/inventory-count endpoints serve this instantly (no commit/push needed).
node "worker/index.js" --once
if ($LASTEXITCODE -ne 0) { Write-Output "worker pass failed (continuing to baseline sync)" }

# 2. Baseline sync: pull the now-accurate extracted rows into the generated JSON so the server-rendered
#    figures (any sync reads) stay aligned. Non-fatal if it hiccups.
node "scripts/refresh-statements.js"
if ($LASTEXITCODE -ne 0) { Write-Output "refresh failed" }

# 2. Commit + push only the two generated files, and only if they actually changed.
$files = @("lib/data/credit.generated.json", "lib/data/inventory-count.generated.json")
git add -- $files
git diff --cached --quiet -- $files
if ($LASTEXITCODE -eq 0) { Write-Output "no statement changes"; exit 0 }

$stamp = Get-Date -Format "yyyy-MM-dd HH:mm"
git commit -q -m "data: refresh credit/inventory statements ($stamp)"
git push origin main
if ($LASTEXITCODE -ne 0) { Write-Output "push failed (will retry next run)"; exit 1 }
Write-Output "refreshed + pushed at $stamp"
