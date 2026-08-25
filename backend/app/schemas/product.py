"""产品模型：三层产品（组织级 / 通用级 / 行业级）+ 交付形态页。"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import (
    CamelModel,
    CtaBlock,
    FeatureGroup,
    FeatureItem,
    LocalizedText,
    Metric,
    ScreenSection,
)

ProductSlug = Literal["aragonteam", "inkclaw", "legallens"]
ProductTier = Literal["organization", "general", "industry"]


class ProductSummary(CamelModel):
    slug: ProductSlug
    tier: ProductTier
    tier_label: str
    name_cn: str
    name_en: str
    tagline: str
    positioning: str
    audience: str = Field(description="解决谁的问题")
    differentiator: str = Field(description="关键差异")
    capabilities: list[str] = Field(default_factory=list, description="典型能力")
    customer_value: str
    delivery: str = Field(description="交付形态")
    hero_media: str | None = None
    href: str
    source_slides: list[int] = []


class ProductDetail(CamelModel):
    slug: ProductSlug
    tier: ProductTier
    tier_label: str
    name_cn: str
    name_en: str
    code: str = Field(description="ref .solution-code 样式的产品代号，如 ARA · 01")
    tagline: str
    tagline_localized: LocalizedText | None = Field(
        default=None,
        description="v2 英文站预留。v1 只填 zh（spec §2.2 / P2-3）",
    )
    positioning: str
    hero_media: str | None = None
    background: list[FeatureItem] = Field(default_factory=list, description="四重困境 / 五类风险")
    core_values: list[FeatureItem] = Field(default_factory=list, description="五条 / 六条核心价值")
    feature_groups: list[FeatureGroup] = []
    screens: list[ScreenSection] = Field(default_factory=list, description="界面导览")
    highlights: list[Metric] = []
    pillars: list[str] = Field(default_factory=list, description="TechPillar.id")
    papers: list[str] = Field(default_factory=list, description="Paper.id")
    delivery: list[str] = []
    cta: CtaBlock
    source_slides: list[int] = []


class DeliveryForm(CamelModel):
    index: str = Field(description="Ⅰ / Ⅱ / Ⅲ")
    name: str
    points: list[str]
    fit: str = Field(description="适用场景")
    media: str | None = None


class DeploymentPage(CamelModel):
    title: str
    lead: str
    eyebrow: str
    hero_media: str | None = None
    policy: list[FeatureItem] = Field(default_factory=list, description="政策与合规 · 准入门槛")
    readiness: list[FeatureItem] = Field(default_factory=list, description="技术前提 · 已经具备")
    forms: list[DeliveryForm] = []
    conclusion: str
    cta: CtaBlock
    source_slides: list[int] = []


class CapabilityCell(CamelModel):
    """能力矩阵的一格。

    ⚠️ 合规设计（CLAUDE.md §4）：取值只有三档，**没有 ``roadmap``（规划中）**——
    前瞻性表述在《广告法》语境下是承诺，且 PPT 里没有可溯源的路线图口径。
    没有的能力就是 ``none``，页面上渲染为「—」而不是 ✗ 或任何否定性图形：
    同一家公司的产品分层是**定位差异**，不是优劣评价（决策 A-7）。
    """

    product_slug: ProductSlug
    level: Literal["core", "supported", "none"]
    detail: str | None = Field(default=None, max_length=60)


class CapabilityRow(CamelModel):
    capability: str
    note: str | None = None
    cells: list[CapabilityCell] = Field(min_length=3, max_length=3)
    source_slides: list[int] = Field(min_length=1, description="内容溯源，必填且页面上渲染")


class CapabilityMatrix(CamelModel):
    """三个自家产品的横向能力对照。**不含任何第三方主体**（CLAUDE.md §4）。"""

    title: str
    description: str | None = None
    rows: list[CapabilityRow] = Field(min_length=4)
    source_note: str = Field(description="页面上实际渲染的溯源说明")


class ProductsOverview(CamelModel):
    eyebrow: str
    title: str
    description: str
    products: list[ProductSummary]
    foundation_title: str
    foundation_desc: str
    foundation: list[FeatureItem] = Field(default_factory=list, description="四类企业级要件")
    footnote: str
    cta: CtaBlock
    source_slides: list[int] = []
    # 派生字段：由 ContentRepository.load() 从 products/capability-matrix.json 注入。
    # 可选 —— 矩阵尚未定稿时不阻塞其他页面（v3 spec §5.1）。
    capability_matrix: CapabilityMatrix | None = None
