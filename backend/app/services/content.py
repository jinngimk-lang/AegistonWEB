"""内容仓库：启动时把 JSON 内容包反序列化成 Pydantic 模型常驻内存。

关键判断（spec §4.1）：内容是**只读**的，且体量小（全部 JSON < 800 KB）。因此
不建表、不做 ORM 查询 —— 读路径零 I/O、零 N+1、天然线程安全。

启动流程（spec §8.2）
1. 遍历 ``content/`` 加载全部 JSON / MD
2. 按 schema 反序列化（失败即 ``ContentError``，进程拒绝启动）
3. **引用完整性校验**：任何 ``MediaAsset.id`` / ``TechPillar.id`` / ``Paper.id``
   引用必须存在
4. 计算内容包 ``sha256`` 作为 ``contentHash``（用于 ETag 与 /health）
5. 构建索引：``by_slug``、``insights_sorted_desc``、``insights_by_category``

⚠️ 校验只做**清单级**（manifest 内部自洽 + 交叉引用存在），**不碰磁盘**。
磁盘级校验（图片文件真实存在、宽高与记录一致）在 ``scripts/validate_assets.py``
里做，只在 CI 跑 —— 因为图片产物在 ``frontend/public/media/**``，后端镜像里
根本没有这棵树（spec §12.1 / P1-6）。
"""

from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ValidationError

from app.schemas.about import AboutPage, CareersPage, TeamPage
from app.schemas.home import HomePage
from app.schemas.insight import (
    CATEGORY_LABELS,
    InsightDetail,
    InsightIndexEntry,
    InsightSummary,
    TocItem,
)
from app.schemas.media import MediaAsset, StockCredit
from app.schemas.product import (
    CapabilityMatrix,
    DeploymentPage,
    ProductDetail,
    ProductsOverview,
)
from app.schemas.research import PapersPage, ResearchOverview
from app.schemas.site import Navigation, SiteSettings
from app.schemas.solution import SolutionDetail, SolutionsOverview
from app.services.insights import parse_post, reading_minutes

PRODUCT_SLUGS = ("aragonteam", "inkclaw", "legallens")
SOLUTION_SLUGS = ("telecom", "transportation", "legal-services", "finance")

#: 相关阅读取几条（v3 spec §4.3.1）。
RELATED_LIMIT = 3

#: 路由清单的**唯一事实源**（CLAUDE.md §6「四者同源」的第四者就是这里）。
#: `/api/v1/site/routes` → 快照 `site-routes.json` → `sitemap.ts` / `routes.spec.ts`
#: 全部下游都从这一份派生；`route_paths()` 同时供检索索引的死链校验复用
#: （v3 spec §6.1 校验点 3 / P1-4）。
STATIC_ROUTE_TABLE: tuple[dict[str, Any], ...] = (
    {"path": "/", "changeFrequency": "daily", "priority": 1.0},
    {"path": "/about", "changeFrequency": "monthly", "priority": 0.8},
    {"path": "/about/positioning", "changeFrequency": "monthly", "priority": 0.7},
    {"path": "/about/team", "changeFrequency": "monthly", "priority": 0.7},
    {"path": "/about/strength", "changeFrequency": "monthly", "priority": 0.7},
    {"path": "/products", "changeFrequency": "weekly", "priority": 0.9},
    {"path": "/products/deployment", "changeFrequency": "monthly", "priority": 0.8},
    {"path": "/solutions", "changeFrequency": "weekly", "priority": 0.9},
    {"path": "/research", "changeFrequency": "monthly", "priority": 0.8},
    {"path": "/research/papers", "changeFrequency": "monthly", "priority": 0.7},
    {"path": "/insights", "changeFrequency": "daily", "priority": 0.8},
    {"path": "/careers", "changeFrequency": "monthly", "priority": 0.6},
    {"path": "/contact", "changeFrequency": "monthly", "priority": 0.9},
    # v3 新增：站内检索页。只有带 ?q= 的结果页 noindex，入口页本身可索引。
    {"path": "/search", "changeFrequency": "monthly", "priority": 0.4},
    {"path": "/sitemap", "changeFrequency": "monthly", "priority": 0.3},
    {"path": "/legal/terms", "changeFrequency": "yearly", "priority": 0.2},
    {"path": "/legal/privacy", "changeFrequency": "yearly", "priority": 0.2},
    {"path": "/legal/credits", "changeFrequency": "yearly", "priority": 0.2},
)


