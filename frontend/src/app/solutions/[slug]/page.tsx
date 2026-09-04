import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CaseMetrics } from '@/components/content/CaseMetrics';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Callout } from '@/components/ui/Callout';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getSolution } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES, SOLUTION_SLUGS, type SolutionSlug } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

function isSolutionSlug(value: string): value is SolutionSlug {
  return (SOLUTION_SLUGS as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isSolutionSlug(slug)) return {};
  const data = await getSolution(slug);
  return pageMetadata({
    title: `${data.industry} · ${data.customer}`,
    description: data.lead,
    path: ROUTES.solutionDetail(slug),
  });
}

export default async function SolutionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isSolutionSlug(slug)) notFound();

  const [data, media] = await Promise.all([getSolution(slug), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.solutionDetail(slug));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        eyebrow={data.eyebrow}
        title={data.customer}
        subtitle={data.lead}
        media={media.get(data.heroMedia)}
        meta={[
          { key: '行业', value: data.industry },
          { key: '部署', value: data.deployment.split('，')[0] ?? data.deployment },
        ]}
      />
      <Breadcrumbs items={crumbs} />

      {data.metrics.length > 0 ? (
        <section className="section" aria-label="效能指标" style={{ paddingBottom: 0 }}>
          <div className="container">
            <CaseMetrics metrics={data.metrics} />
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="detail-title">
        <div className="container">
          <Reveal>
            <div className="section-label">HOW IT LANDS</div>
            <h2 className="section-title" id="detail-title" style={{ marginBottom: 40 }}>
              落地细节
            </h2>
          </Reveal>

          <Reveal delay={1}>
            <dl className="deflist">
              <dt>部署形态</dt>
              <dd>{data.deployment}</dd>

              <dt>覆盖范围</dt>
              <dd>
                <ul>
                  {data.scope.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>

              <dt>使用方式</dt>
              <dd>
                <ul>
                  {data.workflow.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>

              <dt>{data.closureTitle}</dt>
              <dd>
                <ul>
                  {data.closure.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </dd>
            </dl>
          </Reveal>
        </div>
      </section>

      {data.difficulty.length > 0 || data.assets.length > 0 ? (
        <section className="section section-gray" aria-labelledby="depth-title">
          <div className="container">
            <Reveal className="solutions-intro">
              <div className="section-label">DOMAIN DEPTH</div>
              <h2 className="section-title" id="depth-title">
                场景为什么难，
                <br />
                <span className="em">以及沉淀下来了什么</span>
              </h2>
            </Reveal>

            <div className="split">
              <Reveal>
                <h3
                  style={{
                    fontFamily: 'var(--serif-cn)',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--navy)',
                    marginBottom: 18,
                  }}
                >
                  场景为什么难
                </h3>
                <ul className="pillar-params">
                  {data.difficulty.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Reveal>
              <Reveal delay={1}>
                <h3
                  style={{
                    fontFamily: 'var(--serif-cn)',
                    fontSize: 20,
                    fontWeight: 700,
                    color: 'var(--navy)',
                    marginBottom: 18,
                  }}
                >
                  沉淀下来的领域资产
                </h3>
                <ul className="pillar-params">
                  {data.assets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>
      ) : null}

      <section className="section" aria-label="落地要点与数据口径">
        <div className="container">
          <Reveal>
            <Callout title="落地要点">
              <p>{data.takeaway}</p>
            </Callout>
          </Reveal>

          <Reveal delay={2}>
            <SourceNote slides={data.sourceSlides} />
            {data.relatedProduct ? (
              <p style={{ marginTop: 20 }}>
                <Link href={`/products/${data.relatedProduct}`} className="btn-text">
                  查看支撑该场景的产品 <span aria-hidden="true">→</span>
                </Link>
              </p>
            ) : null}
          </Reveal>
        </div>
      </section>

      <CtaBand cta={data.cta} />
    </>
  );
}
