"""截图敏感信息打码（spec §6.4；Subtask #3 人工过审的处置工具）。

PPT 里的产品截图是在**真实环境**下截的。逐张过审后有 9 张带出了不该上公开站的
内容：实名企业与信用评分、真实法定代表人姓名、真实政府采购项目与中标金额、
内网服务器 IP、真实个人邮箱，以及能反推客户身份的楼宇招牌。打码区逐条登记在
`asset_map.py` 的 `REDACTIONS` 里，本脚本是它唯一的执行器。

两个入口，同一份规格
--------------------
1. **管线内**：`extract_pptx_assets.py` 在转码前调用 `apply_redactions()`。
   这是根治点 —— 只要重跑提取，产物一定是打过码的，不依赖谁记得补一步。
2. **独立**：本脚本直接改写 `frontend/public/media/product/*.webp`。
   手上没有 PPT、或只想重跑打码时用它。

为什么是 mosaic 而不是高斯模糊
------------------------------
高斯模糊是可逆的（去卷积 / 超分都能还原出可读文本，业界翻车案例不少）。
这里做的是**区块均值化**：块内所有像素塌缩成一个均值，原始高频信息在
量化那一步就被丢弃了，不存在可还原的残留。块大小取区域短边的 1/6 并夹在
[8, 64] 像素之间 —— 小到不破坏版面观感，大到单块内放不下一个可辨认的字。

CLI
---
    python -m backend.scripts.redact                 # 就地打码 + 刷新清单
    python -m backend.scripts.redact --check         # CI 门禁，不写文件
    python -m backend.scripts.redact --dry-run       # 只打印将要处理的区域
    python -m backend.scripts.redact --preview-dir out/  # 另存一份供人工复核
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image

if __package__ in (None, ""):  # 允许 `python backend/scripts/redact.py` 直接跑
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from asset_map import REDACTIONS, RedactRegion, redaction_fingerprint
else:
    from .asset_map import REDACTIONS, RedactRegion, redaction_fingerprint

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_IMAGES = REPO_ROOT / "frontend" / "public" / "media" / "product"
DEFAULT_MANIFEST = REPO_ROOT / "backend" / "app" / "content" / "media_manifest.json"

DEFAULT_QUALITY = 82
BLUR_EDGE = 8
# 实心块用中性灰：在浅色界面截图上读起来像「此处已打码」，而不是像渲染坏了。
FILL_COLOR = (203, 208, 214)


def log(msg: str) -> None:
    print(f"[redact] {msg}", flush=True)


def _block_size(width: int, height: int) -> int:
    """块大小取区域短边的 1/6，夹在 [8, 64]。"""
    return max(8, min(64, min(width, height) // 6 or 8))


def _mosaic(region: Image.Image) -> Image.Image:
    """区块均值化：先降采样到「每块一个像素」，再最近邻放大回去。

    降采样用 BOX（块内取均值），放大用 NEAREST（不插值，保持硬边）。
    信息在降采样那一步就没了，放大不会、也无法把它找回来。
    """
    w, h = region.size
    block = _block_size(w, h)
    small = region.resize(
        (max(1, w // block), max(1, h // block)), Image.Resampling.BOX
    )
    return small.resize((w, h), Image.Resampling.NEAREST)


def _to_box(region: RedactRegion, width: int, height: int) -> tuple[int, int, int, int]:
    left = max(0, min(width - 1, round(region.x0 * width)))
    top = max(0, min(height - 1, round(region.y0 * height)))
    right = max(left + 1, min(width, round(region.x1 * width)))
    bottom = max(top + 1, min(height, round(region.y1 * height)))
    return left, top, right, bottom


def apply_redactions(img: Image.Image, asset_id: str) -> Image.Image:
    """按 `REDACTIONS[asset_id]` 就地打码，返回同一张图。

    `extract_pptx_assets.py` 在 `shrink_to_budget()` **之前**调用它 ——
    坐标是归一化的，所以在原始分辨率上打码、再统一降宽，结果一致。
    未登记的 asset 原样返回，调用方不需要先判断。
    """
    regions = REDACTIONS.get(asset_id)
    if not regions:
        return img
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    for region in regions:
        box = _to_box(region, img.width, img.height)
        if region.mode == "fill":
            img.paste(Image.new(img.mode, (box[2] - box[0], box[3] - box[1]), FILL_COLOR), box)
        else:
            img.paste(_mosaic(img.crop(box)), box)
    return img


def blur_data_url(img: Image.Image) -> str:
    """与 `extract_pptx_assets.blur_data_url()` 保持逐字一致的实现。"""
    thumb = img.convert("RGB").resize((BLUR_EDGE, BLUR_EDGE), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    thumb.save(buf, format="WEBP", quality=40, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def _load_manifest(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def run(
    images_dir: Path,
    manifest_path: Path,
    *,
    quality: int,
    dry_run: bool,
    preview_dir: Path | None,
) -> int:
    manifest = _load_manifest(manifest_path)
    assets = manifest["assets"]
    assert isinstance(assets, list)
    by_id = {a["id"]: a for a in assets if isinstance(a, dict)}

    missing = sorted(set(REDACTIONS) - set(by_id))
    if missing:
        for asset_id in missing:
            log(f"! REDACTIONS 里的 {asset_id} 不在 media_manifest.json 中")
        log(f"ERROR: {len(missing)} 条打码规格没有对应 asset")
        return 1

    touched = 0
    for asset_id in sorted(REDACTIONS):
        regions = REDACTIONS[asset_id]
        src = images_dir / f"{asset_id}.webp"
        if not src.exists():
            log(f"! 找不到 {src}")
            return 1

        with Image.open(src) as opened:
            opened.load()
            img = opened.convert("RGB")

        for region in regions:
            box = _to_box(region, img.width, img.height)
            log(f"  {asset_id} [{region.mode}] {box} · {region.note}")
        if dry_run:
            touched += 1
            continue

        apply_redactions(img, asset_id)
        dest = (preview_dir / f"{asset_id}.webp") if preview_dir else src
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, format="WEBP", quality=quality, method=6)

        if preview_dir is None:
            with Image.open(dest) as saved:
                entry = by_id[asset_id]
                entry["width"], entry["height"] = saved.size
                entry["blurDataUrl"] = blur_data_url(saved)
                entry["redacted"] = True
        touched += 1

    if dry_run:
        log(f"--dry-run：{touched} 个 asset、{sum(len(v) for v in REDACTIONS.values())} 个区域，未写文件")
        return 0
    if preview_dir is not None:
        log(f"预览已写入 {preview_dir}（{touched} 个 asset），清单未改动")
        return 0

    manifest["_redactionFingerprint"] = redaction_fingerprint()
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    log(f"完成：{touched} 个 asset 已打码，清单指纹 {manifest['_redactionFingerprint']}")
    return 0


def check(manifest_path: Path) -> int:
    """CI 门禁：清单里的指纹必须与当前 `REDACTIONS` 一致。

    捕捉的是「改了打码规格、忘了重跑脚本」这一类静默回归 ——
    这种回归不会让任何测试变红，但会把敏感信息重新放上公开站。
    """
    manifest = _load_manifest(manifest_path)
    expected = redaction_fingerprint()
    actual = manifest.get("_redactionFingerprint")
    if actual != expected:
        log(f"FAIL 打码指纹不一致：清单 {actual!r} ≠ 规格 {expected!r}")
        log("     REDACTIONS 改过但没重跑：python -m backend.scripts.redact")
        return 1

    assets = manifest["assets"]
    assert isinstance(assets, list)
    flagged = {a["id"] for a in assets if isinstance(a, dict) and a.get("redacted")}
    stale = sorted(set(REDACTIONS) - flagged)
    if stale:
        log(f"FAIL 以下 asset 声明了打码区但清单未标记 redacted：{', '.join(stale)}")
        return 1

    log(f"PASS {len(REDACTIONS)} 个 asset、"
        f"{sum(len(v) for v in REDACTIONS.values())} 个打码区，指纹 {expected}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="按 REDACTIONS 对截图打码（spec §6.4）")
    ap.add_argument("--images", default=str(DEFAULT_IMAGES))
    ap.add_argument("--manifest", default=str(DEFAULT_MANIFEST))
    ap.add_argument("--quality", type=int, default=DEFAULT_QUALITY)
    ap.add_argument("--dry-run", action="store_true", help="只打印区域，不写文件")
    ap.add_argument("--check", action="store_true", help="CI 门禁：校验指纹，不写文件")
    ap.add_argument("--preview-dir", default=None, help="另存到该目录供人工复核，不改原图")
    args = ap.parse_args()

    manifest_path = Path(args.manifest)
    if args.check:
        return check(manifest_path)
    return run(
        Path(args.images),
        manifest_path,
        quality=args.quality,
        dry_run=args.dry_run,
        preview_dir=Path(args.preview_dir) if args.preview_dir else None,
    )


if __name__ == "__main__":
    raise SystemExit(main())
