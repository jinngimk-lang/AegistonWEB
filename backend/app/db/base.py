"""SQLModel 元数据汇总入口。

Alembic 的 ``env.py`` 从这里取 ``target_metadata``；导入模型模块是必要的副作用，
否则 autogenerate 看不到表。
"""

from __future__ import annotations

from sqlmodel import SQLModel

from app.models.lead import Lead

metadata = SQLModel.metadata

__all__ = ["Lead", "SQLModel", "metadata"]
