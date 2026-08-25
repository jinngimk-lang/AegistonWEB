"""线索（Lead）契约 —— 官网唯一的写路径（spec §7.3）。"""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import EmailStr, Field, field_validator, model_validator

from app.schemas.common import CamelModel

LeadIntent = Literal["demo", "consult", "trial", "partner", "career"]
LeadProduct = Literal["aragonteam", "inkclaw", "legallens", "platform"]
LeadStatus = Literal["new", "contacted", "qualified", "closed"]

_CN_MOBILE = re.compile(r"^1[3-9]\d{9}$")
_INTL_PHONE = re.compile(r"^\+?[0-9\-\s]{7,20}$")
_TAG_RE = re.compile(r"<[^>]*>")

INTENT_LABELS: dict[str, str] = {
    "demo": "预约产品演示",
    "consult": "商务咨询",
    "trial": "申请试用",
    "partner": "生态合作",
    "career": "加入我们",
}


class LeadCreate(CamelModel):
    name: str = Field(min_length=2, max_length=40)
    company: str = Field(min_length=2, max_length=80)
    title: str | None = Field(default=None, max_length=40)
    phone: str
    email: EmailStr | None = None
    intent: LeadIntent
    product: LeadProduct | None = None
    message: str | None = Field(default=None, max_length=1000)
    consent: bool
    website: str = Field(default="", description="honeypot：非空即视为机器人")
    source_path: str | None = Field(default=None, max_length=200)
    utm: dict[str, str] | None = None

    @field_validator("phone")
    @classmethod
    def _check_phone(cls, v: str) -> str:
        v = v.strip()
        if not (_CN_MOBILE.match(v) or _INTL_PHONE.match(v)):
            raise ValueError("手机号格式不正确")
        return v

    @field_validator("message")
    @classmethod
    def _strip_html(cls, v: str | None) -> str | None:
        return _TAG_RE.sub("", v).strip() if v else v

    @field_validator("consent")
    @classmethod
    def _require_consent(cls, v: bool) -> bool:
        if not v:
            # 《个人信息保护法》第十四条：处理个人信息应取得个人的同意
            raise ValueError("需要勾选同意《个人信息保护政策》后才能提交")
        return v

    @model_validator(mode="after")
    def _need_a_contact(self) -> LeadCreate:
        if not self.phone and not self.email:
            raise ValueError("手机号与邮箱至少填写一项")
        return self


class LeadCreated(CamelModel):
    id: str
    created_at: datetime
    duplicate: bool = Field(
        default=False,
        description="L4 幂等：10 分钟内的重复提交返回首次的 id，不产生重复线索",
    )


class LeadRead(CamelModel):
    id: str
    name: str
    company: str
    title: str | None = None
    phone: str = Field(description="已脱敏：138****0000")
    email: str | None = Field(default=None, description="已脱敏：z***@example.com")
    intent: LeadIntent
    intent_label: str
    product: LeadProduct | None = None
    message: str | None = None
    source_path: str | None = None
    status: LeadStatus
    created_at: datetime
