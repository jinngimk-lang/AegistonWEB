"""异步引擎与 Session 依赖。

SQLite pragma 必须**在每个连接上**设置（用 SQLAlchemy 的 ``connect`` 事件挂）：

* ``journal_mode=WAL``    —— 读写不互相阻塞
* ``foreign_keys=ON``     —— 外键约束默认是关的
* ``busy_timeout=5000``   —— **不可省**，它是并发写下 ``database is locked``
                             的唯一防线（spec §9.2 v2 补充）
* ``synchronous=NORMAL``  —— WAL 下的合理取舍
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlmodel.ext.asyncio.session import AsyncSession as SQLModelAsyncSession

from app.core.config import get_settings

_engine: AsyncEngine | None = None


def _apply_pragmas(dbapi_connection: object, _record: object) -> None:
    cursor = dbapi_connection.cursor()  # type: ignore[attr-defined]
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA synchronous=NORMAL")
    finally:
        cursor.close()


def _ensure_parent_dir(url: str) -> None:
    marker = ":///"
    if marker not in url:
        return
    raw = url.split(marker, 1)[1]
    if not raw or raw == ":memory:":
        return
    path = Path(raw)
    if path.parent and str(path.parent) not in ("", "."):
        path.parent.mkdir(parents=True, exist_ok=True)


def get_engine() -> AsyncEngine:
    global _engine
    if _engine is None:
        settings = get_settings()
        _ensure_parent_dir(settings.database_url)
        _engine = create_async_engine(
            settings.database_url,
            echo=False,
            future=True,
            pool_pre_ping=True,
            connect_args={"timeout": 15},
        )
        event.listens_for(_engine.sync_engine, "connect")(_apply_pragmas)
    return _engine


async def dispose_engine() -> None:
    global _engine
    if _engine is not None:
        await _engine.dispose()
        _engine = None


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SQLModelAsyncSession(get_engine(), expire_on_commit=False) as session:
        yield session


def sync_engine_pragmas(engine: Engine) -> None:
    """给 Alembic 的同步引擎挂同一套 pragma。"""
    event.listens_for(engine, "connect")(_apply_pragmas)
