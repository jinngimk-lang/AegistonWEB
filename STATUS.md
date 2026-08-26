# AegistonWEB Current Status

> 这是跨上下文恢复时的“当前状态检查点”。`PROJECT.md` 负责长期规则，本文件只负责说明现在做到哪一步、下一步允许做什么。聊天上下文过长或被清空后，先读 `PROJECT.md`，再读本文件，然后检查 fork `main` 的最新提交。

## 当前阶段

**Phase 0 — 规范与工具地基建设。**

目前还没有开始修改 `https://aegiston.com/` 的具体业务内容、视觉或交互。

当前目标是先把长期协作所需的治理规则、状态恢复方式、工具/skill/MCP 接入规范放进工作 fork：

- 工作 fork：`jinngimk-lang/AegistonWEB`
- 上游主项目：`xdrshjr/AegistonWEB`
- 网站：`https://aegiston.com/`

## 已完成

1. 建立 `PROJECT.md` 作为长期项目大纲与工作规则事实源。
2. 明确一次只做一个独立事项，不顺手修改无关代码。
3. 明确每个完成事项必须形成独立、可回退的 commit。
4. 明确真正开始改网站后，采用：fork 分支修改 → 验证 → commit → 向上游 `main` 提 PR。
5. 明确规范/工具地基阶段先只保存在 fork，不向上游提交 PR。

## 当前恢复点

恢复时不要依赖聊天记忆，按以下顺序确认：

1. `PROJECT.md`
2. `STATUS.md`
3. `CLAUDE.md`
4. 当前任务对应的 `docs/plans/**` spec
5. `jinngimk-lang/AegistonWEB:main` 最新 commit
6. 若已进入网站改动阶段，再检查 `xdrshjr/AegistonWEB:main` 最新 commit 与相关已合并 PR

Git 提交记录是实际进度日志。**本文件不尝试写入“自身 commit SHA”**，避免为了更新 SHA 再制造无限递归提交；恢复时直接读取 fork `main` 最新提交即可。

## 当前允许做的工作

在 Phase 0 期间，只允许做下面几类地基事项，并且每一项必须单独 branch / commit：

- 项目治理与恢复文档；
- agent / skill / MCP / 浏览器自动化 / crawler 等开发辅助能力的评估与隔离接入；
- 工具来源、许可证、版本固定、权限、凭据、安全、升级和卸载规则；
- 与上述工具相关但不改变生产网站运行行为的仓库内辅助文件。

## 当前禁止做的工作

在地基阶段结束前，不得因为“顺手”而修改：

- `frontend/**` 业务实现；
- `backend/**` 业务实现；
- `nginx/**` 生产配置；
- 网站文案、页面内容、图片、SEO 数据；
- 现有依赖版本；
- 现有测试逻辑；
- 任何会改变线上站点行为的文件。

如果在打地基过程中发现网站问题，只记录为后续独立任务，不在当前 commit 修复。

## 工具地基待办

接下来逐项评估并决定是否仓库化，候选包括但不限于：

- 浏览器自动化 / Chrome-use / browser-use 类能力；
- Matt Pocock `mattpocock/skills`；
- Crawl4AI `unclecode/crawl4ai`；
- Agent Reach `Panniantong/Agent-Reach`；
- 已连接的 GitHub 能力；
- 适用于 React / Next.js / TypeScript / Playwright / accessibility / performance / SEO / security 的现有 skills。

原则：**先检查已有能力，够用就不重复安装；只有确实带来价值的能力才进入仓库。** 第三方项目不得直接混入生产 runtime，优先放在明确隔离的 agent/tooling 区域，并固定来源与版本。

## Phase 0 完成条件

只有同时满足以下条件，才进入真正的网站修改阶段：

1. `PROJECT.md` 与 `STATUS.md` 已稳定落在 fork `main`；
2. 工具/skills/MCP 的仓库内布局和治理方式已明确；
3. 必需的辅助工具已单独接入并有来源/版本/许可证/卸载说明；
4. fork `main` 没有意外业务代码差异；
5. 下一次开始网站修改时，可以仅靠仓库文件 + Git 历史恢复上下文。

## 进入 Phase 1 后的固定工作流

真正开始改网站时，每个独立需求都执行：

1. 同步并读取上游最新状态；
2. 从 fork 最新基线创建一个新分支；
3. 只修改当前需求涉及的内容；
4. 做针对性验证，UI 改动必须做浏览器/视觉验证；
5. 检查 diff，确保没有无关改动；
6. commit，形成明确回退点；
7. 从 `jinngimk-lang/AegistonWEB` 向 `xdrshjr/AegistonWEB:main` 提一个聚焦 PR；
8. 合并结果成为下一次工作的恢复基线；
9. 再开始下一个独立需求。

当前状态：**继续建设工具与协作地基；尚未授权本阶段去改网站具体内容。**
