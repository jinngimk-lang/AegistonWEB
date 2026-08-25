"""关于我们：公司简介 / 定位 / 科研实力 / 团队。"""

from __future__ import annotations

from pydantic import Field

from app.schemas.common import CamelModel, CtaBlock, FeatureItem, Metric


class CompanyFact(CamelModel):
    label: str
    body: str


class ProductTierBrief(CamelModel):
    tier: str
    name: str
    href: str


class AboutPage(CamelModel):
    eyebrow: str
    title: str
    lead: str
    hero_media: str | None = None
    intro: str
    facts: list[CompanyFact] = []
    focus: str
    positioning_title: str
    positioning_lead: str
    positioning_body: str
    tiers: list[ProductTierBrief] = []
    metrics: list[Metric] = []
    strength_title: str
    strength_lead: str
    strength: list[FeatureItem] = []
    cta: CtaBlock
    source_slides: list[int] = []


class TeamMember(CamelModel):
    name: str
    role: str
    degree: str | None = None
    bio: list[str] = []
    highlights: list[str] = []


class TeamPage(CamelModel):
    eyebrow: str
    title: str
    lead: str
    hero_media: str | None = None
    origin: list[str] = Field(default_factory=list, description="团队来源与依托（p.88）")
    leader: TeamMember
    leader_roles: list[str] = Field(default_factory=list, description="主要社会兼职（p.90）")
    members: list[TeamMember] = []
    metrics: list[Metric] = []
    cta: CtaBlock
    source_slides: list[int] = []


class CareersPage(CamelModel):
    eyebrow: str
    title: str
    lead: str
    hero_media: str | None = None
    why: list[FeatureItem] = []
    openings: list[FeatureItem] = []
    process: list[str] = []
    contact_note: str
    cta: CtaBlock
    source_slides: list[int] = []
