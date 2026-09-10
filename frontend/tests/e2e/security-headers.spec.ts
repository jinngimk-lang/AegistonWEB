import { expect, test } from '@playwright/test';

/**
 * 安全响应头（spec §11.3）。
 *
 * nginx 与 `next.config.mjs` 的两份声明必须**逐字一致**；本用例对全部当前路由断言。
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
  '/insights',
  '/insights/why-start-with-rd',
  '/careers',
  '/contact',
  '/sitemap',
  '/legal/terms',
  '/legal/privacy',
  '/legal/credits',
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

  test('/metrics 在 web 源站上不是 200', async ({ request }) => {
    const res = await request.get('/metrics');
    expect(res.status()).not.toBe(200);
  });

  test('/search-index.json 不带 immutable 缓存头（否则会缓存住死链）', async ({ request }) => {
    const cacheControl = (await request.get('/search-index.json')).headers()['cache-control'] ?? '';
    expect(cacheControl).not.toContain('immutable');
  });
});
