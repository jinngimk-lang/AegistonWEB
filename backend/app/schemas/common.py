"""通用基类与共享模型。

对外字段一律 camelCase（``alias_generator=to_camel``, ``populate_by_name=True``），
内容包 JSON 里既可以写 snake_case 也可以写 camelCase，反序列化都吃得下。
"""

from __future__ import annotations

from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
        str_strip_whitespace=True,
    )


class LocalizedText(CamelModel):
    """为 v2 英文站预留的本地化文本。

    v1 只填 ``zh``；``en`` 留空。使用位置见 ``ProductDetail.tagline_i18n`` 等
    带 ``_i18n`` 后缀的字段（spec P2-3：不能只定义不使用）。
    """

    zh: str
    en: str | None = None


class Page(CamelModel, Generic[T]):
    """分页包络（spec P2-4）。"""

    items: list[T]
    total: int
    page: int
    page_size: int
    has_next: bool


class Metric(CamelModel):
    value: str = Field(description='头条数字，如 "20+" / "全国第 1"')
    unit: str | None = Field(default=None, description="ref 中 .unit 小字")
    label: str
    note: str | None = Field(
        default=None,
        description="归属说明。首页 .metrics 场景下必填并实际渲染（spec §3.2 合规约束）",
    )
    source: str | None = Field(default=None, description='内容溯源，如 "PPT p.93"')


class HomeMetric(Metric):
    """首页头条数字。``note`` 必填 —— 见 spec §3.2「第三个指标的合规约束」。

    PPT p.93 的「全国第 1」是**西安电子科技大学**的学科评估结果，不是本公司排名。
    把它与「20+ 博士硕士」并列且不加说明，会触及《广告法》第九条与第二十八条。
    因此 schema 层强制 note 必填，页面上以 --ink-2 / 12px 实际渲染。
    """

    note: str = Field(min_length=2)


class CtaBlock(CamelModel):
    title: str
    description: str | None = None
    primary_label: str
    primary_href: str
    secondary_label: str | None = None
    secondary_href: str | None = None


class FeatureItem(CamelModel):
    index: str = Field(description='序号，如 "01"')
    title: str
    description: str
    icon: str | None = None


class FeatureGroup(CamelModel):
    title: str
    count_label: str | None = Field(default=None, description='如 "2 项"')
    items: list[FeatureItem]


class ScreenSection(CamelModel):
    """界面导览的一屏：左文右图（或反向）。"""

    id: str
    eyebrow: str
    title: str
    description: str | None = None
    points: list[str] = []
    media_id: str
    layout: Literal["left", "right"] = "left"
    source_slide: int | None = None


class LinkItem(CamelModel):
    label: str
    href: str
    external: bool = False
    note: str | None = Field(default=None, description="ref 中 .submenu a .ext 的小字")


class SourceRef(CamelModel):
    """内容溯源。G2「内容 100% 来自 PPT V7」的落点。"""

    label: str
    slides: list[int] = []
