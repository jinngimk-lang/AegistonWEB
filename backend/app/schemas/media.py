"""媒体资源模型。清单由 ``scripts/extract_pptx_assets.py`` 生成，勿手改。"""

from __future__ import annotations

from typing import Literal

from pydantic import Field

from app.schemas.common import CamelModel


class MediaAsset(CamelModel):
    id: str = Field(description="站点内稳定 ID，如 ara-dashboard")
    src: str = Field(description="/media/product/ara-dashboard.webp")
    kind: Literal["screenshot", "diagram", "photo", "video"]
    width: int
    height: int
    blur_data_url: str
    alt: str
    caption: str | None = None
    source_slide: int | None = Field(default=None, description="PPT 页码，用于溯源")
    also_on: list[int] = Field(default_factory=list, description="多页引用时的其余页码")
    product: str | None = None
    source_media: str | None = Field(default=None, description="PPT 内原始媒体文件名")
    poster: str | None = Field(default=None, description="kind=video 时的海报图")
    video_src: str | None = None
    redacted: bool = Field(
        default=False,
        description=(
            "该截图含隐私打码区（spec §6.4）。截图取自真实环境，"
            "涉及第三方企业名、个人信息或内网地址的部分已不可逆地马赛克处理；"
            "/legal/credits 会据此对外说明。"
        ),
    )


class StockCredit(CamelModel):
    """外部配图的署名与许可（spec §6.3 / R11）。"""

    id: str
    src: str
    width: int
    height: int
    blur_data_url: str
    alt: str
    source: Literal["unsplash", "wikimedia"]
    photo_id: str
    author: str | None = None
    author_url: str | None = None
    license: str
    license_url: str | None = None
    origin_url: str | None = None


class MediaManifest(CamelModel):
    assets: list[MediaAsset]
    stock: list[StockCredit] = []
