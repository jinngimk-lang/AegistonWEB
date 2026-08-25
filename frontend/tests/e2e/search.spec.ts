import { expect, test, type Page } from '@playwright/test';

/**
 * 站内检索与 ⌘K 命令面板（v3 spec §10.3）。
 *
 * ⚠️ 面板本体是 `next/dynamic({ ssr: false })`，在 SSR HTML 里**不存在**。
 * 所有断言都必须**先触发交互再断言可见**（R4）；Playwright 自带的重试
 * 覆盖 chunk 到达的延迟。
 */

const DIALOG = { name: '站内检索' } as const;

async function openPanel(page: Page) {
  await page.locator('.nav-search').click();
  const dialog = page.getByRole('dialog', DIALOG);
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('⌘K 命令面板', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), '移动端入口在抽屉里，另有用例');

  test('快捷键唤起面板并聚焦输入框', async ({ page }) => {
    await page.goto('/');
    // 顶栏按钮先点一次，确保 SearchTrigger 已经水合（快捷键监听挂在它上面）
    await openPanel(page);
    await page.keyboard.press('Escape');

    await page.keyboard.press('ControlOrMeta+KeyK');
    const dialog = page.getByRole('dialog', DIALOG);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('combobox')).toBeFocused();
  });

  test('`/` 键：焦点在 body 时打开，焦点在输入框时不打开', async ({ page }) => {
    await page.goto('/');
    await openPanel(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', DIALOG)).toBeHidden();

    // 把焦点从触发按钮上移走：`/` 只在焦点不在输入类元素上时才生效，
    // 但焦点若还留在按钮上，`page.keyboard` 也会先打到按钮上。
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('/');
    await expect(page.getByRole('dialog', DIALOG)).toBeVisible();

    // 面板内的输入框获得焦点后，再按 `/` 应该只是输入一个字符
    const input = page.getByRole('combobox');
    await input.press('/');
    await expect(input).toHaveValue('/');
  });

  test('键盘遍历：↓↓↑ 后 aria-activedescendant 指向第 2 项，Enter 直达', async ({ page }) => {
    await page.goto('/');
    const dialog = await openPanel(page);
    const input = dialog.getByRole('combobox');
    await input.fill('合约');

    const options = dialog.getByRole('option');
    await expect(options.first()).toBeVisible();

    await input.press('ArrowDown');
    await input.press('ArrowDown');
    await input.press('ArrowUp');
    const active = await input.getAttribute('aria-activedescendant');
    expect(active).toBeTruthy();
    const secondId = await options.nth(1).getAttribute('id');
    expect(active).toBe(secondId);

    // ⚠️ dialog 变体的选项**不是链接**（`role="option"` 里不能再嵌可聚焦元素，
    // 否则 axe 的 nested-interactive 会报 serious）。路径从 `.sr-path` 那行取。
    const href = (await options.nth(1).locator('span').last().textContent())?.trim();
    expect(href).toMatch(/^\//);
    await input.press('Enter');
    await page.waitForURL(`**${href}`);
  });

  test('Home / End 跳到首末项', async ({ page }) => {
    await page.goto('/');
    const dialog = await openPanel(page);
    const input = dialog.getByRole('combobox');
    await input.fill('智能');
    const options = dialog.getByRole('option');
    await expect(options.first()).toBeVisible();

    await input.press('End');
    const last = await options.last().getAttribute('id');
    await expect(input).toHaveAttribute('aria-activedescendant', String(last));

    await input.press('Home');
    const first = await options.first().getAttribute('id');
    await expect(input).toHaveAttribute('aria-activedescendant', String(first));
  });

  test('Esc 关闭并把焦点还给触发按钮', async ({ page }) => {
    await page.goto('/');
    await openPanel(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', DIALOG)).toBeHidden();
    // 原生 <dialog> 的 close() 会把焦点还给调用 showModal() 前的活动元素
    await expect(page.locator('.nav-search')).toBeFocused();
  });

  test('中文输入法：组合期间不刷新结果', async ({ page }) => {
    await page.goto('/');
    const dialog = await openPanel(page);
    const input = dialog.getByRole('combobox');
    await input.fill('合约');
    const live = dialog.locator('[role="status"]');
    await expect(live).toHaveText(/找到 \d+ 条结果/);
    const before = await live.textContent();

    // 派发 compositionstart 之后再改值：组合期间不应触发新的检索
    await input.evaluate((el) => {
      el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      (el as HTMLInputElement).value = 'zhineng';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);
    await expect(live).toHaveText(String(before));
  });

  test('空查询态展示快捷入口，无结果态给三个出口', async ({ page }) => {
    await page.goto('/');
    const dialog = await openPanel(page);
    await expect(dialog.getByRole('navigation', { name: '快捷入口' })).toBeVisible();

    // 用纯拉丁的生造词：中文串会被 bigram 切开，「不存」「在的」这类片段
    // 反而能命中正文，凑不出真正的零结果
    await dialog.getByRole('combobox').fill('qqqqzzzzxxxx');
    await expect(dialog.getByText('没有匹配到内容。')).toBeVisible();
    await expect(dialog.getByRole('link', { name: '浏览网站地图' })).toBeVisible();
    await expect(dialog.getByRole('link', { name: '直接联系我们' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: '清空重试' })).toBeVisible();
  });

  test('索引 URL 带 contentHash 版本位（force-cache 才安全）', async ({ page }) => {
    const urls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('search-index.json')) urls.push(request.url());
    });
    await page.goto('/');
    const dialog = await openPanel(page);
    await dialog.getByRole('combobox').fill('合约');
    await expect(dialog.getByRole('option').first()).toBeVisible();

    expect(urls.length).toBeGreaterThan(0);
    const version = new URL(urls[0] as string).searchParams.get('v');
    expect(version).toBeTruthy();

    const snapshotHash = await page.evaluate(async () => {
      const res = await fetch('/search-index.json');
      return ((await res.json()) as { contentHash: string }).contentHash;
    });
    expect(version).toBe(snapshotHash);
  });
});

