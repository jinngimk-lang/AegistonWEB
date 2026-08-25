/**
 * 相关阅读（v3 spec §4.3.1）。
 *
 * ⚠️ 复用全局 `.card-grid` / `.card` / `.card-body` —— 因此**结构样式进
 * `sections-ext.css`（全局层），不进 CSS Module**：`.related-block .card-grid`
 * 这类跨元素后代选择器写进 Module 会被哈希成页面上不存在的类名
 * （CLAUDE.md §1）。本文件里出现的类名全部是全局字符串字面量。
 *
 * 服务端组件：只读数据、无交互。
 */

import Image from 'next/image';
import Link from 'next/link';

import { formatDate } from '@/lib/format';
import { stockSrc, type MediaLookup } from '@/lib/media';
import type { InsightSummary } from '@/types/content';

interface Props {
  items: InsightSummary[];
  media: MediaLookup;
}

export function RelatedPosts({ items, media }: Props) {
  if (items.length === 0) return null;

  return (
    <section className="related-block" aria-labelledby="related-title">
      <div className="section-label">RELATED READING</div>
      <h2 className="section-title" id="related-title" style={{ fontSize: 24, marginBottom: 20 }}>
        相关阅读
      </h2>
      <div className="card-grid">
        {items.map((post) => {
          const asset = media.get(post.heroMedia);
          return (
            <article className="card" key={post.slug}>
              {asset ? (
                <div className="card-media">
                  <Image
                    src={'source' in asset ? stockSrc(asset, 768) : asset.src}
                    alt=""
                    role="presentation"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    quality={70}
                    placeholder="blur"
                    blurDataURL={asset.blurDataUrl}
                  />
                </div>
              ) : null}
              <div className="card-body">
                <div className="card-eyebrow">{post.categoryLabel}</div>
                <h3>
                  <Link href={post.href}>{post.title}</Link>
                </h3>
                <p>{post.excerpt}</p>
                <div className="card-foot">
                  {formatDate(post.publishedAt)}
                  <span aria-hidden="true">→</span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
