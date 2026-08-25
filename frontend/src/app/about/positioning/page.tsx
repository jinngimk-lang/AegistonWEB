import type { Metadata } from 'next';
import Link from 'next/link';

import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
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
    title: '公司定位与三层产品底座',
    description: data.positioningLead,
    path: ROUTES.aboutPositioning,
  });
}

export default async function PositioningPage() {
  const [data, media] = await Promise.all([getAbout(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.aboutPositioning);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        eyebrow="POSITIONING"
        title={data.positioningTitle}
        subtitle={data.positioningLead}
        media={media.get('stock-products')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-labelledby="positioning-body">
        <div className="container">
          <Reveal>
            <p
              className="section-desc"
              style={{ maxWidth: 900, marginTop: 0 }}
              id="positioning-body"
            >
              {data.positioningBody}
            </p>
          </Reveal>
        </div>
      </section>

      <section className="section section-gray" aria-labelledby="tiers-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">THREE TIERS</div>
            <h2 className="section-title" id="tiers-title">
              三层产品底座
            </h2>
          </Reveal>
          <div className="card-grid">
            {data.tiers.map((tier) => (
              <Reveal key={tier.href} as="article" className="card">
                <Link href={tier.href} style={{ display: 'contents' }}>
                  <div className="card-body">
                    <div className="card-eyebrow">{tier.tier}</div>
                    <h3>{tier.name}</h3>
                    <p>为客户提供三层产品的完整能力，能力在三层之间流动。</p>
                    <span className="card-foot">
                      查看产品 <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal delay={1}>
            <SourceNote slides={[13, 93]} />
          </Reveal>
        </div>
      </section>

      <CtaBand cta={data.cta} />
    </>
  );
}
