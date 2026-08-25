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
    # v3：h2 带目录锚点（`<h2 id="sec-N">`），所以不能再断言裸的 `<h2>`
    assert "<h2 id=" in html
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


# --------------------------------------------------------- v3 · 目录与上下篇

def test_insight_toc_matches_headings(client):
    """`bodyHtml` 里活下来的 sec-N 数量必须等于 toc 长度（v3 P1-2）。

    这条断言同时守住两种回归：
      1. `ALLOWED_ATTRS` 的 `h2/h3: ["id"]` 被改回去 —— bleach 会**静默**剥掉
         id，目录点了没反应而没有任何东西变红；
      2. 锚点注入被挪到 bleach 之后又忘了转义。
    """
    import re

    items = client.get("/api/v1/insights?pageSize=24").json()["items"]
    assert items
    for item in items:
        detail = client.get(f"/api/v1/insights/{item['slug']}").json()
        html = detail["bodyHtml"]
        toc = detail["toc"]
        anchors = re.findall(r'id="(sec-\d+)"', html)
        assert anchors, f"{item['slug']} 的正文没有任何 sec-N 锚点 —— 白名单被改回去了？"
        assert len(anchors) == len(toc)
        assert [t["anchor"] for t in toc] == anchors
        assert len(set(anchors)) == len(anchors), "锚点必须唯一"
        assert all(t["level"] in (2, 3) for t in toc)
        # h2/h3 总数 == len(toc)：h4 拿的是 sub-N，不进目录
        assert len(re.findall(r"<h[23][ >]", html)) == len(toc)


def test_insight_related_excludes_self_and_is_deterministic(client):
    slug = "four-dilemmas-one-root-cause"
    first = client.get(f"/api/v1/insights/{slug}").json()["related"]
    second = client.get(f"/api/v1/insights/{slug}").json()["related"]
    assert 0 < len(first) <= 3
    assert all(r["slug"] != slug for r in first)
    assert [r["slug"] for r in first] == [r["slug"] for r in second]


def test_insight_prev_next_boundary(client):
    items = client.get("/api/v1/insights?pageSize=24").json()["items"]
    newest = client.get(f"/api/v1/insights/{items[0]['slug']}").json()
    oldest = client.get(f"/api/v1/insights/{items[-1]['slug']}").json()
    assert newest["prev"] is None
    assert newest["next"]["slug"] == items[1]["slug"]
    assert oldest["next"] is None
    assert oldest["prev"]["slug"] == items[-2]["slug"]


def test_insight_toc_survives_whitelist_regression():
    """把 id 从白名单里拿掉，`extract_toc` 必须**收不到东西**。

    这条用例证明「目录为空」是一个显性失败，而不是「目录在但点不动」——
    后者才是真正危险的形态。
    """
    from app.services import insights as mod

    src = "## 一级小节\n\n正文\n\n### 二级小节\n\n正文\n"
    assert len(mod.extract_toc(mod.render_markdown(src))) == 2

    original = mod.ALLOWED_ATTRS["h2"]
    try:
        mod.ALLOWED_ATTRS["h2"] = []
        assert mod.extract_toc(mod.render_markdown(src)) == [
            {"level": 3, "text": "二级小节", "anchor": "sec-2"}
        ]
    finally:
        mod.ALLOWED_ATTRS["h2"] = original
