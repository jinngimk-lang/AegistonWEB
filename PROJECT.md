# AegistonWEB 项目总纲

> 本文件是 AegistonWEB 的跨会话项目记忆与治理入口。任何人或 Agent 在上下文不足、会话重启、模型切换或长上下文被清空后，都应先读本文件，再读 `CLAUDE.md`、相关 spec 与最近提交，之后才能开始修改。

## 1. 项目身份

- 生产网站：<https://aegiston.com/>
- 上游主仓库：`xdrshjr/AegistonWEB`
- 日常施工 fork：`jinngimk-lang/AegistonWEB`
- 默认上游分支：`xdrshjr/AegistonWEB:main`
- 当前技术基线：Next.js 15 + React 19 前端、FastAPI 后端、Nginx / Docker 编排。
- 既有实现与硬约束以 `CLAUDE.md` 和 `docs/plans/**/spec.md` 为准；本文件不替代它们，而是负责“项目方向、恢复顺序、变更纪律与工具治理”。

## 2. 核心目标

1. 持续把 Aegiston 官网建设成稳定、专业、可维护、可验证、可回退的企业官网。
2. 在不破坏既有视觉契约、内容来源、合规约束和私有化交付要求的前提下迭代体验、内容、性能、SEO、可访问性和运维能力。
3. 所有变更必须小步、可审查、可验证、可回退；禁止因为上下文过长而“凭印象”继续改。
4. 生产代码、项目治理、Agent 工具、第三方辅助能力必须彼此分层，避免工具接入污染业务运行时。

## 3. 权威事实源与优先级

发生冲突时按以下优先级处理：

1. 用户在当前任务中的明确要求。
2. `CLAUDE.md` 中的仓库硬约束。
3. 当前任务对应的 `docs/plans/**/spec.md`。
4. 本 `PROJECT.md` 的长期治理规则。
5. 已合并 PR、最近提交及其验证证据。
6. README、注释、历史讨论等辅助资料。

如果发现规则互相冲突，不得静默选择一个版本继续改；应先用最小范围变更消除冲突，或在 PR 中明确记录。

## 4. 跨上下文恢复协议

每次新会话、上下文清空、任务中断或模型切换后，严格按以下顺序恢复：

1. 读取 `PROJECT.md`。
2. 读取 `CLAUDE.md`。
3. 查看 `main` 最近 5 个提交，确认“上一已完成事项”的 commit / merge commit。
4. 查看尚未合并的 PR 与当前任务分支，避免重复施工。
5. 只读取与当前任务直接相关的 spec、代码和测试。
6. 在开始修改前确认 fork 与上游基线是否同步。
7. 一旦发现工作树或分支存在与当前任务无关的改动，停止把它们混入当前提交。

恢复时禁止依赖聊天记忆猜测当前状态；**仓库文件 + Git 历史 + PR 状态才是事实源**。

### 初始治理锚点

本治理基线从以下已知良好提交开始：

- 上游 / fork 基线：`873010b6f0dd7f20d730e353ff6221029a10f1d5`
- 提交主题：`chore: 源 PPT 不入库`

后续不需要为了“记住最新 SHA”而机械修改本文件；最新已合并 commit / PR 本身就是第二记忆点。只有项目方向、架构、流程或长期规则发生变化时才更新 `PROJECT.md`。

## 5. 单项任务纪律（最重要）

每个任务只能有一个清晰目的。

### 必须做到

- 一次只做一项明确事项。
- 只修改完成该事项所必需的文件。
- 修改前确认基线；修改后检查 diff。
- 对该事项运行最小充分验证。
- 验证通过后形成一个语义清晰、可回退的独立 commit。
- commit 后再创建 / 更新对应 PR。
- PR 合并后，以该 merge/squash commit 作为下一任务的恢复锚点。

### 严禁

