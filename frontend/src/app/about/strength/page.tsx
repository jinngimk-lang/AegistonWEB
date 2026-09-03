import type { Metadata } from 'next';

import { FeatureGrid } from '@/components/content/FeatureGrid';
import { CtaBand } from '@/components/sections/CtaBand';
import { MetricBand } from '@/components/sections/MetricBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Callout } from '@/components/ui/Callout';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getAbout } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getAbout();
  return pageMetadata({
    title: '科研实力与知识产权',
    description: data.strengthLead,
    path: ROUTES.aboutStrength,
  });
}

export default async function StrengthPage() {
  const [data, media] = await Promise.all([getAbout(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.aboutStrength);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        eyebrow="RESEARCH STRENGTH"
        title={data.strengthTitle}
        subtitle={data.strengthLead}
        media={media.get('stock-research')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-label="科研实力">
        <div className="container">
          <FeatureGrid items={data.strength} cols={3} />
          <Reveal delay={1}>
            <div style={{ marginTop: 40 }}>
              <Callout tone="neutral" title="口径说明">
                <p>
                  「网络空间安全学科连续四年处于全国顶尖水平、人工智能排名全国前三」是西安电子科技大学的学科评估结果，归属该校，非本公司排名。
                </p>
                <p>
                  本页列出的专利、软件著作权与科技奖项分别归属团队与创始人个人，已在各条目中注明归属。
                </p>
              </Callout>
            </div>
            <SourceNote slides={[88, 89, 93]} />
          </Reveal>
        </div>
      </section>

      <MetricBand metrics={data.metrics} />

      <CtaBand cta={data.cta} />
    </>
  );
}
