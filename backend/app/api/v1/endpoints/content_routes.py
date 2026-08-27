"""只读内容端点。

⚠️ **路由注册顺序是强约束**（spec §7.2 注 1 · P1-4）：
FastAPI 按**装饰器声明顺序**匹配路径，先注册的先命中。因此
**所有静态路径段的路由必须写在同前缀的动态路径路由之前**，否则
``/products/deployment`` 会落进 ``/products/{slug}`` 处理器，因 ``deployment``
不在 ``aragonteam|inkclaw|legallens`` 中而返回 404 —— 直接打破 G3「无死链」。

同类风险点：``/solutions/{slug}``、``/insights/{slug}``。
``tests/test_products.py::test_static_route_precedence`` 覆盖全部三处。

动态段一律用 ``Literal`` 枚举收窄，让不匹配值在**路由层**就落空，
而不是进业务逻辑再 404。
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query, Request, Response

from app.core.cache import (
    CACHE_CONTROL_READONLY,
    CACHE_CONTROL_STATIC,
    apply_cache,
    make_etag,
)
from app.core.errors import NotFoundError
from app.schemas.about import AboutPage, CareersPage, TeamPage
from app.schemas.common import Page
from app.schemas.home import HomePage
from app.schemas.insight import InsightCategory, InsightDetail, InsightSummary
from app.schemas.media import MediaAsset, StockCredit
from app.schemas.product import (
    DeploymentPage,
    ProductDetail,
    ProductSlug,
    ProductsOverview,
)
from app.schemas.research import ResearchOverview
from app.schemas.search import SearchIndexPayload
from app.schemas.site import Navigation, SiteSettings
from app.schemas.solution import SolutionDetail, SolutionSlug, SolutionsOverview
from app.services.content import get_repository
from app.services.search import build_search_index

router = APIRouter()

# 论文 JSON 继续保留在内容包中作为内部溯源资料，但已从官网公开信息架构移除。
_REMOVED_PUBLIC_PATHS = {"/research/papers"}
_REMOVED_SEARCH_DOC_IDS = {"research:papers"}


def _not_modified(
    request: Request, response: Response, key: str, *, static: bool = False
) -> Response | None:
    """写入 ETag / Cache-Control；命中 If-None-Match 时返回一个 304 Response。

    直接返回 ``Response`` 实例会让 FastAPI 跳过 ``response_model`` 序列化 ——
    这正是 304「无消息体」所需要的。
    """
    repo = get_repository()
    etag = make_etag(repo.content_hash, key)
    cache_control = CACHE_CONTROL_STATIC if static else CACHE_CONTROL_READONLY
    return apply_cache(request, response, etag, cache_control=cache_control)


# --------------------------------------------------------------------- site
@router.get("/site/settings", response_model=SiteSettings, tags=["site"])
async def site_settings(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "site/settings", static=True)
    if not_modified is not None:
        return not_modified
    return get_repository().settings


@router.get("/site/navigation", response_model=Navigation, tags=["site"])
async def site_navigation(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "site/navigation", static=True)
    if not_modified is not None:
        return not_modified
    return get_repository().navigation


# --------------------------------------------------------------------- home
@router.get("/home", response_model=HomePage, tags=["home"])
async def home(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "home")
    if not_modified is not None:
        return not_modified
    return get_repository().home


# ----------------------------------------------------------------- products
@router.get("/products", response_model=ProductsOverview, tags=["products"])
async def products_overview(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "products")
    if not_modified is not None:
        return not_modified
    return get_repository().products_overview


# ⚠️ 静态段 /products/deployment 必须注册在 /products/{slug} **之前**。
@router.get("/products/deployment", response_model=DeploymentPage, tags=["products"])
async def products_deployment(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "products/deployment", static=True)
    if not_modified is not None:
        return not_modified
    return get_repository().deployment


@router.get("/products/{slug}", response_model=ProductDetail, tags=["products"])
async def product_detail(slug: ProductSlug, request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, f"products/{slug}")
    if not_modified is not None:
        return not_modified
    detail = get_repository().product(slug)
    if detail is None:  # pragma: no cover - Literal 已在路由层收窄
        raise NotFoundError(f"产品 {slug} 不存在")
    return detail


# ---------------------------------------------------------------- solutions
@router.get("/solutions", response_model=SolutionsOverview, tags=["solutions"])
async def solutions_overview(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "solutions")
    if not_modified is not None:
        return not_modified
    return get_repository().solutions_overview


@router.get("/solutions/{slug}", response_model=SolutionDetail, tags=["solutions"])
async def solution_detail(slug: SolutionSlug, request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, f"solutions/{slug}", static=True)
    if not_modified is not None:
        return not_modified
    detail = get_repository().solution(slug)
    if detail is None:  # pragma: no cover
        raise NotFoundError(f"行业实践 {slug} 不存在")
    return detail


# ----------------------------------------------------------------- research
@router.get("/research/pillars", response_model=ResearchOverview, tags=["research"])
async def research_pillars(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "research/pillars", static=True)
    if not_modified is not None:
        return not_modified
    return get_repository().research


# -------------------------------------------------------------------- about
@router.get("/about", response_model=AboutPage, tags=["about"])
async def about(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "about", static=True)
    if not_modified is not None:
        return not_modified
    return get_repository().about


@router.get("/about/team", response_model=TeamPage, tags=["about"])
async def about_team(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "about/team", static=True)
    if not_modified is not None:
        return not_modified
    return get_repository().team


@router.get("/about/careers", response_model=CareersPage, tags=["about"])
async def about_careers(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "about/careers", static=True)
    if not_modified is not None:
        return not_modified
    return get_repository().careers


# ----------------------------------------------------------------- insights
@router.get("/insights", response_model=Page[InsightSummary], tags=["insights"])
async def insights(
    request: Request,
    response: Response,
    category: InsightCategory | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=9, ge=1, le=24, alias="pageSize"),
) -> Any:
    not_modified = _not_modified(request, response, f"insights?{category}&{page}&{page_size}")
    if not_modified is not None:
        return not_modified
    repo = get_repository()
    items, total = repo.insight_page(category, page, page_size)
    return Page[InsightSummary](
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        has_next=page * page_size < total,
    )


@router.get("/insights/{slug}", response_model=InsightDetail, tags=["insights"])
async def insight_detail(slug: str, request: Request, response: Response) -> Any:
    repo = get_repository()
    detail = repo.insight(slug)
    if detail is None:
        raise NotFoundError(f"洞察 {slug} 不存在")
    not_modified = _not_modified(request, response, f"insights/{slug}")
    if not_modified is not None:
        return not_modified
    return detail


# ------------------------------------------------------------------- search
# 无动态路径段，因此不存在静态/动态遮蔽问题；仍按本文件的既有秩序把它放在
# 全部动态段路由之后的独立小节里，避免读者误以为顺序是随意的。
@router.get("/search/index", response_model=SearchIndexPayload, tags=["search"])
async def search_index(request: Request, response: Response) -> Any:
    """检索索引。**只在构建期**被 `frontend/scripts/sync-content.mjs` 调用一次。

    ⚠️ 响应体中**不得出现 `score` 或任何排序字段**（v3 spec §4.2.1 / R1）：
    打分算法只在 `frontend/src/lib/search.ts` 实现一份，后端只负责摊平内容包。
    `tests/test_search.py::test_search_index_shape` 从接口形状上守这条。
    """
    not_modified = _not_modified(request, response, "search/index", static=True)
    if not_modified is not None:
        return not_modified
    request_app = request.app
    cached: SearchIndexPayload | None = getattr(request_app.state, "search_index", None)
    if cached is None:  # pragma: no cover - lifespan 正常执行时不会走到
        cached = build_search_index(get_repository())
        request_app.state.search_index = cached
    return cached.model_copy(
        update={"docs": [doc for doc in cached.docs if doc.id not in _REMOVED_SEARCH_DOC_IDS]}
    )


# -------------------------------------------------------------------- media
@router.get("/media/manifest", tags=["media"])
async def media_manifest(request: Request, response: Response) -> Any:
    not_modified = _not_modified(request, response, "media/manifest", static=True)
    if not_modified is not None:
        return not_modified
    repo = get_repository()
    return {
        "assets": [a.model_dump(by_alias=True, mode="json") for a in repo.all_media()],
        "stock": [s.model_dump(by_alias=True, mode="json") for s in repo.stock.values()],
    }


@router.get("/media/assets/{asset_id}", tags=["media"])
async def media_asset(asset_id: str, request: Request, response: Response) -> Any:
    repo = get_repository()
    asset: MediaAsset | StockCredit | None = repo.media.get(asset_id) or repo.stock.get(asset_id)
    if asset is None:
        raise NotFoundError(f"媒体资源 {asset_id} 不存在")
    not_modified = _not_modified(request, response, f"media/{asset_id}", static=True)
    if not_modified is not None:
        return not_modified
    return asset.model_dump(by_alias=True, mode="json")


# -------------------------------------------------------------------- 路由清单
@router.get("/site/routes", tags=["site"], summary="站点路由清单（供 sitemap 与路由回归用）")
async def site_routes(request: Request, response: Response) -> Any:
    """把「有哪些页面」这件事也收敛到后端，让 sitemap.ts 与 routes.spec.ts 同源。"""
    not_modified = _not_modified(request, response, "site/routes", static=True)
    if not_modified is not None:
        return not_modified
    # 内容仓库仍保留论文原始资料作内部溯源，但公开站点路由明确排除该板块。
    routes = [
        route
        for route in get_repository().route_entries()
        if route["path"] not in _REMOVED_PUBLIC_PATHS
    ]
    return {"routes": routes, "count": len(routes)}
