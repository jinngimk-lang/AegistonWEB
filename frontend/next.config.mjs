/**
 * Next.js 配置。
 *
 * 安全响应头与 nginx/aegiston.conf **逐字一致**（spec §11.3）；
 * `tests/e2e/security-headers.spec.ts` 对全部路由断言。
 *
 * CSP 说明（v1 的明确选择）：用 `'unsafe-inline'` 而不是 nonce。
 * CSP Level 2+ 规定一旦出现 nonce 就忽略同一指令里的 `'unsafe-inline'`，
 * 二者没有中间态；而 Next.js 的 nonce 必须由 middleware 逐请求下发，
 * 读取 nonce 的页面会被强制转为动态渲染，直接推翻 ISR + Full Route Cache。
 *
 * ⚠️ v3 修订（v3 spec §4.2.7）：v2 这段论证的第一条前提是「站内不存在任何
 * 用户输入的回显路径」。`/search?q=…` 上线后那条前提就不成立了，而留着一句
 * 已经不成立的安全论证比没有论证更危险。现在的论证是：
 *
 *   本站唯一的用户输入回显点是 `/search` 的查询串，且它**只经文本节点渲染**
 *   （`components/search/Highlight.tsx`；`react/no-danger` 在 `src/components/
 *   search/**` 与 `src/app/search/**` 下由 eslint 强制打开），**不进任何
 *   JSON-LD 与内联脚本** —— `JSON.stringify` 不转义 `<` 与 `/`，一个
 *   `</script>` 就能闭合标签，那才是真正的注入点，`<mark>` 反而不是；
 *   洞察正文经 bleach 白名单净化；无第三方脚本。
 *
 * 因此 'unsafe-inline' 的取舍前提依然成立。详见 v2 spec §11.3 与 v3 spec §4.2.7。
 */

const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob:",
  "media-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  'upgrade-insecure-requests',
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
];

if (process.env.NODE_ENV === 'production') {
  SECURITY_HEADERS.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,

  images: {
    // 所有图片都已本地化到 public/media/**，运行期不依赖任何外部 CDN
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [96, 128, 256, 384],
    minimumCacheTTL: 2592000,
    remotePatterns: [],
  },

  experimental: {
    optimizePackageImports: ['zod'],
  },

  async headers() {
    return [
      { source: '/:path*', headers: SECURITY_HEADERS },
      {
        source: '/media/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
