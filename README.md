# 智瞳安宇 Aegiston 官网

> 「AI+」企业智能化赋能与安全保障专家 —— 组织级 **AragonTeam**、通用级 **InkClaw**、
> 行业级 **LegalLens 合约智审**，三层产品构成同一套企业智能底座。

生产级多页站点。视觉与栅格 1:1 沿用 `ref/1.html`；全部内容与 **77 张真实产品截图**
来自 `ref/智瞳安宇-总体产品介绍-V7.pptx`，每个内容块都标注了 PPT 页码。

- **前端**：Next.js 15 App Router + React 19 + TypeScript 5（ISR + 静态快照兜底）
- **后端**：FastAPI + Pydantic v2 + SQLModel（内容常驻内存，数据库只有 `leads` 一张表）
- **交付**：Docker Compose（nginx + web + api），私有化 / 内网可跑，**运行期零外部依赖**

---

## 目录结构

```
aegiston/
├── backend/                 FastAPI 内容与线索 API
│   ├── app/
│   │   ├── api/v1/          端点（静态路径段必须注册在动态段之前）
│   │   ├── core/            配置 / 日志 / 错误 / 安全 / 限流 / 缓存
│   │   ├── content/         内容包（JSON + Markdown，受 Pydantic 校验）
│   │   ├── schemas/         Pydantic 模型 —— **内容契约的单一事实源**
│   │   └── services/        ContentRepository / insights / leads
│   ├── scripts/             PPT 提取、内容校验、资源校验
│   └── tests/               62 个用例，覆盖率 91.5%（门槛 85%）
├── frontend/                Next.js 站点
│   ├── src/styles/          四层全局样式（顺序即层叠顺序）
│   ├── src/content/snapshot/降级快照（入库，勿手改）
│   ├── public/media/        77 张 PPT 截图 + 12 张外部配图（已本地化）
│   ├── public/fonts/        209 个 woff2 分片（自托管，零外网）
│   └── tests/               111 个单测 + 8 类 E2E
├── nginx/                   反向代理与安全响应头
├── docs/plans/…/spec.md     设计方案（v2，已评审）
├── docker-compose.yml       开发编排
└── docker-compose.prod.yml  生产编排
```

---

## 本地启动

> 全部命令**单行**，Windows / macOS / Linux 通用。`Makefile` 只是 Linux/CI 的便利层。

### 1. 装依赖

```
python -m pip install -e "backend[dev,assets]"
npm --prefix frontend ci
```

### 2. 起后端（终端 A）

```
cd backend
python -m uvicorn app.main:app --reload --port 8000
```

访问 <http://localhost:8000/docs> 查看接口。启动日志会打出 `contentHash`、截图数量与待确认项数量。

### 3. 起前端（终端 B）

```
npm --prefix frontend run dev
```

访问 <http://localhost:3000>。

---

## 资源与内容管线

这些脚本产出的文件**已经入库**，只有在 PPT / 图片清单变更时才需要重跑。

| 命令 | 作用 |
|---|---|
| `python -m backend.scripts.extract_pptx_assets --pptx "ref/智瞳安宇-总体产品介绍-V7.pptx" --out-images frontend/public/media/product --out-manifest backend/app/content/media_manifest.json` | 从 PPT 提取 77 张截图 → WebP，生成媒体清单。`--dry-run` 只校验映射 |
| `npm --prefix frontend run assets:stock` | 下载 12 张 Unsplash / Wikimedia 配图并转 WebP（1920/1280/768 三档），生成署名清单 |
| `npm --prefix frontend run fonts:fetch` | 一次性下载字体分片到 `public/fonts/` 并生成 `src/styles/fonts.css` |
| `python -m backend.scripts.validate_content --content-dir backend/app/content --strict` | 内容包校验（schema + 引用完整性 + 死链 + 合规约束），CI 门禁 |
| `python -m backend.scripts.validate_assets` | 磁盘级资源校验（文件存在、宽高一致、体积达标），**CI 专用** |
| `npm --prefix frontend run content:snapshot` | 生成降级快照（需 API 已在 8000 端口运行） |
| `npm --prefix frontend run content:snapshot:check` | 快照漂移检查：内容包改了但没重新生成快照 → 失败 |
| `npm --prefix frontend run gen:types` | 由 OpenAPI 生成 `src/types/api.d.ts` |

**GIF 特殊处理**：`image64.GIF`（25 MB 需求看板动图）在构建期由 ffmpeg 转为
`ara-requirements-kanban.mp4`（188 KB）+ WebP 首帧海报，页面用
`<video autoplay muted loop playsinline poster>`。无 ffmpeg 时自动退化为静态首帧，日志会说明走了哪条路径。

**EMF 架构图**：PPT p.65 的 `image94.emf` 不做光栅化，改用 React + 内联 SVG 重绘
（`LegalLensArchitecture`），以获得响应式、可主题化与无障碍支持。

