import { expect, test } from '@playwright/test';

/**
 * 路由完整性（G3 / DoD #1）。
 *
 * 路由清单从 `/api/v1/site/routes` 取 —— 与 `ROUTES` 常量、导航数据、
 * `sitemap.ts` 同源（spec §14 硬约束 2）。这样「删路由」只需要删一处，
 * 而不会出现「代码删了、测试还在断言」的漂移。
 */

test('全部路由可达且返回 200', async ({ request, page }) => {
  const res = await request.get('/api/v1/site/routes').catch(() => null);
  const paths = res?.ok()
    ? ((await res.json()).routes as { path: string }[]).map((r) => r.path)
    : [
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
        '/careers',
        '/contact',
        '/sitemap',
        '/legal/terms',
        '/legal/privacy',
        '/legal/credits',
      ];

  expect(paths.length).toBeGreaterThanOrEqual(24);

  for (const path of paths) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} 应返回 200`).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
  }
});

test('未知路径返回 404 页而不是白屏', async ({ page }) => {
  const response = await page.goto('/definitely-not-a-page');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: '这个页面不存在' })).toBeVisible();
  await expect(page.getByRole('link', { name: /返回首页/ })).toBeVisible();
});

test('站内不存在 href="#" 死链', async ({ page }) => {
  for (const path of ['/', '/products', '/products/aragonteam', '/solutions', '/insights']) {
    await page.goto(path);
    const hrefs = await page.locator('a[href]').evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('href') ?? ''),
    );
    const dead = hrefs.filter((h) => h === '#' || h === '');
    expect(dead, `${path} 出现死链`).toEqual([]);
  }
});

test('sitemap.xml 与 robots.txt 可用', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain('<urlset');
  expect(xml).toContain('/products/aragonteam');

  const robots = await request.get('/robots.txt');
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain('Sitemap:');
});
