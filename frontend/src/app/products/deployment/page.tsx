import type { Metadata } from 'next';

import { FeatureGrid } from '@/components/content/FeatureGrid';
import { MediaFill } from '@/components/media/MediaFill';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Callout } from '@/components/ui/Callout';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getDeployment } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getDeployment();
  return pageMetadata({
    title: data.title,
    description: data.lead,
    path: ROUTES.productsDeployment,
  });
}

export default async function DeploymentPage() {
  const [data, media] = await Promise.all([getDeployment(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.productsDeployment);

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

      <section className="section" aria-labelledby="policy-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">COMPLIANCE</div>
            <h2 className="section-title" id="policy-title">
              政策与合规
              <br />
              <span className="em">准入门槛</span>
            </h2>
            <p className="section-desc">目标客户的第一道门槛是数据是否出域。</p>
          </Reveal>
          <FeatureGrid items={data.policy} cols={3} />
        </div>
      </section>

      <section className="section section-gray" aria-labelledby="readiness-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">READINESS</div>
            <h2 className="section-title" id="readiness-title">
              技术前提
              <br />
              <span className="em">已经具备</span>
            </h2>
            <p className="section-desc">「私有化」已从技术妥协，变成可行的产品形态。</p>
          </Reveal>
          <FeatureGrid items={data.readiness} cols={4} />
        </div>
      </section>

      <section className="section" aria-labelledby="forms-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">DELIVERY FORMS</div>
            <h2 className="section-title" id="forms-title">
              三种交付形态
            </h2>
          </Reveal>

          {data.forms.map((form, index) => (
            <div className="solution" key={form.index}>
              <Reveal className="solution-body">
                <div className="tag-line">
                  <span className="solution-code">形态 {form.index}</span>
                  <span className="solution-category">{form.fit}</span>
                </div>
                <h3>{form.name}</h3>
                <ul className="pillar-params" style={{ marginTop: 20, marginBottom: 28 }}>
                  {form.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <dl className="deflist">
                  <dt>适用</dt>
                  <dd>{form.fit}</dd>
                </dl>
              </Reveal>
              <Reveal className="solution-visual" delay={1}>
                <MediaFill asset={media.get(form.media)} />
                <span className="vlabel">
                  DELIVERY {form.index} / {index === 0 ? 'ON-PREMISE' : index === 1 ? 'APPLIANCE' : 'PRIVATE CLOUD'}
                </span>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      <section className="section section-gray" aria-label="交付现场的现实约束">
        <div className="container">
          <Reveal>
            <Callout title="交付现场的三重现实约束">
              <p>{data.conclusion}</p>
            </Callout>
            <SourceNote slides={data.sourceSlides} />
          </Reveal>
        </div>
      </section>

      <CtaBand cta={data.cta} />
    </>
  );
}
