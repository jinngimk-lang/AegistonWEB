import { SITE_URL, absoluteUrl } from '@/lib/routes';
import type { Paper, ProductDetail, SiteSettings } from '@/types/content';

type JsonLd = Record<string, unknown>;

export function organizationJsonLd(settings: SiteSettings): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.nameCn,
    alternateName: settings.nameEn,
    legalName: settings.legalName,
    url: SITE_URL,
    description: settings.description,
    email: settings.contact.businessEmail,
    ...(settings.contact.address
      ? {
          address: {
            '@type': 'PostalAddress',
            addressCountry: 'CN',
            addressLocality: settings.contact.address,
          },
        }
      : {}),
    knowsAbout: settings.keywords,
  };
}

export function productJsonLd(product: ProductDetail): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: `${product.nameEn} ${product.nameCn}`,
    applicationCategory: 'BusinessApplication',
    description: product.positioning,
    url: absoluteUrl(`/products/${product.slug}`),
    operatingSystem: '私有化服务器 / 便携式一体机 / 私有云',
    publisher: { '@type': 'Organization', name: '智瞳安宇 Aegiston' },
  };
}

export function articleJsonLd(input: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
}): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    mainEntityOfPage: absoluteUrl(input.path),
    author: { '@type': 'Organization', name: '智瞳安宇 Aegiston' },
    publisher: { '@type': 'Organization', name: '智瞳安宇 Aegiston' },
  };
}

export function scholarlyJsonLd(paper: Paper): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: paper.titleEn,
    alternativeHeadline: paper.title,
    abstract: paper.summary,
    publication: paper.venue,
    author: { '@type': 'Organization', name: '智瞳安宇 Aegiston' },
  };
}

export function breadcrumbJsonLd(items: { label: string; href: string }[]): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.href),
    })),
  };
}
