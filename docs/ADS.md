# 变现：广告位配置与接入指南

落地页的广告能力已经内置，**不需要改代码**，只改 `assets/site.json` 里的 `ads` 节点，然后重新部署即可：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\prepare-dist.ps1
powershell -ExecutionPolicy Bypass -File scripts\deploy-pages.ps1
```

## 两种模式（可同时并存，先配哪个就用哪个）

### 模式 A：直接卖展示位（默认已开启，立即生效）

适合没有任何广告联盟账号、想直接接赞助/首屏广告的情况。访客看到的是你自己写的合作位卡片，标注「广告」，点击进入你给的链接（GitHub Issues 或你的微信/邮箱页面）。

```json
"ads": {
  "enabled": true,
  "house": {
    "enabled": true,
    "items": [
      {
        "label": "广告",
        "title": "这里可以放你的产品",
        "text": "面向黄金交易者的展示位，可整月或单月合作。",
        "href": "https://github.com/songxuanhao/GoldSight/issues/new",
        "cta": "了解合作 →"
      }
    ]
  }
}
```

- 位置：页面顶部（免费说明 band 之后）、六件事卡片之前。
- 想换成自己的产品/赞助商：改 `items[0]` 的四个字段即可；想暂时关闭：`house.enabled: false`。
- 定价参考（小站点现实值）：首屏展示位 50~300 元/月，按曝光谈；先把流量做起来再涨价。

### 模式 B：Google AdSense（需要你自己申请账号）

1. 用 Google 账号打开 <https://adsense.google.com>，注册并填写收款信息（个人可选西联/电汇，需要真实姓名、地址、税务信息）。
2. 「添加网站」填你的域名。**注意：AdSense 对 `*.pages.dev` 这类二级域名审核通常不通过，建议先给 Cloudflare Pages 绑定一个自己买的域名**（域名约 ¥30~80/年，Cloudflare 自定义域名免费，DNS 在 Cloudflare 托管即可）。
3. 审核期间 AdSense 会给你两样东西：一段 `<script>`（含 `ca-pub-xxxx`）和 `ads.txt` 要求。本页已内置脚本加载逻辑，你只需要：
   - 把 `ads.adsense.client` 填成 `ca-pub-xxxxxxxxxxxxxxxx`；
   - 在 AdSense 后台创建 3 个展示广告单元，把它们的 `data-ad-slot` 数字分别填到 `ads.adsense.slots.top / mid / bottom`；
   - 在站点根目录加 `ads.txt`（AdSense 后台会给出内容，一行 `google.com, pub-xxxx, DIRECT, f08c47fec0942fa0`），放到 `GoldSight-web/ads.txt`，`prepare-dist.ps1` 会一起复制进 dist（如未复制，手动加一行 Copy-Item）。
4. 审核通过后广告自动出现；首次访问会先弹 Cookie 同意条（`consentRequired` 默认 true），选「同意」才加载广告。
5. 广告脚本加载失败（例如中国大陆网络访问 Google 受限）时会**自动退回合作位**，不会白屏、不影响下载。

```json
"ads": {
  "enabled": true,
  "consentRequired": true,
  "adsense": {
    "client": "ca-pub-1234567890123456",
    "slots": { "top": "1234567890", "mid": "1234567891", "bottom": "1234567892" }
  }
}
```

### 模式 C：国内广告联盟（百度联盟 / 腾讯优量汇等）

需要**已备案的域名**才能接入。`pages.dev` 无法备案，所以这条路线必须先买域名 + 国内主机备案 + 接入国内 CDN/OSS，工作量明显更大。除非流量做起来了，否则不建议一开始就做。

## 合规红线（务必遵守）

- 广告必须能被识别：页面已给每块广告加「广告」标签，不要删掉。
- **不要把广告伪装成下载按钮 / 系统提示**，不要诱导点击（"点击广告支持我"这类文案在 AdSense 属于违规）。
- 金融投资类广告尤其敏感：不要接「荐股、带单、稳赚、保收益」类广告，出了事你要担责。
- 隐私政策页（`privacy.html`）已写好广告 Cookie 说明，接入 AdSense 后不需要再改；如果换成其他联盟，把第 4 节的服务商名字改掉。
- 中国大陆《互联网广告管理办法》要求显著标明"广告"并可一键关闭；页面目前是标注 + 不遮挡内容，符合基本要求。

## 怎么验证广告位生效

本地预览后，浏览器控制台执行：

```js
document.documentElement.dataset.ads   // "house" | "adsense" | "necessary" | "off"
window.__goldSightAds                  // { mode, slots: ['top','mid','bottom'] }
```

- `house`：合作位已渲染（默认状态）；
- `adsense`：AdSense 已加载；
- `necessary`：访客选了「仅必要」，不加载广告；
- `off`：`ads.enabled=false` 或没有可渲染内容。

## 现实提醒

- 广告收入 ≈ 流量 × 单价。这个站刚上线，先有下载量再谈收入；AdSense 对中文技术/工具站的单价通常不高（千次展示几元到几十元不等）。
- 更值钱的变现方式是**让软件本身收费**：例如免费版保留核心功能，高级功能（多窗格、更多指标、历史回测导出等）做成付费授权。软件里已有商业版授权骨架，比页面广告天花板高得多。
- 页面广告和软件内变现可以同时做，互不冲突。
