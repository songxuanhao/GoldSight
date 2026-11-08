# GoldSight 金瞳 · 官网落地页 + Windows 便携包

黄金短线看盘工具（成交量分布 / 订单流 CVD / 短期走势卡 / 模拟交易）的下载落地页。纯静态、无构建、无后端，下载与校验信息全部来自 `assets/site.json`。

- **当前版本**：v1.15.19
- **下载包**：`release/GoldSight-1.15.19-win-x64.zip`（约 151MB，解压即用，不需要安装）
- **SHA256**：`A27F2891F290866A71D8A6305AD9065D4C2E9F80EE469AD4A6E253D9BCEC3274`
- **数据来源**：全部免费公开源（交易所黄金代币逐笔 + COMEX 行情/快讯 + 可选 OANDA Token），不内置任何付费行情 Key
- **性质**：模拟交易，不接实盘；不写注册表，删除目录即卸载

## 目录结构

```
GoldSight-web/
├─ index.html              # 落地页（唯一页面）
├─ assets/
│  ├─ style.css            # 设计系统与响应式样式
│  ├─ app.js               # 下载状态机 / 复制 / FAQ / 吸底 CTA / 动效
│  ├─ site.json            # 版本、大小、SHA256、下载地址（唯一数据源）
│  └─ img/                 # 应用截图与图标
├─ release/                # Windows 便携包 zip（大文件，按需上传）
├─ docs/
│  ├─ LANDING-SPEC.md      # 信息架构 / 元素状态 / 交互矩阵（page-interaction-design 规格）
│  └─ DEPLOY.md            # 上线方式（Cloudflare Pages / GitHub Pages + Release / OSS）
├─ _mobile-frame.html      # 390px 移动视图验收工具（iframe 规避 headless 视口偏差）
└─ README.md
```

## 本地预览

```powershell
node "F:\deepseek\work\preview-server.js" "F:\deepseek\工作区\GoldSight-web"
# http://127.0.0.1:8899/
```

验收：下载按钮（idle→loading→success）、复制链接/SHA、FAQ 展开、手机 390px 无横向溢出、离线提示。

## 上线

见 [docs/DEPLOY.md](docs/DEPLOY.md)。要点：

- 站点目录可整目录上传到 Cloudflare Pages / GitHub Pages / OSS 静态托管；
- **151MB 的 zip 不要放 GitHub Pages**（单文件 100MB / 站点 1GB 限制），放 GitHub Release 资产或对象存储，再把 `assets/site.json` 的 `downloadUrl` 改成直链；
- 每次发版更新 `site.json` 的版本/大小/SHA/下载地址，并在本地点一次「复制校验值」核对。

## 设计说明

页面按 `page-interaction-design` skill 设计：信息按用户视角分层、删除后台/技术过程信息、每个元素有完整状态、动效 100-500ms 且尊重 `prefers-reduced-motion`、桌面 1440 与手机 390 双端自检。详见 [docs/LANDING-SPEC.md](docs/LANDING-SPEC.md)。

## 免责声明

本软件为行情分析与模拟交易工具，不构成投资建议；数据来自第三方公开接口，延迟与可用性由数据源决定。


## 已上线

- 站点：https://goldsight.pages.dev
- 下载：https://github.com/songxuanhao/GoldSight/releases/latest
- 更新流程见 `docs/DEPLOY.md` 第 7 节。
