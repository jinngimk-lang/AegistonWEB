"""应用配置。全部环境变量以 ``AEGISTON_`` 为前缀（spec §11.1）。"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

APP_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = APP_DIR.parent
REPO_ROOT = BACKEND_DIR.parent


# 开发默认盐。生产用它等于没加盐 —— 见 `_forbid_dev_salt_in_prod()`。
DEV_SALT = "aegiston-dev-salt-not-for-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="AEGISTON_",
        env_file=(REPO_ROOT / ".env", BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    env: Literal["dev", "staging", "prod"] = "dev"
    version: str = "1.0.0"
    api_prefix: str = "/api/v1"

    # --- 内容包 ---------------------------------------------------------
    content_dir: Path = APP_DIR / "content"

    # --- 数据库 ---------------------------------------------------------
    # 运行期用异步 URL；Alembic 迁移必须用同步 URL（spec §11.1 / P1-13）。
    # 两者由同一个路径推导，禁止各写各的。
    database_url: str = "sqlite+aiosqlite:///./aegiston.db"
    sync_database_url: str | None = None

    # --- 限流（spec §7.3.1 四层配额） -----------------------------------
    ratelimit_storage: str | None = None
    rate_limit_leads_ip: str = "60/hour"
    rate_limit_leads_contact_hour: int = 3
    rate_limit_leads_contact_day: int = 10
    lead_idempotency_window_seconds: int = 600

    # --- 安全 -----------------------------------------------------------
    admin_token: str = Field(default="", repr=False)
    secret_salt: str = Field(default=DEV_SALT, repr=False)
    cors_origins: str = "http://localhost:3000"

    # --- 可观测性 -------------------------------------------------------
    log_level: str = "INFO"
    log_json: bool = True
    metrics_enabled: bool = False

    @field_validator("content_dir", mode="before")
    @classmethod
    def _resolve_content_dir(cls, v: object) -> object:
        if isinstance(v, str) and v:
            p = Path(v)
            return p if p.is_absolute() else (REPO_ROOT / p)
        return v

    @model_validator(mode="after")
    def _forbid_dev_salt_in_prod(self) -> Settings:
        """生产环境用开发默认盐 → 拒绝启动。

        CLAUDE.md §8 承诺「不存明文 IP，只存 sha256(ip + SECRET_SALT)」。
        这个承诺**只在盐是秘密时成立**：IPv4 全空间才 2^32，盐一旦公开，
        把整张 `leads.ip_hash` 反查成明文 IP 只是几分钟的事，
        contact_hash（手机号）同理。

        `docker-compose.prod.yml` 已用 `${VAR:?set in .env}` 卡住了 compose 这条路径，
        但裸跑 gunicorn / k8s / systemd 时没有任何东西拦着。按本项目一贯的
        「坏配置就别上线」口径（§7 内容包校验失败即拒绝启动），在这里也硬拦一次。
        """
        if self.env == "prod" and self.secret_salt == DEV_SALT:
            raise ValueError(
                "AEGISTON_SECRET_SALT 仍是开发默认值，生产环境拒绝启动："
                "该盐用于 ip_hash / contact_hash，公开的盐等于不脱敏。"
                "请设置一个足够长的随机值（见 .env.example）。"
            )
        return self

    @model_validator(mode="after")
    def _derive_sync_url(self) -> Settings:
        if not self.sync_database_url:
            # sqlite+aiosqlite:///x -> sqlite:///x
            object.__setattr__(
                self, "sync_database_url", self.database_url.replace("+aiosqlite", "")
            )
        if not self.ratelimit_storage:
            # limits 使用同步 SQLAlchemy URL；与 leads 同库，保证多 worker 共享计数
            object.__setattr__(self, "ratelimit_storage", self.sync_database_url)
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_prod(self) -> bool:
        return self.env == "prod"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
