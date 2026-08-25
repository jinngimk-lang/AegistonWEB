# 智瞳安宇 Aegiston 官网 · 运维手册（Runbook）

> 面向**值班运维**，不是面向开发。每一节都以「你看到什么现象」开头，
> 以「你该敲哪条命令」结束。命令一律写成**单行**，Windows / macOS / Linux 通用
> （CLAUDE.md §10）。

| 项 | 值 |
|---|---|
| 适用版本 | 站点 v3 |
| 拓扑 | nginx → web（Next.js `next start`）+ api（FastAPI / uvicorn），内容包常驻 api 内存 |
| 唯一写路径 | `POST /api/v1/leads` → SQLite `leads` 表 |
| 关键承诺 | **api 挂了站点仍然 200**（走构建期落盘的静态快照） |

---

## 0. 五分钟自检

```
curl -sf http://<host>/api/v1/health/ready
curl -sf -o /dev/null -w "%{http_code}\n" http://<host>/
curl -sf -o /dev/null -w "%{http_code}\n" http://<host>/search?q=%E5%90%88%E7%BA%A6
```

三条都 200 就没事。第三条是 v3 新增的：它同时验证了「检索可用」与
「检索不依赖 api」——**检索索引是构建期产物，运行期不打后端**。

---

## 1. 内容包发布与回滚

内容包（`backend/app/content/**`）随代码入库，**没有单独的发布通道**。
发布 = 重新构建镜像 = 一次常规上线。

### 判断线上跑的是哪一版

```
curl -s http://<host>/api/v1/health | python -m json.tool
```

看 `contentHash`（16 位十六进制）。它是内容包全部 `.json` / `.md` 的
sha256 前 16 位；内容改一个字它就变。

指标开启时也可以看：

```
curl -s http://<internal-api>:8000/metrics | grep aegiston_content_info
```

### 回滚

回滚镜像即可。**不要**只回滚内容包而保留新代码 —— 内容包 schema 与代码是
同一次提交里的两半，分开回滚会让 api 在启动时 `ContentError` 拒绝启动
（这是设计如此：不带着坏内容上线）。

### 内容改了但页面没变

按下面的顺序排查，**顺序不能反**：

1. `contentHash` 变了吗？没变 → 镜像没换，重新部署。
2. 变了但页面还是旧的 → ISR 缓存未过期。各路由的 `revalidate` 见页面文件
   顶部（5 分钟到 1 小时不等）。要立刻生效就重启 web 容器。
3. 页面对了但**检索结果**还是旧的 → 见 §2。

---

## 2. 检索索引

### 它是怎么来的

```
CI 构建期：api 起来 → npm run content:snapshot
    GET /api/v1/search/index
    ├─► frontend/src/content/snapshot/search-index.json   （/search 页 SSR 用，静态 import）
    └─► frontend/public/search-index.json                 （⌘K 面板 fetch 用）
```

两份文件**逐字节相同**，`content:snapshot:check` 在 CI 里守这条。

### 浏览器为什么不会拿到陈旧索引

面板请求的 URL 是 `/search-index.json?v=<contentHash>`，配 `cache: 'force-cache'`。
`force-cache` 的语义是「命中即用，不管新鲜与否」—— **只有带版本位才安全**：
`contentHash` 一变就是一个新的缓存键。

⚠️ **绝不能**把 `/search-index.json` 并进 nginx 里
`location ~* ^/(media|fonts|brand)/` 那条 `immutable` 规则。
后果不是「结果旧一点」：洞察下线、路由调整之后，旧索引里的 `href` 就是**死链**，
而零死链是本项目的零容忍项。`frontend/tests/unit/nginx-config.spec.ts` 守着这条。

### 检索结果里出现了 404 链接

1. 确认 `contentHash` 与页面上的一致（面板的请求 URL 上就带着）；
2. 让用户强刷（`Ctrl+F5`）；
3. 如果强刷仍复现 → 说明索引本身有死链，**这是构建期就该拦住的**：
   `python -m backend.scripts.validate_content --content-dir backend/app/content`
   会逐条比对 `SearchDoc.href` 与路由清单。回滚并修内容包。

---

## 3. 备份与恢复

### 备份

```
python -m backend.scripts.backup_leads --out backups/ --keep 14
```

