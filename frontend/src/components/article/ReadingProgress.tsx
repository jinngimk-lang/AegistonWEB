'use client';

/**
 * 顶部阅读进度条（v3 spec §4.3.1）。
 *
 * 两个刻意的决定：
 *
 * 1. **`transform: scaleX()` 驱动，不改 width** —— width 每帧触发 layout，
 *    在长文里滚动会明显掉帧；transform 只走合成层。
 * 2. **`aria-hidden="true"`** —— 它是纯装饰。给屏幕阅读器播报一个持续变化的
 *    百分比是噪声而不是信息，而且会打断正文朗读。
 *
 * `requestAnimationFrame` 节流：scroll 事件的触发频率远高于渲染帧率，
 * 不节流等于每次事件都写一遍样式。
 */

import { useEffect, useRef } from 'react';

import styles from './ReadingProgress.module.css';

export function ReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const bar = barRef.current;
      if (!bar) return;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, doc.scrollTop / scrollable)) : 0;
      bar.style.transform = `scaleX(${ratio})`;
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div className={styles['rp-track']} aria-hidden="true">
      <div ref={barRef} className={styles['rp-bar']} />
    </div>
  );
}
