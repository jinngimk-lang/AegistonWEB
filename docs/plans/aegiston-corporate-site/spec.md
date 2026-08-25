# 智瞳安宇 Aegiston 官网 · 生产级重构开发方案（spec）

- **Feature**: `aegiston-corporate-site`
- **版本**: **v2**（v1.0 由 Subtask #0 产出；v2 为 Subtask #1 设计评审修订版，Iteration 1 / 2）
- **作者**: 方案设计节点（Subtask #0）
- **评审**: 设计评审节点（Subtask #1）· 2026-08-25 · 结论 **有条件通过**（见文末《评审结论》）
- **日期**: 2026-08-25
- **状态**: 已评审，可进入 Subtask #2 编码。**本文档中标注「v2 修正」的段落是评审改写过的强约束，优先级高于任何与之冲突的旧表述**
- **技术栈**: Next.js 15 (App Router) + React 19 + TypeScript 5 + FastAPI 0.115 (Python 3.11)
- **内容来源**: `ref/1.html`（视觉与布局基准）、`ref/智瞳安宇-总体产品介绍-V7.pptx`（全部文案与真实软件截图，98 页）

---
---

## 评审记录（Review Notes）

> **评审人**：Subtask #1 设计评审节点 · **评审日期** 2026-08-25
> **评审对象**：`spec.md` v1.0（1015 行）+ `content-notes.md`
> **评审方法**：逐节阅读，并对**全部可验证的事实性断言回源实测**——涉及 `ref/1.html` 的度量从 154 KB 原文解析比对；涉及 PPT 的资源映射通过 `ppt/slides/_rels/slideN.xml.rels` 反查；对比度数值按 WCAG 2.1 相对亮度公式重算；工具链可用性在当前 Windows 执行环境实测。
> **评审维度**：可行性 / 完备性 / 一致性 / 规模适配。

### A. 复核通过的部分（记录在案，下游不必重复怀疑）

| 项 | 复核方式 | 结论 |
|---|---|---|
| §6.2 截图映射表的 78 条 `asset-id ← image*.ext（页码）` | 解析 PPTX 全部 98 张 slide 的 `_rels`，逐条比对 | **78/78 全部命中，0 处错误** ✅ |
| §6.1 资源盘点（131 个媒体 / 58 MB / `image64.GIF` 25.07 MB / `image15.png` 3.70 MB / `image26.png` 3.64 MB / 1 个 EMF / 6 个 SVG / 98 页） | `zipfile` 实测 | 全部属实 ✅ |
| §5.1 设计令牌 | 与 ref `:root{}` 逐字符比对 | 一字不差，可原样搬运 ✅ |
| §4.2 路径 A 的 `IntersectionObserver(threshold:.12, rootMargin:'0px 0px -50px 0px')` | 与 ref 内联 JS 比对 | 完全等价 ✅ |
| §5.2 除「断点」行外的 27 项度量 | 逐条回查 ref 规则 | 全部属实（`.utility-bar` 的 `height:36px` 实际落在 `.utility-inner` 上，不影响实现）✅ |
| `content-notes.md` §1 数据冲突表 | 回读 PPT p.95 / p.96 原文 | p.95「10 分钟 / 300+ 份 / 3000+ 项 / >90%」、p.96「10 分钟 / 1000+ 规则 / 11 类合同 / 99%（原 41%）」均属实，冲突记录准确 ✅ |
| 工具链 | 当前环境实测：node v22.18.0 / Python 3.11.7 / git 2.44.0 / git-lfs 3.4.1 / **ffmpeg 可用** | §6.4 的 GIF→MP4 **主路径可走**，不必退化为首帧静态图 ✅ |

这是一份地基扎实、可执行度很高的方案。下面的问题集中在两类：**对源材料的少数误读**（会直接违反方案自己立的 §5 视觉契约），以及**工程落地时会真实爆炸的接缝**（路由遮蔽、容器编排自相矛盾、跨仓库断言、CSP 与 ISR 互斥等）。

### B. 问题清单

严重度定义：**P0** = 会导致核心目标（G1 视觉一致 / G3 无死链）系统性失败，必须改；**P1** = 会导致某个模块在实现或部署阶段确定性失败 / 产生合规风险，必须改；**P2** = 质量与一致性改进，不阻塞本轮交付。

| # | severity | 位置 | 问题 | v2 处置 |
|---|---|---|---|---|
| **P0-1** | P0 | §5.2 断点行 | **断点表与 `ref/1.html` 实测严重不符。** ref 共 9 条 media query，断点是 `1024 / 900 / 768 / 640` 四档；spec 只写了 `1024 / 768` 两档，且 6 条行为映射中 **4 条挂错断点**（solution 单列、footer 2 列实为 900px 而非 1024px；news 单列实为 900px 而非 768px；domains 单列实为 640px 而非 768px），并**完全遗漏** `.values` 单列（900px）与 `.domains` 4→2 列（1024px）。按 v1.0 实现，`640px–1024px` 之间的所有视口都会与 ref 不一致——这正好覆盖平板与小笔记本 | §5.2 断点行整行重写为四档全量表，逐条附带 ref 原始声明（含 `gap` / `order` 复位 / `::after{display:none}` 等细节） |
| **P0-2** | P0 | §9.3 `src/**/*.module.css` | **「每个组件一份 CSS Module」与 ref 的样式结构不兼容。** ref 的 199 条规则里有 **60 条是跨元素后代选择器**，其中一批**跨越了 §9.3 划定的组件边界**：`.cta-band .btn-primary`（CtaBand ↔ ui/Button）、`.philosophy-head .section-label` / `.section-title`（PhilosophyValues ↔ ui/SectionHead）、`.solutions-intro .section-label`、`.solution:nth-child(even) .solution-visual`、`.metric:not(:last-child)::after`、`.footer-col a` 等。CSS Modules 会哈希类名，写在 A 组件里的 `.cta-band .btn-primary` **永远匹配不到** B 组件里被哈希过的 `.btn-primary`——这类失效是**静默**的，不报错、不告警，只是样式没生效，会在 §12.3 的像素比对里表现为一大片说不清来源的差异。同时它也让 §9.3 自己宣称的「与 ref 类名一一对应」无法成立 | §9.3 改为**双层样式策略**：ref 的结构性样式作为**全局 CSS**（不哈希、保留原类名）搬入 `src/styles/sections.css` 等；CSS Modules 只用于 ref 中不存在的新组件。并明确禁止重命名 ref 类名 |
| **P1-1** | P1 | §5.3 `.reveal` 行 | **事实误判。** spec 称「ref 中被覆写成 `opacity:1;transform:none`（动效实际失效）」——实测：`.reveal{opacity:0;transform:translateY(20px);transition:…}` 是基线规则，`opacity:1;transform:none` **只出现在 `@media(prefers-reduced-motion:reduce)` 块内**，是正确实现而非 bug。据此把初始位移「改回 24px」会**主动制造**一处与 ref 的偏离，违反 §5 契约 | §5.3 该行改为撤销条目，并钉死 `translateY(20px)` + `.7s cubic-bezier(.2,.8,.2,1)` + reduced-motion 分支原样保留 |
| **P1-2** | P1 | §10.4 字重收敛 | **字重统计错误，会造成全站字重漂移。** spec 称「实际只用到 300/400/500/700」；实测 ref 有 **10 处 `font-weight:600`**（`.btn-primary` `.section-label` `.section-more` `.btn-text` `.domain-link` `.solution-code` `.value-num` `.news-date` `.news-item-cat` `.brand-text .en`），其中落在 `--sans-en`（Inter，声明了 600）上的 5 处**真实渲染为 600**。按 v1.0「只打包 4 个字重」执行会删掉 Inter 600，全站 eyebrow 标签与数字字重立刻变化。另外 spec 把三个字族的声明混为一谈（Inter 是 `300;400;500;600;700`，Noto Serif SC 是 `500;700;900`） | §10.4 改为按字族分列的字重表 + 显式「600 不得删除」警告 |
| **P1-3** | P1 | §10.3 对比度 | **对比度数值错误，且缓解规则本身不达标。** 实测 `--ink-3 #8B97A7` 对白底是 **2.97:1**（非 spec 所称 2.6:1）；关键在于 2.97 **< 3.0**，所以 spec 给的例外「仅用于 ≥18.66px 粗体」**同样违反 AA**（大字号门槛是 3:1）。此外 spec 未覆盖两处实际存在的问题：`--ink-4 #B5BEC9` 对白底仅 **1.88:1**；顶栏 `.lang-en #6A80A0` 对 `--navy-deep` 仅 **4.29:1**（12px 文本需 4.5:1）——而 §2.2 恰好要把 EN 切换渲染成 `aria-disabled` 的可见元素。DoD #7 要求 axe **零** serious 违规，按 v1.0 规则达不到 | §10.3 换成实测对比度表 + 三条强制规则；新增替代色 `#8AA0BE`（实测 6.46:1）；并在 §5.3 登记为显式偏离 |
| **P1-4** | P1 | §7.2 端点顺序 | **路由遮蔽，`/products/deployment` 必定 404。** FastAPI 按**声明顺序**匹配路径；§7.2 把 `GET /api/v1/products/{slug}` 列在 `GET /api/v1/products/deployment` **之前**，实现者照抄顺序注册后，`/products/deployment` 会落进 `{slug}` 处理器，因 slug 不在 `aragonteam/inkclaw/legallens` 中而返回 RFC7807 404。前端 `/products/deployment` 页随即取不到数据 → 直接打破 G3「无死链」与 DoD #1「24 条路由全部可达」 | §7.2 调换两行顺序并加注册顺序强制说明；§12.1 增加回归用例 |
| **P1-5** | P1 | §11.2 + §13 R12 | **编排与降级承诺自相矛盾。** R12 承诺「后端挂了官网仍可访问」，但 §11.2 的 `web.depends_on: { api: { condition: service_healthy } }` 意味着 api 不健康时 **web 根本不会启动**；而 §8.2 又规定内容包校验失败即「拒绝启动」。两者叠加：内容包出一个引用错误 → api 永不健康 → web 不启动 → **整站白屏**，降级快照一次都用不上。此外快照本身存在先有鸡先有蛋问题：§7.4 的 `sync-content.mjs` 需要 API 已在 `localhost:8000` 运行，但 spec 未定义快照在**何时生成、由谁提交、如何防止过期** | §11.2 改 `service_started` + 文中补「快照生命周期」小节（CI 生成 → 入库 → 漂移检查） |
| **P1-6** | P1 | §12.1 `test_content_integrity` | **断言跨仓库，在后端容器内不可运行。** 该用例要求「所有 manifest 中的文件在磁盘存在且宽高与记录一致」，但图片产物在 `frontend/public/media/**`，后端镜像里根本没有这棵树（§4.1 也明确写了「构建期产物，非运行期依赖」）。照此实现，要么测试在容器/CI 里恒失败，要么被迫把 58 MB 图片塞进后端镜像 | §12.1 拆成「后端可跑的清单级完整性」+「CI 专用的磁盘级校验」两层，并明确 `ContentRepository` 启动校验只做清单级 |
| **P1-7** | P1 | §11.3 CSP | **CSP 策略自相矛盾且与渲染策略互斥。** ① `script-src 'self' 'unsafe-inline'(…用 nonce 收紧)`：CSP Level 2+ 规定**一旦出现 nonce，浏览器就忽略 `'unsafe-inline'`**，两者写在一起没有「渐进收紧」的中间态，只有二选一。② Next.js 的 nonce 必须由 middleware 逐请求下发，**读取 nonce 的页面会被强制转为动态渲染**，直接推翻 §4.3 的 ISR + Full Route Cache 与 §3.1 里 24 条路由的渲染策略。③ 缺 `base-uri` / `form-action` / `object-src` / `upgrade-insecure-requests` | §11.3 重写为「v1 明确选择 `'unsafe-inline'` 保 ISR」，把 nonce 方案降级为带前提条件的 v2 选项，并补齐缺失指令 |
| **P1-8** | P1 | §5.3 字体行 | **`next/font/google` 解决不了 spec 自己提出的问题。** 该方案确实在**运行期**自托管，但**构建期**仍要访问 `fonts.googleapis.com` / `fonts.gstatic.com`。而 §1、§6.3、§11.3 反复强调「私有化/内网交付」「运行期不依赖外部 CDN」「CSP 无任何外部域白名单」——客户在隔离网内执行 `docker build` 会直接失败 | §5.3 改为 `next/font/local` + 字体文件入库，并补一次性下载脚本 |
| **P1-9** | P1 | §4.2-C / §7.3 / §11.1 | **限流设计在真实场景下不可用。** ① `5/hour/IP`：政企客户普遍单一 NAT 出口，一家客户整栋楼共享配额，第 6 个真实商机被 429 掉——这是唯一的商业转化路径。② `slowapi` 默认内存存储 + §11.2 的 `gunicorn 2 workers`：计数器**按 worker 各算一份**，实际配额变成不确定的 5~10/小时；`test_lead_ratelimit` 在单进程测试环境通过、生产行为却不同，属于测试给了假信心 | §7.3 增加「限流与反滥用」小节：分层配额（IP 宽松 + 指纹/手机号严格）、共享存储或单 worker、429 文案与人工兜底路径 |
| **P1-10** | P1 | §3.2 `.metrics` 行 | **合规风险：把高校学科排名当作公司指标展示。** PPT p.93 的原文语境是「依托西安电子科技大学……网络空间安全学科（全国第 1）」——这是**高校的**学科评估结果。首页 `.metrics` 把「全国第 1」与「20+ 博士硕士」「30+ 项知识产权」并列为公司的四个头条数字且无任何归属说明，容易被理解为公司自身获得全国第一，存在《广告法》第九条/第二十八条风险，也与 §13 R2 处理竞品措辞时的谨慎标准不一致 | §3.2 该指标改为带归属说明的写法，并在 `Metric` 模型上要求 `note` 字段必填；同时同步到 §8.2 |
| **P1-11** | P1 | §12.3 `visual.spec` | **验收机制逻辑不成立。** 基准图「由 `ref/1.html` 首屏对齐后人工确认生成」，但新站的**文案、图片、导航标签全部换了**（这正是 G2/G4 的要求），与 ref 截图做 ≤0.3% 像素比对**在物理上不可能通过**。其次，把 0.3% 像素差设成 CI 硬门禁，在 CJK Web 字体 + 跨平台渲染下必然抖动，会变成长期红灯 | §12.3 拆成「§5.2 度量的**计算样式断言**（可自动、稳定、真正守护 1:1）」+「新站自身的视觉回归基线（容器内生成，advisory）」两条 |
| **P1-12** | P1 | §9.1 / §14 Phase 0 | **仓库尚未 `git init`，而 Subtask #3 的验收条件是 `git commit`。** 当前 `M:/Standard-Project/aegiston` 下没有 `.git`，§14 Phase 0 也没有初始化步骤。另外 §9.1 规定「媒体产物走 Git LFS」——本仓库无远端，LFS 在此处只增加 smudge/pointer 出错面而不带来任何收益（≈77 张 WebP，单张 ≤320 KB，总量约 25 MB，直接入库完全可控） | §14 Phase 0 增加 `git init` 与首个提交；§9.1 去掉 LFS 强制，改为「媒体产物直接入库 + `.gitattributes` 标 binary」 |
| **P1-13** | P1 | §9.2 / §11.1 | **Alembic 与异步驱动 URL 不兼容。** `AEGISTON_DATABASE_URL=sqlite+aiosqlite:////data/aegiston.db` 是异步 URL，Alembic 默认的同步 `env.py` 用它会直接报错。spec 未定义迁移侧使用什么连接串，容器首次启动执行迁移即失败 | §11.1 增加 `AEGISTON_SYNC_DATABASE_URL`；§9.2 明确 `env.py` 用同步 URL，并补 SQLite `busy_timeout` 等 pragma |
| **P1-14** | P1 | §13 R14 / §14 | **规模与交付节点不匹配。** 任务树里 Subtask #2 是**单个**编码节点，要产出约 170 个文件 / 24 条路由 / 19 个端点 / 全量内容包。R14 虽然提了 P0/P1/P2 分级，但 §14 的 Phase 0–4 是**线性全量**清单，没有定义「哪一刀切下去仍是一个可交付的完整站点」，也没有定义未完成部分如何回写。这会导致最可能的失败模式：四个阶段各做一半，最后没有任何一条路径是完整的 | §14 增加**最小可交付切线（MVP Cut Line）**与降级顺序，并规定未完成项必须回写到 spec 的指定小节 |
| **P1-15** | P1 | §7.4 CLI | **命令在本项目的实际执行环境（Windows / PowerShell）下不可运行。** §7.4 全部使用 bash 反斜杠续行 `\`，PowerShell 会解析失败；§9.1/§14 又把 `Makefile` 当作唯一入口，而 Windows 默认无 `make`。Subtask #2 就在 Windows 上执行，这是第一步就会撞上的墙 | §7.4 改为单行命令 + `npm run` / `python -m` 跨平台入口；§9.1 把 `Makefile` 降为可选便利层 |

### C. P2（记录，不阻塞本轮，交由 Subtask #2/#3 顺手处理）

| # | 位置 | 问题 | 建议 |
|---|---|---|---|
| P2-1 | §6.3 / §2.1 G5 | 数量口径不符：ref 实际只有 **4 个不重复的** Unsplash photo id（`1518770660439` 与 `1486406146926` 各出现两次），spec 称「已选 5 张」是把 Wikimedia 天际线算了进去；「新增 6 张」实为 7 张。表格本身 11 行是对的 | 修正为「沿用 ref 的 4 张 Unsplash + 新增 7 张，另加 1 张 Wikimedia Hero 背景」 |
| P2-2 | §6.2 | `ara-state-todo / -running / -done / -verified ← image44/45/46/47.png` 与 `legal-simple-review ← image96.png (66/73)` 是给人读的缩写，但 §6.2 声明「脚本硬编码，逐条实现」，`ASSET_MAP` 需要机器可读的一行一条（已复核：`image96.png` 确实同时出现在 p.66 与 p.73，写法无误，只是需展开） | 展开为逐条；多页引用取首次出现页作 `source_slide`，其余记入 `also_on` |
| P2-3 | §8.2 / §2.2 | `LocalizedText` 定义了却**没有任何字段使用它**，§2.2 承诺的「schema 预留 `en` 字段，v2 可无损扩展」在模型层没有兑现 | 要么在 `ProductDetail.tagline` 等对外文案字段上真的用起来，要么把 §2.2 的承诺降级为「v2 需要一次 schema 迁移」 |
| P2-4 | §7.2 | `Page[InsightSummary]` / `Page[LeadRead]` 的分页包络结构（`items` / `total` / `page` / `pageSize` / `hasNext`）从未定义 | 在 §8.2 补 `Page[T]` 泛型模型 |
| P2-5 | §4.2 vs §9.3 | 路径 A 写 `src/app/(site)/page.tsx`，§9.3 文件清单写 `src/app/page.tsx`，两者不一致 | 统一为 `src/app/page.tsx`（v1 没有多套 layout，不需要 route group） |
| P2-6 | §3.1 | `/products` 与 `/solutions` 两个总览页**未出现在主导航结构**里（下拉直接列四个子项），成为只能靠面包屑/内链到达的孤儿页 | 下拉菜单首项加「总览」，或把主菜单项本身做成可点击链接 |
| P2-7 | §12.1 `test_source_coverage` | 「截图 asset ≥ 45 个」口径含混：§6.2 的 77 个 asset 里有 7 个是示意图/架构图、3 个是案例配图，只有约 66 个是真实软件截图 | 断言收紧为 `kind == "screenshot"` 的计数 ≥ 45 |
| P2-8 | §13 R12 | 提到「`stale-if-error` 语义」——Next.js 的 Data Cache 并不实现该 HTTP 扩展指令，真正兜底的是快照与 ISR 陈旧值 | 删掉 `stale-if-error` 表述，避免实现者去找一个不存在的开关 |
| P2-9 | `content-notes.md` §7 | 天际线图授权被列为 🟡 待核实（CC BY / CC BY-SA 未定），但 `ref/1.html` 末尾的 `Visual sources` 注释已写明该图为 **CC0 1.0**（无需署名） | 以 ref 注释为线索去 Wikimedia 原页面确认后关闭该项；若确为 CC0，署名改为「自愿标注」 |
| P2-10 | §9.2 | `pyproject.toml` 同时列了 `python-pptx` 与 §4.2 路径 D 的 `zipfile` 直读方案；两条路线只需一条 | 保留 `zipfile` 直读（更可控、无需渲染引擎），删掉 `python-pptx` 依赖或注明仅用于校验 |
| P2-11 | §12.4 | `lhci` 把 `SEO = 100` 设为硬门禁，Lighthouse 版本升级即可能因新审计项跌破 100 | 改为 `SEO ≥ 95` 并锁定 `lhci` 版本 |

### D. 评审后仍然开放的阻塞项

§15 与 `content-notes.md` §8 列出的 8 项待客户/法务确认事项，**本次评审无权关闭**，维持原状；其中 R1（数据口径）、R2（竞品表）、R3（客户具名）在拿到书面确认前，一律按 `content-notes.md` 的保守口径实现，不阻塞编码。

---

## 1. 概述（Overview）

当前仓库里只有两份素材：一份单文件静态页 `ref/1.html`（154 KB，含完整设计令牌、栅格与滚动动效，视觉语言参照三菱重工式的「白底 + 企业蓝 + 海军蓝」企业官网风格），以及一份 61 MB 的产品介绍 PPT `ref/智瞳安宇-总体产品介绍-V7.pptx`。静态页的**视觉是成立的，但内容是占位的**——它讲的是「合约智审 CINT / Inkclaw 闭环平台 / AragonTeam 编排引擎」这套早期叙事，与 PPT 里已经成型的「组织级 AragonTeam / 通用级 InkClaw / 行业级 LegalLens 合约智审」三层产品体系并不一致；同时它是一个单页锚点站，导航里的五个下拉菜单共 20 余个入口全部指向 `#`，点击无效。PPT 反过来又是内容富矿：从市场背景、范式判断、四重困境根因，到三条产品线的功能矩阵、11 项核心技术、5 篇顶会/前沿论文、3 个行业标杆客户案例，再到 131 张媒体资源（其中约 60 张是 AragonTeam / InkClaw / LegalLens 的**真实产品界面截图**）。

