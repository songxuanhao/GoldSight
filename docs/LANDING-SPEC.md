# GoldSight 落地页 · 交互与信息设计规格

> 依据 `page-interaction-design` skill 的九步法整理。页面实现见同级目录 `index.html` / `assets/style.css` / `assets/app.js`。
> 最后更新：2026-11-08（v1.15.19）

## 1. 目标与成功标准

| 项 | 内容 |
| --- | --- |
| 给谁 | 看黄金短线、想用订单流/成交量分布、但不想注册或付费买行情的中文用户 |
| 要什么 | 30 秒内确认「免费、能用、安全」，然后下载 Windows 便携包 |
| 成功标准 | 首屏理解价值 → 下载按钮被点击；从进入到落地的路径 ≤ 2 步（不需要注册/登录） |
| 不做什么 | 不做实时行情展示站、不做账号体系、不承诺预测收益 |

## 2. 信息分层（L0–L3）

- **L0 首屏（一屏内）**：一句话价值（把一分钟行情看成地图）、三行能力（成交量分布 / 订单流 CVD / 短期走势卡）、主 CTA、免费声明、可信点（不注册、删文件夹即卸载）。
- **L1 滚动第一屏**：为什么免费（数据来源与延迟）、功能六卡、三步上手（含 Windows 拦截提示）。
- **L2 决策区**：真实界面截图（4 张，可方向键滚动）、下载包校验（SHA256 一键复制）。
- **L3 页脚**：常见问题、版本号、免责声明、隐私说明。
- **删除项**：技术实现细节（Electron/React）、采集器、内部指标、后台状态；只保留用户能感知的结果。

## 3. 版式与视觉

- 暗色品牌：`--bg #0a0d12`、`--gold #f0b90b`、`--text #e7edf7`、`--muted #8e9aad`；与应用内配色一致。
- 栅格：`.hero` 双列 ≤1024 单列；功能卡 3 列 → 2 列 → 1 列（≤640）；内容最大宽 1180。
- 字号：h1 `clamp(28px, 8.4vw, 36px)`（≤640）、正文 14.5–15px、辅助 12–13.5px。
- 对比度：正文 ≥ 4.5:1；`--muted` 用于次要说明；CTA 深色文字压在金色上。
- 图片：`max-width:100%`；截图带 `width/height` 防跳版。

## 4. 元素与输入原语（状态全集）

| 元素 | 鼠标 | 触屏 | 键盘 | 读屏 |
| --- | --- | --- | --- | --- |
| 主下载按钮 | hover 抬升 + 阴影；点击 loading→success | 44px+ 触控，无 hover 依赖 | Tab 聚焦 + Enter 触发 | `aria-label`、状态文案 aria-live（`.download-status`） |
| 复制链接/SHA | 点击 → 反馈行（复制成功/失败降级） | 同上 | 可聚焦 | 失败给出可执行替代（手动复制） |
| FAQ 手风琴 | 点击展开/收起，单开 | 同左 | Enter/Space；`aria-expanded` | `aria-controls` 关联答案 |
| 功能卡 | hover 预览展开 | 点按展开（单开） | Enter/Space 展开 | `tabindex=0`、可见焦点环 |
| 页面导航 | 锚点平滑滚动 | 同左 | Tab 顺序：logo → 锚点 → 下载 | 语义 `<nav>` |
| 手机吸底 CTA | 仅 ≤640 且首屏滚出后出现 | 同上 | 可达（在 DOM 末尾） | `hidden` 时从可访问树移除 |
| 截图画廊 | 横向滚动 / 悬停微倾 | 滑动，吸附 | ←→ 键滚动 | 图片 alt 描述 |
| 链接按钮 | 下划线虚线下划线，hover 变色 | — | 焦点环 | — |

**状态集**：默认 / hover / focus-visible / active / disabled(不适用则省略) / loading / success / error / empty（画廊无图时隐藏区域）。所有状态在 CSS 中显式定义，不依赖浏览器默认。

## 5. 交互矩阵

