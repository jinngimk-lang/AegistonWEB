"""内容包完整性 —— **清单级**校验（spec §12.1 / P1-6）。

⚠️ 这里**不碰磁盘**：图片产物在 `frontend/public/media/**`，后端镜像里根本
没有这棵树。磁盘级校验（文件真实存在、宽高与记录一致）拆到
`scripts/validate_assets.py`，只在 CI 跑 —— 那里才同时看得到前后端两棵树。
"""

from pathlib import Path

import pytest

from app.services.content import ContentError, ContentRepository


@pytest.fixture(scope="module")
def repo(request) -> ContentRepository:
    content_dir = Path(__file__).resolve().parent.parent / "app" / "content"
    return ContentRepository(content_dir).load()


def test_content_loads(repo):
    assert repo.content_hash
    assert len(repo.products) == 3
    assert len(repo.solutions) == 4
    assert len(repo.insights) >= 3


def test_media_references_resolve(repo):
    known = set(repo.media) | set(repo.stock)
    for where, media_id in repo._media_refs():
        assert media_id in known, f"{where} -> {media_id}"


def test_source_coverage(repo):
    """G4：真实软件截图 ≥ 45 张（spec P2-7：口径收紧为 kind == 'screenshot'）。"""
    assert repo.screenshot_count() >= 45


def test_home_metrics_require_note(repo):
    """spec §3.2 合规约束：首页 .metrics 的归属说明必填且非空。"""
    assert len(repo.home.metrics) == 4
    for metric in repo.home.metrics:
        assert metric.note and len(metric.note) >= 2


def test_national_first_metric_has_attribution(repo):
    """「全国第 1」必须带归属说明，不得被理解为公司自身排名。"""
    target = [m for m in repo.home.metrics if "全国第" in m.value]
    assert len(target) == 1
    metric = target[0]
    assert "西安电子科技大学" in metric.note
    assert "非本公司排名" in metric.note


def test_no_dead_links_in_navigation(repo):
    for where, href in repo._internal_links():
        assert href, where
        assert not href.startswith("#"), f"{where} 出现死链 {href}"


def test_pillar_and_paper_cross_refs(repo):
    pillar_ids = {p.id for p in repo.research.pillars}
    paper_ids = {p.id for p in repo.papers.papers}
    for slug, detail in repo.products.items():
        assert set(detail.pillars) <= pillar_ids, slug
        assert set(detail.papers) <= paper_ids, slug


def test_broken_reference_is_rejected(tmp_path):
    """引用完整性失败必须让加载**直接失败**（spec R13：拒绝启动，而不是线上碎图）。"""
    import json
    import shutil

    src = Path(__file__).resolve().parent.parent / "app" / "content"
    dst = tmp_path / "content"
    shutil.copytree(src, dst)

    home = json.loads((dst / "home.json").read_text(encoding="utf-8"))
    home["hero"]["media"] = "definitely-not-an-asset"
    (dst / "home.json").write_text(json.dumps(home, ensure_ascii=False), encoding="utf-8")

    with pytest.raises(ContentError) as exc:
        ContentRepository(dst).load()
    assert "definitely-not-an-asset" in str(exc.value)


def test_future_publish_date_is_rejected(tmp_path):
    """spec R10：拒绝任何 publishedAt > 今天 的洞察。"""
    import json
    import shutil
    from datetime import date, timedelta

    src = Path(__file__).resolve().parent.parent / "app" / "content"
    dst = tmp_path / "content"
    shutil.copytree(src, dst)

    index = json.loads((dst / "insights" / "index.json").read_text(encoding="utf-8"))
    index["posts"][0]["publishedAt"] = (date.today() + timedelta(days=30)).isoformat()
    (dst / "insights" / "index.json").write_text(
        json.dumps(index, ensure_ascii=False), encoding="utf-8"
    )

    with pytest.raises(ContentError) as exc:
        ContentRepository(dst).load()
    assert "晚于今天" in str(exc.value)


def test_redacted_assets_declared_in_manifest(repo):
    """§6.4：REDACTIONS 里声明的每张图，清单里必须实际带上 ``redacted``。

    这条守的是「改了打码规格、忘了重跑脚本」——
    这种回归不会让别的测试变红，但会把敏感信息重新放上公开站。
    """
    import sys

    scripts = Path(__file__).resolve().parent.parent / "scripts"
    sys.path.insert(0, str(scripts))
    try:
        from asset_map import REDACTIONS
    finally:
        sys.path.remove(str(scripts))

    flagged = {mid for mid, asset in repo.media.items() if asset.redacted}
    assert set(REDACTIONS) <= flagged, (
        f"以下 asset 声明了打码区但清单未标记：{sorted(set(REDACTIONS) - flagged)}；"
        "请重跑 python -m backend.scripts.redact"
    )


def test_no_courtroom_photo_shipped(repo):
    """F-10：PPT p.97 的庭审现场照带第三方水印与可辨识人脸，有意不入库。"""
    assert "case-legal" not in repo.media
