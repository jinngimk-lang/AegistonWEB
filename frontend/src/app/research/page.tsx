import type { Metadata } from 'next';
import Link from 'next/link';

import { PillarCard } from '@/components/content/PillarCard';
import { CtaBand } from '@/components/sections/CtaBand';
import { MetricBand } from '@/components/sections/MetricBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Callout } from '@/components/ui/Callout';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getResearch } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getResearch();
  return pageMetadata({ title: data.title, description: data.description, path: ROUTES.research });
}

export default async function ResearchPage() {
  const [data, media] = await Promise.all([getResearch(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.research);
  const groups = ['aragonteam', 'inkclaw', 'legallens'] as const;

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
        media={media.get(data.heroMedia)}
      />
      <Breadcrumbs items={crumbs} />

      <MetricBand metrics={data.highlights} labelledBy={undefined} />

      {groups.map((product, groupIndex) => {
        const pillars = data.pillars.filter((p) => p.product === product);
        if (pillars.length === 0) return null;
        const label = pillars[0]?.productLabel ?? product;
        return (
          <section
            key={product}
            className={groupIndex % 2 === 0 ? 'section' : 'section section-gray'}
            aria-labelledby={`pillars-${product}`}
          >
            <div className="container">
              <Reveal className="solutions-intro">
                <div className="section-label">{product.toUpperCase()}</div>
                <h2 className="section-title" id={`pillars-${product}`}>
                  {label}
                </h2>
              </Reveal>
              <div className="pillar-list">
                {pillars.map((pillar) => (
                  <PillarCard key={pillar.id} pillar={pillar} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="section" aria-label="口径说明">
        <div className="container">
          <Reveal>
            <Callout tone="neutral" title="技术模块口径说明">
              <p>{data.footnote}</p>
            </Callout>
            <SourceNote slides={data.sourceSlides} />
            <p style={{ marginTop: 20 }}>
              <Link href={ROUTES.researchPapers} className="btn-text">
                查看学术成果（5 篇论文） <span aria-hidden="true">→</span>
              </Link>
            </p>
          </Reveal>
        </div>
      </section>

      <CtaBand cta={data.cta} />
    </>
  );
}
