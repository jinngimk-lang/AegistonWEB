"""站内检索索引的数据契约（v3 spec §5.1 / §6.1）。

⚠️ **后端不打分、不排序**（v3 spec §4.2.1 决策 A-1）。
打分算法只在 ``frontend/src/lib/search.ts`` 里实现**一份**，`/search` 页（Node）
与 ⌘K 面板（浏览器）共用同一个函数、同一份索引。两份排序实现必然在中文分词
边界、字段权重、同分排序上无声漂移，且没有任何测试会发现 —— 与 v2 B-1 / B-8
记录的「静默失效」同源。

因此本模块的响应体里**不得出现 ``score`` 或任何排序字段**；
``backend/tests/test_search.py::test_search_index_shape`` 从**接口形状**上守这条，
而不是靠约定（v3 spec R1）。
"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel

SearchDocType = Literal["product", "solution", "research", "insight", "page"]

#: 结果分组的固定顺序与中文标签。前端 `search.ts` 的 GROUP_ORDER 与此同源，
#: 但**不通过接口传递** —— 标签属于展示层，索引只带机器可判别的 `type`。
DOC_TYPE_LABELS: dict[str, str] = {
    "product": "产品",
    "solution": "行业实践",
    "research": "技术与研究",
    "insight": "洞察与动态",
    "page": "站点页面",
}


class SearchDoc(CamelModel):
    """一条可检索文档。

    ``body`` 上限 1600 字符（约 800 汉字 + 一倍标点余量）：超出部分对召回的
    贡献极低，却线性放大索引体积（v3 spec §4.2.6 / R2）。
    """

    id: str = Field(description='形如 "product:inkclaw"，全局唯一')
    type: SearchDocType
    title: str
    subtitle: str | None = None
    href: str = Field(description="必须命中 ContentRepository.route_paths()，否则即死链")
    excerpt: str = Field(max_length=160, description="直接用于结果展示，取内容包既有文案")
    keywords: list[str] = []
    body: str = Field(default="", max_length=1600, description="仅参与打分，不展示")
    source_slides: list[int] = []


class SearchIndexPayload(CamelModel):
    version: int = 1
    content_hash: str
    generated_at: str
    docs: list[SearchDoc]
