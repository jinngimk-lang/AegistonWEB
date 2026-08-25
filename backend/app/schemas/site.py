"""站点设置与导航（spec §3.1）。

导航是**路由的单一事实源之一**：`ROUTES` 常量、导航数据、`sitemap.ts`、
`routes.spec.ts` 四者始终同源。删路由就是删一处（spec §14 硬约束 2）。
"""

from __future__ import annotations

from pydantic import Field

from app.schemas.common import CamelModel, LinkItem


class ContactInfo(CamelModel):
    business_email: str
    careers_email: str
    phone: str | None = None
    address: str | None = None
    working_hours: str | None = None


class NavGroup(CamelModel):
    label: str
    href: str | None = Field(
        default=None,
        description="主菜单项自身是否可点击。为 None 时只作为下拉容器（spec P2-6）",
    )
    items: list[LinkItem] = []


class Navigation(CamelModel):
    utility_left: list[LinkItem] = []
    utility_right: list[LinkItem] = []
    main: list[NavGroup] = []
    cta: LinkItem
    footer_columns: list[NavGroup] = []
    footer_legal: list[LinkItem] = []


class SiteSettings(CamelModel):
    name_cn: str
    name_en: str
    legal_name: str
    tagline: str
    description: str
    keywords: list[str] = []
    contact: ContactInfo
    icp: str | None = Field(
        default=None,
        description="ICP 备案号。为空时页脚不渲染该行（spec R9），上线前由客户填入",
    )
    copyright_year: int
    founded_note: str | None = None
    pending_confirmation: list[str] = Field(
        default_factory=list,
        description="待客户/法务书面确认的条目（spec §15 / C3），validate_content 会输出告警",
    )


class SitePayload(CamelModel):
    settings: SiteSettings
    navigation: Navigation
