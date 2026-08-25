import type { Metadata } from 'next';

import { SITE_URL, absoluteUrl } from '@/lib/routes';

export const SITE_NAME = '智瞳安宇 Aegiston';
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  publishedTime?: string;
  type?: 'website' | 'article';
}

export function pageMetadata({
  title,
  description,
  path,
  keywords,
  publishedTime,
  type = 'website',
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type,
      url,
      title: `${title} | ${SITE_NAME}`,
      description,
      siteName: SITE_NAME,
      locale: 'zh_CN',
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
    },
  };
}

export const METADATA_BASE = new URL(SITE_URL);
