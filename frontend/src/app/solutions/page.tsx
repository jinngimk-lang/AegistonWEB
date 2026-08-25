import type { Metadata } from 'next';
import Link from 'next/link';

import { MediaFill } from '@/components/media/MediaFill';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Callout } from '@/components/ui/Callout';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getSolutions } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSolutions();
  return pageMetadata({ title: data.title, description: data.description, path: ROUTES.solutions });
}

export default async function SolutionsPage() {
  const [data, media] = await Promise.all([getSolutions(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.solutions);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.description}
        media={media.get('stock-telecom')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-labelledby="partner-title">
        <div className="container">
          <div className="split-narrow">
            <Reveal>
              <div className="section-label">STRATEGIC PARTNER</div>
              <h2 className="section-title" id="partner-title">
                {data.partnerTitle}
              </h2>
            </Reveal>
            <Reveal delay={1}>
              <p
                style={{
                  fontFamily: 'var(--serif-cn)',
                  fontSize: 22,
                  fontWeight: 700,
                  color: 'var(--navy)',
                  marginBottom: 12,
                }}
              >
                {data.partnerName}
              </p>
              <p className="section-desc" style={{ marginTop: 0, maxWidth: 'none' }}>
                {data.partnerDesc}
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section section-gray" aria-labelledby="cases-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">CASES</div>
            <h2 className="section-title" id="cases-title">
              四个行业的
              <br />
              <span className="em">落地客户</span>
            </h2>
          </Reveal>

          <div className="card-grid" data-cols="2">
            {data.solutions.map((solution) => (
              <Reveal key={solution.slug} as="article" className="card">
                <Link href={solution.href} style={{ display: 'contents' }}>
                  <div className="card-media">
                    <MediaFill
                      asset={media.get(solution.heroMedia)}
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  <div className="card-body">
                    <div className="card-eyebrow">
                      {solution.industry} · {solution.deployment}
                    </div>
                    <h3>{solution.customer}</h3>
                    <p>{solution.summary}</p>
                    {solution.headlineMetrics.length > 0 ? (
                      <div className="pillar-highlights" style={{ marginTop: 20, paddingTop: 18 }}>
                        {solution.headlineMetrics.map((metric) => (
                          <div className="pillar-highlight" key={metric.label}>
                            <div className="v">
                              {metric.value}
                              {metric.unit ? <span> {metric.unit}</span> : null}
                            </div>
                            <div className="l">{metric.label}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <span className="card-foot">
                      查看案例 <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="method-title">
        <div className="container">
          <div className="split-narrow">
            <Reveal>
              <div className="section-label">METHOD</div>
              <h2 className="section-title" id="method-title">
                同一套实施方法
              </h2>
              <p className="section-desc">
                模型能力可以采购，一个行业签合同的方式采购不到。
              </p>
            </Reveal>
            <Reveal delay={1}>
              <ul className="pillar-params">
                {data.method.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <div style={{ marginTop: 28 }}>
                <Callout tone="neutral">{data.footnote}</Callout>
              </div>
              <SourceNote slides={data.sourceSlides} />
            </Reveal>
          </div>
        </div>
      </section>

      <CtaBand cta={data.cta} />
    </>
  );
}