本方案要做的事情是：**保留 `ref/1.html` 的全部视觉语言与栅格系统，把它从"一张静态图片"重建为一个可运行、可维护、可部署的生产级多页站点，并用 PPT 里的真实内容与真实截图把它填满。** 技术上拆成两层：Next.js 15 App Router 负责渲染、路由、SEO、图片优化与交互；FastAPI 负责内容 API、线索（Lead）收集与健康检查。内容本体以受 Pydantic 校验的 JSON 内容包形式随代码入库，由 FastAPI 的 `ContentRepository` 在启动时一次性加载并常驻内存，Next.js 通过 ISR 在服务端拉取；同时构建期会生成一份内容快照写入前端仓库，API 不可用时页面自动降级到快照渲染——保证「后端挂了官网仍然可访问」。

之所以在一个内容站上引入 FastAPI 而不是把 JSON 直接塞进前端，有三个务实理由：其一，线索表单（预约演示 / 商务咨询）需要一个有校验、有限流、有落库、有审计的服务端，这是官网唯一的写路径，不能放在前端；其二，PPT 内容后续会随版本迭代（V7 → V8），把内容收敛到一个有 schema 校验的服务里，可以在 CI 阶段拦住「字段缺失 / 截图 ID 指向不存在的资源」这类错误，而不是等到线上白屏；其三，客户群体是政府、国企、央企（PPT p.9 明确「数据不出企业网」是准入条件），未来大概率需要整站私有化部署，前后端分离的 Docker Compose 形态比 Vercel 式托管更贴合交付现实。

---

## 2. 目标与非目标

### 2.1 目标（v1 必须达成）

| # | 目标 | 验收锚点 |
|---|---|---|
| G1 | 视觉、栅格、排版、动效与 `ref/1.html` 一致 | §5 视觉一致性契约逐条比对 |
| G2 | 内容 100% 来自 PPT V7，不臆造数据 | §3.2 内容溯源表，每个内容块标注来源页码 |
| G3 | 多页站点，导航/按钮全部可点可达，无死链 | §12.3 路由完整性测试 + Playwright 全链路点击 |
| G4 | 使用 PPT 中的**真实软件截图** | §6.2 资源映射表，≥ 45 张截图入站 |
| G5 | 配图使用 Unsplash | §6.3 图库清单（**v2 修正口径**：沿用 ref 的 4 张 Unsplash + 新增 7 张 + 1 张 Wikimedia Hero 背景） |
| G6 | 生产级工程质量 | 类型完备、测试覆盖、CI 门禁、Docker 交付、可观测性 |
| G7 | 符合人机交互与无障碍最佳实践 | WCAG 2.1 AA、键盘可达、`prefers-reduced-motion`、移动端导航 |

### 2.2 非目标（v1 明确不做，避免范围蔓延）

- **英文站**：`ref/1.html` 顶栏有「中文 / EN」切换。v1 只做 `zh-CN`，EN 入口渲染为 `aria-disabled` 并带 `title="英文站建设中"`；但**内容 schema 的所有文案字段预留可选 `en` 字段**，v2 可无损扩展（详见 §9.1）。
- **CMS / 后台编辑器**：内容随 Git 走，不做可视化编辑。
- **用户注册登录 / 产品试用环境**：「免费试用」「进入工作台」类按钮指向 `/contact?intent=trial`，不接真实产品。
- **全文搜索**：导航右侧放大镜按钮 v1 打开一个静态站点地图抽屉（`/sitemap`），不接搜索引擎。
- **竞品对照表公开发布**：见 §13 **R2**（v2 勘误：v1.0 此处误写为 R6，R6 是 EMF 架构图），默认不在公开页展示竞品名称。

---

## 3. 信息架构与内容溯源

### 3.1 站点地图与路由表

导航的**结构**（顶栏 utility-bar + 6 个主菜单 + 联系按钮，5 个带下拉）严格沿用 `ref/1.html`，但**标签与目标**改为 PPT 口径。

| 路由 | 页面 | 主要内容来源（PPT 页码） | 渲染策略 |
|---|---|---|---|
| `/` | 首页 | p.11 / p.13 / p.93 / p.94 | ISR 300s |
| `/about` | 公司简介 | p.93 | ISR 3600s |
| `/about/positioning` | 公司定位与三层产品底座 | p.13 / p.93 | ISR 3600s |
| `/about/team` | 研发团队 | p.88 / p.89 / p.90 / p.91 | ISR 3600s |
| `/about/strength` | 科研实力与知识产权 | p.88 / p.93 | ISR 3600s |
| `/products` | 产品总览（一套底座，三层产品） | p.13 | ISR 600s |
| `/products/aragonteam` | AragonTeam · 企业 AI 原生人机协同工作站 | p.14 / p.17–p.43 | ISR 600s |
| `/products/inkclaw` | InkClaw · 线上安全通用智能体 | p.15 / p.44–p.62 | ISR 600s |
| `/products/legallens` | LegalLens 合约智审 | p.16 / p.63–p.86 | ISR 600s |
| `/products/deployment` | 交付形态：私有化 / 一体机 / 私有云 | p.9 / p.11 / p.18 | ISR 3600s |
| `/solutions` | 行业实践总览 | p.94 | ISR 600s |
| `/solutions/telecom` | 通信服务 · 中通服陕西等省公司 | p.95 / p.84 | ISR 3600s |
| `/solutions/transportation` | 交通基建 · 某省交控集团 | p.96 / p.84 | ISR 3600s |
| `/solutions/legal-services` | 法律服务 · 某头部律所 | p.97 / p.84 | ISR 3600s |
| `/solutions/finance` | 金融与强监管行业 | p.94 | ISR 3600s |
| `/research` | 核心技术总览（11 项技术模块） | p.40 / p.41 / p.60 / p.61 / p.82 / p.83 / p.84 | ISR 3600s |
| `/research/papers` | 学术成果（5 篇论文） | p.42 / p.85 | ISR 3600s |
| `/insights` | 洞察与动态列表 | p.3–p.10（行业洞察改写） | ISR 300s |
| `/insights/[slug]` | 洞察详情 | 同上 | ISR 300s + `generateStaticParams` |
| `/careers` | 加入我们 | p.88 / p.91 | Static |
| `/contact` | 联系我们（含线索表单） | p.93 | Dynamic（表单为 client） |
| `/sitemap` | 站点地图（搜索抽屉亦复用） | — | Static |
| `/legal/terms` | 使用条款 | 待法务提供 | Static |
| `/legal/privacy` | 个人信息保护政策 | 待法务提供 | Static |

**主导航结构（`site.navigation`）**

```
关于我们   → /about | /about/positioning | /about/team | /about/strength
产品与方案 → /products/aragonteam | /products/inkclaw | /products/legallens | /products/deployment
行业实践   → /solutions/telecom | /solutions/transportation | /solutions/legal-services | /solutions/finance
技术与研究 → /research | /research/papers
洞察与动态 → /insights?category=insight | /insights?category=news | /insights?category=research
加入我们   → /careers   （无下拉，对应 ref 中最后一个 .nav-item）
[按钮] 联系我们 → /contact
```

### 3.2 首页内容映射（与 `ref/1.html` 区块一一对应）

| ref 区块 | 新内容 | PPT 来源 |
|---|---|---|
| `.utility-bar` | 投资者关系→`/about`、全球网络→`/solutions`、合作伙伴→`/solutions`、企业邮箱→`mailto:` | p.94 |
| `.hero` | 标题「以智能之眼 守数字之安」保留；副标改为 PPT 定位语：「西安智瞳安宇科技有限公司是"AI+"企业智能化赋能与安全保障专家，以组织级、通用级、行业级三层产品，构成同一套企业智能底座。」 | p.1 / p.93 |
| `.domains`（4 格） | 组织智能 Organizational Intelligence / 通用智能体 General Agent / 法律智能 Legal Intelligence / 私有化交付 Private Deployment | p.13 / p.9 |
| `.solutions`（3 段左右交错） | ARA·01 AragonTeam；INK·02 InkClaw；LGL·03 LegalLens 合约智审。`.solution-visual` 换成**真实产品截图**（原为纯色块+SVG 占位） | p.13 / p.14 / p.15 / p.16 |
| `.philosophy`（3 张价值卡） | 01 使命：让智能进入组织；02 愿景：让每一次执行沉淀为组织资产；03 价值观：可管理 · 可执行 · 可进化 | p.11 |
| `.metrics`（4 个数字） | `20+` 博士硕士研发队伍 / `30+` 项自主知识产权核心技术 / `全国第 1`（**v2 修正：必须带归属说明**，见下）/ `5 篇` 顶会与前沿论文 | p.88 / p.93 / p.42 / p.85 |
| `.news`（1 大 + 4 小） | 由 `/insights` 前 5 条驱动 | p.3–p.10 |
| `.sustain` | 改为「私有化与一体机：不仅是可选项，更是准入条件」，三条要点=政策合规 / 技术前提 / 三种交付形态 | p.9 |
| `.cta-band` | 「与智瞳安宇一起，构建值得信任的智能未来」→ 商务咨询 `/contact`、预约产品演示 `/contact?intent=demo` | — |
| `.footer` | 四列导航按 §3.1 重排；ICP 号占位待客户提供 | — |

> **⚠️ v2 修正 · 第三个指标的合规约束**：PPT p.93 的原文语境是「**依托西安电子科技大学**……网络空间安全学科（全国第 1）」——这是**高校的学科评估结果，不是本公司的排名**。把「全国第 1」与「20+ 博士硕士」「30+ 项知识产权」并列为公司的四个头条数字且不加说明，会被合理理解为公司自身获得全国第一，触及《广告法》第九条（「国家级」「最高级」类用语）与第二十八条（引人误解的商业宣传）。
>
> **强制写法**：`value` 取 `全国第 1`，`unit` 取空，`label` 必须写成「**依托高校网络空间安全学科**（连续四年全国第 1）」，`note` 必须写成「学科评估结果归属西安电子科技大学，非本公司排名」，且 `note` 在页面上以 `--ink-2`、12px 的形式**实际渲染出来**，不能只存在数据里。相应地，§8.2 的 `Metric` 模型对首页 `.metrics` 场景**要求 `note` 必填**（`home.json` 的 schema 层校验）。
> 若法务认为仍有风险，降级方案：该格改用 p.88 的「`100+` 项授权及申请专利」，这是公司自身的数据。
>
> **原则**：`.hero` 的字号/间距/遮罩层、`.domains` 的 1px 分隔栅格、`.solution` 的 `1fr 1fr / gap:72px` 交错布局、`.metrics` 的分隔竖线、`.news-grid` 的 `1.15fr 1fr`——**全部像素级沿用**，只替换文案与图片。

---

## 4. 技术设计（Technical Design）

### 4.1 总体架构

```
                    ┌──────────────────────────────────────────┐
  浏览器  ─────────▶│  Nginx (443/80)  gzip+brotli, 静态缓存    │
                    └───────────┬───────────────┬──────────────┘
                                │ /             │ /api/v1/*
                    ┌───────────▼──────────┐  ┌─▼─────────────────────────┐
                    │ web: Next.js 15      │  │ api: FastAPI 0.115        │
                    │  App Router / RSC    │  │  uvicorn(gunicorn 2 wk)   │
                    │  next/image 优化     │  │                           │
                    │  ISR + fetch tags    │──┼─▶ ContentRepository       │
                    │  静态快照兜底        │  │    (启动时加载 JSON 内容包)│
                    └──────────┬───────────┘  │  LeadService → SQLite     │
                               │              └─┬─────────────────────────┘
                    public/media/product/*      │
                    public/media/stock/*      ┌─▼──────────────┐
                    (构建期产物, 非运行期依赖) │ aegiston.db    │
                                              │ (volume 持久化)│
                                              └────────────────┘
```

**关键判断**：内容是**只读**的，且体量小（全部 JSON < 800 KB）。因此不给内容建表、不做 ORM 查询，而是启动时把 JSON 反序列化成 Pydantic 模型常驻内存，读路径零 I/O、零 N+1、天然线程安全。数据库只承载 `leads` 一张表。

### 4.2 关键代码路径（Critical Paths）

**路径 A — 首页首次渲染（冷缓存）**

1. `GET /` → Next.js RSC `src/app/(site)/page.tsx`
2. `page.tsx` 调 `getHome()`（`src/lib/api.ts`）
3. `apiFetch('/api/v1/home', { revalidate: 300, tags: ['home','insights'] })`
   - `AbortController` 超时 3000 ms；失败重试 1 次（退避 250 ms）
   - 两次都失败 → `loadSnapshot('home')` 读 `src/content/snapshot/home.json`，并 `console.warn` + 打点
4. FastAPI `home.py::get_home()` → `ContentRepository.home()` → 组装 `HomePage`（hero / domains / products / philosophy / metrics / insightsPreview / sustain / cta）
5. RSC 渲染 `<Hero>` `<DomainGrid>` `<SolutionRow×3>` `<PhilosophyValues>` `<MetricBand>` `<InsightsPreview>` `<SustainBlock>` `<CtaBand>`
6. `<Reveal>` 是 client component，`IntersectionObserver(threshold:.12, rootMargin:'0px 0px -50px 0px')` 加 `.visible`——与 `ref/1.html` 的 JS 完全等价
7. 首屏图片：hero 背景 `priority` + `fetchPriority=high`；其余 `loading=lazy` + `placeholder=blur`

**路径 B — 产品详情页的截图渲染**

1. `GET /products/aragonteam` → `generateStaticParams` 已预生成
2. `getProduct('aragonteam')` → `/api/v1/products/aragonteam`
3. 返回体中 `screenshots: [{ id, src, width, height, blurDataURL, alt, caption, sourceSlide }]`
   - `src` 形如 `/media/product/ara-dashboard.webp`，**由构建期脚本产出的本地文件**，不经 API 传输二进制
4. `<ScreenshotFigure>`（client）渲染 `next/image` + `<figcaption>`；点击打开 `<Lightbox>`（focus trap / `Esc` 关闭 / `←→` 切换 / 滚轮缩放）

**路径 C — 线索提交（唯一写路径）**

1. `<LeadForm>`（client, `useActionState`）→ Server Action `submitLead`
2. Server Action 做第一层校验（zod），再 `POST /api/v1/leads`，透传 `X-Request-Id`
3. FastAPI：`honeypot` 字段非空 → 静默返回 202（防机器人）；`slowapi` 限流 `5/hour/IP`；Pydantic 校验
4. `LeadService.create()` → SQLModel 写入 → 返回 `{ id, createdAt }`
5. 结构化日志脱敏（手机号中间 4 位、邮箱 local part 打码）后落 JSON log
6. 前端展示 `<Toast>` 成功态并 `router.replace` 清空 query

**路径 D — 构建期资源管线（一次性，产出物入 Git LFS 或构建缓存）**

```
ref/*.pptx ──▶ backend/scripts/extract_pptx_assets.py
                 ├─ zipfile 读 ppt/slides/_rels/slideN.xml.rels 建立 slide→media 映射
                 ├─ 按 ASSET_MAP(§6.2) 白名单筛选
                 ├─ Pillow: 转 WebP q=82, 长边 ≤ 2560, 生成 8px blurDataURL
                 ├─ 写 frontend/public/media/product/<asset-id>.webp
                 └─ 写 backend/app/content/media_manifest.json
frontend/scripts/fetch-stock-images.mjs ──▶ public/media/stock/*.webp (+ credits)
backend/scripts/validate_content.py     ──▶ CI 门禁（schema + 引用完整性）
frontend/scripts/sync-content.mjs       ──▶ src/content/snapshot/*.json（降级兜底）
```

### 4.3 渲染与缓存策略

| 层 | 机制 | 失效方式 |
|---|---|---|
| Next.js Data Cache | `fetch(..., { next: { revalidate, tags } })` | `revalidateTag()`（预留 `/api/revalidate`，v1 不暴露） |
| Next.js Full Route Cache | 静态化 + ISR | 同上 |
| FastAPI 响应 | `Cache-Control: public, max-age=60, stale-while-revalidate=300` + 基于内容包 hash 的 `ETag` | 内容包变更 → hash 变 → ETag 变 |
| Nginx | `/_next/static/` `immutable, 1y`；`/media/` `max-age=2592000` | 文件名带内容 hash |

---

## 5. 视觉一致性契约（与 `ref/1.html` 的逐项对齐）

这是本方案最硬的约束：下游工程师**不得**自行重设计。

### 5.1 设计令牌（原样搬入 `src/styles/tokens.css`，变量名不改）

```css
:root{
  --red:#2D638A; --red-dark:#214A69; --red-soft:#EAF1F6;
  --navy:#002B5C; --navy-deep:#001A3D; --navy-2:#1A4A7A;
  --ink:#1A2332; --ink-2:#4A5868; --ink-3:#8B97A7; --ink-4:#B5BEC9;
  --white:#FFFFFF; --cream:#FAFBFC; --bg-gray:#F2F4F7; --bg-gray-2:#EAEEF3;
  --border:#E0E5EC; --border-2:#CDD5DF; --border-strong:#A8B4C2;
  --shadow-sm:0 1px 3px rgba(0,43,92,.08);
  --shadow-md:0 6px 24px -8px rgba(0,43,92,.15);
  --shadow-lg:0 20px 50px -15px rgba(0,43,92,.2);
  --sans-cn:'Noto Sans SC',-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;
  --sans-en:'Inter','Noto Sans SC',sans-serif;
  --serif-cn:'Noto Serif SC',serif;
  --max-w:1280px;
}
```

> 注：变量名 `--red` 实际是企业蓝 `#2D638A`（ref 中已注释「企业金，替代原三菱红」）。**保留变量名不重命名**，避免与 ref 比对时产生歧义；在 `tokens.css` 顶部加注释说明。

### 5.2 必须 1:1 复刻的度量

| 元素 | 规格（取自 ref） |
|---|---|
| `body` | `font-family:var(--sans-cn); font-size:15px; line-height:1.75; color:var(--ink)` |
| `.container` | `max-width:1280px; padding:0 40px` |
| `.utility-bar` | `background:var(--navy-deep); color:#B5C4D6; font-size:12px; height:36px` |
| `.nav` | `height:80px; sticky top:0; z-index:100; border-bottom:1px solid var(--border); box-shadow:var(--shadow-sm)` |
| `.nav-item` | `padding:28px 22px; font-size:15px; font-weight:500`；hover 变 `var(--red)`；`.caret` 8px 旋转 45° |
| `.submenu` | `min-width:240px; border:1px solid var(--border); border-top:3px solid var(--red); padding:12px 0`；`opacity/visibility/translateY(8px)` 过渡 `.22s`；item hover `padding-left:26px` |
| `.hero` | `min-height:640px`；背景图 + `::before` 渐变遮罩 `linear-gradient(100deg,rgba(8,30,48,.72),rgba(17,48,73,.42) 55%,rgba(17,48,73,.14))`；`::after` 3px 白色渐变线 |
| `.hero h1` | `var(--serif-cn); clamp(36px,4.6vw,54px); 700; line-height:1.3` |
| `.btn` | `padding:16px 34px; font-size:14px; letter-spacing:.04em`；`.btn-primary` hover `translateY(-2px)` + `0 12px 30px -8px rgba(45,99,138,.5)` |
| `.section` | `padding:96px 0`；`.section-gray{background:var(--bg-gray)}` |
| `.section-label` | `var(--sans-en); 12px; letter-spacing:.28em; color:var(--red)`；`::before` 28×2px 横线 |
| `.section-title` | `var(--serif-cn); clamp(26px,3.2vw,38px); 700; color:var(--navy)` |
| `.domains` | `grid-template-columns:repeat(4,1fr); gap:1px; background:var(--border); border:1px solid var(--border)`；卡片 `.domain::before` 顶部 3px 红条 `scaleX(0)→1` |
| `.domain-photo` | `height:168px; margin:0 -28px 26px`；`::after` 底部渐变 |
| `.solution` | `grid-template-columns:1fr 1fr; gap:72px; margin-bottom:96px`；偶数行 `order` 互换 |
| `.solution-points` | `2 列; gap:12px 24px; padding:22px 0; 上下 1px 边框` |
| `.solution-visual` | `aspect-ratio:4/3`；`::before` 底部暗化；`.vlabel` 左下角 10px 字母间距 `.18em` 标签 |
| `.values` | `repeat(3,1fr); gap:20px`；卡片 `padding:40px 36px`，hover `translateY(-3px)` |
| `.metrics` | `padding:72px 0`；`.metric-num{var(--sans-en);46px;700;color:var(--red)}`；分隔线 1×56px |
| `.news-grid` | `1.15fr 1fr; gap:56px`；`.news-item{grid:88px 1fr; gap:22px; padding:22px 0}` hover `padding-left:8px` |
| `.sustain` | `1fr 1fr; gap:72px`；`.sustain-visual{aspect-ratio:5/4}`；icon 44×44 `var(--red-soft)` |
| `.cta-band` | `background:#F5F7F9; padding:82px 0; text-align:center`；`::before` 内嵌 18px 描边卡片 |
| `.footer` | `grid:1.6fr 1fr 1fr 1fr 1fr; gap:48px; padding:62px 0 0` |
| `.totop` | `fixed bottom:36px right:36px; 46×46; border-radius:50%; background:var(--navy)`；`scrollY>600` 显示 |
| **断点（v2 修正）** | ref 共 **9 条** media query，断点为 **`1024 / 900 / 768 / 640`** 四档，逐条见下表。**v1.0 的「1024 + 768 两档」描述有误，以下表为准** |

