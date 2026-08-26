import { expect, test } from '@playwright/test';

test.describe('桌面导航', () => {
  test.skip(({ isMobile }) => Boolean(isMobile), '仅桌面');

  test('hover 展开下拉并可跳转', async ({ page }) => {
    await page.goto('/');
    const item = page.locator('.nav-item').filter({ hasText: '产品与方案' });
    await item.hover();
    const submenu = item.locator('.submenu');
    await expect(submenu).toBeVisible();
    await submenu.getByRole('link', { name: 'AragonTeam' }).click();
    await expect(page).toHaveURL(/\/products\/aragonteam$/);
  });

  test('键盘可以打开下拉、Esc 收起并回焦', async ({ page }) => {
    await page.goto('/');
    const trigger = page
      .locator('.nav-item')
      .filter({ hasText: '技术与研究' })
      .locator('[data-nav-trigger]');

    await trigger.focus();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await trigger.press('Escape');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
  });

  test('当前路由高亮为 aria-current', async ({ page }) => {
    await page.goto('/research');
    await expect(page.locator('.nav-item[data-current="true"]')).toHaveCount(1);
  });

  test('跳过导航链接是第一个可聚焦元素，激活后焦点进入主内容', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.getByRole('link', { name: '跳到主要内容' });
    await expect(skipLink).toBeFocused();
    await skipLink.press('Enter');
    await expect(page.locator('main#main')).toBeFocused();
  });

  /**
   * v3：`.nav-search` 从 `<Link href="/sitemap">` 还原成 ref/1.html:436 原本的
   * `<button>`（v3 §9 / P1-3）。role 从 link 变成 button，本用例必然要同批改写。
   * 同时补一条「网站地图的入口没有因为这次改动而丢失」。
   */
  test('顶栏检索按钮唤起命令面板', async ({ page }) => {
    await page.goto('/');
    const trigger = page.locator('.nav-search');
    await expect(trigger).toHaveJSProperty('tagName', 'BUTTON');
    await expect(trigger).toHaveAttribute('aria-label', '搜索');
    await trigger.click();
    await expect(page.getByRole('dialog', { name: '站内检索' })).toBeVisible();
  });

  test('网站地图仍可从面板与页脚到达（入口没丢）', async ({ page }) => {
    await page.goto('/');
    await page.locator('.nav-search').click();
    const dialog = page.getByRole('dialog', { name: '站内检索' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('link', { name: '打开检索页' }).click();
    await expect(page).toHaveURL(/\/search$/);

    await page.goto('/');
    await page.locator('.footer').getByRole('link', { name: '网站地图' }).first().click();
    await expect(page).toHaveURL(/\/sitemap$/);
  });
});

test.describe('移动端导航', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('汉堡按钮打开全屏抽屉并可导航', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: '打开导航菜单' });
    await expect(toggle).toBeVisible();
    await toggle.click();

    const drawer = page.getByRole('dialog', { name: '导航菜单' });
    await expect(drawer).toBeVisible();

    await drawer.getByText('产品与方案').click();
    await drawer.getByRole('link', { name: /InkClaw/ }).first().click();
    await expect(page).toHaveURL(/\/products\/inkclaw$/);
  });

  test('Esc 关闭抽屉', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '打开导航菜单' }).click();
    const drawer = page.getByRole('dialog', { name: '导航菜单' });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
});
