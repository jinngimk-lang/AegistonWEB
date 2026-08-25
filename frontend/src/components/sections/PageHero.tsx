/**
 * 内页 Hero（`.page-hero`，全局层 sections-ext.css）。
 * 沿用 Hero 的遮罩与渐变线语言，但高度收敛到 340px，给内页留出更多正文空间。
 */

import Image from 'next/image';
import type { ReactNode } from 'react';

import { stockSrc, type ResolvedMedia } from '@/lib/media';

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
  media?: ResolvedMedia | null;
  meta?: { key: string; value: string }[];
  children?: ReactNode;
}

export function PageHero({ eyebrow, title, subtitle, media, meta, children }: Props) {
  return (
    <section className="page-hero" aria-labelledby="page-hero-title">
      {media ? (
        <div className="page-hero-bg">
          <Image
            src={'source' in media ? stockSrc(media, 1920) : media.src}
            alt=""
            role="presentation"
            fill
            priority
            fetchPriority="high"
            quality={80}
            sizes="100vw"
            placeholder="blur"
            blurDataURL={media.blurDataUrl}
          />
        </div>
      ) : null}

      <div className="container">
        <div className="page-hero-content">
          <div className="page-hero-text">
            <div className="section-label">{eyebrow}</div>
            <h1 id="page-hero-title">{title}</h1>
            {subtitle ? <p className="page-hero-sub">{subtitle}</p> : null}
            {meta && meta.length > 0 ? (
              <div className="page-hero-meta">
                {meta.map((entry) => (
                  <span key={entry.key}>
                    <span className="k">{entry.key}</span>
                    {entry.value}
                  </span>
                ))}
              </div>
            ) : null}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
