import type { Metadata } from 'next';

import OG_MAP from '../../og-map.json';
import { SITE_URL, absoluteUrl } from '@/lib/routes';

export const SITE_NAME = '智瞳安宇 Aegiston';
export const TITLE_TEMPLATE = `%s | ${SITE_NAME}`;

/**
 * OG 图（v3 spec §4.5.1 / 决策 A-5）。
 *
 * **图里不含任何文字**：中文标题要排进 PNG 就需要一份完整的 CJK 字体，
 * 而 v2 已把字体按 `unicode-range` 切成 209 个分片，satori / resvg / sharp
 * 都无法从分片里自动挑片；补一份完整的 Noto Sans SC（≈ 10 MB）入库，
 * 只为生成几十张图，代价与收益不成比例；不入库则构建期必须联网下载，
 * 直接违反 CLAUDE.md §5「不依赖外部 CDN」。
 *
 * 标题与描述由 `og:title` / `og:description` 文本承载 —— 微信、X、LinkedIn、
 * 飞书都会把它们渲染在图旁，信息不丢失。
 */
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
const OG_FALLBACK = '/og/default.png';

/** 路由 → OG 图 key。`og-map.json` 是手工维护的白名单，与 `stock-images.json` 同类。 */
const ROUTE_TO_KEY = OG_MAP.routes as Record<string, string>;

export function ogKeyForPath(path: string): string {
  const clean = path.split('?')[0] ?? path;
  return ROUTE_TO_KEY[clean] ?? ROUTE_TO_KEY[dynamicBucket(clean)] ?? 'default';
}

/** `/insights/xxx` 这类动态段回落到分组默认图，避免每篇文章都要手工登记。 */
function dynamicBucket(path: string): string {
  const [, head] = path.split('/');
  return head ? `/${head}/*` : path;
}

export function ogImageUrl(path: string): string {
  const key = ogKeyForPath(path);
  return key === 'default' ? OG_FALLBACK : `/og/${key}.png`;
}

interface OgImageDescriptor {
  url: string;
  width: number;
  height: number;
  alt: string;
}

export function ogImages(path: string, alt: string): OgImageDescriptor[] {
  return [{ url: ogImageUrl(path), width: OG_WIDTH, height: OG_HEIGHT, alt }];
}

export function defaultOgImages(alt: string): OgImageDescriptor[] {
  return [{ url: OG_FALLBACK, width: OG_WIDTH, height: OG_HEIGHT, alt }];
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  publishedTime?: string;
  type?: 'website' | 'article';
  /** 覆盖按 path 查表的结果；不传即走 `og-map.json`，查不到回落 default.png。 */
  ogImage?: string;
}

export function pageMetadata({
  title,
  description,
  path,
  keywords,
  publishedTime,
  type = 'website',
  ogImage,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const images: OgImageDescriptor[] = ogImage
    ? [{ url: ogImage, width: OG_WIDTH, height: OG_HEIGHT, alt: `${title} | ${SITE_NAME}` }]
    : ogImages(path, `${title} | ${SITE_NAME}`);

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
      images,
      ...(publishedTime ? { publishedTime } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images,
    },
  };
}

export const METADATA_BASE = new URL(SITE_URL);