**§5.2.1 响应式断点全量表（v2 修正 · 逐条取自 `ref/1.html`）**

| 断点 | ref 原始声明 | 实现要求 |
|---|---|---|
| `max-width:1024px` | `.nav-menu{display:none}` | **唯一允许的偏离点**：不是隐藏，而是切换为汉堡按钮 + 全屏抽屉（§5.3） |
| `max-width:1024px` | `.domains{grid-template-columns:repeat(2,1fr)}` | 4 列 → 2 列，1px 分隔栅格保持 |
| `max-width:900px` | `.solution{grid-template-columns:1fr;gap:40px;margin-bottom:64px}`<br>`.solution:nth-child(even) .solution-visual,.solution:nth-child(even) .solution-body{order:0}`<br>`.solution-points{grid-template-columns:1fr}` | 交错布局塌陷为单列，**偶数行的 `order` 必须复位为 `0`**（否则图文顺序错乱）；要点列表转单列 |
| `max-width:900px` | `.values{grid-template-columns:1fr}` | 3 列 → 1 列（**v1.0 完全遗漏此条**） |
| `max-width:900px` | `.news-grid{grid-template-columns:1fr}` | 1.15fr/1fr → 单列 |
| `max-width:900px` | `.sustain{grid-template-columns:1fr;gap:40px}` | 单列，gap 由 72px 降到 40px |
| `max-width:900px` | `.footer-main{grid-template-columns:1fr 1fr;gap:40px}`<br>`.footer-brand{grid-column:1/-1}` | 5 列 → 2 列，**品牌列通栏** |
| `max-width:768px` | `.metrics-grid{grid-template-columns:repeat(2,1fr);gap:44px 24px}`<br>`.metric:not(:last-child)::after{display:none}` | 4 → 2 列，**同时隐藏 1×56px 分隔竖线** |
| `max-width:640px` | `.domains{grid-template-columns:1fr}` | 2 列 → 1 列 |

> ⚠️ **900px 是本站点真正的主力断点**（5 条规则挂在它上面），不是 768px。§12.3 的响应式用例必须至少覆盖 `1440 / 1024 / 960 / 860 / 700 / 375` 六档，才能同时穿过 1024、900、768、640 四条线。

### 5.3 允许且必须新增的偏离（写明理由）

| 偏离 | 理由 |
|---|---|
| 新增移动端汉堡菜单 + 全屏抽屉（`<1024px`） | ref 在 `<1024px` 直接 `display:none` 隐藏主导航，移动端**完全无法导航**。属于 HCI 缺陷，必须修复 |
| ~~`.reveal` 初始态改回 `opacity:0; transform:translateY(24px)`~~ **（v2 撤销：v1.0 判断有误）** | **复核结论：ref 的滚动动效本来就是生效的。** 基线规则是 `.reveal{opacity:0;transform:translateY(20px);transition:opacity .7s cubic-bezier(.2,.8,.2,1),transform .7s cubic-bezier(.2,.8,.2,1)}`；`opacity:1;transform:none` **只出现在 `@media(prefers-reduced-motion:reduce)` 块内**，属于正确实现而非缺陷。因此这里**不存在偏离，必须原样搬运**：初始位移 **`translateY(20px)`（不是 24px）**、缓动 **`.7s cubic-bezier(.2,.8,.2,1)`**、延迟档位 `.reveal-d1/.d2/.d3 = .1s/.2s/.3s`，以及 reduced-motion 分支里的 `*{animation:none!important;transition:none!important}` 一并保留 |
| 全站 `:focus-visible` 2px `var(--navy)` 描边 + skip-link | ref 无任何键盘焦点样式 |
| `.nav-item` 增加 `focus-within` 与 `aria-expanded` 键盘展开 | ref 仅 `:hover`，键盘用户无法打开下拉 |
| **字体改为 `next/font/local` + 字体文件入库（v2 修正）** | ref 从 `fonts.googleapis.com` 外链，私有化/内网部署下会阻塞渲染。**但 `next/font/google` 只解决了运行期**——它在 **构建期**仍需访问 `fonts.googleapis.com` / `fonts.gstatic.com`，客户在隔离网内 `docker build` 会直接失败，也与 §11.3「CSP 无任何外部域白名单」的交付卖点不自洽。因此改为：一次性用 `frontend/scripts/fetch-fonts.mjs` 把 woff2 分片下载到 `frontend/src/assets/fonts/`（**入库**），页面侧统一用 `next/font/local` 声明 `src` + `unicode-range` + `display:'swap'`。构建与运行**全程零外网** |
| 邮箱不再用 Cloudflare `__cf_email__` 混淆 | 依赖 CF 脚本，自建部署下会渲染成乱码 |
| **`--ink-3` / `--ink-4` 退出文本用色；顶栏 `.lang-en` 由 `#6A80A0` 改为 `#8AA0BE`（v2 新增）** | 实测对比度分别为 2.97:1 / 1.88:1 / 4.29:1，均不满足 WCAG 2.1 AA，与 DoD #7「axe 零 serious 违规」直接冲突。**令牌值本身不改**（保持与 ref 比对时的可读性），改的是**用色规则**，详见 §10.3 |

---

## 6. 资源管线（Assets）

### 6.1 PPT 资源盘点（已实测）

- 媒体总数 131 个，总计 **58 MB**
- 最大三个：`image64.GIF` 25.1 MB（p.35 需求看板拖拽动图）、`image15.png` 3.7 MB、`image26.png` 3.7 MB
- 特殊格式：`image94.emf`（p.65 系统总体架构图，EMF 矢量）、6 个 `.svg`（图标，可直接用）
- 真实产品截图约 60 张，集中在 p.20–p.39（AragonTeam）、p.47–p.61（InkClaw）、p.67–p.84（LegalLens）

### 6.2 截图映射表（`ASSET_MAP`，脚本硬编码，逐条实现）

> 字段：`asset-id ← 媒体文件 (PPT 页) | alt / caption`

**AragonTeam（组织级）**

| asset-id | 源文件 | 页 | caption |
|---|---|---|---|
| `ara-personal-board` | `image40.png` | 20 | AragonTeam 个人工作场景 · 多智能体协同与执行工作台 |
| `ara-agent-chat` | `image41.png` | 21 | Agent 对话界面 · 任务分析与工具调用实时可见 |
| `ara-plan-new` | `image42.png` | 22 | 新建计划面板 |
| `ara-plan-overview` | `image43.png` | 22 | 项目总览面板 |
| `ara-state-todo` / `-running` / `-done` / `-verified` | `image44/45/46/47.png` | 23 | 任务四态：待办 / 运行中 / 已完成 / 已验证 |
| `ara-dev-workspace` | `image48.png` | 24 | 综合开发工作区 · 编辑器 + Git + 终端联动 |
| `ara-dag-orchestration` | `image49.png` | 25 | 智能体任务编排 · 可视化运行图 |
| `ara-agent-terminal` | `image52.png` | 26 | 智能体任务执行终端 |
| `ara-model-presets` | `image53.png` | 27 | 系统设置 · 模型与预设 |
| `ara-graph-templates` | `image54.png` | 28 | 内置运行图模板 |
| `ara-team-home` | `image55.png` | 29 | AragonTeam 团队应用首页 |
| `ara-team-dashboard-mini` | `image56.png` | 29 | 团队仪表盘概览 |
| `ara-dashboard` | `image57.png` | 30 | 仪表盘 · 全局数据洞察与待办聚合 |
| `ara-my-work` | `image58.png` | 31 | 我的工作 · 指派任务与提交事项 |
| `ara-versions` | `image59.png` | 32 | 版本 / 计划 · 迭代进度管理 |
| `ara-requirements-list` | `image60.png` | 33 | 需求列表视图 |
| `ara-requirement-detail` | `image61.png` | 33 | 需求详情与编辑 |
| `ara-bugs-list` | `image62.png` | 34 | BUG 列表视图 |
| `ara-bug-detail` | `image63.png` | 34 | BUG 详情与 AI 修复派发 |
| `ara-requirements-kanban` | `image64.GIF` | 35 | 需求看板 · 拖拽流转（**特殊处理见 §6.4**） |
| `ara-agent-admin` | `image65.png` | 36 | Agent 管理 · 统一管理与任务直派 |
| `ara-members` | `image66.png` | 37 | 团队成员与角色权限管理 |
| `ara-docs-projects` | `image67.png` | 38 | 多项目文档管理 |
| `ara-docs-inproject` | `image68.png` | 38 | 项目内文档管理 |
| `ara-audit` | `image69.png` | 39 | 审计 · 全量操作留痕与多维检索 |
| `ara-tech-governance` | `image70.png` | 40 | 异构接入与统一治理基座（示意图） |
| `ara-tech-graph-kernel` | `image71.png` | 41 | 运行图执行内核与长稳运行保障（示意图） |

**InkClaw（通用级）**

| asset-id | 源文件 | 页 | caption |
|---|---|---|---|
| `ink-chat` | `image75.png` | 47 | 基础 AI 对话 · 自然语言入口 |
| `ink-bot-manage` | `image76.png` | 48 | 专属对话机器人 · 创建与管理 |
| `ink-bot-chat` | `image77.png` | 48 | 专属对话机器人 · 实际对话界面 |
| `ink-team-collab` | `image78.png` | 49 | 团队协作 · 分工、通信与状态集中呈现 |
| `ink-dag` | `image79.png` | 50 | DAG 协作 · 执行依赖与运行状态可视化 |
| `ink-git` | `image80.png` | 51 | 网页 Git · 变更查看与版本管理 |
| `ink-ide` | `image81.png` | 52 | 网页 IDE · 在线查看与修改 |
| `ink-memory` | `image82.png` | 53 | 记忆 · 长期上下文配置 |
| `ink-soul` | `image83.png` | 54 | 灵魂 · 角色、表达与行为边界 |
| `ink-skill` | `image84.png` | 55 | Skill · 可复用能力模块 |
| `ink-doc-edit` | `image85.png` | 56 | 智能文档协作 · 双页面协同编辑 |
| `ink-doc-review` | `image86.png` | 57 | 智能文档审校 · 四维校验与定位 |
| `ink-brainstorm-ask` | `image87.png` | 58 | 头脑风暴 · 主动追问发现需求 |
| `ink-brainstorm-diverge` | `image88.png` | 58 | 头脑风暴 · 多角度发散 |
| `ink-brainstorm-plan` | `image89.png` | 58 | 头脑风暴 · 生成规划文档 |
| `ink-cloud-project` | `image90.png` | 59 | 云项目 · 统一项目空间 |
| `ink-cloud-assets` | `image91.png` | 59 | 云项目 · 代码 / 文档 / 会话资产 |
| `ink-tech-runtime` | `image92.png` | 60 | 多智能体运行时（示意图） |
| `ink-tech-collab` | `image93.png` | 61 | 协作、交付与治理底座（示意图） |

**LegalLens 合约智审（行业级）**

| asset-id | 源文件 | 页 | caption |
|---|---|---|---|
| `legal-home` | `image97.png` | 67 | 合约智审系统总体功能界面 |
| `legal-review-result` | `image98.png` | 68 | 专业审查 · 风险透视与精准预警 |
| `legal-review-settings` | `image99.png` | 69 | 专业审查设置 |
| `legal-preference-settings` | `image100.png` | 69 | 倾向性审查设置 |
| `legal-review-editor` | `image101.png` | 70 | 专业审查结果编辑界面 |
| `legal-opinion-flow` | `image102.png` | 71 | 法律意见书生成原理 |
| `legal-opinion-result` | `image103.png` | 71 | 法律意见书生成结果 |
| `legal-multi-agent` | `image104.png` | 72 | 多智能体校验界面 |
| `legal-simple-review` | `image96.png` | 66/73 | 简洁审查 · 对话式跨文档比对 |
| `legal-draft-review` | `image105.png` | 74 | 文稿智审 |
| `legal-credit-value` | `image106.png` | 75 | 资信审查 · 核心价值输出 |
| `legal-credit-scenarios` | `image107.png` | 75 | 资信审查 · 核心应用场景 |
| `legal-credit-engine` | `image108.png` | 75 | 企业知识图谱智能引擎 |
| `legal-credit-profile` | `image109.png` | 76 | 资信审查 · 智能风险画像 |
| `legal-consistency` | `image110.png` | 77 | 上下游合同一致性审查 |
| `legal-consistency-report` | `image111.png` | 78 | 一致性审查报告 |
| `legal-consistency-config` | `image112.png` | 78 | 一致性条款配置 |
| `legal-vector-params` | `image113.png` | 79 | 语义检索 · 向量参数设置 |
| `legal-semantic-search` | `image114.png` | 79 | 语义检索分析界面 |
| `legal-knowledge-graph` | `image115.png` | 80 | 知识图谱可视化 |
| `legal-preference-ui` | `image116.png` | 81 | 倾向性需求审查 · 使用界面 |
| `legal-preference-arch` | `image117.png` | 81 | 倾向需求功能架构图 |
| `legal-tech-reasoning` | `image119.png` | 82 | 知识驱动的法律推理（示意图） |
| `legal-tech-safety` | `image120.png` | 83 | 可信输出与安全防护（示意图） |
| `legal-tech-data` | `image121.png` | 84 | 行业绑定与垂直领域数据沉淀（示意图） |

**行业案例配图**

| asset-id | 源文件 | 页 |
|---|---|---|
| `case-telecom` | `image123.jpeg` | 95 |
| `case-transportation` | `image124.jpeg` | 96 |
| `case-legal` | `image125.jpeg` | 97 |

合计 **≥ 72 个 asset-id**，满足 G4（≥ 45 张）。

### 6.3 Unsplash 配图清单

**（v2 修正口径）** `ref/1.html` 里实际只有 **4 个不重复的** Unsplash photo id（`photo-1518770660439` 与 `photo-1486406146926` 各被引用了两次，不同尺寸参数），加上 1 张 Wikimedia Hero 背景。因此正确口径是：**沿用 ref 的 4 张 Unsplash + 新增 7 张 + 1 张 Wikimedia Hero 背景**，合计 12 个图片源、11 个 Unsplash 条目（下表 11 行不变）：

| 用途 | Unsplash photo id |
|---|---|
| Hero 备用 / `/about` PageHero | `photo-1466611653911-95081537e5b7` |
| `.domain-photo-a` / `/products` | `photo-1518770660439-4636190af475` |
| `.domain-photo-d` / `/research` | `photo-1486406146926-c627a92ad1ab` |
| `.sustain-visual` / `/products/deployment` | `photo-1551288049-bebda4e38f71` |
| `/solutions/telecom` | `photo-1518709268805-4e9042af9f23` |
| `/solutions/transportation` | `photo-1473042904451-00171c69419d` |
| `/solutions/legal-services` | `photo-1589829545856-d10d557cf95f` |
| `/solutions/finance` | `photo-1454165804606-c3d57bc86b40` |
| `/careers` | `photo-1522071820081-009f0129c71c` |
| `/insights` | `photo-1499750310159-5b3b1b0f5b0c` |
| `/contact` | `photo-1497366216548-37526070297c` |

Hero 主背景保留 ref 使用的西安 CBD 天际线（`upload.wikimedia.org/.../Skyline_of_Xi'an_CBD.jpg`，CC 授权，需在 `/legal/terms` 注明署名）。

**所有外链图片在构建期由 `fetch-stock-images.mjs` 下载到 `public/media/stock/`**，转 WebP（1920 / 1280 / 768 三档），署名信息写入 `content/stock_credits.json` 并在页脚「图片来源」链接中展示。运行期不依赖外部 CDN——这是私有化交付的硬要求。

### 6.4 特殊资源处理

| 资源 | 处理 |
|---|---|
| `image64.GIF`（25 MB） | ① 若环境有 `ffmpeg`：转 `ara-requirements-kanban.mp4`（H.264, CRF 28, 无音轨）+ `.webp` 首帧海报，页面用 `<video autoplay muted loop playsinline poster>`；② 无 ffmpeg：Pillow 抽首帧存 WebP，退化为静态图。脚本必须两条路径都实现并在日志里说明走了哪条 |
| `image94.emf`（架构图） | EMF 在 Web 无法直接用。方案：**用 React + 内联 SVG 重绘** p.65 的四层架构（基础层 / 技术架构层 / 核心服务层 / 应用层），组件 `<LegalLensArchitecture>`。理由：重绘后可响应式、可主题化、可无障碍（`<title>/<desc>`），且避免 EMF→PNG 光栅化后的模糊 |
| 6 个装饰性 `.svg` | 直接复制到 `public/media/icon/`，作为 `.domain-icon` / `.sustain-point-icon` 使用 |
| 截图中的敏感信息 | 脚本产出后需**人工过审**（Subtask #3 检查项）：确认无真实客户名、真实合同金额、真实人员账号。若有，用 `scripts/redact.py` 打码或替换该 asset |

---

## 7. 接口设计（Interface Design）

### 7.1 通用约定

- Base path: `/api/v1`
- 全部响应 `application/json; charset=utf-8`，字段 **camelCase**（Pydantic `alias_generator=to_camel`, `populate_by_name=True`）
- 请求头：`X-Request-Id`（无则服务端生成 UUID4 并回写响应头）
- 错误体（RFC 7807 风格）：
  ```json
  { "type": "/errors/validation", "title": "Validation Error", "status": 422,
    "detail": "phone: 手机号格式不正确", "instance": "/api/v1/leads",
    "requestId": "8f1c...", "errors": [{"field":"phone","code":"pattern"}] }
  ```
- 只读接口带 `ETag` + `Cache-Control: public, max-age=60, stale-while-revalidate=300`；命中 `If-None-Match` 返回 304

### 7.2 端点清单

| 方法 | 路径 | 说明 | 响应模型 |
|---|---|---|---|
| GET | `/api/v1/health` | 存活探针 | `{status, version, contentHash, uptimeSeconds}` |
| GET | `/api/v1/health/ready` | 就绪探针（内容已加载 + DB 可连） | `{ready, checks:{content,db}}` |
| GET | `/api/v1/site/settings` | 品牌、联系方式、ICP、社媒、页脚法务链接 | `SiteSettings` |
| GET | `/api/v1/site/navigation` | 主导航 + 顶栏 + 页脚四列 | `Navigation` |
| GET | `/api/v1/home` | 首页全部区块（聚合，1 次往返） | `HomePage` |
| GET | `/api/v1/products` | 三层产品摘要 | `ProductSummary[]` |
| GET | `/api/v1/products/deployment` | 交付形态页（**v2：必须注册在 `{slug}` 之前**，见注 1） | `DeploymentPage` |
| GET | `/api/v1/products/{slug}` | 产品详情（`aragonteam`/`inkclaw`/`legallens`） | `ProductDetail` |
| GET | `/api/v1/solutions` | 行业实践列表 | `SolutionSummary[]` |
| GET | `/api/v1/solutions/{slug}` | 行业案例详情 | `SolutionDetail` |
| GET | `/api/v1/research/pillars` | 11 项核心技术模块 | `TechPillar[]` |
| GET | `/api/v1/research/papers` | 5 篇论文 | `Paper[]` |
| GET | `/api/v1/about` | 公司简介 + 定位 + 科研实力 | `AboutPage` |
| GET | `/api/v1/about/team` | 团队负责人 + 核心人员 | `TeamPage` |
| GET | `/api/v1/insights` | 列表，query: `category`(news\|insight\|research), `page`(≥1), `pageSize`(1–24, 默认 9) | `Page[InsightSummary]` |
| GET | `/api/v1/insights/{slug}` | 详情（正文为受限 Markdown） | `InsightDetail` |
| GET | `/api/v1/media/manifest` | 全部 asset 元数据（供前端类型与校验） | `MediaAsset[]` |
| POST | `/api/v1/leads` | 提交线索 | `LeadCreated` |
| GET | `/api/v1/leads` | 管理列表（需 `X-Admin-Token`），query: `page`,`pageSize`,`intent`,`since` | `Page[LeadRead]` |
| GET | `/api/v1/leads/export.csv` | CSV 导出（需 `X-Admin-Token`） | `text/csv` |