---

## 测试

```
cd backend && python -m pytest tests -q --cov=app
npm --prefix frontend run test
npm --prefix frontend run e2e
```

| 层 | 内容 |
|---|---|
| 后端 pytest | 健康探针、内容完整性、路由遮蔽回归、分层限流、脱敏、CSV 导出 |
| 前端 vitest | **视觉契约锚点**（ref 的 60 条跨元素选择器逐条断言）、§5.2 度量、对比度、路由常量 |
| Playwright | 路由完整性、导航（含键盘与移动抽屉）、计算样式契约、响应式六档、截图与灯箱、表单、a11y（axe 零 serious）、安全响应头、离线降级 |

### 关键回归说明

- **`test_static_route_precedence`** — FastAPI 按声明顺序匹配路径。若
  `/products/{slug}` 写在 `/products/deployment` 之前，后者会落进 `{slug}` 处理器返回 404，
  前端交付形态页随即取不到数据。这条测试守住注册顺序。
- **`tests/unit/styles.spec.ts`** — 断言 ref 的跨元素后代选择器逐条存在于全局层。
  这是视觉契约在 CI 上**唯一可自动化的锚点**（像素比对在 CJK 字体 + 跨平台渲染下必然抖动）。
- **`cold-start-without-api`** — 在 API **从未启动**的情况下拉起前端，断言全站仍返回 200。
  这才是「后端挂了官网仍可访问」真正对应的场景。

---

## 部署

### 开发编排

```
docker compose up -d --build
```

### 生产编排

```
cp .env.example .env
docker compose -f docker-compose.prod.yml up -d --build
```

`.env` 中**必须替换**：

- `AEGISTON_ADMIN_TOKEN` —— ≥ 32 字符随机串，线索管理接口的令牌
- `AEGISTON_SECRET_SALT` —— IP 与联系方式 hash 的盐，泄露会让脱敏失效
- `NEXT_PUBLIC_SITE_URL` —— 站点绝对 URL，用于 canonical / OpenGraph / sitemap
- `AEGISTON_CORS_ORIGINS` —— 允许的前端来源

### 编排上的两个关键决定

1. **`depends_on` 用 `service_started`，不用 `service_healthy`。**
   内容包校验失败会让 api 拒绝启动；如果 web 依赖 api 健康，一个 `mediaId` 拼错就会导致
   **整站白屏**，快照兜底一次都用不上。api 的 healthcheck 保留，作用是给运维看。
2. **gunicorn 固定单 worker（`--workers 1 --threads 4`）。**
   官网 QPS 极低，单 worker 完全够用，同时天然消除限流计数器分裂与 SQLite 写竞争。

### 镜像构建

前后端 Dockerfile 均走国内源（npmmirror / 清华 PyPI）。
构建期**不访问任何外部资源**：字体、图片、降级快照都已入库，隔离网内 `docker build` 可直接跑通。

---

## 安全

- CSP 做到 `default-src 'self'`，**无任何外部域白名单** —— 全部图片与字体已本地化。
- nginx 与 `next.config.mjs` 的安全响应头**逐字一致**，
  `tests/e2e/security-headers.spec.ts` 对全部 25 条路由断言。
- v1 明确选择 `'unsafe-inline'` 而不是 nonce：CSP Level 2+ 规定一旦出现 nonce 就忽略同一
  指令里的 `'unsafe-inline'`；而 Next.js 的 nonce 必须由 middleware 逐请求下发，
  读取 nonce 的页面会被强制转为动态渲染，直接推翻 ISR + Full Route Cache。
  本站没有用户输入回显、没有富文本渲染（洞察正文经 bleach 白名单净化）、没有第三方脚本。
- 线索表单四层反滥用：honeypot 静默 202 → IP 段 60/hour → 10 分钟幂等 → 联系方式 3/hour · 10/day。
  429 时页面**同时**展示商务邮箱与电话，不让用户走进死路。

---

## 上线前待关闭项

以下条目依赖客户与法务输入，已在 `site.json` 的 `pendingConfirmation` 与各行业案例中登记，
`validate_content --strict` 每次都会打印：

1. ICP 备案号（为空时页脚不渲染该行）
2. 商务电话、真实商务与招聘邮箱、公司注册详址
3. `/legal/terms` 与 `/legal/privacy` 的正式文本（当前为通用草案）
4. 中通服 / 交控 / 律所案例的**数据口径**（PPT p.84 与 p.95–p.97 有 2–3 倍差异）
5. 客户具名的公开引用授权
6. 洞察文章的真实发布日期与作者署名（当前统一取 PPT V7 的成文月份 2026 年 8 月）

详见 `docs/plans/aegiston-corporate-site/content-notes.md` 与 `spec.md` §15。
