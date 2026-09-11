import type { Metadata } from 'next';

import { CtaBand } from '@/components/sections/CtaBand';
import { MetricBand } from '@/components/sections/MetricBand';
import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Reveal } from '@/components/ui/Reveal';
import { SourceNote } from '@/components/ui/SourceNote';
import { getTeam } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

const TEAM_MEMBERS_INTRO =
  '公司依托西安电子科技大学雄厚的科研实力（网络空间安全学科连续四年排名全国第一，人工智能排名全国前三），拥有一支由20多名博士、硕士组成的一流研发队伍，已形成三十余项自主知识产权的核心技术，是一家专注于人工智能与网络安全领域的产品和解决方案供应商。';

export async function generateMetadata(): Promise<Metadata> {
  const data = await getTeam();
  return pageMetadata({ title: '研发团队', description: data.lead, path: ROUTES.aboutTeam });
}

export default async function TeamPage() {
  const [data, media] = await Promise.all([getTeam(), getMediaLookup()]);
  const crumbs = crumbsFromPath(ROUTES.aboutTeam);

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

      <section className="section" aria-labelledby="origin-title">
        <div className="container">
          <div className="split-narrow">
            <Reveal>
              <div className="section-label">ORIGIN</div>
              <h2 className="section-title" id="origin-title">
                团队来源与依托
              </h2>
            </Reveal>
            <Reveal delay={1}>
              <ul className="pillar-params">
                {data.origin.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <SourceNote slides={[88]} />
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section section-gray" aria-labelledby="leader-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">FOUNDER</div>
            <h2 className="section-title" id="leader-title">
              团队负责人
            </h2>
          </Reveal>

          <Reveal as="article" className="pillar">
            <div className="pillar-head">
              <div>
                <h3>
                  {data.leader.name}
                  <span
                    style={{
                      fontFamily: 'var(--sans-en)',
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'var(--navy-2)',
                      marginLeft: 14,
                      letterSpacing: '.06em',
                    }}
                  >
                    {data.leader.role}
                  </span>
                </h3>
              </div>
            </div>

            <div className="pillar-rows" style={{ rowGap: 12 }}>
              {data.leader.degree ? (
                <div className="pillar-row" style={{ gridColumn: '1 / -1' }}>
                  <span className="pillar-tag" style={{ display: 'inline-block' }}>
                    {data.leader.degree}
                  </span>
                </div>
              ) : null}
              <div className="pillar-row">
                <ul className="pillar-params">
                  {data.leader.bio.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
              <div className="pillar-row">
                <ul className="pillar-params">
                  {data.leader.highlights.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" aria-labelledby="members-title">
        <div className="container">
          <Reveal className="solutions-intro">
            <div className="section-label">CORE MEMBERS</div>
            <h2 className="section-title" id="members-title">
              技术团队与核心人员
            </h2>
            <p
              className="section-desc"
              style={{ maxWidth: 920, fontSize: 14, lineHeight: 1.9 }}
            >
              {TEAM_MEMBERS_INTRO}
            </p>
          </Reveal>

          <div className="card-grid" data-cols="2">
            {data.members.map((member) => (
              <Reveal key={member.name} as="article" className="card">
                <div className="card-body">
                  <div className="card-eyebrow">{member.degree ?? '核心成员'}</div>
                  <h3>{member.name}</h3>
                  <p style={{ color: 'var(--navy-2)', fontWeight: 500, flex: 'none', marginBottom: 12 }}>
                    {member.role}
                  </p>
                  <ul className="pillar-params">
                    {member.bio.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={1}>
            <SourceNote slides={data.sourceSlides} />
          </Reveal>
        </div>
      </section>

      <MetricBand metrics={data.metrics} />

      <CtaBand cta={data.cta} />
    </>
  );
}