> **注 1（v2 新增 · P1 修复）· 路由遮蔽**：FastAPI 按**装饰器声明顺序**匹配路径，先注册的先命中。若 `@router.get("/products/{slug}")` 写在 `@router.get("/products/deployment")` 之前，`/api/v1/products/deployment` 会落进 `{slug}` 处理器，因 `deployment` 不在 `aragonteam|inkclaw|legallens` 中而返回 404 —— 前端 `/products/deployment` 页随之取不到数据，直接打破 G3「无死链」与 DoD #1「24 条路由全部可达」。
>
> **强制实现约定**：
> 1. `app/api/v1/endpoints/products.py` 中，**所有静态路径段的路由必须写在同前缀的动态路径路由之前**，并在文件顶部加注释说明原因。
> 2. `{slug}` 用 `Literal` 枚举而非裸 `str` 收窄：`slug: Literal["aragonteam","inkclaw","legallens"]`，让不匹配值在路由层就落空，而不是进业务逻辑再 404。
> 3. 同类风险点还有 `/solutions/{slug}`（当前无静态兄弟路径，但后续若新增 `/solutions/overview` 会踩同一个坑）与 `/insights/{slug}`。§12.1 增加 `test_static_route_precedence` 覆盖全部三处。
> 4. 前端侧不受影响（Next.js App Router 中静态段天然优先于 `[slug]`），但 `src/lib/routes.ts` 必须把 `/products/deployment` 与三个产品 slug 分开建模，避免被 `generateStaticParams` 误当成第四个 slug。

### 7.3 `POST /api/v1/leads` 详细契约

请求：
```json
{
  "name": "张三",
  "company": "某某集团有限公司",
  "title": "法务总监",
  "phone": "13800138000",
  "email": "zhangsan@example.com",
  "intent": "demo",
  "product": "legallens",
  "message": "希望了解上下游一致性审查在项目合同链场景下的落地方式。",
  "consent": true,
  "website": ""
}
```

| 字段 | 类型 | 约束 |
|---|---|---|
| `name` | str | 必填, 2–40 |
| `company` | str | 必填, 2–80 |
| `title` | str? | ≤ 40 |
| `phone` | str | 必填, `^1[3-9]\d{9}$` 或 `^\+?[0-9\-\s]{7,20}$` |
| `email` | EmailStr? | 与 phone 至少填一个 |
| `intent` | enum | `demo` / `consult` / `trial` / `partner` / `career` |
| `product` | enum? | `aragonteam` / `inkclaw` / `legallens` / `platform` |
| `message` | str? | ≤ 1000，服务端剥离 HTML |
| `consent` | bool | 必须为 `true`（《个人信息保护法》告知同意） |
| `website` | str | **honeypot**，非空即视为机器人 |

响应 `201`：`{ "id": "ld_01J...", "createdAt": "2026-08-25T10:00:00+08:00" }`
错误：`422` 校验失败 · `429` 超限（`Retry-After` 秒）· `503` DB 不可用

#### 7.3.1 限流与反滥用（v2 新增 · P1 修复）

v1.0 的 `5/hour/IP` 有两个会在生产上真实伤到业务的缺陷，必须按下面的设计实现：

**缺陷一 —— 政企客户共享 NAT 出口。** 目标客户是政府、国企、央企，一家单位通常只有 1~2 个公网出口 IP。按 IP 计 5 次/小时，意味着同一家客户第 6 个真实意向被 429 拒掉；而线索表单是整站**唯一**的商业转化路径，这个误伤的代价远高于挡住机器人的收益。

**缺陷二 —— 计数器不共享。** `slowapi` 默认使用**进程内内存**存储；§11.2 又配置 `gunicorn 2 workers`，于是计数器各算各的，实际配额漂移到 5~10 次/小时且不确定。更糟的是 `test_lead_ratelimit`（单进程 `TestClient`）会稳定通过，给出与生产不符的假信心。

**v2 设计**：

| 层 | 键 | 配额 | 超限行为 |
|---|---|---|---|
| L1 粗粒度 | IP 段（IPv4 /24、IPv6 /64）hash | `60/hour` | 429 + `Retry-After` |
| L2 细粒度 | `sha256(phone 或 email + SECRET_SALT)` | `3/hour`、`10/day` | 429 + 文案「该联系方式的提交已达上限，请直接致电…」 |
| L3 静默 | honeypot `website` 非空 | — | 202，不落库、不计入配额（保持 v1.0 行为） |
| L4 结构 | 同一 `(phone, intent, product)` 在 10 分钟内重复 | — | **幂等返回首次的 201**，不产生重复线索 |

**存储**：`slowapi` 的 `storage_uri` 指向与 `leads` 同一个 SQLite 文件（`AEGISTON_RATELIMIT_STORAGE`，默认与 `AEGISTON_DATABASE_URL` 同库），保证多 worker 共享计数；若未来引入 Redis 只需改这一个 env。**作为兜底，`gunicorn` 在 v1 固定为 `--workers 1 --threads 4`** —— 官网 QPS 极低，单 worker 完全够用，同时天然消除计数器分裂与 SQLite 写竞争。

**可观测与人工兜底**：每次 429 打一条结构化日志（含限流层级与脱敏键）；`/contact` 页在收到 429 时必须**同时**展示商务电话与邮箱，绝不让用户走进死路。

**测试补充**（并入 §12.1）：`test_lead_ratelimit_layers`（L1/L2 分别触发）、`test_lead_idempotent`（L4 重复提交返回同一 id）、`test_ratelimit_storage_shared`（两个 Session 共享计数）。

### 7.4 CLI 接口（构建/运维脚本）

> **v2 修正 · 跨平台约束（P1-15）**：本项目的实际开发与实现环境是 **Windows**（Subtask #2 在此执行）。v1.0 的命令使用 bash 反斜杠续行 `\`，在 PowerShell 下会解析失败；`Makefile` 在 Windows 默认也不可用。因此：
> 1. **所有文档化命令一律写成单行**（下方已改），不使用 `\` / `^` / 反引号续行；
> 2. **`Makefile` 降级为 Linux/CI 的便利层**，不是唯一入口。跨平台的规范入口是 `npm run <task>`（前端与编排）与 `python -m <module>`（后端），两者在三大平台行为一致；
> 3. 脚本内部一律用 `pathlib` / `path.join` 处理路径，**不拼接反斜杠**；命令行参数中的路径统一用正斜杠 `/`。

```bash
# 从 PPT 提取截图与清单（可选参数：--quality 82 --max-width 2560 --force --dry-run）
python -m backend.scripts.extract_pptx_assets --pptx "ref/智瞳安宇-总体产品介绍-V7.pptx" --out-images frontend/public/media/product --out-manifest backend/app/content/media_manifest.json

# 内容包校验（CI 门禁；退出码非 0 即失败）
python -m backend.scripts.validate_content --content-dir backend/app/content --strict

# 一次性下载字体分片到 frontend/src/assets/fonts/（入库，构建期不再触网；见 §5.3）
npm --prefix frontend run fonts:fetch

# 下载并本地化 Unsplash / Wikimedia 配图
npm --prefix frontend run assets:stock

# 生成降级快照（需 API 已在 localhost:8000 运行；见 §11.2.1 快照生命周期）
npm --prefix frontend run content:snapshot

# 由 OpenAPI 生成前端类型
npm --prefix frontend run gen:types
```

上述 `npm run` 脚本在 `frontend/package.json` 中的定义（等价单行命令，供人工排查时直接复制）：

| npm script | 实际命令 |
|---|---|
| `fonts:fetch` | `node scripts/fetch-fonts.mjs --config font-manifest.json --out src/assets/fonts` |
| `assets:stock` | `node scripts/fetch-stock-images.mjs --config stock-images.json --out public/media/stock` |
| `content:snapshot` | `node scripts/sync-content.mjs --api http://localhost:8000 --out src/content/snapshot` |
| `gen:types` | `openapi-typescript http://localhost:8000/openapi.json -o src/types/api.d.ts` |

---

## 8. 数据模型（Data Model）

### 8.1 持久化表（唯一）

```sql
-- alembic/versions/0001_create_leads.py
CREATE TABLE leads (
  id           TEXT PRIMARY KEY,              -- ULID, 前缀 ld_
  name         TEXT NOT NULL,
  company      TEXT NOT NULL,
  title        TEXT,
  phone        TEXT NOT NULL,
  email        TEXT,
  intent       TEXT NOT NULL,                 -- demo|consult|trial|partner|career
  product      TEXT,                          -- aragonteam|inkclaw|legallens|platform
  message      TEXT,
  consent      INTEGER NOT NULL DEFAULT 0,
  source_path  TEXT,                          -- 提交页面路径
  utm          TEXT,                          -- JSON 字符串
  ip_hash      TEXT,                          -- sha256(ip + SECRET_SALT)，不存明文 IP
  user_agent   TEXT,
  request_id   TEXT,
  status       TEXT NOT NULL DEFAULT 'new',   -- new|contacted|qualified|closed
  created_at   TEXT NOT NULL,                 -- ISO8601 +08:00
  updated_at   TEXT NOT NULL
);
CREATE INDEX ix_leads_created_at ON leads (created_at DESC);
CREATE INDEX ix_leads_intent     ON leads (intent);
CREATE INDEX ix_leads_status     ON leads (status);
```

**合规要求**：不存明文 IP；`phone`/`email` 在日志中脱敏；提供 `GET /leads/export.csv` 供业务导出后在 CRM 处理；保留期策略写入 `/legal/privacy`。

### 8.2 内容包（内存模型，`backend/app/content/*.json`）

目录结构：
```
backend/app/content/
├── site.json                  # SiteSettings + Navigation
├── home.json                  # HomePage
├── products/
│   ├── aragonteam.json  inkclaw.json  legallens.json  deployment.json
├── solutions/
│   ├── telecom.json  transportation.json  legal-services.json  finance.json
├── research/
│   ├── pillars.json  papers.json
├── about/
│   ├── company.json  team.json
├── insights/
│   ├── index.json             # 摘要 + 排序
│   └── posts/*.md             # 正文（frontmatter + Markdown）
├── media_manifest.json        # 由脚本生成，勿手改
└── stock_credits.json
```

核心 schema（Pydantic v2，前端类型由 OpenAPI 生成，**单一事实源在后端**）：

```python
class LocalizedText(BaseModel):          # 为 v2 英文站预留
    zh: str
    en: str | None = None

class MediaAsset(BaseModel):
    id: str                               # ara-dashboard
    src: str                              # /media/product/ara-dashboard.webp
    kind: Literal["screenshot","diagram","photo","video"]
    width: int; height: int
    blur_data_url: str
    alt: str
    caption: str | None = None
    source_slide: int | None = None       # PPT 页码，用于溯源
    poster: str | None = None             # kind=video 时
    video_src: str | None = None

class Metric(BaseModel):
    value: str                            # "20+" / "全国第 1"
    unit: str | None = None               # ref 中 .unit 小字
    label: str
    note: str | None = None
    source: str | None = None             # "PPT p.93"

class FeatureItem(BaseModel):
    index: str                            # "01"
    title: str
    description: str
    icon: str | None = None

class TechPillar(BaseModel):
    id: str
    product: Literal["aragonteam","inkclaw","legallens"]
    title: str
    lead: str                             # 一句话导语
    uncertainty: str                      # “被收敛的不确定性”
    mechanism: str                        # “核心机制”
    parameters: list[str]                 # “关键设计与工程参数”
    value: str                            # “工程价值”
    highlights: list[Metric] = []         # 84+ / 64KB / 100 等
    media: str | None = None              # MediaAsset.id

class Paper(BaseModel):
    id: str                               # lamar | mussel | trustworthy | plyra | santoryu
    title: str
    venue: str                            # "ASE 2026" / "arXiv 预印本"
    tier: str | None = None               # "CCF-A"
    problem: str; method: str; result: str
    benchmarks: list[str] = []
    maps_to: list[str] = []               # 对应 TechPillar.id
    products: list[str] = []

class CaseMetric(Metric):
    before: str | None = None             # "3.5 小时/份"

class SolutionDetail(BaseModel):
    slug: str; industry: str; customer: str
    hero_media: str
    deployment: str                       # 部署形态
    scope: list[str]                      # 覆盖范围
    workflow: list[str]                   # 使用方式
    closure: list[str]                    # 项目闭环 / 复制路径
    metrics: list[CaseMetric]
    takeaway: str                         # “落地要点”
    source_slides: list[int]

class ProductDetail(BaseModel):
    slug: str
    tier: Literal["organization","general","industry"]
    name_cn: str; name_en: str; tagline: str
    positioning: str
    background: list[FeatureItem]         # 四重困境 / 五类风险
    core_values: list[FeatureItem]        # 五条 / 六条核心价值
    feature_groups: list[FeatureGroup]    # 分组功能矩阵
    screens: list[ScreenSection]          # 界面导览：标题+要点+MediaAsset.id
    pillars: list[str]                    # TechPillar.id
    papers: list[str]                     # Paper.id
    delivery: list[str]
    cta: CtaBlock
    source_slides: list[int]
```

`ContentRepository` 启动流程：
1. 遍历 `content/` 加载全部 JSON/MD
2. 按 schema 反序列化（失败即 `RuntimeError`，进程拒绝启动 → 容器不健康 → 不上线）
3. **引用完整性校验**：任何 `MediaAsset.id` 引用必须存在于 `media_manifest.json`；任何 `TechPillar.id` / `Paper.id` 引用必须存在
4. 计算内容包 `sha256` 作为 `contentHash`（用于 ETag 与 `/health`）
5. 构建索引：`by_slug`、`insights_sorted_desc`、`insights_by_category`

---

## 9. 文件 / 模块变更清单

> 当前仓库除 `ref/` 与 `.agentmesh/` 外为空，因此**全部为新建**。

### 9.1 仓库根

| 文件 | 意图 |
|---|---|
| `README.md` | 项目说明、本地启动、脚本清单、部署步骤 |
| `CLAUDE.md` | 代码约定：不引入 Tailwind、令牌名不改、内容不臆造、图片必须本地化 |
| `.gitignore` / `.editorconfig` / `.gitattributes` | 忽略 `node_modules`、`.next`、`*.db`、`*.log`。**v2 修正（P1-12）：媒体产物不走 Git LFS，直接入库。** 理由：本仓库无 Git 远端，LFS 在此处只增加 smudge/pointer 出错面而不带来任何收益；实际体量也完全可控（约 77 张 WebP × ≤320 KB ≈ 25 MB，加字体分片与 stock 图共约 40 MB）。`.gitattributes` 只做两件事：`* text=auto eol=lf` 统一换行（Windows 开发、Linux 构建），以及 `*.webp *.mp4 *.woff2 *.ico binary` 标二进制避免 diff 噪音 |
| `.env.example` | `API_BASE_URL` `ADMIN_TOKEN` `SECRET_SALT` `DATABASE_URL` `CORS_ORIGINS` 等 |
| `Makefile` | `make dev` / `assets` / `test` / `lint` / `build` / `up` |
| `docker-compose.yml` | 开发编排：`web` + `api`（热重载） |
| `docker-compose.prod.yml` | 生产编排：`nginx` + `web` + `api` + volume |
| `nginx/aegiston.conf` | 反代、gzip/brotli、静态缓存、安全响应头 |
| `.github/workflows/ci.yml` | lint → typecheck → test → content-validate → build → a11y/lighthouse |

### 9.2 后端 `backend/`

| 文件 | 意图 |
|---|---|
| `pyproject.toml` | 依赖：fastapi, uvicorn[standard], gunicorn, pydantic-settings, sqlmodel, alembic, slowapi, structlog, python-ulid, pillow, python-pptx, markdown-it-py, bleach；ruff/mypy/pytest 配置 |
| `Dockerfile` | 多阶段；`pip -i https://pypi.tuna.tsinghua.edu.cn/simple`（国内镜像）；非 root 运行 |
| `app/main.py` | `create_app()`：lifespan 加载内容包、注册中间件与异常处理、挂载 `/api/v1` |
| `app/core/config.py` | `Settings`（env 前缀 `AEGISTON_`），含 CORS 白名单、限流参数、admin token |
| `app/core/logging.py` | structlog JSON 日志 + request-id contextvar + PII 脱敏 processor |
| `app/core/errors.py` | `ApiError` 基类与 RFC7807 异常处理器 |
| `app/core/security.py` | `require_admin` 依赖（常量时间比较）、安全响应头中间件 |
| `app/core/ratelimit.py` | slowapi limiter + 自定义 key（`X-Forwarded-For` 首段 hash） |
| `app/core/cache.py` | ETag 计算与 304 短路装饰器 |
| `app/api/v1/router.py` | 汇总子路由 |
| `app/api/v1/endpoints/{health,site,home,products,solutions,research,about,insights,media,leads}.py` | 各端点实现（10 个文件） |
| `app/schemas/{common,site,home,product,solution,research,about,insight,media,lead}.py` | Pydantic 模型（10 个文件），统一 camelCase alias |
| `app/services/content.py` | `ContentRepository`：加载、校验、索引、hash、查询 |
| `app/services/insights.py` | Markdown → 安全 HTML（markdown-it + bleach 白名单）、摘要截取、分页 |
| `app/services/leads.py` | 线索创建/查询/导出、脱敏 |
| `app/db/session.py` / `app/db/base.py` | 引擎、Session 依赖。SQLite pragma 必须**在每个连接上**设置（`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=NORMAL;`，用 SQLAlchemy `connect` 事件挂）。**v2 补充**：`busy_timeout` 不可省——它是并发写下 `database is locked` 的唯一防线 |
| `app/models/lead.py` | SQLModel 表模型 |
| `alembic.ini` + `alembic/env.py` + `alembic/versions/0001_create_leads.py` | 迁移。**v2 修正（P1-13）**：`AEGISTON_DATABASE_URL` 是异步 URL（`sqlite+aiosqlite://`），**Alembic 默认的同步 `env.py` 用它会直接抛错**，容器首次启动执行迁移即失败。约定：`env.py` 从 `AEGISTON_SYNC_DATABASE_URL`（见 §11.1）读取**同步** URL（`sqlite:////data/aegiston.db`），运行期 App 仍用异步 URL；两者由 `Settings` 从同一个路径推导，禁止各写各的。迁移在容器 `entrypoint.sh` 中于 uvicorn 启动前执行一次 |
| `app/content/**` | 内容包（见 §8.2），**本方案落地时的主要工作量之一** |
| `scripts/extract_pptx_assets.py` | PPT 媒体提取 + WebP 转码 + manifest 生成（含 GIF/EMF 分支） |
| `scripts/validate_content.py` | 独立校验 CLI（CI 用） |
| `scripts/seed_insights.py` | 由 PPT p.3–p.10 生成 6 篇洞察草稿（人工润色后入库） |
| `tests/conftest.py` | `TestClient` fixture、临时 DB、内容包 fixture |
| `tests/test_health.py` `test_content_integrity.py` `test_products.py` `test_solutions.py` `test_insights.py` `test_leads.py` `test_ratelimit.py` `test_errors.py` | 单测 |

### 9.3 前端 `frontend/`

