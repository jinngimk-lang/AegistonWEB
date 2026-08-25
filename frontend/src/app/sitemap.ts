import type { MetadataRoute } from 'next';

import { getRoutes } from '@/lib/api';
import { absoluteUrl } from '@/lib/routes';

export const revalidate = 3600;

/**
 * 从 `/api/v1/site/routes` 动态生成 —— 与 `ROUTES` 常量、导航数据、
 * `routes.spec.ts` 同源（spec §14 硬约束 2）。删路由就是删一处。
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { routes } = await getRoutes();
  return routes
    .filter((route) => route.path !== '/sitemap')
    .map((route) => ({
      url: absoluteUrl(route.path),
      lastModified: route.lastModified ? new Date(route.lastModified) : new Date(),
      changeFrequency: route.changeFrequency as MetadataRoute.Sitemap[number]['changeFrequency'],
      priority: route.priority,
    }));
}
