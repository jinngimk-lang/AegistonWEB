"""内容包校验 CLI（CI 门禁；退出码非 0 即失败）。

    python -m backend.scripts.validate_content --content-dir backend/app/content --strict

做**清单级**校验：schema 反序列化 + 引用完整性 + 死链检查 + 合规约束。
不碰磁盘上的图片文件 —— 那是 `validate_assets.py` 的职责（spec §12.1 / P1-6）。

`--strict` 额外输出 `pendingConfirmation` 告警清单（spec C3）：这些条目不阻断
构建，但必须让人看见，避免「待确认」在交付时被静默带上线。
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.services.content import ContentError, ContentRepository


def log(msg: str) -> None:
    print(f"[validate-content] {msg}", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser(description="校验内容包")
    ap.add_argument("--content-dir", default="backend/app/content")
    ap.add_argument("--strict", action="store_true", help="输出待确认清单与额外检查")
    args = ap.parse_args()

    content_dir = Path(args.content_dir)
    if not content_dir.is_absolute():
        content_dir = Path.cwd() / content_dir

    try:
        repo = ContentRepository(content_dir).load()
    except ContentError as exc:
        log("FAIL 内容包校验未通过：")
        for line in str(exc).splitlines():
            log(f"  {line}")
        return 1

    log(f"OK  contentHash={repo.content_hash}")
    log(f"OK  媒体 {len(repo.media)} 个（真实软件截图 {repo.screenshot_count()} 张）"
        f" + 外部配图 {len(repo.stock)} 张")
    log(f"OK  产品 {len(repo.products)} · 行业 {len(repo.solutions)} · "
        f"技术模块 {len(repo.research.pillars)} · 论文 {len(repo.papers.papers)} · "
        f"洞察 {len(repo.insights)}")

    problems: list[str] = []

    # G4：真实软件截图 ≥ 45 张（口径收紧为 kind == "screenshot"，spec P2-7）
    if repo.screenshot_count() < 45:
        problems.append(f"真实软件截图仅 {repo.screenshot_count()} 张，未达 G4 的 ≥ 45 张")

    # spec §3.2 合规约束：首页 metrics 的归属说明必填
    for metric in repo.home.metrics:
        if not metric.note:
            problems.append(f"首页指标「{metric.label}」缺少归属说明（note）")

    # 每个内容块都应能溯源
    if not repo.home.source_slides:
        problems.append("home.json 缺少 sourceSlides")
    for slug, detail in repo.products.items():
        if not detail.source_slides:
            problems.append(f"products/{slug}.json 缺少 sourceSlides")
    for slug, detail in repo.solutions.items():
        if not detail.source_slides:
            problems.append(f"solutions/{slug}.json 缺少 sourceSlides")
        for metric in detail.metrics:
            if not metric.source:
                problems.append(f"solutions/{slug} 的指标「{metric.label}」缺少 source 标注")

    if problems:
        log(f"FAIL {len(problems)} 项检查未通过：")
        for item in problems:
            log(f"  - {item}")
        return 1

    if args.strict:
        pending: list[str] = list(repo.settings.pending_confirmation)
        for slug, detail in repo.solutions.items():
            pending.extend(f"solutions/{slug}: {item}" for item in detail.pending_confirmation)
        if pending:
            log(f"WARN 待客户 / 法务确认 {len(pending)} 项（不阻断，但必须在交付前关闭）：")
            for item in pending:
                log(f"  · {item}")

    log("PASS 全部检查通过")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
