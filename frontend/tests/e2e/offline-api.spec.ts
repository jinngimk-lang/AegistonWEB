import { expect, test } from '@playwright/test';

/**
 * R12：**后端挂了官网仍然可访问**。
 *
 * 两个用例守两种失效形态：
 * 1. `offline-api`：API 曾经在跑、现在被停掉 —— 走 ISR 陈旧值 + 快照兜底；
 * 2. `cold-start-without-api`：API **从未启动** —— 这是 v1.0 编排真正会踩的坑
 *    （`depends_on: service_healthy` 会让 web 根本不启动，整站白屏）。
 *    §11.2 已把 `depends_on` 降为 `service_started`，本用例守住这个决定。
 *
 * 运行方式（CI）：
 *   AEGISTON_E2E_NO_API=1 npx playwright test tests/e2e/offline-api.spec.ts
 * 前置条件是 web 在 API 不可达的情况下启动（把 API_BASE_URL 指向一个空端口）。
 */

const NO_API = process.env.AEGISTON_E2E_NO_API === '1';

test.describe('后端不可用时的降级', () => {
  test.skip(!NO_API, '需要在 API 不可达的环境下运行（AEGISTON_E2E_NO_API=1）');

  const CRITICAL_PATHS = [
    '/',
    '/products',
    '/products/aragonteam',
    '/products/inkclaw',
    '/products/legallens',
    '/products/deployment',
    '/solutions',
    '/research',
    '/about',
  ];

  for (const path of CRITICAL_PATHS) {
    test(`${path} 在 API 不可达时仍返回 200 并渲染快照内容`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status(), `${path} 应降级到快照而不是 5xx`).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('h1')).not.toBeEmpty();
      // 快照里带的是真实内容，不是占位符
      await expect(page.locator('body')).not.toContainText('Application error');
    });
  }

  test('首页的三层产品区块在降级路径下仍完整', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.solution')).toHaveCount(3);
    await expect(page.locator('.domain')).toHaveCount(4);
    await expect(page.locator('.metric')).toHaveCount(4);
  });

  test('导航与页脚在降级路径下依然无死链', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page
      .locator('a[href]')
      .evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href') ?? ''));
    expect(hrefs.filter((h) => h === '#' || h === '')).toEqual([]);
  });

  test('表单页在 API 不可达时给出邮件兜底而不是白屏', async ({ page }) => {
    const response = await page.goto('/contact');
    expect(response?.status()).toBe(200);
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
  });

  /**
   * G2：**检索在 API 不可达时仍然工作**（v3 spec §2.1）。
   *
   * 检索是全站唯一一个「用户会在页面加载后主动触发」的读操作。如果它是唯一
   * 一个「后端挂了就转圈」的功能，R12 的降级承诺就出现了破口。所以索引走
   * 构建期落盘，而不是运行期查后端 —— 这条用例守住那个决定。
   */
  test('/search?q=法律 在 API 不可达时仍返回非空结果', async ({ page }) => {
    const response = await page.goto('/search?q=%E6%B3%95%E5%BE%8B');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    const summary = page.locator('.search-summary strong');
    await expect(summary).toBeVisible();
    await expect(summary).not.toHaveText('0');
  });

  test('⌘K 面板在 API 不可达时照常出结果（索引来自 public/，不打后端）', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-search').click();
    const dialog = page.getByRole('dialog', { name: '站内检索' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('combobox').fill('合约');
    await expect(dialog.getByRole('option').first()).toBeVisible();
  });
});