- “顺手”重构无关代码。
- “顺手”升级无关依赖。
- “顺手”格式化整个仓库。
- 在同一个 commit 中混入工具安装、业务功能、视觉调整和文档整理等多个主题。
- 为了让测试变绿而删除、放宽或绕过原有质量门禁，除非任务本身就是经论证后修改门禁。
- 在没有证据时改动 `CLAUDE.md` 已明确保护的视觉、内容、合规或部署契约。

如果一个需求自然拆成 A/B/C 三项，应做三个独立分支/commit/PR，而不是一个“大杂烩 PR”。

## 6. Git 与 PR 工作流

默认流程：

`xdrshjr/AegistonWEB:main` → 同步到 `jinngimk-lang/AegistonWEB` → 在 fork 创建单项分支 → 修改 → 验证 → 单项 commit → 从 fork 向上游 `main` 提 PR → CI / review → 合并。

规则：

- 不直接在上游仓库施工。
- 不直接在 fork 的 `main` 上做功能修改；每项工作使用独立分支。
- 分支名体现单一目的，例如：
  - `fix/mobile-nav-focus`
  - `feat/contact-conversion`
  - `docs/project-governance-baseline`
  - `chore/agent-tooling-crawl4ai`
- commit 使用清晰的 Conventional Commit 风格，例如 `fix:` / `feat:` / `docs:` / `chore:` / `test:`。
- 一个已完成事项至少有一个可定位的 commit；不得只依赖未提交工作树。
- PR 默认保持小而聚焦；如果 review 发现另一个问题，优先另开任务，不把它塞进当前 PR。
- 未通过验证的提交可以存在于工作分支，但不得被描述为“完成”。

## 7. 验证原则

验证范围与变更范围匹配，但不能只看“页面能打开”。优先使用仓库已经存在的门禁。

可能涉及的现有验证包括（按任务选择，不要求每次全部运行）：

- Python：ruff、mypy、pytest。
- 前端：TypeScript、ESLint、Stylelint、Vitest。
- E2E：Playwright。
- 构建：Next.js build。
- 项目专用门禁：content snapshot、asset validation、redaction check、OG check、font preload check、budget 等。

若任务改变视觉或交互，除自动测试外还应进行浏览器级真实页面验证；若任务改变公开内容，应同时检查来源、合规和最终渲染。

## 8. 网站实测与浏览器自动化

对于 UI / UX / 响应式 / 表单 / 导航 / SEO 渲染 / 可访问性问题，优先使用真实浏览器能力验证，不只凭源码推断。

能力优先级：

1. 已有 Playwright 测试与项目脚本。
2. 可用的浏览器自动化 / Chrome DevTools 类 MCP 或 Agent Browser。
3. 必要时再引入新的浏览器辅助工具。

任何新增浏览器工具必须作为开发/Agent 辅助能力隔离，不能无理由进入生产 bundle。

## 9. Agent、MCP、Skill 与外部 GitHub 项目治理

本项目允许引入能显著提升研发质量和检索/验证能力的 Agent 工具、Skill、MCP 或开源项目，但**禁止“看到好用就整仓复制”**。

### 接入前必须检查

- 许可证是否允许当前用途与再分发方式。
- 仓库活跃度、维护状态和版本稳定性。
- 是否需要外网、浏览器、系统命令、Docker、Node/Python 等额外权限。
- 是否读取或发送源代码、环境变量、凭据、用户数据。
- 是否引入生产依赖、构建依赖或仅为开发工具。
- 是否存在供应链风险、任意命令执行、遥测或自动上传行为。
- 是否能锁定版本 / commit SHA。
- 是否有简单、明确的卸载与回退方式。

### 接入位置原则

第三方 Agent 辅助材料不得散落到业务源码中。根据工具性质优先放置：

- `.agent/`：本项目自己的 Agent 规则、skill 索引、提示词与适配层。
- `tools/`：可执行的本地开发/分析辅助工具。
- `docs/tooling/`：许可证、来源、固定版本、安装方式、权限与使用说明。

