# 代码约定（读完再改代码）

本文件是这个仓库的**硬约束**。设计依据在 `docs/plans/aegiston-corporate-site/spec.md`（v2），
每条约定后面都标了对应小节，有疑问回去查原文。

---

## 1. 样式：四层全局 + 极少量 CSS Modules

`src/styles/` 的四层**导入顺序即层叠顺序，不得调整**：

```
tokens.css → base.css → sections.css → sections-ext.css → responsive.css
```

由 `src/app/globals.css` 依次 `@import`，`layout.tsx` 只导入 `globals.css`。

### 为什么不是「每个组件一份 CSS Module」

`ref/1.html` 的 199 条规则里有 60 条是**跨元素后代选择器**，其中一批跨越了组件边界：

| ref 中的选择器 | 左半边 | 右半边 |
|---|---|---|
| `.cta-band .btn-primary` | `sections/CtaBand.tsx` | `ui/Button.tsx` |
| `.philosophy-head .section-label` | `sections/PhilosophyValues.tsx` | `ui/SectionHead.tsx` |
| `.solution:nth-child(even) .solution-visual` | 父列表 | 子组件 |

CSS Modules 会把类名哈希成 `Button_btn-primary__x7f2`，写在 `CtaBand.module.css` 里的
`.cta-band .btn-primary` 编译后指向**一个页面上根本不存在的类名**。
它不报错、不告警、不进 lint —— 只是样式没生效。这类失效是**静默**的，排查成本极高。

### 规则

- **ref 已有的类名**（`.hero` `.domain` `.solution` `.value` `.metric` `.news-*` `.footer-*`
  `.btn*` `.section-*` `.nav*` `.submenu` `.cta-band` `.sustain*` `.philosophy*` `.reveal`
  `.totop` `.container` …）**只能出现在 `src/styles/` 的全局层**。
  stylelint 的 `selector-disallowed-list` 会在 `*.module.css` 里拦住它们。
- React 组件侧只写 `className="cta-band"` 这样的**字符串字面量**，不经 `styles.*` 间接层。
- 与 ref 类名发生**后代关系**的新区块（PageHero / ScreenTour / PillarCard / …）
  放进 `sections-ext.css`，同样是全局层。
- 真正自包含、不触碰 ref 类名的新组件（MobileNav / Lightbox / Toast / LeadForm /
  Breadcrumbs / LegalLensArchitecture）用 `*.module.css`，且内部类名不得与 ref 撞名。

> `tests/unit/styles.spec.ts` 断言 ref 的 60 条跨元素选择器逐条存在。**这条测试红了就是视觉契约破了。**

## 2. 设计令牌：值和名字都不改

`--red` 实际是企业蓝 `#2D638A`（ref 注释「企业金，替代原三菱红」）。
**保留这组名字**，是为了让本工程与 `ref/1.html` 之间的逐条比对不产生歧义。

`--ink-3` / `--ink-4` 的对比度不达 WCAG AA（实测 2.97:1 / 1.88:1）。
处置方式是**改用色规则，不改令牌值**：这两个令牌退出全部文本用途，
只保留 1px 分隔线、图标描边、禁用态图形等非文本图形用途。
`tests/unit/contrast.spec.ts` 守这条。

## 3. 不引入 Tailwind，不引入 UI 框架

视觉基准是 `ref/1.html`，任何工具类框架都会稀释「与 ref 逐条比对」的能力。
需要一次性样式时用内联 `style`，需要复用时加进全局层。

## 4. 内容不臆造

- 站点内容 **100% 来自** `ref/智瞳安宇-总体产品介绍-V7.pptx`，每个内容块带 `sourceSlides`。
- PPT 内部自相矛盾的数据（p.84 vs p.95/p.96），一律采用**客户案例章节**口径，
  并在 `pendingConfirmation` 里写明另一版数字与差异幅度。
- 客户名默认脱敏（「某省交控集团」）；只有 PPT 已公开具名的战略合作伙伴才保留原名，
  且同样标 `pendingConfirmation`。
- 竞品对照表（PPT p.43 / p.62 / p.86）**不上公开页**：其中的评价性措辞可能触及
  《反不正当竞争法》第十一条与《广告法》第十三条。站点只做能力自述。
