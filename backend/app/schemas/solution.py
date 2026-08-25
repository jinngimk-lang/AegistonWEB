"""行业实践模型。

⚠️ 内容风险（spec C3 / content-notes.md §1、§3）：
* 效能数字统一采用 **p.95 / p.96** 口径（客户案例章节，视为更新版本），
  每一条都带 ``source`` 标注页码；与 p.84 不一致处已在 content-notes 立档。
* 客户名一律脱敏（「某省交控集团」「某头部律师事务所」），
  中通服因 p.94 已作为战略合作伙伴公开具名而保留，仍标 ``pendingConfirmation``。
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel, CtaBlock, Metric

SolutionSlug = Literal["telecom", "transportation", "legal-services", "finance"]


class CaseMetric(Metric):
    before: str | None = Field(default=None, description='对照基线，如 "原 3.5 小时/份"')


class SolutionSummary(CamelModel):
    slug: SolutionSlug
    industry: str
    customer: str
    summary: str
    deployment: str
    hero_media: str | None = None
    href: str
    headline_metrics: list[CaseMetric] = []
    source_slides: list[int] = []


class SolutionDetail(CamelModel):
    slug: SolutionSlug
    industry: str
    customer: str
    eyebrow: str
    lead: str
    hero_media: str | None = None
    deployment: str = Field(description="部署形态")
    scope: list[str] = Field(default_factory=list, description="覆盖范围")
    workflow: list[str] = Field(default_factory=list, description="使用方式")
    closure: list[str] = Field(default_factory=list, description="项目闭环 / 复制路径")
    closure_title: str = "项目闭环"
    difficulty: list[str] = Field(default_factory=list, description="场景为什么难（p.84）")
    assets: list[str] = Field(default_factory=list, description="沉淀下来的领域资产（p.84）")
    metrics: list[CaseMetric] = []
    takeaway: str = Field(description="落地要点")
    related_product: str | None = None
    pending_confirmation: list[str] = []
    cta: CtaBlock
    source_slides: list[int] = []


class SolutionsOverview(CamelModel):
    eyebrow: str
    title: str
    description: str
    partner_title: str
    partner_name: str
    partner_desc: str
    solutions: list[SolutionSummary]
    method: list[str] = Field(default_factory=list, description="同一套实施方法")
    footnote: str
    cta: CtaBlock
    source_slides: list[int] = []
