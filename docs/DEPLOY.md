# GoldSight 落地页 · 部署与发布指南

> 站点是**纯静态**目录，没有构建步骤：把 `GoldSight-web/` 整个目录上传即可。
> 目录结构：`index.html`、`assets/{style.css,app.js,site.json}`、`assets/img/*`、`release/*.zip`、`docs/*`、`README.md`。

## 0. 本地预览（必做验收）

```powershell
# 任意静态服务器都可以；仓库内附带 preview-server.js
node "F:\deepseek\work\preview-server.js" "F:\deepseek\工作区\GoldSight-web"
# 打开 http://127.0.0.1:8899/
```

验收点：下载按钮状态机、复制 SHA256、FAQ 展开、手机 390px 无横向溢出、离线提示。

## 1. 方案 A：Cloudflare Pages（最省事，推荐）

1. Cloudflare 控制台 → Workers & Pages → Create → Pages → **Upload assets**（无需 Git）。
2. 上传 `GoldSight-web/` 内容（排除 `docs/`、`_*.png`、`_*.html` 临时文件也可，不影响）。
3. 得到 `https://<project>.pages.dev`；可绑定自有域名并强制 HTTPS。
4. **大文件**：151MB 的 zip 不建议放 Pages（单文件上限 25MB，免费版站点资产限制）→ zip 放 Cloudflare R2（公开桶）或 GitHub Release，然后把 `assets/site.json` 的 `downloadUrl` 改成直链即可，页面无需改代码。

## 2. 方案 B：GitHub Pages + GitHub Release（免费、可追溯）

> Pages 单文件上限 100MB，站点总量 1GB，**151MB 的 zip 不能放 Pages**，必须放 Release。

1. 新建仓库（Public），把站点根目录文件推到 `main` 分支根目录（或 `docs/` 目录，二选一）。
2. 仓库 → Releases → Draft a new release：tag `v1.15.19`，上传 `GoldSight-1.15.19-win-x64.zip`，发布后得到资产直链，例如
   `https://github.com/<user>/<repo>/releases/download/v1.15.19/GoldSight-1.15.19-win-x64.zip`。
3. 把 `assets/site.json` 的 `downloadUrl` 改成上面的直链（或改 `assets/app.js` 里的默认值后再上传）。
4. 仓库 Settings → Pages → Source: `Deploy from a branch` → `main` / `(root)` → 保存，得到 `https://<user>.github.io/<repo>/`。
5. 之后每次更新：先发 Release，再更新 `site.json` 并提交站点。

## 3. 方案 C：国内对象存储 / 静态托管

- 阿里云 OSS / 腾讯云 COS：开静态网站托管，上传站点目录；zip 同桶或单独目录，`site.json.downloadUrl` 用公网直链；注意备案与 HTTPS。
- 适合国内访问速度；成本主要是流量（151MB/次下载）。

## 4. 版本更新流程（每次发版）

```powershell
# 1) 构建 + 打包（GoldSight 工程内）
cd "F:\deepseek\工作区\GoldSight"
npm run typecheck
npm run build
npm run pack

# 2) 生成站点 zip 并写 site.json（避免用 Compress-Archive 撞锁：先 robocopy 再 tar）
$web  = "F:\deepseek\工作区\GoldSight-web"
$src  = "F:\deepseek\工作区\GoldSight\release\GoldSight-win32-x64"
$tmp  = "F:\deepseek\work\dist-shadow"
$zip  = Join-Path $web "release\GoldSight-<新版本>-win-x64.zip"
if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force }
$null = robocopy $src $tmp /MIR /NFL /NDL /NJH /NJS /NP
tar -a -c -f $zip -C $tmp .
Remove-Item $tmp -Recurse -Force
# 3) 用实际文件更新 site.json（version/file/sizeBytes/sizeMB/sha256/downloadUrl）
```

- `site.json` 是页面唯一的数据源：版本、大小、SHA256、下载地址都从它读取；加载失败会退回内置兜底值。
- **务必让下载地址、SHA256 和实际文件一致**；改完在本地预览里点一次「复制校验值」核对。

## 5. 上线前检查清单

- [ ] 下载按钮链接可直接下载（不是 404，不是 HTML 页面）
- [ ] 文件大小与 `site.json` 的 `sizeMB` 一致（±1MB）
- [ ] SHA256 与 Release 附件/上传文件一致
- [ ] 手机 390px 截图无横向溢出、吸底 CTA 正常
- [ ] 复制链接/SHA 在非 HTTPS 环境也有降级（本地 file:// 可用）
- [ ] 免费数据源在全新用户数据目录下可出图（已验证：无 Token 也能加载报价与 VP）
- [ ] 免责声明与「模拟交易、不接实盘」表述保留

## 6. 常见问题

