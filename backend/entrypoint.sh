#!/bin/sh
# 容器入口：先跑迁移，再起服务。
#
# ⚠️ Alembic 用**同步** URL（AEGISTON_SYNC_DATABASE_URL），运行期 App 用异步 URL
# （AEGISTON_DATABASE_URL）。两者由 Settings 从同一路径推导，禁止各写各的
# —— 否则容器首次启动执行迁移即失败（spec §11.1 / P1-13）。
set -eu

echo "[entrypoint] alembic upgrade head"
alembic upgrade head

# gunicorn 在 v1 固定为单 worker：官网 QPS 极低，单 worker 完全够用，
# 同时天然消除限流计数器分裂与 SQLite 写竞争（spec §7.3.1 / §11.2）。
WORKERS="${AEGISTON_WORKERS:-1}"
THREADS="${AEGISTON_THREADS:-4}"

echo "[entrypoint] starting gunicorn (workers=${WORKERS}, threads=${THREADS})"
exec gunicorn app.main:app \
  --worker-class uvicorn.workers.UvicornWorker \
  --workers "${WORKERS}" \
  --threads "${THREADS}" \
  --bind 0.0.0.0:8000 \
  --timeout 60 \
  --graceful-timeout 20 \
  --access-logfile - \
  --error-logfile -
