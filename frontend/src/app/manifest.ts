import type { MetadataRoute } from 'next';

import { getSiteSettings } from '@/lib/api';

export const revalidate = 3600;

/**
 * `manifest.webmanifest`（v3 spec §4.5.2 / 决策 A-10）。
 *
 * ⚠️ **`display: 'browser'`，且不注册 Service Worker**：
 * SW 缓存的旧 HTML 会盖住已经 revalidate 的新页面，与 ISR + Full Route Cache
 * 的失效语义直接冲突；而本站不是应用型站点，离线可用不是需求。
 * 这里只提供安装元数据（名称、主题色、图标），让「添加到主屏幕」有正确的
 * 品牌呈现，仅此而已。
 *
 * CSP 的 `manifest-src 'self'` 已经允许它，无需改动 CSP。
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();
  return {
    name: `${settings.nameCn} ${settings.nameEn}`,
    short_name: settings.nameCn,
    description: settings.description,
    lang: 'zh-CN',
    start_url: '/',
    scope: '/',
    display: 'browser',
    background_color: '#FFFFFF',
    theme_color: '#002B5C',
    icons: [
      { src: '/brand/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
