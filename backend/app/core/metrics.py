"""Prometheus 指标（v3 spec §4.8.1）。**默认关闭**。

为什么手写 middleware 而不是用 ``prometheus-fastapi-instrumentator``（决策 A-8）：
它默认按**真实 path** 打标签，本站有 ``/api/v1/products/{slug}`` /
``/api/v1/insights/{slug}`` 这类动态段路由，真实 path 会让 ``route`` 标签的
基数随内容条数线性增长 —— 洞察多一篇就多一条时间序列。指标只需要 5 组，
手写反而更可控，而且能把「取模板 path 而不是真实 path」这件事写死在代码里
（``test_metrics_label_cardinality`` 守它）。

依赖只加 ``prometheus-client``（纯 Python，无编译），不引任何 exporter 框架。

暴露方式：``AEGISTON_METRICS_ENABLED=true`` 时在 ``/metrics``（**不在
``api_prefix`` 下**）挂载。nginx 侧 ``location = /metrics { deny all; }``
让它公网 403，内网 Prometheus 直连 api 容器 ``:8000/metrics`` 抓取。

⚠️ 被 nginx ``limit_req`` 拒掉的请求**根本没有到达 FastAPI**，所以 429 激增
要看 nginx 的 ``access_log``（``$status`` = 429）与 ``error_log`` 的
``limiting requests`` 行，不要在 ``aegiston_http_requests_total`` 里找
（v3 spec §4.2.6 / R11）。这一点写进 ``docs/ops/runbook.md``。
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable
from typing import TYPE_CHECKING, Literal

from fastapi import FastAPI
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import get_settings

if TYPE_CHECKING:  # pragma: no cover
    from app.services.content import ContentRepository

LeadOutcome = Literal["accepted", "honeypot", "ratelimited", "invalid"]
RateLimitLayer = Literal["ip", "contact_hour", "contact_day", "idempotency"]

#: 独立 registry：不挂默认 registry，避免测试之间相互污染，也避免把
#: python_gc_* 之类的进程指标一起暴露出去（那些对本站没有告警价值）。
REGISTRY = CollectorRegistry()

HTTP_REQUESTS = Counter(
    "aegiston_http_requests_total",
    "HTTP 请求总数（route 为**路由模板**，不是真实 path）",
    ["route", "method", "status"],
    registry=REGISTRY,
)

HTTP_DURATION = Histogram(
    "aegiston_http_request_duration_seconds",
    "HTTP 请求耗时",
    ["route", "method"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5),
    registry=REGISTRY,
)

LEADS = Counter(
    "aegiston_leads_total",
    "线索提交结果计数（转化与反滥用的唯一量化口径）",
    ["outcome"],
    registry=REGISTRY,
)

RATELIMIT_REJECTED = Counter(
    "aegiston_ratelimit_rejected_total",
    "四层配额各自的拒绝数（应用层；nginx 的 limit_req 不经过这里）",
    ["layer"],
    registry=REGISTRY,
)

CONTENT_INFO = Gauge(
    "aegiston_content_info",
    "线上跑的是哪一版内容包（恒为 1，信息全在标签里）",
    ["content_hash", "version", "screenshots"],
    registry=REGISTRY,
)

#: 应用层限流层名 → 指标标签。`RateLimitedError` 传的是 "L1-ip-bucket" 这类
#: 内部层名，指标标签要低基数且稳定，因此在这里做一次显式映射，
#: 不直接把内部层名塞进标签。
_LAYER_LABELS: dict[str, str] = {
    "L1-ip-bucket": "ip",
    "L2-contact-hour": "contact_hour",
    "L2-contact-day": "contact_day",
    "L4-idempotency": "idempotency",
}


def observe_lead(outcome: LeadOutcome) -> None:
    """记录一次线索提交结果。指标关闭时也可安全调用（只是没人抓）。"""
    LEADS.labels(outcome=outcome).inc()


def observe_ratelimit(layer: str) -> None:
    """记录一次应用层配额拒绝。未知层名统一归到 ``ip``，保证标签集合封闭。"""
    RATELIMIT_REJECTED.labels(layer=_LAYER_LABELS.get(layer, "ip")).inc()


def set_content_info(repo: ContentRepository, version: str) -> None:
    CONTENT_INFO.labels(
        content_hash=repo.content_hash,
        version=version,
        screenshots=str(repo.screenshot_count()),
    ).set(1)


def _route_template(request: Request) -> str:
    """取**路由模板**而不是真实 path。

    ``/api/v1/products/inkclaw`` → ``/api/v1/products/{slug}``。
    没匹配到任何路由（404）时统一归为 ``__unmatched__``，
    否则扫描器随便打几个不存在的 path 就能把标签基数撑爆。
    """
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    if isinstance(path, str) and path:
        root = request.scope.get("root_path") or ""
        request_path = request.scope.get("path") or ""
        api_prefix = get_settings().api_prefix.rstrip("/")
        # FastAPI 在 include_router(prefix=...) 后，scope 里的 route.path 仍可能是
        # 子路由模板（例如 /products/{slug}），而 request path 已包含 /api/v1。
        # 只在真实请求确实位于 api_prefix 下时补回前缀，避免影响 /metrics 和 /。
        if (
            api_prefix
            and request_path.startswith(f"{api_prefix}/")
            and not path.startswith(f"{api_prefix}/")
        ):
            path = f"{api_prefix}{path}"
        return f"{root}{path}"
    return "__unmatched__"


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        started = time.perf_counter()
        response = await call_next(request)
        # ⚠️ route 只有在路由匹配**之后**才出现在 scope 里，所以必须在
        # call_next 返回后才读，不能在进入时读。
        route = _route_template(request)
        HTTP_DURATION.labels(route=route, method=request.method).observe(
            time.perf_counter() - started
        )
        HTTP_REQUESTS.labels(
            route=route, method=request.method, status=str(response.status_code)
        ).inc()
        return response


def install_metrics(app: FastAPI) -> None:
    """挂 middleware 与 ``/metrics``。只在 ``metrics_enabled`` 为真时调用。"""
    app.add_middleware(MetricsMiddleware)

    @app.get("/metrics", include_in_schema=False)
    async def metrics() -> Response:
        return Response(content=generate_latest(REGISTRY), media_type=CONTENT_TYPE_LATEST)
