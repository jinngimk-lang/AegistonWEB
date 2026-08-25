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
  /** 该文 OG 图的**绝对** URL（v3 spec §4.5.2）。 */
  image?: string;
  /** 机构名。⚠️ 一律用机构名，**不写自然人** —— v2 §15 第 6 条记录了
   *  「洞察文章的真实作者署名尚未确认」，在它关闭之前署名任何个人都是臆造。 */
  author?: string;
}): JsonLd {
  const org = input.author ?? '智瞳安宇 Aegiston';
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.title,
    description: input.description,
    datePublished: input.publishedAt,
    mainEntityOfPage: absoluteUrl(input.path),
    ...(input.image ? { image: [input.image] } : {}),
    author: { '@type': 'Organization', name: org },
    publisher: { '@type': 'Organization', name: org },
  };
}

/**
 * `WebSite` + `SearchAction`：把 G1「两次按键内可达任意内容」在搜索引擎侧
 * 也声明一遍（v3 spec §4.5.2）。
 *
 * ⚠️ `{search_term_string}` 是 schema.org 规定的**模板占位符**，
 * 必须原样输出、**不做任何插值**。查询串不进 JSON-LD —— `JSON.stringify`
 * 不转义 `<` 与 `/`，一个 `</script>` 就能闭合标签（v3 §4.2.7 S2）。
 */
export function websiteJsonLd(settings: SiteSettings): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: `${settings.nameCn} ${settings.nameEn}`,
    url: SITE_URL,
    description: settings.description,
    inLanguage: 'zh-CN',
    publisher: { '@type': 'Organization', name: settings.legalName },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
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