| 用户动作 | 发生什么 | 失败路径 |
| --- | --- | --- |
| 点击下载 | 原生下载 + 按钮进入 loading(0.9s)→success(4.2s)→idle；同时提示「若没反应用复制下载链接」 | 浏览器拦截/离线：状态行提示，并提供复制链接 |
| 复制 SHA256 | 写剪贴板成功提示；`navigator.clipboard` 不可用回退 `execCommand` | 均失败 → 提示手动选择上方校验值 |
| 打开 FAQ | 展开当前项，收起其他项（0.32s grid-rows 动画） | 内容始终在 DOM（隐藏时 `hidden`），读屏可预期 |
| 点功能卡 | 展开详情（单开）；再点收起 | — |
| 滚动过首屏（手机） | 吸底 CTA 淡入出现 | 桌面端永不显示 |
| 移动鼠标到截图（精准指针） | 轻微 3D 倾斜 + 光斑跟随 | 触屏/reduced-motion 关闭 |
| 离线 | 下载状态行提示「当前离线，下载可能失败」 | 恢复联网后刷新页面 |

## 6. 招牌交互与动效参数

- **下载状态机**：idle → loading（图标旋转 0.9s）→ success（变绿 + ✓，4.2s 后回落）；参数全部走 `--ease-out`。
- **入场**：卡片/步骤/FAQ 进入视口时 `opacity 0→1 + translateY(14px→0)`，0.5s，最多 6×40ms 阶梯；只播一次。
- **倾斜光斑**：`pointermove` + rAF 节流，±6°；仅 `(hover:hover) and (pointer:fine)`。
- **吸底 CTA**：IntersectionObserver 监听 hero，滑出 5% 后出现，`rise` 0.3s。
- **减弱动效**：`prefers-reduced-motion: reduce` 时所有 transition/animation 降至 0.001ms，reveal 直接显示。

## 7. 页面状态

- **加载**：站点元数据 `assets/site.json` 异步加载；失败使用内置兜底（版本/大小/SHA），页面不阻塞。
- **空**：无（页面内容静态；画廊缺图则隐藏；评论区不存在）。
- **出错**：下载状态行、复制反馈、离线提示三处可见错误；文案给出下一步动作。
- **离线**：检测 `navigator.onLine`，提示可复制链接稍后再试。
- **无权限**：不涉及账号/权限，无此状态（明确不做）。
- **数据极多**：长文本（SHA256）`overflow-wrap:anywhere`；画廊横向滚动；移动端单列避免挤压。

## 8. 可访问性

- 语义结构：`header/nav/main/section/footer`、`aria-labelledby` 关联标题、`figure/figcaption`。
- 焦点：全局 `:focus-visible` 2px 金色焦点环 + 2px offset；跳过纯装饰。
- 键盘：Tab 顺序与视觉顺序一致；FAQ/卡片可键盘操作；画廊方向键。
- 触控：主要点击目标 ≥44px；按钮 `touch-action: manipulation`。
- 动效：遵循 reduced-motion；无闪烁内容。
- 读屏：装饰性图标 `aria-hidden`；按钮都有可读名称；状态行 `role="status"`。

## 9. 双端自检清单（每次改版执行）

桌面 1440：
- [x] 首屏价值与 CTA 一屏可见
- [x] 功能卡 hover 展开、键盘 focus 展开
- [x] 吸底 CTA 不出现（`[hidden]` 生效）
- [x] 下载按钮 loading/success 状态可见
- [x] SHA256 复制可用

手机 390：
- [x] 无横向溢出、无文字裁切（`overflow-x:hidden` + `min-width:0`）
- [x] 首屏 CTA 全宽、触控 ≥44px
- [x] 首屏滚出后吸底 CTA 出现
- [x] 功能卡单列、点按展开
- [x] FAQ 单开、可收起

验证方式：
- 桌面：`msedge --headless=new --force-prefers-reduced-motion --window-size=1440,2400 --screenshot=... http://127.0.0.1:8899/`
- 手机：本目录 `_mobile-frame.html` 以 390px 宽的 iframe 渲染首页，规避 headless 视口宽度偏差；`_check-*.png` 为截图证据（可删）。

## 10. 已知取舍与待办

- 下载包 151MB，GitHub Pages 不适合直接放二进制（单文件 100MB 限制）→ 用 Release 资产或对象存储（见 `DEPLOY.md`）。
- Electron 未签名：Windows SmartScreen 会提示「已保护你的电脑」，页面已用步骤 2 提前告知；后续可考虑代码签名证书。
- 未做多语言（仅中文）；未做服务端统计（不收集用户数据，符合「不写注册表/不注册」的承诺）。
- 后续可加：功能短视频、真实持仓演练案例（需先有稳定用户反馈）。
