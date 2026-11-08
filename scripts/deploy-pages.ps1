# 部署 GoldSight 落地页到 Cloudflare Pages
# 前置：已运行过一次 `npx wrangler login`（登录态保存在用户目录），且 Cloudflare 邮箱已验证
# 用法：powershell -ExecutionPolicy Bypass -File scripts\deploy-pages.ps1 [-ProjectName goldsight]
param(
  [string]$ProjectName = 'goldsight',
  [string]$WranglerDir = 'F:\deepseek\work\cf-deploy'
)
$ErrorActionPreference = 'Stop'
$web = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $web 'dist'

if (-not (Test-Path (Join-Path $dist 'index.html'))) {
  Write-Output 'dist 不存在，先执行 prepare-dist.ps1'
  & (Join-Path $PSScriptRoot 'prepare-dist.ps1')
}

Push-Location $WranglerDir
try {
  npx --no-install wrangler pages deploy $dist --project-name $ProjectName --branch main --commit-dirty=true
} finally {
  Pop-Location
}
