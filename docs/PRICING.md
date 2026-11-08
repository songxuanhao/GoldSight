# GoldSight 定价与授权（9.9 一次买断）

## 定价

| 项目 | 内容 |
| --- | --- |
| 免费内容 | 实时行情（XAUT/PAXG 代币逐笔 + COMEX 公开数据）、成交量分布、订单流 CVD、多窗格、标注、模拟交易 |
| 授权 | 下载后需激活：**¥9.9 一次买断**，付款拿到授权码后永久使用（**无试用期**） |
| 正式版 | **¥9.9 一次买断 · 永久使用 · 单机授权**（含后续小版本更新） |
| 支付方式 | 支付宝 / 微信个人收款码（人工发授权码） |
| 授权方式 | 离线激活：机器码 → 付款 → 授权码，不联网校验 |

## 用户购买/激活流程

1. 首次启动软件即显示「商业版授权」拦截门（未激活不能使用行情）→ 复制 **本机机器码**（形如 `372D-D93D-1CA8-912F`）。
2. 扫码付款 ¥9.9，付款备注机器码后 4 位（便于对账）。
3. 把「机器码 + 付款截图」发给作者（微信/QQ，见 `src/license/purchase-info.ts` 与站点 `assets/site.json` 的 `purchase.contact`）。
4. 作者用发卡脚本生成授权码，回发给用户。
5. 用户把授权码粘进软件 → 点「激活」→ 标题栏变成「已授权：昵称」，永久有效。

## 作者发卡（本机）

发卡脚本：`F:\deepseek\工作区\GoldSight\scripts\keygen.mjs`
私钥：`F:\deepseek\工作区\GoldSight-变现\keys\license-private.pem`（**不要外传、不要提交到仓库**）
公钥已内置在软件里（`shared/license-core.mjs` 的 `LICENSE_PUBLIC_KEY_B64`）。

```bash
# 永久授权（一次买断）
node scripts/keygen.mjs --machine 372D-D93D-1CA8-912F --name "张三" --order "ORDER-001" --permanent

# 限时授权（按天，例如 30 天）
node scripts/keygen.mjs --machine 372D-D93D-1CA8-912F --name "张三" --order "ORDER-001" --days 30

# 输出到文件，便于批量发卡
node scripts/keygen.mjs --machine XXXX-XXXX-XXXX-XXXX --name "李四" --order "ORDER-002" --permanent --out license.txt
```

注意：
- 授权码与机器码绑定，换电脑需重新发卡（可给老用户免费补发，成本为零）。
- 回滚方案：如果哪天想彻底免费，把 `npm run pack` 打出的 private 版直接发出去即可；licensed 版只影响你新发布的包。

## 收款码与联系方式怎么配

| 位置 | 文件 | 说明 |
| --- | --- | --- |
| 软件激活窗口 | `GoldSight/public/pay/alipay.png`、`wechat.png` | 打包时自动进入安装目录，激活窗口显示 |
| 软件内联系方式 | `GoldSight/src/license/purchase-info.ts` → `contact` | 改完重新 `npm run pack:licensed` |
| 落地页价格区 | `GoldSight-web/assets/pay/alipay.png`、`wechat.png` | 页面显示收款码 |
| 落地页文案/联系方式 | `GoldSight-web/assets/site.json` → `purchase` | 改完跑 `prepare-dist.ps1` + `deploy-pages.ps1` |

## 发布新版本流程

```powershell
cd F:\deepseek\工作区\GoldSight
# 1) 改版本号 package.json version（如 1.15.21）
npm run pack:licensed                     # 构建 + 打包到 release-licensed
cd release-licensed\GoldSight-win32-x64
tar -a -c -f ..\..\..\GoldSight-web\release\GoldSight-1.15.21-win-x64.zip .
# 2) 算 SHA256，更新 GoldSight-web/assets/site.json 与 index.html 的版本/链接
# 3) 部署站点
cd F:\deepseek\工作区\GoldSight-web
powershell -File scripts\prepare-dist.ps1
powershell -File scripts\deploy-pages.ps1
# 4) 上传安装包到 GitHub Release（gh 需在 git 仓库内或加 --repo 参数）
gh release create v1.15.21 release\GoldSight-1.15.21-win-x64.zip --repo songxuanhao/GoldSight --title "GoldSight 金瞳 v1.15.21" --notes "更新说明"
```

## 退款与售后建议

- 9.9 金额很低，建议「激活失败/机器码变更」免费重发；不设退款流程，页面写明「虚拟商品，激活后不支持退款」。
- 支持渠道：站点 FAQ + GitHub Issues + 微信/QQ（人工）。
- 备案/合规：个人收款码小额经营可以，但长期建议办个体工商户；软件内与落地页都需保留「模拟交易、不构成投资建议」的风险提示。

## 自动解锁（v1.15.22，2026-11-08）

软件内已内置「扫码付款 → 自动解锁」，买家不需要再联系作者发码。

