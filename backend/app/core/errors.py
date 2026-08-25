"""RFC 7807 风格的错误体与全局异常处理器（spec §7.1）。"""

from __future__ import annotations

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.logging import get_logger, request_id_var

logger = get_logger("aegiston.error")

_TYPE_BY_STATUS = {
    400: "/errors/bad-request",
    401: "/errors/unauthorized",
    403: "/errors/forbidden",
    404: "/errors/not-found",
    409: "/errors/conflict",
    422: "/errors/validation",
    429: "/errors/rate-limited",
    500: "/errors/internal",
    503: "/errors/unavailable",
}

_TITLE_BY_STATUS = {
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Validation Error",
    429: "Too Many Requests",
    500: "Internal Server Error",
    503: "Service Unavailable",
}


class ApiError(Exception):
    """业务异常基类。所有对外抛出的错误都应经过它，保证错误体形状一致。"""

    def __init__(
        self,
        status_code: int,
        detail: str,
        *,
        type_: str | None = None,
        title: str | None = None,
        errors: list[dict[str, str]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail
        self.type = type_ or _TYPE_BY_STATUS.get(status_code, "/errors/unknown")
        self.title = title or _TITLE_BY_STATUS.get(status_code, "Error")
        self.errors = errors or []
        self.headers = headers or {}


class NotFoundError(ApiError):
    def __init__(self, detail: str) -> None:
        super().__init__(status.HTTP_404_NOT_FOUND, detail)


class RateLimitedError(ApiError):
    def __init__(self, detail: str, retry_after: int, layer: str) -> None:
        super().__init__(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail,
            headers={"Retry-After": str(retry_after)},
            errors=[{"field": "_ratelimit", "code": layer}],
        )


def problem(
    request: Request,
    status_code: int,
    detail: str,
    *,
    type_: str | None = None,
    title: str | None = None,
    errors: list[dict[str, str]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "type": type_ or _TYPE_BY_STATUS.get(status_code, "/errors/unknown"),
        "title": title or _TITLE_BY_STATUS.get(status_code, "Error"),
        "status": status_code,
        "detail": detail,
        "instance": request.url.path,
        "requestId": request_id_var.get() or request.headers.get("x-request-id", ""),
    }
    if errors:
        body["errors"] = errors
    return JSONResponse(status_code=status_code, content=body, headers=headers or {})


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(request: Request, exc: ApiError) -> JSONResponse:
        if exc.status_code >= 500:
            logger.error("api_error", path=request.url.path, status=exc.status_code)
        return problem(
            request,
            exc.status_code,
            exc.detail,
            type_=exc.type,
            title=exc.title,
            errors=exc.errors,
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors: list[dict[str, str]] = []
        for err in exc.errors():
            loc = [str(p) for p in err.get("loc", []) if p not in ("body", "query", "path")]
            errors.append({"field": ".".join(loc) or "_", "code": str(err.get("type", "invalid"))})
        first = errors[0] if errors else {"field": "_", "code": "invalid"}
        detail = f"{first['field']}: {exc.errors()[0].get('msg', '校验失败')}" if exc.errors() else "校验失败"
        return problem(request, status.HTTP_422_UNPROCESSABLE_ENTITY, detail, errors=errors)

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        return problem(
            request,
            exc.status_code,
            str(exc.detail),
            headers=dict(exc.headers or {}),
        )

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("unhandled_error", path=request.url.path, error=type(exc).__name__)
        return problem(
            request,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "服务器内部错误，请稍后重试或联系商务。",
        )
