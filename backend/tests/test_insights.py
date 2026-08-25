def test_insights_list(client):
    res = client.get("/api/v1/insights")
    assert res.status_code == 200
    body = res.json()
    assert body["total"] >= 3
    assert body["page"] == 1
    assert set(body) == {"items", "total", "page", "pageSize", "hasNext"}


def test_insights_filter_by_category(client):
    body = client.get("/api/v1/insights?category=insight").json()
    assert body["items"]
    assert all(item["category"] == "insight" for item in body["items"])


def test_insights_pagination(client):
    first = client.get("/api/v1/insights?page=1&pageSize=2").json()
    assert len(first["items"]) == 2
    assert first["hasNext"] is True
    second = client.get("/api/v1/insights?page=2&pageSize=2").json()
    assert first["items"][0]["slug"] != second["items"][0]["slug"]


def test_insights_sorted_desc(client):
    items = client.get("/api/v1/insights?pageSize=24").json()["items"]
    dates = [i["publishedAt"] for i in items]
    assert dates == sorted(dates, reverse=True)


def test_insight_detail_is_sanitised_html(client):
    body = client.get("/api/v1/insights/four-dilemmas-one-root-cause").json()
    html = body["bodyHtml"]
    assert "<h2>" in html
    assert "<script" not in html.lower()
    assert "onerror=" not in html.lower()
    assert body["sources"]


def test_insight_not_found(client):
    res = client.get("/api/v1/insights/nope")
    assert res.status_code == 404
    problem = res.json()
    assert problem["status"] == 404
    assert problem["type"] == "/errors/not-found"
    assert "requestId" in problem


def test_markdown_sanitiser_strips_script():
    from app.services.insights import render_markdown

    html = render_markdown('正常段落\n\n<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>')
    lower = html.lower()
    # bleach 把不在白名单里的标签**转义成文本**（&lt;img …&gt;），这是正确行为：
    # 页面上会原样显示这段字符，但不会产生任何可执行的标签或事件处理器。
    assert "<script" not in lower
    assert "<img" not in lower
    assert 'onerror="' not in lower and "onerror='" not in lower
    assert "&lt;img" in lower
