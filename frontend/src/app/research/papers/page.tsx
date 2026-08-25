import type { Metadata } from 'next';

import { PaperCard } from '@/components/content/PaperCard';
import { CtaBand } from '@/components/sections/CtaBand';
import { MetricBand } from '@/components/sections/MetricBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Callout } from '@/components/ui/Callout';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getPapers } from '@/lib/api';
import { breadcrumbJsonLd, scholarlyJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getPapers();
  return pageMetadata({
    title: data.title,
    description: data.description,
    path: ROUTES.researchPapers,
  });
}

export default async function PapersPage() {
  const [data, media] = await Promise.all([getPapers(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.researchPapers);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([
            breadcrumbJsonLd(crumbs),
            ...data.papers.map((paper) => scholarlyJsonLd(paper)),
          ]),
        }}
      />
      <PageHero
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.description}
        media={media.get('stock-research')}
      />
      <Breadcrumbs items={crumbs} />

      <MetricBand metrics={data.highlights} />

      <section className="section" aria-label="论文列表">
        <div className="container">
          <div className="paper-grid">
            {data.papers.map((paper) => (
              <PaperCard key={paper.id} paper={paper} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section-gray" aria-label="数据口径">
        <div className="container">
          <Reveal>
            <Callout tone="neutral">{data.footnote}</Callout>
            <SourceNote slides={data.sourceSlides} />
          </Reveal>
        </div>
      </section>

      <CtaBand cta={data.cta} />
    </>
  );
}
