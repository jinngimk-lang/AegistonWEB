/**
 * 按钮 / 按钮式链接（ref `.btn` `.btn-primary` `.btn-outline` `.btn-text`）。
 *
 * ⚠️ 这些类名属于**全局层**（src/styles/sections.css），绝不能进 CSS Module——
 * ref 里有 `.cta-band .btn-primary{background:var(--navy)}` 这样的跨组件后代
 * 选择器，一旦被哈希就永远匹配不到（spec §9.3 / P0-2）。
 */

import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'text';

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  compact?: boolean;
  navy?: boolean;
  arrow?: boolean;
  className?: string;
}

interface LinkProps extends BaseProps {
  href: string;
  external?: boolean;
  ariaDisabled?: boolean;
}

const VARIANT_CLASS: Record<Variant, string> = {
  primary: 'btn btn-primary',
  outline: 'btn btn-outline',
  text: 'btn-text',
};

function classesFor({ variant = 'primary', compact, navy, className }: BaseProps): string {
  return cn(
    VARIANT_CLASS[variant],
    compact && variant !== 'text' && 'btn-compact',
    navy && variant === 'primary' && 'btn-navy',
    className,
  );
}

export function ButtonLink({ href, external, ariaDisabled, ...props }: LinkProps) {
  const content = (
    <>
      {props.children}
      {props.arrow !== false && props.variant !== 'text' ? (
        <span className="arrow" aria-hidden="true">
          →
        </span>
      ) : null}
      {props.variant === 'text' ? <span aria-hidden="true">→</span> : null}
    </>
  );
  const className = classesFor(props);

  if (external) {
    return (
      <a href={href} className={className} rel="noopener noreferrer">
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={className} aria-disabled={ariaDisabled || undefined}>
      {content}
    </Link>
  );
}
