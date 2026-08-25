# syntax=docker/dockerfile:1
# 多阶段构建。国内镜像源与既有 /opt/aegiston 部署约定一致（spec §11.2.1）。

FROM python:3.11-slim AS builder

ENV PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /build
COPY pyproject.toml ./
COPY app ./app

RUN python -m pip install --upgrade pip \
    && python -m pip install --prefix=/install .


FROM python:3.11-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app

# 非 root 运行
RUN groupadd --system aegiston \
    && useradd --system --gid aegiston --home-dir /app --shell /usr/sbin/nologin aegiston \
    && mkdir -p /data \
    && chown -R aegiston:aegiston /data

WORKDIR /app

COPY --from=builder /install /usr/local
COPY app ./app
COPY alembic.ini ./alembic.ini
COPY alembic ./alembic
COPY entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh && chown -R aegiston:aegiston /app

USER aegiston
EXPOSE 8000

# healthcheck 的作用是**给运维看**（docker compose ps 的 unhealthy 标记 + 告警），
# 而不是卡住依赖链 —— web 的 depends_on 用 service_started（spec §11.2 / P1-5）。
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/ready', timeout=4).status == 200 else 1)"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
