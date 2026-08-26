# AegistonWEB Current Status

> 这是跨上下文恢复时的“当前状态检查点”。`PROJECT.md` 负责长期规则，本文件只负责说明现在做到哪一步、下一步允许做什么。聊天上下文过长或被清空后，先读 `PROJECT.md`，再读本文件，然后检查 fork `main` 的最新提交。

## 当前阶段

**Phase 1 — 网站改动阶段已就绪。**

Phase 0 的规范与工具地基已经完成。到目前为止，仍然**没有修改 `https://aegiston.com/` 的具体业务内容、视觉、交互、生产配置或运行依赖**。

- 工作 fork：`jinngimk-lang/AegistonWEB`
- 上游主项目：`xdrshjr/AegistonWEB`
- 网站：`https://aegiston.com/`

下一步不是继续做无边界的“优化”，而是等待/接收一个明确的网站具体改动需求，然后按单项工作流执行。

## Phase 0 已完成的地基

1. `PROJECT.md`：长期项目大纲、恢复顺序、单项任务、commit/回退、fork/upstream 工作流。
2. `STATUS.md`：当前阶段与下一步允许工作。
3. `AGENTS.md`：任何新编码 Agent 的通用仓库入口。
4. `.agents/README.md`：第三方 skills / browser / crawler / research 工具的隔离、版本、许可证、安全、升级、卸载规范。
5. `.gitmodules` + `.agents/vendor/**`：外部工具以固定 commit 的 Git submodule 形式保存在 fork，不进入生产 runtime。

当前固定的外部工具：

- Matt Pocock skills — `.agents/vendor/mattpocock-skills` — `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`；
- Crawl4AI — `.agents/vendor/crawl4ai` — `7e801521428ee12509994d39151006f64055ebe3`（v0.9.2，注意上游额外署名要求）；
- Agent Reach — `.agents/vendor/agent-reach` — `06c202b03400a7d31886bf4399213706da1a0324`；
- browser-use — `.agents/vendor/browser-use` — `fac707cccf7d7c2ccf743944499baeed916bf827`。

这些工具是开发辅助能力，不代表自动启用，不允许生产代码直接依赖。

## 当前恢复顺序

恢复时不要依赖聊天记忆，按以下顺序确认：

1. `PROJECT.md`
2. `STATUS.md`
3. `AGENTS.md`
4. `CLAUDE.md`
5. 当前任务对应的 `docs/plans/**` spec
6. `jinngimk-lang/AegistonWEB:main` 最新 commit
7. `xdrshjr/AegistonWEB:main` 最新 commit 与相关已合并 PR
8. 当前工作分支和 diff

Git 提交记录是实际进度日志。**本文件不尝试写入“自身 commit SHA”**，避免为了更新 SHA 再制造无限递归提交；恢复时直接读取 fork `main` 最新提交即可。

## 现在允许做什么

现在可以进入具体网站修改，但每个任务必须明确、独立。

允许的典型事项包括：

- 明确指定页面的文案/内容修改；
- 明确指定组件或页面的视觉调整；
- 明确的交互、导航、响应式或可访问性修复；
- 明确的 SEO、性能、错误修复或功能需求；
- 与具体需求直接相关的测试更新。

每次只处理当前明确需求，不因为看到别的问题就顺手改。

## 网站改动的固定工作流

每个独立需求都执行：

1. 先读 `PROJECT.md` / `STATUS.md` / `AGENTS.md` / `CLAUDE.md` 和相关 spec；
2. 检查上游 `xdrshjr/AegistonWEB:main` 最新状态；
3. 确保 fork 基线与当前上游关系清楚，必要时先同步再开始任务；
4. 在 `jinngimk-lang/AegistonWEB` 新建一个只服务当前需求的分支；
5. 只修改当前需求涉及的文件；
6. 运行最小但足够证伪的针对性测试；
7. UI / 交互改动必须做浏览器/视觉验证；
8. 检查最终 diff，确认没有无关文件；
9. commit，形成独立回退点；
10. 从 fork 分支向 `xdrshjr/AegistonWEB:main` 提一个聚焦 PR；
11. PR 合并结果成为下一次网站改动的产品恢复基线；
12. 再开始下一个需求。

## Commit / PR 纪律

- 一项任务一个独立 commit，技术上确有必要时才允许同一任务出现少量连续 commit。
- commit message 必须说清实际改动。
- 不使用 `git add -A` / `git add .` 式无差别纳入无关改动。
- PR 必须聚焦一个需求。
- PR 描述必须包含：改了什么、为什么、涉及哪里、验证了什么、已知限制/后续项。
- 不把工具升级、重构、格式化、无关文档修改混进网站 PR。
- 合并后保留 commit/PR 作为下一次回退和恢复事实源。

## 工具使用规则

开始每个网站任务前先检查已有能力，不重复引入工具。

优先顺序：

- GitHub：使用现有 GitHub 连接能力完成仓库/分支/commit/PR 操作；
- 普通 UI 验证：优先现有 Playwright 与可用 browser/agent-browser 能力；
- 需要 agent 浏览器层时：可使用 `.agents/vendor/browser-use`；
- 需要结构化站点抓取时：可使用 `.agents/vendor/crawl4ai`；
- 需要更广泛公开平台研究时：可使用 `.agents/vendor/agent-reach`；
- 需要工程 Agent workflow 参考时：可读取 `.agents/vendor/mattpocock-skills`。

第三方工具的凭据、cookies、登录态、tokens 和生产 secrets 一律不得入库。

## 当前禁止的行为

即使已经进入 Phase 1，也仍然禁止：

- 没有具体需求就自主重做整个网站；
- 一个 PR 同时改多个无关页面/问题；
- 为“顺手优化”修改不相关的 `frontend/**` / `backend/**` / `nginx/**`；
- 未检查 `CLAUDE.md` 与相关 spec 就改变既有架构/设计约束；
- 把 `.agents/**` 变成生产 runtime 依赖；
- 提交任何密钥、cookie、验证码、真实敏感个人数据；
- 为了让测试通过而臆造网站内容或绕过既有合规门禁。

## Phase 1 起点

规范地基已经完成，fork `main` 是当前开发辅助基线。

**下一项允许工作：第一个明确的 `aegiston.com` 网站具体修改需求。**

在收到具体修改目标之前，不主动改动网站业务代码。