- 用 SQLite 的 `VACUUM INTO`：事务内生成一份紧凑、一致的副本，**无需停写**。
  不要用 `cp` —— WAL 模式下 `.db` 与 `-wal` 会不一致，拿回来的备份看着有文件、
  真去恢复才发现打不开。
- 产物 `backups/leads-<UTC>.db` + 同名 `.sha256`。
- 保留策略：`--keep N` 按修改时间保留最近 N 份，**下限 3**。
  删除**发生在新备份通过完整性校验之后**，且会把将删列表打印出来。

⚠️ **备份文件绝不进仓库**（`.gitignore` 里有 `backups/`）：它含
`ip_hash` / `contact_hash`，属于个人信息保护的范围。

### 校验

```
python -m backend.scripts.backup_leads --check backups/leads-20260825T030000Z.db
```

做三件事：`PRAGMA integrity_check`、`leads` 行数、与 `.sha256` 比对。

### 恢复

1. 停 api（避免写入竞争）；
2. 备份**当前**库（哪怕它是坏的，也别直接覆盖）；
3. 把备份文件复制到 `AEGISTON_DATABASE_URL` 指向的路径；
4. `--check` 一遍；
5. 起 api，`curl /api/v1/health/ready`。

### 建议节奏

每天一次 + 每次上线前一次。`--keep 14` 覆盖两周。

---

## 4. 指标与告警

**默认关闭。** 开启方式：`AEGISTON_METRICS_ENABLED=true`，指标挂在 `/metrics`
（**不在 `/api/v1` 前缀下**）。

nginx 侧 `location = /metrics { deny all; }` —— 公网 403；
内网 Prometheus **直连 api 容器** `:8000/metrics` 抓取，不经过 nginx。

| 指标 | 类型 | 看什么 |
|---|---|---|
| `aegiston_http_requests_total{route,method,status}` | Counter | `route` 是**路由模板**（`/api/v1/products/{slug}`），不是真实 path。5xx 比例是首要告警项 |
| `aegiston_http_request_duration_seconds{route,method}` | Histogram | p95 > 500 ms 就该看了；内容端点读内存，正常在个位数毫秒 |
| `aegiston_leads_total{outcome}` | Counter | `accepted` / `honeypot` / `ratelimited` / `invalid`。`invalid` 突然升高通常是前端表单改坏了 |
| `aegiston_ratelimit_rejected_total{layer}` | Counter | `ip` / `contact_hour` / `contact_day` / `idempotency` 四层各自的拒绝数 |
| `aegiston_content_info{content_hash,version,screenshots}` | Gauge=1 | 确认线上跑的是哪一版内容包 |

**建议阈值**（按官网真实量级，不是通用值）：

- 5 分钟内 5xx > 5 次 → 告警
- `aegiston_leads_total{outcome="ratelimited"}` 1 小时内 > 20 → 人工看一眼是不是被刷
- `aegiston_content_info` 的 `content_hash` 与预期发布版本不一致 → 告警

---

## 5. 429 激增怎么办

### ⚠️ 先分清是哪一层拒的

有**两层**限流，它们在完全不同的地方留痕：

| 层 | 谁拒的 | 去哪儿看 |
|---|---|---|
| nginx `limit_req`（`/api/` 公网直连） | nginx | **nginx 的 `access_log`（`$status` = 429）与 `error_log` 里的 `limiting requests` 行** |
| 应用四层配额（`/api/v1/leads`） | FastAPI | `aegiston_ratelimit_rejected_total{layer}` + 结构化日志 `lead_ratelimit` |

**被 nginx 拒掉的请求根本没有到达 FastAPI**，所以在
`aegiston_http_requests_total` 里是**找不到**它们的。这一点每次排查都会有人踩，
所以单独写在这里。

### 处置

1. 先看 nginx `error_log`：
   `grep "limiting requests" /var/log/nginx/error.log | tail -50`
2. 如果是单一 IP 刷 → 在防火墙或 nginx 上封它，不要动 zone 参数。
3. 如果是正常流量涨了 → 调 `nginx/aegiston.conf` 的
   `limit_req_zone ... rate=10r/s`，改完 `nginx -t && nginx -s reload`。
4. **不要**为了「让告警安静」把 `limit_req_status` 改回默认的 503：
   429 配着一个给出商务邮箱的 JSON 兜底页（`/429.json`），
   而裸的 503 错误页会把用户送进死路。
   （兜底页里**没有电话**：内容包 `site.json` 的 `contact.phone` 是 null，
   公司尚未公开商务电话。等它确认后，`/429.json` 与 `LeadForm.tsx` 一起补。
   在此之前**不要**为了凑齐字段填一个空的 `"phone":""` —— 门禁会变绿，
   用户拿到的仍是死路。）

