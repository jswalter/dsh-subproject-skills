param(
    [string]$Workspace,
    [string]$AppPath,
    [string]$DshHome,
    [switch]$Uninstall,
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'
if (-not $AppPath) {
    $candidates = @(
        "$env:LOCALAPPDATA\Programs\DeepSeek Harness\DeepSeek Harness.exe",
        "$env:LOCALAPPDATA\Programs\deepseek-harness\DeepSeek Harness.exe",
        "$env:ProgramFiles\DeepSeek Harness\DeepSeek Harness.exe"
    )
    $AppPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
}
if (-not $AppPath -or -not (Test-Path $AppPath)) { throw 'Pass -AppPath with the full path to the installed DeepSeek Harness.exe.' }
$parameters = @('--expose-internals', (Join-Path $PSScriptRoot 'install.cjs'), '--resources', (Join-Path (Split-Path $AppPath) 'resources'))
if ($Workspace) { $parameters += @('--workspace', $Workspace) }
if ($DshHome) { $parameters += @('--home', $DshHome) }
if ($Uninstall) { $parameters += '--uninstall' }
if ($DryRun) { $parameters += '--dry-run' }
$previousElectronMode = $env:ELECTRON_RUN_AS_NODE
try {
    $env:ELECTRON_RUN_AS_NODE = '1'
    $process = Start-Process -FilePath $AppPath -ArgumentList ($parameters | ForEach-Object { '"' + ($_ -replace '"', '\"') + '"' }) -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -ne 0) { throw "Installer failed with exit code $($process.ExitCode)" }
} finally { $env:ELECTRON_RUN_AS_NODE = $previousElectronMode }
