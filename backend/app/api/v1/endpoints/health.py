"""存活与就绪探针。"""

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import get_settings
from app.db.session import get_session
from app.services.content import get_repository

router = APIRouter(tags=["health"])

_STARTED_AT = time.time()


@router.get("/health", summary="存活探针")
async def health() -> dict[str, Any]:
    settings = get_settings()
    try:
        content_hash = get_repository().content_hash
    except Exception:
        content_hash = ""
    return {
        "status": "ok",
        "version": settings.version,
        "env": settings.env,
        "contentHash": content_hash,
        "uptimeSeconds": round(time.time() - _STARTED_AT, 1),
    }


@router.get("/health/ready", summary="就绪探针（内容已加载 + DB 可连）")
async def ready(session: AsyncSession = Depends(get_session)) -> dict[str, Any]:
    checks: dict[str, bool] = {"content": False, "db": False}
    try:
        repo = get_repository()
        checks["content"] = bool(repo.content_hash)
    except Exception:
        checks["content"] = False
    try:
        await session.exec(text("SELECT 1"))  # type: ignore[call-overload]
        checks["db"] = True
    except Exception:
        checks["db"] = False
    return {"ready": all(checks.values()), "checks": checks}
