'use client';

/**
 * 回到顶部（ref `.totop`）。
 * ref 用的是 `<button>`（不是 `<div>`），本组件保持一致；
 * `scrollY > 600` 时显示 `.show`，与 ref 内联 JS 完全等价。
 */

import { useEffect, useState } from 'react';

import { cn } from '@/lib/cn';

export function ToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      type="button"
      className={cn('totop', show && 'show')}
      aria-label="回到顶部"
      tabIndex={show ? 0 : -1}
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
      }}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    </button>
  );
}
