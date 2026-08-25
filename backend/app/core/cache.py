"""ETag 计算与 304 短路（spec §7.1 / §4.3）。

只读接口统一带 ``ETag`` + ``Cache-Control: public, max-age=60,
stale-while-revalidate=300``；命中 ``If-None-Match`` 返回 304。
ETag 由**内容包 hash + 路由标识**组成 —— 内容包一变，全站 ETag 一起变。
"""

from __future__ import annotations

import hashlib
from typing import Any

from fastapi import Request, Response

CACHE_CONTROL_READONLY = "public, max-age=60, stale-while-revalidate=300"
CACHE_CONTROL_STATIC = "public, max-age=3600, stale-while-revalidate=86400"


def make_etag(content_hash: str, *parts: Any) -> str:
    raw = "|".join([content_hash, *[str(p) for p in parts]])
    return 'W/"' + hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32] + '"'


def apply_cache(
    request: Request,
    response: Response,
    etag: str,
    *,
    cache_control: str = CACHE_CONTROL_READONLY,
) -> Response | None:
    """写入缓存响应头。

    命中 ``If-None-Match`` 时返回一个 304 ``Response``，调用方直接把它返回即可 ——
    返回 ``Response`` 实例会让 FastAPI 跳过 ``response_model`` 序列化，
    这正是「304 无消息体」所需要的。未命中时返回 ``None``。
    """
    headers = {
        "ETag": etag,
        "Cache-Control": cache_control,
        "Vary": "Accept-Encoding",
    }
    response.headers.update(headers)
    inm = request.headers.get("if-none-match")
    if inm and etag in {v.strip() for v in inm.split(",")}:
        return Response(status_code=304, headers=headers)
    return None
