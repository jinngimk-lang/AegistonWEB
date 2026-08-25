"""FastAPI 应用工厂。

lifespan 里做两件事：加载内容包（失败即拒绝启动 → 容器不健康 → 不上线，
spec R13），以及确保 ``leads`` 表存在（生产走 Alembic，dev/测试兜底建表）。

⚠️ 编排上的自洽（spec §11.2 / P1-5）：api 不健康**不会**阻塞 web 启动
（``depends_on`` 用 ``service_started`` 而不是 ``service_healthy``）。
web 在 api 未就绪时按 §4.2 路径 A 走快照，页面照常 200。healthcheck 保留，
但它的作用是**给运维看**，而不是卡住依赖链。
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.core.security import RequestContextMiddleware
from app.db.base import SQLModel
from app.db.session import dispose_engine, get_engine
from app.services.content import ContentError, load_repository

logger = get_logger("aegiston.main")


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    configure_logging(settings.log_level, settings.log_json)

    try:
        repo = load_repository(settings.content_dir)
    except ContentError as exc:
        # 拒绝启动而不是带着坏内容上线 —— 见 spec R13。
        logger.error("content_load_failed", error=str(exc))
        raise

    logger.info(
        "content_loaded",
        content_hash=repo.content_hash,
        media=len(repo.media),
        screenshots=repo.screenshot_count(),
        products=len(repo.products),
        solutions=len(repo.solutions),
        insights=len(repo.insights),
    )
    if repo.settings.pending_confirmation:
        logger.warning(
            "content_pending_confirmation",
            count=len(repo.settings.pending_confirmation),
        )

    async with get_engine().begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)

    app.state.content_hash = repo.content_hash
    try:
        yield
    finally:
        await dispose_engine()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="智瞳安宇 Aegiston 官网 API",
        description=(
            "官网内容与线索 API。内容包受 Pydantic 校验、随代码入库，"
            "启动时一次性加载并常驻内存；数据库只承载 leads 一张表。"
        ),
        version=settings.version,
        openapi_url=f"{settings.api_prefix}/openapi.json",
        docs_url=None if settings.is_prod else "/docs",
        redoc_url=None,
        lifespan=lifespan,
    )

    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=1024)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "X-Request-Id", "X-Admin-Token", "If-None-Match"],
        expose_headers=["ETag", "X-Request-Id", "Retry-After"],
        max_age=3600,
    )

    register_exception_handlers(app)
    app.include_router(api_router, prefix=settings.api_prefix)

    # 便于人工排查：根路径给一句话，而不是 404
    @app.get("/", include_in_schema=False)
    async def root() -> dict[str, str]:
        return {
            "service": "aegiston-api",
            "version": settings.version,
            "docs": f"{settings.api_prefix}/openapi.json",
        }

    return app


app = create_app()
