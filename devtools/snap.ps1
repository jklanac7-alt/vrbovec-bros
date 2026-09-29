# Snima sliku jednog ekrana igre iz headless Chromea (vizualna provjera).
# Preduvjet: server mora raditi (devtools\serve.ps1).
# Primjeri:
#   powershell -ExecutionPolicy Bypass -File devtools\snap.ps1 -Shot menu
#   powershell -ExecutionPolicy Bypass -File devtools\snap.ps1 -Shot game -X 2100
# Moguci ekrani: menu, chars, levels, game, pause, complete
param(
  [string]$Shot = "menu",
  [int]$X = 0,
  [string]$OutFile = "",
  [int]$Port = 8123,
  [string]$Chrome = ""
)

if (-not $Chrome) {
  $candidates = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
  )
  foreach ($c in $candidates) { if (Test-Path $c) { $Chrome = $c; break } }
}
if (-not $Chrome) { Write-Error "Chrome/Edge nije pronaden."; exit 1 }

$tmp = Join-Path $env:TEMP "vrbovec-bros-selftest"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
if (-not $OutFile) { $OutFile = Join-Path $tmp "shot-$Shot.png" }
$dom = Join-Path $tmp "shotdom.txt"
$errFile = Join-Path $tmp "shotdom.err.txt"

$url = "http://localhost:$Port/devtools/screenshot.html?shot=$Shot&x=$X"
$chromeArgs = @(
  "--headless=new", "--disable-gpu", "--no-sandbox",
  "--window-size=1280,720", "--virtual-time-budget=30000",
  "--user-data-dir=$tmp\profile", "--dump-dom", $url
)
$p = Start-Process -FilePath $Chrome -ArgumentList $chromeArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $dom -RedirectStandardError $errFile
$content = Get-Content $dom -Raw
$marker = "===SHOT===data:image/png;base64,"
$i = $content.IndexOf($marker)
if ($i -lt 0) {
  Write-Output "Slika nije napravljena (exit=$($p.ExitCode)). Radi li server na portu $Port?"
  exit 1
}
$start = $i + $marker.Length
$end = $content.IndexOf("===END===", $start)
$b64 = $content.Substring($start, $end - $start).Trim()
[System.IO.File]::WriteAllBytes($OutFile, [System.Convert]::FromBase64String($b64))
Write-Output "Spremljeno: $OutFile"
