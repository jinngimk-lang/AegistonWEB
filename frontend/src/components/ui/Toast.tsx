import type { ReactNode } from 'react';

import styles from '@/components/ui/Toast.module.css';
import { cn } from '@/lib/cn';

interface Props {
  tone: 'success' | 'error';
  title: string;
  children?: ReactNode;
}

/** 表单提交结果播报。外层用 `aria-live="polite"` 包裹（见 LeadForm）。 */
export function Toast({ tone, title, children }: Props) {
  return (
    <div className={cn(styles.toast, styles[tone])} role={tone === 'error' ? 'alert' : 'status'}>
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        aria-hidden="true"
      >
        {tone === 'success' ? (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5 L11 15.5 L16 9.5" />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7.5v5.5M12 16.2v.3" />
          </>
        )}
      </svg>
      <div className={styles.body}>
        <div className={styles.title}>{title}</div>
        {children}
      </div>
    </div>
  );
}
