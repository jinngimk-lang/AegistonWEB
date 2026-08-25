import { describe, expect, it } from 'vitest';

import {
  PRODUCT_SLUGS,
  ROUTES,
  SEGMENT_LABELS,
  SOLUTION_SLUGS,
  STATIC_ROUTES,
  allRoutes,
} from '@/lib/routes';

describe('routes 单一事实源', () => {
  it('deployment 与三个产品 slug 分开建模', () => {
    // spec §7.2 注 1 第 4 点：否则 generateStaticParams 会把它当成第四个 slug
    expect(PRODUCT_SLUGS).not.toContain('deployment');
    expect(STATIC_ROUTES).toContain(ROUTES.productsDeployment);
  });

  it('没有任何 href 是 # 或空', () => {
    for (const route of allRoutes(['a-slug'])) {
      expect(route).toBeTruthy();
      expect(route.startsWith('#')).toBe(false);
      expect(route.startsWith('/')).toBe(true);
    }
  });

  it('每个动态段都有中文面包屑标签', () => {
    for (const slug of [...PRODUCT_SLUGS, ...SOLUTION_SLUGS]) {
      expect(SEGMENT_LABELS[slug]).toBeTruthy();
    }
  });

  it('静态路由无重复', () => {
    expect(new Set(STATIC_ROUTES).size).toBe(STATIC_ROUTES.length);
  });
});
