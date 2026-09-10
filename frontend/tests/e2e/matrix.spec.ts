import { expect, test } from '@playwright/test';

/**
 * 产品能力矩阵。
 *
 * 对访客保留语义化表格、能力层级和移动端可滚动性；PPT sourceSlides 只保留在
 * 内容层，不作为页面文案展示。
 */

const THIRD_PARTY = ['OpenAI', 'ChatGPT', 'Claude', 'Gemini', 'Copilot', 'DeepSeek', '文心', '通义'];

test.describe('能力矩阵', () => {
  test('是语义化表格：3 个列头 + 每行一个行头', async ({ page }) => {
    await page.goto('/products');
    const table = page.locator('.capability-matrix table');
    await expect(table).toBeVisible();

    await expect(table.locator('thead th[scope="col"]')).toHaveCount(4);
    const rows = table.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(4);
    await expect(table.locator('tbody th[scope="row"]')).toHaveCount(count);
    await expect(table.locator('caption')).toHaveCount(1);
  });

  test('不出现任何否定性图形', async ({ page }) => {
    await page.goto('/products');
    const text = (await page.locator('.capability-matrix').innerText()) ?? '';
    for (const glyph of ['✗', '×', '❌', '✘']) {
      expect(text, `矩阵里出现了否定性图形「${glyph}」`).not.toContain(glyph);
    }
    expect(text).toContain('—');
  });

  test('未覆盖的格子对屏幕阅读器读作「未覆盖」而不是「不支持」', async ({ page }) => {
    await page.goto('/products');
    const hidden = page.locator('.capability-matrix [data-level="none"] .visually-hidden');
    expect(await hidden.count()).toBeGreaterThan(0);
    await expect(hidden.first()).toHaveText('未覆盖');
  });

  test('内部 PPT 溯源元数据不作为访客页面文案展示', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('.capability-matrix .matrix-slides')).toHaveCount(0);
    await expect(page.locator('.capability-matrix')).not.toContainText(/PPT p\.\d+/);
  });

  test('只列本家三个产品，不含任何第三方主体', async ({ page }) => {
    await page.goto('/products');
    const text = await page.locator('.capability-matrix').innerText();
    for (const term of THIRD_PARTY) {
      expect(text.toLowerCase()).not.toContain(term.toLowerCase());
    }
    const headers = await page
      .locator('.capability-matrix thead th')
      .evaluateAll((nodes) => nodes.map((n) => n.textContent?.trim() ?? ''));
    expect(headers).toHaveLength(4);
  });

  test('没有「规划中」这类前瞻性表述', async ({ page }) => {
    await page.goto('/products');
    const text = await page.locator('.capability-matrix').innerText();
    for (const word of ['规划中', '即将', '敬请期待', 'Roadmap', '路线图']) {
      expect(text).not.toContain(word);
    }
  });

  test('窄屏可横向滚动且键盘可达', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/products');
    const scroll = page.getByRole('region', { name: /能力矩阵/ });
    await expect(scroll).toBeVisible();
    await expect(scroll).toHaveAttribute('tabindex', '0');

    await scroll.focus();
    const before = await scroll.evaluate((el) => el.scrollLeft);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(async () => scroll.evaluate((el) => el.scrollLeft))
      .toBeGreaterThan(before);
  });

  test('首列固定时背景不透明（滚动不叠字）', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/products');
    const bg = await page
      .locator('.capability-matrix tbody th')
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).not.toBe('rgba(0, 0, 0, 0)');
    expect(bg).not.toContain('rgba(0, 0, 0, 0)');
  });
});
