import { expect, test } from '@playwright/test';

import { laidOut } from './helpers/layout';

/**
 * G4：使用 PPT 中的**真实软件截图**（≥ 45 张入站）+ §10.2 灯箱交互。
 */

test.describe('真实产品截图', () => {
  test('三个产品页合计入站截图 ≥ 45 张', async ({ page }) => {
    let total = 0;
    for (const slug of ['aragonteam', 'inkclaw', 'legallens']) {
      await page.goto(`/products/${slug}`);
      const count = await page.locator('.screen-frame').count();
      expect(count, `${slug} 的界面导览为空`).toBeGreaterThan(0);
      total += count;
    }
    expect(total).toBeGreaterThanOrEqual(45);
  });

  test('截图带图注、来源页码与 vlabel 标签', async ({ page }) => {
    await page.goto('/products/aragonteam');
    const figure = page.locator('.screen-figure').first();
    await expect(figure.locator('figcaption')).not.toBeEmpty();
    await expect(figure.locator('.vlabel')).toBeVisible();
    await expect(page.locator('.screen-source').first()).toContainText('PPT p.');
  });

  test('alt 描述界面内容而不是「截图」', async ({ page }) => {
    await page.goto('/products/legallens');
    const alts = await page
      .locator('.screen-frame img')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('alt') ?? ''));
    expect(alts.length).toBeGreaterThan(0);
    for (const alt of alts) {
      expect(alt.length).toBeGreaterThan(12);
      expect(alt).not.toMatch(/^截图$|^产品截图$|^图片$/);
    }
  });

  test('截图容器有固定宽高比，避免 CLS', async ({ page }) => {
    await page.goto('/products/inkclaw');
    const frame = await laidOut(page.locator('.screen-frame').first(), '.screen-frame');
    const ratio = await frame.evaluate((el) => getComputedStyle(el).aspectRatio);
    expect(ratio).not.toBe('auto');
  });

  test('GIF 已转 MP4，用 video 标签播放', async ({ page }) => {
    await page.goto('/products/aragonteam');
    const video = page.locator('.screen-frame video');
    await expect(video).toHaveCount(1);
    const src = await video.getAttribute('src');
    expect(src).toMatch(/\.mp4$/);
    await expect(video).toHaveAttribute('playsinline', '');
    await expect(video).toHaveAttribute('muted', '');
  });

  test('合约智审的 EMF 架构图已用内联 SVG 重绘', async ({ page }) => {
    await page.goto('/products/legallens');
    const svg = page.locator('svg[role="img"][aria-labelledby="arch-title arch-desc"]');
    await expect(svg).toBeVisible();
    await expect(page.locator('#arch-title')).toHaveText('合约智审系统总体架构');
  });
});

test.describe('灯箱', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), '键盘交互仅桌面');

  test('点击放大、←→ 切换、Esc 关闭', async ({ page }) => {
    await page.goto('/products/aragonteam');
    await page.locator('.screen-frame').first().click();

    const dialog = page.getByRole('dialog', { name: '截图预览' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('1 / ');

    await page.keyboard.press('ArrowRight');
    await expect(dialog).toContainText('2 / ');

    await page.keyboard.press('ArrowLeft');
    await expect(dialog).toContainText('1 / ');

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('灯箱显示图注与来源页码', async ({ page }) => {
    await page.goto('/products/legallens');
    await page.locator('.screen-frame').first().click();
    const dialog = page.getByRole('dialog', { name: '截图预览' });
    await expect(dialog).toContainText('PPT p.');
    await page.keyboard.press('Escape');
  });
});
