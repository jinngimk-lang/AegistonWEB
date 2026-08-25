"""结构化 JSON 日志 + request-id contextvar + PII 脱敏 processor。

合规要求（spec §8.1）：手机号中间 4 位、邮箱 local part 必须在日志里打码；
IP 只以 ``sha256(ip + SECRET_SALT)`` 的形式出现，不落明文。
"""

from __future__ import annotations

import hashlib
import logging
import re
import sys
import uuid
from collections.abc import MutableMapping
from contextvars import ContextVar
from typing import Any

import structlog

request_id_var: ContextVar[str] = ContextVar("request_id", default="")

_PHONE_RE = re.compile(r"(?<!\d)(1[3-9]\d)(\d{4})(\d{4})(?!\d)")
_EMAIL_RE = re.compile(r"\b([A-Za-z0-9._%+-])([A-Za-z0-9._%+-]*)(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})\b")
_SENSITIVE_KEYS = {"phone", "email", "name", "password", "token", "admin_token", "authorization"}


def new_request_id() -> str:
    return uuid.uuid4().hex


def mask_phone(value: str) -> str:
    return _PHONE_RE.sub(lambda m: f"{m.group(1)}****{m.group(3)}", value)


def mask_email(value: str) -> str:
    return _EMAIL_RE.sub(lambda m: f"{m.group(1)}***{m.group(3)}", value)


def mask_text(value: str) -> str:
    return mask_email(mask_phone(value))


def hash_ip(ip: str, salt: str) -> str:
    return hashlib.sha256(f"{ip}{salt}".encode()).hexdigest()


def _redact(
    _logger: Any, _name: str, event_dict: MutableMapping[str, Any]
) -> MutableMapping[str, Any]:
    for key, value in list(event_dict.items()):
        if isinstance(value, str):
            if key.lower() in _SENSITIVE_KEYS:
                event_dict[key] = mask_text(value) if "@" in value or value.isdigit() else "***"
            else:
                event_dict[key] = mask_text(value)
    return event_dict


def _inject_request_id(
    _logger: Any, _name: str, event_dict: MutableMapping[str, Any]
) -> MutableMapping[str, Any]:
    rid = request_id_var.get()
    if rid:
        event_dict.setdefault("request_id", rid)
    return event_dict


def configure_logging(level: str = "INFO", as_json: bool = True) -> None:
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, level.upper(), logging.INFO),
    )
    renderer: Any = (
        structlog.processors.JSONRenderer(ensure_ascii=False)
        if as_json
        else structlog.dev.ConsoleRenderer(colors=False)
    )
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            _inject_request_id,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso", utc=False),
            _redact,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, level.upper(), logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str = "aegiston") -> Any:
    return structlog.get_logger(name)
