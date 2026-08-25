import { expect, test } from '@playwright/test';

import { allRoutes } from '../../src/lib/routes';
import routesSnapshot from '../../src/content/snapshot/site-routes.json';

/**
 * 分享物料（v3 spec §10.3 · M4）。
 *
 * G5：**全部路由**的 `og:image` 可达且 1200×630。做成遍历而不是抽查，
 * 是因为「漏了一条路由」正是这类改动最典型的失败形态 —— 分享出去才发现是
 * 一张裂图，而没有任何测试会提前告诉你。
 */

const routes = (routesSnapshot as { routes: { path: string }[] }).routes
  .map((entry) => entry.path)
  // 动态段已经由 site-routes 快照展开，这里不需要再拼
  .filter((path) => !path.includes('['));

test('路由清单与 ROUTES 单一事实源一致（含 /search）', () => {
  expect(routes).toContain('/search');
  for (const path of allRoutes()) {
    expect(routes).toContain(path);
  }
});

test.describe('og:image', () => {
  test('全部路由都有 og:image，且 HEAD 可达、是 PNG', async ({ page, request }) => {
    const seen = new Set<string>();
    for (const path of routes) {
      await page.goto(path);
      const content = await page
        .locator('meta[property="og:image"]')
        .first()
        .getAttribute('content');
      expect(content, `${path} 缺少 og:image`).toBeTruthy();
      seen.add(String(content));
    }

    for (const url of seen) {
      const res = await request.head(url);
      expect(res.status(), `${url} 不可达`).toBe(200);
      expect(res.headers()['content-type']).toContain('image/png');
    }
  });

  test('抽查三张：宽高标注为 1200×630', async ({ page }) => {
    for (const path of ['/', '/products/legallens', '/insights']) {
      await page.goto(path);
      await expect(page.locator('meta[property="og:image:width"]').first()).toHaveAttribute(
        'content',
        '1200',
      );
      await expect(page.locator('meta[property="og:image:height"]').first()).toHaveAttribute(
        'content',
        '630',
      );
    }
  });

  test('twitter:image 与 og:image 指向同一张', async ({ page }) => {
    await page.goto('/products/inkclaw');
    const og = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    const tw = await page.locator('meta[name="twitter:image"]').first().getAttribute('content');
    expect(tw).toBe(og);
  });

  test('实际像素尺寸就是 1200×630（不是只写了标注）', async ({ page }) => {
    await page.goto('/');
    const url = await page.locator('meta[property="og:image"]').first().getAttribute('content');
    const size = await page.evaluate(
      (src) =>
        new Promise<{ w: number; h: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = () => reject(new Error('load failed'));
          img.src = src;
        }),
      String(url),
    );
    expect(size).toEqual({ w: 1200, h: 630 });
  });
});

test.describe('结构化数据与安装元数据', () => {
  test('WebSite JSON-LD 带 SearchAction，且模板占位符原样保留', async ({ page }) => {
    await page.goto('/');
    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ''));
    const parsed = blocks.flatMap((text) => {
      const value = JSON.parse(text) as unknown;
      return Array.isArray(value) ? value : [value];
    }) as Record<string, unknown>[];

    const site = parsed.find((item) => item['@type'] === 'WebSite');
    expect(site).toBeTruthy();
    const action = site?.potentialAction as Record<string, unknown> | undefined;
    expect(action?.['@type']).toBe('SearchAction');
    const target = action?.target as Record<string, unknown> | undefined;
    // {search_term_string} 是 schema.org 的模板占位符，不做插值（§4.2.7 S2）
    expect(String(target?.urlTemplate)).toContain('/search?q={search_term_string}');
  });

  test('洞察详情的 Article JSON-LD 带 image 与机构 author', async ({ page }) => {
    await page.goto('/insights/why-start-with-rd');
    const parsed = await page
      .locator('script[type="application/ld+json"]')
      .evaluateAll((nodes) =>
        nodes.flatMap((n) => {
          const value = JSON.parse(n.textContent ?? 'null') as unknown;
          return Array.isArray(value) ? value : [value];
        }),
      );
    const article = (parsed as Record<string, unknown>[]).find(
      (item) => item?.['@type'] === 'Article',
    );
    expect(article).toBeTruthy();
    expect(Array.isArray(article?.image)).toBe(true);
    const author = article?.author as Record<string, unknown> | undefined;
    // 一律用机构名，不写自然人 —— v2 §15 第 6 条尚未关闭
    expect(author?.['@type']).toBe('Organization');
  });

  test('manifest.webmanifest 可达，display 为 browser 且不注册 SW', async ({ page, request }) => {
    const res = await request.get('/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const manifest = (await res.json()) as { display: string; icons: { sizes: string }[] };
    // SW 缓存的旧 HTML 会盖住已 revalidate 的页面，与 ISR 的失效语义冲突（A-10）
    expect(manifest.display).toBe('browser');
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(
      expect.arrayContaining(['192x192', '512x512']),
    );

    await page.goto('/');
    const hasServiceWorker = await page.evaluate(
      async () =>
        'serviceWorker' in navigator
          ? (await navigator.serviceWorker.getRegistrations()).length
          : 0,
    );
    expect(hasServiceWorker).toBe(0);
  });
});
