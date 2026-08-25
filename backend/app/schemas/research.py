"""技术与研究模型：11 项核心技术模块 + 5 篇论文。"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel, CtaBlock, Metric


class TechPillar(CamelModel):
    id: str
    product: Literal["aragonteam", "inkclaw", "legallens"]
    product_label: str
    title: str
    lead: str = Field(description="一句话导语")
    uncertainty: str = Field(description="被收敛的不确定性 / 要处理的运行事实")
    uncertainty_label: str = "被收敛的不确定性"
    mechanism: str = Field(description="核心机制")
    parameters: list[str] = Field(default_factory=list, description="关键设计与工程参数")
    value: str = Field(description="工程价值")
    highlights: list[Metric] = []
    media: str | None = Field(default=None, description="MediaAsset.id")
    source_slides: list[int] = []


class Paper(CamelModel):
    id: str
    title: str
    title_en: str
    venue: str = Field(description='"ASE 2026" / "arXiv 预印本"')
    tier: str | None = Field(default=None, description='"CCF-A"')
    summary: str
    problem: str
    method: str
    result: str
    benchmarks: list[str] = []
    maps_to: list[str] = Field(default_factory=list, description="对应 TechPillar.id")
    products: list[str] = []
    landing: str | None = Field(default=None, description="落点：支撑产品的哪个模块")
    source_slides: list[int] = []


class ResearchOverview(CamelModel):
    eyebrow: str
    title: str
    description: str
    hero_media: str | None = None
    pillars: list[TechPillar]
    highlights: list[Metric] = []
    footnote: str
    cta: CtaBlock
    source_slides: list[int] = []


class PapersPage(CamelModel):
    eyebrow: str
    title: str
    description: str
    papers: list[Paper]
    highlights: list[Metric] = []
    footnote: str
    cta: CtaBlock
    source_slides: list[int] = []
