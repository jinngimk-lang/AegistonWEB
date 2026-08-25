"""分层限流与反滥用（spec §7.3.1）。

v1.0 的 ``5/hour/IP`` 有两个会在生产上真实伤到业务的缺陷：政企客户共享 NAT 出口
（一栋楼一个配额），以及 slowapi 默认进程内计数在多 worker 下漂移。v2 设计：

===== =========================== ================== ==============================
 层    键                          配额                超限行为
===== =========================== ================== ==============================
 L1    IP 段（v4 /24、v6 /64）hash  60/hour            429 + Retry-After
 L2    sha256(手机号或邮箱 + SALT)   3/hour、10/day     429 + 「请直接致电」文案
 L3    honeypot ``website`` 非空    —                  202，不落库、不计配额
 L4    (contact, intent, product)  10 分钟内重复        幂等返回首次的 201
===== =========================== ================== ==============================

**存储策略**：L1 用进程内滑动窗口；L2 / L4 直接查 ``leads`` 表 —— 它天然被所有
worker 共享且持久，比单独维护一份计数器更不容易漂移。同时 gunicorn 在 v1 固定为
``--workers 1 --threads 4``（官网 QPS 极低），从编排层面消除计数器分裂与
SQLite 写竞争。见 spec §7.3.1 与 §11.2。
"""

from __future__ import annotations

import hashlib
import ipaddress
import threading
import time
from dataclasses import dataclass, field


def ip_bucket(ip: str) -> str:
    """把 IP 收敛到网段：IPv4 /24、IPv6 /64。政企客户常共享出口 IP。"""
    try:
        addr = ipaddress.ip_address(ip)
    except ValueError:
        return ip
    if isinstance(addr, ipaddress.IPv4Address):
        return str(ipaddress.ip_network(f"{addr}/24", strict=False))
    return str(ipaddress.ip_network(f"{addr}/64", strict=False))


def hash_key(value: str, salt: str) -> str:
    return hashlib.sha256(f"{value}{salt}".encode()).hexdigest()


def contact_key(phone: str | None, email: str | None, salt: str) -> str:
    """L2 / L4 的细粒度键：优先手机号，其次邮箱（归一化后再 hash）。"""
    raw = (phone or "").strip() or (email or "").strip().lower()
    return hash_key(raw, salt)


@dataclass
class _Window:
    hits: list[float] = field(default_factory=list)


class SlidingWindowLimiter:
    """线程安全的滑动窗口计数器（L1 用）。

    只在单进程内有效——这正是 §11.2 把 gunicorn 固定为单 worker 的原因。
    如果将来要横向扩容，把这一层换成 Redis 即可，键与配额定义不必改。
    """

    def __init__(self, limit: int, window_seconds: int) -> None:
        self.limit = limit
        self.window = window_seconds
        self._data: dict[str, _Window] = {}
        self._lock = threading.Lock()

    def check(self, key: str, *, now: float | None = None) -> tuple[bool, int]:
        """返回 ``(allowed, retry_after_seconds)``。allowed 时 retry_after 为 0。"""
        now = time.time() if now is None else now
        cutoff = now - self.window
        with self._lock:
            win = self._data.setdefault(key, _Window())
            win.hits = [t for t in win.hits if t > cutoff]
            if len(win.hits) >= self.limit:
                retry = int(win.hits[0] + self.window - now) + 1
                return False, max(retry, 1)
            win.hits.append(now)
            return True, 0

    def reset(self) -> None:
        with self._lock:
            self._data.clear()


def parse_rate(spec: str) -> tuple[int, int]:
    """``"60/hour"`` -> ``(60, 3600)``。"""
    amount, _, period = spec.partition("/")
    seconds = {"second": 1, "minute": 60, "hour": 3600, "day": 86400}.get(period.strip(), 3600)
    return int(amount.strip()), seconds


