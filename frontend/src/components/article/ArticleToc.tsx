'use client';

/**
 * 正文目录 + scrollspy（v3 spec §4.3.1）。
 *
 * ⚠️ **组件是 Module，位置不是。**
 * 目录自身的排版（`toc-` 前缀）在 `ArticleToc.module.css`；把目录摆到正文
 * 右侧所需的**定位上下文**（`.article-layout` 栅格、`.article-rail` sticky）
 * 必须写在 `sections-ext.css` —— 因为它要作用在 `.article` 这一层，
 * 而 `.article` 是全局类。写进 Module 会得到「样式全对、位置不对」的目录，
 * 且没有任何告警（CLAUDE.md §1 / v3 P1-9）。
 *
 * 窄屏（≤1024px）折叠为 `<details>`：小屏上一条常驻的目录会挤掉正文，
 * 而阅读长文时正文才是主体。
 */

import { useEffect, useState } from 'react';

import type { TocItem } from '@/types/content';

import styles from './ArticleToc.module.css';

interface Props {
  items: TocItem[];
}

/**
 * 激活线：sticky 顶栏 80px（`--header-h`）+ 40px 余量。
 * ⚠️ 这是**手工对齐**的常量，不是从 CSS 变量读来的 —— 改顶栏高度时
 * `tokens.css` 的 `--header-h` 与这里要一起改（`SectionNav` 的同名常量同理）。
 */
const LINE_OFFSET = 120;

export function ArticleToc({ items }: Props) {
  const [active, setActive] = useState<string | null>(items[0]?.anchor ?? null);

  useEffect(() => {
    if (items.length === 0) return;
    const targets = items
      .map((item) => document.getElementById(item.anchor))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    /**
     * 「当前小节」= **最后一个已经越过激活线的标题**。
     *
     * 初版照 spec 用了 `rootMargin: '-30% 0px -65% 0px'` + `isIntersecting`。
     * 那条 rootMargin 把可视区压成了 **5% 视口高**（100 − 30 − 65）的一条窄带，
     * 结果是：连续滚动时能用，但**直接跳转到某一节**时那个标题落在窄带之外，
     * 高亮会留在上一节不动 —— 点了目录，目录自己不动，这正是这个组件最不该
     * 出现的失效形态（实测：跳到 `#sec-3` 后高亮仍停在 `sec-1`）。
     *
     * 改法：IntersectionObserver 只当**便宜的触发器**，不再读它的
     * `isIntersecting`，
     * 每次回调用 `getBoundingClientRect()` 重算一遍「最后一个越线的标题」。
     * 这样跳转、连续滚动、缩放都给出同一个确定的答案。
     */
    const pick = () => {
      const line = LINE_OFFSET;
      let current = targets[0]?.id ?? null;
      for (const target of targets) {
        if (target.getBoundingClientRect().top <= line) current = target.id;
      }
      if (current) setActive(current);
    };

    const observer = new IntersectionObserver(pick, {
      rootMargin: '0px 0px -60% 0px',
      threshold: [0, 1],
    });
    for (const target of targets) observer.observe(target);

    /**
     * ⚠️ **只靠 IntersectionObserver 会选错**，这是实测踩到的，不是理论顾虑。
     *
     * `base.css:18` 有一条全局 `html { scroll-behavior: smooth }`（v2 从 ref
     * 原样搬来的）。于是任何程序化滚动都是**动画**，而 IO 的最后一次回调发生在
     * **动画途中**——动画结束后没有元素再跨越阈值，也就不会再有回调，高亮就停在
     * 中间某一项上。实测：跳到 `#sec-3`（最终 top = 104px，激活线 120px）之后，
     * 高亮停在 `sec-2` 不动。
     *
     * 所以再挂一个 rAF 节流的 passive `scroll` 监听：它在动画**落定之后**还会
     * 再触发几次，最后一次读到的就是终态。IO 仍然留着，它负责捕捉「没有滚动
     * 但布局变了」（图片落位、字体表异步挂载）的情况 —— 两个触发器各补各的洞。
     */
    let frame = 0;
    const onScroll = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          pick();
        });
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });

    pick();
    return () => {
      observer.disconnect();
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [items]);

  if (items.length === 0) return null;

  const list = (
    <ol className={styles['toc-list']}>
      {items.map((item) => (
        <li key={item.anchor} className={styles['toc-item']} data-level={item.level}>
          <a
            href={`#${item.anchor}`}
            className={styles['toc-link']}
            aria-current={active === item.anchor ? 'location' : undefined}
            onClick={(event) => {
              const target = document.getElementById(item.anchor);
              if (!target) return;
              event.preventDefault();
              const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
              // 手工写 hash：preventDefault 之后浏览器不会自己更新地址栏，
              // 而「点了目录能复制链接分享到这一节」是这个组件的一半价值。
              history.replaceState(null, '', `#${item.anchor}`);
              setActive(item.anchor);
            }}
          >
            {item.text}
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <nav className={styles['toc-root']} aria-label="本文目录">
      <div className={styles['toc-wide']}>
        <h2 className={styles['toc-title']}>本文目录</h2>
        {list}
      </div>
      <details className={styles['toc-narrow']}>
        <summary className={styles['toc-summary']}>本文目录（{items.length} 节）</summary>
        {list}
      </details>
    </nav>
  );
}
