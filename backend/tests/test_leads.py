"""线索写路径与分层反滥用（spec §7.3 / §7.3.1）。"""

from __future__ import annotations

import pytest

from tests.conftest import lead_payload


def test_create_lead(client):
    res = client.post("/api/v1/leads", json=lead_payload())
    assert res.status_code == 201
    body = res.json()
    assert body["id"].startswith("ld_")
    assert body["duplicate"] is False
    assert body["createdAt"]


def test_consent_is_required(client):
    res = client.post("/api/v1/leads", json=lead_payload(consent=False))
    assert res.status_code == 422
    problem = res.json()
    assert problem["type"] == "/errors/validation"
    assert any(e["field"] == "consent" for e in problem["errors"])


def test_phone_format_is_validated(client):
    res = client.post("/api/v1/leads", json=lead_payload(phone="123"))
    assert res.status_code == 422
    assert any(e["field"] == "phone" for e in res.json()["errors"])


def test_message_html_is_stripped(client, admin_headers):
    payload = lead_payload(message='<script>alert(1)</script>正文内容', phone="13900139000")
    assert client.post("/api/v1/leads", json=payload).status_code == 201
    rows = client.get("/api/v1/leads", headers=admin_headers).json()["items"]
    assert rows[0]["message"] == "alert(1)正文内容"


def test_honeypot_returns_202_and_does_not_persist(client, admin_headers):
    """L3：honeypot 非空 → 静默 202，不落库、不计配额。"""
    res = client.post("/api/v1/leads", json=lead_payload(website="http://spam.example"))
    assert res.status_code == 202
    assert res.json()["id"] == "ld_ignored"

    rows = client.get("/api/v1/leads", headers=admin_headers).json()
    assert rows["total"] == 0


def test_lead_idempotent_within_window(client, admin_headers):
    """L4：同一 (contact, intent, product) 10 分钟内重复 → 幂等返回首次的 id。"""
    payload = lead_payload()
    first = client.post("/api/v1/leads", json=payload).json()
    second = client.post("/api/v1/leads", json=payload)

    assert second.status_code == 201
    body = second.json()
    assert body["id"] == first["id"]
    assert body["duplicate"] is True

    assert client.get("/api/v1/leads", headers=admin_headers).json()["total"] == 1


def test_lead_ratelimit_contact_layer(client):
    """L2：同一联系方式 3/hour。用不同 intent 绕开 L4 幂等，直接压 L2。"""
    intents = ["demo", "consult", "trial", "partner"]
    statuses = [
        client.post("/api/v1/leads", json=lead_payload(intent=intent)).status_code
        for intent in intents
    ]
    assert statuses[:3] == [201, 201, 201]
    assert statuses[3] == 429


def test_ratelimit_response_carries_retry_after(client):
    for intent in ["demo", "consult", "trial"]:
        client.post("/api/v1/leads", json=lead_payload(intent=intent))
    res = client.post("/api/v1/leads", json=lead_payload(intent="partner"))
    assert res.status_code == 429
    assert int(res.headers["Retry-After"]) > 0
    problem = res.json()
    assert problem["type"] == "/errors/rate-limited"
    # 429 文案必须给出人工兜底路径，不能让用户走进死路
    assert "致电" in problem["detail"] or "邮件" in problem["detail"]


def test_lead_ratelimit_ip_layer(client, monkeypatch):
    """L1：IP 段配额。把配额压到 2 次以便在单测里触发。"""
    from app.api.v1.endpoints import leads as leads_module
    from app.core.ratelimit import SlidingWindowLimiter

    monkeypatch.setattr(leads_module, "_ip_limiter", SlidingWindowLimiter(2, 3600))

    codes = []
    for i in range(3):
        payload = lead_payload(phone=f"1380013800{i}", email=f"u{i}@example.com", intent="demo")
        codes.append(client.post("/api/v1/leads", json=payload).status_code)

    assert codes[:2] == [201, 201]
    assert codes[2] == 429


def test_ip_bucket_groups_by_subnet():
    """政企客户常共享 NAT 出口 —— L1 的键必须是**网段**而不是单个 IP。"""
    from app.core.ratelimit import ip_bucket

    assert ip_bucket("203.0.113.7") == ip_bucket("203.0.113.200")
    assert ip_bucket("203.0.113.7") != ip_bucket("203.0.114.7")
    assert ip_bucket("2001:db8::1") == ip_bucket("2001:db8::ffff")


def test_ip_is_never_stored_in_plaintext(client, tmp_path):
    """合规：不存明文 IP，只存 sha256(ip + SECRET_SALT)。"""
    import sqlite3

    client.post("/api/v1/leads", json=lead_payload())
    db_files = list(tmp_path.glob("*.db"))
    assert db_files
    con = sqlite3.connect(db_files[0])
    try:
        rows = con.execute("SELECT ip_hash, contact_hash, phone FROM leads").fetchall()
    finally:
        con.close()
    assert rows
    ip_hash, contact_hash, phone = rows[0]
    assert len(ip_hash) == 64 and "." not in ip_hash
    assert len(contact_hash) == 64
    assert phone == "13800138000"  # 原文只在库里，出参与日志脱敏


@pytest.mark.parametrize("path", ["/api/v1/leads", "/api/v1/leads/export.csv"])
def test_admin_endpoints_require_token(client, path):
    assert client.get(path).status_code == 401
    assert client.get(path, headers={"X-Admin-Token": "wrong"}).status_code == 401


def test_admin_list_is_masked(client, admin_headers):
    client.post("/api/v1/leads", json=lead_payload())
    row = client.get("/api/v1/leads", headers=admin_headers).json()["items"][0]
    assert row["phone"] == "138****8000"
    assert row["email"].startswith("z***@")
    assert row["intentLabel"] == "预约产品演示"


def test_csv_export(client, admin_headers):
    client.post("/api/v1/leads", json=lead_payload())
    res = client.get("/api/v1/leads/export.csv", headers=admin_headers)
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment" in res.headers["content-disposition"]
    text = res.text
    assert "138****8000" in text
    assert "13800138000" not in text


def test_created_at_always_carries_cst_offset(client, admin_headers):
    """§8.1 约定 created_at 是「ISO8601 +08:00」。

    SQLite 不保存时区，读回来是 naive datetime —— 若不补回偏移，
    「首次创建」与「幂等重放」两条路径会给出格式不同的时间戳。
    """
    payload = lead_payload()
    first = client.post("/api/v1/leads", json=payload).json()
    replay = client.post("/api/v1/leads", json=payload).json()

    assert first["createdAt"].endswith("+08:00")
    assert replay["createdAt"].endswith("+08:00")
    assert replay["createdAt"] == first["createdAt"]

    row = client.get("/api/v1/leads", headers=admin_headers).json()["items"][0]
    assert row["createdAt"].endswith("+08:00")

    csv_text = client.get("/api/v1/leads/export.csv", headers=admin_headers).text
    assert "+08:00" in csv_text
