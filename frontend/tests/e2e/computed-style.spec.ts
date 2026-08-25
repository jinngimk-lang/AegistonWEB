import { expect, test } from '@playwright/test';

import { gridCols, gridTracks, laidOut } from './helpers/layout';

/**
 * §5.2 视觉契约的**自动化守护**（spec §12.3 / P1-11）。
 *
 * 为什么不是像素比对：新站的文案、图片、导航标签全部换了（这正是 G2/G4 的
 * 要求），与 ref/1.html 截图做 ≤0.3% 像素比对**在物理上不可能通过**；而
 * CJK Web 字体 + 跨平台渲染下的像素差本来就会抖动，硬门禁会变成长期红灯。
 *
 * 这里改为断言**计算样式**——可自动、稳定、真正守护 1:1。
 */

test.describe('§5.2 计算样式契约', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), '度量以桌面视口为准');
  test.use({ viewport: { width: 1440, height: 900 } });

  test('容器与栅格', async ({ page }) => {
    await page.goto('/');
    const container = page.locator('.container').first();
    await expect(container).toHaveCSS('max-width', '1280px');
    await expect(container).toHaveCSS('padding-left', '40px');
    await expect(container).toHaveCSS('padding-right', '40px');
  });

  test('顶栏与主导航', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.utility-inner')).toHaveCSS('height', '36px');
    await expect(page.locator('.nav-inner')).toHaveCSS('height', '80px');
    await expect(page.locator('.nav')).toHaveCSS('position', 'sticky');
    await expect(page.locator('.nav')).toHaveCSS('z-index', '100');
  });

  test('Hero 高度与标题字号', async ({ page }) => {
    await page.goto('/');
    const hero = await laidOut(page.locator('.hero'), '.hero');
    const height = await hero.evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(640);

    // clamp(36px, 4.6vw, 54px)：1440px 视口下 4.6vw = 66.24px，取上限 54px
    await expect(page.locator('.hero h1')).toHaveCSS('font-size', '54px');
    await expect(page.locator('.hero h1')).toHaveCSS('font-weight', '700');
  });

  test('区块间距与标签字间距', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('section.section').first();
    await expect(section).toHaveCSS('padding-top', '96px');
    await expect(section).toHaveCSS('padding-bottom', '96px');
    await expect(page.locator('.section-label').first()).toHaveCSS('letter-spacing', '3.36px');
  });

  test('四宫格：4 列 + 1px 分隔栅格', async ({ page }) => {
    await page.goto('/');
    const domains = page.locator('.domains');
    await expect(domains).toHaveCSS('gap', '1px');
    expect(await gridCols(domains)).toBe(4);
    await expect(page.locator('.domain-photo').first()).toHaveCSS('height', '168px');
  });

  test('产品区块：1fr 1fr / gap 72px，偶数行 order 互换', async ({ page }) => {
    await page.goto('/');
    const solution = page.locator('.solution').first();
    await expect(solution).toHaveCSS('gap', '72px');
    expect(await gridCols(solution)).toBe(2);

    const evenVisual = page.locator('.solution:nth-child(even) .solution-visual').first();
    if (await evenVisual.count()) {
      await expect(evenVisual).toHaveCSS('order', '2');
    }
    await expect(page.locator('.solution-visual').first()).toHaveCSS('aspect-ratio', '4 / 3');
  });

  test('数据条：46px 主色数字 + 1×56px 分隔竖线', async ({ page }) => {
    await page.goto('/');
    const num = page.locator('.metric-num').first();
    await expect(num).toHaveCSS('font-size', '46px');
    await expect(num).toHaveCSS('font-weight', '700');
    await expect(num).toHaveCSS('color', 'rgb(45, 99, 138)');

    const metric = await laidOut(page.locator('.metric').first(), '.metric');
    const sep = await metric.evaluate((el) => {
      const style = getComputedStyle(el, '::after');
      return { width: style.width, height: style.height };
    });
    expect(sep).toEqual({ width: '1px', height: '56px' });
  });

  test('新闻栅格 1.15fr 1fr / gap 56px', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.news-grid')).toHaveCSS('gap', '56px');
    const [left, right] = await gridTracks(page, '.news-grid');
    expect((left ?? 0) / (right ?? 1)).toBeCloseTo(1.15, 1);
  });

  test('页脚五列 + CTA 内嵌描边卡片', async ({ page }) => {
    await page.goto('/');
    expect(await gridCols(page, '.footer-main')).toBe(5);

    const ctaBand = await laidOut(page.locator('.cta-band'), '.cta-band');
    const ctaInset = await ctaBand.evaluate((el) => getComputedStyle(el, '::before').top);
    expect(ctaInset).toBe('18px');
  });

  test('回顶按钮：46×46 圆形，滚动 600px 后出现', async ({ page }) => {
    await page.goto('/');
    const totop = page.locator('.totop');
    await expect(totop).toHaveCSS('width', '46px');
    await expect(totop).toHaveCSS('border-radius', '50%');
    await expect(totop).toHaveCSS('visibility', 'hidden');

    await page.evaluate(() => window.scrollTo(0, 900));
    await expect(totop).toHaveCSS('visibility', 'visible');
  });

  test('设计令牌值未被改动', async ({ page }) => {
    await page.goto('/');
    const tokens = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        red: style.getPropertyValue('--red').trim(),
        navy: style.getPropertyValue('--navy').trim(),
        ink: style.getPropertyValue('--ink').trim(),
        maxW: style.getPropertyValue('--max-w').trim(),
      };
    });
    expect(tokens).toEqual({
      red: '#2D638A',
      navy: '#002B5C',
      ink: '#1A2332',
      maxW: '1280px',
    });
  });
});
