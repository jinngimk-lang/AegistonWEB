"""线索库备份（v3 spec §10.1 / §4.8.2）。"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from scripts.backup_leads import MIN_KEEP, backup, check, db_path_from_url


def _make_db(path: Path, rows: int = 3) -> None:
    conn = sqlite3.connect(path.as_posix())
    try:
        conn.execute("CREATE TABLE leads (id TEXT PRIMARY KEY, name TEXT)")
        conn.executemany(
            "INSERT INTO leads VALUES (?, ?)", [(f"ld_{i}", f"n{i}") for i in range(rows)]
        )
        conn.commit()
    finally:
        conn.close()


def test_db_path_from_url():
    assert db_path_from_url("sqlite+aiosqlite:///./aegiston.db") == Path("./aegiston.db")
    assert db_path_from_url("sqlite:////var/lib/x.db") == Path("/var/lib/x.db")


def test_backup_vacuum_into(tmp_path: Path):
    source = tmp_path / "aegiston.db"
    _make_db(source, rows=5)
    out = tmp_path / "backups"

    assert backup(source, out, keep=14) == 0

    files = sorted(out.glob("leads-*.db"))
    assert len(files) == 1
    assert files[0].with_suffix(".db.sha256").exists()
    assert check(files[0], source) == 0

    conn = sqlite3.connect(files[0].as_posix())
    try:
        assert conn.execute("SELECT count(*) FROM leads").fetchone()[0] == 5
    finally:
        conn.close()


def test_backup_missing_source(tmp_path: Path):
    assert backup(tmp_path / "nope.db", tmp_path / "backups", keep=5) == 1


def test_backup_keep_policy(tmp_path: Path):
    """生成 5 份、`--keep 3` 后剩最新的 3 份。"""
    source = tmp_path / "aegiston.db"
    _make_db(source)
    out = tmp_path / "backups"
    out.mkdir()

    # 直接铺 5 份历史文件（VACUUM INTO 的文件名精确到秒，同一秒内无法生成多份）
    stamps = [f"leads-2026082{i}T000000Z.db" for i in range(5)]
    for index, name in enumerate(stamps):
        target = out / name
        conn = sqlite3.connect(source.as_posix())
        try:
            conn.execute(f"VACUUM INTO '{target.as_posix()}'")
        finally:
            conn.close()
        target.with_suffix(".db.sha256").write_text("x  " + name, encoding="utf-8")
        import os

        os.utime(target, (1_700_000_000 + index, 1_700_000_000 + index))

    assert backup(source, out, keep=3) == 0
    remaining = sorted(p.name for p in out.glob("leads-*.db"))
    assert len(remaining) == 3
    # 最旧的两份被清掉，最新生成的那份必然在
    assert stamps[0] not in remaining
    assert stamps[1] not in remaining
    # 摘要文件跟着一起清
    assert not (out / stamps[0]).with_suffix(".db.sha256").exists()


def test_backup_keep_has_lower_bound(tmp_path: Path):
    """`--keep 1` 会被抬到下限，一次坏备份不能把历史清空（R13）。"""
    source = tmp_path / "aegiston.db"
    _make_db(source)
    out = tmp_path / "backups"
    out.mkdir()
    for i in range(4):
        target = out / f"leads-2026082{i}T000000Z.db"
        conn = sqlite3.connect(source.as_posix())
        try:
            conn.execute(f"VACUUM INTO '{target.as_posix()}'")
        finally:
            conn.close()

    assert backup(source, out, keep=1) == 0
    assert len(list(out.glob("leads-*.db"))) == MIN_KEEP


def test_check_rejects_corrupted_backup(tmp_path: Path):
    source = tmp_path / "aegiston.db"
    _make_db(source)
    out = tmp_path / "backups"
    assert backup(source, out, keep=5) == 0
    target = next(out.glob("leads-*.db"))

    # 改一个字节 → sha256 对不上（integrity_check 未必抓得到小改动，
    # 摘要文件才是这一层的守卫）
    data = bytearray(target.read_bytes())
    data[-1] ^= 0xFF
    target.write_bytes(bytes(data))
    assert check(target, source) == 1


def test_check_missing_file(tmp_path: Path):
    assert check(tmp_path / "nope.db", None) == 1
