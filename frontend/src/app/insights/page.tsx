import type { Metadata } from 'next';
import Link from 'next/link';

import { MediaFill } from '@/components/media/MediaFill';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Reveal } from '@/components/ui/Reveal';
import { getInsights } from '@/lib/api';
import { formatDate, formatReading } from '@/lib/format';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { CATEGORY_LABELS, INSIGHT_CATEGORIES, ROUTES, type InsightCategory } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 300;

const DESCRIPTION =
  '市场规模与政策节奏已经确定；不确定的是——企业把 Agent 买回来之后，能不能真的用起来。以下是我们对这个问题的持续观察，以及公司与研究进展。';

export const metadata: Metadata = pageMetadata({
  title: '洞察与动态',
  description: DESCRIPTION,
  path: ROUTES.insights,
});

interface PageProps {
  searchParams: Promise<{ category?: string }>;
}

function isCategory(value: string | undefined): value is InsightCategory {
  return Boolean(value && (INSIGHT_CATEGORIES as readonly string[]).includes(value));
}

export default async function InsightsPage({ searchParams }: PageProps) {
  const { category: raw } = await searchParams;
  const category = isCategory(raw) ? raw : undefined;

  const [page, media] = await Promise.all([
    getInsights({ category, pageSize: 24 }),
    getMediaLookup(),
  ]);
  const crumbs = crumbsFromPath(ROUTES.insights);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        eyebrow="INSIGHTS & NEWS"
        title="洞察与动态"
        subtitle={DESCRIPTION}
        media={media.get('stock-insights')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-labelledby="insights-list-title">
        <div className="container">
          <h2 id="insights-list-title" className="visually-hidden">
            文章列表
          </h2>

          <Reveal>
            <nav
              aria-label="按分类筛选"
              style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 44 }}
            >
              <Link
                href={ROUTES.insights}
                className={category ? 'btn-text' : 'solution-code'}
                aria-current={category ? undefined : 'page'}
              >
                全部（{page.total}）
              </Link>
              {INSIGHT_CATEGORIES.map((item) => (
                <Link
                  key={item}
                  href={`${ROUTES.insights}?category=${item}`}
                  className={category === item ? 'solution-code' : 'btn-text'}
                  aria-current={category === item ? 'page' : undefined}
                >
                  {CATEGORY_LABELS[item]}
                </Link>
              ))}
            </nav>
          </Reveal>

          {page.items.length === 0 ? (
            <Reveal>
              <p className="section-desc">该分类下暂无文章，请查看其他分类。</p>
            </Reveal>
          ) : (
            <div className="card-grid">
              {page.items.map((item) => (
                <Reveal key={item.slug} as="article" className="card">
                  <Link href={item.href} style={{ display: 'contents' }}>
                    <div className="card-media">
                      <MediaFill
                        asset={media.get(item.heroMedia)}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    </div>
                    <div className="card-body">
                      <div className="card-eyebrow">
                        {formatDate(item.publishedAt)} · {item.categoryLabel}
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.excerpt}</p>
                      <span className="card-foot">
                        阅读全文（{formatReading(item.readingMinutes)}）{' '}
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