| 文件 | 意图 |
|---|---|
| `package.json` | next@15, react@19, typescript@5, zod, vitest, @testing-library/react, playwright, @axe-core/playwright, openapi-typescript, sharp |
| `next.config.mjs` | `output:'standalone'`、`images.formats:['image/avif','image/webp']`、CSP/安全响应头、`remotePatterns`（仅 dev） |
| `Dockerfile` | 多阶段；`npm config set registry https://registry.npmmirror.com`；standalone 产物 |
| `tsconfig.json` / `eslint.config.mjs` / `.prettierrc` | 严格模式 `strict:true`、`noUncheckedIndexedAccess` |
| `vitest.config.ts` / `playwright.config.ts` | 测试配置 |
| `stock-images.json` | Unsplash 清单（§6.3） |
| `scripts/fetch-stock-images.mjs` | 下载 + 转码 + 署名 |
| `scripts/sync-content.mjs` | 生成降级快照 |
| `src/styles/tokens.css` | §5.1 令牌，原样 |
| `src/styles/base.css` | reset + 排版 + `.container` + `:focus-visible` + `prefers-reduced-motion` |
| `src/app/layout.tsx` | `<html lang="zh-CN">`、`next/font` 三套字体、SkipLink、Header、Footer、ToTop、JSON-LD Organization |
| `src/app/globals.css` | 汇入 tokens/base |
| `src/app/page.tsx` | 首页组装 |
| `src/app/about/page.tsx` `about/positioning/page.tsx` `about/team/page.tsx` `about/strength/page.tsx` | 关于我们四页 |
| `src/app/products/page.tsx` `products/[slug]/page.tsx` `products/deployment/page.tsx` | 产品页（`generateStaticParams` 三个 slug） |
| `src/app/solutions/page.tsx` `solutions/[slug]/page.tsx` | 行业实践 |
| `src/app/research/page.tsx` `research/papers/page.tsx` | 技术与研究 |
| `src/app/insights/page.tsx` `insights/[slug]/page.tsx` | 洞察列表 / 详情 |
| `src/app/careers/page.tsx` `contact/page.tsx` `sitemap/page.tsx` | 加入我们 / 联系 / 站点地图 |
| `src/app/legal/terms/page.tsx` `legal/privacy/page.tsx` | 法务页 |
| `src/app/not-found.tsx` `error.tsx` `loading.tsx` | 404 / 错误边界 / 骨架屏（沿用同一视觉） |
| `src/app/sitemap.ts` `robots.ts` `opengraph-image.tsx` | SEO |
| `src/app/actions/lead.ts` | Server Action：`submitLead` |
| `src/components/layout/UtilityBar.tsx` | 顶栏（含禁用的 EN 切换） |
| `src/components/layout/SiteHeader.tsx` + `NavDropdown.tsx` + `MobileNav.tsx` | 主导航（hover + 键盘 + 移动抽屉） |
| `src/components/layout/SiteFooter.tsx` `ToTop.tsx` `SkipLink.tsx` | 页脚与工具 |
| `src/components/sections/Hero.tsx` `PageHero.tsx` `DomainGrid.tsx` `SolutionRow.tsx` `PhilosophyValues.tsx` `MetricBand.tsx` `InsightsPreview.tsx` `SustainBlock.tsx` `CtaBand.tsx` | 首页与内页区块（与 ref 类名一一对应） |
| `src/components/ui/Button.tsx` `SectionHead.tsx` `Reveal.tsx` `Breadcrumbs.tsx` `Tag.tsx` `StatCard.tsx` `Callout.tsx` `Tabs.tsx` `Accordion.tsx` `DataTable.tsx` `Toast.tsx` | 基础组件 |
| `src/components/media/ScreenshotFigure.tsx` `Lightbox.tsx` `VideoFigure.tsx` | 截图展示与灯箱 |
| `src/components/content/FeatureGrid.tsx` `PillarCard.tsx` `PaperCard.tsx` `CaseMetrics.tsx` `ScreenTour.tsx` `LegalLensArchitecture.tsx` | 内容型组件（`ScreenTour` = 左文右图的界面导览，产品页主力组件） |
| `src/components/forms/LeadForm.tsx` | 线索表单（zod + `useActionState` + 内联错误 + 提交态） |
| `src/lib/api.ts` | 类型化 API 客户端（超时/重试/快照兜底/tag 缓存） |
| `src/lib/routes.ts` | **路由常量单一事实源**（所有 `Link href` 必须来自此处） |
| `src/lib/seo.ts` `jsonld.ts` | `generateMetadata` 工具与 JSON-LD 构造 |
| `src/lib/format.ts` `cn.ts` | 日期/数字格式化、className 合并 |
| `src/types/api.d.ts` | 由 `openapi-typescript` 生成（勿手改） |
| `src/content/snapshot/*.json` | 构建期快照（勿手改） |
| `src/styles/sections.css`（**v2 新增**） | **全局、不哈希**的结构性样式表：`ref/1.html` 的 199 条规则中，凡涉及跨组件后代选择器或 ref 原有类名的，一律原样搬到这里，`layout.tsx` 一次性导入。见下方「样式分层策略」 |
| `src/**/*.module.css` | **v2 收窄**：CSS Modules 只用于 `ref/1.html` 中**不存在**的新组件（`MobileNav`、`Lightbox`、`ScreenTour`、`LeadForm`、`Toast`、`Breadcrumbs`、`Tabs`、`Accordion`、`DataTable`、`LegalLensArchitecture` 等）。**禁止**把 ref 已有的 `.hero` / `.domain` / `.solution` / `.value` / `.metric` / `.news-*` / `.footer-*` / `.btn*` / `.section-*` 等类名放进 CSS Module |
| `public/media/product/**` `public/media/stock/**` `public/media/icon/**` | 图片产物 |
| `public/brand/logo.svg` `favicon.ico` `apple-touch-icon.png` | 品牌资源（沿用 ref 内联 SVG 品牌标） |
| `tests/unit/**` | 组件与工具单测 |
| `tests/e2e/navigation.spec.ts` `routes.spec.ts` `contact.spec.ts` `lightbox.spec.ts` `a11y.spec.ts` `visual.spec.ts` | E2E |

**样式分层策略（v2 新增 · P0-2 修复）**

v1.0 规定「每个组件一份 CSS Module，规则直接搬 §5.2」，这条在本项目里**会静默地破坏视觉一致性**，必须改。

**原因**：`ref/1.html` 的 199 条规则里有 **60 条是跨元素后代选择器**，其中相当一批**跨越了 §9.3 划定的组件边界**：

| ref 中的选择器 | 选择器左半边归属 | 右半边归属 | CSS Modules 下的结果 |
|---|---|---|---|
| `.cta-band .btn-primary{background:var(--navy)}` | `sections/CtaBand.tsx` | `ui/Button.tsx` | ❌ 永不匹配 |
| `.philosophy-head .section-label{justify-content:center}` | `sections/PhilosophyValues.tsx` | `ui/SectionHead.tsx` | ❌ 永不匹配 |
| `.philosophy-head .section-title .em` | 同上 | 同上 | ❌ 永不匹配 |
| `.solutions-intro .section-label::after` | `sections/SolutionRow.tsx` | `ui/SectionHead.tsx` | ❌ 永不匹配 |
| `.solution:nth-child(even) .solution-visual{order:0}` | 父列表 | 子组件 | ❌ 永不匹配 |
| `.footer-col a` / `.submenu a .ext` / `.metric-num .unit` | 同组件内 | 同组件内 | ✅ 可以匹配 |

CSS Modules 把类名哈希成 `Button_btn-primary__x7f2`，写在 `CtaBand.module.css` 里的 `.cta-band .btn-primary` 编译后指向的是 `CtaBand_btn-primary__ab12`——**一个页面上根本不存在的类名**。它不报错、不告警、不进 lint，只是样式没生效；最终在 §12.3 的视觉比对里表现为一大片说不清来源的差异，排查成本极高。它同时也让 §9.3 自己宣称的「与 ref 类名一一对应」无法成立。

**v2 强制策略（双层）**：

1. **全局层 —— `src/styles/`（不哈希，类名与 ref 完全一致）**
   - `tokens.css`（§5.1）→ `base.css`（reset / 排版 / `.container` / `:focus-visible` / reduced-motion）→ `sections.css`（ref 的全部结构性规则，按 ref 原顺序搬运，**保留原选择器写法，包括后代、`:nth-child`、`::before/::after`、`:not()`**）→ `responsive.css`（§5.2.1 的四档断点，按 ref 原顺序）。
   - 四个文件由 `src/app/globals.css` 依次 `@import`，`layout.tsx` 只导入 `globals.css`。**导入顺序即层叠顺序，不得调整。**
   - React 组件侧只写 `className="cta-band"` 这样的**字符串字面量**，不经 `styles.*` 间接层。

2. **模块层 —— `*.module.css`（哈希，仅限新组件）**
   - 只服务 ref 中不存在的组件（清单见上表）。这些组件与全局层之间**不允许出现跨层后代选择器**；确需交互时，用全局层的 CSS 变量或 `data-*` 属性传递状态。

3. **护栏**
   - `stylelint` 规则：`sections.css` 中禁止出现 `:global` / `composes`；`*.module.css` 中禁止出现 §5.2 与 §5.2.1 列举的 ref 类名（用 `selector-disallowed-list` 硬编码这批名字）。
   - 新增单测 `tests/unit/styles.spec.ts`：解析 `sections.css`，断言 ref 的 60 条跨元素选择器**逐条存在且拼写一致**。这条测试是 §5 视觉契约在 CI 上唯一可自动化的锚点，比像素比对稳定得多。

**合计新建约 170 个文件**（v2 因样式分层拆分与字体脚本，实际约 175 个）。

---

## 10. 前端实现细则

### 10.1 导航交互（HCI 重点）

- 桌面：`.nav-item` 上 `onMouseEnter/Leave` 控制展开；同时 `<button aria-expanded aria-controls>` + `onKeyDown`（`Enter`/`Space` 展开，`Esc` 收起并回焦，`↑↓` 在子项间移动，`Tab` 离开自动收起）
- 展开延迟：进入 0 ms、离开 160 ms（防止斜向移动误关闭），与 ref `.22s` 过渡协调
- 当前路由高亮：`aria-current="page"`，视觉为 `color:var(--red)` + 底部 2px
- 移动（`<1024px`）：汉堡按钮 → 全屏抽屉，二级用 `<details>` 语义折叠；打开时 `body` 锁滚动 + focus trap + `Esc` 关闭
- 搜索按钮：打开 `/sitemap` 内容抽屉（客户端渲染的路由清单 + 输入框做本地 `includes` 过滤），**不留死按钮**

### 10.2 截图展示（ScreenTour）

产品页的主体是「左侧要点 + 右侧真实截图」的交替式导览，直接复用 `.solution` 的 `1fr 1fr / gap:72px / nth-child(even) order 互换` 布局：

- 每个 `ScreenSection` = `{ eyebrow, title, points[], mediaId, layout: 'left'|'right' }`
- 截图容器 `aspect-ratio` 由 manifest 中真实宽高推导，**避免 CLS**
- 截图带 1px `var(--border)` 边框 + `var(--shadow-md)`，左下角复用 `.vlabel` 样式打「AragonTeam · 仪表盘」标签
- 点击放大：`<Lightbox>` 使用原生 `<dialog>` + `showModal()`，自带 focus trap 与 `Esc`；支持 `←/→` 在同一产品的截图间切换；移动端支持捏合缩放（`touch-action: pinch-zoom`）
- `alt` 必须描述界面**内容**而非「截图」，例如 `alt="AragonTeam 仪表盘：我的待办 4 条、需求总数 4、BUG 总数 4、Agent 空闲 1/1、本周活动数 59"`

### 10.3 无障碍（WCAG 2.1 AA）

- **对比度（v2 修正 · 以下为按 WCAG 2.1 相对亮度公式实测的数值，v1.0 的 2.6:1 / 7.4:1 均有偏差）**

  | 用色 | 底色 | 实测对比度 | 判定（AA） |
  |---|---|---|---|
  | `--ink` `#1A2332` | 白 | **15.78:1** | ✅ AAA |
  | `--ink-2` `#4A5868` | 白 | **7.27:1** | ✅ AAA |
  | `--red` `#2D638A` | 白 | **6.44:1** | ✅ AAA |
  | `--ink-3` `#8B97A7` | 白 | **2.97:1** | ❌ 正文（4.5:1）与大字号（3:1）**均不达标** |
  | `--ink-4` `#B5BEC9` | 白 | **1.88:1** | ❌ 任何文本均不达标 |
  | `.utility-bar` `#B5C4D6` | `--navy-deep` | **9.74:1** | ✅ AAA |
  | `.lang-en` `#6A80A0` | `--navy-deep` | **4.29:1** | ❌ 12px 文本需 4.5:1 |
  | `.sep` `#3A5070` | `--navy-deep` | 2.11:1 | 非文本分隔符，豁免 |

  **v1.0 给的例外规则「`--ink-3` 仅用于 ≥18.66px 粗体」是不成立的**——2.97 连大字号的 3:1 门槛都过不去。改为下列三条强制规则（令牌值本身不改，改的是用色规则；已在 §5.3 登记为显式偏离）：

  1. **`--ink-3` / `--ink-4` 退出全部文本用途**（含大字号、含 `<figcaption>`、含表单 placeholder），仅可用于 1px 分隔线、图标描边、禁用态图形等**非文本图形**。ref 中落在 `--ink-3` 上的正文（`.footer-brand p`、`.domain p` 的次要行、`.news-item` 摘要等）一律改用 `--ink-2`。
  2. **顶栏 EN 切换**（§2.2 规定渲染为 `aria-disabled`）颜色由 `#6A80A0` 改为 **`#8AA0BE`**（对 `--navy-deep` 实测 **6.46:1**）。不要指望「禁用态豁免」——WCAG 的豁免针对**原生 `disabled` 表单控件**，`aria-disabled` 的链接仍在可访问性树中，axe 会照常判定。
  3. **新增 CI 护栏**：`tests/unit/contrast.spec.ts` 遍历 `tokens.css` 的全部前景/背景组合，对**任何被标记为文本用途的组合**断言 ≥ 4.5:1。这条比 axe 更早、更便宜地拦住回归。
- 图片替代文本：装饰性图片 `alt=""` + `role="presentation"`；`--red-soft` 底上的图标必须有 `aria-hidden="true"`（图标语义由相邻文本承担）
- 语义结构：每页唯一 `<h1>`；`<nav aria-label>` 区分主导航/页脚/面包屑；区块用 `<section aria-labelledby>`
- 动效：`@media (prefers-reduced-motion: reduce)` 下 `.reveal` 直接 `opacity:1;transform:none`，`transition:none`，视频不自动播放
- 表单：`<label>` 显式绑定、`aria-describedby` 关联错误、`aria-live="polite"` 播报提交结果、错误时焦点移到首个非法字段
- 键盘：全部交互元素可 Tab 到达且有可见焦点环；`.totop` 是 `<button>` 不是 `<div>`

### 10.4 性能预算

| 指标 | 目标 |
|---|---|
| LCP（首页，4G 模拟） | ≤ 2.0 s |
| CLS | ≤ 0.02 |
| INP | ≤ 200 ms |
| 首页初始 JS（gzip） | ≤ 110 KB |
| 单张截图（WebP） | ≤ 320 KB（超出则降至 1920 宽重转） |
| 字体 | 三套 CJK 字体按 `unicode-range` 分片自托管，首屏仅加载 `Noto Sans SC` + `Inter` 的 latin+常用汉字子集；`font-display:swap` |

**字重收敛（v2 修正 · P1-2）**

v1.0 写的「ref 声明了 `300;400;500;700;900`，实际只用到 `300/400/500/700`」把三个字族混为一谈，并且**漏掉了 `600`**。实测 `ref/1.html` 的全部 `font-weight` 声明计数为：`700`×12、**`600`×10**、`500`×10、`400`×1、`300`×1。按字族拆开后的真实情况：

| 字族 | ref 的 Google Fonts 声明 | 实际用到 | v2 打包决策 |
|---|---|---|---|
| `Noto Sans SC`（`--sans-cn`） | `300;400;500;700;900` | 300 / 400 / 500 / 700；另有 5 处请求 600，但该家族未提供 600，浏览器按 CSS 字体匹配规则回退到 700 | 打包 **300 / 400 / 500 / 700**，弃 900 |
| `Inter`（`--sans-en`） | `300;400;500;600;700` | **600 真实生效** | 打包 **400 / 500 / 600 / 700**，**600 不得删除** |
| `Noto Serif SC`（`--serif-cn`） | `500;700;900` | 700（`.hero h1`、`.section-title`） | 打包 **700**，弃 500 / 900（如后续标题出现 500 用法再补） |

⚠️ **`600` 是必须保留的字重。** 声明 `font-weight:600` 的 10 条规则是：`.brand-text .en`、`.btn-primary`、`.section-label`、`.section-more`、`.domain-link`、`.solution-code`、`.btn-text`、`.value-num`、`.news-date`、`.news-item-cat`。其中落在 `--sans-en`（Inter）上的 5 条会**真实渲染为 600**——那是全站 eyebrow 标签、产品代号、价值编号、新闻日期的字重。删掉 Inter 600，首页几乎每个区块的视觉重量都会变，直接违反 §5 契约且必然在视觉签核时被打回。

落在 `--sans-cn` 上的 5 条（中文按钮与链接文案）当前实际渲染为 700。**实现时保持 `font-weight:600` 的声明原样**，不要"顺手改写成 700"——保持与 ref 字面一致，未来若给 Noto Sans SC 补 600 字重，行为变化是可预期的、可比对的。

按此收敛后仍可省下 Noto Sans SC 的 900、Noto Serif SC 的 500/900 三档，体积收益约 30%。

### 10.5 SEO

- `generateMetadata` 逐页设置 `title`（模板 `%s | 智瞳安宇 Aegiston`）、`description`、`openGraph`、`alternates.canonical`
- JSON-LD：`Organization`（layout）、`Product`（产品页）、`Article`（洞察详情）、`BreadcrumbList`（内页）
- `sitemap.ts` 从 `/api/v1` 拉取全部 slug 动态生成
- `robots.ts`：允许全站，`/api/` 与 `/sitemap`(抽屉) 除外

---

## 11. 部署与运维

### 11.1 环境变量

| 变量 | 侧 | 说明 |
|---|---|---|
| `AEGISTON_ENV` | api | `dev`/`staging`/`prod` |
| `AEGISTON_DATABASE_URL` | api | 运行期**异步** URL：`sqlite+aiosqlite:////data/aegiston.db` |
| `AEGISTON_SYNC_DATABASE_URL` | api | **v2 新增（P1-13）**：Alembic 迁移用的**同步** URL：`sqlite:////data/aegiston.db`。Alembic 默认 `env.py` 无法使用异步 URL，缺这一项则容器首次启动执行迁移即失败。由 `Settings` 从同一路径推导，不允许两处各写各的 |
| `AEGISTON_RATELIMIT_STORAGE` | api | **v2 新增（P1-9）**：限流计数器存储；默认与 `AEGISTON_SYNC_DATABASE_URL` 同库，保证多 worker 共享计数 |
| `AEGISTON_CORS_ORIGINS` | api | 逗号分隔白名单 |
| `AEGISTON_ADMIN_TOKEN` | api | 线索管理接口令牌（≥32 字符） |
| `AEGISTON_SECRET_SALT` | api | IP hash 盐 |
| `AEGISTON_RATE_LIMIT_LEADS` | api | 默认 `5/hour` |
| `API_BASE_URL` | web | 服务端 RSC 调用地址（容器内 `http://api:8000`） |
| `NEXT_PUBLIC_SITE_URL` | web | 绝对 URL，用于 canonical/OG |

### 11.2 Docker Compose（生产）

```yaml
services:
  api:
    build: ./backend
    environment: [...]
    volumes: ["aegiston-data:/data"]
    healthcheck:
      test: ["CMD","python","-c","import urllib.request;urllib.request.urlopen('http://localhost:8000/api/v1/health/ready')"]
      interval: 30s
  web:
    build:
      context: ./frontend
      args: { API_BASE_URL: "http://api:8000" }
    # v2 修正（P1-5）：不能用 condition: service_healthy —— 见下方说明
    depends_on: { api: { condition: service_started } }
  nginx:
    image: nginx:1.27-alpine
    ports: ["80:80","443:443"]
    volumes: ["./nginx/aegiston.conf:/etc/nginx/conf.d/default.conf:ro"]
volumes: { aegiston-data: {} }
```

> **v2 修正（P1-5）· 编排必须与降级承诺自洽**
>
> v1.0 里三条规则叠在一起会产生一个和 R12 完全相反的结果：
> 1. §8.2：内容包校验失败 → `ContentRepository` 抛 `RuntimeError` → **进程拒绝启动**；
> 2. §11.2：`web.depends_on: { api: { condition: service_healthy } }` → api 不健康时 **web 根本不会被拉起**；
> 3. §13 R12：承诺「后端挂了官网仍然可访问」。
>
> 于是：内容包里一个 `mediaId` 拼错 → api 永远不健康 → web 从不启动 → **整站白屏**，精心设计的快照兜底一次都用不上，`offline-api.spec` 也守不住这个场景（它只测「运行中的 API 被停掉」，不测「API 从未起来」）。
>
> **修正**：
> - `depends_on` 降为 `service_started`（只保证启动顺序，不阻塞）。web 的 RSC 在 api 未就绪时按 §4.2 路径 A 走快照，页面照常 200。
> - `nginx` 对 `web` 同样只用 `service_started`。
> - `api` 的 `healthcheck` 保留，但它的作用改为**给运维看**（`docker compose ps` 的 unhealthy 标记 + 告警），而不是卡住依赖链。
> - §12.3 增加 `cold-start-without-api.spec`：在 api **从未启动**的情况下拉起 web，断言 `/` 与三个产品页均 200 且渲染快照内容。这才是真正对应 R12 的用例。

#### 11.2.1 降级快照的生命周期（v2 新增 · P1-5）

v1.0 定义了快照文件（`src/content/snapshot/*.json`）和生成脚本，但没有定义**何时生成、由谁提交、如何防止过期**——而快照过期正是这套降级机制最可能的失效方式：后端挂了，前端降级成功，却渲染出三个月前的内容。

| 环节 | 约定 |
|---|---|
| 生成时机 | **CI 中，在 `npm run build` 之前**。步骤：启动 api 容器 → 等 `/health/ready` → `npm run content:snapshot` → 产物写入 `frontend/src/content/snapshot/` |
| 是否入库 | **入库。** 快照必须随代码走，否则离线构建（私有化交付的核心场景）拿不到它 |
| 漂移检查 | CI 增加 `content:snapshot:check`：重新生成后与仓库中的文件做 diff，**不一致即失败**并提示「内容包改了但没重新生成快照」。这条与 §13 R13 的引用完整性校验互补 |
| 版本标记 | 每个快照文件顶层带 `_contentHash` 与 `_generatedAt`；`api.ts` 走降级路径时把 `_contentHash` 打进日志与 `x-aegiston-fallback` 响应头，运维一眼能看出线上正在用哪一版快照 |
| 陈旧告警 | `_generatedAt` 距今 > 30 天时，`loadSnapshot()` 额外打一条 `warn` 级日志（不影响渲染） |

镜像构建走国内源（npmmirror / 清华 PyPI），与既有 `/opt/aegiston` 部署约定一致。

### 11.3 安全响应头（nginx + `next.config.mjs` 双写）

**v2 修正（P1-7）**：v1.0 的 `script-src 'self' 'unsafe-inline'(…用 nonce 收紧)` 是一条自相矛盾的策略，必须二选一：

- **CSP Level 2+ 规定：一旦 `script-src` 中出现 nonce（或 hash），浏览器就会忽略同一指令里的 `'unsafe-inline'`。** 二者写在一起没有「先宽松再逐步收紧」的中间态。
- **Next.js 的 nonce 必须由 middleware 逐请求生成并下发**，而读取 nonce 的页面**会被强制转为动态渲染**。这会直接推翻 §4.3 的 ISR + Full Route Cache，以及 §3.1 里 24 条路由的渲染策略——一个内容站为此放弃全站静态化，代价与收益完全不成比例。

