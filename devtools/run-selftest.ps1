# Pokrece automatsku provjeru igre u headless Chromeu i ispisuje rezultat.
# Preduvjet: server mora raditi (devtools\serve.ps1).
# Pokretanje: powershell -ExecutionPolicy Bypass -File devtools\run-selftest.ps1
param(
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
if (-not $Chrome) { Write-Error "Chrome/Edge nije pronaden. Proslijedi -Chrome <putanja>."; exit 1 }

$tmp = Join-Path $env:TEMP "vrbovec-bros-selftest"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$out = Join-Path $tmp "dom.txt"
$err = Join-Path $tmp "dom.err.txt"

$chromeArgs = @(
  "--headless=new", "--disable-gpu", "--no-sandbox",
  "--window-size=1280,720", "--virtual-time-budget=30000",
  "--user-data-dir=$tmp\profile", "--dump-dom",
  "http://localhost:$Port/devtools/selftest.html"
)

$p = Start-Process -FilePath $Chrome -ArgumentList $chromeArgs -NoNewWindow -Wait -PassThru -RedirectStandardOutput $out -RedirectStandardError $err
$content = Get-Content $out -Raw
if ($content -and $content.Contains("===SELFTEST===")) {
  $s = $content.IndexOf("===SELFTEST===")
  $e = $content.IndexOf("===END===", $s)
  $body = $content.Substring($s, $e - $s + 9)
  $body = $body -replace "&lt;", "<" -replace "&gt;", ">" -replace "&amp;", "&" -replace "&quot;", '"'
  Write-Output $body
  if ($body -match "FAIL") { exit 1 } else { exit 0 }
} else {
  Write-Output "Test nije dao rezultat (exit=$($p.ExitCode)). Radi li server na portu $Port?"
  exit 1
}
