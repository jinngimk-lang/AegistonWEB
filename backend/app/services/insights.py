"""洞察正文：Markdown → 安全 HTML。

正文经 ``markdown-it`` 渲染后必须过一遍 ``bleach`` 白名单 —— 这是 §11.3 敢在
CSP 里选 ``'unsafe-inline'`` 的前提之一（站内没有未净化的富文本渲染路径）。
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
}

ALLOWED_PROTOCOLS = ["http", "https", "mailto"]

_md = MarkdownIt("commonmark", {"html": False, "linkify": False, "typographer": False})
_md.enable("table")

_TAG_RE = re.compile(r"<[^>]+>")
_WS_RE = re.compile(r"\s+")


def render_markdown(source: str) -> str:
    html = _md.render(source)
    cleaned = bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    return bleach.linkify(cleaned, callbacks=[_external_link_attrs], skip_tags=["pre", "code"])


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


def parse_post(source: str) -> tuple[str, str]:
    """返回 ``(安全 HTML, 纯文本)``。"""
    _meta, body = strip_frontmatter(source)
    html = render_markdown(body)
    return html, to_plain_text(html)
