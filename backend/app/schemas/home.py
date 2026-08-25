"""首页聚合模型 —— 与 ``ref/1.html`` 的区块一一对应（spec §3.2）。

区块顺序即 ref 的 DOM 顺序：hero → domains → solutions → philosophy →
metrics → news → sustain → cta。像素级沿用，只替换文案与图片。
"""

from __future__ import annotations

from pydantic import Field

from app.schemas.common import CamelModel, CtaBlock, FeatureItem, HomeMetric, LinkItem
from app.schemas.insight import InsightSummary


class TitleSegment(CamelModel):
    """标题片段。``em`` 为真时渲染为 ref 的 ``.section-title .em``（企业主色）。"""

    text: str
    em: bool = False
    line_break_after: bool = False


class HeroBlock(CamelModel):
    eyebrow: str
    title_lead: str = Field(description="ref: 「以智能之眼」")
    title_prefix: str = Field(description="ref: 「守」")
    title_em: str = Field(description="ref: 「数字之安」，渲染为 .em")
    subtitle: str
    primary: LinkItem
    secondary: LinkItem
    media: str | None = None


class DomainCard(CamelModel):
    id: str
    title: str
    title_en: str
    description: str
    href: str
    media: str | None = None
    photo_class: str = Field(description="ref 的 .domain-photo-a/-b/-c/-d")


class SolutionRow(CamelModel):
    id: str
    code: str = Field(description="ref .solution-code，如 ARA · 01")
    category: str
    title: str
    title_en: str
    description: str
    points: list[str]
    primary: LinkItem
    secondary: LinkItem | None = None
    media: str
    vlabel: str


class ValueCard(CamelModel):
    num: str = Field(description="ref .value-num，如 「01 / 使 命」")
    title: str
    title_en: str
    description: str
    quote: str


class SustainBlock(CamelModel):
    eyebrow: str
    title_lead: str
    title_em: str
    description: str
    points: list[FeatureItem]
    action: LinkItem
    media: str | None = None


class HomePage(CamelModel):
    hero: HeroBlock
    domains_eyebrow: str
    domains_title_lead: str
    domains_title_em: str
    domains_desc: str
    domains_more: LinkItem
    domains: list[DomainCard]

    solutions_eyebrow: str
    solutions_title_lead: str
    solutions_title_em: str
    solutions_title_tail: str = ""
    solutions_desc: str
    solutions: list[SolutionRow]

    philosophy_eyebrow: str
    philosophy_title: list[TitleSegment] = Field(
        description="分段标题。em=true 的段渲染为 ref 的 .section-title .em，"
        "不使用 dangerouslySetInnerHTML"
    )
    philosophy_desc: str
    values: list[ValueCard]

    metrics: list[HomeMetric]

    news_eyebrow: str
    news_title_lead: str
    news_title_em: str
    news_desc: str
    news_more: LinkItem
    insights_preview: list[InsightSummary] = []

    sustain: SustainBlock
    cta: CtaBlock
    source_slides: list[int] = []
