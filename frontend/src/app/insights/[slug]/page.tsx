import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ArticleToc } from '@/components/article/ArticleToc';
import { ReadingProgress } from '@/components/article/ReadingProgress';
import { RelatedPosts } from '@/components/article/RelatedPosts';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getInsight, getInsights } from '@/lib/api';
import { formatDate, formatReading } from '@/lib/format';
import { articleJsonLd, breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES, absoluteUrl } from '@/lib/routes';
import { ogImageUrl, pageMetadata } from '@/lib/seo';

export const revalidate = 300;

export async function generateStaticParams() {
  const page = await getInsights({ pageSize: 24 });
  return page.items.map((item) => ({ slug: item.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getInsight(slug);
  if (!post) return {};
  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: ROUTES.insightDetail(slug),
    type: 'article',
    publishedTime: post.publishedAt,
  });
}

export default async function InsightDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [post, media] = await Promise.all([getInsight(slug), getMediaLookup()]);
  if (!post) notFound();

  const crumbs = crumbsFromPath(ROUTES.insightDetail(slug), post.title);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            articleJsonLd({
              title: post.title,
              description: post.excerpt,
              path: ROUTES.insightDetail(slug),
              publishedAt: post.publishedAt,
              image: absoluteUrl(ogImageUrl(ROUTES.insightDetail(slug))),
              // 机构名，**不写自然人** —— v2 §15 第 6 条「洞察真实作者署名待确认」
              // 在关闭之前，署任何个人的名都是臆造（CLAUDE.md §4）。
            }),
            breadcrumbJsonLd(crumbs),
          ]),
        }}
      />
      <PageHero
        eyebrow={post.categoryLabel}
        title={post.title}
        subtitle={post.excerpt}
        media={media.get(post.heroMedia)}
        meta={[
          { key: '发布', value: formatDate(post.publishedAt) },
          { key: '阅读', value: formatReading(post.readingMinutes) },
        ]}
      />
      <Breadcrumbs items={crumbs} />

      <ReadingProgress />

      <section className="section" aria-label="正文">
        <div className="container">
          <div className="article-layout">
            <article className="article">
              <div className="article-meta">
                <span className="cat">{post.categoryLabel}</span>
                <span className="date">{formatDate(post.publishedAt)}</span>
                <span>{formatReading(post.readingMinutes)}</span>
              </div>

              {/* 正文由后端 markdown-it 渲染后经 bleach 白名单净化，无第三方脚本注入面 */}
              <div className="prose" dangerouslySetInnerHTML={{ __html: post.bodyHtml }} />

              {slug !== 'product-overview-v7' && post.sources.length > 0 ? (
                <div className="article-sources">
                  <strong>资料来源</strong>
                  <ul>
                    {post.sources.map((source) => (
                      <li key={source}>{source}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <SourceNote slides={post.sourceSlides} />

              <nav className="article-nav" aria-label="上一篇 / 下一篇">
                {post.prev ? (
                  <Link className="article-nav-item" data-side="prev" href={post.prev.href}>
                    <span className="article-nav-dir">← 上一篇</span>
                    <span className="article-nav-title">{post.prev.title}</span>
                  </Link>
                ) : (
                  <p className="article-nav-empty">已经是最新一篇</p>
                )}
                {post.next ? (
                  <Link className="article-nav-item" data-side="next" href={post.next.href}>
                    <span className="article-nav-dir">下一篇 →</span>
                    <span className="article-nav-title">{post.next.title}</span>
                  </Link>
                ) : (
                  <p className="article-nav-empty">已经是最早一篇</p>
                )}
              </nav>

              <RelatedPosts items={post.related} media={media} />

              <p style={{ marginTop: 32 }}>
                <Link href={ROUTES.insights} className="btn-text">
                  返回洞察列表 <span aria-hidden="true">→</span>
                </Link>
              </p>
            </article>

            <aside className="article-rail">
              <ArticleToc items={post.toc} />
            </aside>
          </div>
        </div>
      </section>

      <section className="cta-band" aria-labelledby="insight-cta">
        <div className="cta-inner">
          <h2 id="insight-cta">带着真实问题，和我们聊聊</h2>
          <p>如果这篇文章里的问题正是贵司眼下卡住的地方，我们可以做一次针对性的场景讨论。</p>
          <div className="cta-actions">
            <Reveal as="span">
              <Link href={`${ROUTES.contact}?intent=consult`} className="btn btn-primary">
                商务咨询
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            </Reveal>
            <Reveal as="span" delay={1}>
              <Link href={ROUTES.products} className="btn btn-outline">
                查看产品体系
              </Link>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
