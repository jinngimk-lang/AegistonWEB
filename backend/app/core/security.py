"""管理接口鉴权与安全响应头中间件。"""

from __future__ import annotations

import secrets
from collections.abc import Awaitable, Callable

from fastapi import Header, Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.core.errors import ApiError
from app.core.logging import new_request_id, request_id_var

# 与 nginx / next.config.mjs 逐字一致（spec §11.3）。
# v1 明确选择 'unsafe-inline' 而不是 nonce —— nonce 会把读取它的页面强制转为
# 动态渲染，直接推翻 ISR + Full Route Cache（见 spec §11.3 的完整论证）。
CSP = (
    "default-src 'self'; "
    "base-uri 'self'; "
    "object-src 'none'; "
    "frame-ancestors 'none'; "
    "form-action 'self'; "
    "img-src 'self' data: blob:; "
    "media-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline'; "
    "font-src 'self'; "
    "connect-src 'self'; "
    "manifest-src 'self'; "
    "upgrade-insecure-requests"
)

SECURITY_HEADERS = {
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
}


class RequestContextMiddleware(BaseHTTPMiddleware):
    """贯穿 web → api 的 X-Request-Id，以及安全响应头。"""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        rid = request.headers.get("x-request-id") or new_request_id()
        token = request_id_var.set(rid)
        try:
            response = await call_next(request)
        finally:
            request_id_var.reset(token)
        response.headers["X-Request-Id"] = rid
        for key, value in SECURITY_HEADERS.items():
            response.headers.setdefault(key, value)
        if get_settings().is_prod:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=31536000; includeSubDomains"
            )
        return response


async def require_admin(x_admin_token: str = Header(default="")) -> None:
    """管理接口依赖：常量时间比较，避免计时侧信道。"""
    expected = get_settings().admin_token
    if not expected:
        raise ApiError(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "管理接口未启用：服务端未配置 AEGISTON_ADMIN_TOKEN。",
        )
    if not x_admin_token or not secrets.compare_digest(x_admin_token, expected):
        raise ApiError(status.HTTP_401_UNAUTHORIZED, "X-Admin-Token 缺失或不正确。")


def client_ip(request: Request) -> str:
    """取真实客户端 IP。nginx 反代下取 X-Forwarded-For 首段。"""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"
