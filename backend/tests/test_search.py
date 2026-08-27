"""检索索引端点（v3 spec §10.1）。

最要紧的一条是 `test_search_index_shape` 里的「响应体不含 score」——
它把 §4.2.1「后端不打分」从**口头约定**变成了**接口形状约束**：
只要有人在后端补一份打分实现，它就必然要往响应体里加排序字段，这条会红。
"""

from __future__ import annotations

import re

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_RE = re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")
IPV4_RE = re.compile(r"(?<!\d)(?:\d{1,3}\.){3}\d{1,3}(?!\d)")

VALID_TYPES = {"product", "solution", "research", "insight", "page"}


def test_search_index_shape(client):
    res = client.get("/api/v1/search/index")
    assert res.status_code == 200
    body = res.json()

    assert body["version"] == 1
    assert body["contentHash"]
    assert body["generatedAt"]
    assert len(body["docs"]) >= 30

    ids = [doc["id"] for doc in body["docs"]]
    assert len(set(ids)) == len(ids), "文档 id 必须唯一"

    for doc in body["docs"]:
        assert doc["type"] in VALID_TYPES
        assert doc["title"]
        assert doc["href"].startswith("/")
        # 后端不打分：任何排序字段都不允许出现在接口形状里（§4.2.1 / R1）
        assert "score" not in doc
        assert "rank" not in doc
        assert "weight" not in doc


def test_search_index_href_all_routable(client):
    routes = {entry["path"] for entry in client.get("/api/v1/site/routes").json()["routes"]}
    docs = client.get("/api/v1/search/index").json()["docs"]
    for doc in docs:
        path = doc["href"].split("#")[0]
        assert path in routes, f"{doc['id']} 的 href {doc['href']} 是死链"


def test_search_index_covers_every_product_and_insight(client):
    docs = client.get("/api/v1/search/index").json()["docs"]
    by_id = {doc["id"] for doc in docs}
    for slug in ("aragonteam", "inkclaw", "legallens"):
        assert f"product:{slug}" in by_id
    assert "product:deployment" in by_id
    for item in client.get("/api/v1/insights?pageSize=24").json()["items"]:
        assert f"insight:{item['slug']}" in by_id


def test_search_index_excludes_academic_results(client):
    """学术成果已从官网公开信息架构移除，搜索也不能留下隐形入口。"""
    docs = client.get("/api/v1/search/index").json()["docs"]
    assert all(doc["id"] != "research:papers" for doc in docs)
    assert all(doc["href"].split("#")[0] != "/research/papers" for doc in docs)


def test_search_index_etag(client):
    first = client.get("/api/v1/search/index")
    etag = first.headers["etag"]
    again = client.get("/api/v1/search/index", headers={"If-None-Match": etag})
    assert again.status_code == 304
    assert again.content == b""


def test_search_body_truncated(client):
    for doc in client.get("/api/v1/search/index").json()["docs"]:
        assert len(doc["body"]) <= 1600
        assert len(doc["excerpt"]) <= 160


def test_search_index_no_pii(client):
    """索引正文来自已脱敏的内容包 —— 这条是回归护栏，不是发现手段。"""
    for doc in client.get("/api/v1/search/index").json()["docs"]:
        haystack = " ".join(
            [doc["title"], doc.get("subtitle") or "", doc["excerpt"], doc["body"]]
        )
        assert not EMAIL_RE.search(haystack), f"{doc['id']} 出现完整邮箱"
        assert not PHONE_RE.search(haystack), f"{doc['id']} 出现 11 位手机号"
        assert not IPV4_RE.search(haystack), f"{doc['id']} 出现明文 IPv4"


def test_search_index_is_deterministic(client):
    """同一个内容包两次构建，文档序列必须逐条相同（否则快照永远漂移）。"""
    from app.services.content import get_repository
    from app.services.search import build_search_index

    repo = get_repository()
    first = build_search_index(repo)
    second = build_search_index(repo)
    assert [d.model_dump() for d in first.docs] == [d.model_dump() for d in second.docs]


def test_search_route_is_in_site_routes(client):
    """`/search` 必须进路由单一事实源，否则既不进 sitemap 也不进死链扫描。"""
    routes = {entry["path"] for entry in client.get("/api/v1/site/routes").json()["routes"]}
    assert "/search" in routes
