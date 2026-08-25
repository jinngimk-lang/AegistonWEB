"""洞察正文：Markdown → 安全 HTML（+ 目录锚点）。

正文经 ``markdown-it`` 渲染后必须过一遍 ``bleach`` 白名单 —— 这是 §11.3 敢在
CSP 里选 ``'unsafe-inline'`` 的前提之一（站内没有未净化的富文本渲染路径）。

⚠️ **锚点注入与白名单的顺序不能反**（v3 spec §4.3.1 / P1-2）：
``bleach.clean()`` 丢弃不在 ``ALLOWED_ATTRS`` 里的属性时**不报错、不告警、
不返回任何提示**。如果先注入 ``id="sec-1"`` 再过白名单而白名单里没有 ``id``，
锚点会被无声抹掉 —— 页面上目录点了没反应，而 pytest / tsc / stylelint /
next build 没有一条会变红。这与 v2 B-1 / B-8 / F-13 是同一类静默失效。
所以本模块先放开 ``h2/h3/h4: ["id"]``，再由 markdown-it 的 ``heading_open``
渲染规则注入 id，让它**随正文一起过 bleach**。
``tests/test_insights.py`` 断言「``bodyHtml`` 中 ``id="sec-N"`` 的数量 == len(toc)」，
同时守住「白名单被改回去」与「注入被 bleach 吃掉」两种回归。
"""

from __future__ import annotations

import re
from collections.abc import MutableMapping
from typing import Any

import bleach
from markdown_it import MarkdownIt

ALLOWED_TAGS = [
    "p", "br", "hr",
    "h2", "h3", "h4",
    "strong", "em", "code", "pre",
    "ul", "ol", "li",
    "blockquote",
    "a",
    "table", "thead", "tbody", "tr", "th", "td",
]

ALLOWED_ATTRS = {
    "a": ["href", "title", "rel", "target"],
    "th": ["align"],
    "td": ["align"],
    # 目录锚点（v3 spec §4.3.1 / P1-2）。h4 不进目录但仍需要 id 供正文内部引用，
    # 因此一并放开；它拿到的是 sub-N 而不是 sec-N，见 _heading_open()。
    "h2": ["id"],
    "h3": ["id"],
    "h4": ["id"],
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto"]

_md = MarkdownIt("commonmark", {"html": False, "linkify": False, "typographer": False})
_md.enable("table")


def _heading_open(
    renderer: Any, tokens: list[Any], idx: int, options: Any, env: dict[str, Any]
) -> str:
    """给 h2 / h3 注入 ``sec-N``、给 h4 注入 ``sub-N``。

    注入发生在 **bleach 之前**，属性能否活下来由 ``ALLOWED_ATTRS`` 决定 ——
    这正是我们想要的：白名单被改回去时断言会红，而不是静默失效。
    """
    token = tokens[idx]
    if token.tag in ("h2", "h3"):
        seq = env.get("_sec_seq", 0) + 1
        env["_sec_seq"] = seq
        token.attrSet("id", f"sec-{seq}")
    elif token.tag == "h4":
        seq = env.get("_sub_seq", 0) + 1
        env["_sub_seq"] = seq
        token.attrSet("id", f"sub-{seq}")
    return renderer.renderToken(tokens, idx, options, env)


_md.add_render_rule("heading_open", _heading_open)

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")
#: 从**净化之后**的 HTML 里回收目录 —— 只有活下来的 id 才算数。
_TOC_RE = re.compile(
    r"<h(?P<level>[23])[^>]*\sid=\"(?P<anchor>sec-\d+)\"[^>]*>(?P<inner>.*?)</h(?P=level)>",
    re.DOTALL,
)


def render_markdown(source: str) -> str:
    html = _md.render(source, {})
    cleaned = bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    return bleach.linkify(cleaned, callbacks=[_external_link_attrs], skip_tags=["pre", "code"])


def extract_toc(html: str) -> list[dict[str, Any]]:
    """从净化后的正文 HTML 中收集 h2 / h3 目录项。

    刻意在**净化之后**解析：如果 ``id`` 被 bleach 吃掉，这里就收不到东西，
    目录直接为空 —— 一个会被断言抓住的显性失败，而不是「目录在但点不动」。
    """
    items: list[dict[str, Any]] = []
    for match in _TOC_RE.finditer(html):
        text = to_plain_text(match.group("inner"))
        if not text:
            continue
        items.append(
            {"level": int(match.group("level")), "text": text, "anchor": match.group("anchor")}
        )
    return items


def _external_link_attrs(
    attrs: MutableMapping[Any, str], new: bool = False
) -> MutableMapping[Any, str]:
    """外链一律补 ``rel="noopener noreferrer"`` 与 ``target="_blank"``。

    bleach 的 linkify 回调用 ``(namespace, name)`` 元组作属性键；签名必须与
    ``bleach.callbacks._Callback`` 协议一致（含用不到但必须存在的 ``new``）。
    """
    del new
    href = attrs.get((None, "href"), "")
    if href.startswith("http"):
        attrs[(None, "rel")] = "noopener noreferrer"
        attrs[(None, "target")] = "_blank"
    return attrs


def strip_frontmatter(source: str) -> tuple[dict[str, str], str]:
    """极简 frontmatter 解析。索引信息以 ``index.json`` 为准，这里只做兼容。"""
    if not source.startswith("---"):
        return {}, source
    end = source.find("\n---", 3)
    if end == -1:
        return {}, source
    raw = source[3:end].strip()
    body = source[end + 4 :].lstrip("\n")
    meta: dict[str, str] = {}
    for line in raw.splitlines():
        if ":" in line:
            k, _, v = line.partition(":")
            meta[k.strip()] = v.strip().strip('"')
    return meta, body


def to_plain_text(html: str) -> str:
    return _WS_RE.sub(" ", _TAG_RE.sub(" ", html)).strip()


def reading_minutes(plain: str) -> int:
    """中文按 400 字/分钟估算，最少 1 分钟。"""
    return max(1, round(len(plain) / 400))


def parse_post(source: str) -> tuple[str, str, list[dict[str, Any]]]:
    """返回 ``(安全 HTML, 纯文本, 目录项)``。"""
    _meta, body = strip_frontmatter(source)
    html = render_markdown(body)
    return html, to_plain_text(html), extract_toc(html)
