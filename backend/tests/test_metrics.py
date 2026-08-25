"""Prometheus 指标（v3 spec §10.1 / §4.8.1）。

⚠️ 这里**只断言后端行为**。「/metrics 在公网返回 403」是 nginx 的事，
而 E2E 直连 `next start`、流水线里根本没有 nginx，拿到的是 404 不是 403 ——
把那条写成 E2E 是一种假门禁（v3 P1-8 / R12）。nginx 那一层由
`frontend/tests/unit/nginx-config.spec.ts` 读配置文本来守。
"""

from __future__ import annotations

from collections.abc import Iterator
from pathlib import Path

import pytest


@pytest.fixture()
def metrics_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[object]:
    """开启指标的独立 app 实例。默认关闭，所以必须单独造一个。"""
    from fastapi.testclient import TestClient

    db_path = tmp_path / "metrics.db"
    monkeypatch.setenv("AEGISTON_DATABASE_URL", f"sqlite+aiosqlite:///{db_path.as_posix()}")
    monkeypatch.setenv("AEGISTON_METRICS_ENABLED", "true")

    from app.api.v1.endpoints.leads import reset_ip_limiter
    from app.core.config import get_settings
    from app.db import session as db_session
    from app.main import create_app

    get_settings.cache_clear()
    reset_ip_limiter()
    db_session._engine = None

    with TestClient(create_app()) as client:
        yield client

    db_session._engine = None
    get_settings.cache_clear()
    reset_ip_limiter()


def test_metrics_disabled_by_default(client):
    """默认配置下 `/metrics` 不存在 —— 不是 403，是 404。"""
    assert client.get("/metrics").status_code == 404


def test_metrics_enabled_exposes_text_format(metrics_client):
    res = metrics_client.get("/metrics")
    assert res.status_code == 200
    assert "text/plain" in res.headers["content-type"]
    body = res.text
    for name in (
        "aegiston_http_requests_total",
        "aegiston_http_request_duration_seconds",
        "aegiston_leads_total",
        "aegiston_ratelimit_rejected_total",
        "aegiston_content_info",
    ):
        assert name in body


def test_metrics_label_cardinality(metrics_client):
    """打三个不同 slug 之后，`route` 标签值仍只有一个（模板 path）。

    这是不用 instrumentator 的全部理由（决策 A-8）：真实 path 会让标签基数
    随内容条数线性增长，多一篇洞察就多一条时间序列。
    """
    import re

    for slug in ("aragonteam", "inkclaw", "legallens"):
        assert metrics_client.get(f"/api/v1/products/{slug}").status_code == 200

    body = metrics_client.get("/metrics").text
    routes = set(re.findall(r'aegiston_http_requests_total\{[^}]*route="([^"]+)"', body))
    product_routes = {r for r in routes if "/products/" in r}
    assert product_routes == {"/api/v1/products/{slug}"}
    assert not any("inkclaw" in r for r in routes)


def test_metrics_unmatched_path_does_not_explode_cardinality(metrics_client):
    import re

    for i in range(3):
        metrics_client.get(f"/definitely-not-a-route-{i}")
    body = metrics_client.get("/metrics").text
    routes = set(re.findall(r'aegiston_http_requests_total\{[^}]*route="([^"]+)"', body))
    assert "__unmatched__" in routes
    assert not any("definitely-not-a-route" in r for r in routes)


def test_metrics_leads_outcomes(metrics_client):
    """honeypot / 限流 / 正常各打一次，三个 outcome 计数各自出现。"""
    import re

    from tests.conftest import lead_payload

    def counter(body: str, outcome: str) -> float:
        found = re.search(
            rf'aegiston_leads_total\{{outcome="{outcome}"\}} ([0-9.e+]+)', body
        )
        return float(found.group(1)) if found else 0.0

    before = metrics_client.get("/metrics").text

    # honeypot：website 非空 → 202，不落库
    assert metrics_client.post("/api/v1/leads", json=lead_payload(website="bot")).status_code == 202
    # 正常：201
    assert metrics_client.post("/api/v1/leads", json=lead_payload()).status_code == 201
    # 校验失败：422
    assert (
        metrics_client.post("/api/v1/leads", json=lead_payload(phone="123")).status_code == 422
    )

    after = metrics_client.get("/metrics").text
    assert counter(after, "honeypot") == counter(before, "honeypot") + 1
    assert counter(after, "accepted") == counter(before, "accepted") + 1
    assert counter(after, "invalid") == counter(before, "invalid") + 1


def test_metrics_content_info_carries_content_hash(metrics_client):
    body = metrics_client.get("/metrics").text
    hash_value = metrics_client.get("/api/v1/health").json()["contentHash"]
    assert f'content_hash="{hash_value}"' in body
