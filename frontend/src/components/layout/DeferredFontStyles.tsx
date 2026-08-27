'use client';

/**
 * 把字体声明表的后半段移出渲染阻塞路径（v3 spec §4.6.1 M5-a）。
 *
 * `fonts.css` 有 534 条 `@font-face`（构建产物实测 487.9 kB raw / 153.4 kB gzip），
 * 由 `layout.tsx` 直接 import，位置**在 LCP 之前**，比全站 JS 加起来还大。
 * `pick-preload-fonts.mjs` 把它按首屏字符切成两半：关键分片随 `globals.css`
 * 走关键路径，其余由本组件在 window load 后加载。
 *
 * 非关键分片不能继续用 `font-display: swap`：它们本来就不属于首屏关键字体，
 * 如果在页面已经绘制后再 swap，会让内页标题/正文重新换字形并产生 CLS。
 * 因此运行期把 rest CSS 中的 swap 改成 optional；首屏 critical CSS 不受影响。
 * 首次访问来不及在 optional 窗口内完成的字形继续使用稳定 fallback，后续缓存命中
 * 时仍可使用自托管字体。这样同时避免与 LCP 抢带宽和晚到字体造成的布局移动。
 *
 * 无 JS 时由服务端渲染的 `<noscript>` 同步加载兜底 —— 退化为原始字体策略，
 * 不是坏功能。
 */

import { useEffect } from 'react';

export const DEFERRED_FONT_HREF = '/styles/fonts-rest.css';
export const DEFERRED_FONT_STYLE_ID = 'aegiston-deferred-fonts';

/** 只改变非关键字体的展示策略；不改 family / weight / unicode-range / URL。 */
export function makeDeferredFontsOptional(css: string): string {
  return css.replace(/font-display:\s*swap\s*;/g, 'font-display: optional;');
}

function deferredFontsAlreadyMounted(): boolean {
  return Boolean(
    document.getElementById(DEFERRED_FONT_STYLE_ID) ||
      document.querySelector(`link[href="${DEFERRED_FONT_HREF}"]`),
  );
}

export function DeferredFontStyles() {
  useEffect(() => {
    if (deferredFontsAlreadyMounted()) return;

    const controller = new AbortController();
    let disposed = false;

    const mountDeferredFonts = async () => {
      if (disposed || deferredFontsAlreadyMounted()) return;

      try {
        const response = await fetch(DEFERRED_FONT_HREF, {
          cache: 'force-cache',
          credentials: 'same-origin',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`字体样式加载失败：HTTP ${response.status}`);

        const css = makeDeferredFontsOptional(await response.text());
        if (disposed || deferredFontsAlreadyMounted()) return;

        const style = document.createElement('style');
        style.id = DEFERRED_FONT_STYLE_ID;
        style.dataset.fonts = 'deferred';
        style.textContent = css;
        document.head.appendChild(style);
      } catch (error) {
        if (disposed || controller.signal.aborted || deferredFontsAlreadyMounted()) return;

        // 极端失败路径保留功能：load 已完成后再退回普通 stylesheet。
        // 这条路径不参与正常 Lighthouse/首屏性能；正常路径始终使用 optional。
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = DEFERRED_FONT_HREF;
        link.setAttribute('fetchpriority', 'low');
        link.dataset.fonts = 'deferred-fallback';
        document.head.appendChild(link);
        void error;
      }
    };

    const onLoad = () => {
      void mountDeferredFonts();
    };

    if (document.readyState === 'complete') {
      onLoad();
    } else {
      window.addEventListener('load', onLoad, { once: true });
    }

    return () => {
      disposed = true;
      controller.abort();
      window.removeEventListener('load', onLoad);
    };
  }, []);

  return null;
}
