"""线索表（唯一的持久化表，spec §8.1）。

合规要求：不存明文 IP（只存 ``sha256(ip + SECRET_SALT)``）；``phone`` / ``email``
在日志与管理接口中脱敏；``contact_hash`` 供 L2 配额与 L4 幂等使用，不可反查。
"""

from __future__ import annotations

from datetime import datetime

from sqlmodel import Field, SQLModel


class Lead(SQLModel, table=True):
    __tablename__ = "leads"

    id: str = Field(primary_key=True, description="ULID，前缀 ld_")
    name: str
    company: str
    title: str | None = None
    phone: str
    email: str | None = None
    intent: str = Field(index=True)
    product: str | None = None
    message: str | None = None
    consent: bool = False
    source_path: str | None = None
    utm: str | None = Field(default=None, description="JSON 字符串")
    ip_hash: str | None = Field(default=None, description="sha256(ip + SECRET_SALT)，不存明文")
    contact_hash: str = Field(default="", index=True, description="sha256(手机号或邮箱 + SALT)")
    user_agent: str | None = None
    request_id: str | None = None
    status: str = Field(default="new", index=True)
    created_at: datetime = Field(index=True)
    updated_at: datetime
