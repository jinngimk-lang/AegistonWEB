import { expect, test } from '@playwright/test';

/**
 * 产品能力矩阵（v3 spec §10.3 · M3）。
 *
 * 这组用例里最要紧的两条是**合规**而不是功能：
 *   - 表内不出现任何否定性图形（✗ / × / ❌）—— 同一家公司的产品分层是定位
 *     差异，不是优劣评价（决策 A-7）；
 *   - 每行的溯源页码**渲染在页面上**，不是只躺在 JSON 里（CLAUDE.md §4）。
 */

const THIRD_PARTY = ['OpenAI', 'ChatGPT', 'Claude', 'Gemini', 'Copilot', 'DeepSeek', '文心', '通义'];

test.describe('能力矩阵', () => {
  test('是语义化表格：3 个列头 + 每行一个行头', async ({ page }) => {
    await page.goto('/products');
    const table = page.locator('.capability-matrix table');
    await expect(table).toBeVisible();

    // 屏幕阅读器的表格导航（按行列朗读）是这个组件唯一的价值所在，
    // 所以必须是真表格而不是 div 网格
    await expect(table.locator('thead th[scope="col"]')).toHaveCount(4); // 能力 + 三个产品
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
    // 未覆盖用「—」表示
    expect(text).toContain('—');
  });

  test('未覆盖的格子对屏幕阅读器读作「未覆盖」而不是「不支持」', async ({ page }) => {
    await page.goto('/products');
    const hidden = page.locator('.capability-matrix [data-level="none"] .visually-hidden');
    expect(await hidden.count()).toBeGreaterThan(0);
    await expect(hidden.first()).toHaveText('未覆盖');
  });

  test('每行的溯源页码渲染在页面上', async ({ page }) => {
    await page.goto('/products');
    const slides = page.locator('.capability-matrix .matrix-slides');
    const rows = await page.locator('.capability-matrix tbody tr').count();
    await expect(slides).toHaveCount(rows);
    for (let i = 0; i < rows; i += 1) {
      await expect(slides.nth(i)).toHaveText(/PPT p\.\d+/);
    }
    await expect(page.locator('.matrix-hint')).toBeVisible();
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
