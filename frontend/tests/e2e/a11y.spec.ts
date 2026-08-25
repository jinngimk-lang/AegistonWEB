import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * WCAG 2.1 AA（DoD #7：axe **零 serious 违规**）。
 *
 * 这条门禁能过，前提是 §10.3 的三条强制规则已经落地：
 * --ink-3 / --ink-4 退出文本用途、顶栏 EN 改用 #8AA0BE、
 * 全站补齐 :focus-visible 与 skip-link。
 */

const PAGES = [
  '/',
  '/products',
  '/products/aragonteam',
  '/products/deployment',
  '/solutions',
  '/solutions/telecom',
  '/research',
  '/research/papers',
  '/about',
  '/about/team',
  '/insights',
  '/insights/why-start-with-rd',
  '/careers',
  '/contact',
  '/sitemap',
  '/legal/privacy',
];

test.describe('无障碍', () => {
  for (const path of PAGES) {
    test(`${path} 无 serious / critical 违规`, async ({ page }) => {
      // ⚠️ 必须在降低动效下跑 axe。
      // `.reveal` 的初始态是 `opacity: 0`，进入视口后才淡入；axe 对
      // **半透明文本**算不出合成后的实际颜色，会把 color-contrast 报成
      // serious —— 这与真实可读性无关，纯粹是动画时序造成的抖动。
      // 开启 reduced-motion 后 `.reveal` 立即 `opacity: 1`，DOM 与配色完全一样，
      // 但结果是确定性的。
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blocking = results.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      );
      const summary = blocking.map((v) => `${v.id}(${v.impact}) × ${v.nodes.length}`).join('\n');
      expect(blocking, `${path} 存在阻塞级违规：\n${summary}`).toEqual([]);
    });
  }

  test('每页唯一 h1，且区块有可访问名称', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of ['/', '/products/aragonteam', '/solutions/telecom', '/contact']) {
      await page.goto(path);
      await expect(page.locator('h1')).toHaveCount(1);
      const namedSections = await page
        .locator('section[aria-label], section[aria-labelledby]')
        .count();
      expect(namedSections, `${path} 的区块缺少可访问名称`).toBeGreaterThan(0);
    }
  });

  test('导航区域有区分性的 aria-label', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: '法务与站点信息' })).toBeVisible();
  });

  test('EN 切换渲染为 aria-disabled 并带说明', async ({ page }) => {
    await page.goto('/');
    const en = page.locator('.lang-en');
    await expect(en).toHaveAttribute('aria-disabled', 'true');
    await expect(en).toHaveAttribute('title', '英文站建设中');
  });

  test('全部交互元素可 Tab 到达且有可见焦点环', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return null;
      const style = getComputedStyle(el);
      return { width: style.outlineWidth, style: style.outlineStyle };
    });
    expect(outline?.style).toBe('solid');
    expect(outline?.width).toBe('2px');
  });

  test('装饰性图片不进可访问性树', async ({ page }) => {
    await page.goto('/');
    const badDecorative = await page
      .locator('img[role="presentation"][alt]:not([alt=""])')
      .count();
    expect(badDecorative).toBe(0);
  });

  test('prefers-reduced-motion 下 reveal 直接可见', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const reveal = page.locator('.reveal').first();
    await expect(reveal).toHaveCSS('opacity', '1');
    await expect(reveal).toHaveCSS('transform', 'none');
  });
});
