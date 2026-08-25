import { expect, test } from '@playwright/test';

/**
 * 安全响应头（spec §11.3）。
 *
 * nginx 与 `next.config.mjs` 的两份声明必须**逐字一致**；本用例对全部路由断言。
 *
 * CSP 的 v1 选择是 `'unsafe-inline'` 而不是 nonce：CSP Level 2+ 规定一旦出现
 * nonce 就忽略同一指令里的 `'unsafe-inline'`，二者没有中间态；而 Next.js 的
 * nonce 必须由 middleware 逐请求下发，读取 nonce 的页面会被强制转为动态渲染，
 * 直接推翻 ISR + Full Route Cache。
 *
 * ⚠️ v3 修订（v3 spec §4.2.7）：v2 这段论证的第一条前提是「站内不存在任何
 * 用户输入的回显路径」。`/search?q=…` 上线后那条前提就不成立了，而留着一句
 * 已经不成立的安全论证比没有论证更危险。现在的论证是：
 *
 *   本站唯一的用户输入回显点是 `/search` 的查询串，且它**只经文本节点渲染**
 *   （`components/search/Highlight.tsx`；`react/no-danger` 在 search 目录下由
 *   eslint 强制打开），**不进任何 JSON-LD 与内联脚本** —— `JSON.stringify`
 *   不转义 `<` 与 `/`，一个 `</script>` 就能闭合标签，那才是真正的注入点；
 *   洞察正文经 bleach 白名单净化；无第三方脚本。
 *
 * 对应断言在 `tests/e2e/search.spec.ts`（`?q=<script>…` 的两种载荷）。
 */

const EXPECTED_CSP = [
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
];

const PATHS = [
  '/',
  '/about',
  '/about/positioning',
  '/about/team',
  '/about/strength',
  '/products',
  '/products/deployment',
  '/products/aragonteam',
  '/products/inkclaw',
  '/products/legallens',
  '/solutions',
  '/solutions/telecom',
  '/solutions/transportation',
  '/solutions/legal-services',
  '/solutions/finance',
  '/research',
  '/research/papers',
  '/insights',
  '/insights/why-start-with-rd',
  '/careers',
  '/contact',
  '/sitemap',
  '/legal/terms',
  '/legal/privacy',
  '/legal/credits',
  // v3 新增
  '/search',
  '/manifest.webmanifest',
  '/og/default.png',
  '/search-index.json',
];

test.describe('安全响应头', () => {
  for (const path of PATHS) {
    test(`${path} 的 CSP 与安全头完整`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.status()).toBe(200);
      const headers = res.headers();

      const csp = headers['content-security-policy'];
      expect(csp, `${path} 缺少 CSP`).toBeTruthy();
      for (const directive of EXPECTED_CSP) {
        expect(csp, `${path} 的 CSP 缺少 ${directive}`).toContain(directive);
      }

      expect(headers['x-content-type-options']).toBe('nosniff');
      expect(headers['x-frame-options']).toBe('DENY');
      expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['cross-origin-opener-policy']).toBe('same-origin');
      expect(headers['permissions-policy']).toContain('camera=()');
    });
  }

  test('CSP 里没有任何外部域白名单（私有化交付的卖点）', async ({ request }) => {
    const csp = (await request.get('/')).headers()['content-security-policy'] ?? '';
    expect(csp).not.toMatch(/https?:\/\//);
    expect(csp).not.toContain('fonts.googleapis.com');
    expect(csp).not.toContain('images.unsplash.com');
  });

  test('页面不向任何外部域发起请求', async ({ page }) => {
    const external: string[] = [];
    page.on('request', (req) => {
      const url = new URL(req.url());
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) external.push(req.url());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(external, `出现外部请求：\n${external.join('\n')}`).toEqual([]);
  });

  test('不暴露 X-Powered-By', async ({ request }) => {
    const headers = (await request.get('/')).headers();
    expect(headers['x-powered-by']).toBeUndefined();
  });

  /**
   * ⚠️ 这里断言的是**源站**行为，不是 nginx 行为。
   *
   * E2E 直连 `next start`，流水线里根本没有 nginx —— 访问 `/metrics` 拿到的是
   * Next 的 404，不是 nginx 的 403。把「没有 nginx 的环境里断言 nginx 行为」
   * 写成 E2E 是一种假门禁（v3 P1-8 / R12）。三层各归各位：
   *   后端  `backend/tests/test_metrics.py`：默认 404、开启后低基数
   *   源站  这里：Next 上没有这条路由
   *   nginx `tests/unit/nginx-config.spec.ts`：读配置文本断言 deny 规则存在
   */
  test('/metrics 在 web 源站上不是 200', async ({ request }) => {
    const res = await request.get('/metrics');
    expect(res.status()).not.toBe(200);
  });

  test('/search-index.json 不带 immutable 缓存头（否则会缓存住死链）', async ({ request }) => {
    const cacheControl = (await request.get('/search-index.json')).headers()['cache-control'] ?? '';
    expect(cacheControl).not.toContain('immutable');
  });
});
