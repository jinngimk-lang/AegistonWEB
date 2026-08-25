"""站内检索索引：把内容包**摊平**成文档列表（v3 spec §4.2.6）。

职责边界（v3 spec §4.2.1 决策 A-1）：

    遍历内容包、抽取可检索文本、截断        → 本模块（Python）
    分词、打分、排序、分组、截断            → frontend/src/lib/search.ts（TypeScript）

**本模块不做打分、不做排序**。理由不是分工好看，而是两份排序实现必然在中文
分词边界、字段权重、同分排序上无声漂移，表现为「同一个词在 /search 页和 ⌘K
面板里排序不同」，且没有任何测试会发现。接口形状上的堵法见 `SearchDoc`
（响应体里不存在 `score`）。

索引在 ``ContentRepository.load()`` 成功后由 lifespan 调用一次，常驻内存 ——
与 CLAUDE.md §7「内容只读常驻内存、读路径零 I/O」同一口径：索引是内容的
派生物，跟内容一样只读。

该端点**只在构建期被调用**（`frontend/scripts/sync-content.mjs`），运行期
浏览器打的是构建期落盘的 `public/search-index.json`。
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from app.schemas.search import SearchDoc, SearchIndexPayload

if TYPE_CHECKING:  # pragma: no cover - 仅为类型标注，避免与 content.py 循环导入
    from app.services.content import ContentRepository

#: 正文截断上限。约 800 汉字 + 一倍标点余量；再长对召回的贡献极低，
#: 却线性放大索引体积（v3 spec §6.2 / R2）。
BODY_LIMIT = 1600
EXCERPT_LIMIT = 160

_WS_RE = re.compile(r"\s+")
_TAG_RE = re.compile(r"<[^>]+>")
_CODE_FENCE_RE = re.compile(r"```.*?```", re.DOTALL)
_IMAGE_RE = re.compile(r"!\[[^\]]*\]\([^)]*\)")
_LINK_RE = re.compile(r"\[([^\]]*)\]\([^)]*\)")
_HEADING_RE = re.compile(r"^#{1,6}\s*", re.MULTILINE)


def plain_text(value: str) -> str:
    """HTML / Markdown → 纯文本。去 code fence、去图片、链接只留锚文本。"""
    text = _CODE_FENCE_RE.sub(" ", value)
    text = _IMAGE_RE.sub(" ", text)
    text = _LINK_RE.sub(r"\1", text)
    text = _HEADING_RE.sub("", text)
    text = _TAG_RE.sub(" ", text)
    return _WS_RE.sub(" ", text).strip()


def _join(*parts: object) -> str:
    """把任意混合的字符串 / 字符串列表拼成一段可检索文本。"""
    chunks: list[str] = []
    for part in parts:
        if part is None:
            continue
        if isinstance(part, str):
            if part.strip():
                chunks.append(part.strip())
        elif isinstance(part, (list, tuple)):
            for item in part:
                nested = _join(item)
                if nested:
                    chunks.append(nested)
    return " ".join(chunks)


def _clip(text: str, limit: int) -> str:
    text = _WS_RE.sub(" ", text).strip()
    if len(text) <= limit:
        return text
    # 留一个字符给省略号，保证 len() 严格不超过 schema 的 max_length
    return f"{text[: limit - 1].rstrip()}…"


def _doc(
    *,
    doc_id: str,
    doc_type: str,
    title: str,
    href: str,
    excerpt: str,
    subtitle: str | None = None,
    keywords: list[str] | None = None,
    body: str = "",
    source_slides: list[int] | None = None,
) -> SearchDoc:
    return SearchDoc(
        id=doc_id,
        type=doc_type,  # type: ignore[arg-type]
        title=title,
        subtitle=subtitle,
        href=href,
        excerpt=_clip(plain_text(excerpt), EXCERPT_LIMIT),
        keywords=[k for k in (keywords or []) if k],
        body=_clip(plain_text(body), BODY_LIMIT),
        source_slides=source_slides or [],
    )


def _product_docs(repo: ContentRepository) -> list[SearchDoc]:
    docs: list[SearchDoc] = []
    for slug, detail in repo.products.items():
        docs.append(
            _doc(
                doc_id=f"product:{slug}",
                doc_type="product",
                title=f"{detail.name_en} {detail.name_cn}",
                subtitle=detail.tagline,
                href=f"/products/{slug}",
                excerpt=detail.positioning,
                keywords=[detail.name_en, detail.name_cn, detail.tier_label, detail.code]
                + [v.title for v in detail.core_values]
                + [g.title for g in detail.feature_groups],
                body=_join(
                    detail.positioning,
                    [f"{i.title} {i.description}" for i in detail.background],
                    [f"{i.title} {i.description}" for i in detail.core_values],
                    [
                        f"{g.title} " + _join([f"{i.title} {i.description}" for i in g.items])
                        for g in detail.feature_groups
                    ],
                    [f"{s.title} {s.description or ''}" for s in detail.screens],
                    detail.delivery,
                ),
                source_slides=detail.source_slides,
            )
        )

    deployment = repo.deployment
    docs.append(
        _doc(
            doc_id="product:deployment",
            doc_type="product",
            title=deployment.title,
            subtitle=deployment.eyebrow,
            href="/products/deployment",
            excerpt=deployment.lead,
            keywords=[f.name for f in deployment.forms],
            body=_join(
                deployment.lead,
                [f"{i.title} {i.description}" for i in deployment.policy],
                [f"{i.title} {i.description}" for i in deployment.readiness],
                [f"{f.name} {_join(f.points)} {f.fit}" for f in deployment.forms],
                deployment.conclusion,
            ),
            source_slides=deployment.source_slides,
        )
    )
    return docs


def _solution_docs(repo: ContentRepository) -> list[SearchDoc]:
    docs: list[SearchDoc] = []
    for slug, detail in repo.solutions.items():
        docs.append(
            _doc(
                doc_id=f"solution:{slug}",
                doc_type="solution",
                title=detail.industry,
                subtitle=detail.customer,
                href=f"/solutions/{slug}",
                excerpt=detail.lead,
                keywords=[detail.industry, detail.customer, detail.deployment],
                body=_join(
                    detail.lead,
                    detail.scope,
                    detail.workflow,
                    detail.difficulty,
                    detail.assets,
                    detail.closure,
                    [f"{m.label} {m.value}" for m in detail.metrics],
                    detail.takeaway,
                ),
                source_slides=detail.source_slides,
            )
        )
    return docs


def _research_docs(repo: ContentRepository) -> list[SearchDoc]:
    docs: list[SearchDoc] = []
    for pillar in repo.research.pillars:
        docs.append(
            _doc(
                doc_id=f"research:{pillar.id}",
                doc_type="research",
                title=pillar.title,
                subtitle=pillar.product_label,
                # 技术模块卡在 /research 页上以 id 作锚点（PillarCard 渲染 id={pillar.id}）
                href=f"/research#{pillar.id}",
                excerpt=pillar.lead,
                keywords=[pillar.product_label, pillar.product],
                body=_join(
                    pillar.lead,
                    pillar.uncertainty,
                    pillar.mechanism,
                    pillar.parameters,
                    pillar.value,
                    [f"{m.label} {m.value}" for m in pillar.highlights],
                ),
                source_slides=pillar.source_slides,
            )
        )

    papers = repo.papers
    docs.append(
        _doc(
            doc_id="research:papers",
            doc_type="research",
            title=papers.title,
            subtitle=papers.eyebrow,
            href="/research/papers",
            excerpt=papers.description,
            keywords=[p.venue for p in papers.papers] + [p.title_en for p in papers.papers],
            body=_join(
                papers.description,
                [
                    f"{p.title} {p.title_en} {p.venue} {p.summary} {p.problem} {p.method} {p.result}"
                    for p in papers.papers
                ],
                papers.footnote,
            ),
            source_slides=papers.source_slides,
        )
    )
    return docs


def _insight_docs(repo: ContentRepository) -> list[SearchDoc]:
    return [
        _doc(
            doc_id=f"insight:{post.slug}",
            doc_type="insight",
            title=post.title,
            subtitle=post.category_label,
            href=post.href,
            excerpt=post.excerpt,
            keywords=[post.category_label, post.published_at.isoformat()],
            body=plain_text(post.body_html),
            source_slides=post.source_slides,
        )
        for post in repo.insights
    ]


def _page_docs(repo: ContentRepository) -> list[SearchDoc]:
    """静态页面。

    ⚠️ 文案一律取自内容包（`home.json` / `about/*.json` / `site.json` 的导航
    标签），**不新写摘要** —— CLAUDE.md §4「内容不臆造」。法务页与网站地图的
    正文在前端，后端拿不到，因此只用导航里已有的标签与站点描述，
    不编造页面简介。
    """
    home = repo.home
    about = repo.about
    settings = repo.settings

    #: 导航里已有的标签，供法务页 / 网站地图取标题与短说明，避免臆造
    nav_labels: dict[str, str] = {}
    for group in repo.navigation.footer_columns:
        for item in group.items:
            nav_labels.setdefault(item.href, item.label)
    for item in repo.navigation.footer_legal:
        nav_labels.setdefault(item.href, item.label)

    docs: list[SearchDoc] = [
        _doc(
            doc_id="page:home",
            doc_type="page",
            title=f"{settings.name_cn} {settings.name_en}",
            subtitle=settings.tagline,
            href="/",
            excerpt=settings.description,
            keywords=settings.keywords,
            body=_join(
                home.hero.subtitle,
                home.domains_desc,
                home.solutions_desc,
                home.philosophy_desc,
                [f"{d.title} {d.description}" for d in home.domains],
                [f"{v.title} {v.description}" for v in home.values],
                [f"{m.label} {m.value} {m.note}" for m in home.metrics],
                home.sustain.description,
            ),
            source_slides=home.source_slides,
        ),
        _doc(
            doc_id="page:about",
            doc_type="page",
            title=about.title,
            subtitle=about.eyebrow,
            href="/about",
            excerpt=about.lead,
            keywords=[settings.legal_name],
            body=_join(about.intro, [f"{f.label} {f.body}" for f in about.facts], about.focus),
            source_slides=about.source_slides,
        ),
        _doc(
            doc_id="page:about-positioning",
            doc_type="page",
            title=about.positioning_title,
            subtitle=about.eyebrow,
            href="/about/positioning",
            excerpt=about.positioning_lead,
            keywords=[t.name for t in about.tiers],
            body=_join(about.positioning_body, [f"{t.tier} {t.name}" for t in about.tiers]),
            source_slides=about.source_slides,
        ),
        _doc(
            doc_id="page:about-team",
            doc_type="page",
            title=repo.team.title,
            subtitle=repo.team.eyebrow,
            href="/about/team",
            excerpt=repo.team.lead,
            keywords=[repo.team.leader.name, repo.team.leader.role],
            body=_join(
                repo.team.origin,
                repo.team.leader.bio,
                repo.team.leader_roles,
                [f"{m.name} {m.role} {_join(m.bio)}" for m in repo.team.members],
            ),
            source_slides=repo.team.source_slides,
        ),
        _doc(
            doc_id="page:about-strength",
            doc_type="page",
            title=about.strength_title,
            subtitle=about.eyebrow,
            href="/about/strength",
            excerpt=about.strength_lead,
            keywords=[],
            body=_join([f"{i.title} {i.description}" for i in about.strength]),
            source_slides=about.source_slides,
        ),
        _doc(
            doc_id="page:products",
            doc_type="page",
            title=repo.products_overview.title,
            subtitle=repo.products_overview.eyebrow,
            href="/products",
            excerpt=repo.products_overview.description,
            keywords=[p.name_en for p in repo.products_overview.products],
            body=_join(
                repo.products_overview.foundation_title,
                repo.products_overview.foundation_desc,
                [f"{i.title} {i.description}" for i in repo.products_overview.foundation],
                repo.products_overview.footnote,
            ),
            source_slides=repo.products_overview.source_slides,
        ),
        _doc(
            doc_id="page:solutions",
            doc_type="page",
            title=repo.solutions_overview.title,
            subtitle=repo.solutions_overview.eyebrow,
            href="/solutions",
            excerpt=repo.solutions_overview.description,
            keywords=[s.industry for s in repo.solutions_overview.solutions],
            body=_join(
                repo.solutions_overview.partner_title,
                repo.solutions_overview.partner_desc,
                repo.solutions_overview.method,
                repo.solutions_overview.footnote,
            ),
            source_slides=repo.solutions_overview.source_slides,
        ),
        _doc(
            doc_id="page:research",
            doc_type="page",
            title=repo.research.title,
            subtitle=repo.research.eyebrow,
            href="/research",
            excerpt=repo.research.description,
            keywords=[p.title for p in repo.research.pillars],
            body=_join(
                repo.research.footnote,
                [f"{m.label} {m.value}" for m in repo.research.highlights],
            ),
            source_slides=repo.research.source_slides,
        ),
        _doc(
            doc_id="page:insights",
            doc_type="page",
            title=home.news_title_lead + home.news_title_em,
            subtitle=home.news_eyebrow,
            href="/insights",
            excerpt=home.news_desc,
            keywords=["行业洞察", "公司动态", "研究进展"],
            body=_join([p.title for p in repo.insights]),
            source_slides=home.source_slides,
        ),
        _doc(
            doc_id="page:careers",
            doc_type="page",
            title=repo.careers.title,
            subtitle=repo.careers.eyebrow,
            href="/careers",
            excerpt=repo.careers.lead,
            keywords=[o.title for o in repo.careers.openings],
            body=_join(
                [f"{i.title} {i.description}" for i in repo.careers.why],
                [f"{i.title} {i.description}" for i in repo.careers.openings],
                repo.careers.process,
                repo.careers.contact_note,
            ),
            source_slides=repo.careers.source_slides,
        ),
        _doc(
            doc_id="page:contact",
            doc_type="page",
            title=repo.navigation.cta.label,
            subtitle=settings.name_cn,
            href="/contact",
            excerpt=settings.description,
            keywords=["商务咨询", "预约演示", "试用", "合作"],
            body=_join(settings.contact.working_hours, settings.contact.address),
            source_slides=[],
        ),
    ]

    # 网站地图 + 三个法务页：正文在前端，这里只用导航里已有的标签，不编造简介。
    for href in ("/sitemap", "/legal/terms", "/legal/privacy", "/legal/credits"):
        label = nav_labels.get(href)
        if not label:
            continue
        docs.append(
            _doc(
                doc_id=f"page:{href.strip('/').replace('/', '-')}",
                doc_type="page",
                title=label,
                subtitle=settings.name_cn,
                href=href,
                excerpt=label,
                keywords=[],
                body="",
                source_slides=[],
            )
        )
    return docs


def build_search_index(repo: ContentRepository) -> SearchIndexPayload:
    """摊平内容包为检索文档列表。纯函数式：同一个 repo 两次调用结果相同。"""
    docs = (
        _product_docs(repo)
        + _solution_docs(repo)
        + _research_docs(repo)
        + _insight_docs(repo)
        + _page_docs(repo)
    )
    return SearchIndexPayload(
        version=1,
        content_hash=repo.content_hash,
        generated_at=datetime.now(UTC).isoformat(timespec="seconds"),
        docs=docs,
    )