---

## 6. 「api 挂了但站点仍然 200」的确认步骤

这是本项目最重要的一条降级承诺，值班时要能**主动确认**它还成立，
而不是等它失效那天才发现。

```
docker compose stop api
curl -sf -o /dev/null -w "%{http_code}\n" http://<host>/
curl -sf -o /dev/null -w "%{http_code}\n" http://<host>/products/legallens
curl -sf -o /dev/null -w "%{http_code}\n" http://<host>/search?q=%E6%B3%95%E5%BE%8B
docker compose start api
```

三条都应该是 200：

- 页面走 `src/content/snapshot/*.json` 的静态快照；
- 检索走 `public/search-index.json`，本来就不打后端。

web 的容器日志里会出现
`[api] /api/v1/... 不可达，已降级到快照 contentHash=... generatedAt=...`。
**看到这行是正常的**，它证明降级路径在工作。
如果同时还出现「快照已陈旧 N 天」，说明 CI 很久没重新生成快照了，去修流水线。

⚠️ `depends_on` 用的是 `service_started` 而不是 `service_healthy`：
否则内容包里一个 `mediaId` 拼错 → api 永不健康 → web 从不启动 → **整站白屏**，
精心设计的快照兜底一次都用不上。api 的 healthcheck 保留，但它是**给运维看的**，
不是卡住依赖链的。

---

## 7. 前端构建产物的两个坑

### 7.1 Windows 上 `.next` 删不干净

`next start` 在跑的时候删 `.next`，Windows 会因为文件锁**静默留下一部分**旧文件。
随后的构建写进这个半干净的目录，结果是**页面 HTML 引用了已经不存在的 CSS chunk**
—— 表现为整站**完全没有样式**，而构建是成功的、没有任何报错。

正确顺序：**先停服务，再删目录，再构建**。

```
npm --prefix frontend run build
```
之前先确认 3000 端口没有进程在监听。

### 7.2 `next build` 的 fetch 缓存会跨构建复用

`.next/cache` 里的 fetch 缓存会在下一次构建里被复用。内容包改了 schema
（比如 v3 给洞察加了 `toc` / `related`）而缓存里还是旧响应时，
构建会以 `Cannot read properties of undefined` 这类**看起来毫不相关**的错误失败。

处置：删 `.next` 重新构建（同样先停服务）。

---

## 8. 上线核对清单

自动化测不到、必须人工确认的几条：

- [ ] `nginx -t` 通过，且 `nginx/aegiston-common.inc` 里
      `location = /metrics { deny all; }` 与 `limit_req_status 429;` 都在
      （`frontend/tests/unit/nginx-config.spec.ts` 只能证明**仓库里**写对了，
      证明不了**这台机器上部署的**是这一份）
- [ ] `curl -I https://<host>/metrics` 返回 403
- [ ] `curl -I https://<host>/search-index.json` 的 `Cache-Control` **不含** `immutable`
- [ ] 洞察详情页目视确认：宽屏下目录在正文**右侧**，点击后标题不被顶栏遮挡
      （这条自动化测不出位置对不对，必须人看）
- [ ] `AEGISTON_SECRET_SALT` 不是开发默认值（是的话 api 会直接拒绝启动，但确认一下更快）
- [ ] ICP 备案号：填了就渲染，没填就**不渲染那一行**，不留占位符

---

## 9. 编辑约定（给内容维护者）

- **洞察正文发布后不要重排小节顺序**：目录锚点是 `sec-1` / `sec-2` 这样的序号，
  重排会让已经分享出去的深链定位到别的小节。改标题文字没问题（目录展示的是原文），
  插入或删除小节才有影响。
- **能力矩阵每行的 `sourceSlides` 必填**，且会**渲染在页面上**。
  凑不出 PPT 依据的能力不要上表。
- **改了 `og-map.json` 必须重跑** `npm --prefix frontend run og:gen`，
  否则 `og:check` 会红（它专门比对映射表与清单的 key 集合）。
- **改了 `fonts.css` 或首屏文案必须重跑** `npm --prefix frontend run fonts:preload`，
  否则关键路径上的 CSS 会悄悄变回整表。
