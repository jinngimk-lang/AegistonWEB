"""线索端点 —— 官网唯一的写路径（spec §7.3、§7.3.1）。

四层反滥用一次都不能少：
* **L3** honeypot ``website`` 非空 → 静默 202，不落库、不计配额
* **L1** IP 段（v4 /24 · v6 /64）60/hour → 429 + ``Retry-After``
* **L4** 同一 (contact, intent, product) 10 分钟内重复 → 幂等返回首次的 201
* **L2** contact hash 3/hour、10/day → 429 + 「请直接致电」文案

429 时 ``/contact`` 页必须**同时**展示商务电话与邮箱，绝不让用户走进死路。
错误体里的 ``detail`` 就是页面上要显示的那句话。
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import PlainTextResponse
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import Settings, get_settings
from app.core.errors import RateLimitedError
from app.core.logging import get_logger, request_id_var
from app.core.metrics import observe_lead, observe_ratelimit
from app.core.ratelimit import (
    SlidingWindowLimiter,
    contact_key,
    hash_key,
    ip_bucket,
    parse_rate,
)
from app.core.security import client_ip, require_admin
from app.db.session import get_session
from app.schemas.common import Page
from app.schemas.lead import LeadCreate, LeadCreated, LeadIntent, LeadRead
from app.services.leads import LeadService, QuotaExceeded, as_cst, now_cst

logger = get_logger("aegiston.leads.api")
router = APIRouter(tags=["leads"])

_ip_limiter: SlidingWindowLimiter | None = None


def get_ip_limiter(settings: Settings | None = None) -> SlidingWindowLimiter:
    global _ip_limiter
    if _ip_limiter is None:
        s = settings or get_settings()
        amount, seconds = parse_rate(s.rate_limit_leads_ip)
        _ip_limiter = SlidingWindowLimiter(amount, seconds)
    return _ip_limiter


def reset_ip_limiter() -> None:
    global _ip_limiter
    _ip_limiter = None


@router.post(
    "/leads",
    response_model=LeadCreated,
    status_code=status.HTTP_201_CREATED,
    summary="提交线索",
)
async def create_lead(
    payload: LeadCreate,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Any:
    # --- L3 honeypot：静默接受，不落库、不计配额 ---------------------------
    if payload.website.strip():
        logger.info("lead_honeypot_hit", path=payload.source_path or "-")
        observe_lead("honeypot")
        response.status_code = status.HTTP_202_ACCEPTED
        return LeadCreated(id="ld_ignored", created_at=now_cst(), duplicate=True)

    ip = client_ip(request)
    bucket = hash_key(ip_bucket(ip), settings.secret_salt)

    # --- L1 IP 段配额 -----------------------------------------------------
    allowed, retry_after = get_ip_limiter(settings).check(bucket)
    if not allowed:
        logger.warning("lead_ratelimit", layer="L1-ip-bucket", retry_after=retry_after)
        observe_lead("ratelimited")
        observe_ratelimit("L1-ip-bucket")
        raise RateLimitedError(
            "提交过于频繁，请稍后再试；如需立即联系，请直接致电商务或发送邮件。",
            retry_after,
            "L1-ip-bucket",
        )

    contact_hash = contact_key(
        payload.phone, str(payload.email) if payload.email else None, settings.secret_salt
    )
    service = LeadService(session)

    # --- L4 幂等：10 分钟内的重复提交返回首次的 id -------------------------
    existing = await service.find_recent_duplicate(
        contact_hash,
        payload.intent,
        payload.product,
        settings.lead_idempotency_window_seconds,
    )
    if existing is not None:
        logger.info("lead_idempotent_hit", lead_id=existing.id)
        observe_lead("accepted")
        observe_ratelimit("L4-idempotency")
        return LeadCreated(id=existing.id, created_at=as_cst(existing.created_at), duplicate=True)

    # --- L2 联系方式配额 --------------------------------------------------
    try:
        await service.check_contact_quota(
            contact_hash,
            per_hour=settings.rate_limit_leads_contact_hour,
            per_day=settings.rate_limit_leads_contact_day,
        )
    except QuotaExceeded as exc:
        logger.warning("lead_ratelimit", layer=exc.layer, retry_after=exc.retry_after)
        observe_lead("ratelimited")
        observe_ratelimit(exc.layer)
        raise RateLimitedError(exc.message, exc.retry_after, exc.layer) from exc

    observe_lead("accepted")
    return await service.create(
        payload,
        contact_hash=contact_hash,
        ip_hash=hash_key(ip, settings.secret_salt),
        user_agent=request.headers.get("user-agent"),
        request_id=request_id_var.get() or None,
    )


@router.get(
    "/leads",
    response_model=Page[LeadRead],
    dependencies=[Depends(require_admin)],
    summary="线索管理列表（需 X-Admin-Token）",
)
async def list_leads(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100, alias="pageSize"),
    intent: LeadIntent | None = Query(default=None),
    since: datetime | None = Query(default=None),
    session: AsyncSession = Depends(get_session),
) -> Any:
    items, total = await LeadService(session).list_leads(
        page=page, page_size=page_size, intent=intent, since=since
    )
    return Page[LeadRead](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=page * page_size < total,
    )


@router.get(
    "/leads/export.csv",
    dependencies=[Depends(require_admin)],
    response_class=PlainTextResponse,
    summary="线索 CSV 导出（需 X-Admin-Token）",
)
async def export_leads(session: AsyncSession = Depends(get_session)) -> PlainTextResponse:
    csv_text = await LeadService(session).export_csv()
    return PlainTextResponse(
        content="﻿" + csv_text,  # BOM：Excel 打开中文不乱码
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="aegiston-leads.csv"'},
    )


__all__ = ["get_ip_limiter", "reset_ip_limiter", "router"]
