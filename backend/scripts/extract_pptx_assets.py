"""从产品 PPT 中提取真实软件截图，转码为 WebP，并生成媒体清单。

用法（单行，跨平台；见 spec §7.4）::

    python -m backend.scripts.extract_pptx_assets --pptx "ref/智瞳安宇-总体产品介绍-V7.pptx" --out-images frontend/public/media/product --out-manifest backend/app/content/media_manifest.json

可选参数：``--quality 82 --max-width 2560 --force --dry-run``

设计要点
--------
* 只用 ``zipfile`` 直读 OOXML，不依赖 ``python-pptx``，也不需要渲染引擎（spec P2-10）。
* 幻灯片 → 媒体的映射从 ``ppt/slides/_rels/slideN.xml.rels`` 反查，并与
  ``asset_map.ASSET_MAP`` 的白名单**双向核对**：白名单里指向不存在页码的条目会直接失败，
  避免「改了 PPT 忘了改映射」变成线上碎图。
* ``image64.GIF``（25 MB 动图）走 ffmpeg → MP4 主路径；无 ffmpeg 时退化为首帧 WebP。
  两条路径都实现，并在日志里说明走了哪条（spec §6.4）。
* ``image94.emf`` 不做光栅化：用 React 内联 SVG 重绘（spec §6.4）。
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import re
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from asset_map import (
    ASSET_MAP,
    EMF_REDRAWN,
    ICON_MAP,
    REDACTIONS,
    AssetSpec,
    redaction_fingerprint,
)
from redact import apply_redactions

SLIDE_RE = re.compile(r"^ppt/slides/slide(\d+)\.xml$")
TARGET_RE = re.compile(r'Target="\.\./media/([^"]+)"')

BLUR_EDGE = 8
DEFAULT_QUALITY = 82
DEFAULT_MAX_WIDTH = 2560


def log(msg: str) -> None:
    print(f"[extract-pptx] {msg}", flush=True)


def build_slide_media_index(zf: zipfile.ZipFile) -> dict[str, list[int]]:
    """media 文件名 -> 出现的幻灯片页码（升序）。"""
    names = set(zf.namelist())
    index: dict[str, list[int]] = {}
    for name in sorted(names):
        m = SLIDE_RE.match(name)
        if not m:
            continue
        slide_no = int(m.group(1))
        rels = f"ppt/slides/_rels/slide{slide_no}.xml.rels"
        if rels not in names:
            continue
        for media in TARGET_RE.findall(zf.read(rels).decode("utf-8")):
            index.setdefault(media, []).append(slide_no)
    for pages in index.values():
        pages.sort()
    return index


def verify_map(index: dict[str, list[int]]) -> list[str]:
    """核对 ASSET_MAP 的每一条：媒体存在，且 slide 页码确实引用了它。"""
    problems: list[str] = []
    for spec in ASSET_MAP:
        pages = index.get(spec.media)
        if pages is None:
            problems.append(f"{spec.asset_id}: media {spec.media} 不在 PPT 中")
            continue
        if spec.slide not in pages:
            problems.append(
                f"{spec.asset_id}: 声明来自 p.{spec.slide}，实测出现在 {pages}"
            )
        for extra in spec.also_on:
            if extra not in pages:
                problems.append(
                    f"{spec.asset_id}: also_on 声明 p.{extra}，实测出现在 {pages}"
                )
    return problems


def blur_data_url(img: Image.Image) -> str:
    thumb = img.convert("RGB").resize((BLUR_EDGE, BLUR_EDGE), Image.Resampling.LANCZOS)
    buf = io.BytesIO()
    thumb.save(buf, format="WEBP", quality=40, method=6)
    return "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


def save_webp(img: Image.Image, dest: Path, quality: int, max_width: int) -> tuple[int, int]:
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGB")
    if img.width > max_width:
        ratio = max_width / img.width
        img = img.resize((max_width, max(1, round(img.height * ratio))), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, format="WEBP", quality=quality, method=6)
    return img.width, img.height


def shrink_to_budget(img: Image.Image, dest: Path, quality: int, max_width: int,
                     budget_bytes: int) -> tuple[int, int]:
    """单张截图 ≤ 320 KB（spec §10.4）；超出则逐档降宽重转。"""
    widths = [max_width, 1920, 1600, 1280]
    last: tuple[int, int] = (img.width, img.height)
    for w in widths:
        last = save_webp(img.copy(), dest, quality, w)
        if dest.stat().st_size <= budget_bytes:
            return last
    log(f"  ! {dest.name} 仍为 {dest.stat().st_size // 1024} KB（> {budget_bytes // 1024} KB），已用最小档")
    return last


def have_ffmpeg() -> str | None:
    return shutil.which("ffmpeg")


def convert_gif(raw: bytes, spec: AssetSpec, out_images: Path, quality: int,
                max_width: int) -> dict[str, object]:
    """GIF → ① ffmpeg 转 MP4 + 首帧 WebP 海报；② 无 ffmpeg 时退化为静态首帧。"""
    with Image.open(io.BytesIO(raw)) as gif:
        gif.seek(0)
        poster = gif.convert("RGB")
        w, h = poster.size
    poster_path = out_images / f"{spec.asset_id}.webp"
    pw, ph = shrink_to_budget(poster, poster_path, quality, max_width, 320 * 1024)
    with Image.open(poster_path) as p:
        blur = blur_data_url(p)

    ffmpeg = have_ffmpeg()
    entry: dict[str, object] = {
        "id": spec.asset_id,
        "src": f"/media/product/{spec.asset_id}.webp",
        "kind": "video",
        "width": pw,
        "height": ph,
        "blurDataUrl": blur,
        "alt": spec.alt,
        "caption": spec.caption,
        "sourceSlide": spec.slide,
        "alsoOn": list(spec.also_on),
        "product": spec.product,
        "sourceMedia": spec.media,
    }
    if not ffmpeg:
        log(f"  · {spec.asset_id}: 未找到 ffmpeg → 退化为静态首帧 WebP（{w}x{h} GIF）")
        entry["kind"] = "screenshot"
        return entry

    gif_tmp = out_images / f".{spec.asset_id}.gif"
    gif_tmp.write_bytes(raw)
    mp4_path = out_images / f"{spec.asset_id}.mp4"
    even_w = pw - (pw % 2)
    cmd = [
        ffmpeg, "-y", "-loglevel", "error", "-i", str(gif_tmp),
        "-movflags", "+faststart", "-pix_fmt", "yuv420p",
        "-vf", f"scale={even_w}:-2:flags=lanczos",
        "-c:v", "libx264", "-crf", "28", "-an", str(mp4_path),
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
        entry["videoSrc"] = f"/media/product/{spec.asset_id}.mp4"
        entry["poster"] = f"/media/product/{spec.asset_id}.webp"
        log(f"  · {spec.asset_id}: ffmpeg 主路径 → MP4 {mp4_path.stat().st_size // 1024} KB"
            f"（原 GIF {len(raw) // 1024 // 1024} MB）")
    except subprocess.CalledProcessError as exc:  # pragma: no cover - 环境相关
        log(f"  ! {spec.asset_id}: ffmpeg 失败（{exc.stderr[:160]!r}）→ 退化为静态首帧")
        entry["kind"] = "screenshot"
    finally:
        gif_tmp.unlink(missing_ok=True)
    return entry


def main() -> int:
    ap = argparse.ArgumentParser(description="从 PPT 提取真实截图并生成媒体清单")
    ap.add_argument("--pptx", required=True)
    ap.add_argument("--out-images", required=True)
    ap.add_argument("--out-manifest", required=True)
    ap.add_argument("--out-icons", default="frontend/public/media/icon")
    ap.add_argument("--quality", type=int, default=DEFAULT_QUALITY)
    ap.add_argument("--max-width", type=int, default=DEFAULT_MAX_WIDTH)
    ap.add_argument("--force", action="store_true", help="已存在也重新转码")
    ap.add_argument("--dry-run", action="store_true", help="只校验映射，不写文件")
    args = ap.parse_args()

    pptx = Path(args.pptx)
    if not pptx.exists():
        log(f"ERROR: 找不到 {pptx}")
        return 2

    out_images = Path(args.out_images)
    out_icons = Path(args.out_icons)
    out_manifest = Path(args.out_manifest)

    with zipfile.ZipFile(pptx) as zf:
        index = build_slide_media_index(zf)
        log(f"PPT 共 {len({n for n in zf.namelist() if SLIDE_RE.match(n)})} 页，"
            f"媒体 {len([n for n in zf.namelist() if n.startswith('ppt/media/')])} 个")

        problems = verify_map(index)
        if problems:
            for p in problems:
                log(f"  ! {p}")
            log(f"ERROR: ASSET_MAP 与 PPT 不一致，共 {len(problems)} 处")
            return 1
        log(f"ASSET_MAP 校验通过：{len(ASSET_MAP)}/{len(ASSET_MAP)} 条命中")

        if args.dry_run:
            log("--dry-run：仅校验，未写任何文件")
            return 0

        out_images.mkdir(parents=True, exist_ok=True)
        out_icons.mkdir(parents=True, exist_ok=True)

        manifest: list[dict[str, object]] = []
        for i, spec in enumerate(ASSET_MAP, 1):
            raw = zf.read(f"ppt/media/{spec.media}")
            if spec.media.lower().endswith(".gif"):
                manifest.append(convert_gif(raw, spec, out_images, args.quality, args.max_width))
                continue

            dest = out_images / f"{spec.asset_id}.webp"
            if dest.exists() and not args.force:
                with Image.open(dest) as existing:
                    w, h = existing.size
                    blur = blur_data_url(existing)
            else:
                with Image.open(io.BytesIO(raw)) as img:
                    img.load()
                    # 敏感信息在转码**之前**抹掉：只要走提取管线，产物一定是打过码的，
                    # 不依赖谁记得补跑 redact.py（spec §6.4）。
                    img = apply_redactions(img, spec.asset_id)
                    w, h = shrink_to_budget(img, dest, args.quality, args.max_width, 320 * 1024)
                with Image.open(dest) as saved:
                    blur = blur_data_url(saved)

            manifest.append({
                "id": spec.asset_id,
                "src": f"/media/product/{spec.asset_id}.webp",
                "kind": spec.kind,
                "width": w,
                "height": h,
                "blurDataUrl": blur,
                "alt": spec.alt,
                "caption": spec.caption,
                "sourceSlide": spec.slide,
                "alsoOn": list(spec.also_on),
                "product": spec.product,
                "sourceMedia": spec.media,
                **({"redacted": True} if spec.asset_id in REDACTIONS else {}),
            })
            if i % 20 == 0:
                log(f"  … {i}/{len(ASSET_MAP)}")

        for icon_id, media in ICON_MAP.items():
            try:
                (out_icons / f"{icon_id}.svg").write_bytes(zf.read(f"ppt/media/{media}"))
            except KeyError:
                log(f"  ! icon {icon_id}: PPT 中无 {media}，跳过")

    out_manifest.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "_source": pptx.name,
        "_note": "由 backend/scripts/extract_pptx_assets.py 生成，勿手改",
        "_emfRedrawn": EMF_REDRAWN,
        "_redactionFingerprint": redaction_fingerprint(),
        "assets": manifest,
    }
    out_manifest.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")

    kinds: dict[str, int] = {}
    total = 0
    for a in manifest:
        kinds[str(a["kind"])] = kinds.get(str(a["kind"]), 0) + 1
    for f in out_images.glob("*"):
        total += f.stat().st_size
    log(f"完成：{len(manifest)} 个 asset，按类型 {kinds}，产出 {total // 1024 // 1024} MB")
    log(f"清单 → {out_manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
