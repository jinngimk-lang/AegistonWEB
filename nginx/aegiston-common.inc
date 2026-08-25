# 80 / 443 共用的 location 与响应头。由 aegiston.conf 两个 server 块 include。
#
# ⚠️ nginx 的 `add_header` **不继承**：一个 location 只要自己写了任何一条
# add_header，父层级的全部 add_header 就被丢弃。所以下面每个自带 Cache-Control
# 的 location 都**重新声明了对该响应真正生效的那几条**——
# `Content-Security-Policy`、`X-Content-Type-Options`，需要跨源取用的再加
# `Cross-Origin-Resource-Policy`。只写 Cache-Control 会把该 location 的 CSP
# 一起丢掉，而这种事只有上线后才会被发现（v3 spec P2-9）。
# 顶层那几条 `X-Frame-Options` / `Referrer-Policy` / `Permissions-Policy` /
# `Cross-Origin-Opener-Policy` 只对**文档响应**有意义，这里的 location 提供的
# 是 JSON 与 PNG 子资源，不逐条复述 —— 复述一堆无效头会让「这一层到底守住了
# 什么」变得更难读，而不是更安全。站点文档走 `location /`，继承顶层全套。
# `tests/unit/nginx-config.spec.ts` 读本文件的文本逐条断言。

client_max_body_size 2m;
server_tokens off;

gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_comp_level 5;
gzip_proxied any;
gzip_types
    text/plain text/css text/xml text/javascript
    application/javascript application/json application/xml
    application/rss+xml image/svg+xml font/woff2;

# brotli 需要 ngx_brotli 模块；官方 nginx:alpine 镜像未内置，故默认注释。
# brotli on;
# brotli_comp_level 5;
# brotli_types text/plain text/css application/javascript application/json image/svg+xml;

# --- 安全响应头（与 next.config.mjs 逐字一致） ---
add_header Content-Security-Policy   $aegiston_csp always;
add_header X-Content-Type-Options    "nosniff" always;
add_header X-Frame-Options           "DENY" always;
add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
add_header Permissions-Policy        "camera=(), microphone=(), geolocation=(), interest-cohort=()" always;
add_header Cross-Origin-Opener-Policy   "same-origin" always;
add_header Cross-Origin-Resource-Policy "same-origin" always;

# --- Next.js 构建产物：文件名带内容 hash，可以 immutable 一年 ---
location /_next/static/ {
    proxy_pass http://aegiston_web;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header Content-Security-Policy $aegiston_csp always;
    add_header X-Content-Type-Options "nosniff" always;
}

# --- 图片 / 字体 / 品牌资源 ---
location ~* ^/(media|fonts|brand)/ {
    proxy_pass http://aegiston_web;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    add_header Cache-Control "public, max-age=2592000, immutable" always;
    add_header Content-Security-Policy $aegiston_csp always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
}

# --- 限流被拒时的兜底页（v3 spec §4.2.6 / CLAUDE.md §8） ---
# ⚠️ nginx 的 limit_req 默认返回 **503**，而 CLAUDE.md §8 要求 429 必须给出
# 兜底联系路径 —— 一个裸的 nginx 503 错误页把用户送进了死路。
# 形状与 app/core/errors.py 的 429 响应体保持一致（RFC 7807 风格）。
#
# ⚠️ **只给邮箱，不给电话，也不留空的 phone 字段**：内容包 `site.json` 的
# `contact.phone` 是 null（v2 §15 的待确认项之一，公司未公开商务电话）。
# 写一个 `"phone":""` 能让门禁变绿，但用户拿到的仍是一条死路 —— 那是假门禁；
# 编一个号码则违反 CLAUDE.md §4「内容不臆造」。这里与 v2 的 LeadForm.tsx
# 取同一口径：邮箱恒给，电话**有才给**。等 phone 确认后，这里与 LeadForm
# 一起补上（`tests/unit/nginx-config.spec.ts` 断言不得出现空的联系方式字段）。
location = /429.json {
    internal;
    default_type application/json;
    add_header Content-Security-Policy $aegiston_csp always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Cache-Control "no-store" always;
    return 429 '{"type":"/errors/rate-limited","title":"Too Many Requests","status":429,"detail":"请求过于频繁。如需立即联系，请发送邮件至 bd@aegiston.com。","email":"bd@aegiston.com"}';
}

# --- 指标端点：公网一律拒绝（v3 spec §4.8.1 / R12） ---
# 内网 Prometheus 直连 api 容器 :8000/metrics 抓取，不经过 nginx。
# 后端默认也是关闭的（AEGISTON_METRICS_ENABLED=false），两道闸各守一层。
location = /metrics {
    deny all;
    access_log off;
    return 403;
}

# --- 检索索引：**绝不能**并进下面那条 immutable 规则（v3 spec §4.2.2 / P0-4） ---
# 浏览器请求它时带着 `?v=<contentHash>` 版本位，配 force-cache 才安全；
# 再叠一层 immutable 会让没带版本位的旧请求长期命中陈旧索引，
# 结果里就可能出现指向已下线页面的死链 —— CLAUDE.md §6 的零容忍项。
location = /search-index.json {
    proxy_pass http://aegiston_web;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    add_header Cache-Control "public, max-age=0, must-revalidate" always;
    add_header Content-Security-Policy $aegiston_csp always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;
}

# --- OG 分享图：文件名随映射表固定，用中等时长缓存而不是 immutable ---
location /og/ {
    proxy_pass http://aegiston_web;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    add_header Cache-Control "public, max-age=604800" always;
    add_header Content-Security-Policy $aegiston_csp always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Cross-Origin-Resource-Policy "cross-origin" always;
}

# --- API ---
location /api/ {
    # ⚠️ 被这条拒掉的请求**根本不会到达 FastAPI**，所以 429 激增要看本机的
    # access_log（$status = 429）与 error_log 的 `limiting requests` 行，
    # 在 aegiston_http_requests_total 里是找不到的（v3 R11，已写进 runbook）。
    limit_req zone=api burst=20 nodelay;
    limit_req_status 429;
    error_page 429 /429.json;

    proxy_pass http://aegiston_api;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    # L1 限流按 X-Forwarded-For 首段取真实客户端 IP（见 app/core/security.py）
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id      $request_id;
    proxy_set_header Connection        "";
    proxy_read_timeout 30s;
    proxy_connect_timeout 5s;
}

# --- 站点其余部分 ---
location / {
    proxy_pass http://aegiston_web;
    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Request-Id      $request_id;
    proxy_set_header Upgrade           $http_upgrade;
    proxy_set_header Connection        $connection_upgrade;
    proxy_read_timeout 30s;
    proxy_connect_timeout 5s;
}
