import type { Metadata, Viewport } from 'next';

import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SkipLink } from '@/components/layout/SkipLink';
import { ToTop } from '@/components/layout/ToTop';
import { UtilityBar } from '@/components/layout/UtilityBar';
import { getNavigation, getSiteSettings } from '@/lib/api';
import { organizationJsonLd } from '@/lib/jsonld';
import { METADATA_BASE, SITE_NAME, TITLE_TEMPLATE } from '@/lib/seo';

import './globals.css';
import '../styles/fonts.css';

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
    },
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

  return (
    <html lang="zh-CN">
      <body>
        <script
          type="application/ld+json"
          // JSON-LD 由服务端生成，内容来自受 Pydantic 校验的内容包，无用户输入
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd(settings)) }}
        />
        <SkipLink />
        <UtilityBar left={navigation.utilityLeft} right={navigation.utilityRight} />
        <SiteHeader
          navigation={navigation}
          brandCn={settings.nameCn}
          brandEn={settings.nameEn}
        />
        <main id="main">{children}</main>
        <SiteFooter navigation={navigation} settings={settings} />
        <ToTop />
      </body>
    </html>
  );
}
