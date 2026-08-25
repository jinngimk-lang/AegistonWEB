import type { Metadata } from 'next';
import Link from 'next/link';

import { PageHero } from '@/components/sections/PageHero';
import { Breadcrumbs, crumbsFromPath } from '@/components/ui/Breadcrumbs';
import { Reveal } from '@/components/ui/Reveal';
import { getInsights, getNavigation } from '@/lib/api';
import { breadcrumbJsonLd } from '@/lib/jsonld';
import { getMediaLookup } from '@/lib/media';
import { ROUTES } from '@/lib/routes';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 3600;

const DESCRIPTION = '本站全部页面一览。导航右侧的检索按钮也指向这里——不留死按钮。';

export const metadata: Metadata = pageMetadata({
  title: '网站地图',
  description: DESCRIPTION,
  path: ROUTES.sitemap,
});

export default async function SitemapPage() {
  const [navigation, insights, media] = await Promise.all([
    getNavigation(),
    getInsights({ pageSize: 24 }),
    getMediaLookup(),
  ]);
  const crumbs = crumbsFromPath(ROUTES.sitemap);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd(crumbs)) }}
      />
      <PageHero
        eyebrow="SITEMAP"
        title="网站地图"
        subtitle={DESCRIPTION}
        media={media.get('stock-about')}
      />
      <Breadcrumbs items={crumbs} />

      <section className="section" aria-label="站点结构">
        <div className="container">
          <div className="sitemap-grid">
            {navigation.main.map((group) => (
              <Reveal key={group.label} as="nav" className="sitemap-col">
                <h3>{group.label}</h3>
                <ul>
                  {group.href ? (
                    <li>
                      <Link href={group.href}>{group.label}总览</Link>
                    </li>
                  ) : null}
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link href={item.href}>{item.label}</Link>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}

            <Reveal as="nav" className="sitemap-col">
              <h3>洞察文章</h3>
              <ul>
                {insights.items.map((item) => (
                  <li key={item.slug}>
                    <Link href={item.href}>{item.title}</Link>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal as="nav" className="sitemap-col">
              <h3>联系与法务</h3>
              <ul>
                <li>
                  <Link href={ROUTES.contact}>联系我们</Link>
                </li>
                {navigation.footerLegal.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
