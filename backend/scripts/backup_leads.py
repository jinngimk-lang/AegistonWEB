"""线索库备份与校验（v3 spec §4.8.2）。跨平台单行命令：

    python -m backend.scripts.backup_leads --out backups/ --keep 14
    python -m backend.scripts.backup_leads --check backups/leads-20260825T030000Z.db

为什么用 SQLite 的 ``VACUUM INTO`` 而不是复制文件（决策 A-9）：
``VACUUM INTO`` 在一个事务里生成一份**紧凑、一致**的副本，**无需停写**；
而 ``shutil.copy`` 可能抓到写到一半的页（SQLite 的页写入不是原子的，
WAL 模式下 ``.db`` 与 ``-wal`` 还会不一致），拿回来的备份看着有文件、
真去恢复才发现打不开 —— 这是最糟的一种失败形态。

⚠️ **备份文件绝不进仓库**：它含 ``ip_hash`` / ``contact_hash``，属于
CLAUDE.md §8 的合规范围。``.gitignore`` 里有 ``backups/``。

⚠️ 删除顺序：**先校验新备份完整，再删旧的**（R13）。``--keep`` 有下限 3，
删除前把将删列表打印出来。
"""

from __future__ import annotations

import argparse
import hashlib
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.config import get_settings

#: `--keep` 的下限。低于它等于「只留一份」，一次坏备份就把历史清空了。
MIN_KEEP = 3


def log(msg: str) -> None:
    print(f"[backup-leads] {msg}", flush=True)


def db_path_from_url(url: str) -> Path:
    """``sqlite+aiosqlite:///./aegiston.db`` → ``Path('./aegiston.db')``。"""
    _, _, tail = url.partition(":///")
    if not tail:
        raise ValueError(f"不是可识别的 SQLite URL：{url}")
    return Path(tail)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def row_count(path: Path) -> int:
    conn = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    try:
        cur = conn.execute("SELECT count(*) FROM leads")
        return int(cur.fetchone()[0])
    finally:
        conn.close()


def integrity_ok(path: Path) -> bool:
    conn = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True)
    try:
        return conn.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
    finally:
        conn.close()


def backup(source: Path, out_dir: Path, keep: int) -> int:
    if not source.exists():
        log(f"FAIL 源数据库不存在：{source}")
        return 1
    out_dir.mkdir(parents=True, exist_ok=True)

    stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
    target = out_dir / f"leads-{stamp}.db"
    if target.exists():
        log(f"FAIL 目标已存在（同一秒内重复运行？）：{target}")
        return 1

    conn = sqlite3.connect(source.as_posix())
    try:
        # 路径里的单引号在 SQL 字面量中要转义；VACUUM INTO 不支持参数绑定。
        literal = target.as_posix().replace("'", "''")
        conn.execute(f"VACUUM INTO '{literal}'")
    finally:
        conn.close()

    # 先校验新备份，再谈保留策略 —— 顺序不能反（R13）
    if not integrity_ok(target):
        log(f"FAIL 新备份未通过 integrity_check，已保留供排查：{target}")
        return 1
    src_rows, dst_rows = row_count(source), row_count(target)
    if src_rows != dst_rows:
        log(f"FAIL 行数不一致：源 {src_rows} vs 备份 {dst_rows}，已保留供排查")
        return 1

    digest = sha256_file(target)
    (target.with_suffix(".db.sha256")).write_text(
        f"{digest}  {target.name}\n", encoding="utf-8"
    )
    log(f"OK  {target.name} · {target.stat().st_size} bytes · leads {dst_rows} 行")
    log(f"OK  sha256 {digest}")

    effective_keep = max(keep, MIN_KEEP)
    if effective_keep != keep:
        log(f"WARN --keep {keep} 低于下限 {MIN_KEEP}，按 {MIN_KEEP} 执行")
    snapshots = sorted(out_dir.glob("leads-*.db"), key=lambda p: p.stat().st_mtime, reverse=True)
    stale = snapshots[effective_keep:]
    if stale:
        log(f"清理 {len(stale)} 份过期备份（保留最近 {effective_keep} 份）：")
        for old in stale:
            log(f"  - {old.name}")
            old.unlink()
            old.with_suffix(".db.sha256").unlink(missing_ok=True)
    return 0


def check(path: Path, source: Path | None) -> int:
    if not path.exists():
        log(f"FAIL 备份不存在：{path}")
        return 1
    if not integrity_ok(path):
        log(f"FAIL integrity_check 未通过：{path}")
        return 1
    rows = row_count(path)
    log(f"OK  integrity_check 通过 · leads {rows} 行")

    digest_file = path.with_suffix(".db.sha256")
    if digest_file.exists():
        recorded = digest_file.read_text(encoding="utf-8").split()[0]
        actual = sha256_file(path)
        if recorded != actual:
            log(f"FAIL sha256 不一致：记录 {recorded} vs 实际 {actual}")
            return 1
        log("OK  sha256 与摘要文件一致")

    if source is not None and source.exists():
        src_rows = row_count(source)
        if src_rows != rows:
            log(f"WARN 与当前库行数不同：源 {src_rows} vs 备份 {rows}（备份之后有新线索属正常）")
    log("PASS 备份可用")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="线索库备份（VACUUM INTO）与完整性校验")
    ap.add_argument("--out", default="backups", help="备份目录（默认 backups/）")
    ap.add_argument("--keep", type=int, default=14, help=f"保留最近 N 份（下限 {MIN_KEEP}）")
    ap.add_argument("--check", metavar="FILE", help="只校验一份已有备份，不生成新备份")
    ap.add_argument("--db", help="覆盖数据库路径（默认取 AEGISTON_DATABASE_URL）")
    args = ap.parse_args(argv)

    source = Path(args.db) if args.db else db_path_from_url(get_settings().database_url)
    if args.check:
        return check(Path(args.check), source)
    return backup(source, Path(args.out), args.keep)


if __name__ == "__main__":
    raise SystemExit(main())