test.describe('/search 页', () => {
  test('深链直接出结果', async ({ page }) => {
    const response = await page.goto('/search?q=%E5%90%88%E7%BA%A6');
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('mark').first()).toBeVisible();
  });

  test('无 q 时是可索引的入口页，有 q 时 noindex', async ({ page }) => {
    await page.goto('/search');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      /index(?!.*noindex)/,
    );

    await page.goto('/search?q=x');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('无 JS 也能用：原生表单提交出结果', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto('/search');
    await page.locator('#site-search-input').fill('合约');
    await page.getByRole('button', { name: /检索/ }).click();
    await page.waitForURL(/\/search\?q=/);
    await expect(page.locator('.search-summary strong')).not.toHaveText('0');
    await context.close();
  });

  test('按类型筛选保留查询串', async ({ page }) => {
    await page.goto('/search?q=%E6%99%BA%E8%83%BD');
    await page.getByRole('link', { name: '产品', exact: true }).click();
    await page.waitForURL(/type=product/);
    await expect(page).toHaveURL(/q=/);
  });

  /**
   * **查询串不可执行**（v3 §4.2.7 / P0-2）。
   *
   * 真正危险的不是 `<mark>`，而是 JSON-LD —— `JSON.stringify` 不转义 `<` 与
   * `/`，一个 `</script>` 就能闭合标签。所以除了「没弹窗、没长出 script 元素」，
   * 还要断言**页面上每个 `application/ld+json` 都还能被 JSON.parse**。
   */
  for (const payload of ['<script>alert(1)</script>', '"></script><script>alert(1)</script>']) {
    test(`查询串不可执行：${payload.slice(0, 24)}…`, async ({ page }) => {
      let dialogs = 0;
      page.on('dialog', async (d) => {
        dialogs += 1;
        await d.dismiss();
      });

      const baseline = await page.goto('/search').then(() =>
        page.locator('script:not([type])').count(),
      );

      const response = await page.goto(`/search?q=${encodeURIComponent(payload)}`);
      expect(response?.status()).toBe(200);
      await page.waitForLoadState('networkidle');

      expect(dialogs).toBe(0);
      expect(await page.locator('script:not([type])').count()).toBe(baseline);

      const jsonLdOk = await page.evaluate(() =>
        Array.from(document.querySelectorAll('script[type="application/ld+json"]')).every(
          (node) => {
            try {
              JSON.parse(node.textContent ?? '');
              return true;
            } catch {
              return false;
            }
          },
        ),
      );
      expect(jsonLdOk).toBe(true);

      // 载荷原样作为**文本**出现在摘要里
      await expect(page.locator('.search-summary')).toContainText(payload);
    });
  }
});

test.describe('移动端检索入口', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('抽屉顶部有检索入口，点开后抽屉收起、面板打开', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '打开导航菜单' }).click();
    const drawer = page.getByRole('dialog', { name: '导航菜单' });
    await expect(drawer).toBeVisible();

    await drawer.getByRole('button', { name: '搜索' }).click();
    await expect(page.getByRole('dialog', DIALOG)).toBeVisible();
  });
});
