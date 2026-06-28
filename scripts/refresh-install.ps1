# Register (or remove) a Windows Scheduled Task that runs refresh-statements.ps1 on a timer, so the
# portal's server-rendered receivables/inventory figures auto-refresh from new WhatsApp statements.
#   powershell -ExecutionPolicy Bypass -File scripts/refresh-install.ps1                 # every 30 min
#   powershell -ExecutionPolicy Bypass -File scripts/refresh-install.ps1 -IntervalMinutes 60
#   powershell -ExecutionPolicy Bypass -File scripts/refresh-install.ps1 -Remove
param([int]$IntervalMinutes = 30, [switch]$Remove)
$ErrorActionPreference = 'Stop'
$taskName = "MEC Statements Refresh"

if ($Remove) {
  try { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop } catch {}
  Write-Output "removed scheduled task '$taskName'"
  exit 0
}

$script = Join-Path $PSScriptRoot "refresh-statements.ps1"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NonInteractive -ExecutionPolicy Bypass -File `"$script`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date) -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Description "Refresh MEC credit/inventory statements and deploy if changed" -Force | Out-Null
Write-Output "registered '$taskName' to run every $IntervalMinutes minute(s)"
