/**
 * 路由常量 —— **单一事实源**。
 *
 * spec §14 硬约束 2：`ROUTES` 常量、导航数据、`sitemap.ts`、`routes.spec.ts`
 * 四者始终同源。删路由就是删一处。
 *
 * spec §14 硬约束 1：**不允许出现 `href="#"`、空页面或 404**。
 * 任何 `Link href` 都必须来自本文件（或来自后端 `site.json` 的导航数据，
 * 后者在 `ContentRepository._check_references()` 里会被逐条校验不含死链）。
 */

export const ROUTES = {
  home: '/',

  about: '/about',
  aboutPositioning: '/about/positioning',
  aboutTeam: '/about/team',
  aboutStrength: '/about/strength',

  products: '/products',
  productDetail: (slug: ProductSlug) => `/products/${slug}` as const,
  productsDeployment: '/products/deployment',

  solutions: '/solutions',
  solutionDetail: (slug: SolutionSlug) => `/solutions/${slug}` as const,

  research: '/research',
  researchPapers: '/research/papers',

  insights: '/insights',
  insightDetail: (slug: string) => `/insights/${slug}` as const,

  careers: '/careers',
  contact: '/contact',
  sitemap: '/sitemap',

  legalTerms: '/legal/terms',
  legalPrivacy: '/legal/privacy',
  legalCredits: '/legal/credits',
} as const;

/**
 * `/products/deployment` 与三个产品 slug **分开建模**（spec §7.2 注 1 第 4 点）：
 * 否则 `generateStaticParams` 会把 deployment 当成第四个 slug 生成一个错误的
 * `/products/deployment` 动态页，与静态路由冲突。
 */
export const PRODUCT_SLUGS = ['aragonteam', 'inkclaw', 'legallens'] as const;
export type ProductSlug = (typeof PRODUCT_SLUGS)[number];

export const SOLUTION_SLUGS = ['telecom', 'transportation', 'legal-services', 'finance'] as const;
export type SolutionSlug = (typeof SOLUTION_SLUGS)[number];

export const INSIGHT_CATEGORIES = ['insight', 'news', 'research'] as const;
export type InsightCategory = (typeof INSIGHT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
  insight: '行业洞察',
  news: '公司动态',
  research: '研究进展',
};

/** 静态路由清单（不含 `[slug]`）。`sitemap.ts` 与 `routes.spec.ts` 都从这里取。 */
export const STATIC_ROUTES: readonly string[] = [
  ROUTES.home,
  ROUTES.about,
  ROUTES.aboutPositioning,
  ROUTES.aboutTeam,
  ROUTES.aboutStrength,
  ROUTES.products,
  ROUTES.productsDeployment,
  ROUTES.solutions,
  ROUTES.research,
  ROUTES.researchPapers,
  ROUTES.insights,
  ROUTES.careers,
  ROUTES.contact,
  ROUTES.sitemap,
  ROUTES.legalTerms,
  ROUTES.legalPrivacy,
  ROUTES.legalCredits,
];

/** 全部路由（含动态段展开），洞察详情由调用方补齐。 */
export function allRoutes(insightSlugs: readonly string[] = []): string[] {
  return [
    ...STATIC_ROUTES,
    ...PRODUCT_SLUGS.map((s) => ROUTES.productDetail(s)),
    ...SOLUTION_SLUGS.map((s) => ROUTES.solutionDetail(s)),
    ...insightSlugs.map((s) => ROUTES.insightDetail(s)),
  ];
}

/**
 * 只作为路径分段存在、**没有对应页面**的段。
 * 面包屑必须把它们渲染成纯文本而不是链接 —— 否则 `/legal/terms` 的面包屑会
 * 生成一个指向 `/legal` 的 404 链接，直接违反 G3「无死链」零容忍项。
 */
export const NON_ROUTE_SEGMENTS = new Set(['legal']);

/** 面包屑标签表：路径段 → 中文标签。 */
export const SEGMENT_LABELS: Record<string, string> = {
  about: '关于我们',
  positioning: '公司定位',
  team: '研发团队',
  strength: '科研实力',
  products: '产品与方案',
  aragonteam: 'AragonTeam',
  inkclaw: 'InkClaw',
  legallens: 'LegalLens 合约智审',
  deployment: '交付形态',
  solutions: '行业实践',
  telecom: '通信服务',
  transportation: '交通基建',
  'legal-services': '法律服务',
  finance: '金融与强监管',
  research: '技术与研究',
  papers: '学术成果',
  insights: '洞察与动态',
  careers: '加入我们',
  contact: '联系我们',
  sitemap: '网站地图',
  legal: '法务',
  terms: '使用条款',
  privacy: '个人信息保护政策',
  credits: '图片来源',
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}
