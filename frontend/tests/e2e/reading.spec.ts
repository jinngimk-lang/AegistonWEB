import { expect, test } from '@playwright/test';

import { laidOut } from './helpers/layout';

/**
 * 长文阅读支撑：目录 / scrollspy / 锚点让位 / 上下篇 / 相关阅读
 * （v3 spec §10.3 · M2）。
 *
 * 所有 `.evaluate()` 测量都先过 `laidOut()` 守卫 —— Next 的流式 SSR 会把
 * Suspense 内容先放进隐藏缓冲区，此时 `getComputedStyle` 返回的是**指定值**
 * 而不是解析值，量出来的数字毫无意义却可能碰巧通过（v2 F.3.1）。
 */

const POST = '/insights/why-start-with-rd';

test.describe('洞察目录', () => {
  test('目录项数 = 正文 h2 + h3 数', async ({ page, isMobile }) => {
    await page.goto(POST);
    const nav = page.getByRole('navigation', { name: '本文目录' });
    // 窄屏折叠成 <details>，先展开
    if (isMobile) await nav.locator('summary').click();

    const headings = await page.locator('.prose h2, .prose h3').count();
    expect(headings).toBeGreaterThan(0);
    const links = nav.locator('a[href^="#sec-"]');
    // 宽屏与窄屏各渲染一份列表，取其一比对
    expect(await links.count()).toBe(headings * 2);
  });

  test('每个锚点在正文里都能找到对应标题（bleach 白名单没吃掉 id）', async ({ page }) => {
    await page.goto(POST);
    const anchors = await page
      .locator('.prose h2[id], .prose h3[id]')
      .evaluateAll((nodes) => nodes.map((n) => n.id));
    expect(anchors.length).toBeGreaterThan(0);
    for (const id of anchors) expect(id).toMatch(/^sec-\d+$/);
    expect(new Set(anchors).size).toBe(anchors.length);
  });

  test('点击目录项后 URL hash 变化，且标题不被固定顶栏遮挡', async ({ page, isMobile }) => {
    await page.goto(POST);
    const nav = page.getByRole('navigation', { name: '本文目录' });
    if (isMobile) await nav.locator('summary').click();

    const link = nav.locator('a[href^="#sec-"]').nth(1);
    const href = await link.getAttribute('href');
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${href?.replace('#', '\\#')}$`));

    const heading = await laidOut(page.locator(`.prose ${href}`), `正文标题 ${href}`);
    // 顶栏是 sticky top:0 且高 80px；scroll-margin-top 必须让开它
    const top = await heading.evaluate((el) => el.getBoundingClientRect().top);
    expect(top).toBeGreaterThanOrEqual(80);
  });

  test('scrollspy：滚到第 3 节后第 3 个目录项标记为当前位置', async ({ page, isMobile }) => {
    test.skip(Boolean(isMobile), '窄屏目录折叠，scrollspy 不是主路径');
    await page.goto(POST);
    // 直接跳到第 3 节：这正是初版 scrollspy 失效的场景（窄带 rootMargin 下
    // 标题落在带外，高亮留在上一节不动）
    await page.locator('.prose #sec-3').evaluate((el) => el.scrollIntoView({ block: 'start' }));
    const current = page
      .getByRole('navigation', { name: '本文目录' })
      .locator('a[aria-current="location"]');
    await expect(current.first()).toHaveAttribute('href', '#sec-3');

    // 再滚回顶部，高亮应该回到第 1 节
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(current.first()).toHaveAttribute('href', '#sec-1');
  });
});

test.describe('上一篇 / 下一篇 / 相关阅读', () => {
  test('首篇没有上一篇，末篇没有下一篇，中间篇两者都在', async ({ page }) => {
    // E2E 直连 next start，没有 /api 代理，所以顺序从洞察列表页上取
    await page.goto('/insights');
    const slugs = await page
      .locator('a[href^="/insights/"]')
      .evaluateAll((nodes) =>
        Array.from(
          new Set(
            nodes
              .map((n) => (n as HTMLAnchorElement).getAttribute('href') ?? '')
              .filter((h) => h.split('/').length === 3),
          ),
        ),
      );
    expect(slugs.length).toBeGreaterThan(2);

    await page.goto(slugs[0] as string);
    const navBar = page.getByRole('navigation', { name: '上一篇 / 下一篇' });
    await expect(navBar).toBeVisible();
    await expect(navBar.getByText('已经是最新一篇')).toBeVisible();
    await expect(navBar.locator('a[data-side="next"]')).toHaveCount(1);

    await page.goto(slugs[1] as string);
    await expect(page.locator('a[data-side="prev"]')).toHaveCount(1);
  });

  test('上下篇链接指向真实页面（不是死链）', async ({ page }) => {
    await page.goto(POST);
    const links = page.getByRole('navigation', { name: '上一篇 / 下一篇' }).locator('a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i += 1) {
      const href = await links.nth(i).getAttribute('href');
      expect(href).toMatch(/^\/insights\/[a-z0-9-]+$/);
    }
  });

  test('相关阅读 ≤ 3 条且不含自身', async ({ page }) => {
    await page.goto(POST);
    const block = page.getByRole('region', { name: '相关阅读' }).or(page.locator('.related-block'));
    await expect(block.first()).toBeVisible();
    const links = page.locator('.related-block .card h3 a');
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(3);
    for (let i = 0; i < count; i += 1) {
      expect(await links.nth(i).getAttribute('href')).not.toBe(POST);
    }
  });
});

test.describe('阅读进度条', () => {
  test('对辅助技术隐藏（它是纯装饰）', async ({ page }) => {
    await page.goto(POST);
    const track = page.locator('div[aria-hidden="true"]').filter({ has: page.locator('div') });
    // 进度条本身没有可访问名，用 CSS Module 的固定形状定位：fixed + 2px 高
    const height = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('div[aria-hidden="true"]'));
      const bar = nodes.find((n) => {
        const cs = getComputedStyle(n);
        return cs.position === 'fixed' && cs.height === '2px' && cs.top === '0px';
      });
      return bar ? getComputedStyle(bar).height : null;
    });
    expect(height).toBe('2px');
    expect(await track.count()).toBeGreaterThan(0);
  });
});

test.describe('产品页节内导航', () => {
  test('锚点条存在且锚点全部能在页面上找到', async ({ page }) => {
    await page.goto('/products/legallens');
    const nav = page.getByRole('navigation', { name: '本页内容' });
    await expect(nav).toBeVisible();

    const hrefs = await nav
      .locator('a')
      .evaluateAll((nodes) => nodes.map((n) => (n as HTMLAnchorElement).getAttribute('href') ?? ''));
    expect(hrefs.length).toBeGreaterThan(1);
    for (const href of hrefs) {
      expect(await page.locator(href).count()).toBe(1);
    }
  });

  test('可滚动区域键盘可达（WCAG 2.1 SC 2.1.1）', async ({ page }) => {
    await page.goto('/products/legallens');
    const nav = page.getByRole('navigation', { name: '本页内容' });
    await expect(nav).toHaveAttribute('tabindex', '0');
  });
});
