# Auto-refresh the MEC credit/inventory statements from the latest WhatsApp data, then deploy if changed.
# Runs scripts/refresh-statements.js (rewrites the two generated JSON files from Supabase). If they
# changed, commits just those files and pushes to origin -> Vercel redeploys, so the server-rendered
# figures (Control Center receivables, CRM) stay aligned with the live Credit/Inventory pages.
# ASCII-only + judged by git exit code (see the PowerShell .ps1 BOM gotcha).
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# 1. Pull the latest extracted statements into the generated JSON.
node "scripts/refresh-statements.js"
if ($LASTEXITCODE -ne 0) { Write-Output "refresh failed"; exit 1 }

# 1b. Cache any new WhatsApp media (PDFs/images) into Supabase Storage so the portal can serve them
#     reliably (Vercel can't fetch WhatsApp's CDN directly). Non-fatal if it hiccups.
node "scripts/cache-media.js"

# 1c. Re-extract the credit/inventory statements ACCURATELY from the cached PDFs via Google Vision OCR
#     (the custom-font PDFs defeat the text extractor). Overwrites the generated JSON with correct numbers.
node "scripts/ocr-statement.js"

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
