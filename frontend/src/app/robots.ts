import type { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/routes';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // $ 只匹配 /sitemap 页面本身，避免前缀规则同时屏蔽 /sitemap.xml。
        disallow: ['/api/', '/sitemap$'],
      },
      {
        userAgent: 'OAI-SearchBot',
        allow: '/',
        // 允许 ChatGPT 搜索抓取公开页面，但不开放后端 API。
        disallow: '/api/',
      },
      {
        userAgent: 'Claude-SearchBot',
        allow: '/',
        // 允许 Claude 搜索发现公开页面，但不开放后端 API。
        disallow: '/api/',
      },
      {
        userAgent: 'Claude-User',
        allow: '/',
        // 允许 Claude 在用户明确要求访问网页时读取公开页面。
        disallow: '/api/',
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
