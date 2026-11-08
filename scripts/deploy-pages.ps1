# 部署 Cloudflare Pages（包含 functions/）
# 关键：必须在站点根目录执行 wrangler，否则 functions/ 不会被识别
$ErrorActionPreference = 'Stop'
$web = Split-Path -Parent $PSScriptRoot
$wrangler = 'F:\deepseek\work\cf-deploy\node_modules\wrangler\bin\wrangler.js'
Push-Location $web
try {
  node $wrangler pages deploy dist --project-name goldsight --branch main --commit-dirty=true
} finally {
  Pop-Location
}
