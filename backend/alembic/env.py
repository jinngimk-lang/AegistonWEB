"""Alembic 环境。

⚠️ **必须用同步 URL**（spec §11.1 / P1-13）：
`AEGISTON_DATABASE_URL` 是 `sqlite+aiosqlite://` 异步 URL，Alembic 默认的同步
`env.py` 拿它会直接抛错，容器首次启动执行迁移即失败。这里统一从
`Settings.sync_database_url` 取——它与运行期 URL 由同一个路径推导，
不允许两处各写各的。
"""

from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import engine_from_config, pool

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings  # noqa: E402
from app.db.base import metadata  # noqa: E402
from app.db.session import sync_engine_pragmas  # noqa: E402

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
SYNC_URL = settings.sync_database_url or "sqlite:///./aegiston.db"
config.set_main_option("sqlalchemy.url", SYNC_URL)

target_metadata = metadata


def run_migrations_offline() -> None:
    context.configure(
        url=SYNC_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        render_as_batch=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    sync_engine_pragmas(connectable)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True,  # SQLite 不支持大部分 ALTER，必须走 batch
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