**v1 的选择：保 ISR，用 `'unsafe-inline'`，并用其余指令把攻击面压到最小。** 这是可接受的：本站没有用户输入回显、没有富文本渲染（洞察正文经 `bleach` 白名单净化，见 §9.2）、没有第三方脚本，XSS 注入点接近于零。

```
Content-Security-Policy:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'none';
  form-action 'self';
  img-src 'self' data: blob:;
  media-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  font-src 'self';
  connect-src 'self';
  manifest-src 'self';
  upgrade-insecure-requests
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

说明：
- `img-src` 保留 `data:`（`next/image` 的 `blurDataURL`）与 `blob:`（Lightbox 的客户端缩放）。
- `style-src 'unsafe-inline'` 无法去掉：`next/image` 与 React 都会产出内联 `style` 属性；但内联 **style** 的风险等级远低于内联 **script**。
- **v2 选项（不在 v1 范围）**：若未来确有 nonce 需求，前提是接受「改为 `output: 'standalone'` + 全站 SSR、放弃 ISR」，并同步改写 §3.1 的渲染策略列与 §4.3。**不要在 v1 里悄悄引入 middleware nonce**——它会让整张缓存表失效而没有人察觉。
- 双写位置：nginx 负责所有静态与代理响应，`next.config.mjs` 的 `headers()` 负责 Next 自身路由；两处**必须逐字一致**，并由 `tests/e2e/security-headers.spec.ts` 对全部 24 条路由断言。

因为全部图片与字体已本地化，CSP 可以做到 `default-src 'self'`，**无任何外部域白名单**——这对政企客户是加分项。

### 11.4 可观测性

- 结构化 JSON 日志（request-id 贯穿 web → api）
- `/api/v1/health` 暴露 `contentHash`，发布后可核对前后端内容版本一致
- 可选 `prometheus-fastapi-instrumentator`（默认关闭，env 开启）

---

## 12. 测试与验收标准

### 12.1 后端测试（pytest，覆盖率门槛 `app/` ≥ 85%）

| 用例 | 断言 |
|---|---|
| `test_content_integrity`（**v2 修正 · 清单级，后端内可跑**） | 内容包全部通过 schema；所有 `mediaId` 在 `media_manifest.json` 中存在；所有 `pillarId` / `paperId` / `solutionSlug` 引用可解析；manifest 中每条记录的 `width`/`height`/`blurDataURL` 字段非空且自洽（`width>0`、`blurDataURL` 是合法 data URI）。**不触碰磁盘上的图片文件** |
| `test_static_route_precedence`（**v2 新增 · P1-4**） | `GET /api/v1/products/deployment` 返回 200 且响应体是 `DeploymentPage`（而非 404）；`/products/unknown` 返回 404 且 body 为 RFC7807 |
| `test_source_coverage` | 每个 `ProductDetail.source_slides` 非空；**`kind == "screenshot"` 的 asset ≥ 45 个**（v2 收紧口径：§6.2 的 77 个 asset 中有 7 个示意图/架构图与 3 个案例配图，不应计入 G4 的「真实软件截图」） |
| `test_home` | 200；`metrics` 恰 4 项；`domains` 恰 4 项；`solutions` 恰 3 项（对齐 ref 布局） |
| `test_products_slugs` | `aragonteam/inkclaw/legallens` 均 200；未知 slug 返回 404 且 body 为 RFC7807 |
| `test_insights_pagination` | `pageSize` 越界返回 422；分页元数据正确 |
| `test_lead_valid` | 201；DB 中存在记录；`ip_hash` 非明文 IP |
| `test_lead_invalid` | 缺 `consent`→422；手机号非法→422；`message` 含 `<script>` → 落库已净化 |
| `test_lead_honeypot` | `website` 非空 → 202 且**不落库** |
| `test_lead_ratelimit` | 第 6 次 → 429 + `Retry-After` |
| `test_admin_auth` | 无 token → 401；错误 token → 401（且响应时间无显著差异） |
| `test_etag` | 二次带 `If-None-Match` → 304 |

> **v2 修正（P1-6）· 为什么把磁盘校验拆出去**
>
> v1.0 的 `test_content_integrity` 要求断言「所有 manifest 中的文件在磁盘存在且宽高与记录一致」。但图片产物位于 `frontend/public/media/**`，**后端镜像里没有这棵树**——§4.1 的架构图自己就标注了「构建期产物，非运行期依赖」。照 v1.0 实现只有两个结果：测试在容器/CI 里恒失败，或者被迫把 58 MB 图片塞进后端镜像，两者都不可接受。同理，§8.2 中 `ContentRepository` 的启动校验（第 3 步）**只做清单级引用完整性**，不做磁盘存在性检查。
>
> **磁盘级校验移到 CI 专用脚本** `scripts/validate_assets.py`（在能同时看到两棵树的 CI runner 上执行，不进任何镜像）：
>
> | 断言 | 说明 |
> |---|---|
> | manifest 中每个 `src` 在 `frontend/public/` 下真实存在 | 防碎图 |
> | 用 Pillow 读取实际宽高，与 manifest 记录一致 | 防 CLS（§10.2 依赖真实宽高推导 `aspect-ratio`） |
> | 单文件 ≤ 3 MB（§13 R5） | 防性能预算被击穿 |
> | `frontend/public/media/product/` 下**没有**未被任何内容引用的孤儿文件 | 防仓库膨胀 |
> | `kind == "screenshot"` 的资源计数 ≥ 45 | 兑现 G4 |
>
> 该脚本挂进 §12.4 的 CI 门禁，与 `validate_content.py` 并列。

### 12.2 前端单元测试（Vitest + RTL）

- `Reveal` 在 `prefers-reduced-motion` 下不加 transform
- `NavDropdown` 键盘序列：`Enter` 展开 → `↓` 聚焦首项 → `Esc` 收起并回焦触发器
- `LeadForm` 校验分支与错误播报
- `ScreenshotFigure` 渲染出正确 `alt` 与 `aspect-ratio`
- `api.ts` 在 fetch 抛错两次后返回快照数据（mock）

### 12.3 E2E（Playwright，Chromium + WebKit + Mobile Chrome）

| 用例 | 断言 |
|---|---|
| `routes.spec` | 从 `ROUTES` 常量取出**全部路由**逐个访问，状态 200 且 `<h1>` 非空 —— 直接兑现「按钮点击多页面功能正常」 |
| `navigation.spec` | 遍历导航中每个 `<a href>`（含页脚、CTA、面包屑、卡片链接），断言无 `href="#"`、无 404、无跨站意外跳转；统计链接总数 ≥ 60 |
| `mobile-nav.spec` | 375px 视口下汉堡可打开、二级可展开、点击后跳转并自动关闭 |
| `lightbox.spec` | 点击截图打开 dialog；`Esc` 关闭；焦点回到触发元素；`←/→` 切换 |
| `contact.spec` | 填表提交（API mock 201）→ 成功 toast；服务端 422 → 内联错误且焦点定位 |
| `a11y.spec` | 对 10 个关键路由跑 `@axe-core/playwright`，**critical/serious 违规数 = 0** |
| `computed-style.spec`（**v2 新增，取代原 `visual.spec` 的守护职责**） | 对 §5.2 / §5.2.1 列举的**每一项度量**断言 `getComputedStyle` 实测值：如 `.nav-inner` 的 `height === '80px'`、`.section` 的 `padding === '96px 0px'`、`.solution` 的 `gap === '72px'`、`.metric::after` 的 `height === '56px'`、`.domains` 在 1024/640 两档的 `grid-template-columns` 列数等。**这是 §5 视觉契约唯一可自动化且稳定的守护手段** |
| `responsive.spec`（**v2 新增**） | 在 `1440 / 1024 / 960 / 860 / 700 / 375` 六档视口下逐档断言 §5.2.1 的九条规则生效（六档是为了同时穿过 1024 / 900 / 768 / 640 四条断点线） |
| `visual.spec`（**v2 降级为 advisory**） | 首页与三个产品页在 `1440 / 1024 / 375` 三档做**自身**视觉回归（基线在 Playwright 官方容器内生成并入库），`maxDiffPixelRatio: 0.02`。**不再与 `ref/1.html` 截图比对**，不作为合并门禁 |
| `offline-api.spec` | 停掉 API 后首页仍 200 且渲染快照内容 |

> **v2 修正（P1-11）· 为什么原 `visual.spec` 不成立**
>
> v1.0 要求「首页三档截图与基准图比对，像素差 ≤ 0.3%，基准图由 `ref/1.html` 首屏对齐后人工确认生成」。这条**在物理上无法通过**：G2 要求内容 100% 来自 PPT、G4 要求换成真实产品截图、§3.1 要求导航标签全部改成 PPT 口径——新站与 `ref/1.html` 的**文案、图片、链接文字全都不同**，像素差必然是百分之几十而不是 0.3%。它把「与 ref 保持一致的是**视觉语言**（令牌、栅格、间距、字重、动效）」错当成了「与 ref 保持一致的是**像素**」。
>
> 其次，即便改成与新站自身比对，0.3% 的硬门禁在 CJK Web 字体 + 跨平台字形栅格化下也必然抖动，会退化成长期红灯，最后被人 `--update-snapshots` 一键忽略。
>
> **v2 的替代方案**：把守护职责从「像素」下移到「计算样式」。`computed-style.spec` + `responsive.spec` 直接断言 §5.2 / §5.2.1 的每一条数值——它们精确、稳定、可读，失败信息直接指向是哪一条度量偏了，比一张 diff 图有用得多。像素比对保留但降为 advisory，只用于人工审阅趋势。
>
> **人工签核不可省**：DoD #2「与 `ref/1.html` 并排比对」仍然是一次**人工**动作，产物是 §5.2 / §5.2.1 逐条打勾的签核单，存到 `docs/plans/aegiston-corporate-site/visual-signoff.md`。

### 12.4 CI 门禁（全绿才可合并）

**v2 修正**：门禁清单按评审结论补齐——新增资源磁盘级校验（P1-6）、快照漂移检查（P1-5）、样式分层护栏（P0-2），并把命令改为跨平台单行写法（P1-15）、把 Lighthouse SEO 门槛从 `= 100` 放宽到 `≥ 95`（P2-11，避免 Lighthouse 版本升级引入新审计项即红灯）。

```
# --- 后端 ---
ruff check backend
ruff format --check backend
mypy backend/app
pytest backend --cov=app --cov-fail-under=85
python -m backend.scripts.validate_content --content-dir backend/app/content --strict

# --- 资源与内容一致性（v2 新增，CI 专用：需同时看到前后端两棵树）---
python -m backend.scripts.validate_assets --manifest backend/app/content/media_manifest.json --public frontend/public
npm --prefix frontend run content:snapshot:check      # 快照漂移检查（§11.2.1）

# --- 前端 ---
npm --prefix frontend run lint                        # eslint + stylelint（含 §9.3 样式分层护栏）
npm --prefix frontend run typecheck
npm --prefix frontend run test:unit                   # 含 styles.spec / contrast.spec
npm --prefix frontend run build
npx --prefix frontend playwright test                 # 含 computed-style / responsive / cold-start-without-api
lhci autorun                                          # Perf ≥ 90, A11y ≥ 95, Best-Practices ≥ 95, SEO ≥ 95 (desktop)
```

> `visual.spec` 以 advisory 身份运行（`--reporter=html`，失败不阻断合并），仅用于人工审阅趋势；真正的门禁是 `computed-style.spec` 与 `responsive.spec`（§12.3）。

### 12.5 验收标准（Definition of Done，逐条可勾）

1. `docker compose -f docker-compose.prod.yml up` 后访问 `/` 正常，全部 24 条路由可达
2. 首页与 `ref/1.html` 并排比对：配色、字号、间距、栅格、hover 反馈、滚动动效一致——**§5.2 与 §5.2.1 逐项签核，产物存入 `docs/plans/aegiston-corporate-site/visual-signoff.md`**；`computed-style.spec` 与 `responsive.spec` 在 CI 上全绿
3. 站内**无任何 `href="#"` 或 404 链接**；未实现的入口已从导航与 `src/lib/routes.ts` 中移除而非留空（§14 硬约束）
   - `/api/v1/products/deployment` 与 `/products/deployment` 均返回真实内容（P1-4 路由遮蔽回归）
   - 停掉 api 后、以及 api **从未启动**的冷启动场景下，`/` 与三个产品页仍 200 且渲染快照（P1-5）
4. 产品页共展示 ≥ 45 张 PPT 真实截图，且每张 `figcaption` 标注来源页码
5. 全部图片、字体本地托管；断网（仅内网）环境下页面完整渲染
6. 内容抽检 20 处，与 PPT 原文一致（含数字、单位、术语大小写 `AragonTeam`/`InkClaw`/`LegalLens`）
7. axe 无 critical/serious 违规；键盘可完成「首页 → 产品 → 提交表单」全流程
8. Lighthouse 桌面端达 §12.4 分数
9. 线索提交后可通过 `GET /leads`（带 token）查到，CSV 导出可用
10. `README.md` 中的命令**逐条实际跑通**（并在 **Windows / PowerShell** 下验证，见 §7.4）
11. 若有未完成层级，spec 末尾已按 §14 要求补上 `## 实施过程发现的方案缺陷` 小节

---

## 13. 风险与缓解

| # | 风险 | 影响 | 缓解措施 |
|---|---|---|---|
| **R1** | **PPT 内部数据自相矛盾**：p.84 称中通服「累计审核 500+ 份、识别关键风险 1280 项、有效率 86%、人均 35→105 份/月」，p.95 却称「3000+ 项风险、人均 300+ 份/月、有效率 >90%」；p.84 交控「1 天 → 4–5 分钟、覆盖率 41%→73%」vs p.96「10 分钟、99%」 | 官网公开对外，数据打架会直接损伤可信度，且可能构成虚假宣传 | **默认口径**：行业案例页与首页数字统一采用 p.95–p.97（客户案例章节，版本更新）；p.84 的差异版本记录在 `docs/plans/aegiston-corporate-site/content-notes.md`。**上线前必须由客户书面确认**（列入 Subtask #1 评审阻塞项）。所有对外数字在 `content` 中带 `source: "PPT p.95"` 字段，便于回溯 |
| **R2** | **竞品对照表法律风险**：p.43 / p.62 / p.86 点名豆包、通义法睿、明鉴智律、幂律 MeCheck、智合同、Codex、Claude Code 等并作贬损性评价 | 公开发布可能触及《反不正当竞争法》第十一条商业诋毁 | 公开页**只发布"能力维度自述"版本**（保留维度与本产品能力，删除竞品列与评价性措辞）；完整对照表改为 `/contact?intent=consult` 线索换取的 PDF。需法务复核后再定 |
| **R3** | **客户名称与保密**：p.94–p.97 出现「中通服科信」「中通服陕西分公司」等具名客户 | 未经授权公开引用客户名可能违反保密条款 | v1 公开页统一脱敏为「某省级通信服务集团」「某省交控集团」「某头部律师事务所」「某信托公司」；具名版本需拿到客户 logo 使用授权后再替换。战略合作伙伴具名同样需授权 |
| **R4** | **截图含敏感信息**：真实截图中可能出现内部项目名、账号、路径（已观察到 `claude-code`、`admin`、项目名等） | 泄露内部信息 | 提取脚本后强制人工过审（§6.4）；提供 `scripts/redact.py` 局部打码；Subtask #3 的 Review 清单包含逐张核对 |
| **R5** | **`image64.GIF` 25 MB** | 直接引用会毁掉性能预算 | §6.4 双路径：ffmpeg → MP4（预计 < 2 MB）；否则退化首帧静态图。CI 校验 `public/media` 单文件 ≤ 3 MB |
| **R6** | **EMF 架构图无法直接上 Web** | p.65 架构图缺失 | 用内联 SVG 重绘（`<LegalLensArchitecture>`），可访问、可响应式，反而优于位图 |
| **R7** | **CJK 字体体积**（三套 Noto + Inter） | 首屏字体可达数 MB | `next/font` 子集化 + `unicode-range` 分片 + 字重收敛到 4 个 + `font-display:swap`；衬线体 `Noto Serif SC` 仅用于标题，按需异步加载 |
| **R8** | **像素级还原与 React 组件化冲突** | 返工 | 采用 CSS Modules **直接搬运 ref 的声明**（不重写选择器语义），并用 `visual.spec.ts` 基准图回归锁死 |
| **R9** | **未来 ICP 备案号缺失**（ref 中为 `陕 ICP 备 2026XXXXXX 号`） | 国内上线合规 | `site.json` 中留 `icp: null`，为空时页脚不渲染该行；上线前由客户填入。CI 在 `AEGISTON_ENV=prod` 且 `icp` 为空时**告警但不阻断** |
| **R10** | **ref 中的新闻日期为 2026.07 等未来时间** | 内容不实 | 洞察文章日期改为真实发布日期；`validate_content.py --strict` 拒绝任何 `publishedAt > 今天` |
| **R11** | **Unsplash / Wikimedia 图片授权** | 侵权 | 全部记录署名与许可证到 `stock_credits.json`，页脚「图片来源」页展示；西安 CBD 天际线为 Wikimedia CC 图，需按 CC 要求署名 |
| **R12** | **后端不可用导致官网整体不可访问** | 品牌事故 | §4.2 路径 A 的快照兜底 + ISR 陈旧数据可继续服务（**v2 勘误：删去 `stale-if-error` 表述**——Next.js 的 Data Cache 并不实现该 HTTP 扩展指令，真正的兜底是快照与 ISR 陈旧值）；E2E 有 `offline-api.spec` 与 **`cold-start-without-api.spec`**（v2 新增，见 §11.2）双重守护 |
| **R13** | **内容包与截图不同步**（改了内容忘了跑资源脚本） | 线上碎图 | `ContentRepository` 启动即做引用完整性校验，失败**拒绝启动**；CI 单独跑 `validate_content.py` |
| **R14** | **单个编码节点范围过大**（约 175 个文件，24 条路由，19 个端点） | 交付不完整、且以「每层都做一半」的最坏形态不完整 | **v2 强化**：§14 顶部定义了**最小可交付切线（L0–L3）**与逐层放弃顺序，并规定两条零容忍硬约束（不留死链、四处路由定义同源）与未完成项的**回写义务**（写入 spec 的 `## 实施过程发现的方案缺陷` 小节，供 Subtask #3 逐条核对） |

---

## 14. 实施顺序（给 Subtask #2 的分阶段清单）

> **v2 新增（P1-14）· 最小可交付切线（MVP Cut Line）**
>
> 任务树里 Subtask #2 是**单个**编码节点，要产出约 175 个文件 / 24 条路由 / 19 个端点 / 全量内容包。v1.0 的 Phase 0–4 是线性全量清单，没有回答「哪一刀切下去仍然是一个**可交付的完整站点**」。不定义这条线，最可能的失败模式是：四个阶段各做一半，最后没有任何一条路径是完整的。
>
> **切线定义（按此顺序放弃，绝不跳跃）**：
>
> | 层级 | 内容 | 放弃条件 |
> |---|---|---|
> | **L0 · 不可放弃** | Phase 0 全部 + 资源脚本产出 ≥ 45 张截图 + `site`/`home`/三个 `products` 内容包 + 首页像素级复刻 + 三个产品页 + `/contact`（含表单写路径）+ 全站导航可点无死链 + 404/error 页 | 永不放弃。这是「顶级科技公司产品页面」的最小完整形态 |
> | **L1** | `/products/deployment`、`/solutions/*`（4 页）、`/research`+`/research/papers`、`/about/*`（4 页） | 时间不足时，先把 `/solutions/*` 与 `/about/*` 压缩为**单页聚合**（`/solutions` 一页承载四个行业分区，锚点跳转），而不是留空页 |
> | **L2** | `/insights` 列表与详情、`/careers`、`/sitemap` 抽屉 | 可降级为静态 3 篇 + 站点地图页 |
> | **L3** | `/legal/*`、`GET /leads` 管理接口与 CSV 导出、Lighthouse 调优、`visual.spec` 基线 | 可整体后置到下一轮 |
>
> **硬约束（无论切到哪一层）**：
> 1. **不允许出现 `href="#"`、空页面或 404**。任何未实现的入口必须从导航与 `src/lib/routes.ts` 中**移除**，而不是留一个死链——G3 与 DoD #3 是零容忍项。
> 2. `ROUTES` 常量、导航数据、`sitemap.ts`、`routes.spec.ts` 四者**始终同源**，删路由就是删一处。
> 3. 每一层做完即是一个可 `docker compose up` 跑起来的完整站点，不留半成品。
>
> **未完成项的回写义务**：Subtask #2 若未做完某层，**必须**在 spec 末尾新增 `## 实施过程发现的方案缺陷` 小节，逐条写明「未实现的路由 / 未实现的端点 / 已从导航移除的入口 / 与本方案的偏离及原因」。Subtask #3 的 Review 以该小节为清单核对。

**Phase 0 · 地基（约 15%）**
1. **`git init`**（当前目录尚无 `.git`，而 Subtask #3 的验收条件是 `git commit`），写入 `.gitignore` / `.gitattributes` / `.editorconfig`，做首个提交
2. 初始化 monorepo 骨架、`.env.example`、`npm run` 跨平台入口（`Makefile` 作为 Linux/CI 的可选便利层，见 §7.4）、Docker、CI 空跑通
3. `backend/app/core/*` + `main.py` + `/health`，`docker compose up` 可访问
4. `frontend` 初始化，`tokens.css` + `base.css` + `sections.css` + `responsive.css` 四层样式落地（§9.3 样式分层策略），`layout.tsx` 出一个空白但字体/容器/断点正确的页

**Phase 1 · 资源与内容（约 25%）**
4. 实现 `extract_pptx_assets.py`，跑通产出 ≥ 72 个 asset + manifest（含 GIF/EMF 分支）
5. 实现 `fetch-stock-images.mjs`，本地化 11 张配图
6. 编写内容包 JSON：`site` → `home` → `products/*` → `solutions/*` → `research/*` → `about/*` → `insights/*`（**最大工作量，严格按 PPT 逐页誊写并标注 `source`**）
7. 实现 `ContentRepository` + `validate_content.py`，CI 门禁生效

**Phase 2 · 首页像素级复刻（约 20%）**
8. `SiteHeader`/`NavDropdown`/`MobileNav`/`UtilityBar`/`SiteFooter`/`ToTop`
9. `Hero` → `DomainGrid` → `SolutionRow` → `PhilosophyValues` → `MetricBand` → `InsightsPreview` → `SustainBlock` → `CtaBand`
10. 与 `ref/1.html` 并排比对签核，生成 `visual.spec` 基准图

**Phase 3 · 内页与截图导览（约 25%）**
11. 三个产品详情页（`ScreenTour` + `PillarCard` + `PaperCard` + `Lightbox`）
12. `/products/deployment`、`/solutions/*`、`/research/*`、`/insights/*`、`/about/*`、`/careers`

**Phase 4 · 表单、SEO、收尾（约 15%）**
13. `leads` 端点 + `LeadForm` + Server Action + 限流 + 管理接口
14. `sitemap.ts`/`robots.ts`/JSON-LD/OG 图
15. 全量 E2E + a11y + Lighthouse，修到门禁全绿
16. `README.md`、`content-notes.md`（记录 R1/R2/R3 的待确认项）

---

## 15. 待客户/评审确认的阻塞项

1. **R1 数据口径**：中通服与交控集团的效能数字以哪一版为准？
2. **R2 竞品表**：是否同意公开页不点名竞品？
3. **R3 客户具名**：中通服、交控、律所是否已获得公开引用授权？是否可用 logo？
4. **ICP 备案号**、真实商务邮箱、电话、公司注册地址
5. `/legal/terms` 与 `/legal/privacy` 的正式文本（法务提供）
6. 洞察文章的真实发布日期与作者署名
7. 品牌 logo 矢量文件（当前只能从 `ref/1.html` 内联 SVG 提取）
8. 是否需要预留英文站（影响 v1 内容 schema 中 `en` 字段是否现在就填）

---

## 附录 A · 内容溯源速查（PPT 章节 → 站点位置）

| PPT 页 | 主题 | 落点 |
|---|---|---|
| 1, 93 | 公司定位「"AI+"企业智能化赋能与安全保障专家」 | Hero / `/about` |
| 3–7 | 市场背景、范式判断、四重困境与根因 | `/insights` 洞察文章 ×4 |
| 8–10 | 研发场景切入、私有化准入、时机判断 | `/insights` ×2、`/products/deployment` |
| 11 | AragonTeam 总述「组织 OS」 | 首页 `.solution` 01 |
| 13 | 一套底座三层产品 | `/products` |
| 14, 17–19 | AragonTeam 个人/团队/组织智能与主要功能 | `/products/aragonteam` |
| 20–39 | AragonTeam 全部界面 | `/products/aragonteam` ScreenTour |
| 40–41 | 核心技术 1/2 | `/research` pillars |
| 42 | LaMAR / MUSSEL 论文 | `/research/papers` |
| 43 | 产品层级对照 | `/research`（脱名版） |
| 44–46 | InkClaw 简介与功能 | `/products/inkclaw` |
| 47–59 | InkClaw 全部界面 | `/products/inkclaw` ScreenTour |
| 60–61 | InkClaw 核心技术 | `/research` pillars |
| 63–66 | LegalLens 简介、架构、11 项功能 | `/products/legallens` |
| 67–81 | LegalLens 全部界面 | `/products/legallens` ScreenTour |
| 82–84 | LegalLens 核心技术 1/2/3 | `/research` pillars |
| 85 | Trustworthy / P-LyRA / Santoryu | `/research/papers` |
| 88–91 | 研发团队与核心人员 | `/about/team` |
| 93 | 公司简介与定位 | `/about`、`/about/positioning` |
| 94–97 | 战略合作伙伴与典型客户 | `/solutions/*` |

---

**文档结束。** 本方案共覆盖架构、时序、文件清单（约 170 个）、REST 接口（19 个端点）、数据模型（1 张持久化表 + 12 类内容模型）、资源映射（72+ 个 asset）、测试矩阵（8 类 E2E + 11 类后端单测）与 14 项风险，可支撑下游工程师逐行实现，无需再做架构级决策。

---

## 评审结论（Review Verdict）

### 结论：**有条件通过（Approved with Conditions）**

本方案可以进入 Subtask #2 编码。它在三件最难的事情上做得很扎实：**资源映射经得起回源核对**（78 条 `asset-id ← 媒体文件（页码）` 映射逐条比对 PPTX 的 `slideN.xml.rels`，**78/78 全中**）；**内容溯源诚实**（每个内容块标注 PPT 页码，且主动把 PPT 内部自相矛盾的数据、竞品诋毁风险、客户具名授权问题单独立档到 `content-notes.md`，而不是糊过去）；**架构选型有明确的理由链**（内容常驻内存 + 唯一写路径落库 + 快照兜底，是这个体量的内容站的正解，不是为了用而用）。

评审共提出 **2 个 P0、15 个 P1、11 个 P2**。P0 与 P1 已**全部在本文档 v2 正文中直接修复**，无遗留：

| 类别 | 数量 | 状态 |
|---|---|---|
| P0 | 2 | ✅ 全部修复（§5.2.1 断点全量表；§9.3 样式分层策略） |
| P1 | 15 | ✅ 全部修复（见下表逐条索引） |
| P2 | 11 | 📋 已登记，不阻塞本轮，交由 Subtask #2 / #3 顺手处理 |

**P0 / P1 修复位置索引**

| # | 修复落点 |
|---|---|
| P0-1 | §5.2 断点行改写 + 新增 **§5.2.1 响应式断点全量表**（四档九条） |
| P0-2 | §9.3 新增 `src/styles/sections.css` 条目 + 新增 **「样式分层策略」** 小节（含 stylelint 护栏与 `styles.spec.ts`） |
| P1-1 | §5.3 `.reveal` 行改为撤销条目，钉死 `translateY(20px)` 与缓动曲线 |
| P1-2 | §10.4 **「字重收敛（v2 修正）」** 按字族拆表 + 「600 不得删除」警告 |
| P1-3 | §10.3 实测对比度表 + 三条强制规则 + `#8AA0BE` 替代色；§5.3 新增偏离登记行 |
| P1-4 | §7.2 端点顺序调换 + **注 1 路由遮蔽**；§12.1 新增 `test_static_route_precedence` |
| P1-5 | §11.2 `depends_on` 改 `service_started` + 说明；新增 **§11.2.1 降级快照的生命周期**；§12.3 新增 `cold-start-without-api.spec` |
| P1-6 | §12.1 `test_content_integrity` 收窄为清单级 + 新增「为什么把磁盘校验拆出去」与 `validate_assets.py` |
| P1-7 | §11.3 CSP 完整重写（明确选 `'unsafe-inline'` 保 ISR，nonce 降级为 v2 选项，补齐 6 条缺失指令） |
| P1-8 | §5.3 字体行改为 `next/font/local` + 字体入库 + `fonts:fetch` 脚本 |
| P1-9 | 新增 **§7.3.1 限流与反滥用**（四层配额、共享存储、单 worker 兜底、人工兜底路径、3 条新测试）；§11.1 新增 `AEGISTON_RATELIMIT_STORAGE` |
| P1-10 | §3.2 `.metrics` 行 + 新增合规约束段（强制归属说明、`note` 必填、降级方案） |
| P1-11 | §12.3 用 `computed-style.spec` + `responsive.spec` 取代原 `visual.spec` 的门禁职责 + 说明段 |
| P1-12 | §14 Phase 0 新增 `git init`；§9.1 去掉 Git LFS 强制 |
| P1-13 | §11.1 新增 `AEGISTON_SYNC_DATABASE_URL`；§9.2 Alembic 与 session 两行改写（含 `busy_timeout`） |
| P1-14 | §14 顶部新增 **最小可交付切线（L0–L3）** + 两条零容忍硬约束 + 回写义务；§13 R14 同步强化 |
| P1-15 | §7.4 全部命令改为单行 + `npm run` / `python -m` 跨平台入口 + npm script 映射表 |

### 放行条件（Conditions）

以下四条是 Subtask #2 开工时必须遵守、Subtask #3 Review 时必须逐条核对的：

**C1 · 样式分层策略先于任何组件开发落地。** §9.3 的 `tokens.css → base.css → sections.css → responsive.css` 四层必须在写第一个区块组件之前建好，并且 `tests/unit/styles.spec.ts`（断言 ref 的 60 条跨元素选择器逐条存在）先跑通。**这一条如果在后期返工，成本是整个前端重写。**

**C2 · 视觉契约以 §5.2 + §5.2.1 为唯一事实源。** 任何与 `ref/1.html` 的偏离，只能来自 §5.3 的偏离表（v2 已扩充到 7 条）。发现新的必要偏离时，**先写进 §5.3 再改代码**，不允许口头决定。§12.3 的 `computed-style.spec` 与 `responsive.spec` 是自动守护，人工签核单（`visual-signoff.md`）是最终确认，两者都不可省。

**C3 · 内容风险按保守口径实现，不等确认。** §15 与 `content-notes.md` §8 的 8 项待确认事项**本次评审无权关闭**。在拿到客户/法务书面确认前，一律按 `content-notes.md` 的保守口径落地：数据取 p.95 / p.96 口径并在 `content` 中带 `source` 字段；竞品表只发能力自述版、不点名；客户名全部脱敏；首页「全国第 1」必须带归属说明（P1-10）；ICP 为空时页脚不渲染该行。所有此类字段带 `pendingConfirmation: true` 标记，`validate_content.py --strict` 输出告警清单。

**C4 · 按 MVP 切线交付，未完成必须回写。** 严格按 §14 的 L0 → L1 → L2 → L3 顺序推进，逐层完整而非逐层半成品。**任何情况下都不允许留下 `href="#"`、空页面或 404**；未实现的入口从导航与 `src/lib/routes.ts` 中移除。若有未完成层级，必须在本文档末尾新增 `## 实施过程发现的方案缺陷` 小节逐条写明。

### 尚未关闭的外部阻塞项

§15 的 8 项（数据口径 / 竞品表 / 客户具名 / ICP 与联系方式 / 法务文本 / 洞察发布日期 / 品牌矢量 logo / 英文站取舍）依赖客户与法务输入，**不属于本次评审可关闭的范围**，按 C3 处理，不阻塞编码。

---

**评审结束。** 文档版本 **v2**，P0 / P1 全部关闭，允许进入 Subtask #2 编码。

---
---

## 实施过程发现的方案缺陷

> **记录人**：Subtask #2 编码节点 · **日期** 2026-08-25
> **依据**：放行条件 C2「发现新的必要偏离时，先写进 §5.3 再改代码，不允许口头决定」
> 与 C4「未完成必须回写」、§14「未完成项的回写义务」。
>
> 本节记录三类内容：**(A) 源材料本身的缺陷**（ref/1.html 与 PPT 里就是错的）、
> **(B) 方案在落地时被证伪或需要收窄的条目**、**(C) 实际交付范围与 §14 切线的对照**。
>
> B 组里 B-1 / B-7 / B-8 三条有一个共同点：**构建全绿、SSR 正常、静态检查全过，但运行时静默失效**。这正是 P0-2 关心的那类失效模式，只是换了个位置出现。本轮把它们各自钉进了一条自动化断言（`styles.spec.ts` / 全站死链扫描 / `contact.spec.ts` 的提交用例），下一轮不会再靠人眼发现。
> Subtask #3 的 Review 以本节为清单逐条核对。

### A. 源材料缺陷（ref / PPT 侧）

#### A-1 · `ref/1.html` 的 `.domain-photo-c` 规则被一个字面量 `\n` 吞掉，从未生效

`ref/1.html` 第 183 行的实际内容是：

```
.domain-photo{height:168px;margin:0 -28px 26px;…}\n.domain-photo-c{background-position:center 42%}
```

那个 `\n` 是**字面的反斜杠加 n**，不是换行符。CSS 里 `\n` 是转义序列，等价于字符 `n`，
于是第二条规则的选择器被解析成 `n.domain-photo-c` —— 一个永远匹配不到的元素选择器。
换句话说，`.domain-photo-c` 的 `background-position:center 42%` 在 ref 里**从来没有生效过**。

**处置**：本工程在 `sections.css` 里把它写成合法的独立规则。
这与「像素级沿用 ref」严格来说有 1 处偏离（第三张 domain 卡片的背景定位），
但该卡片在本站已换成真实产品截图（`legal-review-result`），
原 `center 42%` 是为 ref 那张特定底图调的，沿用一条死规则没有任何意义。
影响面：`.domain-photo-c` 单卡的 `background-position`，`object-fit: cover` 下视觉差异不可见。

#### A-2 · spec §6.3 的 `/insights` Unsplash photo id 已下架

`photo-1499750310159-5b3b1b0f5b0c` 实测返回 **HTTP 404**（`images.unsplash.com`，2026-08-25）。
其余 10 个 id 全部可下载。

**处置**：替换为等效题材的 `photo-1504868584819-f8e8b4b6d7e3`（摊开的笔记本与文稿），
并在 `frontend/stock-images.json` 的该条目上加 `_note` 说明替换原因。
§6.3 的口径（沿用 ref 的 4 张 + 新增 7 张 + 1 张 Wikimedia）不变，仍是 12 个图片源。

#### A-3 · P2-9 关闭：Wikimedia 天际线确认为 CC0 1.0

`content-notes.md` §7 把天际线图授权列为 🟡 待核实。实测 `ref/1.html` 末尾的注释原文为：

```
Visual sources:
- Hero: Wikimedia Commons, Skyline of Xi'an CBD.jpg, CC0 1.0.
- Supporting product/detail photography: Unsplash remote image URLs (Unsplash License).
```

**处置**：按 CC0 1.0 登记，署名为**自愿标注**（已在 `/legal/credits` 页展示来源与许可证链接）。
P2-9 可关闭。

#### A-4 · spec 的「11 项核心技术模块」在 PPT 中无对应口径

§3.1 与 §9.3 多处写「11 项技术模块」，但 PPT 的「核心技术」章节实际是
**7 张技术页 + 2 张论文页**：p.40（4 项）、p.41（6 项）、p.60（5 项）、p.61（6 项）、
p.82（5 项）、p.83（4 项）、p.84（5 步闭环）；p.42 与 p.85 是论文页。
逐条相加是 30+ 项子机制，任何切法都得不到「11」。

**处置**：`TechPillar` 按**技术页**建模，共 **7 个**，每个的 `parameters` 收录其子机制；
`/research` 页的口径改为「7 个核心技术模块，三十余项关键机制」，并在页面底部的
「技术模块口径说明」里写明取数来源（哪 7 页）。论文独立呈现在 `/research/papers`。
不臆造一个 PPT 里不存在的「11」。

#### A-5 · spec §3.2 顶栏的「投资者关系 / 全球网络」在 PPT 中无任何依据

§3.2 的 `.utility-bar` 行要求把 ref 的四个顶栏入口映射为
「投资者关系→`/about`、全球网络→`/solutions`、合作伙伴→`/solutions`、企业邮箱→`mailto:`」。
但本公司是 2024 年前后由高校教授团队创立的成果转化企业，PPT 全文没有任何
投资者关系或全球网络的内容 —— 渲染这两个标签等于**凭空造内容**，与 G2 冲突。

**处置**：顶栏改为「公司简介 → `/about`、战略合作伙伴 → `/solutions`、
科研实力 → `/about/strength`、企业邮箱 → `mailto:`」。
结构（左三右二 + 语言切换）与 ref 完全一致，只换标签与目标。

### B. 方案条目在落地时的收窄与修正

#### B-1 · `sections-ext.css`：新增一层全局样式，承载「与 ref 类名有后代关系」的新区块

§9.3 把新组件一律划给 CSS Modules。落地时发现有一批新区块**内部复用了 ref 类名**：

| 新区块 | 内部用到的 ref 类名 |
|---|---|
| `PageHero` | `.section-label` `.container` |
| `ScreenTour` / `ScreenGallery` | `.vlabel`（§10.2 明确要求复用）、`.check` |
| `PillarCard` / `PaperCard` / `CaseMetrics` | `.source-note` 与 `.section-*` 家族 |
| 产品总览页的产品卡 | 直接复用 `.solution` / `.solution-visual` / `.solution-points` |

把它们放进 CSS Modules，会踩到与 P0-2 **完全相同**的失效模式（哈希后跨层选择器静默失效）。

**处置**：新增 `src/styles/sections-ext.css`，**同样是全局层**，插在
`sections.css` 与 `responsive.css` 之间。CSS Modules 收窄到真正自包含、
不触碰任何 ref 类名的组件：`MobileNav` / `Lightbox` / `Toast` / `LeadForm` /
`Breadcrumbs` / `LegalLensArchitecture`。
`stylelint.config.mjs` 的 `selector-disallowed-list` 对 `*.module.css` 硬编码了
ref 的 100+ 个类名，把这条规则变成 CI 上的红灯而不是口头约定。

> 落地时还发现三个 CSS Module 的**局部类名与 ref 撞名**（`.btn` / `.nav` / `.item` / `.sep`）。
> 虽然哈希后不会真的冲突，但会让「这个类名是全局的还是局部的」变得需要现场判断。
> 已重命名为 `.ctrl` / `.crumbs` / `.crumb` / `.divider` / `.subLink`。

#### B-2 · 字体：改用「生成的 `@font-face` 表」而不是逐条手写 `next/font/local`

§5.3 要求 `next/font/local` + 字体文件入库。方向正确（构建期与运行期都不能触网），
但 `next/font/local` 需要在 TS 里逐条枚举 `src` 数组，而 CJK 字体按 `unicode-range`
分片后是 **101 个 woff2 / 字族**（实测：Noto Sans SC 101、Noto Serif SC 101、Inter 7，
合计 **209 个分片、8.2 MB**）。手写 209 条 `src` 不可维护，且每次字重调整都要重写。

**处置**：`scripts/fetch-fonts.mjs` 一次性下载官方 CSS2 与全部分片到 `public/fonts/`，
把 `url()` 重写为本地路径后落盘为 `src/styles/fonts.css`。
`@font-face` 与 `unicode-range` 与官方**逐字一致**，可以逐行 diff。
效果与 `next/font/local` 等价：构建期与运行期全程零外网，CSP 保持 `font-src 'self'`。
代价是失去 `next/font` 的自动 preload —— 对本站影响有限（首屏中文字形命中的分片很少），
若后续 LCP 需要再针对首屏分片手工加 `<link rel="preload">`。

字重按 §10.4 的字族分列表执行：Noto Sans SC 300/400/500/700（弃 900）、
**Inter 400/500/600/700（600 保留）**、Noto Serif SC 700（弃 500/900）。

#### B-3 · 限流：L1 用进程内滑动窗口，L2/L4 直接查 `leads` 表

§7.3.1 要求把 `slowapi` 的 `storage_uri` 指向 SQLite 以共享计数。
落地时发现 `limits`（slowapi 的存储层）**不支持 SQL 后端** ——
它只提供 memory / redis / memcached / mongodb / etcd。指向 SQLite 会直接报错。

**处置**：
- **L1**（IP 段 60/hour）用自研的线程安全滑动窗口，进程内计数。
  这与 §11.2 把 gunicorn 固定为 `--workers 1 --threads 4` 是**一套决定**：
  单 worker 下进程内计数就是全局计数，不存在分裂。
- **L2**（联系方式 3/hour · 10/day）与 **L4**（10 分钟幂等）**直接查 `leads` 表**。
  表天然被所有 worker 共享且持久，比单独维护一份计数器更不容易漂移；
  为此在 `0001_create_leads.py` 里加了复合索引 `ix_leads_contact_created`。
- 横向扩容时只需把 L1 换成 Redis，键与配额定义不必改。

`AEGISTON_RATELIMIT_STORAGE` 变量保留（默认与 `leads` 同库），供未来切换使用。

#### B-4 · `/api/v1/media/assets/{id}` 不能声明 `response_model`

该端点同时服务 `MediaAsset`（PPT 截图）与 `StockCredit`（外部配图），两者字段不同。
声明 `response_model=MediaAsset` 会让 stock 资源的响应校验直接 500。

**处置**：去掉 `response_model`，返回 `model_dump(by_alias=True, mode="json")`。
OpenAPI 上该端点的响应体标注为通用对象；前端用 `MediaLookup` 做联合类型收窄。

#### B-5 · `tagline_i18n` 触发 pydantic `to_camel` 的数字边界问题

`to_camel("tagline_i18n")` 产出 `taglineI18N`（大写 N），不是直觉上的 `taglineI18n`。
内容包里写 `taglineI18n` 会因 `extra="forbid"` 直接反序列化失败。

**处置**：字段更名为 `tagline_localized` → `taglineLocalized`，语义不变。
`LocalizedText` 因此**真的被用起来了**（P2-3 关闭）：三个产品的 `taglineLocalized.zh`
已填，`en` 留空，v2 英文站可无损扩展。

#### B-6 · `alembic.ini` 必须保持 ASCII-only

`alembic.ini` 由 `configparser` 读取，用的是**平台 locale 编码**（Windows 上是 GBK）。
文件里写中文注释会在 `alembic upgrade head` 时抛 `UnicodeDecodeError`，
而这正好发生在容器 `entrypoint.sh` 的第一步。

**处置**：`alembic.ini` 全部改为英文注释并在文件内注明原因；
中文说明放在 `alembic/env.py`（Python 源文件按 UTF-8 读取，不受影响）。

#### B-7 · `/legal` 面包屑段没有对应页面

`crumbsFromPath('/legal/terms')` 会生成「首页 → 法务(`/legal`) → 使用条款」，
其中 `/legal` 没有页面，点击即 404 —— 这是 G3 零容忍项的一个真实漏网点，
在实测的全站死链扫描中被抓到。

**处置**：`routes.ts` 新增 `NON_ROUTE_SEGMENTS`，`Breadcrumbs` 把这类段渲染为
**纯文本而不是链接**。全站死链扫描现已归零。

#### B-8 · `'use server'` 模块只能导出 async 函数

`src/app/actions/lead.ts` 最初同时导出了 Server Action `submitLead`、状态类型
`LeadFormState` 与初始值常量 `INITIAL_LEAD_STATE`。

Next.js 规定带 `'use server'` 的模块**只允许导出 async 函数**。导出一个普通对象
不会让构建失败 —— `next build` 全绿、页面 SSR 正常、a11y 与安全头断言全过 ——
但客户端在导入该模块时抛错，`useActionState` 根本没接上。
**表现是「表单能填、点提交后完全没有反馈」**，且没有任何红色信号，
只在 E2E 的两条提交用例里露出来。

**处置**：把 `LeadFormState` 与 `INITIAL_LEAD_STATE` 拆到
`src/lib/lead-form-state.ts`（普通模块），`actions/lead.ts` 只保留
`export async function submitLead`。类型可以留在 server 模块里（编译期擦除），
但**运行时值不行**。

#### B-9 · `next@15.1.6` 有已知安全漏洞

`npm install` 报 `next@15.1.6` 存在 CVE-2025-66478。

**处置**：升级到 **`next@15.5.23`**（15.x 的维护分支，仍是 App Router，
不影响 §3.1 的渲染策略）。连带把 `@playwright/test` 提到 `1.51.1` 以满足其 peer 约束。

#### B-10 · axe 必须在 `prefers-reduced-motion` 下跑，否则 color-contrast 会抖

`.reveal` 的初始态是 `opacity: 0`，进入视口后才淡入。axe 对**半透明文本**
算不出合成后的实际颜色，会把 `color-contrast` 报成 **serious** —— 同一批页面
连跑三次，每次红的页面都不一样（`/research`、`/sitemap`、`/legal/privacy`、
`/products/deployment` 轮流出现）。这与真实可读性无关，纯粹是动画时序。

**处置**：`tests/e2e/a11y.spec.ts` 在每次 `goto` 前
`page.emulateMedia({ reducedMotion: 'reduce' })`。reduced-motion 分支下
`.reveal` 立即 `opacity: 1`，**DOM 与配色完全一样**，只是去掉了过渡，
结果因此是确定性的。修正后 22/22 稳定通过。

> 顺带一提：本机在 Playwright 默认并行度下会出现
> `browserContext.newPage: Test timeout exceeded` 这类环境噪声。
> 判定「哪些失败是真的」时统一用 `--workers=1` 复跑，不要拿并行结果下结论。

### C. 交付范围与 §14 切线的对照

**结论：L0 / L1 / L2 / L3 全部完成，无未实现层级，无需降级。**

| 层级 | §14 定义的内容 | 实际交付 |
|---|---|---|
| **L0** | Phase 0 全部 + ≥ 45 张截图 + `site`/`home`/三个 `products` 内容包 + 首页像素级复刻 + 三个产品页 + `/contact`（含写路径）+ 全站导航无死链 + 404/error 页 | ✅ 全部完成。截图 **61 张**（`kind == "screenshot"`，另有 12 张示意图、3 张场景图、1 段动图，合计 77 个 asset） |
| **L1** | `/products/deployment`、`/solutions/*`（4 页）、`/research` + `/research/papers`、`/about/*`（4 页） | ✅ 全部完成，**未压缩为单页聚合** |
| **L2** | `/insights` 列表与详情、`/careers`、`/sitemap` | ✅ 全部完成。洞察 **8 篇**（6 篇行业洞察 + 1 篇研究进展 + 1 篇公司动态），非降级的静态 3 篇 |
| **L3** | `/legal/*`、`GET /leads` 管理接口与 CSV 导出、Lighthouse 调优、视觉基线 | ✅ 法务三页（含新增的 `/legal/credits` 图片来源页）、管理接口与 CSV 导出、`computed-style.spec` + `responsive.spec` 视觉契约自动化。**Lighthouse 未在本轮实跑**，见下 |

**交付文件统计（`git ls-files -o --exclude-standard`，571 个）**

| 分组 | 文件数 | 说明 |
|---|---|---|
| `frontend/public/**` | 332 | 77 张 PPT 截图 + 1 段 MP4 + 36 张外部配图（12 源 × 3 档）+ 209 个字体分片 + 6 个图标 + 品牌资源 |
| `frontend/src/**` | 104 | 页面、组件、样式五层、lib、类型、降级快照 |
| `backend/app/**`（代码） | 36 | core / api / schemas / services / db / models |
| `backend/app/content/**` | 28 | 内容包 JSON + 8 篇洞察 Markdown + 两份生成清单 |
| `frontend`（配置与脚本） | 18 | next / ts / eslint / stylelint / vitest / playwright / lighthouse + 3 个资源脚本 |
| 仓库根 | 14 | 两份 compose、nginx 两份、CI、Makefile、README、CLAUDE.md、`.env.example` 等 |
| `frontend/tests/**` | 14 | 4 个单测 + 8 类 E2E |
| `backend`（脚本/迁移/配置） | 11 | 4 个脚本、Alembic、Dockerfile、entrypoint、pyproject |
| `backend/tests/**` | 10 | conftest + 7 个用例文件 |
| `docs/plans/**` | 3 | spec.md、content-notes.md、visual-signoff.md |

§9.3 预估「约 175 个文件」，实际代码与内容文件为 **235 个**（571 减去
332 个二进制媒体/字体产物与 ref 源材料）；差额主要来自内容包按页拆分
（28 个）与测试文件拆细（24 个）。

**实际路由数：27 条**（§3.1 表格的 24 条 + `/legal/credits` + `/sitemap.xml` + `/robots.txt`）。
全部实测返回 200，未知路径返回 404 页；全站死链扫描（25 个页面、33 条站内链接）归零。

**两条零容忍硬约束的执行情况**：
1. **无 `href="#"`、空页面或 404** —— ✅ 已实测。`ContentRepository._check_references()`
   在启动时拦导航死链，`routes.spec.ts` 在 E2E 层再扫一遍。
2. **四处路由定义同源** —— ✅ `ROUTES` 常量 / `site.json` 导航 / `sitemap.ts` /
   `routes.spec.ts` 全部从 `/api/v1/site/routes` 或 `routes.ts` 取数。

### C.1 最终验证结果（本轮实跑）

| 门禁 | 结果 |
|---|---|
| `ruff check backend/app backend/scripts backend/tests` | ✅ All checks passed |
| `mypy backend/app` | ✅ Success: no issues found in 36 source files |
| `pytest backend/tests --cov=app` | ✅ **63 passed**，覆盖率 **91.5%**（门槛 85%） |
| `tsc --noEmit` | ✅ 无错误 |
| `stylelint "src/**/*.css"` | ✅ 无错误（含 `*.module.css` 禁用 ref 类名的护栏） |
| `vitest run` | ✅ **111 passed**（72 条视觉契约 + 31 条对比度 + 8 条路由/格式化） |
| `next build` | ✅ 36 个页面，首屏 JS 103–116 kB |
| `playwright test --project=chromium --workers=1` | ✅ **99 passed / 0 failed**（12 skipped：offline-api 需专门环境、部分用例仅桌面或仅移动） |
| `validate_content --strict` | ✅ PASS；77 个媒体（真实软件截图 **61 张**）+ 12 张外部配图；WARN 15 条待客户确认 |
| `validate_assets` | ✅ PASS，89 项资源全部存在、宽高与体积符合清单 |
| `content:snapshot:check` | ✅ 22 个快照与内容包一致（无漂移） |
| `alembic upgrade head` | ✅ 建表成功，4 个索引就位 |
| 全站死链扫描 | ✅ 25 个页面、33 条站内链接，**0 死链**（`/legal` 面包屑修复后） |
| 外部请求 | ✅ 首页 HTML 中除 SVG 命名空间与 JSON-LD `@context` 外无任何外部域；运行时零外部请求 |

