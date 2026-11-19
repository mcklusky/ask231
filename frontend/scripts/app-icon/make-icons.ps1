# Renders the app icons in public/icons from icon.html using headless Microsoft Edge.
# Run from anywhere:  powershell -File frontend/scripts/app-icon/make-icons.ps1
# For another country pass the brand word and calling code, e.g.  -Word ask -Code 233
param([string]$Word = 'ask', [string]$Code = '231')

$ErrorActionPreference = 'Continue'  # Edge writes harmless log lines to stderr
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$icons = Resolve-Path (Join-Path $here '..\..\public\icons')
$edge = @("${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe", "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $edge) { throw 'Microsoft Edge not found' }
$profileDir = Join-Path $env:TEMP 'app-icon-edge-profile'
$page = ([Uri](Join-Path $here 'icon.html')).AbsoluteUri

$targets = @(
  @{ File = 'icon-192.png';          Size = 192; Maskable = 0 },
  @{ File = 'icon-512.png';          Size = 512; Maskable = 0 },
  @{ File = 'icon-maskable-512.png'; Size = 512; Maskable = 1 },
  @{ File = 'apple-touch-icon.png';  Size = 180; Maskable = 1 }  # iOS rounds the corners itself
)
foreach ($t in $targets) {
  $out = Join-Path $icons $t.File
  $url = "${page}?size=$($t.Size)&maskable=$($t.Maskable)&word=$([Uri]::EscapeDataString($Word))&code=$([Uri]::EscapeDataString($Code))"
  & $edge --headless=new --disable-gpu --hide-scrollbars --default-background-color=00000000 `
    --force-device-scale-factor=1 --window-size="$($t.Size),$($t.Size)" --virtual-time-budget=10000 `
    --user-data-dir="$profileDir" --screenshot="$out" $url 2>$null | Out-Null
  if (-not (Test-Path $out) -or (Get-Item $out).LastWriteTime -lt (Get-Date).AddMinutes(-1)) { throw "Edge did not write $out" }
  Write-Host "wrote $out"
}
