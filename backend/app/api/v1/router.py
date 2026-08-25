"""v1 路由汇总。

注册顺序即匹配顺序 —— ``content_routes`` 内部已经把静态段排在动态段之前
（spec §7.2 注 1）。这里只负责把子路由挂进来。
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1.endpoints import content_routes, health, leads

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(content_routes.router)
api_router.include_router(leads.router)