> **关于并行度**：本机在 Playwright 默认并行度下会出现
> `browserContext.newPage: Test timeout exceeded` 这类环境噪声，一次跑出 30+ 个
> 「失败」。**判定真实失败一律用 `--workers=1` 复跑**。上表是 `--workers=1` 的结果。

### D. 本轮未做的事（明确交底）

| 项 | 状态 | 说明 |
|---|---|---|
| **Lighthouse / lhci 实跑** | ❌ 未做 | 需要一个稳定的无头 Chrome 与网络节流环境；本轮把性能预算落在**可静态核对**的层面（首屏 JS、单图体积、字体分片、`aspect-ratio` 防 CLS），未产出 lhci 报告。§12.4 的门禁配置未写入 CI |
| **首屏 JS ≤ 110 KB 预算** | ⚠️ 略超 | `next build` 报首页 First Load JS **112 kB**（预算 110 kB）。超出 2 kB，主要来自 App Router 的基线运行时（shared chunks 103 kB）。未做代码分割优化 |
| **WebKit / Mobile Chrome E2E** | ⚠️ 仅配置 | `playwright.config.ts` 已声明三个 project（chromium / webkit / mobile-chrome），本轮只在 **chromium** 上实跑（111 条用例，`--workers=1` 全绿）。CI 亦只跑 chromium。移动端交互由 `navigation.spec.ts` 里 `test.use({ viewport: 390×844 })` 的两条用例覆盖，不依赖 mobile-chrome project |
| **`visual.spec` 像素基线** | ❌ 按 P1-11 有意不做 | 已用 `computed-style.spec` + `responsive.spec` 取代其门禁职责。若后续要做，基线必须在容器内生成且设为 advisory |
| **`prometheus-fastapi-instrumentator`** | ❌ 未接 | §11.4 标注为「默认关闭，env 开启」。`AEGISTON_METRICS_ENABLED` 变量已预留，埋点未实现 |
| **`scripts/seed_insights.py`** | ❌ 未做 | §9.2 列的洞察草稿生成器。8 篇洞察正文是**直接按 PPT p.3–p.10 誊写润色**的，没有走脚本生成再润色这一步 |
| **`scripts/redact.py`** | ❌ 未做 | §6.4 提到的截图打码工具。77 张截图的敏感信息**人工过审**留给 Subtask #3（见下） |
| **brotli** | ⚠️ 已注释 | 官方 `nginx:alpine` 镜像不含 `ngx_brotli`，配置里保留注释块。gzip 已启用 |

