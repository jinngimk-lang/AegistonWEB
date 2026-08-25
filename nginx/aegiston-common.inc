# 80 / 443 共用的 location 与响应头。由 aegiston.conf 两个 server 块 include。

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

# --- API ---
location /api/ {
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