class ContentError(RuntimeError):
    """内容包不可用。抛出即拒绝启动 → 容器不健康 → 不上线（spec R13）。"""


def _read_json(path: Path) -> Any:
    if not path.exists():
        raise ContentError(f"内容包缺少文件：{path}")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise ContentError(f"{path} 不是合法 JSON：{exc}") from exc


def _parse(model: type[BaseModel], payload: Any, where: str) -> Any:
    try:
        return model.model_validate(payload)
    except ValidationError as exc:
        raise ContentError(f"{where} 不符合 {model.__name__} 契约：\n{exc}") from exc


class ContentRepository:
    def __init__(self, content_dir: Path) -> None:
        self.dir = content_dir
        self.content_hash: str = ""
        self.settings: SiteSettings
        self.navigation: Navigation
        self.home: HomePage
        self.products_overview: ProductsOverview
        self.capability_matrix: CapabilityMatrix | None = None
        self.products: dict[str, ProductDetail] = {}
        self.deployment: DeploymentPage
        self.solutions_overview: SolutionsOverview
        self.solutions: dict[str, SolutionDetail] = {}
        self.research: ResearchOverview
        self.papers: PapersPage
        self.about: AboutPage
        self.team: TeamPage
        self.careers: CareersPage
        self.media: dict[str, MediaAsset] = {}
        self.stock: dict[str, StockCredit] = {}
        self.insights: list[InsightDetail] = []
        self.insights_by_slug: dict[str, InsightDetail] = {}
        self.warnings: list[str] = []

    # ------------------------------------------------------------------ load
    def load(self) -> ContentRepository:
        d = self.dir
        if not d.exists():
            raise ContentError(f"内容目录不存在：{d}")

        raw_media = _read_json(d / "media_manifest.json")
        for item in raw_media.get("assets", []):
            asset = _parse(MediaAsset, item, f"media_manifest.json/{item.get('id')}")
            self.media[asset.id] = asset

        stock_path = d / "stock_credits.json"
        if stock_path.exists():
            for item in _read_json(stock_path).get("assets", []):
                credit = _parse(StockCredit, item, f"stock_credits.json/{item.get('id')}")
                self.stock[credit.id] = credit

        site = _read_json(d / "site.json")
        self.settings = _parse(SiteSettings, site.get("settings"), "site.json/settings")
        self.navigation = _parse(Navigation, site.get("navigation"), "site.json/navigation")

        self._load_insights()

        home_raw = _read_json(d / "home.json")
        home_raw["insightsPreview"] = [
            s.model_dump(by_alias=True, mode="json") for s in self.insight_previews(5)
        ]
        self.home = _parse(HomePage, home_raw, "home.json")

        self.products_overview = _parse(
            ProductsOverview, _read_json(d / "products" / "index.json"), "products/index.json"
        )
        for slug in PRODUCT_SLUGS:
            self.products[slug] = _parse(
                ProductDetail, _read_json(d / "products" / f"{slug}.json"), f"products/{slug}.json"
            )
        self.deployment = _parse(
            DeploymentPage,
            _read_json(d / "products" / "deployment.json"),
            "products/deployment.json",
        )

        # 能力矩阵是**可选**内容（v3 spec §5.1）：矩阵尚未定稿时不阻塞其他页面。
        matrix_path = d / "products" / "capability-matrix.json"
        if matrix_path.exists():
            self.capability_matrix = _parse(
                CapabilityMatrix, _read_json(matrix_path), "products/capability-matrix.json"
            )
            self.products_overview.capability_matrix = self.capability_matrix

        self.solutions_overview = _parse(
            SolutionsOverview, _read_json(d / "solutions" / "index.json"), "solutions/index.json"
        )
        for slug in SOLUTION_SLUGS:
            self.solutions[slug] = _parse(
                SolutionDetail,
                _read_json(d / "solutions" / f"{slug}.json"),
                f"solutions/{slug}.json",
            )

        self.research = _parse(
            ResearchOverview, _read_json(d / "research" / "pillars.json"), "research/pillars.json"
        )
        self.papers = _parse(
            PapersPage, _read_json(d / "research" / "papers.json"), "research/papers.json"
        )

        self.about = _parse(AboutPage, _read_json(d / "about" / "company.json"), "about/company.json")
        self.team = _parse(TeamPage, _read_json(d / "about" / "team.json"), "about/team.json")
        self.careers = _parse(
            CareersPage, _read_json(d / "about" / "careers.json"), "about/careers.json"
        )

        self._check_references()
        self.content_hash = self._compute_hash()
        return self

    # -------------------------------------------------------------- insights
    def _load_insights(self) -> None:
        index_path = self.dir / "insights" / "index.json"
        entries_raw = _read_json(index_path).get("posts", [])
        posts_dir = self.dir / "insights" / "posts"
        today = date.today()
        details: list[InsightDetail] = []
        for raw in entries_raw:
            entry = _parse(InsightIndexEntry, raw, f"insights/index.json/{raw.get('slug')}")
            md_path = posts_dir / f"{entry.slug}.md"
            if not md_path.exists():
                raise ContentError(f"洞察 {entry.slug} 缺少正文：{md_path}")
            body_html, plain, toc_raw = parse_post(md_path.read_text(encoding="utf-8"))
            if entry.published_at > today:
                # spec R10：拒绝任何未来发布日期，避免出现 ref 里 2026.07 那种未来时间
                raise ContentError(
                    f"洞察 {entry.slug} 的 publishedAt={entry.published_at} 晚于今天 {today}"
                )
            details.append(
                InsightDetail(
                    slug=entry.slug,
                    title=entry.title,
                    category=entry.category,
                    category_label=CATEGORY_LABELS[entry.category],
                    excerpt=entry.excerpt,
                    published_at=entry.published_at,
                    reading_minutes=reading_minutes(plain),
                    hero_media=entry.hero_media,
                    href=f"/insights/{entry.slug}",
                    source_slides=entry.source_slides,
                    body_html=body_html,
                    sources=entry.sources,
                    toc=[TocItem(**item) for item in toc_raw],
                )
            )
        details.sort(key=lambda p: (p.published_at, p.slug), reverse=True)
        self._link_insights(details)
        self.insights = details
        self.insights_by_slug = {p.slug: p for p in details}

    @staticmethod
    def _link_insights(details: list[InsightDetail]) -> None:
        """就地补齐 ``related`` / ``prev`` / ``next``（v3 spec §4.3.1）。

        ``details`` 已按 ``publishedAt`` 降序排好。相关阅读的排序必须**完全确定**
        （同 category 优先 → tags 交集数 → publishedAt → slug），否则同一篇文章
        两次加载给出不同的「相关阅读」，E2E 无从断言。本项目没有 ``tags`` 字段，
        用 ``sourceSlides`` 的交集作为主题邻近度的代理量 —— 它是 PPT 页码，
        两篇引用同一批页码即讨论同一批材料。
        """
        summaries = {
            p.slug: InsightSummary(**p.model_dump(include=set(InsightSummary.model_fields)))
            for p in details
        }
        for index, post in enumerate(details):
            post.prev = summaries[details[index - 1].slug] if index > 0 else None
            post.next = (
                summaries[details[index + 1].slug] if index + 1 < len(details) else None
            )

            own_slides = set(post.source_slides)
            candidates = [
                (
                    0 if other.category == post.category else 1,
                    -len(own_slides & set(other.source_slides)),
                    -other.published_at.toordinal(),
                    other.slug,
                )
                for other in details
                if other.slug != post.slug
            ]
            candidates.sort()
            post.related = [summaries[key[3]] for key in candidates[:RELATED_LIMIT]]

    def insight_previews(self, limit: int) -> list[InsightSummary]:
        return [
            InsightSummary(**p.model_dump(include=set(InsightSummary.model_fields)))
            for p in self.insights[:limit]
        ]

    def insight_page(
        self, category: str | None, page: int, page_size: int
    ) -> tuple[list[InsightSummary], int]:
        pool = [p for p in self.insights if category is None or p.category == category]
        total = len(pool)
        start = (page - 1) * page_size
        window = pool[start : start + page_size]
        return (
            [InsightSummary(**p.model_dump(include=set(InsightSummary.model_fields))) for p in window],
            total,
        )

    # ---------------------------------------------------------------- routes
    def route_entries(self) -> list[dict[str, Any]]:
        """站点路由清单。``/api/v1/site/routes`` 与死链校验**共用这一份**。

        CLAUDE.md §6：`ROUTES` 常量、导航数据、`sitemap.ts`、`routes.spec.ts`
        四者始终同源，而第四者其实是**后端**（`sitemap.ts` 全文只有一句
        `getRoutes()`）。把构造从端点里抽到这里，是为了让 `route_paths()`
        能被内容校验复用 —— 索引里出现死链等价于站内出现死链（v3 P1-4）。
        """
        dynamic: list[dict[str, Any]] = [
            {"path": f"/products/{slug}", "changeFrequency": "weekly", "priority": 0.9}
            for slug in self.products
        ]
        dynamic += [
            {"path": f"/solutions/{slug}", "changeFrequency": "monthly", "priority": 0.8}
            for slug in self.solutions
        ]
        dynamic += [
            {
                "path": f"/insights/{post.slug}",
                "changeFrequency": "monthly",
                "priority": 0.6,
                "lastModified": post.published_at.isoformat(),
            }
            for post in self.insights
        ]
        return [dict(entry) for entry in STATIC_ROUTE_TABLE] + dynamic

    def route_paths(self) -> set[str]:
        """全部合法路由路径的集合。``SearchDoc.href`` 必须命中它。"""
        return {str(entry["path"]) for entry in self.route_entries()}

    # ------------------------------------------------------------ integrity
    def _media_refs(self) -> list[tuple[str, str]]:
        """收集全部 (来源描述, MediaAsset.id) 引用。"""
        refs: list[tuple[str, str]] = []

        def add(where: str, value: str | None) -> None:
            if value:
                refs.append((where, value))

        add("home.hero.media", self.home.hero.media)
        for d in self.home.domains:
            add(f"home.domains[{d.id}].media", d.media)
        for s in self.home.solutions:
            add(f"home.solutions[{s.id}].media", s.media)
        add("home.sustain.media", self.home.sustain.media)

        for p in self.products_overview.products:
            add(f"products.index[{p.slug}].heroMedia", p.hero_media)
        for slug, detail in self.products.items():
            add(f"products/{slug}.heroMedia", detail.hero_media)
            for screen in detail.screens:
                add(f"products/{slug}.screens[{screen.id}].mediaId", screen.media_id)
        add("products/deployment.heroMedia", self.deployment.hero_media)
        for form in self.deployment.forms:
            add(f"products/deployment.forms[{form.index}].media", form.media)

        for summary in self.solutions_overview.solutions:
            add(f"solutions.index[{summary.slug}].heroMedia", summary.hero_media)
        for slug, solution in self.solutions.items():
            add(f"solutions/{slug}.heroMedia", solution.hero_media)

        add("research.heroMedia", self.research.hero_media)
        for pillar in self.research.pillars:
            add(f"research.pillars[{pillar.id}].media", pillar.media)

        add("about.heroMedia", self.about.hero_media)
        add("about/team.heroMedia", self.team.hero_media)
        add("about/careers.heroMedia", self.careers.hero_media)

        for post in self.insights:
            add(f"insights/{post.slug}.heroMedia", post.hero_media)
        return refs

    def _check_references(self) -> None:
        problems: list[str] = []
        known_media = set(self.media) | set(self.stock)
        for where, media_id in self._media_refs():
            if media_id not in known_media:
                problems.append(f"{where} 指向不存在的媒体资源 {media_id!r}")

        pillar_ids = {p.id for p in self.research.pillars}
        paper_ids = {p.id for p in self.papers.papers}

        for slug, detail in self.products.items():
            for pid in detail.pillars:
                if pid not in pillar_ids:
                    problems.append(f"products/{slug}.pillars 指向不存在的技术模块 {pid!r}")
            for paper_id in detail.papers:
                if paper_id not in paper_ids:
                    problems.append(f"products/{slug}.papers 指向不存在的论文 {paper_id!r}")
        for paper in self.papers.papers:
            for pid in paper.maps_to:
                if pid not in pillar_ids:
                    problems.append(f"papers/{paper.id}.mapsTo 指向不存在的技术模块 {pid!r}")
        for slug, solution in self.solutions.items():
            if solution.related_product and solution.related_product not in self.products:
                problems.append(
                    f"solutions/{slug}.relatedProduct 指向不存在的产品 {solution.related_product!r}"
                )

        # 导航与页脚的站内链接必须指向真实路由（G3「无死链」在内容层的第一道闸门）
        for where, href in self._internal_links():
            if href.startswith("#") or href == "":
                problems.append(f"{where} 出现死链 {href!r} —— 未实现的入口必须从导航中移除")

        problems.extend(self._check_capability_matrix())
        problems.extend(self._check_search_index())

        if problems:
            raise ContentError("内容包引用完整性校验失败：\n  - " + "\n  - ".join(problems))

    def _check_capability_matrix(self) -> list[str]:
        """能力矩阵：溯源必填 + 三个 slug 不重不漏（v3 spec §6.1 校验点 1/2）。"""
        matrix = self.capability_matrix
        if matrix is None:
            return []
        problems: list[str] = []
        expected = set(PRODUCT_SLUGS)
        for row in matrix.rows:
            if not row.source_slides:
                problems.append(f"能力矩阵「{row.capability}」缺少 sourceSlides —— 违反内容不臆造")
            slugs = [cell.product_slug for cell in row.cells]
            if len(set(slugs)) != len(slugs):
                problems.append(f"能力矩阵「{row.capability}」的 cells 出现重复产品：{slugs}")
            if set(slugs) != expected:
                problems.append(
                    f"能力矩阵「{row.capability}」的 cells 未覆盖三个产品：{sorted(slugs)}"
                )
        return problems

    def _check_search_index(self) -> list[str]:
        """检索索引里的 href 必须命中真实路由。

        「索引里出现死链」等价于「站内出现死链」—— CLAUDE.md §6 的零容忍项。
        带 fragment 的 href（如 ``/research#pillar-x``）按 ``split("#")[0]`` 比对。
        """
        # 局部导入：search.py 依赖本模块的类型，模块级导入会构成循环。
        from app.services.search import build_search_index

        legal = self.route_paths()
        problems: list[str] = []
        seen: set[str] = set()
        for doc in build_search_index(self).docs:
            if doc.id in seen:
                problems.append(f"检索索引出现重复文档 id {doc.id!r}")
            seen.add(doc.id)
            path = doc.href.split("#")[0]
            if path not in legal:
                problems.append(f"检索索引 {doc.id} 的 href {doc.href!r} 不在路由清单内（死链）")
        return problems

    def _internal_links(self) -> list[tuple[str, str]]:
        out: list[tuple[str, str]] = []
        nav = self.navigation
        for i, item in enumerate(nav.utility_left + nav.utility_right):
            out.append((f"navigation.utility[{i}]", item.href))
        for group in nav.main:
            if group.href:
                out.append((f"navigation.main[{group.label}]", group.href))
            for item in group.items:
                out.append((f"navigation.main[{group.label}][{item.label}]", item.href))
        out.append(("navigation.cta", nav.cta.href))
        for group in nav.footer_columns:
            for item in group.items:
                out.append((f"navigation.footer[{group.label}][{item.label}]", item.href))
        for item in nav.footer_legal:
            out.append((f"navigation.footerLegal[{item.label}]", item.href))
        return out

    # ------------------------------------------------------------------ hash
    def _compute_hash(self) -> str:
        h = hashlib.sha256()
        for path in sorted(self.dir.rglob("*")):
            if path.is_file() and path.suffix in {".json", ".md"}:
                h.update(path.relative_to(self.dir).as_posix().encode("utf-8"))
                h.update(path.read_bytes())
        return h.hexdigest()[:16]

    # ---------------------------------------------------------------- queries
    def product(self, slug: str) -> ProductDetail | None:
        return self.products.get(slug)

    def solution(self, slug: str) -> SolutionDetail | None:
        return self.solutions.get(slug)

    def insight(self, slug: str) -> InsightDetail | None:
        return self.insights_by_slug.get(slug)

    def all_media(self) -> list[MediaAsset]:
        return list(self.media.values())

    def screenshot_count(self) -> int:
        return sum(1 for a in self.media.values() if a.kind == "screenshot")


_repository: ContentRepository | None = None


def load_repository(content_dir: Path) -> ContentRepository:
    global _repository
    _repository = ContentRepository(content_dir).load()
    return _repository


def get_repository() -> ContentRepository:
    if _repository is None:
        raise ContentError("ContentRepository 尚未加载（lifespan 未执行？）")
    return _repository


def reset_repository() -> None:
    global _repository
    _repository = None
