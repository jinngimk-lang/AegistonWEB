import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { FeatureGrid } from '@/components/content/FeatureGrid';
import { LegalLensArchitecture } from '@/components/content/LegalLensArchitecture';
import { PillarCard } from '@/components/content/PillarCard';
import { ScreenGallery } from '@/components/media/ScreenGallery';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getMediaManifest, getProduct, getResearch } from '@/lib/api';
import { getMediaLookup } from '@/lib/media';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/jsonld';
import { PRODUCT_SLUGS, ROUTES, type ProductSlug } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';
import type { MediaAsset, ProductDetail } from '@/types/content';

export const revalidate = 600;

const PRODUCT_DISPLAY_NAMES: Partial<Record<ProductSlug, string>> = {
  aragonteam: 'AegistonTeam',
  inkclaw: 'AegistonClaw',
  legallens: 'AegistonLens',
};

function productDisplayName(slug: ProductSlug, fallback: string): string {
  return PRODUCT_DISPLAY_NAMES[slug] ?? fallback;
}

function productDisplayText(slug: ProductSlug, value: string): string {
  if (slug === 'aragonteam') return value.replaceAll('AragonTeam', 'AegistonTeam');
  if (slug === 'inkclaw') return value.replaceAll('InkClaw', 'AegistonClaw');
  if (slug === 'legallens') {
    return value
      .replaceAll('LegalLens 合约智审', 'AegistonLens')
      .replaceAll('LegalLens', 'AegistonLens');
  }
  return value;
}

function productForDisplay(slug: ProductSlug, product: ProductDetail): ProductDetail {
  const displayName = productDisplayName(slug, product.nameEn);
  if (displayName === product.nameEn) return product;
  return JSON.parse(
    JSON.stringify(product).replaceAll(product.nameEn, displayName),
  ) as ProductDetail;
}

/**
 * ⚠️ 只展开三个产品 slug。`/products/deployment` 是**静态路由**，在
 * `src/app/products/deployment/page.tsx`，绝不能混进这里当第四个 slug
 * （spec §7.2 注 1 第 4 点）。
 */
