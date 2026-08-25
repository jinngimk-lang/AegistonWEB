import { expect, test } from '@playwright/test';

import { gridCols, laidOut } from './helpers/layout';

/**
 * §5.2.1 四档断点回归。
 *
 * ⚠️ **900px 是本站点真正的主力断点**（5 条规则挂在它上面），不是 768px。
 * 用例至少覆盖 1440 / 1024 / 960 / 860 / 700 / 375 六档，
 * 才能同时穿过 1024、900、768、640 四条线。
 */

const WIDTHS = [1440, 1024, 960, 860, 700, 375];

test.describe('响应式断点', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  for (const width of WIDTHS) {
    test(`${width}px 视口不出现横向滚动`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${width}px 出现 ${overflow}px 横向滚动`).toBeLessThanOrEqual(1);
    });
  }

  test('1024px：domains 4→2 列，主导航切换为汉堡', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 });
    await page.goto('/');
    expect(await gridCols(page, '.domains')).toBe(2);
    await expect(page.locator('.nav-menu')).toBeHidden();
    await expect(page.getByRole('button', { name: '打开导航菜单' })).toBeVisible();
  });

  test('900px：solution / values / news / sustain / footer 同时塌陷', async ({ page }) => {
    await page.setViewportSize({ width: 860, height: 900 });
    await page.goto('/');
    expect(await gridCols(page, '.solution')).toBe(1);
    expect(await gridCols(page, '.values')).toBe(1);
    expect(await gridCols(page, '.news-grid')).toBe(1);
    expect(await gridCols(page, '.sustain')).toBe(1);
    expect(await gridCols(page, '.footer-main')).toBe(2);
  });

  test('900px：偶数行 order 复位为 0，图文顺序不错乱', async ({ page }) => {
    await page.setViewportSize({ width: 860, height: 900 });
    await page.goto('/');
    const evenVisual = page.locator('.solution:nth-child(even) .solution-visual').first();
    if (await evenVisual.count()) {
      await expect(evenVisual).toHaveCSS('order', '0');
    }
  });

  test('960px：domains 已 2 列，但 metrics 仍是 4 列（穿过 1024 未穿过 768）', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 960, height: 900 });
    await page.goto('/');
    expect(await gridCols(page, '.domains')).toBe(2);
    expect(await gridCols(page, '.metrics-grid')).toBe(4);
  });

  test('768px：metrics 4→2 列，分隔竖线隐藏', async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 900 });
    await page.goto('/');
    expect(await gridCols(page, '.metrics-grid')).toBe(2);
    const metric = await laidOut(page.locator('.metric').first(), '.metric');
    const display = await metric.evaluate((el) => getComputedStyle(el, '::after').display);
    expect(display).toBe('none');
  });

  test('640px：domains 2→1 列', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    expect(await gridCols(page, '.domains')).toBe(1);
  });
});
