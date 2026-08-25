import { expect, type Locator, type Page } from '@playwright/test';

/**
 * 栅格轨道测量（§5.2 视觉契约的公共底座）。
 *
 * ## 为什么不能直接 `getComputedStyle(el).gridTemplateColumns.split(' ').length`
 *
 * 元素**没有参与布局**时（Next.js 流式 SSR 把 Suspense 内容先放在
 * `<div hidden id="S:0">` 缓冲区里，`load` 之后才移进 `<main>`），
 * `getComputedStyle` 返回的是**指定值** `repeat(4, 1fr)` 而不是解析后的
 * `228px 228px 228px 228px`。
 *
 * 而 `'repeat(4, 1fr)'.split(' ').length === 2` —— 恒等于 2，与真实列数无关。
 * 后果分两种，第二种更糟：
 *
 * 1. 断言 4 列 / 5 列的用例**随机变红**（拿到 2）；
 * 2. 断言 **2 列**的用例（`.solution`、768px 以下的 `.metrics-grid`）
 *    在元素压根没渲染时**照样变绿** —— 契约测试变成了摆设，
 *    而且这种假绿不会有任何征兆。
 *
 * 所以这里做两件事：`toBeVisible()` 自动等待流式内容落位，
 * 再断言轨道值确实解析成了具体尺寸（含 `px`）。未解析就**直接失败**，
 * 而不是返回一个碰巧对得上的 2。
 */
export async function gridTracks(target: Page | Locator, selector?: string): Promise<number[]> {
  const locator = selector ? (target as Page).locator(selector).first() : (target as Locator);
  const label = selector ?? '(locator)';

  await expect(locator, `${label} 未进入布局（流式内容尚未落位？）`).toBeVisible();

  const value = await locator.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(
    value,
    `${label} 的 grid-template-columns 仍是未解析的指定值「${value}」——` +
      '说明元素没有参与布局，此时的列数断言没有意义',
  ).toMatch(/px/);

  return value.split(' ').map(Number.parseFloat);
}

/** 解析后的栅格列数。 */
export async function gridCols(target: Page | Locator, selector?: string): Promise<number> {
  return (await gridTracks(target, selector)).length;
}

/**
 * 原始测量前的守卫：等元素真正参与布局再交回调用方。
 *
 * `toHaveCSS()` 自带自动重试，所以用它的断言天然稳；
 * 直接 `.evaluate(el => getComputedStyle(el)…)` / `getBoundingClientRect()`
 * 的地方**没有**这层保护 —— 流式内容还在 `<div hidden>` 里时，
 * 前者拿到指定值、后者拿到 0。两种都会让断言失去意义：
 * `.hero` 的高度断言会随机变红，而 `::after { width: 1px }`
 * 这类「指定值恰好等于期望值」的断言会**永远变绿**。
 */
export async function laidOut(locator: Locator, label: string): Promise<Locator> {
  await expect(locator, `${label} 未进入布局（流式内容尚未落位？）`).toBeVisible();
  return locator;
}
