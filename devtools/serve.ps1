# Minimalni lokalni web-server za igru (bez Node.js-a).
# Pokretanje:  powershell -ExecutionPolicy Bypass -File devtools\serve.ps1
# Zatim otvori: http://localhost:8123/
param(
  [int]$Port = 8123
)

$Root = Split-Path -Parent $PSScriptRoot
if (-not $Root) { $Root = (Get-Location).Path }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Server radi: http://localhost:$Port/   (Ctrl+C za prekid)"
Write-Host "Root: $Root"

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".css"  = "text/css; charset=utf-8"
  ".ico"  = "image/x-icon"
  ".webmanifest" = "application/manifest+json"
}

while ($listener.IsListening) {
  try {
    $ctx = $listener.GetContext()
    $rawPath = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($rawPath -eq "/") { $rawPath = "/index.html" }
    if ($rawPath -eq "/__shutdown") {
      $ctx.Response.StatusCode = 200
      $ctx.Response.Close()
      $listener.Stop()
      break
    }
    $full = Join-Path $Root ($rawPath.TrimStart("/") -replace "/", "\")
    if (Test-Path $full -PathType Leaf) {
      $bytes = [System.IO.File]::ReadAllBytes($full)
      $ext = [System.IO.Path]::GetExtension($full).ToLower()
      $ct = $mime[$ext]
      if (-not $ct) { $ct = "application/octet-stream" }
      $ctx.Response.ContentType = $ct
      $ctx.Response.ContentLength64 = $bytes.Length
      $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $ctx.Response.StatusCode = 404
      $msg = [System.Text.Encoding]::UTF8.GetBytes("404 $rawPath")
      $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
    }
    $ctx.Response.Close()
  } catch {
    # nastavi posluzivati
  }
}