- 首页「全国第 1」是**西安电子科技大学的学科评估结果**，不是公司排名。
  `HomeMetric.note` 在 schema 层强制必填，并且必须**实际渲染在页面上**。
- ICP 备案号为空时页脚**不渲染该行**，不留 `陕 ICP 备 2026XXXXXX 号` 这类占位符。

## 5. 图片必须本地化

运行期**不依赖任何外部 CDN** —— 这是私有化交付的硬要求，也是 CSP 能做到
`default-src 'self'`、无任何外部域白名单的前提。

- PPT 截图：`python -m backend.scripts.extract_pptx_assets`（白名单在 `scripts/asset_map.py`）
- Unsplash / Wikimedia：`npm --prefix frontend run assets:stock`
- 字体分片：`npm --prefix frontend run fonts:fetch`（209 个 woff2 已入库 `public/fonts/`）

改了 `ASSET_MAP` 就要重跑脚本；`media_manifest.json` 与 `stock_credits.json` 由脚本生成，**勿手改**。

## 6. 路由：单一事实源，零死链

`src/lib/routes.ts` 的 `ROUTES` 常量、`site.json` 的导航数据、`sitemap.ts`、
`tests/e2e/routes.spec.ts` 四者**始终同源**。删路由就是删一处。

**不允许出现 `href="#"`、空页面或 404**。未实现的入口从导航与 `ROUTES` 中**移除**，
而不是留一个死链。`ContentRepository._check_references()` 会在启动时拦住导航里的死链。

`/products/deployment` 是**静态路由**，与三个产品 slug 分开建模 —— 否则
`generateStaticParams` 会把它当成第四个 slug。后端同理：静态路径段的路由**必须**
注册在同前缀的动态路径路由之前，`Literal` 收窄让不匹配值在路由层就落空。

## 7. 后端：内容只读常驻内存，数据库只有一张表

- 内容包体量小（全部 JSON < 800 KB）且**只读**，因此不建表、不做 ORM 查询：
  启动时反序列化成 Pydantic 模型常驻内存，读路径零 I/O、零 N+1。
- 数据库只承载 `leads` 一张表 —— 官网唯一的写路径。
- 内容包校验失败 → `ContentError` → **进程拒绝启动**。不带着坏内容上线。
- 校验只做**清单级**，不碰磁盘：图片在 `frontend/public/media/**`，后端镜像里没有这棵树。
  磁盘级校验在 `scripts/validate_assets.py`，只在 CI 跑。

## 8. 合规与脱敏

- **不存明文 IP**，只存 `sha256(ip + SECRET_SALT)`。
- 手机号 / 邮箱在日志与管理接口出参中一律脱敏（`138****8000` / `z***@example.com`）。
- 表单必须勾选同意才能提交，服务端同样校验（《个人信息保护法》告知同意）。
- 429 时**必须同时给出邮件与电话兜底路径**，绝不让用户走进死路。

## 9. 编排：降级承诺必须自洽

`depends_on` 一律用 `service_started`，**不用** `service_healthy`。
否则内容包里一个 `mediaId` 拼错 → api 永不健康 → web 从不启动 → **整站白屏**，
精心设计的快照兜底一次都用不上。
api 的 healthcheck 保留，但作用是**给运维看**，不是卡住依赖链。

## 10. 跨平台命令

本项目的开发环境是 **Windows**。所有文档化命令写成**单行**，不用 `\` 续行；
`Makefile` 只是 Linux / CI 的便利层，不是唯一入口。
跨平台的规范入口是 `npm run <task>` 与 `python -m <module>`。
脚本内部一律用 `pathlib` / `path.join`，命令行参数中的路径统一用正斜杠。

## 11. 偏离 ref 的流程

任何与 `ref/1.html` 的偏离，**先写进 spec §5.3 的偏离表，再改代码**。
当前已登记 7 条（移动端汉堡菜单、focus-visible、键盘展开下拉、本地字体、
邮箱不混淆、`--ink-3`/`--ink-4` 退出文本用途、顶栏 EN 替代色）。
实施过程中新发现的方案缺陷写进 spec 末尾的
`## 实施过程发现的方案缺陷`，不要口头决定。
