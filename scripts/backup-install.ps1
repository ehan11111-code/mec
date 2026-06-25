<#
  Register (or update) a Windows Scheduled Task that runs scripts\backup.ps1 automatically, so every
  change you make is backed up to the private GitHub repo + cloud drive without you doing anything.

  Run from an ordinary PowerShell (no admin needed — the task runs as the current user):
    powershell -ExecutionPolicy Bypass -File scripts\backup-install.ps1                 # every 15 min
    powershell -ExecutionPolicy Bypass -File scripts\backup-install.ps1 -IntervalMinutes 30
    powershell -ExecutionPolicy Bypass -File scripts\backup-install.ps1 -Remove          # uninstall
#>
param(
  [int]$IntervalMinutes = 15,
  [switch]$Remove
)
$ErrorActionPreference = 'Stop'
$taskName = 'MEC Portal Backup'
$repo = Split-Path -Parent $PSScriptRoot
$script = Join-Path $PSScriptRoot 'backup.ps1'

if ($Remove) {
  if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Output "Removed scheduled task '$taskName'."
  } else { Write-Output "No scheduled task '$taskName' to remove." }
  return
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
  -Argument "-NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$script`"" `
  -WorkingDirectory $repo

# Repeat forever, starting a minute from now, every N minutes.
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) `
  -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes)

$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -StartWhenAvailable -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Auto-backup of the MEC Operations Portal to the private GitHub repo + cloud drive.' -Force | Out-Null

Write-Output "Installed scheduled task '$taskName' — runs every $IntervalMinutes minute(s) as $env:USERNAME."
Write-Output "Check it: Get-ScheduledTask -TaskName '$taskName' | Get-ScheduledTaskInfo"
Write-Output "Run it now: Start-ScheduledTask -TaskName '$taskName'"
