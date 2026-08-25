'use client';

/**
 * 产品页节内锚点导航（v3 spec §4.3.2）。
 *
 * 锚点来自 `ScreenSection.id` —— v2 已经给每一屏设了 `id`，这里不新造锚点。
 * 布局与 ref 类名无后代关系 → CSS Module，前缀 `sn-`。
 *
 * 移动端横向可滚动：容器带 `tabindex="0"` + `aria-label`，
 * 满足 WCAG 2.1 SC 2.1.1（可滚动区域必须键盘可达）。
 */

import { useEffect, useState } from 'react';

import styles from './SectionNav.module.css';

interface Props {
  items: { id: string; label: string }[];
}

/**
 * 激活线：sticky 顶栏 80px（`--header-h`）+ 锚点条自身高度。
 * 同 `ArticleToc.LINE_OFFSET`：手工对齐的常量，改顶栏高度时要一起改。
 */
const LINE_OFFSET = 160;

export function SectionNav({ items }: Props) {
  const [active, setActive] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    if (items.length === 0) return;
    const targets = items
      .map((item) => document.getElementById(item.id))
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

  if (items.length < 2) return null;

  return (
    // tabIndex 让横向可滚动区域键盘可达（WCAG 2.1 SC 2.1.1）；
    // <nav> 的隐含角色就是 navigation，不再显式重复写 role
    <nav className={styles['sn-root']} aria-label="本页内容" tabIndex={0}>
      <div className={styles['sn-inner']}>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={styles['sn-link']}
            aria-current={active === item.id ? 'location' : undefined}
            onClick={(event) => {
              const target = document.getElementById(item.id);
              if (!target) return;
              event.preventDefault();
              const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
              target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
              history.replaceState(null, '', `#${item.id}`);
              setActive(item.id);
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
