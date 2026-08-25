from __future__ import annotations

import os
from collections.abc import Iterator
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent

# 必须在 import app.* 之前设置：Settings 是 lru_cache 的
os.environ.setdefault("AEGISTON_ENV", "dev")
os.environ.setdefault("AEGISTON_ADMIN_TOKEN", "test-admin-token-0123456789abcdef")
os.environ.setdefault("AEGISTON_SECRET_SALT", "test-salt")
os.environ.setdefault("AEGISTON_LOG_JSON", "false")
os.environ.setdefault("AEGISTON_LOG_LEVEL", "WARNING")


@pytest.fixture(scope="session")
def content_dir() -> Path:
    return BACKEND_DIR / "app" / "content"


@pytest.fixture()
def client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Iterator[object]:
    """每个用例一个独立的临时 SQLite，避免用例之间互相污染限流与幂等状态。"""
    from fastapi.testclient import TestClient

    db_path = tmp_path / "aegiston.db"
    monkeypatch.setenv("AEGISTON_DATABASE_URL", f"sqlite+aiosqlite:///{db_path.as_posix()}")

    from app.api.v1.endpoints.leads import reset_ip_limiter
    from app.core.config import get_settings
    from app.db import session as db_session
    from app.main import create_app

    get_settings.cache_clear()
    reset_ip_limiter()
    db_session._engine = None

    app = create_app()
    with TestClient(app) as test_client:
        yield test_client

    db_session._engine = None
    get_settings.cache_clear()
    reset_ip_limiter()


@pytest.fixture()
def admin_headers() -> dict[str, str]:
    return {"X-Admin-Token": os.environ["AEGISTON_ADMIN_TOKEN"]}


def lead_payload(**overrides: object) -> dict[str, object]:
    base: dict[str, object] = {
        "name": "张三",
        "company": "某某集团有限公司",
        "title": "法务总监",
        "phone": "13800138000",
        "email": "zhangsan@example.com",
        "intent": "demo",
        "product": "legallens",
        "message": "希望了解上下游一致性审查在项目合同链场景下的落地方式。",
        "consent": True,
        "website": "",
    }
    base.update(overrides)
    return base
