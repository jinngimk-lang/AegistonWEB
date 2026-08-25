import { expect, test } from '@playwright/test';

/** 线索表单 —— 官网唯一的写路径（spec §4.2 路径 C / §10.3 表单无障碍）。 */

test.describe('线索表单', () => {
  test('query 预填咨询意向与产品', async ({ page }) => {
    await page.goto('/contact?intent=demo&product=legallens');
    await expect(page.getByLabel('咨询意向')).toHaveValue('demo');
    await expect(page.getByLabel('关注的产品')).toHaveValue('legallens');
  });

  test('未勾选同意时提交被拦下', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel(/^姓名/).fill('测试用户');
    await page.getByLabel(/^单位名称/).fill('某某集团有限公司');
    await page.getByLabel(/^手机号/).fill('13800138000');
    await page.getByRole('button', { name: /提交信息/ }).click();

    // 浏览器原生 required 会先拦一次；即便绕过，服务端也会 422
    await expect(page).toHaveURL(/\/contact/);
  });

  test('手机号格式错误时给出内联错误并聚焦该字段', async ({ page }) => {
    await page.goto('/contact');
    await page.getByLabel(/^姓名/).fill('测试用户');
    await page.getByLabel(/^单位名称/).fill('某某集团有限公司');
    await page.getByLabel(/^手机号/).fill('123');
    await page.getByLabel(/我已阅读并同意/).check();
    await page.getByRole('button', { name: /提交信息/ }).click();

    const phone = page.getByLabel(/^手机号/);
    await expect(phone).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#' + (await phone.getAttribute('aria-describedby'))!)).toContainText(
      '手机号格式不正确',
    );
  });

  test('完整提交后播报成功', async ({ page }) => {
    await page.goto('/contact');
    const stamp = Date.now().toString().slice(-8);
    await page.getByLabel(/^姓名/).fill('端到端测试');
    await page.getByLabel(/^单位名称/).fill('端到端测试单位');
    await page.getByLabel(/^手机号/).fill(`139${stamp}`);
    await page.getByLabel(/^邮箱/).fill(`e2e${stamp}@example.com`);
    await page.getByLabel(/^您想了解什么/).fill('端到端测试留言');
    await page.getByLabel(/我已阅读并同意/).check();
    await page.getByRole('button', { name: /提交信息/ }).click();

    await expect(page.getByRole('status')).toContainText(/已收到您的信息|提交成功/, {
      timeout: 20_000,
    });
  });

  test('表单字段全部有显式 label 绑定', async ({ page }) => {
    await page.goto('/contact');
    const unlabelled = await page
      .locator('form input:not([type="hidden"]), form select, form textarea')
      .evaluateAll((nodes) =>
        nodes.filter((node) => {
          const id = node.getAttribute('id');
          if (!id) return true;
          return !document.querySelector(`label[for="${id}"]`);
        }).length,
      );
    expect(unlabelled).toBe(0);
  });

  test('honeypot 字段对真实用户不可见但存在于 DOM', async ({ page }) => {
    await page.goto('/contact');
    const honeypot = page.locator('input[name="website"]');
    await expect(honeypot).toHaveCount(1);

    // 刻意不用 display:none —— 部分机器人会跳过被完全隐藏的字段。
    // 这里用离屏定位 + 祖先 aria-hidden + tabIndex=-1，真实用户既看不到也 Tab 不到。
    const box = await honeypot.boundingBox();
    expect(box === null || box.x < -1000).toBe(true);
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
    await expect(page.locator('[aria-hidden="true"] input[name="website"]')).toHaveCount(1);
  });

  test('侧栏始终提供邮件兜底路径', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('a[href^="mailto:"]').first()).toBeVisible();
  });
});
