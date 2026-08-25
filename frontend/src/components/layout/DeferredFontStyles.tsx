'use client';

/**
 * 把字体声明表的后半段移出渲染阻塞路径（v3 spec §4.6.1 M5-a）。
 *
 * `fonts.css` 有 534 条 `@font-face`（构建产物实测 487.9 kB raw / 153.4 kB gzip），
 * 由 `layout.tsx` 直接 import，位置**在 LCP 之前**，比全站 JS 加起来还大。
 * `pick-preload-fonts.mjs` 把它按首屏字符切成两半：关键分片随 `globals.css`
 * 走关键路径，其余由本组件在挂载后追加到 `<head>`。
 *
 * **为什么不用 `<link media="print" onload="this.media='all'">`**（spec 方案 a1
 * 的字面写法）：React 不允许把字符串塞给 `onLoad`（它是事件处理器 prop，
 * 传字符串会直接抛错），要生成那个属性只能再套一层
 * `dangerouslySetInnerHTML`。而且那条路会往 CSP 论证里再添一个「内联事件
 * 处理器」的豁免面，正好是 §4.2.7 想收紧的方向。用 4 行 `useEffect` 换掉它，
 * 既没有内联事件处理器，也不需要在安全论证里加注脚。
 *
 * 无 JS 时由服务端渲染的 `<noscript>` 同步加载兜底 —— 退化为改动前的现状，
 * 不是坏功能。
 */

import { useEffect } from 'react';

export const DEFERRED_FONT_HREF = '/styles/fonts-rest.css';

export function DeferredFontStyles() {
  useEffect(() => {
    if (document.querySelector(`link[href="${DEFERRED_FONT_HREF}"]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = DEFERRED_FONT_HREF;
    // low 优先级：它服务的是首屏之外的字形，不该和首屏图片抢带宽
    link.setAttribute('fetchpriority', 'low');
    document.head.appendChild(link);
  }, []);

  return null;
}
