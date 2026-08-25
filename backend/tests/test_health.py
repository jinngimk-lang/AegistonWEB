def test_health_ok(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["contentHash"]
    assert body["version"]


def test_ready_ok(client):
    res = client.get("/api/v1/health/ready")
    assert res.status_code == 200
    body = res.json()
    assert body["ready"] is True
    assert body["checks"] == {"content": True, "db": True}


def test_request_id_roundtrip(client):
    res = client.get("/api/v1/health", headers={"X-Request-Id": "abc123"})
    assert res.headers["X-Request-Id"] == "abc123"


def test_security_headers_present(client):
    res = client.get("/api/v1/health")
    csp = res.headers["Content-Security-Policy"]
    for directive in (
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "form-action 'self'",
        "upgrade-insecure-requests",
    ):
        assert directive in csp
    assert res.headers["X-Content-Type-Options"] == "nosniff"
    assert res.headers["X-Frame-Options"] == "DENY"