- **下载被浏览器拦截**：页面已提示用「复制下载链接」；浏览器要求 HTTPS 才允许下载时，请部署到 HTTPS 站点。
- **SmartScreen 拦截**：未签名应用正常现象；页面步骤 2 已说明「更多信息 → 仍要运行」。
- **GitHub Pages 302 到 release**：跨域下载由浏览器处理，`download` 属性对它无效，属正常行为。
- **预览服务端口占用**：换 `preview-server.js` 里的 `8899` 为其他端口，并同步截图命令。
- **headless 截图宽度不对**：Chromium headless 的 `--window-size` 与 CSS 视口宽度可能不一致；用本仓库 `_mobile-frame.html`（390px iframe）做移动端验收。


## 7. 本次已上线（2026-11-08）

| 项 | 值 |
| --- | --- |
| 站点地址 | https://goldsight.pages.dev （Cloudflare Pages） |
| Pages 项目 | `goldsight`，生产分支 `main` |
| GitHub 仓库 | https://github.com/songxuanhao/GoldSight （公开） |
| 安装包直链 | https://github.com/songxuanhao/GoldSight/releases/download/v1.15.19/GoldSight-1.15.19-win-x64.zip |
| Release 页面 | https://github.com/songxuanhao/GoldSight/releases/latest |
| Pages 上传目录 | `dist/`（9 个文件 / 2.22 MB） |
| wrangler 安装位置 | `F:\deepseek\work\cf-deploy`（wrangler 4.158.0） |
| Cloudflare 账号 | 2696059808@qq.com，Account ID `e9e00cc54b084c4037a6a50d8c9044f1` |

日常更新：

```powershell
# 1) 改页面/文案后
powershell -ExecutionPolicy Bypass -File scripts\prepare-dist.ps1
powershell -ExecutionPolicy Bypass -File scripts\deploy-pages.ps1

# 2) 发新版本时（GoldSight 工程内先 pack）
& "C:\Program Files\GitHub CLI\gh.exe" release create vX.Y.Z <zip路径> --repo songxuanhao/GoldSight --title "..." --notes "..."
# 然后更新 assets/site.json 的 version/downloadUrl/sha256 并重新部署
```


## 8. 广告位（2026-11-08 上线）

页面已内置广告位，默认展示「合作位」，无需审核、立即生效：

- 位置：免费说明 band 下方、六件事卡片上方（`aside.ad-slot[data-ad="top"]`）。
- 目前展示的是招商位：「广告位 · 这个位置正在招租」，点击进入 GitHub Issues。
- 想换成自己的产品/赞助商：改 `assets/site.json` 的 `ads.house.items[0]`（label/title/text/href/cta 五个字段），然后 prepare-dist + 部署。
- 想关闭广告：`ads.enabled = false`。
- 想接 Google AdSense：`ads.adsense.client` 填 `ca-pub-...`、`ads.adsense.slots` 填三个广告单元 id；AdSense 审核建议绑定自有域名（pages.dev 子域通常不通过），详见 `docs/ADS.md`。
- 合规：广告位都带「广告位」标签、不遮挡下载按钮、不诱导点击；已发布 `privacy.html` 隐私政策（含广告 Cookie 说明）；AdSense 模式下首次访问会弹 Cookie 同意条，拒绝后不加载广告脚本。

验证：

```js
document.documentElement.dataset.ads   // house | adsense | necessary | off
window.__goldSightAds                  // { mode, slots }
```

日常更新流程不变：改 `assets/site.json` → `prepare-dist.ps1` → `deploy-pages.ps1`。

## 自动解锁后端（v1.15.22）

- 后端代码随站点一起部署：`GoldSight-web/functions/api/[[path]].js`、`functions/admin/[[path]].js`、`functions/_lib/app.js`；依赖 `js-md5`、`tweetnacl`（站点根 `package.json`，部署前 `npm install`）。
- Pages 项目 `goldsight` 已绑定：KV 命名空间 `ORDERS`（id `6fb878cb35a24d5e9618511f95e890c9`）、环境变量 `PRICE_CNY=9.90`、`XUNHU_GATEWAY`、`MOCK_PAY`，加密变量 `LICENSE_SEED_B64`、`ADMIN_TOKEN`。
- 部署命令（在 `GoldSight-web` 目录）：`node <wrangler路径> pages deploy dist --project-name goldsight --branch main`（wrangler 位于 `F:\deepseek\work\cf-deploy\node_modules\wrangler\bin\wrangler.js`）。
- 已废弃的独立 Worker `goldsight-license.goldsight.workers.dev`：workers.dev 域名在国内被 DNS 污染无法访问，改用 pages.dev 同域 Functions，用户无需额外域名。
- 自测：`node F:\deepseek\work\worker-license\test-e2e.cjs`（mock 下单 → 管理员标记已付 → 轮询拿码 → 校验签名）。
