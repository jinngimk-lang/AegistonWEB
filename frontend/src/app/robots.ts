import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/routes';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // /api/ 是后端反代路径；/sitemap 是给人看的站点地图页，不需要被索引
        disallow: ['/api/', '/sitemap'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
