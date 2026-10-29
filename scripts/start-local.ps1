$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$pythonPath = Join-Path $repoRoot '.venv\Scripts\python.exe'
$vitePath = Join-Path $repoRoot 'apps\web\node_modules\vite\bin\vite.js'
if (!(Test-Path -LiteralPath $vitePath)) {
    $vitePath = Join-Path $repoRoot 'node_modules\vite\bin\vite.js'
}
$nodePath = (Get-Command node -ErrorAction Stop).Source
$statePath = Join-Path $repoRoot 'data\local-processes.json'
$logPath = Join-Path $repoRoot 'data\logs'
if (Test-Path -LiteralPath $statePath) {
    throw 'A local process file already exists. Run scripts/stop-local.ps1 before starting again.'
}
if (!(Test-Path -LiteralPath $pythonPath) -or !(Test-Path -LiteralPath $vitePath)) {
    throw 'Install Python and web dependencies first; see docs/SETUP.md.'
}
foreach ($port in @(8000, 5173)) {
    if (Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue) {
        throw "Port $port already has a listener. Stop it or use the manual setup commands with other ports."
    }
}
New-Item -ItemType Directory -Path $logPath -Force | Out-Null
$env:APP_MODE = 'demo'
Push-Location $repoRoot
try {
    & $pythonPath -m alembic -c services/api/alembic.ini upgrade head
    if ($LASTEXITCODE -ne 0) { throw 'Database migration failed.' }
    $apiProcess = Start-Process -FilePath $pythonPath -ArgumentList @('-m', 'uvicorn', 'app.main:app', '--app-dir', 'services/api', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory $repoRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'api.log') -RedirectStandardError (Join-Path $logPath 'api-error.log') -PassThru
    try {
        $webProcess = Start-Process -FilePath $nodePath -ArgumentList @(('"' + $vitePath + '"'), '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory (Join-Path $repoRoot 'apps\web') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'web.log') -RedirectStandardError (Join-Path $logPath 'web-error.log') -PassThru
        @{ api = @{ id = $apiProcess.Id; started = $apiProcess.StartTime.ToUniversalTime().ToString('O') }; web = @{ id = $webProcess.Id; started = $webProcess.StartTime.ToUniversalTime().ToString('O') } } | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath $statePath
    } catch {
        Stop-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue
        throw
    }
} finally { Pop-Location }
Write-Host 'Started local demo at http://127.0.0.1:5173. Startup may take a few seconds.'
Write-Host "Logs: $logPath. Stop with .\scripts\stop-local.ps1."
