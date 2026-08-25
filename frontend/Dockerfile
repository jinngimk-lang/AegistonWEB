# syntax=docker/dockerfile:1
# 多阶段构建，产出 Next.js standalone。
#
# ⚠️ 构建期**完全不触网**（除 npm 依赖安装外）：字体分片已入库 public/fonts/，
# 图片已入库 public/media/，降级快照已入库 src/content/snapshot/。
# 客户在隔离网内 docker build 只需要一个私有 npm 镜像即可（spec §5.3 / §11.2.1）。

FROM node:22-alpine AS deps
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json* ./
RUN npm ci --include=dev --no-audit --no-fund


FROM node:22-alpine AS builder
WORKDIR /app
ARG API_BASE_URL=http://api:8000
ARG NEXT_PUBLIC_SITE_URL=http://localhost
ENV API_BASE_URL=$API_BASE_URL \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build


FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD node -e "require('http').get('http://127.0.0.1:3000/', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "server.js"]
