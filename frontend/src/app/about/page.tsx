import type { Metadata } from 'next';
import Link from 'next/link';

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

const QUICK_LINKS = [
  {
    href: ROUTES.aboutPositioning,
    title: '公司定位与三层底座',
    desc: '「AI+」企业智能化赋能与安全保障专家，以组织级、通用级、行业级三层产品构成同一套企业智能底座。',
  },
  {
    href: ROUTES.aboutTeam,
    title: '研发团队',
    desc: '由西安电子科技大学的 20 多名博士与硕士研究生组成，创始人为该校教授、博导。',
  },
  {
    href: ROUTES.aboutStrength,
    title: '科研实力与知识产权',
    desc: '教育部创新团队与工程研究中心依托，专利 100 多项，10 余篇网络安全与软件工程国际顶会论文。',
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const data = await getAbout();
  return pageMetadata({ title: '公司简介', description: data.lead, path: ROUTES.about });
}

export default async function AboutPage() {
  const [data, media] = await Promise.all([getAbout(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.about);

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

      <section className="section" aria-labelledby="intro-title">
        <div className="container">
          <div className="split-narrow">
            <Reveal>
              <div className="section-label">COMPANY</div>
              <h2 className="section-title" id="intro-title">
                公司简介
              </h2>
              <p className="section-desc">{data.focus}</p>
            </Reveal>
            <Reveal delay={1}>
              <p className="section-desc" style={{ marginTop: 0, maxWidth: 'none' }}>
                {data.intro}
              </p>
              <dl className="deflist" style={{ marginTop: 32 }}>
                {data.facts.map((fact) => (
                  <div key={fact.label} style={{ display: 'contents' }}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.body}</dd>
                  </div>
                ))}
              </dl>
              <SourceNote slides={data.sourceSlides} />
            </Reveal>
          </div>
        </div>
      </section>

      <MetricBand metrics={data.metrics} />

      <section className="section section-gray" aria-labelledby="quicklinks-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">MORE ABOUT US</div>
            <h2 className="section-title" id="quicklinks-title">
              更多关于我们
            </h2>
          </Reveal>
          <div className="card-grid">
            {QUICK_LINKS.map((item) => (
              <Reveal key={item.href} as="article" className="card">
                <Link href={item.href} style={{ display: 'contents' }}>
                  <div className="card-body">
                    <div className="card-eyebrow">ABOUT</div>
                    <h3>{item.title}</h3>
                    <p>{item.desc}</p>
                    <span className="card-foot">
                      了解详情 <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
          <Reveal delay={1}>
            <div style={{ marginTop: 40 }}>
              <Callout tone="neutral">
                页面中的「网络空间安全学科全国顶尖」为高校学科评估结果，归属西安电子科技大学，非本公司排名。
              </Callout>
            </div>
          </Reveal>
        </div>
      </section>

      <CtaBand cta={data.cta} />
    </>
  );
}
