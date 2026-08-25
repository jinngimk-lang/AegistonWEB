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
 * 本站没有用户输入回显、没有富文本渲染（洞察正文经 bleach 白名单净化）、
 * 没有第三方脚本，XSS 注入点接近于零。详见 spec §11.3。
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
