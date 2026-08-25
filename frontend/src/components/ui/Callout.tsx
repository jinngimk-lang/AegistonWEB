import type { ReactNode } from 'react';

interface Props {
  title?: string;
  tone?: 'accent' | 'neutral';
  children: ReactNode;
}

/** 内联提示 / 溯源标注。用于合规说明、数据口径注记等。 */
export function Callout({ title, tone = 'accent', children }: Props) {
  return (
    <div className="callout" data-tone={tone === 'neutral' ? 'neutral' : undefined}>
      {title ? <h5>{title}</h5> : null}
      {children}
    </div>
  );
}
