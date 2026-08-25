import type { Metadata } from 'next';

import { FeatureGrid } from '@/components/content/FeatureGrid';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Callout } from '@/components/ui/Callout';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getCareers, getSiteSettings } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getCareers();
  return pageMetadata({ title: '加入我们', description: data.lead, path: ROUTES.careers });
}

export default async function CareersPage() {
  const [data, settings, media] = await Promise.all([
    getCareers(),
    getSiteSettings(),
    getMediaLookup(),
  ]);
  const crumbs = crumbsFromPath(ROUTES.careers);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        eyebrow={data.eyebrow}
        title={data.title}
        subtitle={data.lead}
        media={media.get(data.heroMedia)}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-labelledby="why-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">WHY US</div>
            <h2 className="section-title" id="why-title">
              为什么值得来
            </h2>
          </Reveal>
          <FeatureGrid items={data.why} cols={4} />
        </div>
      </section>

      <section className="section section-gray" aria-labelledby="openings-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">OPEN ROLES</div>
            <h2 className="section-title" id="openings-title">
              在招方向
            </h2>
          </Reveal>
          <FeatureGrid items={data.openings} cols={3} />
        </div>
      </section>

      <section className="section" aria-labelledby="process-title">
        <div className="container">
          <div className="split-narrow">
            <Reveal>
              <div className="section-label">PROCESS</div>
              <h2 className="section-title" id="process-title">
                应聘流程
              </h2>
            </Reveal>
            <Reveal delay={1}>
              <ul className="pillar-params">
                {data.process.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
              <div style={{ marginTop: 28 }}>
                <Callout title="投递方式">
                  <p>{data.contactNote}</p>
                  <p>
                    招聘邮箱：
                    <a href={`mailto:${settings.contact.careersEmail}`}>
                      {settings.contact.careersEmail}
                    </a>
                  </p>
                </Callout>
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
