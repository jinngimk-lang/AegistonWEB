/**
 * 首页新闻区（ref `.news-grid`：1 大 + 4 小）。
 * `1.15fr 1fr / gap:56px`、`.news-item{grid:88px 1fr; gap:22px; padding:22px 0}`
 * hover `padding-left:8px` —— 原样沿用（spec §5.2）。
 */

import Image from 'next/image';
import Link from 'next/link';

import { Reveal } from '@/components/ui/Reveal';
import { formatDate, formatNewsDate } from '@/lib/format';
import { stockSrc, type MediaLookup } from '@/lib/media';
import type { InsightSummary } from '@/types/content';

export function InsightsPreview({
  items,
  media,
}: {
  items: InsightSummary[];
  media: MediaLookup;
}) {
  const [feature, ...rest] = items;
  if (!feature) return null;
  const featureAsset = media.get(feature.heroMedia);

  return (
    <div className="news-grid">
      <Reveal as="div" className="news-feature">
        <Link href={feature.href} style={{ display: 'contents' }}>
          <div className="news-feature-img">
            {featureAsset ? (
              <Image
                src={'source' in featureAsset ? stockSrc(featureAsset, 1280) : featureAsset.src}
                alt=""
                role="presentation"
                fill
                sizes="(max-width: 900px) 100vw, 55vw"
                placeholder="blur"
                blurDataURL={featureAsset.blurDataUrl}
                style={{ objectFit: 'cover' }}
              />
            ) : null}
          </div>
          <div className="news-date">
            {formatDate(feature.publishedAt)} · {feature.categoryLabel}
          </div>
          <h3>{feature.title}</h3>
          <p>{feature.excerpt}</p>
        </Link>
      </Reveal>

      <div className="news-list">
        {rest.map((item) => {
          const { month, label } = formatNewsDate(item.publishedAt);
          return (
            <Reveal key={item.slug} as="div" delay={1} className="news-item">
              <Link href={item.href} style={{ display: 'contents' }}>
                <div className="news-item-date">
                  <span className="y">{month}</span>
                  {label}
                </div>
                <div className="news-item-body">
                  <div className="news-item-cat">{item.categoryLabel}</div>
                  {/* 小新闻与左侧主新闻同属 section h2 的直接子项，语义层级保持为 3。 */}
                  <h4 role="heading" aria-level={3}>
                    {item.title}
                  </h4>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}
