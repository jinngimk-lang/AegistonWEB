"""线索服务：创建 / 查询 / 导出，含 L2 配额与 L4 幂等。

L2 与 L4 都直接查 ``leads`` 表，而不是维护一份独立计数器 —— 表天然被所有 worker
共享且持久，比内存计数器更不容易漂移（spec §7.3.1）。
"""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlmodel import col, select
from sqlmodel.ext.asyncio.session import AsyncSession
from ulid import ULID

from app.core.logging import get_logger, mask_email, mask_phone
from app.models.lead import Lead
from app.schemas.lead import INTENT_LABELS, LeadCreate, LeadCreated, LeadRead

logger = get_logger("aegiston.leads")

CST = timezone(timedelta(hours=8))


def now_cst() -> datetime:
    return datetime.now(CST)


def as_cst(value: datetime) -> datetime:
    """SQLite 不保存时区，读回来的是 naive datetime。

    §8.1 约定 ``created_at`` 是「ISO8601 +08:00」，所以出参前统一补回 +08:00，
    否则同一条线索在「首次创建」和「幂等重放」两条路径上会给出不同格式的时间戳。
    """
    return value if value.tzinfo is not None else value.replace(tzinfo=CST)


def new_lead_id() -> str:
    return f"ld_{ULID()}"


class QuotaExceeded(Exception):
    def __init__(self, layer: str, retry_after: int, message: str) -> None:
        super().__init__(message)
        self.layer = layer
        self.retry_after = retry_after
        self.message = message


class LeadService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------------ L2
    async def check_contact_quota(
        self, contact_hash: str, *, per_hour: int, per_day: int
    ) -> None:
        now = now_cst()
        hour_count = await self._count_since(contact_hash, now - timedelta(hours=1))
        if hour_count >= per_hour:
            raise QuotaExceeded(
                "L2-hour",
                3600,
                "该联系方式的提交已达上限，请直接致电商务或发送邮件，我们会尽快联系您。",
            )
        day_count = await self._count_since(contact_hash, now - timedelta(days=1))
        if day_count >= per_day:
            raise QuotaExceeded(
                "L2-day",
                86400,
                "该联系方式今日提交已达上限，请直接致电商务或发送邮件，我们会尽快联系您。",
            )

    async def _count_since(self, contact_hash: str, since: datetime) -> int:
        stmt = (
            select(func.count())
            .select_from(Lead)
            .where(col(Lead.contact_hash) == contact_hash, col(Lead.created_at) >= since)
        )
        return int((await self.session.exec(stmt)).one())

    # ------------------------------------------------------------------ L4
    async def find_recent_duplicate(
        self, contact_hash: str, intent: str, product: str | None, window_seconds: int
    ) -> Lead | None:
        since = now_cst() - timedelta(seconds=window_seconds)
        stmt = (
            select(Lead)
            .where(
                col(Lead.contact_hash) == contact_hash,
                col(Lead.intent) == intent,
                col(Lead.product) == product,
                col(Lead.created_at) >= since,
            )
            .order_by(col(Lead.created_at).desc())
            .limit(1)
        )
        return (await self.session.exec(stmt)).first()

    # --------------------------------------------------------------- create
    async def create(
        self,
        payload: LeadCreate,
        *,
        contact_hash: str,
        ip_hash: str | None,
        user_agent: str | None,
        request_id: str | None,
    ) -> LeadCreated:
        now = now_cst()
        lead = Lead(
            id=new_lead_id(),
            name=payload.name,
            company=payload.company,
            title=payload.title,
            phone=payload.phone,
            email=str(payload.email) if payload.email else None,
            intent=payload.intent,
            product=payload.product,
            message=payload.message,
            consent=payload.consent,
            source_path=payload.source_path,
            utm=json.dumps(payload.utm, ensure_ascii=False) if payload.utm else None,
            ip_hash=ip_hash,
            contact_hash=contact_hash,
            user_agent=(user_agent or "")[:400] or None,
            request_id=request_id,
            status="new",
            created_at=now,
            updated_at=now,
        )
        self.session.add(lead)
        await self.session.commit()
        logger.info(
            "lead_created",
            lead_id=lead.id,
            intent=lead.intent,
            product=lead.product or "-",
            company_len=len(lead.company),
        )
        return LeadCreated(id=lead.id, created_at=as_cst(lead.created_at), duplicate=False)

    # ---------------------------------------------------------------- query
    async def list_leads(
        self,
        *,
        page: int,
        page_size: int,
        intent: str | None = None,
        since: datetime | None = None,
    ) -> tuple[list[LeadRead], int]:
        conditions = []
        if intent:
            conditions.append(col(Lead.intent) == intent)
        if since:
            conditions.append(col(Lead.created_at) >= since)

        count_stmt = select(func.count()).select_from(Lead)
        rows_stmt = select(Lead)
        for cond in conditions:
            count_stmt = count_stmt.where(cond)
            rows_stmt = rows_stmt.where(cond)

        total = int((await self.session.exec(count_stmt)).one())
        rows_stmt = (
            rows_stmt.order_by(col(Lead.created_at).desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        rows = (await self.session.exec(rows_stmt)).all()
        return [to_read(r) for r in rows], total

    async def export_csv(self) -> str:
        rows = (
            await self.session.exec(
                select(Lead).order_by(col(Lead.created_at).desc())
            )
        ).all()
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            ["id", "created_at", "name", "company", "title", "phone", "email",
             "intent", "product", "message", "source_path", "status"]
        )
        for r in rows:
            writer.writerow([
                r.id, as_cst(r.created_at).isoformat(), r.name, r.company, r.title or "",
                mask_phone(r.phone), mask_email(r.email or ""), r.intent, r.product or "",
                (r.message or "").replace("\n", " "), r.source_path or "", r.status,
            ])
        return buf.getvalue()


def to_read(lead: Lead) -> LeadRead:
    """管理接口出参一律脱敏。原文只在数据库里，供业务导出后在 CRM 处理。"""
    return LeadRead(
        id=lead.id,
        name=lead.name,
        company=lead.company,
        title=lead.title,
        phone=mask_phone(lead.phone),
        email=mask_email(lead.email) if lead.email else None,
        intent=lead.intent,  # type: ignore[arg-type]
        intent_label=INTENT_LABELS.get(lead.intent, lead.intent),
        product=lead.product,  # type: ignore[arg-type]
        message=lead.message,
        source_path=lead.source_path,
        status=lead.status,  # type: ignore[arg-type]
        created_at=as_cst(lead.created_at),
    )
