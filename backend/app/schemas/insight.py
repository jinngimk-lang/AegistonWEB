"""洞察与动态。正文是受限 Markdown，渲染后经 bleach 白名单净化。"""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel

InsightCategory = Literal["insight", "news", "research"]

CATEGORY_LABELS: dict[str, str] = {
    "insight": "行业洞察",
    "news": "公司动态",
    "research": "研究进展",
}


class InsightSummary(CamelModel):
    slug: str
    title: str
    category: InsightCategory
    category_label: str
    excerpt: str
    published_at: date
    reading_minutes: int = 5
    hero_media: str | None = None
    href: str
    source_slides: list[int] = []


class InsightDetail(InsightSummary):
    body_html: str = Field(description="Markdown 渲染并经 bleach 白名单净化后的 HTML")
    sources: list[str] = Field(default_factory=list, description="资料来源，逐条来自 PPT 标注")


class InsightIndexEntry(CamelModel):
    """`content/insights/index.json` 的一行。正文在 `posts/<slug>.md`。"""

    slug: str
    title: str
    category: InsightCategory
    excerpt: str
    published_at: date
    hero_media: str | None = None
    source_slides: list[int] = []
    sources: list[str] = []
