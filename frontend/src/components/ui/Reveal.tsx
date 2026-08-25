'use client';

/**
 * 滚动揭示（ref `.reveal`）。
 *
 * spec §4.2 路径 A 第 6 步 / §5.3（v2 撤销条目）：
 * `IntersectionObserver(threshold: .12, rootMargin: '0px 0px -50px 0px')`
 * 加 `.visible` —— 与 ref/1.html 的内联 JS **完全等价**。
 *
 * ⚠️ ref 的滚动动效本来就是生效的：`.reveal{opacity:0;transform:translateY(20px)}`
 * 是基线规则，`opacity:1;transform:none` 只出现在 `prefers-reduced-motion`
 * 块内。因此这里**不存在偏离**：初始位移 20px（不是 24px）、缓动
 * `.7s cubic-bezier(.2,.8,.2,1)`、延迟档位 `.1s/.2s/.3s` 全部原样保留。
 */

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';

import { cn } from '@/lib/cn';

type Delay = 0 | 1 | 2 | 3;

interface Props {
  children: ReactNode;
  delay?: Delay;
  as?: ElementType;
  className?: string;
  id?: string;
}

export function Reveal({ children, delay = 0, as: Tag = 'div', className, id }: Props) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -50px 0px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      id={id}
      className={cn('reveal', delay > 0 && `reveal-d${delay}`, visible && 'visible', className)}
    >
      {children}
    </Tag>
  );
}