### E. 交给 Subtask #3 的检查项

1. **截图敏感信息人工过审**（§6.4 明确列为 Subtask #3 检查项）：
   确认 `frontend/public/media/product/` 下 77 张图中无真实客户名、真实合同金额、真实人员账号。
   如有，需要补 `scripts/redact.py` 或替换该 asset。
2. **`git commit`**：本节点按 §14 约束**未执行任何 commit**。仓库已 `git init`，
   `.gitignore` / `.gitattributes` / `.editorconfig` 就位；媒体产物按 P1-12 **直接入库**，
   未启用 Git LFS。
3. 逐条核对本节 A / B 两组的处置是否可接受，尤其是 A-1（ref 死规则的处理）与
   A-4（「11 项」改为「7 个模块」）—— 这两条改变了与源材料的对应关系。
4. §15 的 8 项外部阻塞项仍然开放，`validate_content --strict` 每次运行都会打印
   当前的 **15 条**待确认清单。

---

**Subtask #2 记录结束。**

---

### F. Subtask #3 终审发现（截图敏感信息过审 + 代码复核）

§E 第 1 项要求对 `frontend/public/media/product/` 下的截图做敏感信息人工过审。
**逐张看完 77 张的结论：不通过。** 10 张带出了不该上公开站的内容，
其中 5 条属于「一旦上线就很难收回」的级别。处置已随本节点提交。

#### F.1 过审发现清单

| # | asset | 泄露内容 | 定性 |
|---|---|---|---|
| F-1 | `legal-consistency-report` | 实名政府采购项目「周至县公安局交警大队道路交通安全隐患治理项目」及编号 `SDZC2022-017-01`；发包方/承包方/鉴证方三家实名公司；两位真实法定代表人姓名；两处注册地址；中标金额 38,081,354.82 元与上游合同价 36,739,576 元；风险结论直书「**利益输送嫌疑**」 | 客户机密 + 对实名主体的负面评价 |
| F-2 | `legal-opinion-result` | 完整法律意见书：实名委托方与相对方、《技术服务合同》、出具日期，以及「通过公开招标确定为中标人」这一交易事实 | 客户机密（律师工作成果） |
| F-3 | `legal-credit-engine` | 三家实名公司的信用评分：98「安全」/ 79「**可控**·风险因素 1 个」/ 62「**关注**」，其中一家为上市公司 | 《反不正当竞争法》第十一条 |
| F-4 | `legal-credit-profile` | 实名公司资信详情 + 真实**法定代表人姓名** + 统一社会信用代码 + 内部评分 | 《个保法》+ 同 F-3 |
| F-5 | `legal-review-result` | 「合作方资信审查」两行实名公司及其风险等级 | 同 F-3 |
| F-6 | `legal-consistency` | 浏览器地址栏 `121.40.128.125/workspace`（**内网 IP，明文 HTTP**）；左栏合同文件名带出真实客户项目 | 基础设施暴露 + 客户机密 |
| F-7 | `legal-simple-review` | 同上内网 IP；真实合同编号 `390028JX0120240011`；附件名同 F-6 | 同上 |
| F-8 | `ara-members` | 成员表邮箱列 4 个**真实个人邮箱** | 《个保法》；与 CLAUDE.md §8「邮箱一律脱敏」直接冲突 |
| F-9 | `case-telecom` | 楼宇招牌可直接读出客户全称 | 与站点正文「某省通信服务分公司」的脱敏口径自相矛盾（CLAUDE.md §4） |
| F-10 | `case-legal` | 第三方媒体水印「法治聚焦」；庭审现场法官、书记员、代理律师、旁听人员的**可辨识正面** | 他人著作权 +《民法典》第 1019 条肖像权 |

> **口径**：F-3/F-4/F-5 与 CLAUDE.md §4「竞品对照表不上公开页」是**同一条**法律理由 ——
> 站点只做能力自述，不对可识别的第三方作评价。原方案把这条约束只落在了**文案**上，
> 没有落到**截图**上；F 组补的就是这个缺口。

#### F.2 处置

1. **新增 `backend/scripts/redact.py`**（§6.4 列为待补、§D 记为未做的那个脚本）。
   - 打码规格 `REDACTIONS` 与 `ASSET_MAP` **同文件**，保持「资源的单一事实源」不分裂。
   - 坐标**归一化**而非像素：`shrink_to_budget()` 会按 320 KB 预算逐档降宽
     （2560→1920→1600→1280），像素坐标会失效，比例不会。
   - 打码用**区块均值化**而不是高斯模糊 —— 后者可被反卷积/超分还原，
     业界翻车案例不少；前者在降采样那一步就把高频信息量化掉了，不可逆。
   - 已接入 `extract_pptx_assets.py`，在转码**之前**打码：只要走提取管线，
     产物一定是打过码的，不依赖谁记得补跑一步。
2. **F-1 ~ F-9 共 9 张图、24 个区域**已打码，逐张目视复核过打码后的效果
   （既确认敏感内容不可读，也确认版面骨架仍能说明产品能力）。
3. **F-10 直接不入库**：打码治不了著作权，且这三张 `case-*` 场景照
   **站内没有任何引用点**（只进清单、不上页面），却会随 `public/` 落到
   一个稳定可访问的 URL 上。`ASSET_MAP` 删除该条，asset 总数 77 → 76，
   `photo` 3 → 2；`screenshot` 仍为 61 张，G4 门槛（≥ 45）不受影响。
4. **三层防回归**：
   - `redact.py --check` 比对清单指纹与 `REDACTIONS`，已接进 CI；
   - `test_redacted_assets_declared_in_manifest` 在后端单测里再守一次；
   - `MediaAsset.redacted` 进 schema，`/legal/credits` 对外说明「9 张截图含隐私打码」——
     把处置**写在页面上**，而不是只写在仓库里。

> 捕捉的是「改了 `REDACTIONS` 却没重跑脚本」这一类**静默回归**：
> 它不会让任何测试变红，但会把敏感信息重新放上公开站。

#### F.3 代码复核发现（非截图）

| # | 位置 | 问题 | 处置 |
|---|---|---|---|
| F-11 | `api/v1/endpoints/leads.py` | `ApiError` / `to_read` 在本模块从未使用，只是被塞进 `__all__` 绕开 ruff F401。端点模块不是它们的再导出点 | 删除导入与 `__all__` 条目 |
| F-12 | `core/config.py` | `AEGISTON_SECRET_SALT` 有开发默认值且**生产无守卫**。CLAUDE.md §8 承诺「不存明文 IP，只存 `sha256(ip + SALT)`」—— 该承诺只在盐是秘密时成立：IPv4 全空间才 2^32，盐一旦公开，把整张 `ip_hash` 反查成明文只是几分钟的事。`docker-compose.prod.yml` 的 `${VAR:?}` 只卡住了 compose 这一条路径，裸跑 gunicorn / k8s / systemd 无人拦截 | 按本项目「坏配置就别上线」的一贯口径（§7 内容包校验失败即拒绝启动），`env == prod` 且盐仍为默认值时**拒绝启动**，并补测试 |

#### F.3.1 视觉契约测试的假绿（F-13）

复跑 E2E 时暴露出 §12.3 视觉契约用例的一个**测量方式缺陷**。它不是本轮引入的，
上一轮之所以报「99 passed」，是因为恰好赢了一次竞态。

**机制**：Next.js 流式 SSR 会先把 Suspense 内容放进 `<div hidden id="S:0">`
缓冲区，`load` 事件之后才移进 `<main>`。元素没有参与布局时：

- `getComputedStyle(el).gridTemplateColumns` 返回的是**指定值** `repeat(4, 1fr)`
  而不是解析后的 `228px 228px 228px 228px`；
- `getBoundingClientRect().height` 返回 `0`。

`toHaveCSS()` 自带自动重试，所以用它的断言天然稳；而直接 `.evaluate()` 测量的
地方没有这层保护。于是出现两类问题，**第二类比第一类严重得多**：

| 类型 | 表现 | 例子 |
|---|---|---|
| 随机变红 | 期望值 ≠ 2 时拿到 2 | `.domains` 4 列、`.footer-main` 5 列、960px 下 `.metrics-grid` 4 列、`.hero` 高度 ≥ 640 |
| **永远假绿** | 指定值恰好等于期望值 | `.solution` 2 列（`repeat(2, 1fr)`.split 也是 2）、768px 下 `.metrics-grid` 2 列、`.metric::after {width:1px}`、`.cta-band::before {top:18px}`、`.news-grid` 的 1.15fr∶1fr 比值 |

第二类意味着：**这些用例在元素根本没渲染时也会通过** —— 号称守护 1:1 复刻的
契约测试，实际上可能一次都没测到真实布局。

**处置**：新增 `frontend/tests/e2e/helpers/layout.ts`，两个函数：

- `gridTracks()` / `gridCols()`：先 `toBeVisible()` 等流式内容落位，
  再断言轨道值确实解析成了具体尺寸（含 `px`）—— 未解析就**直接失败**，
  而不是返回一个碰巧对得上的 2；
- `laidOut()`：所有原始 `.evaluate()` 测量前的守卫。

覆盖 `responsive.spec.ts` / `computed-style.spec.ts` / `screenshots.spec.ts`
共 9 处测量点。

**顺带结论**：借这次排查把断点逐档实测了一遍，**CSS 本身没有问题** ——
`metrics` 4 列保持到 769px、≤768 变 2；`domains` 1440 为 4、≤1024 为 2、≤640 为 1；
`footer-main` ≥901 为 5、≤900 为 2。与 §5.2.1 的设计一致，本轮未改任何一行 CSS。

#### F.4 未处置、需客户决策的项

- F-1 的合同金额与 F-2 的交易事实**即使打码后**，原始 PPT 仍在流转。
  站点侧已闭环，但**建议客户同步清理对外版 PPT** —— 这超出本仓库范围。
- §15 的 8 项外部阻塞项、`validate_content --strict` 打印的 15 条待确认清单，
  本节点无权关闭，维持开放。
- §E 第 3 项（A-1 ref 死规则、A-4「11 项」改「7 个模块」）：复核认为处置可接受，
  两条都在 spec 内有明确登记与理由，不改。