export function generateStaticParams() {
  return PRODUCT_SLUGS.map((slug) => ({ slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

function isProductSlug(value: string): value is ProductSlug {
  return (PRODUCT_SLUGS as readonly string[]).includes(value);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isProductSlug(slug)) return {};
  const sourceProduct = await getProduct(slug);
  const product = productForDisplay(slug, sourceProduct);
  const displayName = product.nameEn;
  return pageMetadata({
    title: slug === 'legallens' ? displayName : `${displayName} · ${product.nameCn}`,
    description: product.positioning,
    path: ROUTES.productDetail(slug),
  });
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isProductSlug(slug)) notFound();

  const showsDeliveryComparison = slug === 'aragonteam' || slug === 'inkclaw' || slug === 'legallens';
  const [sourceProduct, manifest, media, research] = await Promise.all([
    getProduct(slug),
    getMediaManifest(),
    getMediaLookup(),
    getResearch(),
  ]);
  const product = productForDisplay(slug, sourceProduct);
  const displayName = product.nameEn;
  const displayLabel = displayName;
  const displayProduct = product;
  const productStructuredData = productJsonLd(displayProduct);
  if (slug === 'legallens') productStructuredData.name = displayName;

  const assets: Record<string, MediaAsset> = {};
  for (const asset of manifest.assets) {
    const alt = productDisplayText(slug, asset.alt);
    const caption = asset.caption ? productDisplayText(slug, asset.caption) : asset.caption;
    assets[asset.id] =
      alt === asset.alt && caption === asset.caption ? asset : { ...asset, alt, caption };
  }

  const pillars = research.pillars
    .filter((p) => product.pillars.includes(p.id))
    .map((pillar) => ({
      ...pillar,
      productLabel: productDisplayText(slug, pillar.productLabel),
    }));
  const crumbs = crumbsFromPath(ROUTES.productDetail(slug), displayLabel);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([productStructuredData, breadcrumbJsonLd(crumbs)]),
        }}
      />

      <PageHero
        eyebrow={product.tierLabel}
        title={slug === 'legallens' ? displayName : `${displayName} ${product.nameCn}`}
        subtitle={product.tagline}
        media={media.get(product.heroMedia)}
        meta={[
          { key: '定位', value: product.tierLabel },
          { key: '交付', value: product.delivery[0]?.split('：')[0] ?? '私有化' },
          { key: '界面导览', value: `${product.screens.length} 屏真实截图` },
        ]}
      />
      <Breadcrumbs items={crumbs} />

      {/* 定位 */}
      <section className="section" aria-labelledby="positioning-title">
        <div className="container">
          <div className="split">
            <Reveal>
              <div className="section-label">POSITIONING</div>
              <h2 className="section-title" id="positioning-title">
                产品定位
              </h2>
            </Reveal>
            <Reveal delay={1}>
              <p className="section-desc" style={{ maxWidth: 'none', marginTop: 0 }}>
                {product.positioning}
              </p>
              <SourceNote slides={product.sourceSlides.slice(0, 6)} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 背景 · 困境 / 风险 */}
      {product.background.length > 0 ? (
        <section className="section section-gray" aria-labelledby="background-title">
          <div className="container">
            <Reveal className="solutions-intro">
              <div className="section-label">BACKGROUND</div>
              <h2 className="section-title" id="background-title">
                {slug === 'inkclaw' ? '先要堵住的边界风险' : '要解决的困境'}
              </h2>
            </Reveal>
            <FeatureGrid
              items={product.background}
              cols={product.background.length >= 5 ? 3 : 4}
            />
          </div>
        </section>
      ) : null}

      {/* 核心价值 */}
      {product.coreValues.length > 0 ? (
        <section className="section" aria-labelledby="values-title">
          <div className="container">
            <Reveal className="solutions-intro">
              <div className="section-label">CORE VALUE</div>
              <h2 className="section-title" id="values-title">
                核心价值 · {product.coreValues.length} 条
              </h2>
            </Reveal>
            <FeatureGrid items={product.coreValues} cols={3} />
          </div>
        </section>
      ) : null}

      {/* 数据条 */}
      {product.highlights.length > 0 ? (
        <section className="metrics" aria-label="关键工程参数">
          <div className="container">
            <div className="metrics-grid">
              {product.highlights.map((metric) => (
                <Reveal className="metric" key={metric.label}>
                  <div className="metric-num">
                    {metric.value}
                    {metric.unit ? <span className="unit">{metric.unit}</span> : null}
                  </div>
                  <div className="metric-label">{metric.label}</div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* 功能矩阵 */}
      {product.featureGroups.length > 0 ? (
        <section className="section section-gray" aria-labelledby="features-title">
          <div className="container">
            <Reveal className="solutions-intro">
              <div className="section-label">CAPABILITIES</div>
              <h2 className="section-title" id="features-title">
                主要功能
              </h2>
            </Reveal>
            {product.featureGroups.map((group) => (
              <div key={group.title} style={{ marginBottom: 48 }}>
                <Reveal>
                  <h3
                    style={{
                      fontFamily: 'var(--serif-cn)',
                      fontSize: 21,
                      fontWeight: 700,
                      color: 'var(--navy)',
                      marginBottom: 20,
                    }}
                  >
                    {group.title}
                    {group.countLabel ? (
                      <span
                        style={{
                          fontFamily: 'var(--sans-en)',
                          fontSize: 12,
                          letterSpacing: '.2em',
                          color: 'var(--red)',
                          marginLeft: 14,
                        }}
                      >
                        {group.countLabel}
                      </span>
                    ) : null}
                  </h3>
                </Reveal>
                <FeatureGrid items={group.items} cols={group.items.length >= 4 ? 4 : 2} />
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* AegistonTeam / AegistonClaw / AegistonLens 共用嵌入版交付形态对比图 */}
      {showsDeliveryComparison ? (
        <section className="section section-gray" aria-label="三种交付形态">
          <div className="container">
            <img
              src="/media/deployment/aegiston-delivery-forms-comparison-embed.svg"
              alt="Aegiston 三种交付形态对比"
              width={1400}
              height={1050}
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </section>
      ) : null}

      {/* 系统总体架构（仅合约智审：PPT p.65 的 EMF 图用内联 SVG 重绘） */}
      {slug === 'legallens' ? (
        <section className="section" aria-labelledby="architecture-title">
          <div className="container">
            <Reveal className="solutions-intro">
              <div className="section-label">ARCHITECTURE</div>
              <h2 className="section-title" id="architecture-title">
                系统总体架构
              </h2>
              <p className="section-desc">
                系统分为基础、技术、核心服务和应用四层。原图为 EMF
                矢量，本页用内联 SVG 重绘，以获得响应式与无障碍支持。
              </p>
            </Reveal>
            <Reveal delay={1}>
              <LegalLensArchitecture />
              <SourceNote slides={[65]} />
            </Reveal>
          </div>
        </section>
      ) : null}

      {/* 界面导览 —— 真实软件截图（G4） */}
      {product.screens.length > 0 ? (
        <section className="section section-gray" aria-labelledby="screens-title">
          <div className="container">
            <Reveal className="solutions-intro">
              <div className="section-label">PRODUCT TOUR</div>
              <h2 className="section-title" id="screens-title">
                界面导览
                <br />
                <span className="em">{product.screens.length} 屏真实产品截图</span>
              </h2>
              <p className="section-desc">
                以下全部为产品的真实界面截图，点击任意截图可放大查看。
              </p>
            </Reveal>
            <ScreenGallery
              sections={product.screens}
              assets={assets}
              vlabelPrefix={displayLabel.toUpperCase()}
            />
          </div>
        </section>
      ) : null}

      {/* 核心技术 */}
      {pillars.length > 0 ? (
        <section className="section" aria-labelledby="pillars-title">
          <div className="container">
            <Reveal className="solutions-intro">
              <div className="section-label">CORE TECHNOLOGY</div>
              <h2 className="section-title" id="pillars-title">
                支撑这套产品的核心技术
              </h2>
            </Reveal>
            <div className="pillar-list">
              {pillars.map((pillar) => (
                <PillarCard key={pillar.id} pillar={pillar} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <CtaBand cta={product.cta} />
    </>
  );
}
