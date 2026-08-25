import pytest


def test_products_overview(client):
    res = client.get("/api/v1/products")
    assert res.status_code == 200
    body = res.json()
    assert len(body["products"]) == 3
    assert {p["slug"] for p in body["products"]} == {"aragonteam", "inkclaw", "legallens"}


@pytest.mark.parametrize("slug", ["aragonteam", "inkclaw", "legallens"])
def test_product_detail(client, slug):
    res = client.get(f"/api/v1/products/{slug}")
    assert res.status_code == 200
    body = res.json()
    assert body["slug"] == slug
    assert body["screens"], "产品页必须有界面导览"
    assert body["cta"]["primaryHref"].startswith("/contact")


def test_static_route_precedence(client):
    """P1-4 回归：`/products/deployment` 必须命中静态路由，而不是落进 `{slug}`。

    FastAPI 按声明顺序匹配路径。若 `{slug}` 写在 `deployment` 之前，
    这里会拿到 404/422，前端 `/products/deployment` 页随即取不到数据，
    直接打破 G3「无死链」。
    """
    res = client.get("/api/v1/products/deployment")
    assert res.status_code == 200
    body = res.json()
    assert "forms" in body and len(body["forms"]) == 3
    assert "slug" not in body, "落进 {slug} 处理器了"

    # 同类风险点：/solutions 与 /insights 的动态段不应吞掉未来的静态兄弟路径
    assert client.get("/api/v1/solutions/telecom").status_code == 200
    assert client.get("/api/v1/insights/why-start-with-rd").status_code == 200


def test_unknown_product_slug_is_rejected_at_router(client):
    """`Literal` 收窄让不匹配值在**路由层**落空（422），而不是进业务逻辑再 404。"""
    res = client.get("/api/v1/products/not-a-product")
    assert res.status_code == 422


def test_etag_304(client):
    first = client.get("/api/v1/products/aragonteam")
    etag = first.headers["ETag"]
    second = client.get("/api/v1/products/aragonteam", headers={"If-None-Match": etag})
    assert second.status_code == 304
    assert second.content == b""


def test_cache_control_present(client):
    res = client.get("/api/v1/home")
    assert "max-age" in res.headers["Cache-Control"]
    assert "stale-while-revalidate" in res.headers["Cache-Control"]
