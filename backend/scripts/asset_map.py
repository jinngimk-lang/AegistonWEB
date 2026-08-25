"""ASSET_MAP —— PPT 媒体资源到站点 asset-id 的白名单映射。

单一事实源：`spec.md` §6.2 截图映射表（78 条，已逐条回源核对 `slideN.xml.rels`）。
v2 修正 P2-2：`ara-state-*` 与多页引用一律展开为「一行一条」，机器可读。

字段
----
asset_id      站点内稳定 ID，同时是产出文件名（`<asset_id>.webp`）
media         PPT 内 `ppt/media/` 下的原始文件名
slide         首次出现的幻灯片页码（用于内容溯源 `sourceSlide`）
also_on       其余出现页（多页引用时记录，仅用于溯源，不影响产出）
kind          screenshot | diagram | photo | video
product       aragonteam | inkclaw | legallens | case
caption       图注（页面上会渲染）
alt           替代文本。必须描述界面**内容**而非「一张截图」（spec §10.2）
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class AssetSpec:
    asset_id: str
    media: str
    slide: int
    kind: str
    product: str
    caption: str
    alt: str
    also_on: tuple[int, ...] = field(default_factory=tuple)


ARAGONTEAM: list[AssetSpec] = [
    AssetSpec("ara-personal-board", "image40.png", 20, "screenshot", "aragonteam",
              "AragonTeam 个人工作场景 · 多智能体协同与执行工作台",
              "AragonTeam 个人工作台：左侧项目导航，中部智能体执行区，右侧任务树与 TODO 清单实时展示当前进度、已完成事项及后续安排"),
    AssetSpec("ara-agent-chat", "image41.png", 21, "screenshot", "aragonteam",
              "Agent 对话界面 · 任务分析与工具调用实时可见",
              "AragonTeam Agent 对话界面：左侧逐步展示智能体的任务分析、工具调用与耗时，右侧任务树按层级区分已完成、执行中与待处理任务"),
    AssetSpec("ara-plan-new", "image42.png", 22, "screenshot", "aragonteam",
              "新建计划面板 · 目标拆解与执行步骤编排",
              "AragonTeam 新建计划面板：填写计划名称与目标后，系统按待办、运行中、已完成、已验证四阶段生成执行步骤"),
    AssetSpec("ara-plan-overview", "image43.png", 22, "screenshot", "aragonteam",
              "项目总览面板 · 任务从创建到验收的完整流程",
              "AragonTeam 项目总览面板：以看板呈现任务在待办、运行中、已完成、已验证四个阶段的分布，支持项目筛选与状态流转"),
    AssetSpec("ara-state-todo", "image44.png", 23, "screenshot", "aragonteam",
              "任务四态 · 01 待办：等待执行，统一收纳",
              "AragonTeam 任务看板「待办」列：等待执行的任务被统一收纳，卡片显示标题、负责人与所属计划"),
    AssetSpec("ara-state-running", "image45.png", 23, "screenshot", "aragonteam",
              "任务四态 · 02 运行中：实时执行，跟踪进度",
              "AragonTeam 任务看板「运行中」列：智能体正在实时执行的任务，卡片显示当前进度百分比与执行步骤"),
    AssetSpec("ara-state-done", "image46.png", 23, "screenshot", "aragonteam",
              "任务四态 · 03 已完成：输出成果，保留记录",
              "AragonTeam 任务看板「已完成」列：已输出成果的任务，执行记录与产出文件被完整保留"),
    AssetSpec("ara-state-verified", "image47.png", 23, "screenshot", "aragonteam",
              "任务四态 · 04 已验证：人工确认，完成闭环",
              "AragonTeam 任务看板「已验证」列：经人工确认的任务标记为已验证，完成从创建到验收的闭环"),
    AssetSpec("ara-dev-workspace", "image48.png", 24, "screenshot", "aragonteam",
              "综合开发工作区 · 编辑器 + Git + 终端联动",
              "AragonTeam 综合开发工作区：左侧文件树，中部代码编辑器，右侧 Git 变更列表，底部内置命令行终端，三者联动"),
    AssetSpec("ara-dag-orchestration", "image49.png", 25, "screenshot", "aragonteam",
              "智能体任务编排 · 可视化运行图",
              "AragonTeam 智能体任务编排界面：流程图展示任务节点、执行顺序与依赖关系，左侧列出可用智能体及其运行状态，右侧自动生成任务规划"),
    AssetSpec("ara-agent-terminal", "image52.png", 26, "screenshot", "aragonteam",
              "智能体任务执行终端 · 自然语言驱动",
              "AragonTeam 智能体执行终端：用自然语言描述开发需求后，分层文字区分任务说明、执行过程与最终成果，底部实时显示模型名称、运行状态、上下文用量与 Token 消耗"),
    AssetSpec("ara-model-presets", "image53.png", 27, "screenshot", "aragonteam",
              "系统设置 · 模型与预设",
              "AragonTeam 模型配置页：配置 API 协议、API Key 与模型 ID，管理多个模型预设，状态标识显示各模型连接情况"),
    AssetSpec("ara-graph-templates", "image54.png", 28, "screenshot", "aragonteam",
              "内置运行图模板 · 按业务场景分类管理",
              "AragonTeam 运行图模板页：左侧按系统模板、软件开发、文档编写等类型分类展示，右侧配置子任务、依赖关系、输出 JSON 与风险项"),
    AssetSpec("ara-team-home", "image55.png", 29, "screenshot", "aragonteam",
              "AragonTeam 团队应用首页",
              "AragonTeam 团队应用首页：融合需求、BUG、版本、文档与团队管理的统一工作空间入口"),
    AssetSpec("ara-team-dashboard-mini", "image56.png", 29, "screenshot", "aragonteam",
              "团队仪表盘概览",
              "AragonTeam 团队仪表盘概览：集中呈现需求与 BUG 状态分布、Agent 使用情况与团队活跃度"),
    AssetSpec("ara-dashboard", "image57.png", 30, "screenshot", "aragonteam",
              "仪表盘 · 全局数据洞察与待办聚合",
              "AragonTeam 仪表盘：上方集中展示需求、BUG、Agent 使用情况与团队活跃度等核心指标，下方汇总待处理需求、待验证 BUG、阻塞任务与逾期计划并标注优先级"),
    AssetSpec("ara-my-work", "image58.png", 31, "screenshot", "aragonteam",
              "我的工作 · 指派任务与提交事项",
              "AragonTeam 我的工作界面：上半区列出他人指派给我的需求与任务及其状态和优先级，下半区汇总由我提交的需求、人工确认、工具接入与 BUG 事项"),
    AssetSpec("ara-versions", "image59.png", 32, "screenshot", "aragonteam",
              "版本 / 计划 · 迭代进度管理",
              "AragonTeam 版本与计划界面：按版本组织研发任务，进度条与需求、BUG、计划数量统计并列，可展开查看版本下属计划并定位延期与阻塞事项"),
    AssetSpec("ara-requirements-list", "image60.png", 33, "screenshot", "aragonteam",
              "需求列表视图 · 全生命周期管理",
              "AragonTeam 需求列表视图：表格呈现需求的状态、优先级、负责人与所属计划，顶部提供关键词、状态、优先级、负责人与计划的组合筛选"),
    AssetSpec("ara-requirement-detail", "image61.png", 33, "screenshot", "aragonteam",
              "需求详情与编辑 · 关联版本、BUG 与文档",
              "AragonTeam 需求详情页：正文与验收标准可在线编辑，右侧关联版本计划、BUG、文档与附件，底部记录变更动态与成员评论"),
    AssetSpec("ara-bugs-list", "image62.png", 34, "screenshot", "aragonteam",
              "BUG 列表视图 · 缺陷全流程管理",
              "AragonTeam BUG 列表视图：表格呈现缺陷的状态、严重度、负责人与所属计划，支持按关键词、严重度、来源需求等条件筛选"),
    AssetSpec("ara-bug-detail", "image63.png", 34, "screenshot", "aragonteam",
              "BUG 详情与 AI 修复派发",
              "AragonTeam BUG 详情页：复现步骤与关联需求并列展示，可将该 BUG 直接转交 AI Agent 处理，并记录修复进展与成员评论"),
    AssetSpec("ara-requirements-kanban", "image64.GIF", 35, "video", "aragonteam",
              "需求看板 · 拖拽流转（动图）",
              "AragonTeam 需求看板：需求卡片在新建、指派、开发、测试、审批到完成各列之间拖拽流转，卡片同步显示负责人、所属计划、附件与子任务进度"),
    AssetSpec("ara-agent-admin", "image65.png", 36, "screenshot", "aragonteam",
              "Agent 管理 · 统一管理与任务直派",
              "AragonTeam Agent 管理界面：集中展示各 Agent 的名称、能力说明、运行状态、当前任务数量与资源占用，支持配置、启停与任务直派"),
    AssetSpec("ara-members", "image66.png", 37, "screenshot", "aragonteam",
              "团队成员与角色权限管理",
              "AragonTeam 团队成员管理界面：列出成员账号、联系邮箱（已打码）、站点角色与所属项目，可按角色、状态、来源与项目筛选，并配置项目角色与细粒度协作权限"),
    AssetSpec("ara-docs-projects", "image67.png", 38, "screenshot", "aragonteam",
              "多项目文档管理",
              "AragonTeam 多项目文档管理界面：按项目归集合同、方案与需求说明，显示文档数量、待处理事项与最近更新时间，并设有未归属项目文档专区"),
    AssetSpec("ara-docs-inproject", "image68.png", 38, "screenshot", "aragonteam",
              "项目内文档管理 · 与研发事项打通",
              "AragonTeam 项目内文档管理界面：按标题、类型、上传人、版本与更新时间筛选文档，可将文档关联至具体需求或 BUG"),
    AssetSpec("ara-audit", "image69.png", 39, "screenshot", "aragonteam",
              "审计 · 全量操作留痕与多维检索",
              "AragonTeam 审计界面：逐条记录成员加入、停用、删除与角色变更等操作，展示操作主体、目标对象、动作类型与发生时间，支持按实体、动作与时间范围组合筛选"),
    AssetSpec("ara-tech-governance", "image70.png", 40, "diagram", "aragonteam",
              "异构接入与统一治理基座（架构示意图）",
              "架构示意图：内置虚拟 Agent、外部 CLI Agent 与多档模型服务等异构来源，经声明式注册表、协议外投递闸门、能力槽位解析与统一事实封装四个环节，向上提供稳定的调度视图"),
    AssetSpec("ara-tech-graph-kernel", "image71.png", 41, "diagram", "aragonteam",
              "运行图执行内核与长稳运行保障（架构示意图）",
              "架构示意图：一次运行图节点执行的完整闭环，依次为需求成图、就绪判定、Harness 承载、转移决策、终点判定，并叠加登记式异步等待与执行态持久化两项长稳机制"),
]

INKCLAW: list[AssetSpec] = [
    AssetSpec("ink-chat", "image75.png", 47, "screenshot", "inkclaw",
              "基础 AI 对话 · 自然语言入口",
              "InkClaw 基础对话界面：以熟悉的提问、分析与生成方式进入智能体工作空间，可从一次对话直接进入后续智能体能力"),
    AssetSpec("ink-bot-manage", "image76.png", 48, "screenshot", "inkclaw",
              "专属对话机器人 · 创建与管理",
              "InkClaw 专属对话机器人管理界面：以卡片列出已创建的机器人及其系统提示词配置，可新建、编辑与停用"),
    AssetSpec("ink-bot-chat", "image77.png", 48, "screenshot", "inkclaw",
              "专属对话机器人 · 实际对话界面",
              "InkClaw 专属对话机器人对话界面：系统提示词把通用回答固化为专属角色、口吻与工作方法，同类任务获得一致输出"),
    AssetSpec("ink-team-collab", "image78.png", 49, "screenshot", "inkclaw",
              "团队协作 · 分工、通信与状态集中呈现",
              "InkClaw 团队协作界面：多个智能体围绕同一任务分工推进，执行状态持续可见，通过广播共享任务消息"),
    AssetSpec("ink-dag", "image79.png", 50, "screenshot", "inkclaw",
              "DAG 协作 · 执行依赖与运行状态可视化",
              "InkClaw DAG 协作界面：用有向无环图显式表达任务依赖、分支与并行路径，可快速识别当前步骤与异常节点"),
    AssetSpec("ink-git", "image80.png", 51, "screenshot", "inkclaw",
              "网页 Git · 变更查看与版本管理",
              "InkClaw 网页 Git 界面：在线查看文件变更差异并管理版本，把任务执行与代码变更放在同一链路"),
    AssetSpec("ink-ide", "image81.png", 52, "screenshot", "inkclaw",
              "网页 IDE · 在线查看与修改",
              "InkClaw 网页 IDE 界面：在浏览器中查看文件并直接修改，修改完成后回到任务继续推进"),
    AssetSpec("ink-memory", "image82.png", 53, "screenshot", "inkclaw",
              "记忆 · 长期上下文配置",
              "InkClaw 记忆配置界面：把需要延续的重要信息沉淀为可配置记忆条目，后续任务沿用已有背景"),
    AssetSpec("ink-soul", "image83.png", 54, "screenshot", "inkclaw",
              "灵魂 · 角色、表达与行为边界",
              "InkClaw 灵魂配置界面：把角色定位、表达方式与行为边界写入配置，使智能体在不同任务中保持稳定风格"),
    AssetSpec("ink-skill", "image84.png", 55, "screenshot", "inkclaw",
              "Skill · 可复用能力模块",
              "InkClaw Skill 管理界面：把常用方法与工具封装为可复用能力模块，智能体按任务需要装配"),
    AssetSpec("ink-doc-edit", "image85.png", 56, "screenshot", "inkclaw",
              "智能文档协作 · 双页面协同编辑",
              "InkClaw 智能文档协作界面：左侧对话区与右侧文档编辑器双页面协同，可围绕具体段落或章节做局部修改"),
    AssetSpec("ink-doc-review", "image86.png", 57, "screenshot", "inkclaw",
              "智能文档审校 · 四维校验与定位",
              "InkClaw 智能文档审校界面：从结构完整性、逻辑一致性、内容准确性与语言表达四个维度校验，问题在文档中高亮并可点击跳转定位"),
    AssetSpec("ink-brainstorm-ask", "image87.png", 58, "screenshot", "inkclaw",
              "头脑风暴 · 主动追问发现需求",
              "InkClaw 头脑风暴界面：智能体通过持续追问，把不明确的需求逐步问清"),
    AssetSpec("ink-brainstorm-diverge", "image88.png", 58, "screenshot", "inkclaw",
              "头脑风暴 · 多角度发散",
              "InkClaw 头脑风暴发散界面：围绕同一议题从多个角度并行展开候选方向"),
    AssetSpec("ink-brainstorm-plan", "image89.png", 58, "screenshot", "inkclaw",
              "头脑风暴 · 生成规划文档",
              "InkClaw 头脑风暴收敛界面：把发散与聚类结果结构化整理为可执行的规划文档"),
    AssetSpec("ink-cloud-project", "image90.png", 59, "screenshot", "inkclaw",
              "云项目 · 统一项目空间",
              "InkClaw 云项目界面：以项目为单位统一承载代码、文档与 Agent 会话，项目状态可保存、多任务并行推进"),
    AssetSpec("ink-cloud-assets", "image91.png", 59, "screenshot", "inkclaw",
              "云项目 · 代码 / 文档 / 会话资产",
              "InkClaw 云项目资产界面：代码、文档与会话三类资产集中呈现，支持 Git 版本管理与容器沙箱运行"),
    AssetSpec("ink-tech-runtime", "image92.png", 60, "diagram", "inkclaw",
              "多智能体运行时（架构示意图）",
              "架构示意图：主智能体只拆解建图，经 DAG 三色 DFS 校验与并发闸门后扇出到多个独立上下文的智能体，再由结果聚合扇入下游，常驻容器与事件流快照分别保障冷启动与断点恢复"),
    AssetSpec("ink-tech-collab", "image93.png", 61, "diagram", "inkclaw",
              "协作、交付与治理底座（架构示意图）",
              "架构示意图：一次文档修改的交付链路，从需求与边界、结构化指令、节点级更新、事件流同步到逐条审阅，叠加消息总线、旁路自检与对外接入三项支撑机制"),
]

LEGALLENS: list[AssetSpec] = [
    AssetSpec("legal-home", "image97.png", 67, "screenshot", "legallens",
              "合约智审系统总体功能界面",
              "合约智审系统首页：聚合智能审查、资信评估、合同生成与知识库管理等核心模块入口，支持上下游一致性校验与自定义任务创建"),
    AssetSpec("legal-review-result", "image98.png", 68, "screenshot", "legallens",
              "专业审查 · 风险透视与精准预警",
              "合约智审审查结果界面：融合主体资信与条款内容双重审查模型，高风险合作方直观预警，关键风险条款自动高亮并评分，附智能摘要与原文对比"),
    AssetSpec("legal-review-settings", "image99.png", 69, "screenshot", "legallens",
              "专业审查设置 · 多维度审查方向配置",
              "合约智审专业审查设置界面：自定义合规、合法、风险等多个审查维度及其权重"),
    AssetSpec("legal-preference-settings", "image100.png", 69, "screenshot", "legallens",
              "倾向性审查设置 · 甲乙方立场参数",
              "合约智审倾向性审查设置界面：把甲方或乙方立场写进审查参数，兼顾谈判立场与条款可执行性"),
    AssetSpec("legal-review-editor", "image101.png", 70, "screenshot", "legallens",
              "专业审查结果编辑界面",
              "合约智审编辑审查界面：中部合同原文实时高亮潜在风险条款，左侧面板输出风险评级、法理分析与修改措辞建议，右侧为 AI 对话辅助审查"),
    AssetSpec("legal-opinion-flow", "image102.png", 71, "diagram", "legallens",
              "法律意见书生成原理",
              "示意图：法律意见书生成流程，从审查结果汇总、风险点归类、法理依据检索到按标准体例成稿"),
    AssetSpec("legal-opinion-result", "image103.png", 71, "screenshot", "legallens",
              "法律意见书生成结果",
              "合约智审法律意见书生成结果界面：按标准体例输出的意见书正文，逐条列出风险点与修改建议"),
    AssetSpec("legal-multi-agent", "image104.png", 72, "screenshot", "legallens",
              "多智能体校验界面",
              "合约智审多智能体校验界面：法律专家、风控专家与合规顾问三个角色 AI 引擎并行复核，自动高亮仲裁条款、不可抗力定义等核心风险点并给出修改建议"),
    AssetSpec("legal-simple-review", "image96.png", 66, "screenshot", "legallens",
              "简洁审查 · 对话式跨文档比对",
              "合约智审简洁审查界面：一键上传上下游关联合同后自动向量化解析，用自然语言下达指令即可启动跨文档对比，右侧生成结构化差异分析报表",
              also_on=(73,)),
    AssetSpec("legal-draft-review", "image105.png", 74, "screenshot", "legallens",
              "文稿智审 · 起草阶段的合规校对",
              "合约智审文稿智审界面：集成化编辑面板支持合同条款快速录入与格式调整，AI 引擎实时捕捉文本冗余与逻辑漏洞"),
    AssetSpec("legal-credit-value", "image106.png", 75, "diagram", "legallens",
              "资信审查 · 核心价值输出",
              "示意图：资信审查的三层价值输出，依次为 5 级风险精准量化评级、企业投资脉络与合作网络可视化、面向投资与信贷决策的量化数据支持"),
    AssetSpec("legal-credit-scenarios", "image107.png", 75, "diagram", "legallens",
              "资信审查 · 核心应用场景",
              "示意图：资信审查的核心应用场景分布，覆盖签约主体核查、合作伙伴筛选、投资与信贷决策支持"),
    AssetSpec("legal-credit-engine", "image108.png", 75, "diagram", "legallens",
              "企业知识图谱智能引擎",
              "示意图：以企业知识图谱为核心的智能引擎，将工商、司法、舆情等多源异构数据统一，揭示数据表层之下的深层关联风险"),
    AssetSpec("legal-credit-profile", "image109.png", 76, "screenshot", "legallens",
              "资信审查 · 智能风险画像",
              "合约智审资信审查界面：一键检索企业名称后实时调取工商与司法等外部数据，自动生成企业安全评分与风险等级，全景展示注册资本、经营范围与信用状况"),
    AssetSpec("legal-consistency", "image110.png", 77, "screenshot", "legallens",
              "上下游合同一致性审查",
              "合约智审上下游一致性审查界面：针对背靠背签约场景自动比对上下游合同的价格、工期、付款节点与违约责任，并预置 8 大专家级审查模板"),
    AssetSpec("legal-consistency-report", "image111.png", 78, "screenshot", "legallens",
              "一致性审查报告",
              "合约智审一致性审查报告界面：按价格、交付、违约等主题逐项列出上下游条款差异，附原文证据定位与修改建议"),
    AssetSpec("legal-consistency-config", "image112.png", 78, "screenshot", "legallens",
              "一致性条款配置",
              "合约智审一致性条款配置界面：按项目特性调整审查维度，支持自定义条款与 AI 智能生成两种模式"),
    AssetSpec("legal-vector-params", "image113.png", 79, "screenshot", "legallens",
              "语义检索 · 向量参数设置",
              "合约智审向量参数设置界面：合同上传后自动分块、计算向量并写入索引，支持手动调参与指纹去重"),
    AssetSpec("legal-semantic-search", "image114.png", 79, "screenshot", "legallens",
              "语义检索分析界面",
              "合约智审语义检索分析界面：以可复用的语义检索底座召回高质量证据，支持一对多场景批量对齐"),
    AssetSpec("legal-knowledge-graph", "image115.png", 80, "screenshot", "legallens",
              "知识图谱可视化",
              "合约智审知识图谱界面：自动抽取合同术语、实体、金额与时间等要素，识别定义-引用、条件-后果、约束-例外等条款关系并可视化，风险项自动高亮关联子图"),
    AssetSpec("legal-preference-ui", "image116.png", 81, "screenshot", "legallens",
              "倾向性需求审查 · 使用界面",
              "合约智审倾向性需求审查界面：在审查中加入甲乙方倾向需求，输出兼顾谈判立场与条款可执行性的建议"),
    AssetSpec("legal-preference-arch", "image117.png", 81, "diagram", "legallens",
              "倾向需求功能架构图",
              "架构示意图：倾向需求功能的层次结构，从立场参数录入、审查权重调整到条款可执行性评估"),
    AssetSpec("legal-tech-reasoning", "image119.png", 82, "diagram", "legallens",
              "知识驱动的法律推理（架构示意图）",
              "架构示意图：从合同文本到跨条款结论的语义流水线，依次为语义分块、语义抽取、Neo4j 图谱建模、上下文检索与隐空间推理，叠加双层智能体架构与三类智能体分工"),
    AssetSpec("legal-tech-safety", "image120.png", 83, "diagram", "legallens",
              "可信输出与安全防护（架构示意图）",
              "架构示意图：一次合同审查请求穿过数据层文档本地脱敏、输入层字符劫持防御、模型层激活异常监测、输出层幻觉检测抑制四层防护，任一层不通过即阻断外发"),
    AssetSpec("legal-tech-data", "image121.png", 84, "diagram", "legallens",
              "行业绑定与垂直领域数据沉淀（架构示意图）",
              "架构示意图：数据沉淀飞轮的五步闭环，从行业共建、真实合同脱敏入库、专家背对背标注、领域资产形成到场景复用，并有反馈回流环节"),
]

CASES: list[AssetSpec] = [
    AssetSpec("case-telecom", "image123.jpeg", 95, "photo", "case",
              "通信服务 · 合同审查工作台场景",
              "通信服务行业合同审查场景配图"),
    AssetSpec("case-transportation", "image124.jpeg", 96, "photo", "case",
              "交通基建 · 项目合同链风险穿透场景",
              "交通基础设施项目合同链审查场景配图"),
    # PPT p.97 的 image125.jpeg（庭审现场照）**有意不入库**：
    # 图上有第三方媒体水印「法治聚焦」，且拍到了法官、书记员、代理律师与旁听人员
    # 的可辨识正面 —— 既是他人享有著作权的新闻照片，又涉及《民法典》第 1019 条
    # 肖像权。它在站内没有任何引用点（三张 case-* 都只进清单、不上页面），
    # 却会随 public/ 落到一个稳定可访问的 URL 上。打码治不了著作权，
    # 因此直接不取。见 spec《实施过程发现的方案缺陷》F-10。
]

ASSET_MAP: list[AssetSpec] = [*ARAGONTEAM, *INKCLAW, *LEGALLENS, *CASES]

# 装饰性 SVG 图标：直接复制到 public/media/icon/，不做转码
ICON_MAP: dict[str, str] = {
    "tier-organization": "image38.svg",
    "tier-general": "image37.svg",
    "tier-industry": "image44.svg",
    "shield": "image43.svg",
    "layers": "image45.svg",
    "flow": "image41.svg",
}

# --------------------------------------------------------------------------
# REDACTIONS —— 截图敏感信息打码区（spec §6.4；Subtask #3 人工过审结论）
# --------------------------------------------------------------------------
# PPT 里的产品截图是**真实环境**里截的，77 张中有 9 张带出了不该上公开站的内容：
# 真实企业名与信用评分、真实法定代表人姓名、真实政府采购项目与中标金额、
# 内网服务器 IP、真实个人邮箱、以及会反推出客户身份的楼宇招牌。
#
# 处置口径与 CLAUDE.md §4 / §8 一致：**站点只做能力自述，不披露可识别的第三方**。
# 逐条理由见 `docs/plans/aegiston-corporate-site/spec.md` 的
# 《实施过程发现的方案缺陷》F 组。
#
# 坐标是**归一化**的 `(x0, y0, x1, y1)`，取值 [0, 1]，相对整图左上角。
# 用归一化而不是像素：`shrink_to_budget()` 会按 320 KB 预算逐档降宽重转
# （2560 → 1920 → 1600 → 1280），像素坐标会随之失效，比例不会。
#
# mode:
#   mosaic  区块均值化（默认）。块大小取区域短边的 1/6，信息**不可逆**地丢失，
#           不是高斯模糊那种能被反卷积恢复的处理。
#   fill    实心中性色块。用于必须完全抹掉、且不需要保留「这里原本有内容」
#           这一视觉暗示的地方。
REDACTION_MODES = ("mosaic", "fill")


@dataclass(frozen=True)
class RedactRegion:
    x0: float
    y0: float
    x1: float
    y1: float
    mode: str = "mosaic"
    note: str = ""

    def __post_init__(self) -> None:
        if self.mode not in REDACTION_MODES:
            raise ValueError(f"未知打码模式 {self.mode!r}，可选 {REDACTION_MODES}")
        if not (0.0 <= self.x0 < self.x1 <= 1.0 and 0.0 <= self.y0 < self.y1 <= 1.0):
            raise ValueError(f"打码区越界或反向：{(self.x0, self.y0, self.x1, self.y1)}")


REDACTIONS: dict[str, tuple[RedactRegion, ...]] = {
    # 合同一致性审查报告：整屏都是真实政府采购项目的合同原文 ——
    # 项目名与编号、发包方/承包方/鉴证方三家实名公司、两位真实法定代表人、
    # 注册地址，以及 38,081,354.82 / 36,739,576 两个真实合同金额；
    # 底部风险结论还直接写了「利益输送嫌疑」。这一段既是客户机密，
    # 又是对实名主体的负面评价，两头都不能留。
    # 保留报告骨架（标题、上下游双栏、风险等级徽标），足以说明能力。
    "legal-consistency-report": (
        RedactRegion(0.040, 0.325, 0.500, 0.742, note="上游源条款原文：实名甲乙方 + 法定代表人 + 注册地址"),
        RedactRegion(0.515, 0.325, 0.992, 0.742, note="下游匹配条款原文：政府采购项目名与编号 + 中标金额"),
        RedactRegion(0.100, 0.895, 0.965, 0.985, note="风险结论段：实名主体 + 金额 + 利益输送嫌疑表述"),
    ),
    # 法律意见书：抬头、事项、正文都点名了委托方与相对方，
    # 还写明了「公开招标确定为中标人」这一交易事实。
    # 只留「法律意见书 / （正文）/ 一、二、三」的版式骨架。
    "legal-opinion-result": (
        RedactRegion(0.085, 0.255, 0.415, 0.500, note="左页标题块：委托方 + 相对方 + 合同名"),
        RedactRegion(0.560, 0.000, 0.990, 0.060, note="致：实名委托方"),
        RedactRegion(0.560, 0.130, 0.990, 0.235, note="事项：实名双方 + 合同名"),
        RedactRegion(0.575, 0.390, 0.990, 0.510, note="正文首段：实名双方"),
        RedactRegion(0.575, 0.605, 0.990, 0.775, note="合同签订背景段：实名双方 + 招投标结果"),
    ),
    # 企业资信对比：三家实名公司被打上 98 / 79「可控」/ 62「关注」的信用分。
    # 对具名主体的负面评价性内容不上公开页 —— 与 CLAUDE.md §4
    # 「竞品对照表不上公开页」同一条法律理由（《反不正当竞争法》第十一条）。
    "legal-credit-engine": (
        RedactRegion(0.050, 0.150, 0.290, 0.255, note="对比卡 1 企业名"),
        RedactRegion(0.335, 0.150, 0.580, 0.255, note="对比卡 2 企业名"),
        RedactRegion(0.670, 0.150, 0.920, 0.255, note="对比卡 3 企业名"),
        RedactRegion(0.050, 0.665, 0.315, 0.750, note="详情行企业名"),
    ),
    # 企业资信详情：实名公司 + 真实法定代表人姓名 + 统一社会信用代码。
    # 姓名是《个保法》口径下的个人信息，信用代码可唯一定位主体。
    "legal-credit-profile": (
        RedactRegion(0.205, 0.430, 0.355, 0.495, note="被查询企业名"),
        RedactRegion(0.758, 0.706, 0.848, 0.748, note="法定代表人姓名"),
        RedactRegion(0.755, 0.882, 0.895, 0.925, note="统一社会信用代码"),
    ),
    # 审查报告页的「合作方资信审查」两行实名公司。
    "legal-review-result": (
        RedactRegion(0.215, 0.742, 0.360, 0.802, note="合作方 1 实名"),
        RedactRegion(0.580, 0.742, 0.750, 0.802, note="合作方 2 实名"),
    ),
    # 浏览器地址栏暴露了内网服务器 IP（且是明文 HTTP），
    # 左栏合同文件名带出了真实客户项目名。
    "legal-consistency": (
        RedactRegion(0.088, 0.005, 0.265, 0.055, note="地址栏内网 IP"),
        RedactRegion(0.042, 0.365, 0.166, 0.448, note="甲方合同文件名：真实客户项目"),
    ),
    "legal-simple-review": (
        RedactRegion(0.088, 0.005, 0.265, 0.055, note="地址栏内网 IP"),
        RedactRegion(0.450, 0.378, 0.595, 0.428, note="真实合同编号"),
        RedactRegion(0.330, 0.885, 0.490, 0.945, note="附件名：真实客户项目"),
    ),
    # 团队成员表的邮箱列是真实个人邮箱。CLAUDE.md §8 要求邮箱一律脱敏，
    # 这条约束对页面上的截图同样成立。
    "ara-members": (
        RedactRegion(0.378, 0.295, 0.515, 0.735, note="成员邮箱列：真实个人邮箱"),
    ),
    # 楼宇招牌能直接反推出客户身份，与站点正文「某省通信服务分公司」的
    # 脱敏口径冲突（CLAUDE.md §4）。
    "case-telecom": (
        RedactRegion(0.240, 0.575, 0.560, 0.815, note="楼宇招牌：可识别客户名"),
    ),
}


def redaction_fingerprint() -> str:
    """打码规格指纹。写进 media_manifest.json，供 `redact.py --check` 比对。

    改了 REDACTIONS 却没重跑脚本，CI 就会红 —— 避免「规则改了、图没改」。
    """
    import hashlib

    parts = []
    for asset_id in sorted(REDACTIONS):
        for r in REDACTIONS[asset_id]:
            parts.append(f"{asset_id}:{r.x0:.4f},{r.y0:.4f},{r.x1:.4f},{r.y1:.4f},{r.mode}")
    return hashlib.sha256("|".join(parts).encode("utf-8")).hexdigest()[:16]


# EMF 架构图不做光栅化：用 React + 内联 SVG 重绘（spec §6.4）
EMF_REDRAWN = {"image94.emf": "LegalLensArchitecture (frontend/src/components/content)"}


def by_id() -> dict[str, AssetSpec]:
    return {a.asset_id: a for a in ASSET_MAP}


if __name__ == "__main__":  # pragma: no cover - 手工核对入口
    seen: set[str] = set()
    for spec in ASSET_MAP:
        assert spec.asset_id not in seen, f"duplicate asset_id: {spec.asset_id}"
        seen.add(spec.asset_id)
    kinds: dict[str, int] = {}
    for spec in ASSET_MAP:
        kinds[spec.kind] = kinds.get(spec.kind, 0) + 1
    print(f"ASSET_MAP entries: {len(ASSET_MAP)}")
    print(f"by kind: {kinds}")
