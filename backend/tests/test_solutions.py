import pytest


def test_solutions_overview(client):
    res = client.get("/api/v1/solutions")
    assert res.status_code == 200
    body = res.json()
    assert len(body["solutions"]) == 4
    assert body["partnerName"]


@pytest.mark.parametrize("slug", ["telecom", "transportation", "legal-services", "finance"])
def test_solution_detail(client, slug):
    res = client.get(f"/api/v1/solutions/{slug}")
    assert res.status_code == 200
    body = res.json()
    assert body["slug"] == slug
    assert body["takeaway"]
    assert body["deployment"]


def test_conflicting_metrics_are_documented(client):
    """content-notes §1 的数据口径冲突必须在页面数据里留痕，而不是被糊过去。"""
    for slug in ("telecom", "transportation"):
        body = client.get(f"/api/v1/solutions/{slug}").json()
        assert body["pendingConfirmation"], f"{slug} 缺少数据口径说明"
        assert any("p.84" in note for note in body["pendingConfirmation"])


def test_customer_names_are_anonymised(client):
    """C3 保守口径：除 p.94 已公开具名的战略合作伙伴外，客户名一律脱敏。"""
    for slug in ("transportation", "legal-services", "finance"):
        body = client.get(f"/api/v1/solutions/{slug}").json()
        assert body["customer"].startswith("某"), body["customer"]


def test_metrics_carry_source(client):
    body = client.get("/api/v1/solutions/telecom").json()
    assert body["metrics"]
    for metric in body["metrics"]:
        assert metric["source"], metric["label"]
