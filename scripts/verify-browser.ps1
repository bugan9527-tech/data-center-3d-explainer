param(
  [string]$Url = 'http://127.0.0.1:5173/',
  [string]$Session = 'pcassembly-check',
  [ValidateSet('collab','teardown','server','responsive','fallback','resources','safety','backup','twin')]
  [string[]]$Check = @('collab','teardown','server','responsive','fallback','resources','safety','backup')
)
$ErrorActionPreference = 'Stop'
# Decode the UTF-8 JSON that playwright-cli prints; the default console code page
# would otherwise replace Chinese characters and break ConvertFrom-Json.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  New-Item -ItemType Directory -Force -Path outputs | Out-Null
  # Each suite gets a fresh browser. Reusing one tab across eight heavy WebGL
  # scripts occasionally crashed Chrome between suites on this machine.
  foreach ($item in $Check) {
    Write-Host "Running browser check: $item"
    & playwright-cli "-s=$Session" close 2>$null | Out-Null
    & playwright-cli "-s=$Session" open $Url --browser=chrome | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Could not open verification browser for $item" }
    $output = & playwright-cli "-s=$Session" run-code "--filename=scripts/verify-$item.browser.cjs" 2>&1
    $output | Set-Content -Encoding UTF8 -LiteralPath "outputs/$item-check.log"
    $payload = $output | Where-Object { "$_" -match '^\{"results":' } | Select-Object -First 1
    if ($LASTEXITCODE -ne 0 -or !$payload) { $output | Write-Host; throw "Browser check failed: $item" }
    $result = $payload | ConvertFrom-Json
    $name = if ($item -eq 'server') { 'full' } else { $item }
    $result | ConvertTo-Json -Depth 20 | Set-Content -Encoding UTF8 -LiteralPath "outputs/verification-$name.json"
    Write-Host "$item passed: $($result.results.Count) checks"
    & playwright-cli "-s=$Session" close 2>$null | Out-Null
  }
} finally {
  & playwright-cli "-s=$Session" close 2>$null | Out-Null
  Pop-Location
}
