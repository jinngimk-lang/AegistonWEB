"""磁盘级资源校验（**CI 专用**，spec §12.1 / P1-6）。

    python -m backend.scripts.validate_assets --manifest backend/app/content/media_manifest.json --media-root frontend/public --stock backend/app/content/stock_credits.json

为什么单独拆出来：图片产物在 `frontend/public/media/**`，**后端镜像里根本没有
这棵树**。若把「文件存在且宽高一致」写进 `tests/test_content_integrity.py`，
要么测试在容器 / CI 里恒失败，要么被迫把几十 MB 图片塞进后端镜像。
所以清单级校验留在后端单测，磁盘级校验只在同时看得到前后端两棵树的 CI 里跑。
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    Image = None  # type: ignore[assignment]

MAX_SCREENSHOT_BYTES = 320 * 1024


def log(msg: str) -> None:
    print(f"[validate-assets] {msg}", flush=True)


def check(entries: list[dict], media_root: Path, label: str) -> list[str]:
    problems: list[str] = []
    for asset in entries:
        rel = str(asset["src"]).lstrip("/")
        path = media_root / rel
        if not path.exists():
            problems.append(f"{label} {asset['id']}: 文件不存在 {path}")
            continue
        if Image is not None:
            with Image.open(path) as img:
                if (img.width, img.height) != (asset["width"], asset["height"]):
                    problems.append(
                        f"{label} {asset['id']}: 宽高不一致 —— 清单 "
                        f"{asset['width']}x{asset['height']}，实际 {img.width}x{img.height}"
                    )
        size = path.stat().st_size
        if asset.get("kind") in {"screenshot", "diagram"} and size > MAX_SCREENSHOT_BYTES:
            problems.append(
                f"{label} {asset['id']}: {size // 1024} KB 超出单张预算 "
                f"{MAX_SCREENSHOT_BYTES // 1024} KB"
            )
        for extra_key in ("videoSrc", "poster"):
            extra = asset.get(extra_key)
            if extra and not (media_root / str(extra).lstrip("/")).exists():
                problems.append(f"{label} {asset['id']}: {extra_key} 指向的文件不存在 {extra}")
    return problems


def main() -> int:
    ap = argparse.ArgumentParser(description="磁盘级资源校验（CI 专用）")
    ap.add_argument("--manifest", default="backend/app/content/media_manifest.json")
    ap.add_argument("--stock", default="backend/app/content/stock_credits.json")
    ap.add_argument("--media-root", default="frontend/public")
    args = ap.parse_args()

    media_root = Path(args.media_root)
    if not media_root.exists():
        log(f"SKIP 找不到媒体根目录 {media_root} —— 本校验只在同时有前后端两棵树时运行")
        return 0

    manifest = json.loads(Path(args.manifest).read_text(encoding="utf-8"))
    problems = check(manifest["assets"], media_root, "product")
    total = len(manifest["assets"])

    stock_path = Path(args.stock)
    if stock_path.exists():
        stock = json.loads(stock_path.read_text(encoding="utf-8"))["assets"]
        problems += check(stock, media_root, "stock")
        total += len(stock)

    if Image is None:
        log("WARN 未安装 Pillow，跳过宽高一致性检查（pip install 'aegiston-api[assets]'）")

    if problems:
        log(f"FAIL {len(problems)} 项：")
        for item in problems:
            log(f"  - {item}")
        return 1

    log(f"PASS {total} 项资源全部存在，宽高与体积均符合清单")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
