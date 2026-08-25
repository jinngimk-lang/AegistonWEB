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

  test('跳过导航链接是第一个可聚焦元素', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: '跳到主要内容' })).toBeFocused();
  });

  test('检索按钮指向站点地图，不留死按钮', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '站点地图与检索' }).click();
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
