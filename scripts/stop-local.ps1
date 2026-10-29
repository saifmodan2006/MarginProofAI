$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$statePath = Join-Path $repoRoot 'data\local-processes.json'
if (!(Test-Path -LiteralPath $statePath)) {
    Write-Host 'No saved local demo processes.'
    exit 0
}
$saved = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
foreach ($name in @('api', 'web')) {
    $entry = $saved.$name
    if (!$entry) { continue }
    $process = Get-Process -Id $entry.id -ErrorAction SilentlyContinue
    if (!$process) { continue }
    # Avoid stopping a different process if Windows has reused the saved PID.
    if ($process.StartTime.ToUniversalTime().ToString('O') -eq $entry.started) {
        Stop-Process -Id $process.Id
        Write-Host "Stopped $name process $($process.Id)."
    } else {
        Write-Warning "Skipped reused process ID $($entry.id)."
    }
}
Remove-Item -LiteralPath $statePath