除非工具本身必须 vendoring，否则优先“固定来源 + 安装脚本 / 配置 + 文档”，不要把整个第三方仓库永久复制进主仓库。

### 首批候选能力

以下是优先评估对象，不代表未经审核直接安装：

- Matt Pocock `mattpocock/skills`：评估其中与 TypeScript / React / Agent 编程流程直接相关的 skills，按需引入，不整仓无差别复制。
- Crawl4AI `unclecode/crawl4ai`：用于公开网站抓取、内容审计、竞品/资料研究等离线辅助场景；必须避免把抓取运行时塞进官网生产链路。
- Agent Reach `Panniantong/Agent-Reach`：评估其外部信息获取能力、账号/网络权限、隐私与供应链边界后再决定接入方式。
- 浏览器 / Chrome 自动化能力：优先复用现有 Playwright 或已连接的浏览器工具，再判断是否有必要新增。

**每一种外部能力的接入都是独立任务、独立 commit、独立 PR。**

## 10. 依赖与供应链规则

- 不因 Agent 工具需求修改生产依赖，除非该能力本身是产品功能。
- 新依赖必须说明“为什么现有能力不够”。
- 能固定版本就固定版本；能固定 commit SHA 就记录 SHA。
- 必须保留原许可证与 attribution 要求。
- 不提交 token、cookie、API key、私钥、账号密码或真实 `.env`。
- 示例配置只能使用 `.env.example` 或明确的占位符。
- 工具需要高权限时遵循最小权限原则，不把个人机器或 CI 的全局凭据写入项目。

## 11. 项目长期演进原则

允许随着真实证据更新路线，但必须保持项目完整性：

- 新方案先验证问题是否真实存在，再实施。
- 重大设计、架构或产品方向变化先写 spec / ADR，再改代码。
- 若发现更好的方向，应说明它解决了什么约束、代价是什么、如何验证，而不是因为“更现代”就替换现有方案。
- 对外部趋势、开源项目和新工具可以持续扫描，但“发现”不等于“集成”；只有通过许可证、兼容性、安全、质量和维护性评估后才进入仓库。
- 已经稳定工作的部分默认不动，除非当前任务明确需要。

## 12. 每项任务的完成定义（DoD）

只有同时满足以下条件，才可称为“完成”：

1. 任务目标已经实现。
2. 没有混入无关修改。
3. diff 已检查。
4. 对应自动化/手工验证已经执行并记录结果。
5. 变更已有独立 commit。
6. 已从 `jinngimk-lang/AegistonWEB` 向 `xdrshjr/AegistonWEB` 创建或更新聚焦的 PR。
7. CI / review 中发现的问题只针对该任务修复；新问题另开任务。
8. 合并后能够通过 commit / PR 明确回退。

## 13. 新会话启动模板

当上下文丢失时，Agent 应在内部完成下面这组检查后再施工：

```text
Repository: xdrshjr/AegistonWEB
Work fork: jinngimk-lang/AegistonWEB
Read first: PROJECT.md -> CLAUDE.md -> relevant spec -> latest commits/PRs
Rule: one task only; no unrelated edits
Git: fork branch -> validate -> one focused commit -> PR to upstream main
Recovery memory: PROJECT.md + latest merged commit/PR
```

## 14. 当前下一步队列

在不修改业务代码的前提下，后续按“一项一个 PR”依次评估：

1. 建立 Agent / Tooling 目录与来源登记规范。
2. 评估并按需接入 `mattpocock/skills` 中与本项目直接相关的 skills。
3. 评估 Crawl4AI 的许可证、安全边界与最小接入方式。
4. 评估 Agent Reach 的许可证、权限模型与最小接入方式。
5. 盘点现有 Playwright / 浏览器能力，确认是否仍需要额外 Chrome MCP。
6. 工具基线稳定后，再开始具体网站功能或视觉任务。

队列顺序可以根据用户明确的新任务调整；**无论顺序如何，每次仍只执行一项。**
