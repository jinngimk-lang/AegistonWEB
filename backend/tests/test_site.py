def test_site_settings(client):
    body = client.get("/api/v1/site/settings").json()
    assert body["legalName"] == "西安智瞳安宇科技有限公司"
    assert body["contact"]["businessEmail"]
    # spec R9：ICP 为空时前端不渲染该行；这里断言 schema 允许为空
    assert "icp" in body


def test_navigation_has_no_dead_links(client):
    nav = client.get("/api/v1/site/navigation").json()
    hrefs: list[str] = []
    for item in nav["utilityLeft"] + nav["utilityRight"]:
        hrefs.append(item["href"])
    for group in nav["main"]:
        if group.get("href"):
            hrefs.append(group["href"])
        hrefs.extend(i["href"] for i in group["items"])
    hrefs.append(nav["cta"]["href"])
    for column in nav["footerColumns"]:
        hrefs.extend(i["href"] for i in column["items"])
    hrefs.extend(i["href"] for i in nav["footerLegal"])

    assert hrefs
    for href in hrefs:
        assert href, "空 href"
        assert href != "#", "出现死链 href='#'"
        assert not href.startswith("#"), f"出现锚点死链 {href}"


def test_navigation_groups_are_clickable(client):
    """spec P2-6：主菜单项本身可点击，下拉首项为「总览」，避免孤儿页。"""
    nav = client.get("/api/v1/site/navigation").json()
    for group in nav["main"]:
        assert group.get("href"), f"{group['label']} 不可点击"
        if group["items"]:
            # 下拉首项必须能回到该分组自身，避免 /products 与 /solutions 成为
            # 只能靠面包屑到达的孤儿页（spec P2-6）
            assert group["items"][0]["href"] == group["href"], group["label"]


def test_routes_endpoint_matches_content(client):
    payload = client.get("/api/v1/site/routes").json()
    paths = {r["path"] for r in payload["routes"]}
    for expected in (
        "/",
        "/products",
        "/products/deployment",
        "/products/aragonteam",
        "/solutions/telecom",
        "/research",
        "/research/papers",
        "/insights",
        "/contact",
        "/legal/privacy",
    ):
        assert expected in paths, expected
    assert payload["count"] == len(payload["routes"])


def test_media_manifest(client):
    body = client.get("/api/v1/media/manifest").json()
    assert len(body["assets"]) >= 45
    assert len(body["stock"]) >= 10
    for asset in body["assets"][:5]:
        assert asset["blurDataUrl"].startswith("data:image/webp;base64,")
        assert asset["width"] > 0 and asset["height"] > 0
        assert asset["alt"]


def test_media_asset_lookup(client):
    assert client.get("/api/v1/media/assets/ara-dashboard").status_code == 200
    assert client.get("/api/v1/media/assets/stock-hero").status_code == 200
    assert client.get("/api/v1/media/assets/nope").status_code == 404
