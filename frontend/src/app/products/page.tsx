import type { Metadata } from 'next';
import Link from 'next/link';

import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { CapabilityMatrix } from '@/components/content/CapabilityMatrix';
import { FeatureGrid } from '@/components/content/FeatureGrid';
import { MediaFill } from '@/components/media/MediaFill';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getProducts } from '@/lib/api';
import { getMediaLookup } from '@/lib/media';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const data = await getProducts();
  return pageMetadata({
    title: data.title,
    description: data.description,
    path: ROUTES.products,
  });
}

export default async function ProductsPage() {
  const [data, media] = await Promise.all([getProducts(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.products);

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
        media={media.get('stock-products')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-label="三层产品">
        <div className="container">
          {data.products.map((product, index) => (
            <div className="solution" key={product.slug} id={product.slug}>
              <Reveal className="solution-body">
                <div className="tag-line">
                  <span className="solution-code">
                    {product.tierLabel} · 0{index + 1}
                  </span>
                  <span className="solution-category">{product.audience}</span>
                </div>
                <h2>{product.nameEn}</h2>
                <span className="solution-en">{product.nameCn}</span>
                <p className="solution-desc">{product.positioning}</p>
                <div className="solution-points">
                  {product.capabilities.slice(0, 4).map((capability) => (
                    <div className="solution-point" key={capability}>
                      <svg
                        className="check"
                        viewBox="0 0 18 18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        aria-hidden="true"
                      >
                        <path d="M3 9 L7 13 L15 5" />
                      </svg>
                      <span>{capability}</span>
                    </div>
                  ))}
                </div>
                <dl className="deflist" style={{ marginBottom: 28 }}>
                  <dt>关键差异</dt>
                  <dd>{product.differentiator}</dd>
                  <dt>客户价值</dt>
                  <dd>{product.customerValue}</dd>
                  <dt>交付形态</dt>
                  <dd>{product.delivery}</dd>
                </dl>
                <div className="solution-actions">
                  <Link href={product.href} className="btn btn-primary btn-compact">
                    查看产品详情
                    <span className="arrow" aria-hidden="true">
                      →
                    </span>
                  </Link>
                  <Link href={`${ROUTES.contact}?intent=demo&product=${product.slug}`} className="btn-text">
                    预约演示 <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <SourceNote slides={product.sourceSlides} />
              </Reveal>

              <Reveal className="solution-visual" delay={1}>
                <MediaFill asset={media.get(product.heroMedia)} />
                <span className="vlabel">
                  {product.nameEn.toUpperCase()} / {product.tierLabel}
                </span>
              </Reveal>
            </div>
          ))}
        </div>
      </section>

      {data.capabilityMatrix ? (
        <section className="section section-gray" aria-labelledby="matrix-title">
          <div className="container">
            <Reveal className="section-head">
              <div className="section-head-left">
                <div className="section-label">CAPABILITY MATRIX</div>
                <h2 className="section-title" id="matrix-title">
                  {data.capabilityMatrix.title}
                </h2>
                {data.capabilityMatrix.description ? (
                  <p className="section-desc">{data.capabilityMatrix.description}</p>
                ) : null}
              </div>
            </Reveal>
            <CapabilityMatrix
              matrix={data.capabilityMatrix}
              productNames={data.products.map((product) => ({
                slug: product.slug,
                name: product.nameEn,
                tierLabel: product.tierLabel,
              }))}
            />
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="foundation-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">SHARED FOUNDATION</div>
            <h2 className="section-title" id="foundation-title">
              {data.foundationTitle}
            </h2>
            <p className="section-desc">{data.foundationDesc}</p>
          </Reveal>
          <FeatureGrid items={data.foundation} cols={4} />
          <Reveal>
            <p className="section-desc" style={{ marginTop: 32, maxWidth: 820 }}>
              {data.footnote}
            </p>
            <SourceNote slides={data.sourceSlides} />
          </Reveal>
        </div>
      </section>

      <CtaBand cta={data.cta} />
    </>
  );
}
