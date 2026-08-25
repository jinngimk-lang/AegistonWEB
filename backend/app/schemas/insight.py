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


class TocItem(CamelModel):
    """正文目录的一项（v3 spec §4.3.1）。

    ``anchor`` 用 ``sec-{序号}`` 而不是标题 slug：中文标题 slug 化只有两条路 ——
    保留中文（URL 里变成一串 percent-encoding，分享出去不可读，且不同浏览器
    复制行为不一致）或转拼音（引入词典依赖且同音歧义）。序号锚点稳定、短、
    可预测；代价是正文重排会让旧锚点失效，由 runbook 的编辑约定兜底（R10）。

    ``level`` 只收 2 / 3：目录只展示两级。h4 仍会被注入 ``sub-N``（供正文内部
    引用），但不进目录 —— 这样「``bodyHtml`` 中 ``id="sec-N"`` 的数量 == len(toc)」
    这条断言才是精确的。
    """

    level: Literal[2, 3]
    text: str
    anchor: str = Field(pattern=r"^sec-\d+$")


class InsightDetail(InsightSummary):
    body_html: str = Field(description="Markdown 渲染并经 bleach 白名单净化后的 HTML")
    sources: list[str] = Field(default_factory=list, description="资料来源，逐条来自 PPT 标注")

    # --- 以下四个是**派生字段**（v3 spec §5.1）------------------------------
    # 内容包 schema 用 extra="forbid"，所以它们不能出现在 index.json / *.md 里，
    # 必须由 ContentRepository._load_insights() 在加载时算出后注入。
    toc: list[TocItem] = Field(default_factory=list, description="正文 h2/h3 目录")
    related: list[InsightSummary] = Field(default_factory=list, description="相关阅读 ≤ 3 篇")
    prev: InsightSummary | None = Field(default=None, description="按发布时间降序的前一篇")
    next: InsightSummary | None = Field(default=None, description="按发布时间降序的后一篇")


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
