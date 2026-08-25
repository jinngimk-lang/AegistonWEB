import type { Metadata, Viewport } from 'next';

import { DeferredFontStyles, DEFERRED_FONT_HREF } from '@/components/layout/DeferredFontStyles';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SkipLink } from '@/components/layout/SkipLink';
import { ToTop } from '@/components/layout/ToTop';
import { UtilityBar } from '@/components/layout/UtilityBar';
import { getNavigation, getSearchIndex, getSiteSettings } from '@/lib/api';
import { organizationJsonLd, websiteJsonLd } from '@/lib/jsonld';
import { METADATA_BASE, SITE_NAME, TITLE_TEMPLATE, defaultOgImages } from '@/lib/seo';

import './globals.css';
// 关键路径上只留首屏实际用到的分片；其余 500+ 条 @font-face 由 <head> 里的
// media="print" 链接异步挂载（v3 §4.6.1 M5-a）。
import '../styles/fonts-critical.css';
import FONT_PRELOAD_DATA from '../styles/font-preload.json';

const FONT_PRELOAD: string[] = FONT_PRELOAD_DATA.preload;

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    metadataBase: METADATA_BASE,
    title: { default: `${settings.nameCn} ${settings.nameEn} · ${settings.tagline}`, template: TITLE_TEMPLATE },
    description: settings.description,
    keywords: settings.keywords,
    applicationName: SITE_NAME,
    authors: [{ name: settings.legalName }],
    creator: settings.legalName,
    publisher: settings.legalName,
    formatDetection: { telephone: false, email: false, address: false },
    icons: {
      icon: [{ url: '/brand/favicon.svg', type: 'image/svg+xml' }],
      apple: '/brand/apple-touch-icon.png',
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      siteName: SITE_NAME,
      title: `${settings.nameCn} ${settings.nameEn}`,
      description: settings.description,
      images: defaultOgImages(settings.nameCn),
    },
    twitter: { card: 'summary_large_image', images: defaultOgImages(settings.nameCn) },
    robots: { index: true, follow: true },
  };
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#002B5C',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, navigation] = await Promise.all([getSiteSettings(), getNavigation()]);
  const contentHash = getSearchIndex().contentHash;

  return (
    <html lang="zh-CN">
      <head>
        {/* 首屏字体分片 preload。清单由 `npm run fonts:preload` 从 fonts.css 的
            unicode-range 反推得出（硬上限 4 片：preload 过多会与首屏图片抢带宽，
            反而拖慢 LCP）。勿手改 font-preload.json。 */}
        {FONT_PRELOAD.map((href) => (
          <link
            key={href}
            rel="preload"
            as="font"
            type="font/woff2"
            href={href}
            crossOrigin="anonymous"
          />
        ))}
        {/* 字体声明表的后半段：454 条 @font-face 由 <DeferredFontStyles /> 在挂载后
            追加，不进渲染阻塞路径（v3 §4.6.1 M5-a）。无 JS 时由下面这段
            <noscript> 同步加载兜底 —— 退化为改动前的现状，不是坏功能。 */}
        <noscript>
          <link rel="stylesheet" href={DEFERRED_FONT_HREF} />
        </noscript>
      </head>
      <body>
        <script
          type="application/ld+json"
          // JSON-LD 由服务端生成，内容来自受 Pydantic 校验的内容包，无用户输入。
          // ⚠️ 查询串等用户输入**永远不得**进入这里（v3 §4.2.7 S2）。
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([organizationJsonLd(settings), websiteJsonLd(settings)]),
          }}
        />
        <DeferredFontStyles />
        <SkipLink />
        <UtilityBar left={navigation.utilityLeft} right={navigation.utilityRight} />
        <SiteHeader
          navigation={navigation}
          brandCn={settings.nameCn}
          brandEn={settings.nameEn}
          contentHash={contentHash}
        />
        <main id="main">{children}</main>
        <SiteFooter navigation={navigation} settings={settings} />
        <ToTop />
      </body>
    </html>
  );
}
