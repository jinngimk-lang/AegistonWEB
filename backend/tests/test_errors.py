def test_problem_shape_on_404(client):
    res = client.get("/api/v1/insights/does-not-exist")
    assert res.status_code == 404
    body = res.json()
    assert set(body) >= {"type", "title", "status", "detail", "instance", "requestId"}
    assert body["instance"] == "/api/v1/insights/does-not-exist"


def test_problem_shape_on_422(client):
    res = client.post("/api/v1/leads", json={"name": "x"})
    assert res.status_code == 422
    body = res.json()
    assert body["type"] == "/errors/validation"
    assert isinstance(body["errors"], list)
    assert all({"field", "code"} <= set(e) for e in body["errors"])


def test_unknown_path_is_problem_json(client):
    res = client.get("/api/v1/nope")
    assert res.status_code == 404
    assert res.json()["status"] == 404


def test_pii_masking_helpers():
    from app.core.logging import mask_email, mask_phone, mask_text

    assert mask_phone("13800138000") == "138****8000"
    assert mask_email("zhangsan@example.com") == "z***@example.com"
    assert "138****8000" in mask_text("请联系 13800138000")


def test_ip_hash_is_salted_and_stable():
    from app.core.logging import hash_ip

    a = hash_ip("203.0.113.7", "salt-a")
    b = hash_ip("203.0.113.7", "salt-b")
    assert a != b
    assert a == hash_ip("203.0.113.7", "salt-a")
    assert len(a) == 64


def test_prod_refuses_dev_secret_salt(monkeypatch):
    """CLAUDE.md §8：盐一旦是公开的默认值，ip_hash 就等于没脱敏 —— 生产拒绝启动。"""
    import pydantic
    import pytest

    from app.core.config import DEV_SALT, Settings

    monkeypatch.setenv("AEGISTON_ENV", "prod")
    monkeypatch.setenv("AEGISTON_SECRET_SALT", DEV_SALT)
    with pytest.raises(pydantic.ValidationError, match="SECRET_SALT"):
        Settings()

    monkeypatch.setenv("AEGISTON_SECRET_SALT", "a-real-random-production-salt-0123456789")
    assert Settings().is_prod