- 架构：落地页同域 Cloudflare Pages Functions（`GoldSight-web/functions/`）+ KV 存订单；价格与支付渠道由后端 `/api/config` 决定。
- 软件侧：`src/license/purchase-info.ts` 的 `autoUnlockBaseUrl` 指向 `https://goldsight.pages.dev`；`src/components/LicenseDialog.tsx` 负责下单、展示二维码、每 3 秒轮询，拿到授权码后调用 `gs.license.activate()` 自动激活；`src/App.tsx` 启动时还会查一次本机是否已付款（重装自动恢复授权）。
- 后端接口：`POST /api/orders`（机器码下单 → 虎皮椒返回二维码/支付链接）、`POST /api/xunhu/notify`（支付回调，验签 + 校验金额 + 幂等 → 用私钥签发授权码）、`GET /api/order?id=|machine=`（轮询）、`POST /admin/paid`（ADMIN_TOKEN 兜底/测试）。
- 当前状态：支付渠道为 **mock**（`MOCK_PAY=1`），软件不会显示自动付款按钮、自动回退人工发码；等配置虎皮椒后改为真实渠道即可自动上线。
- 开通真实支付：
  1. 注册虎皮椒（或同类支持异步回调的聚合支付），拿到 APPID、SECRET、网关地址；
  2. 在 `F:\deepseek\work\worker-license` 执行 `node <wrangler> secret put XUNHU_APPID` / `XUNHU_SECRET`（或通过 Cloudflare 控制台环境变量），把 `MOCK_PAY` 改为 `0`；
  3. 重新 `wrangler pages deploy`（functions 与绑定已配好），`GET /api/config` 返回 `configured:true, mock:false` 后，软件会自动出现「扫码付款 · 自动解锁」按钮。
- 运维兜底：`POST /admin/paid`（Header `X-Admin-Token`）可手动标记已付并发码；KV 键：`order:<id>`、`machine:<code>`、`paid:<machine>`。
- 安全：授权码仍是 Ed25519 离线签名（客户端只校验公钥），服务器只存「已付款」事实；同一机器重复下单直接返回已发授权码。

## 真实支付已开通（2026-11-08）

- 渠道：虎皮椒「微信支付四」，Appid `201906189746`，费率 2%，商户号 `1004026420`；支付网关 `https://api.xunhupay.com/payment/do.html`（客户端不直连，统一由 Pages Functions 代发起）。
- 域名：`https://shuidekuai.xin`（Cloudflare 托管，Pages 自定义域 + 自动 HTTPS）。
- Pages 环境变量（生产+预览一致）：`XUNHU_APPID`、`XUNHU_SECRET`（加密变量）、`XUNHU_GATEWAY`、`MOCK_PAY=0`、`PUBLIC_BASE_URL=https://shuidekuai.xin`、`NOTIFY_URL=https://shuidekuai.xin/api/xunhu/notify`、`RETURN_URL`/`CALLBACK_URL=https://shuidekuai.xin/`。
- 支付回调：`POST https://shuidekuai.xin/api/xunhu/notify`（验签 → 金额校验 → 幂等 → Ed25519 签发授权码 → 写 KV；客户端 3 秒轮询 `/api/order?id=` 自动激活）。
- 密钥轮换：虎皮椒后台「我的支付渠道 → 点我重置密钥」后，把新密钥写入 Pages 环境变量 `XUNHU_SECRET` 并重新部署即可；旧密钥立即失效。
- 支付宝渠道（`201906189747`，￥88 已付）仍在虎皮椒审核中（`pay_v`），开通后再补 `AppSecret` 并做渠道选择逻辑。
- 验证记录：真实下单返回虎皮椒 `payUrl`/`qrUrl`；用官方签名规则模拟回调 → 订单变 `paid` → 返回 258 字符 `GS1` 授权码 → 客户端 `verifyLicenseCode` 校验通过；测试订单/机器码记录已从 KV 清理。


## 支付宝渠道已开通（2026-11-08）

- 虎皮椒支付宝个人支付渠道已签约成功，Appid `201906189747`。
- 后端 Pages env：`XUNHU_ALIPAY_APPID`（plain）、`XUNHU_ALIPAY_SECRET`（secret）；`/api/config` 返回 `channels: { wechat, alipay }`；`/api/orders` 接受 `channel: 'wechat' | 'alipay'`（默认 wechat），订单记录里保存 channel，回调按订单 channel 选择对应密钥验签。
- 客户端 v1.15.25 起在激活窗口提供「微信支付 / 支付宝」切换，下单后显示对应渠道二维码，付款后仍自动解锁。
- 验证：真实支付宝下单返回 alipay qrUrl；模拟支付宝回调验签通过 → paid → 授权码可被 `verifyLicenseCode` 校验；同机器重复下单直接返回已购授权。
- 注意：两个渠道的 `密钥` 都要保密，轮换时同步更新 Pages env 并重新部署。

## 支付体验（v1.15.27）

- 支付结果轮询周期 1.2 秒；等待界面显示「正在等待支付结果…付款成功后自动解锁（无需任何操作）」；收到付款后先显示「已收到付款，正在解锁…」再自动激活。
- 等待中可点「换支付方式」在微信/支付宝之间实时切换（直接重新下单换二维码）；「已付款？立即查询」可立即查询一次；「在浏览器中打开」可跳转支付页。
- 已移除机器码、激活码、「已有授权码」等手动入口，付款后全自动解锁。
