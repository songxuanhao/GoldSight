# 一键生成 Cloudflare Pages 上传目录（dist/）
# 用法：powershell -ExecutionPolicy Bypass -File scripts\prepare-dist.ps1
# 说明：从站点根目录复制 index.html + assets/（不含 release/ 大文件、docs/、_* 临时文件）
$ErrorActionPreference = 'Stop'
$web = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $web 'dist'

if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $dist 'assets\img') -Force | Out-Null

Copy-Item (Join-Path $web 'index.html') $dist -Force
Copy-Item (Join-Path $web 'assets\style.css') (Join-Path $dist 'assets') -Force
Copy-Item (Join-Path $web 'assets\app.js') (Join-Path $dist 'assets') -Force
Copy-Item (Join-Path $web 'assets\site.json') (Join-Path $dist 'assets') -Force
Copy-Item (Join-Path $web 'assets\img\*') (Join-Path $dist 'assets\img') -Force

$files = Get-ChildItem $dist -Recurse -File
$total = ($files | Measure-Object Length -Sum).Sum
Write-Output ("dist ready: " + $files.Count + " files, " + [math]::Round($total / 1MB, 2) + " MB -> " + $dist)
